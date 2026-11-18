/**
 * EL COMPOSER DE IDEA DE WEË FILMMAKER (etapa 1). Solo DATOS: tipos con taller, topes, duraciones y las filas del «+».
 * La pantalla de Idea es cabecera + una píldora (tipo · estilo) + un saludo + la caja común; no hay selectores, preguntas apiladas ni etapas.
 * La lógica pura vive en `utils/ideaDeFilmmaker.ts`; lo que se lee se resuelve con `t()` donde se pinta.
 */
import type { NombreDeIcono } from '../components/icons/trazosDeWee';

/** Los tipos que tienen taller hoy. Serie y Videoclip siguen cerrados en la primera capa. */
export type TipoDeTaller = 'short' | 'film' | 'ad';
export const TIPOS_CON_TALLER: readonly TipoDeTaller[] = ['short', 'film', 'ad'];

/** Los topes de lo que se escribe (caracteres). El guion pegado admite hasta 12 000 (referencia Magiclight). */
export const TOPES = { titulo: 80, idea: 600, guion: 12000 } as const;

/**
 * La hoja del «+»: solo lo VIVO se ve como fila —hoy, «Pegar texto»—. Lo que todavía no existe (imagen de referencia, personaje, mundo, documento, lo guardado
 * en Mis proyectos) NO se pinta como filas apagadas: se dice en UNA línea al pie, sin jerga. Cuando una capacidad abra, pasa a ser una fila aquí.
 */
export const ADJUNTOS = [
  { id: 'paste', clave: 'filmmaker.attachPaste', claveSub: 'filmmaker.attachPasteSub', icono: 'texto' as NombreDeIcono },
] as const;

/** Duraciones objetivo sugeridas por tipo (segundos). Son del diseño, no del contrato; el tope por plano lo marca el modelo en Planos (D7). */
export const DURACIONES: Record<TipoDeTaller, readonly number[]> = { short: [30, 60, 90, 120], film: [120, 180, 300, 600], ad: [15, 30] };
export const DURACION_POR_DEFECTO: Record<TipoDeTaller, number> = { short: 60, film: 120, ad: 15 };
/** Lo que `create` admite hoy como formato y resolución (contrato de producciones): el nivel Avanzado de la hoja «Proyecto» ofrece estos, más «Auto». */
export const FORMATOS: readonly string[] = ['16:9', '9:16', '1:1', '4:5'];
export const RESOLUCIONES_ELEGIBLES: readonly string[] = ['720p', '1080p'];
