/**
 * QUÉ PUEDE SER LA FOTO DE PERFIL (línea P · privacidad de Face Swap, H-2).
 *
 * La selfie ORIGINAL es privada: vive en `users/<uid>/face-swap/`, la lee el servidor con sus propios permisos y nunca
 * sale de Weë con una dirección de descarga. Al perfil público solo pueden llegar dos cosas:
 *   · un RESULTADO GENERADO por Weë (un avatar o una foto con avatar de la propia cuenta), que la persona elige;
 *   · una FOTO PÚBLICA EXPLÍCITA, subida a Cloudinary como foto de perfil.
 * Nunca una ruta `users/<uid>/face-swap/`, ni una dirección que la contenga, ni un archivo local del móvil.
 *
 * Este módulo no lee ni escribe nada: decide. Quien escribe el perfil lo consulta antes. Es puro (sin Firebase ni React)
 * para que las pruebas (functions/test/privacidad-face-swap.test.mjs) lo ejecuten tal cual.
 */

export type OrigenDeFotoDePerfil = 'resultado-generado' | 'foto-publica';

export type MotivoDeFotoRechazada =
  | 'vacia'
  | 'original_privado'
  | 'no_es_resultado_generado'
  | 'ruta_no_publica'
  | 'bucket_ajeno'
  | 'no_es_foto_publica'
  | 'origen_no_permitido';

export type DecisionDeFotoDePerfil = { readonly ok: true } | { readonly ok: false; readonly motivo: MotivoDeFotoRechazada };

/** Decodifica hasta tres veces: una dirección codificada dos veces (`%252E`) cuenta como la misma ruta. */
const decodificar = (texto: string): string => {
  let actual = texto;
  for (let i = 0; i < 3; i += 1) {
    let siguiente: string;
    try {
      siguiente = decodeURIComponent(actual);
    } catch {
      break;
    }
    if (siguiente === actual) break;
    actual = siguiente;
  }
  return actual;
};

/** Una ruta de original: `users/<quien sea>/face-swap/…`, con o sin la forma de dirección de descarga por delante. */
const RUTA_DEL_ORIGINAL = /(?:^|\/)users\/[^/]+\/face-swap(?:\/|$)/;
/** Un resultado generado por Weë de la propia cuenta: el avatar (`ai-avatar`) o la foto con avatar (`avatar-replacement`). */
const RUTA_DE_RESULTADO = /^users\/[^/]+\/(?:ai-avatar|avatar-replacement)\//;
/** Una foto pública explícita: la de Cloudinary que el perfil ya usa para sus fotos públicas. */
const FOTO_PUBLICA_CLOUDINARY = /^https:\/\/res\.cloudinary\.com\//;

/** Si la referencia es de Storage, su cubo y su ruta ya decodificada. null si no es una referencia de Storage. */
export const rutaDeStorage = (referencia: unknown): { bucket: string; ruta: string } | null => {
  if (typeof referencia !== 'string') return null;
  const texto = referencia.trim();
  const gs = texto.match(/^gs:\/\/([^/]+)\/(.+)$/);
  const firebase = texto.match(/^https?:\/\/[^/]+\/v0\/b\/([^/]+)\/o\/([^?#]+)/);
  const google = texto.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?#]+)/);
  const coincidencia = gs || firebase || google;
  if (!coincidencia) return null;
  return { bucket: coincidencia[1], ruta: decodificar(coincidencia[2]) };
};

/** ¿Apunta la referencia a un original privado? Se mira la ruta ya decodificada, con o sin forma de dirección. */
export const esRutaDeOriginal = (referencia: unknown): boolean => {
  if (typeof referencia !== 'string' || !referencia.trim()) return false;
  return RUTA_DEL_ORIGINAL.test(decodificar(referencia.trim()));
};

/**
 * ¿PUEDE ESTA REFERENCIA SER LA FOTO DE PERFIL? Lo primero, y para todos los orígenes: un original NUNCA lo es.
 * Después, según el origen:
 *   · `resultado-generado`: debe ser de Storage, del cubo de la app si se conoce, y en la carpeta de un resultado;
 *   · `foto-publica`: debe ser una dirección de Cloudinary.
 * Cualquier otra cosa se rechaza con el motivo, para que la pantalla no escriba nada.
 */
export const decidirFotoDePerfil = (candidata: {
  referencia: unknown;
  origen: OrigenDeFotoDePerfil;
  bucket?: string;
}): DecisionDeFotoDePerfil => {
  const { referencia, origen, bucket } = candidata;
  if (typeof referencia !== 'string' || !referencia.trim()) return { ok: false, motivo: 'vacia' };
  if (esRutaDeOriginal(referencia)) return { ok: false, motivo: 'original_privado' };
  if (origen === 'resultado-generado') {
    const storage = rutaDeStorage(referencia);
    if (!storage) return { ok: false, motivo: 'no_es_resultado_generado' };
    if (bucket && storage.bucket !== bucket) return { ok: false, motivo: 'bucket_ajeno' };
    return RUTA_DE_RESULTADO.test(storage.ruta) ? { ok: true } : { ok: false, motivo: 'ruta_no_publica' };
  }
  if (origen === 'foto-publica') {
    return FOTO_PUBLICA_CLOUDINARY.test(referencia.trim()) ? { ok: true } : { ok: false, motivo: 'no_es_foto_publica' };
  }
  return { ok: false, motivo: 'origen_no_permitido' };
};

/** Los campos del perfil que guardan una foto, y el avatar que se muestra cuando no hay foto. */
export interface FotosDelPerfil {
  readonly photoURL?: string;
  readonly photoURLThumbnail?: string;
  readonly aiAvatarPortraitUrl?: string;
  readonly avatarType?: 'predefined' | 'custom';
  readonly avatarId?: string;
}

/** Lo que hay que escribir para que el perfil deje de guardar un original. Un campo vacío es «sin foto». */
export interface RetiradaDeOriginal {
  photoURL?: string;
  photoURLThumbnail?: string;
  aiAvatarPortraitUrl?: string;
  avatarType?: 'predefined';
  avatarId?: string;
}

/**
 * LA RETIRADA. Si el perfil guarda un original en alguno de sus campos de foto, devuelve lo que hay que escribir para
 * quitarlo: se vacían esos campos y, si la foto que se VEÍA era el original, el perfil vuelve al avatar predefinido (el
 * que ya tenía, o `male`). Si no hay ningún original, devuelve null y no hay nada que escribir.
 */
export const retiradaDeOriginal = (perfil: FotosDelPerfil): RetiradaDeOriginal | null => {
  const campos = (['photoURL', 'photoURLThumbnail', 'aiAvatarPortraitUrl'] as const).filter((campo) => esRutaDeOriginal(perfil[campo]));
  if (campos.length === 0) return null;
  const retirada: RetiradaDeOriginal = {};
  for (const campo of campos) retirada[campo] = '';
  if (esRutaDeOriginal(perfil.photoURL) || esRutaDeOriginal(perfil.photoURLThumbnail)) {
    retirada.avatarType = 'predefined';
    retirada.avatarId = perfil.avatarId || 'male';
  }
  return retirada;
};
