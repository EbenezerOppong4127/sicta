// Compte entreprise : fiche société, import CSV, démo.
import { COMPANY } from '../data.js';
import { download, el, ic, toast } from '../util.js';
import { fleetVehicles, parseFleetCsv } from '../domain.js';
import { store } from '../store.js';

const TEMPLATE = 'plaque;modele;type;echeance;chauffeur;telephone\n4410 AA 01;Renault Master;VP;2026-12-15;Moussa Konaté;0707070707\n';

export default function compteFlotte({ go }) {
  const root = el(`
  <div class="wrap wrap--app stack-lg">
    <header><h1 class="h1">Compte entreprise</h1></header>
    <section class="card stack"><span class="eyebrow ok">${ic('verified')} Flotte certifiée ${COMPANY.ref}</span><h2>${COMPANY.name}</h2><p class="muted">${COMPANY.addr}</p>
      <div class="kv"><span>Unités actives</span><b>${COMPANY.units}</b></div><div class="kv"><span>Véhicules chargés (démo)</span><b>${fleetVehicles().length}</b></div></section>
    <section class="card stack"><h2>Importer des véhicules</h2>
      <p class="small muted">Fichier CSV : plaque ; modèle ; type (VP, PL, Minibus) ; échéance AAAA-MM-JJ ; chauffeur ; téléphone.</p>
      <label class="btn btn--primary" for="csv">${ic('upload_file')}<span>Choisir un fichier CSV</span></label><input id="csv" type="file" accept=".csv,text/csv,text/plain" hidden>
      <button class="btn btn--tonal" id="tpl">${ic('download')}<span>Télécharger le modèle</span></button></section>
    <section class="card stack"><h2>Démonstration</h2>
      <button class="btn btn--ghost" id="reset">${ic('restart_alt')}<span>Réinitialiser la flotte de démo</span></button>
      <a class="btn btn--ghost" href="#/simulateur">${ic('person')}<span>Passer à l’espace particulier</span></a></section>
  </div>`);
  root.querySelector('#tpl').onclick = () => download('modele-flotte-sicta.csv', TEMPLATE, 'text/csv');
  root.querySelector('#reset').onclick = () => {
    store.reset('fleet');
    toast('Flotte de démo réinitialisée', 'ok');
    go('/flotte');
  };
  root.querySelector('#csv').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { added, errors } = parseFleetCsv(await file.text(), fleetVehicles().map((v) => v.plate));
    if (added.length) store.patch('fleet', { extra: [...store.get().fleet.extra, ...added], selected: [...store.get().fleet.selected, ...added.map((v) => v.id)] });
    toast(`${added.length} importé(s)${errors.length ? ` · ${errors.length} ignoré(s)` : ''}`, added.length ? 'ok' : 'err');
    if (added.length) go('/flotte');
  });
  return root;
}
