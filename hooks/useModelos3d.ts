import { useCallback, useRef, useState } from 'react';
import { elementsService } from '../services/elementsService';
import { assetsService } from '../services/assetsService';

/** Lo que se sabe de lo guardado: si tiene un modelo 3D, y cuál. */
export type ModeloDeUnGuardado =
  | { readonly fase: 'buscando' }
  | { readonly fase: 'sin_modelo' }
  | { readonly fase: 'con_modelo'; readonly assetId: string }
  | { readonly fase: 'error' };

/** El visor, abierto o no, y con qué: la dirección del modelo o por qué no la hay. */
export type VistaDelModelo =
  | { readonly fase: 'cerrada' }
  | { readonly fase: 'abriendo'; readonly nombre: string }
  | { readonly fase: 'lista'; readonly nombre: string; readonly url: string }
  | { readonly fase: 'sin_entrega' | 'llegando' | 'retirado' | 'desconocido'; readonly nombre: string };

export interface ModelosDeLaCuenta {
  /** Lo que se sabe del modelo de ese guardado (nada, si todavía no se ha preguntado). */
  readonly de: (elementId: string) => ModeloDeUnGuardado | undefined;
  /** Preguntar si ese guardado tiene modelo. Una vez; solo se vuelve a preguntar si no hubo respuesta. */
  readonly buscar: (elementId: string) => void;
  readonly vista: VistaDelModelo;
  /** Abrir el visor con ese modelo: su dirección se pide EN ESE MOMENTO (una llave de Media Cloud caduca en minutos). */
  readonly ver: (assetId: string, nombre: string) => void;
  readonly cerrar: () => void;
}

/**
 * 3D DENTRO DE FILMMAKER · VER EL MODELO 3D DE LO GUARDADO.
 *
 * Lo pide la pantalla, una vez, y lo usan las piezas por el espacio (la regla de la Fase 24: las piezas no hablan con el
 * servidor). Dos preguntas, las dos a lo que ya existe: si el guardado tiene modelo (`elements`, `get`) y con qué
 * dirección se ve (Mis creaciones: su entrega, o la llave de Media Cloud). Ni se guarda un modelo, ni se copia, ni se
 * inventa una dirección.
 */
export const useModelos3d = (): ModelosDeLaCuenta => {
  const [porGuardado, setPorGuardado] = useState<Readonly<Record<string, ModeloDeUnGuardado>>>({});
  const [vista, setVista] = useState<VistaDelModelo>({ fase: 'cerrada' });
  const preguntados = useRef(new Set<string>());
  /* La vista que se pidió la última: lo que llega de una anterior no se pinta. */
  const ultima = useRef(0);

  const buscar = useCallback((elementId: string) => {
    if (!elementId || preguntados.current.has(elementId)) return;
    preguntados.current.add(elementId);
    setPorGuardado((a) => ({ ...a, [elementId]: { fase: 'buscando' } }));
    void elementsService.modelo3dDe(elementId).then((r) => {
      if (r.estado === 'sin_respuesta') preguntados.current.delete(elementId);
      const fase: ModeloDeUnGuardado = r.estado === 'con_modelo' ? { fase: 'con_modelo', assetId: r.assetId }
        : r.estado === 'sin_modelo' ? { fase: 'sin_modelo' } : { fase: 'error' };
      setPorGuardado((a) => ({ ...a, [elementId]: fase }));
    });
  }, []);

  const ver = useCallback((assetId: string, nombre: string) => {
    const esta = ++ultima.current;
    setVista({ fase: 'abriendo', nombre });
    void assetsService.direccionDelModelo(assetId).then((d) => {
      if (esta !== ultima.current) return;
      setVista(d.estado === 'lista' ? { fase: 'lista', nombre, url: d.url } : { fase: d.estado, nombre });
    });
  }, []);

  const cerrar = useCallback(() => {
    ultima.current += 1;
    setVista({ fase: 'cerrada' });
  }, []);

  const de = useCallback((elementId: string) => porGuardado[elementId], [porGuardado]);

  return { de, buscar, vista, ver, cerrar };
};
