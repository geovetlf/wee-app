#!/usr/bin/env node
/**
 * 15a · EL ESCENARIO FIJO con el que se compara una variante del `lib` con la base (lo lanza `15-prototipos-efecto.mjs`).
 *
 * Una secuencia determinista de peticiones REALES —Weë Brain (mensajes de un bloque de doce, un cobro, una repetición, una
 * búsqueda, una cotización) y Weë AI (planificar, cotizar y crear tres trabajos)— contra el Firestore doble que cuenta. Escribe en la salida
 * estándar UN JSON con, por petición, RPC y rondas y lo que devolvió, y al final TODOS los documentos que quedaron,
 * normalizados (marcas de tiempo, ids automáticos y relojes fuera) para poder compararlos entre variantes.
 *
 *     BENCH_R7_LIB=<carpeta de un lib> node scripts/bench-r7/15a-escenario-de-equivalencia.mjs
 */
import { prepararEntorno, lib, UID, texto } from './banco/entorno.mjs';
import { simularProveedoresDeCreador, sembrarTrabajo, TIEMPOS } from './banco/creador.mjs';

const CERO = Object.fromEntries(Object.keys(TIEMPOS).map((k) => [k, 0]));
const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 } });
const { banco, Timestamp } = E;
const brain = lib('creator/brain.js');
const creator = lib('creator/index.js');
simularProveedoresDeCreador(E, { tiempos: CERO });
E.simular('deepseek', async (req) => ({ output: { kind: 'text', content: texto(700) }, usage: { inputTokens: 800, outputTokens: 175 }, costUSD: 0.0002, latencyMs: 0, model: req.model.id }));
const uid = UID(1);
E.sembrarCuenta(uid, 5000);
const ts = (i) => Timestamp.fromMillis(Date.UTC(2026, 9, 11, 11, 0, 0) + i * 60_000);
const chatId = 'chatDePrueba000001';
banco.sembrar(`brainChats/${chatId}`, { userId: uid, title: 'x', messageCount: 4, createdAt: ts(0), updatedAt: ts(4) });
for (let i = 0; i < 4; i++) banco.sembrar(`brainChats/${chatId}/messages/h${i}`, { role: i % 2 ? 'wee' : 'user', text: texto(200), createdAt: ts(i + 1) });
banco.sembrar(`brainUsage/${uid}`, { bloque: 9, respuestasTotales: 9, actualizadoEn: ts(0) });

/* Calentamiento (cachés), con efectos que se descuentan: se mide solo lo que viene después. */
await E.preparar(() => brain.brainQuote.run({ auth: { uid }, data: { chatId, message: 'calentando', locale: 'es' } }));
await E.preparar(() => creator.creatorQuote.run({ auth: { uid }, data: { jobId: 'noexiste0000000000', quality: 'high' } }).catch(() => undefined));

const pasos = [];
/* Lo que cambia de un proceso a otro sin que signifique nada: ids automáticos, ids de material y de ejecución al azar, relojes. */
const sinAzar = (t) => t.replace(/auto\d+/g, 'auto#').replace(/asset_[0-9a-f]{32}/g, 'asset_#').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'uuid#').replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, 'ISO');
const normalizar = (v) => {
  if (v === null || v === undefined) return v;
  if (typeof v === 'number') return v > 1e12 ? 'EPOCH' : v;
  if (typeof v === 'string') return sinAzar(v);
  if (Array.isArray(v)) return v.map(normalizar);
  if (typeof v === 'object') {
    if (typeof v.toMillis === 'function') return 'TS';
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [sinAzar(k), normalizar(x)]));
  }
  return v;
};
const paso = async (nombre, fn) => {
  const m = await E.medir(fn);
  pasos.push({ nombre, ok: !m.error, error: m.error ? String(m.error.message).slice(0, 100) : undefined, rpc: m.resumen.rpc, rondas: m.virtualMs, lecturas: m.resumen.lecturas, escrituras: m.resumen.escrituras, retorno: normalizar(m.valor ?? null) });
  return m;
};
const hablar = (id, extra = {}) => brain.brainChat.run({ auth: { uid }, data: { chatId, message: 'Cuéntame más sobre mi proyecto', messageId: id, locale: 'es', ...extra } });

/* El bloque parte de 9/12: los mensajes 1 y 2 ocupan los puestos 10 y 11, el 3 es la respuesta 12 (cobra) y el 4 y el 5 abren el bloque siguiente. */
const ROTULO = ['puesto 10', 'puesto 11', 'puesto 12: cobra 1 Credit', 'puesto 1 del bloque nuevo', 'puesto 2'];
for (let i = 1; i <= 5; i++) await paso(`brain · mensaje ${i} (${ROTULO[i - 1]})`, () => hablar(`m_escenario_${i}`));
await paso('brain · repetición del mensaje 2 (ya contestado)', () => hablar('m_escenario_2'));
await paso('brain · búsqueda con fuentes', () => hablar('m_escenario_busca', { webSearch: true }));
await paso('brain · brainQuote', () => brain.brainQuote.run({ auth: { uid }, data: { chatId, message: 'Cuéntame más', locale: 'es' } }));
await paso('brain · conversación nueva, primer mensaje', () => brain.brainChat.run({ auth: { uid }, data: { message: 'Hola Weë', messageId: 'm_escenario_nuevo', locale: 'es' } }));
await paso('brain · conversación ajena (debe rechazarse)', () => brain.brainChat.run({ auth: { uid }, data: { chatId: 'chatQueNoExiste000', message: 'hola', messageId: 'm_escenario_ajeno', locale: 'es' } }));

const { TEMPLATES } = lib('creator/templates.js');
const presets = TEMPLATES.writer.questions.map((q) => ({ questionId: q.id, optionId: (q.options.find((o) => o.id !== 'idk') ?? q.options[0])?.id }));
await paso('creatorChat · plan en una llamada (writer)', () => creator.creatorChat.run({ auth: { uid }, data: { experienceId: 'writer', goal: TEMPLATES.writer.defaultGoal, presetAnswers: presets, locale: 'es' } }));
for (const exp of ['design', 'studio', 'writer']) {
  await E.preparar(() => sembrarTrabajo(E, { uid, experiencia: exp, jobId: `trabajoEscenario${exp}01` }));
  await paso(`creatorRun · ${exp}`, () => creator.creatorRun.run({ auth: { uid }, data: { jobId: `trabajoEscenario${exp}01`, locale: 'es' } }));
}

/* Estado final: todos los documentos, normalizados. */
const estado = {};
const fichasDeMaterial = [];
for (const [p, d] of [...banco.docs].sort(([a], [b]) => (a < b ? -1 : 1))) {
  /* Los ids de material son al azar: sus fichas se comparan como CONJUNTO (ordenadas por contenido), no por nombre. */
  if (/^assets\/asset_[0-9a-f]{32}$/.test(p)) fichasDeMaterial.push(JSON.stringify(normalizar(d.datos)));
  else estado[sinAzar(p)] = normalizar(d.datos);
}
estado['assets/(conjunto)'] = fichasDeMaterial.sort();
const verificacion = Object.fromEntries(Object.entries(estado).filter(([p]) => p.startsWith('aiProviderVerification/')));
for (const p of Object.keys(verificacion)) delete estado[p];
E.restaurar();
process.stdout.write(`\n@@RESULTADO@@${JSON.stringify({ pasos, estado, verificacion })}\n`);
process.exit(0);
