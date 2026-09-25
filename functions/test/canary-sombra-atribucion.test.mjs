/*
 * CANARY DE LA SOMBRA — DE QUIÉN ES CADA CARGO (#3) Y CADA EJECUCIÓN (#5).
 *
 * El monitor de la canary de Travel (`scripts/canary-sombra.mjs`) marcaba STOP en #3
 * y #5 con CUALQUIER cargo de la cuenta de la canary y CUALQUIER trabajo suyo que
 * pasara de «planificado». El Request 4 (Japón, 2026-09-25) lo destapó: la persona
 * pulsó «Crear», `creatorRun` (Legacy) ejecutó y cobró 3 Credits, y el monitor se lo
 * achacó a la sombra. Ahora #3 y #5 preguntan por la IDENTIDAD de la sombra, la que
 * pone su propio código: `shadowRunId` = `<jobId>:algoritmo` en `private/sombra`, y
 * sus sellos.
 *
 * Todo aquí es local y sintético: ni Firestore, ni red, ni cargos, ni trabajos. El
 * Request 4 entra como FIXTURE: sus identificadores, tipos e importes, sin un solo
 * texto de nadie.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const S = require(path.resolve(RAIZ, 'functions/lib/creator/sombra.js'));
const A = await import(pathToFileURL(path.resolve(RAIZ, 'scripts/canary-sombra-atribucion.mjs')).href);

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const ID = A.identidadDeLaSombra(S);
const CUENTA = 'cuenta-de-la-canary';
const OTRA = 'otra-cuenta';
const J4 = 'ThJWYprsHFWirFhiNscB';
const hechos = (extra = {}) => ({
  idsDeLaSombra: new Set([`${J4}:algoritmo`]),
  creditos: [], filas: [], trabajos: [], jobsNuevos: [], workflowsNuevos: [], estadisticasTocadas: 0, ...extra,
});
const c3 = (h) => A.condicionCreditos(h, ID, CUENTA);
const c5 = (h) => A.condicionEjecuciones(h, ID, CUENTA);

/*
 * EL REQUEST 4 TAL COMO QUEDÓ EN PRODUCCIÓN: la sombra observó el plan (su
 * `private/sombra` con `<jobId>:algoritmo`), la persona pulsó «Crear» y Legacy
 * ejecutó y cobró. Identificadores e importes reales; la cuenta, con otro nombre.
 */
const CARGO_R4 = { id: `usage_${J4}`, userId: CUENTA, type: 'usage', amount: -3, status: 'COMPLETED', source: 'weë-creator', requestId: J4, generationId: J4, meta: {} };
const FILA_EJECUCION_R4 = { id: '3RXxwNXY2L98SbJV6DD4', jobId: J4, userId: CUENTA, stepId: 'itinerary', requestId: `${J4}:itinerary`, capability: 'text.search', creditTransactionId: `usage_${J4}` };
const FILA_PLANIFICACION_R4 = { id: 'OWIlTzpi0egAU2CtOPcU', jobId: J4, userId: CUENTA, stepId: null, requestId: null, capability: 'text.structure', creditTransactionId: null };
const request4 = () => hechos({
  creditos: [CARGO_R4],
  filas: [FILA_EJECUCION_R4, FILA_PLANIFICACION_R4],
  trabajos: [
    { id: J4, userId: CUENTA, status: 'done' },
    { id: 'PYJhb3IBLkrwcwkzjXE4', userId: CUENTA, status: 'planned' },
    { id: 'RNna9hcNJ8xMTDCojcCW', userId: CUENTA, status: 'planned' },
    { id: '3jMUA0bF71CCe8UhYzB6', userId: CUENTA, status: 'planned' },
  ],
  estadisticasTocadas: 2,
});

console.log('\n── A · La identidad de la sombra sale de SU código, no de aquí ──');
{
  const idDelCodigo = S.peticionDeLaSombra({ jobId: 'J', userId: 'u', experienceId: 'travel', pasos: [] }).shadowRunId;
  check('1 · el sufijo del shadowRunId es el que pone peticionDeLaSombra', idDelCodigo === 'J:algoritmo' && ID.sufijos[0] === 'algoritmo', idDelCodigo);
  check('1 · los otros dos sellos son los de sombra.js, tal cual', ID.sufijos[1] === S.SELLO_DE_LA_SOMBRA && ID.sufijos[2] === S.SELLO_DEL_PUENTE && igual(ID.sufijos, ['algoritmo', 'sombra', 'sombra-puente']), JSON.stringify(ID.sufijos));
  check('1 · y la capacidad con la que el camino brain entiende también', ID.capacidadDelEntendimiento === S.CAPACIDAD_DEL_ENTENDIMIENTO && typeof ID.capacidadDelEntendimiento === 'string');
  const ids = new Set([`${J4}:algoritmo`, 'un-id-guardado-sin-sufijo']);
  check('2 · nombra la sombra: <job>:algoritmo, <job>:sombra, <job>:sombra-puente',
    A.nombraLaSombra(`${J4}:algoritmo`, ID, ids) && A.nombraLaSombra('X:sombra', ID, ids) && A.nombraLaSombra('X:sombra-puente', ID, ids));
  check('2 · y un shadowRunId que está guardado en private/sombra, tenga la forma que tenga', A.nombraLaSombra('un-id-guardado-sin-sufijo', ID, ids));
  check('2 · NO la nombran: el trabajo, su paso de Legacy, el id del cargo ni la cuenta',
    !A.nombraLaSombra(J4, ID, ids) && !A.nombraLaSombra(`${J4}:itinerary`, ID, ids) && !A.nombraLaSombra(`usage_${J4}`, ID, ids) && !A.nombraLaSombra(CUENTA, ID, ids)
    && !A.nombraLaSombra(undefined, ID, ids) && !A.nombraLaSombra('', ID, ids));
  let lanza = false;
  try { A.identidadDeLaSombra({ ...S, peticionDeLaSombra: () => ({ shadowRunId: 'otra-forma' }) }); } catch { lanza = true; }
  check('2 · si el código cambiara la forma del shadowRunId, la atribución se niega (falla cerrada)', lanza);
}

console.log('\n── B · El Request 4 (Japón): Legacy cobró y ejecutó; la sombra, nada ──');
{
  const r3 = c3(request4());
  check('3 · #3 = OK con el cargo de Legacy delante', r3.estado === 'OK', r3.estado);
  check('3 · shadowCreditsCharged = 0 y legacyCreditsCharged = 3', r3.shadowCreditsCharged === 0 && r3.legacyCreditsCharged === 3, `${r3.shadowCreditsCharged} / ${r3.legacyCreditsCharged}`);
  check('3 · el cargo es de LEGACY porque lo enlaza su fila de ejecución (creditTransactionId)', r3.movimientos.length === 1 && r3.movimientos[0].de === 'LEGACY' && /fila de ejecución de Legacy/.test(r3.movimientos[0].por), JSON.stringify(r3.movimientos));
  const r5 = c5(request4());
  check('4 · #5 = OK con la ejecución de Legacy delante', r5.estado === 'OK', r5.estado);
  check('4 · shadowExecutionJobs = 0 y legacyExecutionJobs = 1', r5.shadowExecutionJobs === 0 && r5.legacyExecutionJobs === 1, `${r5.shadowExecutionJobs} / ${r5.legacyExecutionJobs}`);
  check('4 · la ejecución de LEGACY es la del trabajo de Japón, y los tres planificados no cuentan', r5.trabajosEjecutados.length === 1 && r5.trabajosEjecutados[0].id === J4 && r5.trabajosEjecutados[0].de === 'LEGACY');
  /* CONTROL: con las reglas de antes, este mismo Request 4 daba dos STOP. */
  const antes3 = request4().creditos.some((t) => t.userId === CUENTA) ? 'STOP' : 'OK';
  const antes5 = request4().trabajos.some((t) => t.userId === CUENTA && !['asking', 'planned'].includes(t.status)) ? 'STOP' : 'OK';
  check('5 · CONTROL: las reglas de antes (cuenta / estado del trabajo) daban STOP y STOP aquí', antes3 === 'STOP' && antes5 === 'STOP');
}

console.log('\n── C · Caso A: evidencia de la sombra + un cargo de Legacy ──');
{
  /* Sin fila que lo enlace: solo la retención de creatorRun sobre su trabajo. */
  const h = hechos({ creditos: [{ ...CARGO_R4, generationId: undefined }], trabajos: [{ id: J4, userId: CUENTA, status: 'done' }] });
  const r = c3(h);
  check('6 · la retención de creatorRun (weë-creator sobre su trabajo) es de LEGACY, y #3 = OK', r.estado === 'OK' && r.movimientos[0].de === 'LEGACY' && r.shadowCreditsCharged === 0 && r.legacyCreditsCharged === 3, `${r.estado} · ${r.movimientos[0].por}`);
  const tarde = c3(hechos({ ...request4(), creditos: [{ ...CARGO_R4 }] }));
  check('6 · que el cargo llegue DESPUÉS de la sombra, sobre el mismo trabajo, no lo hace de la sombra', tarde.estado === 'OK' && tarde.shadowCreditsCharged === 0);
}

console.log('\n── D · Caso B: evidencia de la sombra + una ejecución de Legacy ──');
{
  const h = hechos({ trabajos: [{ id: J4, userId: CUENTA, status: 'done' }], filas: [FILA_EJECUCION_R4] });
  const r = c5(h);
  check('7 · la ejecución de creatorRun (requestId <job>:<paso>) es de LEGACY, y #5 = OK', r.estado === 'OK' && r.shadowExecutionJobs === 0 && r.legacyExecutionJobs === 1, `${r.estado}`);
  const fallida = c5(hechos({ trabajos: [{ id: J4, userId: CUENTA, status: 'failed' }], filas: [FILA_EJECUCION_R4] }));
  check('7 · y también si terminó mal: sigue siendo Legacy', fallida.estado === 'OK' && fallida.legacyExecutionJobs === 1);
}

console.log('\n── E · Caso C: un cargo de la sombra (sintético) → #3 STOP ──');
{
  const cargo = (extra) => ({ id: 'cargo-sintetico', userId: CUENTA, type: 'usage', amount: -2, status: 'COMPLETED', source: 'sintetico', ...extra });
  const r1 = c3(hechos({ creditos: [cargo({ requestId: `${J4}:algoritmo` })] }));
  check('8 · requestId = shadowRunId → STOP, y el importe cuenta como de la sombra', r1.estado === 'STOP' && r1.shadowCreditsCharged === 2 && r1.legacyCreditsCharged === 0, `${r1.estado} · ${r1.shadowCreditsCharged}`);
  const r2 = c3(hechos({ creditos: [cargo({ id: 'cargo-b' })], filas: [{ id: 'fila-b', jobId: J4, stepId: S.SELLO_DE_LA_SOMBRA, requestId: `${J4}:${S.SELLO_DE_LA_SOMBRA}`, capability: 'text.structure', creditTransactionId: 'cargo-b' }] }));
  check('8 · lo enlaza (creditTransactionId) una fila del camino brain de la sombra → STOP', r2.estado === 'STOP' && r2.movimientos[0].de === 'SOMBRA', r2.movimientos[0].por);
  const r3 = c3(hechos({ creditos: [cargo({ generationId: 'fila-c' })], filas: [{ id: 'fila-c', jobId: J4, stepId: null, requestId: `${J4}:algoritmo`, capability: 'text.search' }] }));
  check('8 · su generationId es una fila etiquetada por la sombra → STOP', r3.estado === 'STOP');
  const r4 = c3(hechos({ creditos: [cargo({ meta: { shadowRunId: `${J4}:algoritmo` } })] }));
  check('8 · su meta nombra el shadowRunId guardado → STOP', r4.estado === 'STOP');
  const r5 = c3(hechos({ creditos: [cargo({ requestId: `${J4}:${S.SELLO_DEL_PUENTE}` })] }));
  check('8 · el sello del puente también es la sombra → STOP', r5.estado === 'STOP');
  const r6 = c3(hechos({ ...request4(), creditos: [CARGO_R4, cargo({ requestId: `${J4}:algoritmo` })] }));
  check('8 · un cargo de Legacy al lado NO tapa el de la sombra → STOP, con 2 de la sombra y 3 de Legacy', r6.estado === 'STOP' && r6.shadowCreditsCharged === 2 && r6.legacyCreditsCharged === 3, `${r6.shadowCreditsCharged} / ${r6.legacyCreditsCharged}`);
  const r7 = c3(hechos({ creditos: [cargo({ userId: OTRA, requestId: `${J4}:algoritmo` })] }));
  check('8 · la identidad de la sombra no depende de la cuenta: en otra cuenta, también STOP', r7.estado === 'STOP');
}

console.log('\n── F · Caso D: una ejecución de la sombra (sintética) → #5 STOP ──');
{
  const r1 = c5(hechos({ jobsNuevos: [{ id: 'job-motor', requestId: `${J4}:algoritmo`, status: 'queued' }] }));
  check('9 · un trabajo del motor (jobs) con el shadowRunId → STOP', r1.estado === 'STOP' && r1.shadowExecutionJobs === 1, r1.estado);
  const r2 = c5(hechos({ workflowsNuevos: [{ id: 'flujo', trace: { requestId: `${J4}:algoritmo`, traceId: J4 } }] }));
  check('9 · un workflowRun que lo lleva DENTRO (trace.requestId) → STOP', r2.estado === 'STOP' && r2.shadowExecutionJobs === 1, r2.estado);
  const r3 = c5(hechos({ trabajos: [{ id: J4, userId: CUENTA, status: 'done' }], filas: [{ id: 'fila-d', jobId: J4, stepId: 'itinerary', requestId: `${J4}:algoritmo`, capability: 'text.search' }] }));
  check('9 · un trabajo de WEË AI ejecutado cuyo libro de ejecución lleva la identidad de la sombra → STOP', r3.estado === 'STOP' && r3.shadowExecutionJobs === 1 && r3.legacyExecutionJobs === 0);
  const r4 = c5(hechos({ ...request4(), jobsNuevos: [{ id: 'job-motor', contextRef: { shadowRunId: `${J4}:algoritmo` } }] }));
  check('9 · una ejecución de Legacy al lado NO tapa la de la sombra → STOP, 1 y 1', r4.estado === 'STOP' && r4.shadowExecutionJobs === 1 && r4.legacyExecutionJobs === 1, `${r4.shadowExecutionJobs} / ${r4.legacyExecutionJobs}`);
}

console.log('\n── G · La cuenta o el trabajo, SOLOS, no atribuyen nada a la sombra ──');
{
  const r = c3(hechos({ creditos: [{ id: 'cargo-sin-rastro', userId: CUENTA, type: 'usage', amount: -5, status: 'COMPLETED' }] }));
  check('10 · un cargo de la cuenta de la canary SIN identificadores no es de la sombra: INVESTIGAR, no STOP', r.estado === 'INVESTIGAR' && r.shadowCreditsCharged === 0 && r.movimientos[0].de === 'SIN_ATRIBUIR' && r.sinAtribuirDeLaCuenta === 1, r.estado);
  const otra = c3(hechos({ creditos: [{ id: 'cargo-ajeno', userId: OTRA, type: 'usage', amount: -1 }] }));
  check('10 · uno sin rastro de OTRA cuenta no se le cuenta a la canary: OK', otra.estado === 'OK' && otra.sinAtribuirDeLaCuenta === 0);
  const e = c5(hechos({ trabajos: [{ id: J4, userId: CUENTA, status: 'done' }] }));
  check('11 · un trabajo de la canary ejecutado SIN libro no es de la sombra (solo creatorRun lo mueve): LEGACY, OK', e.estado === 'OK' && e.shadowExecutionJobs === 0 && e.legacyExecutionJobs === 1);
  const entiende = c5(hechos({ trabajos: [{ id: J4, userId: CUENTA, status: 'done' }], filas: [FILA_EJECUCION_R4, { id: 'fila-brain', jobId: J4, stepId: S.SELLO_DE_LA_SOMBRA, requestId: `${J4}:${S.SELLO_DE_LA_SOMBRA}`, capability: S.CAPACIDAD_DEL_ENTENDIMIENTO }] }));
  check('12 · la llamada con la que el camino brain ENTIENDE es proveedor (#1/#7), no convierte en sombra la ejecución de Legacy', entiende.estado === 'OK' && entiende.legacyExecutionJobs === 1);
  const motor = c5(hechos({ jobsNuevos: [{ id: 'job-sin-dueno', requestId: 'algo-ajeno' }] }));
  check('13 · un trabajo del motor sin identidad de nadie: INVESTIGAR (ni se calla ni se le achaca a la sombra)', motor.estado === 'INVESTIGAR' && motor.shadowExecutionJobs === 0);
  const stats = c3(hechos({ estadisticasTocadas: 1 }));
  check('13 · estadísticas de Credits tocadas sin ningún movimiento que las explique: INVESTIGAR', stats.estado === 'INVESTIGAR' && stats.estadisticasSinExplicar === true);
}

console.log('\n── H · Sin verdes vacíos ──');
{
  const vacio3 = c3(hechos());
  const vacio5 = c5(hechos());
  check('14 · sin hechos: OK con ceros de verdad (números, no undefined)', vacio3.estado === 'OK' && vacio5.estado === 'OK'
    && vacio3.shadowCreditsCharged === 0 && vacio3.legacyCreditsCharged === 0 && vacio5.shadowExecutionJobs === 0 && vacio5.legacyExecutionJobs === 0);
  const deOtra = c3(hechos({ ...request4(), creditos: [{ ...CARGO_R4, userId: OTRA }] }));
  check('14 · la cuenta no decide la sombra: el cargo de Legacy de otra cuenta sigue siendo LEGACY y no suma a la canary', deOtra.estado === 'OK' && deOtra.movimientos[0].de === 'LEGACY' && deOtra.legacyCreditsCharged === 0);
  check('14 · y las funciones de atribución de filas conocen las tres formas de Legacy',
    A.atribuirFila(FILA_EJECUCION_R4, ID, new Set()) === 'LEGACY' && A.atribuirFila(FILA_PLANIFICACION_R4, ID, new Set()) === 'LEGACY'
    && A.atribuirFila({ id: 'b', jobId: null, stepId: null, requestId: 'brain_123', capability: 'text.generate' }, ID, new Set()) === 'LEGACY'
    && A.atribuirFila({ id: 's', jobId: J4, stepId: S.SELLO_DE_LA_SOMBRA, requestId: `${J4}:${S.SELLO_DE_LA_SOMBRA}`, capability: 'text.structure' }, ID, new Set()) === 'SOMBRA'
    && A.atribuirFila({ id: 'x', jobId: null, stepId: 'raro', requestId: 'otra-cosa' }, ID, new Set()) === 'SIN_ATRIBUIR');
}

console.log(failures === 0 ? '\n✔ todo bien' : `\n✘ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
