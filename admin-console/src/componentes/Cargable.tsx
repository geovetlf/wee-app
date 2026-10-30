import type { ReactNode } from 'react';
import type { EstadoDeCarga } from '../hooks';
import { useT } from '../i18n/i18n';

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
      return <p className="estado" role="status">{t('admin.comun.cargando')}</p>;
    case 'vacio':
      return <p className="estado vacio">{vacio ?? t('admin.comun.vacio')}</p>;
    case 'error':
      return (
        <div className="estado error" role="alert">
          <strong>{t('admin.errores.titulo')}</strong>
          <span>{t(`admin.errores.${estado.error.tipo}`)}</span>
          {recargar && <button type="button" className="boton" onClick={recargar}>{t('admin.comun.reintentar')}</button>}
        </div>
      );
    case 'ok':
      return <>{hijos(estado.datos)}</>;
  }
}
