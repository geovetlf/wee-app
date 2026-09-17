import React, { createContext, useContext, useMemo } from 'react';

/**
 * LO QUE EL MARCO DE WEË AI LE CUENTA A LA CABECERA DE UNA SECCIÓN.
 *
 * Hay dos maneras de llegar a una sección de Weë AI: por su cuenta —Weë Studio,
 * Weë Design y Weë Chef, que son pantallas enteras— o dentro de `CreatorShell`,
 * que es el marco de las demás. La cabecera es la MISMA en los dos casos, pero
 * lo que la rodea no, y hay dos cosas que necesita saber de quien la envuelve:
 *
 *  · `saldoALaVista`: si el marco ya enseña los Credits —su franja en el
 *    teléfono, su barra lateral en escritorio—, para no repetirlos.
 *
 *  · `aireLateral`: cuánto aire mete el marco por los lados. La cabecera lo
 *    devuelve con un margen negativo, porque si no la misma cabecera tendría
 *    32 puntos menos de ancho dentro del marco que fuera de él, y el nombre
 *    —que ya compite con el saldo— se quedaría en "Weë…" en unas secciones sí
 *    y en otras no. Una cabecera igual en todas es una cabecera con el mismo
 *    ancho en todas.
 *
 * Fuera de Weë AI no hay marco, y los valores de partida lo dicen: nadie enseña
 * el saldo y nadie mete aire.
 */
export interface DatosDelMarco {
  saldoALaVista: boolean;
  aireLateral: number;
}

const SIN_MARCO: DatosDelMarco = { saldoALaVista: false, aireLateral: 0 };

const MarcoDeSeccion = createContext<DatosDelMarco>(SIN_MARCO);

export const ConMarcoDeSeccion: React.FC<DatosDelMarco & { children: React.ReactNode }> = ({
  saldoALaVista, aireLateral, children,
}) => {
  /* El objeto se recuerda: uno nuevo en cada pintada volvería a pintar la cabecera. */
  const valor = useMemo(() => ({ saldoALaVista, aireLateral }), [saldoALaVista, aireLateral]);
  return <MarcoDeSeccion.Provider value={valor}>{children}</MarcoDeSeccion.Provider>;
};

/** Qué aporta el marco que envuelve a esta cabecera. */
export const useMarcoDeSeccion = (): DatosDelMarco => useContext(MarcoDeSeccion);
