import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import ResponsiveLayout from '../components/ResponsiveLayout';
import { ProfileStackParamList } from '../navigation/ProfileStackNavigator';
import { confirmAction, notify } from '../utils/notify';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocation } from '../contexts/LocationContext';
import { abrirAjustesDelSistema, hayAjustesDelSistema } from '../utils/ajustesDelSistema';
import { ENGINE_ADMIN_FLAG } from './EngineAdminScreen';

type SettingsNavigationProp = StackNavigationProp<ProfileStackParamList, 'Settings'>;

const SettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const { userProfile } = useUserProfile();
  const navigation = useNavigation<SettingsNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const [allowPrivateReplies, setAllowPrivateReplies] = useState(true);
  /*
   * La ubicación se lee del contexto, no de un useState local como los demás
   * interruptores de esta pantalla: aquí lo que se enciende no es una opción de
   * la pantalla, es una capacidad del aparato que el resto de Weë va a consultar.
   */
  const ubicacion = useLocation();
  const [pidiendoUbicacion, setPidiendoUbicacion] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  // Panel del WEË AI ENGINE: visible en desarrollo o para quien ya entró como administración
  const [engineAdmin, setEngineAdmin] = useState<boolean>(__DEV__);
  useEffect(() => {
    AsyncStorage.getItem(ENGINE_ADMIN_FLAG)
      .then((value) => {
        if (value === '1') setEngineAdmin(true);
      })
      .catch(() => {});
  }, []);

  const joinedCommunitiesCount = userProfile?.joinedCommunities?.length || 0;

  const handleAbout = () => {
    notify(
      'Acerca de Weë',
      'Weë (World Encode Entity) es la red social de las personas que crean con Inteligencia Artificial.\n\nVersión 1.0.0 · © ' +
        new Date().getFullYear() +
        ' Weë. Todos los derechos reservados.' +
        // La licencia de los datos de lugares obliga a acreditar a GeoNames.
        // Va aquí, una sola vez: no en cada publicación ni en cada búsqueda.
        '\n\nDatos geográficos: GeoNames (geonames.org), CC BY 4.0.'
    );
  };

  const handlePrivacy = () => {
    (navigation as any).navigate('Help', { section: 'legal' });
  };

  const handleSupport = () => {
    (navigation as any).navigate('Help');
  };

  const handleCommunities = () => {
    navigation.navigate('CommunitiesManagement');
  };

  const handleLogout = async () => {
    const ok = await confirmAction('Cerrar sesión', '¿Quieres salir de Weë?', 'Cerrar sesión', true);
    if (!ok) return;
    try {
      // Navegar al root antes de hacer logout para evitar errores
      // en pantallas que intentan acceder a datos del usuario
      const rootNav = navigation.getParent()?.getParent() || navigation.getParent() || navigation;
      rootNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
      await logout();
    } catch (error) {
      notify('No pudimos cerrar la sesión', 'Inténtalo de nuevo.');
    }
  };

  /*
   * Un solo interruptor, y debajo lo que de verdad está pasando. Encender la
   * ubicación en Weë no es lo mismo que concedérsela al sistema: si el sistema
   * dice que no, el interruptor sigue encendido —eso es lo que la persona quiso—
   * y el texto explica dónde está el bloqueo, en vez de apagarse solo y dejarla
   * pulsando sin entender nada.
   */
  const estadoUbicacion: Record<string, string> = {
    unavailable: 'Este dispositivo no puede darnos tu ubicación.',
    disabled: 'La ubicación está apagada en los ajustes de tu dispositivo.',
    permissionDenied: 'Le dijiste que no al sistema. Toca aquí para cambiarlo en los ajustes de tu dispositivo.',
    permissionNotDetermined: 'Weë te pedirá permiso cuando lo necesite.',
    approximate: 'Weë sabe tu zona, no el punto exacto.',
    precise: 'Weë puede usar tu ubicación con detalle cuando una función lo necesite.',
  };

  const textoUbicacion =
    ubicacion.preferencia === 'off'
      ? 'Desactivada. Permite que Weë use tu ubicación aproximada para mostrarte contenido y experiencias cerca de ti. Tu ubicación exacta nunca se muestra públicamente.'
      : `${estadoUbicacion[ubicacion.estado] || ''} Tu ubicación exacta nunca se muestra públicamente.`;

  /*
   * CUÁNDO OFRECER EL PASO A LOS AJUSTES.
   *
   * Solo cuando el sistema ya dijo que no y no va a volver a preguntar. Si
   * todavía se puede pedir el permiso con normalidad, manda el interruptor de
   * siempre y aquí no aparece nada: no se cambia el flujo, se añade la salida
   * que faltaba cuando ese flujo ya no tiene nada que hacer.
   *
   * El interruptor sigue funcionando aparte, porque se come sus propios toques.
   * Y al volver de los ajustes no hay que refrescar nada: `LocationContext` ya
   * vuelve a mirar el permiso cuando la aplicación pasa a primer plano.
   */
  const ubicacionNecesitaAjustes =
    hayAjustesDelSistema && ubicacion.preferencia !== 'off' && ubicacion.estado === 'permissionDenied';

  const cambiarUbicacion = async (encender: boolean) => {
    setPidiendoUbicacion(true);
    try {
      // Encender siempre empieza por la zona. El detalle no se activa desde una
      // pantalla de ajustes: lo pedirá, si algún día hace falta, la función que
      // de verdad lo necesite y en el momento en que lo necesite.
      if (encender) await ubicacion.activar('aproximada');
      else await ubicacion.desactivar();
    } finally {
      setPidiendoUbicacion(false);
    }
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightComponent?: React.ReactNode,
    showArrow: boolean = true
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, { 
        backgroundColor: theme.colors.card,
        borderBottomColor: theme.colors.border,
      }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name={icon as any} size={20} color={theme.colors.accent} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && onPress && (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={theme.colors.textSecondary}
            style={styles.arrow}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
        paddingTop: isDesktop ? 0 : insets.top + 8,
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Configuración
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contenido */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Contenido
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'people',
              'Mis comunidades',
              `${joinedCommunitiesCount} ${joinedCommunitiesCount === 1 ? 'comunidad' : 'comunidades'} unidas`,
              handleCommunities
            )}
          </View>
        </View>

        {/* Privacidad */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Privacidad
          </Text>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'lock-closed',
              'Respuestas privadas',
              'Permitir que otros te envíen mensajes privados',
              undefined,
              <Switch
                value={allowPrivateReplies}
                onValueChange={setAllowPrivateReplies}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent + '40' }}
                thumbColor={allowPrivateReplies ? theme.colors.accent : theme.colors.textSecondary}
              />,
              false
            )}
            
            {renderSettingItem(
              'location',
              '📍 Ubicación',
              textoUbicacion,
              ubicacionNecesitaAjustes ? () => { void abrirAjustesDelSistema(); } : undefined,
              <Switch
                value={ubicacion.preferencia !== 'off'}
                onValueChange={cambiarUbicacion}
                disabled={ubicacion.cargando || pidiendoUbicacion}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent + '40' }}
                thumbColor={ubicacion.preferencia !== 'off' ? theme.colors.accent : theme.colors.textSecondary}
              />,
              false
            )}

            {renderSettingItem(
              'shield-checkmark',
              'Política de privacidad',
              'Qué hacemos con tus datos, en palabras simples',
              handlePrivacy
            )}
          </View>
        </View>

        {/* Notificaciones */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Notificaciones
          </Text>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'notifications',
              'Notificaciones push',
              'Recibe notificaciones de nuevos mensajes y actividad',
              undefined,
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent + '40' }}
                thumbColor={notificationsEnabled ? theme.colors.accent : theme.colors.textSecondary}
              />,
              false
            )}
          </View>
        </View>

        {/* Información */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Información
          </Text>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'information-circle',
              'Acerca de Weë',
              'Qué es Weë y en qué versión estás',
              handleAbout
            )}
            
            {renderSettingItem(
              'help-circle',
              'Ayuda',
              'Preguntas frecuentes y contacto',
              handleSupport
            )}

            {engineAdmin &&
              renderSettingItem(
                'hardware-chip-outline',
                'Weë AI Engine',
                'Proveedores, cadenas de fallback y ajustes (solo administración)',
                () => (navigation as any).navigate('EngineAdmin')
              )}
          </View>
        </View>

        {/* Cuenta */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Cuenta
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={[styles.settingItem, {
                backgroundColor: 'transparent',
                borderBottomWidth: 0,
              }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: '#EF4444' }]}>
                    Cerrar sesión
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                    Salir de tu cuenta
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
            Weë v1.0.0
          </Text>
          <Text style={[styles.versionSubtext, { color: theme.colors.textSecondary }]}>
            World Encode Entity
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
  },
});

export default SettingsScreen;
