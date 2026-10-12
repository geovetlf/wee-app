/*
 * EL DOMINIO DESIGN — el segundo del Eval Engine (`ops/evals/dominios.mjs`). CL-17, F0 de docs/DESIGN.md §5.
 *
 * Mide, a $0 y sin ningún proveedor, lo que la experiencia `design` del servidor hace con lo que una persona le cuenta:
 * qué deduce de su texto (`infer`), qué le pregunta (las preguntas de la plantilla, con sus `when`), qué plan arma
 * (`buildPlan`) y cuánto costaría ese plan (`credits/aiPricing.ts`, solo para LEER el coste de lista: nada se cobra ni se
 * reserva). Es la MISMA plantilla y el MISMO planificador de plantillas de producción (`functions/lib/creator/`), no una
 * copia: si cambia `templates.ts`, el eval lo ve (requiere `functions/lib` al día, como el dominio del Router).
 *
 * Un caso es lo que haría una persona: un texto (`goal`), lo que ya trae elegido de la puerta por la que entró (`presets`,
 * como los `presetAnswers` de `creatorChat`) y lo que contestaría cuando se le pregunte (`respuestas`). El dominio recorre
 * la conversación como lo hace `creatorChat` —deduce, pregunta lo que falta y, cuando ya no queda nada, arma el plan— y se
 * queda esperando en la primera pregunta que el caso no contesta.
 *
 * Un caso activa SOLO los graders cuyas claves `expected.*` trae (como el Router). Lo que se mide no depende de ninguna
 * decisión del dueño, salvo lo marcado como CASO CONOCIDO (`conocido: true`, con la decisión de la que depende: D4, D5 o D6
 * de docs/DESIGN.md §4): esos casos dicen lo que hoy falta y cuyo arreglo es del dueño. Salen en rojo en la baseline y NO
 * son un criterio de aceptación: el veredicto de una comparación solo mira si algo EMPEORA o MEJORA frente a ella.
 *
 * Sin reloj, sin azar y sin red: la decisión es función de la plantilla, del precio de lista y del caso. Sin superficie:
 * Hillclimb no lo optimiza (se niega: «no declara superficie»; no hay nada que aplicar), pero el corredor sí lo evalúa.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { hashCanonico } from '../contrato.mjs';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
/** La `lib` compilada de este árbol (`npm run build --prefix functions`). */
export const LIB_POR_DEFECTO = path.join(RAIZ, 'functions/lib');

/**
 * Las piezas del servidor que el dominio lee, cargadas de una `lib` compilada: la de este árbol o, para comparar, la de
 * otra rama (`cargarLib('<ruta>/functions/lib')`). Todo se llama a través de este objeto, así que un caso de prueba puede
 * pasar el suyo con una pieza cambiada (un sabotaje, un arreglo simulado) sin tocar la real.
 */
export const cargarLib = (raiz = LIB_POR_DEFECTO) => {
  const de = (rel) => {
    try { return require(path.join(raiz, rel)); } catch (e) { throw new Error(`el dominio design no carga ${rel} de ${raiz}: ${e.message} (npm run build --prefix functions)`); }
  };
  const planificador = de('creator/planner.js');
  const imagenes = de('engine/imageModels.js');
  const precios = de('credits/aiPricing.js');
  return Object.freeze({
    TEMPLATES: de('creator/templates.js').TEMPLATES,
    templatePlanner: planificador.templatePlanner,
    respuestaPara: planificador.respuestaPara,
    IMAGE_INPUT_CAPS: de('creator/inputs.js').IMAGE_INPUT_CAPS,
    MAX_PROPUESTAS_POR_PASO: de('core/contracts.js').MAX_PROPUESTAS_POR_PASO,
    DEFAULT_SETTINGS: de('engine/registry.js').DEFAULT_SETTINGS,
    serviceForCapability: de('credits/creditCosts.js').serviceForCapability,
    priceImage: precios.priceImage,
    priceOperation: precios.priceOperation,
    imageModelOf: imagenes.imageModelOf,
    imageRequirements: imagenes.imageRequirements,
  });
};

/* ── La decisión ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Una conversación de `design` no pasa de una docena de turnos: más es un bucle, y se dice. */
const MAX_TURNOS = 24;

const aRegistro = (hechas) => Object.fromEntries(hechas.map((a) => [a.questionId, a.optionId ?? (a.text ?? '').trim()]).filter(([, valor]) => valor));
const claves = (objeto) => Object.keys(objeto || {}).sort();

/**
 * El precio de los pasos del plan en un modo de precios, con el cálculo que ya existe (`priceImage`, `priceOperation`) y los
 * ajustes de producción salvo el modo, que se fija aquí: lo que dice la variable de entorno no puede mover una medición.
 * `available` no se pasa: se cotiza con la escalera ideal de modelos, la de siempre al estimar antes de crear.
 */
const precioDelPlan = (lib, plan, modo) => {
  const ajustes = { ...lib.DEFAULT_SETTINGS, pricingMode: modo };
  return plan.steps.map((paso) => {
    const entrada = paso.input || {};
    const esImagen = String(paso.capability).startsWith('image.');
    const precio = esImagen
      ? lib.priceImage({
        capability: paso.capability, count: entrada.count === undefined ? undefined : Number(entrada.count), quality: entrada.quality,
        resolution: entrada.resolution, kind: entrada.kind, references: 0, aspectRatio: entrada.aspectRatio,
      }, ajustes)
      : lib.priceOperation(paso.capability, entrada, lib.serviceForCapability(paso.capability, entrada), ajustes);
    return {
      paso: paso.id, capacidad: paso.capability, servicio: precio.service, credits: precio.credits, usd: precio.usd,
      /* El suelo: lo que cuesta de lista, en Credits y redondeado hacia arriba. Nunca se cobra menos. */
      suelo: precio.usd > 0 ? Math.ceil(precio.usd * ajustes.creditsPerUsd) : 0,
      proveedor: precio.provider, modelo: precio.model, nivel: precio.detail && precio.detail.tier ? precio.detail.tier : null,
    };
  });
};

/** Lo medible de un plan: sus capacidades, sus propuestas, lo que lleva el paso de imagen, el modelo que lo haría y el precio. */
const resumirPlan = (lib, plan) => {
  const imagen = plan.steps.find((s) => String(s.capability).startsWith('image.')) || null;
  const concepto = plan.steps.find((s) => s.capability === 'text.generate') || null;
  const simulado = precioDelPlan(lib, plan, 'simulated');
  const real = precioDelPlan(lib, plan, 'real');
  const propuestas = imagen ? Number(imagen.input && imagen.input.count) : NaN;
  const delPrecio = imagen ? simulado.find((p) => p.paso === imagen.id) : null;
  const modelo = delPrecio ? lib.imageModelOf(delPrecio.modelo) : null;
  const requisitos = imagen ? lib.imageRequirements({ capability: imagen.capability, kind: imagen.input && imagen.input.kind }) : null;
  return {
    capacidades: plan.steps.map((s) => s.capability),
    pasos: plan.steps.map((s) => ({ id: s.id, capacidad: s.capability, dependeDe: [...(s.dependsOn || [])] })),
    propuestas: Number.isFinite(propuestas) ? propuestas : null,
    kind: imagen && imagen.input && typeof imagen.input.kind === 'string' ? imagen.input.kind : null,
    entradaDeImagen: imagen ? claves(imagen.input) : [],
    aspectRatio: imagen && imagen.input && imagen.input.aspectRatio !== undefined ? String(imagen.input.aspectRatio) : null,
    aceptaReferencia: imagen ? lib.IMAGE_INPUT_CAPS.includes(imagen.capability) : null,
    imagen: imagen && delPrecio ? {
      proveedor: delPrecio.proveedor, modelo: delPrecio.modelo, nivel: delPrecio.nivel,
      pideTexto: Boolean(requisitos && requisitos.text), escribeTexto: Boolean(modelo && modelo.rendersText),
    } : null,
    encargo: [concepto && concepto.input && concepto.input.brief, imagen && imagen.input && imagen.input.brief, plan.explainToUser].filter((t) => typeof t === 'string'),
    explica: String(plan.explainToUser ?? ''),
    precio: { simulado, real },
  };
};

/**
 * Recorre la conversación como `creatorChat` al crear un trabajo y contestar: se parte de la puerta (`presets`, filtrados por
 * `respuestaPara`, la misma regla que usa el servidor), el planificador de plantillas deduce, pregunta lo que falta y, sin nada
 * que preguntar, arma el plan. Cada pregunta se contesta con lo que el caso dice (una opción, o un texto); sin respuesta, la
 * conversación se queda ahí (`pendiente`).
 */
export const decidirDesign = async (lib, caso) => {
  const plantilla = lib.TEMPLATES.design;
  const goal = String(caso.goal ?? '').trim() || plantilla.defaultGoal;
  const hechas = [];
  for (const [questionId, valor] of Object.entries(caso.presets || {})) {
    const pregunta = plantilla.questions.find((q) => q.id === questionId);
    const respuesta = pregunta ? lib.respuestaPara(pregunta, valor) : null;
    if (respuesta) hechas.push({ questionId, ...respuesta });
  }

  const inferido = {};
  const preguntas = [];
  let reabiertas = [];
  let plan = null;
  let pendiente = null;
  let turnos = 0;
  while (turnos < MAX_TURNOS) {
    turnos += 1;
    const turno = await lib.templatePlanner.next({ experienceId: 'design', goal, answers: hechas });
    for (const deducida of turno.inferred) {
      hechas.push(deducida);
      inferido[deducida.questionId] = deducida.optionId ?? deducida.text;
    }
    if (turnos === 1) {
      /* Lo deducido no se vuelve a preguntar: ninguna pregunta con `when` puede seguir aplicando a algo que ya se sabe. */
      const previstas = aRegistro(hechas);
      reabiertas = Object.keys(inferido).filter((id) => {
        const pregunta = plantilla.questions.find((q) => q.id === id);
        return Boolean(pregunta && pregunta.when && pregunta.when(previstas));
      });
    }
    if (turno.plan) { plan = turno.plan; break; }
    const pregunta = turno.question;
    preguntas.push({ id: pregunta.id, opciones: pregunta.options.map((o) => o.id), libre: pregunta.allowFreeText !== false });
    const dada = (caso.respuestas || {})[pregunta.id];
    if (dada === undefined) { pendiente = pregunta.id; break; }
    hechas.push(pregunta.options.some((o) => o.id === dada) ? { questionId: pregunta.id, optionId: dada } : { questionId: pregunta.id, text: dada });
  }
  if (!plan && pendiente === null) pendiente = `(sin salida tras ${MAX_TURNOS} turnos)`;

  return {
    ejecuciones: 0,
    goal, inferido, preguntas, pendiente, reabiertas,
    techoDePropuestas: lib.MAX_PROPUESTAS_POR_PASO,
    plan: plan ? resumirPlan(lib, plan) : null,
  };
};

/* ── Los graders ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Qué dimensión puntúa cada grader de Design. LATENCY no se mide aquí: decidir a $0 no tiene latencia que valga. */
export const DIMENSION_DE_GRADER_DESIGN = Object.freeze({
  'design/deduce': 'QUALITY',
  'design/sin-repreguntar': 'QUALITY',
  'design/no-se': 'QUALITY',
  'design/encargo-limpio': 'QUALITY',
  'design/aspect-ratio': 'QUALITY',
  'design/texto-en-imagen': 'QUALITY',
  'design/referencia': 'QUALITY',
  'design/espera': 'RELIABILITY',
  'design/plan': 'RELIABILITY',
  'design/propuestas': 'COST',
  'design/suelo-de-coste': 'COST',
});

/** Lo que no puede aparecer en lo que se le manda al modelo ni en lo que se le promete a la persona (el encargo de «idk» fue real). */
const SUCIEDAD = /\bidk\b|\bundefined\b|\bnull\b|\bNaN\b|\[object|,\s*,|,,|\s{2,}|\s,|,\s*\.|""|^\s|\s$/i;

/** De dónde viene el caso, para que quien lea un fallo sepa qué es: un defecto (hueco), un cierre o un caso conocido. */
const etiqueta = (caso) => {
  const partes = [...(caso.conocido ? ['caso conocido'] : []), ...[caso.hueco, caso.cierre, caso.decision].filter(Boolean)];
  return partes.length ? `[${partes.join(' · ')}] ` : '';
};
const veredicto = (fallos, caso) => ({ ok: fallos.length === 0, detail: fallos.length ? `${etiqueta(caso)}${fallos.join('; ')}` : '' });
const sinPlan = (d) => `no llegó a un plan: la conversación se quedó esperando «${d.pendiente}»`;
const lista = (xs) => (xs.length ? xs.join(', ') : '(ninguna)');

const CATALOGO = {
  /* Lo que se deduce del texto: lo pedido tiene que deducirse, y lo que se prohíbe no. */
  'design/deduce': (d, e, caso) => {
    if (!e.inferido && !e.noInferido) return null;
    const fallos = [];
    for (const [id, valor] of Object.entries(e.inferido || {})) {
      if (d.inferido[id] !== valor) fallos.push(`«${id}»: deduce ${d.inferido[id] === undefined ? '(nada)' : d.inferido[id]} de «${d.goal}»; esperado ${valor}`);
    }
    for (const [id, valor] of Object.entries(e.noInferido || {})) {
      if (d.inferido[id] === valor) fallos.push(`«${id}» no debía deducirse como ${valor} de «${d.goal}»`);
    }
    return veredicto(fallos, caso);
  },
  /* Lo deducido no se vuelve a preguntar: ni en la conversación, ni por el `when` de una pregunta que ya está contestada. */
  'design/sin-repreguntar': (d, e, caso) => {
    if (e.sinRepreguntar !== true) return null;
    const fallos = [];
    const repetidas = d.preguntas.filter((p) => Object.prototype.hasOwnProperty.call(d.inferido, p.id)).map((p) => p.id);
    if (repetidas.length) fallos.push(`pregunta lo que ya dedujo: ${lista(repetidas)}`);
    if (d.reabiertas.length) fallos.push(`su \`when\` sigue aplicando a lo que ya se sabe: ${lista(d.reabiertas)}`);
    return veredicto(fallos, caso);
  },
  /* Toda pregunta con opciones lleva «🤷 No sé» (CLAUDE.md, docs/CREATOR.md §7). Solo las que el caso nombra, y tienen que llegar a hacerse. */
  'design/no-se': (d, e, caso) => {
    if (!Array.isArray(e.noSe)) return null;
    const fallos = [];
    for (const id of e.noSe) {
      const pregunta = d.preguntas.find((p) => p.id === id);
      if (!pregunta) fallos.push(`«${id}» no se llegó a preguntar (preguntas: ${lista(d.preguntas.map((p) => p.id))})`);
      else if (pregunta.opciones.length > 0 && !pregunta.opciones.includes('idk')) fallos.push(`«${id}» ofrece ${pregunta.opciones.length} opciones (${pregunta.opciones.join(', ')}) y ninguna es «No sé»`);
    }
    return veredicto(fallos, caso);
  },
  /* Sin un «idk» ni un «undefined» en lo que viaja al modelo ni en lo que se le promete a la persona. */
  'design/encargo-limpio': (d, e, caso) => {
    if (e.encargoLimpio !== true) return null;
    if (!d.plan) return veredicto([sinPlan(d)], caso);
    /* El concepto y las imágenes comparten encargo: cada texto sucio se dice una vez. */
    const sucios = [...new Set(d.plan.encargo.filter((t) => SUCIEDAD.test(t)))];
    return veredicto(sucios.map((t) => `texto sucio: «${t}»`), caso);
  },
  /* La conversación se queda esperando justo la pregunta que se dice. */
  'design/espera': (d, e, caso) => {
    if (typeof e.espera !== 'string') return null;
    return veredicto(d.pendiente === e.espera ? [] : [`espera ${d.pendiente === null ? 'nada: ya hay plan' : `«${d.pendiente}»`}; esperado «${e.espera}»`], caso);
  },
  /* Las capacidades del plan, en orden: lo que Weë va a ejecutar por dentro. */
  'design/plan': (d, e, caso) => {
    if (!Array.isArray(e.capacidades)) return null;
    if (!d.plan) return veredicto([sinPlan(d)], caso);
    const ok = JSON.stringify(d.plan.capacidades) === JSON.stringify(e.capacidades);
    return veredicto(ok ? [] : [`capacidades ${d.plan.capacidades.join(' + ')}; esperado ${e.capacidades.join(' + ')}`], caso);
  },
  /* El número de propuestas: el que se espera y nunca por encima del techo del Core (MAX_PROPUESTAS_POR_PASO), que es lo que se cobra. */
  'design/propuestas': (d, e, caso) => {
    if (typeof e.propuestas !== 'number') return null;
    if (!d.plan) return veredicto([sinPlan(d)], caso);
    const n = d.plan.propuestas;
    const fallos = [];
    if (n !== e.propuestas) fallos.push(`${n === null ? 'ninguna propuesta' : `${n} propuestas`}; esperado ${e.propuestas}`);
    if (n === null || n < 1 || n > d.techoDePropuestas) fallos.push(`fuera del techo (1 a ${d.techoDePropuestas})`);
    return veredicto(fallos, caso);
  },
  /* El suelo de coste: el precio no baja del coste de lista del proveedor, en ningún modo de precios y en ningún paso. */
  'design/suelo-de-coste': (d, e, caso) => {
    if (e.sueloDeCoste !== true) return null;
    if (!d.plan) return veredicto([sinPlan(d)], caso);
    const fallos = [];
    for (const [modo, pasos] of Object.entries(d.plan.precio)) {
      for (const p of pasos) {
        if (!(Number.isFinite(p.usd) && p.usd > 0)) fallos.push(`${modo} · ${p.paso}: sin coste de lista (${p.usd})`);
        else if (!(p.credits >= p.suelo)) fallos.push(`${modo} · ${p.paso}: cobra ${p.credits} Credits y el coste de lista es ${p.suelo}`);
      }
    }
    return veredicto(fallos, caso);
  },
  /* El formato elegido llega al paso de imagen como `aspectRatio` (CL-14). Conocido: depende de D5. */
  'design/aspect-ratio': (d, e, caso) => {
    if (typeof e.aspectRatio !== 'string') return null;
    if (!d.plan) return veredicto([sinPlan(d)], caso);
    return veredicto(d.plan.aspectRatio === e.aspectRatio ? [] : [`el paso de imagen ${d.plan.aspectRatio === null ? `no lleva aspectRatio (entrada: ${lista(d.plan.entradaDeImagen)})` : `lleva ${d.plan.aspectRatio}`}; esperado ${e.aspectRatio}`], caso);
  },
  /* La pieza que lleva texto dentro lo pide y el modelo elegido lo escribe (CL-15). Conocido: depende de D4. */
  'design/texto-en-imagen': (d, e, caso) => {
    if (e.textoEnImagen !== true) return null;
    if (!d.plan) return veredicto([sinPlan(d)], caso);
    const i = d.plan.imagen;
    if (!i) return veredicto(['el plan no tiene paso de imagen'], caso);
    const fallos = [];
    if (!i.pideTexto) fallos.push(`el paso de imagen es de tipo «${d.plan.kind}» y no pide texto dentro de la imagen`);
    if (!i.escribeTexto) fallos.push(`el modelo elegido (nivel ${i.nivel}) no escribe texto`);
    return veredicto(fallos, caso);
  },
  /* Una referencia de estilo que sube la persona se USA: la capacidad del paso de imagen admite foto de entrada (CL-16). Conocido: depende de D6. */
  'design/referencia': (d, e, caso) => {
    if (e.usaReferencia !== true) return null;
    if (!d.plan) return veredicto([sinPlan(d)], caso);
    const capacidad = d.plan.pasos.find((p) => p.capacidad.startsWith('image.'));
    return veredicto(d.plan.aceptaReferencia === true ? [] : [`el paso de imagen (${capacidad ? capacidad.capacidad : 'ninguno'}) no admite foto de entrada: una referencia se sube y se ignora`], caso);
  },
};

export const GRADERS = Object.freeze(Object.keys(CATALOGO));

const calificarDesign = (decision, caso) => {
  const res = [];
  for (const [id, fn] of Object.entries(CATALOGO)) {
    const r = fn(decision, caso.expected || {}, caso);
    if (r) res.push({ id, dimension: DIMENSION_DE_GRADER_DESIGN[id], ok: r.ok, detail: r.detail });
  }
  return res;
};

/* ── La forma de un caso ─────────────────────────────────────────────────────────────────────────────────────────── */

/** Las claves de `expected` que este dominio entiende, y de qué grader es cada una. */
export const CLAVES_ESPERADAS = Object.freeze({
  inferido: 'design/deduce', noInferido: 'design/deduce', sinRepreguntar: 'design/sin-repreguntar', noSe: 'design/no-se',
  encargoLimpio: 'design/encargo-limpio', espera: 'design/espera', capacidades: 'design/plan', propuestas: 'design/propuestas',
  sueloDeCoste: 'design/suelo-de-coste', aspectRatio: 'design/aspect-ratio', textoEnImagen: 'design/texto-en-imagen', usaReferencia: 'design/referencia',
});
const CAMPOS_DE_CASO = ['evalCaseId', 'name', 'description', 'tags', 'expected', 'goal', 'presets', 'respuestas', 'referencia', 'hueco', 'cierre', 'decision', 'conocido'];
/** Las decisiones del dueño de las que depende un caso conocido (docs/DESIGN.md §4). */
const DECISIONES_DE_CASOS_CONOCIDOS = ['D4', 'D5', 'D6'];

const esMapaDeTextos = (m) => Boolean(m) && typeof m === 'object' && !Array.isArray(m)
  && Object.entries(m).every(([k, v]) => k.length > 0 && typeof v === 'string' && v.trim().length > 0);
const esListaDeTextos = (l) => Array.isArray(l) && l.length > 0 && l.every((x) => typeof x === 'string' && x.length > 0);

const validarCasoDesign = (caso) => {
  const id = caso.evalCaseId || '?';
  const e = [];
  for (const k of Object.keys(caso)) if (!CAMPOS_DE_CASO.includes(k)) e.push(`${id}: campo desconocido: ${k}`);
  if (typeof caso.goal !== 'string') e.push(`${id}: goal, un texto (puede ir vacío)`);
  for (const campo of ['presets', 'respuestas']) if (campo in caso && !esMapaDeTextos(caso[campo])) e.push(`${id}: ${campo}, un objeto de textos no vacíos`);
  if ('referencia' in caso && caso.referencia !== true) e.push(`${id}: referencia, solo true (la persona subió una foto)`);
  if ('hueco' in caso && !/^H-\d+$/.test(String(caso.hueco))) e.push(`${id}: hueco, del estilo H-2`);
  if ('cierre' in caso && !/^CL-\d\d$/.test(String(caso.cierre))) e.push(`${id}: cierre, del estilo CL-14`);
  if ('decision' in caso && !DECISIONES_DE_CASOS_CONOCIDOS.includes(caso.decision)) e.push(`${id}: decision, una de ${DECISIONES_DE_CASOS_CONOCIDOS.join(', ')}`);
  if ('conocido' in caso && caso.conocido !== true) e.push(`${id}: conocido, solo true`);
  if (caso.conocido === true && !caso.decision) e.push(`${id}: un caso conocido dice de qué decisión del dueño depende`);
  if (caso.decision && caso.conocido !== true) e.push(`${id}: una decisión del dueño solo la lleva un caso conocido`);
  const esperado = caso.expected && typeof caso.expected === 'object' ? caso.expected : {};
  const ks = Object.keys(esperado);
  for (const k of ks) if (!(k in CLAVES_ESPERADAS)) e.push(`${id}: expected.${k} no es de este dominio (${Object.keys(CLAVES_ESPERADAS).join(', ')})`);
  if (!ks.some((k) => k in CLAVES_ESPERADAS)) e.push(`${id}: ningún expected.* activa un grader`);
  for (const k of ['inferido', 'noInferido']) if (k in esperado && !esMapaDeTextos(esperado[k])) e.push(`${id}: expected.${k}, un objeto de textos no vacíos`);
  if ('noSe' in esperado && !esListaDeTextos(esperado.noSe)) e.push(`${id}: expected.noSe, una lista de ids de pregunta`);
  if ('capacidades' in esperado && !esListaDeTextos(esperado.capacidades)) e.push(`${id}: expected.capacidades, una lista de capacidades`);
  for (const k of ['sinRepreguntar', 'encargoLimpio', 'sueloDeCoste', 'textoEnImagen', 'usaReferencia']) if (k in esperado && esperado[k] !== true) e.push(`${id}: expected.${k}, solo true`);
  for (const k of ['espera', 'aspectRatio']) if (k in esperado && (typeof esperado[k] !== 'string' || !esperado[k])) e.push(`${id}: expected.${k}, un texto`);
  if ('propuestas' in esperado && !(Number.isInteger(esperado.propuestas) && esperado.propuestas > 0)) e.push(`${id}: expected.propuestas, un entero positivo`);
  if (esperado.usaReferencia === true && caso.referencia !== true) e.push(`${id}: usaReferencia exige referencia: true (la foto que sube la persona)`);
  return e;
};

/* ── El dominio ──────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * El dominio de Design sobre una `lib` (la de este árbol por omisión, y solo se carga al decidir el primer caso, no al
 * registrarlo). Pasar otra —la de otra rama, o la de esta con una pieza cambiada— es lo que permite comparar y sabotear.
 */
export const crearDominioDesign = (fuente = () => cargarLib()) => {
  let lib = null;
  const dela = () => { if (lib === null) lib = typeof fuente === 'function' ? fuente() : fuente; return lib; };
  return Object.freeze({
    id: 'design',
    descripcion: 'La experiencia `design` del servidor (deducción, preguntas, plan y precio de lista) con lo que ya existe, sin ejecutar adaptadores ($0).',
    decidir: (caso) => decidirDesign(dela(), caso),
    calificar: (decision, caso) => calificarDesign(decision, caso),
    validarCaso: (caso) => validarCasoDesign(caso),
    claveDeCaso: (caso) => hashCanonico({ goal: caso.goal, presets: caso.presets || {}, respuestas: caso.respuestas || {}, referencia: caso.referencia === true }).slice(0, 24),
  });
};

export const dominioDesign = crearDominioDesign();
