import { leerEstadoDelMotor } from '../api/modelos';
import { Cargable } from '../componentes/Cargable';
import { Dato, Datos, Etiqueta, Seccion, Tabla } from '../componentes/Piezas';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';

export const Resumen = () => {
  const { t, numero } = useIdioma();
  const { estado, recargar } = useAccion('engineAdmin.status', undefined, leerEstadoDelMotor);
  return (
    <>
      <header className="cabecera-vista">
        <h1>{t('admin.resumen.titulo')}</h1>
        <p>{t('admin.resumen.descripcion')}</p>
      </header>
      <Cargable estado={estado} recargar={recargar} hijos={(motor) => (
        <>
          <Seccion titulo={t('admin.resumen.ajustes')}>
            {motor.iaDetenida === true && <p className="aviso" role="alert">{t('admin.resumen.iaDetenidaAviso')}</p>}
            <Datos>
              <Dato etiqueta={t('admin.resumen.origen')} valor={motor.origen === 'firestore' ? t('admin.resumen.origenFirestore') : motor.origen === 'defaults' ? t('admin.resumen.origenDefaults') : t('admin.comun.sinDato')} />
              <Dato etiqueta={t('admin.resumen.precios')} valor={motor.precios === 'real' ? t('admin.resumen.preciosReal') : motor.precios === 'simulated' ? t('admin.resumen.preciosSimulated') : t('admin.comun.sinDato')} />
              <Dato etiqueta={t('admin.resumen.creditsPorUsd')} valor={numero(motor.creditsPorUsd)} />
              <Dato etiqueta={t('admin.resumen.margen')} valor={numero(motor.margen)} />
              <Dato etiqueta={t('admin.resumen.politica')} valor={motor.politicaPorDefecto ?? t('admin.comun.sinDato')} />
              <Dato etiqueta={t('admin.resumen.permiteMock')} valor={motor.permiteMock === undefined ? t('admin.comun.sinDato') : motor.permiteMock ? t('admin.comun.si') : t('admin.comun.no')} />
              <Dato resaltar={motor.iaDetenida === true} etiqueta={t('admin.resumen.iaDetenida')} valor={motor.iaDetenida === undefined ? t('admin.comun.sinDato') : motor.iaDetenida ? t('admin.comun.si') : t('admin.comun.no')} />
              <Dato etiqueta={t('admin.resumen.topeDiario')} valor={motor.maxUsdPorDia === undefined ? t('admin.comun.sinDato') : motor.maxUsdPorDia === 0 ? t('admin.resumen.sinTope') : numero(motor.maxUsdPorDia)} />
            </Datos>
          </Seccion>

          <Seccion titulo={t('admin.resumen.proveedores')}>
            {motor.proveedores.length === 0 ? <p className="estado vacio">{t('admin.resumen.sinProveedores')}</p> : (
              <>
                <Tabla cabeceras={[t('admin.resumen.proveedor'), t('admin.resumen.modalidades'), t('admin.resumen.configurado'), t('admin.resumen.habilitado'), t('admin.resumen.prioridad'), t('admin.resumen.fallos'), t('admin.resumen.modelos')]}>
                  {motor.proveedores.map((p) => (
                    <tr key={p.id}>
                      <th scope="row">{p.nombre}</th>
                      <td>{p.modalidades.join(', ') || t('admin.comun.sinDato')}</td>
                      <td><Etiqueta tono={p.configurado ? 'ok' : 'neutro'}>{p.configurado ? t('admin.comun.si') : t('admin.comun.no')}</Etiqueta></td>
                      <td><Etiqueta tono={p.habilitado ? 'ok' : 'aviso'}>{p.habilitado ? t('admin.comun.si') : t('admin.comun.no')}</Etiqueta></td>
                      <td>{numero(p.prioridad)}</td>
                      <td>{numero(p.fallos)}</td>
                      <td>{p.modelos.map((m) => m.id).join(', ') || t('admin.comun.sinDato')}</td>
                    </tr>
                  ))}
                </Tabla>
                <p className="nota">{t('admin.resumen.notaSalud')}</p>
              </>
            )}
          </Seccion>

          <Seccion titulo={t('admin.resumen.rutas')}>
            {motor.rutas.length === 0 ? <p className="estado vacio">{t('admin.resumen.sinRutas')}</p> : (
              <Tabla cabeceras={[t('admin.resumen.capacidad'), t('admin.resumen.politica'), t('admin.resumen.cadena')]}>
                {motor.rutas.map((r) => (
                  <tr key={r.capacidad}>
                    <th scope="row">{r.capacidad}</th>
                    <td>{r.politica ?? t('admin.comun.sinDato')}</td>
                    <td>{r.cadena.join(' → ') || t('admin.comun.sinDato')}</td>
                  </tr>
                ))}
              </Tabla>
            )}
          </Seccion>
        </>
      )} />
    </>
  );
};
