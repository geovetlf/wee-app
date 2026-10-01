/*
 * CONFIGURACIÓN DE ENTREGA — lo que el Weë Agent Harness no deja olvidar.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * La auditoría H0 (2026-09-30) encontró reglas que solo existían en prosa:
 *
 *  · `functions/.env.local` (claves de proveedores) viajaba dentro del paquete
 *    de 30 funciones vivas, porque `firebase.json` no tenía `functions.ignore`.
 *  · `functions/lib` estaba versionado y congelado desde `76ca834`: un artefacto
 *    compilado con archivos huérfanos que se subían a producción.
 *  · `.claude/settings.local.json`, heredado y versionado en un repo público,
 *    preaprobaba `firebase deploy` y `functions:delete`.
 *  · Copias `.env.*`, `*.bak-*` y `*.antes-*` sin versionar ni ignorar.
 *
 * Cada regla de aquí es determinista y barata; ninguna llama a nada externo.
 * Si una falla, lo que falla es la configuración, no la prueba: arréglala.
 */
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── A. Lo que sube un despliegue de Functions ──────────────────────────── */
const firebase = JSON.parse(leer('firebase.json'));
const ignora = (firebase.functions && firebase.functions.ignore) || [];
check('1) firebase.json declara functions.ignore', Array.isArray(ignora) && ignora.length > 0);
check('2) el paquete excluye node_modules y .git (lo que firebase-tools excluye por defecto)',
  ignora.includes('node_modules') && ignora.includes('.git'));
check('3) el paquete excluye los *.local: las claves del portátil no viajan a producción',
  ignora.includes('*.local') && ignora.includes('.env.local') && ignora.includes('.secret.local'));
check('4) el paquete no lleva las pruebas', ignora.includes('test/**'));
check('5) el predeploy compila functions, así que lib/ sale del commit y no de un árbol viejo',
  JSON.stringify(firebase.functions.predeploy || []).includes('run build'));

/* ── B. Lo que no se versiona ───────────────────────────────────────────── */
const gitignore = leer('.gitignore');
const lineas = new Set(gitignore.split(/\r?\n/).map((l) => l.trim()));
check('6) functions/lib/ está en .gitignore (es un artefacto compilado)', lineas.has('functions/lib/'));
check('7) .claude/settings.local.json está en .gitignore', lineas.has('.claude/settings.local.json'));
check('8) las copias locales de entorno y configuración están ignoradas',
  lineas.has('.env.*') && lineas.has('!.env.example') && lineas.has('*.bak-*') && lineas.has('*.antes-*'));
check('9) .env*.local sigue ignorado', lineas.has('.env*.local'));

/* ── C. El índice de git, si hay git (en CI siempre lo hay) ─────────────── */
let versionados = null;
try {
  versionados = execFileSync('git', ['ls-files'], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split(/\r?\n/).filter(Boolean);
} catch { versionados = null; }
if (versionados) {
  const lib = versionados.filter((f) => f.startsWith('functions/lib/'));
  check('10) functions/lib no está versionado', lib.length === 0, lib.length ? `${lib.length} archivos` : '');
  check('11) .claude/settings.local.json no está versionado', !versionados.includes('.claude/settings.local.json'));
  const PERMITIDOS = new Set(['.env.example', 'functions/.env.example', 'functions/.env.wee-dev-geovet']);
  const envs = versionados.filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !PERMITIDOS.has(f));
  check('12) ningún .env versionado salvo los ejemplos y el de dev ya público', envs.length === 0, envs.join(', '));
  const locales = versionados.filter((f) => /\.local$|\.secret\.local$|application_default_credentials|service-account.*\.json$/i.test(f));
  check('13) ningún archivo *.local, de credenciales ADC o de cuenta de servicio versionado', locales.length === 0, locales.join(', '));
} else {
  console.log('· sin git: se saltan las comprobaciones del índice (10–13)');
}

/* Vercel publicaba wee.zone en CADA push a main, saltándose CI, tag y aprobación (H0). El freno está ACTIVO (orden del
   dueño, 2026-10-01: «Activa primero el freno de Vercel»): `git.deploymentEnabled.main = false`. Vercel lo lee del
   vercel.json del commit que llega a main, así que manda desde el primer commit que lo lleve, incluido ese mismo
   (docs/DEPLOYMENT.md §2). Las demás ramas siguen teniendo previsualización. Y nada más cambia: la web se construye
   igual que la que sirve hoy wee.zone. */
const vercel = JSON.parse(leer('vercel.json'));
const COMO_SE_CONSTRUYE = {
  buildCommand: 'npx expo export -p web && cp public/privacy-policy.html public/support.html public/terms.html dist/',
  outputDirectory: 'dist',
  framework: null,
  rewrites: [
    { source: '/privacy', destination: '/privacy-policy.html' },
    { source: '/terms', destination: '/terms.html' },
    { source: '/support', destination: '/support.html' },
    { source: '/(.*)', destination: '/index.html' },
  ],
};
check('14) el freno de Vercel está ACTIVO: un push a main no publica wee.zone',
  JSON.stringify(vercel.git) === JSON.stringify({ deploymentEnabled: { main: false } }));
check('15) y es lo único que cambia: la web se construye y se sirve igual que la de wee.zone',
  JSON.stringify({ ...vercel, git: undefined }) === JSON.stringify(COMO_SE_CONSTRUYE));

/* ── D. Ningún atajo despliega ───────────────────────────────────────────── */
/* `npm run deploy:prod:functions` desplegaba las 34 funciones y Storage desde cualquier carpeta, y `npm --prefix
   functions run deploy`, al proyecto por defecto (producción). Desde un main que no tiene el código vivo de cuatro
   funciones, eso borraba lo que funciona. Producción tiene UN camino (docs/DEPLOYMENT.md). */
const scriptsDe = (p) => Object.entries(JSON.parse(leer(p)).scripts || {});
const DESPLIEGA = /firebase(?:\s+--?[\w-]+(?:[= ]\S+)?)*\s+(?:deploy\b|functions:delete|hosting:channel:deploy)/;
const atajos = [...scriptsDe('package.json').map(([k, v]) => [`raíz:${k}`, v]), ...scriptsDe('functions/package.json').map(([k, v]) => [`functions:${k}`, v])]
  .filter(([, v]) => DESPLIEGA.test(v)).map(([k]) => k);
check('16) ningún script de npm despliega ni borra funciones: los atajos dicen por dónde se despliega y salen con error', atajos.length === 0
  && /no-desplegar\.mjs/.test(JSON.parse(leer('package.json')).scripts['deploy:prod:functions'] || '')
  && /no-desplegar\.mjs/.test(JSON.parse(leer('functions/package.json')).scripts.deploy || ''), atajos.join(', '));
check('17) el shell de Functions solo corre con un proyecto demo-* (como los emuladores)',
  /firebase functions:shell --project demo-/.test(JSON.parse(leer('functions/package.json')).scripts.shell || ''));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
