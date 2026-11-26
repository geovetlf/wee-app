/*
 * BIENVENIDA PARA QUIEN LLEGA SIN CUENTA — solo para la PRUEBA del Home con más impacto
 * (`screens/HomeImpactoScreen.tsx`, propuesta del 2026-11-24, idea 4); el Home de verdad no la monta.
 *
 * Cuenta Weë en una línea: «Be free to express» (home.guestTitle, decisión del dueño 2026-11-26). La ilustración se dibuja con vistas (un círculo = la persona y
 * dos cuadrados = sus alter egos, solapados), sin texto incrustado: vale para los 42 idiomas y no cuesta nada.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { MARCA } from '../../constants/marca';

const Caras: React.FC = () => {
  const { theme } = useTheme();
  return (
    <View style={s.caras} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[s.cuadro, { left: 54, top: 6, backgroundColor: '#1F2937', transform: [{ rotate: '8deg' }] }]}>
        <Ionicons name="sparkles" size={20} color={MARCA.primarioClaro} />
      </View>
      <LinearGradient colors={MARCA.degradado.colores} locations={MARCA.degradado.posiciones} start={MARCA.degradado.inicio} end={MARCA.degradado.fin} style={[s.cuadro, { left: 30, top: 30, transform: [{ rotate: '-6deg' }] }]}>
        <Ionicons name="color-palette" size={20} color={MARCA.sobrePrimario} />
      </LinearGradient>
      <View style={[s.circulo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.background }]}>
        <Ionicons name="person" size={28} color={theme.colors.textSecondary} />
      </View>
    </View>
  );
};

const BienvenidaDeInvitado: React.FC<{ onCrearCuenta: () => void; onExplorar: () => void }> = ({ onCrearCuenta, onExplorar }) => {
  const { theme } = useTheme();
  const t = useT();
  const web = Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null;
  return (
    <View style={[s.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={s.arriba}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[s.titulo, { color: theme.colors.text }]}>{t('home.guestTitle')}</Text>
          <Text style={[s.texto, { color: theme.colors.textSecondary }]}>{t('home.guestHint')}</Text>
        </View>
        <Caras />
      </View>
      <View style={s.botones}>
        <Pressable onPress={onCrearCuenta} accessibilityRole="button" style={(e: any) => [s.boton, e.pressed && { opacity: 0.85 }, web] as any}>
          <LinearGradient colors={MARCA.degradado.colores} locations={MARCA.degradado.posiciones} start={MARCA.degradado.inicio} end={MARCA.degradado.fin} style={StyleSheet.absoluteFill} />
          <Text style={[s.botonTexto, { color: MARCA.sobrePrimario }]}>{t('auth.createAccountButton')}</Text>
        </Pressable>
        <Pressable onPress={onExplorar} accessibilityRole="button" style={(e: any) => [s.boton, { borderWidth: 1, borderColor: theme.colors.border }, e.pressed && { opacity: 0.85 }, web] as any}>
          <Text style={[s.botonTexto, { color: theme.colors.text }]}>{t('menu.explore')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  tarjeta: { marginHorizontal: 16, marginTop: 12, padding: 18, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, gap: 16 },
  arriba: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titulo: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, lineHeight: 27 },
  texto: { fontSize: 14, lineHeight: 20 },
  caras: { width: 104, height: 88 },
  cuadro: { position: 'absolute', width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  circulo: { position: 'absolute', left: 0, top: 30, width: 54, height: 54, borderRadius: 27, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  botones: { flexDirection: 'row', gap: 10 },
  boton: { flex: 1, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 12 },
  botonTexto: { fontSize: 15, fontWeight: '700' },
});

export default BienvenidaDeInvitado;
