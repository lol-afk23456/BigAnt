import { expect,test,type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const plusDay=(days:number)=>{const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
async function pickDay(page:Page,days:number){await page.locator('#booking-date').fill(plusDay(days));await expect(page.locator('.slot').first()).toBeVisible();await page.locator('.slot').first().click();}
async function contacts(page:Page,name:string){await page.getByLabel('Nome e cognome').fill(name);await page.getByLabel('Email',{exact:true}).fill('browser@example.test');await page.getByLabel('Telefono',{exact:true}).fill('3331234567');await page.getByRole('button',{name:'Prenota il tavolo'}).click();}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
test('ospite a 375px: campi progressivi, salto del giorno chiuso, alternative e disdetta',async({page})=>{
 await page.goto('/r/trattoria-santa-lucia/prenota');
 await expect(page.getByText('Oggi non ci sono posti: ti proponiamo il primo giorno utile.')).toBeVisible();
 await expect(page.locator('#booking-date')).toHaveValue(plusDay(1));
 await expect(page.getByLabel('Nome e cognome')).toHaveCount(0);
 await page.getByRole('button',{name:'Oggi',exact:false}).click();
 await expect(page.locator('.alternatives button')).toHaveCount(2);
 await expect(page.getByText('Troviamo un altro momento per vederci.')).toBeVisible();
 await noOverflow(page);
 await pickDay(page,2);
 await expect(page.getByLabel('Email',{exact:true})).toHaveAttribute('required','');
 await expect(page.getByLabel('Telefono',{exact:true})).toHaveAttribute('required','');
 await mkdir('test-results/visual',{recursive:true});await page.screenshot({path:'test-results/visual/cliente-375.png',fullPage:true});
 await contacts(page,'Ospite browser');
 await expect(page.getByRole('heading',{name:'Prenotato. Ti aspettiamo!'})).toBeVisible();
 await page.getByRole('link',{name:'Gestisci la prenotazione'}).click();
 await page.getByRole('button',{name:'Disdici la prenotazione'}).click();
 await expect(page.getByRole('heading',{name:'Prenotazione disdetta'})).toBeVisible();
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Booking cancelled'})).toBeVisible();
});
test('Lido: richiesta, login persistente, conferma, tavolo e impostazioni',async({page})=>{
 await page.goto('/r/lido-miseno/prenota');await pickDay(page,3);await contacts(page,'Ospite Lido browser');
 await expect(page.getByRole('heading',{name:'Richiesta ricevuta.'})).toBeVisible();
 await page.goto('/staff?locale=lido-miseno');await page.getByLabel('Password',{exact:true}).fill('bigant2026');await page.getByRole('button',{name:/Accedi al pannello/}).click();
 await expect(page.getByRole('heading',{name:'Una bella giornata, insieme.'})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Una bella giornata, insieme.'})).toBeVisible();
 await page.locator('#staff-date').fill(plusDay(3));
 const row=page.locator('.reservation-row').filter({hasText:'Ospite Lido browser'});
 await expect(row).toContainText('Da confermare');await row.getByRole('button',{name:'Conferma',exact:true}).click();
 await expect(row).toContainText('Confermata');await row.getByRole('button',{name:'Dettagli prenotazione Ospite Lido browser'}).click();
 await page.getByRole('combobox',{name:'Tavolo',exact:true}).selectOption({label:'Tavolo 1 · 1–4'});await page.getByRole('button',{name:'Salva modifiche'}).click();await expect(row).toContainText('Tavolo 1');await noOverflow(page);
 await page.screenshot({path:'test-results/visual/staff-375.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/visual/staff-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Impostazioni',exact:false}).click();await expect(page.getByLabel('Coperti totali')).toHaveValue('120');
 await page.getByLabel('Arrivi massimi per fascia').fill('24');await page.locator('.settings-panel').first().getByRole('button',{name:'Salva modifiche'}).click();await expect(page.getByText('Modifiche salvate')).toBeVisible();
 await page.getByRole('button',{name:'Tavoli',exact:false}).click();await page.getByRole('button',{name:'Aggiungi tavolo'}).click();await page.getByLabel('Nome tavolo').fill('Tavolo browser');await page.getByRole('button',{name:'Salva modifiche'}).click();await expect(page.getByRole('heading',{name:'Tavolo browser',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Esci',exact:true}).click();await expect(page.getByRole('heading',{name:'Accedi al pannello'})).toBeVisible();
});
