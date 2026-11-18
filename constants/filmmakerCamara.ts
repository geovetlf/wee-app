/**
 * LA FICHA DEL CUADRO: BIBLIOTECA DE CÁMARA Y LO QUE SIGUE CERRADO (ola 3, 2026-11-17). Solo datos: claves, identificadores y banderas.
 *
 * NO es un vocabulario nuevo. La galería es la de Weë Studio (`constants/camaraCinematica.ts`), que ya traduce cada comando a una ruta y un valor del
 * lenguaje creativo del Core; aquí solo se elige qué familias se ofrecen en un cuadro. Lo que el contrato no tiene (cámara lenta como efecto de tiempo,
 * zoom de impacto, plano inclinado…) sale CERRADO con su motivo, nunca simulado. Las banderas de abajo se cambian cuando la capacidad exista.
 */
import { FAMILIAS_DE_CAMARA, FamiliaDeCamara, VALORES_CREATIVOS } from './camaraCinematica';

/** Generar las imágenes del storyboard: CERRADO. Es una capacidad que Filmmaker hoy no pide al Core; abrirla exige autorización expresa (regla 10). */
export const GENERAR_IMAGENES_DEL_STORYBOARD = false;
/** Producir una tanda (etapa 4): todavía no existe. */
export const PRODUCCION_ABIERTA = false;
/** D1 (referencias, primer/último fotograma, extender, editar): el contrato está propuesto y sin aplicar. Con `true` las filas llaman a `onAccionD1`. */
export const D1_ABIERTO = false;
/** El almacén de la cuenta: sin contrato de datos que lo persista. Hoy «guardar» fija el storyboard en esta sesión y la pantalla lo dice. */
export const ALMACEN_DE_LA_CUENTA_ABIERTO = false;

/** Las familias de la galería de un cuadro, en el orden en que se enseñan. `ruta` es la del Core; las demás de la biblioteca (ritmo, composición) no se ofrecen aquí. */
const IDS_DE_FAMILIAS = ['movement', 'camera', 'perspective', 'lens', 'lighting'] as const;
export type IdDeFamilia = typeof IDS_DE_FAMILIAS[number];

export const FAMILIAS_DEL_CUADRO: readonly FamiliaDeCamara[] = IDS_DE_FAMILIAS
  .map((id) => FAMILIAS_DE_CAMARA.find((f) => f.id === id))
  .filter((f): f is FamiliaDeCamara => !!f);

/** Encuadres del cuadro (ruta `shot.type`): el rótulo de la rejilla. Los nombres salen de la biblioteca de Studio. */
export const PLANOS_DEL_CUADRO: readonly string[] = VALORES_CREATIVOS['shot.type'];

/**
 * INTENSIDAD = el ritmo del movimiento (`movement.speed`: slow / normal / fast). Es lo único que el contrato dice sobre «cuánto» se mueve la cámara;
 * no hay una escala de 0 a 100 y no se inventa.
 */
export const INTENSIDADES: readonly { valor: string; clave: string }[] = [
  { valor: 'slow', clave: 'filmmakerTandas.intensitySoft' },
  { valor: 'normal', clave: 'filmmakerTandas.intensityMedium' },
  { valor: 'fast', clave: 'filmmakerTandas.intensityStrong' },
];

/** Efectos que se piden con frecuencia y el contrato creativo no tiene todavía: cerrados por CONTRATO PENDIENTE (no «no compatible con el modelo»). */
export const EFECTOS_CERRADOS: readonly { id: string; clave: string; claveMotivo: string; icono: string }[] = [
  { id: 'slowmo', clave: 'filmmakerTandas.fxSlowMo', claveMotivo: 'filmmakerTandas.fxSlowMoClosed', icono: 'hourglass-outline' },
  { id: 'timelapse', clave: 'filmmakerTandas.fxTimelapse', claveMotivo: 'filmmakerTandas.fxClosed', icono: 'speedometer-outline' },
  { id: 'dollyzoom', clave: 'filmmakerTandas.fxDollyZoom', claveMotivo: 'filmmakerTandas.fxClosed', icono: 'contract-outline' },
  { id: 'dutch', clave: 'filmmakerTandas.fxDutch', claveMotivo: 'filmmakerTandas.fxDutchClosed', icono: 'rainy-outline' },
];

/** Lo que D1 abrirá en cada cuadro. Hoy cada fila sale cerrada con su motivo; abrirla es `D1_ABIERTO = true` y conectar `onAccionD1`. */
export type AccionD1 = 'reference' | 'firstFrame' | 'lastFrame' | 'extend' | 'edit';
export const ACCIONES_D1: readonly { id: AccionD1; clave: string; icono: string }[] = [
  { id: 'reference', clave: 'filmmakerTandas.d1Reference', icono: 'image-outline' },
  { id: 'firstFrame', clave: 'filmmakerTandas.d1FirstFrame', icono: 'play-skip-back-outline' },
  { id: 'lastFrame', clave: 'filmmakerTandas.d1LastFrame', icono: 'play-skip-forward-outline' },
  { id: 'extend', clave: 'filmmakerTandas.d1Extend', icono: 'add-circle-outline' },
  { id: 'edit', clave: 'filmmakerTandas.d1Edit', icono: 'create-outline' },
];
