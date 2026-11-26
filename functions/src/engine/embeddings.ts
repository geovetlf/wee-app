import { getFirestore } from 'firebase-admin/firestore';
import { env, NotConfiguredError } from './http';
import {
  BYTEPLUS_EMBEDDING_PROVIDER,
  DimensionesDeEmbedding,
  EntradaDeEmbedding,
  MODELOS_DE_EMBEDDING_BYTEPLUS,
  RolDeEmbedding,
  byteplusEmbeddingAdapter,
} from './providers/byteplusEmbedding';

/**
 * EMBEDDINGS DEL WEË AI ENGINE — la base de la memoria de los personajes con IA.
 *
 * POR QUÉ NO PASA POR EL ROUTER. El router elige proveedor y cae a otro si uno
 * falla. Con embeddings eso rompería la memoria: un vector hecho con un modelo NO
 * se puede comparar con uno hecho con otro. Aquí hay UN modelo fijado por
 * configuración, sin respaldo silencioso, y cada vector se guarda con su
 * `huella` (proveedor:modelo:dimensiones) para no mezclar nunca dos modelos.
 * Cambiar de modelo obliga a recalcular los vectores guardados.
 *
 * LA CUENTA DE BYTEPLUS. Hoy la clave ARK_API_KEY es la cuenta personal de
 * pruebas del dueño. Pasar a la de empresa NO toca el código:
 *   1. cambiar el valor del secreto ARK_API_KEY (mismo nombre, Secret Manager);
 *   2. si la empresa usa otra región, ARK_BASE_URL;
 *   3. si la empresa usa un punto de acceso, poner su `ep-…` en
 *      aiSettings/embeddings.modelo (y `admiteInstrucciones` según el modelo al
 *      que apunte);
 *   4. si cambia el MODELO (no solo la cuenta), recalcular los vectores.
 *
 * Configuración (de menos a más prioridad): valores por defecto → variables de
 * entorno (ARK_EMBEDDING_MODEL, ARK_EMBEDDING_DIMENSIONS, ARK_EMBEDDING_INSTRUCTIONS)
 * → Firestore aiSettings/embeddings. Sin clave, y solo si se permite, se usa un
 * modo simulado determinista (desarrollo y pruebas), con su propia huella.
 *
 * Esto NO cobra Credits: quien vectoriza un recuerdo es una acción del personaje,
 * y es esa acción la que se cobra en su puerta (paso 2 de docs/AUTONOMIA.md).
 */

export const MOCK_EMBEDDING_PROVIDER = 'mock-embedding';
export type ProveedorDeEmbedding = typeof BYTEPLUS_EMBEDDING_PROVIDER | typeof MOCK_EMBEDDING_PROVIDER;

export interface ConfigDeEmbeddings {
  activo: boolean;
  proveedor: ProveedorDeEmbedding;
  /** Id del modelo o del punto de acceso de empresa (`ep-…`). */
  modelo: string;
  dimensiones: DimensionesDeEmbedding;
  admiteInstrucciones: boolean;
  /** Precio oficial por millón de tokens. `null` = sin confirmar: no se inventa. */
  precioUsdPorMillonDeTokens: number | null;
  /** Si, sin clave, se puede usar el modo simulado (desarrollo y emulador). */
  permitirSimulado: boolean;
  timeoutMs: number;
}

export const MODELO_DE_EMBEDDING_POR_DEFECTO = 'skylark-embedding-vision-251215';

const admiteSegunModelo = (modelo: string): boolean => MODELOS_DE_EMBEDDING_BYTEPLUS.find((m) => m.id === modelo)?.admiteInstrucciones ?? false;
const dimensionValida = (v: unknown): DimensionesDeEmbedding | undefined => (Number(v) === 1024 || Number(v) === 2048 ? (Number(v) as DimensionesDeEmbedding) : undefined);

export function configPorDefecto(): ConfigDeEmbeddings {
  const modelo = env('ARK_EMBEDDING_MODEL') || MODELO_DE_EMBEDDING_POR_DEFECTO;
  const instr = env('ARK_EMBEDDING_INSTRUCTIONS');
  return {
    activo: true,
    proveedor: BYTEPLUS_EMBEDDING_PROVIDER,
    modelo,
    // 1024 por defecto: la mitad de almacenamiento y de búsqueda que 2048.
    dimensiones: dimensionValida(env('ARK_EMBEDDING_DIMENSIONS')) || 1024,
    admiteInstrucciones: instr === 'true' ? true : instr === 'false' ? false : admiteSegunModelo(modelo),
    precioUsdPorMillonDeTokens: null,
    permitirSimulado: true,
    timeoutMs: 30_000,
  };
}

/** Mezcla la configuración por defecto con lo guardado en Firestore, validando cada campo. */
export function mezclarConfig(base: ConfigDeEmbeddings, guardado: Record<string, unknown> | undefined): ConfigDeEmbeddings {
  if (!guardado) return base;
  const c = { ...base };
  if (typeof guardado.activo === 'boolean') c.activo = guardado.activo;
  if (guardado.proveedor === BYTEPLUS_EMBEDDING_PROVIDER || guardado.proveedor === MOCK_EMBEDDING_PROVIDER) c.proveedor = guardado.proveedor;
  if (typeof guardado.modelo === 'string' && /^[A-Za-z0-9._-]{3,80}$/.test(guardado.modelo)) {
    c.modelo = guardado.modelo;
    if (typeof guardado.admiteInstrucciones !== 'boolean') c.admiteInstrucciones = admiteSegunModelo(c.modelo);
  }
  const d = dimensionValida(guardado.dimensiones); if (d) c.dimensiones = d;
  if (typeof guardado.admiteInstrucciones === 'boolean') c.admiteInstrucciones = guardado.admiteInstrucciones;
  if (guardado.precioUsdPorMillonDeTokens === null || (typeof guardado.precioUsdPorMillonDeTokens === 'number' && guardado.precioUsdPorMillonDeTokens >= 0)) c.precioUsdPorMillonDeTokens = guardado.precioUsdPorMillonDeTokens as number | null;
  if (typeof guardado.permitirSimulado === 'boolean') c.permitirSimulado = guardado.permitirSimulado;
  if (typeof guardado.timeoutMs === 'number' && guardado.timeoutMs >= 1000 && guardado.timeoutMs <= 120_000) c.timeoutMs = guardado.timeoutMs;
  return c;
}

const CACHE_MS = 60_000;
let cache: { at: number; config: ConfigDeEmbeddings } | null = null;

export async function cargarConfigDeEmbeddings(forzar = false): Promise<ConfigDeEmbeddings> {
  if (!forzar && cache && Date.now() - cache.at < CACHE_MS) return cache.config;
  let config = configPorDefecto();
  try {
    const snap = await getFirestore().collection('aiSettings').doc('embeddings').get();
    if (snap.exists) config = mezclarConfig(config, snap.data());
  } catch (error) {
    console.warn('Embeddings: no se pudo leer aiSettings/embeddings, se usan los valores por defecto:', error);
  }
  cache = { at: Date.now(), config };
  return config;
}
export const invalidarConfigDeEmbeddings = (): void => { cache = null; };

/** La identidad de un vector. Dos vectores solo se comparan si su huella es la misma. */
export const huellaDe = (proveedor: string, modelo: string, dimensiones: number): string => `${proveedor}:${modelo}:${dimensiones}`;
export const puedenCompararse = (a: string, b: string): boolean => !!a && a === b;

// ── Utilidades de vectores ───────────────────────────────────────────────────

export function normalizar(v: number[]): number[] {
  let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n);
  return n > 0 ? v.map((x) => x / n) : v.slice();
}
export function similitudCoseno(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) throw new Error('similitudCoseno: vectores de distinta longitud');
  let p = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { p += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? p / Math.sqrt(na * nb) : 0;
}

/**
 * Modo simulado: un vector determinista a partir de las palabras (hashing de
 * rasgos con signo). No entiende el significado, pero da lo mismo para el mismo
 * texto y se parece más entre textos que comparten palabras: basta para probar
 * la memoria sin red y sin gastar. Su huella es distinta: nunca se mezcla con
 * los vectores reales.
 */
export function vectorSimulado(texto: string, dimensiones: number): number[] {
  const v = new Array<number>(dimensiones).fill(0);
  const palabras = texto.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const p of palabras) {
    let h = 2166136261; for (let i = 0; i < p.length; i++) { h ^= p.charCodeAt(i); h = Math.imul(h, 16777619); }
    const idx = (h >>> 0) % dimensiones; const signo = (h >>> 31) & 1 ? -1 : 1;
    v[idx] += signo;
  }
  return normalizar(v);
}

export interface ResultadoDeVectorizar {
  vectores: number[][];
  huella: string;
  proveedor: ProveedorDeEmbedding;
  modelo: string;
  dimensiones: DimensionesDeEmbedding;
  tokens: number;
  /** Coste del proveedor; `null` mientras el precio oficial no esté confirmado. */
  costeUsd: number | null;
  simulado: boolean;
  latenciaMs: number;
  usoDelProveedor?: Record<string, unknown>[];
}

export interface DependenciasDeVectorizar {
  config?: ConfigDeEmbeddings;
  adaptador?: Pick<typeof byteplusEmbeddingAdapter, 'embed' | 'isConfigured'>;
}

/**
 * Convierte cada entrada en un vector. `rol` dice si es lo que se GUARDA
 * ('documento') o lo que se BUSCA ('consulta'): BytePlus usa una plantilla de
 * instrucciones distinta para cada lado.
 */
export async function vectorizar(entradas: EntradaDeEmbedding[], rol: RolDeEmbedding, deps: DependenciasDeVectorizar = {}): Promise<ResultadoDeVectorizar> {
  const config = deps.config || (await cargarConfigDeEmbeddings());
  const adaptador = deps.adaptador || byteplusEmbeddingAdapter;
  if (!config.activo) throw new NotConfiguredError(BYTEPLUS_EMBEDDING_PROVIDER, 'aiSettings/embeddings.activo');
  if (!entradas.length) throw new Error('vectorizar: no hay entradas');
  const inicio = Date.now();

  const real = config.proveedor === BYTEPLUS_EMBEDDING_PROVIDER && adaptador.isConfigured();
  if (!real) {
    if (!config.permitirSimulado) throw new NotConfiguredError(BYTEPLUS_EMBEDDING_PROVIDER, 'ARK_API_KEY');
    const vectores = entradas.map((e) => vectorSimulado(String(e.texto ?? ''), config.dimensiones));
    return { vectores, huella: huellaDe(MOCK_EMBEDDING_PROVIDER, 'hash-v1', config.dimensiones), proveedor: MOCK_EMBEDDING_PROVIDER, modelo: 'hash-v1', dimensiones: config.dimensiones, tokens: 0, costeUsd: 0, simulado: true, latenciaMs: Date.now() - inicio };
  }

  const r = await adaptador.embed({ entradas, modelo: config.modelo, dimensiones: config.dimensiones, rol, admiteInstrucciones: config.admiteInstrucciones, timeoutMs: config.timeoutMs });
  const costeUsd = config.precioUsdPorMillonDeTokens === null ? null : (r.tokens / 1_000_000) * config.precioUsdPorMillonDeTokens;
  return { vectores: r.vectores.map(normalizar), huella: huellaDe(BYTEPLUS_EMBEDDING_PROVIDER, config.modelo, config.dimensiones), proveedor: BYTEPLUS_EMBEDDING_PROVIDER, modelo: config.modelo, dimensiones: config.dimensiones, tokens: r.tokens, costeUsd, simulado: false, latenciaMs: r.latenciaMs, usoDelProveedor: r.usoDelProveedor };
}
