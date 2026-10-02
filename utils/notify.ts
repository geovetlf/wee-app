import { Alert, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/*
 * QUIEN PONE LAS PALABRAS ENTRA POR LA PUERTA.
 *
 * Esto es una utilidad, no un componente: no tiene contexto del que sacar el
 * idioma y no va a tenerlo. El traductor se lo pasa quien la llama, que sí sabe
 * en qué idioma está mirando la persona. Es el mismo trato que `pollView`.
 */
type Traducir = (clave: string, valores?: Record<string, string | number>) => string;

/**
 * Avisos que funcionan igual en web y en nativo.
 * En React Native Web, Alert.alert no muestra nada: por eso usamos window.alert / window.confirm.
 *
 * `etiqueta`: el texto del único botón en nativo, para el aviso que ya decía el suyo («Entendido») y no debe pasar
 * a decir «OK». En web no se usa: `window.alert` pone su propio botón, como en `confirmAction`.
 */
export const notify = (title: string, message?: string, etiqueta?: string): void => {
  if (isWeb) {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  if (etiqueta) Alert.alert(title, message, [{ text: etiqueta }]);
  else Alert.alert(title, message);
};

/**
 * Pregunta sí/no. Resuelve true si la persona confirma.
 *
 * EL DIÁLOGO SE LEE COMO UNA SOLA FRASE, así que sus cuatro piezas —título,
 * mensaje y las dos etiquetas— tienen que estar en el mismo idioma. Las tres
 * primeras las trae quien llama; la de cancelar la pone el traductor que
 * recibe, porque es la única que esta utilidad inventa.
 *
 * `confirmLabel` ya no tiene valor por defecto: los cinco sitios que llaman
 * aquí pasan el suyo, así que el "Sí" que había era un camino muerto escrito en
 * español. Quien de verdad quiera decir "Sí" tiene `common.yes`.
 *
 * EN WEB LAS ETIQUETAS NO SE USAN: `window.confirm` pone sus propios botones,
 * en el idioma del navegador, y no deja cambiarlos. Se deja tal cual a
 * propósito: sustituirlo por una ventana propia sería rediseñar, no traducir.
 */
export const confirmAction = (
  title: string,
  message: string,
  confirmLabel: string,
  destructive: boolean,
  t: Traducir,
): Promise<boolean> => {
  if (isWeb) {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
};
