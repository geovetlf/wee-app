import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * EL PROYECTO DE EAS, LEÍDO DE LA CONFIGURACIÓN Y NO COPIADO A MANO.
 *
 * Estaba escrito aquí un identificador que ya no era el de la aplicación, con
 * un comentario que decía que venía de `app.json`. Dejó de ser verdad en algún
 * momento y nadie se enteró, porque un UUID copiado no avisa cuando el de
 * verdad cambia. Ahora se lee de donde vive.
 *
 * El literal del final es solo la red: si `expoConfig` no estuviera disponible
 * —hay contextos donde llega vacío—, pedir el token sin identificador falla, y
 * eso sí rompería las notificaciones. Es el valor real de `extra.eas.projectId`,
 * así que la red dice lo mismo que la configuración.
 */
const PROYECTO_DE_EAS: string =
  Constants.expoConfig?.extra?.eas?.projectId
  ?? Constants.easConfig?.projectId
  ?? '920ff7aa-c0a9-481d-82c0-4e3d57386175';

/**
 * ¿ES ESTE ERROR EL "AQUÍ NO PUEDES ESCRIBIR" DE FIRESTORE?
 *
 * Solo ese código, y comparado por igualdad exacta. Ni por el texto del mensaje
 * —que cambia entre versiones— ni por una familia de errores: un `unavailable`,
 * un `not-found` o un fallo de red siguen siendo errores de verdad y siguen
 * saliendo por donde salían.
 */
const esPermisoDenegado = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'permission-denied';

export interface PushNotificationData {
  type: 'like' | 'comment' | 'follow' | 'mention' | 'repost' | 'reply' | 'message';
  postId?: string;
  commentId?: string;
  senderId?: string;
  conversationId?: string;
}

export const pushNotificationService = {
  // Registrar para push notifications y obtener el token
  registerForPushNotifications: async (): Promise<string | null> => {
    try {
      // Solo funciona en dispositivos físicos
      if (!Device.isDevice) {
        console.log('Push notifications solo funcionan en dispositivos físicos');
        return null;
      }

      // Verificar permisos existentes
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Si no hay permisos, solicitarlos
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permisos de notificación denegados');
        return null;
      }

      // Obtener el token de Expo Push
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: PROYECTO_DE_EAS,
      });

      const token = tokenData.data;
      console.log('📱 Push token obtenido:', token);

      // Configuración específica de Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F5B731',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registrando push notifications:', error);
      return null;
    }
  },

  // Guardar el token en el perfil del usuario
  savePushToken: async (userId: string, token: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: token,
        pushTokenUpdatedAt: new Date(),
      });
    } catch (error) {
      /*
       * QUE FIRESTORE NO DEJE GUARDAR EL TOKEN NO ES UNA AVERÍA DE LA APP.
       *
       * Las reglas pueden rechazar esta escritura, y cuando lo hacen la app
       * seguía llamando a `console.error`. Eso importa porque `App.tsx` envuelve
       * `console.error` y lo convierte en un Alert en desarrollo: un cartel
       * "Error detectado" delante del Home, con su aviso abajo, en cada arranque
       * y sin nada que la persona pueda hacer al respecto.
       *
       * Aquí se traga solo ESE caso, y en voz baja —`console.log`, que nadie
       * envuelve—, para que quede rastro en el registro sin tapar la pantalla.
       * No se desactiva nada: el contexto vuelve a intentarlo en cada arranque y
       * con cada cambio de sesión, así que el día que la escritura se permita,
       * el token se guarda solo.
       */
      if (esPermisoDenegado(error)) {
        console.log('Push token no guardado: Firestore denegó la escritura. Se reintentará.');
        return;
      }
      console.error('Error guardando push token:', error);
    }
  },

  // Eliminar el token (logout)
  removePushToken: async (userId: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: null,
        pushTokenUpdatedAt: new Date(),
      });
      console.log('🗑️ Push token eliminado');
    } catch (error) {
      /* La misma escritura, en el mismo campo y bajo la misma regla: si la
         rechazan al guardar, la rechazan al borrar. Callarlo solo aquí habría
         movido el cartel del arranque al cierre de sesión. */
      if (esPermisoDenegado(error)) {
        console.log('Push token no eliminado: Firestore denegó la escritura.');
        return;
      }
      console.error('Error eliminando push token:', error);
    }
  },

  // Listener para cuando se recibe una notificación (app en primer plano)
  addNotificationReceivedListener: (
    callback: (notification: Notifications.Notification) => void
  ) => {
    return Notifications.addNotificationReceivedListener(callback);
  },

  // Listener para cuando el usuario toca una notificación
  addNotificationResponseListener: (
    callback: (response: Notifications.NotificationResponse) => void
  ) => {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },

  // Obtener la última notificación que abrió la app
  getLastNotificationResponse: async () => {
    return await Notifications.getLastNotificationResponseAsync();
  },

  // Limpiar badge
  clearBadge: async () => {
    await Notifications.setBadgeCountAsync(0);
  },

  // Enviar notificación local (para testing)
  sendLocalNotification: async (title: string, body: string, data?: PushNotificationData) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as any,
        sound: true,
      },
      trigger: null, // Inmediato
    });
  },
};

export default pushNotificationService;
