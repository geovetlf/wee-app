/*
 * RECUPERACIÓN DE BORRADOS INTERRUMPIDOS (cierre técnico de almacenamiento, trabajo A).
 *
 * Un objeto `users/` de Weë se retira con `retirarConIndice`: T1 retira la ficha y deja el registro `candidato`; T2
 * reclama (`borrando` con una concesión que caduca); el puerto borra con la generación registrada; T3 cierra con la
 * concesión propia. Si el proceso cae entre T2 y T3, el registro queda `borrando`. Esta suite fija el comportamiento
 * que debe tener esa caída:
 *
 *   A  caída después de reclamar, antes de llamar al almacén        → el reintento, con la concesión caducada, borra
 *   B  caída después de borrar en el almacén, antes de cerrar        → el reintento cierra el registro sin volver a borrar
 *   C  reintento de un borrado ya completado                          → no toca el almacén
 *   D  referencia nueva o viva de otra cuenta tras reclamar           → no borra; queda pendiente
 *   E  consumidores desconocidos, error al consultarlos, cobertura    → no borra; queda pendiente, y al resolverse, borra
 *   F  dos recuperadores a la vez                                     → una sola borrado en el almacén
 *   G  error transitorio y recuperación posterior                     → respeta la espera de la política, después borra
 *   H  error repetido (no transitorio en la práctica)                 → se reintenta con espera y se para al agotar intentos
 *   I  otra cuenta, o una ficha que apunta a una clave ajena          → nunca se toca lo que no es de la cuenta
 *
 * El reloj es inyectado (`ahora`): la concesión caduca cuando la prueba lo adelanta, sin dormir. Los fallos se colocan
 * en los puntos exactos de la frontera: el puerto (`borrar` y `capacidades`) y la escritura de cierre (`estado: borrado`).
 *
 * Límite declarado: el emulador no hace cumplir `ifGenerationMatch`. Aquí NO se prueba que Storage rechace una
 * generación distinta; eso lo cubre la suite de frontera del SDK (`activos-generacion-sdk.emulator.mjs`), con un 412
 * inyectado en la petición, y queda pendiente de prueba real con autorización.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-recuperacion-caida.emulator.mjs"
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
const puertoDeAlmacen = lib('core/media/puerto.js');

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const ANA = 'uAnaRec';
const BETO = 'uBetoRec';
const RUN = Date.now().toString(36);
let seq = 0;
const urlDe = (key) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(key)}?alt=media&token=tok-${RUN}-${seq}`;
const claveDeUsuario = (cuenta) => `users/${cuenta}/creator-inputs/${RUN}-${++seq}.png`;
const subir = (key) => bucket.file(key).save(Buffer.from('bytes'), { metadata: { contentType: 'image/png' }, resumable: false });
const existe = async (key) => (await bucket.file(key).exists())[0];
const objRef = (key) => core.referenciaDelObjeto(indice.huellaDelIndice, { provider: 'wee', bucket: BUCKET, objectKey: key });
const registroDe = async (key) => (await db.collection('mediaObjects').doc(objRef(key)).get()).data();
const filasVivasDe = async (key) => (await db.collection('mediaObjects').doc(objRef(key)).collection('referencias').get())
  .docs.filter((d) => d.data().viva === true).length;
const ficha = async (id) => (await db.collection('assets').doc(id).get()).data();
const creaMaterial = (owner, key) => content.crearMaterialDesdeUrl({
  ownerAccountId: owner, url: urlDe(key), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 },
}).catch(() => null);

/* ── Reloj inyectado: el tiempo real más un desplazamiento que la prueba adelanta ───────────────────────────────────
 * El reloj sigue al real (así `at` nunca va por detrás de `createdAt` de un objeto recién creado, que la edad mínima
 * compara) y solo se adelanta para que caduquen las concesiones y se cumplan las esperas de la política. */
let desplazamiento = 0;
const ahora = () => Date.now() + desplazamiento;
const DURACION_DE_CONCESION_MS = 10_000;
const ESPERA_DE_LA_POLITICA_MS = core.POLITICA_DEL_BORRADO_INMEDIATO.recoleccion.esperaEntreIntentosMs;
const pasarLaConcesion = () => { desplazamiento += DURACION_DE_CONCESION_MS + 1000; };
const pasarLaEspera = () => { desplazamiento += ESPERA_DE_LA_POLITICA_MS + 1000; };

/* ── Fallos colocados en la frontera ─────────────────────────────────────────────────────────────────────────────── */
const inyeccion = { caeAntesDelPuerto: false, transitorios: 0, permanentes: false, caeAlCerrar: false, fallaLecturaDeQueries: false };
const llamadasAlPuerto = [];
const borradosEnElAlmacen = [];
const puertoReal = indice.puertoDelStorageDeWee('wee');
const puertoInstrumentado = {
  providerId: 'wee',
  /* Leer las capacidades es lo primero que hace el borrado con cerrojo: si cae aquí, el objeto ya está reclamado. */
  get capacidades() {
    if (inyeccion.caeAntesDelPuerto) throw new Error('caída simulada después de reclamar');
    return puertoReal.capacidades;
  },
  guardar: puertoReal.guardar,
  mirar: puertoReal.mirar,
  async borrar(ref, opciones) {
    llamadasAlPuerto.push({ clave: ref.objectKey, generacion: opciones?.generacion });
    if (inyeccion.permanentes) return { ok: false, error: puertoDeAlmacen.falloDeAlmacen('wee', 'proveedor_no_disponible') };
    if (inyeccion.transitorios > 0) {
      inyeccion.transitorios--;
      return { ok: false, error: puertoDeAlmacen.falloDeAlmacen('wee', 'proveedor_no_disponible') };
    }
    const r = await puertoReal.borrar(ref, opciones);
    if (r.ok && !r.yaNoEstaba) borradosEnElAlmacen.push(ref.objectKey);
    return r;
  },
};
const llamadasDe = (key) => llamadasAlPuerto.filter((c) => c.clave === key).length;

/* La escritura de cierre (`estado: borrado`) cae a mitad: el objeto ya está fuera de Storage y el registro sigue `borrando`. */
const runTransactionOriginal = db.runTransaction.bind(db);
db.runTransaction = (fn, opciones) => runTransactionOriginal((tx) => fn(new Proxy(tx, {
  get(t, p) {
    if (p === 'set') {
      return (ref, data, opts) => {
        if (inyeccion.caeAlCerrar && data && data.estado === 'borrado') throw new Error('caída simulada al cerrar');
        return t.set(ref, data, opts);
      };
    }
    /* Una consulta dentro de la transacción (las filas vivas) puede fallar: el índice no se ha leído entero. */
    if (p === 'get') {
      return (ref) => {
        if (inyeccion.fallaLecturaDeQueries && ref?.path === undefined) throw new Error('lectura del índice fallida (simulada)');
        return t.get(ref);
      };
    }
    const v = t[p];
    return typeof v === 'function' ? v.bind(t) : v;
  },
})), opciones);

/* ── Dependencias del índice: el puerto instrumentado, consumidores de prueba y el reloj inyectado ───────────────── */
const depsRec = (extra = {}) => ({
  db,
  huella: indice.huellaDelIndice,
  indexable: content.entraEnElIndice,
  almacenes: { wee: puertoInstrumentado },
  consumidores: async () => ({ estado: 'sin_usos' }),
  operaciones: async () => [],
  ahora,
  sortear: () => `c${RUN}${++seq}`,
  duracionDeConcesionMs: DURACION_DE_CONCESION_MS,
  ...extra,
});

/* Un material de ANA con su objeto, ya registrado y con cobertura. */
const materialDe = async (owner) => {
  const key = claveDeUsuario(owner);
  await subir(key);
  const f = await creaMaterial(owner, key);
  return { key, asset: f?.assetId, objectRef: objRef(key) };
};

/* Una fila viva de OTRA cuenta sobre el objeto: estado contradictorio que la creación no produce. */
const filaVivaDeOtraCuenta = async (owner, key) => {
  const id = `asset_${(++seq + 0x2000).toString(16).padStart(32, '0')}`;
  const refId = `material_${id}_original`;
  await db.collection('mediaObjects').doc(objRef(key)).collection('referencias').doc(refId).set({
    refId, clase: 'material', assetId: id, pieza: 'original', viva: true, ownerAccountId: owner, objectRef: objRef(key),
    desdeAt: Date.now(), actualizadoAt: Date.now(),
  });
  return refId;
};

/* ── Flag: las dos cuentas dentro de la cobertura del índice ───────────────────────────────────────────────────── */
await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA, BETO], coberturaDesde: 0 });
await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);

/* ═══ A · CAÍDA DESPUÉS DE RECLAMAR, ANTES DEL ALMACÉN ═══════════════════════════════════════════════════════════ */
console.log('\n── A · Caída después de reclamar, antes de llamar al almacén ──', reloj());
const mA = await materialDe(ANA);
inyeccion.caeAntesDelPuerto = true;
let caidaA = false;
try { await indice.retirarConIndice(depsRec(), ANA, mA.asset); } catch { caidaA = true; }
inyeccion.caeAntesDelPuerto = false;
check('A0 la caída ocurre después de reclamar: el registro queda en borrando, con concesión', caidaA && (await registroDe(mA.key))?.estado === 'borrando');
check('A1 el objeto sigue en Storage y el almacén no recibió ninguna petición', (await existe(mA.key)) && llamadasDe(mA.key) === 0);
pasarLaConcesion();
const rA = await indice.retirarConIndice(depsRec(), ANA, mA.asset);
check('A2 el reintento, con la concesión caducada, completa el borrado', !(await existe(mA.key)) && (await registroDe(mA.key))?.estado === 'borrado',
  `estado=${(await registroDe(mA.key))?.estado} · almacén=${llamadasDe(mA.key)}`);
check('A3 la ficha deja de estar pendiente', (await ficha(mA.asset))?.pendingPhysicalDeletion !== true);
check('A4 el reintento informa de que no queda nada pendiente', rA.pendientes === 0 && rA.objetosBorrados === 1, JSON.stringify({ pendientes: rA.pendientes, objetosBorrados: rA.objetosBorrados }));

/* ═══ B · CAÍDA DESPUÉS DE BORRAR EN EL ALMACÉN, ANTES DE CERRAR ═════════════════════════════════════════════════ */
console.log('\n── B · Caída después de borrar en el almacén, antes de cerrar ──', reloj());
const mB = await materialDe(ANA);
inyeccion.caeAlCerrar = true;
const rB0 = await indice.retirarConIndice(depsRec(), ANA, mB.asset);
inyeccion.caeAlCerrar = false;
check('B0 los bytes salen del almacén y el registro no se cierra (no_cerrado)', !(await existe(mB.key)) && (await registroDe(mB.key))?.estado === 'borrando' && rB0.pendientes === 1,
  `estado=${(await registroDe(mB.key))?.estado} · pendientes=${rB0.pendientes}`);
pasarLaConcesion();
const llamadasAntesB1 = llamadasDe(mB.key);
await indice.retirarConIndice(depsRec(), ANA, mB.asset);
check('B1 el reintento cierra el registro; la petición que llega ve «ya no estaba», sin un segundo borrado efectivo', (await registroDe(mB.key))?.estado === 'borrado' && llamadasDe(mB.key) === llamadasAntesB1 + 1,
  `estado=${(await registroDe(mB.key))?.estado} · peticiones=${llamadasDe(mB.key)}`);
check('B1b un único borrado efectivo en el almacén para ese objeto', borradosEnElAlmacen.filter((k) => k === mB.key).length === 1);
check('B2 la ficha deja de estar pendiente', (await ficha(mB.asset))?.pendingPhysicalDeletion !== true);

/* ═══ C · REINTENTO DE UN BORRADO YA COMPLETADO ══════════════════════════════════════════════════════════════════ */
console.log('\n── C · Reintento de un borrado ya completado ──', reloj());
pasarLaConcesion();
const llamadasAntesC = llamadasAlPuerto.length;
const rC = await indice.retirarConIndice(depsRec(), ANA, mA.asset);
check('C1 un reintento sobre un material ya completado no toca el almacén', llamadasAlPuerto.length === llamadasAntesC && rC.status === 'ya_retirado',
  `status=${rC.status} · peticiones nuevas=${llamadasAlPuerto.length - llamadasAntesC}`);
check('C2 y el registro sigue borrado', (await registroDe(mA.key))?.estado === 'borrado');

/* ═══ D · REFERENCIA NUEVA O VIVA TRAS RECLAMAR, ANTES DEL BORRADO FÍSICO ═════════════════════════════════════════ */
console.log('\n── D · Referencia nueva o viva tras reclamar, antes del borrado físico ──', reloj());
const mD = await materialDe(ANA);
inyeccion.caeAntesDelPuerto = true;
try { await indice.retirarConIndice(depsRec(), ANA, mD.asset); } catch { /* caída simulada */ }
inyeccion.caeAntesDelPuerto = false;
const nuevaD = await creaMaterial(ANA, mD.key);
check('D1 una creación nueva sobre un objeto en borrando se rechaza', nuevaD === null);
await filaVivaDeOtraCuenta(BETO, mD.key);
pasarLaConcesion();
await indice.retirarConIndice(depsRec(), ANA, mD.asset);
check('D2 con una referencia viva de otra cuenta, el reintento no borra', (await existe(mD.key)) && llamadasDe(mD.key) === 0);
check('D3 el objeto queda pendiente: la ficha sigue marcada y el registro no se cierra', (await ficha(mD.asset))?.pendingPhysicalDeletion === true && (await registroDe(mD.key))?.estado !== 'borrado',
  `estado=${(await registroDe(mD.key))?.estado}`);

/* ═══ E · CONSUMIDORES DESCONOCIDOS, ERROR AL CONSULTAR, COBERTURA INCOMPLETA ════════════════════════════════════ */
console.log('\n── E · Incertidumbre: consumidores desconocidos, error al consultar, cobertura incompleta ──', reloj());
const mE = await materialDe(ANA);
inyeccion.caeAntesDelPuerto = true;
try { await indice.retirarConIndice(depsRec(), ANA, mE.asset); } catch { /* caída simulada */ }
inyeccion.caeAntesDelPuerto = false;
pasarLaConcesion();
await indice.retirarConIndice(depsRec({ consumidores: async () => ({ estado: 'desconocido', tipos: ['proyecto'] }) }), ANA, mE.asset);
check('E1 consumidores desconocidos: no se borra', (await existe(mE.key)) && llamadasDe(mE.key) === 0);
await indice.retirarConIndice(depsRec({ consumidores: async () => { throw new Error('no contestan'); } }), ANA, mE.asset);
check('E2 error al consultar los consumidores: no se borra', (await existe(mE.key)) && llamadasDe(mE.key) === 0);
await db.collection('mediaObjects').doc(objRef(mE.key)).set({ coberturaEn: 0 }, { merge: true });
await indice.retirarConIndice(depsRec(), ANA, mE.asset);
check('E3 cobertura incompleta: no se borra', (await existe(mE.key)) && llamadasDe(mE.key) === 0);
await db.collection('mediaObjects').doc(objRef(mE.key)).set({ coberturaEn: Date.now() }, { merge: true });
inyeccion.fallaLecturaDeQueries = true;
await indice.retirarConIndice(depsRec(), ANA, mE.asset);
inyeccion.fallaLecturaDeQueries = false;
check('E4 error al leer las filas del índice dentro de la reclamación: no se borra y el registro queda como estaba', (await existe(mE.key)) && llamadasDe(mE.key) === 0 && (await registroDe(mE.key))?.estado === 'borrando',
  `estado=${(await registroDe(mE.key))?.estado} · peticiones=${llamadasDe(mE.key)}`);
await indice.retirarConIndice(depsRec(), ANA, mE.asset);
check('E5 cuando la incertidumbre se resuelve, la recuperación sí borra', !(await existe(mE.key)) && (await registroDe(mE.key))?.estado === 'borrado',
  `estado=${(await registroDe(mE.key))?.estado}`);

/* ═══ F · DOS RECUPERADORES A LA VEZ ══════════════════════════════════════════════════════════════════════════════ */
console.log('\n── F · Dos recuperadores a la vez sobre el mismo objeto ──', reloj());
const mF = await materialDe(ANA);
inyeccion.caeAntesDelPuerto = true;
try { await indice.retirarConIndice(depsRec(), ANA, mF.asset); } catch { /* caída simulada */ }
inyeccion.caeAntesDelPuerto = false;
pasarLaConcesion();
await Promise.all([indice.retirarConIndice(depsRec(), ANA, mF.asset), indice.retirarConIndice(depsRec(), ANA, mF.asset)]);
check('F1 solo un recuperador llega al almacén: una sola borrado', borradosEnElAlmacen.filter((k) => k === mF.key).length === 1 && llamadasDe(mF.key) === 1,
  `peticiones=${llamadasDe(mF.key)} · borrados=${borradosEnElAlmacen.filter((k) => k === mF.key).length}`);
check('F2 el registro queda borrado una sola vez', (await registroDe(mF.key))?.estado === 'borrado');

/* ═══ G · ERROR TRANSITORIO Y RECUPERACIÓN POSTERIOR ══════════════════════════════════════════════════════════════ */
console.log('\n── G · Error transitorio del almacén y recuperación posterior ──', reloj());
const mG = await materialDe(ANA);
inyeccion.transitorios = 1;
await indice.retirarConIndice(depsRec(), ANA, mG.asset);
inyeccion.transitorios = 0;
const rg = await registroDe(mG.key);
check('G0 el fallo transitorio deja el objeto candidato, con un intento anotado', rg?.estado === 'candidato' && rg?.intentosDeBorrado === 1,
  `estado=${rg?.estado} · intentos=${rg?.intentosDeBorrado}`);
await indice.retirarConIndice(depsRec(), ANA, mG.asset);
check('G1 un reintento inmediato respeta la espera de la política y no borra', (await existe(mG.key)) && llamadasDe(mG.key) === 1);
pasarLaEspera();
await indice.retirarConIndice(depsRec(), ANA, mG.asset);
check('G2 pasada la espera, la recuperación borra una vez', !(await existe(mG.key)) && llamadasDe(mG.key) === 2 && (await registroDe(mG.key))?.estado === 'borrado',
  `peticiones=${llamadasDe(mG.key)}`);

/* ═══ H · ERROR REPETIDO: SE REINTENTA CON ESPERA Y SE PARA AL AGOTAR INTENTOS ═════════════════════════════════════ */
console.log('\n── H · Error repetido del almacén: reintentos acotados y visibles ──', reloj());
const mH = await materialDe(ANA);
inyeccion.permanentes = true;
await indice.retirarConIndice(depsRec(), ANA, mH.asset);
for (let i = 0; i < 4; i++) {
  pasarLaEspera();
  await indice.retirarConIndice(depsRec(), ANA, mH.asset);
}
const intentosH = (await registroDe(mH.key))?.intentosDeBorrado;
check('H1 cinco intentos con espera entre ellos: el almacén recibe cinco peticiones', llamadasDe(mH.key) === 5 && intentosH === 5,
  `peticiones=${llamadasDe(mH.key)} · intentos=${intentosH}`);
pasarLaEspera();
await indice.retirarConIndice(depsRec(), ANA, mH.asset);
check('H2 agotados los intentos, el reintento para: ninguna petición nueva', llamadasDe(mH.key) === 5, `peticiones=${llamadasDe(mH.key)}`);
check('H3 el motivo queda visible en el registro', (await registroDe(mH.key))?.pendiente?.motivo === 'intentos_agotados',
  `motivo=${(await registroDe(mH.key))?.pendiente?.motivo}`);
inyeccion.permanentes = false;

/* ═══ I · OTRA CUENTA Y CLAVES AJENAS: NUNCA SE TOCA LO QUE NO ES DE LA CUENTA ═══════════════════════════════════ */
console.log('\n── I · Otra cuenta, y una ficha que apunta a una clave ajena ──', reloj());
const mI = await materialDe(ANA);
const mIB = await materialDe(BETO);
inyeccion.caeAntesDelPuerto = true;
try { await indice.retirarConIndice(depsRec(), BETO, mIB.asset); } catch { /* caída simulada */ }
inyeccion.caeAntesDelPuerto = false;
const rIBeto = await indice.retirarConIndice(depsRec(), BETO, mI.asset);
check('I1 BETO no puede reintentar la retirada de ANA', rIBeto.status === 'no_es_tuyo' && (await existe(mI.key)) && llamadasDe(mI.key) === 0, rIBeto.status);
pasarLaConcesion();
await indice.retirarConIndice(depsRec(), ANA, mI.asset);
check('I2 el reintento de ANA no toca el objeto que BETO dejó a medias', (await existe(mIB.key)) && llamadasDe(mIB.key) === 0 && (await registroDe(mIB.key))?.estado === 'borrando');
await db.collection('assets').doc(mI.asset).set({ storageRef: { provider: 'wee', bucket: BUCKET, objectKey: mIB.key } }, { merge: true });
await db.collection('assets').doc(mI.asset).set({ pendingPhysicalDeletion: true }, { merge: true });
await indice.retirarConIndice(depsRec(), ANA, mI.asset);
check('I3 una ficha de ANA que apunta a una clave de BETO no autoriza su borrado', (await existe(mIB.key)) && llamadasDe(mIB.key) === 0,
  `peticiones=${llamadasDe(mIB.key)}`);

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`, reloj());
process.exit(fallos ? 1 : 0);
