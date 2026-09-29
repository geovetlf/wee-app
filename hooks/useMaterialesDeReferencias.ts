import { useEffect, useMemo, useRef, useState } from 'react';
import { assetsService } from '../services/assetsService';
import type { MaterialComoReferencia } from '../services/assetsService';
import type { ProductionReference } from '../services/filmmaker/dominio';

/**
 * EL MATERIAL DE CADA REFERENCIA, TAL COMO ESTÁ HOY (Filmmaker Engine, Fase 36).
 *
 * Una referencia de la producción apunta a un material de la cuenta (`assetId`, de Mis creaciones) o a algo guardado
 * (`element`). Aquí se pregunta, UNA vez por material, cómo está: si sigue (y su miniatura), si se retiró —se borró
 * de Mis creaciones—, o si no se pudo saber. Solo lectura, de la propia cuenta; lo guardado no se pregunta aquí (su
 * vínculo lo verifica el servidor al guardar).
 */
export type EstadoDelMaterial = { readonly estado: 'cargando' } | MaterialComoReferencia;

export type OrigenDeReferencia = 'creaciones' | 'guardado' | 'ninguno';

export const origenDeReferencia = (r: ProductionReference): OrigenDeReferencia => (r.assetId ? 'creaciones' : r.element ? 'guardado' : 'ninguno');

export const useMaterialesDeReferencias = (referencias: readonly ProductionReference[]): ReadonlyMap<string, EstadoDelMaterial> => {
  const ids = useMemo(() => [...new Set(referencias.map((r) => r.assetId).filter((x): x is string => !!x))].sort(), [referencias]);
  const clave = ids.join('|');
  const [vistos, setVistos] = useState<ReadonlyMap<string, EstadoDelMaterial>>(new Map());
  const pedidos = useRef(new Set<string>());
  const montado = useRef(true);
  useEffect(() => () => { montado.current = false; }, []);
  useEffect(() => {
    const faltan = ids.filter((id) => !pedidos.current.has(id));
    if (!faltan.length) return;
    faltan.forEach((id) => pedidos.current.add(id));
    setVistos((antes) => new Map([...antes, ...faltan.map((id) => [id, { estado: 'cargando' }] as [string, EstadoDelMaterial])]));
    void Promise.all(faltan.map(async (id) => [id, await assetsService.vistaDelMaterial(id)] as [string, EstadoDelMaterial])).then((leidos) => {
      if (montado.current) setVistos((antes) => new Map([...antes, ...leidos]));
    });
    // Solo cuando cambia QUÉ materiales hay; cada uno se pregunta una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  return vistos;
};
