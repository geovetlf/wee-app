/*
 * FINÉS — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 *
 * Los huecos que llenan las opciones llegan en nominativo y el finés necesitaría declinarlos: por eso entran detrás de
 * dos puntos o entre paréntesis («tyyli: {{estilo}}», «tilan ({{espacio}})»). Los pasos también son títulos y van en
 * forma nominal («Konseptin määrittäminen»), que además funciona detrás de `progreso.paso`.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Vakiolaatu',
  calidadAlta: 'Korkea laatu',
  calidadMaxima: 'Paras laatu',
  comoNoSabias: 'Koska et ollut varma, {{decision}}.',
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
