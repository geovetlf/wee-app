/**
 * FASE 2 · «NO DISPONIBLE» DICE POR QUÉ, Y NADA DE DENTRO (misión «cerrar los gaps de world.generate», 2026-10-05).
 *
 * Antes, todo NOT_AVAILABLE decía «Ahora mismo no hay una IA disponible para esto. Inténtalo más tarde.», fuera una
 * pausa pasajera, una jurisdicción bloqueada, un modelo sin aprobar o una opción imposible. Ahora el Router dice la
 * CAUSA de cada descarte y de ahí sale un MOTIVO PÚBLICO cerrado; a la app viaja solo ese motivo.
 *
 *   A · Cada motivo, con el Router de verdad y proveedores dobles: ahora_no, en_tu_region, falta_tu_pais,
 *       con_estas_opciones y no_disponible (también el caso real de hoy: Hunyuan World, sin elegir en ninguna parte).
 *   B · Lo que sale hacia la app: el código y el motivo; ni proveedor, ni modelo, ni capacidad, ni jurisdicción, ni
 *       escalón, en NINGÚN error controlado.
 *   C · La app: cada motivo con su clave, en los dieciséis diccionarios, sin nombres de proveedores; y solo «ahora no»
 *       se puede reintentar.
 *
 * Sin red, sin proveedor real, sin Firebase. $0.
 *
 *   node functions/test/no-disponible.test.mjs     (usa el compilado: `npm run build` antes)
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearCargador, leer, RAIZ } from './filmmaker-cliente.mjs';

const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib/', p));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const E = lib('engine/errors.js');
const EL = lib('engine/elegibilidad.js');
const { createRouter, memoryHealth } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const { falAdapter } = lib('engine/providers/fal.js');
const { ProviderError } = lib('engine/http.js');

const CAP = 'world.generate';
const gobierno = (extra = {}) => ({
  providerModelId: 'x/y', version: '1', reviewStatus: 'APPROVED', active: 'ACTIVE',
  commercialUseStatus: 'ALLOWED', licenseStatus: 'CLEAR', outputRightsStatus: 'CLEAR', attributionRequired: false,
  licencias: [{ nombre: 'Licencia de prueba', url: 'https://ejemplo.test/licencia', notas: [] }],
  pricingMode: 'per_generation', providerPricing: null, inputSchema: [], outputSchema: [], fuentes: [], lastVerifiedAt: '2026-10-05', motivo: 'prueba', ...extra,
});
const modelo = (id, extra = {}) => ({ id, provider: 'terra', capabilities: [CAP], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.3 }, ...extra });
/** Aprobado y activo; bloqueado en la UE, el Reino Unido y Corea del Sur; aprobado en EE. UU. y México; en revisión en el resto. */
const TERRITORIAL = modelo('territorial', { gobierno: gobierno(), territorio: { bloqueadas: ['EU', 'GB', 'KR'], aprobadas: ['US', 'MX'], resto: 'REVIEW_REQUIRED', fuente: 'prueba' } });
/** Con reglas territoriales y SIN aprobar en ninguna parte: como Hunyuan World hoy. */
const NUNCA = modelo('nunca', { gobierno: gobierno({ reviewStatus: 'REVIEW_REQUIRED', active: 'DISABLED' }), territorio: { bloqueadas: ['EU'], aprobadas: [], resto: 'REVIEW_REQUIRED', fuente: 'prueba' } });

const proveedor = (id, modelos, opts = {}) => ({
  id, name: id, modalities: ['3d'],
  models: modelos.map((m) => ({ ...m, provider: id })),
  isConfigured: () => opts.configured !== false,
  supports: (c) => modelos.some((m) => m.capabilities.includes(c)),
  llamadas: 0,
  async run() { this.llamadas++; return { output: { kind: 'world', url: 'https://storage.test/x.bin' }, costUSD: 0.3, latencyMs: 1 }; },
});
const configuracion = (cadena, extra = {}) => ({
  providers: { ...Object.fromEntries(cadena.map((p, i) => [p.provider ?? p, { enabled: true, priority: i + 1, ...(extra.providers?.[p.provider ?? p] ?? {}) }])) },
  routing: { [CAP]: { capability: CAP, chain: cadena.map((e) => (typeof e === 'string' ? { provider: e } : e)), policy: 'quality-first' } },
  settings: { ...DEFAULT_SETTINGS, allowMockFallback: false, ...(extra.settings ?? {}) },
  source: 'test',
});
const router = (adapters, cfg, extra = {}) => createRouter({
  adapters, loadConfig: async () => cfg, ledger: memoryLedger(), health: extra.health ?? memoryHealth(() => 1_000), now: () => 1_000,
  ...(extra.jurisdiccionesDe ? { jurisdiccionesDe: extra.jurisdiccionesDe } : {}),
});
const peticion = (extra = {}) => ({ capability: CAP, input: { modo: 'desde_imagen' }, userId: 'u1', requestId: 'req-1', ...extra });
const lanzado = async (f) => { try { await f(); return null; } catch (e) { return e; } };
const motivoDe = async (r, extra = {}) => (await lanzado(() => r.execute(peticion(extra))))?.details?.reason;

/* ═══ A · CADA MOTIVO, CON EL ROUTER DE VERDAD ═════════════════════════════ */
console.log('\n── A · Cada motivo sale de la CAUSA de los descartes ──');
{
  const terra = proveedor('terra', [TERRITORIAL]);
  const r = router({ terra }, configuracion(['terra']));
  check('A1) aquí no y en otra jurisdicción sí (ES bloqueada, US aprobada) → «en_tu_region»', (await motivoDe(r, { jurisdicciones: ['ES'] })) === 'en_tu_region');
  check('A2) también si aquí está pendiente de revisión pero en otra ya se aprobó (JP) → «en_tu_region»', (await motivoDe(r, { jurisdicciones: ['JP'] })) === 'en_tu_region');
  check('A3) sin jurisdicción conocida, y en alguna sí estaría → «falta_tu_pais» (la que declara el Perfil Real)', (await motivoDe(r)) === 'falta_tu_pais');
  const conFuente = router({ terra }, configuracion(['terra']), { jurisdiccionesDe: async () => undefined });
  check('A4) lo mismo si la cuenta no declara país: la fuente de la cuenta no sabe → «falta_tu_pais»', (await motivoDe(conFuente)) === 'falta_tu_pais');
  check('A5) y en una jurisdicción aprobada no hay «no disponible»: se ejecuta', (await lanzado(() => r.execute(peticion({ jurisdicciones: ['US'] })))) === null && terra.llamadas === 1);
}
{
  const r = router({ terra: proveedor('terra', [NUNCA]) }, configuracion(['terra']));
  const motivos = await Promise.all([['ES'], ['US'], undefined].map((j) => motivoDe(r, j ? { jurisdicciones: j } : {})));
  check('A6) un modelo territorial que no es elegible en NINGUNA parte (como Hunyuan World hoy) → «no_disponible» en todas: ni «en tu región», ni «falta tu país», ni «más tarde»',
    motivos.every((m) => m === 'no_disponible'), motivos.join(','));
  const hunyuan = router({ fal: { ...falAdapter, isConfigured: () => true, run: async () => { throw new Error('no debía ejecutarse'); } } }, configuracion(['fal'], { providers: { fal: { enabled: true } } }));
  const deHoy = await Promise.all([['ES'], ['US'], ['JP'], undefined].map((j) => motivoDe(hunyuan, j ? { jurisdicciones: j } : {})));
  check('A7) el caso real de hoy, con el adaptador y los datos de verdad: world.generate → «no_disponible» desde cualquier jurisdicción', deHoy.every((m) => m === 'no_disponible'), deHoy.join(','));
}
{
  const terra = proveedor('terra', [TERRITORIAL]);
  const enPausa = memoryHealth(() => 1_000);
  for (let i = 0; i < 10; i++) enPausa.recordFailure?.('terra');
  const pausada = { isOpen: (p) => p === 'terra', recordFailure: () => {}, recordSuccess: () => {} };
  check('A8) una pausa por fallos recientes es PASAJERA → «ahora_no» (y aquí sí es verdad «más tarde»)',
    (await motivoDe(router({ terra }, configuracion(['terra']), { health: pausada }), { jurisdicciones: ['US'] })) === 'ahora_no');
  check('A9) la IA detenida por administración también es pasajera → «ahora_no»',
    (await motivoDe(router({ terra }, configuracion(['terra'], { settings: { iaDetenida: true } })), { jurisdicciones: ['US'] })) === 'ahora_no');
  check('A10) lo pasajero GANA: si un eslabón está en pausa y otro bloqueado aquí, «más tarde» es lo que es verdad',
    (await motivoDe(router({ terra, otro: proveedor('otro', [modelo('o')]) }, configuracion(['terra', 'otro']), { health: { isOpen: (p) => p === 'otro', recordFailure: () => {}, recordSuccess: () => {} } }), { jurisdicciones: ['ES'] })) === 'ahora_no');
}
{
  const libre = modelo('libre');
  const sinClave = router({ terra: proveedor('terra', [libre], { configured: false }) }, configuracion(['terra']));
  const apagado = router({ terra: proveedor('terra', [libre]) }, configuracion(['terra'], { providers: { terra: { enabled: false } } }));
  const desactivado = router({ terra: proveedor('terra', [modelo('apagado', { gobierno: gobierno({ active: 'DISABLED' }) })]) }, configuracion(['terra']));
  const enRevision = router({ terra: proveedor('terra', [modelo('revision', { gobierno: gobierno({ reviewStatus: 'REVIEW_REQUIRED' }) })]) }, configuracion(['terra']));
  const prohibido = router({ terra: proveedor('terra', [modelo('prohibido', { gobierno: gobierno({ reviewStatus: 'BLOCKED_GLOBAL' }) })]) }, configuracion(['terra']));
  const motivos = await Promise.all([sinClave, apagado, desactivado, enRevision, prohibido].map((r) => motivoDe(r, { jurisdicciones: ['US'] })));
  check('A11) sin clave, apagado por administración, aprobado sin activar, en revisión legal o bloqueado por su licencia → «no_disponible»: esperar no lo arregla',
    motivos.every((m) => m === 'no_disponible'), motivos.join(','));
}
{
  const libre = modelo('libre');
  const r = router({ terra: proveedor('terra', [libre]) }, configuracion([{ provider: 'terra', minQuality: 'max' }]));
  const familia = router({ terra: proveedor('terra', [libre]) }, configuracion(['terra']));
  const motivos = [
    await motivoDe(r, { prefs: { quality: 'standard' } }),
    await motivoDe(familia, { prefs: { allowedProviders: ['otra-familia'] } }),
    await motivoDe(familia, { prefs: { maxCredits: 0 } }),
    await motivoDe(familia, { prefs: { modelId: 'no-existe' } }),
  ];
  check('A12) lo que pidió la operación —calidad reservada, otra familia, un tope de Credits, un modelo fijado— → «con_estas_opciones»',
    motivos.every((m) => m === 'con_estas_opciones'), motivos.join(','));
}
check('A13) y la regla es pura y ordenada: pasajera > falta tu país > en tu región > opciones > no disponible', (() => {
  const m = E.motivoDeNoDisponible;
  return m([]) === 'no_disponible'
    && m([{ causa: 'configuracion' }, { causa: 'pasajera' }]) === 'ahora_no'
    && m([{ causa: 'elegibilidad', estado: 'BLOCKED_FOR_JURISDICTION', enOtraJurisdiccion: true }, { causa: 'peticion' }]) === 'en_tu_region'
    && m([{ causa: 'elegibilidad', estado: 'JURISDICTION_UNKNOWN', enOtraJurisdiccion: true }, { causa: 'elegibilidad', estado: 'BLOCKED_FOR_JURISDICTION', enOtraJurisdiccion: true }]) === 'falta_tu_pais'
    && m([{ causa: 'elegibilidad', estado: 'BLOCKED_FOR_JURISDICTION', enOtraJurisdiccion: false }]) === 'no_disponible'
    && m([{ causa: 'elegibilidad', estado: 'REVIEW_REQUIRED' }]) === 'no_disponible'
    && m([{ causa: 'peticion' }, { causa: 'configuracion' }]) === 'con_estas_opciones';
})());
check('A14) «en otra jurisdicción sí» se pregunta a la MISMA regla común (`elegibleEnAlgunaJurisdiccion`), sin listas de países propias',
  EL.elegibleEnAlgunaJurisdiccion(TERRITORIAL) === true && EL.elegibleEnAlgunaJurisdiccion(NUNCA) === false
  && EL.elegibleEnAlgunaJurisdiccion(modelo('libre')) === true
  && EL.elegibleEnAlgunaJurisdiccion({ ...TERRITORIAL, territorio: { ...TERRITORIAL.territorio, aprobadas: [], resto: 'APPROVED' } }) === true
  && EL.elegibleEnAlgunaJurisdiccion({ ...TERRITORIAL, territorio: { ...TERRITORIAL.territorio, aprobadas: ['EU'] } }, { enabled: false }) === false);

/* ═══ B · LO QUE SALE HACIA LA APP ═════════════════════════════════════════ */
console.log('\n── B · Hacia la app, el código y el motivo: nada de dentro ──');
{
  const haciaLaApp = (e) => E.toEngineHttpsError(e);
  const salidas = E.MOTIVOS_DE_NO_DISPONIBLE.map((m) => haciaLaApp(E.noDisponible(m)));
  check('B1) cada NOT_AVAILABLE sale con `failed-precondition`, su frase y SOLO { code, reason }',
    salidas.every((h, i) => h.code === 'failed-precondition' && iguales(h.details, { code: 'NOT_AVAILABLE', reason: E.MOTIVOS_DE_NO_DISPONIBLE[i] })
      && h.message === E.MENSAJE_DE_NO_DISPONIBLE[E.MOTIVOS_DE_NO_DISPONIBLE[i]]));
  const frases = Object.values(E.MENSAJE_DE_NO_DISPONIBLE);
  check('B2) y «más tarde» solo lo dice el motivo pasajero', frases.filter((f) => /intentarlo|más tarde/i.test(f)).length === 1 && /intentarlo/.test(E.MENSAJE_DE_NO_DISPONIBLE.ahora_no));
  const conDentro = new E.EngineError('PROVIDER_ERROR', undefined, { provider: 'fal', model: 'fal-ai/x', capability: 'world.generate', elegibilidad: ['BLOCKED_FOR_JURISDICTION'], jurisdicciones: ['ES'], retryable: true });
  const h = haciaLaApp(conDentro);
  check('B3) en NINGÚN error controlado viajan el proveedor, el modelo, la capacidad, los escalones ni la jurisdicción; lo demás sí',
    iguales(h.details, { code: 'PROVIDER_ERROR', retryable: true }), JSON.stringify(h.details));
  const deProveedor = haciaLaApp(new ProviderError('fal: saturado', 'fal', 503));
  check('B4) tampoco cuando el fallo lo clasifica el motor desde un error de un adaptador', !/fal/.test(JSON.stringify(deProveedor.details)) && deProveedor.details.code === 'PROVIDER_ERROR');
  check('B5) la frase de antes («no hay una IA disponible… Inténtalo más tarde») ya no sale del Router',
    !/no hay una IA disponible/.test(leer('functions/src/engine/router.ts')) && /throw noDisponible\(motivoDeNoDisponible\(decision\.skipped\)\)/.test(leer('functions/src/engine/router.ts')));
}

/* ═══ C · LA APP ═══════════════════════════════════════════════════════════ */
console.log('\n── C · La app: cada motivo, su clave, en los dieciséis idiomas ──');
{
  const cargar = crearCargador({
    dobles: {
      'firebase/functions': { httpsCallable: () => { throw new Error('no'); } },
      'firebase/firestore': new Proxy({}, { get: () => () => { throw new Error('no'); } }),
      '../config/firebase': { db: {}, functions: {}, storage: {} },
    },
  });
  const ND = cargar('utils/noDisponible.ts');
  const CREATOR = cargar('services/creatorService.ts');
  const M = cargar('utils/crearMundo3D.ts');
  check('C1) la app entiende EXACTAMENTE los motivos que manda el motor', iguales(Object.keys(ND.CLAVE_DE_NO_DISPONIBLE).sort(), [...E.MOTIVOS_DE_NO_DISPONIBLE].sort()));
  const DICCIONARIOS = cargar('i18n/diccionarios.ts').DICCIONARIOS;
  const unicos = []; for (const [codigo, d] of Object.entries(DICCIONARIOS)) if (!unicos.some(([, otro]) => otro === d)) unicos.push([codigo, d]);
  const valor = (d, clave) => clave.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), d);
  const claves = Object.values(ND.CLAVE_DE_NO_DISPONIBLE);
  const faltan = unicos.flatMap(([codigo, d]) => claves.filter((k) => typeof valor(d, k) !== 'string' || !valor(d, k).trim()).map((k) => `${codigo}:${k}`));
  check(`C2) cada motivo tiene su clave, con texto en los ${unicos.length} diccionarios`, unicos.length === 16 && faltan.length === 0, faltan.join(' '));
  const PROVEEDORES = /\b(fal|hunyuan|tencent|seedance|gemini|flux|seedream|elevenlabs)\b/i;
  const textos = unicos.flatMap(([, d]) => claves.map((k) => valor(d, k)));
  check('C3) ninguno de esos textos nombra un proveedor ni un modelo; y solo «ahora no» invita a volver a intentarlo (en español)',
    textos.every((t) => !PROVEEDORES.test(t)) && claves.filter((k) => /intentarlo|más tarde/.test(valor(DICCIONARIOS.es, k))).join() === 'weeai.errNotAvailableNow');
  const enEs = cargar('i18n/textos/es/servidor/motor.ts').motor;
  check('C4) las frases del servidor están en su catálogo (es), palabra por palabra, para reconocer lo que ya llegó escrito',
    Object.values(E.MENSAJE_DE_NO_DISPONIBLE).every((f) => Object.values(enEs).includes(f)));
  const { crearTraductor } = cargar('i18n/traducir.ts');
  const t = crearTraductor('es', DICCIONARIOS, {});
  const humanizar = (reason) => CREATOR.humanizeCreatorError({ code: 'functions/failed-precondition', message: 'Ahora mismo no hay una IA disponible para esto. Inténtalo más tarde.', details: { code: 'NOT_AVAILABLE', reason } }, t, 'es');
  check('C5) en todo Weë AI (`humanizeCreatorError`), «no disponible» se dice por su motivo, aunque la frase que llegue sea la vieja',
    humanizar('en_tu_region') === 'Esta función no está disponible actualmente en tu región.' && humanizar('falta_tu_pais') === 'Para usar esta función, indica tu país en tu Perfil Real.'
    && humanizar('raro') === 'Esta función no está disponible actualmente.' && !/más tarde/.test(humanizar('no_disponible')));
  const mundo = (reason) => M.errorDelMundo3D({ code: 'functions/failed-precondition', details: { code: 'NOT_AVAILABLE', reason } });
  check('C6) en «Crear mundo 3D», solo «ahora no» se reintenta; el resto es «no disponible» con su clave y sin reintento',
    mundo('ahora_no').reintentable === true && mundo('ahora_no').tipo === 'reintentable'
    && ['en_tu_region', 'falta_tu_pais', 'con_estas_opciones', 'no_disponible'].every((r) => mundo(r).tipo === 'no_disponible' && mundo(r).reintentable === false && mundo(r).clave === ND.CLAVE_DE_NO_DISPONIBLE[r]));
}
check('C7) esta suite está en la cadena de `npm test`', /no-disponible\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} de ${n} fallaron` : `\n✔ ${n}/${n}`);
process.exit(failures ? 1 : 0);
