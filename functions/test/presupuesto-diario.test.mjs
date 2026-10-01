/*
 * LOS TOPES DE GASTO DIARIO — FASE 8 del Harness (inventario de la FASE 13).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Weë no tenía ningún tope de gasto diario: `maxUsdPerDay` estaba declarado
 * en la configuración de cada proveedor y no lo aplicaba nadie, y no existía
 * un tope global. Ahora, con valores (por defecto no hay):
 *  · `aiSettings/global.maxUsdPerDay`: alcanzado, el router no propone
 *    candidatos —ni otro proveedor ni el demo— y `execute` contesta
 *    NOT_AVAILABLE antes de abrir el libro: no se gasta ni se cobra más;
 *  · `aiProviders/{id}.limits.maxUsdPerDay`: alcanzado, ese proveedor se salta
 *    como con `maxCallsPerDay`, y la cadena sigue con el siguiente.
 * Los decide código, con lo que dice aiUsage/{día}; nunca una IA.
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

const { createRouter, memoryHealth } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const { providerUsdToday, usdToday } = lib('engine/limits.js');
const verificacion = lib('engine/verification.js');
const registrarReal = verificacion.recordRealSuccess;
verificacion.recordRealSuccess = async () => {};

/* ── A. Las cuentas ─────────────────────────────────────────────────────── */
const uso = { byProvider: { alfa: { calls: 3, usd: 6.5 }, beta: { calls: 1, usd: 1.25 } }, updatedAt: 1 };
check('1) el gasto de hoy de un proveedor sale de aiUsage.byProvider', providerUsdToday(uso, 'alfa') === 6.5 && providerUsdToday(uso, 'nadie') === 0);
check('2) y el total suma todos los proveedores', usdToday(uso) === 7.75 && usdToday(undefined) === 0 && usdToday({}) === 0);

/* ── B. El router ───────────────────────────────────────────────────────── */
const proveedor = (id) => ({
  id, name: id, modalities: ['text'], calls: 0,
  models: [{ id: `${id}-1`, provider: id, capabilities: ['text.generate'], quality: 4, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
  isConfigured: () => true, supports: (c) => c === 'text.generate',
  async run(req) { this.calls++; return { output: { kind: 'text', content: `hola desde ${id}` }, costUSD: 0.01, latencyMs: 2, model: req.model.id }; },
});
const montar = ({ settings = {}, providers = {}, usage, adapters }) => {
  const cfg = {
    providers: { alfa: { enabled: true, priority: 1 }, beta: { enabled: true, priority: 2 }, mock: { enabled: true, priority: 99 }, ...providers },
    routing: { 'text.generate': { capability: 'text.generate', chain: [{ provider: 'alfa' }, { provider: 'beta' }], policy: 'balanced' } },
    settings: { ...DEFAULT_SETTINGS, ...settings },
    source: 'test',
  };
  const ledger = memoryLedger();
  return { ledger, router: createRouter({ adapters, loadConfig: async () => cfg, ledger, health: memoryHealth(() => 1), now: () => 1, usageToday: async () => usage }) };
};
const pedido = { capability: 'text.generate', input: { prompt: 'hola' }, userId: 'u1', jobId: 'j1', stepId: 's1' };
const intentar = (p) => p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));

{
  const a = proveedor('alfa'); const b = proveedor('beta'); const m = proveedor('mock');
  const { router, ledger } = montar({ settings: { maxUsdPerDay: 7 }, usage: uso, adapters: { alfa: a, beta: b, mock: m } });
  const d = await router.route(pedido);
  check('3) tope global alcanzado (7,75 de 7 USD): ningún candidato, y dice por qué',
    d.candidates.length === 0 && d.skipped.some((s) => s.reason === 'presupuesto_diario_agotado'), JSON.stringify(d.skipped));
  const r = await intentar(router.execute(pedido));
  check('4) …execute contesta NOT_AVAILABLE', !r.ok && r.e.code === 'NOT_AVAILABLE', String(r.e && r.e.code));
  check('5) sin llamar a ningún proveedor —ni otro, ni el demo— ni abrir el libro',
    a.calls === 0 && b.calls === 0 && m.calls === 0 && Object.keys(ledger.records).length === 0);
}
{
  const a = proveedor('alfa');
  const { router } = montar({ settings: { maxUsdPerDay: 50 }, usage: uso, adapters: { alfa: a, beta: proveedor('beta'), mock: proveedor('mock') } });
  const r = await intentar(router.execute(pedido));
  check('6) por debajo del tope todo sigue igual', r.ok && a.calls === 1);
}
{
  const a = proveedor('alfa');
  const { router } = montar({ usage: { byProvider: { alfa: { usd: 999 } } }, adapters: { alfa: a, beta: proveedor('beta'), mock: proveedor('mock') } });
  const r = await intentar(router.execute(pedido));
  check('7) sin tope configurado (por defecto) nada cambia, gaste lo que gaste', r.ok && a.calls === 1);
}
{
  const a = proveedor('alfa'); const b = proveedor('beta');
  const { router } = montar({ providers: { alfa: { enabled: true, priority: 1, limits: { maxUsdPerDay: 5 } } }, usage: uso, adapters: { alfa: a, beta: b, mock: proveedor('mock') } });
  const d = await router.route(pedido);
  check('8) un proveedor que llegó a SU tope se salta, con motivo',
    d.skipped.some((s) => s.provider === 'alfa' && /presupuesto diario del proveedor/.test(s.reason)) && d.candidates[0] && d.candidates[0].provider === 'beta');
  const r = await intentar(router.execute(pedido));
  check('9) …y la cadena sigue con el siguiente, como con maxCallsPerDay', r.ok && a.calls === 0 && b.calls === 1);
}
{
  const a = proveedor('alfa'); const m = proveedor('mock');
  const cfgSolo = { alfa: { enabled: true, priority: 1, limits: { maxUsdPerDay: 5 } }, beta: { enabled: false, priority: 2 } };
  const { router } = montar({ providers: cfgSolo, usage: uso, adapters: { alfa: a, beta: proveedor('beta'), mock: m } });
  const r = await intentar(router.execute(pedido));
  check('10) si el único proveedor real llegó a su tope, no entra el demo: NOT_AVAILABLE', !r.ok && r.e.code === 'NOT_AVAILABLE' && m.calls === 0 && a.calls === 0);
}

/* ── C. Quién lo fija ───────────────────────────────────────────────────── */
const { validateSettings } = lib('engine/admin.js');
const rechaza = (v) => { try { validateSettings({ maxUsdPerDay: v }); return false; } catch (e) { return e.code === 'invalid-argument'; } };
check('11) administración solo acepta un número ≥ 0', rechaza(-1) && rechaza('50') && rechaza(Number.NaN) && !rechaza(0) && !rechaza(25.5));

verificacion.recordRealSuccess = registrarReal;
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
