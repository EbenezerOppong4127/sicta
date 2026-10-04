// Pass & Dispatch chauffeurs (Image_26) : un Pass QR par véhicule, envoi WhatsApp/SMS, PDF A4.
import { LANE_SHORT } from '../data.js';
import { dateLong, el, esc, ic, phonePretty, toast } from '../util.js';
import { center, fleetVehicles, qrPayload } from '../domain.js';
import { store } from '../store.js';
import { plateBadge, qrBlock, stepper } from '../components/ui.js';
import { printSheets } from '../components/print.js';

export default function pass({ go }) {
  const f = store.get().fleet;
  if (!f.paid || !f.snapshot) return { redirect: '/flotte/facturation' };
  const byId = new Map(fleetVehicles().map((v) => [v.id, v]));
  const c = center(f.snapshot.centerId);
  const items = f.snapshot.plan.filter((p) => byId.has(p.id)).map((p, i) => {
    const v = byId.get(p.id);
    const ref = `${f.ref}-${String(i + 1).padStart(2, '0')}`;
    return { ...p, v, n: i + 1, ref, qr: qrPayload({ ref, plate: v.plate, date: p.date, time: p.start, centerId: c.id }) };
  });
  const dates = [...new Set(items.map((i) => i.date))];
  const first = (v) => v.driver.split(' ')[0];
  const msg = (i) => `Pass SICTA ${i.ref} — ${i.v.plate}, ${dateLong(i.date)} à ${i.start}, ${c.name}. Présentez le QR à l'entrée.`;

  const root = el(`
  <div class="wrap wrap--app stack-lg">
    ${stepper(['Sélection', 'Créneaux', 'Facturation', 'Pass'], 4)}
    <section class="card pass">
      <div class="pass__ok"><span class="okmark">${ic('verified')}</span><span class="eyebrow eyebrow--o">Session confirmée</span><h1 class="h1">Passage flotte confirmé !</h1>
        <span class="chip chip--tonal">${ic('confirmation_number')} #${esc(f.ref)}</span></div>
      <div class="note">${ic('location_on')}<div><b>${dates.length > 1 ? `${dateLong(dates[0])} → ${dateLong(dates.at(-1))}` : dateLong(dates[0])}</b><br><span class="small">Centre SICTA ${esc(c.name)}</span></div></div>
    </section>
    <div class="banner banner--dark"><span class="row row--gap">${ic('bolt')}<b>${items.length} Pass numériques coupe-file</b></span><span class="chip chip--cta">Prêts</span></div>
    <section class="stack"><div class="row row--between"><h2>Pass &amp; Dispatch chauffeurs</h2><span class="small muted">${items.length} véhicules programmés</span></div>
      <div class="stack" id="passes"></div></section>
    <div class="note">${ic('sensors')}<div><b>Suivi télématique en direct</b><p class="small muted">Dès qu’un véhicule franchit la barrière du centre, son statut passe à « <b>En cours de contrôle</b> » dans votre espace gestionnaire.</p></div></div>
    <div class="stack">
      <button class="btn btn--cta btn--lg btn--block" id="pdf">${ic('picture_as_pdf')}<span>Télécharger tous les Pass QR (PDF A4)</span></button>
      <button class="btn btn--tonal btn--lg btn--block" id="share">${ic('share')}<span>Partager les accès aux chauffeurs (tous)</span></button>
      <a class="btn btn--ghost btn--block" href="#/flotte">${ic('dashboard')}<span>Retour au tableau de bord flotte</span></a>
    </div>
  </div>`);

  const paint = () => {
    const sent = store.get().fleet.sent;
    root.querySelector('#passes').innerHTML = items.map((i) => `
      <article class="card stack"><div class="row row--between"><span class="row row--gap small"><i class="dot dot--o"></i><b>${i.start}</b><span class="muted">• ${LANE_SHORT[i.v.cat]}${dates.length > 1 ? ` • ${i.date.slice(8)}/${i.date.slice(5, 7)}` : ''}</span></span>
        ${sent[i.v.id] ? `<span class="chip chip--ok">${ic('check_circle')} SMS &amp; WhatsApp envoyé</span>` : `<span class="chip chip--warn">${ic('schedule')} Prêt à envoyer</span>`}</div>
        <div class="row row--between"><div class="stack-s">${plateBadge(i.v.plate)}<b>${esc(i.v.short)} <span class="muted">(${esc(i.v.role)})</span></b>
          <span class="small">${ic('person')} ${esc(i.v.driver)}</span>${i.v.phone ? `<span class="small">${ic('call')} +225 ${phonePretty(i.v.phone)}</span>` : ''}</div>
          <div class="center-text">${qrBlock(i.qr, 'sm')}<span class="small accent"><b>PASS #${String(i.n).padStart(2, '0')}</b></span></div></div>
        ${sent[i.v.id] ? '' : `<div class="row"><a class="btn btn--cta grow" data-send="${i.v.id}" target="_blank" rel="noopener" href="https://wa.me/${i.v.phone ? `225${i.v.phone}` : ''}?text=${encodeURIComponent(msg(i))}">${ic('send')}<span>Envoyer à ${esc(first(i.v))} (WhatsApp)</span></a>
          ${i.v.phone ? `<a class="icon-btn icon-btn--tonal" data-send="${i.v.id}" aria-label="Envoyer par SMS" href="sms:+225${i.v.phone}?&body=${encodeURIComponent(msg(i))}">${ic('sms')}</a>` : ''}</div>`}
      </article>`).join('');
  };

  root.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-send]');
    if (s) {
      // On laisse le lien s'ouvrir, puis on marque le Pass comme envoyé.
      setTimeout(() => {
        store.patch('fleet', { sent: { ...store.get().fleet.sent, [s.dataset.send]: true } });
        paint();
        toast('Pass envoyé au chauffeur', 'ok');
      }, 400);
    } else if (e.target.closest('#pdf')) {
      printSheets(items.map((i) => `<section class="sheet"><h1>Pass visite technique SICTA</h1><p class="ref">${esc(i.ref)}</p>${qrBlock(i.qr, 'xl')}
        <p class="big">${esc(i.v.plate)}</p><p>${esc(i.v.short)} — ${esc(i.v.driver)}</p><p>${dateLong(i.date)} · ${i.start}-${i.end} · ${LANE_SHORT[i.v.cat]}<br>${esc(c.name)}</p></section>`).join(''));
    } else if (e.target.closest('#share')) {
      const text = items.map((i) => `${i.v.plate} — ${i.v.driver} — ${i.start}`).join('\n');
      const body = `Pass SICTA ${f.ref}\n${c.name}\n${text}`;
      try {
        if (navigator.share) await navigator.share({ title: `Pass SICTA ${f.ref}`, text: body });
        else {
          await navigator.clipboard.writeText(body);
          toast('Récapitulatif de dispatch copié dans le presse-papiers');
        }
      } catch { /* annulé */ }
    }
  });
  paint();
  return root;
}
