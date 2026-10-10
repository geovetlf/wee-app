/*
 * SECCIÓN «EN ESTE DISPOSITIVO» de «Mis proyectos» (línea I). La lógica de la pantalla, sin
 * React: estados y acciones, con todas sus dependencias inyectadas. El hook y el componente
 * solo la conectan; las pruebas la ejercitan con dobles (`functions/test/local-first-seccion`).
 *
 * REGLAS
 *   · Un proyecto aparece «disponible» solo si TODOS sus archivos existen y se pueden leer
 *     (`verificarRecurso`, que comprueba tamaño y huella). Si no, dice qué falta.
 *   · Un proyecto sin archivos no es «disponible» ni «no encontrado»: dice que está vacío.
 *   · Un fallo de la carpeta (permiso revocado, sin espacio) no bloquea la app: la sección lo
 *     muestra y ofrece volver a permitir o elegir otra carpeta.
 *   · Nada de esto consume Credits, ni llama a la nube, ni guarda nada fuera del dispositivo.
 *   · Lo interno (índice, copias, carátulas) vive en los metadatos; los archivos del usuario,
 *     en la carpeta WEE. El reparto lo hace `almacenEnrutado.ts`.
 *
 * Las CLAVES de texto que devuelve son de `biblioteca.*`: quien pinta las resuelve con `t()`.
 */
import type { AlmacenLocal } from '../services/almacenLocal/tipos';
import { crearAlmacenEnrutado } from '../services/almacenLocal/almacenEnrutado';
import { abrirCatalogoLocal, type AvisoDelCatalogo, type CatalogoLocal, type EstadoDelArchivo, type ProyectoLocal } from './catalogoLocal';
import { codificarBundle, type ArchivoParaExportar } from './bundleLocal';
import {
  activarUbicacion,
  disponibilidadDelProyecto,
  recuperarUbicacion,
  reconcederUbicacion,
  type EstadoDeUbicacion,
  type PlataformaDeUbicacion,
  type PuertoDeUbicacion,
  type RegistroDeUbicacion,
  type ResultadoDeUbicacion,
  type TiendaDeUbicacion,
} from './ubicacionWee';

export type EstadoDeProyecto = 'disponible' | 'sin_archivos' | 'archivo_ausente' | 'archivo_corrupto' | 'error_recuperable';

/** Un archivo verificado. `error` = no se pudo comprobar por una causa que no es de la carpeta. */
export interface ArchivoDeLaSeccion {
  recursoId: string;
  nombre: string;
  tamano: number;
  estado: EstadoDelArchivo | 'error';
}

export interface ProyectoDeLaSeccion {
  projectId: string;
  name: string;
  /** La carátula de un proyecto es su emoji. */
  emoji: string;
  modificadoEn: number;
  estado: EstadoDeProyecto;
  archivos: ArchivoDeLaSeccion[];
}

/** Los avisos del catálogo que la persona debe ver. Los técnicos (copias, migraciones) no se muestran. */
export type AvisoDeLaSeccion = 'indice_en_cuarentena' | 'indice_reconstruido';

/** El error de una acción, como clave de texto (`biblioteca.*`). */
export type ErrorDeLaSeccion =
  | 'errorSinEspacio'
  | 'errorNoEncontrado'
  | 'errorCorrupto'
  | 'errorNoDisponible'
  | 'errorNombreNoValido'
  | 'errorSoloLectura'
  | 'errorArchivoNoDisponible'
  | 'errorDesconocido';

export interface EstadoDeLaSeccion {
  /** El estado de la ubicación, tal y como lo ve la persona (incluye los fallos del catálogo). */
  ubicacion: EstadoDeUbicacion;
  plataforma: PlataformaDeUbicacion | null;
  registro: RegistroDeUbicacion | null;
  proyectos: ProyectoDeLaSeccion[];
  avisos: AvisoDeLaSeccion[];
  soloLectura: boolean;
  /** Bytes libres de la carpeta. `null` = no se puede medir (nunca 0 por defecto). */
  espacioLibre: number | null;
}

/** Una vista es el estado que pinta la pantalla más el catálogo abierto que usan las acciones. */
export interface VistaDeLaSeccion {
  estado: EstadoDeLaSeccion;
  catalogo: CatalogoLocal | null;
}

export type ResultadoDeAccion<T = void> = { ok: true; valor: T } | { ok: false; error: ErrorDeLaSeccion };

export interface DependenciasDeLaSeccion {
  /** La ubicación de este aparato o navegador. `null` si no tiene ninguna. */
  puerto: PuertoDeUbicacion | null;
  tienda: TiendaDeUbicacion | null;
  /** Índice, copias y carátulas. Nunca dentro de la carpeta WEE. */
  metadatos: AlmacenLocal;
  /** Los archivos del usuario, dentro de la carpeta WEE indicada. */
  archivosDe: (referenciaWee: string) => AlmacenLocal;
  ahora: () => number;
  nuevoId?: () => string;
  /** Cuenta de la persona, si tiene sesión. Solo se guarda en el dispositivo. */
  cuentaId?: string;
}

/* ── Utilidades ─────────────────────────────────────────────────────────────── */

const codigoDe = (error: unknown): string | null => {
  if (typeof error === 'object' && error !== null && 'codigo' in error && typeof error.codigo === 'string') return error.codigo;
  return null;
};

const CLAVE_DE_CODIGO: Record<string, ErrorDeLaSeccion> = {
  sin_espacio: 'errorSinEspacio',
  no_encontrado: 'errorNoEncontrado',
  no_existe: 'errorNoEncontrado',
  corrupto: 'errorCorrupto',
  no_disponible: 'errorNoDisponible',
  nombre_no_valido: 'errorNombreNoValido',
  solo_lectura: 'errorSoloLectura',
  archivo_no_disponible: 'errorArchivoNoDisponible',
};

const errorDeAccion = (error: unknown): ErrorDeLaSeccion => CLAVE_DE_CODIGO[codigoDe(error) ?? ''] ?? 'errorDesconocido';

const AVISOS_VISIBLES: readonly AvisoDelCatalogo[] = ['indice_en_cuarentena', 'indice_reconstruido'];

const avisosDe = (avisos: readonly AvisoDelCatalogo[]): AvisoDeLaSeccion[] =>
  avisos.filter((aviso): aviso is AvisoDeLaSeccion => (AVISOS_VISIBLES as readonly string[]).includes(aviso));

/**
 * Qué estado de ubicación ve la persona cuando el catálogo falla. En Android y en el
 * navegador con carpeta, «no disponible» casi siempre es un permiso que se perdió; en iOS
 * (sandbox) no hay permiso que perder, así que es un fallo del aparato.
 */
const ubicacionDeFallo = (codigo: string | null, plataforma: PlataformaDeUbicacion | null): EstadoDeUbicacion => {
  if (codigo === 'sin_espacio') return 'sin_espacio';
  if (codigo === 'no_disponible') return plataforma === 'android' || plataforma === 'web-carpeta' ? 'permiso_perdido' : 'no_disponible';
  return 'error_recuperable';
};

const abrirCatalogo = (deps: DependenciasDeLaSeccion, registro: RegistroDeUbicacion): Promise<CatalogoLocal> =>
  abrirCatalogoLocal(crearAlmacenEnrutado({ archivos: deps.archivosDe(registro.referenciaWee), metadatos: deps.metadatos }), {
    ahora: deps.ahora,
    nuevoId: deps.nuevoId,
    cuentaId: deps.cuentaId,
  });

/**
 * Un proyecto es «disponible» solo si todos sus archivos se pudieron verificar y están
 * completos. Si no, se dice el motivo: un archivo ausente o corrupto, o un error.
 */
const estadoDeProyecto = (archivos: ArchivoDeLaSeccion[], fallo: boolean): EstadoDeProyecto => {
  const abrible = fallo ? 'error' : archivos.every((archivo) => archivo.estado === 'local') ? 'si' : 'no';
  if (disponibilidadDelProyecto('disponible', abrible) === 'disponible') return 'disponible';
  if (archivos.some((archivo) => archivo.estado === 'ausente')) return 'archivo_ausente';
  if (archivos.some((archivo) => archivo.estado === 'corrupto')) return 'archivo_corrupto';
  return 'error_recuperable';
};

/**
 * Verifica los archivos de un proyecto. Un fallo de la carpeta (no disponible) se propaga:
 * afecta a toda la sección, no a un proyecto.
 */
export const evaluarProyecto = async (catalogo: CatalogoLocal, proyecto: ProyectoLocal): Promise<ProyectoDeLaSeccion> => {
  const cabecera = { projectId: proyecto.projectId, name: proyecto.name, emoji: proyecto.emoji, modificadoEn: proyecto.updatedAt };
  if (proyecto.recursos.length === 0) return { ...cabecera, estado: 'sin_archivos', archivos: [] };

  const archivos: ArchivoDeLaSeccion[] = [];
  let fallo = false;
  for (const recurso of proyecto.recursos) {
    const base = { recursoId: recurso.recursoId, nombre: recurso.nombre, tamano: recurso.tamano };
    try {
      archivos.push({ ...base, estado: await catalogo.verificarRecurso(proyecto.projectId, recurso.recursoId) });
    } catch (error) {
      if (codigoDe(error) === 'no_disponible') throw error;
      fallo = true;
      archivos.push({ ...base, estado: 'error' });
    }
  }
  return { ...cabecera, estado: estadoDeProyecto(archivos, fallo), archivos };
};

const evaluarTodos = async (catalogo: CatalogoLocal): Promise<ProyectoDeLaSeccion[]> => {
  const proyectos: ProyectoDeLaSeccion[] = [];
  for (const proyecto of catalogo.proyectos()) proyectos.push(await evaluarProyecto(catalogo, proyecto));
  return proyectos;
};

const vistaSinCatalogo = (ubicacion: EstadoDeUbicacion, plataforma: PlataformaDeUbicacion | null, registro: RegistroDeUbicacion | null): VistaDeLaSeccion => ({
  estado: { ubicacion, plataforma, registro, proyectos: [], avisos: [], soloLectura: false, espacioLibre: null },
  catalogo: null,
});

/** Convierte el resultado de la ubicación en la vista: abre el catálogo solo si la carpeta está lista. */
const vistaDesde = async (deps: DependenciasDeLaSeccion, resultado: ResultadoDeUbicacion): Promise<VistaDeLaSeccion> => {
  const plataforma = deps.puerto?.plataforma ?? null;
  if (resultado.estado !== 'disponible' || !resultado.registro) return vistaSinCatalogo(resultado.estado, plataforma, resultado.registro);
  try {
    const catalogo = await abrirCatalogo(deps, resultado.registro);
    const proyectos = await evaluarTodos(catalogo);
    const { espacioLibre } = await catalogo.estado();
    return {
      estado: { ubicacion: 'disponible', plataforma, registro: resultado.registro, proyectos, avisos: avisosDe(catalogo.avisos), soloLectura: catalogo.modoLectura, espacioLibre },
      catalogo,
    };
  } catch (error) {
    return vistaSinCatalogo(ubicacionDeFallo(codigoDe(error), plataforma), plataforma, resultado.registro);
  }
};

const sinPuerto = (): VistaDeLaSeccion => vistaSinCatalogo('no_disponible', null, null);

/* ── Estados de la ubicación ───────────────────────────────────────────────── */

/** Al entrar: comprueba la carpeta guardada, sin preguntar ni crear nada. */
export const cargarSeccion = async (deps: DependenciasDeLaSeccion): Promise<VistaDeLaSeccion> => {
  if (!deps.puerto || !deps.tienda) return sinPuerto();
  return vistaDesde(deps, await recuperarUbicacion(deps.puerto, deps.tienda));
};

/** Tras explicar el permiso y pulsar «continuar» (o «reintentar» / «elegir otra carpeta»). */
export const activarSeccion = async (deps: DependenciasDeLaSeccion): Promise<VistaDeLaSeccion> => {
  if (!deps.puerto || !deps.tienda) return sinPuerto();
  return vistaDesde(deps, await activarUbicacion(deps.puerto, deps.tienda, deps.ahora));
};

/**
 * Permiso perdido: se vuelve a pedir con un gesto de la persona. En Android el puerto no puede
 * concederlo en sitio (`pedirDeNuevo` es false): la única salida es elegir la carpeta otra vez, así
 * que el botón «Volver a permitir» lleva a elegirla. Sin esto, la sección se quedaba bloqueada.
 */
export const volverAPermitirSeccion = async (deps: DependenciasDeLaSeccion, registro: RegistroDeUbicacion): Promise<VistaDeLaSeccion> => {
  if (!deps.puerto) return sinPuerto();
  if (deps.puerto.plataforma === 'android') return activarSeccion(deps);
  return vistaDesde(deps, await reconcederUbicacion(deps.puerto, registro));
};

/**
 * Un turno: las operaciones corren una detrás de otra, en el orden en que se piden. Así dos
 * catálogos nunca escriben a la vez: cada apertura barre lo que no figura en su índice, y eso
 * borraría la copia que otra operación está escribiendo en ese momento.
 */
export const crearTurno = (): (<T>(operacion: () => Promise<T>) => Promise<T>) => {
  let cola: Promise<unknown> = Promise.resolve();
  return <T>(operacion: () => Promise<T>): Promise<T> => {
    const resultado = cola.then(operacion);
    cola = resultado.then(
      () => undefined,
      () => undefined,
    );
    return resultado;
  };
};

/* ── Acciones sobre los proyectos ──────────────────────────────────────────── */

const ok = <T>(valor: T): ResultadoDeAccion<T> => ({ ok: true, valor });
const fallo = (error: unknown): ResultadoDeAccion<never> => ({ ok: false, error: errorDeAccion(error) });

/** Crea un proyecto vacío. El nombre lo normaliza el catálogo. */
export const crearProyectoEnSeccion = async (catalogo: CatalogoLocal, nombre: string): Promise<ResultadoDeAccion<ProyectoLocal>> => {
  try {
    return ok(await catalogo.crearProyecto({ name: nombre }));
  } catch (error) {
    return fallo(error);
  }
};

/**
 * Abre un proyecto: LEE de verdad cada archivo (no solo mira si existe). Devuelve el estado de
 * cada uno. Quien llama vuelve a evaluar la sección después, para que «disponible» salga de
 * la misma comprobación.
 */
export const abrirProyectoEnSeccion = async (catalogo: CatalogoLocal, projectId: string): Promise<ResultadoDeAccion<ArchivoDeLaSeccion[]>> => {
  const proyecto = catalogo.proyecto(projectId);
  if (!proyecto) return { ok: false, error: 'errorNoEncontrado' };
  try {
    const archivos: ArchivoDeLaSeccion[] = [];
    for (const recurso of proyecto.recursos) {
      const base = { recursoId: recurso.recursoId, nombre: recurso.nombre, tamano: recurso.tamano };
      try {
        await catalogo.leerRecurso(projectId, recurso.recursoId);
        archivos.push({ ...base, estado: 'local' });
      } catch (error) {
        const codigo = codigoDe(error);
        if (codigo === 'no_encontrado') archivos.push({ ...base, estado: 'ausente' });
        else if (codigo === 'corrupto') archivos.push({ ...base, estado: 'corrupto' });
        else throw error;
      }
    }
    return ok(archivos);
  } catch (error) {
    return fallo(error);
  }
};

export const duplicarProyectoEnSeccion = async (catalogo: CatalogoLocal, projectId: string, nombreDeLaCopia: string): Promise<ResultadoDeAccion<ProyectoLocal>> => {
  try {
    return ok(await catalogo.duplicar(projectId, nombreDeLaCopia));
  } catch (error) {
    return fallo(error);
  }
};

export const eliminarProyectoEnSeccion = async (catalogo: CatalogoLocal, projectId: string): Promise<ResultadoDeAccion> => {
  try {
    await catalogo.eliminar(projectId);
    return ok(undefined);
  } catch (error) {
    return fallo(error);
  }
};

/** Nombre seguro de archivo para un proyecto exportado (sin barras ni caracteres prohibidos). */
export const nombreDeArchivoDeExportacion = (nombreDelProyecto: string): string => {
  const limpio = nombreDelProyecto
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return `${limpio || 'proyecto'}.weeproy`;
};

/** Empaqueta el proyecto en un paquete `wee-proyecto@1`. Lee y verifica cada archivo antes. */
export const exportarProyectoEnSeccion = async (catalogo: CatalogoLocal, projectId: string, exportadoEn: number): Promise<ResultadoDeAccion<Uint8Array>> => {
  try {
    const { proyecto, archivos } = await catalogo.leerParaExportar(projectId);
    const paquete: ArchivoParaExportar[] = archivos.map(({ recurso, datos }) => ({
      recursoId: recurso.recursoId,
      nombre: recurso.nombre,
      tipo: recurso.tipo,
      mimeType: recurso.mimeType,
      creadoEn: recurso.creadoEn,
      modificadoEn: recurso.modificadoEn,
      ...(recurso.derivadoDe ? { derivadoDe: recurso.derivadoDe } : {}),
      datos,
    }));
    const bytes = codificarBundle({ projectId: proyecto.projectId, name: proyecto.name, emoji: proyecto.emoji, createdAt: proyecto.createdAt, updatedAt: proyecto.updatedAt }, paquete, exportadoEn);
    return ok(bytes);
  } catch (error) {
    return fallo(error);
  }
};

/**
 * Empaqueta el proyecto y lo entrega (hoja de compartir en nativo, descarga en web). La entrega va
 * inyectada. Nunca lanza: si el sistema no puede compartir, o la entrega falla, el resultado lo dice
 * para que la pantalla lo muestre (antes, un fallo de la entrega quedaba sin aviso).
 */
export const entregarProyectoEnSeccion = async (
  catalogo: CatalogoLocal,
  projectId: string,
  nombreDelArchivo: string,
  entregar: (nombre: string, datos: Uint8Array) => Promise<boolean>,
  exportadoEn: number,
): Promise<ResultadoDeAccion> => {
  const empaquetado = await exportarProyectoEnSeccion(catalogo, projectId, exportadoEn);
  if (!empaquetado.ok) return { ok: false, error: empaquetado.error };
  try {
    return (await entregar(nombreDelArchivo, empaquetado.valor)) ? ok(undefined) : { ok: false, error: 'errorNoDisponible' };
  } catch {
    return { ok: false, error: 'errorDesconocido' };
  }
};
