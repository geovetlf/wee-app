#!/usr/bin/env node
/**
 * 06 · TAMAÑO DEL CONTEXTO DE WEË BRAIN — qué se manda al modelo y cuánto cuesta cotizarlo.
 *
 * Ejecuta el `brainChat` y el `brainQuote` REALES con conversaciones sembradas de 0 a 20 turnos y captura lo que
 * recibe el proveedor (el `input` exacto que construye `brainInput`). Mide:
 *
 *   · caracteres e «tokens estimados» (caracteres / 4, como hace `estimateInputTokens`) de lo que viaja;
 *   · qué parte es el sistema FIJO (idéntica en todos los mensajes: la que un caché de prefijo reaprovecharía);
 *   · lo que el CÓDIGO cotiza (`brainQuote` → `usd`, `detail.estimatedInputTokens`) y los Credits que saldrían;
 *   · lecturas de Firestore que cuesta reconstruir esa ventana cada vez.
 *
 * Tres tamaños de turno (usuario / respuesta de Weë): CORTO 120/400, MEDIO 300/1 200, LARGO 800/4 000 y el TECHO
 * (4 000 / 5 600 caracteres: el máximo del mensaje y 1 400 tokens de salida). Los tamaños reales de las
 * conversaciones de producción NO se conocen [D]: son parámetros, no mediciones del uso.
 *
 *     node scripts/bench-r7/06-contexto-brain.mjs
 */
import { prepararEntorno, lib, UID, texto, tabla, tokensDe } from './banco/entorno.mjs';
import { guardar } from './banco/salida.mjs';

const E = prepararEntorno({ latencia: { get: 1, query: 1, write: 1, commit: 1 } });
const { reloj, banco, Timestamp } = E;
const brain = lib('creator/brain.js');
const { BRAIN_CHAT_SYSTEM, instruccionDeIdioma } = lib('creator/prompts.js');
const { LIMITES_DE_CONTEXTO } = lib('core/brain.js');

const uid = UID(1);
const chatId = 'chatDePrueba000001';
const PERFILES = {
  corto: { usuario: 120, wee: 400 },
  medio: { usuario: 300, wee: 1200 },
  largo: { usuario: 800, wee: 4000 },
  techo: { usuario: 4000, wee: 5600 },
};
const TURNOS = [0, 2, 4, 8, 12, 16, 20];
const ts = (i) => Timestamp.fromMillis(Date.UTC(2026, 9, 11, 11, 0, 0) + i * 60_000);

let capturado;
E.simular('deepseek', async (req) => {
  capturado = req.input;
  await reloj.dormir(0);
  return { output: { kind: 'text', content: texto(400) }, usage: { inputTokens: 1, outputTokens: 1 }, costUSD: 0, latencyMs: 0, model: req.model.id };
});

const sembrar = (turnos, perfil) => {
  E.reiniciarBase();
  E.enfriarCaches();
  E.sembrarCuenta(uid, 5000);
  banco.sembrar(`brainChats/${chatId}`, { userId: uid, title: 'x', messageCount: turnos, createdAt: ts(0), updatedAt: ts(turnos) });
  for (let i = 0; i < turnos; i++) {
    const u = i % 2 === 0;
    banco.sembrar(`brainChats/${chatId}/messages/${u ? `h${i / 2}` : `h${(i - 1) / 2}_wee`}`, { role: u ? 'user' : 'wee', text: texto(u ? perfil.usuario : perfil.wee), createdAt: ts(i + 1) });
  }
  banco.sembrar(`brainUsage/${uid}`, { bloque: 11, respuestasTotales: 11, actualizadoEn: ts(0) });
};

const sistemaChars = `${BRAIN_CHAT_SYSTEM} ${instruccionDeIdioma('es')}`.length;
const mensajeNuevo = 'Cuéntame más sobre cómo puedo empezar mi proyecto';
const filas = [];

for (const [nombrePerfil, perfil] of Object.entries(PERFILES)) {
  for (const turnos of TURNOS) {
    sembrar(turnos, perfil);
    /* La cotización que ve la persona antes de enviar (calentamiento de cachés incluido). */
    await E.preparar(() => brain.brainQuote.run({ auth: { uid }, data: { chatId, message: mensajeNuevo, locale: 'es' } }));
    const q = await E.medir(() => brain.brainQuote.run({ auth: { uid }, data: { chatId, message: mensajeNuevo, locale: 'es' } }));
    /* La respuesta 12 (cierra el bloque): es la que cobra, con el precio del contexto de ESE mensaje. */
    const r = await E.medir(() => brain.brainChat.run({ auth: { uid }, data: { chatId, message: mensajeNuevo, messageId: `m_ctx_${nombrePerfil}_${turnos}`, locale: 'es' } }));
    const historial = capturado?.history ?? [];
    const charsHistorial = historial.reduce((a, h) => a + h.text.length, 0);
    const charsEnviados = String(capturado?.system ?? '').length + String(capturado?.prompt ?? '').length + charsHistorial;
    const ledger = banco.hijos('aiGenerations').find((g) => g.requestId === `brain_m_ctx_${nombrePerfil}_${turnos}`);
    filas.push({
      perfil: nombrePerfil, turnosSembrados: turnos, turnosEnviados: historial.length,
      charsSistema: String(capturado?.system ?? '').length, charsHistorial, charsMensaje: String(capturado?.prompt ?? '').length, charsEnviados,
      tokensEstimadosAlEnviar: tokensDe(charsEnviados),
      parteFija: Number((String(capturado?.system ?? '').length / charsEnviados).toFixed(3)),
      cotizacion: { tokensDeEntradaEstimadosPorElCodigo: q.valor?.detail?.estimatedInputTokens, usd: q.valor?.usd, creditsSiCierraElBloque: q.valor?.credits, lecturasFacturadas: q.resumen.lecturas },
      cobroDeLa12: { creditsCobrados: r.valor?.credits, ledgerCreditsEstimated: ledger?.creditsEstimated, errores: r.error ? String(r.error.message) : undefined },
      lecturasPorMensaje: r.resumen.lecturas,
    });
  }
}
E.restaurar();

/* ── Aritmética de una conversación (SUPUESTA: tamaños de turno de cada perfil, ventana de 20 turnos) ── */
const tarifa = { input: 0.15, output: 0.6 }; // USD por millón de tokens, franja barata de DeepSeek (deepseek.ts:60)
const salidaTokens = (perfil) => tokensDe(perfil.wee);
const conversacion = (perfil, mensajes, { ventana = LIMITES_DE_CONTEXTO.turnos, resumenChars = 0 } = {}) => {
  let entrada = 0;
  let salida = 0;
  for (let m = 0; m < mensajes; m++) {
    const turnosPrevios = Math.min(ventana, 2 * m);
    const parejas = turnosPrevios / 2;
    const chars = sistemaChars + mensajeNuevo.length + parejas * (perfil.usuario + perfil.wee) + resumenChars;
    entrada += tokensDe(chars);
    salida += salidaTokens(perfil);
  }
  return { entradaTokens: entrada, salidaTokens: salida, usd: Number(((entrada * tarifa.input + salida * tarifa.output) / 1e6).toFixed(5)) };
};
const aritmetica = Object.entries(PERFILES).map(([nombre, perfil]) => {
  const hoy = conversacion(perfil, 60);
  /* Alternativa (NO existe en el código): ventana de 6 turnos + resumen de 800 caracteres. */
  const conResumen = conversacion(perfil, 60, { ventana: 6, resumenChars: 800 });
  return { perfil: nombre, mensajes: 60, hoy, conResumen, ahorroEntradaPct: Number((100 * (1 - conResumen.entradaTokens / hoy.entradaTokens)).toFixed(0)), ahorroUsdPct: Number((100 * (1 - conResumen.usd / hoy.usd)).toFixed(0)) };
});

const md = [];
md.push('# 06 · Contexto de Weë Brain: qué se manda y qué cuesta cotizarlo\n');
md.push(`Medido con \`scripts/bench-r7/06-contexto-brain.mjs\` sobre \`brainChat\` y \`brainQuote\` reales. Sistema fijo: **${sistemaChars} caracteres** (\`BRAIN_CHAT_SYSTEM\` + instrucción de idioma). Ventana: **${LIMITES_DE_CONTEXTO.turnos} turnos** (\`LIMITES_DE_CONTEXTO.turnos\`), sin resumen. Tamaños de turno por perfil (usuario/Weë, caracteres): ${Object.entries(PERFILES).map(([k, v]) => `${k} ${v.usuario}/${v.wee}`).join(', ')} — supuestos, no uso real [D].\n`);
md.push(tabla(
  ['Perfil', 'Turnos', 'Chars enviados', 'Tokens est.', 'Parte fija', 'Cotiza (tokens entrada)', 'Cotiza USD', 'Credits si cobra', 'Lecturas FS (brainChat)'],
  filas.map((f) => [f.perfil, f.turnosEnviados, f.charsEnviados, f.tokensEstimadosAlEnviar, `${(f.parteFija * 100).toFixed(0)} %`, f.cotizacion.tokensDeEntradaEstimadosPorElCodigo, f.cotizacion.usd, f.cotizacion.creditsSiCierraElBloque, f.lecturasPorMensaje]),
));
md.push('\n## Una conversación de 60 mensajes — hoy (ventana de 20 turnos) frente a una alternativa con resumen (6 turnos + resumen de 800 caracteres) [E: aritmética sobre los perfiles]\n');
md.push(tabla(['Perfil', 'Entrada hoy (tokens)', 'Salida (tokens)', 'USD hoy', 'Entrada con resumen', 'USD con resumen', 'Ahorro entrada', 'Ahorro USD'], aritmetica.map((a) => [a.perfil, a.hoy.entradaTokens, a.hoy.salidaTokens, a.hoy.usd, a.conResumen.entradaTokens, a.conResumen.usd, `${a.ahorroEntradaPct} %`, `${a.ahorroUsdPct} %`])));
const dir = guardar('06-contexto-brain', { sistemaChars, PERFILES, filas, aritmetica }, md.join('\n'));
console.log(md.join('\n'));
console.log(`\n(salidas en ${dir})`);
process.exit(0);
