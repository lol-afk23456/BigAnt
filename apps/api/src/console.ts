import type { FastifyInstance,FastifyRequest } from 'fastify';
import { z } from 'zod';
import {consoleLogin,consolePassword,consoleSearchInput,consoleCreateInput,consoleProfileInput,consoleAccountInput,consoleStatusInput,consoleServicesInput,consoleStaffInput,consoleStaffPatch,consoleAccessInput,consoleAuditInput} from '@bigant/types';
import {ConsoleError,withConsoleSession,consoleLoginSession,consoleMe,consoleLogout,consoleChangePassword,consoleSearch,consoleOverview,consoleDetail,consoleCreate,consoleUpdateProfile,consoleUpdateAccount,consoleUpdateStatus,consoleUpdateServices,consoleCreateStaff,consoleUpdateStaff,consoleResetStaff,consoleRevokeStaff,consoleAudit,redeemAccessLink} from '@bigant/database/console';

const cookieName='__Secure-bigant_console';
const cookieOptions={httpOnly:true,secure:true,sameSite:'strict' as const,path:'/api/console'};
const tenantParams=z.object({id:z.uuid()});
const staffParams=tenantParams.extend({staffId:z.uuid()});
// Il proxy mantiene il cookie sul solo percorso amministrativo. L'header non semplice
// blocca form cross-site; non abilitiamo CORS su questi endpoint.
function sameOrigin(request:FastifyRequest){
 if(request.headers['x-bigant-console']!=='1'||request.headers['sec-fetch-site']==='cross-site')throw new ConsoleError('UNAUTHORIZED',401);
}
export function consoleRoutes(app:FastifyInstance,now:()=>Date,mode:'demo'|'live'){
 const run=<T>(request:FastifyRequest,work:()=>Promise<T>)=>withConsoleSession(request.cookies[cookieName],now(),work);
 const read={config:{rateLimit:{max:180,timeWindow:'1 minute'}}};
 const write={...read,preHandler:async(request:FastifyRequest)=>sameOrigin(request)};
 const sensitive={...write,config:{rateLimit:{max:5,timeWindow:'15 minutes'}}};
 app.post('/console/login',sensitive,async(request,reply)=>{
  const input=consoleLogin.parse(request.body);const result=await consoleLoginSession(input.email,input.password,now());
  reply.setCookie(cookieName,result.token,{...cookieOptions,maxAge:8*3600});return {signed_in:true};
 });
 app.get('/console/me',read,request=>run(request,consoleMe));
 app.post('/console/logout',write,async(request,reply)=>{
  try{await run(request,consoleLogout);}catch(error){if(!(error instanceof ConsoleError&&error.code==='UNAUTHORIZED'))throw error;}
  return reply.clearCookie(cookieName,cookieOptions).code(204).send();
 });
 app.post('/console/password',sensitive,async(request,reply)=>{
  const input=consolePassword.parse(request.body);await run(request,()=>consoleChangePassword(input.current_password,input.password));
  return reply.clearCookie(cookieName,cookieOptions).code(204).send();
 });
 app.get('/console/overview',read,request=>run(request,async()=>({...await consoleOverview(),mode})));
 app.post('/console/search',write,request=>run(request,()=>consoleSearch(consoleSearchInput.parse(request.body))));
 app.post('/console/audit',write,request=>run(request,()=>{const input=consoleAuditInput.parse(request.body);return consoleAudit(input.tenant_id,input.page);}));
 app.get('/console/tenants/:id',read,request=>run(request,()=>consoleDetail(tenantParams.parse(request.params).id)));
 app.post('/console/tenants',write,async(request,reply)=>reply.code(201).send(await run(request,()=>consoleCreate(consoleCreateInput.parse(request.body)))));
 app.patch('/console/tenants/:id/profile',write,request=>run(request,()=>consoleUpdateProfile(tenantParams.parse(request.params).id,consoleProfileInput.parse(request.body))));
 app.patch('/console/tenants/:id/account',write,request=>run(request,()=>consoleUpdateAccount(tenantParams.parse(request.params).id,consoleAccountInput.parse(request.body))));
 app.patch('/console/tenants/:id/status',write,request=>run(request,()=>{const input=consoleStatusInput.parse(request.body);return consoleUpdateStatus(tenantParams.parse(request.params).id,input.status,input.reason);}));
 app.patch('/console/tenants/:id/services',write,request=>run(request,()=>consoleUpdateServices(tenantParams.parse(request.params).id,consoleServicesInput.parse(request.body))));
 app.post('/console/tenants/:id/staff',write,async(request,reply)=>reply.code(201).send(await run(request,()=>consoleCreateStaff(tenantParams.parse(request.params).id,consoleStaffInput.parse(request.body)))));
 app.patch('/console/tenants/:id/staff/:staffId',write,request=>run(request,()=>{const {id,staffId}=staffParams.parse(request.params);return consoleUpdateStaff(id,staffId,consoleStaffPatch.parse(request.body));}));
 app.post('/console/tenants/:id/staff/:staffId/access-link',write,request=>run(request,()=>{const {id,staffId}=staffParams.parse(request.params);return consoleResetStaff(id,staffId);}));
 app.post('/console/tenants/:id/staff/:staffId/revoke',write,request=>run(request,()=>{const {id,staffId}=staffParams.parse(request.params);return consoleRevokeStaff(id,staffId);}));
 app.post('/access/activate',sensitive,request=>{const input=consoleAccessInput.parse(request.body);return redeemAccessLink(input.token,input.password,now());});
}
