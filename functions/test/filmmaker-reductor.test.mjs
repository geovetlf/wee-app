/**
 * F1-C · WEË FILMMAKER — EL ESTADO OPTIMISTA Y EL CAS, DESDE EL CLIENTE.
 *
 * `utils/produccionOptimista.ts` (el reductor, puro) y
 * `utils/controladorDeProduccion.ts` (quién manda y cuándo) cargados tal cual.
 * Para el controlador hay un SERVIDOR EN MEMORIA con el contrato de
 * `productions`: revisión por lote, CAS con `aborted`, id de lote que reconoce
 * un reintento, y las operaciones aplicadas con el F1-A COMPILADO —no con el
 * espejo—, así que si el cliente y el servidor discreparan se vería aquí.
 *
 *   A · Cada gesto permitido se aplica en local, igual que en F1-A.
 *   B · Lo que F1-A rechaza no cambia nada y dice por qué.
 *   C · Agrupar: un lote congelado, con su revisión esperada y sin pasar del tope.
 *   D · Confirmación, fallo y reversión.
 *   E · El conflicto: se reconstruye sin pisar nada, y lo que ya no cabe se dice.
 *   F · El controlador contra el servidor en memoria: agrupar, reintentar, CAS, salir.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearCargador, leer, RAIZ } from './filmmaker-cliente.mjs';

const require = createRequire(import.meta.url);
let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const cargar = crearCargador();
const R = cargar('utils/produccionOptimista.ts');
const K = cargar('utils/controladorDeProduccion.ts');
/* El servidor: el F1-A compilado, el mismo `lib` que se desplegaría. */
const O = require(path.resolve(RAIZ, 'functions/lib/filmmaker/operaciones.js'));
const M = require(path.resolve(RAIZ, 'functions/lib/filmmaker/modelo.js'));
const iguales = (a, b) => M.canonico(a) === M.canonico(b);
const clon = (x) => JSON.parse(JSON.stringify(x));

const PID = 'abcdefghijklmnopqrstuvwx';
const base = () => clon({
  ...M.produccionVacia({ title: 'El día de una panadería', aspectRatio: '4:5', id: PID }),
  ...M.configuracionDePreset('ads'),
  intent: { freeText: 'El día de una panadería' },
  audio: { cues: [{ id: 'cue-horno', kind: 'sfx', description: 'el horno', target: { scope: 'shot', shotId: 'sh-0102' } }] },
  scenes: [
    { id: 'sc-0001', order: 0, title: 'Madrugada', timeOfDay: 'dawn', shots: [
      { id: 'sh-0101', order: 0, durationSec: 3, description: 'Se enciende la luz del obrador' },
      { id: 'sh-0102', order: 1, durationSec: 4, description: 'La masa entra al horno', dependsOn: ['sh-0101'] },
    ] },
    { id: 'sc-0002', order: 1, title: 'Mostrador', shots: [{ id: 'sh-0201', order: 0, durationSec: 5, description: 'Primer cliente' }] },
    { id: 'sc-0003', order: 2, title: 'Cierre', shots: [{ id: 'sh-0301', order: 0, durationSec: 3, description: 'Se apaga la luz' }] },
  ],
});
const guardada = (production, revision = 0, extra = {}) => ({ productionId: PID, revision, status: 'active', createdAt: 1, updatedAt: 1, production, ...extra });
const cargada = (p = base(), rev = 0) => R.reducirProduccion(R.ESTADO_INICIAL, { tipo: 'cargada', produccion: guardada(p, rev) });
let gid = 0;
const gesto = (e, ...operaciones) => R.reducirProduccion(e, { tipo: 'gesto', gesto: { id: `g${++gid}`, operaciones } });

/* ═══ A · CADA GESTO, EN LOCAL, COMO EN F1-A ═══════════════════════════════ */
console.log('\n── A · Cada gesto permitido, aplicado en local igual que en F1-A ──');
const GESTOS = [
  ['reordenar escenas', { op: 'reorder_scene', sceneId: 'sc-0003', toOrder: 0 }],
  ['reordenar planos', { op: 'reorder_shot', shotId: 'sh-0102', toOrder: 0 }],
  ['duplicar una escena', { op: 'duplicate_scene', sceneId: 'sc-0002', newSceneId: 'sc_copia' }],
  ['duplicar un plano', { op: 'duplicate_shot', shotId: 'sh-0201', newShotId: 'sh_copia' }],
  ['dividir una escena', { op: 'split_scene', sceneId: 'sc-0001', atShotOrder: 1, newSceneId: 'sc_parte' }],
  ['dividir un plano', { op: 'split_shot', shotId: 'sh-0201', atSec: 2.5, newShotId: 'sh_mitad' }],
  ['unir escenas', { op: 'merge_scenes', sceneId: 'sc-0002', withSceneId: 'sc-0003' }],
  ['unir planos', { op: 'merge_shots', shotId: 'sh-0101', withShotId: 'sh-0102' }],
  ['alargar', { op: 'extend_duration', target: { shotId: 'sh-0301' }, bySec: 1 }],
  ['acortar', { op: 'shorten_duration', target: { shotId: 'sh-0201' }, bySec: 1 }],
  ['la duración objetivo', { op: 'change_target_duration', targetSec: 20 }],
  ['la cámara', { op: 'change_camera', target: { scope: 'shot', shotId: 'sh-0101' }, shotType: 'close_up' }],
  ['el movimiento', { op: 'change_movement', target: { scope: 'scene', sceneId: 'sc-0002' }, movement: 'push_in' }],
  ['la luz', { op: 'change_lighting', target: { scope: 'production' }, lighting: 'golden_hour' }],
  ['el clima', { op: 'change_weather', sceneId: 'sc-0002', weather: 'rain' }],
  ['el momento del día', { op: 'change_time_of_day', sceneId: 'sc-0003', timeOfDay: 'night' }],
  ['el título y la descripción de una escena', { op: 'edit_text', target: { sceneId: 'sc-0002' }, title: 'El mostrador', description: 'Llega la gente' }],
  ['la descripción de un plano', { op: 'edit_text', target: { shotId: 'sh-0201' }, description: 'Entra el primer cliente' }],
  ['el formato', { op: 'change_format', preset: 'youtube_shorts' }],
  ['añadir una escena', { op: 'add_scene', scene: { id: 'sc_nueva', shots: [{ id: 'sh_nuevo', durationSec: 3 }] } }],
  ['añadir un plano', { op: 'add_shot', sceneId: 'sc-0003', shot: { id: 'sh_otro', durationSec: 3 } }],
  ['quitar un plano', { op: 'remove_shot', shotId: 'sh-0201' }],
  ['quitar una escena', { op: 'remove_scene', sceneId: 'sc-0003' }],
];
const malos = [];
for (const [nombre, op] of GESTOS) {
  const e = gesto(cargada(), op);
  const esperado = O.aplicarOperaciones(base(), [op]);
  if (!esperado.ok || !iguales(e.vista, esperado.production) || e.pendientes.length !== 1 || e.guardado !== 'pendiente' || e.rechazo) malos.push(nombre);
}
check(`A1) los ${GESTOS.length} gestos del storyboard se aplican en local exactamente como en F1-A`, malos.length === 0, malos.join(', '));
const dos = gesto(gesto(cargada(), GESTOS[0][1]), GESTOS[14][1]);
check('A2) los gestos se acumulan en orden, sin llamar a nadie', dos.pendientes.length === 2 && iguales(dos.vista, O.aplicarOperaciones(base(), [GESTOS[0][1], GESTOS[14][1]]).production));
const propuesta = gesto(cargada(), { op: 'change_target_duration', targetSec: 30 }, { op: 'merge_scenes', sceneId: 'sc-0002', withSceneId: 'sc-0003' });
check('A3) un gesto de varias operaciones —aceptar una propuesta— va entero, como uno', propuesta.pendientes.length === 1 && propuesta.pendientes[0].operaciones.length === 2
  && propuesta.vista.scenes.length === 2);
const pendiente = gesto(cargada(), { op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' });
check('A4) lo que puede haber que rehacer lo calcula F1-A, y se acumula', pendiente.porRehacer.shots.includes('sh-0101') && pendiente.porRehacer.shots.includes('sh-0102')
  && pendiente.porRehacer.scenes.includes('sc-0001'));
check('A5) la confirmada no se toca: lo optimista va aparte', iguales(pendiente.confirmada.production, base()));

/* ═══ B · LO QUE F1-A RECHAZA ══════════════════════════════════════════════ */
console.log('\n── B · Lo que F1-A rechaza no cambia nada, y dice por qué ──');
const antes = cargada();
const RECHAZOS = [
  [{ op: 'merge_scenes', sceneId: 'sc-0001', withSceneId: 'sc-0003' }, 'operation_not_applicable'],
  [{ op: 'edit_text', target: { shotId: 'sh-0101' }, title: 'Los planos no tienen título' }, 'operation_invalid'],
  [{ op: 'shorten_duration', target: { shotId: 'sh-0101' }, bySec: 5 }, 'operation_invalid'],
  [{ op: 'remove_shot', shotId: 'sh-0102' }, 'operation_blocked'],
  [{ op: 'reorder_scene', sceneId: 'sc-9999', toOrder: 0 }, 'operation_target_missing'],
  [{ op: 'inventada' }, 'operation_invalid'],
];
const malRechazados = [];
for (const [op, code] of RECHAZOS) {
  const e = gesto(antes, op);
  if (e.vista !== antes.vista || e.pendientes.length || !e.rechazo || e.rechazo[0].code !== code || !e.rechazo[0].messageKey.startsWith('filmmaker.')) malRechazados.push(`${op.op}→${e.rechazo?.[0]?.code}`);
}
check(`B1) ${RECHAZOS.length} gestos imposibles: la producción no se mueve y el rechazo trae el código y la clave de F1-A`, malRechazados.length === 0, malRechazados.join(', '));
const nada = gesto(antes, { op: 'change_time_of_day', sceneId: 'sc-0001', timeOfDay: 'dawn' });
check('B2) un gesto que no cambia nada no se manda', nada.pendientes.length === 0 && !nada.rechazo);
const archivada = R.reducirProduccion(R.ESTADO_INICIAL, { tipo: 'cargada', produccion: guardada(base(), 3, { status: 'archived', archivedAt: 9 }) });
const enArchivada = gesto(archivada, GESTOS[0][1]);
check('B3) una producción archivada no se edita: el gesto se rechaza con su clave', enArchivada.pendientes.length === 0 && enArchivada.rechazo?.[0].code === 'production_archived'
  && !R.esEditable(archivada));
check('B4) y sin producción cargada, un gesto no hace nada', R.reducirProduccion(R.ESTADO_INICIAL, { tipo: 'gesto', gesto: { id: 'x', operaciones: [GESTOS[0][1]] } }) === R.ESTADO_INICIAL);

/* ═══ C · AGRUPAR ══════════════════════════════════════════════════════════ */
console.log('\n── C · Agrupar: un lote congelado, con su revisión esperada ──');
const tres = gesto(gesto(gesto(cargada(base(), 7), GESTOS[0][1]), GESTOS[14][1]), GESTOS[15][1]);
const enviado = R.reducirProduccion(tres, { tipo: 'enviar', operationId: 'op_lote0001' });
check('C1) enviar forma UN lote con todo lo que esperaba, su id y la revisión confirmada como esperada',
  enviado.enVuelo?.operationId === 'op_lote0001' && enviado.enVuelo.expectedRevision === 7 && enviado.enVuelo.gestos.length === 3 && enviado.pendientes.length === 0
  && enviado.guardado === 'guardando');
check('C2) con un lote viajando no sale otro', R.reducirProduccion(enviado, { tipo: 'enviar', operationId: 'op_otro0001' }) === enviado);
const durante = gesto(enviado, GESTOS[16][1]);
check('C3) lo que se hace mientras viaja espera al siguiente, y se ve ya', durante.pendientes.length === 1 && durante.enVuelo === enviado.enVuelo
  && durante.vista.scenes.find((s) => s.id === 'sc-0002').title === 'El mostrador' && durante.guardado === 'guardando');
let muchos = cargada();
for (let i = 0; i < 60; i++) muchos = gesto(muchos, { op: 'change_weather', sceneId: 'sc-0001', weather: i % 2 ? 'rain' : 'fog' });
const conTope = R.reducirProduccion(muchos, { tipo: 'enviar', operationId: 'op_tope0001' });
check(`C4) un lote no pasa de ${R.OPERACIONES_POR_LOTE} operaciones, el tope del servidor; lo demás espera`,
  conTope.enVuelo.gestos.flatMap((g) => g.operaciones).length === R.OPERACIONES_POR_LOTE && conTope.pendientes.length === 10);
const juntos = R.siguienteLote([{ id: 'a', operaciones: new Array(49).fill(GESTOS[14][1]) }, { id: 'b', operaciones: [GESTOS[14][1], GESTOS[15][1]] }]);
check('C5) y un gesto de varias operaciones no se parte entre dos lotes', juntos.lote.length === 1 && juntos.resto.length === 1);

/* ═══ D · CONFIRMACIÓN, FALLO Y REVERSIÓN ══════════════════════════════════ */
console.log('\n── D · Confirmación, fallo y reversión ──');
const servidorAplica = (p, ops, rev) => { const r = O.aplicarOperaciones(p, ops); return { ...r.production, metadata: { ...r.production.metadata, revision: rev } }; };
const loteDe = (e, rev) => ({
  produccion: guardada(servidorAplica(base(), e.enVuelo.gestos.flatMap((g) => g.operaciones), rev), rev), applied: e.enVuelo.gestos.length,
  pending: { scenes: [], shots: ['sh-0201'], audio: [], removed: [] }, timelineChanged: true, operationId: e.enVuelo.operationId, alreadyApplied: false,
});
const confirmado = R.reducirProduccion(durante, { tipo: 'confirmado', lote: loteDe(enviado, 8) });
check('D1) confirmado: la revisión del servidor manda, y lo hecho mientras tanto sigue encima',
  confirmado.confirmada.revision === 8 && !confirmado.enVuelo && confirmado.pendientes.length === 1 && confirmado.guardado === 'pendiente'
  && confirmado.vista.scenes.find((s) => s.id === 'sc-0002').title === 'El mostrador');
check('D2) lo que el servidor dice que queda por rehacer se suma', confirmado.porRehacer.shots.includes('sh-0201'));
const todoGuardado = R.reducirProduccion(enviado, { tipo: 'confirmado', lote: loteDe(enviado, 8) });
check('D3) sin nada más esperando, queda guardado', todoGuardado.guardado === 'guardado' && !R.hayCambiosSinGuardar(todoGuardado));
const sinRed = R.reducirProduccion(enviado, { tipo: 'fallido', fallo: { tipo: 'sin_conexion', code: 'network', messageKey: 'filmmaker.persistence.network', problems: [], reintentable: true } });
check('D4) sin conexión: el lote se queda CONGELADO —mismo id, misma revisión— y nada se deshace',
  sinRed.enVuelo === enviado.enVuelo && sinRed.guardado === 'error' && sinRed.vista === enviado.vista && sinRed.fallo.tipo === 'sin_conexion');
const otraVez = R.reducirProduccion(sinRed, { tipo: 'reintentar' });
check('D5) reintentar vuelve a mandar el MISMO lote', otraVez.enVuelo.operationId === 'op_lote0001' && otraVez.guardado === 'guardando' && !otraVez.fallo);
const rechazoConIndice = R.reducirProduccion(durante, { tipo: 'fallido', fallo: {
  tipo: 'rechazada', code: 'operations_invalid', messageKey: 'filmmaker.persistence.operations_invalid', reintentable: false,
  problems: [{ code: 'operation_target_missing', severity: 'error', path: 'sceneId', parameters: { index: 1, id: 'sc-0002' }, messageKey: 'filmmaker.operation.operation_target_missing' }],
} });
check('D6) rechazado por el servidor con su índice: se aparta SOLO ese gesto; los demás vuelven a esperar',
  !rechazoConIndice.enVuelo && rechazoConIndice.descartados.length === 1 && rechazoConIndice.descartados[0].gesto === enviado.enVuelo.gestos[1]
  && rechazoConIndice.pendientes.length === 3 && rechazoConIndice.vista.scenes.find((s) => s.id === 'sc-0002').weather === undefined
  && rechazoConIndice.descartados[0].problems[0].code === 'operation_target_missing');
check('D7) la reversión reconstruye desde lo confirmado, no desde lo optimista',
  iguales(rechazoConIndice.vista, O.aplicarOperaciones(base(), [GESTOS[0][1], GESTOS[15][1], GESTOS[16][1]]).production));
const rechazoSinIndice = R.reducirProduccion(enviado, { tipo: 'fallido', fallo: { tipo: 'rechazada', code: 'transaction_too_large', messageKey: 'filmmaker.persistence.transaction_too_large', problems: [], reintentable: false } });
check('D8) sin índice, se aparta el lote entero, cada gesto con el porqué del servidor',
  rechazoSinIndice.descartados.length === 3 && rechazoSinIndice.descartados.every((d) => d.problems[0].code === 'transaction_too_large')
  && iguales(rechazoSinIndice.vista, base()) && rechazoSinIndice.guardado === 'guardado');
const vistos = R.reducirProduccion(rechazoSinIndice, { tipo: 'vistos' });
check('D9) y una vez vistos, los avisos se van', vistos.descartados.length === 0 && !vistos.conflicto && !vistos.rechazo);

/* ═══ E · EL CONFLICTO ═════════════════════════════════════════════════════ */
console.log('\n── E · El conflicto: se reconstruye sin pisar nada ──');
/* Otra persona, entre medias: quitó la escena del cierre y cambió el título de la primera. */
const suya = servidorAplica(base(), [{ op: 'remove_scene', sceneId: 'sc-0003' }, { op: 'edit_text', target: { sceneId: 'sc-0001' }, title: 'Las cinco de la mañana' }], 8);
const mios = gesto(gesto(gesto(cargada(base(), 7), { op: 'change_weather', sceneId: 'sc-0002', weather: 'rain' }),
  { op: 'change_time_of_day', sceneId: 'sc-0003', timeOfDay: 'night' }), { op: 'reorder_shot', shotId: 'sh-0102', toOrder: 0 });
const viajando = R.reducirProduccion(gesto(R.reducirProduccion(mios, { tipo: 'enviar', operationId: 'op_cas00001' }), { op: 'edit_text', target: { shotId: 'sh-0201' }, description: 'Dos clientes' }), { tipo: 'reintentar' });
const rehecha = R.reducirProduccion(viajando, { tipo: 'reconstruir', produccion: guardada(suya, 8) });
check('E1) la base es la versión de ahora: lo de la otra persona se queda', rehecha.confirmada.revision === 8
  && rehecha.vista.scenes[0].title === 'Las cinco de la mañana' && !rehecha.vista.scenes.some((s) => s.id === 'sc-0003'));
check('E2) y lo tuyo va encima, gesto a gesto: el clima, el orden y la descripción', rehecha.vista.scenes.find((s) => s.id === 'sc-0002').weather === 'rain'
  && rehecha.vista.scenes[0].shots[0].id === 'sh-0102' && rehecha.vista.scenes.find((s) => s.id === 'sc-0002').shots[0].description === 'Dos clientes');
check('E3) lo que ya no se puede aplicar —la escena que quitó— se aparta CON su problema, no en silencio',
  rehecha.descartados.length === 1 && rehecha.descartados[0].gesto.operaciones[0].op === 'change_time_of_day'
  && rehecha.descartados[0].problems[0].code === 'operation_target_missing' && rehecha.conflicto);
check('E4) lo que queda vuelve a esperar para mandarse sobre la revisión nueva', !rehecha.enVuelo && rehecha.pendientes.length === 3 && rehecha.guardado === 'pendiente');
const reenvio = R.reducirProduccion(rehecha, { tipo: 'enviar', operationId: 'op_cas00002' });
check('E5) y se manda con la revisión esperada al día', reenvio.enVuelo.expectedRevision === 8);
check('E6) lo que el servidor tenía no se pisa: su versión es la base de todo', iguales(rehecha.confirmada.production, suya));

/* ═══ F · EL CONTROLADOR CONTRA UN SERVIDOR EN MEMORIA ═════════════════════ */
console.log('\n── F · El controlador contra un servidor con el contrato de `productions` ──');
/** Un servidor con el contrato de la puerta: revisión por lote, CAS, id de lote, archivado. Con F1-A compilado. */
const servidor = (inicial) => {
  const s = { vista: guardada(inicial, 0), vistos: new Map(), llamadas: [], perderRespuesta: false, sinRed: false };
  const fallar = (tipo, code, extra = {}) => ({ ok: false, fallo: { tipo, code, messageKey: `filmmaker.persistence.${code}`, problems: [], reintentable: tipo === 'sin_conexion', ...extra } });
  s.api = {
    getProduction: async () => { s.llamadas.push('get'); return { ok: true, valor: clon(s.vista) }; },
    applyProductionOperations: async (l) => {
      s.llamadas.push(`apply:${l.operationId}@${l.expectedRevision}`);
      if (s.sinRed) return fallar('sin_conexion', 'network');
      const ya = s.vistos.get(l.operationId);
      if (ya) return { ok: true, valor: { produccion: clon(s.vista), applied: ya, pending: { scenes: [], shots: [], audio: [], removed: [] }, timelineChanged: false, operationId: l.operationId, alreadyApplied: true } };
      if (s.vista.status === 'archived') return fallar('archivada', 'production_archived');
      if (l.expectedRevision !== s.vista.revision) return fallar('conflicto', 'revision_conflict', { currentRevision: s.vista.revision });
      const r = O.aplicarOperaciones(s.vista.production, l.operations);
      if (!r.ok) return { ok: false, fallo: { tipo: 'rechazada', code: 'operations_invalid', messageKey: 'filmmaker.persistence.operations_invalid', problems: r.problems, reintentable: false } };
      const revision = s.vista.revision + 1;
      s.vista = guardada({ ...r.production, metadata: { ...r.production.metadata, revision } }, revision);
      s.vistos.set(l.operationId, r.applied);
      const valor = { produccion: clon(s.vista), applied: r.applied, pending: r.pending, timelineChanged: r.timelineChanged, operationId: l.operationId, alreadyApplied: false };
      if (s.perderRespuesta) { s.perderRespuesta = false; return fallar('sin_conexion', 'network'); }
      return { ok: true, valor };
    },
    archiveProduction: async () => { s.vista = { ...s.vista, status: 'archived', archivedAt: 5 }; return { ok: true, valor: { changed: true, resumen: { productionId: PID, title: 'x', status: 'archived', aspectRatio: '4:5', revision: s.vista.revision, createdAt: 1, updatedAt: 5, archivedAt: 5 } } }; },
    unarchiveProduction: async () => { const { archivedAt, ...resto } = s.vista; void archivedAt; s.vista = { ...resto, status: 'active' }; return { ok: true, valor: { changed: true, resumen: { productionId: PID, title: 'x', status: 'active', aspectRatio: '4:5', revision: s.vista.revision, createdAt: 1, updatedAt: 6 } } }; },
    /** Otra persona que cambia la producción por su cuenta. */
    otraPersona: (ops) => { const r = O.aplicarOperaciones(s.vista.production, ops); const revision = s.vista.revision + 1; s.vista = guardada({ ...r.production, metadata: { ...r.production.metadata, revision } }, revision); },
  };
  return s;
};
/** Un reloj que solo avanza cuando la prueba lo dice: nada de esperas de verdad. */
const reloj = () => {
  const cola = [];
  return { programar: (fn, ms) => { const t = { fn, ms, vivo: true }; cola.push(t); return () => { t.vivo = false; }; }, pasar: () => { const vivos = cola.splice(0).filter((t) => t.vivo); vivos.forEach((t) => t.fn()); return vivos.length; }, esperando: () => cola.filter((t) => t.vivo).length };
};
const esperar = () => new Promise((r) => setTimeout(r, 0));
const calma = async () => { for (let i = 0; i < 20; i++) await esperar(); };
let ops = 0;
const nuevoControlador = (srv, r) => K.crearControladorDeProduccion(PID, { servicio: srv.api, programar: r.programar, nuevoIdDeOperacion: () => `op_lote${String(++ops).padStart(4, '0')}` });

{
  const srv = servidor(base());
  const r = reloj();
  const c = nuevoControlador(srv, r);
  await c.cargar();
  check('F1) abrir la producción: una lectura, y lista', c.leer().carga === 'lista' && c.leer().estado.confirmada.revision === 0 && srv.llamadas.join() === 'get');
  c.gesto([{ op: 'change_weather', sceneId: 'sc-0002', weather: 'rain' }]);
  c.gesto([{ op: 'reorder_scene', sceneId: 'sc-0003', toOrder: 0 }]);
  c.gesto([{ op: 'extend_duration', target: { shotId: 'sh-0301' }, bySec: 1 }]);
  check('F2) tres gestos seguidos no llaman al servidor: se ven ya, y esperan a que la persona pare',
    srv.llamadas.length === 1 && c.leer().estado.pendientes.length === 3 && c.leer().estado.vista.scenes[0].id === 'sc-0003' && r.esperando() === 1);
  r.pasar(); await calma();
  check('F3) cuando para, sale UN lote con los tres, y queda guardado en la revisión 1',
    srv.llamadas.length === 2 && srv.llamadas[1] === 'apply:op_lote0001@0' && c.leer().estado.guardado === 'guardado' && srv.vista.revision === 1
    && iguales(c.leer().estado.vista, srv.vista.production));
  const r2 = c.gesto([{ op: 'merge_scenes', sceneId: 'sc-0003', withSceneId: 'sc-0002' }]);
  check('F4) un gesto imposible se contesta al momento con el problema de F1-A, sin llamar a nadie',
    !r2.ok && r2.problems[0].code === 'operation_not_applicable' && srv.llamadas.length === 2 && r.esperando() === 0);

  /* La respuesta se pierde después de aplicarse: el reintento no lo aplica dos veces. */
  srv.perderRespuesta = true;
  c.gesto([{ op: 'edit_text', target: { sceneId: 'sc-0002' }, title: 'El mostrador' }]);
  r.pasar(); await calma();
  check('F5) la respuesta se perdió: el cliente no sabe si llegó y lo dice, sin deshacer nada', c.leer().estado.guardado === 'error'
    && c.leer().estado.fallo.tipo === 'sin_conexion' && c.leer().estado.vista.scenes.find((s) => s.id === 'sc-0002').title === 'El mostrador');
  c.reintentar(); await calma();
  check('F6) reintentar manda EL MISMO lote; el servidor lo reconoce y NO lo aplica dos veces',
    srv.llamadas.filter((x) => x.startsWith('apply:op_lote0002')).length === 2 && srv.vista.revision === 2 && c.leer().estado.guardado === 'guardado'
    && c.leer().estado.confirmada.revision === 2);

  /* CAS: otra persona cambia la producción; lo nuestro se reconstruye encima. */
  srv.api.otraPersona([{ op: 'edit_text', target: { sceneId: 'sc-0001' }, title: 'Las cinco de la mañana' }, { op: 'remove_scene', sceneId: 'sc-0003' }]);
  c.gesto([{ op: 'change_time_of_day', sceneId: 'sc-0003', timeOfDay: 'night' }]);
  c.gesto([{ op: 'change_weather', sceneId: 'sc-0001', weather: 'fog' }]);
  r.pasar(); await calma();
  const tras = c.leer().estado;
  check('F7) conflicto: `aborted`, se trae la versión de ahora, se reconstruye y se vuelve a mandar con la revisión nueva',
    srv.llamadas.includes('apply:op_lote0003@2') && srv.llamadas.includes('apply:op_lote0004@3') && srv.vista.revision === 4 && tras.guardado === 'guardado');
  check('F8) no se pisó nada: lo de la otra persona sigue, y lo nuestro que cabía también',
    srv.vista.production.scenes[0].title === 'Las cinco de la mañana' && !srv.vista.production.scenes.some((s) => s.id === 'sc-0003')
    && srv.vista.production.scenes[0].weather === 'fog' && iguales(tras.vista, srv.vista.production));
  check('F9) y lo que ya no cabía —la escena que quitaron— se apartó y se dice, con su código',
    tras.conflicto && tras.descartados.length === 1 && tras.descartados[0].problems[0].code === 'operation_target_missing');

  /* Archivar con cambios sin guardar no se hace; archivada, no se edita; desarchivada, sigue. */
  c.gesto([{ op: 'change_weather', sceneId: 'sc-0002', weather: 'clear' }]);
  const a1 = await c.archivar(true);
  check('F10) con cambios sin guardar no se archiva: primero se guardan', !a1.ok && a1.motivo === 'cambios_sin_guardar');
  c.guardarAhora(); await calma();
  const a2 = await c.archivar(true);
  const g = c.gesto([{ op: 'change_weather', sceneId: 'sc-0002', weather: 'rain' }]);
  check('F11) archivada: el estado lo dice y un gesto se rechaza', a2.ok && c.leer().estado.confirmada.status === 'archived' && !g.ok && g.problems[0].code === 'production_archived');
  await c.archivar(false);
  c.gesto([{ op: 'change_weather', sceneId: 'sc-0002', weather: 'rain' }]);
  c.cerrar(); await calma();
  check('F12) al salir de la pantalla, lo que quedaba por mandar se manda sin esperar', srv.vista.production.scenes.find((s) => s.id === 'sc-0002').weather === 'rain'
    && c.leer().estado.guardado === 'guardado' && r.esperando() === 0);
}
{
  /*
   * Dos pantallas que se persiguen: tras TRES conflictos seguidos se para y se pregunta, sin bucle infinito. El número
   * se fija aquí como un total exacto y no se lee de la constante: si se leyera, subirla a 30 seguiría en verde con
   * treinta y una idas y vueltas. Cambiarlo es una decisión, y se hace cambiando también esta comprobación.
   */
  const srv = servidor(base());
  const r = reloj();
  const c = nuevoControlador(srv, r);
  await c.cargar();
  const conflictivo = srv.api.applyProductionOperations;
  srv.api.applyProductionOperations = async (l) => { srv.api.otraPersona([{ op: 'change_target_duration', targetSec: 10 + srv.vista.revision }]); return conflictivo(l); };
  c.gesto([{ op: 'change_weather', sceneId: 'sc-0002', weather: 'rain' }]);
  r.pasar(); await calma();
  const aplicaciones = srv.llamadas.filter((x) => x.startsWith('apply')).length;
  check('F13) tras tres conflictos seguidos se para —cuatro envíos en total—: error visible, nada perdido y sin bucle',
    K.CONFLICTOS_SEGUIDOS === 3 && aplicaciones === 4 && c.leer().estado.guardado === 'error' && c.leer().estado.fallo.tipo === 'conflicto'
    && c.leer().estado.enVuelo && c.leer().estado.vista.scenes.find((s) => s.id === 'sc-0002').weather === 'rain',
    `${aplicaciones} envíos · límite ${K.CONFLICTOS_SEGUIDOS}`);

  /* La otra pantalla se calla y la persona pulsa «Reintentar»: la cuenta vuelve a empezar y lo suyo se guarda. */
  srv.api.applyProductionOperations = conflictivo;
  c.reintentar(); await calma();
  const despues = srv.llamadas.filter((x) => x.startsWith('apply')).length;
  check('F13b) reintentar después de parar vuelve a empezar la cuenta: se reconstruye sobre lo de ahora y queda guardado',
    despues > aplicaciones && c.leer().estado.guardado === 'guardado' && !c.leer().estado.fallo
    && srv.vista.production.scenes.find((s) => s.id === 'sc-0002').weather === 'rain' && iguales(c.leer().estado.vista, srv.vista.production),
    `${despues - aplicaciones} envíos más · ${c.leer().estado.guardado}`);
}
{
  const srv = servidor(base());
  srv.api.getProduction = async () => ({ ok: false, fallo: { tipo: 'no_encontrada', code: 'production_not_found', messageKey: 'filmmaker.persistence.production_not_found', problems: [], reintentable: false } });
  const c = nuevoControlador(srv, reloj());
  await c.cargar();
  check('F14) una producción que no se puede abrir es un estado de error con su clave, no una pantalla vacía',
    c.leer().carga === 'error' && c.leer().falloDeCarga.messageKey === 'filmmaker.persistence.production_not_found' && !c.leer().estado.vista);
}

/* ═══ G · LO QUE ESTO NO HACE ══════════════════════════════════════════════ */
console.log('\n── G · Ni una regla propia, ni una operación nueva ──');
const fuentes = ['utils/produccionOptimista.ts', 'utils/controladorDeProduccion.ts'].map((f) => leer(f));
check('G1) el reductor valida y aplica con F1-A (el espejo), no con una copia', /import \{ aplicarOperaciones \} from '\.\.\/services\/filmmaker\/dominio';/.test(fuentes[0])
  && !/case 'reorder_scene'|case 'split_shot'|splice\(/.test(fuentes.join('\n')));
check('G2) no inventa operaciones: solo manda las que F1-A conoce', !/op: '(?!change_|reorder_|duplicate_|split_|merge_|extend_|shorten_|edit_text|add_|remove_)/.test(fuentes.join('\n')));
check('G3) sin temporizadores de mentira: la única espera es la de agrupar gestos, y se inyecta',
  !/setInterval|progress|progreso|%/.test(fuentes[1].replace(/\/\*[\s\S]*?\*\//g, '')) && /programar \?\? programarConReloj/.test(fuentes[1]));
check('G4) ni Firebase ni la callable: el controlador recibe el servicio', !/firebase|httpsCallable/.test(fuentes.join('\n')));
check('G5) esta suite está en la cadena de `npm test`', /filmmaker-reductor\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : `\n✔ Filmmaker F1-C: el estado optimista y el CAS, sin pisar nada (${n} comprobaciones)`);
process.exit(failures ? 1 : 0);
