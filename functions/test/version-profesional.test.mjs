/**
 * WEË VERSIÓN CREATOR DE LA WEB: SOLO EL TRABAJO.
 *
 * Fija en el código lo que la define. Lo que solo se ve en un navegador se comprueba en un recorrido aparte.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
let fallos = 0;
const check = (n, ok) => { console.log(`${ok ? '✔' : '✘'} ${n}`); if (!ok) fallos++; };

const NAV = leer('navigation/EspacioProfesionalNavigator.tsx');
const MARCO = leer('components/workspace/MarcoProfesional.tsx');
const DATOS = leer('constants/espacioProfesional.ts');
const APP = leer('App.tsx');

check('1) siempre clara: es del Perfil Real', NAV.includes('<TemaClaro>'));
check('2) entrar con el Perfil Weë vuelve al Real', /activeProfileType !== 'hidi'[\s\S]*switchIdentity\(\)[\s\S]*setThemeMode\('light'\)/.test(NAV));
check('3) sin Weëls, muro ni elección de perfil en su navegación', !/Reels|Landing|WeeProfileCreation|AiAvatar/.test(MARCO + NAV));
check('4) el marco enseña el perfil Real, no el activo', MARCO.includes('realProfile') && !MARCO.includes('userProfile'));
check('5) todas las secciones salen de su fuente única', DATOS.includes('WEE_EXPERIENCES.map'));
check('6) proyectos y creaciones piden cuenta', /user \? irA\(e\.ruta\) : navigation\.navigate\('Login'\)/.test(MARCO));
check('7) tiene dirección propia, /creator, y lo privado del flujo no sale en ella', /EspacioProfesional: \{\s*path: 'creator'/.test(APP) && APP.includes("enlaceDeCreatorFlow('weeai/:experienceId')") && /goal: nuncaEnLaUrl/.test(leer('navigation/enlaces.ts')));
check('8) Filmmaker y Mundo 3D no se abren desde aquí', !/name="(Production|Mundo3D)"/.test(NAV));
check('9) la barra de la App no entra', /'EspacioProfesional',\s*\]\)/.test(leer('navigation/NavegacionGlobal.tsx')));
check('10) el marco de Weë AI no se duplica dentro', leer('components/creator/CreatorShell.tsx').includes('{!enProfesional && <CreatorSidebar'));
const SEL = leer('components/workspace/SelectorDeVersion.tsx');
check('12) la píldora está arriba en las dos versiones', MARCO.includes('<SelectorDeVersion puesta="pro" />') && leer('components/Header.tsx').includes('<SelectorDeVersion puesta="app" corta />'));
check('13) la píldora es solo de la web', SEL.includes('!VERSION_PROFESIONAL_EN_LA_WEB') && DATOS.includes("VERSION_PROFESIONAL_EN_LA_WEB = Platform.OS === 'web'"));
check('14) la barra lateral de la App no cambia: se entra por la píldora', !leer('components/Sidebar.tsx').includes('EspacioProfesional'));
check('15) en la app móvil no existe: ni ruta, ni dirección, ni píldora', leer('navigation/MainStackNavigator.tsx').includes('{VERSION_PROFESIONAL_EN_LA_WEB && <Stack.Screen name="EspacioProfesional"') && APP.includes('...(!VERSION_PROFESIONAL_EN_LA_WEB ? {} : { EspacioProfesional') && leer('components/Header.tsx').includes('{isWeb && <SelectorDeVersion'));
check('16) la barra de Weë AI, con su enlace al perfil, no entra', leer('components/creator/CreatorShell.tsx').includes('{!enProfesional && <View style={[styles.topBar'));
check('17) volver no saca de Weë versión creator', /enProfesional\) return navigation\.navigate\('WeeCreator'\)/.test(leer('components/creator/CabeceraDeSeccion.tsx')));
const INI = leer('screens/ProInicioScreen.tsx');
check('6b) nada de muestra: tendencias y publicaciones salen de los datos', INI.includes('getPopularHashtags') && !/mock|Valentina|12\.4K/i.test(INI));
check('18) el Inicio es el muro real, sin Weëls', INI.includes('getMuroGeneralPaginado') && INI.includes('!p.isWeel'));
check('19) el Inicio no enseña Weëls ni Perfil Weë', !/Reels|WeeProfile|AiAvatar|hasWeeProfile/.test(INI));
check('20) el Inicio lee el perfil Real, no el activo', INI.includes('realProfile') && !INI.includes('userProfile'));
check('20) los nombres son los del dueño: Weë versión app y Weë versión creator', /versionApp: 'Weë versión app'/.test(leer('i18n/textos/es/profesional.ts')) && /versionCreator: 'Weë versión creator'/.test(leer('i18n/textos/es/profesional.ts')));
/* El rediseño de las secciones de Weë AI: todo dentro de su rama, nada de muestra, las puertas cerradas siguen cerradas. */
const SECCIONES = ['screens/StudioScreen.tsx', 'screens/DesignScreen.tsx', 'screens/ChefScreen.tsx', 'screens/BusinessScreen.tsx', 'screens/BrainChatScreen.tsx', 'screens/SpecialistScreen.tsx', 'components/creator/CabeceraDeSeccion.tsx', 'components/creator/CajaDePrompt.tsx', 'components/creator/ActionGrid.tsx', 'components/creator/ExamplesRow.tsx', 'components/creator/IdeaBox.tsx', 'components/creator/TravelLauncher.tsx'];
check('21) cada sección se rediseña dentro de su rama de creator', SECCIONES.every((p) => /useEnEspacioProfesional\(\)/.test(leer(p))));
check('22) Studio y Design no enseñan creaciones de muestra en creator', ['screens/StudioScreen.tsx', 'screens/DesignScreen.tsx'].every((p) => /pro \? \(\s*<EnlaceDeCreaciones \/>/.test(leer(p))));
const BIZ = leer('screens/BusinessScreen.tsx');
check('23) Weë Fashion no enseña cifras, mensajes ni redes de muestra en creator', /\{pro \? <Vacio texto=\{t\('business\.overviewEmpty'\)\}/.test(BIZ) && /\{!pro && \(\s*<>\s*<Bloque titulo=\{t\('business\.mySocialAccounts'\)\}/.test(BIZ));
check('24) la caja de creator es la misma: ningún TextInput nuevo fuera de CajaDePrompt', !/<TextInput\b/.test(leer('components/creator/PiezasDeCreator.tsx')));
if (fallos) { console.error(`${fallos} fallo(s)`); process.exit(1); }
console.log('✔ Weë versión creator: 25 comprobaciones');
