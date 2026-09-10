"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptEContact = exports.requestEContact = exports.econtactEngine = exports.createEContactEngine = exports.decidirAceptacion = exports.decidirSolicitud = exports.decidirIdentidad = exports.EContactError = exports.MENSAJES = exports.idDeContacto = exports.cuentaDeIdentidad = exports.esIdentidadDePersona = exports.tipoDeIdentidad = exports.esIdentidadValida = exports.PREFIJO_PERFIL_BIZ = exports.PREFIJO_PERFIL_WEE = void 0;
/*
 * ËCONTACT / ẄCONTACT — el servidor. Las dos puertas de una conexión.
 * ---------------------------------------------------------------------------
 *
 * Una conexión es MUTUA: una identidad la pide y la otra la acepta. Las dos
 * transiciones las hace el servidor, y por la misma razón: ninguna de las dos se
 * puede comprobar entera desde las reglas de Firestore.
 *
 * POR QUÉ TAMBIÉN PEDIR ES DEL SERVIDOR
 * -------------------------------------
 * Porque hay que comprobar DE QUIÉN ES CADA IDENTIDAD, y eso se lee de `users`.
 * Las reglas no pueden: los documentos de `users` tienen id automático y se
 * buscan por el campo `uid`, y una regla puede hacer `get()` de una ruta pero no
 * una consulta. Lo único que una regla podría mirar es el prefijo —"`hidi_ABC`
 * será de la cuenta ABC"—, y eso es exactamente lo que no queremos: que el
 * cliente afirme de quién es una identidad.
 *
 * Aquí, con el Admin SDK, se lee `users` y se comprueban las dos identidades:
 * que existan, que sean de personas, de qué cuenta es cada una, y que la que
 * pide sea de quien está llamando. Después el id se calcula aquí. Un `contactId`
 * que viniera de fuera sería un sitio donde escribir a elección.
 *
 * LA IDENTIDAD ES EL PERFIL, NO LA CUENTA
 * ---------------------------------------
 * `request.auth.uid` dice de qué CUENTA es quien llama. Con cuál de sus dos caras
 * —Perfil Real o Perfil Weë— está actuando lo dice el cliente, y por eso se
 * verifica contra `users` antes de hacer nada. Las cuatro combinaciones son
 * válidas y cada una es UNA sola relación:
 *
 *     real A ↔ real B     real A ↔ Weë B     Weë A ↔ real B     Weë A ↔ Weë B
 *
 * Es el mismo reparto que en las encuestas: el cliente propone, el servidor
 * decide y escribe.
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const OPTS = { region: 'us-central1', timeoutSeconds: 30 };
const COLECCION = 'econtacts';
const PERFILES = 'users';
// ─── Las identidades ─────────────────────────────────────────────────────────
/*
 * Copia deliberada de `utils/econtactModel.ts`: el cliente y el servidor viven
 * en proyectos de TypeScript distintos y no comparten módulos. Que las dos den
 * el mismo resultado no se supone, se comprueba en `econtact.test.mjs`.
 */
exports.PREFIJO_PERFIL_WEE = 'hidi_';
exports.PREFIJO_PERFIL_BIZ = 'biz_';
/** Una identidad no lleva `_` propio: solo el que trae su prefijo. Ver el modelo. */
const FORMA_DE_IDENTIDAD = /^(?:hidi_|biz_)?[^_/\s]+$/;
const esIdentidadValida = (id) => typeof id === 'string' && id.length > 0 && id.length <= 200 && FORMA_DE_IDENTIDAD.test(id);
exports.esIdentidadValida = esIdentidadValida;
const tipoDeIdentidad = (id) => {
    if (typeof id === 'string' && id.startsWith(exports.PREFIJO_PERFIL_WEE))
        return 'wee';
    if (typeof id === 'string' && id.startsWith(exports.PREFIJO_PERFIL_BIZ))
        return 'biz';
    return 'real';
};
exports.tipoDeIdentidad = tipoDeIdentidad;
const esIdentidadDePersona = (id) => (0, exports.esIdentidadValida)(id) && (0, exports.tipoDeIdentidad)(id) !== 'biz';
exports.esIdentidadDePersona = esIdentidadDePersona;
/**
 * De qué cuenta es esta identidad, según su documento de `users`. null si no se
 * puede afirmar. Se exige que el documento exista y que diga lo mismo que el uid:
 * para el Perfil Weë, el prefijo y `linkedAccountId` tienen que coincidir.
 */
const cuentaDeIdentidad = (id, perfil) => {
    if (!(0, exports.esIdentidadValida)(id))
        return null;
    const tipo = (0, exports.tipoDeIdentidad)(id);
    if (tipo === 'biz')
        return null;
    if (!perfil || perfil.uid !== id)
        return null;
    if (tipo === 'real') {
        if (perfil.profileType === 'hidi' || perfil.profileType === 'biz')
            return null;
        return id;
    }
    const vinculo = perfil.linkedAccountId;
    if (perfil.profileType !== 'hidi')
        return null;
    if (typeof vinculo !== 'string' || !vinculo || !(0, exports.esIdentidadValida)(vinculo))
        return null;
    if ((0, exports.tipoDeIdentidad)(vinculo) !== 'real')
        return null;
    if (`${exports.PREFIJO_PERFIL_WEE}${vinculo}` !== id)
        return null;
    return vinculo;
};
exports.cuentaDeIdentidad = cuentaDeIdentidad;
// ─── La pareja ───────────────────────────────────────────────────────────────
/**
 * El id del documento de una pareja: las dos identidades ordenadas y unidas.
 * Conmutativo, así que da lo mismo quién pregunte.
 */
const idDeContacto = (a, b) => {
    if (!(0, exports.esIdentidadDePersona)(a) || !(0, exports.esIdentidadDePersona)(b) || a === b) {
        throw new Error('Un ËContact necesita dos identidades de persona distintas.');
    }
    return a < b ? `${a}_${b}` : `${b}_${a}`;
};
exports.idDeContacto = idDeContacto;
exports.MENSAJES = {
    'sin-relacion': 'No hay ninguna solicitud que aceptar.',
    'relacion-invalida': 'Esta solicitud no es válida.',
    'no-la-recibiste': 'Solo puede aceptar quien recibió la solicitud.',
    'ya-sois-contactos': 'Ya sois ËContacts.',
    'identidad-invalida': 'Ese perfil no es válido.',
    'identidad-desconocida': 'Ese perfil no existe.',
    'identidad-ajena': 'Ese perfil no es tuyo.',
    'misma-persona': 'No puedes conectar contigo misma.',
    'ya-existe': 'Ya hay una relación con este perfil.',
};
const CODIGOS = {
    'sin-relacion': 'not-found',
    'relacion-invalida': 'failed-precondition',
    'no-la-recibiste': 'permission-denied',
    'ya-sois-contactos': 'failed-precondition',
    'identidad-invalida': 'invalid-argument',
    'identidad-desconocida': 'not-found',
    'identidad-ajena': 'permission-denied',
    'misma-persona': 'invalid-argument',
    'ya-existe': 'failed-precondition',
};
class EContactError extends Error {
    constructor(motivo) {
        super(exports.MENSAJES[motivo]);
        this.motivo = motivo;
        this.name = 'EContactError';
    }
}
exports.EContactError = EContactError;
/**
 * ¿Puede esta cuenta actuar como esta identidad?
 *
 * Dos condiciones, y hacen falta las dos: que `users` diga que la identidad es de
 * esa cuenta, y que la identidad sea una de las que esa cuenta puede tener. La
 * primera es la fuente canónica; la segunda cierra el caso de un documento que se
 * contradiga a sí mismo.
 */
const decidirIdentidad = (args) => {
    const { identidad, perfil, cuentaDeLaSesion, debeSerMia } = args;
    if (!(0, exports.esIdentidadDePersona)(identidad))
        return { ok: false, motivo: 'identidad-invalida' };
    const cuenta = (0, exports.cuentaDeIdentidad)(identidad, perfil);
    if (!cuenta)
        return { ok: false, motivo: 'identidad-desconocida' };
    if (debeSerMia && cuenta !== cuentaDeLaSesion)
        return { ok: false, motivo: 'identidad-ajena' };
    return { ok: true };
};
exports.decidirIdentidad = decidirIdentidad;
/**
 * ¿Se puede abrir una solicitud entre estas dos identidades ya resueltas?
 *
 * La comprobación que importa es la última: dos identidades de la MISMA cuenta no
 * se conectan entre sí. El Perfil Real y el Perfil Weë de una persona son esa
 * misma persona, y agregarse a uno mismo no es una conexión.
 */
const decidirSolicitud = (args) => {
    const { de, para, existente } = args;
    if (de.identity === para.identity)
        return { ok: false, motivo: 'misma-persona' };
    if (de.accountUid === para.accountUid)
        return { ok: false, motivo: 'misma-persona' };
    if (existente)
        return { ok: false, motivo: 'ya-existe' };
    return { ok: true };
};
exports.decidirSolicitud = decidirSolicitud;
/**
 * ¿Puede esta identidad aceptar esta solicitud?
 *
 * Todo lo que el cliente NO puede garantizar: que la relación exista, que siga
 * pendiente y que quien acepta sea EXACTAMENTE la identidad que la recibió. Que
 * sea de tu cuenta no basta: una solicitud dirigida a tu Perfil Weë no la acepta
 * tu Perfil Real.
 */
const decidirAceptacion = (args) => {
    const { doc, yo, otro } = args;
    if (!doc || typeof doc !== 'object')
        return { ok: false, motivo: 'sin-relacion' };
    const users = doc.users;
    // La pareja del documento tiene que ser exactamente estas dos identidades.
    if (!Array.isArray(users) ||
        users.length !== 2 ||
        !users.includes(yo) ||
        !users.includes(otro) ||
        typeof doc.requestedBy !== 'string' ||
        typeof doc.requestedTo !== 'string' ||
        doc.requestedBy === doc.requestedTo ||
        !users.includes(doc.requestedBy) ||
        !users.includes(doc.requestedTo)) {
        return { ok: false, motivo: 'relacion-invalida' };
    }
    if (doc.status === 'accepted')
        return { ok: false, motivo: 'ya-sois-contactos' };
    if (doc.status !== 'pending')
        return { ok: false, motivo: 'relacion-invalida' };
    if (doc.requestedTo !== yo)
        return { ok: false, motivo: 'no-la-recibiste' };
    return { ok: true };
};
exports.decidirAceptacion = decidirAceptacion;
const createEContactEngine = (deps) => {
    /** El documento de `users` de una identidad. Se busca por el campo, no por el id. */
    const leerPerfil = async (identidad) => {
        const snap = await deps.db().collection(PERFILES).where('uid', '==', identidad).limit(1).get();
        return snap.empty ? null : snap.docs[0].data();
    };
    /** Comprueba una identidad contra `users` y devuelve de qué cuenta es. */
    const resolver = async (identidad, cuentaDeLaSesion, debeSerMia) => {
        if (!(0, exports.esIdentidadDePersona)(identidad))
            throw new EContactError('identidad-invalida');
        const perfil = await leerPerfil(identidad);
        const decision = (0, exports.decidirIdentidad)({ identidad, perfil, cuentaDeLaSesion, debeSerMia });
        if (!decision.ok)
            throw new EContactError(decision.motivo);
        return {
            identity: identidad,
            accountUid: (0, exports.cuentaDeIdentidad)(identidad, perfil),
            type: (0, exports.tipoDeIdentidad)(identidad),
        };
    };
    return {
        resolver,
        /**
         * Abre una solicitud entre dos identidades.
         *
         * Nace SIEMPRE en `pending`. La escritura va dentro de una transacción con
         * `create`, así que dos peticiones simultáneas no pueden dejar dos documentos:
         * la segunda choca con el que ya está.
         */
        request: async (args) => {
            const { cuentaDeLaSesion, desdeIdentidad, haciaIdentidad } = args;
            // La mía tiene que ser mía. La otra solo tiene que existir y ser de persona.
            const de = await resolver(desdeIdentidad, cuentaDeLaSesion, true);
            const para = await resolver(haciaIdentidad, cuentaDeLaSesion, false);
            const contactId = (0, exports.idDeContacto)(de.identity, para.identity);
            const db = deps.db();
            const ref = db.collection(COLECCION).doc(contactId);
            return db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                const existente = snap.exists ? (snap.data() || {}) : null;
                const decision = (0, exports.decidirSolicitud)({ de, para, existente });
                if (!decision.ok)
                    throw new EContactError(decision.motivo);
                const users = de.identity < para.identity ? [de.identity, para.identity] : [para.identity, de.identity];
                tx.create(ref, {
                    users,
                    status: 'pending',
                    requestedBy: de.identity,
                    requestedTo: para.identity,
                    createdAt: deps.sello(deps.ahora()),
                });
                return { contactId, status: 'pending', users, from: de, to: para };
            });
        },
        /**
         * Convierte una solicitud pendiente en una conexión.
         *
         * Todo dentro de una transacción: se relee el documento y se decide sobre lo
         * leído, así que dos aceptaciones simultáneas no pueden colarse las dos —la
         * segunda ve `accepted` y se rechaza—. Y solo se mueven `status` y
         * `respondedAt`: la pareja y quién pidió a quién no se reescriben nunca.
         */
        accept: async (args) => {
            const { cuentaDeLaSesion, comoIdentidad, otraIdentidad } = args;
            const yo = await resolver(comoIdentidad, cuentaDeLaSesion, true);
            const otro = await resolver(otraIdentidad, cuentaDeLaSesion, false);
            if (yo.accountUid === otro.accountUid)
                throw new EContactError('misma-persona');
            const contactId = (0, exports.idDeContacto)(yo.identity, otro.identity);
            const db = deps.db();
            const ref = db.collection(COLECCION).doc(contactId);
            return db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists)
                    throw new EContactError('sin-relacion');
                const doc = (snap.data() || {});
                const decision = (0, exports.decidirAceptacion)({ doc, yo: yo.identity, otro: otro.identity });
                if (!decision.ok)
                    throw new EContactError(decision.motivo);
                tx.update(ref, { status: 'accepted', respondedAt: deps.sello(deps.ahora()) });
                return {
                    contactId,
                    status: 'accepted',
                    users: doc.users,
                    // Quien acepta es `yo`; la solicitud la había abierto `otro`.
                    from: otro,
                    to: yo,
                };
            });
        },
    };
};
exports.createEContactEngine = createEContactEngine;
/** Instancia de producción. `getFirestore()` va dentro: al Admin SDK lo inicializa `index.ts`. */
exports.econtactEngine = (0, exports.createEContactEngine)({
    db: () => (0, firestore_1.getFirestore)(),
    ahora: () => Date.now(),
    sello: (ms) => firestore_1.Timestamp.fromMillis(ms),
});
// ─── Las callables ───────────────────────────────────────────────────────────
const comoTexto = (valor) => {
    if (typeof valor !== 'string')
        return '';
    const s = valor.trim();
    return s.length > 0 && s.length <= 200 ? s : '';
};
const laCuentaDe = (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Inicia sesión para usar ËContact.');
    return request.auth.uid;
};
const traducir = (error, queFallo) => {
    if (error instanceof EContactError)
        throw new https_1.HttpsError(CODIGOS[error.motivo], error.message);
    if (error instanceof https_1.HttpsError)
        throw error;
    console.error(`${queFallo} falló`, error);
    throw new https_1.HttpsError('internal', 'No se pudo completar la operación. Inténtalo de nuevo.');
};
/**
 * `requestEContact({ fromIdentity, toIdentity })` — abrir una solicitud.
 *
 * `fromIdentity` es con cuál de TUS perfiles la abres; se comprueba contra
 * `users` que sea tuyo de verdad. `toIdentity` es el perfil concreto al que se la
 * mandas: el Perfil Real y el Perfil Weë de una misma persona son destinos
 * distintos, y esa distinción es justo lo que hay que conservar.
 */
exports.requestEContact = (0, https_1.onCall)(OPTS, async (request) => {
    const cuentaDeLaSesion = laCuentaDe(request);
    const data = (request.data || {});
    const desdeIdentidad = comoTexto(data.fromIdentity);
    const haciaIdentidad = comoTexto(data.toIdentity);
    if (!desdeIdentidad)
        throw new https_1.HttpsError('invalid-argument', 'Falta con qué perfil conectas.');
    if (!haciaIdentidad)
        throw new https_1.HttpsError('invalid-argument', 'Falta el perfil con el que conectar.');
    try {
        return await exports.econtactEngine.request({ cuentaDeLaSesion, desdeIdentidad, haciaIdentidad });
    }
    catch (error) {
        return traducir(error, 'requestEContact');
    }
});
/**
 * `acceptEContact({ asIdentity, otherIdentity })` — la ÚNICA forma de que una
 * solicitud pase a ser una conexión.
 *
 * `asIdentity` es la identidad que acepta, y tiene que ser exactamente la que
 * recibió la solicitud: si te la mandaron a tu Perfil Weë, no la acepta tu Perfil
 * Real aunque sean la misma cuenta.
 */
exports.acceptEContact = (0, https_1.onCall)(OPTS, async (request) => {
    const cuentaDeLaSesion = laCuentaDe(request);
    const data = (request.data || {});
    const comoIdentidad = comoTexto(data.asIdentity);
    const otraIdentidad = comoTexto(data.otherIdentity);
    if (!comoIdentidad)
        throw new https_1.HttpsError('invalid-argument', 'Falta con qué perfil aceptas.');
    if (!otraIdentidad)
        throw new https_1.HttpsError('invalid-argument', 'Falta el perfil de quien te la envió.');
    try {
        return await exports.econtactEngine.accept({ cuentaDeLaSesion, comoIdentidad, otraIdentidad });
    }
    catch (error) {
        return traducir(error, 'acceptEContact');
    }
});
//# sourceMappingURL=econtact.js.map