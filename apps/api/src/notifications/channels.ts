import webpush from 'web-push';
import { z } from 'zod';
import { uiMessages } from '@bigant/i18n';

export interface Message {recipient:string;subject:string;text:string;url:string;replyTo?:string;subscription?:{endpoint:string;keys:{p256dh:string;auth:string}}}
export interface SendResult {status:'sent'|'simulated';providerId:string}
export interface NotificationChannel {send(message:Message,idempotencyKey:string):Promise<SendResult>}
export class DeliveryError extends Error {
 constructor(public outcome:'rejected'|'retry'|'uncertain'|'expired',public code:string){super(code);}
}
export class DemoChannel implements NotificationChannel {
 async send(_message:Message,key:string):Promise<SendResult>{return {status:'simulated',providerId:`demo:${key}`};}
}
// Solo un rifiuto definitivo documentato consente un nuovo tentativo.
export async function providerResponse(response:Response) {
 if(response.status===429)throw new DeliveryError('retry','PROVIDER_THROTTLED');
 if(response.status>=500)throw new DeliveryError('uncertain','PROVIDER_UNKNOWN');
 if(!response.ok)throw new DeliveryError('rejected','PROVIDER_REJECTED');
 try{return await response.json() as unknown;}catch{throw new DeliveryError('uncertain','PROVIDER_RESPONSE_UNKNOWN');}
}
export async function providerFetch(url:string,options:RequestInit) {
 try{return await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});}
 catch{throw new DeliveryError('uncertain','PROVIDER_TIMEOUT');}
}
export class EmailChannel implements NotificationChannel {
 constructor(private config:{key:string;project:string;from:string}){}
 async send(message:Message):Promise<SendResult>{
  const response=await providerFetch('https://api.scaleway.com/transactional-email/v1alpha1/regions/fr-par/emails',{method:'POST',headers:{'X-Auth-Token':this.config.key,'Content-Type':'application/json'},body:JSON.stringify({project_id:this.config.project,from:{email:this.config.from,name:uiMessages.it.brand},to:[{email:message.recipient}],subject:message.subject,text:message.text,...(message.replyTo?{additional_headers:[{key:'Reply-To',value:message.replyTo}]}:{})})});
  const parsed=z.object({emails:z.array(z.object({id:z.string().min(1)})).min(1)}).safeParse(await providerResponse(response));
  if(!parsed.success)throw new DeliveryError('uncertain','PROVIDER_RESPONSE_UNKNOWN');
  return {status:'sent',providerId:parsed.data.emails[0]!.id};
 }
}
export function validPushEndpoint(value:string) {
 try{const url=new URL(value);return url.protocol==='https:'&&(!url.port||url.port==='443')&&!url.username&&!url.password&&['fcm.googleapis.com','web.push.apple.com','updates.push.services.mozilla.com','push.services.mozilla.com'].includes(url.hostname);}
 catch{return false;}
}
export class PushChannel implements NotificationChannel {
 constructor(private config:{subject:string;publicKey:string;privateKey:string}){}
 async send(message:Message):Promise<SendResult>{
  if(!message.subscription||!validPushEndpoint(message.subscription.endpoint))throw new DeliveryError('rejected','INVALID_SUBSCRIPTION');
  try{
   await webpush.sendNotification(message.subscription,JSON.stringify({title:message.subject,body:message.text,url:message.url}),{vapidDetails:this.config,TTL:300,timeout:15000});
   return {status:'sent',providerId:'web-push-accepted'};
  }catch(error){
   const status=(error as {statusCode?:number}).statusCode;
   if(status===404||status===410)throw new DeliveryError('expired','SUBSCRIPTION_EXPIRED');
   if(status===429)throw new DeliveryError('retry','PROVIDER_THROTTLED');
   if(status&&status>=400&&status<500)throw new DeliveryError('rejected','PROVIDER_REJECTED');
   throw new DeliveryError('uncertain','PROVIDER_UNKNOWN');
  }
 }
}
