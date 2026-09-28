import { createContext, useContext, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * EL BOTÓN DE LA CABECERA QUE DEPENDE DE DÓNDE ESTÁS.
 *
 * La cabecera de Weë Creator es una sola y no se vuelve a montar al cambiar de
 * pantalla; pero hay pantallas que tienen algo que decir arriba a la derecha:
 * Filmmaker, «Exportar». Esto es el hilo por el que una pantalla le pasa su
 * botón a la cabecera mientras está a la vista, y se lo quita al irse.
 */
export interface AccionDeCabecera {
  readonly etiqueta: string;
  readonly icono: string;
  readonly onPress: () => void;
}

export const AccionDeCabeceraContext = createContext<{ poner: (accion: AccionDeCabecera | null) => void }>({
  poner: () => undefined,
});

/**
 * Pone el botón mientras la pantalla está enfocada. Fuera de Weë Creator no hay
 * quien lo pinte y no pasa nada: el contexto por defecto no hace nada.
 */
export const useAccionDeCabecera = (accion: AccionDeCabecera | null): void => {
  const { poner } = useContext(AccionDeCabeceraContext);
  const navigation = useNavigation<any>();
  useEffect(() => {
    poner(accion);
    /* Al taparla otra pantalla de la pila, el botón deja de ser suyo; al volver, lo es otra vez. */
    const alIrse = navigation?.addListener?.('blur', () => poner(null));
    const alVolver = navigation?.addListener?.('focus', () => poner(accion));
    return () => {
      alIrse?.();
      alVolver?.();
      poner(null);
    };
  }, [accion, poner, navigation]);
};
