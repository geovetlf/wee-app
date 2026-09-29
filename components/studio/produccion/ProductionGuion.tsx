import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import { Aviso, BotonPequeno, Seccion } from './ProductionPiezas';
import type { EspacioDeFilmmaker } from './espacio';
import { LIMITES, PROPOSITOS_NARRATIVOS } from '../../../services/filmmaker/dominio';
import type { DialogueLine, NarrativePurpose } from '../../../services/filmmaker/dominio';
import { CLAVE_DEL_PROPOSITO, TIPOS_DE_LINEA } from '../../../constants/filmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/** Una fila de pastillas de las que se elige una. */
const Opciones: React.FC<{
  opciones: readonly { valor: string; texto: string; apagada?: boolean }[];
  elegida?: string;
  editable: boolean;
  grupo: string;
  onElegir: (v: string | null) => void;
  sinQuitar?: boolean;
}> = ({ opciones, elegida, editable, grupo, onElegir, sinQuitar }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  return (
    <View style={styles.opciones}>
      {opciones.map((o) => {
        const esta = o.valor === elegida;
        const puede = editable && !o.apagada;
        return (
          <TouchableOpacity
            key={o.valor}
            onPress={() => onElegir(esta ? (sinQuitar ? o.valor : null) : o.valor)}
            disabled={!puede}
            accessibilityRole="button"
            accessibilityLabel={t('filmmaker.wsSettingIs', { ajuste: grupo, valor: o.texto })}
            accessibilityState={{ selected: esta, disabled: !puede }}
            style={[styles.opcion, { backgroundColor: esta ? theme.colors.accent : theme.colors.surface, borderColor: esta ? theme.colors.accent : theme.colors.border },
              !puede && { opacity: OPACITY.disabled }, isWeb && ({ cursor: puede ? 'pointer' : 'default' } as object)]}
          >
            <Text style={[styles.opcionTexto, { color: esta ? '#1F2937' : theme.colors.text }]}>{o.texto}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * EL GUION, EDITABLE (Fase 24 del motor: la historia).
 *
 * La historia de corrido, escena a escena: para qué sirve cada una en el relato —gancho, planteamiento, desarrollo,
 * giro, clímax, desenlace, revelación, transición o llamada a la acción (`update_scene`)— y sus líneas, con quién las
 * dice y cómo: a cámara, en off o narradas. Una línea se corrige, cambia de forma o se quita con las operaciones de
 * F1-A de siempre (`change_dialogue`, `remove_dialogue`); las nuevas se añaden donde se dirigen —en «Texto», con el
 * plano elegido—, que es donde se elige quién las dice.
 *
 * Y se dice la verdad: una línea A CÁMARA impide hoy generar su plano, porque el vídeo todavía no sincroniza voces
 * (`dialogue_not_supported`, F1-D). Se avisa en la línea, antes de generar, y pasarla a voz en off lo deja generar.
 * Nada de esto genera ni cobra.
 */
const ProductionGuion: React.FC<{ espacio: EspacioDeFilmmaker; onIrAlPlano?: () => void }> = ({ espacio, onIrAlPlano }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, editable, onGesto, onSeleccionar } = espacio;
  const [editando, setEditando] = useState<string | null>(null);
  const nombreDe = (l: DialogueLine) => (l.kind === 'narration' ? t('filmmaker.audioNarrator') : produccion.characters.find((c) => c.id === l.characterId)?.name);
  const claveDelTipo = (k: DialogueLine['kind']) => TIPOS_DE_LINEA.find((x) => x.kind === k)?.clave ?? 'filmmaker.audioDialogue';
  if (!produccion.scenes.length) return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsNothingYet')}</Text>;
  return (
    <View style={styles.bloque}>
      {produccion.scenes.map((s, i) => {
        const lineas = [
          ...(s.dialogue ?? []).map((l) => ({ l, plano: undefined as number | undefined })),
          ...s.shots.flatMap((p, j) => (p.dialogue ?? []).map((l) => ({ l, plano: j + 1 }))),
        ];
        return (
          <Seccion key={s.id} titulo={s.title ? t('filmmaker.wsSceneCrumbTitled', { numero: i + 1, titulo: s.title }) : t('filmmaker.wsSceneCrumb', { numero: i + 1 })}>
            {!!s.description && <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>{s.description}</Text>}
            <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsScenePurpose')}</Text>
            <Opciones
              grupo={t('filmmaker.wsScenePurpose')}
              opciones={PROPOSITOS_NARRATIVOS.map((p) => ({ valor: p, texto: t(CLAVE_DEL_PROPOSITO[p]) }))}
              elegida={s.narrativePurpose}
              editable={editable}
              onElegir={(v) => onGesto([{ op: 'update_scene', sceneId: s.id, changes: { narrativePurpose: (v as NarrativePurpose | null) } }])}
            />
            {lineas.length === 0 && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsSceneNoLines')}</Text>}
            {lineas.map(({ l, plano }) => {
              const quien = nombreDe(l) ?? t('filmmaker.wsLineNobody');
              const abierta = editando === l.id;
              return (
                <View key={l.id} style={[styles.linea, { borderLeftColor: theme.colors.accent }]}>
                  <View style={styles.lineaCabecera}>
                    <Text style={[styles.quien, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {plano ? t('filmmaker.wsLineInShot', { quien, plano }) : quien}
                      {' · '}{t(claveDelTipo(l.kind))}
                    </Text>
                    {editable && (
                      <BotonPequeno
                        icono={abierta ? 'chevron-up' : 'create-outline'}
                        etiqueta={t(abierta ? 'filmmaker.wsLineClose' : 'filmmaker.wsEditLine', { quien })}
                        onPress={() => setEditando(abierta ? null : l.id)}
                      />
                    )}
                    {!!plano && (
                      <TouchableOpacity
                        onPress={() => { onSeleccionar({ tipo: 'plano', id: s.shots[plano - 1].id }); onIrAlPlano?.(); }}
                        accessibilityRole="button"
                        accessibilityLabel={t('filmmaker.wsGoToShot', { escena: i + 1, plano })}
                        style={isWeb ? ({ cursor: 'pointer' } as object) : undefined}
                      >
                        <Ionicons name="locate-outline" size={scale(16)} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.texto, { color: theme.colors.text }]}>{l.text}</Text>
                  {/* Solo cuenta donde se genera: la línea de un plano, o la de una escena sin planos. */}
                  {l.kind === 'dialogue' && (!!plano || s.shots.length === 0) && <Aviso texto={t('filmmaker.wsLineBlocksTake')} />}
                  {abierta && (
                    <View style={styles.dentro}>
                      <CampoQueCrece
                        etiqueta={t('filmmaker.wsLineText')}
                        valor={l.text}
                        maximo={LIMITES.linea}
                        etiquetaGuardar={t('common.save')}
                        editable={editable}
                        onGuardar={(texto) => { if (texto.trim()) onGesto([{ op: 'change_dialogue', lineId: l.id, changes: { text: texto.trim() } }]); }}
                      />
                      <Opciones
                        grupo={t('filmmaker.wsLineKind')}
                        opciones={TIPOS_DE_LINEA.map((k) => ({
                          valor: k.kind,
                          texto: t(k.clave),
                          /* De la narración a una voz hace falta saber quién habla: eso se elige en «Texto». */
                          apagada: l.kind === 'narration' && k.kind !== 'narration',
                        }))}
                        elegida={l.kind}
                        editable={editable}
                        sinQuitar
                        onElegir={(v) => {
                          if (!v || v === l.kind) return;
                          onGesto([{ op: 'change_dialogue', lineId: l.id, changes: v === 'narration' ? { kind: 'narration', characterId: null } : { kind: v as DialogueLine['kind'] } }]);
                        }}
                      />
                      {l.kind === 'narration' && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsLineNarrationNote')}</Text>}
                      <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.wsRemoveLine')} onPress={() => { setEditando(null); onGesto([{ op: 'remove_dialogue', lineId: l.id }]); }} conTexto />
                    </View>
                  )}
                </View>
              );
            })}
          </Seccion>
        );
      })}
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsScriptAddHint')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.lg },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any },
  texto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 32, paddingHorizontal: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium as any },
  linea: { borderLeftWidth: 2, paddingLeft: SPACING.sm, gap: 4 },
  lineaCabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  quien: { flex: 1, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any },
  dentro: { gap: SPACING.sm, paddingTop: SPACING.xs },
});

export default ProductionGuion;
