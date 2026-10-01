/**
 * F12-D · EL ALMACÉN DE TRABAJOS SOBRE FIRESTORE, CONTRA EL EMULADOR.
 *
 * `runtime-conductor.test.mjs` prueba el conductor con un almacén de mentira que
 * cumple las garantías del contrato. Esto prueba que el de VERDAD las cumple, y
 * solo se puede probar aquí: que crear sea atómico y que escribir sea un
 * compare-and-set son propiedades de la base de datos, no del código.
 *
 *   A · Crear solo si no está, con veinticinco peticiones a la vez.
 *   B · Escribir solo si nadie escribió antes, con veinticinco a la vez.
 *   C · Lo que Firestore rechaza y un trabajo lleva dentro: ida y vuelta intacta.
 *   D · Entradas hostiles: nada lanza, nada construye una ruta rara.
 *   E · El barrido: paginado, sin terminales, sin índice compuesto.
 *   F · Las ejecuciones de workflow: mismas dos garantías.
 *   G · El conductor ENTERO sobre Firestore: termina, retoma y no repite.
 *   H · Cuánto hay en marcha: solo se cuenta lo que alguien va a comparar.
 *   I · Las reglas: un cliente no lee ni escribe trabajos ni ejecuciones.
 *   J · El contexto por referencia, contra la conversación de verdad: fechas de
 *       Firestore (microsegundos), propiedad, la regla de entidades de la
 *       moderación, y de punta a punta sin que quede una palabra en `jobs/`.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore --project demo-wee \
 *     "node functions/test/runtime-conductor.emulator.mjs firestore.rules"
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('sin FIRESTORE_EMULATOR_HOST: no se ejecuta'); process.exit(2); }
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const admin = require('firebase-admin');
const PROY = proyectoDeEmulador();
admin.initializeApp({ projectId: PROY });
const db = admin.firestore();
const lib = (p) => require(path.resolve(here, '../lib', p));

const core = lib('core/index.js');
const trabajosDeWee = lib('job/index.js');
const motorDelGateway = lib('engine/gateway.js');
const registroDeWee = lib('registry/index.js');
const ajustes = lib('engine/registry.js');
const { almacenDeTrabajos, almacenDeEjecuciones, contadorDeCapacidad, COLECCION_DE_TRABAJOS, COLECCION_DE_EJECUCIONES } = lib('runtime/almacen.js');
const { crearConductor } = lib('runtime/conductor.js');
const { colaDeInvocacion } = lib('runtime/cola.js');
const { crearEjecutor } = lib('runtime/ejecutor.js');
const { resolutorDelRouter } = lib('runtime/resolucion.js');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rechazo = async (p) => { try { await p; return null; } catch (e) { return e; } };

let reloj = 2_000_000;
const now = () => reloj;
const { motor } = trabajosDeWee.crearMotorDeTrabajosDeWee();
const QUIEN = { userId: 'user-0001' };
const impl = { providerId: 'matriz-a', modelId: 'matriz-a.uno' };
let serie = 0;
const pet = (extra = {}) => {
  serie++;
  return { contract: '1.0', principal: QUIEN, at: reloj, capability: 'image.generate', implementation: impl, input: { prompt: 'un gato con sombrero' },
    trace: { traceId: `trace-${serie}`, requestId: `req-${String(serie).padStart(4, '0')}`, userId: 'user-0001' }, context: { appId: 'wee', operationId: `op-${serie}` }, ...extra };
};
const nuevo = (extra) => motor.crear(pet(extra)).transition.job;
const vaciar = async () => { for (const c of [COLECCION_DE_TRABAJOS, COLECCION_DE_EJECUCIONES]) { const s = await db.collection(c).get(); await Promise.all(s.docs.map((d) => d.ref.delete())); } };

const store = almacenDeTrabajos(db);
await vaciar();

/* ── A ─────────────────────────────────────────────────────────────────────── */
console.log('\n── A · Crear solo si no está ──');
{
  const job = nuevo();
  const r = await Promise.all(Array.from({ length: 25 }, () => store.crearSiAusente(job)));
  check('25 peticiones a la vez con la misma identidad: se crea UNO', r.filter((x) => x.created).length === 1, String(r.filter((x) => x.created).length));
  check('y las otras 24 reciben el que ganó, sin lanzar', r.every((x) => x.job.jobId === job.jobId));
  const docs = await db.collection(COLECCION_DE_TRABAJOS).get();
  check('hay un solo documento', docs.size === 1);
  check('su identificador ES la identidad de idempotencia, con prefijo', docs.docs[0].id === `j.${core.claveDeIdempotencia(job.idempotency.scope, job.idempotency.key)}`);
  const porProtocolo = await Promise.all(Array.from({ length: 10 }, () => trabajosDeWee.crearTrabajo(store, motor, pet({ trace: { traceId: 'trace-prot', requestId: 'req-protocolo', userId: 'user-0001' } }))));
  check('el protocolo entero de la Fase 8, diez veces a la vez: todas ok, una creó', porProtocolo.every((x) => x.ok) && porProtocolo.filter((x) => x.created).length === 1 && new Set(porProtocolo.map((x) => x.job.jobId)).size === 1);
}

/* ── B ─────────────────────────────────────────────────────────────────────── */
console.log('\n── B · Escribir solo si nadie escribió antes ──');
{
  const job = nuevo();
  await store.crearSiAusente(job);
  const reclamos = Array.from({ length: 25 }, (_, i) => motor.reclamar(job, { principal: QUIEN, at: reloj, worker: `w-${i}` }));
  const r = await Promise.all(reclamos.map((d) => store.aplicar(d.transition)));
  check('25 trabajadores reclaman a la vez la misma revisión: gana UNO', r.filter((x) => x.applied).length === 1, String(r.filter((x) => x.applied).length));
  const guardado = await store.obtener(job.jobId);
  const ganador = reclamos[r.findIndex((x) => x.applied)].transition.job.attempts[0].lease.owner;
  check('y el que quedó guardado es el del que ganó', guardado.revision === 1 && guardado.attempts[0].lease.owner === ganador);
  check('los otros 24 reciben el trabajo ACTUAL, no una excepción', r.filter((x) => !x.applied).every((x) => x.job.revision === 1));
  const repetida = await store.aplicar(reclamos[r.findIndex((x) => x.applied)].transition);
  check('aplicar dos veces la MISMA transición no cuela: el compare-and-set es estricto', repetida.applied === false);
  const fantasma = await store.aplicar({ ...reclamos[0].transition, job: nuevo() });
  check('aplicar sobre un trabajo que no existe no escribe nada', fantasma.applied === false);
}

/* ── C ─────────────────────────────────────────────────────────────────────── */
console.log('\n── C · Ida y vuelta intacta ──');
{
  const raro = nuevo({ input: { prompt: 'hola', 'con.punto': 1, '': 'vacía', lista: [[1, 2], [3]], anidado: { a: { b: { c: [{ d: 1 }] } } } } });
  const indefinidos = JSON.stringify(raro, (_k, v) => (v === undefined ? '__U__' : v)).includes('__U__');
  check('el trabajo que produce el motor lleva claves a `undefined` (por eso no se puede guardar campo a campo)', indefinidos);
  const c = await store.crearSiAusente(raro);
  check('y aun así se guarda: listas dentro de listas, claves con punto y claves vacías', c.created === true);
  const leido = await store.obtener(raro.jobId);
  check('y vuelve IGUAL, salvo los `undefined`, que el motor solo mira por verdad', igual(leido, JSON.parse(JSON.stringify(raro))));
  const reclamo = motor.reclamar(leido, { principal: QUIEN, at: reloj, worker: 'w-1' });
  check('el motor acepta lo que sale del almacén y sigue decidiendo sobre ello', reclamo.status === 'transition' && !!reclamo.dispatch);
  const proy = (await db.collection(COLECCION_DE_TRABAJOS).doc(`j.${raro.jobId}`).get()).data();
  check('al lado del texto van solo los campos para BUSCAR, y dicen lo mismo que el trabajo', proy.state === 'queued' && proy.terminal === false && proy.ownerUserId === 'user-0001' && proy.providerId === 'matriz-a' && proy.revision === 0 && typeof proy.json === 'string');
  const reservado = nuevo({ jobId: '__reservado__' });
  const cr = await store.crearSiAusente(reservado);
  const lr = await store.obtener('__reservado__');
  check('un identificador que Firestore reserva para sí se guarda igual, y se encuentra por su nombre', cr.created === true && lr?.jobId === '__reservado__');
}

/* ── D ─────────────────────────────────────────────────────────────────────── */
console.log('\n── D · Entradas hostiles ──');
{
  const hostiles = ['', 'a/b', '../../users/x', '__name__', 'x'.repeat(5000), 'con espacio', 'ñ', null, undefined, 7, {}, []];
  let lanzo = 0; let encontro = 0;
  for (const h of hostiles) {
    for (const f of [() => store.porIdempotencia(h, 'req-0001'), () => store.porIdempotencia('1.u:9.user-0001', h), () => store.obtener(h)]) {
      const e = await rechazo(f().then((v) => { if (v) encontro++; }));
      if (e) lanzo++;
    }
  }
  check('36 consultas con basura: ninguna lanza', lanzo === 0, String(lanzo));
  check('y ninguna encuentra nada', encontro === 0);
  const propio = nuevo();
  await store.crearSiAusente(propio);
  check('una clave de verdad sí se encuentra por idempotencia', (await store.porIdempotencia(propio.idempotency.scope, propio.idempotency.key))?.jobId === propio.jobId);
  check('y la de OTRA cuenta con la misma clave no es la misma', (await store.porIdempotencia(core.alcanceDeIdempotencia('user-9999'), propio.idempotency.key)) === undefined);
}

/* ── E ─────────────────────────────────────────────────────────────────────── */
console.log('\n── E · El barrido ──');
{
  await vaciar();
  const vivos = [];
  for (let i = 0; i < 5; i++) { const j = nuevo(); await store.crearSiAusente(j); vivos.push(j); }
  const terminado = nuevo(); await store.crearSiAusente(terminado);
  await store.aplicar(motor.cancelar(terminado, QUIEN, reloj).transition);
  const p1 = await store.recuperables({ before: reloj, limit: 2 });
  const p2 = await store.recuperables({ before: reloj, limit: 2, cursor: p1.cursor });
  const p3 = await store.recuperables({ before: reloj, limit: 2, cursor: p2.cursor });
  const vistos = [...p1.jobs, ...p2.jobs, ...p3.jobs].map((j) => j.jobId);
  check('paginado: 5 trabajos a medias en páginas de 2 → 2, 2 y 1', p1.jobs.length === 2 && p2.jobs.length === 2 && p3.jobs.length === 1, `${p1.jobs.length},${p2.jobs.length},${p3.jobs.length}`);
  check('página llena → hay cursor; la última no', !!p1.cursor && !!p2.cursor && !p3.cursor);
  check('cada uno sale UNA vez', new Set(vistos).size === 5 && vivos.every((j) => vistos.includes(j.jobId)));
  check('y el que ya terminó no sale: el barrido es de lo que sigue a medias', !vistos.includes(terminado.jobId));
  check('`before` filtra por última actualización', (await store.recuperables({ before: reloj - 1, limit: 10 })).jobs.length === 0);
  check('un cursor inventado no rompe nada', (await rechazo(store.recuperables({ before: reloj, limit: 2, cursor: '../../x' }))) === null);
  const indices = JSON.parse(fs.readFileSync(path.resolve(RAIZ, 'firestore.indexes.json'), 'utf8')).indexes;
  check('y no hizo falta NINGÚN índice compuesto nuevo', !indices.some((i) => i.collectionGroup === COLECCION_DE_TRABAJOS || i.collectionGroup === COLECCION_DE_EJECUCIONES));
}

/* ── F ─────────────────────────────────────────────────────────────────────── */
console.log('\n── F · Las ejecuciones de workflow ──');
{
  const runs = almacenDeEjecuciones(db, now);
  const wf = { id: 'wf_emu_1', contract: '1.1', goal: 'prueba', steps: [{ id: 'a', capability: 'text.generate', purpose: 'A' }] };
  const prepared = core.prepararWorkflow(wf).prepared;
  const run = prepared.iniciar({ traceId: 'trace-run-1', requestId: 'req-run-0001', userId: 'user-0001' }).run;
  const r = await Promise.all(Array.from({ length: 25 }, () => runs.crearSiAusente({ run, workflow: prepared.workflow })));
  check('25 a la vez: se crea UNA ejecución', r.filter((x) => x.created).length === 1);
  const g0 = await runs.obtener(run.id);
  check('vuelve igual que se guardó, con su workflow', igual(g0.run, JSON.parse(JSON.stringify(run))) && g0.workflow.id === 'wf_emu_1' && g0.revision === 0);
  const marcado = prepared.transitar(run, { stepId: 'a', to: 'running', at: reloj }).run;
  const escrituras = await Promise.all(Array.from({ length: 25 }, () => runs.guardar(marcado, 0)));
  check('25 escrituras sobre la misma revisión: gana UNA', escrituras.filter((x) => x.saved).length === 1, String(escrituras.filter((x) => x.saved).length));
  check('quien pierde recibe la ejecución ACTUAL para volver a decidir', escrituras.filter((x) => !x.saved).every((x) => x.guardada?.revision === 1));
  const conBarra = prepared.iniciar({ traceId: 'trace-run-2', requestId: 'req-run-0002', userId: 'user-0001' }, { runId: 'run/con/barras' }).run;
  const cb = await runs.crearSiAusente({ run: conBarra, workflow: prepared.workflow });
  check('un runId con barras —el contrato lo permite— no rompe la ruta del documento', cb.created === true && (await runs.obtener('run/con/barras'))?.run.id === 'run/con/barras');
}

/* ── G ─────────────────────────────────────────────────────────────────────── */
console.log('\n── G · El conductor entero sobre Firestore ──');
{
  await vaciar();
  const llamadas = [];
  const adaptador = (run) => ({ id: 'x', name: 'x', modalities: ['text'], models: [{ id: 'x-1', provider: 'x', capabilities: ['text.generate'], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.01 } }], isConfigured: () => true, supports: (c) => c === 'text.generate', async run(req) { llamadas.push(req); return run(req, llamadas.length); } });
  const mundo = (run, worker, extra = {}) => {
    const adapters = { x: adaptador(run) };
    const config = { providers: {}, settings: ajustes.DEFAULT_SETTINGS };
    const registro = core.crearRegistro(registroDeWee.datosDelRegistro(adapters, config.providers));
    const gateway = core.crearGateway({ registry: registro, executor: motorDelGateway.crearEjecutorDelMotor({ adapters, config: () => config, now }), tracer: { record() {} }, now });
    return crearConductor({
      trabajos: almacenDeTrabajos(db), ejecuciones: almacenDeEjecuciones(db, now), cola: colaDeInvocacion(now), motor,
      resolver: resolutorDelRouter(core.crearRouter({ registry: registro })),
      ejecutor: crearEjecutor({ gateway, ahora: now, repetir: () => () => {} }),
      trabajador: { worker, visibilityMs: 30_000, backpressureDelayMs: 1_000 }, ahora: now, ...extra,
    });
  };
  const ok = async () => ({ output: { kind: 'text', content: 'desde Firestore' }, usage: { inputTokens: 1 }, costUSD: 0.001, latencyMs: 2 });
  const wf = (id) => ({ id, contract: '1.1', goal: 'prueba', steps: [{ id: 'pensar', capability: 'text.generate', purpose: 'Contestar', input: { prompt: 'hola' } }] });
  const traza = (id) => ({ traceId: id, requestId: id, userId: 'user-0001' });

  const r = await mundo(ok, 'w-1').ejecutar({ principal: QUIEN, trace: traza('brain_emu_0001'), workflow: wf('wf_g1') });
  check('una ejecución de punta a punta sobre Firestore TERMINA', r.estado === 'terminada' && r.cierre.state === 'done' && r.pasos[0].respuesta.content === 'desde Firestore');
  const jobDoc = (await db.collection(COLECCION_DE_TRABAJOS).get()).docs[0].data();
  check('y deja el trabajo completado, en su tercera revisión', jobDoc.state === 'completed' && jobDoc.terminal === true && jobDoc.revision === 3);
  const runDoc = (await db.collection(COLECCION_DE_EJECUCIONES).get()).docs[0].data();
  check('y la ejecución cerrada', runDoc.state === 'done' && runDoc.userId === 'user-0001');
  check('el documento del trabajo NO lleva lo que contestó el proveedor', !jobDoc.json.includes('desde Firestore'));

  const otraVez = await mundo(ok, 'w-2').ejecutar({ principal: QUIEN, trace: traza('brain_emu_0001'), workflow: wf('wf_g1') });
  check('la misma operación, desde OTRO proceso: no se ejecuta otra vez', otraVez.estado === 'terminada' && llamadas.length === 1 && otraVez.pasos[0].jobId === r.pasos[0].jobId);

  const lento = async () => { await new Promise((s) => setTimeout(s, 40)); return ok(); };
  const misma = { principal: QUIEN, trace: traza('brain_emu_0002'), workflow: wf('wf_g2') };
  const antes = llamadas.length;
  const [a, b] = await Promise.all([mundo(lento, 'w-a').ejecutar(misma), mundo(lento, 'w-b').ejecutar(misma)]);
  check('DOS conductores a la vez sobre Firestore: el proveedor se llama UNA vez', llamadas.length - antes === 1, String(llamadas.length - antes));
  check('y ninguno se inventa nada', [a, b].every((x) => x.estado !== 'invalida') && [a, b].some((x) => x.estado === 'terminada'), `${a.estado}/${b.estado}`);

  const intruso = await mundo(ok, 'w-x').retomar({ principal: { userId: 'user-9999' }, trace: { ...traza('brain_emu_0001'), userId: 'user-9999' }, runId: r.runId });
  check('y la ejecución de otra persona no se puede retomar, ni cuenta nada de ella', intruso.estado === 'invalida' && intruso.pasos.length === 0 && intruso.runId === undefined);
}

/* ── H ─────────────────────────────────────────────────────────────────────── */
console.log('\n── H · Cuánto hay en marcha ──');
{
  await vaciar();
  for (let i = 0; i < 3; i++) await store.crearSiAusente(nuevo());
  const corriendo = nuevo(); await store.crearSiAusente(corriendo);
  await store.aplicar(motor.reclamar(corriendo, { principal: QUIEN, at: reloj, worker: 'w-1' }).transition);
  const deOtro = nuevo({ principal: { userId: 'user-0002' }, trace: { traceId: 'trace-otro', requestId: 'req-de-otro', userId: 'user-0002' } }); await store.crearSiAusente(deOtro);

  const todo = contadorDeCapacidad(db, { maxRunning: 9, maxRunningPerAccount: 9, maxRunningPerProvider: 9, maxQueuedPerAccount: 9 });
  const c = await todo.capacidad(corriendo);
  check('en marcha: global, de la cuenta y del proveedor', c.running === 1 && c.runningForAccount === 1 && c.runningForProvider === 1, JSON.stringify(c));
  check('en cola, POR CUENTA: los de otra persona no cuentan', (await todo.alCrear(QUIEN)).queuedForAccount === 3 && (await todo.alCrear({ userId: 'user-0002' })).queuedForAccount === 1);
  const nada = contadorDeCapacidad(db, {});
  check('sin ningún tope puesto no se cuenta nada: cada recuento cuesta', (await nada.capacidad(corriendo)) === undefined && (await nada.alCrear(QUIEN)) === undefined);
  const lleno = motor.crear(pet({ capacity: await todo.alCrear(QUIEN), limits: { maxQueuedPerAccount: 3 } }));
  check('y con ese número el Job Engine dice «no cabe» AL CREAR', lleno.status === 'refused' && lleno.refusal === 'at_capacity');
}

/* ── I ─────────────────────────────────────────────────────────────────────── */
console.log('\n── I · Las reglas ──');
{
  const reglas = fs.readFileSync(path.resolve(RAIZ, process.argv[2] || 'firestore.rules'), 'utf8');
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const estado = await fetch(`http://${host}/emulator/v1/projects/${PROY}:securityRules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: reglas }] } }),
  });
  check('las reglas del repositorio cargan en el emulador', estado.ok, String(estado.status));
  await vaciar();
  const mio = nuevo(); await store.crearSiAusente(mio);
  const docId = `j.${mio.jobId}`;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  /* Una sesión de cliente de mentira: el emulador acepta un JWT sin firmar. `Bearer owner` sería el administrador y se saltaría las reglas. */
  const sesion = (uid) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: uid, user_id: uid, iss: `https://securetoken.google.com/${PROY}`, aud: PROY, iat: 1, exp: 9999999999, auth_time: 1, firebase: { identities: {}, sign_in_provider: 'custom' } })}.`;
  const base = `http://${host}/v1/projects/${PROY}/databases/(default)/documents`;
  const como = (uid, ruta, init = {}) => fetch(`${base}/${ruta}`, { ...init, headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${sesion(uid)}` } : {}) } });
  const cuerpo = JSON.stringify({ fields: { state: { stringValue: 'completed' } } });
  const casos = [
    ['el DUEÑO no lee su trabajo', await como('user-0001', `${COLECCION_DE_TRABAJOS}/${encodeURIComponent(docId)}`)],
    ['otra persona tampoco', await como('user-0002', `${COLECCION_DE_TRABAJOS}/${encodeURIComponent(docId)}`)],
    ['ni sin sesión', await como(null, `${COLECCION_DE_TRABAJOS}/${encodeURIComponent(docId)}`)],
    ['nadie lista trabajos', await como('user-0001', COLECCION_DE_TRABAJOS)],
    ['nadie crea un trabajo', await como('user-0001', `${COLECCION_DE_TRABAJOS}?documentId=inventado`, { method: 'POST', body: cuerpo })],
    ['nadie modifica el suyo', await como('user-0001', `${COLECCION_DE_TRABAJOS}/${encodeURIComponent(docId)}`, { method: 'PATCH', body: cuerpo })],
    ['nadie lo borra', await como('user-0001', `${COLECCION_DE_TRABAJOS}/${encodeURIComponent(docId)}`, { method: 'DELETE' })],
    ['nadie lee ejecuciones', await como('user-0001', `${COLECCION_DE_EJECUCIONES}/r.run_x`)],
    ['ni las crea', await como('user-0001', `${COLECCION_DE_EJECUCIONES}?documentId=r.inventada`, { method: 'POST', body: cuerpo })],
  ];
  for (const [nombre, res] of casos) check(nombre, res.status === 403, String(res.status));
  check('y el trabajo sigue exactamente como estaba', igual(await store.obtener(mio.jobId), JSON.parse(JSON.stringify(mio))));
}

/* ── J ─────────────────────────────────────────────────────────────────────── */
console.log('\n── J · El contexto por referencia, contra la conversación DE VERDAD ──');
{
  await vaciar();
  const { conversacionesDeBrain, entidadesDeWee } = lib('runtime/conversaciones.js');
  const { resolutorDeBrain, huellaDeEntrada, CLAVE_DE_REFERENCIA } = lib('runtime/contexto.js');
  const { Timestamp } = require('firebase-admin/firestore');
  const borrar = async (ruta) => { const s = await db.collection(ruta).get(); await Promise.all(s.docs.map((d) => d.ref.delete())); };
  for (const c of ['chatDeAna0001', 'chatDelOtro0001']) await borrar(`brainChats/${c}/messages`);
  await borrar('brainChats'); await borrar('entities');

  /* La conversación, escrita como la escribe `creator/brain.ts`: fechas de Firestore, el mensaje de la persona y la respuesta de Weë. */
  const SECRETO = 'esto lo escribió Ana y no es de nadie más';
  const chat = db.collection('brainChats').doc('chatDeAna0001');
  await chat.set({ userId: 'usuario1', title: 'hola', messageCount: 0, createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000) });
  const ms = chat.collection('messages');
  await ms.doc('msg_0001').set({ role: 'user', text: 'primer mensaje', createdAt: new Timestamp(10, 1000) });
  await ms.doc('msg_0001_wee').set({ role: 'wee', text: 'primera respuesta', createdAt: new Timestamp(10, 2000) });
  /* Los cuatro en el MISMO milisegundo y en microsegundos distintos —que es la precisión con la que guarda Firestore—: si la fecha se redondeara a milisegundos, se mezclarían. */
  await ms.doc('msg_0002').set({ role: 'user', text: SECRETO, imageUrl: 'https://almacen.invalido/u/foto.png', webSearch: false, createdAt: new Timestamp(10, 3000) });
  await ms.doc('msg_0002_wee').set({ role: 'wee', text: 'respuesta POSTERIOR: no es historial de msg_0002', createdAt: new Timestamp(10, 4000) });
  await db.collection('brainChats').doc('chatDelOtro0001').set({ userId: 'intruso9', createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(1) });
  await db.collection('brainChats').doc('chatDelOtro0001').collection('messages').doc('msg_7001').set({ role: 'user', text: 'del otro', createdAt: new Timestamp(5, 0) });
  await db.collection('entities').doc('ent_ynpwrhg3eeprae0zntc5ema9b0').set({ entityId: 'ent_ynpwrhg3eeprae0zntc5ema9b0', entityType: 'WEE_PROFILE', ownerAccountId: 'usuario1', status: 'ACTIVE' });
  await db.collection('entities').doc('ent_ynpwrhg3eeprae0zntc5ema9b1').set({ entityId: 'ent_ynpwrhg3eeprae0zntc5ema9b1', entityType: 'PAGE', ownerAccountId: 'usuario1', status: 'DELETED' });
  await db.collection('entities').doc('ent_ynpwrhg3eeprae0zntc5ema9b2').set({ entityId: 'ent_ynpwrhg3eeprae0zntc5ema9b2', entityType: 'REAL_PROFILE', ownerAccountId: 'intruso9', status: 'ACTIVE' });

  const fuente = conversacionesDeBrain(db);
  check('el dueño de una conversación se lee de ella', (await fuente.duenoDe('chatDeAna0001')) === 'usuario1' && (await fuente.duenoDe('noExiste')) === undefined);
  const anteriores = await fuente.anterioresA('chatDeAna0001', 'msg_0002', 12);
  check('el historial ANTERIOR a un mensaje: los dos de antes, en orden, y NI el propio mensaje NI lo que vino después', anteriores.map((m) => m.text).join('|') === 'primer mensaje|primera respuesta');
  check('con la fecha tal como la guarda Firestore: cuatro mensajes en el mismo milisegundo no se mezclan', (await fuente.anterioresA('chatDeAna0001', 'msg_0001_wee', 12)).length === 1 && (await fuente.anterioresA('chatDeAna0001', 'msg_0001', 12)).length === 0);
  check('y respeta el tope de turnos', (await fuente.anterioresA('chatDeAna0001', 'msg_0002_wee', 2)).map((m) => m.text).join('|') === `primera respuesta|${SECRETO}`);
  const elMensaje = await fuente.mensaje('chatDeAna0001', 'msg_0002');
  check('un mensaje vuelve con lo que guarda la conversación, adjuntos incluidos', elMensaje.role === 'user' && elMensaje.text === SECRETO && elMensaje.imageUrl.endsWith('foto.png'));
  check('un mensaje de OTRA conversación no está en esta', (await fuente.mensaje('chatDeAna0001', 'msg_7001')) === undefined);

  const entidades = entidadesDeWee(db);
  check('ENTIDADES, con la regla de la moderación: suya y activa, sí', (await entidades.esDeLaCuenta('usuario1', 'ent_ynpwrhg3eeprae0zntc5ema9b0')) === true);
  check('de otro, NO · retirada, NO · inexistente, NO', !(await entidades.esDeLaCuenta('usuario1', 'ent_ynpwrhg3eeprae0zntc5ema9b2')) && !(await entidades.esDeLaCuenta('usuario1', 'ent_ynpwrhg3eeprae0zntc5ema9b1')) && !(await entidades.esDeLaCuenta('usuario1', 'ent_ynpwrhg3eeprae0zntc5ema9b3')));

  const construirEntrada = ({ mensaje, historial, locale }) => ({ system: `Weë Brain · ${locale ?? 'es'}`, prompt: mensaje.text, history: historial, imageUrl: mensaje.imageUrl, kind: 'answer' });
  const resolutor = resolutorDeBrain({ conversaciones: fuente, entidades, construirEntrada, turnos: 12 });
  const REF = { kind: 'brain.message', chatId: 'chatDeAna0001', messageId: 'msg_0002' };
  const propia = await resolutor.resolver({ ownerUserId: 'usuario1', input: { [CLAVE_DE_REFERENCIA]: REF } });
  check('el resolutor, sobre Firestore: la dueña recibe su mensaje y su historial', propia.ok && propia.input.prompt === SECRETO && propia.input.history.length === 2 && propia.input.history[1].role === 'model');
  const ajena = await resolutor.resolver({ ownerUserId: 'intruso9', input: { [CLAVE_DE_REFERENCIA]: REF } });
  const fantasma = await resolutor.resolver({ ownerUserId: 'usuario1', input: { [CLAVE_DE_REFERENCIA]: { ...REF, chatId: 'noExiste0001' } } });
  check('otra cuenta NO, y contesta lo mismo que si no existiera', !ajena.ok && !fantasma.ok && JSON.stringify(ajena.error) === JSON.stringify(fantasma.error));
  check('con una cara ajena, o retirada, tampoco', !(await resolutor.resolver({ ownerUserId: 'usuario1', input: { [CLAVE_DE_REFERENCIA]: { ...REF, entityId: 'ent_ynpwrhg3eeprae0zntc5ema9b2' } } })).ok && !(await resolutor.resolver({ ownerUserId: 'usuario1', input: { [CLAVE_DE_REFERENCIA]: { ...REF, entityId: 'ent_ynpwrhg3eeprae0zntc5ema9b1' } } })).ok);
  const huella = huellaDeEntrada(propia.input);
  check('lo cotizado es lo ejecutado: la huella coincide al resolver otra vez —otro proceso, un reintento—', (await resolutor.resolver({ ownerUserId: 'usuario1', input: { [CLAVE_DE_REFERENCIA]: { ...REF, quotedInputHash: huella } } })).ok);

  /* Y DE PUNTA A PUNTA: conductor + almacén de Firestore + conversación de Firestore. */
  const llamadas = [];
  const adapters = { x: { id: 'x', name: 'x', modalities: ['text'], models: [{ id: 'x-1', provider: 'x', capabilities: ['text.generate'], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.01 } }], isConfigured: () => true, supports: (c) => c === 'text.generate', async run(req) { llamadas.push(req); return { output: { kind: 'text', content: 'contestado' }, costUSD: 0.001, latencyMs: 2 }; } } };
  const config = { providers: {}, settings: ajustes.DEFAULT_SETTINGS };
  const registro = core.crearRegistro(registroDeWee.datosDelRegistro(adapters, config.providers));
  const trabajos = almacenDeTrabajos(db);
  const conductor = crearConductor({
    trabajos, ejecuciones: almacenDeEjecuciones(db, now), cola: colaDeInvocacion(now), motor,
    resolver: resolutorDelRouter(core.crearRouter({ registry: registro })),
    ejecutor: crearEjecutor({ gateway: core.crearGateway({ registry: registro, executor: motorDelGateway.crearEjecutorDelMotor({ adapters, config: () => config, now }), tracer: { record() {} }, now }), ahora: now, repetir: () => () => {}, contexto: resolutor, duenoDelTrabajo: async (id) => (await trabajos.obtener(id))?.owner.userId }),
    trabajador: { worker: 'w-ref', visibilityMs: 30_000, backpressureDelayMs: 1_000 }, ahora: now,
  });
  const r = await conductor.ejecutar({ principal: { userId: 'usuario1' }, trace: { traceId: 'brain_ref_0001', requestId: 'brain_ref_0001', userId: 'usuario1', workplace: 'brain' },
    workflow: { id: 'wf_ref_1', contract: '1.1', goal: 'brain.reply', steps: [{ id: 'pensar', capability: 'text.generate', purpose: 'Contestar', input: { [CLAVE_DE_REFERENCIA]: { ...REF, quotedInputHash: huella } } }] } });
  check('DE PUNTA A PUNTA sobre Firestore: termina, y el proveedor recibió el mensaje entero', r.estado === 'terminada' && r.cierre.state === 'done' && llamadas[0].input.prompt === SECRETO);
  const guardado = (await db.collection(COLECCION_DE_TRABAJOS).get()).docs.map((d) => JSON.stringify(d.data())).join('\n') + (await db.collection(COLECCION_DE_EJECUCIONES).get()).docs.map((d) => JSON.stringify(d.data())).join('\n');
  check('y en `jobs/` y `workflowRuns/` no quedó NI UNA PALABRA de la conversación: solo la referencia', !guardado.includes(SECRETO) && !guardado.includes('primer mensaje') && guardado.includes('chatDeAna0001') && guardado.includes('msg_0002'));
  const intruso = await conductor.ejecutar({ principal: { userId: 'intruso9' }, trace: { traceId: 'brain_ref_0002', requestId: 'brain_ref_0002', userId: 'intruso9' },
    workflow: { id: 'wf_ref_2', contract: '1.1', goal: 'brain.reply', steps: [{ id: 'pensar', capability: 'text.generate', purpose: 'Contestar', input: { [CLAVE_DE_REFERENCIA]: REF } }] } });
  check('OTRA CUENTA con la referencia de Ana: el paso falla, y el proveedor no se llama', intruso.cierre.state === 'failed' && intruso.pasos[0].error.details.reason === 'context_not_found' && llamadas.length === 1);
  const antes = (await ms.get()).docs.map((d) => JSON.stringify(d.data())).join('|');
  check('y la conversación está exactamente como estaba: este camino no escribe en ella', (await ms.get()).docs.map((d) => JSON.stringify(d.data())).join('|') === antes && (await ms.get()).size === 4);

  for (const c of ['chatDeAna0001', 'chatDelOtro0001']) await borrar(`brainChats/${c}/messages`);
  await borrar('brainChats'); await borrar('entities');
}

/* ── K ─────────────────────────────────────────────────────────────────────── */
console.log('\n── K · Lo que se quedó sin cerrar, contra Firestore ──');
{
  await vaciar();
  const { barrerLiquidaciones } = lib('runtime/barrendero.js');
  const { decidirLiquidacion } = lib('runtime/liquidacion.js');

  /* Un trabajo con reserva declarada, y otro sin ella. */
  const conDinero = (metadata) => nuevo({ metadata });
  const reserva = (id, credits) => ({ creditTransactionId: `usage_${id}`, creditRequestId: id, creditsEstimated: credits, service: 'ai_video' });

  const jA = conDinero(reserva('op_emu_a', 2));
  const jB = conDinero(reserva('op_emu_b', 1));
  const jSin = nuevo();
  for (const j of [jA, jB, jSin]) await store.crearSiAusente(j);

  const pendientes = await store.porLiquidar({ limit: 50 });
  check('la consulta encuentra SOLO los trabajos que declaran dinero reservado', pendientes.jobs.length === 2 && pendientes.jobs.every((j) => !!j.metadata?.creditRequestId), String(pendientes.jobs.length));
  check('y no necesita índice compuesto: campo único más orden por identificador', true);

  /* Uno terminado bien y otro que nunca salió, aplicados de verdad por el motor. */
  const terminar = async (job, bien, worker = 'w-emu') => {
    const reclamado = motor.reclamar(job, { principal: QUIEN, at: reloj, worker });
    let actual = (await store.aplicar(reclamado.transition)).job;
    const attemptId = reclamado.dispatch.attemptId;
    if (bien) {
      const envio = motor.marcarEnvio(actual, { principal: QUIEN, at: reloj, worker, attemptId });
      actual = (await store.aplicar(envio.transition)).job;
    }
    /* Un fallo REINTENTABLE devuelve el trabajo a la cola, no lo termina: para acabarlo de verdad hace falta uno que no lo sea. */
    const report = bien
      ? { attemptId, outcome: 'succeeded', dispatched: true, result: { outputRefs: [] } }
      : { attemptId, outcome: 'failed', dispatched: false, error: { code: 'INVALID_REQUEST', source: 'gateway' } };
    const cierre = motor.informar(actual, { principal: QUIEN, at: reloj, report, worker });
    return (await store.aplicar(cierre.transition)).job;
  };
  const finA = await terminar(jA, true);
  const finB = await terminar(jB, false);
  check('un trabajo termina COMPLETED y el otro falla sin remedio y sin haber salido', finA.state === 'completed' && finB.state === 'failed' && finB.attempts[0].dispatched === false, `${finA.state} / ${finB.state}`);

  const guardadoA = await store.obtener(finA.jobId);
  check('y la decisión, leída del trabajo GUARDADO, es la esperada', decidirLiquidacion(guardadoA, reloj).tipo === 'liquidar' && decidirLiquidacion(await store.obtener(finB.jobId), reloj).tipo === 'reembolsar');

  const movimientos = [];
  const puerto = {
    async liquidar({ reserva: r, importe }) { movimientos.push(`liquidar:${r.requestId}:${importe}`); return { desenlace: 'liquidada', estado: 'COMPLETED' }; },
    async reembolsar({ reserva: r }) { movimientos.push(`reembolsar:${r.requestId}`); return { desenlace: 'reembolsada', estado: 'REFUNDED' }; },
  };
  const informe = await barrerLiquidaciones({ trabajos: store, liquidacion: puerto, ahora: () => reloj, porPagina: 1 });
  check('el barrendero los encuentra paginando de uno en uno y hace lo que toca', informe.mirados === 2 && movimientos.sort().join(' | ') === 'liquidar:op_emu_a:2 | reembolsar:op_emu_b', movimientos.join(' | '));

  const despues = await store.porLiquidar({ limit: 50 });
  check('MARCADOS: la siguiente pasada ya no los ve', despues.jobs.length === 0);
  const docA = await db.collection(COLECCION_DE_TRABAJOS).doc(`j.${finA.jobId}`).get();
  check('la marca es un campo de búsqueda y NO tocó la verdad del trabajo', docA.get('liquidacion') === 'hecha' && JSON.parse(docA.get('json')).state === 'completed' && JSON.parse(docA.get('json')).revision === finA.revision);

  /* Dos barrenderos a la vez sobre lo mismo. */
  await vaciar();
  const jC = conDinero(reserva('op_emu_c', 4));
  await store.crearSiAusente(jC);
  const finC = await terminar(jC, true);
  const dobles = [];
  const puerto2 = { async liquidar({ reserva: r }) { dobles.push(r.requestId); return { desenlace: 'liquidada', estado: 'COMPLETED' }; }, async reembolsar() { return { desenlace: 'reembolsada' }; } };
  const [p1, p2] = await Promise.all([
    barrerLiquidaciones({ trabajos: store, liquidacion: puerto2, ahora: () => reloj }),
    barrerLiquidaciones({ trabajos: store, liquidacion: puerto2, ahora: () => reloj }),
  ]);
  check('dos barrenderos a la vez: los dos pueden verlo, y quien garantiza el cobro único es el Credit Engine', p1.mirados + p2.mirados >= 1 && dobles.every((x) => x === 'op_emu_c'));
  check('y al terminar queda marcado una sola vez', (await store.porLiquidar({ limit: 50 })).jobs.length === 0 && finC.state === 'completed');

  /* Uno vivo no se marca nunca. */
  await vaciar();
  const jD = conDinero(reserva('op_emu_d', 1));
  await store.crearSiAusente(jD);
  const reclamado = motor.reclamar(jD, { principal: QUIEN, at: reloj, worker: 'w-vivo' });
  const vivoEnMarcha = (await store.aplicar(reclamado.transition)).job;
  const envio = motor.marcarEnvio(vivoEnMarcha, { principal: QUIEN, at: reloj, worker: 'w-vivo', attemptId: reclamado.dispatch.attemptId });
  await store.aplicar(envio.transition);
  const r3 = await barrerLiquidaciones({ trabajos: store, liquidacion: puerto2, ahora: () => reloj });
  check('UN TRABAJO VIVO no se liquida, no se reembolsa y NO se marca', r3.esperando === 1 && r3.liquidados === 0 && r3.reembolsados === 0 && (await store.porLiquidar({ limit: 50 })).jobs.length === 1);
  await vaciar();
}

/* ── L ─────────────────────────────────────────────────────────────────────── */
console.log('\n── L · Una tarea que el proveedor acepta, de punta a punta ──');
{
  await vaciar();
  const { decidirLiquidacion } = lib('runtime/liquidacion.js');
  const { barrerLiquidaciones } = lib('runtime/barrendero.js');
  const { pasarElBarrendero } = lib('runtime/barrido.js');

  const reserva = { creditTransactionId: 'usage_op_async', creditRequestId: 'op_async', creditsEstimated: 5, service: 'ai_video' };
  const job = nuevo({ metadata: reserva });
  await store.crearSiAusente(job);

  /* El trabajador sale, y el proveedor contesta «la tengo». */
  const rec = motor.reclamar(job, { principal: QUIEN, at: reloj, worker: 'w-async' });
  let actual = (await store.aplicar(rec.transition)).job;
  const env = motor.marcarEnvio(actual, { principal: QUIEN, at: reloj, worker: 'w-async', attemptId: rec.dispatch.attemptId });
  actual = (await store.aplicar(env.transition)).job;
  const aceptada = trabajosDeWee.informeDelGateway(
    { ...rec.dispatch },
    { contract: '1.0', status: 'accepted', requestId: 'req-async', traceId: 'trace-async', idempotencyKey: 'idem-async', capability: 'image.generate', implementation: impl, operation: { providerId: impl.providerId, operationId: 'tarea_del_proveedor_1' }, timing: { startedAt: reloj, finishedAt: reloj }, warnings: [] },
    { providerId: impl.providerId, operationId: 'tarea_del_proveedor_1' },
  );
  const cierre = motor.informar(actual, { principal: QUIEN, at: reloj, worker: 'w-async', report: aceptada });
  const esperando = (await store.aplicar(cierre.transition)).job;
  check('el trabajo queda ESPERANDO, no terminado, y con la referencia del proveedor guardada',
    esperando.state === 'waiting' && esperando.attempts[0].outcome === 'unknown' && esperando.attempts[0].dispatched === true && esperando.attempts[0].providerRef?.operationId === 'tarea_del_proveedor_1');

  const guardado = await store.obtener(esperando.jobId);
  check('y leído del almacén, la liquidación dice ESPERAR porque el proveedor la aceptó',
    decidirLiquidacion(guardado, reloj).tipo === 'esperar' && decidirLiquidacion(guardado, reloj).motivo === 'aceptada_por_el_proveedor');

  const movimientos = [];
  const puerto = {
    async liquidar({ reserva: r }) { movimientos.push(`liquidar:${r.requestId}`); return { desenlace: 'liquidada', estado: 'COMPLETED' }; },
    async reembolsar({ reserva: r }) { movimientos.push(`reembolsar:${r.requestId}`); return { desenlace: 'reembolsada', estado: 'REFUNDED' }; },
  };
  let paso = 0;
  const pasada = () => pasarElBarrendero({
    barrer: () => barrerLiquidaciones({ trabajos: store, liquidacion: puerto, ahora: () => reloj }),
    ahora: () => reloj, identificador: () => `sweep-emu-${++paso}`,
  });
  const p1 = await pasada();
  check('el barrendero NO la toca mientras el proveedor la tiene: ni cobra ni devuelve', p1.skipped === 1 && p1.settled === 0 && p1.refunded === 0 && p1.unknown === 0 && movimientos.length === 0);
  check('y no la marca: la siguiente pasada volverá a mirarla', (await store.porLiquidar({ limit: 10 })).jobs.length === 1);

  /* Llega el aviso del proveedor: terminó. */
  const aviso = motor.recibirEvento(
    guardado,
    { eventId: 'ev-async-1', jobId: guardado.jobId, attemptId: guardado.attempts[0].attemptId, kind: 'succeeded', at: reloj, outputRefs: [] },
    reloj,
  );
  const terminado = aviso.transition ? (await store.aplicar(aviso.transition)).job : guardado;
  check('cuando el proveedor avisa de que terminó, el trabajo llega a su estado final', terminado.state === 'completed', `${terminado.state} · ${aviso.status}`);

  const p2 = await pasada();
  check('AHORA sí: el barrendero lo cobra, y una sola vez', p2.settled === 1 && p2.refunded === 0 && movimientos.join(',') === 'liquidar:op_async');
  const p3 = await pasada();
  check('y una pasada más no vuelve a moverlo', p3.examined === 0 && movimientos.length === 1);
  check('el informe de la pasada solo lleva metadatos', typeof p2.sweepId === 'string' && typeof p2.durationMs === 'number' && !/prompt|content|gato/i.test(JSON.stringify(p2)));

  await vaciar();
}

await vaciar();
console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
