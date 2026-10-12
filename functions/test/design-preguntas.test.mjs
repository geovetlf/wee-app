/*
 * WEË DESIGN · «NO SÉ» EN LAS SEIS PREGUNTAS CON BOTONES
 * (ronda R7-Design, tarea S, 2026-10-11: CL-10 de `docs/WEE-DESIGN-CIERRE.md` §8, hallazgo H-2).
 *
 *   node test/design-preguntas.test.mjs        (usa el compilado: `npm run build` antes)
 *
 * Seis preguntas de la plantilla `design` (`functions/src/creator/templates.ts`) —`what`, `message`, `item`, `machine`,
 * `place` y `who`— tenían botones y no ofrecían «🤷 No sé», contra la regla de producto («Weë es didáctico: pregunta con
 * opciones y SIEMPRE con No sé»). En la app la pregunta guiada no tiene caja de texto (se retiró el 2026-09-15): sin ese
 * botón, quien no sabía solo podía elegir una opción al azar. Y si un `idk` llegaba a esas preguntas —las respuestas no
 * se validan contra los botones—, el encargo que recibía el modelo decía «una pieza para anunciar idk».
 *
 * Esta suite se escribió ANTES del arreglo y se vio en rojo. Qué NO hace: no decide ninguna cuestión de producto
 * (formato, texto dentro de la imagen, referencias: D4, D5, D6), no cambia ni el número de formas de plan ni el de
 * pasos, y no toca precios ni Credits. Solo lectura: sin red, sin emulador, sin proveedor (el planificador de
 * plantillas no llama a nadie).
 *
 *  A · Toda pregunta con botones lleva «No sé», una sola y la última.
 *  B · Cada «No sé» llega a un plan VÁLIDO, con su precio y con la frase que dice que Weë eligió.
 *  C · El «No sé» no pierde ni repite lo que viene después, ni lo que ya se había deducido.
 *  D · `infer` no confunde un «No sé» con la respuesta de otra cosa.
 *  E · Lo mismo por el callable de verdad (`creatorChat`, con una Firestore en memoria): pregunta, «No sé», plan y precio.
 *  F · El barrido de todos los planes de Design, con el planificador de verdad.
 *  G · La suite está en la cadena.
 *
 * (Su hermana, `design-infer-marca.test.mjs`, es la de CL-11: «marca» no gana a las palabras fuertes de `infer`.)
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } from './_firestore-en-memoria.mjs';
import { apuntarLaConsola } from './_aceptacion.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  // Por `process.stdout`, no por `console`: la sección E apunta la consola del servidor para que su ruido no se mezcle.
  process.stdout.write((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '') + '\n');
  if (!cond) failures++;
};
const titulo = (t) => process.stdout.write(`\n── ${t} ──\n`);

const base = new BaseEnMemoria();
const deshacerLaBase = instalarLaBase(() => base);

const { TEMPLATES } = lib('creator/templates.js');
const { templatePlanner, respuestaPara } = lib('creator/planner.js');
const { estimatePlan } = lib('creator/credits.js');
const { serviceForCapability, CREDIT_COSTS } = lib('credits/creditCosts.js');
const { buildImagePrompt, buildTextPrompt } = lib('creator/prompts.js');
const { todosLosPlanes } = await import(pathToFileURL(path.resolve(aqui, '_planes.mjs')).href);

const design = TEMPLATES.design;
const gateway = { userId: 'u', jobId: 'j', record: async () => {} };

/** Las seis preguntas que no ofrecían «No sé» (H-2) y la intención de la que cuelgan. */
const LAS_SEIS = ['what', 'message', 'item', 'machine', 'place', 'who'];
/** La coletilla que Weë añade cuando es ÉL quien elige (la de las demás experiencias, `decided` en templates.ts). */
const ELIJO = 'Como no estabas seguro, elijo yo qué diseñar.';

/** Qué preguntas con botones no ofrecen «No sé»: lo mismo que mide el corredor (CL-10 de `_design-cierre.mjs`), escrito aquí para que esta suite no dependa de él. */
const sinNoSe = (preguntas) => preguntas.filter((q) => (q.options || []).length > 0 && !q.options.some((o) => o.id === 'idk')).map((q) => q.id);

/**
 * La conversación entera con el planificador de plantillas —el mismo que usa `creatorChat`—: cada pregunta pendiente se
 * contesta con `elegidas[id]` y, si no hay nada elegido para ella, con «No sé»; una pregunta sin botones, escribiendo.
 * Devuelve lo deducido, lo preguntado, en qué orden, y el plan.
 */
const conversar = async (goal, elegidas = {}) => {
  let respuestas = [];
  let turno = await templatePlanner.next({ experienceId: 'design', goal, answers: respuestas, gateway });
  const deducidas = turno.inferred.map((a) => `${a.questionId}=${a.optionId ?? a.text}`);
  respuestas = [...respuestas, ...turno.inferred.map((a) => ({ questionId: a.questionId, optionId: a.optionId, text: a.text }))];
  const preguntadas = [];
  let vueltas = 0;
  while (turno.question && vueltas++ < 12) {
    const q = turno.question;
    preguntadas.push(q.id);
    respuestas = [...respuestas, q.options.length === 0 ? { questionId: q.id, text: 'La Espiga' } : { questionId: q.id, optionId: elegidas[q.id] ?? 'idk' }];
    turno = await templatePlanner.next({ experienceId: 'design', goal, answers: respuestas, gateway });
  }
  return { deducidas, preguntadas, plan: turno.plan, respuestas, atascada: !!turno.question };
};

/** Lo que tiene que cumplir CUALQUIER plan de Design, venga de donde venga: devuelve la lista de lo que no cumple. */
const problemasDelPlan = (plan) => {
  const malos = [];
  const pasos = plan?.steps ?? [];
  if (plan?.experience !== 'design') malos.push('experience');
  if (pasos.map((s) => `${s.id}:${s.capability}`).join('>') !== 'concept:text.generate>images:image.generate') malos.push(`forma ${pasos.map((s) => s.id).join('>')}`);
  const imagenes = pasos.find((s) => s.id === 'images');
  if (!imagenes || imagenes.input?.count !== 3) malos.push('count');
  if (!imagenes || !['design', 'logo'].includes(imagenes.input?.kind)) malos.push('kind');
  if ((imagenes?.dependsOn || []).join() !== 'concept') malos.push('dependsOn');
  const textos = [plan?.explainToUser, ...pasos.flatMap((s) => [s.purpose, s.input?.brief])];
  if (textos.some((t) => typeof t !== 'string' || !t.trim())) malos.push('texto vacío');
  if (textos.some((t) => /\bidk\b|undefined|null|NaN|\[object/.test(String(t)))) malos.push('un valor interno llega al texto');
  if (typeof plan?.explainToUser !== 'string' || !/\S\.$/.test(plan.explainToUser)) malos.push('la explicación no termina en frase');
  if (/ {2}|, ,|,\.|\.\./.test(plan?.explainToUser ?? '')) malos.push('puntuación');
  return malos;
};

/* ═══ A · CL-10: TODA PREGUNTA CON BOTONES LLEVA «NO SÉ» ═══════════════════════════════════════════════════ */
titulo('A · CL-10 · toda pregunta con botones lleva «No sé»');
{
  const conBotones = design.questions.filter((q) => q.options.length > 0);
  check('A1) toda pregunta de `design` con botones ofrece «🤷 No sé» (id `idk`)', sinNoSe(design.questions).length === 0, sinNoSe(design.questions).join(' · ') || `${conBotones.length} preguntas`);
  check('A2) las seis que no lo ofrecían lo ofrecen ahora', LAS_SEIS.every((id) => design.questions.find((q) => q.id === id).options.some((o) => o.id === 'idk')),
    LAS_SEIS.filter((id) => !design.questions.find((q) => q.id === id).options.some((o) => o.id === 'idk')).join(' · '));
  check('A3) una sola y la última, como en las otras seis preguntas (el botón punteado va al final de la lista)',
    conBotones.every((q) => q.options.filter((o) => o.id === 'idk').length === 1 && q.options[q.options.length - 1].id === 'idk'),
    conBotones.filter((q) => q.options[q.options.length - 1].id !== 'idk' || q.options.filter((o) => o.id === 'idk').length !== 1).map((q) => q.id).join(' · '));
  const etiquetaDe = (id) => design.questions.find((q) => q.id === id).options.find((o) => o.id === 'idk')?.label;
  check('A4) con la misma etiqueta de siempre, «🤷 No sé» (la regla es literal; no «Sorpréndeme» ni otra cosa)',
    conBotones.every((q) => etiquetaDe(q.id) === '🤷 No sé'), conBotones.map((q) => `${q.id}=${etiquetaDe(q.id)}`).join(' · '));
  check('A5) la pregunta sin botones (el nombre de la marca) no se inventa un «No sé»: se contesta escribiendo',
    design.questions.find((q) => q.id === 'name').options.length === 0);
  check('A6) y nada de lo demás cambió: los seis caminos y las opciones de cada pregunta siguen en su orden',
    design.questions.find((q) => q.id === 'what').options.filter((o) => o.id !== 'idk').map((o) => o.id).join() === 'logo,poster,product,object,scene,character'
    && design.questions.find((q) => q.id === 'message').options.filter((o) => o.id !== 'idk').map((o) => o.id).join() === 'promo,event,launch,news'
    && design.questions.find((q) => q.id === 'item').options.filter((o) => o.id !== 'idk').map((o) => o.id).join() === 'pack,furniture,clothes,gadget'
    && design.questions.find((q) => q.id === 'machine').options.filter((o) => o.id !== 'idk').map((o) => o.id).join() === 'car,air,bike,engine'
    && design.questions.find((q) => q.id === 'place').options.filter((o) => o.id !== 'idk').map((o) => o.id).join() === 'house,shop,city,nature'
    && design.questions.find((q) => q.id === 'who').options.filter((o) => o.id !== 'idk').map((o) => o.id).join() === 'mascot,hero,robot,creature');
  /* Un preset «No sé» ya vale para estas preguntas (antes `respuestaPara` lo descartaba por no ser un botón). */
  check('A7) y un `idk` que llega como respuesta previa vale en las seis (la misma regla que para cualquier botón) y un id inventado, no',
    LAS_SEIS.every((id) => respuestaPara(design.questions.find((q) => q.id === id), 'idk')?.optionId === 'idk')
    && respuestaPara(design.questions.find((q) => q.id === 'what'), 'inventado') === null);

  /*
   * CONTROL: el detector ve la falta, venga el estado que venga. Se parte de una copia en la que TODA pregunta con botones
   * lleva el «No sé» de `feel` (el detector no ve nada), y a una sola se le quita (el detector tiene que señalar justo esa).
   */
  const noSe = design.questions.find((q) => q.id === 'feel').options.find((o) => o.id === 'idk');
  const completas = design.questions.map((q) => (q.options.length ? { ...q, options: [...q.options.filter((o) => o.id !== 'idk'), noSe] } : q));
  const sinUna = completas.map((q) => (q.id === 'item' ? { ...q, options: q.options.filter((o) => o.id !== 'idk') } : q));
  check('CONTROL · el detector de A1 no ve nada en una plantilla completa y señala la pregunta a la que se le quita el «No sé»',
    sinNoSe(completas).length === 0 && sinNoSe(sinUna).join() === 'item', `${sinNoSe(completas).join() || 'nada'} | ${sinNoSe(sinUna).join()}`);
}

/* ═══ B · CADA «NO SÉ» LLEGA A UN PLAN VÁLIDO, CON SU PRECIO Y SU FRASE ═════════════════════════════════════ */
titulo('B · cada «No sé» llega a un plan válido, con su precio y la frase de que Weë eligió');
/*
 * Lo que dice cada plan es el valor que la plantilla YA traía para «no contestó» (`|| 'un producto'`, `|| 'un vehículo'`,
 * `'una pieza para redes'`, `'lo que me describiste'`): nada inventado. Lo nuevo es que ahora se alcanza, y que Weë lo
 * dice. La frase `ELIJO` es una sola para las seis porque en las seis hace lo mismo: elige qué diseñar a partir de lo que
 * la persona contó (el paso del concepto lo decide).
 */
const CASOS = [
  { nombre: 'qué necesita (what)', elegidas: { what: 'idk' }, preguntas: ['what'], brief: 'lo que me describiste', explica: `Voy a crear 3 propuestas de lo que me describiste. ${ELIJO}` },
  { nombre: 'qué anunciar (message), sin más', elegidas: { what: 'poster', message: 'idk' }, preguntas: ['what', 'message', 'where'], brief: 'una pieza para redes', explica: `Voy a crear 3 propuestas para anunciar algo. ${ELIJO}` },
  { nombre: 'qué anunciar (message), para una historia', elegidas: { what: 'poster', message: 'idk', where: 'story' }, preguntas: ['what', 'message', 'where'], brief: 'una pieza para redes, en vertical, para una historia', explica: `Voy a crear 3 propuestas para anunciar algo, en vertical, para una historia. ${ELIJO}` },
  { nombre: 'qué producto (item), sin más', elegidas: { what: 'product', item: 'idk' }, preguntas: ['what', 'item', 'look'], brief: 'un producto', explica: `Voy a crear 3 propuestas de un producto. ${ELIJO}` },
  { nombre: 'qué producto (item), moderno y limpio', elegidas: { what: 'product', item: 'idk', look: 'clean' }, preguntas: ['what', 'item', 'look'], brief: 'un producto, de aspecto moderno y limpio', explica: `Voy a crear 3 propuestas de un producto, de aspecto moderno y limpio. ${ELIJO}` },
  { nombre: 'qué vehículo (machine), sin más', elegidas: { what: 'object', machine: 'idk' }, preguntas: ['what', 'machine', 'era'], brief: 'un vehículo', explica: `Voy a crear 3 propuestas de un vehículo. ${ELIJO}` },
  { nombre: 'qué vehículo (machine), del futuro', elegidas: { what: 'object', machine: 'idk', era: 'future' }, preguntas: ['what', 'machine', 'era'], brief: 'un vehículo, del futuro', explica: `Voy a crear 3 propuestas de un vehículo, del futuro. ${ELIJO}` },
  { nombre: 'qué lugar (place), sin más', elegidas: { what: 'scene', place: 'idk' }, preguntas: ['what', 'place', 'inout'], brief: 'un lugar', explica: `Voy a crear 3 propuestas de un lugar. ${ELIJO}` },
  { nombre: 'qué lugar (place), por dentro', elegidas: { what: 'scene', place: 'idk', inout: 'inside' }, preguntas: ['what', 'place', 'inout'], brief: 'un lugar, por dentro', explica: `Voy a crear 3 propuestas de un lugar, por dentro. ${ELIJO}` },
  { nombre: 'qué personaje (who), sin más', elegidas: { what: 'character', who: 'idk' }, preguntas: ['what', 'who', 'draw'], brief: 'un personaje', explica: `Voy a crear 3 propuestas de un personaje. ${ELIJO}` },
  { nombre: 'qué personaje (who), de dibujo animado', elegidas: { what: 'character', who: 'idk', draw: 'cartoon' }, preguntas: ['what', 'who', 'draw'], brief: 'un personaje, en estilo de dibujo animado', explica: `Voy a crear 3 propuestas de un personaje, en estilo de dibujo animado. ${ELIJO}` },
];
const GOAL_NEUTRO = 'Quiero diseñar algo';
{
  const hechos = [];
  for (const c of CASOS) hechos.push({ c, r: await conversar(GOAL_NEUTRO, c.elegidas) });

  check('B1) cada «No sé» llega a un plan, sin quedarse preguntando', hechos.every(({ r }) => !!r.plan && !r.atascada), hechos.filter(({ r }) => !r.plan || r.atascada).map(({ c }) => c.nombre).join(' · '));
  check('B2) y el plan es válido: concepto + tres propuestas, ningún valor interno («idk», «undefined») en lo que lee la persona ni en lo que se le manda al modelo',
    hechos.every(({ r }) => r.plan && problemasDelPlan(r.plan).length === 0),
    hechos.filter(({ r }) => !r.plan || problemasDelPlan(r.plan).length).map(({ c, r }) => `${c.nombre}: ${r.plan ? problemasDelPlan(r.plan).join(', ') : 'sin plan'} («${r.plan?.explainToUser}»)`).join(' | '));
  check('B3) la explicación dice lo que Weë va a hacer y, DESPUÉS, que ha elegido él («Como no estabas seguro, …»)',
    hechos.every(({ c, r }) => r.plan?.explainToUser === c.explica),
    hechos.filter(({ c, r }) => r.plan?.explainToUser !== c.explica).map(({ c, r }) => `${c.nombre}: «${r.plan?.explainToUser}»`).join(' | '));
  check('B4) y al modelo le llega el valor que la plantilla ya traía para «no contestó», no uno nuevo',
    hechos.every(({ c, r }) => r.plan?.steps.find((s) => s.id === 'images')?.input.brief === c.brief && r.plan?.steps.find((s) => s.id === 'concept')?.input.brief === c.brief),
    hechos.filter(({ c, r }) => r.plan?.steps.find((s) => s.id === 'images')?.input.brief !== c.brief).map(({ c, r }) => `${c.nombre}: «${r.plan?.steps.find((s) => s.id === 'images')?.input.brief}»`).join(' | '));
  check('B5) ninguno es un logo (no se inventa una intención): el paso de imágenes es de tipo `design`',
    hechos.every(({ r }) => r.plan?.steps.find((s) => s.id === 'images')?.input.kind === 'design'));
  check('B6) y el prompt que de verdad se arma para el modelo no lleva «idk» (texto del concepto y de las imágenes)',
    hechos.every(({ r }) => {
      const p = r.plan;
      if (!p) return false;
      const paso = (id) => p.steps.find((s) => s.id === id);
      const texto = buildTextPrompt('design', 'concept', paso('concept').input.brief, GOAL_NEUTRO, paso('concept').purpose, [], 'es');
      const imagen = buildImagePrompt('design', 'design', paso('images').input.brief, GOAL_NEUTRO, paso('images').purpose, []);
      return !/\bidk\b/.test(`${texto.system} ${texto.prompt} ${imagen}`);
    }));

  /* El precio: cada plan se cotiza, el total es la suma de sus pasos y cada paso tiene un servicio con precio. */
  const sinPrecio = [];
  for (const { c, r } of hechos) {
    if (!r.plan) { sinPrecio.push(`${c.nombre}: sin plan`); continue; }
    const e = await estimatePlan(r.plan, 'u_prueba');
    const suma = e.steps.reduce((a, s) => a + s.credits, 0);
    const servicios = r.plan.steps.map((s) => serviceForCapability(s.capability, s.input || {}));
    if (!(e.total > 0) || e.total !== suma || e.steps.length !== r.plan.steps.length || servicios.some((s) => !s || !(CREDIT_COSTS[s] > 0))) sinPrecio.push(`${c.nombre}: total ${e.total}, suma ${suma}`);
  }
  check('B7) cada plan trae su precio ANTES de crear: el total es la suma de los pasos, mayor que cero, y cada paso tiene su servicio', sinPrecio.length === 0, sinPrecio.join(' | ') || `${hechos.length} planes`);
  /* La FORMA del plan no cambia: ni un paso nuevo, ni una forma nueva. Los pines «35 formas / 74 pasos» de las suites de Chef y de Brain dependen de esto. */
  const formaDe = (plan) => plan.steps.map((s) => `${s.capability}:${s.input?.kind ?? ''}`).join('>');
  check('B8) la forma del plan es la de siempre (texto → imagen), la misma que la de elegir un botón: ni un paso ni una forma nuevos',
    hechos.every(({ r }) => r.plan && formaDe(r.plan) === 'text.generate:concept>image.generate:design'));

  /* CONTROL: el validador ve un valor interno que se cuela y una forma que no es la de siempre. */
  const buenos = hechos[0].r.plan;
  const conFuga = { ...buenos, steps: buenos.steps.map((s) => (s.id === 'images' ? { ...s, input: { ...s.input, brief: 'una pieza para anunciar idk' } } : s)) };
  const sinPaso = { ...buenos, steps: buenos.steps.slice(0, 1) };
  check('CONTROL · el validador del plan señala un «idk» que se cuela en el encargo y un plan al que le falta un paso',
    problemasDelPlan(conFuga).includes('un valor interno llega al texto') && problemasDelPlan(sinPaso).some((p) => p.startsWith('forma')), `${problemasDelPlan(conFuga)} | ${problemasDelPlan(sinPaso)}`);
}

/* ═══ C · EL «NO SÉ» NO PIERDE NI REPITE LO QUE VIENE DESPUÉS ═══════════════════════════════════════════════ */
titulo('C · el «No sé» no pierde ni repite lo que viene después, ni lo ya deducido');
{
  const repite = (ids) => ids.filter((id, i) => ids.indexOf(id) !== i);
  const todas = [];
  for (const c of CASOS) todas.push({ c, r: await conversar(GOAL_NEUTRO, c.elegidas) });
  check('C1) ninguna conversación hace dos veces la misma pregunta', todas.every(({ r }) => repite(r.preguntadas).length === 0), todas.filter(({ r }) => repite(r.preguntadas).length).map(({ c }) => c.nombre).join(' · '));
  check('C2) tras un «No sé» sigue la pregunta que le tocaba a esa intención —no se pierde— y ninguna de otra',
    todas.every(({ c, r }) => r.preguntadas.join() === c.preguntas.join()), todas.filter(({ c, r }) => r.preguntadas.join() !== c.preguntas.join()).map(({ c, r }) => `${c.nombre}: ${r.preguntadas}`).join(' | '));
  /* «No sé qué necesitas» no es ninguna intención: no se le hacen las preguntas de otra. */
  const pide = (answers) => design.questions.filter((q) => !q.when || q.when(answers)).map((q) => q.id).filter((id) => !(id in answers));
  check('C3) con «No sé» en la primera pregunta no queda nada por preguntar (ningún `when` de una intención ajena se activa)', pide({ what: 'idk' }).length === 0, pide({ what: 'idk' }).join());
  check('C4) y con «No sé» en cada una de las otras cinco queda exactamente la segunda pregunta de su intención',
    pide({ what: 'poster', message: 'idk' }).join() === 'where' && pide({ what: 'product', item: 'idk' }).join() === 'look' && pide({ what: 'object', machine: 'idk' }).join() === 'era'
    && pide({ what: 'scene', place: 'idk' }).join() === 'inout' && pide({ what: 'character', who: 'idk' }).join() === 'draw');

  /* Lo que la persona ya dijo no se vuelve a preguntar, ni se pierde del plan. */
  const futuro = await conversar('Un deportivo del futuro', { what: 'object', machine: 'idk' });
  check('C5) «Un deportivo del futuro» + «No sé» al vehículo: la época ya se deduce, no se pregunta, y se queda en el plan',
    futuro.deducidas.join() === 'era=future' && futuro.preguntadas.join() === 'what,machine'
    && futuro.plan?.explainToUser === `Voy a crear 3 propuestas de un vehículo, del futuro. ${ELIJO}`, `${futuro.deducidas} · ${futuro.preguntadas} · «${futuro.plan?.explainToUser}»`);
  const dentro = await conversar('Algo por dentro, como una sala', { what: 'scene', place: 'idk' });
  check('C6) «por dentro» ya se deduce: tras «No sé» al lugar no se pregunta si es interior o exterior, y se queda en el plan',
    dentro.deducidas.includes('inout=inside') && dentro.preguntadas.join() === 'what,place' && /un lugar, por dentro\./.test(dentro.plan?.explainToUser ?? ''), `${dentro.deducidas} · ${dentro.preguntadas} · «${dentro.plan?.explainToUser}»`);
  /* «personaje» ya deduce la intención y «dibujo animado», el trazo: lo único que queda por preguntar es quién. */
  const trazo = await conversar('Un personaje en dibujo animado', { who: 'idk' });
  check('C7) y el trazo dicho con palabras tampoco se repite tras «No sé» al personaje (ni la intención, que también se deduce)',
    trazo.deducidas.join() === 'what=character,draw=cartoon' && trazo.preguntadas.join() === 'who' && /de un personaje, en estilo de dibujo animado\./.test(trazo.plan?.explainToUser ?? ''), `${trazo.deducidas} · ${trazo.preguntadas} · «${trazo.plan?.explainToUser}»`);

  /* La puerta «No sé qué diseñar»: la persona llega con esta frase, sin ninguna respuesta puesta (a propósito). */
  const puerta = await conversar('Quiero diseñar algo pero no sé qué', { what: 'idk' });
  check('C8) por la puerta «No sé qué diseñar»: no se deduce nada, la primera pregunta es «qué necesitas», y con «No sé» llega a un plan sin más preguntas',
    puerta.deducidas.length === 0 && puerta.preguntadas.join() === 'what' && !!puerta.plan && problemasDelPlan(puerta.plan).length === 0, `${puerta.deducidas} · ${puerta.preguntadas}`);
  const primera = await templatePlanner.next({ experienceId: 'design', goal: 'Quiero diseñar algo pero no sé qué', answers: [], gateway });
  check('C9) y esa primera pregunta ofrece los seis caminos Y «No sé», para quien tampoco sabe por dónde empezar',
    primera.question?.id === 'what' && primera.question.options.length === 7 && primera.question.options[6].id === 'idk', primera.question?.options.map((o) => o.id).join());
}

/* ═══ D · `infer` NO CONFUNDE UN «NO SÉ» CON LA RESPUESTA DE OTRA COSA ═════════════════════════════════════ */
titulo('D · `infer` no trata un «No sé» como respuesta de otra cosa');
{
  const NO_SABER = ['No sé', 'No sé qué diseñar', 'Quiero diseñar algo pero no sé qué', 'No tengo idea de qué hacer', '🤷 No sé', 'idk', 'I don’t know what to design', ''];
  check('D1) ninguna frase de quien no sabe deduce nada (ni una intención ni un matiz)', NO_SABER.every((f) => Object.keys(design.infer(f)).length === 0),
    NO_SABER.filter((f) => Object.keys(design.infer(f)).length).map((f) => `«${f}» → ${JSON.stringify(design.infer(f))}`).join(' | '));
  const sinIdk = NO_SABER.concat(CASOS.map((c) => c.nombre), 'Un post para mi marca', 'Una mascota para mi marca').every((f) => !Object.values(design.infer(f)).includes('idk'));
  check('D2) y `infer` nunca devuelve «idk» como respuesta: lo deducido es siempre una opción real', sinIdk);
  const real = await templatePlanner.next({ experienceId: 'design', goal: 'No sé qué diseñar', answers: [], gateway });
  check('D3) el planificador, con «No sé qué diseñar», no da nada por respondido y pregunta `what`', real.inferred.length === 0 && real.question?.id === 'what', `${real.inferred.length} deducidas · ${real.question?.id}`);
}

/* ═══ E · POR EL CALLABLE DE VERDAD ═══════════════════════════════════════════════════════════════════════ */
titulo('E · por el callable de verdad: pregunta → «No sé» → plan con precio, sin tocar el saldo');
{
  /*
   * `creatorChat` COMPILADO, con el Credit Engine de verdad y una Firestore en memoria (la de las suites de aceptación):
   * lo único que se sustituye es el sitio donde se guardan los documentos. Es lo que hace la app cuando la persona toca
   * «No sé qué diseñar» y, después, «🤷 No sé». Ningún proveedor: elegir y mirar el plan no llama a nadie.
   */
  const consola = apuntarLaConsola();
  const creator = lib('creator/index.js');
  const ANA = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
  await darDeAlta(base, ANA);
  const inicial = saldoDe(base, ANA);
  const chat = (data) => creator.creatorChat.run({ auth: { uid: ANA }, data });
  const usos = () => base.de('creditTransactions').filter((t) => t.type === 'usage').length;
  const sumaDe = (xs) => xs.reduce((a, b) => a + b, 0);

  const primera = await chat({ experienceId: 'design', goal: 'Quiero diseñar algo pero no sé qué', locale: 'es' });
  check('E1) por la puerta «No sé qué diseñar» el servidor pregunta «qué necesitas» y ofrece los seis caminos y, al final, «No sé»',
    primera.status === 'asking' && primera.question?.id === 'what' && primera.question.options.map((o) => o.id).join() === 'logo,poster,product,object,scene,character,idk',
    `${primera.status} · ${primera.question?.id} · ${primera.question?.options.map((o) => o.id)}`);
  const plan = await chat({ jobId: primera.jobId, answer: { questionId: 'what', optionId: 'idk' }, locale: 'es' });
  check('E2) con «No sé» el servidor lo acepta, no vuelve a preguntar y devuelve un plan válido con la frase de que eligió él',
    plan.status === 'planned' && !plan.question && problemasDelPlan(plan.plan).length === 0
    && plan.plan.explainToUser === `Voy a crear 3 propuestas de lo que me describiste. ${ELIJO}`, `${plan.status} · «${plan.plan?.explainToUser}»`);
  const p = plan.pricing;
  check('E3) con su precio ANTES de crear —el total es la suma de los pasos y lo estimado del trabajo—, y mirarlo no cuesta nada',
    !!p && p.total > 0 && p.total === sumaDe(p.steps.map((s) => s.credits)) && p.total === plan.creditsEstimated && p.steps.length === plan.plan.steps.length
    && saldoDe(base, ANA) === inicial && usos() === 0, p && `total ${p.total}`);
  check('E4) y la respuesta queda guardada en el trabajo tal cual («idk»), junto a su pregunta',
    base.leer(`creatorJobs/${plan.jobId}`)?.answers.some((a) => a.questionId === 'what' && a.optionId === 'idk')
    && base.leer(`creatorJobs/${plan.jobId}`)?.questions.some((q) => q.id === 'what'));

  /* Otro camino: elige «Algo para redes» y no sabe qué anunciar ni dónde publicarlo. */
  const afiche = await chat({ experienceId: 'design', goal: 'Diseñar una pieza para redes o publicidad', presetAnswers: [{ questionId: 'what', optionId: 'poster' }], locale: 'es' });
  const sinAnuncio = await chat({ jobId: afiche.jobId, answer: { questionId: 'message', optionId: 'idk' }, locale: 'es' });
  check('E5) tras «No sé» a «¿qué quieres anunciar?» sigue la pregunta de dónde publicarlo (no se pierde)', afiche.question?.id === 'message' && sinAnuncio.status === 'asking' && sinAnuncio.question?.id === 'where',
    `${afiche.question?.id} → ${sinAnuncio.question?.id}`);
  const final = await chat({ jobId: afiche.jobId, answer: { questionId: 'where', optionId: 'idk' }, locale: 'es' });
  check('E6) y con «No sé» también a esa llega a un plan válido, con precio, sin gastar un Credit',
    final.status === 'planned' && problemasDelPlan(final.plan).length === 0 && final.plan.explainToUser === `Voy a crear 3 propuestas para anunciar algo. ${ELIJO}`
    && final.pricing?.total > 0 && saldoDe(base, ANA) === inicial && usos() === 0, `«${final.plan?.explainToUser}»`);
  consola.restaurar();
}

/* ═══ F · EL BARRIDO: TODOS LOS PLANES DE DESIGN, CON EL PLANIFICADOR DE VERDAD ════════════════════════════ */
titulo('F · el barrido de todos los planes de Design');
{
  const planes = (await todosLosPlanes()).filter((p) => p.experienceId === 'design');
  const conNoSe = (p) => p.answers.some((a) => LAS_SEIS.includes(a.questionId) && a.optionId === 'idk');
  const malos = planes.filter((p) => problemasDelPlan(p.plan).length > 0);
  check(`F1) ninguno de los ${planes.length} planes posibles de Design deja escapar un valor interno ni se sale de la forma de siempre`, malos.length === 0,
    malos.slice(0, 3).map((p) => `${problemasDelPlan(p.plan)} («${p.plan.explainToUser}»)`).join(' | '));
  const conIdk = planes.filter(conNoSe);
  check('F2) hay planes con «No sé» en cada una de las seis preguntas (el barrido contesta cada pregunta con cada botón, «No sé» incluido)',
    LAS_SEIS.every((id) => conIdk.some((p) => p.answers.some((a) => a.questionId === id && a.optionId === 'idk'))), `${conIdk.length} planes con «No sé» en alguna de las seis`);
  check('F3) la frase «Como no estabas seguro» sale en todos los planes con «No sé» en una de las seis y en NINGUNO más (las otras «No sé» —el aire, el formato…— no la llevan)',
    planes.every((p) => p.plan.explainToUser.includes(ELIJO) === conNoSe(p)),
    planes.filter((p) => p.plan.explainToUser.includes(ELIJO) !== conNoSe(p)).slice(0, 3).map((p) => `${p.answers.map((a) => `${a.questionId}=${a.optionId ?? 'texto'}`)} → «${p.plan.explainToUser}»`).join(' | '));
  const formas = new Set(planes.map((p) => p.plan.steps.map((s) => `${s.capability}:${s.input?.kind ?? ''}`).join('>')));
  check('F4) el barrido produce solo dos formas de plan (el logo y todo lo demás), las mismas que antes de añadir los botones',
    [...formas].sort().join(' | ') === 'text.generate:concept>image.generate:design | text.generate:concept>image.generate:logo', [...formas].join(' | '));
}

/* ═══ G · LA SUITE ESTÁ EN LA CADENA ═══════════════════════════════════════════════════════════════════════ */
titulo('G · la suite está en la cadena');
check('G1) esta suite está en la cadena de `npm test`', /design-preguntas\.test\.mjs/.test(leer('functions/package.json')));

deshacerLaBase();
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
