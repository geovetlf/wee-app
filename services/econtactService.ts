/*
 * ËCONTACT / ẄCONTACT — el servicio.
 *
 * Las conexiones de Weë entre personas. Una relación mutua: alguien la pide y
 * la otra parte la acepta. Mientras no acepta, hay una solicitud y nada más.
 *
 * Colección `econtacts`, un solo documento por pareja, con el id calculado a
 * partir de las dos identidades ordenadas. Así no puede haber dos filas para la
 * misma relación ni hace falta preguntar dos veces para saber si existe.
 *
 * CON QUÉ IDENTIDAD ACTÚAS
 * ------------------------
 * Una cuenta tiene hasta dos caras de persona, y cada una lleva su propia agenda:
 *
 *     Perfil Real  →  ËContact
 *     Perfil Weë   →  ẄContact
 *
 * Por eso todas las operaciones piden `comoIdentidad`: cuál de tus perfiles está
 * haciendo esto. No se adivina del perfil activo porque el servicio no sabe de
 * React, y no se aplasta contra la cuenta porque entonces las dos agendas serían
 * la misma —que es justo lo que no queremos—.
 *
 * Pasar la identidad por parámetro no la hace tuya: `esMia()` comprueba aquí que
 * sea una de las de tu sesión, y el servidor la vuelve a comprobar contra `users`,
 * que es la fuente que manda. Esa segunda es la que cuenta.
 *
 * QUIÉN ESCRIBE
 * -------------
 * Pedir y aceptar son del SERVIDOR, por callable. Las dos necesitan saber de quién
 * es cada identidad, y eso se lee de `users`: las reglas no pueden consultar, así
 * que desde ellas lo único comprobable sería el prefijo del uid —o sea, lo que
 * afirma el cliente—. Retirar, rechazar y eliminar sí son del cliente: son
 * borrados, y que participes se comprueba con lo que ya hay guardado.
 *
 * UNA SOLA CONSULTA
 * -----------------
 * Todo lo de una identidad —contactos, solicitudes recibidas, enviadas y el
 * contador— sale de la misma consulta: las relaciones donde participa. Se reparte
 * en el cliente con `utils/econtactModel.ts`, que es también lo que ejecutan las
 * pruebas. Sin índices nuevos.
 *
 * LO QUE NO HACE
 * --------------
 * No escribe `econtactsCount` en el perfil. Ese contador lo prohíben las reglas
 * al cliente a propósito: cuando haga falta guardarlo, lo escribirá el servidor.
 *
 * Los seguimientos (`follows`) son otro sistema: su cliente (`followsService`/`useFollow`) no lo usaba nadie y se
 * retiró en el cierre del 2026-10-01; la colección y su regla siguen (firestore.rules → follows).
 */
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../config/firebase';
import { notificationService } from './notificationService';
import type { Traductor } from '../i18n/traducir';
import { mensajeDelServidor } from '../i18n/servidor';
import {
  EContactDoc,
  ErrorDeEContact,
  EstadoEntre,
  PerfilDeIdentidad,
  contactosDe,
  contarContactos,
  elOtro,
  esIdentidadDePersona,
  estadoEntre,
  identidadEsDeLaCuenta,
  identidadesDeCuenta,
  idDeContacto,
  nombreDeLista,
  puedeAceptar,
  puedeCancelar,
  puedeEliminar,
  solicitudesEnviadas,
  solicitudesRecibidas,
  tipoDeIdentidad,
} from '../utils/econtactModel';

const COLECCION = 'econtacts';

/*
 * LOS ERRORES QUE LLEGAN A LA PANTALLA LLEVAN SU CLAVE.
 *
 * Este archivo es un servicio y aquí no hay traductor. El mensaje en español se
 * queda para los registros y las pruebas; lo que ve la persona sale de la
 * clave, en su idioma, con `mensajeDeEContact`. Lo que contesta el servidor
 * (`functions/src/social/econtact.ts`) viene en español y se reconoce contra su
 * catálogo para decirlo en el idioma de quien mira (`mensajeDelServidor`); lo que
 * no se reconoce, en otro idioma, no se dice.
 *
 * La clase vive en el modelo (`utils/econtactModel.ts`), que también lanza los
 * suyos —una pareja que no vale— y no puede importar nada.
 */
export { ErrorDeEContact };

export const mensajeDeEContact = (error: unknown, t: Traductor | ((clave: string) => string), locale: string): string | undefined => {
  if (error instanceof ErrorDeEContact) return t(error.clave);
  /* El idioma es obligatorio: sin él, lo que se enseñaba era el `error.message` del servidor, en español. */
  return mensajeDelServidor(error, { t: t as Traductor, locale });
};

/** La cuenta de quien está usando Weë. null si no hay sesión. */
const miCuenta = (): string | null => auth?.currentUser?.uid || null;

/** Las identidades de persona que puede usar esta sesión. */
const misIdentidades = (): string[] => identidadesDeCuenta(miCuenta());

/** ¿Esta identidad es de mi sesión? Comprobación local; la que manda es la del servidor. */
const esMia = (identidad?: string | null): boolean => identidadEsDeLaCuenta(identidad, miCuenta());

const exigirIdentidadPropia = (comoIdentidad: string): string => {
  if (!miCuenta()) throw new ErrorDeEContact('econtact.errSignIn', 'Inicia sesión para usar ËContact.');
  if (!esMia(comoIdentidad)) throw new ErrorDeEContact('econtact.errNotYours', 'Ese perfil no es tuyo.');
  return comoIdentidad;
};

const exigirIdentidadAjena = (otraIdentidad: string): string => {
  if (!esIdentidadDePersona(otraIdentidad)) throw new ErrorDeEContact('econtact.errNotAPerson', 'Ese perfil no puede tener ËContacts.');
  return otraIdentidad;
};

const refDe = (a: string, b: string) => doc(db, COLECCION, idDeContacto(a, b));

/*
 * ¿HAY RELACIÓN ENTRE ESTAS DOS IDENTIDADES? null si no.
 *
 * NO HABERLA ES UNA RESPUESTA, NO UN ERROR — y hay que traducirla, porque
 * Firestore no la da así.
 *
 * La regla de lectura es `resource.data.users.hasAny(misIdentidades())`. Cuando
 * el documento no existe, `resource` es null, `resource.data` no se puede
 * evaluar y la regla DENIEGA. Es lo correcto: de algo que no existe no se puede
 * demostrar que sea tuyo. Pero llega como `permission-denied`, y esa es la
 * respuesta normal a "¿estoy conectada con esta persona?" para casi todo el
 * mundo con quien te cruzas.
 *
 * Sin esto, abrir el perfil de alguien con quien no tienes relación —el caso
 * mayoritario— lanzaba una excepción que la pantalla tenía que capturar para
 * enseñar lo correcto. Funcionaba por el `catch`, no por la respuesta.
 *
 * POR QUÉ ESTE `catch` NO TAPA NADA. La ruta se calcula con `idDeContacto`, que
 * SIEMPRE incluye una identidad tuya —las dos entradas ya se comprobaron—, y las
 * reglas derivan las tuyas igual. Así que si el documento existe, siempre lo
 * puedes leer: en esta ruta, un `permission-denied` solo puede significar que no
 * está. Cualquier otro error se relanza; aquí no se traga un fallo de red ni un
 * problema de verdad.
 *
 * Las reglas no se tocan. Relajarlas para documentos inexistentes dejaría sondear
 * qué parejas existen y cuáles no.
 */
const leerDoc = async (a: string, b: string): Promise<EContactDoc | null> => {
  try {
    const snap = await getDoc(refDe(a, b));
    return snap.exists() ? (snap.data() as EContactDoc) : null;
  } catch (error) {
    if ((error as { code?: string })?.code === 'permission-denied') return null;
    throw error;
  }
};

/** Todas las relaciones de UNA identidad, aceptadas o no. */
const relacionesDe = async (identidad: string): Promise<EContactDoc[]> => {
  const snap = await getDocs(query(collection(db, COLECCION), where('users', 'array-contains', identidad)));
  return snap.docs.map((d) => d.data() as EContactDoc);
};

type PerfilLeido = PerfilDeIdentidad & {
  displayName?: string;
  avatarType?: string;
  avatarId?: string;
  photoURL?: string;
};

/**
 * El documento de `users` de una identidad. Se busca por el campo `uid`.
 *
 * Se usa el primero y solo el primero, así que se pide uno: sin `orderBy`, Firestore ordena por el id del documento
 * con y sin `limit`, de modo que `limit(1)` devuelve exactamente el mismo que antes era `docs[0]`.
 */
const perfilDe = async (identidad: string): Promise<PerfilLeido | null> => {
  const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', identidad), limit(1)));
  return (snap.docs[0]?.data() as PerfilLeido | undefined) || null;
};

/*
 * EL AVISO A LA OTRA PERSONA, por el sistema de notificaciones de siempre.
 *
 * Va dirigido a la IDENTIDAD que recibe, no a su cuenta: quien te escribe al
 * Perfil Weë te escribe a ese perfil, y ahí es donde tiene que aparecer. Se
 * guarda también la cuenta, que es lo que hace falta para un push y no se puede
 * deducir del uid del perfil.
 *
 * Nunca hace fallar la operación: si la conexión se hizo y el aviso no sale, la
 * conexión sigue hecha. Al revés sería peor.
 */
const avisar = async (
  tipo: 'solicitud' | 'aceptada',
  paraIdentidad: string,
  paraCuenta: string | undefined,
  desdeIdentidad: string
): Promise<void> => {
  try {
    const mio = await perfilDe(desdeIdentidad);
    const nombre = mio?.displayName || 'Alguien';
    const avatar = { type: mio?.avatarType, id: mio?.avatarId, url: mio?.photoURL };
    const extra = {
      recipientAccountId: paraCuenta,
      senderProfileType: tipoDeIdentidad(desdeIdentidad),
    };
    if (tipo === 'solicitud') {
      await notificationService.createEContactRequestNotification(paraIdentidad, desdeIdentidad, nombre, avatar, extra);
    } else {
      await notificationService.createEContactAcceptedNotification(paraIdentidad, desdeIdentidad, nombre, avatar, extra);
    }
  } catch (error) {
    console.warn('ËContact: no se pudo avisar a la otra persona', error);
  }
};

/** Lo que devuelven las dos callables del servidor. */
interface RespuestaRelacion {
  contactId: string;
  status: 'pending' | 'accepted';
  users: string[];
  from: { identity: string; accountUid: string; type: string };
  to: { identity: string; accountUid: string; type: string };
}

const llamar = async (nombre: 'requestEContact' | 'acceptEContact', datos: Record<string, string>) => {
  if (!functions) throw new ErrorDeEContact('econtact.errOffline', 'No se pudo conectar con Weë.');
  const fn = httpsCallable<Record<string, string>, RespuestaRelacion>(functions, nombre, { timeout: 30_000 });
  const { data } = await fn(datos);
  return data;
};

export const econtactService = {
  /** La cuenta de la sesión. Expuesta para poder comprobarlo. */
  miCuenta,
  /** Las identidades de persona que puede usar esta sesión. */
  misIdentidades,
  esMia,
  /** Cómo se llama la agenda de una identidad: ËContact o ẄContact. */
  nombreDeLista,

  // ─── Escribir ──────────────────────────────────────────────────────────────

  /**
   * Pedir conexión desde uno de tus perfiles a un perfil concreto de otra persona.
   *
   * Lo hace el servidor: solo él puede comprobar contra `users` de quién es cada
   * identidad. Nace como solicitud pendiente, nunca como conexión.
   */
  enviarSolicitud: async (comoIdentidad: string, otraIdentidad: string): Promise<void> => {
    const yo = exigirIdentidadPropia(comoIdentidad);
    const otra = exigirIdentidadAjena(otraIdentidad);
    const hecho = await llamar('requestEContact', { fromIdentity: yo, toIdentity: otra });
    await avisar('solicitud', hecho.to.identity, hecho.to.accountUid, hecho.from.identity);
  },

  /**
   * Aceptar una solicitud que le llegó a ESTE perfil tuyo.
   *
   * También del servidor, y por la misma razón que las encuestas cuentan los votos
   * allí: aceptar es la transición que CREA la conexión. Las reglas prohíben
   * cualquier `update` sobre `econtacts`, así que no hay otra puerta.
   */
  aceptarSolicitud: async (comoIdentidad: string, otraIdentidad: string): Promise<void> => {
    const yo = exigirIdentidadPropia(comoIdentidad);
    const otra = exigirIdentidadAjena(otraIdentidad);
    const hecho = await llamar('acceptEContact', { asIdentity: yo, otherIdentity: otra });
    // Quien la pidió se entera de que ya estáis conectados.
    await avisar('aceptada', hecho.from.identity, hecho.from.accountUid, hecho.to.identity);
  },

  /** Decir que no a una solicitud recibida: la relación deja de existir. */
  rechazarSolicitud: async (comoIdentidad: string, otraIdentidad: string): Promise<void> => {
    const yo = exigirIdentidadPropia(comoIdentidad);
    const otra = exigirIdentidadAjena(otraIdentidad);
    const actual = await leerDoc(yo, otra);
    if (!actual || !puedeAceptar(actual, yo)) throw new ErrorDeEContact('econtact.errNoRequestToReject', 'No hay ninguna solicitud tuya que rechazar.');
    await deleteDoc(refDe(yo, otra));
  },

  /** Retirar una solicitud que enviaste tú, antes de que la contesten. */
  cancelarSolicitud: async (comoIdentidad: string, otraIdentidad: string): Promise<void> => {
    const yo = exigirIdentidadPropia(comoIdentidad);
    const otra = exigirIdentidadAjena(otraIdentidad);
    const actual = await leerDoc(yo, otra);
    if (!actual || !puedeCancelar(actual, yo)) throw new ErrorDeEContact('econtact.errNoPendingRequest', 'No tienes ninguna solicitud pendiente con este perfil.');
    await deleteDoc(refDe(yo, otra));
  },

  /** Deshacer una conexión ya hecha. Cualquiera de las dos partes puede. */
  eliminarContacto: async (comoIdentidad: string, otraIdentidad: string): Promise<void> => {
    const yo = exigirIdentidadPropia(comoIdentidad);
    const otra = exigirIdentidadAjena(otraIdentidad);
    const actual = await leerDoc(yo, otra);
    if (!actual || !puedeEliminar(actual, yo)) throw new ErrorDeEContact('econtact.errNotConnected', 'No estáis conectados.');
    await deleteDoc(refDe(yo, otra));
  },

  // ─── Leer ──────────────────────────────────────────────────────────────────

  /**
   * Cómo está ESTE perfil tuyo con ESE perfil suyo. Es una pregunta entre dos
   * identidades: tu Perfil Real y tu Perfil Weë pueden estar de forma distinta
   * con la misma persona, y eso es lo correcto.
   */
  estadoCon: async (comoIdentidad: string, otraIdentidad: string): Promise<EstadoEntre> => {
    if (!esMia(comoIdentidad) || !esIdentidadDePersona(otraIdentidad)) return 'ninguno';
    if (comoIdentidad === otraIdentidad) return 'ninguno';
    // Las dos caras de una misma cuenta no se conectan entre sí.
    if (esMia(otraIdentidad)) return 'ninguno';
    return estadoEntre(await leerDoc(comoIdentidad, otraIdentidad), comoIdentidad);
  },

  /** Las conexiones de esta identidad. */
  misContactos: async (comoIdentidad: string): Promise<string[]> => {
    if (!esMia(comoIdentidad)) return [];
    return contactosDe(await relacionesDe(comoIdentidad), comoIdentidad)
      .map((d) => elOtro(d, comoIdentidad))
      .filter((u): u is string => !!u);
  },

  /** Quién le ha pedido conexión a esta identidad y sigue esperando respuesta. */
  solicitudesRecibidas: async (comoIdentidad: string): Promise<string[]> => {
    if (!esMia(comoIdentidad)) return [];
    return solicitudesRecibidas(await relacionesDe(comoIdentidad), comoIdentidad)
      .map((d) => d.requestedBy)
      .filter(Boolean);
  },

  /** A quién le ha pedido conexión esta identidad sin respuesta todavía. */
  solicitudesEnviadas: async (comoIdentidad: string): Promise<string[]> => {
    if (!esMia(comoIdentidad)) return [];
    return solicitudesEnviadas(await relacionesDe(comoIdentidad), comoIdentidad)
      .map((d) => d.requestedTo)
      .filter(Boolean);
  },

  /** Cuántas conexiones tiene esta identidad. Una solicitud pendiente no suma. */
  contador: async (comoIdentidad: string): Promise<number> => {
    if (!esMia(comoIdentidad)) return 0;
    return contarContactos(await relacionesDe(comoIdentidad), comoIdentidad);
  },

  /**
   * Todo lo de UNA identidad con UNA sola consulta: sus contactos, lo que le han
   * pedido y lo que ha pedido. Es lo que necesita la pantalla de la agenda, y
   * pedirlo por separado repetiría tres veces la misma lectura.
   *
   * Filtra por la identidad, no por la cuenta: la agenda del Perfil Real y la del
   * Perfil Weë no se mezclan nunca.
   */
  resumen: async (
    comoIdentidad: string
  ): Promise<{ contactos: string[]; recibidas: string[]; enviadas: string[] }> => {
    if (!esMia(comoIdentidad)) return { contactos: [], recibidas: [], enviadas: [] };
    const relaciones = await relacionesDe(comoIdentidad);
    return {
      contactos: contactosDe(relaciones, comoIdentidad)
        .map((d) => elOtro(d, comoIdentidad))
        .filter((u): u is string => !!u),
      recibidas: solicitudesRecibidas(relaciones, comoIdentidad).map((d) => d.requestedBy).filter(Boolean),
      enviadas: solicitudesEnviadas(relaciones, comoIdentidad).map((d) => d.requestedTo).filter(Boolean),
    };
  },
};

export default econtactService;
