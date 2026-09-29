import { useCallback, useRef, useState } from 'react';
import { elementsService, type ElementoGuardado } from '../services/elementsService';

/**
 * WEË FILMMAKER · FASE 20 · LO GUARDADO, PARA VINCULARLO a una ficha de la producción.
 *
 * Se pide cuando hace falta —al abrir el reparto o los lugares— y por las clases
 * que encajan con esa ficha, las mismas que comprueba el servidor al guardar
 * (Fase 10): un personaje, con personajes; un lugar, con lugares y escenas
 * guardadas. Juntos, en orden de nombre. Lo que llega de una petición anterior no
 * se pinta.
 */
export type CargaDeElementos = 'sin_pedir' | 'cargando' | 'listos' | 'error';

export interface ElementosParaVincular {
  readonly carga: CargaDeElementos;
  readonly lista: readonly ElementoGuardado[];
  readonly cargar: (tipos: readonly string[]) => void;
}

export const useElementosParaVincular = (): ElementosParaVincular => {
  const [carga, setCarga] = useState<CargaDeElementos>('sin_pedir');
  const [lista, setLista] = useState<readonly ElementoGuardado[]>([]);
  const peticion = useRef(0);

  const cargar = useCallback((tipos: readonly string[]) => {
    const esta = ++peticion.current;
    setCarga('cargando');
    void (async () => {
      const respuestas = await Promise.all(tipos.map((tipo) => elementsService.listar(tipo)));
      if (esta !== peticion.current) return;
      if (respuestas.some((r) => !r.ok)) { setCarga('error'); setLista([]); return; }
      const todos = respuestas.flatMap((r) => (r.ok ? r.elementos : []));
      setLista([...todos].sort((a, b) => a.name.localeCompare(b.name)));
      setCarga('listos');
    })();
  }, []);

  return { carga, lista, cargar };
};
