/*
 * DESACTIVACIÓN SELECTIVA SIN REDESPLEGAR — Frente H (docs/LANZAMIENTO.md § Desactivación selectiva).
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Que los interruptores que el runbook manda tocar hacen lo que dice, contra el router COMPILADO (no una copia):
 *
 *   A · apagar UNA capacidad (el vídeo) con `aiRouting/<capacidad>.chain = [{provider:'music-pending'}]`:
 *       no llama a nadie, no abre fila en el libro, contesta NOT_AVAILABLE (el llamador reembolsa) y el resto sigue;
 *   B · las dos trampas: apagar el PROVEEDOR con `allowMockFallback` encendido deja que el demo atienda y COBRE;
 *       y un cupo por persona de 0 no apaga nada, significa «sin límite»;
 *   C · `iaDetenida` lo para todo;
 *   D · `capacidadApagada` de scripts/prelanzamiento.mjs decide lo mismo que el router en cada escenario;
 *   E · `engineAdmin` acepta el valor del runbook, y el efecto tarda como mucho la caché de la configuración.
 *
 * Usa el compilado: `npm run build` antes.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const callado = async (fn) => {
  const o = { log: console.log, warn: console.warn };
  console.log = () => {}; console.warn = () => {};
  try { return { valor: await fn() }; } catch (error) { return { error }; } finally { Object.assign(console, o); }
};

const { createRouter, memoryHealth } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { DEFAULT_SETTINGS, DEFAULT_ROUTING, DEFAULT_PROVIDERS, ADAPTERS } = lib('engine/registry.js');
const { createLimiter } = lib('engine/limits.js');
lib('engine/verification.js').recordRealSuccess = async () => {};
const { capacidadApagada } = await import(pathToFileURL(path.join(RAIZ, 'scripts/prelanzamiento.mjs')).href);

const VIDEO = ['video.generate', 'video.image_to_video', 'video.reference'];
const falso = (id, caps, modality) => ({
  id, name: id, modalities: [modality], calls: 0,
  models: [{ id: `${id}-1`, provider: id, capabilities: caps, quality: 4, speed: 3, cost: { unit: 'call', usd: 0.05 }, maxDurationSec: 15 }],
  isConfigured: () => true, supports: (c) => caps.includes(c),
  async run(req) { this.calls++; return { output: { kind: modality === 'video' ? 'video' : 'text', url: 'https://x/v.mp4', content: 'ok', durationSec: 5 }, costUSD: 0.05, latencyMs: 2, model: req.model.id }; },
});
/** Como producción: Seedance con clave (vídeo), un proveedor de texto, el marcador de música (apagado) y el demo. */
const montar = ({ settings = {}, routing = {}, providers = {} } = {}) => {
  const adapters = {
    seedance: falso('seedance', [...VIDEO], 'video'),
    alfa: falso('alfa', ['text.generate'], 'text'),
    'music-pending': { ...falso('music-pending', ['music.generate'], 'audio') },
    mock: { ...falso('mock', [...VIDEO, 'video.compose', 'text.generate', 'music.generate'], 'video') },
  };
  const cfg = {
    providers: { ...DEFAULT_PROVIDERS, alfa: { enabled: true, priority: 1 }, ...providers },
    routing: { ...DEFAULT_ROUTING, 'text.generate': { capability: 'text.generate', chain: [{ provider: 'alfa' }], policy: 'balanced' }, ...routing },
    settings: { ...DEFAULT_SETTINGS, ...settings },
    source: 'test',
  };
  const ledger = memoryLedger();
  const router = createRouter({ adapters, loadConfig: async () => cfg, ledger, health: memoryHealth(() => 1), now: () => 1 });
  const atiende = Object.fromEntries(Object.entries(adapters).map(([k, a]) => [k, (c) => a.supports(c)]));
  return { router, ledger, adapters, cfg, atiende };
};
const pedir = (router, capability) => callado(() => router.execute({ capability, input: { prompt: 'un gato', durationSec: 5 }, userId: 'u1', requestId: `r_${capability}`, jobId: 'j1', stepId: 's1' }));
const APAGADO = { capability: 'x', chain: [{ provider: 'music-pending' }], policy: 'quality-first' };
const apagarVideo = Object.fromEntries([...VIDEO, 'video.compose'].map((c) => [c, { ...APAGADO, capability: c }]));

/** El router y el prelanzamiento tienen que decir lo mismo. */
const coinciden = async (m, cap) => {
  const r = await pedir(m.router, cap);
  const apagadaSegunRouter = !!r.error && r.error.code === 'NOT_AVAILABLE';
  return { r, ok: apagadaSegunRouter === capacidadApagada({ settings: m.cfg.settings, routing: m.cfg.routing, providers: m.cfg.providers, atiende: m.atiende }, cap) };
};

/* ═══ A · Apagar el vídeo, y solo el vídeo ═════════════════════════════════ */
console.log('\n── A · aiRouting/<capacidad>.chain = [{provider:"music-pending"}] ──');
{
  const antes = montar();
  const v0 = await pedir(antes.router, 'video.generate');
  check('de partida (como hoy en producción) el vídeo lo atiende Seedance', v0.valor && v0.valor.provider === 'seedance', v0.error && v0.error.code);

  const m = montar({ routing: apagarVideo });
  const resultados = [];
  for (const c of VIDEO) resultados.push(await pedir(m.router, c));
  check('A) con la cadena apuntando a music-pending, las tres capacidades de vídeo contestan NOT_AVAILABLE',
    resultados.every((x) => x.error && x.error.code === 'NOT_AVAILABLE'), resultados.map((x) => (x.error ? x.error.code : x.valor.provider)).join(','));
  check('A) …sin llamar a Seedance ni al demo', m.adapters.seedance.calls === 0 && m.adapters.mock.calls === 0);
  check('A) …y sin abrir ninguna fila en el libro (nada que cobrar ni que liquidar)', Object.keys(m.ledger.records).length === 0);
  const t = await pedir(m.router, 'text.generate');
  check('A) el resto de Weë sigue igual: el texto lo atiende su proveedor', t.valor && t.valor.provider === 'alfa', t.error && t.error.code);
  const compose = await pedir(m.router, 'video.compose');
  check('A) video.compose solo lo atiende el demo: con allowMockFallback encendido, la cadena no basta (lo atiende mock)', compose.valor && compose.valor.provider === 'mock');
  const m2 = montar({ routing: apagarVideo, settings: { allowMockFallback: false } });
  const compose2 = await pedir(m2.router, 'video.compose');
  check('A) …y con allowMockFallback=false, video.compose también queda apagado', compose2.error && compose2.error.code === 'NOT_AVAILABLE');
}

/* ═══ B · Las dos trampas ══════════════════════════════════════════════════ */
console.log('\n── B · Lo que parece apagar y no apaga ──');
{
  const m = montar({ providers: { seedance: { enabled: false, priority: 1 } } });
  const v = await pedir(m.router, 'video.generate');
  check('B) TRAMPA: apagar el PROVEEDOR (aiProviders/seedance.enabled=false) con allowMockFallback encendido → el demo atiende el vídeo',
    v.valor && v.valor.provider === 'mock' && v.valor.demo === true, v.error ? v.error.code : v.valor.provider);
  check('B) …y ese resultado demo tiene precio de catálogo (B4-03: se cobraría)', v.valor && v.valor.credits > 0, String(v.valor && v.valor.credits));
  const m2 = montar({ providers: { seedance: { enabled: false, priority: 1 } }, settings: { allowMockFallback: false } });
  const v2 = await pedir(m2.router, 'video.generate');
  check('B) apagar el proveedor SÍ apaga el vídeo cuando allowMockFallback=false', v2.error && v2.error.code === 'NOT_AVAILABLE');

  const store = new Map();
  const fakeDb = {
    collection: () => ({ doc: (id) => ({ id, get: async () => ({ exists: store.has(id), data: () => store.get(id) }) }) }),
    runTransaction: async (fn) => fn({ get: async (ref) => ({ exists: store.has(ref.id), data: () => store.get(ref.id) }), set: (ref, d) => store.set(ref.id, { ...(store.get(ref.id) || {}), ...d }) }),
  };
  const limiter = createLimiter({ db: () => fakeDb, now: () => 1 });
  let cero = null;
  try { for (let i = 0; i < 5; i++) await limiter.reserve('u1', { video: 1 }, { perUserPerDay: { video: 0 } }, undefined, '2026-10-14'); } catch (e) { cero = e; }
  check('B) TRAMPA: limits.perUserPerDay.video = 0 NO apaga el vídeo: significa «sin límite» (engine/limits.ts:108)', cero === null, cero && cero.code);
  let uno = null;
  try { for (let i = 0; i < 2; i++) await limiter.reserve('u2', { video: 1 }, { perUserPerDay: { video: 1 } }, undefined, '2026-10-14'); } catch (e) { uno = e; }
  check('B) un cupo de 1 sí corta en la segunda (RATE_LIMITED)', uno && uno.code === 'RATE_LIMITED');
}

/* ═══ C · Todo ═════════════════════════════════════════════════════════════ */
console.log('\n── C · aiSettings/global.iaDetenida ──');
{
  const m = montar({ settings: { iaDetenida: true } });
  const t = await pedir(m.router, 'text.generate');
  const v = await pedir(m.router, 'video.generate');
  check('C) iaDetenida: texto y vídeo NOT_AVAILABLE, sin llamadas ni filas', t.error && v.error && t.error.code === 'NOT_AVAILABLE' && v.error.code === 'NOT_AVAILABLE'
    && Object.values(m.adapters).every((a) => a.calls === 0) && Object.keys(m.ledger.records).length === 0);
}

/* ═══ D · El prelanzamiento decide como el router ══════════════════════════ */
console.log('\n── D · capacidadApagada (scripts/prelanzamiento.mjs) = router ──');
{
  const escenarios = [
    ['por defecto', {}],
    ['cadena a music-pending', { routing: apagarVideo }],
    ['cadena + sin demo', { routing: apagarVideo, settings: { allowMockFallback: false } }],
    ['proveedor apagado con demo', { providers: { seedance: { enabled: false, priority: 1 } } }],
    ['proveedor apagado sin demo', { providers: { seedance: { enabled: false, priority: 1 } }, settings: { allowMockFallback: false } }],
    ['iaDetenida', { settings: { iaDetenida: true } }],
  ];
  const discrepan = [];
  for (const [nombre, e] of escenarios) {
    for (const cap of [...VIDEO, 'video.compose', 'text.generate']) {
      const { ok, r } = await coinciden(montar(e), cap);
      if (!ok) discrepan.push(`${nombre}/${cap}: router=${r.error ? r.error.code : r.valor.provider}`);
    }
  }
  check(`D) en ${escenarios.length} escenarios × 5 capacidades, el prelanzamiento y el router dicen lo mismo`, discrepan.length === 0, discrepan.join(' | '));
}

/* ═══ E · Se puede hacer como dice el runbook ══════════════════════════════ */
console.log('\n── E · engineAdmin y la caché ──');
{
  const admin = leer('functions/src/engine/admin.ts');
  check('E) engineAdmin/setRouting acepta `music-pending` (valida contra ADAPTERS, y está)', /if \(!ADAPTERS\[provider\]\)/.test(admin) && !!ADAPTERS['music-pending']);
  check('E) music-pending está apagado y no atiende vídeo (no puede empezar a generar vídeo por error)',
    DEFAULT_PROVIDERS['music-pending'].enabled === false && VIDEO.every((c) => !ADAPTERS['music-pending'].supports(c)));
  check('E) setSettings deja tocar iaDetenida, allowMockFallback y maxUsdPerDay, y anota quién', /'allowMockFallback'.*'iaDetenida', 'maxUsdPerDay'/.test(admin) && /updatedBy: request\.auth\?\.uid/.test(admin));
  check('E) el efecto llega a cada instancia en ≤ 60 s (caché de la configuración del motor)', /const CACHE_MS = 60_000;/.test(leer('functions/src/engine/config.ts')));
  check('E) el runbook documenta las dos trampas y el valor exacto', (() => {
    const doc = leer('docs/LANZAMIENTO.md');
    return /music-pending/.test(doc) && /allowMockFallback/.test(doc) && /perUserPerDay/.test(doc) && /60 s/.test(doc);
  })());
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
