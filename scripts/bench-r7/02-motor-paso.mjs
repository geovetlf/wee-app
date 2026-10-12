#!/usr/bin/env node
/**
 * 02 · UN PASO DEL WEË AI ENGINE (`engine.generate`) — qué hace el Router por cada generación.
 *
 * Ejecuta el motor REAL (`functions/lib/engine`): configuración viva, Router, libro de generaciones
 * (`ledger.open` / `close` / `progress`), ascenso del proveedor a «verificado» (`recordRealSuccess`) y el
 * `record` opcional del llamador. El proveedor es un doble con retardo virtual.
 *
 * Qué responde: ¿cuántas RPC y cuántas rondas en serie le añade el motor a CADA generación, sin contar lo
 * que haga quien lo llama (reserva de Credits, cupos…)? Es la base de la propuesta O2 de la auditoría D
 * («`ledger.close` sin `get`», «`ensureAccount` memoizado», «memo de `imageDimensions`»).
 *
 *     node scripts/bench-r7/02-motor-paso.mjs
 */
import { prepararEntorno, lib, UID, texto, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';

const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 } });
const { reloj, banco } = E;
const { engine } = lib('engine/index.js');
const { usageTransactionId } = lib('credits/creditTransactions.js');

E.simular('gemini', async (req) => {
  await reloj.dormir(0);
  if (req.capability.startsWith('image.')) {
    const n = Number(req.input.count ?? 1);
    return { output: { kind: 'image', urls: Array.from({ length: n }, (_, i) => `https://firebasestorage.googleapis.com/v0/b/demo-wee.firebasestorage.app/o/users%2F${UID(1)}%2Fai-generations%2F${i}.png?alt=media&token=t${i}`), url: undefined }, usage: {}, costUSD: 0.067 * n, latencyMs: 0, model: req.model.id, meta: { width: 1024, height: 1024 } };
  }
  return { output: { kind: 'text', content: texto(900) }, usage: { inputTokens: 700, outputTokens: 220 }, costUSD: 0.0019, latencyMs: 0, model: req.model.id };
});
E.simular('flux', async (req) => {
  const n = Number(req.input.count ?? 1);
  return { output: { kind: 'image', urls: Array.from({ length: n }, (_, i) => `https://firebasestorage.googleapis.com/v0/b/demo-wee.firebasestorage.app/o/users%2F${UID(1)}%2Fai-generations%2Ff${i}.png?alt=media&token=t${i}`) }, usage: {}, costUSD: 0.015 * n, latencyMs: 0, model: req.model.id, meta: { width: 1024, height: 1024 } };
});

const uid = UID(1);
const filas = [];

const caso = async (nombre, { caliente = true, pedir }) => {
  E.reiniciarBase();
  E.enfriarCaches();
  E.sembrarCuenta(uid, 240);
  if (caliente) {
    const w = await E.medir(() => pedir('calentamiento'));
    if (w.error) throw new Error(`${nombre}: el calentamiento falló: ${w.error.message}`);
    for (const p of [...banco.docs.keys()].filter((q) => q.startsWith('aiGenerations/') || q.startsWith('creatorUsage/'))) banco.docs.delete(p);
    E.llamadasDeProveedor.length = 0;
  }
  const m = await E.medir(() => pedir('medida'));
  filas.push({
    nombre, ok: !m.error, error: m.error ? String(m.error.message).slice(0, 100) : undefined,
    rpc: m.resumen.rpc, rondas: m.virtualMs, porTipo: m.resumen.porTipo, lecturas: m.resumen.lecturas, escrituras: m.resumen.escrituras,
    docs: Object.entries(m.resumen.porDocumento).map(([p, v]) => `${p.replace(/\d{4}-\d{2}-\d{2}/, '{día}').replace(/auto\d+/, 'auto…')}: ${v.lecturas}L/${v.escrituras}E`),
    lineasDeTiempo: m.entradas.map((e) => `${e.desde - m.entradas[0].desde}:${e.tipo}:${(e.lee ?? []).concat(e.escribe ?? []).join(',') || e.consulta || ''}`.replace(/auto\d+/g, 'auto…')),
  });
  return m;
};

const base = (fase, extra = {}) => ({
  userId: uid, jobId: `trabajo${fase}0001`, stepId: 's1', experienceId: 'chef', goal: 'una receta', requestId: `trabajo${fase}0001:s1`, ...extra,
});

await caso('E1 · texto (text.generate), sin cobro ni `record` (paso interno)', {
  pedir: (fase) => engine.generate({ capability: 'text.generate', input: { prompt: 'Una receta sencilla', quality: 'standard' }, ...base(fase) }),
});
await caso('E2 · texto con servicio y transacción de Credits (lo que manda creatorRun)', {
  pedir: (fase) => engine.generate({ capability: 'text.generate', input: { prompt: 'Una receta sencilla' }, ...base(fase), service: 'ai_text', creditTransactionId: usageTransactionId(`trabajo${fase}0001`) }),
});
await caso('E3 · texto + `record` (dos escrituras: coste del trabajo y creatorUsage/{día})', {
  pedir: (fase) => engine.generate({
    capability: 'text.generate', input: { prompt: 'Una receta sencilla' }, ...base(fase), service: 'ai_text', creditTransactionId: usageTransactionId(`trabajo${fase}0001`),
    record: async (entry) => {
      await Promise.all([
        banco.doc(`creatorJobs/trabajo${fase}0001/private/costs`).set({ totalUSD: lib('engine/ledger.js') && 1 }, { merge: true }),
        banco.doc(`creatorUsage/${new Date().toISOString().slice(0, 10)}`).set({ [entry.capability]: { [entry.provider]: { calls: 1 } } }, { merge: true }),
      ]);
    },
  }),
});
await caso('E4 · imagen, 3 propuestas, con servicio', {
  pedir: (fase) => engine.generate({
    capability: 'image.generate', input: { prompt: 'Un logo', count: 3, quality: 'standard', kind: 'logo' }, ...base(fase), experienceId: 'design',
    prefs: { allowedProviders: ['flux'], modelId: 'flux-2-klein-9b' }, service: 'ai_image_lite', creditTransactionId: usageTransactionId(`trabajo${fase}0001`),
  }),
});
await caso('E5 · texto, primera generación tras 60 s de silencio (config + uso del día sin caché)', {
  caliente: false,
  pedir: (fase) => engine.generate({ capability: 'text.generate', input: { prompt: 'Una receta sencilla' }, ...base(fase), service: 'ai_text', creditTransactionId: usageTransactionId(`trabajo${fase}0001`) }),
});
{
  /* Solo decidir (`route`): lo que hacen las cotizaciones en modo real. Con cachés calientes no debe leer nada. */
  E.reiniciarBase();
  E.enfriarCaches();
  await E.medir(() => engine.route({ capability: 'text.generate', input: { prompt: 'x' }, userId: uid }));
  const m = await E.medir(() => engine.route({ capability: 'text.generate', input: { prompt: 'x' }, userId: uid }));
  filas.push({ nombre: 'E6 · engine.route (solo decidir) con cachés calientes', ok: !m.error, rpc: m.resumen.rpc, rondas: m.virtualMs, porTipo: m.resumen.porTipo, lecturas: m.resumen.lecturas, escrituras: m.resumen.escrituras, docs: [], lineasDeTiempo: [] });
}

E.restaurar();

const md = [];
md.push('# 02 · Un paso del WEË AI ENGINE sobre el código real\n');
md.push('Medido con `scripts/bench-r7/02-motor-paso.mjs`. RPC y rondas como en 01; el proveedor es un doble con 0 ms virtuales.\n');
md.push(tabla(['Caso', 'RPC', 'Rondas', 'Lect.', 'Escr.', 'Por tipo'], filas.map((f) => [f.nombre + (f.ok ? '' : ` — FALLÓ: ${f.error}`), f.rpc, f.rondas, f.lecturas, f.escrituras, JSON.stringify(f.porTipo)])));
for (const f of filas.slice(0, 5)) {
  md.push(`\n### ${f.nombre}\n`);
  md.push('Documentos tocados: ' + f.docs.join(' · '));
  md.push('\nSecuencia (ronda:tipo:documento):\n```\n' + f.lineasDeTiempo.join('\n') + '\n```');
}
const dir = guardar('02-motor-paso', { filas }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
