/**
 * WEE CORE — REGISTRO. La puerta.
 *
 * Contratos e implementación pura de las tres dimensiones —capacidad, modelo,
 * proveedor— y del adaptador que las une. Como todo el Core: sin Firebase, sin
 * red, sin nombres de proveedor.
 *
 * El cableado con los adaptadores reales vive FUERA, en `functions/src/registry/`,
 * porque ahí sí hace falta nombrarlos. Esa frontera es la que mantiene al Core
 * model-agnostic, y hay una prueba que la vigila.
 */

export * from './capabilities';
export * from './types';
export * from './registry';
export * from './validate';
