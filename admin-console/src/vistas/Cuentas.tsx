import { useState, type FormEvent } from 'react';
import { leerCuenta } from '../api/operaciones';
import { Cargable } from '../componentes/Cargable';
import { Dato, Datos, Seccion, Tabla } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';

/*
 * CUENTAS E IDENTIDAD: mirar UNA cuenta, por su uid o por su número. Nunca hay listados ni búsqueda libre, y cada
 * consulta queda en `adminAudit` con el identificador consultado: quién miró a quién. Solo lectura: suspender o
 * restringir no existe en el servidor, y aquí se dice en vez de pintar un botón que no haría nada.
 */
type Consulta = { uid: string } | { numeroDeCuenta: string };

export const Cuentas = () => {
  const { t, fecha } = useIdioma();
  const [escrito, setEscrito] = useState('');
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const { estado, recargar } = useAccion('accountsAdmin.buscar', consulta, leerCuenta, (c) => !c.encontrada);
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
      <header className="cabecera-vista">
        <h1>{t('admin.cuentas.titulo')}</h1>
        <p>{t('admin.cuentas.descripcion')}</p>
      </header>
      <Seccion titulo={t('admin.cuentas.buscar')}>
        <p className="nota">{t('admin.cuentas.ayuda')}</p>
        <form className="formulario en-linea" onSubmit={enviar}>
          <label>
            <span>{t('admin.cuentas.identificador')}</span>
            <input value={escrito} onChange={(e) => setEscrito(e.target.value)} autoComplete="off" spellCheck={false} />
          </label>
          <button type="submit" className="boton primario" disabled={!escrito.trim()}>{t('admin.cuentas.consultar')}</button>
        </form>
        <Cargable estado={estado} recargar={recargar} vacio={t('admin.cuentas.noEncontrada')} hijos={(c) => c.encontrada && (
          <>
            <Datos>
              <Dato resaltar etiqueta={t('admin.cuentas.uid')} valor={c.uid ?? nada} />
              <Dato etiqueta={t('admin.cuentas.numero')} valor={c.cuenta?.numero ?? nada} />
              <Dato etiqueta={t('admin.cuentas.estado')} valor={c.cuenta?.estado && ['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(c.cuenta.estado) ? t(`admin.cuentas.estados.${c.cuenta.estado}`) : c.cuenta?.estado ?? nada} />
              <Dato etiqueta={t('admin.cuentas.deshabilitada')} valor={siNo(c.acceso?.deshabilitado)} />
              <Dato etiqueta={t('admin.cuentas.tieneCorreo')} valor={siNo(c.acceso?.tieneCorreo)} />
              <Dato etiqueta={t('admin.cuentas.correoVerificado')} valor={siNo(c.acceso?.correoVerificado)} />
              <Dato etiqueta={t('admin.cuentas.proveedores')} valor={c.acceso?.proveedores.join(', ') || nada} />
              <Dato etiqueta={t('admin.cuentas.creada')} valor={fecha(c.acceso?.creado ?? c.cuenta?.creada)} />
              <Dato etiqueta={t('admin.cuentas.ultimoAcceso')} valor={fecha(c.acceso?.ultimoAcceso)} />
            </Datos>
            <h3>{t('admin.cuentas.perfiles')}</h3>
            {c.perfiles.length === 0 ? <p className="estado vacio">{t('admin.cuentas.sinPerfiles')}</p> : (
              <Tabla cabeceras={[t('admin.cuentas.tipo'), t('admin.cuentas.perfil'), t('admin.cuentas.creada')]}>
                {c.perfiles.map((p) => (
                  <tr key={p.id}>
                    <td>{p.tipo === 'wee' ? t('admin.cuentas.perfilWee') : t('admin.cuentas.perfilReal')}</td>
                    <th scope="row">{p.id}</th>
                    <td>{fecha(p.creado)}</td>
                  </tr>
                ))}
              </Tabla>
            )}
            <p className="nota">{t('admin.cuentas.sinRestricciones')}</p>
            {c.correlationId && <p className="nota">{t('admin.cuentas.constancia', { correlacion: c.correlationId })}</p>}
          </>
        )} />
        <Procedencia fuente="accountsAdmin.buscar (users, accounts, auth)" estado={estado} />
      </Seccion>
    </>
  );
};
