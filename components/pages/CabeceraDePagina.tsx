import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { tipoDePagina } from '../../constants/pageTypes';
import type { BorradorDePagina } from '../../services/pagesService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/*
 * La cabecera de una Página: portada, logo, nombre, @usuario, tipo, descripción y web. La misma pieza en la vista previa
 * del composer y en la página publicada, para que lo que se ve antes de publicar sea exactamente lo que se publica.
 * `acciones` son los botones de la página publicada (Seguir, Compartir); en la vista previa no van.
 */
const CabeceraDePagina: React.FC<{ pagina: BorradorDePagina & { followersCount: number }; acciones?: React.ReactNode }> = ({ pagina, acciones }) => {
  const { theme } = useTheme();
  const t = useT();
  const tipo = tipoDePagina(pagina.type);
  return (
    <View>
      <View style={[s.portada, { backgroundColor: theme.colors.surface }]}>
        {!!pagina.coverURL && <Image source={{ uri: pagina.coverURL }} style={StyleSheet.absoluteFill} contentFit="cover" />}
      </View>
      <View style={s.cuerpo}>
        <View style={[s.logo, { borderColor: theme.colors.background, backgroundColor: theme.colors.surface }]}>
          {pagina.logoURL ? <Image source={{ uri: pagina.logoURL }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name={tipo.icono as any} size={scale(30)} color={theme.colors.text} />}
        </View>
        <Text style={[s.nombre, { color: theme.colors.text }]}>{pagina.name}</Text>
        <Text style={[s.meta, { color: theme.colors.textSecondary }]}>
          {[`@${pagina.handle}`, t(tipo.claveTitulo), t('pages.followers', { contador: pagina.followersCount })].join(' · ')}
        </Text>
        {!!pagina.shortDescription && <Text style={[s.descripcion, { color: theme.colors.text }]}>{pagina.shortDescription}</Text>}
        {!!pagina.website && (
          <TouchableOpacity onPress={() => void Linking.openURL(pagina.website)} accessibilityRole="link" style={s.web}>
            <Ionicons name="link-outline" size={scale(16)} color={theme.colors.text} />
            <Text style={[s.webTexto, { color: theme.colors.text }]} numberOfLines={1}>{pagina.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</Text>
          </TouchableOpacity>
        )}
        {acciones}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  portada: { height: scale(150), overflow: 'hidden' },
  cuerpo: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: 4 },
  logo: { width: scale(84), height: scale(84), borderRadius: scale(42), borderWidth: 3, marginTop: -scale(42), overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  nombre: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  meta: { fontSize: FONT_SIZE.sm },
  descripcion: { fontSize: FONT_SIZE.base, lineHeight: scale(21), marginTop: SPACING.xs },
  web: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.xs, alignSelf: 'flex-start', paddingVertical: 2, borderRadius: BORDER_RADIUS.sm },
  webTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, textDecorationLine: 'underline' },
});

export default CabeceraDePagina;
