/**
 * F1-C · EL SERVICIO DE CLIENTE CONTRA LA CALLABLE DE VERDAD, EN EL EMULADOR.
 *
 * `filmmaker-servicio.test.mjs` prueba el servicio con un doble de Firebase. Esto
 * prueba lo otro: el MISMO `services/filmmakerService.ts`, con el SDK de cliente
 * de Firebase de verdad (`httpsCallable`), hablando con la callable `productions`
 * servida por el runtime del emulador —el mismo `functions/lib` que se
 * desplegaría—, con una sesión del emulador de Auth. Y el controlador de la
 * pantalla (`utils/controladorDeProduccion.ts`) contra esa misma callable, con
 * dos personas escribiendo a la vez: el CAS de punta a punta.
 *
 * NO está en `npm test` a propósito: necesita los emuladores de Auth, Functions y
 * Firestore (Java 21). Desde la raíz del proyecto:
 *
 *   firebase emulators:exec --only auth,functions,firestore --project demo-wee-filmmaker \
 *     "node functions/test/filmmaker-servicio.emulator.mjs"
 *
 * Se NIEGA a correr sin emuladores y contra un proyecto que no sea de
 * demostración. No despliega nada y no toca ningún servicio real.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearCargador, RAIZ } from './filmmaker-cliente.mjs';

const PROY = process.env.GCLOUD_PROJECT || 'demo-wee-filmmaker';
const hub = process.env.FIREBASE_EMULATOR_HUB;
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !hub) {
  console.log('✘ sin emuladores no se corre: faltan FIRESTORE_EMULATOR_HOST, FIREBASE_AUTH_EMULATOR_HOST o FIREBASE_EMULATOR_HUB'); process.exit(1);
}
if (PROY === 'get-wee' || !PROY.startsWith('demo-')) { console.log(`✘ solo contra un proyecto de demostración, nunca contra «${PROY}»`); process.exit(1); }

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const requerir = createRequire(path.resolve(RAIZ, 'package.json'));
const { initializeApp, deleteApp } = requerir('firebase/app');
const { initializeAuth, inMemoryPersistence, connectAuthEmulator, signInAnonymously, signOut } = requerir('firebase/auth');
const firebaseFunctions = requerir('firebase/functions');

const emuladores = await (await fetch(`http://${hub}/emulators`)).json();
const donde = (e) => ({ host: e.host === '0.0.0.0' || e.host === '::' ? '127.0.0.1' : e.host, port: e.port });
check('el hub dice que Auth, Functions y Firestore están en marcha', !!emuladores.auth && !!emuladores.functions && !!emuladores.firestore, Object.keys(emuladores).join(', '));

/** Una persona: su app de Firebase, su sesión anónima del emulador y su servicio de verdad. */
const persona = async (nombre) => {
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: PROY, appId: `demo-${nombre}` }, nombre);
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  const a = donde(emuladores.auth);
  connectAuthEmulator(auth, `http://${a.host}:${a.port}`, { disableWarnings: true });
  const { user } = await signInAnonymously(auth);
  const functions = firebaseFunctions.getFunctions(app, 'us-central1');
  const f = donde(emuladores.functions);
  firebaseFunctions.connectFunctionsEmulator(functions, f.host, f.port);
  const cargar = crearCargador({ dobles: { 'firebase/functions': firebaseFunctions, '../config/firebase': { functions } } });
  const S = cargar('services/filmmakerService.ts');
  return { app, auth, uid: user.uid, S, svc: S.filmmakerService, cargar };
};

const ana = await persona('ana');
const bea = await persona('bea');
check('dos sesiones del emulador de Auth, dos cuentas', !!ana.uid && !!bea.uid && ana.uid !== bea.uid);
const { svc, S } = ana;

console.log('\n── A · Las siete operaciones, por el servicio de la app ──');
const creada = await svc.createProduction({ title: 'El día de una panadería', preset: 'ads' });
check('A1) crear con el preset de anuncios: la producción nace en su revisión 0, en 4:5 y sin convertir',
  creada.ok && creada.valor.created && creada.valor.produccion.revision === 0 && creada.valor.produccion.production.format.aspectRatio === '4:5'
  && creada.valor.produccion.production.format.preset === 'ads', creada.ok ? '' : JSON.stringify(creada.fallo));
const pid = creada.ok ? creada.valor.produccion.productionId : '';
const otraVez = await svc.createProduction({ productionId: pid, title: 'El día de una panadería', preset: 'ads' });
check('A2) crear otra vez con el mismo id y lo mismo dentro devuelve la que había', otraVez.ok && otraVez.valor.created === false);
const leida = await svc.getProduction(pid);
check('A3) abrirla: la misma, sin nada de Firebase dentro', leida.ok && leida.valor.productionId === pid && !JSON.stringify(leida.valor).includes('_seconds')
  && !('ownerAccountId' in leida.valor));
const lista = await svc.listProductions({ status: 'active' });
check('A4) listarlas: aparece, como resumen', lista.ok && lista.valor.producciones.some((p) => p.productionId === pid && p.aspectRatio === '4:5'));
const op1 = S.nuevoIdDeOperacion();
const lote = await svc.applyProductionOperations({ productionId: pid, expectedRevision: 0, operationId: op1,
  operations: [{ op: 'add_scene', scene: { id: 'sc_0001', title: 'Madrugada', shots: [{ id: 'sh_0101', durationSec: 3, description: 'Se enciende la luz' }] } }] });
check('A5) aplicar un lote: sube UNA revisión y dice qué queda por rehacer', lote.ok && lote.valor.produccion.revision === 1 && lote.valor.applied === 1 && lote.valor.pending.shots.includes('sh_0101'));
const repetido = await svc.applyProductionOperations({ productionId: pid, expectedRevision: 0, operationId: op1,
  operations: [{ op: 'add_scene', scene: { id: 'sc_0001', title: 'Madrugada', shots: [{ id: 'sh_0101', durationSec: 3, description: 'Se enciende la luz' }] } }] });
check('A6) repetir el MISMO lote —como tras una red caída— no lo aplica dos veces', repetido.ok && repetido.valor.alreadyApplied && repetido.valor.produccion.revision === 1);
const archivada = await svc.archiveProduction(pid);
const enArchivada = await svc.applyProductionOperations({ productionId: pid, expectedRevision: 1, operationId: S.nuevoIdDeOperacion(), operations: [{ op: 'change_weather', sceneId: 'sc_0001', weather: 'rain' }] });
check('A7) archivar; y archivada no se cambia: `archivada`', archivada.ok && archivada.valor.resumen.status === 'archived' && !enArchivada.ok && enArchivada.fallo.tipo === 'archivada');
const desarchivada = await svc.unarchiveProduction(pid);
check('A8) desarchivar', desarchivada.ok && desarchivada.valor.resumen.status === 'active');
const copia = await svc.duplicateProduction({ productionId: pid, title: 'El día de una panadería (copia)' });
check('A9) duplicar: otra producción de la misma cuenta, en su revisión 0, con lo de la original', copia.ok && copia.valor.created && copia.valor.produccion.productionId !== pid
  && copia.valor.produccion.revision === 0 && copia.valor.produccion.production.scenes.length === 1 && copia.valor.source.productionId === pid);

console.log('\n── B · Los fallos, como los da la callable de verdad ──');
const tarde = await svc.applyProductionOperations({ productionId: pid, expectedRevision: 0, operationId: S.nuevoIdDeOperacion(), operations: [{ op: 'change_weather', sceneId: 'sc_0001', weather: 'rain' }] });
check('B1) una revisión vieja: `conflicto`, con la revisión que hay y su clave', !tarde.ok && tarde.fallo.tipo === 'conflicto' && tarde.fallo.currentRevision === 1
  && tarde.fallo.messageKey === 'filmmaker.persistence.revision_conflict');
const mala = await svc.applyProductionOperations({ productionId: pid, expectedRevision: 1, operationId: S.nuevoIdDeOperacion(), operations: [{ op: 'merge_scenes', sceneId: 'sc_0001', withSceneId: 'sc_9999' }] });
check('B2) una operación que F1-A rechaza: `rechazada`, con los problemas del dominio y su índice', !mala.ok && mala.fallo.tipo === 'rechazada' && mala.fallo.code === 'operations_invalid'
  && mala.fallo.problems.some((p) => p.code === 'operation_target_missing' && p.parameters.index === 0 && p.messageKey === 'filmmaker.operation.operation_target_missing'));
const ajena = await bea.svc.getProduction(pid);
check('B3) otra cuenta no la ve: `no_encontrada`, igual que si no existiera', !ajena.ok && ajena.fallo.tipo === 'no_encontrada');
const inexistente = await svc.getProduction('zzzzzzzzzzzzzzzzzzzzzzzz');
check('B4) una que no existe: `no_encontrada`', !inexistente.ok && inexistente.fallo.tipo === 'no_encontrada');

console.log('\n── C · El controlador de la pantalla, contra la callable, con dos personas a la vez ──');
const K1 = ana.cargar('utils/controladorDeProduccion.ts');
const inmediato = (fn) => { const t = setTimeout(fn, 0); return () => clearTimeout(t); };
const pantalla1 = K1.crearControladorDeProduccion(pid, { servicio: svc, nuevoIdDeOperacion: S.nuevoIdDeOperacion, programar: inmediato });
const pantalla2 = K1.crearControladorDeProduccion(pid, { servicio: svc, nuevoIdDeOperacion: S.nuevoIdDeOperacion, programar: inmediato });
await pantalla1.cargar(); await pantalla2.cargar();
const esperar = async () => { for (let i = 0; i < 200; i++) { await new Promise((r) => setTimeout(r, 25)); if (!pantalla1.leer().estado.enVuelo && !pantalla2.leer().estado.enVuelo && !pantalla1.leer().estado.pendientes.length && !pantalla2.leer().estado.pendientes.length) return; } };
pantalla1.gesto([{ op: 'edit_text', target: { sceneId: 'sc_0001' }, title: 'Las cinco de la mañana' }]);
pantalla2.gesto([{ op: 'add_shot', sceneId: 'sc_0001', shot: { id: 'sh_0102', durationSec: 4, description: 'La masa entra al horno' } }]);
await esperar();
const final = await svc.getProduction(pid);
check('C1) dos pantallas escribiendo a la vez: una pasa, la otra choca, se reconstruye y pasa encima',
  final.ok && final.valor.revision === 3 && final.valor.production.scenes[0].title === 'Las cinco de la mañana' && final.valor.production.scenes[0].shots.length === 2,
  final.ok ? `rev ${final.valor.revision}` : '');
/*
 * La que guardó primero no se entera de lo que vino después —F1-C no escucha cambios en vivo; lo verá al volver a
 * abrirla—; la que chocó se reconstruyó sobre la versión de ahora y ve EXACTAMENTE lo que tiene el servidor.
 */
const { canonico } = ana.cargar('services/filmmaker/dominio.ts');
const [primera, segunda] = [pantalla1, pantalla2].sort((a, b) => a.leer().estado.confirmada.revision - b.leer().estado.confirmada.revision);
check('C2) no se pisó nada: la que chocó se reconstruyó y ve exactamente lo del servidor; las dos, guardadas',
  final.ok && segunda.leer().estado.confirmada.revision === 3 && canonico(segunda.leer().estado.vista) === canonico(final.valor.production)
  && segunda.leer().estado.conflicto && primera.leer().estado.confirmada.revision === 2
  && primera.leer().estado.guardado === 'guardado' && segunda.leer().estado.guardado === 'guardado');
await pantalla1.cargar();
pantalla1.gesto([{ op: 'remove_shot', shotId: 'sh_0102' }]);
pantalla2.gesto([{ op: 'change_subject', target: { shotId: 'sh_0102' }, subject: { focus: 'hands' } }]);
await esperar();
const tras = pantalla2.leer().estado;
check('C3) lo que ya no cabe tras el conflicto —un plano que la otra pantalla quitó— se aparta CON su problema, y no se pierde en silencio',
  (tras.descartados.length === 1 && tras.descartados[0].problems[0].code === 'operation_target_missing') || (pantalla1.leer().estado.descartados.length === 1),
  `descartados: ${tras.descartados.length} / ${pantalla1.leer().estado.descartados.length}`);

console.log('\n── D · Sin sesión ──');
await signOut(ana.auth);
const sinSesion = await svc.listProductions();
check('D1) sin sesión: `sin_sesion`', !sinSesion.ok && sinSesion.fallo.tipo === 'sin_sesion', sinSesion.ok ? '' : sinSesion.fallo.code);

await deleteApp(ana.app); await deleteApp(bea.app);
console.log(failures ? `\n✘ ${failures} fallos` : `\n✔ el servicio de la app y su CAS, contra la callable del emulador: ${n} comprobaciones`);
process.exit(failures ? 1 : 0);
