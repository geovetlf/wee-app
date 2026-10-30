import type { ReactNode } from 'react';
import { LIMITE_MAXIMO, NOMBRE_DE_EXPERIENCIA, type EstadoDeReporte } from '../api/acciones';
import { leerEstadisticasDeCredits, leerEstadoDelMotor, leerReportes, type EstadoDelMotor } from '../api/modelos';
import { leerAuditoria, leerCola, leerCreaciones, leerGeneraciones, leerReservas, leerTrabajos, leerUsoIa, type EntradaDeAuditoriaVista, type PaginaVista } from '../api/operaciones';
import { Cargable } from '../componentes/Cargable';
import { AvisoDeLista } from '../componentes/Lista';
import { Icono, type NombreDeIcono } from '../componentes/Iconos';
import { Aviso, Etiqueta, Indicador, Indicadores, Linea, Seccion, type Tono } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { Vista } from '../componentes/Vista';
import { useAccion, type EstadoDeCarga } from '../hooks';
import { useIdioma } from '../i18n/i18n';
import { correlacionesCerradas, tonoDeAuditoria } from './Auditoria';
import type { RutaDeConsola } from './Consola';
import { TablaDeDominios } from './Dominios';
import { estadoDeProveedor } from './estadoDeProveedor';
import { tonoDeOperacion, useEstado } from './Operaciones';

/*
 * EL PANORAMA GLOBAL. Solo enseña lo que tiene una FUENTE DE SERVIDOR que ya existe, y de cada bloque dice de dónde sale y
 * a qué hora se leyó. Lo que Weë todavía no mide no se aproxima ni se simula: es «fuente no integrada». Cada consulta va
 * por separado: si una falla, las demás siguen. Y solo se pide lo que el servidor confirmó que esta sesión puede leer.
 *
 * Reglas de los números, para no presentar como exacto lo que no lo es:
 *   · sin respuesta del servidor no hay valor: «Sin datos», nunca un 0;
 *   · una lista cortada o parcial da «N o más», nunca N;
 *   · «Correcto» solo con respuesta entera y nada pendiente.
 */

/** Hasta dónde se cuenta en cada lista. Con menos no se podría decir nada de «cuántos». */
const LIMITE = 25;
/** Cuántas filas de cada lista enseña el Panorama: para ver todas está Operaciones. */
const FILAS = 3;

const useDenuncias = (status: EstadoDeReporte, puede: boolean) =>
  useAccion('moderationAdmin.list', puede ? { status, limit: LIMITE_MAXIMO } : null, (crudo) => leerReportes(crudo).length);

/** Un recuento que sabe si llegó al final de lo que había. */
interface Recuento { n: number; incompleto: boolean }
const deLista = <T,>(p: PaginaVista<T>, cuenta: (x: T) => boolean = () => true): Recuento => ({ n: p.items.filter(cuenta).length, incompleto: p.truncado || p.parcial });
const sumar = (...r: Recuento[]): Recuento => ({ n: r.reduce((s, x) => s + x.n, 0), incompleto: r.some((x) => x.incompleto) });

const useRecuento = () => {
  const { t, numero } = useIdioma();
  return (r: Recuento) => (r.incompleto ? t('admin.panorama.alMenos', { n: numero(r.n) }) : numero(r.n));
};

/** La fila de resultado de una o varias consultas: «cargando» hasta que todas contesten; «sin datos» si ninguna pudo. */
const fases = (...estados: EstadoDeCarga<unknown>[]) => ({
  cargando: estados.some((e) => e.fase === 'cargando'),
  fallidos: estados.filter((e) => e.fase === 'error').length,
  total: estados.length,
});

const ValorCargando = () => {
  const { t } = useIdioma();
  return <span className="valor-cargando"><span className="solo-lectores">{t('admin.comun.cargando')}</span></span>;
};

const SinDato = () => {
  const { t } = useIdioma();
  return <span className="valor-sin-dato">{t('admin.comun.sinDato')}</span>;
};

/** Una consulta fallida en un indicador: el error de siempre, en pequeño, y su reintento. */
const ErrorDeIndicador = ({ estados }: { estados: { estado: EstadoDeCarga<unknown>; recargar: () => void }[] }) => {
  const fallida = estados.find((e) => e.estado.fase === 'error');
  return fallida ? <Cargable estado={fallida.estado} recargar={fallida.recargar} hijos={() => null} /> : null;
};

/* ── Los indicadores ─────────────────────────────────────────────────────── */

const IndicadorDeServicios = ({ consulta }: { consulta: { estado: EstadoDeCarga<EstadoDelMotor>; recargar: () => void } }) => {
  const { t, numero } = useIdioma();
  const { estado } = consulta;
  let valor: ReactNode = <SinDato />;
  let tono: Tono = 'sinDatos';
  let texto = t('admin.estado.sinDatos');
  let desglose: ReactNode = null;
  if (estado.fase === 'cargando') valor = <ValorCargando />;
  if (estado.fase === 'error') { tono = 'error'; texto = t('admin.estado.error'); }
  if (estado.fase === 'ok') {
    const m = estado.datos;
    const ahora = Date.now();
    const listos = m.proveedores.filter((p) => p.configurado && p.habilitado).length;
    const conAtencion = m.proveedores.some((p) => estadoDeProveedor(p, ahora).tono === 'atencion');
    /* Una lista vacía no es «0 de 0»: es que el servidor no informó de ninguno. */
    if (m.proveedores.length > 0) valor = t('admin.panorama.deTotal', { parte: numero(listos), total: numero(m.proveedores.length) });
    if (m.iaDetenida === true) { tono = 'error'; texto = t('admin.resumen.iaDetenida'); }
    else if (m.proveedores.length === 0) { tono = 'sinDatos'; texto = t('admin.estado.sinDatos'); }
    else if (listos === 0 || conAtencion) { tono = 'atencion'; texto = t('admin.estado.atencion'); }
    else if (m.iaDetenida === undefined) { tono = 'parcial'; texto = t('admin.estado.parcial'); }
    else { tono = 'ok'; texto = t('admin.estado.correcto'); }
    desglose = m.proveedores.length === 0 ? null : (
      <>
        <Linea etiqueta={t('admin.panorama.proveedoresListos')} valor={numero(listos)} />
        <Linea etiqueta={t('admin.panorama.capacidadesConRuta')} valor={numero(m.rutas.length)} />
        <Linea etiqueta={t('admin.resumen.iaDetenida')} valor={m.iaDetenida === undefined ? t('admin.comun.sinDato') : m.iaDetenida ? t('admin.comun.si') : t('admin.comun.no')} />
      </>
    );
  }
  return (
    <Indicador etiqueta={t('admin.panorama.ia')} icono="motor" valor={valor} estado={estado.fase === 'cargando' ? null : <Etiqueta tono={tono}>{texto}</Etiqueta>} desglose={desglose} enlace="#/resumen" enlaceTexto={t('admin.panorama.abrir', { que: t('admin.nav.resumen') })}
      pie={<><ErrorDeIndicador estados={[consulta]} /><Procedencia fuente="engineAdmin.status" estado={estado} /></>} />
  );
};

type ConsultaDeUso = { estado: EstadoDeCarga<ReturnType<typeof leerUsoIa>>; recargar: () => void };

const IndicadorDeActividad = ({ consulta }: { consulta: ConsultaDeUso }) => {
  const { t, numero } = useIdioma();
  const { estado } = consulta;
  const u = estado.fase === 'ok' ? estado.datos : null;
  const conLlamadas = u?.items.filter((f) => f.llamadas !== undefined) ?? [];
  const llamadas = conLlamadas.length ? conLlamadas.reduce((s, f) => s + (f.llamadas ?? 0), 0) : undefined;
  const conFallos = u?.items.filter((f) => f.fallos !== undefined) ?? [];
  const fallos = conFallos.length ? conFallos.reduce((s, f) => s + (f.fallos ?? 0), 0) : undefined;
  return (
    <Indicador etiqueta={t('admin.panorama.actividad')} icono="operaciones"
      valor={estado.fase === 'cargando' ? <ValorCargando /> : llamadas === undefined ? <SinDato /> : numero(llamadas)}
      estado={estado.fase === 'cargando' ? null
        : estado.fase === 'error' ? <Etiqueta tono="error">{t('admin.estado.error')}</Etiqueta>
          : llamadas === undefined ? <Etiqueta tono="sinDatos">{t('admin.panorama.sinUsoHoy')}</Etiqueta>
            : fallos !== undefined && fallos > 0 ? <Etiqueta tono="atencion">{t('admin.estado.atencion')}</Etiqueta>
              : <Etiqueta tono="ok">{t('admin.estado.correcto')}</Etiqueta>}
      desglose={u && llamadas !== undefined ? (
        <>
          <Linea etiqueta={t('admin.panorama.llamadasHoy')} valor={numero(llamadas)} />
          <Linea etiqueta={t('admin.ops.fallos')} valor={numero(fallos)} />
          <Linea etiqueta={t('admin.panorama.dia')} valor={u.dia ?? t('admin.comun.sinDato')} />
        </>
      ) : null}
      enlace="#/operaciones" enlaceTexto={t('admin.panorama.abrir', { que: t('admin.nav.operaciones') })}
      pie={<><ErrorDeIndicador estados={[consulta]} /><Procedencia fuente="opsAdmin.usoIa" estado={estado} /></>} />
  );
};

type ConsultaDeLista<T> = { estado: EstadoDeCarga<PaginaVista<T>>; recargar: () => void };
type Atascadas = ConsultaDeLista<ReturnType<typeof leerCreaciones>['items'][number]>;
type Atascados = ConsultaDeLista<ReturnType<typeof leerTrabajos>['items'][number]>;
type Cola = ConsultaDeLista<ReturnType<typeof leerCola>['items'][number]>;

const IndicadorDeAtencion = ({ atascadas, atascados, cola }: { atascadas: Atascadas; atascados: Atascados; cola: Cola }) => {
  const { t } = useIdioma();
  const texto = useRecuento();
  const f = fases(atascadas.estado, atascados.estado, cola.estado);
  const de = <T,>(e: EstadoDeCarga<PaginaVista<T>>, cuenta?: (x: T) => boolean): Recuento | null => (e.fase === 'ok' ? deLista(e.datos, cuenta) : null);
  /* Un trabajo que espera al proveedor dentro de su plazo no está atascado, por mucho que no se mueva. */
  const creaciones = de(atascadas.estado);
  const trabajos = de(atascados.estado, (j) => !j.dentroDePlazo);
  const apartados = de(cola.estado, (c) => c.apartado);
  const conocidos = [creaciones, trabajos, apartados].filter((r): r is Recuento => r !== null);
  const total = conocidos.length ? sumar(...conocidos) : null;
  const tono: Tono = !total ? 'error' : total.n > 0 ? 'atencion' : total.incompleto || f.fallidos > 0 ? 'parcial' : 'ok';
  return (
    <Indicador etiqueta={t('admin.panorama.atencionTitulo')} icono="atencion"
      valor={f.cargando ? <ValorCargando /> : total ? texto(total) : <SinDato />}
      estado={f.cargando ? null : <Etiqueta tono={tono}>{t(`admin.estado.${tono === 'ok' ? 'correcto' : tono}`)}</Etiqueta>}
      desglose={f.cargando ? null : (
        <>
          <Linea etiqueta={t('admin.ops.creacionesAtascadas')} valor={creaciones ? texto(creaciones) : t('admin.comun.sinDato')} />
          <Linea etiqueta={t('admin.ops.atascados')} valor={trabajos ? texto(trabajos) : t('admin.comun.sinDato')} />
          <Linea etiqueta={t('admin.panorama.apartados')} valor={apartados ? texto(apartados) : t('admin.comun.sinDato')} />
        </>
      )}
      enlace="#/operaciones" enlaceTexto={t('admin.panorama.abrir', { que: t('admin.nav.operaciones') })}
      pie={<><ErrorDeIndicador estados={[atascadas, atascados, cola]} /><Procedencia fuente="opsAdmin.creacionesAtascadas, opsAdmin.atascados" estado={atascadas.estado} /></>} />
  );
};

const IndicadorDeOperaciones = ({ cola }: { cola: Cola }) => {
  const { t } = useIdioma();
  const texto = useRecuento();
  const { estado } = cola;
  const p = estado.fase === 'ok' ? estado.datos : null;
  const total = p ? deLista(p) : null;
  const retrasados = p ? deLista(p, (c) => c.retrasado) : null;
  const apartados = p ? deLista(p, (c) => c.apartado) : null;
  return (
    <Indicador etiqueta={t('admin.panorama.operaciones')} icono="operaciones"
      valor={estado.fase === 'cargando' ? <ValorCargando /> : total ? texto(total) : <SinDato />}
      estado={estado.fase === 'cargando' ? null : estado.fase === 'error' ? <Etiqueta tono="error">{t('admin.estado.error')}</Etiqueta>
        : (retrasados && retrasados.n > 0) || (apartados && apartados.n > 0) ? <Etiqueta tono="atencion">{t('admin.estado.atencion')}</Etiqueta>
          : total?.incompleto ? <Etiqueta tono="parcial">{t('admin.estado.parcial')}</Etiqueta>
            : <Etiqueta tono="ok">{t('admin.estado.correcto')}</Etiqueta>}
      desglose={p && total && retrasados ? (
        <>
          <Linea etiqueta={t('admin.panorama.enCola')} valor={texto(total)} />
          <Linea etiqueta={t('admin.ops.retrasado')} valor={texto(retrasados)} />
          <Linea etiqueta={t('admin.panorama.apartados')} valor={apartados ? texto(apartados) : t('admin.comun.sinDato')} />
        </>
      ) : null}
      enlace="#/operaciones" enlaceTexto={t('admin.panorama.abrir', { que: t('admin.nav.operaciones') })}
      pie={<><ErrorDeIndicador estados={[cola]} /><Procedencia fuente="opsAdmin.cola" estado={estado} /></>} />
  );
};

const IndicadorDeCredits = ({ consulta }: { consulta: { estado: EstadoDeCarga<ReturnType<typeof leerEstadisticasDeCredits>>; recargar: () => void } }) => {
  const { t, numero } = useIdioma();
  const { estado } = consulta;
  const g = estado.fase === 'ok' ? estado.datos.global : null;
  return (
    <Indicador etiqueta={t('admin.panorama.credits')} icono="credits"
      valor={estado.fase === 'cargando' ? <ValorCargando /> : g ? numero(g.enCirculacion) : <SinDato />}
      estado={estado.fase === 'cargando' ? null : estado.fase === 'error' ? <Etiqueta tono="error">{t('admin.estado.error')}</Etiqueta>
        : estado.fase === 'vacio' ? <Etiqueta tono="sinDatos">{t('admin.estado.sinDatos')}</Etiqueta> : <Etiqueta>{t('admin.credits.enCirculacion')}</Etiqueta>}
      desglose={g ? (
        <>
          <Linea etiqueta={t('admin.credits.gastados')} valor={numero(g.gastados)} />
          <Linea etiqueta={t('admin.credits.reembolsados')} valor={numero(g.reembolsados)} />
          <Linea etiqueta={t('admin.credits.fallidas')} valor={numero(g.fallidas)} />
        </>
      ) : null}
      enlace="#/credits" enlaceTexto={t('admin.panorama.abrir', { que: t('admin.nav.credits') })}
      pie={<><ErrorDeIndicador estados={[consulta]} /><Procedencia fuente="creditsAdmin.stats" estado={estado} /></>} />
  );
};

type ConsultaDeDenuncias = ReturnType<typeof useDenuncias>;

const IndicadorDeDenuncias = ({ recibidas, enRevision, escaladas }: { recibidas: ConsultaDeDenuncias; enRevision: ConsultaDeDenuncias; escaladas: ConsultaDeDenuncias }) => {
  const { t } = useIdioma();
  const texto = useRecuento();
  const f = fases(recibidas.estado, enRevision.estado, escaladas.estado);
  /* El servidor devuelve como mucho 50: si llegan 50, se dice «50 o más», no 50. */
  const de = (c: ConsultaDeDenuncias): Recuento | null => (c.estado.fase === 'ok' ? { n: c.estado.datos, incompleto: c.estado.datos >= LIMITE_MAXIMO } : null);
  const partes = [de(recibidas), de(enRevision), de(escaladas)];
  const conocidas = partes.filter((r): r is Recuento => r !== null);
  const total = conocidas.length ? sumar(...conocidas) : null;
  const tono: Tono = !total ? 'error' : f.fallidos > 0 ? 'parcial' : total.n > 0 ? 'atencion' : 'ok';
  const fila = (etiqueta: string, r: Recuento | null) => <Linea etiqueta={etiqueta} valor={r ? texto(r) : t('admin.comun.sinDato')} />;
  return (
    <Indicador etiqueta={t('admin.panorama.moderacion')} icono="moderacion"
      valor={f.cargando ? <ValorCargando /> : total ? texto(total) : <SinDato />}
      estado={f.cargando ? null : <Etiqueta tono={tono}>{t(`admin.estado.${tono === 'ok' ? 'correcto' : tono}`)}</Etiqueta>}
      desglose={f.cargando ? null : (
        <>
          {fila(t('admin.moderacion.estados.RECEIVED'), partes[0])}
          {fila(t('admin.moderacion.estados.REVIEWING'), partes[1])}
          {fila(t('admin.moderacion.estados.ESCALATED'), partes[2])}
        </>
      )}
      enlace="#/moderacion" enlaceTexto={t('admin.panorama.abrir', { que: t('admin.nav.moderacion') })}
      pie={<><ErrorDeIndicador estados={[recibidas, enRevision, escaladas]} /><Procedencia fuente="moderationAdmin.list" estado={recibidas.estado} /></>} />
  );
};

/* ── Los paneles ─────────────────────────────────────────────────────────── */

/** Una fila de un panel: lo principal, lo secundario y su estado. */
const Fila = ({ principal, secundario, estado }: { principal: ReactNode; secundario?: ReactNode; estado?: ReactNode }) => (
  <li className="fila">
    <div className="fila-texto">
      <span className="fila-principal">{principal}</span>
      {secundario ? <span className="fila-secundario">{secundario}</span> : null}
    </div>
    {estado ? <div className="fila-estado">{estado}</div> : null}
  </li>
);

/** Lo que un panel dice de una consulta que no ha traído nada: el error ya se ve, con su reintento, en el indicador. */
const SinBloque = ({ fase }: { fase: EstadoDeCarga<unknown>['fase'] }) => {
  const { t } = useIdioma();
  if (fase === 'cargando') return <div className="estado cargando" aria-hidden="true"><i /><i /></div>;
  if (fase === 'error') return <p className="estado"><Etiqueta tono="error">{t('admin.panorama.bloqueSinCargar')}</Etiqueta></p>;
  return null;
};

const Servicios = ({ estado }: { estado: EstadoDeCarga<EstadoDelMotor> }) => {
  const { t, hora } = useIdioma();
  const ahora = Date.now();
  return (
    <Seccion titulo={t('admin.panorama.serviciosTitulo')} ayuda={t('admin.panorama.notaSaludIa')} acciones={<a className="enlace-texto-suelto" href="#/resumen">{t('admin.panorama.verMotor')}<Icono nombre="flecha" tamano={15} /></a>}>
      <SinBloque fase={estado.fase} />
      {estado.fase === 'ok' && (() => {
        const con = estado.datos.proveedores.map((p) => ({ p, e: estadoDeProveedor(p, ahora) })).filter(({ e }) => e.tono === 'atencion');
        if (estado.datos.iaDetenida !== true && con.length === 0) {
          return <p className="estado vacio">{estado.datos.proveedores.length === 0 ? t('admin.resumen.sinProveedores') : t('admin.panorama.serviciosSinAtencion')}</p>;
        }
        return (
          <ul className="filas" role="list">
            {estado.datos.iaDetenida === true && <Fila principal={t('admin.resumen.iaDetenida')} secundario={t('admin.resumen.iaDetenidaAviso')} estado={<Etiqueta tono="error">{t('admin.estado.error')}</Etiqueta>} />}
            {con.map(({ p, e }) => (
              <Fila key={p.id} principal={p.nombre} secundario={p.modalidades.join(', ') || undefined} estado={(
                <Etiqueta tono={e.tono}>
                  {e.clave === 'circuitoAbierto' ? t('admin.resumen.estadosProveedor.circuitoAbierto', { hora: hora(e.hasta) })
                    : e.clave === 'conFallos' ? t('admin.resumen.estadosProveedor.conFallos', { contador: e.fallos })
                      : t(`admin.resumen.estadosProveedor.${e.clave}`)}
                </Etiqueta>
              )} />
            ))}
          </ul>
        );
      })()}
    </Seccion>
  );
};

/** Un grupo de pendientes: unas pocas filas, cuántas hay y qué garantiza la consulta sobre su orden. */
const Grupo = ({ titulo, orden, total, children }: { titulo: string; orden: string; total: Recuento; children: ReactNode }) => {
  const { t } = useIdioma();
  const texto = useRecuento();
  return (
    <div className="grupo-de-filas">
      <h3>{titulo} <span className="contador">{texto(total)}</span></h3>
      <ul className="filas" role="list">{children}</ul>
      <p className="nota">{orden}{total.n > FILAS ? ` ${t('admin.panorama.mostrandoDe', { parte: FILAS, total: texto(total) })}` : ''}</p>
    </div>
  );
};

const Pendientes = ({ atascadas, atascados, reservas, conReservas }: { atascadas: Atascadas; atascados: Atascados; reservas: ConsultaDeLista<ReturnType<typeof leerReservas>['items'][number]>; conReservas: boolean }) => {
  const { t, fecha, numero } = useIdioma();
  const nada = t('admin.comun.sinDato');
  const experiencia = (e?: string) => (e ? (NOMBRE_DE_EXPERIENCIA as Record<string, string>)[e] ?? e : nada);
  const creaciones = atascadas.estado.fase === 'ok' ? atascadas.estado.datos : null;
  const trabajos = atascados.estado.fase === 'ok' ? atascados.estado.datos : null;
  const retenidas = conReservas && reservas.estado.fase === 'ok' ? reservas.estado.datos : null;
  const hayFallo = [atascadas.estado, atascados.estado, ...(conReservas ? [reservas.estado] : [])].some((e) => e.fase === 'error');
  const hayIncompleto = [creaciones, trabajos, retenidas].some((p) => p && (p.truncado || p.parcial));
  const vacio = !hayFallo && !hayIncompleto && creaciones?.items.length === 0 && trabajos?.items.length === 0 && (!conReservas || retenidas?.items.length === 0);
  return (
    <Seccion titulo={t('admin.panorama.pendientesTitulo')} acciones={<a className="enlace-texto-suelto" href="#/operaciones">{t('admin.panorama.verOperaciones')}<Icono nombre="flecha" tamano={15} /></a>}>
      <SinBloque fase={atascadas.estado.fase === 'cargando' ? 'cargando' : hayFallo ? 'error' : 'vacio'} />
      {vacio && <p className="estado vacio">{t('admin.panorama.pendientesVacio')}</p>}
      {creaciones && creaciones.items.length > 0 && (
        <Grupo titulo={t('admin.ops.creacionesAtascadas')} orden={t('admin.panorama.masAntiguas')} total={deLista(creaciones)}>
          {creaciones.items.slice(0, FILAS).map((c) => (
            <Fila key={c.id} principal={<span className="codigo">{c.id}</span>} secundario={`${experiencia(c.experiencia)} · ${fecha(c.actualizado)}`} estado={c.abandonado ? <Etiqueta tono="atencion">{t('admin.ops.abandonado')}</Etiqueta> : <Etiqueta tono="atencion">{t('admin.ops.sinMoverse')}</Etiqueta>} />
          ))}
        </Grupo>
      )}
      {trabajos && trabajos.items.length > 0 && (
        <Grupo titulo={t('admin.ops.atascados')} orden={t('admin.panorama.sinOrden')} total={deLista(trabajos)}>
          {trabajos.items.slice(0, FILAS).map((j) => (
            <Fila key={j.id} principal={<span className="codigo">{j.id}</span>} secundario={`${j.capacidad ?? nada} · ${fecha(j.actualizado)}`} estado={j.dentroDePlazo ? <Etiqueta>{t('admin.ops.dentroDePlazo')}</Etiqueta> : <Etiqueta tono="atencion">{t('admin.ops.sinMoverse')}</Etiqueta>} />
          ))}
        </Grupo>
      )}
      {retenidas && retenidas.items.length > 0 && (
        <Grupo titulo={t('admin.ops.reservas')} orden={t('admin.panorama.recientesPrimero')} total={deLista(retenidas)}>
          {retenidas.items.slice(0, FILAS).map((r) => (
            <Fila key={r.id} principal={r.servicio ?? nada} secundario={fecha(r.creada)} estado={<span className="cifra">{numero(r.importe)}</span>} />
          ))}
        </Grupo>
      )}
    </Seccion>
  );
};

const Actividad = ({ consulta }: { consulta: { estado: EstadoDeCarga<ReturnType<typeof leerGeneraciones>>; recargar: () => void } }) => {
  const { t, fecha } = useIdioma();
  const estadoDe = useEstado();
  const nada = t('admin.comun.sinDato');
  const { estado, recargar } = consulta;
  return (
    <Seccion titulo={t('admin.panorama.actividadTitulo')} acciones={<a className="enlace-texto-suelto" href="#/operaciones">{t('admin.panorama.verOperaciones')}<Icono nombre="flecha" tamano={15} /></a>} pie={<Procedencia fuente="opsAdmin.generaciones" estado={estado} />}>
      <Cargable estado={estado} recargar={recargar} hijos={(p) => (
        p.items.length === 0 ? <p className="estado vacio">{p.parcial ? t('admin.lista.vacioParcial') : t('admin.ops.sinGeneraciones')}</p> : (
          <ul className="filas" role="list">
            {p.items.map((g) => (
              <Fila key={g.id} principal={g.capacidad ?? nada} secundario={`${[g.proveedor, g.modelo].filter(Boolean).join(' / ') || nada} · ${fecha(g.creado)}`} estado={<Etiqueta tono={tonoDeOperacion(g.estado)}>{estadoDe(g.estado)}</Etiqueta>} />
            ))}
          </ul>
        )
      )} />
    </Seccion>
  );
};

const Errores = ({ estado }: { estado: EstadoDeCarga<ReturnType<typeof leerUsoIa>> }) => {
  const { t, numero } = useIdioma();
  const u = estado.fase === 'ok' ? estado.datos : null;
  const conFallos = u?.items.filter((f) => f.fallos !== undefined && f.fallos > 0) ?? [];
  return (
    <Seccion titulo={t('admin.panorama.erroresTitulo')} ayuda={t('admin.panorama.erroresAyuda')}>
      <SinBloque fase={estado.fase} />
      {estado.fase === 'vacio' && <p className="estado vacio">{t('admin.panorama.erroresSinDatos')}</p>}
      {u && conFallos.length === 0 && <p className="estado vacio">{t('admin.panorama.erroresVacio')}</p>}
      <ul className="filas" role="list">
        {conFallos.map((f) => (
          <Fila key={`${f.capacidad}/${f.proveedor}`} principal={f.capacidad} secundario={f.proveedor} estado={<Etiqueta tono="atencion">{t('admin.panorama.erroresValor', { fallos: numero(f.fallos), llamadas: numero(f.llamadas) })}</Etiqueta>} />
        ))}
        <Fila principal={t('admin.panorama.incidentes')} secundario={t('admin.panorama.incidentesDetalle')} estado={<Etiqueta tono="noIntegrada">{t('admin.estado.noIntegrada')}</Etiqueta>} />
      </ul>
    </Seccion>
  );
};

/**
 * Abrir esta pantalla deja sus propias lecturas en la auditoría, y eso NO se oculta: la política de qué se audita no la
 * decide una pantalla. Aquí se ven las últimas entradas tal como llegan, en su orden, marcando cuáles son lecturas de esta
 * misma pantalla. Para que lo importante no quede enterrado, lo denegado, lo fallido y lo que no tiene cierre se repite
 * arriba: se destaca, no se quita. El registro entero sigue en Auditoría.
 */
const LECTURAS_DE_ESTA_PANTALLA = ['engineAdmin.status', 'creditsAdmin.stats', 'moderationAdmin.list', 'opsAdmin.usoIa', 'opsAdmin.generaciones', 'opsAdmin.creacionesAtascadas', 'opsAdmin.atascados', 'opsAdmin.cola', 'opsAdmin.reservas', 'opsAdmin.auditoria'];
const FILAS_DE_ACTIVIDAD = 5;
const FILAS_A_REVISAR = 3;

const ActividadAdministrativa = ({ consulta, uid }: { consulta: { estado: EstadoDeCarga<ReturnType<typeof leerAuditoria>>; recargar: () => void }; uid: string }) => {
  const { t, fecha, numero } = useIdioma();
  const nada = t('admin.comun.sinDato');
  const { estado, recargar } = consulta;
  const nombreDe = (r?: string) => (r && ['ok', 'intento', 'denegado', 'error'].includes(r) ? t(`admin.auditoria.resultados.${r}`) : r ?? nada);
  return (
    <Seccion titulo={t('admin.panorama.adminTitulo')} ayuda={t('admin.panorama.adminNota')} acciones={<a className="enlace-texto-suelto" href="#/auditoria">{t('admin.panorama.verAuditoria')}<Icono nombre="flecha" tamano={15} /></a>} pie={<Procedencia fuente="opsAdmin.auditoria" estado={estado} />}>
      <Cargable estado={estado} recargar={recargar} hijos={(p) => {
        if (p.items.length === 0) return <p className="estado vacio">{t('admin.auditoria.sinEntradas')}</p>;
        const cerradas = correlacionesCerradas(p.items);
        const sinCierre = (e: EntradaDeAuditoriaVista) => e.resultado === 'intento' && (!e.correlacion || !cerradas.has(e.correlacion));
        const aRevisar = p.items.filter((e) => e.resultado === 'denegado' || e.resultado === 'error' || sinCierre(e));
        const cuantas = (filtro: (e: EntradaDeAuditoriaVista) => boolean) => numero(p.items.filter(filtro).length);
        const fila = (e: EntradaDeAuditoriaVista, marca: boolean) => (
          <Fila key={`${e.correlacion}/${e.en}/${e.resultado}`} principal={<span className="codigo">{e.accion ?? nada}</span>} secundario={`${[e.actor, e.rol].filter(Boolean).join(' · ') || nada} · ${fecha(e.en)}`} estado={(
            <span className="etiquetas">
              {marca && e.actor === uid && e.accion && LECTURAS_DE_ESTA_PANTALLA.includes(e.accion) ? <Etiqueta>{t('admin.panorama.adminEstaPantalla')}</Etiqueta> : null}
              <Etiqueta tono={tonoDeAuditoria(e.resultado)}>{nombreDe(e.resultado)}</Etiqueta>
              {sinCierre(e) ? <Etiqueta tono="atencion">{t('admin.auditoria.sinCierre')}</Etiqueta> : null}
            </span>
          )} />
        );
        return (
          <>
            <dl className="desglose desglose-suelto">
              <Linea etiqueta={nombreDe('ok')} valor={cuantas((e) => e.resultado === 'ok')} />
              <Linea etiqueta={nombreDe('denegado')} valor={cuantas((e) => e.resultado === 'denegado')} />
              <Linea etiqueta={nombreDe('error')} valor={cuantas((e) => e.resultado === 'error')} />
              <Linea etiqueta={t('admin.auditoria.sinCierre')} valor={cuantas(sinCierre)} />
            </dl>
            {aRevisar.length > 0 && (
              <div className="grupo-de-filas separado">
                <h3>{t('admin.panorama.adminRevisar')}</h3>
                <ul className="filas" role="list">{aRevisar.slice(0, FILAS_A_REVISAR).map((e) => fila(e, false))}</ul>
              </div>
            )}
            <div className="grupo-de-filas separado">
              <h3>{t('admin.panorama.adminUltimas')}</h3>
              <ul className="filas" role="list">{p.items.slice(0, FILAS_DE_ACTIVIDAD).map((e) => fila(e, true))}</ul>
            </div>
            <p className="nota nota-separada">{t('admin.panorama.adminMostrando', { parte: numero(Math.min(FILAS_DE_ACTIVIDAD, p.items.length)), total: numero(p.items.length) })}</p>
            <AvisoDeLista truncado={p.truncado} />
          </>
        );
      }} />
    </Seccion>
  );
};

const ICONO_DE_ACCESO: Record<Exclude<RutaDeConsola, 'panorama'>, NombreDeIcono> = { dominios: 'dominios', resumen: 'motor', credits: 'credits', moderacion: 'moderacion', operaciones: 'operaciones', cuentas: 'cuentas', auditoria: 'auditoria' };

const Accesos = ({ rutas }: { rutas: readonly RutaDeConsola[] }) => {
  const { t } = useIdioma();
  if (rutas.length === 0) return null;
  return (
    <Seccion className="ancho-completo" titulo={t('admin.panorama.accesosTitulo')}>
      <div className="accesos">
        {rutas.map((r) => (
          <a key={r} className="acceso" href={`#/${r}`}>
            <Icono nombre={ICONO_DE_ACCESO[r as Exclude<RutaDeConsola, 'panorama'>]} />
            <span><strong>{t(`admin.nav.${r}`)}</strong><small>{t(`admin.panorama.accesos.${r}`)}</small></span>
          </a>
        ))}
      </div>
    </Seccion>
  );
};

const Contenido = ({ puedeLeer, permisos, rutas, uid, ocultas, rutaSinPermiso }: { puedeLeer: (permiso: string) => boolean; permisos: readonly string[]; rutas: readonly RutaDeConsola[]; uid: string; ocultas: readonly RutaDeConsola[]; rutaSinPermiso: boolean }) => {
  const { t } = useIdioma();
  /* `puedeLeer` conserva las operaciones antiguas a la administración sin rol; `opsAdmin` exige siempre su permiso. */
  const tiene = (p: string) => permisos.includes(p);
  const verIa = puedeLeer('ai.read');
  const verCredits = puedeLeer('finance.read');
  const verDenuncias = puedeLeer('moderation.read');
  const verOps = tiene('ops.read');
  const verUso = tiene('ai.read');
  const verReservas = tiene('finance.read');
  const verAuditoria = tiene('audit.read');

  const motor = useAccion('engineAdmin.status', verIa ? undefined : null, leerEstadoDelMotor);
  const credits = useAccion('creditsAdmin.stats', verCredits ? undefined : null, leerEstadisticasDeCredits, (e) => e.vacio);
  const recibidas = useDenuncias('RECEIVED', verDenuncias);
  const enRevision = useDenuncias('REVIEWING', verDenuncias);
  const escaladas = useDenuncias('ESCALATED', verDenuncias);
  const uso = useAccion('opsAdmin.usoIa', verUso ? {} : null, leerUsoIa, (u) => !u.existe || u.items.length === 0);
  const generaciones = useAccion('opsAdmin.generaciones', verUso ? { limit: 5 } : null, leerGeneraciones);
  const atascadas = useAccion('opsAdmin.creacionesAtascadas', verOps ? { minutos: 30, limit: LIMITE } : null, leerCreaciones);
  const atascados = useAccion('opsAdmin.atascados', verOps ? { minutos: 30, limit: LIMITE } : null, leerTrabajos);
  const cola = useAccion('opsAdmin.cola', verOps ? { limit: LIMITE } : null, leerCola);
  const reservas = useAccion('opsAdmin.reservas', verReservas ? { minutos: 120, limit: LIMITE } : null, leerReservas);
  const auditoria = useAccion('opsAdmin.auditoria', verAuditoria ? { limit: LIMITE_MAXIMO } : null, leerAuditoria);

  const iaDetenida = motor.estado.fase === 'ok' && motor.estado.datos.iaDetenida === true;
  const conIndicadores = verIa || verUso || verOps || verCredits || verDenuncias;

  return (
    <>
      {rutaSinPermiso && <Aviso tono="atencion">{t('admin.panorama.sinPermisoRuta')}</Aviso>}
      {iaDetenida && <Aviso tono="error" alerta>{t('admin.resumen.iaDetenidaAviso')}</Aviso>}
      {conIndicadores ? (
        <Indicadores>
          {verIa && <IndicadorDeServicios consulta={motor} />}
          {verUso && <IndicadorDeActividad consulta={uso} />}
          {verOps && <IndicadorDeAtencion atascadas={atascadas} atascados={atascados} cola={cola} />}
          {verOps && <IndicadorDeOperaciones cola={cola} />}
          {verCredits && <IndicadorDeCredits consulta={credits} />}
          {verDenuncias && <IndicadorDeDenuncias recibidas={recibidas} enRevision={enRevision} escaladas={escaladas} />}
        </Indicadores>
      ) : <Aviso>{t('admin.panorama.sinIndicadores')}</Aviso>}
      {ocultas.length > 0 && <p className="nota nota-de-rol">{t('admin.panorama.rolNoIncluye', { secciones: ocultas.map((r) => t(`admin.nav.${r}`)).join(', ') })}</p>}
      {/* Columnas equilibradas por el navegador: cada panel mide lo que tiene, sin estirarse para igualar al de al lado. */}
      <div className={`paneles${[verOps, verIa, verUso, verUso, verAuditoria].filter(Boolean).length > 1 ? ' varios' : ''}`}>
        {verOps && <Pendientes atascadas={atascadas} atascados={atascados} reservas={reservas} conReservas={verReservas} />}
        {verIa && <Servicios estado={motor.estado} />}
        {verUso && <Errores estado={uso.estado} />}
        {verUso && <Actividad consulta={generaciones} />}
        {verAuditoria && <ActividadAdministrativa consulta={auditoria} uid={uid} />}
      </div>
      <div className="rejilla">
        <Accesos rutas={rutas} />
        <Seccion className="ancho-completo" titulo={t('admin.dominios.todos')} ayuda={t('admin.panorama.coberturaAyuda')} acciones={<a className="enlace-texto-suelto" href="#/dominios">{t('admin.panorama.verDominios')}<Icono nombre="flecha" tamano={15} /></a>}>
          <TablaDeDominios />
        </Seccion>
      </div>
    </>
  );
};

export const Panorama = ({ puedeLeer, permisos, rutas, uid, ocultas, rutaSinPermiso }: { puedeLeer: (permiso: string) => boolean; permisos: readonly string[]; rutas: readonly RutaDeConsola[]; uid: string; ocultas: readonly RutaDeConsola[]; rutaSinPermiso: boolean }) => {
  const { t } = useIdioma();
  /* Un rol sin nada que leer aquí no tiene nada que actualizar: ni botón, ni una hora «desconocida» que no significa nada. */
  const hayLecturas = ['ai.read', 'finance.read', 'moderation.read'].some(puedeLeer) || ['ops.read', 'audit.read'].some((p) => permisos.includes(p));
  return (
    <Vista titulo={t('admin.panorama.titulo')} descripcion={t('admin.panorama.descripcion')} refrescable={hayLecturas} dominios={['a']}>
      <Contenido puedeLeer={puedeLeer} permisos={permisos} rutas={rutas} uid={uid} ocultas={ocultas} rutaSinPermiso={rutaSinPermiso} />
    </Vista>
  );
};
