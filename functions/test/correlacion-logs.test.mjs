/*
 * CORRELACIÓN Y LOGS LIMPIOS — Frente H (docs/LANZAMIENTO.md § Observabilidad).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Con salidas REALES del código compilado (router del motor, libro de memoria, Gateway del Core con su traza de
 * consola y el saneador `engine/sanitize.ts`), sin red ni proveedores:
 *
 *   A · la petición llega al libro: requestId, jobId, stepId y la transacción de Credits viajan a `aiGenerations`;
 *   B · el log del router se puede atar a su fila del libro (el `registro <generationId>` de la línea);
 *   C · el Gateway del Core escribe requestId y traceId en su línea, y no escribe el prompt;
 *   D · los logs no llevan credenciales: lo que un proveedor devuelve pasa por `sanitizeForLog`;
 *   E · las líneas de log no llevan el prompt, el objetivo de la persona ni su correo.
 *
 * Lo que NO se cumple hoy se imprime como «⚠ HALLAZGO» con su archivo:línea, para el coordinador: este frente no
 * toca functions/src. Un hallazgo no hace fallar la suite; si alguien lo corrige, la suite lo dice («ya resuelto»).
 *
 * Usa el compilado: `npm run build` antes.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0; let n = 0; const hallazgos = [];
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
/** Un hueco conocido: no falla la suite, se informa. `presente` = el hueco sigue ahí. */
const hallazgo = (donde, que, presente) => {
  if (presente) { hallazgos.push(`${donde} — ${que}`); console.log(`⚠ HALLAZGO ${donde} — ${que}`); }
  else console.log(`✔ (ya resuelto) ${donde} — ${que}`);
};

/** Captura lo que el código escribe con console.* mientras corre `fn`. */
const capturar = async (fn) => {
  const lineas = [];
  const orig = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  for (const k of Object.keys(orig)) console[k] = (...a) => lineas.push(a.map((x) => (x instanceof Error ? `${x.message}\n${x.stack}` : typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
  try { return { valor: await fn(), lineas }; } catch (e) { return { error: e, lineas }; } finally { Object.assign(console, orig); }
};

const { createRouter, memoryHealth } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const { sanitizeForLog } = lib('engine/sanitize.js');
const verificacion = lib('engine/verification.js');
verificacion.recordRealSuccess = async () => {};

/* Datos privados de una persona que NUNCA deben salir en un log. */
const PROMPT = 'Retrato de mi hija Lucía en su cumpleaños, calle Mayor 12';
const OBJETIVO = 'sorpresa para mi pareja, no se lo digas a nadie';
const CORREO = 'lucia.perez@ejemplo.com';
/* Claves FALSAS, compuestas en tiempo de ejecución para que el escáner de secretos del repositorio no las tome por reales. */
const TOKEN = ['sk', 'proj', 'ABCDEFGHIJKLMNOPQRSTUVWX0123456789'].join('-');

const proveedor = (id, run) => ({
  id, name: id, modalities: ['text'], calls: 0,
  models: [{ id: `${id}-1`, provider: id, capabilities: ['text.generate'], quality: 4, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
  isConfigured: () => true, supports: (c) => c === 'text.generate',
  run,
});
const config = (chain) => ({
  providers: { alfa: { enabled: true, priority: 1 }, beta: { enabled: true, priority: 2 } },
  routing: { 'text.generate': { capability: 'text.generate', chain, policy: 'balanced' } },
  settings: { ...DEFAULT_SETTINGS, allowMockFallback: false },
  source: 'test',
});
const pedido = {
  capability: 'text.generate', input: { prompt: `${PROMPT} (${CORREO})` },
  userId: 'cuenta-0001', jobId: 'job_0001', stepId: 'paso_1', requestId: 'job_0001:paso_1',
  creditTransactionId: 'usage_job_0001:paso_1', service: 'ai_text', goal: OBJETIVO,
};
const limpia = (l) => !l.includes(PROMPT) && !l.includes(OBJETIVO) && !l.includes(CORREO) && !l.includes(TOKEN);

/* ═══ A + B · Router legacy: de la petición al libro y al log ═══════════════ */
console.log('\n── A · La petición llega al libro ──');
{
  const ledger = memoryLedger();
  const alfa = proveedor('alfa', async (req) => ({ output: { kind: 'text', content: 'respuesta' }, costUSD: 0.002, latencyMs: 3, model: req.model.id }));
  const router = createRouter({ adapters: { alfa }, loadConfig: async () => config([{ provider: 'alfa' }]), ledger, health: memoryHealth(() => 1), now: () => 1 });
  const { valor, lineas, error } = await capturar(() => router.execute(pedido));
  check('el router atiende la petición (sin error)', !error && valor && valor.generationId, error ? String(error.message) : '');
  const fila = valor ? ledger.records[valor.generationId] : {};
  check('A) la fila del libro lleva requestId, jobId, stepId y la transacción de Credits de la petición',
    fila.requestId === pedido.requestId && fila.jobId === pedido.jobId && fila.stepId === pedido.stepId && fila.creditTransactionId === pedido.creditTransactionId,
    JSON.stringify({ requestId: fila.requestId, jobId: fila.jobId, stepId: fila.stepId, tx: fila.creditTransactionId }));
  check('A) y la cuenta y el servicio (para cuadrar con el asiento usage_<requestId>)', fila.userId === pedido.userId && fila.service === 'ai_text' && pedido.creditTransactionId === `usage_${pedido.requestId}`);
  console.log('\n── B · El log se ata a su fila ──');
  const atendio = lineas.find((l) => / atendió text\.generate /.test(l)) || '';
  check('B) la línea «atendió» lleva el id de la fila del libro (registro <generationId>)', atendio.includes(`registro ${valor && valor.generationId}`), atendio);
  check('E) ninguna línea del router lleva el prompt, el objetivo, el correo ni una clave', lineas.every(limpia), lineas.filter((l) => !limpia(l)).join(' | '));
  hallazgo('functions/src/engine/router.ts:509', 'la línea «atendió» no lleva requestId ni jobId: para ir del log al trabajo hay que leer la fila del libro (aiGenerations/<generationId>)', !atendio.includes(pedido.requestId));
  hallazgo('functions/src/engine/router.ts:509', 'la línea «atendió» no lleva el coste del proveedor (USD): Cloud Monitoring no puede sumar el gasto desde el log y el «coste anómalo» depende de la sonda de aiUsage', !/usd|USD|\$/.test(atendio));
  hallazgo('functions/src/engine/router.ts:422 (`...ctx` en ledger.open)', '`goal` —el objetivo escrito por la persona— se copia a la fila de aiGenerations (legible por su dueño, no es un log; pero es contenido privado en un libro contable)', fila.goal === OBJETIVO);
}

console.log('\n── D · Un fallo de proveedor llega al log saneado ──');
{
  const ledger = memoryLedger();
  const cuerpo = `401 Unauthorized: {"error":"invalid key","authorization":"Bearer ${TOKEN}","echo":"${CORREO}"}`;
  const alfa = proveedor('alfa', async () => { throw new Error(cuerpo); });
  const router = createRouter({ adapters: { alfa }, loadConfig: async () => config([{ provider: 'alfa' }]), ledger, health: memoryHealth(() => 1), now: () => 1 });
  const { lineas, error } = await capturar(() => router.execute(pedido));
  const fallo = lineas.find((l) => / falló en text\.generate/.test(l)) || '';
  check('D) el fallo se registra y la petición termina en error controlado', !!fallo && !!error, fallo);
  check('D) la línea del fallo NO lleva la clave que devolvió el proveedor', !fallo.includes(TOKEN) && /credencial omitida/.test(fallo), fallo);
  const filas = Object.values(ledger.records);
  check('D) la fila FAILED del libro tampoco lleva la clave', filas.length === 1 && filas[0].status === 'FAILED' && !String(filas[0].error).includes(TOKEN), String(filas[0] && filas[0].error));
  hallazgo('functions/src/engine/sanitize.ts:24-40 (PATTERNS)', 'el saneador no quita correos: el correo que un proveedor devuelva en su error llega al log y a aiGenerations.error', fallo.includes(CORREO));
  hallazgo('functions/src/engine/router.ts:529', 'la línea «falló en» no lleva generationId ni requestId: un fallo del log no se puede atar a su fila FAILED ni a su trabajo', !fallo.includes(pedido.requestId) && !Object.keys(ledger.records).some((id) => fallo.includes(id)));
}

{
  const { lineas, error } = await capturar(async () => {
    const router = createRouter({ adapters: {}, loadConfig: async () => config([{ provider: 'alfa' }]), ledger: memoryLedger(), health: memoryHealth(() => 1), now: () => 1 });
    return router.execute(pedido);
  });
  const ninguno = lineas.find((l) => /ningún proveedor disponible/.test(l)) || '';
  check('D) sin proveedor: NOT_AVAILABLE y una línea que la alerta «IA no disponible» sabe contar', error && error.code === 'NOT_AVAILABLE' && !!ninguno, ninguno);
  hallazgo('functions/src/engine/router.ts:407', 'la línea «ningún proveedor disponible» no lleva requestId: la alerta cuenta, pero no dice a quién le pasó', !ninguno.includes(pedido.requestId));
}

/* ═══ C · Gateway del Core: requestId y traceId en la línea ═════════════════ */
console.log('\n── C · El Gateway del Core firma su línea con requestId y traceId ──');
{
  const core = lib('core/index.js');
  const motor = lib('engine/gateway.js');
  const registro = lib('registry/index.js');
  const adaptador = (falla) => ({
    id: 'x', name: 'x', modalities: ['text'],
    models: [{ id: 'x-1', provider: 'x', capabilities: ['text.generate'], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
    isConfigured: () => true, supports: (c) => c === 'text.generate',
    async run() {
      if (falla) throw new Error(`user ${CORREO} upstream 500 x-api-key: ${TOKEN}`);
      return { output: { kind: 'text', content: 'listo' }, usage: { inputTokens: 1, outputTokens: 1 }, costUSD: 0.001, latencyMs: 3 };
    },
  });
  const correr = (falla) => capturar(async () => {
    const adapters = { x: adaptador(falla) };
    const cfg = { providers: {}, settings: DEFAULT_SETTINGS };
    const gateway = core.crearGateway({
      registry: core.crearRegistro(registro.datosDelRegistro(adapters, cfg.providers)),
      executor: motor.crearEjecutorDelMotor({ adapters, config: () => cfg, now: () => 1_800_000_000_000 }),
      tracer: motor.trazaDeConsola, now: () => 1_800_000_000_000,
    });
    return gateway.ejecutar({
      contract: core.GATEWAY_CONTRACT_VERSION, capability: 'text.generate',
      implementation: { providerId: 'x', modelId: 'x-1' }, input: { prompt: PROMPT },
      trace: { traceId: 'traza_0001', requestId: 'brain_0001', userId: 'cuenta-0001' },
    });
  });
  const ok = await correr(false);
  const linea = ok.lineas.find((l) => /WEË AI GATEWAY: /.test(l)) || '';
  check('C) una línea por operación con requestId y traceId', /requestId=brain_0001/.test(linea) && /traceId=traza_0001/.test(linea), linea);
  check('C) y sin el prompt', ok.lineas.every(limpia));
  const mal = await correr(true);
  const lineasMal = mal.lineas.join('\n');
  check('C) el fallo de un proveedor por el Core también lleva requestId', /falló en text\.generate \(brain_0001\)/.test(lineasMal), lineasMal.slice(0, 300));
  check('D) …y sin la clave', !lineasMal.includes(TOKEN));
  hallazgo('functions/src/engine/gateway.ts:486 (sanitize.ts sin patrón de correo)', 'el correo devuelto por el proveedor llega a la línea del Core', lineasMal.includes(CORREO));
  const { CAMPOS_PROHIBIDOS, trazaLimpia } = lib('core/observability.js');
  check('C) la traza del Core rechaza los campos prohibidos (prompt, token, password…)', ['prompt', 'token', 'password', 'authorization', 'apiKey'].every((k) => CAMPOS_PROHIBIDOS.includes(k)) && !trazaLimpia({ requestId: 'a', prompt: 'x' }) && trazaLimpia({ requestId: 'a', traceId: 'b' }));
}

/* ═══ D · El saneador, caso a caso (salidas reales) ═════════════════════════ */
console.log('\n── D · sanitizeForLog ──');
{
  process.env.GEMINI_API_KEY = 'clave-de-prueba-que-no-tiene-forma-0001';
  const casos = {
    bearer: `Authorization: Bearer ${TOKEN}`,
    cabeceraJson: `{"x-api-key":"${TOKEN}"}`,
    xiApiKey: '{"xi-api-key":"abcd1234efgh5678"}',
    google: 'key AIzaSyA1234567890abcdefghijklmnopq',
    anthropic: ['sk', 'ant', 'api03', 'abcdefghijklmnop'].join('-'),
    jwt: 'token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    url: 'GET https://api.x.com/v1?key=supersecreta123&x=1',
    cookie: 'set-cookie: session=abcdef123456',
    password: '{"password":"hunter2hunter2"}',
    secretoConocido: 'error con clave-de-prueba-que-no-tiene-forma-0001 dentro',
  };
  const sucios = Object.entries(casos).filter(([, v]) => {
    const s = sanitizeForLog(v, 500);
    return [TOKEN, 'abcd1234efgh5678', 'AIzaSyA1234567890', 'sk-ant-api03', 'eyJhbGciOiJIUzI1NiJ9.eyJ', 'supersecreta123', 'abcdef123456', 'hunter2', 'clave-de-prueba-que-no'].some((x) => s.includes(x));
  }).map(([k]) => k);
  check('D) Bearer, x-api-key, xi-api-key, AIza, sk-ant, JWT, ?key=, cookie, password y el valor de un secreto montado se omiten', sucios.length === 0, sucios.join(', '));
  check('D) y el texto se recorta (200 por defecto)', sanitizeForLog('x'.repeat(5000)).length <= 201);
  delete process.env.GEMINI_API_KEY;
  hallazgo('functions/src/engine/sanitize.ts:27', 'un `"token":"…"` suelto (sin access_/refresh_ ni Bearer) en el cuerpo de un error no se omite', sanitizeForLog('{"token":"tok_live_0123456789"}').includes('tok_live_0123456789'));
}

/* ═══ E · Fuera del motor: lo que se escribe a mano ═════════════════════════ */
console.log('\n── E · Lugares que escriben al log por su cuenta ──');
{
  const vertex = leer('functions/src/vertexAI.ts');
  const idx = leer('functions/src/index.ts');
  hallazgo('functions/src/vertexAI.ts:130', "el avatar escribe su prompt en el log («Prompt: …», 200 caracteres): lleva género, tono de piel y edad elegidos por la persona", /console\.log\('Prompt:', prompt/.test(vertex));
  hallazgo('functions/src/vertexAI.ts:182 y :320', 'el texto que devuelve Gemini en lugar de la imagen va al log entero y sin sanear', /console\.error\('Gemini returned text instead of image:', part\.text\)/.test(vertex));
  hallazgo('functions/src/index.ts:295', 'el mensaje de error de Expo Push va al log sin sanear; en DeviceNotRegistered Expo incluye el ExponentPushToken del dispositivo', /console\.error\('Error en push:', result\.data\.message\)/.test(idx));
  const sinSanear = [...leer('functions/src/engine/router.ts').matchAll(/console\.(warn|error)\(`[^`]*\$\{(?!sanitizeForLog|provider|capability|candidate|why|Math)[^}]*message[^}]*\}/g)];
  check('E) el router no escribe ningún `message` de un error sin pasarlo por sanitizeForLog', sinSanear.length === 0, sinSanear.map((m) => m[0]).join(' | '));
}

console.log(`\n${hallazgos.length} hallazgo(s) para el coordinador (no hacen fallar la suite).`);
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
