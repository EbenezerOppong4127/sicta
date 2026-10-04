// Vérification de vignette / carte grise (module de la maquette desktop Image_16).
import { el, ic } from '../util.js';
import { plateCheck } from '../components/plateCheck.js';

export default function verifier() {
  const root = el(`
  <div class="wrap wrap--app stack-lg">
    <section class="card stack">
      <span class="eyebrow">${ic('verified')} Authentification sécurisée DGI &amp; SICTA</span>
      <h1 class="h1">Vérifiez votre vignette &amp; carte grise en temps réel</h1>
      <p class="muted">Consultez la date limite de validité et le statut de conformité de votre véhicule dans la base centrale.</p>
      <div id="chk"></div>
      <p class="small muted">${ic('info')} Démonstration : base simulée. Essayez <b>7492 KL 01</b>, <b>5521 HG 01</b> ou <b>CG24029576</b>.</p>
    </section>
    <section class="card note">${ic('shield')}<div><b>Pourquoi vérifier ?</b><p class="small muted">Une vignette expirée depuis plus de 15 jours expose à une contravention forfaitaire. Activez le rappel SMS (J-30 et J-2) depuis le résultat.</p></div></section>
  </div>`);
  root.querySelector('#chk').append(plateCheck({ placeholder: 'Plaque (7492 KL 01) ou carte grise (CG24029576)' }));
  return root;
}
