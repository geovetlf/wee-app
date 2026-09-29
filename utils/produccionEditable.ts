import { LIMITES } from '../services/filmmaker/dominio';
import type {
  AppearanceProfile, AppearanceTraitKey, ColorDirection, FilmmakerProduction, IntentConstraint, ProductionReference, ProductionScene, ProductionShot,
  ReferenceRole, ShotSubject, SubjectFocus,
} from '../services/filmmaker/dominio';

/**
 * LO QUE UN CONTROL TIENE QUE ESCRIBIR, CALCULADO FUERA DE LA PANTALLA (Fase 31 del motor: cada capacidad, en su sitio).
 * Puro, sin frases y sin reglas nuevas.
 *
 * F1-A cambia un campo entero de una vez —la apariencia de un personaje, el color de la dirección, las reglas del
 * brief, las acciones de un plano—, así que tocar UNA parte obliga a escribir el campo entero con esa parte cambiada
 * y lo demás como estaba. Eso es lo que se hace aquí, con los topes de F1-A (`LIMITES`) y sin tocar lo que el control
 * no enseña: un rasgo conserva sus referencias, la paleta conserva el etalonaje y las reglas que no se enseñan siguen
 * en su sitio. Quien valida sigue siendo F1-A, al aplicar y al guardar.
 */

/* ── La apariencia de un personaje, un lugar o un objeto, rasgo a rasgo ─────────────────────────────────────────── */

/**
 * La apariencia con un rasgo descrito de otra manera, o sin describir si el texto viene vacío. Lo demás del rasgo —sus
 * referencias o su paleta— se queda; un rasgo que se queda sin nada desaparece, y una apariencia sin rasgos es `null`
 * (F1-A quita el campo).
 */
export const conRasgo = (apariencia: AppearanceProfile | undefined, rasgo: AppearanceTraitKey, texto: string): AppearanceProfile | null => {
  const actual = { ...(apariencia ?? {}) } as Record<string, Record<string, unknown> | undefined>;
  const { description: _antes, ...resto } = actual[rasgo] ?? {};
  void _antes;
  const limpio = texto.trim();
  const nuevo = limpio ? { ...resto, description: limpio } : resto;
  if (Object.keys(nuevo).length) actual[rasgo] = nuevo;
  else delete actual[rasgo];
  return Object.keys(actual).length ? (actual as AppearanceProfile) : null;
};

/* ── La paleta de la dirección ──────────────────────────────────────────────────────────────────────────────────── */

/** Un color como lo guarda F1-A: `#RRGGBB`. */
export const ES_COLOR = /^#[0-9A-Fa-f]{6}$/;

const mismoColor = (a: string, b: string): boolean => a.toUpperCase() === b.toUpperCase();

/** ¿Cabe otro color? F1-A admite como mucho `LIMITES.paleta`. */
export const cabeOtroColor = (color: ColorDirection | undefined): boolean => (color?.palette?.length ?? 0) < LIMITES.paleta;

/**
 * El color de la dirección con un color de más o de menos en la paleta. El etalonaje se queda; un color repetido o que
 * no cabe no cambia nada; sin paleta ni etalonaje, `null` (F1-A quita el campo).
 */
export const conColor = (color: ColorDirection | undefined, hex: string, poner: boolean): ColorDirection | null => {
  const paleta = color?.palette ?? [];
  let nueva: readonly string[] = paleta;
  if (poner && ES_COLOR.test(hex) && !paleta.some((c) => mismoColor(c, hex)) && paleta.length < LIMITES.paleta) nueva = [...paleta, hex.toUpperCase()];
  if (!poner) nueva = paleta.filter((c) => !mismoColor(c, hex));
  const { palette: _antes, ...resto } = color ?? {};
  void _antes;
  const salida: ColorDirection = nueva.length ? { ...resto, palette: nueva } : resto;
  return Object.keys(salida).length ? salida : null;
};

/* ── Las reglas del brief (las restricciones de F1-A que se pueden comprobar) ──────────────────────────────────── */

export type Prohibicion = 'no_dialogue' | 'no_music' | 'no_narration';
export const PROHIBICIONES: readonly Prohibicion[] = Object.freeze(['no_dialogue', 'no_music', 'no_narration']);
export type LimiteDeDuracion = 'max_duration' | 'min_duration';

const reglas = (cs: readonly IntentConstraint[] | undefined): readonly IntentConstraint[] => cs ?? [];
/** Sin reglas, `null`: F1-A quita el campo en vez de guardar una lista vacía. */
const oNada = (cs: readonly IntentConstraint[]): readonly IntentConstraint[] | null => (cs.length ? cs : null);

export const tieneLaProhibicion = (cs: readonly IntentConstraint[] | undefined, kind: Prohibicion): boolean => reglas(cs).some((c) => c.kind === kind);

/** Con esta prohibición o sin ella. Las demás reglas se quedan donde estaban. */
export const conProhibicion = (cs: readonly IntentConstraint[] | undefined, kind: Prohibicion, poner: boolean): readonly IntentConstraint[] | null => {
  const sin = reglas(cs).filter((c) => c.kind !== kind);
  return oNada(poner ? [...sin, { kind } as IntentConstraint] : sin);
};

/** Los personajes que tienen que salir, en el orden en que se pidieron. */
export const personajesObligados = (cs: readonly IntentConstraint[] | undefined): readonly string[] =>
  reglas(cs).flatMap((c) => (c.kind === 'include_character' ? [c.characterId] : []));

export const conPersonajeObligado = (cs: readonly IntentConstraint[] | undefined, characterId: string, poner: boolean): readonly IntentConstraint[] | null => {
  const sin = reglas(cs).filter((c) => !(c.kind === 'include_character' && c.characterId === characterId));
  return oNada(poner ? [...sin, { kind: 'include_character', characterId }] : sin);
};

/** El límite de duración que dice el brief, si dice uno (F1-A se queda con el más estricto; aquí se enseña el primero). */
export const limiteDeDuracion = (cs: readonly IntentConstraint[] | undefined, kind: LimiteDeDuracion): number | undefined => {
  const r = reglas(cs).find((c) => c.kind === kind);
  return r && (r.kind === 'max_duration' || r.kind === 'min_duration') ? r.seconds : undefined;
};

/** Un solo límite de cada clase: elegir otro lo sustituye y `null` lo quita. */
export const conLimiteDeDuracion = (cs: readonly IntentConstraint[] | undefined, kind: LimiteDeDuracion, segundos: number | null): readonly IntentConstraint[] | null => {
  const sin = reglas(cs).filter((c) => c.kind !== kind);
  return oNada(segundos === null ? sin : [...sin, { kind, seconds: segundos } as IntentConstraint]);
};

/**
 * Las reglas que no tienen control propio —un formato obligado, que ya es el formato de la producción, o una nota, que
 * no se puede comprobar—: se enseñan con su posición para poder quitarlas, porque alguien más (Weë Brain) pudo
 * ponerlas y una regla que no se ve y no se puede quitar es una trampa.
 */
export const otrasReglas = (cs: readonly IntentConstraint[] | undefined): readonly { readonly indice: number; readonly regla: IntentConstraint }[] =>
  reglas(cs).map((regla, indice) => ({ indice, regla })).filter(({ regla }) => regla.kind === 'aspect_ratio' || regla.kind === 'note');

export const sinRegla = (cs: readonly IntentConstraint[] | undefined, indice: number): readonly IntentConstraint[] | null =>
  oNada(reglas(cs).filter((_, i) => i !== indice));

/* ── Lo que pasa en un plano (o en una escena sin planos) ──────────────────────────────────────────────────────── */

/** ¿Cabe otra acción? F1-A admite como mucho `LIMITES.accionesPorBloque`. */
export const cabeOtraAccion = (acciones: readonly string[] | undefined): boolean => (acciones?.length ?? 0) < LIMITES.accionesPorBloque;

/** Con una acción más al final; vacía o sin sitio, la lista no cambia. Sin acciones, `null`. */
export const conAccion = (acciones: readonly string[] | undefined, texto: string): readonly string[] | null => {
  const actuales = acciones ?? [];
  const limpio = texto.trim();
  const nuevas = limpio && actuales.length < LIMITES.accionesPorBloque ? [...actuales, limpio] : actuales;
  return nuevas.length ? nuevas : null;
};

/** Con la acción `i` escrita de otra manera; en blanco, se quita. */
export const conAccionCambiada = (acciones: readonly string[] | undefined, i: number, texto: string): readonly string[] | null => {
  const actuales = acciones ?? [];
  const limpio = texto.trim();
  const nuevas = limpio ? actuales.map((a, j) => (j === i ? limpio : a)) : actuales.filter((_, j) => j !== i);
  return nuevas.length ? nuevas : null;
};

/** La acción `i` un puesto antes (−1) o después (+1). Fuera de la lista, nada cambia. */
export const conAccionMovida = (acciones: readonly string[] | undefined, i: number, paso: -1 | 1): readonly string[] | null => {
  const actuales = [...(acciones ?? [])];
  const j = i + paso;
  if (i < 0 || i >= actuales.length || j < 0 || j >= actuales.length) return actuales.length ? actuales : null;
  [actuales[i], actuales[j]] = [actuales[j], actuales[i]];
  return actuales;
};

/**
 * ¿Las acciones de esta escena llegan a algún vídeo? Solo si la escena no tiene planos: con planos, cada plano manda las
 * suyas y las de la escena no se leen (F1-A, `requisitos`). Un control que escribe algo que nadie lee no se enseña.
 */
export const accionesDeEscenaCuentan = (escena: ProductionScene): boolean => escena.shots.length === 0;

/* ── El estilo y el ánimo por nivel ─────────────────────────────────────────────────────────────────────────────── */

export type AspectoVisual = 'style' | 'mood';

/**
 * Cuántos niveles DENTRO de este tienen su propio estilo o ánimo. F1-A los quita al fijarlo en el nivel de fuera («en un
 * ámbito vale para todo lo que contiene»), así que antes de hacerlo se dice cuántos se perderían.
 */
export const propiosDentro = (prod: FilmmakerProduction, aspecto: AspectoVisual, escena?: ProductionScene): number => {
  const escenas = escena ? [escena] : prod.scenes;
  let n = 0;
  for (const s of escenas) {
    if (!escena && s.visual?.[aspecto] !== undefined) n += 1;
    for (const p of s.shots) if (p.visual?.[aspecto] !== undefined) n += 1;
  }
  return n;
};

/** Lo que este nivel dice de su estilo o su ánimo (no lo heredado). */
export const propioDelNivel = (aspecto: AspectoVisual, escena: ProductionScene, plano?: ProductionShot): string | undefined =>
  (plano ? plano.visual?.[aspecto] : escena.visual?.[aspecto]);

/** Lo que le llega de fuera: el de su escena (si es un plano) o el de la producción. */
export const heredadoDelNivel = (prod: FilmmakerProduction, aspecto: AspectoVisual, escena: ProductionScene, plano?: ProductionShot): string | undefined => {
  const deLaProduccion = aspecto === 'style' ? prod.creativeDirection.visualStyle : prod.creativeDirection.mood;
  return plano ? (escena.visual?.[aspecto] ?? deLaProduccion) : deLaProduccion;
};

/* ── El sujeto de un plano: quién o qué, cómo de cerca y en palabras ────────────────────────────────────────────── */

export interface QuienDelSujeto {
  readonly tipo: 'personaje' | 'objeto';
  readonly id: string;
}

/** Quién o qué es el sujeto, si lo dice. */
export const quienDelSujeto = (s: ShotSubject | undefined): QuienDelSujeto | null =>
  (s?.characterId ? { tipo: 'personaje', id: s.characterId } : s?.objectId ? { tipo: 'objeto', id: s.objectId } : null);

/** Sin lo vacío; sin nada, `null` (F1-A quita el sujeto). */
const sujetoLimpio = (x: Record<string, unknown>): ShotSubject | null => {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(x)) if (v !== undefined && v !== null && v !== '') salida[k] = v;
  return Object.keys(salida).length ? (salida as ShotSubject) : null;
};

/** Con otro quién (o sin él). Un personaje O un objeto, nunca los dos: F1-A no admite dos sujetos (`two_subjects`). */
export const sujetoConQuien = (s: ShotSubject | undefined, quien: QuienDelSujeto | null): ShotSubject | null => {
  const { characterId: _c, objectId: _o, ...resto } = s ?? {};
  void _c; void _o;
  return sujetoLimpio({ ...resto, ...(quien ? (quien.tipo === 'personaje' ? { characterId: quien.id } : { objectId: quien.id }) : {}) });
};

export const sujetoConEnfoque = (s: ShotSubject | undefined, focus: SubjectFocus | null): ShotSubject | null =>
  sujetoLimpio({ ...(s ?? {}), focus: focus ?? undefined });

export const sujetoConDescripcion = (s: ShotSubject | undefined, texto: string): ShotSubject | null =>
  sujetoLimpio({ ...(s ?? {}), description: texto.trim() || undefined });

/* ── Las referencias de un plano, por papel ─────────────────────────────────────────────────────────────────────── */

/**
 * Las referencias del plano con una de un papel de «uno como mucho» (primer o último fotograma) puesta o quitada: poner
 * una quita la que hubiera de ese papel, porque F1-A no admite dos (`more_than_one_frame`). Las demás se quedan.
 */
export const conLaDelPapel = (
  referenciasDelPlano: readonly string[] | undefined, todas: readonly ProductionReference[], papel: ReferenceRole, id: string, poner: boolean,
): readonly string[] | null => {
  const delPapel = new Set(todas.filter((r) => r.role === papel).map((r) => r.id));
  const sin = (referenciasDelPlano ?? []).filter((x) => !delPapel.has(x));
  const nuevas = poner ? [...sin, id] : sin;
  return nuevas.length ? nuevas : null;
};
