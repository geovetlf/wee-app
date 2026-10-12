/*
 * A6 · LAS FRONTERAS: verificación y recuperación en los bordes (R7 · M-02). SOLO PRUEBAS.
 *
 *   NO SE REGALAN RESPUESTAS.
 *   NO SE REPITE LO QUE NO SE PUEDE REPETIR.
 *   NO SE REPLANIFICA LO QUE ALGUIEN MANDÓ PARAR.
 *
 * A6 está probado en aislamiento (`algorithm-verification`, `algorithm-cycle`) y NO está conectado a nada. Lo que le falta es la
 * costura: traducir un trabajo a lo que A6 entiende y decidir qué se hace con lo que propone. La auditoría C de R6 (§3) nombró
 * doce silencios en esa costura. Esta suite los convierte en comprobaciones deterministas contra `functions/lib`, sin tocar
 * `functions/src`, con trabajos REALES del Job Engine y con el oráculo del dinero que ya existe (`decidirLiquidacion`).
 *
 * ── Cómo se llama lo que se fija ────────────────────────────────────────────
 *
 *   FIJADO                         el comportamiento de hoy es el correcto, y queda como contrato.
 *   FIJADO (hueco…)               hoy es así por diseño o por falta de datos; no es una decisión pendiente.
 *   BLOCKED — HUMAN DECISION (Gn)  hoy A6 hace algo indeseado y arreglarlo exige una decisión del dueño (Gn, de R6 §4c).
 *                                  La comprobación fija lo de HOY: el día que se decida, FALLA A PROPÓSITO y obliga a revisar.
 *   SEAM                           la costura de referencia (el traductor del fixture) contra el A6 de verdad: es la
 *                                  especificación ejecutable de lo que habría que escribir en `src`, no código de producción.
 *   GUARD / CONTROL                una guarda, y la prueba de que la guarda muerde.
 *
 * G1 tocar `functions/src` · G2 política del traductor (cancelled, failed sin error, timed_out, sintético, `kind`) ·
 * G3 cambiar lo que A6 decide (`motor-de-recuperacion@2` + contrato 1.13) · G4 abrir el camino de sombra · G5 ejecutar propuestas ·
 * G6 política de Credits para `partial`/`regenerate` · G7 promover A6 de `experimental` a `active`.
 *
 *  A. Quién es, y qué hay y qué no hay en la costura.
 *  B. Las doce fronteras de R6 §3 (F1–F12).
 *  C. Lo que A3, A4 y A5 generan y A6 no lee.
 *  D. Independencia: A6 sin proveedor, modelo ni capacidad concreta.
 *  E. El traductor de referencia: el contrato de la costura.
 *  F. La tabla de efectos y la puerta de ejecución: no se regala, no se repite, no se replanifica una cancelación.
 *  G. Determinismo: doce corridas, arrays barajados, entradas congeladas.
 *
 * Sin red, sin reloj del sistema, sin azar y sin emulador. El texto de salida es idéntico en cada corrida.
 */
import path from 'node:path';
import fs from 'node:fs';
import {
  A, CORE, ALGORITHM_CONTRACT_VERSION, CAPACIDAD_INVENTADA, KIND_INVENTADO, T0, AHORA, RAIZ,
  EFECTOS, EJECUCION, OMISIONES, PUERTAS, CLAVES_BLANCAS, RegistroDeReferencia,
  ahoraDe, barajar, barajarProfundo, canon, clavesDe, clonar, congelarProfundo,
  construirTrabajos, crearMotores, decidirLiquidacion, decisionBase, evaluadorDeNoVacia, evaluar, hashDe,
  idsDelCatalogo, kindsDe, leer, modalidadQueProduce, paso, puertaDeEjecucion, reservaDe, senalesDeLosPasos,
  sinComentarios, tipoDeMaterialDe, traducir, vigente,
} from './_verificacion-fixtures.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/* Una comprobación que revienta es una comprobación que falla, y no una suite que se cae con las demás dentro. */
const sinReventar = (fn) => { try { return fn(); } catch (e) { return { lanzo: String(e?.message ?? e) }; } };

const { a6, rec } = crearMotores();
const verificar = (req) => a6.verificar(req);
const analizar = (req, ctx = {}) => { const v = a6.verificar(req); return { v, r: rec.analizar(v, ctx) }; };
const con = (codigo, extra = {}) => ({ ...extra, metadata: { errorCode: codigo, ...(extra.metadata ?? {}) } });
const res = (id, extra = {}) => ({ id, status: 'succeeded', outputs: [], ...extra });
const sal = (kind, ref, extra = {}) => ({ kind, ref, ...extra });
const IMG = [{ kind: 'image' }];
const conFallo = (code, extra = {}) => ({ expected: IMG, actual: res('r', { status: 'failed', error: { code }, ...extra }) });
const kinds = kindsDe;
const lista = (r) => kinds(r).join(',') || '—';
const sellos = (x) => canon(x);

const B = (g, texto) => `BLOCKED — HUMAN DECISION (${g}) · ${texto}`;
const FIJADO = (texto) => `FIJADO · ${texto}`;
const SEAM = (texto) => `SEAM · ${texto}`;

const TRABAJOS = construirTrabajos();

/* `cerrar` necesita una decisión ENTREGADA: el ciclo de A9 con una capacidad inventada y una observación sintética. */
const T1 = T0 + 30 * 86_400_000;
const TAREA = { id: 'T', steps: [paso('a'), paso('b', ['a']), paso('c', ['a']), paso('d', ['b', 'c'])] };
const ciclo = A.crearCicloAlgoritmico();
const R = ciclo.decidir({ decision: decisionBase(senalesDeLosPasos(TAREA)), tarea: TAREA, expected: [{ kind: 'text' }], componer: { paralelizar: true, optimizar: true } });
const observar = (kind, actual, extra = {}) => ({ kind, at: T1, actual, ...extra });
/* Exactamente lo que `cerrar` le pasa a la recuperación (`integration-cycle.ts`): las alternativas de la decisión y si había respaldo. */
const loQueCerrarPasa = (resultado) => ({
  alternatives: resultado.decision.alternatives.map((v) => resultado.decision.candidates.find((c) => c.value === v).id),
  hasFallback: resultado.strategies.estrategias.some((c) => c.value.isFallback === true),
});

/* ═══ A · QUIÉN ES, Y QUÉ HAY Y QUÉ NO HAY EN LA COSTURA ════════════════════ */

console.log('\n─── A. Quién es, y qué hay y qué no hay en la costura ───');

check(FIJADO('los dos motores, foto de hoy: DOS, puros, `experimental`, verificación @2 y recuperación @1. Si cambia lo que A6 DECIDE (G3: `motor-de-recuperacion@2` y contrato 1.13) esta comprobación falla a propósito: obliga a revisar las fijadas con BLOCKED de abajo'),
  A.DESCRIPTOR_DE_VERIFICACION.category === 'verification' && A.DESCRIPTOR_DE_VERIFICACION.version === 2
  && A.DESCRIPTOR_DE_RECUPERACION.category === 'recovery' && A.DESCRIPTOR_DE_RECUPERACION.version === 1
  && [A.DESCRIPTOR_DE_VERIFICACION, A.DESCRIPTOR_DE_RECUPERACION].every((d) => d.status === 'experimental' && d.purity === 'pure')
  && typeof a6.verificar === 'function' && a6.analizar === undefined && typeof rec.analizar === 'function' && rec.verificar === undefined,
  `${A.DESCRIPTOR_DE_VERIFICACION.id}@${A.DESCRIPTOR_DE_VERIFICACION.version} · ${A.DESCRIPTOR_DE_RECUPERACION.id}@${A.DESCRIPTOR_DE_RECUPERACION.version} · contrato ${ALGORITHM_CONTRACT_VERSION}`);

/* Dónde está cada cosa, deducido de los archivos: A3 = estrategias, A4 = paralelización, A5 = optimización. */
check('A2 · quién es quién, leído de los descriptores y no supuesto: A3 `motor-de-estrategias`, A4 `motor-de-paralelizacion`, A5 `motor-de-optimizacion`',
  A.DESCRIPTOR_DE_ESTRATEGIAS.category === 'strategy' && A.DESCRIPTOR_DE_PARALELIZACION.category === 'parallelization'
  && A.DESCRIPTOR_DE_OPTIMIZACION.category === 'optimization'
  && A.DESCRIPTOR_DE_ESTRATEGIAS.id === 'motor-de-estrategias' && A.DESCRIPTOR_DE_PARALELIZACION.id === 'motor-de-paralelizacion'
  && A.DESCRIPTOR_DE_OPTIMIZACION.id === 'motor-de-optimizacion');

const archivosDe = (dir, out = []) => {
  for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
    const hijo = `${dir}/${e.name}`;
    if (e.isDirectory()) archivosDe(hijo, out); else if (/\.ts$/.test(e.name)) out.push(hijo);
  }
  return out;
};
const FUERA_DE_A = archivosDe('functions/src').filter((f) => !f.startsWith('functions/src/core/algorithm/'));
const TIPOS_DE_A6 = /ResultadoAVerificar|VerificationRequest|ContextoDeRecuperacion|ObservacionDeEjecucion|crearMotorDeVerificacion|crearMotorDeRecuperacion|VerificationEvaluator/;
check(FIJADO('A6 no está conectado: ningún archivo de `functions/src` fuera de `core/algorithm` nombra sus tipos ni sus motores, y quien carga la capa es la sombra —`creator/sombra.ts`, solo `decidir`—. El día que alguien escriba el traductor en `src` (G1) esta guarda falla y hay que enmendarla'),
  FUERA_DE_A.length > 100
  && FUERA_DE_A.filter((f) => TIPOS_DE_A6.test(sinComentarios(leer(f)))).length === 0
  && FUERA_DE_A.filter((f) => /core\/algorithm/.test(sinComentarios(leer(f)))).every((f) => f === 'functions/src/creator/sombra.ts')
  && !/\.cerrar\(|crearMotorDeVerificacion|crearMotorDeRecuperacion/.test(sinComentarios(leer('functions/src/creator/sombra.ts'))),
  `${FUERA_DE_A.length} archivos revisados`);

const PAQUETE = JSON.parse(leer('functions/package.json'));
check('A4 · esta suite está en la cadena de `npm test` (si no, no la corre nadie), y el fixture no es una suite',
  PAQUETE.scripts.test.split('&&').map((s) => s.trim()).includes('node test/algorithm-verification-frontera.test.mjs')
  && !PAQUETE.scripts.test.includes('_verificacion-fixtures'));
check('A5 · los trabajos del fixture los produjo el Job Engine de verdad (`crearJobEngine`), no se escribieron a mano: cada uno con su revisión, sus intentos y su estado de la tabla',
  Object.keys(TRABAJOS).length >= 25
  && Object.values(TRABAJOS).every((j) => typeof j.jobId === 'string' && Number.isInteger(j.revision) && Object.prototype.hasOwnProperty.call(CORE.TRANSICIONES_DE_TRABAJO, j.state)),
  `${Object.keys(TRABAJOS).length} trabajos · ${[...new Set(Object.values(TRABAJOS).map((j) => j.state))].sort().join(', ')}`);

/* Las ANCLAS. Cada silencio de R6 §3 se apoya en un texto que está en el código; si el texto se mueve, la cifra del informe ya no vale. */
const ANCLAS = [
  ['`abort` está documentado «con reembolso» (R6 §3.6 · strategy.ts)', 'functions/src/core/algorithm/strategy.ts', /Parar\. Con reembolso/],
  ['`RetryPolicy.maxAttempts` del Workflow son REINTENTOS de un paso (R6 §3.10 · workflow.ts)', 'functions/src/core/workflow.ts', /Cuántas veces reintentar ESTE paso\. 0 = ninguna/],
  ['`JobRetryPolicy.maxAttempts` del Job Engine son intentos TOTALES (R6 §3.10 · job.ts)', 'functions/src/core/job.ts', /Intentos TOTALES, no reintentos/],
  ['`maxReplans` «no lo lee nadie todavía» (R6 §3.12 · budget.ts)', 'functions/src/core/algorithm/budget.ts', /`maxReplans` no lo lee nadie todavía/],
  ['A3 rellena `strategyId` con prosa (R6 §3.12 · strategy-engine.ts)', 'functions/src/core/algorithm/strategy-engine.ts', /strategyId: 'la principal, si vuelve a estar disponible'/],
  ['el adaptador de Gemini marca como NO reintentable un bloqueo de seguridad (R6 §3.8 · gemini.ts)', 'functions/src/engine/providers/gemini.ts', /SAFETY\|PROHIBITED\|BLOCK\/i\.test\(String\(reason\)\) \? false : true/],
  ['el normalizador del Gateway lo deja en `details.providerRetryable` y el código sigue siendo PROVIDER_ERROR (R6 §3.8 · engine/gateway.ts)', 'functions/src/engine/gateway.ts', /const extra = \{ providerRetryable: error\.retryable \}/],
  ['Legacy guarda el MENSAJE del fallo, no su código (R6 §3.12 · creator/index.ts)', 'functions/src/creator/index.ts', /failing\.error = \(error instanceof Error \? error\.message : String\(error\)\)\.slice\(0, 300\)/],
  ['y el libro de generaciones también (R6 §3.12 · engine/router.ts)', 'functions/src/engine/router.ts', /error: sanitizeForLog\(message, 300\)/],
  ['Legacy reembolsa el trabajo ENTERO ante un fallo (R6 §3.2 · creator/index.ts)', 'functions/src/creator/index.ts', /await settleCredits\(uid, jobId, job\.creditsEstimated, 0, description\)/],
  ['el libro marca `providerCostStatus: desconocido` (R6 §3.7 · engine/ledger.ts)', 'functions/src/engine/ledger.ts', /providerCostStatus\?: 'desconocido' \| 'estimado'/],
  ['Gemini cubre la respuesta vacía en el adaptador (R6 §3.1 · gemini.ts)', 'functions/src/engine/providers/gemini.ts', /la respuesta llegó vacía/],
  ['y DeepSeek también (R6 §3.1 · deepseek.ts)', 'functions/src/engine/providers/deepseek.ts', /la respuesta llegó vacía/],
  ['`completed` ⇒ `liquidar` sin mirar el contenido (R6 §3.1 · runtime/liquidacion.ts)', 'functions/src/runtime/liquidacion.ts', /if \(job\.state === 'completed'\) return \{ tipo: 'liquidar'/],
];
for (const [que, archivo, patron] of ANCLAS) check(`A6 · ANCLA leída · ${que}`, patron.test(leer(archivo)), archivo);

/* ═══ B · LAS DOCE FRONTERAS ═════════════════════════════════════════════════ */

/* ── F1 · VACÍO ──────────────────────────────────────────────────────────── */

console.log('\n─── F1. Vacío: A6 no ve bytes ni texto, y basta una `ref` ───');

for (const [que, salida] of [
  ['una `ref` normal', sal('image', 'asset:x')],
  ['con `bytes: 0` en su metadata', sal('image', 'asset:x', { metadata: { bytes: 0, empty: true } })],
  ['sin campos declarados', sal('image', 'asset:x', { fields: [] })],
  ['con una referencia que es un espacio', sal('image', ' ')],
]) {
  const { v, r } = analizar({ expected: IMG, actual: res('r', { outputs: [salida] }) });
  check(FIJADO(`(hueco por diseño: A6 «no abre materiales») basta una referencia de texto no vacío: ${que} → \`pass\`, \`passed\`, y nada que recuperar`),
    v.status === 'pass' && v.passed === true && r.stoppedBecause === 'nothing_to_recover', `${v.status} · ${r.stoppedBecause}`);
}
for (const [que, salidas] of [['sin `ref`', [sal('image')]], ['con `ref` vacía', [sal('image', '')]], ['sin ninguna salida', []]]) {
  const { v, r } = analizar({ expected: IMG, actual: res('r', { outputs: salidas }) });
  check(FIJADO(`la AUSENCIA sí se ve: ${que} → \`fail\`, salida que falta (\`unmet_requirement\`) y se propone replanificar o parar`),
    v.status === 'fail' && v.passed === false && r.failureClass === 'unmet_requirement' && lista(r) === 'replan,abort', `${v.status} · ${lista(r)}`);
}
{
  const motor = A.crearMotorDeVerificacion({ evaluadores: [evaluadorDeNoVacia] });
  const comprobacion = { id: 'no_vacia:image', type: 'content.no_vacia', subject: 'image', hard: true, severity: 'alto' };
  const pide = (bytes, extra = {}) => ({
    expected: IMG, checks: [comprobacion], ...extra,
    actual: res('r', { outputs: [sal('image', 'asset:x', bytes === undefined ? {} : { metadata: { bytes } })] }),
  });
  const cero = motor.verificar(pide(0));
  const lleno = motor.verificar(pide(2048));
  const sinMedir = motor.verificar(pide(undefined));
  check(FIJADO('lo que A6 no mira lo mira un evaluador por el PUERTO, con el tamaño ya calculado (`Asset.bytes`): con `bytes: 0` la comprobación dura `content.no_vacia` da `fail` y lo dice quién (`by`)'),
    cero.status === 'fail' && cero.passed === false && cero.failures[0]?.by === 'evaluador.no_vacia' && lleno.status === 'pass' && lleno.passed === true,
    `0 bytes → ${cero.status} · 2048 → ${lleno.status}`);
  check(FIJADO('y sin medir el tamaño no se aprueba: una comprobación DURA sin concluir deja el veredicto en `unknown` (NO SABER NO ES APROBAR)'),
    sinMedir.status === 'unknown' && sinMedir.passed === false, sinMedir.status);
  check(FIJADO('(hueco por diseño) el evaluador solo actúa si la costura DECLARA la comprobación: con `bytes: 0` y sin `content.no_vacia` declarada, A6 aprueba'),
    motor.verificar({ expected: IMG, actual: pide(0).actual }).status === 'pass');
}
{
  const vacio = TRABAJOS.completado_vacio;
  const t = traducir(vacio, { esperarLoDeLaCapacidad: true });
  const { v, r } = analizar(t.peticion, t.contexto);
  const dinero = decidirLiquidacion(vacio, AHORA);
  check(SEAM('un trabajo `completed` con CERO referencias: A6 (por la costura) dice `fail` —falta la salida— y propone replanificar o parar, y a la vez `decidirLiquidacion` dice `liquidar`: dinero y veredicto discrepan en un completado vacío. Es lo que el informe C §3.1 llama «`completed ⇒ liquidar` sin mirar contenido», ahora MEDIDO'),
    vacio.state === 'completed' && v.status === 'fail' && lista(r) === 'replan,abort' && dinero.tipo === 'liquidar', `${v.status} · ${lista(r)} · ${dinero.tipo}`);
  const sucio = { ...TRABAJOS.texto_ok, result: { outputRefs: ['', '   ', 'asset:buena'] } };
  check(SEAM('las referencias en blanco no cruzan la costura: de `["", "   ", "asset:buena"]` solo llega `asset:buena`'),
    canon(traducir(sucio, { esperarLoDeLaCapacidad: true }).peticion.actual.outputs) === canon([{ kind: 'text', ref: 'asset:buena' }]));
}

/* ── F2 · PARCIAL ────────────────────────────────────────────────────────── */

console.log('\n─── F2. Parcial: solo `count` da `partial` ───');

const imgs = (k) => Array.from({ length: k }, (_, i) => sal('image', `asset:${i}`));
const ESCENARIOS_PARCIAL = [
  ['count 3 y vienen 2', { expected: [{ kind: 'image', count: 3 }], actual: res('r', { outputs: imgs(2) }) }, 'partial'],
  ['count 3 y vienen 4 (sobran)', { expected: [{ kind: 'image', count: 3 }], actual: res('r', { outputs: imgs(4) }) }, 'partial'],
  ['count 3 y no viene ninguna', { expected: [{ kind: 'image', count: 3 }], actual: res('r') }, 'fail'],
  ['dos clases pedidas y falta UNA (una parte sí y otra no)', { expected: [{ kind: 'image' }, { kind: 'audio' }], actual: res('r', { outputs: imgs(1) }) }, 'fail'],
  ['la salida está pero falló un paso del que dependía', { expected: IMG, actual: res('r', { outputs: imgs(1), failedSteps: ['s2'] }) }, 'fail'],
  ['dos clases, falta una y era opcional', { expected: [{ kind: 'image' }, { kind: 'audio', required: false }], actual: res('r', { outputs: imgs(1) }) }, 'pass'],
];
for (const [que, req, esperado] of ESCENARIOS_PARCIAL) {
  const v = verificar(req);
  check(FIJADO(`${que} → \`${esperado}\`${esperado === 'fail' && /una parte|dependía/.test(que) ? ' (un requisito DURO incumplido manda: no hay `partial` entre clases ni por pasos, aunque la doc de `partial` diga «una parte sí y otra no»)' : ''}`),
    v.status === esperado, v.status);
}
{
  const { v, r } = analizar(ESCENARIOS_PARCIAL[0][1]);
  check(FIJADO('el `partial` de `count` propone quedarse con lo que salió, luego replanificar y por último parar, y sus `affectedSteps` son TIPOS de salida (`image`), no ids de paso'),
    v.status === 'partial' && lista(r) === 'partial,replan,abort' && canon(r.proposals[0].affectedSteps) === canon(['image']), lista(r));
}
for (const [que, req] of [
  ['una salida que pasa', { expected: IMG, actual: res('r', { outputs: imgs(1) }) }],
  ['una salida que falta', { expected: IMG, actual: res('r') }],
  ['un `partial` por `count`', ESCENARIOS_PARCIAL[0][1]],
  ['un estado de otro vocabulario', { expected: IMG, actual: res('r', { status: 'completed', outputs: imgs(1) }) }],
  ['un paso fallido', { expected: IMG, actual: res('r', { outputs: imgs(1), failedSteps: ['s2'] }) }],
]) {
  const a = analizar(req);
  const b = analizar({ ...req, actual: { ...req.actual, completedSteps: ['s1', 's3'] } });
  const c = analizar({ ...req, actual: { ...req.actual, completedSteps: ['paso-que-no-existe'] } });
  check(FIJADO(`(R6 §3.2) \`completedSteps\` no lo lee nadie: con ${que} el veredicto y la recuperación son idénticos con la lista, con otra y sin ella`),
    sellos(a) === sellos(b) && sellos(a) === sellos(c));
}
{
  const { v, r } = analizar({ expected: IMG, actual: res('r', { outputs: imgs(1), failedSteps: ['s2', 's1'] }) });
  const afectados = r.proposals.flatMap((p) => p.affectedSteps ?? []);
  check(FIJADO('un paso fallido es una dependencia (`dependency_failure`), sin sujeto: sus propuestas no acotan nada —ni un id de paso aparece en `affectedSteps`— y se replanifica entero'),
    v.failures.some((f) => f.type === 'structural.dependency' && f.subject === undefined) && r.failureClass === 'dependency_failure'
    && lista(r) === 'replan,abort' && afectados.length === 0, `${r.failureClass} · ${lista(r)}`);
}
check(B('G6', '`partial` y `reduce_scope` solo son PROPUESTAS: quedarse con una parte o pedir menos cambia lo que la persona ve, y cuánto se cobra por eso lo decide una política de Credits que no existe (Legacy reembolsa el trabajo entero, ancla arriba). La tabla de efectos las marca `visible` y bajo la puerta del dueño'),
  EJECUCION.partial?.efecto === 'visible' && EJECUCION.partial?.puerta === 'autoriza_el_dueno'
  && EJECUCION.reduce_scope?.efecto === 'visible' && EJECUCION.reduce_scope?.puerta === 'autoriza_el_dueno');

/* ── F3 · FORMATO ────────────────────────────────────────────────────────── */

console.log('\n─── F3. Formato: `kind` es texto, y `Modality` no es `AssetKind` ───');

for (const [esperada, salida] of [['voice', 'audio'], ['doc', 'document'], ['music', 'audio'], ['3d', 'model3d'], ['Image', 'image']]) {
  const v = verificar({ expected: [{ kind: esperada }], actual: res('r', { outputs: [sal(salida, 'asset:x')] }) });
  check(FIJADO(`\`kind\` se compara como TEXTO, tal cual: se espera «${esperada}» y sale «${salida}» → \`fail\` («falta»), por vocabulario y no por contenido`),
    v.status === 'fail' && v.failures[0].because === `falta «${esperada}»`, v.failures[0]?.because);
}
{
  const unionDe = (archivo, nombre) => new Set([...(leer(archivo).match(new RegExp(`export type ${nombre} =([^;]+);`)) ?? [, ''])[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
  const modalidades = unionDe('functions/src/core/capability.ts', 'Modality');
  const clases = unionDe('functions/src/core/content/asset.ts', 'AssetKind');
  const soloModalidad = [...modalidades].filter((x) => !clases.has(x)).sort();
  const soloClase = [...clases].filter((x) => !modalidades.has(x)).sort();
  check(FIJADO('(R6 §3.3) los dos vocabularios son DISTINTOS, leído de las uniones del código: `Modality` tiene 8 y `AssetKind` 7, y solo comparten `text`, `image` y `video`'),
    modalidades.size === 8 && clases.size === 7 && canon(soloModalidad) === canon(['3d', 'doc', 'music', 'vision', 'voice'])
    && canon(soloClase) === canon(['audio', 'document', 'model3d', 'world']), `solo Modality: ${soloModalidad.join(',')} · solo AssetKind: ${soloClase.join(',')}`);
}
{
  const ids = idsDelCatalogo();
  const desajustadas = ids.filter((id) => modalidadQueProduce(id) !== tipoDeMaterialDe(id));
  const iguales = ids.filter((id) => modalidadQueProduce(id) === tipoDeMaterialDe(id));
  const falsoFail = (id) => verificar({ expected: [{ kind: modalidadQueProduce(id) }], actual: res('r', { outputs: [sal(tipoDeMaterialDe(id), 'asset:x')] }) }).status;
  check(FIJADO('el catálogo declara la MODALIDAD que cada capacidad produce y el Content Core la CLASE de material (`tipoDeMaterialDe`): son distintas en 12 de ellas (audio, documento, mundo) y todas tienen clase'),
    ids.length >= 69 && ids.every((id) => typeof tipoDeMaterialDe(id) === 'string') && desajustadas.length === 12 && iguales.length === ids.length - 12,
    `${ids.length} capacidades · ${desajustadas.length} con modalidad ≠ clase`);
  check(SEAM('CONTROL: construir lo esperado con la modalidad del catálogo y la salida con su clase da un FALSO `fail` en cada una de las que difieren, y `pass` en las que no: la costura no puede mezclar los dos vocabularios'),
    desajustadas.every((id) => falsoFail(id) === 'fail') && iguales.every((id) => falsoFail(id) === 'pass'), desajustadas.join(' '));
}
{
  const hechoA = (cap, estado = 'completed') => ({
    jobId: `j-${cap}`, revision: 3, state: estado, capability: cap, attemptCount: 1,
    policy: { retry: { maxAttempts: 3 } }, result: { outputRefs: [`asset:${cap}:1`] },
    attempts: [{ attemptId: `j-${cap}:1`, number: 1, dispatched: true, outcome: 'succeeded' }],
  });
  const mal = idsDelCatalogo().filter((id) => {
    const t = traducir(hechoA(id), { esperarLoDeLaCapacidad: true });
    return t.omitido || t.peticion.expected[0].kind !== tipoDeMaterialDe(id) || t.peticion.actual.outputs[0].kind !== tipoDeMaterialDe(id)
      || verificar(t.peticion).status !== 'pass';
  });
  check(SEAM('con UNA sola fuente (`tipoDeMaterialDe`) para lo esperado y lo que sale, NINGUNA capacidad del catálogo falla por vocabulario: `pass` en todas'), mal.length === 0, mal.join(',') || `${idsDelCatalogo().length} capacidades`);
  const sinKind = traducir(hechoA(CAPACIDAD_INVENTADA), { esperarLoDeLaCapacidad: true });
  const conKind = traducir(hechoA(CAPACIDAD_INVENTADA), { expected: [{ kind: KIND_INVENTADO }], kindDeSalida: KIND_INVENTADO });
  check(SEAM('una capacidad que NO está en el catálogo no tiene clase que derivar: sin que se diga, se omite (`sin_expectativas`); diciéndola, A6 la verifica igual que a las demás —no conoce ninguna capacidad—'),
    tipoDeMaterialDe(CAPACIDAD_INVENTADA) === undefined && sinKind.omitido === 'sin_expectativas' && verificar(conKind.peticion).status === 'pass');
}

/* ── F4 · DESENLACE DESCONOCIDO ──────────────────────────────────────────── */

console.log('\n─── F4. Desenlace desconocido: lo que no es succeeded, cancelled ni rejected no se interpreta ───');

const ESTADOS_AJENOS = ['completed', 'failed', 'timed_out', 'waiting', 'running', 'queued', 'cancel_requested', 'unknown', 'accepted', 'done', 'COMPLETED', 'Succeeded'];
{
  const detalle = [];
  const todos = ESTADOS_AJENOS.every((s) => {
    const { v, r } = analizar({ expected: IMG, actual: res('r', { status: s, outputs: imgs(1) }) });
    const ok = v.status === 'unknown' && v.passed === false && lista(r) === 'verify_again,abort' && r.failureClass === 'unknown';
    if (!ok) detalle.push(`${s}:${v.status}/${lista(r)}`);
    return ok;
  });
  check(B('G3', `los ${ESTADOS_AJENOS.length} estados que A6 no conoce —los siete del Job Engine (\`completed\`, \`failed\`, \`timed_out\`, \`waiting\`, \`running\`, \`queued\`, \`cancel_requested\`), otros tres (\`unknown\`, \`accepted\`, \`done\`) y hasta \`COMPLETED\` o \`Succeeded\` por una mayúscula— dan \`unknown\` y NO aprueban —eso es honesto—, pero la recuperación propone \`verify_again\` Y \`abort\`: el informe C §3.4 decía «solo \`verify_again\`», y medido hay un \`abort\` («con reembolso») detrás. \`decidirLiquidacion\` nunca devuelve el dinero de un desenlace desconocido: se reconcilia`),
    todos, detalle.join(' · ') || 'verify_again,abort en todos');
  const sinEstado = analizar({ expected: IMG, actual: { id: 'r', outputs: imgs(1) } });
  const numerico = analizar({ expected: IMG, actual: { id: 'r', status: 5, outputs: imgs(1) } });
  check(FIJADO('sin `status`, o con uno que no es texto, tampoco se adivina: `unknown`'),
    sinEstado.v.status === 'unknown' && numerico.v.status === 'unknown' && sinEstado.v.passed === false);
  check(FIJADO('CONTROL: `succeeded` aprueba, y `cancelled` y `rejected` suspenden —son los únicos tres que A6 interpreta—'),
    verificar({ expected: IMG, actual: res('r', { outputs: imgs(1) }) }).status === 'pass'
    && ['cancelled', 'rejected'].every((s) => verificar({ expected: IMG, actual: res('r', { status: s, outputs: imgs(1) }) }).status === 'fail'));
}
{
  const conSalida = analizar({ expected: IMG, actual: res('r', { status: 'failed', outputs: imgs(1) }) });
  const sinSalida = analizar({ expected: IMG, actual: res('r', { status: 'failed' }) });
  check(B('G2', '`status: failed` SIN `error` no tiene una respuesta: con la salida presente es `unknown` (verificar otra vez) y sin ella es `fail` por la salida que falta (y se replanifica). La costura tiene que dar siempre un código: el conductor (`recoger`) pone TIMEOUT al plazo vencido e INTERNAL_ERROR a lo demás, y el traductor de referencia hace lo mismo'),
    conSalida.v.status === 'unknown' && lista(conSalida.r) === 'verify_again,abort' && sinSalida.v.status === 'fail' && lista(sinSalida.r) === 'replan,abort',
    `con salida: ${conSalida.v.status} ${lista(conSalida.r)} · sin salida: ${sinSalida.v.status} ${lista(sinSalida.r)}`);
}
{
  const espera = TRABAJOS.esperando_aceptada;
  const perdido = TRABAJOS.plazo_sin_saber;
  const dEspera = decidirLiquidacion(espera, AHORA);
  const dPerdido = decidirLiquidacion(perdido, AHORA);
  const mismo = (dispatched, hasProviderRef) => canon(analizar({ expected: IMG, actual: res('r', { status: 'waiting', outputs: imgs(1), metadata: { dispatched, hasProviderRef } }) }));
  check(FIJADO('(R6 §3.4) el runtime distingue «el proveedor la aceptó y sigue» (`esperar`) de «salió y no volvió nadie» (`reconciliar`) por `dispatched` y `providerRef`; A6 NO los ve, y con el mismo `status` contesta lo mismo —se haga lo que se haga con esos dos datos en la metadata—'),
    dEspera.tipo === 'esperar' && dEspera.motivo === 'aceptada_por_el_proveedor' && dPerdido.tipo === 'reconciliar' && dPerdido.motivo === 'desenlace_desconocido'
    && mismo(true, true) === mismo(true, false) && mismo(true, true) === mismo(false, false),
    `${dEspera.tipo}/${dEspera.motivo} · ${dPerdido.tipo}/${dPerdido.motivo}`);
  check(SEAM('el traductor no le pregunta a A6 por ninguno de los dos: un trabajo que espera es `no_terminal`, y uno cuyo último intento salió sin saberse cómo acabó es `desenlace_desconocido` (se reconcilia, no se verifica)'),
    traducir(espera, { esperarLoDeLaCapacidad: true }).omitido === 'no_terminal'
    && traducir(perdido, { esperarLoDeLaCapacidad: true }).omitido === 'desenlace_desconocido');
}

/* ── F5 · CONCESIÓN CADUCADA O ZOMBI ─────────────────────────────────────── */

console.log('\n─── F5. Concesión caducada o zombi: un veredicto tiene que atarse a la revisión y al intento ───');

{
  const req = { expected: IMG, actual: res('r', { outputs: imgs(1) }) };
  const base = analizar(req);
  const ATADURAS = ['jobId', 'jobRevision', 'revision', 'attemptId', 'runId'];
  check(FIJADO('(R6 §3.5) ni el veredicto ni el análisis de recuperación llevan revisión, intento ni identidad de trabajo: A6 no puede atar lo que dice a QUÉ estado del trabajo lo dijo'),
    !ATADURAS.some((k) => k in base.v) && !ATADURAS.some((k) => k in base.r));
  check(FIJADO('y no puede distinguir al zombi del vigente: el mismo resultado con la revisión y el intento de ayer o de hoy da EXACTAMENTE lo mismo, y unos campos de más en la petición se ignoran'),
    canon(analizar({ ...req, actual: { ...req.actual, metadata: { jobRevision: 3, attemptId: 'j:1' } } }))
    === canon(analizar({ ...req, actual: { ...req.actual, metadata: { jobRevision: 9, attemptId: 'j:2' } } }))
    && canon(analizar({ ...req, jobRevision: 9, attemptId: 'j:2' })) === canon(base));
}
{
  const job = TRABAJOS.proveedor_agotado;
  const t = traducir(job, { esperarLoDeLaCapacidad: true });
  const ultimo = job.attempts[job.attempts.length - 1];
  check(SEAM('la costura SÍ ata el veredicto: `{ jobId, jobRevision, attemptId }` y un `runId` determinista `jobId:verificacion:attemptId`'),
    t.atadoA.jobId === job.jobId && t.atadoA.jobRevision === job.revision && t.atadoA.attemptId === ultimo.attemptId
    && t.runId === `${job.jobId}:verificacion:${ultimo.attemptId}` && traducir(job, { esperarLoDeLaCapacidad: true }).runId === t.runId);
  const otroIntento = { ...job, attempts: [...job.attempts, { ...ultimo, number: 4, attemptId: `${job.jobId}:otro` }] };
  check(SEAM('y rechaza al zombi: un veredicto es vigente solo con la MISMA revisión y el MISMO último intento; si la revisión avanzó, si hay otro intento o si es de otro trabajo, ya no vale'),
    vigente(t.atadoA, job) === true && vigente(t.atadoA, { ...job, revision: job.revision + 1 }) === false
    && vigente(t.atadoA, otroIntento) === false && vigente(t.atadoA, TRABAJOS.texto_ok) === false && vigente(undefined, job) === false);
}
{
  const zombi = TRABAJOS.zombi;
  const atado = traducir(zombi, { forzar: true, esperarLoDeLaCapacidad: true }).atadoA;
  const despues = evaluar(zombi, T0 + 120_000);
  const nuevo = despues.transition?.job;
  check(SEAM('con el Job Engine de verdad: un intento cuya concesión caducó vuelve a la cola con OTRA revisión (`lease_expired`), así que el veredicto atado a la anterior deja de ser vigente. Es la comprobación de revisión (CAS) del Job Engine aplicada a A6'),
    zombi.state === 'running' && despues.status === 'transition' && despues.transition.reason === 'lease_expired' && nuevo.state === 'queued'
    && nuevo.revision > zombi.revision && vigente(atado, zombi) === true && vigente(atado, nuevo) === false,
    `revisión ${zombi.revision} → ${nuevo?.revision}`);
  check(SEAM('y al zombi no se le pregunta nada: un trabajo `running` —con la concesión viva o caducada— es `no_terminal`, como `queued`, `waiting` y `cancel_requested`'),
    ['zombi', 'primera_invocacion', 'en_cola', 'esperando_aceptada', 'cancel_pedido', 'bloqueo_reintentado'].every((k) => traducir(TRABAJOS[k], { esperarLoDeLaCapacidad: true }).omitido === 'no_terminal'));
}

/* ── F6 · DUPLICADO ──────────────────────────────────────────────────────── */

console.log('\n─── F6. Duplicado: DUPLICATE_REQUEST no se reintenta, pero A6 propone abortar «con reembolso» ───');

{
  const contextos = [{}, { hasFallback: true }, { alternatives: ['z', 'a'] }, { hasFallback: true, alternatives: ['z', 'a'] }];
  check(FIJADO('`DUPLICATE_REQUEST` es de clase `transient` y NO se reintenta —ni A6, ni el Job Engine, ni la tabla del Core—, en ningún contexto'),
    A.claseDeFallo({ code: 'DUPLICATE_REQUEST' }) === 'transient' && A.sePuedeReintentar('transient', 'DUPLICATE_REQUEST') === false
    && CORE.esReintentable('DUPLICATE_REQUEST') === false && CORE.sePuedeReintentarConOtro('DUPLICATE_REQUEST') === false
    && contextos.every((c) => !kinds(analizar(conFallo('DUPLICATE_REQUEST'), con('DUPLICATE_REQUEST', c)).r).includes('retry')));
  const esperadas = ['abort', 'fallback,abort', 'alternative_strategy,abort', 'alternative_strategy,fallback,abort'];
  const obtenidas = contextos.map((c) => lista(analizar(conFallo('DUPLICATE_REQUEST'), con('DUPLICATE_REQUEST', c)).r));
  check(B('G3', '(R6 §3.6) tras un duplicado A6 propone SIEMPRE `abort` —«con reembolso», según su propio contrato— y, si el contexto declara un respaldo o una alternativa, también `fallback` y `alternative_strategy`. Un duplicado no tiene qué reembolsar ni qué regenerar: la respuesta es de otra invocación'),
    canon(obtenidas) === canon(esperadas), obtenidas.join(' | '));
}
{
  const primera = TRABAJOS.primera_invocacion;
  const dup = TRABAJOS.duplicado;
  const entregada = TRABAJOS.primera_entregada;
  const tardio = TRABAJOS.duplicado_tardio;
  const lp = decidirLiquidacion(primera, AHORA);
  const ld = decidirLiquidacion(dup, AHORA);
  const forzado = traducir(dup, { forzar: true, esperarLoDeLaCapacidad: true });
  const { r } = analizar(forzado.peticion, forzado.contexto);
  check(B('G3', '(el hallazgo de RUNTIME §13.4, ahora MEDIDO) el duplicado y la invocación que de verdad trabaja COMPARTEN la reserva de Credits. Visto SOLO el duplicado, `decidirLiquidacion` dice `reembolsar` —no salió nada—, y A6 dice `abort`: aplicarlo devuelve la reserva de quien sigue ejecutando y regala la respuesta. Por eso el duplicado no puede llegar a A6'),
    reservaDe(primera).transactionId === reservaDe(dup).transactionId && lp.tipo === 'esperar' && lp.motivo === 'en_marcha'
    && ld.tipo === 'reembolsar' && lista(r) === 'abort', `primera: ${lp.tipo}/${lp.motivo} · duplicado solo: ${ld.tipo}/${ld.motivo} · A6: ${lista(r)}`);
  const le = decidirLiquidacion(entregada, AHORA);
  const lt = decidirLiquidacion(tardio, AHORA);
  check(B('G3', 'y lo mismo cuando la primera YA ENTREGÓ: la persona tiene su respuesta (`liquidar`) y el duplicado tardío, solo, diría `reembolsar`. «Abort con reembolso» sobre él sería regalar lo entregado'),
    reservaDe(entregada).transactionId === reservaDe(tardio).transactionId && le.tipo === 'liquidar' && lt.tipo === 'reembolsar'
    && lista(analizar(traducir(tardio, { forzar: true, esperarLoDeLaCapacidad: true }).peticion, traducir(tardio, { forzar: true, esperarLoDeLaCapacidad: true }).contexto).r) === 'abort',
    `${le.tipo} · ${lt.tipo}`);
  check(SEAM('la costura cierra el paso: los dos duplicados se OMITEN (`duplicado`) y no sale ninguna petición ni contexto que ejecutar'),
    [dup, tardio].every((j) => { const t = traducir(j, { esperarLoDeLaCapacidad: true }); return t.omitido === 'duplicado' && t.peticion === undefined && t.contexto === undefined; }));
  check(SEAM('y la puerta de ejecución, si alguien llamara a A6 saltándose la omisión, no deja pasar NADA tras un duplicado: ni `abort` ni `fallback` ni `alternative_strategy`, con respaldo y alternativas declarados'),
    [[dup, lp], [tardio, le]].every(([j, liq]) => {
      const t = traducir(j, { forzar: true, esperarLoDeLaCapacidad: true, hasFallback: true, alternatives: ['a', 'b'] });
      const analisis = rec.analizar(a6.verificar(t.peticion), t.contexto);
      const g = puertaDeEjecucion(analisis, t.hechos, liq);
      return kinds(analisis).length >= 3 && g.permitidas.length === 0 && g.bloqueadas.length === kinds(analisis).length;
    }));
}
{
  const observacion = {
    kind: 'success', at: T1, actual: res('e3', { outputs: [sal('text', 'ref://3')] }),
    signals: [{ key: 'result.latencyMs', subject: 'e3', value: 1000, source: 'measured', at: T1 }],
  };
  const c1 = ciclo.cerrar(R, observacion, { ahora: T1 });
  const c2 = ciclo.cerrar(R, observacion, { ahora: T1, previo: c1.learning.aggregates });
  check(B('G3', '(R6 §3.6 · deuda A7 nº 3, ALGORITHM-ENGINE §13) `cerrar` NO es idempotente: cerrar dos veces la MISMA observación (mismo `id` de resultado) la cuenta dos veces —`n` pasa de 1 a 2 en cada agregado—. A7 asume que quien llama garantiza «exactamente una vez», y el mecanismo (clave de idempotencia, identidad del evento, ingestión transaccional) no está decidido'),
    R.status === 'decided' && c1.status === 'closed' && c1.learning.aggregates.length >= 3
    && c1.learning.aggregates.every((g) => g.n === 1) && c2.learning.aggregates.every((g) => g.n === 2),
    `n: ${c1.learning.aggregates.map((g) => g.n).join(',')} → ${c2.learning.aggregates.map((g) => g.n).join(',')}`);
  const registro = new RegistroDeReferencia();
  const t = traducir(TRABAJOS.texto_ok, { esperarLoDeLaCapacidad: true });
  let previo;
  let veces = 0;
  for (let i = 0; i < 3; i++) {
    if (registro.registrar(t.runId) !== 'nuevo') continue;
    previo = ciclo.cerrar(R, observacion, { ahora: T1, ...(previo ? { previo } : {}) }).learning.aggregates;
    veces++;
  }
  check(SEAM('con la identidad de la costura (`runId`) delante, un registro tipo `create()` convierte el segundo y el tercer intento en `duplicado`: `cerrar` corre UNA vez y A7 cuenta una'),
    veces === 1 && previo.every((g) => g.n === 1) && registro.registrar(t.runId) === 'duplicado');
  check(FIJADO('CONTROL: `cerrar` sí es DETERMINISTA —lo mismo con lo mismo—; lo que no es idempotente es lo que se acumula en A7 al repetir la entrega'),
    canon(ciclo.cerrar(R, observacion, { ahora: T1 })) === canon(c1));
}

/* ── F7 · COSTE GASTADO ──────────────────────────────────────────────────── */

console.log('\n─── F7. Coste gastado: el presupuesto de A6 es de pensar, no de dinero ───');

{
  const claves = Object.keys(A.TOPES_POR_DEFECTO);
  check(FIJADO('(R6 §3.7) los nueve topes de `AlgorithmBudgetLimits` son COMPUTACIONALES —evidencia, profundidad, candidatas, iteraciones, llamadas, comprobaciones, evaluadores, replanes, latencia de pensar—: ninguno es dinero ni Credits'),
    claves.length === 9 && !claves.some((k) => /usd|credit|cost|eur|dollar|money|price|spent/i.test(k)) && canon(Object.keys(A.RANGO_DEL_PRESUPUESTO).sort()) === canon([...claves].sort()),
    claves.join(','));
  const cap = analizar(conFallo('CAPABILITY_UNAVAILABLE'), con('CAPABILITY_UNAVAILABLE', { budget: { maxCandidates: 1 } }));
  const sin = analizar(conFallo('CAPABILITY_UNAVAILABLE'), con('CAPABILITY_UNAVAILABLE'));
  check(FIJADO('lo que `ContextoDeRecuperacion.budget` acota es CUÁNTOS CANDIDATOS se miran, en orden fijo: con `maxCandidates: 1` no se llega ni a `replan` ni a `abort` y se dice `budget_exhausted`. Es un tope de cómputo que puede dejar SIN propuesta, no un presupuesto que cuide el dinero'),
    lista(sin.r) === 'replan,abort' && cap.r.proposals.length === 0 && cap.r.stoppedBecause === 'budget_exhausted' && cap.r.metricas.budgetExhausted === true,
    `${lista(sin.r)} → ${lista(cap.r)} (${cap.r.stoppedBecause})`);
  const dinero = [0, 3.5, 99_999].map((usd) => canon(analizar(conFallo('PROVIDER_ERROR'), con('PROVIDER_ERROR', { metadata: { costUsd: usd, spentUsd: usd, creditsSpent: usd * 10 } }))));
  check(FIJADO('lo ya gastado no es una entrada de la recuperación: con 0, con 3,5 y con 99 999 dólares en la metadata el análisis es EXACTAMENTE el mismo'),
    dinero[0] === dinero[1] && dinero[1] === dinero[2]);
}
{
  const matriz = [
    ['PROVIDER_ERROR', {}], ['CONTENT_POLICY', {}], ['DUPLICATE_REQUEST', { hasFallback: true }], ['INSUFFICIENT_CREDITS', {}],
    ['CAPABILITY_UNAVAILABLE', { alternatives: ['a'] }], ['TIMEOUT', { hasFallback: true, alternatives: ['a', 'b'] }], ['INTERNAL_ERROR', {}],
  ];
  const propuestas = matriz.flatMap(([c, ctx]) => analizar(conFallo(c), con(c, ctx)).r.proposals);
  const parcial = analizar(ESCENARIOS_PARCIAL[0][1]).r.proposals;
  const calidad = rec.analizar(A.crearMotorDeVerificacion({ evaluadores: [{ id: 'e', supports: () => true, evaluate: () => ({ status: 'fail', value: 0.2 }) }] })
    .verificar({ expected: [{ kind: 'image', quality: { minScore: 0.9 } }], actual: res('r', { outputs: imgs(1) }) })).proposals;
  const todas = [...propuestas, ...parcial, ...calidad];
  check(FIJADO('`expectedEffect` NUNCA se rellena (no hay evidencia detrás, y A6 no la inventa): ninguna de las propuestas de siete fallos distintos, un parcial y una calidad que no llega lo lleva, ni hay coste esperado en ellas'),
    todas.length >= 15 && todas.every((p) => p.expectedEffect === undefined && p.costUsd === undefined && p.credits === undefined), `${todas.length} propuestas`);
  check(FIJADO('(R6 §3.7) el dato del coste de un fallo vive en OTRO sitio: el libro de generaciones lo marca `providerCostStatus: desconocido` cuando un fallo pudo costar y no se midió (ancla leída); A6 no lo ve'),
    /providerCostStatus\?: 'desconocido' \| 'estimado'/.test(leer('functions/src/engine/ledger.ts')) && !/providerCost|costeTrasUnFallo/.test(sinComentarios(leer('functions/src/core/algorithm/recovery-engine.ts'))));
}

/* ── F8 · SEGURIDAD ──────────────────────────────────────────────────────── */

console.log('\n─── F8. Seguridad: un bloqueo de Gemini sale PROVIDER_ERROR, y se reintentaría ───');

{
  const todos = Object.keys(A.CLASE_DE_CODIGO).sort();
  const desacuerdos = todos.filter((c) => A.sePuedeReintentar(A.CLASE_DE_CODIGO[c], c) !== CORE.esReintentable(c)
    || kinds(analizar(conFallo(c), con(c)).r).includes('retry') !== CORE.esReintentable(c));
  check(FIJADO('A6 y el Job Engine deciden el reintento POR CÓDIGO y coinciden en los 15 códigos del Core: se reintenta solo PROVIDER_UNAVAILABLE, MODEL_UNAVAILABLE, PROVIDER_ERROR, TIMEOUT y RATE_LIMIT; nunca CONTENT_POLICY, DUPLICATE_REQUEST, INVALID_REQUEST, AUTH_ERROR, créditos ni presupuesto'),
    todos.length === 15 && desacuerdos.length === 0 && todos.filter((c) => CORE.esReintentable(c)).length === 5, desacuerdos.join(',') || 'sin desacuerdos');
  const politica = analizar(conFallo('CONTENT_POLICY'), con('CONTENT_POLICY', { hasFallback: true, alternatives: ['a'] })).r;
  check(FIJADO('una política de contenido es de la PETICIÓN (`invalid_input`): no se reintenta y no se le busca respaldo ni alternativa, solo cabe parar'),
    politica.failureClass === 'invalid_input' && lista(politica) === 'abort');
}
{
  const bloqueo = analizar(conFallo('PROVIDER_ERROR'), con('PROVIDER_ERROR', { metadata: { providerRetryable: false } })).r;
  const normal = analizar(conFallo('PROVIDER_ERROR'), con('PROVIDER_ERROR', { metadata: { providerRetryable: true } })).r;
  check(B('G3', '(R6 §3.8) el bloqueo de seguridad de Gemini llega como PROVIDER_ERROR con `providerRetryable: false`, y A6 NO lee ese dato: con él propone `retry` igual que sin él. Un bloqueo de seguridad repetido tal cual vuelve a ser un bloqueo —y vuelve a costar—. Arreglarlo exige leer `providerRetryable` (opcional en `ContextoDeRecuperacion`) y subir `motor-de-recuperacion@2`'),
    lista(bloqueo) === 'retry,abort' && lista(bloqueo) === lista(normal) && bloqueo.failureClass === 'provider_failure');
  const j = TRABAJOS.bloqueo_reintentado;
  check(B('G1', '(más arriba que A6) el Job Engine tampoco lo lee: con el mismo bloqueo y los intentos de siempre REINTENTA —el trabajo vuelve a `queued` con el reintento programado—. El dato está en el error del trabajo (`details.providerRetryable: false`) y el motor decide por código (`esReintentable`). Se arregla en el adaptador o en el motor de trabajos, no en A6'),
    j.state === 'queued' && j.attemptCount === 1 && j.attempts[0].outcome === 'failed' && j.attempts[0].error.details.providerRetryable === false && j.availableAt >= j.updatedAt);
  check(FIJADO('no existe una clase de fallo de SEGURIDAD: las clases a las que A6 lleva los 15 códigos son estas, y ninguna es «bloqueo»'),
    !Object.values(A.CLASE_DE_CODIGO).some((c) => /safety|seguridad|block|bloqueo|moderation/i.test(c)),
    [...new Set(Object.values(A.CLASE_DE_CODIGO))].sort().join(','));
}
{
  const libre = (job, maxAttempts = 3) => ({ ...job, policy: { ...job.policy, retry: { ...job.policy.retry, maxAttempts } } });
  const conBloqueo = libre(TRABAJOS.bloqueo_de_seguridad);
  const t = traducir(conBloqueo, { esperarLoDeLaCapacidad: true });
  const { r } = analizar(t.peticion, t.contexto);
  const g = puertaDeEjecucion(r, t.hechos, decidirLiquidacion(conBloqueo, AHORA));
  check(SEAM('de punta a punta con un trabajo que falló con un bloqueo y le quedaban intentos: la costura le pasa a A6 `providerRetryable: false`, A6 propone `retry` igualmente (arriba), y la PUERTA lo bloquea con su motivo mientras deja pasar `abort`'),
    t.hechos.providerRetryable === false && t.contexto.retry.maxAttempts === 2 && !t.contexto.previous
    && kinds(r).includes('retry') && g.bloqueadas.some((b) => b.kind === 'retry' && /providerRetryable/.test(b.porque)) && !g.permitidas.some((p) => p.kind === 'retry'),
    `${lista(r)} · bloqueadas: ${g.bloqueadas.map((b) => b.kind).join(',')}`);
  const normal = libre(TRABAJOS.proveedor_una_vez);
  const tn = traducir(normal, { esperarLoDeLaCapacidad: true });
  const tm = traducir(libre(TRABAJOS.timeout_conocido), { esperarLoDeLaCapacidad: true });
  const gn = (tt, job) => puertaDeEjecucion(rec.analizar(a6.verificar(tt.peticion), tt.contexto), tt.hechos, decidirLiquidacion(job, AHORA));
  check(SEAM('CONTROL: sin el bloqueo la puerta NO estorba: un PROVIDER_ERROR reintentable y un TIMEOUT conocido, con intentos libres, dejan pasar `retry` (lo ejecuta el Job Engine con sus cuatro condiciones)'),
    tn.hechos.providerRetryable === true && gn(tn, normal).permitidas.some((p) => p.kind === 'retry' && p.ejecutor === 'Job Engine')
    && gn(tm, libre(TRABAJOS.timeout_conocido)).permitidas.some((p) => p.kind === 'retry'));
}

/* ── F9 · EFECTOS VISIBLES: `cancelled` ─────────────────────────────────── */

console.log('\n─── F9. Efectos visibles: una cancelación se trata como un fallo y se propone replanificar ───');

{
  const cancelada = (extra = {}, ctx = {}) => analizar({ expected: IMG, actual: res('r', { status: 'cancelled', ...extra }) }, ctx);
  const a = cancelada();
  const b = cancelada({}, { hasFallback: true });
  const c = cancelada({ outputs: imgs(1) });
  const d = cancelada({ outputs: imgs(1) }, { hasFallback: true, alternatives: ['b'] });
  check(B('G2', '(R6 §3.9) `cancelled` es un `fail` DURO de A6 —«se canceló»— y entra en la recuperación como cualquier fallo: sin la salida que se esperaba propone REPLANIFICAR (y `fallback` si hay respaldo); con la salida ya hecha propone solo parar, o `alternative_strategy` y `fallback` si se declaran. Tras una cancelación explícita eso es empezar de nuevo lo que la persona mandó parar (efectos visibles y gasto nuevo)'),
    [a, b, c, d].every((x) => x.v.status === 'fail' && x.v.passed === false)
    && lista(a.r) === 'replan,abort' && lista(b.r) === 'fallback,replan,abort' && lista(c.r) === 'abort' && lista(d.r) === 'alternative_strategy,fallback,abort',
    [a, b, c, d].map((x) => lista(x.r)).join(' | '));
  const rechazo = analizar({ expected: IMG, actual: res('r', { status: 'rejected' }) });
  check(FIJADO('`rejected` recibe el mismo trato que `cancelled` —`fail` duro y replan—: A6 solo conoce tres estados de cierre y no distingue quién paró'),
    rechazo.v.status === 'fail' && lista(rechazo.r) === 'replan,abort');
}
{
  const enMarcha = TRABAJOS.cancelado_en_marcha;
  const enCola = TRABAJOS.cancelado_en_cola;
  check(FIJADO('el Job Engine, en cambio, NO reintenta lo que alguien mandó parar: el fallo que llega DESPUÉS de pedir la cancelación consuma la parada (`cancelled`), con un solo intento y sin reintento programado; y una cancelación en cola no llega a abrir ninguno'),
    TRABAJOS.cancel_pedido.state === 'cancel_requested' && enMarcha.state === 'cancelled' && enMarcha.attemptCount === 1 && enMarcha.attempts[0].outcome === 'failed'
    && enCola.state === 'cancelled' && enCola.attemptCount === 0);
  check(SEAM('la costura lo respeta: un trabajo `cancelled` se OMITE (`cancelado`) sea cual sea su error guardado, y `cancel_requested` —aún en el aire— es `no_terminal`. Pero si el bueno llegó antes que la parada (`completed` con `cancelRequestedAt`), gana el final y SÍ se verifica'),
    [enMarcha, enCola].every((j) => traducir(j, { esperarLoDeLaCapacidad: true }).omitido === 'cancelado')
    && traducir(TRABAJOS.cancel_pedido, { esperarLoDeLaCapacidad: true }).omitido === 'no_terminal'
    && verificar(traducir({ ...TRABAJOS.texto_ok, cancelRequestedAt: T0 + 5 }, { esperarLoDeLaCapacidad: true }).peticion).status === 'pass');
  const t = traducir(enMarcha, { forzar: true, esperarLoDeLaCapacidad: true, hasFallback: true, alternatives: ['b'] });
  const analisis = rec.analizar(a6.verificar(t.peticion), t.contexto);
  const g = puertaDeEjecucion(analisis, t.hechos, decidirLiquidacion(enMarcha, AHORA));
  check(SEAM('y la puerta no deja replanificar una cancelación aunque alguien se salte la omisión: A6 propone `replan`, `fallback` y `alternative_strategy` y la puerta no permite NINGUNA'),
    kinds(analisis).includes('replan') && kinds(analisis).includes('fallback') && g.permitidas.length === 0 && g.bloqueadas.length === kinds(analisis).length
    && g.bloqueadas.every((b) => /cancelado/.test(b.porque)), lista(analisis));
}

{
  const enMarcha = TRABAJOS.cancelado_en_marcha;
  const enCola = TRABAJOS.cancelado_en_cola;
  const t = traducir(enMarcha, { forzar: true, esperarLoDeLaCapacidad: true });
  check(FIJADO('(hallazgo) el Job Engine guarda una cancelación como un ERROR `INVALID_REQUEST` con motivo `cancelled_by_request`: para A6 eso es una petición mal hecha (`invalid_input`, solo cabe parar), y no lo es. Un traductor que copiara `job.error.code` clasificaría mal —y por casualidad no replanificaría—; el de referencia usa el código solo de lo que FALLÓ'),
    enMarcha.error.code === 'INVALID_REQUEST' && enMarcha.error.details.reason === 'cancelled_by_request' && enCola.error.details.reason === 'cancelled_by_request'
    && A.claseDeFallo({ code: 'INVALID_REQUEST' }) === 'invalid_input' && t.contexto.metadata.errorCode === undefined && t.peticion.actual.error === undefined);
}

/* ── F10 · LA COSTURA ROTA DE `cerrar` ───────────────────────────────────── */

console.log('\n─── F10. La costura de `cerrar`: solo pasa `alternatives` y `hasFallback` ───');

{
  const timeout = ciclo.cerrar(R, observar('failure', res('e1', { status: 'failed', error: { code: 'TIMEOUT' } })), { ahora: T1 });
  const sinError = ciclo.cerrar(R, observar('failure', res('e2', { status: 'failed' })), { ahora: T1 });
  const lo = loQueCerrarPasa(R);
  const conCodigo = rec.analizar(timeout.verification, { ...lo, metadata: { errorCode: 'TIMEOUT' } });
  check(FIJADO('(R6 §3.10) `cerrar` le pasa a la recuperación SOLO `alternatives` y `hasFallback`: el análisis que devuelve es, byte a byte, el de `analizar(veredicto, { alternatives, hasFallback })`'),
    timeout.status === 'closed' && canon(timeout.recovery) === canon(rec.analizar(timeout.verification, lo)) && canon(sinError.recovery) === canon(rec.analizar(sinError.verification, lo)));
  check(B('G3', '(R6 §3.10) un TIMEOUT cerrado por el ciclo NO llega como TIMEOUT: sin `metadata.errorCode` la tabla `CLASE_DE_CODIGO` no se usa nunca, y la clase sale de la estructura —aquí `unmet_requirement`: falta la salida—, así que se propone REPLANIFICAR y jamás `timeout → retry`. Con el código la misma recuperación sería `timeout` y propondría `retry`'),
    timeout.verification.status === 'fail' && timeout.recovery.failureClass === 'unmet_requirement' && lista(timeout.recovery) === 'alternative_strategy,replan,abort'
    && conCodigo.failureClass === 'timeout' && kinds(conCodigo)[0] === 'retry' && !kinds(timeout.recovery).includes('retry'),
    `${lista(timeout.recovery)} ≠ ${lista(conCodigo)}`);
  check(FIJADO('y el ciclo no distingue un TIMEOUT de un `failed` que nadie explicó: los dos cierran con la MISMA clase y las MISMAS propuestas (el código se perdió por el camino)'),
    sinError.recovery.failureClass === timeout.recovery.failureClass && lista(sinError.recovery) === lista(timeout.recovery));
  check(FIJADO('(R6 §3.10) el código de la costura no existe en el ciclo: ni `errorCode`, ni `previous`, ni `maxAttempts` aparecen en `integration-cycle.ts`, y lo que una observación traiga de más (`metadata.errorCode`, `previous`, `retry`) se IGNORA'),
    !/errorCode|previous|maxAttempts/.test(sinComentarios(leer('functions/src/core/algorithm/integration-cycle.ts')))
    && canon(ciclo.cerrar(R, { ...observar('failure', res('e1', { status: 'failed', error: { code: 'TIMEOUT' } })), previous: [{ kind: 'retry', failureClass: 'timeout' }], metadata: { errorCode: 'TIMEOUT' }, retry: { maxAttempts: 0 } }, { ahora: T1 }).recovery)
      === canon(timeout.recovery));
  const conSalida = ciclo.cerrar(R, observar('failure', res('e5', { status: 'failed', outputs: [sal('text', 'ref://5')] })), { ahora: T1 });
  check(B('G2', '(R6 §3.10) `status: failed` sin `error` y CON la salida ya hecha cierra `unknown` en A6 mientras la ejecución es un `failure` en A7: la observación dice una cosa y el veredicto otra, y las pruebas del ciclo no lo ven porque su «failure» falla por la salida que falta, no por el estado'),
    conSalida.status === 'closed' && conSalida.outcome.kind === 'failure' && conSalida.verification.status === 'unknown' && conSalida.outcome.verification.status === 'unknown',
    `${conSalida.outcome.kind} · ${conSalida.verification.status}`);
  const rondas = Array.from({ length: 5 }, () => canon(ciclo.cerrar(R, observar('failure', res('e1', { status: 'failed', error: { code: 'TIMEOUT' } })), { ahora: T1 }).recovery));
  check(FIJADO('sin `previous` no hay bucle que cortar ni historia que cuente: cinco cierres iguales dan cinco recuperaciones IGUALES, y la misma propuesta de replanificar cada vez'),
    rondas.every((x) => x === rondas[0]) && rondas[0].includes('"kind":"replan"'));
}
{
  const v = a6.verificar(conFallo('TIMEOUT'));
  const historia = (n, clase = 'timeout') => Array.from({ length: n }, () => ({ kind: 'retry', failureClass: clase }));
  const sin = rec.analizar(v, con('TIMEOUT'));
  const una = rec.analizar(v, con('TIMEOUT', { previous: historia(1) }));
  const todas = rec.analizar(v, con('TIMEOUT', { previous: A.RECUPERACIONES.map((k) => ({ kind: k, failureClass: 'timeout' })) }));
  check(FIJADO('con historia el bucle se corta: sin `previous` se propone `retry`; con un `retry` ya hecho contra el mismo fallo se descarta («ya se intentó»); y con TODAS las recuperaciones ya hechas el cierre es `loop_detected`'),
    lista(sin) === 'retry,abort' && lista(una) === 'abort' && una.discarded.some((d) => d.kind === 'retry' && /ya se intentó/.test(d.because)) && todas.stoppedBecause === 'loop_detected' && todas.proposals.length === 0,
    `${lista(sin)} → ${lista(una)} → ${todas.stoppedBecause}`);
  const sinPolitica = rec.analizar(v, con('PROVIDER_ERROR', { previous: Array.from({ length: 20 }, (_, i) => ({ kind: 'retry', failureClass: `otra${i}` })) }));
  check(FIJADO('(R6 §3.10) la huella es por clase de fallo y NO por cuenta: veinte reintentos hechos contra veinte clases distintas no acotan nada si no hay `retry.maxAttempts` —sigue proponiendo `retry`—. Lo que acota es la política'),
    kinds(sinPolitica).includes('retry'));
  const cero = rec.analizar(a6.verificar(conFallo('PROVIDER_ERROR')), con('PROVIDER_ERROR', { retry: { maxAttempts: 0 } }));
  check(B('G2', '`retry.maxAttempts: 0` —«ningún reintento», que es lo que sale al traducir un trabajo de UN solo intento— cierra TODO el análisis con `attempts_exhausted` y SIN propuestas, ni siquiera `abort`: agotar los reintentos bloquea también lo que no es reintentar (`fallback`, `replan`, `reduce_scope`). Si eso es lo querido o hay que separar «reintentos» de «recuperaciones» lo decide una persona'),
    cero.stoppedBecause === 'attempts_exhausted' && cero.proposals.length === 0 && cero.recoverable === false
    && rec.analizar(a6.verificar(conFallo('INSUFFICIENT_CREDITS')), con('INSUFFICIENT_CREDITS', { retry: { maxAttempts: 0 } })).proposals.length === 0
    && lista(rec.analizar(a6.verificar(conFallo('INSUFFICIENT_CREDITS')), con('INSUFFICIENT_CREDITS'))) === 'reduce_scope,abort');
}

/* ── F11 · AUTORIDAD CONTRA REALIDAD ─────────────────────────────────────── */

console.log('\n─── F11. Autoridad contra realidad: lo real lleva proveedor y modelo, y A6 los rechaza en TODO el resultado ───');

{
  const prohibida = (clave, donde) => {
    const salida = donde === 'metadata' ? imgs(1) : [sal('image', 'asset:x', { metadata: { [clave]: 'x' } })];
    return analizar({ expected: IMG, actual: res('r', { outputs: salida, ...(donde === 'metadata' ? { metadata: { [clave]: 'x' } } : {}) }) });
  };
  const CLAVES = ['provider', 'model', 'adapter', 'implementation', 'providerId', 'modelId', 'adapterId', 'implementationRef', 'allowedProviders',
    'excludeProviders', 'PROVIDER', 'Provider_Id', 'model-id', 'Adapter_Id', 'IMPLEMENTATION_REF'];
  const mal = CLAVES.filter((k) => ['metadata', 'salida'].some((donde) => {
    const { v, r } = prohibida(k, donde);
    return !(v.status === 'fail' && v.failures.some((f) => f.type === 'authority.implementation' && f.hard) && r.failureClass === 'authority_failure' && lista(r) === 'abort');
  }));
  check(FIJADO('(R6 §3.11) CUALQUIERA de las diez claves de implementación del Planner —y sus variantes de mayúsculas, guiones y guiones bajos— en la metadata del resultado o en la de una salida lo hace `fail/authority_failure` DURO, y solo cabe parar'),
    mal.length === 0, mal.join(',') || `${CLAVES.length} claves × 2 sitios`);
  const CASI = ['providerRef', 'providerRetryable', 'providerCode', 'providerKey', 'hasProviderRef', 'modelUsed', 'modelo', 'proveedor', 'providers', 'models', 'implementations', 'adapters', 'respuestaDelProveedor'];
  const colados = CASI.filter((k) => !prohibida(k, 'metadata').v.passed);
  check(FIJADO('(hueco por diseño) la frontera es una lista de claves EXACTAS: `providerRef`, `providerRetryable`, `providerCode`, los plurales (`providers`, `models`…) y los nombres en castellano NO se rechazan. Por eso la costura no puede fiarse de ella: necesita su propia lista blanca'),
    colados.length === 0, colados.length ? `rechazadas: ${colados.join(',')}` : `${CASI.length} nombres pasan`);
  check(FIJADO('y mira CLAVES, no valores: una nota que diga «usa gemini con seedance» en una clave inocente pasa'),
    prohibida('nota', 'metadata').v.status === 'pass' && analizar({ expected: IMG, actual: res('r', { outputs: imgs(1), metadata: { nota: 'usa gemini con seedance' } }) }).v.passed === true);
  const anidar = (n) => { let o = { provider: 'x' }; for (let i = 0; i < n; i++) o = { a: o }; return o; };
  const ancho = (n) => ({ ...Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, 1])), provider: 'x' });
  const detecta = (valor) => A.violacionesEn(valor, 'r').length > 0;
  check(FIJADO('(hueco por diseño) la guarda tiene TOPES para no ser ella la caída: una clave prohibida a profundidad 8 se ve y a profundidad 9 NO; con 4 095 claves delante se ve y con 4 096 NO. Lo que se cuele más hondo o más ancho solo lo para la lista blanca'),
    detecta(anidar(7)) && detecta(anidar(8)) && !detecta(anidar(9)) && !detecta(anidar(12)) && detecta(ancho(4094)) && detecta(ancho(4095)) === true && !detecta(ancho(4096)) && !detecta(ancho(5000)),
    `profundidad 8: ${detecta(anidar(8))} · 9: ${detecta(anidar(9))} · ancho 4095: ${detecta(ancho(4095))} · 4096: ${detecta(ancho(4096))}`);
}
{
  /* Lo REAL que una costura ingenua metería: el paso del conductor entero, con su `implementation`, la respuesta con `model` y el trabajo. */
  const pasoCrudo = (job) => ({
    stepId: 's1', capability: job.capability, jobId: job.jobId, estadoDelTrabajo: job.state, intentos: job.attemptCount,
    implementation: job.implementation, origenDeLaRuta: 'router',
    respuesta: { kind: 'image', urls: ['asset:x'], actual: { usd: 0.1 }, model: job.implementation?.modelId, meta: { taskId: 't-1' } },
    outputRefs: job.result?.outputRefs ?? [], error: job.error,
  });
  const crudo = (job) => analizar({ expected: IMG, actual: res('r', { outputs: imgs(1), metadata: { paso: pasoCrudo(job), job } }) });
  const mal = Object.entries(TRABAJOS).filter(([, job]) => {
    const { v, r } = crudo(job);
    return !(v.status === 'fail' && r.failureClass === 'authority_failure' && lista(r) === 'abort');
  }).map(([k]) => k);
  check(FIJADO('CONTROL CRUDO (R6 §3.11) con todos los trabajos reales del fixture: pasarle a A6 el paso del conductor o el trabajo tal cual —con su `implementation`, su `model` y su `providerRef`— lo hace `fail/authority_failure` y solo propone parar: TODO saldría suspendido. El traductor necesita lista blanca'),
    Object.keys(TRABAJOS).length >= 26 && mal.length === 0, mal.join(',') || `${Object.keys(TRABAJOS).length} trabajos`);
}

/* ── F12 · `maxReplans`, `replanCount`, `strategyId` con prosa, evaluador síncrono y Legacy ─── */

console.log('\n─── F12. `maxReplans` y `replanCount` sin lector, `strategyId` con prosa, evaluador síncrono y fallos sin código ───');

{
  const falta = conFallo('CAPABILITY_UNAVAILABLE');
  const porTope = [0, 1, 2, 9].map((m) => canon(analizar(falta, con('CAPABILITY_UNAVAILABLE', { budget: { maxReplans: m } }))));
  check(B('G3', '(R6 §3.12) `maxReplans` no acota la recuperación: con 0 —el tope más estricto—, 1, 2 y 9 el análisis es EXACTAMENTE el mismo y `replan` se propone igual. Nadie cuenta replanes: quién los aplica (quien llama, según el informe) no está decidido'),
    porTope.every((x) => x === porTope[0]) && lista(analizar(falta, con('CAPABILITY_UNAVAILABLE', { budget: { maxReplans: 0 } })).r) === 'replan,abort');
  const v = a6.verificar(falta);
  const replanes = (n, clase) => Array.from({ length: n }, () => ({ kind: 'replan', failureClass: clase }));
  const otraClase = rec.analizar(v, con('CAPABILITY_UNAVAILABLE', { previous: replanes(5, 'dependency_failure') }));
  const mismaClase = rec.analizar(v, con('CAPABILITY_UNAVAILABLE', { previous: replanes(1, 'unmet_requirement') }));
  check(FIJADO('lo único que frena un `replan` es la huella: cinco replanes hechos contra OTRA clase no lo frenan (se propone igual) y uno solo contra la MISMA lo descarta. No hay cuenta de replanes'),
    kinds(otraClase).includes('replan') && !kinds(mismaClase).includes('replan'), `${lista(otraClase)} · ${lista(mismaClase)}`);
}
{
  const a1 = A.crearMotorDeDecision();
  const contexto = (extra = {}) => ({
    contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { quality: 1 } }, trace: { traceId: 't', requestId: 'r', userId: 'u' },
    options: [{ id: 'a', value: { n: 'a' }, values: { quality: 0.9 } }, { id: 'b', value: { n: 'b' }, values: { quality: 0.8 } }], ...extra,
  });
  const base = canon(a1.decidir(contexto()));
  check(B('G3', '(R6 §3.12) `replanCount` de A1 se VALIDA —entero no negativo: −1 y 1,5 son `invalid`— y no lo lee nadie para decidir: con 0 y con 99 A1 decide EXACTAMENTE lo mismo que sin él. `algorithm-quality` fija `maxReplans`; este es el otro extremo, y no tenía comprobación'),
    canon(a1.decidir(contexto({ replanCount: 0 }))) === base && canon(a1.decidir(contexto({ replanCount: 99 }))) === base
    && a1.decidir(contexto({ replanCount: -1 })).status === 'invalid' && a1.decidir(contexto({ replanCount: 1.5 })).status === 'invalid');
}
{
  const prosa = A.recuperacionPara([{ kind: 'fallback_dependence', because: 'depende del respaldo' }]);
  const estrategia = R.strategies.estrategias[0]?.value ?? {};
  const conProsa = { ...estrategia, recovery: prosa };
  const sinId = { ...estrategia, recovery: [{ kind: 'alternative_strategy', because: 'x' }] };
  const { r } = analizar(conFallo('PROVIDER_ERROR'), con('PROVIDER_ERROR', { alternatives: ['zeta', 'alfa'] }));
  const alt = r.proposals.find((p) => p.kind === 'alternative_strategy');
  check(B('G3', '(R6 §3.12) A3 rellena el `strategyId` de su `alternative_strategy` con PROSA —«la principal, si vuelve a estar disponible»— solo para pasar la validación, que exige que no esté vacío. A6, en cambio, pone un id REAL: el primero de las alternativas, ordenadas. Dos propuestas del mismo tipo con dos significados; quien consuma `strategyId` como identificador tropieza con la de A3'),
    prosa.length === 1 && prosa[0].strategyId === 'la principal, si vuelve a estar disponible' && /\s/.test(prosa[0].strategyId)
    && A.problemasDeEstrategia(conProsa).filter((x) => /^recovery:/.test(x)).length === 0 && A.problemasDeEstrategia(sinId).includes('recovery:alternative_strategy:no_target')
    && alt.strategyId === 'alfa' && !/\s/.test(alt.strategyId), `A3: «${prosa[0]?.strategyId}» · A6: «${alt?.strategyId}»`);
}
{
  const PIDE = { expected: [{ kind: 'image', quality: { minScore: 0.5 } }], actual: res('r', { outputs: imgs(1) }) };
  const asincrono = A.crearMotorDeVerificacion({ evaluadores: [{ id: 'asinc', supports: () => true, evaluate: () => Promise.resolve({ status: 'pass', value: 1 }) }] }).verificar(PIDE);
  check(FIJADO('(R6 §3.12) el puerto de evaluadores es SÍNCRONO: uno que devuelve una Promesa no da veredicto —`status` no es un texto—, deja la comprobación sin hacer (`unknown`), cuenta como evaluador fallido y NO aprueba. Un Quality Engine con E/S solo cabe con veredictos precalculados'),
    asincrono.status === 'pass_with_uncertainty' && asincrono.passed === true && asincrono.metricas.evaluadoresFallidos === 1
    && asincrono.warnings.some((w) => w.status === 'unknown' && /no devolvió un veredicto/.test(w.because)));
  const reventando = A.crearMotorDeVerificacion({ evaluadores: [{ id: 'sincrono-roto', supports: () => true, evaluate: () => { throw new Error('boom'); } }] }).verificar(PIDE);
  check(FIJADO('el evaluador que REVIENTA, en cambio, sí se recoge: queda la comprobación sin hacer (`unknown`), cuenta como fallido y no aprueba la calidad pedida —la diferencia con el asíncrono es solo que a este le pone el `try`—'),
    reventando.status === 'pass_with_uncertainty' && reventando.metricas.evaluadoresFallidos === 1 && reventando.warnings.some((w) => w.type === 'quality.requirement' && w.status === 'unknown')
    && !reventando.findings.some((f) => f.type === 'quality.requirement' && f.status === 'pass'));
  const rechazos = [];
  const oyente = (e) => rechazos.push(String(e?.message ?? e));
  process.on('unhandledRejection', oyente);
  const roto = A.crearMotorDeVerificacion({ evaluadores: [{ id: 'asinc-roto', supports: () => true, evaluate: () => Promise.reject(new Error('el evaluador asíncrono reventó')) }] }).verificar(PIDE);
  await new Promise((fin) => setTimeout(fin, 30));
  process.off('unhandledRejection', oyente);
  check(B('G1', 'y el rechazo de esa Promesa SE ESCAPA: A6 no la recoge (ni la espera, ni le pone un `catch`), el veredicto sale limpio y el error llega al proceso como `unhandledRejection` —que, sin oyente, en Node tumba la invocación—. Un evaluador asíncrono mal escrito no debería poder hacer eso; arreglarlo es tocar `verification-engine.ts`'),
    roto.status === 'pass_with_uncertainty' && roto.metricas.evaluadoresFallidos === 1 && rechazos.length === 1 && /reventó/.test(rechazos[0]), rechazos.join('|'));
}
{
  const legacy = { code: undefined, message: 'gemini: la respuesta llegó vacía' };
  const { v, r } = analizar({ expected: IMG, actual: res('r', { status: 'failed', error: legacy }) });
  check(B('G2', '(R6 §3.12) una réplica sobre el histórico de Legacy no puede clasificar: Legacy guardó el MENSAJE del fallo y no su código (anclas arriba), y `claseDeFallo` con un mensaje —o con un código que no es del Core— devuelve `unknown`, no «la casilla que más se le parezca»'),
    A.claseDeFallo(legacy) === 'unknown' && A.claseDeFallo({ code: 'la respuesta llegó vacía' }) === 'unknown' && A.claseDeFallo({ code: 'PROVIDER_ERROR' }) === 'provider_failure'
    && v.status === 'fail' && r.failureClass === 'unmet_requirement', `${A.claseDeFallo(legacy)} · sin código, por estructura: ${r.failureClass}`);
}

/* ═══ C · LO QUE A3, A4 Y A5 GENERAN Y A6 NO LEE ════════════════════════════ */

console.log('\n─── C. Lo que A3, A4 y A5 generan y A6 no lee ───');

/* a → (b, c) y d → (e, f): dos pasos con dos dependientes cada uno, que son dos puntos de comprobación. */
const TAREA_CP = { id: 'TCP', steps: [paso('a'), paso('b', ['a']), paso('c', ['a']), paso('d'), paso('e', ['d']), paso('f', ['d']), paso('g', ['b', 'c', 'e', 'f'])] };
const SENALES_CP = senalesDeLosPasos(TAREA_CP);
const cicloCP = (restricciones, extraDecision = {}) => ciclo.decidir({
  decision: decisionBase(SENALES_CP, {
    ...(restricciones ? { objective: { weights: { latency: 1, reliability: 1 }, constraints: restricciones } } : {}), ...extraDecision,
  }),
  tarea: TAREA_CP, expected: [{ kind: 'text' }], componer: { paralelizar: true, optimizar: true },
});
const R0 = cicloCP();

{
  const plan = R0.entrega.plan;
  const pasosX = [paso('x'), paso('a'), paso('d'), paso('k1', ['x']), paso('k2', ['x']), paso('k3', ['x']), paso('k4', ['a']), paso('k5', ['a']), paso('k6', ['d']), paso('k7', ['d'])];
  const reqX = { minScore: 0.5 };
  check(FIJADO('(A3 = `motor-de-estrategias`) la estrategia que A3 entrega trae `checkpoints` —puntos de comprobación tras los pasos de los que cuelgan varios— y una `recovery` propuesta por sus riesgos, con la forma del contrato y respetando la frontera de autoridad'),
    R0.status === 'decided' && canon((plan.checkpoints ?? []).map((c) => c.afterStepId)) === canon(['a', 'd'])
    && (plan.checkpoints ?? []).every((c) => typeof c.claim === 'string' && c.requirement && typeof c.requirement === 'object')
    && (R.entrega.plan.recovery ?? []).length > 0 && (R.entrega.plan.recovery ?? []).every((p) => A.RECUPERACIONES.includes(p.kind) && typeof p.because === 'string')
    && A.respetaLaFrontera(plan) && A.respetaLaFrontera(R.entrega.plan),
    `checkpoints ${(plan.checkpoints ?? []).map((c) => c.afterStepId)} · recovery ${(R.entrega.plan.recovery ?? []).map((p) => p.kind)}`);
  check(FIJADO('los puntos de comprobación se ordenan por cuántos pasos cuelgan (y por id) y se acotan: tres como mucho por defecto, y dos o ninguno si se pide'),
    canon(A.puntosDeComprobacion(pasosX, reqX).map((c) => c.afterStepId)) === canon(['x', 'a', 'd'])
    && canon(A.puntosDeComprobacion(pasosX, reqX, 2).map((c) => c.afterStepId)) === canon(['x', 'a'])
    && A.puntosDeComprobacion(pasosX, reqX, 0).length === 0);
  const sinCP = { ...R0, entrega: { ...R0.entrega, plan: { ...plan, checkpoints: [], recovery: [] } } };
  const otroCP = {
    ...R0, entrega: { ...R0.entrega, plan: { ...plan,
      checkpoints: [{ afterStepId: 'paso-que-no-existe', requirement: { minScore: 0.99, onBelow: 'fail' }, claim: 'imposible' }],
      recovery: [{ kind: 'abort', because: 'otra cosa' }] } },
  };
  const casos = [
    ['un éxito', observar('success', res('e7', { outputs: [sal('text', 'ref://7')] }))],
    ['un fallo con código', observar('failure', res('e8', { status: 'failed', error: { code: 'TIMEOUT' } }))],
    ['un resultado que no cumple', observar('partial_success', res('e9', { outputs: [] }))],
  ];
  check(FIJADO('(R6 §2) A6 NO lee lo que A3 genera: quitar, cambiar o inventar los `checkpoints` y la `recovery` del plan entregado no cambia NI UN BYTE del veredicto ni de la recuperación del cierre, en un éxito, en un fallo y en un resultado incumplido; y sus comprobaciones no mencionan ningún paso de comprobación'),
    casos.every(([, o]) => {
      const base = ciclo.cerrar(R0, o, { ahora: T1 });
      return base.status === 'closed' && [sinCP, otroCP].every((otro) => {
        const c = ciclo.cerrar(otro, o, { ahora: T1 });
        return canon(c.verification) === canon(base.verification) && canon(c.recovery) === canon(base.recovery);
      }) && !base.verification.findings.some((f) => /checkpoint|afterStep|paso-que-no-existe/.test(canon(f)));
    }));
}
{
  const op = A.OPERADORES_DE_ESTRATEGIA.find((o) => o.id === 'quitar-comprobaciones');
  const candidata = R0.strategies.estrategias.find((c) => (c.value.checkpoints ?? []).length === 2);
  const ctx = (restricciones) => ({ objective: { weights: { latency: 1 } }, ...(restricciones ? { constraints: restricciones } : {}), signals: [], resources: {}, topes: A.TOPES_POR_DEFECTO });
  const aplicable = (c, r) => op.aplicable(c, ctx(r));
  /* Si A3 dejara de entregar dos puntos de comprobación, esto FALLA por aserción: no se cae la suite entera. */
  const r5 = sinReventar(() => {
    if (!op || !candidata) return { ok: false, motivo: 'sin operador, o A3 ya no entrega una estrategia con dos puntos de comprobación' };
    const quitada = op.aplicar(candidata, ctx({ maxLatencyMs: 100_000 }));
    const unaSola = { ...candidata, value: { ...candidata.value, checkpoints: candidata.value.checkpoints.slice(0, 1) } };
    return {
      ok: [1, 250, 100_000, 1e9].every((m) => aplicable(candidata, { maxLatencyMs: m }) === true)
        && aplicable(candidata, {}) === false && aplicable(candidata, undefined) === false && aplicable(candidata, { maxLatencyMs: '5' }) === false && aplicable(unaSola, { maxLatencyMs: 5 }) === false
        && quitada.value.checkpoints.length === 1 && quitada.value.checkpoints[0].afterStepId === candidata.value.checkpoints[0].afterStepId
        && canon(op.affects) === canon(['latency', 'cost']) && !A.EJES.some((e) => /verif|cover|cobert|check|compro/i.test(e)),
    };
  });
  check(B('A5', '(R6 §2) A5 puede QUITAR puntos de comprobación por latencia sin que nada mida lo perdido: `quitar-comprobaciones` es aplicable en cuanto hay MÁS DE UNO y `maxLatencyMs` es un número —da igual su valor: con 1 ms, con 100 000 o con mil millones—, conserva solo el primero y declara que mueve latencia y coste. Ningún eje del objetivo es de verificación o cobertura. Si A5 debe poder reducir la verificación, y con qué medida, es una decisión humana'),
    !r5.lanzo && r5.ok === true, r5.lanzo ?? r5.motivo ?? `ejes: ${A.EJES.join(',')}`);
  const holgada = cicloCP({ maxLatencyMs: 100_000 });
  check(B('A5', 'y en el ciclo entero: con una latencia máxima SIN APRETAR (100 s para pasos de 300 ms) el plan entregado pierde un punto de comprobación —de dos a uno, y su id lo dice (`sinExtras`)— frente al mismo plan sin esa restricción. Nada en el cierre sabe que se perdió cobertura'),
    (R0.entrega.plan.checkpoints ?? []).length === 2 && holgada.status === 'decided' && (holgada.entrega?.plan.checkpoints ?? []).length === 1 && /sinExtras/.test(holgada.entrega?.plan.id ?? '')
    && !/sinExtras/.test(R0.entrega.plan.id), `${(R0.entrega.plan.checkpoints ?? []).length} → ${(holgada.entrega?.plan.checkpoints ?? []).length} · ${holgada.entrega?.plan.id}`);
}
{
  const conParalelo = cicloCP(undefined, { constraints: { maxParallel: 2 } });
  check(FIJADO('(R6 §2 · D8 CERRADA: no se implementa) `maxParallel` de A4 y `maxConcurrent` del Orchestrator son campos DISTINTOS y la traducción NO existe: el destino declarado del requisito es el orquestador, la entrega lleva `maxParallel: 2` tal cual y ningún `maxConcurrent` aparece en ella. Quien ejecuta decide cuántos a la vez con su propio campo'),
    A.DESTINO_DEL_REQUISITO.maxParallel === 'orchestrator' && conParalelo.status === 'decided' && conParalelo.entrega.constraints.maxParallel === 2
    && !clavesDe(conParalelo.entrega).has('maxConcurrent') && /maxConcurrent\?: number;/.test(leer('functions/src/core/orchestrator.ts'))
    && /D8 · `maxParallel` y `maxConcurrent` — CERRADA: no se implementa/.test(leer('docs/ALGORITHM-ENGINE.md')));
  check(FIJADO('(A4 = `motor-de-paralelizacion`) A4 SÍ cumple su `maxParallel` en lo suyo —el ancho de sus disposiciones—, y es lo único que lo lee: con `maxParallel: 2` el plan entregado no pasa de dos a la vez (`[2,2,2]`) y sin el tope llega a cuatro (`[2,4]`); con 1 no cabe ninguna disposición y el ciclo se para (`max_depth_exceeded`: la secuencial es más profunda que el tope de pensar)'),
    (() => {
      const ancho = (r) => Math.max(0, ...(r.entrega.plan.parallelGroups ?? []).map((g) => g.steps.length));
      const dos = cicloCP(undefined, { constraints: { maxParallel: 2 } });
      const uno = cicloCP(undefined, { constraints: { maxParallel: 1 } });
      return dos.status === 'decided' && ancho(dos) === 2 && ancho(R0) === 4 && uno.status === 'undecided' && uno.parada === 'max_depth_exceeded';
    })());
}

/* ═══ D · INDEPENDENCIA: A6 SIN PROVEEDOR, MODELO NI CAPACIDAD CONCRETA ═════ */

console.log('\n─── D. Independencia: A6 sin proveedor, modelo ni capacidad concreta ───');

const A6_ARCHIVOS = ['verification.ts', 'verification-engine.ts', 'recovery.ts', 'recovery-engine.ts'];
const A6_FUENTES = A6_ARCHIVOS.map((f) => ({ f, src: sinComentarios(leer(`functions/src/core/algorithm/${f}`)) }));
/* Por TOKEN, no por subcadena: «suno» dentro de «almenosuno» no es una dependencia. */
const tokens = (src) => new Set(src.toLowerCase().match(/[a-z0-9_]+/g) ?? []);
const PROHIBIDOS_BASE = ['gemini', 'deepseek', 'seedance', 'elevenlabs', 'minimax', 'openai', 'claude', 'qwen', 'suno', 'flux', 'seedream', 'anthropic',
  'byteplus', 'modelark', 'tripo', 'meshy', 'hunyuan', 'lipsync', 'faceswap', 'face_swap', 'talking_avatar', 'motion_transfer', 'video_translation',
  'gpt', 'sonnet', 'opus', 'veo', 'kling', 'runway', 'sora', 'midjourney', 'imagen', 'whisper', 'nano', 'banana',
  'adapter', 'adapters', 'adaptador', 'qualityengine', 'visionengine', 'motionengine', 'identityengine', 'lipsyncengine', 'audioengine', 'videoengine'];
/* Y los que traiga el repositorio: un adaptador nuevo en `engine/providers` queda prohibido en A6 sin acordarse de venir aquí. */
const DEL_REPOSITORIO = fs.readdirSync(path.resolve(RAIZ, 'functions/src/engine/providers')).filter((f) => f.endsWith('.ts'))
  .map((f) => f.replace(/\.ts$/, '')).filter((x) => !['mock', 'music', 'fal-modelos'].includes(x));
const PROHIBIDOS = [...new Set([...PROHIBIDOS_BASE, ...DEL_REPOSITORIO])].sort();
{
  const sucios = A6_FUENTES.flatMap(({ f, src }) => { const t = tokens(src); return PROHIBIDOS.filter((p) => t.has(p)).map((p) => `${f}:${p}`); });
  check(FIJADO('(GUARD) los cuatro módulos de A6 NO NOMBRAN ningún proveedor, modelo ni motor especializado —por token, sin comentarios—: la lista son los de siempre más cada adaptador que hoy hay en `engine/providers`'),
    sucios.length === 0 && PROHIBIDOS.length >= 40 && ['gemini', 'seedance', 'elevenlabs', 'deepseek', 'openai'].every((p) => DEL_REPOSITORIO.includes(p) || PROHIBIDOS_BASE.includes(p)),
    sucios.join(', ') || `${PROHIBIDOS.length} nombres prohibidos (${DEL_REPOSITORIO.length} de adaptadores)`);
  check(FIJADO('CONTROL: la guarda muerde —caza `gemini` y `seedance` en código, un adaptador cualquiera de la lista, y distingue token de subcadena (`almenosuno` no es `suno`; `adaptado` no es `adapter`)'),
    tokens("const x = llamarA('gemini'); import y from '../seedance';").has('gemini') && tokens("import y from '../seedance';").has('seedance')
    && !tokens('const almenosuno = 1; const adaptado = true;').has('suno') && !tokens('const adaptado = true;').has('adapter')
    && PROHIBIDOS.filter((p) => tokens(`const cliente = ${p}();`).has(p)).length === PROHIBIDOS.length);
}
{
  const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nombra = (src, id) => new RegExp(`(?<![\\w.])${escapar(id)}(?![\\w])`).test(src);
  const ids = idsDelCatalogo();
  const nombradas = A6_FUENTES.flatMap(({ f, src }) => ids.filter((id) => nombra(src, id)).map((id) => `${f}:${id}`));
  check(FIJADO('(GUARD) y ninguna de las 69 capacidades del catálogo aparece con su identificador en los módulos de A6: ni `image.generate` ni `voice.tts` ni `world.generate` —A6 no conoce ninguna capacidad—'),
    ids.length >= 69 && nombradas.length === 0, nombradas.join(', ') || `${ids.length} capacidades`);
  check(FIJADO('CONTROL: caza el identificador entero y no una parte (`image.generate` en un `if` sí; `reimage.generated` y `image.generated` no)'),
    nombra("if (c === 'image.generate') return;", 'image.generate') && !nombra('const reimage.generated = 1;', 'image.generate') && !nombra('x = image.generated;', 'image.generate'));
}
{
  const especificadores = (fuente) =>
    [...fuente.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)(['"])([^'"]+)\1/g)].map((m) => m[2]);
  const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));
  const resolver = (desde, rel, hay) => {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(desde), rel));
    return [`${base}.ts`, `${base}/index.ts`].find(hay);
  };
  /* El cierre transitivo de lo que se importa, con el lector por puerto para poder probar la guarda con un grafo inventado. */
  const cierreDe = (inicio, leerFuente, hay) => {
    const visto = new Set();
    const ajenos = new Set();
    const cola = [...inicio];
    while (cola.length) {
      const f = cola.pop();
      if (visto.has(f)) continue;
      visto.add(f);
      for (const e of especificadores(sinComentarios(leerFuente(f)))) {
        if (!e.startsWith('.')) { ajenos.add(`${e} ← ${f}`); continue; }
        const destino = resolver(f, e, hay);
        if (destino) cola.push(destino); else ajenos.add(`${e} (sin resolver) ← ${f}`);
      }
    }
    return { visto: [...visto].sort(), ajenos: [...ajenos].sort() };
  };
  const PERMITIDOS = ['../contracts', '../errors', '../workflow', './types', './budget', './objective', './signals', './strategy', './authority', './verification', './recovery'];
  const directos = A6_ARCHIVOS.flatMap((f) => especificadores(sinComentarios(leer(`functions/src/core/algorithm/${f}`))).map((e) => ({ f, e })));
  check(FIJADO('(GUARD) lo que A6 importa DIRECTAMENTE es solo contratos del Core y piezas de su propia capa —`contracts`, `errors`, `workflow` y hermanos—, en cualquiera de sus formas (`from`, `import()`, `require`)'),
    directos.length >= 20 && directos.every(({ e }) => PERMITIDOS.includes(e)), directos.filter(({ e }) => !PERMITIDOS.includes(e)).map(({ f, e }) => `${f}→${e}`).join(', ') || `${directos.length} importaciones`);
  const { visto, ajenos } = cierreDe(A6_ARCHIVOS.map((f) => `functions/src/core/algorithm/${f}`), leer, existe);
  const PROHIBIDO_EN_EL_CIERRE = /^functions\/src\/(?!core\/)|^functions\/src\/core\/(job|job-queue|router|orchestrator|moderation|backup)\.ts$|^functions\/src\/core\/(financial|media)\//;
  const colados = visto.filter((f) => PROHIBIDO_EN_EL_CIERRE.test(f));
  check(FIJADO('(GUARD) y el cierre TRANSITIVO es igual de limpio: los módulos que A6 acaba tocando —incluido el Planner, por `authority.ts`— están todos dentro de `core/`, sin una sola dependencia externa y sin llegar al Job Engine, al Router, al Orchestrator, al Financial Core, a Media, a Moderación ni a las copias'),
    visto.length >= 30 && colados.length === 0 && ajenos.length === 0 && visto.every((f) => f.startsWith('functions/src/core/')),
    colados.concat(ajenos).join(', ') || `${visto.length} módulos`);
  const grafo = {
    'x.ts': "import { a } from './y'; export const x = a;",
    'y.ts': "import g from '../engine/gateway'; const t = require('firebase-admin'); const l = await import('./z');",
    'z.ts': 'export const z = 1;',
  };
  const falso = cierreDe(['x.ts'], (f) => grafo[f], (f) => f in grafo);
  check(FIJADO('CONTROL: la guarda del cierre muerde: en un grafo inventado ve los tres módulos y señala lo que no es local —`../engine/gateway` sin resolver y `firebase-admin`—, y sigue un `import()` dinámico'),
    canon(falso.visto) === canon(['x.ts', 'y.ts', 'z.ts']) && falso.ajenos.length === 2 && falso.ajenos.some((x) => /firebase-admin/.test(x)) && falso.ajenos.some((x) => /sin resolver/.test(x)));
}
{
  /* Un trabajo a mano, de cualquier capacidad: la costura y A6 no deben notar de cuál. */
  const hecho = (cap, e) => ({
    jobId: 'j', revision: 5, state: e.state, capability: cap, attemptCount: e.attempts.length, policy: { retry: { maxAttempts: 3 } },
    ...(e.result ? { result: e.result } : {}), ...(e.error ? { error: e.error } : {}), attempts: e.attempts,
  });
  const intento = (n, outcome, code) => ({ attemptId: `j:${n}`, number: n, dispatched: true, outcome, ...(code ? { error: { code, source: 'x' } } : {}) });
  const ESCENARIOS = {
    completado: { state: 'completed', result: { outputRefs: ['asset:1'] }, attempts: [intento(1, 'succeeded')] },
    completado_vacio: { state: 'completed', result: { outputRefs: [] }, attempts: [intento(1, 'succeeded')] },
    timeout_con_intentos_libres: { state: 'failed', error: { code: 'TIMEOUT', source: 'x' }, attempts: [intento(1, 'timed_out', 'TIMEOUT')] },
    proveedor_agotado: { state: 'failed', error: { code: 'PROVIDER_ERROR', source: 'x' }, attempts: [1, 2, 3].map((i) => intento(i, 'failed', 'PROVIDER_ERROR')) },
    politica_de_contenido: { state: 'failed', error: { code: 'CONTENT_POLICY', source: 'x' }, attempts: [intento(1, 'failed', 'CONTENT_POLICY')] },
    sin_creditos: { state: 'failed', error: { code: 'INSUFFICIENT_CREDITS', source: 'x' }, attempts: [intento(1, 'failed', 'INSUFFICIENT_CREDITS')] },
    duplicado: { state: 'failed', error: { code: 'DUPLICATE_REQUEST', source: 'x' }, attempts: [{ ...intento(1, 'failed', 'DUPLICATE_REQUEST'), dispatched: false }] },
  };
  const corrida = (job, opciones) => {
    const t = traducir(job, { ...opciones, hasFallback: true, alternatives: ['b', 'a'] });
    if (t.omitido) return { omitido: t.omitido };
    const { v, r } = analizar(t.peticion, t.contexto);
    return { v, r, g: puertaDeEjecucion(r, t.hechos, undefined), atadoA: t.atadoA, runId: t.runId };
  };
  const ids = idsDelCatalogo();
  const distintas = [];
  for (const cap of ids) {
    const kind = tipoDeMaterialDe(cap);
    for (const [nombre, e] of Object.entries(ESCENARIOS)) {
      const real = canon(corrida(hecho(cap, e), { esperarLoDeLaCapacidad: true }));
      const inventada = canon(corrida(hecho(CAPACIDAD_INVENTADA, e), { expected: [{ kind }], kindDeSalida: kind }));
      if (real !== inventada) distintas.push(`${cap}/${nombre}`);
    }
  }
  check(SEAM('(AGNOSTICISMO, con la costura puesta) para CADA una de las 69 capacidades del catálogo y para siete escenarios —éxito, éxito vacío, timeout con intentos libres, proveedor agotado, política de contenido, sin créditos y duplicado—, el veredicto, la recuperación, la puerta y el atado son BYTE A BYTE los de una capacidad inventada con la misma clase de material: A6 y la costura dependen de la CLASE de lo que sale, nunca de qué capacidad lo hizo'),
    ids.length >= 69 && distintas.length === 0, distintas.slice(0, 6).join(', ') || `${ids.length} × ${Object.keys(ESCENARIOS).length} = ${ids.length * Object.keys(ESCENARIOS).length} comparaciones`);
  const unicos = new Set(ids.map((cap) => canon(corrida(hecho(cap, ESCENARIOS.proveedor_agotado), { esperarLoDeLaCapacidad: true })).split(tipoDeMaterialDe(cap)).join('K')));
  check(SEAM('y con la clase de material tachada, las 69 dan UN solo resultado en cada escenario: no hay capacidad que se comporte distinto de las demás'),
    unicos.size === 1, `${unicos.size} resultado(s) distinto(s)`);
}

/* ═══ E · EL TRADUCTOR DE REFERENCIA: EL CONTRATO DE LA COSTURA ═════════════ */

console.log('\n─── E. El traductor de referencia: lo que la costura tiene que cumplir ───');

const SALIDA_ESPERADA = {
  texto_ok: { status: 'pass', clase: 'unknown', cierre: 'nothing_to_recover', props: '—' },
  imagen_dos_ok: { status: 'pass', clase: 'unknown', cierre: 'nothing_to_recover', props: '—' },
  voz_ok: { status: 'pass', clase: 'unknown', cierre: 'nothing_to_recover', props: '—' },
  documento_ok: { status: 'pass', clase: 'unknown', cierre: 'nothing_to_recover', props: '—' },
  mundo_ok: { status: 'pass', clase: 'unknown', cierre: 'nothing_to_recover', props: '—' },
  video_asincrono_ok: { status: 'pass', clase: 'unknown', cierre: 'nothing_to_recover', props: '—' },
  primera_entregada: { status: 'pass', clase: 'unknown', cierre: 'nothing_to_recover', props: '—' },
  completado_vacio: { status: 'fail', clase: 'unmet_requirement', cierre: 'proposed', props: 'replan,abort' },
  proveedor_agotado: { status: 'fail', clase: 'provider_failure', cierre: 'attempts_exhausted', props: '—' },
  bloqueo_de_seguridad: { status: 'fail', clase: 'provider_failure', cierre: 'attempts_exhausted', props: '—' },
  proveedor_una_vez: { status: 'fail', clase: 'provider_failure', cierre: 'attempts_exhausted', props: '—' },
  timeout_conocido: { status: 'fail', clase: 'timeout', cierre: 'attempts_exhausted', props: '—' },
  politica_de_contenido: { status: 'fail', clase: 'invalid_input', cierre: 'proposed', props: 'abort' },
  sin_creditos: { status: 'fail', clase: 'resource', cierre: 'proposed', props: 'reduce_scope,abort' },
  fallo_sin_error: { status: 'fail', clase: 'unknown', cierre: 'proposed', props: 'abort' },
  esperando_aceptada: { omitido: 'no_terminal' }, en_cola: { omitido: 'no_terminal' }, zombi: { omitido: 'no_terminal' },
  primera_invocacion: { omitido: 'no_terminal' }, cancel_pedido: { omitido: 'no_terminal' }, bloqueo_reintentado: { omitido: 'no_terminal' },
  plazo_sin_saber: { omitido: 'desenlace_desconocido' },
  cancelado_en_marcha: { omitido: 'cancelado' }, cancelado_en_cola: { omitido: 'cancelado' },
  duplicado: { omitido: 'duplicado' }, duplicado_tardio: { omitido: 'duplicado' },
};
check('E1 · la tabla cubre los trabajos del fixture SIN huecos ni sobrantes: un trabajo nuevo sin su fila hace fallar esta comprobación',
  canon(Object.keys(SALIDA_ESPERADA).sort()) === canon(Object.keys(TRABAJOS).sort()), `${Object.keys(TRABAJOS).length} trabajos`);
for (const [nombre, esperado] of Object.entries(SALIDA_ESPERADA)) {
  const t = traducir(TRABAJOS[nombre], { esperarLoDeLaCapacidad: true });
  if (esperado.omitido) {
    check(SEAM(`${nombre} (${TRABAJOS[nombre].state}) → se OMITE por «${esperado.omitido}», y no sale petición ni contexto`),
      t.omitido === esperado.omitido && t.peticion === undefined && t.contexto === undefined && typeof t.porque === 'string', t.omitido);
  } else {
    const { v, r } = analizar(t.peticion, t.contexto);
    check(SEAM(`${nombre} (${TRABAJOS[nombre].state}) → A6 dice «${esperado.status}», clase ${esperado.clase}, cierre ${esperado.cierre}, propone [${esperado.props}]`),
      !t.omitido && v.status === esperado.status && r.failureClass === esperado.clase && r.stoppedBecause === esperado.cierre && lista(r) === esperado.props,
      `${v.status} · ${r.failureClass} · ${r.stoppedBecause} · ${lista(r)}`);
  }
}
{
  const vistas = new Set([...Object.keys(TRABAJOS).map((k) => traducir(TRABAJOS[k], { esperarLoDeLaCapacidad: true }).omitido),
    traducir(TRABAJOS.texto_ok, { esperarLoDeLaCapacidad: true, sintetico: true }).omitido, traducir(TRABAJOS.texto_ok).omitido].filter(Boolean));
  check(SEAM('las seis omisiones de R6 §6 —`no_terminal`, `cancelado`, `duplicado`, `sintetico`, `desenlace_desconocido`, `sin_expectativas`— las produce ALGÚN caso: ninguna es letra muerta; lo sintético se omite aunque haya salido bien, y sin decir qué se esperaba no se verifica'),
    canon([...vistas].sort()) === canon([...OMISIONES].sort()), [...vistas].sort().join(','));
  check(SEAM('un trabajo que no es un trabajo no revienta la costura: `undefined`, `null`, `{}` y un texto se omiten'),
    [undefined, null, {}, 'texto', 5].every((x) => { const t = sinReventar(() => traducir(x, { esperarLoDeLaCapacidad: true })); return !t.lanzo && typeof t.omitido === 'string'; }));
}
{
  const intentoDe = (n, code) => ({ attemptId: `j:${n}`, number: n, dispatched: true, outcome: 'failed', error: { code, source: 'x' } });
  const trabajoCon = (intentos, total, code = 'PROVIDER_ERROR') => ({
    jobId: 'j', revision: 7, state: 'failed', capability: 'image.generate', attemptCount: intentos, error: { code, source: 'x' },
    policy: { retry: { maxAttempts: total } }, attempts: Array.from({ length: intentos }, (_, i) => intentoDe(i + 1, code)),
  });
  const fallos = [];
  const naive = [];
  for (let total = 1; total <= 4; total++) {
    for (let intentos = 1; intentos <= total; intentos++) {
      const t = traducir(trabajoCon(intentos, total), { esperarLoDeLaCapacidad: true });
      const agotado = rec.analizar(a6.verificar(t.peticion), t.contexto).stoppedBecause === 'attempts_exhausted';
      if (agotado !== (intentos === total)) fallos.push(`${intentos}/${total}`);
      /* El ingenuo copia los intentos totales como reintentos: el último intento todavía «tiene» reintentos. */
      const ingenuo = rec.analizar(a6.verificar(t.peticion), { ...t.contexto, retry: { maxAttempts: total } });
      if (intentos === total && ingenuo.stoppedBecause !== 'attempts_exhausted') naive.push(`${intentos}/${total}`);
    }
  }
  check(SEAM('(R6 §6 · F6) la aritmética de los intentos: A6 habla de REINTENTOS y el Job Engine de intentos TOTALES, así que `retry.maxAttempts` = totales − 1 y `previous` = intentos − 1. Para 1…4 intentos totales y todos los intentos hechos posibles, `attempts_exhausted` sale EXACTAMENTE cuando se hicieron todos'),
    fallos.length === 0, fallos.join(', ') || '10 combinaciones');
  check(SEAM('CONTROL: copiar los intentos totales tal cual, sin restar uno, deja que el ÚLTIMO intento siga proponiendo reintentos en las 4 combinaciones en que se han agotado'),
    naive.length === 4, naive.join(', '));
  const t3 = traducir(TRABAJOS.proveedor_agotado, { esperarLoDeLaCapacidad: true });
  const t1 = traducir(TRABAJOS.politica_de_contenido, { esperarLoDeLaCapacidad: true });
  check(SEAM('el historial: el trabajo de tres intentos lleva DOS reintentos ya hechos —cada uno con la clase del fallo que lo provocó— y un tope de dos, con el código del último fallo y lo que el proveedor dijo de reintentar; el de un intento no lleva `previous`'),
    canon(t3.contexto.previous) === canon([{ kind: 'retry', failureClass: 'provider_failure', succeeded: false }, { kind: 'retry', failureClass: 'provider_failure', succeeded: false }])
    && t3.contexto.retry.maxAttempts === 2 && t3.contexto.metadata.errorCode === 'PROVIDER_ERROR' && t3.contexto.metadata.providerRetryable === true
    && t1.contexto.previous === undefined && t1.contexto.retry.maxAttempts === 2 && t1.contexto.metadata.errorCode === 'CONTENT_POLICY');
}
{
  const job = TRABAJOS.texto_ok;
  const medidas = [
    { key: 'result.latencyMs', subject: job.jobId, value: 120, source: 'measured', sampleSize: 1 },
    { key: 'result.latencyMs', subject: 'otro-resultado', value: 99_999, source: 'measured', sampleSize: 1 },
    { key: 'result.costUsd', subject: job.jobId, value: 0.2, source: 'measured', sampleSize: 1 },
    { key: 'result.quality', value: 0.01, source: 'measured' },
  ];
  const topes = { maxLatencyMs: 1000, budget: { maxUsd: 1 } };
  const t = traducir(job, { esperarLoDeLaCapacidad: true, medidas, constraints: topes });
  const lento = traducir(job, { esperarLoDeLaCapacidad: true, medidas: [{ ...medidas[0], value: 5000 }, medidas[2]], constraints: topes });
  const ajeno = traducir(job, { esperarLoDeLaCapacidad: true, medidas: [medidas[1], medidas[3]], constraints: topes });
  check(SEAM('(S2-C.1 · D3) solo lo medido DEL RESULTADO cruza la costura —`subject` igual al `id`—: la latencia de otro resultado y una `result.quality` sin sujeto se quedan fuera; con las dos medidas propias A6 aprueba los topes'),
    t.peticion.evidence.length === 2 && t.peticion.evidence.every((e) => e.signal.subject === job.jobId) && verificar(t.peticion).status === 'pass',
    `${t.peticion.evidence.length} señales`);
  check(SEAM('y los topes se aplican a lo medido: una latencia propia de 5 s sobre un tope de 1 s es `fail`; si lo único medido es de otro, el tope queda sin concluir (`unknown`) y el veredicto NO aprueba'),
    verificar(lento.peticion).status === 'fail' && verificar(ajeno.peticion).status === 'unknown' && verificar(ajeno.peticion).passed === false);
}
{
  const sucio = traducir(TRABAJOS.texto_ok, {
    expected: [{ kind: 'text', count: 1, requiredFields: ['titulo'], provider: 'gemini', model: 'm', metadata: { providerId: 'p' }, quality: { minScore: 0.5, onBelow: 'fail', model: 'z', implementation: 'x' } }],
    constraints: { maxLatencyMs: 10, provider: 'x', budget: { maxUsd: 1, providerId: 'y' }, quality: { minScore: 0.2, adapter: 'z' } },
    alternatives: ['a', '', 7], hasFallback: true,
  });
  const claves = clavesDe(sucio.peticion);
  check(SEAM('lista blanca, por defecto NEGADO: lo que se le cuele a la costura en `expected`, en los topes o en la calidad —`provider`, `model`, `metadata`, `providerId`, `implementation`, `adapter`— no cruza; sí pasa lo escrito (`kind`, `count`, `requiredFields`, `minScore`, `maxUsd`)'),
    ['provider', 'model', 'providerId', 'implementation', 'adapter'].every((k) => !claves.has(k)) && sucio.peticion.expected[0].metadata === undefined
    && sucio.peticion.expected[0].count === 1 && sucio.peticion.expected[0].quality.minScore === 0.5 && sucio.peticion.constraints.budget.maxUsd === 1
    && canon(sucio.contexto.alternatives) === canon(['a']) && A.violacionesEn(sucio.peticion, 'p').length === 0);
  const PERMITIDAS = new Set(Object.values(CLAVES_BLANCAS).flat());
  const fuera = Object.entries(TRABAJOS).flatMap(([nombre, job]) => {
    const t = traducir(job, { forzar: true, esperarLoDeLaCapacidad: true, hasFallback: true, alternatives: ['a'] });
    return [...clavesDe({ peticion: t.peticion, contexto: t.contexto })].filter((k) => !PERMITIDAS.has(k) && !['peticion', 'contexto'].includes(k)).map((k) => `${nombre}:${k}`);
  });
  check(SEAM('con todos los trabajos reales del fixture, y también forzando la traducción de los que se omiten, NINGUNA clave de la petición ni del contexto está fuera de la lista blanca, y A6 no ve ni `implementation`, ni `providerRef` ni `model`: pasan `violacionesEn` vacío'),
    fuera.length === 0 && Object.values(TRABAJOS).every((job) => {
      const t = traducir(job, { forzar: true, esperarLoDeLaCapacidad: true });
      const k = clavesDe({ p: t.peticion, c: t.contexto });
      return A.violacionesEn(t.peticion, 'p').length === 0 && A.violacionesEn(t.contexto, 'c').length === 0
        && !['implementation', 'providerRef', 'providerId', 'modelId', 'model', 'provider', 'providerKey'].some((x) => k.has(x));
    }), fuera.slice(0, 5).join(', ') || `${Object.keys(TRABAJOS).length} trabajos`);
  const t = traducir(TRABAJOS.proveedor_agotado, { esperarLoDeLaCapacidad: true });
  check(SEAM('lo que A6 sabe del proveedor son BOOLEANOS: si salió (`dispatched`) y si hay referencia (`hasProviderRef`), no la referencia; y el resultado y el contexto salen CONGELADOS, de modo que nadie puede cambiarlos entre la costura y A6'),
    t.peticion.actual.metadata.dispatched === true && t.peticion.actual.metadata.hasProviderRef === false
    && traducir(TRABAJOS.video_asincrono_ok, { esperarLoDeLaCapacidad: true }).peticion.actual.metadata.hasProviderRef === true
    && [t, t.peticion, t.peticion.actual, t.contexto, t.atadoA, t.hechos].every(Object.isFrozen));
}

/* ═══ F · LA TABLA DE EFECTOS Y LA PUERTA DE EJECUCIÓN ══════════════════════ */

console.log('\n─── F. La tabla de efectos y la puerta: no se regala, no se repite, no se replanifica una cancelación ───');

check(SEAM('la tabla de efectos es EXHAUSTIVA sobre las nueve recuperaciones de A6 —ni una más ni una menos— y cada fila dice su efecto, quién la ejecuta y qué puerta cruza. Solo `verify_again`, que es leer, no tiene efecto: todo lo demás gasta, cambia lo que se ve o es irreversible'),
  A.RECUPERACIONES.length === 9 && canon(Object.keys(EJECUCION).sort()) === canon([...A.RECUPERACIONES].sort())
  && Object.values(EJECUCION).every((e) => EFECTOS.includes(e.efecto) && PUERTAS.includes(e.puerta) && typeof e.ejecutor === 'string' && e.ejecutor.length > 0)
  && canon(Object.entries(EJECUCION).filter(([, e]) => e.efecto === 'ninguno').map(([k]) => k)) === canon(['verify_again']));

const libre = (job, maxAttempts = 3) => ({ ...job, policy: { ...job.policy, retry: { ...job.policy.retry, maxAttempts } } });
/* A6 llamado «a ciegas»: se salta las omisiones de la costura para ver qué propondría. Con respaldo y alternativas declarados, que es cuando más propone. */
const forzar = (nombre, job = TRABAJOS[nombre]) => {
  const t = traducir(job, { forzar: true, esperarLoDeLaCapacidad: true, hasFallback: true, alternatives: ['a', 'b'] });
  const analisis = rec.analizar(a6.verificar(t.peticion), t.contexto);
  const liq = decidirLiquidacion(job, ahoraDe(nombre));
  return { nombre, job, t, analisis, liq, gate: puertaDeEjecucion(analisis, t.hechos, liq) };
};
const VARIANTES = {
  bloqueo_con_intentos_libres: libre(TRABAJOS.bloqueo_de_seguridad),
  proveedor_con_intentos_libres: libre(TRABAJOS.proveedor_una_vez),
  timeout_con_intentos_libres: libre(TRABAJOS.timeout_conocido),
  plazo_sin_saber_con_intentos_libres: TRABAJOS.plazo_sin_saber,
};
const FORZADOS = [...Object.keys(TRABAJOS).map((n) => forzar(n)), ...Object.entries(VARIANTES).map(([n, j]) => forzar(n, j))];
{
  const tipos = new Set(FORZADOS.flatMap((f) => kinds(f.analisis)));
  check(SEAM(`todo lo que A6 llega a proponer en los ${FORZADOS.length} casos —los trabajos reales y cuatro con intentos libres, traducidos SIN omitir nada— tiene su fila en la tabla de efectos, y entre todos aparecen al menos seis recuperaciones distintas (la comprobación no es vacía)`),
    [...tipos].every((k) => k in EJECUCION) && tipos.size >= 6, [...tipos].sort().join(','));
  const pedidos = new Set(FORZADOS.flatMap((f) => f.gate.bloqueadas.map((b) => b.kind)));
  const sinFila = puertaDeEjecucion({ proposals: [{ kind: 'inventada' }, { kind: 'verify_again' }] }, {}, undefined);
  check(SEAM('CONTROL: una recuperación que la tabla no conoce se BLOQUEA por defecto —lo que no está escrito no se hace—, y la puerta sin análisis ni hechos no revienta ni deja pasar nada'),
    canon(sinFila.bloqueadas.map((b) => b.kind)) === canon(['inventada']) && /sin fila/.test(sinFila.bloqueadas[0].porque) && sinFila.permitidas.length === 1
    && puertaDeEjecucion(undefined, undefined, undefined).permitidas.length === 0 && pedidos.size >= 3, [...pedidos].sort().join(','));
}
{
  const SIN_DINERO = ['esperar', 'reconciliar', 'liquidar'];
  const peligrosas = FORZADOS.filter((f) => kinds(f.analisis).includes('abort') && SIN_DINERO.includes(f.liq.tipo));
  const regaladas = FORZADOS.filter((f) => f.gate.permitidas.some((p) => p.kind === 'abort') && !['reembolsar', 'nada'].includes(f.liq.tipo));
  const duplicados = FORZADOS.filter((f) => f.t.hechos.duplicado);
  check(SEAM('(1 · NO SE REGALAN RESPUESTAS) A6, llamado a ciegas, propone `abort` «con reembolso» en trabajos cuyo dinero NO se devuelve —en marcha, esperando, con el desenlace sin saber, ya cobrados (`completed` vacío)—: son los casos peligrosos, y NINGUNO se escapa por la puerta. `abort` solo pasa cuando `decidirLiquidacion` dice `reembolsar` o `nada`; y ante un duplicado no pasa nada de nada'),
    peligrosas.length >= 6 && regaladas.length === 0 && duplicados.length === 2 && duplicados.every((f) => f.gate.permitidas.length === 0 && f.analisis.proposals.length >= 1),
    `${peligrosas.length} peligrosas: ${peligrosas.map((f) => `${f.nombre}(${f.liq.tipo})`).join(' ')}`);
  const reembolsables = FORZADOS.filter((f) => ['reembolsar', 'nada'].includes(f.liq.tipo) && !f.t.hechos.duplicado && !f.t.hechos.cancelado && kinds(f.analisis).includes('abort'));
  check(SEAM('CONTROL: la puerta no estorba al que sí se devuelve: un fallo definitivo cuyo dinero vuelve (política de contenido, sin créditos, fallo sin error) SÍ deja pasar `abort`, con su puerta de confirmación'),
    reembolsables.length >= 3 && reembolsables.every((f) => f.gate.permitidas.some((p) => p.kind === 'abort' && p.puerta === 'confirma_la_persona')),
    reembolsables.map((f) => f.nombre).join(' '));
}
{
  const conRetry = FORZADOS.filter((f) => kinds(f.analisis).includes('retry'));
  const condiciones = (f) => {
    const h = f.t.hechos;
    return CORE.esReintentable(h.errorCode) && h.providerRetryable !== false && h.intentosHechos < h.intentosTotales
      && CORE.seguroReintentar(h.ultimoIntento ? { dispatched: h.ultimoIntento.dispatched, outcome: h.ultimoIntento.outcome } : undefined) && !h.duplicado && !h.cancelado;
  };
  const pasan = conRetry.filter((f) => f.gate.permitidas.some((p) => p.kind === 'retry'));
  const bloqueadas = conRetry.filter((f) => f.gate.bloqueadas.some((b) => b.kind === 'retry'));
  check(SEAM('(2 · NO SE REPITE LO INSEGURO) `retry` solo pasa la puerta si se cumplen LAS CUATRO condiciones del Job Engine —queda algún intento, el error lo admite, repetir no duplica lo ya hecho— MÁS que el proveedor no haya dicho que no (`providerRetryable`), y nunca tras un duplicado ni una cancelación. De los trabajos en que A6 propone `retry`, pasan exactamente los que las cumplen y se bloquean los demás'),
    conRetry.length >= 4 && pasan.length >= 2 && bloqueadas.length >= 2 && conRetry.every((f) => condiciones(f) === pasan.includes(f)),
    `propone retry en ${conRetry.length}: pasan ${pasan.map((f) => f.nombre).join(',')} · bloqueadas ${bloqueadas.map((f) => f.nombre).join(',')}`);
  const motivos = new Set(bloqueadas.flatMap((f) => f.gate.bloqueadas.filter((b) => b.kind === 'retry').map((b) => b.porque.replace(/\(.*$/, '').trim())));
  check(SEAM('y cada bloqueo dice POR QUÉ: el bloqueo de seguridad (`providerRetryable: false`) y el desenlace desconocido que repetir podría duplicar (un duplicado o una cancelación no llegan a proponer `retry`: A6 no lo propone tras un duplicado y la puerta lo bloquearía igual)'),
    motivos.size >= 2 && bloqueadas.some((f) => f.gate.bloqueadas.some((b) => /providerRetryable/.test(b.porque))) && bloqueadas.some((f) => f.gate.bloqueadas.some((b) => /no se sabe cómo acabó/.test(b.porque))),
    [...motivos].join(' | '));
}
{
  const canceladas = FORZADOS.filter((f) => f.t.hechos.cancelado);
  const replanes = FORZADOS.filter((f) => kinds(f.analisis).includes('replan'));
  check(SEAM('(3 · NO SE REPLANIFICA UNA CANCELACIÓN) las dos cancelaciones reales —en marcha y en cola—, saltándose la omisión y con respaldo y alternativas declarados, hacen que A6 proponga `replan`, `fallback` y `alternative_strategy`; la puerta no deja pasar NINGUNA de las tres ni ninguna otra. `replan` solo llega a la persona en los trabajos que no se pararon'),
    canceladas.length === 2 && canceladas.every((f) => ['replan', 'fallback', 'alternative_strategy'].every((k) => kinds(f.analisis).includes(k)) && f.gate.permitidas.length === 0)
    && replanes.some((f) => f.gate.permitidas.some((p) => p.kind === 'replan' && p.puerta === 'confirma_la_persona' && p.automatica === false)) && replanes.length > canceladas.length,
    `${canceladas.map((f) => `${f.nombre}: ${lista(f.analisis)}`).join(' | ')}`);
  const permitidas = FORZADOS.flatMap((f) => f.gate.permitidas);
  check(SEAM('(NADA ES AUTOMÁTICO CON EFECTO) en todos los casos lo único que la puerta marca como automático es `verify_again` —volver a leer—; gastar de nuevo, cambiar lo que se ve y abortar pasan siempre por la persona o por el dueño'),
    FORZADOS.every((f) => f.gate.automaticas.every((k) => k === 'verify_again'))
    && permitidas.filter((p) => p.efecto !== 'ninguno').every((p) => p.automatica === false && p.puerta !== undefined)
    && permitidas.every((p) => p.automatica === (p.efecto === 'ninguno')), `${permitidas.length} propuestas permitidas`);
}

{
  /* Lo único automático: volver a leer. Con un estado que A6 no conoce, propone mirar otra vez Y parar; la puerta deja lo primero y cierra lo segundo. */
  const ajeno = analizar({ expected: IMG, actual: res('r', { status: 'completed', outputs: imgs(1) }) });
  const hechos = { cancelado: false, duplicado: false };
  const alCobrar = puertaDeEjecucion(ajeno.r, hechos, decidirLiquidacion(TRABAJOS.texto_ok, AHORA));
  const alReconciliar = puertaDeEjecucion(ajeno.r, hechos, decidirLiquidacion(TRABAJOS.plazo_sin_saber, AHORA));
  check(SEAM('CONTROL de lo único automático: ante un estado que A6 no conoce propone `verify_again` y `abort`; con el dinero cobrado (`liquidar`) o por reconciliar (`reconciliar`) la puerta deja pasar SOLO `verify_again` —automático, sin efecto— y bloquea `abort` diciendo que contradice a `decidirLiquidacion`'),
    lista(ajeno.r) === 'verify_again,abort' && [alCobrar, alReconciliar].every((g) => canon(g.automaticas) === canon(['verify_again']) && canon(g.permitidas.map((p) => p.kind)) === canon(['verify_again'])
      && g.bloqueadas.length === 1 && g.bloqueadas[0].kind === 'abort' && /decidirLiquidacion/.test(g.bloqueadas[0].porque)));
}

{
  /* Defensa en profundidad: A6 ya no propone `retry` cuando el Job Engine no reintentaría, pero si A6 se equivocara la puerta lo para por su cuenta. Regla por regla, con un análisis hecho a mano. */
  const propone = (kind) => ({ proposals: [{ kind }] });
  const bloqueaRetry = (hechos) => puertaDeEjecucion(propone('retry'), hechos, undefined).bloqueadas.map((b) => b.porque).join('|');
  const base = { errorCode: 'TIMEOUT', intentosHechos: 1, intentosTotales: 3, ultimoIntento: { dispatched: true, outcome: 'timed_out' }, cancelado: false, duplicado: false };
  check(SEAM('la puerta, REGLA POR REGLA, sin pasar por A6: bloquea `retry` si el error no es de los que el Job Engine reintenta (`CONTENT_POLICY`), si no quedan intentos (3 de 3), si lo hecho pudo haberse hecho ya (salió y no se sabe cómo acabó) y si el proveedor dijo que no; y NO lo bloquea cuando las cuatro condiciones se cumplen'),
    /no reintenta CONTENT_POLICY/.test(bloqueaRetry({ ...base, errorCode: 'CONTENT_POLICY' }))
    && /no quedan intentos/.test(bloqueaRetry({ ...base, intentosHechos: 3 }))
    && /no se sabe cómo acabó/.test(bloqueaRetry({ ...base, ultimoIntento: { dispatched: true, outcome: 'unknown' } }))
    && /providerRetryable/.test(bloqueaRetry({ ...base, providerRetryable: false }))
    && bloqueaRetry(base) === '' && puertaDeEjecucion(propone('retry'), base, undefined).permitidas.length === 1);
  check(SEAM('y la de `abort`, regla por regla: se bloquea con el dinero en espera, por reconciliar o ya cobrado, y pasa cuando se devuelve (`reembolsar`) o no había nada (`nada`); y la de lo cancelado o duplicado bloquea cualquier recuperación'),
    ['esperar', 'reconciliar', 'liquidar'].every((tipo) => puertaDeEjecucion(propone('abort'), {}, { tipo }).bloqueadas.length === 1)
    && ['reembolsar', 'nada'].every((tipo) => puertaDeEjecucion(propone('abort'), {}, { tipo }).permitidas.length === 1)
    && A.RECUPERACIONES.every((k) => puertaDeEjecucion(propone(k), { cancelado: true }, undefined).permitidas.length === 0 && puertaDeEjecucion(propone(k), { duplicado: true }, undefined).permitidas.length === 0));
}

/* ═══ G · DETERMINISMO: DOCE CORRIDAS, ARRAYS BARAJADOS, ENTRADAS CONGELADAS ═ */

console.log('\n─── G. Determinismo: doce corridas, arrays barajados, entradas congeladas ───');

/* Todo lo que la costura y A6 dicen de cada trabajo, de las dos maneras (con omisiones y a ciegas). El dinero se pregunta SIEMPRE al trabajo original: `decidirLiquidacion` lee el último intento por su posición. */
const bateria = (trabajos, semilla) => {
  const salida = {};
  for (const [nombre, original] of Object.entries(trabajos)) {
    const job = semilla === undefined ? original : barajarProfundo(original, semilla);
    const liq = decidirLiquidacion(original, ahoraDe(nombre));
    const correr = (opciones) => {
      const t = traducir(job, { esperarLoDeLaCapacidad: true, hasFallback: true, alternatives: ['b', 'a'], ...opciones });
      if (t.omitido) return { omitido: t.omitido, porque: t.porque };
      const { v, r } = analizar(t.peticion, t.contexto);
      return { v, r, g: puertaDeEjecucion(r, t.hechos, liq), atadoA: t.atadoA, runId: t.runId, peticion: t.peticion, contexto: t.contexto };
    };
    salida[nombre] = { liq, normal: correr({}), forzado: correr({ forzar: true }) };
  }
  return salida;
};
{
  const huellas = Array.from({ length: 12 }, () => hashDe(canon(bateria(TRABAJOS))));
  check(FIJADO('(DOCE CORRIDAS) la batería entera —todos los trabajos × con y sin omisiones: traducción, veredicto, recuperación, puerta, atado y oráculo del dinero— da LA MISMA huella en doce corridas'),
    huellas.every((h) => h === huellas[0]), `huella ${huellas[0]}`);
  const dos = [construirTrabajos(), construirTrabajos()].map((t) => canon(t));
  check(FIJADO('y los trabajos mismos salen idénticos cada vez que el Job Engine los construye: mismos ids, mismas revisiones, mismos intentos (nada de reloj ni de azar en el fixture)'),
    dos[0] === dos[1] && dos[0] === canon(TRABAJOS));
  const base = canon(bateria(TRABAJOS));
  const distintas = Array.from({ length: 12 }, (_, i) => i + 1).filter((semilla) => canon(bateria(TRABAJOS, semilla)) !== base);
  check(SEAM('(ARRAYS BARAJADOS) con TODOS los arrays de cada trabajo barajados —intentos, referencias de salida, eventos vistos— en doce barajados distintos, la batería entera es la misma: la costura ordena por número de intento y canoniza las referencias'),
    distintas.length === 0, distintas.length ? `distintas: ${distintas.join(',')}` : '12 barajados idénticos');
}
{
  const RICA = {
    expected: [
      { kind: 'image', count: 3, requiredFields: ['b', 'a'] }, { kind: 'audio' }, { kind: 'text', required: false },
      { kind: 'doc', quality: { minScore: 0.5 } }, { kind: 'video', count: 1 },
    ],
    actual: res('r', {
      status: 'failed', error: { code: 'PROVIDER_ERROR' },
      outputs: [sal('image', 'x', { fields: ['a', 'b'] }), sal('image', 'y', { fields: ['b'] }), sal('audio', 'z'), sal('video', 'v1'), sal('video', 'v2')],
      failedSteps: ['s2', 's1', 's3'], completedSteps: ['s6', 's5', 's4'],
    }),
    checks: [{ id: 'k3', type: 'zz.gamma' }, { id: 'k2', type: 'zz.alfa' }, { id: 'k1', type: 'zz.beta', hard: true }],
  };
  const CTX_RICO = con('PROVIDER_ERROR', {
    alternatives: ['z', 'm', 'a'], hasFallback: true,
    previous: [{ kind: 'replan', failureClass: 'x' }, { kind: 'retry', failureClass: 'y' }, { kind: 'partial', failureClass: 'z', affectedSteps: ['p', 'q'] }],
  });
  const barajada = (semilla) => {
    const e = (x, i) => barajar(x, semilla + i);
    return {
      req: {
        expected: e(RICA.expected, 0).map((x, i) => (x.requiredFields ? { ...x, requiredFields: e(x.requiredFields, 10 + i) } : x)),
        actual: { ...RICA.actual, outputs: e(RICA.actual.outputs, 20).map((o, i) => (o.fields ? { ...o, fields: e(o.fields, 30 + i) } : o)),
          failedSteps: e(RICA.actual.failedSteps, 40), completedSteps: e(RICA.actual.completedSteps, 50) },
        checks: e(RICA.checks, 60),
      },
      ctx: { ...CTX_RICO, alternatives: e(CTX_RICO.alternatives, 70), previous: e(CTX_RICO.previous, 80).map((p, i) => (p.affectedSteps ? { ...p, affectedSteps: e(p.affectedSteps, 90 + i) } : p)) },
    };
  };
  const base = canon(analizar(RICA, CTX_RICO));
  const mal = Array.from({ length: 12 }, (_, i) => i + 1).filter((s) => { const { req, ctx } = barajada(s); return canon(analizar(req, ctx)) !== base; });
  check(FIJADO('(ARRAYS BARAJADOS, A6 solo) con una petición rica —cinco expectativas, cinco salidas, tres comprobaciones declaradas, pasos fallidos y hechos, campos exigidos— y un contexto con alternativas e historial, barajar CADA array en doce barajados distintos no cambia ni un byte del veredicto ni de la recuperación'),
    mal.length === 0 && analizar(RICA, CTX_RICO).v.status === 'fail', mal.join(',') || '12 barajados idénticos');
  const congelada = () => congelarProfundo(clonar({ req: RICA, ctx: CTX_RICO }));
  const antes = canon({ req: RICA, ctx: CTX_RICO });
  const { req, ctx } = congelada();
  const corrida = sinReventar(() => analizar(req, ctx));
  check(FIJADO('(ENTRADAS CONGELADAS) A6 no toca lo que se le da: con la petición y el contexto congelados hasta el fondo —cualquier escritura reventaría— da el mismo resultado, y los objetos de origen quedan intactos'),
    !corrida.lanzo && canon(corrida) === base && canon({ req: RICA, ctx: CTX_RICO }) === antes, corrida.lanzo ?? 'sin escrituras');
  const sucios = Object.entries(TRABAJOS).filter(([nombre, job]) => {
    const frio = congelarProfundo(clonar(job));
    const a = sinReventar(() => traducir(frio, { esperarLoDeLaCapacidad: true, forzar: true }));
    return a.lanzo || canon(a) !== canon(traducir(job, { esperarLoDeLaCapacidad: true, forzar: true }));
  }).map(([nombre]) => nombre);
  check(SEAM('y la costura tampoco escribe en lo que lee: los trabajos congelados hasta el fondo se traducen igual, y sin reventar'),
    sucios.length === 0, sucios.join(',') || `${Object.keys(TRABAJOS).length} trabajos congelados`);
  check(FIJADO('los resultados de A6 salen congelados: el veredicto, sus hallazgos, el análisis y sus propuestas no se pueden cambiar después de entregarlos'),
    (() => { const { v, r } = analizar(RICA, CTX_RICO); return Object.isFrozen(v) && Object.isFrozen(v.findings) && Object.isFrozen(r) && Object.isFrozen(r.proposals) && r.proposals.every(Object.isFrozen); })());
}
{
  /* EL ÚNICO ARRAY QUE NO ES INSENSIBLE: la evidencia. */
  const piezas = Array.from({ length: 9 }, (_, i) => {
    const s = { key: `quality.m${i}`, subject: 'r', value: 0.1 * (i + 1), source: ['measured', 'derived', 'model'][i % 3], sampleSize: 3 + i * 7 };
    return { claim: s.key, signal: s, supports: i % 2 === 0, weight: [0.3, 0.7, 1, 0.55, 0.15, 0.9, 0.42, 0.61, 0.99][i] };
  });
  const pideConEvidencia = (evidence) => ({ expected: IMG, actual: res('r', { outputs: imgs(1) }), evidence });
  const valores = new Set();
  const ordenes = new Set();
  for (let semilla = 1; semilla <= 300; semilla++) {
    const v = verificar(pideConEvidencia(barajar(piezas, semilla)));
    valores.add(v.confidence.value);
    ordenes.add(canon(v.evidence.map((e) => e.claim)));
  }
  check(B('G3', '(hallazgo NUEVO de esta suite) el veredicto de A6 NO es insensible al orden de la EVIDENCIA, a diferencia de todos los demás arrays: `confianzaDelVeredicto` suma en el orden en que llega y devuelve `evidence` y `confidence.basis` en ese mismo orden. Con nueve piezas, 300 barajados dan varios valores de `confidence.value` distintos en las últimas cifras decimales y cientos de órdenes de salida. La prueba 90 de `algorithm-verification` («barajar la evidencia tampoco») lo comprueba con UNA sola pieza, así que no puede verlo. Corregirlo —ordenar las piezas canónicamente antes de sumar— cambia la salida y exige subir el motor'),
    valores.size >= 2 && ordenes.size >= 100 && ordenes.size > valores.size, `${valores.size} valores de confianza · ${ordenes.size} órdenes de salida en 300 barajados`);
  const medidas = [
    { key: 'result.latencyMs', subject: 'x', value: 120, source: 'measured', sampleSize: 4, confidence: 0.35 },
    { key: 'result.costUsd', subject: 'x', value: 0.2, source: 'measured', sampleSize: 9, confidence: 0.9 },
    { key: 'result.tokens', subject: 'x', value: 900, source: 'derived', sampleSize: 30, confidence: 0.7 },
    { key: 'result.bytes', subject: 'x', value: 4096, source: 'model', sampleSize: 1, confidence: 0.1 },
    { key: 'result.frames', subject: 'x', value: 24, source: 'default', confidence: 0.2 },
    { key: 'result.quality', subject: 'x', value: 0.8, source: 'declared', sampleSize: 12, confidence: 0.55 },
  ].map((s) => ({ ...s, subject: TRABAJOS.texto_ok.jobId }));
  const salidas = new Set();
  for (let semilla = 1; semilla <= 60; semilla++) {
    const t = traducir(TRABAJOS.texto_ok, { esperarLoDeLaCapacidad: true, medidas: barajar(medidas, semilla) });
    salidas.add(canon({ t, v: verificar(t.peticion) }));
  }
  check(SEAM('la costura lo compensa: ordena las medidas de forma canónica antes de dárselas a A6, y con seis medidas barajadas en 60 órdenes distintos la petición, el veredicto y la confianza son UNO'),
    salidas.size === 1, `${salidas.size} salida(s) distinta(s)`);
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA6 en sus fronteras: se sabe lo que dice, lo que calla y lo que habría que decidir');
process.exit(failures ? 1 : 0);
