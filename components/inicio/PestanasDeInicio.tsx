import React from 'react';
import { Platform, ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconoWee } from '../icons/IconoWee';
import { NombreDeIcono } from '../icons/trazosDeWee';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * LA NAVEGACIÓN SECUNDARIA DEL HOME: Ẅall · Weëls · Explorar · Comunidades.
 *
 * Cuatro ATAJOS a pantallas que ya existen, no cuatro páginas dentro del Home.
 * «Ẅall» es donde estás —la portada—; las otras tres abren la pantalla de
 * siempre: el feed de Weëls, la búsqueda (que aquí se llama Explorar) y el
 * explorador de comunidades. Por eso para un lector de pantalla no son pestañas
 * (no cambian un panel): son botones de navegación, y el puesto se anuncia como
 * la sección actual.
 *
 * No es la antigua píldora Ẅall ↔ Weëls: aquella partía el Home en dos páginas
 * con gesto de lado. Esto no cambia de página ni mueve el muro: navega.
 *
 * Ẅall y Weëls son marca y se escriben igual en todos los idiomas; aun así
 * salen de su clave, como todo lo que se pinta.
 */
export type AtajoDeInicio = 'wall' | 'weels' | 'explore' | 'communities';

/** El catálogo guarda claves, no frases. */
export const ATAJOS_DE_INICIO: { id: AtajoDeInicio; clave: string; icono: NombreDeIcono }[] = [
  { id: 'wall', clave: 'home.tabWall', icono: 'capas' },
  { id: 'weels', clave: 'menu.weels', icono: 'weels' },
  { id: 'explore', clave: 'menu.explore', icono: 'brujula' },
  { id: 'communities', clave: 'menu.communities', icono: 'comunidades' },
];

interface Props {
  /** El que está puesto. En el Home, siempre `wall`. */
  puesto?: AtajoDeInicio;
  onSelect: (id: AtajoDeInicio) => void;
}

const PestanasDeInicio: React.FC<Props> = ({ puesto = 'wall', onSelect }) => {
  const { theme } = useTheme();
  const t = useT();
  const dir = useDireccion();
  return (
    <View
      style={[styles.banda, dir.contenedor, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background }]}
      /* `navigation` es un rol de la web; Android no lo conoce y falla al crear la vista. Mismo patrón que BarraInferior. */
      accessibilityRole={Platform.OS === 'web' ? ('navigation' as never) : undefined}
      accessibilityLabel={t('home.sectionsNav')}
    >
      {/* Se desliza de lado por dentro si no caben —un teléfono de 320, un idioma de palabras largas—; el Home no se mueve. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
        {ATAJOS_DE_INICIO.map((p) => {
          const activo = p.id === puesto;
          const color = activo ? theme.colors.interaction : theme.colors.textSecondary;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => onSelect(p.id)}
              style={styles.atajo}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              aria-current={activo ? 'page' : undefined}
              accessibilityLabel={activo ? `${t(p.clave)}, ${t('nav.current')}` : t(p.clave)}
            >
              <IconoWee name={p.icono} size={scale(18)} color={color} />
              <Text style={[styles.texto, dir.texto, { color, fontWeight: activo ? FONT_WEIGHT.semibold : FONT_WEIGHT.medium }]} numberOfLines={1}>
                {t(p.clave)}
              </Text>
              {/* La raya del puesto: el acento de interacción, no el dorado. Simétrica, así que vale igual en RTL. */}
              <View style={[styles.raya, { backgroundColor: activo ? theme.colors.interaction : 'transparent' }]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  banda: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fila: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  atajo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    minHeight: 44,
    paddingHorizontal: SPACING.sm,
  },
  texto: {
    fontSize: FONT_SIZE.sm,
  },
  raya: {
    position: 'absolute',
    start: SPACING.xs,
    end: SPACING.xs,
    bottom: 0,
    height: scale(2),
    borderRadius: scale(1),
  },
});

export default PestanasDeInicio;
