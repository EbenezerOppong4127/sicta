// Accueil de l'espace particulier (Image_14) : simulateur officiel de tarif + barème + vérificateur.
import { OPS, TARIFFS } from '../data.js';
import { el, esc, ic, fmt } from '../util.js';
import { price } from '../domain.js';
import { store } from '../store.js';
import { plateCheck } from '../components/plateCheck.js';

export default function simulateur() {
  const { profile, booking } = store.get();
  const root = el(`
  <div class="wrap wrap--app stack-lg">
    <header class="greet">
      <div class="tags"><span class="tag">🇨🇮 Agréé Ministère des Transports</span><span class="tag tag--cert">${ic('verified')}Service officiel</span></div>
      <h1 class="h1">Bonjour ${esc(profile.name)} 👋</h1>
      <p class="muted">Anticipez votre visite technique en toute sérénité</p>
    </header>

    <section class="card sim" id="simulator">
      <div class="sim__head"><span class="sim__ic">${ic('calculate')}</span><div><h2>Simulateur officiel</h2><span class="muted small">Barème d’État en vigueur</span></div><span class="chip chip--tonal">CFA (XOF)</span></div>
      <fieldset class="fs"><legend>Catégorie de véhicule</legend>
        <div class="cat-grid">
          ${Object.entries(TARIFFS).filter(([, t]) => !t.fleetOnly).map(([k, t]) => `<label class="cat"><input type="radio" name="cat" value="${k}" ${booking.category === k ? 'checked' : ''}><span>${ic(t.icon)}<b>${t.label}</b><small>${t.sub.split(',').slice(0, 2).join(',')}</small></span></label>`).join('')}
        </div>
      </fieldset>
      <fieldset class="fs"><legend>Type d’opération</legend>
        <div class="chips">
          ${Object.entries(OPS).map(([k, o]) => `<label class="chip-radio"><input type="radio" name="op" value="${k}" ${booking.op === k ? 'checked' : ''}><span>${o.label}</span></label>`).join('')}
        </div>
      </fieldset>
      <div class="ledger">
        <div class="ledger__total"><div><span class="eyebrow">Redevance totale (TTC)</span><div class="ledger__amount"><b id="total">0</b> <span>FCFA</span></div></div><span class="chip chip--ok">${ic('verified')} Tarif légal</span></div>
        <dl class="ledger__rows">
          <div><dt>Prestation contrôle technique</dt><dd id="base"></dd></div>
          <div><dt>Vignette &amp; timbre fiscal DGI</dt><dd id="tax"></dd></div>
          <div><dt>Validité réglementaire</dt><dd id="months"></dd></div>
        </dl>
      </div>
    </section>

    <a class="cta-card" href="#/reserver" id="go-book">
      <span class="cta-card__ic">${ic('calendar_add_on')}</span>
      <span><b>Prendre rendez-vous</b><small>Évitez l’attente • Créneau garanti</small></span>${ic('arrow_forward')}
    </a>

    <section class="adv">
      <div class="sec__head"><h3>Avantages SICTA Digital</h3><span class="accent small"><b>100 % dématérialisé</b></span></div>
      <div class="adv__grid">
        <div class="card adv__i"><span class="adv__ic">${ic('bolt')}</span><b>Zéro attente</b><small>Couloir prioritaire dédié</small></div>
        <div class="card adv__i"><span class="adv__ic">${ic('sms')}</span><b>Alertes SMS</b><small>Rappel 48 h avant l’échéance</small></div>
        <div class="card adv__i"><span class="adv__ic">${ic('qr_code_2')}</span><b>E-Vignette</b><small>Attestation QR sécurisée</small></div>
      </div>
    </section>

    <section class="card">
      <div class="row row--gap"><span class="adv__ic">${ic('fact_check')}</span><h3>Vérifier l’échéance d’un véhicule</h3></div>
      <p class="muted small">Saisissez la plaque minéralogique pour consulter la date d’expiration de votre contrôle technique.</p>
      <div id="chk"></div>
    </section>

    <section class="bareme">
      <div class="sec__head"><h3>Barème officiel</h3><a class="small" href="#/centres">Voir les centres</a></div>
      <div class="bareme__grid">
        ${Object.entries(TARIFFS).filter(([, t]) => !t.fleetOnly).map(([k, t]) => { const p = price(k); return `
          <article class="card bareme__i"><span class="adv__ic">${ic(t.icon)}</span><b>${t.label}</b><small class="muted">${t.sub}</small>
          <div class="bareme__p"><b>${fmt(p.total)}</b> <span>FCFA TTC</span></div>
          <div class="small muted"><div class="kv"><span>Prestation</span><span>${fmt(p.base)}</span></div><div class="kv"><span>Timbre DGI</span><span>${fmt(p.tax)}</span></div><div class="kv"><span>Validité</span><b>${p.months} mois</b></div></div>
          <button class="btn btn--tonal btn--sm" data-pick="${k}">Choisir ce tarif</button></article>`; }).join('')}
      </div>
    </section>
  </div>`);

  root.querySelector('#chk').append(plateCheck({ placeholder: '8492 JJ 01', initial: '' }));
  const cat = () => root.querySelector('[name=cat]:checked').value;
  const op = () => root.querySelector('[name=op]:checked').value;
  const paint = () => {
    const p = price(cat(), op());
    root.querySelector('#total').textContent = fmt(p.total);
    root.querySelector('#base').textContent = `${fmt(p.base)} FCFA`;
    root.querySelector('#tax').textContent = `${fmt(p.tax)} FCFA`;
    root.querySelector('#months').textContent = op() === 'contre' ? '15 jours ouvrables' : `${p.months} mois`;
    store.patch('booking', { category: cat(), op: op() });
  };
  root.querySelector('#simulator').addEventListener('change', paint);
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    store.patch('booking', { category: b.dataset.pick, op: 'periodique' });
    location.hash = '#/reserver';
  });
  paint();
  return root;
}
