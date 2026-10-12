#!/usr/bin/env node
/**
 * 04 · `creatorQuote` y `creatorChat` SOBRE EL CÓDIGO REAL — lo que cuesta cotizar y planear.
 *
 * Son las dos llamadas que la app hace ANTES de gastar nada: `creatorChat` (Weë Brain pregunta y arma el plan) y
 * `creatorQuote` (cambiar el nivel de calidad y ver el presupuesto). No cobran Credits, pero sí leen, escriben y
 * —`creatorChat`— pueden llamar a un modelo (planificador LLM, sin cupo).
 *
 *     node scripts/bench-r7/04-cotizar-y-planear.mjs
 */
import { prepararEntorno, lib, UID, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';
import { simularProveedoresDeCreador, sembrarTrabajo, TIEMPOS } from './banco/creador.mjs';

const CERO = Object.fromEntries(Object.keys(TIEMPOS).map((k) => [k, 0]));
const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 } });
const { banco } = E;
simularProveedoresDeCreador(E, { tiempos: CERO });
const creator = lib('creator/index.js');
const uid = UID(1);
const filas = [];
const secuencias = {};

const fila = (nombre, m, extra = {}) => {
  filas.push({
    nombre, ok: !m.error, error: m.error ? String(m.error.message).slice(0, 120) : undefined,
    rpc: m.resumen.rpc, rondas: m.virtualMs, lecturas: m.resumen.lecturas, escrituras: m.resumen.escrituras,
    llamadasAlProveedor: m.proveedor, llamadasAlAlmacen: E.almacen.llamadas.length, porTipo: m.resumen.porTipo, ...extra,
  });
  secuencias[nombre] = m.entradas.map((e) => `${e.desde - m.entradas[0].desde}:${e.tipo}:${(e.lee ?? []).concat(e.escribe ?? []).join(',') || e.consulta || e.ruta || ''}`.replace(/auto\d+/g, 'auto…').replace(/\d{4}-\d{2}-\d{2}/g, '{día}'));
};

/** La respuesta que daría una persona: una opción si la hay (no «no sé»), y si la pregunta es de texto libre, un texto. */
const contestar = (q) => {
  const opcion = (q.options || []).find((o) => o.id !== 'idk');
  return opcion ? { questionId: q.id, optionId: opcion.id } : { questionId: q.id, text: 'Panadería Aurora' };
};

const nuevo = async () => {
  E.reiniciarBase();
  E.enfriarCaches();
  E.sembrarCuenta(uid, 5000);
};

/* ── creatorQuote ── */
for (const [exp, calidad, etiqueta] of [['design', 'high', 'design (2 pasos, 3 imágenes)'], ['photo', 'max', 'photo (foto de entrada: lee su tamaño)'], ['studio', 'high', 'studio (vídeo + voz)']]) {
  await nuevo();
  const { plan } = await E.preparar(() => sembrarTrabajo(E, { uid, experiencia: exp, jobId: `cotizar${exp}000001` }));
  /* Calentamiento: cachés llenas, como en una instancia que ya ha atendido algo. */
  await E.preparar(() => creator.creatorQuote.run({ auth: { uid }, data: { jobId: `cotizar${exp}000001`, quality: 'standard' } }));
  E.almacen.llamadas.length = 0;
  const m = await E.medir(() => creator.creatorQuote.run({ auth: { uid }, data: { jobId: `cotizar${exp}000001`, quality: calidad } }));
  fila(`Q · creatorQuote · ${etiqueta}`, m, { pasos: plan.steps.length });
}

/* ── creatorChat ── */
{
  /* CH1: trabajo nuevo con un objetivo escrito con palabras propias → el planificador LLM interpreta el texto. */
  await nuevo();
  await E.preparar(() => creator.creatorChat.run({ auth: { uid }, data: { experienceId: 'design', goal: 'Warm-up' } }));
  const m = await E.medir(() => creator.creatorChat.run({ auth: { uid }, data: { experienceId: 'design', goal: 'Quiero un logo moderno para mi panadería artesanal', locale: 'es' } }));
  const jobId = m.valor?.jobId;
  fila('C1 · creatorChat · trabajo NUEVO con objetivo escrito (planificador LLM) → primera pregunta', m, { pregunta: m.valor?.question?.id });

  /* CH2: responder con texto libre (aporta información nueva → el planificador vuelve a consultar al modelo). */
  const m2 = await E.medir(() => creator.creatorChat.run({ auth: { uid }, data: { jobId, answer: contestar(m.valor.question) } }));
  fila('C2 · creatorChat · responder con TEXTO LIBRE (vuelve a consultar al modelo)', m2, { pregunta: m2.valor?.question?.id, estado: m2.valor?.status });

  /* CH3..: seguir respondiendo hasta que haya plan. */
  let cur = m2;
  let n = 0;
  const intermedias = [];
  while (cur.valor?.status === 'asking' && n++ < 8) {
    const q = cur.valor.question;
    cur = await E.medir(() => creator.creatorChat.run({ auth: { uid }, data: { jobId, answer: contestar(q) } }));
    if (cur.valor?.status === 'planned') break;
    intermedias.push(cur);
  }
  if (intermedias.length) fila('C2b · creatorChat · responder una OPCIÓN (sin texto libre nuevo)', intermedias[0], { estado: intermedias[0].valor?.status });
  fila('C3 · creatorChat · la respuesta que cierra el plan (estima 4 niveles de precio)', cur, { estado: cur.valor?.status, creditos: cur.valor?.creditsEstimated, preguntasContestadas: n + 1 });

  /* CH4: trabajo nuevo con TODO preseleccionado (acción de la pantalla del especialista): plan al primer golpe. */
  await nuevo();
  await E.preparar(() => creator.creatorChat.run({ auth: { uid }, data: { experienceId: 'chef', goal: 'warm' } }));
  const { TEMPLATES } = lib('creator/templates.js');
  const t = TEMPLATES.writer;
  const presets = t.questions.map((q) => ({ questionId: q.id, optionId: (q.options.find((o) => o.id !== 'idk') ?? q.options[0])?.id }));
  const m4 = await E.medir(() => creator.creatorChat.run({ auth: { uid }, data: { experienceId: 'writer', goal: t.defaultGoal, presetAnswers: presets } }));
  fila('C4 · creatorChat · trabajo nuevo con todas las respuestas ya decididas (plan en una llamada)', m4, { estado: m4.valor?.status });
}
E.restaurar();

const md = [];
md.push('# 04 · creatorQuote y creatorChat sobre el código real\n');
md.push('Medido con `scripts/bench-r7/04-cotizar-y-planear.mjs`. Proveedores a 0 ms virtuales; RPC y rondas como en 01.\n');
md.push(tabla(['Caso', 'RPC', 'Rondas', 'Lect.', 'Escr.', 'Llam. al proveedor', 'Llam. al almacén', 'Por tipo'], filas.map((f) => [f.nombre + (f.ok ? '' : ` — FALLÓ: ${f.error}`), f.rpc, f.rondas, f.lecturas, f.escrituras, f.llamadasAlProveedor, f.llamadasAlAlmacen, JSON.stringify(f.porTipo)])));
for (const [k, v] of Object.entries(secuencias).slice(0, 8)) md.push(`\n### ${k}\n\`\`\`\n${v.join('\n')}\n\`\`\``);
const dir = guardar('04-cotizar-y-planear', { filas, secuencias }, md.join('\n'));
console.log(md.join('\n').split('\n').slice(0, 14).join('\n'));
console.log(`\n(salidas completas en ${dir})`);
process.exit(0);
