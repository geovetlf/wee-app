import { CapacidadDeProceso, LIMITES_DE_TRANSFORMACION } from '../../core/media/proceso';
import { falloDeProceso, MotivoDeProcesador } from '../../core/media/procesador';
import type { WeeError } from '../../core/errors';

/**
 * CONTRATO DE TRANSCODIFICACIÓN DE VÍDEO Y AUDIO: LA COSTURA, SIN DEPENDENCIA.
 *
 * Weë no tiene procesador de vídeo ni de audio. Para derivarlos hace falta una herramienta
 * (ffmpeg, o un servicio gestionado) que esta línea NO instala: la dependencia está
 * identificada y espera autorización (docs/MEDIOS-OPTIMIZADOR.md, §5).
 *
 * Este fichero fija la FORMA que tendrá esa integración, para que el día que se autorice
 * baste escribir un adaptador y no tocar nada más:
 *
 *   · un puerto con la misma forma que el procesador de imagen (`capacidades` + `transcodificar`);
 *   · una validación previa que falla cerrada, antes de que el adaptador vea nada;
 *   · una comprobación del resultado, para que un adaptador defectuoso no devuelva bytes que no cuadran;
 *   · el adaptador que existe hoy (`crearTranscodificacionNoDisponible`): no declara nada;
 *   · un adaptador falso (`crearAdaptadorFalsoDeTranscodificacion`), solo para las pruebas.
 *
 * Nada de aquí llama a ninguna herramienta externa, abre ficheros ni cobra. No añade
 * ninguna dependencia, y no es un motor de trabajos: un trabajo de medios sigue yendo por
 * el Job Engine y el ejecutor de medios que ya existen.
 */

export type TipoDeTranscodificacion = 'video' | 'audio';
export type ObjetivoDeTranscodificacion = 'preview' | 'variant';

/** Los MIME de origen que se admiten por tipo. Un origen fuera de esta lista no se toca. */
export const ORIGENES_DE_TRANSCODIFICACION: Readonly<Record<TipoDeTranscodificacion, readonly string[]>> = Object.freeze({
  video: Object.freeze(['video/mp4', 'video/quicktime', 'video/webm']),
  audio: Object.freeze(['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm']),
});

/** Los contenedores de salida que el contrato admite. El códec concreto lo decide el adaptador. */
export const SALIDAS_DE_TRANSCODIFICACION: readonly string[] = Object.freeze(['video/webm', 'audio/webm', 'audio/mp4']);

export const LIMITES_DE_TRANSCODIFICACION = Object.freeze({
  /** El mismo tope de origen que el contrato de imagen. PROVISIONAL para vídeo. */
  maxBytesDeOrigen: LIMITES_DE_TRANSFORMACION.maxBytesDeOrigen,
  /** Duración máxima del origen admitida. PROVISIONAL: los Weëls duran como mucho 15 s, y el resto de vídeos necesita decisión. */
  maxDuracionOrigenSegundos: 3600,
});

/** La capacidad que el Core ya declara para cada combinación. Son nombres del registro, no inventados aquí. */
const CAPACIDAD: Readonly<Record<TipoDeTranscodificacion, Readonly<Record<ObjetivoDeTranscodificacion, CapacidadDeProceso>>>> = Object.freeze({
  video: Object.freeze({ preview: 'video.preview', variant: 'video.variant' }),
  audio: Object.freeze({ preview: 'audio.preview', variant: 'audio.variant' }),
});

export const capacidadDeTranscodificacion = (tipo: TipoDeTranscodificacion, objetivo: ObjetivoDeTranscodificacion): CapacidadDeProceso =>
  CAPACIDAD[tipo][objetivo];

export interface PeticionDeTranscodificacion {
  tipo: TipoDeTranscodificacion;
  objetivo: ObjetivoDeTranscodificacion;
  cuerpo: Buffer;
  /** Lo que dice el almacén que es el origen. Dato, no promesa. */
  contentType: string;
  /** La duración del origen, medida por quien lo subió. */
  duracionSegundos: number;
  /** El MIME de salida, de `SALIDAS_DE_TRANSCODIFICACION`. */
  salida: string;
}

export interface MaterialTranscodificado {
  cuerpo: Buffer;
  contentType: string;
  bytes: number;
  duracionSegundos: number;
}

export type DesenlaceDeTranscodificacion =
  | { ok: true; resultado: MaterialTranscodificado }
  | { ok: false; error: WeeError };

/** Lo que implementa un adaptador. La forma es la del procesador de imagen. */
export interface PuertoDeTranscodificacion {
  readonly identificador: string;
  /** Lo que el adaptador sabe hacer de verdad. Lo que no esté aquí no se pide. */
  readonly capacidades: readonly CapacidadDeProceso[];
  transcodificar(peticion: PeticionDeTranscodificacion): Promise<DesenlaceDeTranscodificacion>;
}

const esEnteroEntre = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;

/**
 * La petición tiene la forma que el contrato admite. Cualquier duda cuenta como inválida,
 * y se rechaza antes de que el adaptador vea los bytes.
 */
export const peticionDeTranscodificacionValida = (p: unknown): p is PeticionDeTranscodificacion => {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  if (o.tipo !== 'video' && o.tipo !== 'audio') return false;
  if (o.objetivo !== 'preview' && o.objetivo !== 'variant') return false;
  if (!Buffer.isBuffer(o.cuerpo) || o.cuerpo.length === 0 || o.cuerpo.length > LIMITES_DE_TRANSCODIFICACION.maxBytesDeOrigen) return false;
  if (typeof o.contentType !== 'string' || !ORIGENES_DE_TRANSCODIFICACION[o.tipo].includes(o.contentType)) return false;
  if (!esEnteroEntre(o.duracionSegundos, 1, LIMITES_DE_TRANSCODIFICACION.maxDuracionOrigenSegundos)) return false;
  return typeof o.salida === 'string' && SALIDAS_DE_TRANSCODIFICACION.includes(o.salida);
};

/** El resultado tiene la forma que el contrato promete. Un adaptador que no la cumple falla cerrado. */
const resultadoValido = (r: unknown, salidaPedida: string): r is MaterialTranscodificado => {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  return Buffer.isBuffer(o.cuerpo) && o.cuerpo.length > 0
    && o.bytes === o.cuerpo.length
    && o.contentType === salidaPedida
    && typeof o.duracionSegundos === 'number' && Number.isFinite(o.duracionSegundos) && o.duracionSegundos > 0;
};

/**
 * PEDIR UNA TRANSCODIFICACIÓN A UN PUERTO, CON EL CONTRATO DE POR MEDIO.
 *
 * Valida la petición, comprueba que el puerto declara la capacidad, llama al adaptador y
 * valida lo que devuelve. Cualquier fallo sale como error tipado; nunca hay resultado parcial.
 */
export const transcodificarConContrato = async (
  puerto: PuertoDeTranscodificacion,
  peticion: unknown,
): Promise<DesenlaceDeTranscodificacion> => {
  const id = puerto.identificador;
  if (!peticionDeTranscodificacionValida(peticion)) {
    return { ok: false, error: falloDeProceso(id, 'peticion_invalida', { field: 'peticion' }) };
  }
  if (!puerto.capacidades.includes(capacidadDeTranscodificacion(peticion.tipo, peticion.objetivo))) {
    return { ok: false, error: falloDeProceso(id, 'sin_capacidad', { field: 'capacidad' }) };
  }
  const desenlace = await puerto.transcodificar(peticion);
  if (!desenlace.ok) return desenlace;
  if (!resultadoValido(desenlace.resultado, peticion.salida)) {
    return { ok: false, error: falloDeProceso(id, 'proceso_fallido', { field: 'resultado' }) };
  }
  return desenlace;
};

/**
 * El adaptador que existe hoy: no hay herramienta autorizada, así que no declara ninguna
 * capacidad y cualquier llamada directa responde «no disponible». No es un adaptador de mentira:
 * es la forma honesta de decir que esto todavía no hace nada.
 */
export const crearTranscodificacionNoDisponible = (): PuertoDeTranscodificacion => {
  const identificador = 'transcodificacion-no-configurada';
  return {
    identificador,
    capacidades: Object.freeze([]),
    async transcodificar(): Promise<DesenlaceDeTranscodificacion> {
      return { ok: false, error: falloDeProceso(identificador, 'no_disponible') };
    },
  };
};

export interface OpcionesDelAdaptadorFalso {
  /** Las capacidades que el falso declara. Por defecto, ninguna. */
  capacidades?: readonly CapacidadDeProceso[];
  /** Si se da, el falso falla con este motivo en lugar de transformar. */
  fallo?: MotivoDeProcesador;
}

/**
 * Un adaptador falso, SOLO para las pruebas. Devuelve el mismo cuerpo con el MIME de salida
 * pedido, y guarda cada petición que recibe para que la prueba pueda comprobarla.
 */
export const crearAdaptadorFalsoDeTranscodificacion = (opciones: OpcionesDelAdaptadorFalso = {}) => {
  const peticiones: PeticionDeTranscodificacion[] = [];
  const identificador = 'transcodificacion-falsa';
  const puerto: PuertoDeTranscodificacion = {
    identificador,
    capacidades: Object.freeze([...(opciones.capacidades ?? [])]),
    async transcodificar(peticion: PeticionDeTranscodificacion): Promise<DesenlaceDeTranscodificacion> {
      peticiones.push(peticion);
      if (opciones.fallo) return { ok: false, error: falloDeProceso(identificador, opciones.fallo) };
      return {
        ok: true,
        resultado: {
          cuerpo: Buffer.from(peticion.cuerpo),
          contentType: peticion.salida,
          bytes: peticion.cuerpo.length,
          duracionSegundos: peticion.duracionSegundos,
        },
      };
    },
  };
  return { puerto, peticiones };
};
