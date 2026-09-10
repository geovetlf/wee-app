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
  check('109) el lugar sí empieza cerrado', /const \[showPlace, setShowPlace\] = useState\(false\)/.test(crear));

  /*
   * Lo que se puede añadir vive en mosaicos pegados al texto. Antes eran iconos
   * sueltos en una barra anclada al fondo de la pantalla —a media pantalla del
   * texto en un móvil alto— y dos cajas grandes flotando en medio.
   */
  check('110) las acciones van en mosaicos, no en una barra al fondo', /const renderAcciones = \(\) => \(/.test(crear) && !/renderToolbar/.test(crear));
  check('110) y cada una dice lo que hace, no solo un icono', ['Foto o vídeo', 'Cámara', 'Ubicación', 'ËContact', 'Encuesta'].every((t) => crear.includes(`texto="${t}"`) || crear.includes(`'${t}'`)));

  /*
   * ËContact será el nombre de la red de conexiones de Weë en todos los idiomas.
   * Su sitio está reservado y apagado: sin backend detrás, un botón que
   * prometiera etiquetar gente estaría mintiendo.
   */
  check('110) ËContact reserva su sitio sin prometer nada', /texto="ËContact" onPress=\{\(\) => \{\}\} apagada/.test(crear));
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
  check('110) las cinco acciones van en el orden aprobado', ordenAcciones.join(' · ') === 'Cámara · Foto o vídeo · ËContact · Ubicación · Encuesta', ordenAcciones.join(' · '));

  /*
   * `MediaTypeOptions.All` está obsoleto y en el teléfono llegaba al selector de
   * Google SIN tipos MIME: solo enseñaba fotos, con el botón diciendo "Foto o
   * vídeo". La lista moderna sí pide las dos cosas. Comprobado en el aparato.
   */
  check('110) foto y vídeo son la misma puerta, y se dice', /mediaTypes: \['images', 'videos'\]/.test(leer('screens/CreateScreen.tsx')) && /Foto o vídeo/.test(crear));
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
  check('110) la cabecera dice qué estás haciendo', /Crear publicación<\/Text>/.test(crear) && /Publicar<\/Text>/.test(crear));
  check('110) el panel de lugar no trae cabecera propia: la trae su botón', /const renderPlace = \(\) =>\s*\n?\s*showPlace \|\| place \? \(/.test(crear));

  /*
   * MOSAICOS (fase 2E-76, modelo visual del usuario). Eran píldoras en una fila
   * que se arrastraba, y arrastrando se escondían la mitad: quien no lo hacía
   * nunca supo que había encuesta. Ahora las cinco están a la vista en dos filas.
   */
  check('110) las herramientas son mosaicos y se ven las cinco sin arrastrar', /minHeight: 72,/.test(crear) && !/ScrollView horizontal[\s\S]{0,240}styles\.acciones/.test(crear));
  check('110) el recuento no se mete dentro del nombre del botón', /texto="Foto o vídeo"/.test(crear) && /insignia=\{fotosPuestas > 0/.test(crear));
  check('110) y el campo de texto crece en vez de reservar el hueco', /minHeight: scale\(72\)/.test(crear) && !/minHeight: scale\(220\)/.test(crear));

  /*
   * El hueco de doce por ciento que se vio en el teléfono venía de que la
   * pregunta era el placeholder DEL campo y la ayuda iba detrás: la altura del
   * campo se metía entre las dos. Ahora van seguidas y el campo va después.
   */
  const fuenteCrear = leer('screens/CreateScreen.tsx');
  check('111b) la pregunta y la ayuda van pegadas, antes del campo', fuenteCrear.indexOf('styles.textoPregunta') < fuenteCrear.indexOf('styles.textoAyuda') && fuenteCrear.indexOf('styles.textoAyuda') < fuenteCrear.indexOf('style={[styles.textInput'));
  check('111b) y el campo ya no lleva la pregunta dentro', /placeholder=""/.test(crear));

  /*
   * Y el defecto que encontró la validación: al elegir, el chip se ensanchaba
   * —ganaba icono y negrita— y la rejilla entera se recolocaba bajo el dedo.
   */
  check('111b) el hueco del check está reservado siempre', /styles\.destinoCheck,/.test(crear) && /destinoCheck: \{\s*width: scale\(20\),\s*height: scale\(20\)/.test(crear));
  check('111b) y el peso de la letra no cambia al elegir', !/fontWeight: elegido \?/.test(crear));
  check('110) el botón se enciende cuando ya lleva algo puesto', /activa=\{!!place \|\| showPlace\}/.test(crear) && /activa=\{attachedMedia\.length > 0\}/.test(crear));

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
  check('122) sin pasarse del tope al elegir', /selectionLimit: hasVideo \? 0 : maxImages - attachedMedia\.length/.test(crearCrudo));
  check('122) la píldora dice cuántas llevas', /\$\{fotosPuestas\}\/\$\{maxImages\}/.test(crearCrudo));
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
  // Al tope, la puerta se cierra: no hay foto once ni por la galería ni por la cámara.
  check('125) al llegar al tope no se puede añadir más', /const sinSitioParaMedios = attachedMedia\.length >= maxImages/.test(crearCrudo) && /apagada=\{sinSitioParaMedios\}/.test(crearCrudo));
  // Y se puede quitar cualquiera de las que ya están.
  check('125) cada medio puesto se puede quitar', /onPress=\{\(\) => removeMedia\(media\.id\)\}/.test(crearCrudo));

  // Lo que se escribe vive en una tarjeta con su contador dentro, no en un renglón suelto.
  check('125) la caja de escribir es una tarjeta cerrada', /tarjetaTexto: \{\s*borderWidth: 1,/.test(crearCrudo));
  check('125) que dice cuánto llevas de cuánto cabe', /\{postText\.length\}\/\{maxTextLength\}/.test(crearCrudo));

  // Dónde publicar es una pregunta con su bloque, no el último campo del formulario.
  check('125) dónde publicar se pregunta en voz alta', /¿Dónde quieres publicar\?/.test(crearCrudo) && /Puedes elegir una o más opciones\./.test(crearCrudo));
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
  check('126) y el muro general lleva la suya, que no es una experiencia', /name="people"/.test(crearCrudo));
  check('126) el aro cae siempre en el mismo sitio', /destinoFila: \{\s*flexDirection: 'row',\s*alignItems: 'center',\s*justifyContent: 'space-between',/.test(crearCrudo));
  // Y el nombre entero: en una sola fila se cortaba —"Muro ge…"— y lo vimos en el teléfono.
  check('126) y el nombre del destino cabe entero', crearCrudo.indexOf('styles.destinoFila') < crearCrudo.indexOf('styles.destinoTexto'));

  // Y el final de la pantalla respira: nada pegado al borde de abajo.
  check('126) el contenido no queda pegado al fondo', /paddingBottom: SPACING\.xxl/.test(crearCrudo));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nCompositor global: un compositor, diez fotos, quince segundos y los destinos que elija quien publica');
process.exit(failures ? 1 : 0);
