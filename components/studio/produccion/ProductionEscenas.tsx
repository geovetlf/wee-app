import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { BotonPequeno, Chip } from './ProductionPiezas';
import type { EspacioDeFilmmaker } from './espacio';
import { aSec, duracionDeUnidadMs, repartoDelPlano, unidades } from '../../../services/filmmaker/dominio';
import { CLAVE_DEL_CLIMA, CLAVE_DEL_MOMENTO, CLAVE_DEL_PROPOSITO } from '../../../constants/filmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';

/**
 * HISTORIA › ESCENAS (Filmmaker Engine, Fase 35).
 *
 * La lista de escenas tal como las sabe F1-A: para qué sirve cada una en la historia, dónde y cuándo pasa, con qué
 * clima, quién sale, cuánto dura y cuántos planos tiene. Solo lectura: cada cosa se cambia donde se dirige —el
 * propósito en el Guion, el lugar, el momento y el clima en «Dónde» del plano, el reparto en el plano—, y desde aquí
 * se va a la escena. La duración es la de sus unidades según F1-A (la de sus planos, o la suya si no los tiene), escena
 * a escena: sin todas las duraciones F1-A no hace línea de tiempo, pero una escena sin la suya no deja a las demás sin
 * la de ellas —esa dice «Sin duración»—.
 */
const ProductionEscenas: React.FC<{ espacio: EspacioDeFilmmaker; onIrALaEscena?: () => void }> = ({ espacio, onIrALaEscena }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { produccion, seleccion, onSeleccionar } = espacio;
  /* Milisegundos por escena; `null` si a alguna de sus unidades le falta la duración. */
  const duraciones = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const u of unidades(produccion)) {
      const d = duracionDeUnidadMs(u);
      const antes = m.get(u.scene.id);
      m.set(u.scene.id, d === undefined || antes === null ? null : (antes ?? 0) + d);
    }
    return m;
  }, [produccion]);
  const duracionDe = (sceneId: string): string => {
    const ms = duraciones.get(sceneId);
    return ms === null || ms === undefined ? t('filmmaker.noDuration') : t('filmmaker.wsSecondsShort', { segundos: formato.numero(aSec(ms)) });
  };
  const nombreDe = new Map(produccion.characters.map((c) => [c.id, c.name] as [string, string]));
  const lugarDe = new Map(produccion.locations.map((l) => [l.id, l.name] as [string, string]));

  if (!produccion.scenes.length) {
    return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsScenesEmpty')}</Text>;
  }
  return (
    <View style={styles.lista}>
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsScenesIntro')}</Text>
      {produccion.scenes.map((s, i) => {
        const reparto = [...new Set([...(s.characterIds ?? []), ...s.shots.flatMap((p) => repartoDelPlano(s, p))])].map((id) => nombreDe.get(id) ?? id);
        const elegida = seleccion?.tipo === 'escena' && seleccion.id === s.id;
        const datos = [
          s.locationId ? t('filmmaker.wsScenePlace', { lugar: lugarDe.get(s.locationId) ?? s.locationId }) : null,
          s.timeOfDay ? t(CLAVE_DEL_MOMENTO[s.timeOfDay]) : null,
          s.weather ? t(CLAVE_DEL_CLIMA[s.weather]) : null,
        ].filter((x): x is string => !!x);
        return (
          <View key={s.id} style={[styles.escena, { borderColor: elegida ? theme.colors.accent : theme.colors.border, backgroundColor: theme.colors.card }]}>
            <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={2}>
              {s.title ? t('filmmaker.wsSceneTitled', { escena: i + 1, titulo: s.title }) : t('filmmaker.whereScene', { escena: i + 1 })}
            </Text>
            {!!s.narrativePurpose && <Chip texto={t(CLAVE_DEL_PROPOSITO[s.narrativePurpose])} icono="flag-outline" tono="acento" />}
            {!!s.description && <Text style={[styles.texto, { color: theme.colors.text }]} numberOfLines={3}>{s.description}</Text>}
            <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
              {formato.lista([
                t('filmmaker.shots', { contador: s.shots.length }),
                duracionDe(s.id),
                ...datos,
              ])}
            </Text>
            <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
              {reparto.length ? t('filmmaker.wsSceneCast', { lista: formato.lista(reparto) }) : t('filmmaker.wsSceneNoCast')}
            </Text>
            <View style={styles.acciones}>
              <BotonPequeno
                icono="arrow-forward-outline"
                etiqueta={t('filmmaker.wsGoToScene', { escena: i + 1 })}
                onPress={() => { onSeleccionar({ tipo: 'escena', id: s.id }); onIrALaEscena?.(); }}
                conTexto
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  lista: { gap: SPACING.md },
  escena: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.xs },
  titulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold as any },
  texto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5 },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});

export default ProductionEscenas;
