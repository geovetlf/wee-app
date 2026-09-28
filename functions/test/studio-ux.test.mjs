/**
 * WEË APP, COMO ANTES; WEË STUDIO, CON SU WORKSPACE.
 *
 * Corrección del usuario del 2026-09-28 (tres mensajes): no existe un producto
 * «Weë Creator». Weë es Weë App —el Home con su muro y sus Weëls, la
 * navegación de siempre— y Weë AI con sus módulos (Brain, Studio, Design, Chef,
 * Music, Travel). El trabajo de UX es SOLO de Weë Studio: en la web, un
 * workspace profesional; en el teléfono, sus cuatro pestañas (Crear, Inspira,
 * Proyectos, Perfil). El Home vuelve a ser exactamente el anterior.
 *
 *   A · Weë App, igual que antes de la primera modificación (21a752c)
 *   B · Weë Studio, su workspace: solo lo suyo
 *   C · Ningún «Creator» a la vista
 *   D · Crear vídeo dice la verdad
 *   E · Filmmaker, honesto
 *   F · Sin proveedores ni modelos a la vista, y sin cuentas de Credits en el cliente
 *   G · Los textos, en los once idiomas
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const codigo = (p) => sinComentarios(leer(p));
const git = (c) => execSync(`git ${c}`, { cwd: RAIZ, encoding: 'utf8' });
const existe = (p) => fs.existsSync(path.resolve(RAIZ, p));

/* ═══ A · WEË APP, COMO ANTES ══════════════════════════════════════════════ */
console.log('\n── A · Weë App, igual que antes de la primera modificación ──');
/* La base es la de antes del primer encargo de UX (21a752c): el Home, el muro, los Weëls y la navegación de entonces. */
const ANTES = '21a752c';
const DE_LA_APP = [
  'components/BarraInferior.tsx', 'navigation/TabNavigator.tsx', 'navigation/HomeStackNavigator.tsx', 'screens/WebLandingScreen.tsx',
  'screens/LandingScreen.tsx', 'screens/ProfileScreen.tsx', 'components/Sidebar.tsx', 'components/CreateSheet.tsx', 'components/Header.tsx',
  'components/DrawerMenu.tsx', 'components/WeelsRow.tsx', 'components/HomeGreeting.tsx', 'components/RightSidebar.tsx',
];
const cambiados = git(`diff --name-only ${ANTES} -- ${DE_LA_APP.join(' ')}`).trim();
check('A1) el Home, el muro, los Weëls, el perfil, la barra, el menú y la barra lateral son los de antes, byte a byte',
  cambiados === '', cambiados.replace(/\n/g, ' · '));
const barra = codigo('components/BarraInferior.tsx');
check('A2) la barra de Weë sigue con sus cinco destinos de siempre', /'Home' \| 'Search' \| 'Create' \| 'Inbox' \| 'Notifications'/.test(barra));
const pestanas = codigo('navigation/TabNavigator.tsx');
check('A3) y las pestañas de siempre: ni «Crear» ni «Proyectos» como pestaña de la App',
  ['Home', 'Search', 'Create', 'Inbox', 'Profile'].every((r) => new RegExp(`<Tab\\.Screen\\s+name="${r}"`).test(pestanas))
  && !/name="Crear"|name="Proyectos"/.test(pestanas));
check('A4) el Home monta su fila de Weëls y su muro, en la web y en el teléfono',
  /<WeelsRow /.test(codigo('screens/WebLandingScreen.tsx')) && /filteredPosts/.test(codigo('screens/WebLandingScreen.tsx'))
  && /WeelsRow/.test(codigo('screens/LandingScreen.tsx')));
const SUELTAS = ['components/AccesosDeLaApp.tsx', 'components/PestanaDeLaApp.tsx', 'components/inspira/BarraDeInspira.tsx', 'screens/CrearScreen.tsx',
  'screens/CreatorInicioScreen.tsx', 'components/crear/CajaDeCrear.tsx', 'components/proyectos/ProyectosRecientes.tsx'];
check('A5) lo que se había puesto en la App para mezclarla con el taller ya no existe', SUELTAS.every((f) => !existe(f)), SUELTAS.filter(existe).join(' · '));
const global = codigo('navigation/NavegacionGlobal.tsx');
/* Frente a la de antes, una sola línea de código —'Studio' en SIN_BARRA— y su comentario. */
const distinto = git(`diff ${ANTES} -- navigation/NavegacionGlobal.tsx`).split('\n').filter((l) => /^[-+]/.test(l) && !/^(\+\+\+|---)/.test(l));
check('A6) la navegación global solo sabe una cosa del Studio: que su barra no entra en él',
  /SIN_BARRA = new Set\(\[[^\]]*'Studio',[^\]]*\]\)/.test(global) && !/EN_LA_BARRA|'Crear'|'Proyectos'|'Creator'/.test(global)
  && distinto.filter((l) => !/^[-+]\s*(\/\*|\*)/.test(l)).join('|') === "+  'Studio',", distinto.join(' | '));
check('A7) las pantallas de Weë App no importan nada del workspace del Studio',
  DE_LA_APP.every((f) => !/components\/workspace|StudioNavigator|PanelDeCuenta|PestanasDeStudio/.test(codigo(f))));

/* ═══ B · WEË STUDIO, SU WORKSPACE ═════════════════════════════════════════ */
console.log('\n── B · Weë Studio, su workspace: solo lo suyo ──');
const pila = codigo('navigation/MainStackNavigator.tsx');
check('B1) Weë Studio es una sola ruta, `Studio`, con su pila dentro; «Creator» no es una ruta',
  (pila.match(/<Stack\.Screen name="Studio" component=\{StudioNavigator\} \/>/g) || []).length === 1
  && !/name="Creator"|name="CrearVideo"/.test(pila));
const studio = codigo('navigation/StudioNavigator.tsx');
check('B2) con su tema y su marco, y su inicio es la pantalla Weë Studio de siempre',
  /<TemaStudio>\s*<MarcoDeStudio>\s*<PilaDeStudio \/>\s*<\/MarcoDeStudio>\s*<\/TemaStudio>/.test(studio)
  && /<Pila\.Screen name="StudioInicio" component=\{StudioScreen\} \/>/.test(studio) && /initialRouteName="StudioInicio"/.test(studio));
const registradas = [...studio.matchAll(/<Pila\.Screen name="(\w+)"/g)].map((m) => m[1]);
const DEL_STUDIO = ['StudioInicio', 'StudioInspira', 'StudioProyectos', 'StudioPerfil', 'StudioVideo', 'Production', 'CreatorFlow', 'Project', 'Projects', 'MisCreaciones'];
check('B3) el workspace registra solo lo del Studio: ni muro, ni Weëls, ni comunidad, ni otros módulos de Weë AI',
  JSON.stringify(registradas) === JSON.stringify(DEL_STUDIO), registradas.join(' · '));
const W = leer('constants/studioWorkspace.ts');
const ids = (nombre) => {
  const bloque = W.slice(W.indexOf(`export const ${nombre}`), W.indexOf(']);', W.indexOf(`export const ${nombre}`)));
  return [...bloque.matchAll(/\{ id: '([a-z]+)'/g)].map((m) => m[1]);
};
check('B4) su barra lateral: Inicio, Inspira, Proyectos y Creaciones; y sus herramientas: Filmmaker, Vídeo y sus puertas',
  ids('SECCIONES_DEL_STUDIO').join() === 'inicio,inspira,proyectos,creaciones' && ids('HERRAMIENTAS_DEL_STUDIO').join() === 'filmmaker,video,imagenes,texto,voz'
  && !/experienceId: '/.test(W.slice(W.indexOf('export const HERRAMIENTAS_DEL_STUDIO'))), `${ids('SECCIONES_DEL_STUDIO')} | ${ids('HERRAMIENTAS_DEL_STUDIO')}`);
check('B5) en el teléfono, sus cuatro pestañas, en su orden: Crear, Inspira, Proyectos y Perfil',
  ids('PESTANAS_DE_STUDIO').join() === 'crear,inspira,proyectos,perfil'
  && /\{!escritorio && <PestanasDeStudio /.test(codigo('components/workspace/MarcoDeStudio.tsx')));
const inicio = codigo('screens/StudioScreen.tsx');
check('B6) «Weë Studio» desde Weë App abre su workspace, como Filmmaker',
  /navigation\.replace\('Studio'\)/.test(inicio) && /export default StudioEnSuWorkspace;/.test(inicio)
  && /navigation\.replace\('Studio', \{ screen: 'Production', params: route\.params \}\)/.test(codigo('screens/ProductionScreen.tsx')));
const app = leer('App.tsx');
check('B7) su dirección es la de siempre, /studio, y Filmmaker sigue en studio/produccion',
  /Studio: \{\s*path: 'studio',/.test(app) && /path: 'produccion\/:productionId\?'/.test(app));
check('B8) la pestaña del navegador dice «Weë Studio», nunca el nombre interno de una ruta', /title: t\('workspace\.name'\)/.test(studio));
check('B9) la barra lateral y las pestañas abren las puertas de siempre del Studio por su id',
  /params: \{ puerta: 'images' \}/.test(W) && /params: \{ puerta: 'text' \}/.test(W) && /params: \{ puerta: 'voice' \}/.test(W)
  && /route\.params\?\.puerta/.test(inicio) && /entradaPorId\(puertaPedida\)/.test(inicio));
/*
 * Dentro del workspace, la salida, la W, el nombre y el saldo los pinta UNA vez su cabecera: la de sección no los
 * repite (se veía «← W Weë Studio» dos veces, y la W como un cuadro blanco sobre el fondo oscuro). Fuera, igual.
 */
const deSeccion = codigo('components/creator/CabeceraDeSeccion.tsx');
check('B10) dentro de Weë Studio la cabecera de sección no repite la identidad; fuera, la de siempre',
  /const enStudio = useEnStudio\(\);/.test(deSeccion) && /\{!enStudio && filaDeIdentidad\}/.test(deSeccion)
  && (deSeccion.match(/filaDeIdentidad\}/g) || []).length === 1);
/*
 * Un solo «Exportar» a la vista: el de la cabecera, solo con el workspace de escritorio de Filmmaker; en tableta y
 * teléfono, el del editor, junto al título (en la tableta la cabecera también lo enseñaba: salían dos).
 */
check('B11) Filmmaker enseña un solo «Exportar»: en escritorio el de la cabecera; en tableta y teléfono el del editor',
  /vista && isDesktop \? \{ etiqueta: t\('filmmaker\.wsExport'\)/.test(codigo('screens/ProductionScreen.tsx'))
  && /onPress=\{espacio\.onExportar\}/.test(codigo('components/studio/produccion/ProductionMobileEditor.tsx'))
  && /\{!!accion && !movil && \(/.test(codigo('components/workspace/CabeceraDeStudio.tsx')));

/* ═══ C · NINGÚN «CREATOR» A LA VISTA ══════════════════════════════════════ */
console.log('\n── C · Ningún «Creator» a la vista ──');
const IDIOMAS = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
/* Lo que se LEE: el valor. El nombre de una clave es código, no interfaz. */
const valor = (x) => (/^ {2}[A-Za-z0-9_]+: '(.*)',\s*$/.exec(x) || [])[1];
const valoresCon = (re) => IDIOMAS.flatMap((l) => fs.readdirSync(path.resolve(RAIZ, `i18n/textos/${l}`)).filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .flatMap((f) => leer(`i18n/textos/${l}/${f}`).split('\n').filter((x) => valor(x) !== undefined && re.test(valor(x))).map((x) => `${l}/${f}: ${x.trim().slice(0, 40)}`)));
const conCreator = valoresCon(/Creator|CREATOR/);
check('C1) ningún texto de la interfaz, en ningún idioma, dice «Creator»', IDIOMAS.length === 11 && conCreator.length === 0, conCreator.slice(0, 3).join(' · '));
check('C2) el workspace se llama Weë Studio y la palabra del logo es STUDIO, en los once',
  IDIOMAS.every((l) => /^ {2}name: 'Weë Studio',$/m.test(leer(`i18n/textos/${l}/workspace.ts`)) && /^ {2}wordmark: 'STUDIO',$/m.test(leer(`i18n/textos/${l}/workspace.ts`))));
check('C3) ninguna dirección web dice creator', !/'creator'|creator\//.test(app));
check('C4) ni ninguna ruta del workspace, salvo el flujo de creación de siempre (`CreatorFlow`)',
  registradas.filter((r) => /Creator/.test(r)).join() === 'CreatorFlow');

/* ═══ D · CREAR VÍDEO DICE LA VERDAD ═══════════════════════════════════════ */
console.log('\n── D · Crear vídeo dice la verdad ──');
const video = codigo('screens/CrearVideoScreen.tsx');
const calidades = [...video.matchAll(/\{ id: '(standard|high|max|4k)',[^}]*disponible: (true|false)(?:, porque: t\('([\w.]+)'\))?/g)]
  .map((m) => ({ id: m[1], disponible: m[2] === 'true', porque: m[3] }));
check('D1) de las cuatro calidades, solo Estándar se puede elegir',
  calidades.length === 4 && calidades.filter((c) => c.disponible).map((c) => c.id).join() === 'standard', JSON.stringify(calidades));
check('D2) y las otras tres dicen por qué no', calidades.filter((c) => !c.disponible).every((c) => !!c.porque));
const bloqueGenerar = video.slice(video.indexOf('const contexto: ContextoDeExperiencia = {'), video.indexOf("navigation.navigate('CreatorFlow', contexto);"));
check('D3) y la calidad no viaja a escondidas: lo que se manda a crear no la lleva',
  bloqueGenerar.length > 0 && !/calidad|quality|model/i.test(bloqueGenerar));
check('D4) generar es ir al camino común, con la experiencia de vídeo', /experienceId: 'studio',/.test(bloqueGenerar) && /navigation\.navigate\('CreatorFlow', contexto\);/.test(video));
check('D5) la duración es la que decide la plantilla: 10 s, o 5 animando una foto', /const duracion: Duracion = foto \? '5' : '10';/.test(video)
  && /\{ id: '8', etiqueta: t\('crear\.seconds', \{ segundos: 8 \}\), disponible: false, porque: t\('crear\.durationFixedWhy'\) \}/.test(video)
  && /\{ id: '15', etiqueta: t\('crear\.seconds', \{ segundos: 15 \}\), disponible: false, porque: t\('crear\.durationFixedWhy'\) \}/.test(video));
check('D6) el 4:5 se ve apagado, con su porqué', /\{ id: '4:5',[^}]*disponible: false, porque: t\('crear\.format45Why'\) \}/.test(video));
check('D7) esta pantalla ni genera ni cobra', !/creatorService|brainService|httpsCallable|spendCredits|refundCredits/.test(video));
check('D8) y dice antes que el precio en Credits se ve antes de confirmar', /t\('crear\.priceNote'\)/.test(video));

/* ═══ E · FILMMAKER, HONESTO ═══════════════════════════════════════════════ */
console.log('\n── E · Filmmaker, honesto ──');
const exportar = codigo('components/studio/produccion/ProductionExportPanel.tsx');
check('E1) la exportación dice que el montaje final todavía no existe', /t\('filmmaker\.wsExportFinalSoon'\)/.test(exportar));
check('E2) y lo que se pide se guarda como una operación de F1-A', /op: 'change_export'/.test(exportar));
check('E3) GIF, Secuencia y Proyecto se ven apagados, con su porqué',
  (exportar.match(/disponible: false, porque: t\('filmmaker\.wsExportSoon'\)/g) || []).length === 3);
check('E4) la resolución de la exportación nunca queda en blanco: «Automática» se dice',
  /resolucion \? resolucionVisible\(resolucion\) : t\('filmmaker\.wsResolutionAuto'\)/.test(exportar));
const visor = codigo('components/studio/produccion/ProductionViewer.tsx');
check('E5) una producción vacía se empieza desde el visor, con el gesto del storyboard',
  /!produccion\.scenes\.length \?/.test(visor) && /op: 'add_scene'/.test(visor) && /t\('filmmaker\.addFirstScene'\)/.test(visor));
const OPERACIONES = new Set([...leer('functions/src/filmmaker/operaciones.ts').matchAll(/case '([a-z_]+)'/g)].map((m) => m[1]));
const carpeta = 'components/studio/produccion';
const DEL_WORKSPACE = ['ProductionWorkspace.tsx', 'ProductionMobileEditor.tsx', 'ProductionViewer.tsx', 'ProductionDirectorTabs.tsx', 'ProductionTools.tsx',
  'ProductionTimeline.tsx', 'ProductionShotProperties.tsx', 'ProductionExportPanel.tsx', 'ProductionProjectPanel.tsx', 'ProductionStructureSheet.tsx'];
const usadas = DEL_WORKSPACE.flatMap((f) => [...codigo(`${carpeta}/${f}`).matchAll(/\bop: '([a-z_]+)'/g)].map((m) => m[1]));
const ajenas = [...new Set(usadas.filter((o) => !OPERACIONES.has(o)))];
check('E6) el workspace de Filmmaker solo usa operaciones de F1-A', OPERACIONES.size > 20 && usadas.length > 10 && ajenas.length === 0,
  ajenas.length ? ajenas.join(' · ') : `${new Set(usadas).size} operaciones distintas`);
check('E7) y ninguna de sus piezas llama por su cuenta al servidor ni a una IA',
  DEL_WORKSPACE.every((f) => !/httpsCallable|creatorService|brainService|fetch\(/.test(codigo(`${carpeta}/${f}`))));

/* ═══ F · SIN PROVEEDORES NI MODELOS, SIN CUENTAS DE CREDITS ═══════════════ */
console.log('\n── F · Sin proveedores ni modelos a la vista, y sin cuentas de Credits en el cliente ──');
const MODULOS = ['crear', 'inspira', 'workspace', 'cuenta'];
/* Con mayúscula y palabra entera: «klingt» o «nessuno» son alemán e italiano, no proveedores. */
const PROVEEDORES = /\b(Seedance|ModelArk|BytePlus|Gemini|ElevenLabs|DeepSeek|Kling|Runway|Veo|Nano Banana|OpenAI|Suno)\b/;
const conProveedor = IDIOMAS.flatMap((l) => MODULOS.filter((m) => PROVEEDORES.test(leer(`i18n/textos/${l}/${m}.ts`))).map((m) => `${l}/${m}`));
const lineasWs = (l) => leer(`i18n/textos/${l}/filmmaker.ts`).split('\n').filter((x) => /^ {2}ws\w+: '/.test(x)).join('\n');
const wsConProveedor = IDIOMAS.filter((l) => PROVEEDORES.test(lineasWs(l)));
check('F1) ningún texto del Studio nombra un proveedor ni un modelo de IA, en ningún idioma',
  conProveedor.length === 0 && wsConProveedor.length === 0, [...conProveedor, ...wsConProveedor].join(' · '));
check('F2) ni habla de «modelos»: la persona elige el resultado, no la máquina',
  !/model/i.test(MODULOS.map((m) => leer(`i18n/textos/es/${m}.ts`) + leer(`i18n/textos/en/${m}.ts`)).join('\n').replace(/^\s*\*.*$/gm, '')));
const CLIENTE_DEL_STUDIO = [
  ...['components/workspace', 'components/inspira', 'components/proyectos'].flatMap((d) =>
    fs.readdirSync(path.resolve(RAIZ, d)).filter((f) => /\.tsx?$/.test(f)).map((f) => `${d}/${f}`)),
  ...DEL_WORKSPACE.map((f) => `${carpeta}/${f}`),
  'screens/CrearVideoScreen.tsx', 'screens/InspiraScreen.tsx', 'screens/ProyectosScreen.tsx', 'screens/StudioPerfilScreen.tsx',
  'components/PanelDeCuenta.tsx', 'hooks/useCaminosDeCreacion.ts', 'hooks/useBusquedaDeStudio.ts', 'hooks/useProyectosDeWeeAi.ts',
  'navigation/StudioNavigator.tsx', 'constants/studioWorkspace.ts',
];
const tocanCredits = CLIENTE_DEL_STUDIO.filter((f) => /spendCredits|refundCredits|completeCredits|creditsBalance|increment\(/.test(codigo(f)));
check('F3) el cliente del Studio nunca suma, resta ni escribe Credits', CLIENTE_DEL_STUDIO.length > 25 && tocanCredits.length === 0,
  tocanCredits.join(' · ') || `${CLIENTE_DEL_STUDIO.length} archivos`);
check('F4) el saldo del workspace es la píldora de siempre, la de la cuenta', /<CreditsPill compact=\{movil\} \/>/.test(codigo('components/workspace/CabeceraDeStudio.tsx')));

/* ═══ G · LOS TEXTOS, EN LOS ONCE IDIOMAS ══════════════════════════════════ */
console.log('\n── G · Los textos, en los once idiomas ──');
const sinModulo = IDIOMAS.flatMap((l) => MODULOS.filter((m) => !existe(`i18n/textos/${l}/${m}.ts`)
  || !new RegExp(`from '\\./${m}'`).test(leer(`i18n/textos/${l}/index.ts`))).map((m) => `${l}/${m}`));
check('G1) crear, inspira, workspace y cuenta existen y se registran en los once', sinModulo.length === 0, sinModulo.join(' · '));
check('G2) las cuatro pestañas del Studio salen de sus claves, en los once',
  IDIOMAS.every((l) => ['create', 'inspire', 'projects', 'profile'].every((k) => new RegExp(`^ {2}${k}: '`, 'm').test(leer(`i18n/textos/${l}/nav.ts`)))));
check('G3) esta suite está en la cadena de `npm test`', /studio-ux\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ Weë App como antes, y Weë Studio con su workspace (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
