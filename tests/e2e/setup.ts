import { config } from 'dotenv';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { seedDemo,demos } from '../../packages/database/src/fixtures';
config({quiet:true});
export default async function setup(){
 const url=process.env.TEST_DATABASE_URL!;
 if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('DEDICATED_TEST_DATABASE_REQUIRED');
 execFileSync('pnpm',['db:migrate'],{env:{...process.env,DATABASE_URL:url},stdio:'pipe'});
 const db=new PrismaClient({datasourceUrl:url});
 try{
  await db.tenant.deleteMany({where:{slug:{in:demos.map(d=>d.slug)}}});
  const tenants=await seedDemo(db);
  // Copre anche il locale senza profilo Google, solo nel database E2E.
  await db.tenant.update({where:{id:tenants[1]!.id},data:{google_place_id:null}});
  // Scenario browser piccolo e deterministico, senza toccare il database demo.
  await db.notificationLog.deleteMany({where:{tenant_id:{in:tenants.map(t=>t.id)}}});
  await db.reservation.deleteMany({where:{tenant_id:{in:tenants.map(t=>t.id)}}});
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  await db.blackoutDate.create({data:{tenant_id:tenants[0]!.id,date:new Date(`${today}T00:00:00Z`),reason:'Chiusura scenario E2E'}});
 }finally{await db.$disconnect();}
 return async()=>{const cleanup=new PrismaClient({datasourceUrl:url});try{await cleanup.tenant.deleteMany({where:{slug:{in:demos.map(d=>d.slug)}}});}finally{await cleanup.$disconnect();}};
}
