import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { EntradaDelMarco, HERRAMIENTAS_DEL_STUDIO, SECCIONES_DEL_STUDIO } from '../../constants/studioWorkspace';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/** El nombre de una entrada, por su clave. */
export const nombreDeEntrada = (e: EntradaDelMarco, t: (clave: string) => string): string => t(e.clave);

/**
 * LA BARRA LATERAL DE WEË STUDIO.
 *
 * Arriba lo que es de todo el Studio —Inicio, Inspira, Proyectos, Creaciones—, y
 * debajo sus herramientas: Filmmaker, Vídeo y sus puertas de siempre (Imágenes,
 * Texto, Voz). Abajo del todo, la salida: volver a Weë, donde están la
 * comunidad, el muro y los Weëls. Nada de otros módulos de Weë AI.
 *
 * `compacta` es la de tableta: solo iconos, con su nombre para quien no ve. En el
 * teléfono no hay barra lateral: el Studio va en sus cuatro pestañas.
 */
const BarraLateralDeStudio: React.FC<{
  encendida: string;
  onAbrir: (entrada: EntradaDelMarco) => void;
  onVolverAWee: () => void;
  forma?: 'completa' | 'compacta' | 'lista';
}> = ({ encendida, onAbrir, onVolverAWee, forma = 'completa' }) => {
  const { theme } = useTheme();
  const t = useT();
  const compacta = forma === 'compacta';

  const fila = (e: EntradaDelMarco) => {
    const activa = e.id === encendida;
    const nombre = nombreDeEntrada(e, t);
    return (
      <TouchableOpacity
        key={e.id}
        onPress={() => onAbrir(e)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={nombre}
        accessibilityState={{ selected: activa }}
        style={[
          styles.fila,
          compacta && styles.filaCompacta,
          activa && { backgroundColor: theme.colors.glow },
          isWeb && ({ cursor: 'pointer' } as object),
        ]}
      >
        {activa && <View style={[styles.marca, { backgroundColor: theme.colors.accent }]} />}
        <Ionicons name={e.icono as any} size={scale(compacta ? 21 : 18)} color={activa ? theme.colors.accent : theme.colors.textSecondary} />
        {!compacta && (
          <Text style={[styles.nombre, { color: activa ? theme.colors.text : theme.colors.textSecondary }, activa && styles.nombreActivo]} numberOfLines={1}>
            {nombre}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  /* En iconos no cabe el nombre del grupo: una raya separa lo mismo. */
  const titulo = (texto: string) => {
    if (compacta) return <View style={[styles.separador, { backgroundColor: theme.colors.border }]} />;
    return <Text style={[styles.grupo, { color: theme.colors.textSecondary }]}>{texto}</Text>;
  };

  const contenido = (
    <>
      <View style={styles.bloque}>{SECCIONES_DEL_STUDIO.map(fila)}</View>
      {titulo(t('workspace.navTools'))}
      <View style={styles.bloque}>{HERRAMIENTAS_DEL_STUDIO.map(fila)}</View>
    </>
  );

  const salida = (
    <TouchableOpacity
      onPress={onVolverAWee}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={t('workspace.backToWee')}
      style={[styles.fila, styles.salida, compacta && styles.filaCompacta, { borderColor: theme.colors.border }]}
    >
      <Ionicons name="arrow-back-circle-outline" size={scale(compacta ? 21 : 18)} color={theme.colors.textSecondary} />
      {!compacta && <Text style={[styles.nombre, { color: theme.colors.textSecondary }]}>{t('workspace.backToWee')}</Text>}
    </TouchableOpacity>
  );

  if (forma === 'lista') {
    return (
      <View style={styles.lista}>
        {contenido}
        {salida}
      </View>
    );
  }

  return (
    <View
      style={[styles.barra, compacta && styles.barraCompacta, { backgroundColor: theme.colors.background, borderRightColor: theme.colors.border }]}
      accessibilityRole={isWeb ? ('navigation' as never) : undefined}
      accessibilityLabel={t('workspace.navLabel')}
    >
      <ScrollView contentContainerStyle={styles.dentro} showsVerticalScrollIndicator={false}>
        {contenido}
      </ScrollView>
      <View style={styles.pie}>{salida}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  barra: { width: scale(224), borderRightWidth: StyleSheet.hairlineWidth },
  barraCompacta: { width: scale(72) },
  dentro: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.md, gap: SPACING.sm },
  lista: { gap: SPACING.sm },
  bloque: { gap: 2 },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 40, paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm, overflow: 'hidden',
  },
  filaCompacta: { justifyContent: 'center', paddingHorizontal: 0, minHeight: 44 },
  marca: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  nombre: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  nombreActivo: { fontWeight: FONT_WEIGHT.semibold as any },
  grupo: {
    fontSize: scale(10), fontWeight: FONT_WEIGHT.bold as any, letterSpacing: 0.8, textTransform: 'uppercase',
    paddingHorizontal: SPACING.md, marginTop: SPACING.sm,
  },
  separador: { height: StyleSheet.hairlineWidth, marginVertical: SPACING.sm, marginHorizontal: SPACING.md },
  pie: { padding: SPACING.sm },
  salida: { borderWidth: StyleSheet.hairlineWidth },
});

export default BarraLateralDeStudio;
