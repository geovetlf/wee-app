/**
 * CREAR UN WEËL: LAS REGLAS, SIN PANTALLA.
 *
 * Un Weël es una publicación de `posts` con vídeo y `isWeel: true`: ni otra colección, ni otro sistema de publicación, ni
 * otro almacén. Lo que cambia respecto al compositor del Wall (`screens/CreateScreen.tsx`) es la EXPERIENCIA: aquí no
 * hay «Publicar en», ni encuesta, ni ËContact, ni ubicación, ni texto largo; hay un vídeo vertical de hasta 15 s y una
 * descripción corta. La pantalla es `screens/CrearWeelScreen.tsx`; esto es lo que decide, puro y sin Firebase, para
 * poder ejecutarlo en las pruebas (`functions/test/weels-crear.test.mjs`).
 *
 * Los servicios son los de siempre: `uploadVideoToCloudinary` sube el vídeo y `postsService.create` guarda el
 * documento. Este módulo no importa ninguno.
 */
import { MURO_GENERAL } from './sectionFeed';

/** El mismo tope que el compositor aplica a todo vídeo (docs/UX.md: Weëls de hasta 15 s). */
export const MAX_SEGUNDOS_WEEL = 15;
/** Una descripción corta: un Weël se mira, no se lee. */
export const MAX_DESCRIPCION_WEEL = 150;

export interface VideoElegido {
  uri: string;
  /** Duración en segundos, si el selector la dio. */
  segundos?: number;
  ancho?: number;
  alto?: number;
  /** Si el vídeo ya es material de la cuenta (Weë AI / Mis creaciones): se referencia, no se vuelve a subir. */
  assetId?: string;
}

export type ValidacionDeVideo =
  | { ok: true; aviso?: 'horizontal' }
  | { ok: false; motivo: 'sin-video' | 'largo'; segundos?: number };

/**
 * ¿Vale este vídeo para un Weël?
 *
 * · Más de 15 s → NO: se rechaza con su duración real, antes de subir nada (no se recorta ni interviene ninguna IA).
 * · Horizontal (más ancho que alto) → vale, pero con AVISO: la pantalla pregunta antes de usarlo. No se rechaza porque
 *   el ancho y el alto que da el selector no siempre traen la rotación aplicada, y rechazar un vídeo vertical bueno por
 *   un metadato sería peor que avisar de más.
 * · Sin dimensiones o sin duración → vale: no se inventa un motivo para rechazar.
 */
export const validarVideoDeWeel = (v: VideoElegido | null | undefined): ValidacionDeVideo => {
  if (!v || typeof v.uri !== 'string' || v.uri.length === 0) return { ok: false, motivo: 'sin-video' };
  if (typeof v.segundos === 'number' && v.segundos > MAX_SEGUNDOS_WEEL) return { ok: false, motivo: 'largo', segundos: v.segundos };
  if (typeof v.ancho === 'number' && typeof v.alto === 'number' && v.ancho > 0 && v.alto > 0 && v.ancho > v.alto) {
    return { ok: true, aviso: 'horizontal' };
  }
  return { ok: true };
};

/** Hashtags de la descripción, con la misma regla que el compositor. */
export const hashtagsDe = (texto: string): string[] => texto.match(/#[\wÀ-ɏḀ-ỿ]+/gi) || [];

export interface DatosParaPublicar {
  userId: string;
  descripcion: string;
  videoUrl: string;
  videoAssetId?: string;
  /** «Cómo lo hice»: lo apunta Weë cuando el vídeo nace de una generación; nunca se le pide a la persona. */
  aiTools?: string[];
  aiProcess?: string;
  /** Si se crea desde una comunidad, el Weël es de esa comunidad (mismo campo que el compositor). */
  communityId?: string;
  communitySlug?: string;
}

/**
 * El documento del Weël, con la forma de cualquier publicación de `posts` (sin las fechas: las pone quien guarda, con el
 * `Timestamp` de Firestore). El destino es el que corresponde a Weëls: el muro general —el feed de Weëls lee todas las
 * publicaciones con vídeo—, nunca una sección de Weë AI. `destinations` va escrito y con un solo valor, así que ningún
 * muro de sección lo recoge.
 */
export const datosDelWeel = (d: DatosParaPublicar) => {
  const descripcion = d.descripcion.trim().slice(0, MAX_DESCRIPCION_WEEL);
  const aiTools = (d.aiTools || []).map((x) => x.trim()).filter(Boolean).slice(0, 6);
  const aiProcess = (d.aiProcess || '').trim();
  return {
    userId: d.userId,
    content: descripcion,
    imageUrls: [] as string[],
    imageUrlsThumbnails: [] as string[],
    videoUrl: d.videoUrl,
    isWeel: true as const,
    ...(d.videoAssetId ? { videoAssetId: d.videoAssetId } : {}),
    ...(aiTools.length > 0 ? { aiTools } : {}),
    ...(aiProcess ? { aiProcess } : {}),
    ...(d.communityId && d.communitySlug ? { communityId: d.communityId, communitySlug: d.communitySlug } : {}),
    destinations: [MURO_GENERAL],
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
    isPrivate: false,
    hashtags: hashtagsDe(descripcion),
    agreementCount: 0,
    disagreementCount: 0,
  };
};

/*
 * ─── QUE LA DESCRIPCIÓN SE VEA ENTERA (R9, visto en el teléfono) ─────────────
 *
 * El marco del vídeo mide 9:16 sacado del ANCHO de la columna, así que en un teléfono alto y estrecho se comía la
 * pantalla y la caja de la descripción quedaba cortada por abajo: de su ayuda («Cuenta qué creaste para tu Weël y con
 * qué IA…») solo asomaba la primera línea. Ahora el marco se mide contra el ALTO que de verdad enseña la pantalla
 * (el `onLayout` del desplazable) y se queda con lo que sobra después de apartar la descripción: la caja nace entera a
 * la vista, el vídeo conserva su forma 9:16 y nada cambia de cómo se desplaza la pantalla.
 */

/** Alto de una línea de la descripción (fuente de 15). */
export const LINEA_DE_LA_DESCRIPCION = 20;

/**
 * Lo mínimo que mide la caja de la descripción: DOS líneas de su ayuda con el tamaño de letra que la persona tenga
 * puesto, más su relleno (12 + 12) y su borde. Nunca menos que los 72 de siempre.
 */
export const altoMinimoDeLaDescripcion = (escalaDeLetra: number): number => {
  const escala = Number.isFinite(escalaDeLetra) && escalaDeLetra > 1 ? escalaDeLetra : 1;
  return Math.max(72, Math.ceil(2 * LINEA_DE_LA_DESCRIPCION * escala) + 24 + 2);
};

/** Por poco alto que haya (un teléfono girado), el marco no baja de aquí: entonces la pantalla se desplaza, como siempre. */
export const ALTO_MINIMO_DEL_MARCO = 240;
/** El ancho de siempre del marco y de la columna (estilos de `CrearWeelScreen`). */
export const ANCHO_MAXIMO_DEL_MARCO = 360;
export const ANCHO_MAXIMO_DE_LA_COLUMNA = 520;
export const RELLENO_LATERAL = 16;

/**
 * Lo que mide el marco del vídeo, 9:16, para que debajo quepa la descripción entera.
 * Se aparta: el aire del marco (8), el de la descripción (16), la propia caja, su contador (20) y un respiro (12).
 */
export const medidaDelMarcoDelWeel = (anchoVisible: number, altoVisible: number, altoDescripcion: number): { width: number; height: number } => {
  const columna = Math.max(0, Math.min(anchoVisible, ANCHO_MAXIMO_DE_LA_COLUMNA) - 2 * RELLENO_LATERAL);
  const porAncho = Math.min(columna, ANCHO_MAXIMO_DEL_MARCO) * 16 / 9;
  const reserva = 8 + 16 + altoDescripcion + 20 + 12;
  const height = Math.max(Math.min(porAncho, altoVisible - reserva), Math.min(ALTO_MINIMO_DEL_MARCO, porAncho));
  return { width: height * 9 / 16, height };
};
