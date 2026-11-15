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
 * EL ACENTO DE INTERACCIÓN — violeta eléctrico (decisión del dueño, 2026-11-15).
 *
 * No es el color de marca: la marca y las acciones primarias siguen en el dorado
 * de arriba. El violeta dice «esto está activo», «aquí está el foco», «esto es
 * un enlace»: la pestaña puesta, el lado elegido del selector de identidad, el
 * chip de Weë Brain. Nunca rellena un botón principal ni domina una pantalla.
 *
 * `ThemeContext` lo copia en `theme.colors.interaction…`, que es lo que leen los
 * componentes: ningún componente escribe este color a mano.
 *
 *   - claro: #7200FF sobre blanco, contraste 6,7:1 (texto e iconos);
 *   - oscuro: #B79CFF sobre #0A0A0A, contraste 8,9:1. El violeta de la app
 *     clara se apaga sobre negro, así que el tema oscuro usa su versión clara.
 */
export const ACENTO = {
  claro: {
    interaccion: '#7200FF',
    /** Velo para fondos suaves: la pestaña o la pastilla puesta, el chip. */
    velo: 'rgba(114, 0, 255, 0.08)',
    /** Contorno de una tarjeta destacada. */
    borde: 'rgba(114, 0, 255, 0.28)',
    /** Texto encima de un relleno violeta. */
    sobre: '#FFFFFF',
  },
  oscuro: {
    interaccion: '#B79CFF',
    velo: 'rgba(183, 156, 255, 0.14)',
    borde: 'rgba(183, 156, 255, 0.38)',
    sobre: '#14082E',
  },
} as const;
