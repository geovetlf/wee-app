import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { ajustesDe, ContextoDeCreacion, GrupoDeAjustes } from '../../constants/ajustesContextuales';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/** Lo que mide una píldora de alto. Va sin `scale()`: un dedo no encoge en web. */
const ALTO_DE_PILDORA = 40;

interface Props {
  visible: boolean;
  /** Qué se está creando, hasta donde se sabe. Decide QUÉ se pregunta. */
  contexto: ContextoDeCreacion;
  /** Lo elegido a mano, por grupo. Manda sobre cualquier sugerencia. */
  elegido: Record<string, string>;
  /**
   * Lo que se deduce de lo escrito —"un video de 10 segundos"— mientras nadie
   * haya tocado ese grupo. Se ve marcado igual, porque es lo que se va a usar.
   */
  sugerido?: Record<string, string>;
  onElegir: (grupo: string, opcion: string) => void;
  onCerrar: () => void;
  /** Cuántas referencias viajan con la creación. */
  referencias?: number;
  /**
   * Un catálogo propio, para la experiencia que traiga sus grupos. Sin él, el
   * común de Weë AI.
   */
  grupos?: GrupoDeAjustes[];
  /**
   * La línea de debajo del título. Por defecto explica que los ajustes cambian
   * con lo que se está creando, que es lo que pasa en Weë Studio; una sección
   * con catálogo propio y una sola lista dice la suya, porque allí no cambian.
   */
  pista?: string;
}

/**
 * LOS AJUSTES DE LA CREACIÓN: LO QUE TOCA PREGUNTAR, Y NADA MÁS.
 *
 * Sube desde abajo y se cierra tocando fuera. Es una decisión rápida sobre algo
 * que ya se está escribiendo, no una visita a otra pantalla: sacar a alguien del
 * Studio para elegir "vertical u horizontal" le haría perder el hilo.
 *
 * ── Qué se pregunta ──────────────────────────────────────────────────────────
 *
 * Lo decide el contexto, no la pantalla (`constants/ajustesContextuales.ts`).
 * Mientras no se sabe qué se quiere crear se preguntan solo las cosas que valen
 * para cualquier cosa; en cuanto hay un video, aparece "Duración".
 *
 * ── Por qué las opciones se deslizan ─────────────────────────────────────────
 *
 * Cada fila es un carrusel, no un párrafo de píldoras. Envueltas, cuatro
 * opciones ocupaban tres líneas en un teléfono de 360 y el panel parecía un
 * formulario; además, encoger la letra para que cupieran habría dejado botones
 * que no se pueden tocar bien. Deslizando, cada opción conserva su tamaño y la
 * que asoma cortada en el borde dice que hay más: nada queda escondido para
 * siempre. El desplazamiento es de la fila —solo de la fila—, así que la
 * pantalla no se mueve de lado.
 *
 * El amarillo marca la elegida, y solo eso: si lo llevaran todas, no marcaría
 * nada.
 */
const AjustesContextuales: React.FC<Props> = ({
  visible, contexto, elegido, sugerido, onElegir, onCerrar, referencias = 0, grupos, pista,
}) => {
  const { theme } = useTheme();
  const t = useT();
  /*
   * La hoja llega al borde de la pantalla y ahí abajo está la barra del sistema:
   * su sitio se reserva con la misma cuenta que la hoja de Crear.
   */
  const insets = useSafeAreaInsets();
  const preguntas = ajustesDe(contexto, grupos);

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
          <Text style={[styles.pista, { color: theme.colors.textSecondary }]}>{pista ?? t('studio.settingsHint')}</Text>

          <ScrollView style={styles.lista} contentContainerStyle={styles.listaDentro} showsVerticalScrollIndicator={false}>
            {preguntas.map((grupo) => (
              <View key={grupo.id} style={styles.grupo}>
                <Text style={[styles.grupoTitulo, { color: theme.colors.textSecondary }]}>{t(grupo.clave)}</Text>

                {grupo.opciones.length === 0 ? (
                  /*
                   * Las referencias se añaden desde la caja, no aquí: esta fila
                   * cuenta cuántas van, que es lo que no se recuerda al crear.
                   */
                  <View style={[styles.aviso, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                    <Ionicons
                      name={referencias > 0 ? 'image' : 'image-outline'}
                      size={scale(15)}
                      color={referencias > 0 ? theme.colors.accentDark : theme.colors.textSecondary}
                    />
                    <Text style={[styles.avisoTexto, { color: theme.colors.textSecondary }]}>
                      {referencias > 0
                        ? t('studio.settingsReferences', { contador: referencias })
                        : t('studio.editorNoReferences')}
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    /*
                     * La fila va de borde a borde de la hoja —por eso los
                     * márgenes negativos— y su contenido empieza alineado con el
                     * título. Así la última opción asoma cortada y se ve que hay
                     * más, en vez de terminar justo en el margen y parecer que
                     * no hay nada detrás.
                     */
                    style={styles.fila}
                    contentContainerStyle={styles.filaDentro}
                  >
                    {grupo.opciones.map((opcion) => {
                      /* Sin elección ni sugerencia manda la primera: siempre hay una puesta. */
                      const puesta =
                        (elegido[grupo.id] ?? sugerido?.[grupo.id] ?? grupo.opciones[0].id) === opcion.id;
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
                          onPress={() => onElegir(grupo.id, opcion.id)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityState={{ selected: puesta }}
                          accessibilityLabel={t('studio.settingsOption', { grupo: t(grupo.clave), opcion: t(opcion.clave) })}
                        >
                          <Text
                            style={[
                              styles.opcionTexto,
                              { color: puesta ? theme.colors.accentDark : theme.colors.text },
                              puesta && styles.opcionTextoPuesta,
                            ]}
                            numberOfLines={1}
                          >
                            {t(opcion.clave)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
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
  fila: {
    marginHorizontal: -SPACING.xl,
  },
  filaDentro: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  opcion: {
    minHeight: ALTO_DE_PILDORA,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  opcionTexto: { fontSize: FONT_SIZE.sm },
  opcionTextoPuesta: { fontWeight: FONT_WEIGHT.semibold },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
    minHeight: ALTO_DE_PILDORA,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avisoTexto: { fontSize: FONT_SIZE.sm },
  listo: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
  },
  listoTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, color: '#1F2937' },
});

export default AjustesContextuales;
