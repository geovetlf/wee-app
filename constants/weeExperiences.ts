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
    keywords: ['logo', 'diseño', 'diseno', 'post', 'flyer', 'banner', 'afiche', 'poster', 'portada', 'marca', 'branding', 'ilustración', 'ilustracion', 'sticker', 'tarjeta', 'invitación', 'invitacion', 'dibujo', 'arte', 'creatividad', 'redes'],
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
    keywords: ['video', 'weel', 'weël', 'reel', 'clip', 'anuncio', 'comercial', 'publicidad', 'animación', 'animacion', 'corto', 'película', 'pelicula', 'trailer', 'subtítulos', 'subtitulos', 'promocionar', 'tiktok', 'youtube', 'historia visual'],
  },
  {
    id: 'photo',
    icono: 'camara',
    claveDescripcion: 'creator.photo',
    name: 'Weë Photo',
    emoji: '📸',
    description: 'Mejora, restaura y transforma tus fotos',
    examples: ['creator.photoEx1', 'creator.photoEx2', 'creator.photoEx3'],
    keywords: ['foto', 'fotos', 'fotografía', 'fotografia', 'imagen', 'retocar', 'mejorar', 'fondo', 'restaurar', 'retrato', 'filtro', 'eliminar', 'quitar', 'objeto', 'avatar', 'selfie', 'perfil', 'nitidez', 'calidad', 'borrosa'],
  },
  {
    id: 'writer',
    icono: 'documento',
    claveDescripcion: 'creator.writer',
    name: 'Weë Writer',
    emoji: '✍️',
    description: 'Publicaciones, historias, guiones, emails y libros',
    examples: ['creator.writerEx1', 'creator.writerEx2', 'creator.writerEx3'],
    keywords: ['texto', 'guion', 'guión', 'escribir', 'redactar', 'historia', 'cuento', 'libro', 'ebook', 'novela', 'blog', 'artículo', 'articulo', 'caption', 'publicación', 'publicacion', 'descripción', 'descripcion', 'biografía', 'biografia', 'poema', 'carta', 'email', 'correo', 'corregir', 'idea'],
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
    keywords: ['belleza', 'maquillaje', 'peinado', 'corte', 'cabello', 'pelo', 'look', 'outfit', 'ropa', 'estilo', 'uñas', 'unas', 'piel', 'moda', 'barba', 'lentes', 'color de cabello', 'verme'],
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
    keywords: ['casa', 'hogar', 'decoración', 'decoracion', 'decorar', 'sala', 'cuarto', 'habitación', 'habitacion', 'dormitorio', 'interior', 'muebles', 'jardín', 'jardin', 'remodelar', 'remodelación', 'remodelacion', 'espacio', 'oficina', 'baño', 'bano', 'exterior', 'patio'],
  },
  {
    id: 'business',
    icono: 'maletin',
    claveDescripcion: 'creator.business',
    name: 'Weë Business',
    emoji: '💼',
    description: 'Ideas de negocio, marketing, CV, documentos y presentaciones',
    examples: ['creator.businessEx1', 'creator.businessEx2', 'creator.businessEx3'],
    keywords: ['negocio', 'emprendimiento', 'emprender', 'marketing', 'ventas', 'vender', 'presentación', 'presentacion', 'pitch', 'plan', 'campaña', 'campana', 'cliente', 'clientes', 'tienda', 'empresa', 'estrategia', 'publicidad', 'precio', 'cv', 'currículum', 'curriculum', 'documento', 'análisis', 'analisis', 'trabajo'],
  },
  {
    id: 'travel',
    icono: 'avion',
    claveDescripcion: 'creator.travel',
    name: 'Weë Travel',
    emoji: '✈️',
    description: 'Prepara tu viaje: a dónde ir, qué hacer y cómo moverte',
    examples: ['creator.travelEx1', 'creator.travelEx2', 'creator.travelEx3'],
    keywords: ['viaje', 'viajar', 'viajes', 'vacaciones', 'itinerario', 'destino', 'destinos', 'turismo', 'turista', 'vuelo', 'vuelos', 'hotel', 'hoteles', 'playa', 'mochilero', 'ruta', 'excursión', 'excursion', 'maleta', 'pasaporte', 'visa', 'aeropuerto', 'tren', 'crucero', 'guía', 'guia', 'ciudad', 'país', 'pais', 'extranjero'],
  },
  {
    id: 'brain',
    icono: 'cerebro',
    claveDescripcion: 'creator.brain',
    name: 'Weë Brain',
    emoji: '🧠',
    description: '¿No sabes dónde buscar? Pregúntale a Weë',
    examples: ['creator.brainEx1', 'creator.brainEx2', 'creator.brainEx3'],
    keywords: ['ayuda', 'ayúdame', 'ayudame', 'pregunta', 'pensar', 'aprender', 'explicar', 'explícame', 'explicame', 'resumen', 'resumir', 'organizar', 'planear', 'planificar', 'estudiar', 'tarea', 'investigar', 'investigación', 'investigacion', 'traducir', 'traduce', 'problema', 'consejo', 'no sé', 'no se'],
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
 *  · se SUMAN a `keywords`, nunca las sustituyen; en español la búsqueda es la de siempre;
 *  · solo cuentan las del idioma de la app de esa persona (`matchExperiences(q, idioma)`);
 *  · se comparan con más cuidado que las españolas (`encajaEnSuIdioma`): una frase solo cuenta entera y como
 *    palabras sueltas —«my home» no está dentro de «my homework»—; una palabra cuenta si lo escrito empieza por ella
 *    («opskrifter»), si va dentro de una palabra compuesta y tiene al menos cuatro letras («aftensmadsopskrift»), o
 *    si alguien la está tecleando y ya lleva cuatro letras («opsk»). «Tecleando» es el FINAL del texto: una
 *    palabra con otra detrás ya está escrita y no se completa («skøn» en «en skøn sang» no es «skønhed»; «make» en
 *    «make me a logo» no es «makeup»; véase `leerLoEscrito`). Con tres letras no basta: «lav», «mor» o «mit» son palabras de cada día y no
 *    el principio de una búsqueda;
 *  · y aun así no entran palabras que son el principio de otras de uso diario: ni «mad» (sería Madrid), ni «hus»
 *    (huske), ni «tog» (el pasado de «tage»), ni «look» (looking), ni «train» (training), ni «hjem» (hjemmeside), ni
 *    «klip» (klipning), ni «bage» (bagefter), ni «kunst» (kunstig intelligens), ni «hair» (chair), ni «work»
 *    (homework), ni «kok» (kokos). Para esas va la forma larga.
 */
export const PALABRAS_POR_IDIOMA: Readonly<Record<'da' | 'en', Readonly<Record<string, readonly string[]>>>> = {
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
    writer: ['text', 'script', 'write', 'story', 'book', 'ebook', 'novel', 'blog', 'article', 'caption', 'post', 'description', 'biography', 'poem', 'letter', 'email', 'proofread', 'idea'],
    music: ['music', 'song', 'jingle', 'beat', 'melody', 'instrumental', 'audio', 'sound', 'voice', 'voiceover', 'podcast', 'narration', 'dubbing'],
    beauty: ['beauty', 'makeup', 'hairstyle', 'haircut', 'hair color', 'hair colour', 'my hair', 'outfit', 'clothes', 'nails', 'skin', 'fashion', 'beard', 'glasses'],
    chef: ['recipe', 'cooking', 'cook', 'food', 'meal', 'menu', 'dish', 'ingredients', 'diet', 'healthy', 'dinner', 'lunch', 'breakfast', 'dessert', 'restaurant', 'substitute', 'chef', 'baking'],
    home: ['house', 'my home', 'home decor', 'decor', 'decorate', 'living room', 'bedroom', 'interior', 'furniture', 'garden', 'remodel', 'renovate', 'renovation', 'office', 'bathroom', 'kitchen', 'outdoor', 'patio'],
    business: ['business', 'startup', 'entrepreneur', 'marketing', 'sales', 'sell', 'presentation', 'pitch', 'campaign', 'customer', 'client', 'shop', 'store', 'company', 'strategy', 'advertising', 'price', 'pricing', 'resume', 'cv', 'document', 'analysis', 'job'],
    travel: ['trip', 'travel', 'vacation', 'holiday', 'itinerary', 'destination', 'tourism', 'tourist', 'flight', 'hotel', 'beach', 'backpacking', 'route', 'excursion', 'suitcase', 'passport', 'visa', 'airport', 'train ride', 'cruise', 'guide', 'city break', 'abroad'],
    brain: ['help', 'question', 'think', 'learn', 'explain', 'summary', 'summarize', 'organize', 'study', 'homework', 'research', 'translate', 'problem', 'advice', "don't know", 'not sure'],
  },
};

/** Una frase de otro idioma, entera y como palabras sueltas. */
const frasesCompiladas = new Map<string, RegExp>();
const fraseEntera = (k: string): RegExp => {
  let re = frasesCompiladas.get(k);
  if (!re) {
    re = new RegExp(`(?<![\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u');
    frasesCompiladas.set(k, re);
  }
  return re;
};

/**
 * Lo escrito, partido en palabras (todas, y las de tres letras o más: las más cortas no sirven para encajar un principio) y
 * con lo que todavía se está TECLEANDO.
 *
 * Lo que se teclea es el FINAL del texto: desde alguna palabra hasta el último carácter, y solo si el texto no acaba en
 * un signo («Escribe una historia.» ya está dicho; un guion no cuenta, la palabra sigue: «make-»). Para una clave de
 * una palabra es la última palabra; para una de varias («color de cabello») son las últimas, de modo que «color de ca»
 * sigue yendo hacia ella.
 *
 * Esto es lo que separa completar de enrutar. Quien teclea «rec» va hacia «receta» y el buscador se lo enseña; pero
 * «una», «make» o «ver» en mitad de una frase no van hacia «unas», «makeup» o «verme»: ya están escritas, y lo que
 * tienen detrás no continúa ninguna clave. Sin esta distinción, «Una canción relajante para estudiar» acababa en Weë
 * Beauty por la palabra «una», con `dentroDe: 'studio'` (B-02, ronda R7).
 */
interface LoEscrito {
  /** El texto entero, sin espacios sobrantes y en minúsculas. */
  q: string;
  /** TODAS sus palabras, también las de una o dos letras («cv»). */
  todas: string[];
  /** Sus palabras de tres letras o más. */
  words: string[];
  /** Los finales del texto que pueden estar a medio teclear: uno por cada palabra de tres letras o más. */
  tecleando: string[];
}

const leerLoEscrito = (query: string): LoEscrito => {
  const q = query.trim().toLowerCase();
  const palabras = [...q.matchAll(/[\p{L}\p{N}]+/gu)];
  const largas = palabras.filter((m) => m[0].length >= 3);
  return {
    q,
    todas: palabras.map((m) => m[0]),
    words: largas.map((m) => m[0]),
    tecleando: /[\p{L}\p{N}-]$/u.test(q) ? largas.map((m) => q.slice(m.index)) : [],
  };
};

/**
 * Los idiomas que forman palabras PEGANDO otras —«festlook», «Profilfoto», «musikvideo», «affärsplan»— o no las separan con
 * espacios —«设计logo», «動画video»—. En ellos las claves españolas, que son sus préstamos (logo, video, foto, look, plan…),
 * valen también DENTRO de otra palabra, y quitárselo les haría perder aciertos de verdad (medido sobre sus propios textos).
 * En el resto —español, inglés, francés, italiano, portugués, turco…— una clave dentro de otra palabra es casi siempre un
 * accidente: «unas» en «algunas», «ropa» en «europa», «cena» en «escena», «arte» en «comparte».
 */
const IDIOMAS_DE_PALABRAS_PEGADAS: readonly string[] = ['da', 'de', 'sv', 'ja', 'ko', 'zh'];
const pegaPalabras = (idioma?: string): boolean => {
  const base = /^([a-z]{2,3})(?:[-_]|$)/i.exec(idioma ?? '')?.[1]?.toLowerCase();
  return !!base && IDIOMAS_DE_PALABRAS_PEGADAS.includes(base);
};

/**
 * Si una clave española encaja con lo escrito. Una clave de varias palabras («color de cabello») encaja si el texto la lleva
 * entera. Una de una sola encaja si alguna palabra ES la clave o EMPIEZA por ella («recetas»): no si la lleva DENTRO, salvo
 * en los idiomas que pegan palabras (`IDIOMAS_DE_PALABRAS_PEGADAS`), donde se conserva la regla de siempre. Y cualquiera,
 * si lo que se está tecleando es su principio («rec»).
 */
const encajaEnEspanol = (k: string, { q, todas, tecleando }: LoEscrito, dentroDePalabras: boolean): boolean =>
  (k.includes(' ') || dentroDePalabras ? q.includes(k) : todas.some((w) => w.startsWith(k))) || tecleando.some((t) => k.startsWith(t));

/** Si una palabra de `PALABRAS_POR_IDIOMA` encaja con lo escrito (las reglas, arriba de la tabla). */
const encajaEnSuIdioma = (k: string, { q, words, tecleando }: LoEscrito): boolean => {
  if (k.includes(' ')) return fraseEntera(k).test(q);
  return words.some((w) => w.startsWith(k)) || tecleando.some((t) => t.length >= 4 && k.startsWith(t)) || (k.length >= 4 && q.includes(k));
};

/** Las palabras de un idioma de la app, o ninguna: el español ya está en `keywords`. */
const palabrasDelIdioma = (idioma?: string): Readonly<Record<string, readonly string[]>> | undefined => {
  const base = /^(da|en)(?:-|$)/i.exec(idioma ?? '')?.[1];
  if (!base) return undefined;
  return PALABRAS_POR_IDIOMA[/^en$/i.test(base) ? 'en' : 'da'];
};

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
 *
 * La busca el buscador "¿Qué quieres crear?" mientras se teclea y la usa también
 * el destino de la caja del Studio (`utils/destinoDeIntencion.ts`) al pulsar
 * Crear. Por eso completa solo lo que se está tecleando —el final del texto—:
 * "rec" ofrece Weë Chef, pero "una" a mitad de frase no ofrece Weë Beauty por
 * "unas".
 */
export const matchExperiences = (query: string, idioma?: string): WeeExperience[] => {
  const escrito = leerLoEscrito(query);
  if (!escrito.q) return [];
  const suyas = palabrasDelIdioma(idioma);
  const pegadas = pegaPalabras(idioma);
  return ALL_EXPERIENCES.filter(
    (e) =>
      e.name.toLowerCase().includes(escrito.q) ||
      e.keywords.some((k) => encajaEnEspanol(k, escrito, pegadas)) ||
      !!suyas?.[e.id]?.some((k) => encajaEnSuIdioma(k, escrito))
  );
};
