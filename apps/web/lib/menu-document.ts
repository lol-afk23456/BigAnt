import { createHash } from 'node:crypto';
import { menuMessages,uiMessages,type Language,type MenuKey } from '@bigant/i18n';
import type { PublicMenu,PublicMenuItem } from '@bigant/types';

// Unico confine di escaping per testo e attributi del documento. Il menu usa
// solo HTML nativo: React nel browser non aggiungerebbe interazioni utili.
const escapeHtml=(value:string|number)=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
const coverSizes='(max-width: 450px) calc(100vw - 40px), (max-width: 800px) calc(100vw - 56px), 744px';
const photoSizes='(max-width: 450px) 88px, 128px';
const imageSet=(url:string,cover=false)=>(cover?[320,640,768,960]:[320,640,960]).map(width=>`${url.replace('-640.webp',`-${cover?'cover-':''}${width}.webp`)} ${width}w`).join(', ');

export function renderMenuDocument({slug,language,menu}:{slug:string;language:Language;menu:PublicMenu|null}){
 const t=menuMessages[language],ui=uiMessages[language];
 const title=menu?`${t.menu} · ${menu.tenant.name}`:`${t.menu} · ${ui.brand}`;
 const cover=menu?.settings.menu_cover_url;
 const head=`<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(t.menuIntro)}">${menu?'':'<meta name="robots" content="noindex">'}${cover?`<link rel="preload" as="image" href="${escapeHtml(cover.replace('-640.webp','-cover-640.webp'))}" imagesrcset="${escapeHtml(imageSet(cover,true))}" imagesizes="${coverSizes}" fetchpriority="high">`:''}<link rel="icon" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/icon-192.png"><link rel="stylesheet" href="/bigant.css">${menu?(['it','en'] as const).map(locale=>`<link rel="alternate" hreflang="${locale}" href="/r/${escapeHtml(slug)}/menu?lang=${locale}">`).join(''):''}</head>`;
 if(!menu)return `<!DOCTYPE html><html lang="${language}">${head}<body><main class="menu-public" lang="${language}"><div class="panel menu-empty"><h1>${escapeHtml(t.menu)}</h1><p role="alert">${escapeHtml(t.menuUnavailable)}</p><a class="button primary" href="?lang=${language}">${escapeHtml(ui.retry)}</a></div></main></body></html>`;
 const color=/^#[0-9a-fA-F]{6}$/.test(menu.settings.menu_primary_color)?menu.settings.menu_primary_color:'#ff914d';
 const rgb=[1,3,5].map(n=>parseInt(color.slice(n,n+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
 const luminance=rgb[0]!*0.2126+rgb[1]!*0.7152+rgb[2]!*0.0722;
 const style=`--menu-color:${color};--menu-ink:${luminance>.22?color:'#f4f1ed'};--menu-on-color:${luminance>.179?'#111111':'#ffffff'}`;
 const fingerprint=createHash('sha256').update(JSON.stringify(menu)).digest('hex');
 const featured=menu.categories.flatMap(category=>category.items.filter(item=>item.is_featured));
 const count=menu.categories.reduce((sum,category)=>sum+category.items.length,0);
 const format=new Intl.NumberFormat(language==='it'?'it-IT':'en-IE',{style:'currency',currency:'EUR'});
 const dish=(item:PublicMenuItem,first=false)=>renderDish(item,language,format,first);
 const languageLinks=(['it','en'] as const).map(locale=>`<a href="?lang=${locale}" hreflang="${locale}" class="${language===locale?'selected':''}"${language===locale?' aria-current="page"':''}>${escapeHtml(uiMessages[locale][locale])}</a>`).join('');
 const categoryLinks=menu.categories.filter(category=>category.items.some(item=>!item.is_featured)).map(category=>`<a href="#category-${escapeHtml(category.id)}">${escapeHtml(category.name)}</a>`).join('');
 const categories=menu.categories.filter(category=>category.items.some(item=>!item.is_featured)).map(category=>{
  const items=category.items.filter(item=>!item.is_featured);
  return `<section id="category-${escapeHtml(category.id)}" class="menu-section"><div class="menu-section-heading"><h2>${escapeHtml(category.name)}</h2><span class="muted">${String(items.length).padStart(2,'0')}</span></div>${items.map(item=>dish(item)).join('')}</section>`;
 }).join('');
 const dishes=count?`<nav class="menu-jumps" aria-label="${escapeHtml(t.menuCategories)}">${featured.length?`<a href="#featured">${escapeHtml(t.featured)}</a>`:''}${categoryLinks}</nav>${featured.length?`<section id="featured" class="menu-section"><div class="menu-section-heading"><span aria-hidden="true">✳</span><h2>${escapeHtml(t.featured)}</h2></div>${featured.map((item,index)=>dish(item,index===0)).join('')}</section>`:''}${categories}<footer id="allergens" class="menu-footer"><h2>${escapeHtml(t.allergens)}</h2><p>${escapeHtml(t.allergenHint)}</p></footer>`:`<div class="panel menu-empty"><p>${escapeHtml(t.emptyMenu)}</p></div>`;
 return `<!DOCTYPE html><html lang="${language}">${head}<body><main class="menu-public menu-template-${escapeHtml(menu.settings.menu_template)}" lang="${language}" style="${style}" data-live-menu="" data-version="${fingerprint}" data-menu-url="/api/public/${escapeHtml(slug)}/menu?lang=${language}" data-updated-label="${escapeHtml(t.menuUpdated)}"><header class="menu-header"><a class="menu-venue" href="/r/${escapeHtml(slug)}">${escapeHtml(menu.tenant.name)}</a><nav class="language-switch" aria-label="${escapeHtml(ui.language)}">${languageLinks}</nav></header>${cover?`<img class="menu-cover" src="${escapeHtml(cover.replace('-640.webp','-cover-640.webp'))}" srcset="${escapeHtml(imageSet(cover,true))}" sizes="${coverSizes}" width="960" height="540" alt="" decoding="async" fetchpriority="high">`:''}<section class="menu-intro"><span class="eyebrow accent">${escapeHtml(t.menuEyebrow)}</span><h1>${escapeHtml(t.menu)}</h1><p>${escapeHtml(t.menuIntro)}</p>${count?`<a class="text-button" href="#allergens">${escapeHtml(t.allergens)}</a>`:''}${menu.tenant.address?`<p class="small muted">${escapeHtml(menu.tenant.address)}</p>`:''}</section>${dishes}<a href="/r/${escapeHtml(slug)}/prenota" class="button primary wide">${escapeHtml(ui.book)} →</a><p class="sr-only" role="status" data-menu-status=""></p><script src="/menu-live.js" defer></script></main></body></html>`;
}

function renderDish(item:PublicMenuItem,language:Language,format:Intl.NumberFormat,first:boolean){
 const t=menuMessages[language];const label=(prefix:string,code:string)=>t[`${prefix}_${code}` as MenuKey]??code;
 const photo=item.image_url?`<img class="menu-photo" src="${escapeHtml(item.image_url)}" srcset="${escapeHtml(imageSet(item.image_url))}" sizes="${photoSizes}" width="128" height="96" alt="${escapeHtml(item.name)}" loading="${first?'eager':'lazy'}" decoding="async">`:'';
 const dietary=item.dietary.length?`<ul class="dietary-tags" aria-label="${escapeHtml(t.dietary)}">${item.dietary.map(code=>`<li>${escapeHtml(label('diet',code))}</li>`).join('')}</ul>`:'';
 const allergens=item.allergens.length?`<p class="allergen-line"><span>${escapeHtml(t.allergens)}: </span>${escapeHtml(item.allergens.map(code=>label('allergen',code)).join(', '))}</p>`:'';
 return `<article class="menu-dish${item.is_available?'':' sold-out'}" data-dish="${escapeHtml(item.id)}">${photo}<div class="menu-dish-copy"><div class="menu-dish-title"><h3>${escapeHtml(item.name)}</h3><strong>${escapeHtml(format.format(item.price_cents/100))}</strong></div>${item.description?`<p class="menu-description">${escapeHtml(item.description)}</p>`:''}${item.is_available?'':`<span class="sold-out-label">${escapeHtml(t.soldOut)}</span>`}${dietary}${allergens}</div></article>`;
}
