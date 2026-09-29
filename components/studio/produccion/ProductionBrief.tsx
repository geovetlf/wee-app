import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import { Seccion } from './ProductionPiezas';
import type { EspacioDeFilmmaker } from './espacio';
import { LIMITES, RITMOS, TIPOS_DE_PRODUCCION } from '../../../services/filmmaker/dominio';
import type { FilmmakerOperation } from '../../../services/filmmaker/dominio';
import { CLAVE_DEL_RITMO, CLAVE_DEL_TIPO_DE_PRODUCCION, DURACIONES_PEDIDAS_SEC, ESTILOS_CANONICOS, esElEstilo } from '../../../constants/filmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';

const isWeb = Platform.OS === 'web';

/** Una fila de opciones de las que se elige una; tocar la elegida la quita. */
const Opciones: React.FC<{ opciones: readonly { valor: string; texto: string }[]; elegida?: string | null; editable: boolean; onElegir: (v: string | null) => void }> = ({ opciones, elegida, editable, onElegir }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.opciones}>
      {opciones.map((o) => {
        const esta = o.valor === elegida;
        return (
          <TouchableOpacity
            key={o.valor}
            onPress={() => onElegir(esta ? null : o.valor)}
            disabled={!editable}
            accessibilityRole="button"
            accessibilityLabel={o.texto}
            accessibilityState={{ selected: esta, disabled: !editable }}
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
 * EL BRIEF DE LA PRODUCCIÓN, EDITABLE (Fase 23 del motor, el espacio de trabajo).
 *
 * La intención de F1-A —qué se quiere lograr, para quién, qué se cuenta, de qué va, con qué tono, qué tipo de pieza y
 * cuánto debería durar— se escribía al crear la producción y ya no se podía tocar: `change_intent` existía y nadie la
 * usaba. Aquí se cambia campo a campo, con la operación de siempre. Lo que la persona escribió al empezar se enseña
 * tal cual y no se edita: es su texto.
 */
export const ProductionBrief: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { produccion, editable, onGesto } = espacio;
  const intent = produccion.intent;
  const cambiar = (changes: Record<string, unknown>) => onGesto([{ op: 'change_intent', changes } as FilmmakerOperation]);
  const campo = (clave: string, etiqueta: string, max: number, placeholder?: string) => (
    <CampoQueCrece
      etiqueta={t(etiqueta)}
      valor={(intent as Record<string, unknown>)[clave] as string ?? ''}
      placeholder={placeholder ? t(placeholder) : undefined}
      maximo={max}
      etiquetaGuardar={t('common.save')}
      editable={editable}
      onGuardar={(texto) => cambiar({ [clave]: texto || null })}
    />
  );
  return (
    <View style={styles.bloque}>
      {!!intent.freeText && (
        <Seccion titulo={t('filmmaker.wsBriefOriginal')}>
          <Text style={[styles.original, { color: theme.colors.text, borderLeftColor: theme.colors.accent }]}>{intent.freeText}</Text>
        </Seccion>
      )}
      {campo('objective', 'filmmaker.wsBriefObjective', LIMITES.frase, 'filmmaker.wsBriefObjectiveHint')}
      {campo('audience', 'filmmaker.wsBriefAudience', LIMITES.frase)}
      {campo('narrative', 'filmmaker.wsBriefNarrative', LIMITES.frase)}
      {campo('theme', 'filmmaker.wsBriefTheme', LIMITES.frase)}
      {campo('tone', 'filmmaker.wsBriefTone', LIMITES.frase)}
      <Seccion titulo={t('filmmaker.wsBriefType')}>
        <Opciones
          opciones={TIPOS_DE_PRODUCCION.map((p) => ({ valor: p, texto: t(CLAVE_DEL_TIPO_DE_PRODUCCION[p]) }))}
          elegida={intent.productionType}
          editable={editable}
          onElegir={(v) => cambiar({ productionType: v })}
        />
      </Seccion>
      <Seccion titulo={t('filmmaker.wsBriefDuration')}>
        <Opciones
          opciones={DURACIONES_PEDIDAS_SEC.map((s) => ({ valor: String(s), texto: t('filmmaker.wsSecondsShort', { segundos: formato.numero(s) }) }))}
          elegida={intent.requestedDurationSec !== undefined ? String(intent.requestedDurationSec) : null}
          editable={editable}
          onElegir={(v) => cambiar({ requestedDurationSec: v === null ? null : Number(v) })}
        />
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsBriefDurationNote')}</Text>
      </Seccion>
    </View>
  );
};

/**
 * * LA DIRECCIÓN CREATIVA, EDITABLE (Fase 23 del motor). El estilo —su token, como en el visor—, el ánimo (`change_mood`), el tono, el
 * ritmo y el etalonaje de la producción entera, con `change_style` y `change_direction`, las de siempre. Lo que una
 * escena o un plano digan distinto sigue mandando sobre esto: F1-A lo resuelve (`creativoEfectivo`).
 */
export const ProductionDireccion: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, editable, onGesto } = espacio;
  const d = produccion.creativeDirection;
  const cambiar = (changes: Record<string, unknown>) => onGesto([{ op: 'change_direction', changes } as FilmmakerOperation]);
  const texto = (clave: 'mood' | 'tone', etiqueta: string) => (
    <CampoQueCrece
      etiqueta={t(etiqueta)}
      valor={d[clave] ?? ''}
      maximo={LIMITES.frase}
      etiquetaGuardar={t('common.save')}
      editable={editable}
      onGuardar={(v) => (clave === 'mood'
        /* El ánimo tiene su propia operación en F1-A (`change_mood`): `change_direction` no lo cambia. */
        ? onGesto([{ op: 'change_mood', target: { scope: 'production' }, mood: v || null }])
        : cambiar({ [clave]: v || null }))}
    />
  );
  return (
    <View style={styles.bloque}>
      <Seccion titulo={t('filmmaker.wsStyle')}>
        <Opciones
          opciones={ESTILOS_CANONICOS.map((e) => ({ valor: e.token, texto: t(e.clave) }))}
          elegida={ESTILOS_CANONICOS.find((e) => esElEstilo(d.visualStyle, e.token, t))?.token ?? null}
          editable={editable}
          onElegir={(v) => onGesto([{ op: 'change_style', target: { scope: 'production' }, style: v }])}
        />
      </Seccion>
      {texto('mood', 'filmmaker.wsDirectionMood')}
      {texto('tone', 'filmmaker.wsDirectionTone')}
      <Seccion titulo={t('filmmaker.wsDirectionPacing')}>
        <Opciones
          opciones={RITMOS.map((r) => ({ valor: r, texto: t(CLAVE_DEL_RITMO[r]) }))}
          elegida={d.pacing}
          editable={editable}
          onElegir={(v) => cambiar({ pacing: v })}
        />
      </Seccion>
      <CampoQueCrece
        etiqueta={t('filmmaker.wsDirectionGrading')}
        valor={d.color?.grading ?? ''}
        placeholder={t('filmmaker.wsDirectionGradingHint')}
        maximo={LIMITES.frase}
        etiquetaGuardar={t('common.save')}
        editable={editable}
        onGuardar={(v) => {
          const { grading: _antes, ...resto } = d.color ?? {};
          void _antes;
          const color = v ? { ...resto, grading: v } : resto;
          cambiar({ color: Object.keys(color).length ? color : null });
        }}
      />
      {!!d.color?.palette?.length && (
        <View style={styles.paleta} accessibilityLabel={t('filmmaker.wsDirectionPalette')}>
          {d.color.palette.map((c) => <View key={c} style={[styles.muestra, { backgroundColor: c, borderColor: theme.colors.border }]} />)}
        </View>
      )}
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsDirectionNote')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.md },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  original: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5, borderLeftWidth: 2, paddingLeft: SPACING.sm },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 34, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  paleta: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  muestra: { width: 28, height: 28, borderRadius: 6, borderWidth: 1 },
});
