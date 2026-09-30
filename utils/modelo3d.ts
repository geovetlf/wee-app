/**
 * 3D DENTRO DE FILMMAKER · UN MODELO GLB, COMPROBADO ANTES DE SUBIRLO.
 *
 * Puro: sin red, sin Firebase y sin la pantalla. Lee la cabecera de un GLB
 * (glTF 2.0 binario) tal como la describe la especificación de Khronos —12 bytes
 * de cabecera y el primer trozo, que es el JSON— y dice si el archivo tiene
 * forma de modelo antes de gastar una subida en él.
 *
 * Esto es COMODIDAD, no seguridad: quien quiera mandar otra cosa puede saltarse la
 * app. Lo que el servidor sí exige lo exige él: el tipo va firmado en la subida y
 * el tamaño se mide en el almacén al confirmar (MC-3).
 *
 *     0   uint32  magic   0x46546C67  («glTF»)
 *     4   uint32  version 2
 *     8   uint32  length  el tamaño del archivo entero
 *     12  uint32  el largo del primer trozo (múltiplo de 4)
 *     16  uint32  su tipo 0x4E4F534A  («JSON»)
 */

/** Lo que hay que leer del principio del archivo para decidir. */
export const BYTES_DE_CABECERA_GLB = 20;

/** El JSON de un modelo razonable ocupa kilobytes; más de esto no se abre en la app solo para contar piezas. */
export const MAX_JSON_PARA_CONTAR = 8 * 1024 * 1024;

const MAGIA_GLTF = 0x46546c67;
const TROZO_JSON = 0x4e4f534a;

export type FalloDeModelo = 'vacio' | 'no_es_glb' | 'version' | 'incompleto';

/**
 * Por qué no se importó un modelo. Los del ARCHIVO se arreglan eligiendo otro; los de la SUBIDA, reintentando con el
 * mismo (la misma clave: no se duplica nada); `cerrada` no se arregla desde la app.
 */
export type FalloDeImportacion =
  | FalloDeModelo | 'demasiado_grande'
  | 'cerrada' | 'no_disponible' | 'subida_cortada' | 'sigue_llegando' | 'sin_respuesta';

const FALLOS_DEL_ARCHIVO: ReadonlySet<FalloDeImportacion> = new Set<FalloDeImportacion>(['vacio', 'no_es_glb', 'version', 'incompleto', 'demasiado_grande']);

export const esFalloDelArchivo = (f: FalloDeImportacion): boolean => FALLOS_DEL_ARCHIVO.has(f);

export type CabeceraDeModelo =
  | { readonly ok: true; readonly bytesDelJson: number }
  | { readonly ok: false; readonly motivo: FalloDeModelo };

/**
 * ¿TIENE FORMA DE GLB?
 *
 * `cabecera` son los primeros bytes del archivo (con 20 basta) y `tamano`, lo que
 * pesa entero. Un largo declarado que no coincide con el archivo es un archivo
 * cortado o con algo pegado detrás: no se sube.
 */
export const leerCabeceraDeModelo = (cabecera: Uint8Array, tamano: number): CabeceraDeModelo => {
  if (!Number.isSafeInteger(tamano) || tamano <= 0) return { ok: false, motivo: 'vacio' };
  const vista = new DataView(cabecera.buffer, cabecera.byteOffset, cabecera.byteLength);
  if (cabecera.length < 4 || vista.getUint32(0, true) !== MAGIA_GLTF) return { ok: false, motivo: 'no_es_glb' };
  if (cabecera.length < 12 || tamano < BYTES_DE_CABECERA_GLB) return { ok: false, motivo: 'incompleto' };
  if (vista.getUint32(4, true) !== 2) return { ok: false, motivo: 'version' };
  if (vista.getUint32(8, true) !== tamano) return { ok: false, motivo: 'incompleto' };
  if (cabecera.length < BYTES_DE_CABECERA_GLB) return { ok: false, motivo: 'incompleto' };
  const bytesDelJson = vista.getUint32(12, true);
  if (vista.getUint32(16, true) !== TROZO_JSON) return { ok: false, motivo: 'no_es_glb' };
  if (bytesDelJson === 0 || bytesDelJson % 4 !== 0 || BYTES_DE_CABECERA_GLB + bytesDelJson > tamano) {
    return { ok: false, motivo: 'incompleto' };
  }
  return { ok: true, bytesDelJson };
};

/** Cuántas piezas tiene el modelo: para enseñarlo y para anotarlo en su material. */
export interface PiezasDelModelo {
  readonly mallas?: number;
  readonly materiales?: number;
  readonly animaciones?: number;
  readonly nodos?: number;
}

export type JsonDelModelo =
  | { readonly ok: true; readonly piezas: PiezasDelModelo }
  | { readonly ok: false; readonly motivo: 'version' | 'incompleto' };

/**
 * EL JSON DEL MODELO: que sea glTF 2.0 y cuántas piezas trae.
 *
 * `texto` es el primer trozo del GLB ya decodificado. Si no es JSON, el archivo
 * está dañado; si su `asset.version` no es 2.x, es de otra versión de glTF.
 */
export const leerJsonDelModelo = (texto: string): JsonDelModelo => {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { ok: false, motivo: 'incompleto' };
  }
  if (typeof json !== 'object' || json === null) return { ok: false, motivo: 'incompleto' };
  const d = json as Record<string, unknown>;
  const version = (d.asset as Record<string, unknown> | undefined)?.version;
  if (typeof version !== 'string' || !/^2\.\d+$/.test(version)) return { ok: false, motivo: 'version' };
  const cuantos = (v: unknown): number | undefined => (Array.isArray(v) ? v.length : undefined);
  const piezas: Record<string, number> = {};
  const pares: readonly [keyof PiezasDelModelo, unknown][] = [
    ['mallas', d.meshes], ['materiales', d.materials], ['animaciones', d.animations], ['nodos', d.nodes],
  ];
  for (const [campo, valor] of pares) {
    const n = cuantos(valor);
    if (n !== undefined) piezas[campo] = n;
  }
  return { ok: true, piezas };
};

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * LA CLAVE DE UNA IMPORTACIÓN: una por archivo elegido.
 *
 * Es la clave de idempotencia de la subida: reintentar con la MISMA clave pide el
 * MISMO material y el MISMO destino, así que un corte a mitad no deja dos modelos.
 * La forma es la que admite la puerta (`FORMA_DE_CLAVE_DE_IMPORTACION`).
 */
export const nuevaClaveDeImportacion = (): string => {
  const bytes = new Uint8Array(24);
  const cripto = (globalThis as { crypto?: { getRandomValues?: (b: Uint8Array) => Uint8Array } }).crypto;
  if (cripto?.getRandomValues) cripto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  let salida = 'imp_';
  for (const b of bytes) salida += ALFABETO[b % ALFABETO.length];
  return salida;
};
