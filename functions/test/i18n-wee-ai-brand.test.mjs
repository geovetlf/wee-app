/*
 * EL SITIO TIENE UN NOMBRE Y ES "Weë AI" (fase 5D).
 *
 * Durante un tiempo convivieron dos grafías: el menú y la columna derecha
 * decían "Weë AI" y el marco de las pantallas, el atajo de la hoja Crear, la
 * Ayuda y los Credits decían "WEË AI" en versales. La misma cosa, escrita de
 * dos maneras, en pantallas que están a un toque una de otra.
 *
 * LA GRAFÍA APROBADA ES "Weë AI", con la diéresis y sin versales. Y como es un
 * nombre propio, NO SE TRADUCE: la frase que lo rodea cambia de idioma y él no.
 * "Abrir Weë AI" / "Open Weë AI".
 *
 * LO QUE NO SE TOCA, Y AQUÍ SE DEFIENDE:
 *
 *   · los identificadores —la ruta `WeeCreator`, el id `creator`, las
 *     colecciones `creator*`, `wee-ai` donde sea una clave—, que viajan al
 *     servidor y están dentro de los trabajos ya guardados de la gente;
 *   · el "WEË AI ENGINE", que es el motor y se llama así en su documentación;
 *   · el servidor, que queda para otra fase y por eso todavía escribe versales.
 *
 * Se usa el traductor de verdad de Weë, como en `i18n-polls.test.mjs`.
 */
import fs from 'node:fs';
import { traductorDe } from './i18n-ayuda.mjs';

/*
 * Un archivo que falta es un ERROR, no un texto vacío (revisión de cierre 2026-10-01, `tests/lector-tolerante`):
 * con `''` las comprobaciones negadas —«ninguna superficie dice WEË AI»— pasaban en verde si alguien renombraba o
 * borraba la superficie. Si una superficie desaparece de verdad, se quita de SUPERFICIES a propósito.
 */
const leer = (p) => {
  const url = new URL('../../' + p, import.meta.url);
  if (!fs.existsSync(url)) throw new Error(`i18n-wee-ai-brand: no existe ${p} (¿se renombró? actualiza la suite)`);
  return fs.readFileSync(url, 'utf8');
};
const soloCodigo = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`);
  else { failures++; console.log(`✘ ${name}${extra ? ' — ' + extra : ''}`); }
};

const ES = await traductorDe('es');
const EN = await traductorDe('en');

/* Las superficies visibles del área: las que se leen en pantalla. */
const SUPERFICIES = [
  'components/creator/CreatorShell.tsx',
  'components/creator/CreatorSidebar.tsx',
  'components/CreateSheet.tsx',
  'components/RightSidebar.tsx',
  'components/Sidebar.tsx',
  'components/DrawerMenu.tsx',
  'screens/WeeCreatorScreen.tsx',
  'screens/SpecialistScreen.tsx',
  'screens/BrainChatScreen.tsx',
  'screens/BusinessScreen.tsx',
  'screens/CreatorFlowScreen.tsx',
  'screens/ProjectsScreen.tsx',
  'screens/WriterEditorScreen.tsx',
  'screens/HelpScreen.tsx',
  'i18n/textos/es/nav.ts', 'i18n/textos/en/nav.ts',
  'i18n/textos/es/menu.ts', 'i18n/textos/en/menu.ts',
  'i18n/textos/es/weeai.ts', 'i18n/textos/en/weeai.ts',
  'i18n/textos/es/credits.ts', 'i18n/textos/en/credits.ts',
  'constants/weeMenu.ts',
  'constants/weeExperiences.ts',
];

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · Ninguna superficie visible dice ya "WEË AI" ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Se lee el código SIN COMENTARIOS: lo que no se pinta no es una superficie.
   * Los comentarios que hablan del "WEË AI ENGINE" son otra cosa y se quedan.
   */
  const sucias = SUPERFICIES.filter((p) => /WEË AI/.test(soloCodigo(leer(p))));
  check('1) ninguna de las 24 superficies escribe "WEË AI"', sucias.length === 0, sucias.join(' '));

  /* Ni ninguna de las grafías que se descartaron. */
  const raras = SUPERFICIES.filter((p) => /WeëAI|WEËAI|WEË Ai|Weë Ai\b|\bWEE AI\b/.test(soloCodigo(leer(p))));
  check('1) ni "WeëAI", "WEE AI" ni ninguna otra variante', raras.length === 0, raras.join(' '));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Y las que lo nombran lo escriben "Weë AI" ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const pares = [
    ['2) la miga de pan del marco', 'components/creator/CreatorShell.tsx', /breadcrumb = 'Weë AI'/],
    ['2) el rótulo y la miga de Weë AI', 'screens/WeeCreatorScreen.tsx', /overline="🤖 Weë AI"[\s\S]{0,80}breadcrumb="Weë AI"/],
    ['2) el rótulo y la miga de un especialista', 'screens/SpecialistScreen.tsx', /overline=\{lanzador \? undefined : '🤖 Weë AI'\}/],
    ['2) el rótulo de Weë Brain', 'screens/BrainChatScreen.tsx', /overline="🤖 Weë AI"/],
    ['2) el de Weë Business', 'screens/BusinessScreen.tsx', /overline="🤖 Weë AI"/],
    ['2) el del flujo guiado', 'screens/CreatorFlowScreen.tsx', /overline="🤖 Weë AI"/],
    ['2) el de Mis proyectos', 'screens/ProjectsScreen.tsx', /overline="🤖 Weë AI"/],
    ['2) el del editor', 'screens/WriterEditorScreen.tsx', /overline="🤖 Weë AI"/],
    ['3) el atajo de la hoja Crear', 'components/CreateSheet.tsx', />Weë AI ›</],
    ['3) la barra lateral de las pantallas de IA', 'components/creator/CreatorSidebar.tsx', /'grid-outline', 'Weë AI', goCreator/],
    /* La Ayuda pasó al diccionario en la fase 6: la marca se mira donde vive. */
    ['4) la Ayuda', 'i18n/textos/es/help.ts', /¿Cómo funciona Weë AI\?/],
    /* Lo que se guarda al publicar pasó al diccionario al entrar el japonés: la marca se mira donde vive. */
    ['4) y lo que se guarda al publicar', 'i18n/textos/es/composer.ts', /aiProcessCreatedWith: 'Creado con \{\{nombre\}\} en Weë AI'/],
  ];
  for (const [nombre, archivo, patron] of pares) {
    check(`${nombre} dice "Weë AI"`, patron.test(leer(archivo)), archivo);
  }

  /* La etiqueta para quien no ve: la del menú de escritorio y la de la tarjeta. */
  check('3) los accessibility labels dicen "Weë AI"',
    /accessibilityLabel=\{t\('nav\.openWeeAi'\)\}/.test(leer('components/RightSidebar.tsx'))
    && ES('nav.openWeeAi') === 'Abrir Weë AI' && EN('nav.openWeeAi') === 'Open Weë AI',
    ES('nav.openWeeAi') + ' / ' + EN('nav.openWeeAi'));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · El nombre no se traduce; la frase sí ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /* Todas las claves de los diccionarios que nombran el área. */
  const CLAVES = ['nav.openWeeAi', 'nav.goToWeeAi', 'menu.creator',
    'weeai.errNoAccount', 'weeai.errOffline', 'credits.testPrices', 'credits.terms'];

  const sinMarcaEs = CLAVES.filter((k) => !/Weë AI/.test(ES(k)));
  check('4) las siete claves dicen "Weë AI" en español', sinMarcaEs.length === 0, sinMarcaEs.join(' '));
  const sinMarcaEn = CLAVES.filter((k) => !/Weë AI/.test(EN(k)));
  check('5) y también en inglés', sinMarcaEn.length === 0, sinMarcaEn.join(' '));

  const enVersales = CLAVES.filter((k) => /WEË AI/.test(ES(k)) || /WEË AI/.test(EN(k)));
  check('5) y ninguna se quedó en versales', enVersales.length === 0, enVersales.join(' '));

  /* La marca aguanta igual; lo que la rodea cambia de idioma. */
  check('5) el nombre viaja intacto y la frase no',
    ES('nav.openWeeAi') !== EN('nav.openWeeAi')
    && ES('nav.openWeeAi').replace('Abrir ', '') === EN('nav.openWeeAi').replace('Open ', ''),
    ES('nav.openWeeAi') + ' / ' + EN('nav.openWeeAi'));
  check('5) el del menú es el mismo en los dos, porque es solo el nombre',
    ES('menu.creator') === 'Weë AI' && EN('menu.creator') === 'Weë AI');

  /* Sin claves nuevas: esta fase cambió valores, no el diccionario. */
  check('6) no se inventaron claves nuevas para la marca',
    !/weeAiName|brandWeeAi|weeAiBrand/.test(leer('i18n/textos/es/nav.ts') + leer('i18n/textos/es/menu.ts')
      + leer('i18n/textos/es/weeai.ts') + leer('i18n/textos/es/credits.ts')));
  check('6) ni un segundo "Weë AI" suelto en otro módulo',
    ['nav', 'menu'].filter((m) => /: 'Weë AI',/.test(leer(`i18n/textos/es/${m}.ts`))).join(' ') === 'menu');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · Los identificadores, donde estaban ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const pila = leer('navigation/MainStackNavigator.tsx');
  const menu = leer('constants/weeMenu.ts');

  check('7) el id del menú sigue siendo `creator`',
    /creator: \{ id: 'creator',[^}]*clave: 'menu\.creator'[^}]*label: 'Weë AI' \}/.test(menu));
  check('7) y no se coló ningún id con la marca dentro',
    !/id: 'weeAi'|id: 'wee-ai'|id: 'WeëAI'/i.test(menu + leer('constants/weeExperiences.ts')));

  check('8) la ruta sigue llamándose WeeCreator',
    (pila.match(/name="WeeCreator"/g) || []).length === 1
    && !/name="WeeAi"|name="WeeAI"/i.test(pila));
  check('8) y el componente y su archivo tampoco cambiaron de nombre',
    /import WeeCreatorScreen from '\.\.\/screens\/WeeCreatorScreen'/.test(pila)
    && leer('screens/WeeCreatorScreen.tsx').length > 0);

  check('9) la navegación hacia el área es la de siempre',
    /navigation\.navigate\('WeeCreator'\)/.test(leer('components/RightSidebar.tsx'))
    && /navigation\.navigate\('WeeCreator'\)/.test(leer('components/Sidebar.tsx')));

  /* Lo que la fase NO tocó: las experiencias, sus ids y sus nombres. */
  const experiencias = leer('constants/weeExperiences.ts');
  check('10) las once experiencias siguen siendo once y con sus nombres',
    (experiencias.match(/^ {4}id: '/gm) || []).length === 11
    && /name: 'Weë Design'/.test(experiencias) && /name: 'Weë Brain'/.test(experiencias));
  check('10) y ninguna se llama como el área', !/name: 'Weë AI'|name: 'WEË AI'/.test(experiencias));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · Lo que se queda en versales, y por qué ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * EL MOTOR SE LLAMA "WEË AI ENGINE" y no es el área: es la capa que ejecuta
   * cada paso (docs/AI-ENGINE.md). Vive en el servidor y en los comentarios que
   * lo explican, y esta fase no lo toca.
   */
  check('11) el motor conserva su nombre en los comentarios',
    /WEË AI ENGINE/.test(leer('screens/BrainChatScreen.tsx'))
    && /WEË AI ENGINE/.test(leer('services/aiEngineService.ts')));

  /*
   * EL SERVIDOR TAMBIÉN, de momento. El apunte del historial de Credits se lee
   * en la cartera, así que es texto visible: queda anotado como pendiente y
   * esta comprobación lo fija para que el día que se cambie se entere alguien.
   */
  check('12) el servidor todavía escribe versales (pendiente, otra fase)',
    /const description = `WEË AI · /.test(leer('functions/src/creator/index.ts')));
  check('12) y el prompt interno del asistente, que no es interfaz',
    /el asistente de WEË AI/.test(leer('functions/src/creator/prompts.ts')));

  /* CONTROL: esta fase no tocó nada de lo que ya estaba cerrado. */
  check('13) control: ni encuestas, ni tiempo relativo, ni el Composer',
    !/pollView|textoVotos|getRelativeTime/.test(soloCodigo(leer('components/creator/CreatorShell.tsx'))));
}

console.log('\n' + (failures ? `✘ ${failures} fallo(s)` : '✔ todo bien'));
process.exit(failures ? 1 : 0);
