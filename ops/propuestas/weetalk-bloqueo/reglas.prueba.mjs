/*
 * WEETALK · BLOQUEO DE CONTACTOS — LA PROPUESTA DE REGLAS, EJECUTADA EN UN EMULADOR (PREPARADA, NO APLICADA).
 *
 * No está en la CI ni en `functions/test/_emuladores.mjs` (que solo recorre `functions/test/*.emulator.mjs`) A
 * PROPÓSITO: estas pruebas exigen las reglas PROPUESTAS, que no están en `firestore.rules`; contra las reglas de hoy los
 * casos del bloqueo fallan, y eso es justo lo que demuestra el sabotaje del final.
 *
 * Carga en el emulador las reglas de `firestore.rules` con el bloque de conversaciones sustituido por
 * `conversaciones.rules` (componer.mjs; `firestore.rules` no se toca), siembra como administrador las conversaciones
 * y el índice del bloqueo del escenario (escenario.mjs) y prueba cada escritura con la sesión de cada cuenta.
 *
 * Se lanza con `node ops/propuestas/weetalk-bloqueo/correr-reglas.mjs` (proyecto demo-wee-bloqueo, puertos propios,
 * nunca los de la demo viva). Directamente, solo dentro de un `firebase emulators:exec` sobre un proyecto demo-*.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { componerPropuesta } from './componer.mjs';
import { CARAS, CUENTA_DE_LA_CARA, PARES_DEL_BLOQUEO_DE_ANA } from './escenario.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../../..');

/* ── Solo un emulador demo-*, y nunca en los puertos de la demo viva del dueño ─────────────────────────────── */
const PUERTOS_PROHIBIDOS = new Set([4400, 4500, 5001, 8080, 8084, 8096, 9099, 9150, 9199, 9299]);
const PROY = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
const host = process.env.FIRESTORE_EMULATOR_HOST || '';
const puerto = Number(host.split(':').pop());
if (!PROY.startsWith('demo-') || !host || !Number.isInteger(puerto) || PUERTOS_PROHIBIDOS.has(puerto)) {
  console.error(`✘ Solo dentro de \`firebase emulators:exec\` sobre un proyecto demo-* y fuera de los puertos de la demo viva (proyecto «${PROY}», emulador «${host}»).`);
  process.exit(2);
}
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
    user_id: uid, sub: uid, iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'password' },
  }) + '.';
};
const cabeceras = (quien) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${quien === 'owner' ? 'owner' : sesion(quien)}` });

/* Valores de la API REST de Firestore. */
const v = (x) => {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'string') return { stringValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'number') return { doubleValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  return { mapValue: { fields: campos(x) } };
};
const campos = (o) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)]));

const pedir = async (metodo, ruta, quien, cuerpo) => {
  const r = await fetch(`${base}/${ruta}`, { method: metodo, headers: cabeceras(quien), ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}) });
  return r.status;
};
const crear = (coleccion, id, datos, quien) => pedir('POST', `${coleccion}?documentId=${encodeURIComponent(id)}`, quien, { fields: campos(datos) });
const sembrar = async (ruta, datos) => {
  const s = await pedir('PATCH', ruta, 'owner', { fields: campos(datos) });
  if (s !== 200) console.log(`  (siembra ${ruta}: HTTP ${s})`);
};
const cambiar = (ruta, datos, mascara, quien) =>
  pedir('PATCH', `${ruta}?${mascara.map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&')}`, quien, { fields: campos(datos) });
const leer = (ruta, quien) => pedir('GET', ruta, quien);
const borrar = (ruta) => pedir('DELETE', ruta, 'owner');

const cargarReglas = async (reglas) => {
  const r = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
  });
  if (r.status !== 200) { console.log(`✘ no se pudieron cargar las reglas: HTTP ${r.status} ${await r.text()}`); process.exit(2); }
};
const vaciar = () => fetch(`http://${host}/emulator/v1/projects/${PROY}/databases/(default)/documents`, { method: 'DELETE' });

let fallos = 0;
let n = 1;
const check = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${n++}) ${nombre}${extra ? ` — ${extra}` : ''}`);
  if (!cond) fallos++;
};
const espera = async (nombre, esperado, promesa) => {
  const status = await promesa;
  check(nombre, (status < 400) === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);
  return status;
};

const { anaReal, anaWee, betoReal, betoWee, carlaReal } = CARAS;
/* La sesión de prueba se firma con la CUENTA de la cara, leída del escenario. */
const cuentaDe = (cara) => CUENTA_DE_LA_CARA[cara];
const ahora = new Date();
const participantesData = (a, b) => ({ [a]: { displayName: a }, [b]: { displayName: b } });

const sembrarMundo = async ({ conBloqueo }) => {
  await vaciar();
  const conversaciones = {
    c1: [anaReal, betoWee], // la pareja bloqueada
    c2: [anaWee, betoReal], // las otras dos caras
    c3: [anaReal, betoReal], // la cara protegida de Ana con la otra cara de Beto
    c4: [anaWee, betoWee], // la otra cara de Ana con la cara bloqueada de Beto
    c5: [anaReal, carlaReal], // alguien que no tiene nada que ver
  };
  for (const [id, p] of Object.entries(conversaciones)) {
    await sembrar(`conversations/${id}`, {
      participants: p, participantsData: participantesData(p[0], p[1]), createdAt: ahora, updatedAt: ahora,
      lastMessage: { content: 'hola', senderId: p[0], timestamp: ahora, read: false },
    });
    await sembrar(`conversations/${id}/messages/m0`, { conversationId: id, senderId: p[0], content: 'hola', timestamp: ahora, read: false, type: 'text' });
  }
  if (conBloqueo) for (const clave of PARES_DEL_BLOQUEO_DE_ANA) {
    const [de, para] = clave.split('~');
    await sembrar(`weetalkBloqueosPorPar/${clave}`, { de, para });
  }
};

const mensaje = (conv, id, cara) => crear(`conversations/${conv}/messages`, id, {
  conversationId: conv, senderId: cara, content: 'texto de prueba', timestamp: ahora, read: false, type: 'text',
}, cuentaDe(cara));
const nuevaConversacion = (id, mia, otra) => crear('conversations', id, {
  participants: [mia, otra], participantsData: participantesData(mia, otra), createdAt: ahora, updatedAt: ahora,
}, cuentaDe(mia));

const reglasActuales = fs.readFileSync(path.join(RAIZ, 'firestore.rules'), 'utf8');
const propuestas = componerPropuesta(reglasActuales);

/* ═══ CON LAS REGLAS PROPUESTAS ═══════════════════════════════════════════════════════════════════════════ */
await cargarReglas(propuestas);
await sembrarMundo({ conBloqueo: true });

console.log('\n── A · Mensajes nuevos ──');
await espera('Beto (Weë) no escribe a Ana (Real) en su conversación', 'NIEGA', mensaje('c1', 'a1', betoWee));
await espera('Beto cambia de cara (Real) y tampoco: cambiar de cara no lo evade', 'NIEGA', mensaje('c3', 'a2', betoReal));
await espera('Ana no escribe a la cara que bloqueó (hasta desbloquearla)', 'NIEGA', mensaje('c1', 'a3', anaReal));
await espera('ni desde su otra cara', 'NIEGA', mensaje('c4', 'a4', anaWee));
await espera('Ana SÍ escribe a la otra cara de Beto (si no, sabría cuál es)', 'PERMITE', mensaje('c3', 'a5', anaReal));
await espera('Beto SÍ escribe a la otra cara de Ana (si no, sabría cuál es)', 'PERMITE', mensaje('c2', 'a6', betoReal));
await espera('Beto (Weë) también a la otra cara de Ana', 'PERMITE', mensaje('c4', 'a7', betoWee));
await espera('Carla escribe a Ana como siempre', 'PERMITE', mensaje('c5', 'a8', carlaReal));
await espera('y Ana a Carla', 'PERMITE', mensaje('c5', 'a9', anaReal));

console.log('\n── B · Conversaciones directas nuevas ──');
await espera('Beto (Weë) no abre una conversación con Ana (Real)', 'NIEGA', nuevaConversacion('n1', betoWee, anaReal));
await espera('Beto (Real) tampoco', 'NIEGA', nuevaConversacion('n2', betoReal, anaReal));
await espera('Ana no abre una con la cara que bloqueó', 'NIEGA', nuevaConversacion('n3', anaReal, betoWee));
await espera('Beto sí con la otra cara de Ana', 'PERMITE', nuevaConversacion('n4', betoReal, anaWee));
await espera('Ana sí con la otra cara de Beto', 'PERMITE', nuevaConversacion('n5', anaReal, betoReal));
await espera('Carla con Ana, como siempre', 'PERMITE', nuevaConversacion('n6', carlaReal, anaReal));

console.log('\n── C · La conversación bloqueada se queda como está ──');
await espera('Beto no cambia el tema', 'NIEGA', cambiar('conversations/c1', { chatTheme: 'midnight' }, ['chatTheme'], cuentaDe(betoWee)));
await espera('ni el fondo (una imagen que Ana vería)', 'NIEGA', cambiar('conversations/c1', { chatWallpaper: 'https://ejemplo.test/x.png' }, ['chatWallpaper'], cuentaDe(betoWee)));
await espera('ni el modo efímero', 'NIEGA', cambiar('conversations/c1', { ephemeral: true }, ['ephemeral'], cuentaDe(betoWee)));
await espera('ni firma un último mensaje nuevo', 'NIEGA', cambiar('conversations/c1', { lastMessage: { content: 'otra vez', senderId: betoWee, timestamp: ahora, read: false }, updatedAt: ahora }, ['lastMessage', 'updatedAt'], cuentaDe(betoWee)));
await espera('pero sí marca como leído lo que ya había', 'PERMITE', cambiar('conversations/c1', { lastMessage: { read: true } }, ['lastMessage.read'], cuentaDe(betoWee)));
await espera('y entra y sale él mismo (presencia propia)', 'PERMITE', cambiar('conversations/c1', { activeInChat: [betoWee] }, ['activeInChat'], cuentaDe(betoWee)));
await espera('Ana tampoco cambia el tema de esa conversación', 'NIEGA', cambiar('conversations/c1', { chatTheme: 'forest' }, ['chatTheme'], cuentaDe(anaReal)));
await espera('sin bloqueo, todo sigue como antes (Carla cambia el tema con Ana)', 'PERMITE', cambiar('conversations/c5', { chatTheme: 'ocean' }, ['chatTheme'], cuentaDe(carlaReal)));

console.log('\n── D · Lo que se puede leer, y lo que no ──');
await espera('Beto sigue leyendo el historial (bloquear no borra nada)', 'PERMITE', leer('conversations/c1', cuentaDe(betoWee)));
await espera('y sus mensajes', 'PERMITE', leer('conversations/c1/messages/m0', cuentaDe(betoWee)));
await espera('nadie lee el índice: ni Ana', 'NIEGA', leer(`weetalkBloqueosPorPar/${PARES_DEL_BLOQUEO_DE_ANA[0]}`, cuentaDe(anaReal)));
await espera('ni Beto (no sabe que está bloqueado)', 'NIEGA', leer(`weetalkBloqueosPorPar/${PARES_DEL_BLOQUEO_DE_ANA[0]}`, cuentaDe(betoWee)));
await espera('nadie lee las relaciones', 'NIEGA', leer('weetalkBloqueos/anaCuentaW0~betoCuentaW0', cuentaDe(anaReal)));
await espera('nadie las escribe', 'NIEGA', crear('weetalkBloqueos', 'betoCuentaW0~anaCuentaW0', { cuentaQueBloquea: 'betoCuentaW0' }, cuentaDe(betoWee)));
await espera('nadie escribe el índice', 'NIEGA', crear('weetalkBloqueosPorPar', `${anaReal}~${carlaReal}`, { de: anaReal, para: carlaReal }, cuentaDe(anaReal)));
await espera('nadie lee el cupo', 'NIEGA', leer('weetalkBloqueosCupo/anaCuentaW0', cuentaDe(anaReal)));

console.log('\n── E · Desbloquear ──');
for (const clave of PARES_DEL_BLOQUEO_DE_ANA) await borrar(`weetalkBloqueosPorPar/${clave}`);
await espera('sin el índice, Beto vuelve a escribir a Ana', 'PERMITE', mensaje('c1', 'e1', betoWee));
await espera('y Ana a Beto', 'PERMITE', mensaje('c1', 'e2', anaReal));
await espera('y se puede abrir una conversación nueva', 'PERMITE', nuevaConversacion('e3', betoReal, anaReal));

/* ═══ SABOTAJE: con las reglas de HOY, los casos del bloqueo pasan — la prueba muerde ═════════════════════════ */
console.log('\n── F · Sabotaje: con las reglas de hoy (sin la propuesta) el bloqueo no existe ──');
await cargarReglas(reglasActuales);
await sembrarMundo({ conBloqueo: true });
const sab = [
  await mensaje('c1', 's1', betoWee),
  await mensaje('c3', 's2', betoReal),
  await nuevaConversacion('s3', betoWee, anaReal),
  await cambiar('conversations/c1', { chatTheme: 'midnight' }, ['chatTheme'], cuentaDe(betoWee)),
];
check('las reglas de hoy DEJAN escribir lo que la propuesta niega (si no, estas pruebas no probarían nada)', sab.every((s) => s < 400), sab.join(', '));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ la propuesta de reglas hace lo que dice el documento');
process.exit(fallos ? 1 : 0);
