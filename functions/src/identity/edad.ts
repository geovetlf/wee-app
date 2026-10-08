/**
 * LA EDAD MÍNIMA DE WEË: 18 AÑOS. Una sola regla, en un solo sitio del servidor.
 *
 * ── Qué hay aquí ────────────────────────────────────────────────────────────
 *
 *   EDAD_MINIMA            el número. El mismo que usan la app (`utils/edadMinima.ts`, su ESPEJO: Metro no puede
 *                          empaquetar `functions/`) y las reglas de Firestore (`fechaDeNacimientoAdulta`). Lo vigila
 *                          `functions/test/edad-minima.test.mjs`: si uno cambia y los otros no, se rompe.
 *   veredictoDeEdad        la decisión, PURA: una fecha de nacimiento y un instante → OK, AUSENTE, INVALIDA,
 *                          FUTURA o MENOR. Sin base de datos ni reloj propio, para probarla con una tabla de casos.
 *
 * ── Dónde se valida la edad: SOLO en el enrolamiento (decisión del dueño, 2026-10-07) ──────────────────────
 *
 * La edad se decide UNA vez, en el registro: la app avisa (`utils/edadMinima.ts`) y las reglas de Firestore DECIDEN
 * (`users/{id}/private/account` solo nace con una fecha de 18+ y después no se cambia ni se borra). Ninguna callable
 * la calcula por su cuenta: las que generan o cobran exigen «cuenta Weë válida» (`identity/sesion.ts`,
 * `exigirCuentaWeeValida`), y esa única condición VALIDA el valor guardado con `veredictoDeEdad` de este módulo
 * (corrección F, 2026-10-07: los documentos anteriores a la regla pueden traer una fecha de menor, inválida o futura).
 * Uso productivo: `identity/sesion.ts` (`enrolamiento.leer`) y `scripts/auditoria-edades.mjs` (auditoría de solo lectura).
 *
 * ── Fechas de calendario, no milisegundos ──────────────────────────────────
 *
 * «Tener 18» es haber llegado al cumpleaños número 18, que es una FECHA. Restar milisegundos (365,25 días por año)
 * se equivoca justo en los días que importan. Así que se comparan fechas civiles: (año+18, mes, día) contra la fecha
 * de hoy. Quien cumple 18 HOY entra. Quien nació un 29 de febrero cumple, en un año no bisiesto, el 1 de marzo
 * (su 28 de febrero todavía no es el 29).
 *
 * ── Qué «hoy»: la zona horaria más restrictiva (UTC−12, «Anywhere on Earth») ─
 *
 * La fecha de nacimiento es una fecha sin hora ni zona; «hoy» depende de dónde esté cada uno. Se toma como «hoy» la
 * fecha civil en UTC−12, la última zona del planeta en cambiar de día. Con esa referencia NADIE entra antes de que
 * sea su cumpleaños en su propia zona, esté donde esté: el error posible es solo de prudencia (en UTC+14 se puede
 * esperar hasta 26 horas desde la medianoche local), nunca dejar entrar a alguien de 17. Es además lo único que las
 * reglas de Firestore pueden calcular igual que el servidor —solo conocen `request.time`, en UTC—, así que app,
 * reglas y servidor dan el mismo veredicto en el mismo instante.
 *
 * ── Lo que esta fecha NO es ─────────────────────────────────────────────────
 *
 * Es DECLARADA: la escribe la persona en el registro y Weë no la verifica contra ningún documento. Lo que sí se
 * garantiza aquí: que exista, que sea una fecha real, que dé 18+ y que no se pueda cambiar después para pasar el
 * requisito (eso lo cierran las reglas: una vez guardada, la fecha no se mueve desde el cliente).
 */

/** Los años que hay que haber cumplido para usar Weë. */
export const EDAD_MINIMA = 18;

/** Horas que se restan al instante UTC para obtener la fecha civil de la zona más restrictiva (UTC−12). */
export const DESFASE_DE_LA_ZONA_MAS_RESTRICTIVA_H = 12;

/** Nadie con una fecha de nacimiento anterior a esta (la app ofrece los últimos 120 años). */
export const ANIO_MINIMO_DE_NACIMIENTO = 1900;

export type VeredictoDeEdad = 'OK' | 'AUSENTE' | 'INVALIDA' | 'FUTURA' | 'MENOR';

export interface FechaCivil { anio: number; mes: number; dia: number }

const esBisiesto = (anio: number): boolean => (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;

const diasDelMes = (anio: number, mes: number): number =>
  mes === 2 ? (esBisiesto(anio) ? 29 : 28) : [4, 6, 9, 11].includes(mes) ? 30 : 31;

/** `AAAA-MM-DD` → fecha civil, o null si no es exactamente eso o no existe en el calendario (31 de abril, 29-02 de un año no bisiesto). */
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

/** La fecha civil de «hoy» en la zona más restrictiva (UTC−12) para un instante dado. */
export const hoyEnLaZonaMasRestrictiva = (instante: Date | number): FechaCivil => {
  const ms = (typeof instante === 'number' ? instante : instante.getTime()) - DESFASE_DE_LA_ZONA_MAS_RESTRICTIVA_H * 3_600_000;
  const d = new Date(ms);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
};

const antesOIgual = (a: FechaCivil, b: FechaCivil): boolean =>
  a.anio < b.anio || (a.anio === b.anio && (a.mes < b.mes || (a.mes === b.mes && a.dia <= b.dia)));

/**
 * LA DECISIÓN, PURA. ¿Esta fecha de nacimiento da {@link EDAD_MINIMA} años o más en `instante`?
 * Ausente, mal escrita, inexistente o futura → no. Todo lo que no sea un OK claro es un rechazo.
 */
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

/** El código que la app usa para el aviso de edad mínima del registro (`utils/edadMinima.ts`). */
export const CODIGO_DE_EDAD_MINIMA = 'EDAD_MINIMA';
