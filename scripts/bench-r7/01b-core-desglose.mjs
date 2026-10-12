#!/usr/bin/env node
/**
 * 01b · ¿DE DÓNDE SALEN LAS +23 RPC DEL CORE? — desglose por documento de un mensaje de Weë Brain por el camino de siempre (A1)
 * frente al mismo mensaje por el Core (C1, la puerta `aiSettings/runtime` abierta para la cuenta de prueba).
 *
 * Es la misma preparación que `01-brainchat.mjs` (cuenta con 240 Credits, conversación de 4 turnos, una llamada de calentamiento
 * que llena las cachés de 60 s y se borra, y la llamada medida), pero en vez de la tabla de totales agrupa cada RPC por el
 * patrón del documento que toca (la colección `jobs`, la colección `workflowRuns`, los mensajes de `brainChats`…) y resta A1 de C1.
 *
 *     node scripts/bench-r7/01b-core-desglose.mjs
 */
import { prepararEntorno, lib, UID, texto, tabla, tokensDe } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';

const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 } });
const { reloj, banco, Timestamp } = E;
const brain = lib('creator/brain.js');

E.simular('deepseek', async (req) => {
  const entrada = JSON.stringify(req.input.system ?? '').length + String(req.input.prompt ?? '').length + (req.input.history ?? []).reduce((a, h) => a + (h.text?.length ?? 0), 0);
  await reloj.dormir(0);
  const inTok = tokensDe(entrada);
  const outTok = tokensDe(700);
  return { output: { kind: 'text', content: texto(700) }, usage: { inputTokens: inTok, outputTokens: outTok }, costUSD: (inTok * 0.15 + outTok * 0.6) / 1e6, latencyMs: 0, model: req.model.id };
});

const ts = (i) => Timestamp.fromMillis(Date.UTC(2026, 9, 11, 11, 0, 0) + i * 60_000);
const sembrarConversacion = (chatId, uid, turnos) => {
  banco.sembrar(`brainChats/${chatId}`, { userId: uid, title: 'Una conversación', messageCount: turnos, createdAt: ts(0), updatedAt: ts(turnos) });
  for (let i = 0; i < turnos; i++) {
    const usuario = i % 2 === 0;
    const par = Math.floor(i / 2);
    banco.sembrar(`brainChats/${chatId}/messages/${usuario ? `h${par}` : `h${par}_wee`}`, { role: usuario ? 'user' : 'wee', text: texto(usuario ? 160 : 700), createdAt: ts(i + 1) });
  }
};

const patron = (p) => p.split('/').map((s, i) => (i % 2 === 1 ? '*' : s)).join('/');
/** Cada RPC se agrupa por los patrones de documento que toca (o por la colección de su consulta). */
const claveDe = (e) => {
  const docs = [...(e.lee ?? []), ...(e.escribe ?? []), ...(e.borra ?? [])].map(patron);
  const unicos = [...new Set(docs)];
  if (!unicos.length && e.consulta) return `${e.consulta.split('/').map((s, i) => (i % 2 === 1 ? '*' : s)).join('/')} (consulta)`;
  return unicos.join(' + ') || '(vacío)';
};

const correr = async (abrirPuerta) => {
  E.reiniciarBase();
  E.enfriarCaches();
  const uid = UID(1);
  E.sembrarCuenta(uid, 240);
  if (abrirPuerta) banco.sembrar('aiSettings/runtime', { habilitado: true, porCapacidad: { 'text.generate': { cuentas: [uid] } } });
  const chatId = 'chatDePrueba000001';
  const sembrar = () => { sembrarConversacion(chatId, uid, 4); banco.sembrar(`brainUsage/${uid}`, { bloque: 0, respuestasTotales: 0, actualizadoEn: ts(0) }); };
  sembrar();
  const llamar = (messageId) => brain.brainChat.run({ auth: { uid }, data: { message: 'Cuéntame más sobre cómo puedo empezar mi proyecto', locale: 'es', chatId, messageId } });
  const w = await E.medir(() => llamar('m_calentamiento'));
  if (w.error) throw new Error(`calentamiento: ${w.error.message}`);
  for (const p of [...banco.docs.keys()].filter((q) => /^(brainChats|aiGenerations|brainUsage|creditTransactions\/usage_|aiRateLimits|jobs|workflowRuns)/.test(q))) banco.docs.delete(p);
  banco.sembrar(`users/perfil_${uid}`, banco.leer(`users/perfil_${uid}`));
  sembrar();
  const m = await E.medir(() => llamar('m_medido'));
  if (m.error) throw new Error(`medida: ${m.error.message}`);
  const porClave = {};
  for (const e of m.entradas.filter((x) => !x.almacen)) {
    const k = claveDe(e);
    const f = (porClave[k] = porClave[k] || { rpc: 0, tipos: {} });
    f.rpc++;
    f.tipos[e.tipo] = (f.tipos[e.tipo] || 0) + 1;
  }
  return { rpc: m.resumen.rpc, rondas: m.virtualMs, lecturas: m.resumen.lecturas, escrituras: m.resumen.escrituras, porClave, porColeccion: m.resumen.porColeccion, entradas: m.entradas.filter((x) => !x.almacen).map((e) => ({ ronda: e.desde - m.entradas[0].desde, tipo: e.tipo, donde: claveDe(e) })) };
};

const A = await correr(false);
const C = await correr(true);
E.restaurar();

const claves = [...new Set([...Object.keys(A.porClave), ...Object.keys(C.porClave)])];
const filasRpc = claves.map((k) => ({ k, a: A.porClave[k]?.rpc ?? 0, c: C.porClave[k]?.rpc ?? 0 })).map((f) => ({ ...f, d: f.c - f.a })).sort((x, y) => y.d - x.d || y.c - x.c);
const colecciones = [...new Set([...Object.keys(A.porColeccion), ...Object.keys(C.porColeccion)])];
const filasCol = colecciones.map((k) => ({
  k,
  la: A.porColeccion[k]?.lecturas ?? 0, lc: C.porColeccion[k]?.lecturas ?? 0,
  ea: A.porColeccion[k]?.escrituras ?? 0, ec: C.porColeccion[k]?.escrituras ?? 0,
})).map((f) => ({ ...f, dl: f.lc - f.la, de: f.ec - f.ea })).filter((f) => f.dl || f.de || f.lc || f.ec).sort((x, y) => y.dl - x.dl || y.de - x.de);

/* Agregados de lo que añade el Core: por colección «raíz» (jobs, workflowRuns, resto). */
const raiz = (k) => (k.startsWith('jobs') ? 'jobs/*' : k.startsWith('workflowRuns') ? 'workflowRuns/*' : null);
const agregado = {};
for (const f of filasRpc) {
  const partes = f.k.split(' + ').map((s) => s.trim());
  const r = partes.map(raiz).find(Boolean);
  if (r) { agregado[r] = (agregado[r] || 0) + f.d; }
}
const resto = filasRpc.filter((f) => !f.k.split(' + ').some((s) => raiz(s.trim()))).reduce((a, f) => a + f.d, 0);

const md = [];
md.push('# 01b · De dónde salen las RPC que añade el Core (A1 camino de siempre frente a C1 Core, mensaje caliente de 4 turnos)\n');
md.push(`Totales: A1 ${A.rpc} RPC / ${A.rondas} rondas / ${A.lecturas} lecturas / ${A.escrituras} escrituras · C1 ${C.rpc} RPC / ${C.rondas} rondas / ${C.lecturas} lecturas / ${C.escrituras} escrituras (diferencia ${C.rpc - A.rpc} RPC, ${C.rondas - A.rondas} rondas, ${C.lecturas - A.lecturas} lecturas, ${C.escrituras - A.escrituras} escrituras).\n`);
md.push('## RPC por documento tocado\n');
md.push(tabla(['Documento(s) de la RPC', 'A1', 'C1', 'C1 − A1'], filasRpc.filter((f) => f.a || f.c).map((f) => [f.k, f.a, f.c, f.d])));
md.push('\n## Lecturas y escrituras facturables por colección\n');
md.push(tabla(['Colección', 'Lect. A1', 'Lect. C1', 'Δ', 'Escr. A1', 'Escr. C1', 'Δ'], filasCol.map((f) => [f.k, f.la, f.lc, f.dl, f.ea, f.ec, f.de])));
md.push('\n## Lo que añade el Core, agregado\n');
md.push(tabla(['Grupo', 'RPC añadidas'], [...Object.entries(agregado).map(([k, v]) => [k, v]), ['resto (chat, mensajes, historial, Credits…)', resto]]));
md.push('\n## Línea de tiempo de C1\n');
md.push(tabla(['Ronda', 'Tipo', 'Documento / colección'], C.entradas.map((l) => [l.ronda, l.tipo, l.donde])));
const dir = guardar('01b-core-desglose', { A: { rpc: A.rpc, rondas: A.rondas, lecturas: A.lecturas, escrituras: A.escrituras }, C: { rpc: C.rpc, rondas: C.rondas, lecturas: C.lecturas, escrituras: C.escrituras }, filasRpc, filasCol, agregado, resto, lineaDeTiempoC1: C.entradas }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
