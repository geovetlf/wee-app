import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/engine/' + p));

const { createRouter, memoryHealth, resolveQuality, pickModel } = lib('router.js');
const { memoryLedger } = lib('ledger.js');
const { DEFAULT_SETTINGS } = lib('registry.js');
const { CREDIT_COSTS, serviceForCapability } = require(path.resolve(here, '../lib/credits/creditCosts.js'));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

// Proveedores falsos con la misma interfaz que los reales
const fake = (id, models, opts = {}) => ({
  id,
  name: id,
  modalities: ['video'],
  models: models.map((m) => ({ provider: id, capabilities: ['video.generate'], speed: 3, cost: { unit: 'second', usd: 0.1 }, ...m })),
  isConfigured: () => opts.configured !== false,
  supports: (c) => c === 'video.generate' || c === 'text.generate',
  calls: 0,
  async run(req) {
    this.calls++;
    if (opts.fail) throw Object.assign(new Error(id + ' falló'), { retryable: true });
    return { output: { kind: 'video', url: `https://${id}/${req.model.id}.mp4` }, costUSD: 1, latencyMs: 5, model: req.model.id };
  },
});

const mock = { id: 'mock', name: 'demo', modalities: ['video'], models: [{ id: 'demo', provider: 'mock', capabilities: ['video.generate', 'text.generate'], quality: 1, speed: 5, cost: { unit: 'call', usd: 0 } }], isConfigured: () => true, supports: () => true, calls: 0, async run() { this.calls++; return { output: { kind: 'video', url: 'demo' }, costUSD: 0, latencyMs: 1 }; } };

const config = (overrides = {}) => ({
  providers: { alpha: { enabled: true, priority: 1 }, seedance: { enabled: true, priority: 2 }, gamma: { enabled: true, priority: 3 }, mock: { enabled: true, priority: 99 }, ...(overrides.providers || {}) },
  routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'alpha' }, { provider: 'seedance' }, { provider: 'gamma' }], policy: 'quality-first' }, ...(overrides.routing || {}) },
  settings: { ...DEFAULT_SETTINGS, ...(overrides.settings || {}) },
  source: 'test',
});

const build = (adapters, cfg, now) => {
  const ledger = memoryLedger();
  const health = memoryHealth(now);
  const router = createRouter({ adapters, loadConfig: async () => cfg, ledger, health, now });
  return { router, ledger, health };
};

const req = (extra = {}) => ({ capability: 'video.generate', input: { prompt: 'una persona caminando por Lima de noche' }, userId: 'u1', jobId: 'j1', stepId: 's1', ...extra });

// 1) Orden de la cadena y salto de proveedores sin clave
{
  const alpha = fake('alpha', [{ id: 'alpha-3', quality: 5 }], { configured: false });
  const seedance = fake('seedance', [{ id: 'seedance-pro', quality: 4 }]);
  const gamma = fake('gamma', [{ id: 'gamma-2', quality: 4 }]);
  const { router } = build({ alpha, seedance, gamma, mock }, config());
  const decision = await router.route(req());
  check('sin clave se salta (alpha), el orden sigue la cadena y el demo no se cuela detrás de video real', decision.candidates.map((c) => c.provider).join('>') === 'seedance>gamma', decision.candidates.map((c) => c.provider).join('>'));
  check('el motivo del salto es legible', decision.skipped[0]?.reason === 'sin clave configurada', JSON.stringify(decision.skipped));
}

// 2) Fallback automático cuando el primero falla + libro de generaciones
{
  const alpha = fake('alpha', [{ id: 'alpha-3', quality: 5 }], { fail: true });
  const seedance = fake('seedance', [{ id: 'seedance-pro', quality: 4 }]);
  const gamma = fake('gamma', [{ id: 'gamma-2', quality: 4 }]);
  const { router, ledger } = build({ alpha, seedance, gamma, mock }, config({ settings: { pricingMode: 'real' } }));
  // Una generación que de verdad se cobra va atada a su transacción de Credits:
  // es lo que separa un cobro real de un paso interno de Weë.
  const result = await router.execute(req({ creditTransactionId: 'usage_j1' }));
  check('alpha falla → Seedance atiende', result.provider === 'seedance' && result.attempts === 2, `${result.provider} en ${result.attempts} intentos`);
  const records = Object.values(ledger.records);
  check('cada intento queda registrado (fallido + exitoso) con estados del libro', records.length === 2 && records[0].status === 'FAILED' && records[1].status === 'COMPLETED', JSON.stringify(records.map((r) => [r.provider, r.status, r.creditsCharged])));
  check('el registro separa providerCost (USD) del precio del paso y guarda la salida', records[1].providerCost === 1 && records[1].providerCurrency === 'USD' && records[1].creditsEstimated === Math.ceil(1 * 100 * 1.3) && records[1].outputType === 'video' && records[1].inputType === 'text', JSON.stringify(records[1]));
  check('cerrar NO declara ningún cobro: creditsCharged queda ausente hasta liquidar', records[1].creditsCharged === undefined);
  check('las filas nuevas llevan la versión 2 de la semántica del libro', records[0].ledgerVersion === 2 && records[1].ledgerVersion === 2);
  check('el registro guarda usuario, modelo, tipo, duración y error', records[0].userId === 'u1' && records[0].model === 'alpha-3' && records[0].capability === 'video.generate' && typeof records[0].durationMs === 'number' && /falló/.test(records[0].error), JSON.stringify(records[0]));
  check('Credits reales = USD × creditsPerUsd × (1+margen)', result.credits === Math.ceil(1 * 100 * 1.3), String(result.credits));
  check('en modo real el demo NO entra si hay candidatos reales', !result.decision.candidates.some((c) => c.provider === 'mock'));
}

// 3) Calidad: "cinematográfico" exige máxima → modelo de calidad 5; "borrador" → barato
{
  const alpha = fake('alpha', [{ id: 'alpha-fast', quality: 4, cost: { unit: 'second', usd: 0.15 } }, { id: 'alpha-3', quality: 5, cost: { unit: 'second', usd: 0.4 } }]);
  const { router } = build({ alpha, mock }, config({ routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'alpha' }], policy: 'balanced' } } }));
  const max = await router.route(req({ input: { prompt: 'video cinematográfico de una persona caminando por Lima de noche' } }));
  check('escena cinematográfica → calidad max y el mejor modelo', max.quality === 'max' && max.candidates[0].model.id === 'alpha-3', `${max.quality} ${max.candidates[0].model.id}`);
  const light = await router.route(req({ input: { prompt: 'un borrador rápido de prueba' } }));
  check('escena sencilla → calidad standard y el modelo más barato', light.quality === 'standard' && light.candidates[0].model.id === 'alpha-fast', `${light.quality} ${light.candidates[0].model.id}`);
}

// 4) Política cost-first ordena por precio; tope de Credits descarta caros
{
  const alpha = fake('alpha', [{ id: 'alpha-3', quality: 5, cost: { unit: 'second', usd: 0.4 } }]);
  const seedance = fake('seedance', [{ id: 'seedance-lite', quality: 4, cost: { unit: 'second', usd: 0.02 } }]);
  const { router } = build({ alpha, seedance, mock }, config({ routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'alpha' }, { provider: 'seedance' }], policy: 'cost-first' } }, settings: { pricingMode: 'real' } }));
  const d = await router.route(req({ prefs: { quality: 'high', durationSec: 8 } }));
  check('cost-first pone primero al más barato que cumple la calidad', d.candidates[0].provider === 'seedance', d.candidates.map((c) => `${c.provider}:${c.estimatedCredits}`).join(','));
  const capped = await router.route(req({ prefs: { quality: 'high', durationSec: 8, maxCredits: 50 } }));
  check('maxCredits descarta al caro', !capped.candidates.some((c) => c.provider === 'alpha') && capped.skipped.some((s) => /tope/.test(s.reason)), JSON.stringify(capped.skipped));
}

// 5) Cortacircuitos: tras 3 fallos el proveedor queda en pausa y luego vuelve
{
  let t = 1_000_000;
  const now = () => t;
  const alpha = fake('alpha', [{ id: 'alpha-3', quality: 5 }], { fail: true });
  const gamma = fake('gamma', [{ id: 'gamma-2', quality: 4 }]);
  const { router, health } = build({ alpha, gamma, mock }, config({ routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'alpha' }, { provider: 'gamma' }], policy: 'quality-first' } } }), now);
  for (let i = 0; i < 3; i++) await router.execute(req());
  check('3 fallos abren el cortacircuitos', health.isOpen('alpha'));
  const d = await router.route(req());
  check('en pausa, el router ni lo intenta', d.candidates[0].provider === 'gamma' && d.skipped.some((s) => /pausa/.test(s.reason)), JSON.stringify(d.skipped));
  t += DEFAULT_SETTINGS.circuitBreaker.openMs + 1;
  check('pasado el tiempo vuelve a probarlo', !health.isOpen('alpha'));
}

// 6) Proveedor desactivado desde administración y cadena reconfigurada
{
  const alpha = fake('alpha', [{ id: 'alpha-3', quality: 5 }]);
  const gamma = fake('gamma', [{ id: 'gamma-2', quality: 4 }]);
  const cfg = config({ providers: { alpha: { enabled: false, priority: 1 } }, routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'gamma' }, { provider: 'alpha' }], policy: 'balanced' } } });
  const { router } = build({ alpha, gamma, mock }, cfg);
  const d = await router.route(req());
  check('desactivado por admin no se usa y la cadena manda', d.candidates[0].provider === 'gamma' && d.skipped.some((s) => s.provider === 'alpha' && /desactivado/.test(s.reason)));
}

// 7) Sin ningún proveedor real: modo demo atiende (y cobra precio de prueba)
{
  const alpha = fake('alpha', [{ id: 'alpha-3', quality: 5 }], { configured: false });
  const { router } = build({ alpha, mock }, config());
  const result = await router.execute(req());
  check('sin claves, atiende el modo demo', result.provider === 'mock' && result.demo === true);
  check('en modo prueba cobra el precio del catálogo de Credits de la capacidad', result.credits === CREDIT_COSTS[serviceForCapability('video.generate', {})], String(result.credits));
}

// 8) Nada disponible en modo real sin fallback demo → error claro
{
  const alpha = fake('alpha', [{ id: 'alpha-3', quality: 5 }], { configured: false });
  const { router } = build({ alpha, mock }, config({ settings: { pricingMode: 'real', allowMockFallback: false } }));
  let error = null;
  try { await router.execute(req()); } catch (e) { error = e; }
  check('error controlado NOT_AVAILABLE con mensaje amable (el motivo técnico queda en el registro)', error && error.code === 'NOT_AVAILABLE' && /no hay un proveedor disponible/.test(error.message) && !/sin clave/.test(error.message), error && error.message);
}

// 9) pickModel y resolveQuality directos
{
  const alpha = fake('alpha', [{ id: 'a', quality: 2, cost: { unit: 'second', usd: 0.01 } }, { id: 'b', quality: 4, cost: { unit: 'second', usd: 0.1 } }, { id: 'c', quality: 5, cost: { unit: 'second', usd: 0.5 } }]);
  check('pickModel high/balanced → el más barato que cumple (b)', pickModel(alpha, 'video.generate', 'high', 'balanced').id === 'b');
  check('pickModel max/quality-first → c', pickModel(alpha, 'video.generate', 'max', 'quality-first').id === 'c');
  check('pickModel con modelo fijado', pickModel(alpha, 'video.generate', 'standard', 'balanced', undefined, 'a').id === 'a');
  check('resolveQuality respeta prefs', resolveQuality({ capability: 'video.generate', input: {}, prefs: { quality: 'standard' } }) === 'standard');
  check('resolveQuality: imagen por defecto high', resolveQuality({ capability: 'image.generate', input: {} }) === 'high');
}

// 10) Fase 2 — Gemini: búsqueda, PDF y audio van al modelo 3.x más barato compatible
{
  const { DEFAULT_ROUTING } = lib('registry.js');
  const { geminiAdapter, TEXT_MODEL_MULTI } = lib('providers/gemini.js');
  const pinned = (cap) => DEFAULT_ROUTING[cap].chain[0];
  const spec = geminiAdapter.models.find((m) => m.id === TEXT_MODEL_MULTI);
  check('el modelo multimodal de Gemini existe en el adaptador', !!spec, TEXT_MODEL_MULTI);
  check('declara búsqueda, PDF y audio', !!spec && ['text.search', 'doc.read', 'audio.transcribe'].every((c) => spec.capabilities.includes(c)));
  check('es de la generación 3.x, requisito del cupo gratuito de búsqueda', /^gemini-3\./.test(TEXT_MODEL_MULTI), TEXT_MODEL_MULTI);
  for (const cap of ['text.search', 'doc.read', 'audio.transcribe']) {
    check(`${cap} queda fijado a ese modelo y no a otro más caro`, pinned(cap).provider === 'gemini' && pinned(cap).model === TEXT_MODEL_MULTI, JSON.stringify(pinned(cap)));
  }
  const pro = geminiAdapter.models.filter((m) => m.capabilities.includes('text.generate')).sort((a, b) => b.quality - a.quality)[0];
  check('la máxima calidad usa un modelo estable, nunca uno en preview', !!pro && !/preview/.test(pro.id), pro && pro.id);
  const barato = geminiAdapter.models.filter((m) => m.capabilities.includes('vision.describe')).sort((a, b) => a.cost.usd - b.cost.usd)[0];
  check('mirar una foto lo hace el modelo más barato con visión', !!barato && barato.id === 'gemini-3.1-flash-lite', barato && `${barato.id} $${barato.cost.usd}`);

  // Ningún modelo de la familia 2.5 puede seguir en las rutas de producción:
  // la API los devuelve como "no longer available to new users" (404).
  const retirados = geminiAdapter.models.filter((m) => /^gemini-(1\.|2\.)/.test(m.id));
  check('no queda ningún modelo Gemini 2.x configurado', retirados.length === 0, retirados.map((m) => m.id).join(', '));
  const estandar = pickModel(geminiAdapter, 'text.generate', 'standard', 'balanced');
  check('el texto estándar usa Gemini 3.1 Flash-Lite', estandar && estandar.id === 'gemini-3.1-flash-lite', estandar && estandar.id);

  // Texto máximo: Gemini 3.8 Flash con razonamiento bajo
  const { thinkingFor } = lib('providers/gemini.js');
  const { TEXT_RATES } = require(path.resolve(here, '../lib/credits/aiPricing.js'));
  check('el modelo de máxima calidad es Gemini 3.8 Flash', pro && pro.id === 'gemini-3.8-flash', pro && pro.id);
  // Guarda para la fase 4: si Claude entra en el nivel máximo, esta tarifa se queda corta
  check('la tarifa del nivel máximo coincide con el modelo que lo sirve', !!pro && pro.cost.usd === TEXT_RATES.max.input, pro && `modelo $${pro.cost.usd} vs tarifa $${TEXT_RATES.max.input}`);
  check('el texto máximo pide razonamiento bajo a Gemini 3', JSON.stringify(thinkingFor('gemini-3.8-flash', 'max')) === JSON.stringify({ thinkingConfig: { thinkingLevel: 'LOW' } }), JSON.stringify(thinkingFor('gemini-3.8-flash', 'max')));
  check('el resto de tareas deja el razonamiento por defecto del modelo', Object.keys(thinkingFor('gemini-3.8-flash', 'standard')).length === 0);
  check('a Gemini 2.5 Pro no se le manda presupuesto cero: no permite apagar el razonamiento', Object.keys(thinkingFor('gemini-2.5-pro', 'max')).length === 0);
  check('Gemini 2.5 Flash-Lite sí apaga el razonamiento', thinkingFor('gemini-2.5-flash-lite', 'standard').thinkingConfig.thinkingBudget === 0);
}

// 11) El modo demo NUNCA sustituye a un proveedor real que falla
{
  const rutaTexto = { 'text.generate': { capability: 'text.generate', chain: [{ provider: 'alpha' }], policy: 'balanced' } };
  const modeloTexto = [{ id: 'alpha-t', quality: 4, capabilities: ['text.generate'] }];
  const cfgTexto = () => config({ routing: rutaTexto, settings: { pricingMode: 'simulated' } });

  // a) Con proveedor real configurado, el demo no entra en la lista
  {
    const alpha = fake('alpha', modeloTexto);
    const { router } = build({ alpha, mock }, cfgTexto());
    const decision = await router.route(req({ capability: 'text.generate' }));
    check('con proveedor real configurado el demo no es candidato', !decision.candidates.some((c) => c.provider === 'mock'), decision.candidates.map((c) => c.provider).join('>'));
    check('la decisión declara que existe proveedor real', decision.realProviderAvailable === true);
  }

  // b) Si el único proveedor real falla, se lanza error y NO se devuelve demo
  {
    const alpha = fake('alpha', modeloTexto, { fail: true });
    const demo = { ...mock, calls: 0 };
    const { router, ledger } = build({ alpha, mock: demo }, cfgTexto());
    let lanzado = null;
    try { await router.execute(req({ capability: 'text.generate' })); } catch (e) { lanzado = e; }
    check('si el único proveedor real falla, el motor lanza error en vez de devolver demo', !!lanzado, lanzado && (lanzado.code || lanzado.message));
    check('el demo no llegó a ejecutarse', demo.calls === 0, 'llamadas al demo: ' + demo.calls);
    check('el fallo real queda registrado con el proveedor que falló', Object.values(ledger.records).some((r) => r.provider === 'alpha' && r.status === 'FAILED'));
    check('ningún registro quedó completado por el demo', !Object.values(ledger.records).some((r) => r.provider === 'mock' && r.status === 'COMPLETED'));
  }

  // c) Sin ningún proveedor real configurado, el demo sí atiende
  {
    const alpha = fake('alpha', modeloTexto, { configured: false });
    const demo = { ...mock, calls: 0 };
    const { router } = build({ alpha, mock: demo }, cfgTexto());
    const decision = await router.route(req({ capability: 'text.generate' }));
    check('sin proveedor real configurado el demo sí es candidato', decision.candidates.some((c) => c.provider === 'mock'), decision.candidates.map((c) => c.provider).join('>'));
    check('la decisión declara que no existe proveedor real', decision.realProviderAvailable === false);
  }

  // d) La protección que ya tenía el video sigue en pie
  {
    const alpha = fake('alpha', [{ id: 'alpha-v', quality: 4 }], { fail: true });
    const demo = { ...mock, calls: 0 };
    const { router } = build({ alpha, mock: demo }, config({ routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'alpha' }], policy: 'quality-first' } } }));
    let lanzado = null;
    try { await router.execute(req()); } catch (e) { lanzado = e; }
    check('el video mantiene su protección: Seedance que falla no cae al demo', !!lanzado && demo.calls === 0);
  }
}

// 12) Una cadena incompleta NO puede empujar la operación al modo demo
{
  const CAP = 'image.background_remove';
  const editor = { ...fake('seedream', [{ id: 'sd-lite', quality: 4, capabilities: [CAP] }]), supports: (c) => c === CAP, modalities: ['image'] };
  // El demo de estas pruebas tiene que saber atender la capacidad, o no sería
  // candidato por su propia lista de modelos y las comprobaciones pasarían en falso.
  const demoImg = () => ({ ...mock, calls: 0, models: [{ ...mock.models[0], capabilities: [...mock.models[0].capabilities, CAP] }] });

  // a) La cadena NO lista a seedream, pero seedream es el único real capaz
  {
    const demo = demoImg();
    const cfg = config({ providers: { seedream: { enabled: true, priority: 1 } }, routing: { [CAP]: { capability: CAP, chain: [{ provider: 'alpha' }], policy: 'balanced' } } });
    const { router } = build({ seedream: editor, mock: demo }, cfg);
    const d = await router.route(req({ capability: CAP }));
    check('cadena incompleta: el demo NO entra si existe un proveedor real capaz', !d.candidates.some((c) => c.provider === 'mock'), d.candidates.map((c) => c.provider).join('>') || '(sin candidatos)');
    check('la decisión ve al proveedor real aunque la cadena no lo liste', d.realProviderAvailable === true);
    let lanzado = null;
    try { await router.execute(req({ capability: CAP })); } catch (e) { lanzado = e; }
    check('sin candidatos por una cadena mal puesta se lanza error, no se sirve demo', !!lanzado && demo.calls === 0, lanzado && (lanzado.code || lanzado.message));
  }

  // b) Excluido por preferencia de la petición: sigue contando como real
  {
    const demo = demoImg();
    const cfg = config({ providers: { seedream: { enabled: true, priority: 1 } }, routing: { [CAP]: { capability: CAP, chain: [{ provider: 'seedream' }], policy: 'balanced' } } });
    const { router } = build({ seedream: editor, mock: demo }, cfg);
    const d = await router.route({ ...req({ capability: CAP }), prefs: { excludeProviders: ['seedream'] } });
    check('excluido por preferencia: sigue habiendo proveedor real y el demo no entra', d.realProviderAvailable === true && !d.candidates.some((c) => c.provider === 'mock'));
  }

  // c) Si de verdad no hay proveedor real capaz, el demo sí atiende
  {
    const demo = demoImg();
    const sinClave = { ...editor, isConfigured: () => false };
    const cfg = config({ providers: { seedream: { enabled: true, priority: 1 } }, routing: { [CAP]: { capability: CAP, chain: [{ provider: 'seedream' }], policy: 'balanced' } } });
    const { router } = build({ seedream: sinClave, mock: demo }, cfg);
    const d = await router.route(req({ capability: CAP }));
    check('sin ningún proveedor real capaz, el demo sigue disponible', d.realProviderAvailable === false && d.candidates.some((c) => c.provider === 'mock'));
  }

  // d) Un proveedor desactivado por administración no cuenta como real
  {
    const demo = demoImg();
    const cfg = config({ providers: { seedream: { enabled: false, priority: 1 } }, routing: { [CAP]: { capability: CAP, chain: [{ provider: 'seedream' }], policy: 'balanced' } } });
    const { router } = build({ seedream: editor, mock: demo }, cfg);
    const d = await router.route(req({ capability: CAP }));
    check('un proveedor apagado por administración no bloquea el demo', d.realProviderAvailable === false && d.candidates.some((c) => c.provider === 'mock'));
  }

  // e) Las tres capacidades de edición tienen ruta real en el registro de verdad
  {
    const { DEFAULT_ROUTING: RUTAS } = lib('registry.js');
    const { seedreamAdapter } = lib('providers/seedream.js');
    for (const cap of ['image.background_remove', 'image.object_remove', 'image.space_restyle']) {
      check(`${cap}: el adaptador la declara y la cadena lo incluye`, seedreamAdapter.supports(cap) && RUTAS[cap].chain.some((l) => l.provider === 'seedream'), RUTAS[cap].chain.map((l) => l.provider).join('>'));
    }
    check('seedream NO declara conservar el rostro ni ampliar: no sabe hacerlo', !seedreamAdapter.supports('image.identity_edit') && !seedreamAdapter.supports('image.upscale'));
  }
}

// ── SEMÁNTICA CANÓNICA DEL LIBRO (FASE 2E-4) ───────────────────────────────
// creditsCharged = Credits DEFINITIVAMENTE CAPTURADOS. Cerrar una generación no
// declara ningún cobro: en ese momento la transacción sigue autorizada y todavía
// puede reembolsarse entera. Solo la liquidación sabe el desenlace.
{
  const { distribute } = lib('ledger.js');
  const modeloTexto = [{ id: 'alpha-txt', quality: 4, capabilities: ['text.generate'], cost: { unit: 'call', usd: 0.01 } }];
  const rutaTexto = { 'text.generate': { capability: 'text.generate', chain: [{ provider: 'alpha' }], policy: 'balanced' } };
  const cfgTxt = () => config({ routing: rutaTexto, settings: { pricingMode: 'simulated' } });
  const completada = (ledger) => Object.values(ledger.records).find((x) => x.status === 'COMPLETED');
  const filas = (ledger) => Object.values(ledger.records);

  // ── Reparto contable: suma exacta, determinista, con enteros ──
  check('7-9) el reparto suma exactamente lo capturado', distribute(5, [2, 3]).join() === '2,3' && distribute(3, [2, 3]).join() === '1,2');
  check('7-9) el resto va al paso de mayor peso, siempre igual', distribute(1, [2, 3]).join() === '0,1' && distribute(1, [3, 2]).join() === '1,0');
  check('8) es determinista: la misma entrada da la misma salida', JSON.stringify(distribute(7, [1, 2, 4])) === JSON.stringify(distribute(7, [1, 2, 4])));
  check('9) nunca inventa ni pierde Credits, con cualquier importe', [0, 1, 2, 3, 5, 8, 13].every((n) => distribute(n, [2, 3, 5]).reduce((a, b) => a + b, 0) === n));
  check('9) a igual peso reparte por orden, sin azar', distribute(1, [2, 2]).join() === '1,0' && distribute(3, [1, 1, 1]).join() === '1,1,1');
  check('un importe cero o pesos cero no reparten nada', distribute(0, [2, 3]).join() === '0,0' && distribute(5, [0, 0]).join() === '0,0');

  // ── 1) Éxito simple: un paso, todo capturado ──
  {
    const alpha = fake('alpha', modeloTexto);
    const { router, ledger } = build({ alpha, mock }, cfgTxt());
    const out = await router.execute(req({ capability: 'text.generate', creditTransactionId: 'usage_j1' }));
    const antes = completada(ledger);
    check('1) al ejecutar solo queda el precio del paso, sin cobro declarado', antes.creditsEstimated === out.credits && antes.creditsCharged === undefined);
    const res = await ledger.settle({ creditTransactionId: 'usage_j1', finalAmount: out.credits });
    check('1) tras liquidar, el paso registra lo realmente capturado', completada(ledger).creditsCharged === out.credits && res.credited === out.credits);
    check('10) y el acumulado del día suma exactamente eso', ledger.usage.credits === out.credits);
  }

  // ── 2) Éxito compuesto: dos pasos, la suma cuadra ──
  {
    const alpha = fake('alpha', modeloTexto);
    const { router, ledger } = build({ alpha, mock }, cfgTxt());
    await router.execute(req({ capability: 'text.generate', stepId: 'a', creditTransactionId: 'usage_c1' }));
    await router.execute(req({ capability: 'text.generate', stepId: 'b', creditTransactionId: 'usage_c1' }));
    const total = filas(ledger).reduce((s, r) => s + (r.creditsEstimated || 0), 0);
    await ledger.settle({ creditTransactionId: 'usage_c1', finalAmount: total });
    const suma = filas(ledger).reduce((s, r) => s + (r.creditsCharged || 0), 0);
    check('2) la suma de las filas es exactamente lo capturado', suma === total && total > 0, suma + ' de ' + total);
    check('2) ninguna fila queda sin liquidar', filas(ledger).every((r) => typeof r.creditsCharged === 'number' && r.settledAt));
  }

  // ── 3) Fallo antes de ejecutar nada ──
  {
    const alpha = fake('alpha', modeloTexto, { fail: true });
    const { router, ledger } = build({ alpha }, cfgTxt());
    await router.execute(req({ capability: 'text.generate', creditTransactionId: 'usage_f0' })).catch(() => {});
    await ledger.settle({ creditTransactionId: 'usage_f0', finalAmount: 0 });
    check('3) sin ningún paso con éxito no se cobra nada', filas(ledger).every((r) => r.creditsCharged === 0) && ledger.usage.credits === 0);
  }

  // ── 4 y 6) EL CASO REAL DE LA PRUEBA 2E-1 ──
  // Reserva 5 · paso 1 vale 2 y tiene éxito · paso 2 vale 3 y falla · refund 5.
  {
    const alpha = fake('alpha', modeloTexto);
    const roto = fake('beta', [{ id: 'beta-txt', quality: 4, capabilities: ['text.generate'], cost: { unit: 'call', usd: 0.01 } }], { fail: true });
    const cfg2 = config({ routing: { 'text.generate': { capability: 'text.generate', chain: [{ provider: 'alpha' }], policy: 'balanced' } }, settings: { pricingMode: 'simulated' } });
    const { router, ledger } = build({ alpha }, cfg2);
    await router.execute(req({ capability: 'text.generate', stepId: 'receta', creditTransactionId: 'usage_2e1' }));
    const conExito = completada(ledger);
    check('4) el paso con éxito queda con su precio y SIN cobro declarado', conExito.creditsEstimated > 0 && conExito.creditsCharged === undefined);
    // El segundo paso falla: se cierra como FAILED
    const cfg3 = config({ routing: { 'text.generate': { capability: 'text.generate', chain: [{ provider: 'beta' }], policy: 'balanced' } }, settings: { pricingMode: 'simulated' } });
    const r2 = createRouter({ adapters: { beta: roto }, loadConfig: async () => cfg3, ledger, health: memoryHealth() });
    await r2.execute(req({ capability: 'text.generate', stepId: 'imagen', creditTransactionId: 'usage_2e1' })).catch(() => {});
    // El trabajo se reembolsa entero
    await ledger.settle({ creditTransactionId: 'usage_2e1', finalAmount: 0 });
    const suma = filas(ledger).reduce((s, r) => s + (r.creditsCharged || 0), 0);
    check('4 y 6) reembolso total: NINGUNA fila queda diciendo que cobró', suma === 0, 'suma=' + suma);
    check('6) el paso que sí se ejecutó conserva su precio teórico, que no es un ingreso', conExito.creditsEstimated > 0);
    check('11) el acumulado del día no suma Credits reembolsados', ledger.usage.credits === 0);
  }

  // ── 5) Fallo tras varios pasos ──
  {
    const alpha = fake('alpha', modeloTexto);
    const { router, ledger } = build({ alpha }, cfgTxt());
    for (const s of ['a', 'b', 'c']) await router.execute(req({ capability: 'text.generate', stepId: s, creditTransactionId: 'usage_m' }));
    await ledger.settle({ creditTransactionId: 'usage_m', finalAmount: 0 });
    check('5) tres pasos con éxito y reembolso total: todo a cero', filas(ledger).every((r) => r.creditsCharged === 0) && ledger.usage.credits === 0);
  }

  // ── 7 y 12) Captura parcial ──
  {
    const alpha = fake('alpha', modeloTexto);
    const { router, ledger } = build({ alpha }, cfgTxt());
    await router.execute(req({ capability: 'text.generate', stepId: 'a', creditTransactionId: 'usage_p' }));
    await router.execute(req({ capability: 'text.generate', stepId: 'b', creditTransactionId: 'usage_p' }));
    const res = await ledger.settle({ creditTransactionId: 'usage_p', finalAmount: 3 });
    const suma = filas(ledger).reduce((s, r) => s + (r.creditsCharged || 0), 0);
    check('7) una captura parcial suma EXACTAMENTE lo capturado', suma === 3, 'suma=' + suma);
    check('12) y el acumulado del día suma lo capturado, no lo reservado', ledger.usage.credits === 3 && res.credited === 3);
  }

  // ── 16, 17 y 18) Idempotencia ──
  {
    const alpha = fake('alpha', modeloTexto);
    const { router, ledger } = build({ alpha }, cfgTxt());
    const out = await router.execute(req({ capability: 'text.generate', creditTransactionId: 'usage_i' }));
    const a = await ledger.settle({ creditTransactionId: 'usage_i', finalAmount: out.credits });
    const b = await ledger.settle({ creditTransactionId: 'usage_i', finalAmount: out.credits });
    check('16-17) liquidar dos veces no vuelve a aplicar nada', a.already === false && b.already === true && b.credited === 0);
    check('18) y el acumulado del día no se duplica', ledger.usage.credits === out.credits);
    const c = await ledger.settle({ creditTransactionId: 'usage_i', finalAmount: 0 });
    check('15-16) ni siquiera con un desenlace distinto: ya estaba liquidada', c.already === true && completada(ledger).creditsCharged === out.credits);
  }

  // ── 13 y 14) El vínculo no es un cobro ──
  {
    const alpha = fake('alpha', modeloTexto);
    const { router, ledger } = build({ alpha }, cfgTxt());
    await router.execute(req({ capability: 'text.generate', creditTransactionId: 'usage_v' }));
    const r = completada(ledger);
    check('13) existe creditTransactionId y aun así NO hay cobro declarado', r.creditTransactionId === 'usage_v' && r.creditsCharged === undefined);
    const { router: r2, ledger: l2 } = build({ alpha: fake('alpha', modeloTexto), mock }, cfgTxt());
    await r2.execute(req({ capability: 'text.generate', stepId: 'edit:idioma' }));
    const interno = completada(l2);
    check('14) un paso interno sin transacción tiene precio teórico y ningún cobro', interno.creditsEstimated > 0 && interno.creditsCharged === undefined && interno.creditTransactionId === undefined);
  }

  // ── 22, 23, 24 y 25) Campos independientes, versión e histórico ──
  {
    const alpha = fake('alpha', modeloTexto);
    const { router, ledger } = build({ alpha }, cfgTxt());
    await router.execute(req({ capability: 'text.generate', jobId: 'historico', creditTransactionId: 'usage_h' }));
    const r = completada(ledger);
    check('22) providerCost es del proveedor y no depende de los Credits', r.providerCost > 0 && r.providerCurrency === 'USD');
    check('23) estimatedUsd sigue siendo la estimación previa', typeof r.estimatedUsd === 'number');
    check('24) las filas nuevas declaran ledgerVersion = 2', r.ledgerVersion === 2);
    await ledger.settle({ creditTransactionId: 'usage_h', finalAmount: 4 });
    const d = completada(ledger);
    check('25) liquidar no toca lo que ya estaba: el registro se conserva', d.jobId === 'historico' && d.userId === 'u1' && d.providerCost === r.providerCost && d.estimatedUsd === r.estimatedUsd);
    check('25) y no aparece ningún dato de saldo ni de transacción en el libro', !('balanceAfter' in d) && !('amount' in d));
  }
}

// ── Dimensiones reales en la fila de generación ──────────────────────────────
// La Resolution Policy decide, el adaptador ejecuta y lo declara, y el libro lo
// copia. El libro no deduce dimensiones: si el proveedor no las declara, no hay.
console.log('\n── K–M · la resolución ejecutada llega a la fila del libro ──');
{
  const conMeta = (meta) => ({
    id: 'pintor',
    name: 'pintor',
    modalities: ['image'],
    models: [{ id: 'modelo-x', provider: 'pintor', capabilities: ['image.generate'], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.015 } }],
    isConfigured: () => true,
    supports: (c) => c === 'image.generate',
    async run() { return { output: { kind: 'image', url: 'https://x/y.png' }, costUSD: 0.015, latencyMs: 5, model: 'modelo-x', meta }; },
  });
  const cfg = {
    providers: { pintor: { enabled: true, priority: 1 } },
    routing: { 'image.generate': { capability: 'image.generate', chain: [{ provider: 'pintor' }], policy: 'cost-first' } },
    settings: { ...DEFAULT_SETTINGS },
    source: 'test',
  };
  const correr = async (meta) => {
    const adapters = { pintor: conMeta(meta) };
    const { router, ledger } = build(adapters, cfg);
    await router.execute({ capability: 'image.generate', userId: 'u1', input: { prompt: 'p' } });
    return Object.values(ledger.records)[0];
  };

  const fila = await correr({ width: 1024, height: 1024, usdPerImage: 0.015 });
  check('K) la fila recibe la resolución que declaró el adaptador', fila.width === 1024 && fila.height === 1024);
  check('L) 1024x1024 llega intacto', fila.width + 'x' + fila.height === '1024x1024');

  const sin = await correr({ usdPerImage: 0.015 });
  check('M) si el adaptador no declara medidas, el libro no las inventa', sin.width === undefined && sin.height === undefined);

  const basura = await correr({ width: '1024', height: null });
  check('M) y solo acepta números: nada de cadenas ni nulos', basura.width === undefined && basura.height === undefined);

  const video = await correr({ resolution: '1080p' });
  check('M) la etiqueta de vídeo sigue yendo a resolution, sin tocar width', video.resolution === '1080p' && video.width === undefined);
}

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nTodas las pruebas del router pasaron');
process.exit(failures ? 1 : 0);
