import { Platform } from 'react-native';

/**
 * LO QUE ESCRIBE UNA PERSONA NO SIGUE EL SENTIDO DE LA INTERFAZ.
 *
 * En una interfaz RTL, el texto de la app se escribe de derecha a izquierda (`escriturasDeLaInterfaz.web.ts`). Una
 * publicación, un comentario, un mensaje o un nombre son contenido: pueden estar en cualquier lengua y se orientan por su
 * propio texto. Se pasa a su `Text` con `{...TEXTO_DE_PERSONA}`. En nativo el sistema ya lo decide por el contenido.
 */
export const TEXTO_DE_PERSONA: object = Platform.OS === 'web' ? { dataSet: { contenido: 'persona' } } : {};
