import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { BotonPequeno, Chip } from './ProductionPiezas';
import type { EspacioDeFilmmaker } from './espacio';
import { continuidadPlanoAPlano } from '../../../utils/continuidadPlanoAPlano';
import { CLAVE_DEL_CLIMA, CLAVE_DEL_MOMENTO } from '../../../constants/filmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';

/**
 * HISTORIA › CONTINUIDAD (Filmmaker Engine, Fase 35): cómo evoluciona la pieza de un plano a otro.
 *
 * En orden, cada plano con lo que F1-A ya sabe y que llega a su toma: quién sale y cómo está —vestuario y «cómo
 * está», diciendo si viene de la escena—, quién entra y quién sale respecto al anterior, en quién cambia algo, qué
 * objetos hay y el lugar, el momento y el clima. Solo lectura; cada cosa se cambia en su plano, y desde aquí se va a
 * él. La postura, la emoción o la posición como datos, y el estado de un lugar o un objeto, no existen en F1-A: son el
 * contrato 5, y se dice.
 */
const ProductionContinuidadPlanoAPlano: React.FC<{ espacio: EspacioDeFilmmaker; onIrAlPlano?: () => void }> = ({ espacio, onIrAlPlano }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { produccion, seleccion, onSeleccionar } = espacio;
  const filas = useMemo(() => continuidadPlanoAPlano(produccion), [produccion]);

  if (!filas.length) {
    return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsScenesEmpty')}</Text>;
  }
  return (
    <View style={styles.lista}>
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsFlowIntro')}</Text>
      {filas.map((f) => {
        const nombre = f.plano !== undefined ? t('filmmaker.whereShot', { escena: f.escena, plano: f.plano }) : t('filmmaker.whereScene', { escena: f.escena });
        const elegida = !!seleccion && seleccion.id === (f.shotId ?? f.sceneId);
        const donde = [
          f.lugar ? t('filmmaker.wsScenePlace', { lugar: f.lugar }) : null,
          f.momento ? t(CLAVE_DEL_MOMENTO[f.momento]) : null,
          f.clima ? t(CLAVE_DEL_CLIMA[f.clima]) : null,
        ].filter((x): x is string => !!x);
        return (
          <View key={f.unitId} style={[styles.fila, { borderColor: elegida ? theme.colors.accent : theme.colors.border, backgroundColor: theme.colors.card }]}>
            <Text style={[styles.titulo, { color: theme.colors.text }]}>{nombre}</Text>
            {donde.length > 0 && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{formato.lista(donde)}</Text>}
            {(f.entran.length > 0 || f.salen.length > 0) && (
              <View style={styles.chips}>
                {f.entran.length > 0 && <Chip texto={t('filmmaker.wsFlowEnter', { lista: formato.lista(f.entran) })} icono="enter-outline" tono="acento" />}
                {f.salen.length > 0 && <Chip texto={t('filmmaker.wsFlowLeave', { lista: formato.lista(f.salen) })} icono="exit-outline" />}
              </View>
            )}
            {f.personajes.length === 0 && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsSceneNoCast')}</Text>}
            {f.personajes.map((p) => (
              <View key={p.characterId} style={styles.personaje}>
                <Text style={[styles.nombre, { color: theme.colors.text }]}>
                  {p.cambia ? t('filmmaker.wsFlowNameChanges', { nombre: p.nombre }) : p.nombre}
                </Text>
                <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
                  {p.vestuario !== undefined
                    ? t(p.vestuarioDeLaEscena ? 'filmmaker.wsFlowWardrobeFromScene' : 'filmmaker.wsFlowWardrobe', { valor: p.vestuario })
                    : t('filmmaker.wsFlowNoWardrobe')}
                </Text>
                {p.comoEsta !== undefined && (
                  <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
                    {t(p.comoEstaDeLaEscena ? 'filmmaker.wsFlowStateFromScene' : 'filmmaker.wsFlowState', { valor: p.comoEsta })}
                  </Text>
                )}
              </View>
            ))}
            {f.objetos.length > 0 && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsFlowObjects', { lista: formato.lista(f.objetos) })}</Text>}
            <View style={styles.acciones}>
              <BotonPequeno
                icono="arrow-forward-outline"
                etiqueta={t('filmmaker.wsFlowGoTo', { nombre })}
                onPress={() => { onSeleccionar(f.shotId ? { tipo: 'plano', id: f.shotId } : { tipo: 'escena', id: f.sceneId }); onIrAlPlano?.(); }}
                conTexto
              />
            </View>
          </View>
        );
      })}
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsFlowStructuredSoon')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  lista: { gap: SPACING.md },
  fila: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.xs },
  titulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  nombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  personaje: { gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});

export default ProductionContinuidadPlanoAPlano;
