/**
 * WEË Y WEË CREATOR — DOS EXPERIENCIAS DE INTERFAZ, Y LA VERDAD SOBRE LO QUE HAY.
 *
 * Decisión del usuario (2026-09-27, «WEE Studio — experiencia UX/UI definitiva»,
 * con dos referencias y dos aclaraciones): Weë —la App, igual en web y en el
 * teléfono— tiene cuatro áreas, Crear · Inspira · Proyectos · Perfil; Weë Creator
 * es el taller profesional, oscuro, con su propia navegación, sin muros ni Weëls,
 * y con una salida clara a Weë. Las dos no mezclan su navegación.
 *
 *   A · Dos experiencias, dos navegaciones.
 *   B · Crear video dice la verdad: lo que no se puede elegir se ve apagado y dice por qué.
 *   C · Filmmaker, honesto: la exportación, la resolución, la producción vacía, y solo operaciones de F1-A.
 *   D · Sin modelos ni proveedores a la vista, y sin cuentas de Credits en el cliente.
 *   E · Los textos nuevos, en los once idiomas, con la marca intacta.
 */
import fs from 'node:fs';
import path from 'node:path';
import { leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const codigo = (p) => sinComentarios(leer(p));

/* ═══ A · DOS EXPERIENCIAS, DOS NAVEGACIONES ═══════════════════════════════ */
console.log('\n── A · Dos experiencias, dos navegaciones ──');
const barra = codigo('components/BarraInferior.tsx');
const global = codigo('navigation/NavegacionGlobal.tsx');
const pila = codigo('navigation/MainStackNavigator.tsx');
const creator = codigo('navigation/CreatorNavigator.tsx');
const marco = codigo('components/workspace/ChromeDeCreator.tsx');
const shell = codigo('components/creator/CreatorShell.tsx');

check('A1) la barra de Weë son las cuatro áreas, en su orden', /export type DestinoId = 'Crear' \| 'Home' \| 'Proyectos' \| 'Profile';/.test(barra));
check('A2) Weë Creator es una pila propia, registrada una sola vez en la principal',
  (pila.match(/<Stack\.Screen name="Creator" component=\{CreatorNavigator\} \/>/g) || []).length === 1);
check('A3) y la barra de Weë no se pinta dentro', /SIN_BARRA = new Set\(\[[^\]]*'Creator',[^\]]*\]\)/.test(global));
check('A4) con su tema y su marco alrededor de su pila', /<TemaCreator>\s*<ChromeDeCreator>\s*<PilaDeCreator \/>\s*<\/ChromeDeCreator>\s*<\/TemaCreator>/.test(creator));
const registradas = [...creator.matchAll(/<Pila\.Screen name="(\w+)"/g)].map((m) => m[1]);
const SOCIAL = ['Home', 'Landing', 'Reels', 'Inbox', 'Conversation', 'Community', 'Communities', 'ExploreCommunities', 'Search', 'Notifications', 'Profile', 'Create', 'Main'];
check('A5) el taller no registra nada de lo social: ni muro, ni Weëls, ni WeeTalk, ni comunidades, ni perfil',
  registradas.length > 0 && !registradas.some((r) => SOCIAL.includes(r)), registradas.join(' · '));
/* Con el MISMO nombre: así, lo que ya navegaba a esas pantallas se queda dentro del taller. */
check('A6) las pantallas de Weë AI se registran con el mismo nombre que en la pila principal',
  ['Specialist', 'CreatorFlow', 'Production', 'Project', 'Projects', 'MisCreaciones'].every((r) => registradas.includes(r) && new RegExp(`name="${r}"`).test(pila)));
check('A7) siempre hay vuelta a Weë: arriba y al pie de la barra lateral',
  /t\('workspace\.backToWee'\)/.test(codigo('components/workspace/CabeceraDeCreator.tsx'))
  && /t\('workspace\.backToWee'\)/.test(codigo('components/workspace/BarraLateralDeCreator.tsx'))
  && /const volverAWee = useCallback\(\(\) => \{\s*setMenu\(false\);\s*navigation\.navigate\('Main'\);/.test(marco));
check('A8) dentro del taller, el marco de Weë AI no pinta su barra lateral ni un segundo saldo',
  /\{!enCreator && <CreatorSidebar /.test(shell) && /\{!enCreator && <CreditsPill compact \/>\}/.test(shell));
check('A9) Filmmaker vive en Weë Creator: quien llega por fuera entra al taller',
  /if \(!enCreator && typeof navigation\.replace === 'function'\) navigation\.replace\('Creator', \{ screen: 'Production', params: route\.params \}\);/.test(codigo('screens/ProductionScreen.tsx')));
check('A10) y sus direcciones web cuelgan de /creator', /Creator: \{\s*path: 'creator',/.test(leer('App.tsx')) && /path: 'filmmaker\/:productionId\?'/.test(leer('App.tsx')));
check('A11) «Crear profesionalmente» lleva de Crear video a Filmmaker, en el taller',
  /aCreator\('Production'/.test(codigo('screens/CrearVideoScreen.tsx')) && /aCreator\('Production'\)/.test(codigo('screens/CrearScreen.tsx')));

/* ═══ B · CREAR VIDEO DICE LA VERDAD ═══════════════════════════════════════ */
console.log('\n── B · Crear video dice la verdad ──');
const video = codigo('screens/CrearVideoScreen.tsx');
const calidades = [...video.matchAll(/\{ id: '(standard|high|max|4k)',[^}]*disponible: (true|false)(?:, porque: t\('([\w.]+)'\))?/g)]
  .map((m) => ({ id: m[1], disponible: m[2] === 'true', porque: m[3] }));
check('B1) de las cuatro calidades, solo Estándar se puede elegir',
  calidades.length === 4 && calidades.filter((c) => c.disponible).map((c) => c.id).join() === 'standard', JSON.stringify(calidades));
check('B2) y las otras tres dicen por qué no', calidades.filter((c) => !c.disponible).every((c) => !!c.porque));
const bloqueGenerar = video.slice(video.indexOf('const contexto: ContextoDeExperiencia = {'), video.indexOf("navigation.navigate('CreatorFlow', contexto);"));
check('B3) y la calidad no viaja a escondidas: lo que se manda a crear no la lleva',
  bloqueGenerar.length > 0 && !/calidad|quality|model/i.test(bloqueGenerar));
check('B4) generar es ir al camino común, con la experiencia de vídeo', /experienceId: 'studio',/.test(bloqueGenerar) && /navigation\.navigate\('CreatorFlow', contexto\);/.test(video));
check('B5) la duración es la que decide la plantilla: 10 s, o 5 animando una foto', /const duracion: Duracion = foto \? '5' : '10';/.test(video)
  && /\{ id: '8', etiqueta: t\('crear\.seconds', \{ segundos: 8 \}\), disponible: false, porque: t\('crear\.durationFixedWhy'\) \}/.test(video)
  && /\{ id: '15', etiqueta: t\('crear\.seconds', \{ segundos: 15 \}\), disponible: false, porque: t\('crear\.durationFixedWhy'\) \}/.test(video));
check('B6) el 4:5 se ve apagado, con su porqué', /\{ id: '4:5',[^}]*disponible: false, porque: t\('crear\.format45Why'\) \}/.test(video));
check('B7) esta pantalla ni genera ni cobra', !/creatorService|brainService|httpsCallable|spendCredits|refundCredits/.test(video));
check('B8) y dice antes que el precio en Credits se ve antes de confirmar', /t\('crear\.priceNote'\)/.test(video));

/* ═══ C · FILMMAKER, HONESTO ═══════════════════════════════════════════════ */
console.log('\n── C · Filmmaker, honesto ──');
const exportar = codigo('components/studio/produccion/ProductionExportPanel.tsx');
check('C1) la exportación dice que el montaje final todavía no existe', /t\('filmmaker\.wsExportFinalSoon'\)/.test(exportar));
check('C2) y lo que se pide se guarda como una operación de F1-A', /op: 'change_export'/.test(exportar));
check('C3) GIF, Secuencia y Proyecto se ven apagados, con su porqué',
  (exportar.match(/disponible: false, porque: t\('filmmaker\.wsExportSoon'\)/g) || []).length === 3);
check('C4) la resolución de la exportación nunca queda en blanco: «Automática» se dice',
  /resolucion \? resolucionVisible\(resolucion\) : t\('filmmaker\.wsResolutionAuto'\)/.test(exportar));
const visor = codigo('components/studio/produccion/ProductionViewer.tsx');
check('C5) una producción vacía se empieza desde el visor, con el gesto del storyboard',
  /!produccion\.scenes\.length \?/.test(visor) && /op: 'add_scene'/.test(visor) && /t\('filmmaker\.addFirstScene'\)/.test(visor));
/* Cada gesto del taller es una operación que ya existe en F1-A: ni una inventada. */
const OPERACIONES = new Set([...leer('functions/src/filmmaker/operaciones.ts').matchAll(/case '([a-z_]+)'/g)].map((m) => m[1]));
const carpeta = 'components/studio/produccion';
const NUEVAS = ['ProductionWorkspace.tsx', 'ProductionMobileEditor.tsx', 'ProductionViewer.tsx', 'ProductionDirectorTabs.tsx', 'ProductionTools.tsx',
  'ProductionTimeline.tsx', 'ProductionShotProperties.tsx', 'ProductionExportPanel.tsx', 'ProductionProjectPanel.tsx', 'ProductionStructureSheet.tsx'];
const usadas = NUEVAS.flatMap((f) => [...codigo(`${carpeta}/${f}`).matchAll(/\bop: '([a-z_]+)'/g)].map((m) => m[1]));
const ajenas = [...new Set(usadas.filter((o) => !OPERACIONES.has(o)))];
check('C6) el workspace solo usa operaciones de F1-A', OPERACIONES.size > 20 && usadas.length > 10 && ajenas.length === 0,
  ajenas.length ? ajenas.join(' · ') : `${new Set(usadas).size} operaciones distintas`);
check('C7) y ninguna pieza del workspace llama por su cuenta al servidor ni a una IA',
  NUEVAS.every((f) => !/httpsCallable|creatorService|brainService|fetch\(/.test(codigo(`${carpeta}/${f}`))));

/* ═══ D · SIN MODELOS NI PROVEEDORES, SIN CUENTAS DE CREDITS ═══════════════ */
console.log('\n── D · Sin modelos ni proveedores a la vista, y sin cuentas de Credits en el cliente ──');
const IDIOMAS = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const MODULOS = ['crear', 'inspira', 'workspace', 'cuenta'];
/* Con mayúscula y palabra entera: «klingt» o «nessuno» son alemán e italiano, no proveedores. */
const PROVEEDORES = /\b(Seedance|ModelArk|BytePlus|Gemini|ElevenLabs|DeepSeek|Kling|Runway|Veo|Nano Banana|OpenAI|Suno)\b/;
const conProveedor = IDIOMAS.flatMap((l) => MODULOS.filter((m) => PROVEEDORES.test(leer(`i18n/textos/${l}/${m}.ts`))).map((m) => `${l}/${m}`));
const lineasWs = (l) => leer(`i18n/textos/${l}/filmmaker.ts`).split('\n').filter((x) => /^ {2}ws\w+: '/.test(x)).join('\n');
const wsConProveedor = IDIOMAS.filter((l) => PROVEEDORES.test(lineasWs(l)));
check('D1) ningún texto nuevo nombra un proveedor ni un modelo de IA, en ningún idioma',
  IDIOMAS.length === 11 && conProveedor.length === 0 && wsConProveedor.length === 0, [...conProveedor, ...wsConProveedor].join(' · '));
check('D2) ni habla de «modelos»: la persona elige el resultado, no la máquina',
  !/model/i.test(MODULOS.map((m) => leer(`i18n/textos/es/${m}.ts`) + leer(`i18n/textos/en/${m}.ts`)).join('\n').replace(/^\s*\*.*$/gm, '')));
const CLIENTE_NUEVO = [
  ...['components/workspace', 'components/crear', 'components/inspira', 'components/proyectos'].flatMap((d) =>
    fs.readdirSync(path.resolve(RAIZ, d)).filter((f) => /\.tsx?$/.test(f)).map((f) => `${d}/${f}`)),
  ...NUEVAS.map((f) => `${carpeta}/${f}`),
  'screens/CrearScreen.tsx', 'screens/CrearVideoScreen.tsx', 'screens/InspiraScreen.tsx', 'screens/ProyectosScreen.tsx', 'screens/CreatorInicioScreen.tsx',
  'components/PanelDeCuenta.tsx', 'components/AccesosDeLaApp.tsx', 'components/PestanaDeLaApp.tsx',
  'hooks/useCaminosDeCreacion.ts', 'hooks/useBusquedaDeCreator.ts', 'hooks/useProyectosDeWeeAi.ts', 'navigation/CreatorNavigator.tsx',
];
const tocanCredits = CLIENTE_NUEVO.filter((f) => /spendCredits|refundCredits|completeCredits|creditsBalance|increment\(/.test(codigo(f)));
check('D3) el cliente nuevo nunca suma, resta ni escribe Credits', CLIENTE_NUEVO.length > 30 && tocanCredits.length === 0, tocanCredits.join(' · ') || `${CLIENTE_NUEVO.length} archivos`);
check('D4) el saldo del taller es la píldora de siempre, la de la cuenta', /<CreditsPill compact=\{movil\} \/>/.test(codigo('components/workspace/CabeceraDeCreator.tsx')));

/* ═══ E · LOS TEXTOS NUEVOS, EN LOS ONCE IDIOMAS ═══════════════════════════ */
console.log('\n── E · Los textos nuevos, en los once idiomas ──');
const sinModulo = IDIOMAS.flatMap((l) => MODULOS.filter((m) => !fs.existsSync(path.resolve(RAIZ, `i18n/textos/${l}/${m}.ts`))
  || !new RegExp(`from '\\./${m}'`).test(leer(`i18n/textos/${l}/index.ts`))).map((m) => `${l}/${m}`));
check('E1) crear, inspira, workspace y cuenta existen y se registran en los once', sinModulo.length === 0, sinModulo.join(' · '));
check('E2) «Weë Creator» es marca: se escribe igual en todos', IDIOMAS.every((l) => /^ {2}name: 'Weë Creator',$/m.test(leer(`i18n/textos/${l}/workspace.ts`))));
check('E3) y los destinos de la barra salen de sus claves, en los once', IDIOMAS.every((l) => ['inspire', 'projects', 'profile'].every((k) => new RegExp(`^ {2}${k}: '`, 'm').test(leer(`i18n/textos/${l}/nav.ts`)))));
check('E4) esta suite está en la cadena de `npm test`', /studio-creator-ux\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ Weë y Weë Creator: dos experiencias sin mezclar, y la verdad sobre lo que hay (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
