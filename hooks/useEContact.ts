import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { econtactService } from '../services/econtactService';
import { usersService, UserProfile } from '../services/firestoreService';
import {
  EstadoEntre,
  TipoDeIdentidad,
  esIdentidadDePersona,
  nombreDeIdentidad,
  nombreDeLista,
  tipoDeIdentidad,
} from '../utils/econtactModel';

/*
 * ËCONTACT / ẄCONTACT, PARA LAS PANTALLAS.
 *
 * Dos pantallas necesitan lo mismo desde ángulos distintos: el perfil de otra
 * persona pregunta "¿cómo estamos este perfil mío y ese perfil tuyo?", y la
 * agenda pregunta "¿quiénes son los de este perfil mío?". Las dos tienen que
 * pedir, recargar y aguantar un error sin dejar la pantalla a medias, y eso es lo
 * que vive aquí.
 *
 * DESDE QUÉ IDENTIDAD
 * -------------------
 * De aquí sale la respuesta, y de un solo sitio: el perfil ACTIVO. Es lo que hace
 * que el Perfil Real vea su ËContact y el Perfil Weë vea su ẄContact sin que
 * ninguna pantalla tenga que enterarse. Cambiar de perfil no mueve ninguna
 * relación: cambia esta clave, y con ella la lista.
 *
 * Toda la lógica de dominio sigue en `utils/econtactModel.ts` y todo el acceso a
 * datos en `services/econtactService.ts`. Esto solo es el puente con React.
 */

/** Por qué una identidad no tiene agenda, cuando no la tiene. */
export type SinAgenda = 'sin-sesion' | 'perfil-sin-agenda';

export interface IdentidadActiva {
  /** El uid de la identidad activa. null si esta no tiene agenda. */
  identidad: string | null;
  tipo: TipoDeIdentidad | null;
  /** Cómo se llama su agenda: ËContact o ẄContact. */
  nombreLista: 'ËContact' | 'ẄContact';
  /** Cómo se llaman sus conexiones: "ËContacts" o "ẄContacts". */
  nombrePlural: string;
  hayAgenda: boolean;
  motivo: SinAgenda | null;
}

/**
 * La identidad con la que estás actuando ahora mismo.
 *
 * El uid del perfil activo, y la cuenta como respaldo por si el contexto todavía
 * no ha cargado. Es el ÚNICO sitio donde se decide, y de aquí sale que el Perfil
 * Real vea ËContact y el Perfil Weë vea ẄContact.
 *
 * El Perfil Biz no tiene agenda en esta versión: no es una persona, y sus
 * seguidores son otro sistema —`businessFollows`— que no se mezcla con esto. Se
 * distingue de "no hay sesión" para que la pantalla pueda decir cuál de las dos
 * cosas pasa en vez de enseñar un vacío que no se entiende.
 */
export const useIdentidadActiva = (): IdentidadActiva => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();

  return useMemo(() => {
    const activo = userProfile?.uid || user?.uid || null;
    const vacia = (motivo: SinAgenda): IdentidadActiva => ({
      identidad: null,
      tipo: null,
      nombreLista: 'ËContact',
      nombrePlural: 'ËContacts',
      hayAgenda: false,
      motivo,
    });

    if (!user) return vacia('sin-sesion');
    if (!activo || !esIdentidadDePersona(activo)) return vacia('perfil-sin-agenda');
    // Si el perfil activo no fuera de esta sesión, se cae al Perfil Real.
    const identidad = econtactService.esMia(activo) ? activo : user.uid;
    return {
      identidad,
      tipo: tipoDeIdentidad(identidad),
      nombreLista: nombreDeLista(identidad),
      nombrePlural: `${nombreDeLista(identidad)}s`,
      hayAgenda: true,
      motivo: null,
    };
  }, [userProfile?.uid, user?.uid, user]);
};

// ─── La relación entre DOS identidades ───────────────────────────────────────

export interface RelacionEContact {
  estado: EstadoEntre;
  cargando: boolean;
  /** true mientras una acción está en marcha: evita el doble toque. */
  trabajando: boolean;
  /** false cuando no hay con quién conectar: sin sesión, o es un perfil tuyo. */
  disponible: boolean;
  /** Con qué perfil tuyo se está operando. */
  identidad: string | null;
  /** Cómo se llama tu agenda ahora mismo: ËContact o ẄContact. */
  nombreLista: 'ËContact' | 'ẄContact';
  solicitar: () => Promise<void>;
  aceptar: () => Promise<void>;
  rechazar: () => Promise<void>;
  cancelar: () => Promise<void>;
  eliminar: () => Promise<void>;
  recargar: () => Promise<void>;
}

/**
 * Cómo está tu perfil activo con ese otro perfil, y qué puedes hacer al respecto.
 *
 * `otraIdentidad` es el uid del perfil que se está mirando, TAL CUAL: si es un
 * Perfil Weë, la relación es con ese Perfil Weë. No se traduce a su cuenta —eso
 * era el error anterior— porque el Perfil Real y el Perfil Weë de una persona son
 * destinos distintos.
 *
 * Cada acción refresca el estado desde el servicio al terminar: la fuente de
 * verdad es lo que hay guardado, no lo que esta pantalla creía.
 */
export const useEContact = (otraIdentidad?: string): RelacionEContact => {
  const { identidad } = useIdentidadActiva();
  const [estado, setEstado] = useState<EstadoEntre>('ninguno');
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);

  /*
   * No hay con quién conectar si no hay sesión, si ese perfil no es de una
   * persona, o si es tuyo —da igual cuál de los dos—: las dos caras de una cuenta
   * son la misma persona y no se agregan entre sí.
   */
  const disponible =
    !!identidad &&
    !!otraIdentidad &&
    esIdentidadDePersona(otraIdentidad) &&
    otraIdentidad !== identidad &&
    !econtactService.esMia(otraIdentidad);

  const recargar = useCallback(async () => {
    if (!disponible || !identidad || !otraIdentidad) {
      setEstado('ninguno');
      setCargando(false);
      return;
    }
    try {
      setEstado(await econtactService.estadoCon(identidad, otraIdentidad));
    } catch {
      setEstado('ninguno');
    } finally {
      setCargando(false);
    }
  }, [disponible, identidad, otraIdentidad]);

  useEffect(() => {
    setCargando(true);
    recargar();
  }, [recargar]);

  /*
   * Un solo camino para las cinco acciones: bloquear, hacer, releer y soltar.
   * Si algo falla, el estado se relee igual —así la pantalla nunca se queda
   * enseñando algo que ya no es verdad— y el error sube a quien llamó.
   */
  const accion = useCallback(
    (hacer: (mia: string, otra: string) => Promise<void>) => async () => {
      if (!disponible || !identidad || !otraIdentidad || trabajando) return;
      setTrabajando(true);
      try {
        await hacer(identidad, otraIdentidad);
      } finally {
        await recargar();
        setTrabajando(false);
      }
    },
    [disponible, identidad, otraIdentidad, trabajando, recargar]
  );

  return {
    estado,
    cargando,
    trabajando,
    disponible,
    identidad,
    nombreLista: nombreDeLista(identidad),
    solicitar: accion(econtactService.enviarSolicitud),
    aceptar: accion(econtactService.aceptarSolicitud),
    rechazar: accion(econtactService.rechazarSolicitud),
    cancelar: accion(econtactService.cancelarSolicitud),
    eliminar: accion(econtactService.eliminarContacto),
    recargar,
  };
};

// ─── La agenda de la identidad activa ────────────────────────────────────────

/**
 * Una persona en tu agenda, ya lista para pintar.
 *
 * `identidad` es su uid y NO se enseña nunca: sirve de clave y para abrir su
 * perfil. Lo que se ve es el nombre, el avatar y —cuando hace falta distinguir—
 * `etiqueta`, que dice "Perfil real" o "Perfil Weë".
 */
export interface PersonaEnAgenda {
  identidad: string;
  tipo: TipoDeIdentidad;
  etiqueta: 'Perfil real' | 'Perfil Weë';
  perfil: UserProfile;
}

export interface MisEContacts {
  /** Las identidades con las que ESTE perfil tuyo está conectado. */
  contactos: PersonaEnAgenda[];
  /** Quién le ha pedido conexión a ESTE perfil tuyo y espera respuesta. */
  recibidas: PersonaEnAgenda[];
  /** A quién le ha pedido ESTE perfil tuyo y todavía no le han contestado. */
  enviadas: PersonaEnAgenda[];
  /** Cuántas conexiones tiene. Solo aceptadas. */
  total: number;
  cargando: boolean;
  /** Con qué perfil tuyo se está mirando la agenda. */
  identidad: string | null;
  /** Cómo se llama esa agenda: ËContact o ẄContact. */
  nombreLista: 'ËContact' | 'ẄContact';
  /** Su plural, para los textos: "ËContacts" o "ẄContacts". */
  nombrePlural: string;
  /** false si el perfil activo no tiene agenda —Biz— o no hay sesión. */
  hayAgenda: boolean;
  motivo: SinAgenda | null;
  recargar: () => Promise<void>;
  // Las acciones, ya atadas a la identidad activa: la pantalla no la maneja.
  aceptar: (otra: string) => Promise<void>;
  rechazar: (otra: string) => Promise<void>;
  cancelar: (otra: string) => Promise<void>;
  eliminar: (otra: string) => Promise<void>;
}

const VACIA = { contactos: [], recibidas: [], enviadas: [] };

/**
 * La agenda del perfil activo, entera y de una vez.
 *
 * Sale de UNA consulta al servicio, filtrada por la IDENTIDAD activa, que ya la
 * reparte en contactos, recibidas y enviadas. Las dos agendas de una cuenta nunca
 * se mezclan: son dos consultas distintas con dos claves distintas.
 *
 * Los nombres y los avatares se piden aparte, y por tandas: una consulta cada 30
 * personas en vez de una por persona.
 *
 * El total cuenta conexiones aceptadas: una solicitud pendiente no suma, que es lo
 * que separa esto de un sistema de seguidores.
 */
export const useMisEContacts = (): MisEContacts => {
  const { identidad, nombreLista, nombrePlural, hayAgenda, motivo } = useIdentidadActiva();
  const [uids, setUids] = useState<{ contactos: string[]; recibidas: string[]; enviadas: string[] }>(VACIA);
  const [perfiles, setPerfiles] = useState<Record<string, UserProfile>>({});
  const [cargandoAgenda, setCargandoAgenda] = useState(true);
  const [cargandoPerfiles, setCargandoPerfiles] = useState(true);

  const recargar = useCallback(async () => {
    if (!identidad) {
      setUids(VACIA);
      setCargandoAgenda(false);
      return;
    }
    try {
      // Una sola consulta para las tres listas: `resumen` las reparte.
      setUids(await econtactService.resumen(identidad));
    } catch {
      setUids(VACIA);
    } finally {
      setCargandoAgenda(false);
    }
  }, [identidad]);

  useEffect(() => {
    setCargandoAgenda(true);
    recargar();
  }, [recargar]);

  /* Todas las personas que van a salir, sin repetir. */
  const todas = useMemo(
    () => [...new Set([...uids.recibidas, ...uids.contactos, ...uids.enviadas])],
    [uids]
  );
  const clave = todas.join('|');

  useEffect(() => {
    let vigente = true;
    if (todas.length === 0) {
      setPerfiles({});
      setCargandoPerfiles(false);
      return;
    }
    setCargandoPerfiles(true);
    usersService
      .getManyByUids(todas)
      .then((encontrados) => {
        if (!vigente) return;
        setPerfiles(Object.fromEntries(encontrados.filter((p) => !!p?.uid).map((p) => [p.uid, p])));
      })
      .catch(() => vigente && setPerfiles({}))
      .finally(() => vigente && setCargandoPerfiles(false));
    return () => {
      vigente = false;
    };
    // `clave` es la lista de identidades: cambia solo cuando cambia quién sale.
  }, [clave]);

  /*
   * De uid a persona. Quien no tenga perfil se cae de la lista: sin nombre ni
   * avatar no hay nada que enseñar, y un uid suelto no es una persona.
   */
  const componer = useCallback(
    (lista: string[]): PersonaEnAgenda[] =>
      lista
        .map((id) => {
          const perfil = perfiles[id];
          if (!perfil) return null;
          return { identidad: id, tipo: tipoDeIdentidad(id), etiqueta: nombreDeIdentidad(id), perfil };
        })
        .filter((p): p is PersonaEnAgenda => !!p),
    [perfiles]
  );

  const conIdentidad = (hacer: (mia: string, otra: string) => Promise<void>) => async (otra: string) => {
    if (!identidad) throw new Error('No hay ningún perfil activo con el que hacer esto.');
    await hacer(identidad, otra);
  };

  const contactos = useMemo(() => componer(uids.contactos), [componer, uids.contactos]);

  return {
    contactos,
    recibidas: componer(uids.recibidas),
    enviadas: componer(uids.enviadas),
    total: contactos.length,
    cargando: cargandoAgenda || cargandoPerfiles,
    identidad,
    nombreLista,
    nombrePlural,
    hayAgenda,
    motivo,
    recargar,
    aceptar: conIdentidad(econtactService.aceptarSolicitud),
    rechazar: conIdentidad(econtactService.rechazarSolicitud),
    cancelar: conIdentidad(econtactService.cancelarSolicitud),
    eliminar: conIdentidad(econtactService.eliminarContacto),
  };
};
