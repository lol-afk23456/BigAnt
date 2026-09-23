import type { FastifyInstance,FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { mkdir,readFile,writeFile,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { z } from 'zod';
import { db,withTenant,resolveTenant,reservationTransaction } from '@bigant/database';
import { DomainError } from '@bigant/core';
import { menuCategoryInput,menuCategoryPatch,menuItemInput,menuItemPatch,menuOrderInput,menuQuery,menuSettingsInput,idParam,slugParam,type PublicMenu } from '@bigant/types';
import { withStaff } from './staff.js';
const MAX_PHOTO=5*1024*1024;
const mimeFormats:Record<string,string>={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'};
const widths=[320,640,960] as const;
const coverWidths=[320,640,768,960] as const;
const imageParam=slugParam.extend({file:z.string().regex(/^[a-f0-9-]{36}-(?:(?:320|640|960)|cover-(?:320|640|768|960))\.webp$/)});
export function menuRoutes(app:FastifyInstance, imageDirectory=process.env.MENU_IMAGE_DIR??fileURLToPath(new URL('../../../.local/menu-images/',import.meta.url))){
 const config={rateLimit:false as const};
 async function tenantId(slug:string){const tenant=await resolveTenant(slug);if(!tenant||tenant.status!=='active')throw new DomainError('NOT_FOUND',404);return tenant.id;}
 app.get('/public/:slug/menu',{config:{rateLimit:{max:30,timeWindow:'1 minute',groupId:'menu-data'}}},async request=>{
  const {slug}=slugParam.parse(request.params);const query=menuQuery.parse(request.query);
  return withTenant(await tenantId(slug),async()=>{
   const tenant=await db.tenant.findFirstOrThrow({select:{name:true,slug:true,address:true,locale_default:true}});const language=query.lang??tenant.locale_default;
   const categories=await db.menuCategory.findMany({where:{active:true},orderBy:[{sort_order:'asc'},{id:'asc'}],include:{items:{where:{is_visible:true},orderBy:[{sort_order:'asc'},{id:'asc'}]}}});
   const settings=await db.tenantSettings.findFirstOrThrow({select:{menu_template:true,menu_primary_color:true,menu_cover_url:true}});
   return {settings:{...settings,menu_template:menuSettingsInput.shape.menu_template.parse(settings.menu_template)},language,tenant:{name:tenant.name,slug:tenant.slug,address:tenant.address},categories:categories.map(c=>({id:c.id,name:language==='en'?c.name_en:c.name_it,items:c.items.map(i=>({id:i.id,name:language==='en'?i.name_en:i.name_it,description:language==='en'?i.description_en:i.description_it,price_cents:i.price_cents,image_url:i.image_url,allergens:i.allergens,dietary:i.dietary,is_available:i.is_available,is_featured:i.is_featured}))}))} satisfies PublicMenu;
  });
 });
 // Un menu con foto e il successivo cambio lingua devono poter caricare le
 // immagini. Il budget media è distinto dai 30 accessi/minuto ai dati JSON.
 app.get('/public/:slug/menu-images/:file',{config:{rateLimit:{max:120,timeWindow:'1 minute',groupId:'menu-media'}}},async(request,reply)=>{
  const {slug,file}=imageParam.parse(request.params);const tenant=await tenantId(slug);
  const cover=file.includes('-cover-');const base=file.replace(/-(?:cover-)?(320|640|768|960)\.webp$/,'-640.webp');
  return withTenant(tenant,async()=>{
   const currentCover=await db.tenantSettings.findFirst({where:{menu_cover_url:`/api/public/${slug}/menu-images/${base}`},select:{tenant_id:true}});
   if(!currentCover&&(cover||!await db.menuItem.findFirst({where:{image_url:`/api/public/${slug}/menu-images/${base}`,is_visible:true,category:{active:true}},select:{id:true}})))throw new DomainError('NOT_FOUND',404);
   let bytes:Buffer;try{bytes=await readFile(join(imageDirectory,tenant,file));}catch{
    if(!cover)throw new DomainError('NOT_FOUND',404);
    // Le copertine già salvate ricevono una derivata: la foto del locale e il
    // suo URL originale restano intatti. Una sola generazione per variante.
    try{
     const source=await readFile(join(imageDirectory,tenant,base.replace('-640.webp','-960.webp')));
     const width=Number(file.match(/cover-(\d+)\.webp$/)![1]);
     bytes=await coverPhoto(source,width);
     try{await writeFile(join(imageDirectory,tenant,file),bytes,{flag:'wx'});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
    }catch{throw new DomainError('NOT_FOUND',404);}
   }
   return reply.type('image/webp').header('X-Content-Type-Options','nosniff').send(bytes);
  });
 });
 app.get('/menu/settings',{config},request=>withStaff(app,request,()=>db.tenantSettings.findFirstOrThrow({select:{menu_template:true,menu_primary_color:true,menu_cover_url:true}})));
 app.patch('/menu/settings',{config},request=>withStaff(app,request,async claims=>{
  if(claims.role!=='owner')throw new DomainError('FORBIDDEN',403);const data=menuSettingsInput.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{const result=await tx.tenantSettings.update({where:{tenant_id:claims.tenant_id},data});await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'menu.settings.update',entity_type:'TenantSettings',entity_id:claims.tenant_id}});return {menu_template:result.menu_template,menu_primary_color:result.menu_primary_color,menu_cover_url:result.menu_cover_url};});
 }));
 app.get('/menu',{config},request=>withStaff(app,request,()=>db.menuCategory.findMany({orderBy:[{sort_order:'asc'},{id:'asc'}],include:{items:{orderBy:[{sort_order:'asc'},{id:'asc'}]}}})));
 app.get('/menu/items/:id/image',{config},request=>withStaff(app,request,async()=>{
  const {id}=idParam.parse(request.params);const item=await db.menuItem.findUnique({where:{id},select:{image_url:true,tenant_id:true}});const file=item?.image_url?.split('/').pop();
  if(!item||!file||!imageParam.shape.file.safeParse(file).success)throw new DomainError('NOT_FOUND',404);
  try{return {image_data:`data:image/webp;base64,${(await readFile(join(imageDirectory,item.tenant_id,file))).toString('base64')}`};}catch{throw new DomainError('NOT_FOUND',404);}
 }));
 app.post('/menu/categories',{config},(request,reply)=>withStaff(app,request,async claims=>{const result=await db.menuCategory.create({data:{...menuCategoryInput.parse(request.body),tenant_id:claims.tenant_id}});reply.code(201);return result;}));
 app.patch('/menu/categories/:id',{config},request=>withStaff(app,request,async claims=>{
  const {id}=idParam.parse(request.params);const data=menuCategoryPatch.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{if(!await tx.menuCategory.findUnique({where:{id}}))throw new DomainError('NOT_FOUND',404);return tx.menuCategory.update({where:{id},data});});
 }));
 app.delete('/menu/categories/:id',{config},request=>withStaff(app,request,async claims=>{
  const {id}=idParam.parse(request.params);return reservationTransaction(claims.tenant_id,async tx=>{
   if(!await tx.menuCategory.findUnique({where:{id}}))throw new DomainError('NOT_FOUND',404);
   if(await tx.menuItem.count({where:{category_id:id}}))throw new DomainError('CATEGORY_NOT_EMPTY',409);
   await tx.menuCategory.delete({where:{id}});return {deleted:true};
  });
 }));
 app.post('/menu/items',{config},(request,reply)=>withStaff(app,request,async claims=>{
  const data=menuItemInput.parse(request.body);return reservationTransaction(claims.tenant_id,async tx=>{
   if(!await tx.menuCategory.findUnique({where:{id:data.category_id}}))throw new DomainError('NOT_FOUND',404);
   const item=await tx.menuItem.create({data:{...data,tenant_id:claims.tenant_id}});reply.code(201);return item;
  });
 }));
 app.patch('/menu/items/:id',{config},request=>withStaff(app,request,async claims=>{
  const {id}=idParam.parse(request.params);const data=menuItemPatch.parse(request.body);
  return reservationTransaction(claims.tenant_id,async tx=>{
   if(!await tx.menuItem.findUnique({where:{id}}))throw new DomainError('NOT_FOUND',404);
   if(data.category_id&&!await tx.menuCategory.findUnique({where:{id:data.category_id}}))throw new DomainError('NOT_FOUND',404);
   return tx.menuItem.update({where:{id},data});
  });
 }));
 app.delete('/menu/items/:id',{config},request=>withStaff(app,request,async claims=>{
  const {id}=idParam.parse(request.params);return reservationTransaction(claims.tenant_id,async tx=>{if(!await tx.menuItem.findUnique({where:{id}}))throw new DomainError('NOT_FOUND',404);await tx.menuItem.delete({where:{id}});return {deleted:true};});
 }));
 // Riordino atomico, completo e confinato al tenant (o alla categoria).
 app.put('/menu/categories/order',{config},request=>withStaff(app,request,async claims=>{
  const {ids}=menuOrderInput.parse(request.body);return reservationTransaction(claims.tenant_id,async tx=>{
   const rows=await tx.menuCategory.findMany({select:{id:true}});if(rows.length!==ids.length||rows.some(r=>!ids.includes(r.id)))throw new DomainError('INVALID_INPUT',400);
   for(const [sort_order,id] of ids.entries())await tx.menuCategory.update({where:{id},data:{sort_order}});return {saved:true};
  });
 }));
 app.put('/menu/categories/:id/order',{config},request=>withStaff(app,request,async claims=>{
  const {id}=idParam.parse(request.params);const {ids}=menuOrderInput.parse(request.body);return reservationTransaction(claims.tenant_id,async tx=>{
   if(!await tx.menuCategory.findUnique({where:{id}}))throw new DomainError('NOT_FOUND',404);
   const rows=await tx.menuItem.findMany({where:{category_id:id},select:{id:true}});if(rows.length!==ids.length||rows.some(r=>!ids.includes(r.id)))throw new DomainError('INVALID_INPUT',400);
   for(const [sort_order,itemId] of ids.entries())await tx.menuItem.update({where:{id:itemId},data:{sort_order}});return {saved:true};
  });
 }));
 // Upload binario: niente base64 e nessun nome di file fornito dal browser.
 app.register(async images=>{
  images.addContentTypeParser(Object.keys(mimeFormats),{parseAs:'buffer',bodyLimit:MAX_PHOTO},(_request,body,done)=>done(null,body));
  images.post('/menu/cover',{bodyLimit:MAX_PHOTO,config:{rateLimit:{max:5,timeWindow:'1 minute'}}},request=>withStaff(images,request,async claims=>{
   if(claims.role!=='owner')throw new DomainError('FORBIDDEN',403);
   return savePhoto(request,claims.tenant_id,url=>reservationTransaction(claims.tenant_id,async tx=>{await tx.tenantSettings.update({where:{tenant_id:claims.tenant_id},data:{menu_cover_url:url}});await tx.auditLog.create({data:{tenant_id:claims.tenant_id,staff_user_id:claims.sub,action:'menu.cover.update',entity_type:'TenantSettings',entity_id:claims.tenant_id}});return {menu_cover_url:url};}),true);
  }));
  images.post('/menu/items/:id/image',{bodyLimit:MAX_PHOTO,config:{rateLimit:{max:5,timeWindow:'1 minute'}}},request=>withStaff(images,request,async claims=>{
   const {id}=idParam.parse(request.params);if(!await db.menuItem.findUnique({where:{id}}))throw new DomainError('NOT_FOUND',404);
   return savePhoto(request,claims.tenant_id,url=>reservationTransaction(claims.tenant_id,async tx=>{if(!await tx.menuItem.findUnique({where:{id}}))throw new DomainError('NOT_FOUND',404);return tx.menuItem.update({where:{id},data:{image_url:url}});}));
  }));
 });
 async function savePhoto<T>(request:FastifyRequest,tenantId:string,save:(url:string)=>Promise<T>,cover=false):Promise<T>{
   const mime=(request.headers['content-type']??'').split(';')[0]!;const bytes=request.body;
   if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>MAX_PHOTO||!mimeFormats[mime])throw new DomainError('INVALID_IMAGE',400);
   let variants:Buffer[];
   try{const source=sharp(bytes,{limitInputPixels:25000000,failOn:'warning'});const metadata=await source.metadata();if(metadata.format!==mimeFormats[mime]||(metadata.pages??1)>1)throw new Error('INVALID_FORMAT');variants=[];for(const width of widths)variants.push(await source.clone().rotate().resize(width,Math.round(width*0.75),{fit:'cover'}).webp({quality:78,effort:4}).toBuffer());if(cover)for(const width of coverWidths)variants.push(await coverPhoto(bytes,width));}catch{throw new DomainError('INVALID_IMAGE',400);}
   const key=randomUUID();const directory=join(imageDirectory,tenantId);await mkdir(directory,{recursive:true});const paths=[...widths.map(width=>join(directory,`${key}-${width}.webp`)),...(cover?coverWidths.map(width=>join(directory,`${key}-cover-${width}.webp`)):[])];
   try{
    for(const [n,path] of paths.entries())await writeFile(path,variants[n]!,{flag:'wx'});
    const tenant=await db.tenant.findFirstOrThrow({select:{slug:true}});
    return await save(`/api/public/${tenant.slug}/menu-images/${key}-640.webp`);
   }catch(error){await Promise.all(paths.map(path=>rm(path,{force:true})));throw error;}
 }
}

// La copertina viene mostrata in formato panoramico: non scaricare anche i
// pixel del ritaglio 4:3 usato dalle foto dei piatti. 768px copre i telefoni
// ad alta densità senza il salto prematuro alla variante da 960px.
async function coverPhoto(bytes:Buffer,width:number){
 return sharp(bytes,{limitInputPixels:25000000,failOn:'warning'}).rotate().resize(width,Math.round(width*9/16),{fit:'cover'}).webp({quality:72,effort:5}).toBuffer();
}
