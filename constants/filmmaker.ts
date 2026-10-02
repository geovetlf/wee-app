import type { FormatPresetId, SubjectFocus, TimeOfDay, Weather } from '../services/filmmaker/dominio';

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

/** Las familias de la biblioteca de cámara que el panel Director ofrece para un plano o una escena. */
export const FAMILIAS_DEL_DIRECTOR: readonly string[] = Object.freeze(['shot', 'camera', 'movement', 'lighting']);

/** Lo que alarga o acorta un toque. Una decisión de pantalla, no del dominio: F1-A acepta cualquier paso. */
export const PASO_DE_DURACION_SEC = 0.5;
/** Con cuánto nace un plano nuevo, para que tenga duración desde el principio y se pueda alargar o acortar. */
export const DURACION_DE_UN_PLANO_NUEVO_SEC = 3;
/** Lo que cambia un toque en la duración objetivo. */
export const PASO_DEL_OBJETIVO_SEC = 5;
