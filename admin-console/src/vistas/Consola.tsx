import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ClienteDeAdmin } from '../api/cliente';
import { clasificarError } from '../api/errores';
import type { ServicioDeSesion, UsuarioDeSesion } from '../auth/sesion';
import { Cargable } from '../componentes/Cargable';
import { Icono, type NombreDeIcono } from '../componentes/Iconos';
import { Marca, SelectorDeIdioma } from '../componentes/Marco';
import { useAccion } from '../hooks';
import { useIdioma, useT } from '../i18n/i18n';
import { ContextoDeCliente } from '../servicios';
import { AccesoDenegado } from './AccesoDenegado';
import { Credits } from './Credits';
import { leerIdentidad } from '../api/operaciones';
import { Auditoria } from './Auditoria';
import { Cuentas } from './Cuentas';
import { Dominios } from './Dominios';
import { Moderacion } from './Moderacion';
import { Operaciones } from './Operaciones';
import { Panorama } from './Panorama';
import { Resumen } from './Resumen';

/*
 * Las secciones son las que tienen datos de verdad detrás: un dominio sin fuente en el servidor no tiene entrada de menú
 * vacía, tiene su ficha en `dominios` (src/dominios.ts), que dice su estado real y no pide nada. `resumen` es la ruta del
 * Motor de IA (se conserva el nombre para no romper enlaces guardados); `panorama`, la portada.
 */
type Ruta = 'panorama' | 'dominios' | 'resumen' | 'credits' | 'moderacion' | 'operaciones' | 'cuentas' | 'auditoria';
const RUTAS: Ruta[] = ['panorama', 'dominios', 'resumen', 'credits', 'moderacion', 'operaciones', 'cuentas', 'auditoria'];
export type RutaDeConsola = Ruta;
/** Cómo se agrupan en el menú. Un grupo sin ninguna sección permitida no se pinta. */
const GRUPOS: readonly { clave: string; rutas: readonly Ruta[] }[] = [
  { clave: 'general', rutas: ['panorama', 'dominios'] },
  { clave: 'ia', rutas: ['resumen', 'operaciones'] },
  { clave: 'economia', rutas: ['credits'] },
  { clave: 'personas', rutas: ['cuentas', 'moderacion'] },
  { clave: 'seguridad', rutas: ['auditoria'] },
];
const ICONO_DE_RUTA: Record<Ruta, NombreDeIcono> = { panorama: 'panorama', dominios: 'dominios', resumen: 'motor', credits: 'credits', moderacion: 'moderacion', operaciones: 'operaciones', cuentas: 'cuentas', auditoria: 'auditoria' };
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

/** `#/dominios/c` es la ficha de un dominio; el resto, una sección. */
const rutaDelHash = (): { ruta: Ruta; detalle?: string } => {
  const [h, detalle] = (typeof window === 'undefined' ? '' : window.location.hash).replace(/^#\/?/, '').split('/');
  return (RUTAS as string[]).includes(h) ? { ruta: h as Ruta, detalle } : { ruta: 'panorama' };
};

/**
 * La consola con sesión iniciada. Vigila TODAS las respuestas del servidor: si cualquiera dice «sin permiso» o
 * «sin sesión», la consola entera se sustituye por la pantalla de acceso denegado (las vistas se desmontan y con
 * ellas sus datos). La decisión de verdad la toma el servidor; esto solo la hace visible.
 */
export const Consola = ({ usuario, cliente, sesion }: { usuario: UsuarioDeSesion; cliente: ClienteDeAdmin; sesion: ServicioDeSesion }) => {
  const [{ ruta, detalle }, setRuta] = useState(rutaDelHash);
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
      <ComprobacionDePermiso hijos={(identidad) => <Interior usuario={usuario} sesion={sesion} ruta={ruta} detalle={detalle} identidad={identidad} />} />
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

/** La media query de `estilos.css` a partir de la cual el menú deja de ser un cajón. */
const ESCRITORIO = '(min-width: 56.3125rem)';

const Interior = ({ usuario, sesion, ruta: rutaPedida, detalle, identidad }: { usuario: UsuarioDeSesion; sesion: ServicioDeSesion; ruta: Ruta; detalle?: string; identidad: Identidad }) => {
  const { t } = useIdioma();
  const { rol, permisos } = identidad;
  const puedeLeer = lectorDe(identidad);
  const ruta: Ruta = puedeVer(rutaPedida, identidad) ? rutaPedida : 'panorama';
  const [cajonAbierto, setCajonAbierto] = useState(false);
  const [contraido, setContraido] = useState(false);
  const botonDeMenu = useRef<HTMLButtonElement>(null);
  const cerrarCajon = useRef<HTMLButtonElement>(null);
  const principal = useRef<HTMLElement>(null);
  const correo = usuario.email ?? t('admin.sesion.sinCorreo');

  const devolverFoco = useRef(false);
  const cerrar = () => {
    devolverFoco.current = true;
    setCajonAbierto(false);
  };

  /* El cajón es modal: Escape lo cierra y el foco entra y sale con él. Si la ventana crece, deja de ser cajón. */
  useEffect(() => {
    if (!cajonAbierto) {
      if (devolverFoco.current) { devolverFoco.current = false; botonDeMenu.current?.focus(); }
      return;
    }
    cerrarCajon.current?.focus();
    const alPulsar = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    const medio = window.matchMedia?.(ESCRITORIO);
    const alCrecer = () => { if (medio?.matches) setCajonAbierto(false); };
    window.addEventListener('keydown', alPulsar);
    medio?.addEventListener('change', alCrecer);
    return () => {
      window.removeEventListener('keydown', alPulsar);
      medio?.removeEventListener('change', alCrecer);
    };
  }, [cajonAbierto]);

  useEffect(() => { document.title = `${t(`admin.nav.${ruta}`)} · Weë ${t('admin.app.titulo')}`; }, [ruta, t]);
  /* Al cambiar de sección el foco va al contenido: si no, se queda en un enlace y quien usa lector de pantalla no se entera. */
  const primeraVista = useRef(true);
  useEffect(() => {
    window.scrollTo?.(0, 0);
    if (primeraVista.current) { primeraVista.current = false; return; }
    principal.current?.focus({ preventScroll: true });
  }, [ruta, detalle]);

  return (
    <div className={`consola${contraido ? ' contraida' : ''}${cajonAbierto ? ' cajon-abierto' : ''}`}>
      <a className="saltar" href="#contenido" onClick={(e) => { e.preventDefault(); principal.current?.focus(); }}>{t('admin.nav.saltar')}</a>
      <div className="barra-movil" inert={cajonAbierto}>
        <button ref={botonDeMenu} type="button" className="boton-icono" aria-label={t('admin.nav.abrirMenu')} aria-expanded={cajonAbierto} aria-controls="lateral" onClick={() => setCajonAbierto(true)}>
          <Icono nombre="menu" />
        </button>
        <Marca />
      </div>
      <div className="velo" onClick={cerrar} aria-hidden="true" />
      <aside id="lateral" className="lateral">
        <div className="lateral-marca">
          <Marca />
          <button ref={cerrarCajon} type="button" className="boton-icono solo-cajon" aria-label={t('admin.nav.cerrarMenu')} onClick={cerrar}>
            <Icono nombre="cerrar" />
          </button>
        </div>
        <nav aria-label={t('admin.nav.menu')}>
          {GRUPOS.map((grupo) => {
            const rutas = grupo.rutas.filter((r) => puedeVer(r, identidad));
            if (rutas.length === 0) return null;
            return (
              <div key={grupo.clave} className="grupo" role="group" aria-label={t(`admin.nav.grupos.${grupo.clave}`)}>
                <p className="grupo-titulo" aria-hidden="true">{t(`admin.nav.grupos.${grupo.clave}`)}</p>
                {rutas.map((r) => (
                  <a key={r} href={`#/${r}`} title={contraido ? t(`admin.nav.${r}`) : undefined} className={`enlace${r === ruta ? ' activo' : ''}`} aria-current={r === ruta ? 'page' : undefined} onClick={() => setCajonAbierto(false)}>
                    <Icono nombre={ICONO_DE_RUTA[r]} />
                    <span className="enlace-texto">{t(`admin.nav.${r}`)}</span>
                  </a>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="lateral-pie">
          <button type="button" className="enlace contraer" title={contraido ? t('admin.nav.expandir') : undefined} onClick={() => setContraido((c) => !c)}>
            <Icono nombre={contraido ? 'expandir' : 'contraer'} />
            <span className="enlace-texto">{t(contraido ? 'admin.nav.expandir' : 'admin.nav.contraer')}</span>
          </button>
          <div className="usuario">
            <span className="avatar" aria-hidden="true">{correo.charAt(0).toUpperCase()}</span>
            <div className="usuario-datos">
              <small className="usuario-correo" title={correo}>{t('admin.sesion.conectadoComo', { email: correo })}</small>
              {rol && <small>{t('admin.sesion.rol', { rol })}</small>}
            </div>
          </div>
          <span className="insignia"><Icono nombre="candado" tamano={13} /><span className="enlace-texto">{t('admin.app.lectura')}</span></span>
          <div className="lateral-ajustes">
            <SelectorDeIdioma />
            <button type="button" className="boton" title={contraido ? t('admin.sesion.salir') : undefined} onClick={() => void sesion.salir()}>
              <Icono nombre="salir" tamano={16} />
              <span className="enlace-texto">{t('admin.sesion.salir')}</span>
            </button>
          </div>
        </div>
      </aside>
      <main ref={principal} id="contenido" className="contenido" tabIndex={-1} inert={cajonAbierto}>
        {ruta === 'panorama' && <Panorama uid={usuario.uid} puedeLeer={puedeLeer} permisos={permisos} rutas={RUTAS.filter((r) => r !== 'panorama' && puedeVer(r, identidad))} ocultas={RUTAS.filter((r) => !puedeVer(r, identidad))} rutaSinPermiso={rutaPedida !== ruta} />}
        {ruta === 'dominios' && <Dominios id={detalle} rutas={RUTAS.filter((r) => puedeVer(r, identidad))} />}
        {ruta === 'resumen' && <Resumen puedeLeer={puedeLeer} />}
        {ruta === 'credits' && <Credits puedeLeer={puedeLeer} />}
        {ruta === 'moderacion' && <Moderacion />}
        {ruta === 'operaciones' && <Operaciones permisos={permisos} />}
        {ruta === 'cuentas' && <Cuentas />}
        {ruta === 'auditoria' && <Auditoria />}
      </main>
    </div>
  );
};
