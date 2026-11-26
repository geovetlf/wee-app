/*
 * CHINO TRADICIONAL DE TAIWÁN — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Léxico de Taiwán, no una conversión: 影片, 貼文, 社群, 專案, 訊息, 登入, 解析度, 簡報, 履歷, 行銷. Sin plurales: `_one` y `_other` dicen lo mismo. Los huecos de texto van pegados o detrás de dos puntos, para que entre cualquier opción.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: '標準',
  calidadAlta: '高畫質',
  calidadMaxima: '最高畫質',
  comoNoSabias: '因為你還不確定，{{decision}}。',
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
