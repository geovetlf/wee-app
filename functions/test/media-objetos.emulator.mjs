/**
 * MC-1 · LAS FICHAS DE OBJETOS, CONTRA EL EMULADOR.
 *
 * `media-core.test.mjs` prueba con un almacén en memoria que registrar dos
 * veces deja una ficha. Esto prueba que el de VERDAD lo cumple, y solo se puede
 * probar aquí: que `create` falle cuando el documento ya existe es una
 * propiedad de la base de datos, no del código que la llama.
 *
 *   A · Registrar es idempotente por la identidad derivada.
 *   B · Concurrencia real: N a la vez dejan UNA ficha.
 *   C · Aislamiento por cuenta, con Firestore de verdad.
 *   D · Borrar deja rastro y no borra la ficha.
 *   E · Lo que no puede escribirse nunca.
 *
 * No está en `npm test` a propósito: necesita el emulador y Java 21.
 *
 *   firebase emulators:exec --only firestore --project demo-wee \
 *     "node functions/test/media-objetos.emulator.mjs"
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { proyectoDeEmulador } from './_emulador.mjs';

if (!process.env.FIRESTORE_EMULATOR_HOST) { console.error('sin FIRESTORE_EMULATOR_HOST: no se ejecuta'); process.exit(2); }

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const admin = require('firebase-admin');
admin.initializeApp({ projectId: proyectoDeEmulador() });
const db = admin.firestore();
const lib = (p) => require(path.resolve(here, '../lib', p));

const core = lib('core/index.js');
const { claveDelObjeto, referenciaDelObjeto, PIEZA_ORIGINAL } = core;
const { almacenDeObjetosDeMedios, COLECCION_DE_OBJETOS } = lib('media/almacen.js');
const { crearAlmacenFalso, FAKE_PROVIDER_ID } = lib('media/falso.js');
const { guardarMaterial } = lib('media/index.js');
const { huellaDeMedios } = lib('media/huella.js');
const { crearRegistroDeMedios } = core;
const { DESCRIPTOR_FALSO } = lib('media/falso.js');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => { n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

const ANA = 'cuentaDeAna';
const BEA = 'cuentaDeBea';
const T0 = 1_700_000_000_000;
const objetos = almacenDeObjetosDeMedios(db);
const vaciar = async () => { const s = await db.collection(COLECCION_DE_OBJETOS).get(); await Promise.all(s.docs.map((d) => d.ref.delete())); };

const ficha = (o = {}) => {
  const accountId = o.accountId ?? ANA;
  const assetId = o.assetId ?? 'asset_uno';
  const objectKey = o.objectKey ?? claveDelObjeto(accountId, assetId, PIEZA_ORIGINAL);
  const ref = { provider: FAKE_PROVIDER_ID, objectKey };
  return {
    objectRef: referenciaDelObjeto(huellaDeMedios, ref),
    providerId: FAKE_PROVIDER_ID,
    accountId, assetId, pieza: PIEZA_ORIGINAL, objectKey,
    estado: 'guardado', bytes: 100, contentType: 'video/mp4',
    createdAt: T0, updatedAt: T0,
    ...(o.extra ?? {}),
  };
};

/* ═══ A · IDEMPOTENCIA ════════════════════════════════════════════════════ */
console.log('\n── A · Registrar dos veces deja UNA ficha ──');
await vaciar();
{
  const f = ficha();
  const a = await objetos.registrar(f);
  check('la primera la crea', a.ok && a.yaEstaba === false);
  const b = await objetos.registrar(f);
  check('la segunda se encuentra la que estaba', b.ok && b.yaEstaba === true);
  const c = await objetos.registrar({ ...f, bytes: 999, updatedAt: T0 + 5000 });
  check('y ni siquiera con datos distintos la pisa: devuelve la original', c.ok && c.objeto.bytes === 100);
  check('queda UN documento', (await db.collection(COLECCION_DE_OBJETOS).get()).size === 1);
  check('nombrado con la identidad derivada de dónde está', (await db.collection(COLECCION_DE_OBJETOS).doc(f.objectRef).get()).exists);
}

/* ═══ B · CONCURRENCIA REAL ═══════════════════════════════════════════════ */
console.log('\n── B · Cinco a la vez, con el `create` de Firestore ──');
await vaciar();
{
  const f = ficha({ assetId: 'asset_carrera' });
  const juntas = await Promise.all(Array.from({ length: 5 }, () => objetos.registrar(f)));
  const creadas = juntas.filter((r) => r.ok && r.yaEstaba === false).length;
  check('exactamente UNA dice haberla creado', creadas === 1, `${creadas}`);
  check('las otras cuatro se encuentran la suya', juntas.filter((r) => r.ok && r.yaEstaba === true).length === 4);
  check('y hay UN documento', (await db.collection(COLECCION_DE_OBJETOS).get()).size === 1);
  check('sin cerrojos ni memoria de proceso: la garantía es de la base de datos',
    juntas.every((r) => r.ok) && new Set(juntas.map((r) => r.objeto.objectRef)).size === 1);
}

/* ═══ C · AISLAMIENTO POR CUENTA ══════════════════════════════════════════ */
console.log('\n── C · De quién es cada ficha ──');
await vaciar();
{
  const deAna = ficha({ accountId: ANA, assetId: 'asset_de_ana' });
  await objetos.registrar(deAna);
  check('Ana lee la suya', (await objetos.leer(deAna.objectRef, ANA))?.assetId === 'asset_de_ana');
  check('Bea NO la lee: de una ficha ajena no se dice ni que exista', (await objetos.leer(deAna.objectRef, BEA)) === undefined);
  check('ni con una cuenta vacía o rara', (await objetos.leer(deAna.objectRef, '')) === undefined && (await objetos.leer(deAna.objectRef, '../x')) === undefined);
  check('un `objectRef` inventado no devuelve nada', (await objetos.leer('mob_' + '0'.repeat(32), ANA)) === undefined);

  /* Dos cuentas, el mismo nombre de material: fichas distintas, porque la clave lleva la cuenta. */
  const mismoNombre = ficha({ accountId: BEA, assetId: 'asset_de_ana' });
  await objetos.registrar(mismoNombre);
  check('el MISMO nombre de material en dos cuentas son dos objetos distintos', mismoNombre.objectRef !== deAna.objectRef);
  check('y cada una solo ve el suyo',
    (await objetos.leer(mismoNombre.objectRef, BEA))?.accountId === BEA && (await objetos.leer(mismoNombre.objectRef, ANA)) === undefined);
}

/* ═══ D · BORRAR ══════════════════════════════════════════════════════════ */
console.log('\n── D · Borrar deja rastro ──');
await vaciar();
{
  const f = ficha({ assetId: 'asset_a_borrar' });
  await objetos.registrar(f);
  check('Bea no puede marcar borrada la de Ana', (await objetos.marcarBorrado(f.objectRef, BEA, T0 + 1000)) === false);
  check('Ana sí', (await objetos.marcarBorrado(f.objectRef, ANA, T0 + 1000)) === true);
  const despues = await objetos.leer(f.objectRef, ANA);
  check('la ficha NO se borra: queda con su estado y su fecha', despues?.estado === 'borrado' && despues.deletedAt === T0 + 1000);
  check('el rastro se conserva: sigue sabiéndose dónde estuvo', despues?.objectKey === f.objectKey);
}

/* ═══ E · LO QUE NO SE ESCRIBE NUNCA ══════════════════════════════════════ */
console.log('\n── E · Lo que no puede llegar a Firestore ──');
await vaciar();
{
  const mentirosa = { ...ficha({ accountId: ANA }), objectKey: claveDelObjeto(BEA, 'asset_uno') };
  const r = await objetos.registrar(mentirosa);
  check('una ficha que dice ser de Ana y apunta a la carpeta de Bea: RECHAZADA', !r.ok && r.motivo === 'invalido');
  check('y no se escribió nada', (await db.collection(COLECCION_DE_OBJETOS).get()).size === 0);

  const falsaIdentidad = { ...ficha(), objectRef: 'mob_' + 'f'.repeat(32) };
  check('una identidad que no corresponde a dónde dice estar: RECHAZADA', !(await objetos.registrar(falsaIdentidad)).ok);
  check('una cuenta con forma de ruta: RECHAZADA', !(await objetos.registrar({ ...ficha(), accountId: '../otra' })).ok);
  check('sigue sin escribirse nada', (await db.collection(COLECCION_DE_OBJETOS).get()).size === 0);

  /* Y una ficha ajena ya existente no se devuelve al registrarla encima. */
  const deAna = ficha({ accountId: ANA, assetId: 'asset_disputado' });
  await objetos.registrar(deAna);
  const intruso = { ...deAna, accountId: BEA };
  const choque = await objetos.registrar(intruso);
  check('registrar encima de la ficha de otra cuenta NO la devuelve', !choque.ok, JSON.stringify(choque));
}

/* ═══ F · LA OPERACIÓN ENTERA ═════════════════════════════════════════════ */
console.log('\n── F · Guardar un material de punta a punta ──');
await vaciar();
{
  const almacen = crearAlmacenFalso({ ahora: () => T0 });
  const deps = {
    db,
    registro: crearRegistroDeMedios([DESCRIPTOR_FALSO]).registro,
    adaptadores: { [FAKE_PROVIDER_ID]: almacen },
    proveedor: FAKE_PROVIDER_ID,
    ahora: () => T0,
  };
  const peticion = { accountId: ANA, assetId: 'asset_entero', cuerpo: Buffer.from('los bytes'), contentType: 'video/mp4' };

  const r = await guardarMaterial(deps, peticion);
  check('quedan guardados los bytes y registrada la ficha', r.ok && r.objeto.accountId === ANA && r.yaEstaba === false);
  check('la clave la derivó Weë, aislada por cuenta', r.ok && r.ref.objectKey === claveDelObjeto(ANA, 'asset_entero'));
  check('la ficha apunta al material de la Fase 11, no lo sustituye', r.ok && r.objeto.assetId === 'asset_entero');
  check('y la referencia sirve tal cual para la Fase 11', r.ok && core.esStorageRef(r.ref));

  /* Repetir la MISMA operación. */
  const otra = await guardarMaterial(deps, peticion);
  check('repetir deja UN objeto y UNA ficha', otra.ok && otra.yaEstaba === true
    && almacen.contenido.size === 1 && (await db.collection(COLECCION_DE_OBJETOS).get()).size === 1);
  check('y no se volvió a escribir en el almacén: se pidió «solo si está libre»', almacen.llamadas.guardar === 2);

  /* Y tres a la vez. */
  await vaciar();
  const almacen2 = crearAlmacenFalso({ ahora: () => T0 });
  const deps2 = { ...deps, adaptadores: { [FAKE_PROVIDER_ID]: almacen2 } };
  const p2 = { ...peticion, assetId: 'asset_simultaneo' };
  const tres = await Promise.all([guardarMaterial(deps2, p2), guardarMaterial(deps2, p2), guardarMaterial(deps2, p2)]);
  check('tres simultáneas: un objeto, una ficha', almacen2.contenido.size === 1 && (await db.collection(COLECCION_DE_OBJETOS).get()).size === 1);
  check('todas contestan bien', tres.every((x) => x.ok));

  /* Sin proveedor no se inventa nada. */
  const sinProveedor = await guardarMaterial({ ...deps, proveedor: 'qiniu' }, peticion);
  check('con un proveedor que no está declarado, no se guarda nada y se dice', !sinProveedor.ok && sinProveedor.error.details.reason === 'no_configurado');

  /* Una cuenta con forma imposible no llega al almacén. */
  const mala = await guardarMaterial(deps, { ...peticion, accountId: '../otra' });
  check('una cuenta que no puede formar clave se rechaza ANTES de tocar el almacén', !mala.ok && mala.error.details.field === 'objectKey');
}

await vaciar();
console.log(failures ? `\n✘ ${failures} fallos` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
