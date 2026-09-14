/*
 * LAS REGLAS DE `posts`, EJECUTADAS — la visibilidad, exigida por la base de datos.
 *
 * `pagina-publica.test.mjs` comprueba que la página pública solo enseña lo que
 * se declara público. Eso protege la PUERTA. Esto protege el DATO: que no se
 * pueda guardar una publicación sin decir si es pública o privada.
 *
 * Las dos mitades hacen falta. Mientras las reglas no exigieran nada, el único
 * guardián de `isPrivate` era TypeScript, y TypeScript no llega a Firestore: un
 * script, otro cliente o una llamada suelta al SDK podían escribir un post sin
 * el campo, con `null` o con la cadena "false".
 *
 * Como el de ËContact, esto no está en `npm test` a propósito: necesita el
 * emulador y Java. Se lanza así, desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project demo-wee-reglas \
 *     "node functions/test/posts-rules.emulator.mjs firestore.rules"
 *
 * Ojo con Java: firebase-tools ya no arranca con menos de JDK 21, y el `java`
 * del PATH de esta máquina es el 17 del build de Android. Hay un JDK 21 portable
 * en %LOCALAPPDATA%\wee-tools; se antepone al PATH solo para ese comando, igual
 * que hace scripts/emulators.mjs.
 *
 * El identificador empieza por `demo-`, que para Firebase significa
 * EMULADOR Y NADA MÁS: con un proyecto así el SDK se niega a hablar con ningún
 * servidor real. Aquí no hay forma de tocar `get-wee` ni por accidente.
 *
 * QUÉ SE COMPRUEBA
 * ----------------
 * Que `isPrivate` exista y sea booleano al CREAR y al ACTUALIZAR. No que valga
 * `false`: `true` es igual de válido, porque las publicaciones privadas
 * llegarán. Lo que no se admite es no decirlo.
 *
 * Y con controles en los dos sentidos: que lo válido siga pasando y que no se
 * haya tocado quién puede escribir.
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

/* Los valores de Firestore por REST llevan el tipo puesto. Aquí está la gracia:
 * la diferencia entre `booleanValue` y `stringValue` es justo lo que se prueba. */
const valor = (v) => {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { integerValue: String(v) };
  return { stringValue: String(v) };
};
const campos = (obj) => {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = valor(v);
  return { fields };
};

/** `uid` = esa cuenta · `anonimo` = sin sesión · nada = administrador (siembra). */
const autorizacion = ({ uid, anonimo } = {}) =>
  anonimo ? {} : { Authorization: `Bearer ${uid ? sesion(uid) : 'owner'}` };

const crear = async (id, datos, quien = {}) => {
  const res = await fetch(`${base}/posts?documentId=${id}`, {
    method: 'POST',
    headers: { ...autorizacion(quien), 'Content-Type': 'application/json' },
    body: JSON.stringify(campos(datos)),
  });
  return res.status;
};

/**
 * Actualizar por REST con máscara.
 *
 * `mascara` dice qué campos toca la escritura; lo que no está en la máscara se
 * conserva. Y un campo que está EN LA MÁSCARA pero no en el cuerpo SE BORRA:
 * así es como se prueba que nadie puede dejar un post sin `isPrivate`.
 */
const actualizar = async (id, datos, mascara, quien = {}) => {
  const q = mascara.map((f) => `updateMask.fieldPaths=${f}`).join('&');
  const res = await fetch(`${base}/posts/${id}?${q}`, {
    method: 'PATCH',
    headers: { ...autorizacion(quien), 'Content-Type': 'application/json' },
    body: JSON.stringify(campos(datos)),
  });
  return res.status;
};

const borrar = (id) =>
  fetch(`${base}/posts/${id}`, { method: 'DELETE', headers: autorizacion() }).then((r) => r.status);

let fallos = 0;
const comprobar = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ' — ' + extra : ''}`);
  if (!cond) fallos++;
};
const esperar = (nombre, esperado, status) => {
  const permitido = status < 400;
  comprobar(nombre, permitido === (esperado === 'PERMITE'), `${status} · ${permitido ? 'permite' : 'deniega'}`);
};

// ═════════════════════════════════════════════════════════════════════════════
// CONTROL: ¿ESTAMOS EJECUTANDO LAS REGLAS DE VERDAD?
// ═════════════════════════════════════════════════════════════════════════════
/*
 * Sin esto el verde no demuestra nada: si el PUT de las reglas fallara en
 * silencio, el emulador correría con las suyas por defecto y todo pasaría igual.
 * Primero unas reglas que niegan TODO, y se comprueba que niegan.
 */
{
  const estado = await cargarReglas('rules_version = "2";\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    match /{doc=**} { allow read, write: if false; }\n  }\n}\n');
  comprobar('el emulador acepta que le carguen reglas', estado < 400, String(estado));
  esperar('CONTROL: con unas reglas que niegan todo, deniega', 'DENIEGA',
    await crear('control', { userId: 'u1', isPrivate: false }, { uid: 'u1' }));
}

const ruta = process.argv[2] || 'firestore.rules';
comprobar('se cargan las reglas del proyecto', (await cargarReglas(fs.readFileSync(ruta, 'utf8'))) < 400, ruta);

const POST = (extra) => ({ userId: 'u1', content: 'hola', hashtags: 'x', ...extra });

console.log('\n── A · CREAR: hay que decir si es pública o privada ──');
{
  esperar('1) con isPrivate: false se puede crear', 'PERMITE',
    await crear('a1', POST({ isPrivate: false }), { uid: 'u1' }));
  /* `true` NO se prohíbe: las privadas llegarán y tienen que poder guardarse. */
  esperar('2) con isPrivate: true también', 'PERMITE',
    await crear('a2', POST({ isPrivate: true }), { uid: 'u1' }));

  esperar('3) SIN el campo, no', 'DENIEGA',
    await crear('a3', POST({}), { uid: 'u1' }));
  esperar('4) con null, no', 'DENIEGA',
    await crear('a4', POST({ isPrivate: null }), { uid: 'u1' }));
  esperar('5) con la cadena "false", no', 'DENIEGA',
    await crear('a5', POST({ isPrivate: 'false' }), { uid: 'u1' }));
  esperar('6) con la cadena "true", tampoco', 'DENIEGA',
    await crear('a6', POST({ isPrivate: 'true' }), { uid: 'u1' }));
  esperar('7) con un número, tampoco', 'DENIEGA',
    await crear('a7', POST({ isPrivate: 0 }), { uid: 'u1' }));

  /* CONTROLES: lo que ya protegían las reglas sigue protegido igual. */
  esperar('8) control: sin sesión no se crea nada, ni bien formado', 'DENIEGA',
    await crear('a8', POST({ isPrivate: false }), { anonimo: true }));
  esperar('9) control: no se puede publicar en nombre de otra persona', 'DENIEGA',
    await crear('a9', { userId: 'otro', content: 'hola', isPrivate: false }, { uid: 'u1' }));
  /* El Perfil Weë de esta misma cuenta sí, que es una identidad suya. */
  esperar('10) control: el Perfil Weë de la propia cuenta sigue pudiendo', 'PERMITE',
    await crear('a10', { userId: 'hidi_u1', content: 'hola', isPrivate: false }, { uid: 'u1' }));
}

console.log('\n── B · ACTUALIZAR: y no se puede quitar después ──');
{
  /* Sembrado como administrador: las reglas no miran esta escritura. */
  await crear('b1', POST({ isPrivate: false, views: 1 }));

  esperar('11) el autor edita su texto y el campo sigue en su sitio', 'PERMITE',
    await actualizar('b1', { content: 'editado' }, ['content'], { uid: 'u1' }));
  esperar('12) y puede pasarla a privada', 'PERMITE',
    await actualizar('b1', { isPrivate: true }, ['isPrivate'], { uid: 'u1' }));
  esperar('13) y volver a pública', 'PERMITE',
    await actualizar('b1', { isPrivate: false }, ['isPrivate'], { uid: 'u1' }));

  /*
   * LO QUE DE VERDAD CIERRA LA PUERTA. Proteger solo el alta no sirve de nada si
   * una edición posterior puede borrar el campo: la máscara lo nombra y el
   * cuerpo lo omite, que es como se borra un campo por REST.
   */
  esperar('14) NO puede borrar el campo en una edición', 'DENIEGA',
    await actualizar('b1', { content: 'sin campo' }, ['content', 'isPrivate'], { uid: 'u1' }));
  esperar('15) ni ponerlo a null', 'DENIEGA',
    await actualizar('b1', { isPrivate: null }, ['isPrivate'], { uid: 'u1' }));
  esperar('16) ni cambiarle el tipo a cadena', 'DENIEGA',
    await actualizar('b1', { isPrivate: 'false' }, ['isPrivate'], { uid: 'u1' }));
  esperar('17) ni a número', 'DENIEGA',
    await actualizar('b1', { isPrivate: 1 }, ['isPrivate'], { uid: 'u1' }));

  /* Y el camino de los contadores, que usa cualquiera, sigue funcionando. */
  esperar('18) control: otra persona sigue pudiendo sumar una vista', 'PERMITE',
    await actualizar('b1', { views: 2 }, ['views'], { uid: 'u2' }));
  esperar('19) control: y sigue sin poder editar el texto ajeno', 'DENIEGA',
    await actualizar('b1', { content: 'me lo invento' }, ['content'], { uid: 'u2' }));

  /*
   * La comprobación mira el documento RESULTANTE, no el cambio. Se demuestra
   * sembrando uno sin el campo —cosa que ya nadie puede crear— y viendo que ni
   * siquiera una suma de vistas pasa por encima de él.
   */
  await crear('b2', { userId: 'u1', content: 'viejo sin campo', views: 1 });
  esperar('20) un post sin el campo queda congelado hasta que se arregle', 'DENIEGA',
    await actualizar('b2', { views: 2 }, ['views'], { uid: 'u2' }));
  esperar('21) y su autor lo arregla poniéndolo', 'PERMITE',
    await actualizar('b2', { isPrivate: false }, ['isPrivate'], { uid: 'u1' }));

  /* CONTROL: leer sigue siendo de todo el mundo, y borrar solo del autor. */
  const leer = await fetch(`${base}/posts/b1`, { headers: {} }).then((r) => r.status);
  comprobar('22) control: leer un post sigue abierto a cualquiera', leer < 400, String(leer));
  esperar('23) control: y el autor sigue pudiendo borrar el suyo', 'PERMITE', await borrar('b1'));
}

console.log('\n' + (fallos ? `✘ ${fallos} fallo(s)` : '✔ todo bien'));
process.exit(fallos ? 1 : 0);
