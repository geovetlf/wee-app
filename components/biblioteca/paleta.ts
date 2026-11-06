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
  /** Morado eléctrico: lo elegido, los iconos de Weë AI. */
  morado: '#7200FF',
  /** Morado secundario: el otro extremo del degradado morado. */
  moradoSecundario: '#8500F5',
  /** Lavanda: fondos de identidad (la píldora de Weë AI, la loseta del icono). */
  lavanda: '#EEDFFF',
  /** Lavanda muy suave: el fondo de la tarjeta informativa y de las miniaturas sin imagen. */
  lavandaSuave: '#F8F2FF',
  /** El filete de lo lavanda. */
  bordeLavanda: '#E6D5FF',
  /** El filete neutro de las tarjetas: casi invisible, solo separa. */
  borde: '#ECEAF1',
  /** Texto principal y secundario (los mismos grises de Weë). */
  texto: '#1F2937',
  textoSuave: '#6B7280',
  /** Rojo de lo que no salió bien (estado de una creación). */
  error: '#DC2626',
  /** El degradado morado del filtro elegido: 110°, como el de marca. */
  degradadoMorado: {
    colores: ['#8500F5', '#7200FF'] as const,
    inicio: { x: 0, y: 0.32 },
    fin: { x: 1, y: 0.68 },
  },
  /** El degradado de la ilustración de los vacíos. */
  degradadoIlustracion: {
    colores: ['#B98BFF', '#7200FF'] as const,
    inicio: { x: 0, y: 0 },
    fin: { x: 1, y: 1 },
  },
} as const;

/** Sombra ligera, solo donde hace falta (botón principal, menú desplegable). */
export const SOMBRA_SUAVE = {
  shadowColor: '#7200FF',
  shadowOpacity: 0.12,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
} as const;
