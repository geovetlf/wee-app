import { Alert, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/**
 * Avisos que funcionan igual en web y en nativo.
 * En React Native Web, Alert.alert no muestra nada: por eso usamos window.alert / window.confirm.
 */
export const notify = (title: string, message?: string): void => {
  if (isWeb) {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
};

/** Pregunta sí/no. Resuelve true si la persona confirma. */
export const confirmAction = (title: string, message: string, confirmLabel = 'Sí', destructive = false): Promise<boolean> => {
  if (isWeb) {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
};
