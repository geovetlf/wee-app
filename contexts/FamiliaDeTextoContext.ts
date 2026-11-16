import { createContext } from 'react';

/**
 * QUÉ FAMILIA PIDE EL TEXTO POR DEFECTO. Inter en toda la app; Manrope dentro de WeëAI (`enTemaClaro` marca ese límite: lo
 * usan las pantallas de WeëAI y nada más). El envoltorio de `Text`/`TextInput` (`utils/aplicarInter.ts`) lo lee y elige la cara
 * del peso. Un texto con `fontFamily` propio sigue ganando. Los alfabetos sin cobertura (árabe, hebreo, jemer, devanagari)
 * siguen cayendo a su fuente por el mismo `unicode-range` (web) o por el sistema (nativo): no se fuerza nada.
 */
export type FamiliaDeTexto = 'inter' | 'manrope';
export const FamiliaDeTextoContext = createContext<FamiliaDeTexto>('inter');
