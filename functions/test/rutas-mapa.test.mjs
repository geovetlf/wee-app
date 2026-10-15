/*
 * FRENTE E · EL MAPA DE RUTAS DE IA, VIGILADO SOBRE LO COMPILADO (functions/lib).
 *
 * Cada callable o trigger que llega a la IA tiene un orden que protege el dinero y
 * la seguridad: autenticación → cupo → reserva de Credits → router/adaptador →
 * liquidación o reembolso. Esta suite lee el JS COMPILADO —lo que se despliega— y
 * falla si alguien quita un paso o lo pone detrás del que protege. El mapa completo
 * con archivo:línea está en el registro del Frente E
 * (wee-trabajo/ronda-r9/LANZAMIENTO/estado-lineas.md).
 *
 * Los DEFECTOS CONOCIDOS se informan sin parar la cadena:
 *   M1 creatorRun, brainChat y generateVideo no miran `iaDetenida` antes de reservar
 *      (cupo + reserva + devolución); solo el avatar y generateWorld lo miran antes.
 *   M2 creatorChat llama a la IA (planificador, `text.structure`) sin cupo por persona.
 *   M3 el avatar llama a Gemini fuera del motor: sin router, sin libro aiGenerations,
 *      sin cupo, sin elegibilidad/jurisdicción ni tope diario.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../lib', p), 'utf8');

let failures = 0;
const conocidos = [];
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const conocido = (id, name, reproduce, extra = '') => {
  console.log((reproduce ? '✘ (conocido ' + id + ') ' : '✔ (¿corregido? ' + id + ') ') + name + (extra ? ' — ' + extra : ''));
  conocidos.push({ id, reproduce });
};

/** El cuerpo de `exports.<nombre> = …` hasta la siguiente asignación de primer nivel. */
const tramo = (fuente, inicio) => {
  const i = fuente.indexOf(inicio);
  if (i < 0) return '';
  const resto = fuente.slice(i + inicio.length);
  const fin = resto.search(/\n(?:exports\.\w+ = |const \w+ = |async function |function )/);
  return inicio + (fin < 0 ? resto : resto.slice(0, fin));
};
const pos = (texto, re) => { const m = texto.match(re); return m ? m.index : -1; };
/** Todos presentes y en este orden. */
const enOrden = (texto, res) => {
  const p = res.map((re) => pos(texto, re));
  return { ok: p.every((x) => x >= 0) && p.every((x, i) => i === 0 || x > p[i - 1]), p };
};

const creator = leer('creator/index.js');
const brain = leer('creator/brain.js');
const video = leer('creator/video.js');
const mundo = leer('creator/mundo.js');
const avatar = leer('generateAvatar.js');
const evals = leer('evals/index.js');
const admin = leer('engine/admin.js');
const canary = leer('media/canary.js');
const webhooks = leer('engine/webhooks.js');
const router = leer('engine/router.js');
const gateway = leer('gateway/index.js');
const indice = leer('index.js');

/* ── creatorRun ─────────────────────────────────────────────────────────── */
{
  const t = tramo(creator, 'exports.creatorRun = (0, ');
  const o = enOrden(t, [/if \(!request\.auth\)/, /job\.userId !== uid/, /reclamarTrabajo\)?\(/, /limiter\.reserve\(/, /holdCredits\)\(/, /(videoEngine\.generate|runCapability\)\()/]);
  check('1) creatorRun: auth → dueño → reclamo → cupo → reserva → motor, en ese orden', o.ok, o.p.join(','));
  check('2) creatorRun: si falla tras reservar, reembolso íntegro (settleCredits con 0) en el catch — desde la Línea B, tras cerrar el trabajo como transición; si no se pudo cerrar, lo cierra el barrido', /catch \(error\) \{[\s\S]{0,2500}?(?:if \(cerrado\) )?await \(0, credits_1\.settleCredits\)\(uid, jobId, job\.creditsEstimated, 0,/.test(t));
  check('3) creatorRun: cada paso lleva la transacción de Credits y un requestId jobId:stepId', /creditTransactionId: \(0, creditTransactions_1\.usageTransactionId\)\(jobId\)/.test(t) && /requestId: `\$\{jobId\}:\$\{next\.id\}`/.test(t));
  conocido('M1a', 'creatorRun no mira iaDetenida antes de cupo+reserva (creator/index.ts:610-613)', !/iaDetenida/.test(t));
}

/* ── creatorChat / creatorQuote ─────────────────────────────────────────── */
{
  const t = tramo(creator, 'exports.creatorChat = (0, ');
  const o = enOrden(t, [/if \(!request\.auth\)/, /getPlanner\)\(\)\.next\(/]);
  check('4) creatorChat: auth antes de llamar al planificador (que usa la IA)', o.ok, o.p.join(','));
  conocido('M2', 'creatorChat llama al planificador con IA (text.structure, creator/planner.ts:175) sin limiter por persona', !/limiter\./.test(t));
  const q = tramo(creator, 'exports.creatorQuote = (0, ');
  check('5) creatorQuote: auth y no llama a la IA ni cobra', /if \(!request\.auth\)/.test(q) && !/engine\.generate|runCapability\)\(|spendCredits|holdCredits/.test(q));
}

/* ── brainChat / brainQuote ─────────────────────────────────────────────── */
{
  const t = tramo(brain, 'exports.brainChat = (0, ');
  const o = enOrden(t, [/if \(!request\.auth\)/, /limiter\.reserve\(/, /creditEngine\.spendCredits\(/, /engine_1\.engine\.generate\(/]);
  check('6) brainChat: auth → cupo → (búsqueda) reserva → motor', o.ok, o.p.join(','));
  check('7) brainChat: Brain pide DeepSeek por su nombre (sin respaldo silencioso) salvo la búsqueda web', /webSearch \? null : \{ prefs: \{ modelId: exports\.MODELO_DE_BRAIN, allowedProviders: \['deepseek'\] \} \}/.test(t));
  check('8) brainChat: hay reembolso si no se entregó y liquidación del libro', /creditEngine\.refundCredits\(/.test(t) && /creditEngine\.completeCredits\(/.test(t));
  check('9) brainChat: la puerta del conductor se decide en el servidor (decidirRuntime) antes del conductor', enOrden(t, [/decidirRuntime\)?\(/, /conductorDeWee\)\(/]).ok);
  conocido('M1b', 'brainChat no mira iaDetenida antes de cupo/reserva (creator/brain.ts:347, :401)', !/iaDetenida/.test(t));
  const q = tramo(brain, 'exports.brainQuote = (0, ');
  check('10) brainQuote: auth y sin IA ni cobro', /if \(!request\.auth\)/.test(q) && !/engine\.generate|spendCredits\(/.test(q));
}

/* ── generateVideo ──────────────────────────────────────────────────────── */
{
  const t = tramo(video, 'exports.generateVideo = (0, ');
  const o = enOrden(t, [/if \(!request\.auth\)/, /limiter\.reserve\(/, /creditEngine\.spendCredits\(/, /videoEngine\.generate\(/]);
  check('11) generateVideo: auth → cupo → reserva → Video Engine, y un reembolso DESPUÉS del Video Engine (fallo legacy)', o.ok && t.lastIndexOf('creditEngine.refundCredits(') > t.indexOf('videoEngine.generate('), o.p.join(','));
  check('12) generateVideo: el camino legacy fija la familia Seedance (allowedProviders) en el Video Engine', /exports\.VIDEO_PROVIDERS = \['seedance'\];/.test(leer('engine/video.js')) && /allowedProviders: \[\.\.\.exports\.VIDEO_PROVIDERS\]/.test(leer('engine/video.js')));
  conocido('M1c', 'generateVideo no mira iaDetenida antes de cupo/reserva (creator/video.ts:479-483)', !/iaDetenida/.test(t));
}

/* ── generateWorld ──────────────────────────────────────────────────────── */
{
  const t = tramo(mundo, 'exports.generateWorld = (0, ');
  const o = enOrden(t, [/if \(!request\.auth\)/, /prepararElMundo\(uid, data\.peticion\)/, /limiter\.comprobar\(/, /creditEngine\.spendCredits\(/]);
  check('13) generateWorld: auth → preparar (puerta + engine.route: elegibilidad e iaDetenida ANTES de cobrar) → cupo → reserva', o.ok, o.p.join(','));
  const prep = tramo(mundo, 'const prepararElMundo = ');
  check('14) …y preparar exige el conductor y candidatos (sin core o sin candidato → no disponible)', /puerta\.runtime !== 'core'/.test(prep) && /engine_1\.engine\.route\(/.test(prep) && /!decision\.candidates\.length/.test(prep));
}

/* ── Avatar ─────────────────────────────────────────────────────────────── */
{
  const w = tramo(avatar, 'async function withCredits(');
  const o = enOrden(w, [/settings\.iaDetenida === true/, /creditEngine\.spendCredits\(/, /creditEngine\.completeCredits\(/]);
  check('15) avatar: iaDetenida ANTES de cobrar, después reserva y liquidación', o.ok, o.p.join(','));
  check('16) avatar: los dos callables exigen auth antes de withCredits', ['exports.generateAvatarWithGemini = (0, ', 'exports.avatarReplacement = (0, '].every((n) => enOrden(tramo(avatar, n), [/if \(!request\.auth\)/, /withCredits\(/]).ok));
  const vertex = leer('vertexAI.js');
  conocido('M3', 'avatar fuera del motor: SDK de Gemini directo (vertexAI.ts:47-48) sin libro aiGenerations, sin cupo, sin jurisdicción ni tope diario',
    /GoogleGenAI/.test(vertex) && !/aiGenerations|ledger|limiter/.test(avatar + vertex));
}

/* ── Administración, evals, medios, webhooks, barrido ───────────────────── */
{
  const e = tramo(evals, 'const ejecutarEvalRun = ');
  check('17) evalRun: assertAdmin es lo primero, antes de leer el presupuesto o llamar al motor', enOrden(e, [/assertAdmin\)\(auth\)/, /leerPresupuesto\(\)/]).ok && /exports\.evalRun = [\s\S]{0,300}ejecutarEvalRun/.test(evals));
  check('18) evalRun: sus generaciones van al motor marcadas como eval (no se cobran a nadie, contabilidad aparte)', /attribution: 'eval'/.test(leer('evals/dominios/router.js')) && /engine_1\.engine\.generate\(/.test(leer('evals/dominios/router.js')));
  const a = tramo(admin, 'exports.engineAdmin = (0, ');
  check('19) engineAdmin: assertAdmin primero y sin ninguna llamada a la IA', /^exports\.engineAdmin = [\s\S]{0,250}assertAdmin\)\(request\.auth\)/.test(a) && !/engine\.generate|runCapability|\.run\(\{/.test(a));
  const c = tramo(canary, 'exports.mediaCanary = (0, ');
  check('20) mediaCanary: assertAdmin primero y sin IA', /^exports\.mediaCanary = [\s\S]{0,250}assertAdmin\)\(request\.auth\)/.test(c) && !/engine\.generate|runCapability/.test(c));
  const s = tramo(webhooks, 'exports.seedanceCallback = (0, ');
  check('21) seedanceCallback: el testigo se comprueba ANTES de escribir nada', enOrden(s, [/mismoTestigo\)\(request\.query\.token/, /\.set\(|\.add\(|\.update\(/]).ok);
  check('22) avisoDeProveedor NO se exporta (no está desplegado)', !/avisoDeProveedor/.test(indice.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
}

/* ── El router vivo y la capa de compatibilidad ─────────────────────────── */
{
  const route = tramo(router, 'function createRouter(');
  check('23) router: iaDetenida corta antes de mirar la cadena (ni candidatos ni demo)', enOrden(route, [/settings\.iaDetenida === true/, /realProviderAvailable = /, /links\.forEach\(/]).ok);
  check('24) router: el tope de gasto diario corta antes de mirar la cadena', enOrden(route, [/usdToday\)\(usage\) >= tope/, /links\.forEach\(/]).ok);
  check('25) router: sin candidatos se rechaza ANTES de abrir el libro (nadie paga ni se apunta nada)', enOrden(route, [/await route\(request, config\)/, /if \(!decision\.candidates\.length\)/, /deps\.ledger\.open\(/]).ok);
  check('26) router: cada intento abre su fila del libro antes de llamar al adaptador y la cierra en éxito y en fallo',
    enOrden(route, [/deps\.ledger\.open\(/, /adapter\.run\(/, /status: 'COMPLETED'/, /status: 'FAILED'/]).ok);
  check('27) router: el demo solo entra si NO hay proveedor real configurado', /const mockAllowed = !realProviderAvailable/.test(route) && /settings\.allowMockFallback && [^;]*mockAllowed/.test(route));
  check('28) runCapability (gateway/index) solo traduce a engine.generate: no hay otra ruta al proveedor', /engine_1\.engine\.generate\(/.test(gateway) && !/ADAPTERS|\.run\(\{/.test(gateway));
}

const vivos = conocidos.filter((k) => k.reproduce).map((k) => k.id);
const corregidos = conocidos.filter((k) => !k.reproduce).map((k) => k.id);
if (corregidos.length) console.log(`\nℹ defectos conocidos que YA NO se reproducen: ${corregidos.join(', ')} — actualiza esta suite y el registro del Frente E`);
console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ todo bien (defectos conocidos vigentes: ${vivos.join(', ') || 'ninguno'})`);
process.exit(failures ? 1 : 0);
