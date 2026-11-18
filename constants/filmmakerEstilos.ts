/**
 * LOS ESTILOS DE FILMMAKER (segunda capa, 2026-11-18): catorce estilos estándar, los más pedidos primero (sin «Weë elige por mí» ni estilo por defecto: la persona elige).
 * Se ven TODOS a la vez, sin desplazamiento (`ElegirEstilo` calcula columnas y altura con el alto disponible).
 * Solo DATOS: identificador, clave i18n, la textura y los dos tonos del fondo propio que se ven mientras la imagen carga, y la imagen
 * (`assets/images/filmmaker/estilos/<id>.webp`, 640×480: ilustraciones procedurales de `_filmmaker-mision-2026-11-17/diseno/generar-estilos.cjs`; se sustituyen por
 * imágenes generadas sin tocar código; prompts en `diseno/PROMPTS-IMAGENES-ESTILOS.md`).
 * El estilo se guarda en el taller y se ve en la píldora; el contrato de crear no tiene campo de estilo, así que NO viaja al servidor.
 */
import type { TexturaDeModulo } from '../components/weeai/arteDePortada';

export interface EstiloDeFilmmaker { readonly id: string; readonly clave: string; readonly textura: TexturaDeModulo; readonly tonos: readonly [string, string] }

export const ESTILOS: readonly EstiloDeFilmmaker[] = [
  { id: 'realistic', clave: 'filmmaker.styleRealistic', textura: 'video', tonos: ['#33465E', '#0B0F16'] },
  { id: 'anime', clave: 'filmmaker.styleAnime', textura: 'imagen', tonos: ['#7A3E8C', '#1A0E24'] },
  { id: 'cartoon', clave: 'filmmaker.styleCartoon', textura: 'imagen', tonos: ['#B8742A', '#2A1808'] },
  { id: 'animation3d', clave: 'filmmaker.styleAnimation3d', textura: 'tresD', tonos: ['#1F8A96', '#08202A'] },
  { id: 'gothic', clave: 'filmmaker.styleGothic', textura: 'texto', tonos: ['#8A2535', '#1A080C'] },
  { id: 'scifi', clave: 'filmmaker.styleScifi', textura: 'tresD', tonos: ['#2B4FA8', '#0A1030'] },
  { id: 'noir', clave: 'filmmaker.styleNoir', textura: 'video', tonos: ['#585858', '#0A0A0A'] },
  { id: 'watercolor', clave: 'filmmaker.styleWatercolor', textura: 'imagen', tonos: ['#3C8AA0', '#0E2630'] },
  { id: 'pixel', clave: 'filmmaker.stylePixel', textura: 'tresD', tonos: ['#2F9A5C', '#0A2014'] },
  { id: 'comic', clave: 'filmmaker.styleComic', textura: 'texto', tonos: ['#B03A3A', '#240C0C'] },
  { id: 'fantasy', clave: 'filmmaker.styleFantasy', textura: 'imagen', tonos: ['#6C45B8', '#190F30'] },
  { id: 'claymation', clave: 'filmmaker.styleClaymation', textura: 'imagen', tonos: ['#A5603A', '#2A1409'] },
  { id: 'vintage', clave: 'filmmaker.styleVintage', textura: 'video', tonos: ['#A88A3A', '#2A200A'] },
  { id: 'documentary', clave: 'filmmaker.styleDocumentary', textura: 'audio', tonos: ['#5C8A5C', '#142014'] },
];

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
