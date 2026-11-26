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
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
/*
 * F4: de quién es una identidad se decide con la frontera de compatibilidad, que también sabe leer los alter egos
 * (`ent_…`) por su entidad. La frontera importa de aquí las formas heredadas; las dos solo se usan dentro de
 * funciones, así que el ciclo de módulos es inocuo.
 */
import { cuentaDelPerfilLeido } from '../identity/compatibilidad';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

const COLECCION = 'econtacts';
const PERFILES = 'users';
const AVISOS = 'notifications';

// ─── Las identidades ─────────────────────────────────────────────────────────

/*
 * Copia deliberada de `utils/econtactModel.ts`: el cliente y el servidor viven
 * en proyectos de TypeScript distintos y no comparten módulos. Que las dos den
 * el mismo resultado no se supone, se comprueba en `econtact.test.mjs`.
 */

export const PREFIJO_PERFIL_WEE = 'hidi_';

/**
 * Dos caras, y solo dos. El Perfil Biz —una tercera identidad que representaba a
 * un negocio— se ha eliminado: un negocio es una PÁGINA de la cuenta, no una
 * cara de una persona. Weë Business, el producto, sigue existiendo y pasa a
 * gestionar Páginas.
 */
export type TipoDeIdentidad = 'real' | 'wee';

/**
 * La segunda forma de un Perfil Weë (plan de alter egos, F2, 2026-11-23): el
 * alter ego cuyo `uid` ES su identificador de entidad, opaco (`ent_…`). Es el
 * mismo prefijo que `PREFIJO_DE_ID_DE_ENTIDAD` del Core. La FORMA solo dice que
 * el id está bien escrito; de quién es se LEE (`cuentaDeIdentidadLeida`).
 */
export const PREFIJO_ALTER_EGO = 'ent_';

/**
 * Una identidad no lleva `_` propio: solo el que trae su prefijo (`hidi_` o
 * `ent_`). Ver el modelo. Nada en el servidor parte un id de pareja por `_`:
 * `idDeContacto` solo une, y lo vigila `econtact.test.mjs`.
 */
const FORMA_DE_IDENTIDAD = /^(?:hidi_|ent_)?[^_/\s]+$/;

export const esIdentidadValida = (id?: unknown): boolean =>
  typeof id === 'string' && id.length > 0 && id.length <= 200 && FORMA_DE_IDENTIDAD.test(id);

/**
 * `'wee'` o `'real'` según la FORMA. Es una PISTA DE ENRUTADO, no una
 * afirmación: dice por qué camino mirar (una cara Weë no puede ser su propia
 * cuenta), y el tipo de verdad sale de `users.profileType`. Un `ent_` es
 * `'wee'` por lo mismo: nunca se trata como un Perfil Real que fuera su cuenta.
 * La propiedad jamás sale de aquí (ver `identity/compatibilidad.ts`).
 */
export const tipoDeIdentidad = (id?: string | null): TipoDeIdentidad =>
  (typeof id === 'string' && (id.startsWith(PREFIJO_PERFIL_WEE) || id.startsWith(PREFIJO_ALTER_EGO)) ? 'wee' : 'real');

export const esIdentidadDePersona = (id?: string | null): boolean => esIdentidadValida(id);

export interface PerfilDeIdentidad {
  uid?: string;
  profileType?: string;
  linkedAccountId?: string;
}

/**
 * De qué cuenta es esta identidad, según su documento de `users`. null si no se
 * puede afirmar. Se exige que el documento exista y que diga lo mismo que el uid:
 * para el Perfil Weë, el prefijo y `linkedAccountId` tienen que coincidir.
 *
 * Síncrona y SOLO para lo heredado. Un alter ego opaco (`ent_…`) no lleva
 * vínculo en su perfil —el perfil es público— y aquí da null: su cuenta se lee
 * de su entidad con `cuentaDeIdentidadLeida` (`identity/compatibilidad.ts`).
 */
export const cuentaDeIdentidad = (
  id?: string | null,
  perfil?: PerfilDeIdentidad | null
): string | null => {
  if (!esIdentidadValida(id)) return null;
  const tipo = tipoDeIdentidad(id);
  if (!perfil || perfil.uid !== id) return null;

  if (tipo === 'real') {
    /* Un tipo que este modelo no reconoce —el `'biz'` antiguo, u otro— no es de nadie. */
    if (perfil.profileType && perfil.profileType !== 'real') return null;
    return id as string;
  }

  const vinculo = perfil.linkedAccountId;
  if (perfil.profileType !== 'hidi') return null;
  if (typeof vinculo !== 'string' || !vinculo || !esIdentidadValida(vinculo)) return null;
  if (tipoDeIdentidad(vinculo) !== 'real') return null;
  if (`${PREFIJO_PERFIL_WEE}${vinculo}` !== id) return null;
  return vinculo;
};

// ─── La pareja ───────────────────────────────────────────────────────────────

/**
 * El id del documento de una pareja: las dos identidades ordenadas y unidas.
 * Conmutativo, así que da lo mismo quién pregunte.
 */
export const idDeContacto = (a: string, b: string): string => {
  if (!esIdentidadDePersona(a) || !esIdentidadDePersona(b) || a === b) {
    throw new Error('Un ËContact necesita dos identidades de persona distintas.');
  }
  return a < b ? `${a}_${b}` : `${b}_${a}`;
};

// ─── El modelo tal y como está guardado ──────────────────────────────────────

export interface EContactDoc {
  users?: string[];
  status?: string;
  requestedBy?: string;
  requestedTo?: string;
  [extra: string]: unknown;
}

// ─── Qué puede salir mal ─────────────────────────────────────────────────────

export type MotivoRechazo =
  | 'sin-relacion'
  | 'relacion-invalida'
  | 'no-la-recibiste'
  | 'ya-sois-contactos'
  | 'identidad-invalida'
  | 'identidad-desconocida'
  | 'identidad-ajena'
  | 'misma-persona'
  | 'ya-existe';

export const MENSAJES: Record<MotivoRechazo, string> = {
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

const CODIGOS: Record<MotivoRechazo, 'not-found' | 'failed-precondition' | 'permission-denied' | 'invalid-argument'> = {
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

export type Decision = { ok: true } | { ok: false; motivo: MotivoRechazo };

export class EContactError extends Error {
  constructor(public motivo: MotivoRechazo) {
    super(MENSAJES[motivo]);
    this.name = 'EContactError';
  }
}

// ─── Las decisiones, sin Firestore de por medio ──────────────────────────────

/** Una identidad ya comprobada contra `users`. */
export interface IdentidadResuelta {
  identity: string;
  accountUid: string;
  type: TipoDeIdentidad;
}

/**
 * ¿Puede esta cuenta actuar como esta identidad?
 *
 * Dos condiciones, y hacen falta las dos: que `users` diga que la identidad es de
 * esa cuenta, y que la identidad sea una de las que esa cuenta puede tener. La
 * primera es la fuente canónica; la segunda cierra el caso de un documento que se
 * contradiga a sí mismo.
 */
export const decidirIdentidad = (args: {
  identidad: unknown;
  perfil: PerfilDeIdentidad | null | undefined;
  cuentaDeLaSesion: string;
  debeSerMia: boolean;
  /**
   * La cuenta YA LEÍDA por el servidor (`cuentaDelPerfilLeido`, F4), que sabe resolver también un alter ego por su
   * entidad. Sin ella se usa el resolutor síncrono, que solo entiende lo heredado.
   */
  cuenta?: string | null;
}): Decision => {
  const { identidad, perfil, cuentaDeLaSesion, debeSerMia } = args;

  if (!esIdentidadDePersona(identidad as string)) return { ok: false, motivo: 'identidad-invalida' };
  const cuenta = 'cuenta' in args ? args.cuenta ?? null : cuentaDeIdentidad(identidad as string, perfil);
  if (!cuenta) return { ok: false, motivo: 'identidad-desconocida' };
  if (debeSerMia && cuenta !== cuentaDeLaSesion) return { ok: false, motivo: 'identidad-ajena' };
  return { ok: true };
};

/**
 * ¿Se puede abrir una solicitud entre estas dos identidades ya resueltas?
 *
 * La misma identidad nunca se conecta consigo misma. Entre dos identidades de la
 * MISMA cuenta:
 *   · Real ↔ Weë sigue bloqueado: el Perfil Real es la persona, y agregarse a uno
 *     mismo no es una conexión (además, la agenda pública del Real uniría la cara
 *     Weë con la cuenta).
 *   · Weë ↔ Weë SÍ se permite (decisión D6 del dueño, 2026-11-23, F3 del plan de
 *     alter egos): cada alter ego es un personaje con su propia lista de ẄContacts
 *     y «cada alter ego puede escribir a otro», sin que se vea que son de la misma
 *     cuenta. Desde F4 los `ent_…` se resuelven por su entidad (`cuentaDelPerfilLeido`).
 * El tipo aquí es el de una identidad YA comprobada contra `users` (`decidirIdentidad`).
 */
const entreCarasPropiasSeBloquea = (a: IdentidadResuelta, b: IdentidadResuelta): boolean =>
  !(a.type === 'wee' && b.type === 'wee');

export const decidirSolicitud = (args: {
  de: IdentidadResuelta;
  para: IdentidadResuelta;
  existente: EContactDoc | null | undefined;
}): Decision => {
  const { de, para, existente } = args;
  if (de.identity === para.identity) return { ok: false, motivo: 'misma-persona' };
  if (de.accountUid === para.accountUid && entreCarasPropiasSeBloquea(de, para)) return { ok: false, motivo: 'misma-persona' };
  if (existente) return { ok: false, motivo: 'ya-existe' };
  return { ok: true };
};

/**
 * ¿Puede esta identidad aceptar esta solicitud?
 *
 * Todo lo que el cliente NO puede garantizar: que la relación exista, que siga
 * pendiente y que quien acepta sea EXACTAMENTE la identidad que la recibió. Que
 * sea de tu cuenta no basta: una solicitud dirigida a tu Perfil Weë no la acepta
 * tu Perfil Real.
 */
export const decidirAceptacion = (args: { doc: EContactDoc | null | undefined; yo: string; otro: string }): Decision => {
  const { doc, yo, otro } = args;

  if (!doc || typeof doc !== 'object') return { ok: false, motivo: 'sin-relacion' };

  const users = doc.users;
  // La pareja del documento tiene que ser exactamente estas dos identidades.
  if (
    !Array.isArray(users) ||
    users.length !== 2 ||
    !users.includes(yo) ||
    !users.includes(otro) ||
    typeof doc.requestedBy !== 'string' ||
    typeof doc.requestedTo !== 'string' ||
    doc.requestedBy === doc.requestedTo ||
    !users.includes(doc.requestedBy) ||
    !users.includes(doc.requestedTo)
  ) {
    return { ok: false, motivo: 'relacion-invalida' };
  }

  if (doc.status === 'accepted') return { ok: false, motivo: 'ya-sois-contactos' };
  if (doc.status !== 'pending') return { ok: false, motivo: 'relacion-invalida' };

  if (doc.requestedTo !== yo) return { ok: false, motivo: 'no-la-recibiste' };

  return { ok: true };
};

// ─── El motor, con Firestore inyectado ───────────────────────────────────────

export interface EContactDeps {
  db: () => any;
  ahora: () => number;
  sello: (ms: number) => unknown;
}

/**
 * Una identidad tal y como sale hacia el cliente: SIN la cuenta.
 *
 * La cuenta de la otra persona no se devuelve nunca (F1 del plan de alter egos, 2026-11-23). Antes `to`/`from`
 * llevaban `accountUid`, el cliente lo guardaba en `notifications.recipientAccountId`, y cualquiera que conectara con
 * un Perfil Weë se llevaba el uid de la cuenta que lo controla —es decir, su Perfil Real—.
 */
export interface IdentidadPublica {
  identity: string;
  type: TipoDeIdentidad;
}

export interface ResultadoRelacion {
  contactId: string;
  status: 'pending' | 'accepted';
  users: string[];
  from: IdentidadPublica;
  to: IdentidadPublica;
}

/** Lo que el perfil de quien avisa pone en el aviso: nombre y avatar, como los avisos de siempre. */
interface PerfilLeido extends PerfilDeIdentidad {
  displayName?: unknown;
  avatarType?: unknown;
  avatarId?: unknown;
  photoURL?: unknown;
}

/** Una identidad resuelta, con su perfil a mano para escribir el aviso. Solo vive en el servidor. */
interface IdentidadConPerfil extends IdentidadResuelta {
  perfil: PerfilLeido;
}

const publica = (r: IdentidadResuelta): IdentidadPublica => ({ identity: r.identity, type: r.type });

const recorta = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : undefined;

/**
 * EL AVISO A LA OTRA PERSONA lo escribe el servidor, en la MISMA transacción que la relación (F1, 2026-11-23).
 *
 * Antes lo escribía el cliente con lo que le devolvía la callable, y para eso necesitaba la cuenta de quien recibe. Va
 * dirigido a la IDENTIDAD que recibe (`recipientId`), que es lo único que leen la campanita y el push
 * (`sendPushNotification` resuelve la cuenta en el servidor con `cuentaDeIdentidadLeida`). No lleva `recipientAccountId`.
 * Mismos campos y límites que `avisoConLaFormaDeLaApp` en `firestore.rules`.
 */
export const avisoDeEContact = (
  tipo: 'econtact_request' | 'econtact_accepted',
  para: IdentidadResuelta,
  de: IdentidadResuelta & { perfil?: PerfilLeido | null },
  sello: unknown
): Record<string, unknown> => {
  const perfil = de.perfil || {};
  const aviso: Record<string, unknown> = {
    type: tipo,
    recipientId: para.identity,
    senderId: de.identity,
    senderName: recorta(perfil.displayName, 200) || 'Weë',
    senderAvatar: recorta(perfil.photoURL, 2048),
    senderAvatarType: recorta(perfil.avatarType, 20),
    senderAvatarId: recorta(perfil.avatarId, 100),
    senderProfileType: de.type,
    read: false,
    createdAt: sello,
  };
  for (const k of Object.keys(aviso)) if (aviso[k] === undefined) delete aviso[k];
  return aviso;
};

export const createEContactEngine = (deps: EContactDeps) => {
  /** El documento de `users` de una identidad. Se busca por el campo, no por el id. */
  const leerPerfil = async (identidad: string): Promise<PerfilLeido | null> => {
    const snap = await deps.db().collection(PERFILES).where('uid', '==', identidad).limit(1).get();
    return snap.empty ? null : (snap.docs[0].data() as PerfilLeido);
  };

  /** Comprueba una identidad contra `users` y devuelve de qué cuenta es (solo para uso interno del servidor). */
  const resolverConPerfil = async (
    identidad: unknown,
    cuentaDeLaSesion: string,
    debeSerMia: boolean
  ): Promise<IdentidadConPerfil> => {
    if (!esIdentidadDePersona(identidad as string)) throw new EContactError('identidad-invalida');
    const perfil = await leerPerfil(identidad as string);
    /* Lo heredado por su vínculo; un alter ego por su entidad (F4). La cuenta NUNCA sale hacia el cliente. */
    const cuenta = await cuentaDelPerfilLeido(deps.db(), identidad, perfil);
    const decision = decidirIdentidad({ identidad, perfil, cuentaDeLaSesion, debeSerMia, cuenta });
    if (!decision.ok) throw new EContactError(decision.motivo);
    return {
      identity: identidad as string,
      accountUid: cuenta as string,
      type: tipoDeIdentidad(identidad as string),
      perfil: perfil as PerfilLeido,
    };
  };

  const resolver = async (identidad: unknown, cuentaDeLaSesion: string, debeSerMia: boolean): Promise<IdentidadResuelta> => {
    const { perfil: _perfil, ...resuelta } = await resolverConPerfil(identidad, cuentaDeLaSesion, debeSerMia);
    return resuelta;
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
    request: async (args: {
      cuentaDeLaSesion: string;
      desdeIdentidad: unknown;
      haciaIdentidad: unknown;
    }): Promise<ResultadoRelacion> => {
      const { cuentaDeLaSesion, desdeIdentidad, haciaIdentidad } = args;

      // La mía tiene que ser mía. La otra solo tiene que existir y ser de persona.
      const de = await resolverConPerfil(desdeIdentidad, cuentaDeLaSesion, true);
      const para = await resolverConPerfil(haciaIdentidad, cuentaDeLaSesion, false);

      const contactId = idDeContacto(de.identity, para.identity);
      const db = deps.db();
      const ref = db.collection(COLECCION).doc(contactId);

      return db.runTransaction(async (tx: any) => {
        const snap = await tx.get(ref);
        const existente = snap.exists ? ((snap.data() || {}) as EContactDoc) : null;

        const decision = decidirSolicitud({ de, para, existente });
        if (!decision.ok) throw new EContactError(decision.motivo);

        const users = de.identity < para.identity ? [de.identity, para.identity] : [para.identity, de.identity];
        const sello = deps.sello(deps.ahora());
        tx.create(ref, {
          users,
          status: 'pending',
          requestedBy: de.identity,
          requestedTo: para.identity,
          createdAt: sello,
        });
        // El aviso a quien la recibe, en la misma operación: si la relación no se escribe, el aviso tampoco.
        tx.create(db.collection(AVISOS).doc(), avisoDeEContact('econtact_request', para, de, sello));

        return { contactId, status: 'pending' as const, users, from: publica(de), to: publica(para) };
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
    accept: async (args: {
      cuentaDeLaSesion: string;
      comoIdentidad: unknown;
      otraIdentidad: unknown;
    }): Promise<ResultadoRelacion> => {
      const { cuentaDeLaSesion, comoIdentidad, otraIdentidad } = args;

      const yo = await resolverConPerfil(comoIdentidad, cuentaDeLaSesion, true);
      const otro = await resolverConPerfil(otraIdentidad, cuentaDeLaSesion, false);
      // Real ↔ Weë de la misma cuenta, no; Weë ↔ Weë, sí (D6, ver `decidirSolicitud`).
      if (yo.accountUid === otro.accountUid && entreCarasPropiasSeBloquea(yo, otro)) throw new EContactError('misma-persona');

      const contactId = idDeContacto(yo.identity, otro.identity);
      const db = deps.db();
      const ref = db.collection(COLECCION).doc(contactId);

      return db.runTransaction(async (tx: any) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new EContactError('sin-relacion');

        const doc = (snap.data() || {}) as EContactDoc;
        const decision = decidirAceptacion({ doc, yo: yo.identity, otro: otro.identity });
        if (!decision.ok) throw new EContactError(decision.motivo);

        const sello = deps.sello(deps.ahora());
        tx.update(ref, { status: 'accepted', respondedAt: sello });
        // Quien la pidió se entera de que ya estáis conectados, en la misma operación.
        tx.create(db.collection(AVISOS).doc(), avisoDeEContact('econtact_accepted', otro, yo, sello));

        return {
          contactId,
          status: 'accepted' as const,
          users: doc.users as string[],
          // Quien acepta es `yo`; la solicitud la había abierto `otro`. Sin cuentas: solo identidades.
          from: publica(otro),
          to: publica(yo),
        };
      });
    },
  };
};

/** Instancia de producción. `getFirestore()` va dentro: al Admin SDK lo inicializa `index.ts`. */
export const econtactEngine = createEContactEngine({
  db: () => getFirestore(),
  ahora: () => Date.now(),
  sello: (ms) => Timestamp.fromMillis(ms),
});

// ─── Las callables ───────────────────────────────────────────────────────────

const comoTexto = (valor: unknown): string => {
  if (typeof valor !== 'string') return '';
  const s = valor.trim();
  return s.length > 0 && s.length <= 200 ? s : '';
};

const laCuentaDe = (request: any): string => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Inicia sesión para usar ËContact.');
  return request.auth.uid as string;
};

const traducir = (error: unknown, queFallo: string): never => {
  if (error instanceof EContactError) throw new HttpsError(CODIGOS[error.motivo], error.message);
  if (error instanceof HttpsError) throw error;
  console.error(`${queFallo} falló`, error);
  throw new HttpsError('internal', 'No se pudo completar la operación. Inténtalo de nuevo.');
};

/**
 * `requestEContact({ fromIdentity, toIdentity })` — abrir una solicitud.
 *
 * `fromIdentity` es con cuál de TUS perfiles la abres; se comprueba contra
 * `users` que sea tuyo de verdad. `toIdentity` es el perfil concreto al que se la
 * mandas: el Perfil Real y el Perfil Weë de una misma persona son destinos
 * distintos, y esa distinción es justo lo que hay que conservar.
 */
export const requestEContact = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const data = (request.data || {}) as { fromIdentity?: unknown; toIdentity?: unknown };

  const desdeIdentidad = comoTexto(data.fromIdentity);
  const haciaIdentidad = comoTexto(data.toIdentity);
  if (!desdeIdentidad) throw new HttpsError('invalid-argument', 'Falta con qué perfil conectas.');
  if (!haciaIdentidad) throw new HttpsError('invalid-argument', 'Falta el perfil con el que conectar.');

  try {
    return await econtactEngine.request({ cuentaDeLaSesion, desdeIdentidad, haciaIdentidad });
  } catch (error) {
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
export const acceptEContact = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const data = (request.data || {}) as { asIdentity?: unknown; otherIdentity?: unknown };

  const comoIdentidad = comoTexto(data.asIdentity);
  const otraIdentidad = comoTexto(data.otherIdentity);
  if (!comoIdentidad) throw new HttpsError('invalid-argument', 'Falta con qué perfil aceptas.');
  if (!otraIdentidad) throw new HttpsError('invalid-argument', 'Falta el perfil de quien te la envió.');

  try {
    return await econtactEngine.accept({ cuentaDeLaSesion, comoIdentidad, otraIdentidad });
  } catch (error) {
    return traducir(error, 'acceptEContact');
  }
});
