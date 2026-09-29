import type {
  ContinuityAspect, ContinuityStrength, DialogueLine, FormatPresetId, NarrativePurpose, ObjectKind, OperationName, Pacing, ProductionType, ReferenceRole,
  SubjectFocus, TimeOfDay, TransitionType, Weather,
} from '../services/filmmaker/dominio';
import type { EnlaceDeTomaVista, EstadoDeTomaVista } from '../utils/controladorDeToma';

/**
 * WEË FILMMAKER · LO QUE LA PANTALLA DE PRODUCCIÓN ENSEÑA, COMO CLAVES (F1-C).
 *
 * Este archivo se importa fuera de React, donde no hay traductor: guarda CLAVES
 * y quien pinta resuelve. Los identificadores —`tiktok`, `rain`, `dusk`— son los
 * del dominio de F1-A, viajan al servidor y no se traducen nunca.
 *
 * Ni un vocabulario nuevo: los valores salen de F1-A (`PRESETS`, `CLIMAS`,
 * `MOMENTOS_DEL_DIA`, `ENFOQUES`) y la cámara usa la biblioteca de Weë Studio
 * (`constants/camaraCinematica.ts`), que ya nombra el lenguaje creativo del Core.
 */

/**
 * LOS SEIS FORMATOS DE F1-A, con la clave de su nombre. `instagram_reels` se
 * enseña como «Video de Instagram»: en Weë los videos cortos son Weëls y esa
 * otra palabra no asoma a la interfaz (la misma regla que Weë Business).
 */
export const PRESETS_VISIBLES: readonly { readonly preset: FormatPresetId; readonly clave: string; readonly icono: string }[] = Object.freeze([
  { preset: 'tiktok', clave: 'filmmaker.presetTiktok', icono: 'musical-notes-outline' },
  { preset: 'instagram_reels', clave: 'filmmaker.presetInstagram', icono: 'logo-instagram' },
  { preset: 'youtube_shorts', clave: 'filmmaker.presetShorts', icono: 'phone-portrait-outline' },
  { preset: 'youtube', clave: 'filmmaker.presetYoutube', icono: 'logo-youtube' },
  { preset: 'ads', clave: 'filmmaker.presetAds', icono: 'megaphone-outline' },
  { preset: 'stories', clave: 'filmmaker.presetStories', icono: 'albums-outline' },
]);

export const CLAVE_DEL_PRESET: Readonly<Record<FormatPresetId, string>> = Object.freeze(
  Object.fromEntries(PRESETS_VISIBLES.map((p) => [p.preset, p.clave])) as Record<FormatPresetId, string>,
);

export const CLAVE_DEL_CLIMA: Readonly<Record<Weather, string>> = Object.freeze({
  clear: 'filmmaker.weatherClear',
  cloudy: 'filmmaker.weatherCloudy',
  overcast: 'filmmaker.weatherOvercast',
  rain: 'filmmaker.weatherRain',
  storm: 'filmmaker.weatherStorm',
  snow: 'filmmaker.weatherSnow',
  fog: 'filmmaker.weatherFog',
  wind: 'filmmaker.weatherWind',
});

export const CLAVE_DEL_MOMENTO: Readonly<Record<TimeOfDay, string>> = Object.freeze({
  dawn: 'filmmaker.timeDawn',
  morning: 'filmmaker.timeMorning',
  midday: 'filmmaker.timeMidday',
  afternoon: 'filmmaker.timeAfternoon',
  dusk: 'filmmaker.timeDusk',
  night: 'filmmaker.timeNight',
});

export const CLAVE_DEL_ENFOQUE: Readonly<Record<SubjectFocus, string>> = Object.freeze({
  face: 'filmmaker.focusFace',
  eyes: 'filmmaker.focusEyes',
  hands: 'filmmaker.focusHands',
  upper_body: 'filmmaker.focusUpperBody',
  full_body: 'filmmaker.focusFullBody',
  group: 'filmmaker.focusGroup',
  object: 'filmmaker.focusObject',
  detail: 'filmmaker.focusDetail',
  environment: 'filmmaker.focusEnvironment',
});

/**
 * QUÉ OPERACIÓN DE F1-A CAMBIA CADA RUTA DEL LENGUAJE CREATIVO. La cámara, el
 * encuadre, la óptica y la composición son `change_camera`; el movimiento y su
 * velocidad, `change_movement`; la luz, `change_lighting`. Ni una operación nueva.
 */
export const OPERACION_DE_LA_RUTA: Readonly<Record<string, { readonly op: 'change_camera' | 'change_movement' | 'change_lighting'; readonly campo: string }>> = Object.freeze({
  'camera.type': { op: 'change_camera', campo: 'cameraType' },
  'camera.perspective': { op: 'change_camera', campo: 'perspective' },
  'shot.type': { op: 'change_camera', campo: 'shotType' },
  'lens.type': { op: 'change_camera', campo: 'lens' },
  'composition.type': { op: 'change_camera', campo: 'composition' },
  'movement.type': { op: 'change_movement', campo: 'movement' },
  'movement.speed': { op: 'change_movement', campo: 'speed' },
  'motion.smoothness': { op: 'change_movement', campo: 'smoothness' },
  'lighting.type': { op: 'change_lighting', campo: 'lighting' },
});

/**
 * Las familias de la biblioteca de cámara que el panel Director ofrece para un plano o una escena. Desde la Fase 23
 * del motor, TODAS las que el Core sabe decir: encuadre, cámara, perspectiva, óptica, movimiento, velocidad (y su
 * suavidad), composición y luz. Solo cambia lo que se puede elegir; lo que ya estaba guardado se escribe igual.
 */
export const FAMILIAS_DEL_DIRECTOR: readonly string[] = Object.freeze(['shot', 'camera', 'perspective', 'lens', 'movement', 'speed', 'composition', 'lighting']);

/** Las focales que se ofrecen (Fase 23 del motor): el Core acepta de 4 a 1200 mm; estas son las de siempre. */
export const FOCALES_MM: readonly number[] = Object.freeze([14, 24, 35, 50, 85, 135, 200]);

/** Lo que alarga o acorta un toque. Una decisión de pantalla, no del dominio: F1-A acepta cualquier paso. */
export const PASO_DE_DURACION_SEC = 0.5;
/** Con cuánto nace un plano nuevo, para que tenga duración desde el principio y se pueda alargar o acortar. */
export const DURACION_DE_UN_PLANO_NUEVO_SEC = 3;
/** Lo que cambia un toque en la duración objetivo. */
export const PASO_DEL_OBJETIVO_SEC = 5;

/**
 * QUÉ CLASES DE LO GUARDADO ENCAJAN CON CADA FICHA, para vincularla (Fase 20 del motor): las mismas que comprueba el
 * servidor al guardar (`CLASES_DE_ELEMENTO_POR_FICHA`, Fase 10). Un personaje, con personajes; un lugar, con lugares
 * y escenas guardadas.
 */
export const CLASES_POR_FICHA: Readonly<Record<'personaje' | 'lugar' | 'objeto', readonly string[]>> = Object.freeze({
  personaje: Object.freeze(['character']),
  lugar: Object.freeze(['place', 'scene']),
  /* Fase 23 del motor: los objetos también se vinculan, con las clases que el servidor admite para ellos. */
  objeto: Object.freeze(['object', 'product', 'brand']),
});

/* ── Fase 23 del motor · el proyecto, editable: las claves de sus vocabularios, los de F1-A tal cual ─── */

/** Interior o exterior (`AMBIENTES` de F1-A). */
export const CLAVE_DEL_AMBIENTE: Readonly<Record<'interior' | 'exterior', string>> = Object.freeze({
  interior: 'filmmaker.settingInterior',
  exterior: 'filmmaker.settingExterior',
});

/** Las cinco clases de objeto de F1-A (`TIPOS_DE_OBJETO`). */
export const CLAVE_DEL_TIPO_DE_OBJETO: Readonly<Record<ObjectKind, string>> = Object.freeze({
  prop: 'filmmaker.objectKindProp',
  product: 'filmmaker.objectKindProduct',
  vehicle: 'filmmaker.objectKindVehicle',
  brand: 'filmmaker.objectKindBrand',
  other: 'filmmaker.objectKindOther',
});

/** Los diez tipos de pieza de F1-A (`TIPOS_DE_PRODUCCION`). */
export const CLAVE_DEL_TIPO_DE_PRODUCCION: Readonly<Record<ProductionType, string>> = Object.freeze({
  video: 'filmmaker.typeVideo',
  short_film: 'filmmaker.typeShortFilm',
  ad: 'filmmaker.typeAd',
  trailer: 'filmmaker.typeTrailer',
  music_video: 'filmmaker.typeMusicVideo',
  story: 'filmmaker.typeStory',
  product: 'filmmaker.typeProduct',
  presentation: 'filmmaker.typePresentation',
  cinematic: 'filmmaker.typeCinematic',
  social: 'filmmaker.typeSocial',
});

/** Los tres ritmos de F1-A (`RITMOS`). */
export const CLAVE_DEL_RITMO: Readonly<Record<Pacing, string>> = Object.freeze({
  slow: 'filmmaker.pacingSlow',
  moderate: 'filmmaker.pacingModerate',
  fast: 'filmmaker.pacingFast',
});

/** Los nueve papeles de una referencia (`PAPELES_DE_REFERENCIA`). */
export const CLAVE_DEL_PAPEL_DE_REFERENCIA: Readonly<Record<ReferenceRole, string>> = Object.freeze({
  style: 'filmmaker.refRoleStyle',
  character: 'filmmaker.refRoleCharacter',
  location: 'filmmaker.refRoleLocation',
  object: 'filmmaker.refRoleObject',
  first_frame: 'filmmaker.refRoleFirstFrame',
  last_frame: 'filmmaker.refRoleLastFrame',
  motion: 'filmmaker.refRoleMotion',
  audio: 'filmmaker.refRoleAudio',
  general: 'filmmaker.refRoleGeneral',
});

/**
 * Lo que se ofrece como duración pedida en el brief. Una decisión de pantalla, no del dominio: F1-A acepta cualquier
 * duración dentro de su límite, y la de verdad es la suma de los planos.
 */
export const DURACIONES_PEDIDAS_SEC: readonly number[] = Object.freeze([15, 30, 60, 90, 120, 180]);

/**
 * LOS ESTILOS QUE SE OFRECEN, COMO TOKENS (Fase 22 del motor, arreglo R13 de la auditoría). Antes se guardaba el
 * NOMBRE traducido («Cinemático»): al cambiar de idioma la producción seguía en el de antes, el chip dejaba de
 * reconocerlo y el prompt recibía una palabra de la interfaz. Ahora se guarda el TOKEN —`cinematic`, en inglés, que es
 * lo que lee el modelo de vídeo— y el nombre sale al pintar, en el idioma de ese momento. Lo que ya estaba guardado
 * con su nombre se enseña tal cual: es lo que la persona eligió, y su prompt sigue siendo el mismo, byte a byte.
 */
export const ESTILOS_CANONICOS: readonly { readonly token: string; readonly clave: string; readonly icono: string }[] = Object.freeze([
  Object.freeze({ token: 'cinematic', clave: 'filmmaker.wsChipCinematic', icono: 'film-outline' }),
  Object.freeze({ token: 'realistic', clave: 'filmmaker.wsChipRealistic', icono: 'camera-outline' }),
  Object.freeze({ token: 'anime', clave: 'filmmaker.wsChipAnime', icono: 'sparkles-outline' }),
  Object.freeze({ token: '3d', clave: 'filmmaker.wsChip3d', icono: 'cube-outline' }),
]);

/** La clave del nombre de un estilo guardado si es uno de los tokens; si no, `null`: lo escribió alguien y se enseña tal cual. */
export const claveDelEstilo = (valor: string | null | undefined): string | null =>
  ESTILOS_CANONICOS.find((e) => e.token === valor)?.clave ?? null;

/** Cómo se enseña un estilo guardado: el nombre del token en el idioma de ahora, o el texto tal cual. */
export const nombreDelEstilo = (valor: string, t: (clave: string) => string): string => {
  const clave = claveDelEstilo(valor);
  return clave ? t(clave) : valor;
};

/**
 * ¿Lo guardado es este estilo? Lo es su token y, para lo de antes de la Fase 22, también el nombre que entonces se
 * guardaba, en el idioma de ahora: así el chip lo reconoce y un toque lo quita o lo cambia por el token.
 */
export const esElEstilo = (valor: string | null | undefined, token: string, t: (clave: string) => string): boolean => {
  if (!valor) return false;
  const clave = claveDelEstilo(token);
  return valor === token || (!!clave && valor === t(clave));
};

/**
 * CÓMO SE DICE CADA OPERACIÓN DE F1-A (Fase 22 del motor, arreglo R1 de la auditoría): una propuesta de Weë Brain son
 * operaciones, y la persona decide leyendo frases, no JSON. Una clave por operación —las 56, ni una más—, y tres para
 * el sonido, que según su acción añade, quita o cambia el narrador. Quien pinta resuelve (`utils/describirOperacion.ts`).
 */
export const CLAVE_DE_OPERACION: Readonly<Record<OperationName, string>> = Object.freeze({
  add_scene: 'filmmaker.opAddScene',
  remove_scene: 'filmmaker.opRemoveScene',
  reorder_scene: 'filmmaker.opReorderScene',
  duplicate_scene: 'filmmaker.opDuplicateScene',
  split_scene: 'filmmaker.opSplitScene',
  merge_scenes: 'filmmaker.opMergeScenes',
  add_shot: 'filmmaker.opAddShot',
  remove_shot: 'filmmaker.opRemoveShot',
  reorder_shot: 'filmmaker.opReorderShot',
  duplicate_shot: 'filmmaker.opDuplicateShot',
  split_shot: 'filmmaker.opSplitShot',
  merge_shots: 'filmmaker.opMergeShots',
  extend_duration: 'filmmaker.opExtendDuration',
  shorten_duration: 'filmmaker.opShortenDuration',
  change_target_duration: 'filmmaker.opChangeTargetDuration',
  change_camera: 'filmmaker.opChangeCamera',
  change_movement: 'filmmaker.opChangeMovement',
  change_lighting: 'filmmaker.opChangeLighting',
  change_style: 'filmmaker.opChangeStyle',
  change_weather: 'filmmaker.opChangeWeather',
  change_time_of_day: 'filmmaker.opChangeTimeOfDay',
  change_location: 'filmmaker.opChangeLocation',
  change_subject: 'filmmaker.opChangeSubject',
  edit_text: 'filmmaker.opEditText',
  replace_character: 'filmmaker.opReplaceCharacter',
  set_character_state: 'filmmaker.opSetCharacterState',
  replace_reference: 'filmmaker.opReplaceReference',
  add_dialogue: 'filmmaker.opAddDialogue',
  change_dialogue: 'filmmaker.opChangeDialogue',
  remove_dialogue: 'filmmaker.opRemoveDialogue',
  modify_audio: 'filmmaker.opModifyAudioUpsert',
  change_format: 'filmmaker.opChangeFormat',
  change_export: 'filmmaker.opChangeExport',
  add_character: 'filmmaker.opAddCharacter',
  update_character: 'filmmaker.opUpdateCharacter',
  remove_character: 'filmmaker.opRemoveCharacter',
  add_location: 'filmmaker.opAddLocation',
  update_location: 'filmmaker.opUpdateLocation',
  remove_location: 'filmmaker.opRemoveLocation',
  add_object: 'filmmaker.opAddObject',
  update_object: 'filmmaker.opUpdateObject',
  remove_object: 'filmmaker.opRemoveObject',
  add_reference: 'filmmaker.opAddReference',
  update_reference: 'filmmaker.opUpdateReference',
  remove_reference: 'filmmaker.opRemoveReference',
  rename_production: 'filmmaker.opRenameProduction',
  change_intent: 'filmmaker.opChangeIntent',
  change_direction: 'filmmaker.opChangeDirection',
  change_mood: 'filmmaker.opChangeMood',
  change_transition: 'filmmaker.opChangeTransition',
  change_continuity: 'filmmaker.opChangeContinuity',
  change_generation: 'filmmaker.opChangeGeneration',
  update_scene: 'filmmaker.opUpdateScene',
  update_shot: 'filmmaker.opUpdateShot',
  move_shot: 'filmmaker.opMoveShot',
  change_edit_plan: 'filmmaker.opChangeEditPlan',
});
/** El sonido, según su acción: `upsert` es la de la tabla; quitar y cambiar el narrador tienen la suya. */
export const CLAVE_DE_SONIDO_QUITADO = 'filmmaker.opModifyAudioRemove';
export const CLAVE_DEL_NARRADOR = 'filmmaker.opModifyAudioNarrator';
/** Sin duración objetivo: se quita, y se dice así. */
export const CLAVE_SIN_DURACION_OBJETIVO = 'filmmaker.opClearTargetDuration';

/**
 * LAS SEIS TRANSICIONES DEL LENGUAJE CREATIVO, con la clave de su nombre (Fase 22 del motor). Los valores son los del
 * Core (`transition.type`) y viajan al servidor tal cual; solo se traduce su nombre.
 */
export const CLAVE_DE_TRANSICION: Readonly<Record<TransitionType, string>> = Object.freeze({
  cut: 'filmmaker.transitionCut',
  dissolve: 'filmmaker.transitionDissolve',
  fade: 'filmmaker.transitionFade',
  match_cut: 'filmmaker.transitionMatchCut',
  whip: 'filmmaker.transitionWhip',
  seamless: 'filmmaker.transitionSeamless',
});

/* ── Fase 24 del motor · la historia, la continuidad y las tomas: las claves de lo que se lee ─── */

/** Para qué sirve cada escena en el relato (`narrativePurpose` de F1-A). */
export const CLAVE_DEL_PROPOSITO: Readonly<Record<NarrativePurpose, string>> = Object.freeze({
  hook: 'filmmaker.purposeHook',
  setup: 'filmmaker.purposeSetup',
  development: 'filmmaker.purposeDevelopment',
  turning_point: 'filmmaker.purposeTurningPoint',
  climax: 'filmmaker.purposeClimax',
  resolution: 'filmmaker.purposeResolution',
  reveal: 'filmmaker.purposeReveal',
  transition: 'filmmaker.purposeTransition',
  call_to_action: 'filmmaker.purposeCallToAction',
});

/** Cómo se dice una línea —a cámara, en off o narrada—, con la clave de su nombre. Los valores son los de F1-A. */
export const TIPOS_DE_LINEA: readonly { kind: DialogueLine['kind']; clave: string }[] = Object.freeze([
  { kind: 'dialogue', clave: 'filmmaker.audioDialogue' },
  { kind: 'voiceover', clave: 'filmmaker.wsLineVoiceover' },
  { kind: 'narration', clave: 'filmmaker.audioNarrator' },
]);

/**
 * LO QUE SE PUEDE PEDIR QUE SIGA IGUAL, en palabras de todos los días: diez aspectos del Core de los ochenta y tantos
 * que tiene, elegidos porque se entienden sin aprender nada. Los valores son los del Core y viajan tal cual; los que
 * no están aquí se respetan si una regla ya los trae (se dice que hay más), pero no se ofrecen.
 */
export const ASPECTOS_DE_CONTINUIDAD_VISIBLES: readonly { aspecto: ContinuityAspect; clave: string }[] = Object.freeze([
  { aspecto: 'identity.face', clave: 'filmmaker.contFace' },
  { aspecto: 'appearance.hairstyle', clave: 'filmmaker.contHair' },
  { aspecto: 'outfit.complete', clave: 'filmmaker.contOutfit' },
  { aspecto: 'pose.position', clave: 'filmmaker.contPosition' },
  { aspecto: 'object.state', clave: 'filmmaker.contObjects' },
  { aspecto: 'environment.location', clave: 'filmmaker.contPlace' },
  { aspecto: 'lighting.type', clave: 'filmmaker.contLight' },
  { aspecto: 'lighting.timeOfDay', clave: 'filmmaker.contTimeOfDay' },
  { aspecto: 'style.visual', clave: 'filmmaker.contStyle' },
  { aspecto: 'temporal.previousShot', clave: 'filmmaker.contPreviousShot' },
]);

/** Las tres fuerzas del Core, de la más suelta a la más estricta. */
export const FUERZAS_VISIBLES: readonly { fuerza: ContinuityStrength; clave: string }[] = Object.freeze([
  { fuerza: 'relaxed', clave: 'filmmaker.contRelaxed' },
  { fuerza: 'standard', clave: 'filmmaker.contStandard' },
  { fuerza: 'strict', clave: 'filmmaker.contStrict' },
]);

/** En qué está una toma, en palabras (`shot.takes`). */
export const CLAVE_DEL_ESTADO_DE_TOMA: Readonly<Record<EstadoDeTomaVista, string>> = Object.freeze({
  queued: 'filmmaker.wsTakeStateQueued',
  preparing: 'filmmaker.wsTakeStatePreparing',
  accepted: 'filmmaker.wsTakeStateAccepted',
  processing: 'filmmaker.wsTakeStateProcessing',
  completed: 'filmmaker.wsTakeStateCompleted',
  failed: 'filmmaker.wsTakeStateFailed',
  refunded: 'filmmaker.wsTakeStateRefunded',
  reconciling: 'filmmaker.wsTakeStateReconciling',
});

/** Dónde está una toma respecto a su plano. Sin nada que decir (`none`), no se dice nada. */
export const CLAVE_DEL_ENLACE_DE_TOMA: Readonly<Record<EnlaceDeTomaVista, string | null>> = Object.freeze({
  linked: 'filmmaker.wsTakeLinkLinked',
  pending: 'filmmaker.wsTakeLinkPending',
  superseded: 'filmmaker.wsTakeLinkSuperseded',
  stale: 'filmmaker.wsTakeLinkStale',
  none: null,
});
