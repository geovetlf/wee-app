/*
 * CIERRE DE WEË CORE (post-auditoría 2026-10-01) — LO DEL SERVIDOR, EJECUTADO.
 *
 *   node test/cierre-servidor.test.mjs        (usa el compilado: `npm run build` antes)
 *
 * Cada sección EJECUTA el código compilado (`functions/lib`) con sus dependencias sustituidas, y donde el
 * cambio es de forma lo fija leyendo el fuente:
 *
 *  A. Brain: repetir un mensaje cuyo cobro ya se DEVOLVIÓ no se contesta gratis (cobroYaCerradoSinCobro).
 *  B. Las marcas del guion: la voz no lee el guion entero y el vídeo encuentra su primera escena (danés).
 *  C. money/error-interno-al-cliente: un error que no es de Credits no viaja crudo al cliente.
 *  D. money/admin-balance-con-efecto: la consulta de saldo de administración no escribe.
 *  E. money/secretos-de-mas: cada función monta lo que lee, y un secreto no montado no ensucia el registro.
 *  F. server/prompts-internos: la adaptación de idioma lleva SU sistema y texto plano; el respaldo no impone idioma.
 *  G. server/sanitize: el aviso del Router por un fallo de proveedor va saneado.
 *  H. server/errores-tragados: solo ALREADY_EXISTS es «ya existía»; lo demás se registra; el runtime dice la causa.
 *  I. escala/consulta-sin-limite y la documentación que tenía que decir la verdad.
 *
 * SABOTAJE: la misma suite contra el árbol de ANTES falla (CIERRE_BASE=<carpeta con lib/, src/, docs/ y las
 * reglas de antes> y NODE_PATH=functions/node_modules).
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const BASE = process.env.CIERRE_BASE;
const libDir = BASE ? path.join(BASE, 'lib') : path.resolve(here, '../lib');
const lib = (p) => require(path.join(libDir, p));
const fuente = (rel) => {
  if (!BASE) return fs.readFileSync(path.resolve(RAIZ, rel), 'utf8');
  const enLaBase = rel.replace(/^functions\/src\//, 'src/').replace(/^services\//, '');
  return fs.readFileSync(path.join(BASE, enLaBase), 'utf8');
};
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* Lo que se escribe en el registro mientras corre `fn`. */
const capturarRegistro = async (fn) => {
  const lineas = [];
  const originales = { warn: console.warn, error: console.error, log: console.log, info: console.info, out: process.stdout.write, err: process.stderr.write };
  const anota = (...a) => { lineas.push(a.map((x) => (typeof x === 'string' ? x : x instanceof Error ? x.message : JSON.stringify(x))).join(' ')); };
  console.warn = anota; console.error = anota; console.info = anota;
  process.stderr.write = (chunk, ...r) => { lineas.push(String(chunk)); return true; };
  let valor; let error;
  try { valor = await fn(); } catch (e) { error = e; }
  Object.assign(console, { warn: originales.warn, error: originales.error, log: originales.log, info: originales.info });
  process.stderr.write = originales.err;
  return { lineas, texto: lineas.join('\n'), valor, error };
};

const { initializeApp, getApps } = require('firebase-admin/app');
if (!getApps().length) initializeApp({ projectId: 'demo-wee' });

/*
 * Una clave FALSA con la forma de una de OpenAI, para comprobar que el registro la censura. Se compone al ejecutar,
 * no se escribe entera: así el escáner de secretos (scripts/escaneo-secretos.mjs) sigue sin excepciones para esta
 * suite y, si alguien pega aquí una clave de verdad, la ve.
 */
const SECRETO = ['sk', 'ABCDEFGHIJKLMNOPQRSTUVWX123456'].join('-');
/* El incremento atómico del Firestore de mentira (`fakeBanco`, al final). */
const INC = Symbol('inc');

/* ── A · Brain ──────────────────────────────────────────────────────────── */
console.log('\n── A · Repetir un mensaje ya REEMBOLSADO no lo contesta gratis ──');
{
  const usage = lib('creator/brainUsage.js');
  const cerrado = usage.cobroYaCerradoSinCobro ?? (() => false);
  check('1) un duplicado REEMBOLSADO o FALLIDO es una operación que terminó sin cobro',
    cerrado({ duplicate: true, status: 'REFUNDED' }) === true && cerrado({ duplicate: true, status: 'FAILED' }) === true);
  check('2) …un duplicado en marcha o ya cobrado no lo es, ni un cobro nuevo, ni la ausencia de cobro',
    usage.cobroYaCerradoSinCobro !== undefined
    && !cerrado({ duplicate: true, status: 'AUTHORIZED' }) && !cerrado({ duplicate: true, status: 'COMPLETED' })
    && !cerrado({ duplicate: false, status: 'AUTHORIZED' }) && !cerrado(null) && !cerrado(undefined));

  const d = (o) => usage.queHacerConElCobro(o);
  const todas = [true, false].flatMap((cobrado) => [true, false].flatMap((entregada) => [true, false].flatMap((devolverEsSeguro) =>
    [true, false].map((contadaAqui) => ({ cobrado, entregada, devolverEsSeguro, contadaAqui })))));
  check('3) con el cobro ya cerrado, el `catch` NUNCA completa ni reembolsa (no hay nada que cerrar)',
    todas.every((h) => { const r = d({ ...h, cerradoSinCobro: true }); return !r.completar && !r.reembolsar; }));
  check('4) …y devuelve el bloque solo si ESTA invocación lo contó y no se entregó',
    todas.every((h) => d({ ...h, cerradoSinCobro: true }).deshacerBloque === (h.contadaAqui && !h.entregada)));
  check('5) CONTROL: sin esa marca, la regla de siempre no cambia',
    JSON.stringify(d({ cobrado: true, entregada: false, devolverEsSeguro: true, contadaAqui: true })) === JSON.stringify({ completar: false, reembolsar: true, deshacerBloque: true })
    && JSON.stringify(d({ cobrado: true, entregada: true, devolverEsSeguro: true, contadaAqui: true })) === JSON.stringify({ completar: true, reembolsar: false, deshacerBloque: false }));

  const BRAIN = sinComentarios(fuente('functions/src/creator/brain.ts'));
  const busqueda = BRAIN.indexOf('if (cobroYaCerradoSinCobro(spend)) throw new EngineError(\'DUPLICATE_REQUEST\');');
  check('6) búsqueda (cobro por delante): se rechaza ANTES de guardar el mensaje y de llamar al modelo',
    busqueda > 0 && busqueda > BRAIN.indexOf("reason: 'Weë Brain · búsqueda'") && busqueda < BRAIN.indexOf('await messages.doc(messageId).set(') && busqueda < BRAIN.indexOf('engine.generate('));
  const conversacion = BRAIN.search(/if \(cobroYaCerradoSinCobro\(cobroDelBloque\)\) \{\s*cerradoSinCobro = true;\s*throw new EngineError\('DUPLICATE_REQUEST'\);\s*\}\s*spend = cobroDelBloque;/);
  check('7) conversación (cobro tras generar): no se guarda la respuesta, se marca y se dice DUPLICATE_REQUEST',
    conversacion > 0 && conversacion < BRAIN.indexOf('await messages.doc(`${messageId}_wee`).set('));
  check('8) y el `catch` recibe la marca: deshace el bloque contado y no completa ni reembolsa',
    /const cobro = queHacerConElCobro\(\{ cobrado: !!spend, entregada, devolverEsSeguro, contadaAqui, cerradoSinCobro \}\);\s*if \(cobro\.deshacerBloque\) \{\s*await deshacerRespuesta\(uid, messageId\)/.test(BRAIN));

  /* El motor de hoy ya lanza ALREADY_REFUNDED ante ese duplicado: lo de arriba es la regla de Brain, no un parche del motor. */
  const { createCreditEngine } = lib('credits/creditEngine.js');
  const banco = fakeBanco();
  const motor = createCreditEngine({ db: () => banco.db, increment: (n) => ({ [INC]: n }), now: () => ++banco.reloj, welcomeCredits: 240, loadCosts: async () => {} });
  banco.db.docs.set('users/perfil_ana', { uid: 'ana', displayName: 'Ana' });
  await motor.ensureAccount('ana');
  await motor.spendCredits({ userId: 'ana', service: 'ai_search', amount: 1, requestId: 'brain_m1', source: 'weë-brain' });
  await motor.refundCredits({ userId: 'ana', requestId: 'brain_m1', reason: 'no pudo', source: 'weë-brain' });
  const otraVez = await motor.spendCredits({ userId: 'ana', service: 'ai_search', amount: 1, requestId: 'brain_m1', source: 'weë-brain' }).then(() => null, (e) => e);
  check('9) CONTROL: el Credit Engine de hoy lanza ALREADY_REFUNDED al repetir un cobro devuelto (la rama de Brain es la segunda cerradura)',
    otraVez?.code === 'ALREADY_REFUNDED', String(otraVez?.code));
}

/* ── B · Las marcas del guion ───────────────────────────────────────────── */
console.log('\n── B · Las marcas del guion, en danés ──');
{
  const { narrationFrom, buildVideoPrompt } = lib('creator/prompts.js');
  const traducido = 'Scene 1 (0–3 sek.): Et kig ind i caféen ved solopgang, varmt lys.\nScene 2 (3–7 sek.): Baristaen hælder mælk.\nScene 3 (7–10 sek.): Kunden smiler.\nFORTÆLLING: Kom og smag kaffen.';
  check('10) un guion con la marca TRADUCIDA no se lee entero en voz alta: no hay narración inequívoca',
    narrationFrom([traducido], 'En reklame') === '', JSON.stringify(narrationFrom([traducido], 'En reklame')));
  const video = buildVideoPrompt('En reklame', 'varm', [traducido]);
  check('11) y el vídeo encuentra su primera escena por el tiempo que el guion pidió («0–3»), aunque «Escena» esté traducida',
    /Opening scene: Et kig ind i caféen ved solopgang, varmt lys\./.test(video), video);
  const variante = 'Escena 1 (0–3 s): Et kig ind i caféen.\nEscena 2 (3–7 s): Baristaen.\n**Narracion :** Kom og smag kaffen, der vækker din dag.';
  check('12) la MISMA marca con otra caja, sin acento, con espacios y en negrita se reconoce, sin los asteriscos',
    narrationFrom([variante], 'x') === 'Kom og smag kaffen, der vækker din dag.', JSON.stringify(narrationFrom([variante], 'x')));
  check('13) …y con los dos puntos de ancho completo',
    narrationFrom(['Escena 1: x\nNARRACIÓN：Kom og smag.'], 'x') === 'Kom og smag.');
  check('14) …y con el texto en la línea siguiente a la marca',
    narrationFrom(['ESCENA 1: x\nNARRACIÓN:\nKom og smag.\nDen er god.\n\nAndet'], 'x') === 'Kom og smag. Den er god.');
  const porEscena = 'Escena 1 (0–3 s): Caféen.\nNarración: Godmorgen.\nEscena 2 (3–7 s): Mælken.\nNarración: Kaffen er klar.\nNARRACIÓN: Godmorgen. Kaffen er klar. Kom forbi.';
  check('15) si hay narración por escena y la línea final del contrato, manda la del contrato (antes salía la primera escena)',
    narrationFrom([porEscena], 'x') === 'Godmorgen. Kaffen er klar. Kom forbi.', JSON.stringify(narrationFrom([porEscena], 'x')));
  check('16) «ESCENA 1» en mayúsculas sigue dando la primera escena',
    /Opening scene: Caféen ved havnen/.test(buildVideoPrompt('x', '', ['ESCENA 1 (0–3 s): Caféen ved havnen.\nESCENA 2: y'])));
  check('17) CONTROL: el contrato exacto, como siempre', narrationFrom(['Escena 1 (0–3 s): plano.\nNARRACIÓN: Ven a probar el café.'], 'x') === 'Ven a probar el café.'
    && /Opening scene: plano de la cafetería/.test(buildVideoPrompt('x', '', ['Escena 1 (0–3 s): plano de la cafetería.'])));
  check('18) CONTROL: un texto que NO es un guion (Weë Music, «Una voz o narración») se lee tal cual',
    narrationFrom(['Kom og smag kaffen. Den er god.'], 'x') === 'Kom og smag kaffen. Den er god.');
  check('19) CONTROL: sin escena reconocible, el vídeo no se inventa ninguna', !/Opening scene/.test(buildVideoPrompt('x', '', ['Bare en tekst uden scener.'])));
}

/* ── C · Error interno al cliente ───────────────────────────────────────── */
console.log('\n── C · Un error que no es de Credits no viaja crudo ──');
{
  const { toHttpsError, CreditError } = lib('credits/creditValidation.js');
  const crudo = new Error(`Firestore: users/doc_ana PERMISSION_DENIED Authorization: Bearer ${SECRETO}`);
  const r = await capturarRegistro(() => toHttpsError(crudo));
  check('20) el cliente recibe un código genérico, sin el mensaje interno', r.valor?.code === 'internal' && !/Firestore|users\/doc_ana|PERMISSION_DENIED|sk-/.test(String(r.valor?.message) + JSON.stringify(r.valor?.details ?? {})), String(r.valor?.message));
  check('21) y lo interno queda en el registro del servidor, saneado', /CREDITS: fallo interno/.test(r.texto) && /PERMISSION_DENIED/.test(r.texto) && !r.texto.includes(SECRETO), r.texto.slice(0, 160));
  const ce = toHttpsError(new CreditError('INSUFFICIENT_CREDITS', 'No tienes suficientes Credits', { required: 3, available: 1 }));
  check('22) CONTROL: un error de Credits sigue viajando con su código y sus detalles', ce.code === 'failed-precondition' && ce.details?.code === 'INSUFFICIENT_CREDITS' && ce.details?.required === 3);
}

/* ── D · Saldo de administración, de solo lectura ───────────────────────── */
console.log('\n── D · Mirar un saldo no escribe ──');
{
  const { createCreditEngine } = lib('credits/creditEngine.js');
  const banco = fakeBanco();
  const motor = createCreditEngine({ db: () => banco.db, increment: (n) => ({ [INC]: n }), now: () => ++banco.reloj, welcomeCredits: 240, loadCosts: async () => {} });
  banco.db.docs.set('users/perfil_bea', { uid: 'bea', displayName: 'Bea' });
  const antes = banco.db.commits;
  const leido = typeof motor.readBalance === 'function' ? await motor.readBalance('bea') : undefined;
  check('23) una cuenta sin inicializar se contesta con 0 y «sin inicializar», sin una sola escritura ni bienvenida',
    leido?.balance === 0 && leido?.initialized === false && banco.db.commits === antes && !banco.db.docs.has('creditTransactions/grant_welcome_bea') && banco.db.read('users/perfil_bea').creditsBalance === undefined,
    JSON.stringify(leido));
  await motor.ensureAccount('bea');
  const despues = banco.db.commits;
  const ya = typeof motor.readBalance === 'function' ? await motor.readBalance('bea') : undefined;
  check('24) una cuenta inicializada da su saldo real, también sin escribir', ya?.balance === 240 && ya?.initialized === true && banco.db.commits === despues);

  /* El callable de administración usa esa lectura, y no la de la app. */
  const credits = lib('credits/index.js');
  const motorReal = lib('credits/creditEngine.js').creditEngine;
  const originales = { readBalance: motorReal.readBalance, getBalance: motorReal.getBalance, ensureAccount: motorReal.ensureAccount };
  const llamadas = [];
  motorReal.readBalance = async (u) => { llamadas.push('readBalance:' + u); return { userId: u, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0, initialized: false }; };
  motorReal.getBalance = async (u) => { llamadas.push('getBalance:' + u); return { userId: u, balance: 240, lifetimeEarned: 240, lifetimeSpent: 0 }; };
  motorReal.ensureAccount = async (u) => { llamadas.push('ensureAccount:' + u); return {}; };
  const r = await credits.creditsAdmin.run({ auth: { uid: 'jefa', token: { admin: true } }, data: { action: 'balance', userId: 'bea' } }).then((v) => v, (e) => e);
  Object.assign(motorReal, originales);
  check('25) `creditsAdmin` → `balance` usa la lectura sin efectos, nunca la que inicializa', llamadas.join(',') === 'readBalance:bea' && r?.initialized === false, llamadas.join(','));
}

/* ── E · Secretos ───────────────────────────────────────────────────────── */
console.log('\n── E · Cada función monta lo que lee ──');
{
  const montados = (f) => ((f && f.__endpoint && f.__endpoint.secretEnvironmentVariables) || []).map((s) => s.key).sort();
  const brain = lib('creator/brain.js');
  const creator = lib('creator/index.js');
  const avatar = lib('generateAvatar.js');
  const video = lib('creator/video.js');
  check('26) el avatar solo monta Gemini (es lo único que lee: vertexAI.ts)',
    JSON.stringify(montados(avatar.generateAvatarWithGemini)) === '["GEMINI_API_KEY"]' && JSON.stringify(montados(avatar.avatarReplacement)) === '["GEMINI_API_KEY"]',
    montados(avatar.generateAvatarWithGemini).join(','));
  check('27) Brain y la conversación del creador no montan el token del webhook (no crean tareas de vídeo)',
    [brain.brainChat, brain.brainQuote, creator.creatorChat, creator.creatorQuote].every((f) => !montados(f).includes('SEEDANCE_CALLBACK_TOKEN') && montados(f).length === 8));
  check('28) CONTROL: las dos que crean tareas de Seedance lo conservan, con las ocho de modelo',
    [creator.creatorRun, video.generateVideo].every((f) => montados(f).includes('SEEDANCE_CALLBACK_TOKEN') && montados(f).length === 9));

  const { secretValue } = lib('secrets.js');
  const k = process.env.K_SERVICE; const a = process.env.ANTHROPIC_API_KEY;
  process.env.K_SERVICE = 'avatarreplacement'; delete process.env.ANTHROPIC_API_KEY;
  const r = await capturarRegistro(() => secretValue('ANTHROPIC_API_KEY'));
  if (k === undefined) delete process.env.K_SERVICE; else process.env.K_SERVICE = k;
  if (a !== undefined) process.env.ANTHROPIC_API_KEY = a;
  check('29) un secreto que la función no monta da undefined SIN un aviso en el registro (el saneador los recorre todos)',
    r.valor === undefined && !/No value found for secret/.test(r.texto), r.texto.slice(0, 120));
}

/* ── F · La adaptación de idioma ────────────────────────────────────────── */
console.log('\n── F · La llamada de adaptación no lleva instrucciones contradictorias ──');
{
  const http = lib('engine/http.js');
  const prompts = lib('creator/prompts.js');
  const { ADAPT_INSTRUCTION } = lib('engine/promptLanguage.js');
  /* Con el código de antes no existe: la entrada era la que estaba escrita a mano en creatorRun. */
  const entrada = prompts.entradaDeAdaptacion ?? ((t) => ({ prompt: t, maxOutputTokens: 400, quality: 'standard' }));
  const texto = `${ADAPT_INSTRUCTION}\n\nCambia el fondo por una playa al atardecer, sin texto.`;
  Object.assign(process.env, { OPENAI_API_KEY: 'oa', ANTHROPIC_API_KEY: 'an', DEEPSEEK_API_KEY: 'ds', GEMINI_API_KEY: 'gem' });
  let llamadas = [];
  http.fetchJson = async (url, opciones) => {
    llamadas.push({ url, body: opciones.body });
    if (/anthropic/.test(url)) return { content: [{ type: 'text', text: 'Replace the background with a beach at sunset, no text.' }], usage: { input_tokens: 10, output_tokens: 10 } };
    return { choices: [{ message: { content: 'Replace the background with a beach at sunset, no text.' } }], usage: { prompt_tokens: 10, completion_tokens: 10 } };
  };
  const ctx = { userId: 'u1', jobId: 'j1', experienceId: 'design', goal: 'g' };
  const correr = (adapter, input, capability = 'text.structure') => {
    const model = adapter.models.find((m) => m.capabilities.includes(capability));
    return adapter.run({ capability, model, input, ctx, prefs: {}, timeoutMs: 30_000 });
  };
  /* Contradice a «Rewrite … in English … nothing else»: pedir español, o pedir JSON (lo que añadía Claude). */
  const contradice = (system) => /español/i.test(system) || /SOLO con JSON|JSON válido/i.test(system);
  const { openaiAdapter } = lib('engine/providers/openai.js');
  const { deepseekAdapter } = lib('engine/providers/deepseek.js');
  const { claudeAdapter } = lib('engine/providers/claude.js');
  const { geminiAdapter, __setGeminiClient } = lib('engine/providers/gemini.js');
  let geminiPedidos = [];
  __setGeminiClient({ models: { generateContent: async (p) => { geminiPedidos.push(p); return { text: 'Replace the background.', usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 5 } }; } } });

  const sistemas = [];
  const sinJson = [];
  for (const [nombre, adapter] of [['openai', openaiAdapter], ['deepseek', deepseekAdapter], ['claude', claudeAdapter]]) {
    llamadas = [];
    await correr(adapter, entrada(texto));
    const body = llamadas[0]?.body ?? {};
    const system = nombre === 'claude' ? String(body.system) : String(body.messages?.[0]?.content);
    sistemas.push([nombre, system]);
    sinJson.push([nombre, body.response_format === undefined]);
  }
  geminiPedidos = [];
  await correr(geminiAdapter, entrada(texto));
  sistemas.push(['gemini', String(geminiPedidos[0]?.config?.systemInstruction)]);
  sinJson.push(['gemini', geminiPedidos[0]?.config?.responseMimeType === undefined]);

  check('30) en los cuatro adaptadores, el sistema de la adaptación es el suyo: inglés, sin «español» ni «JSON»',
    sistemas.every(([, s]) => s === prompts.SISTEMA_DE_ADAPTACION && /English/.test(s) && !contradice(s)), sistemas.map(([n, s]) => `${n}: ${s.slice(0, 50)}`).join(' | '));
  check('31) y ninguno enciende el modo JSON para ella (se pide «solo la instrucción»)', sinJson.every(([, ok]) => ok), JSON.stringify(sinJson));
  const CREATOR = sinComentarios(fuente('functions/src/creator/index.ts'));
  check('32) `creatorRun` pide la adaptación con esa entrada, que vive en creator/prompts.ts',
    /runCapability\(\s*'text\.structure',\s*entradaDeAdaptacion\(texto\),/.test(CREATOR) && /SISTEMA_DE_ADAPTACION/.test(fuente('functions/src/creator/prompts.ts')));

  /* El respaldo, cuando una llamada no pasa sistema: ya no impone idioma. */
  const respaldo = [];
  for (const [nombre, adapter] of [['openai', openaiAdapter], ['deepseek', deepseekAdapter], ['claude', claudeAdapter]]) {
    llamadas = [];
    await correr(adapter, { prompt: 'hola' }, 'text.generate');
    const body = llamadas[0]?.body ?? {};
    respaldo.push([nombre, nombre === 'claude' ? String(body.system) : String(body.messages?.[0]?.content)]);
  }
  geminiPedidos = [];
  await correr(geminiAdapter, { prompt: 'hola' }, 'text.generate');
  respaldo.push(['gemini', String(geminiPedidos[0]?.config?.systemInstruction)]);
  check('33) el sistema por defecto de los cuatro adaptadores ya no dice «responde en español»',
    respaldo.every(([, s]) => !/responde[s]? en español/i.test(s) && /Weë/.test(s)), respaldo.map(([n, s]) => `${n}: ${s.slice(0, 60)}`).join(' | '));

  llamadas = [];
  await correr(openaiAdapter, { prompt: 'dame json' });
  check('34) CONTROL: una llamada estructurada normal sigue pidiendo JSON', llamadas[0]?.body?.response_format?.type === 'json_object');
  __setGeminiClient(null);
}

/* ── G · El Router sanea su aviso ───────────────────────────────────────── */
console.log('\n── G · El aviso del Router por un fallo de proveedor va saneado ──');
{
  const { createRouter, memoryHealth } = lib('engine/router.js');
  const { memoryLedger } = lib('engine/ledger.js');
  const { DEFAULT_SETTINGS } = lib('engine/registry.js');
  const proveedor = (id, falla) => ({
    id, name: id, modalities: ['video'],
    models: [{ id: `${id}-1`, provider: id, capabilities: ['video.generate'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.1 } }],
    isConfigured: () => true, supports: (c) => c === 'video.generate',
    async run(req) {
      if (falla) throw Object.assign(new Error(`HTTP 401 {"authorization":"Bearer ${SECRETO}"}`), { retryable: true });
      return { output: { kind: 'video', url: 'https://x/v.mp4' }, costUSD: 1, latencyMs: 1, model: req.model.id };
    },
  });
  const config = {
    providers: { alfa: { enabled: true, priority: 1 }, beta: { enabled: true, priority: 2 } },
    routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'alfa' }, { provider: 'beta' }], policy: 'quality-first' } },
    settings: { ...DEFAULT_SETTINGS }, source: 'test',
  };
  const router = createRouter({ adapters: { alfa: proveedor('alfa', true), beta: proveedor('beta', false) }, loadConfig: async () => config, ledger: memoryLedger(), health: memoryHealth(() => Date.now()), now: () => Date.now() });
  const r = await capturarRegistro(() => router.execute({ capability: 'video.generate', input: { prompt: 'Lima' }, userId: 'u1', jobId: 'j1', stepId: 's1' }));
  check('35) el aviso dice qué falló, sin la credencial', /alfa\/alfa-1 falló en video\.generate/.test(r.texto) && !r.texto.includes(SECRETO) && /credencial omitida/.test(r.texto), r.texto.slice(0, 200));
}

/* ── H · Errores tragados ───────────────────────────────────────────────── */
console.log('\n── H · Solo «ya existía» es «ya existía»; lo demás se registra ──');
{
  const firestore = require('firebase-admin/firestore');
  const docs = new Map();
  let fallaAlCrear = null;
  let lecturas = 0;
  const ref = (p) => ({
    id: p.split('/').pop(),
    get: async () => { lecturas++; return { exists: docs.has(p), data: () => docs.get(p) }; },
    set: async (d) => { docs.set(p, { ...d }); },
    create: async (d) => { if (fallaAlCrear) throw fallaAlCrear; if (docs.has(p)) throw Object.assign(new Error('6 ALREADY_EXISTS'), { code: 6 }); docs.set(p, { ...d }); },
  });
  const getFirestoreReal = firestore.getFirestore;
  firestore.getFirestore = () => ({ collection: (c) => ({ doc: (id) => ref(`${c}/${id}`) }) });
  const content = lib('content/index.js');

  const texto = (assetId) => ({ assetId, ownerAccountId: 'ana', contenido: 'Un guion.', provenance: { createdAt: 1 } });
  const ID = 'asset_' + 'a'.repeat(32);
  fallaAlCrear = Object.assign(new Error(`7 PERMISSION_DENIED Bearer ${SECRETO}`), { code: 7 });
  lecturas = 0;
  const r1 = await capturarRegistro(() => content.crearMaterialDeTexto(texto(ID)));
  check('36) un permiso denegado al crear NO se trata como «ya existía»: no se busca la de otro, se registra y no hay material',
    r1.valor === null && lecturas === 0 && /no se pudo crear el material de texto/.test(r1.texto) && !r1.texto.includes(SECRETO), r1.texto.slice(0, 160));
  fallaAlCrear = null;
  docs.set(`assets/${ID}`, { assetId: ID, ownerAccountId: 'ana', kind: 'text', status: 'ready', provenance: { createdAt: 0 } });
  const r2 = await content.crearMaterialDeTexto(texto(ID));
  check('37) CONTROL: ALREADY_EXISTS (código 6) sigue devolviendo la ficha que ya estaba', r2?.assetId === ID && r2?.provenance?.createdAt === 0);

  const subida = (assetId) => ({ assetId, ownerAccountId: 'ana', kind: 'image', mimeType: 'image/png', storageRef: { provider: 'wee', bucket: 'get-wee.firebasestorage.app', objectKey: 'users/ana/uploads/x.png' }, provenance: { createdAt: 1 } });
  const ID2 = 'asset_' + 'b'.repeat(32);
  fallaAlCrear = Object.assign(new Error('14 UNAVAILABLE'), { code: 14 });
  const r3 = await capturarRegistro(() => content.crearMaterialParaSubida(subida(ID2)));
  check('38) en la subida, una caída de red no es «inválido» ni «ya estaba»: se registra y se lanza (reintentable)',
    r3.error?.code === 14 && /no se pudo crear la ficha para la subida/.test(r3.texto), JSON.stringify(r3.valor ?? r3.error?.message));
  fallaAlCrear = null;
  docs.set(`assets/${ID2}`, { assetId: ID2, ownerAccountId: 'ana', kind: 'image', status: 'uploading', storageRef: subida(ID2).storageRef, provenance: { createdAt: 0 } });
  const r4 = await content.crearMaterialParaSubida(subida(ID2));
  check('39) CONTROL: y ALREADY_EXISTS en la subida sigue siendo «ya estaba»', r4?.status === 'ya_estaba', r4?.status);
  const ya = content.yaExistia ?? (() => true);
  check('40) qué es «ya existía»: el código 6 o su nombre, y nada más', ya({ code: 6 }) && ya({ code: 'already-exists' }) && !ya({ code: 7 }) && !ya({ code: 14 }) && !ya(new Error('x')) && !ya(null));
  firestore.getFirestore = getFirestoreReal;

  /* El runtime: la fila del libro y la reconciliación ya no se callan. */
  const runtime = lib('runtime/index.js');
  const liquidacion = runtime.liquidacionDeWee({
    credits: { completeCredits: async () => ({ status: 'COMPLETED' }), refundCredits: async () => ({ duplicate: false }) },
    ledger: { settle: async () => { throw new Error(`aiGenerations no contesta x-api-key: ${SECRETO}`); } },
  });
  const r5 = await capturarRegistro(() => liquidacion.liquidar({ userId: 'ana', reserva: { requestId: 'video_1', transactionId: 'usage_video_1' }, importe: 5, jobId: 'j1' }));
  check('41) si la fila del libro no se puede liquidar, el cobro sigue cerrado y la causa se registra (saneada)',
    r5.valor?.desenlace === 'liquidada' && /no se pudo liquidar la fila del libro usage_video_1/.test(r5.texto) && !r5.texto.includes(SECRETO), r5.texto.slice(0, 160));
  const informe = { liquidadas: 0 };
  let liquido = false;
  const pasada = runtime.mantenimientoDeWee({
    reconciliacion: async () => { throw new Error(`ModelArk caído Bearer ${SECRETO}`); },
    liquidacion: async () => { liquido = true; return informe; },
  });
  const r6 = await capturarRegistro(() => pasada());
  check('42) si preguntar falla, se liquida igual y la causa queda escrita (saneada)',
    r6.valor?.falloAlPreguntar === true && liquido && /la reconciliación falló/.test(r6.texto) && /ModelArk caído/.test(r6.texto) && !r6.texto.includes(SECRETO), r6.texto.slice(0, 160));
  const RUNTIME = sinComentarios(fuente('functions/src/runtime/index.ts'));
  check('43) y la ficha de un paso que no se pudo crear también lleva su causa', /\} catch \(e\) \{\s*console\.error\(`WEË RUNTIME: no se pudo crear el material del paso[^`]*`, sanitizeForLog\(e, 300\)\);/.test(RUNTIME)
    && !/catch \{\s*\}/.test(RUNTIME) && !/\.catch\(\(\) => undefined\)/.test(RUNTIME));
}

/* ── I · Consultas acotadas y documentación que dice la verdad ──────────── */
console.log('\n── I · Consultas acotadas y documentación que dice la verdad ──');
{
  check('44) el nacimiento busca el perfil acotado (el de id más bajo está siempre en la primera página)',
    /\.where\('uid', '==', perfilUid\)\.limit\(10\)\.get\(\)/.test(fuente('functions/src/identity/nacimiento.ts')));
  check('45) `creditsAdmin` → `failed` usa el techo de siempre (assertLimit), no el número que llegue',
    /\.limit\(assertLimit\(data\.limit\)\)/.test(fuente('functions/src/credits/index.ts')) && !/Number\(data\.limit\) \|\| 50/.test(fuente('functions/src/credits/index.ts')));
  const RUNTIME = fuente('functions/src/runtime/index.ts');
  check('46) el runtime ya no dice «NADIE LA LLAMA TODAVÍA» de lo que llama el barrido desplegado', !/NADIE LA LLAMA TODAVÍA/.test(RUNTIME) && (RUNTIME.match(/LA LLAMA EL BARRIDO DESPLEGADO/g) || []).length === 2);
  const RUNTIME_MD = BASE ? fs.readFileSync(path.join(BASE, 'docs/RUNTIME.md'), 'utf8') : fs.readFileSync(path.resolve(RAIZ, 'docs/RUNTIME.md'), 'utf8');
  check('47) docs/RUNTIME.md: cuatro llamadores de engine.generate, y el webhook ya no guarda la URL firmada',
    !/tres llamadores/.test(RUNTIME_MD) && /\*\*cuatro\*\* llamadores/.test(RUNTIME_MD) && /Corregido en `8a9f098`/.test(RUNTIME_MD));
  const MAPA = BASE ? fs.readFileSync(path.join(BASE, 'docs/CAPABILITY-MAP.md'), 'utf8') : fs.readFileSync(path.resolve(RAIZ, 'docs/CAPABILITY-MAP.md'), 'utf8');
  const proveedores = fs.readdirSync(path.resolve(RAIZ, 'functions/src/engine/providers'));
  check('48) docs/CAPABILITY-MAP.md no cita un adaptador de Suno que no existe',
    !/MiniMax TTS, ElevenMusic, Suno/.test(MAPA) && /No existe ningún adaptador de Suno/.test(MAPA) && !proveedores.some((f) => /suno/i.test(f)));
  const IDENTITY = BASE ? fs.readFileSync(path.join(BASE, 'docs/IDENTITY.md'), 'utf8') : fs.readFileSync(path.resolve(RAIZ, 'docs/IDENTITY.md'), 'utf8');
  const MODERATION = BASE ? fs.readFileSync(path.join(BASE, 'docs/MODERATION.md'), 'utf8') : fs.readFileSync(path.resolve(RAIZ, 'docs/MODERATION.md'), 'utf8');
  check('49) la denuncia sin cuenta nacida está documentada con exactitud: qué cuentas, que la migración NO está preparada, cómo se haría',
    /### 12\.1 Las cuentas que no han nacido/.test(IDENTITY) && /dry-run/i.test(IDENTITY) && /--ejecutar --confirmo-autorizacion/.test(IDENTITY)
    && /\*\*no está preparada\*\*/.test(MODERATION) && !/su migración está preparada y no ejecutada/.test(MODERATION));
  const BIZ = sinComentarios(fuente('services/weeBizService.ts'));
  check('50) la app escribe la reseña en `reviews/{uid}` con setDoc: la segunda de la misma persona actualiza la suya',
    /const reviewRef = doc\(reviewsCol\(businessId\), data\.userId\);\s*await setDoc\(reviewRef,/.test(BIZ) && !/addDoc\(reviewsCol\(/.test(BIZ));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);

/* ── Firestore en memoria para el Credit Engine (la misma forma que credits.test) ── */
function fakeBanco() {
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && !v[INC];
  const resolver = (value, existing, deep) => {
    if (value && typeof value === 'object' && value[INC] !== undefined) return (typeof existing === 'number' ? existing : 0) + value[INC];
    if (deep && isObj(value)) {
      const out = isObj(existing) ? { ...existing } : {};
      for (const [k, v] of Object.entries(value)) out[k] = resolver(v, out[k], true);
      return out;
    }
    return value;
  };
  const db = {
    docs: new Map(), queue: Promise.resolve(), commits: 0,
    read(p) { return this.docs.has(p) ? clone(this.docs.get(p)) : undefined; },
    collection(p) { return coll(p); },
    runTransaction(fn) {
      const run = async () => { const tx = nuevaTx(); const r = await fn(tx); tx.commit(); return r; };
      const pr = this.queue.then(run, run);
      this.queue = pr.catch(() => {});
      return pr;
    },
  };
  const docRef = (p) => ({ path: p, id: p.split('/').pop(), get: async () => { const d = db.read(p); return { exists: d !== undefined, id: p.split('/').pop(), ref: docRef(p), data: () => d }; } });
  const coll = (p, filtros = [], orden = null, max = null) => ({
    doc: (id) => docRef(`${p}/${id || 'auto_' + Math.random().toString(36).slice(2)}`),
    where: (f, _op, v) => coll(p, [...filtros, [f, v]], orden, max),
    orderBy: (f, dir = 'asc') => coll(p, filtros, [f, dir], max),
    limit: (n) => coll(p, filtros, orden, n),
    get: async () => {
      let filas = [...db.docs.entries()].filter(([r]) => r.startsWith(p + '/') && !r.slice(p.length + 1).includes('/'));
      filas = filas.filter(([, d]) => filtros.every(([f, v]) => d[f] === v));
      if (orden) { const [f, dir] = orden; filas.sort(([, a], [, b]) => (a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0) * (dir === 'desc' ? -1 : 1)); }
      if (max) filas = filas.slice(0, max);
      const docs = filas.map(([r, d]) => ({ exists: true, id: r.split('/').pop(), ref: docRef(r), data: () => clone(d) }));
      return { docs, empty: docs.length === 0 };
    },
  });
  const nuevaTx = () => {
    const escrituras = [];
    return {
      get: (t) => t.get(),
      set: (r, data, opts) => escrituras.push({ kind: 'set', r, data, merge: !!(opts && opts.merge) }),
      update: (r, data) => escrituras.push({ kind: 'update', r, data }),
      commit() {
        for (const w of escrituras) {
          const ex = db.docs.get(w.r.path);
          if (w.kind === 'set' && !w.merge) db.docs.set(w.r.path, resolver(w.data, ex, true));
          else if (w.kind === 'set') db.docs.set(w.r.path, resolver(w.data, ex || {}, true));
          else {
            if (!ex) throw new Error('update sobre documento inexistente: ' + w.r.path);
            const out = { ...ex };
            for (const [k, v] of Object.entries(w.data)) out[k] = resolver(v, out[k], false);
            db.docs.set(w.r.path, out);
          }
        }
        if (escrituras.length) db.commits++;
      },
    };
  };
  return { db, reloj: 0 };
}
