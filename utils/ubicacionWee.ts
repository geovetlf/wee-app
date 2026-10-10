/*
 * UBICACIÓN WEE (línea B1): dónde viven los proyectos locales.
 *
 * Una carpeta física «WEE» cuando la plataforma la permite; un espacio privado del
 * navegador (OPFS) cuando no. Este módulo NO dibuja nada: devuelve estados y la
 * pantalla dice lo que corresponde, con el permiso explicado ANTES de pedirlo.
 *
 * PRINCIPIOS (decisiones del dueño):
 *   · Local por defecto. La nube es opcional y de pago con Credits; aquí no se usa.
 *   · Los proyectos locales NO entran en mediaObjects ni en el índice de referencias.
 *   · Guardar en local no consume Credits.
 *
 * MÁQUINA DE ESTADOS: sin_configurar → pidiendo_permiso → creando → verificando →
 * disponible. Ramas: permiso_denegado, permiso_perdido, sin_espacio, no_disponible,
 * error_recuperable. Una transición que no está en la tabla NO cambia el estado.
 */
import { ErrorAlmacenLocal } from '../services/almacenLocal/tipos';
import type { PuertoDeArchivos } from '../services/almacenLocal/puertoDeArchivos';
import { iguales, utf8Codificar } from './bytes';

export const CARPETA_WEE = 'WEE';

/** Ajustes predeterminados. La nube queda APAGADA: esta línea no la usa. */
export const AJUSTES_DE_ALMACENAMIENTO = {
  ubicacion: 'carpeta_wee',
  nube: 'desactivada',
} as const;

export type PlataformaDeUbicacion = 'ios' | 'android' | 'web-carpeta' | 'web-privado';

export type EstadoDeUbicacion =
  | 'sin_configurar'
  | 'pidiendo_permiso'
  | 'creando'
  | 'verificando'
  | 'disponible'
  | 'permiso_denegado'
  | 'permiso_perdido'
  | 'sin_espacio'
  | 'no_disponible'
  | 'error_recuperable';

export type EventoDeUbicacion =
  | 'iniciar'
  | 'carpeta_elegida'
  | 'denegada'
  | 'carpeta_lista'
  | 'verificada'
  | 'comprobada'
  | 'requiere_gesto'
  | 'sin_espacio'
  | 'no_disponible'
  | 'permiso_perdido'
  | 'error';

const TRANSICIONES: Record<EstadoDeUbicacion, Partial<Record<EventoDeUbicacion, EstadoDeUbicacion>>> = {
  sin_configurar: { iniciar: 'pidiendo_permiso', comprobada: 'disponible', requiere_gesto: 'permiso_perdido', no_disponible: 'no_disponible' },
  pidiendo_permiso: { carpeta_elegida: 'creando', denegada: 'permiso_denegado', no_disponible: 'no_disponible', error: 'error_recuperable' },
  creando: { carpeta_lista: 'verificando', sin_espacio: 'sin_espacio', no_disponible: 'no_disponible', error: 'error_recuperable' },
  verificando: { verificada: 'disponible', sin_espacio: 'sin_espacio', no_disponible: 'no_disponible', permiso_perdido: 'permiso_perdido', error: 'error_recuperable' },
  disponible: { permiso_perdido: 'permiso_perdido', requiere_gesto: 'permiso_perdido', no_disponible: 'no_disponible', error: 'error_recuperable' },
  permiso_denegado: { iniciar: 'pidiendo_permiso' },
  permiso_perdido: { iniciar: 'pidiendo_permiso', comprobada: 'disponible', no_disponible: 'no_disponible' },
  sin_espacio: { iniciar: 'pidiendo_permiso' },
  no_disponible: { iniciar: 'pidiendo_permiso' },
  error_recuperable: { iniciar: 'pidiendo_permiso' },
};

export interface ResultadoDeTransicion {
  estado: EstadoDeUbicacion;
  valida: boolean;
}

export const transicionar = (estado: EstadoDeUbicacion, evento: EventoDeUbicacion): ResultadoDeTransicion => {
  const siguiente = TRANSICIONES[estado][evento];
  return siguiente ? { estado: siguiente, valida: true } : { estado, valida: false };
};

export interface RegistroDeUbicacion {
  plataforma: PlataformaDeUbicacion;
  /** La carpeta que eligió la persona (o la sandbox de iOS, o el manejador guardado de la web). */
  referenciaPadre: string;
  /** La carpeta WEE dentro de ella. */
  referenciaWee: string;
  creadaEn: number;
  verificadaEn: number;
}

export type ComprobacionDeReferencia = 'concedida' | 'requiere_gesto' | 'perdida';

/** Lo que cada plataforma pone. El flujo de aquí no sabe de expo ni del navegador. */
export interface PuertoDeUbicacion {
  readonly plataforma: PlataformaDeUbicacion;
  /** Pide la carpeta a la persona. null = la cancela o la deniega. Lanza `no_disponible` si la plataforma no puede. En iOS devuelve la sandbox sin preguntar. */
  elegirCarpeta(): Promise<string | null>;
  /** Crea la carpeta WEE dentro de la elegida, o reutiliza la que ya existe. Nunca duplica. */
  crearWee(referenciaPadre: string): Promise<string>;
  /** Estado de una carpeta WEE guardada, sin preguntar a la persona. */
  comprobarReferencia(referenciaWee: string): Promise<ComprobacionDeReferencia>;
  /** Vuelve a pedir el permiso. En la web exige un gesto del usuario. true = concedido. */
  pedirDeNuevo(referenciaPadre: string): Promise<boolean>;
  /** El puerto de archivos sobre la carpeta WEE. */
  puertoDeArchivos(referenciaWee: string): PuertoDeArchivos;
}

export interface TiendaDeUbicacion {
  leer(): Promise<RegistroDeUbicacion | null>;
  guardar(registro: RegistroDeUbicacion): Promise<void>;
  borrar(): Promise<void>;
}

export interface ResultadoDeUbicacion {
  estado: EstadoDeUbicacion;
  registro: RegistroDeUbicacion | null;
  /** El código del fallo (o la comprobación), para la pantalla. null si no hubo problema. */
  motivo: string | null;
  /** Los estados por los que pasó, en orden. */
  recorrido: EstadoDeUbicacion[];
}

const codigoDe = (error: unknown): string | null => (error instanceof ErrorAlmacenLocal ? error.codigo : null);

const eventoDeFallo = (error: unknown): EventoDeUbicacion => {
  const codigo = codigoDe(error);
  if (codigo === 'sin_espacio') return 'sin_espacio';
  if (codigo === 'no_disponible') return 'no_disponible';
  return 'error';
};

const PRUEBA = '.wee-verificacion';

/** Escribe un archivo de prueba, lo lee de vuelta y lo borra. Lanza si algo no coincide. */
export const verificarCarpeta = async (puerto: PuertoDeArchivos, ahora: number): Promise<void> => {
  const contenido = utf8Codificar(`wee-verificacion-${ahora}`);
  await puerto.escribir(PRUEBA, contenido);
  try {
    const leido = await puerto.leer(PRUEBA);
    if (!iguales(leido, contenido)) throw new ErrorAlmacenLocal('corrupto', PRUEBA);
  } finally {
    await puerto.borrar(PRUEBA);
  }
};

/** Primera activación: elegir carpeta, crear WEE, verificarla y guardar el registro. */
export const activarUbicacion = async (puerto: PuertoDeUbicacion, tienda: TiendaDeUbicacion, ahora: () => number): Promise<ResultadoDeUbicacion> => {
  const recorrido: EstadoDeUbicacion[] = [];
  let estado: EstadoDeUbicacion = 'sin_configurar';
  const avanzar = (evento: EventoDeUbicacion): void => {
    const resultado = transicionar(estado, evento);
    if (resultado.valida) {
      estado = resultado.estado;
      recorrido.push(estado);
    }
  };

  avanzar('iniciar');
  try {
    const referenciaPadre = await puerto.elegirCarpeta();
    if (referenciaPadre === null) {
      avanzar('denegada');
      return { estado, registro: null, motivo: 'permiso_denegado', recorrido };
    }
    avanzar('carpeta_elegida');
    const referenciaWee = await puerto.crearWee(referenciaPadre);
    avanzar('carpeta_lista');
    await verificarCarpeta(puerto.puertoDeArchivos(referenciaWee), ahora());
    avanzar('verificada');
    const instante = ahora();
    const registro: RegistroDeUbicacion = { plataforma: puerto.plataforma, referenciaPadre, referenciaWee, creadaEn: instante, verificadaEn: instante };
    await tienda.guardar(registro);
    return { estado, registro, motivo: null, recorrido };
  } catch (error) {
    avanzar(eventoDeFallo(error));
    return { estado, registro: null, motivo: codigoDe(error) ?? 'desconocido', recorrido };
  }
};

/** Reapertura: comprueba la carpeta guardada SIN crear nada ni preguntar. */
export const recuperarUbicacion = async (puerto: PuertoDeUbicacion, tienda: TiendaDeUbicacion): Promise<ResultadoDeUbicacion> => {
  const registro = await tienda.leer();
  if (!registro) return { estado: 'sin_configurar', registro: null, motivo: null, recorrido: [] };
  const recorrido: EstadoDeUbicacion[] = [];
  let estado: EstadoDeUbicacion = 'sin_configurar';
  const avanzar = (evento: EventoDeUbicacion): void => {
    const resultado = transicionar(estado, evento);
    if (resultado.valida) {
      estado = resultado.estado;
      recorrido.push(estado);
    }
  };
  try {
    const comprobacion = await puerto.comprobarReferencia(registro.referenciaWee);
    if (comprobacion === 'concedida') avanzar('comprobada');
    else if (comprobacion === 'requiere_gesto') avanzar('requiere_gesto');
    else avanzar('no_disponible');
    return { estado, registro, motivo: comprobacion === 'concedida' ? null : comprobacion, recorrido };
  } catch (error) {
    avanzar(eventoDeFallo(error));
    return { estado, registro, motivo: codigoDe(error) ?? 'desconocido', recorrido };
  }
};

/** Permiso perdido: se vuelve a pedir con un gesto de la persona. */
export const reconcederUbicacion = async (puerto: PuertoDeUbicacion, registro: RegistroDeUbicacion): Promise<ResultadoDeUbicacion> => {
  const recorrido: EstadoDeUbicacion[] = [];
  let estado: EstadoDeUbicacion = 'permiso_perdido';
  try {
    const concedido = await puerto.pedirDeNuevo(registro.referenciaPadre);
    if (concedido) {
      const resultado = transicionar(estado, 'comprobada');
      estado = resultado.estado;
      recorrido.push(estado);
      return { estado, registro, motivo: null, recorrido };
    }
    return { estado, registro, motivo: 'permiso_denegado', recorrido };
  } catch (error) {
    const resultado = transicionar(estado, eventoDeFallo(error));
    estado = resultado.estado;
    recorrido.push(estado);
    return { estado, registro, motivo: codigoDe(error) ?? 'desconocido', recorrido };
  }
};

/* ── Disponibilidad de un proyecto ──────────────────────────────────────────── */

export type DisponibilidadDelProyecto = 'disponible' | 'no_encontrado' | 'permiso_perdido' | 'solo_en_la_nube' | 'error_recuperable';

/**
 * Un proyecto solo está «disponible» si su archivo existe y se puede abrir.
 * `archivoAbrible`: el resultado de abrir de verdad el archivo principal del proyecto.
 * `respaldoEnNube`: forma para el futuro; esta línea siempre lo pasa en false.
 */
export const disponibilidadDelProyecto = (
  estadoDeUbicacion: EstadoDeUbicacion,
  archivoAbrible: 'si' | 'no' | 'error',
  respaldoEnNube = false,
): DisponibilidadDelProyecto => {
  if (estadoDeUbicacion === 'permiso_perdido') return 'permiso_perdido';
  if (estadoDeUbicacion !== 'disponible') {
    if (respaldoEnNube) return 'solo_en_la_nube';
    return estadoDeUbicacion === 'error_recuperable' || estadoDeUbicacion === 'sin_espacio' ? 'error_recuperable' : 'no_encontrado';
  }
  if (archivoAbrible === 'si') return 'disponible';
  if (archivoAbrible === 'error') return 'error_recuperable';
  return respaldoEnNube ? 'solo_en_la_nube' : 'no_encontrado';
};
