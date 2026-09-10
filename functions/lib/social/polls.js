"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.votePoll = exports.pollEngine = exports.createPollEngine = exports.PostNoEncontrado = exports.PollError = exports.decidirVoto = exports.esEncuestaHistorica = exports.milisDe = exports.MENSAJES = void 0;
/*
 * ENCUESTAS DE WEË — el único punto de escritura de votos (Bloque A).
 * ---------------------------------------------------------------------------
 *
 * Una encuesta es un campo del post, no una colección aparte: `posts/{id}.poll`.
 * Así hereda gratis todo lo demás —`destinations[]`, paginación, muros de
 * sección— sin que nada de eso tenga que enterarse de que existen encuestas.
 *
 * Los contadores viven en el post y NADIE los escribe desde el cliente: las
 * reglas de Firestore prohíben tocar `poll` incluso al autor. La única puerta
 * es la callable `votePoll`, que corre con el Admin SDK y por tanto pasa por
 * encima de las reglas. Lo que el cliente manda es una intención —"quiero votar
 * esta opción de este post"—; todo lo demás lo decide el servidor.
 *
 * El voto de cada persona es un documento propio:
 *
 *     posts/{postId}/pollVotes/{voterUid}   →   { optionId, createdAt, updatedAt }
 *
 * y nada más. No hay arrays `votedBy` públicos dentro del post: quién votó qué
 * solo lo puede leer esa misma persona. Además el post deja de engordar con
 * cada voto, que era el otro problema de guardarlos dentro.
 *
 * UNA PERSONA = UN VOTO
 * ---------------------
 * `voterUid` es SIEMPRE `request.auth.uid`: la cuenta de Firebase Auth. Los
 * perfiles Weë (`hidi_<uid>`) y Biz (`biz_<businessId>`) no son personas
 * distintas, son identidades de la misma cuenta —así los crea `usersService`,
 * que graba `linkedAccountId` apuntando a la cuenta raíz, y así lo comprueban
 * ya las reglas de `users`—. Las tres comparten un único voto porque comparten
 * una única cuenta. El cliente no envía identidad: no se le pregunta, y por eso
 * no puede mentir.
 *
 * La lógica vive en `createPollEngine` para poder ejecutarla de verdad en los
 * tests (`functions/test/encuestas.test.mjs`) con un Firestore de mentira,
 * igual que hace el Credit Engine.
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const OPTS = { region: 'us-central1', timeoutSeconds: 30 };
exports.MENSAJES = {
    'sin-encuesta': 'Esta publicación no tiene encuesta.',
    'encuesta-invalida': 'Esta encuesta no es válida.',
    'encuesta-antigua': 'Esta encuesta es de una versión anterior de Weë y ya no admite votos.',
    'opcion-inexistente': 'Esa opción no existe en esta encuesta.',
    'encuesta-cerrada': 'Esta encuesta ya ha finalizado.',
    'ya-votaste': 'Ya has votado en esta encuesta.',
};
const CODIGOS = {
    'sin-encuesta': 'failed-precondition',
    'encuesta-invalida': 'failed-precondition',
    'encuesta-antigua': 'failed-precondition',
    'opcion-inexistente': 'invalid-argument',
    'encuesta-cerrada': 'failed-precondition',
    'ya-votaste': 'failed-precondition',
};
// ─── Utilidades ──────────────────────────────────────────────────────────────
/**
 * Milisegundos de un `endsAt`, venga como venga: Timestamp del Admin SDK,
 * Timestamp serializado, Date o número. Devuelve null si no se entiende, y una
 * fecha que no se entiende cierra la encuesta en vez de abrirla.
 */
const milisDe = (valor) => {
    if (valor === null || valor === undefined)
        return null;
    if (typeof valor === 'number')
        return Number.isFinite(valor) ? valor : null;
    if (valor instanceof Date)
        return valor.getTime();
    if (typeof valor !== 'object')
        return null;
    const obj = valor;
    if (typeof obj.toMillis === 'function') {
        const ms = obj.toMillis();
        return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
    }
    const seg = typeof obj.seconds === 'number' ? obj.seconds : obj._seconds;
    if (typeof seg === 'number' && Number.isFinite(seg)) {
        const nanos = typeof obj.nanoseconds === 'number' ? obj.nanoseconds : obj._nanoseconds;
        return seg * 1000 + Math.floor((typeof nanos === 'number' ? nanos : 0) / 1e6);
    }
    return null;
};
exports.milisDe = milisDe;
/**
 * Una encuesta histórica es la que guarda los votos dentro de cada opción
 * (`votes` / `votedBy`) en vez de en `counts`. No se migran ni se modifican:
 * quedan en solo lectura, que además es lo único honesto —nunca llegaron a
 * funcionar para terceros, porque las reglas bloqueaban la escritura—.
 */
const esEncuestaHistorica = (poll) => {
    const opciones = poll.options;
    if (!Array.isArray(opciones) || opciones.length === 0)
        return false;
    return opciones.some((opt) => {
        const o = opt;
        if (!o)
            return true;
        return typeof o.id !== 'string' || o.id === '' || Array.isArray(o.votedBy) || typeof o.votes === 'number';
    });
};
exports.esEncuestaHistorica = esEncuestaHistorica;
const cuenta = (counts, id) => {
    const n = counts ? counts[id] : 0;
    return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};
// ─── La decisión, sin Firestore de por medio ─────────────────────────────────
/**
 * Decide qué hay que mover para registrar un voto. No escribe nada: devuelve
 * los incrementos, y quien la llama los aplica dentro de una transacción.
 *
 * Aquí está todo lo que la UI NO puede validar por su cuenta: que la opción
 * exista de verdad, que la encuesta siga abierta según el reloj del servidor y
 * que la persona no vote dos veces.
 */
const decidirVoto = (args) => {
    const { poll, votoPrevio, optionId, ahoraMs } = args;
    if (!poll || typeof poll !== 'object')
        return { ok: false, motivo: 'sin-encuesta' };
    const opciones = poll.options;
    if (!Array.isArray(opciones) || opciones.length === 0)
        return { ok: false, motivo: 'encuesta-invalida' };
    if ((0, exports.esEncuestaHistorica)(poll))
        return { ok: false, motivo: 'encuesta-antigua' };
    // La opción se identifica por id, nunca por posición: un índice fuera de
    // rango no es un voto raro, es una opción que no existe.
    const existe = typeof optionId === 'string' && optionId !== '' && opciones.some((opt) => opt && opt.id === optionId);
    if (!existe)
        return { ok: false, motivo: 'opcion-inexistente' };
    // El reloj es el del servidor. Que la UI desactive los botones está bien,
    // pero no es una defensa.
    const finMs = (0, exports.milisDe)(poll.endsAt);
    if (finMs === null || ahoraMs >= finMs)
        return { ok: false, motivo: 'encuesta-cerrada' };
    const permiteCambio = poll.allowChange !== false;
    if (!votoPrevio) {
        return { ok: true, cambio: false, anterior: null, incrementos: { [optionId]: 1 }, deltaTotal: 1 };
    }
    if (!permiteCambio)
        return { ok: false, motivo: 'ya-votaste' };
    // Volver a votar lo mismo no mueve ningún contador: se acepta y no se escribe.
    if (votoPrevio.optionId === optionId) {
        return { ok: true, cambio: true, anterior: votoPrevio.optionId, incrementos: {}, deltaTotal: 0 };
    }
    // Cambio de voto: una opción baja, la otra sube y el total no se mueve.
    const incrementos = {};
    incrementos[votoPrevio.optionId] = -1;
    incrementos[optionId] = 1;
    return { ok: true, cambio: true, anterior: votoPrevio.optionId, incrementos, deltaTotal: 0 };
};
exports.decidirVoto = decidirVoto;
class PollError extends Error {
    constructor(motivo) {
        super(exports.MENSAJES[motivo]);
        this.motivo = motivo;
        this.name = 'PollError';
    }
}
exports.PollError = PollError;
class PostNoEncontrado extends Error {
    constructor() {
        super('Esta publicación ya no existe.');
        this.name = 'PostNoEncontrado';
    }
}
exports.PostNoEncontrado = PostNoEncontrado;
const createPollEngine = (deps) => ({
    /**
     * Registra el voto de una persona. Todo dentro de una transacción: o se
     * escriben el voto y los contadores, o no se escribe nada. Bajo votos
     * simultáneos Firestore reintenta la transacción, así que la lectura de
     * `counts` sobre la que sumamos siempre es la buena.
     */
    vote: async (args) => {
        const { postId, optionId, voterUid } = args;
        const db = deps.db();
        const postRef = db.collection('posts').doc(postId);
        const voteRef = postRef.collection('pollVotes').doc(voterUid);
        return db.runTransaction(async (tx) => {
            // Admin SDK: todas las lecturas antes que las escrituras.
            const postSnap = await tx.get(postRef);
            const voteSnap = await tx.get(voteRef);
            if (!postSnap.exists)
                throw new PostNoEncontrado();
            const post = (postSnap.data() || {});
            const poll = post.poll;
            const votoGuardado = (voteSnap.exists ? voteSnap.data() : null);
            const votoPrevio = votoGuardado && typeof votoGuardado.optionId === 'string' ? { optionId: votoGuardado.optionId } : null;
            const decision = (0, exports.decidirVoto)({ poll, votoPrevio, optionId, ahoraMs: deps.ahora() });
            if (!decision.ok)
                throw new PollError(decision.motivo);
            // Los contadores se recalculan sobre lo leído en esta misma transacción y
            // nunca bajan de cero, pase lo que pase con los datos de partida.
            const counts = Object.assign({}, ((poll && poll.counts) || {}));
            for (const [id, delta] of Object.entries(decision.incrementos)) {
                counts[id] = Math.max(0, cuenta(counts, id) + delta);
            }
            const totalPrevio = poll && typeof poll.totalVotes === 'number' && Number.isFinite(poll.totalVotes) ? poll.totalVotes : 0;
            const totalVotes = Math.max(0, totalPrevio + decision.deltaTotal);
            const ms = deps.ahora();
            const voto = { optionId, updatedAt: deps.sello(ms) };
            if (!votoPrevio)
                voto.createdAt = deps.sello(ms);
            tx.set(voteRef, voto, { merge: true });
            tx.update(postRef, { 'poll.counts': counts, 'poll.totalVotes': totalVotes });
            return { optionId, cambio: decision.cambio, counts, totalVotes };
        });
    },
});
exports.createPollEngine = createPollEngine;
/** Instancia de producción. `getFirestore()` va dentro: al Admin SDK lo inicializa `index.ts`. */
exports.pollEngine = (0, exports.createPollEngine)({
    db: () => (0, firestore_1.getFirestore)(),
    ahora: () => Date.now(),
    sello: (ms) => firestore_1.Timestamp.fromMillis(ms),
});
// ─── La callable ─────────────────────────────────────────────────────────────
const textoLimpio = (valor, maximo) => {
    if (typeof valor !== 'string')
        return '';
    const s = valor.trim();
    return s.length > maximo ? '' : s;
};
/**
 * `votePoll({ postId, optionId })` — la ÚNICA forma de que un voto llegue a
 * Firestore. No acepta índices, no acepta contadores y no acepta identidad:
 * quién vota lo dice Firebase Auth, no el cliente.
 */
exports.votePoll = (0, https_1.onCall)(OPTS, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión para votar.');
    const voterUid = request.auth.uid;
    const data = (request.data || {});
    const postId = textoLimpio(data.postId, 200);
    const optionId = textoLimpio(data.optionId, 200);
    if (!postId)
        throw new https_1.HttpsError('invalid-argument', 'Falta la publicación.');
    if (!optionId)
        throw new https_1.HttpsError('invalid-argument', 'Falta la opción.');
    try {
        return await exports.pollEngine.vote({ postId, optionId, voterUid });
    }
    catch (error) {
        if (error instanceof PollError)
            throw new https_1.HttpsError(CODIGOS[error.motivo], error.message);
        if (error instanceof PostNoEncontrado)
            throw new https_1.HttpsError('not-found', error.message);
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error('votePoll falló', error);
        throw new https_1.HttpsError('internal', 'No se pudo registrar tu voto. Inténtalo de nuevo.');
    }
});
//# sourceMappingURL=polls.js.map