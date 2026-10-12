#!/usr/bin/env node
/**
 * 08 · RIESGOS DE COSTE POR REINTENTOS, TRABAJOS ABANDONADOS Y RESULTADOS DESCARTADOS.
 *
 * Cada caso ejecuta el código REAL (`engine.generate`, `creatorRun`, `brainChat`) con un fallo inyectado en el doble
 * (de Firestore o del proveedor) y cuenta lo que quedó: llamadas al proveedor, dinero del proveedor ya gastado según
 * el libro, Credits devueltos o retenidos y lo que se queda sin cerrar. NO cambia ningún precio ni ningún contrato.
 *
 *   RA · fallo de Firestore DESPUÉS de un resultado ya pagado (la tarea D/M-01: aquí solo se cuantifica la exposición).
 *   RB · el proceso muere a mitad de un trabajo con la reserva ya hecha: qué queda y quién lo cierra.
 *   RC · un paso barato que puede fallar va DETRÁS de uno caro (Weë Studio: clip antes que voz).
 *   RD · el cupo diario por persona NO se devuelve cuando el trabajo falla y se reembolsa.
 *   RE · fallo del proveedor tras recibir la tarea (coste «en riesgo») con y sin segundo proveedor en la cadena.
 *
 *     node scripts/bench-r7/08-riesgos-de-coste.mjs
 */
import { prepararEntorno, lib, UID, texto, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';
import { simularProveedoresDeCreador, sembrarTrabajo, leerLibro, acumulados, TIEMPOS } from './banco/creador.mjs';

const CERO = Object.fromEntries(Object.keys(TIEMPOS).map((k) => [k, 0]));
const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 } });
const { reloj, banco } = E;
const { engine } = lib('engine/index.js');
const { ProviderError } = lib('engine/http.js');
const creator = lib('creator/index.js');
const uid = UID(1);
const casos = [];

const textoOk = (usd = 0.0019) => async (req) => ({ output: { kind: 'text', content: texto(900) }, usage: { inputTokens: 700, outputTokens: 220 }, costUSD: usd, latencyMs: 0, model: req.model.id });
const aiUsageDelDia = () => {
  const dia = new Date(E.reloj.epoch + E.reloj.ahora).toISOString().slice(0, 10);
  return banco.leer(`aiUsage/${dia}`) ?? {};
};
const resumenDeUso = () => {
  const uso = aiUsageDelDia();
  const porProveedor = {};
  for (const [p, v] of Object.entries(uso.byProvider ?? {})) porProveedor[p] = { llamadas: v.calls ?? 0, usdPagado: Number((v.usd ?? 0).toFixed(6)), usdEnRiesgo: Number((v.usdEnRiesgo ?? 0).toFixed(6)) };
  return porProveedor;
};
const filasDelLibro = () => banco.hijos('aiGenerations').map((g) => `${g.provider}:${g.status}${g.attempt ? `#${g.attempt}` : ''}${g.providerCostStatus ? `(${g.providerCostStatus})` : ''}`);
const nuevoMundo = () => { E.reiniciarBase(); E.enfriarCaches(); E.sembrarCuenta(uid, 5000); };

/* ═══ RA · un fallo de Firestore tras un resultado YA pagado por el proveedor ═══ */
{
  for (const [titulo, proveedoresConfigurados] of [
    ['RA1 · cadena con UN solo proveedor de texto (gemini)', ['gemini']],
    ['RA2 · cadena con DOS proveedores de texto (gemini y claude)', ['gemini', 'claude']],
  ]) {
    nuevoMundo();
    for (const id of ['gemini', 'claude', 'openai']) E.simular(id, textoOk(), { configurado: proveedoresConfigurados.includes(id) });
    /* Caliente: una generación previa llena las cachés y se borra lo que escribió. */
    await E.preparar(() => engine.generate({ capability: 'text.generate', input: { prompt: 'calentamiento' }, userId: uid, jobId: 'calentamiento0001', stepId: 's1', requestId: 'calentamiento0001:s1' }));
    banco.docs.forEach((_, p) => { if (p.startsWith('aiGenerations/') || p.startsWith('aiUsage/')) banco.docs.delete(p); });
    E.llamadasDeProveedor.length = 0;
    engine.health.reset();
    /* El fallo: la 2.ª escritura a `aiGenerations` es el CIERRE (la 1.ª es la apertura). Una sola vez. */
    let n = 0;
    const regla = banco.inyectarFallo((e) => e.tipo === 'set' && /^aiGenerations\//.test(e.escribe?.[0] ?? '') && ++n === 2, { veces: 1 });
    const r = await E.medir(() => engine.generate({ capability: 'text.generate', input: { prompt: 'Una receta sencilla' }, userId: uid, jobId: 'trabajoRA0000001', stepId: 's1', requestId: 'trabajoRA0000001:s1', service: 'ai_text', creditTransactionId: 'usage_trabajoRA0000001' }));
    casos.push({
      caso: titulo, resultadoParaQuienLlama: r.error ? `ERROR (${String(r.error.code ?? r.error.message).slice(0, 40)})` : `OK (${r.valor.provider}, intento ${r.valor.attempts})`,
      llamadasAlProveedor: r.proveedor, proveedores: [...new Set(r.llamadasProveedor.map((l) => l.provider))].join('+'),
      usdPagadoSegunElLibro: Object.values(resumenDeUso()).reduce((a, p) => a + p.usdPagado, 0),
      usdRealQueFacturaronLosProveedores: Number((r.proveedor * 0.0019).toFixed(6)),
      filasDelLibro: filasDelLibro().join(' · '), fallosDeSaludParaElProveedor: JSON.stringify(engine.health.snapshot()), falloInyectado: regla.disparado,
      nota: 'Evidencia para la tarea D (M-01): aquí solo se mide la exposición; el arreglo es suyo.',
    });
  }
}

/* ═══ RB · el proceso muere a mitad de un trabajo ya reservado ═══ */
{
  nuevoMundo();
  simularProveedoresDeCreador(E, { tiempos: CERO });
  /* El segundo paso (las imágenes) NUNCA contesta: es lo que ve el resto del mundo cuando el proceso muere. */
  E.simular('gemini', async (req) => {
    if (req.capability.startsWith('image.')) return new Promise(() => {});
    return { output: { kind: 'text', content: texto(900) }, usage: { inputTokens: 700, outputTokens: 220 }, costUSD: 0.0013, latencyMs: 0, model: req.model.id };
  });
  E.simular('flux', async () => new Promise(() => {}));
  const jobId = 'trabajoRB0000001';
  await E.preparar(() => sembrarTrabajo(E, { uid, experiencia: 'design', jobId }));
  const antes = acumulados(E);
  let creatorRun;
  await E.preparar(async () => {
    creatorRun = creator.creatorRun.run({ auth: { uid }, data: { jobId, locale: 'es' } });
    creatorRun.catch(() => {});
    await reloj.dormir(5_000);
  });
  const trabajo = banco.leer(`creatorJobs/${jobId}`);
  const tx = banco.leer(`creditTransactions/usage_${jobId}`);
  const libro = leerLibro(E, { uid, jobId, antes });
  const queda = {
    trabajo: trabajo.status, creditosRetenidos: tx?.status === 'AUTHORIZED' ? tx.authorizedAmount : 0, estadoDeLaReserva: tx?.status,
    filasDelLibro: filasDelLibro().join(' · '), usdPagadoYaSegunElLibro: Object.values(resumenDeUso()).reduce((a, p) => a + p.usdPagado, 0),
    creditsChargedEnLasFilas: libro.sumaCreditsChargedFilas,
  };
  /* ¿Quién lo cierra? Se pasa el BARRIDO REAL de liquidación (el único programado) pasado el plazo del trabajo. */
  E.reloj.adelantar(900_000 - 45_000 - 5_000 + 1_000);
  const rt = lib('runtime/index.js');
  const barrido = await E.medir(() => rt.barridoDeLiquidacionDeWee({ db: banco })());
  const trasElBarrido = banco.leer(`creditTransactions/usage_${jobId}`);
  const reintento = await E.medir(() => creator.creatorRun.run({ auth: { uid }, data: { jobId, locale: 'es' } }));
  const trasReintento = banco.leer(`creditTransactions/usage_${jobId}`);
  casos.push({
    caso: 'RB · el proceso muere con el segundo paso en vuelo (reserva ya hecha)',
    resultadoParaQuienLlama: 'la llamada nunca contesta (el cliente espera hasta su tiempo límite de 15 min)', ...queda,
    tras_una_pasada_del_barrido_real: `la reserva sigue ${trasElBarrido?.status} (informe del barrido: ${JSON.stringify(barrido.valor ?? String(barrido.error?.message))})`,
    cuantoTardaEnCerrarseSolo: 'no se cierra sola: el barrido programado mira los trabajos del Core (`jobs/`), no `creatorJobs`; `liquidacionPendiente` solo se escribe (nadie la lee)',
    sillamaLaPersonaDespuesDelPlazo: reintento.error ? `error ${reintento.error.code}: ${String(reintento.error.message).slice(0, 70)}` : 'ok',
    estadoTrasElReintento: trasReintento?.status, rpcDelReintento: reintento.resumen.rpc,
    nota: 'La reserva se devuelve solo cuando la persona vuelve a pedir ese mismo trabajo pasado su plazo (creator/index.ts:580-590). Lo que el proveedor ya cobró del paso 1 no vuelve.',
  });
}

/* ═══ RC · un paso barato y propenso a fallar detrás de uno caro ═══ */
{
  for (const [titulo, voiceFirst] of [['RC1 · Weë Studio: clip (caro) ANTES que voz (barata); la voz falla', false], ['RC2 · el mismo trabajo con la voz ANTES que el clip; la voz falla', true]]) {
    nuevoMundo();
    simularProveedoresDeCreador(E, { tiempos: CERO });
    /* El clip cuesta lo que cuesta el vídeo de la cotización; la voz falla con un error final del proveedor. */
    const base = E.ADAPTERS.seedance.run;
    E.simular('elevenlabs', async () => { throw new ProviderError('elevenlabs respondió 400: voz no disponible', 'elevenlabs', 400, false); });
    void base;
    const jobId = voiceFirst ? 'trabajoRC2000001' : 'trabajoRC1000001';
    await E.preparar(() => sembrarTrabajo(E, { uid, experiencia: 'studio', jobId }));
    if (voiceFirst) {
      const job = banco.leer(`creatorJobs/${jobId}`);
      const voz = job.steps.find((s) => s.capability === 'voice.tts');
      job.steps = [job.steps[0], voz, ...job.steps.filter((s) => s !== job.steps[0] && s !== voz)];
      banco.sembrar(`creatorJobs/${jobId}`, job);
    }
    const antes = acumulados(E);
    const r = await E.medir(() => creator.creatorRun.run({ auth: { uid }, data: { jobId, locale: 'es' } }));
    const tx = banco.leer(`creditTransactions/usage_${jobId}`);
    const libro = leerLibro(E, { uid, jobId, antes });
    casos.push({
      caso: titulo, resultadoParaQuienLlama: r.error ? `ERROR (${String(r.error.message).slice(0, 50)})` : 'ok',
      creditosDevueltos: tx?.status === 'REFUNDED' ? tx.authorizedAmount : 0, llamadasAlProveedor: r.proveedor,
      usdYaPagadoAlProveedorSegunElLibro: libro.sumaProviderCost, filasDelLibro: filasDelLibro().join(' · '),
      materialesCreadosEnLaCuenta: banco.hijos('assets').length,
      nota: 'La voz depende solo del guion, igual que el clip: el orden lo fija el plan (templates.ts:663-664). Frecuencia de fallos de voz: desconocida [D].',
    });
  }
}

/* ═══ RD · el cupo diario no se devuelve cuando el trabajo falla ═══ */
{
  nuevoMundo();
  simularProveedoresDeCreador(E, { tiempos: CERO });
  E.simular('flux', async () => { throw new ProviderError('flux respondió 500: error interno', 'flux', 500, true); });
  E.simular('gemini', async (req) => {
    if (req.capability.startsWith('image.')) throw new ProviderError('gemini respondió 500: error interno', 'gemini', 500, true);
    return { output: { kind: 'text', content: texto(900) }, usage: { inputTokens: 700, outputTokens: 220 }, costUSD: 0.0013, latencyMs: 0, model: req.model.id };
  });
  E.simular('seedream', async () => { throw new ProviderError('seedream respondió 500: error interno', 'seedream', 500, true); });
  const dia = new Date(E.reloj.epoch + E.reloj.ahora).toISOString().slice(0, 10);
  const cupo = () => banco.leer(`aiRateLimits/${uid}_${dia}`) ?? {};
  const antesCupo = { text: cupo().text ?? 0, image: cupo().image ?? 0 };
  const jobId = 'trabajoRD0000001';
  await E.preparar(() => sembrarTrabajo(E, { uid, experiencia: 'design', jobId }));
  const r = await E.medir(() => creator.creatorRun.run({ auth: { uid }, data: { jobId, locale: 'es' } }));
  const tx = banco.leer(`creditTransactions/usage_${jobId}`);
  casos.push({
    caso: 'RD · Weë Design: el paso de imágenes falla en los tres proveedores; se reembolsa entero',
    resultadoParaQuienLlama: r.error ? `ERROR (${String(r.error.message).slice(0, 50)})` : 'ok', creditosDevueltos: tx?.status === 'REFUNDED' ? tx.authorizedAmount : 0,
    cupoAntes: JSON.stringify(antesCupo), cupoDespues: JSON.stringify({ text: cupo().text ?? 0, image: cupo().image ?? 0 }),
    intentosFallidosEnElLibro: filasDelLibro().join(' · '), saludDelCortacircuitos: JSON.stringify(engine.health.snapshot()),
    nota: 'El cupo se reserva sin nombre de operación (creator/index.ts:612), así que no hay forma de devolverlo: 80 imágenes/día por persona se gastan también con fallos.',
  });
}

/* ═══ RE · fallo del proveedor tras recibir la tarea ═══ */
{
  for (const [titulo, configurados] of [['RE1 · texto: gemini falla tras recibir la petición y claude contesta', ['gemini', 'claude']], ['RE2 · texto: gemini falla tras recibir la petición y no hay más proveedores', ['gemini']]]) {
    nuevoMundo();
    for (const id of ['gemini', 'claude', 'openai']) E.simular(id, id === 'gemini' ? async () => { throw new ProviderError('gemini: tardó más de 90 s', 'gemini', 504, true); } : textoOk(0.0019), { configurado: configurados.includes(id) });
    await E.preparar(() => engine.generate({ capability: 'text.generate', input: { prompt: 'calentamiento' }, userId: uid, jobId: 'calentamiento0001', stepId: 's1', requestId: 'calentamiento0001:s1' }).catch(() => undefined));
    banco.docs.forEach((_, p) => { if (p.startsWith('aiGenerations/') || p.startsWith('aiUsage/')) banco.docs.delete(p); });
    E.llamadasDeProveedor.length = 0;
    const r = await E.medir(() => engine.generate({ capability: 'text.generate', input: { prompt: 'Una receta sencilla' }, userId: uid, jobId: 'trabajoRE0000001', stepId: 's1', requestId: 'trabajoRE0000001:s1' }));
    casos.push({
      caso: titulo, resultadoParaQuienLlama: r.error ? `ERROR (${String(r.error.code ?? r.error.message).slice(0, 40)})` : `OK (${r.valor.provider})`,
      llamadasAlProveedor: r.proveedor, porProveedor: JSON.stringify(resumenDeUso()), filasDelLibro: filasDelLibro().join(' · '),
      nota: 'usdEnRiesgo = coste ESTIMADO de un fallo que llegó al proveedor (H0 #22): no es dinero medido.',
    });
  }
}
E.restaurar();

const md = [];
md.push('# 08 · Riesgos de coste: reintentos, trabajos abandonados y resultados descartados\n');
md.push('Medido con `scripts/bench-r7/08-riesgos-de-coste.mjs`, ejecutando el código real con fallos inyectados. Lo «estimado» (coste en riesgo) está marcado como tal.\n');
for (const c of casos) {
  md.push(`\n### ${c.caso}\n`);
  md.push(tabla(['Campo', 'Valor'], Object.entries(c).filter(([k]) => k !== 'caso').map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v])));
}
const dir = guardar('08-riesgos-de-coste', { casos }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
