// Régénère la liste de précache et la version du service worker.
// Usage : node scripts/stamp-sw.mjs [build-id]   (par défaut : hash du contenu des fichiers)
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['.git', '.github', 'scripts', 'node_modules', 'sw.js', 'README.md', '.nojekyll']);
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir).sort()) {
    if (SKIP.has(f)) continue;
    const p = join(dir, f);
    statSync(p).isDirectory() ? walk(p) : files.push(relative(root, p));
  }
})(root);

const hash = createHash('sha1');
for (const f of files) hash.update(f).update(readFileSync(join(root, f)));
const build = process.argv[2] || hash.digest('hex').slice(0, 10);

let sw = readFileSync(join(root, 'sw.js'), 'utf8');
sw = sw.replace(/const BUILD = '[^']*';/, `const BUILD = '${build}';`);
sw = sw.replace(/\/\/ <assets>[\s\S]*?\/\/ <\/assets>/, `// <assets>\nconst ASSETS = ${JSON.stringify(['./', ...files.map((f) => `./${f}`)], null, 2)};\n// </assets>`);
writeFileSync(join(root, 'sw.js'), sw);
console.log(`sw.js : build ${build}, ${files.length + 1} fichiers en précache`);
