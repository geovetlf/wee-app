/*
 * FASE 1 — CIERRE PRE-LANZAMIENTO: JURISDICTION GATE + BLOQUEO REGIONAL DE SEEDANCE (2026-10-07).
 *
 * COUNTRY (users.country del Perfil Real, leído en el servidor) → JURISDICTION → ELEGIBILIDAD → ROUTER → adaptador.
 * No hay un sistema nuevo: los datos de Seedance (`TERRITORIO_DE_SEEDANCE`) entran en la regla común
 * (`engine/elegibilidad.ts`) y el Router de verdad decide. Se prueba que:
 *   · US / IN / CN / país desconocido + Seedance → no elegible, y el adaptador NUNCA se llama;
 *   · un país permitido sigue la evaluación normal;
 *   · si hay otro proveedor elegible para la misma capacidad, el Router lo elige (mecanismo genérico; en producción la
 *     cadena de vídeo sigue siendo solo Seedance: el respaldo de vídeo es PENDING DECISION, CLAUDE.md §6);
 *   · sin alternativa → NOT_AVAILABLE con un motivo público genérico, sin nombrar proveedor ni motivo interno; la razón
 *     interna queda en la decisión y en el libro;
 *   · lo que mande el cliente (país, jurisdicción, idioma) se ignora;
 *   · los cinco estados territoriales se distinguen.
 * Determinista, sin red ni proveedor real. $0.
 *
 *   node functions/test/jurisdiccion-seedance.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const lib = (p) => require(path.resolve(AQUI, '../lib/', p));
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const E = lib('engine/elegibilidad.js');
const { createRouter, memoryHealth } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { DEFAULT_SETTINGS, DEFAULT_ROUTING } = lib('engine/registry.js');
const { seedanceModels, TERRITORIO_DE_SEEDANCE } = lib('engine/providers/seedance.js');
const { jurisdiccionesDeclaradas, PAISES_DEL_CATALOGO } = lib('engine/jurisdiccion.js');
const { MENSAJE_DE_NO_DISPONIBLE } = lib('engine/errors.js');

let failures = 0; let n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log(`✔ ${name}`); else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); } };
const CAP = 'video.generate';
const J = (...jurisdicciones) => ({ jurisdicciones });

/* Un adaptador con los MODELOS REALES de Seedance y un run() que cuenta: si el Router lo llamara, se vería. */
const seedance = () => ({
  id: 'seedance', name: 'Seedance', modalities: ['video'], models: seedanceModels,
  isConfigured: () => true, supports: (c) => seedanceModels.some((m) => m.capabilities.includes(c)), llamadas: 0,
  async run(req) { this.llamadas++; return { output: { kind: 'video', url: `https://storage.test/seedance/${req.model.id}.mp4` }, costUSD: 1, latencyMs: 1, model: req.model.id }; },
});
/* Un proveedor de vídeo SINTÉTICO, solo para probar el mecanismo de respaldo. No es ningún proveedor real. */
const alternativo = () => ({
  id: 'alt', name: 'alt', modalities: ['video'],
  models: [{ id: 'alt-video', provider: 'alt', capabilities: [CAP], quality: 3, speed: 3, cost: { unit: 'second', usd: 0.1 } }],
  isConfigured: () => true, supports: (c) => c === CAP, llamadas: 0,
  async run(req) { this.llamadas++; return { output: { kind: 'video', url: 'https://storage.test/alt.mp4' }, costUSD: 0.5, latencyMs: 1, model: req.model.id }; },
});
const demo = () => ({ id: 'mock', name: 'demo', modalities: ['video'], models: [{ id: 'demo', provider: 'mock', capabilities: [CAP], quality: 1, speed: 5, cost: { unit: 'call', usd: 0 } }], isConfigured: () => true, supports: () => true, llamadas: 0, async run() { this.llamadas++; return { output: { kind: 'video', url: 'demo' }, costUSD: 0, latencyMs: 1 }; } });
const configuracion = (cadena) => ({
  providers: { mock: { enabled: true, priority: 99 }, ...Object.fromEntries(cadena.map((p, i) => [p, { enabled: true, priority: i + 1 }])) },
  routing: { [CAP]: { capability: CAP, chain: cadena.map((provider) => ({ provider })), policy: 'quality-first' } },
  settings: { ...DEFAULT_SETTINGS, allowMockFallback: true },
  source: 'test',
});
/* La fuente de la cuenta: lo que el SERVIDOR lee del Perfil Real. */
const montar = (adapters, cadena, pais) => {
  const ledger = memoryLedger();
  const lecturas = [];
  const r = createRouter({
    adapters, loadConfig: async () => configuracion(cadena), ledger, health: memoryHealth(() => 1_000), now: () => 1_000,
    jurisdiccionesDe: async (uid) => { lecturas.push(uid); return jurisdiccionesDeclaradas(uid, pais === undefined ? [] : [{ uid, profileType: 'real', country: pais }]); },
  });
  return { r, ledger, lecturas };
};
const peticion = (extra = {}) => ({ capability: CAP, input: { prompt: 'un faro al atardecer' }, userId: 'u1', requestId: 'req-1', ...extra });
const lanzado = async (f) => { try { await f(); return null; } catch (e) { return e; } };

/* ── 0 · El dato ─────────────────────────────────────────────────────────── */
check('0) una sola fuente: los cuatro modelos de Seedance comparten el mismo dato territorial (US, IN, CN bloqueados; resto según la evaluación normal) y sus códigos son del catálogo de Weë',
  seedanceModels.length === 4 && seedanceModels.every((m) => m.territorio === TERRITORIO_DE_SEEDANCE)
  && JSON.stringify(TERRITORIO_DE_SEEDANCE.bloqueadas) === '["US","IN","CN"]' && TERRITORIO_DE_SEEDANCE.resto === 'APPROVED'
  && TERRITORIO_DE_SEEDANCE.bloqueadas.every((c) => PAISES_DEL_CATALOGO.has(c)) && Object.isFrozen(TERRITORIO_DE_SEEDANCE));
check('0b) el dato vive solo en el adaptador de Seedance: ningún otro archivo de functions/src repite la lista',
  !/\['US', 'IN', 'CN'\]/.test(sinComentarios(leer('functions/src/engine/elegibilidad.ts'))) && !/\['US', 'IN', 'CN'\]/.test(sinComentarios(leer('functions/src/engine/router.ts'))));

/* ── 1 · Los estados ─────────────────────────────────────────────────────── */
const S25 = seedanceModels[0];
check('1) estados territoriales distinguibles: US/IN/CN → TERRITORY_DENIED; desconocido → TERRITORY_UNKNOWN; ES → TERRITORY_ALLOWED; apagado → PROVIDER_DISABLED; en revisión → CONTRACTUAL_STATUS_UNKNOWN',
  ['US', 'IN', 'CN'].every((p) => E.estadoTerritorial(S25, undefined, J(p)) === 'TERRITORY_DENIED')
  && E.estadoTerritorial(S25) === 'TERRITORY_UNKNOWN' && E.estadoTerritorial(S25, undefined, J('es')) === 'TERRITORY_UNKNOWN'
  && E.estadoTerritorial(S25, undefined, J('ES')) === 'TERRITORY_ALLOWED'
  && E.estadoTerritorial(S25, { enabled: false }, J('ES')) === 'PROVIDER_DISABLED'
  && E.estadoTerritorial(S25, undefined, J('ES'), false) === 'PROVIDER_DISABLED'
  && E.estadoTerritorial({ ...S25, territorio: { ...TERRITORIO_DE_SEEDANCE, resto: 'REVIEW_REQUIRED' } }, undefined, J('ES')) === 'CONTRACTUAL_STATUS_UNKNOWN');
check('1b) Hong Kong, Macao y Taiwán no son «CN» (código propio), y una cuenta con un perfil en ES y otro en US queda bloqueada (cualquiera bloquea)',
  ['HK', 'MO', 'TW'].every((p) => E.modeloElegible(S25, undefined, J(p)).elegible) && !E.modeloElegible(S25, undefined, J('ES', 'US')).elegible);

/* ── 2 · El Router de verdad, sin alternativa (la cadena de producción: solo Seedance) ───── */
check('2) la cadena por defecto de vídeo sigue siendo SOLO Seedance (CLAUDE.md §6): esta fase no añade proveedores de vídeo',
  ['video.generate', 'video.image_to_video', 'video.reference'].every((c) => JSON.stringify(DEFAULT_ROUTING[c].chain.map((l) => l.provider)) === '["seedance"]'));

for (const pais of ['US', 'IN', 'CN', undefined, 'XX', 'es']) {
  const s = seedance(); const mock = demo();
  const { r, ledger } = montar({ seedance: s, mock }, ['seedance'], pais);
  const err = await lanzado(() => r.execute(peticion()));
  /* Definitivo (2026-10-07): la jurisdicción no es una conversación; sea cual sea el país, el motivo es el genérico. */
  const esperado = 'no_disponible';
  check(`3) ${pais ?? 'sin país'} + Seedance → NOT_AVAILABLE «${esperado}», el adaptador no se llama, ni el demo, ni se abre el libro`,
    err?.code === 'NOT_AVAILABLE' && err.details?.reason === esperado && err.message === MENSAJE_DE_NO_DISPONIBLE[esperado]
    && s.llamadas === 0 && mock.llamadas === 0 && Object.keys(ledger.records).length === 0,
    JSON.stringify({ code: err?.code, details: err?.details, s: s.llamadas, mock: mock.llamadas }));
  check(`3b) ${pais ?? 'sin país'}: lo que llega a la app no nombra proveedor, modelo, país ni escalón`,
    (() => { const t = `${err?.message} ${JSON.stringify(err?.details ?? {})}`; return !/seedance|byteplus|bytedance|BLOCKED|JURISDICTION|TERRITORY/i.test(t) && !/\b(US|IN|CN)\b/.test(t); })(),
    `${err?.message} ${JSON.stringify(err?.details)}`);
}

{
  const s = seedance();
  const { r, ledger } = montar({ seedance: s, mock: demo() }, ['seedance'], 'ES');
  const res = await r.execute(peticion());
  check('4) país permitido (ES) → sigue la evaluación normal: Seedance elegido, una llamada, y el libro guarda la jurisdicción usada',
    res.provider === 'seedance' && s.llamadas === 1
    && JSON.stringify(Object.values(ledger.records)[0]?.elegibilidad?.jurisdicciones) === '["ES"]', JSON.stringify({ p: res.provider, l: s.llamadas }));
}

{
  const { r } = montar({ seedance: seedance(), mock: demo() }, ['seedance'], 'US');
  const d = await r.route(peticion());
  check('5) la razón interna se queda en la decisión del Router (auditoría): proveedor, escalón y jurisdicción',
    d.candidates.length === 0 && d.skipped.some((x) => x.provider === 'seedance' && x.causa === 'elegibilidad' && x.estado === 'BLOCKED_FOR_JURISDICTION' && x.enOtraJurisdiccion === true)
    && JSON.stringify(d.jurisdicciones) === '["US"]', JSON.stringify(d.skipped));
}

/* ── 3 · Con alternativa elegible: el mecanismo genérico de respaldo ─────── */
for (const pais of ['US', 'IN', 'CN', undefined]) {
  const s = seedance(); const alt = alternativo();
  const { r } = montar({ seedance: s, alt, mock: demo() }, ['seedance', 'alt'], pais);
  const res = await r.execute(peticion());
  check(`6) ${pais ?? 'sin país'} + otro proveedor elegible para la misma capacidad → el Router lo elige y Seedance no se llama`,
    res.provider === 'alt' && alt.llamadas === 1 && s.llamadas === 0, JSON.stringify({ p: res.provider, s: s.llamadas }));
}
{
  const s = seedance(); const alt = alternativo();
  const { r } = montar({ seedance: s, alt, mock: demo() }, ['seedance', 'alt'], 'ES');
  const res = await r.execute(peticion());
  check('6b) en un país permitido el orden de la cadena manda: Seedance primero',
    res.provider === 'seedance' && alt.llamadas === 0);
}

/* ── 4 · El cliente no decide ────────────────────────────────────────────── */
{
  const s = seedance();
  const { r, lecturas } = montar({ seedance: s, mock: demo() }, ['seedance'], 'US');
  const err = await lanzado(() => r.execute(peticion({ input: { prompt: 'x', country: 'ES', jurisdicciones: ['ES'], locale: 'es-ES', language: 'es' } })));
  check('7) el país, la jurisdicción o el idioma que mande el cliente dentro de la entrada se ignoran: manda el Perfil Real leído en el servidor',
    err?.code === 'NOT_AVAILABLE' && s.llamadas === 0 && lecturas.length === 1);
}
const video = sinComentarios(leer('functions/src/creator/video.ts')) + sinComentarios(leer('functions/src/engine/video.ts'));
check('7b) ni el callable de vídeo ni el motor de vídeo ponen jurisdicciones ni país a partir de la petición del cliente',
  !/jurisdicciones|\bcountry\b/.test(video));

/* ── 5 · Multi-proveedor con proveedores SINTÉTICOS (simplificación definitiva, 2026-10-07) ───────────────────
 * Capacidad → jurisdicción de la cuenta → proveedores elegibles del registro → orden → primera ruta → ejecutar. Nada
 * de esto conoce a Seedance: A y B son de mentira, con sus propios países y su propia salud. */
const sintetico = (id, territorio, usd) => ({
  id, name: id, modalities: ['video'],
  models: [{ id: `${id}-v`, provider: id, capabilities: [CAP], quality: 4, speed: 3, cost: { unit: 'second', usd }, ...(territorio ? { territorio } : {}) }],
  isConfigured: () => true, supports: (c) => c === CAP, llamadas: 0,
  async run(req) { this.llamadas++; return { output: { kind: 'video', url: `https://storage.test/${id}.mp4` }, costUSD: usd, latencyMs: 1, model: req.model.id }; },
});
const SOLO_FUERA_DE_XA = Object.freeze({ bloqueadas: Object.freeze(['US']), resto: 'APPROVED' });
const SOLO_FUERA_DE_ES = Object.freeze({ bloqueadas: Object.freeze(['ES']), resto: 'APPROVED' });
const { precioPorRuta } = lib('creator/rutaPrevia.js');
{
  const A = sintetico('provA', SOLO_FUERA_DE_XA, 0.2); const B = sintetico('provB', undefined, 0.05);
  const { r } = montar({ provA: A, provB: B, mock: demo() }, ['provA', 'provB'], 'US');
  const d = await r.route(peticion());
  const res = await r.execute(peticion());
  check('C1) A excluido por la jurisdicción de la cuenta → el Router elige B, y A no se llama', d.candidates[0]?.provider === 'provB' && res.provider === 'provB' && A.llamadas === 0 && B.llamadas === 1);
  /* El precio cobrado es el de la ruta ELEGIDA (B), no el de la tarifa propia de la puerta. */
  const propio = { credits: 999, usd: 9.99, model: 'seedance-propio', service: 'ai_video_hd' };
  const cobrado = precioPorRuta(propio, d, ['seedance', 'mock']);
  check('C4) el precio es el de la ruta elegida: B con su estimación del registro, no la tarifa de otro proveedor',
    cobrado.credits === d.candidates[0].estimatedCredits && cobrado.usd === d.candidates[0].estimatedUsd && cobrado.model === 'provB-v' && cobrado.service === 'ai_video_hd');
  const conSeedance = { ...d, candidates: [{ ...d.candidates[0], provider: 'seedance' }] };
  check('C4b) si la ruta elegida es de un proveedor con tarifa propia (hoy Seedance), se cobra esa tarifa, sin cambios', precioPorRuta(propio, conSeedance, ['seedance', 'mock']) === propio);
}
{
  const A = sintetico('provA', undefined, 0.2); const B = sintetico('provB', undefined, 0.05);
  const health = memoryHealth(() => 1_000);
  const r = createRouter({ adapters: { provA: A, provB: B, mock: demo() }, loadConfig: async () => configuracion(['provA', 'provB']), ledger: memoryLedger(), health: { ...health, isOpen: (p) => p === 'provA' }, now: () => 1_000, jurisdiccionesDe: async () => ['ES'] });
  const res = await r.execute(peticion());
  check('C2) A temporalmente no disponible (sin salud) → B, sin que nadie lo vea', res.provider === 'provB' && A.llamadas === 0);
}
{
  const A = sintetico('provA', SOLO_FUERA_DE_ES, 0.2); const B = sintetico('provB', SOLO_FUERA_DE_ES, 0.05);
  const { r, ledger } = montar({ provA: A, provB: B, mock: demo() }, ['provA', 'provB'], 'ES');
  const err = await lanzado(() => r.execute(peticion()));
  const t = `${err?.message} ${JSON.stringify(err?.details ?? {})}`;
  check('C3) todos excluidos → fallo GENÉRICO de la capacidad: sin proveedor, modelo, motivo, contrato ni jurisdicción; nadie se llama, nada al libro',
    err?.code === 'NOT_AVAILABLE' && err.details?.reason === 'no_disponible' && err.message === MENSAJE_DE_NO_DISPONIBLE.no_disponible
    && !/provA|provB|regi[oó]n|pa[ií]s|\bES\b|BLOCKED|JURISDICTION|contrat|licen/i.test(t) && A.llamadas + B.llamadas === 0 && Object.keys(ledger.records).length === 0, t);
}
{
  const src = sinComentarios(leer('functions/src/creator/video.ts'));
  check('C5) el cliente no elige proveedor ni jurisdicción: generateVideo no lee `provider`, `allowedProviders` ni `jurisdicciones` de la petición',
    !/data\.(provider|allowedProviders|jurisdicciones|country)/.test(src));
  check('C6) la ruta se resuelve ANTES del cupo, la reserva y el cobro, y el precio sale de esa ruta',
    src.indexOf('rutaPrevia.decidir(') > 0 && src.indexOf('rutaPrevia.decidir(') < src.indexOf('precioPorRuta(')
    && src.indexOf('precioPorRuta(') < src.indexOf('limiter.reserve(') && src.indexOf('limiter.reserve(') < src.indexOf('creditEngine.spendCredits('));
}

{
  const idx = sinComentarios(leer('functions/src/creator/index.ts'));
  const run = idx.slice(idx.indexOf('export const creatorRun'));
  check('C7) creatorRun: la ruta de TODOS los pasos se resuelve antes del cupo y de la reserva (sin ruta: 0 cupo, 0 reserva)',
    run.indexOf('exigirRutaElegible(peticionesDelPlan(') > 0 && run.indexOf('exigirRutaElegible(') < run.indexOf('limiter.reserve(') && run.indexOf('limiter.reserve(') < run.indexOf('holdCredits('));
  const br = sinComentarios(leer('functions/src/creator/brain.ts'));
  const chat = br.slice(br.indexOf('export const brainChat'));
  check('C8) brainChat: la ruta antes del cupo y del cobro', chat.indexOf('exigirRutaElegible(') > 0 && chat.indexOf('exigirRutaElegible(') < chat.indexOf('limiter.reserve(') && chat.indexOf('limiter.reserve(') < chat.indexOf('creditEngine.spendCredits('));
  const mu = sinComentarios(leer('functions/src/creator/mundo.ts'));
  check('C9) generateWorld ya enrutaba antes del dinero (engine.route en prepararElMundo, antes de la reserva)', mu.indexOf('engine.route(') > 0 && mu.indexOf('engine.route(') < mu.indexOf('spendCredits('));
}

check('8) esta suite está en la cadena de `npm test`', /jurisdiccion-seedance\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ jurisdicción + Seedance: ${n} comprobaciones ($0)`);
process.exit(failures ? 1 : 0);
