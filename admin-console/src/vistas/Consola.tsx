import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ClienteDeAdmin } from '../api/cliente';
import { clasificarError } from '../api/errores';
import type { ServicioDeSesion, UsuarioDeSesion } from '../auth/sesion';
import { Cargable } from '../componentes/Cargable';
import { Marca, SelectorDeIdioma } from '../componentes/Marco';
import { useAccion } from '../hooks';
import { useIdioma, useT } from '../i18n/i18n';
import { ContextoDeCliente } from '../servicios';
import { AccesoDenegado } from './AccesoDenegado';
import { Credits } from './Credits';
import { Moderacion } from './Moderacion';
import { Resumen } from './Resumen';

type Ruta = 'resumen' | 'credits' | 'moderacion';
const RUTAS: Ruta[] = ['resumen', 'credits', 'moderacion'];

const rutaDelHash = (): Ruta => {
  const h = (typeof window === 'undefined' ? '' : window.location.hash).replace(/^#\/?/, '');
  return (RUTAS as string[]).includes(h) ? (h as Ruta) : 'resumen';
};

/**
 * La consola con sesión iniciada. Vigila TODAS las respuestas del servidor: si cualquiera dice «sin permiso» o
 * «sin sesión», la consola entera se sustituye por la pantalla de acceso denegado (las vistas se desmontan y con
 * ellas sus datos). La decisión de verdad la toma el servidor con `assertAdmin`; esto solo la hace visible.
 */
export const Consola = ({ usuario, cliente, sesion }: { usuario: UsuarioDeSesion; cliente: ClienteDeAdmin; sesion: ServicioDeSesion }) => {
  const [ruta, setRuta] = useState<Ruta>(rutaDelHash);
  const [rechazo, setRechazo] = useState<'denegado' | 'sin-sesion' | null>(null);

  useEffect(() => {
    const alCambiar = () => setRuta(rutaDelHash());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  const vigilado = useMemo<ClienteDeAdmin>(() => ({
    llamar: async (accion, parametros) => {
      try {
        return await cliente.llamar(accion, parametros);
      } catch (error) {
        const tipo = clasificarError(error).tipo;
        if (tipo === 'denegado' || tipo === 'sin-sesion') setRechazo(tipo);
        throw error;
      }
    },
  }), [cliente]);

  if (rechazo) return <AccesoDenegado motivo={rechazo} alSalir={() => void sesion.salir()} />;

  return (
    <ContextoDeCliente.Provider value={vigilado}>
      <ComprobacionDePermiso>
        <Interior usuario={usuario} sesion={sesion} ruta={ruta} />
      </ComprobacionDePermiso>
    </ContextoDeCliente.Provider>
  );
};

/**
 * ANTES de pintar el menú o cualquier vista, una lectura al servidor confirma que esta sesión es de administración
 * (`engineAdmin.status`, de la lista permitida, protegida por `assertAdmin` como las otras siete). Mientras tanto
 * solo se ve «Comprobando permisos…»; si el servidor dice «sin permiso» o «sin sesión», el cliente vigilado ya
 * cambia la consola entera por la pantalla de acceso denegado. Esto NO sustituye a `assertAdmin`: cada vista sigue
 * pidiendo sus datos al servidor, que vuelve a comprobarlo en cada llamada.
 */
const ComprobacionDePermiso = ({ children }: { children: ReactNode }) => {
  const t = useT();
  const { estado, recargar } = useAccion('engineAdmin.status', undefined, () => true);
  if (estado.fase === 'ok') return <>{children}</>;
  return (
    <main className="pantalla-central">
      <div className="tarjeta-central">
        <div className="barra-minima"><Marca /><SelectorDeIdioma /></div>
        {estado.fase === 'cargando' || estado.fase === 'inactivo'
          ? <p className="estado" role="status">{t('admin.sesion.comprobando')}</p>
          : <Cargable estado={estado} recargar={recargar} hijos={() => null} />}
      </div>
    </main>
  );
};

const Interior = ({ usuario, sesion, ruta }: { usuario: UsuarioDeSesion; sesion: ServicioDeSesion; ruta: Ruta }) => {
  const { t } = useIdioma();
  return (
    <div className="consola">
      <aside className="lateral">
        <Marca />
        <nav aria-label={t('admin.nav.menu')}>
          {RUTAS.map((r) => (
            <a key={r} href={`#/${r}`} className={`enlace${r === ruta ? ' activo' : ''}`} aria-current={r === ruta ? 'page' : undefined}>
              {t(`admin.nav.${r}`)}
            </a>
          ))}
        </nav>
        <div className="lateral-pie">
          <span className="insignia">{t('admin.app.lectura')}</span>
          <SelectorDeIdioma />
          <small>{t('admin.sesion.conectadoComo', { email: usuario.email ?? t('admin.sesion.sinCorreo') })}</small>
          <button type="button" className="boton" onClick={() => void sesion.salir()}>{t('admin.sesion.salir')}</button>
        </div>
      </aside>
      <main className="contenido">
        {ruta === 'resumen' && <Resumen />}
        {ruta === 'credits' && <Credits />}
        {ruta === 'moderacion' && <Moderacion />}
      </main>
    </div>
  );
};
