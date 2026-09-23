'use client';
import { useEffect,useRef,useState } from 'react';
import type { CancellationDetails } from '@bigant/types';
import { api,ApiError,displayTime } from '../lib/api';
import { Brand,LanguageSwitch,ErrorNotice,Loading,Status,useCopy } from './shared';
export function Cancellation({token}:{token:string}) {
 const {t,language}=useCopy();
 const [data,setData]=useState<CancellationDetails|null>(null),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[pending,setPending]=useState(false),[refresh,setRefresh]=useState(0),[refreshing,setRefreshing]=useState(false);
 const [missing,setMissing]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null),refreshMessage=useRef(false);
 useEffect(()=>{
  let alive=true;const controller=new AbortController();setError('');setRefreshing(true);setMissing(false);
  api<CancellationDetails>(`/public/reservations/${token}`,{signal:controller.signal}).then(value=>{if(alive)setData(value);}).catch(reason=>{
   if(alive){if(reason instanceof ApiError&&(reason.status===404||(reason.status===400&&reason.code==='INVALID_INPUT'))){setMissing(true);setData(null);}else setError((reason as Error).message);}
  }).finally(()=>{if(alive)setRefreshing(false);});
  return()=>{alive=false;controller.abort();};
 },[token,refresh]);
 // Una richiesta aperta può essere confermata mentre l'ospite consulta questa pagina.
 useEffect(()=>{
  if(data?.status!=='pending'||pending||busy)return;
  const update=()=>{if(document.visibilityState==='visible'){refreshMessage.current=false;setRefresh(value=>value+1);}};
  const timer=setInterval(update,30000);document.addEventListener('visibilitychange',update);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);};
 },[data?.status,pending,busy]);
 useEffect(()=>{
  if(!pending)return;
  const timer=setTimeout(()=>{
   setBusy(true);setError('');
   api<{status:'cancelled'}>(`/public/reservations/${token}/cancel`,{method:'POST'}).then(result=>{
    // Il POST conferma già l'esito: non dipendere da un secondo caricamento per mostrarlo.
    setData(current=>current?{...current,status:result.status,can_cancel:false}:current);
   }).catch(reason=>{
    setError((reason as Error).message);
    if(reason instanceof ApiError&&reason.status===409)setData(current=>current?{...current,can_cancel:false}:current);
   }).finally(()=>{setBusy(false);setPending(false);});
  },5000);
  return()=>clearTimeout(timer);
 },[pending,token]);
 useEffect(()=>{if(data?.status==='cancelled')heading.current?.focus();},[data?.status]);
 const active=data&&(data.status==='pending'||data.status==='confirmed');
 return <div className="public-shell">
  <header className="public-header"><Brand href={data?`/r/${data.tenant.slug}`:'/'} /><LanguageSwitch/></header>
  <main className="manage-shell"><section className="panel success-card" aria-busy={busy}>
   {missing?<><h1>{t('bookingUnavailableTitle')}</h1><p className="muted">{t('bookingUnavailableHint')}</p></>:!data?(error?<ErrorNotice message={error} onRetry={()=>setRefresh(value=>value+1)}/>:<Loading/>):<>
    <p className="eyebrow accent">{data.tenant.name}</p><h1 ref={heading} tabIndex={-1}>{t(data.status==='cancelled'?'cancelledTitle':'manageTitle')}</h1>
    <div aria-live="polite" aria-atomic="true"><Status value={data.status}/>{data.status==='pending'&&<p className="muted small">{t('managePendingHint')}</p>}{data.status==='confirmed'&&<p className="muted small">{t('manageConfirmedHint')}</p>}</div>
    <div className="receipt-summary"><strong>{new Intl.DateTimeFormat(language,{dateStyle:'full',timeZone:data.tenant.timezone}).format(new Date(data.reserved_at))}</strong><span>{displayTime(data.reserved_at,data.tenant.timezone)} · {data.party_size} {t(data.party_size===1?'personUnit':'peopleUnit')}</span></div>
    {data.status==='cancelled'?<p className="muted">{t('cancelledHint')}</p>:active?<>
     <button type="button" className="text-button" disabled={refreshing||busy||pending} onClick={()=>{refreshMessage.current=true;setRefresh(value=>value+1);}}>{t(refreshing?'loading':'refreshBooking')}</button>
     {refreshMessage.current&&!refreshing&&!error&&<p className="small muted" role="status">{t('bookingUpdated')}</p>}
     {data.can_cancel?<><p className="muted small">{t('cancelDeadline')} {new Intl.DateTimeFormat(language,{dateStyle:'short',timeStyle:'short',timeZone:data.tenant.timezone}).format(new Date(data.cancellation_deadline))}</p><button type="button" className="button secondary wide" onClick={()=>setPending(true)} disabled={busy||pending||refreshing}>{t(busy?'loading':'cancelBooking')}</button></>:<><p className="muted">{t(data.tenant.phone?'cancelTooLate':'cancelTooLateNoPhone')}</p>{data.tenant.phone&&<a className="button primary" href={`tel:${data.tenant.phone}`}>{t('callVenue')}</a>}</>}
    </>:<p className="muted">{t('bookingClosedHint')}</p>}
    {error&&<ErrorNotice message={error} onRetry={()=>setRefresh(value=>value+1)}/>}
    {!busy&&!pending&&<><a href={`/r/${data.tenant.slug}/prenota`} className="text-button">{t('newBooking')}</a><br/><a href={`/r/${data.tenant.slug}`} className="text-button">{t('backVenue')}</a></>}
   </>}
  </section></main>
  {pending&&<div className="undo-toast" role="status"><span>{t(busy?'cancellingBooking':'cancelScheduled')}</span><button type="button" disabled={busy} onClick={()=>setPending(false)}>{t('undo')}</button></div>}
 </div>;
}
