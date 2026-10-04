// « Mes véhicules » : plaques enregistrées, statut d'échéance, réservation en un tap.
import { dateShort, el, esc, ic, normPlate, toast } from '../util.js';
import { lookup, statusOf } from '../domain.js';
import { store } from '../store.js';

const TXT = { valide: ['ok', 'À jour'], bientot: ['warn', 'À renouveler'], tolerance: ['err', 'En tolérance'], expire: ['err', 'Expirée'] };

export default function vehicules({ go }) {
  const root = el(`
  <div class="wrap wrap--app stack-lg">
    <header><h1 class="h1">Mes véhicules</h1><p class="muted">Suivez les échéances et réservez en un geste.</p></header>
    <div class="stack" id="list"></div>
    <form class="card stack" id="add" novalidate>
      <h2>Ajouter un véhicule</h2>
      <label class="field"><span class="field__label">Plaque d’immatriculation</span>
        <span class="field__row plate-row"><span class="field__prefix field__prefix--ci">CI</span><input name="plate" class="plate-input" placeholder="7492 KL 01" autocapitalize="characters" autocomplete="off"></span>
        <span class="field__error" role="alert"></span></label>
      <button class="btn btn--primary">${ic('add')}<span>Ajouter</span></button>
    </form>
  </div>`);
  const list = root.querySelector('#list');
  const paint = () => {
    const vs = store.get().vehicles;
    list.innerHTML = vs.length
      ? vs.map((v) => {
          const r = lookup(v.plate);
          const st = r ? statusOf(r.due) : null;
          const [cls, lab] = st ? TXT[st.key] : ['muted', 'Non référencé'];
          return `<article class="card veh">
            <div class="row row--between"><span class="plate"><b>CI</b>${esc(v.plate)}</span><span class="chip chip--${cls}">${lab}</span></div>
            <p><b>${esc(r?.model ?? v.label ?? 'Véhicule')}</b></p>
            <p class="small muted">${r ? `Échéance ${dateShort(r.due)} (${st.days >= 0 ? `J-${st.days}` : `J+${-st.days}`})` : 'Échéance inconnue : vérifiez la plaque.'}</p>
            <div class="row"><button class="btn btn--cta btn--sm grow" data-book="${esc(v.plate)}">${ic('calendar_add_on')}<span>Réserver</span></button>
              <button class="icon-btn icon-btn--tonal" data-del="${esc(v.plate)}" aria-label="Retirer ${esc(v.plate)}">${ic('delete')}</button></div></article>`;
        }).join('')
      : `<div class="card center-text muted">${ic('garage')}<p>Aucun véhicule enregistré.</p></div>`;
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-book]');
    const d = e.target.closest('[data-del]');
    if (b) {
      store.patch('booking', { plate: b.dataset.book, date: null, time: null });
      go('/reserver');
    } else if (d) {
      store.set('vehicles', store.get().vehicles.filter((v) => v.plate !== d.dataset.del));
      paint();
    }
  });
  root.querySelector('#add').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const err = f.querySelector('.field__error');
    const plate = normPlate(f.plate.value);
    if (!plate) return void (err.textContent = 'Format attendu : 7492 KL 01');
    if (store.get().vehicles.some((v) => v.plate === plate)) return void (err.textContent = 'Véhicule déjà enregistré.');
    err.textContent = '';
    store.set('vehicles', [...store.get().vehicles, { plate, label: lookup(plate)?.model ?? 'Véhicule' }]);
    f.reset();
    paint();
    toast(`${plate} ajouté`, 'ok');
  });
  paint();
  return root;
}
