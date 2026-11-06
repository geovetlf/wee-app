import { createHash, randomUUID } from 'node:crypto';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

/**
 * EL BLOQUE DE WEË BRAIN: DOCE RESPUESTAS POR UN CREDIT.
 *
 * Decisión del usuario (2026-09-16). Weë Brain es la puerta que más se abre en
 * Weë —se entra a preguntar cualquier cosa, muchas veces al día— y cobrar cada
 * respuesta suelta hacía que preguntar pareciera caro. Un Credit es la moneda más
 * pequeña que existe en Weë (es entera y no se parte, ver `creditValidation.ts`),
 * así que la única forma de bajar de ahí es cobrar una vez cada varias respuestas.
 *
 * ── Cómo cuenta ──────────────────────────────────────────────────────────────
 *
 * Las respuestas 1 a 11 suman. La 12 suma, cobra 1 Credit y deja el bloque a 0.
 * El contador es de la CUENTA, no de la conversación ni del teléfono: se sale de
 * Brain con 5/12 y se vuelve meses después, en otro móvil, y sigue en 5/12.
 *
 * ── Dónde vive, y por qué así ────────────────────────────────────────────────
 *
 *   brainUsage/{uid}                        { bloque, respuestasTotales, actualizadoEn }
 *   brainUsage/{uid}/respuestas/{clave}     { posicion, cobrada, creadoEn }
 *
 * `clave` es la huella de la OPERACIÓN (cuenta + conversación + mensaje + servicio,
 * `operacionDeBrain`, más abajo), no el `messageId` que manda el teléfono (A-02, F-01).
 *
 * Un documento por persona, no una lista que crezca: a un millón de cuentas son
 * un millón de documentos diminutos, y cada respuesta toca UNO. No hay nada en
 * memoria, ningún proceso por usuario y ningún servidor con estado: la verdad
 * está en Firestore y los servidores son intercambiables.
 *
 * El segundo documento —uno por mensaje— es lo que hace que contar sea IDEMPOTENTE.
 * Sin él, un reintento de la misma respuesta avanzaría el bloque dos veces, y una
 * de cada doce personas pagaría de más sin que nadie se enterara. Con él, volver
 * a contar la misma operación devuelve lo que ya se decidió y no toca nada.
 *
 * ── Y por qué una transacción ────────────────────────────────────────────────
 *
 * Las dos escrituras van en la MISMA transacción de Firestore, que es la que ya
 * usa el Credit Engine. Dos preguntas enviadas a la vez rondando el 11 no pueden
 * cobrar las dos: Firestore serializa las transacciones que tocan el mismo
 * documento y la segunda se reintenta sobre el valor ya actualizado.
 */

/** Cuántas respuestas de Weë Brain entran en un Credit. */
export const RESPUESTAS_POR_CREDIT = 12;

export interface ConsumoDeBrain {
  /** En qué puesto del bloque quedó esta respuesta (1…12). */
  posicion: number;
  /** Si esta respuesta es la que cierra el bloque y cobra. */
  cobrada: boolean;
  /**
   * Si el apunte lo creó ESTA llamada. Una repetición devuelve la decisión de antes
   * con `nueva: false`: quien no creó el apunte no puede deshacerlo (A-02, M-3).
   */
  nueva: boolean;
}

/** La valla de un intento de Weë Brain: su reclamo y su `intento` (ver `reclamarMensaje`). */
export interface Vigia {
  ref: ContadorRef;
  intento: string;
}

export interface BloqueDeBrain {
  /** Respuestas ya usadas del bloque en curso (0…11). */
  usadas: number;
  /** Cuántas caben en un bloque. */
  total: number;
  /** Las que quedan antes del próximo Credit. */
  restantes: number;
}

/*
 * ── Por qué la base de datos entra por la puerta y no se coge de dentro ──────
 *
 * Es la misma forma que el Credit Engine (`createCreditEngine`): las piezas que
 * mueven dinero se construyen con sus dependencias fuera, para que las pruebas
 * puedan darles una Firestore de mentira y comprobar de verdad lo que pasa con
 * doce respuestas seguidas, con un reintento o con dos peticiones a la vez. Una
 * regla de cobro que solo se puede mirar leyendo el código no está probada.
 */
interface ContadorDoc {
  exists: boolean;
  data(): Record<string, any> | undefined;
}
interface ContadorRef {
  path: string;
  collection(p: string): { doc(id: string): ContadorRef };
  get(): Promise<ContadorDoc>;
}
interface ContadorTx {
  get(ref: ContadorRef): Promise<ContadorDoc>;
  set(ref: ContadorRef, data: Record<string, unknown>, options?: { merge?: boolean }): void;
  delete(ref: ContadorRef): void;
}
export interface ContadorDeps {
  db: () => { collection(p: string): { doc(id: string): ContadorRef }; runTransaction<T>(fn: (tx: ContadorTx) => Promise<T>): Promise<T> };
  increment: (n: number) => unknown;
  now: () => unknown;
}

/**
 * Apunta UNA respuesta ya generada y dice si esa es la que cobra.
 *
 * Se llama DESPUÉS de que Weë Brain haya respondido de verdad: lo que cuenta son
 * respuestas entregadas, no mensajes enviados. Una generación que falló no gasta
 * bloque, y por eso no se llama desde el camino del error.
 */
export function crearContadorDeBrain(deps: ContadorDeps) {
  const { increment, now } = deps;
  const contadorDe = (userId: string) => deps.db().collection('brainUsage').doc(userId);
  const registroDe = (userId: string, messageId: string) => contadorDe(userId).collection('respuestas').doc(messageId);

async function contarRespuesta(userId: string, messageId: string, vigia?: Vigia): Promise<ConsumoDeBrain> {
  const contador = contadorDe(userId);
  const registro = registroDe(userId, messageId);

  return deps.db().runTransaction(async (tx) => {
    /*
     * La valla, DENTRO de la misma transacción: si otro intento tomó el reclamo, este
     * no cuenta nada. Y si sigue siendo suyo, renueva el plazo (A-02, M-3).
     *
     * Firestore exige TODAS las lecturas antes de la primera escritura: primero se lee
     * (reclamo, apunte, contador) y solo después se renueva y se apunta.
     */
    const reclamo = vigia ? await tx.get(vigia.ref) : undefined;
    if (vigia && (!reclamo?.exists || reclamo.data()?.intento !== vigia.intento)) throw new ReclamoPerdido();
    /* ¿Ya se contó esta misma respuesta? Entonces no se cuenta otra vez: se repite la respuesta de antes. */
    const yaContada = await tx.get(registro);
    const snap = await tx.get(contador);
    if (vigia && reclamo?.data()?.estado === 'pensando') tx.set(vigia.ref, { reclamadoHasta: Date.now() + PLAZO_DEL_RECLAMO_MS }, { merge: true });
    if (yaContada.exists) {
      const previo = yaContada.data() || {};
      return { posicion: Number(previo.posicion || 0), cobrada: previo.cobrada === true, nueva: false };
    }

    const usadas = Number(snap.data()?.bloque ?? 0);
    const posicion = usadas + 1;
    const cobrada = posicion >= RESPUESTAS_POR_CREDIT;

    tx.set(registro, { posicion, cobrada, creadoEn: now() });
    tx.set(
      contador,
      {
        /* Al cobrar, el bloque siguiente empieza limpio. */
        bloque: cobrada ? 0 : posicion,
        respuestasTotales: increment(1),
        actualizadoEn: now(),
      },
      { merge: true },
    );
    return { posicion, cobrada, nueva: true };
  });
}

/**
 * Deshace lo que apuntó `contarRespuesta`.
 *
 * Dos motivos para llamarla: la respuesta se generó, cerró el bloque, y al ir a
 * cobrar el Credit el saldo no daba; o algo falló después de contarla y la
 * respuesta NO llegó a entregarse (`queHacerConElCobro`). Sin esto la persona se
 * quedaría con el bloque a cero sin haber pagado —doce respuestas gratis— o,
 * peor, atascada.
 *
 * Es una compensación, no un reembolso. Idempotente: sin apunte, no hace nada.
 */
async function deshacerRespuesta(userId: string, messageId: string, vigia?: Vigia): Promise<boolean> {
  const contador = contadorDe(userId);
  const registro = registroDe(userId, messageId);

  return deps.db().runTransaction(async (tx) => {
    /* Solo deshace quien sigue siendo dueño del reclamo: nunca el apunte del que lo tomó después (A-02, M-3). */
    if (vigia) {
      const r = await tx.get(vigia.ref);
      if (!r.exists || r.data()?.intento !== vigia.intento) return false;
    }
    const apunte = await tx.get(registro);
    if (!apunte.exists) return false;
    const datos = apunte.data() || {};
    const posicion = Number(datos.posicion || 1);
    const snap = await tx.get(contador);
    const actual = Number(snap.data()?.bloque ?? 0);
    /*
     * Si esta respuesta cerró el bloque, el contador se dejó en 0: se devuelve al
     * puesto de antes. Si no lo cerró, se retrocede uno, sin bajar de cero.
     */
    const bloque = datos.cobrada === true ? Math.max(0, posicion - 1) : Math.max(0, actual - 1);
    tx.delete(registro);
    tx.set(contador, { bloque, respuestasTotales: increment(-1), actualizadoEn: now() }, { merge: true });
    return true;
  });
}

/** Por dónde va el bloque de esta persona. Una lectura de un documento diminuto. */
async function bloqueDe(userId: string): Promise<BloqueDeBrain> {
  const snap = await contadorDe(userId).get();
  const usadas = Math.min(RESPUESTAS_POR_CREDIT - 1, Math.max(0, Number(snap.data()?.bloque ?? 0)));
  return { usadas, total: RESPUESTAS_POR_CREDIT, restantes: RESPUESTAS_POR_CREDIT - usadas };
}

  return { contarRespuesta, deshacerRespuesta, bloqueDe };
}

/** El de producción: Firestore de verdad. */
export const contadorDeBrain = crearContadorDeBrain({
  db: () => getFirestore() as any,
  increment: (n) => FieldValue.increment(n),
  now: () => Timestamp.now(),
});

export const contarRespuesta = contadorDeBrain.contarRespuesta;
export const deshacerRespuesta = contadorDeBrain.deshacerRespuesta;
export const bloqueDe = contadorDeBrain.bloqueDe;

/**
 * QUÉ SE HACE CON EL COBRO CUANDO ALGO FALLA DESPUÉS DE GENERAR
 * (revisión post-auditoría 2026-10-01, hallazgo server/credits/creator/brain.ts#brainChat).
 *
 * La regla es la de siempre —reservar → ejecutar → si se ENTREGÓ, se cobra; si no,
 * se devuelve—, contestada con lo que de verdad pasó en esta invocación:
 *
 *  · ENTREGADA (la respuesta ya quedó guardada en la conversación): la persona la
 *    tiene. Devolver aquí era regalarla; lo correcto es completar el cobro.
 *  · NO ENTREGADA y devolver es seguro: se devuelve. Y si ESTA invocación contó la
 *    respuesta en el bloque de doce, el bloque vuelve a donde estaba: antes se
 *    devolvía el Credit pero el bloque se quedaba gastado, y la persona tenía doce
 *    respuestas por cero.
 *  · NO ENTREGADA y devolver NO es seguro (otra invocación del mismo mensaje la está
 *    ejecutando): no se toca nada; la cierra quien la termine.
 *
 *  · La operación YA TERMINÓ SIN COBRO (`cerradoSinCobro`, ver `cobroYaCerradoSinCobro`):
 *    no hay nada que completar ni que devolver —ya se devolvió—; solo se devuelve el
 *    bloque si ESTA invocación lo contó, porque esta respuesta no se entrega.
 *
 * Pura: no lee ni escribe. Quien la usa hace lo que dice.
 */
export const queHacerConElCobro = (h: {
  cobrado: boolean;
  entregada: boolean;
  devolverEsSeguro: boolean;
  contadaAqui: boolean;
  cerradoSinCobro?: boolean;
}): { completar: boolean; reembolsar: boolean; deshacerBloque: boolean } => {
  if (h.cerradoSinCobro === true) return { completar: false, reembolsar: false, deshacerBloque: h.contadaAqui && !h.entregada };
  if (h.entregada) return { completar: h.cobrado, reembolsar: false, deshacerBloque: false };
  if (!h.devolverEsSeguro) return { completar: false, reembolsar: false, deshacerBloque: false };
  return { completar: false, reembolsar: h.cobrado, deshacerBloque: h.contadaAqui };
};

/**
 * ¿EL COBRO DE ESTE MENSAJE YA TERMINÓ SIN COBRAR? (revisión post-auditoría 2026-10-01,
 * «Brain: repetir un mensaje ya REEMBOLSADO lo contesta gratis»).
 *
 * `spendCredits` es idempotente por `requestId` (`brain_<clave>`, ver `operacionDeBrain`, más abajo): repetir el mismo
 * mensaje no cobra dos veces, devuelve la operación de antes con `duplicate: true`. Si esa
 * operación ya está REEMBOLSADA (o FALLIDA), terminó sin cobro: quien la repite NO puede
 * llevarse la respuesta con ella, porque nadie la va a pagar.
 *
 * El Credit Engine de hoy ya lanza `ALREADY_REFUNDED` en ese caso (creditEngine.ts,
 * `spendCredits`), así que por él esta rama no se recorre; existe para que la regla de Brain
 * no dependa de un detalle del motor: si un día ese duplicado se DEVUELVE en vez de lanzarse,
 * Brain sigue sin regalar la respuesta.
 *
 * Pura: solo mira lo que devolvió el cobro.
 */
export const cobroYaCerradoSinCobro = (cobro: { duplicate?: boolean; status?: string } | null | undefined): boolean =>
  !!cobro && cobro.duplicate === true && (cobro.status === 'REFUNDED' || cobro.status === 'FAILED');

/**
 * LA IDENTIDAD DE UNA OPERACIÓN DE WEË BRAIN (A-02: F-01 y F-01b).
 *
 * ── Qué estaba mal ───────────────────────────────────────────────────────────
 *
 * El `messageId` lo elige el teléfono. Hasta aquí servía, a la vez, para cuatro
 * cosas distintas: identificar el mensaje en su conversación, idempotencia del
 * contador del bloque (`brainUsage/{uid}/respuestas/{messageId}`), el `requestId`
 * del cobro (`brain_{messageId}`, GLOBAL en `creditTransactions`) y el id del
 * trabajo del conductor (`wf_{requestId}`). Y cada una tenía un alcance distinto:
 *
 *   · el duplicado se buscaba por CONVERSACIÓN → en una conversación nueva, el
 *     mismo id generaba otra respuesta (y otra llamada al modelo)…
 *   · …que el contador, por CUENTA, ya daba por contada → respuestas gratis (F-01);
 *   · y el cobro, GLOBAL, hacía que otra cuenta con el mismo id recibiera
 *     FORBIDDEN, en la conversación DESPUÉS de haber pagado al proveedor (F-01b).
 *
 * ── Qué es ahora cada cosa ───────────────────────────────────────────────────
 *
 *   · Mensaje recibido:   `messageId` del cliente, solo como referencia DENTRO de
 *                         su conversación (`brainChats/{chatId}/messages/{messageId}`).
 *   · Conversación:       `chatId`, generado por el servidor o comprobado como de
 *                         la cuenta autenticada antes de llegar aquí.
 *   · Operación facturable y transacción: `clave` = huella de (cuenta, conversación,
 *                         mensaje, servicio). De ella salen el registro del bloque
 *                         y el `requestId` (`brain_<clave>`), y de este el asiento
 *                         (`usage_brain_<clave>`) y el trabajo del conductor.
 *   · Intento de ejecución: `intento`, un uuid del servidor por cada vez que se
 *                         reclama el mensaje para llamar al modelo.
 *
 * Mismo mensaje en la misma conversación = misma operación (se repite, no se
 * vuelve a cobrar). Mismo id en otra conversación u otra cuenta = otra operación
 * (se cuenta y se cobra como cualquiera, y nadie bloquea a nadie).
 *
 * Lo ya guardado con el formato anterior no se migra ni se lee: el duplicado de
 * una respuesta ya entregada se sigue detectando por `{messageId}_wee`, que no cambia.
 */

/** Versión de la huella: si un día cambia lo que entra, cambia esto y nunca colisiona con lo anterior. */
const VERSION_DE_LA_CLAVE = 'brain-op-v2';

export interface OperacionDeBrain {
  /** Huella hexadecimal de 40 caracteres: id del registro del bloque. */
  clave: string;
  /** `brain_<clave>`: idempotencia del cobro, del libro y del trabajo del conductor. */
  requestId: string;
}

export function operacionDeBrain(p: { userId: string; chatId: string; messageId: string; service: string }): OperacionDeBrain {
  const clave = createHash('sha256')
    .update([VERSION_DE_LA_CLAVE, p.userId, p.chatId, p.messageId, p.service].join('\u0000'))
    .digest('hex')
    .slice(0, 40);
  return { clave, requestId: `brain_${clave}` };
}

/*
 * ── EL RECLAMO DEL MENSAJE: UNA SOLA EJECUCIÓN A LA VEZ ──────────────────────
 *
 * Dos peticiones iguales a la vez (doble toque, reintento de red) leían las dos
 * «no hay respuesta» y llamaban las dos al modelo. El dinero ya no se duplicaba
 * —contador y cobro son idempotentes—, pero el proveedor sí cobraba dos veces.
 *
 * Ahora cada mensaje tiene un RECLAMO propio, en un documento aparte que solo toca
 * el servidor (`brainUsage/{uid}/reclamos/{claveDelMensaje}`; las reglas ya cierran
 * todo `brainUsage`). Se toma en una transacción que antes mira si ya hay respuesta
 * o si otro intento lo tiene, y se toma ANTES de cobrar nada o de comprobar el
 * saldo: así ninguna petición repetida llega a reservar Credits que luego nadie
 * cierra. Es por MENSAJE y no por operación a propósito: el mismo mensaje no puede
 * ejecutarse a la vez como búsqueda y como conversación.
 *
 * Quien lo reclama lleva un `intento` propio. Ese intento es la VALLA de todos sus
 * efectos de dinero: contar, deshacer, reembolsar o completar solo se hacen si el
 * reclamo sigue siendo suyo (`renovarReclamo`, y dentro de la transacción del
 * contador). Si otro intento lo tomó —porque este se quedó colgado más allá del
 * plazo—, este ya no toca nada: lo que haya que hacer lo hace el dueño actual.
 *
 * El plazo (`reclamadoHasta`) es mayor que el tiempo máximo de la función (120 s)
 * y se renueva en cada valla, así que un intento vivo no lo pierde por tiempo. Uno
 * muerto (el proceso cayó a mitad) deja de bloquear al cumplirse: eso SÍ puede
 * significar una segunda llamada al proveedor tras una caída, pero el dinero sigue
 * siendo uno, porque contador y cobro van por la misma operación.
 */
export const PLAZO_DEL_RECLAMO_MS = 150_000;

const VERSION_DEL_MENSAJE = 'brain-msg-v1';

/** Huella de (cuenta, conversación, mensaje): el id del reclamo. Sin el servicio, a propósito. */
export function claveDelMensaje(p: { userId: string; chatId: string; messageId: string }): string {
  return createHash('sha256')
    .update([VERSION_DEL_MENSAJE, p.userId, p.chatId, p.messageId].join('\u0000'))
    .digest('hex')
    .slice(0, 40);
}

export type ReclamoDeMensaje =
  | { estado: 'reclamado'; intento: string }
  | { estado: 'respondido' }
  | { estado: 'en_curso' };

type Doc = FirebaseFirestore.DocumentReference;
type Db = FirebaseFirestore.Firestore;

export async function reclamarMensaje(db: Db, refs: { reclamo: Doc; respuesta: Doc }, ahoraMs: number = Date.now()): Promise<ReclamoDeMensaje> {
  return db.runTransaction(async (tx) => {
    const yaRespondido = await tx.get(refs.respuesta);
    const previo = await tx.get(refs.reclamo);
    if (yaRespondido.exists) return { estado: 'respondido' as const };
    const d = previo.data();
    if (previo.exists && d?.estado === 'pensando' && typeof d.reclamadoHasta === 'number' && d.reclamadoHasta > ahoraMs) {
      return { estado: 'en_curso' as const };
    }
    /* Si la transacción se reintenta por contención, se genera otro uuid: el que se devuelve es el del intento que se guardó. */
    const intento = randomUUID();
    tx.set(refs.reclamo, { estado: 'pensando', intento, reclamadoHasta: ahoraMs + PLAZO_DEL_RECLAMO_MS, actualizadoEn: ahoraMs });
    return { estado: 'reclamado' as const, intento };
  });
}

/**
 * ¿Sigue siendo mío? Si lo es y aún está «pensando», renueva el plazo. La propiedad
 * la decide el `intento`, no el reloj: uno vencido que nadie ha vuelto a tomar sigue
 * siendo del que lo tomó.
 */
export async function renovarReclamo(db: Db, reclamo: Doc, intento: string, ahoraMs: number = Date.now()): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(reclamo);
    if (!snap.exists || snap.data()?.intento !== intento) return false;
    if (snap.data()?.estado === 'pensando') tx.set(reclamo, { reclamadoHasta: ahoraMs + PLAZO_DEL_RECLAMO_MS, actualizadoEn: ahoraMs }, { merge: true });
    return true;
  });
}

/** Cierra el reclamo SOLO si sigue siendo de este intento: nunca suelta el de otra ejecución. */
export async function soltarMensaje(db: Db, reclamo: Doc, intento: string, estado: 'respondido' | 'fallido', ahoraMs: number = Date.now()): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(reclamo);
    if (!snap.exists || snap.data()?.intento !== intento) return false;
    tx.set(reclamo, { estado, reclamadoHasta: 0, actualizadoEn: ahoraMs }, { merge: true });
    return true;
  });
}

/** El intento perdió su reclamo: otro lo tomó. Quien lo recibe no toca dinero. */
export class ReclamoPerdido extends Error {
  constructor() {
    super('RECLAMO_PERDIDO');
    this.name = 'ReclamoPerdido';
  }
}
