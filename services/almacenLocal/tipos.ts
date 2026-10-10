/*
 * ALMACÉN LOCAL DE WEË (línea B1): el contrato que cumplen todos los adaptadores.
 *
 * Qué es: un almacén de archivos por clave, en el dispositivo de la persona.
 * Qué NO es: una sincronización (no hay nube aquí) ni un respaldo. Los
 * adaptadores son `memoria.ts` (solo pruebas), `almacen.ts` (nativo, con
 * expo-file-system) y `almacen.web.ts` (IndexedDB). El catálogo que los usa es
 * `utils/catalogoLocal.ts`.
 *
 * Reglas que cumple todo adaptador:
 *   · `escribir` es atómico: o queda el contenido entero o queda lo que había.
 *   · Un fallo se devuelve como `ErrorAlmacenLocal` con un código de esta lista.
 *     Nunca una cadena cruda del sistema llega a la interfaz.
 *   · Un espacio libre que no se puede medir es `null` (desconocido), nunca 0.
 *   · Las claves son rutas relativas y seguras: sin `..`, sin barras al principio.
 */

export type CodigoDeErrorAlmacen = 'sin_espacio' | 'no_encontrado' | 'corrupto' | 'no_disponible' | 'desconocido';

export class ErrorAlmacenLocal extends Error {
  readonly codigo: CodigoDeErrorAlmacen;

  constructor(codigo: CodigoDeErrorAlmacen, detalle?: string) {
    super(detalle ? `${codigo}: ${detalle}` : codigo);
    this.name = 'ErrorAlmacenLocal';
    this.codigo = codigo;
  }
}

export type PlataformaDelAlmacen = 'nativo' | 'web' | 'memoria';

/**
 * Lo que el sistema promete sobre los datos. El nativo nunca promete nada más
 * que «se borra al desinstalar»; la web depende de `navigator.storage.persisted()`.
 */
export type PersistenciaDelAlmacen = 'garantizada' | 'no_garantizada' | 'desconocida';

export interface EstadoDelAlmacen {
  plataforma: PlataformaDelAlmacen;
  /** Bytes libres en el dispositivo o en el origen. `null` cuando no se puede medir. */
  espacioLibre: number | null;
  /** Bytes que ocupan las claves del almacén (sin los temporales). */
  uso: number;
  persistencia: PersistenciaDelAlmacen;
}

export interface EntradaDelAlmacen {
  clave: string;
  tamano: number;
}

export interface AlmacenLocal {
  readonly plataforma: PlataformaDelAlmacen;
  escribir(clave: string, datos: Uint8Array): Promise<void>;
  leer(clave: string): Promise<Uint8Array>;
  existe(clave: string): Promise<boolean>;
  /** Idempotente: borrar una clave que no existe no es un error. */
  borrar(clave: string): Promise<void>;
  /** Claves que empiezan por `prefijo`, sin los temporales de escritura. */
  listar(prefijo: string): Promise<EntradaDelAlmacen[]>;
  /** Borra los restos de escrituras interrumpidas. Devuelve cuántos borró. */
  limpiarTemporales(): Promise<number>;
  estado(): Promise<EstadoDelAlmacen>;
}

/** Sufijo reservado para la escritura atómica. Ninguna clave real puede terminar así. */
export const SUFIJO_TEMPORAL = '.tmp';

export const esTemporal = (clave: string): boolean => clave.endsWith(SUFIJO_TEMPORAL);

const SEGMENTO_VALIDO = /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,119}$/;

/** Devuelve la clave si es segura; si no, lanza `desconocido` (es un error de programación, no de uso). */
export const validarClave = (clave: string): string => {
  const segmentos = clave.split('/');
  const valida =
    clave.length <= 240 &&
    segmentos.every((segmento) => SEGMENTO_VALIDO.test(segmento) && !esTemporal(segmento));
  if (!valida) throw new ErrorAlmacenLocal('desconocido', `clave no válida: ${clave}`);
  return clave;
};
