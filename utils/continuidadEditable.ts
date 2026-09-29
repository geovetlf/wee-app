import { ASPECTOS_DE_CONTINUIDAD, continuidadEfectiva } from '../services/filmmaker/dominio';
import type { ContinuityRule, ContinuityStrength, FilmmakerProduction, ProductionScene, ProductionShot } from '../services/filmmaker/dominio';

/**
 * LA CONTINUIDAD DE UN NIVEL, PARA EDITARLA (Fase 24 del motor: la historia y la continuidad). Pura.
 *
 * F1-A la guarda en tres niveles —la producción, la escena y el plano— y, aspecto por aspecto, manda el nivel más
 * cercano que hable de él (`continuidadEfectiva`): si el plano dice que la ropa PUEDE cambiar, eso gana a la escena
 * que la conservaba. Aquí no se inventa otra regla: se calcula qué tiene que escribir un nivel para que, en él,
 * un aspecto se conserve o deje de conservarse, respetando lo que el Core exige a una regla —conservar al menos una
 * cosa y no pedir a la vez conservar y dejar cambiar lo mismo— y sin tocar lo demás que ese nivel ya decía (sus
 * anclajes, sus relaciones y su fuerza).
 */

export interface ContinuidadDelNivel {
  /** La que dice este nivel. */
  readonly propia: ContinuityRule | undefined;
  /** La que le llega de los niveles de arriba, ya resuelta. */
  readonly heredada: ContinuityRule | undefined;
  /** La que vale aquí: la heredada con lo que dice este nivel encima. */
  readonly efectiva: ContinuityRule | undefined;
}

/** La continuidad en la producción (sin escena), en una escena o en uno de sus planos. */
export const continuidadDelNivel = (prod: FilmmakerProduction, escena?: ProductionScene, plano?: ProductionShot): ContinuidadDelNivel => {
  if (!escena) {
    const propia = prod.continuity;
    return { propia, heredada: undefined, efectiva: propia };
  }
  if (!plano) return { propia: escena.continuity, heredada: prod.continuity, efectiva: continuidadEfectiva(prod, escena) };
  return { propia: plano.continuity, heredada: continuidadEfectiva(prod, escena), efectiva: continuidadEfectiva(prod, escena, plano) };
};

export type ResultadoDeAlternar =
  | { readonly ok: true; readonly regla: ContinuityRule | null }
  /** El Core no admite una regla que no conserva nada: para dejar que algo heredado cambie, este nivel tiene que conservar otra cosa. */
  | { readonly ok: false; readonly motivo: 'hace_falta_conservar_algo' };

const posicion = (a: string): number => {
  const i = (ASPECTOS_DE_CONTINUIDAD as readonly string[]).indexOf(a);
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
};
const enOrden = (s: ReadonlySet<string>): string[] => [...s].sort((a, b) => posicion(a) - posicion(b));

/**
 * Conservar o dejar de conservar UN aspecto en este nivel. Lo que la regla propia decía de los demás aspectos, sus
 * anclajes, sus relaciones y su fuerza se quedan como estaban.
 */
export const alternarAspecto = (nivel: ContinuidadDelNivel, aspecto: string, conservarlo: boolean): ResultadoDeAlternar => {
  const conservar = new Set<string>(nivel.propia?.preserve ?? []);
  const liberar = new Set<string>(nivel.propia?.mayChange ?? []);
  if (conservarlo) {
    conservar.add(aspecto);
    liberar.delete(aspecto);
  } else {
    conservar.delete(aspecto);
    liberar.delete(aspecto);
    /* Si llega conservado de arriba, callar no basta: el silencio no es permiso. Se dice que aquí puede cambiar. */
    if ((nivel.heredada?.preserve ?? []).includes(aspecto as never)) liberar.add(aspecto);
  }
  if (!conservar.size) {
    const quedaAlgo = liberar.size > 0 || !!nivel.propia?.anchors?.length || !!nivel.propia?.spatial?.length;
    return quedaAlgo ? { ok: false, motivo: 'hace_falta_conservar_algo' } : { ok: true, regla: null };
  }
  const { preserve: _conservaba, mayChange: _liberaba, ...resto } = nivel.propia ?? ({} as Partial<ContinuityRule>);
  void _conservaba; void _liberaba;
  return {
    ok: true,
    regla: { ...resto, preserve: enOrden(conservar), ...(liberar.size ? { mayChange: enOrden(liberar) } : {}) } as ContinuityRule,
  };
};

/** La fuerza, en este nivel. Sin una regla propia no hay dónde decirla: primero se elige qué conservar aquí. */
export const conFuerza = (nivel: ContinuidadDelNivel, fuerza: ContinuityStrength): ContinuityRule | null =>
  (nivel.propia ? { ...nivel.propia, strength: fuerza } : null);

/** ¿Se conserva este aspecto aquí, y de dónde le viene? */
export const estadoDelAspecto = (nivel: ContinuidadDelNivel, aspecto: string): { readonly conservado: boolean; readonly heredado: boolean } => {
  const conservado = (nivel.efectiva?.preserve ?? []).includes(aspecto as never);
  const propio = (nivel.propia?.preserve ?? []).includes(aspecto as never) || (nivel.propia?.mayChange ?? []).includes(aspecto as never);
  return { conservado, heredado: conservado && !propio };
};
