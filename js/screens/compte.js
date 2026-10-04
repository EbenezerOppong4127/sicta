// Profil & aide (espace particulier).
import { el, esc, ic, normPhone, phonePretty, toast } from '../util.js';
import { store } from '../store.js';

export default function compte({ go }) {
  const { profile, reminders } = store.get();
  const n = Object.values(reminders).filter(Boolean).length;
  const root = el(`
  <div class="wrap wrap--app stack-lg">
    <header><h1 class="h1">Profil &amp; aide</h1></header>
    <form class="card stack" id="prof" novalidate>
      <h2>Mes informations</h2>
      <label class="field"><span class="field__label">Prénom</span><input name="name" autocomplete="given-name" value="${esc(profile.name)}"></label>
      <label class="field"><span class="field__label">Téléphone (rappels SMS, WhatsApp)</span><span class="field__row"><span class="field__prefix">+225</span><input name="phone" inputmode="tel" autocomplete="tel-national" placeholder="07 08 11 22 33" value="${esc(profile.phone ? phonePretty(profile.phone) : '')}"></span><span class="field__error" role="alert"></span></label>
      <button class="btn btn--primary">${ic('save')}<span>Enregistrer</span></button>
      <p class="small muted">${ic('notifications_active')} ${n} rappel${n > 1 ? 's' : ''} SMS actif${n > 1 ? 's' : ''} (J-30 et J-2).</p>
    </form>
    <section class="card stack"><h2>Aide</h2>
      <a class="btn btn--tonal" href="tel:1300">${ic('call')}<span>Centre d’appels SICTA — 1300 (gratuit)</span></a>
      <a class="btn btn--tonal" href="tel:1301">${ic('support_agent')}<span>Urgence — 1301</span></a>
      <a class="btn btn--ghost" href="#/centres">${ic('pin_drop')}<span>Trouver un centre</span></a></section>
    <section class="card stack"><h2>Application</h2>
      <button class="btn btn--primary" id="install" hidden>${ic('install_desktop')}<span>Installer l’application</span></button>
      <a class="btn btn--ghost" href="#/flotte">${ic('corporate_fare')}<span>Espace flotte &amp; entreprises</span></a>
      <button class="btn btn--ghost" id="reset">${ic('restart_alt')}<span>Réinitialiser les données de démo</span></button></section>
  </div>`);
  root.querySelector('#prof').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const raw = f.phone.value.trim();
    const ph = raw ? normPhone(raw) : '';
    if (raw && !ph) return void (f.querySelector('.field__error').textContent = 'Numéro invalide : 10 chiffres.');
    f.querySelector('.field__error').textContent = '';
    store.patch('profile', { name: f.name.value.trim() || 'Koffi', phone: ph });
    toast('Profil enregistré', 'ok');
  });
  const inst = root.querySelector('#install');
  if (window.__installPrompt) inst.hidden = false;
  inst.onclick = async () => {
    const p = window.__installPrompt;
    if (!p) return;
    p.prompt();
    await p.userChoice;
    window.__installPrompt = null;
    inst.hidden = true;
  };
  root.querySelector('#reset').onclick = () => {
    store.reset();
    toast('Données de démo réinitialisées', 'ok');
    go('/');
  };
  return root;
}
