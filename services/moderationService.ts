/**
 * MODERACIÓN · el cliente de `reportContent` (Fase 12-A/B · docs/MODERATION.md).
 *
 * Lo que manda la app es una intención: «esto, por este motivo». Nada más. La
 * cuenta que denuncia, el instante, el identificador y el estado los pone el
 * servidor desde la sesión; aquí no hay forma de enviarlos, y si alguien los
 * añadiera la petición se rechaza entera.
 *
 * La cara activa viaja como PISTA: el servidor la lee y comprueba que es de
 * esta cuenta. Nunca viaja un uid ni el identificador de la cuenta.
 *
 * Y lo que vuelve es igual de poco: que se recibió, y si ya se había dicho. Un
 * fallo se reduce a una de cuatro razones que la pantalla sabe explicar — jamás
 * al mensaje del servidor, ni a un código de Firebase, ni a una pila.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { esReferenciaDeEntidad } from '../utils/identidadPublica';

/** Las clases de objetivo que el servidor atiende hoy. El contrato nombra más; se abren allí. */
export type ObjetivoDenunciable = 'POST' | 'COMMENT' | 'ENTITY';

export type MotivoDeReporte =
  | 'SPAM' | 'HARASSMENT' | 'HATE' | 'SEXUAL_CONTENT' | 'VIOLENCE'
  | 'SCAM' | 'IMPERSONATION' | 'ILLEGAL_CONTENT' | 'SELF_HARM' | 'OTHER';

/*
 * Los motivos guardan la CLAVE de su nombre, no el nombre: esta lista se
 * construye al cargar el archivo, fuera de React, y una frase puesta aquí se
 * quedaría con el idioma del arranque. `motivo` es el identificador que viaja
 * al servidor y no se traduce nunca.
 */
export const MOTIVOS_DE_REPORTE: readonly { motivo: MotivoDeReporte; clave: string }[] = Object.freeze([
  { motivo: 'SPAM', clave: 'moderation.reasonSpam' },
  { motivo: 'HARASSMENT', clave: 'moderation.reasonHarassment' },
  { motivo: 'HATE', clave: 'moderation.reasonHate' },
  { motivo: 'SEXUAL_CONTENT', clave: 'moderation.reasonSexual' },
  { motivo: 'VIOLENCE', clave: 'moderation.reasonViolence' },
  { motivo: 'SCAM', clave: 'moderation.reasonScam' },
  { motivo: 'IMPERSONATION', clave: 'moderation.reasonImpersonation' },
  { motivo: 'ILLEGAL_CONTENT', clave: 'moderation.reasonIllegal' },
  { motivo: 'SELF_HARM', clave: 'moderation.reasonSelfHarm' },
  { motivo: 'OTHER', clave: 'moderation.reasonOther' },
] as const);

export interface DenunciaParaEnviar {
  targetType: ObjetivoDenunciable;
  targetId: string;
  reason: MotivoDeReporte;
  /** La referencia pública de la cara activa (`ent_…`). Cualquier otra cosa se descarta aquí mismo. */
  actingEntityId?: string | null;
  /** Desde qué pantalla: `wall`, `post_detail`, `weels`… Minúsculas y guion bajo. */
  surface?: string;
}

export type FalloDeDenuncia = 'offline' | 'rate_limited' | 'unavailable' | 'unknown';

export type ResultadoDeDenuncia =
  | { ok: true; duplicate: boolean }
  | { ok: false; error: FalloDeDenuncia };

/** De lo que lanza una callable a una de las cuatro razones que la pantalla sabe contar. */
export const falloDeDenuncia = (error: unknown, enLinea: boolean = true): FalloDeDenuncia => {
  if (!enLinea) return 'offline';
  const e = (error && typeof error === 'object' ? error : {}) as { code?: unknown; details?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const reason = e.details && typeof e.details === 'object' ? (e.details as { reason?: unknown }).reason : undefined;
  if (reason === 'rate_limited' || code === 'functions/resource-exhausted') return 'rate_limited';
  /* Solo cuando el servidor lo DICE. Un `not-found` a secas puede ser la propia función, y eso no es «ya no está disponible». */
  if (reason === 'target_not_found') return 'unavailable';
  if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') return 'offline';
  return 'unknown';
};

const hayRed = (): boolean =>
  typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean' ? true : navigator.onLine;

export const moderationService = {
  /** Envía la denuncia. No lanza: contesta siempre con un resultado que la pantalla puede pintar. */
  denunciar: async (d: DenunciaParaEnviar): Promise<ResultadoDeDenuncia> => {
    if (!hayRed()) return { ok: false, error: 'offline' };
    try {
      const fn = httpsCallable(functions, 'reportContent', { timeout: 30_000 });
      const res = await fn({
        targetType: d.targetType,
        targetId: d.targetId,
        reason: d.reason,
        ...(esReferenciaDeEntidad(d.actingEntityId) ? { actingEntityId: d.actingEntityId } : {}),
        ...(d.surface ? { surface: d.surface } : {}),
      });
      const data = (res.data && typeof res.data === 'object' ? res.data : {}) as { received?: unknown; duplicate?: unknown };
      /* Solo se da por recibido lo que el servidor dijo que recibió. */
      if (data.received !== true) return { ok: false, error: 'unknown' };
      return { ok: true, duplicate: data.duplicate === true };
    } catch (error) {
      return { ok: false, error: falloDeDenuncia(error, hayRed()) };
    }
  },
};
