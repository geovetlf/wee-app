/*
 * HINDI — El plan que Weë AI enseña antes de crear (ver `../../es/servidor/plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Weë habla en primera persona. Un plan solo se dice bien en futuro, que en hindi concuerda: va en masculino
 * («बनाऊँगा»), como decide docs/I18N-HINDI.md § 5.3. A quien lee no se le concuerda ningún verbo: «आप» con dativo o
 * ergativo. Los pasos, que también son títulos, van en imperativo de «आप». Los huecos que traen una opción no se ponen
 * delante de una posposición cuando el hindi pediría el oblicuo («आधा घंटा में»): van detrás de dos puntos, entre
 * paréntesis o delante de un sustantivo como «स्टाइल» o «टोन», donde la etiqueta queda invariable.
 */
import { planVisual } from './plan/visual';
import { planTexto } from './plan/texto';
import { planCasa } from './plan/casa';
import { planNegocio } from './plan/negocio';

export const plan: typeof import('../../es/servidor/plan').plan = {
  calidadEstandar: 'स्टैंडर्ड',
  calidadAlta: 'हाई क्वालिटी',
  calidadMaxima: 'सबसे अच्छी क्वालिटी',
  comoNoSabias: 'आपको पक्का पता नहीं था, इसलिए {{decision}}.',
  /* Por experiencia, en cuatro archivos: Design, Studio y Photo; Writer, Music y Beauty; Chef y Home; Business, Travel y Brain. */
  ...planVisual,
  ...planTexto,
  ...planCasa,
  ...planNegocio,
};
