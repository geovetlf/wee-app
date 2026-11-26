/**
 * BOOST EN EL CLIENTE (docs/BOOST.md).
 *
 * Una sola puerta: la callable `boost` (functions/src/boost). Esta capa NO calcula precios, NO toca Credits y NO
 * escribe en Firestore: manda lo que la persona eligió y pinta lo que el servidor responde. El servidor valida dueño,
 * publicación, objetivo, público, duración y presupuesto, reserva por el Credit Engine y devuelve el estado real.
 *
 * El `requestId` lo genera esta capa UNA vez por confirmación: si la red falla y se reintenta con el mismo, el servidor
 * devuelve la misma campaña y no cobra otra vez.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export type BoostObjective = 'reach' | 'interaction';
export type BoostSegment = 'everyone' | 'contacts' | 'community';
export type BoostStatus = 'active' | 'settling' | 'ended';
export type BoostEndReason = 'completed' | 'cancelled' | 'post_unavailable';

export interface BoostOptions {
  enabled: boolean;
  serviceReady: boolean;
  durations: number[];
  budgets: number[];
  minBudget: number;
  maxBudget: number;
  budgetStep: number;
  objectives: BoostObjective[];
  segments: BoostSegment[];
  segmentsWithCountry: BoostSegment[];
  /** Saldo leído por el servidor (sin escribir nada). null si no se pudo leer. */
  balance: number | null;
}

export interface BoostablePost {
  id: string;
  identityId: string;
  identityKind: 'real' | 'wee';
  createdAt: number;
  hasCommunity: boolean;
  text: string;
  image: string | null;
  video: boolean;
}

export interface BoostEstimate {
  budgetCredits: number;
  durationDays: number;
  dailyCredits: number;
  /** Cuentas que hoy cumplen el público (datos reales). `cuentas: null` = no hay estimación. */
  audience: { cuentas: number | null; tope: boolean };
}

export interface BoostCampaign {
  id: string;
  postId: string;
  identityId: string;
  objective: BoostObjective;
  audience: { segment: BoostSegment; country: string | null; communityId: string | null };
  budgetCredits: number;
  durationDays: number;
  status: BoostStatus;
  createdAt: number;
  startsAt: number;
  endsAt: number;
  preview: { text: string; image: string | null; video: boolean };
  metrics: { impressions: number; reach: number; clicks: number; deliveredDays: number };
  consumedSoFar: number;
  settlement: { consumed: number; refunded: number; settled: boolean } | null;
  endedReason: BoostEndReason | null;
  endedAt: number | null;
  expired: boolean;
}

export interface BoostRequest {
  postId: string;
  objective: BoostObjective;
  segment: BoostSegment;
  country: string | null;
  budgetCredits: number;
  durationDays: number;
}

/** El motivo que manda el servidor (`boost.err_<motivo>` en i18n). */
export const motivoDeError = (e: unknown): string => {
  const x = e as { details?: { motivo?: string }; message?: string; code?: string };
  if (typeof x?.details?.motivo === 'string') return x.details.motivo;
  if (x?.code === 'functions/unavailable' || x?.code === 'functions/deadline-exceeded') return 'red';
  return 'interno';
};

const llamar = async <T>(datos: Record<string, unknown>, timeout = 30_000): Promise<T> => {
  const fn = httpsCallable<Record<string, unknown>, T>(functions, 'boost', { timeout });
  const r = await fn(datos);
  return r.data;
};

/** Un id para una confirmación. Se guarda mientras la pantalla está abierta: reintentar usa el mismo. */
export const nuevoRequestId = (): string => {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

export const boostService = {
  opciones: () => llamar<BoostOptions>({ action: 'options' }),
  misPublicaciones: () => llamar<{ posts: BoostablePost[] }>({ action: 'myPosts' }).then((r) => r.posts),
  estimar: (p: BoostRequest) => llamar<BoostEstimate>({ action: 'estimate', ...p }),
  /** Contrata: el servidor valida, RESERVA el presupuesto en el Credit Engine y abre la campaña. */
  crear: (p: BoostRequest, requestId: string) =>
    llamar<{ campaign: BoostCampaign; duplicate: boolean; balanceAfter?: number }>({ action: 'create', requestId, ...p }, 60_000),
  terminar: (campaignId: string) => llamar<{ campaign: BoostCampaign }>({ action: 'end', campaignId }, 60_000).then((r) => r.campaign),
  listar: () => llamar<{ campaigns: BoostCampaign[] }>({ action: 'list' }).then((r) => r.campaigns),
  leer: (campaignId: string) => llamar<{ campaign: BoostCampaign }>({ action: 'get', campaignId }).then((r) => r.campaign),
  /** El hueco promocionado del Home. El servidor decide si hay algo para esta cuenta y registra la impresión. */
  servir: () => llamar<{ promoted: { campaignId: string; post: Record<string, unknown> & { id: string } } | null }>({ action: 'serve' }, 15_000).then((r) => r.promoted),
  clic: (campaignId: string) => llamar<{ counted: boolean }>({ action: 'click', campaignId }, 15_000),
};
