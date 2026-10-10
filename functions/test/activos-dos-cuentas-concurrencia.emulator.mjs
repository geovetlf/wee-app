/*
 * A-2 · CONCURRENCIA REAL ENTRE DOS CUENTAS: NINGUNA CUENTA BORRA LO QUE OTRA REFERENCIA.
 *
 * Dos identidades de prueba: ANA (dueña de los objetos) y BETO (la otra cuenta).
 *
 * Esquemas de clave, cada uno con su puerta real:
 *   · `users/<cuenta>/creator-inputs/…` (Weë Storage): creación por `crearMaterialDesdeUrl`, retirada con índice y
 *     reclamación directa.
 *   · `accounts/<cuenta>/assets/<id>/original` (Media Cloud): lo recorre el barrido MC-5, cuya regla de aislamiento exige
 *     esa forma. Sus estados de partida se siembran con la forma que deja el índice.
 *
 * Intercalados: una lectura interceptada dentro de la transacción de la operación probada. En ese punto la transacción
 * ya ha leído lo que decide. Cada intercalado indica en qué lectura ocurre y en qué orden (`intercalar`):
 *   · 'ajena_dentro': la otra parte se completa dentro de la transacción probada, que sigue cuando ella termina. Solo
 *     vale si la otra parte no escribe en un rango que la probada ya ha consultado: el emulador bloquea escrituras en un
 *     rango consultado hasta que la transacción confirma, y esperar dentro sería un interbloqueo. Por eso S3 se intercala
 *     en la lectura de su PROPIA ficha, que es la primera de la retirada, antes de cualquier consulta por rango.
 *   · 'probada_primero': la otra parte se lanza en ese mismo punto, pero espera una promesa que se resuelve cuando la
 *     operación probada ha terminado. El orden queda fijado sin depender del planificador del emulador.
 * Los escenarios que admiten los dos órdenes los prueban los dos, y S3 comprueba que el orden obtenido es el previsto.
 *
 * Escenarios: S1 BETO no registra, retira ni manipula la clave de ANA · S2 retirada de ANA con una fila viva de BETO
 * entre la decisión y la reclamación · S3 retirada de ANA con una creación nueva de ANA · S4 reconciliación de ANA con
 * una creación nueva · S4d reconciliación de BETO con una referencia nueva de ANA · S3b barrido con una creación de ANA
 * sobre el candidato · S5 índice incompleto y registro desactualizado · S7 dos retiradas simultáneas · S8 retirada de BETO
 * con la referencia de ANA viva · S9 la ruta autorizada borra · S10 consumidores caídos · S6 error transitorio y
 * reintentos, con el reloj de la política.
 *
 * Invariantes en cada escenario: no se borra un objeto con una referencia viva de cualquiera de las dos cuentas;
 * ningún error, índice incompleto o estado desconocido autoriza el borrado; los reintentos no duplican ni borran de
 * más; y cuando desaparecen todas las referencias legítimas, la ruta autorizada sí borra.
 *
 * Límites declarados: el emulador no hace cumplir la precondición de generación de Storage (una eliminación con una
 * generación falsa se completa; no se afirma que `ifGenerationMatch` proteja nada); el emulador no aplica índices; las
 * dependencias de producción contestan «no se sabe» y no borran nada (D-G), así que la retirada de estos escenarios usa
 * consumidores de prueba para poder llegar al borrado; y la inyección de una fila de BETO es un estado contradictorio
 * (la creación de BETO sobre la clave de ANA se rechaza), que sirve para la defensa de borrado, no para la creación.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-dos-cuentas-concurrencia.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

const T0 = Date.now();
const reloj = () => `(${((Date.now() - T0) / 1000).toFixed(1)} s)`;

const PROY = proyectoDeEmulador();
const BUCKET = `${PROY}.appspot.com`;
process.env.STORAGE_BUCKET = BUCKET;
const admin = require('firebase-admin');
admin.initializeApp({ projectId: PROY, storageBucket: BUCKET });
const db = admin.firestore();
const bucket = admin.storage().bucket(BUCKET);

const content = lib('content/index.js');
const indice = lib('content/indice.js');
const core = lib('core/index.js');
const barrido = lib('media/barrido.js');
const puertoDeAlmacen = lib('core/media/puerto.js');

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const conTope = (promesa, ms) => Promise.race([promesa, esperar(ms).then(() => ({ tope: true }))]);

const ANA = 'uAnaDos';
const BETO = 'uBetoDos';
const DIA = 24 * 60 * 60 * 1000;
const RUN = Date.now().toString(36);
let seq = 0;
const nuevoAssetId = () => `asset_${(++seq + 0x1000).toString(16).padStart(32, '0')}`;
const urlDe = (key) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(key)}?alt=media&token=tok-${RUN}-${seq}`;
const claveDeUsuario = (cuenta) => `users/${cuenta}/creator-inputs/${RUN}-${++seq}.png`;
const claveDeCuenta = (cuenta, assetId) => `accounts/${cuenta}/assets/${assetId}/original`;

const subir = (key) => bucket.file(key).save(Buffer.from('bytes'), { metadata: { contentType: 'image/png' }, resumable: false });
const existe = async (key) => (await bucket.file(key).exists())[0];
const generacionDe = async (key) => String((await bucket.file(key).getMetadata())[0].generation);

const objRef = (key) => core.referenciaDelObjeto(indice.huellaDelIndice, { provider: 'wee', bucket: BUCKET, objectKey: key });
const rutaRegistro = (key) => `mediaObjects/${objRef(key)}`;
const registroDe = async (key) => (await db.collection('mediaObjects').doc(objRef(key)).get()).data();
const filasDe = async (key) => (await db.collection('mediaObjects').doc(objRef(key)).collection('referencias').get()).docs.map((d) => d.data());
const filasVivasDe = async (key) => (await filasDe(key)).filter((f) => f.viva === true).length;
const fichasVivasConClave = async (key) => (await db.collection('assets').where('storageRef.objectKey', '==', key).get())
  .docs.map((d) => d.data()).filter((f) => f.status !== 'deleted');
const ficha = async (id) => (await db.collection('assets').doc(id).get()).data();

/* Creación real de Weë Storage: la misma puerta que usa la app. */
const creaMaterial = (owner, key) => content.crearMaterialDesdeUrl({
  ownerAccountId: owner, url: urlDe(key), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 },
});

/* Un estado contradictorio que la creación no produce: una fila viva de BETO sobre el registro de ANA. */
const filaVivaDeOtraCuenta = async (owner, key) => {
  const id = nuevoAssetId();
  const refId = `material_${id}_original`;
  await db.collection('mediaObjects').doc(objRef(key)).collection('referencias').doc(refId).set({
    refId, clase: 'material', assetId: id, pieza: 'original', viva: true, ownerAccountId: owner, objectRef: objRef(key),
    desdeAt: Date.now(), actualizadoAt: Date.now(),
  });
  return { id, refId };
};

/* Estado de partida del MC-5: un objeto de cuenta con su ficha (viva o retirada), su fila y su registro. Misma forma que
 * deja el índice; la siembra solo llega a estados que la creación no alcanza sola. */
const sembrarObjetoDeCuenta = async (cuenta, { estado = 'candidato', fichaViva = false, filaViva = false } = {}) => {
  const assetId = nuevoAssetId();
  const key = claveDeCuenta(cuenta, assetId);
  await subir(key);
  const generacion = await generacionDe(key);
  await db.collection('assets').doc(assetId).set({
    assetId, ownerAccountId: cuenta, kind: 'image', status: fichaViva ? 'ready' : 'deleted',
    storageRef: { provider: 'wee', bucket: BUCKET, objectKey: key }, variants: [], mimeType: 'image/png',
    provenance: { createdAt: 1 }, createdAt: Date.now(), updatedAt: Date.now(),
  });
  const objectRef = objRef(key);
  await db.collection('mediaObjects').doc(objectRef).set({
    objectRef, providerId: 'wee', accountId: cuenta, assetId, pieza: 'original', bucket: BUCKET, objectKey: key, estado,
    candidatoDesde: Date.now() - 10 * DIA, createdAt: Date.now() - 30 * DIA, updatedAt: Date.now(), version: 1,
    generacion, cobertura: 'completa', coberturaEn: Date.now(),
  });
  const refId = `material_${assetId}_original`;
  await db.collection('mediaObjects').doc(objectRef).collection('referencias').doc(refId).set({
    refId, clase: 'material', assetId, pieza: 'original', viva: filaViva, ownerAccountId: cuenta, objectRef,
    desdeAt: Date.now(), actualizadoAt: Date.now(),
  });
  return { key, assetId, objectRef };
};

/* ── Intercalado: una lectura interceptada dentro de la transacción de la operación probada ───────────────────────── */
const runTransactionOriginal = db.runTransaction.bind(db);
let armado = null;
const armar = (plan) => {
  armado = { ocurrencia: 1, vistas: 0, disparada: false, topada: false, lanzada: undefined, ...plan };
  return armado;
};
db.runTransaction = (fn, opciones) => {
  const plan = armado;
  if (!plan) return runTransactionOriginal(fn, opciones);
  return runTransactionOriginal(async (tx) => {
    const get = tx.get.bind(tx);
    const envuelto = new Proxy(tx, {
      get(t, p) {
        if (p === 'get') {
          return async (ref) => {
            const foto = await get(ref);
            if (armado === plan && typeof ref?.path === 'string' && plan.coincide(ref.path)) {
              plan.vistas += 1;
              if (plan.vistas === plan.ocurrencia) {
                armado = null;
                plan.disparada = true;
                plan.lanzada = Promise.resolve().then(plan.accion).catch((error) => ({ error }));
                if (plan.modo === 'dentro') {
                  const r = await conTope(plan.lanzada, 8000);
                  if (r && r.tope) plan.topada = true;
                }
              }
            }
            return foto;
          };
        }
        const v = t[p];
        return typeof v === 'function' ? v.bind(t) : v;
      },
    });
    return fn(envuelto);
  }, opciones);
};

/* ── Dependencias: las de producción, y las mismas con consumidores de prueba para poder llegar al borrado ─────────── */
const depsIndice = () => ({
  db,
  huella: indice.huellaDelIndice,
  indexable: content.entraEnElIndice,
  almacenes: { wee: indice.puertoDelStorageDeWee('wee') },
  consumidores: indice.consumidoresDeProduccion,
  operaciones: indice.operacionesDeProduccion,
  ahora: Date.now,
  sortear: () => `r${RUN}${++seq}`,
});
const depsDePrueba = () => ({
  ...depsIndice(),
  consumidores: async () => ({ estado: 'sin_usos' }),
  operaciones: async () => [],
});
const opcionesBarrido = (extra = {}) => ({
  db,
  almacenes: { wee: indice.puertoDelStorageDeWee('wee') },
  consumidores: async () => ({ estado: 'sin_usos' }),
  operaciones: async () => [],
  politica: { ...core.POLITICA_DEL_BARRIDO_DEL_INDICE, graciaDeCandidatoMs: 0 },
  ...extra,
});
const barrer = (extra) => barrido.crearBarridoDeActivos(() => opcionesBarrido(extra)).run({});

/*
 * INTERCALADO CON ORDEN FIJO. La otra parte (`operacionAjena`) entra en el punto que marca `coincide`, dentro de la
 * transacción de la operación probada. Dos órdenes, ambos deterministas y sin esperas por tiempo:
 *   · 'ajena_dentro': la otra parte se completa dentro de la transacción probada, y esta sigue cuando termina. Solo vale
 *     si la otra parte no necesita un rango que la probada ya ha consultado (ver la cabecera).
 *   · 'probada_primero': la otra parte se lanza en ese mismo punto, pero espera a una promesa que se resuelve cuando la
 *     operación probada ha terminado. Así corre después de ella, sin depender del planificador del emulador.
 * Si la operación probada falla, la promesa se resuelve igual (finally) y el error sale tal cual.
 */
const intercalar = async ({ coincide, orden, operacionAjena, operacionProbada }) => {
  let terminaLaProbada;
  const laProbadaTerminada = new Promise((r) => { terminaLaProbada = r; });
  const plan = armar({
    coincide,
    modo: orden === 'ajena_dentro' ? 'dentro' : 'en_paralelo',
    accion: orden === 'ajena_dentro' ? operacionAjena : async () => { await laProbadaTerminada; return operacionAjena(); },
  });
  let resultado;
  try {
    resultado = await operacionProbada();
  } finally {
    terminaLaProbada();
  }
  await conTope(plan.lanzada ?? Promise.resolve(), 15000);
  return { plan, resultado };
};

/* ── Flag: las dos cuentas dentro de la cobertura del índice ─────────────────────────────────────────────────────── */
await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA, BETO], coberturaDesde: 0 });
await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);

/* ═══ S1 · INVARIANTE: BETO NO PUEDE REGISTRAR, RETIRAR NI MANIPULAR LA CLAVE DE ANA ═══════════════════════════════ */
console.log('\n── S1 · Ninguna cuenta registra, retira ni manipula la clave de otra ──', reloj());
{
  const k1 = claveDeUsuario(ANA);
  await subir(k1);
  const f1 = await creaMaterial(ANA, k1);
  check('S1 · la dueña registra su objeto (referencia viva)', f1?.assetId !== undefined && (await filasVivasDe(k1)) === 1);
  const intento = await creaMaterial(BETO, k1);
  check('S1a · BETO no puede registrar una referencia sobre la clave de ANA (creación rechazada)', intento === null);
  const fichasDeBeto = (await fichasVivasConClave(k1)).filter((f) => f.ownerAccountId === BETO).length;
  check('S1b · y no queda ninguna ficha de BETO apuntando a esa clave', fichasDeBeto === 0);
  const retira = await content.retirarMaterial(BETO, f1.assetId);
  check('S1c · BETO no puede retirar el material de ANA', retira.status === 'no_es_tuyo', retira.status);
  const reclama = await indice.reclamarParaBorrar(depsDePrueba(), objRef(k1), BETO, core.POLITICA_DEL_BARRIDO_DEL_INDICE);
  check('S1d · BETO no puede reclamar el objeto de ANA para borrarlo', reclama.reclamado === false && reclama.motivo === 'fuera_de_su_cuenta', reclama.motivo ?? '');
  const variante = await content.anotarVariante(BETO, f1.assetId, { kind: 'thumbnail', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: `users/${BETO}/x/${RUN}` } });
  check('S1e · BETO no puede anotar variantes en el material de ANA', variante === false);
  check('S1f · el material de ANA queda intacto: vivo, su clave en Storage y su registro de ANA', (await ficha(f1.assetId))?.status !== 'deleted' && (await existe(k1)) && (await registroDe(k1))?.accountId === ANA);
}

/* ═══ S2 · RETIRADA DE ANA; BETO REGISTRA UNA FILA VIVA ENTRE LA DECISIÓN Y LA RECLAMACIÓN ══════════════════════════ */
console.log('\n── S2 · Retirada de ANA intercalada con una referencia viva de BETO ──', reloj());
{
  const k2 = claveDeUsuario(ANA);
  await subir(k2);
  const fa = await creaMaterial(ANA, k2);
  /* La segunda lectura del registro es la de la reclamación (MC-5): la primera es la de la propia retirada. */
  const plan = armar({
    coincide: (p) => p === rutaRegistro(k2),
    ocurrencia: 2,
    modo: 'dentro',
    accion: () => filaVivaDeOtraCuenta(BETO, k2),
  });
  const r = await indice.retirarConIndice(depsDePrueba(), ANA, fa.assetId);
  const filaB = plan.lanzada ? await plan.lanzada : undefined;
  check('S2 · la fila viva de BETO entró justo antes de la reclamación de la retirada', plan.disparada === true && plan.topada === false);
  check('S2a · la retirada termina y el material de ANA queda retirado', r.status === 'retirado' && (await ficha(fa.assetId))?.status === 'deleted', r.status);
  check('S2b · el objeto NO se borra mientras BETO conserva su referencia viva', (await existe(k2)) && r.objetosBorrados === 0);
  check('S2c · la fila viva de BETO sigue viva en el registro', filaB?.id !== undefined && (await filasVivasDe(k2)) === 1);
  const recl = await indice.completarBorrado(depsDePrueba(), objRef(k2), ANA, core.POLITICA_DEL_BARRIDO_DEL_INDICE);
  check('S2d · una reclamación posterior tampoco lo borra', (await existe(k2)) && recl.estado === 'protegido', recl.estado ?? '');
}

/* ═══ S3 · RETIRADA DE ANA Y UNA CREACIÓN NUEVA DE ANA SOBRE EL MISMO OBJETO: LOS ÓRDENES POSIBLES SON SEGUROS ════════ */
console.log('\n── S3 · Retirada intercalada con una creación nueva de la misma cuenta ──', reloj());
{
  const escenarioS3 = async (orden) => {
    const k3 = claveDeUsuario(ANA);
    await subir(k3);
    const fa = await creaMaterial(ANA, k3);
    let fa2;
    /* La primera lectura de la retirada es su propia ficha, antes de cualquier consulta por rango: por ahí la creación
     * entra sin chocar con un bloqueo. Con la otra parte dentro, la nueva referencia existe ANTES de que la retirada mire
     * las vivas; con la probada primero, la creación llega a un objeto ya retirado y se rechaza. */
    const { plan, resultado: r } = await intercalar({
      coincide: (p) => p === `assets/${fa.assetId}`,
      orden,
      operacionAjena: async () => { fa2 = await creaMaterial(ANA, k3); return fa2; },
      operacionProbada: () => indice.retirarConIndice(depsDePrueba(), ANA, fa.assetId),
    });
    const viva2 = fa2?.assetId !== undefined && (await ficha(fa2.assetId))?.status !== 'deleted';
    const borrado3 = !(await existe(k3));
    check(`S3 [${orden}] · la creación de ANA se lanzó en medio de la retirada`, plan.disparada === true && plan.topada === false);
    check(`S3 [${orden}] · el orden es el previsto (${orden === 'ajena_dentro' ? 'la referencia nueva antes de la retirada' : 'la creación llega después y se rechaza'})`, orden === 'ajena_dentro' ? (viva2 && !borrado3) : (borrado3 && !viva2), `${borrado3 ? 'objeto retirado' : 'objeto conservado'} · ${viva2 ? 'referencia nueva viva' : 'referencia nueva no viva'}`);
    check(`S3a [${orden}] · la retirada no deja borrado un objeto que una referencia viva usa`, !(borrado3 && viva2));
    check(`S3b [${orden}] · si la referencia nueva queda viva, el objeto existe y el registro no está borrado`, !viva2 || ((await existe(k3)) && (await registroDe(k3))?.estado !== 'borrado'));
    check(`S3c [${orden}] · la retirada termina con un estado coherente`, r.status === 'retirado', r.status);
  };
  await escenarioS3('ajena_dentro');
  await escenarioS3('probada_primero');
}

/* ═══ S4 · RECONCILIACIÓN DE ANA CON UNA CREACIÓN NUEVA; RECONCILIACIÓN DE BETO NO TOCA LO AJENO ═══════════════════ */
console.log('\n── S4 · Reconciliación intercalada con una referencia nueva ──', reloj());
{
  const escenarioS4 = async (orden) => {
    const k4 = claveDeUsuario(ANA);
    await subir(k4);
    const fa = await creaMaterial(ANA, k4);
    let fa4;
    const { plan } = await intercalar({
      coincide: (p) => p === rutaRegistro(k4),
      orden,
      operacionAjena: async () => { fa4 = await creaMaterial(ANA, k4); return fa4; },
      operacionProbada: () => indice.reconciliarIndiceDeCuentaEnFirestore(depsIndice(), ANA),
    });
    check(`S4 [${orden}] · la creación de ANA se lanzó durante la reconciliación`, plan.disparada === true && plan.topada === false);
    check(`S4a [${orden}] · la reconciliación de ANA no clasifica como huérfano un objeto con referencias vivas`, (await registroDe(k4))?.estado !== 'borrado' && (await existe(k4)));
    const antes = JSON.stringify(await registroDe(k4));
    await indice.reconciliarIndiceDeCuentaEnFirestore(depsIndice(), BETO);
    check(`S4b [${orden}] · la reconciliación de BETO no toca el registro ni la clave de ANA`, JSON.stringify(await registroDe(k4)) === antes && (await existe(k4)));
    check(`S4c [${orden}] · las referencias de ANA siguen vivas`, (await ficha(fa.assetId))?.status !== 'deleted' && fa4?.assetId !== undefined && (await ficha(fa4.assetId))?.status !== 'deleted');
  };
  await escenarioS4('ajena_dentro');
  await escenarioS4('probada_primero');
}

/* ═══ S4d · RECONCILIACIÓN DE BETO INTERCALADA CON UNA REFERENCIA NUEVA DE ANA: NINGÚN HUÉRFANO FALSO ════════════════ */
console.log('\n── S4d · Reconciliación de BETO intercalada con una referencia nueva de ANA ──', reloj());
{
  const escenarioS4d = async (orden) => {
    const kA4 = claveDeUsuario(ANA);
    const kB4 = claveDeUsuario(BETO);
    await subir(kA4);
    await subir(kB4);
    const fA4 = await creaMaterial(ANA, kA4);
    const fB4 = await creaMaterial(BETO, kB4);
    let fA4b;
    /* Mientras la reconciliación de BETO lee su propio registro, ANA crea una segunda referencia viva sobre SU objeto. */
    const { plan } = await intercalar({
      coincide: (p) => p === rutaRegistro(kB4),
      orden,
      operacionAjena: async () => { fA4b = await creaMaterial(ANA, kA4); return fA4b; },
      operacionProbada: () => indice.reconciliarIndiceDeCuentaEnFirestore(depsIndice(), BETO),
    });
    check(`S4d [${orden}] · la referencia de ANA se lanzó durante la reconciliación de BETO`, plan.disparada === true && plan.topada === false);
    check(`S4d [${orden}] · la reconciliación de BETO no clasifica como huérfano el objeto de ANA`, (await existe(kA4)) && (await registroDe(kA4))?.estado !== 'borrado' && (await filasVivasDe(kA4)) >= 1);
    check(`S4d [${orden}] · las referencias vivas de ANA siguen vivas`, (await ficha(fA4.assetId))?.status !== 'deleted' && (fA4b === undefined || (await ficha(fA4b.assetId))?.status !== 'deleted'));
    check(`S4d [${orden}] · y la referencia viva de BETO sigue viva, con su objeto`, (await existe(kB4)) && (await ficha(fB4.assetId))?.status !== 'deleted' && (await filasVivasDe(kB4)) === 1);
  };
  await escenarioS4d('ajena_dentro');
  await escenarioS4d('probada_primero');
}

/* ═══ S3b · BARRIDO MC-5 FRENTE A UNA CREACIÓN DE ANA SOBRE UN CANDIDATO ═════════════════════════════════════════ */
console.log('\n── S3b · Barrido intercalado con una creación de ANA sobre el candidato ──', reloj());
{
  const c = await sembrarObjetoDeCuenta(ANA, { estado: 'candidato', fichaViva: false, filaViva: false });
  let rechazo;
  const plan = armar({
    coincide: (p) => p === rutaRegistro(c.key),
    modo: 'dentro',
    accion: async () => {
      const id = nuevoAssetId();
      const doc = {
        assetId: id, ownerAccountId: ANA, kind: 'image', status: 'uploading', storageRef: { provider: 'wee', bucket: BUCKET, objectKey: c.key },
        mimeType: 'image/png', provenance: { createdAt: 1 }, createdAt: Date.now(), updatedAt: Date.now(),
      };
      rechazo = await indice.crearFichaConIndice(depsDePrueba(), doc, { soloSiNoExiste: true, sinRegistro: true });
      return rechazo;
    },
  });
  await barrer();
  await conTope(plan.lanzada ?? Promise.resolve(), 15000);
  check('S3b · la lectura del barrido se intercaló con la creación de ANA', plan.disparada === true && plan.topada === false);
  check('S3b · una creación sobre un candidato que se retira queda rechazada', rechazo?.status === 'rechazada', rechazo?.status ?? '');
  check('S3b · sin referencia viva, el barrido borra el objeto candidato', !(await existe(c.key)) && (await filasVivasDe(c.key)) === 0 && (await fichasVivasConClave(c.key)).length === 0);
}

/* ═══ S5 · BARRIDO MC-5: ÍNDICE INCOMPLETO Y REGISTRO DESACTUALIZADO SON INCERTIDUMBRE, NUNCA AUSENCIA ════════════════ */
console.log('\n── S5 · Barrido con índice incompleto, registro desactualizado y referencia ajena ──', reloj());
{
  const a = await sembrarObjetoDeCuenta(ANA, { estado: 'candidato', fichaViva: true, filaViva: false });
  await barrer();
  check('S5a · índice incompleto: la ficha viva de ANA sigue protegiendo el objeto', await existe(a.key) && (await ficha(a.assetId))?.status === 'ready');
  check('S5a · el registro no pasa a borrando ni a borrado', ['candidato', 'guardado'].includes((await registroDe(a.key))?.estado), (await registroDe(a.key))?.estado);
  const b = await sembrarObjetoDeCuenta(ANA, { estado: 'candidato', fichaViva: true, filaViva: true });
  await barrer();
  check('S5b · registro candidato con fila viva: el barrido no borra', await existe(b.key) && (await filasVivasDe(b.key)) === 1);
  const c = await sembrarObjetoDeCuenta(ANA, { estado: 'candidato', fichaViva: false, filaViva: false });
  await filaVivaDeOtraCuenta(BETO, c.key);
  await barrer();
  check('S5c · una referencia viva de BETO protege el objeto candidato de ANA', await existe(c.key));
}

/* ═══ S7 · DOS RETIRADAS SIMULTÁNEAS DE LA ÚNICA REFERENCIA DE ANA ═══════════════════════════════════════════════ */
console.log('\n── S7 · Dos retiradas simultáneas de la única referencia de ANA ──', reloj());
{
  const k7 = claveDeUsuario(ANA);
  await subir(k7);
  const f7 = await creaMaterial(ANA, k7);
  const [r1, r2] = await Promise.all([indice.retirarConIndice(depsDePrueba(), ANA, f7.assetId), indice.retirarConIndice(depsDePrueba(), ANA, f7.assetId)]);
  const estados = [r1.status, r2.status].sort();
  check('S7a · dos retiradas a la vez: una retira y la otra lo ve ya retirado', JSON.stringify(estados) === JSON.stringify(['retirado', 'ya_retirado']), estados.join(' / '));
  check('S7b · el objeto único se borra una sola vez y el registro queda borrado', !(await existe(k7)) && (await registroDe(k7))?.estado === 'borrado');
}

/* ═══ S8 · RETIRADA DE BETO MIENTRAS ANA CONSERVA SU REFERENCIA VIVA: BETO SOLO TOCA LO SUYO ════════════════════════ */
console.log('\n── S8 · Retirada de BETO mientras ANA conserva su referencia viva ──', reloj());
{
  const escenarioS8 = async (orden) => {
    const kA8 = claveDeUsuario(ANA);
    const kB8 = claveDeUsuario(BETO);
    await subir(kA8);
    await subir(kB8);
    const fA8 = await creaMaterial(ANA, kA8);
    const fB8 = await creaMaterial(BETO, kB8);
    let fA8b;
    /* Mientras la retirada de BETO lee su propio registro, ANA crea una segunda referencia viva sobre SU objeto. */
    const { plan, resultado: r } = await intercalar({
      coincide: (p) => p === rutaRegistro(kB8),
      orden,
      operacionAjena: async () => { fA8b = await creaMaterial(ANA, kA8); return fA8b; },
      operacionProbada: () => indice.retirarConIndice(depsDePrueba(), BETO, fB8.assetId),
    });
    check(`S8 [${orden}] · la referencia de ANA se lanzó durante la retirada de BETO`, plan.disparada === true && plan.topada === false);
    check(`S8a [${orden}] · la retirada de BETO termina y su material queda retirado`, r.status === 'retirado' && (await ficha(fB8.assetId))?.status === 'deleted', r.status);
    check(`S8b [${orden}] · el objeto de BETO se borra: ninguna referencia viva lo sostiene`, !(await existe(kB8)) && (await registroDe(kB8))?.estado === 'borrado');
    check(`S8c [${orden}] · el objeto de ANA sigue en Storage, con sus referencias vivas`, (await existe(kA8)) && (await filasVivasDe(kA8)) >= 1 && (await ficha(fA8.assetId))?.status !== 'deleted');
    check(`S8d [${orden}] · el registro de ANA no pasa a borrado`, (await registroDe(kA8))?.estado !== 'borrado');
  };
  await escenarioS8('ajena_dentro');
  await escenarioS8('probada_primero');
}

/* ═══ S9 · LA RUTA AUTORIZADA SIGUE CUANDO DESAPARECEN LAS REFERENCIAS ═══════════════════════════════════════════ */
console.log('\n── S9 · Sin otras referencias, la retirada autorizada borra y no se repite ──', reloj());
{
  const k9 = claveDeUsuario(ANA);
  await subir(k9);
  const f9 = await creaMaterial(ANA, k9);
  const r = await indice.retirarConIndice(depsDePrueba(), ANA, f9.assetId);
  check('S9a · sin otras referencias, la retirada autorizada borra el objeto', r.status === 'retirado' && !(await existe(k9)), r.status);
  check('S9b · el registro queda borrado y la ficha, retirada', (await registroDe(k9))?.estado === 'borrado' && (await ficha(f9.assetId))?.status === 'deleted');
  const otra = await indice.completarBorrado(depsDePrueba(), objRef(k9), ANA, core.POLITICA_DEL_BARRIDO_DEL_INDICE);
  check('S9c · una reclamación posterior no encuentra nada que borrar', ['ya_no_estaba', 'protegido'].includes(otra.estado), otra.estado);
}

/* ═══ S10 · ERRORES E INCERTIDUMBRE: CONSUMIDORES CAÍDOS NO AUTORIZAN EL BORRADO ════════════════════════════════ */
console.log('\n── S10 · Consumidores que no contestan: se protege, y el borrado llega después ──', reloj());
{
  const u = await sembrarObjetoDeCuenta(ANA, { estado: 'candidato', fichaViva: false, filaViva: false });
  await barrer({ consumidores: async () => { throw new Error('los consumidores no contestan'); } });
  check('S10a · consumidores caídos: el objeto se conserva (incertidumbre, no ausencia de usos)', await existe(u.key));
  await barrer();
  check('S10b · cuando contestan y no hay referencias, el borrado autorizado llega', !(await existe(u.key)) && (await registroDe(u.key))?.estado === 'borrado');
}

/* ═══ S6 · ERROR TRANSITORIO DEL ALMACÉN Y REINTENTOS: NO SE DUPLICA NI SE BORRA DE MÁS ═════════════════════════════ */
console.log('\n── S6 · Error transitorio del almacén y reintentos ──', reloj());
{
  /*
   * LA ESPERA ENTRE INTENTOS ES DE LA POLÍTICA. Un fallo del proveedor deja el objeto como candidato con su intento
   * anotado, y el barrido no lo vuelve a intentar hasta `esperaEntreIntentosMs` (decisión `esperando_reintento`): un
   * reintento inmediato no debe borrar, y el legítimo llega cuando el reloj ha pasado esa espera. El reloj se adelanta
   * sin dormir nada: el índice y el barrido lo leen en lugar de `Date.now`, y la ficha guarda la hora del intento con
   * ese mismo reloj, así que la espera se mide sobre la política real.
   */
  let tiempo = Date.now();
  const ahoraDePrueba = () => tiempo;
  const espera = core.POLITICA_DEL_BARRIDO_DEL_INDICE.recoleccion.esperaEntreIntentosMs;
  const s = await sembrarObjetoDeCuenta(ANA, { estado: 'candidato', fichaViva: false, filaViva: false });
  const estadoDeS = async () => (await registroDe(s.key))?.estado;
  const intentosDeS = async () => (await registroDe(s.key))?.intentosDeBorrado;
  /* El mismo veredicto que el barrido aplica a un candidato (`vistaParaElBarrido` + `decidirRecoleccion`), para nombrar el motivo. */
  const veredictoDeS = async () => lib('core/media/recoleccion.js').decidirRecoleccion({
    objeto: { ...(await registroDe(s.key)), estado: 'guardado' }, referencias: [], operaciones: [], referenciasCompletas: true,
  }, core.POLITICA_DEL_BARRIDO_DEL_INDICE.recoleccion, tiempo);
  const real = indice.puertoDelStorageDeWee('wee');
  let pendientes = 1;
  const llamadas = [];
  const inestable = { ...real, borrar: async (ref, opciones) => {
    if (ref.objectKey !== s.key) return real.borrar(ref, opciones);
    llamadas.push(ref.objectKey);
    /* Un fallo transitorio del puerto se devuelve como resultado (contrato del puerto), no como excepción. */
    if (pendientes-- > 0) return { ok: false, error: puertoDeAlmacen.falloDeAlmacen('wee', 'proveedor_no_disponible') };
    return real.borrar(ref, opciones);
  } };

  await barrer({ almacenes: { wee: inestable }, ahora: ahoraDePrueba });
  check('S6a · error transitorio: el objeto sigue en Storage', await existe(s.key));
  check('S6b · el registro vuelve a candidato, anota un intento y no se queda atascado en borrando', (await estadoDeS()) === 'candidato' && (await intentosDeS()) === 1, `${await estadoDeS()} · intentos=${await intentosDeS()}`);

  tiempo += 60 * 1000;
  await barrer({ almacenes: { wee: inestable }, ahora: ahoraDePrueba });
  check('S6c · un reintento antes de la espera no borra ni suma otro intento', await existe(s.key) && llamadas.length === 1 && (await estadoDeS()) === 'candidato' && (await intentosDeS()) === 1, `llamadas=${llamadas.length}`);
  check('S6c · y su motivo es la espera de la política', (await veredictoDeS()).motivo === 'esperando_reintento', String((await veredictoDeS()).motivo ?? (await veredictoDeS()).accion));

  tiempo += espera;
  check('S6d · pasada la espera, la política ya autoriza el borrado', (await veredictoDeS()).accion === 'borrar', (await veredictoDeS()).accion);
  await barrer({ almacenes: { wee: inestable }, ahora: ahoraDePrueba });
  check('S6d · el reintento borra el objeto, una sola vez más', !(await existe(s.key)) && llamadas.length === 2, `llamadas=${llamadas.length}`);
  check('S6d · y el registro queda borrado', (await estadoDeS()) === 'borrado', await estadoDeS());

  tiempo += espera;
  await barrer({ almacenes: { wee: inestable }, ahora: ahoraDePrueba });
  check('S6e · un barrido posterior no repite el borrado ni falla', !(await existe(s.key)) && (await estadoDeS()) === 'borrado' && llamadas.length === 2, `llamadas=${llamadas.length}`);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`, reloj());
process.exit(fallos ? 1 : 0);
