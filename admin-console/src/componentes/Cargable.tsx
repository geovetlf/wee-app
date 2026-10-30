import type { ReactNode } from 'react';
import type { EstadoDeCarga } from '../hooks';
import { useT } from '../i18n/i18n';
import { Icono } from './Iconos';

/** Pinta los estados de carga, error y vacío de una consulta; con datos, llama a `hijos`. */
export function Cargable<T>({ estado, vacio, recargar, hijos }: {
  estado: EstadoDeCarga<T>;
  /** Texto (ya traducido) para «sin datos». Por defecto, el genérico. */
  vacio?: string;
  recargar?: () => void;
  hijos: (datos: T) => ReactNode;
}) {
  const t = useT();
  switch (estado.fase) {
    case 'inactivo':
      return null;
    case 'cargando':
      return (
        <div className="estado cargando" role="status">
          <span className="solo-lectores">{t('admin.comun.cargando')}</span>
          <i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" />
        </div>
      );
    case 'vacio':
      return <p className="estado vacio">{vacio ?? t('admin.comun.vacio')}</p>;
    case 'error':
      return (
        <div className="estado error" role="alert">
          <Icono nombre="error" />
          <div>
            <strong>{t('admin.errores.titulo')}</strong>
            <span>{t(`admin.errores.${estado.error.tipo}`)}</span>
            {recargar && <button type="button" className="boton" onClick={recargar}>{t('admin.comun.reintentar')}</button>}
          </div>
        </div>
      );
    case 'ok':
      return <>{hijos(estado.datos)}</>;
  }
}
