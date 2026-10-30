import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { leerIdentidad } from '../api/operaciones';
import { Auditoria } from './Auditoria';
import { Cuentas } from './Cuentas';
import { Moderacion } from './Moderacion';
import { Operaciones } from './Operaciones';
import { Panorama } from './Panorama';
import { Resumen } from './Resumen';

/*
 * Las secciones son las que tienen datos de verdad detrás (docs/admin-console/WEE_ADMIN_CONSOLE_DOMAIN_MAP.md): no
 * hay entradas de menú vacías para dominios sin fuente en el servidor. `resumen` es la ruta del Motor de IA (se
 * conserva el nombre para no romper enlaces guardados); `panorama`, la portada.
 */
type Ruta = 'panorama' | 'resumen' | 'credits' | 'moderacion' | 'operaciones' | 'cuentas' | 'auditoria';
const RUTAS: Ruta[] = ['panorama', 'resumen', 'credits', 'moderacion', 'operaciones', 'cuentas', 'auditoria'];
/**
 * Lo que hace falta para VER cada sección, tal como lo informa el servidor (`opsAdmin.quienSoy`). Ocultarla es
 * comodidad, no seguridad: el servidor comprueba el permiso en cada llamada. Pero tiene que ser exacto: una sesión que
 * pide lo que no puede ve «acceso denegado» en toda la consola, y con razón.
 *
 * Administración SIN rol conserva las secciones antiguas, porque el servidor le conserva sus operaciones
 * (functions/src/admin/permisos.ts); las nuevas, no.
 */
const PERMISO_DE_RUTA: Partial<Record<Ruta, readonly string[]>> = {
  resumen: ['ai.read'],
  credits: ['finance.read'],
  moderacion: ['moderation.read'],
  operaciones: ['ops.read', 'ai.read', 'finance.read'],
  cuentas: ['accounts.read'],
  auditoria: ['audit.read'],
};
const RUTAS_ANTIGUAS: readonly Ruta[] = ['resumen', 'credits', 'moderacion'];

interface Identidad { rol?: string; permisos: readonly string[] }

const puedeVer = (ruta: Ruta, { rol, permisos }: Identidad): boolean => {
  if (!rol && RUTAS_ANTIGUAS.includes(ruta)) return true;
  const hacen = PERMISO_DE_RUTA[ruta];
  return !hacen || hacen.some((p) => permisos.includes(p));
};

/** Para los bloques de las secciones antiguas: con rol, su permiso; sin rol, lo de siempre. */
export type PuedeLeer = (permiso: string) => boolean;
const lectorDe = ({ rol, permisos }: Identidad): PuedeLeer => (permiso) => !rol || permisos.includes(permiso);

const rutaDelHash = (): Ruta => {
  const h = (typeof window === 'undefined' ? '' : window.location.hash).replace(/^#\/?/, '');
  return (RUTAS as string[]).includes(h) ? (h as Ruta) : 'panorama';
};

/**
 * La consola con sesión iniciada. Vigila TODAS las respuestas del servidor: si cualquiera dice «sin permiso» o
 * «sin sesión», la consola entera se sustituye por la pantalla de acceso denegado (las vistas se desmontan y con
 * ellas sus datos). La decisión de verdad la toma el servidor; esto solo la hace visible.
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
      <ComprobacionDePermiso hijos={(identidad) => <Interior usuario={usuario} sesion={sesion} ruta={ruta} identidad={identidad} />} />
    </ContextoDeCliente.Provider>
  );
};

/**
 * ANTES de pintar el menú o cualquier vista, una lectura al servidor confirma que esta sesión es de administración y
 * qué puede (`opsAdmin.quienSoy`, la única que responde a toda administración, tenga el rol que tenga, y que mira Auth
 * en ese momento). Mientras tanto solo se ve «Comprobando permisos…»; si el servidor dice «sin permiso» o «sin sesión»,
 * el cliente vigilado ya cambia la consola entera por la pantalla de acceso denegado. Si falla por otra cosa, no se
 * entra: se dice y se deja reintentar. Esto NO sustituye a la comprobación del servidor en cada llamada.
 */
const ComprobacionDePermiso = ({ hijos }: { hijos: (identidad: Identidad) => ReactNode }) => {
  const t = useT();
  const { estado, recargar } = useAccion('opsAdmin.quienSoy', undefined, leerIdentidad);
  if (estado.fase === 'ok') return <>{hijos(estado.datos)}</>;
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

const Interior = ({ usuario, sesion, ruta: rutaPedida, identidad }: { usuario: UsuarioDeSesion; sesion: ServicioDeSesion; ruta: Ruta; identidad: Identidad }) => {
  const { t } = useIdioma();
  const { rol, permisos } = identidad;
  const puedeLeer = lectorDe(identidad);
  const ruta: Ruta = puedeVer(rutaPedida, identidad) ? rutaPedida : 'panorama';
  /* En móvil el menú se desplaza en horizontal: la sección en la que estás tiene que verse. */
  const activo = useRef<HTMLAnchorElement>(null);
  useEffect(() => { activo.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }, [ruta]);
  return (
    <div className="consola">
      <aside className="lateral">
        <Marca />
        <nav aria-label={t('admin.nav.menu')}>
          {RUTAS.filter((r) => puedeVer(r, identidad)).map((r) => (
            <a key={r} ref={r === ruta ? activo : undefined} href={`#/${r}`} className={`enlace${r === ruta ? ' activo' : ''}`} aria-current={r === ruta ? 'page' : undefined}>
              {t(`admin.nav.${r}`)}
            </a>
          ))}
        </nav>
        <div className="lateral-pie">
          <span className="insignia">{t('admin.app.lectura')}</span>
          {rol && <small>{t('admin.sesion.rol', { rol })}</small>}
          <SelectorDeIdioma />
          <small>{t('admin.sesion.conectadoComo', { email: usuario.email ?? t('admin.sesion.sinCorreo') })}</small>
          <button type="button" className="boton" onClick={() => void sesion.salir()}>{t('admin.sesion.salir')}</button>
        </div>
      </aside>
      <main className="contenido">
        {ruta === 'panorama' && <Panorama puedeLeer={puedeLeer} />}
        {ruta === 'resumen' && <Resumen />}
        {ruta === 'credits' && <Credits puedeLeer={puedeLeer} />}
        {ruta === 'moderacion' && <Moderacion />}
        {ruta === 'operaciones' && <Operaciones permisos={permisos} />}
        {ruta === 'cuentas' && <Cuentas />}
        {ruta === 'auditoria' && <Auditoria />}
      </main>
    </div>
  );
};
