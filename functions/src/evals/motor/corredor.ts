/*
 * WEE AI EVALUATION ENGINE — EL CORREDOR (uno solo para todo WEE).
 *
 * Es el ÚNICO sitio de WEE donde se recorren los casos de una evaluación (`recorrerCasos`). Lo usan los dos caminos
 * que existen, sin copia:
 *  · el de DESARROLLO (ops/evals: `runner.mjs` y `gobernanza.mjs` lo reexportan con su registro de dominios sin
 *    coste), $0, con el almacén en memoria y el coste simulado;
 *  · el REAL (`evalRun`, functions/src/evals): el mismo corredor con un dominio real y un ENTORNO de Firestore.
 *
 * Lo que cambia de un camino a otro entra por el ENTORNO, nunca por una copia del bucle:
 *  · `antesDelCaso`: si la corrida sigue, salta un caso ya hecho o se para (cancelación, interruptor, presupuesto y,
 *    con dinero real, la RESERVA del techo del caso);
 *  · `medir`: cuánto costó DE VERDAD el caso, haya ido bien o mal; `liberar`: lo que se devuelve SIEMPRE (finally);
 *  · `techoUsd`: el techo reservado por caso; `limites`: lo que el dominio tiene que respetar (`maxOutputTokens`);
 *  · `registrar`: el rastro de cada caso; `alCerrar`: lo que se añade al registro de la corrida al cerrarla;
 *  · `capturarFallos`: con dinero real, un fallo es un estado (FAILED) que se registra; en desarrollo, se lanza.
 * El corredor decide lo común: el orden, que un coste desconocido o por encima del techo DETIENE la corrida
 * (COST_OVERRUN), qué es un fallo, la puntuación (`puntuar`) y los estados (`transicionar`).
 */
import { CasoDeEval, DatasetDeEval, hashCanonico, validarDataset } from './contrato';
import { Decision, Dominio, Grader, RegistroDeDominios, SIN_DOMINIOS, calificarCaso, decidirCaso, resolverDominio } from './dominios';
import { ConfigDePuntuacion, Puntuacion, puntuar } from './puntuacion';
import { DecisionDePresupuesto, PeticionDePresupuesto, crearAcumuladorDeGasto, decidirPresupuesto, excesoDeSobrecoste, huboSobrecoste } from './presupuesto';
import { AlmacenDeCorridas, EspecDeCorrida, RegistroDeCorrida, Reloj, almacenMemoria, crearEvalRun, transicionar } from './corrida';
import { cargarHoldout } from './holdout';
import type { PeticionDeHoldout } from './permisos';

export const SEGUIR = 'seguir';
export const SALTAR = 'saltar';

/** El coste real de un caso superó su techo —o no se pudo saber—. */
export interface Sobrecoste {
  caso: string;
  techoUsd: number | null;
  realUsd: number | null;
  excesoUsd: number | null;
  motivo: 'coste_real_mayor_que_el_techo' | 'coste_real_desconocido';
}

/** Por qué se paró una corrida antes de terminar sus casos. */
export interface Parada {
  estado: 'CANCELLED' | 'BUDGET_EXCEEDED' | 'COST_OVERRUN' | 'FAILED';
  motivo?: string;
  error?: string;
  sobrecoste?: Sobrecoste;
}

/** Lo que se sabe de un caso cuando se registra. */
export interface RegistroDeCaso {
  requestId: string | null;
  costeUsd: number;
  decision?: Decision;
  graders?: Grader[];
  aprobado?: boolean;
  fallo?: unknown;
  parada?: Parada;
}

export interface DetalleDeCaso {
  evalCaseId: string;
  decision: Decision;
  graders: Grader[];
  costeUsd: number;
  aprobado: boolean;
}

/** El mundo de una corrida. Todo es opcional: sin entorno, el corredor no gasta, no mide y no guarda nada. */
export interface EntornoDeCorrida {
  antesDeEmpezar?(casos: readonly CasoDeEval[]): DecisionDePresupuesto;
  antesDelCaso?(caso: CasoDeEval, estado: { gastadoUsd: number }): typeof SEGUIR | typeof SALTAR | Parada | Promise<typeof SEGUIR | typeof SALTAR | Parada>;
  limites?: Readonly<Record<string, number>>;
  medir?(caso: CasoDeEval, intento: { requestId: string | null; decision?: Decision; fallo?: unknown }): number | Promise<number>;
  liberar?(caso: CasoDeEval): void | Promise<void>;
  techoUsd?: number;
  registrar?(caso: CasoDeEval, registro: RegistroDeCaso): void | Promise<void>;
  alCerrar?(cierre: { estado: string; parada: Parada | null }): Record<string, unknown> | Promise<Record<string, unknown>>;
  capturarFallos?: boolean;
}

const mensajeDe = (e: unknown) => String((e as Error)?.message || e).slice(0, 200);
const SIN_LIMITES: Readonly<Record<string, number>> = Object.freeze({});

/**
 * EL bucle. Recorre los casos de un dominio en orden; por cada uno: ¿sigue? → el dominio decide (con su contexto) →
 * se mide lo que costó y se libera lo reservado (siempre) → un coste desconocido o por encima del techo para la
 * corrida (COST_OVERRUN) → un fallo la para (FAILED) o se lanza → el dominio califica (el motor lo comprueba) → rastro.
 */
export const recorrerCasos = async (
  dominio: Readonly<Dominio>, casos: readonly CasoDeEval[],
  { evalRunId = null, entorno = {} }: { evalRunId?: string | null; entorno?: EntornoDeCorrida } = {},
) => {
  const gasto = crearAcumuladorDeGasto();
  const detalle: DetalleDeCaso[] = [];
  let ejecuciones = 0;
  let parada: Parada | null = null;
  for (const caso of casos) {
    const previo = entorno.antesDelCaso ? await entorno.antesDelCaso(caso, { gastadoUsd: gasto.total }) : SEGUIR;
    if (previo === SALTAR) continue;
    if (previo !== SEGUIR) { parada = previo; break; }

    const requestId = evalRunId ? `${evalRunId}:${caso.evalCaseId}` : null;
    let decision: Decision | undefined;
    let fallo: unknown = null;
    let costeUsd = 0;
    try {
      try {
        decision = await decidirCaso(dominio, caso, { evalRunId, requestId, limites: entorno.limites || SIN_LIMITES });
        ejecuciones += decision.ejecuciones;
      } catch (e) {
        fallo = e;
      }
      // Haya ido bien o mal: un intento que falló después de llegar al proveedor también pudo costar.
      if (entorno.medir) costeUsd = await entorno.medir(caso, { requestId, decision, fallo });
    } catch {
      costeUsd = NaN; // no se pudo saber lo que costó: se trata como sobrecoste (fail-closed)
    } finally {
      if (entorno.liberar) await entorno.liberar(caso);
    }
    const conocido = Number.isFinite(costeUsd);
    if (conocido) gasto.sumar(requestId || caso.evalCaseId, costeUsd);

    // RECONCILIACIÓN: lo real por encima del techo —o desconocido— DETIENE la corrida. No se sigue a ciegas.
    const techo = entorno.techoUsd;
    if (!conocido || (techo !== undefined && huboSobrecoste(techo, costeUsd))) {
      parada = {
        estado: 'COST_OVERRUN',
        sobrecoste: {
          caso: caso.evalCaseId, techoUsd: techo ?? null, realUsd: conocido ? costeUsd : null,
          excesoUsd: conocido && techo !== undefined ? excesoDeSobrecoste(techo, costeUsd) : null,
          motivo: conocido ? 'coste_real_mayor_que_el_techo' : 'coste_real_desconocido',
        },
      };
      if (entorno.registrar) await entorno.registrar(caso, { requestId, costeUsd, decision, fallo, parada });
      break;
    }
    if (fallo !== null || decision === undefined) {
      if (!entorno.capturarFallos) throw fallo;
      parada = { estado: 'FAILED', error: mensajeDe(fallo) };
      if (entorno.registrar) await entorno.registrar(caso, { requestId, costeUsd, fallo, parada });
      break;
    }
    let graders: Grader[];
    try {
      graders = calificarCaso(dominio, decision, caso, { costeUsd });
    } catch (e) {
      if (!entorno.capturarFallos) throw e;
      parada = { estado: 'FAILED', error: mensajeDe(e) };
      if (entorno.registrar) await entorno.registrar(caso, { requestId, costeUsd, decision, fallo: e, parada });
      break;
    }
    const aprobado = graders.every((g) => g.ok);
    detalle.push({ evalCaseId: caso.evalCaseId, decision, graders, costeUsd, aprobado });
    if (entorno.registrar) await entorno.registrar(caso, { requestId, costeUsd, decision, graders, aprobado });
  }
  return { detalle, ejecuciones, parada, costeUsd: gasto.total };
};

const resultadosDe = (detalle: readonly DetalleDeCaso[]) => detalle.map(({ evalCaseId, graders }) => ({ evalCaseId, graders }));

/**
 * Ejecuta un dataset SIN gobernanza: decide, califica y puntúa cada caso. Devuelve scores + hash + ejecuciones.
 * El dominio sale de `dataset.dominio` y del registro que se pase (sin registro, ninguno existe).
 */
export const ejecutarDataset = async (dataset: DatasetDeEval, config: ConfigDePuntuacion, { dominios = SIN_DOMINIOS }: { dominios?: RegistroDeDominios } = {}) => {
  const dominio = resolverDominio(dominios, dataset && dataset.dominio);
  const errores = validarDataset(dataset, { validarCaso: dominio.validarCaso });
  if (errores.length) throw new Error(`dataset inválido: ${errores.join('; ')}`);
  const { detalle, ejecuciones } = await recorrerCasos(dominio, dataset.casos);
  const scores = puntuar(resultadosDe(detalle), config);
  return {
    datasetHash: hashCanonico(dataset.casos), dominio: dataset.dominio, scores, ejecuciones,
    detalle: detalle.map(({ evalCaseId, decision, graders }) => ({ evalCaseId, decision, graders })),
  };
};

/** La forma inmutable que se guarda como baseline (sin el detalle, que no se compara). */
export const baselineDe = (run: { dominio?: string; datasetHash: string; scores: Puntuacion }, dataset: { version: number }) => ({
  version: 1, dominio: run.dominio, datasetVersion: dataset.version, datasetHash: run.datasetHash,
  generado: null as string | null, // se rellena fuera (los corredores puros no leen el reloj); el runner CLI lo pone
  scores: run.scores,
});

/**
 * El entorno de DESARROLLO: presupuesto decidido en memoria con un coste por caso SIMULADO, y cancelación por token.
 * Es el que usa la corrida gobernada cuando no se le da otro.
 */
export const entornoEnMemoria = ({ presupuesto = { habilitado: false }, costePorCasoUsd = 0, cancelToken }: {
  presupuesto?: PeticionDePresupuesto; costePorCasoUsd?: number; cancelToken?: { cancelado?: boolean } | null;
} = {}): EntornoDeCorrida => ({
  antesDeEmpezar: (casos) => decidirPresupuesto({ ...presupuesto, costeEstimadoUsd: costePorCasoUsd * casos.length }),
  antesDelCaso: (_caso, { gastadoUsd }) => {
    if (cancelToken && cancelToken.cancelado) return { estado: 'CANCELLED' };
    // Un gastado previo que no es un número ya lo paró `antesDeEmpezar` (gasto_invalido): aquí solo se suma.
    const paso = decidirPresupuesto({ ...presupuesto, gastadoHoyUsd: ((presupuesto.gastadoHoyUsd || 0) as number) + gastadoUsd, costeEstimadoUsd: costePorCasoUsd });
    return paso.permite ? SEGUIR : { estado: 'BUDGET_EXCEEDED' };
  },
  medir: () => costePorCasoUsd,
});

export interface OpcionesDeCorridaGobernada {
  dataset: DatasetDeEval;
  config: ConfigDePuntuacion;
  spec: EspecDeCorrida;
  ahora?: Reloj;
  presupuesto?: PeticionDePresupuesto;
  costePorCasoUsd?: number;
  autorizacionHoldout?: PeticionDeHoldout;
  cancelToken?: { cancelado?: boolean } | null;
  almacen?: AlmacenDeCorridas;
  dominios?: RegistroDeDominios;
  entorno?: EntornoDeCorrida;
}

/**
 * Corre una evaluación GOBERNADA: dominio registrado → (holdout sellado) → corrida QUEUED, sin duplicar → ¿cabe? →
 * RUNNING → el corredor → COMPLETED, o el estado de la parada (CANCELLED / BUDGET_EXCEEDED / COST_OVERRUN / FAILED).
 * La misma intención otra vez devuelve la corrida que ya existe (`reanudado`), sin volver a correr nada.
 * Una corrida interrumpida guarda las métricas de lo que llegó a hacer; `scores` solo se da si terminó (lo que
 * se compara contra una baseline es siempre una corrida entera).
 */
export const correrEvalGobernada = async ({
  dataset, config, spec, ahora,
  presupuesto = { habilitado: false }, costePorCasoUsd = 0,
  autorizacionHoldout, cancelToken, almacen = almacenMemoria(), dominios = SIN_DOMINIOS, entorno,
}: OpcionesDeCorridaGobernada) => {
  const dominio = resolverDominio(dominios, dataset && dataset.dominio); // un dominio sin registrar no crea ni una corrida
  // Holdout: solo con permiso y motivo (lanza si se deniega). El corredor de desarrollo normal no entra aquí.
  const casos = dataset.holdout === true ? cargarHoldout(dataset, autorizacionHoldout).casos : dataset.casos;
  const mundo = entorno || entornoEnMemoria({ presupuesto, costePorCasoUsd, cancelToken });

  const creada = await almacen.crearIdempotente(crearEvalRun({ ...spec, datasetVersion: dataset.version }, ahora));
  let run: RegistroDeCorrida = creada.run;
  if (!creada.nuevo) return { run, scores: null, ejecuciones: 0, interrumpidoPor: null, reanudado: true, parada: null, detalle: [] as DetalleDeCaso[] };

  // Antes de empezar: ¿cabe la corrida entera? FAIL-CLOSED.
  const pre = mundo.antesDeEmpezar ? mundo.antesDeEmpezar(casos) : null;
  if (pre && !pre.permite) {
    run = transicionar(run, 'BUDGET_EXCEEDED', { ahora, error: `presupuesto: ${pre.motivo}` });
    await almacen.guardar(run);
    return { run, scores: null, ejecuciones: 0, interrumpidoPor: 'BUDGET_EXCEEDED', presupuesto: pre, reanudado: false, parada: null, detalle: [] as DetalleDeCaso[] };
  }

  run = transicionar(run, 'RUNNING', { ahora });
  await almacen.guardar(run);
  const { detalle, ejecuciones, parada, costeUsd } = await recorrerCasos(dominio, casos, { evalRunId: run.evalRunId, entorno: mundo });
  const puntuacion = puntuar(resultadosDe(detalle), config);
  const estado = parada ? parada.estado : 'COMPLETED';
  const alCerrar = mundo.alCerrar ? await mundo.alCerrar({ estado, parada }) : {};
  run = {
    ...transicionar(run, estado, { ahora, costUsd: costeUsd, metrics: puntuacion, ...(parada && parada.error ? { error: parada.error } : {}) }),
    ...(parada && parada.motivo ? { motivoDeParada: parada.motivo } : {}),
    ...(parada && parada.sobrecoste ? { sobrecoste: parada.sobrecoste } : {}),
    ...alCerrar,
  };
  await almacen.guardar(run);
  return { run, scores: parada ? null : puntuacion, ejecuciones, interrumpidoPor: parada ? parada.estado : null, reanudado: false, parada, detalle };
};
