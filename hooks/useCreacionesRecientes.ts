import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { assetsService } from '../services/assetsService';
import type { AssetDoc } from '../services/assetsService';
import { CLAVE_DE_TIPO } from '../services/vistaDeAsset';
import { ICONO_POR_TIPO } from '../components/creator/RejillaDeCreaciones';
import type { CreacionEnLaFila } from '../components/creator/FilaDeCreaciones';

export type CargaDeRecientes = 'cargando' | 'listas' | 'error';

export interface CreacionesRecientes {
  readonly carga: CargaDeRecientes;
  /** Ya en la forma de la fila: su clase como clave, su icono, su título y, si tiene, su miniatura. */
  readonly items: readonly CreacionEnLaFila[];
}

/** Lo que tiene imagen que enseñar en la lámina; lo demás enseña el icono de su clase. */
const CON_IMAGEN: ReadonlySet<AssetDoc['kind']> = new Set(['image', 'video']);

type Formato = ReturnType<typeof useIdioma>['formato'];

const aLaFila = (a: AssetDoc, formato: Formato): CreacionEnLaFila => {
  const miniatura = CON_IMAGEN.has(a.kind) ? assetsService.miniatura(a)?.url ?? null : null;
  return {
    id: a.assetId,
    claveTipo: CLAVE_DE_TIPO[a.kind],
    icono: ICONO_POR_TIPO[a.kind],
    /* El nombre es de quien lo creó; sin él, cuándo se hizo —la clase ya la dice la etiqueta de la lámina—. */
    titulo: a.name?.trim() || formato.fecha(a.createdAt),
    ...(miniatura ? { miniatura } : {}),
    /* Un vídeo dice cuánto dura, en segundos y en el idioma de quien mira. */
    ...(a.kind === 'video' && typeof a.durationSec === 'number' && a.durationSec > 0
      ? { duracion: formato.numero(Math.round(a.durationSec), { style: 'unit', unit: 'second', unitDisplay: 'narrow' }) }
      : {}),
  };
};

/**
 * LO ÚLTIMO QUE HIZO LA CUENTA, PARA LA FILA DE «MIS CREACIONES» (Fase 28 del motor: §25, fuera lo simulado).
 *
 * La fila de Weë Studio y la de Weë Design enseñaban cuatro creaciones inventadas (`studioMocks`,
 * `CREACIONES_DE_DESIGN`). Ahora enseñan las de verdad: la primera página de Mis creaciones —`assetsService.listar`, el
 * de la biblioteca: la CUENTA, no la cara—, las más recientes, recortada a lo que cabe. No hay una consulta nueva: es
 * la de siempre, con su índice. Se vuelve a pedir cada vez que la pantalla vuelve a verse, así que al volver de crear
 * lo nuevo ya está; y lo que llega tarde de una vista anterior no se pinta. Sin cuenta, no hay nada que enseñar.
 */
export const useCreacionesRecientes = (cuantas: number): CreacionesRecientes => {
  const { user } = useAuth();
  const { formato } = useIdioma();
  const cuenta = user?.uid ?? null;
  const [estado, setEstado] = useState<{ carga: CargaDeRecientes; docs: readonly AssetDoc[] }>({ carga: 'cargando', docs: [] });

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      if (!cuenta) {
        setEstado({ carga: 'listas', docs: [] });
        return undefined;
      }
      assetsService.listar(cuenta, { orden: 'recent' })
        .then((p) => { if (vivo) setEstado({ carga: 'listas', docs: p.items.slice(0, cuantas) }); })
        /* Si ya había algo, se queda: una vuelta que no pudo preguntar no borra lo que se estaba viendo. */
        .catch(() => { if (vivo) setEstado((antes) => (antes.docs.length ? antes : { carga: 'error', docs: [] })); });
      return () => { vivo = false; };
    }, [cuenta, cuantas])
  );

  const items = useMemo(() => estado.docs.map((a) => aLaFila(a, formato)), [estado.docs, formato]);
  return { carga: estado.carga, items };
};
