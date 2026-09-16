'use client';
import { useEffect,useState,type FormEvent } from 'react';
import type { StaffProfile } from '@bigant/types';
import { signIn,staffApi } from '../lib/api';
import { Brand,ErrorNotice,LanguageSwitch,useCopy } from './shared';
export type VenueIdentity={name:string;slug:string};

export function StaffLogin({venue,onLogin}:{venue?:VenueIdentity|null;onLogin:(profile:StaffProfile)=>void}){
 const {t}=useCopy();
 const [slug,setSlug]=useState(venue?.slug??'trattoria-santa-lucia'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(venue){setSlug(venue.slug);return;}const value=new URLSearchParams(location.search).get('locale');if(value==='lido-miseno')setSlug(value);},[venue]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError('');const fields=new FormData(event.currentTarget);
  try{await signIn({slug,email:String(fields.get('email')),password:String(fields.get('password'))});onLogin(await staffApi<StaffProfile>('/auth/me'));}
  catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }
 const email=slug==='lido-miseno'?'owner@lidomiseno.test':slug==='trattoria-santa-lucia'?'owner@santalucia.test':'';
 return <div className="public-shell">
  <header className="public-header"><Brand href={venue?`/r/${venue.slug}`:'/'}/><LanguageSwitch/></header>
  <main className="login-layout">
   <div className="login-intro"><span className="eyebrow accent">{venue?.name??t('brand')}</span><h1>{t('loginTitle')}</h1><p>{t('loginHint')}</p><div className="login-art" aria-hidden="true"><span>12</span><i>↗</i><span>20:30</span><b>✳</b></div></div>
   <form className="panel login-form" onSubmit={submit}>
    <h2>{t('login')}</h2>
    {venue?<div className="login-venue"><span className="small muted">{t('venue')}</span><strong>{venue.name}</strong></div>:<label>{t('venue')}<select value={slug} onChange={event=>setSlug(event.target.value)}><option value="trattoria-santa-lucia">{t('restaurantA')}</option><option value="lido-miseno">{t('restaurantB')}</option></select></label>}
    <label>{t('email')}<input key={slug} name="email" type="email" autoComplete="username" required defaultValue={email}/></label>
    <label>{t('password')}<input name="password" type="password" autoComplete="current-password" required/></label>
    {error&&<ErrorNotice message={error}/>}<button type="submit" className="button primary wide" disabled={busy}>{t(busy?'loggingIn':'login')} →</button>
    {email&&<p className="small muted">{t('demoCredentials')}</p>}
   </form>
  </main>
 </div>;
}
