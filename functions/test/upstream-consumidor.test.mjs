/**
 * WEË — G8: LO QUE ESCRIBIÓ UN PASO LLEGA AL SIGUIENTE.
 *
 * ── El hueco que cierra ─────────────────────────────────────────────────────
 *
 * F6-A encontró que `input.upstream` lo ESCRIBÍA el conductor y no lo leía
 * nadie. Tres apariciones en todo `src/`: la interfaz, quien lo calculaba y
 * quien lo escribía. Cero consumidores.
 *
 * Y lo que escribía era la referencia CRUDA: un identificador de material
 * metido dentro de `input`, que es donde viven los parámetros de la tarea. El
 * adaptador no sabía abrirlo aunque hubiera querido.
 *
 * ── Lo que cambia ───────────────────────────────────────────────────────────
 *
 *   antes   conductor → input.upstream = [{stepId, outputRefs:['mat_…']}]  → nadie
 *   ahora   conductor → JobRequest.upstream → Job → JobDispatch
 *                     → GatewayRequest.upstream
 *                     → el Gateway se lo pide a la puerta que comprueba dueño
 *                     → input.upstream = [{stepId, contenido | url}]
 *                     → el adaptador lo usa
 *
 * Ni un contrato nuevo de dependencia: `dependsOn` ya significaba las dos cosas
 * —orden y consumo— porque `materialDe` construye el upstream recorriéndolo.
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

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n} · ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const core = lib('core/index.js');
const { crearRegistro, crearGateway, GATEWAY_CONTRACT_VERSION } = core;
const { peticionDeGateway } = lib('job/index.js');
const motorDelGateway = lib('engine/gateway.js');
const registroDeWee = lib('registry/index.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const { resolverMaterialDeUpstream, upstreamEnLaEntrada } = lib('engine/referencias.js');

const callado = { record() {} };
const reloj = () => 1_000;

/* Lo que dejó el paso «guion»: un material de texto (C13) y uno de imagen. */
const DEL_GUION = { stepId: 'guion', capability: 'text.generate', produces: 'text', outputRefs: ['mat_guion'] };
const DE_LA_FOTO = { stepId: 'foto', capability: 'image.generate', produces: 'image', outputRefs: ['mat_foto'] };
const GUION = 'ESCENA 1. Un patio al atardecer.';

const puertas = (cuentaDueña = 'acc_mia') => {
  const pedidos = [];
  return {
    pedidos,
    texto: async (assetId) => {
      pedidos.push(['texto', assetId]);
      return assetId === 'mat_guion' && cuentaDueña === 'acc_mia' ? GUION : null;
    },
    entrega: async (assetId) => {
      pedidos.push(['entrega', assetId]);
      return assetId === 'mat_foto' && cuentaDueña === 'acc_mia'
        ? { assetId, url: `https://llave.invalido/${assetId}`, expiraEn: 9_000, vigenciaSegundos: 900 }
        : null;
    },
  };
};

console.log('\n── A · El contrato que ya estaba ──');

check('`dependsOn` ya significaba orden Y consumo: el upstream sale de recorrerlo',
  /const deps = \[\.\.\.\(step\.dependsOn \?\? \[\]\)\]/.test(leer('functions/src/core/orchestrator.ts')),
  'por eso G8 no crea `consumes`: sería un segundo campo diciendo lo mismo');
check('no se creó ningún motor de dependencias',
  !/DependencyEngine|OutputDependencyEngine|GraphEngine|MaterialDependencyEngine/.test(
    ['core/planner.ts', 'core/workflow.ts', 'core/orchestrator.ts', 'core/job.ts', 'engine/gateway.ts', 'engine/referencias.ts']
      .map((f) => leer(`functions/src/${f}`)).join('\n')));
check('`UpstreamMaterial` conserva sus cuatro campos: no se tocó',
  igual(
    (leer('functions/src/core/orchestrator.ts').match(/export interface UpstreamMaterial \{[^}]*\}/) ?? [''])[0]
      .match(/^\s*(\w+)\??:/gm)?.map((x) => x.trim().replace(/\??:/, '')),
    ['stepId', 'capability', 'produces', 'outputRefs'],
  ));

console.log('\n── B · G8-F1/F6/F10 · De referencia a material ──');

const p1 = puertas();
const resuelto = await resolverMaterialDeUpstream('acc_mia', [DEL_GUION, DE_LA_FOTO], p1);

check('G8-F1/F10 · un texto de un paso anterior se resuelve a su CONTENIDO',
  resuelto.materiales[0]?.materialType === 'text' && resuelto.materiales[0]?.contenido === GUION
  && resuelto.materiales[0]?.stepId === 'guion');
check('y una imagen se resuelve a una llave TEMPORAL, no al contenido',
  resuelto.materiales[1]?.materialType === 'image' && resuelto.materiales[1]?.url?.includes('llave')
  && resuelto.materiales[1]?.contenido === undefined,
  'dos clases de material, dos formas de leerlas');
check('G8-F6 · cada uno por SU puerta: el texto por la ficha, lo demás por la entrega',
  igual(p1.pedidos, [['texto', 'mat_guion'], ['entrega', 'mat_foto']]),
  'ni una tercera puerta, ni un atajo');
check('G8-F11 · varios upstreams se conservan, en orden',
  resuelto.materiales.length === 2 && resuelto.fallos.length === 0);
check('G8-F2 · sin upstream no se pide nada y no se resuelve nada',
  (await resolverMaterialDeUpstream('acc_mia', undefined, puertas())).materiales.length === 0
  && (await resolverMaterialDeUpstream('acc_mia', [], puertas())).lecturas === 0);

console.log('\n── C · G8-F3/F4 · Lo que falla, falla cerrado ──');

const ajena = await resolverMaterialDeUpstream('acc_ajena', [DEL_GUION], puertas('acc_ajena'));
check('G8-F4 · un material de otra cuenta NO se resuelve',
  ajena.materiales.length === 0 && ajena.fallos[0]?.reason === 'material_unavailable');
check('G8-F3 · una referencia que no existe tampoco',
  (await resolverMaterialDeUpstream('acc_mia', [{ ...DEL_GUION, outputRefs: ['mat_no_existe'] }], puertas()))
    .fallos[0]?.reason === 'material_unavailable');
check('G8-F4 · la cuenta que se usa es la del SERVIDOR, no otra',
  /await deps\.upstream\(trace\.userId, req\.upstream\)/.test(leer('functions/src/engine/gateway.ts')),
  'trace.userId lo puso el servidor al autenticar');
check('sin cuenta no se resuelve nada',
  (await resolverMaterialDeUpstream('', [DEL_GUION], puertas())).materiales.length === 0);
check('G8-F5 · una URL suelta no puede colarse: aquí solo entran identificadores',
  !/http/.test(sinComentarios(leer('functions/src/engine/referencias.ts')).split('resolverMaterialDeUpstream')[1]?.split('};')[0] ?? ''),
  'la dirección la pone la puerta al firmar, no quien llama');

console.log('\n── D · G8-F7/F8/F9 · Dónde entra, y dónde NO ──');

const entrada = upstreamEnLaEntrada(resuelto.materiales, { prompt: 'escribe la escena 2' });
check('el material entra en la entrada de EJECUCIÓN, con su propia clave',
  Array.isArray(entrada.upstream) && entrada.upstream.length === 2 && entrada.prompt === 'escribe la escena 2');
check('G8-F9 · y no se mezcla con lo demás: `prompt` sigue intacto',
  entrada.prompt === 'escribe la escena 2');
/*
 * ── ESTE GUARD SE AFINÓ EN C15c, Y NO SE AFLOJÓ ─────────────────────────────
 *
 * Decía: la palabra <upstream> no aparece en el Planner. Era una buena
 * aproximación mientras el Planner no supiera nada de fuentes, y dejó de
 * serlo cuando Brain aprendió a declarar de dónde sale el material de cada
 * paso: ahí la palabra aparece, pero como ETIQUETA DE ORIGEN.
 *
 * Lo que G8 protege no es la palabra: es que el MATERIAL RESUELTO —lo que
 * escribió otro paso, su ficha, su dirección firmada— no suba hasta la capa
 * que decide. Eso es lo que se comprueba ahora, y es más difícil de pasar.
 */
const planificacion = ['functions/src/core/planner.ts', 'functions/src/core/brain.ts']
  .map((f) => sinComentarios(leer(f))).join('\n');
check('G8-F7/F8 · el PLAN no lleva material resuelto: ni contenido, ni fichas, ni direcciones',
  !/MaterialDeUpstream|UpstreamMaterial|outputRefs|contenido/.test(planificacion),
  'la palabra puede estar; lo que otro paso escribió, no');
check('y donde aparece es SOLO como etiqueta de origen, nunca como carga',
  [...planificacion.matchAll(/upstream/gi)].every((m) => {
    const cerca = planificacion.slice(Math.max(0, m.index - 60), m.index + 30);
    return cerca.includes('from') || cerca.includes('OrigenDelMaterial');
  }),
  'declarar de dónde viene algo no es transportarlo');
check('el conductor ya NO lo mete dentro de `input`',
  !/\{ \.\.\.dispatch\.input, upstream: dispatch\.upstream \}/.test(leer('functions/src/runtime/conductor.ts'))
  && /\.\.\.\(dispatch\.upstream\.length \? \{ upstream: dispatch\.upstream \} : \{\}\)/.test(leer('functions/src/runtime/conductor.ts')),
  'ese era el defecto: una referencia cruda en el sitio de los parámetros');

console.log('\n── E · G8-F15 · Hasta el adaptador, de verdad ──');

const sonda = (mecanismo) => {
  const a = {
    id: 'probe', name: 'probe', modalities: ['text'], verification: { state: 'VERIFIED_IN_PRODUCTION' },
    models: [{ id: 'probe-1', provider: 'probe', capabilities: ['text.generate'], quality: 3, speed: 3, cost: { unit: 'call', usd: 0 } }],
    isConfigured: () => true, supports: (c) => c === 'text.generate', llamadas: [],
    async run(req) { a.llamadas.push(req); return { output: { kind: 'text', content: 'escena 2' }, usage: {}, costUSD: 0, latencyMs: 1 }; },
    ...(mecanismo ?? {}),
  };
  return a;
};
const config = { providers: {}, settings: DEFAULT_SETTINGS };
const montar = (s, puerto) => crearGateway({
  registry: crearRegistro(registroDeWee.datosDelRegistro({ probe: s }, config.providers)),
  executor: motorDelGateway.crearEjecutorDelMotor({
    adapters: { probe: s }, config: () => config, now: reloj,
    ...(puerto ? { upstream: puerto } : {}),
  }),
  tracer: callado, now: reloj,
});
const peticion = peticionDeGateway({
  jobId: 'job_g8', attemptId: 'a1', attempt: 1,
  capability: 'text.generate',
  implementation: { providerId: 'probe', modelId: 'probe-1', adapterId: 'adapter:probe' },
  input: { prompt: 'escribe la escena 2' },
  upstream: [DEL_GUION],
  trace: { traceId: 'tr_g8_0001', requestId: 'rq_g8_0001', userId: 'acc_mia' },
  mode: 'sync', idempotencyKey: 'idem_g8_0001', timeoutMs: 30_000, deadlineAt: 99_000,
});

check('el Job entrega el upstream al Gateway por SU canal, no dentro de `input`',
  igual(peticion.upstream, [DEL_GUION]) && peticion.input.upstream === undefined);

const buena = sonda();
const ok = await montar(buena, async (_c, pasos) => ({
  materiales: pasos.map((x) => ({ stepId: x.stepId, capability: x.capability, materialType: 'text', assetId: x.outputRefs[0], contenido: GUION })),
  fallos: [],
})).ejecutar(peticion);

check('G8-F15 · el adaptador recibe el material RESUELTO, con el texto dentro',
  ok.status === 'completed' && buena.llamadas[0]?.input?.upstream?.[0]?.contenido === GUION,
  ok.status === 'completed' ? 'ok' : JSON.stringify(ok.error?.details));
check('y sigue recibiendo su propio `prompt`',
  buena.llamadas[0]?.input?.prompt === 'escribe la escena 2');

const rota = sonda();
const mal = await montar(rota, async () => ({ materiales: [], fallos: [{ reason: 'material_unavailable' }] })).ejecutar(peticion);
check('si el material del paso anterior no se puede resolver, NO se ejecuta',
  mal.status === 'failed' && rota.llamadas.length === 0
  && mal.error?.details?.upstream === 'pre_execution_rejected',
  'ejecutar B sin lo que A escribió es generar otra cosa y cobrarla');

const sinPuerto = sonda();
const igualQueAntes = await montar(sinPuerto, undefined).ejecutar({ ...peticion, upstream: undefined });
check('G8-F12 · sin upstream, el comportamiento es exactamente el de antes',
  igualQueAntes.status === 'completed' && sinPuerto.llamadas[0]?.input?.upstream === undefined);

console.log('\n── F · El consumidor real ──');

check('un adaptador lo USA de verdad: no es transporte a un sitio vacío',
  /loQueEscribieronAntes\(input\.upstream\)/.test(leer('functions/src/engine/providers/deepseek.ts')));
check('y lo coloca APARTE de lo que pidió la persona, con su etiqueta',
  /Material de los pasos anteriores/.test(leer('functions/src/engine/providers/deepseek.ts')),
  'mezclarlos haría que el modelo no supiera cuál obedecer');
check('el adaptador no abre referencias: recibe el contenido ya resuelto',
  !/assetId|solicitarEntrega|leerMaterial/.test(
    (leer('functions/src/engine/providers/deepseek.ts').split('loQueEscribieronAntes')[1] ?? '').slice(0, 600)));

console.log('\n── G · G8-F13/F14/F16/F17 · Lo que no se rompió ──');

check('G8-F13 · las pistas creativas siguen llegando',
  /hints: execution\.hints/.test(leer('functions/src/engine/gateway.ts')));
check('G8-F14 · y las de continuidad también',
  /requisitosDeContinuidad = execution\.hints\?\.continuity/.test(leer('functions/src/engine/gateway.ts')));
check('G8-F16 · el Router no sabe nada de upstream',
  !/upstream/i.test(sinComentarios(leer('functions/src/core/router.ts')))
  && !/upstream/i.test(sinComentarios(leer('functions/src/router/politica.ts'))));
check('G8-F17 · Financial, Credits y Media Cloud, sin tocar',
  !/upstream/i.test(
    ['core/financial/commerce.ts', 'core/media/entrega.ts', 'credits/creditEngine.ts']
      .map((f) => leer(`functions/src/${f}`)).join('\n')));
check('G8-F18 · C13 sigue intacto: el texto se materializa igual',
  /export const materialDeTexto/.test(leer('functions/src/runtime/materializacion.ts'))
  && /export const crearMaterialDeTexto/.test(leer('functions/src/content/index.ts')));
check('el Planner NO cambió: G6a sigue pendiente',
  /if \(necesita === 'text' \|\| aportadas\.has\(necesita\)\) continue;/.test(leer('functions/src/core/planner.ts')),
  'G8 no deriva ninguna arista nueva');
check('y Brain tampoco: lo suyo es declarar, y declarar no es transportar',
  !/MaterialDeUpstream|UpstreamMaterial|outputRefs/.test(sinComentarios(leer('functions/src/core/brain.ts')))
  && /export type OrigenDelMaterial/.test(leer('functions/src/core/brain.ts')),
  'C15c le dio el vocabulario de la fuente, no el del material');
check('esta suite está en la cadena de `npm test`',
  /upstream-consumidor\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
