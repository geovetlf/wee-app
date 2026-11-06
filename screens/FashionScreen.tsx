import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import CreatorShell from '../components/creator/CreatorShell';
import CabeceraDeSeccion from '../components/creator/CabeceraDeSeccion';
import TarjetaDeModo from '../components/fashion/TarjetaDeModo';
import FashionComposer from '../components/fashion/FashionComposer';
import GaleriaDeFashion from '../components/fashion/GaleriaDeFashion';
import CajaDePrompt from '../components/creator/CajaDePrompt';
import { CuerpoDeFashion, HeroDeFashion } from '../components/sectores/PortadaFashion';
import { useEnEspacioProfesional } from '../contexts/EspacioProfesionalContext';
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
 * `getExperienceById`.
 *
 * Los textos son claves de i18n; «Weë Fashion» es marca y se escribe igual en todos los idiomas. La galería de looks llega por de
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
  const [texto, setTexto] = useState('');
  const m = (id: string) => modoDeFashion(id) ?? FASHION_MODOS[0];
  const pro = useEnEspacioProfesional();
  /* «Ver todo»: la lista completa de modos, la entrada de siempre. */
  const [verTodo, setVerTodo] = useState(false);

  return (
    <CreatorShell activeId="business" title="Weë Fashion" breadcrumb="Weë AI" sinFranjaSuperior>
      {modo || pro || verTodo ? <CabeceraDeSeccion nombre="Fashion" lema={t('fashion.tagline')} descripcion={t('fashion.intro')} onVolver={!modo && verTodo && !pro ? () => setVerTodo(false) : undefined} /> : null}

      {modo ? (
        <FashionComposer key={modo.id} modo={modo} onVolver={volver} inicial={{ texto: route.params?.goal, imageUri: route.params?.imageUri }} />
      ) : !pro && !verTodo ? (
        /* La portada de la demo YC (docs/MIGRACION-UI-DEMO-YC.md, lote 3): cada pieza abre un modo real del composer. */
        <>
          <CabeceraDeSeccion soloIdentidad nombre="Fashion" lema={t('fashion.tagline')} />
          <View style={styles.portada}>
            <HeroDeFashion onAbrir={abrir} onVerTodo={() => setVerTodo(true)} />
          </View>
          <View style={styles.caja}>
            <CajaDePrompt
              vitrina
              valor={texto}
              onCambiar={setTexto}
              onEnviar={() => setModo(m('completeLook'))}
              etiquetaEnviar={t('fashion.ctaLook')}
              placeholder={t('studio.placeholder')}
              acciones={[
                { icono: 'add', etiqueta: t('fashion.ctaLook'), alPulsar: () => abrir(m('completeLook')) },
                { icono: 'image-outline', etiqueta: t('fashion.ctaTryOn'), alPulsar: () => abrir(m('tryOn')) },
                { icono: 'shirt-outline', etiqueta: t('fashion.galClothes'), alPulsar: () => abrir(m('designGarments')) },
                { icono: 'cut-outline', etiqueta: t('fashion.galHair'), alPulsar: () => abrir(m('beautyHair')) },
                { icono: 'color-palette-outline', etiqueta: t('fashion.galMakeup'), alPulsar: () => abrir(m('beautyHair')) },
                { icono: 'brush-outline', etiqueta: t('fashion.galNails'), alPulsar: () => abrir(m('beautyHair')) },
                { icono: 'options-outline', etiqueta: t('fashion.toolsTitle'), alPulsar: () => abrir(m('fashionContent')) },
              ]}
            />
          </View>
          <View style={styles.cuerpo}>
            <CuerpoDeFashion onAbrir={abrir} onVerTodo={() => setVerTodo(true)} />
          </View>
        </>
      ) : (
        <View style={styles.pila}>
          <GaleriaDeFashion onAbrir={abrir} />

          <View style={styles.accesos}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => abrir(FASHION_MODOS[2])}
              style={[styles.boton, styles.principal, { backgroundColor: '#0A0A0A' }]}
            >
              <Ionicons name="sparkles-outline" size={scale(18)} color="#FFFFFF" />
              <Text style={[styles.botonTexto, { color: '#FFFFFF' }]}>{t('fashion.ctaLook')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => abrir(FASHION_MODOS[0])}
              style={[styles.boton, { borderColor: theme.colors.text, backgroundColor: theme.colors.background }]}
            >
              <Ionicons name="shirt-outline" size={scale(18)} color={theme.colors.text} />
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
  portada: { marginBottom: -scale(30), marginHorizontal: -SPACING.lg },
  caja: { marginBottom: SPACING.xl },
  cuerpo: { gap: SPACING.xxl, marginHorizontal: -SPACING.lg, paddingBottom: SPACING.xxxl },
  pila: { gap: SPACING.lg, paddingBottom: SPACING.xxxl },
  accesos: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: 'transparent', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.xl, minHeight: scale(48), flexGrow: 1 },
  principal: {},
  botonTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  tarjetas: { gap: SPACING.md },
});

export default FashionScreen;
