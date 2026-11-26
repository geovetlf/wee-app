/*
 * CUENTA DESACTIVADA (eliminar cuenta, 2026-11-22).
 *
 * Pedir «Eliminar cuenta» desactiva la cuenta durante 30 días antes de borrarla
 * (`functions/src/cuenta/desactivar.ts`). Mientras tanto:
 *   · sus dos caras llevan `cuentaEstado: 'desactivada'` y `borrarEn` (ms), que
 *     escribe SOLO el servidor (`firestore.rules`);
 *   · sus publicaciones llevan `ocultaPorDesactivacion: true` y no se enseñan a
 *     nadie: los listados de `services/firestoreService.ts` las saltan con
 *     `visibleParaLosDemas`.
 *
 * Sin dependencias, para poder usarlo en cualquier listado y en las pruebas.
 */

export const ESTADO_DESACTIVADA = 'desactivada';
const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** ¿Se puede enseñar esta publicación (o cualquier documento) a los demás? */
export const visibleParaLosDemas = (documento: unknown): boolean =>
  (documento as { ocultaPorDesactivacion?: unknown } | null | undefined)?.ocultaPorDesactivacion !== true;

/** ¿Es un perfil de una cuenta desactivada? */
export const perfilDesactivado = (perfil: unknown): boolean =>
  (perfil as { cuentaEstado?: unknown } | null | undefined)?.cuentaEstado === ESTADO_DESACTIVADA;

/** Cuándo se borra para siempre (ms), o null si el perfil no está desactivado. */
export const borrarEnDe = (perfil: unknown): number | null => {
  if (!perfilDesactivado(perfil)) return null;
  const borrarEn = (perfil as { borrarEn?: unknown }).borrarEn;
  return typeof borrarEn === 'number' && Number.isFinite(borrarEn) ? borrarEn : null;
};

/** Días que quedan para volver, redondeando hacia arriba (nunca negativos). */
export const diasQueQuedan = (borrarEn: number, ahora: number = Date.now()): number =>
  Math.max(0, Math.ceil((borrarEn - ahora) / MS_POR_DIA));
