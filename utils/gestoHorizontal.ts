/*
 * UN GESTO DE LADO: LA REGLA Y LA MÁQUINA, APARTE DE QUIEN LAS DISPARA.
 *
 * Quien reconoce el gesto en el teléfono es Gesture Handler, en código nativo,
 * a partir de los eventos crudos de Android. Aquí vive lo que decide QUÉ hacer
 * con lo reconocido: de dónde salió el dedo, cuánto lleva recorrido, y si eso
 * es un deslizamiento o todavía puede ser un toque.
 *
 * Están fuera de la pantalla que las usa por una razón concreta: así se pueden
 * EJECUTAR en una prueba con recorridos de verdad. Varias versiones del gesto
 * de la píldora Real/Weë pasaron todas las pruebas que leían el código y no
 * funcionaron en el aparato; lo que se puede recorrer aquí es lo único que las
 * habría cazado.
 */

export type DireccionDelGesto = 'izquierda' | 'derecha';

export interface RecorridoDelDedo {
  dx: number;
  dy: number;
}

/**
 * ¿Ha sido un gesto horizontal, y hacia dónde?
 *
 * Recibe lo que el dedo lleva recorrido desde donde se posó y pide dos cosas
 * juntas: recorrido suficiente, para que un roce o el temblor de un toque no
 * cuenten, y que ese recorrido sea MÁS ancho que alto, que es lo que separa un
 * gesto de lado de un arrastre torcido. Si no cumple las dos, devuelve `null` y
 * no pasa nada.
 */
export const direccionDelGesto = (
  dx: number,
  dy: number,
  recorridoMinimo: number,
): DireccionDelGesto | null => {
  if (Math.abs(dx) < recorridoMinimo) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? 'izquierda' : 'derecha';
};

/**
 * LA MÁQUINA DE LA PÍLDORA, la que llevan las dos mitades a la vez.
 *
 *  · `alEmpezarElGesto(x, y)`: el dedo se posa. Se apunta DE DÓNDE SALE, en
 *    coordenadas absolutas de pantalla, y se olvida lo anterior.
 *  · `alSeguirElDedo(x, y)`: el dedo se ha movido. Se mide contra ese origen y,
 *    si el recorrido cumple la regla, se declara el deslizamiento UNA vez y se
 *    avisa. Devuelve lo medido, para poder mirarlo desde fuera.
 *  · `alTocar()`: el toque de una mitad. Devuelve si manda: `false` cuando este
 *    mismo gesto ya fue un deslizamiento, y entonces el toque se consume.
 *
 * El origen se guarda AQUÍ y no se toma del `translationX` de Gesture Handler
 * por un motivo medido en el teléfono: al activarse, el reconocedor de Android
 * llama a `resetProgress()` y vuelve a poner ese `translationX` a cero desde el
 * punto de activación. Midiendo contra nuestro propio origen, el umbral es
 * siempre el recorrido REAL del dedo, se mire en el aviso que se mire.
 *
 * El estado es compartido por las dos mitades a propósito: un gesto que empieza
 * sobre Real y acaba sobre Weë sigue siendo el mismo gesto.
 */
export const maquinaDeLaPildora = (
  recorridoMinimo: number,
  alDeslizar: (direccion: DireccionDelGesto) => void,
) => {
  let origen: { x: number; y: number } | null = null;
  let deslizado = false;
  return {
    alEmpezarElGesto(x: number, y: number): void {
      origen = { x, y };
      deslizado = false;
    },
    alSeguirElDedo(x: number, y: number): RecorridoDelDedo | null {
      if (!origen) return null;
      const recorrido = { dx: x - origen.x, dy: y - origen.y };
      if (deslizado) return recorrido;
      const direccion = direccionDelGesto(recorrido.dx, recorrido.dy, recorridoMinimo);
      if (direccion) {
        deslizado = true;
        alDeslizar(direccion);
      }
      return recorrido;
    },
    alTocar(): boolean {
      if (deslizado) {
        deslizado = false;
        return false;
      }
      return true;
    },
  };
};
