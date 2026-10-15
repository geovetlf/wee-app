import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import CreatorShell from '../components/creator/CreatorShell';
import CabeceraDeSeccion from '../components/creator/CabeceraDeSeccion';
import IconoWee from '../components/icons/IconoWee';
import TarjetaDeModo from '../components/fashion/TarjetaDeModo';
import FashionComposer from '../components/fashion/FashionComposer';
import { FASHION_MODOS, FashionModo, modoDeFashion } from '../constants/fashionModes';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * WEË FASHION — la sección número seis de Weë AI (sustituye a Weë Business).
 *
 * Dos vistas en la misma pantalla, sin ruta nueva: la ENTRADA (cabecera, dos accesos y las seis experiencias) y el
 * COMPOSER del modo elegido. Se entra por el menú ☰, por el portal de Weë AI, por Brain, y desde las puertas «Beauty»
 * y «Fashion» de Weë Studio (que conservan su lugar para descubrir, pero abren aquí, en el modo que toca).
 *
 * Parámetros de la ruta (`Specialist { id: 'fashion' }`): `modo` (un `FashionModoId`), `goal` (lo que la persona ya
 * había escrito) e `imageUri` (la foto con la que venía). Un id antiguo `business` llega aquí por el alias de
 * `getExperienceById`; el directorio de negocios (WeeBiz) no pasa por esta pantalla.
 *
 * Los textos son claves de i18n; «Weë Fashion» es marca y se escribe igual en todos los idiomas. Sin fotografía de
 * moda en los recursos de la app, la portada lleva un bloque con el vestido dibujado de Weë (placeholder elegante,
 * sin imágenes remotas ni dependencias nuevas).
 */
const FashionScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const route = useRoute<any>();
  const [modo, setModo] = useState<FashionModo | undefined>(modoDeFashion(route.params?.modo));

  /* Si llega otro modo con la pantalla ya abierta (otra puerta de Studio), se cambia a él. */
  useEffect(() => {
    if (route.params?.modo) setModo(modoDeFashion(route.params.modo));
  }, [route.params?.modo]);

  const volver = useCallback(() => setModo(undefined), []);
  const abrir = useCallback((m: FashionModo) => setModo(m), []);

  return (
    <CreatorShell activeId="fashion" overline="🤖 Weë AI" title="👗 Weë Fashion" breadcrumb="Weë AI" sinFranjaSuperior>
      <CabeceraDeSeccion nombre="Fashion" lema={t('fashion.tagline')} descripcion={t('fashion.intro')} />

      {modo ? (
        <FashionComposer key={modo.id} modo={modo} onVolver={volver} inicial={{ texto: route.params?.goal, imageUri: route.params?.imageUri }} />
      ) : (
        <View style={styles.pila}>
          <View style={[styles.portada, { backgroundColor: theme.colors.accent + '1F', borderColor: theme.colors.accent + '55' }]}>
            <IconoWee name="vestido" size={scale(72)} color={theme.colors.accentDark} />
          </View>

          <View style={styles.accesos}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => abrir(FASHION_MODOS[2])}
              style={[styles.boton, styles.principal, { backgroundColor: theme.colors.accent }]}
            >
              <Ionicons name="sparkles-outline" size={scale(18)} color="#1F2937" />
              <Text style={[styles.botonTexto, { color: '#1F2937' }]}>{t('fashion.ctaLook')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => abrir(FASHION_MODOS[0])}
              style={[styles.boton, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            >
              <Ionicons name="shirt-outline" size={scale(18)} color={theme.colors.accentDark} />
              <Text style={[styles.botonTexto, { color: theme.colors.text }]}>{t('fashion.ctaTryOn')}</Text>
            </TouchableOpacity>
          </View>

          <Text accessibilityRole="header" style={[styles.titulo, { color: theme.colors.text }]}>{t('fashion.chooseTitle')}</Text>
          <View style={styles.tarjetas}>
            {FASHION_MODOS.map((m) => <TarjetaDeModo key={m.id} modo={m} onAbrir={abrir} />)}
          </View>
        </View>
      )}
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  pila: { gap: SPACING.lg, paddingBottom: SPACING.xxxl },
  portada: { height: scale(150), borderRadius: BORDER_RADIUS.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  accesos: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: 'transparent', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.xl, minHeight: scale(48), flexGrow: 1 },
  principal: {},
  botonTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  tarjetas: { gap: SPACING.md },
});

export default FashionScreen;
