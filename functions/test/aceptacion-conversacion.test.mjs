/**
 * ACEPTACIÓN · LA CONVERSACIÓN DE WEË DESIGN Y WEË CHEF, VISTA DESDE QUIEN LA TIENE.
 *
 * Catálogo y numeración de escenarios: `docs/WEE-ACEPTACION.md` (cada comprobación lleva el id del suyo).
 *
 * ── Qué mide ────────────────────────────────────────────────────────────────
 *
 * Weë Brain no es «el modelo»: antes de gastar un Credit, entiende lo que la persona dijo, pregunta lo que falta y le
 * enseña un plan con su precio. Esa parte —la conversación— es código determinista (`TEMPLATES`, `templatePlanner`,
 * `estimatePlan`), y por eso se puede probar sin ningún proveedor. Se ejecuta con el planificador de plantillas de
 * verdad, el mismo que corre cuando la IA que entiende texto no está o no está segura.
 *
 * La suite hace cuatro cosas:
 *
 *   A · BARRIDO. Los 604 planes que pueden salir de Design, de Hogar & Diseño (la puerta «Remodelar» de Design) y de
 *       Chef, recorridos como los recorre una persona: ninguno repite un paso, ninguno depende de algo que no ha
 *       pasado, ninguno cuesta cero ni deja sin precio un paso, ninguno nombra a un proveedor, y todos se explican.
 *   B · RECORRIDOS. Frases reales de una persona, y qué se le pregunta de lo que YA dijo. Es un TRINQUETE: la
 *       conversación nunca puede preguntar MÁS ni entender MENOS que hoy; si mejora, la suite lo dice y sigue en verde.
 *   C · PUERTAS. Las 35 «formas de empezar» que enseña la pantalla de Weë Design (siete puertas, cinco puntos cada una),
 *       escritas como las escribe quien las toca, y cuántas entiende el servidor sin repreguntar. Otro trinquete.
 *   D · HUECOS CONOCIDOS. Lo que una persona esperaría y hoy no pasa, reproducido con código de verdad (ver
 *       `_aceptacion.mjs`: pasan mientras no se cumplen; si alguien los arregla, la suite avisa y falla a propósito).
 *       Solo los de Design y los que Chef tiene en la frase: los de los tres paneles nuevos de Chef son de la tarea G.
 *
 * ── Lo que NO dice ─────────────────────────────────────────────────────────
 *
 * Nada de lo que hace la IA que entiende texto (Gemini): ese camino lo mide un canario con proveedor real. Aquí la
 * medida es la del planificador de plantillas, que es el SUELO: lo mínimo que se entiende siempre.
 * Tampoco hay ninguna cifra de precio: solo que lo mostrado suma y que no queda ningún paso sin precio.
 *
 * Usa el compilado (`npm run build` antes). Sin red, sin emulador. Unos 5 s.
 */
import { BaseEnMemoria, instalarLaBase, lib } from './_firestore-en-memoria.mjs';
import { crearComprobador, apuntarLaConsola, PROVEEDORES_QUE_NO_SE_LEEN } from './_aceptacion.mjs';
import { todosLosPlanes } from './_planes.mjs';
import { crearCargador } from './filmmaker-cliente.mjs';

const { check, hueco, titulo, aviso, terminar } = crearComprobador();
const base = new BaseEnMemoria();
const deshacerLaBase = instalarLaBase(() => base);
const consola = apuntarLaConsola();

const { TEMPLATES } = lib('creator/templates.js');
const { templatePlanner } = lib('creator/planner.js');
const { needsInputImage, stepInputFor } = lib('creator/inputs.js');
const { estimatePlan } = lib('creator/credits.js');
const { serviceForCapability, CREDIT_COSTS } = lib('credits/creditCosts.js');
const gateway = { userId: 'u', jobId: 'j', record: async () => {} };

/* El español de verdad, y el catálogo de Weë Design de verdad. */
const cargar = crearCargador();
const ES = cargar('i18n/textos/es/index.ts').es;
const EN = cargar('i18n/textos/en/index.ts').en;
const PUERTAS = cargar('constants/designTools.ts').PUERTAS_DE_DESIGN;
const textoDe = (dic, clave) => clave.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), dic);

/** Lo que haría quien no sabe qué contestar: «No sé» si lo hay, si no la primera opción, si no un texto. */
const responder = (q, elegidas = {}) => {
  if (elegidas[q.id] !== undefined) return { optionId: elegidas[q.id] };
  if (q.options.some((o) => o.id === 'idk')) return { optionId: 'idk' };
  if (q.options.length) return { optionId: q.options[0].id };
  return { text: 'La Espiga' };
};
/** La conversación entera con el planificador de plantillas. Devuelve lo deducido, lo preguntado y el plan. */
const conversar = async (experienceId, goal, elegidas = {}, previas = []) => {
  let respuestas = [...previas];
  let turno = await templatePlanner.next({ experienceId, goal, answers: respuestas, gateway });
  const deducidas = turno.inferred.map((a) => `${a.questionId}=${a.optionId ?? a.text}`);
  respuestas = [...respuestas, ...turno.inferred.map((a) => ({ questionId: a.questionId, optionId: a.optionId, text: a.text }))];
  const preguntadas = [];
  let vueltas = 0;
  while (turno.question && vueltas++ < 12) {
    const q = turno.question;
    preguntadas.push(q.id);
    respuestas = [...respuestas, { questionId: q.id, ...responder(q, elegidas) }];
    turno = await templatePlanner.next({ experienceId, goal, answers: respuestas, gateway });
  }
  return { deducidas, preguntadas, plan: turno.plan };
};

/* ═══ A · BARRIDO: TODOS LOS PLANES QUE PUEDEN SALIR ══════════════════════ */
titulo('A · Barrido de todos los planes de Design, Hogar & Diseño y Chef');
{
  const todos = await todosLosPlanes();
  const suyos = todos.filter((p) => ['design', 'home', 'chef'].includes(p.experienceId));
  const por = (e) => suyos.filter((p) => p.experienceId === e).length;
  check('ACE-D-07 · (hay mucho que barrer: cada pregunta contestada con cada opción, con «No sé» y con texto libre)',
    por('design') > 100 && por('home') > 100 && por('chef') > 100, `design ${por('design')} · home ${por('home')} · chef ${por('chef')}`);

  const mal = (cond) => suyos.filter((p) => !cond(p)).slice(0, 3).map((p) => `${p.experienceId}: «${p.plan.explainToUser}»`);
  const repetidos = mal((p) => new Set(p.plan.steps.map((s) => s.id)).size === p.plan.steps.length);
  check('ACE-D-07 · ningún plan repite un paso', repetidos.length === 0, repetidos.join(' | '));
  const adelantados = mal((p) => p.plan.steps.every((s, i) => (s.dependsOn || []).every((d) => p.plan.steps.slice(0, i).some((x) => x.id === d))));
  check('ACE-D-07 · ningún paso depende de algo que todavía no ha pasado ni de algo que no existe (el plan se puede ejecutar en orden)', adelantados.length === 0, adelantados.join(' | '));
  const sinPrecio = mal((p) => p.plan.steps.every((s) => { const servicio = serviceForCapability(s.capability, s.input || {}); return !!servicio && CREDIT_COSTS[servicio] > 0; }));
  check('ACE-T-01 · ningún paso queda sin servicio con precio: nada se crea sin que se sepa cuánto cuesta', sinPrecio.length === 0, sinPrecio.join(' | '));
  const sinExplicar = mal((p) => typeof p.plan.explainToUser === 'string' && p.plan.explainToUser.trim().length > 20 && /[.!]$/.test(p.plan.explainToUser.trim()));
  check('ACE-D-07 · todos se explican con una frase entera (lo que Weë va a hacer, dicho antes de gastar)', sinExplicar.length === 0, sinExplicar.join(' | '));
  const basura = mal((p) => !/undefined|\[object|\bNaN\b|\bidk\b/.test(p.plan.explainToUser));
  check('ACE-D-07 · ninguna explicación deja escapar un valor interno («undefined», «idk», «[object»)', basura.length === 0, basura.join(' | '));
  const conMarca = mal((p) => !PROVEEDORES_QUE_NO_SE_LEEN.test(p.plan.explainToUser + p.plan.steps.map((s) => s.purpose).join(' ')));
  check('ACE-D-07 · ninguna explicación ni paso nombra a un proveedor o a un modelo', conMarca.length === 0, conMarca.join(' | '));

  /* El precio de cada FORMA de plan (hay diez): suma y sin cero. */
  const formas = new Map();
  for (const p of suyos) {
    const firma = `${p.experienceId}|${p.plan.steps.map((s) => `${s.capability}:${s.input?.kind || ''}`).join('>')}`;
    if (!formas.has(firma)) formas.set(firma, p);
  }
  const incoherentes = [];
  for (const [firma, p] of formas) {
    const e = await estimatePlan(p.plan, 'u_prueba');
    const suma = e.steps.reduce((a, s) => a + s.credits, 0);
    if (!(e.total > 0) || e.total !== suma || e.steps.length !== p.plan.steps.length) incoherentes.push(`${firma}: total ${e.total}, suma ${suma}`);
  }
  check(`ACE-D-08 · el precio de cada forma de plan (${formas.size}) tiene un total mayor que cero, igual a la suma de sus pasos y con un precio por paso`,
    formas.size >= 8 && incoherentes.length === 0, incoherentes.join(' | ') || `${formas.size} formas`);
  const FOTO = ['vision.describe', 'image.edit', 'image.space_restyle'];
  const exigeFoto = [...formas.values()].filter((p) => needsInputImage(p.plan.steps));
  check('ACE-C-05 · lo que exige una foto lo exige porque algún paso trabaja SOBRE ella, y nada más (el servidor no pide fotos de más)',
    exigeFoto.every((p) => p.plan.steps.some((s) => FOTO.includes(s.capability))) && [...formas.values()].filter((p) => !needsInputImage(p.plan.steps)).every((p) => !p.plan.steps.some((s) => FOTO.includes(s.capability))));
  aviso(`formas de plan: ${[...formas.keys()].map((f) => f.replace(/text\.generate/g, 'texto').replace(/image\.generate/g, 'imagen')).join('  ·  ')}`);

  /* La salida de cada pregunta: la intención de «siempre con No sé» de CLAUDE.md. Se mide y se cuenta; no se pinta de rojo. */
  const sinNoSe = (e) => TEMPLATES[e].questions.filter((q) => !q.options.some((o) => o.id === 'idk')).map((q) => q.id);
  check('ACE-D-07 · en Design y en Chef toda pregunta se puede contestar escribiendo, aunque no tenga botón «No sé»',
    ['design', 'chef'].every((e) => TEMPLATES[e].questions.every((q) => q.allowFreeText || q.options.some((o) => o.id === 'idk'))));
  aviso(`preguntas SIN botón «No sé» (solo se pueden contestar con una opción o escribiendo): Design [${sinNoSe('design')}] · Chef [${sinNoSe('chef')}]`);
}

/* ═══ B · RECORRIDOS: LO QUE YA DIJO NO SE VUELVE A PREGUNTAR ═════════════ */
titulo('B · Recorridos con frases reales: no preguntar más ni entender menos que hoy');
/*
 * `deducidas` y `preguntadas` son lo que el planificador de plantillas hace HOY con cada frase (medido al escribir esta
 * suite, sobre `d867774`). El trinquete: nunca puede PREGUNTAR más de lo anotado ni DEDUCIR menos. Si mejora (menos
 * preguntas, más deducciones), la suite lo cuenta y sigue en verde: se actualiza el anotado cuando se quiera.
 */
const RECORRIDOS = [
  { exp: 'design', frase: 'Un logo para mi cafetería La Espiga, natural', deducidas: ['what=logo', 'look=natural'], preguntadas: ['name', 'feel'] },
  { exp: 'design', frase: 'Un afiche para anunciar mi evento del sábado en Instagram', deducidas: ['what=poster'], preguntadas: ['message', 'where'] },
  { exp: 'design', frase: 'Un deportivo del futuro', elegidas: { what: 'object' }, deducidas: ['era=future'], preguntadas: ['what', 'machine'] },
  { exp: 'design', frase: 'Una casa moderna con jardín', deducidas: ['what=scene'], preguntadas: ['place', 'inout'] },
  { exp: 'design', frase: 'Una silla de madera', deducidas: ['what=product'], preguntadas: ['item', 'look'] },
  { exp: 'design', frase: 'Diseñar algo que imagino', elegidas: { what: 'scene' }, deducidas: [], preguntadas: ['what', 'place', 'inout'] },
  { exp: 'design', frase: 'A logo for my coffee shop', deducidas: ['what=logo'], preguntadas: ['name', 'feel'] },
  { exp: 'chef', frase: 'Pollo al horno para la familia', deducidas: ['what=recipe', 'people=4'], preguntadas: ['time'] },
  { exp: 'chef', frase: 'Una cena de aniversario romántica para dos', deducidas: ['what=recipe', 'people=2'], preguntadas: ['time'] },
  { exp: 'chef', frase: 'Un postre rápido sin gluten', deducidas: ['what=dessert', 'time=15'], preguntadas: ['people'] },
  { exp: 'chef', frase: 'Qué puedo cocinar con lo que tengo en la nevera', deducidas: ['what=cook'], preguntadas: ['people', 'time'] },
  { exp: 'chef', frase: 'Un menú vegetariano para toda la semana', deducidas: ['what=menu'], preguntadas: ['people', 'days'] },
  { exp: 'chef', frase: 'Soy alérgico a los frutos secos: una cena para mi familia', deducidas: ['what=recipe', 'people=4'], preguntadas: ['time'] },
  { exp: 'chef', frase: 'Algo rico para comer hoy', deducidas: [], preguntadas: ['what', 'people', 'time'] },
];
for (const c of RECORRIDOS) {
  const hoy = await conversar(c.exp, c.frase, c.elegidas);
  const demas = hoy.preguntadas.filter((id) => !c.preguntadas.includes(id));
  const perdidas = c.deducidas.filter((d) => !hoy.deducidas.includes(d));
  check(`ACE-${c.exp === 'design' ? 'D' : 'C'}-07 · «${c.frase}» · no pregunta más de lo anotado ni deduce menos, y llega a un plan`,
    demas.length === 0 && perdidas.length === 0 && !!hoy.plan && hoy.plan.steps.length > 0,
    `deduce [${hoy.deducidas}] · pregunta [${hoy.preguntadas}]${demas.length ? ` · DE MÁS: ${demas}` : ''}${perdidas.length ? ` · SE HA PERDIDO: ${perdidas}` : ''}`);
  const mejora = c.preguntadas.filter((id) => !hoy.preguntadas.includes(id)).length + hoy.deducidas.filter((d) => !c.deducidas.includes(d)).length;
  if (mejora) aviso(`mejora sobre lo anotado en «${c.frase}»: ahora pregunta [${hoy.preguntadas}] y deduce [${hoy.deducidas}] — actualiza RECORRIDOS cuando quieras`);
}
{
  const frase = 'Pollo al horno para la familia';
  const hoy = await conversar('chef', frase);
  const e = await estimatePlan(hoy.plan, 'u_prueba');
  check('ACE-C-06 · y el plan de una receta sale con su explicación y su precio ANTES de crear, con la familia dicha por la persona',
    /familia/.test(hoy.plan.explainToUser) && e.total > 0 && e.total === e.steps.reduce((a, s) => a + s.credits, 0), hoy.plan.explainToUser);
}

/* ═══ C · LAS PUERTAS DE DESIGN: ¿LAS ENTIENDE EL SERVIDOR? ═══════════════ */
titulo('C · Las 35 formas de empezar de Weë Design: cuántas entiende el servidor');
{
  const puntos = PUERTAS.flatMap((p) => p.puntos.map((pt) => ({ puerta: p.id, punto: pt.id, clave: pt.clave })));
  check('ACE-D-03 · la pantalla ofrece siete puertas con cinco puntos de partida cada una, y seis de las siete salen en la portada',
    PUERTAS.length === 7 && puntos.length === 35 && PUERTAS.every((p) => p.puntos.length === 5) && PUERTAS.filter((p) => p.enPortada).length === 6);
  check('ACE-D-03 · cada punto de partida tiene su frase en español y en inglés (lo que se escribe en la caja al tocarlo)',
    puntos.every((p) => typeof textoDe(ES, p.clave) === 'string' && textoDe(ES, p.clave).trim() && typeof textoDe(EN, p.clave) === 'string' && textoDe(EN, p.clave).trim()));
  const entiende = (dic) => puntos.filter((p) => TEMPLATES.design.infer(textoDe(dic, p.clave)).what !== undefined);
  const es = entiende(ES);
  const en = entiende(EN);
  /* Trinquete: hoy 13 de 35 en español y 3 de 35 en inglés. Nunca menos. */
  check('ACE-D-03 · el servidor entiende «qué es» sin repreguntar al menos tantas puertas como hoy (13 de 35 en español, 3 en inglés)',
    es.length >= 13 && en.length >= 3, `español ${es.length}/35 · inglés ${en.length}/35`);
  if (es.length > 13 || en.length > 3) aviso(`mejora: ahora entiende ${es.length}/35 en español y ${en.length}/35 en inglés — sube el mínimo cuando quieras`);
  const sinEntender = puntos.filter((p) => !es.includes(p)).map((p) => `${p.puerta}/${p.punto}`);
  aviso(`puntos que el servidor NO entiende en español y que, al tocarlos, vuelven a preguntar «qué necesitas» (${sinEntender.length}): ${sinEntender.join(' · ')}`);

  /* Y con cualquier punto, la conversación llega a un plan: ninguna puerta lleva a un callejón. */
  let atascadas = 0;
  let masDeTres = 0;
  for (const p of puntos) {
    const hoy = await conversar('design', `${textoDe(ES, p.clave)} `);
    if (!hoy.plan) atascadas++;
    if (hoy.preguntadas.length > 4) masDeTres++;
  }
  check('ACE-D-03 · tocar cualquier punto de partida lleva a un plan, y en cuatro preguntas o menos (ninguna puerta es un callejón)', atascadas === 0 && masDeTres === 0, `atascadas ${atascadas} · de más de 4 preguntas ${masDeTres}`);
}

/* ═══ D · HUECOS CONOCIDOS ════════════════════════════════════════════════ */
titulo('D · Huecos conocidos (lo que una persona esperaría y hoy no pasa)');
{
  /*
   * D1 · «mascota para mi marca» es un personaje, no un logo. HUECO CERRADO por CL-11 (R7-Design, tarea S): «marca» es una
   * palabra débil y `infer` la lee la última, así que le ganan las fuertes («mascota»). Pasa a comprobación ordinaria;
   * el detalle, con otras once frases, lo fija `design-infer-marca.test.mjs`.
   */
  const frase = 'Una mascota tierna para mi marca de helados';
  check('ACE-D-07b · una mascota «para mi marca» se entiende como un personaje, no como un logo (CERRADO: «marca» ya no gana a «mascota»)',
    TEMPLATES.design.infer(frase).what === 'character', `deduce what=${TEMPLATES.design.infer(frase).what}`);

  /* D2 · el formato de «historia». */
  const afiche = TEMPLATES.design.buildPlan('Un afiche para una historia de Instagram', { what: 'poster', message: 'promo', where: 'story' });
  hueco('ACE-D-06b', 'un afiche «para una historia» se crea en formato vertical (9:16): hoy la plantilla solo añade la palabra al encargo y el paso de imagen no lleva proporción',
    afiche.steps.find((s) => s.capability === 'image.generate').input.aspectRatio === '9:16', 'ver docs/DESIGN.md §1 y decisión D5');

  /* D3 · el número de comensales dicho en la frase. */
  const diez = await conversar('chef', 'Una lasaña para 10 personas', { what: 'recipe' });
  hueco('ACE-C-10', 'los comensales dichos con cifra («para 10 personas») se entienden y llegan al plan sin volver a preguntarlos (hoy se pregunta «para cuántas personas» y «No sé» acaba en «para dos»)',
    !diez.preguntadas.includes('people') && /10/.test(diez.plan.explainToUser), `pregunta [${diez.preguntadas}] · «${diez.plan.explainToUser}»`);

  /* D4 · lo que la persona dice de su dieta, a la vista antes de gastar. */
  const sinGluten = await conversar('chef', 'Un postre rápido sin gluten');
  hueco('ACE-C-09b', 'una dieta o una alergia dicha en la frase («sin gluten») se ve en el plan antes de gastar (hoy llega al modelo dentro del objetivo, pero la explicación no la menciona)',
    /gluten/i.test(sinGluten.plan.explainToUser), `«${sinGluten.plan.explainToUser}»`);
  const alergia = await conversar('chef', 'Soy alérgico a los frutos secos: una cena para mi familia');
  hueco('ACE-C-09c', 'una alergia dicha en la frase se ve en el plan antes de gastar',
    /alerg|frutos secos/i.test(alergia.plan.explainToUser), `«${alergia.plan.explainToUser}»`);
  /* …y SÍ llega al modelo: el objetivo viaja entero en el prompt del paso de texto. */
  const pasoReceta = alergia.plan.steps.find((s) => s.id === 'recipe');
  const prompt = stepInputFor({ experienceId: 'chef', goal: 'Soy alérgico a los frutos secos: una cena para mi familia' }, { ...pasoReceta, status: 'pending' }, []).prompt;
  check('ACE-C-09 · la alergia dicha SÍ llega al modelo: el objetivo de la persona va entero dentro de lo que se le pide a la IA', /alérgico a los frutos secos/.test(prompt), prompt.split('\n')[0]);

  /*
   * LO QUE NO ESTÁ AQUÍ A PROPÓSITO. Los tres paneles de Chef que no tienen plan propio —«Sustituir ingredientes» pide la
   * foto de la nevera (D-CHEF-2), «Lista de compras» recibía la instrucción de Hogar & Diseño (D-CHEF-3; desde CHEF-01,
   * `1c60b30e`, Chef tiene la suya, con el texto pendiente de revisión de producto) e «Información nutricional» acaba en
   * una receta con foto (D-CHEF-1)— los fija con el mismo código la caracterización de la tarea G
   * (`chef-caracterizacion.test.mjs`; la de D-CHEF-3 ya está invertida a ARREGLADO, y `chef-lista.test.mjs` ata esa
   * instrucción con `leerLista`). Se citan en el catálogo (ACE-C-11, ACE-C-12, ACE-C-13) y no se repiten aquí: dos suites
   * que se invierten a la vez son dos sitios que mantener.
   */
}

consola.restaurar();
deshacerLaBase();
terminar();
