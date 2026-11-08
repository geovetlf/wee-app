/*
 * WEETALK · LAS DOS IDENTIDADES DE UNA CUENTA, EJECUTADAS EN EL EMULADOR (auditoría del 2026-11-07).
 *
 * Una cuenta tiene dos caras: el Perfil Real (su uid) y el Perfil Weë (`hidi_<uid>`, identificador heredado). Las dos
 * pueden hablar: Real → Real, Real → Weë, Weë → Real y Weë → Weë. Esto intenta cada escritura con la sesión de cada
 * cuenta, contra `firestore.rules`, y deja escrito lo que HOY pasa, también lo que no debería:
 *
 *   A  las cuatro combinaciones: crear la conversación y escribir en ella, cada cara con su identidad
 *   B  la identidad se respeta: no se escribe con una cara que no participa, ni con la de otra cuenta
 *   C  los historiales no se mezclan: una conversación por pareja de caras; un tercero no lee nada
 *   D  los avisos respetan la identidad: nunca a una cara propia; con el bloqueo, ninguno de ËContact entre las dos cuentas
 *   E  cambiar de cara no evade un bloqueo: con el de Ana, ninguna cara de Beto escribe a ninguna de Ana, ni al revés
 *   F  gratuidad: nada de esto toca Credits, y un cliente no puede escribir saldos ni transacciones
 *   G  (informativo, no cuenta como comprobación) lo que hoy revela la relación entre las dos caras
 *
 * No está en `npm test` a propósito: necesita el emulador y Java. Se lanza así, desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project demo-wee "node functions/test/weetalk-identidades.emulator.mjs firestore.rules"
 */
import fs from 'node:fs';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
    user_id: uid, sub: uid, iat: now, exp: now + 3600, firebase: { identities: {}, sign_in_provider: 'password' },
  })}.`;
};
const cabeceras = (quien) => ({
  'Content-Type': 'application/json',
  ...(quien === null ? {} : { Authorization: `Bearer ${quien === 'owner' ? 'owner' : sesion(quien)}` }),
});
/* Valores de la API REST de Firestore, con mapas (participantsData, lastMessage). */
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
  let datos = null;
  try { datos = await r.json(); } catch { datos = null; }
  return { status: r.status, datos };
};
const crear = (coleccion, id, datos, quien) => pedir('POST', `${coleccion}?documentId=${encodeURIComponent(id)}`, quien, { fields: campos(datos) });
const sembrar = (ruta, datos) => pedir('PATCH', ruta, 'owner', { fields: campos(datos) });
const leerComo = (ruta, quien) => pedir('GET', ruta, quien);
const consultar = (coleccion, campo, valor, quien) => fetch(`${base}:runQuery`, {
  method: 'POST', headers: cabeceras(quien),
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coleccion }], where: { fieldFilter: { field: { fieldPath: campo }, op: 'ARRAY_CONTAINS', value: v(valor) } } } }),
}).then(async (r) => ({ status: r.status, docs: r.ok ? (await r.json()).filter((x) => x.document).map((x) => x.document.name.split('/').pop()).sort() : [] }));

let failures = 0;
let n = 1;
const check = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${n++}) ${nombre}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
};
const permite = (r) => r.status < 400;

/* ── Reglas: las del archivo que se pasa (la rama de reglas: el bloqueo ya aplicado) ───────────────────────────── */
const rutaReglas = process.argv[2] || 'firestore.rules';
const reglas = fs.readFileSync(rutaReglas, 'utf8');
const carga = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
});
if (!carga.ok) { console.error(`✘ el emulador no acepta las reglas (${carga.status})`); process.exit(2); }

/* ── Escenario: Ana y Beto con sus dos caras; Carla, solo Real ─────────────────────────────────────────────── */
/* Cuentas e identificadores ÚNICOS por ejecución: lo que dejara otra ejecución en el mismo emulador no cambia el resultado. */
const RUN = Date.now().toString(36);
const ANA = `ana${RUN}`, BETO = `beto${RUN}`, CARLA = `carla${RUN}`;
const caras = { ana: [ANA, `hidi_${ANA}`], beto: [BETO, `hidi_${BETO}`] };
const ahora = new Date();
for (const [cuenta, [real, wee]] of Object.entries(caras)) {
  await sembrar(`users/doc_${real}`, { uid: real, profileType: 'real', linkedAccountId: wee, displayName: cuenta });
  await sembrar(`users/doc_${wee}`, { uid: wee, profileType: 'hidi', linkedAccountId: cuenta, displayName: `${cuenta}-wee` });
}
await sembrar(`users/doc_${CARLA}`, { uid: CARLA, profileType: 'real', displayName: 'carla' });
await sembrar(`creditAccounts/${ANA}`, { userId: ANA, creditsBalance: 500 });
await sembrar(`creditAccounts/${BETO}`, { userId: BETO, creditsBalance: 300 });
const participante = (uid) => ({ displayName: uid });
const conversacion = (de, para) => ({ participants: [de, para], participantsData: { [de]: participante(de), [para]: participante(para) }, createdAt: ahora, updatedAt: ahora });
const mensaje = (conv, senderId, content) => ({ conversationId: conv, senderId, content, timestamp: ahora, read: false, type: 'text' });
const cuentaDe = (cara) => cara.replace(/^hidi_/, '');
const COMBINACIONES = [
  ['A1', 'Real → Real', caras.ana[0], caras.beto[0]],
  ['A2', 'Real → Weë', caras.ana[0], caras.beto[1]],
  ['A3', 'Weë → Real', caras.ana[1], caras.beto[0]],
  ['A4', 'Weë → Weë', caras.ana[1], caras.beto[1]],
];

/** El identificador de una conversación del escenario, único en esta ejecución. */
const cid = (id) => `conv_${RUN}_${id}`;
const enConv = (id) => `conversations/${cid(id)}/messages`;

console.log('── A · Las cuatro combinaciones ──');
for (const [id, nombre, de, para] of COMBINACIONES) {
  const c = await crear('conversations', cid(id), conversacion(de, para), cuentaDe(de));
  const m = await crear(enConv(id), `m_${id}_1`, mensaje(cid(id), de, `hola desde ${de}`), cuentaDe(de));
  const r = await crear(enConv(id), `m_${id}_2`, mensaje(cid(id), para, `respuesta de ${para}`), cuentaDe(para));
  check(`${nombre}: ${de} abre la conversación con ${para}, escribe, y ${para} responde con su propia cara`, permite(c) && permite(m) && permite(r), `${c.status}/${m.status}/${r.status}`);
}

console.log('\n── B · La identidad se respeta ──');
{
  const otraCaraPropia = await crear(enConv('A2'), 'm_B_1', mensaje(cid('A2'), caras.ana[1], 'con la cara que no participa'), ANA);
  check('en Real → Weë, Ana NO escribe con su cara Weë, que no participa en esa conversación', !permite(otraCaraPropia), String(otraCaraPropia.status));
  const caraAjena = await crear(enConv('A1'), 'm_B_2', mensaje(cid('A1'), caras.beto[0], 'firmado como Beto'), ANA);
  check('Ana NO escribe firmando con una cara de Beto', !permite(caraAjena), String(caraAjena.status));
  const conDos = await crear('conversations', cid('B3'), conversacion(caras.ana[0], caras.ana[0]), ANA);
  check('no se abre una conversación consigo misma con la misma cara', !permite(conDos), String(conDos.status));
}

console.log('\n── C · Los historiales no se mezclan ──');
{
  const deRealDeAna = await consultar('conversations', 'participants', caras.ana[0], ANA);
  const deWeeDeAna = await consultar('conversations', 'participants', caras.ana[1], ANA);
  check('la bandeja de la cara Real de Ana trae solo sus conversaciones Real (A1, A2)', deRealDeAna.status === 200 && JSON.stringify(deRealDeAna.docs) === JSON.stringify([cid('A1'), cid('A2')]), deRealDeAna.docs.join(','));
  check('la bandeja de su cara Weë trae solo las suyas (A3, A4): cada pareja de caras tiene su propio historial', deWeeDeAna.status === 200 && JSON.stringify(deWeeDeAna.docs) === JSON.stringify([cid('A3'), cid('A4')]), deWeeDeAna.docs.join(','));
  const tercero = await Promise.all(COMBINACIONES.map(([id]) => leerComo(`conversations/${cid(id)}`, CARLA)));
  const terceroMensajes = await Promise.all(COMBINACIONES.map(([id]) => leerComo(`${enConv(id)}/m_${id}_1`, CARLA)));
  check('Carla, que no participa, no lee ninguna de las cuatro conversaciones ni sus mensajes', [...tercero, ...terceroMensajes].every((r) => !permite(r)), [...tercero, ...terceroMensajes].map((r) => r.status).join(','));
}

const aviso = (de, para, type) => ({
  type, senderId: de, senderName: de, recipientId: para, recipientAccountId: cuentaDe(para), read: false, createdAt: ahora,
});
console.log('\n── D · Los avisos respetan la identidad ──');
{
  const aLaOtraCara = await crear('notifications', `n_${RUN}_D1`, aviso(caras.ana[0], caras.ana[1], 'econtact_request'), ANA);
  check('ningún aviso a una cara propia (Real de Ana → Weë de Ana)', !permite(aLaOtraCara), String(aLaOtraCara.status));
  const entreCuentas = await crear('notifications', `n_${RUN}_D2`, aviso(caras.ana[0], caras.beto[1], 'econtact_request'), ANA);
  check('sin bloqueo, la cara Real de Ana sí avisa de una solicitud a la cara Weë de Beto', permite(entreCuentas), String(entreCuentas.status));
}

console.log('\n── E · Cambiar de cara no evade el bloqueo ──');
{
  /* El índice que escribe el motor del bloqueo: las 8 parejas de caras entre las dos cuentas, en los dos sentidos. */
  for (const x of caras.ana) for (const y of caras.beto) {
    await sembrar(`weetalkBloqueosPorPar/${x}~${y}`, { de: x, para: y });
    await sembrar(`weetalkBloqueosPorPar/${y}~${x}`, { de: y, para: x });
  }
  const resultados = [];
  for (const [id, nombre, de, para] of COMBINACIONES) {
    const ida = await crear(enConv(id), `m_${id}_E1`, mensaje(cid(id), de, 'tras el bloqueo'), cuentaDe(de));
    const vuelta = await crear(enConv(id), `m_${id}_E2`, mensaje(cid(id), para, 'tras el bloqueo'), cuentaDe(para));
    const nueva = await crear('conversations', cid(`${id}_E`), conversacion(para, de), cuentaDe(para));
    resultados.push([nombre, ida.status, vuelta.status, nueva.status]);
  }
  check('con el bloqueo, en las cuatro combinaciones nadie escribe en las conversaciones que había, en ningún sentido', resultados.every(([, a, b]) => a >= 400 && b >= 400), resultados.map((r) => r.join(':')).join(' | '));
  check('y nadie abre una conversación nueva con otra cara para esquivarlo', resultados.every(([, , , c]) => c >= 400), resultados.map((r) => `${r[0]}:${r[3]}`).join(' | '));
  const avisoBloqueado = await crear('notifications', `n_${RUN}_E1`, aviso(caras.beto[0], caras.ana[1], 'econtact_request'), BETO);
  check('ni un aviso de ËContact entre las dos cuentas, venga de la cara que venga', !permite(avisoBloqueado), String(avisoBloqueado.status));
  const lecturaPrevia = await leerComo(`${enConv('A1')}/m_A1_1`, BETO);
  check('el bloqueo no borra ni oculta lo que ya había: cada uno sigue leyendo su historial (privacidad, no moderación)', permite(lecturaPrevia), String(lecturaPrevia.status));
}

console.log('\n── F · Gratuidad: nada de esto toca Credits ──');
{
  const saldoAna = await leerComo(`creditAccounts/${ANA}`, 'owner');
  const saldoBeto = await leerComo(`creditAccounts/${BETO}`, 'owner');
  const valor = (r) => Number(r.datos?.fields?.creditsBalance?.integerValue ?? NaN);
  check('después de conversaciones, mensajes, avisos y bloqueo, el saldo de Ana y el de Beto son los de antes (500 y 300)', valor(saldoAna) === 500 && valor(saldoBeto) === 300, `${valor(saldoAna)}/${valor(saldoBeto)}`);
  const transacciones = await pedir('GET', 'creditTransactions', 'owner');
  check('no hay ni una transacción de Credits', transacciones.status === 200 && !(transacciones.datos?.documents?.length), String(transacciones.datos?.documents?.length || 0));
  const escribirSaldo = await pedir('PATCH', `creditAccounts/${ANA}?updateMask.fieldPaths=creditsBalance`, ANA, { fields: campos({ creditsBalance: 999999 }) });
  const crearTransaccion = await crear('creditTransactions', 't_F_1', { userId: ANA, amount: 100, type: 'grant' }, ANA);
  check('y un cliente no puede escribir su saldo ni apuntarse una transacción', !permite(escribirSaldo) && !permite(crearTransaccion), `${escribirSaldo.status}/${crearTransaccion.status}`);
}

console.log('\n── G · Informativo: lo que HOY revela la relación entre las dos caras (riesgo de privacidad, no es una comprobación) ──');
{
  const anonimo = await leerComo(`users/doc_${caras.ana[1]}`, null);
  const enlace = anonimo.datos?.fields?.linkedAccountId?.stringValue;
  console.log(`ⓘ sin sesión, users/doc_${caras.ana[1]} → HTTP ${anonimo.status}${enlace ? ` y linkedAccountId = «${enlace}»: la cara Weë delata su cuenta` : ' sin linkedAccountId'}`);
  console.log(`ⓘ el identificador de la cara Weë es «hidi_» + la cuenta: ${caras.ana[1]} → ${cuentaDe(caras.ana[1])} (lo compone utils/econtactModel.ts identidadWeeDe)`);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
