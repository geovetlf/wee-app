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
  /*
   * Fase 2 · el estado y la traza de una toma: un módulo NUEVO de solo lectura, que junta la reserva, el trabajo
   * (por `decidirLiquidacion`, la del barrido), la fila del libro, el material y el plano. Además toca, sin pasar
   * por esta lista porque las vallas de F1-D ya los nombran uno a uno, `creator/toma.ts` (leerUnidadDeToma),
   * `creator/video.ts` (solo `export` en PLAZO_DE_VIDEO_MS) y `shots/puerta.ts` (la operación `shot.takes`).
   * Fase 3 · la producción entera: el mismo módulo (`estadoDeLaProduccion`), `creator/toma.ts` (`unidadesGuardadas`,
   * que ahora usa también `shot.videos` con la misma regla y el mismo resultado) y `shots/puerta.ts` (`shot.production`).
   */
  'functions/src/creator/estadoDeToma.ts',
  /*
   * Fase 4 · la reserva de una toma que se quedó sin trabajo (decisión del usuario, 2026-09-28: SOLO esa; el POST sin
   * respuesta sigue retenido). Un módulo nuevo que decide qué reservas de tomas se devuelven —por el puerto de
   * liquidación del runtime, sin llamar al Credit Engine por su cuenta— y el programador, que solo lo compone. La
   * pasada del runtime gana el paso opcional `reservasSinTrabajo` en `runtime/index.ts`, que no pasa por esta lista
   * porque las vallas de F1-D ya lo nombran.
   */
  'functions/src/creator/recuperacionDeTomas.ts',
  'functions/src/settlement/programado.ts',
  /*
   * Fase 5 · el requisito de cada plano, calculado por el servidor con F1-A (decisión del usuario, 2026-09-28: la
   * valla G12 se amplía por nombre). Un módulo nuevo de solo lectura que lee la producción guardada con el lector de
   * `productions` y calcula sus requisitos; `creator/video.ts`, que ya nombran las vallas de F1-D, lo usa en vez del
   * requisito de la app, que solo se compara.
   */
  'functions/src/creator/requisitoDelServidor.ts',
  /*
   * Fase 6 (F4 del roadmap) · varios planos a la vez. Un módulo nuevo que ORQUESTA: presupuesta y genera las unidades
   * de una producción pidiéndole cada una a la puerta del vídeo —`creator/video.ts` gana el modo `produccion`—, con
   * el requisito del servidor. No cobra, no pone precio y no llama al conductor: eso lo sigue haciendo cada toma.
   */
  'functions/src/creator/lotes.ts',
  /*
   * Fase 7 (F5 del roadmap) · el montaje final, como manifiesto: qué se montaría y con qué, puro y con su huella; y
   * los argumentos de FFmpeg que lo ejecutarían (decisión del usuario: FFmpeg propio). Ninguno ejecuta nada: el
   * render llega cuando se decida dónde corre y cómo se instala el binario. `shots/puerta.ts` gana `shot.montage`.
   */
  'functions/src/creator/composicion.ts',
  'functions/src/creator/ffmpeg.ts',
  /*
   * Fase 8 (F5 del roadmap, segunda parte) · el render, ejecutado (decisiones del usuario, 2026-09-28: FFmpeg propio
   * como tarea general del Job Engine; el resultado, material `asset_` más un registro en la producción; gratis con
   * cinco al día). Tres módulos nuevos —el pedido y su registro, el ejecutor, y el trabajador con sus dos puertas— y
   * `index.ts`, que exporta esas dos puertas. `composicion.ts` gana `huellaDelManifiesto`. Ni Credits, ni el conductor.
   */
  'functions/src/creator/render.ts',
  'functions/src/creator/renderizador.ts',
  'functions/src/creator/renders.ts',
  'functions/src/index.ts',
]);

/** Lo que una valla anterior ve cambiado, sin lo que el motor tiene dicho que toca. */
export const fueraDelMotor = (archivos) => archivos.filter((f) => !TOCADOS_POR_EL_MOTOR.includes(f));

/** Lo que el motor no puede tocar nunca por esta lista: el dinero. */
export const DINERO = Object.freeze([/^functions\/src\/credits\//, /^functions\/src\/core\/financial\//, /^functions\/src\/core\/router\.ts$/]);
