import { MetricaDeUso, ObservacionDeCoste, PrecioDeProveedor, UsoMedido, calcularCoste, esMetrica, esNivel, precioValido } from '../../core/media/uso';

/**
 * ESTIMACIÓN DE COSTE DEL OPTIMIZADOR DE MEDIOS, SIN TARIFAS APROBADAS.
 *
 * ── Qué hace ────────────────────────────────────────────────────────────────
 *
 * Resume lo que MC-7 midió (bytes almacenados, bytes transferidos, operaciones de
 * procesamiento, de referencia, de reconciliación y copias de respaldo) y, SOLO si
 * hay tarifas válidas, convierte esas cantidades en importes con `calcularCoste`.
 *
 * ── La regla que lo gobierna ────────────────────────────────────────────────
 *
 * Sin tarifa aprobada el resultado es `sin_tarifa`: lleva las cantidades medidas y
 * NINGÚN importe. No hay ningún valor por defecto, ni una tarifa de referencia
 * escondida, ni un cero que pueda leerse como «gratis». Hoy no existe ninguna tarifa
 * aprobada de medios en el repositorio (ver docs/MEDIOS-OPTIMIZADOR.md), así que en
 * producción esta función devuelve `sin_tarifa`.
 *
 * ── Qué NO hace ─────────────────────────────────────────────────────────────
 *
 * No cobra, no convierte nada a Credits, no llama a ningún servicio y no sabe de
 * cuentas de facturación. Es una función pura sobre mediciones y tarifas recibidas.
 */

export const VERSION_DEL_ESTIMADOR_DE_COSTE = 1;

/** Lo que el medidor dice que pasó, resumido por clase de operación. Nunca un importe. */
export interface MedicionResumida {
  /** Bytes guardados: el último nivel de cada proveedor y cuenta, sumado. */
  bytesAlmacenados: number;
  /** Bytes que entraron y salieron: lecturas más escrituras. */
  bytesTransferidos: number;
  /** Ejecuciones del procesador (`process.run`), contadas una vez. */
  operacionesDeProcesamiento: number;
  /** Consultas de referencia (`object.head`), contadas una vez. */
  operacionesDeReferencia: number;
  /** Listados de reconciliación (`object.list`), contados una vez. */
  operacionesDeReconciliacion: number;
  /** Copias de respaldo (`object.copy`), contadas una vez. */
  copiasDeRespaldo: number;
  /** Todas las operaciones, contadas una vez. */
  operacionesTotales: number;
  /** Segundos de cómputo del procesador. */
  segundosDeProceso: number;
  /** Mediciones que no tienen forma válida y se descartan. Se cuentan para que nada desaparezca en silencio. */
  descartadas: number;
}

/** Una tarifa de medios: la misma forma que MC-7 usa para los precios de proveedor. */
export type TarifaDeMedios = PrecioDeProveedor;

/** Lo que vale una línea. Puede ser `estimado` o `desconocido`; nunca un cero por defecto. */
export interface LineaDeCoste {
  providerId: string;
  metrica: MetricaDeUso;
  cantidad: number;
  observacion: ObservacionDeCoste;
}

export interface TotalDeCoste {
  moneda: string;
  amountMinor: number;
}

export type EstadoDeEstimacion = 'sin_tarifa' | 'calculado';

export interface EstimacionDeCoste {
  version: typeof VERSION_DEL_ESTIMADOR_DE_COSTE;
  estado: EstadoDeEstimacion;
  medicion: MedicionResumida;
  /** Vacía si no hay tarifa: sin importes y sin cantidades por línea. */
  lineas: readonly LineaDeCoste[];
  /** Solo si todas las líneas son estimadas y van en la misma moneda. */
  total?: TotalDeCoste;
  /** Verdadero solo si hay total y todas las líneas tienen importe. */
  completa: boolean;
}

/**
 * Una medición con forma usable: una métrica que el Core conoce, una operación, una cuenta,
 * un proveedor y una cantidad entera. Lo que no la tiene se cuenta como descartada: nunca
 * se convierte en un cero.
 */
const usable = (u: unknown): u is UsoMedido => {
  if (!u || typeof u !== 'object') return false;
  const o = u as Record<string, unknown>;
  return typeof o.providerId === 'string' && o.providerId.length > 0
    && typeof o.accountId === 'string' && o.accountId.length > 0
    && esMetrica(o.metrica)
    && typeof o.operacion === 'string'
    && Number.isSafeInteger(o.cantidad) && (o.cantidad as number) >= 0
    && typeof o.occurredAt === 'number' && Number.isFinite(o.occurredAt);
};

/** El último nivel de cada proveedor y cuenta: un nivel no se suma en el tiempo, se fotografía. */
const ultimosNiveles = (usos: readonly UsoMedido[], metrica: string): number => {
  const ultimo = new Map<string, UsoMedido>();
  for (const u of usos) {
    if (u.metrica !== metrica) continue;
    const clave = `${u.providerId}\u0000${u.accountId}`;
    const previo = ultimo.get(clave);
    if (!previo || u.occurredAt >= previo.occurredAt) ultimo.set(clave, u);
  }
  let total = 0;
  for (const u of ultimo.values()) total += u.cantidad;
  return total;
};

/**
 * Resume las mediciones. Cada operación se cuenta UNA vez: `usoDeLectura`, por ejemplo,
 * produce un hecho de bytes y otro de operación, y solo el de operación cuenta la operación.
 */
export const medirUsos = (usos: readonly unknown[]): MedicionResumida => {
  const validos = usos.filter(usable);
  const suma = (pred: (u: UsoMedido) => boolean): number =>
    validos.filter(pred).reduce((acc, u) => acc + u.cantidad, 0);
  const operacion = (op: string): number => suma((u) => u.metrica === 'operaciones' && u.operacion === op);

  return {
    bytesAlmacenados: ultimosNiveles(validos, 'bytes_almacenados'),
    bytesTransferidos: suma((u) => u.metrica === 'bytes_leidos' || u.metrica === 'bytes_escritos'),
    /* El ejecutor de medios emite UN hecho `segundos_de_proceso` por ejecución: cada uno es una operación. */
    operacionesDeProcesamiento: validos.filter((u) => u.operacion === 'process.run' && u.metrica === 'segundos_de_proceso').length,
    operacionesDeReferencia: operacion('object.head'),
    operacionesDeReconciliacion: operacion('object.list'),
    copiasDeRespaldo: operacion('object.copy'),
    operacionesTotales: suma((u) => u.metrica === 'operaciones'),
    segundosDeProceso: suma((u) => u.metrica === 'segundos_de_proceso'),
    descartadas: usos.length - validos.length,
  };
};

export interface EntradaDeEstimacion {
  /** Las mediciones que MC-7 produjo. */
  usos: readonly unknown[];
  /** Las tarifas aprobadas. Si no hay ninguna válida, el resultado es `sin_tarifa`. */
  tarifas?: readonly TarifaDeMedios[];
  /** El instante con el que se elige la tarifa vigente. Si falta, el último uso medido. */
  en?: number;
}

/**
 * ¿CUÁNTO CUESTA ESTO? Solo si hay con qué calcularlo.
 *
 * Pura. Con tarifas válidas agrupa por proveedor y métrica antes de calcular, para que
 * el redondeo se haga una vez por línea y no una vez por medición.
 */
export const estimarCosteDeMedios = (entrada: EntradaDeEstimacion): EstimacionDeCoste => {
  const usos = (entrada.usos ?? []).filter(usable);
  const medicion = medirUsos(entrada.usos ?? []);
  const tarifas = (entrada.tarifas ?? []).filter((p) => precioValido(p));

  if (tarifas.length === 0) {
    return { version: VERSION_DEL_ESTIMADOR_DE_COSTE, estado: 'sin_tarifa', medicion, lineas: Object.freeze([]), completa: false };
  }

  const ultimo = usos.reduce((acc, u) => Math.max(acc, u.occurredAt), 0);
  const at = typeof entrada.en === 'number' && Number.isFinite(entrada.en) ? entrada.en : ultimo;

  /* Agrupar por proveedor y métrica. Los niveles se suman por proveedor a partir del último de cada cuenta. */
  const grupos = new Map<string, { providerId: string; metrica: MetricaDeUso; cantidad: number }>();
  const metricas = [...new Set(usos.map((u) => u.metrica))];
  for (const metrica of metricas) {
    const delMetrica = usos.filter((u) => u.metrica === metrica);
    const proveedores = [...new Set(delMetrica.map((u) => u.providerId))];
    for (const providerId of proveedores) {
      const delProveedor = delMetrica.filter((u) => u.providerId === providerId);
      /* Un nivel se fotografía (último de cada cuenta); el resto de métricas se suman. */
      const cantidad = esNivel(metrica)
        ? ultimosNiveles(delProveedor, metrica)
        : delProveedor.reduce((acc, u) => acc + u.cantidad, 0);
      grupos.set(`${providerId}\u0000${metrica}`, { providerId, metrica, cantidad });
    }
  }

  const lineas: LineaDeCoste[] = [...grupos.values()]
    .sort((a, b) => (a.providerId === b.providerId ? (a.metrica < b.metrica ? -1 : a.metrica > b.metrica ? 1 : 0) : (a.providerId < b.providerId ? -1 : 1)))
    .map((g) => ({
      providerId: g.providerId,
      metrica: g.metrica,
      cantidad: g.cantidad,
      observacion: calcularCoste({ providerId: g.providerId, metrica: g.metrica, cantidad: g.cantidad, occurredAt: at }, tarifas, at),
    }));

  const estimadas = lineas.map((l) => l.observacion).filter((o): o is Extract<ObservacionDeCoste, { estado: 'estimado' }> => o.estado === 'estimado');
  const todas = lineas.length > 0 && estimadas.length === lineas.length;
  const monedas = new Set(estimadas.map((o) => o.coste.currency));
  let total: TotalDeCoste | undefined;
  if (todas && monedas.size === 1) {
    const suma = estimadas.reduce((acc, o) => acc + o.coste.amountMinor, 0);
    if (Number.isSafeInteger(suma)) total = { moneda: [...monedas][0], amountMinor: suma };
  }

  return {
    version: VERSION_DEL_ESTIMADOR_DE_COSTE,
    estado: 'calculado',
    medicion,
    lineas: Object.freeze(lineas),
    ...(total ? { total } : {}),
    completa: total !== undefined,
  };
};
