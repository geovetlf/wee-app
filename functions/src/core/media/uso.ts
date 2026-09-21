import { payloadLimpio } from '../events';
import { Money, esMoney } from '../financial/money';
import { ProviderOperationRef } from '../job';
import { Huella } from '../moderation';
import { CapacidadDeAlmacen } from './puerto';

/**
 * MC-7 · LO QUE PASÓ FÍSICAMENTE, Y LO QUE ESO CUESTA.
 *
 * ── Lo que esto NO es, dicho antes que nada ─────────────────────────────────
 *
 * **No es el Financial Core.** F9 es la autoridad financiera y aquí no se cobra
 * a nadie, no se mueve un saldo, no se emite una factura y no se inventa un
 * precio. Esto MIDE. Lo que se hace después con la medida es de F9, y la
 * dependencia va en ese sentido y no en el otro:
 *
 *     Media Cloud:  operación física → hecho de uso → observación de coste
 *     F9 después:   observación de coste → libro
 *
 * Invertirlo —que medir necesitara al libro— ataría el almacenamiento a la
 * contabilidad, y entonces no se podría medir sin poder cobrar.
 *
 * ── Cuatro cosas que se parecen y no son la misma ───────────────────────────
 *
 *   1 OPERACIÓN LÓGICA      «guardar el material X»        ← lo que quiso Weë
 *   2 OPERACIÓN FÍSICA      un PUT contra un proveedor     ← lo que ocurrió
 *   3 HECHO DE USO          1.048.576 bytes escritos       ← lo que se midió
 *   4 OBSERVACIÓN DE COSTE  0,02 USD, estimado             ← lo que vale
 *
 * Una operación lógica puede producir varias físicas (un reintento), una física
 * produce varios hechos de uso (bytes Y operaciones), y un hecho de uso puede
 * no tener coste conocido. Fundirlas es como se acaba contando dos veces un
 * reintento o cobrando por algo que el proveedor no cobra.
 *
 * ── El dinero es el de F9, no una copia ─────────────────────────────────────
 *
 * Se importa `Money` de `../financial/money`, que no importa nada y por eso se
 * puede traer sin arrastrar el libro, la cuenta ni las pasarelas. Escribir aquí
 * un segundo tipo de dinero habría dado dos aritméticas de redondeo, y dos
 * aritméticas de redondeo dan dos respuestas distintas a la misma factura.
 *
 * Lo que NO se reutiliza es `ProviderCost` de `../cost`: su `usd` es un `number`
 * en coma flotante. Sirve para ordenar candidatos de IA antes de ejecutarlos; no
 * sirve para un hecho que después alguien va a cuadrar contra una factura.
 *
 * Puro como todo el Core: sin red, sin reloj, sin disco, sin azar y sin un solo
 * nombre de proveedor dentro.
 */

/* ── 1 · Qué se midió ──────────────────────────────────────────────────────── */

/**
 * LAS MÉTRICAS QUE WEË SABE MEDIR. Cinco, y una puerta declarada para las demás.
 *
 * No se asume que todos los proveedores publiquen las mismas: uno cobra por
 * operación de clase A y B, otro por gigabyte-mes, otro por segundo de cómputo.
 * Lo que sí se exige es que la métrica y su unidad estén DICHAS, porque una
 * cantidad sin unidad no es una medida: es un número.
 *
 * `x:` es la puerta para lo que un proveedor mida y Weë no tenga nombrado. No
 * se interpreta y no entra en ninguna cuenta automática — existe para que un
 * uso real no se pierda por no tener nombre, no para colar métricas nuevas sin
 * decidirlas.
 */
export type MetricaConocida =
  | 'bytes_almacenados'
  | 'bytes_escritos'
  | 'bytes_leidos'
  | 'operaciones'
  | 'segundos_de_proceso';

export type MetricaDeUso = MetricaConocida | `x:${string}`;

export const METRICAS_CONOCIDAS: readonly MetricaConocida[] = Object.freeze([
  'bytes_almacenados', 'bytes_escritos', 'bytes_leidos', 'operaciones', 'segundos_de_proceso',
] as const);

export const FORMA_DE_METRICA_PROPIA = /^x:[a-z][a-z0-9_]{1,31}$/;

export type UnidadDeUso = 'byte' | 'operacion' | 'segundo' | 'unidad_del_proveedor';

/**
 * QUÉ UNIDAD LE TOCA A CADA MÉTRICA. Un mapa explícito, no una deducción.
 *
 * Deducir la unidad del nombre —«empieza por bytes_, luego son bytes»— funciona
 * hasta que alguien añade `bytes_por_segundo`. Un mapa no se equivoca y falla en
 * el compilador cuando se añade una métrica y se olvida su unidad.
 */
export const UNIDAD_DE_METRICA: Readonly<Record<MetricaConocida, UnidadDeUso>> = Object.freeze({
  bytes_almacenados: 'byte',
  bytes_escritos: 'byte',
  bytes_leidos: 'byte',
  operaciones: 'operacion',
  segundos_de_proceso: 'segundo',
});

/**
 * UN NIVEL NO ES UN FLUJO, y confundirlos multiplica una factura por treinta.
 *
 * Los bytes escritos se SUMAN a lo largo de un mes. Los bytes almacenados no:
 * son una foto de cuánto había en un instante. Sumar treinta fotos diarias de
 * un gigabyte da treinta gigabytes almacenados, que es falso y es exactamente
 * el error que hace que una estimación de almacenamiento sea absurda.
 */
export const ES_NIVEL: Readonly<Record<MetricaConocida, boolean>> = Object.freeze({
  bytes_almacenados: true,
  bytes_escritos: false,
  bytes_leidos: false,
  operaciones: false,
  segundos_de_proceso: false,
});

export const esMetricaConocida = (m: unknown): m is MetricaConocida =>
  typeof m === 'string' && (METRICAS_CONOCIDAS as readonly string[]).includes(m);

export const esMetricaPropia = (m: unknown): m is `x:${string}` =>
  typeof m === 'string' && FORMA_DE_METRICA_PROPIA.test(m);

export const esMetrica = (m: unknown): m is MetricaDeUso => esMetricaConocida(m) || esMetricaPropia(m);

/** La unidad que corresponde, o nada si la métrica no es de las que Weë nombra. */
export const unidadDe = (m: unknown): UnidadDeUso | undefined =>
  esMetricaConocida(m) ? UNIDAD_DE_METRICA[m] : undefined;

/** ¿Es una foto de un nivel? Una métrica propia se trata como flujo: no se supone. */
export const esNivel = (m: unknown): boolean => (esMetricaConocida(m) ? ES_NIVEL[m] : false);

/* ── 2 · Qué operación física fue ──────────────────────────────────────────── */

/**
 * LAS OPERACIONES QUE LLEGAN A UN PROVEEDOR.
 *
 * Sale del vocabulario que ya existe —`CapacidadDeAlmacen`, de MC-1— en vez de
 * uno nuevo: si un día se añade una capacidad, aparece aquí sola.
 *
 * ── Y `object.signedUrl` está EXCLUIDA, a propósito ─────────────────────────
 *
 * Firmar una entrega es un HMAC local: no sale un solo paquete hacia el
 * proveedor y por tanto no hay operación que cobrar. Contar cada URL firmada
 * como coste físico inventaría un gasto que nadie factura, y además lo haría
 * justo en la operación más frecuente de todas.
 *
 * Lo que SÍ cuesta es la descarga que alguien hace después con esa URL — y esa
 * **Weë no la ve**, porque va del navegador al proveedor sin pasar por aquí.
 * Ese hueco no se tapa con una estimación: se declara, y se cierra por la
 * costura de reconciliación (§9), que es el único sitio donde el dato existe.
 */
export type OperacionFisica =
  | Exclude<CapacidadDeAlmacen, 'object.signedUrl'>
  /* MC-4 · el procesador ejecutó una transformación. */
  | 'process.run'
  /* MC-6 · se leyeron bytes de una fuente histórica. */
  | 'legacy.read';

export const OPERACIONES_FISICAS: readonly OperacionFisica[] = Object.freeze([
  'object.put', 'object.head', 'object.delete', 'object.upload', 'object.get', 'object.copy', 'object.list',
  'process.run', 'legacy.read',
] as const);

export const esOperacionFisica = (v: unknown): v is OperacionFisica =>
  typeof v === 'string' && (OPERACIONES_FISICAS as readonly string[]).includes(v);

/* ── 3 · La identidad de un hecho de uso ───────────────────────────────────── */

/**
 * A QUÉ SE AMARRA UN HECHO PARA NO CONTARLO DOS VECES.
 *
 * El ancla tiene que identificar la operación **FÍSICA**, no la lógica, y esa
 * distinción es toda la idempotencia de MC-7:
 *
 *   · dos avisos del mismo PUT      → un solo hecho  (el proveedor cobró una vez)
 *   · un reintento que SÍ llamó     → dos hechos     (el proveedor cobró dos veces)
 *
 * Por eso el mejor ancla es el `attemptId` del Job Engine, que es exactamente
 * «una llamada»; después lo que el proveedor llame a su operación; y, para los
 * barridos que no tienen trabajo detrás, la pasada más el objeto.
 *
 * **Nunca un reloj.** Un ancla con la hora dentro convierte cada reintento del
 * REGISTRO en un hecho nuevo, que es justo lo contrario de idempotente.
 */
export interface AnclaDeOperacion {
  /** Un intento del Job Engine. Un intento es una llamada física: el mejor ancla que hay. */
  attemptId?: string;
  /** Cómo llama el proveedor a su operación, cuando la nombra. */
  providerRef?: ProviderOperationRef;
  /** La pasada de un barrido, cuando no hay trabajo detrás. Se combina con el objeto. */
  runId?: string;
  objectRef?: string;
  /** Cuando una misma pasada toca el mismo objeto más de una vez. */
  secuencia?: number;
  /** Para una métrica de NIVEL, el ancla es el periodo: la foto de ese mes es una. */
  periodo?: string;
}

const texto = (v: unknown, max = 200): string | undefined =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined;

/**
 * EL ANCLA, REDUCIDA A UNA CADENA ESTABLE. O nada.
 *
 * Devolver `undefined` cuando no hay nada a lo que amarrarse es el punto: sin
 * ancla no se puede deduplicar, y un hecho que no se puede deduplicar no se
 * admite. La alternativa —fabricar una con la hora— haría que todo pareciera
 * idempotente y nada lo fuera.
 */
export const anclaEstable = (a: AnclaDeOperacion | undefined): string | undefined => {
  if (!a || typeof a !== 'object') return undefined;
  const sec = Number.isSafeInteger(a.secuencia) && (a.secuencia as number) >= 0 ? `#${a.secuencia}` : '';

  const intento = texto(a.attemptId);
  if (intento) return `attempt:${intento}${sec}`;

  const pr = a.providerRef;
  if (pr && texto(pr.providerId, 64) && texto(pr.operationId)) {
    return `provider:${pr.providerId}:${pr.operationId}${sec}`;
  }

  const run = texto(a.runId);
  const obj = texto(a.objectRef);
  if (run && obj) return `run:${run}:${obj}${sec}`;

  const periodo = texto(a.periodo, 16);
  if (periodo) return `periodo:${periodo}`;

  return undefined;
};

/* ── 4 · El hecho de uso ───────────────────────────────────────────────────── */

/**
 * LO QUE SE MIDIÓ. Un hecho, inmutable, y sin una sola cifra de dinero dentro.
 *
 * El coste va aparte (§7) porque se conoce después, cambia de precio y puede no
 * conocerse nunca. Un hecho con el coste pegado obligaría a reescribir el hecho
 * cuando cambia la tarifa, y entonces dejaría de ser el relato de lo que pasó.
 *
 * `accountId` viene de la autoridad de Weë —del material guardado o de la sesión
 * autenticada— y **jamás de lo que mande un cliente**; `providerId`, de la
 * operación real contra el proveedor. Un cliente no declara ni de quién es un
 * uso ni cuánto costó: no hay campo por el que hacerlo.
 */
export interface UsoMedido {
  accountId: string;
  providerId: string;
  operacion: OperacionFisica;
  metrica: MetricaDeUso;
  unidad: UnidadDeUso;
  /** Cuánto. Entero y no negativo: medio byte no existe y un uso negativo tampoco. */
  cantidad: number;
  occurredAt: number;
  ancla: AnclaDeOperacion;
  /* Referencias, nunca contenido. */
  assetId?: string;
  objectRef?: string;
  jobId?: string;
  operationId?: string;
  /** La región, cuando el proveedor la declara. Suya y opaca. */
  region?: string;
  /**
   * CORRIGE OTRO HECHO. El corregido se queda donde está.
   *
   * Borrar el hecho equivocado borraría también la prueba de que se corrigió, y
   * un libro que se puede reescribir no se puede auditar. Una corrección es un
   * hecho NUEVO que dice a cuál sustituye.
   */
  corrige?: string;
  /** Escalares pequeños. Ni secretos, ni URLs, ni contenido de nadie. */
  metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface EventoDeUso extends UsoMedido {
  usageId: string;
}

export const FORMA_DE_USO = /^use_[0-9a-f]{32}$/;
export const FORMA_DE_IDENTIFICADOR = /^[A-Za-z0-9_-]{1,128}$/;

/** El techo de una medida. Un exabyte en una sola anotación ya es un error de quien mide. */
export const MAX_CANTIDAD = Number.MAX_SAFE_INTEGER;

/**
 * ¿ES ESTO UN HECHO DE USO? Estructural, sobre lo ya construido.
 *
 * Lo que más importa que rechace: una métrica de NIVEL amarrada a una operación
 * física. Los bytes almacenados no ocurren en un PUT — están, y se fotografían
 * por periodo. Admitirlos como flujo los haría sumables, y sumar niveles es la
 * forma silenciosa de multiplicar una factura.
 */
export const usoValido = (u: UsoMedido | undefined): boolean => {
  if (!u || typeof u !== 'object') return false;
  if (!FORMA_DE_IDENTIFICADOR.test(u.accountId ?? '')) return false;
  if (!texto(u.providerId, 64)) return false;
  if (!esOperacionFisica(u.operacion)) return false;
  if (!esMetrica(u.metrica)) return false;

  /* La unidad tiene que estar DICHA, y coincidir con la métrica cuando Weë la nombra. */
  const esperada = unidadDe(u.metrica);
  if (esperada !== undefined) {
    if (u.unidad !== esperada) return false;
  } else if (u.unidad !== 'unidad_del_proveedor') {
    return false;
  }

  if (!Number.isSafeInteger(u.cantidad) || u.cantidad < 0 || u.cantidad > MAX_CANTIDAD) return false;
  if (!Number.isFinite(u.occurredAt)) return false;

  /* Un nivel se amarra a un periodo; un flujo, a una operación física. */
  const ancla = anclaEstable(u.ancla);
  if (!ancla) return false;
  if (esNivel(u.metrica) !== ancla.startsWith('periodo:')) return false;

  if (u.assetId !== undefined && !FORMA_DE_IDENTIFICADOR.test(u.assetId)) return false;
  if (u.objectRef !== undefined && !FORMA_DE_IDENTIFICADOR.test(u.objectRef)) return false;
  if (u.corrige !== undefined && !FORMA_DE_USO.test(u.corrige)) return false;
  if (u.region !== undefined && !texto(u.region, 64)) return false;

  /* La metadata es escalar, pequeña y sin nada que parezca una credencial. */
  if (u.metadata !== undefined) {
    if (typeof u.metadata !== 'object' || u.metadata === null) return false;
    const claves = Object.keys(u.metadata);
    if (claves.length > 16) return false;
    for (const k of claves) {
      const v = u.metadata[k];
      const t = typeof v;
      if (t !== 'string' && t !== 'number' && t !== 'boolean') return false;
      if (t === 'string' && (v as string).length > 200) return false;
    }
    if (!payloadLimpio(u.metadata)) return false;
  }
  return true;
};

/**
 * LA IDENTIDAD DE UN HECHO. Derivada, nunca sorteada.
 *
 * Lleva dentro la cuenta, el proveedor, la operación, la métrica y el ancla — y
 * deliberadamente **NO la cantidad**. Dos avisos del mismo PUT que no se pongan
 * de acuerdo en cuántos bytes fueron siguen siendo el mismo hecho: meter la
 * cantidad en la identidad los convertiría en dos, y entonces un desacuerdo
 * entre dos trabajadores se cobraría dos veces.
 *
 * La métrica sí entra, porque un PUT produce dos hechos distintos —los bytes y
 * la operación— y tienen que poder convivir.
 */
export const identidadDeUso = (huella: Huella, u: UsoMedido): string | undefined => {
  if (!usoValido(u)) return undefined;
  const ancla = anclaEstable(u.ancla);
  const material = [u.accountId, u.providerId, u.operacion, u.metrica, ancla].join('|');
  const hex = huella(material);
  if (typeof hex !== 'string' || !/^[0-9a-f]{32,}$/.test(hex)) return undefined;
  return `use_${hex.slice(0, 32)}`;
};

/** Un hecho con su identidad puesta, o nada si no lo es. */
export const sellarUso = (huella: Huella, u: UsoMedido): EventoDeUso | undefined => {
  const usageId = identidadDeUso(huella, u);
  return usageId ? Object.freeze({ ...u, usageId }) : undefined;
};

/* ── 5 · El agregado ───────────────────────────────────────────────────────── */

/**
 * EL PERIODO. Un día o un mes, y nada más fino.
 *
 * Más fino no sirve para nada —ningún proveedor factura por hora— y multiplica
 * los documentos por veinticuatro. Más grueso pierde la capacidad de cuadrar un
 * ciclo de facturación.
 */
export type Periodo = string;
export const FORMA_DE_PERIODO = /^\d{4}-\d{2}(-\d{2})?$/;
export const esPeriodo = (v: unknown): v is Periodo =>
  typeof v === 'string' && FORMA_DE_PERIODO.test(v);

export interface ClaveDeAgregado {
  providerId: string;
  accountId: string;
  periodo: Periodo;
  metrica: MetricaDeUso;
}

/**
 * LA CLAVE DE UN AGREGADO, y con ella el PARTICIONADO.
 *
 * La cuenta va dentro, y eso es lo que impide que exista un contador global.
 * Diez millones de cuentas escriben en diez millones de sitios distintos; un
 * documento por cuenta y periodo no lo toca nadie más que esa cuenta, así que no
 * hay documento caliente por muchos que seamos.
 */
export const claveDeAgregado = (c: ClaveDeAgregado | undefined): string | undefined => {
  if (!c || typeof c !== 'object') return undefined;
  if (!texto(c.providerId, 64) || !FORMA_DE_IDENTIFICADOR.test(c.accountId ?? '')) return undefined;
  if (!esPeriodo(c.periodo) || !esMetrica(c.metrica)) return undefined;
  return `${c.providerId}|${c.accountId}|${c.periodo}|${c.metrica}`;
};

/**
 * LO ACUMULADO, con la prueba de con qué se acumuló.
 *
 * `huella` es lo que convierte esto en verificable: es el resumen de los
 * `usageId` que entraron, así que mañana se puede volver al detalle y comprobar
 * que el agregado dice la verdad. Sin ella, compactar el detalle sería tirar la
 * única forma de auditar lo que queda.
 */
export interface AgregadoDeUso extends ClaveDeAgregado {
  clave: string;
  unidad: UnidadDeUso;
  cantidad: number;
  eventos: number;
  huella: string;
  desde: number;
  hasta: number;
}

/**
 * SUMAR LO QUE SE SUMA, Y NO SUMAR LO QUE NO.
 *
 * Tres cosas pasan aquí y las tres importan:
 *
 *   · **Se deduplica por `usageId`.** Dos trabajadores que informen del mismo
 *     PUT dejan un hecho, no dos. Es la convergencia que pide la concurrencia.
 *   · **Las correcciones sustituyen.** Un hecho al que otro corrige no cuenta;
 *     cuenta el que corrige. Los dos siguen guardados.
 *   · **Un nivel no se suma: se queda el último.** Treinta fotos de un gigabyte
 *     almacenado son un gigabyte, no treinta.
 */
export const agregarUso = (
  huellaDe: Huella,
  eventos: readonly EventoDeUso[],
  clave: ClaveDeAgregado,
): AgregadoDeUso | undefined => {
  const k = claveDeAgregado(clave);
  if (!k || !Array.isArray(eventos)) return undefined;

  /*
   * Uno por identidad: llegar dos veces no cuenta dos veces.
   *
   * ── Y cuál de los dos se queda depende de qué se está midiendo ────────────
   *
   * En un FLUJO gana el primero: el hecho ya ocurrió y es inmutable, así que un
   * segundo aviso del mismo PUT no lo mejora — solo confirma que llegó dos veces.
   *
   * En un NIVEL gana el último, y no es una excepción: un nivel ES «cuánto hay
   * ahora», así que volver a medir el mismo periodo no repite un hecho, lo
   * ACTUALIZA. Con «gana el primero» una foto equivocada quedaría congelada
   * para siempre, porque su corrección tiene por fuerza la misma identidad —el
   * periodo es el mismo— y se descartaría a sí misma.
   */
  const nivel = esNivel(clave.metrica);
  const porId = new Map<string, EventoDeUso>();
  for (const e of eventos) {
    if (!e || !FORMA_DE_USO.test(e.usageId ?? '') || !usoValido(e)) return undefined;
    if (e.accountId !== clave.accountId || e.providerId !== clave.providerId || e.metrica !== clave.metrica) {
      return undefined;
    }
    const anterior = porId.get(e.usageId);
    if (!anterior || (nivel && e.occurredAt > anterior.occurredAt)) porId.set(e.usageId, e);
  }

  /* Lo corregido no cuenta; su corrección sí. */
  const corregidos = new Set<string>();
  for (const e of porId.values()) if (e.corrige) corregidos.add(e.corrige);
  const vivos = [...porId.values()].filter((e) => !corregidos.has(e.usageId));

  const unidad = unidadDe(clave.metrica) ?? 'unidad_del_proveedor';
  if (!vivos.length) {
    return Object.freeze({
      ...clave, clave: k, unidad, cantidad: 0, eventos: 0,
      huella: huellaDe(''), desde: 0, hasta: 0,
    });
  }

  const ordenados = [...vivos].sort((a, b) => a.occurredAt - b.occurredAt
    || (a.usageId < b.usageId ? -1 : a.usageId > b.usageId ? 1 : 0));

  const cantidad = nivel
    ? ordenados[ordenados.length - 1].cantidad
    : ordenados.reduce((t, e) => t + e.cantidad, 0);
  if (!Number.isSafeInteger(cantidad)) return undefined;

  return Object.freeze({
    ...clave,
    clave: k,
    unidad,
    cantidad,
    eventos: ordenados.length,
    huella: huellaDe(ordenados.map((e) => e.usageId).sort().join(',')),
    desde: ordenados[0].occurredAt,
    hasta: ordenados[ordenados.length - 1].occurredAt,
  });
};

/* ── 6 · El precio, que lo declara el proveedor ────────────────────────────── */

/**
 * LO QUE COBRA UN PROVEEDOR, DICHO POR SU DESCRIPTOR.
 *
 * ── Por qué `precio` + `porCantidad` y no un precio unitario ────────────────
 *
 * Porque casi ninguna tarifa cabe en una unidad mínima. «Quince milésimas de
 * dólar por gigabyte-mes» no es un entero de céntimos, y escribirlo como
 * `0.015` reintroduce la coma flotante justo en el sitio donde acaba en una
 * factura. Declarando «1500 céntimos por cada 100 gigabyte-mes» la tarifa es
 * exacta, la aritmética es entera, y el proveedor puede expresar cualquier
 * precio por pequeño que sea eligiendo su cantidad de referencia.
 *
 * `fuente` y `vigenteDesde` no son adorno: un coste que no puede decir de dónde
 * salió su precio ni de cuándo era no se puede auditar, y es lo primero que
 * pregunta quien cuadra una factura.
 */
export interface PrecioDeProveedor {
  providerId: string;
  metrica: MetricaDeUso;
  /** Cuánto cuestan `porCantidad` unidades de la métrica. */
  precio: Money;
  porCantidad: number;
  /** Por operación, o por periodo —el almacenamiento se cobra por mes—. */
  base: 'operacion' | 'mes';
  /** De dónde salió. La documentación del proveedor, una factura, un contrato. */
  fuente: string;
  vigenteDesde: number;
  vigenteHasta?: number;
  region?: string;
}

export const precioValido = (p: PrecioDeProveedor | undefined): boolean => {
  if (!p || typeof p !== 'object') return false;
  if (!texto(p.providerId, 64) || !esMetrica(p.metrica)) return false;
  if (!esMoney(p.precio) || p.precio.amountMinor < 0) return false;
  if (!Number.isSafeInteger(p.porCantidad) || p.porCantidad <= 0) return false;
  if (p.base !== 'operacion' && p.base !== 'mes') return false;
  if (!texto(p.fuente, 200)) return false;
  if (!Number.isFinite(p.vigenteDesde)) return false;
  if (p.vigenteHasta !== undefined && (!Number.isFinite(p.vigenteHasta) || p.vigenteHasta <= p.vigenteDesde)) return false;
  return true;
};

/**
 * EL PRECIO QUE ESTABA VIGENTE ESE DÍA. No el de hoy.
 *
 * Un hecho de hace tres meses se valora con la tarifa de hace tres meses. Usar
 * la actual reescribiría el pasado cada vez que un proveedor cambia de precio, y
 * entonces dos auditorías de la misma semana darían cifras distintas.
 */
export const precioAplicable = (
  precios: readonly PrecioDeProveedor[],
  providerId: string,
  metrica: MetricaDeUso,
  at: number,
): PrecioDeProveedor | undefined => {
  if (!Array.isArray(precios) || !Number.isFinite(at)) return undefined;
  const candidatos = precios.filter((p) =>
    precioValido(p) && p.providerId === providerId && p.metrica === metrica
    && p.vigenteDesde <= at && (p.vigenteHasta === undefined || at < p.vigenteHasta));
  if (!candidatos.length) return undefined;
  /* El más reciente que ya estaba vigente: si dos se solapan, manda el nuevo. */
  return candidatos.reduce((a, b) => (b.vigenteDesde >= a.vigenteDesde ? b : a));
};

/* ── 7 · La observación de coste ───────────────────────────────────────────── */

export type MotivoSinCoste =
  /* Nadie ha declarado tarifa para esta métrica en este proveedor. */
  | 'sin_precio'
  /* Hay tarifas, pero ninguna estaba vigente cuando ocurrió el hecho. */
  | 'precio_no_vigente'
  /* La métrica no es de las que Weë nombra: no hay con qué multiplicar. */
  | 'metrica_desconocida'
  /* La cuenta se sale de los enteros exactos. Antes que mentir, no se contesta. */
  | 'no_calculable'
  | 'uso_invalido';

/**
 * LO QUE VALE UN HECHO. Tres formas, y **ninguna de ellas es cero por defecto**.
 *
 * `desconocido` NO TIENE campo `coste`. No es una convención ni una disciplina:
 * es que el tipo no lo tiene, así que nadie puede leer un cero donde lo que hay
 * es una ausencia. Un desconocido convertido en cero es una factura que cuadra
 * sola y una sorpresa a fin de mes.
 *
 * `estimado` es lo que sale de multiplicar uso por tarifa publicada. `confirmado`
 * solo llega del propio proveedor —su factura, su API de facturación—, y hoy no
 * hay ninguno: MC-7 no consulta a nadie.
 */
export type ObservacionDeCoste =
  | { estado: 'desconocido'; motivo: MotivoSinCoste }
  | { estado: 'estimado'; coste: Money; precio: PrecioDeProveedor; redondeo: 'al_mas_cercano' }
  | { estado: 'confirmado'; coste: Money; fuente: string; obtenidoEn: number };

/**
 * DE UNA MEDIDA Y UNA TARIFA, UN IMPORTE. Con enteros de principio a fin.
 *
 * `precio.amountMinor * cantidad / porCantidad`, y el producto intermedio tiene
 * que caber en un entero exacto. Si no cabe, la respuesta es `no_calculable` y
 * no un número redondeado en silencio: pasar de `Number.MAX_SAFE_INTEGER` no da
 * error en JavaScript, da una cifra plausible y falsa.
 *
 * El redondeo es al más cercano y va DECLARADO en el resultado, porque quien
 * cuadre esto contra una factura necesita poder reproducir la cuenta.
 */
export const calcularCoste = (
  uso: Pick<UsoMedido, 'providerId' | 'metrica' | 'cantidad' | 'occurredAt'>,
  precios: readonly PrecioDeProveedor[],
  at?: number,
): ObservacionDeCoste => {
  if (!uso || typeof uso !== 'object') return { estado: 'desconocido', motivo: 'uso_invalido' };
  if (!Number.isSafeInteger(uso.cantidad) || uso.cantidad < 0) return { estado: 'desconocido', motivo: 'uso_invalido' };
  if (!esMetrica(uso.metrica)) return { estado: 'desconocido', motivo: 'uso_invalido' };
  if (esMetricaPropia(uso.metrica)) return { estado: 'desconocido', motivo: 'metrica_desconocida' };

  const cuando = Number.isFinite(at) ? (at as number) : uso.occurredAt;
  if (!Number.isFinite(cuando)) return { estado: 'desconocido', motivo: 'uso_invalido' };

  const hayTarifas = (precios ?? []).some((p) => precioValido(p) && p.providerId === uso.providerId && p.metrica === uso.metrica);
  const precio = precioAplicable(precios ?? [], uso.providerId, uso.metrica, cuando);
  if (!precio) return { estado: 'desconocido', motivo: hayTarifas ? 'precio_no_vigente' : 'sin_precio' };

  const bruto = precio.precio.amountMinor * uso.cantidad;
  if (!Number.isSafeInteger(bruto)) return { estado: 'desconocido', motivo: 'no_calculable' };
  const importe = Math.round(bruto / precio.porCantidad);
  if (!Number.isSafeInteger(importe)) return { estado: 'desconocido', motivo: 'no_calculable' };

  const coste: Money = { amountMinor: importe, currency: precio.precio.currency };
  if (!esMoney(coste)) return { estado: 'desconocido', motivo: 'no_calculable' };

  return { estado: 'estimado', coste, precio, redondeo: 'al_mas_cercano' };
};

/** ¿Se sabe cuánto vale? Escrito una vez para que nadie lo deduzca de un cero. */
export const seConoceElCoste = (o: ObservacionDeCoste | undefined): boolean =>
  !!o && (o.estado === 'estimado' || o.estado === 'confirmado');

/** El importe, SOLO si se conoce. Devuelve `undefined`, nunca cero. */
export const importeDe = (o: ObservacionDeCoste | undefined): Money | undefined =>
  o && (o.estado === 'estimado' || o.estado === 'confirmado') ? o.coste : undefined;

/* ── 8 · Retención ─────────────────────────────────────────────────────────── */

/**
 * CUÁNTO SE GUARDA CADA COSA, y por qué exactamente eso.
 *
 * **El detalle, 400 días.** Trece ciclos mensuales de facturación: un año entero
 * de periodos comparables más un mes de margen para que una disputa que llega
 * tarde todavía encuentre los hechos con los que se cuadró.
 *
 * **El agregado, siete años.** Es lo que suele exigirse para conservar registros
 * contables, y ocupa una milésima parte.
 *
 * **Lo que NO se borra nunca**: un agregado del que dependa una reconciliación
 * sin cerrar. Por eso compactar el detalle exige que el agregado lleve su
 * `huella`: se puede comprobar que dice la verdad ANTES de perder con qué
 * comprobarlo.
 */
export interface PoliticaDeRetencion {
  detalleMs: number;
  agregadoMs: number;
}

export const POLITICA_DE_RETENCION: PoliticaDeRetencion = Object.freeze({
  detalleMs: 400 * 24 * 60 * 60 * 1000,
  agregadoMs: 7 * 365 * 24 * 60 * 60 * 1000,
});

/**
 * ¿SE PUEDE TIRAR ESTE DETALLE?
 *
 * Solo si ya está agregado Y el agregado coincide con lo que hay. Comprobar la
 * huella antes de compactar es lo que impide que un error de agregación se
 * vuelva permanente en el momento exacto en que se borra la prueba.
 */
export const sePuedeCompactar = (
  agregado: AgregadoDeUso | undefined,
  eventos: readonly EventoDeUso[],
  huellaDe: Huella,
  at: number,
  politica: PoliticaDeRetencion = POLITICA_DE_RETENCION,
): boolean => {
  if (!agregado || !Array.isArray(eventos) || !eventos.length) return false;
  if (!Number.isFinite(at)) return false;
  if (at - agregado.hasta < politica.detalleMs) return false;
  const recalculada = huellaDe([...new Set(eventos.map((e) => e.usageId))].sort().join(','));
  return recalculada === agregado.huella;
};

/* ── 9 · La costura de reconciliación ──────────────────────────────────────── */

/**
 * LO QUE EL PROVEEDOR DICE QUE GASTAMOS.
 *
 * Aquí no se va a buscar: MC-7 no llama a nadie. Esto es la FORMA en la que ese
 * dato entrará cuando alguien lo traiga —de una factura, de una API de
 * facturación, de un CSV— para poder compararlo con lo que Weë midió.
 *
 * Existe por un hueco concreto y conocido: **la descarga que hace un navegador
 * con una URL firmada no pasa por Weë**, así que Weë no puede medirla. El
 * proveedor sí. Esa diferencia no se estima; se lee de aquí cuando haya de
 * dónde.
 */
export interface UsoReportadoPorProveedor {
  providerId: string;
  periodo: Periodo;
  metrica: MetricaDeUso;
  cantidad: number;
  coste?: Money;
  /** Quién lo dijo: «factura», «api de facturación», «csv del panel». */
  fuente: string;
  obtenidoEn: number;
  /** La cuenta, cuando el proveedor sepa desglosar por cuenta. Casi nunca. */
  accountId?: string;
}

export type VeredictoDeReconciliacion =
  | { ok: true; diferencia: number; porMil: number }
  | { ok: false; motivo: 'no_comparable' | 'fuera_de_tolerancia'; diferencia?: number; porMil?: number };

/**
 * ¿CUADRA LO QUE MEDIMOS CON LO QUE NOS COBRAN?
 *
 * Pura, y solo compara: no corrige, no ajusta y no escribe nada. La tolerancia
 * entra por parámetro **sin valor por defecto que perdone** —quien reconcilia
 * decide cuánto es aceptable para esa métrica— porque un umbral inventado aquí
 * haría pasar por bueno un desvío que nadie ha aceptado.
 *
 * `porMil` y no por ciento: los desvíos que importan en almacenamiento son de
 * décimas, y un porcentaje redondeado a entero los esconde.
 */
export const compararConProveedor = (
  nuestro: AgregadoDeUso | undefined,
  suyo: UsoReportadoPorProveedor | undefined,
  toleranciaPorMil: number,
): VeredictoDeReconciliacion => {
  if (!nuestro || !suyo) return { ok: false, motivo: 'no_comparable' };
  if (nuestro.providerId !== suyo.providerId || nuestro.periodo !== suyo.periodo || nuestro.metrica !== suyo.metrica) {
    return { ok: false, motivo: 'no_comparable' };
  }
  if (!Number.isSafeInteger(suyo.cantidad) || suyo.cantidad < 0) return { ok: false, motivo: 'no_comparable' };
  if (!Number.isFinite(toleranciaPorMil) || toleranciaPorMil < 0) return { ok: false, motivo: 'no_comparable' };

  const diferencia = nuestro.cantidad - suyo.cantidad;
  const base = Math.max(suyo.cantidad, 1);
  const porMil = Math.round((Math.abs(diferencia) * 1000) / base);
  return porMil <= toleranciaPorMil
    ? { ok: true, diferencia, porMil }
    : { ok: false, motivo: 'fuera_de_tolerancia', diferencia, porMil };
};

/* ── 10 · El medidor ───────────────────────────────────────────────────────── */

/**
 * POR DONDE SALE UNA MEDIDA. Una función, y que no pueda fallar hacia arriba.
 *
 * Devuelve `void` a propósito: medir no puede romper la operación que mide. Si
 * el guardado de la medida falla, falla la medida — no el PUT que ya se hizo y
 * que el proveedor ya va a cobrar. Quien implemente esto encola, reintenta o
 * pierde la medida, pero no tira hacia arriba.
 *
 * Es la costura que MC-4, MC-5 y MC-6 dejaron declarada como
 * `anotarOperacionFisica` y que ahora tiene una forma sola en vez de tres
 * parecidas.
 */
export interface MedidorDeUso {
  medir(uso: UsoMedido): void;
}

/**
 * Los hechos que produce una escritura de bytes: SIEMPRE dos.
 *
 * Los proveedores de objetos cobran las dos cosas por separado —el volumen y la
 * petición— y juntarlas en un solo hecho haría imposible cuadrar ninguna de las
 * dos. Está escrito una vez para que las cinco fases que miden no lo escriban
 * cada una a su manera.
 */
export const usoDeEscritura = (
  base: Omit<UsoMedido, 'metrica' | 'unidad' | 'cantidad'>,
  bytes: number,
): readonly UsoMedido[] => Object.freeze([
  { ...base, metrica: 'bytes_escritos' as const, unidad: 'byte' as const, cantidad: bytes },
  { ...base, metrica: 'operaciones' as const, unidad: 'operacion' as const, cantidad: 1 },
]);

/** Lo mismo para una lectura. */
export const usoDeLectura = (
  base: Omit<UsoMedido, 'metrica' | 'unidad' | 'cantidad'>,
  bytes: number,
): readonly UsoMedido[] => Object.freeze([
  { ...base, metrica: 'bytes_leidos' as const, unidad: 'byte' as const, cantidad: bytes },
  { ...base, metrica: 'operaciones' as const, unidad: 'operacion' as const, cantidad: 1 },
]);

/** Una operación que no mueve bytes: un borrado, una consulta de metadatos. */
export const usoDeOperacion = (
  base: Omit<UsoMedido, 'metrica' | 'unidad' | 'cantidad'>,
): readonly UsoMedido[] => Object.freeze([
  { ...base, metrica: 'operaciones' as const, unidad: 'operacion' as const, cantidad: 1 },
]);

/**
 * LA FOTO DE UN NIVEL. Lo que hay guardado, no lo que se guardó.
 *
 * Su ancla es el PERIODO y no una operación, porque no ocurrió en ninguna: es
 * el resultado de mirar. Dos fotos del mismo periodo son la misma foto —misma
 * identidad, no se cuenta dos veces—, y una foto corregida sustituye a la
 * anterior sin borrarla.
 *
 * Es también la razón por la que el almacenamiento no genera un hecho por
 * segundo: se fotografía una vez por periodo y ya está.
 */
export const usoDeNivel = (
  base: Omit<UsoMedido, 'metrica' | 'unidad' | 'cantidad' | 'ancla' | 'operacion'>,
  metrica: Extract<MetricaConocida, 'bytes_almacenados'>,
  cantidad: number,
  periodo: Periodo,
): UsoMedido => ({
  ...base,
  /* Mirar cuánto hay ES una consulta de metadatos: la operación que de verdad ocurrió. */
  operacion: 'object.head',
  metrica,
  unidad: UNIDAD_DE_METRICA[metrica],
  cantidad,
  ancla: { periodo },
});
