// « Véhicules & Cartes Grises » : fiche d'échéance, carte grise numérique, historique des contrôles.
import { el, esc, ic, normPlate, toast, todayISO } from '../util.js';
import { lookup, statusOf, vehicleFile } from '../domain.js';
import { store } from '../store.js';
import { printSheets } from '../components/print.js';

const dLong = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dMed = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
const TAB = { valide: ['ok', 'En règle'], bientot: ['warn', 'À renouveler'], tolerance: ['err', 'En tolérance'], expire: ['err', 'Expirée'], none: ['muted', 'Non référencé'] };

export default function vehicules({ go }) {
  let sel = store.get().vehicles[0]?.plate ?? null;
  let more = false;
  let adding = false;
  const root = el(`<div class="wrap wrap--app stack-lg"></div>`);

  const tabState = (v) => (v.due ? TAB[statusOf(v.due).key] : TAB.none);

  const sheet = (v) => `
    <section class="sheet"><h1>Carte grise numérique — copie certifiée</h1><p class="ref">${esc(v.cg ?? '—')}</p>
    <p class="big">${esc(v.plate)}</p><p>${esc(v.model)}${v.owner ? `<br>Titulaire : ${esc(v.owner)}` : ''}</p>
    ${v.specs ? `<p>1ère mise en circulation ${v.specs.first} · édition ${v.specs.issued}<br>${v.specs.cv} · ${v.specs.cc} · ${v.specs.energy} · ${v.specs.seats} · ${v.specs.body}</p>` : ''}
    <p class="docs-list">Document de démonstration — spécimen sans valeur légale.</p></section>`;

  const detail = (v) => {
    const st = v.due ? statusOf(v.due) : null;
    const need = st && st.key !== 'valide';
    const hist = v.history ?? [];
    return `
    <section class="card stack">
      <div class="row row--between row--top"><div class="stack-s min0">
        <div class="chips chips--sm">${v.usage ? `<span class="chip chip--warn">${esc(v.usage)}</span>` : ''}${v.genre ? `<span class="chip chip--muted">${esc(v.genre)}</span>` : ''}</div>
        <h2 class="h2">${esc(v.model)}</h2>
        ${v.owner ? `<p class="small muted">Titulaire : <b class="ink">${esc(v.owner)}</b>${v.rccm ? ` (${esc(v.rccm)})` : ''}</p>` : '<p class="small muted">Dossier non référencé dans la base DGTTM.</p>'}</div>
        ${st ? `<span class="chip chip--${need ? 'err' : 'ok'}"><i class="dot ${need ? 'dot--o' : ''}"></i>${need ? 'Visite requise' : 'À jour'}</span>` : ''}</div>
      <div class="platebar"><span class="platebar__ci">CI</span><b>${esc(v.plate)}</b><span class="platebar__cert">${ic('verified')} Certifié SICTA</span></div>
    </section>

    ${v.due ? `<section class="card stack due">
      <div class="row row--between"><div class="row row--gap"><span class="adv__ic adv__ic--o">${ic('notification_important')}</span><div><span class="eyebrow">Échéance de contrôle</span><h2>${dLong(v.due)}</h2></div></div>
        <span class="chip ${st.days <= 30 ? 'chip--err' : 'chip--ok'} chip--lg">J ${st.days >= 0 ? '-' : '+'} ${Math.abs(st.days)}</span></div>
      <div class="stack-s due__rows">
        ${v.lastVisit ? `<div class="kv"><span>${ic('check_circle', 'ok')} Dernière visite réussie</span><b>${dLong(v.lastVisit)}${v.lastCenter ? ` (${esc(v.lastCenter)})` : ''}</b></div>` : ''}
        <div class="kv"><span>${ic('hourglass_top', 'accent')} Tolérance sans pénalité</span><b class="accent">Jusqu’au ${dLong(v.tolerance)}</b></div>
        ${v.insurer ? `<div class="kv"><span>${ic('shield', 'ok')} Assurance ${esc(v.insurer)}</span><b>${v.insuranceUntil >= todayISO() ? `Valide (${dMed(v.insuranceUntil)})` : '<span class="err">Expirée</span>'}</b></div>` : ''}
      </div>
      <button class="btn btn--cta btn--lg btn--block" data-act="book">${ic('calendar_add_on')}<span>Prendre rendez-vous Visite</span></button>
    </section>` : `<section class="card stack"><p class="muted">Échéance inconnue : ce véhicule n’est pas encore référencé. Vérifiez la plaque ou présentez-vous avec votre carte grise.</p>
      <button class="btn btn--cta btn--block" data-act="book">${ic('calendar_add_on')}<span>Prendre rendez-vous</span></button></section>`}

    ${v.cg ? `<section class="card stack">
      <div class="row row--between"><h2 class="row row--gap">${ic('badge', 'accent')} Carte grise numérique</h2><span class="chip chip--tonal">Spécimen officiel</span></div>
      <button class="cg" data-act="zoom" type="button" aria-label="Agrandir la carte grise">
        <span class="cg__wm">Specimen</span><span class="cg__top"><b>RÉPUBLIQUE DE CÔTE D’IVOIRE</b><small>Ministère des Transports — Carte grise</small></span>
        <span class="cg__row"><small>Immatriculation</small><b>${esc(v.plate.replace(/ /g, ''))}</b></span><span class="cg__row"><small>N° carte grise</small><b>${esc(v.cg)}</b></span>
        <span class="cg__row"><small>Marque / type</small><b>${esc(v.model)}</b></span>${v.owner ? `<span class="cg__row"><small>Titulaire</small><b>${esc(v.owner)}</b></span>` : ''}
        <span class="cg__zoom">${ic('zoom_in')} Agrandir</span></button>
      <div class="row"><button class="btn btn--tonal grow" data-act="pdf">${ic('download')}<span>Copie PDF certifiée</span></button><button class="icon-btn icon-btn--tonal" data-act="share" aria-label="Partager">${ic('share')}</button></div>
      ${v.specs ? `<div class="specs"><div class="kv specs__head"><span>N° DE CARTE GRISE</span><b>${esc(v.cg)}</b></div>
        <div class="grid-2"><div class="meta"><small>1ère mise en circ.</small><b>${v.specs.first}</b></div><div class="meta"><small>Date d’édition</small><b>${v.specs.issued}</b></div></div>
        <div class="grid-3"><div class="meta"><small>Puissance</small><b>${v.specs.cv}</b></div><div class="meta"><small>Cylindrée</small><b>${v.specs.cc}</b></div><div class="meta"><small>Énergie</small><b>${v.specs.energy}</b></div></div>
        <div class="grid-2"><div class="meta"><small>Places assises</small><b>${v.specs.seats}</b></div><div class="meta"><small>Carrosserie</small><b>${v.specs.body}</b></div></div></div>` : ''}
    </section>` : ''}

    ${hist.length ? `<section class="card stack">
      <div class="row row--between"><h2 class="row row--gap">${ic('history', 'accent')} Historique des contrôles</h2>
        ${hist.length > 1 ? `<button class="link small" data-act="more" aria-expanded="${more}">${more ? 'Réduire' : 'Détails'}</button>` : ''}</div>
      <ul class="stack-s">${(more ? hist : hist.slice(0, 1)).map((h) => `<li class="hist">
        <span class="hist__ic hist__ic--${h.kind}">${ic(h.kind === 'ok' ? 'check' : 'priority_high')}</span>
        <span class="grow"><b>${h.kind === 'ok' ? 'Visite validée' : 'Contre-visite'}</b> <span class="chip chip--${h.kind === 'ok' ? 'ok' : 'warn'}">${h.kind === 'ok' ? 'Apte' : esc(h.note ?? 'À corriger')}</span><br><span class="small muted">${dMed(h.date)} · ${esc(h.center)}</span></span>
        <button class="icon-btn" data-act="pv" aria-label="Télécharger le procès-verbal">${ic('description')}</button></li>`).join('')}</ul>
    </section>` : ''}

    <div class="grid-2"><button class="btn btn--tonal" data-act="cg">${ic('edit_document')}<span>Mettre à jour CG</span></button>
      <button class="btn btn--tonal" data-act="vignette">${ic('toll')}<span>Vignette &amp; taxes</span></button></div>
    <button class="btn btn--ghost btn--block" data-act="del">${ic('delete')}<span>Retirer ce véhicule</span></button>`;
  };

  const paint = () => {
    const list = store.get().vehicles;
    if (!list.some((v) => v.plate === sel)) sel = list[0]?.plate ?? null;
    const files = list.map((x) => vehicleFile(x.plate));
    const v = files.find((x) => x.plate === sel);
    root.innerHTML = `
      <div class="row row--between"><h1 class="h1 row row--gap">${ic('garage', 'accent')} Véhicules &amp; cartes grises</h1>
        <button class="btn btn--tonal btn--sm" data-act="add" aria-expanded="${adding}">${ic('add')}<span>Ajouter</span></button></div>
      ${adding ? `<form class="card stack" id="add" novalidate><label class="field"><span class="field__label">Plaque d’immatriculation</span>
        <span class="field__row plate-row"><span class="field__prefix field__prefix--ci">CI</span><input name="plate" class="plate-input" placeholder="7492 KL 01" autocapitalize="characters" autocomplete="off"></span>
        <span class="field__error" role="alert"></span></label><div class="row"><button class="btn btn--primary grow">${ic('add')}<span>Ajouter ce véhicule</span></button><button type="button" class="btn btn--ghost" data-act="add">Annuler</button></div></form>` : ''}
      ${files.length ? `<div class="vtabs" role="tablist" aria-label="Mes véhicules">${files.map((f) => { const [c, l] = tabState(f); return `
        <button class="vtab" role="tab" aria-selected="${f.plate === sel}" data-plate="${esc(f.plate)}">${ic(f.icon ?? 'directions_car')}<span><b>${esc(f.plate)}</b><small class="${c}">${esc(f.short ?? f.model)} · ${l}</small></span></button>`; }).join('')}</div>` : ''}
      ${v ? detail(v) : `<div class="card center-text stack muted">${ic('garage')}<p>Aucun véhicule enregistré.</p><button class="btn btn--cta" data-act="add">${ic('add')}<span>Ajouter un véhicule</span></button></div>`}`;
    if (adding) root.querySelector('[name=plate]')?.focus();
  };

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-plate],[data-act]');
    if (!t) return;
    const v = sel ? vehicleFile(sel) : null;
    if (t.dataset.plate) { sel = t.dataset.plate; more = false; return paint(); }
    switch (t.dataset.act) {
      case 'add': adding = !adding; return paint();
      case 'more': more = !more; return paint();
      case 'book': store.patch('booking', { plate: v.plate, model: v.model, date: null, time: null }); return go('/reserver');
      case 'vignette': store.patch('booking', { plate: v.plate }); return go('/verifier');
      case 'cg': return toast('Mise à jour de la carte grise : Guichet Unique Automobile (démonstration).');
      case 'pv': return toast('Procès-verbal indisponible dans cette démonstration.');
      case 'pdf': return printSheets(sheet(v));
      case 'zoom': return openZoom(v);
      case 'share': {
        const text = `Carte grise ${v.cg} — ${v.plate} (${v.model})`;
        return (navigator.share ? navigator.share({ title: 'Carte grise', text }) : navigator.clipboard.writeText(text).then(() => toast('Informations copiées'))).catch(() => {});
      }
      case 'del': {
        if (!confirm(`Retirer ${v.plate} de vos véhicules ?`)) return;
        store.set('vehicles', store.get().vehicles.filter((x) => x.plate !== v.plate));
        toast(`${v.plate} retiré`);
        return paint();
      }
    }
  });

  root.addEventListener('submit', (e) => {
    if (e.target.id !== 'add') return;
    e.preventDefault();
    const f = e.target, err = f.querySelector('.field__error');
    const plate = normPlate(f.plate.value);
    if (!plate) return void (err.textContent = 'Format attendu : 7492 KL 01');
    if (store.get().vehicles.some((x) => x.plate === plate)) return void (err.textContent = 'Véhicule déjà enregistré.');
    store.set('vehicles', [...store.get().vehicles, { plate }]);
    sel = plate; adding = false;
    toast(lookup(plate) ? `${plate} ajouté — dossier retrouvé` : `${plate} ajouté — dossier non référencé`, 'ok');
    paint();
  });

  function openZoom(v) {
    const m = el(`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="zm-t"><div class="modal__card modal__card--l">
      <div class="row row--between w100"><h2 id="zm-t" class="row row--gap">${ic('document_scanner')} Spécimen carte grise CI</h2><button class="icon-btn" data-x aria-label="Fermer">${ic('close')}</button></div>
      <div class="cg cg--big"><span class="cg__wm">Specimen</span><span class="cg__top"><b>RÉPUBLIQUE DE CÔTE D’IVOIRE</b><small>Ministère des Transports — Carte grise</small></span>
        <span class="cg__row"><small>Immatriculation</small><b>${esc(v.plate.replace(/ /g, ''))}</b></span><span class="cg__row"><small>N° carte grise</small><b>${esc(v.cg)}</b></span>
        <span class="cg__row"><small>Marque / type</small><b>${esc(v.model)}</b></span>${v.owner ? `<span class="cg__row"><small>Titulaire</small><b>${esc(v.owner)}</b></span>` : ''}</div>
      <button class="btn btn--primary btn--block" data-pdf>${ic('download')}<span>Télécharger le fichier certifié</span></button></div></div>`);
    const close = () => { m.remove(); document.removeEventListener('keydown', esc_); };
    const esc_ = (e) => e.key === 'Escape' && close();
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-x]')) close(); if (e.target.closest('[data-pdf]')) { close(); printSheets(sheet(v)); } });
    document.addEventListener('keydown', esc_);
    document.body.append(m);
    m.querySelector('[data-x]').focus();
  }

  paint();
  return root;
}
