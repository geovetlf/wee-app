import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import ProductionFormatSelector from './ProductionFormatSelector';
import ProductionDurationSummary from './ProductionDurationSummary';
import ProductionRecommendations from './ProductionRecommendations';
import ProductionInspector from './ProductionInspector';
import ProductionAudio from './ProductionAudio';
import type { Seleccion } from './ProductionStoryboard';
import { RUTAS_CREATIVAS, claveDelValor } from '../../../constants/camaraCinematica';
import { buscarEscena, buscarPlano, valorCreativo } from '../../../services/filmmaker/dominio';
import type {
  CreativeParameterPath, FilmmakerOperation, FilmmakerProduction, PendingRegeneration, Recommendation, ValidationResult,
} from '../../../services/filmmaker/dominio';
import { fraseDelProblema } from '../../../utils/mensajesDeFilmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

/**
 * «DIRECTOR»: EL MODO QUE DIRIGE LA PRODUCCIÓN ENTERA.
 *
 * La intención tal como se escribió, la dirección creativa, el formato, la
 * duración, el resumen, lo elegido en el storyboard para dirigirlo, las
 * recomendaciones de F1-A, lo que impide darla por lista, lo que habría que
 * rehacer, quién sale, cómo suena y qué se puede hacer con ella.
 *
 * No hay conversación con Weë Brain: las recomendaciones son las reglas
 * deterministas de F1-A, y convertir «20 s, vertical, 5 planos» en operaciones
 * llega en otra fase. Tampoco hay generación ni precio: «Generar» se enseña como
 * lo que es hoy —todavía no disponible— y el coste, pendiente de cotización.
 */
const ProductionDirectorPanel: React.FC<{
  produccion: FilmmakerProduction;
  seleccion: Seleccion;
  recomendaciones: readonly Recommendation[];
  lista: ValidationResult | undefined;
  porRehacer: PendingRegeneration;
  rechazadas: ReadonlySet<string>;
  editable: boolean;
  onGesto: (ops: readonly FilmmakerOperation[]) => void;
  onRechazar: (clave: string) => void;
}> = ({ produccion, seleccion, recomendaciones, lista, porRehacer, rechazadas, editable, onGesto, onRechazar }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const direccion = produccion.creativeDirection;
  const camara = RUTAS_CREATIVAS
    .map((ruta) => {
      const v = valorCreativo(direccion.cinematography, ruta as CreativeParameterPath);
      const clave = typeof v === 'string' ? claveDelValor(ruta, v) : null;
      return clave ? t(clave) : null;
    })
    .filter((x): x is string => !!x);
  const enPalabras = [direccion.visualStyle, direccion.mood, direccion.tone].filter((x): x is string => !!x);
  const planos = produccion.scenes.reduce((n, s) => n + s.shots.length, 0);
  const problemas = (lista?.problems ?? []).filter((p) => p.severity !== 'info');
  const nombreDe = (id: string): string | null => {
    const p = buscarPlano(produccion, id);
    if (p) return t('filmmaker.whereShot', { escena: p.sceneIndex + 1, plano: p.shotIndex + 1 });
    const e = buscarEscena(produccion, id);
    return e ? t('filmmaker.whereScene', { escena: e.index + 1 }) : null;
  };
  const rehacer = [...porRehacer.shots, ...porRehacer.scenes.filter((id) => !buscarEscena(produccion, id)?.scene.shots.length)]
    .map(nombreDe).filter((x): x is string => !!x);
  const titulado = seleccion ? nombreDe(seleccion.id) : null;

  return (
    <View style={styles.panel}>
      <View style={styles.marca}>
        <Ionicons name="videocam-outline" size={scale(18)} color={theme.colors.accentDark} />
        <Text style={[styles.nombre, { color: theme.colors.text }]} accessibilityRole="header">{t('filmmaker.director')}</Text>
      </View>

      <Seccion titulo={t('filmmaker.intent')}>
        <Text style={[styles.texto, { color: theme.colors.text }]}>{produccion.intent.freeText ?? produccion.intent.objective ?? produccion.title}</Text>
      </Seccion>

      <Seccion titulo={t('filmmaker.creativeDirection')}>
        <Text style={[styles.texto, { color: camara.length || enPalabras.length ? theme.colors.text : theme.colors.textSecondary }]}>
          {camara.length || enPalabras.length ? formato.lista([...enPalabras, ...camara]) : t('filmmaker.noCreativeDirection')}
        </Text>
      </Seccion>

      <Seccion titulo={t('filmmaker.format')}>
        <ProductionFormatSelector
          aspectRatio={produccion.format.aspectRatio}
          preset={produccion.format.preset}
          editable={editable}
          onPreset={(preset) => onGesto([{ op: 'change_format', preset }])}
          onProporcion={(aspectRatio) => onGesto([{ op: 'change_format', aspectRatio }])}
        />
      </Seccion>

      <Seccion titulo={t('filmmaker.duration')}>
        <ProductionDurationSummary produccion={produccion} editable={editable} onGesto={onGesto} />
      </Seccion>

      <Seccion titulo={t('filmmaker.summary')}>
        <Text style={[styles.texto, { color: theme.colors.text }]}>
          {formato.lista([t('filmmaker.scenes', { contador: produccion.scenes.length }), t('filmmaker.shots', { contador: planos })])}
        </Text>
      </Seccion>

      <Seccion titulo={titulado ?? t('filmmaker.directing')}>
        <ProductionInspector produccion={produccion} seleccion={seleccion} editable={editable} onGesto={onGesto} />
      </Seccion>

      <Seccion titulo={t('filmmaker.recommendations')}>
        <ProductionRecommendations
          recomendaciones={recomendaciones}
          produccion={produccion}
          rechazadas={rechazadas}
          editable={editable}
          onAceptar={onGesto}
          onRechazar={onRechazar}
        />
      </Seccion>

      <Seccion titulo={t('filmmaker.warnings')}>
        {problemas.length === 0
          ? <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>{t('filmmaker.noWarnings')}</Text>
          : problemas.slice(0, 8).map((p, i) => (
            <Text key={`${p.path}-${p.code}-${i}`} style={[styles.punto, { color: p.severity === 'error' ? theme.colors.text : theme.colors.textSecondary }]}>
              {'• '}{fraseDelProblema(p, produccion, t)}
            </Text>
          ))}
      </Seccion>

      <Seccion titulo={t('filmmaker.pendingChanges')}>
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.pendingChangesText')}</Text>
        <Text style={[styles.texto, { color: theme.colors.text }]}>{rehacer.length ? formato.lista(rehacer) : t('filmmaker.nothingPending')}</Text>
      </Seccion>

      <Seccion titulo={t('filmmaker.characters')}>
        {produccion.characters.length === 0
          ? <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>{t('filmmaker.noCharacters')}</Text>
          : produccion.characters.map((c) => (
            <Text key={c.id} style={[styles.punto, { color: theme.colors.text }]} numberOfLines={2}>
              {'• '}{c.identityDescription ? t('filmmaker.characterLine', { nombre: c.name, descripcion: c.identityDescription }) : c.name}
            </Text>
          ))}
      </Seccion>

      <Seccion titulo={t('filmmaker.audio')}>
        <ProductionAudio produccion={produccion} />
      </Seccion>

      <Seccion titulo={t('filmmaker.actions')}>
        <View style={[styles.accion, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <BotonPequeno icono="play-outline" etiqueta={t('filmmaker.generate')} onPress={() => undefined} disabled conTexto />
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.generateUnavailable')}</Text>
        </View>
        <View style={styles.coste}>
          <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.cost')}</Text>
          <Text style={[styles.texto, { color: theme.colors.text }]}>{t('filmmaker.costPending')}</Text>
        </View>
      </Seccion>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { gap: SPACING.xl },
  marca: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nombre: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  texto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5 },
  punto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5 },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  etiqueta: { fontSize: FONT_SIZE.xs },
  accion: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  coste: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

export default ProductionDirectorPanel;
