import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import { Chip, Seccion } from './ProductionPiezas';
import { EspacioDeFilmmaker, elegidoDe } from './espacio';
import { LIMITES, estadoEfectivo, repartoDelPlano } from '../../../services/filmmaker/dominio';
import type { FilmmakerOperation } from '../../../services/filmmaker/dominio';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';

const isWeb = Platform.OS === 'web';

/** Unas pastillas que se encienden y se apagan: varias a la vez. */
const Varias: React.FC<{ opciones: readonly { valor: string; texto: string }[]; elegidas: ReadonlySet<string>; editable: boolean; onCambiar: (v: string, encendida: boolean) => void }> = ({ opciones, elegidas, editable, onCambiar }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.opciones}>
      {opciones.map((o) => {
        const esta = elegidas.has(o.valor);
        return (
          <TouchableOpacity
            key={o.valor}
            onPress={() => onCambiar(o.valor, !esta)}
            disabled={!editable}
            accessibilityRole="checkbox"
            accessibilityLabel={o.texto}
            accessibilityState={{ checked: esta, disabled: !editable }}
            style={[styles.opcion, { backgroundColor: esta ? theme.colors.accent : theme.colors.surface, borderColor: esta ? theme.colors.accent : theme.colors.border },
              !editable && { opacity: OPACITY.disabled }, isWeb && ({ cursor: editable ? 'pointer' : 'default' } as object)]}
          >
            <Text style={[styles.opcionTexto, { color: esta ? '#1F2937' : theme.colors.text }]} numberOfLines={1}>{o.texto}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * QUIÉN Y QUÉ HAY EN LO ELEGIDO, EDITABLE (Fase 23 del motor, el espacio de trabajo; antes se leía y nada más).
 *
 * El reparto del plano (o de la escena), su estado —vestuario y cómo está: postura, gesto, emoción, en palabras—,
 * los objetos que salen, el lugar de la escena y las referencias del plano. Todo con operaciones de F1-A que ya
 * existían (`update_shot`, `update_scene`, `set_character_state`, `change_location`), sin un grafo paralelo: las
 * fichas son las de la producción, y aquí solo se dice cuáles salen.
 *
 * Lo heredado se dice: un plano sin reparto propio sale con el de su escena (`repartoDelPlano`), y el estado de un
 * personaje en un plano es el de la escena salvo que el plano diga otro (`estadoEfectivo`). Tocarlo lo hace propio.
 *
 * Y las referencias, con la verdad: ponerlas en un plano hoy impide generarlo, hasta que se valide un modelo que las
 * use (Fase 18). Se avisa antes, no después.
 */
const ProductionEnElPlano: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, seleccion, editable, onGesto } = espacio;
  const [estadoDe, setEstadoDe] = useState<string | null>(null);
  const elegido = elegidoDe(produccion, seleccion);
  if (!elegido) return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsDirectorNoSelection')}</Text>;
  const { escena, plano } = elegido;
  const reparto = new Set(plano ? repartoDelPlano(escena, plano) : escena.characterIds ?? []);
  const heredado = !!plano && plano.characterIds === undefined && (escena.characterIds?.length ?? 0) > 0;
  const objetos = new Set((plano ? plano.objectIds : escena.objectIds) ?? []);
  const referencias = new Set(plano?.referenceIds ?? []);
  const cambiarLista = (campo: 'characterIds' | 'objectIds' | 'referenceIds', actual: ReadonlySet<string>, id: string, encendida: boolean) => {
    const nueva = encendida ? [...actual, id] : [...actual].filter((x) => x !== id);
    const op: FilmmakerOperation = plano
      ? { op: 'update_shot', shotId: plano.id, changes: { [campo]: nueva.length ? nueva : null } } as FilmmakerOperation
      : { op: 'update_scene', sceneId: escena.id, changes: { [campo]: nueva.length ? nueva : null } } as FilmmakerOperation;
    onGesto([op]);
  };
  const objetivo = plano ? { shotId: plano.id } : { sceneId: escena.id };
  const conEstado = estadoDe && reparto.has(estadoDe) ? estadoDe : null;
  const estado = conEstado ? estadoEfectivo(escena, plano, conEstado) : undefined;
  return (
    <View style={styles.bloque}>
      <Seccion titulo={t(plano ? 'filmmaker.wsCharactersInShot' : 'filmmaker.wsCharactersInScene')}>
        {produccion.characters.length === 0
          ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsCastEmpty')}</Text>
          : (
            <Varias
              opciones={produccion.characters.map((c) => ({ valor: c.id, texto: c.name }))}
              elegidas={reparto}
              editable={editable}
              onCambiar={(id, si) => cambiarLista('characterIds', reparto, id, si)}
            />
          )}
        {heredado && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsCastInherited')}</Text>}
      </Seccion>

      {reparto.size > 0 && (
        <Seccion titulo={t('filmmaker.wsCharacterState')}>
          <View style={styles.opciones}>
            {[...reparto].map((id) => {
              const c = produccion.characters.find((x) => x.id === id);
              if (!c) return null;
              const activo = conEstado === id;
              return (
                <TouchableOpacity key={id} onPress={() => setEstadoDe(activo ? null : id)} accessibilityRole="button" accessibilityState={{ selected: activo }} accessibilityLabel={t('filmmaker.wsCharacterStateOf', { nombre: c.name })}
                  style={[styles.opcion, { backgroundColor: activo ? theme.colors.glow : theme.colors.surface, borderColor: activo ? theme.colors.accent : theme.colors.border }]}>
                  <Text style={[styles.opcionTexto, { color: theme.colors.text }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!conEstado && (
            <>
              <CampoQueCrece
                etiqueta={t('filmmaker.wsWardrobe')}
                valor={estado?.wardrobe ?? ''}
                maximo={LIMITES.frase}
                etiquetaGuardar={t('common.save')}
                editable={editable}
                onGuardar={(texto) => onGesto([{ op: 'set_character_state', target: objetivo, characterId: conEstado, wardrobe: texto || null }])}
              />
              <CampoQueCrece
                etiqueta={t('filmmaker.wsHowTheyAre')}
                valor={estado?.appearanceNotes ?? ''}
                placeholder={t('filmmaker.wsHowTheyAreHint')}
                maximo={LIMITES.frase}
                etiquetaGuardar={t('common.save')}
                editable={editable}
                onGuardar={(texto) => onGesto([{ op: 'set_character_state', target: objetivo, characterId: conEstado, appearanceNotes: texto || null }])}
              />
              <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(plano ? 'filmmaker.wsStateInheritedShot' : 'filmmaker.wsStateScene')}</Text>
            </>
          )}
        </Seccion>
      )}

      <Seccion titulo={t(plano ? 'filmmaker.wsObjectsInShot' : 'filmmaker.wsObjectsInScene')}>
        {produccion.objects.length === 0
          ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsObjectEmpty')}</Text>
          : (
            <Varias
              opciones={produccion.objects.map((o) => ({ valor: o.id, texto: o.name }))}
              elegidas={objetos}
              editable={editable}
              onCambiar={(id, si) => cambiarLista('objectIds', objetos, id, si)}
            />
          )}
      </Seccion>

      <Seccion titulo={t('filmmaker.wsLocationOfScene')}>
        {produccion.locations.length === 0
          ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsPlaceEmpty')}</Text>
          : (
            <Varias
              opciones={produccion.locations.map((l) => ({ valor: l.id, texto: l.name }))}
              elegidas={new Set(escena.locationId ? [escena.locationId] : [])}
              editable={editable}
              onCambiar={(id, si) => onGesto([{ op: 'change_location', sceneId: escena.id, locationId: si ? id : null }])}
            />
          )}
      </Seccion>

      {!!plano && (
        <Seccion titulo={t('filmmaker.wsReferencesList')}>
          {produccion.references.length === 0
            ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsNoReferences')}</Text>
            : (
              <Varias
                opciones={produccion.references.map((r) => ({ valor: r.id, texto: r.description || r.id }))}
                elegidas={referencias}
                editable={editable}
                onCambiar={(id, si) => cambiarLista('referenceIds', referencias, id, si)}
              />
            )}
          {referencias.size > 0 && <Chip texto={t('filmmaker.wsReferencesBlockTake')} icono="alert-circle-outline" tono="aviso" />}
        </Seccion>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.lg },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 34, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
});

export default ProductionEnElPlano;
