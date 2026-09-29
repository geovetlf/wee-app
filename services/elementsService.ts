import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * LO QUE LA CUENTA TIENE GUARDADO (Elements), para VINCULARLO desde Filmmaker.
 *
 * Una sola pregunta, por la puerta de siempre (`elements`, `op: 'list'`): los que
 * están vivos, de UNA clase y con tope, con su nombre, su clase y su versión. Ni
 * sus materiales ni nada más: para vincular basta con eso, y el servidor vuelve a
 * comprobar el vínculo al guardar la producción (Fase 10 del motor).
 *
 * Fase 22 del motor (arreglo R7 de la auditoría): por PÁGINAS y en orden estable, sin el tope fijo de ocho. Cada
 * página trae el cursor de la siguiente (`next`), y sin él no hay más.
 */
export interface ElementoGuardado {
  readonly elementId: string;
  readonly type: string;
  readonly name: string;
  readonly version: number;
}

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const aElemento = (v: unknown): ElementoGuardado | null => (
  esObj(v) && typeof v.elementId === 'string' && typeof v.type === 'string' && typeof v.name === 'string'
    && typeof v.version === 'number' && Number.isInteger(v.version) && v.version >= 1
    ? { elementId: v.elementId, type: v.type, name: v.name, version: v.version }
    : null
);

/** Una página de lo guardado de una clase: sus elementos, en orden estable, y el cursor de la siguiente si la hay. */
export type PaginaDeGuardados =
  | { readonly ok: true; readonly elementos: readonly ElementoGuardado[]; readonly siguiente?: string }
  | { readonly ok: false };

/** Lo que se pide por página: lo mismo que el servidor da si no se le dice nada. */
export const POR_PAGINA = 20;

const pagina = async (type: string, opciones: { readonly limit?: number; readonly after?: string } = {}): Promise<PaginaDeGuardados> => {
  try {
    if (!functions) return { ok: false };
    const fn = httpsCallable<Record<string, unknown>, { elements?: unknown; next?: unknown }>(functions, 'elements', { timeout: 30_000 });
    const r = await fn({ op: 'list', type, limit: opciones.limit ?? POR_PAGINA, ...(opciones.after ? { after: opciones.after } : {}) });
    const lista = Array.isArray(r.data?.elements) ? r.data.elements : null;
    if (!lista) return { ok: false };
    const siguiente = typeof r.data?.next === 'string' && r.data.next ? r.data.next : undefined;
    return { ok: true, elementos: lista.map(aElemento).filter((e): e is ElementoGuardado => !!e), ...(siguiente ? { siguiente } : {}) };
  } catch {
    return { ok: false };
  }
};

export const elementsService = {
  /** Una página de los de una clase. Si no se puede preguntar, no hay ninguno: quien pinta lo dice. */
  pagina,
  /** La primera página de los de una clase (lo de siempre, para quien no pagina). */
  listar: async (type: string): Promise<{ readonly ok: true; readonly elementos: readonly ElementoGuardado[] } | { readonly ok: false }> => {
    const r = await pagina(type);
    return r.ok ? { ok: true, elementos: r.elementos } : { ok: false };
  },
};
