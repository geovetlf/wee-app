/*
 * UN LEASE ANTIGUO NO ACTÚA SOBRE UNA RECLAMACIÓN NUEVA (cierre técnico de almacenamiento).
 *
 * EL MECANISMO REAL (no se inventa ninguno). Reclamar un objeto (`reclamarParaBorrar`, T2) lo pasa a `borrando` y le
 * escribe una concesión `{ id, hasta }` y una versión nueva. Ese par —el `id` de la concesión y la `version` del registro—
 * es el token que exigen `cerrarBorrado` y `devolverBorrado`: con otro `id` o con otra versión no escriben nada. `hasta` la
 * usa `reclamar` para dejar que OTRO reclame cuando caduca. Quien la sostiene, hasta ahora, no la miraba antes de pedir el
 * borrado físico al almacén, y el almacén no sabe de concesiones.
 *
 * LA SECUENCIA. No se puede «reanudar» una llamada caída, pero sí detener a A de forma determinista JUSTO después de que su
 * reclamación se confirme (una compuerta en la frontera de la transacción de reclamar, con una promesa que la prueba abre):
 *
 *   1. A reclama legítimamente y obtiene L1 (concesión + versión). La prueba la lee del registro.
 *   2. A queda detenida ANTES de pedir el borrado físico. Mientras tanto, el reloj inyectado pasa la caducidad de L1.
 *   3. El flujo real de recuperación (repetir la retirada) reclama de nuevo y genera L2. Para que L2 siga vigente, ese
 *      recuperador cae justo después de reclamar (el mismo punto de caída que usa la suite de recuperación).
 *   4. A despierta con L1 e intenta continuar: pedir el borrado físico, cerrar, devolver. Debe quedar rechazada, sin ninguna
 *      petición al almacén ni cambio en el registro, y L2 sigue siendo procesable por su propietario.
 *
 * Los escenarios (cada uno con su objeto):
 *   K0  control: con la concesión vigente, A completa el borrado (la comprobación nueva no estorba al camino normal)
 *   K1  justo ANTES de la transición: L1 caducó y nadie reclamó todavía → A no borra; queda pendiente y recuperable
 *   K2  justo DESPUÉS: L2 vigente → A no borra; L1 reintentada tres veces no cierra ni devuelve; L2 la completa su dueño
 *   K3  el objeto sigue siendo necesario (referencia viva de otra cuenta) → A no lo borra
 *   K4  L2 se completa y A vuelve → no toca nada, ni resucita el objeto
 *   K5  la lectura del estado falla → A no borra (la incertidumbre no autoriza); queda recuperable
 *   K6  la lectura devuelve el registro incompleto (sin concesión) → A no borra
 *   K7  dos recuperadores compiten y A despierta → un solo borrado efectivo
 *   K8  el borrado físico se completó pero el cierre falló, y A despierta → A no actúa; el siguiente recuperador cierra
 *   K9  consumidores desconocidos para el recuperador nuevo y A caducada → nadie borra
 *
 * Límites declarados. El emulador NO hace cumplir `ifGenerationMatch`, y esta suite no lo usa como protección. El almacén no
 * conoce las concesiones: la comprobación es del que sostiene la concesión, justo antes de pedir el borrado. Deja una
 * ventana mínima entre la comprobación y la petición (y la duración de la propia petición) que solo se cierra del lado del
 * almacén; aquí no se demuestra. La detención de A es una compuerta de prueba, no un fallo del proceso real.
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
const DURACION_DE_CONCESION_MS = 10_000;
const pasarLaConcesion = () => { desplazamiento += DURACION_DE_CONCESION_MS + 1000; };

/* ── El puerto del almacén, instrumentado: cuenta las peticiones y los borrados efectivos ───────────────────────────── */
const inyeccion = { caeAntesDelPuerto: false, caeAlCerrar: false, paradaTrasReclamar: null };
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

/* Una referencia viva de OTRA cuenta sobre el objeto: estado contradictorio que la creación no produce. */
const filaVivaDeOtraCuenta = async (owner, key) => {
  const id = `asset_${(++seq + 0x4000).toString(16).padStart(32, '0')}`;
  const refId = `material_${id}_original`;
  await db.collection('mediaObjects').doc(objRef(key)).collection('referencias').doc(refId).set({
    refId, clase: 'material', assetId: id, pieza: 'original', viva: true, ownerAccountId: owner, objectRef: objRef(key),
    desdeAt: Date.now(), actualizadoAt: Date.now(),
  });
  return refId;
};

/* El punto de caída del recuperador: reclama y cae antes de pedir el borrado (deja su concesión vigente). */
const caerTrasReclamar = async (fn) => {
  inyeccion.caeAntesDelPuerto = true;
  try { await fn(); } catch { /* caída simulada */ }
  inyeccion.caeAntesDelPuerto = false;
};

/* A: una retirada que reclama (L1) y se DETIENE justo después, antes de pedir el borrado físico. */
const empezarA = async () => {
  const m = await materialDe(ANA);
  const parada = {};
  const alcanzadaP = new Promise((r) => { parada.alcanzada = r; });
  parada.puerta = new Promise((r) => { parada.soltar = r; });
  inyeccion.paradaTrasReclamar = parada;
  const promesaA = indice.retirarConIndice(depsRec(), ANA, m.asset).then((resultado) => ({ resultado }), (error) => ({ error }));
  const llego = await conTope(alcanzadaP, 10_000);
  inyeccion.paradaTrasReclamar = null;
  const reg = await registroDe(m.key);
  return {
    m, parada, promesaA, llego: llego?.tope !== true,
    L1: { concesionId: reg?.concesion?.id, esperado: { estado: 'borrando', version: reg?.version }, hasta: reg?.concesion?.hasta },
  };
};
/* A despierta con su L1. `modo` arma, solo para este despertar, un fallo o un registro incompleto en la lectura previa. */
const soltarA = async (a, modo) => {
  if (modo) hookLectura.plan = { ruta: `mediaObjects/${a.m.objectRef}`, modo, consumida: false };
  const plan = hookLectura.plan;
  a.parada.soltar();
  const r = await a.promesaA;
  const leyo = plan ? plan.consumida === true : undefined;
  hookLectura.plan = null;
  return { ...r, leyo };
};
const deA = (a) => ({ ref: refWee(a.m.key), L1: a.L1 });

/* ── Flag: las dos cuentas dentro de la cobertura del índice ───────────────────────────────────────────────────── */
await db.collection('aiSettings').doc('almacenActivos').set({ habilitado: true, cuentas: [ANA, BETO], coberturaDesde: 0 });
await esperar(core.MARGEN_DE_RELOJ_DE_COBERTURA_MS + 1500);

/* ═══ K0 · CONTROL: CON LA CONCESIÓN VIGENTE, A COMPLETA EL BORRADO ══════════════════════════════════════════════ */
console.log('\n── K0 · Control: la concesión vigente no se estorba ──', reloj());
const a0 = await empezarA();
check('K0 A reclama (L1) y queda detenida antes de pedir el borrado: registro borrando con su concesión, sin peticiones',
  a0.llego && (await registroDe(a0.m.key))?.estado === 'borrando' && typeof a0.L1.concesionId === 'string' && llamadasDe(a0.m.key) === 0 && (await existe(a0.m.key)));
const r0 = await soltarA(a0);
check('K0 con la concesión vigente, A pide el borrado y cierra: el camino normal sigue funcionando',
  !(await existe(a0.m.key)) && (await registroDe(a0.m.key))?.estado === 'borrado' && borradosDe(a0.m.key) === 1 && r0.resultado?.pendientes === 0,
  `estado=${(await registroDe(a0.m.key))?.estado} · peticiones=${llamadasDe(a0.m.key)}`);

/* ═══ K1 · JUSTO ANTES DE LA TRANSICIÓN: L1 CADUCÓ Y NADIE RECLAMÓ TODAVÍA ═════════════════════════════════════ */
console.log('\n── K1 · Justo antes: L1 caducada, sin L2 ──', reloj());
const a1 = await empezarA();
pasarLaConcesion();
const antes1 = JSON.stringify(await registroDe(a1.m.key));
const r1 = await soltarA(a1);
check('K1 A despierta con L1 caducada: no pide ningún borrado y el objeto sigue en el almacén', llamadasDe(a1.m.key) === 0 && (await existe(a1.m.key)),
  `peticiones=${llamadasDe(a1.m.key)} · objeto=${(await existe(a1.m.key)) ? 'sigue' : 'BORRADO'} · registro=${(await registroDe(a1.m.key))?.estado}`);
check('K1 el registro no cambia (sigue borrando con L1) y queda pendiente, recuperable', JSON.stringify(await registroDe(a1.m.key)) === antes1
  && (await ficha(a1.m.asset))?.pendingPhysicalDeletion === true && r1.resultado?.pendientes === 1);
await indice.retirarConIndice(depsRec(), ANA, a1.m.asset);
check('K1 la recuperación posterior sí lo completa', !(await existe(a1.m.key)) && (await registroDe(a1.m.key))?.estado === 'borrado' && borradosDe(a1.m.key) === 1);

/* ═══ K2 · JUSTO DESPUÉS: L2 VIGENTE ═══════════════════════════════════════════════════════════════════════════════ */
console.log('\n── K2 · Justo después: L2 vigente ──', reloj());
const a2 = await empezarA();
pasarLaConcesion();
await caerTrasReclamar(() => indice.retirarConIndice(depsRec(), ANA, a2.m.asset));
const reg2 = await registroDe(a2.m.key);
check('K2 el recuperador nuevo reclama: otra concesión, otra versión, y vigente', reg2?.estado === 'borrando' && reg2?.concesion?.id !== a2.L1.concesionId
  && reg2?.version > a2.L1.esperado.version && reg2?.concesion?.hasta > ahora(), `L1=${a2.L1.concesionId} · L2=${reg2?.concesion?.id}`);
const antes2 = JSON.stringify(reg2);
const r2 = await soltarA(a2);
check('K2 A despierta con L1 y no pide ningún borrado: el objeto y el registro quedan intactos', llamadasDe(a2.m.key) === 0 && (await existe(a2.m.key))
  && JSON.stringify(await registroDe(a2.m.key)) === antes2, `peticiones=${llamadasDe(a2.m.key)}`);
const { ref: ref2, L1: L1de2 } = deA(a2);
let rechazadas2 = true;
for (let i = 0; i < 3; i++) {
  const c = await indice.cerrarBorrado(depsRec(), a2.m.objectRef, ANA, L1de2.concesionId, L1de2.esperado);
  const d = await indice.devolverBorrado(depsRec(), a2.m.objectRef, ANA, L1de2.concesionId, L1de2.esperado, 'error_transitorio', true);
  if (c !== false || d !== false) rechazadas2 = false;
}
check('K2 L1 se reintenta tres veces: no cierra ni devuelve la reclamación nueva, y no cuenta ningún intento',
  rechazadas2 && JSON.stringify(await registroDe(a2.m.key)) === antes2 && (r2.resultado?.pendientes ?? 1) === 1);
const borrado2 = await puertoInstrumentado.borrar(ref2, { generacion: reg2.generacion });
const cierre2 = await indice.cerrarBorrado(depsRec(), a2.m.objectRef, ANA, reg2.concesion.id, { estado: 'borrando', version: reg2.version });
check('K2 L2 sigue siendo procesable por su propietario: pide el borrado, cierra, y queda borrado',
  borrado2.ok && cierre2 === true && (await registroDe(a2.m.key))?.estado === 'borrado' && !(await existe(a2.m.key)));
const antesFin2 = JSON.stringify(await registroDe(a2.m.key));
const cFin = await indice.cerrarBorrado(depsRec(), a2.m.objectRef, ANA, L1de2.concesionId, L1de2.esperado);
const dFin = await indice.devolverBorrado(depsRec(), a2.m.objectRef, ANA, L1de2.concesionId, L1de2.esperado, 'error_transitorio', true);
check('K2 con L2 ya completada, el recuperador antiguo vuelve a intentarlo: no resucita ni reescribe nada',
  cFin === false && dFin === false && JSON.stringify(await registroDe(a2.m.key)) === antesFin2);

/* ═══ K3 · EL OBJETO SIGUE SIENDO NECESARIO ═══════════════════════════════════════════════════════════════════════ */
console.log('\n── K3 · El objeto sigue siendo necesario: referencia viva de otra cuenta ──', reloj());
const a3 = await empezarA();
await filaVivaDeOtraCuenta(BETO, a3.m.key);
pasarLaConcesion();
await indice.retirarConIndice(depsRec(), ANA, a3.m.asset);
const reg3 = await registroDe(a3.m.key);
check('K3 con una referencia viva ajena, el recuperador nuevo no reclama: no hay L2 y no hay peticiones', reg3?.concesion?.id === a3.L1.concesionId && llamadasDe(a3.m.key) === 0);
const antes3 = JSON.stringify(reg3);
await soltarA(a3);
check('K3 A despierta con L1 caducada y NO borra un objeto referenciado: el objeto y la referencia siguen', (await existe(a3.m.key)) && llamadasDe(a3.m.key) === 0
  && (await vivasDe(a3.m.key)).length === 1 && JSON.stringify(await registroDe(a3.m.key)) === antes3,
  `peticiones=${llamadasDe(a3.m.key)} · objeto=${(await existe(a3.m.key)) ? 'sigue' : 'BORRADO'} · registro=${(await registroDe(a3.m.key))?.estado} · filas vivas=${(await vivasDe(a3.m.key)).length}`);

/* ═══ K4 · L2 SE COMPLETA Y EL RECUPERADOR ANTIGUO VUELVE ═════════════════════════════════════════════════════════ */
console.log('\n── K4 · L2 se completa y A vuelve ──', reloj());
const a4 = await empezarA();
pasarLaConcesion();
await indice.retirarConIndice(depsRec(), ANA, a4.m.asset);
check('K4 el recuperador nuevo completa legítimamente: un borrado efectivo y el registro borrado', borradosDe(a4.m.key) === 1 && (await registroDe(a4.m.key))?.estado === 'borrado');
const antes4 = JSON.stringify(await registroDe(a4.m.key));
const llamadas4 = llamadasDe(a4.m.key);
await soltarA(a4);
check('K4 A despierta con L1: ninguna petición nueva y el registro sigue borrado, byte a byte', llamadasDe(a4.m.key) === llamadas4 && JSON.stringify(await registroDe(a4.m.key)) === antes4,
  `peticiones=${llamadasDe(a4.m.key)}`);
const c4 = await indice.cerrarBorrado(depsRec(), a4.m.objectRef, ANA, a4.L1.concesionId, a4.L1.esperado);
const d4 = await indice.devolverBorrado(depsRec(), a4.m.objectRef, ANA, a4.L1.concesionId, a4.L1.esperado, 'error_transitorio', true);
check('K4 y por el registro tampoco puede cerrar ni devolver: el objeto borrado no se resucita', c4 === false && d4 === false && (await registroDe(a4.m.key))?.estado === 'borrado');

/* ═══ K5 · LA LECTURA DEL ESTADO FALLA ════════════════════════════════════════════════════════════════════════════ */
console.log('\n── K5 · La lectura del estado falla ──', reloj());
const a5 = await empezarA();
const antes5 = JSON.stringify(await registroDe(a5.m.key));
const r5 = await soltarA(a5, 'falla');
check('K5 con la concesión vigente pero la lectura fallida, A no borra: la incertidumbre no autoriza', r5.leyo === true && llamadasDe(a5.m.key) === 0 && (await existe(a5.m.key)),
  `leyó=${r5.leyo} · peticiones=${llamadasDe(a5.m.key)}`);
check('K5 el registro no cambia y queda pendiente, recuperable', JSON.stringify(await registroDe(a5.m.key)) === antes5 && (await ficha(a5.m.asset))?.pendingPhysicalDeletion === true);
pasarLaConcesion();
await indice.retirarConIndice(depsRec(), ANA, a5.m.asset);
check('K5 el siguiente recuperador lo completa', !(await existe(a5.m.key)) && (await registroDe(a5.m.key))?.estado === 'borrado');

/* ═══ K6 · LA LECTURA DEVUELVE EL REGISTRO INCOMPLETO ═════════════════════════════════════════════════════════════ */
console.log('\n── K6 · La lectura devuelve el registro sin su concesión ──', reloj());
const a6 = await empezarA();
const antes6 = JSON.stringify(await registroDe(a6.m.key));
const r6 = await soltarA(a6, 'incompleto');
check('K6 con el registro incompleto (sin concesión), A no borra', r6.leyo === true && llamadasDe(a6.m.key) === 0 && (await existe(a6.m.key)),
  `leyó=${r6.leyo} · peticiones=${llamadasDe(a6.m.key)}`);
check('K6 y el registro real no cambia', JSON.stringify(await registroDe(a6.m.key)) === antes6);

/* ═══ K7 · DOS RECUPERADORES COMPITEN Y A DESPIERTA ═══════════════════════════════════════════════════════════════ */
console.log('\n── K7 · Dos recuperadores compiten ──', reloj());
const a7 = await empezarA();
pasarLaConcesion();
await Promise.all([indice.retirarConIndice(depsRec(), ANA, a7.m.asset), indice.retirarConIndice(depsRec(), ANA, a7.m.asset)]);
check('K7 dos recuperadores a la vez: un solo borrado efectivo, una sola petición, y el registro borrado',
  borradosDe(a7.m.key) === 1 && llamadasDe(a7.m.key) === 1 && (await registroDe(a7.m.key))?.estado === 'borrado', `peticiones=${llamadasDe(a7.m.key)}`);
await soltarA(a7);
check('K7 y A, al despertar, no añade ninguna petición', llamadasDe(a7.m.key) === 1 && borradosDe(a7.m.key) === 1);

/* ═══ K8 · EL BORRADO FÍSICO SE COMPLETÓ PERO EL CIERRE FALLÓ ═════════════════════════════════════════════════════ */
console.log('\n── K8 · El borrado físico se completó y el cierre falló ──', reloj());
const a8 = await empezarA();
pasarLaConcesion();
inyeccion.caeAlCerrar = true;
await indice.retirarConIndice(depsRec(), ANA, a8.m.asset);
inyeccion.caeAlCerrar = false;
const reg8 = await registroDe(a8.m.key);
check('K8 el recuperador nuevo borró los bytes y no pudo cerrar: registro borrando con L2, sin objeto', !(await existe(a8.m.key)) && reg8?.estado === 'borrando'
  && reg8?.concesion?.id !== a8.L1.concesionId, `L2=${reg8?.concesion?.id}`);
const antes8 = JSON.stringify(reg8);
const llamadas8 = llamadasDe(a8.m.key);
await soltarA(a8);
check('K8 A despierta con L1: ninguna petición nueva y el registro no cambia', llamadasDe(a8.m.key) === llamadas8 && JSON.stringify(await registroDe(a8.m.key)) === antes8);
pasarLaConcesion();
await indice.retirarConIndice(depsRec(), ANA, a8.m.asset);
check('K8 el estado incierto es recuperable: el siguiente recuperador cierra (ya no estaba)', (await registroDe(a8.m.key))?.estado === 'borrado');

/* ═══ K9 · CONSUMIDORES DESCONOCIDOS PARA EL RECUPERADOR NUEVO ════════════════════════════════════════════════════ */
console.log('\n── K9 · Consumidores desconocidos ──', reloj());
const a9 = await empezarA();
pasarLaConcesion();
await indice.retirarConIndice(depsRec({ consumidores: async () => ({ estado: 'desconocido', tipos: ['proyecto'] }) }), ANA, a9.m.asset);
check('K9 con consumidores desconocidos, el recuperador nuevo no reclama ni pide nada', (await registroDe(a9.m.key))?.concesion?.id === a9.L1.concesionId && llamadasDe(a9.m.key) === 0);
const antes9 = JSON.stringify(await registroDe(a9.m.key));
await soltarA(a9);
check('K9 A despierta con L1 caducada: nadie borra y el registro no cambia', (await existe(a9.m.key)) && llamadasDe(a9.m.key) === 0 && JSON.stringify(await registroDe(a9.m.key)) === antes9);

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`, reloj());
process.exit(fallos ? 1 : 0);
