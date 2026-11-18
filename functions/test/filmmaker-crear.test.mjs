/*
 * LA PRIMERA CAPA DE WEË FILMMAKER — «Crear» (2026-11-17): lo que se promete.
 *   node test/filmmaker-crear.test.mjs
 *
 *   A · El TIEMPO LÍMITE: crear una producción y leer la lista no se quedan girando sin Functions (fallo `sin_conexion`, reintentable);
 *       el resto de operaciones conserva su espera larga; y un servicio SIN el límite sí se queda colgado (el control del sabotaje).
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
const cuatro = (id) => new RegExp(`id: '${id}'[^}]*estado: '(\\w+)'`).exec(K)?.[1];
check('B1) tipos: Cortometraje y Anuncio habilitados, Película plantilla, Serie y Videoclip cerrados', cuatro('short') === 'habilitada' && cuatro('ad') === 'habilitada' && cuatro('film') === 'plantilla' && cuatro('series') === 'cerrada' && cuatro('clip') === 'cerrada');
check('B2) solo `ad` aporta el preset del contrato (`ads`, 4:5 y 15 s); el tipo NO viaja al servidor (no hay productionType en la operación)', /id: 'ad'[^}]*formato: '4:5', segundos: 15, preset: 'ads'/.test(K) && !/productionType/.test(P + sinComentarios(leer('services/filmmakerService.ts'))) && P.includes('...(tipo?.preset ? { preset: tipo.preset } : {})'));
check('B3) Serie y Videoclip llevan su motivo y no se pueden seleccionar (tocar solo lo anuncia)', /id: 'series'[^}]*claveMotivo: 'filmmaker\.hubTypeSeriesWhy'/.test(K) && /id: 'clip'[^}]*claveMotivo: 'filmmaker\.hubTypeClipWhy'/.test(K) && P.includes('abierta ? () => { setTipoId') && P.includes(': cerrado(x.claveMotivo as string)'));
check('B4) controles cerrados CON motivo anunciable: «+», imagen, vídeo y audio van `deshabilitada: true` con la clave del motivo en su etiqueta', (P.match(/deshabilitada: true/g) || []).length === 4 && ['hubRefsClosed', 'hubClosedContract', 'hubAudioClosed'].every((k) => P.includes('filmmaker.' + k)));
check('B5) «Empezar con»: Referencias y Plantilla cerradas con su motivo; Idea y Guion se pueden marcar', /id: 'refs', clave: 'filmmaker\.hubStartRefs', cerrada: true, claveMotivo: 'filmmaker\.hubRefsClosed'/.test(K) && /id: 'template'[^}]*cerrada: true, claveMotivo: 'filmmaker\.hubTemplateClosed'/.test(K) && /id: 'idea'[^}]*cerrada: false/.test(K));
check('B6) chip «Weë Brain» por UNA constante, recomendada B (apagado), y la pantalla lee la constante en un solo punto', /export const CHIP_DE_MARCA_EN_COMPOSER = false;/.test(K) && (P.match(/CHIP_DE_MARCA_EN_COMPOSER \?/g) || []).length === 1);
const conChip = P.replace(/CHIP_DE_MARCA_EN_COMPOSER \?/, 'true ?'); const sinChip = P;
check('B6b) las dos variantes existen en el código: con la constante a `true` el chip se pinta; a `false` no', /true \? <View style=\{styles\.pildora\}>[\s\S]*hubBrain/.test(conChip) && /CHIP_DE_MARCA_EN_COMPOSER \? <View style=\{styles\.pildora\}>[\s\S]*hubBrain/.test(sinChip));
check('B7) la acción: la operación existente con id idempotente, y abre `Production`; sin sesión va a Login; no calcula ni cobra nada', P.includes('crearProduccion({ productionId: idDeProduccion.current') && P.includes('nuevoIdDeProduccion()') && P.includes("navigation.navigate('Production', { productionId") && P.includes("navigation.navigate('Login')") && !/spendCredits|creditsService|balance [-+*]|balance\s*=\s/.test(P));
check('B8) el error de crear no se cuelga: estado con mensaje y «Reintentar» (mismo id), y la lista hereda el límite por el servicio', P.includes("t('filmmaker.hubCreateError')") && P.includes("t('filmmaker.hubRetry')") && leer('hooks/useProducciones.ts').includes('filmmakerService.listProductions'));
check('B9) pantalla fija en «Crear» (prop fija); el desplazamiento vertical es solo el ÚLTIMO recurso (conScroll, cuando ni con filas de 76 dp cabe la sección); NO hay pestañas «Crear/Producciones» (la carpeta abre HojaDeTrabajo con «Mis producciones» y «Mis creaciones»); la caja es la común (CajaDePrompt portada + CajaAnclada)',
  P.includes('fija') && P.includes('<CajaAnclada alto={topeDeLaCaja}>') && P.includes('<CajaDePrompt portada') && P.includes('const conScroll = alto < fijo + 112 + 3 * 76 + 20') && P.includes('conScroll ? <ScrollView') && !/pestana|hubTab/.test(P) && P.includes('<HojaDeTrabajo') && P.includes("navigate('MisCreaciones')") && fs.readFileSync(path.resolve(RAIZ, 'components/filmmaker/HojaDeTrabajo.tsx'), 'utf8').includes('<ProductionList') && P.includes("useProducciones('active'") && P.includes('hubContinue'));
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
check('C9) la píldora «formato · duración · Auto» ya NO se ve sobre la caja (constante PILDORA_DE_FORMATO_VISIBLE = false) pero la lógica se guarda: con true volvería a pintarse y el alto reservado la cuenta', K.includes('PILDORA_DE_FORMATO_VISIBLE = false') && P.includes('PILDORA_DE_FORMATO_VISIBLE && alto >= 700') && P.includes('verPildora ? <View') && P.includes('verPildora ? 38 : 0'));
check('C8) la píldora aísla la relación de aspecto (9:16 es notación, siempre latina y en su orden) con marcas bidi y la duración usa los dígitos del idioma (formato.numero)',
  P.includes("'\u2066'") && P.includes("'\u2069'") && P.includes('formato.numero(pildora.segundos)'));

/* ═══ D · SIN CARRUSEL: la rejilla 2+2+1 en TODAS las alturas, con las imágenes de la referencia del dueño (ronda 8) ═══ */
console.log('\n── D · Sin carrusel ──');
check('D1) no hay carrusel horizontal en la sección de tipos: la rejilla 2+2+1 es la única forma, a cualquier altura (ni «horizontal» ni «carrusel» en la pantalla ni en las constantes)', !/<ScrollView horizontal|showsHorizontalScrollIndicator|carrusel/i.test(P + K) && P.includes('styles.rejilla') && !/rejilla: 800|verRejilla/.test(P + K));
check('D2) las filas son proporcionales a la altura (mínimo 76 dp, 80 con scroll) y las dos de media anchura nunca pasan de 2:1', P.includes('Math.max(76, Math.min(Math.floor(anchoMedia / 1.5)') && P.includes('conScroll ? 80'));
const peso = (n) => fs.statSync(path.resolve(RAIZ, 'assets/images/filmmaker/tipos/' + n + '.webp')).size;
check('D3) las cinco imágenes son las reales (recortes de la referencia del dueño, ya no el marcador de 1 px) y pesan ≤ 250 KB', ['pelicula', 'cortometraje', 'serie', 'videoclip', 'anuncio'].every((n) => peso(n) > 4000 && peso(n) <= 250 * 1024), ['pelicula', 'cortometraje', 'serie', 'videoclip', 'anuncio'].map((n) => n + ':' + Math.round(peso(n) / 1024) + 'KB').join(' '));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
