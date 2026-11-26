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
check('3) «Generar» y «Recrear» navegan al flujo de siempre (CreatorFlow) y nada más', /navigation\.navigate\('CreatorFlow'/.test(leer('components/weeai/PantallaDePlantillas.tsx')));
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
  leer('components/weeai/ListaDeHerramientas.tsx').includes('MUSICA_EN_LA_UI ? fila(')
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

/* PORTADA v2 (2026-11-17): la referencia del dueño lleva bordes finos en módulos, caja y píldoras. Solo las piezas de la portada v2 pueden dibujarlos y SOLO con los tokens PORTADA_WEEAI (nunca un color suelto); el resto de WeëAI sigue sin líneas. */
/* + PuertasDePortada (WeëAI sencillo, 2026-11-23): las tres puertas llevan el material del módulo de siempre, con sus tokens. */
const PIEZAS_PORTADA_V2 = ['CabeceraDePortada', 'HeroDePortada', 'ModulosDePortada', 'PuertasDePortada', 'GaleriaDePlantillas', 'PortadaWeeAi', 'arteDePortada'];
const codigoSinPortadaV2 = carpeta.filter((f) => !PIEZAS_PORTADA_V2.some((p) => f.includes('/' + p + '.'))).map(leer).map(sinComentarios).join(' ');
const codigoPortadaV2 = carpeta.filter((f) => PIEZAS_PORTADA_V2.some((p) => f.includes('/' + p + '.'))).map(leer).map(sinComentarios).join(' ');
check('18) sin líneas fuera de la portada v2; en la portada v2 los bordes salen solo de los tokens PORTADA_WEEAI (ni un color suelto)',
  !/borderWidth|borderColor|borderTopWidth|hairlineWidth|borderStyle/.test(codigoSinPortadaV2) && !/border[A-Za-z]*Color: ['"#r]/.test(codigoPortadaV2));
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
  leer('components/weeai/DetalleDePlantilla.tsx').includes("t('weeai.moreLikeThis')") && leer('components/weeai/PantallaDePlantillas.tsx').includes('p.categoria === abierta.categoria')
  && leer('screens/PlantillasWeeAiScreen.tsx').includes('<RefreshControl') && leer('screens/PlantillasWeeAiScreen.tsx').includes('await recargar()')
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
  leer('components/weeai/video/PersonalizarVideo.tsx').includes("t('menu.customize')") && /modeFace/.test(leer('components/weeai/video/PersonalizarVideo.tsx')) && /modoPorDefectoDe/.test(leer('components/weeai/PantallaDePlantillas.tsx'))
  && /ranurasDe/.test(leer('constants/plantillasWeeAi.ts')) && /r2', rol: 'other'/.test(leer('constants/plantillasWeeAi.ts'))
  && leer('components/weeai/DetalleDePlantilla.tsx').includes("t('filmmaker.cost')") && leer('components/weeai/video/PersonalizarVideo.tsx').includes("t('weeai.ownImageNotice')")
  && leer('screens/CreatorFlowScreen.tsx').includes("t('weeai.inputRejected')") && !/huecos[^;\n]*creatorService|plantilla[^;\n]*httpsCallable/.test(leer('components/weeai/PantallaDePlantillas.tsx')));
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

/* RONDA 2 (2026-11-17): portada FIJA, módulo «Plantillas» con su pantalla, módulo «Filmmaker» y «Herramientas». */
const portada = sinComentarios(leer('components/weeai/PortadaWeeAi.tsx'));
check('38) la portada es FIJA: el marco la monta sin desplazamiento (prop fija), y no lleva el muro, ni filtros, ni RefreshControl; el tope de la caja sale de la altura medida',
  leer('screens/WeeCreatorScreen.tsx').includes('fija') && leer('components/creator/CreatorShell.tsx').includes('{fija ? (') && !/TarjetaDePlantilla|FiltrosDePlantillas|RefreshControl|usePlantillas/.test(portada + sinComentarios(leer('screens/WeeCreatorScreen.tsx')))
  && portada.includes('topeDeLaCaja') && portada.includes('<CajaAnclada alto={topeDeLaCaja}>'));
/*
 * WEËAI SENCILLO (decisión del dueño, 2026-11-23, boceto aprobado): la rejilla de ocho módulos pasa a TRES puertas para publicar
 * —Imagen, Video corto y Editar mi foto— y Filmmaker y Music no aparecen (archivados, docs/ARCHIVO.md). Sustituyen a las 39, 40 y 45
 * de la portada v2; Plantillas y Herramientas siguen con su ruta propia (41 y 43), solo dejan de estar en la portada.
 */
check('39) tres puertas: Imagen, Video corto y Editar mi foto, todas a «crear para publicar» (CrearPublicacion); ni Audio, ni Texto, ni 3D, ni Plantillas, ni Herramientas en la portada',
  ["id: 'imagen'", "id: 'video'", "id: 'editar'"].every((k) => portada.includes(k)) && (portada.match(/crear\('(imagen|video|editar)'/g) || []).length >= 3
  && portada.includes("navigation.navigate('CrearPublicacion'") && !/audio:|texto:|tresD:|plantillas:|herramientas:|kindAudio|ondas/.test(portada));
check('40) Filmmaker y Music archivados: la portada no los nombra ni los abre, la puerta de Filmmaker está CERRADA y la de Music sigue tras su bandera',
  !/Filmmaker|FILMMAKER_EN_LA_APP|MUSICA_EN_LA_UI|camaraCine|music/.test(portada) && /export const FILMMAKER_EN_LA_APP = false/.test(leer('constants/studioExperiences.ts'))
  && /MUSICA_EN_LA_UI: boolean = process\.env\.EXPO_PUBLIC_WEEMUSIC_UI === '1'/.test(experiencias));
check('40b) la caja: el «+» adjunta una foto y lleva a «Editar mi foto» (la foto viaja en memoria, no en la ruta); sin marcar nada, Weë Brain como siempre',
  portada.includes("t('publicar.adjuntarFoto')") && portada.includes('dejarFotoPendiente(') && portada.includes("crear('editar'") && !/deshabilitada: true/.test(portada)
  && portada.includes("navigation.navigate('CreatorFlow', { experienceId: 'brain', goal })"));
check('41) la ruta Plantillas está en la pila principal (con su enlace web y su pestaña WeëAI) y la barra inferior no se toca; la pestaña sigue abriendo la portada con popTo',
  leer('navigation/MainStackNavigator.tsx').includes('<Stack.Screen name="Plantillas" component={PlantillasWeeAiScreen} />') && leer('App.tsx').includes("Plantillas: { path: 'weeai/plantillas'") && leer('navigation/NavegacionGlobal.tsx').includes("Plantillas: 'WeeAI'")
  && /StackActions\.popTo\('WeeCreator'\)/.test(leer('navigation/refNavegacion.ts')));
check('42) una palabra, una línea en los módulos: UN solo tamaño para todos los nombres (el que cabe al más largo del idioma, mínimo 0,6-0,7 del base), nombre con numberOfLines={1}, y su hueco reservado para «Próximamente» para que el nombre no se mueva',
  leer('components/weeai/ModulosDePortada.tsx').includes('tamanoUniforme(nombres, lado)') && leer('components/weeai/ModulosDePortada.tsx').includes('numberOfLines={1}>{nombre}') && leer('components/weeai/ModulosDePortada.tsx').includes('styles.hueco'));
/* HERRAMIENTAS EN SU PANTALLA (2026-11-17): ya no es una hoja inferior. */
const lista = sinComentarios(leer('components/weeai/ListaDeHerramientas.tsx'));
check('43) Herramientas es una pantalla propia (ruta registrada, con enlace web y pestaña WeëAI) y la portada ya no lleva hoja inferior ni la lista; la lista conserva Weë Brain, Moda con todos sus modos, WeëMusic tras bandera y el avatar, con la navegación de siempre',
  leer('navigation/MainStackNavigator.tsx').includes('<Stack.Screen name="Herramientas" component={HerramientasWeeAiScreen} />') && leer('App.tsx').includes("Herramientas: { path: 'weeai/herramientas'") && leer('navigation/NavegacionGlobal.tsx').includes("Herramientas: 'WeeAI'")
  && !/Modal|Pressable|FASHION_MODOS|getExperienceById/.test(portada) && lista.includes("irA('brain')") && lista.includes('FASHION_MODOS.map') && lista.includes("navigate('Specialist', { id: ID_DE_MODA, modo })")
  && lista.includes("hasWeeProfile ? 'AiAvatar' : 'WeeProfileCreation'") && leer('screens/HerramientasWeeAiScreen.tsx').includes('<ListaDeHerramientas />') && leer('screens/HerramientasWeeAiScreen.tsx').includes('enTemaOscuro('));

check('44) todos los idiomas: la medida de texto de la portada distingue escrituras (CJK/hangul 1 em, jemer, devanagari, árabe/hebreo), el titular se acota a sus dos líneas, la caja vacía reserva dos líneas si el ejemplo no cabe, y el nombre de módulo se calcula por em (no por letras)',
  /0x3000/.test(leer('components/weeai/medidaDeTexto.ts')) && /0x1780/.test(leer('components/weeai/medidaDeTexto.ts')) && leer('components/weeai/ModulosDePortada.tsx').includes('emDeTexto(n, 0.58)') && !/ANCHO_DE_LETRA/.test(leer('components/weeai/ModulosDePortada.tsx'))
  && leer('components/weeai/HeroDePortada.tsx').includes('emDeTexto(tTitulo') && leer('components/creator/CajaDePrompt.tsx').includes('ejemploLargo'));

/* RONDA 4 (2026-11-17): corrección en teléfono real (pantalla alta). */
const modulosTsx = sinComentarios(leer('components/weeai/ModulosDePortada.tsx'));
const heroTsx = sinComentarios(leer('components/weeai/HeroDePortada.tsx'));
const puertasTsx = sinComentarios(leer('components/weeai/PuertasDePortada.tsx'));
check('45) puertas: en el teléfono, FILAS a lo ancho (icono, nombre y su línea de ayuda, sin cortar: dos líneas como mucho); en escritorio, las tres en fila',
  puertasTsx.includes("puertaEnColumna: { flexDirection: 'row'") && puertasTsx.includes('numberOfLines={2}>{p.nombre}') && puertasTsx.includes('numberOfLines={2}>{p.desc}')
  && portada.includes('enFila={isDesktop}') && /rejilla: \{ flexDirection: 'row'/.test(puertasTsx));
check('46) el arco es un recurso AMBIENTAL: vive dentro del hero, por detrás del texto, anclado arriba y desvanecido con un degradado NATIVO (el del SVG no lo respeta Android y dejaba una banda con borde duro); sin meridianos que bajen al texto',
  heroTsx.includes('<LinearGradient') && heroTsx.includes("colors={['rgba(5,6,8,0)', P.fondo]}") && heroTsx.includes('BORDE_ARRIBA') && !/FondoDeEsfera/.test(portada) && !/meridianos = [^']/.test(sinComentarios(leer('components/weeai/arteDePortada.ts'))) && !/id="g3"/.test(leer('components/weeai/arteDePortada.ts')));
check('47) reparto vertical adaptativo: el hero ocupa lo que sobra (flex), la rejilla se ancla abajo con una holgura constante de 20 dp sobre la barra, y la caja y las tarjetas se calculan con la altura medida',
  heroTsx.includes('flex: 1') && portada.includes('HOLGURA_SOBRE_LA_BARRA = 20') && portada.includes('paddingBottom: HOLGURA_SOBRE_LA_BARRA') && portada.includes('altoDePuertas') && portada.includes('topeDeLaCaja'));
check('48) subtítulo y titular sin palabra huérfana también en Android: salto equilibrado por código (no solo textWrap: balance de la web) y una sola línea si el titular cabe con una letra >= 78 %',
  heroTsx.includes('export const equilibrar') && heroTsx.includes("equilibrar(tSub") && heroTsx.includes('enUnaLinea'));

check('49) RTL en teléfono real: el arco NUNCA baja del borde superior del texto — el arte y su desvanecido viven dentro de una franja clipada (overflow hidden) cuya altura sale del y MEDIDO del bloque de texto (menos 6 dp), y el titular reserva más altura de línea en escritura árabe/hebrea',
  heroTsx.includes('yDelTexto') && heroTsx.includes('setYDelTexto') && /styles.franja/.test(heroTsx) && /franja: {[^}]*overflow: 'hidden'/.test(heroTsx) && /yDelTexto - 6/.test(heroTsx) && heroTsx.includes('interlineado') && /1.42/.test(heroTsx) && heroTsx.includes('onLayout'));
const modulosTsx50 = sinComentarios(leer('components/weeai/ModulosDePortada.tsx'));
check('50) una palabra latina entre nombres árabes/hebreos (Filmmaker, 3D) baja a 0,86 del tamaño común para no destacar ni rozar el borde; con nombres latinos o CJK el tamaño es el mismo para todos',
  modulosTsx50.includes('CORRECCION_LATINO_EN_RTL = 0.86') && modulosTsx50.includes('tamanoDeNombre(nombre, tam, nombres)') && modulosTsx50.includes('06FF'));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
