/*
 * El compositor global de Weë (commit cc7e8c8).
 *
 * Existe aparte de `travel.test.mjs` por una razón concreta: allí las
 * comprobaciones del compositor están entrelazadas con las del muro general y
 * las de la previsualización, que miran archivos que todavía no están
 * commiteados. Este archivo no mira ninguno de esos: solo `CreateScreen.tsx`,
 * `utils/sectionFeed.ts` y `services/firestoreService.ts`, que son los tres que
 * viajaron en cc7e8c8. Así se puede ejecutar contra ese commit tal cual.
 *
 * Las aserciones son las mismas que ya existían, no versiones nuevas: si una
 * cambia aquí y allí no, una de las dos miente.
 *
 * Donde no se puede ejecutar —una pantalla de React Native— se lee el código.
 * `soloCodigo` quita los comentarios antes de mirar, para que una explicación
 * escrita al lado no pueda aprobar una prueba por su cuenta. Ojo: se atraganta
 * con `CreateScreen.tsx` —un falso `/*` le hace tragarse bloques enteros—, así
 * que para construcciones inequívocas se mira el fuente crudo.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/** El código sin comentarios: lo que se prueba es lo que se ejecuta. */
const soloCodigo = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

// ════════════════════════════════════════════════════════════════════════════
// A · Una sola pantalla para publicar en todo Weë
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · El compositor social, el mismo para todo Weë ──');
{
  const crear = soloCodigo(leer('screens/CreateScreen.tsx'));
  const muro = soloCodigo(leer('components/creator/SectionWall.tsx'));

  /*
   * UN solo compositor. Todo Weë publica por la misma pantalla —el muro de una
   * sección, el botón +, la comunidad, la ayuda, el resultado de una generación—
   * así que arreglarla ahí lo arregla en todas partes. Lo que se vigila es que no
   * aparezca un segundo compositor por sección.
   */
  const pantallasQueCrean = ['components/creator/SectionWall.tsx', 'components/Sidebar.tsx', 'screens/HomeScreen.tsx', 'screens/CommunityScreen.tsx'];
  check('108) todas las superficies publican por la misma pantalla', pantallasQueCrean.every((f) => /navigate\('Create'/.test(soloCodigo(leer(f)))));
  check('108) y ninguna trae compositor propio', !/TextInput/.test(muro), 'SectionWall escribe por su cuenta');

  /*
   * A nadie se le pregunta cómo lo hizo. El bloque de herramientas, prompt y
   * proceso desapareció del compositor: publicar es contar algo, no rellenar una
   * ficha técnica. Los campos siguen existiendo, pero solo los escribe Weë cuando
   * la publicación nace de una generación suya.
   */
  check('109) no se pregunta "Cómo lo hice" al publicar', !/renderHowIMadeIt|showHowIMadeIt/.test(crear), 'el bloque sigue en el compositor');
  check('109) ni hay campos que rellenar de IA', !/setAiToolsText|setAiPrompt|setAiProcess/.test(crear));
  check('109) pero lo que generó Weë se sigue apuntando solo', /routeParams\.prefill\?\.aiTools/.test(crear) && /routeParams\.prefill\?\.aiProcess/.test(crear));
  /* El buscador de lugar ya no vive en el compositor: vive en su pantalla, y el
     botón lleva allí. Lo que se vigila es que el compositor no lo recupere. */
  check('109) el lugar se elige en su pantalla, no dentro del compositor', /navigate\('AgregarUbicacion'/.test(crear) && !/buscarLugares|placeQuery/.test(crear));

  /*
   * Lo que se puede añadir vive en mosaicos pegados al texto. Antes eran iconos
   * sueltos en una barra anclada al fondo de la pantalla —a media pantalla del
   * texto en un móvil alto— y dos cajas grandes flotando en medio.
   */
  check('110) las acciones van en mosaicos, no en una barra al fondo', /const renderAcciones = \(\) => \(/.test(crear) && !/renderToolbar/.test(crear));
  check('110) y cada una dice lo que hace, no solo un icono', ['Cámara', 'Multimedia', 'ËContact', 'Ubicación', 'Encuesta', 'Mis proyectos'].every((t) => crear.includes(`texto="${t}"`)));

  /*
   * ËContact es el nombre de la red de conexiones de Weë en todos los idiomas.
   * Su botón estuvo apagado mientras no hubo nada detrás; ahora abre la agenda
   * del perfil activo, así que lo que se vigila es justo lo contrario: que NO
   * vuelva a quedarse apagado y que siga llevando a algún sitio.
   */
  const bloqueEContact = crear.slice(crear.indexOf('texto="ËContact"'), crear.indexOf('texto="ËContact"') + 280);
  check('110) ËContact ya no está apagado', !/apagada/.test(bloqueEContact), bloqueEContact.slice(0, 80));
  check('110) y abre la agenda del perfil activo', /setShowEContacts/.test(bloqueEContact));
  check('110) y ya no se llama Amigos', !/texto="Amigos"/.test(crear));
  // La encuesta no está en la maqueta pero existe en Weë: quitarla la dejaría sin puerta.
  check('110) y la encuesta conserva su única puerta', /onPress=\{handlePollPress\}/.test(crear));

  /*
   * EL ORDEN QUE MANDÓ EL USUARIO, y no el que quede: Cámara, Foto o vídeo,
   * ËContact, Ubicación, Encuesta. Se comprueba sobre el sitio donde se dibujan,
   * no sobre el archivo entero, porque los nombres aparecen también en estilos.
   */
  const bloqueAcciones = crear.slice(crear.indexOf('const renderAcciones'), crear.indexOf('const renderDestinos'));
  const ordenAcciones = [...bloqueAcciones.matchAll(/texto="([^"]+)"/g)].map((m) => m[1]);
  check('110) las seis acciones van en el orden aprobado', ordenAcciones.join(' · ') === 'Cámara · Multimedia · ËContact · Ubicación · Encuesta · Mis proyectos', ordenAcciones.join(' · '));

  /*
   * `MediaTypeOptions.All` está obsoleto y en el teléfono llegaba al selector de
   * Google SIN tipos MIME: solo enseñaba fotos, con el botón diciendo "Foto o
   * vídeo". La lista moderna sí pide las dos cosas. Comprobado en el aparato.
   */
  check('110) foto y vídeo son la misma puerta, y se dice: Multimedia', /mediaTypes: \['images', 'videos'\]/.test(leer('screens/CreateScreen.tsx')) && /texto="Multimedia"/.test(crear) && !/Foto o vídeo/.test(crear));
  // Sobre el USO, no sobre la palabra: el comentario que explica el cambio la nombra.
  check('110) y no queda ningún enum obsoleto pidiendo medios', !/ImagePicker\.MediaTypeOptions/.test(leer('screens/CreateScreen.tsx')));

  /*
   * El orden de la maqueta aprobada: quién publica, qué cuenta, con qué, y dónde.
   * Las acciones van DEBAJO del texto —arriba parecían una barra técnica— y la
   * identidad abre la pantalla.
   */
  check('110) primero quién publica', crear.indexOf('styles.identidad') < crear.indexOf('{renderTextInput()}'));
  check('110) luego lo que cuenta, y después con qué', crear.indexOf('{renderTextInput()}') < crear.indexOf('{renderAcciones()}'));
  check('110) y al final dónde se comparte', crear.indexOf('{renderAcciones()}') < crear.indexOf('{renderDestinos()}'));
  check('110) los medios se ven antes que las acciones', crear.indexOf('{renderMediaPreview()}') < crear.indexOf('{renderAcciones()}'));
  check('110) la cabecera dice qué estás haciendo', /Nueva publicación<\/Text>/.test(crear) && /Publicar<\/Text>/.test(crear));
  /* El control superior izquierdo dice "Back" y sigue haciendo lo mismo que
     hacía "Cancelar": cerrar la pantalla con `handleClose`. Los "Cancelar" de
     las alertas de permisos no cambian. */
  check('110) arriba a la izquierda está el aspa de Back, con el mismo cierre de siempre', /onPress=\{handleClose\}[\s\S]{0,300}accessibilityLabel="Back"[\s\S]{0,120}name="close"/.test(crear) && !/>Cancelar<\/Text>|>Back<\/Text>/.test(crear));
  /* Sobre el fuente crudo: `soloCodigo` se traga esos bloques (ver cabecera). */
  check('110) y las alertas de permisos conservan su Cancelar', (leer('screens/CreateScreen.tsx').match(/text: 'Cancelar', style: 'cancel'/g) || []).length === 2);
  /* El lugar elegido es un chip bajo el texto, parte de la publicación; y si
     no hay nada, no se pinta nada. */
  check('110) el lugar elegido es un chip, y solo sale si hay algo', /const renderLugar = \(\) =>\s*\n?\s*place \|\| ubicacion \? \(/.test(crear) && /styles\.chipLugar/.test(crear));
  check('110) y va justo bajo el campo de texto, antes de las acciones', crear.indexOf('{renderTextInput()}') < crear.indexOf('{renderLugar()}') && crear.indexOf('{renderLugar()}') < crear.indexOf('{renderAcciones()}'));

  /*
   * MOSAICOS (fase 2E-76, modelo visual del usuario). Eran píldoras en una fila
   * que se arrastraba, y arrastrando se escondían la mitad: quien no lo hacía
   * nunca supo que había encuesta. Ahora las cinco están a la vista en dos filas.
   */
  check('110) las herramientas van en una sola fila, las seis a la vista y sin arrastrar',
    /acciones: \{\s*flexDirection: 'row',\s*flexWrap: 'wrap',\s*justifyContent: 'space-between'/.test(crear) && !/ScrollView horizontal[\s\S]{0,240}styles\.acciones/.test(crear) && !/accionesFila/.test(crear));
  check('110) el recuento no se mete dentro del nombre del botón', /texto="Multimedia"/.test(crear) && /insignia=\{fotosPuestas > 0/.test(crear));
  check('110) y el campo de texto es una hoja grande que crece, no un hueco fijo', /textInput: \{\s*minHeight: scale\(150\),/.test(crear) && !/minHeight: scale\(220\)/.test(crear));

  /*
   * El hueco de doce por ciento que se vio en el teléfono venía de que la
   * pregunta era el placeholder DEL campo y la ayuda iba detrás: la altura del
   * campo se metía entre las dos. Ahora van seguidas y el campo va después.
   */
  const fuenteCrear = leer('screens/CreateScreen.tsx');
  /*
   * Desde el rediseño del workspace la pregunta vuelve a ser el placeholder
   * del campo —"Escribe algo…"— y no hay línea de ayuda: quien entra, escribe.
   */
  check('111b) la pregunta es el placeholder del campo y no hay línea de ayuda', /placeholder=\{composerPlaceholder\}/.test(fuenteCrear) && !/textoAyuda|Cuéntanos tu experiencia|textoPregunta/.test(fuenteCrear));
  check('111b) y dentro del papel no hay emoji, # ni @', !/placeholder=""/.test(crear) && !/happy-outline|📹|'#'|'@'/.test(crear.slice(crear.indexOf('const renderTextInput'), crear.indexOf('const sinSitioParaMedios'))));

  /*
   * Y el defecto que encontró la validación: al elegir, el chip se ensanchaba
   * —ganaba icono y negrita— y la rejilla entera se recolocaba bajo el dedo.
   */
  check('111b) el hueco del check está reservado siempre', /styles\.destinoCheck,/.test(crear) && /destinoCheck: \{\s*width: scale\(20\),\s*height: scale\(20\)/.test(crear));
  check('111b) y el peso de la letra no cambia al elegir', !/fontWeight: elegido \?/.test(crear));
  check('110) el botón se enciende cuando ya lleva algo puesto', /activa=\{!!place \|\| !!ubicacion\}/.test(crear) && /activa=\{attachedMedia\.length > 0\}/.test(crear));

  // Publicar exige contenido: ni texto vacío ni una publicación en blanco.
  check('111) no se publica sin contenido', /const canPublish = hasContent && !isTextOverLimit && !isPublishing && isPollValid;/.test(crear));
  check('111) y el botón lo refleja', /disabled=\{!canPublish\}/.test(crear));

  // El contexto viaja con la publicación desde el muro de una sección.
  check('112) publicar desde una sección conserva su contexto', /navigate\('Create', \{ kind, sourceSection: sectionId \}\)/.test(muro));
}

// ════════════════════════════════════════════════════════════════════════════
// B · Destinos: quien publica decide dónde aparece
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · Un post, varios sitios donde se lee ──');
{
  const ts = require('typescript');
  const fuente = leer('utils/sectionFeed.ts');
  const js = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const feed = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

  const post = (extra = {}) => ({ id: 'p', userId: 'u', content: 'hola', likes: 0, comments: 0, ...extra });

  // Cada combinación, comprobada ejecutando la función de verdad.
  const soloGeneral = post({ destinations: ['general'] });
  const soloTravel = post({ destinations: ['travel'] });
  const generalYTravel = post({ destinations: ['general', 'travel'] });
  const travelYDesign = post({ destinations: ['travel', 'design'] });
  const muchos = post({ destinations: ['general', 'travel', 'design', 'chef'] });
  const todos = post({ destinations: feed.destinosDisponibles().map((d) => d.id) });

  check('113) solo general: en el muro, en ninguna sección', feed.vaAlMuroGeneral(soloGeneral) && !feed.vaALaSeccion(soloGeneral, 'travel'));
  check('113) solo Travel: en Travel y NO en el muro general', feed.vaALaSeccion(soloTravel, 'travel') && !feed.vaAlMuroGeneral(soloTravel));
  check('113) general + Travel: en los dos', feed.vaAlMuroGeneral(generalYTravel) && feed.vaALaSeccion(generalYTravel, 'travel'));
  check('113) Travel + Design: en esas dos y en el muro no', feed.vaALaSeccion(travelYDesign, 'travel') && feed.vaALaSeccion(travelYDesign, 'design') && !feed.vaAlMuroGeneral(travelYDesign));
  check('113) muro + varias secciones', feed.vaAlMuroGeneral(muchos) && ['travel', 'design', 'chef'].every((s) => feed.vaALaSeccion(muchos, s)));
  check('113) y en todos los destinos a la vez', feed.destinosDisponibles().every((d) => (d.id === 'general' ? feed.vaAlMuroGeneral(todos) : feed.vaALaSeccion(todos, d.id))));

  // Sin tope artificial: el que quepa en la lista.
  check('114) no hay límite de destinos', todos.destinations.length === feed.destinosDisponibles().length && todos.destinations.length >= 8);

  /*
   * LO MÁS IMPORTANTE. Quien eligió dónde publicar ya lo dijo: adivinar por las
   * palabras del texto sería pisar una decisión explícita.
   */
  const viajeEnGeneral = post({ content: 'Me voy de viaje mañana a un hotel', destinations: ['general'] });
  const recetaEnGeneral = post({ content: 'Hice una receta de cocina buenísima', destinations: ['general'] });
  check('115) "viaje" no fuerza Travel si eligió solo el muro', !feed.vaALaSeccion(viajeEnGeneral, 'travel'));
  check('115) "receta" no fuerza Chef si eligió solo el muro', !feed.vaALaSeccion(recetaEnGeneral, 'chef'));
  check('115) y esas mismas palabras SÍ arrastran cuando no hay destinos', feed.vaALaSeccion(post({ content: 'Me voy de viaje a un hotel' }), 'travel'));

  // COMPATIBILIDAD HISTÓRICA: las de antes siguen exactamente como estaban.
  const historica = post({ content: 'Una receta de cocina de mi abuela' });
  check('116) una publicación sin destinos sigue en el muro general', feed.vaAlMuroGeneral(historica));
  check('116) y sigue encontrándose por palabras clave', feed.vaALaSeccion(historica, 'chef'));
  check('116) no se le inventa el campo', historica.destinations === undefined);
  check('116) una lista vacía cuenta como "sin destinos", no como "en ninguno"', feed.vaAlMuroGeneral(post({ destinations: [] })));

  // Brain ayuda, no es un sitio donde publicar.
  check('117) Brain no es un destino', !feed.destinosDisponibles().some((d) => d.id === 'brain'));
  // Los nombres salen de la fuente única, y cada uno es el suyo.
  const nombres = Object.fromEntries(feed.destinosDisponibles().map((d) => [d.id, d.nombre]));
  check('117) el muro general se llama por su nombre', nombres.general === 'Muro general');
  check('117) Travel dice "Weë Travel"', nombres.travel === 'Weë Travel');
  check('117) Studio dice "Weë Studio"', nombres.studio === 'Weë Studio');
  check('117) Design dice "Weë Design"', nombres.design === 'Weë Design');
  check('117) Chef dice "Weë Chef"', nombres.chef === 'Weë Chef');
  check('117) y están los ocho que se aprobaron', ['general', 'travel', 'design', 'studio', 'chef', 'business', 'music', 'writer'].every((id) => !!nombres[id]) && feed.destinosDisponibles().length === 8);
  check('117) sin inventar secciones que no existen', !['kids', 'health', 'education', 'community', 'photography'].some((id) => nombres[id]));

  /*
   * Sobre el fuente CRUDO: `soloCodigo` se atraganta con CreateScreen.tsx —un
   * falso `/*` le hace tragarse bloques enteros—. Para construcciones inequívocas
   * no hace falta limpiarlo.
   */
  const crearCrudo = leer('screens/CreateScreen.tsx');
  const crear = soloCodigo(crearCrudo);

  // UN documento. Los muros son lecturas, no copias.
  check('118) se guarda un solo post con su lista de destinos', /destinations: destinos/.test(crearCrudo) && (crearCrudo.match(/postsService\.create/g) || []).length === 1);
  check('118) y la lista es la que eligió la persona, sin recortar', !/destinos\.slice\(|maxTags|MAX_DESTINOS/.test(crear));
  // El campo existe en el modelo y es opcional: sin él, comportamiento de siempre.
  check('118) el modelo guarda los destinos como campo opcional', /destinations\?: string\[\];/.test(leer('services/firestoreService.ts')));

  // SELECCIÓN MÚLTIPLE y preselección por contexto: viene marcado, no bloqueado.
  check('119) se preselecciona el sitio desde el que se abrió', /useState<string\[\]>\(\(\) => \[sourceSection \|\| MURO_GENERAL\]\)/.test(crear));
  check('119) y se puede añadir y quitar cualquiera', /actuales\.includes\(id\) \? actuales\.filter/.test(crear));
  check('119) la lista de destinos sale de la fuente única', /destinosDisponibles\(\)/.test(crear) && !/'Weë Studio'|'Weë Design'/.test(crear));

  // El relleno de páginas que viajó en el mismo commit tiene tope: no gira sin fin.
  check('120) el bucle de relleno tiene tope', /MAXIMO_DE_VUELTAS/.test(soloCodigo(fuente)));

  // Publicar es gratis y no pasa por ninguna IA.
  check('121) publicar no toca Credits ni IA', !/spendCredits|creditsService|gemini|creatorService/i.test(crear));

  /*
   * ─── Multimedia: hasta diez fotos, un vídeo de quince segundos, UN post ────
   *
   * La estructura ya existía —`attachedMedia` es una lista y el post guarda
   * `imageUrls`—, así que subir el tope no crea documentos ni arquitectura nueva.
   */
  check('122) caben diez fotos en una publicación', /const maxImages = 10;/.test(crearCrudo));
  check('122) y se pueden elegir varias de una vez', /allowsMultipleSelection: !hasVideo/.test(crearCrudo));
  /*
   * El tope de fotos ya no es un número suelto: con encuesta caben menos que sin
   * ella. Lo que se vigila es que TODO —lo que deja elegir el selector y lo que
   * dice la píldora— salga del mismo tope calculado, y que sin encuesta ese tope
   * siga siendo las diez de siempre.
   */
  check('122) el tope son diez fotos, o una si hay encuesta', /const topeImagenes = poll \? MAX_IMAGENES_CON_ENCUESTA : maxImages;/.test(crearCrudo));
  check('122) sin pasarse del tope al elegir', /selectionLimit: hasVideo \? 0 : topeImagenes - attachedMedia\.length/.test(crearCrudo));
  check('122) la píldora dice cuántas llevas de las que caben', /\$\{fotosPuestas\}\/\$\{topeImagenes\}/.test(crearCrudo));
  check('122) y un vídeo no cuenta como foto', /attachedMedia\.filter\(\(m\) => m\.type === 'image'\)\.length/.test(crearCrudo));

  // Un vídeo, quince segundos, comprobados ANTES de subir y sin tocar el archivo.
  check('123) quince segundos, todos los vídeos', /const maxVideoDurationSeconds = 15;/.test(crearCrudo));
  check('123) se rechaza diciendo cuánto dura', /no puede durar más de 15 segundos\. Tu video dura/.test(crearCrudo));
  // Ojo con la vara: 'trim' a secas cazaba las llamadas a .trim() del propio código.
  check('123) y no se recorta ni se convierte con IA', !/ffmpeg|transcode|videoTrim|recortarVideo|trimVideo/i.test(crear));

  // UN documento con su lista de medios. Diez fotos no son diez publicaciones.
  check('124) los medios van dentro del mismo post', /let imageUrls: string\[\] = \[\];/.test(crearCrudo) && /imageUrls\.push/.test(crearCrudo));
  check('124) y se sigue creando una sola publicación', (crearCrudo.match(/postsService\.create/g) || []).length === 1);

  /*
   * ─── El modelo visual aprobado ────────────────────────────────────────────
   *
   * Con diez fotos, la miniatura deja de ser un detalle y pasa a ser la única
   * forma de que quepan: a ancho completo y 280 de alto eran casi tres mil
   * píxeles de scroll hasta el botón de publicar.
   */
  check('125) las fotos van en miniatura, no a ancho completo', /width: scale\(100\),\s*height: scale\(100\)/.test(crearCrudo) && !/height: scale\(280\)/.test(crearCrudo));
  check('125) y la rejilla no recorta las aspas de quitar', !/mediaGrid: \{[\s\S]{0,160}overflow: 'hidden'/.test(crearCrudo));
  check('125) el hueco de seguir añadiendo va al final de la tira', crearCrudo.indexOf('styles.mediaAgregar,') > crearCrudo.indexOf('removeMediaButton,'));
  check('125) y desaparece cuando ya no cabe nada', /\{!sinSitioParaMedios && \(/.test(crearCrudo));
  // Al tope, la puerta se cierra: no hay foto de más ni por la galería ni por la
  // cámara. El tope es el mismo que usa todo lo demás —diez, o una con encuesta—,
  // así que basta con que sea `topeImagenes` y no un número escrito otra vez.
  check('125) al llegar al tope no se puede añadir más', /const sinSitioParaMedios = attachedMedia\.length >= topeImagenes/.test(crearCrudo) && /apagada=\{sinSitioParaMedios\}/.test(crearCrudo));
  // Y tener encuesta ya no apaga la cámara por sí solo: lo que cambia es el tope.
  check('125) tener encuesta ya no apaga la cámara, solo baja el tope', !/const sinSitioParaMedios = [^;]*poll !== null/.test(crearCrudo));
  // Y se puede quitar cualquiera de las que ya están.
  check('125) cada medio puesto se puede quitar', /onPress=\{\(\) => removeMedia\(media\.id\)\}/.test(crearCrudo));

  // Lo que se escribe vive en una tarjeta con su contador dentro, no en un renglón suelto.
  check('125) la caja de escribir es una tarjeta cerrada', /tarjetaTexto: \{\s*borderWidth: 1,/.test(crearCrudo));
  check('125) que dice cuánto llevas de cuánto cabe', /\{postText\.length\}\/\{maxTextLength\}/.test(crearCrudo));

  // Dónde publicar es una pregunta con su bloque, no el último campo del formulario.
  check('125) dónde publicar es un rótulo —PUBLICAR EN— sin pregunta ni explicación', /PUBLICAR EN/.test(crearCrudo) && !/¿Dónde quieres publicar\?|Puedes elegir una o más opciones|Elige una o más comunidades|Sugerir con IA|Tu publicación aparecerá/.test(crearCrudo));
  check('125) y no hay que arrastrar para ver los destinos', /flexWrap: 'wrap'/.test(crearCrudo));

  /*
   * ─── Lo que el usuario prohibió expresamente ──────────────────────────────
   *
   * Estas no son estilo: son promesas. La referencia visual traía secciones que
   * en Weë NO existen y una tercera entidad combinada; si alguien las copia
   * literalmente en una vuelta futura, esto lo para.
   */
  const SECCIONES_INVENTADAS = ['Weë Kids', 'Weë Health', 'Weë Education', 'Weë Community'];
  check('126) no se inventan secciones que Weë no tiene', SECCIONES_INVENTADAS.every((s) => !crearCrudo.includes(s)));
  check('126) ni una tarjeta combinada "Travel y Muro"', !/Travel y Muro/.test(crearCrudo));
  check('126) ni un bloque WeeTags aparte de los destinos', !/WeeTags/.test(crearCrudo));
  check('126) Brain no es destino social', /DESTINO_BRAIN_EXCLUIDO/.test(fuente));
  check('126) el límite de texto sigue siendo el de Weë', /const maxTextLength = 500;/.test(crearCrudo) && !/maxTextLength = 2000/.test(crearCrudo));

  /*
   * La jerarquía de los destinos: cara, nombre y estado. Un radio pelado no
   * distingue "Weë Chef" de "Weë Music" hasta que lo lees; el emoji sí, y sale
   * del catálogo de Weë para que no haya dos verdades.
   */
  check('126) cada destino trae su cara del catálogo de Weë', /getExperienceById\(destino\.id\)/.test(crearCrudo) && /destinoEmoji/.test(crearCrudo));
  check('126) y el muro general lleva la suya, que no es una experiencia: el globo', /name="globe-outline"/.test(crearCrudo.slice(crearCrudo.indexOf('const renderDestinos'), crearCrudo.indexOf('const renderPublicar'))));
  check('126) el aro cae siempre en el mismo sitio: pegado al borde derecho del chip', /destino: \{\s*flexGrow: 1,\s*flexDirection: 'row',\s*alignItems: 'center',/.test(crearCrudo) && /destinoCheck: \{[\s\S]{0,120}marginLeft: 'auto',/.test(crearCrudo));
  // Y el nombre entero: en una sola fila se cortaba —"Muro ge…"— y lo vimos en el teléfono.
  check('126) y el nombre del destino cabe entero: encoge antes que cortarse', /destinoTexto: \{\s*flexShrink: 1,/.test(crearCrudo) && crearCrudo.indexOf('styles.destinoIcono') < crearCrudo.indexOf('styles.destinoTexto'));

  // Y el final de la pantalla respira: nada pegado al borde de abajo.
  check('126) el contenido no queda pegado al botón de publicar', /scrollContent: \{[\s\S]{0,160}paddingBottom: SPACING\.xl,/.test(crearCrudo));
}

console.log('\n── 127 · El workspace "Nueva publicación", rediseñado ──');
{
  const crudo = leer('screens/CreateScreen.tsx');
  const pila = leer('navigation/MainStackNavigator.tsx');
  const pestanas = leer('navigation/TabNavigator.tsx');
  const bloque = (desde, hasta) => crudo.slice(crudo.indexOf(desde), crudo.indexOf(hasta));
  const cabecera = bloque('const renderPublicar', 'const styles = StyleSheet.create').slice(0); // la cabecera va en el return, después de renderPublicar
  const acciones = bloque('const renderAcciones', 'const renderDestinos');
  const destinosJsx = bloque('const renderDestinos', 'const renderPublicar');
  const publicar = bloque('const renderPublicar', 'const renderEContacts');
  const papel = bloque('const renderTextInput', 'const sinSitioParaMedios');
  const estilos = crudo.slice(crudo.indexOf('const styles = StyleSheet.create'));

  /*
   * UN SOLO WORKSPACE. Se rediseñó la pantalla que había, no se hizo otra: la
   * ruta `Create` sigue montando `CreateWrapper` → `CreateScreen`, una vez, y
   * el Home sigue llegando aquí con `directo` sin desplegar nada.
   */
  check('127a) Create sigue registrada una sola vez y monta el mismo CreateScreen',
    (pila.match(/name="Create"\s*component=\{CreateWrapper\}/g) || []).length === 1 && (pila.match(/<CreateScreen \/>/g) || []).length === 2 && !/CreateScreen/.test(pestanas));
  check('127a) y no hay un segundo compositor en el cliente', !fs.readdirSync(path.resolve(here, '../../screens')).some((f) => /Create.*Screen\.tsx$/.test(f) && f !== 'CreateScreen.tsx'));
  check('127a) el Home sigue llegando directo, sin chevron ni pliegue', /const desplegable = !compact && !directo;/.test(leer('components/creator/ComposerEntry.tsx')) && /variante="home" directo/.test(leer('screens/LandingScreen.tsx')));
  check('127a) y los muros de sección siguen plegándose', !/directo/.test(soloCodigo(leer('components/creator/SectionWall.tsx'))));

  /* La cabecera: aspa de Back, "Nueva publicación" y un Publicar rápido que se apaga. */
  check('127b) Back es el aspa, con el cierre de siempre: goBack', /const handleClose = \(\) => \{\s*navigation\.goBack\(\);/.test(crudo) && /onPress=\{handleClose\}[\s\S]{0,300}accessibilityLabel="Back"[\s\S]{0,120}name="close"/.test(crudo));
  check('127b) y no volvió Cancelar a la cabecera', !/>Cancelar<\/Text>/.test(crudo) && (crudo.match(/text: 'Cancelar', style: 'cancel'/g) || []).length === 2);
  check('127b) el título es Nueva publicación', /headerTitulo[\s\S]{0,80}>Nueva publicación<\/Text>/.test(crudo) && !/Crear publicación<\/Text>/.test(crudo));
  check('127b) el Publicar de arriba se apaga sin contenido y lo anuncia',
    /styles\.postButton, \{ backgroundColor: canPublish \? theme\.colors\.accent : theme\.colors\.accent \+ '24' \}/.test(crudo) && /disabled=\{!canPublish\}[\s\S]{0,200}accessibilityState=\{\{ disabled: !canPublish, busy: isPublishing \}\}/.test(crudo));
  check('127b) sin línea bajo la cabecera: un solo flujo', !/borderBottomWidth/.test(estilos.slice(estilos.indexOf('header: {'), estilos.indexOf('cerrar: {'))));
  check('127b) el aspa mide 44', /cerrar: \{\s*width: 44,\s*height: 44,/.test(estilos));

  /* Quién publica y quién puede verlo. */
  check('127c) avatar, nombre y "Comparte con la comunidad de Weë"', /styles\.identidadNombre[\s\S]{0,200}userProfile\?\.displayName/.test(crudo) && /Comparte con la comunidad de Weë/.test(crudo));
  check('127c) la píldora de visibilidad dice Público, con su globo y su flecha',
    /accessibilityLabel="Visibilidad: Público"[\s\S]{0,300}name="globe-outline"[\s\S]{0,200}>Público<\/Text>[\s\S]{0,120}name="chevron-down"/.test(crudo));
  /*
   * Y dice la verdad: hoy TODA publicación es pública (`isPrivate: false`) y
   * ningún muro filtra por audiencia. Tocarla lo explica; no inventa un
   * selector con una sola opción ni un campo nuevo en la publicación.
   */
  check('127c) y conserva la lógica que hay: todo es público', /isPrivate: false,/.test(crudo) && /onPress=\{explicarVisibilidad\}/.test(crudo) && /explicarVisibilidad = \(\) => notify\('Público'/.test(crudo) && !/visibility:|audience:|setVisibilidad/.test(crudo));

  /* El papel. */
  check('127d) la hoja: placeholder "Escribe algo…", sin título ni ayuda', /'Escribe algo…'/.test(crudo) && /placeholder=\{composerPlaceholder\}/.test(papel) && !/textoPregunta|textoAyuda/.test(crudo));
  check('127d) con su contador 0/500 dentro y el mismo límite de siempre', /const maxTextLength = 500;/.test(crudo) && /\{postText\.length\}\/\{maxTextLength\}/.test(papel) && /textoContador: \{\s*alignSelf: 'flex-end'/.test(estilos));
  check('127d) esquinas generosas, marco de un punto y sin sombra', /tarjetaTexto: \{\s*borderWidth: 1,\s*borderRadius: BORDER_RADIUS\.xl,/.test(estilos) && !/tarjetaTexto: \{[\s\S]{0,200}shadow/.test(estilos));
  check('127d) sin emoji, # ni @ dentro del papel', !/happy-outline|📹|'#'|'@'/.test(papel));
  check('127d) y el contador flotante de antes se fue', !/contadorFijo|textProgress/.test(crudo));

  /* Las herramientas: seis, en una fila, sin Más. */
  const orden = [...acciones.matchAll(/texto="([^"]+)"/g)].map((m) => m[1]);
  check('127e) seis herramientas en su orden', orden.join(' · ') === 'Cámara · Multimedia · ËContact · Ubicación · Encuesta · Mis proyectos', orden.join(' · '));
  check('127e) sin "Más", sin "…", sin chevron', !/texto="Más"|ellipsis-horizontal|chevron-down|>Más<\/Text>/.test(acciones));
  check('127e) cada una es un botón con icono de trazo, cuadrado suave y nombre debajo',
    /const Accion: React\.FC/.test(crudo) && /accessibilityRole="button"/.test(bloque('const Accion', 'const renderAcciones')) && /styles\.accionIcono/.test(crudo) && /accionIcono: \{\s*width: scale\(48\),\s*height: scale\(48\),/.test(estilos) && /-outline"/.test(acciones));
  check('127e) y anuncia si está puesta o apagada', /accessibilityState=\{\{ disabled: !!apagada, selected: !!activa \}\}/.test(crudo));
  check('127e) Multimedia sigue siendo la puerta de fotos y vídeo, con su recuento', /texto="Multimedia"[\s\S]{0,200}onPress=\{pickImageFromGallery\}/.test(acciones) && /insignia=\{fotosPuestas > 0 \? `\$\{fotosPuestas\}\/\$\{topeImagenes\}` : undefined\}/.test(acciones));
  check('127e) ËContact abre la agenda, Ubicación su pantalla y Encuesta la suya', /texto="ËContact"[\s\S]{0,120}setShowEContacts/.test(acciones) && /texto="Ubicación" onPress=\{abrirUbicacion\}/.test(acciones) && /texto="Encuesta" onPress=\{handlePollPress\}/.test(acciones));

  /*
   * MIS PROYECTOS abre la lista de proyectos que ya existe —la misma ruta que
   * usa el menú ☰—, encima del compositor. Sin sistema nuevo ni campo nuevo.
   */
  check('127f) Mis proyectos abre la ruta Projects que ya existe', /texto="Mis proyectos" onPress=\{abrirProyectos\}/.test(acciones) && /abrirProyectos = \(\) => \(navigation as any\)\.navigate\('Projects'\)/.test(crudo));
  check('127f) y esa ruta está registrada, y es la del menú', /name="Projects" component=\{ProjectsScreen\}/.test(pila) && /navigateRoot\('Projects'\)/.test(leer('components/DrawerMenu.tsx')));
  check('127f) sin inventar otro sistema de proyectos', !/projectsService|projectId/.test(crudo));

  /* PUBLICAR EN: rótulo pequeño, chips, selección múltiple con estado sutil. */
  check('127g) el rótulo es PUBLICAR EN, pequeño y en mayúsculas', />\s*PUBLICAR EN\s*<\/Text>/.test(destinosJsx) && /destinosRotulo: \{\s*fontSize: FONT_SIZE\.xs,[\s\S]{0,80}letterSpacing: 1,/.test(estilos));
  check('127g) los destinos salen de la fuente única y el muro general va primero', /destinosDisponibles\(\)\.map/.test(destinosJsx) && /const \[destinos, setDestinos\] = useState<string\[\]>\(\(\) => \[sourceSection \|\| MURO_GENERAL\]\);/.test(crudo));
  /* La selección múltiple se EJECUTA: es el mismo reductor que usa la pantalla. */
  const reductor = crudo.match(/setDestinos\(\(actuales\) => (\(actuales\.includes\(id\) \? [^\n]*\]\))\);/);
  const alternar = reductor ? new Function('actuales', 'id', 'return ' + reductor[1]) : null;
  check('127g) marcar añade, volver a marcar quita, y caben varios a la vez',
    !!alternar && alternar(['general'], 'chef').join(',') === 'general,chef' && alternar(['general', 'chef'], 'chef').join(',') === 'general' && alternar(['general', 'chef'], 'travel').length === 3,
    reductor ? '' : 'no encuentro el reductor');
  check('127g) cada chip es una casilla que anuncia si está marcada', /accessibilityRole="checkbox"[\s\S]{0,60}accessibilityState=\{\{ checked: elegido \}\}/.test(destinosJsx));
  check('127g) el elegido se ve sin depender solo del color: fondo crema, borde fino y check',
    /backgroundColor: elegido \? theme\.colors\.accent \+ '14' : theme\.colors\.card/.test(destinosJsx) && /borderColor: elegido \? theme\.colors\.accent \+ '99' : theme\.colors\.border/.test(destinosJsx) && /\{elegido && <Ionicons name="checkmark"/.test(destinosJsx));
  check('127g) y el amarillo pesado se fue: ni fondo amarillo del bloque ni tarjetas dentro de tarjetas', !/styles\.destinos, \{ backgroundColor/.test(crudo) && !/destinosCabecera|destinosIcono/.test(crudo));
  check('127g) dos por fila en un teléfono: chips de ancho natural que se reparten el hueco', /destino: \{\s*flexGrow: 1,/.test(estilos) && !/flexBasis/.test(estilos.slice(estilos.indexOf('destino: {'), estilos.indexOf('destinoIcono: {'))) && /destinosRejilla: \{\s*flexDirection: 'row',\s*flexWrap: 'wrap',/.test(estilos));

  /* El botón de publicar, con sus estados. */
  check('127h) el botón principal va al pie, dentro del espacio del teclado', crudo.indexOf('{renderPublicar()}') > crudo.indexOf('</ScrollView>') && crudo.indexOf('{renderPublicar()}') < crudo.indexOf('</EspacioDeEscritura>'));
  check('127h) grande, redondo y con el avión de papel', /publicar: \{[\s\S]{0,160}minHeight: 56,\s*borderRadius: BORDER_RADIUS\.full,/.test(estilos) && /name="paper-plane-outline"/.test(publicar));
  check('127h) apagado es pálido y gris; listo es dorado con sombra corta', /theme\.colors\.accent \+ '33'/.test(publicar) && /styles\.publicarListo, \{ backgroundColor: theme\.colors\.accent, shadowColor: theme\.colors\.accent \}/.test(publicar) && /publicarListo: \{\s*shadowOffset/.test(estilos));
  check('127h) se hunde al tocarlo', /onPressIn=\{\(\) => canPublish && presionar\(0\.97\)\}/.test(publicar) && /onPressOut=\{\(\) => presionar\(1\)\}/.test(publicar));
  check('127h) publicando enseña la rueda y no admite un segundo toque', /isPublishing \? \(\s*<ActivityIndicator/.test(publicar) && /const canPublish = hasContent && !isTextOverLimit && !isPublishing && isPollValid;/.test(crudo) && /disabled=\{!canPublish\}/.test(publicar));
  check('127h) y lo anuncia: disabled y busy', /accessibilityState=\{\{ disabled: !canPublish, busy: isPublishing \}\}/.test(publicar));
  check('127h) publica lo mismo de siempre y vuelve al muro', (crudo.match(/postsService\.create\(postData\)/g) || []).length === 1 && /navigation\.goBack\(\);\s*triggerRefresh\(\);\s*triggerScrollToTop\(\);/.test(crudo));

  /* Lo que se fue, se fue. */
  check('127i) sin textos redundantes ni bloques explicativos', !/¿Dónde quieres publicar\?|Elige una o más comunidades|Sugerir con IA|Tu publicación aparecerá|Puedes elegir una o más opciones/.test(crudo));
  check('127i) ni IA ni Credits en el compositor', !/spendCredits|creditsService|gemini|creatorService|brainService/i.test(crudo));

  /* Teclado, scroll y ancho. */
  check('127j) el teclado se acomoda con la pieza común y un solo scroll', /<EspacioDeEscritura/.test(crudo) && (crudo.match(/<ScrollView/g) || []).length === 1 && !/ScrollView\s+horizontal/.test(acciones));
  check('127j) el scroll deja pasar los toques con el teclado abierto', /keyboardShouldPersistTaps="handled"/.test(crudo));
  check('127j) contenido y botón comparten el mismo ancho máximo', /maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' \}/.test(crudo.slice(crudo.indexOf('<ScrollView'))) && /maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' \}\]/.test(publicar));
  check('127j) el orden de la pantalla: quién · qué · con qué · dónde · Publicar',
    ['styles.identidad', '{renderTextInput()}', '{renderLugar()}', '{renderMediaPreview()}', '{renderPoll()}', '{renderAcciones()}', '{renderEContacts()}', '{renderDestinos()}', '{renderPublicar()}'].every((m, i, l) => i === 0 || crudo.indexOf(l[i - 1]) < crudo.indexOf(m)));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nCompositor global: un compositor, diez fotos, quince segundos y los destinos que elija quien publica');
process.exit(failures ? 1 : 0);
