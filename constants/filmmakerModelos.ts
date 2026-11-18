/**
 * EL CATÁLOGO ÚNICO DE MODELOS DE WEË FILMMAKER (2026-11-18). Solo DATOS: lo que el panel de especificaciones y la rejilla de píldoras leen.
 *
 * Espejo de la verdad del servidor, no su fuente: los modelos `integrado` copian lo que dicen `functions/src/engine/providers/seedance.ts`
 * (`SEEDANCE_SPECS`, ids oficiales) y `seedance-capacidades.ts`; `functions/test/filmmaker-especificaciones.test.mjs` hace fallar cualquier desvío.
 * Los demás proveedores del mercado salen `pronto` (visibles y cerrados, nunca simulados): su estructura ya está, y integrar uno es CAMBIAR su `estado`
 * aquí y tener su adaptador en el servidor (una línea en `ADAPTERS`), sin tocar la interfaz.
 *
 * Regla de datos: una capacidad solo tiene valor si hay fuente oficial legible; si no, es `'desconocido'` y el panel no la ofrece ni la inventa.
 * Los nombres de modelos y proveedores son DATOS (no se traducen). El `idServidor` jamás se enseña: la persona ve el `nombre`.
 */
import type { NombreDeIcono } from '../components/icons/trazosDeWee';

export type TipoDeModelo = 'video' | 'imagen' | 'voz';
/** integrado = el engine lo tiene configurado y se puede elegir · pronto = existe en el mercado, sin adaptador · sin_configurar = hay adaptador pero falta su configuración. */
export type EstadoDeModelo = 'integrado' | 'pronto' | 'sin_configurar';
export type Dato<T> = T | 'desconocido';
export type Resolucion = '480p' | '720p' | '1080p' | '4k';

export interface ModeloDeFilmmaker {
  /** Identificador estable de Weë (el que se guarda por proyecto). */
  readonly id: string;
  readonly nombre: string;
  readonly familia: string;
  readonly proveedor: string;
  readonly tipo: TipoDeModelo;
  readonly estado: EstadoDeModelo;
  /** Id oficial del proveedor (solo integrados): lo compara la prueba de coherencia; nunca se muestra. */
  readonly idServidor?: string;
  /** Microetiquetas de la píldora (claves de etiqueta de `filmmakerSpecs`), sacadas de capacidades documentadas. */
  readonly etiquetas: readonly string[];
  readonly duracion: Dato<{ readonly min: number; readonly max: number }>;
  readonly formatos: Dato<readonly string[]>;
  readonly resoluciones: Dato<readonly Resolucion[]>;
  readonly audio: Dato<boolean>;
  readonly referencias: Dato<{ readonly imagenes: number; readonly videos: number; readonly audios: number }>;
  /** Para dar mejor coste/velocidad en el menú de calidad: 'rapido' si el modelo es la variante rápida. */
  readonly perfil?: 'rapido' | 'equilibrado' | 'calidad';
}

const RATIOS_SEEDANCE = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'] as const;
const DESCONOCIDO = 'desconocido' as const;

const pronto = (id: string, nombre: string, familia: string, proveedor: string, tipo: TipoDeModelo = 'video'): ModeloDeFilmmaker => ({
  id, nombre, familia, proveedor, tipo, estado: 'pronto', etiquetas: [], duracion: DESCONOCIDO, formatos: DESCONOCIDO, resoluciones: DESCONOCIDO, audio: DESCONOCIDO, referencias: DESCONOCIDO,
});

export const MODELOS_DE_FILMMAKER: readonly ModeloDeFilmmaker[] = Object.freeze([
  /* ── Vídeo · BytePlus (ModelArk): lo único con claves hoy ─────────────────────────────────────────────────────── */
  { id: 'seedance-2-5', nombre: 'Seedance 2.5', familia: 'Seedance', proveedor: 'BytePlus', tipo: 'video', estado: 'integrado', idServidor: 'dreamina-seedance-2-5-260628', etiquetas: ['tagQuality', 'tagLong', 'tagAudio'], perfil: 'calidad',
    duracion: { min: 4, max: 30 }, formatos: RATIOS_SEEDANCE, resoluciones: ['480p', '720p', '1080p'], audio: true, referencias: { imagenes: 30, videos: 10, audios: 10 } },
  { id: 'seedance-2-0', nombre: 'Seedance 2.0', familia: 'Seedance', proveedor: 'BytePlus', tipo: 'video', estado: 'integrado', idServidor: 'dreamina-seedance-2-0-260128', etiquetas: ['tag4k', 'tagAudio'], perfil: 'equilibrado',
    duracion: { min: 4, max: 15 }, formatos: RATIOS_SEEDANCE, resoluciones: ['480p', '720p', '1080p', '4k'], audio: true, referencias: { imagenes: 9, videos: 3, audios: 3 } },
  { id: 'seedance-2-0-fast', nombre: 'Seedance 2.0 Fast', familia: 'Seedance', proveedor: 'BytePlus', tipo: 'video', estado: 'integrado', idServidor: 'dreamina-seedance-2-0-fast-260128', etiquetas: ['tagFast', 'tagAudio'], perfil: 'rapido',
    duracion: { min: 4, max: 15 }, formatos: RATIOS_SEEDANCE, resoluciones: ['480p', '720p'], audio: true, referencias: { imagenes: 9, videos: 3, audios: 3 } },
  { id: 'seedance-2-0-mini', nombre: 'Seedance 2.0 Mini', familia: 'Seedance', proveedor: 'BytePlus', tipo: 'video', estado: 'integrado', idServidor: 'dreamina-seedance-2-0-mini-260615', etiquetas: ['tagEconomy', 'tagAudio'], perfil: 'rapido',
    duracion: { min: 4, max: 15 }, formatos: RATIOS_SEEDANCE, resoluciones: ['480p', '720p'], audio: true, referencias: { imagenes: 9, videos: 3, audios: 3 } },
  /* Flash: id oficial leído en la documentación, SIN adaptador ni tarifa en el servidor (NOT_CONFIGURED): cerrado con su motivo. */
  { id: 'seedance-2-5-flash', nombre: 'Seedance 2.5 Flash', familia: 'Seedance', proveedor: 'BytePlus', tipo: 'video', estado: 'sin_configurar', idServidor: 'dreamina-seedance-2-5-flash-261115', etiquetas: ['tagFast'], perfil: 'rapido',
    duracion: { min: 4, max: 30 }, formatos: DESCONOCIDO, resoluciones: ['480p', '720p'], audio: DESCONOCIDO, referencias: { imagenes: 10, videos: 5, audios: 5 } },

  /* ── Vídeo · el resto del mercado: visibles y cerrados. Capacidades 'desconocido' hasta integrarlos con su documentación oficial. ── */
  pronto('veo', 'Veo', 'Veo', 'Google'),
  pronto('kling', 'Kling', 'Kling', 'Kuaishou'),
  pronto('runway-gen4', 'Runway Gen-4', 'Runway', 'Runway'),
  pronto('luma-ray', 'Luma Ray', 'Ray', 'Luma'),
  pronto('hailuo', 'Hailuo', 'Hailuo', 'MiniMax'),
  pronto('wan', 'Wan', 'Wan', 'Alibaba'),
  pronto('vidu', 'Vidu', 'Vidu', 'Shengshu'),
  pronto('pika', 'Pika', 'Pika', 'Pika'),
  pronto('pixverse', 'PixVerse', 'PixVerse', 'PixVerse'),
  pronto('ltx', 'LTX', 'LTX', 'Lightricks'),

  /* ── Imagen y voz: viven en sus propias etapas (universo, storyboard, voces); aquí solo se ven. ───────────────── */
  { ...pronto('nano-banana', 'Nano Banana', 'Gemini', 'Google', 'imagen'), estado: 'integrado' },
  { ...pronto('seedream', 'Seedream', 'Seedream', 'BytePlus', 'imagen'), estado: 'integrado' },
  { ...pronto('flux', 'Flux', 'Flux', 'Black Forest Labs', 'imagen'), estado: 'integrado' },
  { ...pronto('elevenlabs', 'ElevenLabs', 'ElevenLabs', 'ElevenLabs', 'voz'), estado: 'integrado' },
]);

export const FILTROS_DE_TIPO: readonly { id: TipoDeModelo; clave: string; icono: NombreDeIcono }[] = [
  { id: 'video', clave: 'filmmakerSpecs.typeVideo', icono: 'claqueta' as NombreDeIcono },
  { id: 'imagen', clave: 'filmmakerSpecs.typeImage', icono: 'galeria' as NombreDeIcono },
  { id: 'voz', clave: 'filmmakerSpecs.typeVoice', icono: 'texto' as NombreDeIcono },
];

export const MODELO_AUTO = 'auto';

export const modeloPorId = (id: string): ModeloDeFilmmaker | undefined => MODELOS_DE_FILMMAKER.find((m) => m.id === id);
/** Solo estos se pueden elegir para el vídeo de la obra. */
export const esElegible = (m: ModeloDeFilmmaker): boolean => m.tipo === 'video' && m.estado === 'integrado';
export const MODELOS_ELEGIBLES: readonly ModeloDeFilmmaker[] = MODELOS_DE_FILMMAKER.filter(esElegible);

/** Los proveedores del tipo, en el orden del catálogo (el primero con modelos integrados va primero porque así está escrito). */
export const proveedoresDe = (tipo: TipoDeModelo): readonly string[] => {
  const vistos: string[] = [];
  for (const m of MODELOS_DE_FILMMAKER) if (m.tipo === tipo && !vistos.includes(m.proveedor)) vistos.push(m.proveedor);
  return vistos;
};
