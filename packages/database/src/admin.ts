import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const db=new PrismaClient({log:[]});
try{
 const demo=process.argv.includes('--demo');
 const url=new URL(process.env.DATABASE_URL??'');
 if(demo&&(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw new Error('DEMO_ADMIN_LOCAL_ONLY');
 const email=demo?'admin@bigant.test':process.env.BIGANT_ADMIN_EMAIL?.trim().toLowerCase();
 const full_name=demo?'Amministratore BigAnt':process.env.BIGANT_ADMIN_NAME?.trim();
 const password=demo?randomBytes(24).toString('base64url'):process.env.BIGANT_ADMIN_PASSWORD;
 if(!email||!/^\S+@\S+\.\S+$/.test(email)||!full_name||!password||password.length<12||password.length>128)throw new Error('SET_BIGANT_ADMIN_EMAIL_NAME_PASSWORD_MIN_12');
 if(await db.platformAdmin.findUnique({where:{email}})){
  process.stdout.write('Amministratore già presente: credenziali e sessioni mantenute.\n');
 }else{
  const password_hash=await argon2.hash(password,{type:argon2.argon2id});
  const file=resolve('.local/admin-access.txt');
  // Salva prima della transazione: non creare account locali di cui si perde la password.
  if(demo){await mkdir(resolve('.local'),{recursive:true});await writeFile(file,`Console: http://localhost:3000/admin\nEmail: ${email}\nPassword: ${password}\n`,{mode:0o600,flag:'wx'});}
  await db.$transaction(async tx=>{
   const a=await tx.platformAdmin.create({data:{email,full_name,password_hash}});
   await tx.platformAudit.create({data:{admin_id:a.id,action:'admin.created',metadata:{source:demo?'local-demo':'operator'}}});
  });
  process.stdout.write(demo?`Accesso locale creato. Credenziali in ${file}\n`:'Amministratore creato.\n');
 }
}catch(error){process.stderr.write(error instanceof Error&&/^([A-Z_0-9]+)$/.test(error.message)?`${error.message}\n`:'Creazione non riuscita. Verifica configurazione, migrazioni e duplicati.\n');process.exitCode=1;}
finally{delete process.env.BIGANT_ADMIN_PASSWORD;await db.$disconnect();}
