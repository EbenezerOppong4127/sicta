// Facturation groupée (maquette « Facturation Groupée ») : compte, barème, décompte, règlement B2B.
import { COMPANY, FLEET_DISCOUNT, FLEET_PAY, PAYMENTS, TARIFFS, TVA } from '../data.js';
import { el, esc, fmt, ic, money, normPhone, phonePretty } from '../util.js';
import { buildPlan, center, fleetBill, newFleetRef, selectedFleet } from '../domain.js';
import { store } from '../store.js';
import { payModal, phoneField, stepper } from '../components/ui.js';

export default function facturation({ go }) {
  const f0 = store.get().fleet;
  if (f0.paid && f0.snapshot) return paid(go);
  const vs = selectedFleet();
  if (!vs.length) return { redirect: '/flotte' };
  if (!f0.date) return { redirect: '/flotte/planning' };

  const bill = fleetBill(vs);
  const c = center(f0.centerId);
  const enough = f0.balance >= bill.total;
  let method = FLEET_PAY.find((m) => m.k === f0.method && (m.k !== 'account' || enough)) ? f0.method : 'wave';

  const root = el(`
  <div class="wrap wrap--app stack-lg has-sticky">
    ${stepper(['Sélection', 'Créneaux', 'Facturation', 'Pass'], 2)}

    <section class="card stack">
      <div class="row row--between row--top">
        <div class="row row--gap"><span class="adv__ic">${ic('apartment')}</span><div><span class="eyebrow accent">Compte grand compte</span><h2>${COMPANY.name}</h2></div></div>
        <span class="chip chip--ok"><i class="dot"></i>Certifié</span></div>
      <div class="grid-2">
        <div class="inset"><small class="eyebrow">Réf. dossier flotte</small><b>Dossier à émettre</b></div>
        <div class="inset"><small class="eyebrow">Identifiant fiscal (N° CC)</small><b>${COMPANY.taxId}</b></div>
      </div>
    </section>

    <section class="card stack">
      <div class="row row--between"><h2 class="row row--gap">${ic('receipt_long', 'accent')} Barème officiel CI (${vs.length} véhicule${vs.length > 1 ? 's' : ''})</h2><span class="chip chip--tonal">Arrêté interm.</span></div>
      <ul class="lines lines--rows">${bill.lines.map((l) => `
        <li><span class="adv__ic">${ic(TARIFFS[l.v.tarif].icon)}</span>
          <span class="grow"><b class="small">1x ${esc(TARIFFS[l.v.tarif].label)} (${esc(l.v.short)})</b><br><span class="small muted">Prestation ${fmt(l.base)} + timbre DGI ${fmt(l.tax)}</span></span>
          <span class="amt"><b>${fmt(l.total)}</b><small>FCFA</small></span></li>`).join('')}</ul>
    </section>

    <section class="card stack">
      <h3>Décompte fiscal &amp; administratif</h3>
      <div class="kv"><span>Prestations SICTA</span><span>${money(bill.prestations)}</span></div>
      <div class="kv"><span>Timbres DGI &amp; redevance DGTT <span class="chip chip--tonal">Exonéré TVA</span></span><span>${money(bill.timbres)}</span></div>
      <div class="kv muted small"><span>dont TVA ${Math.round(TVA * 100)} % incluse dans les prestations</span><span>${money(bill.tva)}</span></div>
      <div class="kv accent"><span class="row row--gap">${ic('verified')} Remise flotte grand compte (-${Math.round(FLEET_DISCOUNT * 100)} %)</span><b>-${money(bill.discount)}</b></div>
      <div class="total-card"><div><span class="eyebrow eyebrow--o">Total général TTC</span><div class="amount amount--xl"><b>${fmt(bill.total)}</b> <span>FCFA</span></div>
        <span class="small ok-on-dark">${ic('qr_code_2')} Facture certifiée QR DGI</span></div><span class="total-card__ic">${ic('assured_workload')}</span></div>
    </section>

    <section class="stack">
      <div class="row row--between"><h3>Mode de règlement flotte</h3><span class="chip chip--tonal accent">B2B sécurisé</span></div>
      <div class="rlist" role="radiogroup" aria-label="Mode de règlement">
        ${FLEET_PAY.map((m) => {
          const off = m.k === 'account' && !enough;
          const desc = m.k === 'account'
            ? (off ? `Solde insuffisant : <strong>${money(f0.balance)}</strong>` : `Solde : <strong>${money(f0.balance)}</strong> • débit immédiat sans avance`)
            : m.desc;
          return `<label class="rcard rcard--pay ${off ? 'is-off' : ''}"><input type="radio" name="pm" value="${m.k}" ${m.k === method ? 'checked' : ''} ${off ? 'disabled' : ''}>
            <span class="rcard__b"><span class="row row--gap"><b>${m.label}</b>${m.badge && !off ? `<span class="chip chip--${m.k === 'account' ? 'ok' : 'tonal'}">${m.badge}</span>` : ''}</span><span class="small muted">${desc}</span></span>${ic(m.icon, 'muted')}</label>`;
        }).join('')}
      </div>
      <div id="phone-box" class="card" hidden>${phoneField(f0.phone)}</div>
    </section>

    <p class="note small">${ic('verified_user')} Paiement chiffré 256 bits certifié BCEAO. Facture normalisée avec TVA déductible émise automatiquement.</p>

    <section class="card row row--between"><span class="row row--gap"><span class="adv__ic">${ic('garage_home')}</span><span><small class="eyebrow">Centre de passage affecté</small><br><b>${esc(c.name)}</b></span></span><b class="accent small">Prioritaire</b></section>

    <div class="sticky-cta sticky-cta--nav"><div class="sticky-cta__in stack">
      <button class="btn btn--cta btn--lg btn--block" id="pay">${ic('lock')}<span>Confirmer et payer la flotte (${fmt(bill.total)} FCFA)</span></button>
      <p class="small muted center-text">Les ${vs.length} e-Pass d’inspection seront générés et envoyés par SMS / WhatsApp.</p></div></div>
  </div>`);

  const phoneBox = root.querySelector('#phone-box');
  const phoneIn = root.querySelector('[name=phone]');
  const err = root.querySelector('.phone-error');
  const hint = root.querySelector('.pay-hint');
  const paint = () => {
    const def = FLEET_PAY.find((m) => m.k === method);
    phoneBox.hidden = !def.phone;
    hint.textContent = def.phone ? PAYMENTS[method].ussd : '';
    root.querySelectorAll('.rcard--pay').forEach((r) => r.classList.toggle('is-on', r.querySelector('input').value === method && !r.querySelector('input').disabled));
  };
  root.addEventListener('change', (e) => {
    if (e.target.name !== 'pm') return;
    method = e.target.value;
    store.patch('fleet', { method });
    paint();
  });
  phoneIn.addEventListener('input', () => {
    err.textContent = '';
    store.patch('fleet', { phone: phoneIn.value });
  });

  const btn = root.querySelector('#pay');
  btn.addEventListener('click', async () => {
    const def = FLEET_PAY.find((m) => m.k === method);
    let phone = '';
    if (def.phone) {
      phone = normPhone(phoneIn.value);
      if (!phone) {
        err.textContent = 'Numéro invalide : 10 chiffres, ex. 07 08 11 22 33.';
        return phoneIn.focus();
      }
      phoneIn.value = phonePretty(phone);
    }
    btn.disabled = true;
    await payModal({ method, phone, amount: money(bill.total) });
    const f = store.get().fleet;
    const { plan } = buildPlan(vs, f);
    store.patch('fleet', {
      method, phone, paid: true, ref: newFleetRef(), sent: {},
      balance: method === 'account' ? f.balance - bill.total : f.balance,
      snapshot: { total: bill.total, centerId: f.centerId, mode: f.mode, plan: plan.map((p) => ({ id: p.v.id, date: p.date, start: p.start, end: p.end })) },
    });
    go('/flotte/pass', { replace: true });
  });
  paint();
  return root;
}

/** Facture déjà réglée : on renvoie vers le Pass plutôt que de repayer. */
function paid(go) {
  const f = store.get().fleet;
  const root = el(`
  <div class="wrap wrap--app stack-lg">
    <section class="card center-text stack"><span class="okmark">${ic('verified')}</span><h1 class="h2">Facture réglée</h1>
      <p class="muted">${esc(f.ref)} · ${money(f.snapshot.total)}</p>
      <a class="btn btn--cta btn--lg" href="#/flotte/pass">${ic('qr_code_2')}<span>Voir les Pass &amp; Dispatch</span></a>
      <button class="btn btn--ghost" id="new">${ic('add')}<span>Nouvelle programmation</span></button></section>
  </div>`);
  root.querySelector('#new').onclick = () => {
    store.patch('fleet', { paid: false, snapshot: null, ref: null, sent: {} });
    go('/flotte');
  };
  return root;
}
