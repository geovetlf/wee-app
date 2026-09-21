/**
 * S4 · ELEMENTS CONTRA FIRESTORE DE VERDAD.
 *
 * Hay dos cosas que no se comprueban leyendo un archivo, y las dos están aquí:
 *
 *   1 · LAS REGLAS. Que una cuenta no pueda leer lo de otra no se sabe mirando
 *       `firestore.rules`: hay que intentarlo con una sesión y ver si pasa.
 *   2 · LA CONSULTA. Que `ownerAccountId + status + type + createdAt` funcione
 *       —y por tanto que el índice declarado sea el correcto— no se sabe
 *       leyendo `firestore.indexes.json`: hay que ejecutarla.
 *
 * Lo demás —crear, cambiar, archivar, aislar, resolver— ya está probado en
 * `elements-runtime.test.mjs` con una base de mentira, y no se repite aquí.
 *
 * NO está en `npm test` a propósito: necesita el emulador y Java 21. Desde la
 * raíz del proyecto:
 *
 *   firebase emulators:exec --only firestore --project wee-dev-geovet \
 *     "node functions/test/elements.emulator.mjs"
 *
 * NUNCA contra producción: el proyecto va fijo y es el de desarrollo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const PROY = 'wee-dev-geovet';
const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── Sesiones y reglas, como en las demás pruebas de emulador ─────────────── */

const cargarReglas = async (contenido) => {
  const res = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: contenido }] } }),
  });
  return res.status;
};

/** Una sesión de Firebase Auth sin firmar: el emulador no verifica firmas. */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sesion = (uid) => {
  const ahora = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${PROY}`, aud: PROY, auth_time: ahora,
    user_id: uid, sub: uid, iat: ahora, exp: ahora + 3600,
    firebase: { identities: {}, sign_in_provider: 'custom' },
  })}.`;
};

const comoCliente = async (metodo, ruta, uid, cuerpo) => {
  const res = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${sesion(uid)}`, 'Content-Type': 'application/json' },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
  return res.status;
};

/* ── El mundo, escrito por el servidor (Admin SDK, como en producción) ────── */

const admin = require(path.resolve(RAIZ, 'functions/node_modules/firebase-admin/lib/index.js'));
if (!admin.apps.length) admin.initializeApp({ projectId: PROY });
const db = admin.firestore();

const els = require(path.resolve(RAIZ, 'functions/lib/elements/index.js'));
const core = require(path.resolve(RAIZ, 'functions/lib/core/index.js'));

const A = 'cuentaAemu';
const B = 'cuentaBemu';
const AYER = 1_799_900_000_000;
const HOY = 1_800_000_000_000;

const FICHAS = {
  img_a_front: { assetId: 'img_a_front', ownerAccountId: A, kind: 'image', status: 'ready' },
  img_a_side: { assetId: 'img_a_side', ownerAccountId: A, kind: 'image', status: 'ready' },
  img_b_front: { assetId: 'img_b_front', ownerAccountId: B, kind: 'image', status: 'ready' },
};
const material = async (assetId) => FICHAS[assetId] ?? null;
const deps = { db, material };

const limpiar = async (coleccion) => {
  const snap = await db.collection(coleccion).limit(200).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
};

/* ═══════════════════════════════════════════════════════════════════════════ */

console.log('\n── A · Las reglas, intentadas de verdad ──');
{
  const estado = await cargarReglas(fs.readFileSync(path.resolve(RAIZ, 'firestore.rules'), 'utf8'));
  check('las reglas del repositorio se cargan en el emulador', estado === 200, `HTTP ${estado}`);

  /* El servidor escribe con el Admin SDK, que no pasa por las reglas. */
  await db.collection(els.COLECCION_DE_ELEMENTOS).doc('burger_de_a').set({
    contract: core.ELEMENT_CONTRACT_VERSION, elementId: 'burger_de_a', type: 'product', version: 1,
    status: 'active', name: 'Burger de A', ownerAccountId: A,
    refs: [{ assetId: 'img_a_front', role: 'primary', kind: 'image' }],
    createdAt: AYER, updatedAt: AYER,
  });

  check('Y) el DUEÑO lee lo suyo', await comoCliente('GET', '/elements/burger_de_a', A) === 200);
  check('Y/§67) y OTRA CUENTA no: la regla la para, no el código',
    await comoCliente('GET', '/elements/burger_de_a', B) === 403);
  check('Y) sin sesión tampoco', (await fetch(`${base}/elements/burger_de_a`)).status === 403);

  /* Escribir desde el cliente: nunca. */
  const documento = (owner) => ({
    fields: {
      contract: { stringValue: '1.0' }, elementId: { stringValue: 'burger_falso' },
      type: { stringValue: 'product' }, version: { integerValue: '1' },
      status: { stringValue: 'active' }, name: { stringValue: 'mío ahora' },
      ownerAccountId: { stringValue: owner },
      refs: { arrayValue: { values: [] } },
      createdAt: { integerValue: String(HOY) }, updatedAt: { integerValue: String(HOY) },
    },
  });
  check('§67) un cliente NO crea un Element, ni siquiera uno suyo: lo afirma el servidor',
    await comoCliente('POST', '/elements?documentId=burger_falso', A, documento(A)) === 403);
  check('§67) y menos poniéndole la cuenta de otro',
    await comoCliente('POST', '/elements?documentId=burger_robado', A, documento(B)) === 403);
  check('§67) un cliente NO cambia un Element, ni el suyo',
    await comoCliente('PATCH', '/elements/burger_de_a', A, documento(A)) === 403);
  check('§67) ni lo borra, ni lo archiva por su cuenta',
    await comoCliente('DELETE', '/elements/burger_de_a', A) === 403);
  check('§67) ni toca la fila de un proyecto',
    await comoCliente('POST', '/projectItems?documentId=fila_falsa', A, documento(A)) === 403);
}

console.log('\n── B · La consulta de verdad, y el índice que declara ──');
{
  await limpiar(els.COLECCION_DE_ELEMENTOS);
  await limpiar(els.COLECCION_DE_ITEMS_DE_PROYECTO);

  /* A guarda tres hamburguesas por el runtime real; B guarda la suya. */
  const puestas = [];
  for (const [id, nombre, at] of [['burger_classic', 'Burger Classic', AYER], ['burger_bbq', 'Burger BBQ', HOY - 100], ['burger_deluxe', 'Burger Deluxe', HOY - 50]]) {
    puestas.push(await els.crearElemento({
      accountId: A, elementId: id, type: 'product', name: nombre,
      refs: [{ assetId: 'img_a_front', role: 'primary', kind: 'image' }, { assetId: 'img_a_side', role: 'reference', kind: 'image' }],
      at,
    }, deps));
  }
  const deB = await els.crearElemento({
    accountId: B, elementId: 'burger_de_b', type: 'product', name: 'Burger de B',
    refs: [{ assetId: 'img_b_front', role: 'primary', kind: 'image' }], at: AYER,
  }, deps);
  check('A) el runtime escribe en Firestore de verdad', puestas.every((p) => p.status === 'creado') && deB.status === 'creado',
    puestas.map((p) => p.status).join(','));

  const conLoAjeno = await els.crearElemento({
    accountId: A, elementId: 'burger_con_lo_ajeno', type: 'product', name: 'Con lo ajeno',
    refs: [{ assetId: 'img_b_front', role: 'primary', kind: 'image' }], at: HOY,
  }, deps);
  check('F/§36) el material de B se rechaza como si no existiera',
    conLoAjeno.status === 'material_rechazado' && conLoAjeno.motivo === 'not_found'
    && !(await db.collection(els.COLECCION_DE_ELEMENTOS).doc('burger_con_lo_ajeno').get()).exists);

  /*
   * AA · LA CONSULTA, EJECUTADA. Y una advertencia honesta: el emulador de
   * Firestore NO exige índices compuestos, así que esto demuestra que la
   * consulta tiene la forma correcta y devuelve lo que debe — no demuestra que
   * el índice declarado sea suficiente en producción. Eso lo dirá el primer
   * despliegue, y por eso el índice se deja PREPARADO y reportado.
   */
  const candidatos = await els.candidatosDeLaCuenta({ accountId: A, type: 'product' }, deps);
  check('AA/§68) la consulta `ownerAccountId + status + type + createdAt` SE EJECUTA contra Firestore',
    candidatos.length === 3 && candidatos.every((e) => e.ownerAccountId === A),
    `${candidatos.length} candidatos`);
  check('S/§63) y no trae nada de B: el aislamiento lo hace el `where`, no un filtro después',
    !candidatos.some((e) => e.elementId === 'burger_de_b'));

  const enFranja = await els.candidatosDeLaCuenta({ accountId: A, type: 'product', createdAfter: AYER - 1000, createdBefore: AYER + 1000 }, deps);
  check('N/§61) la consulta CON RANGO también se ejecuta, y acota: sale solo la de ayer',
    enFranja.length === 1 && enFranja[0].elementId === 'burger_classic', `${enFranja.length}`);

  /* T · Archivado: deja de ser candidato, y el material sigue. */
  await els.archivarElemento(A, 'burger_bbq', HOY, deps);
  const trasArchivar = await els.candidatosDeLaCuenta({ accountId: A, type: 'product' }, deps);
  const archivada = (await db.collection(els.COLECCION_DE_ELEMENTOS).doc('burger_bbq').get()).data();
  check('T/§66) archivar la saca de los candidatos, y el documento sigue ahí con sus referencias',
    trasArchivar.length === 2 && !trasArchivar.some((e) => e.elementId === 'burger_bbq')
    && archivada.status === 'archived' && archivada.refs.length === 2);

  /* M/§29 · El proyecto, con filas reales. */
  await db.collection(els.COLECCION_DE_ITEMS_DE_PROYECTO).doc('fila_uno').set({
    projectId: 'campana_verano', kind: 'asset', itemId: 'img_a_side', ownerAccountId: A, addedAt: HOY,
  });
  const peticion = { accountId: A, needs: [{ kind: 'element', elementType: 'product', required: true }], projectId: 'campana_verano' };
  const mundo = await els.mundoDeContextoDeWee(peticion, deps);
  check('M/§29) la consulta de las filas de proyecto también se ejecuta y encuentra',
    mundo.enProyecto !== undefined && mundo.enProyecto.length === 2, `${mundo.enProyecto?.length ?? 0}`);

  /* §60 · Y de ahí, la cadena entera. */
  const resuelto = core.resolverContexto(
    await els.mundoDeContextoDeWee({ ...peticion, projectId: undefined, window: { createdAfter: AYER - 1000, createdBefore: AYER + 1000 } }, deps),
    { ...peticion, projectId: undefined, window: { createdAfter: AYER - 1000, createdBefore: AYER + 1000 } },
  );
  const adjuntos = core.materialesDelContexto(resuelto);
  const planner = core.crearPlanner({ availability: { disponible: (c) => ['image.generate', 'video.image_to_video'].includes(String(c)) }, tracer: { record() {} }, now: () => HOY });
  const plan = await planner.planificar({
    contract: core.PLANNER_CONTRACT_VERSION,
    trace: { traceId: 'emu_1', requestId: 'emu_1', userId: 'u1' },
    understanding: {
      intent: 'creation', confidence: 'high', goal: 'un anuncio', inputs: { text: 'un anuncio', attachments: adjuntos },
      references: [], constraints: {}, needsPlanning: true, missing: [], assumptions: [],
      capability: 'video.image_to_video', capabilities: ['video.image_to_video'],
    },
  });
  check('§60) DE FIRESTORE AL PLAN: material real guardado → contexto → adjuntos → un solo paso',
    resuelto.status === 'resolved' && adjuntos.length === 2
    && plan.status === 'ready' && plan.plan.steps.length === 1 && plan.plan.steps[0].capability === 'video.image_to_video',
    `${resuelto.status} · ${plan.plan?.steps.length} paso(s)`);
  check('§77/§78) sin proveedor, sin modelo y sin un solo trabajo',
    !JSON.stringify(plan.plan).toLowerCase().includes('provider'));

  /* Ambigüedad, con datos reales. */
  const sinSeñal = { accountId: A, needs: [{ kind: 'element', elementType: 'product', required: true }] };
  const ambiguo = core.resolverContexto(await els.mundoDeContextoDeWee(sinSeñal, deps), sinSeñal);
  check('P/§62) dos hamburguesas activas y ninguna señal: AMBIGUO, contra datos reales',
    ambiguo.status === 'ambiguous' && ambiguo.ambiguous[0].candidates.length === 2,
    `${ambiguo.status}`);

  await limpiar(els.COLECCION_DE_ELEMENTOS);
  await limpiar(els.COLECCION_DE_ITEMS_DE_PROYECTO);
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
