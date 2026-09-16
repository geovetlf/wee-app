import React, { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  ScrollView,
  ScrollViewProps,
  TextInputContentSizeChangeEventData,
  View,
} from 'react-native';
import { SPACING } from '../../constants/design';

/**
 * EN WEË AI, LA CAJA DONDE SE ESCRIBE CRECE SOLA Y NUNCA PIERDE SUS BOTONES.
 *
 * Vale para todas las secciones de Weë AI, las que ya están y las que vengan:
 * la caja de idea de cada especialista, Weë Studio, Weë Design, Weë Travel, las
 * preguntas guiadas, "qué cambiamos" en un resultado y el chat de Weë Brain.
 *
 * ── Lo que tiene que pasar, sea cual sea la sección ──────────────────────────
 *
 *   · La caja crece con el texto, línea a línea, sin pedir nada: no hay "abrir
 *     editor" ni otra pantalla a la que ir para terminar de escribir.
 *   · Crece hasta llenar lo que se ve de la página. Ahí se para y el texto sigue
 *     desplazándose DENTRO de ella, porque sus botones —enviar, crear, adjuntar,
 *     ajustes…— tienen que seguir a la vista por largo que sea el prompt.
 *   · Mientras se escribe, la página baja lo justo para que el borde de abajo de
 *     la caja, con esos botones, quede dentro de la vista. Si ya se ve, no se
 *     mueve nada. En el teléfono "lo que se ve" ya descuenta el teclado, porque
 *     la página vive dentro de `EspacioDeEscritura`.
 *
 * ── Las dos piezas ───────────────────────────────────────────────────────────
 *
 *   `PaginaDeCajas`   El ScrollView de la página. Mide cuánto se ve y sabe bajar
 *                     hasta una caja. `CreatorShell` ya lo usa, así que toda
 *                     sección montada sobre él lo tiene sin hacer nada.
 *   `useCajaQueCrece` Para cada caja: el alto de su texto, cuándo se desplaza por
 *                     dentro y a qué vista pedirle que no se salga.
 *
 * La caja que se pasa a `refCaja` es la parte que no puede perderse: el texto
 * CON sus botones. Lo que la caja lleva además del texto —su aire, sus botones,
 * una fila de precio— se mide solo; nadie tiene que sumarlo a mano.
 */

/**
 * Aire entre la caja y los bordes de lo que se ve. Además de dejarla respirar,
 * deja sitio para arrastrar la página cuando la caja está llena: dentro de ella
 * el dedo desplaza el texto, no la pantalla.
 */
const AIRE = SPACING.xl;

interface ContextoDeCajas {
  /** Cuánto puede ocupar una caja entera, botones incluidos. Sin página, sin tope. */
  altoDisponible?: number;
  mantenerALaVista: (caja: View | null) => void;
}

const Contexto = createContext<ContextoDeCajas>({ mantenerALaVista: () => {} });

/** El ScrollView de una página de Weë AI. Se usa igual que un ScrollView. */
export const PaginaDeCajas = forwardRef<ScrollView, ScrollViewProps>(
  ({ onLayout, onScroll, scrollEventThrottle, children, ...resto }, refDeFuera) => {
    const refScroll = useRef<ScrollView | null>(null);
    /* La posición vive en una referencia: apuntarla no repinta la página. */
    const desplazado = useRef(0);
    const [altoVista, setAltoVista] = useState(0);
    /* Y también en una referencia, para que las medidas no lean un alto viejo. */
    const alto = useRef(0);
    /* La medida que está esperando su fotograma, para no encadenar varias. */
    const pendiente = useRef<number | null>(null);

    const unirRef = useCallback(
      (nodo: ScrollView | null) => {
        refScroll.current = nodo;
        if (typeof refDeFuera === 'function') refDeFuera(nodo);
        else if (refDeFuera) refDeFuera.current = nodo;
      },
      [refDeFuera]
    );

    /*
     * Dónde está la caja y dónde acaba lo que se ve, medidos los dos igual.
     *
     * Se mide el ScrollView y se mide la caja con la misma regla —`measureInWindow`—
     * y solo se usa la DIFERENCIA entre ambas, así que da igual desde dónde
     * cuente el sistema: lo que importa es cuánto sobresale la caja por debajo.
     * Medir el ScrollView es medir su vista, no el componente: la referencia
     * trae `scrollTo` y compañía, pero no siempre sabe medirse, y para eso está
     * `getNativeScrollRef`.
     */
    const mantenerALaVista = useCallback((caja: View | null) => {
      /*
       * Un fotograma de espera, y solo uno pendiente.
       *
       * Al escribir, Android mueve la página por su cuenta para enseñar el
       * cursor —y lo deja justo en el borde de abajo, con los botones fuera—.
       * Ese movimiento llega después del cambio de tamaño, así que medir en el
       * mismo instante sería medir lo de antes y quedar por debajo de lo que
       * haga el sistema. Esperando un fotograma se mide lo que de verdad hay y
       * el ajuste va el último.
       */
      if (pendiente.current !== null) cancelAnimationFrame(pendiente.current);
      pendiente.current = requestAnimationFrame(() => {
        pendiente.current = null;
        const componente = refScroll.current as unknown as
          | (View & { getNativeScrollRef?: () => View })
          | null;
        const scroll = componente?.getNativeScrollRef?.() ?? componente;
        if (!scroll?.measureInWindow || !caja?.measureInWindow) return;
        scroll.measureInWindow((_x, yVista, _ancho, seVe) => {
          caja.measureInWindow((_xCaja, yCaja, _anchoCaja, altoCaja) => {
            const visible = seVe || alto.current;
            if (!visible || !altoCaja) return;
            /* La caja nunca pasa de lo que se ve menos el aire: se cuenta con eso aunque aún no se haya encogido. */
            const fondo = yCaja + Math.min(altoCaja, visible - 2 * AIRE) + AIRE;
            const sobra = fondo - (yVista + visible);
            if (sobra > 1) refScroll.current?.scrollTo({ y: desplazado.current + sobra, animated: false });
          });
        });
      });
    }, []);

    const valor = useMemo(
      () => ({ altoDisponible: altoVista > 0 ? altoVista - 2 * AIRE : undefined, mantenerALaVista }),
      [altoVista, mantenerALaVista]
    );

    return (
      <Contexto.Provider value={valor}>
        <ScrollView
          ref={unirRef}
          {...resto}
          onLayout={(e) => {
            const medido = e.nativeEvent.layout.height;
            alto.current = medido;
            setAltoVista((antes) => (Math.abs(antes - medido) > 1 ? medido : antes));
            onLayout?.(e);
          }}
          onScroll={(e) => {
            desplazado.current = e.nativeEvent.contentOffset.y;
            onScroll?.(e);
          }}
          scrollEventThrottle={scrollEventThrottle ?? 16}
        >
          {children}
        </ScrollView>
      </Contexto.Provider>
    );
  }
);

PaginaDeCajas.displayName = 'PaginaDeCajas';

/**
 * Lo que necesita una caja para crecer con lo escrito.
 *
 *   const caja = useCajaQueCrece({ altoMinimo: scale(40) });
 *   <View ref={caja.refCaja} onLayout={caja.alMedirCaja}>        ← texto + botones
 *     <TextInput {...caja.propsDelCampo} style={[..., { height: caja.altoDelTexto }]} />
 *     <Botón enviar />
 *   </View>
 */
export const useCajaQueCrece = ({ altoMinimo }: { altoMinimo: number }) => {
  const { altoDisponible, mantenerALaVista } = useContext(Contexto);
  const refCaja = useRef<View>(null);
  const [altoContenido, setAltoContenido] = useState(altoMinimo);
  const [cromo, setCromo] = useState(0);
  const enfocada = useRef(false);
  const yaMedida = useRef(false);

  /* Hasta dónde llega el texto para que la caja, con todo lo suyo, quepa en lo que se ve. */
  const tope = altoDisponible === undefined ? Infinity : Math.max(altoDisponible - cromo, altoMinimo);
  const altoDelTexto = Math.min(Math.max(altoContenido, altoMinimo), tope);
  /* Llena: el texto ya mide más que el tope y se desplaza dentro de la caja. */
  const llena = altoContenido > tope + 1;
  const altoPintado = useRef(altoDelTexto);
  altoPintado.current = altoDelTexto;

  /* Si lo que se ve cambia —el teclado se abre— mientras se escribe, los botones siguen a la vista. */
  useEffect(() => {
    if (enfocada.current) mantenerALaVista(refCaja.current);
  }, [altoDisponible, mantenerALaVista]);

  const alMedirCaja = useCallback(
    (e: LayoutChangeEvent) => {
      /* Todo lo que la caja lleva además del texto. Cambia poco; el epsilon evita repintar por medio punto. */
      const medido = Math.max(0, e.nativeEvent.layout.height - altoPintado.current);
      setCromo((antes) => (Math.abs(antes - medido) > 1 ? medido : antes));
      /* La primera medida solo se apunta: al llegar a la pantalla nadie ha escrito nada. */
      if (!yaMedida.current) {
        yaMedida.current = true;
        return;
      }
      if (enfocada.current) mantenerALaVista(refCaja.current);
    },
    [mantenerALaVista]
  );

  /*
   * OJO CON LA PESCADILLA QUE SE MUERDE LA COLA.
   *
   * El alto del campo lo manda este estado, y `onContentSizeChange` devuelve lo
   * que mide el CONTENIDO —texto y relleno del campo—, no el campo. Se guarda
   * eso y nada más: sumarle algo aquí haría que cada vuelta creciera otro poco
   * sola, con la caja vacía.
   */
  const alCambiarElContenido = useCallback((e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    const medido = e.nativeEvent.contentSize.height;
    setAltoContenido((antes) => (Math.abs(medido - antes) > 1 ? medido : antes));
  }, []);

  const alEnfocar = useCallback(() => {
    enfocada.current = true;
  }, []);
  const alSoltar = useCallback(() => {
    enfocada.current = false;
  }, []);

  return {
    refCaja,
    alMedirCaja,
    /** El alto que hay que darle al campo. */
    altoDelTexto,
    /** Si el texto ya no cabe y se desplaza dentro de la caja. */
    llena,
    propsDelCampo: {
      multiline: true,
      textAlignVertical: 'top' as const,
      /* Mientras cabe, no se desplaza por dentro: crece. */
      scrollEnabled: llena,
      onContentSizeChange: alCambiarElContenido,
      onFocus: alEnfocar,
      onBlur: alSoltar,
    },
  };
};
