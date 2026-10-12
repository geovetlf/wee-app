/*
 * WEË AI EVALUATION ENGINE — EL DOMINIO `design` (CL-17, F0 de docs/DESIGN.md §5). docs/EVALS.md «Dominio design».
 *
 * El segundo dominio del Eval Engine mide, a $0 y sin proveedor, lo que la experiencia `design` del servidor hace con lo que
 * una persona le cuenta: qué deduce, qué pregunta, qué plan arma y cuánto costaría. Se fija:
 *   A. entra por el registro común, sin tocar el motor, y no trae motor propio;
 *   B. su dataset valida, cubre las siete intenciones, los tres idiomas, los límites y los huecos, con cada caso etiquetado, y su
 *      baseline es de ESTE dataset (mismo hash), coherente consigo misma y con los rojos de HOY fijados a propósito;
 *   C. corre a $0, determinista (12 corridas iguales) y sin reloj, azar ni red (por lectura del fuente y con trampas puestas);
 *   D. cada grader acierta y falla donde debe;
 *   E. mide lo que mide: sus resultados coinciden con un cálculo directo e independiente sobre la plantilla;
 *   F. GATE: el servidor vivo no regresa frente a la baseline (NO_CHANGE o ACCEPT, nunca REJECT);
 *   G. SABOTAJES: quitar una opción, subir el techo de propuestas, quitar un `!a.<id>`, mover el precio bajo el coste… lo ven;
 *   H. los arreglos de H-2 y H-6, SIMULADOS en memoria, dan ACCEPT sin que ningún caso empeore y dejando en rojo los conocidos;
 *   I. las puertas de siempre y la cadena.
 *
 * Los casos conocidos (D4, D5, D6) salen en rojo a propósito: dicen lo que hoy falta y cuyo arreglo es del dueño. No son criterio
 * de aceptación de nada: el veredicto solo mira si algo EMPEORA o MEJORA frente a la baseline.
 *
 * Usa el compilado: `npm run build` antes de `npm test`. $0, sin red, sin proveedor.
 */
import fs from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(RAIZ, 'ops/evals');
const imp = async (f) => import(pathToFileURL(path.join(dir, f)).href);
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
let failures = 0;
let n = 0;
const check = (name, cond, detail = '') => {
  n += 1;
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const falla = async (f) => { try { await f(); return null; } catch (e) { return e.message; } };

const { DOMINIOS, resolverDominio, validarDominio, crearRegistroDeDominios } = await imp('dominios.mjs');
const { dominioDesign, crearDominioDesign, cargarLib, GRADERS, DIMENSION_DE_GRADER_DESIGN, CLAVES_ESPERADAS } = await imp('dominios/design.mjs');
const { ejecutarDataset } = await imp('runner.mjs');
const { comparar } = await imp('comparar.mjs');
const { validarDataset, hashCanonico } = await imp('contrato.mjs');

const CONFIG = JSON.parse(leer('ops/evals/config.json'));
const DATASET = JSON.parse(leer('ops/evals/datasets/design/v1.json'));
const BASELINE = JSON.parse(leer('ops/evals/baseline/design.json'));
const FUENTE = leer('ops/evals/dominios/design.mjs');
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const REGISTRO_DESIGN = crearRegistroDeDominios([dominioDesign]);
const correr = (dataset = DATASET, dominios = REGISTRO_DESIGN) => ejecutarDataset(dataset, CONFIG, { dominios });
const lib = cargarLib();
const plantilla = () => lib.TEMPLATES.design;
const casoDe = (id) => DATASET.casos.find((c) => c.evalCaseId === id);
const detalleDe = (run, id) => run.detalle.find((d) => d.evalCaseId === id);
const rojos = (run) => run.detalle.filter((d) => d.graders.some((g) => !g.ok)).map((d) => d.evalCaseId);
const fallosDe = (run) => run.detalle.flatMap((d) => d.graders.filter((g) => !g.ok).map((g) => `${d.evalCaseId}:${g.id}`));

/*
 * LOS ROJOS DE LA BASELINE, FIJADOS A PROPÓSITO. La baseline es del comportamiento de HOY (a64ff24): los huecos H-2 y H-6 medidos
 * y los cuatro casos conocidos de D4, D5 y D6. Cuando la rama del servidor arregle H-2/H-6 y alguien REFRESQUE la baseline (ver
 * docs/EVALS.md), esta lista se actualiza en el mismo cambio: un refresco no puede esconder, sin que alguien lo lea, que un caso
 * pasó de verde a rojo o que desapareció uno que no se arregló.
 */
const ROJOS_DE_LA_BASELINE = [
  'design-h6-post-para-mi-marca', 'design-h6-publicidad-para-mi-marca', 'design-h6-flyer-para-la-marca',
  'design-h2-what', 'design-h2-message', 'design-h2-item', 'design-h2-machine', 'design-h2-place', 'design-h2-who',
  'design-h2-respuesta-idk-en-what', 'design-h2-respuesta-idk-en-message', 'design-h2-respuesta-idk-en-place',
  'design-d5-historia-vertical', 'design-d4-afiche-con-texto', 'design-d6-referencia-afiche', 'design-d6-referencia-producto',
];

/** Cambia la plantilla de `design` EN SITIO (es la que lee el planificador de producción) y la deja como estaba pase lo que pase. */
const conPlantilla = async (cambiar, hacer) => {
  const t = plantilla();
  const original = { questions: t.questions, infer: t.infer, buildPlan: t.buildPlan };
  try { cambiar(t); return await hacer(); } finally { Object.assign(t, original); }
};
const IDK = { id: 'idk', label: '🤷 No sé' };
const sinNoSe = (t) => t.questions.filter((q) => q.options.length > 0 && !q.options.some((o) => o.id === 'idk')).map((q) => q.id);
const alPlan = (t, cambia) => { const original = t.buildPlan; t.buildPlan = (goal, answers) => cambia(original(goal, answers)); };

/* ── A. Entra por el registro, sin tocar el motor ────────────────────────────────────────────────────────────── */
console.log('\n── A · el dominio entra por el registro ──');
check('A1 design es el segundo dominio registrado: cumple el contrato, el registro está congelado y el Router sigue ahí',
  Object.keys(DOMINIOS).join() === 'router,design' && DOMINIOS.design.id === 'design' && validarDominio(dominioDesign).length === 0
  && Object.isFrozen(DOMINIOS) && Object.isFrozen(DOMINIOS.design) && resolverDominio(DOMINIOS, 'router').id === 'router', Object.keys(DOMINIOS).join());
check('A2 el adaptador trae solo lo que el contrato pide y NO declara superficie: el corredor lo evalúa y Hillclimb no lo optimiza (no hay nada que aplicar)',
  Object.keys(dominioDesign).sort().join() === 'calificar,claveDeCaso,decidir,descripcion,id,validarCaso' && !('superficie' in dominioDesign) && !('aplicarCandidato' in dominioDesign));
const m1 = await falla(() => resolverDominio(DOMINIOS, 'inexistente'));
check('A3 un dominio sin registrar sigue fallando cerrado, y ahora dice cuáles hay', m1 === 'dominio desconocido: "inexistente" (registrados: design, router)', m1);
const sinMotor = !/from '\.\.\/(runner|gobernanza|scoring|comparar|holdout|presupuesto|permisos|evalRun|motor)\.mjs'/.test(FUENTE)
  && !/for \(const caso of /.test(FUENTE) && !/escenario-router|graders\.mjs/.test(FUENTE)
  && !/export const (recorrerCasos|puntuar|comparar|ejecutarDataset|correrEvalGobernada|decidirYCalificar|crearRegistroDeDominios) =/.test(FUENTE);
check('A4 el adaptador no trae motor: ni corredor, ni puntuación, ni comparación, ni bucle de casos, ni el escenario del Router', sinMotor);
const sinPoderes = !/child_process|\bfetch\(|https?:\/\/|firebase|git push|gh pr|deploy/.test(FUENTE);
check('A5 sin poderes: ni procesos, ni red, ni despliegue (la misma comprobación que evals-dominios hace sobre todo ops/evals)', sinPoderes);

/* ── B. El dataset y su baseline ─────────────────────────────────────────────────────────────────────────────── */
console.log('\n── B · el dataset y la baseline ──');
const errores = validarDataset(DATASET, { validarCaso: dominioDesign.validarCaso });
check('B1 el dataset valida con el contrato común y la forma de caso de Design: es de `design`, tiene 30 casos o más y todos los ids son suyos',
  errores.length === 0 && DATASET.dominio === 'design' && DATASET.casos.length >= 30 && DATASET.casos.every((c) => c.evalCaseId.startsWith('design-')), errores.join('; '));
const malos = [
  [{ evalCaseId: 'x', goal: 'a', expected: { sinRepreguntra: true } }, /no es de este dominio/],
  [{ evalCaseId: 'x', goal: 'a', expected: { sinRepreguntar: 'sí' } }, /solo true/],
  [{ evalCaseId: 'x', goal: 'a', expected: { noSe: [] } }, /una lista de ids/],
  [{ evalCaseId: 'x', goal: 'a', expected: { propuestas: 0 } }, /entero positivo/],
  [{ evalCaseId: 'x', goal: 'a', conocido: true, expected: { aspectRatio: '9:16' } }, /de qué decisión/],
  [{ evalCaseId: 'x', goal: 'a', decision: 'D5', expected: { aspectRatio: '9:16' } }, /solo la lleva un caso conocido/],
  [{ evalCaseId: 'x', goal: 'a', decision: 'D1', conocido: true, expected: { aspectRatio: '9:16' } }, /decision, una de/],
  [{ evalCaseId: 'x', goal: 'a', expected: { usaReferencia: true } }, /exige referencia: true/],
  [{ evalCaseId: 'x', goal: 3, expected: { sinRepreguntar: true } }, /goal, un texto/],
  [{ evalCaseId: 'x', goal: 'a', presets: { what: '' }, expected: { sinRepreguntar: true } }, /presets/],
  [{ evalCaseId: 'x', goal: 'a', inventado: 1, expected: { sinRepreguntar: true } }, /campo desconocido/],
];
const mal = malos.filter(([caso, re]) => !dominioDesign.validarCaso(caso).some((e) => re.test(e))).map(([, re]) => String(re));
check('B2 la forma de un caso se vigila: una clave de `expected` mal escrita no desactiva un grader en silencio, y las etiquetas se validan (11 formas)', mal.length === 0, mal.join(', '));
const run = await correr();
const queras = (c, d) => (c.presets && c.presets.what) || d.decision.inferido.what || (c.respuestas && c.respuestas.what) || null;
const intenciones = new Set(DATASET.casos.map((c) => queras(c, detalleDe(run, c.evalCaseId))).filter(Boolean));
check('B3 cubre las siete intenciones: los seis caminos y «No sé qué diseñar» (sin camino previo, con la pregunta de por dónde empezar)',
  ['logo', 'poster', 'product', 'object', 'scene', 'character'].every((w) => intenciones.has(w))
  && DATASET.casos.some((c) => !c.presets && c.respuestas && c.respuestas.what && detalleDe(run, c.evalCaseId).decision.preguntas[0]?.id === 'what'), [...intenciones].join());
const conTag = (t) => DATASET.casos.filter((c) => (c.tags || []).includes(t)).length;
check('B4 cubre los tres idiomas del servidor (es, en, da), los casos límite y los controles',
  conTag('es') >= 10 && conTag('en') >= 3 && conTag('da') >= 3 && conTag('limite') >= 5 && conTag('control') >= 5, `es ${conTag('es')} · en ${conTag('en')} · da ${conTag('da')} · límite ${conTag('limite')} · control ${conTag('control')}`);
const h2 = DATASET.casos.filter((c) => c.hueco === 'H-2' && c.expected.noSe);
const h6 = DATASET.casos.filter((c) => c.hueco === 'H-6');
const conocidos = DATASET.casos.filter((c) => c.conocido === true);
check('B5 los huecos de hoy están etiquetados: H-2 (una pregunta por cada una de las seis), H-6, y los conocidos de D4, D5 y D6 con la decisión de la que dependen',
  h2.length === 6 && new Set(h2.flatMap((c) => c.expected.noSe)).size === 6 && h6.length >= 1 && h6.some((c) => c.cierre === 'CL-11')
  && ['D4', 'D5', 'D6'].every((d) => conocidos.some((c) => c.decision === d)) && conocidos.every((c) => /^CL-\d\d$/.test(c.cierre)),
  `H-2 ${h2.length} · H-6 ${h6.length} · conocidos ${conocidos.map((c) => c.decision).join()}`);
check('B6 el dataset no decide por el dueño: ni una palabra de decisión tomada, y los conocidos solo dicen de qué decisión dependen', !/DECIDID/i.test(JSON.stringify(DATASET)) && conocidos.every((c) => ['D4', 'D5', 'D6'].includes(c.decision)));
const textoDelDataset = JSON.stringify(DATASET);
const claveDeMentira = new RegExp([['s', 'k'].join(''), '[A-Za-z0-9]{10,}'].join('-'));
check('B7 sin datos sensibles: ni correos, ni claves, ni nombres de proveedores ni de modelos reales',
  !/@/.test(textoDelDataset) && !claveDeMentira.test(textoDelDataset) && !/AIza|hidi_/.test(textoDelDataset)
  && !/\b(gemini|flux|seedream|seedance|elevenlabs|deepseek|openai|anthropic|nano banana)\b/i.test(textoDelDataset));
check('B8 la baseline es de ESTE dataset (mismo hash canónico) y vive con las del Eval Engine',
  hashCanonico(DATASET.casos) === BASELINE.datasetHash && run.datasetHash === BASELINE.datasetHash && BASELINE.dominio === 'design' && BASELINE.datasetVersion === DATASET.version
  && fs.existsSync(path.join(dir, 'baseline/design.json')), `dataset ${hashCanonico(DATASET.casos).slice(0, 12)} · baseline ${BASELINE.datasetHash.slice(0, 12)}`);
const redondear = (x) => Math.round(x * 1e6) / 1e6;
const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const porCaso = BASELINE.scores.porCaso;
const dimensionDe = (dim) => { const v = porCaso.map((c) => c.dims[dim]).filter((x) => x !== undefined && x !== null); return v.length ? redondear(media(v)) : null; };
check('B9 la baseline es coherente consigo misma —nadie tocó sus números a mano—: sus casos son los del dataset, en orden, y su overall, sus dimensiones y sus aprobados salen de ellos',
  porCaso.map((c) => c.evalCaseId).join() === DATASET.casos.map((c) => c.evalCaseId).join() && BASELINE.scores.n === DATASET.casos.length
  && BASELINE.scores.overall === redondear(media(porCaso.map((c) => c.score))) && BASELINE.scores.aprobados === porCaso.filter((c) => c.aprobado).length
  && ['QUALITY', 'COST', 'LATENCY', 'RELIABILITY'].every((d) => BASELINE.scores.perDimension[d] === dimensionDe(d)));
const rojosDeLaBaseline = porCaso.filter((c) => !c.aprobado).map((c) => c.evalCaseId);
check('B10 los rojos de la baseline son los de HOY, fijados a propósito: H-2, H-6 y los cuatro casos conocidos (si se refresca la baseline, esta lista se actualiza en el mismo cambio)',
  JSON.stringify([...rojosDeLaBaseline].sort()) === JSON.stringify([...ROJOS_DE_LA_BASELINE].sort()), `baseline: ${rojosDeLaBaseline.join()}`);
const sinEtiqueta = rojosDeLaBaseline.filter((id) => { const c = casoDe(id); return !(c.hueco || c.conocido); });
check('B11 nada en rojo sin explicar: cada caso rojo de la baseline es un hueco (H-n) o un caso conocido (decisión del dueño)', sinEtiqueta.length === 0, sinEtiqueta.join());

/* ── C. $0, determinista, sin reloj ni azar ni red ───────────────────────────────────────────────────────────── */
console.log('\n── C · $0, determinista, sin reloj ni azar ni red ──');
check('C1 coste $0: ninguna ejecución de adaptador en todo el dataset y todos los casos se evalúan', run.ejecuciones === 0 && run.scores.n === DATASET.casos.length && run.detalle.length === DATASET.casos.length, `${run.ejecuciones}`);
const sinGrader = run.detalle.filter((d) => d.graders.length === 0).map((d) => d.evalCaseId);
const noActivados = DATASET.casos.filter((c) => Object.keys(c.expected).some((k) => !detalleDe(run, c.evalCaseId).graders.some((g) => g.id === CLAVES_ESPERADAS[k]))).map((c) => c.evalCaseId);
check('C2 cada caso da al menos un grader y cada `expected.*` activa el suyo, con una dimensión válida del motor',
  sinGrader.length === 0 && noActivados.length === 0 && run.detalle.every((d) => d.graders.every((g) => ['QUALITY', 'COST', 'LATENCY', 'RELIABILITY'].includes(g.dimension) && g.dimension === DIMENSION_DE_GRADER_DESIGN[g.id])), `${sinGrader.join()} ${noActivados.join()}`);
check('C3 todos los graders declaran su dimensión y cada uno tiene su clave en `expected`',
  GRADERS.every((g) => g in DIMENSION_DE_GRADER_DESIGN && Object.values(CLAVES_ESPERADAS).includes(g)) && Object.values(CLAVES_ESPERADAS).every((g) => GRADERS.includes(g)));
const huella = (r) => hashCanonico({ scores: r.scores, detalle: r.detalle, datasetHash: r.datasetHash });
const corridas = [];
for (let i = 0; i < 12; i++) corridas.push(huella(await correr()));
check('C4 determinista: doce corridas dan exactamente lo mismo (puntuaciones, graders y decisiones)', new Set(corridas).size === 1 && corridas[0] === huella(run), [...new Set(corridas)].length + ' huellas');
const codigo = sinComentarios(FUENTE);
check('C5 sin reloj, sin azar y sin red por lectura del fuente: ni Date, ni Math.random, ni process.env, ni sockets, ni procesos, ni temporizadores',
  !/\bDate\b|Math\.random|randomUUID|performance\.|process\.env|setTimeout|setInterval|XMLHttpRequest|WebSocket|node:(net|http|https|dns|child_process)/.test(codigo));
/* Y con trampas puestas: si la decisión (la plantilla, el planificador y el precio incluidos) tocara el reloj, el azar o la red, la corrida fallaría. */
const trampas = async (hacer) => {
  const guardado = [];
  const cambia = (objeto, nombre, valor) => { guardado.push([objeto, nombre, objeto[nombre]]); objeto[nombre] = valor; };
  const prohibido = (que) => () => { throw new Error(`el dominio usó ${que}`); };
  const DateOriginal = globalThis.Date;
  class DateProhibida extends DateOriginal {
    constructor(...a) { if (a.length === 0) throw new Error('el dominio usó new Date()'); super(...a); }
    static now() { throw new Error('el dominio usó Date.now()'); }
  }
  guardado.push([globalThis, 'Date', DateOriginal]);
  globalThis.Date = DateProhibida;
  cambia(Math, 'random', prohibido('Math.random'));
  cambia(globalThis, 'fetch', prohibido('fetch'));
  cambia(net.Socket.prototype, 'connect', prohibido('net.Socket.connect'));
  cambia(http, 'request', prohibido('http.request'));
  cambia(https, 'request', prohibido('https.request'));
  try { return await hacer(); } finally { for (const [objeto, nombre, valor] of guardado.reverse()) objeto[nombre] = valor; }
};
let conTrampas = null;
const errorConTrampas = await falla(async () => { conTrampas = await trampas(() => correr()); });
check('C6 sin reloj, sin azar y sin red con trampas puestas (Date, Math.random, fetch, sockets, http): la corrida entera funciona y da lo mismo', errorConTrampas === null && huella(conTrampas) === huella(run), errorConTrampas || '');

/* ── D. Los graders, uno a uno ───────────────────────────────────────────────────────────────────────────────── */
console.log('\n── D · los graders ──');
const unaDecision = (cambia = {}, plan = {}) => ({
  ejecuciones: 0, goal: 'x', inferido: {}, preguntas: [], pendiente: null, reabiertas: [], techoDePropuestas: 4,
  plan: {
    capacidades: ['text.generate', 'image.generate'],
    pasos: [{ id: 'concept', capacidad: 'text.generate', dependeDe: [] }, { id: 'images', capacidad: 'image.generate', dependeDe: ['concept'] }],
    propuestas: 3, kind: 'design', entradaDeImagen: ['brief', 'count', 'kind'], aspectRatio: null, aceptaReferencia: false,
    imagen: { proveedor: 'p', modelo: 'm', nivel: 'standard', pideTexto: false, escribeTexto: false },
    encargo: ['una pieza para redes'], explica: 'Voy a crear 3 propuestas.',
    precio: { simulado: [{ paso: 'images', capacidad: 'image.generate', credits: 5, usd: 0.045, suelo: 5 }], real: [{ paso: 'images', capacidad: 'image.generate', credits: 6, usd: 0.045, suelo: 5 }] },
    ...plan,
  },
  ...cambia,
});
const g = (decision, expected, extra = {}) => Object.fromEntries(dominioDesign.calificar(decision, { expected, ...extra }, { costeUsd: 0 }).map((x) => [x.id, x]));
const ok = (decision, expected, id, extra) => g(decision, expected, extra)[id].ok;
check('D1 deduce: pide lo deducido y prohíbe lo que no debe deducirse',
  ok(unaDecision({ inferido: { what: 'poster' } }), { inferido: { what: 'poster' } }, 'design/deduce') && !ok(unaDecision({ inferido: { what: 'logo' } }), { inferido: { what: 'poster' } }, 'design/deduce')
  && !ok(unaDecision(), { inferido: { what: 'poster' } }, 'design/deduce') && ok(unaDecision({ inferido: { what: 'scene' } }), { noInferido: { what: 'object' } }, 'design/deduce')
  && !ok(unaDecision({ inferido: { what: 'object' } }), { noInferido: { what: 'object' } }, 'design/deduce'));
check('D2 sin-repreguntar: falla si pregunta lo ya deducido o si el `when` de una pregunta sigue aplicando a lo que ya se sabe',
  ok(unaDecision({ inferido: { era: 'future' }, preguntas: [{ id: 'machine', opciones: [], libre: true }] }), { sinRepreguntar: true }, 'design/sin-repreguntar')
  && !ok(unaDecision({ inferido: { era: 'future' }, preguntas: [{ id: 'era', opciones: [], libre: true }] }), { sinRepreguntar: true }, 'design/sin-repreguntar')
  && !ok(unaDecision({ inferido: { era: 'future' }, reabiertas: ['era'] }), { sinRepreguntar: true }, 'design/sin-repreguntar'));
const conOpciones = (...ids) => ({ preguntas: [{ id: 'q', opciones: ids, libre: true }] });
check('D3 no-se: la pregunta tiene que hacerse y ofrecer «No sé»; sin opciones (texto libre) no hay nada que ofrecer',
  ok(unaDecision(conOpciones('a', 'b', 'idk')), { noSe: ['q'] }, 'design/no-se') && !ok(unaDecision(conOpciones('a', 'b')), { noSe: ['q'] }, 'design/no-se')
  && !ok(unaDecision(), { noSe: ['q'] }, 'design/no-se') && ok(unaDecision(conOpciones()), { noSe: ['q'] }, 'design/no-se')
  && /«q» ofrece 2 opciones \(a, b\) y ninguna es «No sé»/.test(g(unaDecision(conOpciones('a', 'b')), { noSe: ['q'] })['design/no-se'].detail));
check('D4 encargo-limpio: ni «idk», ni «undefined», ni comas ni espacios de más en lo que viaja al modelo ni en lo que se promete',
  ok(unaDecision(), { encargoLimpio: true }, 'design/encargo-limpio')
  && ['una pieza para anunciar idk', 'un logo para "undefined"', 'un auto, , del futuro', 'un  auto', 'un auto,.', 'un logo para ""', 'null', ' un auto'].every((t) => !ok(unaDecision({}, { encargo: [t] }), { encargoLimpio: true }, 'design/encargo-limpio'))
  && !ok(unaDecision({ plan: null, pendiente: 'what' }), { encargoLimpio: true }, 'design/encargo-limpio'));
check('D5 espera y plan: la conversación se queda donde se dice, y las capacidades del plan son las esperadas y en orden',
  ok(unaDecision({ plan: null, pendiente: 'what' }), { espera: 'what' }, 'design/espera') && !ok(unaDecision({ plan: null, pendiente: 'item' }), { espera: 'what' }, 'design/espera')
  && !ok(unaDecision(), { espera: 'what' }, 'design/espera')
  && ok(unaDecision(), { capacidades: ['text.generate', 'image.generate'] }, 'design/plan') && !ok(unaDecision(), { capacidades: ['image.generate'] }, 'design/plan')
  && !ok(unaDecision(), { capacidades: ['image.generate', 'text.generate'] }, 'design/plan') && !ok(unaDecision({ plan: null, pendiente: 'what' }), { capacidades: ['text.generate'] }, 'design/plan'));
check('D6 propuestas: las esperadas y nunca por encima del techo del Core ni por debajo de una',
  ok(unaDecision(), { propuestas: 3 }, 'design/propuestas') && !ok(unaDecision(), { propuestas: 2 }, 'design/propuestas')
  && !ok(unaDecision({}, { propuestas: 5 }), { propuestas: 5 }, 'design/propuestas') && ok(unaDecision({}, { propuestas: 4 }), { propuestas: 4 }, 'design/propuestas')
  && !ok(unaDecision({}, { propuestas: 0 }), { propuestas: 0 }, 'design/propuestas') && !ok(unaDecision({}, { propuestas: null }), { propuestas: 3 }, 'design/propuestas'));
const conPrecio = (simulado, real = simulado) => ({ precio: { simulado, real } });
const paso = (credits, usd, suelo) => ({ paso: 'images', capacidad: 'image.generate', credits, usd, suelo });
check('D7 suelo-de-coste: nunca por debajo del coste de lista, en ningún modo de precios ni en ningún paso, y el coste de lista tiene que existir',
  ok(unaDecision(), { sueloDeCoste: true }, 'design/suelo-de-coste')
  && !ok(unaDecision({}, conPrecio([paso(4, 0.045, 5)])), { sueloDeCoste: true }, 'design/suelo-de-coste')
  && !ok(unaDecision({}, conPrecio([paso(5, 0.045, 5)], [paso(4, 0.045, 5)])), { sueloDeCoste: true }, 'design/suelo-de-coste')
  && !ok(unaDecision({}, conPrecio([paso(5, 0, 0)])), { sueloDeCoste: true }, 'design/suelo-de-coste')
  && !ok(unaDecision({}, conPrecio([paso(5, NaN, 5)])), { sueloDeCoste: true }, 'design/suelo-de-coste') && ok(unaDecision({}, conPrecio([paso(5, 0.045, 5), paso(21, 0.2, 20)])), { sueloDeCoste: true }, 'design/suelo-de-coste'));
check('D8 los graders de los casos conocidos: aspectRatio, texto dentro de la imagen y referencia, cada uno con su causa en el detalle',
  ok(unaDecision({}, { aspectRatio: '9:16' }), { aspectRatio: '9:16' }, 'design/aspect-ratio') && !ok(unaDecision(), { aspectRatio: '9:16' }, 'design/aspect-ratio')
  && ok(unaDecision({}, { imagen: { proveedor: 'p', modelo: 'm', nivel: 'high', pideTexto: true, escribeTexto: true } }), { textoEnImagen: true }, 'design/texto-en-imagen')
  && !ok(unaDecision(), { textoEnImagen: true }, 'design/texto-en-imagen') && !ok(unaDecision({}, { imagen: { proveedor: 'p', modelo: 'm', nivel: 'high', pideTexto: true, escribeTexto: false } }), { textoEnImagen: true }, 'design/texto-en-imagen')
  && ok(unaDecision({}, { aceptaReferencia: true }), { usaReferencia: true }, 'design/referencia', { referencia: true }) && !ok(unaDecision(), { usaReferencia: true }, 'design/referencia', { referencia: true })
  && /no lleva aspectRatio \(entrada: brief, count, kind\)/.test(g(unaDecision(), { aspectRatio: '9:16' })['design/aspect-ratio'].detail));
const conEtiqueta = g(unaDecision(conOpciones('a')), { noSe: ['q'] }, { hueco: 'H-2', cierre: 'CL-10' })['design/no-se'].detail;
const conocida = g(unaDecision(), { aspectRatio: '9:16' }, { conocido: true, cierre: 'CL-14', decision: 'D5' })['design/aspect-ratio'].detail;
check('D9 un fallo se lee solo: el detalle empieza por de dónde viene el caso (H-n · CL-nn, o «caso conocido» con su decisión)', conEtiqueta.startsWith('[H-2 · CL-10] ') && conocida.startsWith('[caso conocido · CL-14 · D5] '), `${conEtiqueta} | ${conocida}`);

/* ── E. Contra un cálculo directo e independiente ────────────────────────────────────────────────────────────── */
console.log('\n── E · lo que mide es lo que hay ──');
const faltaNoSe = h2.filter((c) => detalleDe(run, c.evalCaseId).graders.some((x) => x.id === 'design/no-se' && !x.ok)).flatMap((c) => c.expected.noSe).sort();
check('E1 H-2 medido = H-2 calculado: las preguntas de los casos H-2 que fallan son EXACTAMENTE las preguntas de la plantilla con opciones y sin «No sé» (hoy son seis; si arreglan algunas, las que queden; si añaden una sin «No sé», falta su caso)',
  JSON.stringify(faltaNoSe) === JSON.stringify(sinNoSe(plantilla()).sort()), `medido ${faltaNoSe.join()} · directo ${sinNoSe(plantilla()).sort().join()}`);
const bien = h6.filter((c) => detalleDe(run, c.evalCaseId).graders.every((x) => x.ok)).map((c) => c.evalCaseId);
const directoBien = h6.filter((c) => plantilla().infer(c.goal).what === c.expected.inferido.what).map((c) => c.evalCaseId);
check('E2 H-6 medido = H-6 calculado: los casos H-6 que pasan son los mismos para los que `infer` da lo esperado', JSON.stringify(bien) === JSON.stringify(directoBien), `medido ${bien.join()} · directo ${directoBien.join()}`);
/* Lo que el servidor deduce de un texto, calculado aquí con `infer` y la regla de `respuestaPara`: solo opciones válidas, y nada de lo que la puerta ya fijó. */
const deducidoDirecto = (c) => {
  const goal = c.goal.trim() || plantilla().defaultGoal;
  if (goal === plantilla().defaultGoal) return {};
  const crudo = plantilla().infer(goal);
  return Object.fromEntries(Object.entries(crudo).filter(([id, valor]) => {
    const pregunta = plantilla().questions.find((q) => q.id === id);
    return pregunta && pregunta.options.some((o) => o.id === valor) && !(c.presets && id in c.presets);
  }));
};
const noCoinciden = DATASET.casos.filter((c) => JSON.stringify(Object.entries(detalleDe(run, c.evalCaseId).decision.inferido).sort()) !== JSON.stringify(Object.entries(deducidoDirecto(c)).sort())).map((c) => c.evalCaseId);
check('E3 lo deducido por el dominio es lo que `infer` devuelve (solo opciones válidas y sin lo que ya trae la puerta), en todos los casos', noCoinciden.length === 0, noCoinciden.join());
const planDirecto = (respuestas) => plantilla().buildPlan('x', respuestas);
const flujos = ['design-flujo-logo', 'design-flujo-afiche', 'design-flujo-producto', 'design-flujo-vehiculo', 'design-flujo-lugar', 'design-flujo-personaje'];
const lasRespuestas = (c) => ({ ...(c.presets || {}), ...c.respuestas });
check('E4 el plan medido es el que arma `buildPlan` con las mismas respuestas: capacidades, propuestas y tipo de imagen',
  flujos.every((id) => { const c = casoDe(id); const p = detalleDe(run, id).decision.plan; const d = planDirecto(lasRespuestas(c)); const imagen = d.steps.find((s) => s.capability.startsWith('image.'));
    return JSON.stringify(p.capacidades) === JSON.stringify(d.steps.map((s) => s.capability)) && p.propuestas === imagen.input.count && p.kind === imagen.input.kind && p.explica === d.explainToUser; }));
check('E5 el precio medido sale del cálculo que ya existe, en los DOS modos de precios: cada paso de imagen cuesta lo que dice `priceImage` y el suelo es el coste de lista redondeado hacia arriba',
  flujos.every((id) => [['simulado', 'simulated'], ['real', 'real']].every(([clave, modo]) => {
    const p = detalleDe(run, id).decision.plan; const imagen = p.precio[clave].find((x) => x.paso === 'images');
    const directo = lib.priceImage({ capability: 'image.generate', count: p.propuestas, kind: p.kind, references: 0 }, { ...lib.DEFAULT_SETTINGS, pricingMode: modo });
    return imagen.credits === directo.credits && imagen.usd === directo.usd && imagen.suelo === Math.ceil(directo.usd * lib.DEFAULT_SETTINGS.creditsPerUsd); })));
const rojoDeHoy = run.detalle.filter((d) => d.graders.some((x) => !x.ok));
const sinCausa = rojoDeHoy.filter((d) => d.graders.filter((x) => !x.ok).some((x) => !x.detail || x.detail.length < 20));
check('E6 cada fallo explica qué falla y por qué (con su etiqueta de origen), para poder leerlo sin abrir el dominio', sinCausa.length === 0 && rojoDeHoy.every((d) => d.graders.filter((x) => !x.ok).every((x) => /^\[[^\]]+\] /.test(x.detail))), sinCausa.map((d) => d.evalCaseId).join());

/* ── F. GATE: el servidor vivo no regresa frente a la baseline ───────────────────────────────────────────────── */
console.log('\n── F · el gate ──');
const veredictoVivo = comparar(BASELINE.scores, run.scores, CONFIG);
check('F1 GATE: el servidor vivo no regresa frente a la baseline de Design (NO_CHANGE hoy; ACCEPT el día que se arreglen H-2 y H-6)', veredictoVivo.veredicto === 'NO_CHANGE' || veredictoVivo.veredicto === 'ACCEPT', `${veredictoVivo.veredicto}: ${veredictoVivo.motivos.join('; ')}`);
const copiaBaseline = JSON.stringify(BASELINE);
comparar(BASELINE.scores, run.scores, CONFIG);
check('F2 la baseline es inmutable durante una comparación', JSON.stringify(BASELINE) === copiaBaseline);
const empeora = rojos(run).filter((id) => !ROJOS_DE_LA_BASELINE.includes(id));
check('F3 ningún caso que estaba en verde en la baseline está hoy en rojo (el veredicto lo diría, y esto dice cuál)', empeora.length === 0, empeora.join());
const cli = spawnSync(process.execPath, [path.join(dir, 'runner.mjs'), '--dataset', 'design', '--contra', path.join(dir, 'baseline/design.json')], { cwd: RAIZ, encoding: 'utf8' });
check('F4 el comando documentado funciona: `node ops/evals/runner.mjs --dataset design --contra ops/evals/baseline/design.json` sale con 0 y dice el veredicto',
  cli.status === 0 && /\$0\)/.test(cli.stdout) && /Veredicto: (NO_CHANGE|ACCEPT)/.test(cli.stdout), `${cli.status} ${(cli.stderr || '').slice(0, 200)}`);

/* ── G. SABOTAJES: lo que se rompe, se ve ────────────────────────────────────────────────────────────────────── */
console.log('\n── G · sabotajes ──');
/* Un sabotaje se mide contra la corrida VIVA (la de este momento), no contra la baseline: así vale igual antes y después de que se arreglen H-2 y H-6. */
const sabotaje = async (nombre, cambiar, grader, casoQueFalla) => {
  const rota = await conPlantilla(cambiar, () => correr());
  const v = comparar(run.scores, rota.scores, CONFIG);
  const nuevos = fallosDe(rota).filter((f) => !fallosDe(run).includes(f));
  check(`G ${nombre}: el gate RECHAZA y el grader ${grader} lo dice en ${casoQueFalla}`,
    v.veredicto === 'REJECT' && nuevos.includes(`${casoQueFalla}:${grader}`), `${v.veredicto} · fallos nuevos: ${nuevos.slice(0, 6).join(', ')}`);
};
await sabotaje('quitar «No sé» de una pregunta que lo tiene', (t) => { t.questions = t.questions.map((q) => (q.id === 'feel' ? { ...q, options: q.options.filter((o) => o.id !== 'idk') } : q)); }, 'design/no-se', 'design-flujo-logo');
await sabotaje('subir el techo de propuestas por encima del del Core', (t) => alPlan(t, (p) => { p.steps.find((s) => s.id === 'images').input.count = 5; return p; }), 'design/propuestas', 'design-flujo-afiche');
await sabotaje('bajar las propuestas a dos', (t) => alPlan(t, (p) => { p.steps.find((s) => s.id === 'images').input.count = 2; return p; }), 'design/propuestas', 'design-flujo-producto');
await sabotaje('quitar el `!a.era` del `when` de la época (se repreguntaría lo deducido)', (t) => { t.questions = t.questions.map((q) => (q.id === 'era' ? { ...q, when: (a) => a.what === 'object' } : q)); }, 'design/sin-repreguntar', 'design-texto-auto-del-futuro');
await sabotaje('quitar el paso del concepto del plan', (t) => alPlan(t, (p) => ({ ...p, steps: p.steps.filter((s) => s.id !== 'concept') })), 'design/plan', 'design-flujo-vehiculo');
await sabotaje('hacer que `infer` lo lleve todo al logo', (t) => { t.infer = () => ({ what: 'logo' }); }, 'design/deduce', 'design-texto-vaso-innovador');
await sabotaje('colar un «idk» en el encargo', (t) => alPlan(t, (p) => { p.steps.find((s) => s.id === 'images').input.brief += ', idk'; return p; }), 'design/encargo-limpio', 'design-flujo-personaje');
{
  /* El precio no pasa por la plantilla: se prueba con otra `lib` —la de siempre con `priceImage` cobrando un Credit menos que el coste—. */
  const barata = { ...lib, priceImage: (entrada, ajustes) => { const p = lib.priceImage(entrada, ajustes); return { ...p, credits: p.credits - 1 }; } };
  const rota = await correr(DATASET, crearRegistroDeDominios([crearDominioDesign(barata)]));
  const v = comparar(run.scores, rota.scores, CONFIG);
  check('G sabotaje: cobrar un Credit menos que el coste de lista: el gate RECHAZA y `design/suelo-de-coste` lo dice en un flujo', v.veredicto === 'REJECT' && fallosDe(rota).includes('design-flujo-afiche:design/suelo-de-coste'), `${v.veredicto} · ${fallosDe(rota).filter((f) => /suelo/.test(f)).slice(0, 3).join(', ')}`);
}
{
  const roto = JSON.parse(JSON.stringify(DATASET));
  roto.casos.find((c) => c.evalCaseId === 'design-flujo-logo').expected.propuestas = 4;
  const r = await correr(roto);
  check('G sabotaje del dataset: una propiedad que deja de cumplirse baja el score y el gate RECHAZA (aunque el servidor no haya cambiado)', comparar(run.scores, r.scores, CONFIG).veredicto === 'REJECT');
}
check('G tras los sabotajes la plantilla vuelve a ser la real: el dominio da lo de siempre', huella(await correr()) === huella(run));

/* ── H. Los arreglos de H-2 y H-6, SIMULADOS: la comparación da ACCEPT ───────────────────────────────────────── */
console.log('\n── H · los arreglos simulados (r7d/servidor) ──');
/*
 * Lo que hará la rama del servidor, SIMULADO en memoria y sin tocar ningún archivo: «No sé» en las seis preguntas y una lectura de
 * `infer` en la que las palabras de afiche van antes que «marca». Es una simulación, no la rama: sirve para probar que el dominio ve
 * los dos arreglos y que, al fusionarla, la comparación es MEJORA y no regresión. Sobre una `lib` que ya los traiga, no cambia nada.
 */
const arreglosSimulados = (t) => {
  t.questions = t.questions.map((q) => (q.options.length > 0 && !q.options.some((o) => o.id === 'idk') ? { ...q, options: [...q.options, IDK] } : q));
  const original = t.infer;
  t.infer = (goal) => {
    const r = original(goal);
    if (r.what === 'logo' && /\b(post|flyer|publicidad|anuncio|afiche|poster|póster)\b/i.test(goal) && !/\b(logo|logotipo)\b/i.test(goal)) r.what = 'poster';
    return r;
  };
};
const simulado = await conPlantilla(arreglosSimulados, () => correr());
const vS = comparar(BASELINE.scores, simulado.scores, CONFIG);
/* Mientras la baseline sea la de HOY (con H-2 en rojo), arreglarlos es una MEJORA; una vez refrescada, el mismo estado es NO_CHANGE. */
const baselineEsDeHoy = rojosDeLaBaseline.includes('design-h2-what');
check('H1 con H-2 y H-6 arreglados (simulado), la comparación frente a la baseline es ACCEPT (MEJORA) y no regresión —o NO_CHANGE si la baseline ya se refrescó—',
  baselineEsDeHoy
    ? vS.veredicto === 'ACCEPT' && vS.overallDelta >= CONFIG.umbrales.umbralMejora && Object.values(vS.dimDeltas).every((x) => x === null || x >= 0)
    : vS.veredicto === 'NO_CHANGE', `${vS.veredicto} ${vS.overallBase} → ${vS.overallCandidate}: ${vS.motivos.join('; ')}`);
const huecos = DATASET.casos.filter((c) => c.hueco).map((c) => c.evalCaseId);
const esVerde = (r, id) => detalleDe(r, id).graders.every((x) => x.ok);
check('H2 los casos de H-2 y de H-6 pasan a verde, uno por uno', huecos.length >= 12 && huecos.every((id) => esVerde(simulado, id)), huecos.filter((id) => !esVerde(simulado, id)).join());
check('H3 ningún caso que estaba en verde en la baseline empeora; lo que sigue en rojo es solo lo conocido de D4, D5 y D6; y lo que se arregla son solo huecos etiquetados',
  rojos(simulado).every((id) => ROJOS_DE_LA_BASELINE.includes(id)) && rojos(simulado).every((id) => casoDe(id).conocido === true) && rojos(simulado).length === conocidos.length
  && ROJOS_DE_LA_BASELINE.filter((id) => !rojos(simulado).includes(id)).every((id) => casoDe(id).hueco), rojos(simulado).join());
check('H4 el refresco explícito de la baseline cierra el círculo: contra la baseline refrescada (simulada) el veredicto es NO_CHANGE',
  comparar(simulado.scores, simulado.scores, CONFIG).veredicto === 'NO_CHANGE');
const vivoDespues = await correr();
check('H5 la simulación no deja huella: tras ella el dominio vuelve a dar lo de hoy', huella(vivoDespues) === huella(run));

/* ── I. Las puertas de siempre y la cadena ───────────────────────────────────────────────────────────────────── */
console.log('\n── I · las puertas ──');
const paquete = JSON.parse(leer('functions/package.json'));
check('I1 esta suite está en la cadena de `npm test` (ci-workflow 13 lo exige)', /node test\/evals-design\.test\.mjs/.test(paquete.scripts.test));
const cierre = spawnSync(process.execPath, [path.join(RAIZ, 'functions/test/_design-cierre.mjs'), '--solo', 'CL-17'], { cwd: RAIZ, encoding: 'utf8' });
check('I2 el corredor de cierre da CL-17 CUMPLIDO y sale con 0', cierre.status === 0 && /CUMPLIDO\s+CL-17/.test(cierre.stdout), `${cierre.status} ${cierre.stdout.slice(-200)}`);
check('I3 el documento del Eval Engine habla del dominio y de cómo se usa', /Dominio `design`/.test(leer('docs/EVALS.md')) && /runner\.mjs --dataset design --guardar-baseline/.test(leer('docs/EVALS.md')));

console.log(failures ? `\n✘ ${failures} fallo(s) de ${n}` : `\n✔ el dominio design del Eval Engine: ${n} comprobaciones ($0)`);
process.exit(failures ? 1 : 0);
