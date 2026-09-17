/*
 * EL CONTADOR DE WEË BRAIN, CERRADO POR LA BASE DE DATOS.
 *
 * `brain-bloque.test.mjs` comprueba que el contador CUENTA bien: doce respuestas
 * por un Credit, sin contar dos veces y sin cobrar dos veces. Eso protege la
 * lógica. Esto protege el DATO: que nadie pueda ponerse el contador a cero desde
 * el teléfono y hacerse doce respuestas gratis cada vez que le apetezca.
 *
 * Las dos mitades hacen falta. Mientras las reglas no dijeran nada, el único
 * guardián de `brainUsage` era que el cliente "no debería" escribir ahí, y eso
 * no es una protección: es una costumbre. Cualquier script con el SDK y una
 * sesión válida podía escribir `bloque: 0` y no pagar nunca.
 *
 * Como el de `posts` y el de ËContact, esto NO está en `npm test` a propósito:
 * necesita el emulador y Java. Se lanza así, desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project demo-wee-reglas \
 *     "node functions/test/brain-usage-rules.emulator.mjs firestore.rules"
 *
 * Ojo con Java: firebase-tools ya no arranca con menos de JDK 21, y el `java`
 * del PATH de esta máquina es el 17 del build de Android. Hay un JDK 21 portable
 * en %LOCALAPPDATA%\wee-tools.
 *
 * El identificador empieza por `demo-`, que para Firebase significa EMULADOR Y
 * NADA MÁS: con un proyecto así el SDK se niega a hablar con ningún servidor
 * real. Aquí no hay forma de tocar `get-wee` ni por accidente.
 */
import fs from 'node:fs';

const PROY = 'demo-wee-reglas';
const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;

const cargarReglas = async (contenido) => {
  const res = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: contenido }] } }),
  });
  return res.status;
};

// ─── Sesiones falsas: el emulador no verifica la firma ───
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return (
    b64({ alg: 'none', typ: 'JWT' }) + '.' +
    b64({
      iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: now,
      user_id: uid, sub: uid, iat: now, exp: now + 3600,
      firebase: { identities: {}, sign_in_provider: 'custom' },
    }) + '.'
  );
};

const valor = (v) => (typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) });
const campos = (obj) => ({ fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, valor(v)])) });

/** `uid` = esa cuenta · `anonimo` = sin sesión · nada = administrador (siembra). */
const autorizacion = ({ uid, anonimo } = {}) => (anonimo ? {} : { Authorization: `Bearer ${uid ? sesion(uid) : 'owner'}` });

const escribir = async (ruta, datos, quien = {}) => {
  const partes = ruta.split('/');
  const id = partes.pop();
  const res = await fetch(`${base}/${partes.join('/')}?documentId=${id}`, {
    method: 'POST',
    headers: { ...autorizacion(quien), 'Content-Type': 'application/json' },
    body: JSON.stringify(campos(datos)),
  });
  return res.status;
};

const parchear = async (ruta, datos, quien = {}) => {
  const q = Object.keys(datos).map((f) => `updateMask.fieldPaths=${f}`).join('&');
  const res = await fetch(`${base}/${ruta}?${q}`, {
    method: 'PATCH',
    headers: { ...autorizacion(quien), 'Content-Type': 'application/json' },
    body: JSON.stringify(campos(datos)),
  });
  return res.status;
};

const leer = async (ruta, quien = {}) => {
  const res = await fetch(`${base}/${ruta}`, { headers: autorizacion(quien) });
  return res.status;
};

const borrar = async (ruta, quien = {}) => {
  const res = await fetch(`${base}/${ruta}`, { method: 'DELETE', headers: autorizacion(quien) });
  return res.status;
};

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/* Las reglas rechazan con 403; el emulador puede devolver 404 al ocultar el documento. */
const denegado = (code) => code === 403 || code === 404;

const rutaReglas = process.argv[2] || 'firestore.rules';
const estado = await cargarReglas(fs.readFileSync(rutaReglas, 'utf8'));
if (estado !== 200) {
  console.error('✘ no se pudieron cargar las reglas:', estado);
  process.exit(1);
}

const ANA = 'ana_uid';
const CONTADOR = `brainUsage/${ANA}`;
const REGISTRO = `brainUsage/${ANA}/respuestas/m1`;

/* Se siembra como administrador: así es como lo deja el servidor tras 11 respuestas. */
await escribir(CONTADOR, { bloque: 11, respuestasTotales: 11 });
await escribir(REGISTRO, { posicion: 11, cobrada: false });

console.log('\n── El dueño del contador tampoco puede tocarlo ──');
check('1) no puede LEER su propio contador', denegado(await leer(CONTADOR, { uid: ANA })), String(await leer(CONTADOR, { uid: ANA })));
check('2) no puede reiniciarlo a 0 (doce respuestas gratis)', denegado(await parchear(CONTADOR, { bloque: 0 }, { uid: ANA })), String(await parchear(CONTADOR, { bloque: 0 }, { uid: ANA })));
check('3) no puede borrarlo para empezar de nuevo', denegado(await borrar(CONTADOR, { uid: ANA })), String(await borrar(CONTADOR, { uid: ANA })));
check('4) no puede crear un contador a su gusto', denegado(await escribir('brainUsage/otro_uid', { bloque: 0 }, { uid: ANA })));

console.log('\n── Ni el apunte de cada respuesta ──');
check('5) no puede leer el registro de una respuesta', denegado(await leer(REGISTRO, { uid: ANA })));
check('6) no puede borrarlo para que la misma respuesta cuente dos veces', denegado(await borrar(REGISTRO, { uid: ANA })));
check('7) no puede marcar como "no cobrada" la que sí cobró', denegado(await parchear(REGISTRO, { cobrada: false }, { uid: ANA })));
check('8) ni inventarse un apunte', denegado(await escribir(`brainUsage/${ANA}/respuestas/inventada`, { posicion: 1, cobrada: false }, { uid: ANA })));

console.log('\n── Y nadie más, con sesión o sin ella ──');
check('9) otra cuenta no puede escribir en el contador ajeno', denegado(await parchear(CONTADOR, { bloque: 0 }, { uid: 'intruso_uid' })));
check('10) otra cuenta no puede leerlo', denegado(await leer(CONTADOR, { uid: 'intruso_uid' })));
check('11) sin sesión tampoco se escribe', denegado(await parchear(CONTADOR, { bloque: 0 }, { anonimo: true })));
check('12) sin sesión tampoco se lee', denegado(await leer(CONTADOR, { anonimo: true })));

console.log('\n── Control: el servidor sí sigue pudiendo ──');
/* Sin esto la prueba pasaría con unas reglas que lo cierren TODO, servidor incluido. */
check('13) el administrador (Cloud Functions) escribe sin problema', (await parchear(CONTADOR, { bloque: 7 })) === 200);
check('14) y el contador quedó donde el servidor lo dejó', (await leer(CONTADOR)) === 200);

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
