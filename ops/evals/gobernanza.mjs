/*
 * WEE AI EVALUATION ENGINE — GOBERNANZA DE UNA CORRIDA (F2-B).
 *
 * Ata las piezas de F2-B alrededor de una corrida, sin gastar nada (F2-A/F2-B son $0): permiso → (holdout sellado) →
 * evalRun QUEUED → presupuesto FAIL-CLOSED → RUNNING → bucle de casos con CANCELACIÓN y tope por caso → COMPLETED /
 * CANCELLED / BUDGET_EXCEEDED. El gasto se mide contra la identidad `eval` (providerCost USD), NUNCA contra Credits
 * de usuario. En F2-B el coste por caso es 0 (fakes); la máquina se prueba con costes simulados.
 *
 * Puro salvo la lectura de los módulos del dominio (sin red, sin Firestore). El dominio sale de `dataset.dominio` y del
 * registro (`dominios.mjs`): esta gobernanza no conoce ninguno. La persistencia y el proveedor real
 * son F2-C: aquí el almacén es en memoria y el coste simulado.
 */
import { DOMINIOS, decidirYCalificar, resolverDominio } from './dominios.mjs';
import { puntuar } from './scoring.mjs';
import { decidirPresupuesto, crearAcumuladorDeGasto } from './presupuesto.mjs';
import { crearEvalRun, transicionar, almacenMemoria } from './evalRun.mjs';
import { cargarHoldout } from './holdout.mjs';

/**
 * Corre una evaluación GOBERNADA. Opciones:
 *  · dataset, config, spec (para el evalRun), ahora()
 *  · presupuesto { habilitado, maxUsdPerDay, gastadoHoyUsd }, costePorCasoUsd (simulado; 0 en F2-B)
 *  · autorizacionHoldout (si el dataset es holdout) · cancelToken { cancelado:boolean } · almacen (opcional)
 * Devuelve { run, scores|null, ejecuciones, interrumpidoPor }.
 */
export const correrEvalGobernada = async ({
  dataset, config, spec, ahora,
  presupuesto = { habilitado: false }, costePorCasoUsd = 0,
  autorizacionHoldout, cancelToken, almacen = almacenMemoria(), dominios = DOMINIOS,
} = {}) => {
  const dominio = resolverDominio(dominios, dataset && dataset.dominio); // un dominio sin registrar no crea ni una corrida
  // Holdout: solo con permiso y motivo (lanza si se deniega). El corredor de desarrollo normal no entra aquí.
  const casos = dataset.holdout === true ? cargarHoldout(dataset, autorizacionHoldout).casos : dataset.casos;

  let { run } = almacen.crearIdempotente(crearEvalRun({ ...spec, datasetVersion: dataset.version }, ahora));
  // Pre-chequeo de presupuesto (coste estimado de todo el dataset). FAIL-CLOSED.
  const estimadoTotal = costePorCasoUsd * casos.length;
  const pre = decidirPresupuesto({ ...presupuesto, costeEstimadoUsd: estimadoTotal });
  if (!pre.permite) {
    run = transicionar(run, 'BUDGET_EXCEEDED', { ahora, error: `presupuesto: ${pre.motivo}` });
    almacen.guardar(run);
    return { run, scores: null, ejecuciones: 0, interrumpidoPor: 'BUDGET_EXCEEDED', presupuesto: pre };
  }

  run = transicionar(run, 'RUNNING', { ahora });
  almacen.guardar(run);
  const acc = crearAcumuladorDeGasto();
  const resultados = [];
  let ejecuciones = 0;
  let interrumpidoPor = null;

  for (const caso of casos) {
    if (cancelToken && cancelToken.cancelado) { interrumpidoPor = 'CANCELLED'; break; }
    // Tope por caso: ¿cabe el siguiente coste? Si no, se para sin gastarlo (fail-closed).
    const paso = decidirPresupuesto({ ...presupuesto, gastadoHoyUsd: (presupuesto.gastadoHoyUsd || 0) + acc.total, costeEstimadoUsd: costePorCasoUsd });
    if (!paso.permite) { interrumpidoPor = 'BUDGET_EXCEEDED'; break; }
    const { decision, graders } = await decidirYCalificar(dominio, caso); // $0: el dominio no ejecuta adaptadores
    ejecuciones += decision.ejecuciones;
    acc.sumar(`${run.evalRunId}:${caso.evalCaseId}`, costePorCasoUsd); // en F2-B costePorCasoUsd = 0
    resultados.push({ evalCaseId: caso.evalCaseId, graders });
  }

  if (interrumpidoPor) {
    run = transicionar(run, interrumpidoPor, { ahora, costUsd: acc.total });
    almacen.guardar(run);
    return { run, scores: null, ejecuciones, interrumpidoPor };
  }
  const scores = puntuar(resultados, config);
  run = transicionar(run, 'COMPLETED', { ahora, costUsd: acc.total, metrics: scores });
  almacen.guardar(run);
  return { run, scores, ejecuciones, interrumpidoPor: null };
};
