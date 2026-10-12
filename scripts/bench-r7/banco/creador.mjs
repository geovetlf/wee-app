/**
 * Piezas comunes de los guiones que ejecutan Weë AI (`creatorRun`, `creatorQuote`, `creatorChat`):
 * los proveedores simulados (con los tiempos de proveedor SUPUESTOS que se declaran abajo), la
 * construcción de un trabajo `planned` con el plan real de cada plantilla y la lectura del libro.
 */
import { lib, UID, texto } from './entorno.mjs';

/**
 * TIEMPOS DE PROVEEDOR SUPUESTOS (ms virtuales). NO están medidos —salvo el vídeo, que viene de producción
 * (docs/RUNTIME.md §19.1: 78,9 s sondeando un clip de 4 s a 480p)—. Sirven para ordenar el tiempo de un
 * trabajo en serie frente a uno en paralelo; si el proveedor real es más lento o más rápido, las cifras
 * escalan, no cambia la estructura. Marcados como [E] en todos los informes.
 */
export const TIEMPOS = {
  'text.generate': 3_000,
  'text.structure': 2_500,
  'text.search': 5_000,
  'vision.describe': 4_000,
  imagen: 12_000, // POR PROPUESTA
  video: 78_900,
  'voice.tts': 4_000,
};

const urlDeAlmacen = (uid, nombre) =>
  `https://firebasestorage.googleapis.com/v0/b/demo-wee.firebasestorage.app/o/${encodeURIComponent(`users/${uid}/ai-generations/${nombre}`)}?alt=media&token=prueba${Math.abs(hash(nombre))}`;
const hash = (s) => [...s].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 7);

/** Instala los dobles de todos los proveedores que el plan por defecto de cada experiencia puede tocar. */
export function simularProveedoresDeCreador(E, { serieDeImagenes = true, factorDeCoste = 1, tiempos = TIEMPOS, aleatorioDeTexto = (cap) => (cap === 'text.structure' ? '{"answers":[]}' : texto(cap === 'text.search' ? 1500 : 1200)) } = {}) {
  const { reloj } = E;
  const { estimateUsd } = lib('engine/pricing.js');
  let serie = 0;
  const responder = (id) => async (req) => {
    const cap = req.capability;
    const n = Math.max(1, Number(req.input.count ?? 1));
    const uid = req.ctx.userId;
    const usd = estimateUsd(req.model, cap, req.input, req.prefs ?? {}) * factorDeCoste;
    if (cap.startsWith('image.')) {
      /* Los tres adaptadores de imagen hacen N propuestas EN SERIE (gemini.ts:384-393, flux.ts:249-271, seedream.ts:172-193); lo comprueba 10-adaptadores. */
      await reloj.dormir(serieDeImagenes ? tiempos.imagen * n : tiempos.imagen);
      return {
        output: { kind: 'image', urls: Array.from({ length: n }, (_, i) => urlDeAlmacen(uid, `img${++serie}_${i}.png`)) },
        usage: {}, costUSD: usd, latencyMs: tiempos.imagen * n, model: req.model.id, meta: { width: 1024, height: 1024, actualTokens: undefined },
      };
    }
    if (cap.startsWith('video.')) {
      await reloj.dormir(tiempos.video);
      return { output: { kind: 'video', url: urlDeAlmacen(uid, `clip${++serie}.mp4`), durationSec: Number(req.input.durationSec ?? 5) }, usage: {}, costUSD: usd, latencyMs: tiempos.video, model: req.model.id, meta: { resolution: '720p' } };
    }
    if (cap === 'voice.tts') {
      await reloj.dormir(tiempos['voice.tts']);
      return { output: { kind: 'audio', url: urlDeAlmacen(uid, `voz${++serie}.mp3`) }, usage: {}, costUSD: usd, latencyMs: tiempos['voice.tts'], model: req.model.id };
    }
    const t = tiempos[cap] ?? tiempos['text.generate'];
    await reloj.dormir(t);
    const contenido = aleatorioDeTexto(cap);
    const tokens = Math.ceil(contenido.length / 4);
    return {
      output: { kind: 'text', content: contenido, ...(cap === 'text.search' ? { sources: [{ url: 'https://ejemplo.invalid/a', title: 'a' }] } : {}) },
      usage: { inputTokens: 700, outputTokens: tokens }, costUSD: usd, latencyMs: t, model: req.model.id,
    };
  };
  for (const id of ['gemini', 'flux', 'seedream', 'seedance', 'elevenlabs', 'deepseek']) E.simular(id, responder(id));
}

/** Respuestas por defecto (la primera opción que no sea «no sé») para que `buildPlan` dé el plan completo. */
export function planDe(experiencia, { objetivo, cambios = {} } = {}) {
  const { TEMPLATES } = lib('creator/templates.js');
  const t = TEMPLATES[experiencia];
  const record = {};
  for (const q of t.questions) {
    if (q.when && !q.when(record)) continue;
    const opt = (q.options || []).find((o) => o.id !== 'idk') || (q.options || [])[0];
    record[q.id] = cambios[q.id] ?? (opt ? opt.id : 'texto libre de prueba');
  }
  return t.buildPlan(objetivo ?? t.defaultGoal, record);
}

export const NECESITA_FOTO = new Set(['photo', 'home', 'beauty']);

/** Siembra un trabajo `planned` listo para `creatorRun` con el plan real de la plantilla. Devuelve el id. */
export async function sembrarTrabajo(E, { uid, experiencia, jobId, quality, objetivo, cambios }) {
  const { TEMPLATES } = lib('creator/templates.js');
  const { estimatePlanCredits } = lib('creator/credits.js');
  const plan = planDe(experiencia, { objetivo, cambios });
  const creditsEstimated = await estimatePlanCredits(plan, uid);
  const inputImageUrl = NECESITA_FOTO.has(experiencia)
    ? `https://firebasestorage.googleapis.com/v0/b/demo-wee.firebasestorage.app/o/${encodeURIComponent(`users/${uid}/creator-inputs/foto.jpg`)}?alt=media&token=pruebafoto`
    : undefined;
  const ahora = E.Timestamp.now();
  E.banco.sembrar(`creatorJobs/${jobId}`, {
    id: jobId, userId: uid, experienceId: experiencia, goal: objetivo ?? TEMPLATES[experiencia].defaultGoal,
    questions: [], answers: [], plan, steps: plan.steps.map((s) => ({ ...s, status: 'pending' })), results: [],
    status: 'planned', progressText: 'Este es el plan.', creditsEstimated, creditsCharged: 0, demo: true, pricingMode: 'simulated',
    ...(quality ? { quality } : {}), ...(inputImageUrl ? { inputImageUrl } : {}), createdAt: ahora, updatedAt: ahora,
  });
  return { plan, creditsEstimated, inputImageUrl };
}

/** Credits y dólares acumulados en `aiUsage/{día}` y en `creditStats/global` AHORA (para restar lo anterior a un trabajo). */
export function acumulados(E) {
  const { banco } = E;
  const dia = new Date(E.reloj.epoch + E.reloj.ahora).toISOString().slice(0, 10);
  const uso = banco.leer(`aiUsage/${dia}`) ?? {};
  const stats = banco.leer('creditStats/global') ?? {};
  let credits = 0;
  let usd = 0;
  for (const [k, cap] of Object.entries(uso)) {
    if (k === 'byProvider' || k === 'updatedAt' || !cap || typeof cap !== 'object') continue;
    for (const p of Object.values(cap)) {
      credits += Number(p?.credits) || 0;
      usd += Number(p?.usd) || 0;
    }
  }
  return { usoCredits: credits, usoUsd: Number(usd.toFixed(6)), statsTotalSpent: Number(stats.totalSpent) || 0, statsTotalRefunded: Number(stats.totalRefunded) || 0 };
}

/** Lo que el libro, el Credit Engine y los acumulados dicen de un trabajo, para compararlos entre sí. */
export function leerLibro(E, { uid, jobId, antes }) {
  const { banco } = E;
  const todas = banco.hijos('aiGenerations').filter((g) => g.requestId?.startsWith(jobId) || g.jobId === jobId);
  /* Las filas ligadas a la reserva del trabajo (las que se cobran) y las INTERNAS sin transacción (p. ej. la traducción del prompt para Seedream). */
  const filas = todas.filter((g) => g.creditTransactionId === `usage_${jobId}`);
  const internas = todas.filter((g) => g.creditTransactionId !== `usage_${jobId}`);
  const dia = new Date(E.reloj.epoch + E.reloj.ahora).toISOString().slice(0, 10);
  const tx = banco.leer(`creditTransactions/usage_${jobId}`);
  const perfil = banco.hijos('users').find((u) => u.uid === uid);
  const trabajo = banco.leer(`creatorJobs/${jobId}`) ?? {};
  const suma = (k) => filas.reduce((a, f) => a + (Number(f[k]) || 0), 0);
  return {
    internasSinCobro: internas.map((f) => ({ cap: f.capability, proveedor: f.provider, estado: f.status, providerCost: f.providerCost, creditsEstimated: f.creditsEstimated })),
    filas: filas.map((f) => ({ cap: f.capability, proveedor: f.provider, modelo: f.model, estado: f.status, providerCost: f.providerCost, creditsEstimated: f.creditsEstimated, creditsCharged: f.creditsCharged, intento: f.attempt })),
    sumaProviderCost: Number(suma('providerCost').toFixed(6)),
    sumaCreditsEstimatedFilas: suma('creditsEstimated'),
    sumaCreditsChargedFilas: filas.every((f) => f.creditsCharged !== undefined) ? suma('creditsCharged') : null,
    trabajo: { status: trabajo.status, creditsEstimated: trabajo.creditsEstimated, creditsCharged: trabajo.creditsCharged },
    transaccion: tx ? { estado: tx.status, autorizado: tx.authorizedAmount, final: tx.finalAmount, importe: tx.amount } : null,
    saldo: perfil?.creditsBalance,
    gastadoDePorVida: perfil?.creditsLifetimeSpent,
    acumuladoDelTrabajo: (() => {
      const ahora = acumulados(E);
      const base = antes ?? { usoCredits: 0, usoUsd: 0, statsTotalSpent: 0, statsTotalRefunded: 0 };
      return {
        aiUsageCredits: ahora.usoCredits - base.usoCredits,
        aiUsageUsd: Number((ahora.usoUsd - base.usoUsd).toFixed(6)),
        creditStatsGastado: ahora.statsTotalSpent - base.statsTotalSpent,
        creditStatsDevuelto: ahora.statsTotalRefunded - base.statsTotalRefunded,
      };
    })(),
  };
}

export { UID };
