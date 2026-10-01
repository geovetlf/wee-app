import { createHash } from 'crypto';
import { Firestore } from 'firebase-admin/firestore';
import { usageTransactionId } from '../credits/creditTransactions';
import { crearEscena, crearPlano, fijarResultadoVerificado, leerPlano } from '../shots';

/**
 * WEË FILMMAKER · F1-D — LA TOMA DE UN PLANO: QUIÉN ES, DE QUÉ ES Y DÓNDE ACABA.
 *
 * Una TOMA es un intento de generar un plano: la primera es la 1, y una nueva
 * solo nace porque la persona la pide —y es un cobro nuevo—. Todo lo que la
 * nombra se CALCULA, y lo calcula el servidor:
 *
 *     H          = los 32 primeros hexadecimales de sha256(cuenta|producción|unidad)
 *     requestId  = fm.<H>.<toma>          ← la operación: una toma, una reserva, un trabajo
 *     plano      = fm_<H>                  ← el `ShotNode` del Core donde queda el resultado
 *     escena     = fm_<sha256(escena|cuenta|producción|escena)>
 *
 * La unidad es la del requisito de F1-A: el plano, o la escena entera cuando no
 * tiene planos. La cuenta va dentro porque el espacio de `requestId` es de todo
 * Weë, y la toma va fuera porque es lo único que la persona decide.
 *
 * ── Lo que se lee, y por qué aquí ───────────────────────────────────────────
 *
 * La producción, CRUDA y de SOLO LECTURA: la raíz y el documento de la escena. El
 * dominio de F1-A no entra al servidor más que por `productions`, así que aquí no
 * se valida ni se traduce nada suyo: se comprueba que existe, que es de la cuenta,
 * que está en la revisión que la app dice, que la unidad está, y se resume su
 * contenido en una FIRMA. La firma es lo que permite saber después, sin guardar
 * nada nuevo, si el plano cambió mientras se generaba.
 *
 * Y las reservas del Credit Engine de las tomas anteriores, por su id: es la
 * verdad de si una toma sigue viva. No se escribe en ellas —las escribe el Credit
 * Engine— ni se decide nada de dinero aquí.
 *
 * ── El enlace ───────────────────────────────────────────────────────────────
 *
 * `enlazarToma` es la única forma de que un resultado llegue a un plano. La app
 * dice qué toma; el servidor comprueba que su reserva se cobró, que el material
 * es de la cuenta, está listo, es un vídeo y nació de ESA operación —su
 * procedencia lo dice, y la escribió el servidor—, y que el plano no cambió desde
 * que se pidió. Si cambió, no se enlaza: el vídeo sigue en las creaciones de la
 * cuenta y no se regenera ni se cobra nada.
 */

const COLECCION_DE_PRODUCCIONES = 'productions';
const COLECCION_DE_ESCENAS_DE_PRODUCCION = 'productionScenes';
const COLECCION_DE_RESERVAS = 'creditTransactions';
const COLECCION_DE_MATERIALES = 'assets';

/** Cuántas tomas puede tener un plano. Un tope para que buscar la última no sea un bucle. */
export const MAX_TOMAS = 50;

const FORMA_DE_ID = /^[A-Za-z0-9_-]{4,128}$/;
const FORMA_DE_PRODUCCION = /^[A-Za-z0-9_-]{20,128}$/;

const hex32 = (texto: string): string => createHash('sha256').update(texto, 'utf8').digest('hex').slice(0, 32);

/** La parte estable de una toma: la unidad de esa producción de esa cuenta. */
export const huellaDeUnidad = (accountId: string, productionId: string, unitId: string): string =>
  hex32(`${accountId}|${productionId}|${unitId}`);

export const requestIdDeToma = (accountId: string, productionId: string, unitId: string, toma: number): string =>
  `fm.${huellaDeUnidad(accountId, productionId, unitId)}.${toma}`;

export const idDeNodoDePlano = (accountId: string, productionId: string, unitId: string): string =>
  `fm_${huellaDeUnidad(accountId, productionId, unitId)}`;

export const idDeNodoDeEscena = (accountId: string, productionId: string, sceneId: string): string =>
  `fm_${hex32(`escena|${accountId}|${productionId}|${sceneId}`)}`;

/** Los nodos `fm_` son de Filmmaker y los escribe el servidor. Nadie los toca desde fuera. */
export const esNodoDeFilmmaker = (id: unknown): boolean => typeof id === 'string' && id.startsWith('fm_');

/* ── Lo que llega de la app ──────────────────────────────────────────────── */

export interface IdentidadDeToma {
  readonly productionId: string;
  readonly sceneId: string;
  readonly unitId: string;
  readonly toma: number;
}

export interface PeticionDeToma extends IdentidadDeToma {
  readonly revision: number;
}

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const entero = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined;

/** La identidad de una toma, con su forma. `null` si falta algo o no tiene forma. */
export const leerIdentidadDeToma = (crudo: unknown): IdentidadDeToma | null => {
  if (!esObj(crudo)) return null;
  const { productionId, sceneId, unitId } = crudo;
  const toma = entero(crudo.take, 1, MAX_TOMAS);
  if (typeof productionId !== 'string' || !FORMA_DE_PRODUCCION.test(productionId)) return null;
  if (typeof sceneId !== 'string' || !FORMA_DE_ID.test(sceneId)) return null;
  if (typeof unitId !== 'string' || !FORMA_DE_ID.test(unitId)) return null;
  if (toma === undefined) return null;
  return { productionId, sceneId, unitId, toma };
};

export const leerPeticionDeToma = (crudo: unknown): PeticionDeToma | null => {
  const identidad = leerIdentidadDeToma(crudo);
  const revision = esObj(crudo) ? entero(crudo.revision, 0, Number.MAX_SAFE_INTEGER) : undefined;
  return identidad && revision !== undefined ? { ...identidad, revision } : null;
};

/* ── La producción, cruda ─────────────────────────────────────────────────── */

/** Por qué no se puede generar ni enlazar una toma. Códigos: la frase la pone la app. */
export type MotivoDeToma =
  | 'take_invalid'
  | 'production_not_found'
  | 'production_archived'
  | 'production_changed'
  | 'unit_not_found'
  | 'take_in_flight'
  | 'take_out_of_order'
  | 'take_limit';

export interface UnidadEnLaProduccion {
  readonly revision: number;
  readonly firma: string;
  readonly orden: number;
  readonly ordenDeEscena: number;
  readonly narrativa?: string;
}

const canonico = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canonico);
  if (esObj(v)) return Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => [k, canonico(v[k])]));
  return v;
};

/**
 * LA FIRMA DE UNA UNIDAD: la producción SIN su contabilidad (revisión, horas,
 * estado) y el documento de SU escena. Cambia si cambia algo que puede cambiar
 * lo que el plano pide —la dirección, el formato, los personajes, su escena, él—
 * y no cambia cuando se edita otra escena.
 */
const firmaDe = (raiz: Record<string, unknown>, escena: Record<string, unknown>): string => {
  const { revision: _r, ...metadatos } = esObj(raiz.metadata) ? raiz.metadata : {};
  const { metadata: _m, updatedAt: _u, createdAt: _c, status: _s, archivedAt: _a, ownerAccountId: _o, ...creativa } = raiz;
  const { ownerAccountId: _eo, productionId: _ep, ...deLaEscena } = escena;
  void _r; void _m; void _u; void _c; void _s; void _a; void _o; void _eo; void _ep;
  return createHash('sha256').update(JSON.stringify(canonico({ produccion: { ...creativa, metadata: metadatos }, escena: deLaEscena }))).digest('hex');
};

const orden = (v: unknown): number => entero(v, 0, 99_999) ?? 0;

const recortar = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
};

/**
 * LA UNIDAD, EN LA PRODUCCIÓN GUARDADA. Lo ajeno y lo inexistente contestan igual.
 * Sin revisión que comparar (`revision` ausente) se lee la que haya: es el enlace.
 */
export const leerUnidadEnLaProduccion = async (
  db: Firestore,
  accountId: string,
  t: { productionId: string; sceneId: string; unitId: string; revision?: number },
): Promise<{ ok: true; unidad: UnidadEnLaProduccion } | { ok: false; motivo: MotivoDeToma }> => {
  const raizSnap = await db.collection(COLECCION_DE_PRODUCCIONES).doc(t.productionId).get();
  const raiz = raizSnap.exists ? raizSnap.data() : undefined;
  if (!esObj(raiz) || raiz.ownerAccountId !== accountId) return { ok: false, motivo: 'production_not_found' };
  if (raiz.status !== 'active') return { ok: false, motivo: 'production_archived' };
  const revision = esObj(raiz.metadata) ? entero(raiz.metadata.revision, 0, Number.MAX_SAFE_INTEGER) : undefined;
  if (revision === undefined) return { ok: false, motivo: 'production_not_found' };
  if (t.revision !== undefined && t.revision !== revision) return { ok: false, motivo: 'production_changed' };
  const escenaSnap = await db.collection(COLECCION_DE_PRODUCCIONES).doc(t.productionId).collection(COLECCION_DE_ESCENAS_DE_PRODUCCION).doc(t.sceneId).get();
  const escena = escenaSnap.exists ? escenaSnap.data() : undefined;
  if (!esObj(escena) || escena.ownerAccountId !== accountId || escena.productionId !== t.productionId || escena.id !== t.sceneId) {
    return { ok: false, motivo: 'unit_not_found' };
  }
  const planos = Array.isArray(escena.shots) ? escena.shots.filter(esObj) : [];
  /* La escena sin planos es una unidad en sí misma; si tiene planos, la unidad es uno de ellos. */
  const plano = planos.find((p) => p.id === t.unitId);
  const esLaEscena = t.unitId === t.sceneId && planos.length === 0;
  if (!plano && !esLaEscena) return { ok: false, motivo: 'unit_not_found' };
  const narrativa = recortar(plano ? plano.description : escena.description, 280);
  return {
    ok: true,
    unidad: {
      revision,
      firma: firmaDe(raiz, escena),
      orden: plano ? orden(plano.order) : 0,
      ordenDeEscena: orden(escena.order),
      ...(narrativa ? { narrativa } : {}),
    },
  };
};

/* ── Las tomas de una unidad, por sus reservas ────────────────────────────── */

export type EstadoDeReserva = 'AUTHORIZED' | 'COMPLETED' | 'REFUNDED' | 'FAILED' | 'PENDING';

export interface TomaExistente {
  readonly toma: number;
  readonly requestId: string;
  readonly estado: EstadoDeReserva;
}

const TERMINALES: readonly EstadoDeReserva[] = ['COMPLETED', 'REFUNDED', 'FAILED'];
export const tomaTerminada = (estado: EstadoDeReserva): boolean => TERMINALES.includes(estado);

/**
 * LAS TOMAS QUE YA EXISTEN, en orden: la 1, la 2… hasta la primera que no tiene
 * reserva. Una reserva que no es de esta persona no es de esta toma: se para.
 */
export const tomasDeLaUnidad = async (
  db: Firestore,
  uid: string,
  accountId: string,
  t: { productionId: string; unitId: string },
): Promise<readonly TomaExistente[]> => {
  const salida: TomaExistente[] = [];
  for (let toma = 1; toma <= MAX_TOMAS; toma++) {
    const requestId = requestIdDeToma(accountId, t.productionId, t.unitId, toma);
    const snap = await db.collection(COLECCION_DE_RESERVAS).doc(usageTransactionId(requestId)).get();
    const d = snap.exists ? snap.data() : undefined;
    if (!esObj(d) || d.userId !== uid) break;
    salida.push({ toma, requestId, estado: String(d.status) as EstadoDeReserva });
  }
  return Object.freeze(salida);
};

/**
 * ¿SE PUEDE PEDIR ESTA TOMA? Una toma viva por plano, y en orden.
 *
 *   · la misma que ya existe: es repetirla —el Credit Engine y el trabajo ya lo
 *     saben tratar, sin segundo cobro ni segundo POST—;
 *   · la siguiente: solo si la anterior terminó —cobrada o devuelta—;
 *   · cualquier otra: no.
 */
export const puedePedirseLaToma = (tomas: readonly TomaExistente[], toma: number): MotivoDeToma | null => {
  const ultima = tomas[tomas.length - 1];
  if (toma <= tomas.length) return null;
  if (toma !== tomas.length + 1) return 'take_out_of_order';
  if (toma > MAX_TOMAS) return 'take_limit';
  if (ultima && !tomaTerminada(ultima.estado)) return 'take_in_flight';
  return null;
};

/* ── El enlace del resultado ──────────────────────────────────────────────── */

export type ResultadoDelEnlace =
  | { status: 'linked' | 'already'; shotNodeId: string; assetId: string; version: number }
  | { status: 'not_ready' | 'failed' | 'stale' | 'not_found' | 'conflict'; motivo?: MotivoDeToma | 'asset_mismatch' | 'node_rejected' | 'version_changed' };

interface FichaDeLaReserva {
  readonly estado: EstadoDeReserva;
  readonly firma?: string;
  readonly productionId?: string;
  readonly unitId?: string;
  readonly toma?: number;
}

const leerReserva = async (db: Firestore, uid: string, requestId: string): Promise<FichaDeLaReserva | null> => {
  const snap = await db.collection(COLECCION_DE_RESERVAS).doc(usageTransactionId(requestId)).get();
  const d = snap.exists ? snap.data() : undefined;
  if (!esObj(d) || d.userId !== uid) return null;
  const f = esObj(d.meta) && esObj(d.meta.filmmaker) ? d.meta.filmmaker : {};
  return {
    estado: String(d.status) as EstadoDeReserva,
    ...(typeof f.firma === 'string' ? { firma: f.firma } : {}),
    ...(typeof f.productionId === 'string' ? { productionId: f.productionId } : {}),
    ...(typeof f.unitId === 'string' ? { unitId: f.unitId } : {}),
    ...(typeof f.take === 'number' ? { toma: f.take } : {}),
  };
};

/**
 * EL MATERIAL DE UNA OPERACIÓN, por su procedencia. El Core escribe en la traza
 * del trabajo el `requestId` de quien pidió (`traceId`) y su ejecución
 * (`run_<requestId>`), y la materialización lo copia a la ficha: el cliente no
 * puede escribir ninguna de las dos cosas. Exactamente uno, o ninguno.
 */
const materialDeLaOperacion = async (db: Firestore, uid: string, requestId: string): Promise<{ assetId: string } | null> => {
  const snap = await db.collection(COLECCION_DE_MATERIALES)
    .where('ownerAccountId', '==', uid)
    .where('provenance.traceId', '==', requestId)
    .limit(2)
    .get();
  if (snap.docs.length !== 1) return null;
  const m = snap.docs[0].data();
  const p = esObj(m.provenance) ? m.provenance : {};
  if (m.status !== 'ready' || m.kind !== 'video') return null;
  if (p.capability !== 'video.generate' || p.runId !== `run_${requestId}`) return null;
  return typeof m.assetId === 'string' ? { assetId: m.assetId } : null;
};

/**
 * ENLAZAR UNA TOMA A SU PLANO. Lo único que escribe `producedAssetId` en un
 * `ShotNode` de Filmmaker, y lo hace después de comprobarlo todo:
 *
 *   1 · la reserva de ESA toma es de esta persona y está COBRADA;
 *   2 · la reserva dice de qué producción, unidad y toma es, y coincide;
 *   3 · la producción sigue siendo de la cuenta y la unidad sigue ahí;
 *   4 · la firma de la unidad es la de cuando se pidió: si no, el plano cambió
 *       y el vídeo se queda en las creaciones, sin enlazar y sin cobrar otra vez;
 *   5 · el material nació de esa operación, es de la cuenta, está listo y es un vídeo;
 *   6 · la escena y el plano del Core existen —se crean si no—, y el resultado se
 *       fija en una transacción, con la versión que la app vio si la manda.
 */
export const enlazarToma = async (
  db: Firestore,
  quien: { uid: string; accountId: string },
  t: IdentidadDeToma,
  opciones: { at: number; expectedVersion?: number },
): Promise<ResultadoDelEnlace> => {
  const requestId = requestIdDeToma(quien.accountId, t.productionId, t.unitId, t.toma);
  const reserva = await leerReserva(db, quien.uid, requestId);
  if (!reserva) return { status: 'not_found' };
  if (reserva.estado === 'REFUNDED' || reserva.estado === 'FAILED') return { status: 'failed' };
  if (reserva.estado !== 'COMPLETED') return { status: 'not_ready' };
  if (reserva.productionId !== t.productionId || reserva.unitId !== t.unitId || reserva.toma !== t.toma || !reserva.firma) {
    return { status: 'not_found' };
  }

  const leida = await leerUnidadEnLaProduccion(db, quien.accountId, t);
  if (!leida.ok) return { status: leida.motivo === 'production_not_found' ? 'not_found' : 'stale', motivo: leida.motivo };
  if (leida.unidad.firma !== reserva.firma) return { status: 'stale', motivo: 'production_changed' };

  const material = await materialDeLaOperacion(db, quien.uid, requestId);
  if (!material) return { status: 'not_ready', motivo: 'asset_mismatch' };

  const sceneNodeId = idDeNodoDeEscena(quien.accountId, t.productionId, t.sceneId);
  const shotNodeId = idDeNodoDePlano(quien.accountId, t.productionId, t.unitId);
  const escena = await crearEscena({ accountId: quien.accountId, sceneId: sceneNodeId, projectId: t.productionId, order: leida.unidad.ordenDeEscena, at: opciones.at }, { db });
  if (escena.status !== 'creado' && escena.status !== 'ya_existe') return { status: 'not_found', motivo: 'node_rejected' };
  if (escena.scene.projectId !== t.productionId) return { status: 'not_found', motivo: 'node_rejected' };
  const plano = await crearPlano({
    accountId: quien.accountId, shotId: shotNodeId, projectId: t.productionId, sceneId: sceneNodeId,
    order: leida.unidad.orden, ...(leida.unidad.narrativa ? { narrative: leida.unidad.narrativa } : {}), at: opciones.at,
  }, { db });
  if (plano.status !== 'creado' && plano.status !== 'ya_existe') return { status: 'not_found', motivo: 'node_rejected' };
  /* Un id repetido que fuera de OTRA producción no se engancha: se rechaza. */
  if (plano.shot.projectId !== t.productionId || plano.shot.sceneId !== sceneNodeId) return { status: 'not_found', motivo: 'node_rejected' };

  const fijado = await fijarResultadoVerificado(quien.accountId, shotNodeId, {
    assetId: material.assetId,
    at: opciones.at,
    ...(opciones.expectedVersion !== undefined ? { expectedVersion: opciones.expectedVersion } : {}),
  }, { db });
  if (fijado.status === 'fijado' || fijado.status === 'ya_estaba') {
    return { status: fijado.status === 'fijado' ? 'linked' : 'already', shotNodeId, assetId: material.assetId, version: fijado.shot.version };
  }
  /* Otra escritura se adelantó a la versión que vio la app: que vuelva a mirar. */
  if (fijado.status === 'version_distinta') return { status: 'conflict', motivo: 'version_changed' };
  return { status: 'stale', motivo: 'node_rejected' };
};

/** El plano de Filmmaker de una unidad, si existe y es de la cuenta: su resultado y su versión. */
export const nodoDeLaUnidad = async (
  db: Firestore,
  accountId: string,
  t: { productionId: string; unitId: string },
): Promise<{ shotNodeId: string; producedAssetId?: string; version: number } | null> => {
  const shotNodeId = idDeNodoDePlano(accountId, t.productionId, t.unitId);
  const nodo = await leerPlano(accountId, shotNodeId, { db });
  if (!nodo || nodo.projectId !== t.productionId) return null;
  return { shotNodeId, version: nodo.version, ...(nodo.producedAssetId ? { producedAssetId: nodo.producedAssetId } : {}) };
};
