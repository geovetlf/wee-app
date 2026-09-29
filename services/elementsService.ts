import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * LO QUE LA CUENTA TIENE GUARDADO (Elements), para VINCULARLO desde Filmmaker.
 *
 * Una sola pregunta, por la puerta de siempre (`elements`, `op: 'list'`): los que
 * están vivos, de UNA clase y con tope, con su nombre, su clase y su versión. Ni
 * sus materiales ni nada más: para vincular basta con eso, y el servidor vuelve a
 * comprobar el vínculo al guardar la producción (Fase 10 del motor).
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

export const elementsService = {
  /** Los de una clase. Si no se puede preguntar, no hay ninguno: quien pinta lo dice. */
  listar: async (type: string): Promise<{ readonly ok: true; readonly elementos: readonly ElementoGuardado[] } | { readonly ok: false }> => {
    try {
      if (!functions) return { ok: false };
      const fn = httpsCallable<Record<string, unknown>, { elements?: unknown }>(functions, 'elements', { timeout: 30_000 });
      const r = await fn({ op: 'list', type });
      const lista = Array.isArray(r.data?.elements) ? r.data.elements : null;
      if (!lista) return { ok: false };
      return { ok: true, elementos: lista.map(aElemento).filter((e): e is ElementoGuardado => !!e) };
    } catch {
      return { ok: false };
    }
  },
};
