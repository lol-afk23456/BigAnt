'use client';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import { bookingInput,type PublicVenue,type AvailabilityResponse,type PublicSlot,type BookingReceipt } from '@bigant/types';
import { api,staffApi,ApiError,localDate,addDate,displayDate } from '../lib/api';
import { useCopy,Brand,LanguageSwitch,Loading,ErrorNotice,Status } from './shared';

export function BookingForm({slug,staff=false,initialDate,onBooked}:{slug:string;staff?:boolean;initialDate?:string;onBooked?:(receipt:BookingReceipt)=>void}) {
 const {t,language}=useCopy();
 const [venue,setVenue]=useState<PublicVenue|null>(null),[date,setDate]=useState(initialDate??''),[party,setParty]=useState(2),[availability,setAvailability]=useState<AvailabilityResponse|null>(null),[selected,setSelected]=useState<PublicSlot|null>(null);
 const [error,setError]=useState(''),[slotError,setSlotError]=useState(''),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(false),[jumped,setJumped]=useState(false),[receipt,setReceipt]=useState<BookingReceipt|null>(null),[copied,setCopied]=useState(false);
 const [draft,setDraft]=useState({full_name:'',email:'',phone:'',notes:''});
 const first=useRef(true),formLoaded=useRef(Date.now());
 useEffect(()=>{let alive=true;setError('');api<PublicVenue>(`/public/${slug}`).then(data=>{if(alive){setVenue(data);setParty(p=>Math.min(p,data.max_party_size));setDate(initialDate??localDate(data.timezone));formLoaded.current=Date.now();}}).catch(e=>{if(alive)setError((e as Error).message);});return()=>{alive=false;};},[slug,initialDate,refresh]);
 useEffect(()=>{
  if(!venue||!date)return;let alive=true;setLoading(true);setAvailability(null);setSelected(null);setSlotError('');
  api<AvailabilityResponse>(`/public/${slug}/availability?date=${date}&party_size=${party}`).then(data=>{
   if(!alive)return;
   if(!staff&&first.current&&date===localDate(venue.timezone)&&!data.slots.some(s=>s.available)&&data.alternatives.length){first.current=false;setJumped(true);setDate(data.alternatives[0]!.date);return;}
   first.current=false;setAvailability(data);
  }).catch(e=>{if(alive)setSlotError((e as Error).message);}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[venue,date,party,slug,staff]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!selected||!venue||busy)return;
  const fields=new FormData(event.currentTarget);
  const parsed=bookingInput.safeParse({full_name:fields.get('full_name'),email:fields.get('email'),phone:fields.get('phone'),notes:fields.get('notes')??'',party_size:party,reserved_at:selected.starts_at});
  if(!parsed.success){setError(t('invalidForm'));return;}
  setBusy(true);setError('');
  try {
   // Il token è verificato dal server; non inviare una compilazione sotto i due secondi.
   const remaining=2100-(Date.now()-formLoaded.current);if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
   const result=staff?await staffApi<BookingReceipt>('/reservations',{method:'POST',body:JSON.stringify({...parsed.data,source:'phone'})}):await api<BookingReceipt>(`/public/${slug}/reservations`,{method:'POST',body:JSON.stringify({...parsed.data,form_token:venue.form_token,website:fields.get('website')??''})});
   if(onBooked)onBooked(result);else setReceipt(result);
  }catch(e){setError((e as Error).message);if(e instanceof ApiError&&e.status===409){setSelected(null);setAvailability(null);api<AvailabilityResponse>(`/public/${slug}/availability?date=${date}&party_size=${party}`).then(setAvailability).catch(()=>{});}}
  finally{setBusy(false);}
 }
 if(!venue)return error?<ErrorNotice message={error} onRetry={()=>setRefresh(n=>n+1)}/>:<Loading/>;
 const today=localDate(venue.timezone);
 if(receipt)return <section className="success-card panel"><div className="success-icon" aria-hidden="true">✓</div><p className="eyebrow">{venue.name}</p><h1>{t(receipt.status==='pending'?'pendingTitle':'confirmedTitle')}</h1><p className="muted">{t(receipt.status==='pending'?'pendingHint':'confirmedHint')}</p><div className="receipt-summary"><strong>{displayDate(date,language)}</strong><span>{selected?.time} · {party} {t('peopleUnit')}</span><Status value={receipt.status}/></div><a className="button primary wide" href={`/prenotazione/${receipt.cancel_token}`}>{t('manageBooking')} <span aria-hidden="true">↗</span></a><button className="button secondary wide" onClick={async()=>{try{await navigator.clipboard.writeText(`${location.origin}/prenotazione/${receipt.cancel_token}`);setCopied(true);}catch{setCopied(false);}}}>{t(copied?'copied':'copyLink')}</button><a className="text-button" href={`/r/${slug}/prenota`}>{t('newBooking')}</a></section>;
 return <form onSubmit={submit} className={`booking-form ${staff?'staff-booking':''}`}>
  <p className="booking-venue eyebrow accent">{venue.name}</p>
  {!staff&&<div className="progress-steps" aria-label={t('summary')}><span className="active"><b>1</b>{t('stepWhen')}</span><span className={selected?'active':''}><b>2</b>{t('stepYou')}</span><span><b>3</b>{t('stepDone')}</span></div>}
  <section className="panel booking-step"><div className="section-heading"><h2>{t('stepWhen')}</h2><span className="step-number">01</span></div>
   <fieldset><legend>{t('people')}</legend><div className="party-buttons">{Array.from({length:Math.min(8,venue.max_party_size)},(_,n)=>n+1).map(n=><button className={party===n?'choice selected':'choice'} type="button" key={n} aria-pressed={party===n} onClick={()=>setParty(n)}>{n}</button>)}</div>{venue.max_party_size>8&&<details className="more-people"><summary>{t('morePeople')}</summary><label>{t('party')}<input type="number" min="1" max={venue.max_party_size} value={party} onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=venue.max_party_size)setParty(n);}}/></label></details>}</fieldset>
   <div className="date-heading"><label htmlFor="booking-date">{t('date')}</label><input id="booking-date" type="date" value={date} min={today} max={addDate(today,venue.max_advance_days)} onChange={e=>{if(e.target.value){setDate(e.target.value);setJumped(false);}}}/></div>
   <div className="day-buttons">{Array.from({length:Math.min(5,venue.max_advance_days+1)},(_,n)=>addDate(today,n)).map((day,n)=><button key={day} type="button" className={date===day?'day-choice selected':'day-choice'} aria-pressed={date===day} onClick={()=>{setDate(day);setJumped(false);}}><small>{n===0?t('today'):n===1?t('tomorrow'):new Intl.DateTimeFormat(language,{weekday:'short',timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`))}</small><b>{Number(day.slice(8))}</b></button>)}</div>
   {jumped&&<p className="notice subtle" role="status">{t('jumped')}</p>}
   {loading?<Loading/>:slotError?<ErrorNotice message={slotError} onRetry={()=>setRefresh(n=>n+1)}/>:availability&&<div className="slots-section"><h3>{t('availableTimes')}</h3>{availability.slots.some(s=>s.available)?<div className="slot-buttons">{availability.slots.filter(s=>s.available).map(slot=><button key={slot.starts_at} type="button" className={selected?.starts_at===slot.starts_at?'slot selected':'slot'} aria-pressed={selected?.starts_at===slot.starts_at} onClick={()=>setSelected(slot)}>{slot.time}{availability.slots.filter(s=>s.time===slot.time).length>1&&<small> UTC{slot.offset}</small>}</button>)}</div>:<div className="empty-availability"><h3>{t('noAvailability')}</h3><p>{t(availability.alternatives.length?'alternativesHint':'noAlternatives')}</p><div className="alternatives">{availability.alternatives.map(alt=><button type="button" key={alt.date} className="button secondary" onClick={()=>setDate(alt.date)}>{displayDate(alt.date,language)} <span aria-hidden="true">→</span></button>)}</div>{venue.phone&&<a className="text-button" href={`tel:${venue.phone}`}>{t('callVenue')}</a>}</div>}</div>}
  </section>
  {selected&&<section className="panel booking-step reveal"><div className="section-heading"><div><h2>{t('yourDetails')}</h2><p className="muted small">{t('detailsHint')}</p></div><span className="step-number">02</span></div><div className="form-grid"><label className="span-two">{t('fullName')}<input name="full_name" value={draft.full_name} onChange={e=>setDraft({...draft,full_name:e.target.value})} autoComplete="name" required minLength={2} maxLength={120}/></label><label>{t('email')}<input name="email" value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})} type="email" autoComplete="email" required maxLength={254}/></label><label>{t('phone')}<input name="phone" value={draft.phone} onChange={e=>setDraft({...draft,phone:e.target.value})} type="tel" autoComplete="tel" required minLength={5} maxLength={40}/></label></div><p className="muted small">{t('required')}</p><details className="request-details"><summary>{t('addRequest')} <span aria-hidden="true">+</span></summary><label>{t('requests')}<textarea name="notes" value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} maxLength={1000} rows={3} placeholder={t('requestHint')}/></label></details><div className="honeypot" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" aria-label="website"/></div><div className="booking-recap"><div><span className="eyebrow">{t('summary')}</span><strong>{displayDate(date,language)} · {selected.time}</strong><span>{party} {t('peopleUnit')} · {venue.name}</span></div><span className="recap-symbol" aria-hidden="true">↗</span></div>{error&&<ErrorNotice message={error}/>}<button type="submit" className="button primary wide" disabled={busy}>{t(busy?'booking':'book')} <span aria-hidden="true">→</span></button><p className="form-footnote">{t(venue.auto_confirm?'autoConfirmHint':'manualConfirmHint')}</p></section>}
  {!selected&&error&&<ErrorNotice message={error}/>}
 </form>;
}
export function PublicBooking({slug}:{slug:string}){const {t}=useCopy();return <div className="public-shell"><header className="public-header"><Brand href={`/r/${slug}`}/><LanguageSwitch/></header><main className="booking-layout"><div className="booking-intro"><span className="eyebrow accent">{t('bookEyebrow')}</span><h1>{t('bookTitle')}</h1><p>{t('bookIntro')}</p><div className="table-art" aria-hidden="true"><i/><i/><div><span>✳</span></div><i/><i/></div><p className="demo-label">{t('localOnly')}</p></div><BookingForm slug={slug}/></main><footer className="public-footer">{t('brand')} <span>·</span> {t('tagline')}</footer></div>;}
