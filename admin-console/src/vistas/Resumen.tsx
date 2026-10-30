import { leerEstadoDelMotor } from '../api/modelos';
import { Cargable } from '../componentes/Cargable';
import { Aviso, Dato, Datos, Etiqueta, Seccion, Tabla } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { Vista } from '../componentes/Vista';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';
import { estadoDeProveedor } from './estadoDeProveedor';

/** La ruta `resumen` es el Motor de IA. Sin permiso de finanzas el servidor no manda dinero: esos datos ni se ofrecen. */
const Contenido = ({ puedeLeer }: { puedeLeer: (permiso: string) => boolean }) => {
  const { t, numero, hora } = useIdioma();
  const { estado, recargar } = useAccion('engineAdmin.status', undefined, leerEstadoDelMotor);
  const conDinero = puedeLeer('finance.read');
  const ahora = Date.now();
  return (
    <Cargable estado={estado} recargar={recargar} hijos={(motor) => {
      const listos = motor.proveedores.filter((p) => p.configurado && p.habilitado).length;
      return (
        <>
          {motor.iaDetenida === true && <Aviso tono="error" alerta>{t('admin.resumen.iaDetenidaAviso')}</Aviso>}

          <Seccion titulo={t('admin.resumen.disponibilidad')} ayuda={t('admin.resumen.disponibilidadAyuda')} pie={<Procedencia fuente="engineAdmin.status" estado={estado} />}>
            <Datos>
              <Dato resaltar={motor.iaDetenida === true} etiqueta={t('admin.resumen.iaDetenida')} valor={motor.iaDetenida === undefined ? t('admin.comun.sinDato') : motor.iaDetenida ? t('admin.comun.si') : t('admin.comun.no')} />
              <Dato etiqueta={t('admin.panorama.proveedoresListos')} valor={t('admin.panorama.deTotal', { parte: numero(listos), total: numero(motor.proveedores.length) })} />
              <Dato etiqueta={t('admin.panorama.capacidadesConRuta')} valor={numero(motor.rutas.length)} />
            </Datos>
            <h3>{t('admin.resumen.proveedores')}</h3>
            {motor.proveedores.length === 0 ? <p className="estado vacio">{t('admin.resumen.sinProveedores')}</p> : (
              <Tabla ancha numericas={[4, 5]} cabeceras={[t('admin.resumen.proveedor'), t('admin.resumen.estado'), t('admin.resumen.modalidades'), t('admin.resumen.configurado'), t('admin.resumen.prioridad'), t('admin.resumen.fallos'), t('admin.resumen.modelos')]}>
                {motor.proveedores.map((p) => {
                  const e = estadoDeProveedor(p, ahora);
                  return (
                    <tr key={p.id}>
                      <th scope="row">{p.nombre}</th>
                      <td>
                        <Etiqueta tono={e.tono}>
                          {e.clave === 'circuitoAbierto' ? t('admin.resumen.estadosProveedor.circuitoAbierto', { hora: hora(e.hasta) })
                            : e.clave === 'conFallos' ? t('admin.resumen.estadosProveedor.conFallos', { contador: e.fallos })
                              : t(`admin.resumen.estadosProveedor.${e.clave}`)}
                        </Etiqueta>
                      </td>
                      <td>{p.modalidades.join(', ') || t('admin.comun.sinDato')}</td>
                      <td>{p.configurado ? t('admin.comun.si') : t('admin.comun.no')}</td>
                      <td>{numero(p.prioridad)}</td>
                      <td>{numero(p.fallos)}</td>
                      <td className="codigo">{p.modelos.map((m) => m.id).join(', ') || t('admin.comun.sinDato')}</td>
                    </tr>
                  );
                })}
              </Tabla>
            )}
            <ul className="filas limitacion" role="list">
              <li className="fila">
                <div className="fila-texto">
                  <span className="fila-principal">{t('admin.resumen.historico')}</span>
                  <span className="fila-secundario">{t('admin.resumen.notaSalud')}</span>
                </div>
                <div className="fila-estado"><Etiqueta tono="noIntegrada">{t('admin.estado.noIntegrada')}</Etiqueta></div>
              </li>
            </ul>
          </Seccion>

          <Seccion titulo={t('admin.resumen.rutas')}>
            {motor.rutas.length === 0 ? <p className="estado vacio">{t('admin.resumen.sinRutas')}</p> : (
              <Tabla largas={[2]} cabeceras={[t('admin.resumen.capacidad'), t('admin.resumen.politica'), t('admin.resumen.cadena')]}>
                {motor.rutas.map((r) => (
                  <tr key={r.capacidad}>
                    <th scope="row" className="codigo">{r.capacidad}</th>
                    <td>{r.politica ?? t('admin.comun.sinDato')}</td>
                    <td className="codigo">{r.cadena.join(' → ') || t('admin.comun.sinDato')}</td>
                  </tr>
                ))}
              </Tabla>
            )}
          </Seccion>

          <Seccion titulo={t('admin.resumen.ajustes')}>
            <Datos>
              <Dato etiqueta={t('admin.resumen.origen')} valor={motor.origen === 'firestore' ? t('admin.resumen.origenFirestore') : motor.origen === 'defaults' ? t('admin.resumen.origenDefaults') : t('admin.comun.sinDato')} />
              <Dato etiqueta={t('admin.resumen.precios')} valor={motor.precios === 'real' ? t('admin.resumen.preciosReal') : motor.precios === 'simulated' ? t('admin.resumen.preciosSimulated') : t('admin.comun.sinDato')} />
              <Dato etiqueta={t('admin.resumen.politica')} valor={motor.politicaPorDefecto ?? t('admin.comun.sinDato')} />
              <Dato etiqueta={t('admin.resumen.permiteMock')} valor={motor.permiteMock === undefined ? t('admin.comun.sinDato') : motor.permiteMock ? t('admin.comun.si') : t('admin.comun.no')} />
              {conDinero ? <Dato etiqueta={t('admin.resumen.creditsPorUsd')} valor={numero(motor.creditsPorUsd)} /> : null}
              {conDinero ? <Dato etiqueta={t('admin.resumen.margen')} valor={numero(motor.margen)} /> : null}
              {conDinero ? <Dato etiqueta={t('admin.resumen.topeDiario')} valor={motor.maxUsdPorDia === undefined ? t('admin.comun.sinDato') : motor.maxUsdPorDia === 0 ? t('admin.resumen.sinTope') : numero(motor.maxUsdPorDia)} /> : null}
            </Datos>
          </Seccion>
        </>
      );
    }} />
  );
};

export const Resumen = ({ puedeLeer }: { puedeLeer: (permiso: string) => boolean }) => {
  const { t } = useIdioma();
  return (
    <Vista titulo={t('admin.resumen.titulo')} descripcion={t('admin.resumen.descripcion')} dominios={['d', 'p']}>
      <Contenido puedeLeer={puedeLeer} />
    </Vista>
  );
};
