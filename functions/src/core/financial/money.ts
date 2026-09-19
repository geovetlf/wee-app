/**
 * WEE FINANCIAL CORE — EL DINERO, EXACTO.
 *
 * ── Por qué esto es lo primero de la fase ───────────────────────────────────
 *
 * Porque `9.99` no es nueve con noventa y nueve. Es 9.9900000000000002131628…
 * y a la tercera suma ya no cuadra un céntimo. Un céntimo que no cuadra en un
 * libro contable no es un redondeo: es un libro que no se puede auditar, y con
 * un millón de cuentas aparece el primer día.
 *
 * Aquí el dinero es un ENTERO de unidades mínimas y su moneda, siempre juntos.
 * Nunca un `number` suelto. Nunca una cantidad sin decir de qué.
 *
 * ── Lo que NO es esto ───────────────────────────────────────────────────────
 *
 * No son Credits. Un Credit es la unidad de consumo de Weë y no tiene moneda;
 * el dinero sí. Confundirlos es lo que lleva a escribir «1 Credit = 1 dólar»
 * en algún sitio y descubrir dos años después que estaba en veinte archivos.
 * La conversión entre los dos es una POLÍTICA, tiene versión, y no vive aquí.
 *
 * Y no es un conversor de divisas. Cambiar moneda necesita una tasa, y una tasa
 * tiene origen, momento y margen. Eso entra por un puerto, nunca por una
 * constante.
 */

/**
 * La moneda, como la nombra la norma: tres letras mayúsculas.
 *
 * No hay lista cerrada a propósito. Weë empieza donde empieza y va a acabar
 * cobrando en monedas que hoy no sabríamos nombrar; una unión cerrada obligaría
 * a tocar el Core —y a migrar lo guardado— cada vez que se abre un país. Lo que
 * sí se valida es la FORMA, que es lo que impide guardar «dolares» o «$».
 */
export type CurrencyCode = string;

export const FORMA_DE_MONEDA = /^[A-Z]{3}$/;

export const esMoneda = (v: unknown): v is CurrencyCode =>
  typeof v === 'string' && FORMA_DE_MONEDA.test(v);

/**
 * CUÁNTAS UNIDADES MÍNIMAS TIENE UNA UNIDAD.
 *
 * Casi todas las monedas tienen dos decimales, y por eso el valor por defecto
 * es dos. Pero no todas, y equivocarse aquí no da un error: da una factura cien
 * veces mayor. El yen y el won no tienen decimales —¥1000 son 1000 unidades
 * mínimas, no 10—, y el dinar kuwaití tiene tres.
 *
 * Es una propiedad de la NORMA, no una política comercial: por eso está escrita
 * y no configurada. Lo que sí es política —qué monedas se aceptan en qué país,
 * con qué método de pago— vive en la configuración, no aquí.
 */
const EXPONENTES: Readonly<Record<string, number>> = Object.freeze({
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0,
  PYG: 0, RWF: 0, UGX: 0, UYI: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
});

export const EXPONENTE_POR_DEFECTO = 2;

/** Cuántas unidades mínimas caben en una unidad de esta moneda. */
export const exponenteDe = (currency: CurrencyCode): number =>
  Object.prototype.hasOwnProperty.call(EXPONENTES, currency)
    ? EXPONENTES[currency]
    : EXPONENTE_POR_DEFECTO;

/**
 * UNA CANTIDAD DE DINERO.
 *
 * `amountMinor` es un ENTERO de unidades mínimas: 999 en USD son 9,99 dólares;
 * 5000 en PEN son 50 soles; 1000 en JPY son 1000 yenes. Puede ser negativo —un
 * asiento compensatorio lo necesita— y nunca es fraccionario.
 */
export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

/**
 * El techo. Más allá de `Number.MAX_SAFE_INTEGER` los enteros de JavaScript
 * dejan de ser enteros en silencio, y un libro contable que miente en silencio
 * es peor que uno que se rompe. Se corta muy por debajo: son unidades mínimas,
 * así que esto son cien mil millones de dólares en una sola anotación.
 */
export const MAX_UNIDADES_MINIMAS = 10 ** 13;

export const esMoney = (v: unknown): v is Money => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const m = v as Record<string, unknown>;
  const claves = Object.keys(m);
  if (claves.length !== 2 || !claves.includes('amountMinor') || !claves.includes('currency')) return false;
  return esMoneda(m.currency)
    && typeof m.amountMinor === 'number'
    && Number.isSafeInteger(m.amountMinor)
    && Math.abs(m.amountMinor) <= MAX_UNIDADES_MINIMAS;
};

/** Construye una cantidad, o nada si no tiene forma de cantidad. */
export const dinero = (amountMinor: number, currency: CurrencyCode): Money | undefined => {
  const m = { amountMinor, currency };
  return esMoney(m) ? Object.freeze(m) : undefined;
};

export const cero = (currency: CurrencyCode): Money | undefined => seguro(0, currency);

export const esCero = (m: Money): boolean => m.amountMinor === 0;
export const esNegativo = (m: Money): boolean => m.amountMinor < 0;
export const esPositivo = (m: Money): boolean => m.amountMinor > 0;

/**
 * ¿MISMA MONEDA?
 *
 * Todas las operaciones lo preguntan primero y ninguna convierte por su cuenta.
 * Sumar dólares con soles «porque estaban en el mismo array» es exactamente el
 * error que no puede ocurrir ni una vez, así que la suma no sabe hacerlo: si no
 * coinciden, no hay resultado.
 */
export const mismaMoneda = (a: Money, b: Money): boolean => a.currency === b.currency;

/**
 * EL ÚNICO SITIO QUE CONSTRUYE DINERO.
 *
 * Y valida la MONEDA, no solo el importe. No lo hacía, así que `convertir` con
 * un destino de tres letras mal escritas, y `cero` con una moneda inventada,
 * devolvían objetos que el propio `esMoney` de este archivo rechaza: dinero que
 * no es dinero, viajando hacia un libro contable. Cualquier función de aquí que
 * construya un Money pasa por esta; ninguna monta el objeto a mano.
 */
const seguro = (amountMinor: number, currency: CurrencyCode): Money | undefined =>
  esMoneda(currency) && Number.isSafeInteger(amountMinor) && Math.abs(amountMinor) <= MAX_UNIDADES_MINIMAS
    ? Object.freeze({ amountMinor, currency })
    : undefined;

export const sumar = (a: Money, b: Money): Money | undefined =>
  mismaMoneda(a, b) ? seguro(a.amountMinor + b.amountMinor, a.currency) : undefined;

export const restar = (a: Money, b: Money): Money | undefined =>
  mismaMoneda(a, b) ? seguro(a.amountMinor - b.amountMinor, a.currency) : undefined;

export const negar = (m: Money): Money | undefined => seguro(-m.amountMinor, m.currency);

/** Multiplicar por una CANTIDAD ENTERA —tres unidades del mismo artículo—, nunca por un decimal. */
export const porCantidad = (m: Money, veces: number): Money | undefined =>
  Number.isSafeInteger(veces) ? seguro(m.amountMinor * veces, m.currency) : undefined;

/** Menor, igual o mayor. Solo entre la misma moneda. */
export const comparar = (a: Money, b: Money): number | undefined =>
  mismaMoneda(a, b) ? (a.amountMinor < b.amountMinor ? -1 : a.amountMinor > b.amountMinor ? 1 : 0) : undefined;

export const sumaDe = (importes: readonly Money[], currency: CurrencyCode): Money | undefined => {
  let total = cero(currency);
  if (!total) return undefined;
  for (const m of importes) {
    const siguiente = sumar(total, m);
    if (!siguiente) return undefined;
    total = siguiente;
  }
  return total;
};

/**
 * REPARTIR SIN PERDER NI UNA UNIDAD MÍNIMA.
 *
 * Diez céntimos entre tres no son 3,33 cada uno: son 4, 3 y 3. Repartir con una
 * división y un redondeo pierde —o inventa— unidades mínimas, y en un libro
 * contable eso es dinero que aparece de la nada o se evapora. Aquí el resto se
 * reparte de uno en uno entre los primeros, así que la suma de las partes es
 * SIEMPRE el total. Es la única forma honesta de dividir dinero.
 *
 * Lo necesitarán los repartos por porcentaje: comisiones, impuestos, la parte
 * de un proveedor. Existe ahora para que nadie lo resuelva con una división.
 */
export const repartir = (m: Money, partes: number): readonly Money[] | undefined => {
  if (!Number.isSafeInteger(partes) || partes <= 0) return undefined;
  const signo = m.amountMinor < 0 ? -1 : 1;
  const total = Math.abs(m.amountMinor);
  const base = Math.floor(total / partes);
  const resto = total - base * partes;
  const trozos: Money[] = [];
  for (let i = 0; i < partes; i++) {
    const valor = (base + (i < resto ? 1 : 0)) * signo;
    const t = seguro(valor, m.currency);
    if (!t) return undefined;
    trozos.push(t);
  }
  return Object.freeze(trozos);
};

/**
 * REPARTIR EN PROPORCIONES. Mismo trato con el resto.
 *
 * Una comisión del 2,9% más treinta céntimos, el reparto de un pago entre dos
 * conceptos, lo que sea: las proporciones son enteros y el resto va a los
 * primeros, así que la suma vuelve a ser exactamente el total.
 */
export const repartirEnProporciones = (m: Money, pesos: readonly number[]): readonly Money[] | undefined => {
  if (!pesos.length || pesos.some((p) => !Number.isSafeInteger(p) || p < 0)) return undefined;
  const suma = pesos.reduce((t, p) => t + p, 0);
  if (suma <= 0 || !Number.isSafeInteger(suma)) return undefined;
  /* El producto intermedio tiene que caber en un entero exacto: si no, el reparto miente. */
  if (!Number.isSafeInteger(Math.abs(m.amountMinor) * Math.max(...pesos))) return undefined;
  const signo = m.amountMinor < 0 ? -1 : 1;
  const total = Math.abs(m.amountMinor);
  const trozos: number[] = [];
  let repartido = 0;
  for (const peso of pesos) {
    const parte = Math.floor((total * peso) / suma);
    trozos.push(parte);
    repartido += parte;
  }
  /* Lo que sobró por redondear hacia abajo se devuelve de uno en uno. */
  for (let i = 0, resto = total - repartido; resto > 0; i = (i + 1) % trozos.length, resto--) {
    trozos[i] += 1;
  }
  const salida: Money[] = [];
  for (const t of trozos) {
    const v = seguro(t * signo, m.currency);
    if (!v) return undefined;
    salida.push(v);
  }
  return Object.freeze(salida);
};

/**
 * DE UNA TARIFA DE PROVEEDOR A DINERO. Aproximado, y lo dice el nombre.
 *
 * El registro publica tarifas como `0.00004` dólares por token: eso es un
 * número real, no dinero, y no se puede guardar tal cual en un libro. Aquí se
 * convierte a unidades mínimas con un redondeo EXPLÍCITO —hacia arriba a partir
 * de la mitad— y el resultado es una ESTIMACIÓN, nunca la verdad de lo que
 * costó. Lo que costó de verdad lo dice el proveedor, y entra ya como `Money`.
 *
 * Que la función se llame «aproximado» es deliberado: quien la use en un sitio
 * donde hacía falta exactitud lo va a leer.
 */
export const desdeTarifaAproximada = (cantidad: number, currency: CurrencyCode): Money | undefined => {
  if (typeof cantidad !== 'number' || !Number.isFinite(cantidad)) return undefined;
  const factor = 10 ** exponenteDe(currency);
  const escalado = cantidad * factor;
  /* Media unidad hacia arriba en valor absoluto: simétrico, para que un asiento
   * compensatorio redondee igual que el original y no aparezca un céntimo. */
  const redondeado = escalado < 0 ? -Math.round(-escalado) : Math.round(escalado);
  return seguro(redondeado, currency);
};

/**
 * Para enseñarlo, no para calcular con ello.
 *
 * Devuelve las partes —entera y decimal— ya separadas, sin formato de idioma:
 * poner el separador, el símbolo y el orden es de `i18n/formato.ts` con el
 * locale activo, y hacerlo aquí sería un segundo sistema de formato.
 */
export const partesDe = (m: Money): { unidades: number; fraccion: number; exponente: number; negativo: boolean } => {
  const exponente = exponenteDe(m.currency);
  const factor = 10 ** exponente;
  const abs = Math.abs(m.amountMinor);
  return {
    unidades: Math.floor(abs / factor),
    fraccion: abs % factor,
    exponente,
    negativo: m.amountMinor < 0,
  };
};

/**
 * LA TASA DE CAMBIO ENTRA POR AQUÍ, Y POR NINGÚN OTRO SITIO.
 *
 * Una conversión sin tasa declarada es una cifra inventada. Este puerto obliga
 * a decir de dónde salió la tasa y de cuándo es, porque un libro contable tiene
 * que poder explicar por qué aquel día un dólar fueron esos soles. El Core no
 * trae ninguna implementación: cambiar moneda es un servicio, con su coste y su
 * margen, y eso es una decisión de producto.
 */
export interface TipoDeCambio {
  from: CurrencyCode;
  to: CurrencyCode;
  /** Unidades mínimas de destino por CIEN MIL unidades mínimas de origen. Entero: las tasas tampoco flotan. */
  rateScaled: number;
  /** Cuántos ceros lleva la escala. Se declara para que la cuenta sea reproducible. */
  scale: number;
  /** Quién la dio y cuándo. Sin esto no hay auditoría posible. */
  source: string;
  at: number;
}

export interface FxPort {
  /** La tasa aplicable, o nada si no hay ninguna que se pueda justificar. */
  tasa(from: CurrencyCode, to: CurrencyCode, at: number): TipoDeCambio | undefined;
}

/**
 * Convertir con una tasa declarada. Devuelve también la tasa USADA, para poder
 * guardarla junto al asiento: sin eso, mañana nadie puede reconstruir la cifra.
 */
export const convertir = (m: Money, tasa: TipoDeCambio): { money: Money; tasa: TipoDeCambio } | undefined => {
  if (m.currency !== tasa.from) return undefined;
  /*
   * Una tasa de CERO no es una tasa: diez mil dólares entraban y salían cero
   * soles, con la tasa rota adjunta como si justificara el asiento. Y una tasa
   * sin origen no se puede auditar, que es la mitad del motivo de este puerto.
   */
  if (!Number.isSafeInteger(tasa.rateScaled) || tasa.rateScaled <= 0) return undefined;
  if (typeof tasa.source !== 'string' || tasa.source.length === 0 || tasa.source.length > 120) return undefined;
  if (!Number.isFinite(tasa.at)) return undefined;
  if (!Number.isSafeInteger(tasa.scale) || tasa.scale < 0 || tasa.scale > 12) return undefined;
  const divisor = 10 ** tasa.scale;
  const bruto = (m.amountMinor * tasa.rateScaled) / divisor;
  if (!Number.isFinite(bruto)) return undefined;
  const redondeado = bruto < 0 ? -Math.round(-bruto) : Math.round(bruto);
  const convertido = seguro(redondeado, tasa.to);
  return convertido ? { money: convertido, tasa } : undefined;
};
