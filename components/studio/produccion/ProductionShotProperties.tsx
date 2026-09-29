import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import ProductionInspector from './ProductionInspector';
import { BotonPequeno, Chip } from './ProductionPiezas';
import { useSegundos } from './ProductionDurationSummary';
import { claveDelValor } from '../../../constants/camaraCinematica';
import { PASO_DE_DURACION_SEC, nombreDelEstilo } from '../../../constants/filmmaker';
import { EspacioDeFilmmaker, elegidoDe } from './espacio';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../../constants/design';

/** Cuánto se sostiene la continuidad de lo que sale, dicho en palabras. */
const CLAVE_DE_LA_FUERZA: Readonly<Record<string, string>> = {
  relaxed: 'filmmaker.wsContinuityRelaxed',
  standard: 'filmmaker.wsContinuityStandard',
  strict: 'filmmaker.wsContinuityStrict',
};

/**
 * EL PROMPT AVANZADO DEL PLANO, VISTO (Fase 20 del motor; se usa al generar desde la Fase 13): oculto hasta que se
 * pide —el modo avanzado nunca está a la vista por defecto— y solo para leerlo. Es el texto de la persona: tal cual.
 */
const PromptAvanzado: React.FC<{ texto: string }> = ({ texto }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.avanzado}>
      <BotonPequeno
        icono={visible ? 'eye-off-outline' : 'code-slash-outline'}
        etiqueta={t(visible ? 'filmmaker.wsAdvancedHide' : 'filmmaker.wsAdvancedShow')}
        onPress={() => setVisible((v) => !v)}
        conTexto
      />
      {visible && (
        <>
          <Text selectable style={[styles.textoAvanzado, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>{texto}</Text>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsAdvancedNote')}</Text>
        </>
      )}
    </View>
  );
};

/**
 * PROPIEDADES DEL PLANO: lo elegido, a mano, en su propio panel.
 *
 * Su duración —con alargar y acortar, que son operaciones de F1-A—, su estilo y
 * su continuidad a la vista, y debajo el inspector de siempre: la descripción,
 * el encuadre, la cámara, el movimiento y la luz; y en una escena, su momento
 * del día y su clima. Lo que F1-A todavía no sabe cambiar —la posición, la escala
 * o la rotación de la imagen— no se pinta: un control que no hace nada es peor
 * que no tenerlo.
 */
const ProductionShotProperties: React.FC<{ espacio: EspacioDeFilmmaker; enHoja?: boolean }> = ({ espacio, enHoja }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const segundos = useSegundos();
  const { produccion, seleccion, editable, onGesto, tarjetas } = espacio;
  const elegido = elegidoDe(produccion, seleccion);

  if (!elegido) {
    return (
      <View style={styles.panel}>
        <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('filmmaker.wsProperties')}</Text>
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.selectSomething')}</Text>
      </View>
    );
  }

  const plano = elegido.plano;
  const tarjeta = tarjetas.find((c) => c.unitId === elegido.unitId);
  const tipo = tarjeta?.shotType ? claveDelValor('shot.type', tarjeta.shotType) : null;
  const nombre = plano
    ? t('filmmaker.wsShotName', { numero: elegido.numeroDePlano ?? 1, tipo: tipo ? t(tipo) : t('filmmaker.wsNoShotType') })
    : t('filmmaker.wsSceneCrumb', { numero: elegido.numeroDeEscena });
  const duracion = plano ? plano.durationSec : elegido.escena.durationSec;
  const objetivo = plano ? { shotId: plano.id } : { sceneId: elegido.escena.id };
  const estilo = plano?.visual?.style ?? elegido.escena.visual?.style ?? produccion.creativeDirection.visualStyle;
  const fuerza = plano?.continuity?.strength ?? elegido.escena.continuity?.strength ?? produccion.continuity?.strength;

  /* En una hoja, la hoja ya se desplaza: aquí no hace falta otro desplazamiento dentro. */
  const Marco = enHoja ? View : ScrollView;
  return (
    <Marco {...(enHoja ? { style: styles.panelEnHoja } : { style: styles.scroll, contentContainerStyle: styles.panel })}>
      <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('filmmaker.wsProperties')}</Text>
      <View style={[styles.cabecera, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>{nombre}</Text>
        <View style={styles.duracion}>
          <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.duration')}</Text>
          <Text style={[styles.valor, { color: theme.colors.text }]}>{duracion === undefined ? t('filmmaker.noDuration') : segundos(duracion)}</Text>
          {editable && (
            <View style={styles.botones}>
              <BotonPequeno icono="remove" etiqueta={t('filmmaker.shorterBy', { segundos: PASO_DE_DURACION_SEC })} disabled={duracion === undefined}
                onPress={() => onGesto([{ op: 'shorten_duration', target: objetivo, bySec: PASO_DE_DURACION_SEC }])} />
              <BotonPequeno icono="add" etiqueta={t('filmmaker.longerBy', { segundos: PASO_DE_DURACION_SEC })} disabled={duracion === undefined}
                onPress={() => onGesto([{ op: 'extend_duration', target: objetivo, bySec: PASO_DE_DURACION_SEC }])} />
            </View>
          )}
        </View>
        <View style={styles.chips}>
          <Chip texto={estilo ? t('filmmaker.wsStyleIs', { estilo: nombreDelEstilo(estilo, t) }) : t('filmmaker.wsStyleNone')} icono="color-palette-outline" />
          {!!fuerza && !!CLAVE_DE_LA_FUERZA[fuerza] && <Chip texto={t('filmmaker.wsContinuityIs', { fuerza: t(CLAVE_DE_LA_FUERZA[fuerza]) })} icono="link-outline" tono="acento" />}
        </View>
      </View>
      <ProductionInspector produccion={produccion} seleccion={seleccion} editable={editable} onGesto={onGesto} />
      {!!plano?.advanced?.prompt && <PromptAvanzado texto={plano.advanced.prompt} />}
    </Marco>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  panel: { padding: SPACING.lg, gap: SPACING.md },
  panelEnHoja: { gap: SPACING.md },
  titulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold as any },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  cabecera: { borderWidth: 1, borderRadius: 10, padding: SPACING.md, gap: SPACING.sm },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any },
  duracion: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  etiqueta: { fontSize: FONT_SIZE.xs },
  valor: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any, fontVariant: ['tabular-nums'], flex: 1 },
  botones: { flexDirection: 'row', gap: SPACING.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  avanzado: { gap: SPACING.sm },
  textoAvanzado: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5, borderWidth: 1, borderRadius: 10, padding: SPACING.md },
});

export default ProductionShotProperties;
