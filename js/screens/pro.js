// SICTA Pro : page commerciale B2B (simulateur de parc, offre, demande de convention).
import { PRO_FAQ, PRO_FLEET, PRO_MIN_MOBILE, PRO_PILLARS, PRO_SIZES, PRO_STEPS, PRO_TESTI, PRO_ZONES } from '../data.js';
import { el, esc, fmt, ic, normPhone, phonePretty, toast } from '../util.js';
import { proEstimate } from '../domain.js';
import { store } from '../store.js';

const sizeFor = (n) => (n < 20 ? 0 : n < 50 ? 1 : n < 150 ? 2 : 3);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function pro() {
  const counts = Object.fromEntries(PRO_FLEET.map((f) => [f.k, f.def]));
  let mode = 'station';
  const root = el(`
  <div class="pro">
    <section class="hero hero--pro"><div class="wrap hero__grid hero__grid--pro">
      <div class="hero__copy">
        <span class="tag tag--live"><i class="dot dot--pulse"></i>Accréditation officielle — Ministère des Transports CI</span>
        <h1 class="display">Optimisez la conformité et la sécurité de votre <span class="accent">parc automobile</span> en Côte d’Ivoire.</h1>
        <p class="lead">Solution dédiée aux entreprises de 5 à 1 000+ véhicules : prise en charge prioritaire sans file d’attente, unités mobiles d’inspection sur site, facturation centralisée et gestion numérique des Pass.</p>
        <div class="row row--wrap"><button class="btn btn--cta btn--lg" data-go="form">${ic('verified_user')}<span>Demander une offre flotte pro</span></button>
          <button class="btn btn--ghost btn--lg" data-go="sim">${ic('calculate')}<span>Simuler votre audit de parc</span></button></div>
        <ul class="proof"><li>${ic('timer')} &lt; 20 min d’inspection</li><li>${ic('airport_shuttle')} Unités mobiles sur site</li><li>${ic('receipt_long')} Facture unique</li></ul>
      </div>
      <div class="hero__visual hero__visual--pro" aria-hidden="true"><div class="provis"><span class="chip chip--ok"><i class="dot dot--pulse"></i>Ligne prioritaire B2B active</span>
        <div class="provis__row">${['local_shipping', 'airport_shuttle', 'directions_car', 'two_wheeler'].map((i) => `<span class="provis__ic">${ic(i)}</span>`).join('')}</div>
        <b>Inspection simultanée multi-véhicules</b><span class="small">Taux de conformité 99,4 % · -65 % d’immobilisation</span></div></div>
    </div></section>

    <section class="wrap sec"><div class="metrics metrics--4">
      <div class="metric"><b>+450</b><span>Entreprises partenaires</span></div><div class="metric"><b>32</b><span>Centres fixes agréés</span></div>
      <div class="metric"><b>6</b><span>Unités mobiles privées</span></div><div class="metric"><b>100%</b><span>Agrément État</span></div></div></section>

    <section class="wrap sec" id="sim">
      <div class="stack"><span class="eyebrow accent">Outil d’optimisation financière &amp; logistique</span><h2 class="h1">Simulateur de gestion de parc SICTA grand compte</h2>
        <p class="muted">Configurez la typologie de votre flotte et visualisez les gains de temps d’immobilisation, la cadence d’inspection et votre estimation annuelle.</p></div>
      <div class="pro-sim">
        <div class="card stack">
          <div class="row row--between"><h3>1. Composition de votre parc</h3><button class="link small" type="button" id="reset">Réinitialiser</button></div>
          ${PRO_FLEET.map((f) => `<div class="slider"><div class="row row--between row--top"><span class="row row--gap"><span class="adv__ic">${ic(f.icon)}</span><span><b class="small">${f.label}</b><br><span class="small muted">${f.sub}</span></span></span>
            <output class="slider__v" id="o-${f.k}">${f.def}</output></div>
            <input type="range" min="0" max="${f.max}" step="1" value="${f.def}" data-k="${f.k}" aria-label="${f.label}"><div class="row row--between small muted"><span>0</span><span>${f.max}+</span></div></div>`).join('')}
          <h3>2. Mode d’exécution souhaité</h3>
          <div class="seg" role="radiogroup" aria-label="Mode d’exécution">
            <button class="seg__b" role="radio" data-mode="station" type="button"><span>${ic('garage_home')}<b>Ligne dédiée en station</b></span><small>Couloir coupe-file dans l’un des centres</small></button>
            <button class="seg__b" role="radio" data-mode="mobile" type="button"><span>${ic('airport_shuttle')}<b>Unité mobile sur site</b></span><small>Banc d’essai mobile chez vous</small></button></div>
          <p class="field__error" id="mob-warn" hidden>Une unité mobile nécessite au moins ${PRO_MIN_MOBILE.vl} véhicules légers ou ${PRO_MIN_MOBILE.pl} poids lourds par session.</p>
        </div>
        <aside class="card card--dark stack pro-res" aria-live="polite">
          <div class="row row--between"><b>Bilan prévisionnel flotte</b><span class="chip chip--cta">B2B conventionné</span></div>
          <div class="grid-2"><div class="res"><small>Volume flotte totale</small><b id="r-vol"></b><span>véhicules</span></div><div class="res"><small>Heures épargnées / an</small><b id="r-h"></b><span>d’immobilisation</span></div></div>
          <dl class="res__rows"><div><dt>Fréquence estimée</dt><dd id="r-days"></dd></div><div><dt>Visites par an</dt><dd id="r-visits"></dd></div><div><dt>Gestionnaire de compte attitré</dt><dd>Oui (inclus)</dd></div><div><dt>Facturation centralisée</dt><dd>Relevé unique groupé</dd></div></dl>
          <div class="total-card total-card--in"><div><small class="eyebrow eyebrow--o">Estimation annuelle TTC</small><div class="amount amount--xl"><b id="r-tot"></b> <span>FCFA</span></div><span class="small" id="r-disc"></span></div></div>
          <p class="small muted-on-dark">Tarif indicatif au barème d’État, remise grand compte incluse ; sujet à convention cadre.</p>
          <button class="btn btn--cta btn--lg btn--block" data-go="form">${ic('assignment')}<span>Recevoir la convention grand compte</span></button>
        </aside>
      </div>
    </section>

    <section class="wrap sec"><div class="stack center-text"><span class="eyebrow accent">Conçu pour l’efficacité opérationnelle</span><h2 class="h1">Les 4 piliers de l’offre SICTA Entreprises</h2></div>
      <div class="pillars">${PRO_PILLARS.map((p, i) => `<article class="card stack"><span class="adv__ic">${ic(p.icon)}</span><span class="eyebrow">Pilier 0${i + 1}</span><h3>${p.t}</h3><p class="small muted">${p.d}</p><b class="small accent">${p.k}</b></article>`).join('')}</div></section>

    <section class="wrap sec"><div class="stack center-text"><h2 class="h1">Comment fonctionne le parcours entreprise ?</h2></div>
      <ol class="how how--pro">${PRO_STEPS.map((s, i) => `<li class="card how__i stack"><span class="num num--${i}">${i + 1}</span><h3>${s.t}</h3><p class="small muted">${s.d}</p><span class="chip chip--tonal">${ic(s.icon)} ${s.k}</span></li>`).join('')}</ol></section>

    <section class="wrap sec"><div class="sec__head"><h2>Ils font confiance à SICTA pour leur parc</h2><span class="chip chip--ok">★ 4,9 / 5 gestionnaires</span></div>
      <div class="testi testi--2">${PRO_TESTI.map((t) => `<figure class="card testi__i"><blockquote>« ${t.q} »</blockquote><figcaption><span class="avatar">${t.i}</span><span><b>${t.n}</b><br><span class="muted small">${t.r}</span></span></figcaption></figure>`).join('')}</div></section>

    <section class="sec sec--dark" id="form"><div class="wrap pro-form">
      <div class="stack"><span class="eyebrow eyebrow--o">Engagement de service B2B</span><h2 class="h1 on-dark">Demandez votre audit de parc gratuit et sans engagement</h2>
        <p class="on-dark-muted">Un conseiller grands comptes dédié analyse la configuration de votre flotte sous 2 heures et vous soumet un planning de passage sur mesure.</p>
        <ul class="stack on-dark-muted"><li>${ic('check_circle')} Analyse technique préventive des organes de sécurité</li><li>${ic('schedule')} Rappel garanti sous 2 h, du lundi au samedi (7h30–18h00)</li><li>${ic('headset_mic')} Ligne directe : <a href="tel:+2252721752200">+225 27 21 75 22 00</a></li></ul></div>
      <form class="card stack" id="lead" novalidate>
        <h3>Formulaire de convention flotte entreprise</h3>
        <label class="field"><span class="field__label">Raison sociale de l’entreprise *</span><span class="field__row"><input name="company" autocomplete="organization" placeholder="Ex. Logistique du Port d’Abidjan SA"></span><span class="field__error" role="alert"></span></label>
        <label class="field"><span class="field__label">Nom &amp; titre du responsable *</span><span class="field__row"><input name="contact" autocomplete="name" placeholder="Ex. Koné Mamadou, directeur logistique"></span><span class="field__error" role="alert"></span></label>
        <div class="grid-2">
          <label class="field"><span class="field__label">Téléphone professionnel *</span><span class="field__row"><span class="field__prefix">+225</span><input name="phone" inputmode="tel" autocomplete="tel-national" placeholder="07 00 00 00 00"></span><span class="field__error" role="alert"></span></label>
          <label class="field"><span class="field__label">Email professionnel *</span><span class="field__row"><input name="email" type="email" inputmode="email" autocomplete="email" placeholder="nom@entreprise.ci"></span><span class="field__error" role="alert"></span></label></div>
        <div class="grid-2">
          <label class="field"><span class="field__label">Taille approximative du parc *</span><select name="size"><option value="">Sélectionner le volume</option>${PRO_SIZES.map((s, i) => `<option value="${i}">${s}</option>`).join('')}</select><span class="field__error" role="alert"></span></label>
          <label class="field"><span class="field__label">Zone d’exploitation principale *</span><select name="zone"><option value="">Sélectionner la localité</option>${PRO_ZONES.map((z) => `<option>${z}</option>`).join('')}</select><span class="field__error" role="alert"></span></label></div>
        <fieldset class="fs"><legend>Option d’inspection souhaitée</legend><div class="chips"><label class="chip-radio"><input type="radio" name="opt" value="station" checked><span>Couloir prioritaire en centre</span></label><label class="chip-radio"><input type="radio" name="opt" value="mobile"><span>Unité mobile dans nos dépôts</span></label></div></fieldset>
        <button class="btn btn--cta btn--lg btn--block" type="submit">${ic('phone_in_talk')}<span>Être rappelé par un conseiller sous 2 h</span></button>
        <p class="small muted">Vos données professionnelles sont traitées pour l’exécution du service public SICTA et ne sont pas partagées.</p>
      </form></div></section>

    <section class="wrap wrap--narrow sec"><div class="sec__head"><h2>Foire aux questions flottes &amp; entreprises</h2></div>
      <div class="faq">${PRO_FAQ.map((f) => `<details class="card faq__i"><summary>${f.q}${ic('keyboard_arrow_down')}</summary><div class="muted">${f.a}</div></details>`).join('')}</div></section>

    <section class="cta-final"><div class="wrap center-text"><h2>Prêt à digitaliser et sécuriser le contrôle de votre flotte ?</h2>
      <p class="on-dark-muted">Rejoignez les entreprises bénéficiant du statut prioritaire SICTA Pro.</p>
      <div class="row row--center"><a class="btn btn--cta btn--lg" href="#/flotte">${ic('corporate_fare')}<span>Ouvrir mon espace entreprise</span></a></div></div></section>
  </div>`);

  const $ = (s) => root.querySelector(s);
  const paint = () => {
    const r = proEstimate(counts, mode);
    $('#r-vol').textContent = r.volume;
    $('#r-h').textContent = `~${r.hours} h`;
    $('#r-days').textContent = r.volume ? `Campagne de ${r.days} jour${r.days > 1 ? 's' : ''} / an` : '—';
    $('#r-visits').textContent = fmt(r.visits);
    $('#r-tot').textContent = fmt(r.total);
    $('#r-disc').textContent = r.discount ? `dont remise grand compte -${fmt(r.discount)} FCFA` : '';
    root.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-checked', b.dataset.mode === mode));
    const warn = mode === 'mobile' && !r.mobileOk;
    $('#mob-warn').hidden = !warn;
    $('[name=size]').value = r.volume ? String(sizeFor(r.volume)) : $('[name=size]').value;
  };
  root.addEventListener('input', (e) => {
    const k = e.target.dataset?.k;
    if (!k) return;
    counts[k] = Number(e.target.value);
    $(`#o-${k}`).textContent = counts[k];
    paint();
  });
  root.addEventListener('click', (e) => {
    const t = e.target;
    const m = t.closest('[data-mode]');
    const g = t.closest('[data-go]');
    if (m) { mode = m.dataset.mode; root.querySelector(`[name=opt][value=${mode}]`).checked = true; paint(); }
    else if (g) root.querySelector(g.dataset.go === 'form' ? '#form' : '#sim').scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (t.closest('#reset')) {
      PRO_FLEET.forEach((f) => { counts[f.k] = f.def; root.querySelector(`[data-k=${f.k}]`).value = f.def; $(`#o-${f.k}`).textContent = f.def; });
      paint();
    }
  });
  root.addEventListener('change', (e) => { if (e.target.name === 'opt') { mode = e.target.value; paint(); } });

  $('#lead').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const v = Object.fromEntries(new FormData(f));
    const errs = {
      company: v.company.trim().length < 2 && 'Indiquez la raison sociale.',
      contact: v.contact.trim().length < 3 && 'Indiquez le nom et le titre du responsable.',
      phone: !normPhone(v.phone) && 'Numéro invalide : 10 chiffres, ex. 07 00 00 00 00.',
      email: !EMAIL.test(v.email.trim()) && 'Adresse email invalide.',
      size: !v.size && 'Sélectionnez la taille du parc.',
      zone: !v.zone && 'Sélectionnez la zone principale.',
    };
    let first = null;
    for (const [k, msg] of Object.entries(errs)) {
      const err = f.elements[k].closest('.field').querySelector('.field__error');
      err.textContent = msg || '';
      if (msg) f.elements[k].setAttribute('aria-invalid', 'true'); else f.elements[k].removeAttribute('aria-invalid');
      if (msg && !first) first = f.elements[k];
    }
    if (first) return first.focus();
    const ref = `PRO-${new Date().getFullYear()}-${String(1000 + Math.floor(Math.random() * 9000))}`;
    store.set('leads', [...store.get().leads, { ref, company: v.company.trim(), contact: v.contact.trim(), phone: normPhone(v.phone), email: v.email.trim(), size: PRO_SIZES[v.size], zone: v.zone, opt: v.opt, at: new Date().toISOString() }]);
    f.innerHTML = `<div class="center-text stack"><span class="okmark">${ic('check_circle')}</span><h3>Demande enregistrée</h3>
      <p class="muted">Un conseiller grands comptes rappellera <b>${esc(v.company.trim())}</b> au <b>+225 ${phonePretty(normPhone(v.phone))}</b> sous 2 heures ouvrées.</p>
      <span class="chip chip--tonal">${ic('confirmation_number')} ${ref}</span><a class="btn btn--primary" href="#/flotte">${ic('corporate_fare')}<span>Découvrir l’espace entreprise</span></a></div>`;
    toast('Demande de convention enregistrée', 'ok');
  });
  paint();
  return root;
}
