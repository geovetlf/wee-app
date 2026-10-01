/*
 * EL COSTE DE LO QUE FALLA DESPUÉS DE LLEGAR AL PROVEEDOR — auditoría H0, escenario #22.
 *
 * Antes, todo fallo se cerraba con `providerCost: 0`: una tarea de vídeo aceptada
 * cuyo sondeo fallaba, o una petición sin respuesta, gastaba dinero que
 * `aiUsage/{día}` no veía, y por tanto tampoco los topes de gasto diario
 * (`maxUsdPerDay`, apagados por defecto). Ahora el router distingue lo que no
 * pudo costar ('cero') de lo que pudo ('desconocido', con su coste estimado), el
 * libro lo suma aparte como `usdEnRiesgo` y los topes lo cuentan. El coste
 * MEDIDO no cambia: sigue en 0.
 *
 * Corre contra el código compilado (`lib`), con el router de verdad, un
 * proveedor falso y el libro en memoria.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { createRouter, memoryHealth, costeTrasUnFallo } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const { ProviderError, NotConfiguredError } = lib('engine/http.js');
const { EngineError } = lib('engine/errors.js');
const { providerUsdToday, usdToday } = lib('engine/limits.js');
lib('engine/verification.js').recordRealSuccess = async () => {};

/* ── A. La regla, pura ───────────────────────────────────────────────────── */
check('1) no salió nada (proveedor sin configurar) → cero', costeTrasUnFallo(new NotConfiguredError('alfa', 'ALFA_KEY'), false) === 'cero');
check('2) el proveedor la rechazó al recibirla (400, 401, 429) → cero',
  [400, 401, 429].every((s) => costeTrasUnFallo(new ProviderError('no', 'alfa', s, false), false) === 'cero'));
check('3) Weë rechazó la entrada antes de mandarla → cero', costeTrasUnFallo(new EngineError('INVALID_REQUEST'), false) === 'cero');
check('4) sin respuesta, tiempo agotado o 5xx → desconocido',
  costeTrasUnFallo(new ProviderError('alfa: tardó más de 60 s', 'alfa'), false) === 'desconocido'
  && costeTrasUnFallo(new ProviderError('caído', 'alfa', 503), false) === 'desconocido'
  && costeTrasUnFallo(new TypeError('respuesta ilegible'), false) === 'desconocido');
check('5) si la tarea ya estaba ACEPTADA, cualquier fallo después es desconocido (incluso un 4xx del sondeo)',
  costeTrasUnFallo(new ProviderError('no encontrada', 'alfa', 404, false), true) === 'desconocido'
  && costeTrasUnFallo(new EngineError('PROVIDER_ERROR'), true) === 'desconocido');

/* ── B. El router y el libro ─────────────────────────────────────────────── */
const COSTE = 0.25;
const proveedor = (id, fallo) => ({
  id, name: id, modalities: ['video'], calls: 0,
  models: [{ id: `${id}-1`, provider: id, capabilities: ['text.generate'], quality: 4, speed: 3, cost: { unit: 'call', usd: COSTE } }],
  isConfigured: () => true, supports: (c) => c === 'text.generate',
  async run(req) {
    this.calls++;
    if (fallo === 'aceptada') { await req.onStatus('PROCESSING', { providerTaskId: 'tarea-1' }); throw new ProviderError('el sondeo falló', id, 500); }
    if (fallo === 'rechazo') throw new ProviderError('entrada inválida', id, 400, false);
    if (fallo === 'sin-respuesta') throw new ProviderError(`${id}: tardó más de 60 s`, id);
    return { output: { kind: 'text', content: 'ok' }, costUSD: COSTE, latencyMs: 2, model: req.model.id };
  },
});
const montar = (fallo, settings = {}, usage) => {
  const ledger = memoryLedger();
  const alfa = proveedor('alfa', fallo);
  const cfg = {
    providers: { alfa: { enabled: true, priority: 1 } },
    routing: { 'text.generate': { capability: 'text.generate', chain: [{ provider: 'alfa' }], policy: 'balanced' } },
    settings: { ...DEFAULT_SETTINGS, ...settings }, source: 'test',
  };
  const router = createRouter({ adapters: { alfa }, loadConfig: async () => cfg, ledger, health: memoryHealth(() => 1), now: () => 1, ...(usage ? { usageToday: async () => usage } : {}) });
  return { router, ledger, alfa };
};
const pedido = { capability: 'text.generate', input: { prompt: 'hola' }, userId: 'u1', jobId: 'j1', stepId: 's1' };
const fila = async (fallo) => {
  const m = montar(fallo);
  try { await m.router.execute(pedido); } catch { /* el fallo es lo que se prueba */ }
  return Object.values(m.ledger.records)[0] || {};
};

const aceptada = await fila('aceptada');
check('6) una tarea ACEPTADA que falla: coste medido 0, pero anotada como desconocida con su estimado',
  aceptada.status === 'FAILED' && aceptada.providerCost === 0 && aceptada.providerCostStatus === 'desconocido' && aceptada.providerCostEstimated > 0,
  JSON.stringify({ s: aceptada.status, c: aceptada.providerCost, st: aceptada.providerCostStatus, e: aceptada.providerCostEstimated }));
const sinRespuesta = await fila('sin-respuesta');
check('7) sin respuesta (tiempo agotado): también desconocida', sinRespuesta.providerCostStatus === 'desconocido');
const rechazo = await fila('rechazo');
check('8) rechazada por el proveedor al recibirla (400): sin coste y SIN marca (igual que antes)',
  rechazo.status === 'FAILED' && rechazo.providerCost === 0 && rechazo.providerCostStatus === undefined && rechazo.providerCostEstimated === undefined);
const bien = await fila('ninguno');
check('9) lo que sale bien no cambia: COMPLETED con su coste medido y sin marca',
  bien.status === 'COMPLETED' && bien.providerCost === COSTE && bien.providerCostStatus === undefined);

/* ── C. Los topes lo ven ─────────────────────────────────────────────────── */
const dia = { byProvider: { alfa: { calls: 3, usd: 1, usdEnRiesgo: 4 }, beta: { calls: 1, usd: 2 } } };
check('10) el gasto del día de un proveedor = medido + en riesgo; y el de todos, la suma',
  providerUsdToday(dia, 'alfa') === 5 && providerUsdToday(dia, 'beta') === 2 && usdToday(dia) === 7);
check('11) un día sin la marca (todo lo anterior a esto) se lee igual que antes',
  providerUsdToday({ byProvider: { alfa: { usd: 1.5 } } }, 'alfa') === 1.5 && providerUsdToday(undefined, 'alfa') === 0
  && providerUsdToday({ byProvider: { alfa: { usd: 1, usdEnRiesgo: 'x' } } }, 'alfa') === 1);
{
  const conTope = montar('ninguno', { maxUsdPerDay: 4.5 }, { byProvider: { alfa: { usd: 1, usdEnRiesgo: 4 } } });
  const decision = await conTope.router.route(pedido);
  check('12) con un tope global de 4,5 $ y 1 $ medido + 4 $ en riesgo, la IA se para (antes habría seguido gastando)',
    decision.candidates.filter((c) => c.provider === 'alfa').length === 0, JSON.stringify(decision.skipped));
  const sinTope = montar('ninguno', {}, { byProvider: { alfa: { usd: 1, usdEnRiesgo: 4 } } });
  check('13) sin tope (el valor por defecto) nada cambia: el proveedor sigue disponible',
    (await sinTope.router.route(pedido)).candidates.some((c) => c.provider === 'alfa'));
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
