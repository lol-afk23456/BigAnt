'use client';
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
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
 const {t}=useCopy();
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const dialog=document.querySelector<HTMLDialogElement>('dialog[open]');const first=dialog?.querySelector<HTMLElement>('button,input,select,textarea');first?.focus();return()=>previous?.focus();},[]);
 return <div className="modal-backdrop" onKeyDown={event=>{if(event.key==='Escape')onClose();if(event.key==='Tab'){const focusable=event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select,textarea,a[href]');const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}}><dialog open className="modal" aria-modal="true" aria-label={title}><div className="section-heading"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label={t('close')}>×</button></div>{children}</dialog></div>;
}
