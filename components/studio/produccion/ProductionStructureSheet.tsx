import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import HojaInferior from '../../workspace/HojaInferior';
import { Seccion } from './ProductionPiezas';
import type { FilmmakerProduction } from '../../../services/filmmaker/dominio';
import { SPACING, FONT_SIZE } from '../../../constants/design';

/**
 * EL GUION DE LA PRODUCCIÓN, DE UN VISTAZO: cada escena con su descripción y sus líneas, en orden.
 *
 * Hasta la Fase 22 esta hoja enseñaba también la idea, el reparto, los lugares y el moodboard, y solo dejaba vincular
 * fichas. Desde la Fase 23 del motor todo eso se EDITA en el proyecto (`ProductionProyecto`: brief, dirección, reparto,
 * lugares, objetos, referencias y versiones), y aquí queda lo que se lee de corrido: el guion. Las líneas se escriben
 * donde se dirigen —en la herramienta «Texto» de cada plano—.
 */
const ProductionStructureSheet: React.FC<{
  produccion: FilmmakerProduction;
  que: 'guion';
  onCerrar: () => void;
}> = ({ produccion, onCerrar }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const texto = (valor: string | undefined, vacio: string) => (
    <Text style={[styles.texto, { color: valor ? theme.colors.text : theme.colors.textSecondary }]}>{valor || vacio}</Text>
  );
  const nombreDe = (id: string | undefined) => (id ? produccion.characters.find((c) => c.id === id)?.name : undefined);
  const cuerpo = produccion.scenes.length === 0
    ? texto(undefined, t('filmmaker.wsNothingYet'))
    : produccion.scenes.map((s, i) => {
      const lineas = [...(s.dialogue ?? []), ...s.shots.flatMap((p) => p.dialogue ?? [])];
      return (
        <Seccion key={s.id} titulo={s.title ? t('filmmaker.wsSceneCrumbTitled', { numero: i + 1, titulo: s.title }) : t('filmmaker.wsSceneCrumb', { numero: i + 1 })}>
          {texto(s.description, t('filmmaker.noDescription'))}
          {lineas.map((l) => {
            const quien = l.kind === 'narration' ? t('filmmaker.audioNarrator') : nombreDe(l.characterId);
            return (
              <React.Fragment key={l.id}>
                {!!quien && <Text style={[styles.quien, { color: theme.colors.textSecondary }]}>{quien}</Text>}
                <Text style={[styles.linea, { color: theme.colors.text, borderLeftColor: theme.colors.accent }]}>{l.text}</Text>
              </React.Fragment>
            );
          })}
        </Seccion>
      );
    });
  return (
    <HojaInferior visible titulo={t('filmmaker.wsScript')} subtitulo={t('filmmaker.wsScriptReadHint')} onCerrar={onCerrar}>
      {cuerpo}
    </HojaInferior>
  );
};

const styles = StyleSheet.create({
  texto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5 },
  quien: { fontSize: FONT_SIZE.xs, fontWeight: '600', marginTop: SPACING.xs },
  linea: { fontSize: FONT_SIZE.sm, fontStyle: 'italic', borderLeftWidth: 2, paddingLeft: SPACING.sm },
});

export default ProductionStructureSheet;
