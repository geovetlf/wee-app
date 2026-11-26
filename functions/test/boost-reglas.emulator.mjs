/*
 * BOOST — LAS REGLAS DE FIRESTORE, CONTRA EL EMULADOR (firestore.rules, bloque «BOOST»).
 *
 * Lo que un cliente NO puede hacer, nunca: crear, cambiar o borrar una campaña (ni la suya), inflar sus métricas,
 * leer las de otra cuenta, leer quién vio qué (impresiones, alcance, clics), tocar un bloqueo o leer la configuración.
 * Y lo único que sí: leer SUS campañas.
 *
 * Usa su PROPIO proyecto demo dentro del emulador (por defecto `demo-wee-boost-reglas`), así que no toca los datos
 * de nadie: carga las reglas en ese proyecto, siembra como servidor y al final borra solo ese proyecto.
 *
 * No está en `npm test`: necesita el emulador y Java. Desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project demo-wee-boost-reglas "node functions/test/boost-reglas.emulator.mjs"
 *
 * O contra un emulador ya levantado: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-wee-boost-reglas
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
    user_id: uid, sub: uid, iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'custom' },
  }) + '.';
};
const pedir = async (metodo, ruta, { uid, body, anonimo } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (!anonimo) headers.Authorization = `Bearer ${uid ? sesion(uid) : 'owner'}`;
  const res = await fetch(base + ruta, { method: metodo, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  return res.status;
};
const v = (x) => {
  if (typeof x === 'string') return { stringValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'boolean') return { booleanValue: x };
  return { nullValue: null };
};
const doc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)])) });
const sembrar = (ruta, datos) => pedir('PATCH', ruta, { body: doc(datos) });

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const esperar = async (nombre, esperado, metodo, ruta, opts) => {
  const status = await pedir(metodo, ruta, opts);
  check(nombre, (status < 400) === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);
};

const reglas = fs.readFileSync(path.join(RAIZ, 'firestore.rules'), 'utf8');
const carga = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
});
if (carga.status !== 200) { console.error('✘ las reglas no compilaron:', carga.status, await carga.text()); process.exit(1); }
console.log(`reglas cargadas en el proyecto ${PROY}\n`);

const ANA = 'anaBoost0000000000000001';
const BOB = 'bobBoost0000000000000002';
const C = '/boostCampaigns/bst_reglas_00001';

await sembrar(C, { ownerAccountId: ANA, postId: 'p1', status: 'active', budgetCredits: 1500 });
await sembrar(`${C}/impressions/${BOB}_0`, { viewer: BOB, day: 0 });
await sembrar(`${C}/reach/${BOB}`, { firstAt: 1 });
await sembrar('/boostPostLocks/p1', { activeCampaignId: 'bst_reglas_00001', ownerAccountId: ANA });
await sembrar('/boostSettings/config', { enabled: true });

console.log('── Lectura ──');
await esperar('R1) Ana lee SU campaña', 'PERMITE', 'GET', C, { uid: ANA });
await esperar('R2) Bob NO lee la campaña de Ana', 'NIEGA', 'GET', C, { uid: BOB });
await esperar('R3) sin sesión, nadie la lee', 'NIEGA', 'GET', C, { anonimo: true });
await esperar('R4) ni Ana lee quién vio su campaña (impresiones)', 'NIEGA', 'GET', `${C}/impressions/${BOB}_0`, { uid: ANA });
await esperar('R5) ni el alcance por persona', 'NIEGA', 'GET', `${C}/reach/${BOB}`, { uid: ANA });
await esperar('R6) el que vio tampoco lee su propia marca', 'NIEGA', 'GET', `${C}/reach/${BOB}`, { uid: BOB });
await esperar('R7) los bloqueos no se leen', 'NIEGA', 'GET', '/boostPostLocks/p1', { uid: ANA });
await esperar('R8) la configuración no se lee', 'NIEGA', 'GET', '/boostSettings/config', { uid: ANA });

console.log('\n── Escritura ──');
await esperar('W1) Ana NO crea una campaña desde el cliente (saltándose la reserva)', 'NIEGA', 'PATCH', '/boostCampaigns/bst_falsa_00001', { uid: ANA, body: doc({ ownerAccountId: ANA, postId: 'p2', status: 'active', budgetCredits: 1 }) });
await esperar('W2) Ana NO cambia su campaña (p. ej. el presupuesto o el estado)', 'NIEGA', 'PATCH', `${C}?updateMask.fieldPaths=budgetCredits`, { uid: ANA, body: doc({ budgetCredits: 1 }) });
await esperar('W3) Ana NO infla las métricas', 'NIEGA', 'PATCH', `${C}?updateMask.fieldPaths=status`, { uid: ANA, body: doc({ status: 'ended' }) });
await esperar('W4) Ana NO borra su campaña', 'NIEGA', 'DELETE', C, { uid: ANA });
await esperar('W5) nadie añade impresiones', 'NIEGA', 'PATCH', `${C}/impressions/x_0`, { uid: BOB, body: doc({ viewer: 'x', day: 0 }) });
await esperar('W6) nadie suma clics', 'NIEGA', 'PATCH', `${C}/clicks/${BOB}`, { uid: BOB, body: doc({ at: 1 }) });
await esperar('W7) nadie libera ni toma un bloqueo', 'NIEGA', 'PATCH', '/boostPostLocks/p1', { uid: ANA, body: doc({ activeCampaignId: null }) });
await esperar('W8) nadie abre Boost cambiando la configuración', 'NIEGA', 'PATCH', '/boostSettings/config', { uid: ANA, body: doc({ enabled: true, minBudget: 1 }) });

await fetch(`http://${host}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
