/**
 * WEË MUSIC — LA MATRIZ DE CAPACIDADES, COMO DATOS PARA LA INTERFAZ.
 *
 * Es lo que la UI consulta para decir la verdad: qué se puede hacer HOY, qué está preparado pero sin conectar y qué
 * ni siquiera tiene contrato. No importa React, no llama a nadie y no contiene frases: todo lo que se lee son CLAVES
 * de i18n (`music.*`). La versión documentada y comentada vive en `docs/MUSIC.md` §4; el lado del servidor (qué
 * proveedor soporta qué, según su documentación pública) vive en `functions/src/music/matrix.ts`. Los dos usan los
 * mismos ids de capacidad: si uno cambia, cambia el otro (el cliente no puede importar del servidor).
 *
 * REGLA DE ORO: una capacidad solo es `implementada` si hoy funciona de punta a punta SIN proveedor externo (grabar la
 * melodía de referencia en el dispositivo, guardar un borrador de texto). Todo lo que necesita un motor de música es
 * `preparada` (hay contrato y pantalla, no hay adaptador registrado ni llamada posible) o `pendiente` (ni siquiera
 * hay contrato cerrado). Nada de esto habilita generación: `MUSIC_GENERACION_VALIDADA` es el interruptor único.
 */

/**
 * ¿Hay generación de música validada y autorizada? Hoy NO: no hay adaptador de música registrado en el Router
 * (`music.generate` apunta a `music-pending`), ningún proveedor está aprobado y no hay precios medidos. Cambiarlo a
 * `true` es una decisión del dueño que exige antes la integración del adaptador, una prueba real con coste
 * autorizado y la revisión de derechos de uso comercial. Un solo sitio.
 */
export const MUSIC_GENERACION_VALIDADA = false;

/**
 * ¿Puede Weë Music grabar con el micrófono en iPhone? SÍ (decisión del dueño, 2026-10-15): graba ideas musicales,
 * melodías tarareadas y referencias vocales propias. Lo que lo hace legítimo, y lo vigila `i18n-permisos-ios.test.mjs`
 * (F1–F2c): el texto de propósito de iOS (`NSMicrophoneUsageDescription`: `app.json` para el español y `locales/<idioma>.json`
 * para los otros quince) ya habla de música y de mensajes de voz, y no de una sola función; el permiso se pide solo al
 * pulsar «grabar»; y solo `hooks/useMusicAudio.ts` y las notas de voz de WeeTalk tocan el micrófono. Queda como
 * interruptor de emergencia: en false, iPhone vuelve a enseñar «grabar en iPhone queda pendiente» (`refIosPending`).
 * En Android y en la web no se aplica.
 */
export const MUSIC_GRABACION_EN_IOS_AUTORIZADA = true;

/** Versión del contrato interno de Weë Music (espejo de `functions/src/music/contract.ts`). */
export const MUSIC_CONTRATO_VERSION = '0.1.0';

export type EstadoDeCapacidad = 'implementada' | 'preparada' | 'pendiente';

export type IdDeCapacidadMusic =
  | 'generate' | 'instrumental' | 'referenceAudio' | 'recordReference' | 'humToSong' | 'extend' | 'remix'
  | 'sectionEdit' | 'instrumentEdit' | 'lyrics' | 'voiceStyle' | 'stems' | 'audioProcessing' | 'export' | 'midi'
  | 'draft' | 'library';

export type ProveedorDeMusica = 'mureka' | 'minimax' | 'yinchao' | 'elevenlabs';

export interface CapacidadDeMusic {
  readonly id: IdDeCapacidadMusic;
  readonly claveTitulo: string;
  /** Una frase honesta: qué hace o qué falta. */
  readonly claveNota: string;
  /** La operación del contrato interno que la atendería (`functions/src/music/contract.ts`), o null si no existe. */
  readonly contrato: string | null;
  /** Quién la ejecutaría dentro de Weë (nunca un proveedor suelto). */
  readonly responsable: 'dispositivo' | 'music-engine' | 'ninguno';
  /** Proveedores cuya documentación pública declara esa capacidad (CONFIRMACIÓN DOCUMENTAL, no integración). */
  readonly proveedores: readonly ProveedorDeMusica[];
  readonly estado: EstadoDeCapacidad;
  /** El coste solo se enseña si se puede calcular de forma fiable: hoy ninguno. */
  readonly coste: 'pendiente' | 'sinCoste';
}

export const CAPACIDADES_MUSIC: readonly CapacidadDeMusic[] = [
  { id: 'generate', claveTitulo: 'capGenerate', claveNota: 'capGenerateNote', contrato: 'music.generate', responsable: 'music-engine', proveedores: ['minimax', 'elevenlabs', 'mureka'], estado: 'preparada', coste: 'pendiente' },
  { id: 'instrumental', claveTitulo: 'capInstrumental', claveNota: 'capInstrumentalNote', contrato: 'music.generate', responsable: 'music-engine', proveedores: ['minimax', 'elevenlabs', 'mureka'], estado: 'preparada', coste: 'pendiente' },
  { id: 'referenceAudio', claveTitulo: 'capReference', claveNota: 'capReferenceNote', contrato: 'music.reference', responsable: 'music-engine', proveedores: ['minimax', 'elevenlabs'], estado: 'preparada', coste: 'pendiente' },
  { id: 'recordReference', claveTitulo: 'capRecord', claveNota: 'capRecordNote', contrato: null, responsable: 'dispositivo', proveedores: [], estado: 'implementada', coste: 'sinCoste' },
  { id: 'humToSong', claveTitulo: 'capHum', claveNota: 'capHumNote', contrato: 'music.reference', responsable: 'music-engine', proveedores: [], estado: 'pendiente', coste: 'pendiente' },
  { id: 'extend', claveTitulo: 'capExtend', claveNota: 'capExtendNote', contrato: 'music.extend', responsable: 'music-engine', proveedores: ['mureka'], estado: 'preparada', coste: 'pendiente' },
  { id: 'remix', claveTitulo: 'capRemix', claveNota: 'capRemixNote', contrato: 'music.remix', responsable: 'music-engine', proveedores: [], estado: 'preparada', coste: 'pendiente' },
  { id: 'sectionEdit', claveTitulo: 'capSection', claveNota: 'capSectionNote', contrato: 'music.editSection', responsable: 'music-engine', proveedores: ['elevenlabs'], estado: 'preparada', coste: 'pendiente' },
  { id: 'instrumentEdit', claveTitulo: 'capInstrument', claveNota: 'capInstrumentNote', contrato: 'music.editSection', responsable: 'music-engine', proveedores: [], estado: 'pendiente', coste: 'pendiente' },
  { id: 'lyrics', claveTitulo: 'capLyrics', claveNota: 'capLyricsNote', contrato: 'music.lyrics', responsable: 'music-engine', proveedores: ['minimax', 'mureka'], estado: 'preparada', coste: 'pendiente' },
  { id: 'voiceStyle', claveTitulo: 'capVoice', claveNota: 'capVoiceNote', contrato: 'music.generate', responsable: 'music-engine', proveedores: ['elevenlabs'], estado: 'preparada', coste: 'pendiente' },
  { id: 'stems', claveTitulo: 'capStems', claveNota: 'capStemsNote', contrato: 'music.stems', responsable: 'music-engine', proveedores: [], estado: 'preparada', coste: 'pendiente' },
  { id: 'audioProcessing', claveTitulo: 'capProcessing', claveNota: 'capProcessingNote', contrato: 'music.process', responsable: 'ninguno', proveedores: [], estado: 'pendiente', coste: 'pendiente' },
  { id: 'export', claveTitulo: 'capExport', claveNota: 'capExportNote', contrato: 'music.export', responsable: 'music-engine', proveedores: ['minimax', 'elevenlabs'], estado: 'preparada', coste: 'pendiente' },
  { id: 'midi', claveTitulo: 'capMidi', claveNota: 'capMidiNote', contrato: null, responsable: 'ninguno', proveedores: [], estado: 'pendiente', coste: 'pendiente' },
  { id: 'draft', claveTitulo: 'capDraft', claveNota: 'capDraftNote', contrato: null, responsable: 'dispositivo', proveedores: [], estado: 'implementada', coste: 'sinCoste' },
  { id: 'library', claveTitulo: 'capLibrary', claveNota: 'capLibraryNote', contrato: null, responsable: 'dispositivo', proveedores: [], estado: 'implementada', coste: 'sinCoste' },
];

export const capacidadDeMusic = (id: IdDeCapacidadMusic): CapacidadDeMusic =>
  CAPACIDADES_MUSIC.find((c) => c.id === id) as CapacidadDeMusic;

/**
 * ¿Se puede USAR ahora? Solo lo que está implementado sin proveedor, o lo preparado cuando la generación está
 * validada. `pendiente` nunca se puede usar, ni con el interruptor abierto.
 */
export const capacidadUsable = (id: IdDeCapacidadMusic): boolean => {
  const c = capacidadDeMusic(id);
  if (c.estado === 'implementada') return true;
  return c.estado === 'preparada' && MUSIC_GENERACION_VALIDADA;
};
