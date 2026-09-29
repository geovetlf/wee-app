import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import CampoQueCrece from '../../creator/CampoQueCrece';
import { Seccion } from './ProductionPiezas';
import { FAMILIAS_DE_CAMARA } from '../../../constants/camaraCinematica';
import { CLAVE_DE_TRANSICION, CLAVE_DEL_CLIMA, CLAVE_DEL_MOMENTO, FAMILIAS_DEL_DIRECTOR, FOCALES_MM, OPERACION_DE_LA_RUTA } from '../../../constants/filmmaker';
import { CLIMAS, LIMITES, MOMENTOS_DEL_DIA, buscarEscena, buscarPlano, valorCreativo } from '../../../services/filmmaker/dominio';
import type { CreativeParameterPath, FilmmakerOperation, FilmmakerProduction, ProductionScene, ProductionShot, TimeOfDay, TransitionType, Weather } from '../../../services/filmmaker/dominio';
import type { Seleccion } from './ProductionStoryboard';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';

const isWeb = Platform.OS === 'web';

/**
 * Una fila de opciones de las que se elige una; tocar la elegida la quita. Cada una se anuncia con su grupo («Luz:
 * Suave», «Ritmo: Suave»): el inspector tiene valores que se escriben igual en familias distintas —la luz suave y el
 * movimiento suave, la cámara macro y la óptica macro—, y quien no ve la sección los confundiría (Fase 23 del motor).
 */
const Opciones: React.FC<{
  opciones: readonly { valor: string; texto: string }[];
  elegida?: string;
  editable: boolean;
  onElegir: (valor: string | null) => void;
  grupo: string;
}> = ({ opciones, elegida, editable, onElegir, grupo }) => {
  const { theme } = useTheme();
  const t = useT();
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
            accessibilityLabel={t('filmmaker.wsSettingIs', { ajuste: grupo, valor: o.texto })}
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
 * con el vocabulario de la biblioteca de Weë Studio.
 *
 * Fase 23 del motor (el espacio de trabajo): TODA la cámara que el Core sabe decir, no solo cuatro familias —la
 * perspectiva, la óptica y su focal, la composición, la velocidad y la suavidad del movimiento—, cada ruta en su propia
 * fila (antes, una familia con dos rutas solo dejaba elegir una); y la transición al plano siguiente
 * (`change_transition`). Nada de esto cambia el texto de lo que ya estaba guardado: solo deja elegirlo.
 *
 * Fase 31 del motor: `trasLaDescripcion` es el hueco justo detrás de «Qué se ve», donde el panel del Plano pone lo
 * que pasa y el sujeto (van a la toma en ese orden). Quien no lo pasa —el panel del Director— se queda como estaba.
 */
const ProductionInspector: React.FC<{
  produccion: FilmmakerProduction;
  seleccion: Seleccion;
  editable: boolean;
  onGesto: (ops: readonly FilmmakerOperation[]) => void;
  trasLaDescripcion?: React.ReactNode;
}> = ({ produccion, seleccion, editable, onGesto, trasLaDescripcion }) => {
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
  const focal = valorCreativo(creativo, 'lens.focalLengthMm' as CreativeParameterPath);
  const transicion = valorCreativo(creativo, 'transition.type' as CreativeParameterPath);

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
      {trasLaDescripcion}

      {escena && (
        <>
          <Seccion titulo={t('filmmaker.timeOfDay')}>
            <Opciones
              grupo={t('filmmaker.timeOfDay')}
              opciones={MOMENTOS_DEL_DIA.map((m) => ({ valor: m, texto: t(CLAVE_DEL_MOMENTO[m]) }))}
              elegida={escena.timeOfDay}
              editable={editable}
              onElegir={(v) => onGesto([{ op: 'change_time_of_day', sceneId: escena.id, timeOfDay: v as TimeOfDay | null }])}
            />
          </Seccion>
          <Seccion titulo={t('filmmaker.weather')}>
            <Opciones
              grupo={t('filmmaker.weather')}
              opciones={CLIMAS.map((c) => ({ valor: c, texto: t(CLAVE_DEL_CLIMA[c]) }))}
              elegida={escena.weather}
              editable={editable}
              onElegir={(v) => onGesto([{ op: 'change_weather', sceneId: escena.id, weather: v as Weather | null }])}
            />
          </Seccion>
        </>
      )}

      {FAMILIAS_DE_CAMARA.filter((f) => FAMILIAS_DEL_DIRECTOR.includes(f.id)).map((familia) => {
        /* Una fila por ruta: una familia con dos (velocidad y suavidad) deja elegir las dos. */
        const rutas = [...new Set(familia.comandos.map((c) => c.ruta))].filter((r) => !!OPERACION_DE_LA_RUTA[r]);
        return (
          <Seccion key={familia.id} titulo={t(familia.clave)}>
            {rutas.map((ruta) => {
              const actual = valorCreativo(creativo, ruta as CreativeParameterPath);
              return (
                <Opciones
                  key={ruta}
                  grupo={t(familia.clave)}
                  opciones={familia.comandos.filter((c) => c.ruta === ruta).map((c) => ({ valor: c.valor, texto: t(c.clave) }))}
                  elegida={typeof actual === 'string' ? actual : undefined}
                  editable={editable}
                  onElegir={(v) => cambiarRuta(ruta, v)}
                />
              );
            })}
            {familia.id === 'lens' && (
              <Opciones
                grupo={t(familia.clave)}
                opciones={FOCALES_MM.map((mm) => ({ valor: String(mm), texto: t('filmmaker.wsFocalMm', { mm }) }))}
                elegida={typeof focal === 'number' ? String(focal) : undefined}
                editable={editable}
                onElegir={(v) => onGesto([{ op: 'change_camera', target: objetivo, focalLengthMm: v === null ? null : Number(v) }])}
              />
            )}
          </Seccion>
        );
      })}

      <Seccion titulo={t('filmmaker.wsTransitionToNext')}>
        <Opciones
          grupo={t('filmmaker.wsTransitionToNext')}
          opciones={(Object.keys(CLAVE_DE_TRANSICION) as TransitionType[]).map((v) => ({ valor: v, texto: t(CLAVE_DE_TRANSICION[v]) }))}
          elegida={typeof transicion === 'string' ? transicion : undefined}
          editable={editable}
          onElegir={(v) => onGesto([{ op: 'change_transition', target: objetivo, transition: v as TransitionType | null }])}
        />
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsTransitionNote')}</Text>
      </Seccion>
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
