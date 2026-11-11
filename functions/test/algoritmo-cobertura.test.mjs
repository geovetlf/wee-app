/*
 * ALGORITHM ENGINE · COBERTURA REAL EN WEË (auditoría de integración transversal)
 *
 * ── Qué se pone a prueba ────────────────────────────────────────────────────
 *
 * No que el motor funcione —eso lo prueban las trece suites `algorithm-*`— sino
 * DÓNDE lo usa Weë de verdad hoy, y que esa cobertura no cambie sin que alguien
 * lo decida. Dice la verdad en los dos sentidos:
 *
 *   1. TOPOLOGÍA. Solo `creator/sombra.ts` importa el motor, y solo
 *      `creatorChat` llama a la sombra, DESPUÉS de guardar el trabajo. Ningún
 *      otro módulo —Router, Orchestrator, Job, Gateway, Credits, Brain,
 *      Runtime, Filmmaker, vídeo, mundo 3D— lo toca. Si alguien conecta el
 *      motor a otra ruta, esta suite falla y obliga a revisar la autoridad
 *      (CLAUDE.md § 10, ALGORITHM-ENGINE.md § 21).
 *   2. ALCANCE POR EXPERIENCIA, MEDIDO con las plantillas reales: con la puerta
 *      abierta y el camino del algoritmo, qué experiencias llegan a `decidir` y
 *      cuáles se quedan sin plan del Core (el puente no sabe aún expresar sus
 *      pasos con fotos ni la música). Una experiencia nueva obliga a
 *      clasificarla; una que cambie de clase, a decirlo.
 *   3. SIN AUTORIDAD NI EFECTOS, por experiencia: el trabajo de Legacy no
 *      cambia, la única escritura es `private/sombra`, no sale ninguna petición
 *      y no se toca ningún Credit. Con la puerta cerrada, ni siquiera se crea
 *      el ciclo.
 *
 * Sin red, sin proveedor, sin Credits.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const SRC = path.resolve(here, '../src');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
let n = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  console.log((cond ? '  ✔ ' : '  ✘ ') + n + ') ' + nombre + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

let peticiones = 0;
globalThis.fetch = async () => { peticiones++; throw new Error('esta suite no sale a la red'); };

const ficheros = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) ficheros(p, out); else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');
const TODOS = ficheros(SRC).map((p) => ({ ruta: rel(p), codigo: sinComentarios(fs.readFileSync(p, 'utf8')) }));
const fuera = TODOS.filter((f) => !f.ruta.startsWith('core/algorithm/'));

console.log('\n── 1 · Topología: quién usa el motor ──');

const importadores = fuera
  .filter((f) => /from\s+['"][^'"]*core\/algorithm(\/[^'"]*)?['"]|require\(\s*['"][^'"]*core\/algorithm/.test(f.codigo))
  .map((f) => f.ruta);
check('el ÚNICO módulo que importa el Algorithm Engine es creator/sombra.ts',
  importadores.length === 1 && importadores[0] === 'creator/sombra.ts', importadores.join(', '));

const llamantes = fuera.filter((f) => /\bsombraDelPlan\s*\(/.test(f.codigo) && f.ruta !== 'creator/sombra.ts').map((f) => f.ruta);
check('la sombra solo la llama creator/index.ts', llamantes.length === 1 && llamantes[0] === 'creator/index.ts', llamantes.join(', '));

const idx = TODOS.find((f) => f.ruta === 'creator/index.ts').codigo;
const iChat = idx.indexOf('export const creatorChat');
const iQuote = idx.indexOf('export const creatorQuote');
const iRun = idx.indexOf('export const creatorRun');
const iSombra = idx.indexOf('sombraDelPlan({');
check('la llamada está UNA vez y dentro de creatorChat (no en creatorQuote ni creatorRun)',
  (idx.match(/sombraDelPlan\(/g) || []).length === 1 && iChat >= 0 && iChat < iSombra && iSombra < iQuote && iQuote < iRun);
const trasGuardar = idx.lastIndexOf('await ref.set(clean(job))', iSombra);
check('se llama DESPUÉS de guardar el trabajo de Legacy, y solo con el plan hecho',
  trasGuardar > iChat && trasGuardar < iSombra && /if \(job\.status === 'planned' && job\.plan\)\s*\{\s*await sombraDelPlan/.test(idx));
check('la sombra no manda nada a ejecutar: el resultado de sombraDelPlan no se usa en creatorChat',
  !/=\s*await sombraDelPlan|return\s+await sombraDelPlan/.test(idx));

const PROHIBIDOS = [
  'engine/', 'runtime/', 'core/router.ts', 'core/orchestrator.ts', 'core/job.ts', 'core/job-queue.ts', 'core/gateway.ts',
  'credits/', 'core/financial/', 'financial/', 'settlement/', 'brain/', 'core/brain.ts', 'creator/brain.ts', 'creator/video.ts',
  'creator/mundo.ts', 'creator/toma.ts', 'creator/plano.ts', 'creator/credits.ts', 'creator/cobro.ts', 'shots/', 'elements/',
  'productions/', 'media/', 'content/', 'gateway/', 'router/', 'orchestrator/', 'job/', 'registry/', 'skills/', 'workflow/', 'planner/',
];
const infractores = fuera.filter((f) => PROHIBIDOS.some((p) => f.ruta.startsWith(p)) && /core\/algorithm|algorithm engine|crearCicloAlgoritmico|motor-de-decision|Algorithm(Decision|Result)/i.test(f.codigo)).map((f) => f.ruta);
check('Router, Orchestrator, Job, Gateway, Credits, Brain, Runtime, vídeo, mundo 3D y Filmmaker no mencionan el motor',
  infractores.length === 0, infractores.join(', '));

const paraRouter = fuera.filter((f) => /\bparaRouter\s*\(|\.paraRouter\b/.test(f.codigo)).map((f) => f.ruta);
check('`paraRouter` (la salida PREVISTA para el Router) no tiene ningún consumidor', paraRouter.length === 0, paraRouter.join(', '));
const cierre = fuera.filter((f) => /\.cerrar\s*\(/.test(f.codigo) && /crearCicloAlgoritmico/.test(f.codigo)).map((f) => f.ruta);
check('el cierre del ciclo (A6, A6r, A7) no lo llama nadie en producción', cierre.length === 0, cierre.join(', '));
const nucleo = TODOS.filter((f) => /^core\/(?!algorithm\/)/.test(f.ruta) && /from\s+['"][^'"]*algorithm['"/]/.test(f.codigo)).map((f) => f.ruta);
check('el Core no importa el motor (la dependencia va en un solo sentido)', nucleo.length === 0, nucleo.join(', '));

console.log('\n── 2 · Alcance por experiencia, medido con las plantillas reales ──');

const { sombraDelPlan, disponibilidadDelCatalogo, decidirSombra, CLAVE_DE_LA_SOMBRA } = lib('creator/sombra.js');
const { TEMPLATES } = lib('creator/templates.js');
const { crearCicloAlgoritmico } = lib('core/algorithm/index.js');

const clonar = (v) => JSON.parse(JSON.stringify(v));
class Base {
  constructor() { this.docs = new Map(); this.escrituras = []; }
  collection(p) { return { doc: (id) => new Ref(this, `${p}/${id}`) }; }
}
class Ref {
  constructor(db, p) { this.db = db; this.path = p; this.id = p.split('/').pop(); }
  collection(sub) { return { doc: (id) => new Ref(this.db, `${this.path}/${sub}/${id}`) }; }
  async get() {
    const d = this.db.docs.get(this.path);
    return { exists: d !== undefined, id: this.id, ref: this, data: () => (d === undefined ? undefined : clonar(d)) };
  }
  async create(d) {
    if (this.db.docs.has(this.path)) { const e = new Error('ALREADY_EXISTS'); e.code = 6; throw e; }
    this.db.docs.set(this.path, clonar(d)); this.db.escrituras.push(this.path);
  }
  async set(d) { this.db.docs.set(this.path, clonar(d)); this.db.escrituras.push(this.path); }
}

const CUENTA = 'cuenta_cobertura';
const ABIERTA = { habilitado: true, cuentas: [CUENTA], caminos: ['puente', 'algoritmo'] };
/* beauty = Weë Fashion (el id se conserva); music = Weë Music; home = Hogar & Diseño. */
const DECIDE = ['brain', 'business', 'chef', 'design', 'studio', 'travel', 'writer'];
const SIN_PLAN_DEL_CORE = ['beauty', 'home', 'music', 'photo'];

const planDe = async (t) => {
  const respuestas = Object.fromEntries((t.questions ?? []).filter((q) => q.options?.length).map((q) => [q.id, q.options[0].id]));
  return t.buildPlan(t.defaultGoal, respuestas);
};

const medidas = {};
for (const exp of Object.keys(TEMPLATES).sort()) {
  const t = TEMPLATES[exp];
  const plan = await planDe(t);
  const db = new Base();
  const jobRef = db.collection('creatorJobs').doc('J');
  const job = { id: 'J', userId: CUENTA, experienceId: exp, goal: t.defaultGoal, status: 'planned', plan, creditsEstimated: 3 };
  const antes = clonar(job);
  let decisiones = 0;
  let lanzo = null;
  const redAntes = peticiones;
  try {
    await sombraDelPlan({
      jobRef, jobId: 'J', userId: CUENTA, experienceId: exp, goal: t.defaultGoal, legacyPlan: plan, puerta: ABIERTA,
      entendimientoDe: async () => undefined, disponibilidad: disponibilidadDelCatalogo(), ahora: () => 1000, observar: () => {},
      crearCiclo: () => { const c = crearCicloAlgoritmico(); return { ...c, decidir: (p) => { decisiones++; return c.decidir(p); } }; },
    });
  } catch (e) { lanzo = e; }
  const doc = db.docs.get(`creatorJobs/J/private/${CLAVE_DE_LA_SOMBRA}`);
  medidas[exp] = { estado: doc?.algoritmo?.estado, decisiones, decision: doc?.algoritmo?.decision };
  const solo = db.escrituras.length === 1 && db.escrituras[0] === `creatorJobs/J/private/${CLAVE_DE_LA_SOMBRA}`;
  check(`${exp}: no lanza, el trabajo de Legacy queda byte a byte igual, una sola escritura (private/sombra), 0 red`,
    lanzo === null && JSON.stringify(job) === JSON.stringify(antes) && solo && peticiones === redAntes && !!doc,
    lanzo ? lanzo.message : '');
}

check('TODA experiencia con plantilla está clasificada (una nueva obliga a decidir a qué clase pertenece)',
  JSON.stringify(Object.keys(TEMPLATES).sort()) === JSON.stringify([...DECIDE, ...SIN_PLAN_DEL_CORE].sort()),
  Object.keys(TEMPLATES).sort().join(','));
for (const exp of DECIDE) {
  check(`${exp}: con el camino del algoritmo la decisión se calcula UNA vez (decided) y se tira`,
    medidas[exp]?.estado === 'decidido' && medidas[exp].decisiones === 1 && medidas[exp].decision?.status === 'decided',
    JSON.stringify(medidas[exp]));
}
for (const exp of SIN_PLAN_DEL_CORE) {
  check(`${exp}: el puente aún no produce plan del Core (fotos/música): el motor NO se invoca y se dice (sin_plan_del_core)`,
    medidas[exp]?.estado === 'sin_plan_del_core' && medidas[exp].decisiones === 0, JSON.stringify(medidas[exp]));
}

console.log('\n── 3 · Puerta cerrada: ni se crea el ciclo ──');
{
  const db = new Base();
  const jobRef = db.collection('creatorJobs').doc('J');
  const plan = await planDe(TEMPLATES.travel);
  let ciclos = 0;
  const base = {
    jobRef, jobId: 'J', userId: CUENTA, experienceId: 'travel', goal: 'x', legacyPlan: plan, entendimientoDe: async () => undefined,
    disponibilidad: disponibilidadDelCatalogo(), ahora: () => 1000, observar: () => {},
    crearCiclo: () => { ciclos++; return crearCicloAlgoritmico(); },
  };
  const sinPuerta = await sombraDelPlan({ ...base, puerta: undefined });
  const otraCuenta = await sombraDelPlan({ ...base, userId: 'otra_cuenta', puerta: ABIERTA });
  const sinComodin = decidirSombra({ habilitado: true, caminos: ['puente', 'algoritmo'] }, { userId: CUENTA, experienceId: 'travel' });
  check('sin configuración, con otra cuenta o sin lista de cuentas: no corre, 0 ciclos, 0 escrituras, 0 red',
    sinPuerta.estado === 'no_corre' && otraCuenta.estado === 'no_corre' && sinComodin.sombra === false
    && ciclos === 0 && db.escrituras.length === 0 && peticiones === 0);
}

console.log(failures === 0
  ? `\nCobertura real del Algorithm Engine: ${n} comprobaciones en verde · una sola puerta (creatorChat → sombra), cero autoridad`
  : `\n${failures} comprobación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
