'use client';
import { useEffect,useState } from 'react';
import { consoleAccessInput,securePassword } from '@bigant/types';
import { LanguageProvider,Brand,LanguageSwitch,ErrorNotice } from '../../components/shared';
import { useConsoleCopy,Form,Field,consoleApi,json } from '../../components/console-common';
import '../admin/console.css';
export default function Page(){return <LanguageProvider><Activate/></LanguageProvider>;}
function Activate(){
 const {c}=useConsoleCopy();const [token,setToken]=useState<string|null>(null),[slug,setSlug]=useState('');
 useEffect(()=>{setToken(window.location.hash.slice(1));window.history.replaceState(null,'',window.location.pathname);},[]);
 return <div className="public-shell"><header className="public-header"><Brand/><LanguageSwitch/></header><main className="console-activation panel console-card"><h1>{c('activateTitle')}</h1>
 {slug?<><p role="status">{c('activated')}</p><a className="button primary" href={`/r/${slug}/staff`}>{c('staffPage')} →</a></>:token===null?null:!token?<ErrorNotice message={c('missingToken')}/>:
 <Form schema={consoleAccessInput.extend({confirm:securePassword}).refine(v=>v.password===v.confirm)} convert={f=>({...Object.fromEntries(f),token})} submitLabel={c('activate')} onSubmit={async data=>{
  const result=await consoleApi<{slug:string}>('/access/activate',json('POST',{token:data.token,password:data.password}));setToken('');setSlug(result.slug);
 }}><p className="muted">{c('activateHint')}</p><p className="small muted">{c('passwordHint')}</p><Field name="password" type="password" label={c('newPassword')} required/><Field name="confirm" type="password" label={c('confirmPassword')} required/></Form>}
 </main></div>;
}
