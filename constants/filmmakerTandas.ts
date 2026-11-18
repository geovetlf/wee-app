/**
 * TANDAS Y STORYBOARD: estados, ejemplo y banderas de la lista (ola 3, 2026-11-17). Solo datos: claves de `filmmakerTandas.*` e identificadores.
 * Lo que se lee se traduce al pintar (`t(clave)`); nada de frases aquí, porque este archivo se importa fuera de React.
 */
import type { EstadoDeTanda, EjemploDeTanda } from '../utils/tandasDeFilmmaker';
import { SIN_HABLANTE, NARRADOR } from '../utils/tandasDeFilmmaker';

export const CLAVE_DE_ESTADO: Readonly<Record<EstadoDeTanda, string>> = {
  none: 'filmmakerTandas.stateNone',
  review: 'filmmakerTandas.stateReview',
  approved: 'filmmakerTandas.stateApproved',
  producing: 'filmmakerTandas.stateProducing',
  done: 'filmmakerTandas.stateDone',
  error: 'filmmakerTandas.stateError',
};

/** El botón contextual de cada fila, según su estado. `abierta: false` = lo que hace todavía no existe (Producción, ola 4) y sale cerrado con su motivo. */
export const ACCION_DE_ESTADO: Readonly<Record<EstadoDeTanda, { clave: string; abierta: boolean; claveMotivo?: string }>> = {
  none: { clave: 'filmmakerTandas.actCreate', abierta: true },
  review: { clave: 'filmmakerTandas.actReview', abierta: true },
  approved: { clave: 'filmmakerTandas.actProduce', abierta: false, claveMotivo: 'filmmakerTandas.produceClosed' },
  producing: { clave: 'filmmakerTandas.actWatch', abierta: false, claveMotivo: 'filmmakerTandas.produceClosed' },
  done: { clave: 'filmmakerTandas.actView', abierta: false, claveMotivo: 'filmmakerTandas.produceClosed' },
  error: { clave: 'filmmakerTandas.actRetry', abierta: false, claveMotivo: 'filmmakerTandas.produceClosed' },
};

/**
 * EL EJEMPLO. Dos capítulos cortos con cuadros ya escritos para ENSEÑAR cómo queda un storyboard; se rotulan «Ejemplo», no cuentan como trabajo de la
 * persona y se quitan de un toque. No son propuesta de IA y no copian ninguna historia ajena. `claveTexto` se resuelve al cargarlos.
 */
export interface CuadroDeEjemplo { claveTexto: string; hablante: string; duracion: number; plano: string; movimiento?: string }
export const EJEMPLO_DE_TANDAS: readonly { objetivo: number; cuadros: readonly CuadroDeEjemplo[] }[] = [
  {
    objetivo: 180,
    cuadros: [
      { claveTexto: 'filmmakerTandas.exA1', hablante: NARRADOR, duracion: 6, plano: 'establishing', movimiento: 'crane_up' },
      { claveTexto: 'filmmakerTandas.exA2', hablante: SIN_HABLANTE, duracion: 4, plano: 'wide', movimiento: 'tracking' },
      { claveTexto: 'filmmakerTandas.exA3', hablante: NARRADOR, duracion: 5, plano: 'medium', movimiento: 'follow' },
      { claveTexto: 'filmmakerTandas.exA4', hablante: SIN_HABLANTE, duracion: 5, plano: 'extreme_close_up' },
      { claveTexto: 'filmmakerTandas.exA5', hablante: NARRADOR, duracion: 6, plano: 'close_up', movimiento: 'push_in' },
      { claveTexto: 'filmmakerTandas.exA6', hablante: SIN_HABLANTE, duracion: 6, plano: 'wide', movimiento: 'orbit' },
    ],
  },
  {
    objetivo: 180,
    cuadros: [
      { claveTexto: 'filmmakerTandas.exB1', hablante: SIN_HABLANTE, duracion: 5, plano: 'medium', movimiento: 'pan' },
      { claveTexto: 'filmmakerTandas.exB2', hablante: NARRADOR, duracion: 6, plano: 'close_up' },
      { claveTexto: 'filmmakerTandas.exB3', hablante: SIN_HABLANTE, duracion: 8, plano: 'establishing', movimiento: 'pull_out' },
    ],
  },
];

/** Resuelve las claves del ejemplo con el traductor activo y devuelve lo que entiende `anadirEjemplos`. */
export const ejemploTraducido = (t: (clave: string) => string): EjemploDeTanda[] =>
  EJEMPLO_DE_TANDAS.map((e) => ({
    objetivo: e.objetivo,
    cuadros: e.cuadros.map((c) => ({ texto: t(c.claveTexto), hablante: c.hablante, duracion: c.duracion, plano: c.plano, movimiento: c.movimiento })),
  }));
