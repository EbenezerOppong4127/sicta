// Vérificateur d'échéance (plaque ou n° de carte grise) réutilisé sur l'accueil, le simulateur et /verifier.
import { dateShort, el, esc, ic, normPlate, phonePretty, toast } from '../util.js';
import { lookup, statusOf } from '../domain.js';
import { store } from '../store.js';
import { go } from '../router.js';

const LABEL = {
  valide: { t: 'Visite valide', chip: 'À jour', cls: 'ok', icon: 'check_circle' },
  bientot: { t: 'Échéance proche', chip: 'À renouveler', cls: 'warn', icon: 'schedule' },
  tolerance: { t: 'Expirée — tolérance de 15 jours', chip: 'Urgent', cls: 'err', icon: 'warning' },
  expire: { t: 'Vignette expirée', chip: 'Expirée', cls: 'err', icon: 'error' },
};

export function resultCard(v) {
  const st = statusOf(v.due);
  const L = LABEL[st.key];
  const when = st.days >= 0 ? `dans ${st.days} j` : `il y a ${-st.days} j`;
  const on = !!store.get().reminders[v.plate];
  const node = el(`
    <div class="result result--${L.cls}">
      <div class="result__main">
        <span class="result__icon">${ic(L.icon)}</span>
        <div>
          <div class="result__title">${L.t} <span class="chip chip--${L.cls}">${L.chip}</span></div>
          <div class="muted small"><strong>${esc(v.plate)}</strong> · ${esc(v.model)} · échéance <strong>${dateShort(v.due)}</strong> (${when})</div>
        </div>
      </div>
      <div class="result__actions">
        <button class="btn btn--tonal btn--sm" data-act="remind" aria-pressed="${on}">${ic('notifications_active')}<span>${on ? 'Rappel SMS activé' : 'Activer rappel SMS'}</span></button>
        ${st.key === 'valide' ? '' : `<button class="btn btn--cta btn--sm" data-act="book">${ic('calendar_add_on')}<span>Réserver</span></button>`}
      </div>
    </div>`);
  node.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'book') {
      store.patch('booking', { plate: v.plate });
      go('/reserver');
    } else {
      const cur = store.get().reminders;
      const next = { ...cur, [v.plate]: !cur[v.plate] };
      store.patch('reminders', next);
      b.setAttribute('aria-pressed', next[v.plate]);
      b.querySelector('span').textContent = next[v.plate] ? 'Rappel SMS activé' : 'Activer rappel SMS';
      const ph = store.get().profile.phone;
      toast(next[v.plate] ? `Rappels J-30 et J-2 activés${ph ? ` au ${phonePretty(ph)}` : ''}` : 'Rappel désactivé');
    }
  });
  return node;
}

/**
 * @param {{placeholder?: string, initial?: string, label?: string}} opts
 */
export function plateCheck({ placeholder = 'Plaque ou n° carte grise', initial = '', label = 'Vérifier' } = {}) {
  const root = el(`
    <form class="plate-check" novalidate>
      <div class="plate-field">
        <span class="plate-field__ci"><b>CI</b>🇨🇮</span>
        <input class="plate-field__input" name="q" autocomplete="off" autocapitalize="characters" spellcheck="false"
               aria-label="Immatriculation ou numéro de carte grise" placeholder="${esc(placeholder)}" value="${esc(initial)}" />
        <button class="btn btn--primary btn--sm" type="submit">${ic('search')}<span>${label}</span></button>
      </div>
      <div class="plate-check__out" aria-live="polite"></div>
    </form>`);
  const out = root.querySelector('.plate-check__out');
  const input = root.q;

  root.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    out.replaceChildren();
    if (!q) return void (out.innerHTML = `<p class="field-error">Saisissez une plaque (ex. 7492 KL 01) ou un n° de carte grise.</p>`);
    const plate = normPlate(q);
    if (!plate && !/^CG\d{6,}$/i.test(q.replace(/\s/g, ''))) {
      return void (out.innerHTML = `<p class="field-error">Format non reconnu. Exemple : 7492 KL 01 ou CG24029576.</p>`);
    }
    out.innerHTML = `<div class="result result--load">${ic('progress_activity', 'spin')} Interrogation de la base DGTT…</div>`;
    setTimeout(() => {
      const v = lookup(q);
      out.replaceChildren(
        v
          ? resultCard(v)
          : el(`<div class="result result--err"><div class="result__main"><span class="result__icon">${ic('search_off')}</span><div><div class="result__title">Aucun véhicule trouvé</div><div class="muted small">Vérifiez la saisie. Base de démonstration : essayez <button type="button" class="link" data-fill="7492 KL 01">7492 KL 01</button> ou <button type="button" class="link" data-fill="CG24029576">CG24029576</button>.</div></div></div></div>`)
      );
    }, 600);
  });
  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-fill]');
    if (f) {
      input.value = f.dataset.fill;
      root.requestSubmit();
    }
  });
  if (initial) queueMicrotask(() => root.requestSubmit());
  return root;
}
