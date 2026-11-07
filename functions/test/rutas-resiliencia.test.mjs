/*
 * FRENTE E · RESILIENCIA DEL ROUTER VIVO (engine/router.ts): plazos, cortacircuitos,
 * selección por capacidades declaradas y reintentos sin doble cobro.
 *
 * Proveedores falsos con la interfaz real, reloj inyectado, red cortada. < 5 s.
 *
 *   T. un proveedor que se cuelga se corta en `timeoutsMs[modalidad]` y atiende el
 *      siguiente; la fila del cortado queda FAILED con coste «desconocido»; si el
 *      colgado contesta tarde, no aparece una segunda fila COMPLETED ni se cobra;
 *      sin plazo restante (`deadlineAt` vencido) no se llama a nadie ni se abre el libro;
 *      el plazo que recibe el adaptador es lo que queda, no la tabla entera.
 *   C. cortacircuitos: cuenta solo fallos reintentables dentro de la ventana; un 4xx
 *      o «sin clave» no lo abren; se reabre pasado `openMs`; un éxito lo limpia.
 *   S. selección: solo modelos que declaran la capacidad; `modelId` fijado manda;
 *      un modelo desactivado por administración no se elige; `maxCredits` descarta.
 *   D. reintentos: varios intentos, UNA fila COMPLETED, Credits solo del ganador.
 *
 * Cada bloque falla si se quita la protección que vigila (ver el sabotaje del
 * registro del Frente E).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/engine/', p));

let salidas = 0;
globalThis.fetch = async () => { salidas++; throw new TypeError('RED CORTADA en la prueba'); };
net.Socket.prototype.connect = function () { salidas++; throw new Error('RED CORTADA en la prueba'); };

const { createRouter, memoryHealth, pickModel } = lib('router.js');
const { memoryLedger } = lib('ledger.js');
const { DEFAULT_SETTINGS } = lib('registry.js');
const { ProviderError, NotConfiguredError } = lib('http.js');
const { creditsFor } = lib('pricing.js');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const proveedor = (id, run, modelos) => ({
  id, name: id, modalities: ['text'],
  models: modelos || [{ id: `${id}-m`, provider: id, capabilities: ['text.generate'], quality: 4, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
  isConfigured: () => true,
  supports: (c) => (modelos || [{ capabilities: ['text.generate'] }]).some((m) => m.capabilities.includes(c)),
  calls: 0,
  plazos: [],
  async run(req) { this.calls++; this.plazos.push(req.timeoutMs); return run.call(this, req); },
});
const bien = (id) => async () => ({ output: { kind: 'text', content: `ok ${id}` }, costUSD: 0.02, latencyMs: 1, model: `${id}-m` });
const config = (cadena, settings = {}, providers = {}) => ({
  providers: Object.fromEntries(cadena.map((p, i) => [p, { enabled: true, priority: i + 1, ...(providers[p] || {}) }])),
  routing: { 'text.generate': { capability: 'text.generate', chain: cadena.map((provider) => ({ provider })), policy: 'balanced' } },
  settings: { ...DEFAULT_SETTINGS, ...settings },
  source: 'prueba',
});
const montar = (adapters, cfg, { now, health } = {}) => {
  const ledger = memoryLedger();
  const h = health || memoryHealth(now);
  return { ledger, health: h, router: createRouter({ adapters, loadConfig: async () => cfg, ledger, health: h, now }) };
};
const pedir = (extra = {}) => ({ capability: 'text.generate', input: { prompt: 'hola' }, userId: 'u', jobId: 'j', stepId: 's', creditTransactionId: 'usage_j', ...extra });

/* ── T. Plazos ──────────────────────────────────────────────────────────── */
{
  let soltarColgado;
  const colgado = proveedor('colgado', () => new Promise((resolve) => { soltarColgado = () => resolve({ output: { kind: 'text', content: 'tarde' }, costUSD: 0.05, latencyMs: 999 }); }));
  const rapido = proveedor('rapido', bien('rapido'));
  const { router, ledger } = montar({ colgado, rapido }, config(['colgado', 'rapido'], { timeoutsMs: { text: 60 } }));
  const t0 = Date.now();
  const r = await router.execute(pedir());
  const dt = Date.now() - t0;
  check('T1) el colgado se corta en su plazo (60 ms) y atiende el siguiente', r.provider === 'rapido' && dt < 1000, `${r.provider} en ${dt} ms`);
  const filas = Object.values(ledger.records);
  check('T2) la fila del cortado: FAILED, coste medido 0 pero «desconocido» con su estimado (pudo costar)',
    filas[0].provider === 'colgado' && filas[0].status === 'FAILED' && filas[0].providerCost === 0 && filas[0].providerCostStatus === 'desconocido' && filas[0].providerCostEstimated > 0,
    JSON.stringify({ s: filas[0].status, c: filas[0].providerCost, e: filas[0].providerCostStatus }));
  soltarColgado();
  await espera(20);
  const despues = Object.values(ledger.records);
  check('T3) si el colgado contesta tarde, no aparece una segunda COMPLETED ni cambia su fila', despues.filter((f) => f.status === 'COMPLETED').length === 1 && despues[0].status === 'FAILED');
  check('T4) Credits solo del que atendió', r.credits === creditsFor('text.generate', 0.02, DEFAULT_SETTINGS, false, { prompt: 'hola' }) && Object.values(ledger.records).filter((f) => f.creditsEstimated > 0).length === 1, String(r.credits));
}
{
  const a = proveedor('a', bien('a'));
  const { router, ledger } = montar({ a }, config(['a']));
  let error = null;
  try { await router.execute(pedir({ deadlineAt: Date.now() - 1 })); } catch (e) { error = e; }
  check('T5) sin plazo restante: TIMEOUT antes de empezar, sin llamar y sin abrir el libro', error?.code === 'TIMEOUT' && a.calls === 0 && Object.keys(ledger.records).length === 0, String(error?.code));
  const b = proveedor('b', bien('b'));
  const m2 = montar({ b }, config(['b'], { timeoutsMs: { text: 90_000 } }));
  await m2.router.execute(pedir({ deadlineAt: Date.now() + 5_000 }));
  check('T6) el adaptador recibe lo que QUEDA (≤ 5 s), no los 90 s de la tabla', b.plazos[0] > 0 && b.plazos[0] <= 5_000, String(b.plazos[0]));
}

/* ── C. Cortacircuitos ──────────────────────────────────────────────────── */
{
  let t = 1_000_000;
  const now = () => t;
  const cb = { failures: 3, windowMs: 10_000, openMs: 60_000 };
  const caido = proveedor('caido', async () => { throw new ProviderError('caido respondió 503', 'caido', 503, true); });
  const sano = proveedor('sano', bien('sano'));
  const health = memoryHealth(now);
  const cfg = config(['caido', 'sano'], { circuitBreaker: cb });
  for (let i = 0; i < 2; i++) await montar({ caido, sano }, cfg, { now, health }).router.execute(pedir());
  t += 20_000; // fuera de la ventana: los dos fallos anteriores caducan
  await montar({ caido, sano }, cfg, { now, health }).router.execute(pedir());
  check('C1) fallos fuera de la ventana no suman: tras 2 + (20 s) + 1, sigue cerrado', !health.isOpen('caido'), JSON.stringify(health.snapshot()));
  await montar({ caido, sano }, cfg, { now, health }).router.execute(pedir());
  await montar({ caido, sano }, cfg, { now, health }).router.execute(pedir());
  check('C2) tres fallos reintentables dentro de la ventana lo abren', health.isOpen('caido'));
  const antes = caido.calls;
  const r = await montar({ caido, sano }, cfg, { now, health }).router.execute(pedir());
  check('C3) abierto: ni se intenta, atiende el sano en el primer intento', caido.calls === antes && r.provider === 'sano' && r.attempts === 1);
  t += 61_000;
  check('C4) pasado openMs vuelve a probarse', !health.isOpen('caido'));
  const h2 = memoryHealth(now);
  const rechaza = proveedor('rechaza', async () => { throw new ProviderError('rechaza respondió 400', 'rechaza', 400, false); });
  const sinClave = proveedor('sinclave', async () => { throw new NotConfiguredError('sinclave', 'SIN_CLAVE'); });
  for (let i = 0; i < 5; i++) await montar({ rechaza, sinclave: sinClave, sano }, config(['rechaza', 'sinclave', 'sano'], { circuitBreaker: cb }), { now, health: h2 }).router.execute(pedir());
  check('C5) un 4xx (no reintentable) o «sin clave» no abren el cortacircuitos (es un fallo de la petición, no del proveedor)', !h2.isOpen('rechaza') && !h2.isOpen('sinclave'), JSON.stringify(h2.snapshot()));
  const intermitente = proveedor('inter', async function () { if (this.calls % 3 === 0) return bien('inter')(); throw new ProviderError('inter 503', 'inter', 503, true); });
  const h3 = memoryHealth(now);
  for (let i = 0; i < 6; i++) await montar({ inter: intermitente, sano }, config(['inter', 'sano'], { circuitBreaker: cb }), { now, health: h3 }).router.execute(pedir());
  check('C6) un éxito limpia la cuenta: 2 fallos + 1 éxito repetido nunca lo abre', !h3.isOpen('inter'), JSON.stringify(h3.snapshot()));
}

/* ── S. Selección por capacidades declaradas ────────────────────────────── */
{
  const multi = proveedor('multi', bien('multi'), [
    { id: 'barato', provider: 'multi', capabilities: ['text.generate'], quality: 3, speed: 4, cost: { unit: 'call', usd: 0.001 } },
    { id: 'bueno', provider: 'multi', capabilities: ['text.generate'], quality: 5, speed: 2, cost: { unit: 'call', usd: 0.5 } },
    { id: 'solo-imagen', provider: 'multi', capabilities: ['image.generate'], quality: 5, speed: 2, cost: { unit: 'image', usd: 0.0001 } },
  ]);
  check('S1) nunca se elige un modelo que no declara la capacidad (aunque sea el más barato)', pickModel(multi, 'text.generate', 'standard', 'cost-first')?.id === 'barato' && pickModel(multi, 'image.generate', 'standard', 'cost-first')?.id === 'solo-imagen');
  check('S2) calidad primero elige el de más calidad', pickModel(multi, 'text.generate', 'standard', 'quality-first')?.id === 'bueno');
  check('S3) un modelo fijado (`modelId`) manda; uno que no atiende la capacidad devuelve null', pickModel(multi, 'text.generate', 'standard', 'cost-first', undefined, 'bueno')?.id === 'bueno' && pickModel(multi, 'text.generate', 'standard', 'cost-first', undefined, 'solo-imagen') === null);
  check('S4) un modelo desactivado por administración no se elige', pickModel(multi, 'text.generate', 'standard', 'quality-first', { enabled: true, priority: 1, models: { bueno: { enabled: false } } })?.id === 'barato');
  const { router } = montar({ multi }, config(['multi']));
  const d = await router.route(pedir({ prefs: { modelId: 'bueno', maxCredits: 1 } }));
  check('S5) `maxCredits` descarta lo que cuesta más que el tope (y lo dice)', d.candidates.length === 0 && /supera el tope/.test(d.skipped.map((s) => s.reason).join()), JSON.stringify(d.skipped));
  const noAtiende = proveedor('img', bien('img'), [{ id: 'i', provider: 'img', capabilities: ['image.generate'], quality: 5, speed: 3, cost: { unit: 'image', usd: 0.01 } }]);
  const d2 = await montar({ img: noAtiende }, config(['img'])).router.route(pedir());
  check('S6) un proveedor de la cadena que no atiende la capacidad se salta con su motivo', d2.candidates.length === 0 && d2.skipped[0]?.reason === 'no atiende esta capacidad', JSON.stringify(d2.skipped));
}

/* ── D. Reintentos sin doble cobro ──────────────────────────────────────── */
{
  const f1 = proveedor('f1', async () => { throw new ProviderError('f1 502', 'f1', 502, true); });
  const f2 = proveedor('f2', async () => { throw new ProviderError('f2 500', 'f2', 500, true); });
  const ok = proveedor('ok', bien('ok'));
  const { router, ledger } = montar({ f1, f2, ok }, config(['f1', 'f2', 'ok']));
  const r = await router.execute(pedir());
  const filas = Object.values(ledger.records);
  check('D1) tres intentos, UNA fila COMPLETED y dos FAILED sin Credits', r.attempts === 3 && filas.filter((f) => f.status === 'COMPLETED').length === 1 && filas.filter((f) => f.status === 'FAILED' && f.creditsEstimated === 0).length === 2);
  check('D2) cerrar no es cobrar: ninguna fila declara creditsCharged (eso es de la liquidación)', filas.every((f) => f.creditsCharged === undefined));
  check('D3) cada intento lleva su número y la misma transacción de Credits', filas.map((f) => f.attempt).join() === '1,2,3' && filas.every((f) => f.creditTransactionId === 'usage_j'));
  check('D4) un mismo proveedor no se reintenta dentro de la misma petición (el respaldo es otro proveedor)', f1.calls === 1 && f2.calls === 1 && ok.calls === 1);
}

check('R) ninguna salida de red', salidas === 0, String(salidas));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
