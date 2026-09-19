/*
 * WEE ROUTER — QUIÉN DICE «CON ESTO», SIN EJECUTAR NADA.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 *   ORCHESTRATOR coordina → ROUTER elige → GATEWAY ejecuta → ADAPTADOR traduce
 *
 * El Router recibe una capacidad y devuelve qué implementación debería
 * atenderla. Casi todo lo de aquí comprueba lo que NO debe hacer: ejecutar,
 * llamar a alguien, cobrar, guardar, reintentar, tirar dados, conocer
 * productos, o tener un catálogo propio.
 *
 * ── Lo que de verdad hay que proteger ──────────────────────────────────────
 *
 * Que la decisión sea DETERMINISTA y EXPLICABLE: la misma petición sobre el
 * mismo registro tiene que dar siempre lo mismo, sin que importe el orden en
 * que estuvieran los modelos, y con cada número de la puntuación con su
 * nombre. Y que el registro siga siendo la única fuente de verdad: aquí no
 * puede haber ni una lista de proveedores, ni un `if` por nombre.
 *
 * Ninguna comprobación llama a una API real ni gasta un céntimo.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (b) => (fs.existsSync(path.resolve(RAIZ, b + '.ts')) ? b + '.ts' : b + '/index.ts');
const nombresPedidos = (js, dep) => {
  const nombres = new Set();
  const escapado = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [, clausula] of js.matchAll(new RegExp(`import\\s+([^;]*?)\\s+from\\s*['"]${escapado}['"]`, 'g'))) {
    for (const [, dentro] of clausula.matchAll(/\{([^}]*)\}/g)) {
      for (const parte of dentro.split(',')) {
        const nombre = parte.trim().split(/\s+as\s+/)[0].trim();
        if (nombre) nombres.add(nombre);
      }
    }
  }
  return [...nombres];
};
const sustituto = (nombres) =>
  comoModulo(
    'const nada = new Proxy(function () {}, { get: () => nada, apply: () => nada, construct: () => nada });\n' +
      'export default nada;\n' + nombres.map((n) => `export const ${n} = nada;`).join('\n') + '\n',
  );
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  const js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  const RE = /(from\s*)(['"])([^'"]+)\2/g;
  const mapa = new Map();
  for (const [, , , dep] of js.matchAll(RE)) {
    if (mapa.has(dep)) continue;
    mapa.set(dep, dep.startsWith('.')
      ? (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, dep))))).url
      : sustituto(nombresPedidos(js, dep)));
  }
  const url = comoModulo(js.replace(RE, (_f, pre, q, dep) => `${pre}${q}${mapa.get(dep)}${q}`));
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const core = (await cargar('functions/src/core/index.ts')).ns;

const CORE_ROUTER = 'functions/src/core/router.ts';
const COMP_ROUTER = 'functions/src/router/index.ts';
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const codigoCore = sinComentarios(leer(CORE_ROUTER));
const codigoComp = sinComentarios(leer(COMP_ROUTER));

/* ── Piezas de prueba ─────────────────────────────────────────────────────── */

const trace = { traceId: 'brain_r_0001', requestId: 'brain_r_0001', userId: 'user-0001', appId: 'wee-chef', workplace: 'chef' };

const cap = (id, accepts, produces, status = 'ROUTABLE') => ({ id, contract: '1.0', category: id.split('.')[0], accepts, produces, status });
const prov = (id, extra = {}) => ({ id, name: id, type: 'matrix', status: 'READY', contract: '1.0', modalities: ['image', 'text'], capabilities: ['image.generate'], adapterId: `ad-${id}`, ...extra });
const mod = (id, providerId, quality, speed, rate, extra = {}) => ({
  id, providerId, capabilities: ['image.generate'], modalities: ['image'],
  grades: { quality, speed }, status: 'READY',
  ...(rate !== undefined ? { pricing: { unit: 'image', currency: 'USD', mediaRate: rate } } : {}),
  ...extra,
});
const ad = (providerId, extra = {}) => ({ id: `ad-${providerId}`, providerId, contract: '1.0', supportedCapabilities: ['image.generate'], status: 'ACTIVE', ...extra });

/** Tres matrices que cubren la misma capacidad con calidad, velocidad y coste distintos. */
const DATOS = {
  capabilities: [cap('image.generate', ['text'], 'image'), cap('video.generate', ['text'], 'video'), cap('text.generate', ['text'], 'text')],
  providers: [prov('alfa'), prov('beta'), prov('gamma')],
  models: [mod('alfa-1', 'alfa', 5, 2, 0.08), mod('beta-1', 'beta', 3, 5, 0.01), mod('gamma-1', 'gamma', 4, 3, 0.04)],
  adapters: [ad('alfa'), ad('beta'), ad('gamma')],
};
const registroCon = (datos = DATOS) => core.crearRegistro(datos);
const router = (policy, datos) => core.crearRouter({ registry: registroCon(datos), ...(policy ? { policy } : {}) });
const pet = (extra = {}) => ({ contract: '1.0', capability: 'image.generate', trace, ...extra });
const veredicto = (d, providerId) => d.candidates.find((c) => c.providerId === providerId);

console.log('\n── A · Pureza: el Router no sabe de nadie ──');
{
  const fuera = [];
  for (const [, dep] of codigoCore.matchAll(/from ['"]([^'"]+)['"]/g)) {
    const resuelto = dep.startsWith('.') ? path.posix.normalize(path.posix.join('functions/src/core', dep)) : dep;
    if (!resuelto.startsWith('functions/src/core/')) fuera.push(dep);
  }
  check('1) core/router.ts solo importa del Core', fuera.length === 0, fuera.join(' ') || 'puro');
  check('2) no toca Firebase, red, disco, reloj, azar ni entorno',
    !/firebase|firestore|node:fs|node:http|axios|fetch\(|require\(|process\.env|Date\.now\(|Math\.random\(|new Date\(/.test(codigoCore + codigoComp));
  const PROVEEDORES = ['gemini', 'seedance', 'seedream', 'deepseek', 'openai', 'anthropic', 'elevenlabs', 'minimax', 'flux', 'tripo', 'hunyuan', 'qwen', 'wan', 'yinchao', 'bytedance', 'byteplus', 'replicate', 'suno'];
  const nombra = (src) => PROVEEDORES.filter((p) => new RegExp(`(?<![a-z])${p}(?![a-z])`, 'i').test(src));
  check('3) ni el Router ni la composición nombran a un proveedor', nombra(codigoCore).length === 0 && nombra(codigoComp).length === 0, [...nombra(codigoCore), ...nombra(codigoComp)].join(',') || `${PROVEEDORES.length} comprobados`);
  check('3b) control: el patrón reconoce uno cuando lo ve', nombra('const x = seedance;').length === 1 && nombra('wanted').length === 0);
  check('4) ni un identificador de modelo', !/gpt-[0-9]|claude-[0-9]|gemini-[0-9]|SEEDANCE_|flux-|nano-banana/i.test(codigoCore + codigoComp));
  /* `music` es una MODALIDAD del Core, no el producto: se excluye la lista de modalidades, que es donde aparece legítimamente. */
  const sinModalidades = (codigoCore + codigoComp).replace(/MODALIDADES[^;]*;/g, ' ');
  check('5) ni un nombre de producto de Weë', !/studio|chef|design|travel|business|photo|writer|beauty|(?<![a-z])music(?![a-z'])/i.test(sinModalidades),
    JSON.stringify(sinModalidades.match(/studio|chef|design|travel|business|photo|writer|beauty|music/gi)));
  check('5b) control: el guardia vería un producto y no confunde la modalidad',
    /studio/i.test("if (appId === 'wee-studio')") && !/(?<![a-z])music(?![a-z'])/i.test("const MODALIDADES = ['music'];".replace(/MODALIDADES[^;]*;/g, ' ')));
  const estadoDeModulo = (src) => [
    ...(src.match(/^(let|var)\s+\w+/gm) || []),
    ...(src.match(/^const\s+\w+[^=\n]*=\s*(new (Map|Set|WeakMap|WeakSet)\(\s*\)|\{\s*\}|\[\s*\])/gm) || []),
  ];
  const conEstado = [...estadoDeModulo(codigoCore), ...estadoDeModulo(codigoComp)];
  check('6) sin estado de módulo: ni caché de decisiones, ni contador, ni registro propio', conEstado.length === 0, conEstado.join(' | ') || 'sin estado');
  check('7) sin bucles permanentes, temporizadores, sondeo ni reintentos', !/while \(true\)|setInterval|setTimeout|\bpoll|\bretry\b|reintent/i.test(codigoCore + codigoComp));
  check('8) sin código dinámico', !/\beval\(|new Function\(|\bimport\(/.test(codigoCore + codigoComp));
  check('9) platform-agnostic', !/from ['"]react|from ['"]expo|window\.|document\.|navigator\.|localStorage|Platform\.OS/.test(codigoCore + codigoComp));
  check('10) es síncrono: elegir no espera a nadie', !/async |await |Promise</.test(codigoCore));
}

console.log('\n── B · No se apropia de lo que es de otras capas ──');
{
  check('11) NO ejecuta: ni Gateway, ni adaptadores, ni HTTP',
    !/crearGateway|gateway\.ejecutar|GatewayRequest|adapter\.run|engine\.generate|gatewayDeWee|https?:\/\//i.test(codigoCore + codigoComp));
  check('12) NO cobra ni calcula precios propios',
    !/spendCredits|refundCredits|creditEngine|aiPricing|priceOperation|\bmargin\b|creditsPerUsd|wallet|\bbalance\b|\bledger\b|cobrar/i.test(codigoCore + codigoComp));
  check('13) NO es Job Engine: ni cola, ni persistencia, ni trabajos', !/enqueue|dequeue|\bqueue\b|firestore|collection\(|createJob|\bjob\b/i.test(codigoCore + codigoComp));
  check('14) NO es Orchestrator ni Workflow: no conoce pasos, ni estados, ni dependencias',
    !/StepDispatch|WorkflowRun|StepRun|dependsOn|transitar|listos\(|StepState/.test(codigoCore));
  check('15) NO es Brain ni Planner: no entiende ni planifica', !/BrainUnderstanding|Plan\b|planificar|entender/.test(codigoCore));
  check('16) sin catálogo propio: ni lista de proveedores, ni de modelos, ni de capacidades',
    !/CAPABILITY_CATALOG\s*[:=]\s*\[|PROVEEDORES\s*=\s*\[|MODELOS\s*=\s*\[|const .*providers\s*=\s*\[/.test(codigoCore));
  /* Lo que no puede haber es escribir EN el registro. Los `push` de arrays locales son otra cosa. */
  check('17) el registro entra como dependencia y NO se modifica',
    /registry: Registry/.test(leer(CORE_ROUTER))
    && !/registry\.[\w.]*\s*=[^=]|registry\.\w+\.(push|set|splice|sort|pop|shift)\(/.test(codigoCore)
    && !/listModels\(\)\.(push|sort|splice)|listProviders\(\)\.(push|sort|splice)/.test(codigoCore));
  check('17b) y lo que se ordena es una COPIA, nunca la lista del registro',
    /\[\.\.\.todos\][^;]*\.sort\(/.test(codigoCore) && !/\btodos\.sort\(/.test(codigoCore));
  check('17c) control: el guardia vería una escritura en el registro',
    /registry\.[\w.]*\s*=[^=]/.test('registry.models = [];') && !/registry\.[\w.]*\s*=[^=]/.test('const x = registry.getModel(id);'));
  check('18) reutiliza los contratos del Core en vez de declararlos otra vez',
    ['CoreCapabilityId', 'ImplementationRef', 'TraceContext', 'ExecutionHints', 'Budget', 'QualityRequirement', 'WeeError', 'Registry', 'CapabilityImplementation', 'ModelDescriptor', 'LanguageContext']
      .every((t) => new RegExp(`\\b${t}\\b`).test(leer(CORE_ROUTER))));
  check('19) y la ejecutabilidad se la pregunta al Gateway, no la vuelve a decidir',
    /puedeEjecutarse\(/.test(codigoCore) && !/provider\.status === 'DISABLED'|adapter\.status !== 'ACTIVE'/.test(codigoCore));
}

console.log('\n── C · Una decisión ──');
{
  const d = router().resolver(pet());
  check('20) enruta', d.status === 'routed', d.status + ' ' + JSON.stringify(d.error?.details));
  check('21) y devuelve el trío que le faltaba al despacho: proveedor, modelo y adaptador',
    !!d.selected.providerId && !!d.selected.modelId && !!d.selected.adapterId, JSON.stringify(d.selected));
  check('22) con la puntuación desglosada, no solo un total',
    ['capabilityFit', 'qualityFit', 'speedFit', 'costFit', 'availabilityFit', 'preferenceFit', 'reliabilityFit', 'total'].every((k) => typeof d.selectedScore[k] === 'number'), JSON.stringify(d.selectedScore));
  check('23) todos los números entre 0 y 1, sin NaN ni infinitos',
    Object.values(d.selectedScore).every((n) => Number.isFinite(n) && n >= 0 && n <= 1));
  check('24) con los demás candidatos y su veredicto', d.candidates.length === 3 && d.candidates[0].reason === 'selected' && d.candidates[1].reason === 'lower_score');
  check('25) y con alternativas, ordenadas por puntuación', d.alternatives.length === 2 && d.alternatives[0].providerId === d.candidates[1].providerId);
  check('26) la decisión lleva la política con la que se tomó: sin ella no se puede reproducir', d.policy.weights.quality === core.POLITICA_POR_DEFECTO.weights.quality);
  check('27) el hilo se conserva', d.trace.traceId === 'brain_r_0001' && d.trace.requestId === 'brain_r_0001');
  check('28) y todo sale congelado', [d, d.selected, d.selectedScore, d.candidates, d.alternatives, d.policy].every(Object.isFrozen));
}

console.log('\n── D · Determinismo, que es un requisito ──');
{
  const d = router().resolver(pet());
  check('29) la misma petición da SIEMPRE lo mismo', JSON.stringify(router().resolver(pet())) === JSON.stringify(d));
  check('30) y diez veces seguidas, también', Array.from({ length: 10 }, () => JSON.stringify(router().resolver(pet()))).every((x) => x === JSON.stringify(d)));
  /* El orden del registro no puede influir: eso sería una casualidad, no una decisión. */
  const alReves = { ...DATOS, providers: [...DATOS.providers].reverse(), models: [...DATOS.models].reverse(), adapters: [...DATOS.adapters].reverse() };
  const dRev = router(undefined, alReves).resolver(pet());
  check('31) el orden de los proveedores en el registro NO influye', JSON.stringify(dRev.selected) === JSON.stringify(d.selected));
  check('32) ni el de los modelos: los candidatos salen en el mismo orden', JSON.stringify(dRev.candidates) === JSON.stringify(d.candidates));
  const barajado = { ...DATOS, models: [DATOS.models[2], DATOS.models[0], DATOS.models[1]], providers: [DATOS.providers[1], DATOS.providers[2], DATOS.providers[0]] };
  check('33) ni cualquier otra permutación', JSON.stringify(router(undefined, barajado).resolver(pet()).candidates) === JSON.stringify(d.candidates));
  /* Empate exacto: el desempate es lexicográfico y estable. */
  const empate = { ...DATOS, providers: [prov('alfa'), prov('beta')], models: [mod('zz-1', 'alfa', 4, 3, 0.04), mod('aa-1', 'beta', 4, 3, 0.04)], adapters: [ad('alfa'), ad('beta')] };
  const dE = router(undefined, empate).resolver(pet());
  check('34) a igualdad EXACTA de puntuación, desempate lexicográfico por proveedor',
    dE.selected.providerId === 'alfa' && dE.candidates[0].score.total === dE.candidates[1].score.total, `${dE.selected.providerId}/${dE.selected.modelId} · ${dE.candidates.map((c) => c.score.total).join(' vs ')}`);
  check('35) y el mismo empate al revés da el mismo ganador',
    router(undefined, { ...empate, providers: [...empate.providers].reverse(), models: [...empate.models].reverse() }).resolver(pet()).selected.providerId === 'alfa');
  check('36) sin azar en ninguna parte', !/Math\.random|shuffle|aleatori/i.test(codigoCore + codigoComp));
}

console.log('\n── E · La política decide, y se puede cambiar en un sitio ──');
{
  const soloCoste = { weights: { quality: 0.05, speed: 0.05, cost: 0.8, availability: 0.05, preference: 0.025, reliability: 0.025 } };
  const soloCalidad = { weights: { quality: 0.8, speed: 0.05, cost: 0.05, availability: 0.05, preference: 0.025, reliability: 0.025 } };
  const soloVelocidad = { weights: { quality: 0.05, speed: 0.8, cost: 0.05, availability: 0.05, preference: 0.025, reliability: 0.025 } };
  check('37) con el coste mandando se elige el más barato', router(soloCoste).resolver(pet()).selected.providerId === 'beta');
  check('38) con la calidad mandando se elige el de más calidad', router(soloCalidad).resolver(pet()).selected.providerId === 'alfa');
  check('39) con la velocidad mandando, el más rápido', router(soloVelocidad).resolver(pet()).selected.providerId === 'beta');
  check('40) el descubrimiento de candidatos NO cambia con la política: cambia el orden, no quién entra',
    [soloCoste, soloCalidad, soloVelocidad].every((p) => router(p).resolver(pet()).candidates.length === 3));
  check('41) la política vive en UN sitio, con un valor por defecto seguro',
    /export const POLITICA_POR_DEFECTO/.test(leer(CORE_ROUTER)) && core.POLITICA_POR_DEFECTO.allowInternal === false && core.POLITICA_POR_DEFECTO.allowUnverified === true);
  check('42) y una política parcial se completa con la de por defecto',
    router({ weights: { cost: 0.9 } }).resolver(pet()).policy.weights.quality === core.POLITICA_POR_DEFECTO.weights.quality);
  check('43) los pesos no están repartidos por el código: solo se leen de la política',
    (codigoCore.match(/weights\./g) || []).length <= 8 && !/0\.35|0\.15|0\.2\b/.test(codigoCore.slice(codigoCore.indexOf('crearRouter'))));
}

console.log('\n── F · Estados: qué se puede elegir y qué no ──');
{
  const conEstados = {
    capabilities: DATOS.capabilities,
    providers: [prov('alfa'), prov('beta', { status: 'UNVERIFIED' }), prov('gamma', { status: 'PENDING' }), prov('delta', { status: 'DISABLED' }), prov('epsilon', { status: 'DEPRECATED' }), prov('demo', { type: 'internal' })],
    models: [mod('alfa-1', 'alfa', 3, 3, 0.05), mod('beta-1', 'beta', 5, 5, 0.01), mod('gamma-1', 'gamma', 5, 5, 0.001), mod('delta-1', 'delta', 5, 5, 0.001), mod('epsilon-1', 'epsilon', 5, 5, 0.001), mod('demo-1', 'demo', 5, 5, 0)],
    adapters: [ad('alfa'), ad('beta'), ad('gamma'), ad('delta'), ad('epsilon'), ad('demo')],
  };
  const d = router(undefined, conEstados).resolver(pet());
  check('44) PENDING no se elige nunca', !veredicto(d, 'gamma').eligible && veredicto(d, 'gamma').reason === 'not_usable');
  check('45) DISABLED tampoco', !veredicto(d, 'delta').eligible);
  check('46) ni lo retirado', !veredicto(d, 'epsilon').eligible);
  check('47) el modo demo queda fuera por defecto: un resultado de muestra en producción es peor que un error',
    !veredicto(d, 'demo').eligible && veredicto(d, 'demo').reason === 'internal_not_allowed');
  check('48) UNVERIFIED SÍ se puede elegir, porque hay rutas que lo usan hoy, y se avisa',
    veredicto(d, 'beta').eligible && d.selected.providerId === 'beta' && d.warnings.includes('unverified_selected'), d.warnings.join());
  const sinUnverified = router({ allowUnverified: false }, conEstados).resolver(pet());
  check('49) la política puede excluirlo, y eso NO lo convierte en DISABLED: se dice con su propio motivo',
    sinUnverified.selected.providerId === 'alfa' && veredicto(sinUnverified, 'beta').reason === 'status_not_allowed');
  const conDemo = router({ allowInternal: true, allowUnverified: false }, conEstados).resolver(pet());
  check('50) el demo solo entra si una política lo dice, y entonces se avisa',
    conDemo.selected.providerId === 'demo' && conDemo.warnings.includes('synthetic_selected'));
  const enPruebas = { ...conEstados, providers: [prov('alfa', { status: 'BETA' })], models: [mod('alfa-1', 'alfa', 3, 3, 0.05)], adapters: [ad('alfa')] };
  check('51) lo que está en pruebas se admite por defecto y se puede excluir',
    router(undefined, enPruebas).resolver(pet()).status === 'routed' && router({ allowBeta: false }, enPruebas).resolver(pet()).status === 'unavailable');
  const sinAdaptador = { ...DATOS, providers: [prov('alfa', { adapterId: undefined })], models: [mod('alfa-1', 'alfa', 5, 5, 0.01)], adapters: [] };
  check('52) sin adaptador que le hable, fuera', router(undefined, sinAdaptador).resolver(pet()).status === 'unavailable');
  const adaptadorSinCapacidad = { ...DATOS, providers: [prov('alfa')], models: [mod('alfa-1', 'alfa', 5, 5, 0.01)], adapters: [ad('alfa', { supportedCapabilities: ['text.generate'] })] };
  check('53) y si el adaptador no cubre esa capacidad, tampoco', router(undefined, adaptadorSinCapacidad).resolver(pet()).status === 'unavailable');
  const caido = { ...DATOS, providers: [prov('alfa', { health: { state: 'UNAVAILABLE', reason: 'caído' } }), prov('beta')], models: [mod('alfa-1', 'alfa', 5, 5, 0.001), mod('beta-1', 'beta', 2, 2, 0.5)], adapters: [ad('alfa'), ad('beta')] };
  check('54) un proveedor caído no se elige aunque sea el mejor', router(undefined, caido).resolver(pet()).selected.providerId === 'beta');
  const tocado = { ...caido, providers: [prov('alfa', { health: { state: 'DEGRADED' } }), prov('beta')] };
  check('55) uno tocado sí, pero puntúa peor', router(undefined, tocado).resolver(pet()).candidates.find((c) => c.providerId === 'alfa').score.availabilityFit < 0.5);
}

console.log('\n── G · Preferencias: nunca autoridad ──');
{
  const d = router().resolver(pet({ preference: { providerId: 'beta' } }));
  check('56) una preferencia compatible se atiende', d.selected.providerId === 'beta' && !d.warnings.includes('preference_unmet'));
  check('57) y se ve en la puntuación, no en una rama escondida', d.selectedScore.preferenceFit === 1 || d.selectedScore.preferenceFit === 0.5);
  const conEstados = {
    capabilities: DATOS.capabilities,
    providers: [prov('alfa'), prov('malo', { status: 'DISABLED' })],
    models: [mod('alfa-1', 'alfa', 3, 3, 0.05), mod('malo-1', 'malo', 5, 5, 0.001)],
    adapters: [ad('alfa'), ad('malo')],
  };
  const imposible = router(undefined, conEstados).resolver(pet({ preference: { providerId: 'malo' } }));
  check('58) una preferencia por algo NO elegible no lo elige: la preferencia no vence a una condición',
    imposible.selected.providerId === 'alfa' && imposible.warnings.includes('preference_unmet'), `${imposible.selected.providerId} ${imposible.warnings.join()}`);
  const inexistente = router().resolver(pet({ preference: { modelId: 'no-existe' } }));
  check('59) una preferencia por algo que no existe no rompe nada, y se dice', inexistente.status === 'routed' && inexistente.warnings.includes('preference_unmet'));
  check('60) una preferencia con forma inválida se rechaza, no se ignora en silencio',
    router().resolver(pet({ preference: { providerId: 'x'.repeat(200) } })).status === 'invalid' && router().resolver(pet({ preference: { adapterId: 'x' } })).status === 'invalid');
  const otraCapacidad = { ...DATOS, models: [mod('alfa-1', 'alfa', 3, 3, 0.05), { ...mod('beta-1', 'beta', 5, 5, 0.001), capabilities: ['text.generate'] }] };
  check('61) preferir un modelo que no cubre la capacidad no lo trae: ni siquiera es candidato',
    router(undefined, otraCapacidad).resolver(pet({ preference: { modelId: 'beta-1' } })).selected.modelId === 'alfa-1');
}

console.log('\n── H · Restricciones duras ──');
{
  check('62) una capacidad que no está en el catálogo se rechaza', router().resolver(pet({ capability: 'no.existe' })).error.details.reason === 'unknown_capability');
  check('63) una capacidad del catálogo que nadie implementa se dice sin inventar un proveedor',
    router().resolver(pet({ capability: 'video.generate' })).error.details.reason === 'capability_unimplemented');
  check('64) una modalidad de entrada que la capacidad no acepta se rechaza', router().resolver(pet({ constraints: { inputModality: 'video' } })).error.details.reason === 'input_modality');
  check('65) y una de salida que no produce, también', router().resolver(pet({ constraints: { outputModality: 'video' } })).error.details.reason === 'output_modality');
  check('66) una modalidad inventada se rechaza', router().resolver(pet({ constraints: { inputModality: 'holograma' } })).status === 'invalid');
  const alto = router().resolver(pet({ constraints: { quality: { minScore: 0.9 } } }));
  check('67) una calidad mínima filtra, y dice a quién dejó fuera',
    alto.selected.providerId === 'alfa' && alto.candidates.filter((c) => c.reason === 'below_minimum_quality').length === 2);
  check('68) y si nadie llega al mínimo, se dice en vez de bajar el listón', router().resolver(pet({ constraints: { quality: { minScore: 1 } } })).status === 'routed'
    && router({ minQuality: 1 }, { ...DATOS, models: DATOS.models.map((m) => ({ ...m, grades: { quality: 1, speed: 1 } })) }).resolver(pet({ constraints: { quality: { minScore: 0.9 } } })).status === 'unavailable');
  const conIdiomas = {
    ...DATOS,
    providers: [prov('alfa'), prov('beta', { languages: { only: ['en'], note: 'solo inglés' } })],
    models: [mod('alfa-1', 'alfa', 2, 2, 0.5), mod('beta-1', 'beta', 5, 5, 0.001)],
    adapters: [ad('alfa'), ad('beta')],
  };
  const enEspanol = router(undefined, conIdiomas).resolver(pet({ language: { appLanguage: 'es' } }));
  check('69) un proveedor que solo habla otro idioma queda fuera cuando el idioma importa',
    enEspanol.selected.providerId === 'alfa' && veredicto(enEspanol, 'beta').reason === 'language_unsupported');
  check('70) y entra cuando el idioma le sirve', router(undefined, conIdiomas).resolver(pet({ language: { appLanguage: 'en' } })).selected.providerId === 'beta');
  check('71) el idioma se compara por LENGUA, no por etiqueta: `pt` sirve para `pt-BR`',
    router(undefined, { ...conIdiomas, providers: [prov('alfa'), prov('beta', { languages: { only: ['pt'], note: 'x' } })] }).resolver(pet({ language: { appLanguage: 'pt-BR' } })).selected.providerId === 'beta');
  const conRegiones = { ...DATOS, providers: [prov('alfa'), prov('beta', { regions: ['us'] })], models: [mod('alfa-1', 'alfa', 2, 2, 0.5), mod('beta-1', 'beta', 5, 5, 0.001)], adapters: [ad('alfa'), ad('beta')] };
  check('72) una región que el proveedor no sirve lo deja fuera',
    router(undefined, conRegiones).resolver(pet({ constraints: { region: 'eu' } })).selected.providerId === 'alfa');
  check('73) y una que sí, lo deja entrar', router(undefined, conRegiones).resolver(pet({ constraints: { region: 'us' } })).selected.providerId === 'beta');
}

console.log('\n── I · Coste: se considera, no se calcula ──');
{
  const d = router().resolver(pet());
  check('74) el coste sale del registro, no de un precio escrito aquí',
    !/[0-9]+\.[0-9]{2,}/.test(codigoCore.replace(/0\.(35|15|2|1|05|5|4|6|3|7|8|25|02)\b/g, '')) && /model\.pricing/.test(codigoCore));
  check('75) lo más barato del conjunto puntúa mejor en coste', d.candidates.find((c) => c.providerId === 'beta').score.costFit > d.candidates.find((c) => c.providerId === 'alfa').score.costFit);
  const sinPrecio = { ...DATOS, models: DATOS.models.map((m) => ({ ...m, pricing: undefined })) };
  check('76) sin tarifas, el coste es neutro y no rompe nada', router(undefined, sinPrecio).resolver(pet()).candidates.every((c) => c.score.costFit === 0.5));
  const unidadesDistintas = { ...DATOS, models: [mod('alfa-1', 'alfa', 5, 2, 0.08), { ...mod('beta-1', 'beta', 3, 5), pricing: { unit: 'token', currency: 'USD', inputRate: 0.5 } }, mod('gamma-1', 'gamma', 4, 3, 0.04)] };
  const mezclado = router(undefined, unidadesDistintas).resolver(pet());
  check('77) tarifas de unidades distintas no se comparan: se avisa en vez de inventar una conversión',
    mezclado.warnings.includes('cost_not_comparable') && mezclado.status === 'routed', mezclado.warnings.join());
  check('78) un presupuesto sin con qué estimar se avisa, no se finge comprobado',
    router().resolver(pet({ constraints: { budget: { maxUsd: 0.001 } } })).warnings.includes('budget_not_checked'));
  check('79) un presupuesto negativo se rechaza', router().resolver(pet({ constraints: { budget: { maxUsd: -1 } } })).status === 'invalid');
  check('80) el Router NO cobra, no reserva y no toca ningún saldo',
    !/spendCredits|reservar|descontar|charge|creditsCharged/i.test(codigoCore + codigoComp));
  check('81) y la decisión lleva lo que Fase 9 necesitará para atribuir, sin mover dinero',
    !!d.selected.providerId && !!d.selected.modelId && !!d.trace.requestId && !!d.policy && d.selectedScore.costFit !== undefined);
}

console.log('\n── J · Multi-producto: un Router, muchos anfitriones ──');
{
  const base = router().resolver(pet());
  const APPS = ['wee', 'wee-studio', 'wee-chef', 'wee-design', 'wee-music', 'wee-travel', 'wee-business'];
  const decisiones = APPS.map((appId) => router().resolver(pet({ appId, workspaceId: appId })));
  check('82) la misma capacidad desde los siete productos da la MISMA implementación',
    decisiones.every((x) => JSON.stringify(x.selected) === JSON.stringify(base.selected)));
  check('83) y la misma puntuación, byte a byte: `appId` no pondera nada',
    new Set(decisiones.map((x) => JSON.stringify(x.candidates))).size === 1);
  check('84) `appId` no aparece en ninguna decisión: ni una rama, ni una comparación sobre su valor',
    !/appId\s*[=!]==|if\s*\([^)]*appId|switch\s*\(\s*\w*\.?appId/.test(codigoCore.slice(codigoCore.indexOf('crearRouter'))));
  check('85) ni `workspaceId`', !/workspaceId\s*[=!]==|if\s*\([^)]*workspaceId/.test(codigoCore.slice(codigoCore.indexOf('crearRouter'))));
  check('86) hay UN router, no uno por producto ni por Workplace',
    (leer(CORE_ROUTER).match(/export const crearRouter/g) || []).length === 1 && !/PorApp|porProducto|byApp|RouterDe[A-Z]/.test(codigoCore));
  check('87) una app independiente usa el mismo, con su propio contexto',
    router().resolver(pet({ appId: 'wee-studio', workspaceId: 'studio' })).status === 'routed');
}

console.log('\n── K · Seguridad ──');
{
  const proto = (json) => JSON.parse(json);
  check('88) `__proto__` en la petición no ensucia nada', router().resolver({ ...pet(), ...proto('{"__proto__":{"colado":1}}') }).status === 'invalid' && ({}).colado === undefined);
  check('89) `constructor` y `prototype` como claves, igual',
    router().resolver({ ...pet(), constructor: 'x' }).status === 'invalid' && router().resolver({ ...pet(), prototype: 'x' }).status === 'invalid');
  const INYECCION = ['implementation', 'implementationRef', 'adapterId', 'allowedProviders', 'excludeProviders'];
  check('90) ninguna selección disfrazada de campo entra: elegir es lo que hace esta capa, no lo que se le ordena',
    INYECCION.every((k) => router().resolver({ ...pet(), [k]: 'x' }).error.details.reason === 'selection_not_allowed'), INYECCION.join(','));
  check('91) y cualquier otra clave desconocida se rechaza', router().resolver({ ...pet(), loQueSea: 1 }).status === 'invalid');
  check('92) una petición que no es un objeto no revienta', ['hola', null, 42, []].every((r) => router().resolver(r).status === 'invalid'));
  const d = router().resolver(pet());
  check('93) la decisión no lleva secretos, ni nombres de variables de entorno, ni configuración cruda',
    !/apiKey|api_key|credential|secret|token|Env|officialApi|docsUrl/i.test(JSON.stringify(d)));
  check('94) ni los internals del adaptador: solo su identificador',
    !/supportedCapabilities|supportsPolling|verificationState|status/i.test(JSON.stringify(d.selected)) && Object.keys(d.selected).every((k) => ['providerId', 'modelId', 'adapterId'].includes(k)));
  check('95) el registro no se puede modificar a través de la decisión', (() => {
    try { d.candidates.push({ providerId: 'colado' }); } catch { /* congelado */ }
    return d.candidates.length === 3;
  })());
  check('96) un error del Router nunca lleva stack, ruta ni mensaje crudo',
    !/stack|message:|C:\//.test(JSON.stringify(router().resolver(pet({ capability: 'no.existe' })).error)));
  check('97) y un fallo interno se responde, no se propaga', (() => {
    const registroRoto = { ...registroCon(), getCapabilityImplementations: () => { throw new Error('C:/secreto'); } };
    const r = core.crearRouter({ registry: registroRoto }).resolver(pet());
    return r.status === 'invalid' && r.error.code === 'INTERNAL_ERROR' && !JSON.stringify(r).includes('secreto');
  })());
}

console.log('\n── L · Escala y límites ──');
{
  const grande = (n) => ({
    capabilities: DATOS.capabilities,
    providers: Array.from({ length: n }, (_, i) => prov(`p${String(i).padStart(5, '0')}`)),
    models: Array.from({ length: n }, (_, i) => mod(`m${String(i).padStart(5, '0')}`, `p${String(i).padStart(5, '0')}`, (i % 5) + 1, (i % 5) + 1, (i % 100) / 1000)),
    adapters: Array.from({ length: n }, (_, i) => ad(`p${String(i).padStart(5, '0')}`)),
  });
  for (const n of [10, 100, 1000]) {
    const t0 = performance.now();
    const d = router(undefined, grande(n)).resolver(pet());
    const ms = performance.now() - t0;
    check(`98.${n}) ${n} candidatos se resuelven en un tiempo razonable`, d.status === 'routed' && ms < 3000, `${Math.round(ms)} ms`);
  }
  const conTope = router({ maxCandidates: 5 }, grande(50)).resolver(pet());
  check('99) el número de candidatos está acotado por política, y se avisa al cortar',
    conTope.candidates.length === 5 && conTope.warnings.includes('candidates_capped'));
  check('100) el tope corta, no reordena: los cinco son los cinco primeros del orden canónico',
    conTope.candidates.map((c) => c.providerId).sort().join() === ['p00000', 'p00001', 'p00002', 'p00003', 'p00004'].join());
  check('101) las alternativas están acotadas: una lista sin fin no la lee nadie', router(undefined, grande(100)).resolver(pet()).alternatives.length <= 8);
  check('102) sin recursión: el Router es una función acotada', !/function \w+\([^)]*\)[^{]*\{[\s\S]{0,400}\1\(/.test(codigoCore));
}

console.log('\n── M · El puerto que la Fase 2 dejó abierto ──');
{
  check('103) `ImplementationResolver` sigue siendo el puerto, y ahora tiene implementación de verdad',
    /export interface ImplementationResolver/.test(leer('functions/src/core/gateway.ts')) && /ImplementationResolver/.test(leer(COMP_ROUTER)));
  check('104) la composición pregunta al registro real y no mantiene copia', /registroDeWee\(\)/.test(leer(COMP_ROUTER)) && !/const .*=\s*\[\s*$/m.test(codigoComp));
  check('105) el Router decide, el Gateway ejecuta: aquí no se llama a ejecutar', !/\.ejecutar\(/.test(codigoCore + codigoComp));
  check('106) el trío que devuelve es exactamente lo que `ImplementationRef` pide',
    ['providerId', 'modelId', 'adapterId'].every((k) => new RegExp(`\\b${k}\\b`).test(leer('functions/src/core/gateway.ts'))));
  check('107) y encaja en el hueco que dejó el despacho del Orchestrator',
    /implementation/.test(leer('functions/src/core/orchestrator.ts')) && !/implementation:/.test(sinComentarios(leer('functions/src/core/orchestrator.ts'))));
}

console.log('\n── N · Lo que no se ha roto ──');
{
  check('108) el registro de la Fase 1 sigue siendo la fuente de verdad, intacto',
    /export const crearRegistro/.test(leer('functions/src/core/registry/registry.ts')) && /findImplementations/.test(leer('functions/src/core/registry/registry.ts')));
  check('109) el Gateway no se tocó para esto', !/router|Router/i.test(sinComentarios(leer('functions/src/core/gateway.ts'))));
  check('110) ni el Orchestrator, ni el Workflow, ni el Planner, ni Brain',
    ['orchestrator', 'workflow', 'planner', 'brain'].every((f) => !/\brouter\b/i.test(sinComentarios(leer(`functions/src/core/${f}.ts`)))));
  check('111) la dependencia va en el sentido correcto: el Router importa del registro, no al revés',
    /from '\.\/registry'/.test(leer(CORE_ROUTER)) && !/from '\.\.\/router'/.test(leer('functions/src/core/registry/registry.ts')));
  check('112) el catálogo sigue teniendo las mismas capacidades', core.CAPABILITY_CATALOG.length === 68);
  check('113) el contrato del Router está declarado y es compatible consigo mismo',
    core.ROUTER_CONTRACT_VERSION === '1.0' && core.contratoCompatible('1.0', core.ROUTER_CONTRACT_VERSION));
  check('114) el `while` de Weë Creator sigue donde estaba: ninguna ruta de producción pasa por aquí todavía',
    /while \(done\.size < steps\.length\)/.test(leer('functions/src/creator/index.ts')) && !/crearRouter|resolverDeWee/.test(leer('functions/src/creator/index.ts')));
  check('115) y la carpeta legada del gateway sigue intacta', fs.existsSync(path.resolve(RAIZ, 'functions/src/gateway')));
  check('116) esta suite no llama a ninguna API real', !/https?:\/\/(?!ejemplo\.invalido)/.test(leer('functions/test/core-router.test.mjs')));
}

console.log('\n── O · Lo que entra por el registro entra sin tocar el Router ──');
{
  /* Una capacidad futura, con un proveedor futuro: si el registro la declara, el Router la enruta. */
  const futuro = {
    capabilities: [...DATOS.capabilities, cap('3d.generate', ['text', 'image'], 'image', 'DECLARED')],
    providers: [...DATOS.providers, prov('nueva-matriz', { capabilities: ['3d.generate'], adapterId: 'ad-nueva-matriz' })],
    models: [...DATOS.models, { ...mod('nm-1', 'nueva-matriz', 4, 3, 0.2), capabilities: ['3d.generate'] }],
    adapters: [...DATOS.adapters, ad('nueva-matriz', { supportedCapabilities: ['3d.generate'] })],
  };
  const d = router(undefined, futuro).resolver(pet({ capability: '3d.generate' }));
  check('117) una capacidad NUEVA con un proveedor NUEVO se enruta sin tocar una línea del Router',
    d.status === 'routed' && d.selected.providerId === 'nueva-matriz', `${d.status} ${JSON.stringify(d.error?.details)}`);
  check('118) y las que ya había siguen igual', router(undefined, futuro).resolver(pet()).selected.providerId === router().resolver(pet()).selected.providerId);
  /* Dos proveedores para la misma capacidad: el Router elige entre ellos. */
  check('119) una capacidad servida por varios proveedores se decide entre todos', router().resolver(pet()).candidates.filter((c) => c.eligible).length === 3);
  /* Modalidades: lo que el catálogo declara es lo que manda. */
  const multimodal = {
    capabilities: [cap('video.image_to_video', ['image', 'text'], 'video')],
    providers: [prov('vid', { capabilities: ['video.image_to_video'] })],
    models: [{ ...mod('vid-1', 'vid', 4, 3, 0.5), capabilities: ['video.image_to_video'], modalities: ['video'] }],
    adapters: [ad('vid', { supportedCapabilities: ['video.image_to_video'] })],
  };
  const mm = router(undefined, multimodal).resolver({ contract: '1.0', capability: 'video.image_to_video', trace, constraints: { inputModality: 'image', outputModality: 'video' } });
  check('120) una capacidad multimodal se enruta con su entrada y su salida', mm.status === 'routed', `${mm.status} ${JSON.stringify(mm.error?.details)}`);
  check('121) y una entrada que esa capacidad no acepta se rechaza',
    router(undefined, multimodal).resolver({ contract: '1.0', capability: 'video.image_to_video', trace, constraints: { inputModality: 'music' } }).error.details.reason === 'input_modality');
}

/*
 * ── P · Nada declarado que no ocurra ────────────────────────────────────────
 *
 * Es el mismo defecto que apareció en la Fase 4 con `failed`, en la Fase 5 con
 * `step_cancelled` y en la Fase 6 con el estado ausente: un valor que existe
 * en el contrato y no se produce nunca es una promesa que alguien programará
 * y jamás verá cumplirse. Aquí se comprueba EJECUTANDO cada uno.
 */
console.log('\n── P · Nada declarado que no ocurra ──');
{
  const estados = new Set(); const motivos = new Set(); const avisos = new Set();
  const anota = (d) => { estados.add(d.status); d.candidates.forEach((c) => motivos.add(c.reason)); d.warnings.forEach((w) => avisos.add(w)); };
  const conLimite = { ...DATOS, models: [{ ...mod('alfa-1', 'alfa', 5, 5, 0.01), limits: { maxDurationSec: 5 } }, mod('beta-1', 'beta', 2, 2, 0.5)], providers: [prov('alfa'), prov('beta')], adapters: [ad('alfa'), ad('beta')] };
  const conModalidad = { ...DATOS, models: [{ ...mod('alfa-1', 'alfa', 5, 5, 0.01), modalities: ['text'] }, mod('beta-1', 'beta', 2, 2, 0.5)], providers: [prov('alfa'), prov('beta')], adapters: [ad('alfa'), ad('beta')] };
  const costes = { estimarUsd: (m) => (m.id === 'alfa-1' ? 99 : 0.01) };
  anota(router().resolver(pet()));
  anota(router().resolver(pet({ capability: 'no.existe' })));
  anota(router(undefined, { ...DATOS, providers: [prov('alfa', { status: 'PENDING' })], models: [mod('alfa-1', 'alfa', 4, 3, 0.05)], adapters: [ad('alfa')] }).resolver(pet()));
  anota(router({ allowUnverified: false }, { ...DATOS, providers: [prov('alfa', { status: 'UNVERIFIED' })], models: [mod('alfa-1', 'alfa', 4, 3, 0.05)], adapters: [ad('alfa')] }).resolver(pet()));
  anota(router(undefined, { ...DATOS, providers: [prov('alfa', { type: 'internal' })], models: [mod('alfa-1', 'alfa', 4, 3, 0.05)], adapters: [ad('alfa')] }).resolver(pet()));
  anota(router(undefined, { ...DATOS, providers: [prov('alfa', { languages: { only: ['en'], note: 'x' } }), prov('beta')], models: [mod('alfa-1', 'alfa', 5, 5, 0.01), mod('beta-1', 'beta', 2, 2, 0.5)], adapters: [ad('alfa'), ad('beta')] }).resolver(pet({ language: { appLanguage: 'es' } })));
  anota(router(undefined, { ...DATOS, providers: [prov('alfa', { regions: ['us'] }), prov('beta')], models: [mod('alfa-1', 'alfa', 5, 5, 0.01), mod('beta-1', 'beta', 2, 2, 0.5)], adapters: [ad('alfa'), ad('beta')] }).resolver(pet({ constraints: { region: 'eu' } })));
  anota(router().resolver(pet({ constraints: { quality: { minScore: 0.9 } } })));
  anota(router().resolver(pet({ constraints: { budget: { maxCredits: 5 } } })));
  anota(router(undefined, { ...DATOS, providers: [prov('alfa', { status: 'UNVERIFIED' })] }).resolver(pet()));
  anota(router({ allowInternal: true }, { ...DATOS, providers: [prov('alfa', { type: 'internal' })], models: [mod('alfa-1', 'alfa', 4, 3, 0.05)], adapters: [ad('alfa')] }).resolver(pet()));
  anota(router().resolver(pet({ preference: { providerId: 'no-existe' } })));
  anota(router(undefined, { ...DATOS, models: [mod('alfa-1', 'alfa', 5, 2, 0.08), { ...mod('beta-1', 'beta', 3, 5), pricing: { unit: 'token', currency: 'USD', inputRate: 1 } }, mod('gamma-1', 'gamma', 4, 3, 0.04)] }).resolver(pet()));
  anota(router({ maxCandidates: 1 }).resolver(pet()));
  anota(router(undefined, conLimite).resolver(pet({ hints: { durationSec: 30 } })));
  anota(router(undefined, conModalidad).resolver(pet({ constraints: { outputModality: 'image' } })));
  anota(core.crearRouter({ registry: registroCon(), costs: costes }).resolver(pet({ constraints: { budget: { maxUsd: 1 } } })));

  const declarados = {
    status: ['routed', 'unavailable', 'invalid'],
    reason: ['selected', 'not_usable', 'status_not_allowed', 'internal_not_allowed', 'output_modality', 'duration_unsupported', 'language_unsupported', 'region_unsupported', 'below_minimum_quality', 'over_budget', 'lower_score'],
    warning: ['unverified_selected', 'synthetic_selected', 'preference_unmet', 'cost_not_comparable', 'candidates_capped', 'budget_not_checked'],
  };
  const faltan = {
    status: declarados.status.filter((x) => !estados.has(x)),
    reason: declarados.reason.filter((x) => !motivos.has(x)),
    warning: declarados.warning.filter((x) => !avisos.has(x)),
  };
  check('122) todos los estados declarados se producen de verdad', faltan.status.length === 0, faltan.status.join(','));
  check('123) todos los motivos, también', faltan.reason.length === 0, faltan.reason.join(','));
  check('124) y todos los avisos', faltan.warning.length === 0, faltan.warning.join(','));
  check('125) y el tipo no declara ninguno que no esté en esa lista: se comprueban TODOS',
    declarados.reason.every((r) => new RegExp(`'${r}'`).test(leer(CORE_ROUTER))) && (leer(CORE_ROUTER).match(/^\s+\| '[a-z_]+'$/gm) || []).length >= declarados.reason.length);

  /* Las pistas se usan: lo que no llega a la duración pedida no se elige. */
  const corto = router(undefined, conLimite).resolver(pet({ hints: { durationSec: 30 } }));
  check('126) un modelo que no llega a la duración pedida NO se elige: elegirlo sería mandar a ejecutar algo que va a fallar',
    corto.selected.providerId === 'beta' && veredicto(corto, 'alfa').reason === 'duration_unsupported', `${corto.selected.providerId}`);
  check('127) y si la duración cabe, se elige el mejor', router(undefined, conLimite).resolver(pet({ hints: { durationSec: 3 } })).selected.providerId === 'alfa');
  const pedirMax = router().resolver(pet({ hints: { quality: 'max' } }));
  const pedirBasica = router().resolver(pet({ hints: { quality: 'standard' } }));
  /*
   * La pista es ASIMÉTRICA a propósito: pedir el máximo penaliza a los de
   * menos calidad, y pedir lo básico no empuja a nadie porque todos lo
   * cumplen. Sube el suelo de lo deseado; nunca lo baja.
   */
  const beta = (d) => d.candidates.find((c) => c.providerId === 'beta').score.preferenceFit;
  const alfa = (d) => d.candidates.find((c) => c.providerId === 'alfa').score.preferenceFit;
  check('128) la pista de calidad es una SEÑAL que mueve la puntuación, no una condición que descarte',
    pedirMax.candidates.length === pedirBasica.candidates.length && pedirMax.candidates.every((c) => c.eligible)
    && beta(pedirMax) < beta(pedirBasica), `beta: max=${beta(pedirMax)} standard=${beta(pedirBasica)}`);
  check('128b) y al que ya da esa calidad no lo penaliza pasarse', alfa(pedirMax) === alfa(pedirBasica) && alfa(pedirMax) >= beta(pedirMax));

  /* El suelo de la política y el de la petición: manda el más exigente. */
  check('129) el suelo de calidad de la política se aplica', router({ minQuality: 0.9 }).resolver(pet()).candidates.filter((c) => c.reason === 'below_minimum_quality').length === 2);
  check('130) y a la vez que el de la petición, quedándose con el más exigente', (() => {
    const politicaAlta = router({ minQuality: 0.9 }).resolver(pet({ constraints: { quality: { minScore: 0.1 } } }));
    const peticionAlta = router({ minQuality: 0.1 }).resolver(pet({ constraints: { quality: { minScore: 0.9 } } }));
    return politicaAlta.selected.providerId === 'alfa' && peticionAlta.selected.providerId === 'alfa';
  })());
  /* El suelo tiene que ser uno VÁLIDO que nadie alcance: `1.1` no es un suelo, es una política mal escrita (D-02c). */
  check('131) y si ni el más exigente lo cumple nadie, se dice en vez de rebajarlo',
    router({ minQuality: 1 }, { ...DATOS, models: DATOS.models.map((m) => ({ ...m, grades: { quality: 4, speed: 3 } })) }).resolver(pet()).status === 'unavailable');

  /* El tope: se comprueba de verdad cuando hay quien sepa estimar, y se dice cuando no. */
  const conPuerto = core.crearRouter({ registry: registroCon(), costs: costes }).resolver(pet({ constraints: { budget: { maxUsd: 1 } } }));
  check('132) con un estimador de coste, el tope se comprueba y lo que no cabe se descarta',
    veredicto(conPuerto, 'alfa').reason === 'over_budget' && !conPuerto.warnings.includes('budget_not_checked'), `${conPuerto.selected.providerId}`);
  check('133) sin estimador, no se finge: se dice que no se comprobó', router().resolver(pet({ constraints: { budget: { maxUsd: 1 } } })).warnings.includes('budget_not_checked'));
  check('134) un tope en Credits nunca se comprueba aquí: convertir a Credits es de la Fase 9',
    core.crearRouter({ registry: registroCon(), costs: costes }).resolver(pet({ constraints: { budget: { maxCredits: 5 } } })).warnings.includes('budget_not_checked'));
  check('135) el estimador es un PUERTO, no una implementación: el Core no calcula ningún precio',
    /export interface CostEstimatePort/.test(leer(CORE_ROUTER)) && !/estimarUsd\s*[:(]\s*\([^)]*\)\s*(:|=>)\s*[^;]*[0-9]/.test(codigoCore));
  check('136) y si todos se pasan del tope, se dice sin elegir a nadie',
    core.crearRouter({ registry: registroCon(), costs: { estimarUsd: () => 999 } }).resolver(pet({ constraints: { budget: { maxUsd: 1 } } })).status === 'unavailable');

  /* Y los números siguen siendo números, pase lo que pase. */
  const raros = [
    ['pesos todos a cero', router({ weights: { quality: 0, speed: 0, cost: 0, availability: 0, preference: 0, reliability: 0 } }).resolver(pet())],
    ['pesos negativos', router({ weights: { quality: -5, speed: 1, cost: 1, availability: 1, preference: 1, reliability: 1 } }).resolver(pet())],
    ['grados fuera de escala', router(undefined, { ...DATOS, models: [mod('alfa-1', 'alfa', 99, -3, 0.05), mod('beta-1', 'beta', 3, 4, 0.02), mod('gamma-1', 'gamma', 4, 3, 0.04)] }).resolver(pet())],
    ['tarifa negativa', router(undefined, { ...DATOS, models: [mod('alfa-1', 'alfa', 4, 3, -5), mod('beta-1', 'beta', 3, 4, 0.02), mod('gamma-1', 'gamma', 4, 3, 0.04)] }).resolver(pet())],
    ['latencia negativa', router(undefined, { ...DATOS, models: [{ ...mod('alfa-1', 'alfa', 4, 3, 0.05), grades: { quality: 4, speed: 3, latencyMsP50: -100 } }, mod('beta-1', 'beta', 3, 4, 0.02), mod('gamma-1', 'gamma', 4, 3, 0.04)] }).resolver(pet())],
  ];
  check('137) ninguna puntuación sale NaN, infinita, negativa ni mayor que uno, con datos rotos del registro',
    raros.every(([, d]) => d.candidates.every((c) => !c.score || Object.values(c.score).every((n) => Number.isFinite(n) && n >= 0 && n <= 1))),
    raros.filter(([, d]) => d.candidates.some((c) => c.score && Object.values(c.score).some((n) => !Number.isFinite(n) || n < 0 || n > 1))).map(([n]) => n).join(', ') || 'todos acotados');
  check('138) un modelo sin `grades` se rechaza en vez de puntuar con `undefined`',
    router(undefined, { ...DATOS, models: [{ id: 'x', providerId: 'alfa', capabilities: ['image.generate'], modalities: ['image'], status: 'READY' }], providers: [prov('alfa')], adapters: [ad('alfa')] }).resolver(pet()).status !== 'routed');
  check('139) y el registro no se puede modificar a través de nada de lo devuelto', (() => {
    const d = router().resolver(pet());
    try { d.policy.weights.quality = 99; } catch { /* congelado */ }
    return core.POLITICA_POR_DEFECTO.weights.quality === 0.35 && router().resolver(pet()).policy.weights.quality === 0.35;
  })());
}

/*
 * ── Q · Lo que encontró la auditoría ────────────────────────────────────────
 *
 * Veintiún defectos que existieron de verdad, agrupados de 58 hallazgos y
 * reproducidos ejecutando el Router. Escritos por el efecto observable.
 */
console.log('\n── Q · Lo que encontró la auditoría ──');
{
  /* D-01 · El registro real deja `modalities` vacío: vacío es «no lo declara», no «no produce nada». */
  const comoElReal = { ...DATOS, models: DATOS.models.map((m) => ({ ...m, modalities: [] })) };
  const d1 = router(undefined, comoElReal).resolver(pet({ constraints: { outputModality: 'image' } }));
  check('140) D-01 · un modelo sin modalidades declaradas NO se descarta: el registro real las deja vacías en todos',
    d1.status === 'routed' && d1.candidates.filter((c) => c.eligible).length === 3, `${d1.status}`);
  check('141) D-01b · y el proveedor sirve de respaldo cuando el modelo no las declara',
    router(undefined, { ...comoElReal, providers: DATOS.providers.map((p) => ({ ...p, modalities: ['video'] })) }).resolver(pet({ constraints: { outputModality: 'image' } })).status === 'unavailable');
  check('142) D-01c · quien SÍ las declara y no incluye la pedida, queda fuera',
    router(undefined, { ...DATOS, models: [{ ...DATOS.models[0], modalities: ['text'] }, ...DATOS.models.slice(1)] }).resolver(pet({ constraints: { outputModality: 'image' } })).candidates.find((c) => c.providerId === 'alfa').reason === 'output_modality');
  check('143) D-01d · contra el registro REAL de Weë, una capacidad servida se enruta con la salida fijada', (() => {
    const real = core.crearRegistro({ capabilities: core.CAPABILITY_CATALOG, providers: [prov('alfa', { modalities: ['image'] })], models: [{ ...mod('alfa-1', 'alfa', 4, 3, 0.05), modalities: [] }], adapters: [ad('alfa')] });
    return core.crearRouter({ registry: real }).resolver(pet({ constraints: { outputModality: 'image' } })).status === 'routed';
  })());

  /* D-02 · Una clave presente valiendo `undefined` no es una clave ausente. */
  const conUndefined = router({ allowUnverified: undefined, allowBeta: undefined, maxCandidates: undefined, weights: { cost: undefined } });
  const dp = conUndefined.resolver(pet());
  check('144) D-02 · una política parcial con `undefined` NO destruye los valores por defecto',
    dp.policy.allowUnverified === true && dp.policy.allowBeta === true && dp.policy.maxCandidates === 256 && dp.policy.weights.cost === 0.2, JSON.stringify(dp.policy.weights));
  check('145) D-02b · ni `null`, ni un peso negativo, ni un tope que no es un entero positivo',
    router({ allowUnverified: null, weights: { quality: -1 }, maxCandidates: 0 }).resolver(pet()).policy.weights.quality === 0.35
    && router({ maxCandidates: 1.5 }).resolver(pet()).policy.maxCandidates === 256);
  /* El otro lado de la misma trampa: un spread condicional AÑADE el bueno pero no QUITA el malo. */
  const sueloImposible = router({ minQuality: 5 }).resolver(pet());
  check('145b) D-02c · un suelo de calidad fuera de 0..1 se DESCARTA, no se queda descartándolo todo',
    sueloImposible.policy.minQuality === undefined && sueloImposible.status === 'routed', `${sueloImposible.policy.minQuality} ${sueloImposible.status}`);
  check('145c) D-02d · y uno dentro de 0..1 sí gobierna',
    router({ minQuality: 0.95 }).resolver(pet()).policy.minQuality === 0.95);

  /* D-03 · La traza se lee con el lector del Core y se devuelve la lectura. */
  const sucia = JSON.parse('{"traceId":"t-0001","requestId":"r-0001","userId":"user-0001","apiKey":"sk-secreto","stack":"C:/ruta"}');
  const d3 = router().resolver(pet({ trace: sucia }));
  check('146) D-03 · el hilo se lee con el lector del Core: ni secretos ni rutas salen en la decisión',
    !/apiKey|sk-secreto|stack|C:\//.test(JSON.stringify(d3)), JSON.stringify(d3.trace));
  check('147) D-03b · y la traza devuelta está congelada', Object.isFrozen(d3.trace));

  /* D-04 y D-17 · Lo desconocido no se premia ni pasa. */
  const saludRara = router(undefined, { ...DATOS, providers: [prov('alfa', { health: { state: 'INVENTADO' } }), prov('beta'), prov('gamma')] }).resolver(pet());
  check('148) D-04 · una salud que la tabla no conoce puntúa como lo peor, no como `undefined`',
    Number.isFinite(saludRara.candidates.find((c) => c.providerId === 'alfa').score.availabilityFit) && saludRara.candidates.every((c) => !c.score || Number.isFinite(c.score.total)));
  const estadoRaro = router(undefined, { ...DATOS, providers: [prov('alfa', { status: 'INVENTADO' }), prov('beta'), prov('gamma')] }).resolver(pet());
  check('149) D-17 · un estado que el contrato no declara FALLA CERRADO: ni elegible, ni confianza máxima',
    veredicto(estadoRaro, 'alfa').eligible === false && veredicto(estadoRaro, 'alfa').reason === 'status_not_allowed');

  /* D-05 · Pistas e idioma con los lectores del Core, porque gobiernan un filtro duro. */
  check('150) D-05 · una pista con un texto donde va un número se rechaza, en vez de gobernar la selección',
    router().resolver(pet({ hints: { durationSec: 'treinta' } })).status === 'invalid'
    && router().resolver(pet({ hints: { durationSec: {} } })).status === 'invalid');
  check('151) D-05b · una pista con una selección dentro, también', router().resolver(pet({ hints: { providerId: 'alfa', durationSec: 3 } })).status === 'invalid');
  check('152) D-05c · y una calidad que no es del vocabulario', router().resolver(pet({ hints: { quality: 'constructor' } })).error.details.field === 'hints.quality');
  check('153) D-05d · el idioma igual: basura fuera, clave de más fuera, y sin idioma de la app fuera',
    [{ appLanguage: '!!no!!' }, { appLanguage: 'es', providerId: 'x' }, { inputLanguage: 'es' }].every((l) => router().resolver(pet({ language: l })).status === 'invalid'));

  /* D-06 · El tope se aplica DESPUÉS de filtrar. */
  const cincoApagados = {
    capabilities: DATOS.capabilities,
    providers: [...Array.from({ length: 5 }, (_, i) => prov(`p${i}`, { status: 'DISABLED' })), prov('zbueno')],
    models: [...Array.from({ length: 5 }, (_, i) => mod(`m${i}`, `p${i}`, 5, 5, 0.01)), mod('zbueno1', 'zbueno', 4, 4, 0.02)],
    adapters: [...Array.from({ length: 5 }, (_, i) => ad(`p${i}`)), ad('zbueno')],
  };
  check('154) D-06 · el tope no puede tirar a la única implementación ejecutable: se aplica tras filtrar',
    router({ maxCandidates: 3 }, cincoApagados).resolver(pet()).selected?.providerId === 'zbueno');
  check('155) D-06b · y sigue cortando cuando hay más elegibles de los que se admiten',
    router({ maxCandidates: 1 }).resolver(pet()).warnings.includes('candidates_capped'));

  /* D-07 · Un candidato roto es un candidato menos, no un fallo de todos. */
  const unoRoto = { ...DATOS, models: [{ id: 'roto', providerId: 'alfa', capabilities: ['image.generate'], modalities: ['image'], status: 'READY' }, ...DATOS.models.slice(1)] };
  const d7 = router(undefined, unoRoto).resolver(pet());
  check('156) D-07 · un modelo malformado se descarta, y los sanos siguen decidiéndose',
    d7.status === 'routed' && d7.warnings.includes('malformed_candidate') && d7.candidates.length === 2, `${d7.status} ${d7.candidates.length}`);

  /* D-08 · Los dos niveles de región, no uno u otro. */
  const regiones = { ...DATOS, providers: [prov('alfa', { regions: ['us'] }), prov('beta')], models: [{ ...mod('alfa-1', 'alfa', 5, 5, 0.01), regions: ['eu'] }, mod('beta-1', 'beta', 2, 2, 0.5)], adapters: [ad('alfa'), ad('beta')] };
  check('157) D-08 · la región del modelo no tapa la del proveedor: se comprueban las dos',
    router(undefined, regiones).resolver(pet({ constraints: { region: 'eu' } })).selected.providerId === 'beta');
  check('158) D-08b · y con las dos de acuerdo, entra',
    router(undefined, { ...regiones, providers: [prov('alfa', { regions: ['eu'] }), prov('beta')] }).resolver(pet({ constraints: { region: 'eu' } })).selected.providerId === 'alfa');

  /* D-09 · El contexto viaja para correlacionar, y no pondera. */
  const conContexto = router().resolver(pet({ appId: 'wee-chef', workspaceId: 'chef', operationId: 'op-0001' }));
  check('159) D-09 · el producto, el Workplace y la operación viajan a la decisión, para poder atribuirla',
    conContexto.context.appId === 'wee-chef' && conContexto.context.workspaceId === 'chef' && conContexto.context.operationId === 'op-0001');
  check('160) D-09b · y siguen sin decidir nada: el despacho es idéntico se pida desde donde se pida',
    JSON.stringify(conContexto.candidates) === JSON.stringify(router().resolver(pet()).candidates)
    && JSON.stringify(conContexto.selected) === JSON.stringify(router().resolver(pet({ appId: 'wee-travel' })).selected));

  /* D-10 · Desempate por valor de carácter, no por reglas de idioma. */
  const mayusculas = { ...DATOS, providers: [prov('Z-a'), prov('a-a')], models: [mod('m1', 'Z-a', 4, 3, 0.04), mod('m2', 'a-a', 4, 3, 0.04)], adapters: [ad('Z-a'), ad('a-a')] };
  check('161) D-10 · el desempate no depende del idioma del entorno: gana el primero por valor de carácter',
    router(undefined, mayusculas).resolver(pet()).selected.providerId === 'Z-a' && !/localeCompare/.test(codigoCore));
  check('162) D-10b · y con números, guiones y mayúsculas mezclados sigue siendo estable', (() => {
    const ids = ['a-1', 'A-1', 'a-10', 'a-2', 'Z9'];
    const datos = { capabilities: DATOS.capabilities, providers: ids.map((i) => prov(i)), models: ids.map((i, n) => mod(`m${n}`, i, 4, 3, 0.04)), adapters: ids.map((i) => ad(i)) };
    const esperado = [...ids].sort()[0];
    const barajado = { ...datos, providers: [...datos.providers].reverse(), models: [...datos.models].reverse() };
    return router(undefined, datos).resolver(pet()).selected.providerId === esperado && router(undefined, barajado).resolver(pet()).selected.providerId === esperado;
  })());

  /* D-11 · La composición pasa el contexto y distingue los dos noes. */
  const comp = leer(COMP_ROUTER);
  check('163) D-11 · hay una vía que pasa la petición entera, no solo capacidad y traza',
    /resolverConContexto/.test(comp) && /Omit<RouterRequest, 'contract'>/.test(comp));
  check('164) D-11b · y distingue «lo que pediste está mal» de «hoy no hay con qué»',
    /reason: decision\.status === 'invalid' \? 'invalid' : 'unavailable'/.test(comp) && /ResolucionDeWee/.test(comp));

  /* D-12 · Al estimador, lo mínimo. */
  let visto;
  core.crearRouter({ registry: registroCon(), costs: { estimarUsd: (m, ctx) => { visto = ctx; return 0.001; } } })
    .resolver(pet({ constraints: { budget: { maxUsd: 1 } }, appId: 'wee-chef', workspaceId: 'chef' }));
  check('165) D-12 · el estimador NO recibe el producto ni el Workplace ni la traza: solo lo que describe el trabajo',
    !!visto && visto.capability === 'image.generate' && visto.appId === undefined && visto.workspaceId === undefined && visto.trace === undefined, JSON.stringify(visto));

  /* D-13 · Lista blanca y vocabulario en el tope. */
  check('166) D-13 · el tope no admite claves inventadas ni vocabulario inventado',
    router().resolver(pet({ constraints: { budget: { maxUsd: 1, loQueSea: 1 } } })).status === 'invalid'
    && router().resolver(pet({ constraints: { budget: { prefer: 'inventado' } } })).status === 'invalid'
    && router().resolver(pet({ constraints: { budget: { onExceed: 'loquesea' } } })).status === 'invalid');
  check('167) D-13b · y sí admite el vocabulario de `Budget` de la Fase 0',
    router().resolver(pet({ constraints: { budget: { maxUsd: 1, maxCredits: 5, prefer: 'cost', onExceed: 'degrade' } } })).status === 'routed');

  /* D-14 · El error también se congela. */
  const malo = router().resolver(pet({ capability: 'no.existe' }));
  check('168) D-14 · el error y sus detalles salen congelados, como todo lo demás', Object.isFrozen(malo.error) && Object.isFrozen(malo.error.details));

  /* D-15 · La petición sigue exigiendo capacidad; la decisión no inventa una. */
  check('169) D-15 · `RouterRequest.capability` sigue siendo OBLIGATORIA en el contrato',
    /^\s+capability: CoreCapabilityId;$/m.test(leer(CORE_ROUTER)) && /capability\?: CoreCapabilityId;/.test(leer(CORE_ROUTER)));
  const sinCap = router().resolver({ contract: '1.0', trace });
  check('170) D-15b · y cuando no se pudo leer, el campo se OMITE en vez de decir `undefined`',
    sinCap.status === 'invalid' && !('capability' in sinCap) && router().resolver(pet({ capability: 'no.existe' })).capability === 'no.existe');

  /* D-16 · Una estimación que no se puede hacer no es una estimación que cabe. */
  const noSabe = core.crearRouter({ registry: registroCon(), costs: { estimarUsd: () => undefined } }).resolver(pet({ constraints: { budget: { maxUsd: 0.0001 } } }));
  check('171) D-16 · si el estimador no sabe decirlo, el tope NO se da por comprobado en silencio',
    noSabe.warnings.includes('budget_not_checked'), noSabe.warnings.join());
  check('172) D-16b · y cuando sí sabe, no se avisa de más',
    !core.crearRouter({ registry: registroCon(), costs: { estimarUsd: () => 0.001 } }).resolver(pet({ constraints: { budget: { maxUsd: 1 } } })).warnings.includes('budget_not_checked'));

  /* D-18 · La capacidad se lee una vez. */
  let lecturas = 0;
  const camaleon = { contract: '1.0', trace, get capability() { lecturas++; return lecturas === 1 ? 'image.generate' : 'video.generate'; } };
  const dCam = router().resolver(camaleon);
  check('173) D-18 · la capacidad se lee UNA vez: lo que se valida es lo que se usa y lo que se devuelve',
    lecturas === 1 && dCam.capability === 'image.generate' && dCam.status === 'routed', `lecturas=${lecturas} devuelta=${dCam.capability}`);

  /* D-19 · Guardia de exhaustividad de modalidades. */
  check('174) D-19 · la lista de modalidades tiene guardia del compilador: añadir una al Core obliga a revisarla',
    /MODALIDADES_COMPLETAS: Record<Modality, true>/.test(leer(CORE_ROUTER)));

  /* D-20 · Orden fijo de validación. */
  check('175) D-20 · el campo que se nombra al rechazar no depende del orden en que se escribió la petición', (() => {
    const a = router().resolver({ contract: '1.0', capability: 'image.generate', trace, zzz: 1, aaa: 2 });
    const b = router().resolver({ contract: '1.0', capability: 'image.generate', trace, aaa: 2, zzz: 1 });
    return a.error.details.field === b.error.details.field;
  })());

  /* D-21 · El puerto promete determinismo. */
  check('176) D-21 · el contrato del estimador dice que tiene que ser determinista', /DETERMINISTA/.test(leer(CORE_ROUTER)));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
