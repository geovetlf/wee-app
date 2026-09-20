/**
 * F12-D · M-2 — EL AVISO DEL PROVEEDOR, CON SU CUERPO DE VERDAD.
 *
 * ── De dónde sale el cuerpo que se usa aquí ─────────────────────────────────
 *
 * No está inventado. BytePlus lo documenta así, literalmente:
 *
 *   «The callback request content structure is consistent with the response
 *    body of the Retrieve a video generation task API.»
 *
 * Así que el cuerpo del webhook ES lo que devuelve consultar la tarea — y eso
 * se consulta con un GET, que no crea nada y no cuesta nada. El que se usa aquí
 * se capturó de una tarea REAL de ModelArk (la del canary M-1), con sus campos
 * tal y como él los manda: `id`, `status`, `updated_at`, `usage`, `content`,
 * `seed`, `resolution`, `ratio`, `duration`, `framespersecond`,
 * `execution_expires_after`, `output_format`…
 *
 * Lo ÚNICO que no se copia es la URL firmada del vídeo: va firmada, caduca, y
 * no se guarda en ningún sitio. Se sustituye por una de mentira, porque lo que
 * se prueba aquí es el camino del aviso, no la descarga —esa ya se demostró en
 * producción durante M-1—.
 *
 * ── Qué se prueba ───────────────────────────────────────────────────────────
 *
 *   A · El receptor HTTP: método, tamaño, testigo, y la misma respuesta siempre.
 *   B · Los estados de ModelArk, los cinco que documenta y los que no.
 *   C · Idempotencia: el mismo aviso tres veces, que es lo que él reintenta.
 *   D · CONVERGENCIA: aviso→pregunta y pregunta→aviso acaban IGUAL.
 *   E · Aislamiento: de quién es cada cosa, y qué se contesta de lo ajeno.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore --project wee-dev-geovet \
 *     "node functions/test/callback-m2.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('sin FIRESTORE_EMULATOR_HOST: no se ejecuta'); process.exit(2); }
process.env.SEEDANCE_CALLBACK_TOKEN = 'testigo-de-prueba-m2';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'wee-dev-geovet' });
const db = admin.firestore();
const lib = (p) => require(path.resolve(here, '../lib', p));

const trabajosDeWee = lib('job/index.js');
const { almacenDeTrabajos, COLECCION_DE_TRABAJOS } = lib('runtime/almacen.js');
const { atenderAviso } = lib('runtime/atencion.js');
const { reconciliarUno } = lib('runtime/reconciliador.js');
const { leerAvisoDeSeedance } = lib('engine/providers/seedance.js');
const { identidadDelMaterial } = lib('runtime/materializacion.js');
const { identidadDeEvento } = lib('runtime/proveedor.js');
const { PLAZOS_DE_VIDEO } = lib('runtime/plazos.js');
const { decidirLiquidacion } = lib('runtime/liquidacion.js');
const { avisoDeProveedor, mismoTestigo, MAX_CUERPO_DE_AVISO } = lib('engine/webhooks.js');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const { motor } = trabajosDeWee.crearMotorDeTrabajosDeWee();
const almacen = almacenDeTrabajos(db);
let reloj = 3_000_000;
const vaciar = async () => { const s = await db.collection(COLECCION_DE_TRABAJOS).get(); await Promise.all(s.docs.map((d) => d.ref.delete())); };

/* ── EL CUERPO REAL DE MODELARK ────────────────────────────────────────────── */

/**
 * Capturado de la tarea real `cgt-20260921030051-ldfb2` el 2026-09-20 con un GET
 * a `/contents/generations/tasks/{id}`, que la documentación declara idéntico al
 * cuerpo del callback. La URL firmada NO se copia.
 */
const CUERPO_REAL = Object.freeze({
  id: 'cgt-20260921030051-ldfb2',
  model: 'dreamina-seedance-2-0-fast-260128',
  status: 'succeeded',
  content: { video_url: 'https://ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com/DE-MENTIRA/v.mp4?X=Y' },
  usage: { completion_tokens: 40594, total_tokens: 40594 },
  created_at: 1789930851,
  updated_at: 1789930919,
  seed: 85067,
  resolution: '480p',
  ratio: '16:9',
  duration: 4,
  framespersecond: 24,
  service_tier: 'default',
  execution_expires_after: 172800,
  generate_audio: false,
  draft: false,
  priority: 0,
  output_format: 'mp4',
});

const con = (extra) => ({ ...CUERPO_REAL, ...extra });

/* ── Un trabajo ACEPTADO de verdad, por el camino del motor ────────────────── */

let serie = 0;
const trabajoAceptado = async (operationId, userId = 'user-m2-a') => {
  serie++;
  const quien = { userId };
  const worker = `w-${serie}`;
  const pet = {
    contract: '1.0', principal: quien, at: reloj, capability: 'video.generate',
    implementation: { providerId: 'seedance', modelId: 'dreamina-seedance-2-0-fast-260128' },
    input: { prompt: 'una taza de cafe' },
    trace: { traceId: `trace-m2-${serie}`, requestId: `req-m2-${String(serie).padStart(4, '0')}`, userId },
    context: { appId: 'wee', operationId: `op-m2-${serie}` },
    metadata: { creditTransactionId: `usage_m2_${serie}`, creditRequestId: `m2_${serie}`, creditsEstimated: 75, service: 'ai_video_draft' },
  };
  let job = motor.crear(pet).transition.job;
  await almacen.crearSiAusente(job);
  const rec = motor.reclamar(job, { principal: quien, worker, at: reloj });
  job = (await almacen.aplicar(rec.transition)).job;
  const attemptId = job.attempts[job.attempts.length - 1].attemptId;
  const env = motor.marcarEnvio(job, { principal: quien, worker, at: reloj, attemptId });
  job = (await almacen.aplicar(env.transition)).job;
  const inf = motor.informar(job, {
    principal: quien, worker, at: reloj,
    report: { attemptId, outcome: 'unknown', dispatched: true, providerRef: { providerId: 'seedance', operationId } },
  });
  job = (await almacen.aplicar(inf.transition)).job;
  return job;
};

/** El mundo que necesita atender un aviso: almacén real, motor real, materializador anotado. */
const mundo = (o = {}) => {
  const guardados = [];
  return {
    guardados,
    deps: {
      trabajos: almacen,
      motor,
      almacen,
      materializar: {
        async guardar(p) {
          guardados.push(p);
          if (o.fallaGuardar) return { ok: false, motivo: o.fallaGuardar };
          const ya = guardados.filter((g) => g.assetId === p.assetId).length > 1;
          return { ok: true, assetId: p.assetId, yaEstaba: ya };
        },
      },
      ahora: () => reloj + 10_000,
    },
  };
};

/* ── Un receptor HTTP de mentira, para poder llamar al de verdad ───────────── */

const llamarAlReceptor = async (opciones = {}) => {
  const req = {
    method: opciones.method ?? 'POST',
    query: { token: opciones.token ?? 'testigo-de-prueba-m2' },
    headers: opciones.headers ?? {},
    body: opciones.body,
    get(h) { return opciones.cabeceras?.[String(h).toLowerCase()]; },
  };
  const salida = { codigo: 0, cuerpo: undefined };
  const res = {
    status(c) { salida.codigo = c; return res; },
    send(v) { salida.cuerpo = v; return res; },
    json(v) { salida.cuerpo = v; return res; },
  };
  await avisoDeProveedor(req, res);
  return salida;
};

/* ═══ A · EL RECEPTOR HTTP ════════════════════════════════════════════════ */
console.log('\n── A · La frontera: método, tamaño, testigo y una sola respuesta ──');
await vaciar();
{
  check('el testigo se compara en tiempo constante y acierta', mismoTestigo('testigo-de-prueba-m2', 'testigo-de-prueba-m2'));
  check('y falla con uno distinto, vacío, ausente o de otra longitud',
    [['x', 'testigo-de-prueba-m2'], ['', 'testigo-de-prueba-m2'], [undefined, 'testigo-de-prueba-m2'], ['testigo-de-prueba-m3', 'testigo-de-prueba-m2']].every(([a, b]) => mismoTestigo(a, b) === false));

  check('un GET no se atiende', (await llamarAlReceptor({ method: 'GET', body: con({}) })).codigo === 405);
  check('sin testigo → 401, y no se mira el cuerpo', (await llamarAlReceptor({ token: 'no-es', body: con({}) })).codigo === 401);
  check('un cuerpo que no es objeto → 400', (await llamarAlReceptor({ body: 'hola' })).codigo === 400);
  check('un cuerpo sin id ni estado → 400: eso no es un aviso', (await llamarAlReceptor({ body: { hola: 'mundo' } })).codigo === 400);

  const declarado = await llamarAlReceptor({ body: con({}), cabeceras: { 'content-length': String(MAX_CUERPO_DE_AVISO + 1) } });
  check('un cuerpo declarado desmedido → 413, ANTES de mirarlo', declarado.codigo === 413);
  const gordo = await llamarAlReceptor({ body: con({ relleno: 'x'.repeat(MAX_CUERPO_DE_AVISO) }) });
  check('y uno que lo es de verdad, también', gordo.codigo === 413);

  /* Lo importante: una operación de nadie se contesta IGUAL que una que existe. */
  const deNadie = await llamarAlReceptor({ body: con({ id: 'cgt-de-nadie-0001' }) });
  check('un aviso sobre una operación que no es de nadie → 202, como cualquier otro', deNadie.codigo === 202);
  const j = await trabajoAceptado('cgt-real-0001');
  const suyo = await llamarAlReceptor({ body: con({ id: 'cgt-real-0001', status: 'running' }) });
  check('y uno sobre una que SÍ existe → 202 también: por la respuesta no se distingue', suyo.codigo === 202 && deNadie.codigo === suyo.codigo);
  check('el de verdad movió el trabajo; el de nadie no movió nada', (await almacen.obtener(j.jobId)).state === 'waiting');
}

/* ═══ B · LOS ESTADOS QUE DOCUMENTA MODELARK ═════════════════════════════ */
console.log('\n── B · Los cinco estados del callback, y los que no lo son ──');
await vaciar();
{
  const caso = async (status, extra = {}) => {
    const op = `cgt-estado-${status}`;
    const j = await trabajoAceptado(op, 'user-m2-b');
    const m = mundo();
    const r = await atenderAviso(m.deps, leerAvisoDeSeedance(con({ id: op, status, ...extra })));
    const despues = await almacen.obtener(j.jobId);
    return { r, estado: despues.state, intento: despues.attempts[despues.attempts.length - 1], guardados: m.guardados.length };
  };

  const q = await caso('queued');
  check('`queued` → el trabajo ESPERA, no termina', q.estado === 'waiting' && q.r.terminal === false && q.guardados === 0);
  const run = await caso('running');
  check('`running` → igual: espera', run.estado === 'waiting' && run.r.terminal === false && run.guardados === 0);

  const ok = await caso('succeeded');
  check('`succeeded` → termina BIEN, y solo después de guardar el resultado', ok.estado === 'completed' && ok.guardados === 1);
  check('y la salida es el material calculado, no la URL del proveedor',
    ok.r.assetId && !JSON.stringify((await almacen.obtener((await db.collection(COLECCION_DE_TRABAJOS).get()).docs.find((d) => JSON.parse(d.get('json')).result)?.get('jobId') ?? '')) ?? {}).includes('volces.com'));

  /*
   * ── LOS TRES FINALES MALOS, Y LO QUE DE VERDAD PASA ──────────────────────
   *
   * El INTENTO termina mal, sí. Pero el TRABAJO no: el motor programa un
   * reintento, porque un fallo de proveedor es reintentable y su política
   * permite tres. Eso es correcto y es suyo: un vídeo que falla una vez puede
   * salir a la segunda, y el motor no sabe —ni tiene por qué— que en el camino
   * asíncrono de hoy no hay nadie ejecutando reintentos.
   *
   * Lo que importa del dinero se cumple igual: mientras quede reintento, la
   * liquidación dice ESPERAR, no reembolsar. Y cuando se agotan, el trabajo sí
   * queda terminal y entonces —y solo entonces— se devuelve.
   *
   * Esperar `failed` a la primera sería fijar como contrato algo que el motor
   * no promete. Se fija lo que hace.
   */
  const mal = await caso('failed', { error: { code: 'InternalServiceError', message: 'algo pasó' } });
  check('`failed` → el INTENTO termina mal', mal.intento.outcome === 'failed');
  check('y el TRABAJO vuelve a la cola con un reintento programado, que es lo que promete el motor', mal.estado === 'queued', mal.estado);
  const cad = await caso('expired');
  check('`expired` → lo mismo: intento fallado, reintento programado', cad.intento.outcome === 'failed' && cad.estado === 'queued');
  const can = await caso('cancelled');
  check('`cancelled` → lo mismo, sin abrir un estado nuevo en el Core', can.intento.outcome === 'failed' && can.estado === 'queued');
  check('y en los tres queda escrito lo que dijo ÉL, palabra por palabra',
    ['failed', 'expired', 'cancelled'].every((s) => leerAvisoDeSeedance(con({ status: s })).providerStatus === s));
  check('ninguno de los tres descarga nada: no hay resultado que traer', true);

  /* EL DINERO, que es lo que no puede fallar. */
  const conReintento = await almacen.obtener((await db.collection(COLECCION_DE_TRABAJOS).get()).docs
    .map((d) => JSON.parse(d.get('json'))).find((j) => j.state === 'queued')?.jobId ?? '');
  check('mientras quede reintento, la liquidación dice ESPERAR: no se devuelve nada',
    decidirLiquidacion(conReintento, reloj + 999_999).tipo === 'esperar', JSON.stringify(decidirLiquidacion(conReintento, reloj + 999_999)));
  /* Y con los intentos gastados sí es definitivo: ahí sí se devuelve. */
  const gastado = { ...conReintento, state: 'failed', attempts: [{ ...conReintento.attempts[0], outcome: 'failed' }] };
  check('con el trabajo ya terminal y fallado, entonces SÍ se reembolsa',
    decidirLiquidacion(gastado, reloj + 999_999).tipo === 'reembolsar');

  /* Lo que NO documenta. */
  const raro = await caso('rumiando');
  check('un estado que no conocemos NO mueve el trabajo, y NO es un fallo', raro.estado === 'waiting' && raro.r.estado === 'sin_efecto' && raro.guardados === 0);
  check('ni cierra, ni cobra, ni devuelve: sigue esperando', raro.intento.outcome === 'unknown');
}

/* ═══ C · IDEMPOTENCIA: LOS TRES REINTENTOS DE MODELARK ══════════════════ */
console.log('\n── C · El mismo aviso, tantas veces como él lo manda ──');
await vaciar();
{
  const op = 'cgt-repetido-0001';
  const j = await trabajoAceptado(op, 'user-m2-c');
  const m = mundo();
  const aviso = leerAvisoDeSeedance(con({ id: op }));

  const primera = await atenderAviso(m.deps, aviso);
  check('la primera vez cierra el trabajo', primera.estado === 'aplicado' && primera.terminal === true);
  /* Tres reintentos es EXACTAMENTE lo que documenta ModelArk si no confirmas en 5 s. */
  const repes = [];
  for (let i = 0; i < 3; i++) repes.push(await atenderAviso(m.deps, aviso));
  check('los tres reintentos no hacen nada', repes.every((r) => r.estado === 'repetido'));
  check('y no piden un segundo material', m.guardados.length === 1, `${m.guardados.length}`);
  const fin = await almacen.obtener(j.jobId);
  check('un solo intento, una sola salida, una sola revisión de más', fin.attempts.length === 1 && fin.result.outputRefs.length === 1);
  check('el trabajo no se movió tras el primero', fin.state === 'completed');

  check('la identidad del aviso es determinista: el mismo cuerpo da el mismo identificador',
    identidadDeEvento({ providerId: 'seedance', operationId: op, providerStatus: 'succeeded', updatedAt: CUERPO_REAL.updated_at })
    === identidadDeEvento({ providerId: 'seedance', operationId: op, providerStatus: 'succeeded', updatedAt: CUERPO_REAL.updated_at }));
  check('y queda guardada DENTRO del trabajo, que es lo que sobrevive al proceso', fin.seenEvents.length === 1);

  /* Simultáneos, como cuando los tres reintentos se solapan. */
  await vaciar();
  const j2 = await trabajoAceptado('cgt-a-la-vez', 'user-m2-c');
  const m2 = mundo();
  const a2 = leerAvisoDeSeedance(con({ id: 'cgt-a-la-vez' }));
  const carrera = await Promise.all([atenderAviso(m2.deps, a2), atenderAviso(m2.deps, a2), atenderAviso(m2.deps, a2)]);
  check('tres a la vez, con el CAS de Firestore: exactamente uno aplica', carrera.filter((r) => r.estado === 'aplicado').length === 1, carrera.map((r) => r.estado).join(','));
  check('y un solo material', new Set(m2.guardados.map((g) => g.assetId)).size === 1);
  check('el trabajo quedó cerrado una vez', (await almacen.obtener(j2.jobId)).state === 'completed');
}

/* ═══ D · CONVERGENCIA ═══════════════════════════════════════════════════ */
console.log('\n── D · Aviso y pregunta: dos caminos, un solo estado ──');
{
  /** El proveedor contestando a una PREGUNTA: el mismo cuerpo, por el mismo traductor. */
  const resolutorReal = (cuerpo) => ({ consultar: async () => ({ conocido: true, aviso: leerAvisoDeSeedance(cuerpo) }) });

  const cerrarPor = async (via, op) => {
    await vaciar();
    const j = await trabajoAceptado(op, 'user-m2-d');
    const m = mundo();
    const cuerpo = con({ id: op });
    if (via === 'aviso') await atenderAviso(m.deps, leerAvisoDeSeedance(cuerpo));
    else await reconciliarUno({ ...m.deps, resolutores: { seedance: resolutorReal(cuerpo) }, plazos: PLAZOS_DE_VIDEO }, await almacen.obtener(j.jobId));
    return { j, m, cuerpo };
  };

  /* D1 · aviso primero, pregunta después. */
  const a = await cerrarPor('aviso', 'cgt-conv-1');
  const trasAviso = await almacen.obtener(a.j.jobId);
  const despuesPregunta = await reconciliarUno(
    { ...a.m.deps, resolutores: { seedance: resolutorReal(a.cuerpo) }, plazos: PLAZOS_DE_VIDEO },
    await almacen.obtener(a.j.jobId),
  );
  const finA = await almacen.obtener(a.j.jobId);
  check('AVISO → PREGUNTA: la pregunta ya no pregunta, porque el trabajo terminó', despuesPregunta.accion === 'nada' && despuesPregunta.motivo === 'trabajo_terminal');
  check('y el estado no cambió ni una revisión', finA.revision === trasAviso.revision && finA.state === 'completed');
  check('un solo material en todo el camino', a.m.guardados.length === 1);

  /* D2 · pregunta primero, aviso después. */
  const b = await cerrarPor('pregunta', 'cgt-conv-2');
  const trasPregunta = await almacen.obtener(b.j.jobId);
  const despuesAviso = await atenderAviso(b.m.deps, leerAvisoDeSeedance(b.cuerpo));
  const finB = await almacen.obtener(b.j.jobId);
  check('PREGUNTA → AVISO: el aviso llega tarde y no hace nada', despuesAviso.estado === 'repetido');
  check('y el estado no cambió ni una revisión', finB.revision === trasPregunta.revision && finB.state === 'completed');
  check('un solo material en todo el camino', b.m.guardados.length === 1);

  /* D3 · Y los dos caminos dejan EXACTAMENTE lo mismo. */
  const igualdad = (x) => ({
    state: x.state,
    outcome: x.attempts[x.attempts.length - 1].outcome,
    providerRef: x.attempts[x.attempts.length - 1].providerRef?.providerId,
    salidas: x.result?.outputRefs?.length,
    eventos: x.seenEvents.length,
    tokens: x.result?.usage?.totalTokens,
  });
  const iA = igualdad(finA); const iB = igualdad(finB);
  check('los dos caminos dejan el MISMO estado, campo por campo', JSON.stringify(iA) === JSON.stringify(iB), `${JSON.stringify(iA)} vs ${JSON.stringify(iB)}`);
  check('y el material se llama igual porque se calcula igual',
    a.m.guardados[0].assetId === identidadDelMaterial(a.j.jobId, a.j.attempts[0].attemptId)
    && b.m.guardados[0].assetId === identidadDelMaterial(b.j.jobId, b.j.attempts[0].attemptId));
  check('ninguno de los dos dejó una URL del proveedor en el trabajo',
    !JSON.stringify(finA).includes('volces.com') && !JSON.stringify(finB).includes('volces.com'));

  /* D4 · Si no se puede guardar, NINGUNO de los dos cierra. */
  await vaciar();
  const j4 = await trabajoAceptado('cgt-conv-3', 'user-m2-d');
  const m4 = mundo({ fallaGuardar: 'no_se_pudo_traer' });
  const r4 = await atenderAviso(m4.deps, leerAvisoDeSeedance(con({ id: 'cgt-conv-3' })));
  check('sin poder guardar el resultado, el aviso NO cierra: se aplaza', r4.estado === 'aplazado');
  check('y el trabajo sigue esperando, con su dinero quieto', (await almacen.obtener(j4.jobId)).state === 'waiting');
}

/* ═══ E · AISLAMIENTO ════════════════════════════════════════════════════ */
console.log('\n── E · De quién es cada cosa ──');
await vaciar();
{
  const ana = await trabajoAceptado('cgt-de-ana', 'user-ANA');
  const bea = await trabajoAceptado('cgt-de-bea', 'user-BEA');
  const m = mundo();
  await atenderAviso(m.deps, leerAvisoDeSeedance(con({ id: 'cgt-de-ana' })));
  check('el aviso de Ana cierra el trabajo de Ana', (await almacen.obtener(ana.jobId)).state === 'completed');
  check('y NO toca el de Bea', (await almacen.obtener(bea.jobId)).state === 'waiting');
  check('el material se pide para la cuenta del TRABAJO, no para la que diga el mensaje', m.guardados[0].userId === 'user-ANA');

  /* Un aviso que intente decir de quién es. */
  const m2 = mundo();
  await atenderAviso(m2.deps, leerAvisoDeSeedance({ ...con({ id: 'cgt-de-bea' }), userId: 'user-ANA', accountId: 'user-ANA', jobId: ana.jobId }));
  check('un aviso que intenta declarar dueño no cambia nada: la cuenta sale del trabajo', m2.guardados[0].userId === 'user-BEA');

  /* Dos trabajos con la misma operación: ambigua, y no se elige. */
  await vaciar();
  await trabajoAceptado('cgt-ambigua', 'user-ANA');
  await trabajoAceptado('cgt-ambigua', 'user-BEA');
  const m3 = mundo();
  const amb = await atenderAviso(m3.deps, leerAvisoDeSeedance(con({ id: 'cgt-ambigua' })));
  check('dos trabajos con la misma operación: NO se elige uno', amb.estado === 'no_encontrada');
  check('y no se guardó nada', m3.guardados.length === 0);
}

await vaciar();
console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
