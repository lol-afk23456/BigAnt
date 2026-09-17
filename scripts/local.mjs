import process from 'node:process';
import { URL } from 'node:url';
import { setTimeout } from 'node:timers';
import { spawn } from 'node:child_process';
import { existsSync,writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createConnection } from 'node:net';
import { config } from 'dotenv';
import { buildIsCurrent } from './build-state.mjs';
if(Number(process.versions.node.split('.')[0])!==22)throw new Error('Usa Node 22: nvm install && nvm use.');
if(!existsSync('.env'))writeFileSync('.env',`DATABASE_URL=postgresql://bigant:bigant_local@127.0.0.1:55432/bigant?schema=public\nTEST_DATABASE_URL=postgresql://bigant:bigant_local@127.0.0.1:55432/bigant_test?schema=public\nJWT_SECRET=${randomBytes(48).toString('hex')}\nHOST=127.0.0.1\nPORT=3001\nNEXT_TELEMETRY_DISABLED=1\nTURBO_TELEMETRY_DISABLED=1\n`,{mode:0o600});
config({quiet:true});
const dbUrl=new URL(process.env.DATABASE_URL);
if(!['127.0.0.1','localhost'].includes(dbUrl.hostname)||dbUrl.port!=='55432')throw new Error('Il launcher demo richiede PostgreSQL locale sulla porta 55432.');
process.env.HOST='127.0.0.1';process.env.PORT='3001';process.env.API_INTERNAL_URL='http://127.0.0.1:3001';
const children=new Set();let closing=false;
function stop(code=0){if(closing)return;closing=true;for(const child of children){if(child.pid)try{process.kill(-child.pid,'SIGTERM');}catch{/* Il processo può essersi già chiuso. */}}process.exitCode=code;}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop());
function run(command,args,long=false){return new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:'inherit',env:process.env,detached:true});children.add(child);child.on('error',error=>{children.delete(child);reject(error);});child.on('exit',code=>{children.delete(child);if(closing)return resolve();if(code!==0||long){stop(code||1);reject(new Error(`Avvio interrotto: ${command} (codice ${code}).`));}else resolve();});});}
function listening(port){return new Promise(resolve=>{const socket=createConnection({port,host:'127.0.0.1'});socket.setTimeout(500);socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false);});});}
try{
 for(const port of [3000,3001])if(await listening(port))throw new Error(`Porta ${port} già occupata: chiudi la precedente sessione BigAnt.`);
 if(!await listening(55432)){
  void run(process.execPath,['scripts/local-db.mjs'],true).catch(error=>{process.stderr.write(`${error.message}\n`);stop(1);});
  let ready=false;for(let n=0;n<60&&!closing;n++){if(await listening(55432)){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,500));}
  if(!ready)throw new Error('PostgreSQL locale non risponde.');
 }
 await run('pnpm',['generate']);await run('pnpm',['db:migrate']);await run('pnpm',['seed']);if(!buildIsCurrent())await run('pnpm',['build']);else process.stdout.write('Build verificata invariata: riutilizzo gli artefatti locali.\n');
 if(!closing){
  process.stdout.write('\nBigAnt Book → http://localhost:3000\nLascia questa finestra aperta. Ctrl+C ferma le app. I dati restano sul Mac.\n\n');
  await Promise.all([run(process.execPath,['apps/api/dist/server.js'],true),run(process.execPath,['apps/api/dist/worker.js','--watch'],true),run('pnpm',['--filter','@bigant/web','start','--port','3000','--hostname','127.0.0.1'],true)]);
 }
}catch(error){process.stderr.write(`${error.message}\n`);stop(1);}
