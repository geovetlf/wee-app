/*
 * ISLANDÉS (is · is-IS) — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Weë habla en primera persona y en presente («Ég bý til …»); los pasos van en infinitivo sin «að» («Skrifa
 * handritið»), porque son también el título del resultado. Tras la subordinada de `comoNoSabias` el islandés invierte
 * verbo y sujeto (V2), así que todas las piezas `…Decision…` empiezan por el verbo conjugado: «vel ég …», «byrja ég á …».
 * Lo que la persona eligió entra siempre en posición de nominativo (tras dos puntos o entre paréntesis), porque una
 * opción no puede cambiar de caso (ver la cabecera de `./opciones.ts`).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Venjuleg gæði',
  calidadAlta: 'Mikil gæði',
  calidadMaxima: 'Hámarksgæði',
  comoNoSabias: 'Þar sem þú varst ekki viss, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
