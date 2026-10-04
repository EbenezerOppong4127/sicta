// Petits composants d'interface : stepper, plaque, QR, modale de paiement.
import { PAYMENTS, PUBLIC_PAY } from '../data.js';
import { esc, el, ic, phonePretty } from '../util.js';
import { qrSvg } from '../domain.js';

export const stepper = (labels, current) => `
  <ol class="stepper" aria-label="Progression">
    ${labels
      .map((l, i) => {
        const st = i < current ? 'done' : i === current ? 'now' : 'todo';
        return `<li class="stepper__step is-${st}" ${st === 'now' ? 'aria-current="step"' : ''}>
          <span class="stepper__dot">${st === 'done' ? ic('check') : i + 1}</span><span class="stepper__label">${l}</span></li>`;
      })
      .join('')}
  </ol>`;

export const plateBadge = (plate) => `<span class="plate"><b>CI</b>${esc(plate)}</span>`;

export const qrBlock = (payload, size = 'md') => `<div class="qr qr--${size}" role="img" aria-label="QR code du Pass">${qrSvg(payload)}</div>`;

/** Cartes de règlement (radio) : opérateurs Mobile Money + carte. */
export const payCards = (selected) => `
  <div class="rlist" role="radiogroup" aria-label="Mode de règlement">
    ${PUBLIC_PAY.map((k) => {
      const p = PAYMENTS[k];
      return `<label class="rcard rcard--pay ${k === selected ? 'is-on' : ''}"><input type="radio" name="pm" value="${k}" ${k === selected ? 'checked' : ''}>
        <span class="pay-dot pay-dot--lg" style="background:${p.color};color:${p.fg}">${p.short}</span>
        <span class="rcard__b"><span class="row row--gap"><b>${p.label}</b>${p.badge ? `<span class="chip chip--${k === 'orange' ? 'warn' : 'ok'}">${p.badge}</span>` : ''}</span><span class="small muted">${p.desc}</span></span></label>`;
    }).join('')}
  </div>`;

export const phoneField = (value) => `
  <label class="field">
    <span class="field__label">Numéro Mobile Money</span>
    <span class="field__row"><span class="field__prefix">+225</span>
      <input name="phone" inputmode="tel" autocomplete="tel-national" placeholder="07 08 11 22 33" value="${esc(value)}" aria-describedby="ph-err"></span>
    <span class="field__error phone-error" id="ph-err" role="alert"></span>
    <span class="field__hint pay-hint"></span>
  </label>`;

/** Simule la demande de validation Mobile Money, puis résout. */
export function payModal({ method, phone, amount }) {
  const P = PAYMENTS[method];
  return new Promise((resolve) => {
    const m = el(`
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pm-t">
        <div class="modal__card">
          <span class="pay-dot pay-dot--lg" style="background:${P.color};color:${P.fg}">${P.short}</span>
          <h2 id="pm-t">Validation ${esc(P.label)}</h2>
          <p class="muted">${phone ? `Demande envoyée au <strong>+225 ${phonePretty(phone)}</strong>.<br>` : ''}${esc(P.ussd)}</p>
          <div class="spinner" aria-hidden="true"></div>
          <p class="small muted">Simulation : aucun débit réel n’est effectué.</p>
        </div>
      </div>`);
    document.body.append(m);
    setTimeout(() => {
      m.querySelector('.modal__card').innerHTML = `
        <span class="okmark">${ic('check_circle')}</span><h2>Paiement reçu</h2><p class="muted">${amount}</p>`;
      setTimeout(() => {
        m.remove();
        resolve(true);
      }, 900);
    }, 2400);
  });
}
