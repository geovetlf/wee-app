import { useCallback, useEffect, useRef } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, Platform } from 'react-native';

/**
 * UNA PÁGINA A LA VEZ TAMBIÉN EN LA WEB (Weëls y el Wäll inmersivo).
 *
 * En el teléfono, `pagingEnabled` deja cada publicación encajada en la pantalla. En la web no: la rueda del ratón o el
 * trackpad pueden parar a medio camino entre dos y dejar media de cada una. Aquí, cuando el desplazamiento se detiene,
 * la lista se ajusta a la página más cercana; y las flechas del teclado (y Av Pág / Re Pág) pasan de una a otra.
 *
 * Fuera de la web no hace nada: el gesto nativo ya hace lo correcto y añadir otro ajuste lo pelearía.
 */
export function useAjusteVerticalWeb<T>(alto: number, total: number, paginaInicial = 0) {
  const lista = useRef<FlatList<T>>(null);
  /* Dónde está la lista: empieza en la página con la que se abrió (initialScrollIndex). */
  const desplazamiento = useRef(paginaInicial * alto);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esWeb = Platform.OS === 'web';

  const irAPagina = useCallback((pagina: number) => {
    if (!alto) return;
    const destino = Math.max(0, Math.min(total - 1, pagina));
    lista.current?.scrollToOffset({ offset: destino * alto, animated: true });
  }, [alto, total]);

  const alDesplazar = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!esWeb || !alto) return;
    desplazamiento.current = e.nativeEvent.contentOffset.y;
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      const pagina = Math.round(desplazamiento.current / alto);
      /* Si ya está encajada (diferencia de menos de un punto), no se mueve: un ajuste innecesario se ve como un salto. */
      if (Math.abs(pagina * alto - desplazamiento.current) > 1) irAPagina(pagina);
    }, 140);
  }, [esWeb, alto, irAPagina]);

  useEffect(() => {
    if (!esWeb) return;
    const alPulsar = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const actual = alto ? Math.round(desplazamiento.current / alto) : 0;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); irAPagina(actual + 1); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); irAPagina(actual - 1); }
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
      if (espera.current) clearTimeout(espera.current);
    };
  }, [esWeb, alto, irAPagina]);

  return { lista, alDesplazar, irAPagina };
}
