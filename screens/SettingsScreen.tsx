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
import { useIdioma } from '../contexts/IdiomaContext';
import { varianteDelLocale } from '../i18n/idiomas';
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
import TextoEnMayusculas from '../components/TextoEnMayusculas';

type SettingsNavigationProp = StackNavigationProp<ProfileStackParamList, 'Settings'>;

const SettingsScreen: React.FC = () => {
  /*
   * El idioma puesto se enseña en la propia fila, escrito en su lengua:
   * "Español", no "es". Es lo que la persona va buscando al mirar esa fila,
   * y le ahorra entrar solo para comprobarlo.
   */
  const { t, idioma, locale, disponibles } = useIdioma();
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
    /*
     * El año entra por hueco. Y la licencia de los datos de lugares obliga a
     * acreditar a GeoNames: va dentro de la frase, una sola vez, no en cada
     * publicación ni en cada búsqueda.
     */
    notify(t('settings.about'), t('settings.aboutBody', { anio: new Date().getFullYear() }));
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
    const ok = await confirmAction(t('settings.signOut'), t('menu.signOutConfirm'), t('settings.signOut'), true, t);
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
      notify(t('settings.signOutFailed'), t('common.retry'));
    }
  };

  /*
   * Un solo interruptor, y debajo lo que de verdad está pasando. Encender la
   * ubicación en Weë no es lo mismo que concedérsela al sistema: si el sistema
   * dice que no, el interruptor sigue encendido —eso es lo que la persona quiso—
   * y el texto explica dónde está el bloqueo, en vez de apagarse solo y dejarla
   * pulsando sin entender nada.
   */
  const CLAVE_DEL_ESTADO: Record<string, string> = {
    unavailable: 'settings.locationUnavailable',
    disabled: 'settings.locationDisabled',
    permissionDenied: 'settings.locationPermissionDenied',
    permissionNotDetermined: 'settings.locationPermissionNotDetermined',
    approximate: 'settings.locationApproximate',
    precise: 'settings.locationPrecise',
  };

  /*
   * La advertencia de privacidad va DENTRO de la frase, no pegada detrás: en
   * otro idioma puede no ir en ese orden.
   */
  const textoUbicacion =
    ubicacion.preferencia === 'off'
      ? t('settings.locationOff')
      : t('settings.locationLine', {
          estado: CLAVE_DEL_ESTADO[ubicacion.estado] ? t(CLAVE_DEL_ESTADO[ubicacion.estado]) : '',
        });

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
          {!!subtitle && (
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
          {t('settings.title')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contenido */}
        <View style={styles.section}>
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('settings.sectionContent')}
          </TextoEnMayusculas>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'people',
              t('settings.myCommunities'),
              /* Una o varias: lo decide Intl.PluralRules, no un ternario. */
              t('settings.communitiesJoined', { contador: joinedCommunitiesCount }),
              handleCommunities
            )}
          </View>
        </View>

        {/*
          Preferencias. El idioma no es contenido ni privacidad: es cómo se te
          presenta Weë. Grupo propio en vez de colarlo en uno que ya
          significaba otra cosa.
        */}
        <View style={styles.section}>
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('settings.sectionPreferences')}
          </TextoEnMayusculas>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {/*
              El subtítulo dice la VARIANTE, no el idioma: con portugués
              europeo puesto tiene que leerse «Português (Portugal)» y no
              «Português», que es lo mismo que dice Brasil. Igual con las dos
              escrituras del chino. Quien tiene un idioma de una sola norma
              —el alemán— cae al nombre de siempre.
            */}
            {renderSettingItem(
              'language',
              t('settings.language'),
              varianteDelLocale(locale)?.nombreNativo
                ?? disponibles.find((i) => i.codigo === idioma)?.nombreNativo
                ?? t('settings.languageSubtitle'),
              () => (navigation as any).navigate('Idioma')
            )}
          </View>
        </View>

        {/* Privacidad */}
        <View style={styles.section}>
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('settings.sectionPrivacy')}
          </TextoEnMayusculas>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'lock-closed',
              t('settings.privateReplies'),
              t('settings.privateRepliesHint'),
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
              t('settings.location'),
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
              t('settings.privacyPolicy'),
              t('settings.privacyPolicyHint'),
              handlePrivacy
            )}
          </View>
        </View>

        {/* Notificaciones */}
        <View style={styles.section}>
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('settings.sectionNotifications')}
          </TextoEnMayusculas>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'notifications',
              t('settings.pushNotifications'),
              t('settings.pushNotificationsHint'),
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
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('settings.sectionInfo')}
          </TextoEnMayusculas>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'information-circle',
              t('settings.about'),
              t('settings.aboutHint'),
              handleAbout
            )}
            
            {renderSettingItem(
              'help-circle',
              t('settings.help'),
              t('settings.helpHint'),
              handleSupport
            )}

            {engineAdmin &&
              renderSettingItem(
                'hardware-chip-outline',
                'Weë AI Engine',
                t('engine.rowSubtitle'),
                () => (navigation as any).navigate('EngineAdmin')
              )}
          </View>
        </View>

        {/* Cuenta */}
        <View style={styles.section}>
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('settings.sectionAccount')}
          </TextoEnMayusculas>

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
                    {t('settings.signOut')}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                    {t('settings.signOutHint')}
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
