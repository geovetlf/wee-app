/**
 * EL COLOR DE MARCA DE WEË — UNA SOLA FUENTE.
 *
 * Decisión del dueño (2026-11-05): el amarillo plano de antes (#F5B731) evoluciona
 * a un degradado de amarillo dorado a naranja cálido. Todo lo que en la App
 * significa "acción principal", "estás aquí" o "esto es tuyo" sale de aquí:
 *
 *   - `ThemeContext` copia estos valores en `theme.colors.primary/accent/…`, que es
 *     lo que leen las pantallas;
 *   - `components/GradienteDeMarca.tsx` pinta el degradado con `MARCA.degradado`;
 *   - los pocos sitios que viven fuera de React (sombras de un StyleSheet, el
 *     canal de notificaciones de Android) importan `MARCA` directamente.
 *
 * No se definen colores de marca por pantalla. Si una pieza necesita el acento,
 * lo lee del tema o de aquí. Las reglas completas están en docs/COLOR-DE-MARCA.md.
 *
 * Lo que NO es marca y no vive aquí: el verde de "ha ido bien" (`success`), el
 * rojo de error, el aviso (`warning`), el verde eléctrico del Perfil Weë en el
 * cajón, las paletas de categorías, especialistas y temas de chat, y los colores
 * de marcas ajenas (Google…).
 */

/** La paleta de partida del dueño, de amarillo a naranja. */
export const PALETA_DE_MARCA = {
  amarilloDorado: '#FFC928',
  amarilloCalido: '#FFB817',
  ambar: '#FFA51F',
  naranja: '#FF850D',
  naranjaProfundo: '#F47700',
} as const;

export const MARCA = {
  /** El acento sólido: botones que no llevan degradado, rellenos, indicadores pequeños. */
  primario: PALETA_DE_MARCA.ambar,
  /** La punta clara (fondos de chip activos, el inicio del degradado en sólido). */
  primarioClaro: PALETA_DE_MARCA.amarilloDorado,
  /** La punta honda: texto o trazo de acento sobre blanco, donde el ámbar se leería poco. */
  primarioOscuro: PALETA_DE_MARCA.naranjaProfundo,
  /** Acento que se LEE sobre blanco o sobre un velo claro (iconos de una opción elegida, estados): contraste ≥ 4,5:1. */
  primarioTexto: '#9A4A00',
  /** Iconos y etiquetas de la navegación activa (barra inferior, barra lateral). */
  activo: '#FF910F',
  /** El texto que va ENCIMA del acento o del degradado: oscuro, como siempre. */
  sobrePrimario: '#1F2937',
  /** Velos del acento para fondos suaves (chips, tarjetas elegidas). */
  velo: (alfa: number) => `rgba(255, 165, 31, ${alfa})`,
  /**
   * El degradado principal: `linear-gradient(110deg, #FFD12A 0%, #FFB51B 45%, #FF850D 100%)`.
   * 110° en CSS es "hacia la derecha, 20° hacia abajo": en `expo-linear-gradient` eso es
   * de (0, 0.32) a (1, 0.68). Horizontal en la práctica: amarillo a la izquierda, naranja
   * a la derecha.
   */
  degradado: {
    colores: ['#FFD12A', '#FFB51B', '#FF850D'] as const,
    posiciones: [0, 0.45, 1] as const,
    inicio: { x: 0, y: 0.32 },
    fin: { x: 1, y: 0.68 },
  },
} as const;

/**
 * EL ACENTO DE INTERACCIÓN — violeta (decisión del dueño, 2026-11-15: «el color, tal cual las imágenes de referencia»).
 *
 * Los valores están MUESTREADOS de las dos referencias del dueño (referencias/01-home.jpg y 02-burger.jpg), no elegidos a
 * ojo: el violeta sólido sale del subrayado de la pestaña activa (#7D23DA) y del enlace del texto (#771FE7); el lila del
 * fondo de la pastilla «Para ti» (#F5EFFD); el lila fuerte del lado puesto del selector (#DFBDFC).
 *
 * El dorado sigue siendo la marca (logo, botón +, chispas, píldora de Credits): vive arriba, en `MARCA`. El violeta
 * dice «activo», «enlace», «foco». `ThemeContext` copia estos valores en `theme.colors.interaction…`, que es lo que leen
 * los componentes: ninguno escribe un color a mano.
 *
 * Contraste (WCAG): #7A22E0 sobre blanco, 6,3:1; #B79CFF sobre #0A0A0A, 8,9:1. El violeta de la app clara se apaga sobre
 * negro, así que el tema oscuro del Perfil Weë usa su versión clara.
 */
export const ACENTO = {
  claro: {
    /*
     * Naranja de los botones (decisión del dueño, 2026-11-15: los estados activos con el mismo color que el + y la flecha
     * de enviar). Es el tono legible más cercano al degradado #FFC21A → #FF9500. Como texto pequeño sobre blanco da 2,5:1
     * (por debajo de AA 4,5): se usa para indicadores (subrayado, icono y etiqueta activos), no para texto de cuerpo.
     */
    interaccion: '#F08A00',
    /** Crema dorada de fondo: el velo de una fila elegida, la etiqueta de una experiencia. */
    velo: '#FFF4DB',
    /** Amarillo dorado: la pastilla puesta («Para ti») y el lado puesto del selector; el texto encima va oscuro (11:1). */
    veloFuerte: '#FFC21A',
    /** Contorno fino de una tarjeta. */
    borde: '#FFD58A',
    /** Texto encima de un relleno de acento. */
    sobre: '#1F2937',
  },
  oscuro: {
    interaccion: '#FFB547',
    velo: 'rgba(255, 181, 71, 0.14)',
    veloFuerte: 'rgba(255, 181, 71, 0.28)',
    borde: 'rgba(255, 181, 71, 0.34)',
    sobre: '#1A1D24',
  },
} as const;

/**
 * EL ARTE DE WEËAI — colores, degradados, radios y sombras de la tarjeta de WeëAI (Home y menú) y de la de MyWeës.
 *
 * Muestreado de las referencias: el botón de enviar va de dorado (#FEBA03 → #FEA525) a magenta (#CF26C5) y violeta
 * (#B20AD9); el arco de la tarjeta, dorado cálido → rosa (#FEDDED) → violeta; el lavado, lila casi blanco (#FAF5FE); la
 * tarjeta del menú, borde de dorado a violeta y ondas dorada, rosa y violeta; la de MyWeës, lavado dorado (#FFF4E1) a
 * lila (#F3EFFD). La variante oscura no es la clara invertida: fondo profundo, el mismo arco con más luz.
 *
 * Los degradados son listas de colores para `expo-linear-gradient` (components/GradienteDeMarca.tsx) y colores sueltos
 * para el arte vectorial (components/inicio/arteDeWeeAi.ts). Solo ASCII en los colores: el arte viaja en base64.
 */
export const ARTE_WEEAI = {
  /*
   * Gama de la referencia del dueño (2026-11-15): banner carbón casi negro con un resplandor dorado → naranja a la derecha,
   * título blanco con «AI» dorado, chip blanco, caja blanca y botón de enviar en degradado dorado → naranja.
   */
  claro: {
    superficie: '#1A1D24',
    lavadoArriba: '#262A33',
    lavadoAbajo: '#15171C',
    arcoDorado: '#FFC21A',
    arcoRosa: '#FF9500',
    arcoVioleta: '#FF7A00',
    luzDelArco: 2.2,
    titulo: '#FFFFFF',
    /** El «AI» de «WeëAI», en dorado. */
    acentoDelTitulo: '#FFC21A',
    lema: '#C7CBD3',
    chip: '#FFFFFF',
    textoDelChip: '#1F2937',
    iconoDelChip: '#F08A00',
    chispa: '#FFC21A',
    /** La caja de la puerta: blanca sobre el carbón, con su texto y sus iconos en gris. */
    puerta: '#FFFFFF',
    textoDeLaPuerta: '#6B7280',
    iconosDeLaPuerta: '#1F2937',
    bordeDegradado: ['#FFD84D', '#FFB000', '#FF9500'],
    accion: ['#FFC21A', '#FFAA00', '#FF9500', '#FF8A00'],
    sobreAccion: '#FFFFFF',
    lavadoMyWees: ['#FFF8E6', '#FFF3D6', '#FFEDC7'],
    bordeMyWees: ['#FFD98A', '#FFC870'],
    sombra: '#1A1D24',
  },
  oscuro: {
    superficie: '#1C1F27',
    lavadoArriba: '#262A33',
    lavadoAbajo: '#121419',
    arcoDorado: '#FFC21A',
    arcoRosa: '#FF9500',
    arcoVioleta: '#FF7A00',
    luzDelArco: 2.2,
    titulo: '#FFFFFF',
    acentoDelTitulo: '#FFC21A',
    lema: '#B6BBC6',
    chip: '#2A2E38',
    textoDelChip: '#FFFFFF',
    iconoDelChip: '#FFB547',
    chispa: '#FFC21A',
    puerta: '#262A33',
    textoDeLaPuerta: '#A3A9B6',
    iconosDeLaPuerta: '#E5E7EB',
    bordeDegradado: ['#FFD84D', '#FFB000', '#FF9500'],
    accion: ['#FFC21A', '#FFAA00', '#FF9500', '#FF8A00'],
    sobreAccion: '#FFFFFF',
    lavadoMyWees: ['#2A2318', '#231F18', '#1F1B16'],
    bordeMyWees: ['#8A6A1E', '#7A5A1A'],
    sombra: '#000000',
  },
  radioDeTarjeta: 22,
  sombraDeTarjeta: { opacidad: 0.18, radio: 20, desplazamiento: 8, elevacion: 6 },
  sombraDeBoton: { opacidad: 0.3, radio: 10, desplazamiento: 4, elevacion: 4 },
} as const;
