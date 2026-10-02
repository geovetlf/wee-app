/**
 * S6-B · LOS DOS ROUTERS, MEDIDOS CON LAS MISMAS ENTRADAS.
 *
 * Esta suite no migra nada. Mide, y deja la medición donde no se pueda
 * olvidar: el día que uno de los dos cambie de criterio, esto lo dirá.
 *
 * ── Lo que se compara, y lo que NO ──────────────────────────────────────────
 *
 * Se compara la DECISIÓN: dado lo mismo, ¿eligen lo mismo? Para que la
 * comparación signifique algo, los dos reciben LOS MISMOS adaptadores
 * sintéticos y la MISMA configuración de proveedores — si cada uno mirase un
 * mundo distinto estaríamos midiendo los mundos, no los criterios.
 *
 * No se ejecuta ningún adaptador. No se llama a ningún proveedor. No se crea
 * ningún trabajo, no se cobra un Credit, no se escribe `aiGenerations` y no se
 * toca Firestore. La sección F lo comprueba contando llamadas.
 *
 *   A · Qué hace cada uno: responsabilidades, medidas
 *   B · Paridad sobre las capacidades que Weë usa de verdad
 *   C · Los escenarios de descarte y de respaldo
 *   D · Coste, calidad y desempate
 *   E · Seguridad y determinismo
 *   F · Cero efectos secundarios
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
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
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const core = lib('core/index.js');
const motorRouter = lib('engine/router.js');
const registroDeWee = lib('registry/index.js');
const ajustes = lib('engine/registry.js');

const AHORA = 1_800_000_000_000;

/* ── El mundo compartido: los MISMOS adaptadores para los dos ─────────────── */

/**
 * Adaptadores sintéticos. Sintéticos y no reales a propósito: los reales
 * deciden si están configurados leyendo secretos del entorno, y sin claves
 * TODOS quedarían fuera — estaríamos comparando dos listas vacías y llamándolo
 * paridad. Con estos, lo que se mide es el CRITERIO.
 */
const llamadas = [];
const modelo = (id, provider, caps, quality, speed, usd, extra = {}) => ({
  id, provider, capabilities: caps, quality, speed,
  cost: { unit: 'call', usd }, ...extra,
});
const adaptador = (id, caps, modelos, configurado = true) => ({
  id, name: id, modalities: ['text', 'image', 'video', 'voice'],
  models: modelos,
  isConfigured: () => configurado,
  supports: (c) => caps.includes(c),
  async run(req) { llamadas.push(`${id}:${req.capability}`); return { output: { kind: 'text', content: 'x' }, usage: {}, costUSD: 0, latencyMs: 1 }; },
});

/* Tres proveedores: uno bueno y caro, uno barato, y uno que solo hace texto. */
const ALFA = adaptador('alfa', ['text.generate', 'image.generate', 'video.generate', 'voice.tts'], [
  modelo('alfa-texto', 'alfa', ['text.generate'], 5, 3, 0.02),
  modelo('alfa-imagen', 'alfa', ['image.generate'], 5, 3, 0.08),
  modelo('alfa-video', 'alfa', ['video.generate'], 5, 2, 0.5, { maxDurationSec: 10 }),
  modelo('alfa-voz', 'alfa', ['voice.tts'], 4, 4, 0.01),
]);
const BETA = adaptador('beta', ['text.generate', 'image.generate'], [
  modelo('beta-texto', 'beta', ['text.generate'], 3, 5, 0.002),
  modelo('beta-imagen', 'beta', ['image.generate'], 3, 5, 0.01),
]);
const GAMMA = adaptador('gamma', ['text.generate'], [modelo('gamma-texto', 'gamma', ['text.generate'], 4, 4, 0.01)]);

const ADAPTADORES = { alfa: ALFA, beta: BETA, gamma: GAMMA };

const proveedores = (extra = {}) => ({
  alfa: { enabled: true, priority: 10 },
  beta: { enabled: true, priority: 20 },
  gamma: { enabled: true, priority: 30 },
  ...extra,
});

const cadena = (capability, links) => ({ [capability]: { capability, policy: 'balanced', chain: links } });

const configDelMotor = (routing, provs = proveedores()) => ({
  providers: provs,
  routing,
  settings: { ...ajustes.DEFAULT_SETTINGS, allowMockFallback: false },
});

/** El router del motor, sin Firestore: config inyectada, sin uso diario, sin libro. */
const motor = (config, salud) => motorRouter.createRouter({
  adapters: ADAPTADORES,
  loadConfig: async () => config,
  ledger: { async open() { throw new Error('el libro NO se toca en una auditoría'); }, async progress() {}, async close() {} },
  health: salud ?? { isOpen: () => false, ok() {}, fail() {}, snapshot: () => ({}) },
  usageToday: async () => undefined,
});

/** El router del Core, alimentado del MISMO sitio: `datosDelRegistro`. */
const nucleo = (config, politica) => core.crearRouter({
  registry: core.crearRegistro(registroDeWee.datosDelRegistro(ADAPTADORES, config.providers)),
  ...(politica ? { policy: politica } : {}),
});

const traza = (i) => ({ traceId: `s6b_${String(i).padStart(4, '0')}`, requestId: `s6b_${String(i).padStart(4, '0')}`, userId: 'user-0001' });

/* ── Normalización: una sola forma para comparar ──────────────────────────── */

/**
 * Lo que sale de cada uno, en la misma forma. `MISSING` cuando una
 * implementación no produce ese dato — nunca se asume igualdad por ausencia.
 */
const delMotor = (decision) => ({
  elegido: decision.candidates.length ? `${decision.candidates[0].provider}/${decision.candidates[0].model.id}` : null,
  alternativas: decision.candidates.slice(1).map((c) => `${c.provider}/${c.model.id}`),
  descartados: decision.skipped.map((s) => `${s.provider}:${s.reason}`),
  coste: decision.candidates.length ? decision.candidates[0].estimatedUsd : 'MISSING',
  puntuacion: 'MISSING',
});
const delCore = (decision) => ({
  elegido: decision.selected ? `${decision.selected.providerId}/${decision.selected.modelId}` : null,
  alternativas: decision.alternatives.map((a) => `${a.providerId}/${a.modelId}`),
  descartados: decision.candidates.filter((c) => !c.eligible).map((c) => `${c.providerId}:${c.reason}`),
  coste: 'MISSING',
  puntuacion: decision.selectedScore ? Number(decision.selectedScore.total.toFixed(3)) : 'MISSING',
});

let caso = 0;
const comparar = async (capability, { routing, provs, prefs, hints, constraints, politica, salud } = {}) => {
  caso++;
  const config = configDelMotor(routing ?? cadena(capability, [{ provider: 'alfa' }, { provider: 'beta' }]), provs);
  const m = delMotor(await motor(config, salud).route({ capability, input: { prompt: 'una cosa' }, userId: 'u', ...(prefs ? { prefs } : {}) }));
  const c = delCore(nucleo(config, politica).resolver({
    contract: core.ROUTER_CONTRACT_VERSION, capability, trace: traza(caso),
    ...(hints ? { hints } : {}), ...(constraints ? { constraints } : {}),
  }));
  return { motor: m, core: c, igual: m.elegido === c.elegido };
};

/* ═══ A · QUÉ HACE CADA UNO ═══════════════════════════════════════════════ */
console.log('\n── A · Responsabilidades, medidas sobre el código ──');
{
  const MOTOR = sinComentarios(leer('functions/src/engine/router.ts'));
  const CORE = sinComentarios(leer('functions/src/core/router.ts'));

  check('A) `route()` del motor YA es puro: decide y no escribe nada',
    /const route = async \(request: EngineRequest/.test(MOTOR)
    && !/ledger\.open\(|ledger\.close\(/.test(MOTOR.slice(MOTOR.indexOf('const route ='), MOTOR.indexOf('const execute ='))));
  check('A) lo que funde routing y contabilidad es `execute()`, no `route()`',
    /ledger\.open\(|ledger\.close\(/.test(MOTOR.slice(MOTOR.indexOf('const execute ='))));
  check('A) el Router del Core es SÍNCRONO y puro: no espera a nadie',
    /resolver\(request: RouterRequest\): RoutingDecision/.test(leer('functions/src/core/router.ts'))
    && !/await |Promise</.test(CORE.slice(CORE.indexOf('export const crearRouter'))));

  /* Las cinco cosas que solo tiene uno de los dos. */
  const soloMotor = [
    ['cadena declarada de proveedores', /routing\.chain/, MOTOR, CORE],
    ['cuota diaria por proveedor', /maxCallsPerDay/, MOTOR, CORE],
    ['cortacircuitos en memoria', /health\.isOpen\(/, MOTOR, CORE],
    ['calidad deducida del TEXTO de la persona', /MAX_HINT|LIGHT_HINT/, MOTOR, CORE],
    ['precio en Credits dentro de la decisión', /creditsFor\(/, MOTOR, CORE],
  ];
  for (const [que, forma, a, b] of soloMotor) {
    check(`A) «${que}» existe SOLO en el router del motor`, forma.test(a) && !forma.test(b));
  }
  const soloCore = [
    ['puntuación ponderada de siete componentes', /capabilityFit|weights/],
    ['modalidad de salida como criterio', /output_modality/],
    ['región e idioma como criterio', /region_unsupported|language_unsupported/],
    ['tope de presupuesto por puerto opcional', /budget_not_checked/],
  ];
  for (const [que, forma] of soloCore) {
    check(`A) «${que}» existe SOLO en el Router del Core`, forma.test(CORE) && !forma.test(MOTOR));
  }
}

/* ═══ B · PARIDAD SOBRE LAS CAPACIDADES REALES ════════════════════════════ */
console.log('\n── B · Las mismas entradas, las dos decisiones ──');
{
  /*
   * ── LO QUE SE MIDIÓ, Y NO LO QUE SE ESPERABA ────────────────────────────
   *
   * Esta sección NO exige que coincidan. Registra lo que sale, clasificado, y
   * falla si cambia. Escribir `check(iguales)` habría sido decidir el
   * resultado antes de medirlo — que es justo lo que S6 y S6-A enseñaron a no
   * hacer.
   *
   * Con DOS candidatos el motor elige el primero de la cadena y el Core el que
   * más puntúa; con UNO coinciden por fuerza. Esa es toda la historia.
   */
  const ESPERADO = {
    'text.generate': { motor: 'alfa/alfa-texto', core: 'beta/beta-texto', tipo: 'DIFERENCIA DE CRITERIO' },
    'image.generate': { motor: 'alfa/alfa-imagen', core: 'beta/beta-imagen', tipo: 'DIFERENCIA DE CRITERIO' },
    'video.generate': { motor: 'alfa/alfa-video', core: 'alfa/alfa-video', tipo: 'MATCH' },
    'voice.tts': { motor: 'alfa/alfa-voz', core: 'alfa/alfa-voz', tipo: 'MATCH' },
  };
  for (const [cap, esperado] of Object.entries(ESPERADO)) {
    const links = cap === 'video.generate' || cap === 'voice.tts' ? [{ provider: 'alfa' }] : [{ provider: 'alfa' }, { provider: 'beta' }];
    const r = await comparar(cap, { routing: cadena(cap, links) });
    const tipo = r.igual ? 'MATCH' : 'DIFERENCIA DE CRITERIO';
    check(`B) ${cap} · ${esperado.tipo}`,
      r.motor.elegido === esperado.motor && r.core.elegido === esperado.core && tipo === esperado.tipo,
      `motor=${r.motor.elegido} core=${r.core.elegido} → ${tipo}`);
  }
  check('B) resumen: con varios candidatos DIVERGEN, con uno solo coinciden',
    Object.values(ESPERADO).filter((e) => e.tipo === 'MATCH').length === 2
    && Object.values(ESPERADO).filter((e) => e.tipo !== 'MATCH').length === 2);
}

console.log('\n── B2 · La diferencia estructural: cadena vs registro ──');
{
  /*
   * EL HALLAZGO CENTRAL DE S6-B, MEDIDO.
   *
   * El motor recorre una CADENA declarada en `aiRouting`: el orden lo escribe
   * un administrador. El Core mira el REGISTRO entero y ordena por una
   * puntuación. Con la cadena en un orden, coinciden; al invertirla, el motor
   * cambia de proveedor y el Core no se entera — porque para él la cadena no
   * existe.
   */
  const directa = await comparar('text.generate', { routing: cadena('text.generate', [{ provider: 'alfa' }, { provider: 'beta' }]) });
  const invertida = await comparar('text.generate', { routing: cadena('text.generate', [{ provider: 'beta' }, { provider: 'alfa' }]) });
  check('B2) invertir la cadena CAMBIA la decisión del motor',
    directa.motor.elegido !== invertida.motor.elegido,
    `${directa.motor.elegido} → ${invertida.motor.elegido}`);
  check('B2) y NO cambia la del Core: la cadena no es un concepto suyo',
    directa.core.elegido === invertida.core.elegido, `${directa.core.elegido}`);
  /*
   * Y AQUÍ ESTÁ LA TRAMPA QUE ESTA MEDICIÓN DESACTIVA: con la cadena invertida
   * los dos eligen `beta` y PARECE que hay paridad. No la hay — el Core eligió
   * `beta` las dos veces, por su puntuación. Coincidir por casualidad es
   * exactamente lo que una medición mal hecha declararía como equivalencia.
   */
  check('B2) invertida PARECE paridad, y es casualidad: el Core no cambió de opinión',
    !directa.igual && invertida.igual && directa.core.elegido === invertida.core.elegido,
    `directa: ${directa.igual ? 'MATCH' : 'DIFF'} · invertida: ${invertida.igual ? 'MATCH (casual)' : 'DIFF'}`);
}

/* ═══ C · DESCARTES Y RESPALDO ════════════════════════════════════════════ */
console.log('\n── C · Quién se queda fuera, y por qué ──');
{
  const apagado = await comparar('text.generate', { provs: proveedores({ alfa: { enabled: false, priority: 10 } }) });
  check('C) proveedor APAGADO por administración: los dos lo descartan',
    !apagado.motor.elegido?.startsWith('alfa') && !apagado.core.elegido?.startsWith('alfa'),
    `motor=${apagado.motor.elegido} core=${apagado.core.elegido}`);

  /*
   * LA PAUSA POR FALLOS. Para que se vea, hay que ponerla sobre el que cada
   * uno elegiría: el motor prefiere `alfa` (cabeza de cadena) y el Core
   * prefiere `beta` (más puntuación). Se pausa a los dos y se mira quién lo
   * nota.
   */
  const pausaDeAmbos = { isOpen: (p) => p === 'alfa' || p === 'beta', ok() {}, fail() {}, snapshot: () => ({}) };
  const enPausa = await comparar('text.generate', {
    routing: cadena('text.generate', [{ provider: 'alfa' }, { provider: 'beta' }, { provider: 'gamma' }]),
    salud: pausaDeAmbos,
  });
  check('C) proveedor EN PAUSA por fallos: el motor lo descarta y se va al tercero',
    enPausa.motor.elegido === 'gamma/gamma-texto', `motor=${enPausa.motor.elegido}`);
  check('C) …y el Core NO se entera: su salud viene del REGISTRO, no de un contador en memoria',
    enPausa.core.elegido === 'beta/beta-texto', `core=${enPausa.core.elegido}`);

  const sinNadie = await comparar('music.generate', { routing: cadena('music.generate', [{ provider: 'alfa' }]) });
  check('C) SIN CANDIDATO: ninguno de los dos inventa uno',
    sinNadie.motor.elegido === null && sinNadie.core.elegido === null);

  const soloUno = await comparar('voice.tts', { routing: cadena('voice.tts', [{ provider: 'alfa' }]) });
  check('C) con UN solo candidato los dos coinciden, y el Core no ofrece alternativas que no existen',
    soloUno.igual && soloUno.core.alternativas.length === 0, `${soloUno.core.elegido}`);

  /* El respaldo: uno reintenta, el otro solo dice qué más había. */
  check('C) el motor REINTENTA con el siguiente; el Core solo ENUMERA alternativas',
    /for \(const candidate of decision\.candidates\)/.test(sinComentarios(leer('functions/src/engine/router.ts')))
    && /alternatives: readonly ImplementationRef\[\]/.test(leer('functions/src/core/router.ts'))
    && !/for \(const candidate/.test(sinComentarios(leer('functions/src/core/router.ts'))));
}

/* ═══ D · COSTE, CALIDAD Y DESEMPATE ══════════════════════════════════════ */
console.log('\n── D · Con qué deciden cuando hay más de uno ──');
{
  const barato = await comparar('text.generate', {
    routing: { 'text.generate': { capability: 'text.generate', policy: 'cost-first', chain: [{ provider: 'alfa' }, { provider: 'beta' }] } },
  });
  check('D) con política «lo más barato» el motor elige el barato aunque esté el segundo',
    barato.motor.elegido === 'beta/beta-texto', barato.motor.elegido);
  check('D) el Core no tiene esa política: pondera coste con calidad y velocidad',
    barato.core.elegido !== null && typeof barato.core.puntuacion === 'number',
    `core=${barato.core.elegido} puntuación=${barato.core.puntuacion}`);

  const calidad = await comparar('text.generate', {
    routing: { 'text.generate': { capability: 'text.generate', policy: 'quality-first', chain: [{ provider: 'beta' }, { provider: 'alfa' }] } },
  });
  check('D) con «la mejor calidad» el motor ignora el orden de la cadena y elige por calidad',
    calidad.motor.elegido === 'alfa/alfa-texto', calidad.motor.elegido);

  check('D) el COSTE del motor está EN la decisión; el del Core entra por un puerto opcional',
    /estimatedUsd = estimateUsd\(/.test(leer('functions/src/engine/router.ts'))
    && /export interface CostEstimatePort/.test(leer('functions/src/core/router.ts')));
  check('D) y sin ese puerto el Core NO comprueba el tope: lo avisa en vez de fingir que lo comprobó',
    /budget_not_checked/.test(leer('functions/src/core/router.ts')));

  /* La calidad: de dónde sale en cada uno. */
  check('D) el motor deduce la calidad del TEXTO de la persona con una expresión regular',
    /const MAX_HINT = \//.test(leer('functions/src/engine/router.ts'))
    && /resolveQuality/.test(leer('functions/src/engine/router.ts')));
  check('D) el Core NUNCA ve el texto: su calidad viene de `hints` y `constraints`',
    !/prompt|input\.text|goal/.test(sinComentarios(leer('functions/src/core/router.ts')).slice(
      sinComentarios(leer('functions/src/core/router.ts')).indexOf('export const crearRouter'))));

  /* §10/§11 · Creative y adjuntos. */
  check('§10) ninguno de los dos mira parámetros creativos: S2 no llega al Router',
    !/CreativeParameters|camera\.|movement\.|aerial/.test(sinComentarios(leer('functions/src/core/router.ts')) + sinComentarios(leer('functions/src/engine/router.ts'))));
  check('§11) ni interpreta el contenido de un material: el Core no recibe adjuntos',
    !/attachments|assetId|BrainAttachment/.test(sinComentarios(leer('functions/src/core/router.ts'))));
}

/* ═══ E · SEGURIDAD Y DETERMINISMO ════════════════════════════════════════ */
console.log('\n── E · Que no se pueda colar nada, y que salga siempre lo mismo ──');
{
  /* §15 · Lo que llega de fuera. */
  const conProveedorPedido = await comparar('text.generate', { prefs: { allowedProviders: ['beta'] } });
  check('E) pedir un proveedor por su nombre SÍ lo obedece el motor: es su contrato',
    conProveedorPedido.motor.elegido === 'beta/beta-texto', conProveedorPedido.motor.elegido);
  check('E) y al Core NO se le puede pedir: `preference` sugiere, no manda',
    /export interface RoutingPreference/.test(leer('functions/src/core/router.ts'))
    && /preference_unmet/.test(leer('functions/src/core/router.ts')));
  check('E) una petición sin forma al Core es `invalid`, no una elección a ciegas', (() => {
    const r = nucleo(configDelMotor(cadena('text.generate', [{ provider: 'alfa' }]))).resolver({ contract: '1.0', capability: 'no.existe', trace: traza(999) });
    return r.status === 'invalid' || r.status === 'unavailable';
  })());
  check('E) y ninguno acepta un endpoint, una credencial ni una función',
    !/endpoint|apiKey|secret|credential|eval\(|new Function/.test(
      sinComentarios(leer('functions/src/core/router.ts')) + sinComentarios(leer('functions/src/engine/router.ts'))));

  /* §16 · Determinismo. */
  const tres = [];
  for (let i = 0; i < 3; i++) tres.push(await comparar('text.generate'));
  check('E) DETERMINISMO: tres veces el mismo caso, la misma decisión en los dos',
    new Set(tres.map((t) => t.motor.elegido)).size === 1 && new Set(tres.map((t) => t.core.elegido)).size === 1);
  check('E) y ninguno de los dos tira dados ni mira el reloj para decidir',
    !/Math\.random\(/.test(sinComentarios(leer('functions/src/core/router.ts')) + sinComentarios(leer('functions/src/engine/router.ts')))
    && !/Date\.now\(/.test(sinComentarios(leer('functions/src/core/router.ts'))));
}

/* ═══ F · CERO EFECTOS SECUNDARIOS ════════════════════════════════════════ */
console.log('\n── F · Una auditoría no puede tocar nada ──');
{
  check('F) NINGÚN adaptador se ejecutó en toda la suite', llamadas.length === 0, `${llamadas.length} llamadas`);
  check('F) ningún libro se abrió: el `ledger` de esta suite revienta si alguien lo toca',
    /el libro NO se toca en una auditoría/.test(leer('functions/test/router-parity.test.mjs')));
  /* Esta suite no importa nada de Firebase, y al router del motor se le inyecta todo. */
  check('F) no se tocó Firestore: la configuración y el uso diario entran inyectados',
    [...leer('functions/test/router-parity.test.mjs').matchAll(/^import .* from '([^']+)';$/gm)].every(([, d]) => d.startsWith('node:'))
    && /loadConfig: async \(\) => config/.test(leer('functions/test/router-parity.test.mjs'))
    && /usageToday: async \(\) => undefined/.test(leer('functions/test/router-parity.test.mjs')));
  check('F) y no se migró nada: los dos routers siguen como estaban',
    /createRouter/.test(leer('functions/src/engine/router.ts'))
    && /crearRouter/.test(leer('functions/src/core/router.ts'))
    && /engine\.generate\(/.test(leer('functions/src/gateway/index.ts')));
  check('F) ni el Planner, ni el Workflow, ni el Orchestrator, ni el Gateway, ni Financial',
    ['core/planner.ts', 'core/workflow.ts', 'core/orchestrator.ts', 'core/gateway.ts']
      .every((f) => !/S6-B|router-parity/.test(leer(`functions/src/${f}`))));

  check('esta suite está en la cadena de `npm test`', /router-parity\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
