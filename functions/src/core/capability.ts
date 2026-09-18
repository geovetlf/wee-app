import { CAPABILITY_CONTRACT_VERSION } from './contracts';

/**
 * WEE CORE — CAPACIDADES. El vocabulario central del sistema.
 *
 * ── Por qué esto vive aquí y no en `creator/` ───────────────────────────────
 *
 * Porque lo importan veinte módulos que no tienen nada que ver con Weë Creator:
 * el router, el registro de proveedores, los once adaptadores, el cálculo de
 * precios, el gateway. Mientras `CapabilityId` vivió en `creator/types.ts`, el
 * MOTOR dependía de la CAPA DE EXPERIENCIA, que es justo del revés de lo que
 * debe ser. Una capacidad no es de Weë Creator: es de Weë.
 *
 * `creator/types.ts` sigue re-exportándolo, así que ningún importador se entera
 * y no hubo que tocar veinte archivos para arreglar una flecha.
 *
 * ── La regla que protege todo lo demás ──────────────────────────────────────
 *
 * UNA CAPACIDAD ES UN CONTRATO, NO UN PROVEEDOR. `image.generate` dice qué se
 * quiere conseguir; quién lo consigue lo decide el router leyendo el registro.
 * Por eso aquí no aparece —ni puede aparecer— el nombre de ningún proveedor ni
 * de ningún modelo. El día que Weë cambie de proveedor de imagen, este archivo
 * no se toca.
 *
 * Y al revés: no se inventan capacidades para acomodar a un proveedor. Si un
 * proveedor hace algo que ninguna capacidad describe, la pregunta es qué quiere
 * conseguir la persona, no cómo se llama el endpoint.
 */

/**
 * Las capacidades que Weë sabe nombrar hoy.
 *
 * Es la lista que ya usaba todo el sistema, movida sin tocar una coma: cambiar
 * su contenido aquí cambiaría el enrutado, los precios y el libro de golpe, y
 * eso no es una mudanza, es otra cosa.
 */
export type CapabilityId =
  | 'text.generate'
  | 'text.structure'
  | 'text.search'
  | 'image.generate'
  | 'image.edit'
  | 'image.background_remove'
  | 'image.upscale'
  | 'image.object_remove'
  | 'image.identity_edit'
  | 'image.space_restyle'
  | 'image.try_on'
  | 'vision.describe'
  | 'video.generate'
  | 'video.image_to_video'
  | 'video.reference'
  | 'video.compose'
  | 'voice.tts'
  | 'music.generate'
  | 'doc.render'
  // AI Drama y pipelines futuros (docs/AI-ENGINE.md)
  | 'script.write'
  | 'scene.split'
  | 'subtitle.generate'
  | 'image.reference'
  | 'video.montage'
  | 'video.vertical'
  | 'audio.sfx'
  | 'audio.transcribe'
  | 'doc.read';

/**
 * Las modalidades que atraviesan el sistema.
 *
 * Coincide a propósito con `engine/types.ts`: son la MISMA idea y tener dos
 * listas que se parecen es peor que no tener ninguna. El Core la declara y el
 * motor la seguirá; mientras la migración no toque `engine/`, las dos existen y
 * una prueba comprueba que dicen lo mismo.
 */
export type Modality = 'text' | 'vision' | 'image' | 'video' | 'voice' | 'music' | 'doc';

/**
 * HASTA DÓNDE ESTÁ COMPROBADA UNA CAPACIDAD, y esto no es burocracia.
 *
 * El brief pide que Weë pueda decir «esto lo sé hacer» sin mentir. Una capacidad
 * puede estar declarada en el tipo y no tener detrás ni un proveedor con clave.
 * Sin un estado explícito, el sistema no puede distinguir «no disponible ahora»
 * de «nunca lo estuvo», y acaba prometiendo lo que no puede cumplir.
 *
 * `SUPPORTED` significa que al menos un proveedor la implementa y respondió de
 * verdad alguna vez. No se pone a mano por optimismo.
 */
export type CapabilityStatus = 'SUPPORTED' | 'PENDING' | 'UNSUPPORTED' | 'DEPRECATED';

/** Qué clase de entrada admite una capacidad. Multimodal desde el contrato. */
export interface CapabilityIO {
  /** Modalidades que acepta como entrada. Vacío = no necesita entrada. */
  accepts: readonly Modality[];
  /** Modalidad de lo que devuelve. */
  produces: Modality;
  /** true cuando además de la entrada principal admite material de referencia. */
  acceptsReferences?: boolean;
}

/**
 * Lo que el registro sabe de una capacidad.
 *
 * Fíjate en lo que NO hay: ni `provider`, ni `model`, ni precio. Esas tres cosas
 * cambian solas y viven donde se pueden cambiar sin desplegar —el registro de
 * proveedores y Firestore—. Aquí solo está lo que define la capacidad EN SÍ, que
 * es lo único que no debería cambiar cuando cambia el mercado.
 */
export interface CapabilityDefinition {
  id: CapabilityId;
  /** Versión del contrato de esta definición. */
  contract: typeof CAPABILITY_CONTRACT_VERSION;
  /** Familia a la que pertenece: 'image' de 'image.generate'. */
  family: string;
  io: CapabilityIO;
  status: CapabilityStatus;
  /** Frase corta, para paneles de administración. Nunca se enseña a la persona. */
  note?: string;
}

/** 'image' de 'image.generate'. La familia es el prefijo, siempre. */
export const familiaDe = (capability: CapabilityId): string => capability.split('.')[0];

/**
 * Modalidad de una capacidad.
 *
 * Casi siempre se deduce de la familia, pero hay dos que no: transcribir audio
 * produce texto y su entrada es voz, y leer un PDF es visión aunque la familia
 * diga `doc`. Las excepciones se declaran; el resto se deduce.
 */
const MODALIDAD_EXACTA: Partial<Record<CapabilityId, Modality>> = {
  'audio.transcribe': 'voice',
  'doc.read': 'vision',
};

const MODALIDAD_DE_FAMILIA: Record<string, Modality> = {
  text: 'text',
  vision: 'vision',
  image: 'image',
  video: 'video',
  voice: 'voice',
  music: 'music',
  doc: 'doc',
  script: 'text',
  scene: 'text',
  subtitle: 'text',
  audio: 'music',
};

export const modalidadDe = (capability: CapabilityId): Modality =>
  MODALIDAD_EXACTA[capability] || MODALIDAD_DE_FAMILIA[familiaDe(capability)] || 'text';

/**
 * El registro de capacidades.
 *
 * Es un puerto, no una tabla: quien lo implemente puede leer de memoria, de
 * Firestore o de donde haga falta. El Core solo necesita poder preguntar.
 *
 * `disponibles()` no devuelve «las que existen» sino «las que HOY puede
 * atender alguien». Es la diferencia entre un catálogo y una promesa.
 */
export interface CapabilityRegistry {
  get(id: CapabilityId): CapabilityDefinition | undefined;
  all(): readonly CapabilityDefinition[];
  disponibles(): readonly CapabilityDefinition[];
  /** Las que aceptan esta modalidad de entrada. Para elegir qué ofrecer ante un adjunto. */
  queAceptan(modalidad: Modality): readonly CapabilityDefinition[];
}

/**
 * Un registro en memoria a partir de una lista. Sin E/S y sin estado global:
 * se le dan las definiciones y responde. Suficiente para el Core y para las
 * pruebas; quien quiera leerlas de Firestore implementa el mismo puerto.
 */
export const crearRegistroDeCapacidades = (
  definiciones: readonly CapabilityDefinition[],
): CapabilityRegistry => {
  const porId = new Map<CapabilityId, CapabilityDefinition>();
  for (const d of definiciones) porId.set(d.id, d);
  const todas = [...porId.values()];
  return {
    get: (id) => porId.get(id),
    all: () => todas,
    disponibles: () => todas.filter((d) => d.status === 'SUPPORTED'),
    queAceptan: (modalidad) => todas.filter((d) => d.io.accepts.includes(modalidad)),
  };
};
