import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Switch, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import HowIMadeIt from './HowIMadeIt';
import EspacioDeEscritura from './EspacioDeEscritura';
import {
  BorradorComoLoHice,
  datosParaPublicar,
  textoDePaso,
  MAX_PASOS,
  MAX_LARGO_PASO,
  MAX_LARGO_HERRAMIENTA,
  MAX_LARGO_PROMPT,
} from '../utils/comoLoHice';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

interface Props {
  visible: boolean;
  /** El borrador vive en el compositor: aquí se edita y, al volver, sigue allí tal cual. */
  borrador: BorradorComoLoHice;
  onCambiar: (b: BorradorComoLoHice) => void;
  onCerrar: () => void;
  /** Se están leyendo los pasos del trabajo de Weë AI del que sale la publicación. */
  cargandoHistorial?: boolean;
}

/**
 * «REVISAR Y SELECCIONAR QUÉ INFORMACIÓN QUIERES COMPARTIR».
 *
 * Se abre desde la fila gris del compositor cuando «Compartir cómo lo hice» está encendido. Encenderlo no autoriza
 * nada por sí solo: aquí se elige QUÉ se comparte —la herramienta, el proceso y, solo si se activa a propósito, el
 * prompt— y se puede cambiar cada texto antes de publicar. Abajo, la vista previa es el mismo bloque que se verá en el
 * Wäll (`HowIMadeIt`), dibujado con lo que se publicaría.
 *
 * Los pasos propuestos salen de lo que Weë ya apuntó al crear (el trabajo de `creatorJobs`); si no hay historia, la
 * lista empieza vacía y la persona escribe los suyos. Nada se inventa y nada llama a una IA.
 *
 * Es una hoja encima del compositor —el compositor sigue montado debajo con todo lo escrito— y no una pantalla de la
 * navegación: lo que se edita aquí es parte del borrador y vuelve con él.
 */
const ComoLoHiceRevision: React.FC<Props> = ({ visible, borrador, onCambiar, onCerrar, cargandoHistorial = false }) => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const lector = { t, locale };

  /* Todo cambio cuenta como edición: lo que llegue después del historial ya no lo pisa. */
  const cambiar = (parcial: Partial<BorradorComoLoHice>) => onCambiar({ ...borrador, ...parcial, editado: true });
  /* Un paso que se edita deja de ser de Weë: pasa a texto de la persona, que no se traduce. */
  const cambiarPaso = (i: number, texto: string) => cambiar({ pasos: borrador.pasos.map((p, j) => (j === i ? { texto } : p)) });
  const quitarPaso = (i: number) => cambiar({ pasos: borrador.pasos.filter((_, j) => j !== i) });
  const anadirPaso = () => cambiar({ pasos: [...borrador.pasos, { texto: '' }] });

  /* Lo que se publicaría, dibujado como en el Wäll. */
  const vistaPrevia = datosParaPublicar({ ...borrador, activo: true }, lector);
  const hayVistaPrevia = Object.keys(vistaPrevia).length > 0;

  const avisoDePasos = cargandoHistorial
    ? t('composer.howLoadingHistory')
    : borrador.origen === 'historial'
      ? t('composer.howFromHistory')
      : borrador.origen === 'resumen'
        ? t('composer.howFromSummary')
        : t('composer.howNoHistory');

  const campo = [styles.campo, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.card }];
  const interruptor = (valor: boolean, alCambiar: (v: boolean) => void, etiqueta: string) => (
    <Switch
      value={valor}
      onValueChange={alCambiar}
      accessibilityLabel={etiqueta}
      trackColor={{ false: theme.colors.border, true: theme.colors.text }}
      thumbColor={theme.dark && valor ? '#1F2937' : '#FFFFFF'}
      ios_backgroundColor={theme.colors.border}
    />
  );

  /* Una función y no un componente: un componente definido aquí dentro se volvería a montar en cada tecla y el campo perdería el foco. */
  const seccion = (titulo: string, pista: string, valor: boolean, alCambiar: (v: boolean) => void, children: React.ReactNode) => (
    <View style={[styles.seccion, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.seccionCabecera}>
        <View style={styles.seccionTextos}>
          <Text style={[styles.seccionTitulo, { color: theme.colors.text }]}>{titulo}</Text>
          <Text style={[styles.pista, { color: theme.colors.textSecondary }]}>{pista}</Text>
        </View>
        {interruptor(valor, alCambiar, titulo)}
      </View>
      {valor && children}
    </View>
  );

  return (
    <Modal visible={visible} animationType={Platform.OS === 'web' ? 'none' : 'slide'} onRequestClose={onCerrar}>
      <SafeAreaView style={[styles.pantalla, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.cabecera}>
          <TouchableOpacity
            onPress={onCerrar}
            style={styles.cerrar}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="close" size={scale(26)} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.cabeceraTitulo, { color: theme.colors.text }]} numberOfLines={1}>{t('composer.howReviewTitle')}</Text>
          <TouchableOpacity
            onPress={onCerrar}
            style={[styles.listo, { backgroundColor: theme.colors.text }]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('common.done')}
          >
            <Text style={[styles.listoTexto, { color: theme.colors.background }]}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>

        {/* El mismo acomodo del teclado que el compositor: los pasos y el prompt se escriben abajo de la hoja. */}
        <EspacioDeEscritura style={styles.pantalla}>
        <ScrollView contentContainerStyle={styles.cuerpo} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.intro, { color: theme.colors.textSecondary }]}>{t('composer.howReviewIntro')}</Text>

          {seccion(
            t('composer.howToolLabel'),
            t('composer.howToolHint'),
            borrador.compartirHerramienta,
            (v) => cambiar({ compartirHerramienta: v }),
            <>
            <TextInput
              style={campo}
              value={borrador.herramienta}
              onChangeText={(v) => cambiar({ herramienta: v })}
              placeholder={t('composer.howToolPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={MAX_LARGO_HERRAMIENTA * 2}
              accessibilityLabel={t('composer.howToolLabel')}
            />
          </>
          )}

          {seccion(
            t('composer.howProcessLabel'),
            t('composer.howProcessHint'),
            borrador.compartirProceso,
            (v) => cambiar({ compartirProceso: v }),
            <>
            <View style={styles.aviso}>
              {cargandoHistorial && <ActivityIndicator size="small" color={theme.colors.textSecondary} />}
              <Text style={[styles.pista, styles.avisoTexto, { color: theme.colors.textSecondary }]}>{avisoDePasos}</Text>
            </View>
            {borrador.pasos.map((paso, i) => (
              <View key={i} style={styles.paso}>
                <Text style={[styles.pasoNumero, { color: theme.colors.text }]}>{t('wall.howStepNumber', { n: i + 1 })}</Text>
                <TextInput
                  style={[campo, styles.pasoCampo]}
                  value={textoDePaso(paso, lector)}
                  onChangeText={(v) => cambiarPaso(i, v)}
                  placeholder={t('composer.howStepPlaceholder', { n: i + 1 })}
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  maxLength={MAX_LARGO_PASO}
                  accessibilityLabel={t('composer.howStepPlaceholder', { n: i + 1 })}
                />
                <TouchableOpacity
                  onPress={() => quitarPaso(i)}
                  style={styles.quitar}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('composer.howRemoveStep', { n: i + 1 })}
                >
                  <Ionicons name="close" size={scale(18)} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
            {borrador.pasos.length < MAX_PASOS && (
              <TouchableOpacity
                onPress={anadirPaso}
                style={styles.anadir}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('composer.howAddStep')}
              >
                <Ionicons name="add" size={scale(18)} color={theme.colors.text} />
                <Text style={[styles.anadirTexto, { color: theme.colors.text }]}>{t('composer.howAddStep')}</Text>
              </TouchableOpacity>
            )}
          </>
          )}

          {seccion(
            t('composer.howPromptLabel'),
            t('composer.howPromptHint'),
            borrador.compartirPrompt,
            (v) => cambiar({ compartirPrompt: v }),
            <>
            <TextInput
              style={[campo, styles.promptCampo]}
              value={borrador.prompt}
              onChangeText={(v) => cambiar({ prompt: v })}
              placeholder={t('composer.howPromptPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={MAX_LARGO_PROMPT}
              accessibilityLabel={t('composer.howPromptLabel')}
            />
          </>
          )}

          <Text style={[styles.seccionTitulo, styles.vistaTitulo, { color: theme.colors.text }]}>{t('composer.howPreview')}</Text>
          {hayVistaPrevia ? (
            <HowIMadeIt post={vistaPrevia} abiertoAlEmpezar />
          ) : (
            <Text style={[styles.pista, { color: theme.colors.textSecondary }]}>{t('composer.howPreviewEmpty')}</Text>
          )}
        </ScrollView>
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
    minHeight: 56,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cabeceraTitulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginHorizontal: SPACING.sm,
  },
  listo: {
    minHeight: 36,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listoTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  cuerpo: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  intro: { fontSize: FONT_SIZE.sm, lineHeight: scale(19), marginTop: SPACING.sm, marginBottom: SPACING.sm },
  seccion: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.md,
  },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  seccionTextos: { flex: 1, minWidth: 0, gap: scale(2) },
  seccionTitulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  pista: { fontSize: FONT_SIZE.sm, lineHeight: scale(18) },
  campo: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.base,
    minHeight: 44,
  },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avisoTexto: { flex: 1, minWidth: 0 },
  paso: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  pasoNumero: { minWidth: scale(20), fontSize: FONT_SIZE.base, paddingTop: SPACING.sm + 2 },
  pasoCampo: { flex: 1, minWidth: 0, textAlignVertical: 'top' },
  quitar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  anadir: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'flex-start', minHeight: 44 },
  anadirTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  promptCampo: { minHeight: 96, textAlignVertical: 'top' },
  vistaTitulo: { marginTop: SPACING.xl },
});

export default ComoLoHiceRevision;
