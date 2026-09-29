import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import { BotonPequeno, Chip } from './ProductionPiezas';
import type { EspacioDeFilmmaker } from './espacio';
import { LIMITES, PAPELES_DE_REFERENCIA } from '../../../services/filmmaker/dominio';
import type { ProductionReference } from '../../../services/filmmaker/dominio';
import { CLAVE_DEL_PAPEL_DE_REFERENCIA } from '../../../constants/filmmaker';
import { confirmAction } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * LAS REFERENCIAS DE LA PRODUCCIÓN, EDITABLES (Fase 23 del motor, el espacio de trabajo).
 *
 * Cada una es un material que ya existe —de Mis creaciones o de lo guardado— y la producción dice para qué sirve:
 * estilo, personaje, lugar, objeto, primer o último fotograma, movimiento, audio o general. Aquí se ve cada una, se
 * describe, se dice su papel y se quita (`update_reference`, `remove_reference`, las de F1-A). Qué material es no se
 * cambia aquí: eso lo elige la persona al añadirla, y el servidor lo comprueba al guardar.
 *
 * Y se dice la verdad sobre generar: hoy un plano con referencias no se puede generar (`references_not_supported`
 * hasta que se valide un modelo; Fase 18). Tenerlas en la producción no bloquea nada; ponerlas en un plano, sí.
 */
const ProductionReferencias: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, editable, onGesto } = espacio;
  const [abierta, setAbierta] = useState<string | null>(null);
  const refs = produccion.references;
  const nombre = (r: ProductionReference) => r.description || t(CLAVE_DEL_PAPEL_DE_REFERENCIA[r.role ?? 'general']);
  const quitar = async (r: ProductionReference) => {
    if (!(await confirmAction(t('filmmaker.wsReferenceRemoveConfirm', { nombre: nombre(r) }), '', t('filmmaker.remove'), true, t))) return;
    const res = onGesto([{ op: 'remove_reference', referenceId: r.id }]);
    if (!res.ok && res.problems.some((p) => p.code === 'operation_blocked')) {
      if (await confirmAction(t('filmmaker.wsReferenceRemoveConfirm', { nombre: nombre(r) }), t('filmmaker.wsReferenceRemoveLinked'), t('filmmaker.remove'), true, t)) {
        onGesto([{ op: 'remove_reference', referenceId: r.id, cascade: true }]);
      }
    }
  };
  return (
    <View style={styles.bloque}>
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsReferencesGenerateNote')}</Text>
      {refs.length === 0 && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsNoReferences')}</Text>}
      {refs.map((r) => {
        const esta = abierta === r.id;
        return (
          <View key={r.id} style={[styles.ficha, { backgroundColor: theme.colors.card, borderColor: esta ? theme.colors.accent : theme.colors.border }]}>
            <TouchableOpacity
              onPress={() => setAbierta(esta ? null : r.id)}
              style={[styles.cabecera, isWeb && ({ cursor: 'pointer' } as object)]}
              accessibilityRole="button"
              accessibilityState={{ expanded: esta }}
              accessibilityLabel={t(esta ? 'filmmaker.wsCardClose' : 'filmmaker.wsCardOpen', { nombre: nombre(r) })}
            >
              <Ionicons name={r.kind === 'video' ? 'videocam-outline' : r.kind === 'audio' ? 'musical-note-outline' : 'image-outline'} size={scale(16)} color={theme.colors.accent} />
              <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>{nombre(r)}</Text>
              {!!r.role && <Chip texto={t(CLAVE_DEL_PAPEL_DE_REFERENCIA[r.role])} />}
              <Ionicons name={esta ? 'chevron-up' : 'chevron-down'} size={scale(14)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {esta && (
              <View style={styles.dentro}>
                <CampoQueCrece
                  etiqueta={t('filmmaker.wsReferenceDescription')}
                  valor={r.description ?? ''}
                  maximo={LIMITES.frase}
                  etiquetaGuardar={t('common.save')}
                  editable={editable}
                  onGuardar={(texto) => onGesto([{ op: 'update_reference', referenceId: r.id, changes: { description: texto || null } }])}
                />
                <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsReferenceRole')}</Text>
                <View style={styles.opciones}>
                  {PAPELES_DE_REFERENCIA.map((p) => {
                    const elegida = r.role === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => onGesto([{ op: 'update_reference', referenceId: r.id, changes: { role: elegida ? null : p } }])}
                        disabled={!editable}
                        accessibilityRole="button"
                        accessibilityLabel={t(CLAVE_DEL_PAPEL_DE_REFERENCIA[p])}
                        accessibilityState={{ selected: elegida, disabled: !editable }}
                        style={[styles.opcion, { backgroundColor: elegida ? theme.colors.accent : theme.colors.surface, borderColor: elegida ? theme.colors.accent : theme.colors.border },
                          !editable && { opacity: OPACITY.disabled }]}
                      >
                        <Text style={[styles.opcionTexto, { color: elegida ? '#1F2937' : theme.colors.text }]}>{t(CLAVE_DEL_PAPEL_DE_REFERENCIA[p])}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.remove')} onPress={() => { void quitar(r); }} disabled={!editable} conTexto />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any },
  ficha: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, minHeight: 44 },
  nombre: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  dentro: { padding: SPACING.md, paddingTop: 0, gap: SPACING.sm },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 32, paddingHorizontal: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium as any },
});

export default ProductionReferencias;
