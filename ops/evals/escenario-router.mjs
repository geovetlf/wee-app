/*
 * WEE AI EVALUATION ENGINE — ESCENARIO DEL MODEL ROUTER (F2-A).
 *
 * Reconstruye el ROUTER VIVO de producción (`functions/lib/engine/router.js`, `createRouter`) con dependencias
 * FALSAS y deterministas, y le pide la DECISIÓN pura con `route()` —que NO ejecuta ningún adaptador, ni abre el
 * libro, ni toca la red—. Así se evalúa a qué proveedor/modelo encamina el router, en qué orden, qué descarta y por
 * qué, bajo qué política, con COSTE $0 y reproducible.
 *
 * El «mundo» de un caso es configuración sintética: proveedores con sus modelos (calidad/velocidad/coste), la
 * cadena/política de routing, los ajustes del motor, qué proveedores están en pausa (cortacircuitos) y el uso del
 * día (para los topes). Nada de datos de personas.
 *
 * Es el MISMO router de producción —no una copia—: si cambia `engine/router.ts`, el eval lo ve. (Requiere `functions/lib`
 * al día; la cadena de pruebas ya lo exige con `libDesfasado`.)
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { createRouter } = require(path.join(RAIZ, 'functions/lib/engine/router.js'));

/** Adaptador falso: declara sus modelos y responde isConfigured/supports; su `run` CUENTA ejecuciones (debe ser 0). */
const adaptadorFalso = (p, contador) => ({
  id: p.id,
  name: p.id,
  modalities: ['text', 'image', 'video', 'voice'],
  models: (p.models || []).map((m) => ({
    id: m.id, provider: p.id, capabilities: m.capabilities || ['text.generate'],
    quality: m.quality, speed: m.speed, cost: { unit: m.unit || 'call', usd: m.usd },
    ...(m.maxDurationSec ? { maxDurationSec: m.maxDurationSec } : {}),
  })),
  isConfigured: () => p.sinClave !== true,
  supports: (c) => (p.models || []).some((m) => (m.capabilities || ['text.generate']).includes(c)),
  async run() { contador.n += 1; throw new Error('EVAL: route() NO debe ejecutar adaptadores'); },
});

/**
 * Corre un caso contra el router vivo y devuelve la decisión NORMALIZADA, más `ejecuciones` (siempre 0 en F2-A).
 * Puro: sin red, sin Firestore, sin coste.
 */
export const decidirEscenario = async (caso) => {
  const w = caso.world || {};
  const contador = { n: 0 };
  const proveedores = w.providers || [];
  const adapters = {};
  for (const p of proveedores) adapters[p.id] = adaptadorFalso(p, contador);
  if (w.mock) adapters.mock = adaptadorFalso({ id: 'mock', models: [{ id: 'demo', quality: 1, speed: 5, usd: 0 }] }, contador);

  const providers = {};
  for (const p of proveedores) {
    providers[p.id] = {
      enabled: p.enabled !== false, priority: p.priority ?? 50,
      ...(p.limits ? { limits: p.limits } : {}),
    };
  }
  if (w.mock) providers.mock = { enabled: true, priority: 99 };

  const routing = {};
  if (w.routing && Array.isArray(w.routing.chain) && w.routing.chain.length) {
    routing[caso.capability] = {
      capability: caso.capability,
      chain: w.routing.chain.map((l) => (typeof l === 'string' ? { provider: l } : l)),
      ...(w.routing.policy ? { policy: w.routing.policy } : {}),
    };
  } else if (w.routing && w.routing.policy) {
    routing[caso.capability] = { capability: caso.capability, chain: [], policy: w.routing.policy };
  }

  const settings = {
    defaultPolicy: w.settings?.defaultPolicy || 'balanced',
    allowMockFallback: w.settings?.allowMockFallback ?? true,
    pricingMode: w.settings?.pricingMode || 'simulated',
    creditsPerUsd: w.settings?.creditsPerUsd ?? 1000,
    margin: w.settings?.margin ?? 0,
    ...(w.settings?.iaDetenida !== undefined ? { iaDetenida: w.settings.iaDetenida } : {}),
    ...(w.settings?.maxUsdPerDay !== undefined ? { maxUsdPerDay: w.settings.maxUsdPerDay } : {}),
  };
  const config = { providers, routing, settings, source: 'eval' };
  const abiertos = new Set(w.health?.open || []);
  const router = createRouter({
    adapters,
    loadConfig: async () => config,
    ledger: { open: async () => 'eval', progress: async () => {}, close: async () => {}, settle: async () => {} },
    health: { isOpen: (p) => abiertos.has(p), failure: () => {}, success: () => {} },
    usageToday: async () => w.usage || {},
  });

  const d = await router.route({ capability: caso.capability, input: caso.request?.input || {}, userId: 'eval', requestId: `eval_${caso.evalCaseId}`, prefs: caso.request?.prefs || {} }, config);
  const c0 = d.candidates[0] || null;
  return {
    status: d.candidates.length ? 'routed' : 'unavailable',
    chosen: c0 ? { provider: c0.provider, model: c0.model.id } : null,
    orden: d.candidates.map((c) => c.provider),
    candidatos: d.candidates.map((c) => ({ provider: c.provider, model: c.model.id, usd: c.estimatedUsd, credits: c.estimatedCredits, quality: c.model.quality, speed: c.model.speed })),
    descartes: d.skipped.map((s) => ({ provider: s.provider, reason: s.reason })),
    motivo: d.candidates.length ? null : (d.skipped.find((s) => s.provider === '*')?.reason || null),
    realProviderAvailable: d.realProviderAvailable,
    policy: d.policy,
    quality: d.quality,
    ejecuciones: contador.n,
  };
};
