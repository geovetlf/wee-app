import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * LO QUE LA PERSONA ELIGIÓ A MANO, GUARDADO.
 *
 * Mismo patrón que la preferencia de ubicación (`services/locationService.ts`):
 * una clave con el prefijo `wee.`, un par leer/guardar y silencio defensivo si
 * el almacenamiento falla. No se monta un segundo sistema de preferencias
 * porque ya hay uno y funciona.
 *
 * SE GUARDA UNA SOLA COSA, y merece explicación porque la tentación es guardar
 * tres. Aquí solo vive la ELECCIÓN MANUAL. Lo que pide el aparato no se guarda:
 * se pregunta cada vez, porque puede cambiar y siempre es él quien tiene la
 * respuesta buena. Y el idioma resuelto tampoco: es el resultado de una cuenta
 * entre los dos, y guardar un resultado que se puede calcular es la forma más
 * fácil de que un día no coincidan.
 *
 * Que esté VACÍO significa algo concreto y distinto de estar en inglés: quiere
 * decir "todavía no he elegido, usa lo que diga mi aparato". El día que alguien
 * elige, deja de ser vacío y el aparato ya no vuelve a mandar.
 *
 * El valor es un locale completo (`es-PE`) y no solo el idioma, para que el día
 * que se pueda elegir región por separado no haya que migrar nada de lo que ya
 * esté guardado.
 */

const CLAVE = 'wee.idioma.preferencia';

/** Lo elegido a mano, o `null` si nunca se eligió. */
export const leerIdiomaElegido = async (): Promise<string | null> => {
  try {
    const guardado = await AsyncStorage.getItem(CLAVE);
    return guardado && guardado.trim() ? guardado : null;
  } catch {
    /* Sin almacenamiento se sigue: se usará lo que diga el aparato. */
    return null;
  }
};

export const guardarIdiomaElegido = async (locale: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(CLAVE, locale);
  } catch (error) {
    console.warn('No se pudo guardar la preferencia de idioma:', error);
  }
};

/** Volver a "lo que diga mi aparato". Hoy no lo usa ninguna pantalla; existe
 *  porque el día que haya un "Automático" en la lista, es esto. */
export const olvidarIdiomaElegido = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CLAVE);
  } catch (error) {
    console.warn('No se pudo borrar la preferencia de idioma:', error);
  }
};
