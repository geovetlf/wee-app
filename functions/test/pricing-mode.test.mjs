// Preparación para el modo de precio real: una sola fuente de verdad y una
// configuración que no admite valores imposibles.
//
// No se activa nada: al terminar, el modo sigue siendo "simulated". Aquí solo se
// comprueba que cotización, fórmula y cobro leen LO MISMO, y que ajustar los
// ajustes no puede dejar el precio por debajo del coste del proveedor.
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
const rechaza = (name, fn) => {
  try {
    fn();
    check(name, false, 'no rechazó');
  } catch (error) {
    check(name, error?.code === 'invalid-argument', `código ${error?.code}`);
  }
};
const acepta = (name, fn) => {
  try {
    fn();
    check(name, true);
  } catch (error) {
    check(name, false, 'rechazó: ' + error?.message);
  }
};

// ─── F2 · la configuración rechaza lo imposible ────────────────────────────────
console.log('\n── F2 · setSettings no acepta valores que romperían el suelo ──');
{
  const { validateSettings } = lib('engine/admin.js');

  rechaza('margin = -1 se rechaza', () => validateSettings({ margin: -1 }));
  rechaza('margin = -0.0001 también', () => validateSettings({ margin: -0.0001 }));
  acepta('margin = 0 se acepta (vender exactamente al coste)', () => validateSettings({ margin: 0 }));
  acepta('margin = 0.3, el actual, se acepta', () => validateSettings({ margin: 0.3 }));
  rechaza('margin no numérico se rechaza', () => validateSettings({ margin: 'mucho' }));

  rechaza('creditsPerUsd = 0 se rechaza', () => validateSettings({ creditsPerUsd: 0 }));
  rechaza('creditsPerUsd negativo se rechaza', () => validateSettings({ creditsPerUsd: -100 }));
  acepta('creditsPerUsd positivo se acepta', () => validateSettings({ creditsPerUsd: 100 }));
  rechaza('creditsPerUsd no numérico se rechaza', () => validateSettings({ creditsPerUsd: 'cien' }));

  acepta('pricingMode "simulated" se acepta', () => validateSettings({ pricingMode: 'simulated' }));
  acepta('pricingMode "real" se acepta', () => validateSettings({ pricingMode: 'real' }));
  rechaza('pricingMode "REAL" se rechaza: no se corrige solo', () => validateSettings({ pricingMode: 'REAL' }));
  rechaza('pricingMode con cualquier otro texto se rechaza', () => validateSettings({ pricingMode: 'produccion' }));
  rechaza('pricingMode vacío se rechaza', () => validateSettings({ pricingMode: '' }));

  acepta('un patch que no toca estos tres campos pasa igual', () => validateSettings({ defaultPolicy: 'balanced' }));
  acepta('y un patch vacío también', () => validateSettings({}));

  // Se rechaza ANTES de escribir: la función no devuelve nada corregido.
  check('no hay corrección silenciosa: validar no devuelve valores', validateSettings({ margin: 0.3 }) === undefined);
}

// ─── El suelo aguanta con cualquier margin admitido ────────────────────────────
console.log('\n── El precio nunca queda por debajo del coste protegido ──');
{
  const P = lib('credits/aiPricing.js');
  const { DEFAULT_SETTINGS } = lib('engine/registry.js');

  // En texto y vídeo el suelo no está escrito: descansa en que (1 + margin) >= 1.
  const bajoElSuelo = [];
  for (const margin of [0, 0.05, 0.3, 1, 5]) {
    const settings = { ...DEFAULT_SETTINGS, pricingMode: 'real', margin };
    for (const usd of [0.0001, 0.001, 0.015, 0.05, 0.5, 2, 17.5]) {
      const suelo = Math.ceil(usd * settings.creditsPerUsd);
      const precio = P.usdToCredits(usd, settings);
      if (precio < suelo) bajoElSuelo.push(`margin=${margin} usd=${usd} → ${precio} < ${suelo}`);
    }
  }
  check('con margin >= 0 el precio real nunca baja del suelo', bajoElSuelo.length === 0, bajoElSuelo.join(' · '));

  // Y con un margen negativo sí bajaría: por eso la validación lo rechaza.
  const negativo = { ...DEFAULT_SETTINGS, pricingMode: 'real', margin: -0.5 };
  check('un margen negativo SÍ bajaría del suelo, y por eso no se admite', P.usdToCredits(0.5, negativo) < Math.ceil(0.5 * negativo.creditsPerUsd), String(P.usdToCredits(0.5, negativo)));

  // En imágenes el suelo además está escrito de forma explícita.
  const soloFlux = (x) => x === 'flux';
  const img = (margin) => P.priceImage({ capability: 'image.generate', quality: 'standard', count: 1, aspectRatio: '1:1', available: soloFlux }, { ...DEFAULT_SETTINGS, pricingMode: 'real', margin });
  check('en imagen el suelo es explícito y se cumple con margin = 0', img(0).credits >= Math.ceil(img(0).usd * 100));
}

// ─── F1 · una sola fuente de verdad ────────────────────────────────────────────
console.log('\n── F1 · cotización, fórmula y cobro leen el MISMO modo ──');
{
  // Se sustituye el engine por un doble: no hay Firestore ni proveedores.
  let modo = 'simulated';
  const idEngine = require.resolve(path.resolve(here, '../lib/engine/index.js'));
  const real = require(idEngine);
  const { DEFAULT_SETTINGS } = lib('engine/registry.js');
  require.cache[idEngine] = {
    id: idEngine,
    loaded: true,
    exports: { ...real, engine: { ...real.engine, settings: async () => ({ ...DEFAULT_SETTINGS, pricingMode: modo }) } },
  };

  const { pricingMode } = lib('creator/credits.js');

  check('el modo efectivo sale del engine, no de la variable de entorno', (await pricingMode()) === 'simulated');
  modo = 'real';
  check('si el engine dice "real", el creator lo ve como "real"', (await pricingMode()) === 'real');
  modo = 'simulated';
  check('y vuelve a "simulated" cuando el engine lo dice', (await pricingMode()) === 'simulated');

  // La variable de entorno ya no puede discrepar del engine.
  const antes = process.env.CREATOR_PRICING_MODE;
  process.env.CREATOR_PRICING_MODE = 'real';
  check('con la variable en "real" pero el engine en "simulated", manda el engine', (await pricingMode()) === 'simulated');
  if (antes === undefined) delete process.env.CREATOR_PRICING_MODE;
  else process.env.CREATOR_PRICING_MODE = antes;

  // La fórmula de precio lee ese mismo campo de los ajustes.
  const P = lib('credits/aiPricing.js');
  const precio = (pricingMode) => P.priceOperation('text.generate', { kind: 'recipe', brief: 'una receta' }, 'ai_text', { ...DEFAULT_SETTINGS, pricingMode });
  check('la fórmula distingue los dos modos por el mismo campo', precio('simulated').credits !== precio('real').credits, `${precio('simulated').credits} vs ${precio('real').credits}`);

  // La regla de cobro: en simulado se captura lo cotizado; en real, nunca más
  // de lo medido. Es la misma decisión que toma creator/index.ts con este modo.
  const cobro = (modoEfectivo, estimado, medido) => (modoEfectivo === 'real' ? Math.min(estimado, medido) : estimado);
  check('en simulado se captura lo que la persona vio', cobro('simulated', 5, 3) === 5);
  check('en real nunca se captura más de lo medido', cobro('real', 5, 3) === 3);
  check('y en real tampoco más de lo cotizado', cobro('real', 5, 9) === 5);

  // Y sobre el código de verdad: el creator ya no lee la variable de entorno por
  // su cuenta en ningún sitio. Si alguien vuelve a hacerlo, esta prueba lo caza.
  {
    const fs = require('node:fs');
    const fuentes = ['creator/credits.js', 'creator/index.js'].map((f) => fs.readFileSync(path.resolve(here, '../lib/' + f), 'utf8'));
    const culpables = fuentes.filter((t) => t.includes('CREATOR_PRICING_MODE'));
    check('el creator ya no lee CREATOR_PRICING_MODE directamente', culpables.length === 0, culpables.length + ' archivo(s)');
    check('y la única lectura del entorno vive en los ajustes del engine', fs.readFileSync(path.resolve(here, '../lib/engine/registry.js'), 'utf8').includes('CREATOR_PRICING_MODE'));
  }
}

// ─── Nada de esto activa nada ──────────────────────────────────────────────────
console.log('\n── La configuración vigente no ha cambiado ──');
{
  delete require.cache[require.resolve(path.resolve(here, '../lib/engine/index.js'))];
  const { DEFAULT_SETTINGS } = lib('engine/registry.js');
  check('pricingMode sigue siendo "simulated"', DEFAULT_SETTINGS.pricingMode === 'simulated', DEFAULT_SETTINGS.pricingMode);
  check('margin sigue siendo 0.3', DEFAULT_SETTINGS.margin === 0.3, String(DEFAULT_SETTINGS.margin));
  check('creditsPerUsd sigue siendo 100', DEFAULT_SETTINGS.creditsPerUsd === 100, String(DEFAULT_SETTINGS.creditsPerUsd));
}

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nModo de precio: una sola fuente de verdad y ajustes que no admiten lo imposible');
process.exit(failures ? 1 : 0);
