'use client';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import { bookingInput,type PublicVenue,type AvailabilityResponse,type PublicSlot,type BookingReceipt,type GroupRecord } from '@bigant/types';
import { api,staffApi,ApiError,localDate,addDate,displayDate,displayTime } from '../lib/api';
import { useCopy,Brand,LanguageSwitch,Loading,ErrorNotice,Status } from './shared';

type ContactField='full_name'|'email'|'phone';

export function BookingForm({slug,staff=false,initialDate,onBooked,onVenueLoaded,groups=[]}:{slug:string;staff?:boolean;initialDate?:string;groups?:GroupRecord[];onBooked?:(receipt:BookingReceipt)=>void;onVenueLoaded?:(venue:PublicVenue)=>void}) {
 const {t,language}=useCopy();
 const [groupId,setGroupId]=useState('');
 const [venue,setVenue]=useState<PublicVenue|null>(null),[date,setDate]=useState(initialDate??''),[party,setParty]=useState(2);
 const [availability,setAvailability]=useState<AvailabilityResponse|null>(null),[selected,setSelected]=useState<PublicSlot|null>(null);
 const [error,setError]=useState(''),[slotError,setSlotError]=useState(''),[loading,setLoading]=useState(false);
 const [venueRevision,setVenueRevision]=useState(0),[availabilityRevision,setAvailabilityRevision]=useState(0);
 const [busy,setBusy]=useState(false),[jumped,setJumped]=useState(false),[receipt,setReceipt]=useState<BookingReceipt|null>(null);
 const [copyState,setCopyState]=useState<'copied'|'error'|null>(null);
 const [draft,setDraft]=useState({full_name:'',email:'',phone:'',notes:''});
 const [consent,setConsent]=useState({privacy:false,marketing:false});
 const [invalidField,setInvalidField]=useState<ContactField|null>(null);
 const first=useRef(true),formLoaded=useRef(Date.now()),detailsHeading=useRef<HTMLHeadingElement>(null),receiptHeading=useRef<HTMLHeadingElement>(null);

 useEffect(()=>{
  let alive=true;setError('');setVenue(null);first.current=true;
  api<PublicVenue>(`/public/${slug}`).then(data=>{
   if(alive){setVenue(data);onVenueLoaded?.(data);setParty(p=>Math.min(p,data.max_party_size));setDate(initialDate??localDate(data.timezone));formLoaded.current=Date.now();}
  }).catch(e=>{if(alive)setError((e as Error).message);});
  return()=>{alive=false;};
 },[slug,initialDate,venueRevision,onVenueLoaded]);

 useEffect(()=>{
  if(!venue||!date)return;
  let alive=true;const controller=new AbortController();
  setLoading(true);setAvailability(null);setSelected(null);setSlotError('');
  const path=staff?`/staff/availability?date=${date}&party_size=${party}${groupId?`&table_group_id=${groupId}`:''}`:`/public/${slug}/availability?date=${date}&party_size=${party}`;
  const request=staff?staffApi<AvailabilityResponse>(path,{signal:controller.signal}):api<AvailabilityResponse>(path,{signal:controller.signal});
  request.then(data=>{
   if(!alive)return;
   if(!staff&&first.current&&date===localDate(venue.timezone)&&!data.slots.some(s=>s.available)&&data.alternatives.length){
    first.current=false;setJumped(true);setDate(data.alternatives[0]!.date);return;
   }
   first.current=false;setAvailability(data);
  }).catch(e=>{if(alive)setSlotError((e as Error).message);}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;controller.abort();};
 },[venue,date,party,slug,staff,groupId,availabilityRevision]);

 useEffect(()=>{if(selected)detailsHeading.current?.focus();},[selected]);
 useEffect(()=>{if(receipt)receiptHeading.current?.focus();},[receipt]);

 function changeDate(value:string){if(value){setDate(value);setSelected(null);setJumped(false);setError('');setInvalidField(null);}}
 function changeParty(value:number){if(venue&&Number.isInteger(value)&&value>=1&&value<=venue.max_party_size){setParty(value);setSelected(null);setError('');setInvalidField(null);}}
 function updateContact(field:ContactField,value:string){setDraft(current=>({...current,[field]:value}));if(invalidField===field){setInvalidField(null);setError('');}}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!selected||!venue||busy)return;
  const form=event.currentTarget,fields=new FormData(form);
  const parsed=bookingInput.safeParse({full_name:draft.full_name,email:draft.email.trim(),phone:draft.phone,notes:draft.notes,party_size:party,reserved_at:selected.starts_at,locale:language,privacy_accepted:staff?undefined:consent.privacy,marketing_consent:!staff&&consent.marketing});
  if(!parsed.success){
   const field=parsed.error.issues[0]?.path[0];
   if(field==='full_name'||field==='email'||field==='phone'){
    setInvalidField(field);setError(t(field==='full_name'?'invalidName':field==='email'?'invalidEmail':'invalidPhone'));
    const input=form.elements.namedItem(field);if(input instanceof HTMLElement)input.focus();
   }else setError(t('invalidForm'));
   return;
  }
  setBusy(true);setError('');setInvalidField(null);
  try {
   // Il token è verificato dal server; non inviare una compilazione sotto i due secondi.
   const remaining=2100-(Date.now()-formLoaded.current);if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
   const result=staff?await staffApi<BookingReceipt>('/reservations',{method:'POST',body:JSON.stringify({...parsed.data,source:'phone',...(groupId?{table_group_id:groupId}:{})})}):await api<BookingReceipt>(`/public/${slug}/reservations`,{method:'POST',body:JSON.stringify({...parsed.data,form_token:venue.form_token,website:fields.get('website')??''})});
   if(onBooked)onBooked(result);else setReceipt(result);
  }catch(e){
   setError((e as Error).message);
   if(e instanceof ApiError&&e.code==='INVALID_PHONE'){setInvalidField('phone');}
   if(e instanceof ApiError&&e.status===409){setSelected(null);setAvailabilityRevision(value=>value+1);}
  }finally{setBusy(false);}
 }

 if(!venue)return error?<ErrorNotice message={error} onRetry={()=>setVenueRevision(n=>n+1)}/>:<Loading/>;
 const today=localDate(venue.timezone);
 const venueDate=new Intl.DateTimeFormat('en-CA',{timeZone:venue.timezone,year:'numeric',month:'2-digit',day:'2-digit'});
 const actualDate=(value:string)=>venueDate.format(new Date(value));
 const selectedDate=selected?actualDate(selected.starts_at):date;
 const availableSlots=availability?.slots.filter(slot=>slot.available)??[];
 const activeGroups=groups.filter(group=>group.active);
 if(receipt)return <section className="success-card panel">
  <div className="success-icon" aria-hidden="true">✓</div><p className="eyebrow">{venue.name}</p>
  <h1 ref={receiptHeading} tabIndex={-1}>{t(receipt.status==='pending'?'pendingTitle':'confirmedTitle')}</h1>
  <p className="muted">{t(receipt.status==='pending'?'pendingHint':'confirmedHint')}</p>
  <div className="receipt-summary"><strong>{displayDate(actualDate(receipt.reserved_at),language)}</strong><span>{displayTime(receipt.reserved_at,venue.timezone)} · {receipt.party_size} {t(receipt.party_size===1?'personUnit':'peopleUnit')}</span><Status value={receipt.status}/></div>
  <a className="button primary wide" href={`/prenotazione/${receipt.cancel_token}`}>{t('manageBooking')} <span aria-hidden="true">↗</span></a>
  <button type="button" className="button secondary wide" onClick={async()=>{try{await navigator.clipboard.writeText(`${location.origin}/prenotazione/${receipt.cancel_token}`);setCopyState('copied');}catch{setCopyState('error');}}}>{t(copyState==='copied'?'copied':'copyLink')}</button>
  <p role="status" className="small muted">{copyState==='copied'?t('bookingLinkSaved'):copyState==='error'?t('copyLinkError'):t('bookingLinkPrivate')}</p>
  {copyState==='error'&&<input aria-label={t('bookingLink')} readOnly value={`${location.origin}/prenotazione/${receipt.cancel_token}`} onFocus={event=>event.target.select()}/>}
  <a className="text-button" href={`/r/${slug}/prenota`}>{t('newBooking')}</a><br/><a className="text-button" href={`/r/${slug}`}>{t('backVenue')}</a>
 </section>;
 return <form onSubmit={submit} className={`booking-form ${staff?'staff-booking':''}`} aria-busy={busy}>
  <p className="booking-venue eyebrow accent">{venue.name}</p>
  {!staff&&<div className="progress-steps" role="list" aria-label={t('bookingProgress')}><span role="listitem" className="active" aria-current={!selected?'step':undefined}><b>1</b>{t('stepWhen')}</span><span role="listitem" className={selected?'active':''} aria-current={selected?'step':undefined}><b>2</b>{t('stepYou')}</span><span role="listitem"><b>3</b>{t('stepDone')}</span></div>}
  <fieldset disabled={busy}>
   <legend className="sr-only">{t('bookingProgress')}</legend>
   <section className="panel booking-step">
    <div className="section-heading"><h2>{t('stepWhen')}</h2><span className="step-number" aria-hidden="true">01</span></div>
    {!staff&&<p className="booking-mode small muted">{t(venue.auto_confirm?'autoConfirmHint':'manualConfirmHint')}</p>}
    {staff&&!!activeGroups.length&&<label>{t('waitingPlacement')}<select value={groupId} onChange={e=>{setGroupId(e.target.value);setSelected(null);}}><option value="">{t('autoAssign')}</option>{activeGroups.map(group=><option key={group.id} value={group.id}>{group.name} · {group.min_capacity}–{group.max_capacity} · {t('groupManual')}</option>)}</select></label>}
    <fieldset><legend>{t('people')}</legend>
     <div className="party-buttons">{Array.from({length:Math.min(8,venue.max_party_size)},(_,n)=>n+1).map(n=><button className={party===n?'choice selected':'choice'} type="button" key={n} aria-pressed={party===n} onClick={()=>changeParty(n)}>{n}</button>)}</div>
     {venue.max_party_size>8&&<details className="more-people"><summary>{t('morePeople')}{party>8&&` · ${party} ${t('peopleUnit')}`}</summary><label>{t('party')}<input type="number" min="1" max={venue.max_party_size} value={party} inputMode="numeric" onChange={e=>changeParty(Number(e.target.value))}/></label></details>}
    </fieldset>
    <div className="date-heading"><label htmlFor="booking-date">{t('date')}</label><input id="booking-date" type="date" value={date} min={today} max={addDate(today,venue.max_advance_days)} onChange={e=>changeDate(e.target.value)}/></div>
    <div className="day-buttons">{Array.from({length:Math.min(5,venue.max_advance_days+1)},(_,n)=>addDate(today,n)).map((day,n)=><button key={day} type="button" className={date===day?'day-choice selected':'day-choice'} aria-pressed={date===day} onClick={()=>changeDate(day)}><small>{n===0?t('today'):n===1?t('tomorrow'):new Intl.DateTimeFormat(language,{weekday:'short',timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`))}</small><b>{Number(day.slice(8))}</b></button>)}</div>
    {jumped&&<p className="notice subtle" role="status">{t('jumped')}</p>}
    {loading?<Loading/>:slotError?<ErrorNotice message={slotError} onRetry={()=>setAvailabilityRevision(n=>n+1)}/>:availability&&<div className="slots-section">
     <h3>{t('availableTimes')} <span className="muted small">· {displayDate(date,language)}</span></h3>
     {availableSlots.length?<div className="slot-buttons">{availableSlots.map(slot=><button key={slot.starts_at} type="button" className={selected?.starts_at===slot.starts_at?'slot selected':'slot'} aria-pressed={selected?.starts_at===slot.starts_at} onClick={()=>{setSelected(slot);setError('');}}>{slot.time}{actualDate(slot.starts_at)!==date&&<small>{displayDate(actualDate(slot.starts_at),language)}</small>}{availableSlots.filter(s=>s.time===slot.time).length>1&&<small> UTC{slot.offset}</small>}</button>)}</div>:<div className="empty-availability">
      <h3>{t('noAvailability')}</h3><p>{t(availability.alternatives.length?'alternativesHint':venue.phone?'noAlternatives':'noAlternativesNoPhone')}</p>
      <div className="alternatives">{availability.alternatives.map(alt=><button type="button" key={alt.date} className="button secondary" onClick={()=>changeDate(alt.date)}>{displayDate(alt.date,language)} <span aria-hidden="true">→</span></button>)}</div>
      {venue.phone&&<a className="text-button" href={`tel:${venue.phone}`}>{t('callVenue')}</a>}
     </div>}
    </div>}
   </section>
   {selected&&<section className="panel booking-step reveal">
    <div className="section-heading"><div><h2 ref={detailsHeading} tabIndex={-1}>{t('yourDetails')}</h2><p className="muted small">{t('detailsHint')}</p></div><span className="step-number" aria-hidden="true">02</span></div>
    <div className="form-grid">
     <label className="span-two">{t('fullName')}<input name="full_name" value={draft.full_name} onChange={e=>updateContact('full_name',e.target.value)} autoComplete="name" required minLength={2} maxLength={120} aria-invalid={invalidField==='full_name'} aria-describedby={invalidField==='full_name'?'booking-error':undefined}/></label>
     <label>{t('email')}<input name="email" value={draft.email} onChange={e=>updateContact('email',e.target.value)} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} aria-invalid={invalidField==='email'} aria-describedby={invalidField==='email'?'booking-error':undefined}/></label>
     <label>{t('phone')}<input name="phone" value={draft.phone} onChange={e=>updateContact('phone',e.target.value)} type="tel" autoComplete="tel" required minLength={5} maxLength={40} aria-invalid={invalidField==='phone'} aria-describedby={invalidField==='phone'?'booking-phone-hint booking-error':'booking-phone-hint'}/></label>
    </div>
    <p id="booking-phone-hint" className="muted small">{t('phoneHint')}</p><p className="muted small">{t('required')}</p>
    <details className="request-details"><summary>{t('addRequest')} <span aria-hidden="true">+</span></summary><label>{t('requests')}<textarea name="notes" value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} maxLength={1000} rows={3} placeholder={t('requestHint')}/></label><p className="muted small">{t('requestNotGuaranteed')}</p><p className="muted small">{t('allergyWarning')}</p></details>
    {!staff&&<div className="booking-consents"><a className="text-button" href={`/r/${slug}/privacy`} target="_blank" rel="noreferrer">{t('privacyRead')} <span aria-hidden="true">↗</span></a><label className="check-label"><input name="privacy_accepted" type="checkbox" checked={consent.privacy} onChange={event=>setConsent({...consent,privacy:event.target.checked})} required/>{t('privacyAcknowledged')}</label><label className="check-label"><input name="marketing_consent" type="checkbox" checked={consent.marketing} onChange={event=>setConsent({...consent,marketing:event.target.checked})}/>{t('marketingOptIn')}</label></div>}
    <div className="honeypot" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off"/></div>
    <div className="booking-recap"><div><span className="eyebrow">{t('summary')}</span><strong>{displayDate(selectedDate,language)} · {selected.time}</strong><span>{party} {t(party===1?'personUnit':'peopleUnit')} · {venue.name}</span></div><span className="recap-symbol" aria-hidden="true">↗</span></div>
    <p className="muted small">{t('cancellationPolicy').replace('{deadline}',new Intl.DateTimeFormat(language,{dateStyle:'short',timeStyle:'short',timeZone:venue.timezone}).format(new Date(new Date(selected.starts_at).getTime()-venue.cancellation_deadline_hours*3600000)))}</p>
    {error&&<div id="booking-error"><ErrorNotice message={error}/></div>}
    <button type="submit" className="button primary wide" disabled={busy}>{t(busy?'booking':staff||venue.auto_confirm?'book':'requestBooking')} <span aria-hidden="true">→</span></button>
    <p className="form-footnote">{t(venue.auto_confirm?'autoConfirmHint':'manualConfirmHint')}</p>
   </section>}
  </fieldset>
  {!selected&&error&&<ErrorNotice message={error}/>}
 </form>;
}
export function PublicBooking({slug}:{slug:string}){const {t}=useCopy();const [venue,setVenue]=useState<PublicVenue|null>(null);return <div className="public-shell"><header className="public-header"><Brand href={`/r/${slug}`}/><LanguageSwitch/></header><main className="booking-layout"><div className="booking-intro"><span className="eyebrow accent">{t('book')}</span><h1>{venue?.name??t('bookTitle')}</h1><p>{t('bookIntro')}</p>{venue?.address&&<p className="small">{venue.address}</p>}<div className="table-art" aria-hidden="true"><i/><i/><div><span>✳</span></div><i/><i/></div><p className="demo-label">{t('localOnly')}</p></div><BookingForm slug={slug} onVenueLoaded={setVenue}/></main><footer className="public-footer">{t('brand')} <span>·</span> {t('tagline')}</footer></div>;}
