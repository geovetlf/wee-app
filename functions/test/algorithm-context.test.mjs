/*
 * A8 — CONTEXTO: QUÉ DE LO APRENDIDO LE SIRVE A UNA DECISIÓN.
 *
 *   APRENDER A LO ANCHO. USAR A LO ESTRECHO. NUNCA INVENTAR EVIDENCIA.
 *
 * A8 SELECCIONA, FILTRA, CLASIFICA Y EMPAQUETA. No decide la acción.
 *
 *  A. Quién es.
 *  B. No duplica: reutiliza A0, A1 y A7.
 *  C. Ámbito.
 *  D. Relevancia por eje, con el objetivo en vigor.
 *  E. Consumidor: se informa, no filtra.
 *  F. CADA GUARDA SOLA: la regla que salió de A6 y A7.
 *  G. Frescura, ventana y muestra no son lo mismo.
 *  H. Confianza e incertidumbre.
 *  I. Contradicción y tendencia: se transportan, no se eligen.
 *  J. Deduplicación.
 *  K. Orden.
 *  L. Presupuesto y cotas.
 *  M. Sin evidencia, evidencia insuficiente, desconocido.
 *  N. Privacidad.
 *  O. Autoridad.
 *  P. Agnosticismo de capacidad y de proveedor.
 *  Q. Determinismo.
 *  R. Contratos de integración: A7 → A8 → A1, A5, A6.
 *  S. Sabotajes de entrada.
 *  U. Contrato 1.6: el reloj, la rejilla y la privacidad de A7, consumidos tal cual.
 *  V. A9.1: A8 filtra, no decide implementación.
 *  T. Rendimiento.
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
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const tokens = (src) => new Set((sinComentarios(src).toLowerCase().match(/[a-z0-9_]+/g) ?? []));

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const A = lib('core/algorithm/index.js');
const { ALGORITHM_CONTRACT_VERSION, contratoCompatible } = lib('core/contracts.js');
const a8 = A.crearMotorDeContexto();
const a7 = A.crearMotorDeFeedback();

const HORA = 3_600_000;
const DIA = 86_400_000;
const T0 = 1_700_000_000_000;
const AHORA = T0 + 60 * DIA;
const VENT = 4 * DIA;
const FUENTES = ['context.ts', 'context-engine.ts'].map((f) => `functions/src/core/algorithm/${f}`);

/*
 * UN AGREGADO CONSTRUIDO A MANO, con `acumular` de A7: control total para
 * poder romper UNA cosa y solo una. Por defecto pasa TODAS las guardas:
 * 40 observaciones medidas, explícitas, con evidencia, estables, frescas.
 */
const agregado = ({
  metric = 'result.latencyMs', scope = { capability: 'x.y' }, n: cuantas = 40,
  valor = 800, valorTardio, fuente = 'measured', explicito = true, conEvidencia = true,
  contrarias = 0, hasta = AHORA,
} = {}) => {
  const ini = hasta - VENT + HORA;
  let a = A.agregadoVacio(A.claveDeAmbito(scope, metric), metric, scope);
  for (let i = 0; i < cuantas; i++) {
    const at = Math.round(ini + (hasta - ini) * (i / Math.max(1, cuantas - 1)));
    const v = valorTardio !== undefined && i >= cuantas / 2 ? valorTardio : valor;
    const s = { key: metric, value: v, source: fuente, at };
    const apoya = i >= contrarias;
    a = A.acumular(a, {
      value: v, at, favorable: apoya, signal: s, implicito: !explicito,
      ...(conEvidencia ? { evidence: { claim: metric, signal: s, supports: apoya } } : {}),
    }, hasta, VENT);
  }
  return a;
};
const BASE = { ahora: AHORA, scope: { capability: 'x.y' }, objective: { weights: { latency: 1 } } };
const sel = (learned, extra = {}, motor = a8) => motor.seleccionar({ ...BASE, learned, ...extra });
const una = (a, extra = {}, motor = a8) => sel([a], extra, motor).admisiones[0];

console.log('\n─── A. Quién es ───');

check('1 · su descriptor vale, puro y EXPERIMENTAL: nadie lo elige solo',
  A.algoritmoValido(A.DESCRIPTOR_DE_CONTEXTO) && A.DESCRIPTOR_DE_CONTEXTO.purity === 'pure' &&
  A.crearRegistroDeAlgoritmos([A.DESCRIPTOR_DE_CONTEXTO]).registro.seleccionable(A.CONTEXT_ENGINE_ID) === false,
  JSON.stringify(A.validarAlgoritmo(A.DESCRIPTOR_DE_CONTEXTO)));
check('2 · es de la familia que PRODUCE SEÑALES para otros, nunca decide por ellos',
  A.DESCRIPTOR_DE_CONTEXTO.category === 'routing-signals');
check('3 · A8 NO sube el contrato: consume el 1.6 de A7 y solo añade tipos suyos',
  contratoCompatible(ALGORITHM_CONTRACT_VERSION, '1.6') && !/\(A8\)/.test(leer('functions/src/core/contracts.ts')),
  ALGORITHM_CONTRACT_VERSION);

console.log('\n─── B. No duplica: reutiliza A0, A1 y A7 ───');

const src8 = FUENTES.map((f) => sinComentarios(leer(f))).join('\n');
for (const [que, usa] of [
  ['las guardas de A7', 'guardas('], ['la confianza de A7', 'confianzaDeAgregado('],
  ['la frescura de A7/A0', 'frescuraDe('], ['la tendencia de A7', 'tendenciaDe('],
  ['la HistoryWindow de A1 vía A7', 'ventanaDe('], ['la lista de dimensiones de A7', 'ORDEN_DE_CLAVE'],
  ['la reducción de ámbito de A7', 'ambitoAgregable('], ['los pesos de A0', 'pesosNormalizados('],
  ['la regla del reloj de A7', 'motivoDeReloj('], ['la puerta de persona de A7', 'campoDePersonaEnAmbito('],
]) check(`4 · reutiliza ${que}`, src8.includes(usa));
for (const [que, prohibido] of [
  ['otra decadencia', /Math\.exp|decay\s*=|semivida/], ['otra HistoryWindow', /interface\s+HistoryWindow/],
  ['otra lista de ámbito', /CAMPOS_DE_AMBITO/], ['otra confianza', /confidenceV2|interface\s+Confidence\b/],
  ['una copia de «¿hay pesos?»', /declaroPesos/], ['su propio saneado de ámbito', /ambitoDeClave/],
  ['su propia rejilla temporal', /tramoDe|finDeTramo|tramosHasta|\.tramos\[/], ['su propia frescura', /\bfrescura\(/],
  ['su propia lista de persona', /CAMPOS_DE_PERSONA/], ['un reloj por defecto', /ahora\s*:\s*0\b/],
]) check(`5 · y NO trae ${que}`, !prohibido.test(src8));
const agBase = agregado();
check('6 · su confianza ES la de A7, no una parecida',
  igual(una(agBase).confidence, A.confianzaDeAgregado(agBase, AHORA, A.politicaEfectiva())));
check('7 · y su frescura ES la de A7',
  una(agBase).freshness === A.frescuraDe(agBase, AHORA, A.politicaEfectiva().vidaMs));

console.log('\n─── C. Ámbito ───');

const E = (s) => A.encajeDeAmbito(s, { capability: 'x.y', providerId: 'p1' });
check('8 · mismo ámbito → exacto', E({ capability: 'x.y', providerId: 'p1' }) === 'exact');
check('9 · más concreto que la decisión → sirve', A.encajeDeAmbito({ capability: 'x.y', providerId: 'p1' }, { capability: 'x.y' }) === 'narrower');
check('10 · más general que la decisión → no sirve por defecto', E({ capability: 'x.y' }) === 'broader');
check('11 · hablan de otra cosa → conflicto', E({ capability: 'otra', providerId: 'p1' }) === 'conflict');
check('12 · más concreto en un campo y más general en otro es otra cosa: conflicto',
  E({ capability: 'x.y', modelId: 'm1' }) === 'conflict');
check('13 · lo GLOBAL no contamina lo concreto sin regla de transferencia',
  una(agregado({ scope: {} })).status === 'out_of_scope');
check('14 · y la regla de transferencia es EXPLÍCITA',
  una(agregado({ scope: {} }), { requirements: { allowBroaderScope: true } }).status === 'admitted');
check('15 · no hay ámbitos REQUEST ni SESSION: ninguna evidencia aprendida los lleva',
  !A.ORDEN_DE_CLAVE.includes('requestId') && !A.ORDEN_DE_CLAVE.includes('sessionId'));

console.log('\n─── D. Relevancia por eje, con el objetivo en vigor ───');

check('16 · la latencia es relevante para una decisión que optimiza latencia',
  una(agBase).axisMatch === 'match');
check('17 · otro eje queda fuera, con su motivo',
  una(agBase, { objective: { weights: { cost: 1 } } }).axisMatch === 'other_axis');
const satis = agregado({ metric: 'feedback.satisfaction', valor: 1 });
check('18 · OPCIÓN (a): sin objetivo rige el de A0, como en A1 y A5 — y sin excepción de A8',
  una(satis, { objective: undefined }).status === 'out_of_scope' &&
  una(satis, { objective: undefined }).because.includes('axis_not_in_objective'),
  `userValue no está en ${Object.keys(A.OBJETIVO_POR_DEFECTO.weights).join(',')}`);
check('19 · y un objetivo vacío lee lo mismo que A0: el de por defecto',
  igual(una(satis, { objective: { weights: {} } }), una(satis, { objective: undefined })));
check('20 · pedir el eje lo hace relevante: userValue declarado',
  una(satis, { objective: { weights: { userValue: 1 } } }).status === 'admitted');
check('21 · la relevancia sale de campos estructurados, no de texto',
  !/includes\(['"`]lat|match\(\/|keyword|similar/.test(src8));
check('22 · un eje para una métrica futura se declara sin tocar el motor',
  una(agregado({ metric: 'metrica.nueva' }), { ejes: { 'metrica.nueva': 'latency' } },
    A.crearMotorDeContexto({ metricas: [{ key: 'metrica.nueva', mejor: 'baja', target: 'none', risk: 'bajo' }] })).status === 'admitted');
check('23 · la tabla de ejes cubre TODAS las métricas base de A7: no puede desincronizarse',
  A.METRICAS_BASE.every((d) => typeof A.EJE_DE_METRICA[d.key] === 'string'),
  A.METRICAS_BASE.filter((d) => !A.EJE_DE_METRICA[d.key]).map((d) => d.key).join(',') || 'todas');
check('24 · no hay un número de relevancia fabricado: van los componentes por separado',
  ['scopeMatch', 'axisMatch', 'consumerMatch', 'freshness', 'confidence'].every((k) => k in una(agBase)) &&
  !('relevance' in una(agBase)) && !('score' in una(agBase)));

console.log('\n─── E. Consumidor: se informa, no filtra ───');

check('25 · un consumidor distinto al previsto por A7 NO pierde la evidencia',
  una(agBase, { consumer: 'strategy' }).consumerMatch === 'other_consumer' &&
  una(agBase, { consumer: 'strategy' }).status === 'admitted');
check('26 · y el previsto se marca como tal', una(agBase, { consumer: 'router' }).consumerMatch === 'match');

console.log('\n─── F. CADA GUARDA SOLA ───');

/*
 * La regla que salió de A6 y A7: una guarda solo está probada si hay un caso
 * donde es LA ÚNICA que puede caer. El de control pasa todas; cada variante
 * rompe exactamente una, y su motivo tiene que ser el único.
 */
check('27 · CONTROL · el agregado base pasa todas las guardas', una(agBase).status === 'admitted' && una(agBase).because.length === 0,
  JSON.stringify(una(agBase).because));
const SOLA = [
  ['A8 · la decisión no admite algo tan viejo', agregado({ hasta: AHORA - 2 * DIA }), { requirements: { maxAgeMs: DIA } }, 'older_than_decision_allows', 'stale'],
  ['A8 · la decisión exige más confianza', agregado({ fuente: 'catalog' }), { requirements: { minConfidence: 0.9 } }, 'below_decision_confidence', 'insufficient'],
  ['A8 · la decisión exige más muestra', agBase, { requirements: { minSampleSize: 100 } }, 'below_decision_sample', 'insufficient'],
  ['A7 · muestra por debajo del mínimo', agregado({ n: 20 }), {}, 'sample_below_minimum', 'insufficient'],
  ['A7 · evidencia contradictoria', agregado({ contrarias: 16 }), {}, 'evidence_contradictory', 'conflicted'],
  ['A7 · inestable a lo largo de la ventana', agregado({ valor: 500, valorTardio: 3000 }), {}, 'unstable_across_window', 'conflicted'],
  ['A7 · solo gestos implícitos', agregado({ explicito: false }), {}, 'implicit_only', 'insufficient'],
  ['A7 · un número sin nada que lo sostenga', agregado({ conEvidencia: false }), {}, 'uncertainty_too_high', 'insufficient'],
  ['ámbito · habla de otra capacidad', agregado({ scope: { capability: 'otra' } }), {}, 'scope_conflict', 'out_of_scope'],
  ['ámbito · más general sin permiso', agBase, { scope: { capability: 'x.y', providerId: 'p1' } }, 'scope_broader_than_decision', 'out_of_scope'],
  ['eje · fuera del objetivo', agBase, { objective: { weights: { cost: 1 } } }, 'axis_not_in_objective', 'out_of_scope'],
  ['eje · la métrica no tiene eje', agregado({ metric: 'metrica.nueva' }), { __motor: A.crearMotorDeContexto({ metricas: [{ key: 'metrica.nueva', mejor: 'baja', target: 'none', risk: 'bajo' }] }) }, 'axis_unknown', 'unknown'],
  ['métrica · sin descriptor', agregado({ metric: 'metrica.nueva' }), { ejes: { 'metrica.nueva': 'latency' } }, 'metric_not_interpretable', 'unknown'],
  ['privacidad · campo que no es dimensión', { ...agBase, scope: { ...agBase.scope, account: 'u1' } }, {}, 'scope_not_aggregable', 'filtered'],
  ['forma · agregado mal formado', { ...agBase, tramos: undefined }, {}, 'malformed', 'filtered'],
];
for (const [que, ag, extra, motivo, estado] of SOLA) {
  const { __motor, ...resto } = extra;
  const x = una(ag, resto, __motor ?? a8);
  check(`28 · SOLA · ${que} → «${motivo}» y NADA más`,
    x.status === estado && igual([...x.because], [motivo]), `${x.status} ${JSON.stringify(x.because)}`);
}
/* La caducidad de A7 va unida a la confianza —la frescura entra en ella—, así
 * que NO se puede aislar: se prueba que manda el estado correcto. La que A8 sí
 * aísla es la suya, `maxAgeMs`, arriba. */
const rancio = una(agregado({ hasta: AHORA - 35 * DIA }));
check('29 · la caducidad de A7 manda sobre la confianza que arrastra: estado `stale`',
  rancio.status === 'stale' && rancio.because.includes('evidence_stale'), JSON.stringify(rancio.because));
check('30 · CONTROL · y cada variante recupera la admisión al quitar su motivo',
  una(agregado({ scope: { capability: 'otra' } }), { scope: { capability: 'otra' } }).status === 'admitted' &&
  una(agregado({ explicito: false }), { learningPolicy: { permitirSoloImplicito: true } }).status === 'admitted');

console.log('\n─── G. Frescura, ventana y muestra no son lo mismo ───');

const ancho = (() => {
  /* Primera observación hace 50 días, última ahora: ventana ANCHA, y fresco. */
  let a = A.agregadoVacio(A.claveDeAmbito({ capability: 'x.y' }, 'result.latencyMs'), 'result.latencyMs', { capability: 'x.y' });
  for (let i = 0; i < 40; i++) {
    const at = AHORA - 50 * DIA + Math.round((50 * DIA) * (i / 39));
    const s = { key: 'result.latencyMs', value: 800, source: 'measured', at };
    a = A.acumular(a, { value: 800, at, favorable: true, signal: s, evidence: { claim: 'x', signal: s, supports: true }, implicito: false }, AHORA, 60 * DIA);
  }
  return a;
})();
check('31 · una ventana histórica ANCHA puede estar perfectamente fresca',
  una(ancho).freshness === 1 && AHORA - ancho.primero === 50 * DIA, `primero hace ${(AHORA - ancho.primero) / DIA} días, frescura ${una(ancho).freshness}`);
check('32 · la frescura sale de la ÚLTIMA observación, la muestra de todas',
  una(ancho).sampleSize === 40 && una(ancho).lastObservedAt === AHORA);
check('33 · no hay ventanas con nombre: la decisión declara su propio `maxAgeMs`',
  !/['"]recent['"]|['"]short['"]|['"]medium['"]|['"]long['"]/.test(src8));

console.log('\n─── H. Confianza e incertidumbre ───');

check('34 · no inventa confianza: sin observaciones, cero y dicho',
  una({ ...agBase, n: 0 }).confidence.value === 0);
check('35 · la incertidumbre sale de la confianza con la escala de siempre',
  una(agBase).uncertainty === A.incertidumbreDeAgregado(una(agBase).confidence));
/*
 * Y SE TRANSPORTA TAL CUAL. La 35 sola no lo demostraba: su caso es `known`, y
 * un A8 que dijera «known» de todo la pasaba igual —el sabotaje S04 lo probó—.
 * Aquí, tres niveles que NO son `known`, cada uno el que A7 calcula.
 */
const NIVELES = [[agregado({ fuente: 'catalog' }), 'probable'], [agregado({ fuente: 'model' }), 'uncertain'],
  [agregado({ conEvidencia: false }), 'unknown']];
check('35c · la incertidumbre se TRANSPORTA: probable, incierta y desconocida salen como son, nunca «known»',
  NIVELES.every(([ag, esperada]) => una(ag).uncertainty === esperada &&
    una(ag).uncertainty === A.incertidumbreDeAgregado(una(ag).confidence)),
  NIVELES.map(([ag]) => una(ag).uncertainty).join(' · '));
check('35b · lo que sale de A8 es `derived`, nunca `measured`: señales y evidencia, aunque entrara medido',
  agBase.muestraDeApoyo.every((e) => e.signal.source === 'measured') &&
  sel([agBase]).signals.length === 1 && sel([agBase]).signals.every((s) => s.source === 'derived') &&
  sel([agBase]).evidence.every((e) => e.signal.source === 'derived'),
  'presentarlo como medido lo colaría por delante de un dato real en `resolverSenales`');
check('36 · lo no declarado se INFORMA y no descarta: la regla de `minConfidence`',
  una(agregado({ fuente: 'catalog' })).status === 'admitted' && una(agregado({ fuente: 'catalog' })).confidence.value < 0.9);

console.log('\n─── I. Contradicción y tendencia: se transportan, no se eligen ───');

const conContra = una(agregado({ contrarias: 16 }));
check('37 · a favor y en contra van CONTADOS, no resumidos', conContra.supporting === 24 && conContra.contradicting === 16);
const degradando = una(agregado({ valor: 500, valorTardio: 3000 }), { learningPolicy: { minStability: 0 } });
check('38 · una degradación se ENTREGA como tal, sin decidir qué hacer con ella',
  degradando.trend === 'degrading' && degradando.status === 'admitted',
  'el consumidor decide; A8 organiza');
check('39 · y la tendencia la calcula A7: la misma, no una parecida',
  degradando.trend === A.tendenciaDe(agregado({ valor: 500, valorTardio: 3000 }), 'baja', A.politicaEfectiva({ minStability: 0 })));

console.log('\n─── J. Deduplicación ───');

const viejo = agregado({ hasta: AHORA - 3 * DIA });
const nuevo = agregado({ hasta: AHORA });
const dup = sel([viejo, nuevo]);
check('40 · la misma clave dos veces es UNA admisión', dup.admisiones.length === 1 && dup.metricas.duplicadas === 1);
check('41 · se queda la foto MÁS RECIENTE, llegue en el orden que llegue',
  sel([viejo, nuevo]).admisiones[0].lastObservedAt === nuevo.ultimo &&
  sel([nuevo, viejo]).admisiones[0].lastObservedAt === nuevo.ultimo);
check('42 · la identidad es la clave natural de A7, sin hash',
  dup.admisiones[0].key === nuevo.key && !/hash|\bsha(1|224|256|384|512)?\b|digest/i.test(src8));

console.log('\n─── K. Orden ───');

const varios = ['zeta', 'media', 'alfa'].map((c) => agregado({ scope: { capability: c } }));
const ord = sel(varios, { scope: {}, requirements: { allowBroaderScope: true } });
check('43 · orden CANÓNICO por clave, no por llegada',
  igual(ord.admisiones.map((x) => x.scope.capability), ['alfa', 'media', 'zeta']));
const rapido = agregado({ scope: { capability: 'x.y', providerId: 'a-lento' }, valor: 9000 });
const lento = agregado({ scope: { capability: 'x.y', providerId: 'z-rapido' }, valor: 100 });
const ruta = A.paraRouter(sel([lento, rapido]));
check('44 · NUNCA por calidad: el más rápido no sale primero por serlo',
  igual(ruta.map((g) => g.providerId), ['a-lento', 'z-rapido']),
  'ordenar proveedores por rendimiento ya sería elegir');

console.log('\n─── L. Presupuesto y cotas ───');

const muchos = Array.from({ length: 2000 }, (_, i) => ({ ...agBase, key: `result.latencyMs|capability=c${i}`, scope: { capability: `c${i}` } }));
const acotado = sel(muchos, { budget: { maxEvidence: 50 } });
check('45 · el tope corta y lo dice', acotado.metricas.evaluadas === 50 && acotado.metricas.budgetExhausted === true);
check('46 · ni declarando más se pasa del techo de A0',
  sel(muchos, { budget: { maxEvidence: 999_999 } }).metricas.evaluadas <= A.TOPES_MAXIMOS.maxEvidence);
check('47 · lo que sale nunca es más que lo que se evaluó',
  acotado.admisiones.length <= acotado.metricas.evaluadas && acotado.signals.length <= acotado.admisiones.length);

console.log('\n─── M. Sin evidencia, insuficiente, desconocido ───');

check('48 · sin nada → `no_evidence`, y no se inventa ninguna', sel([]).cierre === 'no_evidence' && sel([]).signals.length === 0);
check('49 · llega y nada alcanza → `insufficient_evidence`', sel([agregado({ n: 20 })]).cierre === 'insufficient_evidence');
check('50 · llega y nada se sabe leer → `unknown`',
  sel([agregado({ metric: 'metrica.nueva' })], { ejes: { 'metrica.nueva': 'latency' } }).cierre === 'unknown');
check('51 · ninguna de esas respuestas es un proveedor de respaldo: A8 no tiene ese recurso',
  !/fallback|respaldo|porDefecto.*provider/i.test(src8));

console.log('\n─── N. Privacidad ───');

const porCuenta = sel([agBase], { scope: { capability: 'x.y', account: 'u1' } });
check('52 · una decisión POR CUENTA no se contesta: el aprendizaje por cuenta está bloqueado',
  porCuenta.cierre === 'unknown' && porCuenta.admisiones.length === 0 && /bloqueado/.test(porCuenta.because.join(' ')));
check('53 · y no se ensancha en silencio a la evidencia de toda la capacidad',
  porCuenta.signals.length === 0 && Object.keys(porCuenta.history).length === 0);
const conIds = sel([{ ...agBase, scope: { ...agBase.scope, account: 'MARCA_A', jobId: 'MARCA_J' } }]);
check('54 · un agregado con identificadores se FILTRA y se dice, no se limpia a escondidas',
  conIds.admisiones[0].status === 'filtered' && conIds.admisiones[0].because.includes('scope_not_aggregable'));
check('55 · y ningún identificador sale de A8 por ningún lado',
  !/MARCA_/.test(JSON.stringify(conIds)));
const conPais = una({ ...agBase, scope: { ...agBase.scope, country: 'PE' } });
check('56 · un campo de persona se FILTRA y se dice COMO TAL: `privacy_scope`',
  conPais.status === 'filtered' && conPais.because.includes('privacy_scope'), JSON.stringify(conPais.because));
check('56b · y HOY también `scope_not_aggregable`, porque ningún campo de persona es una dimensión',
  conPais.because.includes('scope_not_aggregable') &&
  A.ORDEN_DE_CLAVE.filter((k) => A.CAMPOS_DE_PERSONA.has(String(k).toLowerCase())).length === 0,
  'si alguien mete uno en la clave, esta cae y 56 sigue en pie: defensa en profundidad');
check('56c · la lista de persona ENTERA, uno a uno, sale por `privacy_scope`',
  [...A.CAMPOS_DE_PERSONA].every((k) => una({ ...agBase, scope: { ...agBase.scope, [k]: 'x' } }).because.includes('privacy_scope')));
check('56d · CONTROL · una cuenta no es un campo de persona: solo `scope_not_aggregable`',
  igual([...una({ ...agBase, scope: { ...agBase.scope, account: 'u1' } }).because], ['scope_not_aggregable']));
const decisionConPais = sel([agBase], { scope: { capability: 'x.y', country: 'PE' } });
check('56e · una DECISIÓN con un campo de persona no se contesta, y se dice que es de persona',
  decisionConPais.cierre === 'unknown' && decisionConPais.admisiones.length === 0 &&
  /campo de persona/.test(decisionConPais.because.join(' ')), decisionConPais.because.join(' '));
check('56f · y el valor no sale por ningún lado',
  !/MARCA_PERSONA/.test(JSON.stringify([sel([{ ...agBase, scope: { ...agBase.scope, city: 'MARCA_PERSONA' } }]),
    sel([agBase], { scope: { capability: 'x.y', city: 'MARCA_PERSONA' } })])));
check('57 · no hay perfiles: nada en A8 agrupa por cuenta',
  !/account/.test(src8.replace(/'account'/g, '')));

console.log('\n─── O. Autoridad ───');

for (const [que, palabras] of [
  ['no elige proveedor', ['selectedProvider', 'elegirProveedor', 'mejorProveedor', 'RoutingDecision', 'crearRouter']],
  ['no muta ninguna política', ['aplicarPolitica', 'mutarPolitica', 'RouterPolicy', 'POLITICA_POR_DEFECTO =']],
  ['no planifica ni piensa', ['crearPlanner', 'crearBrain', 'PlannerResponse']],
  ['no ejecuta', ['crearJob', 'enqueue', 'dispatch(', 'await ', 'Promise.']],
  ['no cobra ni guarda materiales', ['spendCredits', 'creditsBalance', 'createAsset']],
  ['no toca la red, ni Firestore, ni secretos', ['fetch(', 'firebase', 'firestore', 'process.env', 'defineSecret']],
  ['no llama a ningún modelo', ['generateContent', 'chat.completions', 'anthropic', 'openai']],
  ['no tira dados ni lee relojes', ['Math.random', 'Date.now', 'new Date(']],
]) {
  const donde = palabras.filter((w) => src8.includes(w));
  check(`58 · ${que}`, donde.length === 0, donde.join(',') || 'nada');
}
check('59 · no importa nada de fuera del Core',
  FUENTES.every((f) => [...sinComentarios(leer(f)).matchAll(/from '([^']+)'/g)].map((m) => m[1]).every((r) => r.startsWith('.'))));
check('60 · nadie ha conectado A8 a producción', (() => {
  const recorrer = (dir, out = []) => {
    for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
      const h = dir + '/' + e.name;
      if (e.isDirectory()) recorrer(h, out); else if (/\.ts$/.test(e.name)) out.push(h);
    }
    return out;
  };
  const prod = ['creator', 'runtime', 'engine', 'gateway', 'credits', 'content', 'job'].flatMap((d) => recorrer('functions/src/' + d));
  return prod.length > 50 && prod.filter((f) => /context-engine|crearMotorDeContexto/.test(leer(f))).length === 0;
})());
check('61 · el puerto de A1 NO le pasa señales: su `evidenciaDeOpcion` subiría la confianza de lo malo',
  igual(Object.keys(A.paraDecision(sel([agBase], { scope: { capability: 'x.y' } }))), ['history']));

console.log('\n─── P. Agnosticismo de capacidad y de proveedor ───');

const CAPACIDADES = ['image.generate', 'video.generate', 'voice.tts', 'text.generate', 'music.generate',
  'lipsync', 'face_swap', '3d_generation', 'document_analysis', ['future', 'capability', 'x' + (6 * 7)].join('.')];
let todas = 0; const fallan = [];
for (const cap of CAPACIDADES) {
  const x = una(agregado({ scope: { capability: cap, providerId: `prov_${cap}` } }), { scope: { capability: cap } });
  if (x.status === 'admitted' && x.scopeMatch === 'narrower') todas++; else fallan.push(`${cap}:${x.status}`);
}
check('62 · diez capacidades —nueve de hoy y una inventada— se tratan igual', todas === 10, fallan.join(',') || 'las diez');
const t8 = tokens(FUENTES.map(leer).join('\n'));
const NOMBRES = ['gemini', 'deepseek', 'seedance', 'elevenlabs', 'minimax', 'openai', 'claude', 'flux', 'seedream',
  'lipsync', 'face_swap', 'talking_avatar', 'document_analysis', 'music', 'video', 'image', 'voice'];
check('63 · ni una capacidad, proveedor ni modelo nombrados en el núcleo de A8',
  NOMBRES.filter((x) => t8.has(x)).length === 0, NOMBRES.filter((x) => t8.has(x)).join(',') || 'ninguno');
check('64 · CONTROL · y el detector sí los caza cuando están',
  tokens("const x = 'seedance';").has('seedance'));
/*
 * UNA RAMA POR CAPACIDAD, PROVEEDOR O MODELO, se escriba como se escriba. Es la
 * guarda de A9 (82b): la de antes era `if\s*\([^)]*…===` y no cruzaba un
 * paréntesis —un cast delante del campo bastaba para esconder la rama—.
 */
const DIMENSION = '(?:capability|providerId|provider|modelId|model)';
const FORMAS_DE_RAMA = [
  new RegExp(`\\b${DIMENSION}\\b\\s*\\)*\\s*[!=]==?\\s*['"\`]`),
  new RegExp(`['"\`][^'"\`\\n]*['"\`]\\s*[!=]==?\\s*[\\w.?()\\s]*\\b${DIMENSION}\\b`),
  new RegExp(`switch\\s*\\((?:[^()]|\\([^()]*\\))*\\b${DIMENSION}\\b`),
  new RegExp(`\\.(?:includes|indexOf|has)\\(\\s*[\\w.?]*\\b${DIMENSION}\\b`),
];
const esRama = (src) => FORMAS_DE_RAMA.some((r) => r.test(src));
check('64b · ni una rama por capacidad, proveedor o modelo en todo A8, se escriba como se escriba', !esRama(src8));
check('64c · CONTROL · la guarda caza cada forma de rama —también con paréntesis— y no lo que no lo es',
  [
    "if (a.scope.capability === 'x.y') continue;",
    "if ((a.scope as Record<string, unknown>).providerId === 'p-favorito') continue;",
    "if ('m-favorito' === (a.scope as any).modelId) continue;",
    "switch (a.scope.provider) { case 'p': break; }",
    "if (['p'].includes(a.scope.providerId)) continue;",
  ].every(esRama) &&
  !["if (a.status === 'admitted') x = 1;", "if (req.minSampleSize === 3) y = 2;", "const c = a.scope.capability;"].some(esRama));

console.log('\n─── Q. Determinismo ───');

const ENTRADA = [agBase, agregado({ scope: { capability: 'x.y', providerId: 'p2' }, valor: 1200 }), agregado({ n: 20 }), agregado({ scope: { capability: 'otra' } })];
const doce = Array.from({ length: 12 }, () => JSON.stringify(sel(ENTRADA)));
check('65 · doce corridas idénticas, campo por campo', doce.every((x) => x === doce[0]));
check('66 · barajar la entrada no cambia nada', JSON.stringify(sel([...ENTRADA].reverse())) === doce[0]);
check('67 · el reloj entra por parámetro: otro `ahora`, otra frescura',
  una(agBase, { ahora: AHORA + 10 * DIA }).freshness < una(agBase).freshness);

console.log('\n─── R. Contratos de integración ───');

const H = 3_600_000;
const aprendido = a7.aprender({
  ahora: AHORA, policy: { ventanaMs: 5 * DIA },
  outcomes: Array.from({ length: 60 }, (_, i) => ({ id: `o${i}`, kind: 'success', at: AHORA - (60 - i) * H, scope: { capability: 'x.y', providerId: 'p1' },
    signals: [{ key: 'result.latencyMs', value: 800, source: 'measured', at: AHORA - (60 - i) * H }] })),
});
const desdeA7 = a8.seleccionar({ ahora: AHORA, scope: { capability: 'x.y', providerId: 'p1' }, objective: { weights: { latency: 1 } }, learned: aprendido.aggregates });
check('68 · A7 → A8: lo que A7 entrega, A8 lo lee tal cual', desdeA7.metricas.admitidas >= 1, desdeA7.cierre);
const deA1 = A.crearMotorDeDecision().decidir({
  contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { latency: 1 } },
  trace: { traceId: 't', requestId: 'r', userId: 'u' },
  options: [{ id: 'a', value: {}, values: { latency: 800 } }, { id: 'b', value: {}, values: { latency: 1200 } }],
  ...A.paraDecision(desdeA7),
});
check('69 · A7 → A8 → A1: la HistoryWindow entra en el contexto de A1 sin traducir nada',
  deA1.status === 'decided' && typeof A.paraDecision(desdeA7).history?.sampleSize === 'number');
const sinA8 = A.crearMotorDeDecision().decidir({
  contract: ALGORITHM_CONTRACT_VERSION, objective: { weights: { latency: 1 } },
  trace: { traceId: 't', requestId: 'r', userId: 'u' },
  options: [{ id: 'a', value: {}, values: { latency: 800 } }, { id: 'b', value: {}, values: { latency: 1200 } }],
});
/*
 * Este caso comparaba `chosen`, un campo que la decisión no tiene: pasaba con
 * `undefined === undefined` dijera lo que dijera A1. Ahora compara lo que existe.
 */
check('70 · y A1 LEE la ventana (contrato 1.7): la declara, y como es del ámbito entero, no cambia a quién elige',
  deA1.signalKeys.includes('history.decision') && !sinA8.signalKeys.includes('history.decision') &&
  deA1.status === sinA8.status && igual(deA1.selected, sinA8.selected) && igual(deA1.candidates, sinA8.candidates) &&
  deA1.candidates.length === 2, `elige ${deA1.candidates.find((c) => c.reason === 'selected')?.id} con y sin A8`);
const optA5 = A.crearMotorDeOptimizacion().optimizar({
  candidates: [{ id: 'c1', value: {}, values: { latency: 800 } }], objective: { weights: { latency: 1 } }, evidence: desdeA7.evidence,
});
check('71 · A7 → A8 → A5: A5 acepta la evidencia sin romperse', typeof optA5.stoppedBecause === 'string');
check('72 · y no cambia nada: A5 solo lee recursos — no hay puerto para A5, a propósito',
  igual(optA5.feasible.map((c) => c.id), A.crearMotorDeOptimizacion().optimizar({
    candidates: [{ id: 'c1', value: {}, values: { latency: 800 } }], objective: { weights: { latency: 1 } } }).feasible.map((c) => c.id)));
const verA6 = (evidence) => A.crearMotorDeVerificacion().verificar({
  expected: [{ kind: 'salida' }], actual: { id: 'r', status: 'succeeded', outputs: [{ kind: 'salida', ref: 'x' }] }, ...(evidence ? { evidence } : {}),
}).status;
check('73 · A7 → A8 → A6: A6 acepta la evidencia, y el veredicto no cambia — el histórico no verifica ESTE resultado',
  verA6(desdeA7.evidence) === verA6(undefined));
check('74b · al Router solo le llega lo ADMITIDO: lo rancio de un proveedor no viaja',
  A.paraRouter(sel([agregado({ scope: { capability: 'x.y', providerId: 'p-rancio' }, hasta: AHORA - 61 * DIA })])).length === 0 &&
  A.paraRouter(sel([agregado({ scope: { capability: 'x.y', providerId: 'p-fresco' } })])).length === 1);
check('74 · el Router: el conjunto está PREPARADO y nadie lo consume todavía',
  A.paraRouter(desdeA7).length === 1 && A.paraRouter(desdeA7)[0].providerId === 'p1' &&
  !/paraRouter|crearMotorDeContexto/.test(leer('functions/src/core/router.ts')));

console.log('\n─── S. Sabotajes de entrada ───');

const ROTAS = [
  ['una petición que no es una petición', () => a8.seleccionar(undefined)],
  ['sin reloj', () => a8.seleccionar({ scope: {}, learned: [agBase] })],
  ['un reloj NaN', () => a8.seleccionar({ ahora: NaN, scope: {}, learned: [agBase] })],
  ['lo aprendido no es una lista', () => a8.seleccionar({ ...BASE, learned: 'x' })],
  ['agregados nulos', () => a8.seleccionar({ ...BASE, learned: [null, undefined, 3] })],
  ['un agregado sin clave', () => a8.seleccionar({ ...BASE, learned: [{ ...agBase, key: undefined }] })],
  ['un n negativo', () => a8.seleccionar({ ...BASE, learned: [{ ...agBase, n: -4 }] })],
  ['una fuerza infinita', () => a8.seleccionar({ ...BASE, learned: [{ ...agBase, fuerza: Infinity }] })],
  ['un objetivo con pesos basura', () => a8.seleccionar({ ...BASE, objective: { weights: { latency: NaN, cost: -3 } }, learned: [agBase] })],
  ['requisitos imposibles', () => a8.seleccionar({ ...BASE, requirements: { minConfidence: 7, maxAgeMs: -1, minSampleSize: -2 }, learned: [agBase] })],
  ['una política de aprendizaje que intenta aflojar el suelo', () => a8.seleccionar({ ...BASE, learningPolicy: { minSampleSize: 0 }, learned: [agregado({ n: 3 })] })],
];
for (const [que, correr] of ROTAS) {
  let ok = false; let det = '';
  try { const r = correr(); ok = !!r && typeof r.cierre === 'string'; det = r?.cierre; }
  catch (e) { det = 'LANZÓ: ' + String(e.message).slice(0, 60); }
  check(`75 · SABOTAJE ${que} → se maneja, no revienta`, ok, det);
}
check('76 · SABOTAJE · el suelo de A7 no se afloja desde A8',
  una(agregado({ n: 3 }), { learningPolicy: { minSampleSize: 0 } }).because.includes('sample_below_minimum'));

console.log('\n─── U. Contrato 1.6: el reloj, la rejilla y la privacidad de A7, consumidos tal cual ───');

/*
 * EL FALLO DE LA AUDITORÍA: sin reloj, A8 evaluaba con 0, y un agregado de hace
 * sesenta y un días salía con frescura 1 y ADMITIDO.
 */
const RANCIO_61 = agregado({ hasta: AHORA - 61 * DIA });
check('U1 · con reloj, un agregado de hace 61 días está rancio',
  una(RANCIO_61).status === 'stale' && una(RANCIO_61).freshness === 0);
for (const [etiqueta, reloj, motivo] of [
  ['ausente', undefined, 'clock_missing'], ['null', null, 'clock_missing'], ['NaN', NaN, 'clock_invalid'],
  ['Infinity', Infinity, 'clock_invalid'], ['negativo', -1, 'clock_invalid'], ['cero', 0, 'clock_invalid'],
]) {
  const r = sel([RANCIO_61, agBase], { ahora: reloj });
  check(`U2 · reloj ${etiqueta} → ${motivo}: nada admitido, nada entregado`,
    r.rechazo === motivo && r.cierre === 'unknown' && r.admisiones.length === 0 &&
    r.signals.length === 0 && r.evidence.length === 0 && Object.keys(r.history).length === 0,
    `${r.rechazo} · ${r.cierre}`);
}
check('U3 · CONTROL · con un reloj válido no hay rechazo y lo bueno se admite',
  !('rechazo' in sel([agBase])) && sel([agBase]).metricas.admitidas === 1);
check('U4 · rechazada, dice por qué y cuántas piezas quedaron sin mirar',
  (() => { const r = sel([RANCIO_61, agBase], { ahora: undefined }); return r.metricas.recibidas === 2 && /reloj/.test(r.because.join(' ')); })());

/* La rejilla es de A7, y A8 la consume sin reinterpretarla. */
const LEGADO8 = (() => { const a = { ...agBase }; delete a.tramosHasta; return a; })();
check('U5 · CONTROL · el agregado base trae su rejilla y se admite', typeof agBase.tramosHasta === 'number' && una(agBase).status === 'admitted');
check('U6 · el mismo SIN rejilla: `stability_unknown` de A7 es su ÚNICO motivo, y no se admite',
  una(LEGADO8).status === 'insufficient' && igual([...una(LEGADO8).because], ['stability_unknown']),
  `${una(LEGADO8).status} ${JSON.stringify(una(LEGADO8).because)}`);
check('U7 · y su estabilidad y su tendencia son las de A7: desconocidas',
  una(LEGADO8).stability === undefined && una(LEGADO8).trend === 'insufficient_evidence');
check('U8 · un agregado que A7 construyó en varias llamadas con su reloj se lee IGUAL que en una',
  (() => {
    const lote = (desde, hasta) => Array.from({ length: hasta - desde }, (_, j) => {
      const i = desde + j; const at = AHORA - (80 - i) * 2 * HORA;
      return { id: `u8_${i}`, kind: 'success', at, scope: { capability: 'x.y' },
        signals: [{ key: 'result.latencyMs', value: i < 40 ? 500 : 3000, source: 'measured', at }] };
    });
    const pol = { ventanaMs: 8 * DIA };
    const una7 = a7.aprender({ ahora: AHORA, policy: pol, outcomes: lote(0, 80) }).aggregates;
    let previo = [];
    for (const [d, h] of [[0, 20], [20, 40], [40, 60], [60, 80]]) {
      const l = lote(d, h); previo = a7.aprender({ ahora: l[l.length - 1].at, policy: pol, outcomes: l, previo }).aggregates;
    }
    const lee = (learned) => JSON.stringify(a8.seleccionar({ ...BASE, learned, learningPolicy: pol }).admisiones);
    return lee(una7) === lee(previo);
  })());
check('U9 · un motivo que A8 no conoce cae en `unknown`, nunca en `admitted` — también los del reloj de A7',
  A.estadoDeMotivo('motivo_que_nadie_ha_inventado') === 'unknown' && A.estadoDeMotivo('clock_missing') === 'unknown' &&
  A.estadoDeMotivo('evidence_stale') === 'stale');

console.log('\n─── V. A9.1 · A8 FILTRA: no decide implementación, ni proveedor, ni modelo ───');

/*
 * A8 conoce proveedores y modelos —van en el ÁMBITO de lo aprendido, que es
 * donde el Router los necesitará— y no puede sacarlos de ahí. Lo que entrega
 * tiene una forma cerrada, y cada campo nuevo es una puerta.
 */
const PROVEEDORES = ['p-a', 'p-m', 'p-z'];
const conImpl = sel(PROVEEDORES.map((p, k) => agregado({ scope: { capability: 'x.y', providerId: p, modelId: `m-${p}` }, valor: [3000, 9000, 100][k] })),
  { scope: { capability: 'x.y' }, requirements: {} });
const sinAmbitos = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === 'scope' ? undefined : v)));
check('V1 · CONTROL · lo aprendido SÍ trae proveedor y modelo en su ámbito: la prueba de abajo mira algo',
  A.violacionesEn(conImpl, 'a8', 64).length > 0 && conImpl.metricas.admitidas === 3, conImpl.cierre);
check('V2 · y fuera del ámbito no sale ni una clave de implementación: ni en admisiones, ni en señales, ni en historial',
  A.violacionesEn(sinAmbitos(conImpl), 'a8', 64).length === 0 && A.violacionesEn(sinAmbitos(desdeA7), 'a8', 64).length === 0);
const CAMPOS = {
  resultado: ['admisiones', 'because', 'cierre', 'contract', 'evidence', 'history', 'metricas', 'rechazo', 'signals'],
  admision: ['axis', 'axisMatch', 'because', 'confidence', 'consumerMatch', 'contradicting', 'freshness', 'key', 'lastObservedAt',
    'metric', 'sampleSize', 'scope', 'scopeMatch', 'stability', 'status', 'supporting', 'trend', 'uncertainty', 'value'],
  senal: ['at', 'confidence', 'key', 'sampleSize', 'source', 'subject', 'value'],
  ventana: ['medianCostUsd', 'medianLatencyMs', 'sampleSize', 'since', 'succeeded'],
};
const soloDe = (o, campos) => Object.keys(o).every((k) => campos.includes(k));
check('V3 · la forma de lo que A8 entrega es CERRADA: resultado, admisiones y señales, sin un campo más',
  [conImpl, desdeA7, sel([])].every((s) => soloDe(s, CAMPOS.resultado)) &&
  [...conImpl.admisiones, ...desdeA7.admisiones].every((x) => soloDe(x, CAMPOS.admision)) &&
  [...conImpl.signals, ...desdeA7.signals].every((s) => soloDe(s, CAMPOS.senal) && s.source === 'derived' && s.key.startsWith('learned.')) &&
  conImpl.signals.length > 0);
check('V4 · el puerto de A1 lleva SOLO la ventana, con los campos de HistoryWindow y sin implementación',
  soloDe(A.paraDecision(desdeA7), ['history']) && soloDe(A.paraDecision(desdeA7).history, CAMPOS.ventana) &&
  A.violacionesEn(A.paraDecision(desdeA7), 'a1', 64).length === 0 &&
  Object.values(conImpl.history).every((w) => soloDe(w, CAMPOS.ventana)));
const exacta = sel([agregado({ scope: { capability: 'x.y', providerId: 'p1' } })], { scope: { capability: 'x.y', providerId: 'p1' } });
const masAncha = sel([agregado({ scope: { capability: 'x.y', providerId: 'p1' } })], { scope: { capability: 'x.y' } });
check('V5 · la ventana que llega a A1 es la del ámbito EXACTO: lo de un proveedor no se hace pasar por lo de la capacidad',
  typeof A.paraDecision(exacta).history?.sampleSize === 'number' && masAncha.metricas.admitidas === 1 &&
  igual(A.paraDecision(masAncha), {}), 'se ADMITE —es evidencia más estrecha— pero no es historial de ESTA decisión');
const ruta8 = A.paraRouter(conImpl);
check('V6 · al Router, grupos por proveedor y modelo con lo admitido: ni puntuación, ni ranking, ni ganador',
  ruta8.length === 3 && ruta8.every((g) => soloDe(g, ['admisiones', 'modelId', 'providerId']) && g.admisiones.every((x) => x.status === 'admitted')) &&
  igual(ruta8.map((g) => g.providerId), PROVEEDORES), 'en orden de clave: p-a (3000), p-m (9000), p-z (100) — ni por valor subiendo ni bajando');
const congelar8 = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(congelar8); } return o; };
const ENTRADA8 = congelar8(JSON.parse(JSON.stringify({ ...BASE, learned: [agBase, agregado({ scope: { capability: 'x.y', providerId: 'p9' } })] })));
const antes8 = JSON.stringify(ENTRADA8);
const tras8 = (() => { try { return a8.seleccionar(ENTRADA8); } catch (e) { return { lanzo: String(e?.message ?? e) }; } })();
check('V7 · A8 no toca lo que recibe: la petición y lo aprendido entran congelados y salen iguales',
  !tras8.lanzo && JSON.stringify(ENTRADA8) === antes8 && tras8.metricas.recibidas === 2, tras8.lanzo ?? tras8.cierre);
/*
 * `paraRouter`: PREPARADO / NO CONECTADO A PRODUCCIÓN. No solo el Router (74):
 * NADA en `functions/src` fuera del propio algoritmo lo nombra ni importa la
 * capa. Su consumidor futuro es la puntuación del Router, por un puerto que
 * `RouterPorts` no tiene; hasta que exista, esto tiene que seguir en cero.
 */
const fuentesDe = (dir, out = []) => {
  for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
    const h = dir + '/' + e.name;
    if (e.isDirectory()) { if (h !== 'functions/src/core/algorithm') fuentesDe(h, out); } else if (/\.ts$/.test(e.name)) out.push(h);
  }
  return out;
};
const fuera = fuentesDe('functions/src');
const nombranRuta = fuera.filter((f) => /paraRouter|EvidenciaDeRuta/.test(sinComentarios(leer(f))));
const importanLaCapa = fuera.filter((f) => /from\s+'[^']*core\/algorithm[^']*'|from\s+'\.\/algorithm[^']*'/.test(sinComentarios(leer(f))));
const puertosDelRouter = [...(sinComentarios(leer('functions/src/core/router.ts')).match(/interface RouterPorts\s*\{([^}]*)\}/)?.[1] ?? '')
  .matchAll(/(\w+)\??\s*:/g)].map((m) => m[1]).sort();
check('V8 · `paraRouter` no tiene consumidor: nada fuera del algoritmo lo nombra, y nadie importa la capa',
  fuera.length > 100 && nombranRuta.length === 0 && importanLaCapa.length === 0,
  `${fuera.length} archivos · ${[...nombranRuta, ...importanLaCapa].join(', ') || 'ninguno'}`);
check('V8b · y el Router no tiene por dónde recibirlo: sus puertos son el Registry, la política y los costes',
  igual(puertosDelRouter, ['costs', 'policy', 'registry']), puertosDelRouter.join(', ') || 'no se encontró `RouterPorts`');

console.log('\n─── T. Rendimiento ───');

/*
 * MEDIDO COMO SE USA. El techo por llamada es el de A0 (512). A escala, A8 se
 * llama por DECISIÓN con los agregados de SU ámbito —que se piden por clave—,
 * así que la entrada real de una llamada es pequeña. Para N grandes se mide lo
 * que de verdad pasaría: llamadas acotadas, TODAS las piezas evaluadas. Nada
 * se trunca antes de cronometrar.
 */
const TECHO = A.TOPES_MAXIMOS.maxEvidence;
const piscina = (cuantos) => Array.from({ length: cuantos }, (_, i) => ({ ...agBase, key: `result.latencyMs|capability=c${i}`, scope: { capability: `c${i}` } }));
const medir = (cuantos) => {
  const todos = piscina(cuantos);
  const correr = () => {
    let evaluadas = 0; let llamadas = 0; let maxPorLlamada = 0;
    for (let k = 0; k < todos.length; k += TECHO) {
      const r = a8.seleccionar({ ahora: AHORA, scope: {}, objective: { weights: { latency: 1 } }, requirements: { allowBroaderScope: true }, learned: todos.slice(k, k + TECHO) });
      evaluadas += r.metricas.evaluadas; llamadas++; maxPorLlamada = Math.max(maxPorLlamada, r.metricas.evaluadas);
    }
    return { evaluadas, llamadas, maxPorLlamada };
  };
  correr();
  const ini = process.hrtime.bigint();
  const r = correr();
  return { cuantos, ms: Number(process.hrtime.bigint() - ini) / 1e6, ...r };
};
const tiempos = [100, 1000, 10_000, 100_000].map(medir);
for (const t of tiempos) {
  console.log(`   ${String(t.cuantos).padStart(6)} agregados → ${t.ms.toFixed(1)} ms · ${(t.ms / t.cuantos * 1000).toFixed(2)} µs/agregado · ${t.llamadas} llamada(s) · máx ${t.maxPorLlamada}/llamada`);
}
check('77 · se evalúan TODOS: nada se trunca antes de medir', tiempos.every((t) => t.evaluadas === t.cuantos),
  tiempos.map((t) => `${t.cuantos}→${t.evaluadas}`).join(' '));
check('78 · ninguna llamada pasa del techo: el coste por llamada está acotado', tiempos.every((t) => t.maxPorLlamada <= TECHO));
const porAg = tiempos.map((t) => t.ms / t.cuantos);
check('79 · el coste por agregado no crece con N: lineal, sin estado entre llamadas',
  porAg[3] < porAg[1] * 3, tiempos.map((t) => `${t.cuantos}:${(t.ms / t.cuantos * 1000).toFixed(2)}µs`).join(' · '));
check('80 · cien mil agregados en menos de 10 s', tiempos[3].ms < 10_000, `${tiempos[3].ms.toFixed(0)} ms`);

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nA8: usa lo aprendido a lo estrecho, y no inventa ni una evidencia');
process.exit(failures ? 1 : 0);
