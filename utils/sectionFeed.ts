import { Post } from '../services/firestoreService';

/**
 * A qué sección pertenece una publicación.
 *
 * Weë no guarda todavía la sección dentro del post: lo que hay son comunidades,
 * tags, hashtags y las herramientas de "Cómo lo hice". Este módulo no inventa un
 * campo nuevo ni escribe nada: solo LEE lo que la publicación ya trae y decide si
 * encaja en el muro de una sección.
 *
 * Es a propósito generoso —una publicación sobre una receta pertenece al muro de
 * Weë Chef aunque su autor no eligiera ninguna comunidad— y a propósito literal:
 * las palabras se comparan enteras, para que "menu" no salga de "menudo".
 */

/** Quita acentos y baja a minúsculas, para comparar como lo leería una persona. */
const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Palabras que hacen que una publicación pertenezca al muro de cada sección.
 * Van sin acentos y en minúsculas porque el texto se normaliza antes de comparar.
 *
 * Weë Chef fue el piloto (fase 2E-37), Weë Design la primera en seguirle
 * (fase 2E-43) y Weë Studio la tercera (fase 2E-50). Las demás se añaden aquí
 * cuando les toque su muro: el resto del código ya es genérico.
 */
export const SECTION_MARKERS: Record<string, string[]> = {
  chef: [
    'chef',
    'cocina',
    'cocinar',
    'cocine',
    'receta',
    'recetas',
    'plato',
    'platos',
    'postre',
    'postres',
    'menu',
    'menus',
    'ingrediente',
    'ingredientes',
    'comida',
    'cena',
    'almuerzo',
    'desayuno',
    'horno',
    'sarten',
    'reposteria',
    'gastronomia',
  ],
  /*
   * Ojo con una palabra: "diseño" a secas NO está aquí, y es deliberado. Aparece
   * en "diseño de interiores" (Weë Home) y en "diseño de uñas" (Weë Beauty), así
   * que se reconoce a Weë Design por lo que hace —logos, afiches, envases,
   * personajes— y no por el verbo que comparte con media app.
   *
   * La señal más fiable no está en esta lista: quien publica un resultado desde el
   * flujo lleva "Weë Design" en aiTools, y eso ya se lee más abajo.
   */
  design: [
    // 'design' es la palabra que hace que funcione lo de arriba: quien publica un
    // resultado del flujo lleva 'Weë Design' en aiTools, y sin esta entrada esa
    // señal —la más fiable de todas— no se reconocería. En español no colisiona:
    // 'diseño de interiores' y 'diseño de uñas' no contienen 'design'.
    'design',
    'logo',
    'logos',
    'logotipo',
    'marca',
    'branding',
    'isotipo',
    'tipografia',
    'afiche',
    'afiches',
    'poster',
    'posters',
    'cartel',
    'carteles',
    'flyer',
    'flyers',
    'portada',
    'portadas',
    'packaging',
    'empaque',
    'envase',
    'envases',
    'etiqueta',
    'personaje',
    'personajes',
    'criatura',
    'criaturas',
    'ilustracion',
    'ilustraciones',
    'boceto',
    'bocetos',
    'maqueta',
    'mockup',
    'render',
    'renders',
    /*
     * Hogar & Diseño publica en el muro de Weë Design (fase 2E-56).
     *
     * Son dos palabras y las dos son la firma de la experiencia en aiTools:
     * 'hogar' para lo que se publica desde hoy —el resultado lleva "Hogar &
     * Diseño"— y 'home' para lo que se publicó cuando la experiencia todavía se
     * llamaba "Weë Home". Ninguna de las dos choca con el Inicio de la red
     * social, que es un nombre de pantalla y nunca viaja dentro de una
     * publicación.
     */
    'hogar',
    'home',
  ],
  /*
   * Weë Studio reúne fotos, videos y look, así que sus palabras son las de las
   * tres. Fuera las genéricas: "foto" e "imagen" aparecen en media app —una
   * receta también tiene su foto— y "corte" se dice tanto de un peinado como de
   * un corte de carne. Se reconoce por el oficio, no por el sustantivo común.
   *
   * Los tres nombres propios están porque quien publica desde un resultado lleva
   * 'Weë Studio', 'Weë Photo' o 'Weë Beauty' en aiTools, y esa es la señal más
   * fiable de todas.
   */
  studio: [
    'studio',
    'photo',
    'beauty',
    'video',
    'videos',
    'videoclip',
    'clip',
    'clips',
    'reel',
    'reels',
    'animacion',
    'animaciones',
    'montaje',
    'retrato',
    'retratos',
    'retoque',
    'retocar',
    'restaurar',
    'restauracion',
    'colorizar',
    'selfie',
    'maquillaje',
    'maquillar',
    'peinado',
    'peinados',
    'cabello',
    'barba',
    'manicura',
    'outfit',
    'outfits',
    'look',
    'looks',
    /*
     * El formato de video propio de Weë (fase 2E-52). Sin esta palabra, la única
     * publicación real que había en dev —un Weël hecho con IA, con su «Cómo lo
     * hice» y todo— no llegaba a ningún muro. Un Weël es un video: su sitio es
     * este. Se escribe sin diéresis porque el texto se normaliza antes de
     * comparar, así que «Weël» y «weel» son la misma palabra aquí.
     */
    'weel',
    'weels',
  ],
  /*
   * Weë Travel (fase 2E-64C). Fuera las palabras que se dicen en media app:
   * "ruta" es también una ruta de bicicleta, "guía" una guía de estilo y "playa"
   * sale en cualquier foto de verano. Se reconoce un viaje por su vocabulario
   * propio —el itinerario, el destino, el vuelo, la maleta— y sobre todo por
   * 'travel', que es la firma que queda en aiTools al publicar desde aquí.
   */
  travel: [
    'travel',
    'viaje',
    'viajes',
    'viajar',
    'viajando',
    'vacaciones',
    'itinerario',
    'itinerarios',
    'destino',
    'destinos',
    'turismo',
    'turista',
    'vuelo',
    'vuelos',
    'aeropuerto',
    'mochilero',
    'mochilera',
    'excursion',
    'excursiones',
    'maleta',
    'maletas',
    'pasaporte',
    'crucero',
    'roadtrip',
  ],
};

/** Todo el texto de la publicación donde puede aparecer una pista de sección. */
const haystack = (post: Post): string =>
  normalize(
    [
      post.content || '',
      post.communitySlug || '',
      ...(post.tags || []),
      ...(post.hashtags || []),
      ...(post.aiTools || []),
    ].join(' ')
  );

const matchers = new Map<string, RegExp>();

/** Una sola expresión por lista de palabras: se compila una vez y se reutiliza. */
const matcher = (markers: string[]): RegExp => {
  const key = markers.join('|');
  let regex = matchers.get(key);
  if (!regex) {
    regex = new RegExp(`(^|[^a-z0-9])(${key})([^a-z0-9]|$)`);
    matchers.set(key, regex);
  }
  return regex;
};

/** true si la publicación encaja en el muro de una sección. */
export const belongsToSection = (post: Post, markers: string[]): boolean => {
  if (!markers || markers.length === 0) return false;
  return matcher(markers).test(haystack(post));
};

/** Las publicaciones del muro de una sección, en el orden en que llegaron. */
export const sectionPosts = (posts: Post[], markers: string[]): Post[] =>
  posts.filter((post) => belongsToSection(post, markers));

// ─── Destinos: dónde quiere aparecer una publicación ────────────────────────

/**
 * EL MURO GENERAL, COMO DESTINO.
 *
 * No es una sección: es el sitio donde está todo el mundo. Se nombra igual que
 * las secciones para que elegir dónde publicar sea una sola lista y no dos.
 */
export const MURO_GENERAL = 'general';

/**
 * Los destinos donde se puede publicar, en el orden en que se enseñan.
 *
 * Sale de `NOMBRE_SECCION`, que es la única lista de nombres de Weë: añadir una
 * sección allí la trae aquí sola. Weë Brain queda fuera a propósito —es un chat
 * que ayuda, no un sitio donde publicar— y ese es el único caso especial.
 */
export const DESTINO_BRAIN_EXCLUIDO = 'brain';

export const destinosDisponibles = (): ContextoPublicacion[] => [
  { id: MURO_GENERAL, nombre: 'Muro general' },
  ...Object.entries(NOMBRE_SECCION)
    .filter(([id]) => id !== DESTINO_BRAIN_EXCLUIDO)
    .map(([id, nombre]) => ({ id, nombre })),
];

/** Los destinos que trae la publicación, o undefined si es de las de antes. */
const destinosDe = (post: Post): string[] | undefined => {
  const lista = (post as { destinations?: unknown }).destinations;
  return Array.isArray(lista) && lista.length > 0 ? (lista as string[]) : undefined;
};

/**
 * ¿Va esta publicación al muro general?
 *
 * Con destinos, manda lo que eligió quien publicó: si no puso "general", no sale
 * en el muro general aunque hable de lo que hable.
 *
 * Sin destinos —todo lo publicado antes de esta fase— sale, como ha salido
 * siempre. No se migra nada, y por eso ninguna publicación antigua desaparece.
 */
export const vaAlMuroGeneral = (post: Post): boolean => {
  const destinos = destinosDe(post);
  return destinos ? destinos.includes(MURO_GENERAL) : true;
};

/**
 * ¿Va esta publicación al muro de esta sección?
 *
 * Con destinos, SOLO si la sección está elegida. Quien escribe "me voy de viaje"
 * y publica únicamente en el muro general no acaba en Weë Travel: lo decidió.
 * Adivinar por palabras cuando la persona ya ha dicho lo que quiere es pisarla.
 *
 * Sin destinos, las palabras clave de siempre. Es lo que llena hoy los muros de
 * Chef, Design, Studio y Travel, y quitarlo de golpe los dejaría vacíos.
 */
export const vaALaSeccion = (post: Post, sectionId: string): boolean => {
  const destinos = destinosDe(post);
  if (destinos) return destinos.includes(sectionId);
  return belongsToSection(post, SECTION_MARKERS[sectionId] || []);
};

/** Las de una sección, respetando lo que cada publicación diga de sí misma. */
export const postsDeLaSeccion = (posts: Post[], sectionId: string): Post[] =>
  posts.filter((post) => vaALaSeccion(post, sectionId));

/**
 * Cuántas veces como mucho se vuelve a pedir para completar una página.
 *
 * Filtrar en el cliente una consulta paginada tiene una trampa conocida: pides 15
 * documentos y te quedas con 9 visibles, así que la pantalla se ve corta y parece
 * que el muro se acabó cuando no se ha acabado. La salida es volver a pedir hasta
 * completar el lote... y eso, sin tope, es un bucle que puede recorrer la
 * colección entera si nadie publica en el muro general.
 *
 * Cuatro vueltas es el tope. Con la sobreconsulta de abajo son hasta 120
 * documentos por página, y si aun así no salen 15 visibles se enseña lo que haya:
 * más vale una página corta que una pantalla congelada pidiendo sin parar.
 */
const MAXIMO_DE_VUELTAS = 4;

/** Se piden el doble de los que se quieren enseñar: la mayoría serán visibles. */
export const sobreconsulta = (visiblesQueQueremos: number): number => visiblesQueQueremos * 2;

interface PaginaDeMuro {
  visibles: Post[];
  lastDoc: unknown;
  hayMas: boolean;
}

/**
 * Una página del muro general, ya filtrada, con suficientes publicaciones.
 *
 * `pedir` es quien va a Firestore. Se pasa por fuera a propósito: así este archivo
 * no depende de los servicios y se puede probar sin red ni base de datos.
 *
 * `hayMas` mira los DOCUMENTOS leídos, no los visibles. Es la diferencia entre
 * "no queda nada" y "de esta tanda no había nada para ti": lo segundo no es el
 * final del muro y no debe apagar el scroll.
 */
export const paginaDelMuroGeneral = async (
  pedir: (desde: unknown) => Promise<{ documents?: Post[]; lastDoc?: unknown } | undefined>,
  visiblesQueQueremos: number,
  desde: unknown = undefined
): Promise<PaginaDeMuro> => {
  const visibles: Post[] = [];
  let cursor: unknown = desde;
  let hayMas = true;

  for (let vuelta = 0; vuelta < MAXIMO_DE_VUELTAS && visibles.length < visiblesQueQueremos && hayMas; vuelta++) {
    const pagina = await pedir(cursor);
    const documentos = pagina?.documents || [];
    visibles.push(...documentos.filter(vaAlMuroGeneral));
    cursor = pagina?.lastDoc ?? null;
    // Sin cursor o sin documentos, se acabó la colección de verdad.
    hayMas = documentos.length > 0 && !!cursor;
  }

  return { visibles, lastDoc: cursor, hayMas };
};

// ─── El WeeTag: de qué contexto viene una publicación ───────────────────────

/**
 * De dónde viene una publicación, para poder decirlo en voz alta.
 *
 * Ojo con la diferencia respecto a todo lo de arriba. `belongsToSection` es
 * GENEROSA a propósito: una publicación que hable de una cena entra en el muro de
 * Weë Chef aunque su autor no eligiera nada, y eso está bien para llenar un muro.
 *
 * Para una ETIQUETA no vale. Poner "Weë Chef" sobre la publicación de alguien
 * porque escribió la palabra "cena" es ponerle palabras en la boca. Así que el
 * WeeTag solo mira señales EXPLÍCITAS: la comunidad que la persona eligió, o la
 * herramienta que quedó apuntada al publicar desde una sección de Weë Creator.
 *
 * Y no escribe nada: lee lo que la publicación ya trae. Weë no guarda todavía la
 * sección dentro del post, y esta fase no la añade.
 */
export interface ContextoPublicacion {
  /** El identificador de la experiencia: 'chef', 'design', 'studio'… */
  id: string;
  /** Cómo se llama para quien lo lee. Sale de la fuente única de nombres. */
  nombre: string;
}

/**
 * El nombre visible de cada sección, tal y como se escribe en Weë. La clave es la
 * misma que la de SECTION_MARKERS para que no haya dos listas que mantener.
 */
const NOMBRE_SECCION: Record<string, string> = {
  chef: 'Weë Chef',
  design: 'Weë Design',
  studio: 'Weë Studio',
  writer: 'Weë Writer',
  music: 'Weë Music',
  business: 'Weë Business',
  brain: 'Weë Brain',
  travel: 'Weë Travel',
};

/**
 * La sección de la que viene una publicación, o undefined si no lo dice.
 *
 * La señal es `aiTools`: quien publica el resultado de una sección lleva ahí su
 * nombre —"Weë Design", "Weë Chef"—, puesto por el propio flujo al pasar por la
 * pantalla de crear. Es lo más parecido a una declaración de origen que Weë tiene
 * hoy, y es explícita: nadie acaba etiquetado por casualidad.
 */
export const seccionDe = (post: Post): ContextoPublicacion | undefined => {
  /*
   * Primero, lo que la publicación DICE de sí misma.
   *
   * Desde la fase 2E-63C.1 el flujo que trae a alguien hasta la pantalla de crear
   * deja apuntada su sección en el post. Es una declaración, no una sospecha, y
   * por eso gana siempre: si está, se usa y no se mira nada más. Lo contrario
   * —adivinar primero y pisar el dato explícito— sería tirar a la basura lo único
   * que sabemos con certeza.
   */
  if (post.sourceSection) {
    const nombre = NOMBRE_SECCION[post.sourceSection];
    if (nombre) return { id: post.sourceSection, nombre };
  }

  /*
   * Y si no lo dice, lo de siempre: las publicaciones anteriores a esa fase no
   * traen el campo, y no se van a migrar. Para ellas queda la señal que había
   * —el nombre de la sección apuntado en las herramientas al publicar—, que
   * sigue siendo explícita: alguien la escribió o la puso el flujo.
   */
  const herramientas = (post.aiTools || []).map(normalize);
  if (herramientas.length === 0) return undefined;

  for (const [id, nombre] of Object.entries(NOMBRE_SECCION)) {
    // "wee design" dentro de "Weë Design": la comparación va normalizada, así que
    // la diéresis y las mayúsculas dan igual.
    if (herramientas.some((h) => h.includes(normalize(nombre)))) return { id, nombre };
  }
  return undefined;
};
