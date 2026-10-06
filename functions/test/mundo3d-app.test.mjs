/**
 * WEË STUDIO → 3D WORLD → CREAR MUNDO 3D, EN LA APP — del Studio a «Mis creaciones» (misión mundo3d, FASES 6–10 y 13).
 *
 *   A · El camino: una entrada de Explorar, una experiencia y su puerta (cerrada); el Studio sigue siendo una puerta.
 *   B · La pantalla: sin otra caja, sin llamar a nada con la puerta cerrada, toda la lógica del compositor.
 *   C · El servicio: la única voz de la app ante `generateWorld`, y escucha la reserva que ya existe.
 *   D · «Mis creaciones» y la tarjeta 3D: un mundo es un mundo, no una foto; sin visor de mentira.
 *   E · Los derechos: lo que se puede hacer con él, sin nombrar la licencia.
 *   F · Descargar: con la extensión que el material declara, nunca una inventada.
 *   G · Los textos: claves en los dieciséis diccionarios, con sus huecos y sus marcas.
 *   H · FASE 13: ninguna pantalla, servicio, catálogo ni texto de la app nombra un proveedor, un modelo o algo de dentro.
 *
 * Sin red y sin Firebase (doblado): se leen y se cargan las fuentes. $0.
 */
import { crearCargador, leer, sinComentarios, archivosDeLaApp } from './filmmaker-cliente.mjs';

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const seccion = (letra, fn) => {
  try { fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' · ')); }
};
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const nada = () => { throw new Error('no se llama a nada'); };
const cargar = crearCargador({
  dobles: {
    'react-native': { Platform: { OS: 'web', select: (o) => o.web ?? o.default }, Linking: { openURL: nada } },
    'expo-file-system/legacy': new Proxy({}, { get: () => nada }),
    'expo-media-library': new Proxy({}, { get: () => nada }),
    'expo-sharing': new Proxy({}, { get: () => nada }),
  },
});

const E = cargar('constants/studioExperiences.ts');
const D = cargar('utils/derechosDelMaterial.ts');
const N3D = cargar('services/escena3d.ts');
const VISTA = cargar('services/vistaDeAsset.ts');
const DESCARGA = cargar('services/assetDownload.ts');

/* ═══ A · EL CAMINO ════════════════════════════════════════════════════════ */
console.log('\n── A · Weë Studio → 3D World → Crear mundo 3D ──');
seccion('A', () => {
  const puerta = E.ENTRADAS_DE_EXPLORAR.find((x) => x.id === 'world3d');
  check('A1) 3D World es una entrada de Explorar (en pequeño, como Beauty o Fashion): su nombre, su pista y su icono, sin ser una quinta principal',
    !!puerta && puerta.clave === 'studio.world3dTitle' && puerta.claveHint === 'studio.world3dHint' && puerta.icono === 'planet-outline'
    && E.ENTRADAS_PRINCIPALES.length === 4 && !E.ENTRADAS_PRINCIPALES.some((x) => x.id === 'world3d'));
  const xs = E.EXPERIENCIAS_POR_ENTRADA.world3d ?? [];
  check('A2) dentro, UNA experiencia: «Crear mundo 3D», que empieza por una foto, sin controles de cámara y que abre su pantalla',
    xs.length === 1 && xs[0].id === 'createWorld' && xs[0].clave === 'studio.xpCreateWorld' && xs[0].pideMaterial === true
    && iguales(xs[0].controles, []) && xs[0].mundo3d === true && !xs[0].produccion && !xs[0].respuestas);
  const cerrada = E.experienciasDeLaEntrada('world3d');
  check('A3) la puerta está CERRADA: se ve, con su motivo, y no abre nada —ni desde el Studio ni por la experiencia—',
    E.MUNDO_3D_EN_LA_APP === false && cerrada.length === 1 && cerrada[0].pendiente === 'studio.pendWorld' && !('mundo3d' in cerrada[0])
    && E.abreElMundo3D('createWorld') === false && E.abreElMundo3D(null) === false);
  const abierta = E.conLaPuertaDelMundo3D(xs, true);
  const otras = ['images', 'videos', 'text', 'voice', 'characters', 'beauty', 'fashion'];
  check('A4) abierta, la experiencia queda tal cual; y la puerta del mundo no toca ninguna otra entrada',
    abierta[0].mundo3d === true && !abierta[0].pendiente
    && otras.every((id) => iguales(E.experienciasDeLaEntrada(id), E.conLaPuertaDeFilmmaker(E.EXPERIENCIAS_POR_ENTRADA[id] ?? []))));
  const studio = sinComentarios(leer('screens/StudioScreen.tsx'));
  check('A5) el Studio la abre SOLO por su puerta, con lo escrito y la foto adjunta, y antes que nada más; nunca llama a la puerta del servidor',
    /if \(abreElMundo3D\(experiencia\?\.id\)\) \{\s*navigation\.navigate\('Mundo3D', \{ descripcion: texto, \.\.\.\(adjuntos\[0\] \? \{ imageUri: adjuntos\[0\]\.uri \} : \{\}\) \}\);\s*return;\s*\}/.test(studio)
    && studio.indexOf('abreElMundo3D(experiencia?.id)') < studio.indexOf('abreLaProduccion(experiencia?.id)') && !/generateWorld|mundoService/.test(studio));
  const pila = leer('navigation/MainStackNavigator.tsx');
  const app = leer('App.tsx');
  check('A6) la pantalla existe en la pila; su enlace, solo con la puerta abierta, y sin las palabras ni la foto en la dirección',
    /<Stack\.Screen name="Mundo3D" component=\{Mundo3DScreen\} \/>/.test(pila) && /Mundo3D: \{ descripcion\?: string; imageUri\?: string \} \| undefined;/.test(pila)
    && /\.\.\.\(MUNDO_3D_EN_LA_APP \? \{ Mundo3D: \{ path: 'studio\/mundo-3d', stringify: \{ imageUri: nuncaEnLaUrl, descripcion: nuncaEnLaUrl \} \} \} : \{\}\)/.test(app));
});

/* ═══ B · LA PANTALLA ══════════════════════════════════════════════════════ */
console.log('\n── B · La pantalla «Crear mundo 3D» ──');
seccion('B', () => {
  const fuente = leer('screens/Mundo3DScreen.tsx');
  const codigo = sinComentarios(fuente);
  check('B1) sin otra caja: lo escrito llega del Studio y se enseña tal cual; aquí no hay campo de texto, ni otro Brain, ni otro router',
    !/<TextInput\b|CajaDePrompt|useCajaQueCrece|brainService|useBrainChat|creatorRun|creatorChat/.test(codigo) && /<CreatorShell\b/.test(codigo));
  const cerrada = codigo.indexOf('if (!MUNDO_3D_EN_LA_APP) {');
  check('B2) con la puerta cerrada no llama a nada: dice que no está disponible, con su motivo; y Crear también lo comprueba',
    cerrada > 0 && /if \(!MUNDO_3D_EN_LA_APP\) \{\s*return \(/.test(codigo) && /t\('studio\.pendWorld'\)/.test(codigo)
    && /if \(!MUNDO_3D_EN_LA_APP \|\| enCamino\.current\) return;/.test(codigo));
  check('B3) toda la lógica es del compositor: la máquina, la petición canónica, los errores y lo que se enseña',
    ['avanzar', 'presentacionDelMundo3D', 'peticionDelMundo3D', 'eventoDelTrabajoDeMundo', 'errorDelMundo3D'].every((f) => new RegExp(`\\b${f}\\(`).test(codigo))
    && !/fase:\s*'/.test(codigo));
  check('B4) UN requestId por intento, al confirmar con el precio a la vista; y si no se sabe cómo acabó, PREGUNTA por esa petición en vez de dar por perdido',
    /const id = pendiente\.current \?\? newRequestId\('mundo3d'\);\s*requestId\.current = id;/.test(codigo) && /mundoService\.crear\(estado\.peticion, id, estado\.creditos\)/.test(codigo)
    && /if \(fallo && !esDesenlaceIncierto\(fallo\)\) \{/.test(codigo) && /if \(\(await preguntar\(id\)\) !== 'sabido'\) despachar\(\{ tipo: 'fallo', error: fallo \?\? sinConexion\(\) \}\);/.test(codigo));
  /* Revisión de código (2026-10-06). */
  check('B4b) tras un error que no dice si la creación llegó, «Reintentar» la pide con el MISMO requestId (dos mundos, dos cobros, nunca); en cuanto la puerta cuenta algo de ella, se suelta',
    /const pendiente = useRef<string \| null>\(null\);/.test(codigo) && /pendiente\.current = id;/.test(codigo)
    && (codigo.match(/if \(pendiente\.current === id\) pendiente\.current = null;/g) || []).length === 2
    && /leerErrorDelServidor\(error\)\.motivo === 'no_existe'/.test(codigo));
  check('B4c) mientras se sube la foto y se pide el precio, ni otra foto ni otro espacio: se cotizaría lo de antes con lo nuevo en pantalla',
    (codigo.match(/=> \{\s*if \(enCamino\.current\) return;/g) || []).length === 2
    && /\{enReposo && !subiendo && \(\s*<TouchableOpacity onPress=\{elegirFoto\}/.test(codigo) && /onPress=\{enReposo && !subiendo \? \(\) => elegirEspacio\(e\.id\) : undefined\}/.test(codigo));
  check('B4d) las palabras que se enseñan son las que VIAJAN (recortadas al límite del contrato), no el texto entero',
    /const palabras = estado\.peticion\?\.descripcion \?\? palabrasQueViajan\(estado\.entrada\);/.test(codigo) && />\{palabras\}<\/Text>/.test(codigo));
  check('B5) mientras el mundo se hace, escucha su reserva y pregunta UNA vez cuando se cierra; no hay sondeo con temporizador',
    /mundoService\.observarReserva\(/.test(codigo) && /CERRADAS\.has\(reserva\)\) void preguntar\(id\)/.test(codigo) && !/setInterval|setTimeout/.test(codigo));
  check('B6) la foto sube a la carpeta de la cuenta con el cargador de siempre; nunca viaja una dirección local',
    /uploadCreatorImage\(cuenta, fotoLocal\)/.test(codigo) && /imagen: \{ tipo: 'storage', url: await uploadCreatorImage/.test(codigo) && !/tipo: 'storage', url: fotoLocal/.test(codigo));
  check('B7) terminado: la tarjeta 3D con el material de la cuenta (nombre, archivo, derechos) y «Mis creaciones»',
    /<TarjetaTresD\b/.test(codigo) && /mundoService\.material\(assetId\)/.test(codigo) && /onVerCreaciones=\{\(\) => navigation\.navigate\('MisCreaciones'\)\}/.test(codigo));
  check('B9) un toque cada vez: dos toques seguidos en Crear o en «Crear por N Credits» no mandan dos peticiones (dos reservas, dos cobros); se sabe antes de cualquier render',
    /const enCamino = useRef\(false\);/.test(codigo)
    && /if \(enCamino\.current \|\| estado\.fase !== 'presupuestado'/.test(codigo)
    && (codigo.match(/enCamino\.current = true;/g) || []).length === 2 && (codigo.match(/finally \{\s*enCamino\.current = false;\s*\}/g) || []).length === 2
    && codigo.indexOf('enCamino.current = true;', codigo.indexOf('const confirmar')) < codigo.indexOf("newRequestId('mundo3d')"));
  check('B8) abierto o cerrado, siempre con «No sé» (que no viaja), y solo mientras se está poniendo',
    /\{ id: null, clave: 'studio\.worldSpaceIdk' \}/.test(codigo) && /onPress=\{enReposo && !subiendo \? \(\) => elegirEspacio\(e\.id\) : undefined\}/.test(codigo));
});

/* ═══ C · EL SERVICIO ══════════════════════════════════════════════════════ */
console.log('\n── C · `services/mundoService.ts`, la única voz ante `generateWorld` ──');
seccion('C', () => {
  const codigo = sinComentarios(leer('services/mundoService.ts'));
  check('C1) cuatro operaciones, todas por la callable `generateWorld`: cotizar, crear (con el precio que se enseñó y su requestId), estado y cancelar',
    /httpsCallable[^(]*\(functions, 'generateWorld'/.test(codigo) && ["op: 'cotizar'", "op: 'crear'", "op: 'estado'", "op: 'cancelar'"].every((s) => codigo.includes(s))
    && /\{ op: 'crear', peticion, requestId, creditosCotizados \}/.test(codigo));
  check('C2) escucha la reserva que ya existe (`creditTransactions/usage_<requestId>`), que las reglas solo dejan leer a su dueño',
    /doc\(db, 'creditTransactions', `usage_\$\{requestId\}`\)/.test(codigo) && /onSnapshot\(/.test(codigo));
  check('C3) y no llama a nadie más: ni direcciones, ni fetch, ni otra callable', !/fetch\(|https?:\/\/|XMLHttpRequest/.test(codigo)
    && [...codigo.matchAll(/httpsCallable[^(]*\(functions, '(\w+)'/g)].every((m) => m[1] === 'generateWorld'));
});

/* ═══ D · MIS CREACIONES Y LA TARJETA 3D ═══════════════════════════════════ */
console.log('\n── D · Un mundo es un mundo, no una foto ──');
seccion('D', () => {
  const union = (src, re) => (src.match(re)?.[1] ?? '').match(/'[a-z0-9]+'/g)?.map((s) => s.slice(1, -1)).sort() ?? [];
  const cliente = union(leer('services/vistaDeAsset.ts'), /export type AssetKind = ([^;]+);/);
  const core = union(leer('functions/src/core/content/asset.ts'), /export type AssetKind = ([^;]+);/);
  check('D1) la app conoce el tipo `world`, el mismo del Core (la lista entera, igual)', cliente.includes('world') && iguales(cliente, core), cliente.join(','));
  check('D2) con su clave, su filtro y su icono propios', VISTA.CLAVE_DE_TIPO.world === 'creaciones.kindWorld'
    && /\{ id: 'world', clave: 'creaciones\.filterWorlds' \}/.test(leer('screens/MisCreacionesScreen.tsx'))
    && /world: 'planet-outline'/.test(leer('components/creator/RejillaDeCreaciones.tsx')));
  check('D3) en la rejilla, un mundo NUNCA se pinta como imagen: solo las imágenes y los vídeos llevan foto',
    /const conImagen = !!url && \(vista\.tipo === 'image' \|\| vista\.tipo === 'video'\);/.test(leer('components/creator/RejillaDeCreaciones.tsx')));
  const pantalla = sinComentarios(leer('screens/MisCreacionesScreen.tsx'));
  const ramaTresD = pantalla.indexOf("if (url && (asset.kind === 'world' || asset.kind === 'model3d')) {");
  check('D4) abrir un mundo: dice que no hay visor 3D, lo que su licencia deja hacer, y ofrece descargarlo (con su tipo); nunca se abre como una página',
    ramaTresD > 0 && ramaTresD < pantalla.indexOf('Linking.openURL(url)') && /void abrirTresD\(asset, asset\.kind, url\);\s*return;/.test(pantalla)
    && /confirmAction\(titulo, \[t\('creaciones\.noViewer3d'\), \.\.\.derechos\]\.join\('\\n'\), t\('creaciones\.download'\), false, t\)/.test(pantalla)
    && /descargarCreacion\(url, tipo, asset\.mimeType\)/.test(pantalla));
  const tarjeta = sinComentarios(leer('components/creator/ResultCard.tsx'));
  check('D5) en un resultado de Weë AI, un mundo o un modelo 3D sale de las imágenes —ni se pinta ni se publica como foto— y va a su tarjeta',
    /const visuals = job\.results\.filter\(\(r\) => r\.url && !esTresD\(r\.kind\)\);/.test(tarjeta) && /<TarjetaTresD\b/.test(tarjeta)
    && /const esTresD = \(kind: string\) => kind === 'world' \|\| kind === 'model3d';/.test(tarjeta));
  const tresD = sinComentarios(leer('components/creator/TarjetaTresD.tsx'));
  check('D6) la tarjeta 3D no finge un visor: ni una imagen, ni un 3D de mentira; dice que no lo hay, y nunca lee el nombre de una licencia',
    !/<Image\b|expo-image|three|WebView|<Canvas\b|model-viewer/.test(tresD) && /t\('creaciones\.noViewer3d'\)/.test(tresD)
    && /frasesDeDerechos\(derechos\)/.test(tresD) && !/licencias|\.nombre\b/.test(tresD));
});

/* ═══ E · LOS DERECHOS ═════════════════════════════════════════════════════ */
console.log('\n── E · Lo que se puede hacer con él, sin nombrar la licencia ──');
seccion('E', () => {
  const COMPLETOS = { revision: 'APPROVED', usoComercial: 'RESTRICTED', atribucion: true,
    licencias: [{ nombre: 'Licencia de un tercero', url: 'https://example.com/licencia' }], jurisdiccionesBloqueadas: ['EU', 'GB', 'KR'] };
  const frases = D.frasesDeDerechos(COMPLETOS);
  /* Misión de gobernanza (2026-10-06): la PROCEDENCIA va primero —hecho con IA en Weë, con un modelo de terceros que tiene
     su propia licencia—, para que las condiciones se entiendan sin nombrar ni el modelo ni el proveedor. */
  check('E1) procedencia, uso comercial, atribución y lugares, en ese orden; los lugares van como códigos para nombrarlos en el idioma de quien mira',
    iguales(frases, [{ clave: 'creaciones.rightsProvenance' }, { clave: 'creaciones.rightsCommercialRestricted' }, { clave: 'creaciones.rightsAttribution' }, { clave: 'creaciones.rightsBlockedIn', lugares: ['EU', 'GB', 'KR'] }]));
  check('E2) los derechos enteros de un material y los visibles de la puerta dicen lo MISMO (la misma regla del Core)',
    iguales(frases, D.frasesDeDerechos(N3D.derechosVisibles(COMPLETOS))));
  check('E3) y nada de la licencia sale: ni su nombre ni su dirección, ni la revisión interna', !/Licencia de un tercero|example\.com|APPROVED|revision/.test(JSON.stringify(frases)));
  check('E4) sin derechos, nada que avisar; atribución «no se sabe», nada; sin lugares bloqueados, ninguna frase de lugares',
    iguales(D.frasesDeDerechos(undefined), []) && iguales(D.frasesDeDerechos(null), [])
    && iguales(D.frasesDeDerechos({ usoComercial: 'ALLOWED', atribucion: 'UNKNOWN' }), [{ clave: 'creaciones.rightsProvenance' }, { clave: 'creaciones.rightsCommercialAllowed' }])
    && iguales(D.frasesDeDerechos({ usoComercial: 'NOT_ALLOWED', atribucion: false, jurisdiccionesBloqueadas: [] }), [{ clave: 'creaciones.rightsProvenance' }, { clave: 'creaciones.rightsCommercialNotAllowed' }]));
});

/* ═══ F · DESCARGAR ════════════════════════════════════════════════════════ */
console.log('\n── F · Descargar un mundo: con la extensión que declara ──');
seccion('F', () => {
  const URL_SIN = 'https://firebasestorage.googleapis.com/v0/b/x/o/users%2Fu%2Fai-generations%2Fmundo?alt=media';
  check('F1) un mundo sin extensión ni tipo declarado se guarda como datos (`bin`): su formato no está verificado y no se inventa',
    DESCARGA.extensionDe(URL_SIN, 'world') === 'bin');
  check('F2) con el tipo que el material DECLARA, su extensión; la de la dirección, si la trae, manda',
    DESCARGA.extensionDe(URL_SIN, 'world', 'model/gltf-binary') === 'glb' && DESCARGA.extensionDe(URL_SIN, 'world', 'application/zip; charset=binary') === 'zip'
    && DESCARGA.extensionDe('https://x/y/mundo.ply?alt=media', 'world', 'application/zip') === 'ply'
    && DESCARGA.extensionDe(URL_SIN, 'world', 'application/x-inventado') === 'bin');
  check('F3) y lo de siempre sigue igual: una imagen sin extensión es PNG, un modelo 3D, GLB',
    DESCARGA.extensionDe(URL_SIN, 'image') === 'png' && DESCARGA.extensionDe(URL_SIN, 'model3d') === 'glb');
});

/* ═══ G · LOS TEXTOS ═══════════════════════════════════════════════════════ */
console.log('\n── G · Los textos de la experiencia, en los dieciséis diccionarios ──');
const NUEVAS = {
  creaciones: ['filterWorlds', 'kindWorld', 'noViewer3d', 'rightsTitle', 'rightsProvenance', 'rightsCommercialAllowed', 'rightsCommercialRestricted', 'rightsCommercialUnclear',
    'rightsCommercialNotAllowed', 'rightsAttribution', 'rightsBlockedIn'],
  studio: ['world3dTitle', 'world3dHint', 'xpCreateWorld', 'pendWorld', 'worldIntro', 'worldChangePhoto', 'worldYourWords', 'worldSpaceQuestion', 'worldSpaceOutdoor',
    'worldSpaceIndoor', 'worldSpaceIdk', 'worldCreateFor', 'worldPriceChanged', 'worldQueued', 'worldGenerating', 'worldStopping', 'worldStoppingNote',
    'worldCancelledNote', 'worldUploadFailed', 'worldDailyLimit'],
};
const IDIOMAS = ['da', 'de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'pt-PT', 'ru', 'sv', 'tr', 'zh', 'zh-TW'];
/** El valor de una clave en el archivo de un idioma, leído del fuente (comillas simples o dobles). */
const valorEn = (idioma, modulo, clave) => {
  const src = leer(`i18n/textos/${idioma}/${modulo}.ts`);
  const m = src.match(new RegExp(`^\\s*${clave}:\\s*(['"])((?:\\\\.|(?!\\1).)*)\\1,`, 'm'));
  return m ? m[2] : undefined;
};
seccion('G', () => {
  const faltan = IDIOMAS.flatMap((i) => Object.entries(NUEVAS).flatMap(([m, ks]) => ks.filter((k) => !valorEn(i, m, k)?.trim()).map((k) => `${i}:${m}.${k}`)));
  check(`G1) las ${NUEVAS.creaciones.length + NUEVAS.studio.length} claves nuevas tienen texto en los ${IDIOMAS.length} diccionarios`, faltan.length === 0, faltan.slice(0, 6).join(' '));
  const huecos = IDIOMAS.filter((i) => !valorEn(i, 'creaciones', 'rightsBlockedIn')?.includes('{{lugares}}') || !valorEn(i, 'studio', 'worldCreateFor')?.includes('{{credits}}'));
  check('G2) con sus huecos intactos: {{lugares}} y {{credits}}', huecos.length === 0, huecos.join(', '));
  const marcas = IDIOMAS.filter((i) => !valorEn(i, 'studio', 'worldSpaceOutdoor')?.startsWith('🌳') || !valorEn(i, 'studio', 'worldSpaceIndoor')?.startsWith('🏠')
    || !valorEn(i, 'studio', 'worldSpaceIdk')?.startsWith('🤷') || !/Credits/.test(valorEn(i, 'studio', 'worldCreateFor') ?? '')
    || !/Credits/.test(valorEn(i, 'studio', 'worldCancelledNote') ?? '') || !/Weë/.test(valorEn(i, 'studio', 'pendWorld') ?? ''));
  check('G3) y sus marcas: los emojis de «abierto / cerrado / No sé», «Credits» y «Weë», sin traducir', marcas.length === 0, marcas.join(', '));
  const usadas = new Set([
    ...[...leer('screens/Mundo3DScreen.tsx').matchAll(/t\('((?:studio|creaciones)\.[A-Za-z0-9]+)'/g)].map((m) => m[1]),
    ...[...leer('components/creator/TarjetaTresD.tsx').matchAll(/t\('((?:studio|creaciones)\.[A-Za-z0-9]+)'/g)].map((m) => m[1]),
    ...[...leer('utils/derechosDelMaterial.ts').matchAll(/'(creaciones\.[A-Za-z0-9]+)'/g)].map((m) => m[1]),
  ]);
  const sinDefinir = [...usadas].filter((k) => { const [m, c] = k.split('.'); return !valorEn('es', m, c); });
  check(`G4) cada clave que pintan la pantalla, la tarjeta y los derechos (${usadas.size}) existe en el molde`, usadas.size >= 10 && sinDefinir.length === 0, sinDefinir.join(', '));
});

/* ═══ H · FASE 13: LA APP NO NOMBRA A NADIE ════════════════════════════════ */
console.log('\n── H · FASE 13: ni una pantalla, ni un servicio, ni un texto de la app nombra un proveedor o un modelo ──');
seccion('H', () => {
  const PROVEEDOR = /\b(fal|hunyuan|tencent|gemini|seedance|seedream|flux|elevenlabs|deepseek|minimax|openai|anthropic|replicate|byteplus|bytedance)\b|fal\.ai|fal-ai|FAL_KEY|providerModelId|hunyuan_world|image-to-world/i;
  const DE_LA_EXPERIENCIA = ['utils/crearMundo3D.ts', 'utils/derechosDelMaterial.ts', 'services/mundoService.ts', 'screens/Mundo3DScreen.tsx',
    'components/creator/TarjetaTresD.tsx', 'screens/MisCreacionesScreen.tsx', 'components/creator/RejillaDeCreaciones.tsx', 'constants/studioExperiences.ts',
    'services/vistaDeAsset.ts', 'services/assetDownload.ts', 'services/escena3d.ts', 'utils/noDisponible.ts'];
  const nombran = DE_LA_EXPERIENCIA.filter((f) => PROVEEDOR.test(leer(f)));
  check(`H1) los ${DE_LA_EXPERIENCIA.length} archivos de la experiencia, comentarios incluidos, no nombran ningún proveedor, modelo, clave ni id de modelo`, nombran.length === 0, nombran.join(', '));
  const NOMBRE_DE_PROVEEDOR = /hunyuan|tencent|fal\.ai|fal-ai|FAL_KEY|providerModelId/i;
  const enLaApp = archivosDeLaApp().filter((f) => !f.startsWith('services/filmmaker/espejo/') && NOMBRE_DE_PROVEEDOR.test(leer(f)));
  check('H2) y en TODA la app (fuera del espejo generado del Core) no aparece el proveedor de mundos, su modelo ni su clave', enLaApp.length === 0, enLaApp.join(', '));
  const textos = IDIOMAS.flatMap((i) => Object.entries(NUEVAS).flatMap(([m, ks]) => ks.map((k) => `${i}:${m}.${k}=${valorEn(i, m, k) ?? ''}`)))
    .filter((s) => PROVEEDOR.test(s.split('=').slice(1).join('=')));
  check('H3) ni en los textos nuevos, en ninguno de los dieciséis idiomas', textos.length === 0, textos.slice(0, 3).join(' | '));
  check('H4) CONTROL: el detector sí ve un proveedor', PROVEEDOR.test('lo hace fal-ai/hunyuan_world') && PROVEEDOR.test('FAL_KEY') && !PROVEEDOR.test('falta_tu_pais'));
  check('esta suite está en la cadena de `npm test`', /mundo3d-app\.test\.mjs/.test(leer('functions/package.json')));
});

console.log(failures ? `\n✘ ${failures} comprobación(es) fallaron` : `\n✔ 3D World en la app: del Studio a «Mis creaciones» (${n} comprobaciones, $0)`);
process.exit(failures ? 1 : 0);
