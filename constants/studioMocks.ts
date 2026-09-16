/*
 * CREACIONES DE MENTIRA, PARA PODER MIRAR LA PANTALLA.
 *
 * Weë Studio todavía no genera nada: esta fase es la experiencia, no la IA. La
 * galería necesita algo que enseñar para que se pueda juzgar si el sitio se
 * entiende, así que aquí hay cuatro piezas —una de cada tipo— con el aspecto
 * que tendrán las de verdad.
 *
 * NO son datos de nadie ni vienen de Firestore. El día que Weë Brain y el
 * motor estén conectados, esto se cambia por lo que devuelva `creatorJobs` y
 * este archivo se va entero.
 *
 * Los títulos no pasan por el traductor: una creación es contenido de quien la
 * hizo, no interfaz. Lo que sí se traduce es la etiqueta del TIPO, y esa vive
 * en el diccionario (`studio.kindImage`…).
 */

export type TipoDeCreacion = 'image' | 'video' | 'audio' | 'document';

export interface CreacionDeMuestra {
  id: string;
  tipo: TipoDeCreacion;
  /** Lo que escribió quien la creó. Contenido, no interfaz. */
  titulo: string;
  /** Solo los videos: cuánto duran, ya formateado. */
  duracion?: string;
  /** El color de la lámina mientras no hay medio real que enseñar. */
  tono: string;
}

/** La clave del diccionario que nombra cada tipo. */
export const CLAVE_DEL_TIPO: Record<TipoDeCreacion, string> = {
  image: 'studio.kindImage',
  video: 'studio.kindVideo',
  audio: 'studio.kindAudio',
  document: 'studio.kindDocument',
};

/** El icono de cada tipo, de la misma familia que el resto del Studio. */
export const ICONO_DEL_TIPO: Record<TipoDeCreacion, string> = {
  image: 'image-outline',
  video: 'play',
  audio: 'pulse-outline',
  document: 'document-text-outline',
};

export const CREACIONES_DE_MUESTRA: CreacionDeMuestra[] = [
  { id: 'm1', tipo: 'image', titulo: 'Lago entre montañas', tono: '#DCE7F0' },
  { id: 'm2', tipo: 'video', titulo: 'Salon en calido', duracion: '0:12', tono: '#EFE7DC' },
  { id: 'm3', tipo: 'audio', titulo: 'Narracion en espanol', tono: '#E8E8EA' },
  { id: 'm4', tipo: 'document', titulo: 'Good Ideas Better People', tono: '#F1EEE7' },
];
