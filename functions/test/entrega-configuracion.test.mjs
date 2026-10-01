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

/* Vercel publica wee.zone en CADA push a main, saltándose CI, tag y aprobación (H0). El freno está PREPARADO y SIN
   ACTIVAR (decisión del dueño, 2026-09-30: «No desactives todavía el deploy automático»): el vercel.json activo es el de
   siempre y el freno vive aparte, para aplicarlo cuando lo autorice (docs/DEPLOYMENT.md §2). Así un push a main no lo
   activa por sorpresa. */
const vercel = JSON.parse(leer('vercel.json'));
const preparado = leer('ops/vercel/vercel.sin-despliegue-automatico.json');
const conFreno = JSON.parse(preparado);
check('14) el vercel.json activo NO lleva el freno: el despliegue automático sigue como estaba hasta que el dueño lo autorice',
  !(vercel.git && vercel.git.deploymentEnabled));
check('15) el freno está preparado aparte: el mismo vercel.json más git.deploymentEnabled.main = false, y nada más',
  conFreno.git && conFreno.git.deploymentEnabled && conFreno.git.deploymentEnabled.main === false
  && JSON.stringify({ ...conFreno, git: undefined }) === JSON.stringify({ ...vercel, git: undefined }));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
