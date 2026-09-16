/*
 * WEË CHEF ES UN SITIO DE TRABAJO, NO UNA APP DE RECETAS.
 *
 * Decisión de producto (2026-09-15): Weë Chef deja de ser una ficha de
 * especialista y pasa a tener el MISMO lenguaje que Weë Studio —cabecera, caja
 * donde se escribe, funciones, mis proyectos—, con lo suyo dentro. Blanco,
 * mínimo, iconos de un trazo y negros, sin emojis y sin fotografías de comida.
 *
 * Lo que se rompe aquí se rompe en silencio: nadie ve un error, simplemente
 * vuelve un círculo amarillo, se cuela un emoji o una tarjeta cambia de sitio.
 * Por eso se vigilan seis cosas, cada grupo con su control:
 *
 *  A. el catálogo: las ocho funciones, en su orden, con su preset intacto;
 *  B. la pantalla: la estructura de Studio y el camino de siempre al crear;
 *  C. los paneles nuevos: dentro de la pantalla, y con atrás antes de salir;
 *  D. el dibujo: iconos que existen, negros, sin emojis ni fotos;
 *  E. los textos: claves en los dos idiomas, nada escrito a mano;
 *  F. lo que NO se toca: Credit Engine, precios y nombres que viajan al servidor.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { textosDe } from './i18n-ayuda.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');

/* Se ejecuta el catálogo de verdad: se transpila, se le quitan los imports y se llama. */
const ejecutar = (ruta, devuelve) => {
  const js = ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const cuerpo = js
    .replace(/^\s*import[^;]*;\s*$/gm, '')
    .replace(/^(\s*)export (const|function|let|var) /gm, '$1$2 ');
  return new Function(`${cuerpo}\n return ${devuelve};`)();
};

const pantalla = leer('screens/ChefScreen.tsx');
const acciones = leer('components/chef/ChefAcciones.tsx');
const panelTsx = leer('components/chef/ChefPanel.tsx');
const proyectos = leer('components/chef/ChefProyectos.tsx');
const catalogoTsx = leer('constants/chefTools.ts');

const { TARJETAS_DE_CHEF, ENTRADAS_POR_PANEL, CLAVE_DEL_PANEL, AJUSTES_DE_COCINA } =
  ejecutar('constants/chefTools.ts', '{ TARJETAS_DE_CHEF, ENTRADAS_POR_PANEL, CLAVE_DEL_PANEL, AJUSTES_DE_COCINA }');

console.log('\n─── A. El catálogo: ocho funciones, en su orden ───');

const ORDEN = ['ingredients', 'recipe', 'menu', 'healthy', 'nutrition', 'swap', 'shopping', 'idk'];
check('1) son ocho', TARJETAS_DE_CHEF.length === 8, String(TARJETAS_DE_CHEF.length));
check('2) y en el orden acordado',
  TARJETAS_DE_CHEF.map((t) => t.id).join(' · ') === ORDEN.join(' · '),
  TARJETAS_DE_CHEF.map((t) => t.id).join(' · '));

/*
 * Los `optionId` viajan al servidor y están dentro de los trabajos ya guardados
 * de la gente: si alguien los "mejora", los flujos viejos dejan de abrirse donde
 * abrían. Son exactamente los de `functions/src/creator/templates.ts`.
 */
const PRESETS = { ingredients: 'cook', recipe: 'recipe', menu: 'menu', healthy: 'healthy', idk: 'idk' };
const conPreset = TARJETAS_DE_CHEF.filter((t) => t.preset);
check('3) las cinco que abren la conversación guardan su opción de siempre',
  conPreset.length === 5 && conPreset.every((t) => t.preset.questionId === 'what' && t.preset.optionId === PRESETS[t.id]),
  conPreset.map((t) => t.id + '→' + t.preset.optionId).join(' · '));

const plantillas = leer('functions/src/creator/templates.ts');
const chefServidor = plantillas.slice(plantillas.indexOf('const chef: ExperienceTemplate'));
check('4) y esas opciones existen en el servidor',
  conPreset.every((t) => chefServidor.includes(`opt('${t.preset.optionId}'`)),
  'si una falta, la conversación abriría sin respuesta puesta');

const conPanel = TARJETAS_DE_CHEF.filter((t) => t.panel);
check('5) las tres nuevas abren un panel, no una conversación',
  conPanel.length === 3 && conPanel.map((t) => t.panel).join(' · ') === 'nutrition · swap · shopping',
  conPanel.map((t) => t.id).join(' · '));
check('6) ninguna tarjeta tiene las dos cosas', !TARJETAS_DE_CHEF.some((t) => t.preset && t.panel));

/* CONTROL: si alguien reordenara las tarjetas, la comprobación 2 tendría que caer. */
const revueltas = [...TARJETAS_DE_CHEF].reverse().map((t) => t.id).join(' · ');
check('CONTROL: un orden distinto sería detectado', revueltas !== ORDEN.join(' · '),
  'si esto pasara, el grupo A no protegería nada');

console.log('\n─── B. La pantalla: la estructura de Weë Studio ───');

check('7) Weë Chef tiene pantalla propia y se entrega desde la de especialista',
  /if \(id === 'chef'\) return <ChefScreen \/>;/.test(leer('screens/SpecialistScreen.tsx')));
check('8) lleva la cabecera unificada, con su saldo',
  /<CabeceraDeSeccion[\s\S]{0,220}nombre="Chef"/.test(pantalla) && /\n\s+credits\n/.test(pantalla));
check('9) la cabecera sabe enseñar el saldo, y sale del mismo sitio que en el resto de Weë',
  /credits &&[\s\S]{0,200}<CreditsPill compact \/>/.test(leer('components/creator/CabeceraDeSeccion.tsx')));
check('10) la caja es la única de Weë AI', /<CajaDePrompt/.test(pantalla));
/*
 * Y va VACÍA: sin invitación encima, sin frase dentro y sin píldoras debajo
 * (decisión del usuario, 2026-09-15). Lo único que no puede faltar es cómo se
 * llama el campo para quien no lo ve.
 */
check('10b) la caja va limpia: ni invitación, ni frase dentro, ni sugerencias',
  /placeholder=""/.test(pantalla)
  && !/InvitacionDeLaCaja/.test(pantalla)
  && !/idea\?\.chips|styles\.sugerencia/.test(pantalla));
check('10c) pero sigue teniendo nombre para quien la escucha',
  /etiqueta=\{t\('chef\.placeholder'\)\}/.test(pantalla)
  && /accessibilityLabel=\{etiqueta \?\? placeholder\}/.test(leer('components/creator/CajaDePrompt.tsx')));
check('11) dentro de la página que la deja crecer sin perder sus botones',
  /<PaginaDeCajas/.test(pantalla) && /<EspacioDeEscritura[\s\S]{0,80}descuento=/.test(pantalla));
check('12) la caja lleva los seis controles, en su orden',
  ['add', 'camera-outline', 'image-outline', 'mic-outline', 'options-outline']
    .every((i, n, todos) => pantalla.indexOf(`'${i}'`) > 0
      && (n === 0 || pantalla.indexOf(`'${todos[n - 1]}'`) < pantalla.indexOf(`'${i}'`))));
check('13) el orden de la pantalla: cabecera → caja → funciones → mis proyectos',
  pantalla.indexOf('<CabeceraDeSeccion') < pantalla.indexOf('<CajaDePrompt')
  && pantalla.indexOf('<CajaDePrompt') < pantalla.indexOf('<ChefAcciones')
  && pantalla.indexOf('<ChefAcciones') < pantalla.indexOf('<ChefProyectos'));
check('14) dos tarjetas por fila en el teléfono', /isMobile \? 2 :/.test(pantalla));

/*
 * Crear pasa por el camino de siempre: allí es donde Weë Brain pregunta lo que
 * falte y donde se ve el plan CON SU COSTE antes de gastar un Credit.
 */
check('15) crear abre la conversación de siempre, con la experiencia de siempre',
  /navigation\.navigate\('CreatorFlow', \{\s*experienceId: 'chef'/.test(pantalla));
check('16) y sin sesión manda a entrar, no a crear',
  /if \(!user\) \{\s*navigation\.navigate\('Login'\);/.test(pantalla));
check('17) el coste se enseña antes de crear, y lo pone el plan',
  /creditsEstimated/.test(leer('components/creator/PlanCard.tsx'))
  && /creditsEstimated=\{pricing \? pricing\.total : job\.creditsEstimated\}/.test(leer('screens/CreatorFlowScreen.tsx')));

/* CONTROL: una pantalla que creara por su cuenta no pasaría por el plan. */
check('CONTROL: Weë Chef no llama a ningún modelo ni motor por su cuenta',
  !/(creatorRun|engineRun|httpsCallable|fetch\()/.test(pantalla),
  'si esto pasara, se podría crear sin ver el coste');

console.log('\n─── C. Los paneles nuevos ───');

check('18) los tres tienen entradas', Object.keys(ENTRADAS_POR_PANEL).length === 3
  && Object.values(ENTRADAS_POR_PANEL).every((lista) => lista.length >= 6));
check('19) y cada uno su nombre', Object.keys(CLAVE_DEL_PANEL).join(' · ') === 'nutrition · swap · shopping');
check('20) un panel se come la pantalla, no abre una ruta',
  /if \(panel\) \{[\s\S]{0,400}<ChefPanel/.test(pantalla) && !/navigate\('Chef/.test(pantalla));
check('21) elegir dentro de un panel vuelve a la caja con la frase empezada',
  /setPrompt\(t\('chef\.panelStart', \{ panel: t\(CLAVE_DEL_PANEL\[cual\]\), que: t\(entrada\.clave\) \}\)\)/.test(pantalla));
check('22) atrás cierra el panel antes de salir de la sección',
  /hardwareBackPress[\s\S]{0,120}setPanel\(null\);\s*return true;/.test(pantalla));
check('23) y el panel tiene su propio volver', /accessibilityLabel=\{t\('common\.back'\)\}/.test(panelTsx));

/* CONTROL: un panel que navegara perdería lo escrito al volver. */
check('CONTROL: ningún panel navega a otra pantalla', !/navigation\.navigate/.test(panelTsx),
  'si esto pasara, volver borraría el prompt');

console.log('\n─── D. El dibujo: un trazo, negro, sin emojis ───');

const glifos = require(path.resolve(RAIZ, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'));
const iconos = [
  ...TARJETAS_DE_CHEF.map((t) => t.icono),
  ...Object.values(ENTRADAS_POR_PANEL).flat().map((e) => e.icono),
];
const inexistentes = iconos.filter((i) => !(i in glifos));
check('24) los ' + iconos.length + ' iconos existen en Ionicons', inexistentes.length === 0, inexistentes.join(' · '));
check('25) y todos son de un trazo', iconos.every((i) => i.endsWith('-outline')),
  iconos.filter((i) => !i.endsWith('-outline')).join(' · '));
check('26) se pintan del color del texto, no de colores',
  /color=\{theme\.colors\.text\}/.test(acciones) && /color=\{theme\.colors\.text\}/.test(panelTsx)
  && !/colors\.accent\b/.test(acciones));

/* Ni emojis ni fotografías: ni en el catálogo ni en lo que se pinta. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const sinEmoji = [
  ['el catálogo', catalogoTsx], ['las tarjetas', acciones], ['los paneles', panelTsx],
  ['mis proyectos', proyectos], ['la pantalla', pantalla],
].filter(([, s]) => EMOJI.test(s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));
check('27) ningún emoji en la interfaz de Weë Chef', sinEmoji.length === 0, sinEmoji.map(([q]) => q).join(' · '));
check('28) ni fotografías ni banners',
  ![acciones, panelTsx, proyectos, pantalla].some((s) => /<Image\b|require\('\.\.\/\.\.\/assets/.test(s)));
check('29) mis proyectos enseña lo que hay, y si no hay, lo dice',
  /proyectos\.length === 0 \?/.test(proyectos) && /t\('chef\.projectsEmpty'\)/.test(proyectos));

/* CONTROL: un emoji colado en un título de tarjeta tendría que caer. */
check('CONTROL: un emoji sería detectado', EMOJI.test('🍲 Quiero una receta'),
  'si esto pasara, la comprobación 27 no protegería nada');

console.log('\n─── E. Los textos ───');

const es = textosDe('es');
const en = textosDe('en');
const claves = [
  ...TARJETAS_DE_CHEF.flatMap((t) => [t.claveTitulo, t.claveSubtitulo]),
  ...Object.values(ENTRADAS_POR_PANEL).flat().map((e) => e.clave),
  ...Object.values(CLAVE_DEL_PANEL),
  ...AJUSTES_DE_COCINA.flatMap((g) => [g.clave, ...g.opciones.map((o) => o.clave)]),
];
const faltan = (T) => claves.filter((c) => {
  const [modulo, k] = c.split('.');
  return T[modulo]?.[k] === undefined;
});
check('30) las ' + claves.length + ' claves existen en español', faltan(es).length === 0, faltan(es).join(' · '));
check('31) y en inglés', faltan(en).length === 0, faltan(en).join(' · '));
check('32) el catálogo guarda claves, no frases',
  claves.every((c) => /^[a-z][A-Za-z0-9]*\.[A-Za-z0-9_]+$/.test(c)));
check('33) y no llama al traductor al construirse', !/\bt\(/.test(catalogoTsx.replace(/\/\*[\s\S]*?\*\//g, '')));
check('34) lo que viaja con la idea se pega por interpolación, no juntando cadenas',
  /t\('chef\.goalWith', \{ idea, ajustes: formato\.lista\(/.test(pantalla));

console.log('\n─── F. Lo que no se toca ───');

check('35) Weë Chef no suma, resta ni consulta Credits por su cuenta',
  !/(spendCredits|refundCredits|creditsBalance|creditCosts)/.test(pantalla + acciones + panelTsx + proyectos));
check('36) ni escribe un precio a mano',
  !/\b\d+\s*Credits\b/.test(pantalla + acciones + panelTsx + proyectos + catalogoTsx));
check('37) la ficha de especialista sigue entera, con sus siete funciones',
  /id: 'dessert'/.test(leer('constants/specialists.ts')) && /id: 'edit'/.test(leer('constants/specialists.ts')),
  'el postre y el retoque siguen dentro de la conversación');
check('38) los ajustes de cocina no se cuelan en el catálogo común de Weë AI',
  !/chef\./.test(leer('constants/ajustesContextuales.ts')));
check('39) y usan la mecánica común en vez de copiarla',
  /grupos=\{AJUSTES_DE_COCINA\}/.test(pantalla) && /<AjustesContextuales/.test(pantalla));
check('40) la hoja de ajustes sigue reservando el sitio de la barra del sistema',
  /paddingBottom: Math\.max\(insets\.bottom, SPACING\.lg\)/.test(leer('components/creator/AjustesContextuales.tsx')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
