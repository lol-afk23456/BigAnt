'use client';
import { useEffect,useState,type FormEvent } from 'react';
import { feedbackQuery,publicReviewInput,type FeedbackOptions,type ReviewReceipt } from '@bigant/types';
import { api,ApiError } from '../lib/api';
import { Brand,LanguageSwitch,Loading,ErrorNotice,useCopy } from './shared';
export function PublicFeedback({slug}:{slug:string}){
 const {t}=useCopy();const [options,setOptions]=useState<FeedbackOptions|null>(null),[error,setError]=useState(''),[unavailable,setUnavailable]=useState(false),[revision,setRevision]=useState(0),[privateForm,setPrivateForm]=useState(false),[rating,setRating]=useState<number|null>(null),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[receipt,setReceipt]=useState<ReviewReceipt|null>(null),[shareUrl,setShareUrl]=useState(''),[copyState,setCopyState]=useState<'copied'|'error'|null>(null);
 useEffect(()=>{let alive=true;setError('');setUnavailable(false);
  const values=Object.fromEntries(new URLSearchParams(location.search));const parsed=feedbackQuery.safeParse(values);
  if(!parsed.success){setUnavailable(true);return;}
  const query=parsed.data.card?`?card=${encodeURIComponent(parsed.data.card)}`:'';setShareUrl(location.origin+`/r/${slug}/feedback`+query);
  api<FeedbackOptions>(`/public/${slug}/feedback${query}`).then(value=>{if(alive)setOptions(value);}).catch(reason=>{if(alive){if(reason instanceof ApiError&&reason.status===404)setUnavailable(true);else setError((reason as Error).message);}});
  return()=>{alive=false;};
 },[slug,revision]);
 async function send(channel:'private'|'google_redirect',event?:FormEvent){
  event?.preventDefault();const data=publicReviewInput.safeParse({channel,...(options?.card_uid?{card_uid:options.card_uid}:{}),...(channel==='private'?{rating,comment}:{})});
  if(!data.success){setError(t('invalidForm'));return;}setBusy(true);setError('');
  try{const result=await api<ReviewReceipt>(`/public/${slug}/reviews`,{method:'POST',body:JSON.stringify(data.data)});setReceipt(result);
   if(result.channel==='google_redirect'&&!result.google_demo&&result.redirect_url){const url=new URL(result.redirect_url);if(url.origin==='https://search.google.com'&&url.pathname==='/local/writereview')location.assign(url.href);}
  }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }
 async function copy(){try{await navigator.clipboard.writeText(shareUrl);setCopyState('copied');}catch{setCopyState('error');}}
 return <div className="public-shell"><header className="public-header"><Brand href={`/r/${slug}`}/><LanguageSwitch/></header><main className="feedback-shell">
  {unavailable?<section className="panel feedback-error"><p>{t('feedbackUnavailable')}</p><a className="button secondary" href={`/r/${slug}`}>{t('backVenue')}</a></section>:!options?error?<ErrorNotice message={error} onRetry={()=>setRevision(r=>r+1)}/>:<Loading/>:<>
   <div className="feedback-intro"><span className="eyebrow accent">{options.tenant.name}</span><h1>{t('feedbackTitle')}</h1><p className="muted">{t('feedbackHint')}</p></div>
   <div className={`feedback-options${options.google_available?'':' feedback-single'}`} aria-busy={busy}>
    {options.google_available&&<button className="panel feedback-option" type="button" disabled={busy||!!receipt} onClick={()=>void send('google_redirect')}><span aria-hidden="true">↗</span><strong>{t('googleOption')}</strong></button>}
    <button className="panel feedback-option" type="button" disabled={busy||!!receipt} aria-expanded={privateForm} onClick={()=>{setPrivateForm(true);setError('');}}><span aria-hidden="true">✉</span><strong>{t('privateOption')}</strong></button>
   </div>
   {options.google_demo&&<p className="small muted feedback-demo">{t('googleDemoNotice')}</p>}
   {error&&<ErrorNotice message={error}/>}
   {receipt?<section className="panel feedback-result" role="status"><span className="success-icon" aria-hidden="true">✓</span><h2>{t(receipt.channel==='private'?'feedbackThanks':receipt.google_demo?'googleDemoTitle':'googleOpeningTitle')}</h2><p>{t(receipt.channel==='private'?'feedbackReceived':receipt.google_demo?'googleDemoHint':'googleOpeningHint')}</p>{receipt.channel==='google_redirect'&&!receipt.google_demo&&receipt.redirect_url&&<a className="button secondary" href={receipt.redirect_url}>{t('googleOption')} ↗</a>}<a className="button secondary" href={`/r/${slug}`}>{t('backVenue')}</a></section>:privateForm&&<form className="panel feedback-form reveal" onSubmit={event=>void send('private',event)}><h2>{t('privateTitle')}</h2><p className="muted">{t('privateHint')}</p><fieldset><legend>{t('feedbackRating')}</legend><div className="feedback-rating">{[1,2,3,4,5].map(value=><label key={value} className={rating===value?'selected':''}><input type="radio" name="rating" value={value} required checked={rating===value} onChange={()=>setRating(value)} aria-label={`${t('ratingChoice')} ${value}`}/><span>{value}</span></label>)}</div></fieldset><label>{t('feedbackComment')}<textarea value={comment} onChange={event=>setComment(event.target.value)} maxLength={2000} rows={4}/></label><p className="small muted">{t('feedbackPrivacyHint')}</p><button className="button primary wide" type="submit" disabled={busy}>{t(busy?'saving':'sendFeedback')} →</button></form>}
   <footer className="feedback-later"><p>{t('feedbackLater')}</p><button className="text-button" type="button" onClick={()=>void copy()}>{t('copyFeedbackLink')}</button><p role="status" className="small muted">{copyState&&t(copyState==='copied'?'linkCopied':'copyLinkError')}</p>{copyState==='error'&&<input aria-label={t('cardLink')} readOnly value={shareUrl} onFocus={event=>event.target.select()}/>}</footer>
  </>}
 </main></div>;
}
