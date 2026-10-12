/**
 * RELOJ VIRTUAL — ronda R7, tarea I (rendimiento, coste y fiabilidad).
 *
 * ── Para qué sirve ──────────────────────────────────────────────────────────
 *
 * El banco de medida ejecuta el código REAL de `functions/lib` contra un Firestore
 * doble y adaptadores simulados. Para saber cuántas ETAPAS EN SERIE hay en una
 * petición no hace falta esperar de verdad: cada llamada al doble «tarda» un
 * tiempo VIRTUAL, y este reloj avanza solo cuando no queda nada más que hacer en
 * el bucle de eventos. Lo que sale es la longitud del camino crítico:
 *
 *   · con 1 ms de latencia por llamada, el tiempo virtual TOTAL es el número de
 *     etapas en serie (dos llamadas en paralelo cuentan una vez);
 *   · con un perfil de latencias, es el tiempo de pared que tendría la petición
 *     si cada llamada tardara eso. La latencia real de Firestore NO se mide aquí.
 *
 * ── Qué parcha ──────────────────────────────────────────────────────────────
 *
 * `setTimeout`, `clearTimeout` y `Date.now`. Nada más. `new Date()` y
 * `performance.now()` siguen siendo los reales. Se restaura con `restaurar()`.
 *
 * ── Límite honesto ──────────────────────────────────────────────────────────
 *
 * Todo lo que no es una espera del doble (CPU de JavaScript) cuesta 0 ms virtuales:
 * el tiempo virtual NO incluye CPU. La CPU se mide aparte, en tiempo real.
 */

export function crearRelojVirtual({ epochMs = Date.now() } = {}) {
  const real = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setImmediate: globalThis.setImmediate,
    dateNow: Date.now,
  };
  let t = 0;
  let serie = 0;
  const pendientes = new Map();
  let instalado = false;

  const manija = (id) => {
    const m = {
      id,
      _virtual: true,
      ref: () => m,
      unref: () => m,
      hasRef: () => true,
      refresh: () => m,
      [Symbol.toPrimitive]: () => id,
    };
    return m;
  };
  const programar = (fn, ms, ...args) => {
    const id = ++serie;
    pendientes.set(id, { id, at: t + Math.max(0, Number(ms) || 0), fn, args });
    return manija(id);
  };
  const cancelar = (m) => {
    if (m && m._virtual) pendientes.delete(m.id);
    else if (m != null) real.clearTimeout(m);
  };

  const drenar = async () => {
    for (let i = 0; i < 4; i++) await new Promise((r) => real.setImmediate(r));
  };

  const api = {
    /** Milisegundos virtuales transcurridos desde la creación del reloj. */
    get ahora() {
      return t;
    },
    get epoch() {
      return epochMs;
    },
    get pendientes() {
      return pendientes.size;
    },
    instalar() {
      if (instalado) return;
      instalado = true;
      globalThis.setTimeout = programar;
      globalThis.clearTimeout = cancelar;
      Date.now = () => epochMs + t;
    },
    restaurar() {
      if (!instalado) return;
      instalado = false;
      globalThis.setTimeout = real.setTimeout;
      globalThis.clearTimeout = real.clearTimeout;
      Date.now = real.dateNow;
    },
    /** Una espera virtual: lo que usan el doble de Firestore y los adaptadores simulados. */
    dormir: (ms) => new Promise((resolve) => programar(resolve, ms)),
    /** Adelanta el reloj sin ejecutar nada (para que caduquen cachés de 60 s). */
    adelantar(ms) {
      t += Math.max(0, ms);
    },
    /**
     * Ejecuta `fn` (que devuelve una promesa) dejando correr el tiempo virtual hasta que termina.
     * Devuelve `{ valor | error, virtualMs, cpuMs }`; `virtualMs` es el camino crítico.
     */
    async correr(fn) {
      const t0 = t;
      const cpu0 = process.cpuUsage();
      let fin = false;
      let valor;
      let error;
      let fallo = false;
      Promise.resolve()
        .then(fn)
        .then(
          (v) => {
            valor = v;
            fin = true;
          },
          (e) => {
            error = e;
            fallo = true;
            fin = true;
          },
        );
      while (!fin) {
        await drenar();
        if (fin) break;
        if (!pendientes.size) {
          await drenar();
          if (fin) break;
          throw new Error('reloj virtual: no queda nada pendiente y la operación no termina (interbloqueo o una espera real dentro del código medido)');
        }
        const orden = [...pendientes.values()].sort((a, b) => a.at - b.at || a.id - b.id);
        const proximo = orden[0].at;
        t = Math.max(t, proximo);
        /* Todo lo que vence en el MISMO instante corre junto: así dos llamadas en paralelo terminan a la vez. */
        for (const p of orden) {
          if (p.at > proximo) break;
          if (!pendientes.has(p.id)) continue;
          pendientes.delete(p.id);
          p.fn(...p.args);
        }
      }
      const cpu = process.cpuUsage(cpu0);
      const salida = { virtualMs: t - t0, cpuMs: (cpu.user + cpu.system) / 1000 };
      if (fallo) return { ...salida, error };
      return { ...salida, valor };
    },
  };
  return api;
}
