// Tests de bout en bout (Chromium). Usage :
//   python3 -m http.server 8000 &  ;  BASE=http://localhost:8000/ node tests/e2e.mjs
// Variables : BASE (URL), CHROMIUM (chemin du binaire), PW_FROM (dossier contenant node_modules/playwright-core, jsqr, pngjs).
import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_FROM ? process.env.PW_FROM.replace(/\/?$/, '/') : import.meta.url);
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');
const BASE = process.env.BASE || 'http://localhost:8000/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
let passed = 0, failed = 0;
const failures = [];

/** Contexte isolé + collecte des erreurs JS ; `init` s'exécute avant le chargement de la page. */
async function fresh({ viewport = MOBILE, init, geolocation, permissions = ['clipboard-read', 'clipboard-write'], time, acceptDialogs = true } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, geolocation, permissions: geolocation ? [...permissions, 'geolocation'] : permissions, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push('console: ' + m.text()));
  if (acceptDialogs) page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => { window.print = () => { window.__printed = document.getElementById('print-root')?.innerHTML ?? null; window.dispatchEvent(new Event('afterprint')); }; });
  if (init) await page.addInitScript(init);
  if (time) await page.clock.install({ time });
  return { ctx, page, errors };
}
const hash = (page) => page.evaluate(() => location.hash);
const open = async (page, route) => { await page.goto(BASE + '#' + route); await page.waitForSelector('main > *'); await page.waitForTimeout(120); };
const text = (page, sel) => page.locator(sel).first().innerText();

async function test(name, fn, opts) {
  const t = await fresh(opts);
  try {
    await fn(t.page, t.ctx);
    if (t.errors.length) throw new Error('erreurs JS : ' + t.errors.join(' | '));
    passed++; console.log('  ✓', name);
  } catch (e) {
    failed++; failures.push(name); console.log('  ✗', name, '\n     ', String(e.message).split('\n')[0]);
  } finally { await t.ctx.close(); }
}
const eq = (a, b, m = '') => { if (a !== b) throw new Error(`${m} attendu « ${b} », reçu « ${a} »`); };
const ok = (c, m) => { if (!c) throw new Error(m); };
const group = (n) => console.log('\n' + n);
const nospace = (s) => s.replace(/[\s  ]/g, '');

const decodeQR = async (loc) => {
  const png = PNG.sync.read(await loc.screenshot());
  const r = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!r) throw new Error('QR illisible');
  return r.data;
};
const fillPay = async (page, o = {}) => {
  await page.fill('[name=plate]', o.plate ?? '7492kl01');
  await page.fill('[name=owner]', 'Koffi K.');
  await page.fill('[name=contact]', '0708091011');
  if (o.method) await page.locator(`.rcard--pay:has(input[value=${o.method}])`).click();
};
const pickSlot = async (page, o = {}) => {
  if (o.search) { await page.fill('#q', o.search); await page.waitForTimeout(80); await page.locator('.station').first().click(); }
  await page.locator('.day:not([disabled])').nth(o.day ?? 0).click();
  await page.locator('.slot:not([disabled])').nth(o.slot ?? 0).click();
  await page.click('#go');
  await page.waitForSelector('#pay');
};
const payAndWait = async (page, sel = '.ticket') => { await page.click('#pay'); await page.waitForSelector('.modal'); await page.waitForSelector(sel, { timeout: 9000 }); };
const uncheckAll = async (page) => { while (await page.locator('.chk:checked').count()) await page.locator('label.veh.is-on').first().click(); };
const printed = async (page) => { await page.waitForFunction(() => window.__printed, null, { timeout: 4000 }); return page.evaluate(() => window.__printed); };
const csv = (rows) => ({ name: 'f.csv', mimeType: 'text/csv', buffer: Buffer.from(rows.join('\n')) });

// ──────────────────────────────────────────────────────────────
group('Gardes de navigation et robustesse');
await test('Pas de créneau → /reserver/paiement renvoie à /reserver', async (p) => { await open(p, '/reserver/paiement'); eq(await hash(p), '#/reserver'); });
await test('Pass non payé → /reserver/pass renvoie à /reserver', async (p) => { await open(p, '/reserver/pass'); eq(await hash(p), '#/reserver'); });
await test('Pass flotte non payé → retour au planning (aucune date choisie)', async (p) => { await open(p, '/flotte/pass'); eq(await hash(p), '#/flotte/planning'); });
await test('Planning sans sélection → dashboard', async (p) => {
  await open(p, '/flotte');
  await uncheckAll(p); eq(await p.locator('.chk:checked').count(), 0);
  await open(p, '/flotte/planning'); eq(await hash(p), '#/flotte');
});
await test('Route inconnue → accueil', async (p) => { await open(p, '/nimporte/quoi'); eq(await hash(p), '#/'); });
await test('Étape inconnue → /reserver', async (p) => { await open(p, '/reserver/zzz'); eq(await hash(p), '#/reserver'); });
await test('localStorage corrompu : l’app démarre', async (p) => { await open(p, '/simulateur'); await p.waitForSelector('text=Simulateur officiel'); }, { init: () => localStorage.setItem('sicta:v1', '{pas du json') });
await test('État partiel (ancienne version) fusionné avec les défauts', async (p) => { await open(p, '/vehicules'); await p.waitForSelector('.vtab'); }, { init: () => localStorage.setItem('sicta:v1', '{"booking":{"plate":"7492 KL 01"}}') });
await test('Titre de page et un seul h1 par route', async (p) => {
  for (const r of ['/', '/simulateur', '/reserver', '/centres', '/vehicules', '/compte', '/verifier', '/flotte', '/pro']) {
    await open(p, r);
    const n = await p.locator('h1:visible').count();
    ok(n === 1, `${r} : ${n} h1 visibles`);
    ok((await p.title()).includes('SICTA'), `${r} : titre`);
  }
});

group('Simulateur de tarif');
await test('Catégorie × opération = barème exact', async (p) => {
  await open(p, '/simulateur');
  const pick = (k, v) => p.locator(`label.${k}:has(input[value="${v}"])`).click();
  const total = async () => nospace(await text(p, '#total'));
  eq(await total(), '12000', 'VL périodique');
  await pick('chip-radio', 'contre'); eq(await total(), '4000', 'VL contre-visite (sans timbre)'); eq(nospace(await text(p, '#tax')), '0FCFA', 'timbre contre-visite');
  await pick('chip-radio', 'mutation'); eq(await total(), '14500', 'VL mutation');
  await pick('cat', 'moto'); await pick('chip-radio', 'periodique'); eq(await total(), '6500', 'moto');
  await pick('cat', 'pl'); eq(await total(), '24000', 'PL');
  await pick('cat', 'util'); eq(await total(), '15500', 'util');
});
await test('Le choix du simulateur arrive jusqu’au récapitulatif de paiement', async (p) => {
  await open(p, '/simulateur');
  await p.locator('label.cat:has(input[value=pl])').click(); await p.locator('label.chip-radio:has(input[value=mutation])').click();
  await p.click('#go-book'); await pickSlot(p);
  const recap = await text(p, '.total-card');
  ok(nospace(recap).includes('29000'), 'total 29 000 attendu (25 000 + 4 000) : ' + recap);
  ok((await p.content()).includes('Mutation carte grise (Poids lourd'), 'libellé du récap');
});
await test('Barème : « Choisir ce tarif » présélectionne la catégorie', async (p) => {
  await open(p, '/simulateur'); await p.locator('[data-pick=moto]').click(); await p.waitForSelector('text=Choisissez votre station');
  ok(/Moto/.test(await text(p, '#tarif-note')), 'catégorie moto reprise'); ok(nospace(await text(p, '#tarif-note')).includes('6500FCFA'), 'tarif moto');
});

group('Vérification de plaque / carte grise');
await test('Saisies invalides et résultats', async (p) => {
  await open(p, '/verifier');
  const check = async (v) => { await p.fill('[name=q]', v); await p.click('.plate-check button[type=submit]'); await p.waitForTimeout(900); return p.locator('.plate-check__out').innerText(); };
  ok(/Saisissez une plaque/.test(await check('')), 'vide');
  ok(/Format non reconnu/.test(await check('abc')), 'format');
  ok(/Format non reconnu/.test(await check('7492 K 01')), 'plaque tronquée');
  ok(/Aucun véhicule trouvé/.test(await check('0000 ZZ 00')), 'inconnu');
  ok(/Aucun véhicule trouvé/.test(await check('CG99999999')), 'CG inconnue');
  ok(/À jour/.test(await check('9942 MB 01')), 'valide');
  ok(/À renouveler/.test(await check('cg24029576')), 'CG Corolla bientôt');
  ok(/À renouveler/.test(await check('7492kl01')), 'plaque flotte');
});
await test('Rappel SMS : bascule et persistance', async (p) => {
  await open(p, '/verifier'); await p.fill('[name=q]', '9942 MB 01'); await p.click('.plate-check button[type=submit]'); await p.waitForSelector('[data-act=remind]');
  await p.click('[data-act=remind]'); eq(await p.getAttribute('[data-act=remind]', 'aria-pressed'), 'true');
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('sicta:v1')).reminders['9942 MB 01']); eq(stored, true);
  await p.click('[data-act=remind]'); eq(await p.getAttribute('[data-act=remind]', 'aria-pressed'), 'false');
});
await test('Landing : panneau « Vérifier ma carte grise »', async (p) => {
  await open(p, '/'); await p.click('#toggle-check'); await p.waitForSelector('#check-panel:not([hidden])');
  await p.fill('#check-panel [name=q]', '1580 EF 01'); await p.click('#check-panel button[type=submit]'); await p.waitForSelector('#check-panel .result__title');
  await p.click('#close-check'); ok(await p.locator('#check-panel').isHidden(), 'fermé');
});
await test('Landing desktop : carte express (plaque invalide puis valide)', async (p) => {
  await open(p, '/');
  await p.fill('#express [name=plate]', 'xx'); await p.click('#express button[type=submit]'); ok((await text(p, '#ex-err')).length > 0, 'erreur plaque');
  await p.fill('#express [name=plate]', '7492kl01'); await p.locator('#express .cat:has(input[value=moto])').click(); await p.click('#express button[type=submit]');
  await p.waitForSelector('text=Choisissez votre station'); ok(/Moto/.test(await text(p, '#tarif-note')), 'catégorie conservée');
}, { viewport: DESKTOP });

group('Réservation : centre, date, créneau');
await test('Calendrier : pas de dimanche, navigation par semaine, bornes', async (p) => {
  await open(p, '/reserver');
  const days = await p.locator('.day').all(); eq(days.length, 6, 'jours Lun–Sam');
  const labels = await p.locator('.day small:first-child').allInnerTexts(); ok(!labels.some((l) => /DIM/i.test(l)), 'aucun dimanche');
  ok(await p.locator('#prev').isDisabled(), 'précédent désactivé sur la semaine courante');
  const m0 = await text(p, '#month'); await p.click('#next-w'); ok(await p.locator('#prev').isEnabled(), 'précédent actif');
  for (let i = 0; i < 3; i++) await p.click('#next-w'); ok(await p.locator('#next-w').isDisabled(), 'borne à 4 semaines'); 
  await p.click('#prev'); await p.click('#prev'); await p.click('#prev'); await p.click('#prev'); eq(await p.locator('#prev').isDisabled(), true); eq(await text(p, '#month'), m0);
});
await test('Recherche, filtres et état vide', async (p) => {
  await open(p, '/reserver');
  await p.fill('#q', 'zzzzzz'); ok(/Aucun centre/.test(await text(p, '#stations')), 'vide');
  await p.fill('#q', 'bouak'); eq(await p.locator('.station').count(), 1); ok(/Bouaké/.test(await text(p, '.station')), 'Bouaké');
  await p.fill('#q', ''); await p.click('#filter-btn'); await p.click('[data-zone=abidjan]'); eq(await p.locator('.station').count(), 4, 'Abidjan = 4');
  await p.click('[data-zone=interieur]'); eq(await p.locator('.station').count(), 9, 'Intérieur = 9');
  await p.click('[data-zone=tous]'); await p.click('[data-big]'); const big = await p.locator('.station').allInnerTexts(); ok(big.length > 0 && big.every((t) => /Gros gabarit/.test(t)), 'gros gabarit uniquement');
});
await test('Liste réduite / complète', async (p) => {
  await open(p, '/reserver'); eq(await p.locator('.station').count(), 4); await p.click('#more'); eq(await p.locator('.station').count(), 13); await p.click('#more'); eq(await p.locator('.station').count(), 4);
});
await test('GPS : tri par distance (Bouaké puis Abidjan)', async (p) => {
  await open(p, '/reserver'); await p.click('#gps'); await p.waitForFunction(() => document.querySelector('#gps-st').textContent === 'GPS actif');
  ok(/Bouaké/.test(await text(p, '.station')), 'Bouaké en premier'); ok(/\d+(\.\d)? km/.test(await text(p, '.station')), 'distance affichée');
}, { geolocation: { latitude: 7.69, longitude: -5.03 } });
await test('GPS : proche de Vridi → Vridi en premier', async (p) => {
  await open(p, '/reserver'); await p.click('#gps'); await p.waitForFunction(() => document.querySelector('#gps-st').textContent === 'GPS actif');
  ok(/Vridi/.test(await text(p, '.station')), 'Vridi'); ok(/^SICTA Vridi/.test(await text(p, '.station b')), 'titre');
}, { geolocation: { latitude: 5.26, longitude: -3.98 } });
await test('GPS refusé : message et pas de plantage', async (p) => {
  await open(p, '/reserver'); await p.click('#gps'); await p.waitForSelector('.toast--err'); eq(await text(p, '#gps-st'), 'Activer');
});
await test('CTA désactivé sans créneau ; choix d’un autre centre garde un état cohérent', async (p) => {
  await open(p, '/reserver'); ok(await p.locator('#go').isDisabled(), 'désactivé');
  await p.locator('.day:not([disabled])').first().click(); await p.locator('.slot:not([disabled])').first().click(); ok(await p.locator('#go').isEnabled(), 'activé');
  await p.fill('#q', 'bouak'); await p.locator('.station').first().click(); await p.waitForTimeout(100);
  const slots = await p.locator('.slot[aria-checked=true]').count(); const en = await p.locator('#go').isEnabled(); eq(en, slots === 1, 'CTA cohérent avec la sélection');
});
await test('Créneaux complets non cliquables, un seul « Dernier »', async (p) => {
  await open(p, '/reserver'); await p.locator('.day:not([disabled])').first().click();
  const full = await p.locator('.slot:disabled').count(); const last = await p.locator('.slot small', { hasText: 'Dernier' }).count(); ok(last <= 1, 'un « Dernier » maximum');
  for (const s of await p.locator('.slot:disabled').all()) ok(/Complet/.test(await s.innerText()), 'libellé Complet'); ok(full >= 0, '');
});
await test('Horloge : samedi 17h45 (après fermeture) → premier jour = lundi', async (p) => {
  await open(p, '/reserver'); const first = await p.locator('.day:not([disabled]) small').first().innerText(); ok(/LUN/i.test(first), 'lundi attendu, reçu ' + first);
  eq(await p.locator('.day[aria-checked=true]').count(), 1, 'un jour présélectionné'); ok(await p.locator('#prev').isEnabled(), 'on peut revenir en arrière');
  await p.click('#prev'); eq(await p.locator('.day:not([disabled])').count(), 0, 'semaine en cours entièrement indisponible après 17h samedi');
}, { time: new Date('2026-10-10T17:45:00') });
await test('Horloge : samedi 10h → créneaux du jour à partir de 11:00', async (p) => {
  await open(p, '/reserver'); const t = await p.locator('.day:not([disabled])').first(); ok(/SAM/i.test(await t.innerText()), 'samedi sélectionnable'); await t.click();
  const first = (await p.locator('.slot:not([disabled])').first().innerText()).split('\n')[0]; eq(first, '11:00');
}, { time: new Date('2026-10-10T10:00:00') });
await test('Horloge : dimanche → on propose le lundi', async (p) => {
  await open(p, '/reserver'); ok(/LUN/i.test(await p.locator('.day:not([disabled]) small').first().innerText()), 'lundi');
}, { time: new Date('2026-10-04T09:00:00') });

group('Réservation : véhicule, paiement, reçu');
await test('Validations du formulaire (plaque, contact, numéro de paiement)', async (p) => {
  await open(p, '/reserver'); await pickSlot(p);
  await p.click('#pay'); ok((await text(p, '#pl-err')).includes('Plaque invalide'), 'plaque vide');
  await p.fill('[name=plate]', 'ABC'); await p.click('#pay'); ok((await text(p, '#pl-err')).length > 0, 'plaque invalide');
  await p.fill('[name=plate]', '7492 KL 01'); await p.fill('[name=contact]', '123'); await p.fill('[name=phone]', ''); await p.click('#pay');
  ok((await text(p, '#ct-err')).includes('invalide'), 'contact invalide'); ok(await p.locator('.modal').count() === 0, 'pas de paiement tant que invalide');
  await p.fill('[name=contact]', '0708091011'); await p.fill('[name=phone]', '12'); await p.click('#pay'); ok((await text(p, '#ph-err')).includes('invalide'), 'numéro de paiement');
});
await test('Chaque moyen de paiement met à jour libellé et aide ; numéro lié au contact', async (p) => {
  await open(p, '/reserver'); await pickSlot(p);
  const expect = { orange: 'Orange Money', wave: 'Wave', mtn: 'MTN', moov: 'Moov', card: 'OTP 3D-Secure' };
  for (const [k, t] of Object.entries(expect)) { await p.locator(`.rcard--pay:has(input[value=${k}])`).click(); ok((await text(p, '#pay-label')).includes(t), `${k} → ${await text(p, '#pay-label')}`); ok((await text(p, '#pay-hint')).length > 5, 'aide'); }
  await p.fill('[name=contact]', '0102030405'); eq(await p.inputValue('[name=phone]'), '0102030405', 'numéro de paiement suit le contact');
  await p.fill('[name=phone]', '0505050505'); await p.fill('[name=contact]', '0606060606'); eq(await p.inputValue('[name=phone]'), '0505050505', 'plus de lien après édition manuelle');
});
await test('Plaque connue : dossier pré-rempli (modèle + carte grise)', async (p) => {
  await open(p, '/reserver'); await pickSlot(p); await p.fill('[name=plate]', '6021 kb 01');
  eq(await p.inputValue('[name=model]'), 'Toyota RAV4'); ok((await text(p, '#dossier')).includes('pré-rempli'), 'bannière'); ok((await text(p, '#cg-line')).includes('CG24041160'), 'CG');
  ok((await text(p, '#plate-out')).includes('6021 KB 01'), 'plaque jaune');
  await p.fill('[name=plate]', '0000 ZZ 00'); ok((await text(p, '#dossier')).includes('Renseignez'), 'bannière dossier inconnu');
});
await test('Parcours complet → Pass : QR lisible, identifiant, agenda, impression, partage', async (p) => {
  await open(p, '/simulateur'); await p.click('#go-book'); await pickSlot(p); await fillPay(p, { method: 'moov' }); await payAndWait(p);
  const id = await text(p, '.ticket__id'); ok(/^SIC-VRD-\d{6}-\d{4}$/.test(id), 'identifiant ' + id);
  const ref = (await text(p, '.chip.chip--tonal.chip--lg')).match(/SIC-\d{4}-\d{6}/)?.[0]; ok(ref, 'référence');
  const payload = await decodeQR(p.locator('.ticket__qr .qr')); ok(payload.startsWith('SICTA|' + ref + '|7492KL01|'), 'payload QR : ' + payload); ok(payload.endsWith('|vridi'), 'centre dans le QR');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#cal')]); const ics = (await import('node:fs')).readFileSync(await dl.path(), 'utf8');
  ok(/BEGIN:VCALENDAR/.test(ics) && /SUMMARY:Visite technique SICTA 7492 KL 01/.test(ics) && /DTSTART:\d{8}T\d{6}/.test(ics) && /DTEND:\d{8}T\d{6}/.test(ics), '.ics valide');
  await p.click('#pdf'); const html = await printed(p); ok(/sheet/.test(html) && /<svg/.test(html) && html.includes(ref), 'feuille A4 générée');
  ok((await p.getAttribute('#share', 'href')).includes('wa.me') && (await p.getAttribute('#share', 'href')).includes(encodeURIComponent(ref)), 'lien WhatsApp');
  ok((await text(p, '.chip--cta.chip--lg')).includes('Moov'), 'moyen de paiement affiché');
  await p.reload(); await p.waitForSelector('.ticket'); eq(await text(p, '.ticket__id'), id, 'Pass persistant');
  await p.click('#done'); await p.waitForSelector('text=Simulateur officiel'); await open(p, '/reserver/pass'); eq(await hash(p), '#/reserver', 'réinitialisé');
});
await test('Pass : liste de documents interactive et persistante', async (p) => {
  await open(p, '/reserver'); await pickSlot(p); await fillPay(p); await payAndWait(p);
  eq(await text(p, '#doc-n'), '0/4 prêts'); await p.locator('.docrow').nth(0).click(); await p.locator('.docrow').nth(2).click(); eq(await text(p, '#doc-n'), '2/4 prêts');
  await p.reload(); await p.waitForSelector('.ticket'); eq(await text(p, '#doc-n'), '2/4 prêts');
  for (const i of [1, 3]) await p.locator('.docrow').nth(i).click(); ok((await text(p, '#doc-n')).includes('Tout est prêt'), 'complet');
});
await test('Double clic sur Payer : un seul paiement', async (p) => {
  await open(p, '/reserver'); await pickSlot(p); await fillPay(p); await p.click('#pay'); await p.click('#pay', { force: true, timeout: 500 }).catch(() => {});
  await p.waitForSelector('.ticket', { timeout: 9000 }); eq(await p.locator('.modal').count(), 0);
});
await test('Centre hors Abidjan : identifiant du Pass et piste', async (p) => {
  await open(p, '/reserver'); await pickSlot(p, { search: 'bouak' }); await fillPay(p); await payAndWait(p);
  ok(/^SIC-BKE-/.test(await text(p, '.ticket__id')), 'code Bouaké'); ok(/Bouaké/.test(await text(p, '.meta-grid')), 'centre');
});

group('Mes véhicules');
await test('Onglets, historique, ajout/retrait, carte grise, rendez-vous', async (p) => {
  await open(p, '/vehicules'); eq(await p.locator('.vtab').count(), 3); ok((await text(p, '#main')).includes('Toyota Corolla XLI'), 'fiche 1');
  ok((await text(p, '.platebar')).includes('1580 EF 01'), 'plaque'); ok((await text(p, '.due')).includes('J - 18'), 'J-18');
  eq(await p.locator('.hist').count(), 1); await p.click('[data-act=more]'); eq(await p.locator('.hist').count(), 3); await p.click('[data-act=more]'); eq(await p.locator('.hist').count(), 1);
  await p.locator('.vtab').nth(1).click(); ok((await text(p, 'h2.h2')).includes('RAV4'), 'RAV4'); ok((await text(p, '.due')).includes('J - 310'), 'J-310');
  await p.click('[data-act=add]'); await p.fill('#add [name=plate]', 'zz'); await p.click('#add button.btn--primary'); ok((await text(p, '#add .field__error')).includes('Format'), 'plaque invalide');
  await p.fill('#add [name=plate]', '6021 KB 01'); await p.click('#add button.btn--primary'); ok((await text(p, '#add .field__error')).includes('déjà'), 'doublon');
  await p.fill('#add [name=plate]', '7492 KL 01'); await p.click('#add button.btn--primary'); eq(await p.locator('.vtab').count(), 4); ok((await text(p, 'h2.h2')).includes('Hilux'), 'dossier retrouvé');
  await p.click('[data-act=add]'); await p.fill('#add [name=plate]', '0000 ZZ 00'); await p.click('#add button.btn--primary'); ok((await text(p, '#main')).includes('non référencé'), 'véhicule inconnu'); ok(await p.locator('[data-act=zoom]').count() === 0, 'pas de carte grise');
  await p.click('[data-act=del]'); eq(await p.locator('.vtab').count(), 4, 'retiré (5 → 4)'.length ? 4 : 0);
  await p.locator('.vtab').nth(0).click(); await p.click('[data-act=zoom]'); await p.waitForSelector('.modal .cg--big'); await p.keyboard.press('Escape'); eq(await p.locator('.modal').count(), 0, 'Échap ferme');
  await p.click('[data-act=pdf]'); ok((await printed(p)).includes('CG24029576'), 'PDF carte grise');
  await p.click('[data-act=book]'); eq(await hash(p), '#/reserver'); await pickSlot(p); eq(await p.inputValue('[name=plate]'), '1580 EF 01', 'plaque pré-remplie'); eq(await p.inputValue('[name=model]'), 'Toyota Corolla XLI', 'modèle pré-rempli');
});
await test('Retirer tous les véhicules : état vide puis ajout', async (p) => {
  await open(p, '/vehicules'); for (let i = 0; i < 3; i++) await p.click('[data-act=del]');
  ok((await text(p, '#main')).includes('Aucun véhicule enregistré'), 'vide'); await p.click('.card [data-act=add]'); await p.fill('#add [name=plate]', '4589 HJ 01'); await p.click('#add button.btn--primary'); eq(await p.locator('.vtab').count(), 1);
});
await test('« Vignette & taxes » ouvre la vérification avec la plaque', async (p) => {
  await open(p, '/vehicules'); await p.click('[data-act=vignette]'); await p.waitForSelector('.plate-check .result__title'); ok((await text(p, '.plate-check__out')).includes('1580 EF 01'), 'résultat');
});

group('Espace flotte');
await test('Dashboard : KPI, filtres, recherche, sélection', async (p) => {
  await open(p, '/flotte'); ok(/03/.test(await text(p, '.kpi--warn')), '3 urgents'); eq(await p.locator('label.veh').count(), 6);
  await p.click('[data-f=PL]'); eq(await p.locator('label.veh').count(), 2); await p.click('[data-f=Minibus]'); eq(await p.locator('label.veh').count(), 1); await p.click('[data-f=urgent]'); eq(await p.locator('label.veh').count(), 3); await p.click('[data-f=all]');
  await p.fill('#q', 'actros'); eq(await p.locator('label.veh').count(), 1); await p.fill('#q', 'zzzz'); ok((await text(p, '#list')).includes('Aucun véhicule'), 'vide'); await p.fill('#q', '');
  await p.click('#sel-urgent'); ok((await text(p, '#book-l')).includes('3 véhicules'), '3 urgents sélectionnés'); eq(await text(p, '#brk'), '1 PL, 1 VP, 1 Minibus');
  await uncheckAll(p);
  ok(await p.locator('#book').isDisabled(), 'CTA désactivé sans sélection'); ok((await text(p, '#book-l')).includes('au moins 1'), 'message'); eq(await text(p, '#brk'), 'Aucun type');
});
await test('Import CSV : lignes valides, erreurs, doublons, sélection auto', async (p) => {
  await open(p, '/flotte');
  await p.setInputFiles('#csv', csv(['plaque;modele;type;echeance;chauffeur;telephone', '4410 AA 01;Renault Master;VP;2026-12-15;Moussa Konaté;0707070707', '7492 KL 01;Doublon;VP;;;', 'BAD;Mauvaise;VP;;;', '5510 BB 01;Camion test;PL;;;']));
  await p.waitForSelector('.toast'); ok((await text(p, '.toast')).includes('2 véhicule'), 'toast : ' + (await text(p, '.toast'))); ok((await text(p, '#list')).includes('4410 AA 01') && (await text(p, '#list')).includes('Camion test'), 'ajoutés');
  ok((await text(p, '#count')) === '6', 'sélection auto : 4 + 2'); await p.reload(); await p.waitForSelector('label.veh'); eq(await p.locator('label.veh').count(), 8, 'persistant');
  await p.setInputFiles('#csv', csv(['zzz'])); await p.waitForSelector('.toast--err');
});
await test('Planning : centre, modes, dimanche décalé, convoi trop long bloque', async (p) => {
  await open(p, '/flotte'); await p.click('#book'); await p.waitForSelector('#cards');
  ok((await text(p, '#banner')).includes('2h00'), 'durée convoi 2h00'); ok((await text(p, '#banner')).includes('0 attente'), '0 attente'); eq(await p.locator('#cards article').count(), 4);
  await p.selectOption('#csel', 'bouake'); ok((await text(p, '#center')).includes('Bouaké'), 'centre changé');
  await p.click('[data-mode=etale]'); eq(await p.locator('.mini-date').count(), 4); 
  await p.fill('.mini-date >> nth=1', '2026-12-06'); await p.waitForSelector('.toast'); ok(!(await p.inputValue('.mini-date >> nth=1')).endsWith('12-06'), 'dimanche refusé'); ok((await p.inputValue('.mini-date >> nth=1')).endsWith('12-07'), 'décalé au lundi');
  await p.click('[data-mode=groupe]'); await p.fill('#dpick', '2026-12-13'); ok((await p.inputValue('#dpick')).endsWith('12-14'), 'convoi : dimanche → lundi');
  await p.click('#next'); await p.waitForSelector('text=Décompte fiscal');
});
await test('Convoi > heure de fermeture : alerte et blocage, levés en mode étalé', async (p) => {
  await open(p, '/flotte');
  await p.setInputFiles('#csv', csv(Array.from({ length: 14 }, (_, i) => `55${10 + i} CC 01;Camion ${i};PL;;;`))); await p.waitForSelector('.toast');
  await p.click('#book'); await p.waitForSelector('#banner');
  ok((await text(p, '#banner')).includes('Dépasse'), 'alerte dépassement'); ok(await p.locator('#next').isDisabled(), 'Facturation bloquée');
  await p.click('[data-mode=etale]'); ok(await p.locator('#next').isEnabled(), 'étalé : débloqué');
});
await test('Facturation : décompte = somme des lignes, remise, total ; erreurs de paiement', async (p) => {
  await open(p, '/flotte'); await p.click('#book'); await p.click('#next'); await p.waitForSelector('text=Décompte fiscal');
  const amts = (await p.locator('.lines--rows .amt b').allInnerTexts()).map((t) => Number(nospace(t))); const sum = amts.reduce((a, b) => a + b, 0);
  const total = Number(nospace(await text(p, '.total-card .amount b')));
  const disc = Number(nospace((await text(p, '.kv.accent b')).replace(/[^\d\s  ]/g, '')));
  eq(total, sum - disc, 'total = lignes − remise'); eq(sum, 12000 + 24000 + 21000 + 12000, 'lignes barème (Hilux, Actros, Coaster, Boxer)'); ok(disc === Math.round(sum * 0.05 / 50) * 50, 'remise 5 %');
  ok(nospace(await text(p, '#pay')).includes(String(total)), 'bouton affiche le total');
  await p.locator('.rcard--pay:has(input[value=wave])').click(); ok(await p.locator('#phone-box').isVisible(), 'champ téléphone visible pour Wave');
  await p.click('#pay'); ok((await text(p, '.phone-error')).includes('invalide'), 'téléphone requis'); ok(await p.locator('.modal').count() === 0, 'pas de paiement');
  await p.locator('.rcard--pay:has(input[value=card])').click(); ok(await p.locator('#phone-box').isHidden(), 'carte : pas de téléphone');
});
await test('Solde insuffisant : compte conventionné désactivé, mobile money disponible', async (p) => {
  await open(p, '/flotte'); await p.click('#book'); await p.click('#next'); await p.waitForSelector('text=Décompte fiscal');
  ok(await p.locator('input[value=account]').isDisabled(), 'compte désactivé'); ok((await text(p, '.rcard.is-off')).includes('insuffisant'), 'message');
  ok(await p.locator('input[name=pm]:checked').getAttribute('value') !== 'account', 'méthode par défaut ≠ compte');
}, { init: () => { const s = JSON.parse(localStorage.getItem('sicta:v1') || '{}'); s.fleet = { balance: 1000 }; localStorage.setItem('sicta:v1', JSON.stringify(s)); } });
await test('Parcours flotte complet : débit du compte, 4 Pass lisibles, envoi, PDF, facture réglée', async (p) => {
  await open(p, '/flotte'); await p.click('#book'); await p.click('#next'); await p.waitForSelector('text=Décompte fiscal');
  const total = Number(nospace(await text(p, '.total-card .amount b'))); await payAndWait(p, 'text=Passage flotte confirmé');
  eq(await p.evaluate(() => JSON.parse(localStorage.getItem('sicta:v1')).fleet.balance), 450000 - total, 'solde débité');
  const ref = (await text(p, '.chip--tonal')).match(/CMD-FLOTTE-\d{4}-\d{4}/)?.[0]; ok(ref, 'référence'); eq(await p.locator('.qr').count(), 4);
  for (let i = 0; i < 4; i++) { const payload = await decodeQR(p.locator('.qr').nth(i)); ok(payload.includes(`${ref}-0${i + 1}`), `QR ${i + 1} : ${payload}`); }
  ok(/08:30/.test(await text(p, '#passes article:nth-child(1)')) && /KL/.test(await text(p, '#passes article:nth-child(1)')), 'premier passage 08:30');
  await p.evaluate(() => document.querySelectorAll('[data-send]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault(), true)));
  await p.locator('[data-send]').first().click(); await p.waitForFunction(() => document.querySelectorAll('.chip--ok').length >= 1); await p.reload(); await p.waitForSelector('#passes');
  ok((await p.locator('#passes .chip--ok').count()) === 1, 'envoi persistant'); eq(await p.locator('#passes .chip--warn').count(), 3);
  await p.click('#pdf'); const html = await printed(p); eq((html.match(/class="sheet"/g) || []).length, 4, '4 pages A4'); ok((html.match(/<svg/g) || []).length === 4, '4 QR imprimés');
  await open(p, '/flotte/facturation'); ok((await text(p, '#main')).includes('Facture réglée'), 'facture réglée'); await p.click('#new'); eq(await hash(p), '#/flotte');
  await open(p, '/flotte/pass'); eq(await hash(p), '#/flotte/facturation');
});
await test('Modifier la sélection après paiement invalide la facture', async (p) => {
  await open(p, '/flotte'); await p.click('#book'); await p.click('#next'); await payAndWait(p, 'text=Passage flotte confirmé');
  await open(p, '/flotte'); await p.locator('label.veh').nth(5).click(); await open(p, '/flotte/facturation'); ok(await p.locator('#pay').count() === 1, 'à repayer');
});
await test('Mobile money flotte : numéro valide accepté (Orange)', async (p) => {
  await open(p, '/flotte'); await p.click('#book'); await p.click('#next'); await p.waitForSelector('#pay');
  await p.locator('.rcard--pay:has(input[value=orange])').click(); await p.fill('[name=phone]', '+225 07 00 00 00 00'); await payAndWait(p, 'text=Passage flotte confirmé');
  eq(await p.evaluate(() => JSON.parse(localStorage.getItem('sicta:v1')).fleet.balance), 450000, 'compte non débité'); eq(await p.evaluate(() => JSON.parse(localStorage.getItem('sicta:v1')).fleet.method), 'orange');
});

group('SICTA Pro');
await test('Simulateur de parc : curseurs, mode mobile, réinitialisation', async (p) => {
  await open(p, '/pro'); eq(await text(p, '#r-vol'), '60'); const t0 = nospace(await text(p, '#r-tot'));
  await p.locator('[data-k=vl]').fill('0'); eq(await text(p, '#r-vol'), '35'); ok(nospace(await text(p, '#r-tot')) !== t0, 'total recalculé');
  await p.locator('[data-k=vl]').fill('5'); await p.locator('[data-k=pl]').fill('2'); await p.click('[data-mode=mobile]'); ok(await p.locator('#mob-warn').isVisible(), 'avertissement unité mobile');
  await p.locator('[data-k=vl]').fill('30'); ok(await p.locator('#mob-warn').isHidden(), 'avertissement levé');
  await p.click('#reset'); eq(await text(p, '#r-vol'), '60'); eq(nospace(await text(p, '#r-tot')), t0);
  for (const k of ['vl', 'pl', 'bus', 'moto']) await p.locator(`[data-k=${k}]`).fill('0'); eq(await text(p, '#r-tot'), '0'); ok((await text(p, '#r-days')).includes('—'), 'pas de campagne');
});
await test('Formulaire de convention : validations puis confirmation', async (p) => {
  await open(p, '/pro'); await p.locator('#lead button[type=submit]').click(); eq(await p.locator('#lead [aria-invalid=true]').count(), 5, '5 champs signalés (la taille du parc est pré-remplie par le simulateur)');
  await p.selectOption('#lead [name=size]', ''); await p.locator('#lead button[type=submit]').click(); eq(await p.locator('#lead [aria-invalid=true]').count(), 6, '6 champs si la taille est vide'); ok((await p.evaluate(() => document.activeElement.name)) === 'company', 'focus sur le premier');
  await p.fill('#lead [name=company]', 'ACME SA'); await p.fill('#lead [name=contact]', 'Koné Mamadou, DG'); await p.fill('#lead [name=phone]', '0700000000'); await p.fill('#lead [name=email]', 'pas-un-email'); await p.selectOption('#lead [name=size]', '1'); await p.selectOption('#lead [name=zone]', { index: 1 });
  await p.locator('#lead button[type=submit]').click(); eq(await p.locator('#lead [aria-invalid=true]').count(), 1); ok((await text(p, '#lead')).includes('Adresse email invalide'), 'email');
  await p.fill('#lead [name=email]', 'dg@acme.ci'); await p.locator('#lead button[type=submit]').click(); await p.waitForSelector('#lead .okmark'); ok(/PRO-\d{4}-\d{4}/.test(await text(p, '#lead')), 'référence');
  eq(await p.evaluate(() => JSON.parse(localStorage.getItem('sicta:v1')).leads.length), 1);
});
await test('Taille du parc du formulaire suit le simulateur', async (p) => {
  await open(p, '/pro'); await p.locator('[data-k=vl]').fill('150'); await p.locator('[data-k=pl]').fill('80'); eq(await p.inputValue('#lead [name=size]'), '3');
});

group('Compte, centres, accessibilité');
await test('Profil : validation du téléphone, persistance, avatar', async (p) => {
  await open(p, '/compte'); await p.fill('#prof [name=name]', 'Awa'); await p.fill('#prof [name=phone]', '123'); await p.click('#prof button.btn--primary'); ok((await text(p, '#prof .field__error')).includes('invalide'), 'téléphone invalide');
  await p.fill('#prof [name=phone]', '0708091011'); await p.click('#prof button.btn--primary'); await p.waitForSelector('.toast--ok'); eq(await text(p, '#avatar'), 'A'); await p.reload(); eq(await p.inputValue('#prof [name=name]'), 'Awa');
  await open(p, '/simulateur'); ok((await text(p, '#main h1')).includes('Awa'), 'salutation');
  await open(p, '/reserver'); await pickSlot(p); eq(await p.inputValue('[name=contact]'), '07 08 09 10 11', 'contact pré-rempli depuis le profil');
});
await test('Centres : recherche, filtre de zone, réservation depuis un centre', async (p) => {
  await open(p, '/centres'); eq(await p.locator('#list article').count(), 13); await p.click('[data-zone=abidjan]'); eq(await p.locator('#list article').count(), 4);
  await p.fill('#q', 'koumassi'); eq(await p.locator('#list article').count(), 1); await p.fill('#q', 'zzz'); ok((await text(p, '#list')).includes('Aucun centre'), 'vide');
  await p.fill('#q', 'koumassi'); await p.locator('[data-book]').click(); eq(await hash(p), '#/reserver'); ok((await text(p, '.station.is-on')).includes('Koumassi'), 'centre présélectionné');
});
await test('Réinitialiser les données de démo', async (p) => {
  await open(p, '/vehicules'); await p.click('[data-act=del]'); await open(p, '/compte'); await p.click('#reset'); await open(p, '/vehicules'); eq(await p.locator('.vtab').count(), 3);
});
await test('Accessibilité : noms accessibles, langue, repères', async (p) => {
  await open(p, '/'); ok((await p.evaluate(() => document.documentElement.lang)) === 'fr', 'lang=fr');
  for (const r of ['/', '/simulateur', '/reserver', '/vehicules', '/compte', '/verifier', '/flotte', '/pro', '/centres']) {
    await open(p, r);
    const bad = await p.evaluate(() => {
      const name = (e) => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.innerText || e.getAttribute('title') || (e.labels?.[0]?.innerText) || e.getAttribute('placeholder') || '').trim();
      return [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea')].filter((e) => !e.closest('[hidden]') && !name(e) && !e.closest('label')).map((e) => e.outerHTML.slice(0, 90));
    });
    eq(bad.length, 0, `${r} : éléments sans nom accessible ${bad.join(' ; ')}`);
    ok(await p.locator('main').count() === 1, 'un <main>');
    const imgs = await p.evaluate(() => [...document.images].filter((i) => !i.hasAttribute('alt')).length); eq(imgs, 0, 'alt sur les images');
  }
});
await test('Clavier : lien d’évitement, onglets et boutons atteignables', async (p) => {
  await open(p, '/simulateur'); ok((await p.evaluate(() => document.activeElement.id)) === 'main', 'le focus est placé sur le contenu à chaque changement de page');
  await p.locator('.skip').focus(); const top = await p.locator('.skip').boundingBox(); ok(top.y >= 0, 'lien d’évitement visible au focus');
  await p.evaluate(() => document.querySelector('#topbar a.brand').focus()); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  await p.locator('.skip').focus(); await p.keyboard.press('Enter'); ok((await p.evaluate(() => document.activeElement.id)) === 'main', 'le lien d’évitement mène au contenu');
  await open(p, '/reserver'); await p.locator('.day:not([disabled])').first().focus(); await p.keyboard.press('Enter'); await p.locator('.slot:not([disabled])').first().focus(); await p.keyboard.press('Space'); ok(await p.locator('#go').isEnabled(), 'créneau choisi au clavier');
});
await test('Impression : seule la feuille A4 est visible', async (p) => {
  await open(p, '/reserver'); await pickSlot(p); await fillPay(p); await payAndWait(p);
  await p.evaluate(() => { window.print = () => {}; }); await p.click('#pdf'); await p.waitForSelector('#print-root', { state: 'attached' }); await p.emulateMedia({ media: 'print' });
  eq(await p.locator('main').isVisible(), false, 'main masqué à l’impression'); eq(await p.locator('#topbar').isVisible(), false, 'en-tête masqué'); eq(await p.locator('#print-root .sheet').isVisible(), true, 'feuille visible'); ok((await p.locator('#print-root svg').count()) === 1, 'QR imprimé');
});

group('Hors ligne (service worker)');
await test('Toutes les routes restent disponibles hors ligne après une première visite', async (p, ctx) => {
  await p.goto(BASE); await p.waitForFunction(() => navigator.serviceWorker.controller || false, null, { timeout: 8000 }).catch(() => {}); await p.reload(); await p.waitForTimeout(800);
  for (const r of ['/simulateur', '/reserver', '/vehicules', '/compte', '/verifier', '/centres', '/flotte', '/flotte/compte', '/pro']) await open(p, r);
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(400);
  for (const [r, sel] of [['/simulateur', 'text=Simulateur officiel'], ['/reserver', 'text=Choisissez votre station'], ['/vehicules', '.vtab'], ['/pro', 'text=Simulateur de gestion de parc'], ['/flotte', 'label.veh'], ['/verifier', '.plate-check']]) { await open(p, r); await p.waitForSelector(sel, { timeout: 4000 }); }
  ok(await p.locator('#offline').isVisible(), 'bannière hors ligne'); await ctx.setOffline(false);
});
await test('Un Pass émis reste lisible hors ligne', async (p, ctx) => {
  await p.goto(BASE); await p.waitForTimeout(1500); await open(p, '/reserver'); await pickSlot(p); await fillPay(p); await payAndWait(p);
  await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.ticket', { timeout: 5000 }); await decodeQR(p.locator('.ticket__qr .qr')); await ctx.setOffline(false);
});

group('Responsive : aucune coupure horizontale, aucune erreur');
const ROUTES = ['/', '/simulateur', '/reserver', '/reserver/creneau', '/vehicules', '/compte', '/verifier', '/centres', '/flotte', '/flotte/planning', '/flotte/facturation', '/flotte/compte', '/pro'];
for (const w of [320, 390, 768, 1024, 1280, 1536]) {
  await test(`largeur ${w}px`, async (p) => {
    for (const r of ROUTES) {
      await open(p, r); await p.waitForTimeout(80);
      const o = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, el: [...document.querySelectorAll('body *')].filter((e) => { const b = e.getBoundingClientRect(); return b.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.chips--scroll,.vtabs,.pay-row,.days,svg'); }).slice(0, 2).map((e) => e.tagName + '.' + String(e.className?.baseVal ?? e.className).slice(0, 30)) }));
      ok(o.over <= 1, `${r} déborde de ${o.over}px (${o.el})`);
    }
  }, { viewport: { width: w, height: w < 700 ? 800 : 900 } });
}

await browser.close();
console.log(`\n${passed} réussis, ${failed} échoués`);
if (failed) { console.log('Échecs :\n - ' + failures.join('\n - ')); process.exit(1); }
