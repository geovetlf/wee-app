import { Firestore } from 'firebase-admin/firestore';
import { leerProduccion } from '../productions';
import { requisitosDeProduccion } from '../filmmaker/requisitos';
import { RequisitoDePlano, leerRequisitoDePlano } from './plano';

/**
 * WEË FILMMAKER ENGINE · FASE 5 — EL REQUISITO DE UN PLANO, CALCULADO POR EL SERVIDOR.
 *
 * ── Lo que había ────────────────────────────────────────────────────────────
 *
 * En F1-D el requisito de un plano —y con él el texto que se le manda a
 * Seedance— lo calculaba la app con su espejo de F1-A, y el servidor lo aceptaba
 * con su forma: comprobaba la cuenta, la producción, la revisión y la firma de la
 * unidad, pero no lo que decía. El servidor no cargaba `requisitos.ts` (valla
 * G12). Eso chocaba con dos contratos cerrados: la validación en el servidor y no
 * fiarse de lo que manda el cliente.
 *
 * ── Lo que hay (decisión del usuario, 2026-09-28) ───────────────────────────
 *
 * El servidor lee la producción GUARDADA —por el mismo lector de `productions`,
 * con su dueño— en la revisión que se pidió, calcula sus requisitos con F1-A y
 * se queda con el de ESA unidad. Ese es el que vale: de él sale el texto, la
 * duración, el formato y la calidad. El de la app se sigue leyendo, y solo se
 * COMPARA: si no es el mismo, la toma no se genera —no se reserva nada, no se
 * gasta cupo— y se dice que la producción cambió, que es lo que la app sabe
 * resolver (vuelve a leer y a pedir).
 *
 * Los dos se leen con la MISMA función (`leerRequisitoDePlano`), así que se
 * comparan en la misma forma: solo lo que F1-D usa, con sus topes.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No escribe nada, no cobra, no genera y no aplica operaciones: solo lee y
 * calcula. F1-A entra al servidor por aquí y por `productions/puerta.ts`, y por
 * ningún otro sitio (valla G12, ampliada con autorización).
 */

export type MotivoDelRequisito = 'production_not_found' | 'production_changed' | 'unit_not_found' | 'shot_invalid';

export type RequisitoCalculado =
  | { readonly ok: true; readonly requisito: RequisitoDePlano }
  | { readonly ok: false; readonly motivo: MotivoDelRequisito; readonly causa?: 'requirements_failed' };

/**
 * EL REQUISITO DE UNA UNIDAD, de la producción guardada en esa revisión. Lo
 * ajeno y lo inexistente contestan igual. Una revisión que ya no es la guardada
 * es una producción que cambió; una producción cuyos requisitos no salen —F1-A
 * dice que no está lista— también, con su causa: la app no pudo calcular otro.
 */
export const requisitoDelServidor = async (
  db: Firestore,
  accountId: string,
  u: { productionId: string; sceneId: string; unitId: string; revision: number },
): Promise<RequisitoCalculado> => {
  const leida = await leerProduccion(accountId, u.productionId, { db });
  if (!leida.ok) return { ok: false, motivo: 'production_not_found' };
  if (leida.view.revision !== u.revision) return { ok: false, motivo: 'production_changed' };
  const calculados = requisitosDeProduccion(leida.view.production);
  if (!calculados.ok) return { ok: false, motivo: 'production_changed', causa: 'requirements_failed' };
  const deLaUnidad = calculados.requirements.shots.find((s) => s.unitId === u.unitId && s.sceneId === u.sceneId);
  if (!deLaUnidad) return { ok: false, motivo: 'unit_not_found' };
  /* Por JSON, como llega el de la app: la misma forma, leída por la misma función. */
  const requisito = leerRequisitoDePlano(JSON.parse(JSON.stringify(deLaUnidad)));
  return requisito ? { ok: true, requisito } : { ok: false, motivo: 'shot_invalid' };
};

const canonico = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, canonico(o[k])]));
  }
  return v;
};

/** ¿Dicen lo mismo? En orden canónico: el orden en que llegaron los campos no cuenta. Pura. */
export const mismoRequisito = (a: RequisitoDePlano, b: RequisitoDePlano): boolean =>
  JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));
