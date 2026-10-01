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
 *   brainUsage/{uid}/respuestas/{messageId} { posicion, cobrada, creadoEn }
 *
 * Un documento por persona, no una lista que crezca: a un millón de cuentas son
 * un millón de documentos diminutos, y cada respuesta toca UNO. No hay nada en
 * memoria, ningún proceso por usuario y ningún servidor con estado: la verdad
 * está en Firestore y los servidores son intercambiables.
 *
 * El segundo documento —uno por mensaje— es lo que hace que contar sea IDEMPOTENTE.
 * Sin él, un reintento de la misma respuesta avanzaría el bloque dos veces, y una
 * de cada doce personas pagaría de más sin que nadie se enterara. Con él, volver
 * a contar el mismo `messageId` devuelve lo que ya se decidió y no toca nada.
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

async function contarRespuesta(userId: string, messageId: string): Promise<ConsumoDeBrain> {
  const contador = contadorDe(userId);
  const registro = registroDe(userId, messageId);

  return deps.db().runTransaction(async (tx) => {
    /* ¿Ya se contó esta misma respuesta? Entonces no se cuenta otra vez: se repite la respuesta de antes. */
    const yaContada = await tx.get(registro);
    if (yaContada.exists) {
      const previo = yaContada.data() || {};
      return { posicion: Number(previo.posicion || 0), cobrada: previo.cobrada === true };
    }

    const snap = await tx.get(contador);
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
    return { posicion, cobrada };
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
async function deshacerRespuesta(userId: string, messageId: string): Promise<void> {
  const contador = contadorDe(userId);
  const registro = registroDe(userId, messageId);

  await deps.db().runTransaction(async (tx) => {
    const apunte = await tx.get(registro);
    if (!apunte.exists) return;
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
 * Pura: no lee ni escribe. Quien la usa hace lo que dice.
 */
export const queHacerConElCobro = (h: {
  cobrado: boolean;
  entregada: boolean;
  devolverEsSeguro: boolean;
  contadaAqui: boolean;
}): { completar: boolean; reembolsar: boolean; deshacerBloque: boolean } => {
  if (h.entregada) return { completar: h.cobrado, reembolsar: false, deshacerBloque: false };
  if (!h.devolverEsSeguro) return { completar: false, reembolsar: false, deshacerBloque: false };
  return { completar: false, reembolsar: h.cobrado, deshacerBloque: h.contadaAqui };
};
