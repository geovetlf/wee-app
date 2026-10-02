import { ContextoResuelto, RevisionEstructural, revisarEstructura } from '../core';
import { leerMaterial } from '../content';
import {
  DepsDePlanos,
  contextoDeContinuidad,
  leerPlano,
} from './index';

/**
 * WEË CONTINUITY — TRAER LO QUE HAY QUE MIRAR, Y NADA MÁS.
 *
 * ── Por qué esto está separado de la comprobación ───────────────────────────
 *
 *     RESOLVER      ir a buscar lo que hace falta. Cuesta lecturas.
 *     COMPROBAR     decidir si cuadra. No cuesta nada y no toca nada.
 *
 * Juntarlas haría que la comprobación tuviera que probarse con una base de
 * datos, y entonces nadie probaría los casos raros. Separadas, `revisarEstructura`
 * se prueba con una tabla y esto solo tiene que traer las filas correctas.
 *
 * ── Lo que añade sobre lo que C3 ya resolvía ────────────────────────────────
 *
 * `contextoDeContinuidad` ya trae el plano, su escena, el anterior y los
 * elementos que nombra. Faltaban dos cosas para poder comprobar el estado
 * entero, y son las dos que se añaden aquí:
 *
 *   · la ficha del material producido, si el plano declara uno;
 *   · los planos de los que depende.
 *
 * Ambas acotadas: las dependencias de un plano ya vienen topadas por el propio
 * contrato —ocho como mucho—, así que leerlas una a una no puede convertirse en
 * un barrido.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No genera, no regenera, no crea trabajos, no cobra y no cambia nada. Lee y
 * contesta. Un `fail` es una respuesta, no una orden.
 */

/**
 * EL CONTEXTO COMPLETO PARA COMPROBAR, o `null` si el plano no es de la cuenta.
 *
 * Lo ajeno contesta lo mismo que lo inexistente, igual que en todo C3.
 */
export const contextoParaRevisar = async (
  consulta: { accountId: string; shotId: string },
  deps: DepsDePlanos = {},
): Promise<ContextoResuelto | null> => {
  const base = await contextoDeContinuidad(consulta, deps);
  if (!base) return null;

  const dependencies = [];
  const missingDependencies: string[] = [];
  for (const id of base.shot.dependsOnShotIds ?? []) {
    const dep = await leerPlano(consulta.accountId, id, deps);
    if (dep) dependencies.push(dep); else missingDependencies.push(id);
  }

  /*
   * La ficha del material. Por el mismo lector que inyecta el resto de C3 y,
   * sin él, por el Content Core de siempre — ni una segunda lectura, ni una
   * segunda verdad. De la ficha solo se toman las tres cosas que deciden si
   * sirve: quién es, de quién es y en qué estado está.
   */
  let asset;
  if (base.shot.producedAssetId) {
    if (deps.asset) {
      asset = (await deps.asset(base.shot.producedAssetId)) ?? undefined;
    } else {
      const m = await leerMaterial(base.shot.producedAssetId);
      asset = m ? { assetId: m.assetId, ownerAccountId: m.ownerAccountId, status: m.status } : undefined;
    }
  }

  return {
    accountId: consulta.accountId,
    shot: base.shot,
    ...(base.scene ? { scene: base.scene } : {}),
    ...(base.previous ? { previous: base.previous } : {}),
    elements: base.elements,
    missing: base.missing,
    truncated: base.truncated,
    ...(asset ? { asset } : {}),
    ...(dependencies.length ? { dependencies } : {}),
    ...(missingDependencies.length ? { missingDependencies } : {}),
  };
};

/**
 * RESOLVER Y COMPROBAR, en ese orden y sin mezclarlos.
 *
 * `at` entra por la puerta porque el Core no lee el reloj, y el veredicto lleva
 * su hora: un veredicto sin fecha no se puede comparar con el siguiente.
 */
export const revisarPlanoGuardado = async (
  consulta: { accountId: string; shotId: string; at: number },
  deps: DepsDePlanos = {},
): Promise<RevisionEstructural | null> => {
  const ctx = await contextoParaRevisar(consulta, deps);
  return ctx ? revisarEstructura(ctx, consulta.at) : null;
};
