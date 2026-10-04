// Routeur à base de hash : fonctionne tel quel sous https://<user>.github.io/sicta/ (aucun rewrite serveur).
const compile = (path) => {
  const keys = [];
  const re = path
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      if (seg.startsWith(':')) {
        const opt = seg.endsWith('?');
        keys.push(seg.slice(1).replace('?', ''));
        return opt ? '(?:/([^/]+))?' : '/([^/]+)';
      }
      return `/${seg}`;
    })
    .join('');
  return { re: new RegExp(`^${re || '/'}/?$`), keys };
};

export const currentPath = () => {
  const p = location.hash.replace(/^#/, '');
  return p.startsWith('/') ? p : '/';
};

export function go(path, { replace = false } = {}) {
  const url = `#${path}`;
  if (replace) location.replace(url);
  else if (location.hash !== url) location.hash = url;
  else window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function startRouter(routes, onRender) {
  const table = routes.map((r) => ({ ...r, ...compile(r.path) }));
  let token = 0;

  async function resolve() {
    const path = currentPath();
    const my = ++token;
    let route, params = {};
    for (const r of table) {
      const m = path.match(r.re);
      if (m) {
        route = r;
        r.keys.forEach((k, i) => (params[k] = m[i + 1]));
        break;
      }
    }
    route ??= table.find((r) => r.notFound);
    const mod = await route.load();
    if (my !== token) return; // une navigation plus récente a pris le relais
    const out = mod.default({ params, path, go });
    if (out && out.redirect) return go(out.redirect, { replace: true });
    onRender(route, params, out);
  }

  window.addEventListener('hashchange', resolve);
  resolve();
}
