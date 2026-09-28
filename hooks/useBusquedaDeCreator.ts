import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { filmmakerService, ResumenDeProduccion } from '../services/filmmakerService';
import { projectsService, WeeProject } from '../services/projectsService';
import { assetsService, AssetDoc, CLAVE_DE_TIPO } from '../services/assetsService';
import { RECETAS, Receta } from '../constants/inspiracion';
import type { Traductor } from '../i18n/traducir';

export type TipoDeResultado = 'produccion' | 'proyecto' | 'creacion' | 'idea';

export interface ResultadoDeBusqueda {
  readonly tipo: TipoDeResultado;
  readonly id: string;
  readonly titulo: string;
  readonly detalle: string;
  readonly icono: string;
  /** Lo que hace falta para abrirlo: la producción, el proyecto, el material o la receta. */
  readonly produccion?: ResumenDeProduccion;
  readonly proyecto?: WeeProject;
  readonly creacion?: AssetDoc;
  readonly receta?: Receta;
}

/** Sin mayúsculas ni tildes: «Cinemático» y «cinematico» son lo mismo para quien busca. */
export const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Cuántos de cada grupo se enseñan: una búsqueda es para encontrar, no para listar. */
const POR_GRUPO = 5;

/**
 * BUSCAR EN WEË CREATOR: tus proyectos, tus producciones, tus creaciones y las
 * ideas de Inspira.
 *
 * No hay un buscador en el servidor para esto y no se inventa: se piden UNA vez,
 * al empezar a buscar, las listas que ya existen —las mismas de Proyectos y de
 * Mis creaciones— y se filtran aquí mientras se escribe. Sin llamadas por tecla y
 * sin un Credit. Lo que no está en la primera página de creaciones no sale, y es
 * lo que se espera de una búsqueda rápida: para lo demás está Mis creaciones.
 */
export const useBusquedaDeCreator = (t: Traductor) => {
  const { user } = useAuth();
  const [fuentes, setFuentes] = useState<{
    producciones: readonly ResumenDeProduccion[];
    proyectos: readonly WeeProject[];
    creaciones: readonly AssetDoc[];
  } | null>(null);
  const [cargando, setCargando] = useState(false);
  const pedido = useRef(false);

  const preparar = useCallback(async () => {
    if (pedido.current || !user) return;
    pedido.current = true;
    setCargando(true);
    const [producciones, proyectos, creaciones] = await Promise.allSettled([
      filmmakerService.listProductions({ status: 'active' }),
      projectsService.list(user.uid),
      assetsService.listar(user.uid, { orden: 'recent' }),
    ]);
    setFuentes({
      producciones: producciones.status === 'fulfilled' && producciones.value.ok ? producciones.value.valor.producciones : [],
      proyectos: proyectos.status === 'fulfilled' ? proyectos.value : [],
      creaciones: creaciones.status === 'fulfilled' ? creaciones.value.items : [],
    });
    setCargando(false);
  }, [user]);

  const buscar = useCallback((texto: string): readonly ResultadoDeBusqueda[] => {
    const q = normalizar(texto);
    if (!q) return [];
    const casa = (...partes: (string | undefined)[]) => partes.some((p) => !!p && normalizar(p).includes(q));
    const salida: ResultadoDeBusqueda[] = [];

    (fuentes?.producciones ?? [])
      .filter((p) => casa(p.title))
      .slice(0, POR_GRUPO)
      .forEach((p) => salida.push({
        tipo: 'produccion', id: p.productionId, titulo: p.title, icono: 'film-outline', produccion: p,
        detalle: t('workspace.searchProductionDetail', { formato: p.aspectRatio }),
      }));

    (fuentes?.proyectos ?? [])
      .filter((p) => casa(p.name))
      .slice(0, POR_GRUPO)
      .forEach((p) => salida.push({
        tipo: 'proyecto', id: p.id, titulo: `${p.emoji} ${p.name}`, icono: 'folder-open-outline', proyecto: p,
        detalle: t('workspace.searchProjectDetail'),
      }));

    (fuentes?.creaciones ?? [])
      .filter((a) => casa(a.name, typeof a.metadata?.goal === 'string' ? a.metadata.goal : undefined))
      .slice(0, POR_GRUPO)
      .forEach((a) => salida.push({
        tipo: 'creacion', id: a.assetId, titulo: a.name ?? t(CLAVE_DE_TIPO[a.kind]), icono: a.kind === 'video' ? 'videocam-outline' : a.kind === 'image' ? 'image-outline' : 'document-outline',
        creacion: a, detalle: t(CLAVE_DE_TIPO[a.kind]),
      }));

    RECETAS
      .filter((r) => casa(t(r.clave), t(r.claveDescripcion)))
      .slice(0, POR_GRUPO)
      .forEach((r) => salida.push({
        tipo: 'idea', id: r.id, titulo: t(r.clave), detalle: t(r.claveDescripcion), icono: r.icono, receta: r,
      }));

    return salida;
  }, [fuentes, t]);

  return { preparar, buscar, cargando, listo: !!fuentes };
};
