/*
 * A9 — LO QUE LA MISIÓN DE CIERRE Y MADURACIÓN CAMBIÓ EN EL CICLO (2026-10-07).
 *
 * Unos requisitos mal formados son una petición que corregir (CM7–CM9); el tope de pensar se aplica mientras se
 * piensa, con un cronómetro por puerto que solo sirve para pensar (CM10–CM15, CM22); y un rechazo de la frontera dice de
 * quién era lo que cruzó (CM20–CM21). Vivían al final de `algorithm-cycle`: tienen su propia suite para que aquélla
 * siga por debajo de las 1000 líneas (G3 `tamano/archivo-mil-lineas`), con los mismos nombres y la misma petición
 * sintética (su sección C), copiada y no importada, para que cada suite corra sola.
 *
 *   node functions/test/algorithm-cycle-cierre.test.mjs     (usa el compilado: `npm run build` antes)
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const lib = (p) => require_(path.resolve(here, '../lib/' + p));
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const A = lib('core/algorithm/index.js');
const { ALGORITHM_CONTRACT_VERSION } = lib('core/contracts.js');

const DIA = 86_400_000;
const T0 = 1_700_000_000_000;
const T1 = T0 + 30 * DIA;
const CAP = ['future', 'synthetic', 'capability'].join('.');
const POL = { ventanaMs: 4 * DIA };

const paso = (id, dep, cap = CAP) => ({ id, capability: cap, purpose: `p${id}`, produces: 'text', ...(dep ? { dependsOn: dep } : {}) });
const tareaDe = (cap = CAP, id = 'T') => ({ id, steps: [paso('a', undefined, cap), paso('b', ['a'], cap), paso('c', ['a'], cap), paso('d', ['b', 'c'], cap)] });
const TAREA = tareaDe();
const senalesDe = (t) => t.steps.flatMap((s) => [
  { key: 'step.latencyMs', subject: s.id, value: 300, source: 'measured', sampleSize: 20 },
  { key: 'step.costUsd', subject: s.id, value: 0.01, source: 'measured', sampleSize: 20 },
]);
const SENALES = senalesDe(TAREA);

const EVALUADOR = {
  id: 'evaluador.sintetico',
  supports: (c) => c.type.startsWith('quality.'),
  evaluate: (c, ctx) => {
    const p = ctx.resultado.outputs?.[0]?.metadata?.puntuacion;
    if (typeof p !== 'number') return undefined;
    return { status: p >= 0.8 ? 'pass' : 'fail', value: p, because: `sintético ${p}`,
      evidence: [{ claim: 'quality', supports: p >= 0.8,
        signal: { key: 'quality.sintetica', subject: c.subject, value: p, source: 'measured', sampleSize: 9 } }] };
  },
};
const ciclo = A.crearCicloAlgoritmico({ evaluadores: [EVALUADOR] });

const decisionBase = (extra = {}) => ({
  contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { latency: 1, reliability: 1 } },
  trace: { traceId: 't', requestId: 'r', userId: 'u' }, signals: SENALES, ...extra,
});
const EXPECTED = [{ kind: 'text', quality: { minScore: 0.8 } }];
const peticion = (extra = {}) => ({
  decision: decisionBase(),
  tarea: TAREA,
  expected: EXPECTED,
  aprendido: { ahora: T1, scope: { capability: CAP }, learned: [], learningPolicy: POL },
  componer: { paralelizar: true, optimizar: true },
  ...extra,
});
const soloOpciones = (extra = {}) => ({
  decision: decisionBase({ options: [
    { id: 'o1', value: { nombre: 'uno' }, values: { latency: 500, reliability: 0.9 } },
    { id: 'o2', value: { nombre: 'dos' }, values: { latency: 700, reliability: 0.99 } }] }),
  ...extra,
});

console.log('\n─── Misión de cierre · unos requisitos mal formados son una petición que corregir ───');

for (const [campo, v] of [['minConfidence', NaN], ['minConfidence', '0.9'], ['minSampleSize', NaN], ['maxAgeMs', -1]]) {
  const r = ciclo.decidir(peticion({ aprendido: { ahora: T1, scope: { capability: CAP }, learned: [], requirements: { [campo]: v } } }));
  check(`CM7 · requirements.${campo} = ${String(v)} → \`context_rejected\` (no \`context_refused\`), antes de A8 y sin decidir`,
    r.status === 'invalid' && r.parada === 'context_rejected' && r.recorrido.length === 0 && !r.decision
    && r.because.some((p) => p.includes(`requirements.${campo}`)),
    `${r.parada} · ${JSON.stringify(r.recorrido)}`);
}
for (const malos of ['x', []]) {
  const r = ciclo.decidir(peticion({ aprendido: { ahora: T1, scope: { capability: CAP }, learned: [], requirements: malos } }));
  check(`CM7b · unos requisitos que no son un objeto (${JSON.stringify(malos)}) → \`context_rejected\`, antes de A8 y sin decidir`,
    r.status === 'invalid' && r.parada === 'context_rejected' && r.recorrido.length === 0 && !r.decision
    && r.because.some((p) => p.includes('requirements: no es un objeto')),
    `${r.parada} · ${JSON.stringify(r.recorrido)}`);
}
check('CM8 · CONTROL · los mismos requisitos, bien formados, deciden como siempre',
  ciclo.decidir(peticion({ aprendido: { ahora: T1, scope: { capability: CAP }, learned: [], requirements: { minConfidence: 0, minSampleSize: 0, maxAgeMs: 1e12 } } })).status === 'decided');
check('CM9 · y `context_refused` sigue siendo lo que era: un ámbito al que A8 no contesta',
  ciclo.decidir(peticion({ aprendido: { ahora: T1, scope: { capability: CAP, account: 'u1' }, learned: [] } })).parada === 'context_refused');

console.log('\n─── Misión de cierre · el tope de pensar se aplica mientras se piensa ───');

const PET_CRONO = peticion({ aprendido: undefined });
const comoTexto = (r) => JSON.stringify(r);
const sinCrono = A.crearCicloAlgoritmico().decidir(PET_CRONO);
check('CM10 · sin cronómetro, el ciclo es byte a byte el de siempre; y con uno que no avanza, también',
  sinCrono.status === 'decided' && comoTexto(A.crearCicloAlgoritmico({ cronometro: () => 1000 }).decidir(PET_CRONO)) === comoTexto(sinCrono));
let tCM11 = 0;
const cortadoCM = A.crearCicloAlgoritmico({ cronometro: () => (tCM11 += 100) }).decidir(PET_CRONO);
check('CM11 · un razonamiento que se pasa del tope se CORTA dentro del motor: `budget_exceeded`, sin entrega, y dicho antes de qué etapa',
  cortadoCM.status === 'undecided' && cortadoCM.parada === 'budget_exceeded' && !cortadoCM.entrega
  && cortadoCM.because.some((b) => b.startsWith('Se acabó el tiempo de pensar')),
  `${cortadoCM.status}/${cortadoCM.parada} · ${JSON.stringify(cortadoCM.recorrido)} · ${String(cortadoCM.because.slice(-1)[0]).slice(0, 90)}`);
let tCM12 = 0;
const holgadoCM = A.crearCicloAlgoritmico({ cronometro: () => (tCM12 += 0.001) }).decidir(PET_CRONO);
check('CM12 · CONTROL · un reloj que avanza pero deja tiempo de sobra: decide y entrega lo mismo que sin reloj',
  holgadoCM.status === 'decided' && !!holgadoCM.entrega?.plan && holgadoCM.entrega.plan.id === sinCrono.entrega?.plan?.id,
  `${holgadoCM.status} · ${holgadoCM.entrega?.plan?.id} vs ${sinCrono.entrega?.plan?.id}`);
check('CM13 · un reloj roto —que lanza, o que no da un número finito— no tumba el razonamiento ni lo corta: como sin reloj',
  [() => { throw new Error('reloj roto'); }, () => NaN, () => Infinity, () => 'x']
    .every((c) => comoTexto(A.crearCicloAlgoritmico({ cronometro: c }).decidir(PET_CRONO)) === comoTexto(sinCrono)));
const conPlazoCM = soloOpciones({ decision: decisionBase({ constraints: { deadlineAt: 4e12 }, options: soloOpciones().decision.options }) });
let tCM14 = 0;
check('CM14 · A1 NO recibe el cronómetro: un plazo (`deadlineAt`, una FECHA) se juzga igual con y sin él —el cronómetro no es un reloj de pared—',
  comoTexto(A.crearCicloAlgoritmico({ cronometro: () => (tCM14 += 0.001) }).decidir(conPlazoCM)) === comoTexto(A.crearCicloAlgoritmico().decidir(conPlazoCM)));
const fuentesCM = fs.readdirSync(path.resolve(RAIZ, 'functions/src/core/algorithm')).filter((f) => f.endsWith('.ts'));
const conRelojCM = fuentesCM.filter((f) => /Date\.now|performance\.now|new Date\(|Math\.random|process\.hrtime/.test(sinComentarios(leer('functions/src/core/algorithm/' + f))));
check('CM15 · el motor sigue PURO: ningún archivo de core/algorithm lee un reloj ni el azar; el cronómetro solo entra por el puerto',
  fuentesCM.length >= 30 && conRelojCM.length === 0, conRelojCM.join(', '));
/*
 * El inicio se lee FRESCO (revisión de código). Un mismo ciclo decide dos veces: la primera con el reloj quieto; entre
 * las dos, el reloj salta mucho más que el tope, y la lectura del inicio de la segunda falla. Con un inicio viejo —la
 * última lectura buena, de la llamada anterior— la segunda mediría como «pensar» todo ese hueco y cortaría por error.
 */
let tCM22 = 0;
let fallaCM22 = false;
const cicloCM22 = A.crearCicloAlgoritmico({ cronometro: () => { if (fallaCM22) { fallaCM22 = false; throw new Error('lectura perdida'); } return tCM22; } });
const primeraCM22 = cicloCM22.decidir(PET_CRONO);
tCM22 = 1e9;
fallaCM22 = true;
const segundaCM22 = cicloCM22.decidir(PET_CRONO);
check('CM22 · REGRESIÓN · si la lectura del inicio falla, la llamada va sin reloj —no mide como «pensar» el hueco desde la anterior— y decide como sin cronómetro',
  comoTexto(primeraCM22) === comoTexto(sinCrono) && comoTexto(segundaCM22) === comoTexto(sinCrono),
  `${segundaCM22.status}/${segundaCM22.parada ?? '-'} · ${String(segundaCM22.because.slice(-1)[0]).slice(0, 90)}`);

console.log('\n─── Misión de cierre · un rechazo de la frontera dice de quién era lo que cruzó ───');

const cobroCM = ciclo.decidir(peticion({ aprendido: undefined, decision: decisionBase({ constraints: { billingAccount: 'b' } }) }));
check('CM20 · una cuenta de facturación en los requisitos se rechaza diciendo que es del Financial Core, no «del Router»',
  cobroCM.parada === 'authority_violation' && !cobroCM.entrega
  && cobroCM.because.some((b) => b.includes('billingAccount → Financial Core') && !b.includes('eso lo elige el Router')),
  String(cobroCM.because.slice(-1)[0]).slice(0, 140));
const proveedorCM = ciclo.decidir(peticion({ aprendido: undefined, decision: decisionBase({ constraints: { providerId: 'p' } }) }));
check('CM21 · y cuando lo que cruzó SÍ era elegir proveedor, la frase de siempre: «eso lo elige el Router»',
  proveedorCM.parada === 'authority_violation' && proveedorCM.because.some((b) => b.includes('eso lo elige el Router')));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA9 en la misión de cierre: requisitos, cronómetro y frontera, cada uno con su prueba');
process.exit(failures ? 1 : 0);
