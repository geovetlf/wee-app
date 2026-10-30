import { useState, type FormEvent } from 'react';
import { leerCuenta } from '../api/operaciones';
import { Cargable } from '../componentes/Cargable';
import { Icono } from '../componentes/Iconos';
import { Aviso, Dato, Datos, Etiqueta, Seccion, Tabla, type Tono } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { Vista } from '../componentes/Vista';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';

/*
 * CUENTAS E IDENTIDAD: mirar UNA cuenta, por su uid o por su número. Nunca hay listados ni búsqueda libre, y cada
 * consulta queda en `adminAudit` con el identificador consultado: quién miró a quién. Solo lectura: suspender o
 * restringir no existe en el servidor, y aquí se dice en vez de pintar un botón que no haría nada.
 *
 * La consulta es `manual`: «Actualizar» no la repetiría, y por eso esta vista no lo ofrece.
 */
type Consulta = { uid: string } | { numeroDeCuenta: string };

const TONO_DE_CUENTA: Record<string, Tono> = { ACTIVE: 'ok', SUSPENDED: 'atencion', CLOSED: 'error' };

const Contenido = () => {
  const { t, fecha } = useIdioma();
  const [escrito, setEscrito] = useState('');
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const { estado, recargar } = useAccion('accountsAdmin.buscar', consulta, leerCuenta, (c) => !c.encontrada, { manual: true });
  const nada = t('admin.comun.sinDato');
  const siNo = (v: boolean | undefined) => (v === undefined ? nada : v ? t('admin.comun.si') : t('admin.comun.no'));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const limpio = escrito.trim();
    if (!limpio) return;
    setConsulta(/^[\d\s.-]{9,15}$/.test(limpio) ? { numeroDeCuenta: limpio } : { uid: limpio });
  };

  return (
    <>
      <Seccion titulo={t('admin.cuentas.buscar')} className="buscador">
        <form className="formulario en-linea" onSubmit={enviar}>
          <label className="crece">
            <span>{t('admin.cuentas.identificador')}</span>
            <span className="campo-con-icono">
              <Icono nombre="buscar" />
              <input className="campo grande" value={escrito} onChange={(e) => setEscrito(e.target.value)} autoComplete="off" spellCheck={false} aria-describedby="ayuda-de-cuenta" />
            </span>
          </label>
          <button type="submit" className="boton primario grande" disabled={!escrito.trim() || estado.fase === 'cargando'}>{t('admin.cuentas.consultar')}</button>
        </form>
        <p id="ayuda-de-cuenta" className="nota">{t('admin.cuentas.ayuda')}</p>
      </Seccion>

      <Cargable estado={estado} recargar={recargar} vacio={t('admin.cuentas.noEncontrada')} hijos={(c) => c.encontrada && (
        <>
          <section className="seccion ficha-de-cuenta">
            <header className="ficha-cabeza">
              <div className="ficha-identidad">
                <span className="dato-menor">{t('admin.cuentas.uid')}</span>
                <h2 className="codigo">{c.uid ?? nada}</h2>
              </div>
              <span className="etiquetas">
                {c.cuenta?.estado
                  ? <Etiqueta tono={TONO_DE_CUENTA[c.cuenta.estado] ?? 'neutro'}>{['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(c.cuenta.estado) ? t(`admin.cuentas.estados.${c.cuenta.estado}`) : c.cuenta.estado}</Etiqueta>
                  : <Etiqueta tono="sinDatos">{t('admin.cuentas.sinEstado')}</Etiqueta>}
                {c.acceso?.deshabilitado === true ? <Etiqueta tono="error">{t('admin.cuentas.deshabilitada')}</Etiqueta> : null}
                {!c.cuenta?.numero ? <Etiqueta tono="parcial">{t('admin.cuentas.sinNumeroCorto')}</Etiqueta> : null}
              </span>
            </header>
            {!c.cuenta?.numero && <Aviso>{t('admin.cuentas.sinNumero')}</Aviso>}
            <h3>{t('admin.cuentas.identidad')}</h3>
            <Datos>
              <Dato etiqueta={t('admin.cuentas.numero')} valor={c.cuenta?.numero ?? nada} />
              <Dato etiqueta={t('admin.cuentas.creada')} valor={fecha(c.acceso?.creado ?? c.cuenta?.creada)} />
            </Datos>
            <h3>{t('admin.cuentas.acceso')}</h3>
            <Datos>
              <Dato etiqueta={t('admin.cuentas.deshabilitada')} valor={siNo(c.acceso?.deshabilitado)} />
              <Dato etiqueta={t('admin.cuentas.tieneCorreo')} valor={siNo(c.acceso?.tieneCorreo)} />
              <Dato etiqueta={t('admin.cuentas.correoVerificado')} valor={siNo(c.acceso?.correoVerificado)} />
              <Dato etiqueta={t('admin.cuentas.proveedores')} valor={c.acceso?.proveedores.join(', ') || nada} />
              <Dato etiqueta={t('admin.cuentas.ultimoAcceso')} valor={fecha(c.acceso?.ultimoAcceso)} />
            </Datos>
            <h3>{t('admin.cuentas.perfiles')}</h3>
            {c.perfiles.length === 0 ? <p className="estado vacio">{t('admin.cuentas.sinPerfiles')}</p> : (
              <Tabla cabeceras={[t('admin.cuentas.tipo'), t('admin.cuentas.perfil'), t('admin.cuentas.creada')]}>
                {c.perfiles.map((p) => (
                  <tr key={p.id}>
                    <td>{p.tipo === 'wee' ? t('admin.cuentas.perfilWee') : t('admin.cuentas.perfilReal')}</td>
                    <th scope="row" className="codigo">{p.id}</th>
                    <td>{fecha(p.creado)}</td>
                  </tr>
                ))}
              </Tabla>
            )}
            <footer className="seccion-pie">
              <p className="nota">{t('admin.cuentas.sinRestricciones')}</p>
              <p className="nota">{t('admin.cuentas.sinRoles')}</p>
              {c.correlationId && <p className="nota">{t('admin.cuentas.constancia', { correlacion: c.correlationId })}</p>}
              <Procedencia fuente="accountsAdmin.buscar (users, accounts, auth)" estado={estado} />
            </footer>
          </section>
        </>
      )} />
    </>
  );
};

export const Cuentas = () => {
  const { t } = useIdioma();
  return (
    <Vista titulo={t('admin.cuentas.titulo')} descripcion={t('admin.cuentas.descripcion')} refrescable={false} dominios={['b']}>
      <Contenido />
    </Vista>
  );
};
