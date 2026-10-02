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
 *       porcentajes, ni relojes, ni preguntar cada tanto;
 *   5 · cuando termina, se le pide al servidor que ponga el vídeo en SU plano.
 *       Él lo comprueba todo; si el plano cambió mientras tanto, no lo pone, y
 *       se dice.
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
  readonly current: { readonly take: number; readonly requestId: string; readonly status: EstadoDeReserva } | null;
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
  | { readonly status: 'QUOTED'; readonly allowed: true; readonly credits: number; readonly effective: TomaEfectiva; readonly takes: TomasDelPlano }
  | { readonly status: 'QUOTED'; readonly allowed: false; readonly reason: string; readonly detail?: Readonly<Record<string, unknown>>; readonly takes?: TomasDelPlano };

export interface RespuestaDeGeneracion {
  readonly status: 'ACCEPTED' | 'COMPLETED';
  /** El de la toma, calculado por el servidor. Con él se escucha su reserva. */
  readonly requestId?: string | null;
  readonly take?: number;
  readonly assetId?: string | null;
}

export type ResultadoDelEnlace =
  | { readonly status: 'linked' | 'already'; readonly shotNodeId: string; readonly assetId: string; readonly version: number }
  | { readonly status: 'not_ready' | 'failed' | 'stale' | 'not_found' | 'conflict'; readonly motivo?: string };

/** Por qué no: el motivo que dijo el servidor (o la red), y lo que haga falta para explicarlo. */
export interface RechazoDeToma {
  readonly motivo: string;
  readonly detalle?: Readonly<Record<string, unknown>>;
}

export type ResultadoDeToma<T> = { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly rechazo: RechazoDeToma };

/** Lo único que esto necesita de fuera. Ninguna de estas cosas genera ni cobra por su cuenta: lo decide el servidor. */
export interface ServicioDeTomas {
  cotizar(unidad: UnidadDeToma, calidad?: CalidadDeToma): Promise<ResultadoDeToma<CotizacionDeToma>>;
  generar(unidad: UnidadDeToma, calidad: CalidadDeToma, toma: number, creditos: number): Promise<ResultadoDeToma<RespuestaDeGeneracion>>;
  enlazar(unidad: UnidadDeToma, toma: number): Promise<ResultadoDeToma<ResultadoDelEnlace>>;
  /** Escuchar la reserva de una toma: avisa cada vez que cambia. Devuelve cómo dejar de escuchar. */
  observarReserva(requestId: string, alCambiar: (estado: EstadoDeReserva | null) => void, alFallar: () => void): () => void;
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
  | { readonly fase: 'error'; readonly rechazo: RechazoDeToma };

/** La última toma que ya terminó, con lo que dejó: su vídeo en el plano, o por qué no está. */
export type UltimaToma =
  | { readonly toma: number; readonly estado: 'lista'; readonly assetId: string; readonly url: string | null }
  | { readonly toma: number; readonly estado: 'fallida' }
  | { readonly toma: number; readonly estado: 'sin_enlazar'; readonly motivo: string };

/** El vídeo que el plano del Core tiene puesto (`ShotNode.producedAssetId`): es lo que el plano ES hoy. */
export interface VideoDelPlano {
  readonly assetId: string;
  readonly url: string | null;
}

export interface InstantaneaDeToma {
  readonly fase: FaseDeToma;
  readonly calidad: CalidadDeToma | null;
  readonly enElPlano: VideoDelPlano | null;
  readonly ultima: UltimaToma | null;
  /** Lo que acaba de pasar y conviene decir: que el precio cambió entre la cotización y el clic. */
  readonly aviso: 'precio_cambiado' | null;
}

export const INSTANTANEA_INICIAL: InstantaneaDeToma = Object.freeze({
  fase: { fase: 'sin_unidad', porque: 'nada' } as FaseDeToma, calidad: null, enElPlano: null, ultima: null, aviso: null,
});

const VIVAS: ReadonlySet<string> = new Set(['PENDING', 'AUTHORIZED']);
const DEVUELTAS: ReadonlySet<string> = new Set(['FAILED', 'REFUNDED']);
/** Lo que dice que la toma ya existe: no se reintenta, se consulta y se sigue la que hay. */
const YA_PEDIDA: ReadonlySet<string> = new Set(['take_in_flight', 'DUPLICATE_REQUEST']);
/** Mientras pasa esto, elegir otra calidad no hace nada: hay una respuesta en camino o una toma en marcha. */
const OCUPADA: ReadonlySet<FaseDeToma['fase']> = new Set(['consultando', 'pidiendo', 'en_proceso', 'terminando', 'sin_unidad', 'no_disponible']);

export const crearControladorDeToma = (servicio: ServicioDeTomas) => {
  let entrada: EntradaDeToma = { tipo: 'sin_unidad', porque: 'nada' };
  let unidad: UnidadDeToma | null = null;
  /* Cada vez que se abre otra cosa o se cierra, cambia: lo que llegue de antes ya no es de aquí. */
  let vuelta = 0;
  /* Y cada petición lleva su número: si la persona toca dos calidades seguidas, gana la última. */
  let pedido = 0;
  let dejarDeEscuchar: (() => void) | null = null;
  let instantanea: InstantaneaDeToma = INSTANTANEA_INICIAL;
  const oyentes = new Set<() => void>();

  const poner = (cambio: Partial<InstantaneaDeToma>): void => {
    instantanea = { ...instantanea, ...cambio };
    oyentes.forEach((f) => f());
  };
  const callar = (): void => {
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

  /** En proceso: se escucha la reserva de la toma, y nada más. */
  const seguir = (v: number, toma: number, requestId: string): void => {
    callar();
    poner({ fase: { fase: 'en_proceso', toma } });
    dejarDeEscuchar = servicio.observarReserva(
      requestId,
      (estado) => {
        if (!vigente(v) || !estado || VIVAS.has(estado)) return;
        callar();
        if (DEVUELTAS.has(estado)) { poner({ fase: { fase: 'elige_calidad' }, calidad: null, ultima: { toma, estado: 'fallida' } }); return; }
        if (estado === 'COMPLETED') void terminar(v, toma);
      },
      () => {
        if (!vigente(v)) return;
        callar();
        poner({ fase: { fase: 'error', rechazo: { motivo: 'network' } } });
      },
    );
  };

  /** Lo que dice una cotización: el precio, que hay una toma en marcha, o por qué no. */
  const aplicar = (v: number, q: CotizacionDeToma, conCalidad: boolean): void => {
    if (q.allowed) {
      if (!q.takes.next) { poner({ fase: { fase: 'rechazada', rechazo: { motivo: 'unknown' } } }); return; }
      poner({ fase: { fase: 'cotizada', creditos: q.credits, efectiva: q.effective, toma: q.takes.next.take } });
      return;
    }
    const actual = q.takes?.current;
    if (actual && VIVAS.has(actual.status)) { seguir(v, actual.take, actual.requestId); return; }
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
    /* Lo que el plano tiene puesto ahora, sea de la toma que sea. */
    const puesto = r.valor.takes?.node?.producedAssetId;
    if (puesto) {
      const url = await servicio.urlDelMaterial(puesto);
      if (!vigente(v, p)) return;
      poner({ enElPlano: { assetId: puesto, url } });
    }
    const actual = r.valor.takes?.current ?? null;
    if (actual && VIVAS.has(actual.status)) { seguir(v, actual.take, actual.requestId); return; }
    if (actual && actual.status === 'COMPLETED') {
      /* Terminó: que el servidor diga si su vídeo está en el plano, y si no, que lo ponga si todavía se puede. */
      const cierre = await cerrarTerminada(v, actual.take);
      if (!vigente(v, p)) return;
      if (cierre.ultima) poner({ ultima: cierre.ultima, ...(cierre.enElPlano ? { enElPlano: cierre.enElPlano } : {}) });
    } else if (actual && DEVUELTAS.has(actual.status)) {
      poner({ ultima: { toma: actual.take, estado: 'fallida' } });
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

  /** Elegir la calidad es pedir precio. No reserva nada. */
  const elegirCalidad = (calidad: CalidadDeToma): void => {
    if (!unidad || OCUPADA.has(instantanea.fase.fase)) return;
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
    poner({ fase: { fase: 'pidiendo' }, aviso: null });
    void (async () => {
      const r = await servicio.generar(laUnidad, calidad, f.toma, f.creditos);
      if (!vigente(v, p)) return;
      if (r.ok) {
        if (r.valor.status === 'ACCEPTED' && r.valor.requestId) { seguir(v, r.valor.take ?? f.toma, r.valor.requestId); return; }
        /* Ya estaba hecha: la consulta la encuentra y pone su vídeo en el plano. */
        await consultar(v);
        return;
      }
      if (r.rechazo.motivo === 'price_changed') { await cotizarCon(v, calidad, 'precio_cambiado'); return; }
      if (YA_PEDIDA.has(r.rechazo.motivo)) { await consultar(v); return; }
      poner({ fase: { fase: r.rechazo.motivo === 'network' ? 'error' : 'rechazada', rechazo: r.rechazo } as FaseDeToma });
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
    reintentar,
    cerrar,
  };
};

export type ControladorDeToma = ReturnType<typeof crearControladorDeToma>;
