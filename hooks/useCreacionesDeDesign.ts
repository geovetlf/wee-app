import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../contexts/IdiomaContext';
import { creatorService, CreatorJob } from '../services/creatorService';
import type { CreacionEnLaFila } from '../components/creator/FilaDeCreaciones';
import { CUANTAS_CREACIONES, TAMANO_DE_PAGINA, creacionDeLaFila, esUnaCreacionDeDesign } from '../utils/creacionesDeDesign';

/** En qué punto está lo que se ve en la fila «Mis creaciones» de Weë Design. */
export type FaseDeMisCreaciones = 'sinSesion' | 'cargando' | 'error' | 'lista';

export interface MisCreacionesDeDesign {
  fase: FaseDeMisCreaciones;
  /** Lo suyo, ya en la forma de la fila. Vacío mientras no hay lista que enseñar (y también cuando la lista está vacía). */
  creaciones: CreacionEnLaFila[];
  /** El trabajo detrás de una de esas láminas, para reabrirlo. */
  trabajoDe: (id: string) => CreatorJob | undefined;
  /** Volver a pedirlo: el reintento tras un error. */
  recargar: () => void;
}

/** Lo último que se supo, y de QUIÉN: lo de una cuenta no se queda a la vista cuando entra otra. */
type Estado =
  | { de: string | undefined; fase: 'cargando' }
  | { de: string | undefined; fase: 'error' }
  | { de: string | undefined; fase: 'lista'; trabajos: CreatorJob[] };

/**
 * LO QUE ESTA PERSONA HA CREADO EN WEË DESIGN Y EN HOGAR & DISEÑO.
 *
 * Pide los trabajos de la CUENTA —no del perfil— con el camino que ya usa Weë Chef: `creatorService.getMyJobsDe`, paginado, cada
 * vez que la pantalla recupera el foco (así, al volver de crear algo, la fila ya lo trae). Qué cuenta como creación y cómo se
 * pinta cada una vive en `utils/creacionesDeDesign.ts`; este gancho solo lee y guarda el estado.
 *
 * ── Los cuatro puntos en que puede estar ─────────────────────────────────────
 *
 *   sinSesion  Nadie ha entrado: no se pide nada. La pantalla enseña las muestras, rotuladas como ejemplos.
 *   cargando   Hay sesión (o se está comprobando) y todavía no se sabe nada. Ni muestras ni vacío: nadie debe leer «no tienes nada»
 *              ni ver lo que no es suyo por un instante.
 *   error      Falló y no hay nada anterior que enseñar. Se dice, con su reintento: un fallo no se disfraza de «todavía no hay nada».
 *   lista      Se sabe qué hay, aunque sea nada.
 *
 * Refrescar no parpadea: al volver a la pantalla se sigue viendo lo último que se supo mientras llega lo nuevo, y un fallo al
 * refrescar no lo borra. Una respuesta que llega tarde no pisa a la más nueva, ni a la de otra cuenta.
 *
 * ── Y no hace nada más ───────────────────────────────────────────────────────
 *
 * Solo lee. Crear, responder, cotizar, ejecutar y cobrar son de `CreatorFlow`: de este servicio no se llama a nada más que a
 * `getMyJobsDe` (lo vigila `design-mis-creaciones.test.mjs`).
 */
export const useCreacionesDeDesign = (): MisCreacionesDeDesign => {
  const { user, loading } = useAuth();
  const t = useT();
  const uid = user?.uid;
  const [estado, setEstado] = useState<Estado>({ de: uid, fase: 'cargando' });
  /* Cada petición lleva su número: solo vale la última, y salir de la pantalla invalida la que esté en vuelo. */
  const peticion = useRef(0);

  const cargar = useCallback(() => {
    if (!uid) return;
    const mia = ++peticion.current;
    /* Lo que ya se veía de ESTA cuenta se queda mientras llega lo nuevo; lo demás, a cargar. */
    setEstado((antes) => (antes.de === uid && antes.fase === 'lista' ? antes : { de: uid, fase: 'cargando' }));
    creatorService
      .getMyJobsDe(uid, esUnaCreacionDeDesign, CUANTAS_CREACIONES, TAMANO_DE_PAGINA)
      .then((trabajos) => {
        if (mia === peticion.current) setEstado({ de: uid, fase: 'lista', trabajos });
      })
      .catch((error) => {
        console.warn('Mis creaciones de Weë Design: no se pudieron cargar:', error);
        if (mia !== peticion.current) return;
        setEstado((antes) => (antes.de === uid && antes.fase === 'lista' ? antes : { de: uid, fase: 'error' }));
      });
  }, [uid]);

  /* Al enfocar se pide; al desenfocar, lo que venga en camino ya no cuenta (al volver se pide otra vez). */
  useFocusEffect(
    useCallback(() => {
      cargar();
      return () => { peticion.current += 1; };
    }, [cargar])
  );

  /* Lo que de verdad se sabe AHORA: sin sesión nada se pide, y lo guardado de otra cuenta no es de esta. */
  const vigente: Estado | null = !uid ? null : estado.de === uid ? estado : { de: uid, fase: 'cargando' };
  const fase: FaseDeMisCreaciones = !uid ? (loading ? 'cargando' : 'sinSesion') : vigente!.fase;
  const trabajos = vigente && vigente.fase === 'lista' ? vigente.trabajos : undefined;

  const creaciones = useMemo(() => (trabajos ?? []).map((job) => creacionDeLaFila(job, t)), [trabajos, t]);
  const trabajoDe = useCallback((id: string) => trabajos?.find((job) => job.id === id), [trabajos]);

  return { fase, creaciones, trabajoDe, recargar: cargar };
};
