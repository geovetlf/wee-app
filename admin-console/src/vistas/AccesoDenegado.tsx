import { Marca, SelectorDeIdioma } from '../componentes/Marco';
import { useT } from '../i18n/i18n';

/**
 * Sin menú, sin vistas, sin datos: solo el aviso y la salida. `permission-denied` → acceso denegado;
 * `unauthenticated` → pide volver a iniciar sesión (el botón cierra la sesión rota y lleva al formulario).
 */
export const AccesoDenegado = ({ motivo, alSalir }: { motivo: 'denegado' | 'sin-sesion'; alSalir: () => void }) => {
  const t = useT();
  const sinSesion = motivo === 'sin-sesion';
  return (
    <main className="pantalla-central">
      <div className="tarjeta-central" role="alert">
        <div className="barra-minima"><Marca /><SelectorDeIdioma /></div>
        <h1>{sinSesion ? t('admin.denegado.tituloSinSesion') : t('admin.denegado.titulo')}</h1>
        <p>{sinSesion ? t('admin.denegado.sinSesion') : t('admin.denegado.mensaje')}</p>
        <button type="button" className="boton primario" onClick={alSalir}>{sinSesion ? t('admin.denegado.volverAEntrar') : t('admin.sesion.salir')}</button>
      </div>
    </main>
  );
};
