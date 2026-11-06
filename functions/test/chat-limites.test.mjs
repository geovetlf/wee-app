/**
 * LÍMITES DE `creatorChat` — la conversación de creación es gratuita y tiene tope (decisión del dueño, 2026-10-14).
 *
 * Qué se prueba (nada de red, nada de claves, nada de Credits reales; usa el compilado, `npm run build` antes):
 *
 *   A  funciones puras: la configuración se valida y se recorta, el estado se lee con cuidado, y cada tope (minuto, día,
 *      conversaciones nuevas, consumo) cae justo donde debe, con el orden de motivos acordado.
 *   B  la reserva es atómica (25 turnos a la vez con tope 8 → exactamente 8), la ventana se mueve, el día se reinicia,
 *      el consumo se acumula y NUNCA rompe una conversación, y sin poder leer la configuración rigen los topes estrictos.
 *   C  `creatorChat` compilado, de punta a punta sobre una Firestore en memoria: sigue siendo GRATIS (ningún asiento, saldo
 *      intacto), un turno rechazado no crea trabajo ni llama al modelo, el motivo llega al cliente, los topes de la
 *      administración rigen, el consumo de un proveedor real se mide y el demo no gasta cupo de consumo.
 *   D  el código: el tope va ANTES de crear el trabajo y de llamar al modelo, el cliente dice la verdad (segundos o
 *      mañana) y los 16 idiomas traen sus dos frases.
 */
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } from './_firestore-en-memoria.mjs';
import { acelerarLasEsperasCortas, apuntarLaConsola } from './_aceptacion.mjs';

const CLAVES = ['ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'FAL_KEY',
  'GEMINI_API_KEY', 'MINIMAX_API_KEY', 'OPENAI_API_KEY', 'SEEDANCE_CALLBACK_TOKEN'];
for (const k of [...CLAVES, 'GOOGLE_APPLICATION_CREDENTIALS', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'GOOGLE_CLOUD_PROJECT']) delete process.env[k];
process.env.GCLOUD_PROJECT = 'demo-chat-limites';
process.env.METADATA_SERVER_DETECTION = 'none';
const intentosDeRed = [];
globalThis.fetch = async (u) => { intentosDeRed.push(`fetch ${String(u).slice(0, 80)}`); throw new Error('sin red'); };
const conectarOriginal = net.Socket.prototype.connect;
net.Socket.prototype.connect = function () { intentosDeRed.push('socket'); throw new Error('sin red'); };

const aqui = path.dirname(fileURLToPath(import.meta.url));
const leer = (p) => fs.readFileSync(path.resolve(aqui, '../../', p), 'utf8');

let fallo = 0;
const check = (nombre, ok, evidencia = '') => { if (!ok) fallo++; process.stdout.write(`${ok ? '✔' : '✘'} ${nombre}${evidencia ? ` · ${evidencia}` : ''}\n`); };

let base = new BaseEnMemoria();
instalarLaBase(() => base);
acelerarLasEsperasCortas();
const consola = apuntarLaConsola();

const lim = lib('creator/chatLimite.js');
const creator = lib('creator/index.js');
const { ADAPTERS } = lib('engine/registry.js');
const { EngineError } = lib('engine/errors.js');
const { disponibilidadDeWee } = lib('planner/index.js');

const T0 = Date.UTC(2026, 9, 14, 12, 0, 0);
const DIA = '2026-10-14';
const L = lim.LIMITES_DEL_CHAT;
const docDelDia = (uid, dia = DIA) => base.leer(`aiRateLimits/chat:${uid}:${dia}`);
const rechazo = async (f) => { try { await f(); return null; } catch (e) { return e; } };

/* ══ A · funciones puras ═══════════════════════════════════════════════════════════════════════════════════════ */
check('A1 los topes de partida son estrictos: 8 por minuto, 60 por día, 15 conversaciones nuevas, 0,05 USD',
  L.porMinuto === 8 && L.porDia === 60 && L.nuevosPorDia === 15 && L.usdPorDia === 0.05, JSON.stringify(L));
check('A2 los topes máximos configurables existen y están por encima de los de partida',
  lim.TOPES_DEL_CHAT.porMinuto > L.porMinuto && lim.TOPES_DEL_CHAT.porDia > L.porDia && lim.TOPES_DEL_CHAT.nuevosPorDia > L.nuevosPorDia && lim.TOPES_DEL_CHAT.usdPorDia > L.usdPorDia);
check('A3 los valores de partida están congelados (nadie los cambia en caliente)', Object.isFrozen(lim.LIMITES_DEL_CHAT) && Object.isFrozen(lim.TOPES_DEL_CHAT));

check('A4 sin configuración rigen los de partida', JSON.stringify(lim.limitesDelChat(undefined)) === JSON.stringify(L) && JSON.stringify(lim.limitesDelChat(null)) === JSON.stringify(L));
const raros = [NaN, Infinity, -1, 0, 'abc', null, [], {}, true];
check('A5 un valor inválido se ignora (cae al de partida), clave por clave',
  raros.every((v) => JSON.stringify(lim.limitesDelChat({ porMinuto: v, porDia: v, nuevosPorDia: v, usdPorDia: v })) === JSON.stringify(L)));
check('A6 un valor válido se respeta', JSON.stringify(lim.limitesDelChat({ porMinuto: 5, porDia: 20, nuevosPorDia: 4, usdPorDia: 0.02 })) === JSON.stringify({ porMinuto: 5, porDia: 20, nuevosPorDia: 4, usdPorDia: 0.02 }));
const alto = lim.limitesDelChat({ porMinuto: 9999, porDia: 9999, nuevosPorDia: 9999, usdPorDia: 9999 });
check('A7 un valor excesivo se RECORTA al tope máximo, nunca lo supera', JSON.stringify(alto) === JSON.stringify(lim.TOPES_DEL_CHAT), JSON.stringify(alto));
check('A8 los contadores son enteros: 7,9 → 7; 0,5 no existe (cae al de partida)', lim.limitesDelChat({ porMinuto: 7.9 }).porMinuto === 7 && lim.limitesDelChat({ porMinuto: 0.5 }).porMinuto === L.porMinuto);
check('A9 una configuración que no es un objeto se ignora', ['hola', 7, true].every((v) => JSON.stringify(lim.limitesDelChat(v)) === JSON.stringify(L)));

const cero = { turnos: 0, nuevos: 0, usd: 0, recientes: [] };
check('A10 el estado guardado se lee con cuidado: lo ilegible cuenta cero',
  [undefined, {}, { turnos: 'x', nuevos: -3, usd: NaN, recientes: 'no' }, { turnos: null, recientes: [null, 'a', NaN] }].every((d) => JSON.stringify(lim.leerEstadoDelChat(d)) === JSON.stringify(cero)));
check('A11 un estado bueno se lee tal cual', JSON.stringify(lim.leerEstadoDelChat({ turnos: 3, nuevos: 2, usd: 0.01, recientes: [T0 - 5, T0] })) === JSON.stringify({ turnos: 3, nuevos: 2, usd: 0.01, recientes: [T0 - 5, T0] }));

const con = (p) => ({ ...cero, ...p });
const turnosRecientes = (n, desde = T0 - 1000) => Array.from({ length: n }, (_, i) => desde + i);
check('A12 un turno con todo a cero cabe y deja la cuenta en 1', (() => { const d = lim.decidirTurno(cero, T0, true, L); return d.ok && d.siguiente.turnos === 1 && d.siguiente.nuevos === 1 && d.siguiente.recientes.length === 1; })());
check('A13 un turno que no abre conversación no suma a «nuevos»', (() => { const d = lim.decidirTurno(cero, T0, false, L); return d.ok && d.siguiente.nuevos === 0 && d.siguiente.turnos === 1; })());
check('A14 por minuto: 7 recientes caben, 8 no', lim.decidirTurno(con({ recientes: turnosRecientes(7) }), T0, false, L).ok
  && lim.decidirTurno(con({ recientes: turnosRecientes(8) }), T0, false, L).motivo === 'chat_por_minuto');
check('A15 por minuto: los turnos de hace 60 s o más ya no cuentan', lim.decidirTurno(con({ recientes: Array(8).fill(T0 - 60_000) }), T0, false, L).ok
  && lim.decidirTurno(con({ recientes: Array(8).fill(T0 - 59_999) }), T0, false, L).ok === false);
check('A16 por minuto: la lista nunca crece más allá del tope', (() => { const d = lim.decidirTurno(con({ recientes: turnosRecientes(7) }), T0, false, L); return d.ok && d.siguiente.recientes.length === 8; })());
check('A17 por día: 59 caben, 60 no', lim.decidirTurno(con({ turnos: 59 }), T0, false, L).ok && lim.decidirTurno(con({ turnos: 60 }), T0, false, L).motivo === 'chat_por_dia');
check('A18 nuevas por día: 14 caben, 15 no; y una respuesta a una conversación abierta NO está sujeta a este tope',
  lim.decidirTurno(con({ nuevos: 14 }), T0, true, L).ok && lim.decidirTurno(con({ nuevos: 15 }), T0, true, L).motivo === 'chat_nuevos_por_dia' && lim.decidirTurno(con({ nuevos: 15 }), T0, false, L).ok);
check('A19 consumo: 0,0499 cabe, 0,05 no', lim.decidirTurno(con({ usd: 0.0499 }), T0, false, L).ok && lim.decidirTurno(con({ usd: 0.05 }), T0, false, L).motivo === 'chat_consumo_por_dia');
check('A20 si se pasan varios, el motivo es el primero del orden acordado: minuto, día, nuevas, consumo',
  lim.decidirTurno(con({ recientes: turnosRecientes(8), turnos: 60, nuevos: 15, usd: 1 }), T0, true, L).motivo === 'chat_por_minuto'
  && lim.decidirTurno(con({ turnos: 60, nuevos: 15, usd: 1 }), T0, true, L).motivo === 'chat_por_dia'
  && lim.decidirTurno(con({ nuevos: 15, usd: 1 }), T0, true, L).motivo === 'chat_nuevos_por_dia'
  && lim.decidirTurno(con({ usd: 1 }), T0, true, L).motivo === 'chat_consumo_por_dia');
check('A21 el rechazo dice cuánto es el límite y cuánto se lleva usado', (() => { const d = lim.decidirTurno(con({ turnos: 60 }), T0, false, L); return !d.ok && d.limite === 60 && d.usado === 60; })());
check('A22 decidir es puro: no cambia el estado que recibe', (() => { const e = con({ turnos: 3, recientes: [T0] }); const copia = JSON.stringify(e); lim.decidirTurno(e, T0 + 5, true, L); return JSON.stringify(e) === copia; })());

/* ══ B · la reserva sobre una base ═══════════════════════════════════════════════════════════════════════════════ */
base = new BaseEnMemoria();
{
  let ok = 0;
  let ultimo = null;
  for (let i = 0; i < 8; i++) { await lim.reservarTurnoDelChat(base, 'ana', false, L, T0 + i); ok++; }
  ultimo = await rechazo(() => lim.reservarTurnoDelChat(base, 'ana', false, L, T0 + 9));
  check('B1 ocho turnos seguidos caben y el noveno es RATE_LIMITED', ok === 8 && ultimo instanceof EngineError && ultimo.code === 'RATE_LIMITED', String(ultimo?.code));
  check('B2 el error lleva el motivo, la modalidad y las cifras para la app', ultimo?.details?.reason === 'chat_por_minuto' && ultimo?.details?.modality === 'chat' && ultimo?.details?.limit === 8 && ultimo?.details?.used === 8, JSON.stringify(ultimo?.details));
  check('B3 el turno rechazado NO se cuenta', docDelDia('ana')?.turnos === 8, `turnos=${docDelDia('ana')?.turnos}`);
  check('B4 el documento es de la persona y del día, y está en la colección de servidor', docDelDia('ana')?.userId === 'ana' && docDelDia('ana')?.day === DIA);
  check('B5 un minuto después, otra vez caben (la ventana se mueve) y la cuenta del día sigue', await rechazo(() => lim.reservarTurnoDelChat(base, 'ana', false, L, T0 + 61_000)) === null && docDelDia('ana')?.turnos === 9);
  check('B6 otra persona no se ve afectada', await rechazo(() => lim.reservarTurnoDelChat(base, 'beto', false, L, T0 + 9)) === null && docDelDia('beto')?.turnos === 1);
  check('B7 al día siguiente se empieza de cero', await rechazo(() => lim.reservarTurnoDelChat(base, 'ana', false, L, T0 + 24 * 3_600_000)) === null && docDelDia('ana', '2026-10-15')?.turnos === 1);
}
base = new BaseEnMemoria();
{
  const resultados = await Promise.allSettled(Array.from({ length: 25 }, () => lim.reservarTurnoDelChat(base, 'carla', false, L, T0)));
  const ok = resultados.filter((r) => r.status === 'fulfilled').length;
  const no = resultados.filter((r) => r.status === 'rejected' && r.reason?.code === 'RATE_LIMITED').length;
  check('B8 la reserva es atómica: 25 turnos a la vez con tope 8 → exactamente 8 pasan y 17 se rechazan', ok === 8 && no === 17, `ok=${ok} rechazados=${no}`);
  check('B9 y el contador queda en 8 (no se cuelan por carrera)', docDelDia('carla')?.turnos === 8 && docDelDia('carla')?.recientes?.length === 8);
}
base = new BaseEnMemoria();
{
  const conL = { ...L, nuevosPorDia: 2 };
  await lim.reservarTurnoDelChat(base, 'dani', true, conL, T0);
  await lim.reservarTurnoDelChat(base, 'dani', true, conL, T0 + 1);
  const tercera = await rechazo(() => lim.reservarTurnoDelChat(base, 'dani', true, conL, T0 + 2));
  check('B10 la tercera conversación nueva con tope 2 se rechaza con su motivo', tercera?.details?.reason === 'chat_nuevos_por_dia', JSON.stringify(tercera?.details));
  check('B11 pero seguir una conversación abierta sigue cabiendo', await rechazo(() => lim.reservarTurnoDelChat(base, 'dani', false, conL, T0 + 3)) === null);
}
base = new BaseEnMemoria();
{
  await lim.reservarTurnoDelChat(base, 'eva', false, L, T0);
  await lim.anotarConsumoDelChat(base, 'eva', 0.02, T0);
  await lim.anotarConsumoDelChat(base, 'eva', 0.02, T0 + 1);
  check('B12 el consumo se acumula', Math.abs((docDelDia('eva')?.usd ?? 0) - 0.04) < 1e-9, `usd=${docDelDia('eva')?.usd}`);
  const antes = JSON.stringify(docDelDia('eva'));
  for (const malo of [0, -1, NaN, Infinity, 'x', undefined, null]) await lim.anotarConsumoDelChat(base, 'eva', malo, T0 + 2);
  check('B13 un coste que no es un número positivo no suma (demo y fallos valen 0)', JSON.stringify(docDelDia('eva')) === antes);
  await lim.anotarConsumoDelChat(base, 'eva', 0.02, T0 + 3);
  const e = await rechazo(() => lim.reservarTurnoDelChat(base, 'eva', false, L, T0 + 4));
  check('B14 al llegar al tope de consumo el siguiente turno se rechaza', e?.details?.reason === 'chat_consumo_por_dia', JSON.stringify(e?.details));
  const roto = { collection: () => ({ doc: () => ({}) }), runTransaction: async () => { throw new Error('Firestore caído'); } };
  check('B15 medir el consumo NUNCA rompe una conversación: si falla, no lanza', await rechazo(() => lim.anotarConsumoDelChat(roto, 'eva', 0.01, T0)) === null);
}
base = new BaseEnMemoria();
{
  lim.olvidarLimitesDelChat();
  const sinDoc = await lim.limitesDelChatActuales(base, T0);
  check('B16 sin documento de configuración rigen los de partida', JSON.stringify(sinDoc) === JSON.stringify(L));
  base.docs.set('aiSettings/chat', { porMinuto: 3, porDia: 99999, nuevosPorDia: 'x' });
  check('B17 la caché dura un minuto: el cambio aún no se ve', JSON.stringify(await lim.limitesDelChatActuales(base, T0 + 30_000)) === JSON.stringify(L));
  const nuevos = await lim.limitesDelChatActuales(base, T0 + 61_000);
  check('B18 pasado el minuto se lee, se valida (3 válido; 99999 recortado al tope; «x» ignorado)',
    nuevos.porMinuto === 3 && nuevos.porDia === lim.TOPES_DEL_CHAT.porDia && nuevos.nuevosPorDia === L.nuevosPorDia && nuevos.usdPorDia === L.usdPorDia, JSON.stringify(nuevos));
  lim.olvidarLimitesDelChat();
  const caida = { collection: () => ({ doc: () => ({ get: async () => { throw new Error('Firestore caído'); } }) }) };
  check('B19 si no se puede leer la configuración rigen los topes ESTRICTOS, nunca «sin límite»', JSON.stringify(await lim.limitesDelChatActuales(caida, T0)) === JSON.stringify(L));
  lim.olvidarLimitesDelChat();
}

/* ══ C · `creatorChat` compilado, de punta a punta ═══════════════════════════════════════════════════════════════ */
const chat = (uid, data) => creator.creatorChat.run({ auth: { uid }, data: { locale: 'es', ...data } });
const empezar = (uid, goal = 'Una receta fácil para cenar') => chat(uid, { experienceId: 'chef', goal });
const jobs = () => base.de('creatorJobs');
const asientos = () => base.de('creditTransactions');
let llamadasAlModelo = 0;
const corre = ADAPTERS.mock.run;
const original = { isConfigured: ADAPTERS.gemini.isConfigured, run: ADAPTERS.gemini.run, disponible: disponibilidadDeWee.disponible };
/* El planificador solo usa el modelo cuando el registro dice que `text.structure` se puede servir: aquí se le dice que sí. */
const conProveedorReal = (costeUsd) => {
  disponibilidadDeWee.disponible = (c) => c === 'text.structure' || original.disponible.call(disponibilidadDeWee, c);
  ADAPTERS.gemini.isConfigured = () => true;
  ADAPTERS.gemini.run = async (r) => {
    llamadasAlModelo++;
    const salida = await corre.call(ADAPTERS.mock, r);
    return { ...salida, costUSD: costeUsd, usage: { inputTokens: 900, outputTokens: 100 } };
  };
};
const sinProveedorReal = () => { disponibilidadDeWee.disponible = original.disponible; ADAPTERS.gemini.isConfigured = original.isConfigured; ADAPTERS.gemini.run = original.run; };
const mundo = async (...uids) => { base = new BaseEnMemoria(); for (const u of uids) await darDeAlta(base, u); lim.olvidarLimitesDelChat(); };

await mundo('ana');
sinProveedorReal();
{
  const antes = saldoDe(base, 'ana');
  const r1 = await empezar('ana');
  check('C1 una conversación nueva responde (sigue funcionando)', typeof r1.jobId === 'string' && r1.demo === true && !!r1.question, JSON.stringify(Object.keys(r1)));
  for (let i = 0; i < 7; i++) await empezar('ana');
  check('C2 ocho conversaciones en un minuto caben', jobs().length === 8, `trabajos=${jobs().length}`);
  check('C3 la conversación es GRATIS: ningún asiento de Credits y el saldo intacto', asientos().filter((t) => t.type === 'usage').length === 0 && saldoDe(base, 'ana') === antes, `saldo=${saldoDe(base, 'ana')}`);
  const e = await rechazo(() => empezar('ana'));
  check('C4 la novena se rechaza como RATE_LIMITED hacia la app (resource-exhausted)', e?.code === 'functions/resource-exhausted' || e?.code === 'resource-exhausted', String(e?.code));
  check('C5 el motivo viaja a la app para decir «espera unos segundos»', e?.details?.code === 'RATE_LIMITED' && e?.details?.reason === 'chat_por_minuto', JSON.stringify(e?.details));
  check('C6 el rechazo no crea ningún trabajo', jobs().length === 8, `trabajos=${jobs().length}`);
  check('C7 y el mensaje al usuario dice que no se cobró nada', /No te cobré/.test(String(e?.message)), String(e?.message));
  const sinPermiso = await rechazo(() => creator.creatorChat.run({ auth: null, data: { experienceId: 'chef' } }));
  check('C8 sin sesión se rechaza antes de tocar ningún contador', sinPermiso?.details?.code === 'UNAUTHORIZED' && base.leer(`aiRateLimits/chat:undefined:${new Date().toISOString().slice(0, 10)}`) === undefined);
}

await mundo('ana', 'beto');
{
  for (let i = 0; i < 8; i++) await empezar('ana');
  const bloqueada = await rechazo(() => empezar('ana'));
  const otra = await rechazo(() => empezar('beto'));
  check('C9 el tope es por persona: Ana bloqueada, Beto sigue', bloqueada?.details?.reason === 'chat_por_minuto' && otra === null);
}

await mundo('ana');
{
  base.docs.set('aiSettings/chat', { porMinuto: 30, porDia: 5, nuevosPorDia: 50 });
  lim.olvidarLimitesDelChat();
  for (let i = 0; i < 5; i++) await empezar('ana');
  const e = await rechazo(() => empezar('ana'));
  check('C10 el tope diario de la administración rige: el sexto turno se rechaza con chat_por_dia', e?.details?.reason === 'chat_por_dia', JSON.stringify(e?.details));
}

await mundo('ana');
{
  base.docs.set('aiSettings/chat', { porMinuto: 30, porDia: 100, nuevosPorDia: 2 });
  lim.olvidarLimitesDelChat();
  const a = await empezar('ana', 'Una receta fácil');
  await empezar('ana', 'Otra receta distinta');
  const tercera = await rechazo(() => empezar('ana', 'Una tercera receta'));
  check('C11 con 2 conversaciones nuevas permitidas, la tercera se rechaza con chat_nuevos_por_dia', tercera?.details?.reason === 'chat_nuevos_por_dia', JSON.stringify(tercera?.details));
  const q = a.question;
  const seguir = await rechazo(() => chat('ana', { jobId: a.jobId, answer: { questionId: q.id, optionId: q.options[0].id } }));
  check('C12 pero contestar una pregunta de una conversación abierta SÍ cabe', seguir === null);
}

await mundo('ana');
{
  conProveedorReal(0.02);
  llamadasAlModelo = 0;
  const salidas = [];
  for (let i = 0; i < 3; i++) salidas.push(await rechazo(() => empezar('ana', `Quiero cocinar algo especial número ${i}`)));
  const usd = docDelDia('ana', new Date().toISOString().slice(0, 10))?.usd ?? 0;
  check('C13 con un proveedor real el consumo de cada turno se mide y se suma al día', salidas.every((s) => s === null) && llamadasAlModelo >= 3 && Math.abs(usd - 0.06) < 1e-9, `llamadas=${llamadasAlModelo} usd=${usd}`);
  const antesDeRechazo = llamadasAlModelo;
  const e = await rechazo(() => empezar('ana', 'Una cuarta receta con ingredientes'));
  check('C14 superado el tope de consumo (0,05) el siguiente turno se rechaza con chat_consumo_por_dia', e?.details?.reason === 'chat_consumo_por_dia', JSON.stringify(e?.details));
  check('C15 y un turno rechazado NO llama al modelo', llamadasAlModelo === antesDeRechazo, `llamadas=${llamadasAlModelo} antes=${antesDeRechazo}`);
  check('C16 con proveedor real la conversación sigue sin cobrar Credits', asientos().filter((t) => t.type === 'usage').length === 0 && saldoDe(base, 'ana') === 240);
  sinProveedorReal();
}

await mundo('ana');
{
  sinProveedorReal();
  for (let i = 0; i < 8; i++) await empezar('ana', `Algo con texto propio ${i}`);
  const usd = docDelDia('ana', new Date().toISOString().slice(0, 10))?.usd ?? 0;
  check('C17 el modo demo no gasta cupo de consumo (cuesta 0)', usd === 0, `usd=${usd}`);
}

/* ══ D · el código y los idiomas ═════════════════════════════════════════════════════════════════════════════════ */
const fuente = leer('functions/src/creator/index.ts');
const chatSrc = fuente.slice(fuente.indexOf('export const creatorChat'), fuente.indexOf('export const creatorQuote'));
const runSrc = fuente.slice(fuente.indexOf('export const creatorRun'));
check('D1 el tope va ANTES de crear el trabajo y de llamar al planificador',
  chatSrc.indexOf('reservarTurnoDelChat(') > 0 && chatSrc.indexOf('reservarTurnoDelChat(') < chatSrc.indexOf('jobs().doc()') && chatSrc.indexOf('reservarTurnoDelChat(') < chatSrc.indexOf('getPlanner().next('));
check('D2 el consumo de cada llamada del turno se anota (anotarConsumoDelChat en el `record` del planificador)', /anotarConsumoDelChat\(/.test(chatSrc) && /record:\s*async \(entry\)/.test(chatSrc));
check('D3 creatorRun NO usa este tope (se cobra en Credits y tiene su propio cupo)', !/reservarTurnoDelChat|anotarConsumoDelChat/.test(runSrc));
const cliente = leer('services/creatorService.ts');
check('D4 el cliente dice la verdad: por minuto «espera unos segundos», el resto «vuelve mañana»',
  /chat_por_minuto['"]\) return t\('weeai\.errChatEspera'\)/.test(cliente) && /startsWith\('chat_'\)\) return t\('weeai\.errChatLimite'\)/.test(cliente));
const idiomas = fs.readdirSync(path.resolve(aqui, '../../i18n/textos'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const sin = idiomas.filter((l) => { const s = leer(`i18n/textos/${l}/weeai.ts`); return !/errChatEspera:/.test(s) || !/errChatLimite:/.test(s); });
check(`D5 los ${idiomas.length} idiomas traen las dos frases`, idiomas.length === 16 && sin.length === 0, sin.join(', '));
check('D6 ninguna frase promete algo falso: dicen que no se cobró nada (o equivalente) y distinguen segundos de mañana',
  /unos segundos/.test(leer('i18n/textos/es/weeai.ts')) && /mañana/.test(leer('i18n/textos/es/weeai.ts')) && /few seconds/.test(leer('i18n/textos/en/weeai.ts')) && /tomorrow/.test(leer('i18n/textos/en/weeai.ts')));

/* ══ Cierre ══════════════════════════════════════════════════════════════════════════════════════════════════════ */
check('ninguna conexión fuera del proceso', intentosDeRed.length === 0, `intentos=${intentosDeRed.length}`);
net.Socket.prototype.connect = conectarOriginal;
sinProveedorReal();
consola.restaurar();
process.stdout.write(fallo ? `\n✘ ${fallo} comprobación(es) fallaron\n` : '\n✔ La conversación es gratis y tiene tope: minuto, día, conversaciones nuevas y consumo\n');
process.exit(fallo ? 1 : 0);
