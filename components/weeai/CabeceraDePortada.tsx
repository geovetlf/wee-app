import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import IconoDireccional from '../IconoDireccional';
import CreditsPill from '../CreditsPill';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SPACING } from '../../constants/estiloWeeAi';
import { scale } from '../../utils/scale';

/* El logo de siempre mide 924x300 y el isotipo ocupa su parte izquierda: se enseña SOLO esa parte (recorte, sin redibujar ni recolorear). */
const ALTO_ISOTIPO = 34;
const PROPORCION_DEL_LOGO = 924 / 300;
const PARTE_ISOTIPO = 0.385;

/** El isotipo W oficial de Weë, con sus colores originales. */
export const IsotipoWee: React.FC<{ alto?: number }> = ({ alto = ALTO_ISOTIPO }) => (
  <View style={{ width: alto * PROPORCION_DEL_LOGO * PARTE_ISOTIPO, height: alto, overflow: 'hidden' }} accessible={false}>
    <Image
      source={require('../../assets/images/weelogo-dark.png')}
      style={{ position: 'absolute', top: 0, left: 0, width: alto * PROPORCION_DEL_LOGO, height: alto }}
      contentFit="fill"
      priority="high"
      cachePolicy="memory-disk"
      accessible={false}
    />
  </View>
);

/**
 * LA CABECERA DE LA PORTADA: volver, el isotipo con «WeëAI» al centro y la cápsula del saldo real (`CreditsPill`, sin cifras propias).
 * Solo en el teléfono: en escritorio el marco ya trae su barra y su barra lateral con el saldo.
 */
export const CabeceraDePortada: React.FC = () => {
  const t = useT();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const volver = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'));
  return (
    <View style={[styles.fila, dir.contenedor]}>
      <TouchableOpacity onPress={volver} style={styles.volver} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.back')}>
        <IconoDireccional name="arrow-back" size={scale(26)} color={P.tinta} />
      </TouchableOpacity>
      <View style={styles.centro} pointerEvents="none">
        <View style={[styles.marca, dir.contenedor]}>
          <IsotipoWee />
          {/* La marca no se traduce: el nombre sale de la clave de siempre. */}
          <Text style={[textoPortada(scale(28), '600'), styles.nombre, { color: P.tinta }]} numberOfLines={1} accessibilityRole="header">{t('nav.weeAi')}</Text>
        </View>
      </View>
      <View style={styles.saldo}>
        <CreditsPill compact sobria />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: SPACING.sm, zIndex: 2 },
  volver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  saldo: { minWidth: 44, alignItems: 'flex-end', paddingEnd: SPACING.xs },
  centro: { position: 'absolute', start: 0, end: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nombre: { includeFontPadding: false },
});
