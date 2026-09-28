import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useWallet } from '../hooks/useWallet';
import { MarcaDeCredits } from './CreditsPill';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * TU CUENTA, EN TU PERFIL.
 *
 * Con Perfil de vuelta en la barra (decisión del usuario, 2026-09-27), aquí se
 * junta lo que es de la CUENTA y no de una cara: los Credits —el saldo, su
 * historial y comprar más—, el idioma, la configuración, la privacidad, la
 * ayuda, lo guardado y la puerta a Weë Creator. No es un panel de
 * administración: son atajos a las pantallas de siempre, ninguna nueva.
 *
 * El saldo es de la cuenta: sale de `useWallet()` sin uid, igual que en la
 * píldora de Weë AI, así que cambiar de cara no lo cambia.
 */
const PanelDeCuenta: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const navigation = useNavigation<any>();
  const { balance } = useWallet();

  const atajos: readonly { id: string; clave: string; icono: string; ir: () => void }[] = [
    { id: 'idioma', clave: 'cuenta.language', icono: 'language-outline', ir: () => navigation.navigate('Idioma') },
    { id: 'ajustes', clave: 'cuenta.settings', icono: 'settings-outline', ir: () => navigation.navigate('Settings') },
    { id: 'privacidad', clave: 'cuenta.privacy', icono: 'shield-checkmark-outline', ir: () => navigation.navigate('Help', { section: 'legal' }) },
    { id: 'ayuda', clave: 'cuenta.help', icono: 'help-circle-outline', ir: () => navigation.navigate('Help') },
    { id: 'guardados', clave: 'cuenta.saved', icono: 'bookmark-outline', ir: () => navigation.navigate('SavedPosts') },
    { id: 'creator', clave: 'cuenta.creator', icono: 'aperture-outline', ir: () => navigation.navigate('Creator', { screen: 'CreatorInicio' }) },
  ];

  return (
    <View style={styles.panel}>
      <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('cuenta.title')}</Text>
      <View style={[styles.credits, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={[styles.marca, { backgroundColor: theme.colors.glow }]}>
          <MarcaDeCredits size={FONT_SIZE.base} color={theme.colors.text} />
        </View>
        <View style={styles.saldo}>
          <Text style={[styles.numero, { color: theme.colors.text }]}>{balance === null ? '…' : formato.numero(balance)}</Text>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('cuenta.creditsNote')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Wallet')}
          style={[styles.boton, { borderColor: theme.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={t('cuenta.history')}
        >
          <Text style={[styles.botonTexto, { color: theme.colors.text }]}>{t('cuenta.history')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreditStore')}
          style={[styles.boton, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel={t('cuenta.buy')}
        >
          <Text style={[styles.botonTexto, { color: '#1F2937' }]}>{t('cuenta.buy')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.atajos}>
        {atajos.map((a) => (
          <TouchableOpacity
            key={a.id}
            onPress={a.ir}
            style={[styles.atajo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as object)]}
            accessibilityRole="button"
            accessibilityLabel={t(a.clave)}
          >
            <Ionicons name={a.icono as any} size={scale(18)} color={a.id === 'creator' ? theme.colors.accent : theme.colors.text} />
            <Text style={[styles.atajoTexto, { color: theme.colors.text }]} numberOfLines={1}>{t(a.clave)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { gap: SPACING.md, marginTop: SPACING.lg },
  titulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  credits: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, flexWrap: 'wrap' },
  marca: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  saldo: { flex: 1, minWidth: scale(120) },
  numero: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, fontVariant: ['tabular-nums'] },
  nota: { fontSize: FONT_SIZE.xs },
  boton: { minHeight: 36, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full, borderWidth: 1, justifyContent: 'center' },
  botonTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  atajo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 40, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  atajoTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
});

export default PanelDeCuenta;
