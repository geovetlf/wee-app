import { useCallback, useRef, useState } from 'react';
import { elementsService, nuevoIdDeElemento, type ElementoGuardado, type NuevoElemento, type ResultadoDeCrearElemento } from '../services/elementsService';

/**
 * WEË FILMMAKER · FASE 20 · LO GUARDADO, PARA VINCULARLO a una ficha de la producción.
 *
 * Se pide cuando hace falta —al abrir el reparto o los lugares— y por las clases
 * que encajan con esa ficha, las mismas que comprueba el servidor al guardar
 * (Fase 10): un personaje, con personajes; un lugar, con lugares y escenas
 * guardadas. Lo que llega de una petición anterior no se pinta.
 *
 * Fase 22 del motor (arreglo R7 de la auditoría): POR PÁGINAS y en ORDEN ESTABLE. Antes llegaban como mucho ocho
 * por clase y se reordenaban por nombre. Ahora se pide la primera página de cada clase a la vez; se enseñan clase a
 * clase —en el orden en que se piden— y, dentro de cada una, en el orden del servidor, que no cambia; y «Cargar más»
 * pide la página siguiente de cada clase que todavía tenga, y la pone DETRÁS de lo suyo: nada se reordena ni se
 * repite. Cuando no queda nada, se deja de ofrecer. La búsqueda filtra lo que ya se ha cargado, y lo dice.
 */
export type CargaDeElementos = 'sin_pedir' | 'cargando' | 'listos' | 'error';

export interface ElementosParaVincular {
  readonly carga: CargaDeElementos;
  /** Clase a clase, y en cada una en el orden del servidor. */
  readonly lista: readonly ElementoGuardado[];
  /** Si alguna clase tiene todavía otra página. */
  readonly hayMas: boolean;
  readonly cargandoMas: boolean;
  readonly cargar: (tipos: readonly string[]) => void;
  readonly cargarMas: () => void;
  /** 3D dentro de Filmmaker: guardar algo en la cuenta para reutilizarlo (Elements, op create); el id lo pone el hook. Opcional para los dobles de antes. */
  readonly crear?: (nuevo: Omit<NuevoElemento, 'elementId'> & { readonly elementId?: string }) => Promise<ResultadoDeCrearElemento>;
}

/** Lo cargado de una clase y el cursor de su página siguiente, si la hay. */
interface DeUnaClase {
  readonly tipo: string;
  readonly elementos: readonly ElementoGuardado[];
  readonly siguiente?: string;
}

export const useElementosParaVincular = (): ElementosParaVincular => {
  const [carga, setCarga] = useState<CargaDeElementos>('sin_pedir');
  const [clases, setClases] = useState<readonly DeUnaClase[]>([]);
  const [cargandoMas, setCargandoMas] = useState(false);
  const peticion = useRef(0);

  const cargar = useCallback((tipos: readonly string[]) => {
    const esta = ++peticion.current;
    setCarga('cargando');
    setClases([]);
    setCargandoMas(false);
    void (async () => {
      const paginas = await Promise.all(tipos.map((tipo) => elementsService.pagina(tipo)));
      if (esta !== peticion.current) return;
      if (paginas.some((p) => !p.ok)) { setCarga('error'); setClases([]); return; }
      setClases(tipos.map((tipo, i) => {
        const p = paginas[i];
        return p.ok ? { tipo, elementos: p.elementos, ...(p.siguiente ? { siguiente: p.siguiente } : {}) } : { tipo, elementos: [] };
      }));
      setCarga('listos');
    })();
  }, []);

  const cargarMas = useCallback(() => {
    const conMas = clases.filter((c) => c.siguiente);
    if (!conMas.length || cargandoMas || carga !== 'listos') return;
    const esta = peticion.current;
    setCargandoMas(true);
    void (async () => {
      const paginas = await Promise.all(conMas.map((c) => elementsService.pagina(c.tipo, { after: c.siguiente })));
      if (esta !== peticion.current) return;
      setCargandoMas(false);
      /* Una página que no llegó deja su clase como estaba —y se puede volver a pedir—; las demás siguen. */
      setClases((antes) => antes.map((c) => {
        const i = conMas.findIndex((x) => x.tipo === c.tipo);
        const p = i < 0 ? undefined : paginas[i];
        if (!p || !p.ok) return c;
        const vistos = new Set(c.elementos.map((e) => e.elementId));
        return { tipo: c.tipo, elementos: [...c.elementos, ...p.elementos.filter((e) => !vistos.has(e.elementId))], ...(p.siguiente ? { siguiente: p.siguiente } : {}) };
      }));
    })();
  }, [clases, cargandoMas, carga]);

  /*
   * GUARDAR ALGO PARA REUTILIZARLO (3D dentro de Filmmaker). Lo pide el servicio de siempre, y lo guardado entra al
   * principio de su clase si esa clase ya estaba cargada: quien lo acaba de guardar lo ve sin volver a preguntar.
   */
  const crear = useCallback(async (nuevo: Omit<NuevoElemento, 'elementId'> & { readonly elementId?: string }): Promise<ResultadoDeCrearElemento> => {
    /* El id lo pone el hook, una vez por petición: las piezas no hablan con los servicios (regla de la Fase 24). */
    const r = await elementsService.crear({ ...nuevo, elementId: nuevo.elementId ?? nuevoIdDeElemento() });
    if (r.ok) {
      setClases((antes) => antes.map((c) => (c.tipo === r.elemento.type && !c.elementos.some((e) => e.elementId === r.elemento.elementId)
        ? { ...c, elementos: [r.elemento, ...c.elementos] }
        : c)));
    }
    return r;
  }, []);

  return {
    carga,
    lista: clases.flatMap((c) => c.elementos),
    hayMas: clases.some((c) => !!c.siguiente),
    cargandoMas,
    cargar,
    cargarMas,
    crear,
  };
};

