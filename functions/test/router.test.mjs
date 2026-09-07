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
  providers: { veo: { enabled: true, priority: 1 }, seedance: { enabled: true, priority: 2 }, kling: { enabled: true, priority: 3 }, mock: { enabled: true, priority: 99 }, ...(overrides.providers || {}) },
  routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'veo' }, { provider: 'seedance' }, { provider: 'kling' }], policy: 'quality-first' }, ...(overrides.routing || {}) },
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
  const veo = fake('veo', [{ id: 'veo-3', quality: 5 }], { configured: false });
  const seedance = fake('seedance', [{ id: 'seedance-pro', quality: 4 }]);
  const kling = fake('kling', [{ id: 'kling-2', quality: 4 }]);
  const { router } = build({ veo, seedance, kling, mock }, config());
  const decision = await router.route(req());
  check('sin clave se salta (veo) y el orden sigue la cadena', decision.candidates.map((c) => c.provider).join('>') === 'seedance>kling>mock', decision.candidates.map((c) => c.provider).join('>'));
  check('el motivo del salto es legible', decision.skipped[0]?.reason === 'sin clave configurada', JSON.stringify(decision.skipped));
}

// 2) Fallback automático cuando el primero falla + libro de generaciones
{
  const veo = fake('veo', [{ id: 'veo-3', quality: 5 }], { fail: true });
  const seedance = fake('seedance', [{ id: 'seedance-pro', quality: 4 }]);
  const kling = fake('kling', [{ id: 'kling-2', quality: 4 }]);
  const { router, ledger } = build({ veo, seedance, kling, mock }, config({ settings: { pricingMode: 'real' } }));
  const result = await router.execute(req());
  check('Veo falla → Seedance atiende', result.provider === 'seedance' && result.attempts === 2, `${result.provider} en ${result.attempts} intentos`);
  const records = Object.values(ledger.records);
  check('cada intento queda registrado (fallido + exitoso)', records.length === 2 && records[0].status === 'failed' && records[1].status === 'done', JSON.stringify(records.map((r) => [r.provider, r.status, r.credits])));
  check('el registro guarda usuario, modelo, tipo, duración y error', records[0].userId === 'u1' && records[0].model === 'veo-3' && records[0].capability === 'video.generate' && typeof records[0].durationMs === 'number' && /falló/.test(records[0].error), JSON.stringify(records[0]));
  check('Credits reales = USD × creditsPerUsd × (1+margen)', result.credits === Math.ceil(1 * 100 * 1.3), String(result.credits));
  check('en modo real el demo NO entra si hay candidatos reales', !result.decision.candidates.some((c) => c.provider === 'mock'));
}

// 3) Calidad: "cinematográfico" exige máxima → modelo de calidad 5; "borrador" → barato
{
  const veo = fake('veo', [{ id: 'veo-fast', quality: 4, cost: { unit: 'second', usd: 0.15 } }, { id: 'veo-3', quality: 5, cost: { unit: 'second', usd: 0.4 } }]);
  const { router } = build({ veo, mock }, config({ routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'veo' }], policy: 'balanced' } } }));
  const max = await router.route(req({ input: { prompt: 'video cinematográfico de una persona caminando por Lima de noche' } }));
  check('escena cinematográfica → calidad max y el mejor modelo', max.quality === 'max' && max.candidates[0].model.id === 'veo-3', `${max.quality} ${max.candidates[0].model.id}`);
  const light = await router.route(req({ input: { prompt: 'un borrador rápido de prueba' } }));
  check('escena sencilla → calidad standard y el modelo más barato', light.quality === 'standard' && light.candidates[0].model.id === 'veo-fast', `${light.quality} ${light.candidates[0].model.id}`);
}

// 4) Política cost-first ordena por precio; tope de Credits descarta caros
{
  const veo = fake('veo', [{ id: 'veo-3', quality: 5, cost: { unit: 'second', usd: 0.4 } }]);
  const seedance = fake('seedance', [{ id: 'seedance-lite', quality: 4, cost: { unit: 'second', usd: 0.02 } }]);
  const { router } = build({ veo, seedance, mock }, config({ routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'veo' }, { provider: 'seedance' }], policy: 'cost-first' } }, settings: { pricingMode: 'real' } }));
  const d = await router.route(req({ prefs: { quality: 'high', durationSec: 8 } }));
  check('cost-first pone primero al más barato que cumple la calidad', d.candidates[0].provider === 'seedance', d.candidates.map((c) => `${c.provider}:${c.estimatedCredits}`).join(','));
  const capped = await router.route(req({ prefs: { quality: 'high', durationSec: 8, maxCredits: 50 } }));
  check('maxCredits descarta al caro', !capped.candidates.some((c) => c.provider === 'veo') && capped.skipped.some((s) => /tope/.test(s.reason)), JSON.stringify(capped.skipped));
}

// 5) Cortacircuitos: tras 3 fallos el proveedor queda en pausa y luego vuelve
{
  let t = 1_000_000;
  const now = () => t;
  const veo = fake('veo', [{ id: 'veo-3', quality: 5 }], { fail: true });
  const kling = fake('kling', [{ id: 'kling-2', quality: 4 }]);
  const { router, health } = build({ veo, kling, mock }, config({ routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'veo' }, { provider: 'kling' }], policy: 'quality-first' } } }), now);
  for (let i = 0; i < 3; i++) await router.execute(req());
  check('3 fallos abren el cortacircuitos', health.isOpen('veo'));
  const d = await router.route(req());
  check('en pausa, el router ni lo intenta', d.candidates[0].provider === 'kling' && d.skipped.some((s) => /pausa/.test(s.reason)), JSON.stringify(d.skipped));
  t += DEFAULT_SETTINGS.circuitBreaker.openMs + 1;
  check('pasado el tiempo vuelve a probarlo', !health.isOpen('veo'));
}

// 6) Proveedor desactivado desde administración y cadena reconfigurada
{
  const veo = fake('veo', [{ id: 'veo-3', quality: 5 }]);
  const kling = fake('kling', [{ id: 'kling-2', quality: 4 }]);
  const cfg = config({ providers: { veo: { enabled: false, priority: 1 } }, routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'kling' }, { provider: 'veo' }], policy: 'balanced' } } });
  const { router } = build({ veo, kling, mock }, cfg);
  const d = await router.route(req());
  check('desactivado por admin no se usa y la cadena manda', d.candidates[0].provider === 'kling' && d.skipped.some((s) => s.provider === 'veo' && /desactivado/.test(s.reason)));
}

// 7) Sin ningún proveedor real: modo demo atiende (y cobra precio de prueba)
{
  const veo = fake('veo', [{ id: 'veo-3', quality: 5 }], { configured: false });
  const { router } = build({ veo, mock }, config());
  const result = await router.execute(req());
  check('sin claves, atiende el modo demo', result.provider === 'mock' && result.demo === true);
  check('en modo prueba cobra el precio del catálogo de Credits de la capacidad', result.credits === CREDIT_COSTS[serviceForCapability('video.generate', {})], String(result.credits));
}

// 8) Nada disponible en modo real sin fallback demo → error claro
{
  const veo = fake('veo', [{ id: 'veo-3', quality: 5 }], { configured: false });
  const { router } = build({ veo, mock }, config({ settings: { pricingMode: 'real', allowMockFallback: false } }));
  let message = '';
  try { await router.execute(req()); } catch (e) { message = e.message; }
  check('error explica por qué nadie pudo atender', /Ningún proveedor disponible/.test(message) && /sin clave/.test(message), message);
}

// 9) pickModel y resolveQuality directos
{
  const veo = fake('veo', [{ id: 'a', quality: 2, cost: { unit: 'second', usd: 0.01 } }, { id: 'b', quality: 4, cost: { unit: 'second', usd: 0.1 } }, { id: 'c', quality: 5, cost: { unit: 'second', usd: 0.5 } }]);
  check('pickModel high/balanced → el más barato que cumple (b)', pickModel(veo, 'video.generate', 'high', 'balanced').id === 'b');
  check('pickModel max/quality-first → c', pickModel(veo, 'video.generate', 'max', 'quality-first').id === 'c');
  check('pickModel con modelo fijado', pickModel(veo, 'video.generate', 'standard', 'balanced', undefined, 'a').id === 'a');
  check('resolveQuality respeta prefs', resolveQuality({ capability: 'video.generate', input: {}, prefs: { quality: 'standard' } }) === 'standard');
  check('resolveQuality: imagen por defecto high', resolveQuality({ capability: 'image.generate', input: {} }) === 'high');
}

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nTodas las pruebas del router pasaron');
process.exit(failures ? 1 : 0);
