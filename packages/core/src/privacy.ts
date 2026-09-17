export function csvCell(value: unknown): string {
  let text=value===null||value===undefined?'':String(value);
  if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function customerCsv(rows:Array<{id:string;full_name:string;phone_e164:string|null;email:string|null;marketing_consent:boolean;marketing_consent_at:Date|null;total_visits:number;no_show_count:number;last_visit_at:Date|null}>) {
  const headers=['id','full_name','phone_e164','email','marketing_consent','marketing_consent_at','total_visits','no_show_count','last_visit_at'];
  return '\uFEFF'+[headers.map(csvCell).join(','),...rows.map(r=>[r.id,r.full_name,r.phone_e164,r.email,r.marketing_consent,r.marketing_consent_at?.toISOString(),r.total_visits,r.no_show_count,r.last_visit_at?.toISOString()].map(csvCell).join(','))].join('\r\n')+'\r\n';
}
