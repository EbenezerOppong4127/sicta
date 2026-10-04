// Logique métier : tarifs, créneaux, planning de flotte, références, QR.
import { CENTERS, CENTER_CODES, DEMO_OWN, FLEET_BASE, FLEET_DISCOUNT, OPS, TARIFFS, TVA } from './data.js';
import { store } from './store.js';
import { addDays, fromMin, fromISO, hash, isSunday, nextWorkday, normPlate, todayISO, toMin, workday } from './util.js';

export const center = (id) => CENTERS.find((c) => c.id === id) ?? CENTERS[0];

// ---------- Tarifs ----------
/** Tarif TTC d'une opération : la contre-visite est réduite et sans timbre. */
export function price(cat = 'vl', op = 'periodique') {
  const t = TARIFFS[cat];
  const base = Math.round((t.presta * OPS[op].mult) / 50) * 50;
  const tax = op === 'contre' ? 0 : t.timbre;
  return { base, tax, total: base + tax, months: t.months };
}

// ---------- Véhicules (flotte + registre) ----------
export function fleetVehicles() {
  const today = todayISO();
  const mk = (v) => ({ ...v, due: addDays(today, v.dueIn) });
  const imported = store.get().fleet.extra.map((v) => ({ ...v, due: v.due ?? addDays(today, v.dueIn ?? 90) }));
  return [...FLEET_BASE.map(mk), ...imported];
}
export const selectedFleet = () => {
  const sel = new Set(store.get().fleet.selected);
  return fleetVehicles().filter((v) => sel.has(v.id));
};

/** Recherche par plaque ou n° de carte grise (registre de démonstration). */
export function lookup(query) {
  const raw = String(query ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!raw) return null;
  const plate = normPlate(raw);
  const today = todayISO();
  const pool = [
    ...fleetVehicles().map((v) => ({ plate: v.plate, cg: v.cg, model: v.short ?? v.model, due: v.due })),
    { plate: DEMO_OWN.plate, cg: DEMO_OWN.cg, model: DEMO_OWN.model, due: addDays(today, DEMO_OWN.dueIn) },
  ];
  return (
    pool.find((v) => (plate && v.plate === plate) || (v.cg && v.cg.replace(/[^A-Z0-9]/g, '') === raw)) ?? null
  );
}

/** valide | bientot (≤ 30 j) | tolerance (≤ 15 j de retard) | expire */
export function statusOf(dueISO) {
  const d = Math.round((fromISO(dueISO) - fromISO(todayISO())) / 86400000);
  if (d > 30) return { key: 'valide', days: d };
  if (d >= 0) return { key: 'bientot', days: d };
  if (d >= -15) return { key: 'tolerance', days: d };
  return { key: 'expire', days: d };
}

// ---------- Créneaux individuels ----------
export function bookableDays(n = 7) {
  const out = [];
  let d = workday(todayISO());
  while (out.length < n) {
    out.push(d);
    d = nextWorkday(d);
  }
  return out;
}

/** Créneaux de 20 min ; indisponibilités simulées mais stables pour un (centre, jour, heure). */
export function slotsFor(centerId, iso) {
  const c = center(centerId);
  const now = new Date();
  const isToday = iso === todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes() + 30;
  const out = [];
  for (let m = toMin(c.hours.open); m <= toMin(c.hours.close) - 30; m += 20) {
    if (isToday && m < nowMin) continue;
    const full = hash(`${centerId}${iso}${m}`) % 100 < (c.fast ? 18 : 28);
    out.push({ time: fromMin(m), full });
  }
  return out;
}

// ---------- Planning flotte ----------
const START = '08:30';
const GAP = 5;

/** Passage groupé : convoi continu le même jour. Passage étalé : un jour par véhicule. */
export function buildPlan(vehicles, { mode, date, dates }) {
  const first = workday(date);
  if (mode === 'etale') {
    let d = first; // dates par défaut : un jour ouvré de plus par véhicule
    const plan = vehicles.map((v, i) => {
      if (i > 0) d = nextWorkday(d);
      return { v, date: dates[v.id] ?? d, start: START, end: fromMin(toMin(START) + v.dur) };
    });
    return { plan, total: null, overflow: false };
  }
  let cur = toMin(START);
  const plan = vehicles.map((v) => {
    const slot = { v, date: first, start: fromMin(cur), end: fromMin(cur + v.dur) };
    cur += v.dur + GAP;
    return slot;
  });
  const end = plan.length ? toMin(plan.at(-1).end) : cur;
  const close = toMin(center(store.get().fleet.centerId).hours.close);
  return { plan, total: end - toMin(START), overflow: end > close };
}

export const defaultFleetDate = () => workday(addDays(todayISO(), 2));
/** Décompte de la facture groupée. Le barème étant TTC, la TVA est « dont » (incluse dans les prestations). */
export function fleetBill(vehicles) {
  const lines = vehicles.map((v) => ({ v, ...price(v.tarif) }));
  const prestations = lines.reduce((s, l) => s + l.base, 0);
  const timbres = lines.reduce((s, l) => s + l.tax, 0);
  const subtotal = prestations + timbres;
  const tva = Math.round((prestations * TVA) / (1 + TVA));
  const discount = Math.round((subtotal * FLEET_DISCOUNT) / 50) * 50;
  return { lines, prestations, timbres, subtotal, tva, discount, total: subtotal - discount };
}
export const fleetTotal = (vehicles) => fleetBill(vehicles).total;

// ---------- Références & QR ----------
const year = () => new Date().getFullYear();
const seq = () => String(1000 + Math.floor(Math.random() * 9000));
export const newBookingRef = () => `SIC-${year()}-${String(100000 + Math.floor(Math.random() * 900000))}`;
/** Identifiant lisible sous le QR : SIC-VRD-160925-0845 */
export const passId = (centerId, iso, time) => {
  const [y, m, d] = iso.split('-');
  return `SIC-${CENTER_CODES[centerId] ?? centerId.slice(0, 3).toUpperCase()}-${d}${m}${y.slice(2)}-${time.replace(':', '')}`;
};
export const newFleetRef = () => `CMD-FLOTTE-${year()}-${seq()}`;

export const qrPayload = ({ ref, plate, date, time, centerId }) =>
  `SICTA|${ref}|${plate.replace(/ /g, '')}|${date}T${time}|${centerId}`;

/** SVG vectoriel du QR code (lib locale js/vendor/qrcode.js). */
export function qrSvg(text) {
  const qr = window.qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

export { isSunday };

// ---------- Import CSV de flotte ----------
const CAT = { vp: ['VP', 'vl', 20, 'VP Particulier'], pl: ['PL', 'pl', 30, 'PL Poids lourd'], minibus: ['Minibus', 'pl', 30, 'Minibus'] };

/**
 * Colonnes : plaque ; modèle ; type (VP|PL|Minibus) ; échéance (AAAA-MM-JJ) ; chauffeur ; téléphone
 * Séparateur ; ou , — la première ligne peut être un en-tête.
 */
export function parseFleetCsv(text, existingPlates = []) {
  const known = new Set(existingPlates);
  const added = [];
  const errors = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cols = line.split(/[;,]/).map((c) => c.trim());
    const plate = normPlate(cols[0]);
    if (!plate) return void (i > 0 && errors.push(`Ligne ${i + 1} : plaque invalide « ${cols[0]} »`));
    const cat = CAT[(cols[2] || 'vp').toLowerCase()];
    if (!cat) return void errors.push(`Ligne ${i + 1} : type inconnu « ${cols[2]} » (VP, PL ou Minibus)`);
    if (known.has(plate)) return void errors.push(`Ligne ${i + 1} : ${plate} déjà présent`);
    known.add(plate);
    const due = /^\d{4}-\d{2}-\d{2}$/.test(cols[3] ?? '') ? cols[3] : null;
    added.push({
      id: `x${hash(plate)}`, plate, cg: null, model: cols[1] || 'Véhicule importé', short: cols[1] || 'Véhicule importé', role: cat[3],
      type: cat[3], cat: cat[0], tarif: cat[1], dur: cat[2], due, dueIn: 90, driver: cols[4] || 'Chauffeur à désigner', phone: (cols[5] || '').replace(/\D/g, ''),
    });
  });
  return { added, errors };
}
