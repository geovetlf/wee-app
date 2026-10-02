import { partesDelLocale } from './resolver';

/*
 * LOS FORMATOS REGIONALES. Todo sale de `Intl`, nada de `if (pais === 'US')`.
 *
 * Aquí no se traduce nada: se PRESENTA. Un número, una fecha o una cantidad de
 * dinero se escriben distinto en Lima, en Madrid y en Berlín aunque el texto de
 * alrededor esté en el mismo idioma, y eso lo decide el LOCALE, no el idioma.
 *
 * POR QUÉ `Intl` Y NO TABLAS PROPIAS: porque las reglas ya están escritas, son
 * las oficiales de CLDR, vienen dentro del motor —Hermes las trae, y la app ya
 * las usa hoy en los Credits con `toLocaleString`— y no cuestan ni un byte de
 * descarga ni una llamada a nadie.
 *
 * LOS FORMATEADORES SE GUARDAN. Construir un `Intl.NumberFormat` es caro y el
 * muro pinta cientos de números al desplazarse; hacerlo una vez por
 * combinación de locale y opciones es la diferencia entre fluido y a tirones.
 *
 * Y TODO SE DEGRADA. `RelativeTimeFormat`, `ListFormat` y `DisplayNames` no
 * están en todos los motores; si falta alguno se devuelve algo razonable en vez
 * de reventar la pantalla.
 */

const guardados = new Map<string, unknown>();

const recordar = <T>(clave: string, construir: () => T): T | null => {
  if (guardados.has(clave)) return guardados.get(clave) as T | null;
  let hecho: T | null = null;
  try {
    hecho = construir();
  } catch {
    /* El motor no trae esta parte de Intl. Se anota para no reintentarlo. */
    hecho = null;
  }
  guardados.set(clave, hecho);
  return hecho;
};

/* ── Números ────────────────────────────────────────────────────────────── */

export const formatearNumero = (
  valor: number,
  locale: string,
  opciones: Intl.NumberFormatOptions = {},
): string => {
  const f = recordar(`n|${locale}|${JSON.stringify(opciones)}`,
    () => new Intl.NumberFormat(locale, opciones));
  return f ? f.format(valor) : String(valor);
};

/**
 * Dinero.
 *
 * Ojo con lo que ESTO NO HACE: no convierte, no elige moneda y no cambia
 * precios. La moneda de una operación la decide el negocio y llega como
 * parámetro; el locale solo dice cómo se escribe. Alguien con la interfaz en
 * inglés puede estar pagando en soles, y entonces se escribe en soles.
 */
export const formatearMoneda = (
  valor: number,
  locale: string,
  moneda: string,
  opciones: Intl.NumberFormatOptions = {},
): string => formatearNumero(valor, locale, { style: 'currency', currency: moneda, ...opciones });

export const formatearPorcentaje = (
  valor: number,
  locale: string,
  opciones: Intl.NumberFormatOptions = {},
): string => formatearNumero(valor, locale, { style: 'percent', ...opciones });

/* ── Fechas y horas ─────────────────────────────────────────────────────── */

export const formatearFecha = (
  fecha: Date | number,
  locale: string,
  opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
): string => {
  const f = recordar(`d|${locale}|${JSON.stringify(opciones)}`,
    () => new Intl.DateTimeFormat(locale, opciones));
  const d = typeof fecha === 'number' ? new Date(fecha) : fecha;
  if (!f) return d.toISOString().slice(0, 10);
  return f.format(d);
};

export const formatearHora = (
  fecha: Date | number,
  locale: string,
  opciones: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' },
): string => formatearFecha(fecha, locale, opciones);

export type ParteDeFecha = 'day' | 'month' | 'year';
const ORDEN_DE_SIEMPRE: ParteDeFecha[] = ['day', 'month', 'year'];

/*
 * En qué orden se piden el día, el mes y el año cuando se eligen por separado:
 * 31/12 en Lima, 12/31 en Nueva York, 年・月・日 en Tokio. Lo dice Intl
 * partiendo una fecha ya escrita; si el motor no sabe partirla, el de siempre.
 */
export const ordenDeLaFecha = (locale: string): ParteDeFecha[] => {
  const f = recordar(`d|${locale}|orden`,
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }));
  try {
    const orden = (f?.formatToParts(new Date(2000, 11, 31)) ?? [])
      .map((parte) => parte.type)
      .filter((tipo): tipo is ParteDeFecha => tipo === 'day' || tipo === 'month' || tipo === 'year');
    return orden.length === 3 ? orden : ORDEN_DE_SIEMPRE;
  } catch {
    return ORDEN_DE_SIEMPRE;
  }
};

/** Los tramos de "hace un rato", del más pequeño al más grande. */
const TRAMOS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 1000],
  ['minute', 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['year', 365 * 24 * 60 * 60 * 1000],
];

/**
 * "hace 3 días", "in 2 hours".
 *
 * `ahora` entra por parámetro para que las pruebas no dependan del reloj.
 */
export const formatearTiempoRelativo = (
  fecha: Date | number,
  locale: string,
  ahora: Date | number = Date.now(),
  /*
   * El estilo, para quien lo necesite corto. El muro escribe la hora de cada
   * publicación en una línea muy apretada —"hace 2 h", "2h ago"— y ahí la forma
   * larga no cabe. Sin pedir nada se comporta como siempre.
   */
  opciones: Intl.RelativeTimeFormatOptions = {},
): string => {
  const cuando = typeof fecha === 'number' ? fecha : fecha.getTime();
  const referencia = typeof ahora === 'number' ? ahora : ahora.getTime();
  const diferencia = cuando - referencia;
  const f = recordar(`r|${locale}|${JSON.stringify(opciones)}`,
    () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto', ...opciones }));
  if (!f) return formatearFecha(cuando, locale);

  let elegido: [Intl.RelativeTimeFormatUnit, number] = TRAMOS[0];
  for (const tramo of TRAMOS) {
    if (Math.abs(diferencia) >= tramo[1]) elegido = tramo;
  }
  return f.format(Math.round(diferencia / elegido[1]), elegido[0]);
};

/* ── Listas ─────────────────────────────────────────────────────────────── */

export const formatearLista = (
  cosas: readonly string[],
  locale: string,
  tipo: 'conjunction' | 'disjunction' = 'conjunction',
): string => {
  const f = recordar(`l|${locale}|${tipo}`,
    () => new Intl.ListFormat(locale, { style: 'long', type: tipo }));
  return f ? f.format(cosas as string[]) : cosas.join(', ');
};

/* ── Nombres de idiomas y regiones ──────────────────────────────────────── */

/**
 * "Français" visto desde el francés, "Francés" visto desde el español.
 *
 * La lista de Configuración NO usa esto: allí cada idioma se escribe en su
 * propia lengua y ese nombre está a mano en el catálogo, porque tiene que
 * leerse igual venga de donde venga y no depender de qué traiga el motor.
 * Esto sirve para cuando hay que nombrar un idioma DENTRO de una frase.
 */
export const nombreDelIdioma = (codigo: string, locale: string): string => {
  const f = recordar(`i|${locale}`,
    () => new Intl.DisplayNames([locale], { type: 'language' }));
  try {
    return f?.of(codigo) || codigo;
  } catch {
    return codigo;
  }
};

export const nombreDeLaRegion = (codigo: string, locale: string): string => {
  const f = recordar(`g|${locale}`,
    () => new Intl.DisplayNames([locale], { type: 'region' }));
  try {
    return f?.of(codigo) || codigo;
  } catch {
    return codigo;
  }
};

/* ── Unidades ───────────────────────────────────────────────────────────── */

/*
 * Las tres regiones que no usan el sistema métrico. Y sí, es una lista escrita
 * a mano, con un motivo concreto: `Intl.Locale.prototype.measurementSystem`
 * todavía es una propuesta y no está en los motores. En cuanto llegue, se lee
 * de ahí —el código ya lo intenta primero— y esta lista se borra. Mientras
 * tanto son tres países, no una tabla de formatos que Intl ya sepa resolver.
 */
const SIN_SISTEMA_METRICO = ['US', 'LR', 'MM'];

export const sistemaDeMedida = (locale: string): 'metrico' | 'imperial' => {
  const conMedida = recordar(`m|${locale}`, () =>
    (new Intl.Locale(locale) as Intl.Locale & { measurementSystem?: string }).measurementSystem);
  if (conMedida) return conMedida === 'metric' ? 'metrico' : 'imperial';
  const { region } = partesDelLocale(locale);
  return region && SIN_SISTEMA_METRICO.includes(region) ? 'imperial' : 'metrico';
};

/** Una distancia en metros, escrita como se escribe en ese sitio. */
export const formatearDistancia = (metros: number, locale: string): string => {
  const imperial = sistemaDeMedida(locale) === 'imperial';
  const cerca = imperial ? metros < 1609 : metros < 1000;
  const unidad = cerca
    ? (imperial ? 'foot' : 'meter')
    : (imperial ? 'mile' : 'kilometer');
  const valor = cerca
    ? (imperial ? metros * 3.28084 : metros)
    : (imperial ? metros / 1609.344 : metros / 1000);
  return formatearNumero(valor, locale, {
    style: 'unit',
    unit: unidad,
    unitDisplay: 'short',
    maximumFractionDigits: cerca ? 0 : 1,
  });
};
