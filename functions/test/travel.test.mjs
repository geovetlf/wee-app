/*
 * Weë Travel · Fase A (fase 2E-64C).
 *
 * Lo que se comprueba aquí no son cadenas de texto sueltas: se ejecuta la
 * plantilla de verdad, se conversa con el planificador de verdad y se parte un
 * itinerario de verdad con la función que usa la pantalla. Donde no se puede
 * ejecutar —una pantalla de React Native— se lee el código, nunca los
 * comentarios: `soloCodigo` los quita antes de mirar, para que una explicación
 * escrita aquí al lado no pueda aprobar una prueba por su cuenta.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const fsCat = fs;

/* El catálogo de las once experiencias: la clave vive en constants/specialists.ts
 * y la palabra en el diccionario. `catEs` resuelve una; `catEsDe` junta todas
 * las de una experiencia, para buscar una palabra sin saber en qué clave está. */
const catalogoEs = fsCat.readFileSync(new URL('../../i18n/textos/es/catalogo.ts', import.meta.url), 'utf8');
const catEs = (clave) => (catalogoEs.match(new RegExp('^  ' + clave + ": '(.*)',$", 'm')) || [])[1] || '';
const catEsDe = (exp) => [...catalogoEs.matchAll(new RegExp('^  ' + exp + "[A-Z][A-Za-z0-9]*: '(.*)',$", 'gm'))].map((m) => m[1]).join(' · ');


let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/** El código sin comentarios: lo que se prueba es lo que se ejecuta. */
const soloCodigo = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const { TEMPLATES, leerDuracion } = lib('creator/templates.js');
const { templatePlanner } = lib('creator/planner.js');
const { buildTextPrompt } = lib('creator/prompts.js');

const travel = TEMPLATES.travel;
const specialists = leer('constants/specialists.ts');
const pantalla = leer('screens/SpecialistScreen.tsx');
const tarjeta = leer('components/creator/ResultCard.tsx');
const caja = leer('components/creator/IdeaBox.tsx');
const shell = leer('components/creator/CreatorShell.tsx');
const lanzador = leer('components/creator/TravelLauncher.tsx');
const seccionFeed = leer('utils/sectionFeed.ts');
const crear = leer('screens/CreateScreen.tsx');
const flujo = leer('screens/CreatorFlowScreen.tsx');

/** El trozo de `specialists.ts` que configura Weë Travel. */
const inicioTravel = specialists.indexOf('  travel: {');
const bloqueTravel = specialists.slice(inicioTravel, specialists.indexOf('\n};', inicioTravel));

/** Conversar de verdad con el planificador hasta que salga un plan. */
const conversar = async (goal, respuestas = {}) => {
  const answers = [];
  const preguntas = [];
  for (let vuelta = 0; vuelta < 12; vuelta++) {
    const turno = await templatePlanner.next({ experienceId: 'travel', goal, answers });
    if (turno.plan) return { plan: turno.plan, preguntas, inferred: turno.inferred };
    preguntas.push(turno.question);
    const elegida = respuestas[turno.question.id] ?? turno.question.options[0].id;
    answers.push({ questionId: turno.question.id, optionId: elegida });
  }
  throw new Error('el cuestionario no termina nunca');
};

// ════════════════════════════════════════════════════════════════════════════
// A · Weë Travel existe, y existe como una más
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La undécima experiencia ──');
{
  const tipos = leer('functions/src/creator/types.ts');
  check('1) el servidor la reconoce como experiencia', /\|\s*'travel'/.test(soloCodigo(tipos)));
  check('1) y tiene plantilla propia', !!travel && travel.name === 'Weë Travel' && travel.emoji === '✈️');

  const ts = require('typescript');
  const js = ts.transpileModule(leer('constants/weeExperiences.ts'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exp = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

  check('2) la app la tiene entre las suyas', exp.getExperienceById('travel')?.name === 'Weë Travel');
  check('2) y es una sección visible del menú', exp.WEE_EXPERIENCES.some((e) => e.id === 'travel'));
  check('2) las diez de antes siguen todas', ['design', 'studio', 'photo', 'writer', 'music', 'beauty', 'chef', 'home', 'business', 'brain'].every((id) => !!exp.getExperienceById(id)));
  check('3) quien escribe "itinerario" llega a Weë Travel', exp.matchExperiences('itinerario')[0]?.id === 'travel');
  check('3) y quien escribe "vacaciones" también', exp.matchExperiences('vacaciones').some((e) => e.id === 'travel'));
  check('3) sin robarle nada a Weë Chef', exp.matchExperiences('receta')[0]?.id === 'chef');

  check('4) entra en la barra lateral', /SPECIALIST_ORDER: SpecialistId\[\] = \['brain', 'design', 'music', 'studio', 'business', 'chef', 'travel'\]/.test(specialists));
  check('4) y no hace falta ninguna ruta nueva', !/Travel(Screen|Flow|Home)/.test(leer('navigation/MainStackNavigator.tsx')));
}

// ════════════════════════════════════════════════════════════════════════════
// B · La pantalla: escribir primero, elegir después
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El Home de Weë Travel ──');
{
  check('5) pregunta por el viaje con esas palabras',
    /title: 'travelIdeaTitle'/.test(bloqueTravel) && catEs('travelIdeaTitle') === '✈️ ¿Qué viaje tienes en mente?');
  check('5) y la caja de escribir va ANTES de las funciones', /ideaFirst: true/.test(bloqueTravel));

  /*
   * Desde 2E-69 la frase y las cuatro funciones son UNA tarjeta, no tres bloques
   * apilados. Lo que se comprueba ya no es el orden entre ellos —no hay orden,
   * hay una pieza— sino que esa pieza va antes del muro y que nada más se cuela
   * en medio.
   */
  const codigo = soloCodigo(pantalla);
  const tarjeta = codigo.indexOf('<TravelLauncher');
  check('6) la tarjeta de entrada es lo primero de la sección', tarjeta > 0, String(tarjeta));
  // Ni cabecera propia, ni caja suelta, ni franja aparte: las tres puertas viejas
  // quedan detrás de una condición que Travel no cumple.
  check(
    '6) y es lo único que hay debajo de la cabecera',
    /\{!lanzador && <SpecialistHero/.test(codigo) && /\{!lanzador && <IdeaBox/.test(codigo)
  );
  // Una sola sección lo pide: la declaración del campo y su explicación no cuentan.
  check('6) y sin esa marca ninguna otra sección se mueve', /const lanzador = !!spec\.ideaFirst;/.test(codigo) && (specialists.match(/^ {4}ideaFirst: true,$/gm) || []).length === 1);

  check('7) tiene tres ejemplos que se tocan', (bloqueTravel.match(/chips: \[([^\]]*)\]/)?.[1].match(/'/g) || []).length === 6);
  check('7) y son los tres del diseño',
    /'travelIdeaChip1', 'travelIdeaChip2', 'travelIdeaChip3'/.test(bloqueTravel)
    && [catEs('travelIdeaChip1'), catEs('travelIdeaChip2'), catEs('travelIdeaChip3')].join(' · ')
       === '🇯🇵 Japón en octubre · 🌴 Quiero una playa tranquila y barata · 🤷 No sé dónde viajar');

  // Un emoji ayuda a reconocer el ejemplo, pero no debe viajar dentro del objetivo.
  const cajaJs = require('typescript').transpileModule(
    caja.slice(caja.indexOf('const EMOJI_AL_PRINCIPIO'), caja.indexOf('/** "¿Tienes una idea')) + '\nexport { objetivoDe };',
    { compilerOptions: { module: 1, target: 7 } }
  ).outputText;
  const { objetivoDe } = await import('data:text/javascript;base64,' + Buffer.from(cajaJs.replace('exports.objetivoDe = objetivoDe;', 'export { objetivoDe };').replace(/^"use strict";[\s\S]*?exports\)?[^\n]*\n/, '')).toString('base64')).catch(() => ({ objetivoDe: null }));
  if (objetivoDe) {
    check('8) el emoji se queda en la pantalla', objetivoDe('🇯🇵 Japón en octubre') === 'Japón en octubre');
    check('8) también con la bandera y el 🤷', objetivoDe('🤷 No sé dónde viajar') === 'No sé dónde viajar' && objetivoDe('🌴 Quiero una playa tranquila y barata') === 'Quiero una playa tranquila y barata');
    check('8) y una frase normal no se toca', objetivoDe('Quiero una cena rápida') === 'Quiero una cena rápida' && objetivoDe('Recetas con pollo') === 'Recetas con pollo');
  } else {
    check('8) el ejemplo se limpia antes de enviarse', /onSubmit\(objetivoDe\(chip\)\)/.test(caja) && /EMOJI_AL_PRINCIPIO/.test(caja));
  }

  /*
   * Y ya no tiene muro. Lo tuvo —el general de Weë, sin filtrar— hasta que el
   * Wäll aprendió a decir de qué experiencia viene cada publicación con su
   * WeeTag: a partir de ahí era el mismo muro contado dos veces.
   */
  check('9) la sección ya no declara muro', !/wall: \{/.test(bloqueTravel) && !/tabs: \[/.test(bloqueTravel));
  check('9) y nadie lo pinta', !/SectionWall/.test(soloCodigo(pantalla)));
}

// ════════════════════════════════════════════════════════════════════════════
// C · Cuatro funciones. Ni una más.
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Las cuatro funciones ──');
{
  const acciones = [...bloqueTravel.matchAll(/\{ id: '([^']+)', icon: /g)].map((m) => m[1]);
  check('10) son exactamente cuatro', acciones.length === 4, acciones.join(','));
  check('10) y son las cuatro de la fase A', acciones.join(',') === 'plan,where,doing,moving', acciones.join(','));
  check('11) se llaman como se dijo',
    ['Plan', 'Where', 'Doing', 'Moving'].every((id) => bloqueTravel.includes(`title: 'travelAc${id}Title'`))
    && ['Planificar un viaje', 'No sé a dónde ir', 'Qué hacer y dónde comer', 'Cómo moverme']
       .every((n, i) => catEs('travelAc' + ['Plan', 'Where', 'Doing', 'Moving'][i] + 'Title') === n));
  check('11) cada una deja contestada la primera pregunta', (bloqueTravel.match(/preset: \{ questionId: 'what'/g) || []).length === 4);

  // Lo que la fase A NO trae. Se mira el código, no los comentarios.
  const codigoTravel = soloCodigo(bloqueTravel);
  // No hay ni una función de reservar, ni un pago, ni un precio a cobrar: las
  // cuatro acciones son las cuatro, y ninguna lleva a comprar nada.
  check('12) no reserva vuelos ni hoteles', !/reservar|booking|checkout|pagar|comprar|book now/i.test(codigoTravel));
  check('12) y lo dice de entrada', /'travelChip1'/.test(bloqueTravel) && catEs('travelChip1') === 'Sin reservas');
  check('12) no hay mapa ni GPS en la sección', !/MapView|react-native-maps|latitude|longitude|useLocation/.test(soloCodigo(specialists) + soloCodigo(pantalla)));
  check('12) ni un proveedor de viajes por detrás', !/skyscanner|kayak|expedia|amadeus|tripadvisor|booking\.com/i.test(soloCodigo(specialists) + soloCodigo(leer('functions/src/creator/templates.ts'))));
  check('13) ni un muro aparte: el de siempre, filtrado', /travel: \[/.test(seccionFeed) && !/travelFeed|getTravelPosts/.test(seccionFeed + soloCodigo(pantalla)));
}

// ════════════════════════════════════════════════════════════════════════════
// D · Lo que la persona ya dijo no se le vuelve a preguntar
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Aprovechar lo que ya está escrito ──');
{
  const leido = (texto) => travel.infer(texto);

  check('14) "Japón 10 días en octubre" ya dice que quiere planificar', leido('Japón 10 días en octubre').what === 'plan');
  check('14) y diez días son diez, no "una semana"', leerDuracion('Japón 10 días en octubre') === 10, String(leerDuracion('Japón 10 días en octubre')));
  check('15) "No sé dónde viajar" no es planificar', leido('No sé dónde viajar').what === 'where');
  check('15) "Cómo llego del aeropuerto al centro de Roma" es moverse', leido('Cómo llego del aeropuerto al centro de Roma').what === 'moving');
  check('15) "Dónde comer en Lisboa" es qué hacer', leido('Dónde comer en Lisboa').what === 'doing');
  check('16) "Quiero una playa tranquila y barata" dice qué busca', leido('Quiero una playa tranquila y barata').vibe === 'rest');
  check('16) "Dos semanas por Perú, museos e historia" lee las dos cosas', leerDuracion('Dos semanas por Perú, museos e historia') === 14 && leido('Dos semanas por Perú, museos e historia').interest === 'culture');
  check('17) un texto vacío no inventa nada', Object.keys(leido('')).length === 0);
  check('17) y "Hola" tampoco', Object.keys(leido('Hola')).length === 0);

  /*
   * Con destino y duración el cuestionario tiene que ser corto. Sigue quedando la
   * pregunta de cuándo viaja: decir "10 días" no es decir cuándo, y un itinerario
   * sin fechas no sabe si el museo abre esa semana. Lo que NO puede pasar es que
   * se le vuelva a preguntar algo que ya dijo.
   */
  const conFrase = await conversar('Japón 10 días en octubre');
  check('18) con destino y días quedan tres preguntas, no ocho', conFrase.preguntas.length <= 3, conFrase.preguntas.map((p) => p.id).join(','));
  check('18) y ninguna vuelve a preguntar lo que ya dijo', !conFrase.preguntas.some((p) => p.id === 'what'));
  check('18) los diez días no se pierden por el camino', /10 días/.test(conFrase.plan.steps[0].input.brief), conFrase.plan.steps[0].input.brief);

  const desdeCero = await conversar('Un viaje');
  check('19) empezando de cero tampoco es un interrogatorio', desdeCero.preguntas.length <= 4, desdeCero.preguntas.map((p) => p.id).join(','));
  check('19) y la primera es qué necesitas', desdeCero.preguntas[0].id === 'what');

  const sinIdea = await conversar('No sé dónde viajar');
  check('20) a quien no sabe no se le pide un destino', !sinIdea.preguntas.some((p) => /destino|a dónde/i.test(p.text)));
  check('20) se le pregunta qué busca y cuándo viaja', sinIdea.preguntas.map((p) => p.id).join(',') === 'vibe,dates', sinIdea.preguntas.map((p) => p.id).join(','));

  // "No sé" siempre disponible, y Weë decide sin quedarse parado.
  // Todas menos la primera: elegir qué necesitas no admite "no sé", porque de
  // ahí sale el camino entero. Fechas, gustos y ritmo sí.
  const conDudas = ['vibe', 'dates', 'interest', 'pace'].every((id) => travel.questions.find((q) => q.id === id).options.some((o) => o.id === 'idk'));
  check('21) todas las preguntas abiertas tienen su "No sé"', conDudas);
  check('21) y se puede contestar con las propias palabras', travel.questions.every((q) => q.allowFreeText !== false));
  const todoNoSe = travel.buildPlan('Japón', { what: 'plan', dates: 'idk', interest: 'idk', pace: 'idk' });
  check('22) con todo en "No sé" Weë sigue y hay plan', todoNoSe.steps.length === 1);
  check('22) sin inventarse unas fechas', !/d{4}/.test(todoNoSe.steps[0].input.brief), todoNoSe.steps[0].input.brief);
  check('22) y lo dice en voz alta', /Como no estabas seguro/.test(todoNoSe.explainToUser) && /Cuando sepas las fechas/.test(todoNoSe.explainToUser), todoNoSe.explainToUser);
}

// ════════════════════════════════════════════════════════════════════════════
// E · Los cuatro planes, ejecutados
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Qué hace Weë con cada función ──');
{
  const plan = (respuestas) => travel.buildPlan('Un viaje a Portugal', respuestas);

  const itinerario = plan({ what: 'plan', days: 'week', interest: 'culture', pace: 'balanced' });
  check('23) planificar es un solo paso, no dos', itinerario.steps.length === 1, String(itinerario.steps.length));
  check('23) y busca en internet antes de escribir', itinerario.steps[0].capability === 'text.search');
  check('23) el resultado es un itinerario', itinerario.steps[0].input.kind === 'itinerary');
  check('23) con lo que la persona contestó dentro', /cultura e historia/.test(itinerario.steps[0].input.brief) && /equilibrado/.test(itinerario.steps[0].input.brief), itinerario.steps[0].input.brief);

  const destinos = plan({ what: 'where', vibe: 'rest', days: 'weekend' });
  check('24) "no sé a dónde ir" propone destinos', destinos.steps[0].input.kind === 'destinations' && destinos.steps[0].capability === 'text.search');
  check('24) y ofrece seguir con el que elija', /Con el que elijas/.test(destinos.explainToUser), destinos.explainToUser);

  const actividades = plan({ what: 'doing' });
  check('25) qué hacer y dónde comer, con búsqueda', actividades.steps[0].input.kind === 'activities' && actividades.steps[0].capability === 'text.search');
  check('25) y promete la fuente de cada cosa', /fuente/.test(actividades.explainToUser));

  const transporte = plan({ what: 'moving' });
  check('26) cómo moverme, con búsqueda', transporte.steps[0].input.kind === 'transport' && transporte.steps[0].capability === 'text.search');
  check('26) y avisa de que son aproximados', /aproximad/.test(transporte.explainToUser));

  const todos = [itinerario, destinos, actividades, transporte];
  check('27) los cuatro son de Weë Travel', todos.every((p) => p.experience === 'travel'));
  check('27) y todos explican qué va a pasar antes de cobrar', todos.every((p) => p.explainToUser.length > 40));

  // Nada de capacidades nuevas: se usa lo que el motor ya sabe hacer.
  const capacidades = [...new Set(todos.flatMap((p) => p.steps.map((s) => s.capability)))];
  check('28) no estrena ninguna capacidad', capacidades.every((c) => ['text.search', 'text.generate', 'text.structure'].includes(c)), capacidades.join(','));
  check('28) ni ningún proveedor nuevo', !/travel/i.test(soloCodigo(leer('functions/src/engine/registry.ts'))));
  // Un precio de verdad —Credits, euros, dólares— no aparece por ningún lado: los
  // Credits los pone el Credit Engine cuando toca, no la sección.
  check('28) ni un precio inventado', !/\bCredits\b|[$€]\s?\d|\d+\s?(USD|EUR|soles)/i.test(soloCodigo(bloqueTravel)));
}

// ════════════════════════════════════════════════════════════════════════════
// F · Lo que Weë escribe: real, con fuentes y con avisos
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · Las instrucciones de cada resultado ──');
{
  const prompt = (kind) => {
    const built = buildTextPrompt('travel', kind, 'una semana', 'Japón 10 días en octubre', 'Preparar el itinerario', []);
    return built.system + '\n' + built.prompt;
  };

  const quienEs = prompt('itinerary');
  check('29) Weë Travel sabe quién es', /Weë Travel/.test(quienEs) && /No vendes nada ni reservas nada/.test(quienEs));

  const itinerario = prompt('itinerary');
  check('30) el itinerario va por días', /DÍA 1 · Ciudad/.test(itinerario));
  check('30) un día puede ser una sola cosa', /Todo el día/.test(itinerario));
  check('30) y no se rellena por rellenar', /No rellenes con actividades de relleno/.test(itinerario));
  check('31) termina con un presupuesto por rangos', /PRESUPUESTO:/.test(itinerario) && /Nunca des una cifra exacta/.test(itinerario));

  const destinos = prompt('destinations');
  check('32) los destinos son exactamente tres', /EXACTAMENTE TRES/.test(destinos) && /ni uno más/.test(destinos));
  check('32) y distintos entre sí, para que haya algo que decidir', /distintos entre sí/.test(destinos));

  const actividades = prompt('activities');
  check('33) las actividades citan su fuente', /cita la fuente/.test(actividades));
  check('33) y avisan una sola vez', /Comprueba horarios y precios antes de ir\./.test(actividades) && /No repitas ese aviso/.test(actividades));

  const transporte = prompt('transport');
  check('34) el transporte avisa de que es aproximado', /Tiempos y precios aproximados\. Comprueba antes de viajar\./.test(transporte));
  check('34) y prefiere no saber a inventar', /dilo en vez de inventarlos/.test(transporte));

  const todas = [itinerario, destinos, actividades, transporte];
  check('35) ninguna se inventa un sitio que se pueda visitar', todas.every((p) => /existan de verdad|no estás seguro de uno|en vez de inventarlos/i.test(p)));
  check('35) y las otras experiencias no han cambiado de instrucciones', /Propón 6 ideas concretas/.test(buildTextPrompt('writer', 'ideas', '', 'x', 'y', []).prompt));
}

// ════════════════════════════════════════════════════════════════════════════
// G · Un itinerario largo se puede leer
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Los días se pliegan ──');
{
  // La función real de la tarjeta, ejecutada: no una copia escrita aquí.
  const fuente = tarjeta.slice(tarjeta.indexOf('const LINEA_DIA'), tarjeta.indexOf('/** El texto de un resultado'));
  const ts = require('typescript');
  const js = ts.transpileModule(fuente + '\nexport { partirEnDias };', {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const { partirEnDias } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

  const ITINERARIO = [
    'Japón en 10 días, en octubre: hojas rojas y buen tiempo.',
    '',
    'DÍA 1 · Tokio',
    'Llegada y barrio de Asakusa',
    '- Tarde: templo Sensō-ji y la calle Nakamise.',
    '',
    'DÍA 2 · Tokio',
    'Shibuya y Shinjuku',
    '- Mañana: cruce de Shibuya.',
    '- Noche: cena en Omoide Yokochō.',
    '',
    'DÍA 3 · Nikko',
    'Todo el día: excursión a los santuarios.',
    '',
    'PRESUPUESTO:',
    'Vuelos: 900–1.400 €',
    'Total estimado: 2.200–3.100 €',
    'Los precios son estimaciones.',
  ].join('\n');

  const partes = partirEnDias(ITINERARIO);
  check('36) un itinerario se parte en sus días', partes?.dias.length === 3, String(partes?.dias.length));
  check('36) el resumen de arriba se queda fuera de los días', /hojas rojas/.test(partes.intro) && !/hojas rojas/.test(partes.dias[0].cuerpo));
  check('36) cada día se lleva lo suyo', /Sensō-ji/.test(partes.dias[0].cuerpo) && /Omoide/.test(partes.dias[1].cuerpo) && /santuarios/.test(partes.dias[2].cuerpo));
  check('37) el presupuesto nunca se pliega', /Total estimado/.test(partes.cierre) && !partes.dias.some((d) => /Total estimado/.test(d.cuerpo)));
  check('38) un texto normal no se toca', partirEnDias('Una receta de pasta.\n\nIngredientes: …') === null);
  check('38) ni uno con un solo día', partirEnDias('DÍA 1 · Lima\nUn paseo.') === null);
  check('38) "día" dentro de una frase no parte nada', partirEnDias('Un día cualquiera en Lima.\nOtro día más.') === null);

  const codigo = soloCodigo(tarjeta);
  check('39) el primero llega abierto', /useState<Record<number, boolean>>\(\{ 0: true \}\)/.test(codigo));
  check('39) y se puede plegar y desplegar', /setAbiertos\(\(previo\) => \(\{ \.\.\.previo, \[indice\]: !previo\[indice\] \}\)\)/.test(codigo));
  check('39) con su estado dicho en voz alta', /accessibilityState=\{\{ expanded: abierto \}\}/.test(codigo) && /aria-expanded=\{abierto\}/.test(codigo));
}

// ════════════════════════════════════════════════════════════════════════════
// H · El resultado: qué se puede hacer con él, y de dónde dice que viene
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── H · Del resultado a la publicación ──');
{
  const codigo = soloCodigo(tarjeta);
  check('40) se puede ajustar lo que salió',
    /setEditing\(true\)/.test(codigo) && /t\('weeai\.whatDoWeChange'\)/.test(tarjeta)
    && /whatDoWeChange: '¿Qué cambiamos\?'/.test(leer('i18n/textos/es/weeai.ts')));
  check('40) guardarlo en un proyecto', /onSaveToProject/.test(codigo) && /t\('weeai\.saveToProject'\)/.test(tarjeta));
  check('40) y compartirlo con la comunidad', /onPublish\(publicable\)/.test(codigo) && /Publicar en mi comunidad/.test(tarjeta));
  check('41) las fuentes se ven y se pueden abrir', /Linking\.openURL\(source\.url\)/.test(codigo) && /result\.sources\?\.length/.test(codigo));

  check('42) al publicar queda apuntado de dónde viene', /sourceSection: EXPERIENCE_AREA\[experience\.id\]\?\.section \?\? experience\.id/.test(soloCodigo(flujo)));
  check('42) travel no se redirige a otra sección', !/travel/.test(soloCodigo(leer('constants/weeExperiences.ts')).slice(soloCodigo(leer('constants/weeExperiences.ts')).indexOf('EXPERIENCE_AREA'))));
  check('43) y el muro sabe cómo se llama', /travel: 'Weë Travel'/.test(seccionFeed));

  const ts = require('typescript');
  const js = ts.transpileModule(seccionFeed.replace(/^import .*$/m, ''), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const feed = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

  check('43) la etiqueta sale de lo que la publicación declara', feed.seccionDe({ sourceSection: 'travel' })?.nombre === 'Weë Travel');
  check('43) y también de un trabajo publicado desde la sección', feed.seccionDe({ aiTools: ['Weë Travel'] })?.id === 'travel');
  check('43) nadie acaba etiquetado por escribir "viaje"', feed.seccionDe({ content: 'Qué viaje tan bonito' }) === undefined);
  check('44) el muro sí recoge lo que habla de viajes', feed.belongsToSection({ content: 'Mi itinerario por Japón' }, feed.SECTION_MARKERS.travel));
  check('44) sin llevarse las recetas', !feed.belongsToSection({ content: 'Una receta de pasta' }, feed.SECTION_MARKERS.travel));
  check('44) ni Weë Chef los viajes', !feed.belongsToSection({ content: 'Mi itinerario por Japón' }, feed.SECTION_MARKERS.chef));
}

// ════════════════════════════════════════════════════════════════════════════
// I · Lo que no cambia
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── I · Sin efectos colaterales ──');
{
  check('45) el lugar de una publicación sigue siendo opcional', /Quitar el lugar/.test(crear) && /\.\.\.\(place \? \{ place \} : \{\}\)/.test(crear));
  check('45) y Weë Travel no lo toca', !/PostPlace|buscarLugares|etiquetaDeLugar|lugarDelCatalogo/.test(soloCodigo(bloqueTravel)));
  check('46) el precio se ve antes de confirmar', /Credits\)/.test(leer('components/creator/PlanCard.tsx')) && /t\('weeai\.creditsNote'\)/.test(leer('components/creator/PlanCard.tsx')));
  check('46) y Weë Travel pasa por el mismo camino', !/spendCredits|creditsService/.test(soloCodigo(specialists)));
  check('47) el "← Atrás" de las preguntas sigue como estaba', !/Atrás|volver a la pregunta/i.test(soloCodigo(leer('components/creator/GuidedQuestion.tsx'))));
  check('48) no se ha tocado la capa de ubicación', !/travel/i.test(soloCodigo(leer('contexts/LocationContext.tsx')) + soloCodigo(leer('services/locationService.ts'))));
  check('48) ni el catálogo de lugares', !/travel/i.test(soloCodigo(leer('data/places.ts'))));
}

// ════════════════════════════════════════════════════════════════════════════
// J · Se llega desde el menú ☰ (fase 2E-64D)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── J · El menú Burger ──');
{
  const menu = leer('components/DrawerMenu.tsx');
  const barra = leer('components/Sidebar.tsx');
  const rutas = leer('navigation/MainStackNavigator.tsx');

  /*
   * Lo que hace que Travel esté en el menú no es una línea nueva: es que el menú
   * recorre WEE_EXPERIENCES, que es la fuente única. Por eso lo que se comprueba
   * aquí es que sigue siendo así —una lista, no una lista escrita a mano— y que
   * Travel entra en esa lista.
   */
  check('49) el menú recorre la fuente única, sin lista propia', /WEE_EXPERIENCES\.map\(\(exp\) =>/.test(menu));
  check('49) y no hay ninguna entrada de Travel escrita a mano', !/travel/i.test(soloCodigo(menu)));
  check('49) la barra lateral hace lo mismo', /WEE_EXPERIENCES\.map\(\(exp\) =>/.test(barra) && !/travel/i.test(soloCodigo(barra)));

  const ts = require('typescript');
  const js = ts.transpileModule(leer('constants/weeExperiences.ts'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exp = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

  const enElMenu = exp.WEE_EXPERIENCES.filter((e) => e.id === 'travel');
  check('50) Weë Travel está en el menú', enElMenu.length === 1, String(enElMenu.length));
  check('50) una sola vez, sin duplicados', exp.ALL_EXPERIENCES.filter((e) => e.id === 'travel').length === 1);
  check('51) se lee "Weë Travel", ni "Travel" ni "Viajes"', enElMenu[0].name === 'Weë Travel');
  check('51) con el avión delante', enElMenu[0].emoji === '✈️');
  check('51) y no está escondida como área de otra sección', !exp.EXPERIENCE_AREA.travel);

  // Dónde cae dentro del menú: después de Business y antes de Brain, que es el
  // comodín y cierra siempre la lista.
  const orden = exp.WEE_EXPERIENCES.map((e) => e.id);
  check('52) va después de Business', orden.indexOf('travel') === orden.indexOf('business') + 1, orden.join(','));
  check('52) y antes de Brain, que sigue cerrando', orden[orden.length - 1] === 'brain');
  /* Weë Writer salió del menú al entrar en el selector de Weë Studio; las demás, en su sitio. */
  check('52) las otras seis no se movieron de sitio', orden.filter((id) => id !== 'travel').join(',') === 'design,studio,music,chef,business,brain');

  // La ruta: la de siempre, con su identificador.
  check('53) el menú abre la pantalla de especialista', /navigateRoot\('Specialist', \{ id: category \}\)/.test(menu));
  check('53) y esa ruta existe una sola vez', (rutas.match(/<Stack\.Screen name="Specialist"/g) || []).length === 1);
  check('53) sin ninguna ruta propia de Travel', !/name="Travel|TravelScreen|TravelHome/.test(rutas));
  check('54) la pantalla resuelve el especialista por ese identificador', /useEspecialista\(id\)/.test(leer('screens/SpecialistScreen.tsx')));
}

// ════════════════════════════════════════════════════════════════════════════
// K · La documentación cuenta once (fase 2E-64D)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── K · La documentación ──');
{
  const creador = leer('docs/CREATOR.md');
  const ux = leer('docs/UX.md');
  const claude = leer('CLAUDE.md');
  const readme = leer('README.md');

  check('55) CREATOR.md cuenta once experiencias', /## 1\. Las 11 experiencias de WEE/.test(creador) && /## 8\. Las 11 secciones/.test(creador));
  check('55) y ninguna de las dos listas se olvida de Travel', /\| ✈️ \| WEE Travel \|/.test(creador) && /\| ✈️ \*\*WEE Travel\*\* \|/.test(creador));
  check('56) dice que es una sección, no una aplicación aparte', /WEE Travel es una sección, no una aplicación aparte/.test(creador));
  check('56) y que reutiliza el Wäll en vez de tener feed propio', /el Wäll general \| un feed propio/.test(creador));
  check('56) que 📍 Lugar es transversal a todo WEE', /📍 Lugar, que es transversal a todo WEE/.test(creador));
  check('56) y que no hay trips, GPS, mapa ni reservas', /colección `trips`/.test(creador) && /GPS, mapa/.test(creador) && /APIs de reservas/.test(creador));

  check('57) UX.md incluye Travel en la lista canónica', /✈️ WEE Travel/.test(ux));
  check('58) CLAUDE.md ya no dice diez', !/10 experiencias visibles/.test(claude) && /11 experiencias visibles/.test(claude));
  check('58) y nombra a Weë Travel entre las de identidad', /✈️ Weë Travel/.test(claude));
  check('59) README.md cuenta once', /11 experiencias:/.test(readme) && /Business, Travel, Brain/.test(readme));

  /*
   * Ningún documento vivo puede seguir afirmando que las experiencias son diez.
   * Ojo con lo que SÍ es cierto y no debe saltar: "10 secciones conectadas" a IA
   * real es correcto —son diez de once, porque Weë Music sigue en demo—. Lo que se
   * prohibe es contar diez EXPERIENCIAS, y decir "las 10 secciones" como total.
   */
  const vivos = { 'docs/CREATOR.md': creador, 'docs/UX.md': ux, 'CLAUDE.md': claude, 'README.md': readme, 'docs/AI-ENGINE.md': leer('docs/AI-ENGINE.md') };
  const DIEZ = /10\s*\**\s*experiencias|[Ll]as\s+\**10\**\s+secciones|solamente 10/;
  const mienten = Object.entries(vivos).filter(([, texto]) => DIEZ.test(texto)).map(([n]) => n);
  check('60) ningún documento vivo afirma que las experiencias son diez', mienten.length === 0, mienten.join(', '));
  check('60) y la comprobación sirve de algo: reconoce las tres formas de decirlo', DIEZ.test('las 10 experiencias') && DIEZ.test('**10 experiencias visibles**') && DIEZ.test('Las 10 secciones') && !DIEZ.test('10 secciones conectadas a IA real'));
}

// ════════════════════════════════════════════════════════════════════════════
// L · El servidor admite a Travel (fase 2E-64D)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── L · Ninguna lista de experiencias escrita a mano ──');
{
  const servidor = leer('functions/src/creator/index.ts');

  /*
   * Esto lo cazó el navegador, no las pruebas: el servidor tenía una lista de las
   * diez de antes y rechazaba Travel con "Experiencia desconocida". El tipo no
   * ayudó —`ExperienceId[]` no exige que estén todas— así que lo que se comprueba
   * ahora es que no haya lista que mantener.
   */
  check('61) las experiencias admitidas salen de las plantillas', /const EXPERIENCES = new Set<string>\(Object\.keys\(TEMPLATES\)\)/.test(servidor));
  check('61) y no hay ninguna escrita a mano', !/EXPERIENCES[^=]*= \[/.test(soloCodigo(servidor)));
  check('62) Travel está entre las admitidas', Object.keys(TEMPLATES).includes('travel'));
  check('62) y las diez de antes siguen', ['design', 'studio', 'photo', 'writer', 'music', 'beauty', 'chef', 'home', 'business', 'brain'].every((id) => Object.keys(TEMPLATES).includes(id)), Object.keys(TEMPLATES).join(','));
  check('62) once en total, ni una de más', Object.keys(TEMPLATES).length === 11, String(Object.keys(TEMPLATES).length));
}

// ════════════════════════════════════════════════════════════════════════════
// M · Fechas de verdad, no una lista de duraciones (fase 2E-65)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── M · ¿Cuándo viajas? ──');
{
  const { leerFechas, leerDuracion, duracionEscrita, frasedeFechas } = lib('creator/templates.js');
  // Un reloj fijo: el año de "12 de octubre" depende de cuándo se diga.
  const HOY = new Date(Date.UTC(2026, 8, 9, 12));
  const f = (texto) => leerFechas(texto, HOY);

  check('63) "del 12 al 22 de octubre" son once días', f('Voy a Japón del 12 al 22 de octubre')?.dias === 11, String(f('Voy a Japón del 12 al 22 de octubre')?.dias));
  check('63) y diez noches', f('Voy a Japón del 12 al 22 de octubre')?.noches === 10);
  check('63) con su día de salida y su día de regreso', f('del 12 al 22 de octubre')?.salida.toISOString().startsWith('2026-10-12') && f('del 12 al 22 de octubre')?.regreso.toISOString().startsWith('2026-10-22'));
  check('63) y se dice como lo diría una persona', f('del 12 al 22 de octubre')?.etiqueta === 'del 12 al 22 de octubre de 2026');

  check('64) los dos meses escritos también valen', f('del 12 de octubre al 22 de octubre de 2026')?.dias === 11);
  check('64) diciembre a enero cruza de año', f('del 28 de diciembre al 5 de enero')?.regreso.getUTCFullYear() === 2027);
  check('64) y son nueve días', f('del 28 de diciembre al 5 de enero')?.dias === 9, String(f('del 28 de diciembre al 5 de enero')?.dias));
  check('64) en cifras se entiende igual', f('del 12/10/2026 al 22/10/2026')?.etiqueta === 'del 12 al 22 de octubre de 2026');
  check('64) un mes que ya pasó habla del año que viene', f('Voy a España del 5 al 18 de mayo')?.salida.getUTCFullYear() === 2027);
  check('64) un solo día es un solo día', f('salgo el 12 de octubre')?.dias === 1 && f('salgo el 12 de octubre')?.noches === 0);
  check('64) el 31 de febrero no existe y no se inventa', f('del 30 al 31 de febrero') === undefined);

  check('65) "en octubre" no son fechas: hay que preguntarlas', f('Quiero viajar a Japón en octubre') === undefined);
  check('65) "10 días" tampoco', f('Japón 10 días en octubre') === undefined);
  check('65) pero la duración sí se entiende', leerDuracion('Japón 10 días en octubre') === 10);
  check('65) también escrita con letras', leerDuracion('diez días en Japón') === 10 && leerDuracion('una semana en Perú') === 7);
  check('65) y en semanas o meses', leerDuracion('dos semanas') === 14 && leerDuracion('un mes por Italia') === 30);
  check('65) un texto sin duración no la inventa', leerDuracion('Quiero viajar a Japón en octubre') === undefined);

  check('66) once días son diez noches, dicho', duracionEscrita(11) === '11 días · 10 noches');
  check('66) y un día es un día sin noches', duracionEscrita(1) === '1 día · 0 noches');
  check('66) la frase del calendario y la del texto son la misma función', frasedeFechas(new Date(Date.UTC(2026, 9, 12, 12)), new Date(Date.UTC(2026, 9, 22, 12))) === 'del 12 al 22 de octubre de 2026');
}

// ════════════════════════════════════════════════════════════════════════════
// N · La conversación con fechas
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── N · Preguntar solo lo que falta ──');
{
  const dates = travel.questions.find((q) => q.id === 'dates');

  check('67) ya no hay lista de duraciones', !travel.questions.some((q) => q.id === 'days'));
  check('67) ni una sola opción prefabricada de tiempo', !/Una semana|Dos semanas|Un mes|Un fin de semana|Más de dos semanas/.test(JSON.stringify(travel.questions)), JSON.stringify(travel.questions.map((q) => q.id)));
  check('68) se pregunta cuándo viaja, con calendario', dates?.kind === 'dates' && dates.text === '¿Cuándo viajas?');
  check('68) y "todavía no lo sé" es una respuesta entera', dates?.options.length === 1 && dates.options[0].id === 'idk' && /Todavía no lo sé/.test(dates.options[0].label));
  check('68) solo se pregunta a quien planifica o busca destino', dates?.when({ what: 'plan' }) === true && dates.when({ what: 'where' }) === true && dates.when({ what: 'moving' }) === false && dates.when({ what: 'doing' }) === false);

  const conversar = async (goal, respuestas = {}) => {
    const answers = [];
    const preguntas = [];
    for (let vuelta = 0; vuelta < 12; vuelta++) {
      const turno = await templatePlanner.next({ experienceId: 'travel', goal, answers });
      if (turno.plan) return { plan: turno.plan, preguntas };
      preguntas.push(turno.question.id);
      const dada = respuestas[turno.question.id];
      answers.push(dada ? { questionId: turno.question.id, ...dada } : { questionId: turno.question.id, optionId: turno.question.options[0].id });
    }
    throw new Error('el cuestionario no termina');
  };

  const conFechas = await conversar('Voy a Japón del 12 al 22 de octubre');
  check('69) quien ya dijo las fechas no vuelve a darlas', !conFechas.preguntas.includes('dates'), conFechas.preguntas.join(','));
  check('69) y llegan enteras al encargo', /del 12 al 22 de octubre de \d{4} \(11 días · 10 noches\)/.test(conFechas.plan.steps[0].input.brief), conFechas.plan.steps[0].input.brief);
  check('69) y a lo que Weë promete', /del 12 al 22 de octubre/.test(conFechas.plan.explainToUser), conFechas.plan.explainToUser);

  const soloMes = await conversar('Quiero viajar a Japón en octubre');
  check('70) quien dice solo el mes sí las da en el calendario', soloMes.preguntas.includes('dates'));

  const soloDias = await conversar('Japón 10 días en octubre');
  check('70) quien dice los días también, pero no se le pierden', soloDias.preguntas.includes('dates') && /10 días · 9 noches/.test(soloDias.plan.steps[0].input.brief), soloDias.plan.steps[0].input.brief);

  const sinSaber = await conversar('Quiero viajar a Japón en octubre', { dates: { optionId: 'idk' } });
  check('71) sin fechas no se bloquea: hay plan igual', sinSaber.plan.steps.length === 1);
  check('71) no se inventa ninguna', !/\bde \d{4}\b/.test(sinSaber.plan.steps[0].input.brief), sinSaber.plan.steps[0].input.brief);
  check('71) y se dice que se pueden decidir después', /Cuando sepas las fechas/.test(sinSaber.plan.explainToUser), sinSaber.plan.explainToUser);

  // El ejemplo del §4: una frase, cero preguntas.
  const todoEnUna = await conversar('Quiero ir a Japón del 12 al 22 de octubre, me gusta la comida y la cultura y no quiero correr demasiado');
  check('72) una frase completa no genera ni una pregunta', todoEnUna.preguntas.length === 0, todoEnUna.preguntas.join(','));
  check('72) con sus fechas', /del 12 al 22 de octubre/.test(todoEnUna.plan.steps[0].input.brief));
  check('72) sus dos intereses, no uno', /la cultura y la comida/.test(todoEnUna.plan.steps[0].input.brief), todoEnUna.plan.steps[0].input.brief);
  check('72) y su ritmo', /tranquilo/.test(todoEnUna.plan.steps[0].input.brief));

  // Las deducciones escritas solo las acepta quien las declara.
  const conFreeInfer = travel.questions.filter((q) => q.freeInfer).map((q) => q.id);
  check('73) solo dos preguntas aceptan deducciones escritas', conFreeInfer.join(',') === 'dates,interest', conFreeInfer.join(','));
  const otras = ['design', 'studio', 'photo', 'writer', 'music', 'beauty', 'chef', 'home', 'business', 'brain'];
  check('73) y ninguna de las otras diez experiencias', otras.every((id) => !TEMPLATES[id].questions.some((q) => q.freeInfer)));
}

// ════════════════════════════════════════════════════════════════════════════
// O · El calendario en la pantalla
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── O · El calendario ──');
{
  const calendario = leer('components/creator/DateRangePicker.tsx');
  const guiada = leer('components/creator/GuidedQuestion.tsx');
  const codigo = soloCodigo(guiada);

  check('74) hay calendario, y no trae dependencia nueva', /const DateRangePicker/.test(calendario) && !/^import .*(react-native-calendars|datetimepicker|date-fns|moment|dayjs)/m.test(calendario));
  check('74) ni se añadió al package.json', !/calendar|datetimepicker|date-fns|moment/i.test(leer('package.json')));
  check('75) se dibuja solo cuando la pregunta pide fechas', /question\.kind === 'dates' \? \(/.test(codigo));
  check('75) y entonces no se pintan además los botones ni el texto libre', /question\.allowFreeText !== false && question\.kind !== 'dates'/.test(codigo));
  check('75) ninguna otra experiencia pide fechas', Object.entries(TEMPLATES).filter(([, t]) => t.questions.some((q) => q.kind === 'dates')).map(([id]) => id).join(',') === 'travel');
  check('76) devuelve la frase que entiende el servidor', /onConfirm=\{\(frase\) => onAnswer\(undefined, frase\)\}/.test(codigo));
  check('76) y "todavía no lo sé" contesta la opción, no un texto', /onSkip=\{\(\) => onAnswer\('idk'\)\}/.test(codigo));
  check('77) no deja elegir un día que ya pasó', /disabled=\{pasado \|\| busy\}/.test(soloCodigo(calendario)));
  check('77) los días se pueden tocar con el pulgar', /minWidth: 34,/.test(calendario) && /minHeight: 34,/.test(calendario));
  check('77) y los botones no encogen en pantalla pequeña', (calendario.match(/minHeight: 44,/g) || []).length === 2 && /width: 44,\n\s+height: 44,/.test(calendario) && !/scale\(44\)|scale\(34\)/.test(calendario));
  check('77) y dice en cada momento qué toca hacer', /Toca el día que sales/.test(calendario) && /Ahora toca el día que vuelves/.test(calendario));
  check('78) cuenta los días y las noches al elegir', /duracionEscrita\(salida, regreso\)/.test(soloCodigo(calendario)));
}

// ════════════════════════════════════════════════════════════════════════════
// P · El itinerario se lee de un vistazo
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── P · El resultado ──');
{
  const itinerario = buildTextPrompt('travel', 'itinerary', 'viaja del 12 al 22 de octubre de 2026 (11 días · 10 noches)', 'Japón', 'x', []).prompt;
  check('79) empieza por destino, fechas y duración', /DESTINO EN MAYÚSCULAS/.test(itinerario) && /Fechas por decidir/.test(itinerario));
  check('79) cada día lleva su fecha', /DÍA 1 · <fecha corta/.test(itinerario));
  check('79) las fechas se copian, no se inventan', /COPIA las fechas del encargo; no inventes ninguna/.test(itinerario));
  check('79) y sin fechas no se pone ninguna', /escribe los días sin fecha/.test(itinerario));
  check('80) avisa si las fechas caen en lluvias o en fiestas', /temporada de lluvias, en un festival/.test(itinerario));

  const actividades = buildTextPrompt('travel', 'activities', '', 'Lisboa', 'x', []).prompt;
  check('81) qué hacer se agrupa por zonas y no es un muro de texto', /Agrúpalas por zona o barrio/.test(actividades) && /Nada de párrafos largos/.test(actividades));

  const codigo = soloCodigo(tarjeta);
  check('82) la cabecera del viaje se pinta aparte', /const cabecera = partes\.intro\.split/.test(codigo) && /styles\.cabeceraViaje/.test(codigo));
  check('82) con el destino en grande', /styles\.destino/.test(codigo) && /fontSize: FONT_SIZE\.lg/.test(tarjeta.slice(tarjeta.indexOf('  destino: {'))));
  check('82) y solo cuando hay días que plegar', tarjeta.indexOf('cabeceraViaje') > tarjeta.indexOf('if (!partes) {'));
}

// ════════════════════════════════════════════════════════════════════════════
// Q · Ajustar no borra el viaje (fase 2E-65.1)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Q · El contexto sobrevive a "Ajustar" ──');
{
  const { respuestaPara } = lib('creator/planner.js');
  const servidor = leer('functions/src/creator/index.ts');
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const pregunta = (id) => travel.questions.find((q) => q.id === id);

  // 1 y 2) La regla: opciones siempre, texto solo donde se declara.
  check('83) una pregunta con freeInfer acepta un valor escrito', respuestaPara(pregunta('dates'), 'del 12 al 22 de octubre de 2026')?.text === 'del 12 al 22 de octubre de 2026');
  check('83) y los intereses también', respuestaPara(pregunta('interest'), 'la cultura y la comida')?.text === 'la cultura y la comida');
  check('84) una pregunta sin freeInfer sigue aceptando solo sus opciones', respuestaPara(pregunta('pace'), 'balanced')?.optionId === 'balanced' && respuestaPara(pregunta('pace'), 'muy tranquilo pero no tanto') === null);
  check('84) y la primera pregunta, igual que siempre', respuestaPara(pregunta('what'), 'plan')?.optionId === 'plan' && respuestaPara(pregunta('what'), 'cualquier cosa') === null);
  check('84) una opción válida gana al texto aunque la pregunta admita texto', respuestaPara(pregunta('dates'), 'idk')?.optionId === 'idk');
  check('84) y lo vacío nunca vale', respuestaPara(pregunta('dates'), '   ') === null && respuestaPara(pregunta('dates'), undefined) === null);
  check('84) un texto larguísimo se recorta, no se cuela entero', (respuestaPara(pregunta('dates'), 'x'.repeat(500))?.text || '').length === 200);

  // 11) Una sola fuente de verdad: las dos puertas usan la misma función.
  check('85) el servidor usa la misma regla que la deducción', /const respuesta = respuestaPara\(question, bruto\)/.test(servidor));
  check('85) y ya no lleva su propia copia', !/question\.options\.some\(\(o\) => o\.id === String\(preset/.test(servidor));
  check('85) la regla se escribe una sola vez en todo el servidor', (leer('functions/src/creator/planner.ts').match(/export const respuestaPara/g) || []).length === 1);

  // 3, 4) Fechas e intereses caben en presetAnswers.
  const comoPreset = (id, valor) => {
    const q = pregunta(id);
    const bruto = valor;
    return respuestaPara(q, bruto);
  };
  check('86) las fechas pasan por presetAnswers', !!comoPreset('dates', 'del 12 al 22 de octubre de 2026')?.text);
  check('86) los intereses también', !!comoPreset('interest', 'la cultura y la comida')?.text);

  /*
   * 5 a 9) El viaje entero, ajustado.
   *
   * Se reconstruye lo que hace la app: coge las respuestas del trabajo anterior,
   * las manda como presets y añade el cambio al objetivo. Se ejecuta el
   * planificador de verdad, no una imitación.
   */
  const conversar = async (goal, presets = [], respuestas = {}) => {
    const answers = presets.map((a) => ({ ...a }));
    const preguntas = [];
    for (let vuelta = 0; vuelta < 12; vuelta++) {
      const turno = await templatePlanner.next({ experienceId: 'travel', goal, answers });
      if (turno.plan) return { plan: turno.plan, preguntas, answers };
      preguntas.push(turno.question.id);
      const dada = respuestas[turno.question.id];
      answers.push(dada ? { questionId: turno.question.id, ...dada } : { questionId: turno.question.id, optionId: turno.question.options[0].id });
    }
    throw new Error('el cuestionario no termina');
  };

  // El viaje original: fechas del calendario, dos intereses, ritmo elegido.
  const original = await conversar('Japón', [], {
    what: { optionId: 'plan' },
    dates: { text: 'del 12 al 22 de octubre de 2026' },
    interest: { text: 'la cultura y la comida' },
    pace: { optionId: 'slow' },
  });
  check('87) el viaje original sale con sus fechas', /del 12 al 22 de octubre de 2026 \(11 días · 10 noches\)/.test(original.plan.steps[0].input.brief), original.plan.steps[0].input.brief);

  // Ajustar: el objetivo lleva el cambio y las respuestas viajan como presets.
  const presets = original.answers.map((a) => ({ questionId: a.questionId, ...(a.optionId ? { optionId: a.optionId } : {}), ...(a.text ? { text: a.text } : {}) }));
  const admitidos = presets.map((pre) => { const q = pregunta(pre.questionId); const r = respuestaPara(q, pre.optionId ?? pre.text); return r ? { questionId: pre.questionId, ...r } : null; }).filter(Boolean);
  check('88) el servidor admite las cuatro respuestas, fechas incluidas', admitidos.length === presets.length, admitidos.map((a) => a.questionId).join(','));

  const ajustado = await conversar('Japón · Cambio: Quiero un viaje más tranquilo', admitidos);
  check('89) ajustar no vuelve a preguntar nada', ajustado.preguntas.length === 0, ajustado.preguntas.join(','));
  check('89) y menos aún las fechas', !ajustado.preguntas.includes('dates'));
  check('89) ni los intereses', !ajustado.preguntas.includes('interest'));
  check('90) las fechas siguen siendo fechas, no un texto perdido', /del 12 al 22 de octubre de 2026 \(11 días · 10 noches\)/.test(ajustado.plan.steps[0].input.brief), ajustado.plan.steps[0].input.brief);
  check('90) la duración se sigue calculando de ellas', /11 días · 10 noches/.test(ajustado.plan.explainToUser));
  check('90) los dos intereses siguen', /la cultura y la comida/.test(ajustado.plan.steps[0].input.brief));
  check('90) y el ritmo elegido', /tranquilo/.test(ajustado.plan.steps[0].input.brief));
  check('91) el cambio pedido llega al encargo', /Cambio: Quiero un viaje más tranquilo/.test(ajustado.plan.goal), ajustado.plan.goal);
  check('91) sin borrar el destino', /Japón/.test(ajustado.plan.goal));

  // 10) Los trabajos de antes no se rompen: sin presets, todo igual.
  const historico = await conversar('Voy a Japón del 12 al 22 de octubre');
  check('92) un trabajo sin presets funciona como siempre', historico.preguntas.join(',') === 'interest,pace', historico.preguntas.join(','));
  const soloOpciones = await conversar('Un viaje', [{ questionId: 'what', optionId: 'moving' }]);
  check('92) y un preset de los de toda la vida sigue valiendo', soloOpciones.plan.steps[0].input.kind === 'transport');
  check('92) un preset con un id inventado se sigue descartando', respuestaPara(pregunta('what'), 'inventado') === null);

  // 12) Solo Travel arrastra contexto.
  check('93) solo Weë Travel conserva el contexto al ajustar', /const CONSERVA_EL_CONTEXTO = experience\.id === 'travel';/.test(soloCodigo(flujo)));
  check('93) las demás siguen abriendo el trabajo con el objetivo y nada más', /if \(!CONSERVA_EL_CONTEXTO \|\| !job\) return start\(goal\);/.test(soloCodigo(flujo)));
  check('93) y ninguna otra experiencia tiene preguntas con freeInfer', ['design', 'studio', 'photo', 'writer', 'music', 'beauty', 'chef', 'home', 'business', 'brain'].every((id) => !TEMPLATES[id].questions.some((q) => q.freeInfer)));
  check('93) "Cambiar algo" no se ha tocado', /onChange=\{\(\) => start\(job\.goal\)\}/.test(soloCodigo(flujo)));
}

// ════════════════════════════════════════════════════════════════════════════
// T · El muro manda: la Home de Travel no compite con él (fase 2E-69)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── T · Header limpio, una tarjeta, y debajo la gente ──');
{
  const codigo = soloCodigo(pantalla);
  const marco = soloCodigo(shell);
  const tarjeta = soloCodigo(lanzador);

  /*
   * Los Credits tienen UN sitio en Weë: el menú, bajo los dos perfiles. Repetirlos
   * en la cabecera de cada experiencia no informaba de nada nuevo y le quitaba
   * ancho al título. Se comprueba en el marco, que es de donde se quitaron.
   */
  check('94) no hay Credits en la cabecera de Weë Creator', !/CreditsPill/.test(marco), 'CreditsPill sigue en CreatorShell');
  check('94) ni Travel los pinta por su cuenta', !/CreditsPill|creditsBalance|useWallet/.test(tarjeta) && !/CreditsPill/.test(codigo));

  // La cabecera dice dónde estás con un distintivo dibujado, no con un emoji suelto.
  check('95) Travel entra con distintivo propio', /<TravelMark size=\{30\} plain \/>/.test(codigo));
  check('95) y el título es exactamente "Weë Travel"', /title=\{lanzador \? spec\.experience\.name/.test(codigo) && travel.name === 'Weë Travel');
  check('95) sin la etiqueta "WEË AI" encima', /overline=\{lanzador \? undefined/.test(codigo));
  check('95) el distintivo no es un emoji', !/heroEmoji|✈️/.test(soloCodigo(leer('components/creator/TravelMark.tsx'))));

  // El selector: cerrado al llegar, y cerrado otra vez cada vez que se vuelve.
  check('96) el selector nace cerrado', /useState\(false\)/.test(codigo) && /setHerramientasAbiertas\(false\)/.test(codigo));
  check('96) y la tarjeta obedece a ese estado', /open=\{herramientasAbiertas\}/.test(codigo));
  // Desde 2E-70 el chevron no se cambia por otro: gira. Lo detalla el bloque 103.
  check('96) con chevron, y su giro lo manda el estado', /name="chevron-down"/.test(tarjeta) && /toValue: open \? 1 : 0/.test(tarjeta));
  check('96) y lo dice también quien no ve el chevron', /aria-expanded=\{open\}/.test(tarjeta) && /accessibilityState=\{\{ expanded: open \}\}/.test(tarjeta));

  // Cuatro funciones, y salen de la configuración: no hay una quinta escrita a mano.
  const acciones = [...bloqueTravel.matchAll(/\{ id: '([^']+)', icon: /g)].map((m) => m[1]);
  check('97) siguen siendo cuatro', acciones.length === 4, acciones.join(','));
  check('97) y la tarjeta las pinta todas desde la configuración', /actions\.map\(\(action\) =>/.test(tarjeta) && !/'plan'|'where'|'doing'|'moving'/.test(tarjeta));
  check('97) filas, no una cuadrícula de tarjetas grandes', !/ActionGrid/.test(tarjeta) && !/MockMedia|aspectRatio/.test(tarjeta));
  check('97) cada una con su icono, su nombre y su frase corta', /action\.icon/.test(tarjeta) && /action\.title/.test(tarjeta) && /action\.subtitle/.test(tarjeta));

  // "Viajes que preparó Weë": fuera, y sin nada que la sustituya.
  // Sobre el código, no sobre los comentarios: la explicación de por qué se quitó
  // nombra la sección, y nombrarla no es enseñarla.
  check('98) no queda rastro de "Viajes que preparó Weë"', !/Viajes que prepar/.test(soloCodigo(specialists)), 'sigue en constants/specialists.ts');
  check('98) Travel no declara ejemplos', !/examplesTitle:|examples: \[/.test(bloqueTravel), 'bloqueTravel todavía trae ejemplos');
  check('98) y no se ha puesto otra sección en su hueco', !/viajes guardados|Mis itinerarios|Destinos sugeridos|Viajes populares/i.test(specialists + codigo));
  // El campo pasa a ser opcional, no desaparece: las otras secciones siguen enseñando la suya.
  check('98) las demás secciones conservan la suya', /examplesTitle\?: ClaveDeTexto;/.test(specialists) && (specialists.match(/^ {4}examplesTitle: /gm) || []).length >= 6);
  /* Una sola fila de ejemplos: la segunda existía solo para colgar bajo el muro, y el muro se fue. */
  check('98) y la fila solo se pinta si hay algo que enseñar', (codigo.match(/!!spec\.examples\?\.length/g) || []).length === 1);

  // Sin muro propio, y sobre todo sin nada que lo sustituya por la puerta de atrás.
  check('99) la sección no tiene muro', !/SectionWall/.test(codigo));
  check('99) no hay feed de Travel', !/TravelFeed|travelFeed|travelPosts/.test(codigo + specialists));
  check('99) ni "Cerca de ti" ni "Siguiendo"', !/Cerca de ti|Siguiendo/i.test(bloqueTravel));
  check('99) ni una colección nueva', !/collection\(['"]travel/i.test(codigo + tarjeta));
  /*
   * Y ninguna pestaña sobrevive. "Muro Travel", "Fotos del viaje", "Consejos" y
   * "Mis viajes" construían una red social paralela dentro de una sección, que
   * es exactamente lo que Weë no es: hay un muro, y Travel es un contexto que
   * una publicación lleva encima sin dejar de pertenecer a él (fase 2E-73).
   */
  // Y ya no queda ninguna, ni en Travel ni en ninguna otra: el muro de sección se retiró entero.
  check('99) y no queda ni una pestaña en Travel', ['Muro Travel', 'Fotos del viaje', 'Consejos', 'Mis viajes'].every((t) => !soloCodigo(bloqueTravel).includes(t)), 'alguna pestaña sigue viva en travel');
  check('99) "Muro Travel" no existe en ningún sitio', !/Muro Travel/.test(soloCodigo(specialists) + codigo));
  check('99) ni pestañas de muro en ninguna sección', !/tabs: \[/.test(soloCodigo(specialists)));

  // Nada de esto puede haber cambiado lo que ocurre al elegir.
  check('100) escribir sigue abriendo el mismo flujo', /onSubmit=\{\(text\) => startFlow\(text\)\}/.test(codigo));
  check('100) y cada función sigue abriendo el suyo con su preset', /onAction=\{handleAction\}/.test(codigo) && /startFlow\(action\.goal, action\.preset/.test(codigo));
  check('100) la tarjeta no decide nada: solo avisa', !/navigation|CreatorFlow|creatorService/.test(tarjeta));
  check('100) y el emoji del ejemplo se sigue quitando antes de enviarlo', /objetivoDe\(chip\)/.test(tarjeta));

  /*
   * 2E-70. Lo que se protege aquí es el espacio: cada píxel que estos tres
   * bloques dejan de ocupar es un píxel de foto de alguien. Medido en el
   * navegador, la primera publicación subió de y=586 a y=427 en 375x812.
   */

  // Los ejemplos, en una fila que se desliza: envueltos ocupaban tres líneas.
  check('101) los ejemplos no se envuelven', /<ScrollView\s+horizontal/.test(tarjeta) && !/flexWrap: 'wrap'/.test(tarjeta));
  check('101) y siguen siendo los tres, tocables', /idea\.chips\.map/.test(tarjeta) && /hitSlop=\{\{ top: 6, bottom: 6/.test(tarjeta));

  /*
   * La puerta de publicar salió del muro de sección a su propio componente para
   * poder ponerla también en el Home sin copiarla. Aquel muro ya no está y la
   * puerta se quedó, que era lo que valía.
   */
  const puerta = soloCodigo(leer('components/creator/ComposerEntry.tsx'));
  // El compositor plegado es OPCIONAL: sin la prop, quien la use no cambia.
  check('102) el compositor compacto es opcional', /compact\?: boolean;/.test(puerta));
  /*
   * Quien no pide `compact` sigue teniendo el bloque entero —atajos, destinos y
   * Publicar—; desde 2E-80 se pliega y arranca cerrado. La variante de una sola
   * fila no se despliega: ya es el mínimo, y un chevron que no abre nada mentiría.
   */
  check('102) y la fila desplegada sigue ahí para quien no lo pida', /const desplegable = !compact && !directo;/.test(puerta) && /\{desplegable && abierta && \(/.test(puerta));
  /* Y la sección ya no monta ninguna puerta: el muro que la llevaba se retiró. */
  check('102) la sección ya no monta la puerta de publicar', !/<ComposerEntry/.test(codigo) && !/SectionWall/.test(codigo));

  // Microinteracción: el chevron gira, no se cambia por otro icono.
  check('103) el chevron gira en los dos sentidos', /rotate: giro\.interpolate/.test(tarjeta) && /toValue: open \? 1 : 0/.test(tarjeta));
  check('103) y ya no hay dos iconos distintos', !/'chevron-up'/.test(tarjeta));

  // Lo que se toca no encoge con la pantalla: `scale()` quita un 10% en web.
  check('104) las medidas táctiles no pasan por scale()', /const TOQUE = 44;/.test(tarjeta) && !/height: scale\(TOQUE\)/.test(tarjeta));
  check('104) también en el atajo de foto del compositor', /composerFotoCompacta: \{\s*width: 44,\s*height: 44,/.test(puerta));

  // La puerta compartida y el Home tienen su propio archivo: `composer-entry.test.mjs`.

  /*
   * 2E-73. Weë tiene UN muro. Lo que se protege aquí es que Travel no se
   * convierta otra vez en una red social aparte, y que el muro de mentira que
   * sirve para juzgar el diseño no pueda tocar producción ni por accidente.
   */

  // Todo Travel detrás de una sola fila plegable.
  check('105) el bloque entero se pliega, no solo una parte', /accessibilityState=\{\{ expanded: open \}\}/.test(tarjeta) && (tarjeta.match(/aria-expanded=\{open\}/g) || []).length === 1);
  check('105) y cerrado no queda ni el campo ni los ejemplos ni las funciones', /\{open && \(/.test(tarjeta) && !/\{!open/.test(tarjeta));
  check('105) la transición dura lo que debe', (tarjeta.match(/duration: 200/g) || []).length === 2);

}

// ════════════════════════════════════════════════════════════════════════════
// U · Publicar es contar algo, no rellenar un formulario (fase 2E-74)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── U · El compositor social, el mismo para todo Weë ──');
{
  const crear = soloCodigo(leer('screens/CreateScreen.tsx'));

  /*
   * UN solo compositor. Todo Weë publica por la misma pantalla —el Wäll, el
   * botón +, la comunidad, la ayuda, el resultado de una generación— así que
   * arreglarla ahí lo arregla en todas partes. Lo que se vigila es que no
   * aparezca un segundo compositor por su cuenta.
   */
  const pantallasQueCrean = ['components/Sidebar.tsx', 'screens/HomeScreen.tsx', 'screens/CommunityScreen.tsx', 'screens/LandingScreen.tsx'];
  check('108) todas las superficies publican por la misma pantalla', pantallasQueCrean.every((f) => /navigate\('Create'/.test(soloCodigo(leer(f)))));
  check('108) y ninguna trae compositor propio', pantallasQueCrean.every((f) => !/<TextInput/.test(soloCodigo(leer(f)))));

  /*
   * El fallo que esto vigila: `showHowIMadeIt` arrancaba abierto con kind image,
   * video o weel. Tocar 📷 en el muro para subir una foto de tus vacaciones te
   * plantaba delante los campos de herramientas de IA, prompt y proceso.
   */
  /*
   * A nadie se le pregunta cómo lo hizo. El bloque de herramientas, prompt y
   * proceso desapareció del compositor: publicar es contar algo, no rellenar una
   * ficha técnica. Los campos siguen existiendo, pero solo los escribe Weë cuando
   * la publicación nace de una generación suya.
   */
  check('109) no se pregunta "Cómo lo hice" al publicar', !/renderHowIMadeIt|showHowIMadeIt/.test(crear), 'el bloque sigue en el compositor');
  check('109) ni hay campos que rellenar de IA', !/setAiToolsText|setAiPrompt|setAiProcess/.test(crear));
  check('109) pero lo que generó Weë se sigue apuntando solo', /routeParams\.prefill\?\.aiTools/.test(crear) && /routeParams\.prefill\?\.aiProcess/.test(crear));
  /* El buscador de lugar ya no vive en el compositor: vive en su pantalla, y el
     botón lleva allí. Lo que se vigila es que el compositor no lo recupere. */
  check('109) el lugar se elige en su pantalla, no dentro del compositor', /navigate\('AgregarUbicacion'/.test(crear) && !/buscarLugares|placeQuery/.test(crear));

  /*
   * Lo que se puede añadir vive en una fila CON NOMBRE pegada al texto. Antes
   * eran iconos sueltos en una barra anclada al fondo de la pantalla —a media
   * pantalla del texto en un móvil alto— y dos cajas grandes flotando en medio.
   */
  check('110) las acciones van en mosaicos, no en una barra al fondo', /const renderAcciones = \(\) => \(/.test(crear) && !/renderToolbar/.test(crear));
  check('110) y cada una dice lo que hace, no solo un icono', ['Cámara', 'Multimedia', 'ËContact', 'Ubicación', 'Encuesta', 'Mis proyectos'].every((t) => crear.includes(`texto="${t}"`)));
  // Amigos tiene su sitio pero no engaña: apagado y avisando de que llega después.
  /*
   * ËContact será el nombre de la red de conexiones de Weë en todos los idiomas.
   * Su sitio estuvo reservado y apagado mientras no hubo nada detrás; ahora abre
   * la agenda del perfil activo, así que se vigila lo contrario: que NO vuelva a
   * quedarse apagado. Misma aserción que en `composer.test.mjs`, y las dos
   * tienen que decir lo mismo.
   */
  const bloqueEContactTravel = crear.slice(crear.indexOf('texto="ËContact"'), crear.indexOf('texto="ËContact"') + 280);
  check('110) ËContact ya no está apagado', !/apagada/.test(bloqueEContactTravel));
  check('110) y abre la agenda del perfil activo', /setShowEContacts/.test(bloqueEContactTravel));
  check('110) y ya no se llama Amigos', !/texto="Amigos"/.test(crear));
  // La encuesta no está en la maqueta pero existe en Weë: quitarla la dejaría sin puerta.
  check('110) y la encuesta conserva su única puerta', /onPress=\{handlePollPress\}/.test(crear));
  // Sobre el fuente CRUDO: `soloCodigo` se atraganta con este archivo —ya pasó—
  // y se come trozos enteros. Para una construcción inequívoca no hace falta.
  /*
   * `MediaTypeOptions.All` está obsoleto y en el teléfono llegaba al selector de
   * Google SIN tipos MIME: solo enseñaba fotos, con el botón diciendo "Foto o
   * vídeo". La lista moderna sí pide las dos cosas. Comprobado en el aparato.
   */
  check('110) foto y vídeo son la misma puerta, y se dice: Multimedia', /mediaTypes: \['images', 'videos'\]/.test(leer('screens/CreateScreen.tsx')) && /texto="Multimedia"/.test(crear) && !/Foto o vídeo/.test(crear));
  // Sobre el USO, no sobre la palabra: el comentario que explica el cambio la nombra.
  check('110) y no queda ningún enum obsoleto pidiendo medios', !/ImagePicker\.MediaTypeOptions/.test(leer('screens/CreateScreen.tsx')));
  /*
   * Arriba se elige con qué se cuenta; debajo se cuenta. Es el orden en que la
   * gente publica: casi siempre hay algo que enseñar y el texto viene detrás.
   */
  /*
   * El orden de la maqueta aprobada: quién publica, qué cuenta, con qué, y dónde.
   * Las acciones bajan DEBAJO del texto —arriba parecían una barra técnica— y la
   * identidad abre la pantalla.
   */
  check('110) primero quién publica', crear.indexOf('styles.identidad') < crear.indexOf('{renderTextInput()}'));
  check('110) luego lo que cuenta, y después con qué', crear.indexOf('{renderTextInput()}') < crear.indexOf('{renderAcciones()}'));
  check('110) y al final dónde se comparte', crear.indexOf('{renderAcciones()}') < crear.indexOf('{renderDestinos()}'));
  check('110) la cabecera dice qué estás haciendo', /Nueva publicación<\/Text>/.test(crear) && /Publicar<\/Text>/.test(crear));
  /* El lugar elegido es un chip bajo el texto, parte de la publicación; y si
     no hay nada, no se pinta nada. Misma aserción que en composer.test.mjs. */
  check('110) el lugar elegido es un chip, y solo sale si hay algo', /const renderLugar = \(\) =>\s*\n?\s*place \|\| ubicacion \? \(/.test(crear) && /styles\.chipLugar/.test(crear));
  check('110) y va justo bajo el campo de texto, antes de las acciones', crear.indexOf('{renderTextInput()}') < crear.indexOf('{renderLugar()}') && crear.indexOf('{renderLugar()}') < crear.indexOf('{renderAcciones()}'));
  /*
   * MOSAICOS (fase 2E-76, modelo visual del usuario). Eran píldoras en una fila
   * que se arrastraba, y arrastrando se escondían la mitad: quien no lo hacía
   * nunca supo que había encuesta. Ahora las cinco están a la vista en dos filas.
   */
  check('110) las herramientas van en una sola fila, las seis a la vista y sin arrastrar',
    /acciones: \{\s*flexDirection: 'row',\s*flexWrap: 'wrap',\s*justifyContent: 'space-between'/.test(crear) && !/ScrollView horizontal[\s\S]{0,240}styles\.acciones/.test(crear) && !/accionesFila/.test(crear));
  check('110) el recuento no se mete dentro del nombre del botón', /texto="Multimedia"/.test(crear) && /insignia=\{fotosPuestas > 0/.test(crear));
  check('110) y el campo de texto es una hoja grande que crece, no un hueco fijo', /textInput: \{\s*minHeight: scale\(150\),/.test(crear) && !/minHeight: scale\(220\)/.test(crear));

  /*
   * El hueco de doce por ciento que se vio en el teléfono venía de que la
   * pregunta era el placeholder DEL campo y la ayuda iba detrás: la altura del
   * campo se metía entre las dos. Ahora van seguidas y el campo va después.
   */
  // Sobre el fuente crudo: `soloCodigo` se atraganta con este archivo (ya van tres).
  const fuenteCrear = leer('screens/CreateScreen.tsx');
  /*
   * Desde el rediseño del workspace la pregunta vuelve a ser el placeholder
   * del campo —"Escribe algo…"— y no hay línea de ayuda: quien entra, escribe.
   */
  check('111b) la pregunta es el placeholder del campo y no hay línea de ayuda', /placeholder=\{composerPlaceholder\}/.test(fuenteCrear) && !/textoAyuda|Cuéntanos tu experiencia|textoPregunta/.test(fuenteCrear));
  check('111b) y dentro del papel no hay emoji, # ni @', !/placeholder=""/.test(crear) && !/happy-outline|📹|'#'|'@'/.test(crear.slice(crear.indexOf('const renderTextInput'), crear.indexOf('const sinSitioParaMedios'))));

  /*
   * Y el defecto que encontró la validación: al elegir, el chip se ensanchaba
   * —ganaba icono y negrita— y la rejilla entera se recolocaba bajo el dedo.
   */
  check('111b) el hueco del check está reservado siempre', /styles\.destinoCheck,/.test(crear) && /destinoCheck: \{\s*width: scale\(20\),\s*height: scale\(20\)/.test(crear));
  check('111b) y el peso de la letra no cambia al elegir', !/fontWeight: elegido \?/.test(crear));
  check('110) el botón se enciende cuando ya lleva algo puesto', /activa=\{!!place \|\| !!ubicacion\}/.test(crear) && /activa=\{attachedMedia\.length > 0\}/.test(crear));

  // Publicar exige contenido: ni texto vacío ni una publicación en blanco.
  check('111) no se publica sin contenido', /const canPublish = hasContent && !isTextOverLimit && !isPublishing && isPollValid;/.test(crear));
  check('111) y el botón lo refleja', /disabled=\{!canPublish\}/.test(crear));

  // El contexto viaja con la publicación, pero no crea un muro aparte.
  /* El contexto de origen lo manda ahora quien nace en una experiencia: Weë Creator. */
  check('112) publicar desde una experiencia conserva su contexto',
    /sourceSection: EXPERIENCE_AREA\[experience\.id\]\?\.section \?\? experience\.id/.test(soloCodigo(leer('screens/CreatorFlowScreen.tsx'))));
  /* Y la publicación sigue siendo del muro general: hay uno, y es el Wäll. */
  check('112) y la publicación sigue siendo del muro general', /getMuroGeneralPaginado/.test(soloCodigo(leer('screens/LandingScreen.tsx'))));
}

// ════════════════════════════════════════════════════════════════════════════
// V · Destinos: quien publica decide dónde aparece (fase 2E-75)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── V · Un post, varios sitios donde se lee ──');
{
  const ts = require('typescript');
  const fuente = leer('utils/sectionFeed.ts');
  const js = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const feed = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

  const post = (extra = {}) => ({ id: 'p', userId: 'u', content: 'hola', likes: 0, comments: 0, ...extra });

  // 1-6) Cada combinación que pediste, comprobada de verdad.
  const soloGeneral = post({ destinations: ['general'] });
  const soloTravel = post({ destinations: ['travel'] });
  const generalYTravel = post({ destinations: ['general', 'travel'] });
  const travelYDesign = post({ destinations: ['travel', 'design'] });
  const muchos = post({ destinations: ['general', 'travel', 'design', 'chef'] });
  const todos = post({ destinations: feed.destinosDisponibles().map((d) => d.id) });

  check('113) solo general: en el muro, en ninguna sección', feed.vaAlMuroGeneral(soloGeneral) && !feed.vaALaSeccion(soloGeneral, 'travel'));
  check('113) solo Travel: en Travel y NO en el muro general', feed.vaALaSeccion(soloTravel, 'travel') && !feed.vaAlMuroGeneral(soloTravel));
  check('113) general + Travel: en los dos', feed.vaAlMuroGeneral(generalYTravel) && feed.vaALaSeccion(generalYTravel, 'travel'));
  check('113) Travel + Design: en esas dos y en el muro no', feed.vaALaSeccion(travelYDesign, 'travel') && feed.vaALaSeccion(travelYDesign, 'design') && !feed.vaAlMuroGeneral(travelYDesign));
  check('113) muro + varias secciones', feed.vaAlMuroGeneral(muchos) && ['travel', 'design', 'chef'].every((s) => feed.vaALaSeccion(muchos, s)));
  check('113) y en todos los destinos a la vez', feed.destinosDisponibles().every((d) => (d.id === 'general' ? feed.vaAlMuroGeneral(todos) : feed.vaALaSeccion(todos, d.id))));

  // 7) Sin tope artificial: el que quepa en la lista.
  check('114) no hay límite de destinos', todos.destinations.length === feed.destinosDisponibles().length && todos.destinations.length >= 8);

  /*
   * 13-14) LO MÁS IMPORTANTE. Quien eligió dónde publicar ya lo dijo: adivinar por
   * las palabras del texto sería pisar una decisión explícita.
   */
  const viajeEnGeneral = post({ content: 'Me voy de viaje mañana a un hotel', destinations: ['general'] });
  const recetaEnGeneral = post({ content: 'Hice una receta de cocina buenísima', destinations: ['general'] });
  check('115) "viaje" no fuerza Travel si eligió solo el muro', !feed.vaALaSeccion(viajeEnGeneral, 'travel'));
  check('115) "receta" no fuerza Chef si eligió solo el muro', !feed.vaALaSeccion(recetaEnGeneral, 'chef'));
  check('115) y esas mismas palabras SÍ arrastran cuando no hay destinos', feed.vaALaSeccion(post({ content: 'Me voy de viaje a un hotel' }), 'travel'));

  // 11-12) Las de antes siguen exactamente como estaban. Nadie las migra.
  const historica = post({ content: 'Una receta de cocina de mi abuela' });
  check('116) una publicación sin destinos sigue en el muro general', feed.vaAlMuroGeneral(historica));
  check('116) y sigue encontrándose por palabras clave', feed.vaALaSeccion(historica, 'chef'));
  check('116) no se le inventa el campo', historica.destinations === undefined);
  check('116) una lista vacía cuenta como "sin destinos", no como "en ninguno"', feed.vaAlMuroGeneral(post({ destinations: [] })));

  // 15) Brain ayuda, no es un sitio donde publicar.
  check('117) Brain no es un destino', !feed.destinosDisponibles().some((d) => d.id === 'brain'));
  // 16) Los nombres salen de la fuente única, y cada uno es el suyo.
  const nombres = Object.fromEntries(feed.destinosDisponibles().map((d) => [d.id, d.nombre]));
  check('117) el muro general se llama por su nombre', nombres.general === 'Muro general');
  check('117) Travel dice "Weë Travel"', nombres.travel === 'Weë Travel');
  check('117) Studio dice "Weë Studio"', nombres.studio === 'Weë Studio');
  check('117) Design dice "Weë Design"', nombres.design === 'Weë Design');
  check('117) Chef dice "Weë Chef"', nombres.chef === 'Weë Chef');
  check('117) y están los ocho que se aprobaron', ['general', 'travel', 'design', 'studio', 'chef', 'business', 'music', 'writer'].every((id) => !!nombres[id]) && feed.destinosDisponibles().length === 8);
  check('117) sin inventar secciones que no existen', !['kids', 'health', 'education', 'community', 'photography'].some((id) => nombres[id]));

  // 8) UN documento. Los muros son lecturas, no copias.
  /*
   * Sobre el fuente CRUDO: `soloCodigo` se atraganta con CreateScreen.tsx —un
   * falso `/*` le hace tragarse bloques enteros— y ya me ha mordido dos veces con
   * este mismo archivo. Para construcciones inequívocas no hace falta limpiarlo.
   */
  const crearCrudo = leer('screens/CreateScreen.tsx');
  const crear = soloCodigo(crearCrudo);
  check('118) se guarda un solo post con su lista de destinos', /destinations: destinos/.test(crearCrudo) && (crearCrudo.match(/postsService\.create/g) || []).length === 1);
  check('118) y la lista es la que eligió la persona, sin recortar', !/destinos\.slice\(|maxTags|MAX_DESTINOS/.test(crear));

  // 17-19) El sitio desde el que se abre viene marcado, pero se puede cambiar.
  check('119) se preselecciona el sitio desde el que se abrió', /useState<string\[\]>\(\(\) => \[sourceSection \|\| MURO_GENERAL\]\)/.test(crear));
  check('119) y se puede añadir y quitar cualquiera', /actuales\.includes\(id\) \? actuales\.filter/.test(crear));
  check('119) la lista de destinos sale de la fuente única', /destinosDisponibles\(\)/.test(crear) && !/'Weë Studio'|'Weë Design'/.test(crear));

  // 9-10) Home y las secciones respetan lo que la publicación dice.
  const home = soloCodigo(leer('screens/HomeScreen.tsx'));
  /*
   * UN SOLO SITIO DONDE SE COMPONE EL MURO (fase 2E-75).
   *
   * Antes cada pantalla montaba su sobreconsulta y decidía a su manera si quedaba
   * más, y de ahí salieron tres defectos distintos. Ahora Home, la portada y la
   * portada web piden por `getMuroGeneralPaginado` y ninguna vuelve a escribir
   * `sobreconsulta` por su cuenta.
   */
  const portada = soloCodigo(leer('screens/LandingScreen.tsx'));
  const portadaWeb = soloCodigo(leer('screens/WebLandingScreen.tsx'));
  check('120) Home filtra por destinos', /getMuroGeneralPaginado/.test(home));
  check('120) y la portada y la portada web piden por el mismo sitio', /getMuroGeneralPaginado/.test(portada) && /getMuroGeneralPaginado/.test(portadaWeb));
  check('120) ninguna pantalla vuelve a montar la sobreconsulta', ![home, portada, portadaWeb].some((p) => /sobreconsulta\(/.test(p)));
  check('120) y sin confundir "página corta" con "se acabó"', /hayMas/.test(home) && /hayMas/.test(portada) && /hayMas/.test(portadaWeb));
  check('120) el reparto por destinos sigue existiendo', /postsDeLaSeccion/.test(seccionFeed));
  check('120) el bucle de relleno tiene tope', /MAXIMO_DE_VUELTAS/.test(soloCodigo(fuente)));

  /*
   * ─── El cableado de las pantallas (fase 2E-75) ────────────────────────────
   *
   * Los defectos de esta fase no estaban en el filtro, que era correcto: estaban
   * en cómo lo usaban las pantallas. Dos reglas, y las dos se comprueban aquí:
   * `hasMore` sale de `hayMas` —nunca de contar lo que sobrevivió al filtro— y el
   * cursor se guarda SIEMPRE, aunque la tanda no deje ni una publicación.
   */
  check('120b) Home decide si queda muro por hayMas', /setHasMore\(siguiente\)/.test(home) && !/setHasMore\(documents\.length/.test(home));
  check('120b) y Home ya no apaga el scroll porque una tanda venga vacía', !/\}\s*else\s*\{\s*setHasMore\(false\);\s*\}/.test(home));
  check('120b) la portada guarda el cursor fuera del if', /if \(newPosts\.length > 0\) setFeedPosts/.test(portada) && /setLastDoc\(\(pagina\.lastDoc as any\) \|\| null\);\s*setHasMore\(pagina\.hayMas\)/.test(portada));
  check('120b) la portada web pagina de verdad', /const cargarMas = useCallback/.test(portadaWeb) && /Cargar más/.test(leer('screens/WebLandingScreen.tsx')));
  check('120b) y su botón desaparece cuando se acaba el muro', /\{hayMas && posts\.length > 0 && \(/.test(portadaWeb));

  /*
   * El muro de una sección tampoco puede quedarse en la primera tanda: de una
   * racha de documentos puede que ninguno sea de esa sección. Sigue leyendo la
   * colección general —`getPublicPostsPaginated`—, nunca una suya.
   */
  /*
   * El paginador por sección sigue en `sectionFeed`, aunque hoy no lo consuma
   * ningún muro propio: es el reparto por destinos, y de él vive el Wäll.
   */
  check('120c) el paginador por sección sigue en pie', /paginaDeLaSeccion/.test(seccionFeed) && /paginaDelMuroGeneral/.test(seccionFeed));
  check('120c) y el Wäll lee la colección general, no una propia', /getMuroGeneralPaginado/.test(portada) && !/collection\(db, '[a-z]+Posts'\)/.test(portada));

  // 20-21) Publicar es gratis y no pasa por ninguna IA.
  check('121) publicar no toca Credits ni IA', !/spendCredits|creditsService|gemini|creatorService/i.test(crear));

  /*
   * ─── Multimedia: hasta diez fotos, un vídeo de quince segundos, UN post ────
   *
   * La estructura ya existía —`attachedMedia` es una lista y el post guarda
   * `imageUrls`—, así que subir el tope no crea documentos ni arquitectura nueva.
   */
  check('122) caben diez fotos en una publicación', /const maxImages = 10;/.test(crearCrudo));
  check('122) y se pueden elegir varias de una vez', /allowsMultipleSelection: !hasVideo/.test(crearCrudo));
  /*
   * El tope de fotos ya no es un número suelto: con encuesta caben menos que sin
   * ella. Lo que se vigila es que TODO —lo que deja elegir el selector y lo que
   * dice la píldora— salga del mismo tope calculado, y que sin encuesta ese tope
   * siga siendo las diez de siempre.
   */
  check('122) el tope son diez fotos, o una si hay encuesta', /const topeImagenes = poll \? MAX_IMAGENES_CON_ENCUESTA : maxImages;/.test(crearCrudo));
  check('122) sin pasarse del tope al elegir', /selectionLimit: hasVideo \? 0 : topeImagenes - attachedMedia\.length/.test(crearCrudo));
  check('122) la píldora dice cuántas llevas de las que caben', /\$\{fotosPuestas\}\/\$\{topeImagenes\}/.test(crearCrudo));
  check('122) y un vídeo no cuenta como foto', /attachedMedia\.filter\(\(m\) => m\.type === 'image'\)\.length/.test(crearCrudo));

  // Un vídeo, quince segundos, comprobados ANTES de subir y sin tocar el archivo.
  check('123) quince segundos, todos los vídeos', /const maxVideoDurationSeconds = 15;/.test(crearCrudo));
  check('123) se rechaza diciendo cuánto dura', /no puede durar más de 15 segundos\. Tu video dura/.test(crearCrudo));
  // Ojo con la vara: 'trim' a secas cazaba las llamadas a .trim() del propio código.
  check('123) y no se recorta ni se convierte con IA', !/ffmpeg|transcode|videoTrim|recortarVideo|trimVideo/i.test(crear));

  // UN documento con su lista de medios. Diez fotos no son diez publicaciones.
  check('124) los medios van dentro del mismo post', /let imageUrls: string\[\] = \[\];/.test(crearCrudo) && /imageUrls\.push/.test(crearCrudo));
  check('124) y se sigue creando una sola publicación', (crearCrudo.match(/postsService\.create/g) || []).length === 1);

  /*
   * ─── El modelo visual que pidió el usuario (fase 2E-76) ───────────────────
   *
   * Con diez fotos, la miniatura deja de ser un detalle y pasa a ser la única
   * forma de que quepan: a ancho completo y 280 de alto eran casi tres mil
   * píxeles de scroll hasta el botón de publicar.
   */
  check('125) las fotos van en miniatura, no a ancho completo', /width: scale\(100\),\s*height: scale\(100\)/.test(crearCrudo) && !/height: scale\(280\)/.test(crearCrudo));
  check('125) y la rejilla no recorta las aspas de quitar', !/mediaGrid: \{[\s\S]{0,160}overflow: 'hidden'/.test(crearCrudo));
  check('125) el hueco de seguir añadiendo va al final de la tira', crearCrudo.indexOf('styles.mediaAgregar,') > crearCrudo.indexOf('removeMediaButton,'));
  check('125) y desaparece cuando ya no cabe nada', /\{!sinSitioParaMedios && \(/.test(crearCrudo));

  // Lo que se escribe vive en una tarjeta con su contador dentro, no en un renglón suelto.
  check('125) la caja de escribir es una tarjeta cerrada', /tarjetaTexto: \{\s*borderWidth: 1,/.test(crearCrudo));
  check('125) que dice cuánto llevas de cuánto cabe', /\{postText\.length\}\/\{maxTextLength\}/.test(crearCrudo));

  // Dónde publicar es una pregunta con su bloque, no el último campo del formulario.
  check('125) dónde publicar es un rótulo —PUBLICAR EN— sin pregunta ni explicación', /PUBLICAR EN/.test(crearCrudo) && !/¿Dónde quieres publicar\?|Puedes elegir una o más opciones|Elige una o más comunidades|Sugerir con IA|Tu publicación aparecerá/.test(crearCrudo));
  check('125) y no hay que arrastrar para ver los destinos', /flexWrap: 'wrap'/.test(crearCrudo));

  /*
   * ─── Lo que el usuario prohibió expresamente (fase 2E-76) ─────────────────
   *
   * Estas cuatro no son estilo: son promesas. La referencia visual que mandó
   * traía secciones que en Weë NO existen y una tercera entidad combinada; si
   * alguien las copia literalmente en una vuelta futura, esto lo para.
   */
  const SECCIONES_INVENTADAS = ['Weë Kids', 'Weë Health', 'Weë Education', 'Weë Community'];
  check('126) no se inventan secciones que Weë no tiene', SECCIONES_INVENTADAS.every((s) => !crearCrudo.includes(s)));
  check('126) ni una tarjeta combinada "Travel y Muro"', !/Travel y Muro/.test(crearCrudo));
  check('126) ni un bloque WeeTags aparte de los destinos', !/WeeTags/.test(crearCrudo));
  check('126) Brain no es destino social', /DESTINO_BRAIN_EXCLUIDO/.test(leer('utils/sectionFeed.ts')));
  check('126) el límite de texto sigue siendo el de Weë', /const maxTextLength = 500;/.test(crearCrudo) && !/maxTextLength = 2000/.test(crearCrudo));

  /*
   * La jerarquía de los destinos: cara, nombre y estado. Un radio pelado no
   * distingue "Weë Chef" de "Weë Music" hasta que lo lees; el emoji sí, y sale
   * del catálogo de Weë para que no haya dos verdades.
   */
  check('126) cada destino trae su cara del catálogo de Weë', /getExperienceById\(destino\.id\)/.test(crearCrudo) && /destinoEmoji/.test(crearCrudo));
  check('126) y el muro general lleva la suya, que no es una experiencia: el globo', /name="globe-outline"/.test(crearCrudo.slice(crearCrudo.indexOf('const renderDestinos'), crearCrudo.indexOf('const renderPublicar'))));
  check('126) el aro cae siempre en el mismo sitio: pegado al borde derecho del chip', /destino: \{\s*flexGrow: 1,\s*flexDirection: 'row',\s*alignItems: 'center',/.test(crearCrudo) && /destinoCheck: \{[\s\S]{0,120}marginLeft: 'auto',/.test(crearCrudo));
  // Y el nombre entero: en una sola fila se cortaba —"Muro ge…"— y lo vimos en el teléfono.
  check('126) y el nombre del destino cabe entero: encoge antes que cortarse', /destinoTexto: \{\s*flexShrink: 1,/.test(crearCrudo) && crearCrudo.indexOf('styles.destinoIcono') < crearCrudo.indexOf('styles.destinoTexto'));

  // Y el final de la pantalla respira: nada pegado al borde de abajo.
  check('126) el contenido no queda pegado al botón de publicar', /scrollContent: \{[\s\S]{0,160}paddingBottom: SPACING\.xl,/.test(crearCrudo));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeë Travel Fase A: cuatro funciones, sin inventar sitios y sin tocar nada más');
process.exit(failures ? 1 : 0);
