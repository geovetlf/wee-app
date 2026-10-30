import { leerAuditoria } from '../api/operaciones';
import { Cargable } from '../componentes/Cargable';
import { Etiqueta, Seccion, Tabla } from '../componentes/Piezas';
import { Procedencia } from '../componentes/Procedencia';
import { useAccion } from '../hooks';
import { useIdioma } from '../i18n/i18n';

/** El registro de auditoría de administración: solo se lee. Nadie puede editarlo ni borrarlo desde la consola. */
export const Auditoria = () => {
  const { t, fecha } = useIdioma();
  const { estado, recargar } = useAccion('opsAdmin.auditoria', { limit: 50 }, leerAuditoria, (p) => p.items.length === 0);
  const nada = t('admin.comun.sinDato');
  return (
    <>
      <header className="cabecera-vista">
        <h1>{t('admin.auditoria.titulo')}</h1>
        <p>{t('admin.auditoria.descripcion')}</p>
      </header>
      <Seccion titulo={t('admin.auditoria.entradas')}>
        <Cargable estado={estado} recargar={recargar} vacio={t('admin.auditoria.sinEntradas')} hijos={(p) => (
          <Tabla cabeceras={[t('admin.auditoria.cuando'), t('admin.auditoria.quien'), t('admin.auditoria.accion'), t('admin.auditoria.recurso'), t('admin.auditoria.resultado'), t('admin.auditoria.correlacion'), t('admin.auditoria.entorno')]}>
            {p.items.map((e) => (
              <tr key={`${e.correlacion}/${e.en}/${e.resultado}`}>
                <td>{fecha(e.en)}</td>
                <td>{[e.actor, e.rol].filter(Boolean).join(' · ') || nada}</td>
                <td>{e.accion ?? nada}</td>
                <td>{e.recurso ?? nada}</td>
                <td><Etiqueta tono={e.resultado === 'ok' ? 'ok' : 'aviso'}>{e.resultado ?? nada}</Etiqueta></td>
                <td>{e.correlacion ?? nada}</td>
                <td>{e.entorno ?? nada}</td>
              </tr>
            ))}
          </Tabla>
        )} />
        <Procedencia fuente="opsAdmin.auditoria (adminAudit)" estado={estado} />
      </Seccion>
    </>
  );
};
