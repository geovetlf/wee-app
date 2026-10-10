/**
 * Avatar Generation Cloud Functions
 *
 * - Gemini 2.5 Flash Image for avatar generation
 * - Python Cloud Function (rembg + Imagen 3) for person replacement
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { AVATAR_SECRETS } from './secrets';
import { creditEngine } from './credits/creditEngine';
import { CreditService } from './credits/creditCosts';
import type { CreditTransaction } from './credits/creditTransactions';
import { operacionAbandonada } from './core';
import { assertInputImageUrl } from './creator/inputs';
import { direccionDeLaCuenta, nombreDelCuboDeWee } from './engine/http';
import { toHttpsError } from './credits/creditValidation';
import { loadConfig } from './engine/config';
import {
  generateAvatarWithImagen,
  replacePersonWithAvatar,
  uploadImageToStorage,
  urlToBase64,
  type AvatarConfig,
} from './vertexAI';

// ============================================
// CREDITS: cada generación pasa por el Credit Engine (docs/CREDITS.md)
//   autorizar (AUTHORIZED) → generar → completar (COMPLETED)
//   si falla → reembolso exacto (REFUNDED). requestId lo manda la app para
//   que un reintento de la misma operación no cobre dos veces.
// ============================================

/*
 * El requestId es OBLIGATORIO (auditoría H0, escenario #11): es lo único que hace
 * que repetir una operación no cobre ni genere dos veces. Antes, si faltaba, se
 * inventaba uno aleatorio y la operación quedaba sin protección. La app lo manda
 * siempre (`newRequestId` en services/creditsService.ts).
 */
const requestIdFrom = (value: unknown): string => {
  if (typeof value === 'string' && /^[A-Za-z0-9_.:-]{4,160}$/.test(value)) return value;
  throw new HttpsError('invalid-argument', 'request_id_required', { reason: 'request_id_required' });
};

/*
 * LAS RESERVAS QUE SE QUEDAN ABIERTAS (revisión post-auditoría 2026-10-01,
 * hallazgo money/reserva-colgada-avatar).
 *
 * Una reserva del avatar sigue en AUTHORIZED cuando el proceso muere a mitad
 * (tiempo agotado, instancia reciclada) o cuando el reembolso de un fallo
 * tampoco pudo hacerse. Nadie la cerraba: el barrido programado solo recorre
 * los trabajos del Core, y la app pide cada avatar con un requestId NUEVO, así
 * que ningún reintento volvía a pasar por ella. El saldo quedaba mermado.
 *
 * Regla, la misma que ya usa el vídeo (`operacionAbandonada`, core/job.ts): lo
 * que sigue «en marcha» después de lo que puede vivir quien lo ejecuta está
 * ABANDONADO, y lo retenido se devuelve. Aquí, «lo que puede vivir» es el
 * tiempo máximo de la función más larga del avatar (300 s) con margen. Se mira
 * al pedir el siguiente avatar —la próxima vez que la persona pasa por aquí— y
 * cada devolución es idempotente en el Credit Engine. No es una política nueva:
 * es cerrar lo que la política de siempre (reservar → generar → completar o
 * devolver) dejaba abierto.
 */
const VIDA_MAXIMA_DEL_AVATAR_MS = 10 * 60 * 1000;

const milisDe = (v: unknown): number | undefined => {
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const t = v as { toMillis?: () => number; seconds?: number } | null;
  if (t && typeof t.toMillis === 'function') return t.toMillis();
  if (t && typeof t.seconds === 'number') return t.seconds * 1000;
  return undefined;
};

/** ¿Esta reserva ya no la puede estar ejecutando nadie? */
export const reservaAbandonada = (autorizadaEn: number | undefined, ahora: number): boolean =>
  autorizadaEn !== undefined && operacionAbandonada(true, autorizadaEn + VIDA_MAXIMA_DEL_AVATAR_MS, ahora);

/** De un historial, los requestId de las reservas del avatar abandonadas. Pura: no lee ni escribe. */
export const reservasDelAvatarAbandonadas = (historial: CreditTransaction[], ahora: number): string[] =>
  historial
    .filter((t) => t.type === 'usage' && t.status === 'AUTHORIZED' && t.source === 'wee-avatar' && typeof t.requestId === 'string')
    .filter((t) => reservaAbandonada(milisDe(t.createdAt), ahora))
    .map((t) => t.requestId as string);

/** Devuelve, sin bloquear a la persona si algo falla, lo que sus avatares anteriores dejaron retenido. */
async function devolverReservasAbandonadas(userId: string): Promise<void> {
  try {
    const historial = await creditEngine.getCreditHistory(userId, 25);
    const abandonadas = new Set(reservasDelAvatarAbandonadas(historial, Date.now()));
    for (const t of historial.filter((x) => abandonadas.has(x.requestId as string))) {
      /* El concepto, el de su reserva («Avatar Weë», «Foto con tu avatar Weë») con el mismo final de siempre. */
      const reason = typeof t.reason === 'string' && t.reason ? t.reason : 'Avatar Weë';
      await creditEngine.refundCredits({ userId, requestId: t.requestId as string, reason: `${reason} · no se pudo terminar`, source: 'wee-avatar' })
        .catch((error) => console.error('Credit Engine: no se pudo devolver la reserva abandonada', t.requestId, error));
    }
  } catch (error) {
    console.error('Credit Engine: no se pudieron revisar las reservas abandonadas del avatar', userId, error);
  }
}

/*
 * Los errores de esta puerta llevan CÓDIGOS, no frases: la pantalla del avatar
 * muestra su propio texto traducido (i18n), y una frase del servidor sería un
 * texto sin traducir —o, peor, el detalle interno de un proveedor— en la red.
 */
async function withCredits<T extends { imageUrl: string }>(userId: string, service: CreditService, requestId: string, reason: string, work: () => Promise<T>): Promise<T> {
  /*
   * El interruptor de la IA (H0 #19). El avatar es la única puerta que llama a su
   * proveedor fuera de un adaptador del motor, así que lo mira aquí, ANTES de
   * cobrar: detenida, no se reserva nada y no se genera nada.
   */
  if ((await loadConfig()).settings.iaDetenida === true) {
    throw new HttpsError('unavailable', 'temporarily_unavailable', { reason: 'temporarily_unavailable' });
  }
  let authorized;
  try {
    await creditEngine.ensureAccount(userId);
    await devolverReservasAbandonadas(userId);
    authorized = await creditEngine.spendCredits({ userId, service, requestId, reason, source: 'wee-avatar' });
  } catch (error) {
    throw toHttpsError(error);
  }
  /*
   * LA MISMA OPERACIÓN OTRA VEZ (mismo requestId) NUNCA SE EJECUTA DOS VECES (H0 #11).
   *
   * Antes, un duplicado en AUTHORIZED —la primera llamada todavía generando—
   * volvía a generar, y si esta segunda fallaba REEMBOLSABA la reserva de la
   * primera, que seguía en marcha: Weë pagaba dos generaciones y la persona
   * ninguna. Y un duplicado COMPLETED que no aparecía entre las 200 últimas
   * transacciones se generaba gratis otra vez.
   *
   * Ahora: si ya terminó, se devuelve su resultado; si no se encuentra, se dice
   * que ya terminó (sin generar). Si sigue en marcha, «ya está en marcha», sin
   * generar ni tocar su reserva.
   */
  if (authorized.duplicate) {
    if (authorized.status === 'COMPLETED') {
      const previous = await creditEngine.getCreditHistory(userId, 200);
      const stored = previous.find((t) => t.id === authorized.transactionId)?.meta?.imageUrl;
      if (typeof stored === 'string' && stored) return { imageUrl: stored } as T;
      throw new HttpsError('already-exists', 'result_not_available', { reason: 'result_not_available' });
    }
    /*
     * YA TERMINÓ MAL Y SE DEVOLVIÓ (REFUNDED/FAILED). Contestar «en marcha» era
     * mentir para siempre: no hay nada en marcha. No se vuelve a generar con el
     * mismo requestId —el Credit Engine no cobraría otra vez—: se dice que falló.
     */
    if (authorized.status === 'REFUNDED' || authorized.status === 'FAILED') {
      throw new HttpsError('internal', 'generation_failed', { reason: 'generation_failed' });
    }
    /*
     * SIGUE EN AUTHORIZED. ¿En marcha o abandonada? Pasado lo que puede vivir la
     * función, nadie va a terminarla: se devuelve lo retenido (la misma regla que
     * el vídeo, `operacionAbandonada`) en vez de contestar «en marcha» para siempre.
     */
    if (reservaAbandonada(authorized.authorizedAt, Date.now())) {
      await creditEngine.refundCredits({ userId, requestId, reason: `${reason} · no se pudo terminar`, source: 'wee-avatar' })
        .catch((error) => console.error('Credit Engine: no se pudo devolver la reserva abandonada', requestId, error));
      throw new HttpsError('internal', 'generation_failed', { reason: 'generation_failed' });
    }
    throw new HttpsError('already-exists', 'in_progress', { reason: 'in_progress' });
  }
  try {
    const result = await work();
    await creditEngine.completeCredits({ userId, requestId, meta: { imageUrl: result.imageUrl } });
    return result;
  } catch (error) {
    try {
      await creditEngine.refundCredits({ userId, requestId, reason: `${reason} · no se pudo terminar`, source: 'wee-avatar' });
    } catch (refundError) {
      console.error('Credit Engine: no se pudo reembolsar', requestId, refundError);
    }
    throw error;
  }
}

// ============================================
// CLOUD FUNCTION: Generate Avatar with Vertex AI
// ============================================

/**
 * Generates a photorealistic avatar using Vertex AI Imagen 3
 *
 * Input: Avatar configuration (gender, skin tone, hair, etc.)
 * Output: Base64 data URL of generated avatar
 */
export const generateAvatarWithGemini = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: AVATAR_SECRETS,
  },
  async (request) => {
    // Validate authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { prompt, selections } = request.data;
    const requestId = requestIdFrom(request.data?.requestId);

    // Support both legacy prompt and new selections format
    let avatarConfig: AvatarConfig;

    if (selections) {
      avatarConfig = {
        gender: selections.gender || 'male',
        skinTone: mapSkinTone(selections.skinTone),
        hairStyle: mapHairStyle(selections.hairStyle),
        ageRange: mapAgeRange(selections.ageRange),
        eyeColor: mapEyeColor(selections.eyeColor),
        faceShape: mapFaceShape(selections.faceShape),
        facialHair: mapFacialHair(selections.facialHair),
        accessories: mapAccessories(selections.accessories),
        expression: mapExpression(selections.expression),
      };
    } else if (prompt) {
      // Legacy: parse from prompt string
      avatarConfig = parsePromptToConfig(prompt);
    } else {
      throw new HttpsError('invalid-argument', 'Either prompt or selections required');
    }

    console.log('Generating avatar with Vertex AI...');
    console.log('Config:', JSON.stringify(avatarConfig));
    const startTime = Date.now();
    const userId = request.auth.uid;

    return withCredits(userId, 'wee_avatar', requestId, 'Avatar Weë', async () => {
      try {
        const imageDataUrl = await generateAvatarWithImagen(avatarConfig);

        // Upload to Cloud Storage and return public URL
        const storagePath = `users/${userId}/ai-avatar/avatar_${Date.now()}.png`;
        const publicUrl = await uploadImageToStorage(imageDataUrl, storagePath);

        const totalTime = Date.now() - startTime;
        console.log(`Avatar generated and uploaded in ${totalTime}ms`);

        return { imageUrl: publicUrl };
      } catch (error: any) {
        console.error('Avatar generation failed:', error);
        /* El detalle del proveedor se queda en el log de arriba: al cliente solo le llega un código. */
        throw new HttpsError('internal', 'generation_failed', { reason: 'generation_failed' });
      }
    });
  }
);

// ============================================
// CLOUD FUNCTION: Avatar Replacement with Vertex AI
// ============================================

/*
 * EL ORIGEN DE LA SELFIE (línea P · privacidad de Face Swap, H-2).
 *
 * La selfie original es PRIVADA: vive en `users/<uid>/face-swap/`, la lee este servidor con el Admin SDK y nunca sale de
 * Weë con una dirección de descarga. Antes el cliente pedía una URL con testigo para la selfie y la ponía como foto de
 * perfil: el testigo salta las reglas de Storage, así que la selfie quedaba pública.
 *
 * El callable recibe la RUTA del original (`selfiePath`). Una dirección antigua (`selfieUrl`) se acepta solo si es de la
 * propia cuenta y se convierte a ruta: su testigo se descarta, no se usa ni se guarda. Lo demás se rechaza antes de
 * cobrar y antes de leer nada, con un único código: a quien llama no se le dice por qué.
 */
const RUTA_DE_ORIGEN_NO_VALIDA = 'selfie_no_valida';

/** Un original validado: su ruta, que es lo único que se guarda, y la misma como `gs://` para leerla con el Admin SDK. */
export interface OrigenDeSelfie {
  readonly path: string;
  readonly gs: string;
}

/** Una ruta sin trucos: ni barras invertidas, ni `%` (ruta codificada), ni caracteres de control, ni segmentos vacíos o `..`. */
const rutaDeSelfieLimpia = (ruta: string): boolean =>
  ruta.length > 0 && ruta.length <= 1024 && !/[\\%\u0000-\u001f\u007f]/.test(ruta) && !ruta.startsWith('/')
  && ruta.split('/').every((segmento) => segmento !== '' && segmento !== '.' && segmento !== '..');

/**
 * LA PUERTA DE LA SELFIE: devuelve el original de ESTA cuenta o lanza `invalid-argument`. Solo la carpeta
 * `users/<uid>/face-swap/`: nada de otra cuenta, de otra carpeta, ni de una dirección ajena al cubo de Weë.
 */
export const resolverOrigenDeSelfie = (uid: string, datos: { selfiePath?: unknown; selfieUrl?: unknown } | undefined): OrigenDeSelfie => {
  const rechazar = (): never => {
    throw new HttpsError('invalid-argument', RUTA_DE_ORIGEN_NO_VALIDA, { reason: RUTA_DE_ORIGEN_NO_VALIDA });
  };
  const cubo = nombreDelCuboDeWee();
  const comoOrigen = (path: string): OrigenDeSelfie => {
    if (!path.startsWith(`users/${uid}/face-swap/`)) return rechazar();
    return { path, gs: `gs://${cubo}/${path.split('/').map(encodeURIComponent).join('/')}` };
  };
  if (typeof datos?.selfiePath === 'string' && datos.selfiePath.trim()) {
    const ruta = datos.selfiePath.trim();
    if (!rutaDeSelfieLimpia(ruta)) return rechazar();
    const direccion = direccionDeLaCuenta(`gs://${cubo}/${ruta}`, uid);
    if (!direccion.ok) return rechazar();
    return comoOrigen(direccion.path);
  }
  if (typeof datos?.selfieUrl === 'string' && datos.selfieUrl.trim()) {
    /* Legado: una dirección de la propia cuenta se convierte a ruta. Su testigo no se usa. */
    const direccion = direccionDeLaCuenta(datos.selfieUrl.trim(), uid);
    if (!direccion.ok) return rechazar();
    return comoOrigen(direccion.path);
  }
  return rechazar();
};

/** Las dependencias del reemplazo: en producción, las reales; en las pruebas, un almacén falso. */
export interface DepsDelReemplazo {
  readonly leerImagen: (direccion: string) => Promise<{ base64: string; mimeType: string }>;
  readonly reemplazar: (selfieBase64: string, selfieMime: string, avatarBase64: string, avatarMime: string) => Promise<string>;
  readonly guardarResultado: (imagenDataUrl: string, ruta: string) => Promise<string>;
}

/**
 * EL REEMPLAZO, sin cobrar ni validar la petición (eso lo hace el callable antes). Lee la selfie por su `gs://` (Admin SDK,
 * sin testigo), el avatar por la dirección que ya validó la puerta, genera, y guarda el RESULTADO en `avatar-replacement`.
 * Devuelve solo la dirección del resultado: nunca la del original, su ruta ni su testigo.
 */
export const reemplazoDeAvatar = async (
  deps: DepsDelReemplazo,
  uid: string,
  origen: OrigenDeSelfie,
  avatarUrl: string,
): Promise<{ imageUrl: string }> => {
  const [selfie, avatar] = await Promise.all([deps.leerImagen(origen.gs), deps.leerImagen(avatarUrl)]);
  const imagen = await deps.reemplazar(selfie.base64, selfie.mimeType, avatar.base64, avatar.mimeType);
  const imageUrl = await deps.guardarResultado(imagen, `users/${uid}/avatar-replacement/result_${Date.now()}.png`);
  return { imageUrl };
};

const DEPS_DEL_REEMPLAZO: DepsDelReemplazo = {
  leerImagen: (direccion) => urlToBase64(direccion),
  reemplazar: (selfieBase64, selfieMime, avatarBase64, avatarMime) => replacePersonWithAvatar(selfieBase64, selfieMime, avatarBase64, avatarMime),
  guardarResultado: (imagenDataUrl, ruta) => uploadImageToStorage(imagenDataUrl, ruta),
};

/**
 * Replaces a person in a photo with the user's avatar
 *
 * Pipeline:
 * 1. Read the ORIGINAL selfie (path validated) and the avatar, with the Admin SDK
 * 2. Send both to Gemini with a simple replacement prompt
 * 3. Store the RESULT under avatar-replacement and return its address
 *
 * Input: selfiePath (or a legacy selfieUrl of the caller's own), avatarUrl
 * Output: { imageUrl }: the address of the RESULT. Never the original's address, path or token.
 */
export const avatarReplacement = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '1GiB',
    secrets: AVATAR_SECRETS,
  },
  async (request) => {
    // Validate authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const requestId = requestIdFrom(request.data?.requestId);
    const userId = request.auth.uid;

    // La selfie. Legado: una dirección de la selfie de antes pasa por la MISMA puerta que el resto de Weë AI (de Weë y de la
    // cuenta) y después debe ser el ORIGINAL de la cuenta. Nueva: la ruta del original. Antes de cobrar y antes de leer nada.
    const selfieUrl = typeof request.data?.selfieUrl === 'string' ? assertInputImageUrl(request.data?.selfieUrl, request.auth.uid) : undefined;
    const origen = resolverOrigenDeSelfie(userId, { selfiePath: request.data?.selfiePath, selfieUrl });
    // El avatar: la misma puerta que el resto de Weë AI (una dirección de Weë, de la cuenta).
    const avatarUrl = assertInputImageUrl(request.data?.avatarUrl, request.auth.uid);

    console.log('AVATAR REPLACEMENT (Gemini 2.5 Flash Image) · selfie de origen privado');
    const startTime = Date.now();

    return withCredits(userId, 'ai_image_enhance', requestId, 'Foto con tu avatar Weë', async () => {
      try {
        const resultado = await reemplazoDeAvatar(DEPS_DEL_REEMPLAZO, userId, origen, avatarUrl);
        console.log(`✓ Avatar replacement completed in ${Date.now() - startTime}ms`);
        return resultado;
      } catch (error: any) {
        console.error('Avatar replacement failed:', error);
        /* El detalle del proveedor se queda en el log: al cliente solo le llega un código. */
        throw new HttpsError('internal', 'replacement_failed', { reason: 'replacement_failed' });
      }
    });
  },
);

// ============================================
// MAPPING FUNCTIONS
// ============================================

function mapSkinTone(tone: string): string {
  const map: Record<string, string> = {
    tone1: 'very light/pale skin',
    tone2: 'light skin',
    tone3: 'medium skin',
    tone4: 'olive/tan skin',
    tone5: 'brown skin',
    tone6: 'dark brown skin',
  };
  return map[tone] || 'medium skin';
}

function mapHairStyle(style: string): string {
  const map: Record<string, string> = {
    short: 'short cropped hair',
    medium: 'medium-length hair',
    long: 'long flowing hair',
    curly: 'curly textured hair',
    wavy: 'wavy hair',
    bald: 'bald/shaved head',
  };
  return map[style] || 'short hair';
}

function mapAgeRange(age: string): string {
  const map: Record<string, string> = {
    young: 'young adult in their early 20s',
    adult: 'adult in their 30s-40s',
    senior: 'mature adult in their 50s-60s',
  };
  return map[age] || 'adult';
}

function mapEyeColor(color: string): string {
  const map: Record<string, string> = {
    brown: 'warm brown eyes',
    blue: 'bright blue eyes',
    green: 'green eyes',
    hazel: 'hazel eyes',
    black: 'dark brown/black eyes',
    gray: 'gray eyes',
  };
  return map[color] || 'brown eyes';
}

function mapFaceShape(shape: string): string {
  const map: Record<string, string> = {
    oval: 'oval face shape',
    round: 'round face shape',
    angular: 'angular/chiseled face',
    long: 'elongated face',
    square: 'square jaw face',
  };
  return map[shape] || 'oval face';
}

function mapFacialHair(hair: string): string {
  const map: Record<string, string> = {
    none: '',
    stubble: 'light stubble',
    full_beard: 'full beard',
    mustache: 'mustache',
    goatee: 'goatee',
  };
  return map[hair] || '';
}

function mapAccessories(acc: string): string {
  const map: Record<string, string> = {
    none: '',
    glasses: 'wearing glasses',
    sunglasses: 'wearing sunglasses',
    earrings: 'wearing earrings',
    cap: 'wearing a cap',
    headscarf: 'wearing a headscarf',
    piercing: 'with facial piercings',
  };
  return map[acc] || '';
}

function mapExpression(exp: string): string {
  const map: Record<string, string> = {
    smile: 'warm genuine smile',
    serious: 'serious confident look',
    relaxed: 'relaxed calm expression',
    confident: 'confident smirk',
    mysterious: 'mysterious gaze',
  };
  return map[exp] || 'natural expression';
}

/**
 * Parses a legacy prompt string into avatar config
 */
function parsePromptToConfig(prompt: string): AvatarConfig {
  const lower = prompt.toLowerCase();

  return {
    gender: lower.includes('female') ? 'female' : lower.includes('male') ? 'male' : 'person',
    skinTone: 'medium skin',
    hairStyle: lower.includes('long hair') ? 'long hair' :
               lower.includes('curly') ? 'curly hair' :
               lower.includes('bald') ? 'bald' : 'short hair',
    ageRange: lower.includes('young') ? 'young adult in their 20s' :
              lower.includes('senior') || lower.includes('50') ? 'mature adult' : 'adult in their 30s',
    eyeColor: lower.includes('blue eye') ? 'blue eyes' :
              lower.includes('green eye') ? 'green eyes' : 'brown eyes',
    faceShape: 'oval face',
    expression: lower.includes('smile') ? 'warm smile' :
                lower.includes('serious') ? 'serious look' : 'natural expression',
  };
}
