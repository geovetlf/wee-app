/*
 * UN LEASE ANTIGUO NO ACTÚA SOBRE UNA RECLAMACIÓN NUEVA (cierre técnico de almacenamiento).
 *
 * EL MECANISMO REAL (no se inventa ninguno). Reclamar un objeto (`reclamarParaBorrar`, T2) lo pasa a `borrando` y le
 * escribe una concesión `{ id, hasta }` y una versión nueva. Ese par —el `id` de la concesión y la `version` del registro—
 * es el token que exigen `cerrarBorrado` y `devolverBorrado`: con otro `id` (`concesion_ajena`) o con otra versión
 * (`version_inesperada`) la transición no escribe nada y el borrado de Weë devuelve `false`. `hasta` la usa `reclamar` para
 * dejar que OTRO reclame cuando caduca. Quien sostiene la concesión, hasta ahora, no la miraba antes de pedir el borrado
 * físico al almacén, y el almacén no sabe de concesiones. Tampoco releía dos cosas que la reclamación sí había decidido y
 * que pueden cambiar sin una transición: la marca de la reconciliación (no sube la versión) y las filas vivas.
 *
 * LA SECUENCIA. No se puede «reanudar» una llamada caída, pero sí detener a A de forma determinista JUSTO después de que su
 * reclamación se confirme (una compuerta en la frontera de la transacción de reclamar, con una promesa que la prueba abre):
 *
 *   1. A reclama legítimamente y obtiene L1 (concesión + versión). La prueba la lee del registro.
 *   2. A queda detenida ANTES de pedir el borrado físico. Mientras tanto, el reloj inyectado pasa la caducidad de L1.
 *   3. El flujo real de recuperación (repetir la retirada) reclama de nuevo y genera L2. Para que L2 siga vigente, ese
 *      recuperador cae justo después de reclamar (el mismo punto de caída que usa la suite de recuperación) o se detiene
 *      en otra compuerta.
 *   4. A despierta con L1 e intenta continuar: pedir el borrado físico, cerrar, devolver. Debe quedar rechazada, sin ninguna
 *      petición al almacén ni cambio en el registro, y L2 sigue siendo procesable por su propietario. La prueba comprueba
 *      además POR QUÉ la rechazó (el motivo que devuelve la retirada), para no confundir un rechazo con una caída.
 *
 * Los escenarios (cada uno con su objeto):
 *   K0   control: con la concesión vigente, A completa el borrado (la comprobación nueva no estorba al camino normal)
 *   K1   justo ANTES de la transición: L1 caducó y nadie reclamó todavía → A no borra; queda pendiente y recuperable
 *   K2   justo DESPUÉS: L2 vigente → A no borra; L1 reintentada tres veces no cierra ni devuelve; L2 la completa su dueño
 *   K3   el objeto sigue siendo necesario (referencia viva de otra cuenta) y L1 caducó → A no lo borra
 *   K3b  la concesión sigue VIGENTE, pero nace una referencia viva de otra cuenta → A no lo borra
 *   K3c  L1 caduca, el recuperador devuelve el objeto y la misma cuenta lo vuelve a usar (rescate) → A no borra esos bytes
 *   K4   L2 se completa y A vuelve → no toca nada, ni resucita el objeto; la marca pendiente que deja se limpia al repetir
 *   K5   la lectura del estado falla → A no borra (la incertidumbre no autoriza); queda recuperable
 *   K5b  la lectura de las referencias falla → A no borra
 *   K6   la lectura devuelve el registro incompleto (sin concesión) → A no borra
 *   K7   dos recuperadores y A con el orden fijado por compuertas → un solo borrado efectivo
 *   K8   el borrado físico se completó pero el cierre falló, y A despierta → A no actúa; el siguiente recuperador cierra
 *   K9   consumidores desconocidos para el recuperador nuevo y A caducada → nadie borra
 *   K10  cada condición de la comprobación, aislada: registro ausente, otra cuenta, otra versión, otro estado, caducidad ilegible
 *   K11  la reconciliación marca el objeto mientras A tiene la concesión vigente → A no borra (va la última: repara la cuenta)
 *
 * Qué es tiempo real y qué no. El orden entre A y los demás actores lo fijan compuertas (promesas que la prueba abre) y
 * ganchos en la frontera de la transacción, nunca esperas. Las únicas esperas reales son dos: la preparación de la cobertura
 * del índice (una vez, al empezar: el código bajo prueba compara marcas de tiempo reales, y es el patrón de las demás
 * suites de activos) y un tope de seguridad de 10 s a que cada compuerta se alcance (solo se agota si algo falla; no
 * ordena nada). El reloj inyectado avanza sin dormir. La concesión de prueba dura 60 s, para que las escenas con la
 * concesión vigente no dependan de lo lento que vaya el emulador; cada una lo comprueba en su premisa.
 *
 * Límites declarados. El emulador NO hace cumplir `ifGenerationMatch`, y esta suite no lo usa como protección. El almacén no
 * conoce las concesiones: la comprobación es del que sostiene la concesión, justo antes de pedir el borrado. Entre la
 * comprobación y la petición queda una ventana que solo se cierra del lado del almacén, y aquí no se demuestra: es pequeña
 * para la primera petición, pero con una precondición de generación el SDK mantiene el reintento automático (por defecto,
 * tres reintentos con espera exponencial y un tope total de 600 s), así que puede alcanzar segundos. Y `rescatar` conserva la
 * generación: la precondición no frena a un A atrasado sobre un objeto rescatado. La detención de A es una compuerta de
 * prueba, no un fallo del proceso real. El colector MC-5 (`media/recoleccion.ts`) tiene su propio camino de borrado y no hace
 * esta comprobación.
 *
 *   firebase emulators:exec --only firestore,storage --project demo-wee "node functions/test/activos-lease-antiguo.emulator.mjs"
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
const conTope = (promesa, ms) => Promise.race([promesa, esperar(ms).then(() => ({ tope: true }))]);

const ANA = 'uAnaLease';
const BETO = 'uBetoLease';
const RUN = Date.now().toString(36);
let seq = 0;
const urlDe = (key) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(key)}?alt=media&token=tok-${RUN}-${seq}`;
const claveDeUsuario = (cuenta) => `users/${cuenta}/creator-inputs/${RUN}-${++seq}.png`;
const subir = (key) => bucket.file(key).save(Buffer.from('bytes'), { metadata: { contentType: 'image/png' }, resumable: false });
const existe = async (key) => (await bucket.file(key).exists())[0];
const objRef = (key) => core.referenciaDelObjeto(indice.huellaDelIndice, { provider: 'wee', bucket: BUCKET, objectKey: key });
const refWee = (key) => ({ provider: 'wee', bucket: BUCKET, objectKey: key });
const registroDe = async (key) => (await db.collection('mediaObjects').doc(objRef(key)).get()).data();
const vivasDe = async (key) => (await db.collection('mediaObjects').doc(objRef(key)).collection('referencias').get()).docs.filter((d) => d.data().viva === true);
const ficha = async (id) => (await db.collection('assets').doc(id).get()).data();
const creaMaterial = (owner, key) => content.crearMaterialDesdeUrl({
  ownerAccountId: owner, url: urlDe(key), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 },
}).catch(() => null);

/* ── Reloj inyectado: el tiempo real más un desplazamiento que la prueba adelanta ───────────────────────────────────── */
let desplazamiento = 0;
const ahora = () => Date.now() + desplazamiento;
const DURACION_DE_CONCESION_MS = 60_000;
const pasarLaConcesion = () => { desplazamiento += DURACION_DE_CONCESION_MS + 1000; };
/* La premisa de cada escena: la concesión que la prueba dice vigente (o caducada) lo es de verdad, según el reloj inyectado. */
const concesionDe = async (key) => (await registroDe(key))?.concesion;
const vigente = async (key) => (await concesionDe(key))?.hasta > ahora();
const caducada = async (key) => (await concesionDe(key))?.hasta <= ahora();

/* ── El puerto del almacén, instrumentado: cuenta las peticiones, los borrados efectivos y puede fallar ────────────── */
const inyeccion = { caeAntesDelPuerto: false, caeAlCerrar: false, paradaTrasReclamar: null, transitorios: 0 };
const llamadasAlPuerto = [];
const borradosEfectivos = [];
const puertoReal = indice.puertoDelStorageDeWee('wee');
const puertoInstrumentado = {
  providerId: 'wee',
  get capacidades() {
    if (inyeccion.caeAntesDelPuerto) throw new Error('caída simulada después de reclamar');
    return puertoReal.capacidades;
  },
  guardar: puertoReal.guardar,
  mirar: puertoReal.mirar,
  async borrar(ref, opciones) {
    llamadasAlPuerto.push({ clave: ref.objectKey, generacion: opciones?.generacion });
    if (inyeccion.transitorios > 0) {
      inyeccion.transitorios--;
      return { ok: false, error: puertoDeAlmacen.falloDeAlmacen('wee', 'proveedor_no_disponible') };
    }
    const r = await puertoReal.borrar(ref, opciones);
    if (r.ok && !r.yaNoEstaba) borradosEfectivos.push(ref.objectKey);
    return r;
  },
};
const llamadasDe = (key) => llamadasAlPuerto.filter((c) => c.clave === key).length;
const borradosDe = (key) => borradosEfectivos.filter((k) => k === key).length;

/* ── Frontera de la transacción: la escritura de cierre puede caer, y una reclamación confirmada puede detenerse ────── */
const runTransactionOriginal = db.runTransaction.bind(db);
db.runTransaction = (fn, opciones) => runTransactionOriginal((tx) => fn(new Proxy(tx, {
  get(t, p) {
    if (p === 'set') {
      return (ref, data, opts) => {
        if (inyeccion.caeAlCerrar && data && data.estado === 'borrado') throw new Error('caída simulada al cerrar');
        return t.set(ref, data, opts);
      };
    }
    const v = t[p];
    return typeof v === 'function' ? v.bind(t) : v;
  },
})), opciones).then(async (resultado) => {
  /* Una reclamación recién confirmada (`reclamado: true`) puede quedar detenida aquí: el registro ya la tiene, quien la
   * pidió todavía no ha vuelto. Solo se detiene la primera tras armar la compuerta. */
  const parada = inyeccion.paradaTrasReclamar;
  if (parada && resultado && resultado.reclamado === true) {
    inyeccion.paradaTrasReclamar = null;
    parada.alcanzada();
    await parada.puerta;
  }
  return resultado;
});

/* ── La lectura del registro puede fallar o venir incompleta (solo cuando la prueba arma el plan) ──────────────────── */
const hookLectura = { plan: null };
const DocumentReference = Object.getPrototypeOf(db.doc('mediaObjects/ancla'));
const getOriginal = DocumentReference.get;
DocumentReference.get = async function (...args) {
  const plan = hookLectura.plan;
  if (plan && this.path === plan.ruta) {
    hookLectura.plan = null;
    plan.consumida = true;
    if (plan.modo === 'falla') throw new Error('lectura del registro fallida (simulada)');
    const snap = await getOriginal.apply(this, args);
    if (plan.modo === 'incompleto') {
      return { exists: snap.exists, id: snap.id, data: () => { const d = { ...snap.data() }; delete d.concesion; return d; } };
    }
    return snap;
  }
  return getOriginal.apply(this, args);
};

/* ── La lectura de las referencias (una consulta, fuera de transacción) también puede fallar ───────────────────────── */
const hookFilas = { plan: null };
const ConsultaProto = Object.getPrototypeOf(Object.getPrototypeOf(db.collection('ancla')));
const consultaGetOriginal = ConsultaProto.get;
ConsultaProto.get = async function (...args) {
  const plan = hookFilas.plan;
  if (plan && this._queryOptions?.collectionId === 'referencias') {
    hookFilas.plan = null;
    plan.consumida = true;
    throw new Error('lectura de las referencias fallida (simulada)');
  }
  return consultaGetOriginal.apply(this, args);
};

/* ── Dependencias del índice: el puerto instrumentado, consumidores de prueba y el reloj inyectado ─────────────────── */
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

const materialDe = async (owner) => {
  const key = claveDeUsuario(owner);
  await subir(key);
  const f = await creaMaterial(owner, key);
  return { key, asset: f?.assetId, objectRef: objRef(key) };
};

/* Una referencia viva de OTRA cuenta sobre el objeto: estado contradictorio que la creación no produce (BETO no puede
 * registrar nada sobre la clave de ANA). Sirve para la defensa de borrado, no para la creación. */
const filaVivaDeOtraCuenta = async (owner, key) => {
  const id = `asset_${(++seq + 0x4000).toString(16).padStart(32, '0')}`;
  const refId = `material_${id}_original`;
  await db.collection('mediaObjects').doc(objRef(key)).collection('referencias').doc(refId).set({
    refId, clase: 'material', assetId: id, pieza: 'original', viva: true, ownerAccountId: owner, objectRef: objRef(key),
    desdeAt: Date.now(), actualizadoAt: Date.now(),
  });
  return refId;
};
const apagarFila = (key, refId) => db.collection('mediaObjects').doc(objRef(key)).collection('referencias').doc(refId).update({ viva: false });

/* El punto de caída del recuperador: reclama y cae antes de pedir el borrado (deja su concesión vigente). */
const caerTrasReclamar = async (fn) => {
  inyeccion.caeAntesDelPuerto = true;
  try { await fn(); } catch { /* caída simulada */ }
  inyeccion.caeAntesDelPuerto = false;
};

/* Una retirada que reclama y se DETIENE justo después, antes de pedir el borrado físico. Sirve para A y para un recuperador. */
const detener = async (asset) => {
  const parada = {};
  const alcanzadaP = new Promise((r) => { parada.alcanzada = r; });
  parada.puerta = new Promise((r) => { parada.soltar = r; });
  inyeccion.paradaTrasReclamar = parada;
  const promesa = indice.retirarConIndice(depsRec(), ANA, asset).then((resultado) => ({ resultado }), (error) => ({ error }));
  const llego = await conTope(alcanzadaP, 10_000);
  inyeccion.paradaTrasReclamar = null;
  return { parada, promesa, llego: llego?.tope !== true };
};
/* A: un material nuevo de ANA cuya retirada reclama (L1) y se detiene. `premisa` dice si la escena de partida es la esperada. */
const empezarA = async () => {
  const m = await materialDe(ANA);
  const d = await detener(m.asset);
  const reg = await registroDe(m.key);
  const premisa = d.llego && !!m.asset && reg?.estado === 'borrando' && typeof reg?.concesion?.id === 'string'
    && reg.concesion.hasta > ahora() && (await existe(m.key)) && llamadasDe(m.key) === 0 && (await vivasDe(m.key)).length === 0;
  return {
    m, ...d, premisa,
    L1: { concesionId: reg?.concesion?.id, esperado: { estado: 'borrando', version: reg?.version }, hasta: reg?.concesion?.hasta },
  };
};
/* A despierta con su L1. `modo` arma, solo para este despertar, un fallo o un registro incompleto en la lectura previa. */
const soltarA = async (a, modo) => {
  if (modo === 'falla' || modo === 'incompleto') hookLectura.plan = { ruta: `mediaObjects/${a.m.objectRef}`, modo, consumida: false };
  if (modo === 'filas') hookFilas.plan = { consumida: false };
  const plan = hookLectura.plan ?? hookFilas.plan;
  a.parada.soltar();
  const r = await a.promesa;
  const leyo = plan ? plan.consumida === true : undefined;
  hookLectura.plan = null;
  hookFilas.plan = null;
  return { ...r, leyo };
};
const deA = (a) => ({ ref: refWee(a.m.key), L1: a.L1 });
/* A fue rechazada: terminó (no cayó), no borró nada y lo dejó pendiente, por el motivo que se espera. */
const rechazadaPor = (r, motivo) => r.error === undefined && r.resultado?.status === 'retirado' && r.resultado.objetosBorrados === 0
  && r.resultado.pendientes === 1 && r.resultado.motivos?.[motivo] === 1;
const motivosDe = (r) => r.error ? `cayó: ${r.error.message}` : JSON.stringify(r.resultado?.motivos);

/* ── Flag: las dos cuentas dentro de la cobertura del índice ───────────────────────────────────────────────────── */
await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA, BETO], coberturaDesde: 0 });
await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);

/* ═══ K0 · CONTROL: CON LA CONCESIÓN VIGENTE, A COMPLETA EL BORRADO ══════════════════════════════════════════════ */
console.log('\n── K0 · Control: la concesión vigente no se estorba ──', reloj());
const a0 = await empezarA();
check('K0 premisa: A reclama (L1) y queda detenida antes de pedir el borrado: registro borrando con su concesión vigente, sin peticiones',
  a0.premisa && typeof a0.L1.concesionId === 'string');
const r0 = await soltarA(a0);
check('K0 con la concesión vigente, A pide el borrado y cierra: el camino normal sigue funcionando',
  !(await existe(a0.m.key)) && (await registroDe(a0.m.key))?.estado === 'borrado' && borradosDe(a0.m.key) === 1 && r0.resultado?.pendientes === 0
    && r0.resultado?.objetosBorrados === 1,
  `estado=${(await registroDe(a0.m.key))?.estado} · peticiones=${llamadasDe(a0.m.key)}`);

/* ═══ K1 · JUSTO ANTES DE LA TRANSICIÓN: L1 CADUCÓ Y NADIE RECLAMÓ TODAVÍA ═════════════════════════════════════ */
console.log('\n── K1 · Justo antes: L1 caducada, sin L2 ──', reloj());
const a1 = await empezarA();
pasarLaConcesion();
check('K1 premisa: A está detenida con L1 y L1 ya caducó según el reloj', a1.premisa && (await caducada(a1.m.key)));
const antes1 = JSON.stringify(await registroDe(a1.m.key));
const r1 = await soltarA(a1);
check('K1 A despierta con L1 caducada: no pide ningún borrado y el objeto sigue en el almacén', llamadasDe(a1.m.key) === 0 && (await existe(a1.m.key)),
  `peticiones=${llamadasDe(a1.m.key)} · objeto=${(await existe(a1.m.key)) ? 'sigue' : 'BORRADO'} · registro=${(await registroDe(a1.m.key))?.estado}`);
check('K1 el registro no cambia (sigue borrando con L1), A termina rechazada por «concesion_perdida» y queda pendiente, recuperable',
  JSON.stringify(await registroDe(a1.m.key)) === antes1 && (await ficha(a1.m.asset))?.pendingPhysicalDeletion === true && rechazadaPor(r1, 'concesion_perdida'),
  motivosDe(r1));
await indice.retirarConIndice(depsRec(), ANA, a1.m.asset);
check('K1 la recuperación posterior —repetir la retirada, hoy el único disparador— sí lo completa', !(await existe(a1.m.key)) && (await registroDe(a1.m.key))?.estado === 'borrado' && borradosDe(a1.m.key) === 1);

/* ═══ K2 · JUSTO DESPUÉS: L2 VIGENTE ═══════════════════════════════════════════════════════════════════════════════ */
console.log('\n── K2 · Justo después: L2 vigente ──', reloj());
const a2 = await empezarA();
pasarLaConcesion();
await caerTrasReclamar(() => indice.retirarConIndice(depsRec(), ANA, a2.m.asset));
const reg2 = await registroDe(a2.m.key);
check('K2 el recuperador nuevo reclama: otra concesión, otra versión, y vigente', a2.premisa && reg2?.estado === 'borrando' && reg2?.concesion?.id !== a2.L1.concesionId
  && reg2?.version > a2.L1.esperado.version && reg2?.concesion?.hasta > ahora(), `L1=${a2.L1.concesionId} · L2=${reg2?.concesion?.id}`);
const antes2 = JSON.stringify(reg2);
const r2 = await soltarA(a2);
check('K2 A despierta con L1 y no pide ningún borrado: el objeto y el registro quedan intactos', llamadasDe(a2.m.key) === 0 && (await existe(a2.m.key))
  && JSON.stringify(await registroDe(a2.m.key)) === antes2, `peticiones=${llamadasDe(a2.m.key)}`);
check('K2 A termina rechazada por «concesion_perdida» (no cayó) y lo deja pendiente', rechazadaPor(r2, 'concesion_perdida'), motivosDe(r2));
const { ref: ref2, L1: L1de2 } = deA(a2);
let rechazadas2 = true;
for (let i = 0; i < 3; i++) {
  const c = await indice.cerrarBorrado(depsRec(), a2.m.objectRef, ANA, L1de2.concesionId, L1de2.esperado);
  const d = await indice.devolverBorrado(depsRec(), a2.m.objectRef, ANA, L1de2.concesionId, L1de2.esperado, 'error_transitorio', true);
  if (c !== false || d !== false) rechazadas2 = false;
}
check('K2 L1 se reintenta tres veces: no cierra ni devuelve la reclamación nueva, y no cuenta ningún intento',
  rechazadas2 && JSON.stringify(await registroDe(a2.m.key)) === antes2);
const borrado2 = await puertoInstrumentado.borrar(ref2, { generacion: reg2.generacion });
const cierre2 = await indice.cerrarBorrado(depsRec(), a2.m.objectRef, ANA, reg2.concesion.id, { estado: 'borrando', version: reg2.version });
check('K2 L2 sigue siendo procesable por su propietario: pide el borrado, cierra, y queda borrado',
  borrado2.ok && cierre2 === true && (await registroDe(a2.m.key))?.estado === 'borrado' && !(await existe(a2.m.key)));
const antesFin2 = JSON.stringify(await registroDe(a2.m.key));
const cFin = await indice.cerrarBorrado(depsRec(), a2.m.objectRef, ANA, L1de2.concesionId, L1de2.esperado);
const dFin = await indice.devolverBorrado(depsRec(), a2.m.objectRef, ANA, L1de2.concesionId, L1de2.esperado, 'error_transitorio', true);
check('K2 con L2 ya completada, el recuperador antiguo vuelve a intentarlo: no resucita ni reescribe nada',
  cFin === false && dFin === false && JSON.stringify(await registroDe(a2.m.key)) === antesFin2);

/* ═══ K3 · EL OBJETO SIGUE SIENDO NECESARIO, Y L1 CADUCÓ ═══════════════════════════════════════════════════════════ */
console.log('\n── K3 · El objeto sigue siendo necesario: referencia viva de otra cuenta, y L1 caducada ──', reloj());
const a3 = await empezarA();
await filaVivaDeOtraCuenta(BETO, a3.m.key);
pasarLaConcesion();
check('K3 premisa: A está detenida con L1 caducada y hay una fila viva de BETO sobre el objeto', a3.premisa === true && (await caducada(a3.m.key)) && (await vivasDe(a3.m.key)).length === 1);
await indice.retirarConIndice(depsRec(), ANA, a3.m.asset);
const reg3 = await registroDe(a3.m.key);
check('K3 con una referencia viva ajena, el recuperador nuevo no reclama: no hay L2 y no hay peticiones', reg3?.concesion?.id === a3.L1.concesionId && llamadasDe(a3.m.key) === 0);
const antes3 = JSON.stringify(reg3);
const r3 = await soltarA(a3);
check('K3 A despierta con L1 caducada y NO borra un objeto referenciado: el objeto y la referencia siguen', (await existe(a3.m.key)) && llamadasDe(a3.m.key) === 0
  && (await vivasDe(a3.m.key)).length === 1 && JSON.stringify(await registroDe(a3.m.key)) === antes3 && rechazadaPor(r3, 'concesion_perdida'),
  `peticiones=${llamadasDe(a3.m.key)} · objeto=${(await existe(a3.m.key)) ? 'sigue' : 'BORRADO'} · registro=${(await registroDe(a3.m.key))?.estado} · filas vivas=${(await vivasDe(a3.m.key)).length} · ${motivosDe(r3)}`);

/* ═══ K3b · LA CONCESIÓN SIGUE VIGENTE, PERO NACE UNA REFERENCIA VIVA DE OTRA CUENTA ═══════════════════════════════ */
console.log('\n── K3b · Concesión vigente y una referencia viva de otra cuenta ──', reloj());
const a3b = await empezarA();
const fila3b = await filaVivaDeOtraCuenta(BETO, a3b.m.key);
check('K3b premisa: A reclamó (L1 vigente) y, después, nace una fila viva de BETO (estado contradictorio) sobre el objeto',
  a3b.premisa && (await vigente(a3b.m.key)) && (await vivasDe(a3b.m.key)).length === 1);
const antes3b = JSON.stringify(await registroDe(a3b.m.key));
const r3b = await soltarA(a3b);
check('K3b A despierta con L1 VIGENTE y NO borra: una referencia viva lo reclama; el objeto, la fila y el registro quedan intactos',
  rechazadaPor(r3b, 'referenciado') && llamadasDe(a3b.m.key) === 0 && (await existe(a3b.m.key)) && (await vivasDe(a3b.m.key)).length === 1
    && JSON.stringify(await registroDe(a3b.m.key)) === antes3b,
  `peticiones=${llamadasDe(a3b.m.key)} · objeto=${(await existe(a3b.m.key)) ? 'sigue' : 'BORRADO'} · ${motivosDe(r3b)}`);
await apagarFila(a3b.m.key, fila3b);

/* ═══ K3c · L1 CADUCA, EL RECUPERADOR DEVUELVE EL OBJETO Y LA MISMA CUENTA LO VUELVE A USAR ════════════════════════ */
console.log('\n── K3c · El objeto vuelve a usarse mientras A está detenida (rescate) ──', reloj());
const a3c = await empezarA();
pasarLaConcesion();
inyeccion.transitorios = 1;
await indice.retirarConIndice(depsRec(), ANA, a3c.m.asset);
inyeccion.transitorios = 0;
const regR = await registroDe(a3c.m.key);
check('K3c el recuperador reclama (L2), el almacén falla una vez y devuelve el objeto: candidato, con un intento contado, y los bytes siguen',
  a3c.premisa && regR?.estado === 'candidato' && regR?.intentosDeBorrado === 1 && (await existe(a3c.m.key)) && llamadasDe(a3c.m.key) === 1,
  `estado=${regR?.estado} · intentos=${regR?.intentosDeBorrado}`);
const nueva3c = await creaMaterial(ANA, a3c.m.key);
const regN = await registroDe(a3c.m.key);
check('K3c ANA vuelve a usar el objeto con un material nuevo: rescatado a guardado, con una fila viva nueva y otra versión',
  !!nueva3c?.assetId && nueva3c.assetId !== a3c.m.asset && regN?.estado === 'guardado' && (await vivasDe(a3c.m.key)).length === 1 && regN?.version > a3c.L1.esperado.version,
  `estado=${regN?.estado} · versión=${regN?.version} · filas vivas=${(await vivasDe(a3c.m.key)).length}`);
const antes3c = JSON.stringify(regN);
const llamadas3c = llamadasDe(a3c.m.key);
const r3c = await soltarA(a3c);
check('K3c A despierta con L1: NO borra unos bytes que ANA volvió a usar; el objeto, la fila nueva y el registro quedan intactos',
  rechazadaPor(r3c, 'concesion_perdida') && llamadasDe(a3c.m.key) === llamadas3c && borradosDe(a3c.m.key) === 0 && (await existe(a3c.m.key))
    && (await vivasDe(a3c.m.key)).length === 1 && JSON.stringify(await registroDe(a3c.m.key)) === antes3c,
  `peticiones nuevas=${llamadasDe(a3c.m.key) - llamadas3c} · objeto=${(await existe(a3c.m.key)) ? 'sigue' : 'BORRADO'} · ${motivosDe(r3c)}`);

/* ═══ K4 · L2 SE COMPLETA Y EL RECUPERADOR ANTIGUO VUELVE ═════════════════════════════════════════════════════════ */
console.log('\n── K4 · L2 se completa y A vuelve ──', reloj());
const a4 = await empezarA();
pasarLaConcesion();
await indice.retirarConIndice(depsRec(), ANA, a4.m.asset);
check('K4 el recuperador nuevo completa legítimamente: un borrado efectivo y el registro borrado', a4.premisa && borradosDe(a4.m.key) === 1 && (await registroDe(a4.m.key))?.estado === 'borrado');
const antes4 = JSON.stringify(await registroDe(a4.m.key));
const llamadas4 = llamadasDe(a4.m.key);
const r4 = await soltarA(a4);
check('K4 A despierta con L1: ninguna petición nueva y el registro sigue borrado, byte a byte', llamadasDe(a4.m.key) === llamadas4 && JSON.stringify(await registroDe(a4.m.key)) === antes4
  && rechazadaPor(r4, 'concesion_perdida'), `peticiones=${llamadasDe(a4.m.key)} · ${motivosDe(r4)}`);
const c4 = await indice.cerrarBorrado(depsRec(), a4.m.objectRef, ANA, a4.L1.concesionId, a4.L1.esperado);
const d4 = await indice.devolverBorrado(depsRec(), a4.m.objectRef, ANA, a4.L1.concesionId, a4.L1.esperado, 'error_transitorio', true);
check('K4 y por el registro tampoco puede cerrar ni devolver: el objeto borrado no se resucita', c4 === false && d4 === false && (await registroDe(a4.m.key))?.estado === 'borrado');
/* A, que no sabe que L2 terminó, deja la marca «pendiente» en la ficha. No es un borrado ni toca el registro: repetir la
 * retirada la limpia sin pedir nada al almacén. */
const marcaDeA4 = (await ficha(a4.m.asset))?.pendingPhysicalDeletion;
await indice.retirarConIndice(depsRec(), ANA, a4.m.asset);
check('K4 la marca pendiente que deja A se limpia al repetir la retirada: sin peticiones nuevas y con el registro igual',
  (await ficha(a4.m.asset))?.pendingPhysicalDeletion !== true && llamadasDe(a4.m.key) === llamadas4 && JSON.stringify(await registroDe(a4.m.key)) === antes4,
  `marca tras A=${marcaDeA4}`);

/* ═══ K5 · LA LECTURA DEL ESTADO FALLA ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── K5 · La lectura del estado falla ──', reloj());
const a5 = await empezarA();
const antes5 = JSON.stringify(await registroDe(a5.m.key));
check('K5 premisa: la concesión de A sigue vigente según el reloj', a5.premisa && (await vigente(a5.m.key)));
const r5 = await soltarA(a5, 'falla');
check('K5 con la concesión vigente pero la lectura fallida, A no borra: la incertidumbre no autoriza', r5.leyo === true && llamadasDe(a5.m.key) === 0 && (await existe(a5.m.key)) && rechazadaPor(r5, 'concesion_perdida'),
  `leyó=${r5.leyo} · peticiones=${llamadasDe(a5.m.key)} · ${motivosDe(r5)}`);
check('K5 el registro no cambia y queda pendiente, recuperable', JSON.stringify(await registroDe(a5.m.key)) === antes5 && (await ficha(a5.m.asset))?.pendingPhysicalDeletion === true);
pasarLaConcesion();
await indice.retirarConIndice(depsRec(), ANA, a5.m.asset);
check('K5 el siguiente recuperador lo completa', !(await existe(a5.m.key)) && (await registroDe(a5.m.key))?.estado === 'borrado');

/* ═══ K5b · LA LECTURA DE LAS REFERENCIAS FALLA ═══════════════════════════════════════════════════════════════════ */
console.log('\n── K5b · La lectura de las referencias falla ──', reloj());
const a5b = await empezarA();
const antes5b = JSON.stringify(await registroDe(a5b.m.key));
check('K5b premisa: la concesión de A sigue vigente según el reloj', a5b.premisa && (await vigente(a5b.m.key)));
const r5b = await soltarA(a5b, 'filas');
check('K5b con la concesión vigente pero sin poder leer las referencias, A no borra: no saber si hay usos no autoriza',
  r5b.leyo === true && llamadasDe(a5b.m.key) === 0 && (await existe(a5b.m.key)) && rechazadaPor(r5b, 'referencias_inciertas'),
  `leyó=${r5b.leyo} · peticiones=${llamadasDe(a5b.m.key)} · ${motivosDe(r5b)}`);
check('K5b el registro no cambia y queda pendiente, recuperable', JSON.stringify(await registroDe(a5b.m.key)) === antes5b && (await ficha(a5b.m.asset))?.pendingPhysicalDeletion === true);
pasarLaConcesion();
await indice.retirarConIndice(depsRec(), ANA, a5b.m.asset);
check('K5b el siguiente recuperador lo completa', !(await existe(a5b.m.key)) && (await registroDe(a5b.m.key))?.estado === 'borrado');

/* ═══ K6 · LA LECTURA DEVUELVE EL REGISTRO INCOMPLETO ═════════════════════════════════════════════════════════════ */
console.log('\n── K6 · La lectura devuelve el registro sin su concesión ──', reloj());
const a6 = await empezarA();
const antes6 = JSON.stringify(await registroDe(a6.m.key));
check('K6 premisa: la concesión de A sigue vigente según el reloj', a6.premisa && (await vigente(a6.m.key)));
const r6 = await soltarA(a6, 'incompleto');
check('K6 con el registro incompleto (sin concesión), A no borra', r6.leyo === true && llamadasDe(a6.m.key) === 0 && (await existe(a6.m.key)) && rechazadaPor(r6, 'concesion_perdida'),
  `leyó=${r6.leyo} · peticiones=${llamadasDe(a6.m.key)} · ${motivosDe(r6)}`);
check('K6 y el registro real no cambia', JSON.stringify(await registroDe(a6.m.key)) === antes6);

/* ═══ K7 · DOS RECUPERADORES Y A, CON EL ORDEN FIJADO POR COMPUERTAS ═════════════════════════════════════════════ */
console.log('\n── K7 · R1 con L2 detenida, R2 y A: el orden lo fijan las compuertas ──', reloj());
const a7 = await empezarA();
pasarLaConcesion();
const r1de7 = await detener(a7.m.asset);
const reg7 = await registroDe(a7.m.key);
check('K7 R1 reclama L2 (otra concesión, otra versión, vigente) y queda detenida antes de pedir el borrado: sin peticiones',
  a7.premisa && r1de7.llego && reg7?.concesion?.id !== a7.L1.concesionId && reg7?.version > a7.L1.esperado.version && (await vigente(a7.m.key)) && llamadasDe(a7.m.key) === 0,
  `L1=${a7.L1.concesionId} · L2=${reg7?.concesion?.id}`);
const r2de7 = await indice.retirarConIndice(depsRec(), ANA, a7.m.asset);
check('K7 R2 llega con L2 vigente y no puede reclamar: queda pendiente por concesión vigente, sin ninguna petición',
  r2de7.status === 'ya_retirado' && r2de7.pendientes === 1 && r2de7.motivos?.concesion_vigente === 1 && llamadasDe(a7.m.key) === 0,
  JSON.stringify(r2de7.motivos));
const rAde7 = await soltarA(a7);
check('K7 A despierta con L1 mientras R1 sostiene L2: rechazada, ninguna petición y el objeto sigue', rechazadaPor(rAde7, 'concesion_perdida') && llamadasDe(a7.m.key) === 0 && (await existe(a7.m.key)),
  motivosDe(rAde7));
r1de7.parada.soltar();
const rR1de7 = await r1de7.promesa;
check('K7 R1 completa: un solo borrado efectivo, una sola petición, y el registro borrado',
  borradosDe(a7.m.key) === 1 && llamadasDe(a7.m.key) === 1 && (await registroDe(a7.m.key))?.estado === 'borrado' && rR1de7.resultado?.pendientes === 0);

/* ═══ K8 · EL BORRADO FÍSICO SE COMPLETÓ PERO EL CIERRE FALLÓ ═════════════════════════════════════════════════════ */
console.log('\n── K8 · El borrado físico se completó y el cierre falló ──', reloj());
const a8 = await empezarA();
pasarLaConcesion();
inyeccion.caeAlCerrar = true;
await indice.retirarConIndice(depsRec(), ANA, a8.m.asset);
inyeccion.caeAlCerrar = false;
const reg8 = await registroDe(a8.m.key);
check('K8 el recuperador nuevo borró los bytes y no pudo cerrar: registro borrando con L2, sin objeto', a8.premisa && !(await existe(a8.m.key)) && reg8?.estado === 'borrando'
  && reg8?.concesion?.id !== a8.L1.concesionId, `L2=${reg8?.concesion?.id}`);
const antes8 = JSON.stringify(reg8);
const llamadas8 = llamadasDe(a8.m.key);
const r8 = await soltarA(a8);
check('K8 A despierta con L1: ninguna petición nueva y el registro no cambia', llamadasDe(a8.m.key) === llamadas8 && JSON.stringify(await registroDe(a8.m.key)) === antes8 && rechazadaPor(r8, 'concesion_perdida'),
  motivosDe(r8));
pasarLaConcesion();
await indice.retirarConIndice(depsRec(), ANA, a8.m.asset);
check('K8 el estado incierto es recuperable: el siguiente recuperador cierra (ya no estaba)', (await registroDe(a8.m.key))?.estado === 'borrado');

/* ═══ K9 · CONSUMIDORES DESCONOCIDOS PARA EL RECUPERADOR NUEVO ════════════════════════════════════════════════════ */
console.log('\n── K9 · Consumidores desconocidos ──', reloj());
const a9 = await empezarA();
pasarLaConcesion();
await indice.retirarConIndice(depsRec({ consumidores: async () => ({ estado: 'desconocido', tipos: ['proyecto'] }) }), ANA, a9.m.asset);
check('K9 con consumidores desconocidos, el recuperador nuevo no reclama ni pide nada', a9.premisa && (await caducada(a9.m.key))
  && (await registroDe(a9.m.key))?.concesion?.id === a9.L1.concesionId && llamadasDe(a9.m.key) === 0);
const antes9 = JSON.stringify(await registroDe(a9.m.key));
const r9 = await soltarA(a9);
check('K9 A despierta con L1 caducada: nadie borra y el registro no cambia', (await existe(a9.m.key)) && llamadasDe(a9.m.key) === 0 && JSON.stringify(await registroDe(a9.m.key)) === antes9
  && rechazadaPor(r9, 'concesion_perdida'), motivosDe(r9));

/* ═══ K10 · CADA CONDICIÓN DE LA COMPROBACIÓN, AISLADA ════════════════════════════════════════════════════════════
 * Con la concesión vigente y el estado, la versión, la cuenta y el registro como los dejó la reclamación, A borra. Aquí se
 * rompe UNA sola cosa por escena (con una escritura directa: son estados contradictorios que ningún flujo produce) y A,
 * que sigue con una concesión vigente y su `id`, no debe pedir el borrado. */
console.log('\n── K10 · Cada condición de la comprobación, aislada ──', reloj());
const aislar = async (etiqueta, descripcion, tocar) => {
  const a = await empezarA();
  const doc = db.collection('mediaObjects').doc(a.m.objectRef);
  await tocar(doc, a);
  const antes = JSON.stringify(await registroDe(a.m.key));
  check(`${etiqueta} premisa: A sigue con la concesión vigente y su id; solo cambia «${descripcion}»`, a.premisa);
  const r = await soltarA(a);
  check(`${etiqueta} con solo «${descripcion}» distinto, A no pide el borrado y el objeto sigue; el registro no cambia`,
    rechazadaPor(r, 'concesion_perdida') && llamadasDe(a.m.key) === 0 && (await existe(a.m.key)) && JSON.stringify(await registroDe(a.m.key)) === antes,
    `peticiones=${llamadasDe(a.m.key)} · ${motivosDe(r)}`);
};
await aislar('K10a', 'el registro ausente', (doc) => doc.delete());
await aislar('K10b', 'la cuenta dueña', (doc) => doc.update({ accountId: BETO }));
await aislar('K10c', 'la versión', async (doc) => doc.update({ version: ((await doc.get()).data().version ?? 0) + 1 }));
await aislar('K10d', 'el estado', (doc) => doc.update({ estado: 'candidato' }));
await aislar('K10e', 'la caducidad ilegible', (doc) => doc.update({ 'concesion.hasta': 'ilegible' }));

/* ═══ K11 · LA RECONCILIACIÓN MARCA EL OBJETO MIENTRAS A TIENE LA CONCESIÓN VIGENTE ═══════════════════════════════
 * La marca de la reconciliación no sube la versión ni toca la concesión (MC-9, M7): el token de A sigue siendo válido. El
 * objeto, sin embargo, ya no es «uno que se pueda borrar». Va el último: la pasada repara la cuenta entera. */
console.log('\n── K11 · La reconciliación marca el objeto con la concesión vigente ──', reloj());
const a11 = await empezarA();
const fila11 = await filaVivaDeOtraCuenta(BETO, a11.m.key);
await indice.reconciliarIndiceDeCuentaEnFirestore(depsRec(), ANA, { graciaDeHuerfanoMs: 0 });
const reg11 = await registroDe(a11.m.key);
check('K11 la reconciliación marca el objeto en borrando y NO sube la versión ni toca la concesión: el token de A sigue siendo válido',
  a11.premisa && (reg11?.marcas ?? []).length > 0 && reg11?.estado === 'borrando' && reg11?.version === a11.L1.esperado.version && reg11?.concesion?.id === a11.L1.concesionId
    && (await vigente(a11.m.key)), `marcas=${JSON.stringify(reg11?.marcas)} · versión=${reg11?.version}`);
await apagarFila(a11.m.key, fila11);
check('K11 se apaga la fila ajena para que solo quede la marca: ya no hay ninguna fila viva', (await vivasDe(a11.m.key)).length === 0);
const antes11 = JSON.stringify(await registroDe(a11.m.key));
const r11 = await soltarA(a11);
check('K11 A despierta con L1 vigente y NO borra: la reconciliación marcó el objeto; el objeto y el registro quedan intactos',
  rechazadaPor(r11, 'marcado') && llamadasDe(a11.m.key) === 0 && (await existe(a11.m.key)) && JSON.stringify(await registroDe(a11.m.key)) === antes11,
  `peticiones=${llamadasDe(a11.m.key)} · objeto=${(await existe(a11.m.key)) ? 'sigue' : 'BORRADO'} · ${motivosDe(r11)}`);

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`, reloj());
process.exit(fallos ? 1 : 0);
