import type { Traductor } from '../i18n/traducir';
import { formatearNumero, sistemaDeMedida } from '../i18n/formato';
import { RADIO_CERCANIA_KM } from '../data/places';

/**
 * LA DISTANCIA A UN SITIO, EN EL IDIOMA Y EN LA UNIDAD DE QUIEN MIRA.
 *
 * La misma regla que `distanciaAproximada` (`data/places.ts`) —sin fingir una precisión que no se tiene: «a menos
 * de 1», «≈ 4», «≈ 25», «a más de 60»—, dicha con su diccionario y en kilómetros o en millas según su locale. El
 * redondeo se hace en SU unidad, para que tampoco en millas aparezcan decimales inventados.
 */
export const distanciaParaLeer = (km: number, t: Traductor, locale: string): string => {
  const millas = sistemaDeMedida(locale) === 'imperial';
  const enSuUnidad = millas ? km / 1.609344 : km;
  const unidad = (n: number): string =>
    formatearNumero(n, locale, { style: 'unit', unit: millas ? 'mile' : 'kilometer', unitDisplay: 'short', maximumFractionDigits: 0 });
  if (enSuUnidad < 1) return t('composer.distanceUnder', { distancia: unidad(1) });
  if (enSuUnidad < 10) return `≈ ${unidad(Math.round(enSuUnidad))}`;
  if (km <= RADIO_CERCANIA_KM) return `≈ ${unidad(Math.round(enSuUnidad / 5) * 5)}`;
  const radio = millas ? Math.round(RADIO_CERCANIA_KM / 1.609344 / 5) * 5 : RADIO_CERCANIA_KM;
  return t('composer.distanceOver', { distancia: unidad(radio) });
};
