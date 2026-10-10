import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes } from 'firebase/storage';
import { functions, storage } from '../config/firebase';
import { usersService } from './firestoreService';
import { newRequestId } from './creditsService';

// --- Prompt builders ---

interface AvatarSelections {
  gender: string;
  skinTone: string;
  hairStyle: string;
  ageRange: string;
  eyeColor: string;
  faceShape: string;
  facialHair: string;
  accessories: string;
  expression: string;
}

const GENDER_MAP: Record<string, string> = {
  male: 'male',
  female: 'female',
  other: 'androgynous',
};

const SKIN_TONE_MAP: Record<string, string> = {
  tone1: 'very light skin',
  tone2: 'light skin',
  tone3: 'medium skin',
  tone4: 'olive skin',
  tone5: 'brown skin',
  tone6: 'dark skin',
};

const HAIR_STYLE_MAP: Record<string, string> = {
  short: 'short hair',
  medium: 'medium-length hair',
  long: 'long hair',
  curly: 'curly hair',
  wavy: 'wavy hair',
  bald: 'bald head',
};

const AGE_RANGE_MAP: Record<string, string> = {
  young: 'young adult in their 20s',
  adult: 'adult in their 30s-40s',
  senior: 'mature adult in their 50s-60s',
};

const EYE_COLOR_MAP: Record<string, string> = {
  brown: 'brown eyes',
  blue: 'blue eyes',
  green: 'green eyes',
  hazel: 'hazel eyes',
  black: 'dark brown almost black eyes',
  gray: 'gray eyes',
};

const FACE_SHAPE_MAP: Record<string, string> = {
  oval: 'oval face shape',
  round: 'round face shape',
  angular: 'angular chiseled face shape',
  long: 'elongated face shape',
  square: 'square jawline face shape',
};

const FACIAL_HAIR_MAP: Record<string, string> = {
  none: '',
  stubble: 'light stubble facial hair',
  full_beard: 'full thick beard',
  mustache: 'mustache',
  goatee: 'goatee beard',
};

const ACCESSORIES_MAP: Record<string, string> = {
  none: '',
  glasses: 'wearing prescription glasses',
  sunglasses: 'wearing sunglasses',
  earrings: 'wearing earrings',
  cap: 'wearing a baseball cap',
  headscarf: 'wearing a headscarf',
  piercing: 'with a nose piercing',
};

const EXPRESSION_MAP: Record<string, string> = {
  smile: 'warm genuine smile',
  serious: 'serious confident look',
  relaxed: 'relaxed calm expression',
  confident: 'confident self-assured smirk',
  mysterious: 'enigmatic mysterious gaze',
};

function buildPortraitPrompt(selections: AvatarSelections): string {
  const gender = GENDER_MAP[selections.gender] || 'person';
  const skin = SKIN_TONE_MAP[selections.skinTone] || 'medium skin';
  const hair = HAIR_STYLE_MAP[selections.hairStyle] || 'short hair';
  const age = AGE_RANGE_MAP[selections.ageRange] || 'adult';
  const eyes = EYE_COLOR_MAP[selections.eyeColor] || 'brown eyes';
  const face = FACE_SHAPE_MAP[selections.faceShape] || '';
  const facialHair = FACIAL_HAIR_MAP[selections.facialHair] || '';
  const accessories = ACCESSORIES_MAP[selections.accessories] || '';
  const expression = EXPRESSION_MAP[selections.expression] || 'natural expression';

  const details = [face, facialHair, accessories].filter(Boolean).join(', ');

  return `Portrait photo of a ${gender} ${age} with ${skin}, ${hair}, ${eyes}${details ? `, ${details}` : ''}. ${expression}. Plain white background. Shot with a high-end smartphone camera. Photorealistic, natural skin texture with visible pores and subtle imperfections, natural lighting, no filters, no AI artifacts, 4K quality.`;
}

// --- API calls ---

// Generate avatar using Gemini AI
// Cloud function now returns a public Storage URL (not data URL)
// requestId identifica la operación para el Credit Engine: repetirla no cobra dos veces
export async function generateAvatarWithGemini(
  selections: AvatarSelections,
  requestId: string = newRequestId('avatar')
): Promise<string> {
  if (!functions) {
    throw new Error('functions-sin-inicializar');
  }
  const prompt = buildPortraitPrompt(selections);
  console.log('Calling generateAvatarWithGemini with selections:', JSON.stringify(selections).substring(0, 100));

  const callable = httpsCallable<{ prompt: string; selections: AvatarSelections; requestId: string }, { imageUrl: string }>(
    functions,
    'generateAvatarWithGemini',
    { timeout: 120_000 }
  );
  const result = await callable({ prompt, selections, requestId });
  return result.data.imageUrl; // Returns public Storage URL
}

// --- Avatar Replacement ---

/** El cubo de Weë: con él se decide qué referencia puede ser la foto de perfil (utils/fotoDePerfil.ts). */
export const cuboDeWee = (): string | undefined => storage?.app?.options?.storageBucket;

/**
 * Una ruta de Storage (`users/<uid>/…`) como `gs://` del cubo de Weë, que el servidor lee con el Admin SDK sin testigo.
 * Cualquier otra referencia (ya `gs://` o una dirección https) se devuelve tal cual.
 */
const comoDireccionDeWee = (referencia: string): string => {
  if (!referencia.startsWith('users/')) return referencia;
  const cubo = cuboDeWee();
  if (!cubo) throw new Error('storage-sin-inicializar');
  return `gs://${cubo}/${referencia}`;
};

/*
 * El ORIGINAL se manda por RUTA (`users/<uid>/face-swap/…`), nunca como dirección con testigo. Lo que vuelve es la
 * dirección del RESULTADO generado: el original no vuelve nunca (docs/PRIVACIDAD-FACE-SWAP.md).
 */
export async function performAvatarReplacement(
  selfiePath: string,
  avatarRef: string,
  requestId: string = newRequestId('swap'),
): Promise<string> {
  if (!functions) {
    throw new Error('functions-sin-inicializar');
  }
  console.log('Calling avatarReplacement cloud function...');
  const callable = httpsCallable<
    { selfiePath: string; avatarUrl: string; requestId: string },
    { imageUrl: string }
  >(functions, 'avatarReplacement', { timeout: 300_000 });
  const result = await callable({ selfiePath, avatarUrl: comoDireccionDeWee(avatarRef), requestId });
  return result.data.imageUrl; // La dirección del RESULTADO generado
}

// --- Upload helpers ---

// Sube la selfie ORIGINAL a su carpeta privada y devuelve su RUTA. No pide dirección de descarga: una dirección con testigo
// salta las reglas de Storage y deja la selfie pública (docs/PRIVACIDAD-FACE-SWAP.md).
export async function uploadImageForSwap(
  userId: string,
  imageUri: string,
  _base64Data?: string | null
): Promise<string> {
  // Nombre nuevo (marca de tiempo + azar): las reglas de Storage no permiten sobrescribir (docs/ACTIVOS-POLITICA-STORAGE.md).
  const timestamp = Date.now();
  const azar = Math.random().toString(36).slice(2, 8);
  const storagePath = `users/${userId}/face-swap/source_${timestamp}-${azar}.jpg`;
  const storageRef = ref(storage, storagePath);

  // fetch local file URI → blob (works reliably in React Native)
  const response = await fetch(imageUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return storagePath;
}

// Save face swap result - now receives a URL, just returns it
export async function saveFaceSwapResult(
  userId: string,
  resultUrl: string
): Promise<string> {
  // Cloud function already saved to Storage, just return the URL
  return resultUrl;
}

// --- Save to Storage + Firestore ---

// Save generated avatar - now receives a public URL from cloud function
export async function saveGeneratedAvatar(
  userId: string,
  userDocId: string,
  imageUrl: string,
  selections: AvatarSelections
): Promise<{ avatarUrl: string }> {
  // Cloud function already uploaded to Storage, imageUrl is a public URL
  // Just save to Firestore
  await usersService.update(userDocId, {
    aiAvatarPortraitUrl: imageUrl,
    aiAvatarSelections: selections,
  });

  return { avatarUrl: imageUrl };
}
