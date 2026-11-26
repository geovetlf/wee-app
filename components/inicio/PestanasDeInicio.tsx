import React from 'react';
import { Platform, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconoWee } from '../icons/IconoWee';
import { NombreDeIcono } from '../icons/trazosDeWee';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { SPACING, FONT_WEIGHT } from '../../constants/design';
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
      style={[styles.banda, dir.contenedor, { backgroundColor: theme.colors.background }]}
      /* `navigation` es un rol de la web; Android no lo conoce y falla al crear la vista. Mismo patrón que BarraInferior. */
      accessibilityRole={Platform.OS === 'web' ? ('navigation' as never) : undefined}
      accessibilityLabel={t('home.sectionsNav')}
    >
      {/*
        FIJA (decisión del dueño, 2026-11-15) y SIMÉTRICA (2026-11-16): cuatro columnas de ancho idéntico, icono ENCIMA de la palabra, mismo tamaño de
        letra en las cuatro (sin ajuste automático que encoja una sola) y SIN línea ni píldora: el puesto se dice solo con tinta (color principal y
        peso 600 frente al gris secundario). Si una palabra no cabe en un idioma, termina en «…», igual en todas.
      */}
      <View style={styles.fila}>
        {ATAJOS_DE_INICIO.map((p) => {
          const activo = p.id === puesto;
          const color = activo ? theme.colors.text : theme.colors.textSecondary;
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
              <IconoWee name={p.icono} size={scale(20)} color={color} />
              <Text style={[styles.texto, dir.texto, { color, fontWeight: activo ? FONT_WEIGHT.semibold : FONT_WEIGHT.medium }]} numberOfLines={1} ellipsizeMode="tail">
                {t(p.clave)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  /* Sin borde inferior: la separación es espacio, no una raya. */
  banda: {
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  fila: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xs,
  },
  /* Cuatro columnas idénticas (flex 1, mismo relleno): icono arriba, palabra debajo, todo centrado y a la misma altura. */
  atajo: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
    minHeight: 52,
    paddingHorizontal: scale(2),
  },
  /* El MISMO tamaño en las cuatro; 11 deja entrar «Comunidades» en 320 sin reducir ninguna. */
  texto: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
});

export default PestanasDeInicio;
