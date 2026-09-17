import { createHash } from 'node:crypto';
import { existsSync,readdirSync,readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
const stamp='.local/build-state';
const ignored=new Set(['node_modules','.next','dist','.turbo']);
function fingerprint(){
 const hash=createHash('sha256');
 function scan(path){for(const entry of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(ignored.has(entry.name)||entry.name.endsWith('.tsbuildinfo'))continue;const file=join(path,entry.name);if(entry.isDirectory())scan(file);else if(entry.isFile())hash.update(file).update(readFileSync(file));}}
 scan('apps');scan('packages');
 for(const file of ['pnpm-lock.yaml','tsconfig.json','turbo.json'])hash.update(file).update(readFileSync(file));
 hash.update(process.versions.node).update(process.env.API_INTERNAL_URL??'http://127.0.0.1:3001');
 return hash.digest('hex');
}
export function buildIsCurrent(){return existsSync('apps/web/.next/BUILD_ID')&&existsSync('apps/api/dist/server.js')&&existsSync('apps/api/dist/worker.js')&&existsSync(stamp)&&readFileSync(stamp,'utf8')===fingerprint();}
if(process.argv.includes('--record')){mkdirSync('.local',{recursive:true});writeFileSync(stamp,fingerprint());}
