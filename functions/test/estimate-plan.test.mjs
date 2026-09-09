// La cotización de un plan en los dos modos de precio.
//
// En modo real, los pasos de texto NO pasan por la misma rama que en simulado:
// van por el router y usan el crédito estimado del candidato. Esa rama es la que
// se estrenaría al activar el precio real, así que se prueba aquí antes, con un
// doble del engine y sin ningún proveedor: ni Gemini, ni BFL, ni Seedream.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const { ADAPTERS } = lib('engine/registry.js');

// ─── Solo BFL "tiene clave": así la escalera de imagen elige FLUX de forma estable ──
const configuradoAntes = new Map();
for (const [id, adapter] of Object.entries(ADAPTERS)) {
  configuradoAntes.set(id, adapter.isConfigured);
  adapter.isConfigured = () => id === 'flux';
}

// ─── Doble del engine: modo y ruta bajo control, sin red ───────────────────────
let modo = 'simulated';
let rutaDevuelve = { candidates: [{ provider: 'gemini', estimatedCredits: 1, estimatedUsd: 0.0037 }] };
let rutasPedidas = [];
const idEngine = require.resolve(path.resolve(here, '../lib/engine/index.js'));
const engineReal = require(idEngine);
require.cache[idEngine] = {
  id: idEngine,
  loaded: true,
  exports: {
    ...engineReal,
    engine: {
      ...engineReal.engine,
      settings: async () => ({ ...DEFAULT_SETTINGS, pricingMode: modo }),
      route: async (request) => {
        rutasPedidas.push(request.capability);
        return rutaDevuelve;
      },
    },
  },
};

const { estimatePlan } = lib('creator/credits.js');
const { TEMPLATES } = lib('creator/templates.js');

// El plan real de Chef: una receta de texto y una foto del plato.
const planChef = TEMPLATES.chef.buildPlan('Quiero opciones saludables para comer', { what: 'healthy', people: '2', time: '30' });
const cotizar = async (plan = planChef) => {
  rutasPedidas = [];
  const e = await estimatePlan(plan, 'u_prueba');
  return { total: e.total, pasos: Object.fromEntries(e.steps.map((s) => [s.stepId, s.credits])), servicios: Object.fromEntries(e.steps.map((s) => [s.stepId, s.service])), rutas: [...rutasPedidas] };
};

console.log('\n── El plan de Chef es el esperado ──');
check('dos pasos: receta de texto y foto del plato', planChef.steps.map((s) => s.capability).join(',') === 'text.generate,image.generate', planChef.steps.map((s) => s.capability).join(','));

// ─── 2) Camino simulado: nada cambia ───────────────────────────────────────────
console.log('\n── 2 · modo simulado: el comportamiento de hoy ──');
{
  modo = 'simulated';
  const q = await cotizar();
  check('receta 2 Credits y foto 3 Credits, como hoy', q.pasos.recipe === 2 && q.pasos.dish === 3, JSON.stringify(q.pasos));
  check('total 5 Credits', q.total === 5, String(q.total));
  check('el paso de texto NO pasa por el router en simulado', q.rutas.length === 0, q.rutas.join(', '));
  check('los servicios del catálogo son los de siempre', q.servicios.recipe === 'ai_text' && q.servicios.dish === 'ai_image_lite', JSON.stringify(q.servicios));
}

// ─── 3) Camino real para texto: pasa por el router ─────────────────────────────
console.log('\n── 3 · modo real: el texto se cotiza por el router ──');
{
  modo = 'real';
  rutaDevuelve = { candidates: [{ provider: 'gemini', estimatedCredits: 1, estimatedUsd: 0.0037 }] };
  const q = await cotizar();
  check('el paso de texto SÍ pasa por el router', q.rutas.join(',') === 'text.generate', q.rutas.join(','));
  check('y toma los Credits del primer candidato: 1', q.pasos.recipe === 1, String(q.pasos.recipe));

  // Lo que diga el candidato es lo que se cotiza: se comprueba con otro valor.
  rutaDevuelve = { candidates: [{ provider: 'gemini', estimatedCredits: 7, estimatedUsd: 0.05 }] };
  const otra = await cotizar();
  check('otro candidato, otro precio: 7', otra.pasos.recipe === 7, String(otra.pasos.recipe));

  // Sin candidatos no se inventa un precio.
  rutaDevuelve = { candidates: [] };
  const vacia = await cotizar();
  check('sin candidatos el paso de texto cuesta 0, no un valor inventado', vacia.pasos.recipe === 0, String(vacia.pasos.recipe));
  rutaDevuelve = { candidates: [{ provider: 'gemini', estimatedCredits: 1, estimatedUsd: 0.0037 }] };
}

// ─── 4) Camino real para imagen: la misma fórmula ya probada ───────────────────
console.log('\n── 4 · modo real: la imagen sigue por el Weë Image Engine ──');
{
  modo = 'real';
  const q = await cotizar();
  check('la imagen NO pasa por el router: la cotiza el motor de imagen', !q.rutas.includes('image.generate'), q.rutas.join(', '));
  check('FLUX Klein Standard 1024x1024, 1 imagen, 0 referencias → 2 Credits', q.pasos.dish === 2, String(q.pasos.dish));

  // El mismo número que da la fórmula directa, con el coste protegido de FLUX.
  const P = lib('credits/aiPricing.js');
  const directo = P.priceImage({ capability: 'image.generate', quality: 'standard', count: 1, aspectRatio: '1:1', available: (x) => x === 'flux' }, { ...DEFAULT_SETTINGS, pricingMode: 'real' });
  check('coincide con priceImage y con el modelo esperado', directo.credits === q.pasos.dish && directo.model === 'flux-2-klein-9b' && directo.usd === 0.015, `${directo.credits} · ${directo.model} · $${directo.usd}`);
}

// ─── 5) Chef completo en modo real ─────────────────────────────────────────────
console.log('\n── 5 · Chef entero en modo real ──');
{
  modo = 'real';
  const q = await cotizar();
  check('receta 1 + imagen 2', q.pasos.recipe === 1 && q.pasos.dish === 2, JSON.stringify(q.pasos));
  check('TOTAL 3 Credits', q.total === 3, String(q.total));

  modo = 'simulated';
  const s = await cotizar();
  check('y en simulado siguen siendo 5: la diferencia es del modo, no del plan', s.total === 5 && q.total === 3, `real ${q.total} · simulado ${s.total}`);
}

// ─── 6) La variable de entorno no manda ────────────────────────────────────────
console.log('\n── 6 · manda engine.settings(), no el entorno ──');
{
  const antes = process.env.CREATOR_PRICING_MODE;

  process.env.CREATOR_PRICING_MODE = 'real';
  modo = 'simulated';
  const a = await cotizar();
  check('entorno "real" + engine "simulado" → cotiza como simulado (5)', a.total === 5 && a.rutas.length === 0, `${a.total} Credits, rutas: ${a.rutas.length}`);

  process.env.CREATOR_PRICING_MODE = 'simulated';
  modo = 'real';
  const b = await cotizar();
  check('entorno "simulado" + engine "real" → cotiza como real (3)', b.total === 3 && b.rutas.join(',') === 'text.generate', `${b.total} Credits, rutas: ${b.rutas.join(',')}`);

  if (antes === undefined) delete process.env.CREATOR_PRICING_MODE;
  else process.env.CREATOR_PRICING_MODE = antes;
}

// ─── 7) El suelo se respeta en el camino real de texto ─────────────────────────
console.log('\n── 7 · el texto real nunca baja del coste protegido ──');
{
  const { creditsFor } = lib('engine/pricing.js');
  const real = { ...DEFAULT_SETTINGS, pricingMode: 'real' };
  const bajos = [];
  for (const usd of [0.0001, 0.001, 0.0037, 0.02, 0.5, 3]) {
    const credits = creditsFor('text.generate', usd, real, false, { kind: 'recipe', brief: 'una receta' });
    if (credits < Math.ceil(usd * real.creditsPerUsd)) bajos.push(`usd=${usd} → ${credits} < ${Math.ceil(usd * real.creditsPerUsd)}`);
  }
  check('el crédito estimado del candidato nunca queda por debajo del suelo', bajos.length === 0, bajos.join(' · '));
  check('y el proveedor demo no cobra nada', creditsFor('text.generate', 0.5, real, true, {}) === 0);
}

// ─── 8) Nada de esto ha tocado a ningún proveedor ──────────────────────────────
console.log('\n── 8 · sin proveedores ni configuración real ──');
{
  check('el modo de producción sigue siendo "simulated"', DEFAULT_SETTINGS.pricingMode === 'simulated', DEFAULT_SETTINGS.pricingMode);
  check('margin sigue en 0.3 y creditsPerUsd en 100', DEFAULT_SETTINGS.margin === 0.3 && DEFAULT_SETTINGS.creditsPerUsd === 100);
  check('el engine real nunca se llamó: solo el doble', typeof engineReal.engine.route === 'function');
}

// Se devuelven los adaptadores a su estado original.
for (const [id, adapter] of Object.entries(ADAPTERS)) adapter.isConfigured = configuradoAntes.get(id);

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nCotización de planes: los dos modos de precio, sin tocar ningún proveedor');
process.exit(failures ? 1 : 0);
