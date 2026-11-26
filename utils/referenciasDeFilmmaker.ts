/**
 * LAS REFERENCIAS DE LA IDEA (Filmmaker, 2026-11-18): las imágenes que la persona adjunta al borrador —una imagen de referencia, un personaje, un mundo—.
 * Lógica pura (sin React ni red): se prueba en Node. Una referencia basta; ninguna imagen por escena es requisito. Un personaje cuenta para la
 * regla «al menos un personaje para aprobar el Universo». El contrato de `createProduction` no tiene campo de referencias: viven en el estado del flujo
 * (el Universo y el agente de imágenes las leen de ahí) y el servidor podría recibirlas como `references: [{ role, url }]`.
 */
export type RolDeReferencia = 'reference' | 'character' | 'world';
export type EstadoDeReferencia = 'subiendo' | 'lista' | 'error';

export interface ReferenciaDeIdea {
  readonly id: string;
  readonly rol: RolDeReferencia;
  /** Con qué se pinta la miniatura (la local mientras sube, la URL del Storage después). */
  readonly uri: string;
  /** La URL en el Storage de Weë (o la de entrega de una creación): lo que viaja, nunca el archivo. */
  readonly url?: string;
  readonly estado: EstadoDeReferencia;
  readonly origen: 'subida' | 'creaciones';
}

export const MAX_REFERENCIAS = 8;
export const ROLES: readonly RolDeReferencia[] = ['reference', 'character', 'world'];

export const hayCupo = (r: readonly ReferenciaDeIdea[]): boolean => r.length < MAX_REFERENCIAS;
export const listas = (r: readonly ReferenciaDeIdea[]): readonly ReferenciaDeIdea[] => r.filter((x) => x.estado === 'lista' && !!x.url);
export const personajes = (r: readonly ReferenciaDeIdea[]): readonly ReferenciaDeIdea[] => listas(r).filter((x) => x.rol === 'character');
export const hayPersonaje = (r: readonly ReferenciaDeIdea[]): boolean => personajes(r).length > 0;
export const subiendo = (r: readonly ReferenciaDeIdea[]): boolean => r.some((x) => x.estado === 'subiendo');

export const agregar = (r: readonly ReferenciaDeIdea[], nueva: ReferenciaDeIdea): readonly ReferenciaDeIdea[] => (hayCupo(r) ? [...r, nueva] : r);
export const quitar = (r: readonly ReferenciaDeIdea[], id: string): readonly ReferenciaDeIdea[] => r.filter((x) => x.id !== id);
export const marcar = (r: readonly ReferenciaDeIdea[], id: string, cambios: Partial<Pick<ReferenciaDeIdea, 'estado' | 'url' | 'uri'>>): readonly ReferenciaDeIdea[] =>
  r.map((x) => (x.id === id ? { ...x, ...cambios } : x));

/**
 * El papel con el que entra una imagen nueva: «Personaje» mientras no haya ninguno (el Universo exige al menos uno) y «Referencia» después.
 * La persona lo cambia de un toque sobre la miniatura (`cambiarRol`): el rol se decide DESPUÉS de adjuntar, no en tres puertas distintas.
 */
export const rolPorDefecto = (r: readonly ReferenciaDeIdea[]): RolDeReferencia => (r.some((x) => x.rol === 'character') ? 'reference' : 'character');
export const cambiarRol = (r: readonly ReferenciaDeIdea[], id: string, rol: RolDeReferencia): readonly ReferenciaDeIdea[] => r.map((x) => (x.id === id ? { ...x, rol } : x));
