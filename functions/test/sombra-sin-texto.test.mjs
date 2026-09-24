/*
 * S1.2 · B — LA EVIDENCIA DE B3, SIN TEXTO DE NADIE.
 *
 * Las secciones de B3 de la sombra —`autoridad`, `regresion`, `errores`,
 * `regresionDesdePuente`, `erroresDesdePuente`— guardaban la evidencia del
 * comparador TAL CUAL: la frase de un paso de Legacy (en Home puede llevar lo que
 * escribió la persona), los valores que acotó el entendimiento, las pistas del
 * plan. Y `fallo` guardaba el mensaje del error entero.
 *
 * Ahora pasan por la misma regla que la sección del algoritmo (`sinCitar`), con
 * dos casos más que solo aquí hacen falta. Se sigue sabiendo QUÉ pasó —campo,
 * clase, origen, camino, recuentos, longitudes—; lo que no se guarda es qué decía.
 *
 * La prueba principal: el mismo encargo dos veces, una con un marcador imposible
 * de confundir en cada sitio donde puede llegar texto de alguien, y otra con un
 * texto neutro DE LA MISMA LONGITUD. Si lo guardado depende solo de la estructura
 * y de las longitudes, los dos documentos son idénticos byte a byte.
 *
 *  A. El marcador no aparece.
 *  B. Lo guardado no depende del texto: invariancia.
 *  C. Lo que se conserva: longitudes, clases, orígenes, recuentos.
 *  D. La comparación sigue funcionando: lo que falta al Core sigue detectándose.
 *  E. El contrato 1.2 no cambia, y no aparece ningún campo nuevo.
 *  F. Fallos y rechazos.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require_(path.resolve(here, '../lib/' + p));

let failures = 0; let n = 0;
const check = (nombre, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${nombre}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let red = 0;
globalThis.fetch = async () => { red++; throw new Error('esta suite no sale a la red'); };

const { sombraDelPlan, entendimientoDePruebaDeTravel, disponibilidadDelCatalogo, CLAVE_DE_LA_SOMBRA, CONTRATO_DE_LA_SOMBRA } = lib('creator/sombra.js');
const { resumenDeParidad } = lib('creator/paridad.js');
const { TEMPLATES } = lib('creator/templates.js');

/* ── Un Firestore de mentira que, como el de verdad, RECHAZA `undefined` (lección de S1). ── */
const clonar = (v) => JSON.parse(JSON.stringify(v));
const indefinidoEn = (v, ruta = '') => {
  if (v === undefined) return ruta || '(el documento)';
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { const r = indefinidoEn(x, ruta ? `${ruta}.${k}` : k); if (r) return r; }
  return null;
};
class BaseFalsa {
  constructor() { this.docs = new Map(); }
  collection(p) { return { doc: (id) => new RefFalsa(this, `${p}/${id}`) }; }
}
class RefFalsa {
  constructor(db, p) { this.db = db; this.path = p; }
  collection(sub) { return { doc: (id) => new RefFalsa(this.db, `${this.path}/${sub}/${id}`) }; }
  async get() { const d = this.db.docs.get(this.path); return { exists: d !== undefined, data: () => (d === undefined ? undefined : clonar(d)) }; }
  async create(data) {
    const donde = indefinidoEn(data);
    if (donde) throw new Error(`Cannot use "undefined" as a Firestore value (found in field "${donde}")`);
    if (this.db.docs.has(this.path)) { const e = new Error('ALREADY_EXISTS'); e.code = 6; throw e; }
    this.db.docs.set(this.path, clonar(data));
  }
}

/* ── Lo que escribiría una persona: el marcador y su gemelo neutro, de la misma longitud. ── */
const MARCA = 'SECRET_SHADOW_TEST_9f31';
const NEUTRO = 'NEUTRAL_SHADOW_TEXT_000';
if (MARCA.length !== NEUTRO.length) throw new Error('el gemelo neutro tiene que medir lo mismo');
const CUENTA = 'cuenta_de_prueba_s12';
const JOB = 'job_s12_privacidad';
const PUERTA = { habilitado: true, cuentas: [CUENTA], caminos: ['brain', 'puente', 'algoritmo'] };

/* El plan de Legacy de Travel, con texto de la persona en cada sitio donde Legacy lo pone. */
const planDeLegacy = async (t) => {
  const p = clonar(await TEMPLATES.travel.buildPlan(TEMPLATES.travel.defaultGoal, { what: 'plan' }));
  p.goal = `Quiero un viaje ${t} con calma`;
  p.explainToUser = `Voy a preparar ${t} para ti, día a día.`;
  for (const s of p.steps) {
    s.purpose = `Preparar el itinerario ${t} de tu viaje`;
    s.input = { ...(s.input ?? {}), brief: `viaja con ${t} y sin prisas`, focus: t, mood: `${t} tranquilo`, genre: t, voice: t };
  }
  return p;
};
/* El entendimiento de Travel, con texto de la persona en sus valores y en una clave que no es una etiqueta. */
const entendimiento = (t) => {
  const e = entendimientoDePruebaDeTravel(`Organiza un viaje ${t}`);
  return {
    ...e,
    goal: `${t} objetivo del viaje`,
    inputs: { text: `${t} texto de la persona`, attachments: [] },
    constraints: { destino: t, ritmo: `${t} sin prisas`, duracion: 5, flexible: true, [`${t} clave suelta`]: 'valor' },
    steps: e.steps.map((s) => ({ ...s, input: { ...s.input, brief: `${t} brief del paso ${s.key}` } })),
  };
};
const correr = async (t, extra = {}) => {
  const db = new BaseFalsa();
  const logs = [];
  const salida = await sombraDelPlan({
    jobRef: db.collection('creatorJobs').doc(JOB), jobId: JOB, userId: CUENTA, experienceId: 'travel',
    goal: `Organiza un viaje ${t}`, legacyPlan: await planDeLegacy(t), puerta: PUERTA,
    entendimientoDe: async () => entendimiento(t), disponibilidad: disponibilidadDelCatalogo(),
    ahora: () => 1000, cronometro: () => 0, observar: (l) => logs.push(l), ...extra,
  });
  return { salida, logs, doc: db.docs.get(`creatorJobs/${JOB}/private/${CLAVE_DE_LA_SOMBRA}`) };
};

const conMarca = await correr(MARCA);
const conNeutro = await correr(NEUTRO);
const D = conMarca.doc;
const texto = JSON.stringify(D ?? {});

console.log('\n─── A. El marcador no aparece ───');

check('1 · la sombra se escribió, con los tres caminos: hay algo que mirar',
  conMarca.salida?.escrita === true && !!D && igual(D.caminos, ['brain', 'puente', 'algoritmo'])
  && !!D.autoridad && !!D.regresion && !!D.regresionDesdePuente && !!D.algoritmo, `estado=${D?.estado}`);
check(`2 · «${MARCA}» NO aparece en ningún sitio del documento guardado`, !!D && !texto.includes(MARCA),
  texto.includes(MARCA) ? texto.slice(Math.max(0, texto.indexOf(MARCA) - 120), texto.indexOf(MARCA) + 40) : 'ni rastro');
check('3 · ni la frase del paso de Legacy, ni el objetivo, ni el brief, ni la promesa, ni el texto del entendimiento',
  !!D && ['Preparar el itinerario', 'objetivo del viaje', 'texto de la persona', 'brief del paso', 'para ti, día a día', 'con calma', 'sin prisas', 'tranquilo', 'clave suelta']
    .every((trozo) => !texto.includes(trozo)));
check('4 · ni los valores que acotó el entendimiento, tampoco los de una sola palabra con forma de etiqueta',
  !!D && [...(D.autoridad?.diferencias ?? []), ...(D.errores ?? [])].filter((d) => /^intención\.constraints\./.test(d.campo))
    .every((d) => !d.evidencia.includes(MARCA) && /^entendimiento=(texto\(\d+ car\)|número|sí\/no|nada|otro) plan=(texto\(\d+ car\)|número|sí\/no|nada|otro)$/.test(d.evidencia)),
  (D?.autoridad?.diferencias ?? []).filter((d) => /^intención\.constraints\./.test(d.campo)).map((d) => `${d.campo}: ${d.evidencia}`).join(' | '));
check('5 · y los registros de la sombra tampoco lo llevan', conMarca.logs.length > 0 && conMarca.logs.every((l) => !l.includes(MARCA)));
check('6 · y no salió a la red', red === 0);

console.log('\n─── B. Lo guardado no depende del texto ───');

check('7 · el mismo encargo con un texto neutro de la MISMA longitud deja un documento IDÉNTICO: solo se guardan estructura y longitudes',
  !!conNeutro.doc && igual(conMarca.doc, conNeutro.doc),
  igual(conMarca.doc, conNeutro.doc) ? 'idénticos' : 'difieren');

console.log('\n─── C. Lo que se conserva ───');

const todas = (d) => [...(d.autoridad?.diferencias ?? []), ...(d.regresion?.diferencias ?? []), ...(d.errores ?? []),
  ...(d.regresionDesdePuente?.diferencias ?? []), ...(d.erroresDesdePuente ?? [])];
const legacy = await planDeLegacy(MARCA);
const frasePuente = (D?.regresionDesdePuente?.diferencias ?? []).find((d) => /\.purpose$/.test(d.campo));
check('8 · la LONGITUD de la frase del paso sí se guarda: se sabe cuánto medía sin saber qué decía',
  /^legacy=(\d+) car core=(\d+) car$/.test(frasePuente?.evidencia ?? '')
  && Number(/^legacy=(\d+)/.exec(frasePuente.evidencia)[1]) === legacy.steps[0].purpose.length, frasePuente?.evidencia);
const foco = todas(D ?? {}).find((d) => /\.focus$/.test(d.campo));
check('9 · y la de lo que contestó la persona (focus), con su fase: el hueco se sigue viendo',
  !!foco && foco.evidencia.includes(`${MARCA.length} car`) && foco.origen === 'G14' && foco.clase === 'LEGACY_ONLY_INFORMATION', foco?.evidencia);
const restr = (campo) => (D?.autoridad?.diferencias ?? []).find((d) => d.campo === `intención.constraints.${campo}`);
/* El Planner copia las restricciones al plan: aquí coinciden, y la clase lo dice sin que haga falta el valor. */
check('10 · de lo que acotó el entendimiento, el TIPO y la longitud: texto, número, sí/no —y la clase dice si coincidían—',
  restr('destino')?.evidencia === `entendimiento=texto(${MARCA.length} car) plan=texto(${MARCA.length} car)` && restr('destino')?.clase === 'EXACT_MATCH'
  && restr('duracion')?.evidencia === 'entendimiento=número plan=número' && restr('flexible')?.evidencia === 'entendimiento=sí/no plan=sí/no',
  ['destino', 'duracion', 'flexible'].map((k) => `${restr(k)?.clase}: ${restr(k)?.evidencia}`).join(' | '));
const suelta = (D?.autoridad?.diferencias ?? []).find((d) => /^intención\.constraints\.‹\d+ car›$/.test(d.campo));
check('11 · una clave del entendimiento que no es una etiqueta tampoco se cita: se guarda su longitud',
  !!suelta && suelta.campo === `intención.constraints.‹${`${MARCA} clave suelta`.length} car›`, suelta?.campo);
check('12 · la promesa al usuario, la del brief y la de la frase: longitudes, como antes',
  todas(D ?? {}).filter((d) => d.campo === 'explainToUser').every((d) => /^legacy=\d+ car/.test(d.evidencia))
  && todas(D ?? {}).filter((d) => /\.input\.brief$/.test(d.campo)).every((d) => d.evidencia === 'idéntico' || /^legacy=\d+ car · core=\d+ car$/.test(d.evidencia)));
check('13 · campo, clase, origen y camino se guardan: se sabe QUÉ pasó',
  todas(D ?? {}).length > 10 && todas(D ?? {}).every((d) => typeof d.campo === 'string' && typeof d.clase === 'string'
    && Object.keys(d).every((k) => ['campo', 'clase', 'evidencia', 'origen', 'camino'].includes(k))));

console.log('\n─── D. La comparación sigue funcionando ───');

check('14 · los resúmenes cuentan las mismas clases que las diferencias guardadas: sanear no mueve ninguna',
  ['autoridad', 'regresion', 'regresionDesdePuente'].every((s) => igual(D?.[s]?.resumen, resumenDeParidad(D?.[s]?.diferencias ?? []))),
  ['autoridad', 'regresion', 'regresionDesdePuente'].map((s) => `${s}=${JSON.stringify(D?.[s]?.resumen)}`).join(' '));
check('15 · lo que al Core le FALTA sigue detectándose: la frase del paso es una pérdida, con su origen',
  (D?.errores ?? []).some((d) => /\.purpose$/.test(d.campo) && d.clase === 'LEGACY_ONLY_INFORMATION' && d.origen === 'frase para la persona')
  && (D?.erroresDesdePuente ?? []).some((d) => /\.purpose$/.test(d.campo) && d.origen === 'frase para la persona'));
check('16 · y la promesa al usuario, que el Core no escribe',
  (D?.errores ?? []).some((d) => d.campo === 'explainToUser' && d.origen === 'promesa al usuario'),
  (D?.errores ?? []).map((d) => d.campo).join(' · '));
/* Sin nada que el Core pueda servir, el plan no sale: lo que el entendimiento pedía se pierde, y se tiene que ver. */
const sinPlan = await correr(MARCA, { disponibilidad: { disponible: () => false } });
const perdidas = (sinPlan.doc?.errores ?? []).filter((d) => /^intención\./.test(d.campo));
check('16b · EJE DE AUTORIDAD: si el plan no sale, cada paso y cada restricción que el entendimiento pedía es una pérdida, y se ve —sin su texto—',
  sinPlan.doc?.estado === 'plan_no_listo'
  && perdidas.some((d) => d.campo === 'intención.constraints.destino' && d.clase === 'LEGACY_ONLY_INFORMATION' && d.evidencia === `entendimiento=texto(${MARCA.length} car) plan=nada`)
  && perdidas.some((d) => /^intención\.steps\[/.test(d.campo) && d.clase === 'LEGACY_ONLY_INFORMATION')
  && !JSON.stringify(sinPlan.doc).includes(MARCA),
  `${sinPlan.doc?.estado} · ${perdidas.map((d) => `${d.campo}=${d.clase}`).join(' · ')}`);
const pistas = todas(D ?? {}).filter((d) => /\.(hints|uses)$/.test(d.campo));
check('17 · lo que el Core añade también se sigue viendo, con sus claves y sin sus valores',
  todas(D ?? {}).some((d) => d.clase === 'CORE_ADDS_INFORMATION')
  && pistas.length > 0 && pistas.every((d) => /^claves: /.test(d.evidencia)), pistas.map((d) => `${d.campo}: ${d.evidencia}`).join(' | '));
check('18 · y la sección del algoritmo sigue comparando igual: sus categorías, su total y su evidencia sin texto',
  !!D?.algoritmo?.comparacion && D.algoritmo.comparacion.total > 0 && !JSON.stringify(D.algoritmo).includes(MARCA));

console.log('\n─── E. El contrato 1.2 no cambia ───');

const rutas = (v, ruta = '', out = new Set()) => {
  if (Array.isArray(v)) { v.forEach((x) => rutas(x, `${ruta}[]`, out)); if (!v.length) out.add(`${ruta}[]`); return out; }
  if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) rutas(x, ruta ? `${ruta}.${k}` : k, out); return out; }
  out.add(ruta); return out;
};
/* La forma de las secciones de B3, fijada: un campo nuevo que guardara texto la cambiaría. */
const FORMA_DE_B3 = [
  'autoridad.diferencias[].campo', 'autoridad.diferencias[].clase', 'autoridad.diferencias[].evidencia',
  'coreDesdePuente.aristasDescartadas', 'coreDesdePuente.cantidades[]', 'coreDesdePuente.dependencias[]', 'coreDesdePuente.formas[]',
  'coreDesdePuente.origen', 'coreDesdePuente.pasos', 'coreDesdePuente.rechazos[]', 'coreDesdePuente.status',
  'errores[].camino', 'errores[].campo', 'errores[].clase', 'errores[].evidencia', 'errores[].origen',
  'erroresDesdePuente[].camino', 'erroresDesdePuente[].campo', 'erroresDesdePuente[].clase', 'erroresDesdePuente[].evidencia', 'erroresDesdePuente[].origen',
  'legacy.formas[]', 'legacy.pasos',
  'regresion.diferencias[].camino', 'regresion.diferencias[].campo', 'regresion.diferencias[].clase', 'regresion.diferencias[].evidencia', 'regresion.diferencias[].origen',
  'regresionDesdePuente.diferencias[].camino', 'regresionDesdePuente.diferencias[].campo', 'regresionDesdePuente.diferencias[].clase',
  'regresionDesdePuente.diferencias[].evidencia', 'regresionDesdePuente.diferencias[].origen',
];
const deB3 = [...rutas(D ?? {})].filter((r) => /^(autoridad|regresion|errores|coreDesdePuente|regresionDesdePuente|erroresDesdePuente|legacy)[.[]/.test(r)
  && !/\.resumen\./.test(r)).sort();
check('19 · el contrato sigue siendo 1.2 y las claves de primer nivel, las de siempre',
  D?.contract === CONTRATO_DE_LA_SOMBRA && CONTRATO_DE_LA_SOMBRA === '1.2'
  && igual(Object.keys(D ?? {}).sort(), ['algoritmo', 'autoridad', 'caminos', 'contract', 'core', 'coreDesdeBrain', 'coreDesdePuente', 'creadaEn',
    'errores', 'erroresDesdePuente', 'estado', 'experienceId', 'jobId', 'legacy', 'regresion', 'regresionDesdePuente', 'userId']),
  Object.keys(D ?? {}).sort().join(','));
check('20 · y la forma de las secciones de B3 es la fijada: ningún campo nuevo que vuelva a guardar texto',
  igual(deB3, [...FORMA_DE_B3].sort()), deB3.filter((r) => !FORMA_DE_B3.includes(r)).join(', ') || 'la misma');

console.log('\n─── F. Fallos y rechazos ───');

const roto = await correr(MARCA, { entendimientoDe: async () => { throw new Error(`el entendimiento reventó leyendo «${MARCA}»`); } });
check('21 · un fallo se guarda por su CLASE: el nombre y la longitud del mensaje, nunca el mensaje',
  roto.salida?.estado === 'fallo' && roto.doc?.estado === 'fallo' && /^Error · mensaje de \d+ car$/.test(roto.doc?.fallo ?? '')
  && !JSON.stringify(roto.doc).includes(MARCA) && roto.doc.fallo.length <= 240, roto.doc?.fallo);
const conCodigo = await correr(MARCA, { entendimientoDe: async () => { const e = new Error(`permiso denegado para ${MARCA}`); e.code = 'permission-denied'; throw e; } });
check('22 · y si trae un código de sistema, se conserva: se sigue pudiendo diagnosticar',
  conCodigo.doc?.fallo === `Error · código permission-denied · mensaje de ${`permiso denegado para ${MARCA}`.length} car`, conCodigo.doc?.fallo);
const rechazado = await correr(MARCA, { legacyPlan: { ...(await planDeLegacy(MARCA)), steps: (await planDeLegacy(MARCA)).steps.map((s) => ({ ...s, input: { ...s.input, count: MARCA } })) } });
check('23 · un paso que el puente rechaza deja el campo y el motivo, no lo que traía',
  rechazado.doc?.coreDesdePuente?.status === 'invalid' && (rechazado.doc?.coreDesdePuente?.rechazos ?? []).length > 0
  && !JSON.stringify(rechazado.doc).includes(MARCA), JSON.stringify(rechazado.doc?.coreDesdePuente?.rechazos ?? []));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nS1.2 · B: la sombra sabe qué pasó y cuánto medía, y no guarda qué decía nadie');
process.exit(failures ? 1 : 0);
