/*
 * H5/H2 · LOS CAMINOS DEL ÍNDICE, EJECUTADOS DE VERDAD SOBRE UNA FIRESTORE TRANSACCIONAL DE MENTIRA.
 *
 * El código compilado de `content/` (no una copia), con `getFirestore` y el Storage de Weë sustituidos por los falsos de
 * `_activos-falsos.mjs`, que cumplen las reglas que importan: transacciones optimistas que se repiten si lo leído
 * cambió, `create` atómico, 404 / 412 / 503 del almacén y PAUSAS para intercalar operaciones en un punto exacto.
 *
 *   A · Flag cerrada: los caminos de siempre, sin una fila ni un registro de más.
 *   B · Flag abierta: la ficha nace con su fila y el registro de su objeto; cobertura de nacimiento.
 *   C · Retirada con cerrojo (D-A): borra con la generación registrada; con los consumidores de producción, conserva (D-G).
 *   D · Versión con cerrojo (H2): la anterior y el objeto se leen DENTRO; A1 y A2 ya no crean versiones imposibles.
 *   E · Variantes: A4 (dos a la vez) y A5 (retirada a la vez) ya no pierden nada ni dejan huérfanos.
 *   F · El fallo de metadata: «no existe» (404) frente a fallo pasajero (503), con y sin flag.
 *   G · H5 medido: las lecturas de la retirada y de la versión no crecen con la cuenta.
 *
 * `WEE_LIB_ACTIVOS` permite correr esto contra una COPIA del compilado (lo usa `activos-mutacion.test.mjs`).
 * Necesita `functions/lib` recién compilado: `npm run build` antes.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearFirestoreFalsa, crearStorageFalso, enchufar, requerir, LIB } from './_activos-falsos.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const LIBDIR = process.env.WEE_LIB_ACTIVOS || LIB;
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let n = 0;
let fallos = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  if (!cond) fallos++;
  console.log(`${cond ? '✔' : '✘'} ${n}) ${nombre}${extra ? ` — ${extra}` : ''}`);
};

const F = crearFirestoreFalsa();
const S = crearStorageFalso();
const deshacer = enchufar(LIBDIR, F, S);
const content = requerir(LIBDIR, 'content/index.js');
const versiones = requerir(LIBDIR, 'content/versiones.js');
const indice = requerir(LIBDIR, 'content/indice.js');
const core = requerir(LIBDIR, 'core/index.js');

const ANA = 'uAna';
const BETO = 'uBeto';
const BUCKET = S.bucket.name;
const RUN = Date.now().toString(36);
let k = 0;
const clave = (cuenta = ANA, ext = 'png') => `users/${cuenta}/uploads/${RUN}-${++k}.${ext}`;
const urlDe = (c) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(c)}?alt=media&token=tok-${RUN}`;
const refWee = (c) => ({ provider: 'wee', bucket: BUCKET, objectKey: c });
const objRef = (c) => core.referenciaDelObjeto(indice.huellaDelIndice, refWee(c));
const registroDe = (c) => F.leer(`mediaObjects/${objRef(c)}`);
const filasDe = (c) => F.rutas(`mediaObjects/${objRef(c)}/referencias/`).map((r) => F.leer(r));
const ficha = (id) => F.leer(`assets/${id}`);

/* La flag, escrita «hace un minuto» para que lo que nazca ahora quede después de la marca y de su margen. */
const abrirFlag = (cuentas = [ANA]) => {
  const reloj = Date.now;
  F.fijarReloj(() => reloj() - 60_000);
  F.poner('aiSettings/almacenActivos', { habilitado: true, cuentas, coberturaDesde: 0 });
  F.fijarReloj(reloj);
};
const cerrarFlag = () => F.quitar('aiSettings/almacenActivos');
const crear = async (cuenta, c, extra = {}) => content.crearMaterialDesdeUrl({ ownerAccountId: cuenta, url: urlDe(c), kind: 'image', mimeType: 'image/png', provenance: { createdAt: 1 }, ...extra });
const anterior = async (cuenta = ANA) => { const c = clave(cuenta); S.subir(c); return (await crear(cuenta, c, { name: 'Retrato' })).assetId; };

/* Una pausa que no llega en cinco segundos es un fallo explícito, nunca un cuelgue. */
const llegar = (p) => Promise.race([p.llego.then(() => true), new Promise((r) => setTimeout(() => r(false), 5000))]);

let concesiones = 0;
/** Las dependencias con consumidores y operaciones CIERTOS: es la única forma de ejercitar el borrado de punta a punta. */
const depsCiertos = (extra = {}) => ({
  db: F.db,
  huella: indice.huellaDelIndice,
  indexable: content.entraEnElIndice,
  almacenes: { wee: indice.puertoDelStorageDeWee('wee') },
  consumidores: async () => ({ estado: 'sin_usos' }),
  operaciones: async () => [],
  ahora: Date.now,
  sortear: () => `c${++concesiones}`,
  ...extra,
});

try {
  /* ═══ A · FLAG CERRADA ════════════════════════════════════════════════════ */
  console.log('\n── A · Con la flag cerrada, nada nuevo ──');
  {
    const c = clave(); S.subir(c);
    const m = await crear(ANA, c);
    check('A1 se crea la ficha de siempre y ni una fila ni un registro', m && ficha(m.assetId)?.status === 'ready' && F.rutas('mediaObjects/').length === 0);
    const r = await content.retirarMaterial(ANA, m.assetId);
    check('A2 retirar borra el objeto como siempre, SIN precondición, y sigue sin índice', r.status === 'retirado' && r.objetosBorrados === 1 && !S.existe(c)
      && S.llamadas.precondiciones.at(-1).ifGenerationMatch === undefined && F.rutas('mediaObjects/').length === 0);
    F.poner('aiSettings/almacenActivos', { habilitado: 'si', cuentas: [ANA] });
    const c2 = clave(); S.subir(c2);
    const m2 = await crear(ANA, c2);
    check('A3 una flag mal formada es una flag cerrada', m2 && F.rutas('mediaObjects/').length === 0);
    F.poner('aiSettings/almacenActivos', { habilitado: true, cuentas: [BETO], coberturaDesde: 0 });
    const c3 = clave(); S.subir(c3);
    check('A4 abierta solo para otra cuenta: para esta, cerrada', (await crear(ANA, c3)) && F.rutas('mediaObjects/').length === 0);
    cerrarFlag();
  }

  /* ═══ B · FLAG ABIERTA: CREAR ═══════════════════════════════════════════════ */
  console.log('\n── B · La ficha nace con su fila y su registro ──');
  abrirFlag();
  {
    const c = clave(); const gen = S.subir(c);
    const m = await crear(ANA, c);
    const reg = registroDe(c);
    const filas = filasDe(c);
    check('B1 ficha, fila viva de clase material y registro guardado, en una transacción', m && ficha(m.assetId)?.status === 'ready'
      && filas.length === 1 && filas[0].refId === `material_${m.assetId}_original` && filas[0].viva === true && reg?.estado === 'guardado');
    check('B2 el registro guarda la generación vista y nace cubierto (después de la marca)', reg.generacion === gen && reg.cobertura === 'completa' && reg.coberturaOrigen === 'nacimiento');
    check('B3 el registro del índice es válido para el índice', core.registroDelIndiceValido(indice.huellaDelIndice, reg));
    const id = 'asset_' + 'c'.repeat(32);
    const c2 = clave(); S.subir(c2);
    const x = await crear(ANA, c2, { assetId: id });
    const y = await crear(ANA, c2, { assetId: id });
    check('B4 con identidad calculada, la segunda llegada se encuentra la primera: una ficha y una fila', x && y && x.assetId === id && y.assetId === id && filasDe(c2).length === 1);
    const cloud = await content.crearMaterialDesdeUrl({ ownerAccountId: ANA, url: 'https://res.cloudinary.com/dnrj1guvs/image/upload/v1/posts/uAna/f.jpg', kind: 'image', provenance: { createdAt: 1 } });
    check('B5 lo que no entra en el índice (Cloudinary) se crea como siempre, sin filas', cloud && cloud.storageRef.provider === 'cloudinary');
    /* Un objeto nacido ANTES de la marca: pudo tener referencias del camino antiguo. */
    const viejo = clave();
    S.subir(viejo);
    F.poner(`assets/asset_${'d'.repeat(32)}`, { assetId: `asset_${'d'.repeat(32)}`, ownerAccountId: ANA, status: 'ready', kind: 'image', storageRef: refWee(viejo), provenance: { createdAt: 1 }, contract: '1.0', createdAt: 1, updatedAt: 1 });
    abrirFlag();
    const reAbierta = clave(); S.subir(reAbierta);
    /* La flag se acaba de reescribir: la marca se mueve y lo nacido antes queda pendiente. */
    S.objetos.get(viejo).timeCreated = new Date(Date.now() - 3_600_000).toISOString();
    const mv = await crear(ANA, viejo);
    check('B6 un objeto nacido antes de la marca queda con cobertura pendiente', mv && registroDe(viejo).cobertura === 'pendiente');
  }

  /* ═══ C · RETIRAR CON CERROJO ════════════════════════════════════════════ */
  console.log('\n── C · La retirada con el índice y el cerrojo ──');
  {
    const c = clave(); const gen = S.subir(c);
    const m = await crear(ANA, c);
    const r = await indice.retirarConIndice(depsCiertos(), ANA, m.assetId);
    const pre = S.llamadas.precondiciones.at(-1);
    check('C1 con todo cierto se borra, y con la generación registrada como precondición (INV-5)', r.status === 'retirado' && r.objetosBorrados === 1 && r.pendientes === 0
      && !S.existe(c) && pre.clave === c && pre.ifGenerationMatch === gen);
    check('C2 registro cerrado `borrado`, filas apagadas, ficha retirada sin entrega y sin marca de pendiente',
      registroDe(c).estado === 'borrado' && filasDe(c).every((f) => f.viva === false) && ficha(m.assetId).status === 'deleted'
      && ficha(m.assetId).delivery === undefined && ficha(m.assetId).pendingPhysicalDeletion === false);
    check('C3 retirar dos veces es un no-op que se distingue', (await indice.retirarConIndice(depsCiertos(), ANA, m.assetId)).status === 'ya_retirado');
    check('C4 de otra cuenta no se dice ni que exista', (await indice.retirarConIndice(depsCiertos(), BETO, m.assetId)).status === 'no_es_tuyo'
      && (await indice.retirarConIndice(depsCiertos(), ANA, 'asset_' + 'f'.repeat(32))).status === 'no_existe');
  }
  {
    /* D-G: con los consumidores de PRODUCCIÓN (sin integrar), el material sale de la biblioteca y el objeto se queda. */
    const c = clave(); S.subir(c);
    const m = await crear(ANA, c);
    const respuesta = await content.deleteAsset.run({ auth: { uid: ANA }, data: { assetId: m.assetId } });
    const reg = registroDe(c);
    check('C5 deleteAsset con la flag abierta: retirado de la biblioteca, objeto CONSERVADO (D-G)', respuesta.status === 'deleted' && respuesta.pendingPhysicalDeletion === true
      && S.existe(c) && ficha(m.assetId).status === 'deleted');
    check('C6 el objeto queda candidato con el motivo `consumidores_no_verificados`, sin afirmar ningún borrado', reg.estado === 'candidato' && reg.pendiente?.motivo === 'consumidores_no_verificados'
      && filasDe(c).every((f) => !f.viva));
  }
  {
    /* E-1 con el índice: dos fichas sobre el mismo objeto. */
    const c = clave(); S.subir(c);
    const x = await crear(ANA, c); const y = await crear(ANA, c);
    const rx = await indice.retirarConIndice(depsCiertos(), ANA, x.assetId);
    check('C7 retirar una de dos fichas con el mismo objeto lo conserva (otra fila viva)', rx.pendientes === 1 && rx.motivos.referenciado === 1 && S.existe(c)
      && registroDe(c).estado === 'guardado' && ficha(x.assetId).pendingPhysicalDeletion === true);
    const ry = await indice.retirarConIndice(depsCiertos(), ANA, y.assetId);
    check('C8 la última lo borra, y la marca de la primera deja de estar pendiente', ry.objetosBorrados === 1 && !S.existe(c) && ficha(x.assetId).pendingPhysicalDeletion === false);
  }
  {
    /* Una ficha heredada SIN fila sobre la misma clave: el índice no la conoce, pero la consulta exacta por clave sí. */
    const c = clave(); S.subir(c);
    const nueva = await crear(ANA, c);
    const legado = 'asset_' + '1'.repeat(32);
    F.poner(`assets/${legado}`, { assetId: legado, ownerAccountId: ANA, status: 'ready', kind: 'image', storageRef: refWee(c), provenance: { createdAt: 1 }, contract: '1.0', createdAt: 1, updatedAt: 1 });
    const r = await indice.retirarConIndice(depsCiertos(), ANA, nueva.assetId);
    check('C9 una ficha viva heredada sin fila protege el objeto', r.pendientes === 1 && S.existe(c) && registroDe(c).estado === 'guardado');
  }
  {
    const c = clave(); S.subir(c);
    const m = await crear(ANA, c);
    S.sobrescribir(c); // el dueño escribe otros bytes en la misma clave
    const r = await indice.retirarConIndice(depsCiertos(), ANA, m.assetId);
    check('C10 412: bytes nuevos en la clave NO se borran; el objeto vuelve a candidato con `generacion_distinta`', r.pendientes === 1 && r.motivos.generacion_distinta === 1
      && S.existe(c) && registroDe(c).estado === 'candidato' && registroDe(c).pendiente.motivo === 'generacion_distinta');
  }
  {
    const c = clave(); S.subir(c);
    const m = await crear(ANA, c);
    S.fallarUnaVez(c, 'delete', 503);
    const r = await indice.retirarConIndice(depsCiertos(), ANA, m.assetId);
    const reg = registroDe(c);
    check('C11 fallo pasajero: el objeto se queda, candidato, con el intento contado y el motivo; nada se da por borrado', r.pendientes === 1 && r.motivos.error_transitorio === 1
      && S.existe(c) && reg.estado === 'candidato' && reg.intentosDeBorrado === 1 && reg.pendiente.motivo === 'error_transitorio' && ficha(m.assetId).pendingPhysicalDeletion === true);
  }
  {
    const c = clave(); S.subir(c);
    S.objetos.get(c).timeCreated = new Date(Date.now() - 3_600_000).toISOString();
    const m = await crear(ANA, c);
    const r = await indice.retirarConIndice(depsCiertos(), ANA, m.assetId);
    check('C12 cobertura pendiente: no se borra (INV-8)', r.motivos.cobertura_incompleta === 1 && S.existe(c) && registroDe(c).estado === 'candidato');
  }
  {
    const c = clave(); S.subir(c);
    const m = await crear(ANA, c);
    const sinGenerar = depsCiertos({ almacenes: { wee: { ...indice.puertoDelStorageDeWee('wee'), capacidades: ['object.head', 'object.delete'] } } });
    const r = await indice.retirarConIndice(sinGenerar, ANA, m.assetId);
    check('C13 un adaptador que no sabe borrar con generación no borra: vuelve a candidato', r.motivos.precondicion_no_soportada === 1 && S.existe(c) && registroDe(c).estado === 'candidato');
  }

  /* ═══ D · VERSIONES CON CERROJO ══════════════════════════════════════════ */
  console.log('\n── D · Guardar como versión, con la anterior y el objeto leídos dentro ──');
  {
    const ant = await anterior();
    const c = clave(); const gen = S.subir(c);
    const v = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) });
    const filas = filasDe(c);
    check('D1 se crea con ficha, fila de clase version y registro, juntos', v.status === 'creada' && ficha(v.asset.assetId)?.previousVersionId === ant
      && filas.length === 1 && filas[0].clase === 'version' && filas[0].viva && registroDe(c).estado === 'guardado' && registroDe(c).generacion === gen);
    const otra = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) });
    check('D2 repetir es idempotente: la misma ficha y una fila', otra.status === 'creada' && otra.asset.assetId === v.asset.assetId && filasDe(c).length === 1);
  }
  {
    /* A2 · la anterior se retira MIENTRAS se crea la versión (entre la metadata y la transacción). */
    const ant = await anterior();
    const c = clave(); S.subir(c);
    S.alLeerMetadatos(c, async () => { await content.retirarMaterial(ANA, ant); });
    const v = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) });
    check('D3 A2: ninguna versión viva sobre una anterior retirada (se lee dentro: no_lista)', v.status === 'no_lista' && ficha(ant).status === 'deleted'
      && F.rutas('assets/').every((r) => F.leer(r).previousVersionId !== ant));
  }
  {
    /*
     * A2, ventana a · la anterior se retira DENTRO de la ventana de la transacción de la versión: después de que la
     * transacción la lea y antes de que confirme. Solo una lectura DENTRO de la transacción lo nota (la confirmación
     * falla, se repite y entonces la ve retirada).
     */
    const ant = await anterior();
    const c = clave(); S.subir(c);
    const pausa = F.pausar((q) => q.tipo === 'doc' && q.ruta === `mediaObjects/${objRef(c)}` && q.enTransaccion);
    const pv = versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) });
    if (!(await llegar(pausa))) throw new Error('la pausa no llegó: la operación no leyó lo que se esperaba');
    await content.retirarMaterial(ANA, ant);
    pausa.soltar();
    const v = await pv;
    check('D3b A2 dentro de la transacción: la anterior se retira tras leerla y antes de confirmar → no_lista (se repite y la ve)',
      v.status === 'no_lista' && ficha(ant).status === 'deleted' && F.rutas('assets/').every((r) => F.leer(r).previousVersionId !== ant), v.status);
  }
  {
    /* A1 · el objeto se retira y se BORRA entre la metadata de la versión y su transacción. */
    const ant = await anterior();
    const c = clave(); S.subir(c);
    const otraFicha = await crear(ANA, c);
    /* La PRIMERA lectura de metadata de la versión dispara la retirada (el contador del almacén ya contó la de la creación). */
    let disparado = false;
    S.alLeerMetadatos(c, async () => { if (!disparado) { disparado = true; await indice.retirarConIndice(depsCiertos(), ANA, otraFicha.assetId); } });
    const v = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) });
    check('D4 A1: el objeto se borró mientras tanto → archivo_ajeno; ninguna versión sobre bytes que no existen', v.status === 'archivo_ajeno' && !S.existe(c)
      && registroDe(c).estado === 'borrado' && F.rutas('assets/').every((r) => F.leer(r).previousVersionId !== ant));
  }
  {
    /* Un candidato (material retirado con los consumidores de producción) se RESCATA al versionarlo. */
    const ant = await anterior();
    const c = clave(); S.subir(c);
    const vieja = await crear(ANA, c);
    await content.retirarMaterial(ANA, vieja.assetId);
    const antes = registroDe(c).estado;
    const v = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) });
    check('D5 rescata un candidato: la versión vive y el objeto vuelve a guardado', antes === 'candidato' && v.status === 'creada' && registroDe(c).estado === 'guardado');
  }
  {
    const ant = await anterior();
    const c = clave(); S.subir(c);
    const vieja = await crear(ANA, c);
    await content.retirarMaterial(ANA, vieja.assetId);
    S.sobrescribir(c);
    const v = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) });
    check('D6 compara la generación: unos bytes distintos con el mismo nombre no se versionan', v.status === 'archivo_ajeno' && registroDe(c).estado === 'candidato');
  }
  {
    const ant = await anterior();
    const c = clave(); S.subir(c);
    await crear(ANA, c);
    check('D7 otra ficha viva usa el archivo (fila viva): archivo_en_uso', (await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) })).status === 'archivo_en_uso');
    const c2 = clave(); S.subir(c2);
    const legado = 'asset_' + '2'.repeat(32);
    F.poner(`assets/${legado}`, { assetId: legado, ownerAccountId: ANA, status: 'ready', kind: 'image', storageRef: refWee(c2), provenance: { createdAt: 1 }, contract: '1.0', createdAt: 1, updatedAt: 1 });
    check('D8 una ficha heredada viva con la clave, sin fila: archivo_en_uso', (await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c2) })).status === 'archivo_en_uso');
  }

  /* ═══ E · VARIANTES ═════════════════════════════════════════════════════ */
  console.log('\n── E · Anotar variantes sin perder ninguna ──');
  {
    cerrarFlag();
    /* A4 con la flag CERRADA: la transacción es independiente de la flag. */
    const c = clave(); S.subir(c);
    const m = await crear(ANA, c);
    const pausa = F.pausar((q) => q.tipo === 'doc' && q.ruta === `assets/${m.assetId}`);
    const p1 = content.anotarVariante(ANA, m.assetId, { kind: 'thumbnail', storageRef: refWee(clave()), mimeType: 'image/png' });
    if (!(await llegar(pausa))) throw new Error('la pausa no llegó: la operación no leyó lo que se esperaba');
    const q = await content.anotarVariante(ANA, m.assetId, { kind: 'poster', storageRef: refWee(clave()), mimeType: 'image/png' });
    pausa.soltar();
    const p = await p1;
    const kinds = (ficha(m.assetId).variants ?? []).map((v) => v.kind).sort().join(',');
    check('E1 A4: dos anotaciones a la vez dejan LAS DOS variantes (flag cerrada)', p === true && q === true && kinds === 'poster,thumbnail', kinds);
    check('E2 un material ajeno o retirado no se anota', !(await content.anotarVariante(BETO, m.assetId, { kind: 'preview', storageRef: refWee(clave()) }))
      && !(await content.anotarVariante(ANA, 'asset_' + '9'.repeat(32), { kind: 'preview', storageRef: refWee(clave()) })));
    abrirFlag();
  }
  {
    const c = clave(); S.subir(c);
    const m = await crear(ANA, c);
    const pausa = F.pausar((q) => q.tipo === 'doc' && q.ruta === `assets/${m.assetId}`);
    const t1 = clave(); S.subir(t1); const t2 = clave(); S.subir(t2);
    const p1 = content.anotarVariante(ANA, m.assetId, { kind: 'thumbnail', storageRef: refWee(t1) });
    if (!(await llegar(pausa))) throw new Error('la pausa no llegó: la operación no leyó lo que se esperaba');
    await content.anotarVariante(ANA, m.assetId, { kind: 'poster', storageRef: refWee(t2) });
    pausa.soltar();
    await p1;
    const kinds = (ficha(m.assetId).variants ?? []).map((v) => v.kind).sort().join(',');
    check('E3 A4 con la flag abierta: las dos variantes, cada una con su fila viva y su registro', kinds === 'poster,thumbnail'
      && filasDe(t1)[0]?.viva === true && filasDe(t2)[0]?.viva === true && registroDe(t1)?.estado === 'guardado', kinds);
    const t3 = clave(); S.subir(t3);
    await content.anotarVariante(ANA, m.assetId, { kind: 'thumbnail', storageRef: refWee(t3) });
    check('E4 sustituir una variante apaga la fila de la anterior y su objeto pasa a candidato', filasDe(t1)[0]?.viva === false && registroDe(t1)?.estado === 'candidato'
      && registroDe(t1)?.pendiente?.motivo === 'variante_sustituida' && filasDe(t3)[0]?.viva === true);
  }
  {
    /* A5 · retirada y anotación a la vez: la retirada se repite y se lleva también la variante nueva. */
    const c = clave(); S.subir(c);
    const m = await crear(ANA, c);
    const poster = clave(); S.subir(poster);
    const pausa = F.pausar((q) => q.tipo === 'doc' && q.ruta === `assets/${m.assetId}`);
    const pr = indice.retirarConIndice(depsCiertos(), ANA, m.assetId);
    if (!(await llegar(pausa))) throw new Error('la pausa no llegó: la operación no leyó lo que se esperaba');
    const anotada = await content.anotarVariante(ANA, m.assetId, { kind: 'poster', storageRef: refWee(poster) });
    pausa.soltar();
    const r = await pr;
    check('E5 A5: ninguna variante perdida y ningún objeto huérfano (el póster también se retira y se borra)', anotada === true && r.status === 'retirado'
      && (ficha(m.assetId).variants ?? []).some((v) => v.kind === 'poster') && !S.existe(poster) && registroDe(poster).estado === 'borrado' && !S.existe(c),
    `reintentos=${F.contador.reintentos}`);
  }

  /* ═══ F · METADATA: NO EXISTE FRENTE A FALLO PASAJERO ═══════════════════════ */
  console.log('\n── F · 404 no es lo mismo que un fallo pasajero ──');
  for (const abierta of [false, true]) {
    if (abierta) abrirFlag(); else cerrarFlag();
    const ant = await anterior();
    const noSubido = clave();
    const v404 = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(noSubido) });
    const c = clave(); S.subir(c);
    S.fallarUnaVez(c, 'getMetadata', 503);
    const v503 = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) });
    const reintento = await versiones.crearVersionDeMaterial(ANA, { anteriorId: ant, url: urlDe(c) });
    check(`F${abierta ? 2 : 1} (${abierta ? 'flag abierta' : 'flag cerrada'}) 404 → archivo_ajeno; 503 → no_creada; y al reintentar, creada`,
      v404.status === 'archivo_ajeno' && v503.status === 'no_creada' && reintento.status === 'creada', `${v404.status}/${v503.status}/${reintento.status}`);
  }

  /* ═══ G · H5: LAS LECTURAS NO CRECEN CON LA CUENTA ═══════════════════════ */
  console.log('\n── G · H5 medido: lecturas por operación con N fichas en la cuenta ──');
  {
    abrirFlag(['uGrande']);
    const medidas = [];
    let previos = 0;
    for (const N of [100, 1000, 10000]) {
      for (let i = previos; i < N; i++) {
        const id = `asset_${i.toString(16).padStart(32, '0')}`;
        F.poner(`assets/${id}`, { assetId: id, ownerAccountId: 'uGrande', status: i % 3 ? 'ready' : 'deleted', kind: 'image', storageRef: refWee(`users/uGrande/r/${i}.png`), provenance: { createdAt: 1 }, contract: '1.0', createdAt: 1, updatedAt: 1 });
      }
      previos = N;
      const c = clave('uGrande'); S.subir(c);
      const m = await crear('uGrande', c);
      F.reiniciarContador();
      await indice.retirarConIndice(depsCiertos(), 'uGrande', m.assetId);
      const retirada = F.contador.lecturas;
      const base = (await crear('uGrande', (() => { const x = clave('uGrande'); S.subir(x); return x; })())).assetId;
      const cv = clave('uGrande'); S.subir(cv);
      F.reiniciarContador();
      const v = await versiones.crearVersionDeMaterial('uGrande', { anteriorId: base, url: urlDe(cv) });
      medidas.push({ N, retirada, version: F.contador.lecturas, estado: v.status });
    }
    const iguales = (k2) => medidas.every((m) => m[k2] === medidas[0][k2]);
    check('G1 la retirada lee lo mismo con 100, 1 000 y 10 000 fichas en la cuenta', iguales('retirada'), JSON.stringify(medidas.map((m) => [m.N, m.retirada])));
    check('G2 la versión lee lo mismo con 100, 1 000 y 10 000 fichas en la cuenta', iguales('version') && medidas.every((m) => m.estado === 'creada'), JSON.stringify(medidas.map((m) => [m.N, m.version])));
    /* La misma medida por el camino de siempre, para que se vea lo que se cerró. */
    cerrarFlag();
    F.reiniciarContador();
    const c = clave('uGrande'); S.subir(c);
    const m = await crear('uGrande', c);
    F.reiniciarContador();
    await content.retirarMaterial('uGrande', m.assetId);
    check('G3 por el camino de siempre la retirada lee la cuenta entera (lo que H5 medía)', F.contador.lecturas >= 10000, `lecturas=${F.contador.lecturas}`);
    /* T-14: un texto grande de la cuenta no se lee al retirar otro material. */
    abrirFlag(['uGrande']);
    const texto = 'asset_' + 't'.repeat(0) + 'e'.repeat(32);
    F.poner(`assets/${texto}`, { assetId: texto, ownerAccountId: 'uGrande', status: 'ready', kind: 'text', contenido: 'x'.repeat(500 * 1024), provenance: { createdAt: 1 }, contract: '1.0', createdAt: 1, updatedAt: 1 });
    const c2 = clave('uGrande'); S.subir(c2);
    const m2 = await crear('uGrande', c2);
    F.reiniciarContador();
    await indice.retirarConIndice(depsCiertos(), 'uGrande', m2.assetId);
    check('G4 retirar no lee el contenido de otras fichas (un texto de 500 KiB, cero lecturas)', (F.lecturasPorRuta.get(`assets/${texto}`) ?? 0) === 0);
  }

  /* ═══ H · LO QUE NO SE TOCA ═════════════════════════════════════════════ */
  console.log('\n── H · Lo que este bloque no toca ──');
  {
    check('H1 content/index.ts sigue sin depender de media/', !/media\//.test(sinComentarios(leer('functions/src/content/index.ts'))));
    check('H2 guardarComoVersion NO se exporta desde functions/src/index.ts (T-15)', !/guardarComoVersion/.test(leer('functions/src/index.ts')));
    check('H3 ni el barrido del índice', !/barridoDeActivos|media\/barrido/.test(leer('functions/src/index.ts')));
    let indexSinCambios = false;
    try {
      execFileSync('git', ['diff', '--quiet', '9469e3a', '--', 'functions/src/index.ts'], { cwd: RAIZ });
      indexSinCambios = true;
    } catch { indexSinCambios = false; }
    check('H4 functions/src/index.ts, idéntico a la base (9469e3a)', indexSinCambios);
  }
} catch (error) {
  /* Una suite que se interrumpe es un fallo con su motivo, no un cuelgue ni un rastro suelto. */
  fallos++;
  console.log(`✘ ${++n}) la suite se interrumpió: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  deshacer();
}

console.log(fallos ? `\n✘ ${fallos} fallo(s) de ${n}` : `\n✔ todo bien (${n} comprobaciones)`);
process.exit(fallos ? 1 : 0);
