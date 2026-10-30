import { useState } from 'react';
import { ESTADOS_DE_REPORTE, type EstadoDeReporte } from '../api/acciones';
import { leerHistorial, leerReportes, type ReporteVista } from '../api/modelos';
import { Cargable } from '../componentes/Cargable';
import { Dato, Datos, Etiqueta, Seccion, Tabla } from '../componentes/Piezas';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';

const Detalle = ({ reporte, alCerrar }: { reporte: ReporteVista; alCerrar: () => void }) => {
  const { t, fecha } = useIdioma();
  const { estado, recargar } = useAccion('moderationAdmin.history', { reportId: reporte.id }, leerHistorial, (h) => h.length === 0);
  return (
    <Seccion titulo={t('admin.moderacion.detalle')}>
      <Datos>
        <Dato etiqueta={t('admin.moderacion.estado')} valor={reporte.estado ? t(`admin.moderacion.estados.${reporte.estado}`) : t('admin.comun.sinDato')} />
        <Dato etiqueta={t('admin.moderacion.motivo')} valor={reporte.motivo ?? t('admin.comun.sinDato')} />
        <Dato etiqueta={t('admin.moderacion.objetivo')} valor={[reporte.tipoDeObjetivo, reporte.idDeObjetivo].filter(Boolean).join(' · ') || t('admin.comun.sinDato')} />
        <Dato etiqueta={t('admin.moderacion.denunciante')} valor={reporte.cuentaQueDenuncia ?? t('admin.comun.sinDato')} />
        <Dato etiqueta={t('admin.moderacion.dueno')} valor={reporte.duenoDelObjetivo ?? t('admin.comun.sinDato')} />
        <Dato etiqueta={t('admin.moderacion.superficie')} valor={reporte.superficie ?? t('admin.comun.sinDato')} />
        <Dato etiqueta={t('admin.moderacion.fecha')} valor={fecha(reporte.creado)} />
      </Datos>
      {reporte.detalles && (
        <>
          <h3>{t('admin.moderacion.textoDelDenunciante')}</h3>
          <blockquote className="cita">{reporte.detalles}</blockquote>
        </>
      )}
      <h3>{t('admin.moderacion.historial')}</h3>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.moderacion.sinHistorial')} hijos={(entradas) => (
        <Tabla cabeceras={[t('admin.moderacion.fecha'), t('admin.moderacion.entradaDe'), t('admin.moderacion.de'), t('admin.moderacion.a'), t('admin.moderacion.resultado'), t('admin.moderacion.accion'), t('admin.moderacion.motivo')]}>
          {entradas.map((e) => (
            <tr key={e.seq}>
              <td>{fecha(e.en)}</td>
              <td>{e.quien ?? t('admin.comun.sinDato')}</td>
              <td>{e.de ?? t('admin.comun.sinDato')}</td>
              <td>{e.a ?? t('admin.comun.sinDato')}</td>
              <td>{e.resultado ?? t('admin.comun.sinDato')}</td>
              <td>{e.accion ?? t('admin.comun.sinDato')}</td>
              <td>{e.motivo ?? t('admin.comun.sinDato')}</td>
            </tr>
          ))}
        </Tabla>
      )} />
      <button type="button" className="boton" onClick={alCerrar}>{t('admin.comun.cerrar')}</button>
    </Seccion>
  );
};

export const Moderacion = () => {
  const { t, fecha } = useIdioma();
  const [estadoElegido, setEstadoElegido] = useState<EstadoDeReporte>('RECEIVED');
  const [abierto, setAbierto] = useState<ReporteVista | null>(null);
  const { estado, recargar } = useAccion('moderationAdmin.list', { status: estadoElegido, limit: 25 }, leerReportes, (l) => l.length === 0);

  return (
    <>
      <header className="cabecera-vista">
        <h1>{t('admin.moderacion.titulo')}</h1>
        <p>{t('admin.moderacion.descripcion')}</p>
      </header>

      <div className="pestanas" role="group" aria-label={t('admin.moderacion.estado')}>
        {ESTADOS_DE_REPORTE.map((s) => (
          <button key={s} type="button" aria-pressed={s === estadoElegido} className={`pestana${s === estadoElegido ? ' activa' : ''}`}
            onClick={() => { setEstadoElegido(s); setAbierto(null); }}>
            {t(`admin.moderacion.estados.${s}`)}
          </button>
        ))}
      </div>

      <Cargable estado={estado} recargar={recargar} vacio={t('admin.moderacion.sinReportes')} hijos={(reportes) => (
        <Seccion titulo={t('admin.moderacion.contador', { contador: reportes.length })}>
          <Tabla cabeceras={[t('admin.moderacion.fecha'), t('admin.moderacion.objetivo'), t('admin.moderacion.motivo'), t('admin.moderacion.historial'), t('admin.moderacion.detalle')]}>
            {reportes.map((r) => (
              <tr key={r.id}>
                <td>{fecha(r.creado)}</td>
                <td>{[r.tipoDeObjetivo, r.idDeObjetivo].filter(Boolean).join(' · ') || t('admin.comun.sinDato')}</td>
                <td><Etiqueta>{r.motivo ?? t('admin.comun.sinDato')}</Etiqueta></td>
                <td>{r.entradasDeHistorial ?? t('admin.comun.sinDato')}</td>
                <td><button type="button" className="boton" onClick={() => setAbierto(r)}>{t('admin.moderacion.verDetalle')}</button></td>
              </tr>
            ))}
          </Tabla>
        </Seccion>
      )} />

      {abierto && <Detalle key={abierto.id} reporte={abierto} alCerrar={() => setAbierto(null)} />}
    </>
  );
};
