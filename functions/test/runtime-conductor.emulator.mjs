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
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore --project wee-dev-geovet \
 *     "node functions/test/runtime-conductor.emulator.mjs firestore.rules"
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('sin FIRESTORE_EMULATOR_HOST: no se ejecuta'); process.exit(2); }
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const admin = require('firebase-admin');
const PROY = 'wee-dev-geovet';
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

await vaciar();
console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
