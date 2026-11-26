/**
 * WEË IDENTITY TRANSFORMATION ENGINE (WITE) · el modelo, sin Firebase (docs/WITE.md).
 *
 *   Weëls → generateVideo (la ÚNICA puerta del vídeo) → WITE → Weë Video Engine → adaptador Seedance → ModelArk
 *
 * Aquí vive lo que se puede comprobar sin red: los estados del trabajo y por dónde puede pasar, las dieciséis etapas
 * del motor con su estado REAL (qué hace hoy cada una y qué le falta), la lectura de la puerta y la validación de lo
 * que manda la app. Nada de aquí llama a un proveedor, reserva Credits ni escribe.
 */
import type { SujetoDeWite } from '../creator/prompts';

/* ── El trabajo ───────────────────────────────────────────────────────────── */

export const COLECCION_WITE = 'identityTransformJobs';

/** Los estados del contrato. Hoy solo se recorren los que corresponden a trabajo real (ver ETAPAS_DE_WITE). */
export const ESTADOS_DE_WITE = [
  'QUEUED', 'ANALYZING', 'TRACKING', 'TRANSFORMING', 'AUDIO_PROCESSING', 'COMPOSITING', 'QUALITY_CHECK', 'RENDERING',
  'COMPLETED', 'FAILED', 'CANCELLED',
] as const;
export type EstadoDeWite = (typeof ESTADOS_DE_WITE)[number];

export const ESTADOS_TERMINALES: readonly EstadoDeWite[] = ['COMPLETED', 'FAILED', 'CANCELLED'];
export const esTerminal = (e: EstadoDeWite): boolean => ESTADOS_TERMINALES.includes(e);

/**
 * El camino que se recorre HOY, en orden. TRACKING, AUDIO_PROCESSING, COMPOSITING y RENDERING existen en el contrato
 * para cuando haya un modelo propio que haga esa etapa por separado; mientras Seedance la haga dentro de la edición,
 * no se pinta un estado que no corresponde a ningún trabajo (no se simula progreso).
 */
export const CAMINO_ACTUAL: readonly EstadoDeWite[] = ['QUEUED', 'ANALYZING', 'TRANSFORMING', 'QUALITY_CHECK', 'COMPLETED'];

/** ¿Se puede pasar de `de` a `a`? Hacia delante por el camino, o a un terminal de error desde cualquier no terminal. */
export const puedePasar = (de: EstadoDeWite, a: EstadoDeWite): boolean => {
  if (esTerminal(de)) return false;
  if (a === 'FAILED') return true;
  if (a === 'CANCELLED') return de === 'QUEUED' || de === 'ANALYZING';
  const i = CAMINO_ACTUAL.indexOf(de);
  const j = CAMINO_ACTUAL.indexOf(a);
  return i >= 0 && j === i + 1;
};

/** La decisión de la persona sobre el resultado. Publicar SIEMPRE es un paso aparte y voluntario. */
export type DecisionDeWite = 'pendiente' | 'aceptado' | 'descartado';

/* ── Las dieciséis etapas del motor, con su verdad de hoy ─────────────────── */

export type EstadoDeEtapa = 'operativa' | 'en_proveedor' | 'bloqueada';
export interface EtapaDeWite {
  id: string;
  estado: EstadoDeEtapa;
  /** Qué la hace hoy, o qué falta para que exista. Para el panel y para la documentación, nunca para la persona. */
  nota: string;
}

/**
 * LA ÚNICA LISTA de qué hace WITE de verdad. «en_proveedor» = la hace Seedance dentro de la edición, sin control ni
 * medida por etapa; «bloqueada» = no existe ningún modelo integrado que la haga y NO se simula.
 */
export const ETAPAS_DE_WITE: readonly EtapaDeWite[] = [
  { id: 'media_ingestion', estado: 'operativa', nota: 'Original en users/{cuenta}/identity-sources, ficha en Content Core; se conserva intacto.' },
  { id: 'video_analysis', estado: 'operativa', nota: 'FFmpeg de Weë: duración, tamaño, códec, fps y sonido reales del original, y movimiento (filtro scene); decide la resolución (calidad.ts).' },
  { id: 'subject_detection', estado: 'bloqueada', nota: 'Sin modelo de detección integrado: la persona elige la posición del protagonista.' },
  { id: 'subject_tracking', estado: 'en_proveedor', nota: 'Seedance edit sigue al sujeto dentro de la tarea; sin seguimiento propio ni medible.' },
  { id: 'video_segmentation', estado: 'bloqueada', nota: 'Sin modelo de segmentación integrado.' },
  { id: 'motion_extraction', estado: 'en_proveedor', nota: 'Implícita en la edición de Seedance; no hay extracción de pose propia.' },
  { id: 'character_identity_resolver', estado: 'operativa', nota: 'Perfil Weë de la cuenta + su retrato en el Storage de la cuenta.' },
  { id: 'character_renderer', estado: 'en_proveedor', nota: 'Seedance 2.5 edit con @imagen1 como referencia del personaje.' },
  { id: 'environmental_integration', estado: 'en_proveedor', nota: 'Seedance conserva escena e iluminación según la instrucción; no verificado con tareas reales.' },
  { id: 'temporal_consistency', estado: 'en_proveedor', nota: 'Responsabilidad del modelo; sin medida propia.' },
  { id: 'audio_identity_engine', estado: 'bloqueada', nota: 'No hay voz por personaje ni conversión de voz (ElevenLabs solo TTS en Weë; catálogo de voces vacío).' },
  { id: 'lip_sync', estado: 'bloqueada', nota: 'Ningún adaptador lo ofrece; lipSync figura como no verificado.' },
  { id: 'compositing', estado: 'operativa', nota: 'La edición devuelve la imagen compuesta; FFmpeg le devuelve el audio original sin reencodar la imagen (medios.ts).' },
  { id: 'quality_engine', estado: 'operativa', nota: 'Comprobaciones automáticas básicas + revisión humana obligatoria antes de publicar.' },
  { id: 'rendering', estado: 'en_proveedor', nota: 'Render de ModelArk; Weë lo guarda en su Storage.' },
  { id: 'asset_registration', estado: 'operativa', nota: 'Resultado en Content Core con sourceAssetIds = original y el trabajo de WITE.' },
];

/* ── La puerta ────────────────────────────────────────────────────────────── */

/** `aiSettings/identityTransform`: CERRADA por defecto, y abierta como mucho a una lista de cuentas. */
export const DOC_DE_LA_PUERTA = 'identityTransform';
export interface PuertaDeWite {
  abierta: boolean;
  cuentas: readonly string[] | null;
  modelo: ModeloDeEdicion;
  /**
   * Activos de persona real autorizados en BytePlus, por cuenta y por vídeo original:
   * `{ <accountId>: { <nombre del archivo en identity-sources>: 'asset://<id>' } }`. Los apunta el dueño en Firestore
   * después de que la PERSONA haya pasado la verificación de BytePlus y subido ese mismo vídeo a su grupo de activos.
   */
  activosDePersonaReal: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

const FORMA_DE_ACTIVO = /^asset:\/\/[A-Za-z0-9._-]{4,128}$/;
const FORMA_DE_ARCHIVO = /^[A-Za-z0-9._-]{1,200}$/;
const leerActivos = (v: unknown): PuertaDeWite['activosDePersonaReal'] => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const fuera: Record<string, Record<string, string>> = {};
  for (const [cuenta, mapa] of Object.entries(v as Record<string, unknown>)) {
    if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa) || /[/\s]/.test(cuenta)) continue;
    const limpio: Record<string, string> = {};
    for (const [archivo, activo] of Object.entries(mapa as Record<string, unknown>)) {
      if (FORMA_DE_ARCHIVO.test(archivo) && typeof activo === 'string' && FORMA_DE_ACTIVO.test(activo)) limpio[archivo] = activo;
    }
    if (Object.keys(limpio).length) fuera[cuenta] = limpio;
  }
  return fuera;
};

/** El activo autorizado para ESTE original de ESTA cuenta, o null (y entonces se manda la URL de Weë, que ModelArk rechaza si hay caras reales). */
export const activoParaElOriginal = (p: PuertaDeWite, accountId: string, objectKey: string): string | null => {
  const archivo = objectKey.split('/').pop() ?? '';
  return p.activosDePersonaReal[accountId]?.[archivo] ?? null;
};

/**
 * Los modelos de Seedance que pueden editar, del más barato al más caro (tarifa oficial con vídeo de entrada a 480p:
 * 2,1 · 3,3 · 4,3 · 6,4 USD por millón de tokens). Cuál edita BIEN lo decide un canario real; mientras tanto se
 * elige en Firestore (`aiSettings/identityTransform.modelo`), sin desplegar. Por defecto, el más barato: la prioridad
 * del producto es el menor coste (decisión del dueño, 2026-11-26).
 */
export const MODELOS_DE_EDICION = ['SEEDANCE_2_0_MINI', 'SEEDANCE_2_0_FAST', 'SEEDANCE_2_0', 'SEEDANCE_2_5'] as const;
export type ModeloDeEdicion = (typeof MODELOS_DE_EDICION)[number];
export const MODELO_POR_DEFECTO: ModeloDeEdicion = 'SEEDANCE_2_0_MINI';

/** Falla cerrada: sin documento, con forma rara o sin `abierto === true`, cerrada. `cuentas` ausente = todas. */
export const leerPuertaDeWite = (doc: unknown): PuertaDeWite => {
  const cerrada: PuertaDeWite = { abierta: false, cuentas: null, modelo: MODELO_POR_DEFECTO, activosDePersonaReal: {} };
  if (!doc || typeof doc !== 'object') return cerrada;
  const d = doc as Record<string, unknown>;
  if (d.abierto !== true) return cerrada;
  /* Un modelo desconocido no abre nada raro: se queda el de por defecto. */
  const modelo = MODELOS_DE_EDICION.includes(d.modelo as ModeloDeEdicion) ? (d.modelo as ModeloDeEdicion) : MODELO_POR_DEFECTO;
  const activosDePersonaReal = leerActivos(d.activosDePersonaReal);
  if (d.cuentas === undefined) return { abierta: true, cuentas: null, modelo, activosDePersonaReal };
  if (!Array.isArray(d.cuentas) || !d.cuentas.every((c) => typeof c === 'string')) return cerrada;
  return { abierta: true, cuentas: d.cuentas as string[], modelo, activosDePersonaReal };
};
export const puertaAbiertaPara = (p: PuertaDeWite, accountId: string): boolean => p.abierta && (p.cuentas === null || p.cuentas.includes(accountId));

/* ── Lo que manda la app ──────────────────────────────────────────────────── */

export const SUJETOS: readonly SujetoDeWite[] = ['unico', 'izquierda', 'centro', 'derecha', 'primer_plano'];
export type ModoDeAudio = 'original' | 'personaje';

/** Weëls dura hasta 15 s; la edición de Seedance pide un original de 4 s como mínimo (documentación de ModelArk). */
export const DURACION_MINIMA_SEC = 4;
export const DURACION_MAXIMA_SEC = 15;
/** Límite oficial de cada vídeo de referencia en ModelArk. */
export const BYTES_MAXIMOS = 200 * 1024 * 1024;
export const CARPETA_DE_ORIGINALES = 'identity-sources';

export interface PeticionDeWite {
  requestId: string;
  sourceUrl: string;
  sourceDurationSec: number;
  characterId: string;
  sujeto: SujetoDeWite;
  cambiarRopa: boolean;
  audio: ModoDeAudio;
  /** Otra resolución pedida DESPUÉS de ver un resultado (con su coste aparte). Sin ella decide el controlador. */
  resolucion?: '360p' | '480p';
  /** Lo que la persona afirma, con su texto exacto en la app: sin las dos, no hay transformación. */
  consentimiento: { soyLaPersonaTransformada: boolean; losDemasNoSeModifican: boolean };
}

export type MotivoDeRechazo =
  | 'bad_request' | 'needs_video' | 'too_short' | 'too_long' | 'bad_subject' | 'needs_consent' | 'character_voice_unavailable' | 'resolution_unavailable';

export type Validada = { ok: true; peticion: PeticionDeWite } | { ok: false; motivo: MotivoDeRechazo };

const REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;

/** Solo forma: la propiedad del vídeo y del personaje la comprueba el servidor con Firestore y Storage. */
export const validarPeticion = (crudo: unknown): Validada => {
  if (!crudo || typeof crudo !== 'object') return { ok: false, motivo: 'bad_request' };
  const d = crudo as Record<string, unknown>;
  if (typeof d.requestId !== 'string' || !REQUEST_ID.test(d.requestId)) return { ok: false, motivo: 'bad_request' };
  if (typeof d.characterId !== 'string' || !d.characterId || d.characterId.length > 128 || /[/\s]/.test(d.characterId)) return { ok: false, motivo: 'bad_request' };
  if (typeof d.sourceUrl !== 'string' || !d.sourceUrl || d.sourceUrl.length > 2000) return { ok: false, motivo: 'needs_video' };
  const segundos = Number(d.sourceDurationSec);
  if (!Number.isFinite(segundos) || segundos <= 0) return { ok: false, motivo: 'needs_video' };
  if (segundos < DURACION_MINIMA_SEC) return { ok: false, motivo: 'too_short' };
  if (segundos > DURACION_MAXIMA_SEC + 0.5) return { ok: false, motivo: 'too_long' };
  if (!SUJETOS.includes(d.sujeto as SujetoDeWite)) return { ok: false, motivo: 'bad_subject' };
  const audio = d.audio === undefined ? 'original' : d.audio;
  if (audio !== 'original' && audio !== 'personaje') return { ok: false, motivo: 'bad_request' };
  /* La voz del personaje no existe todavía en Weë (ETAPAS_DE_WITE · audio_identity_engine): se dice, no se finge. */
  if (audio === 'personaje') return { ok: false, motivo: 'character_voice_unavailable' };
  if (d.resolucion !== undefined && d.resolucion !== '360p' && d.resolucion !== '480p') return { ok: false, motivo: 'resolution_unavailable' };
  const c = (d.consentimiento || {}) as Record<string, unknown>;
  if (c.soyLaPersonaTransformada !== true || c.losDemasNoSeModifican !== true) return { ok: false, motivo: 'needs_consent' };
  return {
    ok: true,
    peticion: {
      requestId: d.requestId,
      sourceUrl: d.sourceUrl,
      sourceDurationSec: Math.round(segundos * 10) / 10,
      characterId: d.characterId,
      sujeto: d.sujeto as SujetoDeWite,
      cambiarRopa: d.cambiarRopa === true,
      audio: 'original',
      ...(d.resolucion ? { resolucion: d.resolucion as '360p' | '480p' } : {}),
      consentimiento: { soyLaPersonaTransformada: true, losDemasNoSeModifican: true },
    },
  };
};

/** El original tiene que estar en SU carpeta de originales de WITE, en la cuenta de quien pide. */
/** La duración que vale es la que mide FFmpeg; si no se pudo medir, la declarada (ya acotada). */
export const duracionValida = (segundos: number): MotivoDeRechazo | null =>
  segundos < DURACION_MINIMA_SEC ? 'too_short' : segundos > DURACION_MAXIMA_SEC + 0.5 ? 'too_long' : null;

export const esRutaDeOriginal = (objectKey: string, accountId: string): boolean =>
  objectKey.startsWith(`users/${accountId}/${CARPETA_DE_ORIGINALES}/`) && !objectKey.includes('..');

/** Identidades deterministas: repetir la misma petición nunca crea un segundo trabajo, original ni cobro. */
export const idDelTrabajo = (requestId: string): string => `wite_${requestId}`;
export const idDelOriginal = (requestId: string): string => `asset_wite_src_${requestId.replace(/[^A-Za-z0-9]/g, '').slice(0, 64)}`;
/** El requestId que va al Credit Engine y al proveedor: el de WITE, con su espacio propio. */
export const requestIdDelVideo = (requestId: string): string => `wite-${requestId}`;

/* ── Calidad automática (lo poco que se puede medir sin un modelo) ────────── */

export interface ResultadoParaRevisar { url?: string | null; assetId?: string | null; demo?: boolean; durationSec?: number | null }
export interface InformeDeCalidad { ok: boolean; demo: boolean; avisos: string[] }

/**
 * Lo que de verdad se comprueba: que hay vídeo, que quedó como material de la cuenta, que no es una muestra y que dura
 * lo mismo que el original (la edición conserva la duración). La identidad, el movimiento o los labios NO se miden: no
 * hay modelo para eso, y por eso la revisión humana es obligatoria.
 */
export const revisarResultado = (r: ResultadoParaRevisar, duracionOriginalSec: number): InformeDeCalidad => {
  const avisos: string[] = [];
  if (!r.url) avisos.push('sin_video');
  if (!r.assetId) avisos.push('sin_material');
  if (r.demo) avisos.push('muestra');
  if (typeof r.durationSec === 'number' && Math.abs(r.durationSec - duracionOriginalSec) > 1.5) avisos.push('duracion_distinta');
  return { ok: !!r.url && !r.demo, demo: !!r.demo, avisos };
};
