// Réseau de centres & horaires.
import { CENTERS } from '../data.js';
import { el, esc, ic } from '../util.js';
import { store } from '../store.js';

export default function centres({ go }) {
  let zone = 'tous';
  let q = '';
  const count = (z) => CENTERS.filter((c) => z === 'tous' || c.zone === z).length;
  const root = el(`
  <div class="wrap wrap--app stack-lg">
    <header class="stack"><span class="eyebrow">Maillage territorial</span><h1 class="h1">Réseau des centres agréés SICTA</h1>
      <p class="muted">Aperçu : ${CENTERS.length} centres de démonstration sur les 32 du réseau. Affluence et horaires en temps réel.</p></header>
    <div class="row row--wrap">
      <div class="search">${ic('search')}<input type="search" id="q" placeholder="Rechercher une ville ou un centre" aria-label="Rechercher un centre"></div>
      <div class="chips chips--sm" role="group" aria-label="Zone">
        ${[['tous', 'Tous'], ['abidjan', 'Abidjan'], ['interieur', 'Intérieur']].map(([k, l]) => `<button class="chip-btn" data-zone="${k}" aria-pressed="${k === zone}">${l} (${count(k)})</button>`).join('')}
      </div>
    </div>
    <div class="grid-cards" id="list"></div>
  </div>`);
  const list = root.querySelector('#list');
  const paint = () => {
    const rows = CENTERS.filter((c) => (zone === 'tous' || c.zone === zone) && `${c.name} ${c.city}`.toLowerCase().includes(q));
    list.innerHTML = rows.length
      ? rows.map((c) => `
      <article class="card stack">
        <div class="row row--between"><span class="chip chip--${c.flow === 'fluide' ? 'ok' : 'warn'}"><i class="dot ${c.flow === 'fluide' ? 'dot--pulse' : ''}"></i>${c.flow === 'fluide' ? `Fluide < ${c.wait} min` : `Affluence modérée (${c.wait} min)`}</span><span class="small muted">Pistes : ${c.lanes}</span></div>
        <h3>${esc(c.name)}</h3>
        ${c.addr ? `<p class="small muted">${esc(c.addr)}</p>` : ''}
        <p class="small">${ic('schedule')} Lun – Sam : ${c.hours.open.replace(':', 'h')} – ${c.hours.close.replace(':', 'h')}</p>
        <div class="row"><button class="btn btn--cta btn--sm grow" data-book="${c.id}">Prendre RDV</button>
        <a class="icon-btn icon-btn--tonal" target="_blank" rel="noopener" title="Itinéraire" aria-label="Itinéraire vers ${esc(c.name)}" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('SICTA ' + c.name + ', Côte d’Ivoire')}">${ic('directions')}</a></div>
      </article>`).join('')
      : `<p class="muted">Aucun centre ne correspond à « ${esc(q)} ».</p>`;
  };
  root.addEventListener('input', (e) => {
    if (e.target.id === 'q') {
      q = e.target.value.trim().toLowerCase();
      paint();
    }
  });
  root.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zone]');
    const b = e.target.closest('[data-book]');
    if (z) {
      zone = z.dataset.zone;
      root.querySelectorAll('[data-zone]').forEach((x) => x.setAttribute('aria-pressed', x === z));
      paint();
    } else if (b) {
      store.patch('booking', { centerId: b.dataset.book, date: null, time: null });
      go('/reserver');
    }
  });
  paint();
  return root;
}
