import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { AreaDeStudio, AJUSTES_POR_AREA, AjusteDeStudio } from '../../constants/studioTools';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  visible: boolean;
  /** De qué se están ajustando las cosas. Decide QUÉ se pregunta. */
  area: AreaDeStudio;
  elegido: Record<string, string>;
  onElegir: (ajuste: string, opcion: string) => void;
  onCerrar: () => void;
  /**
   * Las preguntas, cuando no son las de un área del Studio. Weë Design trae las
   * suyas —estilo, materiales, iluminación— y así no tiene que disfrazarse de
   * "imágenes" para usar este panel.
   */
  ajustes?: AjusteDeStudio[];
}

/**
 * LOS AJUSTES NO SON PREFERENCIAS: SON DE ESTA CREACIÓN.
 *
 * Por eso no viven en Configuración y no son los mismos siempre. A una imagen
 * se le pregunta formato, calidad y estilo; a un video, cuánto dura y cuánto se
 * mueve; a un texto, cómo de largo y en qué tono. Preguntar las doce cosas a la
 * vez sería un formulario, y un formulario es exactamente lo que Weë no pone
 * delante de alguien que quiere crear algo.
 *
 * Lo que se pregunta sale de `AJUSTES_POR_AREA`, que guarda CLAVES: este panel
 * no sabe qué dicen, solo las resuelve al pintarlas.
 *
 * Sube desde abajo y se cierra tocando fuera. Es una decisión rápida sobre algo
 * que ya estás escribiendo, no una visita a otra pantalla: sacarte del Studio
 * para elegir "vertical u horizontal" te haría perder el hilo.
 */
const PromptSettings: React.FC<Props> = ({ visible, area, elegido, onElegir, onCerrar, ajustes: propios }) => {
  const { theme } = useTheme();
  const t = useT();
  /*
   * La hoja llega hasta el borde de la pantalla, y en Android ahí abajo está la
   * barra del sistema: sin reservar su sitio, "Listo" quedaba medio debajo. Es
   * la misma cuenta que hace la hoja de Crear —`Math.max(insets.bottom, …)`—,
   * para no tener dos maneras distintas de resolver lo mismo.
   */
  const insets = useSafeAreaInsets();
  const ajustes = propios ?? AJUSTES_POR_AREA[area] ?? [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <Pressable style={[styles.telon, { backgroundColor: theme.colors.backdrop }]} onPress={onCerrar}>
        {/* El panel se come el toque: tocar dentro no cierra. */}
        <Pressable
          style={[styles.hoja, { backgroundColor: theme.colors.card, paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}
          onPress={() => {}}
        >
          <View style={[styles.asa, { backgroundColor: theme.colors.border }]} />

          <Text style={[styles.titulo, { color: theme.colors.text }]}>{t('studio.settingsTitle')}</Text>
          <Text style={[styles.pista, { color: theme.colors.textSecondary }]}>{t('studio.settingsHint')}</Text>

          <ScrollView style={styles.lista} contentContainerStyle={styles.listaDentro}>
            {ajustes.map((ajuste) => (
              <View key={ajuste.id} style={styles.grupo}>
                <Text style={[styles.grupoTitulo, { color: theme.colors.textSecondary }]}>{t(ajuste.clave)}</Text>
                <View style={styles.opciones}>
                  {ajuste.opciones.map((opcion) => {
                    /* Sin elección previa manda la primera: siempre hay una puesta. */
                    const puesta = (elegido[ajuste.id] ?? ajuste.opciones[0].id) === opcion.id;
                    return (
                      <TouchableOpacity
                        key={opcion.id}
                        style={[
                          styles.opcion,
                          {
                            backgroundColor: puesta ? theme.colors.glow : theme.colors.surface,
                            borderColor: puesta ? theme.colors.accent : theme.colors.border,
                          },
                        ]}
                        onPress={() => onElegir(ajuste.id, opcion.id)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityState={{ selected: puesta }}
                      >
                        <Text
                          style={[
                            styles.opcionTexto,
                            { color: puesta ? theme.colors.accentDark : theme.colors.text },
                            puesta && styles.opcionTextoPuesta,
                          ]}
                        >
                          {t(opcion.clave)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.listo, { backgroundColor: theme.colors.accent }]}
            onPress={onCerrar}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.listoTexto}>{t('studio.settingsDone')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  telon: { flex: 1, justifyContent: 'flex-end' },
  hoja: {
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    /* El de abajo lo pone la zona segura del sistema, arriba en el componente. */
    maxHeight: '82%',
  },
  asa: {
    width: scale(40),
    height: scale(4),
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  titulo: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  pista: { fontSize: FONT_SIZE.sm, marginTop: SPACING.xs },
  lista: { marginTop: SPACING.lg },
  listaDentro: { gap: SPACING.xl, paddingBottom: SPACING.lg },
  grupo: { gap: SPACING.sm },
  grupoTitulo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
    letterSpacing: scale(0.5),
  },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  opcion: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + scale(2),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  opcionTexto: { fontSize: FONT_SIZE.sm },
  opcionTextoPuesta: { fontWeight: FONT_WEIGHT.semibold },
  listo: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
  },
  listoTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: '#1F2937' },
});

export default PromptSettings;
