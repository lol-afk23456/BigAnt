import { config } from 'dotenv';
config({path:new URL('../../../.env',import.meta.url),quiet:true});
import { disconnectDatabase } from '@bigant/database';
import { notificationRuntime } from './notifications/config.js';
import { workerTick } from './notifications/worker.js';
const runtime=notificationRuntime();
let running=false;
async function tick(){if(running)return;running=true;try{await workerTick(runtime);}catch{process.stderr.write('WORKER_TICK_FAILED\n');process.exitCode=1;}finally{running=false;}}
await tick();
if(process.argv.includes('--watch')){
 const timer=setInterval(()=>{void tick();},5*60000);
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(timer);void disconnectDatabase();});
}else await disconnectDatabase();
