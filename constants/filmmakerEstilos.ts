/**
 * LOS ESTILOS DE FILMMAKER (segunda capa, 2026-11-18): catorce estilos estándar, los más pedidos primero (sin «Weë elige por mí» ni estilo por defecto: la persona elige). Se ven los diez primeros y los otros cuatro quedan tras «Más estilos» (`ESTILOS_VISIBLES`). Se
 * pintan con la MISMA tarjeta de los tipos de proyecto (`TarjetaDeTipo`: imagen a sangre, borde luminoso, 2:1); solo cambia la imagen.
 * Solo DATOS: identificador, clave i18n, la textura y los dos tonos del fondo propio que se ven mientras la imagen no existe, y la imagen
 * (`assets/images/filmmaker/estilos/<id>.webp`; hoy cada archivo es un marcador —el empaquetador exige que exista— y mientras tanto la tarjeta enseña su degradado sobrio; se sustituye por la
 * definitiva sin tocar código; prompts en `_filmmaker-mision-2026-11-17/diseno/PROMPTS-IMAGENES-ESTILOS.md`).
 * El estilo se guarda en el taller y se ve en la píldora; el contrato de crear no tiene campo de estilo, así que NO viaja al servidor.
 */
import type { TexturaDeModulo } from '../components/weeai/arteDePortada';

export interface EstiloDeFilmmaker { readonly id: string; readonly clave: string; readonly textura: TexturaDeModulo; readonly tonos: readonly [string, string] }

export const ESTILOS: readonly EstiloDeFilmmaker[] = [
  { id: 'realistic', clave: 'filmmaker.styleRealistic', textura: 'video', tonos: ['#1B2430', '#0A0D13'] },
  { id: 'anime', clave: 'filmmaker.styleAnime', textura: 'imagen', tonos: ['#3A1D3F', '#0F0A16'] },
  { id: 'cartoon', clave: 'filmmaker.styleCartoon', textura: 'imagen', tonos: ['#3D2A12', '#140E06'] },
  { id: 'animation3d', clave: 'filmmaker.styleAnimation3d', textura: 'tresD', tonos: ['#123A40', '#071518'] },
  { id: 'gothic', clave: 'filmmaker.styleGothic', textura: 'texto', tonos: ['#3A1218', '#0C0508'] },
  { id: 'scifi', clave: 'filmmaker.styleScifi', textura: 'tresD', tonos: ['#14284F', '#080C18'] },
  { id: 'noir', clave: 'filmmaker.styleNoir', textura: 'video', tonos: ['#2A2A2A', '#050505'] },
  { id: 'watercolor', clave: 'filmmaker.styleWatercolor', textura: 'imagen', tonos: ['#1F3A44', '#0A1417'] },
  { id: 'pixel', clave: 'filmmaker.stylePixel', textura: 'tresD', tonos: ['#1C3D2A', '#08140D'] },
  { id: 'comic', clave: 'filmmaker.styleComic', textura: 'texto', tonos: ['#4A1D1D', '#140808'] },
  { id: 'fantasy', clave: 'filmmaker.styleFantasy', textura: 'imagen', tonos: ['#2E1C52', '#0E0817'] },
  { id: 'claymation', clave: 'filmmaker.styleClaymation', textura: 'imagen', tonos: ['#4A2E1E', '#150D08'] },
  { id: 'vintage', clave: 'filmmaker.styleVintage', textura: 'video', tonos: ['#4A3A1C', '#130E05'] },
  { id: 'documentary', clave: 'filmmaker.styleDocumentary', textura: 'audio', tonos: ['#2A3A2A', '#0A100A'] },
];

/** Cuántos estilos se ven de entrada; el resto, a un toque en «Más estilos». */
export const ESTILOS_VISIBLES = 10;

export const IMAGEN_DE_ESTILO: Record<string, number> = {
  realistic: require('../assets/images/filmmaker/estilos/realistic.webp'),
  anime: require('../assets/images/filmmaker/estilos/anime.webp'),
  cartoon: require('../assets/images/filmmaker/estilos/cartoon.webp'),
  animation3d: require('../assets/images/filmmaker/estilos/animation3d.webp'),
  gothic: require('../assets/images/filmmaker/estilos/gothic.webp'),
  scifi: require('../assets/images/filmmaker/estilos/scifi.webp'),
  fantasy: require('../assets/images/filmmaker/estilos/fantasy.webp'),
  noir: require('../assets/images/filmmaker/estilos/noir.webp'),
  claymation: require('../assets/images/filmmaker/estilos/claymation.webp'),
  watercolor: require('../assets/images/filmmaker/estilos/watercolor.webp'),
  vintage: require('../assets/images/filmmaker/estilos/vintage.webp'),
  pixel: require('../assets/images/filmmaker/estilos/pixel.webp'),
  comic: require('../assets/images/filmmaker/estilos/comic.webp'),
  documentary: require('../assets/images/filmmaker/estilos/documentary.webp'),
};
