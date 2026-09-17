import { z } from 'zod';
import { type NotificationChannel,type Message,type SendResult,providerFetch,providerResponse,DeliveryError } from './channels.js';
// La sostituzione del fornitore modifica soltanto questa classe, non eventi, worker o quota.
export class SmsChannel implements NotificationChannel {
 private config:{account:string;key:string;secret:string;from:string};
 constructor(env:Readonly<Record<string,string|undefined>>){
  const data=z.object({SMS_ACCOUNT_ID:z.string().regex(/^AC[a-fA-F0-9]{32}$/),SMS_API_KEY:z.string().min(1),SMS_API_SECRET:z.string().min(1),SMS_FROM:z.string().min(1)}).parse(env);
  this.config={account:data.SMS_ACCOUNT_ID,key:data.SMS_API_KEY,secret:data.SMS_API_SECRET,from:data.SMS_FROM};
 }
 async send(message:Message):Promise<SendResult>{
  const response=await providerFetch(`https://api.dublin.ie1.twilio.com/2010-04-01/Accounts/${this.config.account}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(`${this.config.key}:${this.config.secret}`).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({To:message.recipient,From:this.config.from,Body:message.text})});
  const parsed=z.object({sid:z.string().min(1)}).safeParse(await providerResponse(response));
  if(!parsed.success)throw new DeliveryError('uncertain','PROVIDER_RESPONSE_UNKNOWN');
  return {status:'sent',providerId:parsed.data.sid};
 }
}
