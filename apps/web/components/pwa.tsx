'use client';
import { useEffect,useState } from 'react';
import { staffApi } from '../lib/api';
import { useCopy,ErrorNotice } from './shared';
interface InstallPrompt extends Event {prompt():Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}
export function PwaTools({slug}:{slug:string}) {
 const {t,language}=useCopy();const [install,setInstall]=useState<InstallPrompt|null>(null),[key,setKey]=useState<string|null>(null),[active,setActive]=useState(false),[supported,setSupported]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true;const canPush='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;setSupported(canPush);const manifest=document.createElement('link');manifest.rel='manifest';manifest.href=`/r/${slug}/manifest`;document.head.append(manifest);
  const prompt=(event:Event)=>{event.preventDefault();setInstall(event as InstallPrompt);};window.addEventListener('beforeinstallprompt',prompt);
  if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:`/r/${slug}/`}).then(async registration=>{if(!canPush)return;const subscription=await registration.pushManager.getSubscription();if(subscription){const status=await staffApi<{active:boolean}>('/push/subscriptions/status',{method:'POST',body:JSON.stringify({endpoint:subscription.endpoint})});if(!status.active)await subscription.unsubscribe();if(alive)setActive(status.active);}else if(alive)setActive(false);}).catch(()=>{if(alive)setError(t('network'));});}
  staffApi<{enabled:boolean;public_key:string|null}>('/push/config').then(v=>{if(alive)setKey(v.enabled?v.public_key:null);}).catch(e=>{if(alive)setError((e as Error).message);});
  return()=>{alive=false;manifest.remove();window.removeEventListener('beforeinstallprompt',prompt);};
 },[slug,language]);
 async function toggle(){
  setBusy(true);setError('');
  try{
   if(!supported)throw new Error(t('pushUnsupported'));
   const registration=await navigator.serviceWorker.getRegistration(`/r/${slug}/`);if(!registration)throw new Error(t('pushUnavailable'));
   const current=await registration.pushManager.getSubscription();
   if(current){await staffApi('/push/subscriptions',{method:'DELETE',body:JSON.stringify({endpoint:current.endpoint})});await current.unsubscribe();setActive(false);return;}
   if(!key)throw new Error(t('pushUnavailable'));
   const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error(t('pushDenied'));
   const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(atob(key.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))});
   try{const data=subscription.toJSON();await staffApi('/push/subscriptions',{method:'POST',body:JSON.stringify({endpoint:data.endpoint,keys:data.keys})});setActive(true);}catch(e){await subscription.unsubscribe();throw e;}
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="panel settings-section"><h2>{t('installTitle')}</h2><p className="muted">{t('installHint')}</p>{install&&<button className="button secondary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await install.prompt();await install.userChoice;setInstall(null);}catch{setError(t('network'));}finally{setBusy(false);}}}>{t('installApp')}</button>}<p className="muted small">{t(active?'pushReady':!supported?'pushUnsupported':key?'pushSupported':'pushUnavailable')}</p>{supported&&(key||active)&&<button className="button secondary" disabled={busy} onClick={()=>{void toggle();}}>{t(active?'disablePush':'enablePush')}</button>}{error&&<ErrorNotice message={error}/>}</section>;
}
