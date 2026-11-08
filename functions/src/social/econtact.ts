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
import {
  BLOQUEOS, INTENTOS_BLOQUEADOS, LIMITE_DE_INTENTOS_BLOQUEADOS, PARES_BLOQUEADOS, claveDeIntentos, claveDePar, claveDeRelacion,
} from './bloqueosIndice';
import type { OperacionDeContacto } from './bloqueosIndice';
/* La ventana fija que ya acota los avisos, reutilizada para el límite de intentos bloqueados (un solo mecanismo). */
import { cupoDeAvisos } from './avisos';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

const COLECCION = 'econtacts';
const PERFILES = 'users';

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

/** Una identidad no lleva `_` propio: solo el que trae su prefijo. Ver el modelo. */
const FORMA_DE_IDENTIDAD = /^(?:hidi_)?[^_/\s]+$/;

export const esIdentidadValida = (id?: unknown): boolean =>
  typeof id === 'string' && id.length > 0 && id.length <= 200 && FORMA_DE_IDENTIDAD.test(id);

export const tipoDeIdentidad = (id?: string | null): TipoDeIdentidad =>
  (typeof id === 'string' && id.startsWith(PREFIJO_PERFIL_WEE) ? 'wee' : 'real');

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

/**
 * EL RECHAZO GENÉRICO: el que recibe una solicitud entre dos cuentas con un bloqueo y, también, cualquier solicitud de
 * una cuenta que agotó el límite de intentos bloqueados. Es el mismo en los dos casos, a propósito: no dice que hay un
 * bloqueo, ni quién lo puso, ni de qué cuenta es ninguna cara (docs/WEETALK-BLOQUEO.md § 4.7).
 */
export const RECHAZO_GENERICO: Decision = Object.freeze({ ok: false as const, motivo: 'relacion-invalida' as const });

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
}): Decision => {
  const { identidad, perfil, cuentaDeLaSesion, debeSerMia } = args;

  if (!esIdentidadDePersona(identidad as string)) return { ok: false, motivo: 'identidad-invalida' };
  const cuenta = cuentaDeIdentidad(identidad as string, perfil);
  if (!cuenta) return { ok: false, motivo: 'identidad-desconocida' };
  if (debeSerMia && cuenta !== cuentaDeLaSesion) return { ok: false, motivo: 'identidad-ajena' };
  return { ok: true };
};

/**
 * ¿Se puede abrir una solicitud entre estas dos identidades ya resueltas?
 *
 * La comprobación que importa es la última: dos identidades de la MISMA cuenta no
 * se conectan entre sí. El Perfil Real y el Perfil Weë de una persona son esa
 * misma persona, y agregarse a uno mismo no es una conexión.
 */
export const decidirSolicitud = (args: {
  de: IdentidadResuelta;
  para: IdentidadResuelta;
  existente: EContactDoc | null | undefined;
  /** Si hay un bloqueo de contactos entre las dos cuentas, en cualquier sentido (docs/WEETALK-BLOQUEO.md). */
  bloqueo?: boolean;
}): Decision => {
  const { de, para, existente } = args;
  if (de.identity === para.identity) return { ok: false, motivo: 'misma-persona' };
  if (de.accountUid === para.accountUid) return { ok: false, motivo: 'misma-persona' };
  if (existente) return { ok: false, motivo: 'ya-existe' };
  /*
   * BLOQUEO DE CONTACTOS: entre dos cuentas con un bloqueo no se abre ninguna solicitud, desde ninguna de sus caras ni
   * hacia ninguna. El motivo es el genérico de «no válida»: no le dice a nadie que hay un bloqueo, ni de qué cuenta es
   * ninguna cara. Va el último, así que todo lo que ya se rechazaba se sigue rechazando igual.
   */
  if (args.bloqueo) return RECHAZO_GENERICO;
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
export const decidirAceptacion = (args: {
  doc: EContactDoc | null | undefined;
  yo: string;
  otro: string;
  /** Si hay un bloqueo de contactos entre las dos cuentas, en cualquier sentido (docs/WEETALK-BLOQUEO.md). */
  bloqueo?: boolean;
}): Decision => {
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

  /*
   * BLOQUEO DE CONTACTOS: una solicitud que siga en pie entre dos cuentas con un bloqueo no se acepta (al bloquear se
   * anulan, pero una que se cruzara con el bloqueo quedaría inutilizada igual). Mismo motivo genérico que al pedir.
   */
  if (args.bloqueo) return RECHAZO_GENERICO;

  return { ok: true };
};

// ─── El motor, con Firestore inyectado ───────────────────────────────────────

export interface EContactDeps {
  db: () => any;
  ahora: () => number;
  sello: (ms: number) => unknown;
}

export interface ResultadoRelacion {
  contactId: string;
  status: 'pending' | 'accepted';
  users: string[];
  from: IdentidadResuelta;
  to: IdentidadResuelta;
}

/*
 * LO QUE UNA CALLABLE DE ËCONTACT DEVUELVE AL CLIENTE (privacidad STRICT, decisión del dueño del 2026-11-07).
 *
 * El motor trabaja con la CUENTA de cada identidad (la necesita para el bloqueo, el límite y saber que no es la misma
 * persona), pero eso NO sale del servidor: devolver `accountUid` le daba a quien pide la cuenta de la otra persona,
 * que es justo el vínculo entre sus dos caras. Al cliente le basta la relación con las identidades que ya conoce
 * (la suya y la que eligió). Sin cuentas, sin tipos ajenos, sin nada que no tuviera ya.
 */
export interface RelacionPublica {
  contactId: string;
  status: 'pending' | 'accepted';
  from: { identity: string };
  to: { identity: string };
}
export const relacionPublica = (r: ResultadoRelacion): RelacionPublica => ({
  contactId: r.contactId,
  status: r.status,
  from: { identity: r.from.identity },
  to: { identity: r.to.identity },
});

export const createEContactEngine = (deps: EContactDeps) => {
  /** El documento de `users` de una identidad. Se busca por el campo, no por el id. */
  const leerPerfil = async (identidad: string): Promise<PerfilDeIdentidad | null> => {
    const snap = await deps.db().collection(PERFILES).where('uid', '==', identidad).limit(1).get();
    return snap.empty ? null : (snap.docs[0].data() as PerfilDeIdentidad);
  };

  /** Comprueba una identidad contra `users` y devuelve de qué cuenta es. */
  const resolver = async (
    identidad: unknown,
    cuentaDeLaSesion: string,
    debeSerMia: boolean
  ): Promise<IdentidadResuelta> => {
    if (!esIdentidadDePersona(identidad as string)) throw new EContactError('identidad-invalida');
    const perfil = await leerPerfil(identidad as string);
    const decision = decidirIdentidad({ identidad, perfil, cuentaDeLaSesion, debeSerMia });
    if (!decision.ok) throw new EContactError(decision.motivo);
    return {
      identity: identidad as string,
      accountUid: cuentaDeIdentidad(identidad as string, perfil) as string,
      type: tipoDeIdentidad(identidad as string),
    };
  };

  /** Lo que devuelve cada transacción: la relación, o el motivo del rechazo (que se lanza fuera de ella). */
  type Resultado = { relacion?: ResultadoRelacion; rechazo?: MotivoRechazo };
  /** Lo mínimo que el límite usa de la transacción y de la base (sin `any`). */
  type TransaccionDeContactos = {
    get: (ref: unknown) => Promise<{ exists: boolean; data: () => unknown }>;
    set: (ref: unknown, datos: Record<string, unknown>) => unknown;
  };
  type BaseDeContactos = { collection: (ruta: string) => { doc: (id: string) => unknown } };

  /*
   * EL LÍMITE CONTRA INTENTOS REITERADOS (docs/WEETALK-BLOQUEO.md § 4.7; decisión del dueño del 2026-11-07, «A»), dentro de
   * la MISMA transacción de cada puerta.
   *
   * Solo cuenta un intento rechazado porque la cuenta de DESTINO bloqueó a la que llama, y se cuenta por CUENTA y por
   * operación (`pedir` o `aceptar`): las dos caras comparten cupo, así que cambiar de cara no lo reinicia. Máximo 5 por hora.
   *
   * El cupo NO cambia ninguna respuesta —el rechazo a quien te bloqueó es el genérico de siempre— y NO limita nada más: las
   * solicitudes a otras personas, los mensajes y las conversaciones siguen igual aunque esté agotado. Lo que hace es acotar
   * el trabajo: pasado el quinto intento de la ventana ya no se escribe nada, así que nadie puede inflar el contador ni
   * usarlo para escribir sin fin. Caduca solo, no suspende, no avisa a nadie y no guarda quién es el destino. La clave es de
   * quien intenta: nadie puede gastar el cupo de otro. Sin bloqueo hacia quien llama, ni se lee.
   */
  const leerIntentos = async (
    tx: TransaccionDeContactos,
    db: BaseDeContactos,
    cuenta: string,
    operacion: OperacionDeContacto,
    cuentaDestino: string,
    hayBloqueo: boolean
  ): Promise<{ apuntar: () => void }> => {
    const elDestinoLaBloqueo = hayBloqueo
      ? (await tx.get(db.collection(BLOQUEOS).doc(claveDeRelacion(cuentaDestino, cuenta)))).exists
      : false;
    if (!elDestinoLaBloqueo) return { apuntar: () => undefined };
    const refIntentos = db.collection(INTENTOS_BLOQUEADOS).doc(claveDeIntentos(cuenta, operacion));
    const guardado = await tx.get(refIntentos);
    const ahora = deps.ahora();
    const cupo = cupoDeAvisos(guardado.exists ? guardado.data() : null, ahora, LIMITE_DE_INTENTOS_BLOQUEADOS);
    return {
      /* Se llama solo cuando la puerta rechaza: apunta el intento mientras quede cupo; agotado, no escribe nada. */
      apuntar: () => {
        if (cupo.permitido) {
          tx.set(refIntentos, { cuenta, operacion, inicio: cupo.estado.inicio, usados: cupo.estado.usados, actualizadoEn: deps.sello(ahora) });
        }
      },
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
    request: async (args: {
      cuentaDeLaSesion: string;
      desdeIdentidad: unknown;
      haciaIdentidad: unknown;
    }): Promise<ResultadoRelacion> => {
      const { cuentaDeLaSesion, desdeIdentidad, haciaIdentidad } = args;

      // La mía tiene que ser mía. La otra solo tiene que existir y ser de persona.
      const de = await resolver(desdeIdentidad, cuentaDeLaSesion, true);
      const para = await resolver(haciaIdentidad, cuentaDeLaSesion, false);

      const contactId = idDeContacto(de.identity, para.identity);
      const db = deps.db();
      const ref = db.collection(COLECCION).doc(contactId);

      const resultado: Resultado = await db.runTransaction(async (tx: any) => {
        const snap = await tx.get(ref);
        const existente = snap.exists ? ((snap.data() || {}) as EContactDoc) : null;
        /* El índice del bloqueo de contactos (bloqueosIndice.ts): existe si `de` no puede contactar con `para`. */
        const bloqueo = await tx.get(db.collection(PARES_BLOQUEADOS).doc(claveDePar(de.identity, para.identity)));
        const intentos = await leerIntentos(tx, db, de.accountUid, 'pedir', para.accountUid, bloqueo.exists);

        const decision = decidirSolicitud({ de, para, existente, bloqueo: bloqueo.exists });
        if (!decision.ok) {
          intentos.apuntar();
          return { rechazo: decision.motivo };
        }

        const users = de.identity < para.identity ? [de.identity, para.identity] : [para.identity, de.identity];
        tx.create(ref, {
          users,
          status: 'pending',
          requestedBy: de.identity,
          requestedTo: para.identity,
          createdAt: deps.sello(deps.ahora()),
        });

        return { relacion: { contactId, status: 'pending' as const, users, from: de, to: para } };
      });
      /* El rechazo se lanza FUERA de la transacción: así el intento que cuenta para el límite queda apuntado. */
      if (resultado.rechazo) throw new EContactError(resultado.rechazo);
      return resultado.relacion as ResultadoRelacion;
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

      const yo = await resolver(comoIdentidad, cuentaDeLaSesion, true);
      const otro = await resolver(otraIdentidad, cuentaDeLaSesion, false);
      if (yo.accountUid === otro.accountUid) throw new EContactError('misma-persona');

      const contactId = idDeContacto(yo.identity, otro.identity);
      const db = deps.db();
      const ref = db.collection(COLECCION).doc(contactId);

      const resultado: Resultado = await db.runTransaction(async (tx: any) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new EContactError('sin-relacion');

        const doc = (snap.data() || {}) as EContactDoc;
        const bloqueo = await tx.get(db.collection(PARES_BLOQUEADOS).doc(claveDePar(yo.identity, otro.identity)));
        const intentos = await leerIntentos(tx, db, yo.accountUid, 'aceptar', otro.accountUid, bloqueo.exists);
        const decision = decidirAceptacion({ doc, yo: yo.identity, otro: otro.identity, bloqueo: bloqueo.exists });
        if (!decision.ok) {
          intentos.apuntar();
          return { rechazo: decision.motivo };
        }

        tx.update(ref, { status: 'accepted', respondedAt: deps.sello(deps.ahora()) });

        return {
          relacion: {
            contactId,
            status: 'accepted' as const,
            users: doc.users as string[],
            // Quien acepta es `yo`; la solicitud la había abierto `otro`.
            from: otro,
            to: yo,
          },
        };
      });
      if (resultado.rechazo) throw new EContactError(resultado.rechazo);
      return resultado.relacion as ResultadoRelacion;
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
    return relacionPublica(await econtactEngine.request({ cuentaDeLaSesion, desdeIdentidad, haciaIdentidad }));
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
    return relacionPublica(await econtactEngine.accept({ cuentaDeLaSesion, comoIdentidad, otraIdentidad }));
  } catch (error) {
    return traducir(error, 'acceptEContact');
  }
});
