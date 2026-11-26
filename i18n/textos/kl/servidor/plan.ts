/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Kalaallisut, NO danés. Weë habla en 1.ª persona del singular y en futuro (-ssa-: «pilersissavakka» los crearé,
 * «allassavara» lo escribiré, «siunnersuuteqassaanga» propondré). Los pasos, que también son el título del
 * resultado, van nominalizados en -neq («… pilersitsineq», «… misissornera»). Los huecos nunca llevan sufijo:
 * van aislados tras dos puntos, raya o entre paréntesis. `comoNoSabias` usa el causativo «Qularavit» (como
 * dudabas); las `…Decision…` son cláusulas en 1.ª persona sin mayúscula ni punto. Todo «pendiente de
 * confirmación nativa».
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'Nalinginnaasoq',
  calidadAlta: 'Pitsaassuseq qaffasissoq',
  calidadMaxima: 'Pitsaassuseq qaffasinnerpaaq',
  comoNoSabias: 'Qularavit, {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
