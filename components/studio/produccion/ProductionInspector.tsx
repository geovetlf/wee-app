import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import { Seccion } from './ProductionPiezas';
import { FAMILIAS_DE_CAMARA } from '../../../constants/camaraCinematica';
import { CLAVE_DEL_CLIMA, CLAVE_DEL_MOMENTO, FAMILIAS_DEL_DIRECTOR, OPERACION_DE_LA_RUTA } from '../../../constants/filmmaker';
import { CLIMAS, LIMITES, MOMENTOS_DEL_DIA, buscarEscena, buscarPlano, valorCreativo } from '../../../services/filmmaker/dominio';
import type { CreativeParameterPath, FilmmakerOperation, FilmmakerProduction, ProductionScene, ProductionShot, TimeOfDay, Weather } from '../../../services/filmmaker/dominio';
import type { Seleccion } from './ProductionStoryboard';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';

const isWeb = Platform.OS === 'web';

/** Una fila de opciones de las que se elige una; tocar la elegida la quita. */
const Opciones: React.FC<{
  opciones: readonly { valor: string; texto: string }[];
  elegida?: string;
  editable: boolean;
  onElegir: (valor: string | null) => void;
}> = ({ opciones, elegida, editable, onElegir }) => {
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
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={o.texto}
            accessibilityState={{ selected: esta, disabled: !editable }}
            style={[
              styles.opcion,
              { backgroundColor: esta ? theme.colors.accent : theme.colors.card, borderColor: esta ? theme.colors.accent : theme.colors.border },
              !editable && { opacity: OPACITY.disabled },
              isWeb && ({ cursor: editable ? 'pointer' : 'default' } as any),
            ]}
          >
            <Text style={[styles.opcionTexto, { color: esta ? '#1F2937' : theme.colors.text }]} numberOfLines={1}>{o.texto}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * DIRIGIR LO ELEGIDO: la escena o el plano tocado en el storyboard.
 *
 * Solo lo que F1-A sabe cambiar con una operación: el título y la descripción
 * (`edit_text`), el clima y el momento del día de una escena
 * (`change_weather`, `change_time_of_day`) y la cámara, el encuadre, el
 * movimiento y la luz (`change_camera`, `change_movement`, `change_lighting`)
 * con el vocabulario de la biblioteca de Weë Studio. Personajes, lugares,
 * referencias y la intención se ven, pero no se editan aquí: F1-A todavía no
 * tiene operaciones para ellos, y no se inventan.
 */
const ProductionInspector: React.FC<{
  produccion: FilmmakerProduction;
  seleccion: Seleccion;
  editable: boolean;
  onGesto: (ops: readonly FilmmakerOperation[]) => void;
}> = ({ produccion, seleccion, editable, onGesto }) => {
  const { theme } = useTheme();
  const t = useT();
  const escena: ProductionScene | undefined = seleccion?.tipo === 'escena' ? buscarEscena(produccion, seleccion.id)?.scene : undefined;
  const ubicacion = seleccion?.tipo === 'plano' ? buscarPlano(produccion, seleccion.id) : undefined;
  const plano: ProductionShot | undefined = ubicacion?.shot;

  if (!escena && !plano) {
    return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.selectSomething')}</Text>;
  }

  const objetivo = plano
    ? { scope: 'shot' as const, shotId: plano.id }
    : { scope: 'scene' as const, sceneId: (escena as ProductionScene).id };
  const creativo = plano ? plano.visual?.creative : escena?.visual?.creative;
  /* Un cambio de cámara, movimiento o luz: la ruta del Core y la operación de F1-A que la cambia. */
  const cambiarRuta = (ruta: string, valor: string | null) => {
    const destino = OPERACION_DE_LA_RUTA[ruta];
    if (!destino) return;
    onGesto([{ op: destino.op, target: objetivo, [destino.campo]: valor } as unknown as FilmmakerOperation]);
  };

  return (
    <View style={styles.bloque}>
      {escena && (
        <CampoQueCrece
          etiqueta={t('filmmaker.sceneTitle')}
          valor={escena.title ?? ''}
          maximo={LIMITES.nombre}
          etiquetaGuardar={t('common.save')}
          editable={editable}
          onGuardar={(texto) => onGesto([{ op: 'edit_text', target: { sceneId: escena.id }, title: texto || null }])}
        />
      )}
      <CampoQueCrece
        etiqueta={t('filmmaker.description')}
        valor={(plano ? plano.description : escena?.description) ?? ''}
        placeholder={plano ? t('filmmaker.describeShot') : t('filmmaker.describeScene')}
        maximo={LIMITES.texto}
        etiquetaGuardar={t('common.save')}
        editable={editable}
        onGuardar={(texto) => onGesto([{ op: 'edit_text', target: plano ? { shotId: plano.id } : { sceneId: (escena as ProductionScene).id }, description: texto || null }])}
      />

      {escena && (
        <>
          <Seccion titulo={t('filmmaker.timeOfDay')}>
            <Opciones
              opciones={MOMENTOS_DEL_DIA.map((m) => ({ valor: m, texto: t(CLAVE_DEL_MOMENTO[m]) }))}
              elegida={escena.timeOfDay}
              editable={editable}
              onElegir={(v) => onGesto([{ op: 'change_time_of_day', sceneId: escena.id, timeOfDay: v as TimeOfDay | null }])}
            />
          </Seccion>
          <Seccion titulo={t('filmmaker.weather')}>
            <Opciones
              opciones={CLIMAS.map((c) => ({ valor: c, texto: t(CLAVE_DEL_CLIMA[c]) }))}
              elegida={escena.weather}
              editable={editable}
              onElegir={(v) => onGesto([{ op: 'change_weather', sceneId: escena.id, weather: v as Weather | null }])}
            />
          </Seccion>
        </>
      )}

      {FAMILIAS_DE_CAMARA.filter((f) => FAMILIAS_DEL_DIRECTOR.includes(f.id)).map((familia) => (
        <Seccion key={familia.id} titulo={t(familia.clave)}>
          <Opciones
            opciones={familia.comandos.filter((c) => !!OPERACION_DE_LA_RUTA[c.ruta]).map((c) => ({ valor: `${c.ruta}=${c.valor}`, texto: t(c.clave) }))}
            elegida={familia.comandos.map((c) => `${c.ruta}=${valorCreativo(creativo, c.ruta as CreativeParameterPath)}`).find((k) => familia.comandos.some((c) => `${c.ruta}=${c.valor}` === k))}
            editable={editable}
            onElegir={(v) => {
              const ruta = (v ?? '').split('=')[0] || familia.comandos[0]?.ruta;
              if (ruta) cambiarRuta(ruta, v ? v.split('=')[1] : null);
            }}
          />
        </Seccion>
      ))}

      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.notEditableYet')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.md },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 36, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
});

export default ProductionInspector;
