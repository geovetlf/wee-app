/**
 * BOOST — EL MODELO, PURO (docs/BOOST.md).
 *
 * Qué se puede pedir, cómo se valida, cuánto se reserva y cuánto se consume. Sin Firestore, sin reloj propio y sin
 * Credit Engine: todo entra por argumento, así que se prueba sin emuladores (`test/boost-modelo.test.mjs`).
 *
 * Tres reglas que no se negocian y que viven aquí:
 *  · El precio NO lo decide el cliente. La persona elige un presupuesto en Credits; el servidor lo valida contra los
 *    límites configurados (`boostSettings/config`) y reserva EXACTAMENTE ese número. Cualquier total que mande el
 *    cliente se ignora.
 *  · Se consume solo lo ENTREGADO. El presupuesto se reparte por días y un día cuenta solo si la publicación se mostró
 *    de verdad al menos una vez ese día (impresiones registradas por el servidor). Un día sin entrega se devuelve.
 *  · No hay cifras inventadas: ni alcance prometido, ni CPM, ni conversiones. Las métricas salen de eventos reales.
 */
import { createHash } from 'node:crypto';

export const OBJETIVOS = ['reach', 'interaction'] as const;
export type Objetivo = (typeof OBJETIVOS)[number];

/**
 * A quién se le ofrece. `everyone`: cualquier cuenta de Weë que abra el Home. `contacts`: los ËContact aceptados de la
 * identidad que publicó. `community`: quienes pertenecen a la comunidad de la publicación (solo si tiene una).
 */
export const SEGMENTOS = ['everyone', 'contacts', 'community'] as const;
export type Segmento = (typeof SEGMENTOS)[number];

/** Dónde se puede acotar por país: con los contactos no tiene sentido, ya son personas concretas. */
export const SEGMENTOS_CON_PAIS: readonly Segmento[] = ['everyone', 'community'];

export const ESTADOS = ['active', 'settling', 'ended'] as const;
export type EstadoDeCampana = (typeof ESTADOS)[number];
export const MOTIVOS_DE_FIN = ['completed', 'cancelled', 'post_unavailable'] as const;
export type MotivoDeFin = (typeof MOTIVOS_DE_FIN)[number];

/**
 * EL SERVICIO DEL CREDIT ENGINE CON EL QUE SE RESERVA UN BOOST.
 *
 * Hoy NO existe en el catálogo (`functions/src/credits/creditCosts.ts`), y este módulo no puede añadirlo: el catálogo
 * es del Credit Engine. Mientras falte, `boost` no contrata nada y lo dice (`servicio-pendiente`). Dependencia
 * documentada en docs/BOOST.md §7.
 */
export const SERVICIO_DE_CREDITS = 'social_boost';

export const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * LA CONFIGURACIÓN (`boostSettings/config`). Todo lo que es una decisión de negocio vive aquí y se cambia en Firestore
 * sin desplegar. Los valores por defecto NO son precios: son los de la propuesta ya escrita en
 * docs/ECONOMIA-CREDITS.md §6 (1, 3 o 7 días; de 500 a 10 000 Credits de 500 en 500) y están marcados como decisión
 * del dueño en docs/BOOST.md. `enabled` empieza en false: Boost no contrata nada hasta que el dueño lo abra.
 */
export interface ConfigDeBoost {
  enabled: boolean;
  durations: number[];
  minBudget: number;
  maxBudget: number;
  budgetStep: number;
  /** Cuántas campañas activas se miran al servir un hueco del feed. */
  serveScan: number;
}

export const CONFIG_POR_DEFECTO: Readonly<ConfigDeBoost> = Object.freeze({
  enabled: false,
  durations: [1, 3, 7],
  minBudget: 500,
  maxBudget: 10_000,
  budgetStep: 500,
  serveScan: 30,
});

const entero = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null);

/** Lo guardado en Firestore, saneado: lo que no se entiende cae al valor por defecto, nunca abre nada. */
export const leerConfig = (guardado: Record<string, unknown> | undefined | null): ConfigDeBoost => {
  const g = guardado || {};
  const d = CONFIG_POR_DEFECTO;
  const durations = Array.isArray(g.durations)
    ? [...new Set(g.durations.map(entero).filter((n): n is number => n !== null && n >= 1 && n <= 60))].sort((a, b) => a - b)
    : [...d.durations];
  const minBudget = entero(g.minBudget) ?? d.minBudget;
  const maxBudget = entero(g.maxBudget) ?? d.maxBudget;
  const budgetStep = entero(g.budgetStep) ?? d.budgetStep;
  const serveScan = entero(g.serveScan) ?? d.serveScan;
  const sano = minBudget >= 1 && maxBudget >= minBudget && maxBudget <= 1_000_000 && budgetStep >= 1 && durations.length > 0;
  return sano
    ? { enabled: g.enabled === true, durations, minBudget, maxBudget, budgetStep, serveScan: Math.min(Math.max(serveScan, 1), 100) }
    : { ...d, durations: [...d.durations], enabled: false };
};

export class BoostError extends Error {
  constructor(public readonly motivo: MotivoDeBoost, public readonly detalle: Record<string, unknown> = {}) {
    super(motivo);
    this.name = 'BoostError';
  }
}

/** Cada motivo tiene su texto en `boost.err_<motivo>` (i18n). El servidor nunca manda frases. */
export type MotivoDeBoost =
  | 'no-autenticado' | 'cerrado' | 'servicio-pendiente' | 'peticion' | 'objetivo' | 'segmento' | 'pais' | 'duracion'
  | 'presupuesto' | 'publicacion' | 'ajena' | 'no-promocionable' | 'sin-comunidad' | 'ya-promocionada' | 'saldo'
  | 'conflicto' | 'operacion-cerrada' | 'no-existe' | 'no-activa' | 'interno';

export const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;
const PAIS = /^[A-Z]{2}$/;

export interface PeticionDeBoost {
  requestId: string;
  postId: string;
  objective: Objetivo;
  segment: Segmento;
  country: string | null;
  budgetCredits: number;
  durationDays: number;
}

/**
 * VALIDA LO QUE MANDA EL CLIENTE. Solo se leen los campos conocidos; un `total`, un `price` o un `amount` que llegue
 * no existe para el servidor.
 */
export const validarPeticion = (datos: unknown, config: ConfigDeBoost): PeticionDeBoost => {
  const d = (datos && typeof datos === 'object' ? datos : {}) as Record<string, unknown>;
  const requestId = typeof d.requestId === 'string' ? d.requestId : '';
  if (!REQUEST_ID.test(requestId)) throw new BoostError('peticion', { campo: 'requestId' });
  const postId = typeof d.postId === 'string' ? d.postId : '';
  if (!postId || postId.length > 200 || postId.includes('/')) throw new BoostError('publicacion');
  const objective = d.objective as Objetivo;
  if (!OBJETIVOS.includes(objective)) throw new BoostError('objetivo');
  const segment = d.segment as Segmento;
  if (!SEGMENTOS.includes(segment)) throw new BoostError('segmento');
  let country: string | null = null;
  if (d.country !== undefined && d.country !== null && d.country !== '') {
    if (typeof d.country !== 'string' || !PAIS.test(d.country)) throw new BoostError('pais');
    if (!SEGMENTOS_CON_PAIS.includes(segment)) throw new BoostError('pais', { razon: 'no-aplica' });
    country = d.country;
  }
  const durationDays = entero(d.durationDays);
  if (durationDays === null || !config.durations.includes(durationDays)) throw new BoostError('duracion', { permitidas: config.durations });
  const budgetCredits = entero(d.budgetCredits);
  if (budgetCredits === null || budgetCredits < config.minBudget || budgetCredits > config.maxBudget
    || (budgetCredits - config.minBudget) % config.budgetStep !== 0) {
    throw new BoostError('presupuesto', { min: config.minBudget, max: config.maxBudget, paso: config.budgetStep });
  }
  return { requestId, postId, objective, segment, country, budgetCredits, durationDays };
};

/** Los presupuestos que se pueden elegir con esta configuración (para pintar las opciones). */
export const presupuestosPosibles = (config: ConfigDeBoost, max = 40): number[] => {
  const out: number[] = [];
  for (let n = config.minBudget; n <= config.maxBudget && out.length < max; n += config.budgetStep) out.push(n);
  return out;
};

/**
 * LA HUELLA DE LA OPERACIÓN para el Credit Engine: la misma petición da la misma huella, y un `requestId` repetido
 * con otra publicación, otro público u otro presupuesto ya no es un reintento (el motor lo rechaza como
 * `idempotency_conflict`). Hexadecimal de 32, que es lo que acepta `assertFingerprint`.
 */
export const huellaDe = (cuenta: string, p: PeticionDeBoost): string =>
  createHash('sha256')
    .update(JSON.stringify([cuenta, p.postId, p.objective, p.segment, p.country, p.budgetCredits, p.durationDays]))
    .digest('hex')
    .slice(0, 32);

/** El id de la campaña y el de la reserva son el mismo, derivado del `requestId`: un reintento cae en el mismo sitio. */
export const idDeCampana = (requestId: string): string => `bst_${requestId}`;

/** En qué día de la campaña cae un instante (0 = las primeras 24 h desde que empezó). */
export const diaDeCampana = (empiezaEn: number, ahora: number): number => Math.floor(Math.max(0, ahora - empiezaEn) / DIA_MS);

/**
 * CUÁNTO SE CONSUME. Presupuesto × (días con al menos una impresión real ÷ días contratados), redondeado hacia abajo
 * para no cobrar nunca de más. Solo cuentan los días dentro de la duración contratada. Sin ninguna entrega, 0: se
 * devuelve todo.
 */
export const consumoDe = (presupuesto: number, dias: number, porDia: Record<string, unknown> | undefined): { consumido: number; diasConEntrega: number } => {
  const diasConEntrega = Object.entries(porDia || {})
    .filter(([k, v]) => /^\d+$/.test(k) && Number(k) < dias && typeof v === 'number' && v > 0).length;
  const consumido = Math.min(presupuesto, Math.floor((presupuesto * diasConEntrega) / dias));
  return { consumido, diasConEntrega };
};

/** Una campaña tal y como la guarda el servidor (`boostCampaigns/{id}`). */
export interface Campana {
  id: string;
  ownerAccountId: string;
  identityId: string;
  postId: string;
  objective: Objetivo;
  audience: { segment: Segmento; country: string | null; communityId: string | null };
  budgetCredits: number;
  durationDays: number;
  creditService: string;
  requestId: string;
  fingerprint: string;
  status: EstadoDeCampana;
  createdAt: number;
  startsAt: number;
  endsAt: number;
  preview: { text: string; image: string | null; video: boolean };
  metrics: { impressions: number; reach: number; clicks: number; byDay: Record<string, number> };
  settlement?: { consumed: number; refunded: number; deliveredDays: number; reason: MotivoDeFin; frozenAt: number; settledAt?: number };
  endedReason?: MotivoDeFin;
  endedAt?: number;
}

/** Lo que ve su dueño. Nunca lleva la huella ni nada interno. */
export const vistaDeCampana = (c: Campana, ahora: number) => ({
  id: c.id,
  postId: c.postId,
  identityId: c.identityId,
  objective: c.objective,
  audience: c.audience,
  budgetCredits: c.budgetCredits,
  durationDays: c.durationDays,
  status: c.status,
  createdAt: c.createdAt,
  startsAt: c.startsAt,
  endsAt: c.endsAt,
  preview: c.preview,
  metrics: {
    impressions: c.metrics?.impressions ?? 0,
    reach: c.metrics?.reach ?? 0,
    clicks: c.metrics?.clicks ?? 0,
    deliveredDays: consumoDe(c.budgetCredits, c.durationDays, c.metrics?.byDay).diasConEntrega,
  },
  /* Mientras está activa, lo consumido hasta ahora con la misma regla con que se liquidará. */
  consumedSoFar: c.settlement ? c.settlement.consumed : consumoDe(c.budgetCredits, c.durationDays, c.metrics?.byDay).consumido,
  settlement: c.settlement ? { consumed: c.settlement.consumed, refunded: c.settlement.refunded, settled: typeof c.settlement.settledAt === 'number' } : null,
  endedReason: c.endedReason ?? null,
  endedAt: c.endedAt ?? null,
  expired: c.status === 'active' && ahora >= c.endsAt,
});

/** El texto de la vista previa: contenido de la persona, recortado, nunca traducido. */
export const vistaPrevia = (post: Record<string, unknown>) => {
  const imagenes = [post.imageUrlsThumbnails, post.imageUrls].find((l) => Array.isArray(l) && l.length > 0) as unknown[] | undefined;
  const primera = imagenes?.[0];
  return {
    text: typeof post.content === 'string' ? post.content.slice(0, 280) : '',
    image: typeof primera === 'string' ? primera : typeof post.imageUrl === 'string' ? post.imageUrl : null,
    video: typeof post.videoUrl === 'string' && post.videoUrl.length > 0,
  };
};

/** ¿Se puede promocionar esta publicación? Pública, original (no un repost) y no borrada. */
export const esPromocionable = (post: Record<string, unknown> | undefined | null): boolean =>
  !!post && post.isPrivate !== true && post.isRepost !== true && post.deleted !== true;
