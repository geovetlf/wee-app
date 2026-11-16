/*
 * REACCIONES DE LAS PUBLICACIONES, EJECUTADAS CONTRA LAS REGLAS (2026-11-16): Fuego (`fire`) y Risa (`laugh`) además de `agree` y
 * `disagree`. SUITE NUEVA, SIN REGISTRAR en la cadena (el registro es un cambio pendiente de autorización). Necesita el emulador y
 * Java 21, y SOLO corre contra un proyecto demo-*:
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node functions/test/reacciones-rules.emulator.mjs firestore.rules"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const cargarReglas = async (contenido) => {
  const res = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: contenido }] } }),
  });
  return res.status;
};

/* Una sesión de Firebase Auth sin firmar: el emulador no verifica firmas. */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid, claims = {}) => {
  const now = Math.floor(Date.now() / 1000);
  return b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
    user_id: uid, sub: uid, iat: now, exp: now + 3600,
    firebase: { identities: {}, sign_in_provider: 'custom' }, ...claims,
  }) + '.';
};

/* Valores de Firestore REST, a mano: aquí no hay SDK. */
const v = (x) => {
  if (x === null || x === undefined) return { nullValue: null };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'number') return { doubleValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } };
};
const doc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)])) });

const pedir = async (metodo, ruta, { uid, body, claims } = {}) => {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${uid ? sesion(uid, claims) : 'owner'}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.status;
};
const permite = (status) => status < 400;

/* Sembrar como administrador: el servidor no pasa por las reglas. */
const sembrar = (ruta, datos) => pedir('PATCH', ruta, { body: doc(datos) });
/* Crear: solo si no existe, para que se evalúe la regla `create`. */
const crear = (ruta, uid, datos, claims) => pedir('PATCH', `${ruta}?currentDocument.exists=false`, { uid, body: doc(datos), claims });
/* Actualizar SOLO unos campos, como un `update` del cliente (admite rutas con punto: `lastMessage.read`). */
const escribir = (ruta, uid, datos) => {
  const partes = Object.keys(datos);
  const cuerpo = {};
  for (const clave of partes) {
    const [cabeza, ...resto] = clave.split('.');
    if (!resto.length) cuerpo[cabeza] = datos[clave];
    else cuerpo[cabeza] = { ...(cuerpo[cabeza] || {}), [resto.join('.')]: datos[clave] };
  }
  const mascara = partes.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  return pedir('PATCH', `${ruta}?${mascara}&currentDocument.exists=true`, { uid, body: doc(cuerpo) });
};
const leer = (ruta, uid) => pedir('GET', ruta, { uid });

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/* Las comprobaciones 1–61 llevan su número escrito; desde la 62 se numeran solas. */
let n = 62;
const num = (texto) => `${n++}) ${texto}`;
const espera = async (nombre, esperado, promesa) => {
  const status = await promesa;
  check(nombre, permite(status) === (esperado === 'PERMITE'), `${esperado} · HTTP ${status}`);
};


const A = 'anaAAAAAAAAAAAAAAAAAAAAAAAA1';
const B = 'betoBBBBBBBBBBBBBBBBBBBBBBB2';
const WA = `hidi_${A}`;
const ahora = new Date();
const voto = (userId, postId, type) => ({ userId, postId, type, createdAt: ahora });

const estado = await cargarReglas(fs.readFileSync(process.argv[2] || path.join(RAIZ, 'firestore.rules'), 'utf8'));
if (estado !== 200) { console.error('✘ las reglas no compilaron:', estado); process.exit(1); }
console.log('reglas cargadas en el emulador\n');

await sembrar('/posts/p1', { userId: B, content: 'hola', isPrivate: false, agreementCount: 0, disagreementCount: 0, createdAt: ahora });
await sembrar('/comments/c1', { postId: 'p1', userId: B, content: 'hola', agreementCount: 0, disagreementCount: 0, createdAt: ahora });

console.log('── Votos de publicaciones ──');
await espera('1) Ana reacciona con Fuego en su documento {cuenta}_{publicación}', 'PERMITE', crear(`/votes/${A}_p1`, A, voto(A, 'p1', 'fire')));
await espera('2) y puede cambiarla por Risa', 'PERMITE', escribir(`/votes/${A}_p1`, A, { type: 'laugh' }));
await espera('3) y por «de acuerdo» (agree sigue válido)', 'PERMITE', escribir(`/votes/${A}_p1`, A, { type: 'agree' }));
await espera('4) Beto reacciona con Risa en la publicación 2', 'PERMITE', crear(`/votes/${B}_p2`, B, voto(B, 'p2', 'laugh')));
await espera('5) un tipo que no está en la lista cerrada se rechaza', 'DENIEGA', crear(`/votes/${A}_p3`, A, voto(A, 'p3', 'love')));
await espera('6) también al cambiar un voto por un tipo inválido', 'DENIEGA', escribir(`/votes/${A}_p1`, A, { type: 'love' }));
await espera('7) Beto no escribe en el voto de Ana', 'DENIEGA', escribir(`/votes/${A}_p1`, B, { type: 'fire' }));
await espera('8) ni crea un voto a nombre de Ana', 'DENIEGA', crear(`/votes/${A}_p4`, B, voto(A, 'p4', 'fire')));
await espera('9) ni borra el voto de Ana', 'DENIEGA', pedir('DELETE', `/votes/${A}_p1`, { uid: B }));
await espera('10) doble voto: otro documento para la misma publicación se rechaza', 'DENIEGA', crear('/votes/otroVotoDeAna', A, voto(A, 'p1', 'fire')));
await espera('11) un id que dice otra publicación se rechaza', 'DENIEGA', crear(`/votes/${A}_p5`, A, voto(A, 'p6', 'laugh')));
await sembrar(`/votes/${WA}_p7`, voto(WA, 'p7', 'disagree'));
await espera('12) un 👎 ya guardado (cara Weë, dato heredado) lo sigue cambiando su dueña', 'PERMITE', escribir(`/votes/${WA}_p7`, A, { type: 'fire' }));
await sembrar(`/votes/${B}_p8`, voto(B, 'p8', 'disagree'));
await espera('13) y el 👎 guardado se puede borrar por su dueño', 'PERMITE', pedir('DELETE', `/votes/${B}_p8`, { uid: B }));
await espera('14) agree antiguo sigue funcionando al crear', 'PERMITE', crear(`/votes/${B}_p9`, B, voto(B, 'p9', 'agree')));
await espera('15) disagree antiguo sigue funcionando al crear', 'PERMITE', crear(`/votes/${B}_p10`, B, voto(B, 'p10', 'disagree')));

console.log('\n── Contadores de la publicación ──');
await espera('16) Ana suma un Fuego al contador de la publicación', 'PERMITE', escribir('/posts/p1', A, { fireCount: 1 }));
await espera('17) y una Risa', 'PERMITE', escribir('/posts/p1', A, { laughCount: 1 }));
await espera('18) cambiar de reacción mueve dos contadores de uno en uno', 'PERMITE', escribir('/posts/p1', A, { fireCount: 0, agreementCount: 1 }));
await espera('19) un salto de varios a la vez se rechaza', 'DENIEGA', escribir('/posts/p1', A, { fireCount: 7 }));
await espera('20) un contador negativo se rechaza', 'DENIEGA', escribir('/posts/p1', A, { laughCount: -1 }));
await espera('21) un contador que no existe se rechaza', 'DENIEGA', escribir('/posts/p1', A, { heartCount: 1 }));
await espera('22) no se mezcla con el contenido', 'DENIEGA', escribir('/posts/p1', A, { fireCount: 2, content: 'hackeado' }));

console.log('\n── Votos de comentarios: no cambian ──');
await espera('23) un voto de comentario «agree» sigue válido', 'PERMITE', crear(`/commentVotes/comment_${A}_c1`, A, { userId: A, commentId: 'c1', type: 'agree', createdAt: ahora }));
await espera('24) Fuego NO es un voto válido de comentario', 'DENIEGA', crear(`/commentVotes/comment_${B}_c1`, B, { userId: B, commentId: 'c1', type: 'fire', createdAt: ahora }));
await espera('25) ni cambiarlo a Risa', 'DENIEGA', escribir(`/commentVotes/comment_${A}_c1`, A, { type: 'laugh' }));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
