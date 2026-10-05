/*
 * ELEGIBILIDAD POR JURISDICCIÓN — la regla común que decide QUÉ modelo se puede usar y DÓNDE
 * (`functions/src/engine/elegibilidad.ts`, ajuste arquitectónico del dueño del 2026-10-05).
 *
 * Capacidad → política de jurisdicción/elegibilidad → registro de modelos y de proveedores → restricciones → Router →
 * adaptador → proveedor. Una sola regla para todas las capacidades y experiencias, aplicada por las tres piezas que
 * eligen modelo (router vivo, gateway del Core, puente del registro). Se prueba que:
 *   · cada escalón (BLOCKED_GLOBAL, BLOCKED_FOR_JURISDICTION, JURISDICTION_UNKNOWN, REVIEW_REQUIRED, APPROVED, ACTIVE)
 *     hace lo que dice, y que sin datos suficientes falla cerrado;
 *   · el Router solo compara modelos elegibles —ninguna política, calidad, coste ni modelo fijado los amplía— y sin
 *     ninguno contesta NOT_AVAILABLE explícito, sin demo ni sustituto;
 *   · ni fal.ai ni la configuración pueden cambiar la decisión territorial;
 *   · Hunyuan World queda bloqueado en la UE, el Reino Unido y Corea del Sur y en revisión en el resto: no global.
 * Determinista, sin red ni proveedor real. $0.
 *
 *   node functions/test/elegibilidad-jurisdiccion.test.mjs     (usa el compilado: `npm run build` antes)
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
const { createRouter, memoryHealth, pickModel } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { ADAPTERS, DEFAULT_PROVIDERS, DEFAULT_SETTINGS } = lib('engine/registry.js');
const { falAdapter } = lib('engine/providers/fal.js');
const { HUNYUAN_WORLD_IMAGEN_A_MUNDO: HW, MODELOS_FAL } = lib('engine/providers/fal-modelos.js');
const { datosDelRegistro } = lib('registry/index.js');
const { derechosValidos } = lib('core/content/asset.js');

let failures = 0; let n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log(`✔ ${name}`); else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); } };
const J = (...jurisdicciones) => ({ jurisdicciones });
const CAP = 'world.generate';

/* ── Modelos sintéticos: la regla es común, no de un proveedor ───────────── */
const gobierno = (extra = {}) => ({
  providerModelId: 'x/y', version: '1', reviewStatus: 'APPROVED', active: 'ACTIVE',
  commercialUseStatus: 'ALLOWED', licenseStatus: 'CLEAR', outputRightsStatus: 'CLEAR', attributionRequired: false,
  licencias: [{ nombre: 'Licencia de prueba', url: 'https://ejemplo.test/licencia', notas: [] }],
  pricingMode: 'per_generation', providerPricing: null, inputSchema: [], outputSchema: [], fuentes: [], lastVerifiedAt: '2026-10-05', motivo: 'prueba',
  ...extra,
});
const modelo = (id, provider, extra = {}) => ({ id, provider, capabilities: [CAP], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.3 }, ...extra });
/** Aprobado y activo, bloqueado en la UE, el Reino Unido y Corea del Sur, aprobado en EE. UU. y México, en revisión en el resto. */
const TERRITORIAL = modelo('territorial', 'terra', {
  gobierno: gobierno(),
  territorio: { bloqueadas: ['EU', 'GB', 'KR'], aprobadas: ['US', 'MX'], resto: 'REVIEW_REQUIRED', fuente: 'prueba' },
});

/* ── A · Los diez casos que pidió el dueño ──────────────────────────────── */
console.log('── A · Los diez casos del ajuste de jurisdicción ──');

const enUS = E.modeloElegible(TERRITORIAL, undefined, J('US'));
check('1) capacidad + jurisdicción permitida → el modelo es elegible (ACTIVE)', enUS.elegible === true && enUS.estado === 'ACTIVE', JSON.stringify(enUS));

const bloqueos = ['ES', 'FR', 'DE', 'IE', 'GR', 'GB', 'KR'].map((j) => E.modeloElegible(TERRITORIAL, undefined, J(j)));
check('2) capacidad + jurisdicción bloqueada → el modelo queda excluido (ES, FR, DE, IE, GR por la UE; GB; KR)',
  bloqueos.every((r, i) => !r.elegible && r.estado === 'BLOCKED_FOR_JURISDICTION' && r.jurisdiccion === ['ES', 'FR', 'DE', 'IE', 'GR', 'GB', 'KR'][i]), JSON.stringify(bloqueos));

const GLOBAL = modelo('global', 'terra', { gobierno: gobierno({ reviewStatus: 'BLOCKED_GLOBAL' }), territorio: { bloqueadas: [], aprobadas: ['US'], resto: 'APPROVED', fuente: 'prueba' } });
const intentosGlobal = [J('US'), J('JP'), J('ES'), undefined, J()].map((c) => E.modeloElegible(GLOBAL, { enabled: true, reviewStatus: 'APPROVED' }, c));
check('3) un modelo BLOCKED_GLOBAL nunca es elegible: en ninguna jurisdicción, ni aprobado en su territorio, ni con la configuración pidiendo APPROVED y activo',
  intentosGlobal.every((r) => !r.elegible && r.estado === 'BLOCKED_GLOBAL'), JSON.stringify(intentosGlobal));

const soloAhi = [J('ES'), J('US'), J('MX'), J('US', 'MX'), J('US', 'ES')].map((c) => E.modeloElegible(TERRITORIAL, undefined, c));
check('4) BLOCKED_FOR_JURISDICTION excluye solo en esa jurisdicción: fuera en ES, dentro en US y MX; y una operación que toca US y ES queda fuera',
  !soloAhi[0].elegible && soloAhi[1].elegible && soloAhi[2].elegible && soloAhi[3].elegible
  && !soloAhi[4].elegible && soloAhi[4].estado === 'BLOCKED_FOR_JURISDICTION' && soloAhi[4].jurisdiccion === 'ES', JSON.stringify(soloAhi));

const enRevisionGlobal = modelo('revision', 'terra', { gobierno: gobierno({ reviewStatus: 'REVIEW_REQUIRED' }) });
const revision = [
  E.modeloElegible(enRevisionGlobal, { enabled: true }, J('US')),
  E.modeloElegible(enRevisionGlobal, { enabled: true, reviewStatus: 'APPROVED' }, J('US')),
  E.modeloElegible(TERRITORIAL, undefined, J('JP')),
  E.modeloElegible(TERRITORIAL, undefined, J('BR')),
];
check('5) REVIEW_REQUIRED no es elegible: la revisión global pendiente (aunque la configuración diga APPROVED) y una jurisdicción sin verificar (JP, BR)',
  revision.every((r) => !r.elegible && r.estado === 'REVIEW_REQUIRED') && revision[2].jurisdiccion === 'JP', JSON.stringify(revision));

const apagado = modelo('apagado', 'terra', { gobierno: gobierno({ active: 'DISABLED' }), territorio: TERRITORIAL.territorio });
const aprobadosNoActivos = [E.modeloElegible(apagado, undefined, J('US')), E.modeloElegible(TERRITORIAL, { enabled: false }, J('US'))];
check('6) APPROVED pero no ACTIVE no es elegible: desactivado en el código, o apagado por la configuración',
  aprobadosNoActivos.every((r) => !r.elegible && r.estado === 'APPROVED'), JSON.stringify(aprobadosNoActivos));

/* El Router de verdad, con proveedores falsos con la interfaz de los reales. */
const ajustes = (extra = {}) => ({ ...DEFAULT_SETTINGS, allowMockFallback: true, ...extra });
const proveedor = (id, modelos, opts = {}) => ({
  id, name: id, modalities: ['3d'],
  models: modelos.map((m) => ({ ...m, provider: id })),
  isConfigured: () => opts.configured !== false,
  supports: (c) => modelos.some((m) => m.capabilities.includes(c)),
  llamadas: 0,
  async run(req) { this.llamadas++; return { output: { kind: 'world', url: `https://storage.test/${id}/${req.model.id}.bin` }, costUSD: 0.3, latencyMs: 1, model: req.model.id }; },
});
/* Un demo que diría que sí a todo: si el Router lo usara de sustituto, se vería. */
const demo = () => ({ id: 'mock', name: 'demo', modalities: ['3d'], models: [modelo('demo', 'mock', { quality: 1 })], isConfigured: () => true, supports: () => true, llamadas: 0, async run() { this.llamadas++; return { output: { kind: 'world', url: 'demo' }, costUSD: 0, latencyMs: 1 }; } });
const configuracion = (cadena, providers = {}, settings = {}) => ({
  providers: { mock: { enabled: true, priority: 99 }, ...Object.fromEntries(cadena.map((p, i) => [p, { enabled: true, priority: i + 1 }])), ...providers },
  routing: { [CAP]: { capability: CAP, chain: cadena.map((provider) => ({ provider })), policy: 'quality-first' } },
  settings: ajustes(settings),
  source: 'test',
});
const router = (adapters, cfg) => {
  const ledger = memoryLedger();
  return { r: createRouter({ adapters, loadConfig: async () => cfg, ledger, health: memoryHealth(() => 1_000), now: () => 1_000 }), ledger };
};
const peticion = (extra = {}) => ({ capability: CAP, input: { prompt: 'un faro en la costa' }, userId: 'u1', requestId: 'req-1', ...extra });
const lanzado = async (f) => { try { await f(); return null; } catch (e) { return e; } };

{
  const terra = proveedor('terra', [TERRITORIAL]);
  const mock = demo();
  const { r, ledger } = router({ terra, mock }, configuracion(['terra']));
  const decision = await r.route(peticion({ jurisdicciones: ['ES'] }));
  const err = await lanzado(() => r.execute(peticion({ jurisdicciones: ['ES'] })));
  const desconocida = await lanzado(() => r.execute(peticion()));
  const abiertas = Object.keys(ledger.records).length;
  check('7) sin ningún candidato elegible → falla cerrado: ni demo ni sustituto, NOT_AVAILABLE explícito («sin_modelo_elegible» y su escalón), sin llamar al proveedor ni abrir el libro',
    decision.candidates.length === 0 && decision.skipped.some((s) => s.provider === 'terra' && s.estado === 'BLOCKED_FOR_JURISDICTION')
    && err?.code === 'NOT_AVAILABLE' && err.details?.reason === 'sin_modelo_elegible' && err.details.elegibilidad.join() === 'BLOCKED_FOR_JURISDICTION'
    && desconocida?.code === 'NOT_AVAILABLE' && desconocida.details.elegibilidad.join() === 'JURISDICTION_UNKNOWN'
    && terra.llamadas === 0 && mock.llamadas === 0 && abiertas === 0,
    JSON.stringify({ c: decision.candidates, s: decision.skipped, e: err?.details, d: desconocida?.details, abiertas }));
}

{
  const estrellaTerritorial = { ...TERRITORIAL, id: 'estrella', quality: 5 };
  const alternativo = modelo('alternativo', 'otro', { quality: 3, gobierno: gobierno(), territorio: { bloqueadas: [], aprobadas: [], resto: 'APPROVED', fuente: 'prueba' } });
  const terra = proveedor('terra', [estrellaTerritorial]);
  const otro = proveedor('otro', [alternativo]);
  const { r } = router({ terra, otro, mock: demo() }, configuracion(['terra', 'otro']));
  const enES = await r.route(peticion({ jurisdicciones: ['ES'] }));
  const enUSd = await r.route(peticion({ jurisdicciones: ['US'] }));
  const hecho = await r.execute(peticion({ jurisdicciones: ['ES'] }));
  check('8) un proveedor alternativo aprobado se puede seleccionar: en ES sirve «otro»; en US, donde los dos valen, manda la calidad',
    enES.candidates.map((c) => c.provider).join() === 'otro' && enUSd.candidates[0]?.provider === 'terra'
    && hecho.model === 'alternativo' && terra.llamadas === 0 && otro.llamadas === 1,
    JSON.stringify({ es: enES.candidates.map((c) => c.provider), us: enUSd.candidates.map((c) => c.provider), modelo: hecho.model }));
}

{
  const prev = process.env.FAL_KEY;
  process.env.FAL_KEY = 'clave-de-prueba-no-real';
  let llamadas = 0;
  /* El adaptador REAL de fal (su id, sus modelos, su `supports`, su `isConfigured`); solo se observa `run`. */
  const espia = { ...falAdapter, run: async () => { llamadas++; throw new Error('el adaptador no debía llegar a ejecutarse'); } };
  const todoAbierto = {
    fal: {
      enabled: true, priority: 1,
      models: { [HW.id]: {
        enabled: true, reviewStatus: 'APPROVED',
        territorio: { bloqueadas: [], aprobadas: ['ES', 'US'], resto: 'APPROVED', fuente: 'intento' },
        gobierno: { ...HW.gobierno, reviewStatus: 'APPROVED', active: 'ACTIVE' },
      } },
    },
  };
  const { r } = router({ fal: espia, mock: demo() }, configuracion(['fal'], todoAbierto));
  const enES = await r.route(peticion({ jurisdicciones: ['ES'] }));
  const enUSd = await r.route(peticion({ jurisdicciones: ['US'] }));
  const fuente = sinComentarios(leer('functions/src/engine/providers/fal.ts'));
  const datos = sinComentarios(leer('functions/src/engine/providers/fal-modelos.ts'));
  check('9) fal.ai no puede cambiar la decisión territorial: con fal activo y la configuración intentando aprobarlo todo, Hunyuan World sigue fuera en ES (bloqueado) y en US (en revisión), sin llegar al adaptador',
    falAdapter.supports(CAP) && falAdapter.isConfigured()
    && enES.candidates.length === 0 && enES.skipped.some((s) => s.provider === 'fal' && s.estado === 'BLOCKED_FOR_JURISDICTION')
    && enUSd.candidates.length === 0 && enUSd.skipped.some((s) => s.provider === 'fal' && s.estado === 'REVIEW_REQUIRED') && llamadas === 0,
    JSON.stringify({ es: enES.skipped, us: enUSd.skipped, llamadas }));
  check('9b) y el adaptador de fal no contiene lógica territorial: no lee jurisdicciones ni territorio, no decide elegibilidad y sus modelos son solo datos',
    !/jurisdic|territorio|modeloElegible|elegibilidadDe|'EU'|'GB'|'KR'/.test(fuente) && !/=>|function\b/.test(datos), 'fal.ts / fal-modelos.ts');
  if (prev === undefined) delete process.env.FAL_KEY; else process.env.FAL_KEY = prev;
}

{
  const estrella = modelo('estrella', 'terra', { quality: 5, speed: 5, cost: { unit: 'call', usd: 0.01 }, gobierno: gobierno(), territorio: TERRITORIAL.territorio });
  const modesto = modelo('modesto', 'terra', { quality: 2, speed: 1, cost: { unit: 'call', usd: 0.9 } });
  const terra = proveedor('terra', [estrella, modesto]);
  const politicas = ['quality-first', 'balanced', 'cost-first'];
  const elegidos = [];
  for (const policy of politicas) {
    const cfg = configuracion(['terra']);
    cfg.routing[CAP].policy = policy;
    const { r } = router({ terra, mock: demo() }, cfg);
    for (const prefs of [{}, { preferCheaper: true }, { quality: 'max' }]) {
      const d = await r.route(peticion({ jurisdicciones: ['ES'], prefs }));
      elegidos.push(d.candidates.map((c) => c.model.id).join() || '∅');
    }
  }
  const fijadoCfg = configuracion(['terra']);
  fijadoCfg.routing[CAP].chain = [{ provider: 'terra', model: 'estrella' }];
  const fijadoEnCadena = await router({ terra, mock: demo() }, fijadoCfg).r.route(peticion({ jurisdicciones: ['ES'] }));
  const fijadoEnPrefs = await router({ terra, mock: demo() }, configuracion(['terra'])).r.route(peticion({ jurisdicciones: ['ES'], prefs: { modelId: 'estrella' } }));
  const directo = pickModel(terra, CAP, 'max', 'quality-first', undefined, 'estrella', J('ES'));
  check('10) el Router nunca se salta la política para usar un modelo «mejor»: con cualquier política, calidad o precio elige «modesto», y fijar «estrella» no la cuela',
    elegidos.every((x) => x === 'modesto') && fijadoEnCadena.candidates.length === 0 && fijadoEnPrefs.candidates.length === 0
    && fijadoEnPrefs.skipped.some((s) => s.estado === 'BLOCKED_FOR_JURISDICTION') && directo === null
    && pickModel(terra, CAP, 'max', 'quality-first', undefined, undefined, J('US')).id === 'estrella',
    JSON.stringify({ elegidos, cadena: fijadoEnCadena.skipped, prefs: fijadoEnPrefs.skipped }));
}

/* ── B · Falla cerrado y no cambia nada de lo de siempre ────────────────── */
console.log('── B · Falla cerrado, y lo de siempre sigue igual ──');

const raros = [undefined, J(), J('es'), J('ESP'), J(''), { jurisdicciones: [null] }, { jurisdicciones: 'ES' }, J('US', 'xx')];
const ante = raros.map((c) => E.modeloElegible(TERRITORIAL, undefined, c));
check('11) una jurisdicción ausente, vacía o mal escrita (minúsculas, tres letras, vacía, null, un texto suelto, una mala entre buenas) → JURISDICTION_UNKNOWN',
  ante.every((r) => !r.elegible && r.estado === 'JURISDICTION_UNKNOWN'), JSON.stringify(ante));

const deSiempre = Object.values(ADAPTERS).flatMap((a) => a.models).filter((m) => !m.territorio && !m.gobierno);
const igualQueAntes = deSiempre.every((m) => [undefined, J(), J('ES'), J('US'), J('zz')].every((c) => E.modeloElegible(m, undefined, c).elegible
  && !E.modeloElegible(m, { enabled: false }, c).elegible));
check('12) los modelos de siempre (sin gobierno ni territorio) no notan nada: elegibles con o sin jurisdicción, y apagables por la administración como antes',
  deSiempre.length > 20 && igualQueAntes, `${deSiempre.length} modelos`);

const conTerritorio = Object.values(ADAPTERS).flatMap((a) => a.models).filter((m) => m.territorio);
check('13) hoy solo un modelo de todo Weë tiene reglas territoriales —Hunyuan World— y todas sus reglas están bien escritas y con fuente',
  conTerritorio.map((m) => m.id).join() === HW.id
  && conTerritorio.every((m) => [...m.territorio.bloqueadas, ...m.territorio.aprobadas].every(E.reglaTerritorialValida) && m.territorio.fuente.length > 20),
  conTerritorio.map((m) => m.id).join());

const endurecer = [
  [E.revisionVigente(TERRITORIAL, { reviewStatus: 'REVIEW_REQUIRED' }), 'REVIEW_REQUIRED'],
  [E.revisionVigente(TERRITORIAL, { reviewStatus: 'BLOCKED_GLOBAL' }), 'BLOCKED_GLOBAL'],
  [E.revisionVigente(enRevisionGlobal, { reviewStatus: 'APPROVED' }), 'REVIEW_REQUIRED'],
  [E.revisionVigente(GLOBAL, { reviewStatus: 'APPROVED' }), 'BLOCKED_GLOBAL'],
  [E.revisionVigente(TERRITORIAL, { reviewStatus: 'BLOCKED' }), 'APPROVED'],
  [E.revisionVigente(modelo('raro', 'terra', { gobierno: gobierno({ reviewStatus: 'APROBADO' }) })), 'REVIEW_REQUIRED'],
];
const limpio = E.camposAjustables({ quality: 5, cost: { unit: 'call', usd: 1 }, id: 'otro', provider: 'otro', capabilities: ['text.generate'], gobierno: {}, territorio: {} });
check('14) la configuración solo ENDURECE: puede pedir revisión o bloquear, nunca aprobar ni levantar un bloqueo; y no puede tocar identidad, gobierno ni territorio',
  endurecer.every(([v, esperado]) => v === esperado) && Object.keys(limpio).sort().join() === 'cost,quality',
  JSON.stringify({ endurecer, limpio }));

const sinGobierno = modelo('suelto', 'fal');
check('15) un modelo de un agregador SIN gobierno declarado no es elegible (nadie revisó su licencia), aunque la configuración lo active',
  !E.modeloElegible(sinGobierno, { enabled: true }, J('US')).elegible && E.modeloElegible(sinGobierno, undefined, J('US')).estado === 'REVIEW_REQUIRED');

/* ── C · Hunyuan World: restricción territorial, no bloqueo global ───────── */
console.log('── C · Hunyuan World ──');

check('16) su representación legal: revisión global REVIEW_REQUIRED (no BLOCKED_GLOBAL), bloqueado en EU/GB/KR, ninguna jurisdicción aprobada, el resto en revisión y DISABLED',
  HW.gobierno.reviewStatus === 'REVIEW_REQUIRED' && HW.gobierno.active === 'DISABLED'
  && HW.territorio.bloqueadas.join() === 'EU,GB,KR' && HW.territorio.aprobadas.length === 0 && HW.territorio.resto === 'REVIEW_REQUIRED'
  && /Territory/.test(HW.territorio.fuente) && MODELOS_FAL.length === 1);

const MUESTRA = ['ES', 'FR', 'DE', 'IT', 'PT', 'NL', 'GB', 'KR', 'US', 'MX', 'BR', 'AR', 'CO', 'JP', 'CN', 'IN', 'CA', 'AU', 'NO', 'CH'];
/* Territorios con código propio (Gibraltar, Åland, Reunión, Jersey…): no caen en ningún grupo; legal decide. Hoy, fuera. */
const CON_CODIGO_PROPIO = ['GI', 'AX', 'RE', 'GP', 'JE', 'IM'];
const veredictos = Object.fromEntries(MUESTRA.map((j) => [j, E.modeloElegible(HW, undefined, J(j)).estado]));
const bloqueadosHW = MUESTRA.filter((j) => veredictos[j] === 'BLOCKED_FOR_JURISDICTION');
check('17) Hunyuan World no es elegible en NINGUNA jurisdicción hoy: BLOCKED_FOR_JURISDICTION en la UE, GB y KR; REVIEW_REQUIRED en el resto (también NO y CH); fuera en los territorios con código propio; sin jurisdicción, JURISDICTION_UNKNOWN',
  [...MUESTRA, ...CON_CODIGO_PROPIO].every((j) => !E.modeloElegible(HW, undefined, J(j)).elegible)
  && bloqueadosHW.join() === 'ES,FR,DE,IT,PT,NL,GB,KR'
  && MUESTRA.filter((j) => !bloqueadosHW.includes(j)).every((j) => veredictos[j] === 'REVIEW_REQUIRED')
  && E.modeloElegible(HW).estado === 'JURISDICTION_UNKNOWN', JSON.stringify(veredictos));

const UE = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'];
const grupo = E.GRUPOS_DE_JURISDICCIONES.EU;
check('18) la UE son exactamente sus 27 Estados miembros (sin el Reino Unido ni el EEE ni Suiza)',
  grupo.length === 27 && new Set(grupo).size === 27 && [...grupo].sort().join() === [...UE].sort().join()
  && !['GB', 'NO', 'IS', 'LI', 'CH'].some((j) => grupo.includes(j)) && Object.keys(E.GRUPOS_DE_JURISDICCIONES).join() === 'EU');

const derechos = E.derechosDelModelo(HW);
check('19) los derechos que viajan con el material llevan dónde NO se puede usar ni mostrar, y el validador del material los acepta (y rechaza listas mal formadas)',
  derechos.jurisdiccionesBloqueadas.join() === 'EU,GB,KR' && derechos.revision === 'REVIEW_REQUIRED' && derechosValidos(derechos)
  && !derechosValidos({ ...derechos, jurisdiccionesBloqueadas: ['es'] }) && !derechosValidos({ ...derechos, jurisdiccionesBloqueadas: 'EU' })
  && !derechosValidos({ ...derechos, jurisdiccionesBloqueadas: Array.from({ length: 65 }, () => 'US') })
  && !derechosValidos({ ...derechos, revision: 'BLOCKED' }) && E.derechosDelModelo(modelo('x', 'y')) === undefined);

const catalogo = datosDelRegistro(ADAPTERS, DEFAULT_PROVIDERS).models.find((m) => m.id === HW.id);
const abiertoTodo = { ...DEFAULT_PROVIDERS, fal: { enabled: true, priority: 1, models: { [HW.id]: { enabled: true, reviewStatus: 'APPROVED' } } } };
const catalogoAbierto = datosDelRegistro(ADAPTERS, abiertoTodo).models.find((m) => m.id === HW.id);
check('20) el Core no lo puede usar: en el catálogo (que no es de ninguna operación) queda PENDING, aun con fal y el modelo activados por la administración',
  catalogo?.status === 'PENDING' && catalogoAbierto?.status === 'PENDING', `${catalogo?.status} / ${catalogoAbierto?.status}`);

/* ── D · Dónde vive la regla ─────────────────────────────────────────────── */
console.log('── D · Una sola regla, en la capa común ──');

const archivosDe = (dir) => fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? archivosDe(`${dir}/${d.name}`) : d.name.endsWith('.ts') ? [`${dir}/${d.name}`] : []);
const quienLaNombra = archivosDe('functions/src').filter((f) => /\bjurisdicciones\b/.test(sinComentarios(leer(f)))).sort();
check('21) las jurisdicciones de la operación solo las nombran el contexto del motor, la regla común y el Router: ningún callable, experiencia ni adaptador las lee o las fija desde el cliente',
  quienLaNombra.join() === 'functions/src/engine/elegibilidad.ts,functions/src/engine/router.ts,functions/src/engine/types.ts', quienLaNombra.join());

const regla = sinComentarios(leer('functions/src/engine/elegibilidad.ts'));
check('22) la regla no deduce la jurisdicción de nada: ni del idioma, ni del locale, ni de la IP, ni del dispositivo, y no sabe de proveedores concretos',
  !/locale|idioma|language|navigator|headers|\bip\b|geo|device|dispositivo/i.test(regla) && !/\bfal\b|hunyuan|tencent|seedance|gemini/i.test(regla));

const decisiones = ['functions/src/engine/router.ts', 'functions/src/engine/gateway.ts', 'functions/src/registry/index.ts'].map((f) => sinComentarios(leer(f)));
check('23) las tres piezas que eligen modelo preguntan a la MISMA regla, y ninguna tiene su propia lista de países ni de grupos',
  decisiones.every((c) => /modeloElegible\(/.test(c) && !/GRUPOS_DE_JURISDICCIONES|'EU'|'GB'|'KR'|bloqueadas|aprobadas/.test(c)));

const detalles = await (async () => {
  const { r } = router({ fal: { ...falAdapter, isConfigured: () => true, run: async () => { throw new Error('no debía ejecutarse'); } }, mock: demo() }, configuracion(['fal'], { fal: { enabled: true, priority: 1 } }));
  return (await lanzado(() => r.execute(peticion({ jurisdicciones: ['ES'] }))))?.details;
})();
check('24) el «no disponible» no le enseña a la persona ni el proveedor ni el modelo: solo la capacidad y el escalón',
  detalles?.reason === 'sin_modelo_elegible' && !/fal|hunyuan/i.test(JSON.stringify(detalles)) && Object.keys(detalles).sort().join() === 'capability,elegibilidad,reason',
  JSON.stringify(detalles));

check('esta suite está en la cadena de `npm test`', /elegibilidad-jurisdiccion\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ elegibilidad por jurisdicción: ${n} comprobaciones ($0)`);
process.exit(failures ? 1 : 0);
