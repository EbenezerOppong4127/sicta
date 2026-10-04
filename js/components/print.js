// Impression A4 / "Enregistrer en PDF" via le navigateur : aucune dépendance, fonctionne hors ligne.
export function printSheets(html) {
  document.getElementById('print-root')?.remove();
  const root = document.createElement('div');
  root.id = 'print-root';
  root.innerHTML = html;
  document.body.append(root);
  document.body.classList.add('printing');
  const done = () => {
    document.body.classList.remove('printing');
    root.remove();
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  requestAnimationFrame(() => window.print());
}
