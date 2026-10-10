/*
 * CATÁLOGO LOCAL DE WEË (línea B1). Lógica pura sobre `AlmacenLocal`: no sabe
 * de React ni de la plataforma. Guarda un índice de proyectos y recursos, y
 * cada proyecto deja además una copia de sí mismo (`proyecto.json`).
 *
 * VOCABULARIO DEL CORE (`functions/src/core/project.ts`): `projectId`, `name`,
 * `emoji`, `itemCount`, `createdAt`/`updatedAt`. Un recurso es la versión local
 * de un `ProjectItem` de tipo `asset`. No es un segundo modelo de proyectos.
 *
 * CLAVES EN EL ALMACÉN
 *   indice.json                            el índice: la verdad para listar
 *   proyectos/<id>/proyecto.json           copia de recuperación del proyecto
 *   proyectos/<id>/recursos/<recursoId>    el archivo
 *   proyectos/<id>/caratula                miniatura (regenerable)
 *   cuarentena/<etiqueta>-<marca>.json     índices apartados: nunca se borran
 *
 * ORDEN DE ESCRITURA. Primero los archivos nuevos, después el índice (atómico)
 * y al final las copias. Si algo falla antes del índice se borran los archivos
 * nuevos y el índice no cambia: nunca queda nada a medias.
 *
 * QUÉ NO SE PUEDE RECONSTRUIR desde las copias:
 *   · un proyecto cuya copia no llegó a escribirse si además se pierde el índice;
 *   · el último cambio de metadatos si se cortó entre el índice y su copia;
 *   · la carátula: es regenerable y se marca como ausente, nunca se toma como verdad;
 *   · los archivos de un proyecto eliminado cuyo borrado no terminó: quedan
 *     huérfanos y se retiran en la siguiente apertura, solo si el índice es fiable.
 *
 * ÍNDICE CORRUPTO: se copia a `cuarentena/`, nunca se borra, y se reconstruye
 * desde las copias. ESQUEMA MÁS NUEVO: modo de solo lectura, no se toca nada.
 * ESQUEMA ANTERIOR: copia de seguridad y migración hacia delante.
 *
 * CONTRATO DE `importarProyecto`: los archivos llegan ya verificados (hash y
 * tamaño) por `decodificarBundle` de `utils/bundleLocal.ts`.
 */
import { ErrorAlmacenLocal, type AlmacenLocal, type EntradaDelAlmacen, type EstadoDelAlmacen } from '../services/almacenLocal/tipos';
import { iguales, utf8Codificar, utf8Decodificar } from './bytes';
import { sha256Hex } from './sha256';

export const ESQUEMA_DEL_INDICE = 1;
export const CLAVE_DEL_INDICE = 'indice.json';

const PREFIJO_DE_PROYECTOS = 'proyectos/';
const PREFIJO_DE_CUARENTENA = 'cuarentena/';
const EMOJI_POR_DEFECTO = '📁';
const LIMITE_DEL_NOMBRE = 60;
const LIMITE_DEL_NOMBRE_DE_ARCHIVO = 120;
const LIMITE_DEL_MIME = 120;
const LIMITE_DEL_EMOJI = 16;
const ID_VALIDO = /^[A-Za-z0-9_-]{3,64}$/;
const SHA_VALIDO = /^[0-9a-f]{64}$/;

export const TIPOS_DE_RECURSO = ['imagen', 'video', 'audio', 'documento', 'texto', 'otro'] as const;
export const ESTADOS_DEL_ARCHIVO = ['local', 'ausente', 'corrupto'] as const;
export const ESTADOS_DE_CARATULA = ['sin_caratula', 'presente', 'ausente'] as const;

export type TipoDeRecurso = (typeof TIPOS_DE_RECURSO)[number];
export type EstadoDelArchivo = (typeof ESTADOS_DEL_ARCHIVO)[number];
export type EstadoDeCaratula = (typeof ESTADOS_DE_CARATULA)[number];

export interface RecursoLocal {
  recursoId: string;
  nombre: string;
  tipo: TipoDeRecurso;
  mimeType: string;
  tamano: number;
  sha256: string;
  estado: EstadoDelArchivo;
  creadoEn: number;
  modificadoEn: number;
  /** Relación: el recurso del que sale este. Un duplicado apunta al original. */
  derivadoDe?: string;
}

export interface ProyectoLocal {
  projectId: string;
  name: string;
  emoji: string;
  caratula: { estado: EstadoDeCaratula };
  recursos: RecursoLocal[];
  itemCount: number;
  createdAt: number;
  updatedAt: number;
  ubicacion: 'este_dispositivo';
  /** Cuenta de la persona, si tenía sesión al crearlo. Vive solo aquí: la exportación no la incluye. */
  ownerAccountId?: string;
  /** Relación: el projectId del paquete del que se importó. */
  importadoDe?: string;
  /** Forma del respaldo. Hoy siempre `ninguno`; sin lógica (DEFERIDO). */
  respaldo: 'ninguno';
  /** Forma de la sincronización. Hoy siempre `no_habilitada`; sin lógica (DEFERIDO). */
  sincronizacion: 'no_habilitada';
}

export interface IndiceLocal {
  esquema: number;
  proyectos: ProyectoLocal[];
}

export type CodigoDelCatalogo =
  | 'nombre_no_valido'
  | 'tipo_no_valido'
  | 'identificador_no_valido'
  | 'no_existe'
  | 'solo_lectura'
  | 'archivo_no_disponible';

export class ErrorDelCatalogo extends Error {
  readonly codigo: CodigoDelCatalogo;

  constructor(codigo: CodigoDelCatalogo, detalle?: string) {
    super(detalle ? `${codigo}: ${detalle}` : codigo);
    this.name = 'ErrorDelCatalogo';
    this.codigo = codigo;
  }
}

export type AvisoDelCatalogo =
  | 'indice_en_cuarentena'
  | 'indice_reconstruido'
  | 'migrado'
  | 'esquema_mas_nuevo'
  | 'copia_ilegible'
  | 'copia_no_escrita'
  | 'estado_no_guardado'
  | 'temporales_no_limpiados'
  | 'huerfanos_no_borrados'
  | 'archivos_pendientes';

export interface OpcionesDelCatalogo {
  /** Reloj en milisegundos. Por defecto, `Date.now`. Las pruebas lo fijan. */
  ahora?: () => number;
  /** Genera identificadores. Por defecto, 12 caracteres en base 36. */
  nuevoId?: () => string;
  /** Cuenta de la persona, si tiene sesión. Solo se guarda en el dispositivo. */
  cuentaId?: string;
}

export interface NuevoRecurso {
  nombre: string;
  tipo: TipoDeRecurso;
  mimeType?: string;
  datos: Uint8Array;
}

export interface ArchivoDeImportacion {
  recursoId: string;
  nombre: string;
  tipo: TipoDeRecurso;
  mimeType: string;
  sha256: string;
  creadoEn: number;
  modificadoEn: number;
  derivadoDe?: string;
  datos: Uint8Array;
}

export interface EntradaDeImportacion {
  /** El projectId que traía el paquete. Se conserva si está libre; si no, se crea otro. */
  projectId: string;
  name: string;
  emoji: string;
  createdAt: number;
  archivos: ArchivoDeImportacion[];
}

export interface ContenidoParaExportar {
  proyecto: ProyectoLocal;
  archivos: Array<{ recurso: RecursoLocal; datos: Uint8Array }>;
}

export interface CatalogoLocal {
  readonly modoLectura: boolean;
  readonly avisos: readonly AvisoDelCatalogo[];
  proyectos(): ProyectoLocal[];
  proyecto(projectId: string): ProyectoLocal | null;
  crearProyecto(datos: { name: string; emoji?: string }): Promise<ProyectoLocal>;
  renombrar(projectId: string, name: string): Promise<ProyectoLocal>;
  duplicar(projectId: string, nombre: string): Promise<ProyectoLocal>;
  eliminar(projectId: string): Promise<void>;
  añadirRecurso(projectId: string, recurso: NuevoRecurso): Promise<RecursoLocal>;
  leerRecurso(projectId: string, recursoId: string): Promise<Uint8Array>;
  verificarRecurso(projectId: string, recursoId: string): Promise<EstadoDelArchivo>;
  marcarAusentes(): Promise<number>;
  regenerarCaratula(projectId: string, datos: Uint8Array): Promise<ProyectoLocal>;
  leerParaExportar(projectId: string): Promise<ContenidoParaExportar>;
  importarProyecto(entrada: EntradaDeImportacion): Promise<ProyectoLocal>;
  estado(): Promise<EstadoDelAlmacen & { modoLectura: boolean }>;
}

/* ── Validación del contenido que llega del disco ───────────────────────────── */

type Registro = Record<string, unknown>;

const esRegistro = (valor: unknown): valor is Registro => typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const esEntero = (valor: unknown): valor is number => typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;
const esFecha = (valor: unknown): valor is number => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
const esTextoHasta = (valor: unknown, maximo: number): valor is string => typeof valor === 'string' && valor.length <= maximo;
const esDeLista = <T extends string>(lista: readonly T[], valor: unknown): valor is T => typeof valor === 'string' && (lista as readonly string[]).includes(valor);
const esIdValido = (valor: unknown): valor is string => typeof valor === 'string' && ID_VALIDO.test(valor);

const esRecurso = (valor: unknown): valor is RecursoLocal =>
  esRegistro(valor) &&
  esIdValido(valor.recursoId) &&
  esTextoHasta(valor.nombre, LIMITE_DEL_NOMBRE_DE_ARCHIVO) &&
  esDeLista(TIPOS_DE_RECURSO, valor.tipo) &&
  esTextoHasta(valor.mimeType, LIMITE_DEL_MIME) &&
  esEntero(valor.tamano) &&
  typeof valor.sha256 === 'string' &&
  SHA_VALIDO.test(valor.sha256) &&
  esDeLista(ESTADOS_DEL_ARCHIVO, valor.estado) &&
  esFecha(valor.creadoEn) &&
  esFecha(valor.modificadoEn) &&
  (valor.derivadoDe === undefined || esIdValido(valor.derivadoDe));

const esProyecto = (valor: unknown): valor is ProyectoLocal => {
  if (!esRegistro(valor)) return false;
  const caratula = valor.caratula;
  return (
    esIdValido(valor.projectId) &&
    esTextoHasta(valor.name, 200) &&
    esTextoHasta(valor.emoji, LIMITE_DEL_EMOJI) &&
    esRegistro(caratula) &&
    esDeLista(['sin_caratula', 'presente', 'ausente'] as const, caratula.estado) &&
    Array.isArray(valor.recursos) &&
    valor.recursos.every(esRecurso) &&
    esFecha(valor.createdAt) &&
    esFecha(valor.updatedAt)
  );
};

const esIndice = (valor: unknown): valor is IndiceLocal =>
  esRegistro(valor) && valor.esquema === ESQUEMA_DEL_INDICE && Array.isArray(valor.proyectos) && valor.proyectos.every(esProyecto);

/** Rellena los campos que una versión anterior no tenía. Así no hay que tratar un proyecto viejo como un caso raro. */
const normalizarProyecto = (proyecto: ProyectoLocal): ProyectoLocal => ({
  ...proyecto,
  itemCount: proyecto.recursos.length,
  ubicacion: 'este_dispositivo',
  respaldo: 'ninguno',
  sincronizacion: 'no_habilitada',
});

/*
 * Migraciones hacia delante. El esquema 0 no existió en ninguna instalación: la
 * cadena existe para que, cuando el índice cambie, la migración tenga dónde
 * escribirse. La prueba la ejercita con un índice sintético de esquema 0.
 */
const MIGRACIONES: Record<number, (indice: Registro) => unknown> = {
  0: (indice) => {
    const proyectos: unknown[] = Array.isArray(indice.proyectos) ? indice.proyectos : [];
    return {
      esquema: ESQUEMA_DEL_INDICE,
      proyectos: proyectos.map((crudo) => {
        const proyecto: Registro = esRegistro(crudo) ? crudo : {};
        const recursos: unknown[] = Array.isArray(proyecto.recursos) ? proyecto.recursos : [];
        return {
          ...proyecto,
          caratula: { estado: 'sin_caratula' },
          recursos: recursos.map((recurso) => (esRegistro(recurso) ? { ...recurso, estado: 'local' } : recurso)),
          itemCount: recursos.length,
          ubicacion: 'este_dispositivo',
          respaldo: 'ninguno',
          sincronizacion: 'no_habilitada',
        };
      }),
    };
  },
};

type Lectura =
  | { tipo: 'ok'; indice: IndiceLocal }
  | { tipo: 'antiguo'; indice: IndiceLocal; esquemaOriginal: number }
  | { tipo: 'mas_nuevo'; esquema: number }
  | { tipo: 'corrupto' };

const interpretarIndice = (bytes: Uint8Array): Lectura => {
  let crudo: unknown;
  try {
    crudo = JSON.parse(utf8Decodificar(bytes));
  } catch {
    return { tipo: 'corrupto' };
  }
  if (!esRegistro(crudo) || !esEntero(crudo.esquema) || !Array.isArray(crudo.proyectos)) return { tipo: 'corrupto' };
  const esquema = crudo.esquema;
  if (esquema > ESQUEMA_DEL_INDICE) return { tipo: 'mas_nuevo', esquema };
  if (esquema < ESQUEMA_DEL_INDICE) {
    const migrar = MIGRACIONES[esquema] as ((indice: Registro) => unknown) | undefined;
    const migrado = migrar ? migrar(crudo) : null;
    return esIndice(migrado) ? { tipo: 'antiguo', indice: migrado, esquemaOriginal: esquema } : { tipo: 'corrupto' };
  }
  return esIndice(crudo) ? { tipo: 'ok', indice: { ...crudo, proyectos: crudo.proyectos.map(normalizarProyecto) } } : { tipo: 'corrupto' };
};

/* ── Claves y codificación ──────────────────────────────────────────────────── */

const claveDelProyecto = (projectId: string): string => `${PREFIJO_DE_PROYECTOS}${projectId}/`;
const claveDeLaCopia = (projectId: string): string => `${claveDelProyecto(projectId)}proyecto.json`;
const claveDelRecurso = (projectId: string, recursoId: string): string => `${claveDelProyecto(projectId)}recursos/${recursoId}`;
const claveDeLaCaratula = (projectId: string): string => `${claveDelProyecto(projectId)}caratula`;
const claveDeCuarentena = (etiqueta: string, marca: string): string => `${PREFIJO_DE_CUARENTENA}${etiqueta}-${marca}.json`;

const codificarProyecto = (proyecto: ProyectoLocal): Uint8Array => utf8Codificar(JSON.stringify(proyecto));
const codificarIndice = (indice: IndiceLocal): Uint8Array => utf8Codificar(JSON.stringify(indice));
const clonar = <T>(valor: T): T => JSON.parse(JSON.stringify(valor)) as T;

const normalizarNombre = (texto: string, maximo: number): string => {
  const limpio = texto.trim().replace(/\s+/g, ' ').slice(0, maximo);
  if (!limpio) throw new ErrorDelCatalogo('nombre_no_valido');
  return limpio;
};

const normalizarEmoji = (emoji: string | undefined): string => emoji?.trim().slice(0, LIMITE_DEL_EMOJI) || EMOJI_POR_DEFECTO;

const generarIdPorDefecto = (): string => {
  let id = '';
  for (let i = 0; i < 12; i++) id += Math.floor(Math.random() * 36).toString(36);
  return id;
};

/** Ejecuta `operacion`. Si falla, anota el aviso y sigue: nunca se traga en silencio. */
const intentar = async (operacion: () => Promise<unknown>, avisos: AvisoDelCatalogo[], aviso: AvisoDelCatalogo): Promise<void> => {
  try {
    await operacion();
  } catch {
    avisos.push(aviso);
  }
};

const escribirIndice = (almacen: AlmacenLocal, indice: IndiceLocal): Promise<void> => almacen.escribir(CLAVE_DEL_INDICE, codificarIndice(indice));

/** Reconstruye la lista de proyectos a partir de las copias `proyectos/<id>/proyecto.json`. */
const cargarCopias = async (almacen: AlmacenLocal, avisos: AvisoDelCatalogo[]): Promise<ProyectoLocal[]> => {
  const salida: ProyectoLocal[] = [];
  for (const { clave } of await almacen.listar(PREFIJO_DE_PROYECTOS)) {
    const partes = clave.split('/');
    if (partes.length !== 3 || partes[2] !== 'proyecto.json') continue;
    let crudo: unknown;
    try {
      crudo = JSON.parse(utf8Decodificar(await almacen.leer(clave)));
    } catch {
      avisos.push('copia_ilegible');
      continue;
    }
    if (esProyecto(crudo) && crudo.projectId === partes[1]) salida.push(normalizarProyecto(crudo));
    else avisos.push('copia_ilegible');
  }
  return salida;
};

/** Borra lo que hay bajo `proyectos/` y no pertenece a ningún proyecto del índice. */
const borrarHuerfanos = async (almacen: AlmacenLocal, indice: IndiceLocal, avisos: AvisoDelCatalogo[]): Promise<void> => {
  const conocidos = new Set(indice.proyectos.map((proyecto) => proyecto.projectId));
  const entradas: EntradaDelAlmacen[] = await almacen.listar(PREFIJO_DE_PROYECTOS);
  for (const { clave } of entradas) {
    if (!conocidos.has(clave.split('/')[1])) await intentar(() => almacen.borrar(clave), avisos, 'huerfanos_no_borrados');
  }
};

/* ── Apertura ───────────────────────────────────────────────────────────────── */

export const abrirCatalogoLocal = async (almacen: AlmacenLocal, opciones: OpcionesDelCatalogo = {}): Promise<CatalogoLocal> => {
  const ahora = opciones.ahora ?? (() => Date.now());
  const nuevoId = opciones.nuevoId ?? generarIdPorDefecto;
  const cuentaId = opciones.cuentaId;
  const avisos: AvisoDelCatalogo[] = [];
  const marca = (): string => `${ahora().toString(36)}-${nuevoId().replace(/[^A-Za-z0-9]/g, '').slice(0, 8)}`;

  let indice: IndiceLocal = { esquema: ESQUEMA_DEL_INDICE, proyectos: [] };
  let modoLectura = false;
  let fiable = true;
  let reescribir = false;

  const bytesDelIndice = (await almacen.existe(CLAVE_DEL_INDICE)) ? await almacen.leer(CLAVE_DEL_INDICE) : null;
  if (bytesDelIndice === null) {
    indice = { esquema: ESQUEMA_DEL_INDICE, proyectos: await cargarCopias(almacen, avisos) };
    if (indice.proyectos.length > 0) {
      avisos.push('indice_reconstruido');
      fiable = false;
      reescribir = true;
    }
  } else {
    const lectura = interpretarIndice(bytesDelIndice);
    if (lectura.tipo === 'ok') {
      indice = lectura.indice;
    } else if (lectura.tipo === 'antiguo') {
      await almacen.escribir(claveDeCuarentena(`esquema-${lectura.esquemaOriginal}`, marca()), bytesDelIndice);
      indice = lectura.indice;
      reescribir = true;
      avisos.push('migrado');
    } else if (lectura.tipo === 'mas_nuevo') {
      modoLectura = true;
      avisos.push('esquema_mas_nuevo');
    } else {
      await almacen.escribir(claveDeCuarentena('indice', marca()), bytesDelIndice);
      avisos.push('indice_en_cuarentena');
      indice = { esquema: ESQUEMA_DEL_INDICE, proyectos: await cargarCopias(almacen, avisos) };
      fiable = false;
      reescribir = true;
      if (indice.proyectos.length > 0) avisos.push('indice_reconstruido');
    }
  }

  if (!modoLectura) {
    // Lo que no está en disco no puede figurar como «local»: se reconcilia con la realidad.
    for (const proyecto of indice.proyectos) {
      await intentar(
        async () => {
          for (const recurso of proyecto.recursos) {
            const presente = await almacen.existe(claveDelRecurso(proyecto.projectId, recurso.recursoId));
            const esperado: EstadoDelArchivo = !presente ? 'ausente' : recurso.estado === 'ausente' ? 'local' : recurso.estado;
            if (esperado !== recurso.estado) {
              recurso.estado = esperado;
              reescribir = true;
            }
          }
          const caratulaPresente = await almacen.existe(claveDeLaCaratula(proyecto.projectId));
          const esperadaCaratula: EstadoDeCaratula = caratulaPresente ? 'presente' : proyecto.caratula.estado === 'sin_caratula' ? 'sin_caratula' : 'ausente';
          if (esperadaCaratula !== proyecto.caratula.estado) {
            proyecto.caratula = { estado: esperadaCaratula };
            reescribir = true;
          }
        },
        avisos,
        'estado_no_guardado',
      );
    }
    if (reescribir) await intentar(() => escribirIndice(almacen, indice), avisos, 'estado_no_guardado');
    for (const proyecto of indice.proyectos) {
      const clave = claveDeLaCopia(proyecto.projectId);
      const deseada = codificarProyecto(proyecto);
      await intentar(
        async () => {
          const actual = (await almacen.existe(clave)) ? await almacen.leer(clave) : null;
          if (actual === null || !iguales(actual, deseada)) await almacen.escribir(clave, deseada);
        },
        avisos,
        'copia_no_escrita',
      );
    }
    await intentar(() => almacen.limpiarTemporales(), avisos, 'temporales_no_limpiados');
    if (fiable) await intentar(() => borrarHuerfanos(almacen, indice, avisos), avisos, 'huerfanos_no_borrados');
  }

  /* ── Operaciones. Se encolan: dos cambios nunca se pisan. ─────────────────── */

  let cola: Promise<unknown> = Promise.resolve();
  const encolar = <T>(operacion: () => Promise<T>): Promise<T> => {
    const resultado = cola.then(operacion);
    cola = resultado.then(
      () => undefined,
      () => undefined,
    );
    return resultado;
  };

  const exigirEscritura = (): void => {
    if (modoLectura) throw new ErrorDelCatalogo('solo_lectura');
  };

  const buscar = (lista: IndiceLocal, projectId: string): ProyectoLocal => {
    const encontrado = lista.proyectos.find((proyecto) => proyecto.projectId === projectId);
    if (!encontrado) throw new ErrorDelCatalogo('no_existe', projectId);
    return encontrado;
  };

  const buscarRecurso = (proyecto: ProyectoLocal, recursoId: string): RecursoLocal => {
    const encontrado = proyecto.recursos.find((recurso) => recurso.recursoId === recursoId);
    if (!encontrado) throw new ErrorDelCatalogo('no_existe', recursoId);
    return encontrado;
  };

  /** Un identificador que no esté ocupado, según diga `ocupado`. */
  const idLibre = async (ocupado: (id: string) => Promise<boolean> | boolean): Promise<string> => {
    for (let intento = 0; intento < 20; intento++) {
      const id = nuevoId();
      if (!ID_VALIDO.test(id)) break;
      if (!(await ocupado(id))) return id;
    }
    throw new ErrorDelCatalogo('identificador_no_valido');
  };

  const idDeProyectoLibre = (): Promise<string> =>
    idLibre(async (id) => indice.proyectos.some((proyecto) => proyecto.projectId === id) || (await almacen.listar(claveDelProyecto(id))).length > 0);

  /**
   * Escribe `nuevos` (archivos que no existían), luego el índice, y al final las
   * copias de `actualizados`. Si algo falla antes del índice, borra lo nuevo y
   * relanza: el índice queda como estaba.
   */
  const aplicar = async (
    nuevo: IndiceLocal,
    nuevos: Array<{ clave: string; datos: Uint8Array }>,
    actualizados: ProyectoLocal[],
  ): Promise<void> => {
    const creados: string[] = [];
    try {
      for (const { clave, datos } of nuevos) {
        const existia = await almacen.existe(clave);
        await almacen.escribir(clave, datos);
        if (!existia) creados.push(clave);
      }
      await escribirIndice(almacen, nuevo);
    } catch (error) {
      for (const clave of creados) await intentar(() => almacen.borrar(clave), avisos, 'huerfanos_no_borrados');
      // Un fallo del índice deja su temporal: se retira ya, no en la próxima apertura.
      await intentar(() => almacen.limpiarTemporales(), avisos, 'temporales_no_limpiados');
      throw error;
    }
    indice = nuevo;
    for (const proyecto of actualizados) {
      await intentar(() => almacen.escribir(claveDeLaCopia(proyecto.projectId), codificarProyecto(proyecto)), avisos, 'copia_no_escrita');
    }
  };

  /** Lee un archivo y dice en qué estado está, sin cambiar nada. */
  const comprobar = async (projectId: string, recurso: RecursoLocal): Promise<{ estado: EstadoDelArchivo; datos: Uint8Array | null }> => {
    const clave = claveDelRecurso(projectId, recurso.recursoId);
    if (!(await almacen.existe(clave))) return { estado: 'ausente', datos: null };
    const datos = await almacen.leer(clave);
    if (datos.byteLength !== recurso.tamano || sha256Hex(datos) !== recurso.sha256) return { estado: 'corrupto', datos: null };
    return { estado: 'local', datos };
  };

  const leerComprobado = async (projectId: string, recurso: RecursoLocal): Promise<Uint8Array> => {
    const { estado, datos } = await comprobar(projectId, recurso);
    if (datos === null) throw new ErrorAlmacenLocal(estado === 'ausente' ? 'no_encontrado' : 'corrupto', recurso.recursoId);
    return datos;
  };

  /** Persiste el estado de un archivo. No lanza: si no se puede guardar, queda como aviso. */
  const fijarEstado = async (projectId: string, recursoId: string, estado: EstadoDelArchivo): Promise<void> => {
    if (modoLectura) return;
    const nuevo = clonar(indice);
    const proyecto = buscar(nuevo, projectId);
    buscarRecurso(proyecto, recursoId).estado = estado;
    await intentar(() => aplicar(nuevo, [], [proyecto]), avisos, 'estado_no_guardado');
  };

  const catalogo: CatalogoLocal = {
    get modoLectura() {
      return modoLectura;
    },
    get avisos() {
      return [...avisos];
    },

    proyectos: () => clonar(indice.proyectos).sort((a, b) => b.updatedAt - a.updatedAt),

    proyecto: (projectId) => {
      const encontrado = indice.proyectos.find((proyecto) => proyecto.projectId === projectId);
      return encontrado ? clonar(encontrado) : null;
    },

    crearProyecto: (datos) =>
      encolar(async () => {
        exigirEscritura();
        const nombre = normalizarNombre(datos.name, LIMITE_DEL_NOMBRE);
        const projectId = await idDeProyectoLibre();
        const ts = ahora();
        const proyecto: ProyectoLocal = {
          projectId,
          name: nombre,
          emoji: normalizarEmoji(datos.emoji),
          caratula: { estado: 'sin_caratula' },
          recursos: [],
          itemCount: 0,
          createdAt: ts,
          updatedAt: ts,
          ubicacion: 'este_dispositivo',
          ...(cuentaId ? { ownerAccountId: cuentaId } : {}),
          respaldo: 'ninguno',
          sincronizacion: 'no_habilitada',
        };
        const nuevo = clonar(indice);
        nuevo.proyectos.push(proyecto);
        await aplicar(nuevo, [{ clave: claveDeLaCopia(projectId), datos: codificarProyecto(proyecto) }], []);
        return clonar(proyecto);
      }),

    renombrar: (projectId, name) =>
      encolar(async () => {
        exigirEscritura();
        const nombre = normalizarNombre(name, LIMITE_DEL_NOMBRE);
        const nuevo = clonar(indice);
        const proyecto = buscar(nuevo, projectId);
        proyecto.name = nombre;
        proyecto.updatedAt = ahora();
        await aplicar(nuevo, [], [proyecto]);
        return clonar(proyecto);
      }),

    duplicar: (projectId, nombre) =>
      encolar(async () => {
        exigirEscritura();
        const origen = buscar(indice, projectId);
        const nombreDeLaCopia = normalizarNombre(nombre, LIMITE_DEL_NOMBRE);
        const copiaId = await idDeProyectoLibre();
        const ts = ahora();
        const nuevos: Array<{ clave: string; datos: Uint8Array }> = [];
        const recursos: RecursoLocal[] = [];
        for (const recurso of origen.recursos) {
          const datos = await leerComprobado(origen.projectId, recurso);
          const usados = new Set(recursos.map((r) => r.recursoId));
          const recursoId = await idLibre((id) => usados.has(id));
          nuevos.push({ clave: claveDelRecurso(copiaId, recursoId), datos });
          recursos.push({
            recursoId,
            nombre: recurso.nombre,
            tipo: recurso.tipo,
            mimeType: recurso.mimeType,
            tamano: recurso.tamano,
            sha256: recurso.sha256,
            estado: 'local',
            creadoEn: ts,
            modificadoEn: ts,
            derivadoDe: recurso.recursoId,
          });
        }
        let caratula: EstadoDeCaratula = 'sin_caratula';
        if (origen.caratula.estado === 'presente' && (await almacen.existe(claveDeLaCaratula(origen.projectId)))) {
          nuevos.push({ clave: claveDeLaCaratula(copiaId), datos: await almacen.leer(claveDeLaCaratula(origen.projectId)) });
          caratula = 'presente';
        }
        const copia: ProyectoLocal = {
          projectId: copiaId,
          name: nombreDeLaCopia,
          emoji: origen.emoji,
          caratula: { estado: caratula },
          recursos,
          itemCount: recursos.length,
          createdAt: ts,
          updatedAt: ts,
          ubicacion: 'este_dispositivo',
          ...(origen.ownerAccountId ? { ownerAccountId: origen.ownerAccountId } : {}),
          respaldo: 'ninguno',
          sincronizacion: 'no_habilitada',
        };
        nuevos.push({ clave: claveDeLaCopia(copiaId), datos: codificarProyecto(copia) });
        const nuevo = clonar(indice);
        nuevo.proyectos.push(copia);
        await aplicar(nuevo, nuevos, []);
        return clonar(copia);
      }),

    eliminar: (projectId) =>
      encolar(async () => {
        exigirEscritura();
        buscar(indice, projectId);
        const nuevo = clonar(indice);
        nuevo.proyectos = nuevo.proyectos.filter((proyecto) => proyecto.projectId !== projectId);
        await escribirIndice(almacen, nuevo);
        indice = nuevo;
        // Lo que falle aquí queda huérfano y se retira en la próxima apertura.
        let restos: EntradaDelAlmacen[] = [];
        await intentar(async () => {
          restos = await almacen.listar(claveDelProyecto(projectId));
        }, avisos, 'archivos_pendientes');
        for (const { clave } of restos) await intentar(() => almacen.borrar(clave), avisos, 'archivos_pendientes');
      }),

    añadirRecurso: (projectId, recurso) =>
      encolar(async () => {
        exigirEscritura();
        const existente = buscar(indice, projectId);
        if (!esDeLista(TIPOS_DE_RECURSO, recurso.tipo)) throw new ErrorDelCatalogo('tipo_no_valido', recurso.tipo);
        const nombre = normalizarNombre(recurso.nombre, LIMITE_DEL_NOMBRE_DE_ARCHIVO);
        const recursoId = await idLibre(
          async (id) => existente.recursos.some((r) => r.recursoId === id) || (await almacen.existe(claveDelRecurso(projectId, id))),
        );
        const ts = ahora();
        const nuevoRecurso: RecursoLocal = {
          recursoId,
          nombre,
          tipo: recurso.tipo,
          mimeType: (recurso.mimeType ?? '').slice(0, LIMITE_DEL_MIME),
          tamano: recurso.datos.byteLength,
          sha256: sha256Hex(recurso.datos),
          estado: 'local',
          creadoEn: ts,
          modificadoEn: ts,
        };
        const nuevo = clonar(indice);
        const proyecto = buscar(nuevo, projectId);
        proyecto.recursos.push(nuevoRecurso);
        proyecto.itemCount = proyecto.recursos.length;
        proyecto.updatedAt = ts;
        await aplicar(nuevo, [{ clave: claveDelRecurso(projectId, recursoId), datos: recurso.datos }], [proyecto]);
        return clonar(nuevoRecurso);
      }),

    leerRecurso: (projectId, recursoId) =>
      encolar(async () => {
        const proyecto = buscar(indice, projectId);
        const recurso = buscarRecurso(proyecto, recursoId);
        const { estado, datos } = await comprobar(proyecto.projectId, recurso);
        if (estado !== recurso.estado) await fijarEstado(proyecto.projectId, recursoId, estado);
        if (datos === null) throw new ErrorAlmacenLocal(estado === 'ausente' ? 'no_encontrado' : 'corrupto', recursoId);
        return datos;
      }),

    verificarRecurso: (projectId, recursoId) =>
      encolar(async () => {
        const proyecto = buscar(indice, projectId);
        const recurso = buscarRecurso(proyecto, recursoId);
        const { estado } = await comprobar(proyecto.projectId, recurso);
        if (estado !== recurso.estado) await fijarEstado(proyecto.projectId, recursoId, estado);
        return estado;
      }),

    marcarAusentes: () =>
      encolar(async () => {
        const nuevo = clonar(indice);
        let cambios = 0;
        for (const proyecto of nuevo.proyectos) {
          for (const recurso of proyecto.recursos) {
            const { estado } = await comprobar(proyecto.projectId, recurso);
            if (estado !== recurso.estado) {
              recurso.estado = estado;
              cambios++;
            }
          }
          if (proyecto.caratula.estado !== 'sin_caratula') {
            const presente = await almacen.existe(claveDeLaCaratula(proyecto.projectId));
            const esperada: EstadoDeCaratula = presente ? 'presente' : 'ausente';
            if (esperada !== proyecto.caratula.estado) {
              proyecto.caratula = { estado: esperada };
              cambios++;
            }
          }
        }
        if (cambios > 0 && !modoLectura) await aplicar(nuevo, [], nuevo.proyectos);
        return cambios;
      }),

    regenerarCaratula: (projectId, datos) =>
      encolar(async () => {
        exigirEscritura();
        const nuevo = clonar(indice);
        const proyecto = buscar(nuevo, projectId);
        proyecto.caratula = { estado: 'presente' };
        await aplicar(nuevo, [{ clave: claveDeLaCaratula(projectId), datos }], [proyecto]);
        return clonar(proyecto);
      }),

    leerParaExportar: (projectId) =>
      encolar(async () => {
        const proyecto = buscar(indice, projectId);
        const archivos: Array<{ recurso: RecursoLocal; datos: Uint8Array }> = [];
        for (const recurso of proyecto.recursos) {
          const { estado, datos } = await comprobar(proyecto.projectId, recurso);
          if (datos === null) {
            if (estado !== recurso.estado) await fijarEstado(proyecto.projectId, recurso.recursoId, estado);
            throw new ErrorDelCatalogo('archivo_no_disponible', recurso.recursoId);
          }
          archivos.push({ recurso: clonar(recurso), datos });
        }
        return { proyecto: clonar(proyecto), archivos };
      }),

    importarProyecto: (entrada) =>
      encolar(async () => {
        exigirEscritura();
        const original = entrada.projectId;
        if (!ID_VALIDO.test(original)) throw new ErrorDelCatalogo('identificador_no_valido', original);
        // Nunca se sobrescribe: si el identificador está ocupado, se crea otro.
        const ocupado = indice.proyectos.some((proyecto) => proyecto.projectId === original) || (await almacen.listar(claveDelProyecto(original))).length > 0;
        const projectId = ocupado ? await idDeProyectoLibre() : original;
        const ts = ahora();
        const nuevos: Array<{ clave: string; datos: Uint8Array }> = [];
        const recursos: RecursoLocal[] = [];
        const ids = new Set<string>();
        for (const archivo of entrada.archivos) {
          if (!esDeLista(TIPOS_DE_RECURSO, archivo.tipo)) throw new ErrorDelCatalogo('tipo_no_valido', archivo.tipo);
          if (!ID_VALIDO.test(archivo.recursoId) || ids.has(archivo.recursoId)) throw new ErrorDelCatalogo('identificador_no_valido', archivo.recursoId);
          ids.add(archivo.recursoId);
          nuevos.push({ clave: claveDelRecurso(projectId, archivo.recursoId), datos: archivo.datos });
          recursos.push({
            recursoId: archivo.recursoId,
            nombre: normalizarNombre(archivo.nombre, LIMITE_DEL_NOMBRE_DE_ARCHIVO),
            tipo: archivo.tipo,
            mimeType: archivo.mimeType.slice(0, LIMITE_DEL_MIME),
            tamano: archivo.datos.byteLength,
            sha256: archivo.sha256,
            estado: 'local',
            creadoEn: archivo.creadoEn,
            modificadoEn: archivo.modificadoEn,
            ...(archivo.derivadoDe ? { derivadoDe: archivo.derivadoDe } : {}),
          });
        }
        const proyecto: ProyectoLocal = {
          projectId,
          name: normalizarNombre(entrada.name, LIMITE_DEL_NOMBRE),
          emoji: normalizarEmoji(entrada.emoji),
          caratula: { estado: 'sin_caratula' },
          recursos,
          itemCount: recursos.length,
          createdAt: entrada.createdAt,
          updatedAt: ts,
          ubicacion: 'este_dispositivo',
          ...(cuentaId ? { ownerAccountId: cuentaId } : {}),
          importadoDe: original,
          respaldo: 'ninguno',
          sincronizacion: 'no_habilitada',
        };
        nuevos.push({ clave: claveDeLaCopia(projectId), datos: codificarProyecto(proyecto) });
        const nuevo = clonar(indice);
        nuevo.proyectos.push(proyecto);
        await aplicar(nuevo, nuevos, []);
        return clonar(proyecto);
      }),

    estado: async () => ({ ...(await almacen.estado()), modoLectura }),
  };

  return catalogo;
};
