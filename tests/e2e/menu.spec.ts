import { test,expect,chromium } from '@playwright/test';
import sharp from '../../apps/api/node_modules/sharp/lib/index.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
test('menu mobile: categoria, piatto con foto, quattro stili, lingua, esaurito e occhio',async({page,context,browser})=>{
 test.setTimeout(240000);
 await page.goto('/r/trattoria-santa-lucia/staff?view=menu');await expect(page.getByLabel('Email',{exact:true})).toHaveValue('owner@santalucia.test');await expect(page.getByRole('combobox',{name:'Locale',exact:true})).toHaveCount(0);await page.getByLabel('Password',{exact:true}).fill('bigant2026');await page.getByRole('button',{name:/Accedi al pannello/}).click();
 await expect(page.getByRole('heading',{name:'Il menu del tuo locale'})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Il menu del tuo locale'})).toBeVisible();await expect(page).toHaveURL(/\/r\/trattoria-santa-lucia\/staff\?view=menu$/);
 await page.getByRole('button',{name:'Tavoli',exact:false}).click();await expect(page.getByRole('heading',{name:'Tavoli e combinazioni.'})).toBeVisible();await page.goBack();await expect(page.getByRole('heading',{name:'Il menu del tuo locale'})).toBeVisible();
 await page.getByRole('button',{name:'Nuova categoria',exact:false}).click();let dialog=page.getByRole('dialog');await dialog.getByLabel('Nome in italiano').fill('Specialità browser');await dialog.getByLabel('Nome in inglese').fill('Browser specials');await dialog.getByRole('button',{name:'Salva modifiche'}).click();
 const category=page.locator('.menu-admin-category').filter({has:page.getByRole('heading',{name:'Specialità browser',exact:true})});await category.getByRole('button',{name:'Nuovo piatto',exact:false}).click();dialog=page.getByRole('dialog');
 await dialog.getByLabel('Nome in italiano').fill('Risotto agli agrumi');await dialog.getByLabel('Nome in inglese').fill('Citrus risotto');await dialog.getByLabel('Descrizione in italiano').fill('Riso, limone e un tocco di rosmarino.');await dialog.getByLabel('Descrizione in inglese').fill('Rice, lemon and a touch of rosemary.');await dialog.getByLabel('Prezzo (€)').fill('12,50');await dialog.getByLabel('Latte',{exact:true}).check();await dialog.getByLabel('Vegetariano',{exact:true}).check();await dialog.getByLabel('Metti in evidenza').check();
 const image=await sharp({create:{width:800,height:600,channels:3,background:'#a56330'}}).png().toBuffer();await dialog.getByLabel('Foto del piatto',{exact:true}).setInputFiles({name:'piatto.png',mimeType:'image/png',buffer:image});await dialog.getByRole('button',{name:'Salva modifiche'}).click();await expect(dialog).not.toBeVisible();
 await page.locator('.menu-appearance summary').click();const appearance=page.locator('.menu-appearance');await appearance.getByLabel('Immagine di copertina',{exact:true}).setInputFiles({name:'copertina.png',mimeType:'image/png',buffer:image});await appearance.getByRole('button',{name:'Salva modifiche'}).click();await expect(appearance.getByRole('status')).toContainText('Modifiche salvate');await appearance.getByLabel('Immagine di copertina',{exact:true}).setInputFiles([]);
 const guest=await context.newPage();await guest.addInitScript(()=>{Object.defineProperty(window.crypto,'subtle',{value:undefined});});await guest.goto('/r/trattoria-santa-lucia/menu');await expect(guest.getByRole('heading',{name:'Risotto agli agrumi',exact:true})).toBeVisible();const dish=guest.locator('.menu-dish').filter({hasText:'Risotto agli agrumi'});await expect(dish).toContainText('12,50');await expect(dish).toContainText('Latte');await expect(dish.locator('img')).toHaveAttribute('srcset',/320w.*640w.*960w/);expect(await dish.locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect(guest.locator('.menu-cover')).toHaveAttribute('srcset',/cover-320.*cover-640.*cover-768.*cover-960/);await expect(guest.getByRole('link',{name:'Allergeni',exact:true})).toHaveAttribute('href','#allergens');
 await guest.getByRole('link',{name:'EN',exact:true}).click();await expect(guest.getByRole('heading',{name:'Citrus risotto',exact:true})).toBeVisible();await expect(guest.getByText('Rice, lemon and a touch of rosemary.')).toBeVisible();await expect(guest.getByRole('heading',{name:'Risotto agli agrumi',exact:true})).toHaveCount(0);await guest.getByRole('link',{name:'IT',exact:true}).click();
 await mkdir('test-results/visual',{recursive:true});
 for(const [label,key] of [['Essenziale','essential'],['Pop','pop'],['Elegante','elegant'],['Pub','pub']] as const){await appearance.getByRole('radio',{name:new RegExp(label)}).check();await appearance.getByRole('button',{name:'Salva modifiche'}).click();await expect(appearance.getByRole('status')).toContainText('Modifiche salvate');await guest.reload();await expect(guest.locator('main')).toHaveClass(new RegExp(`menu-template-${key}`));await expect(guest.locator('main')).toBeVisible();expect(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await guest.screenshot({path:`test-results/visual/menu-${key}-375.png`,fullPage:false});}
 const staffDish=category.locator('.menu-admin-dish').filter({hasText:'Risotto agli agrumi'});await staffDish.getByRole('button',{name:'Risotto agli agrumi: Disponibile',exact:true}).click();await expect(staffDish.getByRole('button',{name:'Risotto agli agrumi: Al momento esaurito',exact:true})).toBeVisible();await guest.reload();await expect(dish).toHaveClass(/sold-out/);await expect(dish).toContainText('Al momento esaurito');
 const reading=guest.locator('[data-dish]').nth(10);const readingId=await reading.getAttribute('data-dish');await reading.evaluate(node=>window.scrollTo(0,window.scrollY+node.getBoundingClientRect().top-40));const readingTop=await reading.evaluate(node=>node.getBoundingClientRect().top);await guest.locator('body').evaluate(node=>{node.dataset.liveProbe='same-document';});
 await staffDish.getByRole('button',{name:'Nascondi dal menu Risotto agli agrumi',exact:true}).click();await expect(staffDish).toContainText('Nascosto dal pubblico');
 // Anche nella prova HTTP in LAN, senza SubtleCrypto, la pagina aggiorna
 // la visibilità e mantiene documento e punto di lettura.
 await guest.bringToFront();await expect(guest.getByRole('heading',{name:'Risotto agli agrumi',exact:true})).toHaveCount(0,{timeout:40000});
 await expect(guest.locator('body')).toHaveAttribute('data-live-probe','same-document');await expect.poll(async()=>Math.abs(await guest.locator(`[data-dish="${readingId}"]`).evaluate(node=>node.getBoundingClientRect().top)-readingTop)).toBeLessThan(3);
 const response=await guest.request.get('/api/public/trattoria-santa-lucia/menu');expect(response.status()).toBe(200);expect(await response.text()).not.toContain('Risotto agli agrumi');
 await staffDish.getByRole('button',{name:'Mostra nel menu Risotto agli agrumi',exact:true}).click();await expect(staffDish.getByRole('button',{name:'Nascondi dal menu Risotto agli agrumi',exact:true})).toBeVisible();await guest.reload();await expect(dish).toContainText('Al momento esaurito');
 await guest.goto('/r/lido-miseno/menu');await expect(guest.getByRole('link',{name:'Lido Miseno',exact:true})).toBeVisible();await expect(guest.getByRole('heading',{name:'Risotto agli agrumi',exact:true})).toHaveCount(0);
 const html=await (await guest.request.get('/r/trattoria-santa-lucia/menu')).text();await writeFile('test-results/menu-response.html',html);
 expect(html).not.toMatch(/<script[^>]+src="[^"]*\/_next\/static/);expect(html).not.toContain('self.__next_f');
 // Il QR deve mostrare piatti, foto e lingua anche senza JavaScript.
 const staticContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});
 try{const staticPage=await staticContext.newPage();await staticPage.goto(new URL('/r/trattoria-santa-lucia/menu',guest.url()).href);await expect(staticPage.getByRole('heading',{name:'Risotto agli agrumi',exact:true})).toBeVisible();await staticPage.getByRole('link',{name:'EN',exact:true}).click();await expect(staticPage.getByRole('heading',{name:'Citrus risotto',exact:true})).toBeVisible();await expect(staticPage.locator('html')).toHaveAttribute('lang','en');expect(await staticPage.locator('.menu-cover').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);}finally{await staticContext.close();}
 const audit=await promisify(execFile)(process.execPath,['scripts/menu-performance.mjs','http://localhost:3100/r/trattoria-santa-lucia/menu'],{timeout:160000,env:{...process.env,CHROME_PATH:process.env.CHROME_PATH??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':chromium.executablePath())}});expect(audit.stdout).toContain('Lighthouse mobile:');
 await guest.close();
});


test('menu live: una modifica tra API e HTML non blocca gli aggiornamenti successivi',async({context})=>{
 // L’API legge B mentre il documento è già C. Il menu viene poi riportato a B:
 // due snapshot API uguali devono comunque aggiornare un documento diverso.
 for(const withoutSubtle of [false,true]){
  const probe=await context.newPage();let htmlReads=0;
  if(withoutSubtle)await probe.addInitScript(()=>{Object.defineProperty(window.crypto,'subtle',{value:undefined});});
  const fingerprint=(value:string)=>createHash('sha256').update(JSON.stringify({value})).digest('hex');
  const documentFor=(value:string)=>`<!doctype html><html><body><main data-live-menu data-version="${fingerprint(value)}" data-menu-url="/api/public/trattoria-santa-lucia/menu?lang=it"><h1>${value}</h1><script src="/menu-live.js" defer></script></main></body></html>`;
  await probe.route('**/api/public/trattoria-santa-lucia/menu?lang=it',route=>route.fulfill({json:{value:'B'}}));
  await probe.route('**/r/trattoria-santa-lucia/menu',route=>route.fulfill({contentType:'text/html',body:documentFor(htmlReads++===0?'A':htmlReads===2?'C':'B')}));
  await probe.goto('/r/trattoria-santa-lucia/menu');await probe.bringToFront();
  await expect(probe.getByRole('heading',{name:'A',exact:true})).toBeVisible();
  await probe.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect(probe.getByRole('heading',{name:'C',exact:true})).toBeVisible();
  await probe.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect(probe.getByRole('heading',{name:'B',exact:true})).toBeVisible();
  await probe.close();
 }
});
