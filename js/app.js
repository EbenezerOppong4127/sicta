// Point d'entrée : routes, chrome (en-tête / onglets / titre) et enregistrement du service worker.
import { startRouter, go } from './router.js';
import { ic } from './util.js';

const lazy = (name) => () => import(`./screens/${name}.js`);
const redirect = (to) => async () => ({ default: () => ({ redirect: to }) });

const STEP_BACK = { tarif: '/simulateur', creneau: '/reserver', paiement: '/reserver/creneau', pass: '/simulateur' };

const routes = [
  { path: '/', load: lazy('home'), nav: null, footer: true, title: '' },
  { path: '/simulateur', load: lazy('simulateur'), nav: 'user', key: '/simulateur', title: 'Simulateur' },
  { path: '/tarifs', load: redirect('/simulateur') },
  { path: '/reserver/:step?', load: lazy('reserver'), nav: 'user', key: '/reserver', title: 'Rendez-vous', back: (p) => STEP_BACK[p.step ?? 'tarif'] },
  { path: '/centres', load: lazy('centres'), nav: 'user', key: '/centres', title: 'Centres & horaires', back: '/simulateur' },
  { path: '/vehicules', load: lazy('vehicules'), nav: 'user', key: '/vehicules', title: 'Mes véhicules', back: '/simulateur' },
  { path: '/compte', load: lazy('compte'), nav: 'user', key: '/compte', title: 'Profil & aide', back: '/simulateur' },
  { path: '/verifier', load: lazy('verifier'), nav: 'user', key: null, title: 'Vérifier ma vignette', back: '/' },
  { path: '/flotte', load: lazy('flotte'), nav: 'fleet', key: '/flotte', title: 'Dashboard flotte', back: '/' },
  { path: '/flotte/planning', load: lazy('flotte-planning'), nav: 'fleet', key: '/flotte/planning', title: 'Planification flotte', back: '/flotte' },
  { path: '/flotte/facturation', load: lazy('flotte-facturation'), nav: 'fleet', key: '/flotte/facturation', title: 'Facturation groupée', back: '/flotte/planning' },
  { path: '/flotte/pass', load: lazy('flotte-pass'), nav: 'fleet', key: '/flotte/facturation', title: 'Pass & Dispatch', back: '/flotte' },
  { path: '/flotte/compte', load: lazy('flotte-compte'), nav: 'fleet', key: '/flotte/compte', title: 'Compte entreprise', back: '/flotte' },
  { path: '/:any', load: redirect('/'), notFound: true },
];

const NAV = {
  user: [['/simulateur', 'home', 'Accueil'], ['/reserver', 'calendar_month', 'Rendez-vous'], ['/centres', 'pin_drop', 'Centres'], ['/vehicules', 'garage', 'Véhicules'], ['/compte', 'person', 'Compte']],
  fleet: [['/flotte', 'grid_view', 'Tableau de bord'], ['/flotte/planning', 'calendar_month', 'Planning'], ['/flotte/facturation', 'receipt_long', 'Facturation'], ['/flotte/compte', 'corporate_fare', 'Compte']],
};
const TOP = [['/', 'Accueil'], ['/reserver', 'Prendre rendez-vous'], ['/simulateur', 'Tarifs & réglementation'], ['/centres', 'Centres & horaires'], ['/verifier', 'Vérifier ma vignette'], ['/flotte', 'Espace flotte B2B']];

const $ = (s) => document.querySelector(s);
const main = $('#main');
const tabs = $('#tabs');
const backBtn = $('#back');
let backTo = null;

$('#topnav').innerHTML = TOP.map(([h, l]) => `<a href="#${h}" data-h="${h}">${l}</a>`).join('');
backBtn.addEventListener('click', () => backTo && go(backTo));

$('#footer').innerHTML = `
  <div class="wrap footer__in">
    <div><b>SICTA CI</b><p class="small">Opérateur du contrôle technique automobile en Côte d’Ivoire. Prototype de démonstration : aucun paiement réel.</p></div>
    <div class="small"><b>Assistance</b><br>Centre d’appels : <a href="tel:1300">1300</a> · Urgence : <a href="tel:1301">1301</a><br>Boulevard de Vridi, Zone Portuaire, Abidjan</div>
  </div>
  <div class="footer__bar small">© ${new Date().getFullYear()} SICTA — Société Ivoirienne de Contrôles Techniques Automobiles.</div>`;

startRouter(routes, (route, params, view) => {
  backTo = typeof route.back === 'function' ? route.back(params) : route.back ?? null;
  backBtn.hidden = !backTo;
  $('#page-title').textContent = route.title ?? '';
  document.title = route.title ? `${route.title} — SICTA` : 'SICTA — Contrôle technique automobile, Côte d’Ivoire';

  // onglets (bas d'écran sur mobile, sous l'en-tête sur desktop)
  const items = NAV[route.nav];
  tabs.hidden = !items;
  document.body.classList.toggle('has-tabs', !!items);
  if (items) {
    tabs.innerHTML = items
      .map(([h, i, l]) => `<a href="#${h}" class="${h === route.key ? 'is-on' : ''}" ${h === route.key ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></a>`)
      .join('');
  }
  document.querySelectorAll('#topnav a').forEach((a) => {
    const on = a.dataset.h === '/' ? location.hash.replace('#', '') === '/' || location.hash === '' : location.hash.replace('#', '').startsWith(a.dataset.h);
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  $('#footer').hidden = !route.footer;

  main.replaceChildren(view);
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
});

// PWA : installation + hors ligne
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__installPrompt = e;
});
const offline = $('#offline');
const syncNet = () => (offline.hidden = navigator.onLine);
addEventListener('online', syncNet);
addEventListener('offline', syncNet);
syncNet();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
