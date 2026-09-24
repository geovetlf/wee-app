/*
 * LA SOMBRA DEL CORE: QUE MIRE Y NO TOQUE.
 *
 * ── Qué se pone a prueba ────────────────────────────────────────────────────
 *
 * Que el Core pueda pensar un plan EN PARALELO al de Legacy sin que se note en
 * ninguna parte: ni en la respuesta, ni en el trabajo, ni en el dinero, ni en
 * lo que se ejecuta. Legacy sigue siendo la autoridad; el Core es observación.
 *
 * Lo más importante que se comprueba aquí no es que la sombra funcione: es que
 * cuando falle, o cuando esté apagada, NO PASE NADA. Por eso hay tantas pruebas
 * de lo que no ocurre como de lo que ocurre.
 *
 * ── Sin proveedor ───────────────────────────────────────────────────────────
 *
 * Cero llamadas. El Planner y el comparador son los de verdad; el motor va
 * doblado, así que la ruta financiera se mide sin gastar un céntimo. Un contador
 * envuelve `fetch` y exige que no salga ni una petición.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(here, '../../' + p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const {
  sombraDelPlan, decidirSombra, leerSombra, entendimientoDePruebaDeTravel,
  entendimientoDelTramo1, disponibilidadDelCatalogo, CLAVE_DE_LA_SOMBRA,
  configuracionDeLaSombra, olvidarLaSombra, entendimientoRealDelBrain,
} = lib('creator/sombra.js');
const { compararIntencion, compararPlanes, erroresDeParidad, resumenDeParidad, ORIGEN_SIN_TRANSPORTE } = lib('creator/paridad.js');
const { TEMPLATES } = lib('creator/templates.js');
const { BRAIN_MAX_OUTPUT_TOKENS, MODELO_DE_BRAIN } = lib('creator/brain.js');

let failures = 0;
let n = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  console.log((cond ? '  ✔ ' : '  ✘ ') + n + ') ' + nombre + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/*
 * ── Ni una petición sale de aquí ───────────────────────────────────────────
 *
 * Se cuenta Y se rechaza (S1). Antes solo se contaba y la petición salía de
 * verdad: una sombra que llamara a un proveedor por error habría llegado a él
 * antes de que el contador la delatara. Ahora no llega a ninguna parte.
 */
let peticiones = 0;
const fetchDeVerdad = globalThis.fetch;
globalThis.fetch = async () => { peticiones++; throw new Error('esta suite no sale a la red'); };

/* ── Firestore de mentira, con `create` (que es lo que da la idempotencia) ── */
const clonar = (v) => JSON.parse(JSON.stringify(v));
/*
 * S1: como el de verdad —sin `ignoreUndefinedProperties`, que Weë no activa—,
 * este Firestore RECHAZA un `undefined` en cualquier parte del documento. Antes
 * lo tiraba en silencio al clonar, y un campo así, que en producción tumbaría la
 * escritura entera, aquí pasaba por bueno.
 */
const indefinidoEn = (v, ruta = '') => {
  if (v === undefined) return ruta || '(el documento)';
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) { const r = indefinidoEn(x, ruta ? `${ruta}.${k}` : k); if (r) return r; }
  }
  return null;
};
const comoFirestore = (data) => {
  const donde = indefinidoEn(data);
  if (donde) throw new Error(`Cannot use "undefined" as a Firestore value (found in field "${donde}")`);
  return clonar(data);
};
class BaseFalsa {
  constructor() { this.docs = new Map(); this.escrituras = []; this.romperCreate = false; }
  collection(p) { const base = this; return { doc: (id) => new RefFalsa(base, `${p}/${id}`) }; }
}
class RefFalsa {
  constructor(db, p) { this.db = db; this.path = p; this.id = p.split('/').pop(); }
  collection(sub) { const db = this.db; const base = this.path; return { doc: (id) => new RefFalsa(db, `${base}/${sub}/${id}`) }; }
  async get() {
    const d = this.db.docs.get(this.path);
    return { exists: d !== undefined, id: this.id, ref: this, data: () => (d === undefined ? undefined : clonar(d)) };
  }
  async create(data) {
    if (this.db.romperCreate) throw new Error('Firestore no está hoy');
    /* S1: el error exacto con el que falla `create`, para clasificar la carrera por su código. */
    if (this.db.errorDeCreate) throw this.db.errorDeCreate;
    if (this.db.docs.has(this.path)) { const e = new Error('ALREADY_EXISTS'); e.code = 6; throw e; }
    this.db.docs.set(this.path, comoFirestore(data));
    this.db.escrituras.push({ kind: 'create', path: this.path });
  }
  async set(data) { this.db.docs.set(this.path, comoFirestore(data)); this.db.escrituras.push({ kind: 'set', path: this.path }); }
}

const CUENTA_A = 'cuenta_de_prueba_A';
const CUENTA_B = 'cuenta_de_prueba_B';
const JOB = 'job_de_prueba_0001';
const GOAL = 'Quiero organizar un viaje a Lisboa en abril. Serían cinco días, me interesa mucho la comida y prefiero ir sin prisas.';
const ABIERTA = { habilitado: true, cuentas: [CUENTA_A] };

/*
 * Lo que un modelo devolvería: JSON CRUDO, no un entendimiento ya interpretado.
 * Así el parser de verdad —`interpretarEntendimiento` e `interpretarPasos`—
 * hace su trabajo en la prueba, en vez de saltárselo.
 */
const entendimientoCrudoDeTravel = () => ({
  version: 1, intent: 'planning', confidence: 'high',
  goal: 'Organizar un viaje de cinco días a Lisboa en abril, con foco en la comida y sin prisas.',
  capability: 'text.search', capabilities: ['text.search'],
  constraints: { destino: 'Lisboa', mes: 'abril', duracion: 5, interes_principal: 'comida', ritmo: 'sin prisas' },
  missing: [], assumptions: [], suggestedExperience: 'travel',
  steps: [
    { key: 'que_hacer_y_comer', capability: 'text.search', input: { kind: 'activities', brief: 'Buscar qué ver y dónde comer en Lisboa.' } },
    { key: 'plan_dia_a_dia', capability: 'text.search', input: { kind: 'itinerary', brief: 'Repartirlo en cinco días, sin prisas.' },
      needs: [{ from: 'upstream', stepKey: 'que_hacer_y_comer' }] },
  ],
});

const planDeLegacy = async () => (await TEMPLATES.travel.buildPlan(TEMPLATES.travel.defaultGoal, { what: 'plan' }));

const correr = async (extra = {}) => {
  const db = new BaseFalsa();
  const jobRef = db.collection('creatorJobs').doc(JOB);
  const job = {
    id: JOB, userId: CUENTA_A, experienceId: 'travel', goal: GOAL,
    status: 'planned', plan: await planDeLegacy(), answers: [{ questionId: 'what', optionId: 'plan' }],
  };
  const antesDelJob = clonar(job);
  let consultasDeDisponibilidad = 0;
  const disponibilidad = {
    disponible: (c) => { consultasDeDisponibilidad++; return disponibilidadDelCatalogo().disponible(c); },
  };
  /* Si la sombra lanzara, se anota y las comprobaciones lo ven: una prueba que revienta no dice qué falló. */
  let salida;
  let lanzo = null;
  try {
    salida = await sombraDelPlan({
      jobRef, jobId: job.id, userId: job.userId, experienceId: job.experienceId,
      goal: job.goal, legacyPlan: job.plan, puerta: ABIERTA,
      entendimientoDe: entendimientoDelTramo1, disponibilidad,
      ahora: () => 1000, observar: () => {},
      ...extra,
    });
  } catch (e) { lanzo = e; }
  return { db, jobRef, job, antesDelJob, salida, lanzo, consultasDeDisponibilidad, sombra: db.docs.get(`creatorJobs/${JOB}/private/${CLAVE_DE_LA_SOMBRA}`) };
};

/* Una llamada DIRECTA a la sombra: si lanzara, lo dice (`{ lanzo }`) en vez de tumbar la suite. */
const sinLanzar = async (entrada) => { try { return await sombraDelPlan(entrada); } catch (e) { return { lanzo: e }; } };

console.log('\n── La puerta ──');

check('F24) sin configuración, la sombra está APAGADA',
  decidirSombra(undefined, { userId: CUENTA_A, experienceId: 'travel' }).motivo === 'sin_configuracion'
  && !decidirSombra(undefined, { userId: CUENTA_A, experienceId: 'travel' }).sombra);
const para = (crudo) => decidirSombra(crudo, { userId: CUENTA_A, experienceId: 'travel' });
check('F24) y con una configuración que no se entiende, también',
  !para({ habilitado: 'sí' }).sombra && !para('abierta').sombra && !para([1, 2]).sombra,
  'no se «limpia» una configuración rara: se descarta entera');
check('SIN COMODÍN: habilitada pero sin lista de cuentas NO abre para nadie',
  !para({ habilitado: true }).sombra && para({ habilitado: true }).motivo === 'sin_lista_de_cuentas');
/*
 * Y la lista VACÍA es el otro caso: `cuentas: []` se escribe solo, quitando el
 * último id, y en la puerta del runtime «sin cuentas» significa «todo el
 * mundo». Aquí tiene que significar «nadie», y por dos caminos distintos.
 */
check('y `cuentas: []` tampoco: una lista vacía significa NADIE, no TODOS',
  !para({ habilitado: true, cuentas: [] }).sombra,
  'lo encontró un sabotaje: mi prueba solo miraba la lista ausente, no la vacía');
check('F25) cuenta autorizada sí; cuenta no autorizada no',
  para(ABIERTA).sombra && !decidirSombra(ABIERTA, { userId: CUENTA_B, experienceId: 'travel' }).sombra,
  decidirSombra(ABIERTA, { userId: CUENTA_B, experienceId: 'travel' }).motivo);
check('`habilitado: false` manda sobre todo lo demás',
  !para({ habilitado: false, cuentas: [CUENTA_A] }).sombra);
/*
 * La sombra NO es una puerta al Core: no manda nada a ejecutar. Por eso no
 * comparte el interruptor del runtime ni lo importa. Lo cazó la guarda de las
 * DOS PUERTAS cuando lo intenté, y tenía razón.
 */
check('la sombra tiene su PROPIO documento y no toca el runtime',
  /COLECCION_DE_LA_SOMBRA = 'aiSettings'/.test(leer('functions/src/creator/sombra.ts'))
  && /DOCUMENTO_DE_LA_SOMBRA = 'sombra'/.test(leer('functions/src/creator/sombra.ts'))
  && !/from '\.\.\/runtime'/.test(sinComentarios(leer('functions/src/creator/sombra.ts'))),
  'encender una observación no puede parecerse a abrir un camino de ejecución');
check('y el flujo de experiencia tampoco importa el runtime por su culpa',
  !/from '\.\.\/runtime'/.test(sinComentarios(leer('functions/src/creator/index.ts'))),
  'las puertas al Core siguen siendo exactamente dos');
check('sin poder leer el interruptor, la sombra queda APAGADA',
  await (async () => {
    olvidarLaSombra();
    const v = await configuracionDeLaSombra({ collection: () => ({ doc: () => ({ get: async () => { throw new Error('Firestore no está'); } }) }) }, () => 1);
    olvidarLaSombra();
    return v === undefined && !para(v).sombra;
  })(),
  'una incidencia de lectura nunca enciende nada');

console.log('\n── Apagada: cero efectos ──');

const apagada = await correr({ puerta: undefined });
check('F1) con la puerta cerrada NO se escribe nada en Firestore',
  apagada.db.escrituras.length === 0 && apagada.db.docs.size === 0,
  'escrituras: ' + apagada.db.escrituras.length);
check('F1) ni se ejecuta el Core Planner',
  apagada.consultasDeDisponibilidad === 0,
  'el Planner consulta la disponibilidad en cuanto corre; aquí no la consultó ni una vez');
check('F1) y la sombra lo dice sin inventarse un estado',
  apagada.salida?.escrita === false && apagada.salida?.estado === 'no_corre',
  apagada.salida?.motivo);
const ajena = await correr({ userId: CUENTA_B });
check('F7) una cuenta no autorizada: exactamente lo mismo',
  ajena.db.escrituras.length === 0 && ajena.consultasDeDisponibilidad === 0 && ajena.salida?.escrita === false);

console.log('\n── Encendida para la cuenta de prueba ──');

const ok = await correr();
check('F2) el Core Planner corre y la sombra queda escrita',
  ok.salida?.escrita === true && ok.salida?.estado === 'ok' && !!ok.sombra,
  'estado=' + ok.salida?.estado);
check('F6) y SOLO en private/shadow, nunca en el trabajo',
  ok.db.escrituras.length === 1
  && ok.db.escrituras[0]?.path === `creatorJobs/${JOB}/private/${CLAVE_DE_LA_SOMBRA}`,
  ok.db.escrituras.map((e) => e.path).join(', '));
check('F4) el trabajo no cambió ni un byte',
  igual(ok.job, ok.antesDelJob) && ok.job.status === 'planned' && !('sombra' in ok.job),
  'mismo status, mismo plan, sin campo nuevo');
check('F3) la respuesta al cliente no puede cambiar: no la toca nadie',
  !/sombra|shadow/i.test(sinComentarios(leer('functions/src/creator/index.ts')).split('const chatResponse')[1].slice(0, 400)),
  '`chatResponse` no sabe que la sombra existe');
check('el plan del Core llegó a `ready` con sus dos pasos',
  ok.sombra?.core?.status === 'ready' && ok.sombra?.core?.pasos === 2,
  (ok.sombra?.core?.formas ?? []).join(' · '));
check('F15) y la dependencia material sobrevivió al Planner',
  ok.sombra?.core?.dependencias?.length === 1 && /←/.test(ok.sombra.core.dependencias[0]),
  (ok.sombra?.core?.dependencias ?? []).join(', '));
check('F8) dos veces el mismo plan dejan UNA sola sombra',
  await (async () => {
    const segunda = await sinLanzar({
      jobRef: ok.jobRef, jobId: JOB, userId: CUENTA_A, experienceId: 'travel', goal: GOAL,
      legacyPlan: ok.job.plan, puerta: ABIERTA, entendimientoDe: entendimientoDelTramo1,
      disponibilidad: disponibilidadDelCatalogo(), ahora: () => 2000, observar: () => {},
    });
    return segunda.escrita === false && segunda.estado === 'no_corre' && ok.db.escrituras.length === 1;
  })(),
  'el turno repetido ni siquiera planifica: lo corta la lectura previa');
/*
 * Y la carrera, que es el caso que la lectura previa NO cubre: dos instancias a
 * la vez, las dos ven que no hay sombra y las dos planifican. Ahí el único que
 * decide es `create`, que falla si el documento ya existe. Se simula con un
 * `get` que siempre dice que no hay nada.
 */
check('F8) y en una CARRERA sigue habiendo una sola: `create` es el que cierra',
  await (async () => {
    const db = new BaseFalsa();
    const real = db.collection('creatorJobs').doc(JOB);
    const ciego = new Proxy(real, {
      get: (t, k) => (k === 'collection'
        ? (sub) => ({ doc: (id) => new Proxy(t.collection(sub).doc(id), { get: (r, j) => (j === 'get' ? async () => ({ exists: false, data: () => undefined }) : Reflect.get(r, j).bind(r)) }) })
        : Reflect.get(t, k)),
    });
    const comun = {
      jobId: JOB, userId: CUENTA_A, experienceId: 'travel', goal: GOAL,
      legacyPlan: await planDeLegacy(), puerta: ABIERTA, entendimientoDe: entendimientoDelTramo1,
      disponibilidad: disponibilidadDelCatalogo(), ahora: () => 1000, observar: () => {},
    };
    const a = await sinLanzar({ jobRef: ciego, ...comun });
    const b = await sinLanzar({ jobRef: ciego, ...comun });
    const creadas = db.escrituras.filter((e) => e.kind === 'create' && e.path.endsWith(CLAVE_DE_LA_SOMBRA)).length;
    /* S1: y la que pierde la carrera lo dice como lo que es, un DUPLICADO, no un fallo. */
    return a.escrita === true && b.escrita === false && creadas === 1 && b.estado === 'duplicado';
  })(),
  'lo encontró un sabotaje: con `set` en vez de `create`, la segunda pisaría a la primera');

console.log('\n── Cuando algo se rompe, no se rompe nada ──');

const rota = await correr({ entendimientoDe: async () => { throw new Error('el entendimiento explotó'); } });
check('F9) la sombra falla y NO lanza hacia el flujo de experiencia',
  rota.lanzo === null && rota.salida?.estado === 'fallo' && igual(rota.job, rota.antesDelJob),
  'el trabajo sigue exactamente igual');
check('F9) y deja constancia de que falló, sin contar de más',
  rota.sombra?.estado === 'fallo' && typeof rota.sombra.fallo === 'string' && rota.sombra.fallo.length <= 240,
  rota.sombra?.fallo);
const sinDb = await correr({ entendimientoDe: async () => { throw new Error('x'); } });
sinDb.db.romperCreate = true;
check('F9) y si ni siquiera puede escribir el fallo, se calla',
  await (async () => {
    const db2 = new BaseFalsa();
    db2.romperCreate = true;
    const r = await sinLanzar({
      jobRef: db2.collection('creatorJobs').doc(JOB), jobId: JOB, userId: CUENTA_A,
      experienceId: 'travel', goal: GOAL, legacyPlan: await planDeLegacy(), puerta: ABIERTA,
      entendimientoDe: entendimientoDelTramo1, disponibilidad: disponibilidadDelCatalogo(),
      ahora: () => 1000, observar: () => {},
    });
    return r.escrita === false && r.estado === 'fallo';
  })(),
  'esto no puede ser el motivo de que nadie pierda nada');

const malCap = await correr({
  entendimientoDe: async () => ({
    ...entendimientoDePruebaDeTravel(GOAL),
    capability: 'text.inventada',
    capabilities: ['text.inventada'],
    steps: [{ key: 'x', capability: 'text.inventada', input: { kind: 'itinerary' } }],
  }),
});
check('F10/F17) un entendimiento con una capacidad inexistente: la sombra no da plan',
  malCap.salida !== undefined && malCap.salida.estado !== 'ok' && igual(malCap.job, malCap.antesDelJob),
  'estado=' + malCap.salida?.estado + ' · core.status=' + (malCap.sombra?.core?.status ?? '—'));
const sinFijo = await correr({ experienceId: 'chef' });
check('para una experiencia sin fijo, la sombra lo dice en vez de inventárselo',
  sinFijo.salida?.estado === 'sin_entendimiento' && sinFijo.sombra?.estado === 'sin_entendimiento',
  'el Tramo 1 solo tiene el de Travel, que es el que midió B3.4');

console.log('\n── Los dos ejes del comparador ──');

const entendimiento = entendimientoDePruebaDeTravel(GOAL);
const planBueno = { steps: [
  { id: 's1', capability: 'text.search', input: { kind: 'activities', brief: 'a' }, produces: 'text' },
  { id: 's2', capability: 'text.search', input: { kind: 'itinerary', brief: 'b' }, produces: 'text', dependsOn: ['s1'] },
], constraints: entendimiento.constraints };
const autoridadBuena = compararIntencion(entendimiento, planBueno);
check('F11) con el fijo válido, la autoridad no pierde nada',
  erroresDeParidad(autoridadBuena, []).length === 0,
  JSON.stringify(resumenDeParidad(autoridadBuena)));
const sinLisboa = compararIntencion(entendimiento, { ...planBueno, constraints: { ...entendimiento.constraints, destino: undefined } });
check('F11) y si Lisboa desaparece del plan, lo detecta',
  erroresDeParidad(sinLisboa, []).some((d) => d.campo === 'intención.constraints.destino'),
  sinLisboa.find((d) => d.campo === 'intención.constraints.destino')?.clase);
check('F16) una dependencia a un paso inexistente es UNSUPPORTED',
  compararIntencion(entendimiento, { ...planBueno, steps: [
    planBueno.steps[0], { ...planBueno.steps[1], dependsOn: ['no_existe'] },
  ] }).some((d) => d.clase === 'UNSUPPORTED' && /dependsOn/.test(d.campo)));
check('F18) una variante que el catálogo no declara también',
  compararIntencion(entendimiento, { ...planBueno, steps: [
    { id: 's1', capability: 'text.search', input: { kind: 'inventada_total' }, produces: 'text' },
  ] }).some((d) => d.clase === 'UNSUPPORTED' && /input.kind/.test(d.campo)));

const legacy = await planDeLegacy();
const regresion = compararPlanes(legacy, planBueno, 'ready');
check('F12) la regresión clasifica sin llamar error a una forma distinta',
  regresion.some((d) => d.clase === 'EXACT_MATCH') && regresion.some((d) => d.clase === 'SEMANTICALLY_EQUIVALENT'),
  JSON.stringify(resumenDeParidad(regresion)));
check('F13) `quality: max` de la plantilla es LEGACY_ONLY, con su origen, y NO es error',
  regresion.some((d) => /\.quality$/.test(d.campo) && d.clase === 'LEGACY_ONLY_INFORMATION' && d.origen === 'default de plantilla')
  && erroresDeParidad([], regresion).every((d) => d.origen !== 'default de plantilla'),
  'lo pone la plantilla, no la persona');
/*
 * ── B3.7 · Y LO QUE SÍ CUENTA COMO PÉRDIDA ─────────────────────────────────
 *
 * Esta comprobación afirmaba que la regresión no producía NINGÚN error, y era
 * verdad porque el comparador no miraba dos campos: la frase de cada paso y la
 * promesa que la persona lee antes de aprobar el gasto. B3.7 los mira, y los
 * dos faltan: el Core tiene el campo `explainToUser` y no hay una sola línea en
 * `core/` que lo escriba, y el `purpose` lo deriva del catálogo salvo que lo
 * ponga un Skill —y no hay Skills—.
 *
 * Eso NO se arregla aquí ni se esconde: se nombra. Un plan del Core que
 * sustituyera al de Legacy hoy dejaría a la persona sin las dos frases.
 */
const perdidas = erroresDeParidad([], regresion);
check('B3.7) la promesa al usuario y la frase del paso SÍ cuentan como pérdida, y se nombran',
  perdidas.some((d) => d.campo === 'explainToUser' && d.origen === 'promesa al usuario')
  && perdidas.some((d) => /\.purpose$/.test(d.campo) && d.origen === 'frase para la persona'),
  perdidas.map((d) => d.campo).join(' · '));
check('B3.7) y una arista que solo ordenaba NO cuenta: no hay nada que transportar',
  !perdidas.some((d) => d.origen === 'arista que solo ordenaba'),
  'medido sobre las 41 aristas reales: 9 no transmiten material');
check('F14) que el Core añada `produces` o un paso no es regresión',
  regresion.some((d) => /\.produces$/.test(d.campo) && d.clase === 'CORE_ADDS_INFORMATION')
  && regresion.find((d) => d.campo === 'steps.length')?.clase === 'CORE_ADDS_INFORMATION');
check('O) el comparador NO decide nada: solo informa',
  !/if \(.*legacy.*\)\s*(return|throw)|usarLegacy|preferirLegacy/.test(sinComentarios(leer('functions/src/creator/paridad.ts'))),
  'no existe «si difieren, usa Legacy»');

console.log('\n── Lo que la sombra no puede alcanzar ──');

const FUENTE = sinComentarios(leer('functions/src/creator/sombra.ts')) + sinComentarios(leer('functions/src/creator/paridad.ts'));
check('F5) ni Workflow, ni Orchestrator, ni Router, ni Job, ni Gateway',
  !/Workflow|Orchestrator|crearRouter|jobStore|JobEngine|runCapability|gateway/i.test(FUENTE));
check('F20) ni Credits, ni libro de generaciones, ni dinero',
  !/spendCredits|holdCredits|settleCredits|refund|creditEngine|aiGenerations|firestoreLedger/i.test(FUENTE));
check('F19) cero llamadas al proveedor en toda esta suite',
  peticiones === 0,
  'peticiones salientes: ' + peticiones);
check('F21/F22) no se crea ningún trabajo ni ningún material',
  !/creatorJobs'\)|collection\('assets'\)|crearMaterial/i.test(FUENTE),
  'la sombra solo escribe en la subcolección privada del trabajo que le dan');
check('F26) las reglas siguen cerrando `private` a los clientes, y no se tocaron',
  /match \/private\/\{document\} \{\s*allow read, write: if false;/.test(leer('firestore.rules')),
  'no se modificó firestore.rules');
/*
 * Ojo con esta: la primera versión comparaba los dos `indexOf` sin comprobar
 * que existieran, y `-1 < n` es verdad — así que aprobaba justo cuando el
 * guardado desaparecía. Lo encontró un sabotaje. Ahora los dos tienen que
 * estar, y en ese orden.
 */
check('la sombra se llama DESPUÉS de guardar el trabajo, no antes',
  (() => {
    const s = sinComentarios(leer('functions/src/creator/index.ts'));
    const sombra = s.indexOf('await sombraDelPlan(');
    if (sombra < 0) return false;
    /* El guardado que cuenta es el de ESTE camino: el último antes de la
       sombra, y sin ningún `return` de por medio. `creatorChat` tiene otro
       guardado en la rama de la foto, y mirarlo sin más aprobaba la prueba
       aunque el de aquí desapareciera. Lo encontró un sabotaje. */
    const guardado = s.lastIndexOf('await ref.set(clean(job))', sombra);
    return guardado >= 0 && !s.slice(guardado, sombra).includes('return ');
  })(),
  'Legacy termina primero; la sombra no puede influir en él');
check('y solo cuando hay plan',
  /if \(job\.status === 'planned' && job\.plan\) \{\s*await sombraDelPlan/.test(sinComentarios(leer('functions/src/creator/index.ts'))));
check('F27) esta suite está en la cadena de `npm test`',
  /node test\/sombra-experiencia\.test\.mjs/.test(leer('functions/package.json')));

/*
 * El cableado del canary: producción pide el entendimiento al Brain DE VERDAD.
 * El fijo de Travel sigue existiendo —lo usan estas pruebas— pero ya no lo toca
 * nadie en el flujo de experiencia, y eso es lo que se fija aquí.
 */
const INDEX = sinComentarios(leer('functions/src/creator/index.ts'));
check('el flujo de experiencia pide el entendimiento al Brain REAL',
  /entendimientoDe: entendimientoRealDelBrain\(\{/.test(INDEX)
  && /generar: \(peticion\) => engine\.generate\(peticion\)/.test(INDEX),
  'por `engine.generate`, no por un adaptador');
check('y ya no usa el fijo del Tramo 1',
  !/entendimientoDelTramo1/.test(INDEX),
  'el andamio queda solo para estas pruebas');

console.log('\n── El dinero: se apunta el coste, no se le cobra a nadie ──');

/*
 * ── QUÉ SE MIDE AQUÍ ────────────────────────────────────────────────────────
 *
 * Que una llamada de sombra al Brain real DEJE RASTRO del coste del proveedor y
 * a la vez NO le cueste Credits a la persona. Son dos cosas distintas y el
 * libro ya las separa; lo que se comprueba es que la sombra usa esa separación
 * en vez de inventarse una.
 *
 * El motor va doblado: se anota QUÉ se le pidió, sin llamar a nadie. Lo que
 * importa de esa petición son dos campos, y sobre todo uno que NO está.
 */
const peticionesAlMotor = [];
const motorDoblado = async (peticion) => {
  peticionesAlMotor.push(peticion);
  return {
    output: { kind: 'text', content: JSON.stringify(entendimientoCrudoDeTravel()) },
    usage: { inputTokens: 100, outputTokens: 50 },
    costUSD: 0.00042, latencyMs: 10, provider: 'deepseek', modelId: 'deepseek-flash',
    credits: 0, generationId: 'gen_de_prueba', demo: false, attempts: 1,
  };
};

const fuenteReal = entendimientoRealDelBrain({ userId: CUENTA_A, jobId: JOB, generar: motorDoblado });
const entendido = await fuenteReal('travel', GOAL);
const pet = peticionesAlMotor[0];

check('F14) la ruta pasa por el MOTOR: no habla con ningún adaptador',
  peticionesAlMotor.length === 1 && !!pet,
  'una sola petición al motor');
check('F13) y no existe ningún atajo al adaptador en el código de la sombra',
  !/deepseekAdapter|geminiAdapter|\.run\(\{ capability/.test(sinComentarios(leer('functions/src/creator/sombra.ts'))),
  'lo que se inyecta es el motor, no un proveedor');
check('F5/F10) `creditsEstimated: 0` — a la persona le cuesta CERO',
  pet.creditsEstimated === 0,
  'el mismo campo con el que Brain anota que 11 de cada 12 respuestas valen 0');
check('F18/F19) y NO se inventa ningún `creditTransactionId`',
  pet.creditTransactionId === undefined && !('creditTransactionId' in pet),
  'sin transacción, `settle()` se va en su primera línea y `creditsCharged` no se escribe nunca');
check('F9) el coste del proveedor sí viaja, para que quede trazable',
  typeof pet.userId === 'string' && pet.jobId === JOB && /sombra/.test(String(pet.requestId)),
  `requestId=${pet.requestId} · stepId=${pet.stepId}`);
check('F15) la operación es reconocible en el libro como sombra',
  pet.stepId === 'sombra' && pet.experienceId === 'travel');
/*
 * ── UNA SOLA VERDAD SOBRE EL MODELO Y EL TECHO ──────────────────────────────
 *
 * No se comparan contra literales escritos aquí: se comparan contra lo que
 * EXPORTA `creator/brain.ts`. Si alguien cambiara el modelo de Weë Brain, la
 * sombra lo seguiría sola y esto seguiría en verde — que es justo lo que se
 * quiere. Lo que NO puede pasar es que se separen, y eso es lo que se mide.
 */
check('F37) la sombra usa el techo de salida OFICIAL de Weë Brain',
  pet.input.maxOutputTokens === BRAIN_MAX_OUTPUT_TOKENS,
  `el mismo que produce el chat: ${BRAIN_MAX_OUTPUT_TOKENS}`);
check('F37) y ese techo sigue siendo 1400, sin tocar',
  BRAIN_MAX_OUTPUT_TOKENS === 1400);
check('y habla con el modelo OFICIAL de Weë Brain, no con uno suyo',
  pet.prefs.modelId === MODELO_DE_BRAIN && igual(pet.prefs.allowedProviders, ['deepseek']),
  `modelo=${MODELO_DE_BRAIN} · el proveedor se nombra explícitamente, como hace el chat`);
check('no hay forma de pedirle otro modelo ni otro techo: no existe ese parámetro',
  !/modelo\s*[:?]\s*string|maxOutputTokens\s*[:?]\s*number/.test(
    /export interface BrainRealParaLaSombra \{[\s\S]*?\n\}/.exec(leer('functions/src/creator/sombra.ts'))[0]),
  'se leen de `creator/brain.ts`; no se reciben');
check('ni se repiten en ninguna parte de la sombra',
  !/deepseek-flash|1400|BRAIN_TEXT_MODEL/.test(sinComentarios(leer('functions/src/creator/sombra.ts'))),
  'cero literales duplicados');
check('la capacidad pedida es ENTENDER, nunca generar contenido',
  pet.capability === 'text.generate');
check('F10) el parser real produce un BrainUnderstanding válido',
  !!entendido && entendido.intent === 'planning' && (entendido.steps ?? []).length === 2,
  'sin normalizar nada a mano: `crearBrain().entender()` entero');

/*
 * Y la otra mitad: que la sombra no pueda cobrar aunque quisiera. No hay
 * ninguna palabra de dinero en su código ni en el del comparador.
 */
const DINERO = /spendCredits|holdCredits|settleCredits|refund|creditEngine|Payment|wallet|balance|creditsCharged|creditTransactionId\s*:/i;
check('F3/F20) ni la sombra ni el comparador saben cobrar',
  !DINERO.test(sinComentarios(leer('functions/src/creator/sombra.ts')))
  && !DINERO.test(sinComentarios(leer('functions/src/creator/paridad.ts'))),
  'F11/F12: no hay wallet de sombra ni contabilidad de sombra');
check('F20) y el Financial Core no se tocó',
  !/creator\/sombra|creator\/paridad/.test(leer('functions/src/credits/creditEngine.ts')),
  'la solución vive dentro de la frontera que ya existía');
check('F17) una operación de sombra no puede volverse facturable por accidente',
  (() => {
    /* Para cobrar hacen falta las dos: un importe y una transacción. La sombra
       fija la primera en cero y no aporta la segunda. */
    const conDinero = peticionesAlMotor.filter((p) => (p.creditsEstimated ?? 0) > 0 || p.creditTransactionId);
    return conDinero.length === 0;
  })(),
  'sin importe y sin transacción no hay cobro que repartir');
check('F16) y el libro conserva su propia trazabilidad, que no es de la sombra',
  /providerCost, USD\) separado de los Credits cobrados/.test(leer('functions/src/engine/ledger.ts'))
  && /creditsCharged NO se inicializa/.test(leer('functions/src/engine/ledger.ts')),
  'la separación coste-del-proveedor ≠ cobro ya estaba escrita; se reutiliza');
check('F1/F2) con la puerta cerrada no se pide nada al motor',
  await (async () => {
    const antes = peticionesAlMotor.length;
    const db = new BaseFalsa();
    const r = await sinLanzar({
      jobRef: db.collection('creatorJobs').doc(JOB), jobId: JOB, userId: CUENTA_A,
      experienceId: 'travel', goal: GOAL, legacyPlan: await planDeLegacy(),
      puerta: undefined, entendimientoDe: fuenteReal,
      disponibilidad: disponibilidadDelCatalogo(), ahora: () => 1000, observar: () => {},
    });
    return r.escrita === false && r.estado === 'no_corre' && peticionesAlMotor.length === antes && db.escrituras.length === 0;
  })(),
  'apagada: cero peticiones al motor, cero filas en el libro, cero escrituras');
check('F4) y con la puerta abierta, la sombra pide UNA y solo una',
  await (async () => {
    const antes = peticionesAlMotor.length;
    const db = new BaseFalsa();
    const r = await sinLanzar({
      jobRef: db.collection('creatorJobs').doc(JOB), jobId: JOB, userId: CUENTA_A,
      experienceId: 'travel', goal: GOAL, legacyPlan: await planDeLegacy(),
      puerta: ABIERTA, entendimientoDe: fuenteReal,
      disponibilidad: disponibilidadDelCatalogo(), ahora: () => 1000, observar: () => {},
    });
    return peticionesAlMotor.length === antes + 1 && r.escrita === true && r.estado === 'ok';
  })(),
  'una petición al motor por sombra: la fila del libro sería una');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B3.7.1 · Los dos caminos, y que no se contaminan ──');

/*
 * La sombra construye AHORA dos planes del Core y los guarda por separado:
 *
 *   `coreDesdeBrain`   plantilla → Brain → entendimiento → Planner
 *   `coreDesdePuente`  plan de Legacy → puente → BrainStep → Planner
 *
 * No es un capricho de formato. Por el camino del Brain la CANTIDAD no llega
 * nunca —Brain no la produce, y es deliberado—, así que medir solo ese camino
 * daba 0/20 y se leía como «el Planner pierde la cantidad». Por el puente llega
 * entera. Las dos preguntas son válidas y son distintas; mezclarlas producía
 * una respuesta falsa.
 */
{
  const dos = await correr();
  const s = dos.sombra;
  check('B3.7.1) la sombra guarda los DOS planes del Core, cada uno con su origen',
    s?.coreDesdeBrain?.origen === 'brain' && s?.coreDesdePuente?.origen === 'puente'
    && typeof s.coreDesdeBrain.status === 'string' && typeof s.coreDesdePuente.status === 'string',
    `brain=${s?.coreDesdeBrain?.status} puente=${s?.coreDesdePuente?.status}`);
  check('B3.7.1) y las dos comparaciones viven separadas: una no puede tapar a la otra',
    !!s?.regresion && !!s?.regresionDesdePuente && !!s?.errores && !!s?.erroresDesdePuente
    && s.regresionDesdePuente.diferencias?.every((d) => d.camino === 'puente') === true
    && s.regresion.diferencias?.every((d) => d.camino === 'brain') === true,
    'cada diferencia lleva marcado de qué camino viene');
  check('B3.7.1) `core` sigue significando lo de siempre: el camino del Brain',
    s?.core !== undefined && s.core.status === s?.coreDesdeBrain?.status && s.core.pasos === s?.coreDesdeBrain?.pasos,
    'las sombras ya escritas siguen queriendo decir lo mismo');
}

/*
 * ── LA PRUEBA QUE IMPORTA: QUE NO SE COPIEN LA CANTIDAD ────────────────────
 *
 * Un plan de Legacy que pide CUATRO. El entendimiento del Brain, falso a
 * propósito, no dice nada de cantidades. Si alguna vez alguien «arreglara» la
 * paridad copiando la cantidad de Legacy al plan del Brain, esto se pondría
 * rojo — y con razón, porque la medición dejaría de medir nada.
 */
{
  const planCuatro = {
    experience: 'design', goal: GOAL, explainToUser: 'Voy a crear 4 propuestas.',
    steps: [{ id: 'images', capability: 'image.generate', purpose: 'Crear 4 propuestas', input: { count: 4, kind: 'logo', brief: 'cuatro logos' } }],
  };
  const sinCantidad = async () => ({
    intent: 'creation', confidence: 'high', goal: GOAL,
    capability: 'image.generate', capabilities: ['image.generate'],
    steps: [{ key: 'images', capability: 'image.generate', input: { kind: 'logo', brief: 'cuatro logos' } }],
    inputs: { text: GOAL, attachments: [] }, references: [], constraints: {},
    needsPlanning: true, missing: [], assumptions: [],
  });
  const db = new BaseFalsa();
  await sinLanzar({
    jobRef: db.collection('creatorJobs').doc(JOB), jobId: JOB, userId: CUENTA_A,
    experienceId: 'design', goal: GOAL, legacyPlan: planCuatro, puerta: ABIERTA,
    entendimientoDe: sinCantidad, disponibilidad: disponibilidadDelCatalogo(),
    ahora: () => 1000, observar: () => {},
  });
  const s = db.docs.get(`creatorJobs/${JOB}/private/${CLAVE_DE_LA_SOMBRA}`);
  check('B3.7.1) Legacy pide 4 · el camino del Brain NO lo inventa',
    s?.coreDesdeBrain?.cantidades?.every((c) => c.endsWith('=-')) === true,
    JSON.stringify(s?.coreDesdeBrain?.cantidades));
  check('B3.7.1) …y el camino del puente SÍ lo conserva: 4',
    s?.coreDesdePuente?.cantidades?.some((c) => c.endsWith('=4')) === true,
    JSON.stringify(s?.coreDesdePuente?.cantidades));
  check('B3.7.1) la cantidad ausente del Brain NO se le apunta como pérdida al Planner',
    s?.regresion?.diferencias?.some((d) => /\.count$/.test(d.campo) && d.origen === ORIGEN_SIN_TRANSPORTE) === true
    && s?.errores?.some((d) => /\.count$/.test(d.campo)) === false,
    'se clasifica y se cuenta; lo que no se hace es culpar al sitio equivocado');
  check('B3.7.1) y por el puente la cantidad no es ninguna diferencia: coincide',
    s?.regresionDesdePuente?.diferencias?.some((d) => /\.count$/.test(d.campo) && d.clase === 'EXACT_MATCH') === true,
    'el mismo campo, el mismo plan de Legacy, otro camino');
  check('B3.7.1) los dos siguen perdiendo lo mismo: la frase del paso y la promesa al usuario',
    [s?.errores, s?.erroresDesdePuente].every((e) => Array.isArray(e) && e.some((d) => d.campo === 'explainToUser') && e.some((d) => /\.purpose$/.test(d.campo))),
    'el GAP no lo arregla cambiar de camino');
}

/*
 * Y una cantidad imposible NO se encoge por venir de Legacy: el puente la copia
 * tal cual y el Planner tumba el plan, con lo que la sombra registra que por
 * ese camino no hay plan. Es lo contrario de lo que hacen hoy los seis recortes
 * del precio y los adaptadores, y ese contraste es justamente lo que G13.6
 * tendrá que cerrar.
 */
const porElPuente = async (cantidad) => {
  const db = new BaseFalsa();
  await sinLanzar({
    jobRef: db.collection('creatorJobs').doc(JOB), jobId: JOB, userId: CUENTA_A,
    experienceId: 'design', goal: GOAL, puerta: ABIERTA,
    legacyPlan: { experience: 'design', goal: GOAL, explainToUser: 'x',
      steps: [{ id: 'images', capability: 'image.generate', purpose: 'p', input: { count: cantidad, kind: 'logo' } }] },
    entendimientoDe: async () => undefined, disponibilidad: disponibilidadDelCatalogo(),
    ahora: () => 1000, observar: () => {},
  });
  return db.docs.get(`creatorJobs/${JOB}/private/${CLAVE_DE_LA_SOMBRA}`)?.coreDesdePuente;
};

for (const [cantidad, comoSeLlama] of [[5, 'se pasa del techo'], [3.7, 'decimal'], [0, 'cero'], [-1, 'negativo']]) {
  const c = await porElPuente(cantidad);
  check(`B3.7.1) count=${JSON.stringify(cantidad)} por el puente → el plan NO sale, y no se encoge`,
    c?.status === 'invalid' && c?.pasos === 0,
    `${comoSeLlama} · status=${c?.status}`);
}

/*
 * ── B3.7.2 · UNA CANTIDAD MAL ESCRITA NO PUEDE DESAPARECER EN EL CAMINO ────
 *
 * B3.7.1 midió esto de punta a punta y encontró el filo: con un `"3"` de texto,
 * el puente lo descartaba —«no es una cantidad equivocada sino la ausencia de
 * una»— y el plan salía LISTO sin cantidad, mientras el precio de Legacy hacía
 * `Number("3")` y cobraba tres. Los dos lados discrepaban en silencio.
 *
 * Ahora hay dos responsabilidades y están separadas:
 *
 *   EL PUENTE   el TRANSPORTE. Si Legacy declara una cantidad, tiene que ser un
 *               número. Si no lo es, no hay pasos y se dice por qué.
 *   EL PLANNER  el SENTIDO. Entero, al menos uno, no más que el techo.
 *
 * Ninguno convierte nada. El puente no sabe cuánto vale el techo y no le hace
 * falta; el Planner no sabe de dónde vino el plan y tampoco le hace falta.
 */
for (const [cantidad, comoSeLlama] of [
  ['3', 'texto que parece número'], ['tres', 'texto'], [true, 'booleano'], [false, 'booleano'],
  [null, 'nulo'], [{}, 'objeto'], [[], 'lista'],
]) {
  const c = await porElPuente(cantidad);
  check(`B3.7.2) count=${JSON.stringify(cantidad)} NO cruza: el transporte falla cerrado`,
    c?.status === 'invalid' && c?.pasos === 0
    && c?.rechazos?.length === 1 && c.rechazos[0].motivo === 'invalid_request'
    && /\.input\.count$/.test(c.rechazos[0].campo),
    `${comoSeLlama} · ${c?.rechazos?.[0]?.evidencia ?? '(sin rechazo)'}`);
  check('B3.7.2)   …y no se convierte en nada: ni en 3, ni en 1, ni en una ausencia',
    c?.cantidades?.length === 0 && c.status !== 'ready',
    'el plan no existe, así que no hay nada que cobrar ni que ejecutar');
}

check('B3.7.1) el camino del puente no le pide nada a nadie: corre aunque el Brain falle',
  await (async () => {
    const antes = peticionesAlMotor.length;
    const db = new BaseFalsa();
    await sinLanzar({
      jobRef: db.collection('creatorJobs').doc(JOB), jobId: JOB, userId: CUENTA_A,
      experienceId: 'travel', goal: GOAL, legacyPlan: await planDeLegacy(), puerta: ABIERTA,
      entendimientoDe: async () => undefined, disponibilidad: disponibilidadDelCatalogo(),
      ahora: () => 1000, observar: () => {},
    });
    const s = db.docs.get(`creatorJobs/${JOB}/private/${CLAVE_DE_LA_SOMBRA}`);
    return peticionesAlMotor.length === antes && s?.estado === 'sin_entendimiento' && s?.coreDesdePuente?.status === 'ready';
  })(),
  'determinista y gratis: sin modelo, sin red, sin un solo Credit');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── S1 · El tercer camino: el Algorithm Engine, en sombra ──');

/*
 * ── QUÉ SE PONE A PRUEBA ────────────────────────────────────────────────────
 *
 * La canary de Travel tal y como se abriría el día que se abra: dos caminos
 * —el del puente y el del algoritmo—, SIN el del Brain, y cerrada por cuenta,
 * por experiencia, por capacidad y por plazo. Y lo que de verdad importa: que
 * el algoritmo decide sin que nada fuera de `private/sombra` se entere.
 *
 * Los ciclos «de mentira» de aquí abajo no son otro algoritmo: son el de
 * verdad, con UNA cosa cambiada en lo que devuelve, para ver que la sombra lo
 * nota. Es la forma de probar los bordes sin tocar el Algorithm Engine.
 */
const {
  seccionDelAlgoritmo, peticionDeLaSombra, seccionPresentable, CATEGORIAS_DE_LA_COMPARACION, CAMINOS_POR_DEFECTO, CONTRATO_DE_LA_SOMBRA,
} = lib('creator/sombra.js');
const { crearCicloAlgoritmico, violacionesEn } = lib('core/algorithm/index.js');
const { ALGORITHM_CONTRACT_VERSION } = lib('core/contracts.js');
const { PLANNER_CONTRACT_VERSION } = lib('core/index.js');

const CANARY = Object.freeze({
  habilitado: true, cuentas: [CUENTA_A], experiencias: ['travel'],
  caminos: ['puente', 'algoritmo'], capacidades: ['text.search'],
});
const RUTA_DE_LA_SOMBRA = `creatorJobs/${JOB}/private/${CLAVE_DE_LA_SOMBRA}`;
const FUENTE_S = sinComentarios(leer('functions/src/creator/sombra.ts'));
/* Todo lo que la sombra carga, en cualquiera de sus formas: `from`, `import '…'`, `import(…)`, `require(…)`. */
const especificadores = (fuente) =>
  [...fuente.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)(['"])([^'"]+)\1/g)].map((m) => m[2]);
const clavesDe = (v, out = new Set()) => {
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.add(k); clavesDe(x, out); }
  return out;
};
const planDe = async (exp) => {
  const t = TEMPLATES[exp];
  const respuestas = Object.fromEntries((t.questions ?? []).filter((q) => q.options?.length).map((q) => [q.id, q.options[0].id]));
  return t.buildPlan(t.defaultGoal, respuestas);
};
/* El ciclo de verdad, con una sola cosa cambiada en lo que devuelve. */
const cicloQue = (cambiar) => () => ({
  decidir: (p) => { const r = clonar(crearCicloAlgoritmico().decidir(p)); cambiar(r); return r; },
});

const correrCanary = async (extra = {}) => {
  const db = extra.db ?? new BaseFalsa();
  const jobRef = extra.jobRef ?? db.collection('creatorJobs').doc(JOB);
  const job = {
    id: JOB, userId: CUENTA_A, experienceId: 'travel', goal: GOAL, status: 'planned',
    plan: await planDeLegacy(), creditsEstimated: 3, answers: [{ questionId: 'what', optionId: 'plan' }],
  };
  const antesDelJob = clonar(job);
  const redAntes = peticiones;
  let llamadasAlBrain = 0;
  const logs = [];
  const resto = { ...extra };
  delete resto.db;
  delete resto.jobRef;
  let salida;
  let lanzo = null;
  try {
    salida = await sombraDelPlan({
      jobRef, jobId: job.id, userId: job.userId, experienceId: job.experienceId,
      goal: job.goal, legacyPlan: job.plan, puerta: CANARY,
      entendimientoDe: async () => { llamadasAlBrain++; return entendimientoDePruebaDeTravel(GOAL); },
      disponibilidad: disponibilidadDelCatalogo(), ahora: () => 1000, observar: (l) => logs.push(l),
      ...resto,
    });
  } catch (e) { lanzo = e; }
  return {
    db, job, antesDelJob, salida, lanzo, llamadasAlBrain, logs,
    red: peticiones - redAntes,
    sombra: db.docs.get(RUTA_DE_LA_SOMBRA),
    privadas: [...db.docs.keys()].filter((p) => p.includes('/private/')).length,
  };
};
/* Legacy sigue: la sombra no lanzó y el trabajo no cambió ni un byte. */
const legacyIntacto = (r) => r.lanzo === null && igual(r.job, r.antesDelJob);
const soloSuDocumento = (r) => r.db.escrituras.every((e) => e.path === RUTA_DE_LA_SOMBRA);

/* ── 1–4 · La puerta ─────────────────────────────────────────────────────── */
{
  const cerrada = await correrCanary({ puerta: undefined });
  const apagada = await correrCanary({ puerta: { ...CANARY, habilitado: false } });
  check('S1-1) puerta cerrada: nada corre, nada se escribe, nadie llama a nadie',
    [cerrada, apagada].every((r) => r.salida?.estado === 'no_corre' && r.db.escrituras.length === 0
      && r.llamadasAlBrain === 0 && r.red === 0 && r.salida?.algoritmo === undefined && legacyIntacto(r))
    && cerrada.salida?.motivo === 'sin_configuracion' && apagada.salida?.motivo === 'deshabilitada',
    `${cerrada.salida?.motivo} · ${apagada.salida?.motivo}`);
}
const canary = await correrCanary();
check('S1-2) puerta abierta para la canary: el algoritmo decide y la sombra queda escrita',
  canary.salida?.escrita === true && canary.salida?.algoritmo === 'decidido' && canary.sombra?.algoritmo?.estado === 'decidido',
  `estado=${canary.salida?.estado} algoritmo=${canary.salida?.algoritmo}`);
{
  const ajena2 = await correrCanary({ userId: CUENTA_B });
  check('S1-3) cuenta no autorizada: cerrada, sin escribir y sin planificar',
    ajena2.salida?.estado === 'no_corre' && ajena2.salida?.motivo === 'cuenta_fuera_de_la_prueba'
    && ajena2.db.escrituras.length === 0 && ajena2.llamadasAlBrain === 0,
    ajena2.salida?.motivo);
  const d = decidirSombra(CANARY, { userId: CUENTA_A, experienceId: 'travel', capacidades: ['text.search'], ahora: 1 });
  check('S1-4) cuenta autorizada: abre, con los dos caminos de la canary y en su orden',
    d.sombra === true && d.motivo === 'abierta' && igual(d.caminos, ['puente', 'algoritmo']),
    JSON.stringify(d));
  check('S1) SIN COMODÍN: ni «*» ni «todos» abren la canary a nadie más',
    ['*', 'todos', 'all', 'everyone'].every((x) =>
      !decidirSombra({ ...CANARY, cuentas: [x] }, { userId: CUENTA_B, experienceId: 'travel', capacidades: ['text.search'], ahora: 1 }).sombra),
    'la lista nombra cuentas, una a una');
}

/* ── 5 · Travel, entero ──────────────────────────────────────────────────── */
{
  const s = canary.sombra;
  const a = s?.algoritmo;
  check('S1-5) TRAVEL: decidido · 0 violaciones · historial ninguno · 0 proveedor · 0 Credits · 0 materiales · 0 cambios en el trabajo · 1 sombra privada',
    a?.estado === 'decidido' && a?.violaciones === 0 && a?.decision?.historial === 'ninguno'
    && canary.red === 0 && canary.llamadasAlBrain === 0
    && canary.job.creditsEstimated === canary.antesDelJob.creditsEstimated
    && !canary.db.escrituras.some((e) => /assets|content|media|aiGenerations|creditTransactions/i.test(e.path))
    && igual(canary.job, canary.antesDelJob) && !canary.db.escrituras.some((e) => e.path === `creatorJobs/${JOB}`)
    && canary.privadas === 1 && canary.db.escrituras.length === 1 && canary.db.escrituras[0]?.path === RUTA_DE_LA_SOMBRA,
    `estado=${a?.estado} violaciones=${a?.violaciones} historial=${a?.decision?.historial} red=${canary.red} brain=${canary.llamadasAlBrain} escrituras=${canary.db.escrituras.length}`);
  check('S1-5) contrato 1.2, los caminos que corrieron, y el del Brain OMITIDO sin dejar rastro',
    s?.contract === '1.2' && CONTRATO_DE_LA_SOMBRA === '1.2' && igual(s?.caminos, ['puente', 'algoritmo']) && s?.estado === 'omitido'
    && s !== undefined && ['core', 'coreDesdeBrain', 'autoridad', 'regresion', 'errores'].every((k) => !(k in s))
    && s?.coreDesdePuente?.status === 'ready' && !!s?.regresionDesdePuente,
    `caminos=${JSON.stringify(s?.caminos)} estado=${s?.estado}`);
  check('S1-5) la sección habla el contrato del algoritmo y se identifica por su trabajo',
    a?.contract === '1.9' && a?.contract === ALGORITHM_CONTRACT_VERSION && a?.shadowRunId === `${JOB}:algoritmo`
    && igual(a?.objetivo, { latency: 1, reliability: 1 })
    && a?.entrada?.pasos === 1 && igual(a?.entrada?.capacidades, ['text.search']) && a?.entrada?.aristas === 0,
    `shadowRunId=${a?.shadowRunId}`);
  check('S1-5) lo elegido: la línea base en fila, con los MISMOS pasos que el plan del Core',
    a?.decision?.status === 'decided' && a?.decision?.elegida?.pasos === 1 && a?.decision?.elegida?.esLineaBase === true
    && a?.decision?.elegida?.esRespaldo === false && a?.decision?.elegida?.pasosIgualesAlPlanDelCore === true
    && igual(a?.decision?.elegida?.gruposParalelos, []) && igual(a?.decision?.elegida?.caminoCritico, ['s1-text_search'])
    && a?.decision?.candidatas >= 1 && Array.isArray(a?.decision?.descartadas) && a?.decision?.optimizacion?.factibles >= 1
    && typeof a?.decision?.confianza?.valor === 'number' && typeof a?.decision?.incertidumbre === 'string'
    && Array.isArray(a?.decision?.porque) && a.decision.porque.every((p) => p.length <= 240),
    `${a?.decision?.elegida?.label} · ${a?.decision?.elegida?.proposedBy}`);
  check('S1) el aviso dice cómo acabó el algoritmo, sin decir nada de la persona',
    canary.logs.some((l) => /WEË SOMBRA: termina .*algoritmo=decidido .*violaciones=0/.test(l)) && !canary.logs.some((l) => l.includes(GOAL)),
    canary.logs.find((l) => /termina/.test(l)) ?? '(sin aviso)');
}

/* ── 6–8 · Lo que no llega a decidir, y lo que tarda ──────────────────────── */
const malaCantidad = await correrCanary({
  legacyPlan: { experience: 'travel', goal: GOAL, explainToUser: 'x',
    steps: [{ id: 'itinerary', capability: 'text.search', purpose: 'p', input: { kind: 'itinerary', count: '3' } }] },
});
check('S1-6) una cantidad mal formada no cruza el puente, y el algoritmo no tiene sobre qué decidir',
  malaCantidad.sombra?.coreDesdePuente?.status === 'invalid' && malaCantidad.sombra?.algoritmo?.estado === 'sin_plan_del_core'
  && malaCantidad.sombra?.algoritmo?.decision === null && malaCantidad.salida?.algoritmo === 'sin_plan_del_core' && legacyIntacto(malaCantidad),
  `puente=${malaCantidad.sombra?.coreDesdePuente?.status} algoritmo=${malaCantidad.sombra?.algoritmo?.estado}`);
const planMusica = await planDe('music');
const musicaCerrada = await correrCanary({ experienceId: 'music', legacyPlan: planMusica });
const musica = await correrCanary({
  experienceId: 'music', legacyPlan: planMusica,
  puerta: { habilitado: true, cuentas: [CUENTA_A], caminos: ['puente', 'algoritmo'] },
});
check('S1-7) Weë Music: la canary no la abre, y sin filtros el Core no la sirve: no hay decisión',
  musicaCerrada.salida?.motivo === 'experiencia_fuera_de_la_prueba' && musicaCerrada.db.escrituras.length === 0
  && musica.sombra?.coreDesdePuente?.status === 'unsupported' && musica.sombra?.algoritmo?.estado === 'sin_plan_del_core'
  && legacyIntacto(musica),
  `canary=${musicaCerrada.salida?.motivo} · sin filtros: puente=${musica.sombra?.coreDesdePuente?.status} algoritmo=${musica.sombra?.algoritmo?.estado}`);
const tics = [0, 300];
const lenta = await correrCanary({ cronometro: () => (tics.length ? tics.shift() : 300) });
{
  const a = lenta.sombra?.algoritmo;
  check('S1-8) más de 250 ms: `fuera_de_presupuesto`, sin lanzar, y la evidencia se guarda igual',
    a?.estado === 'fuera_de_presupuesto' && a?.duracionMs === 300 && a?.comparacion?.total > 0
    && a?.decision?.status === 'decided' && lenta.salida?.algoritmo === 'fuera_de_presupuesto' && legacyIntacto(lenta),
    `duracionMs=${a?.duracionMs} estado=${a?.estado}`);
  const justo = [0, 250];
  const enElTope = await correrCanary({ cronometro: () => (justo.length ? justo.shift() : 250) });
  check('S1-8) y 250 exactos todavía caben: el tope es «más de»',
    enElTope.sombra?.algoritmo?.estado === 'decidido' && enElTope.sombra?.algoritmo?.duracionMs === 250,
    `duracionMs=${enElTope.sombra?.algoritmo?.duracionMs}`);
}

/* ── 9–10 · Una sola sombra, y siempre la misma decisión ─────────────────── */
{
  const db = new BaseFalsa();
  const real = db.collection('creatorJobs').doc(JOB);
  const ciego = new Proxy(real, {
    get: (t, k) => (k === 'collection'
      ? (sub) => ({ doc: (id) => new Proxy(t.collection(sub).doc(id), { get: (r, j) => (j === 'get' ? async () => ({ exists: false, data: () => undefined }) : Reflect.get(r, j).bind(r)) }) })
      : Reflect.get(t, k)),
  });
  const a = await correrCanary({ db, jobRef: ciego });
  const b = await correrCanary({ db, jobRef: ciego });
  const creadas = db.escrituras.filter((e) => e.path === RUTA_DE_LA_SOMBRA).length;
  check('S1-9) CARRERA: una sola sombra; la que pierde es `duplicado`, no `fallo`, y no deja nada',
    a.salida?.escrita === true && a.salida?.algoritmo === 'decidido'
    && b.salida?.escrita === false && b.salida?.estado === 'duplicado' && b.salida?.algoritmo === 'duplicado'
    && creadas === 1 && db.escrituras.length === 1 && legacyIntacto(b)
    && b.logs.some((l) => /duplicada/.test(l)) && !b.logs.some((l) => /falla/.test(l)),
    `a=${a.salida?.estado}/${a.salida?.algoritmo} b=${b.salida?.estado}/${b.salida?.algoritmo} creadas=${creadas}`);
}
{
  const sinReloj = (s) => { const c = clonar(s ?? {}); delete c.creadaEn; if (c.algoritmo) delete c.algoritmo.duracionMs; return c; };
  const uno = await correrCanary();
  const dos = await correrCanary();
  const a1 = uno.sombra?.algoritmo;
  const a2 = dos.sombra?.algoritmo;
  check('S1-10) repetido, decide LO MISMO: la misma elegida, las mismas candidatas, los mismos descartes y las mismas diferencias',
    !!a1 && !!a2 && igual(sinReloj(uno.sombra), sinReloj(dos.sombra))
    && igual(a1.decision?.elegida, a2.decision?.elegida) && a1.decision?.candidatas === a2.decision?.candidatas
    && igual(a1.decision?.descartadas, a2.decision?.descartadas) && igual(a1.comparacion?.diferencias, a2.comparacion?.diferencias),
    'solo cambian el reloj y la duración');
}

/* ── 11–14 · Los cortafuegos ─────────────────────────────────────────────── */
{
  const peticion = peticionDeLaSombra({ jobId: JOB, userId: CUENTA_A, experienceId: 'travel',
    pasos: [{ id: 's1', capability: 'text.search', purpose: 'search (text)', input: { kind: 'itinerary', brief: GOAL }, produces: 'text' }] });
  const desde = FUENTE_S.indexOf('export const seccionDelAlgoritmo');
  const hasta = FUENTE_S.indexOf('const yaExiste');
  const cuerpo = desde >= 0 && hasta > desde ? FUENTE_S.slice(desde, hasta) : '';
  check('S1-11) PROVEEDOR: cero peticiones de red, cero llamadas al Brain, y nada en la petición que nombre una implementación',
    canary.red === 0 && canary.llamadasAlBrain === 0 && violacionesEn(peticion, 'peticion').length === 0
    && cuerpo.length > 0 && !/generar|entendimientoDe|fetch\(|engine|[Aa]dapter/.test(cuerpo),
    `red=${canary.red} brain=${canary.llamadasAlBrain}`);
}
check('S1-12) CREDITS: ni un import del dinero en la sombra, y ninguna escritura fuera de su documento',
  !especificadores(FUENTE_S).some((m) => /(^|\/)(credits|financial|settlement|payments)(\/|$)/.test(m))
  && !DINERO.test(FUENTE_S) && soloSuDocumento(canary) && canary.job.creditsEstimated === 3,
  'ni hold, ni settle, ni refund, ni PaymentIntent, ni un aiGeneration de más');
check('S1-13) MATERIALES: ni Asset Core, ni Content, ni Media, ni Storage, y ninguna escritura en `assets`',
  !especificadores(FUENTE_S).some((m) => /(^|\/)(content|media|storage|assets)(\/|$)/.test(m))
  && !/collection\('assets'\)|crearMaterial|getStorage|bucket\(/.test(FUENTE_S) && soloSuDocumento(canary),
  especificadores(FUENTE_S).join(' · '));
check('S1-14) ROUTER: la sombra no carga ningún router, no arma una RouterRequest y no usa paraRouter',
  !especificadores(FUENTE_S).some((m) => /router/i.test(m))
  && !/RouterRequest|paraRouter|crearRouter|elegirProveedor/.test(FUENTE_S),
  especificadores(FUENTE_S).filter((m) => /router/i.test(m)).join(' · ') || 'ningún módulo de router');
check('S1) y lo único del Algorithm Engine que entra es su puerta: el ciclo, la guarda y los topes',
  especificadores(FUENTE_S).filter((m) => /algorithm/.test(m)).every((m) => m === '../core/algorithm')
  && /import \{ TOPES_POR_DEFECTO, crearCicloAlgoritmico, violacionesEn \} from '\.\.\/core\/algorithm';/.test(FUENTE_S),
  especificadores(FUENTE_S).filter((m) => /algorithm/.test(m)).join(' · '));

/* ── 15–17 · Ámbito, historial y comparación ─────────────────────────────── */
{
  const p = peticionDeLaSombra({ jobId: 'job_X', userId: 'cuenta_X', experienceId: 'travel',
    pasos: [{ id: 's1', capability: 'text.search', purpose: 'search (text)', input: { kind: 'itinerary', brief: GOAL }, produces: 'text' }] });
  const d = p.algoritmo.decision;
  const claves = [...clavesDe(p.algoritmo)];
  check('S1-15) ÁMBITO: la petición es de ESE trabajo y de ESA cuenta, y de nada más',
    p.shadowRunId === 'job_X:algoritmo' && igual(p.scope, { jobId: 'job_X', userId: 'cuenta_X', experienceId: 'travel' })
    && d.trace.traceId === 'job_X' && d.trace.requestId === 'job_X:algoritmo' && d.trace.userId === 'cuenta_X'
    && p.algoritmo.tarea.id === 'job_X:puente' && !('goal' in p.algoritmo.tarea)
    && !['aprendido', 'history', 'historyByOption', 'options', 'enfoques', 'expected', 'constraints', 'signals', 'brief', 'goal'].some((k) => claves.includes(k))
    && igual(p.contracts, { sombra: '1.2', algoritmo: ALGORITHM_CONTRACT_VERSION, planner: PLANNER_CONTRACT_VERSION })
    && !JSON.stringify(p).includes(GOAL),
    claves.filter((k) => !/^\d+$/.test(k)).join(','));
  const otra = await correrCanary({ userId: CUENTA_B, puerta: { ...CANARY, cuentas: [CUENTA_B] } });
  check('S1-15) y dos cuentas no se mezclan: cada sombra lleva su cuenta y su trabajo',
    otra.sombra?.userId === CUENTA_B && canary.sombra?.userId === CUENTA_A
    && otra.sombra?.algoritmo?.shadowRunId === `${JOB}:algoritmo` && otra.sombra?.jobId === JOB,
    `${canary.sombra?.userId} / ${otra.sombra?.userId}`);
  check('S1-15) la petición no se guarda: de ella solo queda el `shadowRunId`',
    canary.sombra?.algoritmo !== undefined
    && !['scope', 'contracts', 'tarea', 'decisionContext', 'peticion', 'trace', 'steps'].some((k) => clavesDe(canary.sombra.algoritmo).has(k)),
    'en memoria, nunca en Firestore');
}
{
  const conHistorial = await correrCanary({ crearCiclo: cicloQue((r) => { r.historial = { sampleSize: 12, successRate: 0.9 }; }) });
  check('S1-16) HISTORIAL: ninguno — y el campo MIDE, no está escrito a mano',
    canary.sombra?.algoritmo?.decision?.historial === 'ninguno'
    && conHistorial.sombra?.algoritmo?.decision?.historial === 'presente',
    `canary=${canary.sombra?.algoritmo?.decision?.historial} · con historial inyectado=${conHistorial.sombra?.algoritmo?.decision?.historial}`);
  check('S1-16) y NO aprende: la sombra no cierra el ciclo ni guarda nada para la próxima decisión',
    !/\.cerrar\(|aprendido|historyByOption|AgregadoDeAprendizaje|previo\s*:/.test(FUENTE_S),
    'sin A7, sin historyByOption, sin persistencia de lo aprendido');
}
{
  const a = canary.sombra?.algoritmo;
  const c = a?.comparacion;
  const dif = c?.diferencias ?? [];
  const sumas = Object.fromEntries(Object.keys(c?.resumen ?? {}).map((k) => [k, c.categorias?.[k]]));
  check('S1-17) COMPARACIÓN: las 8 categorías, cada diferencia marcada `algoritmo`, y el resumen cuadra',
    igual(Object.keys(c?.categorias ?? {}), [...CATEGORIAS_DE_LA_COMPARACION]) && CATEGORIAS_DE_LA_COMPARACION.length === 8
    && dif.length > 0 && dif.every((d) => d.camino === 'algoritmo') && igual(sumas, c?.resumen)
    && c?.total >= dif.length && c?.categorias?.AUTHORITY_VIOLATION === 0 && c?.categorias?.SHADOW_ERROR === 0,
    JSON.stringify(c?.categorias));
  check('S1-17) los dos ejes: Legacy frente a lo elegido, y el plan del Core frente a la decisión',
    dif.some((d) => d.campo === 'steps[itinerary].capability' && d.clase === 'EXACT_MATCH')
    && dif.some((d) => d.campo === 'algoritmo.steps[s1-text_search]' && d.clase === 'EXACT_MATCH')
    && dif.some((d) => d.campo === 'algoritmo.paralelizacion' && d.clase === 'SEMANTICALLY_EQUIVALENT')
    && ['algoritmo.estrategia', 'algoritmo.candidatas', 'algoritmo.objetivo', 'algoritmo.optimizacion']
      .every((k) => dif.some((d) => d.campo === k && d.clase === 'CORE_ADDS_INFORMATION'))
    && ['algoritmo.pasos', 'algoritmo.orden', 'algoritmo.dependencias', 'algoritmo.restricciones', 'algoritmo.autoridad']
      .every((k) => dif.some((d) => d.campo === k && d.clase === 'EXACT_MATCH')),
    dif.map((d) => d.campo).join(' · ').slice(0, 200));
  check('S1-17) CORE_GAP: la frase del paso y la promesa al usuario siguen contando como pérdida, y solo ellas',
    (a?.errores ?? []).some((d) => d.campo === 'explainToUser' && d.origen === 'promesa al usuario')
    && (a?.errores ?? []).some((d) => /\.purpose$/.test(d.campo) && d.origen === 'frase para la persona')
    && (a?.errores ?? []).length === 2,
    (a?.errores ?? []).map((d) => d.campo).join(' · '));
  check('S1-17) sin ganador, sin puntuación y sin ranking: se cuenta, no se juzga',
    !!a && ![...clavesDe(a)].some((k) => /winner|ganador|score|puntuaci|ranking/i.test(k)),
    'ninguna clave de veredicto en la sección');
  check('S1-17) lo que no se puede guardar no se guarda: una clave prohibida arriba, o una implementación en cualquier parte',
    seccionPresentable(a ?? { prompt: 'sin sección' }) === true
    && seccionPresentable({ ...a, prompt: 'x' }) === false && seccionPresentable({ ...a, token: 'x' }) === false
    && seccionPresentable({ ...a, decision: { elegida: { pasos: [{ input: { providerId: 'deepseek' } }] } } }) === false,
    'la observabilidad dice qué claves no; la frontera, qué implementaciones no');
  const texto = JSON.stringify(a ?? {});
  const plan = canary.job.plan;
  check('S1-17) PRIVACIDAD: la sección no guarda ni el objetivo, ni el brief, ni la frase del paso, ni la promesa',
    !!a && !texto.includes(GOAL) && !texto.includes(plan.steps[0].purpose)
    && !texto.includes(plan.explainToUser) && !texto.includes(String(plan.steps[0].input.brief))
    && /^legacy=\d+ car core=\d+ car$/.test(dif.find((d) => /\.purpose$/.test(d.campo))?.evidencia ?? '')
    && !/https?:|gs:\/\/|data:image|apiKey|token|secret|password|creditsCharged|creditTransactionId/i.test(texto),
    dif.find((d) => /\.purpose$/.test(d.campo))?.evidencia ?? '(sin frase)');
}
{
  const otraCalidad = await correrCanary({ crearCiclo: cicloQue((r) => { r.entrega.plan.steps[0].hints = { quality: 'standard' }; }) });
  const sinPasos = await correrCanary({ crearCiclo: cicloQue((r) => { r.entrega.plan.steps = []; }) });
  const aLaVez = await correrCanary({ crearCiclo: cicloQue((r) => { r.entrega.plan.parallelGroups = [{ steps: ['s1-text_search', 'otro'] }]; }) });
  const buscar = (r, campo) => r.sombra?.algoritmo?.comparacion?.diferencias?.find((d) => d.campo === campo);
  check('S1-17) SIN FALSA PARIDAD: si la decisión cambia un paso, lo quita o lo pone a la vez, se dice',
    buscar(otraCalidad, 'algoritmo.steps[s1-text_search]')?.clase === 'STRUCTURAL_MISMATCH'
    && /hints/.test(buscar(otraCalidad, 'algoritmo.steps[s1-text_search]')?.evidencia ?? '')
    && otraCalidad.sombra?.algoritmo?.decision?.elegida?.pasosIgualesAlPlanDelCore === false
    && buscar(sinPasos, 'algoritmo.pasos')?.clase === 'STRUCTURAL_MISMATCH'
    && buscar(sinPasos, 'algoritmo.steps[s1-text_search]')?.clase === 'STRUCTURAL_MISMATCH'
    && buscar(sinPasos, 'steps[itinerary]')?.clase === 'STRUCTURAL_MISMATCH'
    && buscar(aLaVez, 'algoritmo.paralelizacion')?.clase === 'STRUCTURAL_MISMATCH'
    && buscar(aLaVez, 'algoritmo.paralelizacion')?.origen === 'Legacy ejecuta en fila',
    `calidad=${buscar(otraCalidad, 'algoritmo.steps[s1-text_search]')?.evidencia} · sin pasos=${buscar(sinPasos, 'algoritmo.pasos')?.evidencia} · a la vez=${buscar(aLaVez, 'algoritmo.paralelizacion')?.evidencia}`);
  const sinDecidir = await correrCanary({ crearCiclo: cicloQue((r) => { r.status = 'undecided'; r.parada = 'undecided'; delete r.entrega; }) });
  check('S1-17) y si el ciclo no decide, se dice `no_decidido` y no se compara nada',
    sinDecidir.sombra?.algoritmo?.estado === 'no_decidido' && sinDecidir.sombra?.algoritmo?.decision?.status === 'undecided'
    && sinDecidir.sombra?.algoritmo?.decision?.elegida === null && sinDecidir.sombra?.algoritmo?.comparacion?.total === 0
    && legacyIntacto(sinDecidir),
    `estado=${sinDecidir.sombra?.algoritmo?.estado}`);
}

/* ── 18–20 · Cuando algo se rompe, Legacy sigue ──────────────────────────── */
const planQueFallaAlComparar = async () => {
  const p = await planDeLegacy();
  const promesa = p.explainToUser;
  /*
   * Falla SOLO cuando lo lee el comparador desde el tercer camino. No por el
   * número de lecturas: la primera versión contaba y se equivocó —el
   * comparador lo lee dos veces por llamada—, así que tumbaba el del puente.
   */
  return Object.defineProperty({ ...p }, 'explainToUser', {
    enumerable: true,
    get() { if (/seccionDelAlgoritmo/.test(new Error().stack ?? '')) throw new Error('el comparador explotó'); return promesa; },
  });
};
const falloDeComparacion = await correrCanary({ legacyPlan: await planQueFallaAlComparar() });
const cicloRoto = await correrCanary({ crearCiclo: () => ({ decidir: () => { throw new Error('el ciclo explotó'); } }) });
const dbRota = new BaseFalsa();
dbRota.romperCreate = true;
const sinPersistencia = await correrCanary({ db: dbRota });
const violacion = await correrCanary({ crearCiclo: cicloQue((r) => { r.entrega.plan.steps[0].input.providerId = 'deepseek'; }) });
check('S1-18) LEGACY SIGUE en todos los desenlaces: éxito, mal formada, sin soporte, lenta, comparación rota, ciclo roto, sin persistencia y autoridad',
  [canary, malaCantidad, musica, lenta, falloDeComparacion, cicloRoto, sinPersistencia, violacion].every(legacyIntacto),
  'la sombra no lanza nunca y el trabajo no cambia ni un byte');
check('S1-18) una comparación o un ciclo que se rompen dejan `fallo` en SU sección; el resto de la sombra se guarda',
  [falloDeComparacion, cicloRoto].every((r) => r.sombra?.algoritmo?.estado === 'fallo' && typeof r.sombra?.algoritmo?.fallo === 'string'
    && r.sombra.algoritmo.fallo.length <= 240 && r.sombra?.algoritmo?.comparacion?.categorias?.SHADOW_ERROR === 1
    && r.sombra?.coreDesdePuente?.status === 'ready' && r.salida?.escrita === true && r.salida?.algoritmo === 'fallo'),
  `${falloDeComparacion.sombra?.algoritmo?.fallo} · ${cicloRoto.sombra?.algoritmo?.fallo}`);
check('S1-19) PERSISTENCIA: si no se puede escribir, no se escribe nada, no se lanza, y se dice hasta dónde llegó',
  sinPersistencia.salida?.escrita === false && sinPersistencia.salida?.estado === 'fallo' && sinPersistencia.salida?.algoritmo === 'decidido'
  && sinPersistencia.db.docs.size === 0 && sinPersistencia.logs.some((l) => /WEË SOMBRA: falla/.test(l)) && legacyIntacto(sinPersistencia),
  JSON.stringify(sinPersistencia.salida));
{
  const a = violacion.sombra?.algoritmo;
  check('S1-20) AUTORIDAD: se marca, se para —sin comparación ni nada después— y Legacy sigue',
    a?.estado === 'violacion_de_autoridad' && a?.violaciones >= 1 && (a?.clavesDeImplementacion ?? []).includes('providerId')
    && a?.decision === null && a?.comparacion?.total === 0 && (a?.comparacion?.diferencias ?? [1]).length === 0
    && a?.comparacion?.categorias?.AUTHORITY_VIOLATION >= 1 && violacion.salida?.algoritmo === 'violacion_de_autoridad'
    && violacion.logs.some((l) => /VIOLACIÓN DE AUTORIDAD/.test(l)),
    `estado=${a?.estado} claves=${JSON.stringify(a?.clavesDeImplementacion)}`);
  check('S1-20) y no hay apagado automático: ni una escritura en `aiSettings`, ni un cierre global',
    violacion.db.escrituras.length === 1 && soloSuDocumento(violacion)
    && !/aiSettings'\)\.doc\([^)]*\)\.(set|update|create)|collection\(COLECCION_DE_LA_SOMBRA\)\.doc\([^)]*\)\.(set|update|create)/.test(FUENTE_S),
    'se deja constancia; decidir qué hacer es de una persona');
  const conLaDeVerdad = [
    ['providerId', { input: { kind: 'itinerary', providerId: 'deepseek' } }],
    ['model', { hints: { quality: 'max', model: 'x' } }],
    ['adapter', { input: { kind: 'itinerary', adapter: 'x' } }],
  ].map(([clave, cambio]) => [clave, seccionDelAlgoritmo({
    jobId: JOB, userId: CUENTA_A, experienceId: 'travel', legacyPlan: canary.job.plan, estadoDelPuente: 'ready',
    planDelPuente: { constraints: {}, steps: [{ id: 's1-text_search', capability: 'text.search', purpose: 'search (text)', produces: 'text', input: { kind: 'itinerary' }, ...cambio }] },
  })]);
  check('S1-20) con el ciclo de VERDAD: un paso que nombra proveedor, modelo o adaptador para la sombra en seco',
    conLaDeVerdad.every(([clave, s]) => s.estado === 'violacion_de_autoridad' && (s.clavesDeImplementacion ?? []).includes(clave) && s.comparacion.total === 0),
    conLaDeVerdad.map(([clave, s]) => `${clave}→${s.estado}`).join(' · '));
}

/* ── 21–25 · Los filtros de la puerta ────────────────────────────────────── */
{
  const otraExp = await correrCanary({ experienceId: 'writer' });
  check('S1-21) filtro de experiencia: la canary es SOLO de Travel',
    otraExp.salida?.motivo === 'experiencia_fuera_de_la_prueba' && otraExp.db.escrituras.length === 0 && otraExp.llamadasAlBrain === 0,
    otraExp.salida?.motivo);
  const base = await planDeLegacy();
  const conOtra = await correrCanary({ legacyPlan: { ...base, steps: [...base.steps, { id: 'extra', capability: 'text.generate', purpose: 'p', input: { kind: 'article' } }] } });
  const vacio = decidirSombra(CANARY, { userId: CUENTA_A, experienceId: 'travel', capacidades: [], ahora: 1 });
  const sinDecirlas = decidirSombra(CANARY, { userId: CUENTA_A, experienceId: 'travel', ahora: 1 });
  check('S1-22) filtro de capacidades: TODAS las del plan tienen que estar en la lista, y un plan vacío no pasa',
    conOtra.salida?.motivo === 'capacidad_fuera_de_la_prueba' && conOtra.db.escrituras.length === 0
    && !vacio.sombra && vacio.motivo === 'capacidad_fuera_de_la_prueba' && !sinDecirlas.sombra,
    `${conOtra.salida?.motivo} · vacío=${vacio.motivo}`);
  const caducada = await correrCanary({ puerta: { ...CANARY, hasta: 999 } });
  const enElInstante = decidirSombra({ ...CANARY, hasta: 1000 }, { userId: CUENTA_A, experienceId: 'travel', capacidades: ['text.search'], ahora: 1000 });
  const sinReloj = decidirSombra({ ...CANARY, hasta: 5000 }, { userId: CUENTA_A, experienceId: 'travel', capacidades: ['text.search'] });
  check('S1-23) `hasta` vencido: cerrada; en el instante justo todavía abre; sin reloj, cerrada',
    caducada.salida?.motivo === 'fuera_de_plazo' && caducada.db.escrituras.length === 0
    && enElInstante.sombra === true && sinReloj.sombra === false && sinReloj.motivo === 'fuera_de_plazo'
    && ['mañana', -1, 0, NaN, Infinity, '2026-10-01', null].every((h) => leerSombra({ ...CANARY, hasta: h }).ok === false),
    `${caducada.salida?.motivo} · justo=${enElInstante.motivo} · sin reloj=${sinReloj.motivo}`);
}
check('S1-24) el algoritmo SIN el puente no es una configuración: es ilegible, y cierra',
  [['algoritmo'], ['brain', 'algoritmo']].every((c) => !para({ ...ABIERTA, caminos: c }).sombra
    && para({ ...ABIERTA, caminos: c }).motivo === 'configuracion_ilegible'),
  'decide sobre el plan del puente: sin él no hay sobre qué decidir');
check('S1-25) un camino desconocido invalida la configuración entera',
  [['puente', 'magia'], ['PUENTE'], [], 'puente', [1], ['puente', null]].every((c) => para({ ...ABIERTA, caminos: c }).motivo === 'configuracion_ilegible'),
  'no se «limpia»: se descarta');
check('S1-25) y sin `caminos`, los de siempre —brain y puente— y NINGUNA sección del algoritmo',
  igual(leerSombra(ABIERTA).config?.caminos, ['brain', 'puente']) && igual([...CAMINOS_POR_DEFECTO], ['brain', 'puente'])
  && igual(ok.sombra?.caminos, ['brain', 'puente']) && ok.sombra !== undefined && !('algoritmo' in ok.sombra)
  && ok.salida?.algoritmo === undefined && ok.sombra?.estado === 'ok',
  'quien no toque la configuración no nota nada');
check('S1-25) el orden lo pone Weë, no quien escribe la configuración',
  igual(leerSombra({ ...ABIERTA, caminos: ['algoritmo', 'puente'] }).config?.caminos, ['puente', 'algoritmo']));
check('S1) `capacidades` con mala forma: ilegible, no «medio buena»',
  [[], 'text.search', [1], ['text search!'], null].every((c) => leerSombra({ ...CANARY, capacidades: c }).ok === false));

/* ── 26 · Duplicado es duplicado; lo demás, fallo ────────────────────────── */
{
  const conError = async (error) => { const db = new BaseFalsa(); db.errorDeCreate = error; return correrCanary({ db }); };
  const conCodigo = (code) => Object.assign(new Error('create'), { code });
  const dups = await Promise.all([6, 'already-exists', 'ALREADY_EXISTS'].map((c) => conError(conCodigo(c))));
  const otros = await Promise.all([conCodigo(14), conCodigo('unavailable'), new Error('ALREADY_EXISTS pero sin código')].map(conError));
  check('S1-26) `create` que choca con una sombra que ya existe = `duplicado`, por cualquiera de sus tres nombres',
    dups.every((r) => r.salida?.estado === 'duplicado' && r.salida?.escrita === false && r.salida?.algoritmo === 'duplicado' && legacyIntacto(r)),
    dups.map((r) => r.salida?.estado).join(','));
  check('S1-26) y cualquier OTRO error sigue siendo `fallo`: nada se disfraza de duplicado',
    otros.every((r) => r.salida?.estado === 'fallo' && r.salida?.escrita === false && legacyIntacto(r)),
    otros.map((r) => r.salida?.estado).join(','));
}

/* ── Lo que llega roto no rompe nada ─────────────────────────────────────── */
{
  const base = await planDeLegacy();
  const SIN_FILTROS = { habilitado: true, cuentas: [CUENTA_A], caminos: ['puente', 'algoritmo'] };
  const [pasoNulo, pasosTexto, pasoNuloAbierta, sinReloj] = await Promise.all([
    correrCanary({ legacyPlan: { ...base, steps: [null] } }),
    correrCanary({ legacyPlan: { ...base, steps: 'itinerary' } }),
    correrCanary({ legacyPlan: { ...base, steps: [null] }, puerta: SIN_FILTROS }),
    correrCanary({ ahora: () => { throw new Error('sin reloj'); } }),
  ]);
  check('S1) un plan de Legacy mal formado o un reloj que falla NO tumban la sombra: la puerta se queda cerrada o se anota el fallo',
    [pasoNulo, pasosTexto, pasoNuloAbierta, sinReloj].every((r) => legacyIntacto(r) && soloSuDocumento(r))
    && pasoNulo.salida?.estado === 'no_corre' && pasosTexto.salida?.estado === 'no_corre' && sinReloj.salida?.estado === 'no_corre'
    /* Y por el motivo que es: un paso ilegible no es una capacidad permitida; una puerta que no se puede decidir, ilegible. */
    && pasoNulo.salida?.motivo === 'capacidad_fuera_de_la_prueba' && pasosTexto.salida?.motivo === 'capacidad_fuera_de_la_prueba'
    && sinReloj.salida?.motivo === 'configuracion_ilegible'
    && sinReloj.db.escrituras.length === 0 && pasoNuloAbierta.salida?.estado === 'fallo' && pasoNuloAbierta.sombra?.estado === 'fallo',
    `paso nulo=${pasoNulo.salida?.motivo} · pasos texto=${pasosTexto.salida?.motivo} · abierta=${pasoNuloAbierta.salida?.estado} · sin reloj=${sinReloj.salida?.motivo}`);
  const rechaza = await new BaseFalsa().collection('x').doc('y').create({ a: { b: undefined } }).then(() => false, () => true);
  const sinValor = await correrCanary({ crearCiclo: cicloQue((r) => { delete r.decision.confidence.value; delete r.decision.uncertainty; }) });
  const sinEstado = await correrCanary({ crearCiclo: cicloQue((r) => { delete r.status; }) });
  check('S1) Firestore no admite `undefined`: lo que la sombra copia del ciclo entra como texto, número o `null`, y la sombra se guarda igual',
    rechaza && sinValor.sombra?.algoritmo?.decision?.confianza?.valor === null && sinValor.sombra?.algoritmo?.decision?.incertidumbre === 'desconocida'
    && sinValor.sombra?.algoritmo?.estado === 'decidido' && sinEstado.sombra?.algoritmo?.estado === 'no_decidido'
    && sinEstado.sombra?.algoritmo?.decision?.status === 'undefined' && !!sinEstado.sombra?.coreDesdePuente,
    `control=${rechaza} · sin valor=${sinValor.sombra?.algoritmo?.estado ?? sinValor.salida?.estado} · sin estado=${sinEstado.sombra?.algoritmo?.estado ?? sinEstado.salida?.estado}`);
}

/* ── Dónde va, y qué NO cambia ───────────────────────────────────────────── */
check('S1) el tercer camino va DESPUÉS del puente y ANTES de la única escritura',
  (() => {
    const puente = FUENTE_S.indexOf('pasosParaElCore(entrada.legacyPlan');
    const tercero = FUENTE_S.indexOf('seccionDelAlgoritmo({');
    const escritura = FUENTE_S.indexOf('await ref.create(documento)');
    return puente > 0 && tercero > puente && escritura > tercero;
  })(),
  'plan de Legacy → puente → Algorithm Engine → decisión → comparación → evidencia privada');
check('S1) el flujo de experiencia no cambia: no le pasa a la sombra caminos, ni ciclo, ni reloj',
  !/crearCiclo|cronometro|caminos/.test(INDEX.split('await sombraDelPlan(')[1]?.split('});')[0] ?? 'crearCiclo'),
  'la canary se abre desde `aiSettings/sombra`, no desde el código');
check('S1) y el Algorithm Engine solo se crea en la sombra: ni en el flujo de experiencia ni en ninguna otra parte de creator/',
  !fs.readdirSync(path.resolve(here, '../src/creator')).filter((f) => f.endsWith('.ts') && f !== 'sombra.ts')
    .some((f) => /crearCicloAlgoritmico|core\/algorithm/.test(fs.readFileSync(path.resolve(here, '../src/creator', f), 'utf8'))),
  'una sola puerta, y es esta');

globalThis.fetch = fetchDeVerdad;
console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\nLa sombra mira y no toca: ${n} comprobaciones, cero llamadas al proveedor`);
process.exit(failures ? 1 : 0);
