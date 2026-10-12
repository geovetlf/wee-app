#!/usr/bin/env node
/**
 * 07 · COHERENCIA ENTRE LA COTIZACIÓN, LOS CREDITS DEL LIBRO Y EL COSTE DEL PROVEEDOR.
 *
 * Barrido de planes: para cada experiencia de Weë AI, el plan por defecto y UNA variación por cada opción de cada
 * pregunta (las demás a su valor por defecto), con el nivel de calidad sin elegir y con cada uno de los tres niveles
 * (`standard`, `high`, `max`). Cada plan se ejecuta con `creatorRun` REAL, en los dos modos de precios, y se compara:
 *
 *   cotización  = `creditsEstimated` del trabajo (lo que la persona vio antes de crear; `estimatePlan`);
 *   filas       = Σ `aiGenerations.creditsEstimated` (lo que el Router dice que vale CADA paso al ejecutarlo);
 *   cobrado     = `creditTransactions/usage_<job>.finalAmount` (lo que de verdad se cobró);
 *   coste       = Σ del coste del proveedor que el propio código calcula para ese modelo y tamaño (`priceImage().usd` para imágenes,
 *                 `estimateUsd` para el resto) — es el coste de LISTA del modelo elegido, NO una medida de producción.
 *
 * Invariantes que se comprueban en TODAS las ejecuciones (si alguna falla, se lista):
 *   I1  Σ `creditsCharged` de las filas == cobrado.
 *   I2  Δ `aiUsage` (credits) == cobrado.     I3  Δ `creditStats.totalSpent` == cobrado.
 *   I4  cobrado <= cotización.                I5  una ejecución correcta termina en COMPLETED.
 *
 * No cambia ningún precio. Los modos: `simulated` es el de producción por defecto (`CREATOR_PRICING_MODE`); `real` se
 * simula escribiendo `aiSettings/global.pricingMode` en el doble, como lo haría la administración.
 *
 *     node scripts/bench-r7/07-coherencia.mjs
 */
import { prepararEntorno, lib, UID, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';
import { simularProveedoresDeCreador, leerLibro, acumulados, TIEMPOS } from './banco/creador.mjs';

const CERO = Object.fromEntries(Object.keys(TIEMPOS).map((k) => [k, 0]));
const E = prepararEntorno({ latencia: { get: 0, query: 0, write: 0, commit: 0 } });
const { banco } = E;
const { TEMPLATES } = lib('creator/templates.js');
const { estimatePlanCredits } = lib('creator/credits.js');
const creator = lib('creator/index.js');
const { priceImage, priceVideo } = lib('credits/aiPricing.js');
const { needsInputImage } = lib('creator/inputs.js');
const { estimateUsd } = lib('engine/pricing.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');

const uid = UID(1);
const EXPERIENCIAS = ['design', 'studio', 'photo', 'writer', 'chef', 'home', 'business', 'travel', 'beauty'];

/* El proveedor simulado cobra el coste de LISTA del modelo elegido (el mismo que usa el código para cotizar). */
simularProveedoresDeCreador(E, { tiempos: CERO });
const costeDeLista = (req) => {
  const cap = req.capability;
  if (cap.startsWith('image.')) {
    const refs = Array.isArray(req.input.referenceImages) ? req.input.referenceImages.length : req.input.imageUrl ? 1 : 0;
    return priceImage({ capability: cap, modelId: req.model.id, count: req.input.count, resolution: req.input.resolution, kind: req.input.kind, references: refs, quality: req.input.quality }, DEFAULT_SETTINGS).usd;
  }
  if (cap.startsWith('video.')) {
    /* El coste del vídeo por modelo, resolución y duración: el mismo cálculo con el que se cotiza (`priceVideo`). */
    return priceVideo({ modelId: req.model.id, durationSec: req.input.durationSec, aspectRatio: req.input.aspectRatio, resolution: req.input.resolution, quality: req.input.quality }, DEFAULT_SETTINGS).usd;
  }
  return estimateUsd(req.model, cap, req.input, req.prefs ?? {});
};
const respaldos = new Map();
for (const id of ['gemini', 'flux', 'seedream', 'seedance', 'elevenlabs', 'deepseek']) {
  const adaptador = E.ADAPTERS[id];
  const base = adaptador.run;
  respaldos.set(id, base);
  adaptador.run = async (req) => {
    const r = await base(req);
    return { ...r, costUSD: costeDeLista(req) };
  };
}

const variaciones = (experiencia) => {
  const t = TEMPLATES[experiencia];
  const porDefecto = {};
  for (const q of t.questions) {
    if (q.when && !q.when(porDefecto)) continue;
    const o = (q.options || []).find((x) => x.id !== 'idk') || (q.options || [])[0];
    porDefecto[q.id] = o ? o.id : 'texto libre de prueba';
  }
  const lista = [{ etiqueta: 'por defecto', record: { ...porDefecto } }];
  for (const q of t.questions) {
    for (const o of q.options || []) {
      if (o.id === 'idk' || o.id === porDefecto[q.id]) continue;
      const record = { ...porDefecto, [q.id]: o.id };
      /* Las preguntas condicionadas se rellenan con su defecto si aparecen. */
      for (const q2 of t.questions) if (q2.id !== q.id && (!q2.when || q2.when(record)) && !(q2.id in record)) {
        const o2 = (q2.options || []).find((x) => x.id !== 'idk') || (q2.options || [])[0];
        record[q2.id] = o2 ? o2.id : 'texto libre de prueba';
      }
      lista.push({ etiqueta: `${q.id}=${o.id}`, record });
    }
  }
  return lista;
};

const ejecutar = async ({ modo, experiencia, etiqueta, record, quality }) => {
  const t = TEMPLATES[experiencia];
  const plan = t.buildPlan(t.defaultGoal, record);
  E.reiniciarBase();
  E.enfriarCaches();
  E.sembrarCuenta(uid, 100_000);
  banco.sembrar('aiSettings/global', { pricingMode: modo });
  E.enfriarCaches();
  const jobId = `coherencia${experiencia.slice(0, 4)}${String(++serie).padStart(6, '0')}`;
  const quote = await E.preparar(() => estimatePlanCredits(plan, uid).then(async (base) => {
    if (!quality) return base;
    const { estimatePlan } = lib('creator/credits.js');
    return (await estimatePlan(plan, uid, quality)).total;
  }));
  const ahora = E.Timestamp.now();
  banco.sembrar(`creatorJobs/${jobId}`, {
    id: jobId, userId: uid, experienceId: experiencia, goal: t.defaultGoal, questions: [], answers: [], plan,
    steps: plan.steps.map((s) => ({ ...s, status: 'pending' })), results: [], status: 'planned', progressText: '', creditsEstimated: quote, creditsCharged: 0, demo: true, pricingMode: modo,
    ...(quality ? { quality } : {}),
    ...(needsInputImage(plan.steps) ? { inputImageUrl: `https://firebasestorage.googleapis.com/v0/b/demo-wee.firebasestorage.app/o/${encodeURIComponent(`users/${uid}/creator-inputs/foto.jpg`)}?alt=media&token=pruebafoto` } : {}),
    createdAt: ahora, updatedAt: ahora,
  });
  const antes = acumulados(E);
  const m = await E.medir(() => creator.creatorRun.run({ auth: { uid }, data: { jobId, locale: 'es' } }));
  const libro = leerLibro(E, { uid, jobId, antes });
  const tx = libro.transaccion;
  const cobrado = tx ? (tx.estado === 'COMPLETED' ? tx.final : tx.estado === 'REFUNDED' ? 0 : null) : null;
  const costeUsd = libro.sumaProviderCost;
  return {
    modo, experiencia, variacion: etiqueta, quality: quality ?? '—', ok: !m.error, error: m.error ? String(m.error.message).slice(0, 80) : undefined,
    cotizacion: quote, filas: libro.sumaCreditsEstimatedFilas, cobrado, creditsFilas: libro.sumaCreditsChargedFilas,
    costeUsd, costeEnCredits: Number((costeUsd * DEFAULT_SETTINGS.creditsPerUsd).toFixed(2)),
    deltaAiUsage: libro.acumuladoDelTrabajo.aiUsageCredits, deltaStats: libro.acumuladoDelTrabajo.creditStatsGastado - libro.acumuladoDelTrabajo.creditStatsDevuelto,
    estadoTx: tx?.estado, pasos: plan.steps.length,
    detalleFilas: libro.filas.map((f) => `${f.cap}@${f.modelo}: est ${f.creditsEstimated} cob ${f.creditsCharged}`),
    internasSinCobro: libro.internasSinCobro.length, costeInternasUsd: Number(libro.internasSinCobro.reduce((a, f) => a + (Number(f.providerCost) || 0), 0).toFixed(6)),
  };
};

let serie = 0;
const corridas = [];
for (const modo of ['simulated', 'real']) {
  for (const experiencia of EXPERIENCIAS) {
    for (const v of variaciones(experiencia)) {
      for (const quality of [undefined, 'standard', 'high', 'max']) {
        corridas.push(await ejecutar({ modo, experiencia, etiqueta: v.etiqueta, record: v.record, quality }));
      }
    }
  }
}
/*
 * ── REPRODUCCIÓN MÍNIMA de los dos desajustes, sin ejecutar nada ───────────────────────────────────────────────
 * 1) Weë Photo («enhance», 2K): la cotización sube a «Alta calidad» (flux-2-pro) porque la plantilla PIDE 2K; el motor, al ejecutar,
 *    marca esa resolución como «puesta por el motor» (`resolutionFromEngine`, engine/image.ts:54) y `creditsFor` (engine/pricing.ts:110)
 *    la vuelve a cotizar SIN subir de nivel: sale el precio del nivel estándar, mientras que el modelo que se ejecuta sigue siendo flux-2-pro.
 * 2) Weë Studio con calidad explícita: la cotización usa `priceVideo` (modelo, resolución, duración); el precio por fila al ejecutar usa el
 *    catálogo plano del servicio (`serviceForCapability`), que no mira ni la resolución ni la duración.
 */
const reproduccion = (() => {
  const { planImage } = lib('engine/image.js');
  const { creditsFor } = lib('engine/pricing.js');
  const salida = {};
  const edit = TEMPLATES.photo.buildPlan(TEMPLATES.photo.defaultGoal, { detail: 'natural', what: 'enhance' }).steps.find((s) => s.capability === 'image.edit');
  const entrada = { ...edit.input, purpose: edit.purpose, previous: [], imageUrl: 'https://firebasestorage.googleapis.com/v0/b/demo-wee.firebasestorage.app/o/users%2Fu%2Ffoto.jpg?alt=media' };
  const plan = planImage({ capability: 'image.edit', input: entrada });
  const cotizacion = priceImage({ capability: 'image.edit', count: edit.input.count, quality: edit.input.quality, resolution: edit.input.resolution, kind: edit.input.kind, references: 1 }, DEFAULT_SETTINGS);
  salida.photo = {
    entradaDelPaso: edit.input, modeloQueSeEjecuta: plan.choice.model.modelId, nivelAlPlanear: plan.choice.tier,
    cotizacion: { service: cotizacion.service, credits: cotizacion.credits, usdPorImagen: cotizacion.detail.usdPerImage, nivel: cotizacion.detail.tier },
    creditsForAlEjecutar: creditsFor('image.edit', cotizacion.usd, DEFAULT_SETTINGS, false, { ...plan.input, prompt: 'x' }),
    resolutionFromEngine: plan.input.resolutionFromEngine,
  };
  return salida;
})();

E.restaurar();

/* ── análisis ── */
const buenas = corridas.filter((c) => c.ok);
const fallos = corridas.filter((c) => !c.ok);
const invariantes = {
  I1_filasCobradasIgualCobrado: buenas.filter((c) => c.creditsFilas !== c.cobrado),
  I2_aiUsageIgualCobrado: buenas.filter((c) => c.deltaAiUsage !== c.cobrado),
  I3_statsNetoIgualCobrado: buenas.filter((c) => c.deltaStats !== c.cobrado),
  I4_cobradoNoSuperaLaCotizacion: buenas.filter((c) => c.cobrado > c.cotizacion),
  I5_terminaCompleted: buenas.filter((c) => c.estadoTx !== 'COMPLETED'),
};
const conInternas = buenas.filter((c) => c.internasSinCobro > 0);
const filasDistintasDeLaCotizacion = buenas.filter((c) => c.filas !== c.cotizacion);
const cobraMenosQueElCoste = buenas.filter((c) => c.cobrado < c.costeEnCredits);
const resumen = (modo) => {
  const cs = buenas.filter((c) => c.modo === modo);
  return {
    modo, corridas: cs.length,
    filasDistintasDeLaCotizacion: cs.filter((c) => c.filas !== c.cotizacion).length,
    filasPorDebajo: cs.filter((c) => c.filas < c.cotizacion).length, filasPorEncima: cs.filter((c) => c.filas > c.cotizacion).length,
    cobraDistintoDeLaCotizacion: cs.filter((c) => c.cobrado !== c.cotizacion).length,
    cobraMenosQueElCosteDeLista: cs.filter((c) => c.cobrado < c.costeEnCredits).length,
    peorBrechaEnCredits: cs.reduce((m, c) => Math.max(m, c.costeEnCredits - c.cobrado), 0),
  };
};
const resumenes = ['simulated', 'real'].map(resumen);

const md = [];
md.push('# 07 · Coherencia entre cotización, libro y coste del proveedor\n');
md.push(`Medido con \`scripts/bench-r7/07-coherencia.mjs\`: ${corridas.length} ejecuciones reales de \`creatorRun\` (${buenas.length} correctas, ${fallos.length} fallidas) en dos modos de precios. Coste = coste de LISTA del modelo elegido calculado por el propio código; no es una medida de producción.\n`);
md.push('## Invariantes (deben estar vacíos)\n');
md.push(tabla(['Invariante', 'Violaciones'], Object.entries(invariantes).map(([k, v]) => [k, v.length])));
md.push(`\nEjecuciones con pasos INTERNOS sin cobro (traducción del prompt para Seedream): ${conInternas.length}; llamadas internas: ${conInternas.reduce((a, c) => a + c.internasSinCobro, 0)}; coste de proveedor sin cobrar según el libro: ${conInternas.reduce((a, c) => a + c.costeInternasUsd, 0).toFixed(5)} USD.\n`);
md.push('\n## Resumen por modo\n');
md.push(tabla(['Modo', 'Corridas', 'Filas ≠ cotización', 'Filas por debajo', 'Filas por encima', 'Cobrado ≠ cotización', 'Cobrado < coste de lista', 'Peor brecha (credits)'], resumenes.map((r) => [r.modo, r.corridas, r.filasDistintasDeLaCotizacion, r.filasPorDebajo, r.filasPorEncima, r.cobraDistintoDeLaCotizacion, r.cobraMenosQueElCosteDeLista, r.peorBrechaEnCredits])));
const ejemplos = (lista, n = 12) => lista.slice(0, n).map((c) => [c.modo, c.experiencia, c.variacion, c.quality, c.cotizacion, c.filas, c.cobrado, c.costeEnCredits, c.detalleFilas.join(' · ')]);
md.push('\n## Reproducción mínima del desajuste de Weë Photo (sin ejecutar nada)\n```json\n' + JSON.stringify(reproduccion.photo, null, 1) + '\n```');
md.push('\n## Filas ≠ cotización (primeras 12; el resto en el JSON)\n');
md.push(tabla(['Modo', 'Experiencia', 'Variación', 'Calidad', 'Cotización', 'Σ filas estimado', 'Cobrado', 'Coste lista (credits)', 'Detalle por fila'], ejemplos(filasDistintasDeLaCotizacion)));
md.push('\n## Cobrado < coste de lista (primeras 12)\n');
md.push(tabla(['Modo', 'Experiencia', 'Variación', 'Calidad', 'Cotización', 'Σ filas estimado', 'Cobrado', 'Coste lista (credits)', 'Detalle por fila'], ejemplos(cobraMenosQueElCoste)));
if (fallos.length) {
  md.push('\n## Ejecuciones fallidas (primeras 10)\n');
  md.push(tabla(['Modo', 'Experiencia', 'Variación', 'Calidad', 'Error'], fallos.slice(0, 10).map((c) => [c.modo, c.experiencia, c.variacion, c.quality, c.error])));
}
md.push('\n## Violaciones de I1 (primeras 10)\n');
md.push(tabla(['Modo', 'Experiencia', 'Variación', 'Calidad', 'Cobrado', 'Σ creditsCharged de las filas', 'Detalle'], invariantes.I1_filasCobradasIgualCobrado.slice(0, 10).map((c) => [c.modo, c.experiencia, c.variacion, c.quality, c.cobrado, c.creditsFilas, c.detalleFilas.join(' · ')])));
const dir = guardar('07-coherencia', { reproduccion, internasSinCobro: { ejecuciones: conInternas.length }, resumenes, violacionesI1: invariantes.I1_filasCobradasIgualCobrado, invariantes: Object.fromEntries(Object.entries(invariantes).map(([k, v]) => [k, v.length])), filasDistintasDeLaCotizacion, cobraMenosQueElCoste, fallos, corridas }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
