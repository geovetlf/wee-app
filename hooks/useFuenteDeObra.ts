/**
 * La letra de la OBRA en las Weë Pages: EB Garamond (OFL 1.1, licencia junto a los archivos en `assets/fonts/obra/`).
 * Decisión del dueño (2026-11-23): obra en EB Garamond, interfaz en Manrope (la de WeëAI).
 *
 * Los TTF están RECORTADOS a las escrituras que cubre Manrope (latín y latín extendido, cirílico, griego y vietnamita):
 * de ~1,4 MB a ~0,73 MB los tres. Árabe, hebreo, devanagari, CJK… caen a la fuente del sistema, como en WeëAI.
 *
 * NO se cargan en `App.tsx`: solo la pantalla de la Weë Page llama a este hook, así que en la web no se descargan
 * hasta que alguien abre una página. Mientras cargan (o si fallan) se devuelve `null` y se pinta con la fuente normal.
 */
import { useFonts } from 'expo-font';
import type { TextStyle } from 'react-native';

export const FAMILIA_OBRA = {
  '400': 'EBGaramond_400Regular',
  '500': 'EBGaramond_500Medium',
  cursiva: 'EBGaramond_400Regular_Italic',
} as const;

export type PesoDeObra = keyof typeof FAMILIA_OBRA;

const ARCHIVOS = {
  [FAMILIA_OBRA['400']]: require('../assets/fonts/obra/EBGaramond_400Regular.ttf'),
  [FAMILIA_OBRA['500']]: require('../assets/fonts/obra/EBGaramond_500Medium.ttf'),
  [FAMILIA_OBRA.cursiva]: require('../assets/fonts/obra/EBGaramond_400Regular_Italic.ttf'),
};

/** Devuelve un creador de estilos de obra; sin fuente cargada, solo tamaño (se ve con la fuente de siempre). */
export function useFuenteDeObra() {
  const [lista] = useFonts(ARCHIVOS);
  return (tamano: number, peso: PesoDeObra = '400'): TextStyle => {
    const base: TextStyle = { fontSize: tamano, lineHeight: Math.round(tamano * 1.4) };
    return lista ? { ...base, fontFamily: FAMILIA_OBRA[peso] } : base;
  };
}
