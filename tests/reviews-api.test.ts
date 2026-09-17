import { beforeAll,beforeEach,afterEach,afterAll,expect,test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { admin,fixtures,secret } from './helpers';
import { buildApp } from '../apps/api/src/app';
import { disconnectDatabase } from '../packages/database/src/index';
import { feedbackRetrySeconds,googleReviewUrl } from '../packages/core/src/reviews';
import type { FeedbackOptions,ReviewReceipt,ReviewList,ReviewSummary,CardRecord } from '../packages/types/src/index';
let app:ReturnType<typeof buildApp>;let hash:string;let ids:string[];let slugs:string[];let tokens:string[];let clock:Date;
beforeAll(async()=>{await fixtures();hash=(await admin.staffUser.findFirstOrThrow({where:{email:'owner@santalucia.test'}})).password_hash;});
beforeEach(async()=>{clock=new Date('2026-09-17T12:00:00Z');app=buildApp({secret,now:()=>clock});ids=[];slugs=[];tokens=[];
 for(let n=0;n<2;n++){const slug=`reviews-${randomUUID()}`;const row=await admin.tenant.create({data:{slug,name:`Locale recensioni ${n}`,type:'restaurant',google_place_id:n===0?'ChIJ-test-place':null,tenantSettings:{create:{}},staffUser:{create:{email:'reviews@example.test',password_hash:hash,full_name:'Staff recensioni',role:n===0?'owner':'staff'}}}});ids.push(row.id);slugs.push(slug);
  const login=await app.inject({method:'POST',url:'/auth/login',payload:{slug,email:'reviews@example.test',password:'bigant2026'}});expect(login.statusCode).toBe(200);tokens.push(login.json().access_token);
 }
});
afterEach(async()=>{await app.close();await admin.review.deleteMany({where:{tenant_id:{in:ids}}});await admin.tenant.deleteMany({where:{id:{in:ids}}});});
afterAll(async()=>{await admin.$disconnect();await disconnectDatabase();});
const headers=(n=0)=>({authorization:`Bearer ${tokens[n]}`});
const publicPath=(n=0)=>`/public/${slugs[n]}`;
async function card(){const response=await app.inject({method:'POST',url:'/nfc-cards',headers:headers(),payload:{label:'Cassa'}});expect(response.statusCode).toBe(201);return response.json<CardRecord>();}
test('nessun voto prima delle opzioni o sul canale Google; Google assente se Place ID nullo',async()=>{
 const tagged=await card();const options=await app.inject({url:publicPath()+`/feedback?card=${tagged.card_uid}`});expect(options.statusCode).toBe(200);expect(options.json<FeedbackOptions>()).toMatchObject({google_available:true,card_uid:tagged.card_uid,card_label:'Cassa'});expect(options.body).not.toMatch(/rating|comment|staff_response/);
 for(const property of ['rating','routed_public','review_positive_threshold']){
  expect((await app.inject({url:publicPath()+`/feedback?${property}=5`})).statusCode).toBe(400);
  expect((await app.inject({method:'POST',url:publicPath()+'/reviews',payload:{channel:'google_redirect',[property]:5}})).statusCode).toBe(400);
 }
 expect((await app.inject({url:publicPath(1)+'/feedback'})).json<FeedbackOptions>().google_available).toBe(false);
 expect((await app.inject({method:'POST',url:publicPath(1)+'/reviews',payload:{channel:'google_redirect'}})).statusCode).toBe(404);
 expect(await admin.review.count({where:{tenant_id:{in:ids}}})).toBe(0);
 expect(googleReviewUrl('x&rating=5')).toBe('https://search.google.com/local/writereview?placeid=x%26rating%3D5');
});
test('feedback anonimi di ogni voto segnalati, nota solo interna e lettura idempotente',async()=>{
 for(const rating of [1,5]){const result=await app.inject({method:'POST',url:publicPath()+'/reviews',payload:{channel:'private',rating,comment:`Messaggio ${rating}`}});expect(result.statusCode).toBe(201);}
 const redirect=await app.inject({method:'POST',url:publicPath()+'/reviews',payload:{channel:'google_redirect'}});expect(redirect.statusCode).toBe(201);expect(redirect.json<ReviewReceipt>().redirect_url).toBe(googleReviewUrl('ChIJ-test-place'));
 const rows=(await app.inject({url:'/reviews',headers:headers()})).json<ReviewList>().items;expect(rows).toHaveLength(3);const google=rows.find(row=>row.channel==='google_redirect')!;expect(google).toMatchObject({rating:null,comment:null});
 const row=rows.find(row=>row.rating===5)!;const original=(await app.inject({method:'PATCH',url:`/reviews/${row.id}`,headers:headers(),payload:{seen:true,staff_response:'Nota riservata'}})).json();clock=new Date(clock.getTime()+60000);
 const repeat=(await app.inject({method:'PATCH',url:`/reviews/${row.id}`,headers:headers(),payload:{seen:true}})).json();expect(repeat.staff_seen_at).toBe(original.staff_seen_at);expect(repeat.staff_response).toBe('Nota riservata');
 expect((await app.inject({url:'/reviews/summary',headers:headers()})).json<ReviewSummary>()).toEqual({unseen_private:1,unseen_low:1,private_total:2,google_redirects:1});
 expect((await app.inject({url:'/reviews?channel=private&seen=true&rating=5',headers:headers()})).json<ReviewList>().items).toHaveLength(1);
 const options=await app.inject({url:publicPath()+'/feedback'});expect(options.body).not.toContain('Nota riservata');expect(options.body).not.toContain('Messaggio');
 expect((await admin.review.findUniqueOrThrow({where:{id:row.id}})).customer_id).toBeNull();
});
test('card sconosciuta, di altro locale o disattiva non accede né invia; aperture misurate',async()=>{
 const tagged=await card();expect(tagged.card_uid).toMatch(/^[a-f0-9]{64}$/);
 expect((await app.inject({url:publicPath()+`/feedback?card=${tagged.card_uid}`})).statusCode).toBe(200);
 expect((await admin.nFCCard.findUniqueOrThrow({where:{id:tagged.id}})).tap_count).toBe(1);
 for(const n of [0,1]){const uid=n===0?'unknown-card':tagged.card_uid;expect((await app.inject({url:publicPath(n)+`/feedback?card=${uid}`})).statusCode).toBe(404);expect((await app.inject({method:'POST',url:publicPath(n)+'/reviews',payload:{channel:'private',card_uid:uid,rating:3}})).statusCode).toBe(404);}
 expect((await app.inject({method:'PATCH',url:`/nfc-cards/${tagged.id}`,headers:headers(),payload:{active:false,label:'Ingresso'}})).statusCode).toBe(200);
 expect((await app.inject({url:publicPath()+`/feedback?card=${tagged.card_uid}`})).statusCode).toBe(404);
 expect((await app.inject({method:'POST',url:publicPath()+'/reviews',payload:{channel:'google_redirect',card_uid:tagged.card_uid}})).statusCode).toBe(404);
 expect((await app.inject({method:'PATCH',url:`/nfc-cards/${tagged.id}`,headers:headers(),payload:{active:true}})).json<CardRecord>().card_uid).toBe(tagged.card_uid);
 expect(await admin.auditLog.count({where:{tenant_id:ids[0],action:'nfc.card.update'}})).toBe(2);
});
test('20 invii paralleli sulla stessa card: uno solo; cooldown persiste al riavvio e scade al bordo',async()=>{
 const tagged=await card();const results=await Promise.all(Array.from({length:20},(_,index)=>app.inject({method:'POST',url:publicPath()+'/reviews',remoteAddress:`192.0.2.${index+1}`,payload:{channel:index%2?'private':'google_redirect',card_uid:tagged.card_uid,...(index%2?{rating:5}:{})}})));
 expect(results.filter(result=>result.statusCode===201)).toHaveLength(1);expect(results.filter(result=>result.statusCode===429)).toHaveLength(19);expect(results.find(result=>result.statusCode===429)?.headers['retry-after']).toBe('600');
 expect(await admin.review.count({where:{nfc_card_id:tagged.id}})).toBe(1);
 await app.close();app=buildApp({secret,now:()=>clock});clock=new Date(clock.getTime()+599999);
 const blocked=await app.inject({method:'POST',url:publicPath()+'/reviews',payload:{channel:'private',card_uid:tagged.card_uid,rating:1}});expect(blocked.statusCode).toBe(429);expect(blocked.headers['retry-after']).toBe('1');
 clock=new Date(clock.getTime()+1);expect((await app.inject({method:'POST',url:publicPath()+'/reviews',payload:{channel:'private',card_uid:tagged.card_uid,rating:1}})).statusCode).toBe(201);
 expect(feedbackRetrySeconds(null,clock)).toBe(0);expect(feedbackRetrySeconds(new Date(clock.getTime()-600001),clock)).toBe(0);
});
test('rate limit IP indipendente dalle card, validazione voto e assenza di recapiti',async()=>{
 for(const payload of [{channel:'private',rating:0},{channel:'private',rating:6},{channel:'private',rating:1.5},{channel:'private',rating:3,email:'ospite@example.test'},{channel:'private',rating:3,comment:'a'.repeat(2001)}])expect((await app.inject({method:'POST',url:publicPath()+'/reviews',remoteAddress:'192.0.2.30',payload})).statusCode).toBe(400);
 for(let n=0;n<5;n++)expect((await app.inject({method:'POST',url:publicPath()+'/reviews',remoteAddress:'192.0.2.31',payload:{channel:'private',rating:3}})).statusCode).toBe(201);
 expect((await app.inject({method:'POST',url:publicPath()+'/reviews',remoteAddress:'192.0.2.31',payload:{channel:'private',rating:3}})).statusCode).toBe(429);
});
test('isolamento sulle route reali, ruoli card e proprietà vietate',async()=>{
 const tagged=await card();const result=await app.inject({method:'POST',url:publicPath()+'/reviews',payload:{channel:'private',rating:2}});const id=result.json<ReviewReceipt>().id;
 for(const url of ['/reviews','/reviews/summary','/nfc-cards'])expect((await app.inject({url})).statusCode).toBe(401);
 expect((await app.inject({url:'/reviews',headers:headers(1)})).body).not.toContain(id);expect((await app.inject({url:'/nfc-cards',headers:headers(1)})).body).not.toContain(tagged.id);expect((await app.inject({url:'/reviews/summary',headers:headers(1)})).json<ReviewSummary>().unseen_private).toBe(0);
 expect((await app.inject({method:'PATCH',url:`/reviews/${id}`,headers:headers(1),payload:{seen:true}})).statusCode).toBe(404);
 for(const url of ['/nfc-cards',`/nfc-cards/${tagged.id}`])expect((await app.inject({method:url==='/nfc-cards'?'POST':'PATCH',url,headers:headers(1),payload:{label:'Attacco'}})).statusCode).toBe(403);
 for(const payload of [{rating:5},{channel:'google_redirect'},{tenant_id:ids[1]},{seen:false}])expect((await app.inject({method:'PATCH',url:`/reviews/${id}`,headers:headers(),payload})).statusCode).toBe(400);
 expect((await app.inject({method:'PATCH',url:`/nfc-cards/${tagged.id}`,headers:headers(),payload:{card_uid:'changed'}})).statusCode).toBe(400);
 await admin.staffUser.updateMany({where:{tenant_id:ids[1]},data:{role:'owner'}});const own=await app.inject({method:'POST',url:'/auth/login',payload:{slug:slugs[1],email:'reviews@example.test',password:'bigant2026'}});
 expect((await app.inject({method:'PATCH',url:`/nfc-cards/${tagged.id}`,headers:{authorization:`Bearer ${own.json().access_token}`},payload:{active:false}})).statusCode).toBe(404);
});
test('paginazione confinata al tenant e filtro validato, senza esporre dati extra',async()=>{
 await admin.review.createMany({data:Array.from({length:51},(_,index)=>({tenant_id:ids[0]!,channel:'private' as const,rating:3,comment:`Riga ${index}`,created_at:new Date(clock.getTime()+index)}))});
 const first=(await app.inject({url:'/reviews',headers:headers()})).json<ReviewList>();expect(first.items).toHaveLength(50);expect(first.next_cursor).toBeTruthy();
 const second=(await app.inject({url:`/reviews?cursor=${first.next_cursor}`,headers:headers()})).json<ReviewList>();expect(second.items).toHaveLength(1);expect(second.next_cursor).toBeNull();expect(first.items.map(row=>row.id)).not.toContain(second.items[0]!.id);
 expect((await app.inject({url:`/reviews?cursor=${first.next_cursor}`,headers:headers(1)})).statusCode).toBe(404);expect((await app.inject({url:'/reviews?customer_id=anything',headers:headers()})).statusCode).toBe(400);
 expect(JSON.stringify(first)).not.toMatch(/tenant_id|customer_id|phone|email/);
});
