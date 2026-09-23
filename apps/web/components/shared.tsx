'use client';
import { createContext,useContext,useEffect,useId,useRef,useState,type ReactNode } from 'react';
import { uiMessages,type Language,type UiKey } from '@bigant/i18n';
const LanguageContext=createContext<{language:Language;setLanguage:(l:Language)=>void}>({language:'it',setLanguage:()=>{}});
export function LanguageProvider({children}:{children:ReactNode}){const [language,setLanguage]=useState<Language>('it');useEffect(()=>{document.documentElement.lang=language;},[language]);return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;}
export function useCopy(){const {language,setLanguage}=useContext(LanguageContext);return {language,setLanguage,t:(key:UiKey)=>uiMessages[language][key]};}
export function LanguageSwitch(){const {language,setLanguage,t}=useCopy();return <div className="language-switch" aria-label={t('language')}>{(['it','en'] as const).map(l=><button key={l} type="button" className={language===l?'selected':''} onClick={()=>setLanguage(l)} aria-pressed={language===l}>{t(l)}</button>)}</div>;}
export function Brand({compact=false,href='/'}:{compact?:boolean;href?:string}){const {t}=useCopy();return <a href={href} className="brand" aria-label={t('brand')}><span className="brand-mark" aria-hidden="true">b<span>•</span></span>{!compact&&<span>{t('brand')}</span>}</a>;}
export function ErrorNotice({message,onRetry}:{message:string;onRetry?:()=>void}){const {t}=useCopy();return <div className="notice error" role="alert"><span>{message}</span>{onRetry&&<button className="text-button" type="button" onClick={onRetry}>{t('retry')}</button>}</div>;}
export function Loading(){const {t}=useCopy();return <div className="loading" role="status"><span className="spinner"/>{t('loading')}</div>;}
export function Status({value}:{value:'pending'|'confirmed'|'seated'|'completed'|'cancelled'|'no_show'}){const {t}=useCopy();return <span className={`status status-${value}`}><span aria-hidden="true">•</span>{t(`status_${value}`)}</span>;}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const {t}=useCopy();const ref=useRef<HTMLDialogElement>(null);const headingId=useId();
 useEffect(()=>{
  const dialog=ref.current;const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  // Il dialog nativo rende inerte lo sfondo e gestisce anche i campi nei details chiusi.
  dialog?.showModal();
  return()=>{dialog?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
 return <dialog ref={ref} className="modal" aria-modal="true" aria-labelledby={headingId} onCancel={event=>{event.preventDefault();onClose();}}><div className="section-heading"><h2 id={headingId}>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label={t('close')}>×</button></div>{children}</dialog>;
}
