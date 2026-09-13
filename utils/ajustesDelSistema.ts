import { Linking, Platform } from 'react-native';

/**
 * ABRIR LOS AJUSTES DEL SISTEMA, CUANDO YA NO QUEDA OTRA.
 *
 * Un permiso denegado del todo no se puede volver a pedir desde dentro de la
 * aplicación: en iOS el sistema no vuelve a enseñar el diálogo nunca, y en
 * Android deja de enseñarlo después de la segunda negativa. A partir de ahí la
 * única salida es la ficha de la aplicación en los ajustes del teléfono, y si
 * Weë no la ofrece, quien quiera cambiar de idea se queda sin camino.
 *
 * Esto NO abre nada por su cuenta. Es una puerta que una pantalla enseña solo
 * cuando el estado del permiso dice que hace falta; el flujo normal —preguntar
 * cuando todavía se puede— no cambia en nada.
 *
 * `LocationContext` ya vuelve a mirar el permiso cuando la aplicación pasa a
 * primer plano, así que al volver de los ajustes el estado se actualiza solo,
 * sin que haya que refrescar nada a mano.
 *
 * Devuelve si se pudo abrir. En el navegador no hay ajustes del sistema que
 * abrir, así que devuelve `false` sin intentarlo, y quien pregunte puede no
 * enseñar la opción.
 */
export const abrirAjustesDelSistema = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  try {
    await Linking.openSettings();
    return true;
  } catch (error) {
    console.warn('No se pudieron abrir los ajustes del sistema:', error);
    return false;
  }
};

/** Si en esta plataforma tiene sentido ofrecer el paso a los ajustes. */
export const hayAjustesDelSistema = Platform.OS !== 'web';
