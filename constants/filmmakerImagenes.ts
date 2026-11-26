/**
 * IMÁGENES DEL UNIVERSO Y DEL STORYBOARD (Filmmaker) — el interruptor de la UI.
 *
 * El servidor (`generarImagenesFilmmaker`, functions/src/creator/imagenes, ruta legacy por el engine) y el cliente
 * (services/filmmakerImagenesService.ts, hooks/useImagenesDeFilmmaker.ts) están completos. Esta constante sigue en `false` hasta que el dueño:
 *   1. despliegue `generarImagenesFilmmaker` (por el workflow de despliegue),
 *   2. decida precio, límites y política de contenido, y abra `aiSettings/filmmakerImagenes` con `{ abierto: true }`.
 * Con `true`, quien pinte el Universo y el Storyboard deja de mostrar las filas «crear imágenes» cerradas. Mientras
 * `aiSettings/filmmakerImagenes` esté cerrado el servidor contesta «no disponible» aunque la UI estuviera abierta, así que
 * abrir la constante antes no cobra ni genera nada. Mismo patrón que `LECTURA_DE_DOCUMENTOS_ABIERTA`.
 */
export const IMAGENES_DE_FILMMAKER_ABIERTAS = false;
