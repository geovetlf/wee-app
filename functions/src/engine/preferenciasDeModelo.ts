import type { CapacidadesDeModelo } from '../core/model-capability';
import { CAPACIDADES_DE_VIDEO } from './capacidadesDeVideo';

/**
 * LO QUE LA PERSONA ELIGE DEL MODELO (panel de especificaciones de Filmmaker), VALIDADO CONTRA LAS CAPACIDADES.
 *
 *   preferredModel  un id del catálogo (`CapacidadesDeModelo.modeloId`). Desconocido, o NO integrado (`NOT_CONFIGURED`), se rechaza.
 *   variants        1 a 4 según el modelo (`variantes.max`).
 *   seed            entero 0…4294967295, solo en modelos que lo soportan (`semilla: 'si'`).
 *
 * Todo es opcional: sin nada elegido no hay nada que validar y el comportamiento es el de siempre. Pura: no lee Firestore, no
 * cobra, no llama a ningún proveedor, y no abre ninguna puerta ni canary.
 */

export const CODIGOS_DE_PREFERENCIA = Object.freeze([
  'model_unknown', 'model_not_integrated', 'variants_invalid', 'variants_above_max', 'seed_invalid', 'seed_not_supported',
] as const);
export type CodigoDePreferencia = typeof CODIGOS_DE_PREFERENCIA[number];

export const MAX_DE_VARIANTES = 4;
export const MAX_DE_SEMILLA = 4294967295;

export interface PreferenciasDeModelo {
  readonly preferredModel?: unknown;
  readonly variants?: unknown;
  readonly seed?: unknown;
}

export type ResultadoDePreferencias =
  | { readonly ok: true; readonly modelo?: CapacidadesDeModelo }
  | { readonly ok: false; readonly codigo: CodigoDePreferencia; readonly campo: 'preferredModel' | 'variants' | 'seed'; readonly parametros: Readonly<Record<string, string | number>> };

const no = (codigo: CodigoDePreferencia, campo: 'preferredModel' | 'variants' | 'seed', parametros: Record<string, string | number> = {}): ResultadoDePreferencias =>
  ({ ok: false, codigo, campo, parametros });

export const validarPreferenciasDeModelo = (p: PreferenciasDeModelo, catalogo: readonly CapacidadesDeModelo[] = CAPACIDADES_DE_VIDEO): ResultadoDePreferencias => {
  let modelo: CapacidadesDeModelo | undefined;
  if (p.preferredModel !== undefined) {
    modelo = typeof p.preferredModel === 'string' ? catalogo.find((c) => c.modeloId === p.preferredModel) : undefined;
    if (!modelo) return no('model_unknown', 'preferredModel');
    if (modelo.estado === 'NOT_CONFIGURED') return no('model_not_integrated', 'preferredModel', { model: modelo.modeloId });
  }
  if (p.variants !== undefined) {
    if (typeof p.variants !== 'number' || !Number.isInteger(p.variants) || p.variants < 1 || p.variants > MAX_DE_VARIANTES) {
      return no('variants_invalid', 'variants', { min: 1, max: MAX_DE_VARIANTES });
    }
    const tope = modelo ? modelo.variantes.max : MAX_DE_VARIANTES;
    if (p.variants > tope) return no('variants_above_max', 'variants', { max: tope });
  }
  if (p.seed !== undefined) {
    if (typeof p.seed !== 'number' || !Number.isInteger(p.seed) || p.seed < 0 || p.seed > MAX_DE_SEMILLA) return no('seed_invalid', 'seed', { max: MAX_DE_SEMILLA });
    if (modelo && modelo.semilla !== 'si') return no('seed_not_supported', 'seed', { model: modelo.modeloId });
  }
  return modelo ? { ok: true, modelo } : { ok: true };
};

/**
 * LAS OPCIONES QUE UN MODELO SOPORTA, en una forma que la app pinta tal cual (duraciones, formatos, resoluciones, audio,
 * semilla, variantes). Sin proveedor ni fuentes. `soportes` repite el `Soporte` del contrato: `si`, `no`, `no_implementado`
 * o `no_verificado`; solo `si` es un control abierto.
 */
export const opcionesDeModelo = (c: Omit<CapacidadesDeModelo, 'proveedor' | 'fuentes'>) => ({
  duraciones: { minSec: c.duracion.minSec, maxSec: c.duracion.maxSec, automatica: c.duracion.automatica },
  formatos: c.proporciones,
  resoluciones: c.resoluciones,
  audio: c.audioNativo,
  semilla: c.semilla,
  variantes: { max: c.variantes.max },
});
