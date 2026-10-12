#!/usr/bin/env node
/**
 * 05 · DOCUMENTOS CALIENTES — qué documentos comparte TODA la gente y cuántas veces los escribe cada operación.
 *
 * Parte A (MEDIDO): para cada operación de IA, escrituras y lecturas sobre los documentos que NO son de una persona sino de
 * todas (`aiUsage/{día}`, `aiProviderVerification/{proveedor}`, `creatorUsage/{día}`, `creditStats/*`). Sale de ejecutar el
 * código real con el Firestore doble que cuenta.
 *
 * Parte B (MODELO): K personas distintas piden a la vez un mensaje de Weë Brain. Con el bloqueo por documento del doble
 * (ver `banco/firestore-contador.mjs`), se cuenta qué documentos hacen esperar a quién. La ESPERA depende del tiempo de
 * servicio de un documento caliente en Firestore real, que es DESCONOCIDO [D]: aquí se mide en «veces la latencia de una
 * escritura» y se muestra QUÉ se serializa, no cuánto tarda de verdad.
 *
 * Parte C (ARITMÉTICA [E]): con un ritmo sostenido máximo por documento (la guía documentada de Firestore habla de ~1
 * escritura por segundo sostenida a un mismo documento; es una guía, no un límite duro), cuántas operaciones por segundo
 * admite cada operación según sus escrituras sobre el documento más caliente. NO es una cifra de capacidad del sistema.
 *
 *     node scripts/bench-r7/05-puntos-calientes.mjs
 */
import { prepararEntorno, lib, UID, texto, tabla } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';
import { simularProveedoresDeCreador, sembrarTrabajo, TIEMPOS } from './banco/creador.mjs';

const CERO = Object.fromEntries(Object.keys(TIEMPOS).map((k) => [k, 0]));
const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 } });
const { reloj, banco, Timestamp } = E;
const brain = lib('creator/brain.js');
const creator = lib('creator/index.js');
simularProveedoresDeCreador(E, { tiempos: CERO });
E.simular('deepseek', async (req) => ({ output: { kind: 'text', content: texto(700) }, usage: { inputTokens: 800, outputTokens: 175 }, costUSD: 0.0002, latencyMs: 0, model: req.model.id }));

const COMPARTIDOS = [
  [/^aiUsage\//, 'aiUsage/{día}'],
  [/^aiProviderVerification\//, 'aiProviderVerification/{proveedor}'],
  [/^creatorUsage\//, 'creatorUsage/{día}'],
  [/^creditStats\/global$/, 'creditStats/global'],
  [/^creditStats\/daily_/, 'creditStats/daily_{día}'],
];
const compartidos = (porDocumento) => {
  const salida = {};
  for (const [p, v] of Object.entries(porDocumento)) {
    const hit = COMPARTIDOS.find(([re]) => re.test(p));
    if (!hit) continue;
    const k = hit[1];
    salida[k] = salida[k] || { lecturas: 0, escrituras: 0 };
    salida[k].lecturas += v.lecturas;
    salida[k].escrituras += v.escrituras;
  }
  return salida;
};

const ts = (i) => Timestamp.fromMillis(Date.UTC(2026, 9, 11, 11, 0, 0) + i * 60_000);
const sembrarChat = (uid, chatId, usadas = 0) => {
  banco.sembrar(`brainChats/${chatId}`, { userId: uid, title: 'x', messageCount: 2, createdAt: ts(0), updatedAt: ts(2) });
  banco.sembrar(`brainChats/${chatId}/messages/h0`, { role: 'user', text: 'hola', createdAt: ts(1) });
  banco.sembrar(`brainChats/${chatId}/messages/h0_wee`, { role: 'wee', text: 'hola!', createdAt: ts(2) });
  banco.sembrar(`brainUsage/${uid}`, { bloque: usadas, respuestasTotales: usadas, actualizadoEn: ts(0) });
};

/* ── A · por operación ── */
const A = [];
const medirOp = async (nombre, preparar, ejecutar) => {
  E.reiniciarBase();
  E.enfriarCaches();
  const uid = UID(1);
  E.sembrarCuenta(uid, 5000);
  await E.preparar(() => preparar(uid, 'calentamiento'));
  await E.preparar(() => ejecutar(uid, 'calentamiento'));
  const antes = banco.marca();
  void antes;
  await E.preparar(() => preparar(uid, 'medida'));
  const m = await E.medir(() => ejecutar(uid, 'medida'));
  A.push({ operacion: nombre, ok: !m.error, error: m.error ? String(m.error.message).slice(0, 80) : undefined, compartidos: compartidos(m.resumen.porDocumento), rpc: m.resumen.rpc });
};
await medirOp('brainChat · respuesta 1–11 (no cobra)',
  async (uid, f) => sembrarChat(uid, `chat${f}00000001`, 3),
  (uid, f) => brain.brainChat.run({ auth: { uid }, data: { chatId: `chat${f}00000001`, message: 'Cuéntame más', messageId: `m_${f}_0001`, locale: 'es' } }));
await medirOp('brainChat · respuesta 12 (cobra 1 Credit)',
  async (uid, f) => sembrarChat(uid, `chat${f}00000001`, 11),
  (uid, f) => brain.brainChat.run({ auth: { uid }, data: { chatId: `chat${f}00000001`, message: 'Cuéntame más', messageId: `m_${f}_0001`, locale: 'es' } }));
for (const exp of ['design', 'studio', 'business', 'travel']) {
  await medirOp(`creatorRun · ${exp}`,
    (uid, f) => sembrarTrabajo(E, { uid, experiencia: exp, jobId: `trabajo${f}${exp}0001` }),
    (uid, f) => creator.creatorRun.run({ auth: { uid }, data: { jobId: `trabajo${f}${exp}0001`, locale: 'es' } }));
}
await medirOp('creatorChat · turno con texto libre (planificador LLM)',
  async () => undefined,
  (uid) => creator.creatorChat.run({ auth: { uid }, data: { experienceId: 'design', goal: 'Quiero un logo moderno para mi panadería', locale: 'es' } }));

/* ── B · concurrencia de K personas distintas ── */
const B = [];
for (const K of [1, 10, 50, 200]) {
  E.reiniciarBase();
  E.enfriarCaches();
  for (let i = 1; i <= K; i++) {
    const uid = UID(i);
    E.sembrarCuenta(uid, 240);
    sembrarChat(uid, `chat${String(i).padStart(10, '0')}`, 3);
  }
  /* Calentamiento con la primera persona (cachés) y se vuelve a sembrar su estado. */
  await E.preparar(() => brain.brainChat.run({ auth: { uid: UID(1) }, data: { chatId: `chat${String(1).padStart(10, '0')}`, message: 'x', messageId: 'm_calentamiento', locale: 'es' } }));
  banco.esperasDeBloqueo.length = 0;
  const m = await E.medir(() => Promise.all(Array.from({ length: K }, (_, k) => brain.brainChat.run({ auth: { uid: UID(k + 1) }, data: { chatId: `chat${String(k + 1).padStart(10, '0')}`, message: 'Cuéntame más', messageId: `m_conc_${String(k + 1).padStart(6, '0')}`, locale: 'es' } }))));
  const esperas = {};
  for (const e of banco.esperasDeBloqueo) {
    const clave = e.ruta.replace(/\d{4}-\d{2}-\d{2}/, '{día}').replace(/UsuarioDePrueba\d+/, '{persona}').replace(/chat\d+/, '{chat}').replace(/auto\d+/, 'auto…');
    esperas[clave] = esperas[clave] || { esperas: 0, maxMs: 0, totalMs: 0 };
    esperas[clave].esperas++;
    esperas[clave].maxMs = Math.max(esperas[clave].maxMs, e.ms);
    esperas[clave].totalMs += e.ms;
  }
  B.push({ personas: K, ok: !m.error, error: m.error ? String(m.error.message).slice(0, 80) : undefined, rondasHastaQueTermineLaUltima: m.virtualMs, rpcTotal: m.resumen.rpc, escriturasSobreAiUsage: m.resumen.porDocumento[Object.keys(m.resumen.porDocumento).find((p) => p.startsWith('aiUsage/'))]?.escrituras, esperasPorDocumento: esperas, reintentosPorBloqueo: banco.conflictos });
}
E.restaurar();

/* ── C · aritmética ── */
const RITMOS = [1, 10];
const hot = (a) => {
  const entradas = Object.entries(a.compartidos);
  if (!entradas.length) return { doc: '—', escrituras: 0 };
  const [doc, v] = entradas.sort((x, y) => y[1].escrituras - x[1].escrituras)[0];
  return { doc, escrituras: v.escrituras };
};
const C = A.filter((a) => a.ok).map((a) => {
  const h = hot(a);
  return { operacion: a.operacion, documentoMasCaliente: h.doc, escriturasPorOperacion: h.escrituras, ...Object.fromEntries(RITMOS.map((r) => [`opsPorSegundoSi${r}EscrituraPorSegundoPorDocumento`, h.escrituras ? Number((r / h.escrituras).toFixed(2)) : null])) };
});

const md = [];
md.push('# 05 · Documentos calientes de Weë AI\n');
md.push('## A · Escrituras (E) y lecturas (L) por operación sobre documentos COMPARTIDOS (MEDIDO)\n');
const claves = [...new Set(A.flatMap((a) => Object.keys(a.compartidos)))];
md.push(tabla(['Operación', 'RPC', ...claves.map((c) => `${c} L/E`)], A.map((a) => [a.operacion + (a.ok ? '' : ` — FALLÓ: ${a.error}`), a.rpc, ...claves.map((c) => (a.compartidos[c] ? `${a.compartidos[c].lecturas}/${a.compartidos[c].escrituras}` : '—'))])));
md.push('\n## B · K personas distintas piden a la vez un mensaje de Weë Brain (MODELO de bloqueo por documento; espera en múltiplos de la latencia de una escritura)\n');
md.push(tabla(['Personas', 'Rondas hasta la última', 'RPC', 'Escrituras a aiUsage', 'Documentos que hicieron esperar (esperas · máx · total, en rondas)'], B.map((b) => [b.personas, b.rondasHastaQueTermineLaUltima, b.rpcTotal, b.escriturasSobreAiUsage, Object.entries(b.esperasPorDocumento).map(([d, v]) => `${d}: ${v.esperas}·${v.maxMs}·${v.totalMs}`).join(' ; ') || 'ninguno'])));
md.push('\n## C · Operaciones por segundo si cada documento admitiera un ritmo sostenido de 1 o 10 escrituras por segundo (ARITMÉTICA [E], no capacidad)\n');
md.push(tabla(['Operación', 'Documento más caliente', 'Escrituras/op', 'ops/s a 1 esc/s', 'ops/s a 10 esc/s'], C.map((c) => [c.operacion, c.documentoMasCaliente, c.escriturasPorOperacion, c.opsPorSegundoSi1EscrituraPorSegundoPorDocumento, c.opsPorSegundoSi10EscrituraPorSegundoPorDocumento])));
const dir = guardar('05-puntos-calientes', { A, B, C }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
