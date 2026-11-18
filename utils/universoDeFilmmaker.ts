/**
 * LA LÓGICA PURA DEL UNIVERSO DE FILMMAKER (etapa 2, ola 2, 2026-11-17): la lámina con los personajes, lugares y objetos de la película (la «biblia
 * visual»). Sin React, sin red y sin texto de interfaz: se prueba en Node. Es estado de interfaz: el contrato de producciones de esta rama no tiene
 * elementos todavía, así que nada de esto viaja al servidor (ver PROGRESO). Aquí NO hay IA: los elementos los añade la persona; «Weë lee los personajes»
 * y regenerar la lámina están cerrados (documentos y generación de imágenes sin autorizar).
 */

export type TipoDeElemento = 'character' | 'place' | 'object';
export type GrupoDePersonaje = 'main' | 'important' | 'groups' | 'other';
/** Voz predeterminada del personaje: 'auto' (Weë elige) o el id libre de una voz del catálogo (lo decide `sonidoDeFilmmaker`). Cada escena la hereda. */
export type VozDePersonaje = string;

export interface ElementoDeUniverso {
  readonly id: string;
  readonly tipo: TipoDeElemento;
  readonly nombre: string;
  readonly linea: string;
  /** Solo los personajes se agrupan; lugares y objetos van en `other`. */
  readonly grupo: GrupoDePersonaje;
  /** Solo los personajes tienen voz; los demás elementos guardan 'auto' sin usarla. */
  readonly voz: VozDePersonaje;
  /** Dato de EJEMPLO que Weë puso para enseñar la lámina: se rotula «Ejemplo», no cuenta para aprobar y se quita de un toque. Al editarlo deja de serlo. */
  readonly ejemplo?: boolean;
}

export interface UniversoDelTaller {
  readonly elementos: readonly ElementoDeUniverso[];
  /** La persona aprobó la lámina. Cualquier cambio posterior la deja «por revisar» (se invalida, no se borra nada). */
  readonly aprobado: boolean;
  readonly siguiente: number;
}

export const TOPES_UNIVERSO = { nombre: 40, linea: 120, porTipo: 40 } as const;
export const GRUPOS: readonly GrupoDePersonaje[] = ['main', 'important', 'groups', 'other'];
export const TIPOS: readonly TipoDeElemento[] = ['character', 'place', 'object'];

export const universoVacio = (): UniversoDelTaller => ({ elementos: [], aprobado: false, siguiente: 1 });

const recortar = (s: string, n: number): string => Array.from(s.trim()).slice(0, n).join('');

/** «Jay Reeds — un forastero con un revólver»: el nombre es lo de antes del primer « — », « - » o «: »; lo demás es la línea. */
export const parsearEntrada = (texto: string): { nombre: string; linea: string } => {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  const corte = /\s[—–-]\s|:\s/.exec(limpio);
  const nombre = corte ? limpio.slice(0, corte.index) : limpio;
  const linea = corte ? limpio.slice(corte.index + corte[0].length) : '';
  return { nombre: recortar(nombre, TOPES_UNIVERSO.nombre), linea: recortar(linea, TOPES_UNIVERSO.linea) };
};

export const contar = (u: UniversoDelTaller): Record<TipoDeElemento, number> => ({
  character: u.elementos.filter((e) => e.tipo === 'character').length,
  place: u.elementos.filter((e) => e.tipo === 'place').length,
  object: u.elementos.filter((e) => e.tipo === 'object').length,
});

export const hayCupo = (u: UniversoDelTaller, tipo: TipoDeElemento): boolean => contar(u)[tipo] < TOPES_UNIVERSO.porTipo;

/** Añade un elemento escrito por la persona. Sin nombre no añade nada; sin cupo tampoco. */
export const anadir = (u: UniversoDelTaller, tipo: TipoDeElemento, texto: string, grupo: GrupoDePersonaje = 'main'): UniversoDelTaller => {
  const { nombre, linea } = parsearEntrada(texto);
  if (!nombre || !hayCupo(u, tipo)) return u;
  const e: ElementoDeUniverso = { id: `el_${u.siguiente}`, tipo, nombre, linea, grupo: tipo === 'character' ? grupo : 'other', voz: 'auto' };
  return { elementos: [...u.elementos, e], aprobado: false, siguiente: u.siguiente + 1 };
};

export const editar = (u: UniversoDelTaller, id: string, cambios: Partial<Pick<ElementoDeUniverso, 'nombre' | 'linea' | 'grupo' | 'voz'>>): UniversoDelTaller => ({
  ...u,
  aprobado: false,
  elementos: u.elementos.map((e) => (e.id !== id ? e : {
    ...e,
    nombre: cambios.nombre !== undefined ? recortar(cambios.nombre, TOPES_UNIVERSO.nombre) || e.nombre : e.nombre,
    linea: cambios.linea !== undefined ? recortar(cambios.linea, TOPES_UNIVERSO.linea) : e.linea,
    grupo: e.tipo === 'character' && cambios.grupo ? cambios.grupo : e.grupo,
    voz: e.tipo === 'character' && cambios.voz ? cambios.voz : e.voz,
    ejemplo: false,
  })),
});

export const quitar = (u: UniversoDelTaller, id: string): UniversoDelTaller => ({ ...u, aprobado: false, elementos: u.elementos.filter((e) => e.id !== id) });

/** Los elementos de un tipo; los personajes, por grupo (en el orden de `GRUPOS`, sin los grupos vacíos). */
export const secciones = (u: UniversoDelTaller, tipo: TipoDeElemento): { grupo: GrupoDePersonaje; elementos: readonly ElementoDeUniverso[] }[] =>
  GRUPOS.map((grupo) => ({ grupo, elementos: u.elementos.filter((e) => e.tipo === tipo && e.grupo === grupo) })).filter((s) => s.elementos.length > 0);

/** Aprobar exige al menos un personaje REAL (los de ejemplo no cuentan): sin personajes no hay universo que aprobar. */
export const puedeAprobar = (u: UniversoDelTaller): boolean => u.elementos.some((e) => e.tipo === 'character' && !e.ejemplo);

export const hayEjemplos = (u: UniversoDelTaller): boolean => u.elementos.some((e) => !!e.ejemplo);
/** Quita todos los elementos de ejemplo (y solo esos). */
export const quitarEjemplos = (u: UniversoDelTaller): UniversoDelTaller => ({ ...u, aprobado: false, elementos: u.elementos.filter((e) => !e.ejemplo) });
/** Pone elementos de ejemplo (ya con su texto resuelto) detrás de lo que haya. Respeta el cupo por tipo. */
export const anadirEjemplos = (u: UniversoDelTaller, ejemplos: readonly Pick<ElementoDeUniverso, 'tipo' | 'nombre' | 'linea' | 'grupo' | 'voz'>[]): UniversoDelTaller => {
  let r = u;
  for (const x of ejemplos) {
    if (!hayCupo(r, x.tipo)) continue;
    r = { elementos: [...r.elementos, { ...x, id: `el_${r.siguiente}`, ejemplo: true }], aprobado: false, siguiente: r.siguiente + 1 };
  }
  return r;
};
export const aprobar = (u: UniversoDelTaller): UniversoDelTaller => (puedeAprobar(u) ? { ...u, aprobado: true } : u);
