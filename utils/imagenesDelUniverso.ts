import type { ElementoAGenerar, FormatoDeImagen, PeticionDeImagenes } from '../services/filmmakerImagenesService';
import { MAX_ELEMENTOS_POR_LOTE } from '../services/filmmakerImagenesService';
import type { ElementoDeUniverso, UniversoDelTaller } from './universoDeFilmmaker';

/**
 * WEË FILMMAKER · DEL UNIVERSO DE LA PANTALLA A LA PETICIÓN DE IMÁGENES (lógica pura, sin React ni red).
 *
 * Solo lo de la persona viaja: los elementos marcados «Ejemplo» no se generan nunca. El estilo es el que ELIGIÓ (sin estilo no hay petición).
 * La imagen de referencia es la UNA que subió (rol personaje) y el mundo, lo que escribió; si no hay, Weë lo interpreta. El hook
 * `useImagenesDeFilmmaker` cotiza y genera esta misma petición: lo que se cotiza es lo que se cobra.
 */

const CLASE_DE_TIPO = { character: 'personaje', place: 'lugar', object: 'objeto' } as const;

/** Formato de imagen que admite el lote a partir del de la producción (4:5, 4:3… no existen en imágenes: se pide el más cercano). */
export const formatoDeImagen = (aspecto: string | undefined): FormatoDeImagen => (aspecto === '9:16' || aspecto === '4:5' ? '9:16' : aspecto === '1:1' ? '1:1' : '16:9');

const aElemento = (e: ElementoDeUniverso): ElementoAGenerar => ({
  id: e.id,
  clase: CLASE_DE_TIPO[e.tipo],
  ...(e.tipo === 'character' ? { tipo: 'persona' as const } : {}),
  nombre: e.nombre,
  descripcion: e.linea || e.nombre,
});

/** Los elementos reales del universo (sin ejemplos) que caben en un lote. */
export const elementosAGenerar = (u: UniversoDelTaller): ElementoAGenerar[] => u.elementos.filter((e) => !e.ejemplo).slice(0, MAX_ELEMENTOS_POR_LOTE).map(aElemento);

export interface DatosDeLaPeticion { readonly estilo: string | null; readonly tipo?: string; readonly referencia?: string | null; readonly aspecto?: string }

/** La petición del universo, o el motivo por el que aún no se puede pedir: `estilo` | `referencia` | `nada`. */
export const peticionDeUniverso = (u: UniversoDelTaller, d: DatosDeLaPeticion): { ok: true; peticion: PeticionDeImagenes } | { ok: false; falta: 'estilo' | 'referencia' | 'nada' } => {
  if (!d.estilo) return { ok: false, falta: 'estilo' };
  const elementos = elementosAGenerar(u);
  if (!elementos.length) return { ok: false, falta: 'nada' };
  if (!d.referencia) return { ok: false, falta: 'referencia' };
  return {
    ok: true,
    peticion: {
      modo: 'universo', estilo: d.estilo, ...(d.tipo ? { tipo: d.tipo } : {}), referencia: d.referencia,
      ...(u.mundo?.trim() ? { mundo: u.mundo.trim() } : {}), formato: formatoDeImagen(d.aspecto), lamina: true, elementos,
    },
  };
};
