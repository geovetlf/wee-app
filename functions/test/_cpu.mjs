/*
 * MEDIR EL TRABAJO, NO LA ESPERA — `functions/test/_cpu.mjs` (Guardian · pruebas intermitentes, 2026-10-15).
 *
 * Varias suites fijan una cota de tiempo («mil pasos en un tiempo razonable») para que nadie meta un coste cuadrático escondido.
 * Medida con el RELOJ DE PARED, esa cota falla cuando la máquina está ocupada —cuatro suites a la vez en `_cadena.mjs`, otra tarea
 * pesada, la CPU compartida de la CI—: el reloj cuenta el tiempo que el proceso ESPERA su turno, y eso no es trabajo del código.
 * Fue lo que pasó con `core-workflow` («6366 ms» contra 5000 y, sola, ~900 ms). La causa era la medida, no el código.
 *
 * Aquí se mide `process.cpuUsage()` (usuario + sistema de ESTE proceso): lo que el código trabaja de verdad. Las cotas NO se subieron: son
 * las mismas, y un código cinco veces más lento sigue fallando. `mejorDe` toma la mejor de varias pasadas para quitar el ruido de un GC
 * o de una interrupción (no repite una prueba que falló: repite la MEDIDA, y la cota se aplica al mejor caso real de ese código).
 */
export const cpuDe = (f) => {
  const antes = process.cpuUsage();
  const valor = f();
  const d = process.cpuUsage(antes);
  return { valor, ms: (d.user + d.system) / 1000 };
};

export const mejorDe = (veces, f) => {
  let mejor = null;
  for (let i = 0; i < veces; i++) {
    const r = cpuDe(f);
    if (!mejor || r.ms < mejor.ms) mejor = r;
  }
  return mejor;
};
