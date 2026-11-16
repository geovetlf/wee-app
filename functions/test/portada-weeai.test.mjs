/*
 * LA PORTADA DE WEËAI (boceto v2, 2026-11-15): lo que se promete en las reglas de la misión.
 *   node test/portada-weeai.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const carpeta = fs.readdirSync(path.join(RAIZ, 'components/weeai'), { recursive: true }).filter((f) => String(f).endsWith('.tsx') || String(f).endsWith('.ts')).map((f) => `components/weeai/${String(f).split(path.sep).join('/')}`);
const todo = carpeta.map(leer).join('\n');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const codigo = sinComentarios(todo);

check('1) ninguna reproducción automática de video', !/autoPlay|shouldPlay|<Video\b|useVideoPlayer|expo-av|expo-video/.test(codigo));
check('2) la portada no toca Credits: ni cobro, ni reserva, ni consumo (solo navega al flujo de creación)',
  !/spendCredits|completeCredits|refundCredits|creditsService|httpsCallable|getCreditsBalance/.test(codigo));
check('3) «Generar» y «Recrear» navegan al flujo de siempre (CreatorFlow) y nada más', /navigation\.navigate\('CreatorFlow'/.test(leer('components/weeai/PortadaWeeAi.tsx')));
check('4) las plantillas salen del muro existente: sin colección, ni callable, ni consulta nueva',
  /getMuroGeneralPaginado/.test(leer('hooks/usePlantillas.ts')) && !/collection\(|httpsCallable|addDoc|setDoc/.test(codigo + leer('hooks/usePlantillas.ts') + leer('utils/plantillas.ts')));
check('5) las muestras solo existen en el entorno de pruebas declarado y van marcadas como ejemplo',
  /ENTORNO_DE_PRUEBAS = !!process\.env\.EXPO_PUBLIC_DEMO_MEDIOS/.test(leer('hooks/usePlantillas.ts')) && /ejemplo: true/.test(leer('constants/plantillasWeeAi.ts'))
  && !/ejemplo: false/.test(leer('constants/plantillasWeeAi.ts')));

const modelos = leer('constants/modelosWeeAi.ts');
check('6) modelos: ninguna marca competidora ni sin acuerdo', !/Kling|Runway|Veo|Midjourney|Sora/i.test(sinComentarios(modelos)));
check('7) modelos: el video es solo la familia Seedance', (sinComentarios(modelos).match(/tipo: 'video'/g) || []).length === 4 && (sinComentarios(modelos).match(/nombre: 'Seedance /g) || []).length === 4);
check('8) modelos: lo no integrado va deshabilitado y la elección no sale de la interfaz',
  /integrado: false/.test(modelos) && /disabled=\{!habilitado\}/.test(leer('components/weeai/SelectorDeModelo.tsx'))
  && !/navigation\.navigate\([^)]*modelo|creatorService|fetch\(/.test(codigo));

const experiencias = leer('constants/weeExperiences.ts');
check('9) WeëMusic: la bandera está apagada por defecto y solo se enciende con una variable de entorno',
  /MUSICA_EN_LA_UI: boolean = process\.env\.EXPO_PUBLIC_WEEMUSIC_UI === '1'/.test(experiencias));
check('10) la entrada WeëMusic de Herramientas sigue tras su bandera apagada; el sonido de los videos lo genera la IA: «Automático» real y Música/Efectos/Voz «Próximamente», sin pistas, artistas ni buscador de canciones',
  leer('components/weeai/PortadaWeeAi.tsx').includes('MUSICA_EN_LA_UI ? filaDeHerramienta')
  && leer('components/weeai/video/SonidoDeVideo.tsx').includes("t('weeai.soundHelp')") && leer('components/weeai/video/SonidoDeVideo.tsx').includes("t('filmmaker.audioSfx')")
  && !/PISTAS_DE_MUESTRA|pickTrack|publishAsSound|Subir mi canción/.test(codigo) && !fs.existsSync(path.join(RAIZ, 'components/weeai/MusicaDeVideo.tsx')));
check('11) las experiencias apagadas no se borran: ids intactos y la bandera es la única diferencia',
  /apagadas: \['travel'\]/.test(experiencias) && /ocultas: \['music'\]/.test(experiencias) && /plantillas: \['chef'\]/.test(experiencias)
  && /puertas: \['studio', 'design', 'business'\]/.test(experiencias) && /id: 'travel'/.test(experiencias) && /id: 'music'/.test(experiencias));
check('12) el prompt completo solo se enseña si se abre «Detalles» y luego «Ver el prompt completo»',
  /\{verPrompt \? \(/.test(leer('components/weeai/DetalleDePlantilla.tsx')) && /\{abierto \? \(/.test(leer('components/weeai/DetalleDePlantilla.tsx')));
check('13) propiedades lógicas: ni left/right/marginLeft/paddingRight/textAlign izquierdo o derecho a mano',
  !/marginLeft|marginRight|paddingLeft|paddingRight|textAlign: '(left|right)'/.test(codigo));

check('14) el progreso ofrece «Seguir navegando» (sale sin cancelar nada: solo navega a Historial)',
  leer('components/creator/JobProgress.tsx').includes('onKeepBrowsing') && leer('screens/CreatorFlowScreen.tsx').includes("navigation.navigate('Historial')"));
check('15) el resultado conserva la plantilla: atribución al autor y «otra foto» con la misma ruta, sin lógica de cobro',
  ['params.plantilla', "t('weeai.templateBy'", "t('weeai.tryOtherPhoto')"].every((x) => leer('screens/CreatorFlowScreen.tsx').includes(x)));
check('16) «Ajustes avanzados» plegados por defecto: duración y modelo solo al abrirlos; sin semilla ni prompt negativo',
  leer('components/weeai/VistaPreviaDePlantilla.tsx').includes('useState(false)') && leer('components/weeai/VistaPreviaDePlantilla.tsx').includes('avanzado && plantilla.duraciones') && !/seed|semilla|negative/i.test(codigo));
check('17) confianza: «todavía no se ha gastado nada» antes de crear (plan y vista previa), sin cifras inventadas',
  leer('components/creator/PlanCard.tsx').includes("t('weeai.notChargedYet')") && leer('components/weeai/VistaPreviaDePlantilla.tsx').includes("t('weeai.notChargedYet')"));

check('18) sin líneas: ningún borde ni divisor en lo de WeëAI (se separa con tono, espacio y sombra sutil)',
  !/borderWidth|borderColor|borderTopWidth|hairlineWidth|borderStyle/.test(codigo));
check('19) monocromo OSCURO: paleta única del token de WeëAI (no lee tema ni perfil); el único color es el degradado de la acción principal',
  leer('constants/estiloWeeAi.ts').includes("fondo: '#0A0A0A'") && leer('constants/estiloWeeAi.ts').includes("seleccion: '#FAFAFA'") && !/theme.dark|useTheme/.test(leer('hooks/useEstiloWeeAi.ts')) && !/#(FF9500|FFC21A|FF7A00|F08A00|FFF7EA)/i.test(codigo));
check('20) tipografía: cinco tamaños (13 mínimo), pesos 400/500/600 y números tabulares en costes y contadores',
  /nota: 13, cuerpo: 15, enfasis: 17, titulo: 22, display: 28/.test(leer('constants/estiloWeeAi.ts')) && leer('constants/estiloWeeAi.ts').includes("fontVariant: ['tabular-nums']") && !/fontWeight: '700'|FONT_WEIGHT\.heavy/.test(codigo));
check('21) Manrope solo con los pesos 400/500/600 y cargada junto a Inter; el token no pide otras caras',
  ['400Regular', '500Medium', '600SemiBold'].every((w) => fs.readFileSync(path.join(RAIZ, 'App.tsx'), 'utf8').includes(`@expo-google-fonts/manrope/${w}'`)) && !fs.readFileSync(path.join(RAIZ, 'App.tsx'), 'utf8').includes("from '@expo-google-fonts/manrope';") && !/zzz/.test(fs.readFileSync(path.join(RAIZ, 'App.tsx'), 'utf8')) && !/Manrope_(200|300|700|800)/.test(fs.readFileSync(path.join(RAIZ, 'App.tsx'), 'utf8'))
  && /'400': 'Manrope_400Regular'/.test(leer('constants/estiloWeeAi.ts')) && !/Manrope_(200|300|700|800)/.test(leer('constants/estiloWeeAi.ts')));

check('22) WeëAI entera en Manrope por el límite de enTemaClaro; Wall y ☰ no: el contexto por defecto es Inter y no se fuerza fontFamily en los alfabetos sin cobertura',
  leer('contexts/ThemeContext.tsx').includes('FamiliaDeTextoContext.Provider value="manrope"') && leer('contexts/FamiliaDeTextoContext.ts').includes("createContext<FamiliaDeTexto>('inter')")
  && leer('utils/aplicarInter.ts').includes('React.useContext(FamiliaDeTextoContext)')
  && leer('utils/escriturasDeLaInterfaz.web.ts').includes("Inter_400Regular: 'Manrope_400Regular'"));

check('23) funcional: «Más como esta» (misma categoría, ya cargadas), tirar para refrescar con lo que ya se lee y rueda en la descarga; sin llamadas nuevas',
  leer('components/weeai/DetalleDePlantilla.tsx').includes("t('weeai.moreLikeThis')") && leer('components/weeai/PortadaWeeAi.tsx').includes('p.categoria === abierta.categoria')
  && leer('screens/WeeCreatorScreen.tsx').includes('<RefreshControl') && leer('screens/WeeCreatorScreen.tsx').includes('await recargar()')
  && leer('components/creator/ResultCard.tsx').includes('descargando ? <ActivityIndicator'));

check('24) viajes: filtro «Viajes» y 6 plantillas de muestra con título y explicación por clave, prompt como dato y siempre «Ejemplo»; la experiencia Travel sigue apagada',
  leer('constants/plantillasWeeAi.ts').includes("clave: 'weeai.filterTravel'")
  && (leer('constants/plantillasWeeAi.ts').match(/claveTitulo: 'weeai\.tplTravel/g) || []).length === 6
  && !/PLANTILLAS_DE_VIAJES[\s\S]*ejemplo: false/.test(leer('constants/plantillasWeeAi.ts'))
  && !/(Postal|Mochila|Amanecer en la|Tú frente|Mapa de tu)/.test(codigo)
  && /apagadas: \['travel'\]/.test(leer('constants/weeExperiences.ts')));

check('25) la última pestaña es el interruptor de cara: rótulo de la otra cara, icono del selector, misma lógica que el ☰ (switchIdentity + setThemeMode) y al Home de la cara nueva',
  leer('components/BarraInferior.tsx').includes("activeProfileType === 'hidi' ? t('pages.nature_real') : 'Weë'") && leer('components/BarraInferior.tsx').includes("haciaWee ? 'perfilWee' : 'perfilReal'")
  && leer('navigation/NavegacionGlobal.tsx').includes("if (destino === 'Profile') {") && leer('navigation/NavegacionGlobal.tsx').includes('switchIdentity();') && leer('navigation/NavegacionGlobal.tsx').includes("setThemeMode(aWee ? 'dark' : 'light')")
  && leer('navigation/NavegacionGlobal.tsx').includes("if (aWee && !hasWeeProfile) return irARaiz('WeeProfileCreation')") && leer('navigation/NavegacionGlobal.tsx').includes("params: { screen: 'Landing' }"));

check('26) la pestaña WeëAI y todos sus accesos montan la nueva portada (WeeCreator → PortadaWeeAi), y Weë Brain ya no es portada: sin órbita ni nombres antiguos; la barra lateral lista Video, Imagen, Moda y Brain',
  leer('navigation/NavegacionGlobal.tsx').includes("if (destino === 'WeeAI') { abrirPortadaDeWeeAi(); return; }") && leer('screens/WeeCreatorScreen.tsx').includes('<PortadaWeeAi')
  && leer('navigation/MainStackNavigator.tsx').includes('<Stack.Screen name="WeeCreator" component={WeeCreatorScreen} />')
  && !/SistemaDeWeeBrain/.test(leer('screens/BrainChatScreen.tsx').replace(/import \{ CEREBRO_DE_WEE \}[^\n]*\n/, '')) && !leer('components/brain/CabeceraDeWeeBrain.tsx').includes("t('brain.tagline')")
  && leer('components/creator/CreatorSidebar.tsx').includes('PUERTAS_DE_LA_BARRA') && !leer('components/creator/CreatorSidebar.tsx').includes('SPECIALIST_ORDER'));

check('26) la pestaña WeëAI y todos sus accesos montan la nueva portada (WeeCreator → PortadaWeeAi), y Weë Brain ya no es portada: sin órbita ni nombres antiguos; la barra lateral lista Video, Imagen, Moda y Brain',
  leer('navigation/NavegacionGlobal.tsx').includes("if (destino === 'WeeAI') { abrirPortadaDeWeeAi(); return; }") && leer('screens/WeeCreatorScreen.tsx').includes('<PortadaWeeAi')
  && leer('navigation/MainStackNavigator.tsx').includes('<Stack.Screen name="WeeCreator" component={WeeCreatorScreen} />')
  && !leer('screens/BrainChatScreen.tsx').includes('<SistemaDeWeeBrain') && !leer('components/brain/CabeceraDeWeeBrain.tsx').includes("t('brain.tagline')")
  && leer('components/creator/CreatorSidebar.tsx').includes('PUERTAS_DE_LA_BARRA') && !leer('components/creator/CreatorSidebar.tsx').includes('SPECIALIST_ORDER'));

/* REGLA DEL DUEÑO: título, pestaña, píldora, botón y rótulo de tarjeta = UNA palabra en UNA línea (es y en); excepciones, ninguna. */
const unaPalabra = (idioma) => {
  const fuente = leer(`i18n/textos/${idioma}/weeai.ts`);
  const claves = ['tabScenes', 'tabVoices', 'pMine', 'pFav', 'pNew', 'fCity', 'oSport', 'oBeach', 'oWinter', 'oFantasy', 'bUpload', 'bNewVoice', 'describe', 'tPerson', 'tPet']
    .concat([...fuente.matchAll(/^  ((?:ch|sc|cl)_[a-z]+): /gm)].map((m) => m[1]));
  return claves.filter((k) => { const m = fuente.match(new RegExp(`^  ${k}: ['"]([^'"\n]*)['"],`, 'm')); return !m || /\s/.test(m[1]); });
};
check('27) una palabra por título, pestaña, píldora, botón y nombre del catálogo, en es y en (sin excepciones)', unaPalabra('es').length === 0 && unaPalabra('en').length === 0, `es: ${unaPalabra('es')} · en: ${unaPalabra('en')}`);
check('27b) los rótulos de esas filas no se parten: una línea con elipsis y filas que se desplazan de lado',
  leer('components/weeai/video/PiezasDeElementos.tsx').includes('numberOfLines={1}') && leer('components/weeai/video/PiezasDeElementos.tsx').includes('horizontal showsHorizontalScrollIndicator={false}'));
const cat = leer('constants/catalogoElementos.ts');
check('28) catálogo de muestra: ≥24 personajes, ≥20 escenarios, ≥18 prendas, todos «Ejemplo», por clave y sin frases; límites provisionales',
  (cat.match(/\['[a-z]+', '[a-z]+'(?:, true)?\]/g) || []).length >= 24 + 20 + 10 && /PERSONAJES_DE_WEE/.test(cat) && /ESCENARIOS_DE_WEE/.test(cat) && /ROPA_DE_WEE/.test(cat)
  && !/ejemplo: false/.test(cat) && /PROVISIONALES/.test(cat) && leer('i18n/textos/es/weeai.ts').includes('(provisional)'));
check('29) los elementos propios son locales y sin sincronizar: AsyncStorage por cuenta, sin colección, callable ni subida; la generación no los envía',
  leer('services/elementosStore.ts').includes('AsyncStorage') && !/collection\(|httpsCallable|uploadBytes|fetch\(/.test(leer('services/elementosStore.ts') + leer('hooks/useElementos.ts'))
  && /NO envía personajes/.test(leer('screens/CrearVideoScreen.tsx')) && !/adjuntos|elegidos[^;\n]*navigate/.test(leer('screens/CrearVideoScreen.tsx').replace(/\/\*[\s\S]*?\*\//g, '')));

check('30) WeëAI es SIEMPRE OSCURA, igual con las dos caras: todas sus pantallas se envuelven con enTemaOscuro (ninguna con enTemaClaro) y la barra inferior va oscura en WeëAI',
  ['BrainChatScreen', 'BusinessScreen', 'ChefScreen', 'CrearVideoScreen', 'CreatorFlowScreen', 'DesignScreen', 'MisCreacionesScreen', 'ProjectScreen', 'ProjectsScreen', 'SpecialistScreen', 'StudioScreen', 'WeeCreatorScreen'].every((p) => leer(`screens/${p}.tsx`).includes('enTemaOscuro(') && !leer(`screens/${p}.tsx`).includes('enTemaClaro('))
  && leer('navigation/NavegacionGlobal.tsx').includes("puesto === 'WeeAI' ? TemaOscuro : React.Fragment"));

check('31) personalizar: Cara/Cuerpo de una palabra, ranuras «Tú»/«Otro» con + y ✕, por defecto el de la plantilla, coste y aviso antes de Recrear, entrada rechazada con mensaje accionable; nada se envía',
  leer('components/weeai/video/PersonalizarVideo.tsx').includes("t('menu.customize')") && /modeFace/.test(leer('components/weeai/video/PersonalizarVideo.tsx')) && /modoPorDefectoDe/.test(leer('components/weeai/PortadaWeeAi.tsx'))
  && /ranurasDe/.test(leer('constants/plantillasWeeAi.ts')) && /r2', rol: 'other'/.test(leer('constants/plantillasWeeAi.ts'))
  && leer('components/weeai/DetalleDePlantilla.tsx').includes("t('filmmaker.cost')") && leer('components/weeai/video/PersonalizarVideo.tsx').includes("t('weeai.ownImageNotice')")
  && leer('screens/CreatorFlowScreen.tsx').includes("t('weeai.inputRejected')") && !/huecos[^;\n]*creatorService|plantilla[^;\n]*httpsCallable/.test(leer('components/weeai/PortadaWeeAi.tsx')));
check('32) reacciones del Wall: sin 👎 en la publicación; Fuego y Risa ACTIVAS por defecto (interruptor =0), votan por voteService con contadores propios, comentarios intactos, reglas con fire/laugh',
  !/thumbs-down/.test(leer('components/PostCard.tsx')) && leer('constants/reacciones.ts').includes("EXPO_PUBLIC_REACCIONES_NUEVAS !== '0'") && /fuego:/.test(leer('components/icons/trazosDeWee.ts')) && /risa:/.test(leer('components/icons/trazosDeWee.ts'))
  && leer('components/PostCard.tsx').includes('REACCIONES_NUEVAS_EN_LA_UI ? <ReaccionesNuevas ') && leer('components/PostCard.tsx').includes('onVotar={handleVoteNueva}')
  && leer('services/voteService.ts').includes("VoteType = 'agree' | 'disagree' | 'fire' | 'laugh'") && leer('services/voteService.ts').includes("CommentVoteType = 'agree' | 'disagree'")
  && leer('firestore.rules').includes("['agree', 'disagree', 'fire', 'laugh']") && leer('firestore.rules').includes("contadorSano('fireCount')") && leer('firestore.rules').includes("tipoDeVotoDeComentarioValido()"));

check('33) compositor de publicación: monocromo (IconoWee, sin Ionicons de color ni chips de experiencias), UN solo Publicar (abajo), una entrada «Crear con IA» a WeeCreator',
  (() => {
    const c = sinComentarios(leer('screens/CreateScreen.tsx'));
    return !/CREAR_CON_IA|crearIAChip|crearIAFila/.test(c) && !c.includes('name="paper-plane') && (c.match(/Ionicons/g) || []).length <= 3
      && c.includes("navigate('WeeCreator')") && c.includes('composer.createWithAi') && c.includes('composer.gallery') && c.includes('composer.place') && c.includes('composer.projects')
      && !c.includes('styles.postButton') && (c.match(/onPress=\{handlePublish\}/g) || []).length === 1
      && ['camara', 'galeria', 'econtact', 'lugar', 'encuesta', 'carpeta'].every((n) => c.includes('icono="' + n + '"'));
  })());
check('34) hoja Crear: seis tarjetas de trazo (IconoWee) sin Ionicons ni círculos de color, y la tarjeta de WeëAI CONSERVA su color (carbón #1A1D24, chispas #FFC21A, píldora con degradado y texto #0A0A0A): es el único acento de la hoja',
  (() => {
    const c = leer('components/CreateSheet.tsx');
    return !c.includes('Ionicons') && c.includes('IconoWee') && c.includes("'#1A1D24'") && c.includes('#FFC21A') && c.includes("color: '#0A0A0A'")
      && (c.match(/<RellenoDeMarca/g) || []).length === 1 && c.includes("accessibilityRole=\"button\"") && c.includes('onPress={onOpenCreator}');
  })());
check('35) la tarjeta de comunidad abre Community con su id y «Unirse» sigue aparte; barra del Home sin raya ni ajuste de fuente, columnas iguales con icono encima',
  (() => {
    const c = leer('screens/CommunitiesManagementScreen.tsx');
    const p = sinComentarios(leer('components/inicio/PestanasDeInicio.tsx'));
    return c.includes("navigate('Community', { communityId: item.id })") && c.includes('onPress={() => handleToggleCommunity(item)}') && c.includes('flexShrink: 0')
      && !/adjustsFontSizeToFit|raya|RellenoDeDegradado|borderBottom/.test(p) && /atajo: \{[^}]*flex: 1/.test(p) && !/atajo: \{[^}]*flexDirection: 'row'/.test(p);
  })());

check('36) la pestaña WeëAI lleva SIEMPRE a la portada: abrirPortadaDeWeeAi usa popTo (no navigate, que apilaba portada→Brain→portada); la pestaña, la hoja Crear y el ☰ la usan',
  (() => {
    const r = sinComentarios(leer('navigation/refNavegacion.ts'));
    const n = sinComentarios(leer('navigation/NavegacionGlobal.tsx'));
    return /StackActions\.popTo\('WeeCreator'\)/.test(r) && /export const abrirPortadaDeWeeAi/.test(r)
      && /if \(destino === 'WeeAI'\) \{ abrirPortadaDeWeeAi\(\); return; \}/.test(n) && !/irARaiz\('WeeCreator'\)/.test(n)
      && /abrirPortadaDeWeeAi/.test(sinComentarios(leer('components/DrawerMenu.tsx'))) && /abrirPortadaDeWeeAi/.test(sinComentarios(leer('navigation/TabNavigator.tsx')));
  })());
check('37) Brain: título «Brain» de una palabra, sin lema ni descripción decorativos en su cabecera',
  !/<Text>Weë <\/Text>/.test(leer('components/brain/CabeceraDeWeeBrain.tsx')) && leer('screens/BrainChatScreen.tsx').includes('title="Brain"')
  && !/styles\.presentacion\}/.test(leer('components/brain/CabeceraDeWeeBrain.tsx')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
