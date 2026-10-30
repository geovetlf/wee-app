import type { ReactNode } from 'react';
import { LIMITE_MAXIMO, type EstadoDeReporte } from '../api/acciones';
import { leerEstadisticasDeCredits, leerEstadoDelMotor, leerReportes } from '../api/modelos';
import { Cargable } from '../componentes/Cargable';
import { Dato, Datos, Seccion } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { useAccion, type EstadoDeCarga } from '../hooks';
import { useIdioma } from '../i18n/i18n';

/*
 * EL PANORAMA GLOBAL. Solo enseña lo que tiene una FUENTE DE SERVIDOR que ya existe, y de cada bloque dice de dónde
 * sale y a qué hora se leyó. Lo que Weë todavía no mide no se aproxima ni se simula: va en «Lo que aún no se mide»,
 * con el motivo. Cada bloque carga por separado: si uno falla, los demás siguen.
 */

const Bloque = ({ titulo, fuente, estado, children }: { titulo: string; fuente: string; estado: EstadoDeCarga<unknown>; children: ReactNode }) => (
  <Seccion titulo={titulo}>
    {children}
    <Procedencia fuente={fuente} estado={estado} />
  </Seccion>
);

const Ia = () => {
  const { t, numero } = useIdioma();
  const { estado, recargar } = useAccion('engineAdmin.status', undefined, leerEstadoDelMotor);
  return (
    <Bloque titulo={t('admin.panorama.ia')} fuente="engineAdmin.status" estado={estado}>
      <Cargable estado={estado} recargar={recargar} hijos={(m) => {
        const listos = m.proveedores.filter((p) => p.configurado && p.habilitado).length;
        return (
          <>
            {m.iaDetenida === true && <p className="aviso" role="alert">{t('admin.resumen.iaDetenidaAviso')}</p>}
            <Datos>
              <Dato resaltar={m.iaDetenida === true} etiqueta={t('admin.resumen.iaDetenida')} valor={m.iaDetenida === undefined ? t('admin.comun.sinDato') : m.iaDetenida ? t('admin.comun.si') : t('admin.comun.no')} />
              <Dato etiqueta={t('admin.panorama.proveedoresListos')} valor={t('admin.panorama.deTotal', { parte: numero(listos), total: numero(m.proveedores.length) })} />
              <Dato etiqueta={t('admin.resumen.precios')} valor={m.precios === 'real' ? t('admin.resumen.preciosReal') : m.precios === 'simulated' ? t('admin.resumen.preciosSimulated') : t('admin.comun.sinDato')} />
              <Dato etiqueta={t('admin.panorama.capacidadesConRuta')} valor={numero(m.rutas.length)} />
            </Datos>
            <p className="nota">{t('admin.panorama.notaSaludIa')}</p>
          </>
        );
      }} />
    </Bloque>
  );
};

const Credits = () => {
  const { t, numero } = useIdioma();
  const { estado, recargar } = useAccion('creditsAdmin.stats', undefined, leerEstadisticasDeCredits, (e) => e.vacio);
  return (
    <Bloque titulo={t('admin.panorama.credits')} fuente="creditsAdmin.stats" estado={estado}>
      <Cargable estado={estado} recargar={recargar} vacio={t('admin.credits.sinEstadisticas')} hijos={(e) => (
        <Datos>
          <Dato resaltar etiqueta={t('admin.credits.enCirculacion')} valor={numero(e.global.enCirculacion)} />
          <Dato etiqueta={t('admin.credits.gastados')} valor={numero(e.global.gastados)} />
          <Dato etiqueta={t('admin.credits.reembolsados')} valor={numero(e.global.reembolsados)} />
          <Dato etiqueta={t('admin.credits.fallidas')} valor={numero(e.global.fallidas)} />
        </Datos>
      )} />
    </Bloque>
  );
};

/** Cuántas denuncias hay en un estado. El servidor devuelve como mucho 50: si llegan 50, se dice «50 o más», no 50. */
const useDenuncias = (status: EstadoDeReporte) =>
  useAccion('moderationAdmin.list', { status, limit: LIMITE_MAXIMO }, (crudo) => leerReportes(crudo).length);

const Moderacion = () => {
  const { t, numero } = useIdioma();
  const recibidas = useDenuncias('RECEIVED');
  const enRevision = useDenuncias('REVIEWING');
  const escaladas = useDenuncias('ESCALATED');
  const cuantas = (n: number) => (n >= LIMITE_MAXIMO ? t('admin.panorama.alMenos', { n: numero(LIMITE_MAXIMO) }) : numero(n));
  const fila = (etiqueta: string, consulta: ReturnType<typeof useDenuncias>, resaltar = false) => (
    consulta.estado.fase === 'ok'
      ? <Dato resaltar={resaltar && consulta.estado.datos > 0} etiqueta={etiqueta} valor={cuantas(consulta.estado.datos)} />
      : <Dato etiqueta={etiqueta} valor={<Cargable estado={consulta.estado} recargar={consulta.recargar} hijos={() => null} />} />
  );
  return (
    <Bloque titulo={t('admin.panorama.moderacion')} fuente="moderationAdmin.list" estado={recibidas.estado}>
      <Datos>
        {fila(t('admin.moderacion.estados.RECEIVED'), recibidas, true)}
        {fila(t('admin.moderacion.estados.REVIEWING'), enRevision)}
        {fila(t('admin.moderacion.estados.ESCALATED'), escaladas, true)}
      </Datos>
    </Bloque>
  );
};

/** Lo que el Panorama de una plataforma así debería enseñar y Weë aún no mide en el servidor. Claves, no frases. */
const SIN_FUENTE = ['cuentas', 'altas', 'activos', 'incidentes'] as const;

const AunNoSeMide = () => {
  const { t } = useIdioma();
  return (
    <Seccion titulo={t('admin.panorama.sinFuenteTitulo')}>
      <p className="nota">{t('admin.panorama.sinFuenteAyuda')}</p>
      <ul className="lista-sin-fuente">
        {SIN_FUENTE.map((k) => (
          <li key={k}>{t('admin.panorama.sinFuenteLinea', { que: t(`admin.panorama.sinFuente.${k}`), motivo: t(`admin.panorama.motivo.${k}`) })}</li>
        ))}
      </ul>
    </Seccion>
  );
};

export const Panorama = () => {
  const { t } = useIdioma();
  return (
    <>
      <header className="cabecera-vista">
        <h1>{t('admin.panorama.titulo')}</h1>
        <p>{t('admin.panorama.descripcion')}</p>
      </header>
      <Ia />
      <Credits />
      <Moderacion />
      <AunNoSeMide />
    </>
  );
};
