/**
 * F12-D · EL ÍNDICE DE OPERACIONES DE PROVEEDOR, CONTRA EL EMULADOR.
 *
 * `runtime-asincrono.test.mjs` prueba con un almacén de mentira que encontrar el
 * trabajo de una operación se puede hacer. Esto prueba que el de VERDAD lo hace,
 * y solo se puede probar aquí: que una consulta por un campo de lista funcione
 * sin índice compuesto es una propiedad de la base de datos, no del código.
 *
 *   A · De «la tarea cgt-123» a su trabajo y su intento, con Firestore de verdad.
 *   B · Dos intentos, dos operaciones: el aviso tardío encuentra su sitio.
 *   C · La ambigüedad se DETECTA, no se resuelve eligiendo.
 *   D · Lo que no es de nadie y lo de otra cuenta se contestan igual.
 *   E · Entradas hostiles: nada lanza y nada construye una consulta rara.
 *   F · Sin índice compuesto: la consulta va con el índice automático.
 *   G · El camino entero sobre Firestore: aviso → trabajo cerrado, una sola vez.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore --project wee-dev-geovet \
 *     "node functions/test/runtime-asincrono.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('sin FIRESTORE_EMULATOR_HOST: no se ejecuta'); process.exit(2); }
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'wee-dev-geovet' });
const db = admin.firestore();
const lib = (p) => require(path.resolve(here, '../lib', p));

const trabajosDeWee = lib('job/index.js');
const { almacenDeTrabajos, COLECCION_DE_TRABAJOS } = lib('runtime/almacen.js');
const { atenderAviso } = lib('runtime/atencion.js');
const { leerAvisoDeSeedance } = lib('engine/providers/seedance.js');
const { identidadDelMaterial } = lib('runtime/materializacion.js');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const rechazo = async (p) => { try { await p; return null; } catch (e) { return e; } };

let reloj = 2_000_000;
const { motor } = trabajosDeWee.crearMotorDeTrabajosDeWee();
const almacen = almacenDeTrabajos(db);
const vaciar = async () => { const s = await db.collection(COLECCION_DE_TRABAJOS).get(); await Promise.all(s.docs.map((d) => d.ref.delete())); };

let serie = 0;
/** Un trabajo de verdad, creado por el motor de verdad, con `n` intentos ya salidos y con nombre del proveedor. */
const conOperaciones = async (nombres, extra = {}) => {
  serie++;
  const pet = {
    contract: '1.0',
    principal: { userId: extra.userId ?? 'user-0001' },
    at: reloj,
    capability: 'video.generate',
    implementation: { providerId: 'seedance', modelId: 'dreamina-seedance-2-0-260128' },
    input: { prompt: 'un gato con sombrero' },
    trace: { traceId: `trace-${serie}`, requestId: `req-${String(serie).padStart(4, '0')}`, userId: extra.userId ?? 'user-0001' },
    context: { appId: 'wee', operationId: `op-${serie}` },
    metadata: { creditTransactionId: `usage_op${serie}`, creditRequestId: `op${serie}`, creditsEstimated: 12, service: 'ai_video' },
  };
  let job = motor.crear(pet).transition.job;
  await almacen.crearSiAusente(job);

  const quien = { userId: extra.userId ?? 'user-0001' };
  const worker = `w-${serie}`;
  for (let i = 0; i < nombres.length; i++) {
    const nombre = nombres[i];
    /*
     * EL CAMINO REAL DE UNA TAREA ACEPTADA, paso por paso y con el motor de
     * verdad: reclamar → marcar que sale → el Gateway contesta «la cogió», que
     * el conductor traduce a un desenlace DESCONOCIDO con la referencia del
     * proveedor puesta. Eso es lo que deja el `providerRef` guardado.
     */
    const rec = motor.reclamar(job, { principal: quien, worker, at: reloj });
    job = (await almacen.aplicar(rec.transition)).job;
    const attemptId = job.attempts[job.attempts.length - 1].attemptId;
    const env = motor.marcarEnvio(job, { principal: quien, worker, at: reloj, attemptId });
    job = (await almacen.aplicar(env.transition)).job;
    const ultimo = i === nombres.length - 1;
    const inf = motor.informar(job, {
      principal: quien,
      worker,
      at: reloj,
      report: ultimo || !extra.cerrarIntento
        ? { attemptId, outcome: 'unknown', dispatched: true, providerRef: { providerId: 'seedance', operationId: nombre } }
        : { attemptId, outcome: 'failed', dispatched: true, providerRef: { providerId: 'seedance', operationId: nombre }, error: { code: 'PROVIDER_ERROR', source: 'adapter:seedance' } },
    });
    job = (await almacen.aplicar(inf.transition)).job;
    /* Un reintento no se puede coger hasta que pase su espera: el reloj avanza como en la vida real. */
    if (!ultimo) reloj = Math.max(reloj, job.availableAt) + 1;
  }
  return job;
};

/* ═══ A · DE LA OPERACIÓN AL TRABAJO Y AL INTENTO ══════════════════════════ */
console.log('\n── A · Encontrar el trabajo, con Firestore de verdad ──');
await vaciar();
{
  const job = await conOperaciones(['cgt-20260920-aaa']);
  const r = await almacen.porReferenciaDeProveedor('seedance', 'cgt-20260920-aaa');
  check('se encuentra el trabajo por cómo llama el proveedor a la tarea', r.ok && r.job.jobId === job.jobId);
  check('y su INTENTO, que es lo que el motor exige para admitir un aviso', r.ok && r.intento.attemptId === job.attempts[job.attempts.length - 1].attemptId);
  check('el trabajo vuelve entero: el índice es para buscar, la verdad sigue en el `json`', r.ok && r.job.trace.requestId === job.trace.requestId && r.job.capability === 'video.generate');

  const doc = await db.collection(COLECCION_DE_TRABAJOS).doc(`j.${job.jobId}`).get();
  check('el documento declara la operación en un campo de lista consultable', Array.isArray(doc.get('providerOps')) && doc.get('providerOps').includes('seedance:cgt-20260920-aaa'));
  check('y el enlace del proveedor NO está en ninguna parte del documento', !JSON.stringify(doc.data()).includes('ark-content'));
}

/* ═══ B · DOS INTENTOS, DOS OPERACIONES ════════════════════════════════════ */
console.log('\n── B · El aviso que llega tarde, de un intento anterior ──');
await vaciar();
{
  const job = await conOperaciones(['cgt-PRIMERA', 'cgt-SEGUNDA'], { cerrarIntento: true });
  const vieja = await almacen.porReferenciaDeProveedor('seedance', 'cgt-PRIMERA');
  const nueva = await almacen.porReferenciaDeProveedor('seedance', 'cgt-SEGUNDA');
  check('un aviso de la PRIMERA tarea encuentra su trabajo', vieja.ok && vieja.job.jobId === job.jobId);
  check('y encuentra SU intento, no el que está en curso', vieja.ok && nueva.ok && vieja.intento.attemptId !== nueva.intento.attemptId);
  check('quedarse solo con la última operación habría perdido la mitad de los avisos', vieja.ok && nueva.ok);
}

/* ═══ C · LA AMBIGÜEDAD SE VE ══════════════════════════════════════════════ */
console.log('\n── C · Dos trabajos con la misma operación ──');
await vaciar();
{
  await conOperaciones(['cgt-REPETIDA']);
  await conOperaciones(['cgt-REPETIDA']);
  const r = await almacen.porReferenciaDeProveedor('seedance', 'cgt-REPETIDA');
  check('no se elige uno —elegir sería inventarse de quién es el dinero—: se dice que es ambigua', r.ok === false && r.motivo === 'ambigua');
}

/* ═══ D · LO QUE NO ES DE NADIE ════════════════════════════════════════════ */
console.log('\n── D · La misma respuesta para lo que no existe y para lo ajeno ──');
await vaciar();
{
  const deAna = await conOperaciones(['cgt-DE-ANA'], { userId: 'user-ANA' });
  const noHay = await almacen.porReferenciaDeProveedor('seedance', 'cgt-NO-EXISTE');
  check('una operación que no existe: no encontrada', noHay.ok === false && noHay.motivo === 'no_encontrada');
  const otroProveedor = await almacen.porReferenciaDeProveedor('flux', 'cgt-DE-ANA');
  check('el mismo nombre en otro proveedor: tampoco —la clave lleva los dos—', otroProveedor.ok === false && otroProveedor.motivo === 'no_encontrada');
  const suya = await almacen.porReferenciaDeProveedor('seedance', 'cgt-DE-ANA');
  check('y la cuenta NO sale de la consulta: sale del trabajo que se devuelve', suya.ok && suya.job.owner.userId === 'user-ANA' && suya.job.jobId === deAna.jobId);
}

/* ═══ E · ENTRADAS HOSTILES ════════════════════════════════════════════════ */
console.log('\n── E · Nada lanza, nada construye una consulta rara ──');
{
  const hostiles = [
    ['seedance', '../../otros/x'], ['seedance', 'a/b'], ['../x', 'y'], ['seedance', ''], ['', 'x'],
    ['seedance', 'x'.repeat(5000)], ['seedance', '\n'], ['seedance', '__proto__'], ['seedance', 'a b'],
  ];
  let lanzo = 0; let encontro = 0;
  for (const [p, o] of hostiles) {
    const e = await rechazo(almacen.porReferenciaDeProveedor(p, o));
    if (e) lanzo++;
    else { const r = await almacen.porReferenciaDeProveedor(p, o); if (r.ok) encontro++; }
  }
  check('ninguna entrada hostil lanza', lanzo === 0, `lanzaron ${lanzo}`);
  check('y ninguna encuentra nada', encontro === 0, `encontraron ${encontro}`);
  const raros = await Promise.all([undefined, null, 1, {}, [], true].map((v) => rechazo(almacen.porReferenciaDeProveedor(v, v))));
  check('tampoco los tipos que no son texto', raros.every((e) => e === null));
}

/* ═══ F · SIN ÍNDICE COMPUESTO ═════════════════════════════════════════════ */
console.log('\n── F · La consulta va con el índice automático ──');
await vaciar();
{
  const job = await conOperaciones(['cgt-INDICE']);
  /* Si esto necesitara un índice compuesto, Firestore lo diría con FAILED_PRECONDITION. */
  const e = await rechazo(db.collection(COLECCION_DE_TRABAJOS).where('providerOps', 'array-contains', 'seedance:cgt-INDICE').limit(2).get());
  check('`array-contains` + `limit` no pide índice compuesto', e === null, e ? String(e.message).slice(0, 120) : '');
  const s = await db.collection(COLECCION_DE_TRABAJOS).where('providerOps', 'array-contains', 'seedance:cgt-INDICE').limit(2).get();
  check('y devuelve exactamente el trabajo que la declara', s.size === 1 && s.docs[0].get('jobId') === job.jobId);
}

/* ═══ G · EL CAMINO ENTERO SOBRE FIRESTORE ═════════════════════════════════ */
console.log('\n── G · De un aviso de ModelArk a un trabajo cerrado ──');
await vaciar();
{
  const job = await conOperaciones(['cgt-FINAL']);
  const guardados = [];
  const deps = {
    trabajos: almacen,
    motor,
    almacen,
    materializar: { async guardar(p) { const ya = guardados.some((g) => g.assetId === p.assetId); guardados.push(p); return { ok: true, assetId: p.assetId, yaEstaba: ya }; } },
    ahora: () => reloj + 5_000,
  };
  const aviso = leerAvisoDeSeedance({ id: 'cgt-FINAL', status: 'succeeded', updated_at: 1_700_000_100, content: { video_url: 'https://ark.example/v.mp4?sig=SECRETO' }, usage: { completion_tokens: 108_000 } });

  const r = await atenderAviso(deps, aviso);
  const esperado = identidadDelMaterial(job.jobId, job.attempts[job.attempts.length - 1].attemptId);
  check('el aviso cierra el trabajo y deja el material como salida', r.estado === 'aplicado' && r.assetId === esperado);
  const guardado = await almacen.obtener(job.jobId);
  check('y el trabajo guardado en Firestore quedó terminado', guardado.state === 'completed' && guardado.result.outputRefs[0] === esperado);
  check('la cuenta del material salió del trabajo, no del aviso', guardados[0].userId === 'user-0001');
  check('el enlace del proveedor no llegó a Firestore', !JSON.stringify((await db.collection(COLECCION_DE_TRABAJOS).doc(`j.${job.jobId}`).get()).data()).includes('SECRETO'));

  /* El mismo aviso, tres veces más: es lo que hace ModelArk cuando no confirmas en cinco segundos. */
  const repes = await Promise.all([atenderAviso(deps, aviso), atenderAviso(deps, aviso), atenderAviso(deps, aviso)]);
  check('los tres reintentos del proveedor no hacen nada: el trabajo ya estaba cerrado', repes.every((x) => x.estado === 'repetido'));
  check('y no dejan un segundo material', new Set(guardados.map((g) => g.assetId)).size === 1);
  const despues = await almacen.obtener(job.jobId);
  check('el trabajo no se movió ni una revisión más de lo debido', despues.revision === guardado.revision && despues.state === 'completed');
}

/* ── Concurrencia de verdad: dos entregas simultáneas sobre Firestore ─────── */
await vaciar();
{
  const job = await conOperaciones(['cgt-CARRERA']);
  const guardados = new Map();
  const deps = {
    trabajos: almacen,
    motor,
    almacen,
    materializar: { async guardar(p) { const ya = guardados.has(p.assetId); guardados.set(p.assetId, p); return { ok: true, assetId: p.assetId, yaEstaba: ya }; } },
    ahora: () => reloj + 5_000,
  };
  const aviso = leerAvisoDeSeedance({ id: 'cgt-CARRERA', status: 'succeeded', updated_at: 1_700_000_100, content: { video_url: 'https://ark.example/v.mp4' } });
  const carrera = await Promise.all([atenderAviso(deps, aviso), atenderAviso(deps, aviso), atenderAviso(deps, aviso)]);
  check('con el CAS de Firestore de verdad, exactamente UNA entrega aplica', carrera.filter((x) => x.estado === 'aplicado').length === 1, carrera.map((x) => x.estado).join(','));
  check('las otras se encuentran el trabajo ya movido y no hacen nada', carrera.filter((x) => x.estado === 'repetido').length === 2);
  check('y queda UN solo material', guardados.size === 1);
  const final = await almacen.obtener(job.jobId);
  check('el trabajo quedó cerrado una sola vez', final.state === 'completed');
}

await vaciar();
console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
