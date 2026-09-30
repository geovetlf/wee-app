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

/**
 * FILMMAKER ENGINE · 3D DENTRO DE FILMMAKER · GUARDAR ALGO PARA REUTILIZARLO.
 *
 * La puerta `elements` sabía crear desde la S4 (`op: 'create'`) y la app solo sabía listar: un personaje, un lugar o
 * un objeto de una producción no se podía guardar en la cuenta para usarlo en otra —ni, mañana, en Weë Design—. Esto
 * es esa pregunta, tal cual la entiende el servidor: el tipo del Core, el nombre, una descripción y, si los hay, los
 * materiales que lo muestran (sus ids, nunca URLs). La cuenta la pone el servidor desde la sesión; que cada material
 * sea de la cuenta y se pueda usar, también. El id lo pone el cliente, una vez: repetir la misma petición no crea dos.
 */
export interface NuevoElemento {
  readonly elementId: string;
  readonly type: string;
  readonly name: string;
  readonly description?: string;
  readonly refs?: readonly { readonly assetId: string; readonly role: 'primary' | 'reference' | 'supporting'; readonly kind: string }[];
}

/** Por qué no se pudo: un material que no está o no es tuyo, algo con mala forma, o que no se pudo preguntar. */
export type ResultadoDeCrearElemento =
  | { readonly ok: true; readonly elemento: ElementoGuardado }
  | { readonly ok: false; readonly motivo: 'material' | 'forma' | 'sin_respuesta' };

/** El id de un Element nuevo: la misma forma que el Core admite (`FORMA_DE_ID_DE_ELEMENTO`). */
export const nuevoIdDeElemento = (): string => {
  const letras = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = 'el_';
  for (let i = 0; i < 16; i += 1) s += letras[Math.floor(Math.random() * letras.length)];
  return s;
};

const crear = async (nuevo: NuevoElemento): Promise<ResultadoDeCrearElemento> => {
  try {
    if (!functions) return { ok: false, motivo: 'sin_respuesta' };
    const fn = httpsCallable<Record<string, unknown>, { element?: unknown }>(functions, 'elements', { timeout: 30_000 });
    const r = await fn({
      op: 'create',
      elementId: nuevo.elementId,
      type: nuevo.type,
      name: nuevo.name,
      ...(nuevo.description ? { description: nuevo.description } : {}),
      refs: nuevo.refs ?? [],
    });
    const elemento = aElemento(r.data?.element);
    return elemento ? { ok: true, elemento } : { ok: false, motivo: 'sin_respuesta' };
  } catch (e) {
    const code = String((e as { code?: unknown })?.code ?? '');
    if (code.endsWith('not-found')) return { ok: false, motivo: 'material' };
    if (code.endsWith('invalid-argument')) return { ok: false, motivo: 'forma' };
    return { ok: false, motivo: 'sin_respuesta' };
  }
};

/**
 * 3D DENTRO DE FILMMAKER · ¿TIENE ESTE GUARDADO UN MODELO 3D?
 *
 * Lo guardado APUNTA a sus materiales (`refs`), y el modelo 3D es uno de ellos: se pregunta a la puerta de siempre
 * (`op: 'get'`, la cuenta la pone el servidor y lo ajeno no existe) y se devuelve su material —el principal si lo es,
 * si no el primero—. Solo el id: ver el modelo es otra pregunta, a Mis creaciones.
 */
export type ModeloDelGuardado =
  | { readonly estado: 'con_modelo'; readonly assetId: string }
  | { readonly estado: 'sin_modelo' }
  | { readonly estado: 'sin_respuesta' };

const modelo3dDe = async (elementId: string): Promise<ModeloDelGuardado> => {
  try {
    if (!functions) return { estado: 'sin_respuesta' };
    const fn = httpsCallable<Record<string, unknown>, { element?: unknown }>(functions, 'elements', { timeout: 30_000 });
    const r = await fn({ op: 'get', elementId });
    const refs = esObj(r.data?.element) && Array.isArray(r.data.element.refs) ? r.data.element.refs.filter(esObj) : [];
    const modelos = refs.filter((x) => x.kind === 'model3d' && typeof x.assetId === 'string');
    const elegido = modelos.find((x) => x.role === 'primary') ?? modelos[0];
    return elegido ? { estado: 'con_modelo', assetId: elegido.assetId as string } : { estado: 'sin_modelo' };
  } catch (e) {
    /* Archivado, ajeno o que ya no está: para la ficha es lo mismo que no tener modelo. */
    return String((e as { code?: unknown })?.code ?? '').endsWith('not-found') ? { estado: 'sin_modelo' } : { estado: 'sin_respuesta' };
  }
};

export const elementsService = {
  /** Una página de los de una clase. Si no se puede preguntar, no hay ninguno: quien pinta lo dice. */
  pagina,
  /** Guardar algo en la cuenta para reutilizarlo (3D dentro de Filmmaker). */
  crear,
  /** ¿Tiene un modelo 3D? Su material, o que no (3D dentro de Filmmaker). */
  modelo3dDe,
  /** La primera página de los de una clase (lo de siempre, para quien no pagina). */
  listar: async (type: string): Promise<{ readonly ok: true; readonly elementos: readonly ElementoGuardado[] } | { readonly ok: false }> => {
    const r = await pagina(type);
    return r.ok ? { ok: true, elementos: r.elementos } : { ok: false };
  },
};
