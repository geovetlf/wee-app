/**
 * Las experiencias de Weë Creator (docs/CREATOR.md §1 y §8).
 *
 * Once existen; nueve se ven. Weë Travel es la última en llegar (fase 2E-64C). Weë Photo y Weë Beauty dejaron de ser secciones
 * del menú y pasaron a ser áreas dentro de Weë Studio (fase 2E-50), pero sus
 * identificadores, sus plantillas y sus rutas siguen enteros: de eso vive todo
 * el trabajo ya creado. Por eso hay dos listas y no una.
 *
 * "El usuario elige el resultado. Weë elige la IA."
 * Cada experiencia es un especialista visible; por detrás puede usar una o
 * varias APIs, modelos y servicios. La persona nunca ve proveedores ni prompts.
 *
 * No confundir con las categorías sociales de "Explora comunidades"
 * (constants/communityCategories.ts): aquí van RESULTADOS, allá van PERSONAS.
 *
 * Fuente única para el menú ☰, la pantalla Weë Creator y el registro de interés.
 */

import { NombreDeIcono } from '../components/icons/trazosDeWee';
import type { CodigoDeIdioma } from '../i18n/idiomas';

/** Una clave de i18n, no el texto. Lo resuelve quien pinta. */
export type ClaveDeTexto = string;

export interface WeeExperience {
  id: string;
  /** Nombre de identidad (Weë Design, Weë Studio…). No traducir ni cambiar. */
  name: string;
  /**
   * El icono dibujado, de `components/icons/trazosDeWee`. Lo pinta el cajón.
   *
   * El emoji de identidad de cada experiencia (🎨 Weë Design, 🎬 Weë Studio…) se
   * queda: lo usan sus propias pantallas y es parte de su nombre. Esto es otra
   * cosa: la versión dibujada, para que en el menú las once se vean de la misma
   * familia y no once dibujos del sistema operativo puestos en columna.
   */
  icono: NombreDeIcono;
  emoji: string;
  /**
   * La clave de i18n de la descripción. Lo que se PINTA sale de aquí.
   *
   * El NOMBRE no lleva clave y no la va a llevar: "Weë Design" es marca y se
   * escribe igual en todos los idiomas, como Instagram o Photoshop. Lo que se
   * traduce es lo que la describe.
   */
  claveDescripcion: ClaveDeTexto;
  /** La descripción en español. Documentación de esta tabla y red de seguridad. */
  description: string;
  /**
   * Pedidos típicos en lenguaje normal, en CLAVES de i18n: se enseñan como
   * ejemplos y por eso se traducen, igual que `claveDescripcion`.
   */
  examples: ClaveDeTexto[];
  /**
   * Palabras clave de la búsqueda "¿Qué quieres crear?".
   *
   * NO son interfaz y por eso no se traducen: nadie las lee, se comparan con lo
   * que alguien escribe. Traducirlas sería cambiar a dónde va una búsqueda, que
   * es lógica y no texto. Por eso esta lista se queda como está, y lo que escribe
   * quien usa Weë en otro idioma se reconoce con `PALABRAS_POR_IDIOMA`, que AÑADE
   * palabras y nunca quita ni cambia estas.
   */
  keywords: string[];
}

/**
 * Todas, sin excepción. Es la lista con la que se resuelve un identificador:
 * un trabajo de hace meses tiene que seguir abriéndose con su nombre y su emoji.
 */
export const ALL_EXPERIENCES: WeeExperience[] = [
  {
    id: 'design',
    icono: 'pincel',
    claveDescripcion: 'creator.design',
    name: 'Weë Design',
    emoji: '🎨',
    description: 'Logos, posters, ilustraciones y material para tus redes',
    examples: ['creator.designEx1', 'creator.designEx2', 'creator.designEx3'],
    keywords: ['logo', 'diseño', 'diseno', 'post', 'flyer', 'banner', 'afiche', 'poster', 'portada', 'marca', 'branding', 'ilustración', 'ilustracion', 'sticker', 'tarjeta', 'invitación', 'invitacion', 'dibujo', 'arte', 'creatividad', 'redes', 'cartel', 'contraportada', 'logotipo'],
  },
  {
    id: 'studio',
    icono: 'claqueta',
    claveDescripcion: 'creator.studio',
    name: 'Weë Studio',
    emoji: '🎬',
    // La propuesta principal de la sección, tal cual (fases 2E-52 y 2E-53): esta
    // línea se lee en la tarjeta de Weë Studio dentro de Weë Creator, y dice lo
    // mismo que el hero. Beauty no entra aquí a propósito —tiene su propia
    // descripción dentro del selector— para no repartir el mensaje principal.
    description: 'Crea y transforma fotos y videos con IA.',
    examples: ['creator.studioEx1', 'creator.studioEx2', 'creator.studioEx3'],
    keywords: ['video', 'weel', 'weël', 'reel', 'clip', 'anuncio', 'comercial', 'publicidad', 'animación', 'animacion', 'corto', 'película', 'pelicula', 'trailer', 'subtítulos', 'subtitulos', 'promocionar', 'tiktok', 'youtube', 'historia visual', 'videoclip', 'cortometraje', 'youtuber', 'tiktoker'],
  },
  {
    id: 'photo',
    icono: 'camara',
    claveDescripcion: 'creator.photo',
    name: 'Weë Photo',
    emoji: '📸',
    description: 'Mejora, restaura y transforma tus fotos',
    examples: ['creator.photoEx1', 'creator.photoEx2', 'creator.photoEx3'],
    keywords: ['foto', 'fotos', 'fotografía', 'fotografia', 'imagen', 'retocar', 'mejorar', 'fondo', 'restaurar', 'retrato', 'filtro', 'eliminar', 'quitar', 'objeto', 'avatar', 'selfie', 'perfil', 'nitidez', 'calidad', 'borrosa', 'autorretrato', 'fotomontaje'],
  },
  {
    id: 'writer',
    icono: 'documento',
    claveDescripcion: 'creator.writer',
    name: 'Weë Writer',
    emoji: '✍️',
    description: 'Publicaciones, historias, guiones, emails y libros',
    examples: ['creator.writerEx1', 'creator.writerEx2', 'creator.writerEx3'],
    keywords: ['texto', 'guion', 'guión', 'escribir', 'redactar', 'historia', 'cuento', 'libro', 'ebook', 'bio', 'novela', 'blog', 'artículo', 'articulo', 'caption', 'publicación', 'publicacion', 'descripción', 'descripcion', 'biografía', 'biografia', 'poema', 'carta', 'email', 'correo', 'corregir', 'idea', 'reescribir', 'microcuento', 'minicuento', 'blogger', 'bloguero'],
  },
  {
    id: 'music',
    icono: 'notas',
    claveDescripcion: 'creator.music',
    name: 'Weë Music',
    emoji: '🎵',
    description: 'Canciones, música instrumental, voces y narración',
    examples: ['creator.musicEx1', 'creator.musicEx2', 'creator.musicEx3'],
    keywords: ['música', 'musica', 'canción', 'cancion', 'jingle', 'beat', 'melodía', 'melodia', 'instrumental', 'audio', 'sonido', 'voz', 'locución', 'locucion', 'podcast', 'narración', 'narracion', 'doblaje'],
  },
  {
    id: 'beauty',
    icono: 'belleza',
    claveDescripcion: 'creator.beauty',
    name: 'Weë Beauty',
    emoji: '💄',
    description: 'Maquillaje, cabello, barba, outfits y cambios de look',
    examples: ['creator.beautyEx1', 'creator.beautyEx2', 'creator.beautyEx3'],
    keywords: ['belleza', 'maquillaje', 'peinado', 'corte', 'cabello', 'pelo', 'look', 'outfit', 'ropa', 'estilo', 'uñas', 'uña', 'piel', 'moda', 'barba', 'lentes', 'color de cabello', 'verme'],
  },
  {
    id: 'chef',
    icono: 'gorro',
    claveDescripcion: 'creator.chef',
    name: 'Weë Chef',
    emoji: '👨‍🍳',
    description: 'Tu chef personal: qué cocinar, recetas y menús',
    examples: ['creator.chefEx1', 'creator.chefEx2', 'creator.chefEx3'],
    keywords: ['receta', 'cocina', 'cocinar', 'comida', 'menú', 'menu', 'plato', 'ingredientes', 'dieta', 'saludable', 'cena', 'almuerzo', 'desayuno', 'postre', 'restaurante', 'sustituir', 'chef'],
  },
  {
    id: 'home',
    icono: 'casa',
    claveDescripcion: 'creator.home',
    name: 'Weë Home',
    emoji: '🏠',
    description: 'Decoración, diseño interior, remodelación y jardines',
    examples: ['creator.homeEx1', 'creator.homeEx2', 'creator.homeEx3'],
    keywords: ['casa', 'hogar', 'decoración', 'decoracion', 'decorar', 'sala', 'cuarto', 'habitación', 'habitacion', 'dormitorio', 'interior', 'muebles', 'jardín', 'jardin', 'remodelar', 'remodelación', 'remodelacion', 'espacio', 'oficina', 'baño', 'bano', 'exterior', 'patio', 'jardinería', 'jardineria', 'interiorismo'],
  },
  {
    id: 'business',
    icono: 'maletin',
    claveDescripcion: 'creator.business',
    name: 'Weë Business',
    emoji: '💼',
    description: 'Ideas de negocio, marketing, CV, documentos y presentaciones',
    examples: ['creator.businessEx1', 'creator.businessEx2', 'creator.businessEx3'],
    keywords: ['negocio', 'emprendimiento', 'emprender', 'marketing', 'ventas', 'vender', 'presentación', 'presentacion', 'pitch', 'plan', 'campaña', 'campana', 'cliente', 'clientes', 'tienda', 'empresa', 'estrategia', 'publicidad', 'precio', 'cv', 'cvs', 'currículum', 'curriculum', 'documento', 'análisis', 'analisis', 'trabajo'],
  },
  {
    id: 'travel',
    icono: 'avion',
    claveDescripcion: 'creator.travel',
    name: 'Weë Travel',
    emoji: '✈️',
    description: 'Prepara tu viaje: a dónde ir, qué hacer y cómo moverte',
    examples: ['creator.travelEx1', 'creator.travelEx2', 'creator.travelEx3'],
    keywords: ['viaje', 'viajar', 'viajes', 'vacaciones', 'itinerario', 'destino', 'destinos', 'turismo', 'turista', 'vuelo', 'vuelos', 'hotel', 'hoteles', 'playa', 'mochilero', 'ruta', 'excursión', 'excursion', 'maleta', 'pasaporte', 'visa', 'aeropuerto', 'tren', 'crucero', 'guía', 'guia', 'ciudad', 'país', 'pais', 'extranjero', 'viajero'],
  },
  {
    id: 'brain',
    icono: 'cerebro',
    claveDescripcion: 'creator.brain',
    name: 'Weë Brain',
    emoji: '🧠',
    description: '¿No sabes dónde buscar? Pregúntale a Weë',
    examples: ['creator.brainEx1', 'creator.brainEx2', 'creator.brainEx3'],
    keywords: ['ayuda', 'ayúdame', 'ayudame', 'pregunta', 'pensar', 'aprender', 'explicar', 'explícame', 'explicame', 'resumen', 'resumir', 'organizar', 'planear', 'planificar', 'estudiar', 'tarea', 'investigar', 'investigación', 'investigacion', 'traducir', 'traduce', 'problema', 'consejo', 'no sé', 'ayudar', 'preguntar'],
  },
];

/**
 * Las que aparecen como sección en el menú ☰, en la barra lateral y en la
 * pantalla que las reúne. Photo y Beauty no están: se entra a ellas desde el
 * selector de Weë Studio. Home tampoco: entra por el de Weë Design, donde se
 * llama Hogar & Diseño (fase 2E-56). Y Weë Writer tampoco: pasa a ser una
 * función más del selector de Weë Studio.
 *
 * Esconder una sección no esconde NADA de lo que sabe hacer: sigue en
 * `ALL_EXPERIENCES`, `getExperienceById` la resuelve, `matchExperiences` la
 * encuentra por sus palabras, su plantilla y sus planes están intactos y sus
 * trabajos históricos siguen abriendo donde abrían. Solo deja de tener puerta
 * propia en el menú.
 */
export const HIDDEN_AS_SECTION: string[] = ['photo', 'beauty', 'home', 'writer'];

/**
 * EN QUÉ ORDEN SE VEN, Y AQUÍ SE DECIDE (decisión del usuario, 2026-09-15).
 *
 * El orden del menú no puede salir del orden en que estén escritas arriba: esa
 * lista es el registro de identificadores —se ordena por cuándo nació cada una—
 * y mover un bloque de treinta líneas para cambiar un sitio en el menú es una
 * forma muy cara de decir "Brain primero".
 *
 * Así que se dice aquí, con los identificadores y en una línea. Lo que se lee es
 * lo que se ve, y se ve igual en los dos menús —el ☰ del teléfono y la barra
 * lateral—, en Android y en web, y con el Perfil Real y con el Perfil Weë: el
 * orden no depende del perfil, porque no hay ningún `isWee` que lo mire.
 *
 * Weë Brain va primero porque es la puerta de quien no sabe a cuál entrar.
 */
export const ORDEN_EN_EL_MENU: string[] = [
  'brain',
  'studio',
  'design',
  'music',
  'chef',
  'business',
  'travel',
];

/**
 * Las que se ven, en su orden. Se arma con la lista de arriba y, detrás, lo que
 * no esté nombrado allí: una experiencia nueva aparece al final en vez de
 * desaparecer sin que nadie se entere.
 */
export const WEE_EXPERIENCES: WeeExperience[] = (() => {
  const visibles = ALL_EXPERIENCES.filter((e) => !HIDDEN_AS_SECTION.includes(e.id));
  const ordenadas = ORDEN_EN_EL_MENU
    .map((id) => visibles.find((e) => e.id === id))
    .filter((e): e is WeeExperience => !!e);
  const resto = visibles.filter((e) => !ORDEN_EN_EL_MENU.includes(e.id));
  return [...ordenadas, ...resto];
})();

/**
 * Lo que escribe quien usa Weë en otro idioma, por experiencia.
 *
 * Sin esto, quien escribe «opskrift» en danés leía «Weë todavía no hace eso»
 * —falso: Weë Chef lo hace—, porque solo se reconocían palabras en español.
 *
 * Reglas, para que nada cambie para nadie más:
 *  · en su idioma SUSTITUYEN a las `keywords`, que son españolas; en español la búsqueda es la de siempre;
 *  · solo cuentan las del idioma de la app de esa persona (`matchExperiences(q, idioma)`, `useIdioma().idioma`);
 *  · se comparan con más cuidado que las españolas (`encajaEnSuIdioma`): una frase solo cuenta entera y como
 *    palabras sueltas —«my home» no está dentro de «my homework»—; una palabra cuenta si lo escrito empieza por ella
 *    («opskrifter»), si va dentro de una palabra compuesta y tiene al menos cuatro letras («aftensmadsopskrift»), o
 *    si alguien la está tecleando y ya lleva cuatro letras («opsk»). Con tres letras no basta: «lav», «mor» o «mit»
 *    son palabras de cada día y no el principio de una búsqueda;
 *  · y aun así no entran palabras que son el principio de otras de uso diario: ni «mad» (sería Madrid), ni «hus»
 *    (huske), ni «tog» (el pasado de «tage»), ni «look» (looking), ni «train» (training), ni «hjem» (hjemmeside), ni
 *    «klip» (klipning), ni «bage» (bagefter), ni «kunst» (kunstig intelligens), ni «hair» (chair), ni «work»
 *    (homework), ni «kok» (kokos). Para esas va la forma larga.
 *
 * El filipino (`fil`) lleva, además de las suyas, las de la lista inglesa: en Filipinas se teclea en taglish («gawa
 * ng logo para sa business ko»). Y como el filipino pega afijos y enlaces a la palabra, mira las tres reglas en los
 * dos sentidos:
 *  · nada que sea el principio o el interior de otra palabra de cada día: ni «tula» (tulad), ni «kain» (kainis), ni
 *    «balat» (balatan, pelar: una receta acabaría en Weë Beauty), ni «payo» (payong), ni «ganda» (maganda), ni «cr»
 *    (el baño en Filipinas, pero también create y credits: va `comfort room`), ni «sala» (salamat; la española `sala`
 *    ya la reconoce);
 *  · nada cuyo principio sea otra palabra de cada día, porque «quien teclea» la cogería entera: ni «damit» (dami:
 *    «ang dami kong tanong» acabaría en Weë Beauty), ni «palamuti» (pala), ni «layout» (layo), ni «hardin» (hard),
 *    ni «patalastas» (pata, la de «crispy pata»), ni «panghimagas» (pang-, que se separa en «pang-araw-araw»), ni
 *    «manicure» (mani), ni «bigote» (bigo), ni «talambuhay» (tala), ni «signage» (sign), ni «make-up» (make), ni
 *    «sari-sari» (sari: «sari-saring kulay»), ni «resto» con «restore» (cada una coge a la otra: el restaurante
 *    acabaría en Weë Photo). Ya las cubren `suot`, `dekorasyon`, `imbitasyon`, `garden`, `commercial`, `dessert`,
 *    `kuko`, `balbas`, `biography`, `karatula`, `tinda`, `restaurant` y `litrato`;
 *  · del inglés, lo que en Filipinas significa otra cosa: ni «trip» («trip ko»: lo que a alguien le gusta), ni «book»
 *    («mag-book ng hotel» acabaría en Weë Writer, y «facebook» la lleva dentro).
 *  · y por las mismas reglas, la forma larga, la interior o la frase: «logos» (el «logo» de «katalogo», «diyalogo»),
 *    «anghalian» (el principio «tanghali», mediodía), «angkap» (el «sang» de «sang-ayon»), «bahay» y «presyo» solo en
 *    frase («baha» es inundación; «presyon», «depresyon»), «sining» en frase («siningil»), y «ulamin», «bentahan»,
 *    «condos», «tours» y «stores» (de «kulambo», «bentahe», «condolence», «tournament» y «restore»; la inglesa dice
 *    también «stores»). Quien teclea la palabra corta la sigue encontrando: es el principio de la larga.
 * Cuatro se escriben en una forma más larga que sigue contando mientras se teclea la corta: «larawang» (no se mete
 * en «paglalarawan» ni en «ilarawan», que son describir), «tulang» (tula, sin tulad), «songs» (song, sin «basong» ni
 * «kasong») y «awitin» (awit, sin «kawit»). Y dos van sin su primera letra, para que solo cuenten DENTRO de lo
 * escrito: «akasyon» (bakasyon y magbakasyon; «baka» es «quizá» y la carne de res) y «akeup» (makeup; «make» va en
 * cualquier frase en taglish).
 */
export const PALABRAS_POR_IDIOMA: Readonly<Record<'da' | 'en' | 'fil', Readonly<Record<string, readonly string[]>>>> = {
  da: {
    design: ['logo', 'design', 'plakat', 'flyer', 'banner', 'forside', 'branding', 'illustration', 'klistermærke', 'visitkort', 'invitation', 'tegning', 'kunstværk', 'grafik', 'sociale medier'],
    studio: ['video', 'videoer', 'film', 'videoklip', 'reklame', 'reklamefilm', 'animation', 'kortfilm', 'trailer', 'undertekster', 'tiktok', 'youtube', 'reel'],
    photo: ['foto', 'billede', 'billeder', 'fotografi', 'retouchere', 'retouchering', 'baggrund', 'restaurere', 'portræt', 'filter', 'fjerne', 'avatar', 'selfie', 'profilbillede', 'skarphed', 'kvalitet', 'sløret', 'uskarp'],
    writer: ['tekst', 'manuskript', 'skrive', 'skriv', 'historie', 'eventyr', 'bog', 'bøger', 'e-bog', 'roman', 'blog', 'artikel', 'billedtekst', 'opslag', 'beskrivelse', 'biografi', 'digt', 'brev', 'mail', 'korrektur', 'ideer'],
    music: ['musik', 'sang', 'jingle', 'beat', 'melodi', 'instrumental', 'lydfil', 'lydbog', 'stemme', 'speak', 'podcast', 'fortælling', 'oplæsning', 'dubbing'],
    beauty: ['skønhed', 'makeup', 'make-up', 'frisure', 'klipning', 'hårfarve', 'håret', 'mit hår', 'outfit', 'tøj', 'negle', 'hudpleje', 'skæg', 'briller', 'påklædning'],
    chef: ['opskrift', 'madlavning', 'lave mad', 'madplan', 'aftensmad', 'morgenmad', 'madpakke', 'menu', 'ingredienser', 'kostplan', 'sund', 'frokost', 'dessert', 'restaurant', 'kage', 'bagning', 'kokken'],
    home: ['mit hjem', 'hjemmet', 'derhjemme', 'bolig', 'indretning', 'indrette', 'stue', 'værelse', 'soveværelse', 'interiør', 'møbler', 'haven', 'renovere', 'renovering', 'kontor', 'badeværelse', 'køkken', 'udendørs', 'terrasse', 'altan'],
    business: ['forretning', 'virksomhed', 'iværksætter', 'markedsføring', 'salg', 'sælge', 'præsentation', 'pitch', 'forretningsplan', 'kampagne', 'kunde', 'butik', 'firma', 'strategi', 'annonce', 'pris', 'cv', 'ansøgning', 'dokument', 'analyse', 'job', 'arbejde'],
    travel: ['rejse', 'ferie', 'rejseplan', 'destination', 'turisme', 'turist', 'flyrejse', 'flybillet', 'hotel', 'strand', 'backpacker', 'rute', 'udflugt', 'kuffert', 'visum', 'lufthavn', 'togrejse', 'krydstogt', 'guide', 'storby', 'udlandet'],
    brain: ['hjælp', 'spørgsmål', 'tænke', 'lære', 'forklar', 'opsummering', 'opsummere', 'organisere', 'planlægge', 'studere', 'lektier', 'opgave', 'undersøge', 'oversætte', 'oversæt', 'problem', 'råd', 'ved ikke'],
  },
  en: {
    design: ['logo', 'design', 'poster', 'flyer', 'banner', 'book cover', 'album cover', 'brand', 'branding', 'illustration', 'sticker', 'business card', 'invitation', 'drawing', 'artwork', 'graphic', 'social media'],
    studio: ['video', 'clip', 'reel', 'commercial', 'advert', 'animation', 'short film', 'movie', 'film', 'trailer', 'subtitles', 'tiktok', 'youtube'],
    photo: ['photo', 'picture', 'image', 'retouch', 'enhance', 'background', 'restore', 'portrait', 'filter', 'remove', 'avatar', 'selfie', 'profile picture', 'sharpen', 'quality', 'blurry'],
    /* «books»/«ebooks» y no «book»/«ebook»: dentro de una palabra se busca con cuatro letras, y «facebook» las contiene (quien teclea «book» o «ebook» sigue encontrando Weë Writer). */
    writer: ['text', 'script', 'write', 'story', 'books', 'ebooks', 'novel', 'blog', 'article', 'caption', 'post', 'description', 'biography', 'poem', 'letter', 'email', 'proofread', 'idea'],
    music: ['music', 'song', 'jingle', 'beat', 'melody', 'instrumental', 'audio', 'sound', 'voice', 'voiceover', 'podcast', 'narration', 'dubbing'],
    beauty: ['beauty', 'makeup', 'hairstyle', 'haircut', 'hair color', 'my hair', 'outfit', 'clothes', 'nails', 'skin', 'fashion', 'beard', 'glasses'],
    chef: ['recipe', 'cooking', 'cook', 'food', 'meal', 'menu', 'dish', 'ingredients', 'diet', 'healthy', 'dinner', 'lunch', 'breakfast', 'dessert', 'restaurant', 'substitute', 'chef', 'baking'],
    home: ['house', 'my home', 'home decor', 'decor', 'decorate', 'living room', 'bedroom', 'interior', 'furniture', 'garden', 'remodel', 'renovate', 'renovation', 'office', 'bathroom', 'kitchen', 'outdoor', 'patio'],
    business: ['business', 'startup', 'entrepreneur', 'marketing', 'sales', 'sell', 'presentation', 'pitch', 'campaign', 'customer', 'client', 'shop', 'stores', 'company', 'strategy', 'advertising', 'price', 'pricing', 'resume', 'cv', 'document', 'analysis', 'job'],
    travel: ['trip', 'travel', 'vacation', 'holiday', 'itinerary', 'destination', 'tourism', 'tourist', 'flight', 'hotel', 'beach', 'backpacking', 'route', 'excursion', 'suitcase', 'passport', 'visa', 'airport', 'train ride', 'cruise', 'guide', 'city break', 'abroad'],
    brain: ['help', 'question', 'think', 'learn', 'explain', 'summary', 'summarize', 'organize', 'study', 'homework', 'research', 'translate', 'problem', 'advice', "don't know", 'not sure'],
  },
  fil: {
    design: ['logos', 'disenyo', 'design', 'poster', 'flyer', 'banner', 'tarpaulin', 'tarp', 'pubmat', 'karatula', 'imbitasyon', 'invitation', 'guhit', 'drawing', 'ilustrasyon', 'illustration', 'likhang sining', 'gawang sining', 'artwork', 'graphic', 'sticker', 'brand', 'branding', 'book cover', 'album cover', 'business card', 'calling card', 'birthday card', 'social media'],
    studio: ['video', 'bidyo', 'clip', 'reel', 'vlog', 'pelikula', 'short film', 'movie', 'film', 'commercial', 'advert', 'animasyon', 'animation', 'trailer', 'subtitle', 'tiktok', 'youtube'],
    photo: ['larawang', 'litrato', 'photo', 'picture', 'image', 'retouch', 'enhance', 'background', 'portrait', 'filter', 'remove', 'avatar', 'selfie', 'profile picture', 'profile pic', 'sharpen', 'quality', 'blurry'],
    writer: ['teksto', 'text', 'iskrip', 'script', 'sulat', 'sumulat', 'write', 'kuwento', 'kwento', 'story', 'aklat', 'ebooks', 'nobela', 'novel', 'blog', 'artikulo', 'article', 'caption', 'post', 'paglalarawan', 'description', 'biography', 'tulang', 'poem', 'liham', 'letter', 'email', 'proofread', 'ideya', 'idea'],
    music: ['musika', 'music', 'kanta', 'kumanta', 'songs', 'awitin', 'himig', 'melody', 'tugtog', 'tugtugin', 'jingle', 'beat', 'instrumental', 'audio', 'sound', 'boses', 'voice', 'voiceover', 'voice over', 'narasyon', 'narration', 'podcast', 'dubbing'],
    beauty: ['akeup', 'make up', 'pampaganda', 'pagpapaganda', 'kagandahan', 'beauty', 'buhok', 'gupit', 'rebond', 'hairstyle', 'haircut', 'hair color', 'my hair', 'suot', 'kasuotan', 'pananamit', 'outfit', 'ootd', 'clothes', 'fashion', 'kuko', 'nails', 'skincare', 'skin care', 'skin', 'kilay', 'balbas', 'beard', 'salamin sa mata', 'glasses'],
    chef: ['resipe', 'recipe', 'luto', 'lutuin', 'cooking', 'cook', 'ulamin', 'pagkain', 'kainan', 'food', 'meal', 'dish', 'almusal', 'breakfast', 'anghalian', 'lunch', 'hapunan', 'dinner', 'meryenda', 'merienda', 'dessert', 'angkap', 'ingredients', 'menu', 'diyeta', 'diet', 'sustansya', 'sustansiya', 'healthy', 'restawran', 'restaurant', 'karinderya', 'carinderia', 'kusinero', 'chef', 'bake', 'baking', 'cake', 'substitute'],
    home: ['bahay ko', 'bahay namin', 'ang bahay', 'ng bahay', 'sa bahay', 'house', 'my home', 'home decor', 'dekorasyon', 'decor', 'decorate', 'interior', 'kuwarto', 'kwarto', 'bedroom', 'living room', 'banyo', 'comfort room', 'bathroom', 'kusina', 'kitchen', 'muwebles', 'furniture', 'bakuran', 'garden', 'renobasyon', 'renovate', 'renovation', 'remodel', 'opisina', 'office', 'condos', 'condominium', 'outdoor', 'patio'],
    business: ['negosyo', 'negosyante', 'business', 'startup', 'entrepreneur', 'tinda', 'paninda', 'shop', 'stores', 'bentahan', 'magbenta', 'ibenta', 'sales', 'sell', 'marketing', 'kampanya', 'campaign', 'ang presyo', 'presyo ng', 'mga presyo', 'presyuhan', 'price', 'pricing', 'puhunan', 'kostumer', 'kliyente', 'customer', 'client', 'kompanya', 'kumpanya', 'company', 'estratehiya', 'strategy', 'advertising', 'presentasyon', 'presentation', 'pitch', 'dokumento', 'document', 'analysis', 'resume', 'cv', 'trabaho', 'job'],
    travel: ['biyahe', 'byahe', 'akasyon', 'lakbay', 'pasyal', 'staycation', 'out of town', 'road trip', 'island hopping', 'travel', 'vacation', 'holiday', 'itinerary', 'destinasyon', 'destination', 'turista', 'turismo', 'tourist', 'tourism', 'tours', 'city tour', 'resort', 'hotel', 'beach', 'flight', 'eroplano', 'paliparan', 'airport', 'passport', 'visa', 'suitcase', 'backpacking', 'route', 'excursion', 'train ride', 'cruise', 'guide', 'city break', 'ibang bansa', 'abroad'],
    brain: ['tulong', 'tulungan', 'tumulong', 'help', 'tanong', 'question', 'isip', 'think', 'matuto', 'learn', 'aral', 'study', 'assignment', 'homework', 'paliwanag', 'explain', 'buod', 'summary', 'summarize', 'organize', 'saliksik', 'research', 'salin', 'translate', 'problem', 'payuhan', 'advice', 'hindi ko alam', 'di ko alam', 'ewan', "don't know", 'hindi ako sigurado', 'not sure'],
  },
};

/** Una palabra o una frase, entera: ni dentro de otra palabra ni a medias. */
const frasesCompiladas = new Map<string, RegExp>();
const fraseEntera = (k: string): RegExp => {
  let re = frasesCompiladas.get(k);
  if (!re) {
    re = new RegExp(`(?<![\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u');
    frasesCompiladas.set(k, re);
  }
  return re;
};

/** Si una palabra de `PALABRAS_POR_IDIOMA` encaja con lo escrito (las reglas, arriba de la tabla). */
const encajaEnSuIdioma = (k: string, q: string, words: string[]): boolean => {
  if (k.includes(' ')) return fraseEntera(k).test(q);
  return words.some((w) => w.startsWith(k) || (w.length >= 4 && k.startsWith(w))) || (k.length >= 4 && q.includes(k));
};

/** El plural, el infinitivo con pronombre y el presente/imperativo de «tú» (de -ar/-er): formas de la misma palabra. */
const PLURALES = ['s', 'es'];
const PRONOMBRES = ['lo', 'la', 'los', 'las', 'le', 'les', 'me', 'te', 'se', 'nos'];
const esFormaDe = (w: string, k: string): boolean =>
  w.length >= 4 &&
  k.length >= 4 &&
  (PLURALES.some((p) => w === k + p || k === w + p) ||
    (/[aeií]r$/.test(k) && PRONOMBRES.some((p) => w === k + p)) ||
    (/[ae]r$/.test(k) && w === k.slice(0, -1)));

/** El final de lo escrito, desde el principio de una palabra, es el principio de la `keyword` (cuatro letras o más). */
const LETRA_O_CIFRA = /[\p{L}\p{N}]/u;
const seEstaEscribiendo = (escrito: string, k: string): boolean => {
  /* Un final más largo que la `keyword` no puede ser su principio: solo se miran los últimos caracteres. */
  for (let i = Math.max(0, escrito.length - k.length); i < escrito.length; i++) {
    if (i > 0 && LETRA_O_CIFRA.test(escrito[i - 1])) continue;
    const final = escrito.slice(i);
    if (final !== k && k.startsWith(final) && final.replace(/[^\p{L}\p{N}]/gu, '').length >= 4) return true;
  }
  return false;
};

/** Las palabras de un idioma de la app, o ninguna: el español ya está en `keywords`. */
const palabrasDelIdioma = (idioma: CodigoDeIdioma): Readonly<Record<string, readonly string[]>> | undefined =>
  idioma === 'da' || idioma === 'en' || idioma === 'fil' ? PALABRAS_POR_IDIOMA[idioma] : undefined;

/**
 * Cómo se presenta una experiencia que vive dentro de otra sección. El
 * identificador no cambia —sigue siendo `photo`, y con él viajan el historial y
 * el servidor—, pero lo que se lee arriba dice dónde está de verdad la persona.
 *
 * `claveEtiqueta` es el contexto completo, para la cabecera y la miga de pan.
 * `claveNombre` es cómo se llama la experiencia cuando habla: firma las burbujas
 * de la conversación, el progreso y el resultado. Sin `claveNombre` se usa el
 * nombre propio de la experiencia —que es marca y no se traduce—, que es lo que
 * siguen haciendo las tres áreas de Studio.
 *
 * Las dos son CLAVES: "Weë Design · Hogar & Diseño" se lee, así que se traduce.
 * Lo que no cambia nunca es el identificador `home`, que es con el que viajan
 * los trabajos guardados y las plantillas del servidor.
 */
export const EXPERIENCE_AREA: Record<string, { section: string; claveEtiqueta: ClaveDeTexto; claveNombre?: ClaveDeTexto }> = {
  photo: { section: 'studio', claveEtiqueta: 'creator.areaStudioPhotos' },
  studio: { section: 'studio', claveEtiqueta: 'creator.areaStudioVideos' },
  beauty: { section: 'studio', claveEtiqueta: 'creator.areaStudioBeauty' },
  /*
   * Weë Home pasa a ser Hogar & Diseño dentro de Weë Design. El nombre propio
   * desaparece de la pantalla —nadie debe leer "Weë Home"—, pero el
   * identificador `home` sigue intacto por debajo: con él viajan los trabajos
   * históricos, la plantilla del servidor, los planes y los prompts.
   */
  home: { section: 'design', claveEtiqueta: 'creator.areaDesignHome', claveNombre: 'creator.areaHomeName' },
};

/**
 * Cómo se llama una experiencia para quien la está usando: el nombre del área
 * cuando vive dentro de otra sección, y su nombre propio cuando no.
 *
 * El traductor entra por parámetro y es OBLIGATORIO a propósito: así ninguna
 * pantalla puede olvidarse de él y acabar enseñando "Hogar & Diseño" en una
 * interfaz en inglés. Si faltara, el compilador lo dice.
 */
export const experienceLabel = (
  experience: { id: string; name: string },
  t: (clave: string) => string,
): string => {
  const clave = EXPERIENCE_AREA[experience.id]?.claveNombre;
  return clave ? t(clave) : experience.name;
};

/** Resuelve por identificador entre LAS DIEZ: el historial depende de esto. */
export const getExperienceById = (id: string): WeeExperience | undefined =>
  ALL_EXPERIENCES.find((e) => e.id === id);



/**
 * Experiencias cuyo nombre o palabras clave coinciden con lo que la persona
 * quiere lograr. Busca entre todas a propósito: quien escribe "maquillaje" o
 * "retocar" tiene que llegar a esa capacidad aunque su sección ya no esté en el
 * menú. Esconder una sección no es esconder lo que sabe hacer.
 */
/*
 * LAS PALABRAS DEL IDIOMA DE QUIEN BUSCA, Y SOLO ESAS. Las `keywords` de cada experiencia son españolas y se aplicaban
 * a TODOS los idiomas: en filipino «salamat» (gracias) abría Weë Home por «sala», «eroplano» Weë Business por «plan» y
 * «facebook» Weë Writer por «ebook». Ahora:
 *  · en español, las `keywords` de siempre (y sin idioma —ninguna pantalla llama así—, también, como hasta hoy);
 *  · un idioma con lista propia en `PALABRAS_POR_IDIOMA`, solo esa;
 *  · uno sin lista, la inglesa: el mismo idioma de reserva que los textos (`IDIOMA_DE_RESERVA`, i18n/idiomas.ts);
 *  · el NOMBRE de la experiencia (Weë Chef, Weë Travel…) cuenta siempre: es marca y se escribe igual en todos.
 *
 * UNA `keyword` ESPAÑOLA ENCAJA POR PALABRAS, de tres maneras y solo de tres:
 *  · ENTERA: es una palabra (o frase) entera de lo escrito;
 *  · UNA FORMA DE ELLA (`esFormaDe`): su plural («recetas», «hoteles», «ebooks»), su infinitivo con pronombre
 *    («traducirlo», «ayudarme») o el presente/imperativo de «tú» de un infinitivo en -ar/-er («explica», «vende»);
 *  · LO QUE SE ESTÁ ESCRIBIENDO (`seEstaEscribiendo`): el FINAL de lo escrito, desde el principio de una palabra, es el
 *    principio de la `keyword` y lleva ya cuatro letras («rece», «color de cab»). Solo el final: una palabra ya
 *    terminada en medio de la frase no está a medias («la mejor receta» no es «mejorar»), y con tres letras no basta
 *    («una», «con», «por» no son el principio de «unas», «consejo», «portada»).
 * Que una palabra EMPIECE por la `keyword` no basta: «postre» no es «post», «salado» no es «sala», «trenza» no es
 * «tren», «menudo» no es «menu», «pelota» no es «pelo», «casarse» no es «casa». Por eso las palabras derivadas o
 * compuestas que sí son de esa experiencia («videoclip», «logotipo», «viajero», «jardinería»…) son `keywords` suyas.
 * Y una `keyword` no es nunca una palabra funcional del español —«unas», «no se»—: la variante sin tilde de «uñas» o
 * «no sé» es también el artículo de «unas fotos» o el «no se» de «no se ve bien». Una `keyword` de menos de cuatro
 * letras («cv», «voz», «bio», «uña») solo encaja entera.
 * Antes bastaba con que apareciera en cualquier sitio (`q.includes`), y «facebook» abría Weë Writer por «ebook»,
 * «revisar» Weë Travel por «visa», «ensalada» Weë Home por «sala», «escena» Weë Chef por «cena» o «descuento» Weë
 * Writer por «cuento». Las pocas palabras compuestas que se encontraban así de verdad —«autorretrato», «microcuento»,
 * «minicuento», «reescribir», «contraportada»— y «cartel» (que llegaba a Weë Design por «arte») son ahora `keywords`
 * suyas, para que nadie pierda una búsqueda que ya funcionaba.
 *
 * `idioma` es el idioma ACTIVO de la interfaz (`useIdioma().idioma`, ya resuelto por el sistema de i18n: un teléfono en
 * `tl-PH` llega como `fil`), no el locale de los formatos.
 */
export const matchExperiences = (query: string, idioma?: CodigoDeIdioma): WeeExperience[] => {
  /* Con el espacio del final, que dice si la última palabra está terminada: «mejor » sí, «mejor» todavía no. */
  const escrito = query.toLowerCase().replace(/^\s+/, '');
  const q = escrito.trim();
  if (!q) return [];
  const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  const encaja = (k: string) => fraseEntera(k).test(q) || words.some((w) => esFormaDe(w, k)) || seEstaEscribiendo(escrito, k);
  const enEspanol = !idioma || idioma === 'es';
  const suyas = enEspanol ? undefined : (palabrasDelIdioma(idioma) ?? PALABRAS_POR_IDIOMA.en);
  return ALL_EXPERIENCES.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      (enEspanol && e.keywords.some(encaja)) ||
      !!suyas?.[e.id]?.some((k) => encajaEnSuIdioma(k, q, words))
  );
};
