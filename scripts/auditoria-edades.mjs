/*
 * AUDITORÍA HISTÓRICA DE EDADES — SOLO LECTURA, SOLO CONTEOS (corrección F, 2026-10-07).
 *
 * Clasifica cada CUENTA (agrupando sus perfiles por `users.uid`) con LA regla pura única de Weë
 * (`functions/src/identity/edad.ts`, `veredictoDeEdad`: 18+ en fecha civil UTC−12, la misma que las reglas y que
 * `exigirCuentaWeeValida`), desde functions/lib (compilar antes):
 *
 *   A  válida ≥18     B  menor     C  inválida (mal escrita / inexistente)     D  futura     E  ausente
 *
 * Dos fuentes, contadas por separado y combinadas:
 *   · `users/{id}/private/account.birthDate` — la que decide el servidor (la cuenta vale si ALGÚN perfil da A);
 *   · `users/{id}.birthDate` — el campo HEREDADO del documento público (anterior a private/account). No habilita
 *     nada en el servidor; se cuenta para saber cuántos datos legacy quedan.
 *
 * Qué NO hace: no escribe, no borra, no migra, no imprime ids, nombres, correos ni fechas. Por pantalla solo salen
 * conteos. Con `--ids <archivo>` escribe en un archivo LOCAL los ids INTERNOS (uid de la cuenta) de B/C/D/E, sin
 * ningún otro dato; ese archivo no se versiona ni se comparte.
 *
 * Uso (desde la raíz; credenciales de gcloud ADC o GOOGLE_APPLICATION_CREDENTIALS):
 *   node scripts/auditoria-edades.mjs --project get-wee            → producción, lectura agregada (lo ejecuta el dueño)
 *   node scripts/auditoria-edades.mjs --project get-wee --ids ids-edades.local.json
 * Contra el emulador (datos sintéticos): FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/auditoria-edades.mjs --project demo-wee
 *   --json   → además, los conteos como JSON en la última línea (para las pruebas).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const admin = require('firebase-admin');
const { veredictoDeEdad } = require('../functions/lib/identity/edad.js');

const arg = (n, def) => { const i = process.argv.indexOf(n); return i === -1 ? def : process.argv[i + 1]; };
const bandera = (n) => process.argv.includes(n);

const CLASE = { OK: 'A', MENOR: 'B', INVALIDA: 'C', FUTURA: 'D', AUSENTE: 'E' };
/** Orden de «mejor» veredicto cuando una cuenta tiene varios perfiles: el servidor acepta la cuenta si alguno da A. */
const PRIORIDAD = ['A', 'B', 'D', 'C', 'E'];
const mejor = (clases) => PRIORIDAD.find((c) => clases.includes(c)) ?? 'E';
export const clasificar = (fecha, ahora) => CLASE[veredictoDeEdad(fecha, ahora)];

const vacio = () => ({ A: 0, B: 0, C: 0, D: 0, E: 0 });

const proyecto = arg('--project', 'get-wee');
admin.initializeApp({ projectId: proyecto });
const db = admin.firestore();
const ahora = Date.now();

const usuarios = await db.collection('users').get();
const porCuenta = new Map(); /* uid → { privada: clases[], heredada: clases[] } */
let sinUid = 0;
let perfilesWee = 0;
for (const d of usuarios.docs) {
  const datos = d.data();
  const uid = typeof datos.uid === 'string' && datos.uid ? datos.uid : null;
  if (!uid) { sinUid++; continue; }
  if (datos.profileType === 'hidi') { perfilesWee++; continue; } /* el Perfil Weë no lleva fecha: se cuenta la cuenta por su Perfil Real */
  const privado = await d.ref.collection('private').doc('account').get();
  const e = porCuenta.get(uid) ?? { privada: [], heredada: [] };
  e.privada.push(clasificar(privado.exists ? privado.data()?.birthDate : undefined, ahora));
  e.heredada.push(clasificar(datos.birthDate, ahora));
  porCuenta.set(uid, e);
}

const privada = vacio();
const heredada = vacio();
const combinada = vacio(); /* privada si existe; si no, lo que diría la heredada (solo informativo: el servidor NO la usa) */
const ids = { B: [], C: [], D: [], E: [] };
for (const [uid, e] of porCuenta) {
  const p = mejor(e.privada);
  const h = mejor(e.heredada);
  privada[p]++;
  heredada[h]++;
  combinada[p !== 'E' ? p : h]++;
  if (p !== 'A') ids[p].push(uid);
}

console.log(`\nAUDITORÍA DE EDADES — proyecto ${proyecto} — SOLO LECTURA, solo conteos\n`);
console.log(`${usuarios.size} documentos en users · ${porCuenta.size} cuentas con Perfil Real · ${perfilesWee} perfiles Weë (no llevan fecha) · ${sinUid} sin uid (se omiten)`);
const fila = (n, c) => console.log(`${n.padEnd(40)} A ${c.A} · B ${c.B} · C ${c.C} · D ${c.D} · E ${c.E}`);
fila('private/account.birthDate (la que vale)', privada);
fila('users.birthDate heredado (informativo)', heredada);
fila('combinada (privada, si no heredada)', combinada);
console.log('A válida ≥18 · B menor · C inválida · D futura · E ausente. Solo A pasa exigirCuentaWeeValida (además del país).');

const salida = arg('--ids', null);
if (salida) {
  fs.writeFileSync(salida, JSON.stringify({ proyecto, generado: new Date(ahora).toISOString(), nota: 'ids internos (uid) de cuentas NO válidas por clase; sin PII; no versionar', ids }, null, 2));
  console.log(`ids internos de B/C/D/E escritos en el archivo local ${salida}`);
}
if (bandera('--json')) console.log(JSON.stringify({ cuentas: porCuenta.size, privada, heredada, combinada }));
