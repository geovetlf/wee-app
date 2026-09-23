/*
 * WEË STUDIO CREA IMÁGENES DE VERDAD (B3.13).
 *
 * B3.12 dejó el puente hecho: la experiencia, el texto y los controles llegan a
 * la experiencia común. Pero llegar no es crear, y medirlo dio esto:
 *
 *   goal: "Retrato: Una mujer caminando por la Lima colonial · hora dorada…"
 *   → la plantilla `photo` deduce la acción de las PALABRAS del objetivo
 *   → «Retrato» no está entre las que significan «crear desde cero»
 *   → plan: vision.describe + image.edit
 *   → y `creatorRun` se planta: «Sube una foto para que Weë pueda trabajar»
 *
 * Es decir: las seis experiencias de imagen pedían una foto para EDITAR cuando
 * lo que la persona quería era una imagen NUEVA. No fallaba nada —no había
 * error, no había rojo—, simplemente Weë entendía otra cosa.
 *
 * Se arregla por el canal que existía para esto desde siempre: `presets`, las
 * respuestas que viajan con el trabajo nuevo, las mismas que usan las acciones
 * de los especialistas. Elegir «Retrato» ES contestar «créame una imagen».
 *
 *  A. Las seis declaran que crean.
 *  B. Y el plan que sale es de verdad el de crear. (EJECUTADO)
 *  C. Lo que ya se contestó no se vuelve a preguntar.
 *  D. Sigue sin haber un segundo pipeline.
 *  E. Lo que NO llega a la ejecución no se enseña como si llegara.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require_(path.resolve(here, '../lib/' + p));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const CAPAS = 'constants/studioExperiences.ts';
const STUDIO = 'screens/StudioScreen.tsx';
const capas = leer(CAPAS);
const studio = leer(STUDIO);

console.log('\n─── A. Las seis declaran que crean ───');

/* Las experiencias de imagen, leídas de su propia fuente. */
const bloqueImagen = capas.slice(
  capas.indexOf('export const EXPERIENCIAS_DE_IMAGEN'),
  capas.indexOf('export const EXPERIENCIAS_DE_VIDEO')
);
const ids = [...bloqueImagen.matchAll(/x\('([a-zA-Z]+)'/g)].map((m) => m[1]);
check('son las seis de B3.11, ni una más',
  JSON.stringify(ids) === JSON.stringify(['portrait', 'product', 'editorial', 'cinematic', 'social', 'poster']),
  ids.join(', '));

check('«crear una imagen» se escribe UNA vez', /const CREAR_IMAGEN = \{ questionId: 'action', optionId: 'generate' \} as const;/.test(capas));
/*
 * La declaración vive FUERA del bloque, así que aquí solo se cuentan los usos.
 * La primera versión esperaba siete y contaba seis: medía mal el guard, no el
 * código. Lo dijo su propio fallo.
 */
const usos = (bloqueImagen.match(/CREAR_IMAGEN/g) || []).length;
check('y las seis la llevan', usos === 6, `${usos} usos`);

/*
 * El trozo de CADA experiencia, del suyo al siguiente. Recortar «hasta N
 * caracteres» cruzaba de una a otra, y entonces el guard decía que el detalle
 * de Redes era de Cinematográfica.
 */
const trozoDe = (id) => {
  const i = bloqueImagen.indexOf(`x('${id}'`);
  if (i < 0) return '';
  const siguiente = ids
    .slice(ids.indexOf(id) + 1)
    .map((otro) => bloqueImagen.indexOf(`x('${otro}'`))
    .find((j) => j > i);
  return bloqueImagen.slice(i, siguiente > 0 ? siguiente : bloqueImagen.length);
};
const detalleDe = (id) => trozoDe(id).match(/questionId: 'detail', optionId: '([a-z]+)'/)?.[1];

/* Producto y Redes contestan además el cómo, porque ahí la respuesta es obvia. */
check('Producto pide fondo limpio', detalleDe('product') === 'clean', detalleDe('product') ?? 'ninguno');
check('Redes pide colores vivos', detalleDe('social') === 'vivid', detalleDe('social') ?? 'ninguno');
/* Y las otras cuatro NO lo dan por hecho: ahí preguntar es lo correcto. */
const conDetalle = ids.filter((id) => !!detalleDe(id));
check('y las otras cuatro dejan que Weë pregunte',
  JSON.stringify(conDetalle) === JSON.stringify(['product', 'social']), conDetalle.join(', ') || 'ninguna');

console.log('\n─── B. Y el plan que sale es el de crear. EJECUTADO ───');

/*
 * Aquí no se lee código: se construye el plan con la plantilla REAL y las
 * respuestas REALES que manda Weë Studio. Leer prueba que el código dice lo
 * correcto; ejecutar prueba que Weë entiende lo que la persona pidió.
 */
const { TEMPLATES } = lib('creator/templates.js');
/* Las respuestas que Weë Studio mandaría para esa experiencia, de su propio trozo. */
const respuestasDe = (id) => {
  const r = {};
  if (/CREAR_IMAGEN/.test(trozoDe(id))) r.action = 'generate';
  const d = detalleDe(id);
  if (d) r.detail = d;
  return r;
};

const GOALS = {
  portrait: 'Retrato: Una mujer caminando por la Lima colonial · hora dorada, primer plano',
  product: 'Producto: Una botella de perfume premium de vidrio negro sobre mármol',
  editorial: 'Editorial: Editorial de moda de lujo en una calle colonial de Lima',
  cinematic: 'Cinematográfica: Un callejón con neón bajo la lluvia',
  social: 'Redes: Una taza de café para Instagram',
  poster: 'Cartel: Un cartel para un concierto de jazz',
};

for (const id of ids) {
  const plan = TEMPLATES.photo.buildPlan(GOALS[id], respuestasDe(id));
  const capacidades = plan.steps.map((s) => s.capability);
  check(`${id}: el plan crea una imagen, no edita una foto`,
    capacidades.length === 1 && capacidades[0] === 'image.generate',
    capacidades.join(' + '));
  /* Y el texto de la persona llega al encargo del paso, entero. */
  check(`${id}: y lo que escribió llega al paso`,
    String(plan.steps[0].input.brief).includes(GOALS[id]),
    String(plan.steps[0].input.brief).slice(0, 52) + '…');
}

/* Las propuestas: alternativas equivalentes, y nunca más del techo. */
const planRetrato = TEMPLATES.photo.buildPlan(GOALS.portrait, respuestasDe('portrait'));
const { MAX_PROPUESTAS_POR_PASO } = lib('core/contracts.js');
check('pide propuestas alternativas, no copias', planRetrato.steps[0].input.count === 3, `count = ${planRetrato.steps[0].input.count}`);
check('y nunca más que el techo compartido', planRetrato.steps[0].input.count <= MAX_PROPUESTAS_POR_PASO, `techo = ${MAX_PROPUESTAS_POR_PASO}`);
check('y el plan dice lo que va a hacer antes de cobrar', /crear 3 imágenes/i.test(planRetrato.explainToUser), planRetrato.explainToUser.slice(0, 60) + '…');

/* CONTROL: sin las respuestas, el plan volvía a pedir una foto. Que es el fallo. */
const sinRespuestas = TEMPLATES.photo.buildPlan(GOALS.portrait, {});
check('CONTROL: sin las respuestas, el plan pedía una foto',
  sinRespuestas.steps.some((s) => s.capability === 'vision.describe'),
  sinRespuestas.steps.map((s) => s.capability).join(' + '));

console.log('\n─── C. Lo ya contestado no se vuelve a preguntar ───');

check('el Studio manda las respuestas por el canal de siempre',
  /\.\.\.\(experiencia\?\.respuestas\?\.length \? \{ presets: \[\.\.\.experiencia\.respuestas\] \} : \{\}\)/.test(studio));
const flujo = leer('screens/CreatorFlowScreen.tsx');
check('y la experiencia común ya sabía leerlas',
  /yaDichas \?\? params\.presets \?\? \(params\.preset \? \[params\.preset\] : undefined\)/.test(flujo));
/*
 * Y el planner, con todas contestadas, devuelve PLAN y no pregunta. Es lo que
 * hace que desde el Studio se llegue directo a ver qué va a hacer Weë y cuánto
 * cuesta, sin repetir lo que se acaba de decir al tocar la experiencia.
 */
const planner = leer('functions/src/creator/planner.ts');
check('el planner, con todo contestado, devuelve plan',
  /const pending: Question \| undefined = applicableQuestions\(template, record\)\.find\(\(question\) => !\(question\.id in record\)\);/.test(planner)
  && /if \(pending\) return \{ question: plainQuestion\(pending\), inferred \};/.test(planner));

console.log('\n─── D. Sin segundo pipeline ───');

const PARALELO = /ImageBrain|ImagePlanner|ImageWorkflow|ImageOrchestrator|ImageRouter|ImageJobEngine|ImageGateway|ImageCredits|ImageAssetManager|ImageProviderManager|ImageResultCard|ImagePlanCard|PortraitFlow|ProductFlow|EditorialFlow/;
const FRONT = [studio, capas, flujo, leer('components/studio/StudioPanel.tsx'), leer('components/studio/StudioControles.tsx')];
check('no aparece ninguna pieza de imagen paralela', !FRONT.some((s) => PARALELO.test(s)));
check('ni se nombra proveedor o modelo en el frontend',
  !FRONT.some((s) => /\b(gemini|seedance|seedream|elevenlabs|flux|deepseek|nano.?banana|providerId|adapters?\b|modelId)\b/i.test(s)));
check('el Studio sigue sin llamar a ningún servicio de creación',
  !/creatorService|brainService|httpsCallable/.test(studio));
/* Y el camino de ejecución es el que ya existía, entero. */
const ejecutor = leer('functions/src/creator/index.ts');
check('el ejecutor sigue siendo el de siempre',
  /await holdCredits\(uid, jobId, job\.plan, job\.creditsEstimated, description\);/.test(ejecutor)
  && /await settleCredits\(uid, jobId, job\.creditsEstimated, used, description\);/.test(ejecutor)
  && /run = await runCapability\(/.test(ejecutor));
check('y el material sigue yendo al Asset Core de siempre',
  /const assetIds = await materialesDeResultado\(/.test(ejecutor));

/* CONTROL: un pipeline propio TIENE que caer. */
check('CONTROL: un ImagePlanner sería detectado', PARALELO.test('const ImagePlanner = {}'),
  'si esto pasara, el grupo D no protegería nada');

console.log('\n─── E. Lo que no llega a la ejecución no se enseña como si llegara ───');

/*
 * Los controles creativos llegan al contexto (B3.12) y, dentro del objetivo,
 * llegan al prompt de la imagen —`buildImagePrompt` recibe `job.goal`—. Lo que
 * NO llega es la estructura: `creative` no entra en el plan, porque el
 * `PlanStep` de Legacy no tiene dónde ponerla. Eso sigue documentado y sin
 * abrir, y esta comprobación existe para que nadie lo dé por resuelto.
 */
const inputs = leer('functions/src/creator/inputs.ts');
check('el objetivo de la persona sí llega al prompt de la imagen',
  /base\.prompt = buildImagePrompt\(job\.experienceId, kind, brief, job\.goal,/.test(inputs));
const tipos = leer('functions/src/creator/types.ts');
check('y la estructura creativa sigue sin tener sitio en el plan',
  !/hints/.test(tipos) && !/creative/.test(tipos),
  'el gap de B3.12 sigue abierto y sin fingir');
check('no se tocó el contrato del Planner para taparlo',
  !/hints\?:/.test(tipos) && !/creative\?:/.test(tipos));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeë Studio crea imágenes por el camino de siempre');
process.exit(failures ? 1 : 0);
