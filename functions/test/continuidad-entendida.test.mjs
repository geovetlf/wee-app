/**
 * WEË — C24 / G17: LO QUE HAY QUE CONSERVAR, QUE SE LEÍA Y SE TIRABA.
 *
 * ── El agujero ──────────────────────────────────────────────────────────────
 *
 * `interpretarEntendimiento` sacaba la continuidad del JSON del modelo y la
 * validaba ENTERA con su contrato —vocabulario cerrado de C2—, y después el
 * ensamblado del entendimiento no la copiaba. De los catorce campos que
 * devuelve el intérprete, era el único que no leía nadie.
 *
 * ── Cómo se vio ─────────────────────────────────────────────────────────────
 *
 * En un canary real. A «una foto antigua de mi abuela… sin que ella deje de
 * parecerse a sí misma» el modelo contestó, sin que nadie se lo pidiera:
 *
 *   continuity: { preserve: ['identity.face'], subjects: ['abuela'], strength: 'strict' }
 *
 * Salía bien del modelo, salía bien del validador, y se perdía en la línea
 * siguiente. Esa respuesta literal es la que usa esta suite: no está inventada.
 *
 * ── Lo que NO cambia ────────────────────────────────────────────────────────
 *
 * Viaja con los sujetos POR SU NOMBRE, que es como el modelo los conoce.
 * Convertir «abuela» en un `elementId@version` sigue siendo del puente al
 * Planner, con los candidatos de la cuenta delante.
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

let failures = 0;
let n = 0;
const check = (name, cond, extra = '') => {
  n++;
  console.log((cond ? '✔ ' : '✘ ') + `${n} · ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const core = lib('core/index.js');
const { CAPABILITY_CATALOG, PLANNER_CONTRACT_VERSION } = core;
const { crearPlannerDeWee, disponibilidadDe, entendimientoParaPlanificar } = lib('planner/index.js');
const ROUTABLES = CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE').map((c) => c.id);

/* La respuesta LITERAL del canary de Photo de C22. */
const DEL_MODELO = {
  version: 1, intent: 'edit', confidence: 1.0,
  goal: 'Restaurar una fotografía antigua dañada manteniendo la identidad de la persona.',
  capability: 'image.edit', capabilities: ['image.edit'],
  steps: [{ key: 'restore_photo', capability: 'image.edit', input: { kind: 'restore', brief: 'Restaurar los daños físicos de la fotografía antigua.' } }],
  context: [{ kind: 'asset', assetKind: 'image', required: true }],
  continuity: { preserve: ['identity.face'], subjects: ['abuela'], strength: 'strict' },
  suggestedExperience: 'photo',
};
const LA_ABUELA = [{ elementId: 'el_abuela_0001', name: 'abuela', version: 2, status: 'active' }];

const entender = async (json, exps = ['photo']) => {
  const cerebro = core.crearBrain({
    thinker: { async pensar() { return { response: { kind: 'text', content: JSON.stringify(json), actual: { provider: { lines: [], usd: 0 }, latencyMs: 1 }, model: 'de-prueba' }, usage: { totalTokens: 9 } }; } },
    tracer: { async record() {} }, now: () => 1000, experiences: exps,
  });
  return cerebro.entender({
    contract: '1.0',
    trace: { traceId: 'c24_0001', requestId: 'c24_0001', userId: 'canary_c24', sessionId: 'chat_c24', runId: 'chat_c24', stepId: 'm_0001' },
    message: { text: 'restaura esta foto de mi abuela' },
    options: { mode: 'understand' },
  });
};
const planear = (u, candidatos = []) =>
  crearPlannerDeWee({ availability: disponibilidadDe(ROUTABLES), tracer: { record() {} }, now: () => 1000 })
    .planificar({
      contract: PLANNER_CONTRACT_VERSION,
      trace: { traceId: 'c24_0002', requestId: 'c24_0002', userId: 'canary_c24' },
      understanding: entendimientoParaPlanificar(u, candidatos),
    });

console.log('\n── A · La continuidad llega ──');

const r = await entender(DEL_MODELO);
check('G17 · lo que el modelo declaró sobrevive al ensamblado',
  igual(r.understanding?.continuity, { preserve: ['identity.face'], strength: 'strict', subjects: ['abuela'] }),
  JSON.stringify(r.understanding?.continuity ?? null));
check('y llega con el SUJETO POR SU NOMBRE, sin resolver',
  r.understanding?.continuity?.subjects?.[0] === 'abuela'
  && !JSON.stringify(r.understanding?.continuity ?? {}).includes('elementId'),
  'resolver el nombre es de otra capa, y sigue siéndolo');
check('sin continuidad declarada, el campo sigue ausente: no se inventa',
  (await entender({ ...DEL_MODELO, continuity: undefined })).understanding?.continuity === undefined);
check('una continuidad a medias se descarta entera, como siempre',
  (await entender({ ...DEL_MODELO, continuity: { preserve: ['no.existe'], strength: 'inventada' } })).understanding?.continuity === undefined,
  'entero o nada: media intención es una intención distinta');

console.log('\n── B · De ahí al paso del plan ──');

const conAncla = entendimientoParaPlanificar(r.understanding, LA_ABUELA);
check('el puente resuelve «abuela» a `elementId@version`',
  igual(conAncla.preferences?.continuity?.anchors, [{ elementId: 'el_abuela_0001', version: 2 }]),
  JSON.stringify(conAncla.preferences?.continuity ?? null));
check('sin candidatos, viaja sin ancla en vez de inventarse una',
  entendimientoParaPlanificar(r.understanding).preferences?.continuity?.anchors === undefined
  && entendimientoParaPlanificar(r.understanding).preferences?.continuity?.strength === 'strict',
  JSON.stringify(entendimientoParaPlanificar(r.understanding).preferences?.continuity ?? null));

const plan = await planear({
  ...r.understanding,
  steps: r.understanding.steps.map((s) => ({ ...s, needs: [{ from: 'user', modality: 'image', required: true }] })),
  inputs: { text: 'restaura', attachments: [{ kind: 'image', assetId: 'as_abuela' }] },
}, LA_ABUELA);
check('y acaba en las pistas del paso, que es donde el Gateway la lee',
  plan.status === 'ready'
  && igual(plan.plan?.steps?.[0]?.hints?.continuity, {
    preserve: ['identity.face'], anchors: [{ elementId: 'el_abuela_0001', version: 2 }], strength: 'strict',
  }),
  plan.status === 'ready' ? JSON.stringify(plan.plan.steps[0].hints?.continuity ?? null) : plan.status);

console.log('\n── C · Lo que no se ha tocado ──');

const cerebro = leer('functions/src/core/brain.ts');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
check('la continuidad sigue siendo su propio contrato: ni se copia ni se duplica',
  /continuity: leerIntencionDeContinuidad\(crudo\.continuity\)/.test(cerebro)
  && !/interface .*Continuity|type .*Continuity/.test(sinComentarios(cerebro)),
  '`leerIntencionDeContinuidad` la valida entera, como antes');
check('NO entra en el input del paso: sigue en `hints`',
  plan.plan?.steps?.[0]?.input?.continuity === undefined
  && !/continuity/.test((leer('functions/src/core/planner.ts').match(/const entradaDelPaso[\s\S]*?\n\};/) ?? [''])[0]));
check('el modelo no elige proveedor por declararla',
  !/providerId|modelId/.test(JSON.stringify(r.understanding)));
check('los otros trece campos del intérprete siguen llegando igual',
  r.understanding?.intent === 'edit' && r.understanding?.capability === 'image.edit'
  && r.understanding?.steps?.length === 1 && r.understanding?.context?.length === 1
  && r.understanding?.goal?.startsWith('Restaurar'),
  'intent · capability · steps · context · goal');
check('G19 no se ha tocado: las 53 variantes siguen con su significado',
  CAPABILITY_CATALOG.filter((c) => c.variants?.length).flatMap((c) => c.variants).length === 53
  && CAPABILITY_CATALOG.filter((c) => c.variants?.length).flatMap((c) => c.variants).every((v) => v.description));
check('B3 sigue abierto: `creator/planner.ts` intacto',
  /template\.buildPlan\(goal, record\)/.test(leer('functions/src/creator/planner.ts'))
  && !/crearPlannerDeWee/.test(leer('functions/src/creator/planner.ts')));
check('esta suite está en la cadena de `npm test`',
  /continuidad-entendida\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
