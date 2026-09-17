"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bloqueDe = exports.deshacerRespuesta = exports.contarRespuesta = exports.contadorDeBrain = exports.RESPUESTAS_POR_CREDIT = void 0;
exports.crearContadorDeBrain = crearContadorDeBrain;
const firestore_1 = require("firebase-admin/firestore");
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
exports.RESPUESTAS_POR_CREDIT = 12;
/**
 * Apunta UNA respuesta ya generada y dice si esa es la que cobra.
 *
 * Se llama DESPUÉS de que Weë Brain haya respondido de verdad: lo que cuenta son
 * respuestas entregadas, no mensajes enviados. Una generación que falló no gasta
 * bloque, y por eso no se llama desde el camino del error.
 */
function crearContadorDeBrain(deps) {
    const { increment, now } = deps;
    const contadorDe = (userId) => deps.db().collection('brainUsage').doc(userId);
    const registroDe = (userId, messageId) => contadorDe(userId).collection('respuestas').doc(messageId);
    async function contarRespuesta(userId, messageId) {
        const contador = contadorDe(userId);
        const registro = registroDe(userId, messageId);
        return deps.db().runTransaction(async (tx) => {
            var _a, _b;
            /* ¿Ya se contó esta misma respuesta? Entonces no se cuenta otra vez: se repite la respuesta de antes. */
            const yaContada = await tx.get(registro);
            if (yaContada.exists) {
                const previo = yaContada.data() || {};
                return { posicion: Number(previo.posicion || 0), cobrada: previo.cobrada === true };
            }
            const snap = await tx.get(contador);
            const usadas = Number((_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.bloque) !== null && _b !== void 0 ? _b : 0);
            const posicion = usadas + 1;
            const cobrada = posicion >= exports.RESPUESTAS_POR_CREDIT;
            tx.set(registro, { posicion, cobrada, creadoEn: now() });
            tx.set(contador, {
                /* Al cobrar, el bloque siguiente empieza limpio. */
                bloque: cobrada ? 0 : posicion,
                respuestasTotales: increment(1),
                actualizadoEn: now(),
            }, { merge: true });
            return { posicion, cobrada };
        });
    }
    /**
     * Deshace lo que apuntó `contarRespuesta`.
     *
     * Solo hay un motivo para llamarla: la respuesta se generó, cerró el bloque, y al
     * ir a cobrar el Credit el saldo no daba. Sin esto la persona se quedaría con el
     * bloque a cero sin haber pagado —doce respuestas gratis— o, peor, atascada.
     *
     * Es una compensación, no un reembolso: el Credit Engine no llegó a moverse.
     */
    async function deshacerRespuesta(userId, messageId) {
        const contador = contadorDe(userId);
        const registro = registroDe(userId, messageId);
        await deps.db().runTransaction(async (tx) => {
            var _a, _b;
            const apunte = await tx.get(registro);
            if (!apunte.exists)
                return;
            const datos = apunte.data() || {};
            const posicion = Number(datos.posicion || 1);
            const snap = await tx.get(contador);
            const actual = Number((_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.bloque) !== null && _b !== void 0 ? _b : 0);
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
    async function bloqueDe(userId) {
        var _a, _b;
        const snap = await contadorDe(userId).get();
        const usadas = Math.min(exports.RESPUESTAS_POR_CREDIT - 1, Math.max(0, Number((_b = (_a = snap.data()) === null || _a === void 0 ? void 0 : _a.bloque) !== null && _b !== void 0 ? _b : 0)));
        return { usadas, total: exports.RESPUESTAS_POR_CREDIT, restantes: exports.RESPUESTAS_POR_CREDIT - usadas };
    }
    return { contarRespuesta, deshacerRespuesta, bloqueDe };
}
/** El de producción: Firestore de verdad. */
exports.contadorDeBrain = crearContadorDeBrain({
    db: () => (0, firestore_1.getFirestore)(),
    increment: (n) => firestore_1.FieldValue.increment(n),
    now: () => firestore_1.Timestamp.now(),
});
exports.contarRespuesta = exports.contadorDeBrain.contarRespuesta;
exports.deshacerRespuesta = exports.contadorDeBrain.deshacerRespuesta;
exports.bloqueDe = exports.contadorDeBrain.bloqueDe;
//# sourceMappingURL=brainUsage.js.map