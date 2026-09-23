import { expect,test,type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const plusDay=(days:number)=>{const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
async function pickDay(page:Page,days:number){await page.locator('#booking-date').fill(plusDay(days));await expect(page.locator('.slot').first()).toBeVisible();await page.locator('.slot').first().click();}
async function contacts(page:Page,name:string){await page.getByLabel('Nome e cognome').fill(name);await page.getByLabel('Email',{exact:true}).fill('browser@example.test');await page.getByLabel('Telefono',{exact:true}).fill('3331234567');if(await page.getByRole('checkbox',{name:'Ho letto l’informativa privacy per la prenotazione.'}).count()){await expect(page.getByRole('checkbox',{name:'Desidero ricevere comunicazioni promozionali dal locale (facoltativo).'})).not.toBeChecked();await page.getByRole('checkbox',{name:'Ho letto l’informativa privacy per la prenotazione.'}).check();}await page.getByRole('button',{name:/^(Prenota il tavolo|Invia la richiesta)/}).click();}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
test('ospite a 375px: campi progressivi, salto del giorno chiuso, alternative e disdetta',async({page})=>{
 await page.goto('/r/trattoria-santa-lucia/prenota');
 await expect(page.getByText('Per oggi non troviamo un orario online. Abbiamo selezionato il primo giorno disponibile per voi.')).toBeVisible();
 await expect(page.locator('#booking-date')).toHaveValue(plusDay(1));
 await expect(page.getByRole('heading',{level:1,name:'Trattoria Santa Lucia'})).toBeVisible();
 await expect(page.getByLabel('Nome e cognome')).toHaveCount(0);
 await page.getByRole('button',{name:'Oggi',exact:false}).click();
 await expect(page.locator('.alternatives button')).toHaveCount(2);
 await expect(page.getByText('Troviamo un altro momento per vederci.')).toBeVisible();
 await noOverflow(page);
 await pickDay(page,2);
 await expect(page.getByRole('heading',{name:'Come possiamo contattarti?'})).toBeFocused();
 await expect(page.getByLabel('Email',{exact:true})).toHaveAttribute('required','');
 await expect(page.getByLabel('Telefono',{exact:true})).toHaveAttribute('required','');
 await mkdir('test-results/visual',{recursive:true});await page.screenshot({path:'test-results/visual/cliente-375.png',fullPage:true});
 await contacts(page,'Ospite browser');
 await expect(page.getByRole('heading',{name:'Prenotato. Ti aspettiamo!'})).toBeVisible();
 await page.getByRole('link',{name:'Gestisci la prenotazione'}).click();
 await page.getByRole('button',{name:'Disdici la prenotazione'}).click();
 await page.getByRole('button',{name:'Annulla azione',exact:true}).click();
 await expect(page.getByRole('button',{name:'Disdici la prenotazione'})).toBeEnabled();
 await expect(page.locator('.status')).toContainText('Confermata');
 await page.getByRole('button',{name:'Disdici la prenotazione'}).click();
 await expect(page.getByRole('heading',{name:'Prenotazione disdetta'})).toBeVisible();
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Booking cancelled'})).toBeVisible();
 await page.goto('/prenotazione/abc');await expect(page.getByRole('heading',{name:'Non troviamo questa prenotazione.'})).toBeVisible();await expect(page.getByRole('button',{name:'Riprova',exact:true})).toHaveCount(0);
});
test('Lido: richiesta, login persistente, conferma, tavolo e impostazioni',async({page})=>{
 await page.goto('/r/lido-miseno');await expect(page.getByRole('heading',{name:'Lido Miseno',exact:true})).toBeVisible();await expect(page.getByText('Trattoria Santa Lucia')).toHaveCount(0);await page.getByRole('link',{name:'Prenota il tavolo',exact:false}).click();await pickDay(page,3);await contacts(page,'Ospite Lido browser');
 await expect(page.getByRole('heading',{name:'Richiesta ricevuta.'})).toBeVisible();
 const manageUrl=await page.getByRole('link',{name:'Gestisci la prenotazione'}).getAttribute('href');
 const guestPage=await page.context().newPage();await guestPage.goto(manageUrl!);
 await expect(guestPage.locator('.status')).toContainText('Da confermare');
 await page.goto('/r/lido-miseno/staff');await expect(page.getByLabel('Email',{exact:true})).toHaveValue('owner@lidomiseno.test');await page.getByLabel('Password',{exact:true}).fill('bigant2026');await page.getByRole('button',{name:/Accedi al pannello/}).click();
 await expect(page.getByRole('heading',{name:'La tua agenda.'})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'La tua agenda.'})).toBeVisible();
 await page.locator('#staff-date').fill(plusDay(3));
 const row=page.locator('.reservation-row').filter({hasText:'Ospite Lido browser'});
 await expect(row).toContainText('Da confermare');await row.getByRole('button',{name:'Conferma',exact:true}).click();
 await expect(row).toContainText('Confermata');
 await guestPage.getByRole('button',{name:'Aggiorna lo stato',exact:true}).click();await expect(guestPage.locator('.status')).toContainText('Confermata');await guestPage.close();
 await row.getByRole('button',{name:'Dettagli prenotazione Ospite Lido browser'}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 await page.keyboard.press('Shift+Tab');await expect.poll(()=>page.evaluate(()=>!!document.querySelector('dialog')?.contains(document.activeElement))).toBe(true);
 await page.keyboard.press('Tab');await expect.poll(()=>page.evaluate(()=>!!document.querySelector('dialog')?.contains(document.activeElement))).toBe(true);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 await expect(row.getByRole('button',{name:'Dettagli prenotazione Ospite Lido browser'})).toBeFocused();
 await row.getByRole('button',{name:'Dettagli prenotazione Ospite Lido browser'}).click();
 await dialog.getByRole('button',{name:'Disdici la prenotazione'}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page.locator('.sidebar')).toHaveAttribute('inert','');
 await expect(page.locator('.staff-main')).toHaveAttribute('inert','');
 await expect(page.getByRole('button',{name:'Annulla azione',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Annulla azione',exact:true}).click();
 await expect(page.locator('.staff-main')).not.toHaveAttribute('inert','');
 await expect(row).toContainText('Confermata');
 await row.getByRole('button',{name:'Dettagli prenotazione Ospite Lido browser'}).click();
 await dialog.getByRole('combobox',{name:/^Tavolo\b/}).selectOption({label:'Tavolo 1 · 1–4'});await page.getByRole('button',{name:'Salva modifiche'}).click();await expect(row).toContainText('Tavolo 1');await noOverflow(page);
 await page.screenshot({path:'test-results/visual/staff-375.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/visual/staff-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Impostazioni',exact:false}).click();await expect(page.getByLabel('Coperti totali')).toHaveValue('120');
 await page.getByLabel('Arrivi massimi per fascia').fill('24');await page.locator('.settings-panel').first().getByRole('button',{name:'Salva modifiche'}).click();await expect(page.getByText('Modifiche salvate')).toBeVisible();
 await page.getByRole('button',{name:'Tavoli',exact:false}).click();await page.getByRole('button',{name:'Aggiungi tavolo'}).click();await page.getByLabel('Nome tavolo').fill('Tavolo browser');await page.getByRole('button',{name:'Salva modifiche'}).click();await expect(page.getByRole('heading',{name:'Tavolo browser',exact:true})).toBeVisible();
 await page.goto('/r/trattoria-santa-lucia/staff');await expect(page.getByRole('heading',{name:'Hai già un accesso attivo.'})).toBeVisible();await expect(page.locator('.reservation-row')).toHaveCount(0);await expect(page.getByRole('link',{name:'Apri il pannello del mio locale'})).toHaveAttribute('href','/r/lido-miseno/staff');await page.getByRole('button',{name:'Esci e accedi a questo locale'}).click();await expect(page.getByLabel('Email',{exact:true})).toHaveValue('owner@santalucia.test');await page.getByLabel('Password',{exact:true}).fill('bigant2026');await page.getByRole('button',{name:/Accedi al pannello/}).click();await expect(page.locator('.venue-identity')).toContainText('Trattoria Santa Lucia');
 await page.getByRole('button',{name:'Esci',exact:true}).click();await expect(page.getByRole('heading',{name:'Accedi al pannello'})).toBeVisible();
});


test('prenotazione: retry e conflitto conservano giorno, contatti e scelte privacy',async({page})=>{
 const chosenDate=plusDay(6);let failRead=true;
 await page.route('**/api/public/trattoria-santa-lucia/availability?**',async route=>{
  if(new URL(route.request().url()).searchParams.get('date')===chosenDate&&failRead){failRead=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'INTERNAL_ERROR',message:'Connessione temporaneamente interrotta. Riprova.'}})});}
  else await route.continue();
 });
 await page.goto('/r/trattoria-santa-lucia/prenota');
 await expect(page.locator('.slot').first()).toBeVisible();
 await page.locator('#booking-date').fill(chosenDate);
 await expect(page.locator('.booking-form').getByRole('alert')).toContainText('Connessione temporaneamente interrotta.');
 await page.getByRole('button',{name:'Riprova',exact:true}).click();
 await expect(page.locator('#booking-date')).toHaveValue(chosenDate);
 await page.locator('.slot').first().click();
 await page.getByLabel('Nome e cognome').fill('Ospite recupero');
 await page.getByLabel('Email',{exact:true}).fill('recupero@example.test');
 await page.getByLabel('Telefono',{exact:true}).fill('3331234567');
 await page.getByRole('checkbox',{name:'Ho letto l’informativa privacy per la prenotazione.'}).check();
 await page.getByRole('checkbox',{name:'Desidero ricevere comunicazioni promozionali dal locale (facoltativo).'}).check();
 await page.route('**/api/public/trattoria-santa-lucia/reservations',route=>route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:{code:'SLOT_UNAVAILABLE',message:'Questo orario non è più disponibile. Scegli uno degli altri orari proposti.'}})}));
 await page.getByRole('button',{name:'Prenota il tavolo'}).click();
 await expect(page.locator('.booking-form').getByRole('alert')).toContainText('Questo orario non è più disponibile.');
 await expect(page.locator('#booking-date')).toHaveValue(chosenDate);
 await expect(page.getByLabel('Nome e cognome')).toHaveCount(0);
 await page.locator('.slot').first().click();
 await expect(page.getByLabel('Nome e cognome')).toHaveValue('Ospite recupero');
 await expect(page.getByLabel('Email',{exact:true})).toHaveValue('recupero@example.test');
 await expect(page.getByRole('checkbox',{name:'Ho letto l’informativa privacy per la prenotazione.'})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:'Desidero ricevere comunicazioni promozionali dal locale (facoltativo).'})).toBeChecked();
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.getByRole('heading',{name:'How can we reach you?'})).toBeVisible();
 await expect(page.getByLabel('Full name')).toHaveValue('Ospite recupero');
 await noOverflow(page);
});
