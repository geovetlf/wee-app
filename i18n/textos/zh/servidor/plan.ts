/*
 * CHINO SIMPLIFICADO — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin plurales: `_one` y `_other` dicen lo mismo. Espacio entre hanzi y latín o cifras; los huecos de texto van pegados o detrás de dos puntos, para que entre cualquier opción.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: '标准',
  calidadAlta: '高画质',
  calidadMaxima: '最高画质',
  comoNoSabias: '因为你还不确定，{{decision}}。',
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
