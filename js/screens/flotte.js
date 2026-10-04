// Dashboard flotte (Image_22) : sélection des véhicules à présenter au contrôle.
import { COMPANY } from '../data.js';
import { dateShort, el, esc, ic, toast } from '../util.js';
import { fleetVehicles, parseFleetCsv, statusOf } from '../domain.js';
import { store } from '../store.js';

const URGENT_DAYS = 20;
const FILTERS = [['all', 'Tous'], ['VP', 'VP & pick-up'], ['PL', 'Poids lourds'], ['Minibus', 'Minibus'], ['urgent', `Urgent J-${URGENT_DAYS}`]];

export default function flotte({ go }) {
  let filter = 'all';
  let q = '';
  const vehicles = () => fleetVehicles();
  const urgent = (v) => statusOf(v.due).days <= URGENT_DAYS;
  const root = el(`
  <div class="wrap wrap--app stack-lg has-sticky">
    <section class="card stack">
      <div class="row row--between row--top">
        <div class="min0"><span class="eyebrow ok">${ic('verified')} Flotte certifiée ${COMPANY.ref}</span><h1 class="h2 ell">${COMPANY.name}</h1><p class="small muted">${COMPANY.addr} • ${COMPANY.units} unités actives</p></div>
        <label class="btn btn--tonal btn--sm" for="csv">${ic('upload_file')}<span>Import CSV</span></label><input id="csv" type="file" accept=".csv,text/csv,text/plain" hidden>
      </div>
      <div class="kpis" id="kpis"></div>
    </section>
    <div class="search">${ic('search')}<input type="search" id="q" placeholder="Rechercher par immatriculation ou modèle…" aria-label="Rechercher un véhicule"></div>
    <div class="chips chips--scroll" role="group" aria-label="Filtres" id="filters"></div>
    <div class="row row--between small"><button class="link" id="sel-urgent">${ic('bolt')} Sélectionner les véhicules urgents</button><span class="muted">Sélection : <b id="count"></b></span></div>
    <div class="stack" id="list"></div>
    <div class="sticky-cta sticky-cta--nav"><div class="sticky-cta__in sticky-cta__in--dark stack">
      <div class="row row--between"><span class="row row--gap"><i class="dot dot--pulse dot--o"></i><b id="sum">0 véhicule</b></span><span class="small" id="brk"></span></div>
      <button class="btn btn--cta btn--lg btn--block" id="book">${ic('calendar_add_on')}<span id="book-l"></span></button></div></div>
  </div>`);
  const list = root.querySelector('#list');
  const sel = () => new Set(store.get().fleet.selected);

  const paint = () => {
    const vs = vehicles();
    const s = sel();
    const urg = vs.filter(urgent).length;
    root.querySelector('#kpis').innerHTML = `
      <div class="kpi"><span class="small muted">Total flotte ${ic('directions_car')}</span><b>${COMPANY.units}</b><small>véhicules</small></div>
      <div class="kpi kpi--warn"><span class="small">Échéance J-${URGENT_DAYS} ${ic('warning')}</span><b>${String(urg).padStart(2, '0')}</b><small>urgents</small></div>
      <div class="kpi kpi--blue"><span class="small muted">En inspection ${ic('sync')}</span><b>02</b><small>au centre</small></div>`;
    root.querySelector('#filters').innerHTML = FILTERS.map(([k, l]) => {
      const n = vs.filter((v) => k === 'all' || (k === 'urgent' ? urgent(v) : v.cat === k)).length;
      return `<button class="chip-btn ${k === 'urgent' ? 'chip-btn--warn' : ''}" data-f="${k}" aria-pressed="${k === filter}">${l} (${n})</button>`;
    }).join('');
    const rows = vs.filter((v) => (filter === 'all' || (filter === 'urgent' ? urgent(v) : v.cat === filter)) && `${v.plate} ${v.model}`.toLowerCase().includes(q));
    list.innerHTML = rows.length ? rows.map((v) => {
      const st = statusOf(v.due);
      const tone = st.days <= 15 ? 'err' : st.days <= URGENT_DAYS ? 'warn' : st.days <= 30 ? 'muted' : 'ok';
      const badge = st.days <= 15 ? `J-${st.days} Urgent` : st.days <= 30 ? `J-${st.days}` : st.days > 30 && st.days < 90 ? `J-${st.days}` : 'En règle';
      return `<label class="card veh ${s.has(v.id) ? 'is-on' : ''}"><input class="chk" type="checkbox" data-id="${v.id}" ${s.has(v.id) ? 'checked' : ''}>
        <span class="veh__b"><span class="row row--between"><span class="plate"><b>CI</b>${esc(v.plate)}</span><span class="chip chip--${tone}">${badge}</span></span>
        <span class="row row--gap"><span class="chip chip--tonal">${esc(v.type)}</span><b class="ell">${esc(v.model)}</b></span>
        <span class="row row--between small veh__due"><span>Échéance : <b>${dateShort(v.due)}</b></span><b class="${tone === 'ok' ? 'ok' : 'accent'}">${st.days <= 30 ? 'À contrôler' : 'En règle'}</b></span></span></label>`;
    }).join('') : `<p class="muted center-text">Aucun véhicule ne correspond.</p>`;

    const chosen = vs.filter((v) => s.has(v.id));
    const n = chosen.length;
    const c = { PL: 0, VP: 0, Minibus: 0 };
    chosen.forEach((v) => (c[v.cat] += 1));
    root.querySelector('#count').textContent = n;
    root.querySelector('#sum').textContent = `${n} véhicule${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}`;
    root.querySelector('#brk').textContent = [c.PL && `${c.PL} PL`, c.VP && `${c.VP} VP`, c.Minibus && `${c.Minibus} Minibus`].filter(Boolean).join(', ') || 'Aucun type';
    root.querySelector('#book-l').textContent = n ? `Programmer le passage (${n} véhicule${n > 1 ? 's' : ''}) →` : 'Sélectionnez au moins 1 véhicule';
    root.querySelector('#book').disabled = !n;
  };

  root.addEventListener('change', (e) => {
    if (e.target.matches('.chk')) {
      const s = sel();
      e.target.checked ? s.add(e.target.dataset.id) : s.delete(e.target.dataset.id);
      store.patch('fleet', { selected: [...s], paid: false, snapshot: null, ref: null, sent: {} });
      paint();
    } else if (e.target.id === 'csv') {
      const file = e.target.files[0];
      if (!file) return;
      file.text().then((t) => {
        const { added, errors } = parseFleetCsv(t, vehicles().map((v) => v.plate));
        if (added.length) store.patch('fleet', { extra: [...store.get().fleet.extra, ...added], selected: [...store.get().fleet.selected, ...added.map((v) => v.id)] });
        toast(added.length ? `${added.length} véhicule(s) importé(s)${errors.length ? ` · ${errors.length} ligne(s) ignorée(s)` : ''}` : `Aucun véhicule importé${errors.length ? ` (${errors.length} ligne(s) invalide(s))` : ' : fichier vide ou format non reconnu'}`, added.length ? 'ok' : 'err');
        if (errors.length) console.warn(errors.join('\n'));
        e.target.value = '';
        paint();
      });
    }
  });
  root.addEventListener('input', (e) => {
    if (e.target.id === 'q') {
      q = e.target.value.trim().toLowerCase();
      paint();
    }
  });
  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) {
      filter = f.dataset.f;
      paint();
    } else if (e.target.closest('#sel-urgent')) {
      const ids = vehicles().filter(urgent).map((v) => v.id);
      store.patch('fleet', { selected: ids, paid: false, snapshot: null, ref: null, sent: {} });
      paint();
    } else if (e.target.closest('#book')) {
      go('/flotte/planning');
    }
  });
  paint();
  return root;
}
