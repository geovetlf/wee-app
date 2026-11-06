/**
 * WEË BRAIN · LA RESPUESTA DE MUESTRA NO SE COBRA (B4-03, 2026-10-14).
 *
 * Sin IA real configurada, Weë Brain responde con el proveedor `mock` (modo demo). Antes, esa respuesta cerraba el
 * bloque de doce y cobraba 1 Credit, y las búsquedas se cobraban por adelantado y nunca se devolvían. Aquí se prueba:
 *
 *   N1  doce respuestas de muestra: el bloque avanza, NO se cobra nada, el saldo queda intacto.
 *   N2  una búsqueda de muestra: su reserva se devuelve entera (REFUNDED) y el libro queda a 0.
 *   P1  CONTROL: con una IA real configurada (DeepSeek, simulada aquí con un adaptador que no es el demo), la
 *       duodécima respuesta SÍ cobra 1 Credit y una búsqueda cobra 3 y queda COMPLETED. Si el control falla, las
 *       pruebas negativas no demuestran nada.
 *
 * Aislamiento: Firestore en memoria, sin red (fetch y sockets cortados y contados), sin claves de proveedor, y el
 * proveedor real es un adaptador de prueba que solo devuelve texto. Usa el compilado (`npm run build` antes).
 */
import net from 'node:net';
import { createRequire } from 'node:module';
import { BaseEnMemoria, instalarLaBase, darDeAlta, saldoDe, lib } from './_firestore-en-memoria.mjs';
import { acelerarLasEsperasCortas, apuntarLaConsola } from './_aceptacion.mjs';

const CLAVES = ['ANTHROPIC_API_KEY', 'ARK_API_KEY', 'BFL_API_KEY', 'DEEPSEEK_API_KEY', 'ELEVENLABS_API_KEY', 'FAL_KEY',
  'GEMINI_API_KEY', 'MINIMAX_API_KEY', 'OPENAI_API_KEY', 'SEEDANCE_CALLBACK_TOKEN'];
for (const k of [...CLAVES, 'GOOGLE_APPLICATION_CREDENTIALS', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'GOOGLE_CLOUD_PROJECT']) delete process.env[k];
process.env.GCLOUD_PROJECT = 'demo-brain-nocobra';
process.env.METADATA_SERVER_DETECTION = 'none';
const intentosDeRed = [];
globalThis.fetch = async (u) => { intentosDeRed.push(`fetch ${String(u).slice(0, 80)}`); throw new Error('sin red'); };
const conectarOriginal = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...a) { intentosDeRed.push('socket'); throw new Error('sin red'); };

let base = new BaseEnMemoria();
instalarLaBase(() => base);
acelerarLasEsperasCortas();
const consola = apuntarLaConsola();

const brain = lib('creator/brain.js');
const { ADAPTERS } = lib('engine/registry.js');
const { RESPUESTAS_POR_CREDIT } = lib('creator/brainUsage.js');
const req = createRequire(import.meta.url);

let fallo = 0;
const check = (nombre, ok, evidencia = '') => { if (!ok) fallo++; process.stdout.write(`${ok ? '✔' : '✘'} ${nombre}${evidencia ? ` · ${evidencia}` : ''}\n`); };
const enviar = (uid, data) => brain.brainChat.run({ auth: { uid }, data: { locale: 'es', ...data } });
const usos = (uid) => base.de('creditTransactions').filter((t) => t.userId === uid && t.type === 'usage');
const contador = (uid) => base.leer(`brainUsage/${uid}`) || {};
const ANA = 'DemoAnaAAAAAAAAAAAAAAAAAAAA1';

/* Un adaptador de IA REAL para el control: solo devuelve texto, no es el demo. Sirve la respuesta del mock. */
const corre = ADAPTERS.mock.run;
const original = { deepseek: { isConfigured: ADAPTERS.deepseek.isConfigured, run: ADAPTERS.deepseek.run }, gemini: { isConfigured: ADAPTERS.gemini.isConfigured, run: ADAPTERS.gemini.run } };
let llamadasReales = 0;
const conIaReal = () => {
  for (const id of ['deepseek', 'gemini']) {
    ADAPTERS[id].isConfigured = () => true;
    ADAPTERS[id].run = async (r) => { llamadasReales++; return corre.call(ADAPTERS.mock, r); };
  }
};
const sinIaReal = () => {
  for (const id of ['deepseek', 'gemini']) { ADAPTERS[id].isConfigured = original[id].isConfigured; ADAPTERS[id].run = original[id].run; }
};

async function mundo() {
  base = new BaseEnMemoria();
  await darDeAlta(base, ANA);
}

/* N1 · doce respuestas de muestra */
await mundo();
sinIaReal();
let chat;
let respuestasDemo = 0;
for (let i = 1; i <= RESPUESTAS_POR_CREDIT; i++) {
  const r = await enviar(ANA, { message: `pregunta ${i}`, messageId: `n1_msg_${i}`, chatId: chat });
  chat = r.chatId;
  if (r.demo === true) respuestasDemo++;
}
check('N1 las doce respuestas son de muestra (demo)', respuestasDemo === RESPUESTAS_POR_CREDIT, `demo=${respuestasDemo}`);
check('N1 el bloque avanza: 12 respuestas contadas', (contador(ANA).respuestasTotales ?? 0) === RESPUESTAS_POR_CREDIT, `totales=${contador(ANA).respuestasTotales}`);
check('N1 la duodécima de muestra NO cobra: ningún asiento de uso', usos(ANA).length === 0, `asientos=${usos(ANA).length}`);
check('N1 el saldo queda intacto (240)', saldoDe(base, ANA) === 240, `saldo=${saldoDe(base, ANA)}`);

/* N2 · una búsqueda de muestra: la reserva se devuelve */
await mundo();
sinIaReal();
const b = await enviar(ANA, { message: 'busca algo', messageId: 'n2_busq', webSearch: true });
const asientos = usos(ANA);
check('N2 la búsqueda de muestra se responde como demo', b.demo === true, `demo=${b.demo}`);
check('N2 se devuelve su reserva: un asiento REFUNDED, ninguno COMPLETED', asientos.length === 1 && asientos[0].status === 'REFUNDED', JSON.stringify(asientos.map((t) => t.status)));
check('N2 la respuesta no lleva Credits', b.credits === 0, `credits=${b.credits}`);
check('N2 el saldo vuelve a 240', saldoDe(base, ANA) === 240, `saldo=${saldoDe(base, ANA)}`);

/* P1 · CONTROL con IA real: la duodécima cobra 1 y la búsqueda cobra 3 */
await mundo();
conIaReal();
llamadasReales = 0;
let chatP;
let ultima;
for (let i = 1; i <= RESPUESTAS_POR_CREDIT; i++) {
  ultima = await enviar(ANA, { message: `pregunta ${i}`, messageId: `p1_msg_${i}`, chatId: chatP });
  chatP = ultima.chatId;
}
check('P1 con IA real la duodécima NO es de muestra', ultima.demo === false, `demo=${ultima.demo}`);
check('P1 con IA real la duodécima cobra 1 Credit', ultima.credits === 1, `credits=${ultima.credits}`);
check('P1 y queda un asiento COMPLETED de 1', usos(ANA).length === 1 && usos(ANA)[0].status === 'COMPLETED' && usos(ANA)[0].amount === -1, JSON.stringify(usos(ANA).map((t) => [t.amount, t.status])));
check('P1 el saldo baja a 239', saldoDe(base, ANA) === 239, `saldo=${saldoDe(base, ANA)}`);
const bp = await enviar(ANA, { message: 'busca con IA real', messageId: 'p1_busq', webSearch: true });
check('P1 con IA real la búsqueda cobra 3 y queda COMPLETED', bp.credits === 3 && usos(ANA).some((t) => t.status === 'COMPLETED' && t.amount === -3), `credits=${bp.credits}`);
check('P1 la conversación con IA real hizo llamadas al proveedor real', llamadasReales > 0, `llamadas=${llamadasReales}`);
sinIaReal();

/* Cierre */
const sinRed = intentosDeRed.length === 0;
check('ninguna conexión fuera del proceso', sinRed, `intentos=${intentosDeRed.length}`);
net.Socket.prototype.connect = conectarOriginal;
consola.restaurar();
process.stdout.write(fallo ? `\n✘ ${fallo} comprobación(es) fallaron\n` : '\n✔ La respuesta de muestra no se cobra; el control con IA real cobra\n');
process.exit(fallo ? 1 : 0);
