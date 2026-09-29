/**
 * WEË FILMMAKER · UNA TOMA DE UN PLANO, DESDE LA APP (F1-D).
 *
 * Lo que se enseña de la unidad elegida —un plano, o una escena sin planos— y lo
 * que se le pide al servidor, en este orden:
 *
 *   1 · al elegirla se CONSULTA qué tomas tiene y si hay una en proceso. Es una
 *       cotización sin calidad: no reserva nada ni gasta cupo;
 *   2 · la persona elige la calidad —no hay una por defecto— y se COTIZA: el
 *       precio y lo que de verdad se va a generar (duración, formato, sonido);
 *   3 · «Generar» pide ESA toma por ESE precio. El requestId lo calcula el
 *       servidor con la cuenta, la producción, la unidad y el número de toma:
 *       aquí no se inventa ningún id, así que dos clics, dos pestañas o un
 *       reintento son la misma operación y un solo cobro;
 *   4 · mientras se hace, se ESCUCHA la reserva de Credits de esa toma, que es
 *       la fuente que ya existe: AUTHORIZED es «en proceso», COMPLETED que
 *       terminó y se cobró, REFUNDED o FAILED que no salió y se devolvió. Ni
 *       porcentajes, ni relojes, ni preguntar cada tanto. De ella salen también
 *       los tres números que siempre se enseñan: reservados, cobrados, devueltos;
 *   5 · cuando termina, se le pide al servidor que ponga el vídeo en SU plano.
 *       Él lo comprueba todo; si el plano cambió mientras tanto, no lo pone, y
 *       se dice.
 *
 * Tras el canary real (2026-09-28): las calidades que el servidor no puede
 * generar llegan marcadas y no se piden; un fallo del proveedor llega en una de
 * cinco categorías, sin nada de dentro; y si el TRABAJO ya terminó mientras la
 * reserva sigue abierta, no se dice «en proceso» de algo que ya no se hace.
 *
 * Sin React, sin Firebase y sin frases: el servicio entra por parámetro —así se
 * prueba entero en Node, en `functions/test/f1d-cliente.test.mjs`— y lo que se
 * enseña son códigos que quien pinta traduce.
 */
import { buscarEscena, requisitosDeProduccion } from '../services/filmmaker/dominio';
import type { ProduccionGuardada } from '../services/filmmakerService';

/* ── Lo que viaja ─────────────────────────────────────────────────────────── */

export type CalidadDeToma = 'standard' | 'high' | 'max';
/** Las tres, en el orden en que se ofrecen. Ninguna viene elegida: la elige la persona. */
export const CALIDADES_DE_TOMA: readonly CalidadDeToma[] = Object.freeze(['standard', 'high', 'max'] as CalidadDeToma[]);

/** El estado de la reserva de Credits de una toma, tal como la escribe el Credit Engine. */
export type EstadoDeReserva = 'PENDING' | 'AUTHORIZED' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

/* ── Las tomas de una unidad, como las cuenta el servidor (Fase 24 del motor; `shots`, `shot.takes`) ─── */

/** En qué está una toma: los estados de la Fase 2, tal cual. */
export const ESTADOS_DE_TOMA_VISTA = Object.freeze(['queued', 'preparing', 'accepted', 'processing', 'completed', 'failed', 'refunded', 'reconciling'] as const);
export type EstadoDeTomaVista = typeof ESTADOS_DE_TOMA_VISTA[number];
/** Si es la que está en su plano, la que la sustituyó otra más nueva, la de un plano que cambió… */
export const ENLACES_DE_TOMA_VISTA = Object.freeze(['linked', 'pending', 'superseded', 'stale', 'none'] as const);
export type EnlaceDeTomaVista = typeof ENLACES_DE_TOMA_VISTA[number];

export interface TomaVista {
  readonly take: number;
  readonly requestId: string;
  readonly state: EstadoDeTomaVista;
  readonly credits: { readonly reserved: number; readonly charged: number; readonly refunded: number };
  /** Su vídeo, si es suyo y está listo. */
  readonly assetId?: string;
  readonly link: EnlaceDeTomaVista;
}

const numeroNoNegativo = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

/** Lo que se acepta de una toma que cuenta el servidor. Con un estado o un enlace que no se conoce, no se enseña. */
export const tomaVista = (x: unknown): TomaVista | null => {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (typeof o.take !== 'number' || !Number.isInteger(o.take) || o.take < 1) return null;
  if (typeof o.requestId !== 'string' || !o.requestId) return null;
  if (!(ESTADOS_DE_TOMA_VISTA as readonly unknown[]).includes(o.state)) return null;
  if (!(ENLACES_DE_TOMA_VISTA as readonly unknown[]).includes(o.link)) return null;
  const c = (typeof o.credits === 'object' && o.credits !== null ? o.credits : {}) as Record<string, unknown>;
  return {
    take: o.take,
    requestId: o.requestId,
    state: o.state as EstadoDeTomaVista,
    credits: { reserved: numeroNoNegativo(c.reserved), charged: numeroNoNegativo(c.charged), refunded: numeroNoNegativo(c.refunded) },
    ...(typeof o.assetId === 'string' && o.assetId ? { assetId: o.assetId } : {}),
    link: o.link as EnlaceDeTomaVista,
  };
};

/**
 * LO QUE LA TOMA HA MOVIDO DE CREDITS, en los tres números que la persona tiene
 * que poder leer siempre: cuánto se reservó, cuánto se cobró y cuánto se devolvió.
 * Sale de la reserva que ya escribe el Credit Engine; aquí no se calcula ningún precio.
 */
export interface EconomiaDeToma {
  readonly toma: number;
  readonly estado: EstadoDeReserva;
  readonly reservados: number;
  readonly cobrados: number;
  readonly reembolsados: number;
}

/**
 * LOS TRES NÚMEROS, desde el documento de la reserva tal como lo escribe el
 * Credit Engine: `amount` negativo al reservar, `finalAmount` al cobrar. Pura.
 *
 *   AUTHORIZED / PENDING → reservado, nada cobrado ni devuelto todavía
 *   COMPLETED            → cobrado lo capturado; lo que sobre de la reserva, devuelto
 *   REFUNDED             → devuelto entero
 *   FAILED               → la reserva no llegó a hacerse: nada
 */
export const economiaDeLaReserva = (toma: number, doc: { status?: unknown; amount?: unknown; finalAmount?: unknown } | null | undefined): EconomiaDeToma | null => {
  if (!doc || typeof doc.status !== 'string') return null;
  const estado = doc.status as EstadoDeReserva;
  const reservado = typeof doc.amount === 'number' && Number.isFinite(doc.amount) ? Math.abs(doc.amount) : 0;
  if (estado === 'FAILED') return { toma, estado, reservados: 0, cobrados: 0, reembolsados: 0 };
  if (estado === 'REFUNDED') return { toma, estado, reservados: reservado, cobrados: 0, reembolsados: reservado };
  if (estado === 'COMPLETED') {
    const final = typeof doc.finalAmount === 'number' && Number.isFinite(doc.finalAmount) ? Math.min(reservado, Math.max(0, doc.finalAmount)) : reservado;
    return { toma, estado, reservados: reservado, cobrados: final, reembolsados: reservado - final };
  }
  return { toma, estado, reservados: reservado, cobrados: 0, reembolsados: 0 };
};

/**
 * POR QUÉ NO SALIÓ UNA GENERACIÓN, en una de las cinco categorías que manda el
 * servidor (`functions/src/creator/fallos.ts`). Nunca el detalle de dentro.
 */
export const CATEGORIAS_DE_FALLO = Object.freeze([
  'MODEL_UNAVAILABLE', 'PROVIDER_TEMPORARY_ERROR', 'PROVIDER_REJECTED', 'TIMEOUT', 'UNKNOWN_PROVIDER_ERROR',
] as const);
export type CategoriaDeFallo = typeof CATEGORIAS_DE_FALLO[number];
export const esCategoriaDeFallo = (v: unknown): v is CategoriaDeFallo => typeof v === 'string' && (CATEGORIAS_DE_FALLO as readonly string[]).includes(v);

/** Si una calidad se puede pedir para este plano, y si no, por qué. Lo decide el servidor. */
export type DisponibilidadDeCalidad =
  | { readonly available: true }
  | { readonly available: false; readonly reason: 'model_unavailable' }
  | { readonly available: false; readonly reason: 'quality_not_representable'; readonly reachable?: string; readonly resolution?: string };
export type CalidadesDeToma = Readonly<Partial<Record<CalidadDeToma, DisponibilidadDeCalidad>>>;

/** Qué unidad se genera, sacada de la producción GUARDADA: su revisión y su requisito de F1-A. */
export interface UnidadDeToma {
  readonly productionId: string;
  readonly sceneId: string;
  readonly unitId: string;
  readonly revision: number;
  /** El `ShotRequirement` de la unidad, tal como lo calcula el espejo de F1-A. El texto lo compone el servidor. */
  readonly requirement: unknown;
}

/** Lo que el servidor cuenta de las tomas de una unidad y de su plano. */
export interface TomasDelPlano {
  readonly current: {
    readonly take: number;
    readonly requestId: string;
    readonly status: EstadoDeReserva;
    /**
     * Cómo va el TRABAJO de esa toma, que puede ir por delante de su reserva: ya
     * terminó y la liquidación todavía no pasó. Con esto no se dice «en proceso»
     * de algo que ya no se está haciendo.
     */
    readonly outcome?: 'in_progress' | 'succeeded' | 'failed' | 'reconciling';
    /*
     * `reconciling` (Fase 33, R15): salió hacia el proveedor y no se sabe cómo
     * acabó. Sus Credits siguen apartados hasta saberlo: ni se dice que falló ni
     * que se están devolviendo.
     */
    /** Si falló, su categoría. Nada más de dentro. */
    readonly failure?: string;
    /** La paró la persona (Fase 15 del motor): no es un fallo de nadie. */
    readonly cancelled?: boolean;
  } | null;
  readonly next: { readonly take: number; readonly requestId: string } | null;
  readonly node: { readonly shotNodeId: string; readonly producedAssetId?: string; readonly version: number } | null;
}

/** Lo que de verdad se va a generar, que puede no ser lo pedido (un plano de 2,5 s se genera de 4 s). */
export interface TomaEfectiva {
  readonly requestedDurationSec: number;
  readonly durationSec: number;
  readonly aspectRatio: string;
  readonly resolution: string;
  readonly quality: CalidadDeToma;
  readonly withSound: boolean;
}

export type CotizacionDeToma =
  | { readonly status: 'QUOTED'; readonly allowed: true; readonly credits: number; readonly effective: TomaEfectiva; readonly takes: TomasDelPlano; readonly qualities?: CalidadesDeToma }
  | { readonly status: 'QUOTED'; readonly allowed: false; readonly reason: string; readonly detail?: Readonly<Record<string, unknown>>; readonly takes?: TomasDelPlano; readonly qualities?: CalidadesDeToma };

export interface RespuestaDeGeneracion {
  readonly status: 'ACCEPTED' | 'COMPLETED';
  /** El de la toma, calculado por el servidor. Con él se escucha su reserva. */
  readonly requestId?: string | null;
  readonly take?: number;
  readonly assetId?: string | null;
}

/**
 * LO QUE CONTESTA EL SERVIDOR AL DETENER UNA TOMA (Fase 15 del motor, D11).
 * `state`: `cancelada` (se paró y se devolvió), `devuelta` (no había nada que
 * parar y se devolvió), `cancelando` (pedida; se consuma sola) o `ya_devuelta`.
 * `reason`, cuando no se detuvo: un código que la pantalla traduce.
 */
export type RespuestaDeCancelacion =
  | { readonly status: 'CANCELLED'; readonly state: 'cancelada' | 'devuelta' | 'cancelando' | 'ya_devuelta'; readonly refund?: string }
  | { readonly status: 'NOT_CANCELLED'; readonly reason: string };

/** Cómo va la detención que pidió la persona, para decirlo. */
export type CancelacionDeToma =
  | { readonly estado: 'pidiendo' }
  | { readonly estado: 'hecha'; readonly como: 'cancelada' | 'devuelta' | 'cancelando' | 'ya_devuelta' }
  | { readonly estado: 'rechazada'; readonly motivo: string };

export type ResultadoDelEnlace =
  | { readonly status: 'linked' | 'already'; readonly shotNodeId: string; readonly assetId: string; readonly version: number }
  | { readonly status: 'not_ready' | 'failed' | 'stale' | 'not_found' | 'conflict'; readonly motivo?: string };

/** Por qué no: el motivo que dijo el servidor (o la red), y lo que haga falta para explicarlo. */
export interface RechazoDeToma {
  readonly motivo: string;
  readonly detalle?: Readonly<Record<string, unknown>>;
}

export type ResultadoDeToma<T> = { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly rechazo: RechazoDeToma };

/* ── Filmmaker Engine, Fase 29 · la producción entera: el lote de la Fase 6 ── */

/** Qué pasaría con una unidad en el lote: se genera, ya tiene su vídeo, tiene una toma en marcha o no se puede. */
export type AccionDelLote = 'generate' | 'done' | 'in_flight' | 'blocked';

export interface UnidadDelLote {
  readonly sceneId: string;
  readonly unitId: string;
  readonly action: AccionDelLote;
  /** Por qué no se puede: el motivo de la toma suelta, que la pantalla dice con sus palabras. */
  readonly reason?: string;
  readonly detail?: Readonly<Record<string, unknown>>;
  readonly take?: number;
  readonly credits?: number;
}

/** El presupuesto del lote: cada unidad, el total y el saldo. Ni reserva ni cupo: no toca nada. */
export interface PresupuestoDelLote {
  readonly status: 'QUOTED_BATCH';
  readonly productionId: string;
  readonly revision: number;
  readonly quality: string;
  readonly units: readonly UnidadDelLote[];
  readonly total: { readonly credits: number; readonly units: number };
  readonly skipped: { readonly done: number; readonly inFlight: number; readonly blocked: number };
  /** El saldo de la cuenta; `null` si el servidor no pudo leerlo (entonces el que manda es el Credit Engine). */
  readonly balance: number | null;
  readonly enough: boolean;
}

/** Lo que empezó el lote: una toma por unidad, en orden, y dónde se paró si algo no pudo empezar. */
export interface ResultadoDelLote {
  readonly status: 'STARTED_BATCH' | 'NOTHING_TO_GENERATE';
  readonly units: readonly { readonly sceneId: string; readonly unitId: string; readonly take: number; readonly status: string; readonly reason?: string }[];
  readonly started: number;
  readonly stoppedAt?: string;
}

/** Qué se pide: la producción GUARDADA en su revisión, la calidad de todas y, si no caben todas, cuáles (`units`). */
export interface PeticionDeLote {
  readonly productionId: string;
  readonly revision: number;
  readonly quality: CalidadDeToma;
  readonly units?: readonly string[];
}

/**
 * Las unidades que caben en un lote: las del cupo diario de vídeo. Es el tope del servidor
 * (`MAX_UNIDADES_POR_LOTE` de `creator/lotes.ts`), que contesta `batch_too_large` si se pasa; aquí solo sirve para
 * elegir, si no caben todas, las primeras que faltan.
 */
export const MAX_UNIDADES_POR_LOTE = 12;

/** Lo único que esto necesita de fuera. Ninguna de estas cosas genera ni cobra por su cuenta: lo decide el servidor. */
export interface ServicioDeTomas {
  cotizar(unidad: UnidadDeToma, calidad?: CalidadDeToma): Promise<ResultadoDeToma<CotizacionDeToma>>;
  generar(unidad: UnidadDeToma, calidad: CalidadDeToma, toma: number, creditos: number): Promise<ResultadoDeToma<RespuestaDeGeneracion>>;
  enlazar(unidad: UnidadDeToma, toma: number): Promise<ResultadoDeToma<ResultadoDelEnlace>>;
  /** Detener ESA toma (Fase 15): el servidor decide si se puede y mueve el dinero que toque. */
  cancelar(unidad: UnidadDeToma, toma: number): Promise<ResultadoDeToma<RespuestaDeCancelacion>>;
  /**
   * Escuchar la reserva de una toma: avisa cada vez que cambia. Devuelve cómo
   * dejar de escuchar. Con el estado llega, si se tiene, el documento de la
   * reserva —su importe y lo cobrado—, de donde salen los tres números.
   */
  observarReserva(
    requestId: string,
    alCambiar: (estado: EstadoDeReserva | null, reserva?: { status?: unknown; amount?: unknown; finalAmount?: unknown } | null) => void,
    alFallar: () => void,
  ): () => void;
  urlDelMaterial(assetId: string): Promise<string | null>;
}

/* ── Qué unidad, y si se puede ────────────────────────────────────────────── */

export type SeleccionDeUnidad = { readonly tipo: 'escena' | 'plano'; readonly id: string } | null;

export type EntradaDeToma =
  | { readonly tipo: 'unidad'; readonly unidad: UnidadDeToma }
  | { readonly tipo: 'sin_unidad'; readonly porque: 'nada' | 'escena_con_planos' }
  | { readonly tipo: 'no_disponible'; readonly porque: 'sin_guardar' | 'sin_terminar' | 'archivada' };

/**
 * LA UNIDAD QUE SE GENERARÍA CON LO ELEGIDO, sacada de lo GUARDADO. Con cambios
 * sin guardar no se genera: se generaría una cosa y se vería otra. Una escena
 * con planos no es una unidad: lo son sus planos.
 */
export const entradaDeToma = (guardada: ProduccionGuardada | null, hayCambios: boolean, seleccion: SeleccionDeUnidad): EntradaDeToma => {
  if (!guardada || !seleccion) return { tipo: 'sin_unidad', porque: 'nada' };
  if (seleccion.tipo === 'escena') {
    const escena = buscarEscena(guardada.production, seleccion.id);
    if (escena && escena.scene.shots.length > 0) return { tipo: 'sin_unidad', porque: 'escena_con_planos' };
  }
  if (guardada.status !== 'active') return { tipo: 'no_disponible', porque: 'archivada' };
  if (hayCambios) return { tipo: 'no_disponible', porque: 'sin_guardar' };
  const requisitos = requisitosDeProduccion(guardada.production);
  if (!requisitos.ok) return { tipo: 'no_disponible', porque: 'sin_terminar' };
  const requisito = requisitos.requirements.shots.find((s) => s.unitId === seleccion.id);
  if (!requisito) return { tipo: 'sin_unidad', porque: 'nada' };
  return {
    tipo: 'unidad',
    unidad: { productionId: guardada.productionId, sceneId: requisito.sceneId, unitId: requisito.unitId, revision: guardada.revision, requirement: requisito },
  };
};

/** Lo que distingue una entrada de otra: si cambia, se vuelve a empezar; si no, se sigue donde se estaba. */
export const claveDeEntrada = (e: EntradaDeToma): string =>
  (e.tipo === 'unidad' ? `unidad|${e.unidad.productionId}|${e.unidad.revision}|${e.unidad.unitId}` : `${e.tipo}|${e.porque}`);

/* ── Lo que se enseña ─────────────────────────────────────────────────────── */

export type FaseDeToma =
  | { readonly fase: 'sin_unidad'; readonly porque: 'nada' | 'escena_con_planos' }
  | { readonly fase: 'no_disponible'; readonly porque: 'sin_guardar' | 'sin_terminar' | 'archivada' }
  | { readonly fase: 'consultando' }
  | { readonly fase: 'elige_calidad' }
  | { readonly fase: 'cotizando' }
  | { readonly fase: 'cotizada'; readonly creditos: number; readonly efectiva: TomaEfectiva; readonly toma: number }
  | { readonly fase: 'rechazada'; readonly rechazo: RechazoDeToma }
  | { readonly fase: 'pidiendo' }
  | { readonly fase: 'en_proceso'; readonly toma: number }
  | { readonly fase: 'terminando'; readonly toma: number }
  /*
   * El trabajo ya acabó mal y la reserva todavía no se ha devuelto: la liquidación
   * pasa en unos minutos. No es «en proceso» —ya no se está haciendo nada—, y
   * tampoco se puede pedir otra toma hasta que vuelvan los Credits.
   */
  | { readonly fase: 'cerrando'; readonly toma: number }
  /*
   * R15 (Fase 33): salió hacia el proveedor y no se sabe cómo acabó. Se está
   * comprobando: si salió, se pondrá en su plano; si no, sus Credits volverán.
   * Mientras, no se puede pedir otra toma, porque su dinero sigue apartado.
   */
  | { readonly fase: 'comprobando'; readonly toma: number }
  | { readonly fase: 'error'; readonly rechazo: RechazoDeToma };

/** La última toma que ya terminó, con lo que dejó: su vídeo en el plano, o por qué no está. */
export type UltimaToma =
  | { readonly toma: number; readonly estado: 'lista'; readonly assetId: string; readonly url: string | null }
  /*
   * `categoria`: por qué no salió, si el servidor lo sabe. `pendiente`: el reembolso todavía no se ha hecho.
   * `cancelada`: la detuvo la persona (Fase 15): no es un fallo, y se dice así.
   */
  | { readonly toma: number; readonly estado: 'fallida'; readonly categoria?: CategoriaDeFallo; readonly pendiente?: boolean; readonly cancelada?: boolean }
  | { readonly toma: number; readonly estado: 'sin_enlazar'; readonly motivo: string };

/** El vídeo que el plano del Core tiene puesto (`ShotNode.producedAssetId`): es lo que el plano ES hoy. */
export interface VideoDelPlano {
  readonly assetId: string;
  readonly url: string | null;
  /** Su póster (Fase 11 del motor): una imagen fija del vídeo, si ya la tiene. La tarjeta pinta esto en vez de cargar el vídeo. */
  readonly poster?: string | null;
}

export interface InstantaneaDeToma {
  readonly fase: FaseDeToma;
  readonly calidad: CalidadDeToma | null;
  readonly enElPlano: VideoDelPlano | null;
  readonly ultima: UltimaToma | null;
  /** Lo que acaba de pasar y conviene decir: que el precio cambió entre la cotización y el clic. */
  readonly aviso: 'precio_cambiado' | null;
  /** Qué calidades se pueden pedir para esta unidad, según el servidor. `null` mientras no lo ha dicho. */
  readonly calidades: CalidadesDeToma | null;
  /** Reservados, cobrados y devueltos de la toma en curso o de la última. */
  readonly economia: EconomiaDeToma | null;
  /** La detención que pidió la persona para la toma en curso, si la pidió (Fase 15). */
  readonly cancelacion: CancelacionDeToma | null;
}

export const INSTANTANEA_INICIAL: InstantaneaDeToma = Object.freeze({
  fase: { fase: 'sin_unidad', porque: 'nada' } as FaseDeToma, calidad: null, enElPlano: null, ultima: null, aviso: null, calidades: null, economia: null, cancelacion: null,
});

/** ¿Se puede elegir esta calidad? Sin respuesta del servidor todavía, sí: él lo dirá al cotizar. */
export const calidadDisponible = (calidades: CalidadesDeToma | null, calidad: CalidadDeToma): boolean =>
  calidades?.[calidad]?.available !== false;

const VIVAS: ReadonlySet<string> = new Set(['PENDING', 'AUTHORIZED']);
const DEVUELTAS: ReadonlySet<string> = new Set(['FAILED', 'REFUNDED']);
/** Lo que dice que la toma ya existe: no se reintenta, se consulta y se sigue la que hay. */
const YA_PEDIDA: ReadonlySet<string> = new Set(['take_in_flight', 'DUPLICATE_REQUEST']);
/** Mientras pasa esto, elegir otra calidad no hace nada: hay una respuesta en camino o una toma en marcha. */
const OCUPADA: ReadonlySet<FaseDeToma['fase']> = new Set(['consultando', 'pidiendo', 'en_proceso', 'terminando', 'cerrando', 'comprobando', 'sin_unidad', 'no_disponible']);

export const crearControladorDeToma = (servicio: ServicioDeTomas) => {
  let entrada: EntradaDeToma = { tipo: 'sin_unidad', porque: 'nada' };
  let unidad: UnidadDeToma | null = null;
  /* Cada vez que se abre otra cosa o se cierra, cambia: lo que llegue de antes ya no es de aquí. */
  let vuelta = 0;
  /* Y cada petición lleva su número: si la persona toca dos calidades seguidas, gana la última. */
  let pedido = 0;
  let dejarDeEscuchar: (() => void) | null = null;
  /* Cuál es la escucha vigente: la respuesta de una anterior ya no cuenta. */
  let escucha = 0;
  let instantanea: InstantaneaDeToma = INSTANTANEA_INICIAL;
  const oyentes = new Set<() => void>();

  const poner = (cambio: Partial<InstantaneaDeToma>): void => {
    instantanea = { ...instantanea, ...cambio };
    oyentes.forEach((f) => f());
  };
  const callar = (): void => {
    escucha++;
    if (dejarDeEscuchar) { dejarDeEscuchar(); dejarDeEscuchar = null; }
  };
  const vigente = (v: number, p?: number): boolean => v === vuelta && (p === undefined || p === pedido);

  /** Terminó y se cobró: que el servidor ponga el vídeo en su plano. Lo que él diga es lo que hay. */
  const cerrarTerminada = async (v: number, toma: number): Promise<{ ultima?: UltimaToma; enElPlano?: VideoDelPlano; rechazo?: RechazoDeToma }> => {
    if (!unidad) return {};
    const r = await servicio.enlazar(unidad, toma);
    if (!vigente(v)) return {};
    if (!r.ok) return { rechazo: r.rechazo };
    const e = r.valor;
    if (e.status === 'linked' || e.status === 'already') {
      const conocido = instantanea.enElPlano?.assetId === e.assetId ? instantanea.enElPlano : null;
      const url = conocido ? conocido.url : await servicio.urlDelMaterial(e.assetId);
      return { ultima: { toma, estado: 'lista', assetId: e.assetId, url }, enElPlano: { assetId: e.assetId, url } };
    }
    if (e.status === 'failed') return { ultima: { toma, estado: 'fallida' } };
    if (e.status === 'not_ready') return {};
    const motivo = 'motivo' in e && typeof e.motivo === 'string' ? e.motivo : e.status;
    return { ultima: { toma, estado: 'sin_enlazar', motivo } };
  };

  const terminar = async (v: number, toma: number): Promise<void> => {
    poner({ fase: { fase: 'terminando', toma } });
    const cierre = await cerrarTerminada(v, toma);
    if (!vigente(v)) return;
    if (cierre.rechazo) { poner({ fase: { fase: 'error', rechazo: cierre.rechazo } }); return; }
    poner({ fase: { fase: 'elige_calidad' }, calidad: null, ...(cierre.ultima ? { ultima: cierre.ultima } : {}), ...(cierre.enElPlano ? { enElPlano: cierre.enElPlano } : {}) });
  };

  /**
   * ESCUCHAR LA RESERVA DE UNA TOMA. De ella salen siempre los tres números
   * —reservados, cobrados, devueltos—, y mientras la toma sigue viva, también el
   * paso siguiente:
   *
   *   · en proceso → COMPLETED: se pone el vídeo en su plano; REFUNDED o FAILED:
   *     se vuelve a consultar, porque el porqué lo sabe el servidor;
   *   · cerrando (el trabajo ya falló) → REFUNDED: se consulta y queda devuelta;
   *   · terminando (el trabajo ya salió bien) → COMPLETED: se pone en su plano;
   *   · solo los números: una toma que ya terminó, para enseñar lo que movió.
   *
   * Cada escucha tiene su número: la que llegue de una escucha anterior no cuenta,
   * aunque llegue en el mismo instante en que se abre la siguiente.
   */
  const escuchar = (v: number, toma: number, requestId: string, modo: 'en_proceso' | 'cerrando' | 'comprobando' | 'terminando' | 'solo_numeros'): void => {
    callar();
    const mia = escucha;
    if (modo !== 'solo_numeros') poner({ fase: { fase: modo, toma } });
    const dejar = servicio.observarReserva(
      requestId,
      (estado, reserva) => {
        if (mia !== escucha || !vigente(v)) return;
        if (reserva) {
          const economia = economiaDeLaReserva(toma, reserva);
          if (economia) poner({ economia });
        }
        if (!estado) return;
        if (modo === 'solo_numeros') { if (!VIVAS.has(estado)) callar(); return; }
        if (VIVAS.has(estado)) return;
        callar();
        if (DEVUELTAS.has(estado)) {
          /* Se dice al momento que no salió y que volvieron sus Credits; el porqué lo trae la consulta, del trabajo guardado. */
          const previa = instantanea.ultima?.toma === toma && instantanea.ultima.estado === 'fallida' ? instantanea.ultima.categoria : undefined;
          /*
           * Si la persona pidió detenerla y el servidor no lo rechazó, se dice eso y no que falló. La devolución
           * puede llegar por aquí ANTES que la respuesta de la llamada: basta con que se pidiera y no se rechazara.
           */
          const detenida = !!instantanea.cancelacion && instantanea.cancelacion.estado !== 'rechazada';
          poner({ ultima: { toma, estado: 'fallida', ...(previa && !detenida ? { categoria: previa } : {}), ...(detenida ? { cancelada: true } : {}) } });
          void consultar(v);
          return;
        }
        if (estado === 'COMPLETED') void terminar(v, toma);
      },
      () => {
        if (mia !== escucha || !vigente(v)) return;
        callar();
        if (modo !== 'solo_numeros') poner({ fase: { fase: 'error', rechazo: { motivo: 'network' } } });
      },
    );
    /* Si la primera respuesta llegó dentro de la propia llamada y ya dejó de escuchar, se suelta aquí. */
    if (mia === escucha) dejarDeEscuchar = dejar; else dejar();
  };

  /**
   * UNA TOMA CUYA RESERVA SIGUE VIVA. Lo normal es que se esté haciendo; pero el
   * TRABAJO puede haber terminado ya y la liquidación no haber pasado. Entonces
   * no se dice «en proceso»: si salió mal, se dice que no salió y que los Credits
   * se están devolviendo; si salió bien, que se está poniendo en su sitio.
   */
  const seguirLaViva = (v: number, actual: NonNullable<TomasDelPlano['current']>): void => {
    /* R15: no se sabe cómo acabó. Ni «falló» ni «se están devolviendo»: se comprueba, y la reserva dirá el final. */
    if (actual.outcome === 'reconciling') { escuchar(v, actual.take, actual.requestId, 'comprobando'); return; }
    if (actual.outcome === 'failed') {
      const categoria = !actual.cancelled && esCategoriaDeFallo(actual.failure) ? actual.failure : undefined;
      poner({ ultima: { toma: actual.take, estado: 'fallida', ...(categoria ? { categoria } : {}), ...(actual.cancelled ? { cancelada: true } : {}), pendiente: true } });
      escuchar(v, actual.take, actual.requestId, 'cerrando');
      return;
    }
    escuchar(v, actual.take, actual.requestId, actual.outcome === 'succeeded' ? 'terminando' : 'en_proceso');
  };

  /** Lo que dice una cotización: el precio, que hay una toma en marcha, o por qué no. */
  const aplicar = (v: number, q: CotizacionDeToma, conCalidad: boolean): void => {
    if (q.qualities) poner({ calidades: q.qualities });
    if (q.allowed) {
      if (!q.takes.next) { poner({ fase: { fase: 'rechazada', rechazo: { motivo: 'unknown' } } }); return; }
      poner({ fase: { fase: 'cotizada', creditos: q.credits, efectiva: q.effective, toma: q.takes.next.take } });
      return;
    }
    const actual = q.takes?.current;
    if (actual && VIVAS.has(actual.status)) { seguirLaViva(v, actual); return; }
    if (!conCalidad && q.reason === 'quality_required') { poner({ fase: { fase: 'elige_calidad' } }); return; }
    poner({ fase: { fase: 'rechazada', rechazo: { motivo: q.reason, ...(q.detail ? { detalle: q.detail } : {}) } } });
  };

  const consultar = async (v: number): Promise<void> => {
    if (!unidad) return;
    const p = ++pedido;
    poner({ fase: { fase: 'consultando' } });
    const r = await servicio.cotizar(unidad);
    if (!vigente(v, p)) return;
    if (!r.ok) { poner({ fase: { fase: 'error', rechazo: r.rechazo } }); return; }
    if (r.valor.qualities) poner({ calidades: r.valor.qualities });
    /* Lo que el plano tiene puesto ahora, sea de la toma que sea. */
    const puesto = r.valor.takes?.node?.producedAssetId;
    if (puesto) {
      const url = await servicio.urlDelMaterial(puesto);
      if (!vigente(v, p)) return;
      poner({ enElPlano: { assetId: puesto, url } });
    }
    const actual = r.valor.takes?.current ?? null;
    if (actual && VIVAS.has(actual.status)) { seguirLaViva(v, actual); return; }
    if (actual && actual.status === 'COMPLETED') {
      /* Terminó: que el servidor diga si su vídeo está en el plano, y si no, que lo ponga si todavía se puede. */
      const cierre = await cerrarTerminada(v, actual.take);
      if (!vigente(v, p)) return;
      if (cierre.ultima) poner({ ultima: cierre.ultima, ...(cierre.enElPlano ? { enElPlano: cierre.enElPlano } : {}) });
      escuchar(v, actual.take, actual.requestId, 'solo_numeros');
    } else if (actual && DEVUELTAS.has(actual.status)) {
      /* El porqué lo dice el servidor desde el trabajo; si no lo sabe, se conserva el que trajo el error de la generación. */
      const previa = instantanea.ultima?.toma === actual.take && instantanea.ultima.estado === 'fallida' ? instantanea.ultima.categoria : undefined;
      const categoria = esCategoriaDeFallo(actual.failure) ? actual.failure : previa;
      /* La detuvo la persona (Fase 15): lo dice el trabajo guardado, o lo dijo el servidor al detenerla. */
      const detenida = actual.cancelled === true
        || (instantanea.ultima?.toma === actual.take && instantanea.ultima.estado === 'fallida' && instantanea.ultima.cancelada === true);
      poner({ ultima: { toma: actual.take, estado: 'fallida', ...(categoria && !detenida ? { categoria } : {}), ...(detenida ? { cancelada: true } : {}) } });
      escuchar(v, actual.take, actual.requestId, 'solo_numeros');
    }
    aplicar(v, r.valor, false);
  };

  const cotizarCon = async (v: number, calidad: CalidadDeToma, aviso: InstantaneaDeToma['aviso']): Promise<void> => {
    if (!unidad) return;
    const p = ++pedido;
    poner({ calidad, aviso, fase: { fase: 'cotizando' } });
    const r = await servicio.cotizar(unidad, calidad);
    if (!vigente(v, p)) return;
    if (!r.ok) { poner({ fase: { fase: 'error', rechazo: r.rechazo } }); return; }
    aplicar(v, r.valor, true);
  };

  /** Elegir la calidad es pedir precio. No reserva nada. Una calidad que el servidor dijo que no está, no se pide. */
  const elegirCalidad = (calidad: CalidadDeToma): void => {
    if (!unidad || OCUPADA.has(instantanea.fase.fase)) return;
    if (!calidadDisponible(instantanea.calidades, calidad)) return;
    void cotizarCon(vuelta, calidad, null);
  };

  /** «Generar»: ESA toma por ESE precio. Si el precio cambió, se vuelve a cotizar y se dice; no se genera. */
  const generar = (): void => {
    const f = instantanea.fase;
    const calidad = instantanea.calidad;
    if (!unidad || f.fase !== 'cotizada' || !calidad) return;
    const v = vuelta;
    const p = ++pedido;
    const laUnidad = unidad;
    poner({ fase: { fase: 'pidiendo' }, aviso: null, cancelacion: null });
    void (async () => {
      const r = await servicio.generar(laUnidad, calidad, f.toma, f.creditos);
      if (!vigente(v, p)) return;
      if (r.ok) {
        if (r.valor.status === 'ACCEPTED' && r.valor.requestId) { escuchar(v, r.valor.take ?? f.toma, r.valor.requestId, 'en_proceso'); return; }
        /* Ya estaba hecha: la consulta la encuentra y pone su vídeo en el plano. */
        await consultar(v);
        return;
      }
      if (r.rechazo.motivo === 'price_changed') { await cotizarCon(v, calidad, 'precio_cambiado'); return; }
      if (YA_PEDIDA.has(r.rechazo.motivo)) { await consultar(v); return; }
      if (esCategoriaDeFallo(r.rechazo.motivo)) {
        /*
         * SALIÓ HACIA EL PROVEEDOR Y NO SE PUDO. El porqué va con la toma, y si
         * los Credits ya volvieron lo dice el servidor; los tres números los
         * cuenta la consulta, desde la reserva. Nunca «generando» después de esto.
         */
        poner({ ultima: { toma: f.toma, estado: 'fallida', categoria: r.rechazo.motivo, ...(r.rechazo.detalle?.refunded === true ? {} : { pendiente: true }) } });
        await consultar(v);
        return;
      }
      poner({ fase: { fase: r.rechazo.motivo === 'network' ? 'error' : 'rechazada', rechazo: r.rechazo } as FaseDeToma });
    })();
  };

  /**
   * «DETENER LA TOMA» (Fase 15 del motor, D11). Solo con una toma en proceso, y
   * una vez a la vez. El servidor decide si todavía se puede —si el proveedor no
   * la aceptó, se para y se devuelve entera; si ya la tiene, termina y se cobra— y
   * mueve el dinero que toque; aquí solo se dice lo que contestó. La reserva que ya
   * se escucha trae la devolución cuando llega; nunca se suma ni se resta nada aquí.
   */
  const cancelar = (): void => {
    const f = instantanea.fase;
    if (!unidad || f.fase !== 'en_proceso' || instantanea.cancelacion?.estado === 'pidiendo') return;
    const v = vuelta;
    const laUnidad = unidad;
    poner({ cancelacion: { estado: 'pidiendo' } });
    void (async () => {
      const r = await servicio.cancelar(laUnidad, f.toma);
      if (!vigente(v)) return;
      if (!r.ok) { poner({ cancelacion: { estado: 'rechazada', motivo: r.rechazo.motivo } }); return; }
      if (r.valor.status === 'CANCELLED') { poner({ cancelacion: { estado: 'hecha', como: r.valor.state } }); return; }
      poner({ cancelacion: { estado: 'rechazada', motivo: r.valor.reason } });
    })();
  };

  /** Empezar con otra unidad (o con ninguna). Lo que estaba en camino deja de contar, y se deja de escuchar. */
  const abrir = (nueva: EntradaDeToma): void => {
    vuelta++;
    pedido++;
    callar();
    entrada = nueva;
    unidad = nueva.tipo === 'unidad' ? nueva.unidad : null;
    const fase: FaseDeToma = nueva.tipo === 'unidad'
      ? { fase: 'consultando' }
      : nueva.tipo === 'sin_unidad' ? { fase: 'sin_unidad', porque: nueva.porque } : { fase: 'no_disponible', porque: nueva.porque };
    instantanea = { ...INSTANTANEA_INICIAL, fase };
    oyentes.forEach((f) => f());
    if (unidad) void consultar(vuelta);
  };

  /** Volver a mirar desde el principio: nunca vuelve a pedir una generación. */
  const reintentar = (): void => abrir(entrada);

  const cerrar = (): void => {
    vuelta++;
    pedido++;
    callar();
  };

  return {
    suscribir: (f: () => void): (() => void) => {
      oyentes.add(f);
      return () => { oyentes.delete(f); };
    },
    leer: (): InstantaneaDeToma => instantanea,
    abrir,
    elegirCalidad,
    generar,
    cancelar,
    reintentar,
    cerrar,
  };
};

export type ControladorDeToma = ReturnType<typeof crearControladorDeToma>;
