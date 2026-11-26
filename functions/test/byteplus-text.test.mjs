/*
 * TEXTO DE BYTEPLUS (Seed por la Chat API de ModelArk).
 *
 * Qué se vigila, siempre con la red simulada (no hay clave aquí y nunca se llama a la API real):
 *  A · EL CONTRATO de la petición: URL, Bearer, modelo, system + historial + usuario, max_tokens / thinking.
 *  B · LA RESPUESTA: texto, `usage` (con razonamiento) hacia el libro, coste 0 + `tarifaPendiente` sin tarifa.
 *  C · LOS ERRORES: 401, 429, 5xx, cortada, filtrada, vacía, sin clave → errores controlados en español.
 *  D · LA CLAVE nunca aparece en un error ni en un registro.
 *  E · EL REGISTRO: una sola línea nueva en ADAPTERS, desactivado y fuera de toda cadena por defecto.
 *  F · LA RUTA PROPIA (`routeKey`): sin `aiRouting/character.text` nada cambia; con ella, los personajes van por BytePlus.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/engine/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

for (const k of ['ARK_API_KEY', 'ARK_BASE_URL', 'ARK_TEXT_MODEL']) delete process.env[k];
const CLAVE = 'ark-clave-secreta-de-prueba-123456';

const T = lib('providers/byteplusText.js');
const { classifyError } = lib('errors.js');
const { NotConfiguredError, ProviderError } = lib('http.js');

/* fetch simulado: guarda cada llamada y contesta lo que se le diga. */
let llamadas = [];
const fetchOriginal = globalThis.fetch;
const simular = (estado, cuerpo) => {
  llamadas = [];
  globalThis.fetch = async (url, init) => {
    llamadas.push({ url: String(url), init, body: init?.body ? JSON.parse(init.body) : undefined });
    const texto = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
    return { ok: estado >= 200 && estado < 300, status: estado, text: async () => texto, json: async () => JSON.parse(texto), headers: new Map() };
  };
};
const ok = (contenido = 'Hola, soy Jay Reads. Mi libro va de dragones.', extra = {}) => ({
  id: 'r1', model: 'seed-2-0-lite-260428',
  choices: [{ index: 0, message: { role: 'assistant', content: contenido }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160, completion_tokens_details: { reasoning_tokens: 0 } },
  ...extra,
});
const modelo = T.byteplusTextModels.find((m) => m.id === T.SEED_TEXT_LITE);
const peticion = (input = {}, model = modelo) => ({
  capability: 'text.generate', model, ctx: { userId: 'u1', requestId: 'req-1' }, prefs: {}, timeoutMs: 5_000,
  input: { system: 'Eres Jay Reads.', prompt: 'Cuéntame de tu libro', history: [{ role: 'user', text: 'Hola' }, { role: 'model', text: '¡Hola!' }], temperature: 0.8, maxOutputTokens: 400, ...input },
});
const fallo = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

/* Capturar todo lo que se registra, para comprobar que la clave no sale. */
const registrado = [];
for (const nivel of ['log', 'warn', 'error', 'info']) {
  const orig = console[nivel];
  console[nivel] = (...args) => { registrado.push(args.map((a) => (a instanceof Error ? a.message + ' ' + a.stack : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')); if (nivel === 'log') orig(...args); };
}

console.log('\n── A · Contrato de la petición ──');
{
  process.env.ARK_API_KEY = CLAVE;
  simular(200, ok());
  await T.byteplusTextAdapter.run(peticion());
  const c = llamadas[0];
  check('POST a {ARK_BASE_URL}/chat/completions (región por defecto ap-southeast)', c.url === 'https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions' && c.init.method === 'POST', c.url);
  check('Bearer con la clave de ModelArk de siempre (ARK_API_KEY)', c.init.headers.Authorization === `Bearer ${CLAVE}` && c.init.headers['Content-Type'] === 'application/json');
  const b = c.body;
  check('el modelo es el id que eligió el router', b.model === 'seed-2-0-lite-260428');
  check('mensajes: system, historial traducido a user/assistant y el mensaje del usuario al final',
    JSON.stringify(b.messages.map((m) => m.role)) === '["system","user","assistant","user"]' && b.messages[0].content === 'Eres Jay Reads.' && b.messages[2].content === '¡Hola!' && b.messages[3].content === 'Cuéntame de tu libro', JSON.stringify(b.messages));
  check('razonamiento apagado por defecto y techo de RESPUESTA con max_tokens (nunca junto a max_completion_tokens)', b.thinking?.type === 'disabled' && b.max_tokens === 400 && !('max_completion_tokens' in b));
  check('temperatura la del pedido', b.temperature === 0.8);

  simular(200, ok());
  await T.byteplusTextAdapter.run(peticion({ thinking: true, maxOutputTokens: 999_999, temperature: 7 }));
  const r = llamadas[0].body;
  check('con razonamiento pedido: thinking enabled y max_completion_tokens (cubre respuesta + razonamiento), con techo', r.thinking.type === 'enabled' && r.max_completion_tokens === T.LIMITES_BYTEPLUS_TEXTO.maxTokensConRazonamiento && !('max_tokens' in r));
  check('la temperatura se acota a [0, 2]', r.temperature === 2);

  simular(200, ok());
  const largo = 'x'.repeat(100_000);
  await T.byteplusTextAdapter.run(peticion({ prompt: largo, system: largo, history: Array.from({ length: 60 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: largo })) }));
  const l = llamadas[0].body.messages;
  check('límites de tamaño: sistema, prompt, 24 turnos y 6 000 caracteres por turno',
    l[0].content.length === T.LIMITES_BYTEPLUS_TEXTO.caracteresDelSistema && l.at(-1).content.length === T.LIMITES_BYTEPLUS_TEXTO.caracteresDelPrompt && l.length === 1 + 24 + 1 && l[1].content.length === 6000);

  simular(200, ok());
  process.env.ARK_BASE_URL = 'https://ark.otra-region.example/api/v3';
  await T.byteplusTextAdapter.run(peticion());
  check('la región se cambia con ARK_BASE_URL, sin tocar código', llamadas[0].url === 'https://ark.otra-region.example/api/v3/chat/completions');
  delete process.env.ARK_BASE_URL;

  const vacio = await fallo(() => T.byteplusTextAdapter.run(peticion({ prompt: '', history: [] })));
  check('sin nada que responder: INVALID_REQUEST en español y sin llamar a la API', vacio?.name === 'EngineError' && vacio.code === 'INVALID_REQUEST' && /Falta/.test(vacio.message));
}

console.log('\n── B · Respuesta, usage y coste ──');
{
  simular(200, ok('  Mi libro va de dragones.  ', { usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150, completion_tokens_details: { reasoning_tokens: 20 } } }));
  const r = await T.byteplusTextAdapter.run(peticion());
  check('el texto sale de choices[0].message.content, recortado', r.output.kind === 'text' && r.output.content === 'Mi libro va de dragones.');
  check('usage de tokens para el libro (entrada, salida y razonamiento)', r.usage.inputTokens === 100 && r.usage.outputTokens === 50 && r.usage.reasoningTokens === 20, JSON.stringify(r.usage));
  check('tarifa oficial null: coste del proveedor 0 marcado como pendiente (no gratis)', r.costUSD === 0 && r.meta.tarifaPendiente === true && T.TARIFAS_OFICIALES_BYTEPLUS_TEXTO[T.SEED_TEXT_LITE] === null && T.TARIFAS_OFICIALES_BYTEPLUS_TEXTO[T.SEED_TEXT_MINI] === null);
  check('modelo y motivo de terminación viajan al libro', r.model === 'seed-2-0-lite-260428' && r.meta.finishReason === 'stop' && typeof r.latencyMs === 'number');

  simular(200, ok('ok', { usage: { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 } }));
  const conTarifa = await T.byteplusTextAdapter.run(peticion({}, { ...modelo, cost: { unit: 'mtoken', usd: 0.1, usdOutput: 0.4 } }));
  check('si la administración pone la tarifa en aiProviders, el coste medido sale solo (providerCost separado de los Credits)', Math.abs(conTarifa.costUSD - 0.5) < 1e-9 && !conTarifa.meta.tarifaPendiente);
}

console.log('\n── C · Errores controlados ──');
{
  simular(401, { error: { code: 'AuthenticationError', message: `The API key ${CLAVE} is invalid` } });
  const e401 = await fallo(() => T.byteplusTextAdapter.run(peticion()));
  check('401: ProviderError no reintentable', e401 instanceof ProviderError && e401.status === 401 && e401.retryable === false);
  const c401 = classifyError(e401);
  check('401 → PROVIDER_ERROR con la frase en español para la app', c401.code === 'PROVIDER_ERROR' && /No te cobré/.test(c401.message));

  simular(429, { error: { code: 'RateLimitExceeded', message: 'too many requests' } });
  const e429 = await fallo(() => T.byteplusTextAdapter.run(peticion()));
  check('429: reintentable (el router puede pasar al siguiente eslabón)', e429 instanceof ProviderError && e429.status === 429 && e429.retryable === true);

  for (const estado of [500, 503]) {
    simular(estado, 'Internal error');
    const e = await fallo(() => T.byteplusTextAdapter.run(peticion()));
    check(`${estado}: reintentable y clasificado como PROVIDER_ERROR`, e instanceof ProviderError && e.status === estado && e.retryable === true && classifyError(e).code === 'PROVIDER_ERROR');
  }

  simular(200, { choices: [{ message: { content: 'a medias' }, finish_reason: 'length' }], usage: { prompt_tokens: 5, completion_tokens: 400 } });
  const corte = await fallo(() => T.byteplusTextAdapter.run(peticion()));
  check('cortada por el techo (length): no pasa por buena y dice cuánto gastó', corte instanceof ProviderError && /techo de tokens/.test(corte.message) && /completion_tokens: 400/.test(corte.message));

  simular(200, { choices: [{ message: { content: '' }, finish_reason: 'content_filter' }], usage: {} });
  const filtro = await fallo(() => T.byteplusTextAdapter.run(peticion()));
  check('interceptada por el filtro del proveedor (content_filter): error no reintentable', filtro instanceof ProviderError && filtro.retryable === false && /filtro de contenido/.test(filtro.message));

  simular(200, { choices: [{ message: { content: '   ' }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 0 } });
  const vacia = await fallo(() => T.byteplusTextAdapter.run(peticion()));
  check('respuesta vacía: error, nunca un texto vacío cobrado', vacia instanceof ProviderError && /vacía/.test(vacia.message));

  delete process.env.ARK_API_KEY;
  simular(200, ok());
  const sin = await fallo(() => T.byteplusTextAdapter.run(peticion()));
  check('sin clave: NotConfiguredError (el router lo salta) y ninguna llamada', sin instanceof NotConfiguredError && llamadas.length === 0 && T.byteplusTextAdapter.isConfigured() === false);
  check('sin clave → NOT_AVAILABLE para la app', classifyError(sin).code === 'NOT_AVAILABLE');
  process.env.ARK_API_KEY = CLAVE;
}

console.log('\n── D · La clave nunca se registra ──');
{
  simular(500, `upstream echoed Authorization: Bearer ${CLAVE}`);
  const e = await fallo(() => T.byteplusTextAdapter.run(peticion()));
  check('el mensaje del error no lleva la clave aunque el proveedor la devuelva', e && !e.message.includes(CLAVE), e?.message);
  simular(200, { choices: [{ message: { content: '' }, finish_reason: 'content_filter' }] });
  await fallo(() => T.byteplusTextAdapter.run(peticion()));
  check('nada de lo registrado contiene la clave', registrado.length > 0 && registrado.every((linea) => !linea.includes(CLAVE)), String(registrado.length));
  const fuente = leer('functions/src/engine/providers/byteplusText.ts');
  check('el adaptador no escribe la clave ni el cuerpo en ningún registro', !/console\.\w+\([^)]*(apiKey|ARK_API_KEY|headers|body)/.test(fuente));
}

console.log('\n── E · Registro, verificación y cadena ──');
{
  const R = lib('registry.js');
  const fuente = leer('functions/src/engine/registry.ts');
  const bloque = fuente.slice(fuente.indexOf('export const ADAPTERS'), fuente.indexOf('};', fuente.indexOf('export const ADAPTERS')));
  check('UNA sola línea nueva en ADAPTERS', bloque.split(/\r?\n/).filter((linea) => /byteplus-text|byteplusText/.test(linea)).length === 1 && R.ADAPTERS['byteplus-text'] === T.byteplusTextAdapter);
  check('nace DESACTIVADO, con tope de llamadas mientras no hay tarifa', R.DEFAULT_PROVIDERS['byteplus-text']?.enabled === false && R.DEFAULT_PROVIDERS['byteplus-text'].limits?.maxCallsPerDay > 0);
  check('fuera de TODAS las cadenas por defecto', Object.values(R.DEFAULT_ROUTING).every((r) => r.chain.every((l) => l.provider !== 'byteplus-text')));
  check('la cadena de text.generate sigue siendo gemini → claude → openai (también la usa Weë Brain)', R.DEFAULT_ROUTING['text.generate'].chain.map((l) => l.provider).join('>') === 'gemini>claude>openai');
  const { DECLARED, isAtLeast } = lib('verification.js');
  const v = DECLARED['byteplus-text'];
  check('estado DOCUMENTATION_VERIFIED con la clave de ModelArk y la documentación oficial, sin presumir llamada real', v?.state === 'DOCUMENTATION_VERIFIED' && v.credential === 'ARK_API_KEY' && /^https:\/\/docs\.byteplus\.com\//.test(v.docsUrl) && !isAtLeast(v.state, 'REAL_API_VERIFIED'));
  check('solo atiende text.generate; modelos equilibrado y económico declarados', T.byteplusTextAdapter.supports('text.generate') && !T.byteplusTextAdapter.supports('image.generate') && !!T.byteplusTextModels.find((m) => m.id === T.SEED_TEXT_MINI));
  check('modelo por defecto documentado y cambiable con ARK_TEXT_MODEL', T.ARK_TEXT_MODEL === T.SEED_TEXT_LITE && /env\('ARK_TEXT_MODEL'\)/.test(leer('functions/src/engine/providers/byteplusText.ts')));
  check('la URL de la API vive solo en el adaptador', /\/chat\/completions/.test(leer('functions/src/engine/providers/byteplusText.ts')) && !/bytepluses/.test(leer('functions/src/personajes/acciones.ts')));
  check('esta suite está en la cadena de `npm test`', /byteplus-text\.test\.mjs/.test(leer('functions/package.json')));
}

console.log('\n── F · Ruta propia de los personajes ──');
{
  const { createRouter, memoryHealth, rutaPropia, prefsConRutaPropia } = lib('router.js');
  const { memoryLedger } = lib('ledger.js');
  const R = lib('registry.js');
  const fake = (id, modelId) => ({
    id, name: id, modalities: ['text'], models: [{ id: modelId, provider: id, capabilities: ['text.generate'], quality: 3, speed: 4, cost: { unit: 'mtoken', usd: 0.3, usdOutput: 1.2 } }],
    isConfigured: () => true, supports: (c) => c === 'text.generate',
    async run(req) { return { output: { kind: 'text', content: id }, costUSD: 0.001, latencyMs: 1, model: req.model.id }; },
  });
  const adapters = { gemini: fake('gemini', 'gem'), deepseek: fake('deepseek', 'deepseek-flash'), 'byteplus-text': T.byteplusTextAdapter };
  const config = (routingExtra = {}, providersExtra = {}) => ({
    providers: { ...R.DEFAULT_PROVIDERS, ...providersExtra },
    routing: { 'text.generate': R.DEFAULT_ROUTING['text.generate'], ...routingExtra },
    settings: { ...R.DEFAULT_SETTINGS, pricingMode: 'simulated', allowMockFallback: false },
    source: 'test',
  });
  const prefsDelPersonaje = { modelId: 'deepseek-flash', allowedProviders: ['deepseek'], routeKey: 'character.text' };
  const pedir = { capability: 'text.generate', input: { prompt: 'hola' }, userId: 'u1', requestId: 'r1', prefs: prefsDelPersonaje };
  const router = (cfg) => createRouter({ adapters, loadConfig: async () => cfg, ledger: memoryLedger(), health: memoryHealth() });

  const sinRuta = await router(config()).route(pedir);
  check('SIN aiRouting/character.text: nada cambia, va por DeepSeek por su nombre (el respaldo de siempre)', sinRuta.candidates.map((c) => c.provider).join('>') === 'deepseek' && sinRuta.candidates[0].model.id === 'deepseek-flash');
  check('sin ruta, las preferencias quedan intactas', prefsConRutaPropia(config(), prefsDelPersonaje) === prefsDelPersonaje && rutaPropia(config(), prefsDelPersonaje) === undefined);

  const rutaBP = { 'character.text': { capability: 'character.text', chain: [{ provider: 'byteplus-text', model: T.SEED_TEXT_MINI }, { provider: 'deepseek', model: 'deepseek-flash' }], policy: 'balanced' } };
  const apagado = await router(config(rutaBP)).route(pedir);
  check('con la ruta pero el proveedor sin encender: se salta («desactivado») y responde DeepSeek, el eslabón de respaldo', apagado.candidates.map((c) => c.provider).join('>') === 'deepseek' && apagado.skipped.some((s) => s.provider === 'byteplus-text' && /desactivado/.test(s.reason)));

  const encendido = config(rutaBP, { 'byteplus-text': { ...R.DEFAULT_PROVIDERS['byteplus-text'], enabled: true } });
  const conRuta = await router(encendido).route(pedir);
  check('con la ruta y el proveedor encendido: BytePlus Seed Mini primero, DeepSeek de respaldo', conRuta.candidates.map((c) => `${c.provider}:${c.model.id}`).join('>') === `byteplus-text:${T.SEED_TEXT_MINI}>deepseek:deepseek-flash`, conRuta.candidates.map((c) => c.provider).join('>'));

  simular(200, ok('Soy Jay y respondo por BytePlus.'));
  const ledger = memoryLedger();
  const r = await createRouter({ adapters, loadConfig: async () => encendido, ledger, health: memoryHealth() }).execute({ ...pedir, creditsEstimated: 0 });
  const fila = Object.values(ledger.records).find((x) => x.provider === 'byteplus-text');
  check('de punta a punta: responde BytePlus y el libro guarda proveedor, modelo y coste del proveedor aparte', r.provider === 'byteplus-text' && r.output.content === 'Soy Jay y respondo por BytePlus.' && fila?.model === T.SEED_TEXT_MINI && fila?.providerCost === 0, JSON.stringify(fila));

  const otros = await router(encendido).route({ capability: 'text.generate', input: { prompt: 'hola' }, userId: 'u1', requestId: 'r2', prefs: { modelId: 'deepseek-flash', allowedProviders: ['deepseek'] } });
  check('Weë Brain (sin routeKey) no se entera de la ruta de los personajes', otros.candidates.map((c) => c.provider).join('>') === 'deepseek');
  const chef = await router(encendido).route({ capability: 'text.generate', input: { prompt: 'hola' }, userId: 'u1', requestId: 'r3' });
  check('y el resto de Weë sigue con su cadena: BytePlus no entra como respaldo de nadie', chef.candidates.every((c) => c.provider !== 'byteplus-text'));

  check('las acciones del personaje piden su ruta propia sin perder su elección de siempre', /routeKey: RUTA_DE_TEXTO_DEL_PERSONAJE/.test(leer('functions/src/personajes/acciones.ts')) && /RUTA_DE_TEXTO_DEL_PERSONAJE = 'character\.text'/.test(leer('functions/src/personajes/acciones.ts')));
}

globalThis.fetch = fetchOriginal;
console.log(failures ? `\n✘ ${failures} comprobaciones fallaron` : '\n✔ byteplus-text: todo en orden');
process.exit(failures ? 1 : 0);
