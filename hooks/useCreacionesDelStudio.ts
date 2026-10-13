import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/IdiomaContext';
import { creatorService, CreatorJob } from '../services/creatorService';
import type { CreacionEnLaFila } from '../components/creator/FilaDeCreaciones';
import { CUANTAS_CREACIONES, TAMANO_DE_PAGINA, creacionDeLaFila, esUnaCreacionDelStudio } from '../utils/creacionesDelStudio';

export type FaseDeLasCreacionesDelStudio = 'sinSesion' | 'cargando' | 'error' | 'lista';

export interface CreacionesDelStudio {
  fase: FaseDeLasCreacionesDelStudio;
  creaciones: CreacionEnLaFila[];
  /** El trabajo de una pieza de la fila: para abrirlo en `CreatorFlow` con su experiencia. */
  trabajoDe: (id: string) => CreatorJob | undefined;
  recargar: () => void;
}

/**
 * Los trabajos de Weë Studio de la CUENTA, para la fila «Mis creaciones» del Studio (ver `utils/creacionesDelStudio.ts`).
 *
 * Solo LEE: pide la lista al enfocar la pantalla por el camino que ya usan Weë Chef y Weë Design (`getMyJobsDe`), no
 * crea, no cotiza y no toca Credits. Si la lectura falla se dice (`error`) y se puede reintentar; una respuesta que llega
 * tarde, después de salir o de cambiar de cuenta, se descarta.
 */
export const useCreacionesDelStudio = (): CreacionesDelStudio => {
  const { user, loading } = useAuth();
  const t = useT();
  const uid = user?.uid;
  const [estado, setEstado] = useState<{ de?: string; fase: 'cargando' | 'error' | 'lista'; trabajos?: CreatorJob[] }>({ de: uid, fase: 'cargando' });
  const peticion = useRef(0);

  const cargar = useCallback(() => {
    if (!uid) return;
    const mia = ++peticion.current;
    setEstado((antes) => (antes.de === uid && antes.fase === 'lista' ? antes : { de: uid, fase: 'cargando' }));
    creatorService
      .getMyJobsDe(uid, esUnaCreacionDelStudio, CUANTAS_CREACIONES, TAMANO_DE_PAGINA)
      .then((trabajos) => {
        if (mia === peticion.current) setEstado({ de: uid, fase: 'lista', trabajos });
      })
      .catch((error) => {
        console.warn('Mis creaciones de Weë Studio: no se pudieron cargar:', error);
        if (mia !== peticion.current) return;
        setEstado((antes) => (antes.de === uid && antes.fase === 'lista' ? antes : { de: uid, fase: 'error' }));
      });
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      cargar();
      return () => { peticion.current += 1; };
    }, [cargar])
  );

  const vigente = uid && estado.de === uid ? estado : { de: uid, fase: 'cargando' as const };
  const fase: FaseDeLasCreacionesDelStudio = !uid ? (loading ? 'cargando' : 'sinSesion') : vigente.fase;
  const trabajos = vigente.fase === 'lista' ? vigente.trabajos ?? [] : undefined;
  const creaciones = useMemo(() => (trabajos ?? []).map((job) => creacionDeLaFila(job, t)), [trabajos, t]);
  const trabajoDe = useCallback((id: string) => trabajos?.find((job) => job.id === id), [trabajos]);

  return { fase, creaciones, trabajoDe, recargar: cargar };
};
