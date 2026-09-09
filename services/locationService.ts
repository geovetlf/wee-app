import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

/**
 * La única puerta de Weë a la ubicación del dispositivo.
 *
 * Ningún componente, pantalla ni servicio llama a expo-location ni a
 * navigator.geolocation por su cuenta: todo pasa por aquí, igual que las
 * notificaciones pasan por pushNotificationService. Así hay un solo sitio donde
 * mirar cuando haya que responder "¿qué sabe Weë de dónde estoy?".
 *
 * Lo que esta capa NO hace, a propósito:
 *   · no sigue a nadie —lecturas puntuales, nunca watchPosition—;
 *   · no guarda coordenadas en ningún sitio: viven en memoria y se van;
 *   · no las manda a Firestore, ni a un servidor, ni a un servicio externo;
 *   · no pide permiso de fondo ni "Siempre".
 *
 * Y separa dos cosas que se confunden con facilidad: lo que la persona le ha
 * dicho a Weë (la preferencia) y lo que le ha dicho al sistema operativo (el
 * permiso). Son independientes y pueden contradecirse; el estado que sale de
 * aquí es el resultado de mirar las dos.
 */

// ─── Los estados ────────────────────────────────────────────────────────────

/**
 * Seis estados, no un sí/no. La precisión es un estado en sí misma: una persona
 * que concede "aproximada" no ha dicho que no, y tratarla como si lo hubiera
 * dicho sería tan falso como tratarla como si hubiera dicho que sí del todo.
 */
export type EstadoUbicacion =
  /** El aparato no sabe localizarse: sin GPS, o un navegador sin geolocalización. */
  | 'unavailable'
  /** El sistema tiene la ubicación apagada para todo el mundo, no solo para Weë. */
  | 'disabled'
  /** Todavía no se ha preguntado. Ni sí ni no. */
  | 'permissionNotDetermined'
  /** Dijo que no, o lo revocó después desde los ajustes del sistema. */
  | 'permissionDenied'
  /** Concedida a grandes rasgos: la zona, no el portal. */
  | 'approximate'
  /** Concedida con detalle. */
  | 'precise';

/**
 * Lo que la persona le ha dicho a Weë, que no es lo mismo que lo que le haya
 * dicho al sistema.
 *
 * "precisa" es un permiso que la persona le da a Weë para PEDIR detalle, no la
 * garantía de tenerlo: si el sistema solo concedió la zona, Weë se queda con la
 * zona. Un techo, nunca un suelo.
 */
export type PreferenciaUbicacion = 'off' | 'aproximada' | 'precisa';

/** Una lectura. Existe en memoria mientras alguien la sostiene, y nada más. */
export interface LecturaUbicacion {
  latitude: number;
  longitude: number;
  /** Radio en metros dentro del cual está la persona. Cuanto mayor, más difusa. */
  radioMetros: number | null;
  precision: 'aproximada' | 'precisa';
}

/** El permiso del sistema, contado aparte de la preferencia de Weë. */
export interface PermisoSistema {
  concedido: boolean;
  /** Dijo que no. Distinto de "todavía no se le ha preguntado". */
  denegado: boolean;
  puedeVolverAPreguntar: boolean;
  precision: 'aproximada' | 'precisa' | 'ninguna';
}

// ─── La preferencia de Weë ──────────────────────────────────────────────────

const CLAVE = 'wee.ubicacion.preferencia';

export const leerPreferencia = async (): Promise<PreferenciaUbicacion> => {
  try {
    const guardada = await AsyncStorage.getItem(CLAVE);
    // Cualquier cosa que no reconozcamos —incluido lo que no está— es "off":
    // ante la duda, Weë no usa la ubicación de nadie.
    return guardada === 'aproximada' || guardada === 'precisa' ? guardada : 'off';
  } catch {
    // Si el almacenamiento local falla, lo prudente es no usar la ubicación.
    return 'off';
  }
};

export const guardarPreferencia = async (preferencia: PreferenciaUbicacion): Promise<void> => {
  try {
    await AsyncStorage.setItem(CLAVE, preferencia);
  } catch (error) {
    console.warn('No se pudo guardar la preferencia de ubicación:', error);
  }
};

// ─── El permiso del sistema ─────────────────────────────────────────────────

/**
 * Android distingue "fine" de "coarse" en el propio permiso. iOS no lo cuenta en
 * la respuesta del permiso —solo se nota en el radio de una lectura—, así que un
 * permiso concedido se toma como preciso y se corrige al leer si resulta que no
 * lo era. Es la señal que el sistema deja ver.
 */
const precisionDe = (respuesta: Location.LocationPermissionResponse): PermisoSistema['precision'] => {
  if (!respuesta.granted) return 'ninguna';
  if (respuesta.android) return respuesta.android.accuracy === 'coarse' ? 'aproximada' : 'precisa';
  return 'precisa';
};

/*
 * Denegado no se puede deducir de `canAskAgain`. En web, expo-location devuelve
 * SIEMPRE `canAskAgain: true`, también cuando el navegador tiene la ubicación
 * bloqueada para el sitio; mirando solo ese campo, un "no" rotundo se leía como
 * "todavía no se ha preguntado" y Weë prometía un diálogo que no iba a salir.
 * El campo que sí lo dice en las tres plataformas es `status`.
 */
const traducir = (respuesta: Location.LocationPermissionResponse): PermisoSistema => ({
  concedido: respuesta.granted,
  denegado: !respuesta.granted && (respuesta.status === 'denied' || !respuesta.canAskAgain),
  puedeVolverAPreguntar: respuesta.canAskAgain,
  precision: precisionDe(respuesta),
});

/** Mira el permiso sin preguntar nada a la persona. */
export const permisoActual = async (): Promise<PermisoSistema> => traducir(await Location.getForegroundPermissionsAsync());

/**
 * Pide el permiso. Solo el de primer plano: Weë no quiere saber dónde estás
 * cuando no la estás usando.
 */
export const pedirPermiso = async (): Promise<PermisoSistema> => traducir(await Location.requestForegroundPermissionsAsync());

/**
 * La precisión de verdad: la menor entre lo que la persona le pidió a Weë y lo
 * que el sistema le concedió.
 *
 * Es la regla que impide la mentira más fácil de contar en una app: alguien
 * elige "precisa" dentro de Weë, el sistema solo dio "aproximada", y la app se
 * comporta —y peor aún, se lo cuenta a la persona— como si tuviera detalle. Aquí
 * gana siempre el sistema. Y no se le vuelve a pedir nada por detrás para
 * arreglarlo: si concedió la zona, Weë trabaja con la zona.
 */
export const precisionEfectiva = (
  preferencia: PreferenciaUbicacion,
  permiso: PermisoSistema
): 'ninguna' | 'aproximada' | 'precisa' => {
  if (preferencia === 'off' || !permiso.concedido) return 'ninguna';
  if (preferencia === 'aproximada') return 'aproximada';
  return permiso.precision === 'precisa' ? 'precisa' : 'aproximada';
};

// ─── El estado, que es las dos cosas juntas ─────────────────────────────────

/**
 * ¿Sabe localizarse este aparato, y está encendido?
 *
 * "No hay servicio" significa cosas distintas según dónde: en un teléfono es el
 * interruptor de ubicación del sistema —apagado, se puede encender—, y en un
 * navegador es que no existe la geolocalización, que no se enciende de ninguna
 * manera. Decirle a alguien "está apagada en tus ajustes" cuando su navegador
 * simplemente no puede sería mandarle a buscar un interruptor que no existe.
 */
const disponibilidad = async (): Promise<'unavailable' | 'disabled' | 'ok'> => {
  try {
    if (await Location.hasServicesEnabledAsync()) return 'ok';
    return Platform.OS === 'web' ? 'unavailable' : 'disabled';
  } catch {
    // Ni el módulo nativo ni navigator.geolocation responden.
    return 'unavailable';
  }
};

/**
 * El estado que ve el resto de Weë. Con la preferencia apagada ni se consulta el
 * permiso: si la persona ha dicho que no dentro de Weë, Weë no pregunta nada al
 * sistema, tenga el permiso que tenga.
 */
export const estadoActual = async (preferencia?: PreferenciaUbicacion): Promise<EstadoUbicacion> => {
  const quiere = preferencia ?? (await leerPreferencia());
  if (quiere === 'off') return 'permissionNotDetermined';

  const aparato = await disponibilidad();
  if (aparato !== 'ok') return aparato;

  const permiso = await permisoActual();
  if (!permiso.concedido) return permiso.denegado ? 'permissionDenied' : 'permissionNotDetermined';
  return precisionEfectiva(quiere, permiso) === 'precisa' ? 'precise' : 'approximate';
};

// ─── La lectura ─────────────────────────────────────────────────────────────

/**
 * A partir de este radio la lectura se considera aproximada. Es lo que devuelve
 * iOS cuando la persona ha desactivado la ubicación exacta, y también lo que da
 * una localización por antenas o por IP.
 */
const RADIO_APROXIMADO = 1000;

/**
 * Una lectura, ahora, y se acabó. Sin suscripción, sin repetición, sin nada que
 * quede escuchando. Quien la pida se queda con el resultado en memoria y es
 * responsable de no guardarlo.
 */
export const leerUnaVez = async (
  quiere: 'aproximada' | 'precisa' = 'aproximada'
): Promise<LecturaUbicacion | null> => {
  try {
    // Nunca se pide más detalle del concedido: si el sistema dio la zona, se
    // pide la zona, aunque quien llame haya pedido precisión.
    const permiso = await permisoActual();
    if (permiso.precision === 'aproximada') quiere = 'aproximada';
    const posicion = await Location.getCurrentPositionAsync({
      accuracy: quiere === 'precisa' ? Location.Accuracy.High : Location.Accuracy.Low,
    });
    const radio = posicion.coords.accuracy ?? null;
    return {
      latitude: posicion.coords.latitude,
      longitude: posicion.coords.longitude,
      radioMetros: radio,
      // El radio manda sobre lo que se pidió: en iOS con la ubicación exacta
      // desactivada se pide precisa y llega difusa, y hay que decirlo.
      precision: radio !== null && radio > RADIO_APROXIMADO ? 'aproximada' : quiere,
    };
  } catch (error) {
    console.warn('No se pudo leer la ubicación:', error);
    return null;
  }
};

export const locationService = {
  leerPreferencia,
  guardarPreferencia,
  permisoActual,
  pedirPermiso,
  estadoActual,
  precisionEfectiva,
  leerUnaVez,
};
