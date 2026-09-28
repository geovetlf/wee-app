/**
 * FILMMAKER ENGINE — LO QUE SUS FASES TOCAN, POR NOMBRE.
 *
 * Encargo del usuario del 2026-09-28, «CONTINUAR Y COMPLETAR FILMMAKER ENGINE»:
 * seguir el roadmap de `docs/FILMMAKER.md` (F2–F6) hasta dejar el motor
 * terminado, sin romper los contratos cerrados del vídeo, del material y del
 * dinero.
 *
 * Las vallas de las fases anteriores —la ruta asíncrona del vídeo, el puente
 * PRE-F1-D y F1-D— fijan «F1-A, productions y el Core, sin tocar» desde su
 * base. Siguen valiendo para lo suyo; esta lista es lo ÚNICO que dejan pasar,
 * archivo a archivo, y cada fase del motor añade aquí lo que toca con su porqué.
 * Nada del dinero puede entrar en ella: `filmmaker-lenguaje.test.mjs` lo vigila.
 */
export const TOCADOS_POR_EL_MOTOR = Object.freeze([
  /* Fase 1 · el lenguaje completo: 23 operaciones nuevas; modelo, validación, requisitos y recomendaciones, intactos. */
  'functions/src/filmmaker/operaciones.ts',
]);

/** Lo que una valla anterior ve cambiado, sin lo que el motor tiene dicho que toca. */
export const fueraDelMotor = (archivos) => archivos.filter((f) => !TOCADOS_POR_EL_MOTOR.includes(f));

/** Lo que el motor no puede tocar nunca por esta lista: el dinero. */
export const DINERO = Object.freeze([/^functions\/src\/credits\//, /^functions\/src\/core\/financial\//, /^functions\/src\/core\/router\.ts$/]);
