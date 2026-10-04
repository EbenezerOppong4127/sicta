// Planification flotte (Image_20) : centre, mode de passage, créneaux par véhicule.
import { CENTERS, LANES } from '../data.js';
import { dateLong, dayNum, durLabel, el, esc, fmt, ic, isSunday, monthShort, money, nextWorkday, toast, todayISO, addDays } from '../util.js';
import { buildPlan, center, defaultFleetDate, fleetTotal, selectedFleet } from '../domain.js';
import { store } from '../store.js';
import { plateBadge, stepper } from '../components/ui.js';

export default function planning({ go }) {
  const vs = selectedFleet();
  if (!vs.length) return { redirect: '/flotte' };
  let f = store.get().fleet;
  if (!f.date || f.date < todayISO()) store.patch('fleet', { date: defaultFleetDate() });

  const root = el(`
  <div class="wrap wrap--app stack-lg has-sticky">
    ${stepper(['Sélection', 'Créneaux', 'Facturation', 'Pass'], 1)}
    <section class="card stack" id="center"></section>
    <section><div class="seg" role="radiogroup" aria-label="Mode de passage">
      <button class="seg__b" role="radio" data-mode="groupe"><span>${ic('bolt')}<b>Passage groupé</b></span><small>En continu (jour J)</small></button>
      <button class="seg__b" role="radio" data-mode="etale"><span>${ic('calendar_view_week')}<b>Planning étalé</b></span><small>Dates individualisées</small></button></div>
      <p class="small muted note-s">${ic('info')} Optimisé pour minimiser le temps d’immobilisation de votre parc.</p></section>
    <section class="card row row--between" id="datebox"></section>
    <section id="banner"></section>
    <section class="stack"><div class="row row--between"><h2 class="row row--gap">Créneaux flotte <span class="badge">${vs.length}</span></h2><span class="small muted">Synchronisation continue</span></div><div class="stack" id="cards"></div></section>
    <div class="sticky-cta sticky-cta--nav"><div class="sticky-cta__in">
      <div><span class="eyebrow">Total contrôles (remise flotte incluse)</span><div class="amount"><b id="tot"></b> <span>FCFA</span></div><span class="small muted">TVA &amp; macarons inclus</span></div>
      <button class="btn btn--cta btn--lg" id="next"><span>Facturation</span>${ic('arrow_forward')}</button></div></div>
  </div>`);

  const paint = () => {
    f = store.get().fleet;
    const c = center(f.centerId);
    const { plan, total, overflow } = buildPlan(vs, f);
    root.querySelector('#center').innerHTML = `
      <div class="row row--between"><span class="eyebrow accent">${ic('location_on')} Centre technique agréé</span></div>
      <label class="field"><span class="sr">Centre</span><select id="csel">${CENTERS.map((x) => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <p class="small muted">${ic('map')} ${c.addr ? esc(c.addr) : esc(c.city)}</p>
      <div class="note row row--between"><span class="row row--gap"><i class="dot dot--pulse"></i>${c.wait} min / véhicule</span><b class="ok">${ic('speed')} ${c.fast ? '4 pistes dédiées ouvertes' : 'Pistes ouvertes'}</b></div>`;
    root.querySelectorAll('.seg__b').forEach((b) => b.setAttribute('aria-checked', b.dataset.mode === f.mode));
    root.querySelector('#datebox').innerHTML = f.mode === 'groupe'
      ? `<div class="row row--gap"><span class="datebadge"><small>${monthShort(f.date).toUpperCase()}</small><b>${dayNum(f.date)}</b></span><div><span class="eyebrow">Date du convoi</span><h3>${dateLong(f.date)}</h3></div></div>
         <label class="btn btn--tonal btn--sm">${ic('edit_calendar')}<span>Modifier</span><input type="date" id="dpick" class="sr-date" min="${addDays(todayISO(), 1)}" value="${f.date}"></label>`
      : `<div class="row row--gap"><span class="datebadge"><small>${monthShort(plan[0].date).toUpperCase()}</small><b>${dayNum(plan[0].date)}</b></span><div><span class="eyebrow">Premier passage</span><h3>${dateLong(plan[0].date)}</h3></div></div><span class="small muted">Une date par véhicule ↓</span>`;
    root.querySelector('#banner').innerHTML = f.mode === 'groupe'
      ? `<div class="banner ${overflow ? 'banner--warn' : ''}"><span class="row row--gap">${ic('timer')}<span><small class="eyebrow">Rotation convoi optimisée</small><br><b>Durée totale : ${durLabel(total)}</b></span></span>
         <span class="chip ${overflow ? 'chip--warn' : 'chip--ok'}">${overflow ? `${ic('warning')} Dépasse ${c.hours.close.replace(':', 'h')}` : `${ic('check_circle')} 0 attente`}</span></div>
         ${overflow ? `<p class="small field__error">Le convoi dépasse l’heure de fermeture du centre : passez en planning étalé ou retirez un véhicule.</p>` : ''}`
      : `<div class="banner"><span class="row row--gap">${ic('calendar_view_week')}<span><small class="eyebrow">Planning étalé</small><br><b>${new Set(plan.map((p) => p.date)).size} jour(s) de passage</b></span></span><span class="chip chip--ok">${ic('check_circle')} 0 attente</span></div>`;
    root.querySelector('#cards').innerHTML = plan.map(({ v, date, start, end }, i) => `
      <article class="card stack"><div class="row row--between row--top"><div>${plateBadge(v.plate)}<p><b>${esc(v.short)}</b> <span class="muted">(${esc(v.role)})</span></p></div><span class="idx">#${i + 1}</span></div>
        <div class="inset stack-s">
          <div class="kv"><span>${ic('alt_route')} Affectation piste</span><b>${LANES[v.cat]}</b></div>
          <div class="kv"><span>${ic('schedule')} Créneau confirmé</span><span class="slotpill">${start} - ${end}</span></div>
          ${f.mode === 'etale' ? `<div class="kv"><span>${ic('event')} Date</span><input type="date" class="mini-date" data-vid="${v.id}" min="${addDays(todayISO(), 1)}" value="${date}"></div>` : ''}
          <div class="kv"><span>${ic('person')} Chauffeur attitré</span><span class="ell">${esc(v.driver)}${v.phone ? ` (+225 ${v.phone.replace(/(\d{2})(?=\d)/g, '$1 ').trim()})` : ''}</span></div>
        </div></article>`).join('');
    root.querySelector('#tot').textContent = fmt(fleetTotal(vs));
    root.querySelector('#next').disabled = f.mode === 'groupe' && overflow;
  };

  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'csel') store.patch('fleet', { centerId: t.value });
    else if (t.id === 'dpick' || t.matches('.mini-date')) {
      let d = t.value || defaultFleetDate();
      if (isSunday(d)) {
        d = nextWorkday(d);
        toast('Centres fermés le dimanche : date décalée au lundi.');
      }
      if (t.id === 'dpick') store.patch('fleet', { date: d });
      else store.patch('fleet', { dates: { ...store.get().fleet.dates, [t.dataset.vid]: d } });
    } else return;
    paint();
  });
  root.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]');
    if (m) {
      store.patch('fleet', { mode: m.dataset.mode });
      paint();
    } else if (e.target.closest('#next')) {
      store.patch('fleet', { snapshot: null, paid: false });
      go('/flotte/facturation');
    }
  });
  paint();
  return root;
}
