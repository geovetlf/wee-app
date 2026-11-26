/*
 * WeëPages — los tipos de página, sus secciones y lo que pide cada uno (functions/src/social/pages.ts lo valida igual).
 *
 * Una Weë Page es donde vive la OBRA de la cuenta (decisión del dueño, 2026-11-23): un libro, una película, una serie de
 * óleos, unos platos, un negocio. Al crearla, lo primero es decir QUÉ es («al crear tiene que salir qué tipo de página
 * sería»), y cada tipo trae sus campos y sus secciones por defecto, que el dueño puede ordenar o apagar.
 *
 * Catálogo de CLAVES (CLAUDE.md §8): quien pinta resuelve `t(claveTitulo)`. Los `id` de tipo, de campo, de sección y de
 * color viajan al servidor y se guardan tal cual en `pages/{pageId}`, así que no se traducen ni se renombran. Los siete
 * tipos de antes (`character`, `company`, `influencer`, `institution`, `brand`, `organization`, `other`) conservan su id
 * porque hay páginas guardadas con ellos; `company` se rotula hoy «Negocio».
 *
 * NADA SE VENDE DENTRO DE WEË (dueño, 2026-11-23): las secciones de «dónde conseguirlo» son ENLACES externos `https`.
 */
export type TipoDePagina =
  // Obras
  | 'book' | 'film' | 'comic' | 'music'
  // Arte y oficio
  | 'painting' | 'illustration' | 'photography' | 'crafts' | 'sculpture' | 'fashion' | 'food' | 'design'
  // Personajes y creadores
  | 'character' | 'influencer'
  // Negocios y marcas
  | 'company' | 'brand' | 'services' | 'institution' | 'organization'
  // Lo demás
  | 'other';

/** Las secciones que puede tener una página. Cada una se llena con un dato de la página (`fuente`). */
export type IdDeSeccion =
  | 'synopsis' | 'aboutWork' | 'offer'
  | 'sample'
  | 'gallery' | 'room' | 'portfolio' | 'essay' | 'pieces' | 'collection' | 'dishes' | 'projects'
  | 'scenes'
  | 'whereToBuy' | 'whereToWatch' | 'whereToListen' | 'links'
  | 'sheet' | 'contact' | 'updates';

/**
 * De dónde sale lo que pinta una sección. Una sección VACÍA no se publica aunque esté encendida.
 * `muestra` es el PDF del libro: queda preparada y apagada hasta que exista la subida de PDF (pendiente).
 */
export type FuenteDeSeccion = 'texto' | 'galeria' | 'escenas' | 'enlaces' | 'ficha' | 'contacto' | 'muestra' | 'novedades';

export interface DefinicionDeSeccion {
  id: IdDeSeccion;
  clave: string;
  fuente: FuenteDeSeccion;
  icono: string;
}

const seccion = (id: IdDeSeccion, fuente: FuenteDeSeccion, icono: string): DefinicionDeSeccion => ({ id, clave: `pages.sec_${id}`, fuente, icono });

export const SECCIONES_DE_PAGINA: Readonly<Record<IdDeSeccion, DefinicionDeSeccion>> = {
  synopsis: seccion('synopsis', 'texto', 'reader-outline'),
  aboutWork: seccion('aboutWork', 'texto', 'reader-outline'),
  offer: seccion('offer', 'texto', 'reader-outline'),
  sample: seccion('sample', 'muestra', 'book-outline'),
  gallery: seccion('gallery', 'galeria', 'images-outline'),
  room: seccion('room', 'galeria', 'images-outline'),
  portfolio: seccion('portfolio', 'galeria', 'images-outline'),
  essay: seccion('essay', 'galeria', 'images-outline'),
  pieces: seccion('pieces', 'galeria', 'images-outline'),
  collection: seccion('collection', 'galeria', 'images-outline'),
  dishes: seccion('dishes', 'galeria', 'images-outline'),
  projects: seccion('projects', 'galeria', 'images-outline'),
  scenes: seccion('scenes', 'escenas', 'film-outline'),
  whereToBuy: seccion('whereToBuy', 'enlaces', 'bag-handle-outline'),
  whereToWatch: seccion('whereToWatch', 'enlaces', 'play-circle-outline'),
  whereToListen: seccion('whereToListen', 'enlaces', 'headset-outline'),
  links: seccion('links', 'enlaces', 'link-outline'),
  sheet: seccion('sheet', 'ficha', 'list-outline'),
  contact: seccion('contact', 'contacto', 'chatbubble-ellipses-outline'),
  updates: seccion('updates', 'novedades', 'time-outline'),
};

export const IDS_DE_SECCION = Object.keys(SECCIONES_DE_PAGINA) as IdDeSeccion[];

export interface CampoDePagina {
  id: string;
  clave: string;
  /** Varias líneas (biografía, misión…). */
  largo?: boolean;
  /** Elegir entre opciones en vez de escribir. */
  opciones?: readonly { id: string; clave: string }[];
}

export type GrupoDePagina = 'works' | 'art' | 'people' | 'business' | 'other';

export interface DefinicionDePagina {
  id: TipoDePagina;
  grupo: GrupoDePagina;
  icono: string;
  claveTitulo: string;
  claveDescripcion: string;
  /** Lo propio del tipo; lo común (título, usuario, imágenes, descripción…) lo pinta el editor para todos. */
  campos: readonly CampoDePagina[];
  /** Las secciones con las que nace, en su orden. El dueño las ordena o las apaga en el paso 3. */
  secciones: readonly IdDeSeccion[];
  /** Proporción de la portada en el editor: un libro o un cómic, vertical 2:3; lo demás, apaisada. */
  portadaVertical?: boolean;
}

const campo = (id: string, largo?: boolean): CampoDePagina => ({ id, clave: `pages.f_${id}`, largo });
const tipo = (id: TipoDePagina, grupo: GrupoDePagina, icono: string, campos: CampoDePagina[], secciones: IdDeSeccion[], portadaVertical?: boolean): DefinicionDePagina =>
  ({ id, grupo, icono, claveTitulo: `pages.type_${id}`, claveDescripcion: `pages.desc_${id}`, campos, secciones, portadaVertical });

export const TIPOS_DE_PAGINA: readonly DefinicionDePagina[] = [
  /* Obras */
  tipo('book', 'works', 'book-outline', [campo('genre'), campo('year'), campo('format')], ['synopsis', 'sample', 'gallery', 'scenes', 'whereToBuy', 'sheet', 'updates'], true),
  tipo('film', 'works', 'film-outline', [campo('genre'), campo('year'), campo('duration'), campo('cast', true)], ['synopsis', 'scenes', 'gallery', 'whereToWatch', 'sheet', 'updates']),
  tipo('comic', 'works', 'library-outline', [campo('genre'), campo('year'), campo('format')], ['synopsis', 'sample', 'gallery', 'whereToBuy', 'sheet', 'updates'], true),
  tipo('music', 'works', 'musical-notes-outline', [campo('genre'), campo('year'), campo('format')], ['aboutWork', 'gallery', 'whereToListen', 'sheet', 'updates']),
  /* Arte y oficio */
  tipo('painting', 'art', 'color-palette-outline', [campo('technique'), campo('dimensions'), campo('year')], ['room', 'aboutWork', 'sheet', 'whereToBuy', 'contact', 'updates']),
  tipo('illustration', 'art', 'brush-outline', [campo('technique'), campo('availability')], ['portfolio', 'aboutWork', 'whereToBuy', 'contact', 'updates']),
  tipo('photography', 'art', 'camera-outline', [campo('genre'), campo('year')], ['essay', 'aboutWork', 'whereToBuy', 'sheet', 'updates']),
  tipo('crafts', 'art', 'hand-left-outline', [campo('materials'), campo('availability')], ['pieces', 'aboutWork', 'whereToBuy', 'contact', 'updates']),
  tipo('sculpture', 'art', 'cube-outline', [campo('materials'), campo('dimensions')], ['pieces', 'aboutWork', 'sheet', 'contact', 'updates']),
  tipo('fashion', 'art', 'shirt-outline', [campo('materials'), campo('availability')], ['collection', 'aboutWork', 'whereToBuy', 'contact', 'updates']),
  tipo('food', 'art', 'restaurant-outline', [campo('cuisine'), campo('availability')], ['dishes', 'aboutWork', 'whereToBuy', 'contact', 'updates']),
  tipo('design', 'art', 'shapes-outline', [campo('discipline'), campo('availability')], ['projects', 'aboutWork', 'links', 'contact', 'updates']),
  /* Personajes y creadores */
  tipo('character', 'people', 'happy-outline', [
    campo('characterType'),
    { id: 'nature', clave: 'pages.f_nature', opciones: [{ id: 'fictional', clave: 'pages.nature_fictional' }, { id: 'real', clave: 'pages.nature_real' }] },
    campo('biography', true),
    campo('origin', true),
  ], ['aboutWork', 'gallery', 'scenes', 'sheet', 'links', 'updates']),
  tipo('influencer', 'people', 'megaphone-outline', [campo('contentCategory'), campo('topics'), campo('biography', true), campo('socialLinks')], ['aboutWork', 'gallery', 'links', 'sheet', 'updates']),
  /* Negocios y marcas */
  tipo('company', 'business', 'storefront-outline', [campo('industry'), campo('businessDescription', true)], ['aboutWork', 'gallery', 'whereToBuy', 'sheet', 'contact', 'updates']),
  tipo('brand', 'business', 'pricetag-outline', [campo('industry'), campo('brandDescription', true), campo('visualIdentity')], ['aboutWork', 'collection', 'whereToBuy', 'sheet', 'updates']),
  tipo('services', 'business', 'briefcase-outline', [campo('discipline'), campo('availability')], ['offer', 'gallery', 'links', 'contact', 'updates']),
  tipo('institution', 'business', 'school-outline', [campo('institutionType'), campo('mission', true)], ['aboutWork', 'gallery', 'links', 'sheet', 'contact', 'updates']),
  tipo('organization', 'business', 'people-outline', [campo('organizationType'), campo('mission', true)], ['aboutWork', 'gallery', 'links', 'sheet', 'contact', 'updates']),
  /* Lo demás */
  tipo('other', 'other', 'ellipsis-horizontal-circle-outline', [], ['aboutWork', 'gallery', 'links', 'updates']),
];

/** Los grupos del selector, en su orden. «Otra» va sola al final, sin título de grupo. */
export const GRUPOS_DE_PAGINA: readonly { id: GrupoDePagina; clave: string | null }[] = [
  { id: 'works', clave: 'pages.group_works' },
  { id: 'art', clave: 'pages.group_art' },
  { id: 'people', clave: 'pages.group_people' },
  { id: 'business', clave: 'pages.group_business' },
  { id: 'other', clave: null },
];

export const tipoDePagina = (id?: string | null): DefinicionDePagina =>
  TIPOS_DE_PAGINA.find((t) => t.id === id) ?? TIPOS_DE_PAGINA[TIPOS_DE_PAGINA.length - 1];

/** Una sección elegida por el dueño: cuál, y si está encendida. El orden es el del array. */
export interface SeccionElegida {
  id: IdDeSeccion;
  enabled: boolean;
}

/** Las secciones con las que nace un tipo, todas encendidas. */
export const seccionesPorDefecto = (id?: string | null): SeccionElegida[] =>
  tipoDePagina(id).secciones.map((s) => ({ id: s, enabled: true }));

/**
 * Las secciones de una página guardada: las suyas si las tiene (las páginas anteriores a 2026-11-23 no las tienen, y
 * entonces valen las del tipo). Ignora ids desconocidos y repetidos.
 */
export const seccionesDeLaPagina = (tipoId: string | null | undefined, guardadas: readonly unknown[] | null | undefined): SeccionElegida[] => {
  if (!Array.isArray(guardadas) || guardadas.length === 0) return seccionesPorDefecto(tipoId);
  const vistas = new Set<string>();
  const salida: SeccionElegida[] = [];
  for (const s of guardadas) {
    const id = (s as { id?: unknown })?.id;
    if (typeof id !== 'string' || !(id in SECCIONES_DE_PAGINA) || vistas.has(id)) continue;
    vistas.add(id);
    salida.push({ id: id as IdDeSeccion, enabled: (s as { enabled?: unknown }).enabled !== false });
  }
  return salida.length ? salida : seccionesPorDefecto(tipoId);
};

/**
 * EL COLOR DE OBRA: un tono por página, que se usa en el filete del índice y en el separador de cada sección. Se guarda
 * el `id`; el valor se resuelve aquí. Sobre el negro de la sala todos se leen (contraste ≥ 4,5:1 con #050505).
 */
export const COLORES_DE_OBRA = [
  { id: 'amber', clave: 'pages.color_amber', valor: '#C98B4E' },
  { id: 'wine', clave: 'pages.color_wine', valor: '#C2665B' },
  { id: 'forest', clave: 'pages.color_forest', valor: '#86A874' },
  { id: 'sea', clave: 'pages.color_sea', valor: '#6FA3BD' },
  { id: 'plum', clave: 'pages.color_plum', valor: '#A88BCB' },
  { id: 'paper', clave: 'pages.color_paper', valor: '#F3F1EC' },
] as const;
export type ColorDeObra = (typeof COLORES_DE_OBRA)[number]['id'];
export const colorDeObra = (id?: string | null): string => (COLORES_DE_OBRA.find((c) => c.id === id) ?? COLORES_DE_OBRA[0]).valor;

/** Topes que también aplica el servidor. */
export const MAX_IMAGENES_DE_OBRA = 12;
export const MAX_ENLACES_DE_OBRA = 8;
