/*
 * WEË DESIGN · «MARCA» NO GANA A LAS PALABRAS FUERTES DE CADA INTENCIÓN
 * (ronda R7-Design, tarea S, 2026-10-11: CL-11 de `docs/WEE-DESIGN-CIERRE.md` §8, hallazgo H-6).
 *
 *   node test/design-infer-marca.test.mjs        (usa el compilado: `npm run build` antes)
 *
 * `infer` (`functions/src/creator/templates.ts`, plantilla `design`) entiende qué quiere diseñar la persona por las
 * palabras de su frase, mirando las intenciones EN ORDEN y quedándose con la primera cuya lista aparece. «marca» estaba
 * en la lista del logo —que va la primera—, así que cualquier frase con «marca» salía logo por muy claro que dijera otra
 * cosa: «Un post para mi marca», «Una mascota para mi marca», «Un envase para mi marca». La persona veía entonces las
 * preguntas de un logo (¿qué nombre?, ¿qué transmite tu marca?) en vez de las de lo que había pedido.
 *
 *   · «marca» es una palabra DÉBIL: casi cualquier encargo de una empresa la lleva y casi nunca dice qué se quiere.
 *   · Las palabras fuertes de cada intención (logo, logotipo, identidad / afiche, post, redes, instagram… / mascota,
 *     personaje… / envase, botella… / auto, carro…) tienen que ganarle.
 *   · Sola, «marca» sigue siendo un logo («Diseñar mi marca»): es lo que ya hacía y lo que la persona espera.
 *   · El orden entre las palabras FUERTES no cambia, y no se añade ninguna palabra clave nueva de producto.
 *
 * Esta suite se escribió ANTES del arreglo y se vio en rojo. Solo lectura: sin red, sin emulador, sin proveedor.
 *
 *  A · Las frases que CAMBIAN: hoy dicen logo por «marca» y tienen que decir lo que piden.
 *  B · Las que SE QUEDAN como estaban (incluida «marca» sola): impiden que el arreglo se pase de largo.
 *  C · Sin palabras nuevas: lo que no tiene palabra fuerte sigue cayendo en «marca».
 *  D · Lo que ve la persona: las preguntas y el plan de cada frase, con el planificador de verdad.
 *  E · La suite está en la cadena.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(aqui, '../../');
const requerir = createRequire(path.resolve(aqui, '../package.json'));
const lib = (p) => requerir(path.resolve(aqui, '../lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const titulo = (t) => console.log(`\n── ${t} ──`);

const { TEMPLATES } = lib('creator/templates.js');
const { templatePlanner } = lib('creator/planner.js');
const design = TEMPLATES.design;
const gateway = { userId: 'u', jobId: 'j', record: async () => {} };

/** Lo que `infer` entiende de cada frase que no cumple lo esperado: `«frase» → obtenido (esperado X)`. */
const quePasa = (lista) => lista.filter(([frase, que]) => design.infer(frase).what !== que).map(([frase, que]) => `«${frase}» → ${design.infer(frase).what} (esperado ${que})`);

/* ═══ A · LAS FRASES QUE CAMBIAN ═══════════════════════════════════════════════════════════════════════════ */
titulo('A · CL-11 · las frases con «marca» que antes salían logo y piden otra cosa');
const CAMBIAN = [
  ['Un post para mi marca', 'poster'],
  ['Un post de Instagram para mi marca', 'poster'],
  ['Quiero un afiche para mi marca', 'poster'],
  ['Un flyer para mi marca', 'poster'],
  ['Publicidad para mi marca', 'poster'],
  ['Las redes de mi marca', 'poster'],
  ['Una mascota para mi marca', 'character'],
  ['Una mascota tierna para mi marca de helados', 'character'],
  ['Un personaje para mi marca', 'character'],
  ['Un envase para mi marca', 'product'],
  ['Una botella para mi marca de agua', 'product'],
  ['Un carro para mi marca de autos', 'object'],
];
check(`A1) «marca» ya no gana a la palabra fuerte de la frase (${CAMBIAN.length} frases)`, quePasa(CAMBIAN).length === 0, quePasa(CAMBIAN).join(' | ') || `${CAMBIAN.length} frases`);
check('A2) el criterio CL-11 del cierre: «Un post para mi marca» es un afiche, no un logo', design.infer('Un post para mi marca').what === 'poster');
check('A3) y «una mascota para mi marca», que la aceptación de Design marcaba como hueco (ACE-D-07b), es un personaje',
  design.infer('Una mascota tierna para mi marca de helados').what === 'character');

/* ═══ B · LAS QUE SE QUEDAN ════════════════════════════════════════════════════════════════════════════════ */
titulo('B · lo que ya iba bien sigue igual');
const IGUAL = [
  ['Un logo para mi marca', 'logo'],
  ['Un logotipo para mi marca de ropa', 'logo'],
  ['La identidad de mi marca', 'logo'],
  ['Diseñar mi marca', 'logo'],
  ['Mi marca necesita algo', 'logo'],
  ['marca', 'logo'],
  ['Un logo para Instagram', 'logo'],
  ['Un logo para mi cafetería La Espiga, natural', 'logo'],
  ['A logo for my coffee shop', 'logo'],
  ['A post for my brand', 'poster'],
  ['Quiero diseñar un afiche', 'poster'],
  ['Un afiche para anunciar mi evento del sábado en Instagram', 'poster'],
  ['Una casa moderna con jardín', 'scene'],
  ['Una silla de madera', 'product'],
  ['Un deportivo del futuro', undefined],
];
check(`B1) lo que ya iba bien sigue igual, incluida la «marca» sola (${IGUAL.length} frases)`, quePasa(IGUAL).length === 0, quePasa(IGUAL).join(' | ') || `${IGUAL.length} frases`);
/* El orden entre las palabras FUERTES no cambia: el logo va antes que el afiche, este antes que el personaje. */
check('B2) el orden entre las palabras fuertes no cambia (logo → afiche → personaje)',
  design.infer('Un logo para redes').what === 'logo' && design.infer('Un afiche con un robot').what === 'poster' && design.infer('Un robot para mi marca').what === 'character');
/* Lo demás que `infer` deduce de la frase no se mueve por esto. */
check('B3) y lo demás que `infer` deduce (época, interior/exterior, trazo, aspecto) no cambió',
  design.infer('Diseñar un deportivo del futuro').era === 'future' && design.infer('Una casa por dentro').inout === 'inside'
  && design.infer('Un personaje en dibujo animado').draw === 'cartoon' && design.infer('Una silla de lujo').look === 'luxury');
/* CONTROL: el comparador ve una frase mal entendida, venga el estado que venga (si no, A1 y B1 no probarían nada). */
check('CONTROL · el comparador señala una frase cuyo resultado no es el esperado, y ninguna cuando lo es',
  quePasa([['Un post para mi marca', 'scene']]).length === 1 && quePasa([['Un logo para mi marca', 'logo']]).length === 0);

/* ═══ C · SIN PALABRAS NUEVAS ══════════════════════════════════════════════════════════════════════════════ */
titulo('C · no se añade ninguna palabra clave de producto');
{
  /*
   * Palabras de un encargo que `infer` NO conoce hoy (ni como logo, ni como afiche…): con «marca» siguen cayendo en el logo.
   * Si el arreglo se hubiera hecho añadiendo palabras fuertes («banner», «tarjeta»…), estas frases cambiarían.
   */
  const SIN_PALABRA = [
    ['Un banner para mi marca', 'logo'],
    ['Una tarjeta para mi marca', 'logo'],
    ['Un sticker para mi marca', 'logo'],
    ['Una camiseta para mi marca', 'logo'],
  ];
  check('C1) lo que no tiene palabra fuerte sigue cayendo en «marca» (un banner, una tarjeta, un sticker, una camiseta)', quePasa(SIN_PALABRA).length === 0, quePasa(SIN_PALABRA).join(' | '));
  /* Y la lista del logo sigue siendo la suya: no se le quitó ninguna palabra fuerte por el camino. */
  check('C2) las palabras fuertes del logo —logo, logotipo, identidad— siguen decidiendo solas, sin «marca»',
    ['Un logo', 'Un logotipo', 'Mi identidad visual'].every((f) => design.infer(f).what === 'logo'));
}

/* ═══ D · LO QUE VE LA PERSONA ═════════════════════════════════════════════════════════════════════════════ */
titulo('D · lo que ve la persona: las preguntas y el plan de cada frase');
{
  /** La conversación con el planificador de plantillas, contestando «No sé» a todo lo que se pregunte. */
  const conversar = async (goal) => {
    let respuestas = [];
    let turno = await templatePlanner.next({ experienceId: 'design', goal, answers: respuestas, gateway });
    const deducidas = turno.inferred.map((a) => `${a.questionId}=${a.optionId ?? a.text}`);
    respuestas = turno.inferred.map((a) => ({ questionId: a.questionId, optionId: a.optionId, text: a.text }));
    const preguntadas = [];
    let vueltas = 0;
    while (turno.question && vueltas++ < 12) {
      const q = turno.question;
      preguntadas.push(q.id);
      respuestas = [...respuestas, q.options.length === 0 ? { questionId: q.id, text: 'La Espiga' } : { questionId: q.id, optionId: 'idk' }];
      turno = await templatePlanner.next({ experienceId: 'design', goal, answers: respuestas, gateway });
    }
    return { deducidas, preguntadas, plan: turno.plan };
  };
  const post = await conversar('Un post para mi marca');
  check('D1) «Un post para mi marca»: se le pregunta lo de un afiche (qué anunciar, dónde publicarlo), no lo de un logo (nombre, qué transmite)',
    post.deducidas.join() === 'what=poster' && post.preguntadas.join() === 'message,where', `${post.deducidas} · ${post.preguntadas}`);
  check('D2) y su plan no es de logo: tres propuestas de tipo `design`, no tres logos',
    post.plan?.steps.find((s) => s.id === 'images')?.input.kind === 'design' && !/logos/.test(post.plan?.explainToUser ?? ''), post.plan?.explainToUser);
  const mascota = await conversar('Una mascota para mi marca');
  check('D3) «Una mascota para mi marca»: se le pregunta quién es y qué trazo, no el nombre de una marca',
    mascota.deducidas.join() === 'what=character' && mascota.preguntadas.join() === 'who,draw', `${mascota.deducidas} · ${mascota.preguntadas}`);
  const logo = await conversar('Un logo para mi marca');
  check('D4) «Un logo para mi marca» sigue haciendo las preguntas del logo y planeando tres logos',
    logo.deducidas.join() === 'what=logo' && logo.preguntadas.join() === 'name,feel' && logo.plan?.steps.find((s) => s.id === 'images')?.input.kind === 'logo' && /3 logos/.test(logo.plan?.explainToUser ?? ''), `${logo.deducidas} · ${logo.preguntadas}`);
  const sola = await conversar('Diseñar mi marca');
  check('D5) y «Diseñar mi marca», sin ninguna palabra fuerte, sigue siendo un logo',
    sola.deducidas.join() === 'what=logo' && sola.preguntadas.join() === 'name,feel', `${sola.deducidas} · ${sola.preguntadas}`);
}

/* ═══ E · LA SUITE ESTÁ EN LA CADENA ═══════════════════════════════════════════════════════════════════════ */
titulo('E · la suite está en la cadena');
check('E1) esta suite está en la cadena de `npm test`', /design-infer-marca\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
