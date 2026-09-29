import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import ProductionShotGeneration from './ProductionShotGeneration';
import ProductionRecommendations from './ProductionRecommendations';
import ProductionDirectorPanel from './ProductionDirectorPanel';
import ProductionBrainBox from './ProductionBrainBox';
import { Seccion } from './ProductionPiezas';
import { EspacioDeFilmmaker, elegidoDe } from './espacio';
import { LIMITES } from '../../../services/filmmaker/dominio';
import type { FilmmakerOperation } from '../../../services/filmmaker/dominio';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

export type PestanaDelDirector = 'director' | 'referencias' | 'produccion';

/**
 * LOS TOQUES RÁPIDOS: cada uno es UNA operación de F1-A sobre lo elegido. El
 * estilo va al plano; la lluvia, la noche y la niebla, a su escena; el encuadre,
 * a la cámara del plano. Ninguno pide nada al servidor ni gasta un Credit: dirigen.
 *
 * El estilo se guarda como su TOKEN (`cinematic`), no como su nombre (Fase 22 del motor, arreglo R13).
 */
const TOQUES: readonly { clave: string; icono: string; op: (plano: string | undefined, escena: string) => FilmmakerOperation | null }[] = [
  { clave: 'filmmaker.wsChipCinematic', icono: 'film-outline', op: (p) => (p ? { op: 'change_style', target: { scope: 'shot', shotId: p }, style: 'cinematic' } : null) },
  { clave: 'filmmaker.wsChipRealistic', icono: 'camera-outline', op: (p) => (p ? { op: 'change_style', target: { scope: 'shot', shotId: p }, style: 'realistic' } : null) },
  { clave: 'filmmaker.wsChipRain', icono: 'rainy-outline', op: (_p, e) => ({ op: 'change_weather', sceneId: e, weather: 'rain' }) },
  { clave: 'filmmaker.wsChipNight', icono: 'moon-outline', op: (_p, e) => ({ op: 'change_time_of_day', sceneId: e, timeOfDay: 'night' }) },
  { clave: 'filmmaker.wsChipFog', icono: 'cloudy-outline', op: (_p, e) => ({ op: 'change_weather', sceneId: e, weather: 'fog' }) },
  { clave: 'filmmaker.wsChipCloseUp', icono: 'scan-outline', op: (p) => (p ? { op: 'change_camera', target: { scope: 'shot', shotId: p }, shotType: 'close_up' } : null) },
  { clave: 'filmmaker.wsChipWide', icono: 'expand-outline', op: (p) => (p ? { op: 'change_camera', target: { scope: 'shot', shotId: p }, shotType: 'wide' } : null) },
];

/**
 * EL PANEL DE LA DERECHA: WEË AI DIRECTOR, REFERENCIAS Y PRODUCCIÓN.
 *
 * «Weë AI Director» es lo del plano elegido: lo que se ve (su descripción, que es
 * lo que se pide), los toques rápidos, su vídeo —la toma de F1-D, con su precio,
 * sus calidades y sus Credits— y las sugerencias de F1-A. «Referencias» enseña
 * quién sale y dónde. «Producción» es el panel Director de siempre, con la
 * producción entera: intención, dirección creativa, formato, duración, avisos,
 * cambios pendientes, personajes y sonido.
 *
 * Las sugerencias son reglas deterministas de F1-A, no una conversación: se dice
 * así, sin fingir que alguien las está pensando.
 */
const ProductionDirectorTabs: React.FC<{
  espacio: EspacioDeFilmmaker;
  pestana: PestanaDelDirector;
  onPestana: (p: PestanaDelDirector) => void;
}> = ({ espacio, pestana, onPestana }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { produccion, seleccion, editable, onGesto, toma, recomendaciones, rechazadas, onRechazar, lista, porRehacer } = espacio;
  const elegido = elegidoDe(produccion, seleccion);

  const pestanas: readonly { id: PestanaDelDirector; clave: string }[] = [
    { id: 'director', clave: 'filmmaker.wsDirectorTab' },
    { id: 'referencias', clave: 'filmmaker.wsReferencesTab' },
    { id: 'produccion', clave: 'filmmaker.wsProductionTab' },
  ];

  const director = (
    <View style={styles.cuerpo}>
      <View style={styles.presentacion}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.glow }]}>
          <Ionicons name="sparkles" size={scale(16)} color={theme.colors.accent} />
        </View>
        <View style={styles.presentacionTextos}>
          <Text style={[styles.nombre, { color: theme.colors.text }]}>{t('filmmaker.wsDirectorTab')}</Text>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
            {elegido
              ? t('filmmaker.wsDirectorIntro', { plano: elegido.numeroDePlano ?? 1, escena: elegido.numeroDeEscena })
              : t('filmmaker.wsDirectorNoSelection')}
          </Text>
        </View>
      </View>

      {!!elegido && (
        <CampoQueCrece
          etiqueta={t('filmmaker.wsWhatWeSee')}
          valor={(elegido.plano ? elegido.plano.description : elegido.escena.description) ?? ''}
          placeholder={elegido.plano ? t('filmmaker.describeShot') : t('filmmaker.describeScene')}
          maximo={LIMITES.texto}
          etiquetaGuardar={t('common.save')}
          editable={editable}
          onGuardar={(texto) => onGesto([{ op: 'edit_text', target: elegido.plano ? { shotId: elegido.plano.id } : { sceneId: elegido.escena.id }, description: texto || null }])}
        />
      )}

      {!!elegido && (
        <Seccion titulo={t('filmmaker.wsQuickTouches')}>
          <View style={styles.toques}>
            {TOQUES.map((toque) => {
              const nombre = t(toque.clave);
              const op = toque.op(elegido.plano?.id, elegido.escena.id);
              if (!op) return null;
              return (
                <TouchableOpacity
                  key={toque.clave}
                  disabled={!editable}
                  onPress={() => onGesto([op])}
                  style={[styles.toque, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, isWeb && ({ cursor: editable ? 'pointer' : 'default' } as object)]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !editable }}
                  accessibilityLabel={t('filmmaker.wsApplyTouch', { toque: nombre })}
                >
                  <Ionicons name={toque.icono as any} size={scale(13)} color={theme.colors.accent} />
                  <Text style={[styles.toqueTexto, { color: theme.colors.text }]}>{nombre}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Seccion>
      )}

      {!!elegido && (
        <ProductionShotGeneration
          toma={toma}
          tipo={seleccion?.tipo === 'escena' ? 'escena' : 'plano'}
          video={espacio.videos.get(elegido.unitId) ?? null}
          formato={produccion.format.aspectRatio}
        />
      )}

      <Seccion titulo={t('filmmaker.wsSuggestions')}>
        <ProductionRecommendations
          recomendaciones={recomendaciones}
          produccion={produccion}
          rechazadas={rechazadas}
          editable={editable}
          onAceptar={onGesto}
          onRechazar={onRechazar}
        />
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsSuggestionsNote')}</Text>
      </Seccion>

      {/* Fase 20 del motor: Weë Brain con la producción delante; lo que proponga, lo aplica la persona. */}
      <ProductionBrainBox espacio={espacio} />
    </View>
  );

  const referencias = (() => {
    if (!elegido) return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsDirectorNoSelection')}</Text>;
    const ids = new Set([...(elegido.plano?.characterIds ?? []), ...(elegido.plano?.subject?.characterId ? [elegido.plano.subject.characterId] : []), ...(elegido.escena.characterIds ?? [])]);
    const quien = produccion.characters.filter((c) => ids.has(c.id));
    const lugar = elegido.escena.locationId ? produccion.locations.find((l) => l.id === elegido.escena.locationId) : undefined;
    const refs = produccion.references.filter((r) => (elegido.plano?.referenceIds ?? []).includes(r.id));
    return (
      <View style={styles.cuerpo}>
        <Seccion titulo={t('filmmaker.wsCharactersInShot')}>
          {quien.length === 0
            ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsNoCharactersInShot')}</Text>
            : quien.map((c) => (
              <View key={c.id} style={[styles.ficha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="person-outline" size={scale(16)} color={theme.colors.accent} />
                <View style={styles.fichaTextos}>
                  <Text style={[styles.fichaNombre, { color: theme.colors.text }]}>{c.name}</Text>
                  {!!c.identityDescription && <Text style={[styles.nota, { color: theme.colors.textSecondary }]} numberOfLines={3}>{c.identityDescription}</Text>}
                </View>
              </View>
            ))}
        </Seccion>
        <Seccion titulo={t('filmmaker.wsLocationOfScene')}>
          {lugar
            ? (
              <View style={[styles.ficha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="location-outline" size={scale(16)} color={theme.colors.accent} />
                <View style={styles.fichaTextos}>
                  <Text style={[styles.fichaNombre, { color: theme.colors.text }]}>{lugar.name}</Text>
                  {!!lugar.description && <Text style={[styles.nota, { color: theme.colors.textSecondary }]} numberOfLines={3}>{lugar.description}</Text>}
                </View>
              </View>
            )
            : <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsNoLocation')}</Text>}
        </Seccion>
        <Seccion titulo={t('filmmaker.wsReferencesList')}>
          <Text style={[styles.nota, { color: refs.length ? theme.colors.text : theme.colors.textSecondary }]}>
            {refs.length ? formato.lista(refs.map((r) => r.description ?? r.id)) : t('filmmaker.wsNoReferences')}
          </Text>
        </Seccion>
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsReferencesReadOnly')}</Text>
      </View>
    );
  })();

  return (
    <View style={styles.panel}>
      <View style={[styles.pestanas, { borderBottomColor: theme.colors.border }]} accessibilityRole="tablist">
        {pestanas.map((p) => {
          const activa = pestana === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => onPestana(p.id)}
              style={[styles.pestana, activa && { borderBottomColor: theme.colors.accent }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={t(p.clave)}
            >
              <Text style={[styles.pestanaTexto, { color: activa ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>{t(p.clave)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.dentro}>
        {pestana === 'director' && director}
        {pestana === 'referencias' && referencias}
        {pestana === 'produccion' && (
          <ProductionDirectorPanel
            produccion={produccion}
            seleccion={seleccion}
            recomendaciones={recomendaciones}
            lista={lista}
            porRehacer={porRehacer}
            rechazadas={rechazadas}
            editable={editable}
            onGesto={onGesto}
            onRechazar={onRechazar}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { flex: 1 },
  pestanas: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  pestana: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: SPACING.xs },
  pestanaTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any },
  scroll: { flex: 1 },
  dentro: { padding: SPACING.lg, gap: SPACING.lg },
  cuerpo: { gap: SPACING.lg },
  presentacion: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  presentacionTextos: { flex: 1, gap: 2 },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold as any },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  toques: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  toque: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  toqueTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium as any },
  ficha: { flexDirection: 'row', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  fichaTextos: { flex: 1, gap: 2 },
  fichaNombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
});

export default ProductionDirectorTabs;
