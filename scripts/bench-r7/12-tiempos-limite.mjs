#!/usr/bin/env node
/**
 * 12 · TIEMPOS LÍMITE Y CORTACIRCUITOS — qué pasa cuando un proveedor se cuelga.
 *
 * Ejecuta el Router REAL (`engine.generate`) con un proveedor que NUNCA contesta, en tiempo virtual:
 *
 *   T1 · la cadena de texto `gemini → claude`: cuánto pasa hasta que contesta el segundo (el plazo de texto del motor es de 90 s)
 *        frente al tiempo límite de cada Function que la usa (`creatorChat` 60 s, `brainChat` 120 s…).
 *   T2 · el cortacircuitos (3 fallos en 10 min → pausa de 5 min, EN MEMORIA DE CADA INSTANCIA): llegan peticiones cada 5 s a una
 *        instancia con un proveedor colgado y sin alternativa; cuánto espera cada una.
 *
 * Lo que se MIDE es el comportamiento del código con los plazos que declara; que el proveedor real se cuelgue, con qué frecuencia y
 * cuánto es DESCONOCIDO [D]. Los tiempos límite de las Functions salen de `functions/lib` (script 09).
 *
 *     node scripts/bench-r7/12-tiempos-limite.mjs
 */
import { prepararEntorno, lib, UID, texto, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';

const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 } });
const { reloj, banco } = E;
const { engine } = lib('engine/index.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const uid = UID(1);
const colgado = () => new Promise(() => {});
const bien = (ms = 2_000) => async (req) => {
  await reloj.dormir(ms);
  return { output: { kind: 'text', content: texto(400) }, usage: { inputTokens: 500, outputTokens: 100 }, costUSD: 0.001, latencyMs: ms, model: req.model.id };
};
const pedir = (extra = {}) => engine.generate({ capability: 'text.generate', input: { prompt: 'Una receta sencilla' }, userId: uid, jobId: 'trabajoDeTiempo01', stepId: 's1', requestId: `trabajoDeTiempo01:s${++serie}`, ...extra });
let serie = 0;

/* ── T1 ── */
E.reiniciarBase(); E.enfriarCaches(); E.sembrarCuenta(uid, 5000);
E.simular('gemini', colgado);
E.simular('claude', bien(2_000));
E.simular('openai', bien(2_000), { configurado: false });
await E.preparar(() => engine.generate({ capability: 'text.generate', input: { prompt: 'calentamiento' }, userId: uid, jobId: 'calentamiento0001', stepId: 's1', requestId: 'calentamiento0001:s1', prefs: { allowedProviders: ['claude'] } }));
const t1 = await E.medir(() => pedir());
const textoMs = DEFAULT_SETTINGS.timeoutsMs.text;

/* ── T2 ── */
E.reiniciarBase(); E.enfriarCaches(); E.sembrarCuenta(uid, 5000);
E.simular('gemini', colgado);
E.simular('claude', bien(2_000), { configurado: false });
E.simular('openai', bien(2_000), { configurado: false });
const llegadas = Array.from({ length: 24 }, (_, i) => i * 5_000);
const t2 = await E.medir(() => Promise.all(llegadas.map(async (llega, i) => {
  await reloj.dormir(llega);
  const inicio = reloj.ahora;
  try {
    await pedir({ requestId: `trabajoDeTiempo02:s${i}` });
    return { i, llega, esperaMs: reloj.ahora - inicio, resultado: 'ok' };
  } catch (error) {
    return { i, llega, esperaMs: reloj.ahora - inicio, resultado: String(error.code ?? error.message).slice(0, 40) };
  }
})));
const esperas = t2.valor;
E.restaurar();

/* Solo las que llaman al Router de texto: `brainQuote` y `creatorQuote` cotizan sin llamar a ningún proveedor. `creatorRun` acota cada paso con su `deadlineAt`. */
const funciones = [
  ['creatorChat (planificador LLM de texto; sin `deadlineAt`)', 60, true], ['brainChat (DeepSeek fijado: no hay segundo candidato)', 120, false],
];
const md = [];
md.push('# 12 · Tiempos límite y cortacircuitos con un proveedor colgado\n');
md.push('Medido con `scripts/bench-r7/12-tiempos-limite.mjs` (Router real, tiempo virtual). Que un proveedor se cuelgue es un supuesto de la prueba, no un dato.\n');
md.push('## T1 · cadena `gemini → claude` con gemini colgado\n');
md.push(`Plazo de texto del motor (\`DEFAULT_SETTINGS.timeoutsMs.text\`): **${textoMs / 1000} s**. Tiempo hasta que contesta claude: **${(t1.virtualMs / 1000).toFixed(1)} s** (resultado: ${t1.error ? 'ERROR ' + t1.error.message : 'ok, ' + t1.valor.provider + ' en el intento ' + t1.valor.attempts}).\n`);
md.push(tabla(['Function que usa el Router de texto', 'Tiempo límite de la Function', '¿Llega a la alternativa?'], funciones.map(([n, s, hayAlternativa]) => [n, `${s} s`, !hayAlternativa ? `no aplica: un solo candidato; el fallo llega a los ${textoMs / 1000} s, dentro de los ${s} s, y se reembolsa` : t1.virtualMs / 1000 <= s ? 'sí' : `NO: la Function muere a los ${s} s, antes de que venza el plazo de ${textoMs / 1000} s del primer proveedor`])));
md.push('\n## T2 · una instancia, proveedor colgado y sin alternativa, una petición cada 5 s\n');
md.push(tabla(['Petición', 'Llega (s)', 'Espera (s)', 'Resultado'], esperas.map((e) => [e.i, (e.llega / 1000).toFixed(0), (e.esperaMs / 1000).toFixed(1), e.resultado])));
const rapidas = esperas.filter((e) => e.esperaMs < 1000);
md.push(`\nPeticiones que esperaron el plazo entero: ${esperas.filter((e) => e.esperaMs >= textoMs - 1).length}; atendidas al instante por el cortacircuitos abierto: ${rapidas.length}. El cortacircuitos (\`settings.circuitBreaker\` = ${JSON.stringify(DEFAULT_SETTINGS.circuitBreaker)}) vive en la memoria de CADA instancia.`);
const dir = guardar('12-tiempos-limite', { textoMs, t1: { virtualMs: t1.virtualMs, ok: !t1.error }, funciones, esperas }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
