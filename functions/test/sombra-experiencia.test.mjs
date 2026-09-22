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
 * Cero llamadas: el entendimiento es un fijo y el Planner es el de verdad. Un
 * contador envuelve `fetch` y exige que no salga ni una petición.
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
  configuracionDeLaSombra, olvidarLaSombra,
} = lib('creator/sombra.js');
const { compararIntencion, compararPlanes, erroresDeParidad, resumenDeParidad } = lib('creator/paridad.js');
const { TEMPLATES } = lib('creator/templates.js');

let failures = 0;
let n = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  console.log((cond ? '  ✔ ' : '  ✘ ') + n + ') ' + nombre + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ── Ni una petición sale de aquí ─────────────────────────────────────────── */
let peticiones = 0;
const fetchDeVerdad = globalThis.fetch;
globalThis.fetch = async (...args) => { peticiones++; return fetchDeVerdad(...args); };

/* ── Firestore de mentira, con `create` (que es lo que da la idempotencia) ── */
const clonar = (v) => JSON.parse(JSON.stringify(v));
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
    if (this.db.docs.has(this.path)) { const e = new Error('ALREADY_EXISTS'); e.code = 6; throw e; }
    this.db.docs.set(this.path, clonar(data));
    this.db.escrituras.push({ kind: 'create', path: this.path });
  }
  async set(data) { this.db.docs.set(this.path, clonar(data)); this.db.escrituras.push({ kind: 'set', path: this.path }); }
}

const CUENTA_A = 'cuenta_de_prueba_A';
const CUENTA_B = 'cuenta_de_prueba_B';
const JOB = 'job_de_prueba_0001';
const GOAL = 'Quiero organizar un viaje a Lisboa en abril. Serían cinco días, me interesa mucho la comida y prefiero ir sin prisas.';
const ABIERTA = { habilitado: true, cuentas: [CUENTA_A] };

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
  const salida = await sombraDelPlan({
    jobRef, jobId: job.id, userId: job.userId, experienceId: job.experienceId,
    goal: job.goal, legacyPlan: job.plan, puerta: ABIERTA,
    entendimientoDe: entendimientoDelTramo1, disponibilidad,
    ahora: () => 1000, observar: () => {},
    ...extra,
  });
  return { db, jobRef, job, antesDelJob, salida, consultasDeDisponibilidad, sombra: db.docs.get(`creatorJobs/${JOB}/private/${CLAVE_DE_LA_SOMBRA}`) };
};

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
  apagada.salida.escrita === false && apagada.salida.estado === 'no_corre',
  apagada.salida.motivo);
const ajena = await correr({ userId: CUENTA_B });
check('F7) una cuenta no autorizada: exactamente lo mismo',
  ajena.db.escrituras.length === 0 && ajena.consultasDeDisponibilidad === 0 && !ajena.salida.escrita);

console.log('\n── Encendida para la cuenta de prueba ──');

const ok = await correr();
check('F2) el Core Planner corre y la sombra queda escrita',
  ok.salida.escrita && ok.salida.estado === 'ok' && !!ok.sombra,
  'estado=' + ok.salida.estado);
check('F6) y SOLO en private/shadow, nunca en el trabajo',
  ok.db.escrituras.length === 1
  && ok.db.escrituras[0].path === `creatorJobs/${JOB}/private/${CLAVE_DE_LA_SOMBRA}`,
  ok.db.escrituras.map((e) => e.path).join(', '));
check('F4) el trabajo no cambió ni un byte',
  igual(ok.job, ok.antesDelJob) && ok.job.status === 'planned' && !('sombra' in ok.job),
  'mismo status, mismo plan, sin campo nuevo');
check('F3) la respuesta al cliente no puede cambiar: no la toca nadie',
  !/sombra|shadow/i.test(sinComentarios(leer('functions/src/creator/index.ts')).split('const chatResponse')[1].slice(0, 400)),
  '`chatResponse` no sabe que la sombra existe');
check('el plan del Core llegó a `ready` con sus dos pasos',
  ok.sombra.core.status === 'ready' && ok.sombra.core.pasos === 2,
  ok.sombra.core.formas.join(' · '));
check('F15) y la dependencia material sobrevivió al Planner',
  ok.sombra.core.dependencias.length === 1 && /←/.test(ok.sombra.core.dependencias[0]),
  ok.sombra.core.dependencias.join(', '));
check('F8) dos veces el mismo plan dejan UNA sola sombra',
  await (async () => {
    const segunda = await sombraDelPlan({
      jobRef: ok.jobRef, jobId: JOB, userId: CUENTA_A, experienceId: 'travel', goal: GOAL,
      legacyPlan: ok.job.plan, puerta: ABIERTA, entendimientoDe: entendimientoDelTramo1,
      disponibilidad: disponibilidadDelCatalogo(), ahora: () => 2000, observar: () => {},
    });
    return !segunda.escrita && ok.db.escrituras.length === 1;
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
    const a = await sombraDelPlan({ jobRef: ciego, ...comun });
    const b = await sombraDelPlan({ jobRef: ciego, ...comun });
    const creadas = db.escrituras.filter((e) => e.kind === 'create' && e.path.endsWith(CLAVE_DE_LA_SOMBRA)).length;
    return a.escrita && !b.escrita && creadas === 1;
  })(),
  'lo encontró un sabotaje: con `set` en vez de `create`, la segunda pisaría a la primera');

console.log('\n── Cuando algo se rompe, no se rompe nada ──');

const rota = await correr({ entendimientoDe: async () => { throw new Error('el entendimiento explotó'); } });
check('F9) la sombra falla y NO lanza hacia el flujo de experiencia',
  rota.salida.estado === 'fallo' && igual(rota.job, rota.antesDelJob),
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
    const r = await sombraDelPlan({
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
  malCap.salida.estado !== 'ok' && igual(malCap.job, malCap.antesDelJob),
  'estado=' + malCap.salida.estado + ' · core.status=' + (malCap.sombra?.core?.status ?? '—'));
const sinFijo = await correr({ experienceId: 'chef' });
check('para una experiencia sin fijo, la sombra lo dice en vez de inventárselo',
  sinFijo.salida.estado === 'sin_entendimiento' && sinFijo.sombra.estado === 'sin_entendimiento',
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
  && erroresDeParidad([], regresion).length === 0,
  'lo pone la plantilla, no la persona');
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

globalThis.fetch = fetchDeVerdad;
console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\nLa sombra mira y no toca: ${n} comprobaciones, cero llamadas al proveedor`);
process.exit(failures ? 1 : 0);
