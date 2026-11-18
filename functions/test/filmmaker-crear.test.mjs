/*
 * LA PRIMERA CAPA DE WEË FILMMAKER — «Crear» (2026-11-17): lo que se promete.
 *   node test/filmmaker-crear.test.mjs
 *
 *   A · El TIEMPO LÍMITE: crear una producción y leer la lista no se quedan girando sin Functions (fallo `sin_conexion`, reintentable);
 *       el resto de operaciones conserva su espera larga; y un servicio SIN el límite sí se queda colgado (el control del sabotaje).
 *   E · El taller de Idea (ola 1 de la experiencia): lógica pura, estados cerrados con su motivo, nada simulado, un solo botón blanco.
 *   B · La pantalla: tipos habilitados / plantilla / cerrados, controles cerrados con motivo, chip de marca por UNA constante (las dos variantes),
 *       la acción con la operación existente, la ruta y la navegación, sin tocar la barra inferior.
 */
import fs from 'node:fs';
import path from 'node:path';
import { crearCargador, leer, sinComentarios, RAIZ } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const cargar = crearCargador({ dobles: { 'firebase/functions': { httpsCallable: () => async () => ({ data: {} }) }, '../config/firebase': { functions: {} } } });
const S = cargar('services/filmmakerService.ts');
const colgada = () => new Promise(() => {});
const carrera = (promesa, ms) => Promise.race([promesa, new Promise((r) => setTimeout(() => r('COLGADA'), ms))]);

/* ═══ A · EL TIEMPO LÍMITE ═══ */
console.log('── A · El tiempo límite ──');
check('A0) el plazo corto por defecto es razonable (12-15 s) y es solo del cliente', S.PLAZO_CORTO_MS >= 12_000 && S.PLAZO_CORTO_MS <= 15_000, String(S.PLAZO_CORTO_MS));
const conLimite = S.crearFilmmakerService(colgada, { plazoCortoMs: 60 });
const rc = await carrera(conLimite.createProduction({ productionId: 'abcdefghijklmnopqrstuvwx', title: 'x' }), 1500);
check('A1) createProduction sin respuesta termina con fallo sin_conexion, reintentable (no se cuelga)', rc !== 'COLGADA' && rc.ok === false && rc.fallo.tipo === 'sin_conexion' && rc.fallo.reintentable === true, JSON.stringify(rc).slice(0, 120));
const rl = await carrera(conLimite.listProductions({ status: 'active' }), 1500);
check('A2) listProductions sin respuesta termina con el mismo fallo (el estado «error» de la lista, con Reintentar)', rl !== 'COLGADA' && rl.ok === false && rl.fallo.tipo === 'sin_conexion', JSON.stringify(rl).slice(0, 120));
const ra = await carrera(conLimite.applyProductionOperations({ productionId: 'abcdefghijklmnopqrstuvwx', expectedRevision: 0, operations: [], operationId: 'op' }), 400);
check('A3) el resto de operaciones conserva su espera larga: `apply` no se corta con el plazo corto', ra === 'COLGADA');
const sabotaje = S.crearFilmmakerService(colgada, { plazoCortoMs: 10_000_000 });
const rs = await carrera(sabotaje.createProduction({ productionId: 'abcdefghijklmnopqrstuvwx', title: 'x' }), 300);
check('A4) SABOTAJE: con el límite quitado (plazo enorme), crear SÍ se queda colgado: la prueba A1 muerde', rs === 'COLGADA');
const rapida = S.crearFilmmakerService(async () => { throw Object.assign(new Error('x'), { code: 'functions/unavailable' }); }, { plazoCortoMs: 60 });
const rr = await rapida.createProduction({ productionId: 'abcdefghijklmnopqrstuvwx', title: 'x' });
check('A5) un fallo rápido sigue siendo el suyo (sin_conexion), no el del plazo', rr.ok === false && rr.fallo.tipo === 'sin_conexion');
const src = sinComentarios(leer('services/filmmakerService.ts'));
check('A6) el contrato no cambió: createProduction y listProductions mandan lo de siempre; solo cambia a quién se espera', /op: 'create'/.test(src) && /op: 'list'/.test(src) && src.includes('llamarConLimite(limpio({'));

/* ═══ B · LA PANTALLA ═══ */
console.log('\n── B · La pantalla ──');
const K = sinComentarios(leer('constants/filmmakerCrear.ts'));
const P = sinComentarios(leer('screens/FilmmakerCrearScreen.tsx'));
const HA = sinComentarios(leer('components/filmmaker/HojaDeAdjuntos.tsx'));
const cuatro = (id) => new RegExp(`id: '${id}'[^}]*estado: '(\\w+)'`).exec(K)?.[1];
check('B1) tipos: Cortometraje y Anuncio habilitados, Película plantilla, Serie y Videoclip cerrados', cuatro('short') === 'habilitada' && cuatro('ad') === 'habilitada' && cuatro('film') === 'plantilla' && cuatro('series') === 'cerrada' && cuatro('clip') === 'cerrada');
check('B2) solo `ad` aporta el preset del contrato (`ads`, 4:5 y 15 s); el tipo NO viaja al servidor (no hay productionType en la operación)', /id: 'ad'[^}]*formato: '4:5', segundos: 15, preset: 'ads'/.test(K) && !/productionType/.test(P + sinComentarios(leer('services/filmmakerService.ts'))) && P.includes("...(idea.tipo === 'ad' ? { preset: 'ads' as const } : {})"));
check('B3) Serie y Videoclip llevan su motivo y no se pueden seleccionar (tocar solo lo anuncia)', /id: 'series'[^}]*claveMotivo: 'filmmaker\.hubTypeSeriesWhy'/.test(K) && /id: 'clip'[^}]*claveMotivo: 'filmmaker\.hubTypeClipWhy'/.test(K) && P.includes('abierta ? () => entrarAlTaller(x.id) : cerrado(x.claveMotivo as string)'));
const KI = sinComentarios(leer('constants/filmmakerIdea.ts'));
check('B4) el «+» ABRE la hoja de adjuntos (ya no es un botón apagado) y lo que no tiene capacidad detrás va CERRADO con su motivo dentro de ella: Documento, Imagen de referencia y Audio (cerrado = , con la clave del motivo visible y en la etiqueta); la caja no lleva botones muertos', P.includes('alPulsar: () => setAdjuntos(true)') && !/deshabilitada: true/.test(P) && /id: 'document'[^}]*cerrado: true, claveMotivo: 'filmmaker.attachDocumentClosed'/.test(KI) && /id: 'image'[^}]*cerrado: true, claveMotivo: 'filmmaker.hubClosedContract'/.test(KI) && /id: 'audio'[^}]*cerrado: true, claveMotivo: 'filmmaker.hubAudioClosed'/.test(KI) && /id: 'paste'[^}]*cerrado: false/.test(KI) && HA.includes('disabled={a.cerrado}') && HA.includes('t(a.claveMotivo)') && HA.includes('accessibilityState={{ disabled: a.cerrado }}'));
check('B5) «Empezar con»: Referencias y Plantilla cerradas con su motivo; Idea y Guion se pueden marcar', /id: 'refs', clave: 'filmmaker\.hubStartRefs', cerrada: true, claveMotivo: 'filmmaker\.hubRefsClosed'/.test(K) && /id: 'template'[^}]*cerrada: true, claveMotivo: 'filmmaker\.hubTemplateClosed'/.test(K) && /id: 'idea'[^}]*cerrada: false/.test(K));
check('B6) chip «Weë Brain» por UNA constante, recomendada B (apagado), y la pantalla lee la constante en un solo punto', /export const CHIP_DE_MARCA_EN_COMPOSER = false;/.test(K) && (P.match(/CHIP_DE_MARCA_EN_COMPOSER \?/g) || []).length === 1);
const conChip = P.replace(/CHIP_DE_MARCA_EN_COMPOSER \?/, 'true ?'); const sinChip = P;
check('B6b) las dos variantes existen en el código: con la constante a `true` el chip se pinta; a `false` no', /true \? <View style=\{styles\.pildora\}>[\s\S]*hubBrain/.test(conChip) && /CHIP_DE_MARCA_EN_COMPOSER \? <View style=\{styles\.pildora\}>[\s\S]*hubBrain/.test(sinChip));
check('B7) la acción: la operación existente con id idempotente, y abre `Production`; sin sesión va a Login; no calcula ni cobra nada', P.includes('crearProduccion({ productionId: idDeProduccion.current') && P.includes('nuevoIdDeProduccion()') && P.includes("navigation.navigate('Production', { productionId") && P.includes("navigation.navigate('Login')") && !/spendCredits|creditsService|balance [-+*]|balance\s*=\s/.test(P));
check('B8) el error de crear no se cuelga: estado con mensaje y «Reintentar» (mismo id), y la lista hereda el límite por el servicio', sinComentarios(leer('components/filmmaker/TallerDeIdea.tsx')).includes("t('filmmaker.hubCreateError')") && sinComentarios(leer('components/filmmaker/TallerDeIdea.tsx')).includes("t('filmmaker.hubRetry')") && P.includes('idDeProduccion.current') && leer('hooks/useProducciones.ts').includes('filmmakerService.listProductions'));
check('B9) pantalla fija en «Crear» (prop fija); el desplazamiento vertical es solo el ÚLTIMO recurso (conScroll, cuando ni con filas de 76 dp cabe la sección); NO hay pestañas «Crear/Producciones» (la carpeta abre HojaDeTrabajo con «Mis producciones» y «Mis creaciones»); la caja es la común (CajaDePrompt portada + CajaAnclada)',
  P.includes('fija') && P.includes('<CajaAnclada alto={topeDeLaCaja}>') && P.includes('enviarDiscreto={enTaller}') && P.includes('<CajaDePrompt portada') && P.includes('const conScroll = altoMundo > 0 && altoMundo < tituloDeSeccion + 3 * 64 + 20 + HOLGURA') && P.includes('conScroll ? <ScrollView') && P.indexOf('styles.mundo') < P.indexOf('<CajaAnclada alto={topeDeLaCaja}>') && !/pestana|hubTab/.test(P) && P.includes('<HojaDeTrabajo') && P.includes("navigate('MisCreaciones')") && fs.readFileSync(path.resolve(RAIZ, 'components/filmmaker/HojaDeTrabajo.tsx'), 'utf8').includes('<ProductionList') && P.includes("useProducciones('active'") && P.includes('hubContinue'));
check('B10) la ruta existe con el diff mínimo y el módulo de la portada navega a ella (no a Production); TabNavigator y la barra inferior no se tocan',
  leer('navigation/MainStackNavigator.tsx').includes('<Stack.Screen name="Filmmaker" component={FilmmakerCrearScreen} />') && leer('App.tsx').includes("Filmmaker: { path: 'weeai/filmmaker'") && leer('navigation/NavegacionGlobal.tsx').includes("Filmmaker: 'WeeAI'")
  && leer('components/weeai/PortadaWeeAi.tsx').includes("navigation.navigate('Filmmaker')") && !leer('components/weeai/PortadaWeeAi.tsx').includes("navigate('Production')"));
check('B11) contraste corregido del diseño: el borde iluminado es #5F6878', /bordeLuz: '#5F6878'/.test(leer('constants/estiloWeeAi.ts')));
check('B12) textos con clave, no escritos a mano (todo lo visible sale de t(...)); la marca Filmmaker sale de su clave de marca', !/>\s*[A-ZÁÉÍÓÚ][a-záéíóú]{3,}[^<{]*</.test(P.replace(/<Text[^>]*>\{[^}]*\}<\/Text>/g, '')) && P.includes("t('weeai.portadaFilmmaker')"));

/* ═══ C · LA SECCIÓN «ELIGE EL TIPO DE PROYECTO» (referencia del dueño, ronda 6) ═══ */
console.log('\n── C · Elige el tipo de proyecto ──');
const T = sinComentarios(leer('components/filmmaker/TarjetaDeTipo.tsx'));
const es = leer('i18n/textos/es/filmmaker.ts');
const val = (k) => new RegExp("^  " + k + ": '([^']*)'", 'm').exec(es)?.[1];
check('C1) textos EXACTOS de la imagen, por clave: título, pregunta y las cinco frases', val('hubTypeSection') === 'Elige el tipo de proyecto' && val('hubTypeSectionHint') === '¿Qué quieres producir hoy?' && val('hubTypeFilmSub') === 'Largometraje cinematográfico' && val('hubTypeShortSub') === 'Historia de corta duración' && val('hubTypeSeriesSub') === 'Temporadas y episodios' && val('hubTypeClipSub') === 'Video musical y propuesta visual' && val('hubTypeAdSub') === 'Publicidad y contenido comercial');
check('C2) iconos de la imagen: película y cortometraje claqueta, serie capas, videoclip nota musical, anuncio megáfono (trazo nuevo)', /film: 'claqueta', short: 'claqueta', series: 'capas', clip: 'notas', ad: 'megafono'/.test(K) && /megafono:/.test(leer('components/icons/trazosDeWee.ts')));
check('C3) rejilla 2+2+1: las cuatro de media anchura (2:1) y Anuncio a ancho completo (4:1), esquinas de 24 y borde blanco luminoso con halo (anillo extra)', P.includes('i === 4 ? anchoDeFila : anchoMedia') && P.includes('Math.floor(anchoMedia / 1.5)') && T.includes('borderRadius: 24') && T.includes('rgba(250,251,255,0.95)') && T.includes('styles.halo'));
check('C4) las imágenes salen de assets/images/filmmaker/tipos/<tipo>.webp con un mapa estático; mientras el archivo sea el marcador de 1 px se ve el fondo propio (degradado + textura), y añadir el archivo real es lo único necesario',
  ['pelicula', 'cortometraje', 'serie', 'videoclip', 'anuncio'].every((n) => K.includes("assets/images/filmmaker/tipos/" + n + ".webp") && fs.existsSync(path.resolve(RAIZ, 'assets/images/filmmaker/tipos/' + n + '.webp'))) && T.includes('ANCHO_MINIMO_DE_LA_REAL') && T.includes("contentFit=\"cover\"") && T.includes('contentPosition="right"') && T.includes('uriDeTextura(TEXTURA_DE_TIPO[tipo.id]'));
check('C5) degradado oscuro del lado del texto (≈55 %) que se invierte en RTL, y el texto a ese lado', T.includes('locations={[0, 0.55, 1]}') && T.includes('x: rtl ? 1 : 0') && T.includes("alignItems: rtl ? 'flex-end' : 'flex-start'"));
check('C6) cerradas SIN etiqueta permanente: imagen atenuada, tocarlas muestra el aviso breve («llegará pronto», i18n), seleccionable solo lo abierto, con rol botón, estado «no disponible todavía» y motivo anunciable; ni «Plantilla» ni «Próximamente» ni candado pintados en la tarjeta', T.includes('abierta ? 1 : 0.4') && !/styles\.pronto|styles\.insignia|hubBadgeTemplate|lock-closed|common\.comingSoon/.test(T) && T.includes("t('filmmaker.hubNotYet')") && T.includes('accessibilityState={{ selected: elegido, disabled: !abierta }}') && T.includes('t(tipo.claveMotivo as string)') && T.includes('hitSlop') && P.includes('cerrado(x.claveMotivo as string)') && /hubTypeSeriesWhy: 'Serie llegará pronto/.test(fs.readFileSync(path.resolve(RAIZ, 'i18n/textos/es/filmmaker.ts'), 'utf8')));

check('C7) RTL: la imagen se ESPEJA (scaleX -1) para que su zona nítida quede a la izquierda del texto árabe, el degradado oscuro se invierte (x: rtl ? 1 : 0) y oscurece solo el lado del texto; la marca de elegido va a la esquina contraria al texto',
  T.includes("espejo: { transform: [{ scaleX: -1 }] }") && T.includes("rtl && styles.espejo") && T.includes("x: rtl ? 1 : 0") && T.includes("x: rtl ? 0 : 1") && !T.includes("contentPosition={rtl") && T.split("rtl ? { start: 10 } : { end: 10 }").length - 1 >= 1);
check('C9) la píldora «formato · duración · Auto» ya NO se ve sobre la caja (constante PILDORA_DE_FORMATO_VISIBLE = false) pero la lógica se guarda: con true volvería a pintarse y el alto reservado la cuenta', K.includes('PILDORA_DE_FORMATO_VISIBLE = false') && P.includes('PILDORA_DE_FORMATO_VISIBLE && alto >= 700 ? <View') && P.indexOf('PILDORA_DE_FORMATO_VISIBLE && alto >= 700 ? <View') > P.indexOf('styles.abajo'));
check('C8) la píldora aísla la relación de aspecto (9:16 es notación, siempre latina y en su orden) con marcas bidi y la duración usa los dígitos del idioma (formato.numero)',
  P.includes("'\u2066'") && P.includes("'\u2069'") && P.includes('formato.numero(pildora.segundos)'));

/* ═══ D · SIN CARRUSEL: la rejilla 2+2+1 en TODAS las alturas, con las imágenes de la referencia del dueño (ronda 8) ═══ */
console.log('\n── D · Sin carrusel ──');
check('D1) no hay carrusel horizontal en la sección de tipos: la rejilla 2+2+1 es la única forma, a cualquier altura (ni «horizontal» ni «carrusel» en la pantalla ni en las constantes)', !/<ScrollView horizontal|showsHorizontalScrollIndicator|carrusel/i.test(P + K) && P.includes('styles.rejilla') && !/rejilla: 800|verRejilla/.test(P + K));
check('D2) las filas son proporcionales a la altura (mínimo 64 dp, 76 con scroll) y las dos de media anchura nunca pasan de 2:1', P.includes('Math.max(64, Math.min(Math.floor(anchoMedia / 1.5)') && P.includes('conScroll ? 76'));
const peso = (n) => fs.statSync(path.resolve(RAIZ, 'assets/images/filmmaker/tipos/' + n + '.webp')).size;
check('D3) las cinco imágenes son las reales (recortes de la referencia del dueño, ya no el marcador de 1 px) y pesan ≤ 250 KB', ['pelicula', 'cortometraje', 'serie', 'videoclip', 'anuncio'].every((n) => peso(n) > 4000 && peso(n) <= 250 * 1024), ['pelicula', 'cortometraje', 'serie', 'videoclip', 'anuncio'].map((n) => n + ':' + Math.round(peso(n) / 1024) + 'KB').join(' '));

/* ═══ E · EL TALLER DE IDEA (ola 1 de la experiencia, 2026-11-17) ═══ */
console.log('\n── E · El taller de Idea ──');
const cargarIdea = crearCargador({ dobles: {} });
const U = cargarIdea('utils/ideaDeFilmmaker.ts');
const KI2 = cargarIdea('constants/filmmakerIdea.ts');
check('E1) cada tipo con taller arranca con su duración (corto 60 s, película 120 s, anuncio 15 s) y el anuncio con formato 4:5; Serie y Videoclip no tienen taller', U.ideaVacia('short').valores.duration === '60' && U.ideaVacia('film').valores.duration === '120' && U.ideaVacia('ad').valores.duration === '15' && U.ideaVacia('ad').valores.format === '4:5' && !U.esTipoConTaller('series') && !U.esTipoConTaller('clip') && U.esTipoConTaller('ad'));
const conFrase = (n, tipo = 'short') => U.poner(U.ideaVacia(tipo), 'idea', 'x'.repeat(n));
check('E2) «lista» = hay frase de 12 o más caracteres y duración: 11 no basta, 12 sí, un guion pegado también (el umbral muerde por los dos lados)', !U.estaLista(U.ideaVacia('short')) && !U.estaLista(conFrase(11)) && U.estaLista(conFrase(12)) && U.estaLista(U.poner(U.ideaVacia('film'), 'script', 'Escena uno. Lía espera.')) && U.queFalta(conFrase(11)) === 'idea' && U.queFalta(conFrase(12)) === null);
let g = U.ideaVacia('short');
const pasos = KI2.PASOS_GUIADOS.short.map((p) => p.campo);
check('E3) el modo Guiado arranca por la SENSACIÓN (5 opciones), luego mundo, protagonista y «¿algo más?» (por texto, con Saltar); el anuncio pregunta sensación, escenario y producto', pasos.join() === 'sensation,genre,protagonist,more' && U.pasoActual(g).campo === 'sensation' && U.pasoActual(g).opciones.length === 5 && KI2.PASOS_GUIADOS.ad.map((p) => p.campo).join() === 'sensation,scene,product' && U.pasoActual(g).clase === 'choice');
g = U.contestarPaso(g, { valor: 'intrigue' });
g = U.contestarPaso(g, 'no-se');
check('E4) contestar avanza y guarda; «No sé» NO inventa un valor: el campo queda «por decidir» y cuenta como respondido', g.valores.sensation === 'intrigue' && g.valores.genre === undefined && g.porDecidir.genre === true && g.paso === 2 && U.contestados(g).hechos === 3);
g = U.contestarPaso(g, 'saltar');
g = U.contestarPaso(g, { valor: 'Un tren que no llega' });
check('E5) Saltar no escribe nada; la respuesta de «¿algo más?» se suma a la frase; al acabar ya no hay pregunta y se puede volver atrás sin perder lo contestado', g.valores.protagonist === undefined && g.valores.idea === 'Un tren que no llega' && U.pasoActual(g) === null && U.retrocederPaso(g).paso === 3 && U.retrocederPaso(g).valores.sensation === 'intrigue');
const adIdea = U.poner(U.ideaVacia('ad'), 'product', 'Zapatillas Aire');
const aFilm = U.cambiarDeTipo(U.poner(U.poner(U.ideaVacia('ad'), 'title', 'Mi pieza'), 'idea', 'Una frase de la idea'), 'film');
check('E6) cambiar de tipo conserva lo que sirve (título, frase) y repone la duración y el formato del tipo nuevo; el producto del anuncio no viaja a un tipo que no lo tiene', aFilm.tipo === 'film' && aFilm.valores.title === 'Mi pieza' && aFilm.valores.idea === 'Una frase de la idea' && aFilm.valores.duration === '120' && aFilm.valores.format === undefined && U.cambiarDeTipo(adIdea, 'short').valores.product === undefined);
check('E7) la estructura sale de la plantilla del tipo y los planos son una ESTIMACIÓN: máx(beats, duración/6) hacia arriba (corto 60 s → 10, película 120 s → 20, anuncio 15 s → 3)', U.estructuraDe(U.ideaVacia('short')).planos === 10 && U.estructuraDe(U.ideaVacia('film')).planos === 20 && U.estructuraDe(U.ideaVacia('ad')).planos === 3 && U.estructuraDe(U.ideaVacia('film')).beats.length === 3 && U.estructuraDe(U.poner(U.ideaVacia('short'), 'duration', '12')).planos === 3);
check('E8) los topes se respetan (frase 600, guion 12 000, título 80) y el título sale del escrito o de la primera línea de la frase', Array.from(conFrase(900).valores.idea).length === 600 && Array.from(U.poner(U.ideaVacia('short'), 'script', 'y'.repeat(13000)).valores.script).length === 12000 && Array.from(U.poner(U.ideaVacia('short'), 'title', 'z'.repeat(120)).valores.title).length === 80 && U.tituloDeLaIdea(U.poner(U.ideaVacia('short'), 'title', ' Mi título '), (f) => 'derivado:' + f) === 'Mi título' && U.tituloDeLaIdea(conFrase(14), (f) => 'derivado:' + f.slice(0, 3)) === 'derivado:xxx');
const KT = sinComentarios(leer('constants/filmmakerIdea.ts'));
const TA = sinComentarios(leer('components/filmmaker/TallerDeIdea.tsx'));
const TU = sinComentarios(leer('components/filmmaker/TarjetaTuIdea.tsx'));
const UT = sinComentarios(leer('utils/ideaDeFilmmaker.ts'));
check('E9) NADA SIMULADO: el copiloto y Reparto son constantes cerradas, el taller no importa ninguna llamada a IA (Brain, creator, callables) y la fila «Weë propone» sale CERRADA con su motivo (D5)', /export const COPILOTO_DEL_TALLER_ABIERTO = false;/.test(KT) && /export const REPARTO_ABIERTO = false;/.test(KT) && ![TA, TU, UT, P, HA].some((src) => /brainService|useBrainChat|creatorService|httpsCallable|brainChat|spendCredits/.test(src)) && TA.includes('!COPILOTO_DEL_TALLER_ABIERTO') && TA.includes("t('filmmaker.ideaCopilotClosed')") && TA.includes('accessibilityState={{ disabled: true }}'));
check('E10) «Empezar con»: Idea y Guion abiertos; Libro y Visuales CERRADOS con su motivo (tocarlos lo dice, se anuncian como no disponibles)', /id: 'book'[^}]*cerrada: true, claveMotivo: 'filmmaker\.ideaBookClosed'/.test(KT) && /id: 'visuals'[^}]*cerrada: true, claveMotivo: 'filmmaker\.ideaVisualsClosed'/.test(KT) && /id: 'idea'[^}]*cerrada: false/.test(KT) && /id: 'script'[^}]*cerrada: false/.test(KT) && TA.includes('onPress={e.cerrada ? () => onAviso(e.claveMotivo) : () => onEmpezarCon(e.id)}') && TA.includes('accessibilityState={{ selected: sel, disabled: e.cerrada }}'));
check('E11) UN SOLO botón blanco: «Continuar a Reparto» (apagado con motivo visible y anunciable hasta que hay idea) y la flecha de la caja pasa a contorno dentro del taller; la caja es UNA instancia, anclada debajo del mundo', TA.includes('disabled={!lista || creando}') && TA.includes("t('filmmaker.ideaContinueWhy')") && TA.includes('accessibilityLiveRegion="polite"') && (P.match(/<CajaDePrompt\b/g) || []).length === 1 && P.includes('enviarDiscreto={enTaller}') && sinComentarios(leer('components/creator/CajaDePrompt.tsx')).includes('enviarDiscreto'));
check('E12) «Continuar» usa la operación de siempre (id idempotente, preset `ads` solo en anuncio), sin sesión va a Login, y mientras REPARTO_ABIERTO sea false lo dice en la pantalla', P.includes('crearProduccion({ productionId: idDeProduccion.current') && P.includes("navigation.navigate('Login')") && TA.includes('!REPARTO_ABIERTO') && TA.includes("t('filmmaker.ideaContinueNote')"));
check('E13) «+»: «Pegar texto» abierto con tope de 12 000 y contador; es un Modal propio (la caja nunca pierde sus botones ni se abre otra pantalla para escribir)', HA.includes('maxLength={TOPES.guion}') && HA.includes('filmmaker.attachPasteCount') && HA.includes('<Modal') && /guion: 12000/.test(KT));
check('E14) accesibilidad del taller: objetivos ≥ 44 (minHeight 44 en chips, modos, enlaces), nombres en los controles, estado seleccionado anunciado; el saludo se retira en pantalla corta pero el motivo del botón apagado se queda', (TA.match(/minHeight: 44/g) || []).length >= 4 && (TA.match(/accessibilityLabel=/g) || []).length >= 8 && TA.includes('accessibilityState={{ selected: sel }}') && TA.includes('!compacto ? burbuja(t(CLAVE_DE_SALUDO'));

const ES2 = leer('i18n/textos/es/filmmaker.ts'); const EN2 = leer('i18n/textos/en/filmmaker.ts');
const v2 = (src, k) => new RegExp('^  ' + k + ": '([^']*)'", 'm').exec(src)?.[1];
check('E15) los modos se llaman «Paso a paso» (Weë te pregunta) y «Libre» (Tú escribes), con claves i18n y en los dos idiomas completos; «Guiado/Directo» ya no se leen', v2(ES2, 'ideaModeGuided') === 'Paso a paso' && v2(ES2, 'ideaModeDirect') === 'Libre' && v2(ES2, 'ideaModeGuidedHint') === 'Weë te pregunta' && v2(ES2, 'ideaModeDirectHint') === 'Tú escribes' && v2(EN2, 'ideaModeGuided') === 'Step by step' && v2(EN2, 'ideaModeDirect') === 'Free' && TA.includes("'filmmaker.ideaModeGuidedHint'") && TA.includes('{!compacto ? <Text style={[textoPortada(12'));
check('E16) la burbuja de la persona se ajusta al contenido: sin altura fija, saltos de línea plegados a espacios, recorte a cuatro líneas con «Ver más/Ver menos» (clave i18n) y no es un TextInput', TA.includes('BurbujaDeLaPersona') && TA.includes('replace(/\\s+/g, \' \')') && TA.includes('numberOfLines={abierta ? undefined : 4}') && TA.includes("t(abierta ? 'filmmaker.ideaSeeLess' : 'filmmaker.ideaSeeMore')") && !/TextInput/.test(TA) && !/burbuja: {[^}]*height:/.test(TA) && v2(ES2, 'ideaSeeMore') === 'Ver más');
check('E17) con teclado (o poca altura útil) «Empezar con» se pliega y el interruptor queda en una fila; el hilo se coloca en la pregunta para que las opciones se vean enteras', P.includes('plegado={alto < 600}') && TA.includes('!plegado ? <View') && TA.includes('yPregunta.current') && TA.includes('onLayout={marcarPregunta}'));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
