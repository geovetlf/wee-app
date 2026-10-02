/*
 * ËCONTACT / ẄCONTACT — LAS REGLAS, EJECUTADAS.
 *
 * El resto de la suite comprueba las reglas leyendo `firestore.rules`, porque el
 * repositorio no tiene emulador en el runner. Esto las EJECUTA de verdad contra
 * el motor de Firestore: siembra datos como administrador y luego intenta cada
 * operación con sesiones distintas, comprobando quién puede y quién no.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java. Se lanza así,
 * desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project demo-wee \
 *     "node functions/test/econtact-rules.emulator.mjs firestore.rules"
 *
 * Todo es local: no toca ningún proyecto real y el emulador se apaga al salir.
 *
 * QUÉ COMPRUEBA Y QUÉ NO
 * ----------------------
 * Con el modelo de IDENTIDADES DE PERFIL, abrir una solicitud y aceptarla son las
 * dos del servidor: hay que leer `users` para saber de quién es cada identidad, y
 * una regla no puede consultar. Así que aquí se comprueba justo eso —que el
 * cliente NO puede crear ni actualizar nada, haga lo que haga— y todo lo que sí
 * sigue siendo suyo: leer y las tres salidas por borrado.
 *
 * Lo que las reglas SÍ saben de identidades es cuáles son las tuyas: se derivan
 * de tu uid, porque el Perfil Weë de la cuenta ABC es `hidi_ABC` y no puede ser
 * otro. Eso es lo que se ejecuta en el bloque I.
 *
 * La lógica del servidor —resolver identidades contra `users`, los cuatro cruces,
 * la concurrencia— se ejecuta en `econtact.test.mjs`.
 */
import fs from 'node:fs';
import { proyectoDeEmulador } from './_emulador.mjs';

const PROY = proyectoDeEmulador();
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

/** `uid` = esa cuenta · `anonimo` = sin sesión · nada = administrador (el servidor). */
const pedir = async (metodo, ruta, { uid, body, anonimo } = {}) => {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: {
      ...(anonimo ? {} : { Authorization: `Bearer ${uid ? sesion(uid) : 'owner'}` }),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.status;
};

/*
 * LA CONSULTA DE LA AGENDA. `where('users','array-contains', identidad)`.
 *
 * Esto NO es un `get` repetido, y por eso hay que probarlo aparte: Firestore
 * evalúa la regla contra el conjunto que la consulta PODRÍA devolver, y si no
 * puede demostrar que todo es legible, deniega la consulta entera —aunque no
 * devuelva nada—. Una regla puede dejar leer documento a documento y aun así
 * tumbar la lista.
 *
 * Nos costó un E2E de producción descubrirlo: probábamos `get` y borrados, nunca
 * una consulta.
 */
const consultar = async (uid, identidad) => {
  const res = await fetch(`http://${host}/v1/projects/${PROY}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sesion(uid)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'econtacts' }],
        ...(identidad
          ? { where: { fieldFilter: { field: { fieldPath: 'users' }, op: 'ARRAY_CONTAINS', value: { stringValue: identidad } } } }
          : {}),
      },
    }),
  });
  const texto = await res.text();
  let filas = 0;
  try {
    filas = (JSON.parse(texto) || []).filter((x) => x.document).length;
  } catch { /* respuesta de error */ }
  return { status: res.status, filas, permitido: res.status < 400 };
};

let fallos = 0;
const esperar = async (nombre, esperado, metodo, ruta, opts) => {
  const status = await pedir(metodo, ruta, opts);
  const permitido = status < 400;
  const ok = permitido === (esperado === 'PERMITE');
  console.log(`${ok ? '✔' : '✘'} ${nombre} → ${status} (${permitido ? 'permite' : 'deniega'})`);
  if (!ok) fallos++;
};
const comprobar = (nombre, cond, extra = '') => {
  console.log(`${cond ? '✔' : '✘'} ${nombre}${extra ? ' — ' + extra : ''}`);
  if (!cond) fallos++;
};

// ═════════════════════════════════════════════════════════════════════════════
// CONTROL: ¿ESTAMOS EJECUTANDO LAS REGLAS DE VERDAD?
// ═════════════════════════════════════════════════════════════════════════════
/*
 * Sin esto, el verde no demuestra nada. `emulators:exec` arranca el emulador con
 * las reglas por defecto y NO compila las del proyecto; si el PUT fallara en
 * silencio, todo pasaría igual y estaríamos probando otra cosa.
 *
 * Así que primero se cargan unas reglas que niegan TODO y se comprueba que
 * efectivamente niegan. Solo entonces se cargan las de verdad.
 */
{
  const estado = await cargarReglas('rules_version = "2";\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    match /{doc=**} { allow read, write: if false; }\n  }\n}\n');
  comprobar('el emulador acepta que le carguen reglas', estado < 400, String(estado));
  const negado = await pedir('GET', '/econtacts/loQueSea', { uid: 'quienSea' });
  comprobar('CONTROL: con unas reglas que niegan todo, deniega', negado >= 400, String(negado));
}

const reglas = fs.readFileSync(process.argv[2] || 'firestore.rules', 'utf8');
const estadoCarga = await cargarReglas(reglas);
if (estadoCarga >= 400) {
  console.log('No se pudieron cargar las reglas del proyecto:', estadoCarga);
  process.exit(2);
}
comprobar('y las reglas del proyecto compilan', estadoCarga < 400);

// ─── Las identidades de la prueba ────────────────────────────────────────────

const str = (s) => ({ stringValue: s });
const num = (n) => ({ integerValue: String(n) });
const arr = (xs) => ({ arrayValue: { values: xs.map(str) } });

/*
 * Tres cuentas y sus caras. Un uid de Firebase Auth no lleva guion bajo, y aquí
 * tampoco: es lo que hace que unir dos identidades con `_` no sea ambiguo.
 */
const ANA = 'cuentaAna';
const BETO = 'cuentaBeto';
const CARO = 'cuentaCaro';
const WEE_ANA = `hidi_${ANA}`;
const WEE_BETO = `hidi_${BETO}`;

const idDe = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
const ID = idDe(ANA, BETO);

const relacion = (de, para, { status = 'pending' } = {}) => ({
  fields: {
    users: arr(de < para ? [de, para] : [para, de]),
    status: str(status),
    requestedBy: str(de),
    requestedTo: str(para),
  },
});

const TODOS_LOS_IDS = [
  idDe(ANA, BETO), idDe(ANA, CARO), idDe(BETO, CARO),
  idDe(WEE_ANA, BETO), idDe(ANA, WEE_BETO), idDe(WEE_ANA, WEE_BETO),
  idDe(WEE_ANA, CARO), 'idInventado', `${ANA}_${ANA}`,
];
const limpiar = async () => {
  for (const id of TODOS_LOS_IDS) await pedir('DELETE', `/econtacts/${id}`);
};
const existe = async (id) => (await pedir('GET', `/econtacts/${id}`)) < 400;
/** Deja una relación puesta, como administrador: es lo que hace el servidor. */
const sembrar = async (de, para, opts) => {
  const id = idDe(de, para);
  await pedir('DELETE', `/econtacts/${id}`);
  await pedir('PATCH', `/econtacts/${id}`, { body: relacion(de, para, opts) });
  return id;
};
const leer = async (id) =>
  (await (await fetch(`${base}/econtacts/${id}`, { headers: { Authorization: 'Bearer owner' } })).json()).fields;

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Pedir conexión: ya NO lo escribe el cliente ──');
// ═════════════════════════════════════════════════════════════════════════════
/*
 * Antes esto era del cliente con condiciones estructurales. Ahora no: de quién es
 * cada identidad se lee de `users`, y una regla no puede consultar. La puerta
 * está cerrada entera, y la abre `requestEContact` con el Admin SDK.
 */
await limpiar();
await esperar('A no puede abrir la solicitud desde la app', 'DENIEGA', 'POST', `/econtacts?documentId=${ID}`, { uid: ANA, body: relacion(ANA, BETO) });
await esperar('ni siquiera bien formada y en pending', 'DENIEGA', 'POST', `/econtacts?documentId=${ID}`, { uid: ANA, body: relacion(ANA, BETO, { status: 'pending' }) });
await esperar('ni desde su Perfil Weë', 'DENIEGA', 'POST', `/econtacts?documentId=${idDe(WEE_ANA, BETO)}`, { uid: ANA, body: relacion(WEE_ANA, BETO) });
await esperar('ni un invitado sin sesión', 'DENIEGA', 'POST', `/econtacts?documentId=${ID}`, { anonimo: true, body: relacion(ANA, BETO) });
comprobar('no se ha creado nada', !(await existe(ID)));
await esperar('el servidor sí: es quien abre la solicitud', 'PERMITE', 'PATCH', `/econtacts/${ID}`, { body: relacion(ANA, BETO) });
{
  const doc = await leer(ID);
  comprobar('la relación nace en pending', doc.status.stringValue === 'pending', doc.status.stringValue);
  comprobar('con la pareja ordenada', doc.users.arrayValue.values.map((v) => v.stringValue).join() === [ANA, BETO].sort().join());
  comprobar('y todavía NO es una conexión para ninguno de los dos', doc.status.stringValue !== 'accepted');
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Suplantar: ninguna forma funciona ──');
// ═════════════════════════════════════════════════════════════════════════════
await limpiar();
await esperar('C no puede crear en nombre de A', 'DENIEGA', 'POST', `/econtacts?documentId=${ID}`, { uid: CARO, body: relacion(ANA, BETO) });
await esperar('nadie fabrica una conexión aceptada de un tirón', 'DENIEGA', 'POST', `/econtacts?documentId=${ID}`, { uid: ANA, body: relacion(ANA, BETO, { status: 'accepted' }) });
await esperar('ni una relación consigo misma', 'DENIEGA', 'POST', `/econtacts?documentId=${ANA}_${ANA}`, { uid: ANA, body: relacion(ANA, ANA) });
await esperar('ni con un id inventado', 'DENIEGA', 'POST', '/econtacts?documentId=idInventado', { uid: ANA, body: relacion(ANA, BETO) });
await esperar('ni usando el Perfil Weë de otra persona', 'DENIEGA', 'POST', `/econtacts?documentId=${idDe(WEE_BETO, CARO)}`, { uid: CARO, body: relacion(WEE_BETO, CARO) });
comprobar('la colección sigue vacía', !(await existe(ID)) && !(await existe('idInventado')));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Aceptar: solo el servidor ──');
// ═════════════════════════════════════════════════════════════════════════════
await limpiar();
await sembrar(ANA, BETO);
const aceptar = { body: { fields: { status: str('accepted') } } };
const mascara = `/econtacts/${ID}?updateMask.fieldPaths=status`;
await esperar('quien la envió no puede aceptarla', 'DENIEGA', 'PATCH', mascara, { uid: ANA, ...aceptar });
await esperar('una persona ajena tampoco', 'DENIEGA', 'PATCH', mascara, { uid: CARO, ...aceptar });
await esperar('NI SIQUIERA quien la recibió, desde el cliente', 'DENIEGA', 'PATCH', mascara, { uid: BETO, ...aceptar });
await esperar('ni un invitado sin sesión', 'DENIEGA', 'PATCH', mascara, { anonimo: true, ...aceptar });
await esperar('el servidor sí: es quien acepta', 'PERMITE', 'PATCH', mascara, { ...aceptar });
{
  const doc = await leer(ID);
  comprobar('y queda aceptada', doc.status.stringValue === 'accepted');
  comprobar('con la pareja intacta', doc.users.arrayValue.values.map((v) => v.stringValue).join() === [ANA, BETO].sort().join());
  comprobar('y sin cambiar quién pidió a quién', doc.requestedBy.stringValue === ANA && doc.requestedTo.stringValue === BETO);
}
await esperar('nadie puede reescribir la pareja', 'DENIEGA', 'PATCH', `/econtacts/${ID}?updateMask.fieldPaths=users`, { uid: ANA, body: { fields: { users: arr([ANA, CARO]) } } });
await esperar('ni quién pidió a quién', 'DENIEGA', 'PATCH', `/econtacts/${ID}?updateMask.fieldPaths=requestedBy`, { uid: BETO, body: { fields: { requestedBy: str(BETO) } } });

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Un solo documento por pareja de identidades ──');
// ═════════════════════════════════════════════════════════════════════════════
await limpiar();
await sembrar(ANA, BETO);
await esperar('A no puede añadir una segunda relación con B', 'DENIEGA', 'POST', `/econtacts?documentId=${ID}`, { uid: ANA, body: relacion(ANA, BETO) });
await esperar('B tampoco al revés: es el mismo documento', 'DENIEGA', 'POST', `/econtacts?documentId=${ID}`, { uid: BETO, body: relacion(BETO, ANA) });
comprobar('y el id de la pareja es simétrico', idDe(ANA, BETO) === idDe(BETO, ANA));
/*
 * Los cuatro cruces caen en cuatro documentos distintos. Es lo que hace que
 * `real A ↔ Weë B` no se pise con `Weë A ↔ real B`.
 */
{
  const cuatro = [idDe(ANA, BETO), idDe(WEE_ANA, BETO), idDe(ANA, WEE_BETO), idDe(WEE_ANA, WEE_BETO)];
  comprobar('los cuatro cruces dan cuatro ids distintos', new Set(cuatro).size === 4, cuatro.join(' · '));
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Rechazar ──');
// ═════════════════════════════════════════════════════════════════════════════
await limpiar();
await sembrar(ANA, BETO);
await esperar('C no puede rechazar una solicitud ajena', 'DENIEGA', 'DELETE', `/econtacts/${ID}`, { uid: CARO });
await esperar('B rechaza la que recibió', 'PERMITE', 'DELETE', `/econtacts/${ID}`, { uid: BETO });
comprobar('la relación desaparece', !(await existe(ID)));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Cancelar ──');
// ═════════════════════════════════════════════════════════════════════════════
await limpiar();
await sembrar(ANA, BETO);
await esperar('C no puede cancelar una solicitud ajena', 'DENIEGA', 'DELETE', `/econtacts/${ID}`, { uid: CARO });
await esperar('A retira la suya', 'PERMITE', 'DELETE', `/econtacts/${ID}`, { uid: ANA });
comprobar('la relación desaparece', !(await existe(ID)));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Eliminar una conexión ──');
// ═════════════════════════════════════════════════════════════════════════════
await limpiar();
await sembrar(ANA, BETO, { status: 'accepted' });
await esperar('una persona ajena no puede deshacerla', 'DENIEGA', 'DELETE', `/econtacts/${ID}`, { uid: CARO });
await esperar('cualquiera de las dos partes, sí', 'PERMITE', 'DELETE', `/econtacts/${ID}`, { uid: BETO });
comprobar('deja de existir para los dos: era un solo documento', !(await existe(ID)));

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Leer: cada relación es de sus dos partes ──');
// ═════════════════════════════════════════════════════════════════════════════
await limpiar();
await sembrar(ANA, BETO);
await esperar('A la lee', 'PERMITE', 'GET', `/econtacts/${ID}`, { uid: ANA });
await esperar('B la lee', 'PERMITE', 'GET', `/econtacts/${ID}`, { uid: BETO });
await esperar('C no puede leer la solicitud privada de otros', 'DENIEGA', 'GET', `/econtacts/${ID}`, { uid: CARO });
await esperar('ni un invitado sin sesión', 'DENIEGA', 'GET', `/econtacts/${ID}`, { anonimo: true });

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── I · Identidades de perfil: las tuyas y solo las tuyas ──');
// ═════════════════════════════════════════════════════════════════════════════
/*
 * LO QUE LAS REGLAS SÍ SABEN DE IDENTIDADES.
 *
 * No pueden consultar `users`, pero sí derivar cuáles SERÍAN tus identidades:
 * tu cuenta y `hidi_` + tu cuenta. Eso basta para lo que se decide aquí —quién
 * lee y quién borra— y es imposible de falsificar, porque sale de tu propio uid.
 *
 * Los cuatro cruces se prueban uno a uno: en cada uno, las dos cuentas
 * implicadas pueden y la tercera no.
 */
await limpiar();

for (const [nombre, a, b] of [
  ['real A ↔ real B', ANA, BETO],
  ['Weë A ↔ real B', WEE_ANA, BETO],
  ['real A ↔ Weë B', ANA, WEE_BETO],
  ['Weë A ↔ Weë B', WEE_ANA, WEE_BETO],
]) {
  const id = await sembrar(a, b, { status: 'accepted' });
  await esperar(`${nombre}: la cuenta de A la lee`, 'PERMITE', 'GET', `/econtacts/${id}`, { uid: ANA });
  await esperar(`${nombre}: la cuenta de B la lee`, 'PERMITE', 'GET', `/econtacts/${id}`, { uid: BETO });
  await esperar(`${nombre}: una tercera cuenta NO`, 'DENIEGA', 'GET', `/econtacts/${id}`, { uid: CARO });
  await esperar(`${nombre}: una tercera cuenta tampoco la borra`, 'DENIEGA', 'DELETE', `/econtacts/${id}`, { uid: CARO });
  await esperar(`${nombre}: la cuenta implicada sí`, 'PERMITE', 'DELETE', `/econtacts/${id}`, { uid: ANA });
  comprobar(`${nombre}: y desaparece`, !(await existe(id)));
}

/*
 * Y una identidad que NO se deriva de ninguna cuenta —un negocio— no le sirve a
 * nadie: no está entre las identidades de ninguna sesión, así que su relación no
 * la puede tocar ni leer ningún cliente.
 */
{
  const id = await sembrar('biz_negocio1', CARO, { status: 'accepted' });
  await esperar('nadie lee una relación con una identidad de negocio', 'DENIEGA', 'GET', `/econtacts/${id}`, { uid: ANA });
  await esperar('C sí, porque es SU relación', 'PERMITE', 'GET', `/econtacts/${id}`, { uid: CARO });
  await pedir('DELETE', `/econtacts/${id}`);
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── I-bis · LA CONSULTA de la agenda, que es lo que hace la app ──');
// ═════════════════════════════════════════════════════════════════════════════
/*
 * Lo que faltaba. Leer una relación suelta y poder LISTAR tu agenda son dos
 * permisos distintos, y la app hace lo segundo. Aquí se ejecutan las cuatro
 * consultas que importan.
 */
await limpiar();
await sembrar(ANA, BETO, { status: 'accepted' });
await sembrar(WEE_ANA, BETO, { status: 'accepted' });
await sembrar(WEE_ANA, WEE_BETO, { status: 'accepted' });
{
  const real = await consultar(ANA, ANA);
  comprobar('A puede LISTAR la agenda de su Perfil Real', real.permitido, `status ${real.status}`);
  comprobar('y le sale solo lo suyo: una relación', real.filas === 1, `${real.filas} filas`);

  const wee = await consultar(ANA, WEE_ANA);
  comprobar('A puede LISTAR la agenda de su Perfil Weë', wee.permitido, `status ${wee.status}`);
  comprobar('con las suyas, que son otras dos', wee.filas === 2, `${wee.filas} filas`);

  comprobar('las dos agendas dan resultados distintos', real.filas !== wee.filas);

  const ajena = await consultar(ANA, BETO);
  comprobar('pero NO puede listar la agenda de otra persona', !ajena.permitido, `status ${ajena.status}`);
  const ajenaWee = await consultar(ANA, WEE_BETO);
  comprobar('ni la del Perfil Weë de otra persona', !ajenaWee.permitido, `status ${ajenaWee.status}`);

  const todo = await consultar(ANA, null);
  comprobar('ni pedir la colección entera sin filtro', !todo.permitido, `status ${todo.status}`);

  /*
   * Y LA PREMISA DE LA CORRECCIÓN DE `leerDoc`, ejecutada.
   *
   * Un `get` de una relación que NO existe se deniega, aunque la pareja sea
   * tuya: sin documento no hay `resource.data` que evaluar. Es correcto —de algo
   * que no existe no se puede demostrar que sea tuyo— y por eso el servicio
   * traduce ese `permission-denied` a "no hay relación" en vez de relajar la
   * regla.
   */
  const inexistente = await pedir('GET', `/econtacts/${idDe(ANA, 'cuentaQueNoExiste')}`, { uid: ANA });
  comprobar('un get de una relación que no existe se deniega (premisa de leerDoc)', inexistente >= 400, `status ${inexistente}`);
  const miaYExiste = await pedir('GET', `/econtacts/${idDe(ANA, BETO)}`, { uid: ANA });
  comprobar('y una que sí existe y es tuya se lee sin problema', miaYExiste < 400, `status ${miaYExiste}`);

  const sinSesion = await fetch(`http://${host}/v1/projects/${PROY}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'econtacts' }],
        where: { fieldFilter: { field: { fieldPath: 'users' }, op: 'ARRAY_CONTAINS', value: { stringValue: ANA } } },
      },
    }),
  });
  comprobar('ni un invitado sin sesión', sinSesion.status >= 400, `status ${sinSesion.status}`);
}
await limpiar();

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── J · El contador no lo escribe el cliente ──');
// ═════════════════════════════════════════════════════════════════════════════
await pedir('DELETE', `/users/${ANA}`);
await pedir('PATCH', `/users/${ANA}`, { body: { fields: { uid: str(ANA), displayName: str('Ana'), followers: num(0), following: num(0) } } });
await esperar('nadie se pone econtactsCount a sí misma', 'DENIEGA', 'PATCH', `/users/${ANA}?updateMask.fieldPaths=econtactsCount`, { uid: ANA, body: { fields: { econtactsCount: num(99) } } });
await esperar('ni una persona ajena', 'DENIEGA', 'PATCH', `/users/${ANA}?updateMask.fieldPaths=econtactsCount`, { uid: CARO, body: { fields: { econtactsCount: num(99) } } });
await esperar('editar el propio nombre sigue funcionando', 'PERMITE', 'PATCH', `/users/${ANA}?updateMask.fieldPaths=displayName`, { uid: ANA, body: { fields: { displayName: str('Ana G') } } });

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── K · Lo que no se ha tocado ──');
// ═════════════════════════════════════════════════════════════════════════════
/*
 * + cierre post-auditoría 2026-10-01: `follows` ata el id al par `{followerId}_{followingId}` (la forma que escribía
 * el cliente retirado). Los dos controles siguen probando lo mismo —la cara real y la Weë de quien escribe— en su id.
 */
const F1 = `${ANA}_${BETO}`;
const F2 = `${WEE_ANA}_${BETO}`;
await pedir('DELETE', `/follows/${F1}`);
await esperar('follows sigue aceptando el uid de la cuenta', 'PERMITE', 'POST', `/follows?documentId=${F1}`, { uid: ANA, body: { fields: { followerId: str(ANA), followingId: str(BETO) } } });
await pedir('DELETE', `/follows/${F2}`);
await esperar('y también el Perfil Weë, como siempre', 'PERMITE', 'POST', `/follows?documentId=${F2}`, { uid: ANA, body: { fields: { followerId: str(WEE_ANA), followingId: str(BETO) } } });
await pedir('DELETE', '/businessFollows/bf1');
await esperar('businessFollows sigue siendo de su dueña', 'PERMITE', 'POST', '/businessFollows?documentId=bf1', { uid: ANA, body: { fields: { userId: str(ANA), businessId: str('n1') } } });
await esperar('y ajeno a nadie más', 'DENIEGA', 'POST', '/businessFollows?documentId=bf2', { uid: CARO, body: { fields: { userId: str(ANA), businessId: str('n1') } } });

for (const p of [`/follows/${F1}`, `/follows/${F2}`, '/businessFollows/bf1', `/users/${ANA}`]) await pedir('DELETE', p);
await limpiar();

console.log(fallos === 0 ? '\n✅ Reglas de ËContact: comportamiento verificado en el emulador' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
