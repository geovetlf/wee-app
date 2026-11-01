import { useMemo, useState, type ReactNode } from 'react';
import { TONO_DE_ESTADO, dominioPorId, estadoDeDominio } from '../dominios';
import { ContextoDeVista } from '../hooks';
import { useIdioma } from '../i18n/i18n';
import { Icono } from './Iconos';
import { Etiqueta } from './Piezas';

/**
 * LA CABECERA COMÚN DE TODAS LAS VISTAS: título, descripción, hora de la última lectura y acciones a la derecha.
 * La hora solo se dice si el servidor contestó algo: mientras tanto, «última actualización desconocida».
 * `refrescable = false` en las vistas donde lo único que hay es lo que se pidió a mano (una cuenta).
 */
export const Vista = ({ titulo, descripcion, refrescable = true, dominios = [], children }: { titulo: string; descripcion?: string; refrescable?: boolean; dominios?: readonly string[]; children: ReactNode }) => {
  const { t, hora } = useIdioma();
  const [generacion, setGeneracion] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  const [ultima, setUltima] = useState<number>();
  const [conError, setConError] = useState<ReadonlySet<string>>(new Set());

  const refresco = useMemo(() => ({
    generacion,
    empezar: () => setPendientes((n) => n + 1),
    terminar: (leidoEn?: number) => {
      setPendientes((n) => Math.max(0, n - 1));
      if (leidoEn !== undefined) setUltima(leidoEn);
    },
    informar: (consulta: string, error: boolean) => setConError((antes) => {
      if (antes.has(consulta) === error) return antes;
      const nuevo = new Set(antes);
      if (error) nuevo.add(consulta); else nuevo.delete(consulta);
      return nuevo;
    }),
  }), [generacion]);

  return (
    <ContextoDeVista.Provider value={refresco}>
      <header className="cabecera-vista">
        <div className="cabecera-titulos">
          <h1>{titulo}</h1>
          {descripcion ? <p>{descripcion}</p> : null}
          {dominios.length > 0 && (
            <div className="dominios-de-vista">
              {dominios.flatMap((id) => {
                const d = dominioPorId(id);
                if (!d) return [];
                const estado = estadoDeDominio(d);
                return [<a key={id} href={`#/dominios/${id}`} aria-label={t('admin.dominios.chip', { dominio: t(`admin.dominios.lista.${id}.nombre`), estado: t(`admin.dominios.estados.${estado}`) })}><Etiqueta tono={TONO_DE_ESTADO[estado]}>{`${id.toUpperCase()} · ${t(`admin.dominios.estados.${estado}`)}`}</Etiqueta></a>];
              })}
            </div>
          )}
        </div>
        {refrescable && (
          <div className="cabecera-acciones">
            <span className="actualizacion" role="status">
              {pendientes > 0 ? t('admin.vista.actualizando')
                : conError.size > 0 ? (ultima !== undefined ? t('admin.vista.conErrores', { hora: hora(ultima) }) : t('admin.vista.conErroresSinHora'))
                  : ultima !== undefined ? t('admin.vista.actualizado', { hora: hora(ultima) }) : t('admin.vista.desconocida')}
            </span>
            <button type="button" className="boton" disabled={pendientes > 0} onClick={() => setGeneracion((n) => n + 1)}>
              <Icono nombre="refrescar" tamano={16} />
              {t('admin.vista.actualizar')}
            </button>
          </div>
        )}
      </header>
      {children}
    </ContextoDeVista.Provider>
  );
};
