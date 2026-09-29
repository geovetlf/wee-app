import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { Seccion } from './ProductionPiezas';
import ProductionLote from './ProductionLote';
import type { LoteDeTomas } from '../../../hooks/useLoteDeTomas';
import ProductionFormatSelector from './ProductionFormatSelector';
import ProductionDurationSummary from './ProductionDurationSummary';
import ProductionRecommendations from './ProductionRecommendations';
import ProductionInspector from './ProductionInspector';
import ProductionAudio from './ProductionAudio';
import ProductionShotGeneration from './ProductionShotGeneration';
import type { Seleccion } from './ProductionStoryboard';
import type { TomaDelPlano } from '../../../hooks/useTomaDePlano';
import type { HistorialDeTomas } from '../../../hooks/useTomasDelPlano';
import type { VideoDelPlano } from '../../../utils/controladorDeToma';
import { RUTAS_CREATIVAS, claveDelValor } from '../../../constants/camaraCinematica';
import { buscarEscena, buscarPlano, valorCreativo } from '../../../services/filmmaker/dominio';
import type {
  CreativeParameterPath, FilmmakerOperation, FilmmakerProduction, PendingRegeneration, Recommendation, ValidationResult,
} from '../../../services/filmmaker/dominio';
import { fraseDelProblema } from '../../../utils/mensajesDeFilmmaker';
import { nombreDelEstilo } from '../../../constants/filmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../../constants/design';
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
 * llega en otra fase. La toma de UNA unidad elegida —un plano, o una escena sin
 * planos— va en su propia sección, con su precio y su estado:
 * `ProductionShotGeneration`, que solo pinta lo que le da la pantalla. Y desde
 * la Fase 29 del motor, la producción ENTERA también se genera
 * (`ProductionLote`, el lote de la Fase 6): antes de empezar se mira qué pasaría
 * con cada unidad y cuánto cuesta todo. Antes aquí había un «Generar» apagado y
 * un coste «pendiente».
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
  /** La toma de la unidad elegida (F1-D). Sin ella, esta sección no se pinta. */
  toma?: TomaDelPlano;
  /** Fase 24 · las tomas de antes de esa unidad. */
  historial?: HistorialDeTomas | null;
  /** El vídeo de la unidad elegida, del storyboard: su póster se ve en «Ver vídeo» (Fase 16 del motor). */
  video?: VideoDelPlano | null;
  /** Fase 29 · la producción entera (el lote de la Fase 6). Sin él, esta sección no se pinta. */
  lote?: LoteDeTomas;
}> = ({ produccion, seleccion, recomendaciones, lista, porRehacer, rechazadas, editable, onGesto, onRechazar, toma, historial, video, lote }) => {
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
  /* El estilo, con su nombre si es un token (Fase 22 del motor, arreglo R13); lo escrito por alguien, tal cual. */
  const enPalabras = [direccion.visualStyle ? nombreDelEstilo(direccion.visualStyle, t) : undefined, direccion.mood, direccion.tone].filter((x): x is string => !!x);
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

      {!!toma && !!seleccion && <ProductionShotGeneration toma={toma} historial={historial} tipo={seleccion.tipo} video={video} formato={produccion.format.aspectRatio} />}

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

      {!!lote && (
        <Seccion titulo={t('filmmaker.wsBatchTitle')}>
          <ProductionLote lote={lote} produccion={produccion} editable={editable} />
        </Seccion>
      )}
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
});

export default ProductionDirectorPanel;
