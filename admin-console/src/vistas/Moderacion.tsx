import { useEffect, useRef, useState } from 'react';
import { ESTADOS_DE_REPORTE, type EstadoDeReporte } from '../api/acciones';
import { leerHistorial, leerReportes, type ReporteVista } from '../api/modelos';
import { Cargable } from '../componentes/Cargable';
import { AvisoDeLista, BuscadorLocal, avisoPorLimite, coincide } from '../componentes/Lista';
import { Dato, Datos, Etiqueta, Filtros, Seccion, Tabla, useOrden, type Tono } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { Vista } from '../componentes/Vista';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';

const LIMITE = 25;
const TONO_DE_REPORTE: Record<EstadoDeReporte, Tono> = { RECEIVED: 'atencion', REVIEWING: 'neutro', ACTIONED: 'ok', DISMISSED: 'neutro', ESCALATED: 'atencion' };

const Detalle = ({ reporte, alCerrar }: { reporte: ReporteVista; alCerrar: () => void }) => {
  const { t, fecha } = useIdioma();
  const { estado, recargar } = useAccion('moderationAdmin.history', { reportId: reporte.id }, leerHistorial, (h) => h.length === 0);
  const nada = t('admin.comun.sinDato');
  const conocido = (ESTADOS_DE_REPORTE as readonly string[]).includes(reporte.estado ?? '');
  const titulo = useRef<HTMLDivElement>(null);
  /* Se abre debajo de la cola en pantallas estrechas: el foco va con él, y al cerrar vuelve a la fila. */
  useEffect(() => { titulo.current?.focus(); titulo.current?.scrollIntoView?.({ block: 'nearest' }); }, [reporte.id]);
  return (
    <div ref={titulo} tabIndex={-1} className="detalle-de-reporte">
      <Seccion titulo={t('admin.moderacion.detalle')} acciones={<button type="button" className="boton pequeno" onClick={alCerrar}>{t('admin.comun.cerrar')}</button>}>
        <Datos>
          <Dato etiqueta={t('admin.moderacion.estado')} valor={reporte.estado ? <Etiqueta tono={conocido ? TONO_DE_REPORTE[reporte.estado as EstadoDeReporte] : 'neutro'}>{conocido ? t(`admin.moderacion.estados.${reporte.estado}`) : reporte.estado}</Etiqueta> : nada} />
          <Dato etiqueta={t('admin.moderacion.motivo')} valor={reporte.motivo ?? nada} />
          <Dato etiqueta={t('admin.moderacion.objetivo')} valor={[reporte.tipoDeObjetivo, reporte.idDeObjetivo].filter(Boolean).join(' · ') || nada} />
          <Dato etiqueta={t('admin.moderacion.denunciante')} valor={<span className="codigo">{reporte.cuentaQueDenuncia ?? nada}</span>} />
          <Dato etiqueta={t('admin.moderacion.dueno')} valor={<span className="codigo">{reporte.duenoDelObjetivo ?? nada}</span>} />
          <Dato etiqueta={t('admin.moderacion.superficie')} valor={reporte.superficie ?? nada} />
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
          <Tabla ancha cabeceras={[t('admin.moderacion.fecha'), t('admin.moderacion.entradaDe'), t('admin.moderacion.de'), t('admin.moderacion.a'), t('admin.moderacion.resultado'), t('admin.moderacion.accion'), t('admin.moderacion.motivo')]}>
            {entradas.map((e) => (
              <tr key={e.seq}>
                <td>{fecha(e.en)}</td>
                <td className="codigo">{e.quien ?? nada}</td>
                <td>{e.de ?? nada}</td>
                <td>{e.a ?? nada}</td>
                <td>{e.resultado ?? nada}</td>
                <td>{e.accion ?? nada}</td>
                <td>{e.motivo ?? nada}</td>
              </tr>
            ))}
          </Tabla>
        )} />
        <Procedencia fuente="moderationAdmin.history" estado={estado} />
      </Seccion>
    </div>
  );
};

/** La tabla de la cola: el orden y la búsqueda actúan sobre lo que llegó. */
const TablaDeReportes = ({ reportes, abierto, alAbrir }: { reportes: ReporteVista[]; abierto: ReporteVista | null; alAbrir: (r: ReporteVista, boton: HTMLButtonElement) => void }) => {
  const { t, fecha } = useIdioma();
  const nada = t('admin.comun.sinDato');
  const [buscado, setBuscado] = useState('');
  const visibles = reportes.filter((r) => coincide(buscado, r.tipoDeObjetivo, r.idDeObjetivo, r.motivo));
  const { filas, orden } = useOrden(visibles, { 0: (r) => r.creado, 1: (r) => r.idDeObjetivo, 2: (r) => r.motivo, 3: (r) => r.entradasDeHistorial });
  return (
    <>
      <Filtros><BuscadorLocal etiqueta={t('admin.moderacion.buscar')} valor={buscado} alCambiar={setBuscado} /></Filtros>
      {filas.length === 0 ? <p className="estado vacio">{t('admin.lista.sinCoincidencias')}</p> : (
        <Tabla accionFija orden={orden} numericas={[3]} cabeceras={[t('admin.moderacion.fecha'), t('admin.moderacion.objetivo'), t('admin.moderacion.motivo'), t('admin.moderacion.historial'), t('admin.moderacion.detalle')]}>
          {filas.map((r) => (
            <tr key={r.id} className={abierto?.id === r.id ? 'seleccionada' : undefined}>
              <td>{fecha(r.creado)}</td>
              <td>{[r.tipoDeObjetivo, r.idDeObjetivo].filter(Boolean).join(' · ') || nada}</td>
              <td><Etiqueta>{r.motivo ?? nada}</Etiqueta></td>
              <td>{r.entradasDeHistorial ?? nada}</td>
              <td><button type="button" className="boton pequeno" aria-expanded={abierto?.id === r.id} onClick={(e) => alAbrir(r, e.currentTarget)}>{t('admin.moderacion.verDetalle')}</button></td>
            </tr>
          ))}
        </Tabla>
      )}
    </>
  );
};

const Cola = () => {
  const { t, numero } = useIdioma();
  const [estadoElegido, setEstadoElegido] = useState<EstadoDeReporte>('RECEIVED');
  const [abierto, setAbierto] = useState<ReporteVista | null>(null);
  const origen = useRef<HTMLButtonElement | null>(null);
  const { estado, recargar } = useAccion('moderationAdmin.list', { status: estadoElegido, limit: LIMITE }, leerReportes, (l) => l.length === 0);

  return (
    <>
      <div className="segmentos" role="group" aria-label={t('admin.moderacion.estado')}>
        {ESTADOS_DE_REPORTE.map((s) => (
          <button key={s} type="button" aria-pressed={s === estadoElegido} className={`segmento${s === estadoElegido ? ' activa' : ''}`}
            onClick={() => { setEstadoElegido(s); setAbierto(null); }}>
            {t(`admin.moderacion.estados.${s}`)}
          </button>
        ))}
      </div>

      <div className={`maestro-detalle${abierto ? ' con-detalle' : ''}`}>
        <Cargable estado={estado} recargar={recargar} vacio={t('admin.moderacion.sinReportes')} hijos={(reportes) => {
          const cortada = avisoPorLimite(reportes.length, LIMITE);
          return (
            <Seccion titulo={cortada ? t('admin.moderacion.contadorAlMenos', { n: numero(reportes.length) }) : t('admin.moderacion.contador', { contador: reportes.length })} pie={<Procedencia fuente="moderationAdmin.list" estado={estado} />}>
              <TablaDeReportes reportes={reportes} abierto={abierto} alAbrir={(r, boton) => { origen.current = boton; setAbierto(r); }} />
              <AvisoDeLista truncado={cortada} />
            </Seccion>
          );
        }} />
        {abierto && <Detalle key={abierto.id} reporte={abierto} alCerrar={() => { setAbierto(null); origen.current?.focus(); }} />}
      </div>
    </>
  );
};

export const Moderacion = () => {
  const { t } = useIdioma();
  return (
    <Vista titulo={t('admin.moderacion.titulo')} descripcion={t('admin.moderacion.descripcion')} dominios={['k']}>
      <Cola />
    </Vista>
  );
};
