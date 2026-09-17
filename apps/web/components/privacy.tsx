'use client';
import { useEffect,useState } from 'react';
import type { PrivacyVenue } from '@bigant/types';
import { api } from '../lib/api';
import { Brand,LanguageSwitch,useCopy,Loading,ErrorNotice } from './shared';
export function PublicPrivacy({slug}:{slug:string}) {
 const {t}=useCopy();const [venue,setVenue]=useState<PrivacyVenue|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let alive=true;setError('');api<PrivacyVenue>(`/public/${slug}/privacy`).then(v=>{if(alive)setVenue(v);}).catch(e=>{if(alive)setError((e as Error).message);});return()=>{alive=false;};},[slug,revision]);
 return <div className="public-shell"><header className="public-header"><Brand href={`/r/${slug}`}/><LanguageSwitch/></header><main className="manage-shell panel privacy-copy"><h1>{t('privacyTitle')}</h1>{error?<ErrorNotice message={error} onRetry={()=>setRevision(n=>n+1)}/>:!venue?<Loading/>:<>{(venue.demo||!venue.contact_email)&&<p className="notice subtle">{t('privacyDemo')}</p>}<p>{t('privacyController')} <strong>{venue.name}</strong>. {venue.address}</p><p>{t('privacyProcessor')}</p><p>{t('privacyPurpose')}</p><p>{t('privacyMarketing')}</p><p>{t('privacySensitive')}</p><p>{t('privacyRetention')} <strong>{venue.retention_months}</strong>.</p><p>{t('privacyRights')}</p>{venue.contact_email?<a href={`mailto:${venue.contact_email}`} className="text-button">{venue.contact_email}</a>:<p className="muted">{t('privacyMissing')}</p>}{venue.phone&&<a className="text-button" href={`tel:${venue.phone}`}>{t('callVenue')}</a>}<p className="muted small">{t('privacyVendors')}</p></>}</main></div>;
}
