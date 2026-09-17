'use client';
import { lazy,Suspense,useEffect,useState } from 'react';
import type { PublicVenue } from '@bigant/types';
import { api } from '../lib/api';
import { Brand,ErrorNotice,LanguageSwitch,Loading,useCopy } from './shared';
// Il visitatore della pagina del locale non scarica il pannello staff.
const StaffApp=lazy(()=>import('./staff').then(module=>({default:module.StaffApp})));

function useVenue(slug:string){
 const [venue,setVenue]=useState<PublicVenue|null>(null);
 const [error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{
  let alive=true;setVenue(null);setError('');
  api<PublicVenue>(`/public/${slug}`).then(value=>{if(alive)setVenue(value);}).catch(reason=>{if(alive)setError((reason as Error).message);});
  return()=>{alive=false;};
 },[slug,revision]);
 return {venue,error,retry:()=>setRevision(value=>value+1)};
}

export function VenueHome({slug}:{slug:string}){
 const {t}=useCopy();const {venue,error,retry}=useVenue(slug);
 return <div className="public-shell">
  <header className="public-header"><Brand href={`/r/${slug}`}/><LanguageSwitch/></header>
  <main className="demo-home venue-home">
   {!venue?error?<ErrorNotice message={error} onRetry={retry}/>:<Loading/>:<>
    <span className="eyebrow accent">{t('welcomeVenue')}</span><h1>{venue.name}</h1>
    <p className="muted">{t('venuePortalHint')}</p>
    {venue.address&&<p className="small muted">{venue.address}</p>}
    <div className="venue-grid">
     <article className="panel venue-card"><span className="venue-symbol" aria-hidden="true">✳</span><h2>{t('book')}</h2><p className="muted">{t('bookingCardHint')}</p><a className="button primary" href={`/r/${slug}/prenota`}>{t('book')} →</a></article>
     <article className="panel venue-card"><span className="venue-symbol" aria-hidden="true">≡</span><h2>{t('menu')}</h2><p className="muted">{t('menuCardHint')}</p><a className="button secondary" href={`/r/${slug}/menu`}>{t('viewMenu')} →</a></article>
    </div>
    <div className="venue-home-footer"><a className="text-button" href={`/r/${slug}/feedback`}>{t('reviews')}</a>{venue.phone&&<a className="text-button" href={`tel:${venue.phone}`}>{t('callVenue')}</a>}<a className="text-button" href={`/r/${slug}/staff`}>{t('staffLink')} ↗</a></div>
    <p className="demo-label">{t('localOnly')}</p>
   </>}
  </main>
 </div>;
}

export function VenueStaff({slug}:{slug:string}){
 const {venue,error,retry}=useVenue(slug);
 if(!venue)return <div className="public-shell"><main className="manage-shell">{error?<ErrorNotice message={error} onRetry={retry}/>:<Loading/>}</main></div>;
 return <Suspense fallback={<Loading/>}><StaffApp venue={venue}/></Suspense>;
}
