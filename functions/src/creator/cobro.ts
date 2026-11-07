/**
 * CUÁNTO SE COBRA DE UN TRABAJO DE WEË AI AL TERMINAR — una función pura.
 *
 * ── Por qué existe (auditoría B4-03, 2026-10-14) ───────────────────────────
 *
 * En modo de precios simulado —el que rige en producción mientras no exista
 * `aiSettings/global`— `creatorRun` cobraba SIEMPRE lo cotizado, aunque los
 * pasos los hubiera atendido el proveedor de muestra (`mock`): música, efectos
 * y documentos, que hoy solo sabe hacer el demo, se cobraban a precio de
 * catálogo por un resultado de mentira.
 *
 * La regla ahora: un paso cuyo resultado es de muestra vale 0, en los dos modos.
 *  · real:      lo medido por el motor (lo demo ya mide 0), nunca más de lo cotizado;
 *  · simulado:  lo cotizado MENOS lo que la cotización atribuía a los pasos demo;
 *  · todo demo: 0 (la liquidación devuelve la reserva entera).
 * El resultado siempre queda entre 0 y lo cotizado: nunca se cobra más de lo
 * que la persona vio antes de crear.
 */
export interface ResultadoParaCobrar {
  stepId: string;
  demo?: boolean;
  credits?: number;
}

export const cobroDelTrabajo = (
  cotizado: number,
  modo: 'simulated' | 'real',
  resultados: readonly ResultadoParaCobrar[],
  /** Lo que la cotización atribuía a cada paso (stepId → Credits). Solo hace falta si hay pasos demo en modo simulado. */
  cotizadoPorPaso: Readonly<Record<string, number>> = {},
): number => {
  const tope = Number.isFinite(cotizado) && cotizado > 0 ? Math.floor(cotizado) : 0;
  if (tope === 0) return 0;
  /* Todo lo entregado fue de muestra: nada que cobrar. (Un plan sin pasos conserva su regla de siempre: lo cotizado.) */
  if (resultados.length > 0 && resultados.every((r) => r.demo === true)) return 0;
  const acotar = (n: number): number => Math.max(0, Math.min(tope, Math.floor(Number.isFinite(n) ? n : 0)));
  if (modo === 'real') {
    return acotar(resultados.reduce((suma, r) => suma + (r.demo === true ? 0 : Number(r.credits) || 0), 0));
  }
  const demo = resultados.filter((r) => r.demo === true);
  if (demo.length === 0) return tope;
  /*
   * Si no se sabe cuánto valía un paso demo, no se puede descontar con exactitud:
   * se falla del lado de la persona y se cobra solo la parte de los pasos reales
   * que SÍ se conoce. Nunca se cobra un demo «por si acaso».
   */
  const conocidos = demo.every((r) => typeof cotizadoPorPaso[r.stepId] === 'number');
  if (!conocidos) {
    const reales = resultados.filter((r) => r.demo !== true);
    return acotar(reales.reduce((suma, r) => suma + (Number(cotizadoPorPaso[r.stepId]) || 0), 0));
  }
  return acotar(tope - demo.reduce((suma, r) => suma + (cotizadoPorPaso[r.stepId] as number), 0));
};
