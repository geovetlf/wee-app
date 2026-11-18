/*
 * CONEXIÓN DE LAS PANTALLAS CON LA PRODUCCIÓN REAL (Filmmaker, 2026-11-18). node test/filmmaker-conexion.test.mjs
 *   A · universo → petición de imágenes (solo lo real, estilo elegido, una referencia).  B · pantalla → orquestación (nada cableado a medias).
 */
import { crearCargador, leer, sinComentarios } from './filmmaker-cliente.mjs';
let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };
const cargar = crearCargador({ dobles: { 'firebase/functions': { httpsCallable: () => async () => ({ data: {} }) }, '../config/firebase': { functions: {} } } });
const I = cargar('utils/imagenesDelUniverso.ts');
const universo = { siguiente: 4, aprobado: false, mundo: ' un volcán atrás ', elementos: [
  { id: 'e1', tipo: 'character', nombre: 'Jay', linea: 'Vaquero futurista', grupo: 'main', voz: 'auto' },
  { id: 'e2', tipo: 'place', nombre: 'Desierto', linea: '', grupo: 'other', voz: 'auto' },
  { id: 'e3', tipo: 'character', nombre: 'Muestra', linea: 'x', grupo: 'main', voz: 'auto', ejemplo: true }] };

console.log('── A · Petición de imágenes del universo ──');
const ok = I.peticionDeUniverso(universo, { estilo: 'scifi', tipo: 'short', referencia: 'https://x/u/creator-inputs/a.jpg', aspecto: '16:9' });
check('A1) con estilo, elementos y una referencia sale la petición del universo con lámina', ok.ok && ok.peticion.modo === 'universo' && ok.peticion.lamina === true && ok.peticion.estilo === 'scifi');
check('A2) el ejemplo NUNCA se genera; personaje y lugar sí, con su clase', ok.peticion.elementos.length === 2 && ok.peticion.elementos[0].clase === 'personaje' && ok.peticion.elementos[1].clase === 'lugar' && !ok.peticion.elementos.some((e) => e.id === 'e3'));
check('A3) el mundo viaja recortado y la descripción cae al nombre si no hay línea', ok.peticion.mundo === 'un volcán atrás' && ok.peticion.elementos[1].descripcion === 'Desierto');
check('A4) sin estilo no hay petición (el estilo lo elige la persona)', I.peticionDeUniverso(universo, { estilo: null, referencia: 'u' }).falta === 'estilo');
check('A5) sin referencia no hay petición (una imagen basta, pero hace falta una)', I.peticionDeUniverso(universo, { estilo: 'scifi', referencia: null }).falta === 'referencia');
check('A6) un universo solo de ejemplos no pide nada', I.peticionDeUniverso({ ...universo, elementos: [universo.elementos[2]] }, { estilo: 'scifi', referencia: 'u' }).falta === 'nada');
check('A7) 4:5 y 9:16 piden vertical, 1:1 cuadrado, el resto apaisado (los formatos que admite el lote)', I.formatoDeImagen('4:5') === '9:16' && I.formatoDeImagen('1:1') === '1:1' && I.formatoDeImagen('21:9') === '16:9');

console.log('── B · La pantalla usa la orquestación ──');
const P = sinComentarios(leer('screens/FilmmakerCrearScreen.tsx'));
const U = sinComentarios(leer('components/filmmaker/UniversoDeFilmmaker.tsx'));
check('B1) crear la producción pasa por `useProduccionDeFilmmaker.asegurar` con referencias, universo y estilo (no por el camino de primera generación)', P.includes('pf.asegurar(') && P.includes('references: listas(refs.referencias)') && !/crearProduccion\(/.test(P));
check('B2) los capítulos se guardan como escenas y planos tras cada cambio (con espera), sin cobrar nada', P.includes('setTimeout(() => {') && P.includes('tandas });') && !/spendCredits|creditsService/.test(P));
check('B3) las imágenes del universo usan el hook probado y la fila se monta solo con la capacidad abierta; si no, su línea de «Pronto»', P.includes('useImagenesDeFilmmaker()') && U.includes('imagenes?.abierta && peticionDeImagenes') && U.includes('uniRegenerateClosed'));
check('B4) los retratos y la lámina se pintan con la imagen cuando la petición salió «lista»', U.includes("estado === 'lista'") && U.includes('styles.lamina'));

console.log('── C · Producción y Juntar ──');
const PR = sinComentarios(leer('components/filmmaker/produccion/ProduccionDeFilmmaker.tsx'));
const JU = sinComentarios(leer('components/filmmaker/produccion/JuntarDeFilmmaker.tsx'));
const KC = sinComentarios(leer('constants/filmmakerCamara.ts'));
const KU = sinComentarios(leer('constants/filmmakerUniverso.ts'));
check('C1) Producción pide la toma de cada cuadro con el hook de siempre (useTomaDePlano) y solo con la capacidad abierta; cerrada, una línea con el motivo', PR.includes('useTomaDePlano(guardada, guardando, seleccion)') && PR.includes('PRODUCCION_ABIERTA && !demo ? cuadros.map') && PR.includes('filmmakerTandas.produceClosed') && /PRODUCCION_ABIERTA = false/.test(KC));
check('C2) el precio sale de la toma (≈ N Credits) junto al botón que lo causa, con confirmación por cuadro; la pantalla no calcula ni cobra', PR.includes("t('filmmaker.takePrice'") && PR.includes('toma.generar') && !/spendCredits|creditsService/.test(PR));
check('C3) solo se producen los cuadros aprobados, reales (sin ejemplos ni vacíos), con el id de plano de la orquestación', PR.includes('x.aprobada && !tandaEsDeEjemplo(x)') && PR.includes('!c.ejemplo && c.texto.trim()') && PR.includes('idDePlano(cuadro.id)'));
check('C4) Juntar enseña lo real contra el límite (60 cuadros · 10:00) y el botón sale cerrado con su motivo mientras el montaje lo esté; nada se simula', JU.includes('excesoDelMontaje(reales)') && JU.includes('LIMITE_DEL_MONTAJE.planos') && JU.includes('JUNTAR_ABIERTO && !!onJuntar') && /JUNTAR_ABIERTO = false/.test(KC));
check('C5) las etapas Producción y Juntar existen en la barra (ya no son «próxima fase») y la pantalla las monta; Salida sigue sin existir', /id: 'production'[^}]*abierta: true/.test(KU) && /id: 'join'[^}]*abierta: true/.test(KU) && /id: 'output'[^}]*abierta: false/.test(KU) && P.includes('<ProduccionDeFilmmaker') && P.includes('<JuntarDeFilmmaker'));
check('C6) «Producir» del storyboard lleva a la etapa de Producción, donde viven el precio y el estado', P.includes('onProducir={() =>') && sinComentarios(leer('components/filmmaker/storyboard/StoryboardDeTanda.tsx')).includes('onProducir ??'));
check('C7) aprobar y el almacén de un capítulo viajan como estado de la escena (update_scene batch) sin reescribirla ni borrar sus tomas', sinComentarios(leer('services/filmmakerOrquestacionService.ts')).includes("op: 'update_scene'") && sinComentarios(leer('utils/filmmakerOrquestacion.ts')).includes("status: 'approved'"));
check('C8) Producir un capítulo entero: presupuesto previo (≈ N Credits) y confirmación antes del lote; cancelar una toma; Juntar enseña el tope diario', PR.includes('videoService.quoteBatch') && PR.includes('videoService.generateBatch(lote(calidad), presupuesto.total.credits)') && PR.includes('videoService.cancelTake') && PR.includes('PRODUCCION_ABIERTA && !demo ? <BloqueDeLote') && JU.includes('joinDaily') && /PRODUCCION_ABIERTA = false/.test(KC) && /JUNTAR_ABIERTO = false/.test(KC));
check('C9) el demo existe SOLO con __DEV__ (modo y botón); en producción no hay ruta, ni botón, ni banda', P.includes('const demo = __DEV__ ? (demoLocal ?? demoUrl) : null') && P.includes('if (!__DEV__) return;') && P.includes('{__DEV__ && !enDemo && (capa === ') && P.includes('demoUrl = __DEV__ &&'));
const cuerpoDemo = P.slice(P.indexOf('const cargarDemo'), P.indexOf('const salirDelDemo'));
check('C10) el demo nunca toca el servidor ni los Credits: sin pf ni servicios dentro de cargarDemo, y Producción/Juntar en demo no usan videoService ni hooks de toma', cuerpoDemo.length > 200 && !/pf\.|videoService|filmmakerService|spendCredits/.test(cuerpoDemo) && PR.includes('PRODUCCION_ABIERTA && !demo') && !/videoService/.test(JU) && P.includes('if (enDemo) { cargarDemo('));
check('C11) el demo se rotula siempre «Demo» con salida, y avisa de que no genera ni cobra', P.includes('testID="banda-demo"') && P.includes('salirDelDemo'));
check('C12) el demo se ofrece en tipo, estilo y composer, y junto a «Reintentar» si crear falla; conserva la idea y las imágenes; todo bajo __DEV__', P.includes("(capa === 'entrada' || capa === 'estilo' || capa === 'taller')") && P.includes('testID="probar-demo-error"') && /__DEV__ \? \(\s*<TouchableOpacity onPress=\{\(\) => cargarDemo/.test(P) && P.includes("const ideaPrevia = fraseDe(idea) || texto.trim();") && P.includes('personajes(refs.referencias).reduce'));

console.log('── D · Estado leído de shot.production / shot.montage, ajustes reales y «pídele un cambio» por capítulo ──');
const EP = cargar('utils/estadoDeLaProduccion.ts');
const OR = cargar('utils/filmmakerOrquestacion.ts');
const tandasD = { siguiente: 3, tandas: [{ id: 't1', titulo: '', objetivo: 60, cuadros: [{ id: 'c1', texto: 'a', duracion: 6 }, { id: 'c2', texto: 'b', duracion: 6 }] }, { id: 't2', titulo: '', objetivo: 60, cuadros: [{ id: 'c3', texto: 'c', duracion: 6 }] }] };
const vista = { units: [
  { sceneId: OR.idDeEscena('t1'), unitId: OR.idDePlano('c1'), takes: 1, latest: { state: 'completed' }, videoAssetId: 'a1' },
  { sceneId: OR.idDeEscena('t1'), unitId: OR.idDePlano('c2'), takes: 1, latest: { state: 'processing' } },
  { sceneId: OR.idDeEscena('t2'), unitId: OR.idDePlano('c3'), takes: 1, latest: { state: 'refunded' } }], summary: { readyToAssemble: false } };
const leida = EP.leerProduccion(vista);
const porCuadro = EP.estadosDeLosCuadros(leida, tandasD);
check('D1) shot.production se lee a un estado por cuadro: vídeo = lista, toma en marcha = en proceso, devuelta = fallida', porCuadro.c1 === 'lista' && porCuadro.c2 === 'en_proceso' && porCuadro.c3 === 'fallida');
check('D2) el capítulo sale de sus cuadros (en curso / terminado / con error) y sin toma no hay estado', EP.estadoDelCapitulo(['c1', 'c2'], porCuadro) === 'producing' && EP.estadoDelCapitulo(['c3'], porCuadro) === 'error' && EP.estadoDelCapitulo(['c1'], porCuadro) === 'listo' && EP.estadoDelCapitulo(['c9'], porCuadro) === undefined);
check('D3) una toma completada sin vídeo enlazado sigue «en proceso» (nunca «lista» sin el vídeo en su plano)', EP.estadoDeUnidad({ sceneId: 's', unitId: 'u', ultima: 'completed', conVideo: false }) === 'en_proceso');
check('D4) lo que llega mal formado no se adivina: nulo, sin units o sin ids', EP.leerProduccion(null) === null && EP.leerProduccion({}) === null && EP.leerProduccion({ units: [{ unitId: 'x' }, 7] }).unidades.length === 0 && EP.estadosDeLosCuadros(null, tandasD).c1 === 'sin_toma');
check('D5) shot.montage: listo, o cuántos planos faltan; una respuesta sin forma es nula', EP.leerMontaje({ montage: { ready: true, manifest: {} } }).listo === true && EP.leerMontaje({ montage: { ready: false, reason: 'x', missing: ['a', 'b'] } }).faltan === 2 && EP.leerMontaje({}) === null);
const SV = sinComentarios(leer('services/tomaService.ts'));
const HK = sinComentarios(leer('hooks/useEstadoDeLaProduccion.ts'));
check('D6) el cliente solo LEE (`shot.production`, `shot.montage`), una consulta por producción y no por toma; Producción y Juntar usan el hook', SV.includes("op: 'shot.production'") && SV.includes("op: 'shot.montage'") && HK.includes('tomaService.produccion(id)') && PR.includes('useEstadoDeLaProduccion(guardada') && JU.includes('useEstadoDeLaProduccion(guardada') && !/spendCredits|creditsService/.test(HK + JU));
check('D7) Juntar solo se abre con el montaje listo según el servidor; si no, dice que faltan cuadros', JU.includes('montaje?.listo === true') && JU.includes('filmmakerProd.joinNotReady'));
check('D8) Producción enseña UNA línea con modelo, formato y resolución EFECTIVOS del panel (no «Automático»)', PR.includes('testID="produccion-ajustes"') && P.includes('const e = efectivas(idea); return { modelo: e.modelo.nombre, formato: e.formato, resolucion: e.resolucion }'));
const HT = sinComentarios(leer('components/filmmaker/tandas/HojaDeTanda.tsx'));
const TS = sinComentarios(leer('components/filmmaker/tandas/TandasYStoryboard.tsx'));
check('D9) «Pídele un cambio a Weë» por capítulo: fila plegada en las opciones del capítulo con la caja común (CajaDePrompt), etapa «capitulos» y escena, y la propuesta se aprueba con la burbuja (no se aplica sola)', HT.includes("t('filmmakerDirector.askChange')") && HT.includes('<CajaDePrompt portada enviarDiscreto') && TS.includes('sceneId: idDeEscena(enOpciones.id)') && P.includes("etapa: seleccion.shotId ? 'cuadro' : 'capitulos'") && P.includes('onAprobar={() => { void director.aprobar(); }}'));

console.log('── E · Ronda 6 del auditor: Editar capítulo, idea conservada, una cabecera, estilos, Universo ──');
const LT = sinComentarios(leer('components/filmmaker/tandas/ListaDeTandas.tsx'));
const SB = sinComentarios(leer('components/filmmaker/storyboard/StoryboardDeTanda.tsx'));
const UN = sinComentarios(leer('components/filmmaker/UniversoDeFilmmaker.tsx'));
const BU = sinComentarios(leer('components/filmmaker/BurbujaDelDirector.tsx'));
const EE2 = sinComentarios(leer('components/filmmaker/ElegirEstilo.tsx'));
check('E1) la lista de capítulos no tiene menú «⋯»: cada fila lleva «Editar capítulo» y el capítulo abierto trae sus ajustes (HojaDeTanda) y «Cambiar con Weë»', !LT.includes('ellipsis') && !LT.includes('onOpciones') && LT.includes("t('filmmakerTandas.options')") && SB.includes('onEditar') && TS.includes('onEditar={() => setOpcionesId(actual.id)}') && !HT.includes('FilaCerrada') && !HT.includes('layerMusic'));
check('E2) si Weë Brain falla, la idea vuelve a la caja (y a su valor previo) y la burbuja ofrece Reintentar, sin «Cerrar»', P.includes("else if (r === 'fallo') { setIdea(ideaPrevia); setTexto(dicho); setBorradorListo(null); }") && BU.includes("t('common.retry')") && BU.includes('aviso && onRehacer'));
check('E3) dentro de un capítulo hay UNA cabecera (la del capítulo con su flecha): sin fila de etapas ni flecha de la pantalla', TS.includes('onCapitulo?.(') && P.includes('enTandas && enCapitulo') && P.includes('<TandasYStoryboard onCapitulo={setEnCapitulo}'));
check('E4) estilos: con ventana alta (≥ 760) siempre dos columnas; solo se pasa a tres en pantallas cortas', EE2.includes('VENTANA_ALTA = 760') && EE2.includes('ventana.height'));
check('E5) Universo: «Continuar» siempre fijo abajo (también en pantalla corta) y la lista se desplaza', !/\{bajo \? \(?<View style=\{\{ gap: 6 \}\}>\{botonContinuar\}/.test(UN) && UN.includes('<View style={[styles.pie, bajo &&') && !/bajo \? null : \(\s*<View style=\{styles\.pie\}>/.test(UN));
check('E6) «Cambiar con Weë» con un ejemplo bajo el campo, en capítulo y en cuadro; el demo repite lo pedido sin cortes', HT.includes('askChangeExample') && sinComentarios(leer('components/filmmaker/storyboard/FichaDelCuadro.tsx')).includes('askChangeExample') && sinComentarios(leer('hooks/useDirectorDeFilmmaker.ts')).includes('demoChangeReply') && !/pedirCambio[^\n]*compacta/.test(P) && /askChange: 'Cambiar con Weë'/.test(leer('i18n/textos/es/filmmakerDirector.ts')));
check('E7) «Probar con demo» (solo dev) vive en la cabecera con un área de 44 dp; el demo no repite nombres (Mara solo en el ejemplo)', /__DEV__ && !enDemo[^\n]*\n[^\n]*testID="probar-demo"/.test(P) && !/demoEntrada \}/.test(P) && /demoCharacter: 'Kai — /.test(leer('i18n/textos/es/filmmakerProd.ts')));

console.log(failures ? `\n${failures} FALLO(S)` : `\nTodo en verde (${n}).`);
process.exit(failures ? 1 : 0);
