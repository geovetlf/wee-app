import type { Modality } from '../core/capability';
import type { ContinuityRequirements, SpatialConstraint } from '../core/continuity';
import { SHOT_CONTRACT_VERSION } from '../core/contracts';
import type { AspectRatio, CameraType, CreativeParameters, MovementType, ShotType, TransitionType } from '../core/creative';
import { valorCreativo } from '../core/creative';
import { CAPABILITY_CATALOG } from '../core/registry/capabilities';
import type { CoreCapabilityId } from '../core/registry/capabilities';
import type { ElementBinding, SceneNode, ShotNode } from '../core/shot';
import { MAX_NARRATIVA } from '../core/shot';
import {
  AudioCueKind, CharacterState, ColorDirection, ContinuityRule, DialogueKind, DialogueLine, FilmmakerProduction,
  IntentConstraintKind, NarrativePurpose, Pacing, ProductionCharacter, ProductionLocation, ProductionObject,
  ProductionQuality, ProductionReference, RESOLUCIONES, ResolutionTarget,
  ShotSubject, TimeOfDay, Unidad, VoiceReference, Weather, aMs, aSec, compararTexto,
  continuidadEfectiva, creativoEfectivo, derivarId, duracionDeLineaMs, duracionDeUnidadMs, estadoEfectivo,
  idiomaDeLinea, idsDeLaProduccion, repartoDelPlano, unidades, vozDeLinea,
} from './modelo';
import { FilmmakerIssue, Params, ValidationProblem, claveDeMensaje, validarProduccion } from './validacion';

/**
 * WEË FILMMAKER — DE LA PRODUCCIÓN A LO QUE HACE FALTA PARA HACERLA.
 *
 * ── Qué produce ─────────────────────────────────────────────────────────────
 *
 *   · BORRADORES de `SceneNode` y `ShotNode`: la parte de dominio de los nodos
 *     del Core, sin cuenta, sin proyecto y sin horas —eso lo pone quien guarde—.
 *     Con esos campos añadidos, el validador del Core los acepta tal cual; nada
 *     del Core se ha modificado para ello.
 *   · REQUISITOS: qué capacidad del catálogo hace falta, con qué entrada, qué
 *     salida se espera, cuánto dura, en qué formato, con qué referencias, qué
 *     calidad se pide y qué continuidad se exige. Uno por plano, por línea de
 *     diálogo, por sonido, por fotograma de vista previa y por paso de montaje.
 *   · Un RESUMEN por capacidad, para que una fase posterior pueda cotizar.
 *   · La LÍNEA DE TIEMPO: dónde empieza y acaba cada cosa.
 *
 * ── Lo que NO produce ───────────────────────────────────────────────────────
 *
 * Ni proveedor, ni modelo, ni dirección de una API, ni precio. Un requisito dice
 * QUÉ necesita la producción; CÓMO se consigue lo deciden el Planner, el
 * Registry y el Router, que ya existen. Las capacidades son las del catálogo del
 * Core, y lo que el catálogo no tiene no se inventa: se declara sin resolver.
 *
 * Solo se traduce una producción lista (`ready`): con planos sin duración no hay
 * línea de tiempo, y con referencias colgando no hay requisito que valga.
 */

/* ── Tipos ────────────────────────────────────────────────────────────────── */

export type SceneDraftNode = Pick<SceneNode,
  'contract' | 'sceneId' | 'version' | 'order' | 'name' | 'location' | 'elements' | 'creative' | 'narrative'>;

export type ShotDraftNode = Pick<ShotNode,
  'contract' | 'shotId' | 'version' | 'order' | 'state' | 'sceneId' | 'previousShotId' | 'dependsOnShotIds'
  | 'elements' | 'creative' | 'continuity' | 'narrative'>;

export interface SceneDraft {
  readonly sceneId: string;
  readonly node: SceneDraftNode;
}

/** Un plano en borrador. `implicit`: la escena no tenía planos y se genera entera como uno. */
export interface ShotDraft {
  readonly unitId: string;
  readonly implicit: boolean;
  readonly node: ShotDraftNode;
}

/** Una cosa de la producción que entra en una generación, con su ficha entera. */
export interface EntityInput {
  readonly id: string;
  readonly kind: 'character' | 'location' | 'object';
  readonly definition: ProductionCharacter | ProductionLocation | ProductionObject;
  readonly state?: CharacterState;
}

export interface ReferenceInput {
  readonly referenceId: string;
  readonly definition: ProductionReference;
}

export interface LineInput {
  readonly lineId: string;
  readonly kind: DialogueKind;
  readonly characterId?: string;
  readonly text: string;
  readonly language?: string;
  readonly emotion?: string;
}

export interface ShotRequirementInput {
  readonly description?: string;
  readonly sceneDescription?: string;
  readonly narrativePurpose?: NarrativePurpose;
  /** La intención creativa que vale en el plano, ya heredada y con el encuadre del formato. */
  readonly creative: CreativeParameters;
  readonly look: {
    readonly visualStyle?: string;
    readonly mood?: string;
    readonly tone?: string;
    readonly pacing?: Pacing;
    readonly color?: ColorDirection;
    readonly sceneStyle?: string;
    readonly sceneMood?: string;
    readonly shotStyle?: string;
    readonly shotMood?: string;
  };
  readonly environment: { readonly timeOfDay?: TimeOfDay; readonly weather?: Weather };
  readonly location?: EntityInput;
  readonly subject?: ShotSubject;
  readonly characters: readonly EntityInput[];
  readonly objects: readonly EntityInput[];
  readonly actions: readonly string[];
  /** Solo lo que se dice A CÁMARA: las voces en off y la narración son requisitos de audio. */
  readonly dialogue: readonly LineInput[];
  readonly references: readonly ReferenceInput[];
  readonly firstFrameReferenceId?: string;
  readonly lastFrameReferenceId?: string;
  /** El texto de la persona en modo avanzado. Solo aquí: nunca en un `ShotNode`. */
  readonly advancedPrompt?: string;
}

export interface ShotRequirement {
  /** `shot:<unitId>`. */
  readonly id: string;
  readonly unitId: string;
  readonly sceneId: string;
  readonly shotId?: string;
  readonly implicit: boolean;
  readonly capability: CoreCapabilityId;
  readonly input: ShotRequirementInput;
  readonly output: { readonly modality: Modality; readonly withSound?: boolean };
  readonly durationSec: number;
  readonly format: { readonly aspectRatio: AspectRatio; readonly resolution?: ResolutionTarget };
  readonly quality?: ProductionQuality;
  readonly continuity?: ContinuityRule;
  /** Requisitos que tienen que estar antes: los planos de los que depende. */
  readonly after: readonly string[];
  /** Lo que la persona prohibió y afecta a este resultado. */
  readonly constraints: readonly IntentConstraintKind[];
}

export interface AudioRequirement {
  /** `line:<id>` o `cue:<id>`. */
  readonly id: string;
  readonly kind: DialogueKind | AudioCueKind;
  readonly capability: CoreCapabilityId;
  readonly input: {
    readonly text?: string;
    readonly description?: string;
    readonly language?: string;
    readonly emotion?: string;
    readonly speakerId?: string;
    readonly voice?: VoiceReference;
    readonly references: readonly ReferenceInput[];
  };
  readonly output: { readonly modality: Modality };
  /** Estimada para una línea; declarada o la de su tramo para un sonido. */
  readonly durationSec?: number;
  readonly placement: { readonly startSec: number; readonly endSec: number; readonly sceneId?: string; readonly unitId?: string };
}

/** Un fotograma por plano antes del vídeo, cuando la producción lo pide: ver antes de gastar. */
export interface PreviewRequirement {
  readonly id: string;
  readonly unitId: string;
  readonly forRequirementId: string;
  readonly capability: CoreCapabilityId;
  readonly output: { readonly modality: Modality };
  readonly format: { readonly aspectRatio: AspectRatio; readonly resolution?: ResolutionTarget };
}

export type AssemblyPurpose = 'montage' | 'subtitles' | 'cut' | 'reframe' | 'burn_subtitles';

export interface AssemblyRequirement {
  readonly id: string;
  readonly purpose: AssemblyPurpose;
  readonly capability: CoreCapabilityId;
  readonly targetId?: string;
  readonly inputs: readonly string[];
  readonly output: {
    readonly modality: Modality;
    readonly aspectRatio?: AspectRatio;
    readonly resolution?: ResolutionTarget;
    readonly durationSec?: number;
    readonly language?: string;
  };
}

export interface CapabilityRequirement {
  readonly capability: CoreCapabilityId;
  readonly count: number;
  /** Segundos pedidos, cuando la capacidad trabaja por tiempo. */
  readonly totalSec?: number;
  readonly requirementIds: readonly string[];
}

/** Lo que haría falta y el catálogo no tiene. Se dice; no se inventa una capacidad. */
export type UnresolvedNeed = FilmmakerIssue<'capability_not_in_catalog'>;

export interface TimelineSegment {
  readonly unitId: string;
  readonly sceneId: string;
  readonly shotId?: string;
  readonly startSec: number;
  readonly endSec: number;
  /** La transición con la que este plano da paso al siguiente. */
  readonly transitionOut?: TransitionType;
}

export interface Timeline {
  readonly totalSec: number;
  readonly segments: readonly TimelineSegment[];
  readonly scenes: readonly { readonly sceneId: string; readonly startSec: number; readonly endSec: number }[];
  readonly markers: readonly { readonly markerId: string; readonly atShotId: string; readonly atSec: number; readonly label?: string }[];
}

export interface ProductionRequirements {
  readonly timeline: Timeline;
  readonly drafts: { readonly scenes: readonly SceneDraft[]; readonly shots: readonly ShotDraft[] };
  readonly shots: readonly ShotRequirement[];
  readonly audio: readonly AudioRequirement[];
  readonly previews: readonly PreviewRequirement[];
  readonly assembly: readonly AssemblyRequirement[];
  readonly capabilities: readonly CapabilityRequirement[];
  readonly unresolved: readonly UnresolvedNeed[];
}

export type RequirementsResult =
  | { readonly ok: true; readonly requirements: ProductionRequirements }
  | { readonly ok: false; readonly problems: readonly ValidationProblem[] };

/* ── Herramientas ─────────────────────────────────────────────────────────── */

/** Qué produce cada capacidad, según el catálogo. Así la salida esperada no se escribe dos veces. */
const produce = (id: CoreCapabilityId): Modality => {
  const entrada = CAPABILITY_CATALOG.find((c) => c.id === id);
  if (!entrada) throw new Error(`capacidad fuera del catálogo: ${id}`);
  return entrada.produces;
};

/** Un texto recortado a lo que cabe en un nodo del Core, sin partir un carácter por la mitad. */
const recortar = (t: string | undefined, max: number): string | undefined => {
  if (t === undefined) return undefined;
  const limpio = t.trim();
  if (!limpio) return undefined;
  if (limpio.length <= max) return limpio;
  let salida = '';
  for (const ch of Array.from(limpio)) {
    if (salida.length + ch.length > max - 1) break;
    salida += ch;
  }
  return `${salida}…`;
};

const sinRepetidos = <T>(xs: readonly T[]): T[] => xs.filter((x, i) => xs.indexOf(x) === i);

/* ── La línea de tiempo ───────────────────────────────────────────────────── */

/**
 * DÓNDE EMPIEZA Y ACABA CADA COSA. Se deriva del orden de escenas y planos y de
 * sus duraciones: no se guarda en ningún sitio, así que no puede desfasarse.
 * Sin todas las duraciones no hay línea de tiempo.
 */
export const lineaDeTiempo = (prod: FilmmakerProduction): Timeline | undefined => {
  const segments: TimelineSegment[] = [];
  const escenas: { sceneId: string; startSec: number; endSec: number }[] = [];
  let t = 0;
  for (const u of unidades(prod)) {
    const d = duracionDeUnidadMs(u);
    if (d === undefined) return undefined;
    const transicion = valorCreativo(creativoEfectivo(prod, u.scene, u.shot), 'transition.type') as TransitionType | undefined;
    segments.push({
      unitId: u.unitId, sceneId: u.scene.id, ...(u.shot ? { shotId: u.shot.id } : {}),
      startSec: aSec(t), endSec: aSec(t + d), ...(transicion !== undefined ? { transitionOut: transicion } : {}),
    });
    const ultima = escenas[escenas.length - 1];
    if (ultima && ultima.sceneId === u.scene.id) ultima.endSec = aSec(t + d);
    else escenas.push({ sceneId: u.scene.id, startSec: aSec(t), endSec: aSec(t + d) });
    t += d;
  }
  const inicioDe = new Map(segments.map((s) => [s.unitId, s.startSec] as [string, number]));
  const markers = (prod.editPlan.markers ?? []).map((m) => ({
    markerId: m.id, atShotId: m.atShotId, atSec: inicioDe.get(m.atShotId) ?? 0, ...(m.label !== undefined ? { label: m.label } : {}),
  }));
  return { totalSec: aSec(t), segments, scenes: escenas, markers };
};

/* ── Borradores para el Core ──────────────────────────────────────────────── */

const vinculos = (prod: FilmmakerProduction, ids: readonly string[]): ElementBinding[] => {
  const porId = new Map<string, ElementBinding | undefined>();
  for (const c of prod.characters) porId.set(c.id, c.element);
  for (const o of prod.objects) porId.set(o.id, o.element);
  for (const l of prod.locations) porId.set(l.id, l.element);
  const salida: ElementBinding[] = [];
  for (const id of ids) {
    const b = porId.get(id);
    if (b && !salida.some((x) => x.elementId === b.elementId)) salida.push({ elementId: b.elementId, version: b.version });
  }
  return salida;
};

/**
 * LA CONTINUIDAD, EN EL IDIOMA DEL CORE. Los anclajes y las relaciones solo
 * pueden señalar Elements de la cuenta: lo que en la producción aún no tiene su
 * `element` se queda en el requisito de Filmmaker, con sus ids, y no en el nodo.
 */
const continuidadDelCore = (prod: FilmmakerProduction, regla: ContinuityRule | undefined): ContinuityRequirements | undefined => {
  if (!regla) return undefined;
  const anchors = vinculos(prod, regla.anchors ?? []);
  const unoSolo = (id: string): ElementBinding | undefined => vinculos(prod, [id])[0];
  const spatial: SpatialConstraint[] = [];
  for (const r of regla.spatial ?? []) {
    const s = unoSolo(r.subject);
    const o = unoSolo(r.object);
    if (!s || !o || s.elementId === o.elementId) continue;
    if (!spatial.some((x) => x.subject === s.elementId && x.relation === r.relation && x.object === o.elementId)) {
      spatial.push({ subject: s.elementId, relation: r.relation, object: o.elementId });
    }
  }
  return {
    preserve: regla.preserve,
    ...(regla.mayChange?.length ? { mayChange: regla.mayChange } : {}),
    ...(regla.strength !== undefined ? { strength: regla.strength } : {}),
    ...(anchors.length ? { anchors } : {}),
    ...(spatial.length ? { spatial } : {}),
  };
};

/* ── La traducción ────────────────────────────────────────────────────────── */

const REFERENCIAS_DE_IMAGEN_O_VIDEO = ['image', 'video'];

/**
 * DE LA PRODUCCIÓN A SUS REQUISITOS. Solo si está lista: si no, se devuelven los
 * errores que lo impiden y nada más.
 */
export const requisitosDeProduccion = (prod: FilmmakerProduction): RequirementsResult => {
  const v = validarProduccion(prod, { stage: 'ready' });
  if (!v.valid) return { ok: false, problems: v.problems.filter((p) => p.severity === 'error') };

  const timeline = lineaDeTiempo(prod) as Timeline;
  const tramoDe = new Map(timeline.segments.map((s) => [s.unitId, s] as [string, TimelineSegment]));
  const tramoDeEscena = new Map(timeline.scenes.map((s) => [s.sceneId, s] as [string, { startSec: number; endSec: number }]));
  const personajes = new Map(prod.characters.map((c) => [c.id, c] as [string, ProductionCharacter]));
  const lugares = new Map(prod.locations.map((l) => [l.id, l] as [string, ProductionLocation]));
  const cosas = new Map(prod.objects.map((o) => [o.id, o] as [string, ProductionObject]));
  const referencias = new Map(prod.references.map((r) => [r.id, r] as [string, ProductionReference]));
  const ocupados = idsDeLaProduccion(prod);
  const lista = unidades(prod);
  const prohibido = new Set((prod.intent.constraints ?? []).map((c) => c.kind));

  /* ── Borradores ── */
  const idDeBorrador = new Map<string, string>();
  for (const u of lista) {
    if (u.shot) { idDeBorrador.set(u.unitId, u.shot.id); continue; }
    const base = `${u.scene.id}-shot`.slice(0, 128);
    const id = ocupados.has(base) ? derivarId(base, ocupados) : base;
    ocupados.add(id);
    idDeBorrador.set(u.unitId, id);
  }
  const escenasEnBorrador: SceneDraft[] = prod.scenes.map((s, i) => {
    const reparto = [...(s.characterIds ?? []), ...(s.objectIds ?? [])];
    const elements = vinculos(prod, reparto);
    const location = s.locationId !== undefined ? lugares.get(s.locationId)?.element : undefined;
    const name = recortar(s.title, 120);
    const narrative = recortar(s.description, MAX_NARRATIVA);
    return {
      sceneId: s.id,
      node: {
        contract: SHOT_CONTRACT_VERSION, sceneId: s.id, version: 1, order: i,
        ...(name !== undefined ? { name } : {}),
        ...(location ? { location: { elementId: location.elementId, version: location.version } } : {}),
        ...(elements.length ? { elements } : {}),
        creative: creativoEfectivo(prod, s),
        ...(narrative !== undefined ? { narrative } : {}),
      },
    };
  });
  const planosEnBorrador: ShotDraft[] = lista.map((u, i) => {
    const anterior = u.shot && u.shotIndex !== undefined && u.shotIndex > 0 ? lista[i - 1] : undefined;
    const elements = vinculos(prod, [...repartoDelPlano(u.scene, u.shot), ...(u.shot?.objectIds ?? u.scene.objectIds ?? [])]);
    const continuity = continuidadDelCore(prod, continuidadEfectiva(prod, u.scene, u.shot));
    const narrative = recortar(u.shot ? u.shot.description : u.scene.description, MAX_NARRATIVA);
    const deps = u.shot?.dependsOn ?? [];
    return {
      unitId: u.unitId,
      implicit: !u.shot,
      node: {
        contract: SHOT_CONTRACT_VERSION,
        shotId: idDeBorrador.get(u.unitId) as string,
        version: 1,
        order: u.shotIndex ?? 0,
        state: 'draft',
        sceneId: u.scene.id,
        ...(anterior ? { previousShotId: idDeBorrador.get(anterior.unitId) as string } : {}),
        ...(deps.length ? { dependsOnShotIds: [...deps] } : {}),
        ...(elements.length ? { elements } : {}),
        creative: creativoEfectivo(prod, u.scene, u.shot),
        ...(continuity ? { continuity } : {}),
        ...(narrative !== undefined ? { narrative } : {}),
      },
    };
  });

  /* ── Un requisito por plano ── */
  const entidad = (kind: EntityInput['kind'], id: string, u: Unidad): EntityInput | undefined => {
    const definition = kind === 'character' ? personajes.get(id) : kind === 'location' ? lugares.get(id) : cosas.get(id);
    if (!definition) return undefined;
    const state = kind === 'character' ? estadoEfectivo(u.scene, u.shot, id) : undefined;
    return { id, kind, definition, ...(state ? { state } : {}) };
  };
  const refsDe = (definicion: { readonly referenceIds?: readonly string[]; readonly appearance?: object } | undefined): string[] => {
    if (!definicion) return [];
    const ids = [...(definicion.referenceIds ?? [])];
    for (const rasgo of Object.values(definicion.appearance ?? {}) as { referenceIds?: readonly string[] }[]) {
      ids.push(...(rasgo?.referenceIds ?? []));
    }
    return ids;
  };
  const planos: ShotRequirement[] = lista.map((u, i) => {
    const { scene, shot } = u;
    const personajesDelPlano = repartoDelPlano(scene, shot).map((id) => entidad('character', id, u)).filter((x): x is EntityInput => !!x);
    const objetosDelPlano = (shot?.objectIds ?? scene.objectIds ?? []).map((id) => entidad('object', id, u)).filter((x): x is EntityInput => !!x);
    const lugar = scene.locationId !== undefined ? entidad('location', scene.locationId, u) : undefined;
    const propias = shot?.referenceIds ?? [];
    const primer = propias.find((id) => referencias.get(id)?.role === 'first_frame');
    const ultimo = propias.find((id) => referencias.get(id)?.role === 'last_frame');
    const todas = sinRepetidos([
      ...propias,
      ...personajesDelPlano.reduce<string[]>((xs, e) => [...xs, ...refsDe(e.definition)], []),
      ...objetosDelPlano.reduce<string[]>((xs, e) => [...xs, ...refsDe(e.definition)], []),
      ...refsDe(lugar?.definition),
      ...(prod.creativeDirection.referenceIds ?? []),
    ]).filter((id) => REFERENCIAS_DE_IMAGEN_O_VIDEO.includes(String(referencias.get(id)?.kind)));
    /*
     * QUÉ CAPACIDAD: con un primer fotograma, animar esa imagen; con otras
     * imágenes o vídeos de referencia, generar a partir de ellas; si no, desde
     * la descripción. Es el QUÉ; el CON QUÉ lo decide el Router.
     */
    const capability: CoreCapabilityId = primer !== undefined ? 'video.image_to_video'
      : todas.length ? 'video.reference' : 'video.generate';
    const creativo = creativoEfectivo(prod, scene, shot);
    const continuidad = continuidadEfectiva(prod, scene, shot);
    const anterior = continuidad?.preserve.includes('temporal.previousShot') && i > 0 && lista[i - 1].scene.id === scene.id
      ? lista[i - 1].unitId : undefined;
    const after = sinRepetidos([...(shot?.dependsOn ?? []), ...(anterior !== undefined ? [anterior] : [])]).map((id) => `shot:${id}`);
    const lineas = (shot ? shot.dialogue : scene.dialogue) ?? [];
    const withSound = shot?.audio?.withSound ?? scene.audio?.withSound;
    const quality = shot?.generation?.quality ?? prod.generation.quality;
    const d = prod.creativeDirection;
    const input: ShotRequirementInput = {
      ...(shot?.description !== undefined ? { description: shot.description } : {}),
      ...(scene.description !== undefined ? { sceneDescription: scene.description } : {}),
      ...(scene.narrativePurpose !== undefined ? { narrativePurpose: scene.narrativePurpose } : {}),
      creative: creativo,
      look: {
        ...(d.visualStyle !== undefined ? { visualStyle: d.visualStyle } : {}),
        ...(d.mood !== undefined ? { mood: d.mood } : {}),
        ...(d.tone !== undefined ? { tone: d.tone } : {}),
        ...(d.pacing !== undefined ? { pacing: d.pacing } : {}),
        ...(d.color !== undefined ? { color: d.color } : {}),
        ...(scene.visual?.style !== undefined ? { sceneStyle: scene.visual.style } : {}),
        ...(scene.visual?.mood !== undefined ? { sceneMood: scene.visual.mood } : {}),
        ...(shot?.visual?.style !== undefined ? { shotStyle: shot.visual.style } : {}),
        ...(shot?.visual?.mood !== undefined ? { shotMood: shot.visual.mood } : {}),
      },
      environment: {
        ...(scene.timeOfDay !== undefined ? { timeOfDay: scene.timeOfDay } : {}),
        ...(scene.weather !== undefined ? { weather: scene.weather } : {}),
      },
      ...(lugar ? { location: lugar } : {}),
      ...(shot?.subject !== undefined ? { subject: shot.subject } : {}),
      characters: personajesDelPlano,
      objects: objetosDelPlano,
      actions: [...((shot ? shot.actions : scene.actions) ?? [])],
      dialogue: lineas.filter((l) => l.kind === 'dialogue').map((l) => {
        const idioma = idiomaDeLinea(prod, l);
        return {
          lineId: l.id, kind: l.kind, text: l.text,
          ...(l.characterId !== undefined ? { characterId: l.characterId } : {}),
          ...(idioma !== undefined ? { language: idioma } : {}),
          ...(l.emotion !== undefined ? { emotion: l.emotion } : {}),
        };
      }),
      references: todas.map((id) => ({ referenceId: id, definition: referencias.get(id) as ProductionReference })),
      ...(primer !== undefined ? { firstFrameReferenceId: primer } : {}),
      ...(ultimo !== undefined ? { lastFrameReferenceId: ultimo } : {}),
      ...(shot?.advanced !== undefined ? { advancedPrompt: shot.advanced.prompt } : {}),
    };
    const tramo = tramoDe.get(u.unitId) as TimelineSegment;
    return {
      id: `shot:${u.unitId}`,
      unitId: u.unitId,
      sceneId: scene.id,
      ...(shot ? { shotId: shot.id } : {}),
      implicit: !shot,
      capability,
      input,
      output: { modality: produce(capability), ...(withSound !== undefined ? { withSound } : {}) },
      durationSec: aSec(aMs(tramo.endSec) - aMs(tramo.startSec)),
      format: { aspectRatio: prod.format.aspectRatio, ...(prod.format.resolution !== undefined ? { resolution: prod.format.resolution } : {}) },
      ...(quality !== undefined ? { quality } : {}),
      ...(continuidad ? { continuity: continuidad } : {}),
      after,
      constraints: (['no_dialogue', 'no_music'] as IntentConstraintKind[]).filter((k) => prohibido.has(k)),
    };
  });

  /* ── Audio: cada línea y cada sonido ── */
  const audio: AudioRequirement[] = [];
  const refsDeAudio = (ids: readonly (string | undefined)[]): ReferenceInput[] =>
    sinRepetidos(ids.filter((id): id is string => id !== undefined))
      .filter((id) => referencias.get(id)?.kind === 'audio')
      .map((id) => ({ referenceId: id, definition: referencias.get(id) as ProductionReference }));
  for (const u of lista) {
    for (const l of (u.shot ? u.shot.dialogue : u.scene.dialogue) ?? []) {
      const tramo = tramoDe.get(u.unitId) as TimelineSegment;
      audio.push(linea(prod, l, tramo.startSec, tramo.endSec, u.scene.id, u.unitId, refsDeAudio));
    }
  }
  for (const s of prod.scenes) {
    if (!s.shots.length) continue;
    for (const l of s.dialogue ?? []) {
      const tramo = tramoDeEscena.get(s.id) as { startSec: number; endSec: number };
      audio.push(linea(prod, l, tramo.startSec, tramo.endSec, s.id, undefined, refsDeAudio));
    }
  }
  const CAPACIDAD_DEL_SONIDO: Readonly<Record<AudioCueKind, CoreCapabilityId>> = {
    music: 'music.generate', sfx: 'audio.sfx', ambience: 'audio.generate',
  };
  for (const c of prod.audio.cues) {
    const t = c.target;
    const [inicio, fin] = t.scope === 'production' ? [0, timeline.totalSec]
      : t.scope === 'scenes' ? tramoDeEscenas(t.sceneIds, tramoDeEscena)
        : (() => { const s = tramoDe.get(t.shotId) as TimelineSegment; return [s.startSec, s.endSec]; })();
    const capability = CAPACIDAD_DEL_SONIDO[c.kind];
    audio.push({
      id: `cue:${c.id}`,
      kind: c.kind,
      capability,
      input: { description: c.description, references: refsDeAudio(c.referenceIds ?? []) },
      output: { modality: produce(capability) },
      durationSec: c.durationSec ?? aSec(aMs(fin) - aMs(inicio)),
      placement: { startSec: inicio, endSec: fin, ...(t.scope === 'shot' ? { unitId: t.shotId } : {}) },
    });
  }

  /* ── Vista previa: un fotograma por plano, si la producción lo pide ── */
  const previews: PreviewRequirement[] = prod.generation.preview === 'frames'
    ? planos.map((p) => {
      const capability: CoreCapabilityId = p.input.references.some((r) => r.definition.kind === 'image') ? 'image.reference' : 'image.generate';
      return {
        id: `preview:${p.unitId}`, unitId: p.unitId, forRequirementId: p.id, capability,
        output: { modality: produce(capability) }, format: p.format,
      };
    })
    : [];

  /* ── Montaje y entregas ── */
  const assembly: AssemblyRequirement[] = [];
  const unresolved: UnresolvedNeed[] = [];
  const hayMontaje = planos.length > 1 || audio.length > 0;
  if (hayMontaje) {
    assembly.push({
      id: 'assembly:montage', purpose: 'montage', capability: 'video.montage',
      inputs: [...planos.map((p) => p.id), ...audio.map((a) => a.id)],
      output: {
        modality: produce('video.montage'), aspectRatio: prod.format.aspectRatio,
        ...(prod.format.resolution !== undefined ? { resolution: prod.format.resolution } : {}), durationSec: timeline.totalSec,
      },
    });
  }
  const lineasTotales = audio.filter((a) => a.id.startsWith('line:'));
  const subtitulos = prod.editPlan.subtitles?.enabled === true && lineasTotales.length > 0;
  const idiomaDeSubtitulos = prod.editPlan.subtitles?.language ?? prod.metadata.locale;
  if (subtitulos) {
    assembly.push({
      id: 'assembly:subtitles', purpose: 'subtitles', capability: 'subtitle.generate',
      inputs: lineasTotales.map((a) => a.id),
      output: { modality: produce('subtitle.generate'), ...(idiomaDeSubtitulos !== undefined ? { language: idiomaDeSubtitulos } : {}) },
    });
  }
  const maestro = hayMontaje ? 'assembly:montage' : planos[0]?.id;
  const orden: readonly string[] = RESOLUCIONES;
  for (const t of prod.exportPlan.targets) {
    let ultimo = maestro;
    const aspecto = t.aspectRatio ?? prod.format.aspectRatio;
    const resolucion = t.resolution ?? prod.format.resolution;
    const salidaDe = (duracion?: number): AssemblyRequirement['output'] => ({
      modality: 'video', aspectRatio: aspecto, ...(resolucion !== undefined ? { resolution: resolucion } : {}),
      ...(duracion !== undefined ? { durationSec: duracion } : {}),
    });
    if (t.maxDurationSec !== undefined && aMs(t.maxDurationSec) < aMs(timeline.totalSec)) {
      const id = `assembly:${t.id}:cut`;
      assembly.push({ id, purpose: 'cut', capability: 'video.montage', targetId: t.id, inputs: [ultimo], output: salidaDe(t.maxDurationSec) });
      ultimo = id;
    }
    if (aspecto !== prod.format.aspectRatio) {
      const id = `assembly:${t.id}:reframe`;
      const capability: CoreCapabilityId = aspecto === '9:16' ? 'video.vertical' : 'video.compose';
      assembly.push({ id, purpose: 'reframe', capability, targetId: t.id, inputs: [ultimo], output: salidaDe() });
      ultimo = id;
    }
    if (t.subtitleMode === 'burned' && subtitulos) {
      const id = `assembly:${t.id}:subtitles`;
      assembly.push({ id, purpose: 'burn_subtitles', capability: 'video.compose', targetId: t.id, inputs: [ultimo, 'assembly:subtitles'], output: salidaDe() });
    }
    if (t.resolution !== undefined && prod.format.resolution !== undefined && orden.indexOf(t.resolution) > orden.indexOf(prod.format.resolution)) {
      const parameters: Params = { need: 'video_upscale', from: prod.format.resolution, to: t.resolution, targetId: t.id };
      unresolved.push({
        code: 'capability_not_in_catalog', severity: 'warning', path: `exportPlan.targets.${t.id}.resolution`,
        parameters, messageKey: claveDeMensaje('requirement', 'capability_not_in_catalog'),
      });
    }
  }

  /* ── El resumen por capacidad ── */
  const porCapacidad = new Map<CoreCapabilityId, { count: number; totalMs: number; porTiempo: boolean; ids: string[] }>();
  const contar = (capability: CoreCapabilityId, id: string, sec?: number): void => {
    const e = porCapacidad.get(capability) ?? { count: 0, totalMs: 0, porTiempo: false, ids: [] };
    e.count++;
    e.ids.push(id);
    if (sec !== undefined) { e.totalMs += aMs(sec); e.porTiempo = true; }
    porCapacidad.set(capability, e);
  };
  for (const p of planos) contar(p.capability, p.id, p.durationSec);
  for (const a of audio) contar(a.capability, a.id, a.durationSec);
  for (const p of previews) contar(p.capability, p.id);
  for (const a of assembly) contar(a.capability, a.id, a.output.durationSec);
  const capabilities: CapabilityRequirement[] = [...porCapacidad.entries()]
    .sort(([a], [b]) => compararTexto(a, b))
    .map(([capability, e]) => ({
      capability, count: e.count, ...(e.porTiempo ? { totalSec: aSec(e.totalMs) } : {}), requirementIds: e.ids,
    }));

  return {
    ok: true,
    requirements: {
      timeline, drafts: { scenes: escenasEnBorrador, shots: planosEnBorrador },
      shots: planos, audio, previews, assembly, capabilities, unresolved,
    },
  };
};

const tramoDeEscenas = (
  ids: readonly string[],
  tramos: ReadonlyMap<string, { readonly startSec: number; readonly endSec: number }>,
): [number, number] => {
  const partes = ids.map((id) => tramos.get(id) as { startSec: number; endSec: number });
  return [Math.min(...partes.map((p) => p.startSec)), Math.max(...partes.map((p) => p.endSec))];
};

const linea = (
  prod: FilmmakerProduction,
  l: DialogueLine,
  inicio: number,
  fin: number,
  sceneId: string,
  unitId: string | undefined,
  refsDeAudio: (ids: readonly (string | undefined)[]) => ReferenceInput[],
): AudioRequirement => {
  const voz = vozDeLinea(prod, l);
  const idioma = idiomaDeLinea(prod, l);
  return {
    id: `line:${l.id}`,
    kind: l.kind,
    capability: 'voice.tts',
    input: {
      text: l.text,
      ...(idioma !== undefined ? { language: idioma } : {}),
      ...(l.emotion !== undefined ? { emotion: l.emotion } : {}),
      ...(l.characterId !== undefined ? { speakerId: l.characterId } : {}),
      ...(voz !== undefined ? { voice: voz } : {}),
      references: refsDeAudio([voz?.referenceId]),
    },
    output: { modality: produce('voice.tts') },
    durationSec: aSec(duracionDeLineaMs(l)),
    placement: { startSec: inicio, endSec: fin, sceneId, ...(unitId !== undefined ? { unitId } : {}) },
  };
};

/* ── El storyboard, como datos ────────────────────────────────────────────── */

/**
 * UNA TARJETA POR PLANO, para que la interfaz de una fase posterior pinte el
 * storyboard sin volver a leer toda la producción: descripción, duración, tipo
 * de plano, cámara, movimiento, lo que se dice y qué le falta. La miniatura es la
 * vista previa del plano, cuando exista; aquí solo se dice cuál sería.
 *
 * `readiness` es un estado CREATIVO —si el plano tiene lo que necesita para
 * pedirse—, no el de ningún trabajo: ese es del Job Engine.
 */
export interface StoryboardCard {
  readonly unitId: string;
  readonly sceneId: string;
  readonly sceneNumber: number;
  readonly shotNumber?: number;
  readonly description?: string;
  readonly durationSec?: number;
  readonly shotType?: ShotType;
  readonly cameraType?: CameraType;
  readonly movement?: MovementType;
  readonly dialogue: readonly string[];
  readonly previewRequirementId: string;
  readonly readiness: 'complete' | 'incomplete';
  readonly missing: readonly string[];
}

export const tarjetasDeStoryboard = (prod: FilmmakerProduction): readonly StoryboardCard[] =>
  unidades(prod).map((u) => {
    const creativo = creativoEfectivo(prod, u.scene, u.shot);
    const d = duracionDeUnidadMs(u);
    const faltan = [
      ...(d === undefined ? ['durationSec'] : []),
      ...((u.shot ? u.shot.description : u.scene.description) === undefined ? ['description'] : []),
    ];
    const shotType = valorCreativo(creativo, 'shot.type') as ShotType | undefined;
    const cameraType = valorCreativo(creativo, 'camera.type') as CameraType | undefined;
    const movement = valorCreativo(creativo, 'movement.type') as MovementType | undefined;
    const description = u.shot ? u.shot.description : u.scene.description;
    return {
      unitId: u.unitId,
      sceneId: u.scene.id,
      sceneNumber: u.sceneIndex + 1,
      ...(u.shotIndex !== undefined ? { shotNumber: u.shotIndex + 1 } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(d !== undefined ? { durationSec: aSec(d) } : {}),
      ...(shotType !== undefined ? { shotType } : {}),
      ...(cameraType !== undefined ? { cameraType } : {}),
      ...(movement !== undefined ? { movement } : {}),
      dialogue: ((u.shot ? u.shot.dialogue : u.scene.dialogue) ?? []).map((l) => l.text),
      previewRequirementId: `preview:${u.unitId}`,
      readiness: faltan.length ? 'incomplete' : 'complete',
      missing: faltan,
    };
  });

