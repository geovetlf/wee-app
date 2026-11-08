/**
 * µCREDITS: LA PRECISIÓN FRACCIONARIA DEL MISMO SALDO (autorización formal del dueño, 2026-11-07).
 *
 * No es un segundo saldo ni una cartera aparte. El saldo de una cuenta sigue siendo UNO, en el mismo documento
 * (`creditAccounts/{uid}` y su espejo por fases) y en la misma transacción:
 *
 *   creditsBalance         Credits enteros, como siempre (lo que gastan y ven las operaciones enteras)
 *   creditsFraccionMicro   la parte baja: 0 … 999.999 µCredits (solo existe si alguna vez se movió una fracción)
 *
 *   total en µCredits = creditsBalance × 1.000.000 + creditsFraccionMicro
 *
 * Por qué 1 Credit = 1.000.000 µCredits:
 *   · el importe más pequeño previsto es una traducción corta en horas valle: unos 30 µC (1 token × 150 mili-USD/M
 *     × 100 Credits/USD × 2 / 1000); con 1.000 µC por Credit se perdería por redondeo, con 10⁶ no;
 *   · el mayor importe de una operación en µC es MAX_IMPORTE_MICRO (1.000 Credits = 10⁹ µC), muy por encima de la cota
 *     de una traducción (≈ 1,4 Credits con 2.000 caracteres y 4.096 tokens de salida);
 *   · un saldo de hasta ~9·10⁹ Credits cabe en un entero seguro de JavaScript expresado en µC (2⁵³ ≈ 9·10¹⁵), y cada
 *     operación lo comprueba (`totalMicro` lanza antes de perder precisión).
 *
 * Todo entero: ni una coma flotante en la cuenta. Las operaciones enteras no tocan la fracción y, en una cuenta que nunca
 * la tuvo, ni siquiera escriben el campo: su semántica y sus documentos quedan exactamente como antes.
 */
import { CreditError } from './creditValidation';

export const MICRO_POR_CREDIT = 1_000_000;
/** Lo máximo que una sola operación en µCredits puede mover: 1.000 Credits. */
export const MAX_IMPORTE_MICRO = 1_000 * MICRO_POR_CREDIT;

/** Los servicios que cobran en µCredits. Solo la traducción (WeeTalk y Weë Travel): nada más usa esta precisión. */
export const SERVICIOS_MICRO = ['ai_translate'] as const;
export type ServicioMicro = (typeof SERVICIOS_MICRO)[number];
export const ETIQUETA_DE_SERVICIO_MICRO: Readonly<Record<ServicioMicro, string>> = Object.freeze({ ai_translate: 'Traducción' });

export const esServicioMicro = (servicio: unknown): servicio is ServicioMicro =>
  typeof servicio === 'string' && (SERVICIOS_MICRO as readonly string[]).includes(servicio);

export const assertServicioMicro = (servicio: unknown): ServicioMicro => {
  if (!esServicioMicro(servicio)) throw new CreditError('INVALID_SERVICE', `Servicio sin µCredits: ${String(servicio)}`, { service: servicio });
  return servicio;
};

/** Un importe en µCredits: entero, positivo (o cero si `permitirCero`) y como mucho MAX_IMPORTE_MICRO. */
export const assertImporteMicro = (valor: unknown, { permitirCero = false }: { permitirCero?: boolean } = {}): number => {
  const ok = typeof valor === 'number' && Number.isSafeInteger(valor) && (permitirCero ? valor >= 0 : valor > 0) && valor <= MAX_IMPORTE_MICRO;
  if (!ok) throw new CreditError('INVALID_AMOUNT', 'El importe en µCredits debe ser un entero dentro de límites', { amountMicro: valor });
  return valor as number;
};

/** La fracción guardada, o 0 si nunca hubo (cuentas históricas). Un valor fuera de 0…999.999 no se interpreta: lanza. */
export const fraccionGuardada = (valor: unknown): number => {
  if (valor === undefined || valor === null) return 0;
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 0 || valor >= MICRO_POR_CREDIT) {
    throw new Error('Fracción de saldo fuera de rango (invariante del Credit Engine)');
  }
  return valor;
};

/** Saldo entero + fracción → total en µCredits, sin perder precisión. */
export const totalMicro = (balance: number, fraccion: number): number => {
  if (!Number.isSafeInteger(balance) || balance < 0) throw new Error('Saldo entero inválido (invariante del Credit Engine)');
  const total = balance * MICRO_POR_CREDIT + fraccion;
  if (!Number.isSafeInteger(total)) throw new Error('Saldo fuera del rango representable en µCredits (invariante del Credit Engine)');
  return total;
};

/** Total en µCredits → { balance entero, fracción }. Nunca negativo. */
export const partirMicro = (total: number): { balance: number; fraccion: number } => {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Total en µCredits inválido (invariante del Credit Engine)');
  /* Sin dividir en coma flotante: el resto es exacto con enteros seguros y lo que queda es un múltiplo exacto de 10⁶. */
  const fraccion = total % MICRO_POR_CREDIT;
  return { balance: (total - fraccion) / MICRO_POR_CREDIT, fraccion };
};
