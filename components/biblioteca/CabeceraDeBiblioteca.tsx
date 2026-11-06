import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import IconoDireccional from '../IconoDireccional';
import CreditsPill from '../CreditsPill';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { useResponsive } from '../../hooks/useResponsive';
import { PALETA_BIBLIOTECA as P } from './paleta';
import { FONT_WEIGHT } from '../../constants/design';

/**
 * LA CABECERA DE LA BIBLIOTECA — «Mis creaciones», «Mis proyectos» y un proyecto (versión App).
 *
 * Volver, la píldora «✦ Weë AI», el título grande y el saldo. En el teléfono es
 * la que dibuja los Credits en estas tres pantallas: el marco (`CreatorShell`)
 * se monta `sinFranjaSuperior`, así que no hay dos saldos. En escritorio la
 * vuelta es la miga de pan del marco y el saldo lo enseña la barra lateral de
 * Weë AI, y aquí no se repiten. La marca «Weë AI» no se traduce.
 */
/* ── La cabecera: volver, «✦ Weë AI», el título y el saldo ───────────────── */

export const CabeceraDeBiblioteca: React.FC<{ titulo: string; onBack?: () => void }> = ({ titulo, onBack }) => {
  const t = useT();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const { isDesktop } = useResponsive();
  const volver = onBack || (() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')));

  return (
    <View style={styles.cabecera}>
      {/* Una onda lavanda en la esquina del final: decoración suave, redonda y sin bordes duros; no recibe toques. */}
      <View pointerEvents="none" style={[styles.onda, dir.alFinal(-6)]}>
        <LinearGradient
          colors={['rgba(229, 210, 255, 0.55)', 'rgba(238, 223, 255, 0)']}
          start={{ x: dir.esRTL ? 0.15 : 0.85, y: 0.1 }}
          end={{ x: dir.esRTL ? 0.75 : 0.25, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {/* En escritorio el marco ya trae la vuelta (miga de pan) y la barra lateral el saldo. */}
      {!isDesktop && (
        <TouchableOpacity onPress={volver} style={styles.volver} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <IconoDireccional name="chevron-back" size={26} color={P.texto} />
        </TouchableOpacity>
      )}
      <View style={styles.titulos}>
        <View style={styles.pildora}>
          <Ionicons name="sparkles-outline" size={13} color={P.morado} />
          <Text style={styles.pildoraTexto}>Weë AI</Text>
        </View>
        <Text style={[styles.titulo, isDesktop && styles.tituloAncho, dir.texto]} numberOfLines={2} accessibilityRole="header">
          {titulo}
        </Text>
      </View>
      {!isDesktop && <CreditsPill compact />}
    </View>
  );
};

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  onda: {
    position: 'absolute',
    top: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    overflow: 'hidden',
  },
  volver: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: -10,
  },
  titulos: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 6,
  },
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: P.lavanda,
  },
  pildoraTexto: {
    color: P.morado,
    fontSize: 12,
    fontWeight: FONT_WEIGHT.bold,
  },
  titulo: {
    color: P.texto,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.6,
  },
  tituloAncho: {
    fontSize: 32,
    lineHeight: 38,
  },
});

export default CabeceraDeBiblioteca;
