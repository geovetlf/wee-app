#!/usr/bin/env node
/**
 * 01 · `brainChat` y `brainQuote` SOBRE EL CÓDIGO REAL — llamadas a Firestore por petición y etapas en serie.
 *
 * ── Qué mide ────────────────────────────────────────────────────────────────
 *
 * Ejecuta el `brainChat` / `brainQuote` COMPILADOS (`functions/lib/creator/brain.js`) con su Credit Engine,
 * su libro de generaciones, su límite por persona, su contador de bloque y su Router reales, contra el
 * Firestore doble que cuenta (`banco/firestore-contador.mjs`). Lo único simulado es el proveedor (DeepSeek /
 * Gemini: adaptador real con `run` sustituido por un doble con retardo virtual).
 *
 *   rpc ............. llamadas lógicas al servicio (BatchGet, RunQuery, Commit…) — MEDIDO.
 *   rondas .......... longitud del camino crítico en llamadas, con 1 ms virtual por llamada (dos llamadas en
 *                     paralelo cuentan una) — MEDIDO. Con L ms por llamada, el tiempo sin proveedor es rondas × L
 *                     (L real de Firestore: NO medido aquí).
 *   lecturas/escr ... lo que factura Firestore (documentos leídos / escritos / borrados) — MEDIDO.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *
 *     node scripts/bench-r7/01-brainchat.mjs            (escribe salidas/01-brainchat.{json,md})
 *
 * Sin red, sin claves, sin proyecto real. `functions/lib` tiene que estar compilada.
 */
import { prepararEntorno, lib, UID, texto, tabla, tokensDe } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';

const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 } });
const { reloj, banco, Timestamp } = E;
const brain = lib('creator/brain.js');

/* ── Lo simulado: el proveedor de texto de Weë Brain (DeepSeek) y el de búsqueda (Gemini) ── */
const PARAMS = { proveedorMs: 0, respuestaChars: 700, usuarioChars: 160 };
const tarifaOffPeak = { input: 0.15, output: 0.6 };
const simularProveedores = () => {
  E.simular('deepseek', async (req) => {
    const entrada = JSON.stringify(req.input.system ?? '').length + String(req.input.prompt ?? '').length
      + (req.input.history ?? []).reduce((a, h) => a + (h.text?.length ?? 0), 0);
    await reloj.dormir(PARAMS.proveedorMs);
    const inTok = tokensDe(entrada);
    const outTok = tokensDe(PARAMS.respuestaChars);
    return { output: { kind: 'text', content: texto(PARAMS.respuestaChars) }, usage: { inputTokens: inTok, outputTokens: outTok }, costUSD: (inTok * tarifaOffPeak.input + outTok * tarifaOffPeak.output) / 1e6, latencyMs: PARAMS.proveedorMs, model: req.model.id };
  });
  E.simular('gemini', async (req) => {
    await reloj.dormir(PARAMS.proveedorMs);
    return {
      output: { kind: 'text', content: texto(PARAMS.respuestaChars), sources: [{ url: 'https://ejemplo.invalid/a', title: 'a' }] },
      usage: { inputTokens: 900, outputTokens: 180 }, costUSD: 0.0206, latencyMs: PARAMS.proveedorMs, model: req.model.id,
    };
  });
};
simularProveedores();

const ts = (i) => Timestamp.fromMillis(Date.UTC(2026, 9, 11, 11, 0, 0) + i * 60_000);
const sembrarConversacion = (uid, chatId, turnos) => {
  banco.sembrar(`brainChats/${chatId}`, { userId: uid, title: 'Una conversación', messageCount: turnos, createdAt: ts(0), updatedAt: ts(turnos) });
  for (let i = 0; i < turnos; i++) {
    const usuario = i % 2 === 0;
    const par = Math.floor(i / 2);
    banco.sembrar(`brainChats/${chatId}/messages/${usuario ? `h${par}` : `h${par}_wee`}`, {
      role: usuario ? 'user' : 'wee', text: texto(usuario ? PARAMS.usuarioChars : PARAMS.respuestaChars), createdAt: ts(i + 1),
    });
  }
};
const sembrarBloque = (uid, usadas) => banco.sembrar(`brainUsage/${uid}`, { bloque: usadas, respuestasTotales: usadas, actualizadoEn: ts(0) });

const llamar = (uid, data) => brain.brainChat.run({ auth: { uid }, data });
const cotizar = (uid, data) => brain.brainQuote.run({ auth: { uid }, data });

/** Un recorrido: base limpia, cuenta sembrada, `preparar`, UNA llamada de calentamiento (cachés) y la llamada medida. */
const recorrido = async ({ nombre, turnos = 4, usadas = 0, chatNuevo = false, abrirPuerta = false, caliente = true, ejecutar }) => {
  E.reiniciarBase();
  E.enfriarCaches();
  const uid = UID(1);
  E.sembrarCuenta(uid, 240);
  if (abrirPuerta) banco.sembrar('aiSettings/runtime', { habilitado: true, porCapacidad: { 'text.generate': { cuentas: [uid] } } });
  const chatId = 'chatDePrueba000001';
  const sembrar = () => {
    if (!chatNuevo) sembrarConversacion(uid, chatId, turnos);
    sembrarBloque(uid, usadas);
  };
  sembrar();
  if (caliente) {
    /* Calentamiento: llena las cachés de 60 s (config, puerta, contexto, uso del día) y luego se restaura el estado sembrado. */
    const w = await E.medir(() => ejecutar({ uid, chatId: chatNuevo ? undefined : chatId, messageId: 'm_calentamiento', fase: 'calentamiento' }));
    if (w.error) throw new Error(`${nombre}: el calentamiento falló: ${w.error.message}`);
    const creadoPorElCalentamiento = [...banco.docs.keys()].filter((p) => p.startsWith('brainChats/') || p.startsWith('aiGenerations/') || p.startsWith('brainUsage/') || p.startsWith('creditTransactions/usage_'));
    for (const p of creadoPorElCalentamiento) banco.docs.delete(p);
    for (const p of [...banco.docs.keys()].filter((q) => q.startsWith('aiRateLimits/'))) banco.docs.delete(p);
    banco.sembrar(`users/perfil_${uid}`, banco.leer(`users/perfil_${uid}`));
    sembrar();
  }
  const m = await E.medir(() => ejecutar({ uid, chatId: chatNuevo ? undefined : chatId, messageId: 'm_medido', fase: 'medida' }));
  return { nombre, ...m, uid, chatId };
};

const fila = (r) => ({
  nombre: r.nombre,
  ok: !r.error,
  error: r.error ? String(r.error.message ?? r.error).slice(0, 120) : undefined,
  rpc: r.resumen.rpc,
  rondas: r.virtualMs,
  porTipo: r.resumen.porTipo,
  lecturasFacturadas: r.resumen.lecturas,
  escriturasFacturadas: r.resumen.escrituras,
  borrados: r.resumen.borrados,
  llamadasAlProveedor: r.proveedor,
  lineasDeLog: r.lineasDeLog.length,
});

const resultados = [];
const guardarFila = (r) => { const f = fila(r); resultados.push(f); return f; };

/* ── A · brainChat por el camino de siempre (la puerta del runtime cerrada: su estado hoy) ── */
const mensaje = (extra = {}) => ({ message: 'Cuéntame más sobre cómo puedo empezar mi proyecto', locale: 'es', ...extra });

const A_base = await recorrido({
  nombre: 'A1 · legacy · mensaje de una conversación abierta (caliente, 4 turnos)',
  turnos: 4,
  ejecutar: ({ uid, chatId, messageId }) => llamar(uid, mensaje({ chatId, messageId })),
});
guardarFila(A_base);
const t0 = A_base.entradas[0].desde;
const lineaDeTiempo = A_base.entradas.map((e) => ({ ronda: e.desde - t0, hasta: e.hasta - t0, tipo: e.tipo, donde: (e.lee ?? []).concat(e.escribe ?? []).concat(e.borra ?? []).join(' + ') || e.consulta || '' }));

for (const turnos of [0, 12, 20]) {
  guardarFila(await recorrido({
    nombre: `A1${turnos === 0 ? 'b' : turnos === 12 ? 'c' : 'd'} · legacy · caliente, ${turnos} turnos de historial`,
    turnos, chatNuevo: false,
    ejecutar: ({ uid, chatId, messageId }) => llamar(uid, mensaje({ chatId, messageId })),
  }));
}
guardarFila(await recorrido({
  nombre: 'A2 · legacy · primer mensaje de una conversación nueva (caliente)', chatNuevo: true,
  ejecutar: ({ uid, messageId }) => llamar(uid, mensaje({ messageId })),
}));
guardarFila(await recorrido({
  nombre: 'A3 · legacy · la respuesta 12 (cierra el bloque y cobra 1 Credit)', turnos: 4, usadas: 11,
  ejecutar: ({ uid, chatId, messageId }) => llamar(uid, mensaje({ chatId, messageId })),
}));
guardarFila(await recorrido({
  nombre: 'A4 · legacy · primera llamada tras 60 s de silencio (cachés caducadas)', turnos: 4, caliente: false,
  ejecutar: ({ uid, chatId, messageId }) => llamar(uid, mensaje({ chatId, messageId })),
}));
guardarFila(await recorrido({
  nombre: 'A5 · legacy · búsqueda con fuentes (cobra por adelantado, text.search)', turnos: 4,
  ejecutar: ({ uid, chatId, messageId }) => llamar(uid, mensaje({ chatId, messageId, webSearch: true })),
}));

/* ── B · el mismo mensaje REPETIDO ── */
{
  const r = await recorrido({
    nombre: 'B1 · legacy · repetición del mismo mensaje YA contestado (idempotencia de la respuesta)', turnos: 4,
    ejecutar: async ({ uid, chatId, messageId, fase }) => {
      const primera = await llamar(uid, mensaje({ chatId, messageId: fase === 'medida' ? 'm_repetido' : messageId }));
      if (fase !== 'medida') return primera;
      return primera;
    },
  });
  /* Se repite fuera del recorrido: la medida de arriba fue la primera; ahora se mide la SEGUNDA. */
  const m = await E.medir(() => llamar(r.uid, mensaje({ chatId: r.chatId, messageId: 'm_repetido' })));
  guardarFila({ ...m, nombre: r.nombre, uid: r.uid });
}
{
  const r = await recorrido({
    nombre: 'B2 · legacy · el mismo mensaje DOS VECES A LA VEZ (doble toque / reintento del cliente)', turnos: 4,
    ejecutar: async ({ uid, chatId, messageId, fase }) => {
      if (fase !== 'medida') return llamar(uid, mensaje({ chatId, messageId }));
      return Promise.all([llamar(uid, mensaje({ chatId, messageId })), llamar(uid, mensaje({ chatId, messageId }))]);
    },
  });
  const f = guardarFila(r);
  /* Estado final tras el doble toque: cuántas veces trabajó el proveedor y qué quedó escrito. */
  f.estadoFinal = {
    filasEnElLibro: banco.hijos('aiGenerations').length,
    respuestasDeWeeGuardadas: banco.hijos('brainChats/chatDePrueba000001/messages').filter((m) => m.id.endsWith('_wee') && m.id.startsWith('m_medido')).length,
    bloque: banco.leer(`brainUsage/${r.uid}`)?.bloque,
    respuestasTotalesContadas: banco.leer(`brainUsage/${r.uid}`)?.respuestasTotales,
  };
}

/* ── C · el mismo mensaje por el Core (la puerta abierta para esta cuenta: el canary) ── */
guardarFila(await recorrido({
  nombre: 'C1 · CORE · mensaje de una conversación abierta (caliente, 4 turnos)', turnos: 4, abrirPuerta: true,
  ejecutar: ({ uid, chatId, messageId }) => llamar(uid, mensaje({ chatId, messageId })),
}));
guardarFila(await recorrido({
  nombre: 'C2 · CORE · la respuesta 12 (cierra el bloque y cobra)', turnos: 4, usadas: 11, abrirPuerta: true,
  ejecutar: ({ uid, chatId, messageId }) => llamar(uid, mensaje({ chatId, messageId })),
}));

/* ── D · brainQuote ── */
for (const turnos of [0, 20]) {
  guardarFila(await recorrido({
    nombre: `D1 · brainQuote · cotización con ${turnos} turnos de historial (caliente)`, turnos,
    ejecutar: ({ uid, chatId }) => cotizar(uid, { chatId, message: 'Cuéntame más sobre cómo puedo empezar mi proyecto', locale: 'es' }),
  }));
}
guardarFila(await recorrido({
  nombre: 'D2 · brainQuote · conversación nueva (sin chat todavía)', chatNuevo: true,
  ejecutar: ({ uid }) => cotizar(uid, { message: 'Hola', locale: 'es' }),
}));

E.restaurar();

/* ── Salida ── */
const md = [];
md.push('# 01 · brainChat / brainQuote sobre el código real (Firestore doble que cuenta)\n');
md.push('Medido con `scripts/bench-r7/01-brainchat.mjs`. RPC = llamadas lógicas al servicio; rondas = camino crítico con 1 ms virtual por llamada (el proveedor cuenta 0). Facturación = documentos leídos / escritos.\n');
md.push(tabla(
  ['Recorrido', 'RPC', 'Rondas', 'Lect.', 'Escr.', 'Prov.', 'Líneas de log'],
  resultados.map((f) => [f.nombre + (f.ok ? '' : ` — FALLÓ: ${f.error}`), f.rpc, f.rondas, f.lecturasFacturadas, f.escriturasFacturadas, f.llamadasAlProveedor, f.lineasDeLog]),
));
md.push('\n## Línea de tiempo de A1 (caliente, 4 turnos)\n');
md.push('Cada fila es una RPC; las que comparten `ronda` se hicieron EN PARALELO.\n');
md.push(tabla(['Ronda', 'Hasta', 'Tipo', 'Documento / colección'], lineaDeTiempo.map((l) => [l.ronda, l.hasta, l.tipo, l.donde])));
md.push('\n## Estado final tras el doble toque (B2)\n');
md.push('```json\n' + JSON.stringify(resultados.find((f) => f.nombre.startsWith('B2'))?.estadoFinal, null, 1) + '\n```');
md.push('\n## Por tipo de operación (A1)\n');
md.push('```json\n' + JSON.stringify(resultados[0].porTipo, null, 1) + '\n```');

const dir = guardar('01-brainchat', { parametros: PARAMS, resultados, lineaDeTiempo }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
