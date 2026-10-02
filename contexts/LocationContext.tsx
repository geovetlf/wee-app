import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  EstadoUbicacion,
  LecturaUbicacion,
  PermisoSistema,
  PreferenciaUbicacion,
  locationService,
} from '../services/locationService';
import { UbicacionPublica, aPublica } from '../utils/locationPrivacy';

/**
 * La ubicación de Weë, en un solo sitio.
 *
 * Esto no es una función: es una capacidad del sistema, como las notificaciones o
 * el tema. Cualquier parte de Weë que algún día quiera saber si hay algo cerca
 * —la comunidad, los negocios, los viajes— pregunta aquí y no se entera de que
 * existen expo-location, los permisos de Android o `navigator.geolocation`.
 *
 * Este contexto no hace nada por su cuenta. Al arrancar lee la preferencia
 * guardada y, si está apagada —que es como empieza todo el mundo—, no le pregunta
 * nada al sistema. Nadie se encuentra un permiso pedido sin haberlo buscado, y
 * nadie se encuentra el GPS encendido por haber abierto la aplicación: la
 * ubicación se lee cuando alguien la pide, una vez, y se para.
 *
 * Nada de lo que hay aquí es obligatorio para que Weë funcione. Si la persona
 * dice que no, o el aparato no sabe localizarse, el resto de la aplicación no se
 * entera: el feed, las comunidades y Weë Creator siguen exactamente igual.
 */

interface ContextoUbicacion {
  // ── Lo que se puede preguntar ──────────────────────────────────────────
  /** El resultado de mirar la preferencia y el permiso a la vez. */
  estado: EstadoUbicacion;
  /** Lo que la persona le ha dicho a Weë. Apagado, la zona, o el detalle. */
  preferencia: PreferenciaUbicacion;
  /** Lo que le ha dicho al sistema operativo, contado aparte. */
  permiso: PermisoSistema | null;
  /** La precisión de verdad: la menor entre lo que se pidió y lo que se concedió. */
  precision: 'ninguna' | 'aproximada' | 'precisa';
  /** ¿Puede Weë usar la ubicación ahora mismo? Una sola pregunta para lo normal. */
  disponible: boolean;
  /** La última lectura. Vive en memoria y solo aquí. */
  lectura: LecturaUbicacion | null;
  /** Lo mismo, en la forma que sí se puede enseñar o comparar: sin coordenadas. */
  publica: UbicacionPublica | null;
  /** Cuándo se leyó, para que quien la use sepa si está rancia. */
  leidaEn: number | null;
  /** Se está mirando el permiso o pidiendo una lectura. */
  cargando: boolean;
  /**
   * Qué salió mal, como CÓDIGO y no como frase: un contexto no sabe en qué idioma se mira. Hoy nadie lo pinta
   * (Configuración y Agregar ubicación leen el estado y la lectura); quien lo enseñe elegirá la clave i18n por él.
   */
  error: 'lectura-fallida' | null;

  // ── Lo que se puede hacer ──────────────────────────────────────────────
  /** Enciende la preferencia y, si hace falta, pide el permiso del sistema. */
  activar: (precision?: 'aproximada' | 'precisa') => Promise<EstadoUbicacion>;
  /** Apaga la preferencia de Weë y olvida la lectura. No toca el permiso del sistema. */
  desactivar: () => Promise<void>;
  /** Vuelve a mirar preferencia y permiso. Se llama solo al volver a la aplicación. */
  revisar: () => Promise<EstadoUbicacion>;
  /** Una lectura, ahora, si procede. Nunca se guarda en ningún sitio. */
  refrescar: () => Promise<LecturaUbicacion | null>;
}

const vacio: ContextoUbicacion = {
  estado: 'permissionNotDetermined',
  preferencia: 'off',
  permiso: null,
  precision: 'ninguna',
  disponible: false,
  lectura: null,
  publica: null,
  leidaEn: null,
  cargando: true,
  error: null,
  activar: async () => 'permissionNotDetermined',
  desactivar: async () => {},
  revisar: async () => 'permissionNotDetermined',
  refrescar: async () => null,
};

const LocationContext = createContext<ContextoUbicacion>(vacio);

export const useLocation = () => useContext(LocationContext);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferencia, setPreferencia] = useState<PreferenciaUbicacion>('off');
  const [estado, setEstado] = useState<EstadoUbicacion>('permissionNotDetermined');
  const [permiso, setPermiso] = useState<PermisoSistema | null>(null);
  const [lectura, setLectura] = useState<LecturaUbicacion | null>(null);
  const [leidaEn, setLeidaEn] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<'lectura-fallida' | null>(null);

  /** La lectura se olvida entera: la coordenada y la hora, para que nada quede colgando. */
  const olvidarLectura = useCallback(() => {
    setLectura(null);
    setLeidaEn(null);
  }, []);

  /** Mira la preferencia y el permiso y deja el estado al día. */
  const revisar = useCallback(async (): Promise<EstadoUbicacion> => {
    const quiere = await locationService.leerPreferencia();
    setPreferencia(quiere);
    // Con la preferencia apagada no se consulta el permiso: Weë no husmea.
    const actual = quiere === 'off' ? null : await locationService.permisoActual();
    setPermiso(actual);

    const nuevo = await locationService.estadoActual(quiere);
    setEstado(nuevo);

    /*
     * Si ya no se puede usar la ubicación —la apagó en Weë, la revocó desde los
     * ajustes del sistema, se quedó sin servicio—, la lectura que quedaba en
     * memoria deja de valer y se tira. Guardarla "por si acaso" sería justo el
     * tipo de dato viejo que acaba usándose como si fuera de ahora.
     */
    if (nuevo !== 'approximate' && nuevo !== 'precise') olvidarLectura();
    return nuevo;
  }, [olvidarLectura]);

  useEffect(() => {
    let vivo = true;
    revisar()
      .catch((e) => console.warn('No se pudo revisar la ubicación:', e))
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [revisar]);

  /*
   * El permiso se puede quitar desde los ajustes del sistema sin pasar por Weë.
   * Al volver a la aplicación hay que mirarlo otra vez, o Weë seguiría creyendo
   * que lo tiene. Solo se mira al volver: ni sondeos, ni intervalos, ni nada
   * escuchando por detrás.
   */
  useEffect(() => {
    const alCambiar = (situacion: AppStateStatus) => {
      if (situacion === 'active') revisar().catch(() => {});
    };
    const suscripcion = AppState.addEventListener('change', alCambiar);
    return () => suscripcion.remove();
  }, [revisar]);

  const activar = useCallback(
    async (precision: 'aproximada' | 'precisa' = 'aproximada'): Promise<EstadoUbicacion> => {
      setError(null);
      await locationService.guardarPreferencia(precision);
      setPreferencia(precision);

      const actual = await locationService.permisoActual();
      /*
       * Solo se abre el diálogo del sistema si aún se puede preguntar. Si ya dijo
       * que no, se le cuenta el estado en vez de insistir: una aplicación que
       * vuelve a preguntar cada vez que la abres es una aplicación que no
       * escucha, y además Android deja de enseñar el diálogo igualmente.
       */
      const resultado = actual.concedido || actual.denegado ? actual : await locationService.pedirPermiso();
      setPermiso(resultado);

      const nuevo = await locationService.estadoActual(precision);
      setEstado(nuevo);
      if (nuevo !== 'approximate' && nuevo !== 'precise') olvidarLectura();
      return nuevo;
    },
    [olvidarLectura]
  );

  const desactivar = useCallback(async () => {
    await locationService.guardarPreferencia('off');
    setPreferencia('off');
    setPermiso(null);
    setError(null);
    olvidarLectura();
    setEstado(await locationService.estadoActual('off'));
  }, [olvidarLectura]);

  /*
   * Dos lecturas a la vez no sirven de nada y encienden el GPS dos veces. Si
   * alguien pide una mientras hay otra en marcha, se le devuelve la misma.
   */
  const enMarcha = useRef<Promise<LecturaUbicacion | null> | null>(null);

  /**
   * Una lectura, ahora, y se acabó.
   *
   * Comprueba que Weë la tenga encendida y que el sistema la permita, pide una
   * sola posición con la precisión que de verdad hay disponible, la deja en
   * memoria y devuelve el resultado. No hay suscripción, no hay repetición y no
   * hay nada que quede escuchando cuando esta función termina.
   */
  const refrescar = useCallback(async (): Promise<LecturaUbicacion | null> => {
    if (enMarcha.current) return enMarcha.current;

    const trabajo = (async (): Promise<LecturaUbicacion | null> => {
      setError(null);
      if (preferencia === 'off') return null;

      const ahora = await locationService.estadoActual(preferencia);
      setEstado(ahora);
      if (ahora !== 'approximate' && ahora !== 'precise') {
        olvidarLectura();
        return null;
      }

      setCargando(true);
      try {
        // La precisión que se pide es la que hay, no la que se querría: el
        // servicio vuelve a comprobarlo y baja el listón si el sistema lo bajó.
        const nueva = await locationService.leerUnaVez(preferencia === 'precisa' ? 'precisa' : 'aproximada');
        if (!nueva) {
          setError('lectura-fallida');
          return null;
        }
        setLectura(nueva);
        setLeidaEn(Date.now());
        return nueva;
      } finally {
        setCargando(false);
      }
    })();

    enMarcha.current = trabajo;
    try {
      return await trabajo;
    } finally {
      enMarcha.current = null;
    }
  }, [preferencia, olvidarLectura]);

  const precision = permiso ? locationService.precisionEfectiva(preferencia, permiso) : 'ninguna';
  const disponible = estado === 'approximate' || estado === 'precise';

  return (
    <LocationContext.Provider
      value={{
        estado,
        preferencia,
        permiso,
        precision,
        disponible,
        lectura,
        // Lo que sale al resto de Weë ya viene sin coordenadas: la conversión se
        // hace aquí, no en cada pantalla, para que nadie tenga que acordarse.
        publica: lectura ? aPublica(lectura) : null,
        leidaEn,
        cargando,
        error,
        activar,
        desactivar,
        revisar,
        refrescar,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
