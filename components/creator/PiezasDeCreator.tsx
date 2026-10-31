import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TextStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';

const isWeb = Platform.OS === 'web';

/**
 * LO QUE COMPARTEN LAS SECCIONES DE WEË AI DENTRO DE WEË VERSIÓN CREATOR.
 *
 * Una sola medida y una sola tarjeta para todas: el mismo ancho, el mismo aire,
 * hairline y radio 14, como `ProInicioScreen`. Nada de esto se pinta fuera de
 * creator: quien lo usa lo hace dentro de su rama `useEnEspacioProfesional()`, y
 * la versión app sigue con sus piezas de siempre.
 *
 * No cambia qué se puede hacer: cada puerta llama a lo mismo que su tarjeta de
 * la versión app.
 */

/** El ancho del trabajo: se lee de un vistazo y una línea de texto no cruza la pantalla. */
export const ANCHO_DE_CREATOR = 960;
export const RADIO_DE_CREATOR = 14;

/** El aire de los lados. Es el de la página de cada sección, y solo uno. */
export const useAireDeCreator = (): number => useResponsive().width < 768 ? 16 : 32;

/** Lo que de verdad queda para el contenido, sin la barra de navegación ni el aire. */
const useAnchoUtil = (): number => {
  const { width, isDesktop, isTablet } = useResponsive();
  const barra = isDesktop ? 232 : isTablet ? 64 : 0;
  return Math.min(ANCHO_DE_CREATOR, width - barra - 2 * (width < 768 ? 16 : 32));
};

/** La columna de una sección: centrada, con su aire y el mismo ritmo en todas. */
export const useColumnaDeCreator = (): ViewStyle => {
  const aire = useAireDeCreator();
  return { width: '100%', maxWidth: ANCHO_DE_CREATOR + 2 * aire, alignSelf: 'center', paddingHorizontal: aire, paddingTop: 20, gap: 24 };
};

export interface PuertaDeCreator {
  id: string;
  icono: string;
  titulo: string;
  pista?: string;
  onPress: () => void;
}

/**
 * LAS PUERTAS DE UNA SECCIÓN, EN REJILLA.
 *
 * Una columna en el teléfono, dos en cuanto hay sitio y tres o cuatro en
 * escritorio: cuatro si la lista se reparte exacta, para no dejar huérfanas.
 * El texto se lee entero: ni se corta ni se encoge.
 */
export const RejillaDeCreator: React.FC<{ puertas: readonly PuertaDeCreator[] }> = ({ puertas }) => {
  const { theme } = useTheme();
  const util = useAnchoUtil();
  const columnas = util < 480 ? 1 : util < 780 ? 2 : puertas.length % 4 === 0 ? 4 : 3;
  return (
    <View style={styles.rejilla}>
      {puertas.map((p) => (
        <View key={p.id} style={{ width: `${100 / columnas}%` as any, padding: 5 }}>
          <Pressable
            onPress={p.onPress}
            accessibilityRole="button"
            accessibilityLabel={p.titulo}
            style={(e: any) => [
              styles.puerta,
              { backgroundColor: e.hovered ? theme.colors.surface : theme.colors.card, borderColor: theme.colors.border },
              isWeb && ({ cursor: 'pointer' } as ViewStyle),
            ] as any}
          >
            <View style={[styles.icono, { backgroundColor: theme.colors.glow }]}>
              <Ionicons name={p.icono as any} size={18} color={theme.colors.accentDark} />
            </View>
            <View style={styles.textos}>
              <Text style={[styles.titulo, { color: theme.colors.text }]}>{p.titulo}</Text>
              {!!p.pista && <Text style={[styles.pista, { color: theme.colors.textSecondary }]}>{p.pista}</Text>}
            </View>
          </Pressable>
        </View>
      ))}
    </View>
  );
};

/** El rótulo de un bloque, con su enlace si lo lleva. */
export const TituloDeCreator: React.FC<{ titulo: string; accion?: string; onAccion?: () => void }> = ({ titulo, accion, onAccion }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.tituloFila}>
      <Text accessibilityRole="header" style={[styles.bloque, { color: theme.colors.text }]}>{titulo}</Text>
      {!!accion && (
        <Pressable onPress={onAccion} accessibilityRole="button" hitSlop={8} style={isWeb ? ({ cursor: 'pointer' } as ViewStyle) : undefined}>
          <Text style={[styles.enlace, { color: theme.colors.textSecondary }]}>{accion}</Text>
        </Pressable>
      )}
    </View>
  );
};

/** Una píldora baja: los atajos que no merecen tarjeta. */
export const PildoraDeCreator: React.FC<{ texto: string; icono?: string; onPress: () => void; estilo?: TextStyle }> = ({ texto, icono, onPress }) => {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={(e: any) => [
        styles.pildora,
        { backgroundColor: e.hovered ? theme.colors.surface : theme.colors.card, borderColor: theme.colors.border },
        isWeb && ({ cursor: 'pointer' } as ViewStyle),
      ] as any}
    >
      {!!icono && <Ionicons name={icono as any} size={14} color={theme.colors.textSecondary} />}
      <Text style={[styles.pildoraTexto, { color: theme.colors.text }]}>{texto}</Text>
    </Pressable>
  );
};

/**
 * LO HECHO, DE VERDAD.
 *
 * Las filas de muestra de la versión app enseñan creaciones de nadie; aquí no hay
 * ninguna: esto lleva a la rejilla con el material real de la cuenta, y sin
 * sesión, a iniciarla.
 */
export const EnlaceDeCreaciones: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const titulo = t('studio.creationsTitle');
  return (
    <Pressable
      onPress={() => navigation.navigate(user ? 'MisCreaciones' : 'Login')}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      style={(e: any) => [
        styles.enlaceFila,
        { backgroundColor: e.hovered ? theme.colors.surface : theme.colors.card, borderColor: theme.colors.border },
        isWeb && ({ cursor: 'pointer' } as ViewStyle),
      ] as any}
    >
      <Ionicons name="images-outline" size={18} color={theme.colors.textSecondary} />
      <Text style={[styles.titulo, styles.enlaceTexto, { color: theme.colors.text }]}>{titulo}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
    </Pressable>
  );
};

/** Las fichas y las píldoras envuelven: nada se queda fuera de la vista. */
export const estilosDeCreator = StyleSheet.create({
  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bloque: { gap: 10 },
});

const styles = StyleSheet.create({
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', margin: -5 },
  puerta: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14,
    borderRadius: RADIO_DE_CREATOR, borderWidth: StyleSheet.hairlineWidth,
  },
  icono: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  pista: { fontSize: 12.5, lineHeight: 17 },
  tituloFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  bloque: { flexShrink: 1, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  enlace: { fontSize: 13 },
  pildora: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: StyleSheet.hairlineWidth,
  },
  pildoraTexto: { fontSize: 13, fontWeight: '500', lineHeight: 18, flexShrink: 1 },
  enlaceFila: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14,
    borderRadius: RADIO_DE_CREATOR, borderWidth: StyleSheet.hairlineWidth,
  },
  enlaceTexto: { flex: 1 },
});
