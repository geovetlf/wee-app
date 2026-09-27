/**
 * WEË FILMMAKER · EL DOMINIO, COMO LO VE LA APP (F1-C).
 *
 * La única puerta de la app al espejo generado de F1-A (`./espejo/`, que sale de
 * `scripts/espejo-filmmaker.mjs`). Aquí no hay ni una regla: solo se reexporta.
 * Validar, aplicar una operación, calcular lo pendiente, recomendar, la línea de
 * tiempo y las tarjetas del storyboard son el MISMO código que usa el servidor,
 * impreso otra vez porque `metro.config.js` deja `functions/` fuera del bundle.
 *
 * Quien pinta importa de aquí y de ningún otro sitio: ni de `./espejo/` ni de
 * `functions/src`. Lo vigila `functions/test/filmmaker-espejo.test.mjs`.
 */
export * from './espejo/filmmaker/modelo';
export * from './espejo/filmmaker/validacion';
export * from './espejo/filmmaker/operaciones';
export * from './espejo/filmmaker/recomendaciones';
export * from './espejo/filmmaker/requisitos';

/* Del vocabulario creativo del Core, lo que una producción nombra en sus planos. */
export type {
  AspectRatio, CameraType, CompositionType, CreativeParameterPath, CreativeParameters, LensType, LightingType,
  MotionSmoothness, MotionSpeed, MovementType, PerspectiveType, ShotType, TransitionType,
} from './espejo/core/creative';
export { PROPORCIONES, valorCreativo } from './espejo/core/creative';
