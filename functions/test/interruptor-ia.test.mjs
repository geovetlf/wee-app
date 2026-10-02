/*
 * EL INTERRUPTOR DE LA IA — auditoría H0, escenario #19 (FASE 7–8 del Harness).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Hasta el 2026-09-30, «apagar la IA» solo se podía hacer desactivando todos
 * los proveedores, y eso hacía entrar el modo demo… cobrado a precio de
 * catálogo. No había un interruptor que parara el gasto de verdad.
 *
 * `aiSettings/global.iaDetenida = true` (apagado por defecto) para TODA
 * generación nueva, por las tres puertas que llaman a un proveedor:
 *  · el router del motor (creatorRun, creatorChat, Weë Brain, Studio…): sin
 *    candidatos —ni real ni demo— y NOT_AVAILABLE antes de abrir el libro, así
 *    que el llamador reembolsa su reserva como siempre;
 *  · el ejecutor del Core (las puertas canario): rechazo antes de despachar;
 *  · el avatar (el único que llama a un proveedor fuera de un adaptador):
 *    «no disponible» antes de cobrar.
 * El barrido que pregunta por tareas ya lanzadas NO se para: es lo que cierra
 * el dinero de lo que ya estaba en marcha.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../', p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { createRouter, memoryHealth } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
/* Tras un éxito real el router anota la verificación del proveedor en Firestore: aquí no hay Firestore. */
const verificacion = lib('engine/verification.js');
const registrarReal = verificacion.recordRealSuccess;
verificacion.recordRealSuccess = async () => {};

/* ── A. Por defecto está apagado ────────────────────────────────────────── */
check('1) por defecto la IA NO está detenida (nada cambia hasta que alguien lo encienda)', DEFAULT_SETTINGS.iaDetenida === false);

/* ── B. El router del motor ─────────────────────────────────────────────── */
const proveedor = (id) => ({
  id, name: id, modalities: ['text'], calls: 0,
  models: [{ id: `${id}-1`, provider: id, capabilities: ['text.generate'], quality: 4, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
  isConfigured: () => true, supports: (c) => c === 'text.generate',
  async run(req) { this.calls++; return { output: { kind: 'text', content: 'hola' }, costUSD: 0.01, latencyMs: 2, model: req.model.id }; },
});
const demo = { ...proveedor('mock'), id: 'mock' };
const config = (settings, providers = {}) => ({
  providers: { alfa: { enabled: true, priority: 1 }, mock: { enabled: true, priority: 99 }, ...providers },
  routing: { 'text.generate': { capability: 'text.generate', chain: [{ provider: 'alfa' }], policy: 'balanced' } },
  settings: { ...DEFAULT_SETTINGS, ...settings },
  source: 'test',
});
const montar = (cfg, adapters) => {
  const ledger = memoryLedger();
  return { ledger, router: createRouter({ adapters, loadConfig: async () => cfg, ledger, health: memoryHealth(() => 1), now: () => 1 }) };
};
const pedido = { capability: 'text.generate', input: { prompt: 'hola' }, userId: 'u1', jobId: 'j1', stepId: 's1' };

{
  const alfa = proveedor('alfa');
  const m = { ...demo, calls: 0 };
  const { router, ledger } = montar(config({ iaDetenida: true }), { alfa, mock: m });
  const decision = await router.route(pedido);
  check('2) detenida: el router no propone ningún candidato, y dice por qué',
    decision.candidates.length === 0 && decision.skipped.some((s) => s.reason === 'ia_detenida'), JSON.stringify(decision.skipped));
  let error = null;
  try { await router.execute(pedido); } catch (e) { error = e; }
  check('3) …y ejecutar contesta NOT_AVAILABLE', error && error.code === 'NOT_AVAILABLE', String(error && error.code));
  check('4) sin llamar a ningún proveedor, ni real ni demo', alfa.calls === 0 && m.calls === 0);
  check('5) y sin abrir una sola fila en el libro de generaciones', Object.keys(ledger.records).length === 0);
}
{
  /* Lo que pasaba antes: todos desactivados → entraba el demo. Con el interruptor, tampoco. */
  const m = { ...demo, calls: 0 };
  const { router } = montar(config({ iaDetenida: true, allowMockFallback: true }, { alfa: { enabled: false, priority: 1 } }), { alfa: proveedor('alfa'), mock: m });
  let error = null;
  try { await router.execute(pedido); } catch (e) { error = e; }
  check('6) ni siquiera entra el modo demo (que se cobraba a precio de catálogo)', error && error.code === 'NOT_AVAILABLE' && m.calls === 0);
}
{
  const alfa = proveedor('alfa');
  const { router } = montar(config({ iaDetenida: false }), { alfa, mock: { ...demo, calls: 0 } });
  const r = await router.execute(pedido);
  check('7) CONTROL: con el interruptor apagado todo funciona igual', r.output.content === 'hola' && alfa.calls === 1);
}

/* ── C. El ejecutor del Core (puertas canario) ──────────────────────────── */
const fuenteCore = leer('functions/src/engine/gateway.ts');
check('8) el ejecutor del Core rechaza antes de despachar si la IA está detenida',
  /if \(config\.settings\.iaDetenida === true\) return rechazo\('PROVIDER_UNAVAILABLE', 'provider_disabled', \{ iaDetenida: true \}\);/.test(fuenteCore)
  && fuenteCore.indexOf('iaDetenida === true') < fuenteCore.indexOf('adapter.run({'));

/* ── D. El avatar ───────────────────────────────────────────────────────── */
{
  const configMod = lib('engine/config.js');
  const motor = lib('credits/creditEngine.js').creditEngine;
  const vertex = lib('vertexAI.js');
  const avatar = lib('generateAvatar.js');
  const orig = { config: configMod.loadConfig, gasta: motor.spendCredits, cuenta: motor.ensureAccount, gen: vertex.generateAvatarWithImagen };
  let gastos = 0;
  let generaciones = 0;
  configMod.loadConfig = async () => ({ settings: { ...DEFAULT_SETTINGS, iaDetenida: true } });
  motor.ensureAccount = async () => ({});
  motor.spendCredits = async () => { gastos++; return { transactionId: 'usage_x', status: 'AUTHORIZED', amount: 5, duplicate: false }; };
  vertex.generateAvatarWithImagen = async () => { generaciones++; return 'data:image/png;base64,AA'; };
  const r = await avatar.generateAvatarWithGemini.run({ auth: { uid: 'u1' }, data: { selections: { gender: 'male' }, requestId: 'avatar_k1' } })
    .then(() => ({ ok: true }), (e) => ({ ok: false, e }));
  check('9) detenida: el avatar contesta «no disponible» ANTES de cobrar o generar',
    !r.ok && r.e.code === 'unavailable' && gastos === 0 && generaciones === 0, `${r.e && r.e.code} · gastos ${gastos} · generaciones ${generaciones}`);
  check('10) …con un mensaje para la persona, sin nombres de proveedores ni detalles internos',
    !r.ok && !/gemini|vertex|imagen|google|provider|proveedor|iaDetenida/i.test(String(r.e.message)), String(r.e && r.e.message));
  Object.assign(configMod, { loadConfig: orig.config });
  Object.assign(motor, { spendCredits: orig.gasta, ensureAccount: orig.cuenta });
  vertex.generateAvatarWithImagen = orig.gen;
}

/* ── E. Quién lo enciende ───────────────────────────────────────────────── */
const fuenteAdmin = leer('functions/src/engine/admin.ts');
check('11) solo administración lo cambia (engineAdmin → setSettings), y queda quién lo hizo',
  /'iaDetenida'/.test(fuenteAdmin) && /updatedBy:\s*request\.auth/.test(fuenteAdmin));
const { validateSettings } = lib('engine/admin.js');
let rechazado = null;
try { validateSettings({ iaDetenida: 'sí' }); } catch (e) { rechazado = e; }
check('12) y solo acepta true o false', rechazado && rechazado.code === 'invalid-argument');
let aceptado = true;
try { validateSettings({ iaDetenida: true }); validateSettings({ iaDetenida: false }); } catch { aceptado = false; }
check('13) …true y false sí', aceptado);

verificacion.recordRealSuccess = registrarReal;

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
