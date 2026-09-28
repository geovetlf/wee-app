import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import PaginaDeStudio from '../components/workspace/PaginaDeStudio';
import PanelDeCuenta from '../components/PanelDeCuenta';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * PERFIL, LA CUARTA PESTAÑA DE WEË STUDIO.
 *
 * Lo de la cuenta dentro del taller: quién eres, tus Credits —los mismos en las
 * dos caras—, su historial, comprar y los ajustes de siempre; y la salida a Weë,
 * a la vista. Tu perfil social vive en Weë: desde aquí se abre allí, no se copia.
 */
const StudioPerfilScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const navigation = useNavigation<any>();

  if (!user) {
    return (
      <PaginaDeStudio titulo={t('nav.profile')}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={[styles.boton, { backgroundColor: theme.colors.accent }]} accessibilityRole="button">
          <Text style={styles.botonTexto}>{t('workspace.signInToContinue')}</Text>
        </TouchableOpacity>
      </PaginaDeStudio>
    );
  }

  return (
    <PaginaDeStudio titulo={t('nav.profile')}>
      <View style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <AvatarDisplay
          size={scale(56)}
          avatarType={userProfile?.avatarType || 'predefined'}
          avatarId={userProfile?.avatarId || 'male'}
          photoURL={userProfile?.photoURL}
          photoURLThumbnail={userProfile?.photoURLThumbnail}
          backgroundColor={theme.colors.accent}
          showBorder={false}
        />
        <View style={styles.quien}>
          {/* El nombre es de la persona: no se traduce. */}
          <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>{userProfile?.displayName ?? ''}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Main', { screen: 'Profile' })}
            accessibilityRole="button"
            accessibilityLabel={t('workspace.myProfile')}
            style={isWeb ? ({ cursor: 'pointer' } as object) : undefined}
          >
            <Text style={[styles.enlace, { color: theme.colors.accent }]}>{t('workspace.myProfile')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PanelDeCuenta />

      <TouchableOpacity
        onPress={() => navigation.navigate('Main')}
        style={[styles.salida, { borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as object)]}
        accessibilityRole="button"
        accessibilityLabel={t('workspace.backToWee')}
      >
        <Ionicons name="arrow-back-circle-outline" size={scale(20)} color={theme.colors.text} />
        <Text style={[styles.salidaTexto, { color: theme.colors.text }]}>{t('workspace.backToWee')}</Text>
      </TouchableOpacity>
    </PaginaDeStudio>
  );
};

const styles = StyleSheet.create({
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, borderWidth: 1 },
  quien: { flex: 1, minWidth: 0, gap: 4 },
  nombre: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  enlace: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  salida: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, minHeight: 48,
    borderRadius: BORDER_RADIUS.md, borderWidth: 1,
  },
  salidaTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any },
  boton: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { color: '#1F2937', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any },
});

export default StudioPerfilScreen;
