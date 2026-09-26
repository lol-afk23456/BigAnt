import process from 'node:process';
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

// Confronto diagnostico temporaneo: nessuna modifica ai contenuti o alle soglie.
const server=createServer((_request,response)=>{
 response.writeHead(200,{'Content-Type':'text/html'});
 response.end('<!doctype html><html lang="it"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Controllo rendering</title><style>body{font:24px Arial;background:#fff;color:#111}</style><h1>Controllo rendering</h1><p>Pagina statica senza immagini o script.</p></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const shell=process.env.CHROME_PATH?.replace(/chromium-(\d+)\/chrome-linux64\/chrome$/,'chromium_headless_shell-$1/chrome-headless-shell-linux64/chrome-headless-shell');
try{
 for(const [name,url,flags,chrome] of [
  ['control',`http://127.0.0.1:${server.address().port}/`,'',process.env.CHROME_PATH],
  ['automation',process.argv[2],' --enable-automation',process.env.CHROME_PATH],
  ...(shell&&existsSync(shell)?[['shell',process.argv[2],'',shell]]:[]),
 ]){
  const output=resolve(`test-results/menu-lighthouse-probe-${name}.json`);
  await promisify(execFile)(process.execPath,['node_modules/lighthouse/cli/index.js',url,'--quiet','--only-categories=performance','--output=json',`--output-path=${output}`,'--save-assets',`--chrome-flags=--headless --no-sandbox${flags}`,'--throttling-method=devtools','--throttling.requestLatencyMs=150','--throttling.downloadThroughputKbps=750','--throttling.uploadThroughputKbps=250','--throttling.cpuSlowdownMultiplier=4'],{env:{...process.env,CHROME_PATH:chrome},timeout:55000});
  const report=JSON.parse(readFileSync(output,'utf8'));
  process.stdout.write(`${name}: ${report.categories.performance.score*100}/100, LCP ${report.audits['largest-contentful-paint'].numericValue} ms\n`);
 }
}finally{server.close();}
