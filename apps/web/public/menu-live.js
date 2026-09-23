/* global document, window, location, fetch, AbortSignal, TextEncoder, crypto, DOMParser, CSS, setInterval, requestAnimationFrame */
// Il contenuto iniziale resta SSR. Lo script riusa i piatti invariati e
// conserva il punto di lettura quando cambia il menu pubblico.
(() => {
  const selector = '[data-live-menu]';
  if (!document.querySelector(selector)) return;
  let busy = false;

  const dishSelector = node => `[data-dish="${CSS.escape(node.dataset.dish)}"]`;
  async function check() {
    if (busy || document.visibilityState !== 'visible') return;
    const current = document.querySelector(selector);
    if (!current) return;
    busy = true;
    try {
      const response = await fetch(current.dataset.menuUrl, {cache:'no-store', signal:AbortSignal.timeout(5000)});
      if (!response.ok) return;
      const snapshot = JSON.stringify(await response.json());
      // La prova da un telefono nella LAN può usare HTTP: SubtleCrypto è
      // disponibile solo in contesti sicuri. L'aggiornamento deve funzionare
      // anche lì; in quel caso confrontiamo il documento SSR a ogni controllo.
      if (crypto.subtle) {
        const bytes = new TextEncoder().encode(snapshot);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const version = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
        if (version === current.dataset.version) return;
      }

      const html = await fetch(location.pathname + location.search, {cache:'no-store', headers:{Accept:'text/html'}, signal:AbortSignal.timeout(5000)});
      if (!html.ok || document.visibilityState !== 'visible') return;
      const next = new DOMParser().parseFromString(await html.text(),'text/html').querySelector(selector);
      if (!next || next.dataset.menuUrl !== current.dataset.menuUrl || !current.isConnected) return;
      if (next.dataset.version === current.dataset.version) return;

      const x = window.scrollX, y = window.scrollY;
      const anchors = Array.from(current.querySelectorAll('[data-dish]'));
      const anchor = anchors.find(node => {
        const rect = node.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight && next.querySelector(dishSelector(node));
      });
      const anchorTop = anchor?.getBoundingClientRect().top;
      const focused = current.contains(document.activeElement) ? document.activeElement?.getAttribute('href') : null;
      const jumps = current.querySelector('.menu-jumps')?.scrollLeft ?? 0;

      // Non eseguire gli script del documento ricevuto. L’intervallo attuale
      // continua a funzionare anche dopo la sostituzione del contenitore.
      next.querySelectorAll('script').forEach(node => node.remove());
      for (const node of next.querySelectorAll('[data-dish]')) {
        const previous = current.querySelector(dishSelector(node));
        if (previous?.outerHTML === node.outerHTML) node.replaceWith(previous);
      }
      const cover = current.querySelector('.menu-cover'), nextCover = next.querySelector('.menu-cover');
      if (cover && nextCover && cover.outerHTML === nextCover.outerHTML) nextCover.replaceWith(cover);
      current.replaceWith(next);
      const nextJumps = next.querySelector('.menu-jumps');
      if (nextJumps) nextJumps.scrollLeft = jumps;
      if (focused) (Array.from(next.querySelectorAll('a')).find(node => node.getAttribute('href') === focused) ?? next.querySelector('.menu-venue'))?.focus({preventScroll:true});
      const status = next.querySelector('[data-menu-status]');
      if (status) status.textContent = next.dataset.updatedLabel;
      requestAnimationFrame(() => {
        const target = anchor && next.querySelector(dishSelector(anchor));
        window.scrollTo(x, target && anchorTop !== undefined ? window.scrollY + target.getBoundingClientRect().top - anchorTop : y);
      });
      // API e HTML possono fotografare due modifiche successive. Confrontare
      // sempre con la versione del DOM: ricordare lo snapshot API potrebbe
      // nascondere un successivo ripristino a quella stessa versione.
    } catch {
      // Un errore temporaneo mantiene il menu leggibile; il prossimo controllo
      // riprova, senza mostrare un errore al posto dei piatti già caricati.
    } finally {
      busy = false;
    }
  }
  setInterval(check,30000);
  document.addEventListener('visibilitychange',check);
  window.addEventListener('pageshow',event=>{if(event.persisted)check();});
})();
