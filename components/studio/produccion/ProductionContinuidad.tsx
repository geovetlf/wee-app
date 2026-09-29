import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import { EspacioDeFilmmaker, elegidoDe } from './espacio';
import type { ContinuityRule, ContinuityStrength, FilmmakerOperation } from '../../../services/filmmaker/dominio';
import { ASPECTOS_DE_CONTINUIDAD_VISIBLES, FUERZAS_VISIBLES } from '../../../constants/filmmaker';
import { alternarAspecto, conFuerza, continuidadDelNivel, estadoDelAspecto } from '../../../utils/continuidadEditable';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';

const isWeb = Platform.OS === 'web';

/**
 * LA CONTINUIDAD, EDITABLE (Fase 24 del motor: la historia y la continuidad).
 *
 * Qué tiene que seguir igual —la cara, el peinado, la ropa, dónde está cada uno, cómo están los objetos, el lugar, la
 * luz, la hora, el estilo, o seguir justo del plano anterior— y con cuánta fuerza, en la producción entera, en una
 * escena o en un plano. F1-A la guarda en esos tres niveles y, aspecto por aspecto, manda el más cercano
 * (`utils/continuidadEditable.ts` calcula qué escribir, con `change_continuity`). Lo que llega de arriba se ve marcado
 * y se dice de dónde viene; tocarlo aquí lo cambia solo aquí. Lo que se conserva viaja a cada toma: el vídeo lo recibe.
 */
const ProductionContinuidad: React.FC<{ espacio: EspacioDeFilmmaker; nivel?: 'produccion' | 'seleccion' }> = ({ espacio, nivel = 'seleccion' }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, seleccion, editable, onGesto } = espacio;
  const [aviso, setAviso] = useState<string | null>(null);
  const elegido = nivel === 'seleccion' ? elegidoDe(produccion, seleccion) : null;
  if (nivel === 'seleccion' && !elegido) return null;
  const escena = elegido?.escena;
  const plano = elegido?.plano;
  const n = continuidadDelNivel(produccion, escena, plano);
  /* El aviso es del nivel en el que se dio: al elegir otro plano no se arrastra. */
  const nivelId = plano?.id ?? escena?.id ?? 'produccion';
  const objetivo = plano ? { scope: 'shot' as const, shotId: plano.id } : escena ? { scope: 'scene' as const, sceneId: escena.id } : { scope: 'production' as const };
  const poner = (regla: ContinuityRule | null) => onGesto([{ op: 'change_continuity', target: objetivo, continuity: regla } as FilmmakerOperation]);
  const alternar = (aspecto: string, conservarlo: boolean) => {
    const r = alternarAspecto(n, aspecto, conservarlo);
    if (!r.ok) { setAviso(nivelId); return; }
    setAviso(null);
    poner(r.regla);
  };
  const fuerzaQueVale = n.efectiva ? (n.efectiva.strength ?? 'standard') : undefined;
  const ocultos = (n.efectiva?.preserve ?? []).filter((a) => !ASPECTOS_DE_CONTINUIDAD_VISIBLES.some((v) => v.aspecto === a)).length;
  const hayHeredados = ASPECTOS_DE_CONTINUIDAD_VISIBLES.some(({ aspecto }) => estadoDelAspecto(n, aspecto).heredado);
  const pastilla = (clave: string, activa: boolean, alPulsar: () => void, rol: 'checkbox' | 'radio', deshabilitada = false, etiqueta?: string) => (
    <TouchableOpacity
      key={clave}
      onPress={alPulsar}
      disabled={!editable || deshabilitada}
      accessibilityRole={rol}
      accessibilityLabel={etiqueta ?? t(clave)}
      accessibilityState={{ checked: activa, disabled: !editable || deshabilitada }}
      style={[styles.opcion, { backgroundColor: activa ? theme.colors.accent : theme.colors.surface, borderColor: activa ? theme.colors.accent : theme.colors.border },
        (!editable || deshabilitada) && { opacity: OPACITY.disabled }, isWeb && ({ cursor: editable && !deshabilitada ? 'pointer' : 'default' } as object)]}
    >
      <Text style={[styles.opcionTexto, { color: activa ? '#1F2937' : theme.colors.text }]} numberOfLines={1}>{t(clave)}</Text>
    </TouchableOpacity>
  );
  const donde = plano ? 'filmmaker.wsContinuityInShot' : escena ? 'filmmaker.wsContinuityInScene' : 'filmmaker.wsContinuityInProduction';
  return (
    <Seccion titulo={t('filmmaker.wsContinuityTitle')}>
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(donde)}</Text>
      <View style={styles.opciones}>
        {ASPECTOS_DE_CONTINUIDAD_VISIBLES.map(({ aspecto, clave }) => {
          const e = estadoDelAspecto(n, aspecto);
          return pastilla(clave, e.conservado, () => alternar(aspecto, !e.conservado), 'checkbox', false,
            e.heredado ? t('filmmaker.wsContinuityInheritedAspect', { aspecto: t(clave) }) : t(clave));
        })}
      </View>
      {ocultos > 0 && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsContinuityMore', { contador: ocultos })}</Text>}
      {hayHeredados && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(plano ? 'filmmaker.wsContinuityInheritedShot' : 'filmmaker.wsContinuityInheritedScene')}</Text>}
      {aviso === nivelId && <Text style={[styles.nota, { color: theme.colors.error }]}>{t('filmmaker.wsContinuityNeedsOne')}</Text>}
      <Text style={[styles.etiqueta, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsContinuityHow')}</Text>
      <View style={styles.opciones}>
        {FUERZAS_VISIBLES.map(({ fuerza, clave }) => pastilla(clave, fuerzaQueVale === fuerza, () => {
          const regla = conFuerza(n, fuerza as ContinuityStrength);
          if (regla) poner(regla);
        }, 'radio', !n.propia))}
      </View>
      {!n.propia && !!n.efectiva && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsContinuityStrengthInherited')}</Text>}
      {!!n.propia && !!escena && (
        <BotonPequeno
          icono="arrow-undo-outline"
          etiqueta={t(plano ? 'filmmaker.wsContinuityUseScene' : 'filmmaker.wsContinuityUseProduction')}
          onPress={() => { setAviso(null); poner(null); }}
          disabled={!editable}
          conTexto
        />
      )}
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsContinuityGoesToTake')}</Text>
    </Seccion>
  );
};

const styles = StyleSheet.create({
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  etiqueta: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 34, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
});

export default ProductionContinuidad;
