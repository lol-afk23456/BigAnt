import { beforeAll,beforeEach,afterEach,afterAll,expect,test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from '../apps/api/node_modules/sharp/lib/index.js';
import { admin,fixtures,secret } from './helpers';
import { buildApp } from '../apps/api/src/app';
import { disconnectDatabase } from '../packages/database/src/index';
import { parseMenuPrice,type PublicMenu } from '../packages/types/src/index';
let app:ReturnType<typeof buildApp>;let hash:string;let directory:string;let ids:string[];let slugs:string[];let tokens:string[];
beforeAll(async()=>{await fixtures();hash=(await admin.staffUser.findFirstOrThrow({where:{email:'owner@santalucia.test'}})).password_hash;});
beforeEach(async()=>{directory=await mkdtemp(join(tmpdir(),'bigant-menu-test-'));app=buildApp({secret,menuImageDir:directory});ids=[];slugs=[];tokens=[];for(let n=0;n<2;n++){const slug=`menu-${randomUUID()}`;const row=await admin.tenant.create({data:{slug,name:`Locale ${n}`,type:'restaurant',tenantSettings:{create:{}},staffUser:{create:{email:'menu@example.test',password_hash:hash,full_name:'Menu staff',role:n===0?'owner':'staff'}}}});ids.push(row.id);slugs.push(slug);const login=await app.inject({method:'POST',url:'/auth/login',payload:{slug,email:'menu@example.test',password:'bigant2026'}});expect(login.statusCode).toBe(200);tokens.push(login.json().access_token);}});
afterEach(async()=>{await app.close();await admin.tenant.deleteMany({where:{id:{in:ids}}});await rm(directory,{recursive:true,force:true});});
afterAll(async()=>{await admin.$disconnect();await disconnectDatabase();});
const headers=(n=0)=>({authorization:`Bearer ${tokens[n]}`});
async function category(n=0){const result=await app.inject({method:'POST',url:'/menu/categories',headers:headers(n),payload:{name_it:'Primi',name_en:'Pasta'}});expect(result.statusCode).toBe(201);return result.json().id as string;}
async function dish(category_id:string,n=0){const result=await app.inject({method:'POST',url:'/menu/items',headers:headers(n),payload:{category_id,name_it:'Pasta al pomodoro',name_en:'Tomato pasta',price_cents:1250,allergens:['1'],dietary:['vegan']}});expect(result.statusCode).toBe(201);return result.json().id as string;}
test('CRUD e traduzioni: esaurito resta pubblico, categoria inattiva esclusa',async()=>{
 expect((await app.inject({url:'/menu'})).statusCode).toBe(401);const c=await category();const id=await dish(c);
 expect((await app.inject({method:'PATCH',url:`/menu/items/${id}`,headers:headers(),payload:{is_available:false,is_featured:true}})).statusCode).toBe(200);
 const it=(await app.inject({url:`/public/${slugs[0]}/menu?lang=it`})).json<PublicMenu>();const en=(await app.inject({url:`/public/${slugs[0]}/menu?lang=en`})).json<PublicMenu>();expect(it.categories[0]?.items[0]).toMatchObject({name:'Pasta al pomodoro',price_cents:1250,is_available:false,is_featured:true});expect(en.categories[0]).toMatchObject({name:'Pasta',items:[{name:'Tomato pasta'}]});expect(JSON.stringify(it)).not.toContain('tenant_id');
 expect((await app.inject({method:'DELETE',url:`/menu/categories/${c}`,headers:headers()})).statusCode).toBe(409);
 expect((await app.inject({method:'PATCH',url:`/menu/categories/${c}`,headers:headers(),payload:{active:false}})).statusCode).toBe(200);expect((await app.inject({url:`/public/${slugs[0]}/menu`})).json().categories).toEqual([]);
 expect((await app.inject({method:'DELETE',url:`/menu/items/${id}`,headers:headers()})).statusCode).toBe(200);expect((await app.inject({method:'DELETE',url:`/menu/categories/${c}`,headers:headers()})).statusCode).toBe(200);
});
test('confine tenant su ogni mutazione, cambio categoria e riordino',async()=>{
 const a=await category(),b=await category(1),item=await dish(a);
 expect((await app.inject({url:'/menu',headers:headers(1)})).body).not.toContain(item);
 for(const [url,payload] of [[`/menu/categories/${a}`,{name_it:'Attacco'}],[`/menu/items/${item}`,{category_id:b}]] as const){expect((await app.inject({method:'PATCH',url,headers:headers(1),payload})).statusCode).toBe(404);expect((await app.inject({method:'DELETE',url,headers:headers(1)})).statusCode).toBe(404);}
 expect((await app.inject({method:'PATCH',url:`/menu/items/${item}`,headers:headers(),payload:{category_id:b}})).statusCode).toBe(404);
 expect((await app.inject({method:'POST',url:'/menu/items',headers:headers(),payload:{category_id:b,name_it:'A',name_en:'A',price_cents:100}})).statusCode).toBe(404);
 expect((await app.inject({method:'PUT',url:'/menu/categories/order',headers:headers(),payload:{ids:[b]}})).statusCode).toBe(400);
 expect((await app.inject({method:'PUT',url:`/menu/categories/${a}/order`,headers:headers(1),payload:{ids:[item]}})).statusCode).toBe(404);
});
test('riordino atomico e validazione prezzi, allergeni e URL immagine',async()=>{
 const first=await category(),second=await category(),one=await dish(first),two=await dish(first);
 expect((await app.inject({method:'PUT',url:'/menu/categories/order',headers:headers(),payload:{ids:[second,first]}})).statusCode).toBe(200);
 expect((await app.inject({method:'PUT',url:`/menu/categories/${first}/order`,headers:headers(),payload:{ids:[two,one]}})).statusCode).toBe(200);
 const rows=(await app.inject({url:'/menu',headers:headers()})).json();expect(rows.map((r:{id:string})=>r.id)).toEqual([second,first]);expect(rows[1].items.map((r:{id:string})=>r.id)).toEqual([two,one]);
 for(const payload of [{price_cents:12.5},{price_cents:-1},{allergens:['15']},{dietary:['unknown']},{image_url:'https://example.com/track'}])expect((await app.inject({method:'PATCH',url:`/menu/items/${one}`,headers:headers(),payload})).statusCode).toBe(400);
 expect(parseMenuPrice('12,50')).toBe(1250);expect(parseMenuPrice('0.01')).toBe(1);expect(parseMenuPrice('12.999')).toBeNull();
});
test('foto: WebP in tre misure, rimozione metadati, MIME reale e isolamento',async()=>{
 const id=await dish(await category());const bytes=await sharp({create:{width:1200,height:900,channels:3,background:'#ff914d'}}).jpeg().toBuffer();
 const upload=await app.inject({method:'POST',url:`/menu/items/${id}/image`,headers:{...headers(),'content-type':'image/jpeg'},payload:bytes});expect(upload.statusCode).toBe(200);const url=upload.json().image_url as string;expect(url).toMatch(/\/[a-f0-9-]{36}-640\.webp$/);
 for(const width of [320,640,960]){const response=await app.inject({url:url.replace('/api','').replace('640.webp',`${width}.webp`)});expect(response.statusCode).toBe(200);expect(response.headers['content-type']).toBe('image/webp');const metadata=await sharp(response.rawPayload).metadata();expect(metadata.width).toBe(width);expect(metadata.exif).toBeUndefined();}
 expect((await app.inject({url:url.replace('/api','').replace(slugs[0]!,slugs[1]!)})).statusCode).toBe(404);
 expect((await app.inject({method:'POST',url:`/menu/items/${id}/image`,headers:{...headers(1),'content-type':'image/jpeg'},payload:bytes})).statusCode).toBe(404);
 expect((await app.inject({method:'POST',url:`/menu/items/${id}/image`,headers:{...headers(),'content-type':'image/png'},payload:bytes})).statusCode).toBe(400);
 expect((await app.inject({method:'POST',url:`/menu/items/${id}/image`,headers:{...headers(),'content-type':'image/jpeg'},payload:Buffer.from('<svg/>')})).statusCode).toBe(400);
 expect((await app.inject({url:`/menu/items/${id}/image`,headers:headers(1)})).statusCode).toBe(404);
 await app.inject({method:'PATCH',url:`/menu/items/${id}`,headers:headers(),payload:{is_visible:false}});expect((await app.inject({url:url.replace('/api','')})).statusCode).toBe(404);expect((await app.inject({url:`/menu/items/${id}/image`,headers:headers()})).json().image_data).toMatch(/^data:image\/webp;base64,/);
 expect((await app.inject({method:'PATCH',url:`/menu/items/${id}`,headers:headers(),payload:{image_url:null}})).statusCode).toBe(200);expect((await app.inject({url:url.replace('/api','')})).statusCode).toBe(404);
});
test('upload limitato a 5 MB e autenticato; API pubblica limitata',async()=>{
 const id=await dish(await category());const options={method:'POST' as const,url:`/menu/items/${id}/image`,headers:{'content-type':'image/jpeg'},payload:Buffer.from('invalid')};expect((await app.inject(options)).statusCode).toBe(401);
 expect((await app.inject({...options,headers:{...headers(),'content-type':'image/jpeg'},payload:Buffer.alloc(5*1024*1024+1)})).statusCode).toBe(400);
 for(let n=0;n<30;n++)expect((await app.inject({url:`/public/${slugs[0]}/menu`})).statusCode).toBe(200);expect((await app.inject({url:`/public/${slugs[0]}/menu`})).statusCode).toBe(429);
});
test('budget foto separato: due caricamenti da 29 immagini, JSON e upload ancora limitati',async()=>{
 const id=await dish(await category());const bytes=await sharp({create:{width:320,height:240,channels:3,background:'#ff914d'}}).jpeg().toBuffer();
 const options={method:'POST' as const,url:`/menu/items/${id}/image`,headers:{...headers(),'content-type':'image/jpeg'},payload:bytes};
 let url='';for(let n=0;n<5;n++){const result=await app.inject(options);expect(result.statusCode).toBe(200);url=(result.json().image_url as string).replace('/api','');}
 expect((await app.inject(options)).statusCode).toBe(429);
 // Lo stesso IP carica 29 foto, poi cambia lingua e le ricarica. Il conteggio
 // aggregato per i media resta finito: la richiesta 121 è rifiutata.
 for(let n=0;n<120;n++)expect((await app.inject({url})).statusCode).toBe(200);
 expect((await app.inject({url})).statusCode).toBe(429);
 for(let n=0;n<30;n++)expect((await app.inject({url:`/public/${slugs[0]}/menu`})).statusCode).toBe(200);
 expect((await app.inject({url:`/public/${slugs[0]}/menu`})).statusCode).toBe(429);
});
test('occhio separato da esaurito: risposta pubblica cambia subito e resta isolata',async()=>{
 const categoryA=await category(),item=await dish(categoryA);await dish(await category(1),1);
 expect((await app.inject({method:'PATCH',url:`/menu/items/${item}`,headers:headers(),payload:{is_visible:false,is_featured:true,sort_order:9}})).statusCode).toBe(200);
 expect((await app.inject({method:'PATCH',url:`/menu/items/${item}`,headers:headers(),payload:{is_available:false}})).statusCode).toBe(200);
 const retained=(await app.inject({url:'/menu',headers:headers()})).json()[0].items[0];expect(retained).toMatchObject({is_visible:false,is_featured:true,sort_order:9,allergens:['1'],dietary:['vegan']});
 expect((await app.inject({url:`/public/${slugs[0]}/menu`})).json().categories[0].items).toEqual([]);expect((await app.inject({url:'/menu',headers:headers()})).json()[0].items[0].is_visible).toBe(false);
 expect((await app.inject({url:`/public/${slugs[1]}/menu`})).json().categories[0].items).toHaveLength(1);
 expect((await app.inject({method:'PATCH',url:`/menu/items/${item}`,headers:headers(),payload:{is_visible:true,is_available:false}})).statusCode).toBe(200);expect((await app.inject({url:`/public/${slugs[0]}/menu`})).json().categories[0].items[0].is_available).toBe(false);
});
test('quattro template, colore e copertina isolati; impostazioni riservate al titolare',async()=>{
 const data={menu_template:'pop',menu_primary_color:'#aaff33'};
 expect((await app.inject({method:'PATCH',url:'/menu/settings',headers:headers(1),payload:data})).statusCode).toBe(403);
 for(const menu_template of ['essential','pop','elegant','pub']){expect((await app.inject({method:'PATCH',url:'/menu/settings',headers:headers(),payload:{...data,menu_template}})).statusCode).toBe(200);expect((await app.inject({url:`/public/${slugs[0]}/menu`})).json().settings.menu_template).toBe(menu_template);}
 expect((await app.inject({url:`/public/${slugs[1]}/menu`})).json().settings.menu_template).toBe('essential');
 for(const payload of [{...data,menu_template:'other'},{...data,menu_primary_color:'red; background:url(x)'},{...data,menu_cover_url:'https://example.com/track'}])expect((await app.inject({method:'PATCH',url:'/menu/settings',headers:headers(),payload})).statusCode).toBe(400);
 const bytes=await sharp({create:{width:320,height:240,channels:3,background:'#444444'}}).png().toBuffer();
 const response=await app.inject({method:'POST',url:'/menu/cover',headers:{...headers(),'content-type':'image/png'},payload:bytes});expect(response.statusCode).toBe(200);const url=response.json().menu_cover_url as string;expect((await app.inject({url:url.replace('/api','')})).statusCode).toBe(200);expect((await app.inject({url:url.replace('/api','').replace(slugs[0]!,slugs[1]!)})).statusCode).toBe(404);
 expect((await app.inject({method:'PATCH',url:'/menu/settings',headers:headers(),payload:{...data,menu_cover_url:null}})).statusCode).toBe(200);expect((await app.inject({url:url.replace('/api','')})).statusCode).toBe(404);
});
test('copertine panoramiche: varianti leggere, compatibilità delle foto esistenti e revoca pubblica',async()=>{
 const bytes=await sharp({create:{width:1200,height:900,channels:3,background:'#82471f'}}).jpeg().toBuffer();
 const upload=await app.inject({method:'POST',url:'/menu/cover',headers:{...headers(),'content-type':'image/jpeg'},payload:bytes});expect(upload.statusCode).toBe(200);
 const originalUrl=upload.json().menu_cover_url as string;const originalFile=originalUrl.split('/').pop()!;const originalPath=join(directory,ids[0]!,originalFile);const originalBytes=await readFile(originalPath);
 const variants=[320,640,768,960];
 for(const width of variants){
  const url=originalUrl.replace('/api','').replace('-640.webp',`-cover-${width}.webp`);const response=await app.inject({url});expect(response.statusCode).toBe(200);
  const metadata=await sharp(response.rawPayload).metadata();expect(metadata.width).toBe(width);expect(metadata.height).toBe(Math.round(width*9/16));expect(metadata.exif).toBeUndefined();
  expect((await app.inject({url:url.replace(slugs[0]!,slugs[1]!)})).statusCode).toBe(404);
 }
 // Un upload precedente non ha derivate: le richieste simultanee possono
 // crearle senza sovrascrivere la foto originale o cambiare l'URL salvato.
 const legacyFile=originalFile.replace('-640.webp','-cover-768.webp');await rm(join(directory,ids[0]!,legacyFile));
 const derivedUrl=originalUrl.replace('/api','').replace('-640.webp','-cover-768.webp');
 const responses=await Promise.all([app.inject({url:derivedUrl}),app.inject({url:derivedUrl})]);for(const response of responses)expect(response.statusCode).toBe(200);
 expect(await readFile(originalPath)).toEqual(originalBytes);expect((await app.inject({url:'/menu/settings',headers:headers()})).json().menu_cover_url).toBe(originalUrl);
 await app.inject({method:'PATCH',url:'/menu/settings',headers:headers(),payload:{menu_template:'essential',menu_primary_color:'#ff914d',menu_cover_url:null}});
 expect((await app.inject({url:derivedUrl})).statusCode).toBe(404);
 const item=await dish(await category());const dishUpload=await app.inject({method:'POST',url:`/menu/items/${item}/image`,headers:{...headers(),'content-type':'image/jpeg'},payload:bytes});
 expect((await app.inject({url:dishUpload.json().image_url.replace('/api','').replace('-640.webp','-cover-640.webp')})).statusCode).toBe(404);
});
