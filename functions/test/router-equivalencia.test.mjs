/**
 * GRAN MOTOR · PAQUETE A — EQUIVALENCIA DEL ROUTER DEL CORE FRENTE AL LEGACY.
 *
 * `runtime-paridad.test.mjs` mide una cosa muy concreta: la configuración de
 * laboratorio por defecto, sobre el registro FIJO (`registroDeWee()`). Esta suite
 * mide lo que falta para poder decir «equivalente» con datos:
 *
 *   1. LA COMPOSICIÓN REAL. El conductor no usa el registro fijo: construye
 *      `crearRegistro(datosDelRegistro(ADAPTERS, config.providers))` con la
 *      configuración viva (`runtime/index.ts`, `conductorDeWee`). Aquí se mide esa.
 *   2. UNA MATRIZ DE ESCENARIOS con las MISMAS entradas para los dos routers:
 *      proveedor apagado, modelo apagado, cortacircuito abierto, límite diario del
 *      proveedor, IA detenida, vídeo apagado, cadena invertida desde `aiRouting`,
 *      proveedor y modelo pedidos por nombre, proveedor excluido, calidad y
 *      duración pedidas, sin ninguna clave y con todas.
 *   3. LAS DIFERENCIAS QUE NO SE VEN EN ESA MATRIZ, FIJADAS COMO DECISIONES:
 *      la calidad que el router de hoy deduce del TEXTO, el presupuesto del paso,
 *      «el más barato», la duración pedida. Ninguna tiene hoy un consumidor
 *      real que dependa de ella (puertas del Core cerradas), así que no hay
 *      regresión de producción; pero migrar sin saberlo cambiaría el producto.
 *      Cada una queda con su prueba para que cambiarla sea una decisión, no un
 *      accidente.
 *
 * No ejecuta ningún adaptador, no abre libro, no toca Firestore ni red. Usa el
 * compilado (`functions/lib`), como `runtime-paridad`: se compara lo que se
 * despliega. Con `GM_TABLA=1` imprime las tablas en Markdown (las de
 * `docs/GRAN-MOTOR-A-ROUTER.md`).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const require = createRequire(import.meta.url);
const lib = (p) => require(path.resolve(RAIZ, 'functions/lib', p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const TABLA = process.env.GM_TABLA === '1';

/* Claves: las del laboratorio de runtime-paridad (Gemini, ModelArk, ElevenLabs, DeepSeek) y, aparte, TODAS o NINGUNA. */
const LAB = ['GEMINI_API_KEY', 'ARK_API_KEY', 'ELEVENLABS_API_KEY', 'DEEPSEEK_API_KEY'];
const MAS = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'BFL_API_KEY', 'MINIMAX_API_KEY'];
const poner = (claves) => {
  for (const k of [...LAB, ...MAS]) delete process.env[k];
  for (const k of claves) process.env[k] = 'clave-falsa-para-equivalencia';
};

const core = lib('core/index.js');
const { createRouter, memoryHealth } = lib('engine/router.js');
const { ADAPTERS, DEFAULT_PROVIDERS, DEFAULT_ROUTING, DEFAULT_SETTINGS: AJUSTES_DE_FABRICA } = lib('engine/registry.js');
const { crearRegistro } = lib('core/registry/index.js');
const { datosDelRegistro, registroDeWee } = lib('registry/index.js');
const { resolutorPorCadena } = lib('runtime/resolucion.js');
const { politicaPorReglas, leerReglas } = lib('runtime/politica.js');

/* El vídeo encendido, como en runtime-paridad: se mide el camino cuando SÍ se puede generar. */
const AJUSTES = { ...AJUSTES_DE_FABRICA, videoHabilitado: true };
const CAPACIDADES = Object.keys(DEFAULT_ROUTING);
const trace = { traceId: 'brain_equiv_0001', requestId: 'brain_equiv_0001', userId: 'user-0001', appId: 'wee' };
const libroNulo = new Proxy({}, { get: () => async () => 'gen_equiv' });
const id = (c) => `${c.provider}/${c.model.id}`;
const idRef = (r) => `${r.providerId}/${r.modelId}`;

/**
 * UN ESCENARIO = una configuración + unas preferencias + un estado de salud/uso.
 * Devuelve las dos decisiones por capacidad con las MISMAS entradas.
 */
const medir = async (sc = {}) => {
  poner(sc.claves ?? LAB);
  const providers = sc.providers ?? DEFAULT_PROVIDERS;
  const routing = sc.routingInvertido
    ? Object.fromEntries(Object.entries(DEFAULT_ROUTING).map(([k, v]) => [k, { ...v, chain: [...v.chain].reverse() }]))
    : DEFAULT_ROUTING;
  const config = { providers, routing, settings: sc.settings ?? AJUSTES, source: 'defaults' };
  const health = memoryHealth();
  for (const p of sc.pausar ?? []) for (let i = 0; i < 10; i++) health.failure(p, { circuitBreaker: { failures: 3, windowMs: 60_000, openMs: 60_000 } });
  const silencio = console.warn; console.warn = () => {};
  try {
    const vivo = createRouter({ adapters: ADAPTERS, loadConfig: async () => config, ledger: libroNulo, health, usageToday: async () => sc.uso });
    const registro = sc.registroFijo ? registroDeWee() : crearRegistro(datosDelRegistro(ADAPTERS, providers));
    const router = core.crearRouter({ registry: registro });
    /* La cadena, EXACTAMENTE como la compone `runtime/index.ts: cadenaVivaCon`: calidad, duración y preferencias; sin goal, sin presupuesto. */
    const cadena = {
      async cadena({ peticion, input, preferencias }) {
        const d = await vivo.route({
          capability: peticion.capability, input: { ...input }, userId: peticion.trace.userId,
          prefs: {
            ...(peticion.hints?.quality ? { quality: peticion.hints.quality } : {}),
            ...(peticion.hints?.durationSec !== undefined ? { durationSec: peticion.hints.durationSec } : {}),
            ...(preferencias?.allowedProviders ? { allowedProviders: [...preferencias.allowedProviders] } : {}),
            ...(preferencias?.excludeProviders ? { excludeProviders: [...preferencias.excludeProviders] } : {}),
            ...(preferencias?.modelId ? { modelId: preferencias.modelId } : {}),
          },
        });
        return d.candidates.map((c) => ({ providerId: c.provider, modelId: c.model.id, estimatedUsd: c.estimatedUsd, estimatedCredits: c.estimatedCredits }));
      },
    };
    const compat = resolutorPorCadena(router, cadena);
    const filas = [];
    for (const capability of CAPACIDADES) {
      const prefs = sc.prefs ?? {};
      const input = sc.input ?? {};
      const d = await vivo.route({ capability, input, ...(sc.goal ? { goal: sc.goal } : {}), userId: 'user-0001', prefs });
      const L = d.candidates.map(id);
      const peticion = { capability, trace, ...(sc.hints ? { hints: sc.hints } : {}), ...(sc.constraints ? { constraints: sc.constraints } : {}) };
      const preferencias = {
        ...(prefs.allowedProviders ? { allowedProviders: prefs.allowedProviders } : {}),
        ...(prefs.excludeProviders ? { excludeProviders: prefs.excludeProviders } : {}),
        ...(prefs.modelId ? { modelId: prefs.modelId } : {}),
      };
      const r = await compat.resolver({ peticion, input, preferencias });
      const C = r.ok ? [r.implementation, ...r.alternatives].map(idRef) : [];
      const puro = router.resolver({ contract: core.ROUTER_CONTRACT_VERSION, capability, trace, ...(sc.hints ? { hints: sc.hints } : {}), ...(sc.constraints ? { constraints: sc.constraints } : {}) });
      filas.push({ capability, d, L, r, C, puro, soloDemo: L.length > 0 && L.every((x) => x.startsWith('mock/')) });
    }
    return { filas, router, vivo };
  } finally { console.warn = silencio; }
};

/** Las capacidades en las que el motor de hoy cae al modo demo: el Core contesta «no hay con qué» (MISSING PROVIDER, documentado). */
const SIN_PROVEEDOR_REAL = ['audio.sfx', 'doc.render', 'image.try_on', 'music.generate', 'video.compose', 'video.montage', 'video.vertical'];

/**
 * LA INVARIANTE DE LA CAPA DE COMPATIBILIDAD, por escenario:
 *   a) nunca ensancha: todo lo que devuelve estaba en la cadena de hoy;
 *   b) si la cadena de hoy es de verdad (no demo), devuelve LA MISMA, en el mismo orden;
 *   c) si la cadena de hoy está vacía, no inventa a nadie.
 */
const invariante = (filas) => {
  const rotas = [];
  for (const f of filas) {
    if (f.C.some((x) => !f.L.includes(x))) rotas.push(`${f.capability}: ensancha`);
    else if (f.L.length === 0 && f.r.ok) rotas.push(`${f.capability}: inventa`);
    else if (f.L.length > 0 && !f.soloDemo && JSON.stringify(f.L) !== JSON.stringify(f.C)) rotas.push(`${f.capability}: L=${f.L.join(',')} C=${f.C.join(',') || f.r.reason}`);
    else if (f.soloDemo && f.r.ok) rotas.push(`${f.capability}: sirve el demo`);
  }
  return rotas;
};

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── A · La composición REAL (registro vivo) frente al registro fijo ──');
{
  const vivoR = await medir({});
  const fijoR = await medir({ registroFijo: true });
  const distintos = vivoR.filas.filter((f, i) => JSON.stringify(f.C) !== JSON.stringify(fijoR.filas[i].C)).map((f) => f.capability);
  check('A1) las 29 capacidades están en la medida', vivoR.filas.length === 29 && CAPACIDADES.includes('world.generate'), `${vivoR.filas.length}`);
  check('A2) con la configuración por defecto, el registro vivo y el fijo dan la MISMA decisión en las 29', distintos.length === 0, distintos.join(', ') || 'idénticas');
  const reales = vivoR.filas.filter((f) => !f.soloDemo && f.L.length > 0);
  check('A3) con la capa, las 21 con proveedor real eligen lo mismo que el motor de hoy, con el mismo orden de respaldo',
    reales.length === 21 && reales.every((f) => JSON.stringify(f.L) === JSON.stringify(f.C)), `${reales.length}`);
  check('A4) las siete sin proveedor real caen al demo en el motor de hoy y el Core contesta «no hay con qué»',
    JSON.stringify(vivoR.filas.filter((f) => f.soloDemo).map((f) => f.capability).sort()) === JSON.stringify([...SIN_PROVEEDOR_REAL].sort())
    && vivoR.filas.filter((f) => f.soloDemo).every((f) => !f.r.ok));
  const mundo = vivoR.filas.find((f) => f.capability === 'world.generate');
  check('A5) world.generate no tiene ni demo: cadena vacía, y la capa tampoco inventa a nadie', mundo.L.length === 0 && !mundo.r.ok, mundo.r.reason);
  check('A6) la estimación (USD y Credits) que viaja con la decisión es la que cotizó el motor de hoy, no una del Core',
    reales.every((f) => f.r.estimado?.usd === f.d.candidates[0].estimatedUsd && f.r.estimado?.credits === f.d.candidates[0].estimatedCredits));
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── B · Matriz de escenarios: mismas entradas, mismas decisiones ──');
const ESCENARIOS = {
  'por defecto': {},
  'proveedor apagado (gemini)': { providers: { ...DEFAULT_PROVIDERS, gemini: { ...DEFAULT_PROVIDERS.gemini, enabled: false } } },
  'dos modelos de gemini apagados': { providers: { ...DEFAULT_PROVIDERS, gemini: { ...DEFAULT_PROVIDERS.gemini, models: { 'gemini-3.1-flash-lite': { enabled: false }, 'gemini-3.1-flash-image': { enabled: false } } } } },
  'cortacircuito abierto (gemini)': { pausar: ['gemini'] },
  'límite diario de gemini alcanzado': { providers: { ...DEFAULT_PROVIDERS, gemini: { ...DEFAULT_PROVIDERS.gemini, limits: { maxCallsPerDay: 5 } } }, uso: { byProvider: { gemini: { calls: 99 } } } },
  'IA detenida': { settings: { ...AJUSTES, iaDetenida: true } },
  'vídeo apagado': { settings: { ...AJUSTES_DE_FABRICA, videoHabilitado: false } },
  'cadenas invertidas (aiRouting)': { routingInvertido: true },
  'proveedor excluido en la petición (gemini)': { prefs: { excludeProviders: ['gemini'] } },
  'solo un proveedor permitido (deepseek)': { prefs: { allowedProviders: ['deepseek'] } },
  'modelo pedido por nombre (gemini-3.1-flash-lite)': { prefs: { modelId: 'gemini-3.1-flash-lite' } },
  'calidad máxima pedida': { prefs: { quality: 'max' }, hints: { quality: 'max' } },
  'calidad estándar pedida': { prefs: { quality: 'standard' }, hints: { quality: 'standard' } },
  'duración pedida de 15 s': { prefs: { durationSec: 15 }, hints: { durationSec: 15 } },
  'ninguna clave configurada': { claves: [] },
  'todas las claves configuradas': { claves: [...LAB, ...MAS] },
};
const resumen = [];
for (const [nombre, sc] of Object.entries(ESCENARIOS)) {
  const { filas } = await medir(sc);
  const rotas = invariante(filas);
  const igualesReales = filas.filter((f) => f.L.length > 0 && !f.soloDemo).length;
  resumen.push({ nombre, rotas, igualesReales, sinCadena: filas.filter((f) => f.L.length === 0).length, soloDemo: filas.filter((f) => f.soloDemo).length });
  check(`B) ${nombre}: la capa no ensancha, no inventa y reproduce la cadena de hoy`, rotas.length === 0, rotas.slice(0, 3).join(' | ') || `${igualesReales} con cadena real`);
}
{
  const apagada = resumen.find((r) => r.nombre === 'IA detenida');
  check('B) con la IA detenida no queda cadena ni demo en NINGUNA capacidad, y el Core tampoco sirve nada', apagada.sinCadena === 29 && apagada.soloDemo === 0);
  const sinClaves = resumen.find((r) => r.nombre === 'ninguna clave configurada');
  check('B) sin ninguna clave, el motor de hoy sirve el demo y el Core no: apagar el demo es una decisión de producto, no un efecto lateral',
    sinClaves.soloDemo >= 21, `${sinClaves.soloDemo} capacidades solo demo`);
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── C · Lo que NO viaja por la cadena: diferencias fijadas como decisiones ──');
{
  const GOAL = 'un video cinematográfico profesional';
  const base = await medir({});
  /* C1 · La calidad que el router de hoy deduce del TEXTO de la persona. El Core nunca ve el texto (decisión documentada en router-parity D). */
  const conGoal = await medir({ goal: GOAL, input: { goal: GOAL } });
  const imagenHoy = conGoal.filas.find((f) => f.capability === 'image.generate');
  const imagenBase = base.filas.find((f) => f.capability === 'image.generate');
  check('C1) el texto «cinematográfico» sube la calidad en el motor de hoy: elige el modelo PRO para imagen',
    imagenHoy.L[0] !== imagenBase.L[0] && /pro-image/.test(imagenHoy.L[0]), `${imagenBase.L[0]} → ${imagenHoy.L[0]}`);
  check('C1) …y por el Core el mismo texto NO cambia nada: la cadena que ve la capa no lleva el goal (el Core no lee texto)',
    imagenHoy.C[0] === imagenBase.C[0], `${imagenHoy.C[0]}`);
  const afectadasPorTexto = conGoal.filas.filter((f, i) => JSON.stringify(f.L) !== JSON.stringify(conGoal.filas[i].C) && !f.soloDemo).map((f) => f.capability).sort();
  check('C1) alcance medido: solo las capacidades de IMAGEN dependen de ese texto (vídeo y texto no: video se fija por modelId y el texto no sube nada)',
    afectadasPorTexto.length > 0 && afectadasPorTexto.every((c) => c.startsWith('image.')), afectadasPorTexto.join(', '));
  check('C1) y la vía correcta existe: `hints.quality` sí viaja, y con ella los dos routers vuelven a coincidir',
    invariante((await medir({ prefs: { quality: 'max' }, hints: { quality: 'max' } })).filas).length === 0);

  /* C2 · El presupuesto del paso. El Core lo transporta, no lo aplica. */
  const tope = { budget: { maxCredits: 1 } };
  const conTope = await medir({ constraints: tope });
  const hoyConTope = await medir({ prefs: { maxCredits: 1 } });
  const cabeza = conTope.filas.find((f) => f.capability === 'image.generate');
  check('C2) el motor de hoy SÍ aplica `prefs.maxCredits` (descarta lo que no cabe)',
    hoyConTope.filas.filter((f) => !f.soloDemo).every((f) => f.L.length === 0 || f.d.candidates.every((c) => c.estimatedCredits <= 1)) && hoyConTope.filas.some((f) => f.L.length === 0 && base.filas.find((b) => b.capability === f.capability).L.length > 0));
  check('C2) el Core NO lo aplica: con `constraints.budget.maxCredits = 1` la capa devuelve la misma cadena de siempre',
    cabeza.r.ok && JSON.stringify(cabeza.C) === JSON.stringify(base.filas.find((f) => f.capability === 'image.generate').C));
  check('C2) y lo dice: el Router del Core avisa `budget_not_checked` en vez de fingir que lo comprobó',
    cabeza.puro.warnings.includes('budget_not_checked'));
  check('C2) nadie en producción pone `prefs.maxCredits`, `preferCheaper` ni un presupuesto de workflow: la brecha es LATENTE',
    !/maxCredits|preferCheaper|budget/.test(leer('functions/src/creator/index.ts') + leer('functions/src/creator/brain.ts') + leer('functions/src/creator/video.ts') + leer('functions/src/engine/video.ts')));

  /* C3 · «El más barato». */
  const barato = await medir({ prefs: { preferCheaper: true } });
  const dist = barato.filas.filter((f) => !f.soloDemo && JSON.stringify(f.L) !== JSON.stringify(f.C)).map((f) => f.capability).sort();
  check('C3) `preferCheaper` reordena la cadena del motor de hoy y la capa no lo recibe: solo imagen cambia de orden',
    dist.length === 5 && dist.every((c) => c.startsWith('image.')), dist.join(', '));

  /* C4 · La duración pedida: el motor de hoy la ordena (flexible), el Core la exige (duro). */
  const larga = await medir({ prefs: { durationSec: 120 }, hints: { durationSec: 120 } });
  const video = larga.filas.filter((f) => f.capability.startsWith('video.') && ['video.generate', 'video.image_to_video', 'video.reference'].includes(f.capability));
  check('C4) pedir 120 s: el motor de hoy sigue sirviendo el modelo más largo (el adaptador recorta la duración)',
    video.length === 3 && video.every((f) => f.L.length === 1 && /seedance/.test(f.L[0])));
  check('C4) …y el Core rechaza (`duration_unsupported`): ningún modelo llega, «no hay con qué»',
    video.every((f) => !f.r.ok && f.puro.status === 'unavailable' && f.puro.candidates.some((c) => c.reason === 'duration_unsupported')));
  const seedance = leer('functions/src/engine/providers/seedance.ts');
  check('C4) la causa es una decisión de diseño de cada lado: el adaptador recorta a su máximo (`clampDuration`), el Core se niega a elegir lo que no llega',
    /export function clampDuration/.test(seedance) && /aguantaLaDuracion/.test(leer('functions/src/core/router.ts')));

  /* C5 · La salud. El cortacircuito vive en memoria del motor de hoy; el Core la lee del registro. */
  const pausa = await medir({ pausar: ['gemini'] });
  const textoPausa = pausa.filas.find((f) => f.capability === 'text.generate');
  check('C5) con gemini en pausa, el motor de hoy lo descarta; el Core PURO no se entera (su salud viene del registro, no de un contador)',
    !textoPausa.L.some((x) => x.startsWith('gemini/')) && textoPausa.puro.selected?.providerId !== undefined);
  check('C5) …pero la capa lo respeta porque la cadena ya viene filtrada: no ensancha',
    !textoPausa.C.some((x) => x.startsWith('gemini/')));
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── D · Quince frente a quince: el Core puro frente al motor de hoy (sin la capa) ──');
{
  const { filas } = await medir({});
  const iguales = filas.filter((f) => !f.soloDemo && f.L.length && f.puro.selected && idRef(f.puro.selected) === f.L[0]).map((f) => f.capability).sort();
  const distintas = filas.filter((f) => !f.soloDemo && f.L.length && f.puro.selected && idRef(f.puro.selected) !== f.L[0]).map((f) => f.capability).sort();
  check('D1) seis iguales', iguales.length === 6, iguales.join(', '));
  check('D2) quince distintas', distintas.length === 15, distintas.join(', '));
  /* Con la capa se cierran las quince: el Core ya daba por elegible lo que elige producción. */
  check('D3) las quince son POLICY DIFFERENCE: con la cadena de producto por delante desaparecen todas',
    filas.filter((f) => distintas.includes(f.capability)).every((f) => JSON.stringify(f.L) === JSON.stringify(f.C)));
  check('D4) en ninguna el Core descarta lo que el motor de hoy elige: es orden, no elegibilidad',
    filas.filter((f) => distintas.includes(f.capability)).every((f) => f.puro.candidates.find((c) => idRef(c) === f.L[0])?.eligible === true));
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n── E · Selección manual y automática: capacidades, permisos y restricciones ──');
{
  const unaCap = async (sc, capability, politicaReglas) => {
    const { filas, router } = await medir(sc);
    const f = filas.find((x) => x.capability === capability);
    if (!politicaReglas) return f;
    /* La misma cadena, pero con la política de reglas por delante (la composición de conductorDeWee). */
    const leidas = leerReglas(politicaReglas);
    const compat = resolutorPorCadena(router, { async cadena() { return f.d.candidates.map((c) => ({ providerId: c.provider, modelId: c.model.id })); } }, politicaPorReglas(leidas.reglas));
    return { ...f, r: await compat.resolver({ peticion: { capability, trace }, input: {} }) };
  };
  /* E1 · Un modelo pedido por nombre que NO sirve esa capacidad no se convierte en otro: no hay con qué. */
  const ajeno = await unaCap({ prefs: { modelId: 'seedream-5-0-lite-260128' } }, 'text.generate');
  check('E1) pedir un modelo que no atiende la capacidad NO se sustituye en silencio por otro: ni el motor de hoy ni la capa devuelven a nadie',
    ajeno.L.length === 0 && !ajeno.r.ok, ajeno.r.reason);
  /* E2 · El modelo pedido, apagado por administración. */
  const apagado = await unaCap({ prefs: { modelId: 'gemini-3.1-flash-lite' }, providers: { ...DEFAULT_PROVIDERS, gemini: { ...DEFAULT_PROVIDERS.gemini, models: { 'gemini-3.1-flash-lite': { enabled: false } } } } }, 'text.generate');
  check('E2) pedir un modelo que la administración apagó: sin candidatos, sin respaldo en otro modelo del proveedor', apagado.L.length === 0 && !apagado.r.ok);
  /* E3 · Excluir a todos los que sirven la capacidad. */
  const sinNadie = await unaCap({ prefs: { excludeProviders: ['gemini', 'deepseek'] } }, 'text.generate');
  check('E3) excluir a todos los proveedores reales de una capacidad deja la cadena vacía, y la capa tampoco sirve el demo', sinNadie.L.length === 0 && !sinNadie.r.ok);
  /* E4 · El modelo pedido existe y sirve: el motor de hoy lo fija y la capa lo respeta como primero. */
  const fijado = await unaCap({ prefs: { modelId: 'gemini-3.1-flash-lite' } }, 'text.generate');
  check('E4) un modelo pedido que sí sirve queda como primera opción en los dos', fijado.L[0] === 'gemini/gemini-3.1-flash-lite' && fijado.C[0] === fijado.L[0], fijado.C[0]);
  /* E5 · Un permiso explícito (regla de política) manda sobre la cadena: nunca se elige lo vetado, y se dice quién lo vetó. */
  const vetado = await unaCap({}, 'text.generate', [{ id: 'sin-gemini', source: 'prueba de equivalencia', effect: 'deny', providerId: 'gemini' }]);
  check('E5) una regla de política que veta a un proveedor lo saca de la elección aunque encabece la cadena',
    !vetado.r.ok ? vetado.r.reason === 'policy_denied' : vetado.r.implementation.providerId !== 'gemini' && !vetado.r.alternatives.some((a) => a.providerId === 'gemini'),
    vetado.r.ok ? idRef(vetado.r.implementation) : vetado.r.reason);
  const vetaTodos = await unaCap({}, 'text.generate', [{ id: 'sin-gemini', source: 'prueba', effect: 'deny', providerId: 'gemini' }, { id: 'sin-deepseek', source: 'prueba', effect: 'deny', providerId: 'deepseek' }]);
  check('E5) y si veta a todos los de la cadena, el motivo es la política y no «no hay proveedor»', !vetaTodos.r.ok && vetaTodos.r.reason === 'policy_denied', vetaTodos.r.reason);
  /* E6 · Las restricciones DURAS del Core (modalidad, región) siguen mandando con la capa puesta. */
  const { router } = await medir({});
  const mala = router.resolver({ contract: core.ROUTER_CONTRACT_VERSION, capability: 'text.generate', trace, constraints: { outputModality: 'video' } });
  check('E6) pedir una modalidad de salida que la capacidad no produce es INVALID, no una elección a ciegas', mala.status === 'invalid' && mala.error?.code === 'UNSUPPORTED_MODALITY', mala.error?.code);
  const forzada = router.resolver({ contract: core.ROUTER_CONTRACT_VERSION, capability: 'text.generate', trace, allowedProviders: ['gemini'] });
  check('E6) y forzar un proveedor por la puerta del Router se rechaza: elegir es del Router, no de quien pide', forzada.status === 'invalid' && forzada.error?.details?.reason === 'selection_not_allowed');
}

// ══════════════════════════════════════════════════════════════════════════
if (TABLA) {
  const { filas } = await medir({});
  const corto = (s) => String(s ?? '—').replace(/\|/g, '/');
  console.log('\n<<<TABLA1');
  console.log('| Capacidad | Motor de hoy: elegido → respaldo | Core puro: elegido → alternativas | Core + capa | USD est. | Descartes del Core | Clase |');
  console.log('|---|---|---|---|---|---|---|');
  for (const f of filas) {
    const hoy = f.L.length ? f.L.join(' → ') : '— (sin cadena)';
    const puro = f.puro.selected ? [f.puro.selected, ...f.puro.alternatives].map(idRef).join(' → ') : `— (${f.puro.status})`;
    const capa = f.r.ok ? f.C.join(' → ') : `— (${f.r.reason})`;
    const usd = f.d.candidates[0] ? f.d.candidates[0].estimatedUsd.toFixed(4) : '—';
    const desc = [...new Set(f.puro.candidates.filter((c) => !c.eligible).map((c) => c.reason))].join(', ') || 'ninguno';
    const clase = f.soloDemo ? 'MISSING PROVIDER' : f.L.length === 0 ? 'NOT ELIGIBLE' : (f.puro.selected && idRef(f.puro.selected) === f.L[0]) ? 'igual' : 'POLICY DIFFERENCE';
    console.log(`| \`${f.capability}\` | ${corto(hoy)} | ${corto(puro)} | ${corto(capa)} | ${usd} | ${desc} | ${clase} |`);
  }
  console.log('TABLA1>>>');
  console.log('\n<<<TABLA2');
  console.log('| Escenario | Con cadena real | Solo demo (motor de hoy) | Sin cadena | Divergencias de la capa |');
  console.log('|---|---|---|---|---|');
  for (const r of resumen) console.log(`| ${r.nombre} | ${r.igualesReales} | ${r.soloDemo} | ${r.sinCadena} | ${r.rotas.length} |`);
  console.log('TABLA2>>>');
}

check('esta suite está en la cadena de `npm test`', /router-equivalencia\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
