/*
 * EL PLAZO, Y QUE NADIE SE QUEDE CON LOS CREDITS RETENIDOS (fase 10).
 *
 * ── El fallo que esto impide ───────────────────────────────────────────────
 *
 * `creatorRun` vivía 900 s y le daba a cada paso el plazo de una tabla por
 * modalidad —vídeo: 1 200 s—. Nadie restaba lo ya gastado, ni entre pasos del
 * plan ni entre los candidatos de la cadena de respaldo, y nadie comparaba
 * ninguno de esos plazos con lo que le quedaba de vida al proceso.
 *
 * Cuando la plataforma mata la función por plazo, la mata SIN pasar por su
 * `catch`. Y la liquidación de Credits vive justo ahí. Resultado medido:
 *
 *     creatorJobs/{id}           → `running`, para siempre
 *     creditTransactions/usage_… → `AUTHORIZED`, Credits retenidos
 *     aiGenerations/{id}         → `PROCESSING`
 *
 * Sin barrendero, sin scheduler y sin nada que lo repare.
 *
 * ── Las dos mitades de la corrección ───────────────────────────────────────
 *
 *  A · QUE NO PASE. El plazo se declara una vez y se RESTA hacia abajo, con la
 *      regla del Job Engine (`presupuestoDeIntento`, Fase 8), que es la
 *      canónica. Ningún intento recibe más tiempo del que le queda a quien lo
 *      espera, y se reserva un margen para poder liquidar.
 *
 *  B · QUE SI PASA, SE CIERRE. Un trabajo que sigue diciendo `running` pasado
 *      su plazo no está en marcha: está abandonado. Se cierra y se devuelve lo
 *      retenido, por el camino de siempre y con su asiento.
 *
 * Lo que esto NO hace, a propósito: no crea un tercer sistema de plazos, no
 * crea un scheduler, no convierte un AUTHORIZED en COMPLETED y no reembolsa
 * sin causa. La causa es que el plazo venció, y está escrita.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { presupuestoDeIntento, operacionAbandonada } = lib('core/index.js');

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── A · La regla canónica: el plazo se resta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const AHORA = 1_000_000;

  check('1) mientras sobre tiempo, manda el plazo del intento',
    presupuestoDeIntento(AHORA + 900_000, AHORA, 240_000) === 240_000);

  /* 2 · EL CASO QUE COSTABA DINERO. Vídeo pide 1 200 s; quedan 900. */
  check('2) lo que queda MANDA sobre lo que el proveedor pediría',
    presupuestoDeIntento(AHORA + 900_000, AHORA, 1_200_000) === 900_000,
    'antes se le daban los 1 200 s y la función moría a los 900');

  /* 3 · Y se resta de verdad: el segundo paso no vuelve a empezar de cero. */
  check('3) lo ya gastado se descuenta, paso a paso',
    presupuestoDeIntento(AHORA + 900_000, AHORA + 700_000, 240_000) === 200_000);

  /* 4 · La reserva: liquidar también tarda. */
  check('4) se reserva margen para poder cerrar el libro',
    presupuestoDeIntento(AHORA + 900_000, AHORA, 1_200_000, 45_000) === 855_000);

  /* 5 · Cero significa «no empieces», no «sin límite». */
  check('5) sin tiempo, el presupuesto es CERO',
    presupuestoDeIntento(AHORA, AHORA, 240_000) === 0
    && presupuestoDeIntento(AHORA - 1, AHORA, 240_000) === 0
    && presupuestoDeIntento(AHORA + 10_000, AHORA, 240_000, 45_000) === 0,
    'empezar un intento sin tiempo gasta una llamada de proveedor para fallar');

  check('6) y una entrada absurda no se convierte en tiempo infinito',
    presupuestoDeIntento(undefined, AHORA, 240_000) === 0
    && presupuestoDeIntento(AHORA + 900_000, undefined, 240_000) === 0
    && presupuestoDeIntento(AHORA + 900_000, AHORA, 0) === 0
    && presupuestoDeIntento(AHORA + 900_000, AHORA, -5) === 0);

  /* 7 · El Job Engine usa ESTA función, no una copia suya. */
  check('7) el Job Engine aplica la misma regla, no una parecida',
    /const restante = presupuestoDeIntento\(job\.deadlineAt, at,/.test(leer('functions/src/core/job.ts')),
    'un segundo sistema de plazos es exactamente lo que no puede haber');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── B · «En marcha» y «abandonado» se ven igual ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const AHORA = 2_000_000;
  check('8) en marcha y dentro de plazo: sigue en marcha',
    !operacionAbandonada(true, AHORA + 1_000, AHORA));
  check('9) en marcha y pasado el plazo: abandonado',
    operacionAbandonada(true, AHORA - 1, AHORA) && operacionAbandonada(true, AHORA, AHORA));
  check('10) lo que no está en marcha no se abandona',
    !operacionAbandonada(false, AHORA - 1_000_000, AHORA));
  check('11) y sin plazo guardado no se afirma nada',
    !operacionAbandonada(true, undefined, AHORA),
    'los trabajos anteriores a esta corrección no lo tienen: no se les inventa');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── C · La cadena, de punta a punta ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const CREATOR = leer('functions/src/creator/index.ts');
  const ROUTER = leer('functions/src/engine/router.ts');

  /* 12 · UN SOLO sitio declara el plazo, y el de la función sale de él. */
  check('12) el plazo se declara una vez y la función lo usa',
    /const PLAZO_DE_EJECUCION_MS = 900_000;/.test(CREATOR)
    && /timeoutSeconds: PLAZO_DE_EJECUCION_MS \/ 1000/.test(CREATOR),
    'antes eran dos números sin relación: 900 aquí y 1 200 en otra tabla');

  check('13) y reserva margen para liquidar',
    /const RESERVA_PARA_LIQUIDAR_MS = 45_000;/.test(CREATOR)
    && /PLAZO_DE_EJECUCION_MS - RESERVA_PARA_LIQUIDAR_MS/.test(CREATOR));

  check('14) el plazo baja al motor con cada paso',
    /const ctx = \{[^}]*deadlineAt \}/.test(CREATOR));

  /* 15 · Y el motor lo RESTA en vez de copiar la tabla. */
  check('15) el motor calcula el presupuesto en vez de leer la tabla a secas',
    /presupuestoDeIntento\(request\.deadlineAt, now\(\), porModalidad\)/.test(ROUTER));
  check('16) quien no traiga plazo se comporta como siempre',
    /request\.deadlineAt === undefined\s*\?\s*porModalidad/.test(ROUTER),
    'generateVideo tiene plazo propio y más largo: no se le toca');
  check('17) sin presupuesto no se llama a ningún proveedor',
    /if \(timeoutMs <= 0\) \{[\s\S]{0,200}EngineError\(\s*'TIMEOUT'/.test(ROUTER));

  /* 18 · El plazo se GUARDA: es lo que permite detectar el abandono después. */
  check('18) el plazo queda escrito en el trabajo al empezar',
    /status: 'running'[^}]*deadlineAt,/.test(CREATOR));

  /*
   * 19 · LA COHERENCIA QUE FALTABA, COMPROBADA CON LOS NÚMEROS DE VERDAD.
   *
   * Con la corrección, un plazo grande en la tabla ya no puede matar a la
   * función porque se descuenta. Lo que sí tiene que seguir siendo cierto es
   * que la reserva exista y sea suficiente para liquidar.
   */
  const plazo = Number((CREATOR.match(/PLAZO_DE_EJECUCION_MS = ([0-9_]+)/) || [])[1]?.replace(/_/g, ''));
  const reserva = Number((CREATOR.match(/RESERVA_PARA_LIQUIDAR_MS = ([0-9_]+)/) || [])[1]?.replace(/_/g, ''));
  check('19) la reserva es real y proporcionada', reserva >= 30_000 && reserva < plazo / 4,
    `${reserva / 1000} s de ${plazo / 1000} s`);

  /* 20 · Y el trabajo tiene dónde guardarlo. */
  check('20) el trabajo declara su plazo', /deadlineAt\?: number;/.test(leer('functions/src/creator/types.ts')));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── D · El motor, ejecutado de verdad ──');
// ════════════════════════════════════════════════════════════════════════════
{
  const { createRouter, memoryHealth } = lib('engine/router.js');
  const { memoryLedger } = lib('engine/ledger.js');
  const { DEFAULT_SETTINGS } = lib('engine/registry.js');
  /* Anotar la verificación va a Firestore, que aquí no existe. No es lo que se prueba. */
  const verificacion = lib('engine/verification.js');
  const recordRealSuccessReal = verificacion.recordRealSuccess;
  verificacion.recordRealSuccess = async () => {};

  const proveedor = {
    id: 'alpha', name: 'alpha', modalities: ['video'], llamadas: 0, plazoVisto: null,
    models: [{ id: 'a-1', provider: 'alpha', capabilities: ['video.generate'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.1 } }],
    isConfigured: () => true,
    supports: () => true,
    async run(req) {
      this.llamadas++;
      this.plazoVisto = req.timeoutMs;
      return { output: { kind: 'video', url: 'https://x/v.mp4' }, costUSD: 1, latencyMs: 5, model: req.model.id };
    },
  };
  const cfg = {
    providers: { alpha: { enabled: true, priority: 1 } },
    routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'alpha' }], policy: 'balanced' } },
    settings: { ...DEFAULT_SETTINGS },
    source: 'test',
  };
  const AHORA = 5_000_000;
  const montar = () => createRouter({
    adapters: { alpha: proveedor }, loadConfig: async () => cfg,
    ledger: memoryLedger(), health: memoryHealth(() => AHORA), now: () => AHORA,
  });
  const pet = (extra = {}) => ({ capability: 'video.generate', input: { prompt: 'una calle de Lima' }, userId: 'u1', ...extra });

  /* 21 · Sin plazo: el de la tabla, como siempre. */
  proveedor.llamadas = 0;
  await montar().execute(pet());
  check('21) sin plazo, el proveedor recibe el de la tabla',
    proveedor.plazoVisto === DEFAULT_SETTINGS.timeoutsMs.video, `${proveedor.plazoVisto} ms`);

  /* 22 · EL CASO DEL FALLO. Quedan 300 s; el vídeo pedía 1 200. */
  proveedor.plazoVisto = null;
  await montar().execute(pet({ deadlineAt: AHORA + 300_000 }));
  check('22) con plazo, el proveedor recibe lo que QUEDA, no lo que pediría',
    proveedor.plazoVisto === 300_000, `${proveedor.plazoVisto} ms en vez de ${DEFAULT_SETTINGS.timeoutsMs.video}`);

  /* 23 · Y si no queda nada, no se llama a nadie: no se gasta para fallar. */
  const antes = proveedor.llamadas;
  let fallo = null;
  try { await montar().execute(pet({ deadlineAt: AHORA - 1 })); } catch (e) { fallo = e; }
  check('23) sin tiempo no se llama al proveedor, y el error lo dice',
    proveedor.llamadas === antes && fallo?.code === 'TIMEOUT' && fallo?.details?.reason === 'sin_presupuesto',
    fallo?.message);

  verificacion.recordRealSuccess = recordRealSuccessReal;
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── E · El callable, EJECUTADO: un trabajo abandonado se cierra ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Aquí se ejecuta `creatorRun` de verdad, con una Firestore de mentira. Es la
   * única forma de probar lo que importa: que un trabajo que se quedó colgado
   * DEVUELVE los Credits, por el camino de siempre, en vez de contestar
   * «duplicado» y dejarlos retenidos para siempre.
   */
  const firestore = require('firebase-admin/firestore');
  const docs = new Map();
  const ref = (p) => ({
    id: p.split('/').pop(),
    path: p,
    collection: (sub) => ({ doc: (id) => ref(`${p}/${sub}/${id || 'auto'}`) }),
    get: async () => ({ exists: docs.has(p), id: p.split('/').pop(), data: () => docs.get(p) }),
    set: async (d) => { docs.set(p, { ...(docs.get(p) || {}), ...d }); },
    update: async (d) => { docs.set(p, { ...(docs.get(p) || {}), ...d }); },
  });
  const baseFalsa = { collection: (c) => ({ doc: (id) => ref(`${c}/${id || 'nuevo'}`) }) };
  const getFirestoreReal = firestore.getFirestore;
  firestore.getFirestore = () => baseFalsa;

  const creatorMod = lib('creator/index.js');
  const creditosMod = lib('creator/credits.js');
  const settleReal = creditosMod.settleCredits;

  const liquidaciones = [];
  creditosMod.settleCredits = async (userId, jobId, held, used) => { liquidaciones.push({ jobId, held, used }); };

  const UID = 'AbCdEfGhIjKlMnOpQrStUvWxYz01';
  const correr = (jobId) => creatorMod.creatorRun.run({ auth: { uid: UID }, data: { jobId } });

  /* Un trabajo que se quedó colgado: en marcha, con el plazo ya vencido. */
  docs.set('creatorJobs/colgado', {
    userId: UID, experienceId: 'design', status: 'running', creditsEstimated: 12,
    deadlineAt: Date.now() - 60_000, plan: {}, steps: [],
  });

  let error = null;
  try { await correr('colgado'); } catch (e) { error = e; }

  check('24) un trabajo abandonado NO se contesta como duplicado',
    !/already-exists|DUPLICATE/i.test(String(error?.code) + String(error?.message)), String(error?.code));
  check('25) se le DEVUELVEN los Credits retenidos, por el camino de siempre',
    liquidaciones.length === 1 && liquidaciones[0].jobId === 'colgado'
    && liquidaciones[0].held === 12 && liquidaciones[0].used === 0,
    JSON.stringify(liquidaciones));
  const cerrado = docs.get('creatorJobs/colgado');
  check('26) y el trabajo deja de estar en marcha, diciendo por qué',
    cerrado.status === 'failed' && cerrado.creditsCharged === 0 && /sin tiempo/i.test(cerrado.progressText),
    `${cerrado.status} · ${cerrado.progressText}`);
  check('27) el error que ve la persona explica que puede reintentar',
    /devolví los Credits/i.test(String(error?.message)) && /intentarlo/i.test(String(error?.message)),
    String(error?.message));

  /* 28 · CONTROL: uno en marcha y DENTRO de plazo sigue siendo un duplicado. */
  liquidaciones.length = 0;
  docs.set('creatorJobs/vivo', {
    userId: UID, experienceId: 'design', status: 'running', creditsEstimated: 12,
    deadlineAt: Date.now() + 600_000, plan: {}, steps: [],
  });
  let error2 = null;
  try { await correr('vivo'); } catch (e) { error2 = e; }
  check('28) CONTROL: uno que sí está en marcha sigue siendo duplicado, y no se le toca el dinero',
    liquidaciones.length === 0 && docs.get('creatorJobs/vivo').status === 'running'
    && /already-exists|duplicad/i.test(String(error2?.code) + String(error2?.message)),
    String(error2?.code));

  /* 29 · CONTROL: uno antiguo, sin plazo guardado, tampoco se toca. */
  liquidaciones.length = 0;
  docs.set('creatorJobs/antiguo', {
    userId: UID, experienceId: 'design', status: 'running', creditsEstimated: 12, plan: {}, steps: [],
  });
  let error3 = null;
  try { await correr('antiguo'); } catch (e) { error3 = e; }
  check('29) CONTROL: uno anterior a esta corrección no se reembolsa por sorpresa',
    liquidaciones.length === 0 && docs.get('creatorJobs/antiguo').status === 'running',
    String(error3?.code));

  creditosMod.settleCredits = settleReal;
  firestore.getFirestore = getFirestoreReal;
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── F · La otra ruta que retenía Credits: Weë Studio ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * `generateVideo` cobra con un `requestId` que trae el cliente y, si la misma
   * operación llega dos veces en `AUTHORIZED`, contestaba «duplicado». Su
   * cadena de plazos SÍ era coherente (20 min de proveedor dentro de 25 de
   * función), así que el fallo es menos probable que el de `creatorRun` —pero
   * la trampa es idéntica: si el proceso muere igualmente, esa autorización se
   * queda colgada y no hay forma de volver a intentarlo ni de recuperar nada.
   */
  const VIDEO = leer('functions/src/creator/video.ts');

  check('30) aquí también el plazo se declara una vez y la función lo usa',
    /const PLAZO_DE_VIDEO_MS = 1_500_000;/.test(VIDEO)
    && /timeoutSeconds: PLAZO_DE_VIDEO_MS \/ 1000/.test(VIDEO));
  check('31) y baja al motor, que lo resta',
    /deadlineAt = Date\.now\(\) \+ PLAZO_DE_VIDEO_MS - RESERVA_PARA_LIQUIDAR_MS/.test(VIDEO)
    && /creditTransactionId: usageTransactionId\(requestId\), deadlineAt \}/.test(VIDEO));

  check('32) una autorización colgada se DEVUELVE en vez de contestar «duplicado» para siempre',
    /operacionAbandonada\(true, \(spend\.authorizedAt \?\? Infinity\) \+ PLAZO_DE_VIDEO_MS, Date\.now\(\)\)/.test(VIDEO)
    && /refundCredits\(\{[\s\S]{0,200}se quedó sin tiempo/.test(VIDEO));
  check('33) y sin saber cuándo se autorizó NO se reembolsa por sorpresa',
    /spend\.authorizedAt \?\? Infinity/.test(VIDEO),
    'una antigüedad desconocida nunca puede parecer vencida');
  check('34) sigue siendo duplicado mientras esté dentro de plazo',
    /\} else \{\s*\/\/ Sigue en marcha \(AUTHORIZED\)[\s\S]{0,140}DUPLICATE_REQUEST/.test(VIDEO));

  /* 35 · El motor de Credits sabe decir cuándo se autorizó algo. */
  check('35) el Credit Engine informa de la antigüedad de una autorización repetida',
    /authorizedAt\?: number;/.test(leer('functions/src/credits/creditEngine.ts'))
    && /toMillis === 'function' \? creado\.toMillis\(\)/.test(leer('functions/src/credits/creditEngine.ts')));

  /*
   * 36 · Y NO SE TOCARON LAS REGLAS DEL LIBRO para esconder el problema: se
   * devuelve por el camino de siempre, un AUTHORIZED no se convierte en
   * COMPLETED y no hay reembolso sin causa escrita.
   */
  const MOTOR = leer('functions/src/credits/creditEngine.ts');
  check('36) un AUTHORIZED no se convierte en COMPLETED por la puerta de atrás',
    !/status: 'COMPLETED'[\s\S]{0,120}abandonad|forzar|silencioso/i.test(MOTOR)
    && /ALREADY_REFUNDED/.test(MOTOR),
    'un requestId reembolsado sigue sin poder reutilizarse');
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n── G · Canónico y en uso: dos, y ni uno más ──');
// ════════════════════════════════════════════════════════════════════════════
{
  /*
   * Weë tiene piezas duplicadas por historia: un motor de trabajos, un router,
   * un registro y un gateway que existen dos veces —el contrato del Core y la
   * implementación que atiende a la gente—. Esta fase NO los une: unirlos es
   * una migración y tiene su propio momento.
   *
   * Lo que sí se puede hacer hoy, y es lo que impide que el problema crezca, es
   * dejar escrito cuál es cuál y prohibir el tercero. Un tercero es como estos
   * dos llegaron a ser dos.
   */
  const { ESTADO_CANONICO } = lib('creator/types.js');
  const JOB = leer('functions/src/core/job.ts');

  /* 37 · El mapa existe y cubre TODOS los estados del que está en uso. */
  const ESTADOS_EN_USO = ['asking', 'planned', 'running', 'done', 'failed', 'cancelled'];
  const sinMapear = ESTADOS_EN_USO.filter((e) => !ESTADO_CANONICO[e]);
  check('37) cada estado del motor en uso dice qué es en el canónico',
    sinMapear.length === 0, sinMapear.join(' '));

  /* 38 · Y lo que dice existe de verdad en el canónico: nada de inventarse un estado. */
  const declarados = [...JOB.matchAll(/^\s*\| '([a-z_]+)'$/gm)].map((m) => m[1]);
  const inventados = Object.entries(ESTADO_CANONICO)
    .filter(([, v]) => v !== 'sin_crear' && !declarados.includes(v))
    .map(([k, v]) => `${k}→${v}`);
  check('38) y cada destino existe en el Job Engine canónico',
    inventados.length === 0, inventados.join(' ') || Object.values(ESTADO_CANONICO).join(','));

  /* 39 · El canónico sabe hacer cosas que el de uso no: ese es el hueco. */
  check('39) el canónico tiene los estados que al de uso le faltan',
    declarados.includes('waiting') && declarados.includes('timed_out')
    && declarados.includes('cancel_requested'),
    'waiting · timed_out · cancel_requested');

  /*
   * 40 · NO HAY UN TERCERO. Se cuenta por el nombre de su fábrica, que es lo
   * que de verdad crea una implementación nueva.
   */
  const buscar = (patron, dir = 'functions/src') => {
    const salida = [];
    for (const e of fs.readdirSync(path.resolve(RAIZ, dir), { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== 'lib' && e.name !== 'node_modules') salida.push(...buscar(patron, `${dir}/${e.name}`)); continue; }
      if (!e.name.endsWith('.ts')) continue;
      if (patron.test(leer(`${dir}/${e.name}`))) salida.push(`${dir}/${e.name}`);
    }
    return salida;
  };

  const motores = buscar(/export const crearJobEngine|export function createJobEngine/);
  check('40) hay UN motor de trabajos canónico, y solo uno', motores.length === 1, motores.join(' '));

  /*
   * Una IMPLEMENTACIÓN define el motor; una COMPOSICIÓN solo le enchufa
   * dependencias reales. La diferencia es la que importa: componer el canónico
   * es lo que hay que hacer, y escribir un tercer motor es lo que no.
   */
  const routers = buscar(/export const crearRouter\s*=|export function createRouter\s*\(/);
  check('41) y exactamente DOS routers: el contrato y el que atiende hoy',
    routers.length === 2
    && routers.some((r) => r.includes('core/router.ts'))
    && routers.some((r) => r.includes('engine/router.ts')),
    routers.join(' '));
  check('41b) lo que hay en `router/` COMPONE el canónico, no escribe otro',
    /crearRouterDeWee/.test(leer('functions/src/router/index.ts'))
    && /crearRouter\(/.test(leer('functions/src/router/index.ts')),
    'componer está bien; implementar por tercera vez es como llegamos a dos');

  const gateways = buscar(/export const crearGateway\s*=|export const crearGatewayDelMotor\s*=/);
  check('42) y DOS gateways, por el mismo motivo', gateways.length === 2, gateways.join(' '));

  /* 43 · Y está escrito en el código, no solo en una prueba. */
  check('43) cuál manda y cuál está en uso está escrito donde se lee',
    /CANÓNICO {3}`core\/job\.ts`/.test(leer('functions/src/creator/types.ts'))
    && /NO PUEDE HABER UN TERCERO/.test(leer('functions/src/creator/types.ts')));
}

console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
