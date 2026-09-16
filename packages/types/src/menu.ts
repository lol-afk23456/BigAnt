import { z } from 'zod';
export const allergenCodes=['1','2','3','4','5','6','7','8','9','10','11','12','13','14'] as const;
export const dietaryCodes=['vegetarian','vegan','gluten_free','spicy'] as const;
const name=z.string().trim().min(1).max(120);
const order=z.number().int().min(0).max(10000);
export const menuCategoryInput=z.object({name_it:name,name_en:name,sort_order:order.default(0),active:z.boolean().default(true)}).strict();
export const menuCategoryPatch=menuCategoryInput.partial().extend({sort_order:order.optional(),active:z.boolean().optional()}).refine(v=>Object.keys(v).length>0);
export const menuItemInput=z.object({category_id:z.uuid(),name_it:name,name_en:name,description_it:z.string().trim().max(1000).nullable().default(null),description_en:z.string().trim().max(1000).nullable().default(null),price_cents:z.number().int().min(0).max(10000000),allergens:z.array(z.enum(allergenCodes)).max(14).default([]),dietary:z.array(z.enum(dietaryCodes)).max(4).default([]),is_visible:z.boolean().default(true),is_available:z.boolean().default(true),is_featured:z.boolean().default(false),sort_order:order.default(0)}).strict();
export const menuItemPatch=menuItemInput.partial().extend({description_it:z.string().trim().max(1000).nullable().optional(),description_en:z.string().trim().max(1000).nullable().optional(),allergens:z.array(z.enum(allergenCodes)).max(14).optional(),dietary:z.array(z.enum(dietaryCodes)).max(4).optional(),is_visible:z.boolean().optional(),is_available:z.boolean().optional(),is_featured:z.boolean().optional(),sort_order:order.optional(),image_url:z.null().optional()}).refine(v=>Object.keys(v).length>0);
export const menuOrderInput=z.object({ids:z.array(z.uuid()).min(1).max(500)}).strict().refine(v=>new Set(v.ids).size===v.ids.length);
export const menuQuery=z.object({lang:z.enum(['it','en']).optional()}).strict();
export type MenuCategoryInput=z.infer<typeof menuCategoryInput>;
export type MenuItemInput=z.infer<typeof menuItemInput>;
export interface MenuItemRecord extends MenuItemInput {id:string;image_url:string|null}
export interface MenuCategoryRecord extends MenuCategoryInput {id:string;items:MenuItemRecord[]}
export interface PublicMenuItem {id:string;name:string;description:string|null;price_cents:number;image_url:string|null;allergens:string[];dietary:string[];is_available:boolean;is_featured:boolean}
export const menuTemplates=['essential','pop','elegant','pub'] as const;
export const menuSettingsInput=z.object({menu_template:z.enum(menuTemplates),menu_primary_color:z.string().regex(/^#[0-9a-fA-F]{6}$/),menu_cover_url:z.null().optional()}).strict();
export interface MenuSettings {menu_template:typeof menuTemplates[number];menu_primary_color:string;menu_cover_url:string|null}
export interface PublicMenu {settings:MenuSettings;language:'it'|'en';tenant:{name:string;slug:string;address:string|null};categories:{id:string;name:string;items:PublicMenuItem[]}[]}
// Conversione decimale per il form: nessun arrotondamento di un float monetario.
export function parseMenuPrice(value:string):number|null {const match=/^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(value.trim());if(!match)return null;const cents=Number(match[1])*100+Number((match[2]??'').padEnd(2,'0'));return cents<=10000000?cents:null;}
