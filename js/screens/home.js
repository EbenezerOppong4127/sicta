// Landing publique (mobile = Image_18, desktop = Image_16).
import { CENTERS, DOCS, FAQ, HOW, PAYMENTS, TESTIMONIALS } from '../data.js';
import { el, esc, ic, money, normPlate } from '../util.js';
import { price } from '../domain.js';
import { store } from '../store.js';
import { plateCheck } from '../components/plateCheck.js';

const CAR = `
<svg class="car" viewBox="0 0 320 150" aria-hidden="true">
  <ellipse cx="160" cy="128" rx="126" ry="8" fill="#000" opacity=".28"/>
  <path d="M26 100 L42 72 Q48 62 60 60 L108 54 L134 32 Q140 26 150 26 L206 26 Q216 26 222 32 L248 58 L280 64 Q294 68 296 82 L298 100 Q298 107 291 107 L33 107 Q26 107 26 100Z" fill="#1e3a8a"/>
  <path d="M124 56 L142 36 L174 36 L174 56Z M182 36 L208 36 L230 56 L182 56Z" fill="#9ed2ff" opacity=".85"/>
  <rect x="244" y="86" width="52" height="14" rx="4" fill="#fe6a34"/>
  <circle cx="290" cy="84" r="5" fill="#fff"/><circle cx="32" cy="84" r="4" fill="#ef4444"/>
  <g class="wheel"><circle cx="90" cy="107" r="21" fill="#111827"/><circle cx="90" cy="107" r="9" fill="#fe6a34"/></g>
  <g class="wheel"><circle cx="238" cy="107" r="21" fill="#111827"/><circle cx="238" cy="107" r="9" fill="#fe6a34"/></g>
  <rect class="scan" x="14" y="10" width="292" height="3" rx="2" fill="#38bdf8"/>
</svg>`;

export default function home({ go }) {
  const b = store.get().booking;
  const root = el(`
  <div class="home">
    <section class="hero">
      <div class="wrap hero__grid">
        <div class="hero__copy">
          <div class="tags">
            <span class="tag tag--live"><i class="dot dot--pulse"></i>Agrément Ministère des Transports CI 🇨🇮</span>
            <span class="tag tag--cert">${ic('verified_user')}Certifié SICTA</span>
          </div>
          <div class="hero__visual" aria-hidden="true">
            ${CAR}
            <span class="hero__chip hero__chip--l">${ic('view_in_ar')} Inspection 3D • Diagnostic IA</span>
            <span class="hero__chip hero__chip--r">${ic('bolt')} Coupe-File</span>
            <div class="hero__panel">${ic('document_scanner')}<div><b>Contrôle 124 points sécurité</b><span>Freinage • Éclairage • Émissions</span></div>${ic('check_circle')}</div>
          </div>
          <h1 class="display">Votre visite technique en 1 clic, <span class="accent">sans file d’attente</span></h1>
          <p class="lead">Réservez votre créneau garanti dans les 32 centres SICTA de Côte d’Ivoire. Payez par Wave, Orange Money ou MoMo et recevez votre Pass QR officiel immédiatement.</p>
          <div class="metrics">
            <div class="metric"><span class="metric__ic metric__ic--o">${ic('timer')}</span><b>0 min</b><span>Coupe-file</span></div>
            <div class="metric"><span class="metric__ic metric__ic--b">${ic('pin_drop')}</span><b>32</b><span>Centres CI</span></div>
            <div class="metric"><span class="metric__ic metric__ic--g">${ic('qr_code_2')}</span><b>100%</b><span>Pass digital</span></div>
          </div>
          <div class="stack">
            <a class="btn btn--cta btn--lg" href="#/simulateur">${ic('speed')}<span>Démarrer le simulateur &amp; réserver</span>${ic('arrow_forward')}</a>
            <button class="btn btn--ghost btn--lg" id="toggle-check" type="button" aria-expanded="false" aria-controls="check-panel">${ic('search')}<span>Vérifier la validité de ma carte grise</span></button>
            <div class="panel" id="check-panel" hidden>
              <div class="panel__head"><b>Contrôle express par immatriculation</b><button class="icon-btn" id="close-check" aria-label="Fermer" type="button">${ic('close')}</button></div>
            </div>
            <a class="btn btn--tonal" href="#/pro">${ic('corporate_fare')}<span>Espace flotte &amp; entreprises</span></a>
          </div>
        </div>

        <aside class="express card" aria-label="Réservation express">
          <div class="express__head"><b><i class="dot"></i> Prendre RDV en voie express</b><span class="chip chip--tonal">Coupe-file</span></div>
          <form id="express" novalidate>
            <fieldset class="fs"><legend>1. Type de véhicule</legend>
              <div class="cat-grid">
                ${[['vl', 'Particulier', 'directions_car'], ['util', 'Transport / util.', 'airport_shuttle'], ['pl', 'Poids lourd', 'local_shipping'], ['moto', '2 - 3 roues', 'two_wheeler']]
                  .map(([k, l, i]) => `<label class="cat"><input type="radio" name="cat" value="${k}" ${b.category === k ? 'checked' : ''}><span>${ic(i)}<b>${l}</b></span></label>`).join('')}
              </div>
            </fieldset>
            <label class="field"><span class="field__label">2. Plaque d’immatriculation CI</span>
              <span class="field__row plate-row"><span class="field__prefix field__prefix--ci">CI</span>
              <input name="plate" class="plate-input" placeholder="Ex : 7492 KL 01" autocapitalize="characters" autocomplete="off" value="${esc(b.plate)}"></span>
              <span class="field__error" id="ex-err" role="alert"></span></label>
            <label class="field"><span class="field__label">3. Centre d’inspection</span>
              <select name="center">${CENTERS.map((c) => `<option value="${c.id}" ${c.id === b.centerId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
            <div class="tariff"><div><b>Tarif légal homologué</b><span class="muted small">Prestation + timbre fiscal DGI</span></div><div class="tariff__v" id="ex-price"></div></div>
            <button class="btn btn--cta btn--lg btn--block" type="submit"><span>Calculer &amp; prendre RDV en voie express</span>${ic('arrow_forward')}</button>
            <p class="small muted center-text">${ic('check_circle', 'ok')} 0 FCFA de frais en ligne &nbsp;•&nbsp; ${ic('schedule', 'ok')} moins de 20 min</p>
          </form>
        </aside>
      </div>
    </section>

    <section class="wrap sec">
      <div class="sec__head"><h2>Comment ça marche ?</h2><span class="accent small"><b>3 étapes simples</b></span></div>
      <ol class="how">${HOW.map((s, i) => `<li class="card how__i"><span class="num num--${i}">${i + 1}</span><div><b>${s.t}</b><p class="muted small">${s.d}</p></div></li>`).join('')}</ol>
    </section>

    <section class="wrap sec">
      <div class="card pay-band">
        <div class="pay-band__head"><b class="eyebrow">Règlement national sécurisé</b><span class="ok small">${ic('lock')} 256-bit SSL</span></div>
        <div class="pay-row">
          ${Object.values(PAYMENTS).map((p) => `<span class="pay-chip"><i class="pay-dot" style="background:${p.color};color:${p.fg}">${p.short}</i>${p.label}</span>`).join('')}
          <span class="pay-chip">${ic('credit_card')}Visa / Mastercard</span>
        </div>
      </div>
      <div class="card ticker"><i class="dot dot--ping"></i><p><b>Dernière réservation :</b> Toyota RAV4 • Centre Vridi • il y a 3 min</p></div>
    </section>

    <section class="wrap sec">
      <div class="docs card card--dark">
        <span class="eyebrow eyebrow--o">Préparez votre passage</span>
        <h2>Les 4 documents à présenter le jour du contrôle</h2>
        <div class="docs__grid">${DOCS.map((d, i) => `<div class="docs__i"><span class="num num--o">${i + 1}</span><b>${d.t}</b><p class="small">${d.d}</p></div>`).join('')}</div>
        <p class="small docs__note">${ic('info')} Véhicule présenté avec un niveau d’huile correct, des phares propres et des ceintures opérationnelles.</p>
      </div>
    </section>

    <section class="wrap sec">
      <div class="sec__head"><h2>Ce que disent les automobilistes</h2></div>
      <div class="testi">${TESTIMONIALS.map((t) => `<figure class="card testi__i"><blockquote>« ${t.q} »</blockquote><figcaption><span class="avatar">${t.i}</span><span><b>${t.n}</b><br><span class="muted small">${t.r}</span></span></figcaption></figure>`).join('')}</div>
    </section>

    <section class="wrap wrap--narrow sec">
      <div class="sec__head"><h2>Questions fréquentes</h2></div>
      <div class="faq">${FAQ.map((f) => `<details class="card faq__i"><summary>${f.q}${ic('keyboard_arrow_down')}</summary><div class="muted">${f.a}</div></details>`).join('')}</div>
    </section>

    <section class="cta-final">
      <div class="wrap center-text">
        <h2>Ne risquez plus l’amende : réservez votre créneau coupe-file aujourd’hui.</h2>
        <div class="row row--center">
          <a class="btn btn--cta btn--lg" href="#/reserver">${ic('calendar_month')}<span>Prendre RDV en voie express</span></a>
          <a class="btn btn--glass btn--lg" href="tel:1300">${ic('call')}<span>Assistance 1300</span></a>
        </div>
      </div>
    </section>
  </div>`);

  // Vérificateur inline (toggle)
  const panel = root.querySelector('#check-panel');
  const toggle = root.querySelector('#toggle-check');
  panel.append(plateCheck());
  const setOpen = (o) => {
    panel.hidden = !o;
    toggle.setAttribute('aria-expanded', o);
    if (o) panel.querySelector('input').focus();
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  root.querySelector('#close-check').addEventListener('click', () => setOpen(false));

  // Carte express (desktop)
  const f = root.querySelector('#express');
  const priceEl = root.querySelector('#ex-price');
  const upd = () => (priceEl.innerHTML = `<b>${money(price(f.cat.value).total).replace(' FCFA', '')}</b> <span>FCFA</span>`);
  f.addEventListener('change', upd);
  upd();
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = f.plate.value.trim();
    const plate = normPlate(raw);
    if (raw && !plate) return void (root.querySelector('#ex-err').textContent = 'Format attendu : 7492 KL 01');
    store.patch('booking', { category: f.cat.value, centerId: f.center.value, plate: plate ?? '' });
    go('/reserver/creneau');
  });
  return root;
}
