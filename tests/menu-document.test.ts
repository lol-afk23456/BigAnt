import { expect,test } from 'vitest';
import type { PublicMenu } from '../packages/types/src/menu';
import { renderMenuDocument } from '../apps/web/lib/menu-document';

test('il documento menu tratta nomi, descrizioni e attributi come testo, senza script iniettati',()=>{
 const attack='</title><script>alert("ospite")</script><img src=x onerror="alert(1)">';
 const menu:PublicMenu={language:'it',tenant:{name:attack,slug:'test-menu',address:attack},settings:{menu_template:'essential',menu_primary_color:'#ff914d',menu_cover_url:null},categories:[{id:'category',name:attack,items:[{id:'dish',name:attack,description:attack,price_cents:1250,image_url:'/api/public/test-menu/menu-images/photo-640.webp" onerror="alert(1)',allergens:['1'],dietary:['vegan'],is_available:true,is_featured:false}]}]};
 const html=renderMenuDocument({slug:'test-menu',language:'it',menu});
 expect(html).not.toContain(attack);expect(html).not.toContain('onerror="alert(1)');
 expect(html).toContain('&lt;/title&gt;&lt;script&gt;alert(&quot;ospite&quot;)&lt;/script&gt;');
 expect(html.match(/<script\b/g)).toHaveLength(1);expect(html).toContain('<script src="/menu-live.js" defer></script>');
 expect(html).toContain('12,50');expect(html).toContain('Vegano');expect(html).toContain('Cereali contenenti glutine');
 expect(html).not.toContain('/_next/static');expect(html).not.toContain('self.__next_f');
});

test('il documento di errore conserva lingua, azione di riprova e metadati senza dipendere da JavaScript',()=>{
 const html=renderMenuDocument({slug:'test-menu',language:'en',menu:null});
 expect(html).toContain('<html lang="en">');expect(html).toContain('role="alert"');
 expect(html).toContain('href="?lang=en"');expect(html).toContain('content="noindex"');
 expect(html).toContain('href="/bigant.css"');expect(html).not.toContain('<script');
});
