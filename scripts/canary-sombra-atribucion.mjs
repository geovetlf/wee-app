/*
 * CANARY DE LA SOMBRA — DE QUIÉN ES CADA EFECTO. Puro: sin Firestore, sin red.
 *
 * El monitor (`scripts/canary-sombra.mjs`) recoge los hechos de producción y le
 * pregunta a este módulo una sola cosa sobre los Credits (condición #3), los
 * materiales (#4) y las ejecuciones (#5): ¿esto lo produjo la SOMBRA?
 *
 * ── La regla ────────────────────────────────────────────────────────────────
 *
 * Un efecto es de la sombra SOLO si algún identificador suyo —o el de la fila
 * del libro que lo enlaza— lleva la identidad de la sombra. Que la cuenta sea
 * la de la canary, que el trabajo sea el de la canary o que ocurra después de
 * la sombra NO basta: la persona puede pulsar «Crear» sobre ese mismo trabajo, y
 * eso es Legacy (`creatorRun`) con todo su derecho a cobrar.
 *
 * ── La identidad de la sombra NO se inventa aquí ────────────────────────────
 *
 * Sale del código desplegado (`functions/lib/creator/sombra.js`), que es quien
 * la pone: `peticionDeLaSombra` da el `shadowRunId` (`<jobId>:algoritmo`), que
 * se guarda en `creatorJobs/{jobId}/private/sombra`; `SELLO_DE_LA_SOMBRA` es el
 * `stepId` y el sufijo del `requestId` del camino brain; `SELLO_DEL_PUENTE`, el
 * de la traza del puente. `identidadDeLaSombra` los lee de ese módulo.
 *
 * ── Lo que devuelve cada condición ──────────────────────────────────────────
 *
 *   STOP        hay al menos un efecto con la identidad de la sombra.
 *   INVESTIGAR  hay un efecto sin identidad de nadie donde no debería (un cargo
 *               de la cuenta de la canary sin rastro, un trabajo del motor sin
 *               dueño). No se le achaca a la sombra, pero tampoco se calla.
 *   OK          todo lo que hay tiene dueño, y ninguno es la sombra.
 *
 * Ningún texto de nadie entra aquí: solo identificadores, tipos e importes.
 */

/** Lo que la canary de planificación deja en su sitio: planificado o preguntando. */
export const ESTADOS_SIN_EJECUTAR = Object.freeze(['asking', 'planned']);

/**
 * LA IDENTIDAD DE LA SOMBRA, LEÍDA DEL CÓDIGO QUE LA ESCRIBE.
 *
 * @param sombra el módulo `functions/lib/creator/sombra.js`.
 */
export const identidadDeLaSombra = (sombra) => {
  const ejemplo = sombra.peticionDeLaSombra({ jobId: 'trabajo', userId: 'cuenta', experienceId: 'travel', pasos: [] }).shadowRunId;
  if (typeof ejemplo !== 'string' || !ejemplo.startsWith('trabajo:')) {
    throw new Error('el shadowRunId del código ya no tiene la forma <jobId>:<sufijo>: la atribución no puede fiarse');
  }
  const sufijoDelAlgoritmo = ejemplo.slice('trabajo:'.length);
  const sufijos = [sufijoDelAlgoritmo, sombra.SELLO_DE_LA_SOMBRA, sombra.SELLO_DEL_PUENTE];
  if (sufijos.some((s) => typeof s !== 'string' || !s)) throw new Error('falta un sello de la sombra en el código');
  return Object.freeze({
    sufijos: Object.freeze(sufijos),
    selloDelPaso: sombra.SELLO_DE_LA_SOMBRA,
    /** La llamada con la que el camino brain ENTIENDE: es proveedor (#1/#7), no ejecución (#5). */
    capacidadDelEntendimiento: sombra.CAPACIDAD_DEL_ENTENDIMIENTO,
  });
};

/** ¿Este valor nombra una ejecución de la sombra? Un `shadowRunId` guardado, o un id con su sufijo. */
export const nombraLaSombra = (valor, identidad, idsDeLaSombra) =>
  typeof valor === 'string' && valor.length > 0
  && (idsDeLaSombra.has(valor) || identidad.sufijos.some((s) => valor.endsWith(`:${s}`)));

/** Lo mismo, en cualquier campo de un documento (hasta dos niveles: `meta`, `trace`, `contextRef`…). */
const algunCampoNombraLaSombra = (doc, identidad, ids, nivel = 0) =>
  Object.values(doc ?? {}).some((v) => (typeof v === 'string'
    ? nombraLaSombra(v, identidad, ids)
    : nivel < 2 && v && typeof v === 'object' && !Array.isArray(v) && algunCampoNombraLaSombra(v, identidad, ids, nivel + 1)));

/**
 * DE QUIÉN ES UNA FILA DEL LIBRO DE IA (`aiGenerations`).
 *
 *   SOMBRA  su `stepId` es el sello de la sombra, o su `requestId`/`stepId` la nombra.
 *   LEGACY  ejecución de `creatorRun` (`requestId` = `<jobId>:<stepId>`), planificación
 *           de `llmPlanner` (trabajo sin paso ni petición) o `brainChat` (`brain_…`).
 */
export const atribuirFila = (fila, identidad, idsDeLaSombra) => {
  if (fila.stepId === identidad.selloDelPaso || [fila.requestId, fila.stepId].some((v) => nombraLaSombra(v, identidad, idsDeLaSombra))) return 'SOMBRA';
  if (fila.stepId && fila.jobId && fila.requestId === `${fila.jobId}:${fila.stepId}`) return 'LEGACY';
  if (!fila.stepId && !fila.requestId && fila.jobId) return 'LEGACY';
  if (/^brain_/.test(String(fila.requestId ?? ''))) return 'LEGACY';
  return 'SIN_ATRIBUIR';
};

/**
 * DE QUIÉN ES UN MOVIMIENTO DE CREDITS (`creditTransactions`).
 *
 * Primero, sus propios identificadores; después, la fila del libro que lo enlaza
 * (`creditTransactionId`, o su `generationId` si es el id de la fila); por último,
 * la retención de `creatorRun` sobre su trabajo (`source` weë-creator, `requestId`
 * = el trabajo). La cuenta y la hora no cuentan.
 */
export const atribuirCredito = (tx, hechos, identidad) => {
  const ids = hechos.idsDeLaSombra;
  const propios = [tx.id, tx.requestId, tx.generationId, tx.meta?.requestId, tx.meta?.stepId, tx.meta?.shadowRunId];
  if (propios.some((v) => nombraLaSombra(v, identidad, ids)) || tx.meta?.stepId === identidad.selloDelPaso) {
    return { de: 'SOMBRA', por: 'un identificador del movimiento nombra la sombra' };
  }
  const enlazadas = hechos.filas.filter((f) => (tx.id && f.creditTransactionId === tx.id) || (tx.generationId && f.id === tx.generationId));
  if (enlazadas.some((f) => atribuirFila(f, identidad, ids) === 'SOMBRA')) return { de: 'SOMBRA', por: 'lo enlaza una fila del libro de la sombra' };
  if (enlazadas.some((f) => atribuirFila(f, identidad, ids) === 'LEGACY')) return { de: 'LEGACY', por: 'lo enlaza una fila de ejecución de Legacy' };
  if (tx.source === 'weë-creator' && hechos.trabajos.some((t) => t.id === tx.requestId)) return { de: 'LEGACY', por: 'retención de creatorRun sobre su trabajo' };
  return { de: 'SIN_ATRIBUIR', por: 'ningún identificador lo ata a nadie' };
};

const cobrado = (movimientos) => movimientos.reduce((s, m) => s + (typeof m.amount === 'number' && m.amount < 0 ? -m.amount : 0), 0);

/**
 * CONDICIÓN #3 — Credits cobrados POR LA SOMBRA.
 *
 * @param hechos { creditos, filas, trabajos, idsDeLaSombra: Set, estadisticasTocadas }
 * @param cuenta la de la canary: solo para contar lo de Legacy y lo que no tiene dueño.
 */
export const condicionCreditos = (hechos, identidad, cuenta) => {
  const lista = hechos.creditos.map((tx) => ({ tx, ...atribuirCredito(tx, hechos, identidad) }));
  const de = (quien) => lista.filter((x) => x.de === quien);
  const deLaCuenta = (xs) => xs.filter((x) => x.tx.userId === cuenta);
  const sinDueno = deLaCuenta(de('SIN_ATRIBUIR'));
  const estadisticasSinExplicar = hechos.estadisticasTocadas > 0 && lista.length === 0;
  return {
    estado: de('SOMBRA').length ? 'STOP' : sinDueno.length || estadisticasSinExplicar ? 'INVESTIGAR' : 'OK',
    shadowCreditsCharged: cobrado(de('SOMBRA').map((x) => x.tx)),
    legacyCreditsCharged: cobrado(deLaCuenta(de('LEGACY')).map((x) => x.tx)),
    movimientos: lista.map((x) => ({ id: x.tx.id, deLaCuenta: x.tx.userId === cuenta, de: x.de, por: x.por, type: x.tx.type ?? null, amount: x.tx.amount ?? null })),
    sinAtribuirDeLaCuenta: sinDueno.length,
    estadisticasSinExplicar,
  };
};

/**
 * CONDICIÓN #5 — Ejecuciones hechas POR LA SOMBRA.
 *
 * Un trabajo de WEË AI solo sale de «planificado» por `creatorRun` (Legacy): la
 * sombra no escribe en `creatorJobs` más que su `private/sombra`. Solo sería de
 * la sombra si su libro de EJECUCIÓN llevara su identidad —la fila con la que el
 * camino brain entiende es proveedor, no ejecución, y se queda fuera—. Un trabajo
 * del motor (`jobs`) o un flujo (`workflowRuns`) es de la sombra si algún campo
 * suyo la nombra; si no lo es de nadie, se investiga.
 *
 * @param hechos { trabajos: [{id, userId, status}], filas, jobsNuevos, workflowsNuevos, idsDeLaSombra }
 */
export const condicionEjecuciones = (hechos, identidad, cuenta) => {
  const ids = hechos.idsDeLaSombra;
  const esEntendimiento = (f) => f.stepId === identidad.selloDelPaso && f.capability === identidad.capacidadDelEntendimiento;
  const ejecutados = hechos.trabajos.filter((t) => t.userId === cuenta && !ESTADOS_SIN_EJECUTAR.includes(t.status)).map((t) => {
    const filas = hechos.filas.filter((f) => f.jobId === t.id && (f.stepId || f.requestId) && !esEntendimiento(f));
    return { id: t.id, status: t.status, de: filas.some((f) => atribuirFila(f, identidad, ids) === 'SOMBRA') ? 'SOMBRA' : 'LEGACY' };
  });
  const delMotor = hechos.jobsNuevos.map((j) => ({ id: j.id, de: algunCampoNombraLaSombra(j, identidad, ids) ? 'SOMBRA' : 'SIN_ATRIBUIR' }));
  const flujos = hechos.workflowsNuevos.map((w) => ({ id: w.id, de: algunCampoNombraLaSombra(w, identidad, ids) ? 'SOMBRA' : 'SIN_ATRIBUIR' }));
  const todas = [...ejecutados, ...delMotor, ...flujos];
  return {
    estado: todas.some((x) => x.de === 'SOMBRA') ? 'STOP' : [...delMotor, ...flujos].some((x) => x.de === 'SIN_ATRIBUIR') ? 'INVESTIGAR' : 'OK',
    shadowExecutionJobs: todas.filter((x) => x.de === 'SOMBRA').length,
    legacyExecutionJobs: ejecutados.filter((x) => x.de === 'LEGACY').length,
    trabajosEjecutados: ejecutados, trabajosDelMotor: delMotor, flujos,
  };
};

/* ── #4 · Los materiales (S1.5) ──────────────────────────────────────────── */

/**
 * DE QUIÉN ES UN MATERIAL (`assets`).
 *
 * La evidencia es su PROCEDENCIA (`provenance`, `core/content/asset.ts`), que la
 * escribe quien lo produce y nadie más:
 *
 *   creatorRun (Legacy)   generationId, jobId, stepId, requestId = <jobId>:<stepId>
 *   Weë Studio (vídeo)    generationId, requestId
 *   runtime (Core)        jobId, stepId, requestId (+ runId, traceId, operationId)
 *   una subida            solo createdAt: no hay operación detrás
 *
 *   SOMBRA  algún identificador de su procedencia o de su `metadata` nombra la sombra;
 *           o su `generationId` es una fila del libro de la sombra; o sale
 *           (`sourceAssetIds`) de un material que ya es de la sombra.
 *   LEGACY  su `generationId` es una generación que existe y NO es de la sombra; o su
 *           procedencia es la de un paso de creatorRun (`<jobId>:<stepId>`); o la de una
 *           ejecución del runtime (`runId`, `operationId`, o un `jobId` del motor).
 *   SIN_ATRIBUIR  nada de lo anterior.
 *
 * El dueño (`ownerAccountId`) NO decide nada: solo sirve para contar. Tampoco el
 * `jobId` de un trabajo de WEË AI a secas, ni la hora.
 *
 * @param sombraConocida ids de materiales ya atribuidos a la sombra (para el linaje).
 */
export const atribuirAsset = (asset, hechos, identidad, sombraConocida = new Set()) => {
  const ids = hechos.idsDeLaSombra;
  const p = asset.provenance ?? {};
  const propios = [asset.assetId, p.requestId, p.runId, p.stepId, p.operationId, p.traceId, p.generationId, ...Object.values(asset.metadata ?? {})];
  if (propios.some((v) => nombraLaSombra(v, identidad, ids)) || p.stepId === identidad.selloDelPaso) {
    return { de: 'SOMBRA', por: 'su procedencia nombra la sombra' };
  }
  const fila = typeof p.generationId === 'string' ? hechos.filas.find((f) => f.id === p.generationId) : undefined;
  if (fila && atribuirFila(fila, identidad, ids) === 'SOMBRA') return { de: 'SOMBRA', por: 'su generationId es una fila del libro de la sombra' };
  if ((p.sourceAssetIds ?? []).some((id) => sombraConocida.has(id))) return { de: 'SOMBRA', por: 'sale de un material de la sombra' };
  if (fila) return { de: 'LEGACY', por: 'su generationId es una generación que no es de la sombra' };
  if (p.jobId && p.stepId && p.requestId === `${p.jobId}:${p.stepId}`) return { de: 'LEGACY', por: 'procedencia de un paso de creatorRun (<jobId>:<paso>)' };
  if (p.runId || p.operationId || (p.jobId && hechos.jobsDelMotor?.has(p.jobId))) return { de: 'LEGACY', por: 'procedencia de una ejecución del runtime' };
  return { de: 'SIN_ATRIBUIR', por: 'sin linaje que lo ate a una ejecución' };
};

/** Un objeto del almacén (`mediaObjects`) es de quien sea su material (`assetId`), salvo que él mismo nombre la sombra. */
export const atribuirObjeto = (objeto, atribucionDeAssets, identidad, idsDeLaSombra) => {
  if (algunCampoNombraLaSombra(objeto, identidad, idsDeLaSombra)) return { de: 'SOMBRA', por: 'el objeto nombra la sombra' };
  const delMaterial = atribucionDeAssets.get(objeto.assetId);
  if (delMaterial) return { de: delMaterial.de, por: `es de su material: ${delMaterial.por}` };
  return { de: 'SIN_ATRIBUIR', por: 'su material no tiene dueño conocido' };
};

/**
 * CONDICIÓN #4 — Materiales creados POR LA SOMBRA.
 *
 * @param hechos { assetsTodos: [{assetId, ownerAccountId, provenance, metadata}], assetsNuevos: Set de ids,
 *                 objetosNuevos: [{id, accountId, assetId, …}], filas, idsDeLaSombra, jobsDelMotor: Set }
 * @param cuenta la de la canary: solo para contar lo de Legacy y lo que no tiene dueño.
 */
export const condicionAssets = (hechos, identidad, cuenta) => {
  if (!identidad || !Array.isArray(identidad.sufijos) || identidad.sufijos.length === 0) {
    throw new Error('sin la identidad de la sombra no se puede atribuir ningún material');
  }
  /* El linaje se cierra por pasos: un material sale de otro que ya es de la sombra. */
  const sombra = new Set();
  let atribucion = new Map();
  for (let pasada = 0; pasada <= hechos.assetsTodos.length; pasada++) {
    atribucion = new Map(hechos.assetsTodos.map((a) => [a.assetId, atribuirAsset(a, hechos, identidad, sombra)]));
    const antes = sombra.size;
    for (const [id, x] of atribucion) if (x.de === 'SOMBRA') sombra.add(id);
    if (sombra.size === antes) break;
  }
  const nuevos = hechos.assetsTodos.filter((a) => hechos.assetsNuevos.has(a.assetId)).map((a) => ({ a, ...atribucion.get(a.assetId) }));
  const objetos = hechos.objetosNuevos.map((o) => ({ o, ...atribuirObjeto(o, atribucion, identidad, hechos.idsDeLaSombra) }));
  const deLaCuentaA = (x) => x.a.ownerAccountId === cuenta;
  const deLaCuentaO = (x) => x.o.accountId === cuenta;
  const sinDueno = nuevos.filter((x) => x.de === 'SIN_ATRIBUIR' && deLaCuentaA(x)).length + objetos.filter((x) => x.de === 'SIN_ATRIBUIR' && deLaCuentaO(x)).length;
  return {
    estado: nuevos.some((x) => x.de === 'SOMBRA') || objetos.some((x) => x.de === 'SOMBRA') ? 'STOP' : sinDueno ? 'INVESTIGAR' : 'OK',
    shadowAssetsCreated: nuevos.filter((x) => x.de === 'SOMBRA').length,
    legacyAssetsCreated: nuevos.filter((x) => x.de === 'LEGACY' && deLaCuentaA(x)).length,
    shadowMediaObjects: objetos.filter((x) => x.de === 'SOMBRA').length,
    sinAtribuirDeLaCuenta: sinDueno,
    materiales: nuevos.map((x) => ({ assetId: x.a.assetId, deLaCuenta: deLaCuentaA(x), de: x.de, por: x.por })),
    objetos: objetos.map((x) => ({ id: x.o.id, deLaCuenta: deLaCuentaO(x), de: x.de, por: x.por })),
  };
};
