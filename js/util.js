// Petits utilitaires partagés (DOM, formats, dates).
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Icône du sprite local (icons/sprite.svg). */
export const ic = (name, cls = '') =>
  `<svg class="i ${cls}" aria-hidden="true" focusable="false"><use href="icons/sprite.svg#${name}"/></svg>`;

/** Construit un élément à partir d'un fragment HTML. */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Espaces insécables : « 12 000 FCFA » ne se coupe jamais en fin de ligne.
export const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0 ]/g, '\u00a0');
export const money = (n) => `${fmt(n)}\u00a0FCFA`;

// ---------- Dates (toujours en heure locale, format ISO yyyy-mm-dd) ----------
const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => toISO(new Date());
export const addDays = (iso, n) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const isSunday = (iso) => fromISO(iso).getDay() === 0;
/** Premier jour ouvré (lun-sam) >= iso. */
export const workday = (iso) => (isSunday(iso) ? addDays(iso, 1) : iso);
export const nextWorkday = (iso) => workday(addDays(iso, 1));
export const daysUntil = (iso) => Math.round((fromISO(iso) - fromISO(todayISO())) / 86400000);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const dateLong = (iso) =>
  cap(fromISO(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
export const dateShort = (iso) =>
  fromISO(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
export const weekdayShort = (iso) => cap(fromISO(iso).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''));
export const dayNum = (iso) => fromISO(iso).getDate();
export const monthShort = (iso) => fromISO(iso).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');

// ---------- Heures ----------
export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (n) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;
export const durLabel = (min) => `${Math.floor(min / 60)}h${pad(min % 60)}`;

// ---------- Plaques & téléphones ivoiriens ----------
/** "7492kl01" -> "7492 KL 01" ; null si le format est invalide. */
export function normPlate(raw) {
  const s = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = s.match(/^(\d{3,4})([A-Z]{2})(\d{2})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : null;
}
/** Numéro CI à 10 chiffres (07 08 11 22 33) ; accepte +225 / 00225. */
export function normPhone(raw) {
  let s = String(raw ?? '').replace(/\D/g, '');
  if (s.startsWith('00225')) s = s.slice(5);
  else if (s.startsWith('225') && s.length === 13) s = s.slice(3);
  return /^\d{10}$/.test(s) ? s : null;
}
export const phonePretty = (s) => s.replace(/(\d{2})(?=\d)/g, '$1 ').trim();

/** Hash déterministe (disponibilités de démo reproductibles). */
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- Retour utilisateur ----------
export function toast(msg, kind = 'info') {
  const host = $('#toasts');
  if (!host) return;
  const t = el(`<div class="toast toast--${kind}" role="status">${esc(msg)}</div>`);
  host.append(t);
  setTimeout(() => t.classList.add('toast--out'), 3200);
  setTimeout(() => t.remove(), 3700);
}

export function download(filename, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
