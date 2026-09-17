import process from 'node:process';
import { URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readFileSync,mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const url=process.argv[2]??'http://localhost:3000/r/trattoria-santa-lucia/menu';
const target=new URL(url);if(!['localhost','127.0.0.1'].includes(target.hostname))throw new Error('LOCAL_AUDIT_ONLY');
mkdirSync('test-results',{recursive:true});const output=resolve('test-results/menu-lighthouse.json');
// Profilo mobile: throttling applicato da Chrome (non proiezione Lantern),
// rete 750/250 Kbps, latenza 150 ms e CPU rallentata 4×.
execFileSync(process.execPath,['node_modules/lighthouse/cli/index.js',url,'--quiet','--only-categories=performance','--output=json',`--output-path=${output}`,'--chrome-flags=--headless --no-sandbox','--throttling-method=devtools','--throttling.requestLatencyMs=150','--throttling.downloadThroughputKbps=750','--throttling.uploadThroughputKbps=250','--throttling.cpuSlowdownMultiplier=4'],{stdio:'pipe',timeout:150000});
const report=JSON.parse(readFileSync(output,'utf8'));const score=Math.round(report.categories.performance.score*100);const lcp=report.audits['largest-contentful-paint'].numericValue;
process.stdout.write(`Lighthouse mobile: ${score}/100; LCP: ${Math.round(lcp)} ms. Report: ${output}\n`);
if(!Number.isFinite(score)||!Number.isFinite(lcp)||score<90||lcp>=2000)throw new Error(`MENU_PERFORMANCE_GATE_FAILED: ${score}/100; LCP ${Math.round(lcp)} ms`);
