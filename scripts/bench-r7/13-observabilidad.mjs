#!/usr/bin/env node
/**
 * 13 · OBSERVABILIDAD DE LATENCIA Y FALLOS — qué deja escrito hoy una petición y qué no.
 *
 * Ejecuta un `brainChat` y un `creatorRun` reales y enseña, de lo que sale:
 *   · los CAMPOS de la fila del libro (`aiGenerations`), del trabajo (`creatorJobs`), de su coste privado y de los acumulados del día;
 *   · las LÍNEAS DE LOG que escribió la petición (cuántas, con qué datos);
 *   · y las MEDIDAS que NO existen en ninguno de los dos sitios (contra una lista de lo que haría falta para medir latencia y fallos).
 *
 * No añade nada: lee lo que el código ya escribe. Es la base de la propuesta M1 de la auditoría D («línea estructurada por fase»).
 *
 *     node scripts/bench-r7/13-observabilidad.mjs
 */
import { prepararEntorno, lib, UID, texto, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';
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
banco.sembrar('brainChats/chatDePrueba000001', { userId: uid, title: 'x', messageCount: 2, createdAt: ts(0), updatedAt: ts(2) });
banco.sembrar('brainChats/chatDePrueba000001/messages/h0', { role: 'user', text: 'hola', createdAt: ts(1) });
banco.sembrar('brainChats/chatDePrueba000001/messages/h0_wee', { role: 'wee', text: 'hola!', createdAt: ts(2) });
banco.sembrar(`brainUsage/${uid}`, { bloque: 3, respuestasTotales: 3, actualizadoEn: ts(0) });

await E.preparar(() => brain.brainChat.run({ auth: { uid }, data: { chatId: 'chatDePrueba000001', message: 'calentamiento', messageId: 'm_calentamiento', locale: 'es' } }));
const b = await E.medir(() => brain.brainChat.run({ auth: { uid }, data: { chatId: 'chatDePrueba000001', message: 'Cuéntame más', messageId: 'm_observa_1', locale: 'es' } }));
const fila = banco.hijos('aiGenerations').find((g) => g.requestId === 'brain_m_observa_1');

await E.preparar(() => sembrarTrabajo(E, { uid, experiencia: 'design', jobId: 'trabajoObserva0001' }));
const r = await E.medir(() => creator.creatorRun.run({ auth: { uid }, data: { jobId: 'trabajoObserva0001', locale: 'es' } }));
const trabajo = banco.leer('creatorJobs/trabajoObserva0001');
const costes = banco.leer('creatorJobs/trabajoObserva0001/private/costs');
const dia = new Date(E.reloj.epoch + E.reloj.ahora).toISOString().slice(0, 10);
const uso = banco.leer(`aiUsage/${dia}`);
const usoCreador = banco.leer(`creatorUsage/${dia}`);
E.restaurar();

const claves = (o) => Object.keys(o ?? {}).sort();
const forma = (o, prof = 0) => (o && typeof o === 'object' && !o.toMillis && prof < 2 ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, forma(v, prof + 1)])) : o && o.toMillis ? 'Timestamp' : typeof o);
const HACEN_FALTA = [
  ['Latencia TOTAL de la llamada (de que entra a que sale)', ['totalMs', 'latenciaTotalMs', 'callMs', 'elapsedMs']],
  ['Latencia por FASE (antes del proveedor / proveedor / después)', ['preMs', 'tPre', 'postMs', 'tPost', 'fases', 'phases']],
  ['Marca de arranque en frío de la instancia', ['cold', 'coldStart', 'frio']],
  ['Tiempo hasta el primer token (TTFT)', ['ttftMs', 'ttft', 'timeToFirstToken']],
  ['Tokens de entrada que el proveedor sirvió DESDE CACHÉ', ['cachedTokens', 'cacheHitTokens', 'prompt_cache_hit_tokens', 'tokensEnCache']],
  ['Coste por EXPERIENCIA en el acumulado diario (aiUsage solo reparte por capacidad×proveedor)', ['porExperiencia', 'byExperience']],
  ['Experiencia en cada fila del libro (permite un informe por experiencia sobre `aiGenerations`)', ['experienceId']],
  ['Número del intento en cada fila (candidatos probados)', ['attempts', 'attempt']],
  ['Instancia / revisión que atendió', ['instanceId', 'revision', 'k_revision']],
];
const todasLasClaves = new Set([...claves(fila), ...claves(trabajo), ...claves(costes), ...claves(uso), ...claves(usoCreador)]);
const tabFalta = HACEN_FALTA.map(([que, nombres]) => [que, nombres.some((n) => todasLasClaves.has(n)) ? 'está' : 'FALTA']);

const md = [];
md.push('# 13 · Observabilidad: qué escribe hoy una petición\n');
md.push('Medido con `scripts/bench-r7/13-observabilidad.mjs`. Se leen los documentos que quedan tras un `brainChat` y un `creatorRun` reales.\n');
md.push('## Campos de la fila del libro `aiGenerations` (un mensaje de Weë Brain)\n```\n' + claves(fila).join(', ') + '\n```');
md.push('\n## Campos de `creatorJobs/{id}` tras un trabajo\n```\n' + claves(trabajo).join(', ') + '\n```');
md.push('\n## `creatorJobs/{id}/private/costs`\n```\n' + JSON.stringify({ campos: claves(costes), entradasPorPaso: Object.keys(costes?.entries?.[0] ?? {}) }, null, 1) + '\n```');
md.push('\n## Forma de `aiUsage/{día}` y de `creatorUsage/{día}`\n```\n' + JSON.stringify({ aiUsage: forma(uso), creatorUsage: forma(usoCreador) }, null, 1).slice(0, 1800) + '\n```');
md.push('\n## Líneas de log que escribió UNA petición\n');
md.push(`brainChat: ${b.lineasDeLog.length} líneas · creatorRun (design): ${r.lineasDeLog.length} líneas.\n`);
md.push('```\n' + [...b.lineasDeLog, ...r.lineasDeLog].map((l) => `[${l.nivel}] ${l.texto.replace(/auto\d+/g, 'auto…')}`).join('\n') + '\n```');
md.push('\n## Lo que haría falta para medir latencia y fallos, frente a lo que existe\n');
md.push(tabla(['Medida', 'Estado'], tabFalta));
const dir = guardar('13-observabilidad', { camposFila: claves(fila), camposTrabajo: claves(trabajo), camposCostes: claves(costes), faltan: tabFalta.filter(([, e]) => e === 'FALTA').map(([q]) => q), logs: { brainChat: b.lineasDeLog.length, creatorRun: r.lineasDeLog.length } }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
