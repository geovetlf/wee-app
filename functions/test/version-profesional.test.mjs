/**
 * WEË VERSIÓN CREATOR DE LA WEB: UN SOLO NÚCLEO, Y SOLO EL TRABAJO.
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
check('4) el marco enseña el perfil que está puesto, sin cambiarlo', MARCO.includes('userProfile') && !MARCO.includes('switchIdentity'));
check('4b) el estado de Music, Filmmaker y Mundo 3D sale de sus puertas', /MUSIC_GENERACION_VALIDADA \? 'pendiente'/.test(DATOS) && /FILMMAKER_EN_LA_APP \? 'conectado' : 'cerrado'/.test(DATOS) && /MUNDO_3D_EN_LA_APP \? 'conectado' : 'cerrado'/.test(DATOS));
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
check('2) entrar no toca a la persona: ni cambia el perfil ni el tema de la app', !/switchIdentity|setThemeMode/.test(NAV));
const SOCIAL = /Reels|Landing|WeeProfileCreation|AiAvatar|ExploreCommunities|Inbox|Notifications|SavedPosts|Search|WeelsRow|PostCard|Community/;
check('3) sin nada social en su navegación: ni Weëls, ni Perfil Weë, ni muro, ni comunidades, ni conexiones', !SOCIAL.test(MARCO + NAV));
check('18) el Inicio es de trabajo: sin muro ni nada social', !SOCIAL.test(INI) && !/getMuroGeneral|getPopularHashtags|hasWeeProfile|isWeel/.test(INI));
check('19) el Inicio lee los proyectos y las creaciones de la cuenta, de los mismos servicios', /projectsService\s*\.list\(uid\)/.test(INI) && /assetsService\s*\.listar\(uid\)/.test(INI) && !/mock|Valentina|12\.4K/i.test(INI));
check('19b) saldo y trabajos salen de los mismos servicios: useWallet y creatorService', /const \{ account \} = useWallet\(\)/.test(INI) && /creatorService\s*\.getMyJobs\(uid/.test(INI));
check('25) publicar es de la versión app: su botón sigue allí y en creator no sale', /\{!pro && \(\s*<TouchableOpacity\s*onPress=\{\(\) => onPublish\(publicable\)\}/.test(leer('components/creator/ResultCard.tsx')));
check('26) Weë Design no simula en creator: va a la experiencia común', /if \(pro\) \{\s*navigation\.navigate\('CreatorFlow', \{ experienceId: 'design', goal: prompt\.trim\(\) \}\);\s*return;/.test(leer('screens/DesignScreen.tsx')));
check('26b) en creator una pregunta sin opciones se contesta en la caja común; en la app no cambia', /pro && question\.options\.length === 0 \? \(/.test(leer('components/creator/GuidedQuestion.tsx')));
check('26c) lo de debajo de creator se aparta: lo social no queda al alcance del teclado', /name="Main"[^\n]*VERSION_PROFESIONAL_EN_LA_WEB \? \{ detachPreviousScreen: true \} : undefined/.test(leer('navigation/MainStackNavigator.tsx')) && /name="EspacioProfesional"[^>]*detachPreviousScreen: true/.test(leer('navigation/MainStackNavigator.tsx')));
check('26d) Mis creaciones no habla de los perfiles en creator', /\{!pro && \(\s*<View style=\{\[styles\.intro/.test(leer('screens/MisCreacionesScreen.tsx')));
/* UN SOLO NÚCLEO: la presentación no llega ni a los servicios ni al servidor. */
const archivos = (dir) => fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? archivos(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const MODO = /useEnEspacioProfesional|EspacioProfesional|versionCreator/;
const NUCLEO = ['services', 'hooks', 'functions/src'].flatMap(archivos).filter((f) => /\.tsx?$/.test(f));
check('27) ningún servicio, hook ni función conoce el modo: mismo cobro, mismos datos', NUCLEO.length > 50 && !NUCLEO.some((f) => MODO.test(leer(f))));
const PRESENTACION = [NAV, MARCO, INI, DATOS, SEL, leer('components/creator/PiezasDeCreator.tsx')].join('\n');
check('28) la presentación no habla con el servidor por su cuenta', !/from 'firebase\/|httpsCallable|spendCredits|signInWith|createUser/.test(PRESENTACION));
check('29) las pantallas de trabajo son las mismas que en la versión app', ['Specialist', 'CreatorFlow', 'Projects', 'Project', 'MisCreaciones'].every((n) => NAV.includes(`from '../screens/${n}Screen'`) && leer('navigation/MainStackNavigator.tsx').includes(`name="${n}"`)));
const PILA = leer('navigation/MainStackNavigator.tsx');
check('30) la versión app conserva su navegación social', ['name="Reels"', 'name="WeeProfileCreation"', 'name="Community"', 'name="SavedPosts"'].every((n) => PILA.includes(n)) && /name="Inbox"/.test(leer('navigation/TabNavigator.tsx')));
check('20) los nombres son los del dueño: Weë versión app y Weë versión creator', /versionApp: 'Weë versión app'/.test(leer('i18n/textos/es/profesional.ts')) && /versionCreator: 'Weë versión creator'/.test(leer('i18n/textos/es/profesional.ts')));
/* El rediseño de las secciones de Weë AI: todo dentro de su rama, nada de muestra, las puertas cerradas siguen cerradas. */
const SECCIONES = ['screens/StudioScreen.tsx', 'screens/DesignScreen.tsx', 'screens/ChefScreen.tsx', 'screens/BusinessScreen.tsx', 'screens/BrainChatScreen.tsx', 'screens/SpecialistScreen.tsx', 'components/creator/CabeceraDeSeccion.tsx', 'components/creator/CajaDePrompt.tsx', 'components/creator/ActionGrid.tsx', 'components/creator/ExamplesRow.tsx', 'components/creator/IdeaBox.tsx', 'components/creator/TravelLauncher.tsx'];
check('21) cada sección se rediseña dentro de su rama de creator', SECCIONES.every((p) => /useEnEspacioProfesional\(\)/.test(leer(p))));
check('22) Studio y Design no enseñan creaciones de muestra en creator', ['screens/StudioScreen.tsx', 'screens/DesignScreen.tsx'].every((p) => /pro \? \(\s*<EnlaceDeCreaciones \/>/.test(leer(p))));
const BIZ = leer('screens/BusinessScreen.tsx');
check('23) Weë Fashion no enseña cifras, mensajes ni redes de muestra en creator', /\{pro \? <Vacio texto=\{t\('business\.overviewEmpty'\)\}/.test(BIZ) && /\{!pro && \(\s*<>\s*<Bloque titulo=\{t\('business\.mySocialAccounts'\)\}/.test(BIZ));
check('24) la caja de creator es la misma: ningún TextInput nuevo fuera de CajaDePrompt', !/<TextInput\b/.test(leer('components/creator/PiezasDeCreator.tsx')));
if (fallos) { console.error(`${fallos} fallo(s)`); process.exit(1); }
console.log('✔ Weë versión creator: un solo núcleo, navegación propia');
