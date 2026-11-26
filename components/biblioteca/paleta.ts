/**
 * LA PALETA DE «MIS CREACIONES» Y «MIS PROYECTOS» — solo de estas dos secciones.
 *
 * El morado y la lavanda son la identidad de Weë AI dentro de la biblioteca:
 * el filtro elegido, la tarjeta informativa, los indicadores creativos. El
 * amarillo → naranja sigue siendo la marca (Credits y acción principal) y NO
 * se define aquí: sale de `components/GradienteDeMarca.tsx`, que es el de toda
 * la App. Esta paleta no toca los colores globales (`constants/marca.ts`,
 * `contexts/ThemeContext.tsx`); se define UNA vez y la usan solo las piezas de
 * `components/biblioteca/` y las tres pantallas de la biblioteca.
 */
export const PALETA_BIBLIOTECA = {
  /* MONOCROMO OSCURO (2026-11-16): la biblioteca es de WeëAI —siempre oscura, igual con las dos caras—. Los nombres se conservan (los usan las piezas
     de la biblioteca) pero ya no hay morado ni lavanda: lo elegido es tinta clara sobre fondo oscuro. */
  /** Lo elegido y los iconos de WeëAI: la tinta clara de la paleta de WeëAI. */
  morado: '#FAFAFA',
  moradoSecundario: '#FAFAFA',
  /** Fondos de identidad (loseta del icono, píldoras): superficie 3 de WeëAI. */
  lavanda: '#212121',
  /** Fondo de la tarjeta informativa y de las miniaturas sin imagen: superficie 2. */
  lavandaSuave: '#161616',
  /** Sin filetes: se separa con tono, no con línea. */
  bordeLavanda: 'transparent',
  borde: 'transparent',
  /** Superficie de las tarjetas, los campos y los botones secundarios. */
  superficie: '#161616',
  /** Texto sobre lo elegido (que es claro). */
  sobreMorado: '#0A0A0A',
  /** Texto principal y secundario de WeëAI. */
  texto: '#FAFAFA',
  textoSuave: '#A3A3A3',
  /** Lo que no salió bien (estado de una creación). */
  error: '#F87171',
  degradadoMorado: {
    colores: ['#FAFAFA', '#FAFAFA'] as const,
    inicio: { x: 0, y: 0 },
    fin: { x: 1, y: 1 },
  },
  degradadoIlustracion: {
    colores: ['#212121', '#161616'] as const,
    inicio: { x: 0, y: 0 },
    fin: { x: 1, y: 1 },
  },
} as const;

/** Sombra ligera, solo donde hace falta (botón principal, menú desplegable). */
export const SOMBRA_SUAVE = {} as const;
