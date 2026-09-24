import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash,randomBytes } from 'node:crypto';
import { PrismaClient,Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { DateTime } from 'luxon';
import type {ConsoleCreateInput,ConsoleProfileInput,ConsoleAccountInput,ConsoleSearchInput,ConsoleServicesInput,ConsoleStaffInput,ConsoleCheck} from '../../types/src/console';

// Confine amministrativo chiuso: nessun PrismaClient esportato e nessuna query ospiti.
const client=new PrismaClient({log:[]});
const context=new AsyncLocalStorage<{adminId:string;sessionId:string;now:Date}>();
export class ConsoleError extends Error {
 constructor(public code:'UNAUTHORIZED'|'ADMIN_CREDENTIALS'|'INVALID_INPUT'|'NOT_FOUND'|'ADMIN_CONFLICT'|'LAST_OWNER'|'ACCESS_EXPIRED',public statusCode=409){super(code);}
}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('hex');
const publicAdmin={id:true,full_name:true,email:true} as const;
const publicStaff={id:true,full_name:true,email:true,role:true,status:true,last_login_at:true} as const;
const publicTenant={id:true,name:true,slug:true,type:true,timezone:true,locale_default:true,address:true,phone:true,google_place_id:true,plan:true,status:true,created_at:true} as const;
const dummyHash=argon2.hash(token(),{type:argon2.argon2id});
type Tx=Prisma.TransactionClient;
function actor(){const value=context.getStore();if(!value)throw new ConsoleError('UNAUTHORIZED',401);return value;}
async function ensureSession(reader:Tx,sessionId:string,adminId:string,now:Date){
 const session=await reader.platformSession.findFirst({where:{id:sessionId,admin_id:adminId,revoked_at:null,expires_at:{gt:now}}});
 const admin=session?await reader.platformAdmin.findFirst({where:{id:adminId,active:true},select:publicAdmin}):null;
 if(!admin)throw new ConsoleError('UNAUTHORIZED',401);return admin;
}
export async function withConsoleSession<T>(rawToken:string|undefined,now:Date,work:()=>Promise<T>):Promise<T>{
 if(!rawToken||!/^[a-f0-9]{64}$/.test(rawToken))throw new ConsoleError('UNAUTHORIZED',401);
 const session=await client.platformSession.findUnique({where:{token_hash:hash(rawToken)}});
 if(!session)throw new ConsoleError('UNAUTHORIZED',401);
 await ensureSession(client,session.id,session.admin_id,now);
 return context.run({adminId:session.admin_id,sessionId:session.id,now},work);
}
async function audit(tx:Tx,action:string,tenantId:string|null,metadata:Prisma.InputJsonObject={}){
 const a=actor();await tx.platformAudit.create({data:{admin_id:a.adminId,tenant_id:tenantId,action,metadata,created_at:a.now}});
}
async function transaction<T>(tenantId:string|null,work:(tx:Tx)=>Promise<T>){
 const a=actor();
 try{return await client.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'admin:'+a.adminId},0))::text`;
  await ensureSession(tx,a.sessionId,a.adminId,a.now);
  if(tenantId){
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${tenantId},0))::text`;
   if(!await tx.tenant.findUnique({where:{id:tenantId},select:{id:true}}))throw new ConsoleError('NOT_FOUND',404);
  }
  return work(tx);
 },{timeout:30000,maxWait:30000});}
 catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')throw new ConsoleError('ADMIN_CONFLICT');throw error;}
}
export async function consoleLoginSession(email:string,password:string,now:Date){
 const admin=await client.platformAdmin.findUnique({where:{email}});
 const valid=await argon2.verify(admin?.password_hash??await dummyHash,password);
 if(!admin?.active||!valid)throw new ConsoleError('ADMIN_CREDENTIALS',401);
 const value=token(),expires=new Date(now.getTime()+8*3600000);
 await client.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'admin:'+admin.id},0))::text`;
  // Rivalida una possibile disattivazione o rotazione avvenuta durante argon2.
  if(!await tx.platformAdmin.findFirst({where:{id:admin.id,active:true,password_hash:admin.password_hash}}))throw new ConsoleError('ADMIN_CREDENTIALS',401);
  await tx.platformSession.create({data:{admin_id:admin.id,token_hash:hash(value),expires_at:expires,created_at:now}});
  await tx.platformAudit.create({data:{admin_id:admin.id,action:'admin.login',created_at:now}});
 });
 return {token:value,expires_at:expires};
}
export async function consoleMe(){const a=actor();return ensureSession(client,a.sessionId,a.adminId,a.now);}
export async function consoleLogout(){return transaction(null,async tx=>{await tx.platformSession.update({where:{id:actor().sessionId},data:{revoked_at:actor().now}});await audit(tx,'admin.logout',null);});}
export async function consoleChangePassword(currentPassword:string,password:string){
 const a=actor();const admin=await client.platformAdmin.findUniqueOrThrow({where:{id:a.adminId}});
 if(!await argon2.verify(admin.password_hash,currentPassword))throw new ConsoleError('ADMIN_CREDENTIALS',401);
 const password_hash=await argon2.hash(password,{type:argon2.argon2id});
 return transaction(null,async tx=>{
  const changed=await tx.platformAdmin.updateMany({where:{id:a.adminId,password_hash:admin.password_hash},data:{password_hash}});
  if(changed.count!==1)throw new ConsoleError('UNAUTHORIZED',401);
  await tx.platformSession.updateMany({where:{admin_id:a.adminId,revoked_at:null},data:{revoked_at:a.now}});
  await audit(tx,'admin.password',null);
 });
}
const accountView=(a:Awaited<ReturnType<typeof client.platformAccount.findUnique>>)=>a?{contact_name:a.contact_name,contact_email:a.contact_email,monthly_fee_cents:a.monthly_fee_cents,trial_ends_at:a.trial_ends_at?.toISOString().slice(0,10)??null,renewal_at:a.renewal_at?.toISOString().slice(0,10)??null,notes:a.notes}:null;
export async function consoleSearch(data:ConsoleSearchInput){
 actor();const where:Prisma.TenantWhereInput={...(data.status?{status:data.status}:{}),...(data.plan?{plan:data.plan}:{}),...(data.q?{OR:[{name:{contains:data.q,mode:'insensitive'}},{slug:{contains:data.q,mode:'insensitive'}}]}:{})};
 const [total,rows]=await Promise.all([client.tenant.count({where}),client.tenant.findMany({where,select:{...publicTenant,_count:{select:{staffUser:true,restaurantTable:true,reservation:true,customer:true}}},orderBy:[{created_at:'desc'},{id:'desc'}],take:25,skip:(data.page-1)*25})]);
 const accounts=await client.platformAccount.findMany({where:{tenant_id:{in:rows.map(t=>t.id)}}});
 return {total,page:data.page,page_size:25,items:rows.map(({_count,...t})=>({...t,account:accountView(accounts.find(a=>a.tenant_id===t.id)??null),counts:{staff:_count.staffUser,tables:_count.restaurantTable,bookings:_count.reservation,customers:_count.customer}}))};
}
export async function consoleOverview(){
 const now=actor().now;
 const [tenants,accounts,attention]=await Promise.all([
  client.tenant.findMany({select:{id:true,name:true,slug:true,created_at:true,status:true,plan:true},orderBy:{created_at:'desc'}}),
  client.platformAccount.findMany(),
  client.notificationLog.count({where:{status:{in:['failed','uncertain']},tenant:{status:'active'}}}),
 ]);
 const ids=new Set(tenants.filter(t=>t.status==='active'&&t.plan!=='trial').map(t=>t.id));
 const limit=new Date(now.getTime()+30*86400000).toISOString().slice(0,10);
 const due=accounts.flatMap(a=>{
  const t=tenants.find(t=>t.id===a.tenant_id);if(!t||t.status!=='active')return [];
  return ([['trial',a.trial_ends_at],['renewal',a.renewal_at]] as const).filter(([kind,date])=>date&&date.toISOString().slice(0,10)<=limit&&(kind!=='trial'||t.plan==='trial')).map(([kind,date])=>({id:t.id,name:t.name,date:date!.toISOString().slice(0,10),kind}));
 }).sort((a,b)=>a.date.localeCompare(b.date));
 return {total:tenants.length,active:tenants.filter(t=>t.status==='active').length,suspended:tenants.filter(t=>t.status==='suspended').length,trial:tenants.filter(t=>t.status==='active'&&t.plan==='trial').length,mrr_cents:accounts.filter(a=>ids.has(a.tenant_id)).reduce((n,a)=>n+a.monthly_fee_cents,0),attention,due:due.slice(0,20),recent:tenants.slice(0,5).map(({id,name,slug,created_at})=>({id,name,slug,created_at}))};
}
export async function consoleDetail(tenantId:string){
 const now=actor().now;
 const tenant=await client.tenant.findUnique({where:{id:tenantId},select:{...publicTenant,_count:{select:{restaurantTable:true,staffUser:true,reservation:true,customer:true}}}});
 if(!tenant)throw new ConsoleError('NOT_FOUND',404);
 const from=DateTime.fromJSDate(now,{zone:tenant.timezone}).startOf('month'),to=from.plus({months:1});const range={gte:from.toJSDate(),lt:to.toJSDate()};
 const [settings,staff,account,hours,tables,menu,reservations,notifications,smsUsed]=await Promise.all([
  client.tenantSettings.findUniqueOrThrow({where:{tenant_id:tenantId}}),client.staffUser.findMany({where:{tenant_id:tenantId},select:publicStaff,orderBy:{full_name:'asc'}}),client.platformAccount.findUnique({where:{tenant_id:tenantId}}),
  client.openingHours.count({where:{tenant_id:tenantId}}),client.restaurantTable.count({where:{tenant_id:tenantId,active:true}}),client.menuItem.count({where:{tenant_id:tenantId,is_visible:true}}),
  client.reservation.groupBy({by:['status'],where:{tenant_id:tenantId,reserved_at:range},_count:true,_sum:{party_size:true}}),
  client.notificationLog.groupBy({by:['channel','status'],where:{tenant_id:tenantId,created_at:range},_count:true}),
  client.notificationLog.count({where:{tenant_id:tenantId,channel:'sms',status:{in:['processing','sent','uncertain','simulated']},attempted_at:range}}),
 ]);
 const checks:Array<{key:ConsoleCheck;complete:boolean}>=[
  {key:'owner',complete:staff.some(s=>s.role==='owner'&&s.status==='active'&&!!s.last_login_at)},
  {key:'hours',complete:hours>0},{key:'tables',complete:tables>0},
  {key:'phone',complete:!!tenant.phone},{key:'privacy',complete:!!settings.privacy_contact_email},
  {key:'menu',complete:menu>0},{key:'google',complete:!!tenant.google_place_id&&!tenant.google_place_id.startsWith('test-')},
  {key:'auto_assignment',complete:settings.auto_confirm&&settings.auto_assign_tables&&tables>0},
 ];
 const {_count,...base}=tenant;
 return {...base,counts:{staff:_count.staffUser,tables:_count.restaurantTable,bookings:_count.reservation,customers:_count.customer},account:accountView(account),settings,staff,checks,usage:{
  month:from.toFormat('yyyy-MM'),reservations:reservations.reduce((n,r)=>n+r._count,0),covers:reservations.filter(r=>!['cancelled','no_show'].includes(r.status)).reduce((n,r)=>n+(r._sum.party_size??0),0),cancelled:reservations.find(r=>r.status==='cancelled')?._count??0,no_shows:reservations.find(r=>r.status==='no_show')?._count??0,sms_used:smsUsed,notifications:notifications.map(n=>({channel:n.channel,status:n.status,count:n._count})),
 }};
}
async function accessLink(tx:Tx,tenantId:string,staffId:string,slug:string){
 const a=actor(),raw=token(),expires=new Date(a.now.getTime()+24*3600000);
 await tx.platformAccessLink.updateMany({where:{tenant_id:tenantId,staff_user_id:staffId,used_at:null},data:{used_at:a.now}});
 await tx.platformAccessLink.create({data:{tenant_id:tenantId,staff_user_id:staffId,admin_id:a.adminId,token_hash:hash(raw),expires_at:expires,created_at:a.now}});
 return {token:raw,expires_at:expires,slug};
}
export async function consoleCreate(data:ConsoleCreateInput){
 const password_hash=await argon2.hash(token(),{type:argon2.argon2id});
 return transaction(null,async tx=>{
  const {owner_name,owner_email,...profile}=data;
  const t=await tx.tenant.create({data:{...profile,status:'active'}});
  await tx.tenantSettings.create({data:{tenant_id:t.id,auto_confirm:true,auto_assign_tables:true,privacy_contact_email:owner_email}});
  const user=await tx.staffUser.create({data:{tenant_id:t.id,full_name:owner_name,email:owner_email,role:'owner',password_hash}});
  await tx.platformAccount.create({data:{tenant_id:t.id,contact_name:owner_name,contact_email:owner_email,trial_ends_at:data.plan==='trial'?new Date(actor().now.getTime()+14*86400000):null}});
  const access=await accessLink(tx,t.id,user.id,t.slug);await audit(tx,'tenant.created',t.id,{plan:t.plan});
  return {id:t.id,access};
 });
}
export async function consoleUpdateProfile(tenantId:string,data:ConsoleProfileInput){return transaction(tenantId,async tx=>{
 await tx.tenant.update({where:{id:tenantId},data});await audit(tx,'tenant.profile',tenantId,{fields:Object.keys(data)});return {saved:true};
});}
export async function consoleUpdateAccount(tenantId:string,data:ConsoleAccountInput){return transaction(tenantId,async tx=>{
 const {plan,trial_ends_at,renewal_at,...rest}=data;const before=await tx.tenant.findUniqueOrThrow({where:{id:tenantId}});
 await tx.tenant.update({where:{id:tenantId},data:{plan}});
 const row={...rest,trial_ends_at:trial_ends_at?new Date(trial_ends_at):null,renewal_at:renewal_at?new Date(renewal_at):null};
 await tx.platformAccount.upsert({where:{tenant_id:tenantId},create:{tenant_id:tenantId,...row},update:row});
 if(!['pro','full'].includes(plan))await tx.tenantSettings.update({where:{tenant_id:tenantId},data:{sms_enabled:false}});
 await audit(tx,'tenant.account',tenantId,{previous_plan:before.plan,plan,monthly_fee_cents:data.monthly_fee_cents});return {saved:true};
});}
export async function consoleUpdateStatus(tenantId:string,status:'active'|'suspended'|'cancelled',reason:string){return transaction(tenantId,async tx=>{
 const before=await tx.tenant.findUniqueOrThrow({where:{id:tenantId}});
 await tx.tenant.update({where:{id:tenantId},data:{status}});
 if(status!=='active'){
  await tx.staffSession.updateMany({where:{tenant_id:tenantId,revoked_at:null},data:{revoked_at:actor().now}});
  await tx.platformAccessLink.updateMany({where:{tenant_id:tenantId,used_at:null},data:{used_at:actor().now}});
 }
 await audit(tx,'tenant.status',tenantId,{from:before.status,to:status,reason});return {saved:true};
});}
export async function consoleUpdateServices(tenantId:string,data:ConsoleServicesInput){return transaction(tenantId,async tx=>{
 const t=await tx.tenant.findUniqueOrThrow({where:{id:tenantId}});
 if(data.notifications.sms_enabled&&!['pro','full'].includes(t.plan))throw new ConsoleError('INVALID_INPUT',400);
 await tx.tenantSettings.update({where:{tenant_id:tenantId},data:{...data.booking,...data.notifications}});
 await audit(tx,'tenant.services',tenantId,{auto_confirm:data.booking.auto_confirm,auto_assign_tables:data.booking.auto_assign_tables,sms_enabled:data.notifications.sms_enabled,sms_monthly_cap:data.notifications.sms_monthly_cap});return {saved:true};
});}
export async function consoleCreateStaff(tenantId:string,data:ConsoleStaffInput){
 const password_hash=await argon2.hash(token(),{type:argon2.argon2id});
 return transaction(tenantId,async tx=>{
  const t=await tx.tenant.findUniqueOrThrow({where:{id:tenantId}});if(t.status!=='active')throw new ConsoleError('INVALID_INPUT',400);
  const s=await tx.staffUser.create({data:{...data,tenant_id:tenantId,password_hash}});
  const result=await accessLink(tx,tenantId,s.id,t.slug);await audit(tx,'staff.created',tenantId,{staff_id:s.id,role:s.role});return result;
 });
}
export async function consoleUpdateStaff(tenantId:string,staffId:string,data:{role:'owner'|'staff';status:'active'|'disabled'}){return transaction(tenantId,async tx=>{
 const s=await tx.staffUser.findFirst({where:{id:staffId,tenant_id:tenantId}});if(!s)throw new ConsoleError('NOT_FOUND',404);
 if(s.role==='owner'&&s.status==='active'&&(data.role!=='owner'||data.status!=='active')&&await tx.staffUser.count({where:{tenant_id:tenantId,role:'owner',status:'active'}})<=1)throw new ConsoleError('LAST_OWNER');
 await tx.staffUser.update({where:{id:staffId,tenant_id:tenantId},data});
 await tx.staffSession.updateMany({where:{tenant_id:tenantId,staff_user_id:staffId,revoked_at:null},data:{revoked_at:actor().now}});
 if(data.status==='disabled')await tx.platformAccessLink.updateMany({where:{tenant_id:tenantId,staff_user_id:staffId,used_at:null},data:{used_at:actor().now}});
 await audit(tx,'staff.updated',tenantId,{staff_id:staffId,...data});return {saved:true};
});}
export async function consoleResetStaff(tenantId:string,staffId:string){return transaction(tenantId,async tx=>{
 const t=await tx.tenant.findUniqueOrThrow({where:{id:tenantId}});
 const s=await tx.staffUser.findFirst({where:{id:staffId,tenant_id:tenantId,status:'active'}});if(!s||t.status!=='active')throw new ConsoleError('NOT_FOUND',404);
 const result=await accessLink(tx,tenantId,staffId,t.slug);await audit(tx,'staff.access_link',tenantId,{staff_id:staffId});return result;
});}
export async function consoleRevokeStaff(tenantId:string,staffId:string){return transaction(tenantId,async tx=>{
 if(!await tx.staffUser.findFirst({where:{id:staffId,tenant_id:tenantId}}))throw new ConsoleError('NOT_FOUND',404);
 await tx.staffSession.updateMany({where:{tenant_id:tenantId,staff_user_id:staffId,revoked_at:null},data:{revoked_at:actor().now}});
 await tx.platformAccessLink.updateMany({where:{tenant_id:tenantId,staff_user_id:staffId,used_at:null},data:{used_at:actor().now}});
 await audit(tx,'staff.revoked',tenantId,{staff_id:staffId});return {saved:true};
});}
export async function redeemAccessLink(raw:string,password:string,now:Date){
 const link=await client.platformAccessLink.findUnique({where:{token_hash:hash(raw)}});
 if(!link||link.used_at||link.expires_at<=now)throw new ConsoleError('ACCESS_EXPIRED',400);
 const password_hash=await argon2.hash(password,{type:argon2.argon2id});
 return client.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${link.tenant_id},0))::text`;
  const t=await tx.tenant.findUnique({where:{id:link.tenant_id}});
  const s=await tx.staffUser.findFirst({where:{id:link.staff_user_id,tenant_id:link.tenant_id,status:'active'}});
  const issuer=await tx.platformAdmin.findFirst({where:{id:link.admin_id,active:true}});
  if(t?.status!=='active'||!s||!issuer)throw new ConsoleError('ACCESS_EXPIRED',400);
  const changed=await tx.platformAccessLink.updateMany({where:{id:link.id,tenant_id:link.tenant_id,used_at:null,expires_at:{gt:now}},data:{used_at:now}});
  if(changed.count!==1)throw new ConsoleError('ACCESS_EXPIRED',400);
  await tx.staffUser.update({where:{id:s.id,tenant_id:link.tenant_id},data:{password_hash}});
  await tx.staffSession.updateMany({where:{tenant_id:link.tenant_id,staff_user_id:s.id,revoked_at:null},data:{revoked_at:now}});
  await tx.platformAudit.create({data:{admin_id:link.admin_id,tenant_id:link.tenant_id,action:'staff.access_redeemed',metadata:{staff_id:s.id},created_at:now}});
  return {slug:t.slug};
 });
}
export async function consoleAudit(tenantId:string|undefined,page:number){
 actor();const where=tenantId?{tenant_id:tenantId}:{};
 const [total,rows]=await Promise.all([client.platformAudit.count({where}),client.platformAudit.findMany({where,orderBy:[{created_at:'desc'},{id:'desc'}],take:50,skip:(page-1)*50})]);
 const [admins,tenants]=await Promise.all([client.platformAdmin.findMany({where:{id:{in:rows.map(r=>r.admin_id)}},select:{id:true,full_name:true}}),client.tenant.findMany({where:{id:{in:rows.flatMap(r=>r.tenant_id?[r.tenant_id]:[])}},select:{id:true,name:true}})]);
 return {total,page,items:rows.map(({admin_id,tenant_id,...r})=>({...r,actor:admins.find(a=>a.id===admin_id)?.full_name??'',tenant_name:tenants.find(t=>t.id===tenant_id)?.name??null}))};
}
export async function disconnectConsole(){await client.$disconnect();}
