/**
 * LA CAPACIDAD PRINCIPAL DE CADA EXPERIENCIA DE WEË AI (R9 · E2, trazabilidad).
 *
 * La ficha de una experiencia en la portada de Weë AI decía SIEMPRE «Hoy en modo demo: ves cómo funciona sin gastar
 * Credits» y ofrecía «Avísame cuando esté de verdad», también en las diez secciones que ya crean con IA real y cobran
 * Credits. Era un texto simulado presentado como verdad.
 *
 * Ahora la ficha pregunta al servidor si hay una ruta real para esta cuenta (`disponibilidadDeCapacidades`, DEC-06: solo
 * lee y decide, no cobra ni genera) y se pregunta por la capacidad que define a la experiencia: sin ella, la experiencia
 * no puede dar su resultado. Es una APROXIMACIÓN honesta: un plan concreto puede encadenar otras capacidades, y si alguna
 * falla al crear lo dice `CreatorFlow` con su motivo (`claveDeNoDisponible`) y se devuelven los Credits.
 *
 * Son identificadores del vocabulario del Core (`functions/src/core/capability.ts`): no se traducen, viajan al servidor.
 * `traza-weeai-portada.test.mjs` comprueba que cada una existe en ese vocabulario y en la plantilla del servidor.
 */
export const CAPACIDAD_PRINCIPAL: Readonly<Record<string, string>> = Object.freeze({
  design: 'image.generate',
  studio: 'video.generate',
  photo: 'image.edit',
  writer: 'text.generate',
  music: 'music.generate',
  beauty: 'image.identity_edit',
  chef: 'text.generate',
  home: 'image.space_restyle',
  business: 'text.generate',
  travel: 'text.search',
  brain: 'text.generate',
});

/** La capacidad por la que se pregunta para una experiencia, o `null` si la experiencia no la declara (entonces no se afirma nada). */
export const capacidadPrincipalDe = (experienceId: string | null | undefined): string | null =>
  experienceId && Object.prototype.hasOwnProperty.call(CAPACIDAD_PRINCIPAL, experienceId) ? CAPACIDAD_PRINCIPAL[experienceId] : null;
