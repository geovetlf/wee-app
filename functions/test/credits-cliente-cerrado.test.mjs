/*
 * spendCredits CERRADO AL CLIENTE — auditoría H0, escenario #24.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * `spendCredits` es un callable del Credit Engine que ninguna pantalla usa.
 * Abierto al cliente permitía pagar menos: reservar aquí 1 Credit con el
 * `requestId` de una operación cara propia (el `jobId` de creatorRun, el de un
 * avatar, el de una búsqueda de Brain) hacía que el servidor, al reservar
 * después con ese mismo id, recibiera «duplicado» y completara contra lo ya
 * reservado.
 *
 * El 2026-09-30 se quitó su invocador público de Cloud Run, pero firebase-tools
 * lo vuelve a poner en cada despliegue de un callable. La barrera que dura es
 * la del código: solo administración, igual que `grantCredits` y
 * `refundCredits`. Esta suite la fija de tres formas:
 *
 *  · leyendo el callable (el candado va antes de tocar el motor);
 *  · comprobando que ninguna pantalla lo llama;
 *  · EJECUTANDO el callable compilado con un motor de mentira: sin sesión,
 *    con sesión normal y con sesión de administración.
 *
 * No toca la lógica interna del Credit Engine ni llama a nada real.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── A. El candado está en el callable, antes del motor ─────────────────── */
const src = sinComentarios(leer('functions/src/credits/index.ts'));
const inicio = src.indexOf('export const spendCredits');
const fin = src.indexOf('export const', inicio + 10);
const cuerpo = inicio >= 0 ? src.slice(inicio, fin > inicio ? fin : undefined) : '';
check('1) el callable spendCredits existe', inicio >= 0);
check('2) exige administración (assertAdmin)', /assertAdmin\(request\.auth/.test(cuerpo));
check('3) el candado va ANTES de cualquier llamada al Credit Engine',
  cuerpo.indexOf('assertAdmin(') >= 0 && cuerpo.indexOf('assertAdmin(') < cuerpo.indexOf('creditEngine.'));

/* ── B. Ninguna pantalla lo llama ───────────────────────────────────────── */
const CLIENTE = ['App.tsx', 'screens', 'components', 'hooks', 'contexts', 'utils', 'navigation', 'services', 'constants', 'config'];
const archivos = [];
const recorrer = (rel) => {
  const abs = path.resolve(RAIZ, rel);
  if (!fs.existsSync(abs)) return;
  const st = fs.statSync(abs);
  if (st.isFile()) { if (/\.(tsx?|jsx?)$/.test(rel)) archivos.push(rel); return; }
  for (const e of fs.readdirSync(abs)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    recorrer(path.join(rel, e));
  }
};
CLIENTE.forEach(recorrer);
const llamadas = archivos.filter((f) => {
  const s = sinComentarios(leer(f));
  if (f.replace(/\\/g, '/') === 'services/creditsService.ts') return false; /* la definición del método, sin llamadores */
  return /creditsService\.spend\(|['"`]spendCredits['"`]/.test(s);
});
check('4) ninguna pantalla ni servicio del cliente llama a spendCredits', archivos.length > 50 && llamadas.length === 0,
  llamadas.length ? llamadas.join(', ') : `${archivos.length} archivos del cliente revisados`);

/* ── C. Ejecutado: sin sesión, sesión normal, administración ────────────── */
const motorMod = lib('credits/creditEngine.js');
const callables = lib('credits/index.js');
const original = { spend: motorMod.creditEngine.spendCredits, ensure: motorMod.creditEngine.ensureAccount };
let reservas = 0;
motorMod.creditEngine.spendCredits = async () => {
  reservas++;
  return { transactionId: 'usage_x', status: 'AUTHORIZED', amount: 1, balanceBefore: 10, balanceAfter: 9, duplicate: false };
};
motorMod.creditEngine.ensureAccount = async () => ({});
const adminsAntes = process.env.WEE_ADMIN_UIDS;
process.env.WEE_ADMIN_UIDS = '';
const UID = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
const intento = async (auth) => {
  try {
    await callables.spendCredits.run({ auth, data: { service: 'ai_brain', requestId: 'job_abcd1234' } });
    return 'ok';
  } catch (e) {
    return e && e.code ? e.code : String(e);
  }
};
try {
  const sinSesion = await intento(undefined);
  check('5) sin sesión: unauthenticated', sinSesion === 'unauthenticated', sinSesion);
  const normal = await intento({ uid: UID, token: {} });
  check('6) con sesión normal (un cliente cualquiera): permission-denied', normal === 'permission-denied', normal);
  check('7) y el Credit Engine no llega a reservar nada', reservas === 0, `reservas=${reservas}`);
  const admin = await intento({ uid: UID, token: { admin: true } });
  check('8) administración sigue pudiendo usarlo (no se rompe la ruta interna)', admin === 'ok' && reservas === 1, `${admin}, reservas=${reservas}`);
  process.env.WEE_ADMIN_UIDS = UID;
  const porLista = await intento({ uid: UID, token: {} });
  check('9) un uid de WEE_ADMIN_UIDS también cuenta como administración', porLista === 'ok' && reservas === 2, `${porLista}, reservas=${reservas}`);
} finally {
  motorMod.creditEngine.spendCredits = original.spend;
  motorMod.creditEngine.ensureAccount = original.ensure;
  if (adminsAntes === undefined) delete process.env.WEE_ADMIN_UIDS; else process.env.WEE_ADMIN_UIDS = adminsAntes;
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
