// Tests unitaires de la logique métier : `node --test tests/`
import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, durLabel, fromISO, isSunday, normPhone, normPlate, nextWorkday, toISO, workday } from '../js/util.js';
import { buildPlan, dayLoad, distanceKm, fleetBill, parseFleetCsv, passId, price, proEstimate, qrPayload, slotsFor, statusOf, vehicleFile, lookup, fleetVehicles } from '../js/domain.js';
import { CENTERS, FLEET_BASE, OPS, TARIFFS } from '../js/data.js';
import { store } from '../js/store.js';

test('normPlate : formats valides et invalides', () => {
  for (const [raw, out] of [['7492 KL 01', '7492 KL 01'], ['7492kl01', '7492 KL 01'], [' 7492-kl-01 ', '7492 KL 01'], ['123 ab 01', '123 AB 01']]) assert.equal(normPlate(raw), out, raw);
  for (const raw of ['', null, undefined, '7492KL', '74 KL 01', '12345 KL 01', '7492 K1 01', '7492 KL 1', '7492 KLM 01', 'ABCD KL 01', '7492 KL 001']) assert.equal(normPlate(raw), null, String(raw));
});

test('normPhone : numéros ivoiriens à 10 chiffres', () => {
  for (const raw of ['0708091011', '07 08 09 10 11', '+225 07 08 09 10 11', '00225 0708091011', '225 0708091011', '07.08.09.10.11']) assert.equal(normPhone(raw), '0708091011', raw);
  for (const raw of ['', null, '0708', '07080910111', '+33 6 12 34 56 78', 'abc']) assert.equal(normPhone(raw), null, String(raw));
});

test('dates : dimanche, jour ouvré, durées', () => {
  assert.equal(isSunday('2026-10-04'), true);
  assert.equal(workday('2026-10-04'), '2026-10-05');
  assert.equal(nextWorkday('2026-10-03'), '2026-10-05'); // samedi → lundi
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(toISO(fromISO('2026-02-28')), '2026-02-28');
  assert.equal(durLabel(125), '2h05');
});

test('price : barème, contre-visite sans timbre, mutation +25 %', () => {
  assert.deepEqual(price('vl', 'periodique'), { base: 10000, tax: 2000, total: 12000, months: 12 });
  assert.deepEqual(price('pl', 'periodique'), { base: 20000, tax: 4000, total: 24000, months: 6 });
  const c = price('vl', 'contre');
  assert.equal(c.tax, 0); assert.equal(c.base, 4000);
  assert.equal(price('vl', 'mutation').base, 12500);
  for (const k of Object.keys(TARIFFS)) for (const o of Object.keys(OPS)) { const p = price(k, o); assert.equal(p.total, p.base + p.tax); assert.ok(p.total > 0); }
});

test('statusOf : valide / bientôt / tolérance / expirée', () => {
  const d = (n) => addDays(toISO(new Date()), n);
  assert.equal(statusOf(d(120)).key, 'valide');
  assert.equal(statusOf(d(31)).key, 'valide');
  assert.equal(statusOf(d(30)).key, 'bientot');
  assert.equal(statusOf(d(0)).key, 'bientot');
  assert.equal(statusOf(d(-1)).key, 'tolerance');
  assert.equal(statusOf(d(-15)).key, 'tolerance');
  assert.equal(statusOf(d(-16)).key, 'expire');
});

test('slotsFor : créneaux de 45 min, pause déjeuner, stable, jamais le dimanche passé', () => {
  const future = addDays(toISO(new Date()), 10);
  const s = slotsFor('vridi', future);
  assert.ok(s.length >= 8);
  assert.deepEqual(s, slotsFor('vridi', future), 'déterministe');
  assert.equal(s[0].time, '08:00'); // ouverture 07:30 + 30 min de briefing
  assert.ok(!s.some((x) => x.time >= '12:00' && x.time < '14:00'), 'aucun créneau pendant la pause');
  assert.ok(s.filter((x) => x.block === 'matin').every((x) => x.time <= '11:15'), 'fin ≤ 12h00');
  assert.ok(s.every((x) => x.time <= '16:15'), 'fin ≤ fermeture 17h00');
  const free = s.filter((x) => !x.full);
  assert.equal(free.filter((x) => x.last).length, 1);
  assert.equal(free.at(-1).last, true);
  const r = dayLoad('vridi', future);
  assert.ok(r >= 0 && r <= 1);
  for (const c of CENTERS) assert.ok(slotsFor(c.id, future).length > 0, c.id);
});

test('distanceKm : cohérence géographique', () => {
  assert.ok(distanceKm(5.2527, -3.9855, 'vridi') < 0.1);
  const a = distanceKm(5.30, -4.0, 'vridi'), b = distanceKm(5.30, -4.0, 'bouake');
  assert.ok(a < b);
  assert.equal(distanceKm(0, 0, 'inconnu'), null);
});

test('buildPlan : convoi continu, débordement, planning étalé', () => {
  const vs = FLEET_BASE.slice(0, 4).map((v) => ({ ...v }));
  const g = buildPlan(vs, { mode: 'groupe', date: '2026-10-05', dates: {} });
  assert.deepEqual(g.plan.map((p) => `${p.start}-${p.end}`), ['08:30-08:50', '08:55-09:25', '09:30-10:00', '10:05-10:30']);
  assert.equal(g.total, 120); assert.equal(g.overflow, false);
  const many = Array.from({ length: 20 }, (_, i) => ({ ...vs[1], id: `m${i}` }));
  assert.equal(buildPlan(many, { mode: 'groupe', date: '2026-10-05', dates: {} }).overflow, true);
  const e = buildPlan(vs, { mode: 'etale', date: '2026-10-03', dates: { v3: '2026-10-09' } });
  assert.equal(e.plan[0].date, '2026-10-03');
  assert.equal(e.plan[1].date, '2026-10-05', 'saute le dimanche');
  assert.equal(e.plan[2].date, '2026-10-09', 'date personnalisée respectée');
  assert.ok(e.plan.every((p) => !isSunday(p.date)));
  assert.equal(buildPlan([], { mode: 'groupe', date: '2026-10-05', dates: {} }).plan.length, 0);
});

test('fleetBill : décompte cohérent (lignes = sous-total, remise 5 %, total)', () => {
  const vs = fleetVehicles().slice(0, 4);
  const b = fleetBill(vs);
  assert.equal(b.lines.reduce((s, l) => s + l.total, 0), b.subtotal);
  assert.equal(b.prestations + b.timbres, b.subtotal);
  assert.equal(b.total, b.subtotal - b.discount);
  assert.ok(b.tva > 0 && b.tva < b.prestations);
  assert.equal(b.discount % 50, 0);
  assert.equal(fleetBill([]).total, 0);
});

test('parseFleetCsv : lignes valides, en-tête, doublons, erreurs', () => {
  const csv = ['plaque;modele;type;echeance;chauffeur;telephone', '4410 AA 01;Renault Master;VP;2026-12-15;Moussa;0707070707', '4410aa01;Doublon;VP;;;', 'XXXX;Mauvaise;VP;;;', '5510 BB 01;Camion;PL;;;', '5511 BB 01;Etrange;FOO;;;', '', '6601 CC 01,Car,Minibus,2027-01-01,,'].join('\r\n');
  const { added, errors } = parseFleetCsv(csv, ['7492 KL 01']);
  assert.deepEqual(added.map((v) => v.plate), ['4410 AA 01', '5510 BB 01', '6601 CC 01']);
  assert.equal(added[0].cat, 'VP'); assert.equal(added[1].tarif, 'pl'); assert.equal(added[2].cat, 'Minibus');
  assert.equal(added[0].due, '2026-12-15'); assert.equal(added[1].due, null);
  assert.equal(errors.length, 3);
  assert.ok(errors.some((e) => /déjà présent/.test(e)) && errors.some((e) => /plaque invalide/.test(e)) && errors.some((e) => /type inconnu/.test(e)));
  assert.equal(parseFleetCsv('', []).added.length, 0);
  assert.equal(parseFleetCsv('7492 KL 01;Déjà;VP', ['7492 KL 01']).added.length, 0);
});

test('lookup & vehicleFile : plaque, carte grise, inconnu', () => {
  assert.equal(lookup('7492kl01').plate, '7492 KL 01');
  assert.equal(lookup('cg24029576').plate, '1580 EF 01');
  assert.equal(lookup('CG 24029576').plate, '1580 EF 01');
  assert.equal(lookup('0000 ZZ 00'), null);
  assert.equal(lookup(''), null);
  const own = vehicleFile('1580 EF 01');
  assert.equal(own.known, true); assert.ok(own.specs); assert.equal(own.history.length, 3);
  assert.equal(statusOf(own.due).days, 18);
  const flotte = vehicleFile('7492 KL 01');
  assert.equal(flotte.partial, true);
  const none = vehicleFile('0000 ZZ 00');
  assert.equal(none.known, false);
});

test('proEstimate : estimation de parc', () => {
  const r = proEstimate({ vl: 25, pl: 12, bus: 8, moto: 15 }, 'station');
  assert.equal(r.volume, 60);
  assert.equal(r.visits, 25 + 24 + 16 + 15);
  assert.ok(r.total < r.gross && r.discount > 0);
  assert.equal(r.mobileOk, true);
  assert.equal(proEstimate({ vl: 5, pl: 2, bus: 0, moto: 0 }, 'mobile').mobileOk, false);
  const z = proEstimate({ vl: 0, pl: 0, bus: 0, moto: 0 }, 'station');
  assert.equal(z.volume, 0); assert.equal(z.total, 0); assert.equal(z.days, 1);
  assert.ok(proEstimate({ vl: 100, pl: 0, bus: 0, moto: 0 }, 'mobile').days < proEstimate({ vl: 100, pl: 0, bus: 0, moto: 0 }, 'station').days);
});

test('références & QR : formats stables', () => {
  assert.match(passId('vridi', '2025-09-16', '08:45'), /^SIC-VRD-160925-0845$/);
  assert.match(passId('korhogo', '2026-01-02', '14:00'), /^SIC-KOR-020126-1400$/);
  assert.equal(qrPayload({ ref: 'SIC-2026-123456', plate: '7492 KL 01', date: '2026-10-05', time: '08:00', centerId: 'vridi' }), 'SICTA|SIC-2026-123456|7492KL01|2026-10-05T08:00|vridi');
});

test('store : patch/set/reset sans localStorage', () => {
  store.patch('booking', { plate: '7492 KL 01' });
  assert.equal(store.get().booking.plate, '7492 KL 01');
  store.set('vehicles', []);
  assert.deepEqual(store.get().vehicles, []);
  store.reset('booking');
  assert.equal(store.get().booking.plate, '');
  let n = 0; const off = store.subscribe(() => n++); store.patch('profile', { name: 'A' }); off(); store.patch('profile', { name: 'B' });
  assert.equal(n, 1);
});
