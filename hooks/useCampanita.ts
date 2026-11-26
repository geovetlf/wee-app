import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { notificationService, Notification } from '../services/notificationService';

/*
 * LA CAMPANITA (decisión del dueño, 2026-11-23): el punto rojo se enciende cuando hay
 * notificaciones sin leer del perfil puesto. Y, sea cual sea la cara puesta, también
 * cuando un PERSONAJE propio —cualquiera de los alter egos de esta cuenta— dejó avisos
 * sin revisar: es el dueño quien tiene que enterarse, esté con la cara que esté.
 *
 * El aviso de cada personaje es UNA notificación agrupada (`notifications/personaje_<perfil>`,
 * la escribe el servidor en `campanitaDelPersonaje`); aquí solo se lee, una suscripción
 * por alter ego (hasta cinco, D1).
 */

/** Los avisos de TODOS los personajes de la cuenta, por perfil (también el de la cara puesta). */
export function useAvisosDeLosPersonajes(): Record<string, Notification | null> {
  const { user } = useAuth();
  const { alterEgos = [] } = useUserProfile();
  const ids = useMemo(() => alterEgos.map((a) => a.uid).filter(Boolean).sort().join('|'), [alterEgos]);
  const [avisos, setAvisos] = useState<Record<string, Notification | null>>({});
  useEffect(() => {
    setAvisos({});
    if (!user || !ids) return;
    const bajas = ids.split('|').map((perfilWee) =>
      notificationService.subscribeToCharacterNotice(perfilWee, (aviso) =>
        setAvisos((previos) => ({ ...previos, [perfilWee]: aviso }))));
    return () => bajas.forEach((baja) => baja());
  }, [user, ids]);
  return avisos;
}

/** ¿Tiene este personaje algo sin revisar? Para el punto rojo de cada fila de la hoja de alter egos. */
export const avisoSinLeer = (aviso: Notification | null | undefined): boolean => !!aviso && aviso.read === false;

/**
 * Los avisos de los personajes que NO llegan ya por la cara puesta: con un alter ego puesto, el suyo
 * está en sus notificaciones y no se cuenta dos veces.
 */
export function useAvisoDelPersonaje(): Notification[] {
  const { userProfile } = useUserProfile();
  const { user } = useAuth();
  const activo = userProfile?.uid || user?.uid;
  const avisos = useAvisosDeLosPersonajes();
  return useMemo(
    () => Object.entries(avisos).filter(([perfilWee, aviso]) => !!aviso && perfilWee !== activo).map(([, aviso]) => aviso as Notification),
    [avisos, activo],
  );
}

/** true cuando la campanita lleva el punto rojo. */
export function useCampanita(): boolean {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const activo = userProfile?.uid || user?.uid;
  const [sinLeer, setSinLeer] = useState(0);
  const avisosDeLosPersonajes = useAvisoDelPersonaje();
  useEffect(() => {
    if (!activo) { setSinLeer(0); return; }
    return notificationService.subscribeToUnreadCount(activo, setSinLeer);
  }, [activo]);
  return sinLeer > 0 || avisosDeLosPersonajes.some(avisoSinLeer);
}
