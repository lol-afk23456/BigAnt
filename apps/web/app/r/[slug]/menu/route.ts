import { slugParam,type PublicMenu } from '@bigant/types';
import type { Language } from '@bigant/i18n';
import { renderMenuDocument } from '../../../../lib/menu-document';

export const dynamic='force-dynamic';
export const runtime='nodejs';

// Il menu è già completo lato server. L'HTML non richiede React nel browser:
// menu-live.js conserva gli aggiornamenti e i collegamenti restano nativi.
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const requested=new URL(request.url).searchParams.get('lang');
 let language:Language=requested==='en'?'en':'it';let menu:PublicMenu|null=null;let status=503;
 if(slugParam.safeParse({slug}).success){
  try{
   const response=await fetch(`${process.env.API_INTERNAL_URL??'http://127.0.0.1:3001'}/public/${slug}/menu${requested==='en'||requested==='it'?`?lang=${requested}`:''}`,{cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(response.ok){menu=await response.json() as PublicMenu;language=menu.language;status=200;}
   else if(response.status===404)status=404;
  }catch{/* L'errore resta tradotto e recuperabile, senza dettagli del server. */}
 }else status=404;
 const html=renderMenuDocument({slug,language,menu});
 return new Response(html,{status,headers:{'Content-Type':'text/html; charset=utf-8','Content-Language':language,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
