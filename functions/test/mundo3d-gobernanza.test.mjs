/**
 * MISIÓN «CERRAR WORLD 3D + CANARY + GOBERNANZA» (2026-10-06): dejarlo todo PREPARADO, no activado.
 *
 *   A · La lista de cuentas del canary es OBLIGATORIA para el mundo: sin lista, o vacía, no pasa nadie; la
 *       configuración puede poner y quitar cuentas, pero no abrirlo para todos. Las otras dos puertas, igual.
 *   B · El cupo del día son cinco mundos que SALEN: se comprueba antes de los Credits (y al cotizar), se ocupa al
 *       reservarlos, cada operación anota lo que ocupó, un hueco devuelto no se devuelve dos veces, uno gastado al
 *       cancelar no vuelve, y un requestId que contó para un vídeo no sirve para un mundo.
 *   C · El hueco sigue al dinero: el barrido lo devuelve con la reserva, al día en que se ocupó; un mundo cobrado o un
 *       desenlace desconocido no lo devuelven; el vídeo y Weë Brain no llevan hueco.
 *   D · La puerta del mundo usa todo eso en su orden, devolviendo el dinero en UN solo sitio, sin un segundo sistema de
 *       cupos ni de permisos; y la app dice que el cupo es del día.
 *   E · Jurisdicción sin fricción: solo un país del catálogo de Weë cuenta; bloqueado → fuera; no bloqueado →
 *       potencialmente elegible; el Router cambia de modelo solo; sin alternativa, «no disponible actualmente en tu
 *       región», sin proveedor, modelo, licencia ni escalón.
 *   F · Derechos y procedencia: llegan al material completos y a la persona resumidos, y sobreviven a la versión y a
 *       lo que se hace con el mundo (Design, Filmmaker), endureciéndose, nunca relajándose.
 *   G · Lo que sigue apagado: ni clave de fal, ni Hunyuan, ni la experiencia en la app, ni despliegue.
 *
 * Sin red, sin Firebase, sin proveedor real. $0.
 *
 *   node functions/test/mundo3d-gobernanza.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crearCargador } from './filmmaker-cliente.mjs';

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
const lib = (p) => require(path.resolve(AQUI, '../lib/', p));
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};
const seccion = async (letra, fn) => {
  try { await fn(); } catch (e) { check(`${letra}) la sección termina sin lanzar`, false, String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' · ')); }
};
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const lanzado = async (f) => { try { await f(); return null; } catch (e) { return e; } };

const { decidirRuntime } = lib('runtime/puerta.js');
const { createLimiter, DEFAULT_LIMITS } = lib('engine/limits.js');
const { reservaDe, decidirLiquidacion, CLAVE_DEL_DIA_DEL_CUPO, CLAVE_DE_LA_OPERACION_DEL_CUPO } = lib('runtime/liquidacion.js');
const runtime = lib('runtime/index.js');
const E = lib('engine/elegibilidad.js');
const { PAISES_DEL_CATALOGO, jurisdiccionesDeclaradas } = lib('engine/jurisdiccion.js');
const { motivoDeNoDisponible, noDisponible, MENSAJE_DE_NO_DISPONIBLE } = lib('engine/errors.js');
const { createRouter, memoryHealth } = lib('engine/router.js');
const { memoryLedger } = lib('engine/ledger.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const { HUNYUAN_WORLD_IMAGEN_A_MUNDO: HW } = lib('engine/providers/fal-modelos.js');
const L = lib('core/content/linaje.js');
const A = lib('core/content/asset.js');
const M3D = lib('core/mundo3d.js');

const nada = () => { throw new Error('no se llama a nada'); };
const cargar = crearCargador({
  dobles: {
    'firebase/functions': { httpsCallable: nada },
    'firebase/firestore': new Proxy({}, { get: () => nada }),
    '../config/firebase': { db: {}, functions: {}, storage: {} },
    'react-native': { Platform: { OS: 'web', select: (o) => o.web ?? o.default }, Linking: { openURL: nada } },
  },
});
const D = cargar('utils/derechosDelMaterial.ts');
const MUNDO3D_APP = cargar('utils/crearMundo3D.ts');

/* ── Un Firestore de mentira para el limitador: documentos en memoria y transacciones en serie ── */
const firestoreDeMentira = () => {
  const docs = new Map();
  const fusionar = (a, b) => {
    const salida = { ...(a || {}) };
    for (const [k, v] of Object.entries(b)) {
      salida[k] = v && typeof v === 'object' && !Array.isArray(v) && salida[k] && typeof salida[k] === 'object' ? fusionar(salida[k], v) : v;
    }
    return salida;
  };
  const ref = (coleccion, id) => {
    const clave = `${coleccion}/${id}`;
    return { clave, async get() { const d = docs.get(clave); return { exists: !!d, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) }; } };
  };
  let escrituras = 0;
  const db = {
    collection: (c) => ({ doc: (id) => ref(c, id) }),
    async runTransaction(fn) {
      const pendientes = [];
      const tx = { get: (r) => r.get(), set: (r, data, opciones) => pendientes.push([r.clave, data, opciones]) };
      const resultado = await fn(tx);
      for (const [clave, data, opciones] of pendientes) { docs.set(clave, opciones?.merge ? fusionar(docs.get(clave), data) : data); escrituras++; }
      return resultado;
    },
  };
  return { db, docs, escrituras: () => escrituras };
};
const huecoDe = (docs, uid, dia) => docs.get(`aiRateLimits/${uid}_${dia}`) || {};
/** La clave de una operación en el cupo: la misma regla que el limitador (el resumen de su nombre). */
const claveDe = (operacion) => createHash('sha256').update(operacion, 'utf8').digest('hex').slice(0, 32);
/** La entrada de una operación, leída como la lee el limitador: su marca (true | 'devuelta' | 'consumida') y lo que contó. */
const entradaDe = (docs, uid, dia, operacion) => {
  const d = huecoDe(docs, uid, dia);
  const marca = d.operaciones?.[claveDe(operacion)];
  if (marca === undefined) return undefined;
  const cuenta = Object.fromEntries(Object.entries(d.cuentas?.[claveDe(operacion)] || {}).filter(([, n]) => n > 0));
  return { estado: marca === true ? 'contada' : marca, ...(Object.keys(cuenta).length ? { cuenta } : {}) };
};
const { assertRequestId } = lib('credits/creditValidation.js');

/* ═══ A · LA LISTA DE CUENTAS ═══════════════════════════════════════════════ */
console.log('── A · La lista de cuentas del canary es obligatoria para el mundo ──');
await seccion('A', async () => {
  const YO = 'cuentaDePrueba01';
  const mundo = (config, userId = YO, extra = {}) => decidirRuntime(config, { capability: 'world.generate', userId, experienceId: 'studio', listaObligatoria: true, ...extra });
  const abierta = { habilitado: true, capacidades: ['world.generate'] };
  const casos = [
    ['sin configuración', mundo(undefined), 'legacy', 'deshabilitada'],
    ['cerrada (habilitado: false), aunque te nombre', mundo({ ...abierta, habilitado: false, cuentas: [YO] }), 'legacy', 'deshabilitada'],
    ['sin la capacidad', mundo({ habilitado: true, capacidades: ['video.generate'], cuentas: [YO] }), 'legacy', 'capacidad_no_migrada'],
    ['abierta SIN lista', mundo(abierta), 'legacy', 'sin_lista_de_cuentas'],
    ['abierta con la lista VACÍA', mundo({ ...abierta, cuentas: [] }), 'legacy', 'sin_lista_de_cuentas'],
    ['con lista, otra cuenta', mundo({ ...abierta, cuentas: ['otraCuenta00001'] }), 'legacy', 'cuenta_fuera_de_la_prueba'],
    ['con lista y tu cuenta', mundo({ ...abierta, cuentas: [YO] }), 'core', 'abierta'],
    ['con lista y tu cuenta, desde otra experiencia', mundo({ ...abierta, cuentas: [YO], experiencias: ['brain'] }), 'legacy', 'experiencia_no_migrada'],
  ];
  const mal = casos.filter(([, d, runtime, motivo]) => d.runtime !== runtime || d.motivo !== motivo);
  check('A1) el orden de la puerta: habilitada → capacidad → LISTA → experiencia; sin lista o con la lista vacía no pasa NADIE; solo una cuenta nombrada pasa',
    mal.length === 0, JSON.stringify(mal.map(([nombre, d]) => [nombre, d])));

  const brain = (config) => decidirRuntime(config, { capability: 'text.generate', userId: YO, experienceId: 'brain' });
  check('A2) las otras dos puertas no cambian: sin `listaObligatoria`, una configuración sin lista sigue abriendo para todos (como hasta hoy)',
    brain({ habilitado: true, capacidades: ['text.generate'] }).runtime === 'core'
    && brain({ habilitado: true, capacidades: ['text.generate'], cuentas: ['otraCuenta00001'] }).motivo === 'cuenta_fuera_de_la_prueba');

  check('A3) la configuración no puede quitar la obligación ni abrir con un comodín: `listaObligatoria` en el documento no se lee, y «*» no es una cuenta (configuración ilegible → cerrada)',
    mundo({ ...abierta, listaObligatoria: false }).motivo === 'sin_lista_de_cuentas'
    && mundo({ ...abierta, cuentas: ['*'] }).runtime === 'legacy' && mundo({ ...abierta, cuentas: ['*'] }).motivo === 'configuracion_ilegible'
    && mundo({ ...abierta, cuentas: 'todas' }).runtime === 'legacy');

  const puerta = sinComentarios(leer('functions/src/creator/mundo.ts'));
  const preparar = puerta.slice(puerta.indexOf('const prepararElMundo'), puerta.indexOf('const estadoDelMundo'));
  check('A4) la obligación la declara la PUERTA DEL MUNDO en su código, como su capacidad; brainChat y generateVideo no la piden',
    /const LISTA_DE_CUENTAS_OBLIGATORIA = true;/.test(puerta) && /listaObligatoria: LISTA_DE_CUENTAS_OBLIGATORIA,/.test(puerta)
    && !/listaObligatoria/.test(sinComentarios(leer('functions/src/creator/brain.ts'))) && !/listaObligatoria/.test(sinComentarios(leer('functions/src/creator/video.ts'))));
  check('A5) y va ANTES que la jurisdicción, la elegibilidad y el Router: world.generate → puerta (habilitada, lista) → jurisdicción → Router',
    preparar.indexOf('decidirRuntime(') > 0 && preparar.indexOf('decidirRuntime(') < preparar.indexOf('jurisdiccionesDeLaCuenta(uid)')
    && preparar.indexOf('jurisdiccionesDeLaCuenta(uid)') < preparar.indexOf('engine.route('));
  check('A6) no hay un segundo sistema de permisos: la lista vive en `aiSettings/runtime` (la misma lectura de siempre) y la decide `decidirRuntime`',
    (puerta.match(/configuracionDeLaPuerta\(/g) || []).length === 1 && !/aiSettings\/|collection\('aiSettings'\)/.test(puerta));
});

/* ═══ B · EL CUPO DEL DÍA ═══════════════════════════════════════════════════ */
console.log('\n── B · El cupo del día: cinco mundos que SALEN ──');
await seccion('B', async () => {
  const UID = 'cuentaDePrueba01';
  const HOY = '2026-10-06';
  const AYER = '2026-10-05';
  const MUNDO = { '3d': 1 };
  const op = (r) => `world.generate#${r}`;
  const { db, docs, escrituras } = firestoreDeMentira();
  const limiter = createLimiter({ db: () => db, now: () => 'ahora' });

  await limiter.reserve(UID, MUNDO, DEFAULT_LIMITS, op('req-1'), HOY);
  await limiter.reserve(UID, MUNDO, DEFAULT_LIMITS, op('req-1'), HOY);
  check('B1) la misma operación cuenta UNA vez (reintentos con el mismo requestId), y queda anotado QUÉ contó',
    huecoDe(docs, UID, HOY)['3d'] === 1 && iguales(entradaDe(docs, UID, HOY, op('req-1')), { estado: 'contada', cuenta: { '3d': 1 } }));

  for (const r of ['req-2', 'req-3', 'req-4', 'req-5']) await limiter.reserve(UID, MUNDO, DEFAULT_LIMITS, op(r), HOY);
  const antes = escrituras();
  const sexto = await lanzado(() => limiter.comprobar(UID, MUNDO, DEFAULT_LIMITS, op('req-6'), HOY));
  const suyo = await lanzado(() => limiter.comprobar(UID, MUNDO, DEFAULT_LIMITS, op('req-3'), HOY));
  check('B2) con cinco ocupados, ¿cabe un sexto? No (RATE_LIMITED, con la modalidad para que la app diga «hoy ya no») — y preguntarlo no escribe nada; una operación ya contada cabe en su propio hueco',
    sexto?.code === 'RATE_LIMITED' && sexto.details?.modality === '3d' && suyo === null && escrituras() === antes && DEFAULT_LIMITS.perUserPerDay['3d'] === 5);

  const devuelto = await limiter.liberar(UID, op('req-2'), HOY);
  const otraVez = await limiter.liberar(UID, op('req-2'), HOY);
  check('B3) un mundo que NO salió devuelve lo que ocupó UNA vez: devolverlo dos veces no regala dos huecos',
    devuelto === true && otraVez === false && huecoDe(docs, UID, HOY)['3d'] === 4 && entradaDe(docs, UID, HOY, op('req-2'))?.estado === 'devuelta');
  check('B4) con el hueco devuelto, el sexto cabe', (await lanzado(() => limiter.comprobar(UID, MUNDO, DEFAULT_LIMITS, op('req-6'), HOY))) === null);

  await limiter.reserve(UID, MUNDO, DEFAULT_LIMITS, op('req-2'), HOY);
  check('B5) si la MISMA operación vuelve a reservar después de devolverse, vuelve a contar (nadie se cuela por una carrera)',
    huecoDe(docs, UID, HOY)['3d'] === 5 && entradaDe(docs, UID, HOY, op('req-2'))?.estado === 'contada');

  const gastado = await limiter.consumir(UID, op('req-4'), HOY);
  const noVuelve = await limiter.liberar(UID, op('req-4'), HOY);
  await limiter.reserve(UID, MUNDO, DEFAULT_LIMITS, op('req-4'), HOY);
  check('B6) la persona cancela con el proveedor ya trabajando: el hueco se queda GASTADO —liberarlo no hace nada— y volver a reservarlo no suma',
    gastado === true && noVuelve === false && huecoDe(docs, UID, HOY)['3d'] === 5 && entradaDe(docs, UID, HOY, op('req-4'))?.estado === 'consumida');

  await limiter.reserve(UID, MUNDO, DEFAULT_LIMITS, op('req-ayer'), AYER);
  await limiter.liberar(UID, op('req-ayer'), AYER);
  check('B7) el hueco vuelve al DÍA EN QUE SE OCUPÓ, no al de quien lo devuelve: ayer queda en 0 y hoy no se toca',
    huecoDe(docs, UID, AYER)['3d'] === 0 && huecoDe(docs, UID, HOY)['3d'] === 5);

  const malReserva = await lanzado(() => limiter.reserve(UID, MUNDO, DEFAULT_LIMITS, op('req-x'), '06/10/2026'));
  const malLiberar = await lanzado(() => limiter.liberar(UID, op('req-1'), 'ayer'));
  const malConsumir = await lanzado(() => limiter.consumir(UID, op('req-1'), '06/10/2026'));
  check('B8) un día mal escrito es un error de quien llama, en las cuatro: nunca se convierte en «hoy» en silencio (ocuparía un hueco que después no se podría devolver)',
    !!malReserva && !!malLiberar && !!malConsumir && !(await lanzado(() => limiter.comprobar(UID, MUNDO, DEFAULT_LIMITS, op('req-1'), 'mañana')) === null)
    && huecoDe(docs, UID, HOY)['3d'] === 5);

  /* Revisión de seguridad (2026-10-06): la clave de una operación es la de quien la nombra, y el vídeo nombra las suyas por el requestId a secas. */
  const { db: dbX, docs: docsX } = firestoreDeMentira();
  const limX = createLimiter({ db: () => dbX, now: () => 'ahora' });
  for (const r of ['w1', 'w2', 'w3', 'w4', 'w5']) await limX.reserve(UID, MUNDO, DEFAULT_LIMITS, op(r), HOY);
  /* Lo que deja generateVideo antes de un INSUFFICIENT_CREDITS: su operación contada, sin ningún cobro. */
  await limX.reserve(UID, { video: 1 }, DEFAULT_LIMITS, 'prestada', HOY);
  const cruzado = await lanzado(() => limX.comprobar(UID, MUNDO, DEFAULT_LIMITS, op('prestada'), HOY));
  const cuelaReserva = await lanzado(() => limX.reserve(UID, MUNDO, DEFAULT_LIMITS, op('prestada'), HOY));
  const devuelveAjeno = await limX.liberar(UID, op('prestada'), HOY);
  /* Segunda pasada: tampoco uno hecho A MEDIDA, porque la operación del mundo lleva «#», que un requestId no admite. */
  await limX.reserve(UID, { video: 1 }, DEFAULT_LIMITS, 'world.generate:cruzada', HOY);
  const aMedida = await lanzado(() => limX.comprobar(UID, MUNDO, DEFAULT_LIMITS, op('cruzada'), HOY));
  const ningunRequestIdEsUnMundo = ['world.generate#cruzada', op('x')].every((r) => { try { assertRequestId(r); return false; } catch { return true; } });
  check('B9) un requestId que contó para un VÍDEO —el mismo, o uno hecho a medida— no hace pasar un sexto mundo ni devuelve un hueco 3D que no ocupó: la operación del mundo lleva «#», que ningún requestId admite',
    cruzado?.code === 'RATE_LIMITED' && cuelaReserva?.code === 'RATE_LIMITED' && devuelveAjeno === false && aMedida?.code === 'RATE_LIMITED'
    && ningunRequestIdEsUnMundo && huecoDe(docsX, UID, HOY)['3d'] === 5 && huecoDe(docsX, UID, HOY).video === 2);
  /* Y si aun así una operación contada no cubre lo que se pide (otra cosa con el mismo nombre), es un conflicto, no «ya está». */
  await limX.reserve(UID, { video: 1 }, DEFAULT_LIMITS, op('forzada'), HOY).catch(() => undefined);
  const conflicto = await lanzado(() => limX.comprobar(UID, MUNDO, DEFAULT_LIMITS, op('forzada'), HOY));
  const conflictoAlReservar = await lanzado(() => limX.reserve(UID, MUNDO, DEFAULT_LIMITS, op('forzada'), HOY));
  check('B9b) una operación ya contada que NO cubre lo que se pide no se toma por hecha: conflicto (INVALID_REQUEST), sin tocar el cupo',
    conflicto?.code === 'INVALID_REQUEST' && conflicto.details?.reason === 'operacion_de_otro_cupo' && conflictoAlReservar?.code === 'INVALID_REQUEST'
    && huecoDe(docsX, UID, HOY)['3d'] === 5);

  /* La forma de antes (`true`, sin desglose): cuenta, pero no se puede devolver —no se sabe qué ocupó—. */
  const { db: dbL, docs: docsL } = firestoreDeMentira();
  docsL.set(`aiRateLimits/${UID}_${HOY}`, { video: 1, operaciones: { [claveDe('vieja')]: true } });
  const limL = createLimiter({ db: () => dbL, now: () => 'ahora' });
  await limL.reserve(UID, { video: 1 }, DEFAULT_LIMITS, 'vieja', HOY);
  check('B10) una operación anotada a la manera de antes sigue contando (el vídeo no cambia) y no se devuelve a ciegas',
    huecoDe(docsL, UID, HOY).video === 1 && (await limL.liberar(UID, 'vieja', HOY)) === false && huecoDe(docsL, UID, HOY).video === 1);

  /* Segunda pasada: una operación devuelta que vuelve a contar OTRA cosa no arrastra lo que contó antes (el merge de Firestore). */
  const { db: dbM, docs: docsM } = firestoreDeMentira();
  const limM = createLimiter({ db: () => dbM, now: () => 'ahora' });
  await limM.reserve(UID, { video: 1 }, DEFAULT_LIMITS, 'otra-vez', HOY);
  await limM.liberar(UID, 'otra-vez', HOY);
  await limM.reserve(UID, MUNDO, DEFAULT_LIMITS, 'otra-vez', HOY);
  await limM.liberar(UID, 'otra-vez', HOY);
  check('B10b) lo que se vuelve a contar se apunta ENTERO: lo de la vez anterior queda a cero y devolver no lo resta otra vez',
    huecoDe(docsM, UID, HOY).video === 0 && huecoDe(docsM, UID, HOY)['3d'] === 0 && iguales(huecoDe(docsM, UID, HOY).cuentas?.[claveDe('otra-vez')], { video: 0, '3d': 1 }));

  /* Y con la forma de siempre en `operaciones`: si hay marcha atrás, el código de antes sigue viendo contada una operación contada. */
  check('B10c) `operaciones[clave]` sigue siendo `true` mientras cuenta (lo que entiende el código de antes); lo que contó va aparte, en `cuentas`',
    huecoDe(docs, UID, HOY).operaciones?.[claveDe(op('req-1'))] === true && iguales(huecoDe(docs, UID, HOY).cuentas?.[claveDe(op('req-1'))], { '3d': 1 }));

  /* Cinco que salen, como mucho: cualquier mezcla de éxitos y fallos con devolución termina con ≤ 5 contados. */
  const { db: db2, docs: docs2 } = firestoreDeMentira();
  const lim2 = createLimiter({ db: () => db2, now: () => 'ahora' });
  let exitos = 0;
  for (let i = 1; i <= 12; i++) {
    const req = op(`r-${i}`);
    if (await lanzado(() => lim2.comprobar(UID, MUNDO, DEFAULT_LIMITS, req, HOY))) continue;
    if (await lanzado(() => lim2.reserve(UID, MUNDO, DEFAULT_LIMITS, req, HOY))) continue;
    if (i % 2 === 0) await lim2.liberar(UID, req, HOY); /* falló: vuelve */
    else exitos++;
  }
  check('B11) doce intentos, la mitad fallan: salen EXACTAMENTE cinco y los fallos no gastaron ninguno',
    exitos === 5 && huecoDe(docs2, UID, HOY)['3d'] === 5);
});

/* ═══ C · EL HUECO SIGUE AL DINERO ══════════════════════════════════════════ */
console.log('\n── C · El barrido devuelve el hueco con el dinero ──');
await seccion('C', async () => {
  const DIA = '2026-10-06';
  const OP = 'world.generate#req-w';
  const meta = (extra = {}) => ({ creditRequestId: 'req-w', creditTransactionId: 'usage_req-w', creditsEstimated: 12, service: 'ai_world',
    [CLAVE_DE_LA_OPERACION_DEL_CUPO]: OP, [CLAVE_DEL_DIA_DEL_CUPO]: DIA, ...extra });
  const job = (state, attempts = [], metadata = meta()) => ({ jobId: 'job-w', state, attempts, metadata, owner: { userId: 'u1' } });

  check('C1) la reserva leída del trabajo lleva su hueco (la operación del limitador y el día); sin las dos claves, ningún hueco (vídeo, Weë Brain)',
    iguales(reservaDe(job('failed'))?.cupo, { operacion: OP, dia: DIA })
    && reservaDe(job('failed', [], meta({ [CLAVE_DEL_DIA_DEL_CUPO]: undefined })))?.cupo === undefined
    && reservaDe(job('failed', [], { creditRequestId: 'r', creditTransactionId: 't', creditsEstimated: 1 }))?.cupo === undefined);

  const intento = (extra) => ({ attemptId: 'a1', number: 1, ...extra });
  const tabla = [
    ['falló el proveedor', job('failed', [intento({ dispatched: true, outcome: 'failed' })]), 'reembolsar'],
    ['se agotó el plazo', job('timed_out', [intento({ dispatched: true, outcome: 'failed' })]), 'reembolsar'],
    ['cancelado antes de salir', job('cancelled', [intento({ dispatched: false })]), 'reembolsar'],
    ['salió bien', job('completed', [intento({ dispatched: true, outcome: 'succeeded' })]), 'liquidar'],
    ['salió y no se sabe (aviso perdido sin respuesta)', job('failed', [intento({ dispatched: true, outcome: 'unknown' })]), 'reconciliar'],
  ];
  const malTabla = tabla.filter(([, j, tipo]) => decidirLiquidacion(j, 0).tipo !== tipo);
  check('C2) la regla del dinero de siempre decide: fallo, plazo o cancelado antes de salir → se devuelve; salió bien → se cobra; no se sabe → se reconcilia',
    malTabla.length === 0, JSON.stringify(malTabla.map(([nombre, j]) => [nombre, decidirLiquidacion(j, 0)])));

  const liberados = [];
  const cupo = { liberar: async (...args) => { liberados.push(args); return true; } };
  const ledger = { settle: async () => undefined };
  const puerto = (credits, c = cupo) => runtime.liquidacionDeWee({ credits, ledger, cupo: c });
  /* Lo que contesta el Credit Engine de verdad: `refundCredits` NO lanza si ya estaba devuelta, dice `duplicate: true`. */
  const devuelve = { refundCredits: async () => ({ duplicate: false }), completeCredits: async () => ({ status: 'COMPLETED' }) };
  const yaDevuelta = { refundCredits: async () => ({ duplicate: true }), completeCredits: async () => ({ status: 'COMPLETED' }) };
  const reserva = reservaDe(job('failed'));

  const r1 = await puerto(devuelve).reembolsar({ userId: 'u1', reserva, motivo: 'fallo_definitivo', jobId: 'job-w' });
  check('C3) se DEVUELVE la reserva → vuelve el hueco: la operación y el día que viajan en el trabajo (lo que ocupó lo sabe el limitador)',
    r1.desenlace === 'reembolsada' && iguales(liberados, [['u1', OP, DIA]]));

  liberados.length = 0;
  await puerto(devuelve).liquidar({ userId: 'u1', reserva, importe: 12, jobId: 'job-w' });
  const cobrada = await puerto({ refundCredits: async () => { throw Object.assign(new Error('no'), { code: 'NOT_REFUNDABLE', details: { status: 'COMPLETED' } }); } })
    .reembolsar({ userId: 'u1', reserva, motivo: 'fallo_definitivo', jobId: 'job-w' });
  check('C4) un mundo COBRADO no devuelve su hueco: ni al liquidar ni si ya estaba cobrado', liberados.length === 0 && cobrada.desenlace === 'ya_estaba');

  const ya = await puerto(yaDevuelta).reembolsar({ userId: 'u1', reserva, motivo: 'fallo_definitivo', jobId: 'job-w' });
  check('C5) devuelta ANTES (por la puerta): el Credit Engine contesta `duplicate` y el barrido también devuelve el hueco (idempotente: si ya volvió, el limitador no hace nada)',
    ya.desenlace === 'ya_estaba' && ya.estado === 'REFUNDED' && liberados.length === 1);

  liberados.length = 0;
  const sinHueco = reservaDe(job('failed', [], { creditRequestId: 'r', creditTransactionId: 't', creditsEstimated: 1 }));
  await puerto(devuelve).reembolsar({ userId: 'u1', reserva: sinHueco, motivo: 'fallo_definitivo', jobId: 'j' });
  check('C6) sin hueco en el trabajo (vídeo, Weë Brain), nada que devolver', liberados.length === 0);

  const averia = await puerto(devuelve, { liberar: async () => { throw new Error('Firestore no contesta'); } })
    .reembolsar({ userId: 'u1', reserva, motivo: 'fallo_definitivo', jobId: 'job-w' });
  check('C7) si el limitador falla, el dinero ya está devuelto y se dice así: la avería deja un hueco de menos, nunca uno de más',
    averia.desenlace === 'reembolsada' && averia.estado === 'REFUNDED');

  /* De punta a punta con el limitador de verdad. */
  const { db, docs } = firestoreDeMentira();
  const limiter = createLimiter({ db: () => db, now: () => 'ahora' });
  await limiter.reserve('u1', { '3d': 1 }, DEFAULT_LIMITS, OP, DIA);
  await runtime.liquidacionDeWee({ credits: devuelve, ledger, cupo: limiter }).reembolsar({ userId: 'u1', reserva, motivo: 'fallo_definitivo', jobId: 'job-w' });
  const devueltoDeVerdad = huecoDe(docs, 'u1', DIA)['3d'] === 0 && entradaDe(docs, 'u1', DIA, OP)?.estado === 'devuelta';
  await limiter.reserve('u1', { '3d': 1 }, DEFAULT_LIMITS, 'world.generate#req-c', DIA);
  await limiter.consumir('u1', 'world.generate#req-c', DIA);
  const reservaC = reservaDe(job('cancelled', [], meta({ creditRequestId: 'req-c', creditTransactionId: 'usage_req-c', [CLAVE_DE_LA_OPERACION_DEL_CUPO]: 'world.generate#req-c' })));
  await runtime.liquidacionDeWee({ credits: devuelve, ledger, cupo: limiter }).reembolsar({ userId: 'u1', reserva: reservaC, motivo: 'fallo_definitivo', jobId: 'job-c' });
  check('C8) con el limitador de verdad: un fallo devuelve el hueco; la persona que canceló con el proveedor trabajando recupera el dinero (regla de la parada) pero su hueco se queda gastado',
    devueltoDeVerdad && huecoDe(docs, 'u1', DIA)['3d'] === 1 && entradaDe(docs, 'u1', DIA, 'world.generate#req-c')?.estado === 'consumida');
});

/* ═══ D · LA PUERTA DEL MUNDO ═══════════════════════════════════════════════ */
console.log('\n── D · La puerta del mundo: el cupo en su orden ──');
await seccion('D', async () => {
  const puerta = sinComentarios(leer('functions/src/creator/mundo.ts'));
  const crear = puerta.slice(puerta.indexOf("if (Number(data.creditosCotizados) !== p.credits)"));
  check('D1) ¿cabe? antes de tocar Credits; el hueco, una vez reservado el dinero; un solo `comprobar` y un solo `reserve` al crear, con la operación y el día de la petición',
    crear.indexOf('limiter.comprobar(') > 0 && crear.indexOf('limiter.comprobar(') < crear.indexOf('creditEngine.spendCredits(')
    && crear.indexOf('creditEngine.spendCredits(') < crear.indexOf('limiter.reserve(')
    && /limiter\.comprobar\(uid, CUPO_DEL_MUNDO, settings\.limits, operacionDelCupo\(requestId\), dia\)/.test(crear)
    && /limiter\.reserve\(uid, CUPO_DEL_MUNDO, settings\.limits, operacionDelCupo\(requestId\), dia\)/.test(crear)
    && (crear.match(/limiter\.(reserve|comprobar)\(/g) || []).length === 2 && (puerta.match(/creditEngine\.spendCredits\(/g) || []).length === 1);
  check('D2) la operación del cupo tiene nombre propio (la capacidad, «#» —que un requestId no admite— y el requestId) y viaja con el día: en la reserva de Credits y en el trabajo',
    /const operacionDelCupo = \(requestId: string\): string => `\$\{CAPACIDAD_DEL_CANARY\}#\$\{requestId\}`;/.test(puerta)
    && /meta: \{ estimatedUsd: p\.usd, \[CLAVE_DEL_DIA_DEL_CUPO\]: dia \}/.test(puerta)
    && /\[CLAVE_DE_LA_OPERACION_DEL_CUPO\]: operacionDelCupo\(requestId\),\s*\[CLAVE_DEL_DIA_DEL_CUPO\]: dia,/.test(puerta));
  check('D3) si el hueco no cabe ya (otro mundo ocupó el último), lo reservado vuelve entero —por el sitio de siempre— y el error sube; si el reembolso falla, sube ESE error (incierto: la app pregunta por la petición, y eso la devuelve)',
    /try \{\s*await limiter\.reserve\(uid, CUPO_DEL_MUNDO, settings\.limits, operacionDelCupo\(requestId\), dia\);\s*\} catch \(error\) \{\s*await devolverLoReservado\(uid, requestId, \{ reason: '[^']+', siFalla: 'sube' \}\);\s*throw error;/.test(puerta));
  /* Revisión de código: «el hueco sigue al dinero» no puede depender de acordarse en cada camino. */
  const ayudante = puerta.slice(puerta.indexOf('const devolverLoReservado'), puerta.indexOf('const gastarElHueco'));
  check('D4) el dinero solo se devuelve en UN sitio de la puerta (`devolverLoReservado`), que devuelve también el hueco; un reembolso suelto en otro camino rompe esta prueba',
    (puerta.match(/creditEngine\.refundCredits\(/g) || []).length === 1 && /creditEngine\.refundCredits\(/.test(ayudante)
    && /await devolverElHuecoSiNoSalio\(uid, requestId\);\s*\};/.test(ayudante)
    && (puerta.match(/await devolverLoReservado\(uid, requestId, \{ reason: /g) || []).length === 4
    /* y «sube» no libera el hueco si el reembolso falla: el hueco sigue al dinero. */
    && /if \(opciones\.siFalla === 'sube'\) await reembolso;/.test(ayudante));
  check('D5) y cuando el reembolso lo hizo otro (la reserva sin trabajo de `sinReservaHuerfana`), o al preguntar por un mundo que acabó sin salir, el hueco también vuelve',
    /if \(await trabajoDelMundo\(uid, requestId\)\) return \{[^}]*\}[^;]*;\s*await devolverElHuecoSiNoSalio\(uid, requestId\);\s*throw error;/.test(puerta)
    && /if \(estado === 'fallido' \|\| estado === 'cancelado'\) await devolverElHuecoSiNoSalio\(uid, requestId\);/.test(puerta));
  check('D6) y solo si la reserva de ESE mundo, de ESA cuenta, quedó DEVUELTA, al día que anotó, con su operación',
    /reserva\.userId !== uid \|\| reserva\.service !== SERVICIO_DEL_MUNDO \|\| reserva\.status !== 'REFUNDED' \|\| typeof dia !== 'string'\) return;/.test(puerta)
    && /await limiter\.liberar\(uid, operacionDelCupo\(requestId\), dia\);/.test(puerta));
  check('D7) cancelar con el proveedor trabajando gasta el hueco; cancelar lo que no salió, no',
    /if \(parada\.estado === 'pedida' && parada\.job\.attempts\.some\(\(a\) => a\.dispatched === true\)\) \{\s*await gastarElHueco\(uid, requestId, parada\.job\.metadata\);/.test(puerta)
    && /await limiter\.consumir\(uid, operacionDelCupo\(requestId\), dia\)/.test(puerta));
  check('D8) al COTIZAR ya se dice si hoy no cabe otro mundo, antes de enseñar un precio y sin apuntar nada',
    /if \(op === 'cotizar'\) \{\s*const p = await prepararElMundo\(uid, data\.peticion\);\s*await limiter\.comprobar\(uid, CUPO_DEL_MUNDO, \(await loadConfig\(\)\)\.settings\.limits\);/.test(puerta));
  check('D9) ni un segundo sistema de cupos: el limitador de siempre (`engine/limits`), en la misma colección',
    /import \{ dayKey, limiter \} from '\.\.\/engine\/limits';/.test(puerta) && !/aiRateLimits/.test(puerta));

  /* Y la app lo dice como es: el cupo de mundos es del día, sin «inténtalo en un momento». */
  const cupoDelDia = Object.assign(new Error('x'), { code: 'functions/resource-exhausted', details: { code: 'RATE_LIMITED', modality: '3d', limit: 5, used: 5 } });
  const r = MUNDO3D_APP.errorDelMundo3D(cupoDelDia);
  const vista = MUNDO3D_APP.presentacionDelMundo3D({ ...MUNDO3D_APP.estadoInicialDelMundo3D?.() ?? {}, fase: 'fallido', error: r }, { cuenta: 'u1' });
  check('D10) en la app, el sexto mundo: «ya usaste los mundos 3D de hoy», sin reintentar; con «ver mis creaciones» y «volver»',
    r?.tipo === 'cupo_del_dia' && r.clave === 'studio.worldDailyLimit' && r.reintentable === false
    && vista.claveMensaje === 'studio.worldDailyLimit' && iguales(vista.acciones, ['ver_creaciones', 'volver']), JSON.stringify({ r, acciones: vista.acciones }));
});

/* ═══ E · JURISDICCIÓN SIN FRICCIÓN ═════════════════════════════════════════ */
console.log('\n── E · Jurisdicción: el país del Perfil Real, sin preguntar nada ──');
await seccion('E', async () => {
  const delCatalogo = [...leer('data/countries.ts').matchAll(/code: '([A-Z]{2})'/g)].map((m) => m[1]).sort();
  const GENERADOR = await import(pathToFileURL(path.join(RAIZ, 'scripts/paises-del-catalogo.mjs')).href);
  check('E1) el servidor conoce EXACTAMENTE los países que ofrece el registro (`data/countries.ts`), por un archivo GENERADO que está al día',
    iguales([...PAISES_DEL_CATALOGO].sort(), delCatalogo) && delCatalogo.length > 0
    && leer('functions/src/shared/paisesDelCatalogo.ts') === GENERADOR.archivoGenerado(GENERADOR.codigosDelCatalogo(leer('data/countries.ts')))
    && !/PAISES_DEL_CATALOGO: ReadonlySet<string> = new Set\(\[/.test(leer('functions/src/engine/jurisdiccion.ts')));

  const perfil = (country) => ({ uid: 'u1', profileType: 'real', country });
  const raros = ['UK', 'EU', 'ZZ', 'RE', 'EA', 'IC', 'XK', 'AA'];
  check('E2) un valor con forma de código que no es un país del catálogo no da jurisdicción («UK», «EU», «ZZ», un territorio…): para un modelo territorial, JURISDICTION_UNKNOWN',
    raros.every((c) => jurisdiccionesDeclaradas('u1', [perfil(c)]) === undefined)
    && iguales(jurisdiccionesDeclaradas('u1', [perfil('PE')]), ['PE']) && E.modeloElegible(HW).estado === 'JURISDICTION_UNKNOWN');
  check('E2b) con varios Perfiles Reales, basta UNO que declare algo que no es un país del catálogo para que la cuenta quede sin jurisdicción (no se elige el país del otro); un perfil vacío no cuenta',
    jurisdiccionesDeclaradas('u1', [perfil('US'), perfil('UK')]) === undefined && jurisdiccionesDeclaradas('u1', [perfil('ES'), perfil('es')]) === undefined
    && iguales(jurisdiccionesDeclaradas('u1', [perfil('US'), perfil('')]), ['US']) && iguales(jurisdiccionesDeclaradas('u1', [perfil('US'), perfil('MX')]), ['MX', 'US']));

  const ULTRAPERIFERICAS = ['GF', 'GP', 'MQ', 'RE', 'YT', 'MF', 'AX', 'IC', 'EA'];
  /* Ligados al Reino Unido (dependencias de la Corona y territorios de ultramar): si cuentan como «Reino Unido» para una licencia lo decide legal. */
  const LIGADOS_AL_REINO_UNIDO = ['GI', 'JE', 'GG', 'IM', 'BM', 'KY', 'VG', 'TC', 'AI', 'MS', 'FK', 'SH', 'PN', 'IO', 'GS'];
  check('E3) ningún territorio de la UE con código propio entra en el catálogo sin entrar en el grupo «EU», y ninguno ligado al Reino Unido entra sin una decisión de legal (hoy: ninguno está, así que no se pueden declarar)',
    ULTRAPERIFERICAS.every((c) => !PAISES_DEL_CATALOGO.has(c) || E.GRUPOS_DE_JURISDICCIONES.EU.includes(c))
    && LIGADOS_AL_REINO_UNIDO.every((c) => !PAISES_DEL_CATALOGO.has(c)));

  check('E4) Hunyuan World: bloqueado en EU/GB/KR; el resto, aprobado POR TERRITORIO (política del dueño); su revisión global sigue REVIEW_REQUIRED y DISABLED, sin BLOCKED_GLOBAL',
    HW.territorio.bloqueadas.join() === 'EU,GB,KR' && HW.territorio.resto === 'APPROVED' && HW.territorio.aprobadas.length === 0
    && HW.gobierno.reviewStatus === 'REVIEW_REQUIRED' && HW.gobierno.active === 'DISABLED');

  const veredicto = (j) => E.modeloElegible(HW, undefined, { jurisdicciones: [j] }).estado;
  check('E5) hoy: Perú no está bloqueado (pasa el territorio) pero no es elegible por su revisión global; España está bloqueada. En NINGUNA parte es elegible',
    veredicto('PE') === 'REVIEW_REQUIRED' && veredicto('ES') === 'BLOCKED_FOR_JURISDICTION' && veredicto('GB') === 'BLOCKED_FOR_JURISDICTION'
    && [...PAISES_DEL_CATALOGO].every((j) => !E.modeloElegible(HW, undefined, { jurisdicciones: [j] }).elegible));

  /* El día que legal lo apruebe y se active: la misma ficha con su gobierno aprobado (una COPIA, en esta prueba). */
  const aprobado = { ...HW, gobierno: { ...HW.gobierno, reviewStatus: 'APPROVED', active: 'ACTIVE' } };
  check('E6) …con su revisión aprobada y activo: Perú → elegible; España, Reino Unido, Corea → fuera; sin país → no elegible',
    E.modeloElegible(aprobado, undefined, { jurisdicciones: ['PE'] }).elegible === true
    && ['ES', 'FR', 'GB', 'KR'].every((j) => E.modeloElegible(aprobado, undefined, { jurisdicciones: [j] }).estado === 'BLOCKED_FOR_JURISDICTION')
    && E.modeloElegible(aprobado).estado === 'JURISDICTION_UNKNOWN');

  /* El Router de verdad, con proveedores falsos: el cambio de modelo es automático y la persona no ve nada de dentro. */
  const CAP = 'world.generate';
  const proveedor = (id, modelos) => ({ id, name: id, modalities: ['3d'], models: modelos.map((m) => ({ ...m, provider: id })),
    isConfigured: () => true, supports: (c) => c === CAP, llamadas: 0,
    async run(req) { this.llamadas++; return { output: { kind: 'world', url: `https://storage.test/${id}.bin` }, costUSD: 0.3, latencyMs: 1, model: req.model.id }; } });
  const demo = { id: 'mock', name: 'demo', modalities: ['3d'], models: [{ id: 'demo', provider: 'mock', capabilities: [CAP], quality: 1, speed: 3, cost: { unit: 'call', usd: 0 } }], isConfigured: () => true, supports: () => true, async run() { throw new Error('el demo no sustituye'); } };
  const configuracion = (cadena) => ({ providers: { mock: { enabled: true, priority: 99 }, ...Object.fromEntries(cadena.map((p, i) => [p, { enabled: true, priority: i + 1 }])) },
    routing: { [CAP]: { capability: CAP, chain: cadena.map((provider) => ({ provider })), policy: 'quality-first' } }, settings: { ...DEFAULT_SETTINGS, allowMockFallback: true }, source: 'test' });
  const routerCon = (adapters, cadena) => createRouter({ adapters, loadConfig: async () => configuracion(cadena), ledger: memoryLedger(), health: memoryHealth(() => 1_000), now: () => 1_000 });
  const gobiernoAlt = { ...HW.gobierno, providerModelId: 'alt/1', reviewStatus: 'APPROVED', active: 'ACTIVE', commercialUseStatus: 'ALLOWED' };
  const alternativo = { id: 'alternativo', capabilities: [CAP], quality: 3, speed: 3, cost: { unit: 'call', usd: 0.2 }, gobierno: gobiernoAlt };
  const conAlternativa = routerCon({ terra: proveedor('terra', [{ ...aprobado, quality: 5 }]), otro: proveedor('otro', [alternativo]), mock: demo }, ['terra', 'otro']);
  const pide = (jurisdicciones) => ({ capability: CAP, input: { prompt: 'una plaza' }, userId: 'u1', requestId: 'req-1', jurisdicciones });
  const enPeru = await conAlternativa.route(pide(['PE']));
  const enEspana = await conAlternativa.route(pide(['ES']));
  check('E7) FALLBACK AUTOMÁTICO: en Perú sirve el mejor (el territorial, aprobado); en España, bloqueado, el Router pasa SOLO al alternativo',
    enPeru.candidates[0]?.provider === 'terra' && enEspana.candidates.map((c) => c.provider).join() === 'otro');

  const soloTerritorial = routerCon({ terra: proveedor('terra', [aprobado]), mock: demo }, ['terra']);
  const sinAlternativa = await lanzado(() => soloTerritorial.execute(pide(['ES'])));
  check('E8) sin alternativa: NOT_AVAILABLE «Esta función no está disponible actualmente en tu región.», con el motivo público y NADA más (ni proveedor, ni modelo, ni licencia, ni escalón)',
    sinAlternativa?.code === 'NOT_AVAILABLE' && JSON.stringify(sinAlternativa.details) === '{"reason":"en_tu_region"}'
    && MENSAJE_DE_NO_DISPONIBLE.en_tu_region === 'Esta función no está disponible actualmente en tu región.'
    && !/terra|hunyuan|fal|licen|REVIEW|BLOCKED/i.test(JSON.stringify({ m: sinAlternativa.message, d: sinAlternativa.details })));

  const hoy = await lanzado(() => routerCon({ terra: proveedor('terra', [HW]), mock: demo }, ['terra']).execute(pide(['PE'])));
  check('E9) REVIEW_REQUIRED es gobierno interno: hoy, en Perú, «no disponible actualmente» a secas —ni revisión, ni región, ni nada que preguntarle a la persona—',
    hoy?.code === 'NOT_AVAILABLE' && JSON.stringify(hoy.details) === '{"reason":"no_disponible"}'
    && motivoDeNoDisponible([{ causa: 'elegibilidad', estado: 'REVIEW_REQUIRED', enOtraJurisdiccion: false }]) === 'no_disponible'
    && noDisponible('no_disponible').message === 'Esta función no está disponible actualmente.');
});

/* ═══ F · DERECHOS Y PROCEDENCIA ════════════════════════════════════════════ */
console.log('\n── F · Derechos y procedencia: completos en el material, resumidos para la persona ──');
await seccion('F', async () => {
  const CUENTA = 'uAnaCuenta0000000000000001';
  const id = (k) => `asset_${k.toString(16).padStart(32, '0')}`;
  const objeto = (assetId, pieza = 'original') => ({ provider: 'wee', bucket: 'wee-pruebas', objectKey: `users/${CUENTA}/ai-generations/${assetId}-${pieza}` });
  const derechosDelMundo = E.derechosDelModelo(HW);
  const material = (extra) => ({ contract: '1.0', ownerAccountId: CUENTA, status: 'ready', createdByEntityId: '00000001', createdByEntityType: 'REAL_PROFILE', ...extra });
  const MUNDO = material({
    assetId: id(2), kind: 'world', mimeType: 'application/octet-stream', bytes: 48_000_000, storageRef: objeto(id(2)),
    variants: [{ kind: 'preview', storageRef: objeto(id(2), 'preview'), mimeType: 'image/png' }],
    provenance: { createdAt: 20, jobId: 'job_1', requestId: 'req_1', capability: 'world.generate', provider: 'fal', model: HW.id },
    derechos: derechosDelMundo, name: 'Una plaza', createdAt: 20, updatedAt: 20,
  });
  const SILLA = material({ assetId: id(9), kind: 'model3d', mimeType: 'model/gltf-binary', storageRef: objeto(id(9)),
    provenance: { createdAt: 15, capability: 'image.generate' }, derechos: { revision: 'APPROVED', usoComercial: 'ALLOWED', atribucion: false, licencias: [{ nombre: 'Otra', url: 'https://example.org/l' }], jurisdiccionesBloqueadas: ['CN'] },
    createdAt: 15, updatedAt: 15 });
  const datos = (k, ahora, extra = {}) => ({ ownerAccountId: CUENTA, assetId: id(k), status: 'ready', ahora, storageRef: objeto(id(k)), mimeType: 'application/octet-stream',
    operacion: { jobId: `job_${k}`, requestId: `req_${k}`, capability: 'world.generate' }, createdByEntityId: '00000002', createdByEntityType: 'WEE_PROFILE', ...extra });

  check('F1) en el MATERIAL, todo: la procedencia con su proveedor y su modelo, y los derechos con sus licencias y su revisión (lo lee su dueño; la app no lo enseña)',
    A.materialValido(MUNDO) && MUNDO.provenance.provider === 'fal' && MUNDO.provenance.model === HW.id
    && derechosDelMundo.licencias.length >= 1 && derechosDelMundo.revision === 'REVIEW_REQUIRED' && iguales(derechosDelMundo.jurisdiccionesBloqueadas, ['EU', 'GB', 'KR']));

  const frasesDel = (asset) => D.frasesDeDerechos(asset.derechos);
  const delMundo = frasesDel(MUNDO);
  check('F2) para la PERSONA, un resumen: de dónde viene (hecho con IA en Weë, con un modelo de terceros con su licencia), uso comercial, atribución y dónde no se puede usar',
    iguales(delMundo.map((f) => f.clave), ['creaciones.rightsProvenance', 'creaciones.rightsCommercialRestricted', 'creaciones.rightsAttribution', 'creaciones.rightsBlockedIn'])
    && iguales(delMundo[3].lugares, ['EU', 'GB', 'KR']));
  check('F3) y el resumen de la puerta (`derechosVisibles`) dice lo MISMO que el del material', iguales(D.frasesDeDerechos(M3D.derechosVisibles(derechosDelMundo)), delMundo));

  const v2 = L.nuevaVersion(MUNDO, datos(3, 30));
  check('F4) una VERSIÓN del mundo es su propio material y conserva los derechos (o más estrictos): el mismo resumen',
    v2.ok && v2.asset.assetId !== MUNDO.assetId && v2.asset.storageRef.objectKey !== MUNDO.storageRef.objectKey
    && L.almenosTanEstrictos(v2.asset.derechos, MUNDO.derechos) && iguales(frasesDel(v2.asset), delMundo));

  const escena = L.materialDerivado('video', [v2.asset, SILLA], datos(20, 70, { mimeType: 'video/mp4', durationSec: 8, operacion: { capability: 'video.generate' } }));
  const frasesEscena = escena.ok ? frasesDel(escena.asset) : [];
  check('F5) lo que se hace CON el mundo (un plano de Filmmaker, una pieza de Design con otro material): los derechos se juntan y se ENDURECEN —nunca se relajan— y la persona sigue viendo de dónde viene',
    escena.ok && L.almenosTanEstrictos(escena.asset.derechos, v2.asset.derechos) && L.almenosTanEstrictos(escena.asset.derechos, SILLA.derechos)
    && frasesEscena[0]?.clave === 'creaciones.rightsProvenance' && iguales([...frasesEscena.find((f) => f.lugares).lugares].sort(), ['CN', 'EU', 'GB', 'KR'])
    && (escena.asset.provenance.sourceAssetIds || []).includes(v2.asset.assetId));

  const PROHIBIDOS = /\bfal\b|hunyuan|tencent|seedance|gemini|elevenlabs|bytedance|licencia comunitaria|community license|REVIEW_REQUIRED|providerModelId/i;
  const IDIOMAS = ['da', 'de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'pt-PT', 'ru', 'sv', 'tr', 'zh', 'zh-TW'];
  const valores = IDIOMAS.map((l) => (leer(`i18n/textos/${l}/creaciones.ts`).match(/rightsProvenance: '((?:[^'\\]|\\.)*)'/) || [])[1]);
  check('F6) la procedencia está en los dieciséis idiomas y ninguno nombra proveedor, modelo, licencia ni revisión (Weë sin traducir)',
    valores.every((v) => typeof v === 'string' && v.includes('Weë') && !PROHIBIDOS.test(v)), JSON.stringify(valores.filter((v) => !v || PROHIBIDOS.test(v))));
  check('F7) y el resumen nunca saca nada de dentro: ni licencias, ni revisión, ni proveedor, ni modelo',
    !PROHIBIDOS.test(JSON.stringify([delMundo, frasesEscena])) && !/https?:/.test(JSON.stringify([delMundo, frasesEscena])));
});

/* ═══ G · LO QUE SIGUE APAGADO ══════════════════════════════════════════════ */
console.log('\n── G · Preparado, no activado ──');
await seccion('G', async () => {
  const puerta = sinComentarios(leer('functions/src/creator/mundo.ts'));
  const grupos = JSON.parse(leer('ops/despliegue/grupos.json'));
  check('G1) la puerta del mundo no monta ninguna clave (ni FAL_KEY) y ninguna ruta de despliegue la incluye',
    !/secrets\s*:/.test(puerta) && !/FAL_KEY/.test(puerta) && JSON.stringify(grupos.no_se_despliegan ?? grupos).includes('generateWorld'));
  check('G2) la experiencia sigue cerrada en la app (`MUNDO_3D_EN_LA_APP = false`)', /export const MUNDO_3D_EN_LA_APP = false;/.test(leer('constants/studioExperiences.ts')));
  check('G3) Hunyuan sigue apagado y en revisión, y fal no tiene ninguna clave en el código', HW.gobierno.active === 'DISABLED' && HW.gobierno.reviewStatus === 'REVIEW_REQUIRED'
    && !/FAL_KEY\s*[:=]\s*['"][^'"]+['"]/.test(leer('functions/src/engine/providers/fal.ts')));
  check('G4) esta suite está en la cadena de `npm test`', /mundo3d-gobernanza\.test\.mjs/.test(leer('functions/package.json')));
});

console.log(failures ? `\n✘ ${failures} de ${n} fallaron` : `\n✔ ${n}/${n}`);
process.exit(failures ? 1 : 0);
