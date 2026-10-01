import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import { BotonPequeno } from './ProductionPiezas';
import { canonico } from '../../../services/filmmaker/dominio';
import type { FilmmakerOperation, FilmmakerProduction, Recommendation } from '../../../services/filmmaker/dominio';
import { fraseDeLaPropuesta, fraseDelProblema } from '../../../utils/mensajesDeFilmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

/** La identidad de una recomendación: su código, dónde y con qué números. Para recordar que se rechazó. */
export const claveDeRecomendacion = (r: Recommendation): string => `${r.code}|${r.path}|${canonico(r.parameters)}`;

/**
 * LO QUE WEË SUGIERE, Y NADA MÁS QUE SUGERIR.
 *
 * Son las recomendaciones deterministas de F1-A —código, parámetros, propuesta y
 * sus operaciones—, calculadas sobre lo que se ve. Cada una trae sus
 * alternativas; ninguna se aplica sola: «Aceptar» aplica ESA propuesta como un
 * gesto más, y «Rechazar» la aparta mientras dure la sesión. No hay conversación
 * con Weë Brain aquí: eso llega en otra fase.
 */
const ProductionRecommendations: React.FC<{
  recomendaciones: readonly Recommendation[];
  produccion: FilmmakerProduction;
  rechazadas: ReadonlySet<string>;
  editable: boolean;
  onAceptar: (ops: readonly FilmmakerOperation[]) => void;
  onRechazar: (clave: string) => void;
}> = ({ recomendaciones, produccion, rechazadas, editable, onAceptar, onRechazar }) => {
  const { theme } = useTheme();
  const t = useT();
  const visibles = recomendaciones.filter((r) => !rechazadas.has(claveDeRecomendacion(r)));
  if (!visibles.length) return <Text style={[styles.vacio, { color: theme.colors.textSecondary }]}>{t('filmmaker.noRecommendations')}</Text>;

  return (
    <View style={styles.lista}>
      {visibles.map((r) => {
        const clave = claveDeRecomendacion(r);
        const varias = r.proposals.length > 1;
        return (
          <View key={clave} style={[styles.tarjeta, { borderColor: r.severity === 'warning' ? theme.colors.warning : theme.colors.border, backgroundColor: theme.colors.card }]}>
            <View style={styles.cabecera}>
              <Ionicons name={r.severity === 'warning' ? 'alert-circle-outline' : 'bulb-outline'} size={scale(18)} color={r.severity === 'warning' ? theme.colors.warning : theme.colors.accentDark} />
              <Text style={[styles.frase, { color: theme.colors.text }]}>{fraseDelProblema(r, produccion, t)}</Text>
            </View>
            {r.proposals.map((ops, i) => (
              <View key={canonico(ops)} style={styles.propuesta}>
                <Text style={[styles.opcion, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {varias ? t('filmmaker.optionWith', { numero: i + 1, frase: fraseDeLaPropuesta(ops, t) }) : fraseDeLaPropuesta(ops, t)}
                </Text>
                <BotonPequeno icono="checkmark" etiqueta={t('common.accept')} onPress={() => onAceptar(ops)} disabled={!editable} conTexto principal />
              </View>
            ))}
            <View style={styles.pie}>
              <BotonPequeno icono="close" etiqueta={t('filmmaker.reject')} onPress={() => onRechazar(clave)} conTexto />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  lista: { gap: SPACING.sm },
  vacio: { fontSize: FONT_SIZE.sm },
  tarjeta: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  cabecera: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  frase: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.45, flex: 1, fontWeight: FONT_WEIGHT.medium as any },
  propuesta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, justifyContent: 'space-between' },
  opcion: { fontSize: FONT_SIZE.sm, flex: 1 },
  pie: { flexDirection: 'row', justifyContent: 'flex-end' },
});

export default ProductionRecommendations;
