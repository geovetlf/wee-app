import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import AvatarDisplay from '../avatars/AvatarDisplay';
import CreditsPill from '../CreditsPill';
import BuscadorDeStudio from './BuscadorDeStudio';
import type { AccionDeCabecera } from './accionDeCabecera';
import type { ResultadoDeBusqueda } from '../../hooks/useBusquedaDeStudio';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * LA CABECERA DE WEË STUDIO.
 *
 * Escritorio: la salida a Weë y la marca a la izquierda; el buscador en medio; a
 * la derecha los Credits —siempre a la vista, porque aquí todo cuesta—, las
 * notificaciones, tu perfil y, si la pantalla tiene algo que decir arriba, su
 * botón (Filmmaker: «Exportar»). Teléfono, como en su referencia: la salida, la
 * marca, la lupa, los Credits, las notificaciones y tu avatar; las secciones van
 * abajo, en las cuatro pestañas del Studio.
 *
 * No navega: avisa, y quien la monta —el marco de Weë Studio— decide.
 */
const CabeceraDeStudio: React.FC<{
  forma: 'escritorio' | 'movil';
  accion: AccionDeCabecera | null;
  onVolverAWee: () => void;
  onNotificaciones: () => void;
  onPerfil: () => void;
  onResultado: (r: ResultadoDeBusqueda) => void;
}> = ({ forma, accion, onVolverAWee, onNotificaciones, onPerfil, onResultado }) => {
  const { theme } = useTheme();
  const t = useT();
  const { userProfile } = useUserProfile();
  const movil = forma === 'movil';

  const marca = (
    <View style={styles.marca} accessibilityRole="header" accessibilityLabel={t('workspace.name')}>
      <Image source={require('../../assets/images/weelogo-dark.png')} style={[styles.logo, movil && styles.logoMovil]} contentFit="contain" />
      <Text style={[styles.palabra, { color: theme.colors.accent }]}>{t('workspace.wordmark')}</Text>
    </View>
  );

  const icono = (nombre: string, etiqueta: string, alPulsar: () => void) => (
    <TouchableOpacity
      onPress={alPulsar}
      style={[styles.boton, { borderColor: theme.colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <Ionicons name={nombre as any} size={scale(19)} color={theme.colors.text} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.background }}>
      <View style={[styles.barra, movil && styles.barraMovil, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={onVolverAWee}
          style={styles.salida}
          accessibilityRole="button"
          accessibilityLabel={t('workspace.backToWee')}
        >
          <Ionicons name="chevron-back" size={scale(20)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        {marca}

        {!movil && (
          <View style={styles.centro}>
            <BuscadorDeStudio forma="caja" onAbrir={onResultado} />
          </View>
        )}
        {movil && <View style={styles.empuje} />}

        <View style={styles.acciones}>
          {movil && <BuscadorDeStudio forma="icono" onAbrir={onResultado} />}
          <CreditsPill compact={movil} />
          {icono('notifications-outline', t('workspace.notifications'), onNotificaciones)}
          <TouchableOpacity onPress={onPerfil} accessibilityRole="button" accessibilityLabel={t('workspace.myProfile')}>
            {userProfile ? (
              <AvatarDisplay
                size={scale(movil ? 30 : 34)}
                avatarType={userProfile.avatarType || 'predefined'}
                avatarId={userProfile.avatarId || 'male'}
                photoURL={userProfile.photoURL}
                photoURLThumbnail={userProfile.photoURLThumbnail}
                backgroundColor={theme.colors.accent}
                showBorder={false}
              />
            ) : (
              <View style={[styles.boton, { borderColor: theme.colors.border }]}>
                <Ionicons name="person-outline" size={scale(18)} color={theme.colors.text} />
              </View>
            )}
          </TouchableOpacity>
          {!!accion && !movil && (
            <TouchableOpacity
              onPress={accion.onPress}
              style={[styles.principal, { backgroundColor: theme.colors.accent }, isWeb && ({ cursor: 'pointer' } as object)]}
              accessibilityRole="button"
              accessibilityLabel={accion.etiqueta}
            >
              <Ionicons name={accion.icono as any} size={scale(16)} color="#1F2937" />
              <Text style={styles.principalTexto}>{accion.etiqueta}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, height: scale(60), paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 20,
  },
  barraMovil: { height: scale(54), paddingHorizontal: SPACING.sm, gap: SPACING.xs },
  salida: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  logo: { width: scale(64), height: scale(26) },
  logoMovil: { width: scale(52), height: scale(22) },
  palabra: { fontSize: scale(11), fontWeight: FONT_WEIGHT.bold as any, letterSpacing: 2 },
  centro: { flex: 1, alignItems: 'center', paddingHorizontal: SPACING.lg },
  empuje: { flex: 1 },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  boton: { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  principal: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, height: 40, paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  principalTexto: { color: '#1F2937', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold as any },
});

export default CabeceraDeStudio;
