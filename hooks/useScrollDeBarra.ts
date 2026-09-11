import { useCallback, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useScroll } from '../contexts/ScrollContext';

/**
 * CONTARLE A LA BARRA HACIA DÓNDE VA EL DEDO.
 *
 * `ScrollContext` ya declaraba `isScrollingDown` desde antes de esta fase… pero
 * no lo escribía nadie: era andamio sin usar. Este hook lo llena, que es
 * reutilizar lo que había en vez de inventar un contexto paralelo.
 *
 * Lo que NO llena es `scrollY`, y eso es deliberado: abajo está el motivo.
 *
 * ─── Por qué hace falta un umbral ────────────────────────────────────────────
 *
 * Un dedo nunca se mueve limpio: al soltar, al rebotar contra el final de la
 * lista o al reajustar la postura llegan decenas de eventos de dos y tres
 * píxeles, la mitad en cada sentido. Reaccionar a cada uno pondría la barra a
 * entrar y salir sin parar, que es la diferencia entre una aplicación cuidada y
 * una nerviosa.
 *
 * Así que no manda el último evento, manda el CAMINO RECORRIDO: se suma el
 * movimiento mientras va en la misma dirección y solo se cambia de opinión
 * cuando pasa del umbral. Cambiar de sentido reinicia la cuenta, de modo que un
 * temblor de ida y vuelta se anula solo.
 */

/*
 * ─── Esconderla cuesta; recuperarla, no ──────────────────────────────────────
 *
 * Los dos gestos no valen lo mismo, así que no pueden costar lo mismo.
 *
 * Apartar la navegación es una concesión: se hace porque la persona está leyendo
 * y quiere sitio. Conviene pedir intención —doce píxeles seguidos— para no
 * quitarla por un roce.
 *
 * Recuperarla es una PETICIÓN: subir es el gesto con el que se pide volver a
 * tener los mandos. Ahí esperar es exactamente lo que hace que una aplicación se
 * sienta lenta. Con el umbral simétrico de antes hacían falta doce píxeles hacia
 * arriba y, como un golpe de rueda ronda los diez, casi siempre eran DOS eventos:
 * subías, no pasaba nada, y la barra parecía pegada. Tres píxeles bastan para
 * filtrar el rebote y caben en el primer movimiento de verdad.
 */
const UMBRAL_OCULTAR = 12;
const UMBRAL_MOSTRAR = 3;

/**
 * Arriba del todo la barra SIEMPRE se ve.
 *
 * Es donde empieza cualquier pantalla, y llegar a un sitio nuevo sin navegación
 * a la vista se siente como una pantalla rota. Además evita el caso raro de
 * rebotar por encima del cero y que el rebote cuente como "hacia abajo".
 */
const ZONA_ALTA = 24;

/*
 * ─── Por qué aquí NO se publica la posición del scroll ───────────────────────
 *
 * Esta es la corrección que arregló los dos segundos de retraso en el teléfono.
 *
 * `ScrollContext` tiene un `scrollY`, y este hook lo escribía en CADA evento de
 * desplazamiento —unos sesenta por segundo—. El proveedor construye su valor
 * como un objeto nuevo en cada render, así que cada escritura obligaba a
 * repintarse a sus SEIS consumidores… entre ellos `LandingScreen`, que es el
 * muro entero con sus vídeos. Sesenta re-renders por segundo del muro dejaban el
 * hilo de JavaScript sin aire, y el único cambio que importaba —"ahora va hacia
 * abajo"— se quedaba haciendo cola detrás de todos ellos. De ahí los ~2 s: no
 * eran la animación ni el umbral, era la cola.
 *
 * Y lo peor: `scrollY` NO LO LEE NADIE. Se comprobó en todo el proyecto. Era
 * coste puro a cambio de nada.
 *
 * Ahora la posición vive en una referencia —que no repinta— y al contexto solo
 * se le habla cuando el sentido CAMBIA de verdad: dos veces por gesto en vez de
 * sesenta por segundo.
 */
export const useScrollDeBarra = () => {
  const { setIsScrollingDown } = useScroll();
  const ultimaY = useRef(0);
  const recorrido = useRef(0);
  const bajando = useRef(false);

  const alDesplazar = useCallback(
    (evento: NativeSyntheticEvent<NativeScrollEvent> | { currentTarget?: { scrollTop?: number } }) => {
      /*
       * Sirve para las dos formas de desplazarse que hay en Weë: el `ScrollView`
       * de React Native, que trae `contentOffset`, y el contenedor del navegador
       * en la portada web, que trae `scrollTop`. Es el mismo gesto contado en dos
       * idiomas; el resto del hook no tiene por qué enterarse.
       */
      const rn = (evento as NativeSyntheticEvent<NativeScrollEvent>)?.nativeEvent?.contentOffset?.y;
      const dom = (evento as { currentTarget?: { scrollTop?: number } })?.currentTarget?.scrollTop;
      const y = rn ?? dom ?? 0;
      const dy = y - ultimaY.current;
      ultimaY.current = y;

      /* Arriba del todo, siempre visible, y la cuenta a cero. */
      if (y <= ZONA_ALTA) {
        recorrido.current = 0;
        if (bajando.current) {
          bajando.current = false;
          setIsScrollingDown(false);
        }
        return;
      }

      /* Cambiar de sentido reinicia el camino: un temblor no suma. */
      if (dy > 0 !== recorrido.current > 0) recorrido.current = 0;
      recorrido.current += dy;

      if (recorrido.current > UMBRAL_OCULTAR && !bajando.current) {
        bajando.current = true;
        setIsScrollingDown(true);
        recorrido.current = 0;
      } else if (recorrido.current < -UMBRAL_MOSTRAR && bajando.current) {
        bajando.current = false;
        setIsScrollingDown(false);
        recorrido.current = 0;
      }
    },
    [setIsScrollingDown]
  );

  /*
   * `scrollEventThrottle` va incluido: sin él, iOS manda el evento una vez cada
   * tanto y el movimiento de la barra sale a trompicones. 16 es un fotograma.
   */
  return { onScroll: alDesplazar, scrollEventThrottle: 16 };
};
