/**
 * S6-A · UNA SOLA AUTORIDAD DE EJECUCIÓN, Y LA PRUEBA DE QUE YA LO ERA.
 *
 * ── Lo que esta suite corrige, empezando por un error mío ───────────────────
 *
 * El informe de S6 dijo que Weë tenía «dos gateways: `engine/` y `core/`». Es
 * falso, y la auditoría de S6-A lo demuestra: `engine/gateway.ts` NO es un
 * segundo gateway — es la COMPOSICIÓN del Gateway del Core sobre los
 * adaptadores reales (`crearGatewayDelMotor` llama a `crearGateway`, el del
 * Core, y le pasa `crearEjecutorDelMotor` como puerto). Hay un Gateway.
 *
 * Lo que sí está duplicado está un piso MÁS ARRIBA, y es otra cosa:
 * `engine/router.ts` funde en una función lo que el Core tiene repartido —
 * elegir implementación, reintentar con el siguiente, abrir el libro y poner
 * precio—. Eso es una segunda autoridad de ROUTING, no de gateway, y tocarla
 * está fuera de esta fase a propósito.
 *
 * ── Y entonces, ¿qué hace esta suite? ───────────────────────────────────────
 *
 * Fija la frontera que YA es única, para que no deje de serlo. «Consolidar una
 * sola autoridad» cuando ya hay una sola no es cambiar código: es demostrarlo
 * y hacer imposible que aparezca una segunda sin que nadie se entere.
 *
 *   A · Un solo sitio donde se le habla a un proveedor
 *   B · El Gateway del Core no elige, y no puede empezar a elegir
 *   C · Los dos caminos terminan en el MISMO adaptador
 *   D · Lo que el Gateway del Core NO hace, y por eso no sustituye al legacy
 *
 * Sin proveedor real, sin red, sin dinero.
 *
 * Usa el compilado: `npm run build` antes de `npm test`.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hostsDeProveedores, patronDeHosts, SDKS_DE_IA, CARPETA_DE_ADAPTADORES } from '../../ops/revision/hosts-de-proveedores.mjs';

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

/** Todos los .ts de producción, sin pruebas. */
const fuentes = (dir = 'functions/src') =>
  fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? fuentes(`${dir}/${e.name}`) : e.name.endsWith('.ts') ? [`${dir}/${e.name}`] : []);

const TODO = fuentes().map((f) => [f, sinComentarios(leer(f))]);

/* ═══ A · UN SOLO SITIO DONDE SE LE HABLA A UN PROVEEDOR ══════════════════ */
console.log('\n── A · ¿Quién puede llamar a un adaptador? ──');
{
  /**
   * LOS TRES ÚNICOS SITIOS, declarados uno a uno. Si aparece un cuarto, esta
   * prueba lo dice, y ese es todo su propósito.
   */
  const AUTORIZADOS = {
    /* El Core le pide a su PUERTO que ejecute. No sabe quién lo implementa. */
    'functions/src/core/gateway.ts': 'el Core llama a su puerto `AdapterExecutor`',
    /* La implementación de ese puerto sobre los adaptadores reales. */
    'functions/src/engine/gateway.ts': 'el ejecutor del motor, que ES ese puerto',
    /* El camino legacy: routing, reintento, libro y precio fundidos. */
    'functions/src/engine/router.ts': 'el router del motor (legacy, con su propio bucle)',
  };
  const llaman = TODO.filter(([, s]) => /\.run\(\{|\.run\(\s*$|executor\.run\(/.test(s)).map(([f]) => f)
    .filter((f) => !f.startsWith('functions/src/engine/providers/'));
  check('A) exactamente TRES sitios llaman a un adaptador, y los tres están declarados',
    llaman.length === 3 && llaman.every((f) => AUTORIZADOS[f] !== undefined),
    llaman.join(' | '));

  /* Y ninguno de los tres es un adaptador nuevo escondido. */
  const adaptadores = fs.readdirSync(path.resolve(RAIZ, 'functions/src/engine/providers')).filter((f) => f.endsWith('.ts'));
  check('A) los adaptadores viven en UN solo sitio, y son los de siempre',
    adaptadores.length > 0 && llaman.every((f) => !f.includes('/providers/')),
    `${adaptadores.length} adaptadores`);

  /*
   * NADIE MÁS HABLA CON UN PROVEEDOR. `vertexAI.ts` es el único legacy que se
   * salta el motor entero —lo usan el avatar y la compresión de imágenes, y es
   * anterior al ENGINE—; está declarado para que un segundo no pueda aparecer
   * sin que esto lo diga.
   */
  /*
   * Las direcciones NO se escriben aquí a mano: salen de los propios adaptadores
   * (`ops/revision/hosts-de-proveedores.mjs`). La lista escrita a mano que había
   * buscaba `api.elevenlabs.com` cuando el adaptador usa `api.elevenlabs.io`, y no
   * conocía ni BFL ni MiniMax: una llamada directa a esos tres no la veía nadie.
   */
  const HOSTS = hostsDeProveedores(RAIZ);
  const ENDPOINTS = patronDeHosts(HOSTS);
  check('A) la lista de proveedores vigilados sale de los adaptadores y los incluye a todos (también .io, bfl y minimax)',
    ['api.elevenlabs.io', 'api.bfl.ai', 'api.minimax.io', 'api.openai.com', 'api.anthropic.com', 'api.deepseek.com',
      'ark.ap-southeast.bytepluses.com', 'generativelanguage.googleapis.com'].every((h) => HOSTS.includes(h)), HOSTS.join(' '));
  check('A) y la vigilancia ve cada uno de ellos escrito fuera de un adaptador (control)',
    HOSTS.every((h) => ENDPOINTS.test(`const url = 'https://${h}/v1/x';`)) && !ENDPOINTS.test("const url = 'https://wee.zone/post/1';"));
  const conEndpoint = TODO.filter(([f, s]) => ENDPOINTS.test(s) && !f.startsWith(`${CARPETA_DE_ADAPTADORES}/`)).map(([f]) => f);
  check('A) NADIE fuera de los adaptadores tiene la dirección de un proveedor',
    conEndpoint.length === 0, conEndpoint.join(',') || 'ninguno');
  /*
   * Y por SDK, uno solo: `vertexAI.ts`, que llama a Gemini con `@google/genai`
   * para el avatar. Es anterior al ENGINE y se salta el motor entero — queda
   * declarado aquí para que un segundo no pueda aparecer en silencio.
   */
  /* Un SDK de IA se usa al IMPORTARLO (el id `'openai'` de un proveedor en una tabla no es usarlo). */
  const SDK = new RegExp(`(?:from\\s+|import\\(\\s*|require\\(\\s*)['"](?:${SDKS_DE_IA.map((p) => p.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})['"]|GoogleGenAI`);
  const porSdk = TODO.filter(([f, s]) => SDK.test(s) && !f.startsWith(`${CARPETA_DE_ADAPTADORES}/`)).map(([f]) => f);
  check('A) y por SDK queda UN legacy: `vertexAI.ts`, el del avatar',
    porSdk.join(',') === 'functions/src/vertexAI.ts', porSdk.join(',') || 'ninguno');
  check('A) al que solo llama el avatar: ni Weë Creator, ni Weë Brain, ni el motor',
    TODO.filter(([, s]) => /from '\.+\/?vertexAI'/.test(s)).map(([f]) => f).join(',') === 'functions/src/generateAvatar.ts');
}

/* ═══ B · EL GATEWAY DEL CORE NO ELIGE ════════════════════════════════════ */
console.log('\n── B · La frontera ejecuta; elegir es de otra capa ──');
{
  const CORE = sinComentarios(leer('functions/src/core/gateway.ts'));

  check('B) el Gateway del Core NO elige proveedor: exige una implementación YA resuelta',
    /implementation: ImplementationRef;/.test(leer('functions/src/core/gateway.ts'))
    && !/candidates|prioridad|fallback|chain|ordenar/i.test(CORE));
  check('B) NO reintenta con otro: un fallo es un fallo, y quien reintente es otro',
    !/for \(const candidate|siguienteCandidato|reintentar\(/.test(CORE));
  check('B) NO pone precio y NO abre libro: ni Credits, ni `aiGenerations`',
    !/creditsFor|aiGenerations|ledger\.|spendCredits/.test(CORE));
  check('B) y RECHAZA a quien intente elegir por su cuenta',
    /allowedProviders|excludeProviders/.test(leer('functions/src/core/gateway.ts'))
    && /CLAVES_DE_EJECUCION/.test(CORE));
}

/* ═══ C · LOS DOS CAMINOS TERMINAN EN EL MISMO SITIO ══════════════════════ */
console.log('\n── C · Un Gateway, dos composiciones, los mismos adaptadores ──');
{
  const ENGINE = leer('functions/src/engine/gateway.ts');

  check('C) `engine/gateway.ts` NO es un segundo Gateway: IMPORTA el del Core y lo compone',
    /crearGateway,/.test(ENGINE) && /from '\.\.\/core'/.test(ENGINE)
    && /return crearGateway\(\{/.test(ENGINE)
    /* Y no define uno suyo: en todo el motor no hay un segundo `crearGateway`. */
    && !/const crearGateway = /.test(ENGINE));
  check('C) y su ejecutor ES el puerto del Core sobre los adaptadores reales',
    /crearEjecutorDelMotor = \(deps: EjecutorDeps\): AdapterExecutor/.test(ENGINE)
    && /executor: crearEjecutorDelMotor\(\{/.test(ENGINE));
  check('C) los dos caminos llaman al MISMO objeto adaptador, el de `engine/providers`',
    /ADAPTERS/.test(ENGINE) && /ADAPTERS/.test(leer('functions/src/engine/index.ts'))
    && /adapters: ADAPTERS/.test(ENGINE));

  /* Y se demuestra ejecutando: el mismo adaptador, por las dos puertas. */
  const core = lib('core/index.js');
  const motor = lib('engine/gateway.js');
  const registro = lib('registry/index.js');
  const ajustes = lib('engine/registry.js');
  const CAPS = ['text.generate'];
  const llamadas = [];
  const adaptador = {
    id: 'x', name: 'x', modalities: ['text'],
    models: [{ id: 'x-1', provider: 'x', capabilities: CAPS, quality: 3, speed: 3, cost: { unit: 'call', usd: 0.01 } }],
    isConfigured: () => true,
    supports: (c) => CAPS.includes(c),
    async run(req) {
      llamadas.push(req.capability);
      return { output: { kind: 'text', content: 'listo' }, usage: { inputTokens: 1, outputTokens: 1 }, costUSD: 0.001, latencyMs: 3 };
    },
  };
  const adapters = { x: adaptador };
  const config = { providers: {}, settings: ajustes.DEFAULT_SETTINGS };
  const gateway = core.crearGateway({
    registry: core.crearRegistro(registro.datosDelRegistro(adapters, config.providers)),
    executor: motor.crearEjecutorDelMotor({ adapters, config: () => config, now: () => 1_800_000_000_000 }),
    tracer: { record() {} }, now: () => 1_800_000_000_000,
  });
  const r = await gateway.ejecutar({
    contract: core.GATEWAY_CONTRACT_VERSION,
    capability: 'text.generate',
    implementation: { providerId: 'x', modelId: 'x-1' },
    input: { prompt: 'hola' },
    trace: { traceId: 's6a_uno', requestId: 's6a_uno', userId: 'user-0001' },
  });
  check('C) y funciona: el Gateway del Core ejecuta el adaptador real por el puerto del motor',
    r.status === 'completed' && llamadas.join(',') === 'text.generate'
    && r.response?.content === 'listo',
    `${r.status}/${llamadas.length} llamada(s)`);
  check('C) sin elegir nada: la implementación se la dieron hecha',
    r.implementation?.providerId === 'x' && r.implementation?.modelId === 'x-1');
}

/* ═══ D · POR QUÉ NO SUSTITUYE AL LEGACY ══════════════════════════════════ */
console.log('\n── D · Lo que el legacy hace y la frontera no: el gap medido ──');
{
  const ROUTER = sinComentarios(leer('functions/src/engine/router.ts'));
  const CORE = sinComentarios(leer('functions/src/core/gateway.ts'));

  /*
   * ESTO ES EL INFORME, HECHO PRUEBA. `engine/router.execute` funde cuatro
   * responsabilidades que el Gateway del Core no tiene —y no debe tener—.
   * Cambiar el sitio de la llamada en `creatorRun` quitaría las cuatro, así
   * que unificar de verdad exige mover el ROUTING, que es otra fase.
   */
  const soloEnElLegacy = [
    ['elegir entre candidatos', /decision\.candidates/],
    ['reintentar con el siguiente', /for \(const candidate of decision\.candidates\)/],
    ['abrir y cerrar el libro', /ledger\.open\(|ledger\.close\(/],
    ['poner precio en Credits', /creditsFor\(/],
  ];
  for (const [que, forma] of soloEnElLegacy) {
    check(`D) «${que}» vive SOLO en el router del motor, no en la frontera del Core`,
      forma.test(ROUTER) && !forma.test(CORE));
  }
  check('D) por eso `runCapability` no se puede cambiar de sitio sin mover el routing: se perderían las cuatro',
    /engine\.generate\(/.test(leer('functions/src/gateway/index.ts'))
    && !/implementation:/.test(sinComentarios(leer('functions/src/gateway/index.ts'))));
  check('D) y `creatorRun` sigue llamando por la capa de compatibilidad, sin tocar',
    /runCapability\(/.test(leer('functions/src/creator/index.ts'))
    && !/gatewayDeWee|crearGateway\(/.test(leer('functions/src/creator/index.ts')));

  /* Lo que S6-A prometió no tocar, sigue sin tocarse. */
  check('D) no se tocó el Planner, ni el Workflow, ni el Orchestrator, ni el Router del Core',
    ['core/planner.ts', 'core/workflow.ts', 'core/orchestrator.ts', 'core/router.ts', 'core/job.ts', 'core/job-queue.ts']
      .every((f) => !/S6|gatewayDeWee|runCapability/.test(leer(`functions/src/${f}`))));
  check('D) ni el modelo de cobro: el Gateway del Core sigue sin cobrar nada',
    !/spendCredits|holdCredits/.test(CORE + sinComentarios(leer('functions/src/engine/gateway.ts'))));
  check('D) ni los adaptadores', (() => {
    const p = path.resolve(RAIZ, 'functions/src/engine/providers');
    return fs.readdirSync(p).filter((f) => f.endsWith('.ts')).every((f) => !/crearGateway|core\//.test(leer(`functions/src/engine/providers/${f}`)));
  })());

  check('esta suite está en la cadena de `npm test`', /gateway-autoridad\.test\.mjs/.test(leer('functions/package.json')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
