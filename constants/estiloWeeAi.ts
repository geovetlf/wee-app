/**
 * EL ESTILO DE WEËAI: monocromo, sin líneas, una tipografía y una escala corta (dirección del dueño, 2026-11-15:
 * «otra tipografía, sin líneas, blanco y negro, elegante, minimalista y moderno»).
 *
 * WeëAI es SIEMPRE OSCURA (espacio de la cuenta). Solo lo usa lo de WeëAI (portada, plantillas, detalle, «Tu versión», selector de modelo, música y lo que se añadió al
 * progreso y al resultado). Wall y ☰ no lo leen y conservan su identidad. Nada de colores sueltos: quien pinta lee de aquí
 * (por `hooks/useEstiloWeeAi.ts`).
 *
 * El ÚNICO acento es el degradado de `MARCA`/`ARTE_WEEAI.accion`, y solo en la acción principal de cada pantalla.
 */
import type { TextStyle, ViewStyle } from 'react-native';

export interface PaletaWeeAi {
  /** Fondo de la pantalla (oscuro). */
  fondo: string;
  /** Tarjetas, chips y cajas: un tono por encima del fondo, en lugar de un borde. */
  superficie: string;
  /** Lo seleccionado o pulsado: un tono más. */
  superficieAlta: string;
  tinta: string;
  tintaSecundaria: string;
  tintaTerciaria: string;
  /** Lo seleccionado se dice invirtiendo: fondo de tinta y texto de fondo. */
  seleccion: string;
  sobreSeleccion: string;
  sombra: string;
}

/** La única paleta de WeëAI: OSCURA y monocroma, igual con el Perfil Real y con el Perfil Weë (decisión del dueño, 2026-11-16). Lo seleccionado se invierte: claro sobre oscuro. */
export const PALETA_WEEAI: PaletaWeeAi = { fondo: '#0A0A0A', superficie: '#161616', superficieAlta: '#212121', tinta: '#FAFAFA', tintaSecundaria: '#A3A3A3', tintaTerciaria: '#8A8A8A', seleccion: '#FAFAFA', sobreSeleccion: '#0A0A0A', sombra: '#000000' };

/** Una sola escala de radios. */
export const RADIO_WEEAI = { control: 12, tarjeta: 20, hoja: 28, pastilla: 999 } as const;

/** Espacio en múltiplos de 4 y 8. */
export const ESPACIO_WEEAI = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

/** Elevación sutil: lo que separa una tarjeta del fondo cuando el tono no basta. */
export const SOMBRA_WEEAI: ViewStyle = { shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 };

/** La escala corta: cinco tamaños, ninguno por debajo de 13. */
export const TAMANO_WEEAI = { nota: 13, cuerpo: 15, enfasis: 17, titulo: 22, display: 28 } as const;
export type TamanoWeeAi = keyof typeof TAMANO_WEEAI;
export type PesoWeeAi = '400' | '500' | '600';

/**
 * LA FAMILIA DE WEËAI: Manrope (OFL; latino extendido, vietnamita, cirílico y griego), solo 400/500/600, cargada en `App.tsx` junto
 * a Inter. Árabe, hebreo, devanagari, jemer, CJK y hangul no están en Manrope y caen a la fuente del sistema, glifo a glifo.
 * Un texto con `fontFamily` explícito gana al envoltorio de Inter, así que Wall y ☰ no cambian.
 * NOTA: el paquete está en node_modules pero TODAVÍA NO DECLARADO en package.json (pendiente de autorización del manifiesto).
 */
export const FAMILIA_WEEAI: null | { '400': string; '500': string; '600': string } = {
  '400': 'Manrope_400Regular',
  '500': 'Manrope_500Medium',
  '600': 'Manrope_600SemiBold',
};

/** Estilo de texto: tamaño de la escala, peso 400/500/600 y la cara que le toca. */
export const textoWeeAi = (tamano: TamanoWeeAi, peso: PesoWeeAi = '400'): TextStyle => {
  const size = TAMANO_WEEAI[tamano];
  const base: TextStyle = { fontSize: size, lineHeight: Math.round(size * 1.4) };
  return FAMILIA_WEEAI ? { ...base, fontFamily: FAMILIA_WEEAI[peso] } : { ...base, fontWeight: peso };
};

/** Números tabulares para costes y contadores. */
export const NUMEROS_TABULARES: TextStyle = { fontVariant: ['tabular-nums'] };

/** Alias para las hojas de estilo: las claves de siempre apuntan a la escala corta (13 · 15 · 17 · 22) y a los pesos 400/500/600. */
export const FONT_SIZE_WEEAI = { sm: TAMANO_WEEAI.nota, base: TAMANO_WEEAI.cuerpo, md: TAMANO_WEEAI.enfasis, lg: TAMANO_WEEAI.enfasis, xl: TAMANO_WEEAI.titulo } as const;
export const FONT_WEIGHT_WEEAI = { regular: '400', medium: '500', semibold: '600', bold: '600' } as const;
