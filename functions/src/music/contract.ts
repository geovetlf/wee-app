/**
 * WEË MUSIC — EL CONTRATO INTERNO (v0.1.0). SOLO TIPOS Y VALIDACIÓN PURA: NO LLAMA A NADIE.
 *
 * Es la forma en que Weë Music habla con la arquitectura compartida, y es independiente de cualquier proveedor:
 *
 *   Weë Music UI → Composer → Weë Brain → Context/Planner → Orchestrator → Router (`music.generate`)
 *     → AI Gateway → ADAPTADOR (uno por proveedor, `providers.ts`) → Job Engine → Media/Assets → Projects/Credits
 *
 * Un adaptador TRADUCE entre este contrato y la API de su proveedor; no decide si algo puede ocurrir (eso es del
 * Router/Gateway) ni cobra (eso es del Credit Engine). Nada de aquí está registrado en `engine/registry.ts` ni en el
 * Router: ver `docs/MUSIC.md` § «Puntos de integración» para la línea exacta que habría que añadir, en una fase
 * posterior y autorizada.
 *
 * Reglas del contrato:
 *  · El audio NUNCA viaja dentro de la solicitud: se referencia por `assetId` de Weë (subido por la ruta de subidas de
 *    Weë, `users/{uid}/creator-inputs`); el adaptador resuelve la URL en el momento. Nada de base64 en el contrato.
 *  · Toda operación lleva `requestId` (idempotencia y trazabilidad: la clave del trabajo y del asiento de Credits).
 *  · Los resultados distinguen `accepted` (tarea asíncrona en el proveedor, con `providerRef` para sondear o recibir
 *    webhook) de `completed`; una tarea aceptada no es un resultado.
 *  · Los errores son un código cerrado: la interfaz decide el texto, el contrato no trae frases.
 */

export const MUSIC_CONTRACT_VERSION = '0.1.0';

/** Las operaciones del contrato. Una capacidad de interfaz (`constants/musicCapabilities.ts`) se ata a UNA de ellas. */
export const MUSIC_OPERATIONS = [
  'music.generate',     // crear canción o instrumental desde descripción y/o letra
  'music.reference',    // crear usando un audio de referencia (melodía, estilo, ritmo)
  'music.extend',       // alargar una canción existente
  'music.remix',        // otra versión / cambio de estilo
  'music.editSection',  // regenerar una sección (y, si el motor lo admite, cambiar instrumentos)
  'music.lyrics',       // escribir o extender una letra
  'music.stems',        // separar una canción en pistas
  'music.process',      // ecualizador y efectos sobre audio existente
  'music.export',       // preparar una exportación
] as const;
export type MusicOperation = (typeof MUSIC_OPERATIONS)[number];

export type MusicReferenceIntent = 'keepMelody' | 'inspire' | 'transform' | 'rhythm';

/** Límites del CONTRATO (conservadores, el menor común documentado entre proveedores). Cada adaptador aplica además los suyos. */
export const MUSIC_CONTRACT_LIMITS = {
  descriptionMax: 500,
  lyricsMax: 3000,
  instructionMax: 500,
  durationMinSec: 3,
  durationMaxSec: 300,
  referenceMinSec: 6,
  referenceMaxSec: 60,
  referenceMaxBytes: 10 * 1024 * 1024,
} as const;

export interface MusicRequest {
  version: typeof MUSIC_CONTRACT_VERSION;
  operation: MusicOperation;
  /** Idempotencia y trazabilidad: la misma que el trabajo y el asiento de Credits. */
  requestId: string;
  description?: string;
  lyrics?: string;
  instrumental?: boolean;
  /** Ids de género/ambiente de `constants/musicComposer.ts`; el adaptador los traduce a su vocabulario. */
  genres?: string[];
  moods?: string[];
  voice?: 'female' | 'male' | 'duet' | 'none';
  /** Código de idioma de la canción (es, en, pt…). */
  language?: string;
  durationSec?: number;
  /** Solo si el proveedor lo admite (`capacidades.tempo`). */
  tempoBpm?: number;
  /** Audio de referencia, por referencia a un asset de Weë. */
  referenceAssetId?: string;
  referenceIntent?: MusicReferenceIntent;
  /** Para operaciones sobre una canción existente. */
  sourceAssetId?: string;
  sectionId?: string;
  instruction?: string;
}

export type MusicErrorCode =
  | 'NOT_AVAILABLE'       // no hay proveedor configurado/habilitado para esto
  | 'INVALID_REQUEST'     // la solicitud no cumple el contrato
  | 'UNSUPPORTED'         // el proveedor no admite esta operación o parámetro
  | 'PROVIDER_ERROR'      // el proveedor falló
  | 'RATE_LIMITED'
  | 'CONTENT_FLAGGED'     // el proveedor rechazó el contenido
  | 'TIMEOUT'
  | 'CANCELLED';

export interface MusicAudioRef {
  /** URL temporal del proveedor, que el Gateway debe copiar a Assets antes de que caduque. */
  providerUrl: string;
  format: 'mp3' | 'wav';
  durationSec?: number;
  /** Cuándo caduca `providerUrl` (ms epoch), si se sabe. */
  expiresAt?: number;
}

export type MusicResult =
  | { status: 'accepted'; providerRef: string; pollAfterMs?: number }
  | {
      status: 'completed';
      audio?: MusicAudioRef;
      stems?: { instrument: string; audio: MusicAudioRef }[];
      lyrics?: string;
      sections?: { type: string; startSec?: number; endSec?: number }[];
      providerRef?: string;
      /** Coste real que declara el proveedor, si lo declara. Nunca se estima aquí. */
      providerCostUsd?: number;
    }
  | { status: 'failed'; code: MusicErrorCode; retryable: boolean; providerRef?: string };

export type ValidacionDeSolicitud = { ok: true } | { ok: false; code: 'INVALID_REQUEST'; motivo: string };

const OPERACIONES_QUE_PIDEN_ORIGEN: readonly MusicOperation[] = ['music.extend', 'music.remix', 'music.editSection', 'music.stems', 'music.process', 'music.export'];

/** Valida una solicitud contra el contrato (puro). El motivo es un identificador de depuración, no un texto de interfaz. */
export const validarSolicitudMusical = (r: MusicRequest): ValidacionDeSolicitud => {
  const L = MUSIC_CONTRACT_LIMITS;
  const no = (motivo: string): ValidacionDeSolicitud => ({ ok: false, code: 'INVALID_REQUEST', motivo });
  if (r.version !== MUSIC_CONTRACT_VERSION) return no('version');
  if (!(MUSIC_OPERATIONS as readonly string[]).includes(r.operation)) return no('operation');
  if (!r.requestId || r.requestId.length > 200) return no('requestId');
  if (r.description && r.description.length > L.descriptionMax) return no('description-too-long');
  if (r.lyrics && r.lyrics.length > L.lyricsMax) return no('lyrics-too-long');
  if (r.instruction && r.instruction.length > L.instructionMax) return no('instruction-too-long');
  if (r.durationSec !== undefined && (r.durationSec < L.durationMinSec || r.durationSec > L.durationMaxSec)) return no('duration');
  if (r.operation === 'music.generate' && !r.description?.trim() && !r.lyrics?.trim()) return no('needs-description-or-lyrics');
  if (r.operation === 'music.generate' && r.instrumental && r.lyrics?.trim()) return no('instrumental-with-lyrics');
  if (r.operation === 'music.reference' && !r.referenceAssetId) return no('needs-reference');
  if (OPERACIONES_QUE_PIDEN_ORIGEN.includes(r.operation) && !r.sourceAssetId) return no('needs-source');
  if (r.operation === 'music.editSection' && (!r.sectionId || !r.instruction?.trim())) return no('needs-section-and-instruction');
  if (r.operation === 'music.lyrics' && !r.description?.trim()) return no('needs-description');
  return { ok: true };
};
