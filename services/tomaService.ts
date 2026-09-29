import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { assetsService, type AssetDoc } from './assetsService';
import { tomaVista } from '../utils/controladorDeToma';
import type { EstadoDeReserva, RechazoDeToma, ResultadoDeToma, ResultadoDelEnlace, TomaVista } from '../utils/controladorDeToma';

/**
 * WEË FILMMAKER · LO QUE PASA CON UNA TOMA DESPUÉS DE PEDIRLA (F1-D).
 *
 * Cuatro cosas, y ninguna genera ni cobra:
 *
 *   · ESCUCHAR la reserva de Credits de la toma. El Credit Engine la deja en
 *     AUTHORIZED mientras el vídeo se hace y la cierra en COMPLETED o en
 *     REFUNDED. Es la fuente que ya existe y es de la persona —las reglas solo
 *     dejan leer las suyas—: aquí no se inventa un estado ni se pregunta cada
 *     tanto, se escucha el documento mientras la toma está en marcha;
 *   · pedirle al servidor que ponga el resultado en SU plano (`shots`,
 *     `shot.result`). La app dice qué toma de qué plano; la cuenta, la
 *     operación, el material y si el plano sigue siendo el mismo los comprueba
 *     el servidor;
 *   · leer la dirección del vídeo con la regla de siempre de Mis creaciones
 *     (`assetsService.urlDeEntrega`);
 *   · preguntarle al servidor qué plano de la producción tiene puesto qué vídeo
 *     (`shots`, `shot.videos`), para que cada tarjeta del storyboard enseñe el suyo;
 *   · y, desde la Fase 11 del motor, los PÓSTERS de esos vídeos (`renders`,
 *     `poster.request`): una imagen fija de cada uno, con la dirección que calcula
 *     el servidor. Pedirlos no cuesta Credits y es idempotente;
 *   · y, desde la Fase 14, el MONTAJE FINAL (`renders`, `render.request`,
 *     `render.status`, `render.list`) y su PUBLICACIÓN (`render.publish`): qué se
 *     monta, cómo va y si se publica lo decide y lo comprueba el servidor; la app
 *     dice qué producción, qué revisión, qué montaje, a dónde y con qué cara.
 */

/** El nombre de la reserva de una operación en el Credit Engine: una por requestId. */
const reservaDe = (requestId: string) => doc(db, 'creditTransactions', `usage_${requestId}`);

const ESTADOS: ReadonlySet<string> = new Set(['PENDING', 'AUTHORIZED', 'COMPLETED', 'FAILED', 'REFUNDED']);

const rechazoDe = (error: unknown): RechazoDeToma => {
  const sdk = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : '';
  if (/unavailable|deadline-exceeded|network/.test(sdk)) return { motivo: 'network' };
  if (/unauthenticated/.test(sdk)) return { motivo: 'session_required' };
  return { motivo: 'unknown' };
};

export interface TomaDeUnPlano {
  productionId: string;
  sceneId: string;
  unitId: string;
  take: number;
}

/* ── El montaje final (Fase 14 del motor) ─────────────────────────────────── */

/** Los estados de un render, los de la Fase 2 que le tocan. */
export type EstadoDelMontaje = 'queued' | 'processing' | 'reconciling' | 'completed' | 'failed';

export interface MontajeFinal {
  /** La huella del montaje: su nombre. */
  readonly huella: string;
  readonly revision: number;
  readonly state: EstadoDelMontaje;
  /** Solo cuando está hecho. */
  readonly assetId?: string;
  /** Solo cuando falló: un código. */
  readonly failure?: string;
  readonly durationSec: number;
  readonly shots: number;
  /** Fase 38 del motor: cuándo se pidió (ms) y en qué resolución salió, tal como los da `render.list`. */
  readonly requestedAt?: number;
  readonly resolution?: string;
}

/** A dónde se publica: un Weël o el muro del Home. */
export type DestinoDelMontaje = 'weels' | 'home';

export type RespuestaDelMontaje =
  | { readonly ok: true; readonly montaje: MontajeFinal }
  /** `motivo`: el código del servidor (`render_not_enabled`, `not_ready`, `daily_limit`…) o de la red. */
  | { readonly ok: false; readonly motivo: string; readonly limite?: number };

export type RespuestaDeLaPublicacion =
  | { readonly ok: true; readonly postId: string; readonly yaEstaba: boolean }
  | { readonly ok: false; readonly motivo: string };

const ESTADOS_DEL_MONTAJE: ReadonlySet<string> = new Set(['queued', 'processing', 'reconciling', 'completed', 'failed']);

/** Lo que llega del servidor, leído con desconfianza: si no tiene forma, no es un montaje. */
export const montajeDe = (v: unknown): MontajeFinal | null => {
  const r = v as Record<string, unknown> | null | undefined;
  if (!r || typeof r.huella !== 'string' || !/^[0-9a-f]{64}$/.test(r.huella) || typeof r.state !== 'string' || !ESTADOS_DEL_MONTAJE.has(r.state)) return null;
  const numero = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  return {
    huella: r.huella,
    revision: numero(r.revision),
    state: r.state as EstadoDelMontaje,
    ...(r.state === 'completed' && typeof r.assetId === 'string' ? { assetId: r.assetId } : {}),
    ...(typeof r.failure === 'string' ? { failure: r.failure } : {}),
    durationSec: numero(r.durationSec),
    shots: numero(r.shots),
    ...(typeof r.requestedAt === 'number' && Number.isFinite(r.requestedAt) ? { requestedAt: r.requestedAt } : {}),
    ...(typeof (r.format as Record<string, unknown> | undefined)?.resolution === 'string' ? { resolution: (r.format as Record<string, string>).resolution } : {}),
  };
};

export const tomaService = {
  /**
   * Escuchar la reserva de una toma. Devuelve cómo dejar de escuchar. Con el
   * estado va lo que hace falta para los tres números —lo reservado y lo
   * cobrado—, y nada más del documento.
   */
  observarReserva: (
    requestId: string,
    alCambiar: (estado: EstadoDeReserva | null, reserva?: { status?: unknown; amount?: unknown; finalAmount?: unknown } | null) => void,
    alFallar: () => void,
  ): (() => void) =>
    onSnapshot(
      reservaDe(requestId),
      (snap) => {
        const d = snap.exists() ? snap.data() : undefined;
        const estado = d?.status;
        const valido = typeof estado === 'string' && ESTADOS.has(estado) ? (estado as EstadoDeReserva) : null;
        alCambiar(valido, d && valido ? { status: valido, amount: d.amount, finalAmount: d.finalAmount } : null);
      },
      () => alFallar(),
    ),

  /** Que el servidor ponga el vídeo de esa toma en su plano, si todo cuadra. */
  enlazar: async (toma: TomaDeUnPlano): Promise<ResultadoDeToma<ResultadoDelEnlace>> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { result: ResultadoDelEnlace }>(functions, 'shots', { timeout: 60_000 });
      const r = await fn({ op: 'shot.result', ...toma });
      return { ok: true, valor: r.data.result };
    } catch (error) {
      return { ok: false, rechazo: rechazoDe(error) };
    }
  },

  /**
   * LAS TOMAS DE UNA UNIDAD (Fase 24 del motor): su número, en qué están, sus Credits reservados, cobrados y
   * devueltos, su vídeo si es suyo y está listo, y si es la que está en el plano. Lo cuenta el servidor de lo guardado
   * (`shots`, `shot.takes`); de una unidad ajena o inexistente, ninguna. Solo lectura. Si no se puede preguntar, `null`.
   */
  tomasDeLaUnidad: async (u: { productionId: string; sceneId: string; unitId: string }): Promise<readonly TomaVista[] | null> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { takes?: unknown }>(functions, 'shots', { timeout: 60_000 });
      const r = await fn({ op: 'shot.takes', productionId: u.productionId, sceneId: u.sceneId, unitId: u.unitId });
      const lista = Array.isArray(r.data?.takes) ? r.data.takes : [];
      return lista.map(tomaVista).filter((x): x is TomaVista => x !== null);
    } catch {
      return null;
    }
  },

  /**
   * Qué plano de la producción tiene puesto qué vídeo. Lo calcula el servidor
   * —el nombre del plano del Core solo lo sabe él—; de una producción ajena o
   * inexistente contesta que ninguno. Si no se puede preguntar, tampoco hay.
   */
  videosDeLaProduccion: async (productionId: string): Promise<readonly { unitId: string; producedAssetId: string }[]> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { videos?: { unitId?: unknown; producedAssetId?: unknown }[] }>(functions, 'shots', { timeout: 60_000 });
      const r = await fn({ op: 'shot.videos', productionId });
      return (r.data.videos ?? [])
        .filter((x): x is { unitId: string; producedAssetId: string } => typeof x?.unitId === 'string' && typeof x?.producedAssetId === 'string');
    } catch {
      return [];
    }
  },

  /** La dirección con la que se ve un material de la cuenta, o `null` si no la hay. */
  urlDelMaterial: async (assetId: string): Promise<string | null> => {
    try {
      const snap = await getDoc(doc(db, 'assets', assetId));
      return snap.exists() ? assetsService.urlDeEntrega(snap.data() as AssetDoc) : null;
    } catch {
      return null;
    }
  },

  /**
   * LOS PÓSTERS DE LOS VÍDEOS DE UNA PRODUCCIÓN: de cada material, la dirección de
   * su imagen fija, si ya la tiene. Le pide al servidor los que falten —él decide
   * cuáles, de qué vídeos y si puede— y se queda solo con los que están y traen
   * dirección. Si no se puede preguntar, ninguno: la tarjeta enseña el vídeo como antes.
   */
  postersDeLaProduccion: async (productionId: string): Promise<ReadonlyMap<string, string>> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { posters?: { assetId?: unknown; state?: unknown; url?: unknown }[] }>(functions, 'renders', { timeout: 60_000 });
      const r = await fn({ op: 'poster.request', productionId });
      return new Map((r.data.posters ?? [])
        .filter((p): p is { assetId: string; state: 'ready'; url: string } => typeof p?.assetId === 'string' && p?.state === 'ready' && typeof p?.url === 'string' && /^https?:\/\//.test(p.url))
        .map((p) => [p.assetId, p.url] as const));
    } catch {
      return new Map();
    }
  },

  /**
   * PEDIR EL MONTAJE FINAL de la producción, en la revisión guardada. El servidor
   * compone qué se monta desde lo guardado; un montaje ya pedido se devuelve tal
   * cual. Sin Credits: el render tiene su tope diario.
   */
  pedirMontaje: async (productionId: string, revision: number): Promise<RespuestaDelMontaje> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { render?: unknown; refused?: { reason?: unknown; limit?: unknown } }>(functions, 'renders', { timeout: 60_000 });
      const r = await fn({ op: 'render.request', productionId, revision });
      const montaje = montajeDe(r.data.render);
      if (montaje) return { ok: true, montaje };
      const motivo = typeof r.data.refused?.reason === 'string' ? r.data.refused.reason : 'unknown';
      return { ok: false, motivo, ...(typeof r.data.refused?.limit === 'number' ? { limite: r.data.refused.limit } : {}) };
    } catch (error) {
      return { ok: false, motivo: rechazoDe(error).motivo };
    }
  },

  /** Los montajes de la producción, del más reciente al más antiguo. `null`: no se pudo preguntar. */
  montajesDeLaProduccion: async (productionId: string): Promise<readonly MontajeFinal[] | null> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { renders?: unknown[] }>(functions, 'renders', { timeout: 60_000 });
      const r = await fn({ op: 'render.list', productionId });
      return (r.data.renders ?? []).map(montajeDe).filter((m): m is MontajeFinal => !!m);
    } catch {
      return null;
    }
  },

  /**
   * LA HUELLA DEL MONTAJE QUE TOCA HOY (Fase 26 del motor, arreglo R11 de la auditoría). El servidor compone el
   * manifiesto de lo guardado —qué vídeo tiene puesto cada plano AHORA— (`shots`, `shot.montage`, solo lectura: no
   * renderiza nada) y trae su huella. Con ella se sabe si un montaje hecho es el de hoy o el de antes de enlazar otra
   * toma. `{ lista: false }`: todavía no se puede montar. `null`: no se pudo preguntar.
   */
  huellaDelMontajeVigente: async (productionId: string, revision: number): Promise<{ readonly lista: true; readonly huella: string } | { readonly lista: false } | null> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { montage?: { ready?: unknown; manifest?: { huella?: unknown } } }>(functions, 'shots', { timeout: 60_000 });
      const r = await fn({ op: 'shot.montage', productionId, revision });
      const m = r.data?.montage;
      if (m?.ready === true && typeof m.manifest?.huella === 'string' && m.manifest.huella) return { lista: true, huella: m.manifest.huella };
      return m?.ready === false ? { lista: false } : null;
    } catch {
      return null;
    }
  },

  /** Cómo va un montaje. `null`: no existe, no es de la cuenta, o no se pudo preguntar. */
  estadoDelMontaje: async (productionId: string, huella: string): Promise<MontajeFinal | null> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { render?: unknown }>(functions, 'renders', { timeout: 60_000 });
      const r = await fn({ op: 'render.status', productionId, montage: huella });
      return montajeDe(r.data.render);
    } catch {
      return null;
    }
  },

  /**
   * PUBLICAR EL MONTAJE en Weë: como Weël o en el Home, con la cara que se dice.
   * Solo con un gesto de la persona. El servidor comprueba que el montaje está
   * hecho, es de la cuenta, su archivo está y cabe en el destino.
   */
  publicarMontaje: async (productionId: string, huella: string, destino: DestinoDelMontaje, cara: string): Promise<RespuestaDeLaPublicacion> => {
    try {
      const fn = httpsCallable<Record<string, unknown>, { published?: { postId?: unknown; alreadyPublished?: unknown }; refused?: { reason?: unknown } }>(functions, 'renders', { timeout: 60_000 });
      const r = await fn({ op: 'render.publish', productionId, montage: huella, destination: destino, face: cara });
      const p = r.data.published;
      if (p && typeof p.postId === 'string') return { ok: true, postId: p.postId, yaEstaba: p.alreadyPublished === true };
      return { ok: false, motivo: typeof r.data.refused?.reason === 'string' ? r.data.refused.reason : 'unknown' };
    } catch (error) {
      return { ok: false, motivo: rechazoDe(error).motivo };
    }
  },
};
