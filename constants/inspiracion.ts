/**
 * INSPIRA · LAS IDEAS LISTAS PARA USAR, COMO CLAVES.
 *
 * Una biblioteca pequeña y escrita a mano: recetas que Weë propone para empezar
 * —un vídeo nocturno cinematográfico, un anuncio de producto, un cortometraje en
 * tres escenas—. Cada una se ve, se abre, se personaliza y se manda a Crear: al
 * usarla, su idea y sus ajustes llegan puestos (decisión del usuario,
 * 2026-09-27).
 *
 * Este archivo se importa fuera de React, donde no hay traductor: guarda CLAVES.
 * El título, la descripción y el texto de la idea se leen, así que se traducen;
 * los identificadores, la categoría, el destino, el formato y el estilo son
 * datos y viajan tal cual. Lo que llega a la experiencia es la idea en el idioma
 * de quien la usa, porque es lo que esa persona pediría con sus palabras.
 *
 * No es contenido de la comunidad: eso vive en su muro. Aquí solo hay lo que
 * Weë propone.
 */

export type CategoriaDeInspiracion = 'cinematico' | 'comercial' | 'social' | 'producto' | 'personajes' | 'storytelling' | 'marketing';

/** Las categorías, en el orden de la fila de filtros. «Todos» no es una categoría: es no filtrar. */
export const CATEGORIAS_DE_INSPIRACION: readonly { readonly id: CategoriaDeInspiracion; readonly clave: string }[] = Object.freeze([
  { id: 'cinematico', clave: 'inspira.catCinematic' },
  { id: 'comercial', clave: 'inspira.catCommercial' },
  { id: 'social', clave: 'inspira.catSocial' },
  { id: 'producto', clave: 'inspira.catProduct' },
  { id: 'personajes', clave: 'inspira.catCharacters' },
  { id: 'storytelling', clave: 'inspira.catStorytelling' },
  { id: 'marketing', clave: 'inspira.catMarketing' },
]);

/**
 * A dónde lleva una receta al usarla:
 *   video      la creación de vídeo de un solo clip (Weë Studio);
 *   filmmaker  una producción nueva de Filmmaker, con la idea como intención;
 *   imagen     las imágenes del Studio;  escribir  el texto del Studio.
 */
export type DestinoDeReceta = 'video' | 'filmmaker' | 'imagen' | 'escribir';

/** Los tipos de «para qué» que entiende la plantilla de vídeo del servidor (su pregunta `type`). */
export type TipoDeVideo = 'promo' | 'social' | 'story';
/** Los formatos que la plantilla de vídeo sabe hacer (su pregunta `where`). */
export type FormatoDeVideo = '16:9' | '9:16' | '1:1';
/** Los estilos visuales que la pantalla de vídeo ofrece. */
export type EstiloDeVideo = 'cinematico' | 'realista' | 'anime' | '3d';

export interface Receta {
  readonly id: string;
  readonly categoria: CategoriaDeInspiracion;
  readonly destino: DestinoDeReceta;
  readonly clave: string;
  readonly claveDescripcion: string;
  /** El texto de la idea: lo que se pone en la caja al usarla. */
  readonly clavePrompt: string;
  readonly icono: string;
  /** Sale en «Ideas populares». */
  readonly popular?: boolean;
  /** Lo que se deja puesto al usarla en la creación de vídeo. */
  readonly ajustes?: { readonly formato?: FormatoDeVideo; readonly estilo?: EstiloDeVideo; readonly tipo?: TipoDeVideo };
}

export const RECETAS: readonly Receta[] = Object.freeze([
  {
    id: 'noche-en-tokio', categoria: 'cinematico', destino: 'video', icono: 'rainy-outline', popular: true,
    clave: 'inspira.rTokyoTitle', claveDescripcion: 'inspira.rTokyoDesc', clavePrompt: 'inspira.rTokyoPrompt',
    ajustes: { formato: '16:9', estilo: 'cinematico', tipo: 'story' },
  },
  {
    id: 'anuncio-de-producto', categoria: 'comercial', destino: 'video', icono: 'pricetag-outline', popular: true,
    clave: 'inspira.rAdTitle', claveDescripcion: 'inspira.rAdDesc', clavePrompt: 'inspira.rAdPrompt',
    ajustes: { formato: '9:16', estilo: 'realista', tipo: 'promo' },
  },
  {
    id: 'cortometraje', categoria: 'storytelling', destino: 'filmmaker', icono: 'film-outline', popular: true,
    clave: 'inspira.rShortTitle', claveDescripcion: 'inspira.rShortDesc', clavePrompt: 'inspira.rShortPrompt',
  },
  {
    id: 'retrato-cinematografico', categoria: 'personajes', destino: 'imagen', icono: 'person-outline', popular: true,
    clave: 'inspira.rPortraitTitle', claveDescripcion: 'inspira.rPortraitDesc', clavePrompt: 'inspira.rPortraitPrompt',
  },
  {
    id: 'paseo-por-la-ciudad', categoria: 'cinematico', destino: 'video', icono: 'walk-outline',
    clave: 'inspira.rCityTitle', claveDescripcion: 'inspira.rCityDesc', clavePrompt: 'inspira.rCityPrompt',
    ajustes: { formato: '16:9', estilo: 'cinematico', tipo: 'story' },
  },
  {
    id: 'revelacion-de-producto', categoria: 'producto', destino: 'video', icono: 'cube-outline',
    clave: 'inspira.rRevealTitle', claveDescripcion: 'inspira.rRevealDesc', clavePrompt: 'inspira.rRevealPrompt',
    ajustes: { formato: '1:1', estilo: '3d', tipo: 'promo' },
  },
  {
    id: 'estilo-anime', categoria: 'personajes', destino: 'imagen', icono: 'color-palette-outline',
    clave: 'inspira.rAnimeTitle', claveDescripcion: 'inspira.rAnimeDesc', clavePrompt: 'inspira.rAnimePrompt',
  },
  {
    id: 'teaser-de-marca', categoria: 'marketing', destino: 'video', icono: 'megaphone-outline',
    clave: 'inspira.rTeaserTitle', claveDescripcion: 'inspira.rTeaserDesc', clavePrompt: 'inspira.rTeaserPrompt',
    ajustes: { formato: '16:9', estilo: 'cinematico', tipo: 'promo' },
  },
  {
    id: 'receta-rapida', categoria: 'social', destino: 'video', icono: 'restaurant-outline',
    clave: 'inspira.rRecipeTitle', claveDescripcion: 'inspira.rRecipeDesc', clavePrompt: 'inspira.rRecipePrompt',
    ajustes: { formato: '9:16', estilo: 'realista', tipo: 'social' },
  },
  {
    id: 'intro-de-viaje', categoria: 'social', destino: 'video', icono: 'airplane-outline',
    clave: 'inspira.rTripTitle', claveDescripcion: 'inspira.rTripDesc', clavePrompt: 'inspira.rTripPrompt',
    ajustes: { formato: '9:16', estilo: 'cinematico', tipo: 'social' },
  },
  {
    id: 'historia-de-tu-negocio', categoria: 'storytelling', destino: 'filmmaker', icono: 'storefront-outline',
    clave: 'inspira.rBusinessTitle', claveDescripcion: 'inspira.rBusinessDesc', clavePrompt: 'inspira.rBusinessPrompt',
  },
  {
    id: 'ficha-de-personaje', categoria: 'personajes', destino: 'imagen', icono: 'people-outline',
    clave: 'inspira.rSheetTitle', claveDescripcion: 'inspira.rSheetDesc', clavePrompt: 'inspira.rSheetPrompt',
  },
  {
    id: 'texto-de-lanzamiento', categoria: 'marketing', destino: 'escribir', icono: 'create-outline',
    clave: 'inspira.rLaunchTitle', claveDescripcion: 'inspira.rLaunchDesc', clavePrompt: 'inspira.rLaunchPrompt',
  },
  {
    id: 'foto-de-producto', categoria: 'producto', destino: 'imagen', icono: 'camera-outline',
    clave: 'inspira.rProductPhotoTitle', claveDescripcion: 'inspira.rProductPhotoDesc', clavePrompt: 'inspira.rProductPhotoPrompt',
  },
  {
    id: 'momento-para-redes', categoria: 'social', destino: 'video', icono: 'happy-outline',
    clave: 'inspira.rMomentTitle', claveDescripcion: 'inspira.rMomentDesc', clavePrompt: 'inspira.rMomentPrompt',
    ajustes: { formato: '9:16', estilo: 'realista', tipo: 'social' },
  },
] as Receta[]);

/** La clave del nombre de cada destino, para la etiqueta pequeña de la tarjeta. */
export const CLAVE_DEL_DESTINO: Readonly<Record<DestinoDeReceta, string>> = Object.freeze({
  video: 'inspira.destVideo',
  filmmaker: 'inspira.destFilmmaker',
  imagen: 'inspira.destImage',
  escribir: 'inspira.destWriting',
});

/** El experienceId de Weë AI al que va cada destino que se crea con la conversación guiada. */
export const EXPERIENCIA_DEL_DESTINO: Readonly<Partial<Record<DestinoDeReceta, string>>> = Object.freeze({
  imagen: 'photo',
  escribir: 'writer',
});

/**
 * El color de la portada de cada categoría. No es una imagen de ejemplo —no hay
 * ninguna que pueda pasar por un resultado de Weë—: es un tono, y el icono dice
 * de qué va. Se pinta sobre el tema, así que funciona en claro y en oscuro.
 */
export const TONO_DE_CATEGORIA: Readonly<Record<CategoriaDeInspiracion, readonly [string, string]>> = Object.freeze({
  cinematico: ['#1B2A4A', '#3B2A5C'],
  comercial: ['#4A3212', '#7A4E12'],
  social: ['#4A1B3A', '#7A2A4E'],
  producto: ['#123A3A', '#1E5A52'],
  personajes: ['#2E1B4A', '#4E2A7A'],
  storytelling: ['#4A1B1B', '#6A2A22'],
  marketing: ['#1B3A22', '#2A5A33'],
});
