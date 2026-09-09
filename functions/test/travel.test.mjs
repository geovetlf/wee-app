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

  check('4) entra en la barra lateral', /SPECIALIST_ORDER: SpecialistId\[\] = \['brain', 'design', 'music', 'studio', 'business', 'chef', 'writer', 'travel'\]/.test(specialists));
  check('4) y no hace falta ninguna ruta nueva', !/Travel(Screen|Flow|Home)/.test(leer('navigation/MainStackNavigator.tsx')));
}

// ════════════════════════════════════════════════════════════════════════════
// B · La pantalla: escribir primero, elegir después
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · El Home de Weë Travel ──');
{
  check('5) pregunta por el viaje con esas palabras', /title: '✈️ ¿Qué viaje tienes en mente\?'/.test(bloqueTravel));
  check('5) y la caja de escribir va ANTES de las funciones', /ideaFirst: true/.test(bloqueTravel));

  const codigo = soloCodigo(pantalla);
  const cajaArriba = codigo.indexOf('spec.ideaFirst && <IdeaBox');
  const plegable = codigo.indexOf('<Collapsible');
  const muro = codigo.indexOf('<SectionWall');
  check('6) en la pantalla, ese es el orden real', cajaArriba > 0 && cajaArriba < plegable && plegable < muro, `${cajaArriba} < ${plegable} < ${muro}`);
  // Una sola sección lo pide: la declaración del campo y su explicación no cuentan.
  check('6) y sin esa marca ninguna otra sección se mueve', /wall && spec\.ideaFirst && <IdeaBox/.test(codigo) && (specialists.match(/^ {4}ideaFirst: true,$/gm) || []).length === 1);

  check('7) tiene tres ejemplos que se tocan', (bloqueTravel.match(/chips: \[([^\]]*)\]/)?.[1].match(/'/g) || []).length === 6);
  check('7) y son los tres del diseño', /'🇯🇵 Japón en octubre', '🌴 Quiero una playa tranquila y barata', '🤷 No sé dónde viajar'/.test(bloqueTravel));

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

  check('9) el muro de la sección está', /wall: \{/.test(bloqueTravel) && /Muro Travel/.test(bloqueTravel));
  check('9) y el muro sigue siendo el genérico de siempre', /<SectionWall sectionId=\{spec\.id\} config=\{wall\} \/>/.test(soloCodigo(pantalla)));
}

// ════════════════════════════════════════════════════════════════════════════
// C · Cuatro funciones. Ni una más.
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · Las cuatro funciones ──');
{
  const acciones = [...bloqueTravel.matchAll(/\{ id: '([^']+)', icon: /g)].map((m) => m[1]);
  check('10) son exactamente cuatro', acciones.length === 4, acciones.join(','));
  check('10) y son las cuatro de la fase A', acciones.join(',') === 'plan,where,doing,moving', acciones.join(','));
  check('11) se llaman como se dijo', /title: 'Planificar un viaje'/.test(bloqueTravel) && /title: 'No sé a dónde ir'/.test(bloqueTravel) && /title: 'Qué hacer y dónde comer'/.test(bloqueTravel) && /title: 'Cómo moverme'/.test(bloqueTravel));
  check('11) cada una deja contestada la primera pregunta', (bloqueTravel.match(/preset: \{ questionId: 'what'/g) || []).length === 4);

  // Lo que la fase A NO trae. Se mira el código, no los comentarios.
  const codigoTravel = soloCodigo(bloqueTravel);
  // No hay ni una función de reservar, ni un pago, ni un precio a cobrar: las
  // cuatro acciones son las cuatro, y ninguna lleva a comprar nada.
  check('12) no reserva vuelos ni hoteles', !/reservar|booking|checkout|pagar|comprar|book now/i.test(codigoTravel));
  check('12) y lo dice de entrada', /'Sin reservas'/.test(bloqueTravel));
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
  check('40) se puede ajustar lo que salió', /setEditing\(true\)/.test(codigo) && /¿Qué cambiamos\?/.test(tarjeta));
  check('40) guardarlo en un proyecto', /onSaveToProject/.test(codigo) && /Guardar en un proyecto/.test(tarjeta));
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
  check('46) el precio se ve antes de confirmar', /Credits\)/.test(leer('components/creator/PlanCard.tsx')) && /Se descuentan al terminar/.test(leer('components/creator/PlanCard.tsx')));
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
  check('52) las otras siete no se movieron de sitio', orden.filter((id) => id !== 'travel').join(',') === 'design,studio,writer,music,chef,business,brain');

  // La ruta: la de siempre, con su identificador.
  check('53) el menú abre la pantalla de especialista', /navigateRoot\('Specialist', \{ id: category \}\)/.test(menu));
  check('53) y esa ruta existe una sola vez', (rutas.match(/<Stack\.Screen name="Specialist"/g) || []).length === 1);
  check('53) sin ninguna ruta propia de Travel', !/name="Travel|TravelScreen|TravelHome/.test(rutas));
  check('54) la pantalla resuelve el especialista por ese identificador', /getSpecialist\(/.test(leer('screens/SpecialistScreen.tsx')));
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
  check('56) y que reutiliza el Wall en vez de tener feed propio', /el Wall general \+ `SectionWall` filtrado \| un feed propio/.test(creador));
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

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeë Travel Fase A: cuatro funciones, sin inventar sitios y sin tocar nada más');
process.exit(failures ? 1 : 0);
