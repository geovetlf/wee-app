/*
 * ALEMÁN SUIZO (de-CH, adaptado de `de/servidor`: ss, «…» y léxico suizo) — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`). Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Lo común a los cuatro archivos:
 *  · Weë habla en primera persona, con «du» y en presente («Ich erstelle …»). Los pasos van en infinitivo.
 *  · Un adjetivo suelto no se puede declinar dentro de un hueco, así que las frases no lo ponen delante de un
 *    sustantivo: va detrás de una etiqueta, «(Ton: {{tono}})», «(Stil: {{estilo}})», «Stimmung: {{animo}}». Así también
 *    vale lo que escriba la persona.
 *  · Lo que el hueco trae con artículo va en acusativo (ver `opciones.ts`).
 *  · `comoNoSabias` es una subordinada, así que las piezas `…Decision…` empiezan por el verbo conjugado y su sujeto:
 *    «Da du dir nicht sicher warst, wähle ich …» (segunda posición del verbo).
 *  · Comillas «…» y raya con espacios para el inciso.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Standard',
  calidadAlta: 'Hohe Qualität',
  calidadMaxima: 'Höchste Qualität',
  comoNoSabias: 'Da du dir nicht sicher warst, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
