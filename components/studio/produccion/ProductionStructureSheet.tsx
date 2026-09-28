import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import HojaInferior from '../../workspace/HojaInferior';
import { Seccion } from './ProductionPiezas';
import type { FilmmakerProduction } from '../../../services/filmmaker/dominio';
import type { Estructura } from './ProductionProjectPanel';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';

const TITULO: Readonly<Record<Exclude<Estructura, 'storyboard' | 'planos'>, string>> = {
  idea: 'filmmaker.wsIdea',
  guion: 'filmmaker.wsScript',
  personajes: 'filmmaker.characters',
  lugares: 'filmmaker.wsLocations',
  moodboard: 'filmmaker.wsMoodboard',
};

/**
 * LO QUE LA PRODUCCIÓN YA SABE DE SÍ MISMA: la idea, el guion, quién sale, dónde,
 * y su moodboard, para leerlo de un vistazo.
 *
 * Se lee, no se edita: F1-A todavía no tiene operaciones para los personajes,
 * los lugares ni las referencias, y aquí no se inventan. Lo que sí se dirige —la
 * descripción de cada escena y cada plano, su cámara, su luz, sus líneas— se
 * dirige en el visor, en Weë AI Director y en las propiedades del plano.
 */
const ProductionStructureSheet: React.FC<{
  produccion: FilmmakerProduction;
  que: Exclude<Estructura, 'storyboard' | 'planos'>;
  onCerrar: () => void;
}> = ({ produccion, que, onCerrar }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const texto = (valor: string | undefined, vacio: string) => (
    <Text style={[styles.texto, { color: valor ? theme.colors.text : theme.colors.textSecondary }]}>{valor || vacio}</Text>
  );
  const ficha = (clave: string, nombre: string, detalle?: string) => (
    <View key={clave} style={[styles.ficha, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <Text style={[styles.nombre, { color: theme.colors.text }]}>{nombre}</Text>
      {!!detalle && <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>{detalle}</Text>}
    </View>
  );
  const direccion = produccion.creativeDirection;

  let cuerpo: React.ReactNode = null;
  if (que === 'idea') {
    cuerpo = (
      <>
        <Seccion titulo={t('filmmaker.intent')}>{texto(produccion.intent.freeText ?? produccion.intent.objective, t('filmmaker.wsNothingYet'))}</Seccion>
        <Seccion titulo={t('filmmaker.creativeDirection')}>
          {texto(formato.lista([direccion.visualStyle, direccion.mood, direccion.tone].filter((x): x is string => !!x)), t('filmmaker.noCreativeDirection'))}
        </Seccion>
      </>
    );
  } else if (que === 'guion') {
    cuerpo = produccion.scenes.length === 0
      ? texto(undefined, t('filmmaker.wsNothingYet'))
      : produccion.scenes.map((s, i) => {
        const lineas = [...(s.dialogue ?? []), ...s.shots.flatMap((p) => p.dialogue ?? [])];
        return (
          <Seccion key={s.id} titulo={s.title ? t('filmmaker.wsSceneCrumbTitled', { numero: i + 1, titulo: s.title }) : t('filmmaker.wsSceneCrumb', { numero: i + 1 })}>
            {texto(s.description, t('filmmaker.noDescription'))}
            {lineas.map((l) => (
              <Text key={l.id} style={[styles.linea, { color: theme.colors.text, borderLeftColor: theme.colors.accent }]}>{l.text}</Text>
            ))}
          </Seccion>
        );
      });
  } else if (que === 'personajes') {
    cuerpo = produccion.characters.length === 0
      ? texto(undefined, t('filmmaker.noCharacters'))
      : produccion.characters.map((c) => ficha(c.id, c.name, c.identityDescription));
  } else if (que === 'lugares') {
    cuerpo = produccion.locations.length === 0
      ? texto(undefined, t('filmmaker.wsNoLocations'))
      : produccion.locations.map((l) => ficha(l.id, l.name, l.description));
  } else {
    const paleta = direccion.color?.palette ?? [];
    cuerpo = (
      <>
        <Seccion titulo={t('filmmaker.creativeDirection')}>
          {texto(formato.lista([direccion.visualStyle, direccion.mood, direccion.color?.grading].filter((x): x is string => !!x)), t('filmmaker.noCreativeDirection'))}
          {paleta.length > 0 && (
            <View style={styles.paleta}>
              {paleta.map((c) => <View key={c} style={[styles.color, { backgroundColor: c, borderColor: theme.colors.border }]} />)}
            </View>
          )}
        </Seccion>
        <Seccion titulo={t('filmmaker.wsReferencesList')}>
          {produccion.references.length === 0
            ? texto(undefined, t('filmmaker.wsNoReferences'))
            : produccion.references.map((r) => ficha(r.id, r.description ?? r.id))}
        </Seccion>
      </>
    );
  }

  return (
    <HojaInferior visible titulo={t(TITULO[que])} subtitulo={t('filmmaker.wsReferencesReadOnly')} onCerrar={onCerrar}>
      {cuerpo}
    </HojaInferior>
  );
};

const styles = StyleSheet.create({
  texto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5 },
  ficha: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: 4 },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any },
  linea: { fontSize: FONT_SIZE.sm, fontStyle: 'italic', borderLeftWidth: 2, paddingLeft: SPACING.sm },
  paleta: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  color: { width: 28, height: 28, borderRadius: 6, borderWidth: 1 },
});

export default ProductionStructureSheet;
