import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import EspacioDeEscritura from '../EspacioDeEscritura';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';

/**
 * Cuánto se espera en Android, desde que el modal se muestra, para pedir el
 * foco: lo que dura su entrada (`config_shortAnimTime`, 200 ms) y un margen.
 */
const ESPERA_DEL_FOCO = 250;

interface Props {
  visible: boolean;
  valor: string;
  onCambiar: (texto: string) => void;
  onCerrar: () => void;
  onAjustes: () => void;
  onReferencia: () => void;
  onCrear: () => void;
  /** Las referencias añadidas, solo para enseñarlas. */
  referencias: string[];
}

/**
 * EL EDITOR, CUANDO LA IDEA YA NO CABE EN UNA CAJA.
 *
 * Aparece a pantalla completa porque a partir de cierto largo lo que se está
 * haciendo ya no es "escribir un prompt": es redactar, y redactar pide ver lo
 * escrito entero, poder subir a corregir un párrafo y pegar sin miedo.
 *
 * Es la MISMA idea, no otra: comparte el texto con el compositor en los dos
 * sentidos, así que se puede empezar abajo, abrirlo, seguir y volver sin perder
 * una coma. Por eso no hay "guardar": no hay nada que guardar, es el mismo
 * texto visto de otra manera.
 *
 * Lo que se puede hacer aquí es lo mismo que abajo —referencias, ajustes,
 * crear— porque salir a buscarlo al Studio rompería la redacción justo cuando
 * se está concentrado.
 */
const PromptEditor: React.FC<Props> = ({
  visible, valor, onCambiar, onCerrar, onAjustes, onReferencia, onCrear, referencias,
}) => {
  const { theme } = useTheme();
  const t = useT();
  const hayTexto = valor.trim().length > 0;
  const campo = useRef<TextInput>(null);

  /*
   * EN ANDROID EL TECLADO NO SUBÍA SOLO.
   *
   * El `Modal` de Android es otra ventana, y React Native la crea marcada como
   * "no enfocable" hasta justo después de mostrarla. `autoFocus` salta en ese
   * instante: el campo se queda con el cursor, pero el sistema no sube el
   * teclado para una ventana que todavía no puede tener el foco. Y ya no se
   * vuelve a pedir, porque React Native da el campo por enfocado e ignora
   * cualquier `focus()` posterior: pedirlo otra vez con `autoFocus` puesto no
   * hacía nada.
   *
   * Por eso en Android no hay `autoFocus`: el foco se pide cuando el modal ya
   * se ha mostrado. En web e iOS `autoFocus` funciona y se queda como estaba.
   */
  const alMostrarse = () => {
    setTimeout(() => campo.current?.focus(), ESPERA_DEL_FOCO);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCerrar}
      onShow={isAndroid ? alMostrarse : undefined}
      transparent={false}
    >
      <SafeAreaView style={[styles.pantalla, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        {/*
          El `KeyboardAvoidingView` de React Native no hace nada en Android desde
          que Weë se dibuja de borde a borde: la ventana ya no se encoge y el
          cálculo del solape da cero. `EspacioDeEscritura` es la pieza de Weë que
          resuelve eso —iOS por el camino de siempre, Android con la altura que
          sí es fiable— y aquí importa de verdad: el editor es a pantalla
          completa y el botón de crear vive abajo del todo.
        */}
        <EspacioDeEscritura style={styles.pantalla}>
          {/* Cabecera: volver, el nombre de lo que estás haciendo, y los ajustes. */}
          <View style={[styles.cabecera, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              onPress={onCerrar}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <Ionicons name="chevron-back" size={scale(24)} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.titulo, { color: theme.colors.text }]}>{t('studio.editorTitle')}</Text>
            <TouchableOpacity
              onPress={onAjustes}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t('studio.settingsLabel')}
            >
              <Ionicons name="options-outline" size={scale(22)} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.cuerpo} contentContainerStyle={styles.cuerpoDentro} keyboardShouldPersistTaps="handled">
            <TextInput
              ref={campo}
              style={[styles.campo, { color: theme.colors.text }, isWeb && ({ outlineStyle: 'none' } as any)]}
              value={valor}
              onChangeText={onCambiar}
              placeholder={t('studio.editorPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              autoFocus={!isAndroid}
              textAlignVertical="top"
            />

            {/* Las referencias, debajo del texto: acompañan a la idea, no la interrumpen. */}
            <View style={styles.referencias}>
              <Text style={[styles.referenciasTitulo, { color: theme.colors.textSecondary }]}>
                {t('studio.editorReferences')}
              </Text>
              {referencias.length === 0 ? (
                <Text style={[styles.vacio, { color: theme.colors.textSecondary }]}>{t('studio.editorNoReferences')}</Text>
              ) : (
                <View style={styles.fichas}>
                  {referencias.map((r, i) => (
                    <View key={`${r}-${i}`} style={[styles.ficha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <Ionicons name="image-outline" size={scale(15)} color={theme.colors.text} />
                      <Text style={[styles.fichaTexto, { color: theme.colors.text }]} numberOfLines={1}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={[styles.anadir, { borderColor: theme.colors.border }]}
                onPress={onReferencia}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={scale(17)} color={theme.colors.text} />
                <Text style={[styles.anadirTexto, { color: theme.colors.text }]}>{t('studio.editorAddReference')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* El pie: cuánto llevas escrito y el botón que crea. */}
          <View style={[styles.pie, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.contador, { color: theme.colors.textSecondary }]}>
              {t('studio.editorCharacters', { contador: valor.length })}
            </Text>
            <TouchableOpacity
              style={[styles.crear, { backgroundColor: hayTexto ? theme.colors.accent : theme.colors.surface }]}
              onPress={onCrear}
              disabled={!hayTexto}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={[styles.crearTexto, { color: hayTexto ? '#1F2937' : theme.colors.textSecondary }]}>
                {t('studio.create')}
              </Text>
            </TouchableOpacity>
          </View>
        </EspacioDeEscritura>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titulo: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  cuerpo: { flex: 1 },
  cuerpoDentro: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  /*
   * Alto mínimo generoso: al abrirse tiene que verse como una hoja, no como un
   * campo. Crece con el texto y el ScrollView se encarga del resto.
   */
  campo: {
    fontSize: FONT_SIZE.md,
    lineHeight: scale(24),
    minHeight: scale(220),
  },
  referencias: {
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  referenciasTitulo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
    letterSpacing: scale(0.5),
  },
  vacio: { fontSize: FONT_SIZE.sm },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  ficha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: scale(180),
  },
  fichaTexto: { fontSize: FONT_SIZE.xs, flexShrink: 1 },
  anadir: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  anadirTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  contador: { fontSize: FONT_SIZE.xs },
  crear: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  crearTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
});

export default PromptEditor;
