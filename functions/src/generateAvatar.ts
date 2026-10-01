/**
 * Avatar Generation Cloud Functions
 *
 * - Gemini 2.5 Flash Image for avatar generation
 * - Python Cloud Function (rembg + Imagen 3) for person replacement
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { AI_SECRETS } from './secrets';
import { creditEngine } from './credits/creditEngine';
import { CreditService } from './credits/creditCosts';
import { assertInputImageUrl } from './creator/inputs';
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
    secrets: AI_SECRETS,
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

/**
 * Replaces a person in a photo with the user's avatar
 *
 * Pipeline:
 * 1. Download both images
 * 2. Send both to Gemini with a simple replacement prompt
 *
 * Input: selfieUrl, avatarUrl
 * Output: Public Storage URL of result
 */
export const avatarReplacement = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '1GiB',
    secrets: AI_SECRETS,
  },
  async (request) => {
    // Validate authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const requestId = requestIdFrom(request.data?.requestId);

    /*
     * LAS DOS FOTOS TIENEN QUE SER SUYAS, Y DE WEË.
     *
     * Antes bastaba con que fueran cadenas: el servidor descargaba CUALQUIER
     * URL que mandara el cliente —incluida una de la red interna— y el
     * resultado acababa en `users/{uid}/avatar-replacement/`, que es de lectura
     * pública. Eso es una petición del lado del servidor a donde diga otro, con
     * la respuesta publicada.
     *
     * `assertInputImageUrl` es el mismo guardia que ya usa el resto de Weë AI
     * (`creator/inputs.ts`): exige que la URL sea de Storage y que su ruta
     * empiece por `users/{uid}/`. No hace falta nada nuevo; hacía falta usarlo.
     */
    const selfieUrl = assertInputImageUrl(request.data?.selfieUrl, request.auth.uid);
    const avatarUrl = assertInputImageUrl(request.data?.avatarUrl, request.auth.uid);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('     AVATAR REPLACEMENT (Gemini 2.5 Flash Image)          ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Selfie URL:', selfieUrl.substring(0, 80) + '...');
    console.log('Avatar URL:', avatarUrl.substring(0, 80) + '...');
    const startTime = Date.now();
    const userId = request.auth.uid;

    return withCredits(userId, 'ai_image_enhance', requestId, 'Foto con tu avatar Weë', async () => {
    try {
      // Step 1: Download images
      console.log('\n[1/2] Downloading images...');
      const [selfieData, avatarData] = await Promise.all([
        urlToBase64(selfieUrl),
        urlToBase64(avatarUrl),
      ]);
      console.log('    ✓ Images downloaded');

      // Step 2: Replace person with Gemini 2.5 Flash Image
      console.log('\n[2/2] Replacing person with Gemini 2.5 Flash Image...');
      const resultDataUrl = await replacePersonWithAvatar(
        selfieData.base64,
        selfieData.mimeType,
        avatarData.base64,
        avatarData.mimeType,
      );
      console.log('    ✓ Person replaced');

      // Upload result to Cloud Storage and return public URL
      const storagePath = `users/${userId}/avatar-replacement/result_${Date.now()}.png`;
      const publicUrl = await uploadImageToStorage(resultDataUrl, storagePath);

      const totalTime = Date.now() - startTime;
      console.log(`\n✓ Avatar replacement completed and uploaded in ${totalTime}ms`);

      return { imageUrl: publicUrl };
    } catch (error: any) {
      console.error('Avatar replacement failed:', error);
      /* El detalle del proveedor se queda en el log: al cliente solo le llega un código. */
      throw new HttpsError('internal', 'replacement_failed', { reason: 'replacement_failed' });
    }
    });
  }
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
