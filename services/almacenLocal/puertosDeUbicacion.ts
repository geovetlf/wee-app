/*
 * PUERTOS DE UBICACIÓN, lógica pura de cada plataforma (línea B1).
 *
 * Cada fábrica recibe SUS dependencias (el sistema de archivos, el selector de
 * carpetas, el manejador del navegador) y devuelve un `PuertoDeUbicacion`. Así la
 * lógica que decide (buscar antes de crear, pedir el permiso de nuevo, dónde está
 * WEE) se prueba con dobles, y la integración real solo conecta las APIs
 * (`ubicacion.ts` para iOS y Android; `ubicacion.web.ts` para la web).
 */
import { ErrorAlmacenLocal } from './tipos';
import { crearPuertoDeRuta, type OperacionesDeRuta } from './puertoDeRuta';
import { crearPuertoSAF, type HijoSAF, type OperacionesSAF } from './puertoSAF';
import { crearPuertoDirectorioWeb, type ManejadorDeDirectorioWeb } from './puertoDirectorioWeb';
import type { RegistroDeClaves } from './registroIdb';
import { CARPETA_WEE, type ComprobacionDeReferencia, type PuertoDeUbicacion, type RegistroDeUbicacion, type TiendaDeUbicacion } from '../../utils/ubicacionWee';

const conBarra = (ruta: string): string => (ruta.endsWith('/') ? ruta : `${ruta}/`);

/* ── iOS: la sandbox de la app, sin selector ───────────────────────────────── */

export interface DependenciasDeSandbox {
  /** La carpeta de documentos de la app (con barra final), o null si el sistema no la da. */
  carpetaDelSistema(): Promise<string | null>;
  operaciones: OperacionesDeRuta;
}

export const crearUbicacionSandbox = (dependencias: DependenciasDeSandbox): PuertoDeUbicacion => ({
  plataforma: 'ios',
  async elegirCarpeta() {
    const sandbox = await dependencias.carpetaDelSistema();
    if (!sandbox) throw new ErrorAlmacenLocal('no_disponible', 'sin carpeta de documentos');
    return conBarra(sandbox);
  },
  async crearWee(referenciaPadre) {
    const ruta = `${conBarra(referenciaPadre)}${CARPETA_WEE}/`;
    if ((await dependencias.operaciones.tipoDe(ruta)) !== 'carpeta') await dependencias.operaciones.crearCarpeta(ruta);
    return ruta;
  },
  async comprobarReferencia(referenciaWee): Promise<ComprobacionDeReferencia> {
    return (await dependencias.operaciones.tipoDe(referenciaWee)) === 'carpeta' ? 'concedida' : 'perdida';
  },
  async pedirDeNuevo() {
    return true;
  },
  puertoDeArchivos: (referenciaWee) => crearPuertoDeRuta(referenciaWee, dependencias.operaciones),
});

/* ── Android: Storage Access Framework ─────────────────────────────────────── */

export interface DependenciasDeSAF {
  /** Pide la carpeta a la persona. Devuelve su URI, o null si la cancela o no se concede. */
  elegirCarpeta(): Promise<string | null>;
  /** true si el sistema todavía deja leer esa carpeta con el permiso guardado. */
  puedeLeer(uri: string): Promise<boolean>;
  operaciones: OperacionesSAF;
}

export const crearUbicacionSAF = (dependencias: DependenciasDeSAF): PuertoDeUbicacion => ({
  plataforma: 'android',
  elegirCarpeta: () => dependencias.elegirCarpeta(),
  async crearWee(referenciaPadre) {
    // Primero se busca: crear sobre un nombre existente daría «WEE (1)» en SAF.
    const hijos: HijoSAF[] = await dependencias.operaciones.hijos(referenciaPadre);
    const existente = hijos.find((hijo) => hijo.esCarpeta && hijo.nombre === CARPETA_WEE);
    if (existente) return existente.uri;
    return dependencias.operaciones.crearCarpeta(referenciaPadre, CARPETA_WEE);
  },
  async comprobarReferencia(referenciaWee): Promise<ComprobacionDeReferencia> {
    return (await dependencias.puedeLeer(referenciaWee)) ? 'concedida' : 'requiere_gesto';
  },
  async pedirDeNuevo() {
    // En Android el permiso perdido se recupera eligiendo la carpeta otra vez.
    return false;
  },
  puertoDeArchivos: (referenciaWee) => crearPuertoSAF(referenciaWee, dependencias.operaciones),
});

/* ── Web: carpeta del ordenador (File System Access) y OPFS ────────────────── */

export interface DependenciasDeCarpetaWeb {
  registro: RegistroDeClaves;
  /** Muestra el selector y devuelve el manejador. Lanza con el nombre del error del navegador. */
  elegirManejador(): Promise<ManejadorDeDirectorioWeb>;
  espacioLibre(): Promise<number | null>;
}

const CLAVE_DEL_MANEJADOR = 'carpeta';
const REFERENCIA_CARPETA = 'idb:carpeta';

const nombreDeErrorWeb = (error: unknown): string => {
  if (typeof error !== 'object' || error === null) return '';
  const nombre = (error as { name?: unknown }).name;
  return typeof nombre === 'string' ? nombre : '';
};

export const crearUbicacionCarpetaWeb = (dependencias: DependenciasDeCarpetaWeb): PuertoDeUbicacion => {
  const manejadorGuardado = async (): Promise<ManejadorDeDirectorioWeb | null> =>
    ((await dependencias.registro.leer(CLAVE_DEL_MANEJADOR)) as ManejadorDeDirectorioWeb | undefined) ?? null;

  const carpetaWee = async (): Promise<ManejadorDeDirectorioWeb> => {
    const carpeta = await manejadorGuardado();
    if (!carpeta) throw new ErrorAlmacenLocal('no_disponible', 'no hay carpeta guardada');
    return carpeta.getDirectoryHandle(CARPETA_WEE, { create: true });
  };

  return {
    plataforma: 'web-carpeta',
    async elegirCarpeta() {
      let manejador: ManejadorDeDirectorioWeb;
      try {
        manejador = await dependencias.elegirManejador();
      } catch (error) {
        // Cerrar el selector o negar el acceso no es un fallo: la persona decidió no elegir.
        const nombre = nombreDeErrorWeb(error);
        if (nombre === 'AbortError' || nombre === 'NotAllowedError') return null;
        throw new ErrorAlmacenLocal('no_disponible', 'selector de carpetas');
      }
      await dependencias.registro.guardar(CLAVE_DEL_MANEJADOR, manejador);
      return REFERENCIA_CARPETA;
    },
    async crearWee(referenciaPadre) {
      await carpetaWee();
      return `${referenciaPadre}/${CARPETA_WEE}`;
    },
    async comprobarReferencia(): Promise<ComprobacionDeReferencia> {
      const carpeta = await manejadorGuardado();
      if (!carpeta) return 'perdida';
      const permiso = await (carpeta as ManejadorConPermisos).queryPermission({ mode: 'readwrite' });
      return permiso === 'granted' ? 'concedida' : 'requiere_gesto';
    },
    async pedirDeNuevo() {
      const carpeta = await manejadorGuardado();
      if (!carpeta) return false;
      return (await (carpeta as ManejadorConPermisos).requestPermission({ mode: 'readwrite' })) === 'granted';
    },
    puertoDeArchivos: () => crearPuertoDirectorioWeb(carpetaWee, dependencias.espacioLibre),
  };
};

/** Permisos del manejador de File System Access. */
export type ManejadorConPermisos = ManejadorDeDirectorioWeb & {
  queryPermission(opciones: { mode: 'readwrite' }): Promise<string>;
  requestPermission(opciones: { mode: 'readwrite' }): Promise<string>;
};

export interface DependenciasDeOpfs {
  /** La raíz de OPFS, o null si el navegador no tiene OPFS. */
  raiz(): Promise<ManejadorDeDirectorioWeb | null>;
  espacioLibre(): Promise<number | null>;
}

const REFERENCIA_OPFS = 'opfs';

/** OPFS: espacio PRIVADO del navegador. El sistema no lo muestra como carpeta. */
export const crearUbicacionOpfs = (dependencias: DependenciasDeOpfs): PuertoDeUbicacion => {
  const carpetaWee = async (): Promise<ManejadorDeDirectorioWeb> => {
    const raiz = await dependencias.raiz();
    if (!raiz) throw new ErrorAlmacenLocal('no_disponible', 'OPFS no existe');
    return raiz.getDirectoryHandle(CARPETA_WEE, { create: true });
  };
  return {
    plataforma: 'web-privado',
    async elegirCarpeta() {
      if (!(await dependencias.raiz())) throw new ErrorAlmacenLocal('no_disponible', 'OPFS no existe');
      return REFERENCIA_OPFS;
    },
    async crearWee() {
      await carpetaWee();
      return `${REFERENCIA_OPFS}/${CARPETA_WEE}`;
    },
    async comprobarReferencia(): Promise<ComprobacionDeReferencia> {
      return (await dependencias.raiz()) ? 'concedida' : 'perdida';
    },
    async pedirDeNuevo() {
      return true;
    },
    puertoDeArchivos: () => crearPuertoDirectorioWeb(carpetaWee, dependencias.espacioLibre),
  };
};

/* ── Registro de la ubicación sobre IndexedDB ──────────────────────────────── */

const CLAVE_DEL_REGISTRO = 'registro';

export const crearTiendaDeUbicacionEnRegistro = (registro: RegistroDeClaves): TiendaDeUbicacion => ({
  async leer() {
    return ((await registro.leer(CLAVE_DEL_REGISTRO)) as RegistroDeUbicacion | undefined) ?? null;
  },
  async guardar(valor) {
    await registro.guardar(CLAVE_DEL_REGISTRO, valor);
  },
  async borrar() {
    await registro.borrar(CLAVE_DEL_REGISTRO);
  },
});
