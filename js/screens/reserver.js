// Parcours particulier : 1 Tarif & centre → 2 Créneau → 3 Véhicule & paiement → 4 Reçu (Pass).
import { CENTERS, LANE_IND, OPS, PAYMENTS, TARIFFS, DOCS } from '../data.js';
import { dateLong, dateShort, dayNum, download, el, esc, fmt, fromMin, ic, monthShort, money, normPhone, normPlate, phonePretty, toMin, weekdayShort } from '../util.js';
import { bookableDays, center, lookup, newBookingRef, passId, price, qrPayload, slotsFor } from '../domain.js';
import { store } from '../store.js';
import { payCards, payModal, plateBadge, qrBlock, stepper } from '../components/ui.js';
import { printSheets } from '../components/print.js';

const STEPS = ['Tarif', 'Créneau', 'Véhicule', 'Reçu'];
const ORDER = ['tarif', 'creneau', 'paiement', 'pass'];

export default function reserver({ params, go }) {
  const step = params.step ?? 'tarif';
  const idx = ORDER.indexOf(step);
  if (idx < 0) return { redirect: '/reserver' };
  const b = store.get().booking;
  if (idx >= 2 && !(b.date && b.time)) return { redirect: '/reserver/creneau' };
  if (idx === 3 && !(b.paid && b.ref)) return { redirect: '/reserver/paiement' };
  const root = el(`<div class="wrap wrap--app stack-lg">${stepper(STEPS, idx)}<div id="step"></div></div>`);
  root.querySelector('#step').append({ tarif, creneau, paiement, pass }[step](go));
  return root;
}

const flowLabel = (c) => (c.flow === 'fluide' ? `Fluide < ${c.wait} min` : `Affluence modérée (${c.wait} min)`);

// ---------- 1. Tarif & centre ----------
function tarif(go) {
  const b = store.get().booking;
  let zone = center(b.centerId).zone;
  const node = el(`
  <form class="stack-lg" novalidate>
    <section class="card stack">
      <h2>Votre véhicule</h2>
      <div class="cat-grid">${Object.entries(TARIFFS).filter(([, t]) => !t.fleetOnly).map(([k, t]) => `<label class="cat"><input type="radio" name="cat" value="${k}" ${b.category === k ? 'checked' : ''}><span>${ic(t.icon)}<b>${t.label}</b><small>${esc(t.sub.split(',').slice(0, 2).join(','))}</small></span></label>`).join('')}</div>
      <div class="chips">${Object.entries(OPS).map(([k, o]) => `<label class="chip-radio"><input type="radio" name="op" value="${k}" ${b.op === k ? 'checked' : ''}><span>${o.label}</span></label>`).join('')}</div>
      <div class="ledger"><dl class="ledger__rows">
        <div><dt>Prestation contrôle technique</dt><dd id="t-base"></dd></div>
        <div><dt>Vignette &amp; timbre fiscal DGI</dt><dd id="t-tax"></dd></div></dl>
        <div class="ledger__total"><span class="eyebrow">Total TTC</span><div class="ledger__amount"><b id="t-total"></b> <span>FCFA</span></div></div></div>
    </section>
    <section class="card stack">
      <div class="sec__head"><h2>Centre d’inspection</h2>
        <div class="chips chips--sm" role="group" aria-label="Zone">
          ${[['abidjan', 'Abidjan'], ['interieur', 'Intérieur']].map(([k, l]) => `<button type="button" class="chip-btn" data-zone="${k}" aria-pressed="${zone === k}">${l}</button>`).join('')}
        </div></div>
      <div class="rlist" role="radiogroup" aria-label="Centre"></div>
    </section>
    <div class="sticky-cta"><div class="sticky-cta__in">
      <div><span class="eyebrow">Tarif légal</span><div class="amount"><b id="amt"></b> <span>FCFA</span></div></div>
      <button class="btn btn--cta" type="submit"><span>Choisir le créneau</span>${ic('arrow_forward')}</button></div></div>
  </form>`);
  const list = node.querySelector('.rlist');
  const paintList = () => {
    const cur = store.get().booking.centerId;
    list.innerHTML = CENTERS.filter((c) => c.zone === zone).map((c) => `
      <label class="rcard"><input type="radio" name="center" value="${c.id}" ${c.id === cur ? 'checked' : ''}>
        <span class="rcard__b"><b>${esc(c.name)}</b>
        <span class="muted small">${c.addr ? esc(c.addr) : esc(c.city)} · ${c.hours.open.replace(':', 'h')}–${c.hours.close.replace(':', 'h')}</span>
        <span class="chip chip--${c.flow === 'fluide' ? 'ok' : 'warn'}"><i class="dot ${c.flow === 'fluide' ? 'dot--pulse' : ''}"></i>${flowLabel(c)}</span></span></label>`).join('');
  };
  const paintAmt = () => {
    const p = price(node.cat.value, node.op.value);
    node.querySelector('#amt').textContent = fmt(p.total);
    node.querySelector('#t-total').textContent = fmt(p.total);
    node.querySelector('#t-base').textContent = money(p.base);
    node.querySelector('#t-tax').textContent = money(p.tax);
  };
  node.addEventListener('change', (e) => {
    const k = { center: 'centerId', cat: 'category', op: 'op' }[e.target.name];
    if (k) store.patch('booking', { [k]: e.target.value, ...(k === 'centerId' ? { date: null, time: null } : {}) });
    paintAmt();
  });
  node.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zone]');
    if (!z) return;
    zone = z.dataset.zone;
    node.querySelectorAll('[data-zone]').forEach((x) => x.setAttribute('aria-pressed', x === z));
    if (center(store.get().booking.centerId).zone !== zone) store.patch('booking', { centerId: CENTERS.find((c) => c.zone === zone).id, date: null, time: null });
    paintList();
  });
  node.addEventListener('submit', (e) => {
    e.preventDefault();
    go('/reserver/creneau');
  });
  paintList();
  paintAmt();
  return node;
}

// ---------- 2. Créneau ----------
function creneau(go) {
  const b = store.get().booking;
  const c = center(b.centerId);
  const days = bookableDays(7);
  let day = days.includes(b.date) ? b.date : days[0];
  let time = b.date === day ? b.time : null;
  const node = el(`
  <div class="stack-lg">
    <section class="card stack">
      <div class="row row--between"><div class="row row--gap">${ic('location_on', 'accent')}<div><span class="eyebrow">Centre technique agréé</span><h2>${esc(c.name)}</h2><span class="muted small">${c.addr ? esc(c.addr) : esc(c.city)}</span></div></div>
        <a class="link small" href="#/reserver">Changer</a></div>
      <div class="note">${ic('speed')} ${c.fast ? 'Piste haute cadence' : 'Piste standard'} · ${c.lanes} · ${c.wait} min / véhicule</div>
    </section>
    <section class="card stack">
      <h2>Date</h2>
      <div class="days" role="radiogroup" aria-label="Jour">${days.map((d) => `<button type="button" role="radio" class="day" data-day="${d}" aria-checked="${d === day}"><small>${weekdayShort(d)}</small><b>${dayNum(d)}</b><small>${monthShort(d)}</small></button>`).join('')}</div>
      <h2>Heure</h2>
      <div class="slots" role="radiogroup" aria-label="Créneau"></div>
      <p class="small muted">${ic('info')} Modification gratuite jusqu’à 2 h avant le créneau.</p>
    </section>
    <div class="sticky-cta"><div class="sticky-cta__in">
      <div><span class="eyebrow">Votre créneau</span><div class="amount amount--s" id="sel">Choisissez une heure</div></div>
      <button class="btn btn--cta" id="next" type="button" disabled><span>Véhicule &amp; paiement</span>${ic('arrow_forward')}</button></div></div>
  </div>`);
  const slotsEl = node.querySelector('.slots');
  const next = node.querySelector('#next');
  const paint = () => {
    const slots = slotsFor(b.centerId, day);
    slotsEl.innerHTML = slots.length
      ? slots.map((s) => `<button type="button" role="radio" class="slot" data-t="${s.time}" aria-checked="${s.time === time}" ${s.full ? 'disabled' : ''}>${s.time}${s.full ? '<small>Complet</small>' : ''}</button>`).join('')
      : `<p class="muted">Plus de créneau disponible ce jour-là. Choisissez le jour suivant.</p>`;
    node.querySelector('#sel').textContent = time ? `${dateShort(day)} · ${time}` : 'Choisissez une heure';
    next.disabled = !time;
  };
  node.addEventListener('click', (e) => {
    const d = e.target.closest('[data-day]');
    const s = e.target.closest('[data-t]');
    if (d) {
      day = d.dataset.day;
      time = null;
      node.querySelectorAll('.day').forEach((x) => x.setAttribute('aria-checked', x === d));
      paint();
    } else if (s && !s.disabled) {
      time = s.dataset.t;
      paint();
    }
  });
  next.addEventListener('click', () => {
    store.patch('booking', { date: day, time, paid: false, ref: null });
    go('/reserver/paiement');
  });
  paint();
  return node;
}

// ---------- 3. Véhicule & paiement ----------
function paiement(go) {
  const st = store.get();
  const b = st.booking;
  const p = price(b.category, b.op);
  const contact0 = b.contact || st.profile.phone || '';
  const node = el(`
  <form class="stack-lg" novalidate>
    <div class="banner banner--tint" id="dossier" role="status"></div>

    <section class="card stack">
      <div class="row row--between"><h2 class="row row--gap">${ic('directions_car', 'accent')} Identité du véhicule</h2><span class="chip chip--tonal">CI • ${esc(center(b.centerId).city)}</span></div>
      <div class="plate-yellow" aria-live="polite"><span class="plate-yellow__flag"><i></i><i></i><i></i><b>CI</b></span><output id="plate-out">${esc(b.plate || '0000 XX 00')}</output>${ic('shield')}</div>
      <p class="small muted center-text" id="cg-line">${ic('info')} Carte grise N° —</p>
      <label class="field"><span class="field__label">Plaque d’immatriculation</span>
        <span class="field__row plate-row"><span class="field__prefix field__prefix--ci">CI</span><input name="plate" class="plate-input" placeholder="7492 KL 01" autocapitalize="characters" autocomplete="off" value="${esc(b.plate)}" aria-describedby="pl-err"></span>
        <span class="field__error" id="pl-err" role="alert"></span></label>
      <label class="field"><span class="field__label">Marque &amp; modèle</span><span class="field__row"><input name="model" placeholder="Toyota RAV4 (2020)" autocomplete="off" value="${esc(b.model)}"></span></label>
      <div class="grid-2">
        <label class="field"><span class="field__label">Châssis (VIN)</span><span class="field__row"><input name="vin" placeholder="JT3HP10V…" autocapitalize="characters" autocomplete="off" value="${esc(b.vin)}"></span></label>
        <label class="field"><span class="field__label">Kilométrage</span><span class="field__row"><input name="km" inputmode="numeric" placeholder="84 500" autocomplete="off" value="${esc(b.km)}"><span class="field__prefix">km</span></span></label>
      </div>
      <label class="field"><span class="field__label">Propriétaire déclaré</span><span class="field__row"><input name="owner" autocomplete="name" placeholder="Nom et prénoms" value="${esc(b.owner)}"></span></label>
      <label class="field"><span class="field__label">Contact pour rappel SMS</span><span class="field__row"><span class="field__prefix">+225</span><input name="contact" inputmode="tel" autocomplete="tel-national" placeholder="07 08 09 10 11" value="${esc(contact0 ? phonePretty(contact0) : '')}"></span><span class="field__error" id="ct-err" role="alert"></span></label>
    </section>

    <section class="card stack">
      <div class="row row--between"><h2 class="row row--gap">${ic('payments', 'accent')} Mode de règlement</h2><span class="chip chip--ok">${ic('lock')} Instantané</span></div>
      <p class="small muted">Sélectionnez votre réseau de paiement mobile ou bancaire agréé :</p>
      ${payCards(b.method)}
      <div class="inset stack-s">
        <div class="row row--between"><label class="field__label" for="pay-phone" id="pay-label"></label><span class="small accent"><b>Invite USSD automatique</b></span></div>
        <span class="field__row"><span class="field__prefix">CI +225</span><input id="pay-phone" name="phone" inputmode="tel" autocomplete="tel-national" placeholder="07 08 09 10 11" value="${esc(b.phone ? phonePretty(b.phone) : contact0 ? phonePretty(contact0) : '')}" aria-describedby="ph-err"></span>
        <span class="field__error" id="ph-err" role="alert"></span>
        <p class="small muted">${ic('touch_app')} <span id="pay-hint"></span></p>
      </div>
    </section>

    <section class="card stack">
      <h3 class="row row--gap">${ic('receipt_long')} Détail de la tarification réglementaire</h3>
      <div class="kv"><span>${OPS[b.op].label} (${TARIFFS[b.category].label})</span><b>${money(p.base)}</b></div>
      <div class="kv"><span>Timbre fiscal &amp; redevance État</span><b>${money(p.tax)}</b></div>
      <div class="kv"><span class="muted">Frais de réservation en ligne SICTA</span><span class="chip chip--ok">0 FCFA (offert)</span></div>
      <div class="total-card"><div><span class="eyebrow eyebrow--o">Montant total net TTC</span><span class="small ok-on-dark">Reçu fiscal officiel délivré au centre</span></div>
        <div class="amount amount--xl"><b>${fmt(p.total)}</b> <span>FCFA</span></div></div>
    </section>

    <p class="center-text small muted">${ic('verified_user', 'ok')} Paiement crypté 256 bits certifié BCEAO &amp; GIM-UEMOA</p>
    <div class="stack">
      <button class="btn btn--cta btn--lg btn--block" id="pay" type="submit">${ic('lock')}<span>Payer ${fmt(p.total)} FCFA et confirmer le RDV</span></button>
      <p class="center-text small muted">En confirmant, vous acceptez les conditions générales d’inspection technique SICTA CI.</p>
    </div>
  </form>`);

  const f = node;
  let method = b.method;
  let phoneTouched = !!b.phone;
  const dossier = node.querySelector('#dossier');
  const paintDossier = (rec) => {
    dossier.innerHTML = rec
      ? `<span class="banner__ic">${ic('verified')}</span><div><b>Dossier technique pré-rempli</b><br><span class="small muted">Immatriculation certifiée base DGTTM</span></div>`
      : `<span class="banner__ic banner__ic--idle">${ic('edit_note')}</span><div><b>Renseignez votre véhicule</b><br><span class="small muted">Saisissez la plaque : nous retrouvons le dossier s’il est connu.</span></div>`;
    node.querySelector('#cg-line').innerHTML = `${ic('info')} Carte grise N° ${esc(rec?.cg ?? '—')}`;
  };
  const onPlate = () => {
    const plate = normPlate(f.plate.value);
    node.querySelector('#plate-out').textContent = plate ?? (f.plate.value.trim().toUpperCase() || '0000 XX 00');
    const rec = plate ? lookup(plate) : null;
    if (rec && !f.model.value.trim()) f.model.value = rec.model;
    paintDossier(rec);
  };
  const paintPay = () => {
    const P = PAYMENTS[method];
    node.querySelector('#pay-label').textContent = P.field;
    node.querySelector('#pay-hint').textContent = P.ussd;
    node.querySelectorAll('.rcard--pay').forEach((r) => r.classList.toggle('is-on', r.querySelector('input').value === method));
  };
  f.plate.addEventListener('input', onPlate);
  f.contact.addEventListener('input', () => {
    if (!phoneTouched) f.phone.value = f.contact.value;
  });
  f.phone.addEventListener('input', () => (phoneTouched = true));
  f.addEventListener('change', (e) => {
    if (e.target.name === 'pm') {
      method = e.target.value;
      paintPay();
    }
  });

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const plate = normPlate(f.plate.value);
    const phone = normPhone(f.phone.value);
    const contact = f.contact.value.trim() ? normPhone(f.contact.value) : '';
    node.querySelector('#pl-err').textContent = plate ? '' : 'Plaque invalide. Format attendu : 7492 KL 01';
    node.querySelector('#ct-err').textContent = contact === null ? 'Numéro invalide : 10 chiffres.' : '';
    node.querySelector('#ph-err').textContent = phone ? '' : 'Numéro invalide : 10 chiffres, ex. 07 08 09 10 11.';
    if (!plate) return f.plate.focus();
    if (contact === null) return f.contact.focus();
    if (!phone) return f.phone.focus();
    const btn = node.querySelector('#pay');
    btn.disabled = true;
    store.patch('booking', { plate, model: f.model.value.trim(), vin: f.vin.value.trim().toUpperCase(), km: f.km.value.trim(), owner: f.owner.value.trim(), contact: contact || '', method, phone });
    await payModal({ method, phone, amount: money(p.total) });
    store.patch('booking', { paid: true, ref: newBookingRef(), docs: {} });
    go('/reserver/pass', { replace: true });
  });
  onPlate();
  paintPay();
  return node;
}

// ---------- 4. Reçu & Pass ----------
const addMin = (hhmm, d) => fromMin(Math.max(0, toMin(hhmm) + d));

const ics = (b, c) => {
  const stamp = (hhmm) => `${b.date.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SICTA//Pass//FR', 'BEGIN:VEVENT', `UID:${b.ref}@sicta`, `DTSTAMP:${stamp('00:00')}`,
    `DTSTART:${stamp(b.time)}`, `DTEND:${stamp(addMin(b.time, 30))}`, `SUMMARY:Visite technique SICTA ${b.plate}`,
    `LOCATION:${c.name}`, 'DESCRIPTION:Présentez le Pass QR à l’entrée. Documents : carte grise, assurance, pièce d’identité.',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
};

const DOC_ROWS = [
  ['assignment', 'Carte grise originale', 'Pas de photocopie sans visa officiel'],
  ['security', "Attestation d'assurance", 'En cours de validité (papier ou e-attestation)'],
  ['badge', "Pièce d'identité du conducteur", 'CNI, passeport ou permis de conduire'],
  ['qr_code_scanner', 'Ce Pass visite express', 'Sur votre smartphone ou imprimé'],
];

function pass(go) {
  const b = store.get().booking;
  const c = center(b.centerId);
  const p = price(b.category, b.op);
  const id = passId(b.centerId, b.date, b.time);
  const payload = qrPayload({ ref: b.ref, plate: b.plate, date: b.date, time: b.time, centerId: b.centerId });
  const lane = LANE_IND[b.category];
  const where = c.addr ? `${c.addr}` : `${c.city}`;
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`SICTA ${c.name}, Côte d’Ivoire`)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`Pass SICTA ${b.ref} — ${b.plate}, ${dateLong(b.date)} à ${b.time}, ${c.name}.`)}`;
  const docs = b.docs ?? {};
  const node = el(`
  <div class="stack-lg">
    <section class="center-text stack">
      <span class="okmark okmark--ping">${ic('check_circle')}</span>
      <span class="chip chip--tonal self-center">Statut : confirmé &amp; garanti</span>
      <h1 class="h1">Rendez-vous confirmé !</h1>
      <p class="muted small">Votre créneau d’inspection est enregistré auprès du système national SICTA.</p>
      <div class="row row--center">
        <span class="chip chip--tonal chip--lg">N° : <b>#${esc(b.ref)}</b></span>
        <span class="chip chip--cta chip--lg"><i class="dot dot--w"></i>${money(p.total)} payé (${esc(PAYMENTS[b.method].label.replace(' CI', ''))})</span>
      </div>
    </section>

    <article class="ticket card">
      <header class="ticket__head"><span class="ticket__logo">${ic('verified')}</span><div><small class="eyebrow">SICTA officiel</small><b>PASS VISITE EXPRESS</b></div><span class="chip chip--cta">COUPE-FILE</span></header>
      <div class="ticket__qr">${qrBlock(payload, 'lg')}<b class="ticket__id">${esc(id)}</b><span class="small muted">Présentez ce QR code à la borne d’entrée</span></div>
      <div class="tear" aria-hidden="true"></div>
      <div class="meta-grid">
        <div class="meta"><small>${ic('event')} Date</small><b>${dateShort(b.date)}</b><span class="small muted">${dateLong(b.date).split(' ')[0]}</span></div>
        <div class="meta"><small class="accent">${ic('schedule')} Heure de passage</small><b class="accent">${b.time}</b><span class="small muted">Arrivée conseillée : ${addMin(b.time, -15)}</span></div>
        <div class="meta"><small>${ic('directions_car')} Véhicule</small><b>${esc(b.model || 'Véhicule')}</b><span class="plate-txt">${esc(b.plate)}</span></div>
        <div class="meta"><small>${ic('warehouse')} Centre SICTA</small><b>${esc(c.name.split(' — ')[0].replace(' (Centre pilote)', ''))}</b><span class="small ok">${esc(lane)}</span></div>
      </div>
    </article>

    <section class="card stack">
      <div class="row row--gap row--top"><span class="adv__ic">${ic('pin_drop')}</span><div><small class="eyebrow">Emplacement du centre</small><h3>SICTA ${esc(c.name.split(' — ')[0])}</h3><p class="small muted">${esc(where)}</p></div></div>
      <div class="mapcard" aria-hidden="true"><svg viewBox="0 0 320 110" preserveAspectRatio="xMidYMid slice"><rect width="320" height="110" fill="#dfe9f7"/><path d="M-10 78 C60 60 90 96 160 70 S280 40 340 58" stroke="#fff" stroke-width="12" fill="none"/><path d="M40 -10 L90 120" stroke="#fff" stroke-width="7"/><path d="M200 -10 L170 120" stroke="#fff" stroke-width="7"/><path d="M-10 30 L340 22" stroke="#f3f7fd" stroke-width="5"/><circle cx="160" cy="62" r="9" fill="#fe6a34"/><circle cx="160" cy="62" r="3.5" fill="#fff"/></svg><span class="chip chip--tonal"><i class="dot dot--pulse"></i>${esc(lane)}</span></div>
      <div class="grid-2">
        <a class="btn btn--primary" target="_blank" rel="noopener" href="${maps}">${ic('near_me')}<span>Itinéraire (Maps)</span></a>
        <button class="btn btn--tonal" id="cal" type="button">${ic('calendar_add_on')}<span>Au calendrier</span></button>
      </div>
    </section>

    <section class="card stack">
      <div class="row row--between"><h2 class="row row--gap">${ic('checklist', 'accent')} Documents obligatoires</h2><span class="chip chip--tonal" id="doc-n">Jour J</span></div>
      <p class="small muted">Présentation physique indispensable aux agents vérificateurs. Cochez au fur et à mesure :</p>
      <ul class="stack-s">${DOC_ROWS.map(([i, t, d], n) => `<li><label class="docrow"><input type="checkbox" data-d="${n}" ${docs[n] ? 'checked' : ''}><span class="docrow__ic">${ic(i)}</span><span class="grow"><b class="small">${t}</b><br><span class="small muted">${d}</span></span><span class="docrow__ck">${ic('check')}</span></label></li>`).join('')}</ul>
    </section>

    <div class="stack">
      <button class="btn btn--cta btn--lg btn--block" id="pdf" type="button">${ic('download')}<span>Télécharger le Pass (PDF officiel)</span></button>
      <a class="btn btn--tonal btn--lg btn--block" id="share" target="_blank" rel="noopener" href="${wa}">${ic('share')}<span>Partager sur WhatsApp</span></a>
      <button class="btn btn--ghost btn--block" id="done" type="button">Retour à l’accueil</button>
    </div>
  </div>`);

  const count = () => {
    const n = Object.values(store.get().booking.docs ?? {}).filter(Boolean).length;
    node.querySelector('#doc-n').textContent = n === DOC_ROWS.length ? 'Tout est prêt ✓' : `${n}/${DOC_ROWS.length} prêts`;
  };
  node.addEventListener('change', (e) => {
    if (e.target.dataset.d === undefined) return;
    store.patch('booking', { docs: { ...store.get().booking.docs, [e.target.dataset.d]: e.target.checked } });
    count();
  });
  node.querySelector('#cal').onclick = () => download(`sicta-${b.ref}.ics`, ics(b, c), 'text/calendar');
  node.querySelector('#pdf').onclick = () =>
    printSheets(`<section class="sheet"><h1>Pass visite technique SICTA</h1><p class="ref">${esc(b.ref)}</p>${qrBlock(payload, 'xl')}<p class="idline">${esc(id)}</p><p class="big">${esc(b.plate)}</p>
      <p>${esc(b.model || '')}<br>${dateLong(b.date)} à ${b.time} (arrivée conseillée ${addMin(b.time, -15)})<br>${esc(c.name)} — ${esc(lane)}</p>
      <p>${OPS[b.op].label} — ${money(p.total)} TTC payés (${esc(PAYMENTS[b.method].label)})</p>
      <p class="docs-list">À présenter : ${DOCS.map((d) => esc(d.t)).join(' · ')}</p></section>`);
  node.querySelector('#done').onclick = () => {
    store.reset('booking');
    go('/simulateur');
  };
  count();
  return node;
}
