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
/** De dónde sale cada elemento: lo puso la persona («usuario», manda siempre), lo propuso Weë a falta de él o salió del documento que se leyó. */
export type OrigenDeUniverso = 'usuario' | 'propuesta' | 'documento';
/** Cómo se hace la ficha de un personaje detectado: la persona sube la suya o la interpreta Weë (según historia, tipo y estilo). */
export type ModoDeFicha = 'subir' | 'weeHace';

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
  /** Sin origen (datos antiguos) se trata como «usuario». */
  readonly origen?: OrigenDeUniverso;
  /** Solo en personajes que Weë detectó: la elección de la persona. Sin elegir, Weë todavía tiene que preguntar. */
  readonly ficha?: ModoDeFicha;
}

export interface UniversoDelTaller {
  readonly elementos: readonly ElementoDeUniverso[];
  /** La persona aprobó la lámina. Cualquier cambio posterior la deja «por revisar» (se invalida, no se borra nada). */
  readonly aprobado: boolean;
  readonly siguiente: number;
  /** El MUNDO / la escena (entorno, clima, lugares) en lenguaje natural. Opcional: vacío = lo propone Weë según libro + tipo + estilo. */
  readonly mundo?: string;
  readonly mundoOrigen?: OrigenDeUniverso;
}

export const TOPES_UNIVERSO = { nombre: 40, linea: 120, porTipo: 40, mundo: 400 } as const;
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
  const e: ElementoDeUniverso = { id: `el_${u.siguiente}`, tipo, nombre, linea, grupo: tipo === 'character' ? grupo : 'other', voz: 'auto', origen: 'usuario' };
  return { ...u, elementos: [...u.elementos, e], aprobado: false, siguiente: u.siguiente + 1 };
};

export const editar = (u: UniversoDelTaller, id: string, cambios: Partial<Pick<ElementoDeUniverso, 'nombre' | 'linea' | 'grupo' | 'voz' | 'ficha'>>): UniversoDelTaller => ({
  ...u,
  aprobado: false,
  elementos: u.elementos.map((e) => (e.id !== id ? e : {
    ...e,
    nombre: cambios.nombre !== undefined ? recortar(cambios.nombre, TOPES_UNIVERSO.nombre) || e.nombre : e.nombre,
    linea: cambios.linea !== undefined ? recortar(cambios.linea, TOPES_UNIVERSO.linea) : e.linea,
    grupo: e.tipo === 'character' && cambios.grupo ? cambios.grupo : e.grupo,
    voz: e.tipo === 'character' && cambios.voz ? cambios.voz : e.voz,
    ficha: e.tipo === 'character' && cambios.ficha ? cambios.ficha : e.ficha,
    /* Editar un detalle no cambia de dónde salió; solo deja de ser ejemplo. */
    ejemplo: false,
  })),
});

export const quitar = (u: UniversoDelTaller, id: string): UniversoDelTaller => ({ ...u, aprobado: false, elementos: u.elementos.filter((e) => e.id !== id) });

/** Los elementos de un tipo; los personajes, por grupo (en el orden de `GRUPOS`, sin los grupos vacíos). */
export const secciones = (u: UniversoDelTaller, tipo: TipoDeElemento): { grupo: GrupoDePersonaje; elementos: readonly ElementoDeUniverso[] }[] =>
  GRUPOS.map((grupo) => ({ grupo, elementos: u.elementos.filter((e) => e.tipo === tipo && e.grupo === grupo) })).filter((s) => s.elementos.length > 0);

/** Un elemento APORTADO por la persona (no de ejemplo): lo que ella puso o ya trajo con su ficha. Sin origen (datos antiguos) cuenta como suyo. */
export const esAportado = (e: ElementoDeUniverso): boolean => !e.ejemplo && (e.origen ?? 'usuario') === 'usuario';

/**
 * Continuar exige que la persona aporte AL MENOS UN PERSONAJE (su ficha o su imagen de referencia, que cumple ese papel). Los personajes que Weë
 * detecta en un documento o propone no cuentan por sí solos: el universo parte de lo que la persona trae. El mundo es opcional y nunca bloquea.
 */
export const puedeAprobar = (u: UniversoDelTaller, conReferencia = false): boolean => conReferencia || u.elementos.some((e) => e.tipo === 'character' && esAportado(e));

export const hayEjemplos = (u: UniversoDelTaller): boolean => u.elementos.some((e) => !!e.ejemplo);
/** Quita todos los elementos de ejemplo (y solo esos). */
export const quitarEjemplos = (u: UniversoDelTaller): UniversoDelTaller => ({ ...u, aprobado: false, elementos: u.elementos.filter((e) => !e.ejemplo) });
/** Pone elementos de ejemplo (ya con su texto resuelto) detrás de lo que haya. Respeta el cupo por tipo. */
export const anadirEjemplos = (u: UniversoDelTaller, ejemplos: readonly Pick<ElementoDeUniverso, 'tipo' | 'nombre' | 'linea' | 'grupo' | 'voz'>[]): UniversoDelTaller => {
  let r = u;
  for (const x of ejemplos) {
    if (!hayCupo(r, x.tipo)) continue;
    r = { ...r, elementos: [...r.elementos, { ...x, id: `el_${r.siguiente}`, ejemplo: true }], aprobado: false, siguiente: r.siguiente + 1 };
  }
  return r;
};
/** Aprueba el universo. Quien llama decide ANTES con `puedeAprobar(u, conReferencia)`: la referencia vive fuera del universo (la caja de la Idea). */
export const aprobar = (u: UniversoDelTaller): UniversoDelTaller => ({ ...u, aprobado: true });

/** Pone el mundo que la persona escribió (suyo, manda). Vacío lo devuelve a «lo propone Weë». */
export const ponerMundo = (u: UniversoDelTaller, texto: string): UniversoDelTaller => {
  const limpio = recortar(texto, TOPES_UNIVERSO.mundo);
  return { ...u, aprobado: false, mundo: limpio, mundoOrigen: limpio ? 'usuario' : 'propuesta' };
};

/** Un personaje (persona, criatura o grupo) tal como lo entrega la lectura de un documento (espejo mínimo de `PersonajeDelDossier`). */
export interface PersonajeLeido { nombre: string; descripcion: string; importancia: GrupoDePersonaje; origen?: 'documento' | 'propuesta' | 'usuario' }

/**
 * Reparte los personajes detectados en un documento: entran con su origen («Del documento» o «Propuesta de Weë»), sin ficha elegida (Weë preguntará UNA
 * vez) y sin pisar lo que la persona ya tiene (mismo nombre = se queda el suyo). Respeta el cupo.
 */
export const desdeDossier = (u: UniversoDelTaller, personajes: readonly PersonajeLeido[]): UniversoDelTaller => {
  let r = u;
  const ya = new Set(r.elementos.filter((e) => e.tipo === 'character').map((e) => e.nombre.trim().toLocaleLowerCase()));
  for (const p of personajes) {
    const nombre = recortar(p.nombre, TOPES_UNIVERSO.nombre);
    if (!nombre || ya.has(nombre.toLocaleLowerCase()) || !hayCupo(r, 'character')) continue;
    ya.add(nombre.toLocaleLowerCase());
    const e: ElementoDeUniverso = { id: `el_${r.siguiente}`, tipo: 'character', nombre, linea: recortar(p.descripcion, TOPES_UNIVERSO.linea), grupo: p.importancia, voz: 'auto', origen: p.origen === 'propuesta' ? 'propuesta' : 'documento' };
    r = { ...r, elementos: [...r.elementos, e], aprobado: false, siguiente: r.siguiente + 1 };
  }
  return r;
};

/** Los personajes detectados a los que todavía no se les preguntó cómo quieren su ficha. */
export const pendientesDeFicha = (u: UniversoDelTaller): readonly ElementoDeUniverso[] =>
  u.elementos.filter((e) => e.tipo === 'character' && !e.ejemplo && (e.origen === 'documento' || e.origen === 'propuesta') && !e.ficha);

/** La respuesta GLOBAL de la única pregunta: se aplica a todos los pendientes y cada personaje puede cambiarla después en su ficha. */
export const elegirFichaGlobal = (u: UniversoDelTaller, modo: ModoDeFicha): UniversoDelTaller => ({
  ...u, elementos: u.elementos.map((e) => (pendientesDeFicha(u).some((p) => p.id === e.id) ? { ...e, ficha: modo } : e)),
});

/** La persona trajo la ficha (imagen) de un personaje detectado: pasa a ser suyo y cuenta como aportado. */
export const marcarAportado = (u: UniversoDelTaller, id: string): UniversoDelTaller => ({
  ...u, aprobado: false, elementos: u.elementos.map((e) => (e.id === id ? { ...e, origen: 'usuario' as const, ficha: 'subir' as const } : e)),
});
