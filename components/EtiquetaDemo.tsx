import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useT } from '../contexts/IdiomaContext';
import { esContenidoDemo, PosibleContenidoDemo } from '../utils/contenidoDemo';

/*
 * «Demo», junto al nombre de quien publica, cuando la publicación o su autor son del modo demo (docs/WEE-DEMO.md).
 *
 * Va DENTRO del <Text> del nombre, así que no cambia la maqueta de la tarjeta: es la misma línea con una palabra más.
 * Fuera del modo demo no pinta nada.
 */
export default function EtiquetaDemo({ de, color }: { de: (PosibleContenidoDemo | null | undefined)[]; color: string }) {
  const t = useT();
  if (!de.some((d) => esContenidoDemo(d))) return null;
  return (
    <Text style={[styles.etiqueta, { color }]} accessibilityLabel={t('wall.demoBadgeLabel')}>
      {'  '}
      {t('wall.demoBadge')}
    </Text>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    fontSize: 12,
    fontWeight: '700',
  },
});
