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
    interaccion: '#7A22E0',
    /** Lila de fondo: la pastilla puesta, el chip, el velo de una fila elegida. */
    velo: '#F5EFFD',
    /** Lila fuerte: el lado puesto del selector de identidad. */
    veloFuerte: '#E7D2FD',
    /** Contorno fino de una tarjeta. */
    borde: '#E3D0FA',
    /** Texto encima de un relleno violeta. */
    sobre: '#FFFFFF',
  },
  oscuro: {
    interaccion: '#B79CFF',
    velo: 'rgba(183, 156, 255, 0.14)',
    veloFuerte: 'rgba(183, 156, 255, 0.26)',
    borde: 'rgba(183, 156, 255, 0.34)',
    sobre: '#14082E',
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
  claro: {
    superficie: '#FFFFFF',
    lavadoArriba: '#F1E6FE',
    lavadoAbajo: '#FBF8FF',
    arcoDorado: '#FFC24A',
    arcoRosa: '#FF9CCB',
    arcoVioleta: '#A45CF0',
    /** Cuánta luz lleva el arco (multiplica la opacidad de sus paradas). */
    luzDelArco: 2,
    titulo: '#1E1B2E',
    lema: '#6B6880',
    chip: '#FFFFFF',
    chispa: '#FFB21A',
    /** El borde en degradado del Composer y de la tarjeta del menú: dorado → violeta. */
    bordeDegradado: ['#FFC83D', '#F59AD0', '#9B4DF0'],
    /** El botón de enviar: lo más saturado de la pantalla. */
    accion: ['#FEBA03', '#FEA525', '#CF26C5', '#B20AD9'],
    sobreAccion: '#FFFFFF',
    /** El lavado de la tarjeta de MyWeës: dorado → lila. */
    lavadoMyWees: ['#FFF4E1', '#F7EEFE', '#F0E6FE'],
    bordeMyWees: ['#FFD98A', '#E3D0FA'],
    sombra: '#7A22E0',
  },
  oscuro: {
    superficie: '#15111F',
    lavadoArriba: '#231A38',
    lavadoAbajo: '#120F1B',
    arcoDorado: '#FFC24A',
    arcoRosa: '#FF8CC4',
    arcoVioleta: '#B58CFF',
    luzDelArco: 1.25,
    titulo: '#FFFFFF',
    lema: '#B6B1C9',
    chip: '#221B33',
    chispa: '#FFC24A',
    bordeDegradado: ['#FFC83D', '#F59AD0', '#B58CFF'],
    accion: ['#FEBA03', '#FEA525', '#CF26C5', '#B20AD9'],
    sobreAccion: '#FFFFFF',
    lavadoMyWees: ['#2A2118', '#1E1830', '#211936'],
    bordeMyWees: ['#8A6A1E', '#5B4390'],
    sombra: '#000000',
  },
  /** Radios y sombras, con nombre. */
  radioDeTarjeta: 24,
  sombraDeTarjeta: { opacidad: 0.16, radio: 24, desplazamiento: 10, elevacion: 6 },
  sombraDeBoton: { opacidad: 0.32, radio: 10, desplazamiento: 4, elevacion: 4 },
} as const;
