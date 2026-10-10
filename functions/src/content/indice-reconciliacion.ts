import { FieldPath } from 'firebase-admin/firestore';
import {
  Asset,
  FilaDeReferencia,
  FilaEsperada,
  HallazgoDelIndice,
  InformeDelIndice,
  MarcaDelObjeto,
  MediaObject,
  ObjetoDelIndiceParaReconciliar,
  POLITICA_DE_RECOLECCION,
  ReparacionDelIndice,
  StorageRef,
  comoCrearFilaViva,
  coberturaVigente,
  filasEsperadasDeLaFicha,
  flagAbiertaPara,
  pasarACandidato,
  reconciliarIndiceDeCuenta,
  referenciaDeAlmacenDe,
  registroDelIndiceValido,
  registroEsDeLaCuenta,
  rescatar,
  versionDe,
} from '../core';
import {
  COLECCION_DE_MATERIALES_DEL_INDICE,
  DepsDelIndice,
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

/**
 * H5/H2 · MC-9 EXTENDIDO: LA RECONCILIACIÓN DEL ÍNDICE, EJECUTADA.
 *
 * Una cuenta por pasada: lee sus fichas, sus registros de objeto y las filas de
 * cada objeto, mira el almacén, cruza todo con `reconciliarIndiceDeCuenta` (la
 * decisión pura, en `core/media/reconciliacion.ts`) y repara lo que se puede
 * reparar sin borrar nada.
 *
 * ── Lo que escribe, y lo que NO ─────────────────────────────────────────────
 *
 * Escribe filas (crear, apagar), registros de objeto que faltaban, marcas y
 * transiciones del cerrojo que el Core permite (`candidato` y su rescate). Al
 * final de una pasada COMPLETA marca la cobertura de los objetos que la
 * superaron. NO borra: ni bytes, ni fichas, ni filas, ni registros. El único que
 * borra sigue siendo MC-5, con el cerrojo y la política de siempre.
 *
 * Con esto se completan las retiradas interrumpidas (D-B): una fila viva de una
 * ficha ya retirada se apaga y el objeto queda `candidato` para que decida MC-5.
 *
 * Lee TODAS las fichas de UNA cuenta, y es a propósito: es una pasada
 * programada y amortizada, no la operación de una persona. Solo pide los campos
 * que necesita: el contenido de un texto no se lee.
 */

export interface OpcionesDeReconciliacionDelIndice {
  porPagina?: number;
  maxPaginas?: number;
  /** Edad mínima de un huérfano antes de proponerlo. Por defecto, la de MC-5 (siete días). */
  graciaDeHuerfanoMs?: number;
  /** `false`: solo informa. Para la verificación y la sombra de la migración. */
  reparar?: boolean;
}

export interface InformeDeReconciliacionEnFirestore extends InformeDelIndice {
  reparadas: Readonly<Record<string, number>>;
  coberturasMarcadas: number;
  erroresDeReparacion: number;
  fichasLeidas: number;
}

const CAMPOS_DE_LA_FICHA = ['assetId', 'ownerAccountId', 'status', 'storageRef', 'variants', 'previousVersionId'] as const;

/** Leer una colección de la cuenta entera, por páginas con cursor estable. Si se acaban las páginas, NO se vio todo. */
const leerPorPaginas = async <T>(
  consulta: (cursor: string | undefined, limite: number) => Promise<{ docs: { id: string; data: () => unknown }[] }>,
  porPagina: number,
  maxPaginas: number,
  convertir: (id: string, data: unknown) => T,
): Promise<{ items: T[]; completo: boolean }> => {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    const lote = await consulta(cursor, porPagina);
    for (const d of lote.docs) items.push(convertir(d.id, d.data()));
    if (lote.docs.length < porPagina) return { items, completo: true };
    cursor = lote.docs[lote.docs.length - 1].id;
  }
  return { items, completo: false };
};

/**
 * PASAR UNA VEZ POR UNA CUENTA. Nunca borra. Lo que no se pudo leer no se da
 * por verificado, y un objeto sin verificar sigue sin cobertura: protegido.
 */
export const reconciliarIndiceDeCuentaEnFirestore = async (
  deps: DepsDelIndice,
  accountId: string,
  opciones: OpcionesDeReconciliacionDelIndice = {},
): Promise<InformeDeReconciliacionEnFirestore | undefined> => {
  const db = deps.db;
  const inicio = deps.ahora();
  const porPagina = Math.max(1, Math.min(500, Math.floor(opciones.porPagina ?? 200)));
  const maxPaginas = Math.max(1, Math.min(10_000, Math.floor(opciones.maxPaginas ?? 200)));
  const gracia = Number.isFinite(opciones.graciaDeHuerfanoMs) && (opciones.graciaDeHuerfanoMs as number) >= 0
    ? opciones.graciaDeHuerfanoMs as number
    : POLITICA_DE_RECOLECCION.edadMinimaMs;

  const fichas = await leerPorPaginas<Asset>(async (cursor, limite) => {
    let q = db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).where('ownerAccountId', '==', accountId)
      .orderBy(FieldPath.documentId()).select(...CAMPOS_DE_LA_FICHA).limit(limite);
    if (cursor) q = q.startAfter(cursor);
    return q.get();
  }, porPagina, maxPaginas, (id, data) => ({ ...(data as Asset), assetId: id }));

  const registros = await leerPorPaginas<MediaObject>(async (cursor, limite) => {
    let q = objetosDelIndice(db).where('accountId', '==', accountId).orderBy(FieldPath.documentId()).limit(limite);
    if (cursor) q = q.startAfter(cursor);
    return q.get();
  }, porPagina, maxPaginas, (_id, data) => data as MediaObject);

  const esperadas: FilaEsperada[] = fichas.items.flatMap((f) => filasEsperadasDeLaFicha(deps.huella, f, deps.indexable));
  const estadoDeFichas: Record<string, 'viva' | 'retirada'> = Object.fromEntries(
    fichas.items.map((f) => [f.assetId, f.status === 'deleted' ? 'retirada' as const : 'viva' as const]),
  );
  const porRef = new Map<string, MediaObject>();
  for (const r of registros.items) if (r && typeof r.objectRef === 'string') porRef.set(r.objectRef, r);
  const refsDeEsperadas = new Map<string, StorageRef>();
  for (const e of esperadas) if (!refsDeEsperadas.has(e.objectRef)) refsDeEsperadas.set(e.objectRef, e.ref);

  const objetos: ObjetoDelIndiceParaReconciliar[] = [];
  for (const objectRef of new Set([...refsDeEsperadas.keys(), ...porRef.keys()])) {
    const registro = porRef.get(objectRef);
    let filas: FilaDeReferencia[] = [];
    let filasCompletas = false;
    try {
      const s = await refDeObjeto(db, objectRef).collection(SUBCOLECCION_DE_REFERENCIAS).limit(LIMITE_DE_FILAS_DE_UN_OBJETO + 1).get();
      filasCompletas = s.size <= LIMITE_DE_FILAS_DE_UN_OBJETO;
      filas = s.docs.slice(0, LIMITE_DE_FILAS_DE_UN_OBJETO).map((d) => d.data() as FilaDeReferencia);
    } catch (error) {
      console.warn('Content/índice: las filas de un objeto no se pudieron leer', objectRef, error instanceof Error ? error.name : 'error');
    }
    const ref = registro && registroEsDeLaCuenta(registro, accountId) ? referenciaDeAlmacenDe(registro) : refsDeEsperadas.get(objectRef);
    let fisico: ObjetoDelIndiceParaReconciliar['fisico'];
    const puerto = ref ? deps.almacenes[ref.provider] : undefined;
    if (ref && puerto) {
      const m = await puerto.mirar(ref);
      fisico = m.ok ? { existe: true, ...(m.objeto.generacion ? { generacion: m.objeto.generacion } : {}) } : m.motivo === 'no_existe' ? { existe: false } : undefined;
    }
    let referenciasAjenas: number | undefined;
    if (ref) {
      try {
        const s = await fichasConLaClave(db, ref.objectKey).get();
        referenciasAjenas = s.size >= LIMITE_DE_FICHAS_POR_CLAVE ? undefined : s.docs.filter((d) => {
          const f = d.data() as Asset;
          return f.ownerAccountId !== accountId && f.status !== 'deleted' && mismoObjeto(f.storageRef, ref);
        }).length;
      } catch (error) {
        console.warn('Content/índice: no se pudo preguntar por fichas de otras cuentas', objectRef, error instanceof Error ? error.name : 'error');
      }
    }
    objetos.push({ objectRef, registro, filas, filasCompletas, fisico, referenciasAjenas });
  }

  const flag = await leerFlagDelAlmacen(db);
  const marca = flagAbiertaPara(flag.config, accountId) ? flag.marca : undefined;
  const informe = reconciliarIndiceDeCuenta({
    accountId,
    esperadas,
    estadoDeFichas,
    objetos,
    completo: fichas.completo && registros.completo,
    marcaDeCobertura: marca,
    graciaDeHuerfanoMs: gracia,
  }, deps.ahora());
  if (!informe) return undefined;

  const reparadas: Record<string, number> = {};
  let erroresDeReparacion = 0;
  let coberturasMarcadas = 0;
  if (opciones.reparar !== false) {
    const fisicos = new Map(objetos.map((o) => [o.objectRef, o.fisico]));
    for (const h of informe.hallazgos) {
      if (h.reparacion === 'ninguna') continue;
      try {
        const hecho = await reparar(deps, accountId, h, fisicos.get(h.objectRef), esperadas);
        if (hecho) reparadas[h.reparacion] = (reparadas[h.reparacion] ?? 0) + 1;
      } catch (error) {
        erroresDeReparacion++;
        console.error('Content/índice: una reparación falló; se reintenta en la siguiente pasada', h.clase, h.objectRef, error instanceof Error ? error.name : 'error');
      }
    }
    for (const objectRef of informe.coberturaVerificable) {
      const vivas = new Set(esperadas.filter((e) => e.objectRef === objectRef && e.viva).map((e) => e.refId));
      try {
        if (await marcarCoberturaDelObjeto(deps, objectRef, accountId, vivas, inicio)) coberturasMarcadas++;
      } catch (error) {
        erroresDeReparacion++;
        console.error('Content/índice: la cobertura no se pudo marcar', objectRef, error instanceof Error ? error.name : 'error');
      }
    }
  }

  return {
    ...informe,
    reparadas: Object.freeze({ ...reparadas }),
    coberturasMarcadas,
    erroresDeReparacion,
    fichasLeidas: fichas.items.length,
  };
};

/**
 * UNA REPARACIÓN, EN SU TRANSACCIÓN. Antes de escribir se vuelve a comprobar lo
 * que hizo falta para clasificar: si algo cambió entre medias, no se toca nada y
 * la siguiente pasada lo vuelve a mirar. Devuelve si escribió.
 */
const reparar = async (
  deps: DepsDelIndice,
  cuenta: string,
  h: HallazgoDelIndice,
  fisico: ObjetoDelIndiceParaReconciliar['fisico'],
  esperadas: readonly FilaEsperada[],
): Promise<boolean> => {
  const db = deps.db;
  const reg = refDeObjeto(db, h.objectRef);
  const tipo: ReparacionDelIndice = h.reparacion;

  if (tipo === 'marcar' && h.marca) {
    const marca: MarcaDelObjeto = h.marca;
    return db.runTransaction(async (tx) => {
      const s = await tx.get(reg);
      if (!s.exists) return false;
      const o = s.data() as MediaObject;
      if (!registroEsDeLaCuenta(o, cuenta) || (o.marcas ?? []).includes(marca)) return false;
      tx.set(reg, limpiar({ ...o, marcas: [...(o.marcas ?? []), marca], updatedAt: deps.ahora() }));
      return true;
    });
  }

  if (tipo === 'marcar_ficha' && h.assetId) {
    const ficha = db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).doc(h.assetId);
    return db.runTransaction(async (tx) => {
      const s = await tx.get(ficha);
      const f = s.exists ? (s.data() as Asset) : undefined;
      if (!f || f.ownerAccountId !== cuenta || f.status === 'deleted') return false;
      tx.set(ficha, { indiceDatosIncompletos: true, indiceDatosIncompletosEn: deps.ahora() }, { merge: true });
      return true;
    });
  }

  if (tipo === 'crear_fila' && h.assetId && h.refId) {
    const fichaRef = db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).doc(h.assetId);
    return db.runTransaction(async (tx) => {
      const at = deps.ahora();
      const s = await tx.get(fichaRef);
      const f = s.exists ? ({ ...(s.data() as Asset), assetId: h.assetId as string }) : undefined;
      if (!f || f.ownerAccountId !== cuenta || f.status === 'deleted') return false;
      const e = filasEsperadasDeLaFicha(deps.huella, f, deps.indexable).find((x) => x.objectRef === h.objectRef && x.refId === h.refId && x.viva);
      if (!e) return false;
      const filaSnap = await tx.get(refDeFila(db, e.objectRef, e.refId));
      const previa = filaSnap.exists ? (filaSnap.data() as FilaDeReferencia) : undefined;
      if (previa?.viva === true) return false;
      const rs = await tx.get(reg);
      const o = rs.exists ? (rs.data() as MediaObject) : undefined;
      if (o && !registroEsDeLaCuenta(o, cuenta)) return false;
      const como = comoCrearFilaViva(o);
      if (como === 'no') return false;
      let siguiente: MediaObject | undefined;
      if (como === 'rescatar') {
        const r = rescatar(o, { estado: 'candidato', version: versionDe(o) }, { presente: fisico?.existe === true, generacionObservada: fisico?.generacion, at });
        if (!r.ok) return false;
        siguiente = r.siguiente;
      } else if (como === 'crear_registro') {
        /* Nace sin cobertura: la verifica esta misma pasada, al final, si todo cuadra. */
        siguiente = registroNuevo(e, fisico ? { existe: fisico.existe, ...(fisico.generacion ? { generacion: fisico.generacion } : {}) } : undefined, undefined, at);
        if (!registroDelIndiceValido(deps.huella, siguiente)) return false;
      }
      tx.set(refDeFila(db, e.objectRef, e.refId), { ...filaNueva(e, true, at, previa?.desdeAt), viva: true });
      if (siguiente) tx.set(reg, limpiar(siguiente));
      return true;
    });
  }

  if (tipo === 'apagar_fila' && h.assetId && h.refId) {
    const fichaRef = db.collection(COLECCION_DE_MATERIALES_DEL_INDICE).doc(h.assetId);
    const filaRef = refDeFila(db, h.objectRef, h.refId);
    return db.runTransaction(async (tx) => {
      const at = deps.ahora();
      const filaSnap = await tx.get(filaRef);
      const fs = await tx.get(fichaRef);
      const rs = await tx.get(reg);
      const vivas = await tx.get(filasVivasDe(db, h.objectRef, 2));
      const fila = filaSnap.exists ? (filaSnap.data() as FilaDeReferencia) : undefined;
      if (!fila || fila.viva !== true || fila.ownerAccountId !== cuenta) return false;
      const f = fs.exists ? ({ ...(fs.data() as Asset), assetId: h.assetId as string }) : undefined;
      /* Si la ficha está viva, es de la cuenta y todavía exige esta fila, la fila no es huérfana: no se toca. */
      if (f && f.ownerAccountId === cuenta && f.status !== 'deleted'
        && filasEsperadasDeLaFicha(deps.huella, f, deps.indexable).some((x) => x.objectRef === h.objectRef && x.refId === h.refId && x.viva)) return false;
      tx.set(filaRef, { ...fila, viva: false, actualizadoAt: at });
      const o = rs.exists ? (rs.data() as MediaObject) : undefined;
      const otras = vivas.docs.filter((d) => d.id !== h.refId).length;
      if (o && registroEsDeLaCuenta(o, cuenta) && o.estado === 'guardado' && otras === 0) {
        const motivo = !f || f.status === 'deleted' ? 'retirada_interrumpida' : 'sin_referencias';
        const r = pasarACandidato(o, { estado: 'guardado', version: versionDe(o) }, { filasVivas: 0, at, motivo });
        if (r.ok) tx.set(reg, limpiar(r.siguiente));
      }
      return true;
    });
  }

  if (tipo === 'a_candidato') {
    return db.runTransaction(async (tx) => {
      const at = deps.ahora();
      const flag = await leerFlagEnTransaccion(tx, db);
      const rs = await tx.get(reg);
      const vivas = await tx.get(filasVivasDe(db, h.objectRef, 1));
      const o = rs.exists ? (rs.data() as MediaObject) : undefined;
      if (!o || !registroEsDeLaCuenta(o, cuenta) || o.estado !== 'guardado' || !vivas.empty) return false;
      if (!flagAbiertaPara(flag.config, cuenta) || !coberturaVigente(o, flag.marca)) return false;
      /* Ninguna ficha viva lo exige: la pasada lo vio así, y aquí se vuelve a mirar por las que pudieron llegar. */
      if (esperadas.some((e) => e.objectRef === h.objectRef && e.viva)) return false;
      const r = pasarACandidato(o, { estado: 'guardado', version: versionDe(o) }, { filasVivas: 0, at, motivo: 'huerfano' });
      if (!r.ok) return false;
      tx.set(reg, limpiar(r.siguiente));
      return true;
    });
  }

  if (tipo === 'rescatar') {
    return db.runTransaction(async (tx) => {
      const at = deps.ahora();
      const rs = await tx.get(reg);
      const o = rs.exists ? (rs.data() as MediaObject) : undefined;
      if (!o || !registroEsDeLaCuenta(o, cuenta) || o.estado !== 'candidato') return false;
      const r = rescatar(o, { estado: 'candidato', version: versionDe(o) }, { presente: fisico?.existe === true, generacionObservada: fisico?.generacion, at });
      if (!r.ok) return false;
      tx.set(reg, limpiar(r.siguiente));
      return true;
    });
  }
  return false;
};

/**
 * DAR POR COMPLETA LA COBERTURA DE UN OBJETO. Solo si, DENTRO de la
 * transacción: la flag sigue abierta para la cuenta y su marca no es posterior
 * al inicio de la pasada (nadie la tocó mientras se miraba); el registro es de
 * la cuenta y no tiene marcas; y las filas vivas son EXACTAMENTE las que exigen
 * las fichas, todas de la cuenta y sin cortar la lectura.
 */
export const marcarCoberturaDelObjeto = async (
  deps: DepsDelIndice,
  objectRef: string,
  cuenta: string,
  vivasEsperadas: ReadonlySet<string>,
  inicioDeLaPasada: number,
): Promise<boolean> => {
  const db = deps.db;
  const reg = refDeObjeto(db, objectRef);
  return db.runTransaction(async (tx) => {
    const at = deps.ahora();
    const flag = await leerFlagEnTransaccion(tx, db);
    const rs = await tx.get(reg);
    const filas = await tx.get(reg.collection(SUBCOLECCION_DE_REFERENCIAS).limit(LIMITE_DE_FILAS_DE_UN_OBJETO + 1));
    if (!flagAbiertaPara(flag.config, cuenta) || flag.marca === undefined || flag.marca > inicioDeLaPasada) return false;
    const o = rs.exists ? (rs.data() as MediaObject) : undefined;
    if (!o || !registroEsDeLaCuenta(o, cuenta) || (o.marcas ?? []).length > 0) return false;
    if (o.estado === 'borrando' || o.estado === 'borrado') return false;
    if (filas.size > LIMITE_DE_FILAS_DE_UN_OBJETO) return false;
    const todas = filas.docs.map((d) => d.data() as FilaDeReferencia);
    if (todas.some((f) => f.ownerAccountId !== cuenta)) return false;
    const vivas = new Set(todas.filter((f) => f.viva === true).map((f) => f.refId));
    if (vivas.size !== vivasEsperadas.size || [...vivas].some((r) => !vivasEsperadas.has(r))) return false;
    if (coberturaVigente(o, flag.marca)) return false;
    tx.set(reg, limpiar({ ...o, cobertura: 'completa' as const, coberturaEn: at, coberturaOrigen: 'reconciliacion' as const }));
    return true;
  });
};
