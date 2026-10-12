#!/usr/bin/env node
/**
 * 11 · CPU DE JAVASCRIPT POR PETICIÓN — ¿es la CPU un cuello de botella del código?
 *
 * Ejecuta cada manejador REAL muchas veces seguidas contra el Firestore doble SIN latencia y mide el tiempo de CPU del
 * proceso por llamada (CPU de usuario + sistema de Node; la resolución de Windows es de ~16 ms, por eso se promedia sobre
 * cientos de llamadas). Incluye la CPU del propio doble de Firestore (copias de documentos, filtros), así que es una COTA
 * SUPERIOR de lo que gasta el código de Weë, medida en esta máquina con el JIT ya caliente.
 *
 * Qué NO es: no es la CPU de una Cloud Function (otra máquina, otro reparto de CPU, frío sin JIT). Si una instancia tuviera
 * una fracción f de núcleo, el tiempo de CPU se estira ≈ 1/f [E]; ese factor se muestra como aritmética, no como medida.
 *
 *     node scripts/bench-r7/11-cpu.mjs
 */
import { prepararEntorno, lib, UID, texto, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';
import { simularProveedoresDeCreador, sembrarTrabajo, TIEMPOS } from './banco/creador.mjs';

const CERO = Object.fromEntries(Object.keys(TIEMPOS).map((k) => [k, 0]));
const E = prepararEntorno({ latencia: { get: 0, query: 0, write: 0, commit: 0 } });
const { banco, Timestamp } = E;
const brain = lib('creator/brain.js');
const creator = lib('creator/index.js');
simularProveedoresDeCreador(E, { tiempos: CERO });
E.simular('deepseek', async (req) => ({ output: { kind: 'text', content: texto(700) }, usage: { inputTokens: 800, outputTokens: 175 }, costUSD: 0.0002, latencyMs: 0, model: req.model.id }));
const uid = UID(1);
const ts = (i) => Timestamp.fromMillis(Date.UTC(2026, 9, 11, 11, 0, 0) + i * 60_000);

const filas = [];
const ITER = 300;
const bucle = async (nombre, preparar, ejecutar) => {
  E.reiniciarBase();
  E.enfriarCaches();
  E.sembrarCuenta(uid, 1_000_000);
  /* Los cupos diarios por persona (p. ej. 400 de texto) cortarían un bucle de cientos de llamadas: se suben por la vía normal, la configuración. */
  banco.sembrar('aiSettings/global', { limits: { perUserPerDay: { text: 1_000_000, vision: 1_000_000, image: 1_000_000, video: 1_000_000, voice: 1_000_000, doc: 1_000_000 } } });
  E.enfriarCaches();
  await E.preparar(() => preparar?.());
  /* Calentamiento del JIT y de las cachés. */
  for (let i = 0; i < 30; i++) await E.preparar(() => ejecutar(`w${i}`));
  const cpu0 = process.cpuUsage();
  const t0 = performance.now();
  for (let i = 0; i < ITER; i++) await E.preparar(() => ejecutar(`m${i}`));
  const cpu = process.cpuUsage(cpu0);
  const ms = performance.now() - t0;
  filas.push({ nombre, iteraciones: ITER, cpuMsPorLlamada: Number(((cpu.user + cpu.system) / 1000 / ITER).toFixed(2)), paredMsPorLlamada: Number((ms / ITER).toFixed(2)) });
};

await bucle('brainChat (historial de 4 turnos; sin cobro)',
  () => {
    banco.sembrar('brainChats/chatDePrueba000001', { userId: uid, title: 'x', messageCount: 4, createdAt: ts(0), updatedAt: ts(4) });
    for (let i = 0; i < 4; i++) banco.sembrar(`brainChats/chatDePrueba000001/messages/h${i}`, { role: i % 2 ? 'wee' : 'user', text: texto(300), createdAt: ts(i + 1) });
    banco.sembrar(`brainUsage/${uid}`, { bloque: 0, respuestasTotales: 0, actualizadoEn: ts(0) });
  },
  (id) => {
    /* El bloque se reinicia para no acabar cobrando: se mide el camino de 1–11. */
    banco.sembrar(`brainUsage/${uid}`, { bloque: 0, respuestasTotales: 0, actualizadoEn: ts(0) });
    return brain.brainChat.run({ auth: { uid }, data: { chatId: 'chatDePrueba000001', message: 'Cuéntame más sobre mi proyecto', messageId: `m_cpu_${id}`, locale: 'es' } });
  });
await bucle('brainQuote (20 turnos)',
  () => {
    banco.sembrar('brainChats/chatDePrueba000001', { userId: uid, title: 'x', messageCount: 20, createdAt: ts(0), updatedAt: ts(20) });
    for (let i = 0; i < 20; i++) banco.sembrar(`brainChats/chatDePrueba000001/messages/h${String(i).padStart(2, '0')}`, { role: i % 2 ? 'wee' : 'user', text: texto(600), createdAt: ts(i + 1) });
  },
  () => brain.brainQuote.run({ auth: { uid }, data: { chatId: 'chatDePrueba000001', message: 'Cuéntame más sobre mi proyecto', locale: 'es' } }));
await bucle('creatorQuote (design: 4 presupuestos de plan)',
  () => sembrarTrabajo(E, { uid, experiencia: 'design', jobId: 'cotizarCpu000001' }),
  (id) => creator.creatorQuote.run({ auth: { uid }, data: { jobId: 'cotizarCpu000001', quality: ['standard', 'high', 'max'][id.length % 3] } }));
await bucle('creatorChat (plan en una llamada, writer)',
  null,
  (id) => {
    const { TEMPLATES } = lib('creator/templates.js');
    const t = TEMPLATES.writer;
    const presets = t.questions.map((q) => ({ questionId: q.id, optionId: (q.options.find((o) => o.id !== 'idk') ?? q.options[0])?.id }));
    return creator.creatorChat.run({ auth: { uid }, data: { experienceId: 'writer', goal: t.defaultGoal, presetAnswers: presets, locale: 'es', _i: id } });
  });
{
  let n = 0;
  await bucle('creatorRun (writer: 2 pasos de texto)',
    null,
    async (id) => {
      const jobId = `cpuWriter${String(++n).padStart(9, '0')}`;
      await sembrarTrabajo(E, { uid, experiencia: 'writer', jobId });
      return creator.creatorRun.run({ auth: { uid }, data: { jobId, locale: 'es' } });
    });
}
{
  let n = 0;
  await bucle('creatorRun (design: texto + 3 imágenes)',
    null,
    async (id) => {
      const jobId = `cpuDesign${String(++n).padStart(9, '0')}`;
      await sembrarTrabajo(E, { uid, experiencia: 'design', jobId });
      return creator.creatorRun.run({ auth: { uid }, data: { jobId, locale: 'es' } });
    });
}
E.restaurar();

const md = [];
md.push('# 11 · CPU de JavaScript por petición (local, JIT caliente, con el doble de Firestore dentro)\n');
md.push(`Medido con \`scripts/bench-r7/11-cpu.mjs\`: ${ITER} llamadas por manejador tras 30 de calentamiento. Es una COTA SUPERIOR de la CPU del código de Weë (incluye la del doble). Las columnas «a 1/6 y 1/3 de núcleo» son aritmética [E], no medida.\n`);
md.push(tabla(['Manejador', 'CPU ms/llamada', 'Pared ms/llamada', 'CPU a 1/3 de núcleo [E]', 'CPU a 1/6 de núcleo [E]'], filas.map((f) => [f.nombre, f.cpuMsPorLlamada, f.paredMsPorLlamada, (f.cpuMsPorLlamada * 3).toFixed(1), (f.cpuMsPorLlamada * 6).toFixed(1)])));
const dir = guardar('11-cpu', { ITER, filas }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
