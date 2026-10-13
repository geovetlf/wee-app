import { useRef, useState } from 'react';
import { assetsService, AssetKind } from '../services/assetsService';
import { CreacionCompartible, MaterialDeLaCuenta } from '../utils/creacionesCompartibles';

/**
 * «Mis creaciones» para PUBLICAR: una página del material de la cuenta (`assetsService.listar`, solo lectura, la misma
 * consulta e índice que la biblioteca) pasada por el filtro de lo compartible que le dé quien la usa. Lo usan el
 * compositor del Wäll (imágenes y vídeos) y «Crear Weël» (vídeos que valen como Weël).
 *
 * No se lee al montar: se lee cuando la persona abre la lista (`cargar`). Nada se escribe, nada se genera, nada se cobra.
 */
export type EstadoDeCreaciones =
  | { fase: 'sin-pedir' }
  | { fase: 'cargando' }
  | { fase: 'error' }
  | { fase: 'lista'; items: CreacionCompartible[]; cursor: unknown; hayMas: boolean; cargandoMas: boolean };

export const useCreacionesCompartibles = (
  uid: string | undefined,
  filtrar: (materiales: MaterialDeLaCuenta[]) => CreacionCompartible[],
  kind?: AssetKind,
) => {
  const [estado, setEstado] = useState<EstadoDeCreaciones>({ fase: 'sin-pedir' });
  const peticion = useRef(0);

  const cargar = async (mas = false) => {
    if (!uid) return setEstado({ fase: 'lista', items: [], cursor: null, hayMas: false, cargandoMas: false });
    const actual = estado;
    if (mas && (actual.fase !== 'lista' || !actual.hayMas || actual.cargandoMas)) return;
    const mia = ++peticion.current;
    if (mas && actual.fase === 'lista') setEstado({ ...actual, cargandoMas: true });
    else setEstado({ fase: 'cargando' });
    try {
      const pagina = await assetsService.listar(uid, kind ? { kind } : {}, mas && actual.fase === 'lista' ? (actual.cursor as never) : null);
      if (mia !== peticion.current) return;
      const nuevos = filtrar(pagina.items as unknown as MaterialDeLaCuenta[]);
      setEstado({
        fase: 'lista',
        items: mas && actual.fase === 'lista' ? [...actual.items, ...nuevos] : nuevos,
        cursor: pagina.cursor,
        hayMas: pagina.hayMas,
        cargandoMas: false,
      });
    } catch (error) {
      if (mia !== peticion.current) return;
      console.warn('Mis creaciones: no se pudieron leer', error);
      setEstado({ fase: 'error' });
    }
  };

  /** La primera vez que se abre, se lee; las siguientes, se enseña lo que ya hay. */
  const abrir = () => {
    if (estado.fase === 'sin-pedir' || estado.fase === 'error') void cargar();
  };

  return { estado, cargar, abrir };
};
