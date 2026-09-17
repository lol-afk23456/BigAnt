import { slugParam } from '@bigant/types';
import { uiMessages } from '@bigant/i18n';
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}) {
 const data=slugParam.safeParse(await params);if(!data.success)return new Response(null,{status:404});
 const {slug}=data.data;const base=`/r/${slug}`;
 const response=await fetch(`${process.env.API_INTERNAL_URL??'http://127.0.0.1:3001'}/public/${slug}`,{cache:'no-store'});
 if(!response.ok)return new Response(null,{status:404});
 const venue=await response.json() as {name:string};
 return Response.json({id:`${base}/staff`,name:`${uiMessages.it.brand} · ${venue.name}`,short_name:venue.name,start_url:`${base}/staff?view=reservations`,scope:`${base}/`,display:'standalone',background_color:'#101112',theme_color:'#ff914d',icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},{headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-store'}});
}
