import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import ReproductorDeVideo from '../../workspace/ReproductorDeVideo';
import MensajeDeEstado, { EstadoVisible } from '../../workspace/MensajeDeEstado';
import type { TomaDelPlano } from '../../../hooks/useTomaDePlano';
import ProductionFormatSelector from './ProductionFormatSelector';
import { BotonPequeno } from './ProductionPiezas';
import { claveDelValor } from '../../../constants/camaraCinematica';
import { DURACION_DE_UN_PLANO_NUEVO_SEC, ESTILOS_CANONICOS, esElEstilo, nombreDelEstilo } from '../../../constants/filmmaker';
import MiniaturaDeVideo from './MiniaturaDeVideo';
import { ORDEN_DE_RESOLUCIONES, EspacioDeFilmmaker, alcanceDeResolucion, elegidoDe, vecinos } from './espacio';
import { resolucionVisible } from '../../../utils/mensajesDeFilmmaker';
import { propiosDentro } from '../../../utils/produccionEditable';
import { confirmAction } from '../../../utils/notify';
import type { ProductionScene, ProductionShot, ResolutionTarget } from '../../../services/filmmaker/dominio';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

type Desplegable = 'estilo' | 'formato' | 'resolucion' | null;

/** Un elemento de la tira: un plano, o una escena que todavía no tiene planos. */
interface ElementoDeTira {
  readonly unitId: string;
  readonly escena: ProductionScene;
  readonly plano?: ProductionShot;
  readonly numeroDeEscena: number;
  readonly numeroDePlano: number;
}

/**
 * EN QUÉ ESTÁ EL VÍDEO DEL PLANO ELEGIDO, dicho como lo vive la persona: se está
 * preparando, se está haciendo, está listo, no salió —y sus Credits volvieron—
 * o se están devolviendo, o se está comprobando cómo acabó. Sale de la toma de F1-D tal cual; aquí no se decide
 * nada. Sin nada que contar, no se pinta.
 */
const estadoDeLaToma = (toma: TomaDelPlano): { estado: EstadoVisible; reembolsados?: number } | null => {
  const f = toma.fase.fase;
  if (f === 'pidiendo') return { estado: 'preparando' };
  if (f === 'en_proceso' || f === 'terminando') return { estado: 'generando' };
  if (f === 'cerrando') return { estado: 'devolviendo' };
  /* R15 (Fase 33): no se sabe cómo acabó; sus Credits siguen apartados. */
  if (f === 'comprobando') return { estado: 'comprobando' };
  if (toma.ultima?.estado === 'fallida') {
    const devueltos = toma.economia?.reembolsados ?? 0;
    return toma.ultima.pendiente ? { estado: 'devolviendo' } : { estado: devueltos > 0 ? 'reembolsado' : 'fallido', reembolsados: devueltos };
  }
  if (toma.ultima?.estado === 'lista') return { estado: 'completado' };
  return null;
};

/**
 * EL VISOR: LO QUE SE ESTÁ DIRIGIENDO, EN GRANDE.
 *
 * Arriba, dónde estás —escena y plano, con el anterior y el siguiente— y los
 * tres ajustes de la producción entera: estilo, formato y resolución. En medio,
 * el vídeo del plano si ya lo tiene; si no, lo que se sabe de él y el camino para
 * generarlo. Abajo, la tira de planos, con el elegido marcado en dorado.
 *
 * La resolución dice la verdad: hasta dónde llega hoy la calidad disponible lo
 * dice el servidor al cotizar el plano, y lo que queda por encima se ve apagado
 * con su porqué. Nada se cambia por otra cosa a escondidas.
 */
const ProductionViewer: React.FC<{
  espacio: EspacioDeFilmmaker;
  onIrAlDirector: () => void;
  onPosicion?: (segundos: number) => void;
  altoMaximo?: number;
  /** El momento del vídeo del plano elegido al que lleva el cabezal de la línea de tiempo. */
  irA?: { segundos: number; vez: number } | null;
}> = ({ espacio, onIrAlDirector, onPosicion, altoMaximo, irA }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { produccion, seleccion, videos, tarjetas, editable, toma, onSeleccionar, onGesto, ids } = espacio;
  const [abierto, setAbierto] = useState<Desplegable>(null);
  const elegido = elegidoDe(produccion, seleccion);
  const { anterior, siguiente } = vecinos(produccion, seleccion);
  const video = elegido ? videos.get(elegido.unitId) ?? null : null;
  const estilo = produccion.creativeDirection.visualStyle;
  const resolucion = produccion.format.resolution;
  const alcance = alcanceDeResolucion(toma.calidades, resolucion);
  /*
   * Fase 16 del motor (D13): mientras se hace el vídeo de un plano que todavía no
   * tiene ninguno, el lienzo lo dice —con la rueda— en lugar de «todavía no tiene
   * vídeo»; y entonces el aviso de debajo no lo repite.
   */
  const fase = toma.fase.fase;
  const haciendose = !!elegido && !video?.url && (fase === 'pidiendo' || fase === 'en_proceso' || fase === 'terminando');
  const procesando = haciendose ? t(fase === 'pidiendo' ? 'workspace.statusPreparing' : 'workspace.statusGenerating') : null;

  const miga = elegido
    ? [
      elegido.escena.title
        ? t('filmmaker.wsSceneCrumbTitled', { numero: elegido.numeroDeEscena, titulo: elegido.escena.title })
        : t('filmmaker.wsSceneCrumb', { numero: elegido.numeroDeEscena }),
      ...(elegido.numeroDePlano ? [t('filmmaker.shotNumber', { numero: elegido.numeroDePlano })] : []),
    ]
    : [t('filmmaker.wsNothingSelected')];

  const pildora = (id: Exclude<Desplegable, null>, icono: string, valor: string, etiqueta: string) => (
    <TouchableOpacity
      onPress={() => setAbierto(abierto === id ? null : id)}
      style={[styles.pildora, { backgroundColor: abierto === id ? theme.colors.glow : theme.colors.card, borderColor: abierto === id ? theme.colors.accent : theme.colors.border }]}
      accessibilityRole="button"
      accessibilityState={{ expanded: abierto === id }}
      accessibilityLabel={t('filmmaker.wsSettingIs', { ajuste: etiqueta, valor })}
    >
      <Ionicons name={icono as any} size={scale(14)} color={theme.colors.textSecondary} />
      <Text style={[styles.pildoraTexto, { color: theme.colors.text }]} numberOfLines={1}>{valor}</Text>
      <Ionicons name={abierto === id ? 'chevron-up' : 'chevron-down'} size={scale(13)} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  /* Los planos de la producción, en orden, para la tira. */
  const tira = produccion.scenes.flatMap((escena, i): ElementoDeTira[] => (escena.shots.length
    ? escena.shots.map((plano, j) => ({ unitId: plano.id, escena, plano, numeroDeEscena: i + 1, numeroDePlano: j + 1 }))
    : [{ unitId: escena.id, escena, plano: undefined, numeroDeEscena: i + 1, numeroDePlano: 0 }]));
  const escenaParaAnadir = elegido?.escena ?? produccion.scenes[produccion.scenes.length - 1];

  return (
    <View style={styles.visor}>
      <View style={styles.barra}>
        <TouchableOpacity
          onPress={() => onSeleccionar(anterior)}
          disabled={!anterior}
          style={[styles.flecha, { borderColor: theme.colors.border }, !anterior && { opacity: OPACITY.disabled }]}
          accessibilityRole="button"
          accessibilityLabel={t('filmmaker.wsPrevious')}
        >
          <Ionicons name="chevron-back" size={scale(16)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.miga, { color: theme.colors.text }]} numberOfLines={1} accessibilityRole="header">{miga.join('  ›  ')}</Text>
        <TouchableOpacity
          onPress={() => onSeleccionar(siguiente)}
          disabled={!siguiente}
          style={[styles.flecha, { borderColor: theme.colors.border }, !siguiente && { opacity: OPACITY.disabled }]}
          accessibilityRole="button"
          accessibilityLabel={t('filmmaker.wsNext')}
        >
          <Ionicons name="chevron-forward" size={scale(16)} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.empuje} />
        {pildora('estilo', 'color-palette-outline', estilo ? nombreDelEstilo(estilo, t) : t('filmmaker.wsStyleNone'), t('filmmaker.wsStyle'))}
        {pildora('formato', 'crop-outline', produccion.format.aspectRatio, t('filmmaker.format'))}
        {pildora('resolucion', 'diamond-outline', resolucion ? resolucionVisible(resolucion) : t('filmmaker.wsResolutionAuto'), t('filmmaker.wsResolution'))}
      </View>

      {abierto === 'estilo' && (
        <View style={[styles.desplegable, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsStyleText')}</Text>
          <View style={styles.opciones}>
            {/* Se guarda el TOKEN, no el nombre (Fase 22 del motor, arreglo R13): el nombre sale al pintar. */}
            {ESTILOS_CANONICOS.map(({ token, clave }) => {
              const nombre = t(clave);
              const esta = esElEstilo(estilo, token, t);
              return (
                <TouchableOpacity
                  key={token}
                  disabled={!editable}
                  onPress={() => {
                    setAbierto(null);
                    /*
                     * Como en «Dirección» (Fase 31): F1-A quita el estilo propio de escenas y planos al fijarlo en toda la
                     * producción, así que se pregunta antes. Aquí no se preguntaba (auditoría del workplace, 38b apartada).
                     */
                    const n = propiosDentro(produccion, 'style');
                    void (async () => {
                      if (n > 0 && !(await confirmAction(t('filmmaker.wsOverrideStyleConfirm', { contador: n }), t('filmmaker.wsOverrideDetail'), t('filmmaker.wsOverrideApply'), false, t))) return;
                      onGesto([{ op: 'change_style', target: { scope: 'production' }, style: esta ? null : token }]);
                    })();
                  }}
                  style={[styles.opcion, { backgroundColor: esta ? theme.colors.accent : theme.colors.surface, borderColor: esta ? theme.colors.accent : theme.colors.border }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: esta, disabled: !editable }}
                  accessibilityLabel={nombre}
                >
                  <Text style={[styles.opcionTexto, { color: esta ? '#1F2937' : theme.colors.text }]}>{nombre}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {abierto === 'formato' && (
        <View style={[styles.desplegable, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <ProductionFormatSelector
            aspectRatio={produccion.format.aspectRatio}
            preset={produccion.format.preset}
            editable={editable}
            onPreset={(preset) => onGesto([{ op: 'change_format', preset }])}
            onProporcion={(aspectRatio) => onGesto([{ op: 'change_format', aspectRatio }])}
          />
        </View>
      )}

      {abierto === 'resolucion' && (
        <View style={[styles.desplegable, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.opciones}>
            {ORDEN_DE_RESOLUCIONES.map((r) => {
              const esta = resolucion === r;
              const llega = !alcance || ORDEN_DE_RESOLUCIONES.indexOf(r) <= ORDEN_DE_RESOLUCIONES.indexOf(alcance);
              const apagada = !editable || !llega;
              return (
                <TouchableOpacity
                  key={r}
                  disabled={apagada}
                  onPress={() => { onGesto([{ op: 'change_format', resolution: r as ResolutionTarget }]); setAbierto(null); }}
                  style={[
                    styles.opcion,
                    { backgroundColor: esta ? theme.colors.accent : theme.colors.surface, borderColor: esta ? theme.colors.accent : theme.colors.border },
                    !llega && styles.apagada,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: esta, disabled: apagada }}
                  accessibilityLabel={resolucionVisible(r)}
                  accessibilityHint={llega ? undefined : t('filmmaker.wsResolutionWhy', { alcanza: resolucionVisible(alcance) })}
                >
                  <Text style={[styles.opcionTexto, { color: esta ? '#1F2937' : theme.colors.text }]}>{resolucionVisible(r)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
            {alcance ? t('filmmaker.wsResolutionWhy', { alcanza: resolucionVisible(alcance) }) : t('filmmaker.wsResolutionUnknown')}
          </Text>
        </View>
      )}

      <ReproductorDeVideo
        url={video?.url ?? null}
        poster={video?.poster ?? null}
        procesando={procesando}
        formato={produccion.format.aspectRatio}
        nombre={t('filmmaker.takePreviewOf', { nombre: miga[miga.length - 1] })}
        altoMaximo={altoMaximo}
        onPosicion={onPosicion ? (s) => onPosicion(s) : undefined}
        irA={irA}
        sinVideo={!produccion.scenes.length ? (
          /*
           * Una producción recién creada nace vacía (F1-C: la idea se guarda tal
           * cual y las escenas son de Weë Brain, en otra fase). Sin esto, el visor
           * pedía elegir un plano que no existe: aquí se empieza, con el mismo
           * gesto del storyboard.
           */
          <View style={styles.vacio}>
            <Ionicons name="film-outline" size={scale(30)} color={theme.colors.textSecondary} />
            <Text style={styles.vacioTitulo}>{t('filmmaker.emptyStoryboardTitle')}</Text>
            <Text style={styles.vacioTexto} numberOfLines={3}>{t('filmmaker.emptyStoryboardText')}</Text>
            {editable && (
              <BotonPequeno
                icono="add"
                etiqueta={t('filmmaker.addFirstScene')}
                onPress={() => onGesto([{ op: 'add_scene', scene: { id: ids.escena(), shots: [{ id: ids.plano(), durationSec: DURACION_DE_UN_PLANO_NUEVO_SEC }] } }])}
                conTexto
                principal
              />
            )}
          </View>
        ) : (
          <View style={styles.vacio}>
            <Ionicons name={elegido ? 'film-outline' : 'hand-left-outline'} size={scale(30)} color={theme.colors.textSecondary} />
            <Text style={styles.vacioTitulo}>{elegido ? t('filmmaker.wsNoVideoTitle') : t('filmmaker.wsNothingSelected')}</Text>
            <Text style={styles.vacioTexto} numberOfLines={3}>
              {elegido ? (elegido.plano?.description ?? elegido.escena.description ?? t('filmmaker.wsNoVideoText')) : t('filmmaker.wsPickShotText')}
            </Text>
            {!!elegido && <BotonPequeno icono="sparkles-outline" etiqueta={t('filmmaker.wsGoToDirector')} onPress={onIrAlDirector} conTexto principal />}
          </View>
        )}
      />

      {!!elegido && (() => {
        const e = estadoDeLaToma(toma);
        if (!e || (haciendose && (e.estado === 'preparando' || e.estado === 'generando'))) return null;
        const detalle = e.estado === 'reembolsado' && e.reembolsados
          ? t('workspace.statusRefundedDetail', { credits: formato.numero(e.reembolsados) })
          : e.estado === 'fallido' && toma.economia && toma.economia.cobrados === 0 ? t('workspace.statusFailedDetail') : undefined;
        return <MensajeDeEstado estado={e.estado} detalle={detalle} compacto />;
      })()}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tira}>
        {produccion.scenes.map((escena, i) => {
          const suyos = tira.filter((u) => u.escena.id === escena.id);
          return (
            <View key={escena.id} style={styles.grupo}>
              {/* Cada escena, con su nombre encima de sus planos: se lee dónde empieza cada una. */}
              <Text style={[styles.grupoTitulo, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {escena.title ? t('filmmaker.wsSceneCrumbTitled', { numero: i + 1, titulo: escena.title }) : t('filmmaker.wsSceneCrumb', { numero: i + 1 })}
              </Text>
              <View style={styles.grupoFila}>
                {suyos.map((u) => {
                  const activo = elegido?.unitId === u.unitId;
                  const suVideo = videos.get(u.unitId);
                  const tarjeta = tarjetas.find((c) => c.unitId === u.unitId);
                  const tipo = tarjeta?.shotType ? claveDelValor('shot.type', tarjeta.shotType) : null;
                  const nombre = u.plano ? (tipo ? t(tipo) : t('filmmaker.shotNumber', { numero: u.numeroDePlano })) : t('filmmaker.wsSceneCrumb', { numero: u.numeroDeEscena });
                  return (
                    <TouchableOpacity
                      key={u.unitId}
                      onPress={() => onSeleccionar(u.plano ? { tipo: 'plano', id: u.plano.id } : { tipo: 'escena', id: u.escena.id })}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activo }}
                      accessibilityLabel={t('filmmaker.selectItem', { nombre: u.plano ? t('filmmaker.whereShot', { escena: u.numeroDeEscena, plano: u.numeroDePlano }) : t('filmmaker.whereScene', { escena: u.numeroDeEscena }) })}
                      style={[styles.plano, { borderColor: activo ? theme.colors.accent : theme.colors.border, backgroundColor: theme.colors.card }, isWeb && ({ cursor: 'pointer' } as object)]}
                    >
                      <View style={[styles.miniatura, { backgroundColor: theme.colors.surface }]}>
                        {/* Con póster, su imagen fija (Fase 16); sin él, el aviso de que ya tiene vídeo, sin cargarlo (Fase 22, R10). */}
                        {suVideo?.poster || suVideo?.url ? (
                          <MiniaturaDeVideo video={suVideo} nombre={nombre} />
                        ) : (
                          <Ionicons name="film-outline" size={scale(18)} color={theme.colors.textSecondary} />
                        )}
                      </View>
                      <View style={styles.planoPie}>
                        <Text style={[styles.planoNumero, { color: activo ? theme.colors.accent : theme.colors.textSecondary }]}>
                          {formato.numero(u.plano ? u.numeroDePlano : u.numeroDeEscena, { minimumIntegerDigits: 2 })}
                        </Text>
                        <Text style={[styles.planoNombre, { color: theme.colors.text }]} numberOfLines={1}>{nombre}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
        {editable && !!escenaParaAnadir && (
          <TouchableOpacity
            onPress={() => onGesto([{ op: 'add_shot', sceneId: escenaParaAnadir.id, shot: { id: ids.plano(), durationSec: DURACION_DE_UN_PLANO_NUEVO_SEC } }])}
            style={[styles.anadir, { borderColor: theme.colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('filmmaker.addShot')}
          >
            <Ionicons name="add" size={scale(24)} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  visor: { gap: SPACING.md },
  barra: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  flecha: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  miga: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any, flexShrink: 1 },
  empuje: { flex: 1, minWidth: SPACING.sm },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 32, paddingHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, maxWidth: scale(170) },
  pildoraTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any, flexShrink: 1 },
  desplegable: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  opcion: { minHeight: 34, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full, borderWidth: 1, justifyContent: 'center' },
  opcionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  apagada: { borderStyle: 'dashed', opacity: OPACITY.disabled },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
  vacio: { alignItems: 'center', gap: SPACING.sm, maxWidth: scale(420) },
  vacioTitulo: { color: '#FFFFFF', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold as any, textAlign: 'center' },
  vacioTexto: { color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: FONT_SIZE.sm * 1.45 },
  tira: { gap: SPACING.lg, alignItems: 'flex-end', paddingVertical: 2 },
  grupo: { gap: 4 },
  grupoTitulo: { fontSize: scale(10), fontWeight: FONT_WEIGHT.bold as any, textTransform: 'uppercase', letterSpacing: 0.5, maxWidth: scale(260) },
  grupoFila: { flexDirection: 'row', gap: SPACING.sm },
  plano: { width: scale(128), borderWidth: 2, borderRadius: BORDER_RADIUS.sm, overflow: 'hidden' },
  miniatura: { height: scale(68), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  planoPie: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  planoNumero: { fontSize: scale(11), fontWeight: FONT_WEIGHT.bold as any, fontVariant: ['tabular-nums'] },
  planoNombre: { flex: 1, fontSize: scale(11), fontWeight: FONT_WEIGHT.medium as any },
  anadir: { width: scale(64), height: scale(96), borderWidth: 1, borderStyle: 'dashed', borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
});

export default ProductionViewer;
