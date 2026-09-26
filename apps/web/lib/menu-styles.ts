// Stili del documento QR: inclusi nell’HTML per mostrare il menu senza
// attendere il CSS del pannello. I quattro temi condividono questa sola fonte.
export const menuStyles=`:root{color-scheme:dark;--bg:#111213;--panel:#1a1b1d;--raised:#232427;--border:#343538;--text:#f4f1ed;--muted:#a6a4a1;--accent:#ff914d;--accent-dark:#271b13;--green:#a4d5bb;--red:#ffaaa2;--radius:18px;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--text)}
*{box-sizing:border-box}
body{margin:0;font-size:15px;line-height:1.55}
a{color:inherit;text-decoration:none}
button,a,input,select,textarea{-webkit-tap-highlight-color:transparent}
button:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
h1,h2,h3,p{margin:0}
h1{font-size:clamp(30px,3.6vw,48px);line-height:1.13;letter-spacing:-1.5px;font-weight:600}
h2{font-size:20px;font-weight:600;letter-spacing:-.4px}
h3{font-size:15px;font-weight:600}
p+p{margin-top:12px}
.muted{color:var(--muted)}
.small{font-size:13px}
.accent{color:var(--accent)}
.eyebrow{text-transform:uppercase;letter-spacing:2px;font-size:10px;font-weight:700;display:block;margin-bottom:12px}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius)}
.button{display:inline-flex;align-items:center;justify-content:center;gap:14px;min-height:46px;padding:12px 20px;font-size:13px;font-weight:600;border-radius:9px;border:1px solid transparent;transition:background .15s,transform .15s}
.button:hover{transform:translateY(-1px)}
.primary{background:var(--accent);color:#20160f}
.primary:hover{background:#ffa46c}
.wide{width:100%}
.text-button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;gap:8px;color:var(--accent);background:none;border:none;font-size:13px;font-weight:600;padding:8px 0}
.language-switch,.view-switch{display:flex;padding:3px;border:1px solid var(--border);border-radius:9px;gap:3px}
.language-switch .selected,.view-switch .selected{background:#333437;color:var(--text)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
/* Menu: lettura pubblica in una colonna, navigazione per locale. */
.menu-public{max-width:800px;margin:auto;padding:0 28px 48px}
.menu-header{min-height:88px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--border)}
.menu-venue{font-size:17px;font-weight:600;letter-spacing:-.5px}
.menu-header .language-switch a{display:grid;place-items:center;min-height:44px;min-width:44px;border-radius:6px;font-size:12px}
.menu-header .language-switch .selected{background:var(--raised);color:var(--accent)}
.menu-intro{padding:52px 0 32px}
.menu-intro h1{font-size:64px;letter-spacing:-2px}
.menu-intro p{margin-top:18px;color:var(--muted);max-width:430px}
.menu-jumps{display:flex;gap:8px;overflow-x:auto;padding:4px 0 24px;scrollbar-width:thin}
.menu-jumps a{display:flex;align-items:center;min-height:44px;padding:8px 16px;border:1px solid var(--border);border-radius:24px;white-space:nowrap;font-size:13px}
.menu-jumps a:first-child{border-color:#9b613c;color:var(--accent)}
.menu-section{scroll-margin-top:24px;margin-bottom:40px}
.menu-section-heading{display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--border);padding:16px 0}
.menu-section-heading h2{font-size:25px;flex:1}
.menu-section-heading>span:first-child{color:var(--accent);font-size:26px}
.menu-dish{display:flex;gap:22px;padding:26px 0;border-bottom:1px solid #ffffff0d}
.menu-photo{width:128px;height:96px;object-fit:cover;border-radius:12px;flex-shrink:0}
.menu-dish-copy{flex:1;min-width:0}
.menu-dish-title{display:flex;align-items:baseline;gap:18px;justify-content:space-between}
.menu-dish-title h3{font-size:17px;overflow-wrap:anywhere}
.menu-dish-title strong{white-space:nowrap;color:var(--accent);font-size:15px;font-weight:500}
.menu-description{font-size:14px;color:#c0bcb7;margin-top:8px}
.allergen-line{font-size:11px;color:var(--muted);margin-top:12px}
.dietary-tags{display:flex;gap:6px;flex-wrap:wrap;list-style:none;padding:0;margin:10px 0 0}
.dietary-tags li{font-size:10px;border:1px solid #a4d5bb44;color:var(--green);padding:3px 8px;border-radius:5px}
.sold-out{filter:grayscale(1);color:#b5b5b5}
.sold-out .menu-dish-title strong{color:#b5b5b5}
.sold-out .menu-photo{opacity:.65}
.sold-out-label{display:inline-block;margin-top:10px;border:1px solid #777;padding:3px 8px;font-size:11px;border-radius:5px;color:#ddd}
.menu-footer{border-top:1px solid var(--border);padding:24px 0 32px;margin-top:20px}
.menu-footer h2{font-size:15px}
.menu-footer p{margin-top:10px;font-size:13px;color:var(--muted)}
.menu-empty{padding:30px;margin:40px 0;display:flex;flex-direction:column;gap:24px}
@media(max-width:450px){.menu-public{padding:0 20px 32px}.menu-header{min-height:78px}.menu-venue{font-size:14px;max-width:180px}.menu-intro{padding-top:34px}.menu-intro h1{font-size:52px}.menu-intro p{font-size:14px}.menu-section-heading h2{font-size:22px}.menu-dish{gap:14px;padding:22px 0}.menu-photo{width:88px;height:66px;border-radius:9px}.menu-dish-title{gap:8px;flex-wrap:wrap}.menu-dish-title h3{font-size:16px}.menu-dish-title strong{font-size:14px}.menu-description{font-size:13px}}
.menu-public{--menu-color:#ff914d;--menu-ink:#ff914d;--menu-on-color:#111}
.menu-public .accent,.menu-public .menu-section-heading>span:first-child,.menu-public .menu-dish-title strong,.menu-public .language-switch .selected{color:var(--menu-ink)}
.menu-public .primary{background:var(--menu-color);color:var(--menu-on-color)}
.menu-public .menu-jumps a:first-child{color:var(--menu-ink);border-color:var(--menu-color)}
.menu-public a:focus-visible{outline-color:var(--menu-ink)}
.menu-public .sold-out .menu-dish-title strong{color:#b5b5b5}
.menu-cover{display:block;width:100%;height:auto;aspect-ratio:16/7;object-fit:cover;border-radius:12px;margin-top:24px}
.menu-template-pop .menu-intro h1{font-weight:900;text-transform:uppercase;font-size:clamp(60px,12vw,100px);letter-spacing:-5px;text-shadow:3px 3px 0 var(--menu-color)}
.menu-template-pop .menu-section-heading{border:2px solid var(--menu-color);padding:12px 16px;transform:rotate(-1deg);border-radius:4px;margin-bottom:10px}
.menu-template-pop .menu-dish{border:1px solid var(--border);border-radius:16px;padding:20px;margin-top:14px;box-shadow:4px 4px 0 var(--menu-color);background:#1a1b1d}
.menu-template-pop .menu-jumps a{border-radius:6px;font-weight:700}
.menu-template-pop .menu-cover{border:3px solid var(--menu-color);border-radius:20px}
.menu-template-elegant .menu-venue,.menu-template-elegant h1,.menu-template-elegant h2,.menu-template-elegant h3{font-family:Georgia,'Times New Roman',serif;font-weight:400}
.menu-template-elegant .menu-intro{text-align:center;padding:56px 0 40px}
.menu-template-elegant .menu-intro p{margin:20px auto 0}
.menu-template-elegant .menu-intro h1{font-style:italic;font-size:72px}
.menu-template-elegant .menu-section-heading{border-top:1px solid var(--menu-color);border-bottom:0;padding-top:28px}
.menu-template-elegant .menu-dish{padding:30px 0}
.menu-template-elegant .menu-photo,.menu-template-elegant .menu-cover{border-radius:0}
.menu-template-elegant .menu-jumps{justify-content:flex-start}
.menu-template-elegant .menu-jumps a{border:0;border-bottom:1px solid var(--border);border-radius:0;letter-spacing:.6px}
.menu-template-pub h1,.menu-template-pub h2,.menu-template-pub .menu-venue{font-family:Impact,'Arial Narrow',Arial,sans-serif;text-transform:uppercase;font-weight:700;letter-spacing:1px}
.menu-template-pub .menu-intro h1{font-size:80px;border-left:7px solid var(--menu-color);padding-left:22px}
.menu-template-pub .menu-section-heading{border-bottom:3px double var(--menu-color)}
.menu-template-pub .menu-dish{border-bottom:1px dashed #636363}
.menu-template-pub .menu-dish-title strong{border:1px solid var(--menu-color);padding:3px 8px;font-weight:bold;transform:rotate(-2deg)}
.menu-template-pub .menu-jumps a{border-radius:3px;text-transform:uppercase;font-weight:700}
.menu-template-pub .menu-cover{border-radius:3px;filter:contrast(1.08)}
@media(max-width:450px){.menu-template-pop .menu-dish{padding:16px;gap:12px}.menu-template-pop .menu-photo{width:68px;height:51px}.menu-template-elegant .menu-intro h1{font-size:58px}.menu-template-pub .menu-intro h1{font-size:64px}.menu-cover{aspect-ratio:16/9}}`;
