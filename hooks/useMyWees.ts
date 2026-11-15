import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { myWeesStore } from '../services/myWeesStore';
import { AccesoDeMyWees, PerfilDeMyWees, anadir, contiene, mover, quitar, restaurar } from '../utils/myWees';

/*
 * MYWEËS, PARA LAS PANTALLAS.
 *
 * De qué cuenta y de qué perfil es la lista se decide AQUÍ y en un solo sitio:
 * la cuenta es la de Firebase Auth y el perfil es el activo (`activeProfileType`,
 * el mismo valor que usan el cajón y la cabecera). Este hook solo LEE la
 * identidad; no la cambia ni la guarda, y nada de lo que hay en MyWeës decide
 * quién eres ni qué puedes hacer.
 *
 * Al cambiar de cuenta o de perfil se vuelve a leer la clave que corresponde:
 * lo del Perfil Real no se arrastra al Perfil Weë.
 */
export interface MyWees {
  accesos: AccesoDeMyWees[];
  /** true mientras se lee por primera vez la lista de esta cuenta y este perfil. */
  cargando: boolean;
  /** false si no hay sesión: un invitado no tiene MyWeës. */
  disponible: boolean;
  /** true si el último intento de guardar falló. La lista en pantalla sigue siendo la que la persona dejó. */
  sinGuardar: boolean;
  perfil: PerfilDeMyWees;
  tiene: (id: string) => boolean;
  anadir: (acceso: AccesoDeMyWees | null) => void;
  quitar: (id: string) => void;
  mover: (id: string, paso: -1 | 1) => void;
  restaurar: () => void;
  /** Vuelve a leer lo guardado. Para la pantalla que recupera el foco después de que otra (una Weë Page abierta) haya añadido o quitado algo. */
  recargar: () => void;
}

export const useMyWees = (): MyWees => {
  const { user } = useAuth();
  const { activeProfileType } = useUserProfile();
  const cuenta = user?.uid ?? null;
  const perfil: PerfilDeMyWees = activeProfileType === 'hidi' ? 'hidi' : 'real';

  const [accesos, setAccesosDeEstado] = useState<AccesoDeMyWees[]>([]);
  /* La lista vigente, también fuera del estado: dos cambios seguidos parten los dos de la última, sin esperar a que React pinte. */
  const vigentes = useRef<AccesoDeMyWees[]>([]);
  const setAccesos = useCallback((lista: AccesoDeMyWees[]) => {
    vigentes.current = lista;
    setAccesosDeEstado(lista);
  }, []);
  const [cargando, setCargando] = useState(true);
  const [sinGuardar, setSinGuardar] = useState(false);
  /* De quién es la lista que hay en memoria. Evita guardar la de un perfil en la clave del otro durante un cambio. */
  const duena = useRef<string | null>(null);

  useEffect(() => {
    let vigente = true;
    const quien = cuenta ? `${cuenta}.${perfil}` : null;
    duena.current = null;
    setAccesos([]);
    setSinGuardar(false);
    if (!cuenta) {
      setCargando(false);
      return;
    }
    setCargando(true);
    void myWeesStore.leer(cuenta, perfil).then((leidos) => {
      if (!vigente) return;
      duena.current = quien;
      setAccesos(leidos);
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, [cuenta, perfil, setAccesos]);

  /* Cambia la lista y la guarda. Si todavía no se ha leído la de esta cuenta y perfil, no hace nada: no se pisa lo guardado con una lista vacía. */
  const cambiar = useCallback(
    (operacion: (actual: AccesoDeMyWees[]) => AccesoDeMyWees[]) => {
      if (!cuenta || duena.current !== `${cuenta}.${perfil}`) return;
      const siguiente = operacion(vigentes.current);
      setAccesos(siguiente);
      void myWeesStore.guardar(cuenta, perfil, siguiente).then((ok) => setSinGuardar(!ok));
    },
    [cuenta, perfil, setAccesos],
  );

  const recargar = useCallback(() => {
    const quien = cuenta ? `${cuenta}.${perfil}` : null;
    if (!cuenta || duena.current !== quien) return;
    void myWeesStore.leer(cuenta, perfil).then((leidos) => {
      if (duena.current === quien) setAccesos(leidos);
    });
  }, [cuenta, perfil, setAccesos]);

  return {
    accesos,
    cargando,
    disponible: !!cuenta,
    sinGuardar,
    perfil,
    tiene: useCallback((id: string) => contiene(accesos, id), [accesos]),
    anadir: useCallback((acceso: AccesoDeMyWees | null) => cambiar((actual) => anadir(actual, acceso)), [cambiar]),
    quitar: useCallback((id: string) => cambiar((actual) => quitar(actual, id)), [cambiar]),
    mover: useCallback((id: string, paso: -1 | 1) => cambiar((actual) => mover(actual, id, paso)), [cambiar]),
    restaurar: useCallback(() => cambiar(() => restaurar()), [cambiar]),
    recargar,
  };
};
