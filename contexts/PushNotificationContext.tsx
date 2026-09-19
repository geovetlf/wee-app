import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { pushNotificationService, PushNotificationData } from '../services/pushNotificationService';
import { useAuth } from './AuthContext';

interface PushNotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  registerForPush: () => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType>({
  expoPushToken: null,
  notification: null,
  registerForPush: async () => {},
});

export const usePushNotifications = () => useContext(PushNotificationContext);

export const PushNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  // Registrar para push notifications
  const registerForPush = async () => {
    const token = await pushNotificationService.registerForPushNotifications();
    if (token) {
      setExpoPushToken(token);
      // Guardar token en Firestore si hay usuario
      if (user?.uid) {
        await pushNotificationService.savePushToken(user.uid, token);
      }
    }
  };

  // Registrar automáticamente cuando el usuario está autenticado
  useEffect(() => {
    if (user?.uid) {
      registerForPush();
    }
  }, [user?.uid]);

  // Configurar listeners
  useEffect(() => {
    // Listener para notificaciones recibidas (app en primer plano)
    notificationListener.current = pushNotificationService.addNotificationReceivedListener(
      (notification) => {
        /* Solo el tipo: el aviso lleva el texto de un mensaje ajeno y no se escribe en el registro. */
        console.log('📬 Notificación recibida:', (notification.request.content.data as any)?.type ?? 'sin tipo');
        setNotification(notification);
      }
    );

    // Listener para cuando el usuario toca una notificación
    responseListener.current = pushNotificationService.addNotificationResponseListener(
      (response) => {
        const data = response.notification.request.content.data as unknown as PushNotificationData;
        console.log('👆 Notificación tocada:', data?.type ?? 'sin tipo');
        handleNotificationNavigation(data);
      }
    );

    // No verificar getLastNotificationResponse al montar — causa navegación
    // no deseada al Inbox cada vez que la app se reabre. Las notificaciones
    // tocadas se manejan a través del responseListener en tiempo real.

    return () => {
      // Cada suscripción se retira con su propio remove() (la función global
      // removeNotificationSubscription ya no existe y en web rompía la pantalla)
      notificationListener.current?.remove?.();
      responseListener.current?.remove?.();
    };
  }, []);

  // Navegar según el tipo de notificación
  const handleNotificationNavigation = (data: PushNotificationData) => {
    if (!data) return;

    // Esperar a que el navigator esté listo antes de navegar
    if (!navigation.isReady?.()) {
      // Reintentar después de que el navigator se monte
      setTimeout(() => handleNotificationNavigation(data), 500);
      return;
    }

    try {
      switch (data.type) {
        case 'like':
        case 'comment':
        case 'mention':
        case 'repost':
        case 'reply':
          if (data.postId) {
            navigation.navigate('PostDetail', { postId: data.postId });
          }
          break;
        case 'follow':
          if (data.senderId) {
            navigation.navigate('UserProfile', { userId: data.senderId });
          }
          break;
        case 'message':
          if (data.conversationId) {
            // Navigate to nested Conversation screen inside Inbox tab
            navigation.navigate('Main', {
              screen: 'Inbox',
              params: {
                screen: 'Conversation',
                params: { conversationId: data.conversationId },
              },
            });
          }
          break;
        default:
          // Tipo desconocido — no navegar a ningún lado
          break;
      }
    } catch (error) {
      console.error('Error navegando desde notificación:', error);
    }
  };

  return (
    <PushNotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        registerForPush,
      }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
};

export default PushNotificationContext;
