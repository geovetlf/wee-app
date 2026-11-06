import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Interruptor from '../components/Interruptor';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../components/IconoDireccional';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { varianteDelLocale } from '../i18n/idiomas';
import { nombreDeLaRegion } from '../i18n/formato';
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
  const { user, logout } = useAuth();
  const { userProfile, realProfile } = useUserProfile();
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
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color={theme.colors.text} />
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
          <IconoDireccional 
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
          <IconoDireccional name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('settings.title')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/*
          LA CUENTA, LO PRIMERO (decisión del dueño, 2026-11-05): el nombre real, el correo con el que se
          entra y el país. Siempre los del Perfil Real —son de la persona y de su cuenta—, aunque esté puesto
          el Perfil Weë. Solo se leen; se cambian donde siempre.
        */}
        {!!user && (
          <View style={styles.section}>
            <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('settings.sectionAccount')}
            </TextoEnMayusculas>
            <View style={[styles.card, styles.cuenta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.cuentaNombre, { color: theme.colors.text }]} numberOfLines={2}>
                {realProfile?.displayName || '—'}
              </Text>
              {[
                { clave: 'auth.email', valor: user.email || '—' },
                { clave: 'onboarding.country', valor: (realProfile?.country ? nombreDeLaRegion(realProfile.country, locale) : realProfile?.countryName) || '—' },
              ].map((dato) => (
                <View key={dato.clave} style={[styles.cuentaFila, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.cuentaEtiqueta, { color: theme.colors.textSecondary }]}>{t(dato.clave)}</Text>
                  <Text style={[styles.cuentaValor, { color: theme.colors.text }]} numberOfLines={1}>{dato.valor}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contenido */}
        <View style={styles.section}>
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.sectionContent')}
          </TextoEnMayusculas>

          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
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
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.sectionPreferences')}
          </TextoEnMayusculas>

          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
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
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.sectionPrivacy')}
          </TextoEnMayusculas>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {renderSettingItem(
              'lock-closed',
              t('settings.privateReplies'),
              t('settings.privateRepliesHint'),
              undefined,
              <Interruptor
                value={allowPrivateReplies}
                onValueChange={setAllowPrivateReplies}
                trackColor={{ false: theme.colors.border, true: theme.colors.text }}
                thumbColor={allowPrivateReplies ? theme.colors.background : theme.colors.textSecondary}
                /* En la web el pulgar encendido se pinta con activeThumbColor (react-native-web); sin él sale su verde azulado. */
                {...({ activeThumbColor: theme.colors.background } as object)}
              />,
              false
            )}
            
            {renderSettingItem(
              'location',
              t('settings.location'),
              textoUbicacion,
              ubicacionNecesitaAjustes ? () => { void abrirAjustesDelSistema(); } : undefined,
              <Interruptor
                value={ubicacion.preferencia !== 'off'}
                onValueChange={cambiarUbicacion}
                disabled={ubicacion.cargando || pidiendoUbicacion}
                trackColor={{ false: theme.colors.border, true: theme.colors.text }}
                thumbColor={ubicacion.preferencia !== 'off' ? theme.colors.background : theme.colors.textSecondary}
                /* En la web el pulgar encendido se pinta con activeThumbColor (react-native-web); sin él sale su verde azulado. */
                {...({ activeThumbColor: theme.colors.background } as object)}
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
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.sectionNotifications')}
          </TextoEnMayusculas>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            {renderSettingItem(
              'notifications',
              t('settings.pushNotifications'),
              t('settings.pushNotificationsHint'),
              undefined,
              <Interruptor
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.text }}
                thumbColor={notificationsEnabled ? theme.colors.background : theme.colors.textSecondary}
                /* En la web el pulgar encendido se pinta con activeThumbColor (react-native-web); sin él sale su verde azulado. */
                {...({ activeThumbColor: theme.colors.background } as object)}
              />,
              false
            )}
          </View>
        </View>

        {/* Información */}
        <View style={styles.section}>
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.sectionInfo')}
          </TextoEnMayusculas>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
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
          <TextoEnMayusculas style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('settings.sectionAccount')}
          </TextoEnMayusculas>

          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.settingItem, {
                backgroundColor: 'transparent',
                borderBottomWidth: 0,
              }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <IconoDireccional name="log-out-outline" size={20} color={theme.colors.text} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
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
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 1.2,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  cuenta: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  cuentaNombre: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  cuentaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cuentaEtiqueta: {
    fontSize: 14,
  },
  cuentaValor: {
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 28,
    height: 36,
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
