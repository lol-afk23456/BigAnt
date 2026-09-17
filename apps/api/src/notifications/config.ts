import { z } from 'zod';
import { DemoChannel,EmailChannel,PushChannel,type NotificationChannel } from './channels.js';
import { SmsChannel } from './sms-channel.js';
export interface NotificationRuntime {mode:'demo'|'live';origin:string;publicVapidKey:string|null;channels:Record<'email'|'sms'|'push',NotificationChannel>}
class UnconfiguredChannel implements NotificationChannel {
 async send():Promise<never>{const {DeliveryError}=await import('./channels.js');throw new DeliveryError('rejected','CHANNEL_UNCONFIGURED');}
}
export function notificationRuntime(env:Readonly<Record<string,string|undefined>>=process.env):NotificationRuntime {
 const mode=z.enum(['demo','live']).parse(env.NOTIFICATION_MODE??'demo');
 const origin=new URL(env.PUBLIC_ORIGIN??'http://localhost:3000');
 if(!['http:','https:'].includes(origin.protocol))throw new Error('PUBLIC_ORIGIN_INVALID');
 if(origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('PUBLIC_ORIGIN_INVALID');
 const demo=new DemoChannel();
 if(mode==='demo')return {mode,origin:origin.origin,publicVapidKey:null,channels:{email:demo,sms:demo,push:demo}};
 if(origin.protocol!=='https:'||env.DELIVERY_EU_VERIFIED!=='true')throw new Error('LIVE_DELIVERY_REQUIRES_HTTPS_AND_EU_VERIFICATION');
 const channels:NotificationRuntime['channels']={email:new UnconfiguredChannel(),sms:new UnconfiguredChannel(),push:new UnconfiguredChannel()};
 if(env.TEM_SECRET_KEY&&env.TEM_PROJECT_ID&&env.EMAIL_FROM){z.uuid().parse(env.TEM_PROJECT_ID);z.email().parse(env.EMAIL_FROM);channels.email=new EmailChannel({key:env.TEM_SECRET_KEY,project:env.TEM_PROJECT_ID,from:env.EMAIL_FROM});}
 if(env.SMS_EU_VERIFIED==='true')channels.sms=new SmsChannel(env);
 let publicVapidKey:string|null=null;
 if(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.VAPID_SUBJECT&&env.PUSH_EU_VERIFIED==='true'){
  publicVapidKey=env.VAPID_PUBLIC_KEY;channels.push=new PushChannel({subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});
 }
 return {mode,origin:origin.origin,publicVapidKey,channels};
}
