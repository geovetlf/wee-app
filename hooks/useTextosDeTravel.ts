import { useMemo } from 'react';
import { useIdioma } from '../contexts/IdiomaContext';
import { nombreDeLaRegion } from '../i18n/formato';
import { ActividadDemo, DestinoDemo, ViajeDemo, destinoPorId } from '../constants/travelDemo';
import { fechaDeIso } from '../utils/travelItinerario';

/*
 * WEËTRAVEL — DE LOS DATOS DEMO A LO QUE SE LEE.
 *
 * El catálogo guarda claves, números y códigos; aquí se resuelven con el idioma activo: nombres por `t()`, países por
 * `Intl.DisplayNames`, y horas, fechas, dinero y distancias por i18n/formato.ts. Nunca `toLocaleString` a mano.
 */
export const useTextosDeTravel = () => {
  const { t, locale, formato } = useIdioma();
  return useMemo(() => {
    const nombreDestino = (d: DestinoDemo | undefined) => (d ? t(d.nombre) : '');
    const pais = (codigo: string) => nombreDeLaRegion(codigo, locale);
    const hora = (minutos: number) => formato.hora(new Date(2000, 0, 1, Math.floor(minutos / 60) % 24, minutos % 60));
    const duracion = (minutos: number) => {
      const h = Math.floor(minutos / 60);
      const m = minutos % 60;
      if (!h) return t('travel.minutes', { contador: m });
      if (!m) return t('travel.hours', { contador: h });
      return t('travel.hoursMinutes', { h: formato.numero(h), m: formato.numero(m) });
    };
    const dinero = (valor: number, moneda: string) => formato.moneda(valor, moneda, { maximumFractionDigits: 0 });
    const fecha = (iso: string, masDias = 0, opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => formato.fecha(fechaDeIso(iso, masDias), opciones);
    const nombreDeViaje = (v: ViajeDemo) => formato.lista(v.destinos.map((id) => nombreDestino(destinoPorId(id))), 'conjunction');
    const fechasDeViaje = (v: ViajeDemo) => (v.inicio ? t('travel.dateRange', { desde: fecha(v.inicio), hasta: fecha(v.inicio, v.dias - 1) }) : t('travel.flexibleDates'));
    const actividad = (a: ActividadDemo) => a.texto ?? (a.clave ? t(a.clave) : '');
    const mes = (n: number) => formato.fecha(new Date(2024, n - 1, 15), { month: 'long' });
    const meses = (lista: number[]) => formato.lista(lista.map(mes), 'conjunction');
    const distancia = (metros: number) => formato.distancia(metros);
    const temperatura = (grados: number) => formato.numero(grados, { style: 'unit', unit: 'celsius', maximumFractionDigits: 0 });
    return { t, locale, formato, nombreDestino, pais, hora, duracion, dinero, fecha, nombreDeViaje, fechasDeViaje, actividad, mes, meses, distancia, temperatura };
  }, [t, locale, formato]);
};
