/*
 * LA PROPORCIÓN DE UN VÍDEO, RECORDADA.
 *
 * Va aparte de `imageDimensionCache` a propósito, y no es duplicar por duplicar:
 * la proporción de una foto se puede PREGUNTAR antes de pintarla
 * (`Image.getSize`), y la de un vídeo no. La única fuente fiable es el propio
 * reproductor, que la cuenta cuando ya tiene el primer fotograma
 * (`onReadyForDisplay` → `naturalSize`). Así que aquí no hay un `fetch`: hay un
 * sitio donde dejar apuntado lo que el reproductor dijo, para que la segunda
 * vez que aparezca ese vídeo —al volver al muro, al recargar la lista— nazca ya
 * con su forma en vez de encogerse a la vista.
 *
 * Mezclar las dos cachés habría atado el comportamiento de las fotos al de los
 * vídeos, que es justamente lo que no se quiere.
 */

const cache = new Map<string, number>();

/** La proporción (ancho/alto) que ya se sabe de este vídeo, o undefined. */
export function getCachedVideoAspectRatio(url: string): number | undefined {
  return cache.get(url);
}

/** Apunta la proporción que acaba de contar el reproductor. Ignora medidas absurdas. */
export function setCachedVideoAspectRatio(url: string, aspectRatio: number): void {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return;
  cache.set(url, aspectRatio);
}

/*
 * PREGUNTARLE LA FORMA AL NAVEGADOR.
 *
 * En el teléfono la cuenta el reproductor (`onReadyForDisplay`). En la web ese
 * aviso no llega, así que aquí se hace lo mismo que `Image.getSize` hace con
 * una foto: se pide SOLO la cabecera del vídeo —`preload: 'metadata'`, no el
 * vídeo entero— a un elemento suelto que nunca se pinta, y se apunta lo que
 * diga. Fuera del navegador no hay `document` y esto no hace nada: allí ya
 * llega por el reproductor.
 *
 * Si falla, no se apunta nada y quien preguntó se queda con su forma de espera.
 * Como el vídeo se pinta sin recortar, esa espera no le quita nada a nadie.
 */
export function fetchAndCacheVideoAspectRatio(url: string, onResult: (aspectRatio: number) => void): void {
  const cached = cache.get(url);
  if (cached !== undefined) {
    onResult(cached);
    return;
  }
  const doc = typeof document === 'undefined' ? null : document;
  if (!doc) return;
  const sonda = doc.createElement('video');
  sonda.preload = 'metadata';
  sonda.muted = true;
  const limpiar = () => {
    sonda.onloadedmetadata = null;
    sonda.onerror = null;
    sonda.removeAttribute('src');
  };
  sonda.onloadedmetadata = () => {
    const proporcion = sonda.videoWidth / sonda.videoHeight;
    limpiar();
    if (!Number.isFinite(proporcion) || proporcion <= 0) return;
    cache.set(url, proporcion);
    onResult(proporcion);
  };
  sonda.onerror = limpiar;
  sonda.src = url;
}

/*
 * La medida que da `onReadyForDisplay`, convertida en proporción.
 *
 * En Android el reproductor puede dar el tamaño ANTES de rotar: un vídeo
 * grabado en vertical llega como 1920×1080 y solo `orientation` delata que es
 * vertical. Sin esto, un vídeo vertical se pintaría apaisado, que es
 * exactamente el recorte que se quiere evitar.
 */
export function proporcionDeLaMedida(
  naturalSize: { width?: number; height?: number; orientation?: string } | undefined,
): number | undefined {
  const ancho = naturalSize?.width;
  const alto = naturalSize?.height;
  if (!ancho || !alto || !Number.isFinite(ancho) || !Number.isFinite(alto)) return undefined;
  const apaisado = ancho >= alto;
  const deberiaSerVertical = naturalSize?.orientation === 'portrait';
  const [w, h] = deberiaSerVertical && apaisado ? [alto, ancho] : [ancho, alto];
  return w / h;
}
