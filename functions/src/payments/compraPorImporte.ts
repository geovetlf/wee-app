import { getFirestore } from 'firebase-admin/firestore';
import { CreditError } from '../credits/creditValidation';

/*
 * LA COMPRA DE CREDITS POR IMPORTE — la regla de la demo YC, decidida por el dueño el 2026-11-04.
 *
 *   La persona elige un importe de US$5 a US$100, de 5 en 5. Recibe 100 Credits por cada dólar.
 *   No hay paquetes, ni promociones, ni bono de bienvenida.
 *
 * Aquí vive la ÚNICA definición de esa regla en el servidor. El cliente la recibe por `getCreditCost`
 * (`configuracionDeCompra`) y la pinta; el servidor la vuelve a aplicar entera al crear cada orden, así que
 * un cliente modificado puede pedir lo que quiera: solo se cobra y se acredita lo que sale de aquí.
 *
 * MERCADOS (docs/PRECIOS-POR-MERCADO.md §3). La equivalencia económica es siempre la del dólar —importe en USD
 * × 100 Credits—; un mercado solo decide en qué moneda se COBRA:
 *   · `US` (por defecto): USD, en centavos.
 *   · `PE`: PEN = USD × tipo de cambio, redondeado al sol entero (la regla de Perú, §3.1 «rounding: whole sol»).
 * El tipo de cambio NUNCA está en el código: se lee de `markets/{id}` en Firestore (fuente, valor y fecha). Si
 * falta algo, o el mercado no está `active`, la compra en esa moneda se cierra con un motivo claro.
 * El mercado lo decide la facturación, nunca el idioma ni la ubicación (CLAUDE.md §8).
 */

export const COMPRA = Object.freeze({ minUsd: 5, maxUsd: 100, stepUsd: 5, creditsPerUsd: 100 });

export type IdDeMercado = 'US' | 'PE';
export const MERCADOS: readonly IdDeMercado[] = ['US', 'PE'];

/** Por qué se rechaza una compra. Viaja en `details.motivo` para que el cliente diga lo que pasó. */
export type MotivoDeRechazo =
  | 'importe_invalido'
  | 'credits_no_coinciden'
  | 'moneda_no_coincide'
  | 'importe_mostrado_no_coincide'
  | 'mercado_desconocido'
  | 'mercado_no_disponible'
  | 'paquetes_retirados'
  | 'pedido_incompleto'
  | 'orden_fallida'
  | 'pago_no_coincide';

export const rechazo = (motivo: MotivoDeRechazo, mensaje: string, extra: Record<string, unknown> = {}): CreditError =>
  new CreditError('PURCHASE_INVALID', mensaje, { motivo, ...extra });

/** El importe en dólares: entero, de 5 a 100 y múltiplo de 5. Cualquier otra cosa se rechaza, no se ajusta. */
export const validarImporteUsd = (valor: unknown): number => {
  const n = typeof valor === 'number' ? valor : NaN;
  if (!Number.isInteger(n) || n < COMPRA.minUsd || n > COMPRA.maxUsd || n % COMPRA.stepUsd !== 0) {
    throw rechazo('importe_invalido', `El importe tiene que ser de US$${COMPRA.minUsd} a US$${COMPRA.maxUsd}, de ${COMPRA.stepUsd} en ${COMPRA.stepUsd}`, { amountUsd: valor });
  }
  return n;
};

/** Credits de un importe ya validado. La única cuenta: dólares × 100. */
export const creditsDeImporte = (amountUsd: number): number => validarImporteUsd(amountUsd) * COMPRA.creditsPerUsd;

export interface TipoDeCambio {
  source: string;
  value: number;
  date: string;
}

export interface Mercado {
  id: IdDeMercado;
  currency: 'USD' | 'PEN';
  /** null en el mercado del dólar: no hay conversión. */
  fx: TipoDeCambio | null;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * El mercado a partir de su documento `markets/{id}` (o de nada, para `US`). Pura: se prueba sin Firestore.
 * PE exige `currency: 'PEN'`, `status: 'active'` y `fx` con `source`, `base` > 0 y `baseDate` AAAA-MM-DD.
 */
export const mercadoDesdeDoc = (id: unknown, data: Record<string, any> | null | undefined): Mercado => {
  if (id === undefined || id === null || id === '' || id === 'US') return { id: 'US', currency: 'USD', fx: null };
  if (id !== 'PE') throw rechazo('mercado_desconocido', 'Mercado desconocido', { market: id });
  const fx = data?.fx || {};
  const value = Number(fx.base);
  const listo = data?.status === 'active' && data?.currency === 'PEN'
    && typeof fx.source === 'string' && fx.source.trim() !== ''
    && Number.isFinite(value) && value > 0
    && typeof fx.baseDate === 'string' && FECHA.test(fx.baseDate);
  if (!listo) {
    throw rechazo('mercado_no_disponible', 'Los pagos en soles todavía no están disponibles: falta el tipo de cambio aprobado', { market: 'PE' });
  }
  return { id: 'PE', currency: 'PEN', fx: { source: fx.source.trim(), value, date: fx.baseDate } };
};

/** Lee el mercado de Firestore. `US` no necesita documento. */
export const leerMercado = async (id: unknown): Promise<Mercado> => {
  if (id === undefined || id === null || id === '' || id === 'US') return mercadoDesdeDoc('US', null);
  if (id !== 'PE') return mercadoDesdeDoc(id, null);
  const snap = await getFirestore().collection('markets').doc('PE').get();
  return mercadoDesdeDoc('PE', snap.exists ? snap.data() : null);
};

/**
 * Lo que cuesta un importe en la moneda del mercado, en unidades menores (centavos, céntimos) y siempre entero.
 *   USD: dólares × 100.   PEN: redondeo al sol entero de (dólares × tipo de cambio), × 100.
 */
export const importeEnMoneda = (amountUsd: number, mercado: Mercado): number => {
  const usd = validarImporteUsd(amountUsd);
  if (mercado.currency === 'USD') return usd * 100;
  if (!mercado.fx) throw rechazo('mercado_no_disponible', 'Falta el tipo de cambio', { market: mercado.id });
  /* toFixed(6) antes de redondear: que un 49,4999999 de coma flotante no baje un sol lo que vale 49,5. */
  return Math.round(Number((usd * mercado.fx.value).toFixed(6))) * 100;
};

export interface Cotizacion {
  market: IdDeMercado;
  amountUsd: number;
  credits: number;
  currency: 'USD' | 'PEN';
  amountMinor: number;
  fxReference: TipoDeCambio | null;
}

export const cotizar = (amountUsd: number, mercado: Mercado): Cotizacion => ({
  market: mercado.id,
  amountUsd: validarImporteUsd(amountUsd),
  credits: creditsDeImporte(amountUsd),
  currency: mercado.currency,
  amountMinor: importeEnMoneda(amountUsd, mercado),
  fxReference: mercado.fx,
});

export interface ConfiguracionDeCompra {
  minUsd: number;
  maxUsd: number;
  stepUsd: number;
  creditsPerUsd: number;
  /** El proveedor que puede confirmar pagos ahora mismo, o null si ninguno (producción hoy). */
  proveedor: 'test' | null;
  mercados: { id: IdDeMercado; currency: 'USD' | 'PEN'; disponible: boolean; fx: TipoDeCambio | null }[];
}

/** Lo que el cliente necesita para pintar el selector, sin una copia propia de la regla. */
export const configuracionDeCompra = async (proveedorDePrueba: () => boolean = () => false): Promise<ConfiguracionDeCompra> => {
  let pe: ConfiguracionDeCompra['mercados'][number] = { id: 'PE', currency: 'PEN', disponible: false, fx: null };
  try {
    const m = await leerMercado('PE');
    pe = { id: 'PE', currency: 'PEN', disponible: true, fx: m.fx };
  } catch {
    /* Sin tipo de cambio aprobado: PE se anuncia como no disponible. */
  }
  return {
    ...COMPRA,
    proveedor: proveedorDePrueba() ? 'test' : null,
    mercados: [{ id: 'US', currency: 'USD', disponible: true, fx: null }, pe],
  };
};

/** Productos de las tiendas nativas (wt-native-payments): `zone.wee.credits.usd{N}` → N dólares. Sin catálogo. */
export const importeDeProductoNativo = (productId: unknown): number => {
  const m = typeof productId === 'string' ? /^zone\.wee\.credits\.usd(\d{1,3})$/.exec(productId) : null;
  if (!m) throw rechazo('paquetes_retirados', 'Producto desconocido: los paquetes de Credits ya no existen', { productId });
  return validarImporteUsd(Number(m[1]));
};
