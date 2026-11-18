/**
 * LA PRIMERA CAPA DE WEË FILMMAKER — «Crear» (2026-11-17). Diseño: `_filmmaker-mision-2026-11-17/diseno/ESPECIFICACION-PANTALLA-CREAR.md`.
 * Solo constantes de diseño: nada de lógica ni de textos (los textos son claves de `filmmaker.hub*`).
 */

/**
 * EL CHIP DE MARCA «Weë Brain» EN EL COMPOSITOR: decisión del dueño PENDIENTE entre
 *   A · `true`  — una etiqueta de marca, no seleccionable, junto a la píldora de formato;
 *   B · `false` — sin chip (la variante RECOMENDADA, la que está puesta).
 * Cambiar este valor basta para pasar de una a otra; las dos están comprobadas por `functions/test/filmmaker-crear.test.mjs`.
 */
export const CHIP_DE_MARCA_EN_COMPOSER = false;

import type { NombreDeIcono } from '../components/icons/trazosDeWee';
import type { TexturaDeModulo } from '../components/weeai/arteDePortada';

export type EstadoDeTipo = 'habilitada' | 'plantilla' | 'cerrada';

export interface TipoDeProyecto {
  id: 'film' | 'short' | 'series' | 'ad';
  /** Claves de `filmmaker.*`. */
  clave: string;
  claveSub: string;
  estado: EstadoDeTipo;
  /** El motivo de un tipo CERRADO (se anuncia y se dice al tocarlo). */
  claveMotivo?: string;
  /** Formato y duración sugeridos. Solo `ads` (4:5, 15 s) viene del contrato; el resto son sugerencias del diseño. */
  formato: '9:16' | '16:9' | '1:1' | '4:5';
  segundos: number;
  /** El preset del contrato que la operación `create` admite hoy (`ads`); sin él, la producción nace con el formato por defecto. */
  preset?: 'ads';
}

/** Cuatro tipos: Cortometraje y Anuncio habilitados, Película como plantilla, Serie cerrada (sin simular; Videoclip no es de Filmmaker: vive en la sección Vídeos). */
export const TIPOS_DE_PROYECTO: readonly TipoDeProyecto[] = [
  { id: 'film', clave: 'filmmaker.hubTypeFilm', claveSub: 'filmmaker.hubTypeFilmSub', estado: 'plantilla', formato: '16:9', segundos: 120 },
  { id: 'short', clave: 'filmmaker.hubTypeShort', claveSub: 'filmmaker.hubTypeShortSub', estado: 'habilitada', formato: '16:9', segundos: 60 },
  { id: 'series', clave: 'filmmaker.hubTypeSeries', claveSub: 'filmmaker.hubTypeSeriesSub', estado: 'cerrada', claveMotivo: 'filmmaker.hubTypeSeriesWhy', formato: '16:9', segundos: 60 },
  { id: 'ad', clave: 'filmmaker.hubTypeAd', claveSub: 'filmmaker.hubTypeAdSub', estado: 'habilitada', formato: '9:16', segundos: 15 },
];

/** Lo que vale sin elegir tipo. */
export const FORMATO_POR_DEFECTO = { formato: '9:16', segundos: 30 } as const;

/** Alturas útiles (dp) a partir de las que aparece cada bloque. */
/**
 * La píldora «formato · duración · Auto» sobre la caja: oculta desde 2026-11-17 (decisión del dueño); formato y duración volverán en la siguiente capa del tipo.
 * La lógica se guarda: con `true` vuelve a pintarse.
 */
export const PILDORA_DE_FORMATO_VISIBLE = false;

export const ALTURAS = { hero: 700 } as const;

/** El icono lineal de cada tipo: película y cortometraje, claqueta; serie, capas; anuncio, megáfono. */
export const ICONO_DE_TIPO: Record<TipoDeProyecto['id'], NombreDeIcono> = { film: 'claqueta', short: 'claqueta', series: 'capas', ad: 'megafono' };

/** La textura vectorial del fondo propio de cada tarjeta (lo que se ve mientras la imagen no está). */
export const TEXTURA_DE_TIPO: Record<TipoDeProyecto['id'], TexturaDeModulo> = { film: 'video', short: 'imagen', series: 'texto', ad: 'tresD' };

/**
 * LAS IMAGENES DE FONDO: `assets/images/filmmaker/tipos/<tipo>.webp` (2:1 las de media tarjeta, 4:1 la de Anuncio). En el repositorio hay un
 * MARCADOR de 1 px por tipo —el empaquetador exige que el archivo exista—; mientras sea el marcador la tarjeta enseña su fondo propio. Para
 * poner la imagen real basta con reemplazar el archivo por el definitivo (cualquier ancho >= 300 px): no hay que tocar el código.
 */
export const IMAGEN_DE_TIPO: Record<TipoDeProyecto['id'], number> = {
  film: require('../assets/images/filmmaker/tipos/pelicula.webp'),
  short: require('../assets/images/filmmaker/tipos/cortometraje.webp'),
  series: require('../assets/images/filmmaker/tipos/serie.webp'),
  ad: require('../assets/images/filmmaker/tipos/anuncio.webp'),
};
