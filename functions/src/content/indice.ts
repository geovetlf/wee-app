import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import {
  AssetVariant,
  DesenlaceDeBorrado,
  EsperadoDelObjeto,
  EstadoDeConsumidores,
  FilaDeReferencia,
  FilaEsperada,
  FORMA_DE_ID_DE_MATERIAL,
  JobState,
  MediaObject,
  POLITICA_DEL_BORRADO_INMEDIATO,
  PoliticaDeBorradoFisico,
  StorageRef,
  cerrar,
  comoCrearFilaViva,
  coberturaVigente,
  decidirBorradoFisico,
  devolver,
  esPrecondicionFallida,
  esStorageRef,
  falloDeAlmacen,
  filasEsperadasDeLaFicha,
  flagAbiertaPara,
  materialEsDeLaCuenta,
  pasarACandidato,
  reclamar,
  referenciaDeAlmacenDe,
  registroDelIndiceValido,
  registroEsDeLaCuenta,
  rescatar,
  retirar,
  sabeBorrarConGeneracion,
  versionDe,
} from '../core';
import {
  COLECCION_DE_MATERIALES_DEL_INDICE,
  DURACION_DE_CONCESION_MS,
  DepsDelIndice,
  HechosDelObjeto,
  LIMITE_DE_FICHAS_POR_CLAVE,
  LIMITE_DE_FILAS_DE_UN_OBJETO,
  SUBCOLECCION_DE_REFERENCIAS,
  fichasConLaClave,
  filaNueva,
  filasVivasDe,
  leerFlagDelAlmacen,
  leerFlagEnTransaccion,
  limpiarDelIndice as limpiar,
  mismoObjeto,
  objetosDelIndice,
  refDeFila,
  refDeObjeto,
  registroNuevo,
} from './indice-almacen';
import type { AssetDoc } from './index';

export * from './indice-almacen';
export { reconciliarIndiceDeCuentaEnFirestore, marcarCoberturaDelObjeto } from './indice-reconciliacion';
export type { InformeDeReconciliacionEnFirestore } from './indice-reconciliacion';

/**
 * H5/H2 · EL ÍNDICE DE REFERENCIAS, EN FIRESTORE. Los caminos nuevos, detrás de
 * `aiSettings/almacenActivos` (CERRADA por defecto).
 *
 * ── Qué hace esto ───────────────────────────────────────────────────────────
 *
 * Ejecuta lo que decide `core/media/indice.ts` sobre tres cosas que viven
 * juntas y se escriben juntas:
 *
 *     assets/{assetId}                               la ficha del material
 *     mediaObjects/{objectRef}                       el registro del objeto (el CERROJO)
 *     mediaObjects/{objectRef}/referencias/{refId}   el ÍNDICE: un uso por fila
 *
 * Toda transición lee antes de escribir, dentro de `runTransaction`, y escribe
 * el registro del objeto: así dos operaciones sobre el mismo objeto no pueden
 * ganar a la vez. El almacén NUNCA entra en una transacción: se mira antes
 * (existencia y generación) y se borra después, con la generación registrada
 * como precondición.
 *
 * ── Por qué está en `content/` y no en `media/` ─────────────────────────────
 *
 * Lo llama `deleteAsset` (este módulo), y `content/index.ts` no puede depender
 * de `media/` —lo vigila `media-core.test.mjs`, y es la dirección de siempre:
 * Media Cloud depende del material, no al revés—. Además, cada transacción de
 * aquí escribe la ficha del material, que es de este módulo.
 *
 * ── Lo que no hace ──────────────────────────────────────────────────────────
 *
 * No decide nada: la decisión es del Core. No cobra, no llama a ninguna IA, no
 * exporta ninguna Function y no borra nada que no haya pasado por
 * `decidirBorradoFisico` y por el cerrojo.
 */

/* ── 5 · Crear una ficha con su fila y su registro, en UNA transacción ──────── */

export type ResultadoDeCreacionConIndice =
  | { status: 'creada'; doc: AssetDoc }
  | { status: 'ya_estaba'; doc: AssetDoc }
  | { status: 'ajena' }
  | { status: 'rechazada'; motivo: string };

/**
 * LA FICHA, SU FILA Y EL REGISTRO DEL OBJETO, JUNTOS (§7.6). Un objeto que se va
 * (`borrando`, `borrado`) no recibe una fila viva; uno `candidato` se rescata
 * solo si sigue ahí con la misma generación. Con `soloSiNoExiste`, la segunda
 * llegada se encuentra la ficha que dejó la primera, igual que sin índice.
 */
export const crearFichaConIndice = async (
  deps: DepsDelIndice,
  doc: AssetDoc,
  /*
   * `sinRegistro`: para una subida, cuyos bytes todavía no existen. Se escribe la
   * fila (el material ya reclama esa clave) pero no el registro del objeto, que
   * nace cuando se confirman los bytes (MC-3). Si el registro ya existe y no está
   * `guardado`, no se crea nada: no se reclama una clave que se está retirando.
   */
  opciones: { soloSiNoExiste: boolean; hechos?: HechosDelObjeto; sinRegistro?: boolean },
): Promise<ResultadoDeCreacionConIndice> => {
  const db = deps.db;
  const esperadas = filasEsperadasDeLaFicha(deps.huella, doc, deps.indexable);
  const fichaRef = db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).doc(doc.assetId);
  return db.runTransaction(async (tx) => {
    const at = deps.ahora();
    const flag = await leerFlagEnTransaccion(tx, db);
    if (opciones.soloSiNoExiste) {
      const ya = await tx.get(fichaRef);
      if (ya.exists) {
        const d = ya.data() as AssetDoc;
        return d.ownerAccountId === doc.ownerAccountId ? { status: 'ya_estaba' as const, doc: d } : { status: 'ajena' as const };
      }
    }
    const planes: { e: FilaEsperada; registro?: MediaObject }[] = [];
    for (const e of esperadas) {
      const snap = await tx.get(refDeObjeto(db, e.objectRef));
      const reg = snap.exists ? (snap.data() as MediaObject) : undefined;
      if (reg && !registroEsDeLaCuenta(reg, doc.ownerAccountId)) return { status: 'rechazada' as const, motivo: 'de_otra_cuenta' };
      const como = comoCrearFilaViva(reg);
      if (como === 'no') return { status: 'rechazada' as const, motivo: 'objeto_retirandose' };
      if (opciones.sinRegistro) {
        if (como === 'rescatar') return { status: 'rechazada' as const, motivo: 'objeto_retirandose' };
        planes.push({ e });
        continue;
      }
      if (como === 'rescatar') {
        const r = rescatar(reg, { estado: 'candidato', version: versionDe(reg) }, {
          presente: opciones.hechos?.existe === true, generacionObservada: opciones.hechos?.generacion, at,
        });
        if (!r.ok) return { status: 'rechazada' as const, motivo: r.fallo };
        planes.push({ e, registro: r.siguiente });
      } else if (como === 'crear_registro') {
        const nuevo = registroNuevo(e, opciones.hechos, flag.marca, at);
        if (!registroDelIndiceValido(deps.huella, nuevo)) return { status: 'rechazada' as const, motivo: 'registro_invalido' };
        planes.push({ e, registro: nuevo });
      } else {
        planes.push({ e });
      }
    }
    if (opciones.soloSiNoExiste) tx.create(fichaRef, doc); else tx.set(fichaRef, doc);
    for (const p of planes) {
      tx.set(refDeFila(db, p.e.objectRef, p.e.refId), filaNueva(p.e, true, at));
      if (p.registro) tx.set(refDeObjeto(db, p.e.objectRef), limpiar(p.registro));
    }
    return { status: 'creada' as const, doc };
  });
};

/* ── 6 · Una versión, con la anterior leída DENTRO (H2, ventana a) ─────────── */

export type ResultadoDeVersionConIndice =
  | { status: 'creada'; asset: AssetDoc }
  | { status: 'no_existe' }
  | { status: 'no_lista' }
  | { status: 'archivo_ajeno' }
  | { status: 'archivo_en_uso' };

/**
 * LA VERSIÓN EN UNA TRANSACCIÓN (INV-9). Dentro se leen la anterior, la versión
 * si ya existe, el registro del objeto y sus filas vivas, y las fichas vivas con
 * la misma clave (las heredadas que todavía no tienen fila). Solo se crea sobre
 * un objeto `guardado` —o rescatado—, con la anterior lista y con la generación
 * vista igual a la registrada. Ficha, fila y registro se escriben juntos.
 */
export const crearVersionConIndice = async (
  deps: DepsDelIndice,
  datos: { cuenta: string; anteriorId: string; doc: AssetDoc; hechos: HechosDelObjeto },
): Promise<ResultadoDeVersionConIndice> => {
  const db = deps.db;
  const { cuenta, anteriorId, doc, hechos } = datos;
  const [e] = filasEsperadasDeLaFicha(deps.huella, doc, deps.indexable);
  if (!e || e.clase !== 'version') return { status: 'archivo_ajeno' };
  const fichas = db.collection(COLECCION_DE_MATERIALES_DEL_INDICE);
  return db.runTransaction(async (tx) => {
    const at = deps.ahora();
    const flag = await leerFlagEnTransaccion(tx, db);
    const anterior = await tx.get(fichas.doc(anteriorId));
    const ant = anterior.exists ? (anterior.data() as AssetDoc) : undefined;
    if (!ant || !materialEsDeLaCuenta(ant, cuenta)) return { status: 'no_existe' as const };
    if (ant.status !== 'ready') return { status: 'no_lista' as const };
    const existente = await tx.get(fichas.doc(doc.assetId));
    if (existente.exists) {
      const ex = existente.data() as AssetDoc;
      const misma = ex.status !== 'deleted' && ex.previousVersionId === anteriorId && materialEsDeLaCuenta(ex, cuenta);
      return misma ? { status: 'creada' as const, asset: ex } : { status: 'archivo_en_uso' as const };
    }
    const snap = await tx.get(refDeObjeto(db, e.objectRef));
    const reg = snap.exists ? (snap.data() as MediaObject) : undefined;
    const vivas = await tx.get(filasVivasDe(db, e.objectRef, 1));
    const conLaClave = await tx.get(fichasConLaClave(db, e.ref.objectKey));
    if (reg && !registroEsDeLaCuenta(reg, cuenta)) return { status: 'archivo_ajeno' as const };
    const como = comoCrearFilaViva(reg);
    /* Bytes que se van, o que ya no son los registrados: no son un archivo de la cuenta en el que apoyar una versión. */
    if (como === 'no') return { status: 'archivo_ajeno' as const };
    if (reg && reg.generacion !== undefined && hechos.generacion !== reg.generacion) return { status: 'archivo_ajeno' as const };
    if (!vivas.empty) return { status: 'archivo_en_uso' as const };
    if (conLaClave.size >= LIMITE_DE_FICHAS_POR_CLAVE) return { status: 'archivo_en_uso' as const };
    const heredadas = conLaClave.docs.filter((d) => d.id !== doc.assetId
      && (d.data() as AssetDoc).status !== 'deleted' && mismoObjeto((d.data() as AssetDoc).storageRef, e.ref));
    if (heredadas.length > 0) return { status: 'archivo_en_uso' as const };
    let registro: MediaObject | undefined;
    if (como === 'rescatar') {
      const r = rescatar(reg, { estado: 'candidato', version: versionDe(reg) }, { presente: hechos.existe === true, generacionObservada: hechos.generacion, at });
      if (!r.ok) return { status: 'archivo_ajeno' as const };
      registro = r.siguiente;
    } else if (como === 'crear_registro') {
      registro = registroNuevo(e, hechos, flag.marca, at);
      if (!registroDelIndiceValido(deps.huella, registro)) return { status: 'archivo_ajeno' as const };
    }
    tx.create(fichas.doc(doc.assetId), doc);
    tx.set(refDeFila(db, e.objectRef, e.refId), filaNueva(e, true, at));
    if (registro) tx.set(refDeObjeto(db, e.objectRef), limpiar(registro));
    return { status: 'creada' as const, asset: doc };
  });
};

/* ── 7 · Una variante, sin perder las demás y sin dejar huérfana la anterior ── */

/**
 * ANOTAR UNA VARIANTE CON EL ÍNDICE. La ficha, la fila de la variante nueva y
 * el registro de su objeto, en una transacción; y si la variante del mismo tipo
 * apuntaba a otro objeto, su fila se apaga y, si ese objeto se queda sin usos,
 * pasa a `candidato` (§7.6). Lo que el almacén dijo de la variante nueva llega
 * de fuera de la transacción.
 */
export const anotarVarianteConIndice = async (
  deps: DepsDelIndice,
  accountId: string,
  assetId: string,
  variante: AssetVariant,
  hechos: HechosDelObjeto | undefined,
): Promise<boolean> => {
  const db = deps.db;
  const fichaRef = db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).doc(assetId);
  return db.runTransaction(async (tx) => {
    const at = deps.ahora();
    const flag = await leerFlagEnTransaccion(tx, db);
    const snap = await tx.get(fichaRef);
    const doc = snap.exists ? (snap.data() as AssetDoc) : undefined;
    if (!doc || !materialEsDeLaCuenta(doc, accountId) || doc.status === 'deleted') return false;
    if (!esStorageRef(variante.storageRef)) return false;
    const variants = [...(doc.variants ?? []).filter((v) => v.kind !== variante.kind), variante];
    const antes = filasEsperadasDeLaFicha(deps.huella, doc, deps.indexable);
    const despues = filasEsperadasDeLaFicha(deps.huella, { ...doc, variants }, deps.indexable);
    const refIdDeLaVariante = despues.find((f) => f.clase === 'variante' && f.pieza === variante.kind)?.refId;
    const nueva = despues.find((f) => f.refId === refIdDeLaVariante && mismoObjeto(f.ref, variante.storageRef));
    /* Las filas que esta ficha deja de exigir: la variante sustituida, si apuntaba a otro objeto. */
    const quedan = new Set(despues.map((f) => `${f.objectRef}/${f.refId}`));
    const sueltas = antes.filter((f) => !quedan.has(`${f.objectRef}/${f.refId}`));

    let registroNuevoDeLaVariante: MediaObject | undefined;
    if (nueva) {
      const regSnap = await tx.get(refDeObjeto(db, nueva.objectRef));
      const reg = regSnap.exists ? (regSnap.data() as MediaObject) : undefined;
      if (reg && !registroEsDeLaCuenta(reg, accountId)) return false;
      const como = comoCrearFilaViva(reg);
      if (como === 'no') return false;
      if (como === 'rescatar') {
        const r = rescatar(reg, { estado: 'candidato', version: versionDe(reg) }, { presente: hechos?.existe === true, generacionObservada: hechos?.generacion, at });
        if (!r.ok) return false;
        registroNuevoDeLaVariante = r.siguiente;
      } else if (como === 'crear_registro') {
        registroNuevoDeLaVariante = registroNuevo(nueva, hechos, flag.marca, at);
        if (!registroDelIndiceValido(deps.huella, registroNuevoDeLaVariante)) return false;
      }
    }
    const apagar: { f: FilaEsperada; previa?: FilaDeReferencia; registro?: MediaObject; otras: number }[] = [];
    for (const f of sueltas) {
      const previa = await tx.get(refDeFila(db, f.objectRef, f.refId));
      const regSnap = await tx.get(refDeObjeto(db, f.objectRef));
      const propiasAqui = despues.filter((x) => x.objectRef === f.objectRef).length;
      const vivas = await tx.get(filasVivasDe(db, f.objectRef, propiasAqui + 2));
      const mias = new Set(despues.filter((x) => x.objectRef === f.objectRef).map((x) => x.refId).concat(f.refId));
      apagar.push({
        f,
        previa: previa.exists ? (previa.data() as FilaDeReferencia) : undefined,
        registro: regSnap.exists ? (regSnap.data() as MediaObject) : undefined,
        otras: vivas.docs.filter((d) => !mias.has(d.id)).length + despues.filter((x) => x.objectRef === f.objectRef).length,
      });
    }

    tx.set(fichaRef, { variants, updatedAt: at }, { merge: true });
    if (nueva) {
      tx.set(refDeFila(db, nueva.objectRef, nueva.refId), filaNueva(nueva, true, at));
      if (registroNuevoDeLaVariante) tx.set(refDeObjeto(db, nueva.objectRef), limpiar(registroNuevoDeLaVariante));
    }
    for (const a of apagar) {
      tx.set(refDeFila(db, a.f.objectRef, a.f.refId), { ...(a.previa ?? filaNueva(a.f, false, at)), viva: false, actualizadoAt: at });
      if (a.registro && a.otras === 0 && a.registro.estado === 'guardado' && registroEsDeLaCuenta(a.registro, accountId)) {
        const r = pasarACandidato(a.registro, { estado: 'guardado', version: versionDe(a.registro) }, { filasVivas: 0, at, motivo: 'variante_sustituida' });
        if (r.ok) tx.set(refDeObjeto(db, a.f.objectRef), limpiar(r.siguiente));
      }
    }
    return true;
  });
};

/* ── 8 · El borrado con cerrojo: reclamar, borrar con generación, cerrar ──── */

export type DesenlaceDeReclamacion =
  | { reclamado: true; concesionId: string; generacion: string; providerId: string; ref: StorageRef; esperado: EsperadoDelObjeto }
  | { reclamado: false; motivo: string };

/**
 * T2 · RECLAMAR. Dentro de la transacción se leen la flag, el registro y sus
 * filas vivas, y se decide con `decidirBorradoFisico`. Si dice que no, el
 * registro se queda como está y, si espera (`candidato`), anota el motivo. Si
 * dice que sí, pasa a `borrando` con una concesión que caduca.
 *
 * Consumidores y operaciones se preguntan ANTES (pueden necesitar red); lo que
 * contesten entra en la decisión, y si fallan, la respuesta es «no se sabe».
 */
export const reclamarParaBorrar = async (
  deps: DepsDelIndice,
  objectRef: string,
  cuenta: string,
  politica: PoliticaDeBorradoFisico,
): Promise<DesenlaceDeReclamacion> => {
  const db = deps.db;
  const previo = await refDeObjeto(db, objectRef).get();
  if (!previo.exists) return { reclamado: false, motivo: 'sin_registro' };
  const objetoPrevio = previo.data() as MediaObject;
  if (!registroEsDeLaCuenta(objetoPrevio, cuenta)) return { reclamado: false, motivo: 'fuera_de_su_cuenta' };

  const todas = await refDeObjeto(db, objectRef).collection(SUBCOLECCION_DE_REFERENCIAS).limit(LIMITE_DE_FILAS_DE_UN_OBJETO + 1).get();
  const assetIds = [...new Set(todas.docs.map((d) => String((d.data() as FilaDeReferencia).assetId)))];
  let consumidores: EstadoDeConsumidores | undefined;
  try {
    consumidores = todas.size > LIMITE_DE_FILAS_DE_UN_OBJETO
      ? { estado: 'desconocido', tipos: ['filas_sin_leer'] }
      : await deps.consumidores(objetoPrevio, assetIds);
  } catch (error) {
    console.warn('Content/índice: los consumidores no contestaron; se protege', objectRef, error instanceof Error ? error.name : 'error');
    consumidores = undefined;
  }
  let operaciones: readonly JobState[] | undefined;
  try {
    operaciones = await deps.operaciones(objetoPrevio);
  } catch (error) {
    console.warn('Content/índice: las operaciones no contestaron; se protege', objectRef, error instanceof Error ? error.name : 'error');
    operaciones = undefined;
  }
  const concesionId = deps.sortear();
  const duracion = Number.isFinite(deps.duracionDeConcesionMs) && (deps.duracionDeConcesionMs as number) > 0 ? deps.duracionDeConcesionMs as number : DURACION_DE_CONCESION_MS;

  return db.runTransaction(async (tx): Promise<DesenlaceDeReclamacion> => {
    const at = deps.ahora();
    const flag = await leerFlagEnTransaccion(tx, db);
    const snap = await tx.get(refDeObjeto(db, objectRef));
    const vivas = await tx.get(filasVivasDe(db, objectRef, 1));
    if (!snap.exists) return { reclamado: false, motivo: 'sin_registro' };
    const o = snap.data() as MediaObject;
    if (!registroDelIndiceValido(deps.huella, o)) return { reclamado: false, motivo: 'ficha_invalida' };
    if (!flagAbiertaPara(flag.config, cuenta)) return { reclamado: false, motivo: 'flag_cerrada' };
    /*
     * FICHAS VIVAS POR CLAVE, DE CUALQUIER CUENTA (A-2, defensa en profundidad): una ficha viva que apunta al objeto es un
     * uso aunque no tenga fila (heredada del camino de siempre, o contradictoria). Sin esta lectura, un objeto que llegara a
     * candidato por error se borraba con la ficha viva de otra cuenta encima. Un límite alcanzado cuenta como uso.
     */
    const conLaClave = await tx.get(fichasConLaClave(db, o.objectKey));
    const fichasVivas = conLaClave.size >= LIMITE_DE_FICHAS_POR_CLAVE ? LIMITE_DE_FICHAS_POR_CLAVE
      : conLaClave.docs.filter((d) => (d.data() as AssetDoc).status !== 'deleted'
        && mismoObjeto((d.data() as AssetDoc).storageRef, referenciaDeAlmacenDe(o))).length;
    const decision = decidirBorradoFisico({
      objeto: o, cuenta, marcaDeCobertura: flag.marca, filasVivas: vivas.size + fichasVivas, operaciones, consumidores,
    }, politica, at);
    if (!decision.borrar) {
      if (o.estado === 'candidato' && o.pendiente?.motivo !== decision.motivo) {
        tx.set(refDeObjeto(db, objectRef), limpiar({ ...o, pendiente: { motivo: decision.motivo, en: at } }));
      }
      return { reclamado: false, motivo: decision.motivo };
    }
    const r = reclamar(o, { estado: o.estado, version: versionDe(o) }, {
      filasVivas: vivas.size, coberturaCompleta: coberturaVigente(o, flag.marca), concesion: { id: concesionId, hasta: at + duracion }, at,
    });
    if (!r.ok) return { reclamado: false, motivo: r.fallo };
    tx.set(refDeObjeto(db, objectRef), limpiar(r.siguiente));
    return {
      reclamado: true,
      concesionId,
      generacion: o.generacion as string,
      providerId: o.providerId,
      ref: referenciaDeAlmacenDe(o),
      esperado: { estado: 'borrando', version: versionDe(r.siguiente) },
    };
  });
};

/** T3 · CERRAR, solo con la concesión propia y la versión que dejó la reclamación. Si otro la tomó, no se cierra nada. */
export const cerrarBorrado = async (
  deps: DepsDelIndice,
  objectRef: string,
  cuenta: string,
  concesionId: string,
  esperado: EsperadoDelObjeto,
): Promise<boolean> =>
  deps.db.runTransaction(async (tx) => {
    const ref = refDeObjeto(deps.db, objectRef);
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const o = snap.data() as MediaObject;
    if (!registroEsDeLaCuenta(o, cuenta)) return false;
    const r = cerrar(o, esperado, { concesionId, at: deps.ahora() });
    if (!r.ok) return false;
    tx.set(ref, limpiar(r.siguiente));
    return true;
  });

/** Devolver a `candidato` con la concesión propia: 412, un fallo del proveedor, o un adaptador que no sabe borrar con generación. */
export const devolverBorrado = async (
  deps: DepsDelIndice,
  objectRef: string,
  cuenta: string,
  concesionId: string,
  esperado: EsperadoDelObjeto,
  motivo: string,
  contarIntento: boolean,
): Promise<boolean> =>
  deps.db.runTransaction(async (tx) => {
    const ref = refDeObjeto(deps.db, objectRef);
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const o = snap.data() as MediaObject;
    if (!registroEsDeLaCuenta(o, cuenta)) return false;
    const r = devolver(o, esperado, { concesionId, at: deps.ahora(), motivo, contarIntento });
    if (!r.ok) return false;
    tx.set(ref, limpiar(r.siguiente));
    return true;
  });

export type DesenlaceDeBorradoDelIndice =
  | { estado: 'borrado' }
  | { estado: 'ya_no_estaba' }
  | { estado: 'protegido'; motivo: string }
  | { estado: 'devuelto'; motivo: string }
  | { estado: 'reintentable'; motivo: string }
  | { estado: 'no_cerrado' };

const anotarFallo = (que: string, objectRef: string) => (error: unknown): boolean => {
  console.error(`Content/índice: ${que}`, objectRef, error instanceof Error ? error.name : 'error');
  return false;
};

/**
 * ¿LA CONCESIÓN QUE OBTUVE SIGUE SIENDO LA DEL REGISTRO? Lo mismo que exigen `cerrar` y `devolver` (estado, versión e `id`
 * de la concesión) más la caducidad, que hasta ahora solo miraba quien quería reclamar de nuevo. El almacén no sabe de
 * concesiones: quien la sostiene tiene que comprobarla justo antes de pedirle el borrado. Cualquier duda (lectura fallida,
 * registro incompleto, otra cuenta) es «no».
 */
const concesionSigueSiendoMia = async (
  deps: DepsDelIndice,
  objectRef: string,
  cuenta: string,
  concesionId: string,
  esperado: EsperadoDelObjeto,
): Promise<boolean> => {
  try {
    const snap = await refDeObjeto(deps.db, objectRef).get();
    if (!snap.exists) return false;
    const o = snap.data() as MediaObject;
    return registroEsDeLaCuenta(o, cuenta)
      && o.estado === esperado.estado
      && versionDe(o) === esperado.version
      && o.concesion?.id === concesionId
      && Number.isFinite(o.concesion.hasta) && o.concesion.hasta > deps.ahora();
  } catch (error) {
    anotarFallo('no se pudo confirmar la concesión; el objeto queda como estaba', objectRef)(error);
    return false;
  }
};

/**
 * EL BORRADO DE UN OBJETO, ENTERO: T2 → borrado con generación → T3. Lo usa la
 * retirada (D-A, sin gracia) y lo puede usar el barrido. Ante cualquier duda el
 * objeto se queda, con su motivo, y no se afirma que se borró: solo un cierre
 * con la concesión propia dice `borrado`.
 */
export const completarBorrado = async (
  deps: DepsDelIndice,
  objectRef: string,
  cuenta: string,
  politica: PoliticaDeBorradoFisico,
): Promise<DesenlaceDeBorradoDelIndice> => {
  let r: DesenlaceDeReclamacion;
  try {
    r = await reclamarParaBorrar(deps, objectRef, cuenta, politica);
  } catch (error) {
    anotarFallo('no se pudo reclamar el objeto; queda como estaba', objectRef)(error);
    return { estado: 'protegido', motivo: 'reclamacion_fallida' };
  }
  if (!r.reclamado) return { estado: 'protegido', motivo: r.motivo };

  const puerto = deps.almacenes[r.providerId];
  if (!puerto || !sabeBorrarConGeneracion(puerto)) {
    await devolverBorrado(deps, objectRef, cuenta, r.concesionId, r.esperado, 'precondicion_no_soportada', false)
      .catch(anotarFallo('no se pudo devolver el objeto a candidato', objectRef));
    return { estado: 'devuelto', motivo: 'precondicion_no_soportada' };
  }
  /*
   * Entre reclamar y pedir el borrado puede pasar más que la concesión: una pausa larga, o un recuperador que ya reclamó de
   * nuevo. Una concesión caducada, superada o que no se puede leer no autoriza el borrado: no se toca ni el almacén ni el
   * registro, y el objeto queda pendiente para quien tenga la concesión o para la recuperación posterior.
   */
  if (!(await concesionSigueSiendoMia(deps, objectRef, cuenta, r.concesionId, r.esperado))) {
    return { estado: 'protegido', motivo: 'concesion_perdida' };
  }
  let d: DesenlaceDeBorrado;
  try {
    d = await puerto.borrar(r.ref, { generacion: r.generacion });
  } catch {
    d = { ok: false, error: falloDeAlmacen(r.providerId, 'proveedor_no_disponible') };
  }
  if (d.ok) {
    const cerrado = await cerrarBorrado(deps, objectRef, cuenta, r.concesionId, r.esperado)
      .catch(anotarFallo('los bytes se borraron y el registro no se pudo cerrar; lo cerrará el barrido', objectRef));
    if (!cerrado) return { estado: 'no_cerrado' };
    return d.yaNoEstaba ? { estado: 'ya_no_estaba' } : { estado: 'borrado' };
  }
  if (esPrecondicionFallida(d)) {
    await devolverBorrado(deps, objectRef, cuenta, r.concesionId, r.esperado, 'generacion_distinta', false)
      .catch(anotarFallo('no se pudo devolver el objeto tras un 412', objectRef));
    return { estado: 'devuelto', motivo: 'generacion_distinta' };
  }
  await devolverBorrado(deps, objectRef, cuenta, r.concesionId, r.esperado, 'error_transitorio', true)
    .catch(anotarFallo('no se pudo anotar el intento fallido', objectRef));
  return { estado: 'reintentable', motivo: 'error_transitorio' };
};

/* ── 9 · Retirar con cerrojo: T1, y después el borrado de cada objeto libre ── */

export type ResultadoDeRetiradaConIndice =
  | { status: 'retirado'; asset: AssetDoc; objetosBorrados: number; pendientes: number; motivos: Readonly<Record<string, number>> }
  | { status: 'ya_retirado'; objetosBorrados?: number; pendientes?: number; motivos?: Readonly<Record<string, number>> }
  | { status: 'no_es_tuyo' }
  | { status: 'no_existe' };

const objetosDeLaFicha = (f: Pick<AssetDoc, 'storageRef' | 'variants'>): StorageRef[] =>
  [f.storageRef, ...(f.variants ?? []).map((v) => v.storageRef)].filter((r): r is StorageRef => esStorageRef(r));

const sumar = (m: Record<string, number>, k: string): void => { m[k] = (m[k] ?? 0) + 1; };

/**
 * REANUDAR UN BORRADO A MEDIAS. Repetir una retirada ya hecha no retira nada más, pero si la ficha dice que queda algo
 * por borrar (`pendingPhysicalDeletion`), completa esos objetos con el MISMO borrado que usa la retirada: `completarBorrado`
 * reclama con la decisión de MC-5, borra con la generación registrada y cierra con la concesión propia. Así no aparece
 * ninguna regla nueva: lo que protege la decisión protege aquí igual, y una caída o una incertidumbre deja el objeto
 * pendiente, nunca borrado. Un `borrando` cuya concesión caducó se vuelve a reclamar; uno con la concesión vigente lo lleva
 * otro recuperador, y cuenta como pendiente. Lo que no entra en el índice sigue pendiente, como en la retirada.
 */
const reanudarBorradoPendiente = async (
  deps: DepsDelIndice,
  cuenta: string,
  assetId: string,
  asset: AssetDoc,
): Promise<ResultadoDeRetiradaConIndice> => {
  const db = deps.db;
  const motivos: Record<string, number> = {};
  let pendientes = 0;
  let objetosBorrados = 0;
  const borrados: string[] = [];
  const objetos = [...new Set(filasEsperadasDeLaFicha(deps.huella, asset, deps.indexable).map((e) => e.objectRef))];
  for (const objectRef of objetos) {
    const reg = await refDeObjeto(db, objectRef).get();
    if (!reg.exists) {
      pendientes++;
      sumar(motivos, 'sin_registro');
      continue;
    }
    if ((reg.data() as MediaObject).estado === 'borrado') {
      objetosBorrados++;
      continue;
    }
    const fin = await completarBorrado(deps, objectRef, cuenta, POLITICA_DEL_BORRADO_INMEDIATO);
    if (fin.estado === 'borrado' || fin.estado === 'ya_no_estaba') {
      objetosBorrados++;
      borrados.push(objectRef);
      continue;
    }
    pendientes++;
    sumar(motivos, 'motivo' in fin ? fin.motivo : fin.estado);
  }
  const noIndexables = objetosDeLaFicha(asset).filter((r) => !deps.indexable(r, cuenta)).length;
  if (noIndexables > 0) {
    pendientes += noIndexables;
    motivos.fuera_del_indice = noIndexables;
  }
  for (const objectRef of borrados) {
    await revisarMarcasDeOtrasFichas(deps, objectRef, cuenta, assetId)
      .catch(anotarFallo('no se pudo revisar la marca de las demás fichas', objectRef));
  }
  if (pendientes === 0) {
    await db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).doc(assetId).set({ pendingPhysicalDeletion: false }, { merge: true })
      .catch(anotarFallo('no se pudo bajar la marca de pendiente', assetId));
  }
  if (Object.keys(motivos).length) console.warn('Content/índice: reanudación con objetos pendientes', assetId, JSON.stringify(motivos));
  return { status: 'ya_retirado', objetosBorrados, pendientes, motivos: Object.freeze({ ...motivos }) };
};

/**
 * RETIRAR UN MATERIAL CON EL ÍNDICE (D-A: borrado inmediato con el mismo cerrojo).
 *
 *   T1  la ficha queda `deleted` (completa, con `merge`), sus filas pasan a
 *       `viva: false` y cada objeto sin otra fila viva —ni otra ficha viva con
 *       la misma clave— pasa a `candidato`.
 *   T2  cada candidato se reclama si la decisión lo permite (cobertura,
 *       consumidores, operaciones, generación…).
 *   ·   el almacén borra con la generación registrada como precondición.
 *   T3  se cierra con la concesión propia.
 *
 * Si cualquier paso falla o hay incertidumbre, el objeto se queda con su
 * motivo y el material sigue retirado de la biblioteca (D-G). Lo que no entra
 * en el índice (otro proveedor, otra carpeta) se retira de la ficha y queda
 * pendiente, como siempre.
 */
export const retirarConIndice = async (
  deps: DepsDelIndice,
  accountId: string,
  assetId: string,
): Promise<ResultadoDeRetiradaConIndice> => {
  const db = deps.db;
  if (typeof assetId !== 'string' || !/^asset_[a-f0-9]{32}$/.test(assetId)) return { status: 'no_existe' };
  const fichaRef = db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).doc(assetId);

  type Lectura = { objectRef: string; propias: FilaEsperada[]; registro?: MediaObject; otras: number };
  const t1 = await db.runTransaction(async (tx) => {
    const at = deps.ahora();
    const snap = await tx.get(fichaRef);
    if (!snap.exists) return { status: 'no_existe' as const };
    const doc = snap.data() as AssetDoc;
    if (!materialEsDeLaCuenta(doc, accountId)) return { status: 'no_es_tuyo' as const };
    const decision = retirar(doc, at);
    /* Ya retirado: si la ficha dice que queda algo por borrar, se reanuda ese borrado (ver `reanudarBorradoPendiente`). */
    if (!decision) return doc.pendingPhysicalDeletion === true ? { status: 'ya_retirado' as const, reanudar: doc } : { status: 'ya_retirado' as const };

    const esperadas = filasEsperadasDeLaFicha(deps.huella, doc, deps.indexable);
    const porObjeto = new Map<string, FilaEsperada[]>();
    for (const e of esperadas) porObjeto.set(e.objectRef, [...(porObjeto.get(e.objectRef) ?? []), e]);

    const lecturas: (Lectura & { previas: Map<string, FilaDeReferencia> })[] = [];
    for (const [objectRef, propias] of porObjeto) {
      const reg = await tx.get(refDeObjeto(db, objectRef));
      const vivas = await tx.get(filasVivasDe(db, objectRef, propias.length + 1));
      const conLaClave = await tx.get(fichasConLaClave(db, propias[0].ref.objectKey));
      const previas = new Map<string, FilaDeReferencia>();
      for (const p of propias) {
        const f = await tx.get(refDeFila(db, objectRef, p.refId));
        if (f.exists) previas.set(p.refId, f.data() as FilaDeReferencia);
      }
      const mias = new Set(propias.map((p) => p.refId));
      const otrasFilas = vivas.docs.filter((d) => !mias.has(d.id)).length;
      /* Las fichas vivas con la misma clave que todavía no tienen fila (heredadas): también son un uso. */
      const otrasFichas = conLaClave.size >= LIMITE_DE_FICHAS_POR_CLAVE ? 1 : conLaClave.docs.filter((d) => d.id !== assetId
        && (d.data() as AssetDoc).status !== 'deleted' && mismoObjeto((d.data() as AssetDoc).storageRef, propias[0].ref)).length;
      lecturas.push({
        objectRef, propias, previas, otras: otrasFilas + otrasFichas,
        ...(reg.exists ? { registro: reg.data() as MediaObject } : {}),
      });
    }

    const hayQueBorrar = decision.borrar.length > 0;
    const retirado = limpiar({ ...doc, ...decision.asset, delivery: undefined, pendingPhysicalDeletion: hayQueBorrar ? true : undefined }) as AssetDoc;
    tx.set(fichaRef, { ...retirado, delivery: FieldValue.delete() }, { merge: true });
    for (const l of lecturas) {
      for (const p of l.propias) {
        tx.set(refDeFila(db, l.objectRef, p.refId), { ...(l.previas.get(p.refId) ?? filaNueva(p, false, at)), viva: false, actualizadoAt: at });
      }
      if (l.registro && l.otras === 0 && l.registro.estado === 'guardado' && registroEsDeLaCuenta(l.registro, accountId)) {
        const r = pasarACandidato(l.registro, { estado: 'guardado', version: versionDe(l.registro) }, { filasVivas: 0, at, motivo: 'retirada' });
        if (r.ok) {
          tx.set(refDeObjeto(db, l.objectRef), limpiar(r.siguiente));
          l.registro = r.siguiente;
        }
      }
    }
    return {
      status: 'retirado' as const,
      retirado,
      hayQueBorrar,
      noIndexables: objetosDeLaFicha(doc).filter((r) => !deps.indexable(r, accountId)).length,
      lecturas: lecturas.map(({ objectRef, propias, registro, otras }): Lectura => ({ objectRef, propias, registro, otras })),
    };
  });
  if (t1.status === 'ya_retirado' && 'reanudar' in t1 && t1.reanudar) return reanudarBorradoPendiente(deps, accountId, assetId, t1.reanudar);
  if (t1.status !== 'retirado') return t1;

  const motivos: Record<string, number> = {};
  let pendientes = t1.noIndexables;
  if (t1.noIndexables > 0) motivos.fuera_del_indice = t1.noIndexables;
  let objetosBorrados = 0;
  const borrados: string[] = [];
  for (const l of t1.lecturas) {
    if (l.otras > 0) { pendientes++; sumar(motivos, 'referenciado'); continue; }
    if (!l.registro) { pendientes++; sumar(motivos, 'sin_registro'); continue; }
    if (l.registro.estado === 'borrado') { objetosBorrados++; continue; }
    const fin = await completarBorrado(deps, l.objectRef, accountId, POLITICA_DEL_BORRADO_INMEDIATO);
    if (fin.estado === 'borrado' || fin.estado === 'ya_no_estaba') {
      objetosBorrados++;
      borrados.push(l.objectRef);
      continue;
    }
    pendientes++;
    sumar(motivos, 'motivo' in fin ? fin.motivo : fin.estado);
  }

  if (t1.hayQueBorrar) {
    await fichaRef.set({ pendingPhysicalDeletion: pendientes > 0 }, { merge: true })
      .catch(anotarFallo('no se pudo actualizar la marca de pendiente', assetId));
  }
  for (const objectRef of borrados) {
    await revisarMarcasDeOtrasFichas(deps, objectRef, accountId, assetId)
      .catch(anotarFallo('no se pudo revisar la marca de las demás fichas', objectRef));
  }
  if (Object.keys(motivos).length) console.warn('Content/índice: retirada con objetos pendientes', assetId, JSON.stringify(motivos));
  const asset = limpiar({ ...t1.retirado, pendingPhysicalDeletion: pendientes > 0 ? true : undefined }) as AssetDoc;
  return { status: 'retirado', asset, objetosBorrados, pendientes, motivos: Object.freeze({ ...motivos }) };
};

/**
 * Cuando un objeto se borra de verdad, las demás fichas RETIRADAS de la cuenta
 * que lo usaban (sus filas apagadas lo dicen) dejan de estar pendientes si ya no
 * les queda nada por borrar: todos sus objetos del índice `borrado`, y ninguno
 * fuera del índice. Lo mismo que hacía la retirada de siempre, sin releer la cuenta.
 */
const revisarMarcasDeOtrasFichas = async (deps: DepsDelIndice, objectRef: string, cuenta: string, excepto: string): Promise<void> => {
  const db = deps.db;
  const filas = await refDeObjeto(db, objectRef).collection(SUBCOLECCION_DE_REFERENCIAS).limit(LIMITE_DE_FILAS_DE_UN_OBJETO).get();
  const ids = [...new Set(filas.docs.map((d) => d.data() as FilaDeReferencia)
    .filter((f) => f.ownerAccountId === cuenta && f.assetId !== excepto && FORMA_DE_ID_DE_MATERIAL.test(f.assetId)).map((f) => f.assetId))];
  for (const id of ids) {
    const snap = await db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).doc(id).get();
    const d = snap.exists ? (snap.data() as AssetDoc) : undefined;
    if (!d || d.ownerAccountId !== cuenta || d.status !== 'deleted' || d.pendingPhysicalDeletion !== true) continue;
    if (objetosDeLaFicha(d).some((r) => !deps.indexable(r, cuenta))) continue;
    const refs = [...new Set(filasEsperadasDeLaFicha(deps.huella, d, deps.indexable).map((e) => e.objectRef))];
    const estados = await Promise.all(refs.map(async (r) => {
      const s = await refDeObjeto(db, r).get();
      return s.exists ? (s.data() as MediaObject).estado : undefined;
    }));
    if (estados.every((e) => e === 'borrado')) await db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).doc(id).set({ pendingPhysicalDeletion: false }, { merge: true });
  }
};

/* ── 10 · Lo que el barrido MC-5 necesita del índice ───────────────────────── */

/**
 * LAS REFERENCIAS DE UN OBJETO PARA MC-5: sus filas vivas (basta saber si hay
 * alguna: la pregunta exacta lleva tope 1), o `undefined` si la cobertura no
 * vale — que es el contrato de MC-5 para «no se sabe», y protege.
 */
export const referenciasParaElBarrido = async (
  deps: Pick<DepsDelIndice, 'db'>,
  objeto: MediaObject,
): Promise<readonly { clase: FilaDeReferencia['clase']; assetId: string; viva: boolean }[] | undefined> => {
  const flag = await leerFlagDelAlmacen(deps.db);
  if (!flagAbiertaPara(flag.config, objeto.accountId) || !coberturaVigente(objeto, flag.marca)) return undefined;
  const vivas = await filasVivasDe(deps.db, objeto.objectRef, 1).get();
  return vivas.docs.map((d) => {
    const f = d.data() as FilaDeReferencia;
    return { clase: f.clase, assetId: f.assetId, viva: f.viva === true };
  });
};

/** Los objetos que el barrido mira: los del cerrojo (`borrando` primero, luego `candidato`), por lotes y con cursor estable. */
export const objetosParaElBarrido = async (
  deps: Pick<DepsDelIndice, 'db'>,
  cursor: string | undefined,
  limite: number,
): Promise<{ objetos: readonly MediaObject[]; cursor?: string }> => {
  const ORDEN = ['borrando', 'candidato'] as const;
  const [estadoDelCursor, ultimo] = typeof cursor === 'string' && cursor.includes(':') ? cursor.split(':', 2) : [ORDEN[0], ''];
  let i = Math.max(0, ORDEN.indexOf(estadoDelCursor as typeof ORDEN[number]));
  let desde = ultimo;
  const salida: MediaObject[] = [];
  while (i < ORDEN.length && salida.length < limite) {
    const falta = limite - salida.length;
    let q = objetosDelIndice(deps.db).where('estado', '==', ORDEN[i]).orderBy(FieldPath.documentId()).limit(falta);
    if (desde) q = q.startAfter(desde);
    const lote = await q.get();
    for (const d of lote.docs) salida.push(d.data() as MediaObject);
    if (lote.size === falta) return { objetos: salida, cursor: `${ORDEN[i]}:${lote.docs[lote.size - 1].id}` };
    i++;
    desde = '';
  }
  return { objetos: salida };
};
