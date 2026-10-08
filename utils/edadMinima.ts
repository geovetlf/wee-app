/**
 * LA EDAD MÍNIMA DE WEË (18), EN LA APP. ESPEJO de `functions/src/identity/edad.ts`.
 *
 * Metro no empaqueta `functions/`, así que la regla vive dos veces y `functions/test/edad-minima.test.mjs` exige que
 * las dos digan lo mismo en cada caso (y que las reglas de Firestore usen el mismo número). La app solo AVISA antes
 * de guardar; quien decide son las reglas (`users/{id}/private/account`). Es la ÚNICA validación de edad de Weë: después
 * del registro ninguna función la repite (el servidor solo comprueba que la cuenta está enrolada).
 *
 * Fechas de calendario, no milisegundos: entra quien cumple 18 hoy. «Hoy» es la fecha civil en UTC−12 —la zona más
 * restrictiva—, la misma que usan las reglas y el servidor, para que la app no deje pasar algo que después se rechaza.
 *
 * Puro y sin imports (CLAUDE.md §8: lo de fuera de React no traduce; quien pinta usa `onboarding.birthDateHint`).
 */
export const EDAD_MINIMA = 18;

export const DESFASE_DE_LA_ZONA_MAS_RESTRICTIVA_H = 12;

export const ANIO_MINIMO_DE_NACIMIENTO = 1900;

export type VeredictoDeEdad = 'OK' | 'AUSENTE' | 'INVALIDA' | 'FUTURA' | 'MENOR';

export interface FechaCivil { anio: number; mes: number; dia: number }

const esBisiesto = (anio: number): boolean => (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;

const diasDelMes = (anio: number, mes: number): number =>
  mes === 2 ? (esBisiesto(anio) ? 29 : 28) : [4, 6, 9, 11].includes(mes) ? 30 : 31;

export const leerFechaDeNacimiento = (valor: unknown): FechaCivil | null => {
  if (typeof valor !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (anio < ANIO_MINIMO_DE_NACIMIENTO || mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes(anio, mes)) return null;
  return { anio, mes, dia };
};

export const hoyEnLaZonaMasRestrictiva = (instante: Date | number): FechaCivil => {
  const ms = (typeof instante === 'number' ? instante : instante.getTime()) - DESFASE_DE_LA_ZONA_MAS_RESTRICTIVA_H * 3_600_000;
  const d = new Date(ms);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
};

const antesOIgual = (a: FechaCivil, b: FechaCivil): boolean =>
  a.anio < b.anio || (a.anio === b.anio && (a.mes < b.mes || (a.mes === b.mes && a.dia <= b.dia)));

export const veredictoDeEdad = (fechaDeNacimiento: unknown, instante: Date | number): VeredictoDeEdad => {
  if (fechaDeNacimiento === undefined || fechaDeNacimiento === null || fechaDeNacimiento === '') return 'AUSENTE';
  const nacimiento = leerFechaDeNacimiento(fechaDeNacimiento);
  if (!nacimiento) return 'INVALIDA';
  const hoy = hoyEnLaZonaMasRestrictiva(instante);
  if (!antesOIgual(nacimiento, hoy)) return 'FUTURA';
  const cumpleanosMinimo: FechaCivil = { ...nacimiento, anio: nacimiento.anio + EDAD_MINIMA };
  return antesOIgual(cumpleanosMinimo, hoy) ? 'OK' : 'MENOR';
};

export const cumpleEdadMinima = (fechaDeNacimiento: unknown, instante: Date | number): boolean =>
  veredictoDeEdad(fechaDeNacimiento, instante) === 'OK';

/** El código de edad mínima (espejo del servidor). Solo el registro lo usa: ninguna callable rechaza ya por edad. */
export const CODIGO_DE_EDAD_MINIMA = 'EDAD_MINIMA';
