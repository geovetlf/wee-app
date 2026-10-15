/**
 * DEMO Y GENERACIÓN REAL, POR CAPACIDAD — LA PROPUESTA, COMO PRUEBA (no toca `router.ts`).
 *
 * Doc: LANZAMIENTO/allowmockfallback-diagnostico-y-propuesta.md §6. Esta suite hace dos cosas, ninguna sobre producción:
 *
 *   A  CARACTERIZA lo que el router compilado hace HOY y que la propuesta debe conservar: nunca sustituye una IA real que falla por
 *      una muestra; sin proveedor real y con el demo permitido, contesta de muestra y vale 0 Credits; sin proveedor real y con el
 *      demo apagado, `NOT_AVAILABLE` sin llamar a nada. Son las pruebas de regresión de la propuesta: si el cambio de `router.ts`
 *      las rompe, el cambio está mal.
 *   B  ESPECIFICA `permiteDemo(settings, capability)`: la función pura que sustituiría a `settings.allowMockFallback` en
 *      `router.ts:340`. Aquí vive solo como referencia (no se importa del código de Weë AI, que no se ha tocado): herencia, prefijo,
 *      lo más específico gana, un valor inválido no afloja nada, y sin ajuste nuevo el comportamiento es idéntico al de hoy.
 *   C  ESPECIFICA el cobro: un resultado de muestra vale 0 Credits en las 7 capacidades que solo pueden dar demo.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib', p));
let fallos = 0;
const check = (nombre, ok, extra = '') => { if (!ok) fallos++; console.log(`${ok ? '✔' : '✘'} ${nombre}${extra ? ` — ${extra}` : ''}`); };

const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const { createRouter, memoryHealth } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { creditsFor } = lib('engine/pricing.js');
const verificacion = lib('engine/verification.js');
verificacion.recordRealSuccess = async () => {};

/* ── B · la función de la propuesta (referencia) ────────────────────────────────────────────────────────────────────────────── */
/** El valor que manda para una capacidad: la clave exacta, si no el prefijo más largo, si no `allowMockFallback`. Lo inválido se ignora. */
const permiteDemo = (settings, capability) => {
  const global = settings?.allowMockFallback !== false; // hoy: solo un `false` explícito lo apaga
  const tabla = settings?.mockFallbackPorCapacidad;
  if (!tabla || typeof tabla !== 'object') return global;
  if (typeof tabla[capability] === 'boolean') return tabla[capability];
  const prefijos = Object.keys(tabla).filter((k) => k.endsWith('.') && capability.startsWith(k) && typeof tabla[k] === 'boolean').sort((a, b) => b.length - a.length);
  return prefijos.length ? tabla[prefijos[0]] : global;
};

/* ── A · lo que el router hace hoy y la propuesta debe conservar ────────────────────────────────────────────────────────────── */
const adaptador = (id, { configurado, falla = false }) => ({
  id, name: id, modalities: ['text'], calls: 0,
  models: [{ id: `${id}-m`, provider: id, capabilities: ['text.generate'], quality: id === 'mock' ? 1 : 4, speed: 3, cost: { unit: 'call', usd: id === 'mock' ? 0 : 0.01 } }],
  isConfigured: () => configurado, supports: (c) => c === 'text.generate',
  async run() { this.calls++; if (falla) throw new Error('el proveedor no responde'); return { output: { kind: 'text', text: id === 'mock' ? 'muestra' : 'real' }, costUSD: id === 'mock' ? 0 : 0.01, latencyMs: 1 }; },
});
const configuracion = (ajustes) => ({
  providers: { gemini: { enabled: true, priority: 1 }, mock: { enabled: true, priority: 99 } },
  routing: { 'text.generate': { capability: 'text.generate', chain: [{ provider: 'gemini' }], policy: 'quality-first' } },
  settings: { ...DEFAULT_SETTINGS, ...ajustes }, source: 'test',
});
const pedido = { capability: 'text.generate', input: { prompt: 'hola' }, userId: 'u1', jobId: 'j1', stepId: 's1' };
const ejecutar = async ({ real, ajustes }) => {
  const gemini = adaptador('gemini', real);
  const mock = adaptador('mock', { configurado: true });
  const ledger = memoryLedger();
  const router = createRouter({ adapters: { gemini, mock }, loadConfig: async () => configuracion(ajustes), ledger, health: memoryHealth(() => 1), now: () => 1 });
  const r = await router.execute(pedido).then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));
  return { r, gemini, mock, ledger };
};

{
  const x = await ejecutar({ real: { configurado: true, falla: true }, ajustes: { allowMockFallback: true } });
  check('A1) con un proveedor real configurado que FALLA, y el demo permitido, el motor lanza el error: NUNCA entrega una muestra en su lugar',
    !x.r.ok && x.mock.calls === 0 && x.gemini.calls >= 1, `${x.r.e?.code} real=${x.gemini.calls} demo=${x.mock.calls}`);
  check('A2) …y ese error no es «no disponible» disfrazado de resultado: no hay `output`', !x.r.ok && !x.r.v);
}
{
  const x = await ejecutar({ real: { configurado: false }, ajustes: { allowMockFallback: true } });
  check('A3) sin proveedor real y con el demo permitido: contesta de MUESTRA (`demo: true`), con el proveedor mock, sin tocar al real',
    x.r.ok && x.r.v.demo === true && x.r.v.provider === 'mock' && x.gemini.calls === 0, JSON.stringify({ demo: x.r.v?.demo, provider: x.r.v?.provider }));
  check('A4) …y la muestra vale 0 Credits y 0 USD (estado «cobro cero»: nada que reservar ni liquidar)', x.r.ok && x.r.v.credits === 0, `credits=${x.r.v?.credits}`);
}
{
  const x = await ejecutar({ real: { configurado: false }, ajustes: { allowMockFallback: false } });
  check('A5) sin proveedor real y con el demo APAGADO: NOT_AVAILABLE, sin llamar al real ni al demo (estado de error claro)',
    !x.r.ok && x.r.e?.code === 'NOT_AVAILABLE' && x.gemini.calls === 0 && x.mock.calls === 0, `${x.r.e?.code} real=${x.gemini.calls} demo=${x.mock.calls}`);
  check('A6) …con un mensaje público sin proveedores ni ajustes', !/gemini|mock|allowMockFallback|aiSettings/i.test(String(x.r.e?.message)), String(x.r.e?.message));
  check('A7) …y sin filas abiertas en el libro (nada que reembolsar ni cerrar)', Object.keys(x.ledger.records).length === 0, String(Object.keys(x.ledger.records).length));
}
{
  const x = await ejecutar({ real: { configurado: true }, ajustes: { allowMockFallback: false } });
  check('A8) CONTROL: con un proveedor real que responde y el demo apagado, genera con el real (el demo apagado no estorba a lo real)',
    x.r.ok && x.r.v.demo === false && x.r.v.provider === 'gemini' && x.r.v.credits > 0, JSON.stringify({ demo: x.r.v?.demo, provider: x.r.v?.provider, credits: x.r.v?.credits }));
}

/* ── B · la función pura de la propuesta ────────────────────────────────────────────────────────────────────────────────────── */
const S = (extra) => ({ ...DEFAULT_SETTINGS, ...extra });
check('B1) sin ajuste nuevo, idéntico a hoy: allowMockFallback decide (true por defecto)', permiteDemo(S({}), 'music.generate') === true && permiteDemo(S({ allowMockFallback: false }), 'music.generate') === false);
check('B2) una clave exacta manda sobre el global', permiteDemo(S({ allowMockFallback: true, mockFallbackPorCapacidad: { 'doc.render': false } }), 'doc.render') === false);
check('B3) un prefijo («video.») cubre sus capacidades y no las ajenas',
  permiteDemo(S({ mockFallbackPorCapacidad: { 'video.': false } }), 'video.compose') === false && permiteDemo(S({ mockFallbackPorCapacidad: { 'video.': false } }), 'voice.tts') === true);
check('B4) lo más específico gana: el prefijo más largo, y la clave exacta sobre cualquier prefijo',
  permiteDemo(S({ mockFallbackPorCapacidad: { 'video.': false, 'video.compose': true } }), 'video.compose') === true
  && permiteDemo(S({ mockFallbackPorCapacidad: { 'video.': false, 'video.mon': true } }), 'video.montage') === false
  && permiteDemo(S({ mockFallbackPorCapacidad: { 'a.': true, 'a.b.': false } }), 'a.b.c') === false);
check('B5) un valor inválido se ignora (no afloja ni aprieta): cae en el siguiente nivel',
  permiteDemo(S({ mockFallbackPorCapacidad: { 'video.compose': 'sí', 'video.': 3 } }), 'video.compose') === true
  && permiteDemo(S({ allowMockFallback: false, mockFallbackPorCapacidad: 'nada' }), 'video.compose') === false);
check('B6) un campo ausente o roto no lanza', [undefined, null, {}, { mockFallbackPorCapacidad: null }, { mockFallbackPorCapacidad: [] }].every((s) => { try { return typeof permiteDemo(s, 'x.y') === 'boolean'; } catch { return false; } }));
check('B7) reversible: borrar la entrada devuelve exactamente el comportamiento anterior',
  permiteDemo(S({ mockFallbackPorCapacidad: { 'music.': false } }), 'music.generate') === false && permiteDemo(S({ mockFallbackPorCapacidad: {} }), 'music.generate') === true);

/* ── C · el cobro: la muestra vale 0 en las capacidades que solo pueden dar demo ───────────────────────────────────────────── */
const SOLO_DEMO = ['video.compose', 'video.montage', 'video.vertical', 'doc.render', 'music.generate', 'audio.sfx', 'world.generate'];
check('C1) las 7 capacidades que hoy solo pueden dar demo cuestan 0 Credits en modo demo', SOLO_DEMO.every((c) => creditsFor(c, 0, DEFAULT_SETTINGS, true, {}) === 0),
  SOLO_DEMO.map((c) => `${c}=${creditsFor(c, 0, DEFAULT_SETTINGS, true, {})}`).join(' '));
check('C2) CONTROL: una capacidad real con coste sí cobra (el 0 no es un cero universal)', creditsFor('text.generate', 0.01, DEFAULT_SETTINGS, false, {}) > 0);

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ La propuesta de demo por capacidad está especificada y lo que debe conservar está fijado');
process.exit(fallos ? 1 : 0);
