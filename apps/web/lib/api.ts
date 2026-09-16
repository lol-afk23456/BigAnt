import { uiMessages, type Language } from '@bigant/i18n';
let accessToken:string|null=null;
let refreshing:Promise<string>|null=null;
export class ApiError extends Error { constructor(message:string,public code:string,public status:number){super(message);} }
export async function api<T>(path:string,options:RequestInit={},token?:string):Promise<T> {
 const language:Language=typeof document!=='undefined'&&document.documentElement.lang==='en'?'en':'it';
 let response:Response;
 try { response=await fetch(path.startsWith('/auth/')?path:`/api${path}`,{...options,cache:'no-store',credentials:'same-origin',headers:{...(options.body?{'Content-Type':'application/json'}:{}),'Accept-Language':language,...(token?{Authorization:`Bearer ${token}`} : {}),...options.headers}}); }
 catch {throw new ApiError(uiMessages[language].network,'NETWORK',0);}
 if(!response.ok){let error:{error?:{message:string;code:string}}={};try{error=await response.json();}catch{/* Risposta non JSON: usare il messaggio di rete tradotto. */}throw new ApiError(error.error?.message??uiMessages[language].network,error.error?.code??'UNKNOWN',response.status);}
 if(response.status===204)return undefined as T;
 return response.json() as Promise<T>;
}
async function refresh(){
 if(!refreshing)refreshing=api<{access_token:string}>('/auth/refresh',{method:'POST'}).then(r=>{accessToken=r.access_token;return r.access_token;}).finally(()=>{refreshing=null;});
 return refreshing;
}
export async function staffApi<T>(path:string,options:RequestInit={}):Promise<T>{
 const token=accessToken??await refresh();
 try{return await api<T>(path,options,token);}catch(error){if(!(error instanceof ApiError)||error.status!==401)throw error;accessToken=null;return api<T>(path,options,await refresh());}
}
export async function signIn(data:{slug:string;email:string;password:string}){const result=await api<{access_token:string}>('/auth/login',{method:'POST',body:JSON.stringify(data)});accessToken=result.access_token;}
export async function signOut(){await api('/auth/logout',{method:'POST'});accessToken=null;}
export function localDate(zone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function addDate(date:string,days:number){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function displayDate(date:string,language:Language){return new Intl.DateTimeFormat(language==='it'?'it-IT':'en-GB',{weekday:'short',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));}
export function displayTime(date:string,zone:string){return new Intl.DateTimeFormat('it-IT',{timeZone:zone,hour:'2-digit',minute:'2-digit'}).format(new Date(date));}
