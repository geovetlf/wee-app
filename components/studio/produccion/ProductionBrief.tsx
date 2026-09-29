import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import ProductionContinuidad from './ProductionContinuidad';
import type { EspacioDeFilmmaker } from './espacio';
import { LIMITES, RITMOS, TIPOS_DE_PRODUCCION } from '../../../services/filmmaker/dominio';
import type { FilmmakerOperation, IntentConstraint } from '../../../services/filmmaker/dominio';
import {
  CLAVE_DEL_RITMO, CLAVE_DEL_TIPO_DE_PRODUCCION, CLAVE_DE_LA_PROHIBICION, COLORES_DE_PALETA, DURACIONES_PEDIDAS_SEC, ESTILOS_CANONICOS, esElEstilo,
} from '../../../constants/filmmaker';
import {
  PROHIBICIONES, cabeOtroColor, conColor, conLimiteDeDuracion, conPersonajeObligado, conProhibicion, limiteDeDuracion, otrasReglas,
  personajesObligados, propiosDentro, sinRegla, tieneLaProhibicion,
} from '../../../utils/produccionEditable';
import type { AspectoVisual, Prohibicion } from '../../../utils/produccionEditable';
import { confirmAction } from '../../../utils/notify';
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

/** Unas pastillas que se encienden y se apagan: varias a la vez. */
const Interruptores: React.FC<{ opciones: readonly { valor: string; texto: string }[]; encendidas: ReadonlySet<string>; editable: boolean; onCambiar: (v: string, encendida: boolean) => void }> = ({ opciones, encendidas, editable, onCambiar }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.opciones}>
      {opciones.map((o) => {
        const esta = encendidas.has(o.valor);
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
 * EL BRIEF DE LA PRODUCCIÓN, EDITABLE (Fase 23 del motor, el espacio de trabajo).
 *
 * La intención de F1-A —qué se quiere lograr, para quién, qué se cuenta, de qué va, con qué tono, qué tipo de pieza y
 * cuánto debería durar— se escribía al crear la producción y ya no se podía tocar: `change_intent` existía y nadie la
 * usaba. Aquí se cambia campo a campo, con la operación de siempre. Lo que la persona escribió al empezar se enseña
 * tal cual y no se edita: es su texto.
 *
 * Fase 31 del motor: el NOMBRE de la producción (`rename_production`, que existía y nadie usaba: «se elige al crearla»
 * dejó de ser verdad) y las REGLAS DE LA PIEZA —las restricciones de F1-A que se pueden comprobar: sin diálogo, sin
 * música, sin narración, quién tiene que salir y cuánto puede durar como mucho y como poco—. No son adorno: F1-A las
 * coteja con la producción y avisa en la lista cuando algo no las cumple, y la toma no genera sonido propio en una pieza
 * «sin música» o «sin diálogo». Las que no tienen control (un formato obligado, una nota) se enseñan y se pueden quitar.
 */
export const ProductionBrief: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { produccion, editable, onGesto } = espacio;
  const intent = produccion.intent;
  const cambiar = (changes: Record<string, unknown>) => onGesto([{ op: 'change_intent', changes } as FilmmakerOperation]);
  const reglas = intent.constraints;
  const ponerReglas = (constraints: readonly IntentConstraint[] | null) => cambiar({ constraints });
  const obligados = new Set(personajesObligados(reglas));
  const prohibidas = new Set<string>(PROHIBICIONES.filter((k) => tieneLaProhibicion(reglas, k)));
  const duraciones = (kind: 'max_duration' | 'min_duration') => {
    const limite = limiteDeDuracion(reglas, kind);
    return (
      <Opciones
        opciones={DURACIONES_PEDIDAS_SEC.map((s) => ({ valor: String(s), texto: t('filmmaker.wsSecondsShort', { segundos: formato.numero(s) }) }))}
        elegida={limite !== undefined ? String(limite) : null}
        editable={editable}
        onElegir={(v) => ponerReglas(conLimiteDeDuracion(reglas, kind, v === null ? null : Number(v)))}
      />
    );
  };
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
      <CampoQueCrece
        etiqueta={t('filmmaker.wsProductionName')}
        valor={produccion.title}
        maximo={LIMITES.nombre}
        etiquetaGuardar={t('common.save')}
        editable={editable}
        onGuardar={(texto) => { if (texto.trim()) onGesto([{ op: 'rename_production', title: texto.trim() }]); }}
      />
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
      <Seccion titulo={t('filmmaker.wsRules')}>
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsRulesNote')}</Text>
        <Interruptores
          opciones={PROHIBICIONES.map((k) => ({ valor: k, texto: t(CLAVE_DE_LA_PROHIBICION[k]) }))}
          encendidas={prohibidas}
          editable={editable}
          onCambiar={(k, si) => ponerReglas(conProhibicion(reglas, k as Prohibicion, si))}
        />
        {produccion.characters.length > 0 && (
          <>
            <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsRulesMustAppear')}</Text>
            <Interruptores
              opciones={produccion.characters.map((c) => ({ valor: c.id, texto: c.name }))}
              encendidas={obligados}
              editable={editable}
              onCambiar={(id, si) => ponerReglas(conPersonajeObligado(reglas, id, si))}
            />
          </>
        )}
        <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsRulesMaxDuration')}</Text>
        {duraciones('max_duration')}
        <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsRulesMinDuration')}</Text>
        {duraciones('min_duration')}
        {otrasReglas(reglas).map(({ indice, regla }) => (
          <View key={`regla-${indice}`} style={[styles.otraRegla, { borderColor: theme.colors.border }]}>
            <Text style={[styles.otraReglaTexto, { color: theme.colors.text }]}>
              {regla.kind === 'aspect_ratio' ? t('filmmaker.wsRuleAspect', { formato: regla.aspectRatio }) : regla.kind === 'note' ? regla.text : ''}
            </Text>
            <BotonPequeno icono="trash-outline" etiqueta={t('filmmaker.wsRuleRemove')} onPress={() => ponerReglas(sinRegla(reglas, indice))} disabled={!editable} />
          </View>
        ))}
      </Seccion>
    </View>
  );
};

/**
 * * LA DIRECCIÓN CREATIVA, EDITABLE (Fase 23 del motor). El estilo —su token, como en el visor—, el ánimo (`change_mood`), el tono, el
 * ritmo y el etalonaje de la producción entera, con `change_style` y `change_direction`, las de siempre. Lo que una
 * escena o un plano digan distinto sigue mandando sobre esto: F1-A lo resuelve (`creativoEfectivo`).
 *
 * Fase 31 del motor: la PALETA, que llega a cada toma («palette #…») y solo se podía mirar, se elige aquí. Y como F1-A,
 * al fijar el estilo o el ánimo de toda la producción, quita el que tuviera cada escena o plano, eso se pregunta antes
 * diciendo cuántos se perderían (desde esta fase se pueden fijar en el panel de cada uno).
 */
export const ProductionDireccion: React.FC<{ espacio: EspacioDeFilmmaker }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, editable, onGesto } = espacio;
  const d = produccion.creativeDirection;
  const cambiar = (changes: Record<string, unknown>) => onGesto([{ op: 'change_direction', changes } as FilmmakerOperation]);
  /* Fijarlo en toda la producción quita lo propio de dentro: si hay algo que perder, se pregunta antes. */
  const sinPisar = async (aspecto: AspectoVisual, aplicar: () => void) => {
    const n = propiosDentro(produccion, aspecto);
    if (n > 0 && !(await confirmAction(
      t(aspecto === 'style' ? 'filmmaker.wsOverrideStyleConfirm' : 'filmmaker.wsOverrideMoodConfirm', { contador: n }),
      t('filmmaker.wsOverrideDetail'),
      t('filmmaker.wsOverrideApply'),
      false,
      t,
    ))) return;
    aplicar();
  };
  const paleta = d.color?.palette ?? [];
  const ponerColor = (hex: string, poner: boolean) => cambiar({ color: conColor(d.color, hex, poner) });
  const texto = (clave: 'mood' | 'tone', etiqueta: string) => (
    <CampoQueCrece
      etiqueta={t(etiqueta)}
      valor={d[clave] ?? ''}
      maximo={LIMITES.frase}
      etiquetaGuardar={t('common.save')}
      editable={editable}
      onGuardar={(v) => {
        /* El ánimo tiene su propia operación en F1-A (`change_mood`): `change_direction` no lo cambia. */
        if (clave === 'mood') void sinPisar('mood', () => onGesto([{ op: 'change_mood', target: { scope: 'production' }, mood: v || null }]));
        else cambiar({ [clave]: v || null });
      }}
    />
  );
  return (
    <View style={styles.bloque}>
      <Seccion titulo={t('filmmaker.wsStyle')}>
        <Opciones
          opciones={ESTILOS_CANONICOS.map((e) => ({ valor: e.token, texto: t(e.clave) }))}
          elegida={ESTILOS_CANONICOS.find((e) => esElEstilo(d.visualStyle, e.token, t))?.token ?? null}
          editable={editable}
          onElegir={(v) => { void sinPisar('style', () => onGesto([{ op: 'change_style', target: { scope: 'production' }, style: v }])); }}
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
      <Seccion titulo={t('filmmaker.wsDirectionPalette')}>
        {paleta.length === 0
          ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsPaletteEmpty')}</Text>
          : (
            <View style={styles.paleta}>
              {paleta.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => ponerColor(c, false)}
                  disabled={!editable}
                  accessibilityRole="button"
                  accessibilityLabel={t('filmmaker.wsPaletteRemove', { color: c })}
                  accessibilityState={{ disabled: !editable }}
                  style={[styles.muestra, { backgroundColor: c, borderColor: theme.colors.text }, isWeb && ({ cursor: editable ? 'pointer' : 'default' } as object)]}
                />
              ))}
            </View>
          )}
        <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsPaletteOffer')}</Text>
        <View style={styles.paleta}>
          {COLORES_DE_PALETA.filter((c) => !paleta.some((x) => x.toUpperCase() === c)).map((c) => {
            const puede = editable && cabeOtroColor(d.color);
            return (
              <TouchableOpacity
                key={c}
                onPress={() => ponerColor(c, true)}
                disabled={!puede}
                accessibilityRole="button"
                accessibilityLabel={t('filmmaker.wsPaletteAdd', { color: c })}
                accessibilityState={{ disabled: !puede }}
                style={[styles.muestra, { backgroundColor: c, borderColor: theme.colors.border }, !puede && { opacity: OPACITY.disabled },
                  isWeb && ({ cursor: puede ? 'pointer' : 'default' } as object)]}
              />
            );
          })}
        </View>
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(cabeOtroColor(d.color) ? 'filmmaker.wsPaletteNote' : 'filmmaker.wsPaletteFull')}</Text>
      </Seccion>
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsDirectionNote')}</Text>
      {/* Fase 24 del motor: lo que tiene que seguir igual en toda la producción. */}
      <ProductionContinuidad espacio={espacio} nivel="produccion" />
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
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any },
  paleta: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  muestra: { width: 32, height: 32, borderRadius: 6, borderWidth: 1 },
  otraRegla: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingLeft: SPACING.sm, paddingVertical: SPACING.xs, paddingRight: SPACING.xs },
  otraReglaTexto: { flex: 1, fontSize: FONT_SIZE.sm },
});
