'use client';
import { useState,type ReactNode,type FormEvent } from 'react';
import { consoleMessages,type ConsoleKey } from '@bigant/i18n';
import { useCopy,ErrorNotice } from './shared';
import { api } from '../lib/api';

export function useConsoleCopy(){const {language}=useCopy();return {language,c:(key:ConsoleKey)=>consoleMessages[language][key],label:(key:string)=>consoleMessages[language][key as ConsoleKey]??key};}
export const consoleApi=<T,>(path:string,options:RequestInit={})=>api<T>(path,{...options,headers:{...options.headers,'X-BigAnt-Console':'1'}});
export const json=(method:string,body:unknown):RequestInit=>({method,body:JSON.stringify(body)});
export function money(cents:number,language:string){return new Intl.NumberFormat(language==='it'?'it-IT':'en-GB',{style:'currency',currency:'EUR'}).format(cents/100);}
export function dateLabel(value:string|null,language:string){return value?new Intl.DateTimeFormat(language==='it'?'it-IT':'en-GB',{dateStyle:'medium',...(value.length>10?{timeStyle:'short' as const}:{timeZone:'UTC'})}).format(new Date(value)):'—';}
export const optional=(value:FormDataEntryValue|null)=>typeof value==='string'&&value.trim()?value.trim():null;
export function feeCents(value:FormDataEntryValue|null){const s=String(value??'').trim().replace(',','.');if(!/^\d{1,7}(\.\d{1,2})?$/.test(s))return Number.NaN;const [whole,part='']=s.split('.');return Number(whole)*100+Number(part.padEnd(2,'0'));}
export function Field({name,label,value='',type='text',required=false,min,max,hint}:{name:string;label:string;value?:string|number|null;type?:string;required?:boolean;min?:number;max?:number;hint?:string}){return <label>{label}<input name={name} type={type} defaultValue={value??''} required={required} min={min} max={max} autoComplete={type==='password'?'new-password':undefined}/>{hint&&<small className="muted">{hint}</small>}</label>;}
export function Select({name,label,value,values}:{name:string;label:string;value:string;values:readonly string[]}){const {label:translate}=useConsoleCopy();return <label>{label}<select name={name} defaultValue={value}>{values.map(v=><option key={v} value={v}>{translate(v)}</option>)}</select></label>;}
export function Toggle({name,label,value,disabled=false}:{name:string;label:string;value:boolean;disabled?:boolean}){return <label className="console-toggle"><input type="checkbox" name={name} defaultChecked={value} disabled={disabled}/><span>{label}</span></label>;}
export function Form<T>({schema,convert,onSubmit,children,submitLabel,success=false}:{schema:{safeParse:(data:unknown)=>{success:true;data:T}|{success:false}};convert:(data:FormData)=>unknown;onSubmit:(value:T)=>Promise<void>;children:ReactNode;submitLabel?:string;success?:boolean}){
 const {c}=useConsoleCopy();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setError('');setSaved(false);const parsed=schema.safeParse(convert(data));if(!parsed.success){setError(c('invalid'));return;}setBusy(true);try{await onSubmit(parsed.data);setSaved(true);}catch(e){setError(e instanceof Error?e.message:c('invalid'));}finally{setBusy(false);}}
 return <form onSubmit={submit} className="console-form"><fieldset disabled={busy}>{children}</fieldset>{error&&<ErrorNotice message={error}/>}<div className="console-actions"><button className="button primary" disabled={busy} type="submit">{submitLabel??c('save')}</button>{success&&saved&&<span role="status" className="accent">{c('saved')}</span>}</div></form>;
}
