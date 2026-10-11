/*
 * MC-9 · VERIFICACIÓN INDEPENDIENTE DE LA RECONCILIACIÓN DEL ÍNDICE (cierre técnico de almacenamiento, trabajo B).
 *
 * La reconciliación (`reconciliarIndiceDeCuentaEnFirestore`, sobre la decisión pura `reconciliarIndiceDeCuenta`) lee las
 * fichas, los registros, las filas y el almacén de UNA cuenta, decide, y repara lo que puede repararse SIN borrar nada.
 * Esta suite no la da por buena por existir: comprueba los doce casos del encargo, con el emulador y fallos inyectados en
 * la frontera (lectura de filas, consulta de claves ajenas, puerto del almacén, escritura de reparación).
 *
 *   M1  referencia presente e índice correcto            → ningún hallazgo sobre el objeto
 *   M2  referencia presente con fila ausente              → fila creada (fila_ausente)
 *   M3  fila huérfana (retirada interrumpida, D-B)        → fila apagada; el objeto queda candidato; los bytes NO se tocan
 *   M4  referencias de dos cuentas sobre un objeto        → la marca de ajeno se anota; la fila de la otra cuenta no se toca
 *   M5  índice incompleto (listado truncado)              → sin candidatos ni cobertura; el objeto sigue guardado
 *   M6  error al leer el almacén o las claves ajenas      → incertidumbre: el objeto no se clasifica como huérfano
 *   M7  estado `borrando` con una referencia nueva        → estado_imposible: se marca; el estado y la concesión no cambian
 *   M8  pasadas repetidas                                 → la segunda pasada no repara nada
 *   M9  dos reconciliaciones concurrentes                 → una sola fila viva; sin errores de reparación
 *   M10 decisión sobre una lectura anterior               → la reparación revalida dentro de su transacción y no marca
 *   M11 claves users/ y rutas especiales                  → se reparan las de la cuenta; una clave ajena no se toca
 *   M12 fallo parcial y reanudación                       → el fallo queda contado; la siguiente pasada lo completa
 *
 * Límite declarado: el emulador de Storage no hace cumplir `ifGenerationMatch`, y no se afirma nada sobre precondiciones
 * de generación en esta suite. Ninguna pasada de reconciliación borra bytes: eso se comprueba al final de cada caso.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-mc9-verificacion.emulator.mjs"
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

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const ANA = 'uAnaMc9';
const BETO = 'uBetoMc9';
const RUN = Date.now().toString(36);
const DIA = 24 * 60 * 60 * 1000;
const AHORA = Date.now();
let k = 0;
const hex = () => (++k + 0x3000).toString(16).padStart(32, '0');
let kc = 0;
const clave = (cuenta, sufijo = '') => `users/${cuenta}/mc9/${RUN}-${++kc}${sufijo}.png`;

const refWee = (c) => ({ provider: 'wee', bucket: BUCKET, objectKey: c });
const objRef = (c) => core.referenciaDelObjeto(indice.huellaDelIndice, refWee(c));
const regRef = (c) => db.collection('mediaObjects').doc(objRef(c));
const registro = async (c) => (await regRef(c).get()).data();
const filasDe = async (c) => (await regRef(c).collection('referencias').get()).docs.map((d) => d.data());
const vivasDe = async (c) => (await filasDe(c)).filter((f) => f.viva === true);
const existe = async (c) => (await bucket.file(c).exists())[0];
const subir = async (c) => {
  await bucket.file(c).save(Buffer.from('x'), { metadata: { contentType: 'image/png' }, resumable: false });
  return String((await bucket.file(c).getMetadata())[0].generation);
};

const fichaDe = (cuenta, c, extra = {}) => {
  const assetId = extra.assetId ?? `asset_${hex()}`;
  return {
    assetId, ownerAccountId: cuenta, status: 'ready', kind: 'image', storageRef: refWee(c),
    provenance: { createdAt: 1 }, contract: '1.0', createdAt: AHORA, updatedAt: AHORA, ...extra,
  };
};
const filaDe = (cuenta, c, assetId, extra = {}) => ({
  refId: `material_${assetId}_original`, clase: 'material', assetId, pieza: 'original', viva: extra.viva ?? true,
  ownerAccountId: extra.owner ?? cuenta, objectRef: objRef(c), desdeAt: AHORA, actualizadoAt: AHORA,
});
/* Un registro sano: guardado, con cobertura vigente y creado hace un mes (edad cumplida para ser huérfano si nadie lo usa). */
const registroDe = (cuenta, c, generacion, extra = {}) => ({
  objectRef: objRef(c), providerId: 'wee', accountId: cuenta, pieza: 'original', bucket: BUCKET, objectKey: c,
  estado: 'guardado', createdAt: AHORA - 30 * DIA, updatedAt: AHORA, version: 0, cobertura: 'completa', coberturaEn: Date.now(),
  ...(generacion ? { generacion } : {}), ...extra,
});

/* Un objeto completo: bytes, ficha viva, fila viva y registro sano. */
const objetoSano = async (cuenta, c) => {
  const generacion = await subir(c);
  const f = fichaDe(cuenta, c);
  await db.collection('assets').doc(f.assetId).set(f);
  await regRef(c).collection('referencias').doc(`material_${f.assetId}_original`).set(filaDe(cuenta, c, f.assetId));
  await regRef(c).set(registroDe(cuenta, c, generacion, { assetId: f.assetId }));
  return { c, assetId: f.assetId, generacion };
};

/* Las dependencias del índice para la reconciliación. El almacén se puede sustituir para inyectar fallos. */
const depsRec = (extra = {}) => ({
  db,
  huella: indice.huellaDelIndice,
  indexable: content.entraEnElIndice,
  almacenes: { wee: indice.puertoDelStorageDeWee('wee') },
  consumidores: async () => ({ estado: 'sin_usos' }),
  operaciones: async () => [],
  ahora: Date.now,
  sortear: () => `x${RUN}${++k}`,
  ...extra,
});
const pasada = (cuenta, { deps = {}, opciones = {} } = {}) => indice.reconciliarIndiceDeCuentaEnFirestore(
  depsRec(deps), cuenta, { graciaDeHuerfanoMs: 0, ...opciones },
);
const hallazgosDe = (informe, c) => (informe?.hallazgos ?? []).filter((h) => h.objectRef === objRef(c));

/* ── Inyección en la frontera ───────────────────────────────────────────────────────────────────────────────────── */
const inyeccion = { fallaConsultaDeClaves: false, fallaEscrituraDeFila: null };

/* La consulta de fichas por clave (`storageRef.objectKey`) puede fallar: el objeto no se puede clasificar como ajeno-libre. */
const colOriginal = db.collection.bind(db);
db.collection = (nombre) => {
  const col = colOriginal(nombre);
  if (nombre !== 'assets' || !inyeccion.fallaConsultaDeClaves) return col;
  return new Proxy(col, {
    get(t, p) {
      if (p !== 'where') {
        const v = t[p];
        return typeof v === 'function' ? v.bind(t) : v;
      }
      return (campo, ...resto) => {
        if (campo !== 'storageRef.objectKey') return t.where(campo, ...resto);
        return { limit: () => ({ get: () => Promise.reject(new Error('consulta de claves fallida (simulada)')) }) };
      };
    },
  });
};

/* Una escritura de fila puede fallar a mitad de una reparación (la transacción aborta y el error queda contado). */
const runTransactionOriginal = db.runTransaction.bind(db);
db.runTransaction = (fn, opciones) => runTransactionOriginal((tx) => fn(new Proxy(tx, {
  get(t, p) {
    if (p === 'set') {
      return (ref, data, opts) => {
        if (inyeccion.fallaEscrituraDeFila && ref?.path === inyeccion.fallaEscrituraDeFila) {
          inyeccion.fallaEscrituraDeFila = null;
          throw new Error('escritura de fila fallida (simulada)');
        }
        return t.set(ref, data, opts);
      };
    }
    const v = t[p];
    return typeof v === 'function' ? v.bind(t) : v;
  },
})), opciones);

/* ── Flag: las dos cuentas dentro de la cobertura del índice ───────────────────────────────────────────────────── */
await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA, BETO], coberturaDesde: 0 });
await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);

/* ═══ M1 · REFERENCIA PRESENTE E ÍNDICE CORRECTO ═══════════════════════════════════════════════════════════════════ */
console.log('\n── M1 · Referencia presente e índice correcto ──', reloj());
const m1 = await objetoSano(ANA, clave(ANA));
const i1 = await pasada(ANA);
check('M1 un objeto con su ficha, su fila y su registro sanos no tiene ningún hallazgo', hallazgosDe(i1, m1.c).length === 0,
  JSON.stringify(hallazgosDe(i1, m1.c).map((h) => h.clase)));

/* ═══ M2 · REFERENCIA PRESENTE CON FILA AUSENTE ════════════════════════════════════════════════════════════════════ */
console.log('\n── M2 · Referencia presente con fila de índice ausente ──', reloj());
const c2 = clave(ANA);
const g2 = await subir(c2);
const f2 = fichaDe(ANA, c2);
await db.collection('assets').doc(f2.assetId).set(f2);
await regRef(c2).set(registroDe(ANA, c2, g2, { assetId: f2.assetId }));
const i2 = await pasada(ANA);
check('M2 la fila ausente se detecta como fila_ausente', hallazgosDe(i2, c2).some((h) => h.clase === 'fila_ausente'));
const v2 = await vivasDe(c2);
check('M2 y se repara: queda exactamente una fila viva, y los bytes siguen', v2.length === 1 && v2[0].assetId === f2.assetId && (await existe(c2)));

/* ═══ M3 · FILA HUÉRFANA: RETIRADA INTERRUMPIDA (D-B) ═════════════════════════════════════════════════════════ */
console.log('\n── M3 · Fila huérfana por retirada interrumpida (D-B) ──', reloj());
const m3 = await objetoSano(ANA, clave(ANA));
await db.collection('assets').doc(m3.assetId).set({ status: 'deleted', deletedAt: AHORA }, { merge: true });
const i3 = await pasada(ANA);
check('M3 la fila de una ficha retirada se detecta como fila_huerfana', hallazgosDe(i3, m3.c).some((h) => h.clase === 'fila_huerfana'));
check('M3 la fila se apaga y el objeto queda candidato, sin tocar los bytes', (await vivasDe(m3.c)).length === 0 && (await registro(m3.c))?.estado === 'candidato' && (await existe(m3.c)));

/* ═══ M4 · REFERENCIAS DE DOS CUENTAS SOBRE UN OBJETO ═════════════════════════════════════════════════════════ */
console.log('\n── M4 · Referencias de dos cuentas sobre un objeto ──', reloj());
const m4 = await objetoSano(ANA, clave(ANA));
const assetBeto = `asset_${hex()}`;
const filaBeto = `material_${assetBeto}_original`;
await regRef(m4.c).collection('referencias').doc(filaBeto).set({
  refId: filaBeto, clase: 'material', assetId: assetBeto, pieza: 'original', viva: true, ownerAccountId: BETO,
  objectRef: objRef(m4.c), desdeAt: AHORA, actualizadoAt: AHORA,
});
const i4a = await pasada(ANA);
const registroAntesBeto = JSON.stringify(await registro(m4.c));
check('M4 la referencia viva de otra cuenta se anota como de_otra_cuenta', hallazgosDe(i4a, m4.c).some((h) => h.clase === 'de_otra_cuenta'));
check('M4 y la fila de la otra cuenta NO se toca (sigue viva, con su dueña)', (await vivasDe(m4.c)).some((f) => f.refId === filaBeto && f.ownerAccountId === BETO));
const i4b = await pasada(BETO);
check('M4 la pasada de la otra cuenta no escribe nada sobre un registro que no es suyo', JSON.stringify(await registro(m4.c)) === registroAntesBeto,
  `reparadas=${JSON.stringify(i4b?.reparadas ?? {})}`);
check('M4 el objeto con uso ajeno sigue en Storage y su registro no pasa a candidato', (await existe(m4.c)) && (await registro(m4.c))?.estado === 'guardado');

/* ═══ M5 · ÍNDICE INCOMPLETO: NI CANDIDATOS NI COBERTURA ══════════════════════════════════════════════════════ */
console.log('\n── M5 · Índice incompleto (listado truncado) ──', reloj());
const c5 = clave(ANA);
await subir(c5);
await regRef(c5).set(registroDe(ANA, c5, undefined));
await objetoSano(ANA, clave(ANA));
/* Control, solo informe: con el listado COMPLETO el huérfano se ve y se propone. Sin esto, «no se propone» podría ser vacío. */
const ctrl5 = await pasada(ANA, { opciones: { reparar: false } });
check('M5 control: con el listado completo, el huérfano se ve y se propone', hallazgosDe(ctrl5, c5).some((h) => h.clase === 'objeto_huerfano'),
  JSON.stringify(hallazgosDe(ctrl5, c5).map((h) => h.clase)));
const i5 = await pasada(ANA, { opciones: { porPagina: 1, maxPaginas: 1 } });
check('M5 con el listado truncado, la pasada declara que no está completa', i5?.completo === false, `completo=${i5?.completo}`);
check('M5 y el huérfano no se propone como candidato ni se marca cobertura', !hallazgosDe(i5, c5).some((h) => h.clase === 'objeto_huerfano')
  && (await registro(c5))?.estado === 'guardado' && (i5?.coberturasMarcadas ?? 0) === 0,
  `estado=${(await registro(c5))?.estado} · coberturas=${i5?.coberturasMarcadas}`);
check('M5 los bytes siguen en Storage', await existe(c5));

/* ═══ M6 · ERROR AL LEER EL ALMACÉN O LAS CLAVES AJENAS: INCERTIDUMBRE ═════════════════════════════════════════ */
console.log('\n── M6 · Error transitorio al leer el almacén y al consultar claves ajenas ──', reloj());
const m6a = await objetoSano(ANA, clave(ANA));
const puertoRoto = { ...indice.puertoDelStorageDeWee('wee'), mirar: async () => ({ ok: false, motivo: 'fallo' }) };
const i6a = await pasada(ANA, { deps: { almacenes: { wee: puertoRoto } } });
const fichaM6a = (await db.collection('assets').doc(m6a.assetId).get()).data();
check('M6a un almacén que no responde no se toma por ausencia: ni ficha_sin_bytes ni fila_ausente con «sin bytes»',
  !hallazgosDe(i6a, m6a.c).some((h) => h.clase === 'ficha_sin_bytes' || h.reparacion === 'marcar_ficha') && fichaM6a?.indiceDatosIncompletos !== true,
  JSON.stringify(hallazgosDe(i6a, m6a.c).map((h) => h.clase)));
check('M6a y los bytes y el registro siguen como estaban', (await existe(m6a.c)) && (await registro(m6a.c))?.estado === 'guardado');
const c6a = m6a.c;
const c6b = clave(ANA);
await subir(c6b);
await regRef(c6b).set(registroDe(ANA, c6b, undefined));
/* Control: sin el fallo, el mismo objeto sí se propone como huérfano (así el caso prueba la incertidumbre, no la vista). */
const ctrl6b = await pasada(ANA, { opciones: { reparar: false } });
check('M6b control: sin el fallo, el huérfano se ve y se propone', hallazgosDe(ctrl6b, c6b).some((h) => h.clase === 'objeto_huerfano'));
inyeccion.fallaConsultaDeClaves = true;
const i6b = await pasada(ANA);
inyeccion.fallaConsultaDeClaves = false;
check('M6b una consulta de claves ajenas fallida deja el objeto sin clasificar: sigue guardado', (await registro(c6b))?.estado === 'guardado' && (await existe(c6b)),
  `estado=${(await registro(c6b))?.estado}`);
check('M6 ni el fallo ni la incertidumbre llegan a borrar nada', (await existe(c6a)) && (await existe(c6b)));

/* ═══ M7 · ESTADO `BORRANDO` CON UNA REFERENCIA NUEVA ═════════════════════════════════════════════════════════ */
console.log('\n── M7 · Estado borrando con una referencia nueva ──', reloj());
const c7 = clave(ANA);
const g7 = await subir(c7);
const f7 = fichaDe(ANA, c7);
await db.collection('assets').doc(f7.assetId).set(f7);
await regRef(c7).collection('referencias').doc(`material_${f7.assetId}_original`).set(filaDe(ANA, c7, f7.assetId));
await regRef(c7).set(registroDe(ANA, c7, g7, { estado: 'borrando', concesion: { id: 'concesion-m7', hasta: Date.now() + 60_000 } }));
const i7 = await pasada(ANA);
check('M7 un uso vivo sobre un objeto en borrando se anota como estado_imposible', hallazgosDe(i7, c7).some((h) => h.clase === 'estado_imposible'));
const r7 = await registro(c7);
check('M7 se marca, sin cambiar el estado ni la concesión, y los bytes siguen', (r7?.marcas ?? []).includes('estado_imposible') && r7?.estado === 'borrando'
  && r7?.concesion?.id === 'concesion-m7' && (await existe(c7)), `estado=${r7?.estado} · marcas=${JSON.stringify(r7?.marcas)}`);

/* ═══ M8 · PASADAS REPETIDAS ═══════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── M8 · Pasadas repetidas ──', reloj());
await pasada(ANA);
const i8 = await pasada(ANA);
check('M8 la segunda pasada no repara ni marca nada nuevo', Object.keys(i8?.reparadas ?? {}).length === 0 && (i8?.coberturasMarcadas ?? 0) === 0,
  JSON.stringify(i8?.reparadas ?? {}));
check('M8 y la fila del caso M2 sigue siendo única', (await vivasDe(c2)).length === 1);

/* ═══ M9 · DOS RECONCILIACIONES CONCURRENTES ═══════════════════════════════════════════════════════════════════ */
console.log('\n── M9 · Dos reconciliaciones concurrentes ──', reloj());
const c9 = clave(ANA);
const g9 = await subir(c9);
const f9 = fichaDe(ANA, c9);
await db.collection('assets').doc(f9.assetId).set(f9);
await regRef(c9).set(registroDe(ANA, c9, g9, { assetId: f9.assetId }));
const [p9a, p9b] = await Promise.all([pasada(ANA), pasada(ANA)]);
const v9 = await vivasDe(c9);
check('M9 dos pasadas a la vez dejan exactamente una fila viva', v9.length === 1, `filas vivas=${v9.length}`);
check('M9 ninguna de las dos reporta errores de reparación', (p9a?.erroresDeReparacion ?? 0) === 0 && (p9b?.erroresDeReparacion ?? 0) === 0,
  `errores=${p9a?.erroresDeReparacion}/${p9b?.erroresDeReparacion}`);

/* ═══ M10 · DECISIÓN SOBRE UNA LECTURA ANTERIOR: LA REPARACIÓN REVALIDA ═══════════════════════════════════════════ */
console.log('\n── M10 · Decisión sobre una lectura anterior: la reparación revalida ──', reloj());
const c10 = clave(ANA);
await subir(c10);
await regRef(c10).set(registroDe(ANA, c10, undefined));
/* El almacén es el último que se lee de cada objeto: una creación que entra justo después de la lectura de filas no
 * llega a la decisión, pero sí a la reparación, que tiene que volver a mirar dentro de su transacción. */
const almacenQueCrea = {
  ...indice.puertoDelStorageDeWee('wee'),
  mirar: async (ref) => {
    if (ref.objectKey === c10) {
      const asset = `asset_${hex()}`;
      await regRef(c10).collection('referencias').doc(`material_${asset}_original`).set(filaDe(ANA, c10, asset));
    }
    return indice.puertoDelStorageDeWee('wee').mirar(ref);
  },
};
const i10 = await pasada(ANA, { deps: { almacenes: { wee: almacenQueCrea } } });
check('M10 la lectura anterior veía un huérfano: la decisión lo propone (objeto_huerfano)', hallazgosDe(i10, c10).some((h) => h.clase === 'objeto_huerfano'),
  JSON.stringify(hallazgosDe(i10, c10).map((h) => h.clase)));
check('M10 la reparación revalida dentro de su transacción: el objeto NO pasa a candidato', (await registro(c10))?.estado === 'guardado', `estado=${(await registro(c10))?.estado}`);
check('M10 y los bytes no se tocan', await existe(c10));

/* ═══ M11 · CLAVES users/ Y RUTAS ESPECIALES ══════════════════════════════════════════════════════════════════ */
console.log('\n── M11 · Claves users/ y rutas especiales ──', reloj());
const c11a = clave(ANA, ' ñ (1) espacios');
const g11a = await subir(c11a);
const f11a = fichaDe(ANA, c11a);
await db.collection('assets').doc(f11a.assetId).set(f11a);
await regRef(c11a).set(registroDe(ANA, c11a, g11a, { assetId: f11a.assetId }));
const c11b = clave(BETO);
const g11b = await subir(c11b);
const f11b = fichaDe(ANA, c11b);
await db.collection('assets').doc(f11b.assetId).set(f11b);
await pasada(ANA);
check('M11 una clave users/ con espacios y eñes se repara como cualquier otra de su cuenta', (await vivasDe(c11a)).length === 1);
check('M11 una ficha de ANA que apunta a una clave de BETO no crea filas ni toca el objeto de BETO',
  (await filasDe(c11b)).length === 0 && (await existe(c11b)), `filas=${(await filasDe(c11b)).length}`);

/* ═══ M12 · FALLO PARCIAL Y REANUDACIÓN ═══════════════════════════════════════════════════════════════════════ */
console.log('\n── M12 · Fallo parcial de una reconciliación y reanudación ──', reloj());
const c12a = clave(ANA);
const c12b = clave(ANA);
for (const c of [c12a, c12b]) {
  const g = await subir(c);
  const f = fichaDe(ANA, c);
  await db.collection('assets').doc(f.assetId).set(f);
  await regRef(c).set(registroDe(ANA, c, g, { assetId: f.assetId }));
}
const assetA = (await db.collection('assets').where('storageRef.objectKey', '==', c12a).get()).docs[0].id;
inyeccion.fallaEscrituraDeFila = `mediaObjects/${objRef(c12a)}/referencias/material_${assetA}_original`;
const i12a = await pasada(ANA);
check('M12 el fallo de una reparación queda contado, y la pasada sigue con el resto', (i12a?.erroresDeReparacion ?? 0) >= 1 && (await vivasDe(c12b)).length === 1,
  `errores=${i12a?.erroresDeReparacion}`);
check('M12 el objeto que falló sigue sin su fila, sin que eso autorice nada', (await vivasDe(c12a)).length === 0 && (await existe(c12a)));
const i12b = await pasada(ANA);
check('M12 la siguiente pasada completa la reparación que falló', (await vivasDe(c12a)).length === 1 && (i12b?.erroresDeReparacion ?? 0) === 0,
  `filas=${(await vivasDe(c12a)).length} · errores=${i12b?.erroresDeReparacion}`);

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`, reloj());
process.exit(fallos ? 1 : 0);
