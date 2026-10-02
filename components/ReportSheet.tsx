import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { useDireccion } from '../hooks/useDireccion';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { referenciaPublicaDe } from '../utils/identidadPublica';
import {
  FalloDeDenuncia,
  MOTIVOS_DE_REPORTE,
  MotivoDeReporte,
  ObjetivoDenunciable,
  moderationService,
} from '../services/moderationService';

/**
 * LA HOJA DE DENUNCIAR (Fase 12-A/B · docs/MODERATION.md).
 *
 * Una sola, para todo lo que se pueda denunciar en Weë: una publicación hoy, un
 * comentario o un perfil cuando su menú la abra. Lo único que cambia de un sitio
 * a otro es `objetivo`. No hay una hoja por pantalla, porque moderar no es de
 * ninguna pantalla.
 *
 * ── Lo que dice, y lo que se cuida de no decir ──────────────────────────────
 *
 * Al enviar dice «Reporte recibido», que es exactamente lo que ha pasado. No
 * dice que se haya revisado nada ni que se vaya a quitar nada: eso todavía no
 * ocurre, y el botón anterior lo prometía. Si el envío falla, NO da las gracias:
 * dice que no se pudo y deja reintentar. Nunca enseña un identificador, un
 * estado interno ni un error del servidor.
 *
 * ── Forma ───────────────────────────────────────────────────────────────────
 *
 * En el teléfono, la misma hoja inferior que el botón + (`CreateSheet`). En
 * escritorio, el mismo contenido centrado como diálogo. El motivo elegido se
 * marca con un icono además del color, y con movimiento reducido no se desliza.
 */
export interface ObjetivoDeLaDenuncia {
  type: ObjetivoDenunciable;
  id: string;
}

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  objetivo: ObjetivoDeLaDenuncia | null;
  /** Desde qué pantalla se abrió. Contexto para el servidor, en minúsculas. */
  surface?: string;
}

type Paso = 'elegir' | 'enviando' | 'recibido' | 'duplicado' | 'fallo';

/* `scale()` encoge en pantallas estrechas —48 se quedaba en 43—, y un objetivo táctil no puede bajar de 44. */
const ALTO_DE_OPCION = Math.max(44, scale(48));
const ALTO_DE_BOTON = Math.max(48, scale(48));
const ALTO_DE_ENLACE = Math.max(44, scale(44));

const CLAVE_DEL_FALLO: Record<FalloDeDenuncia, string> = {
  offline: 'moderation.errorOffline',
  rate_limited: 'moderation.errorRateLimited',
  unavailable: 'moderation.errorUnavailable',
  unknown: 'moderation.errorBody',
};

const ReportSheet: React.FC<ReportSheetProps> = ({ visible, onClose, objetivo, surface }) => {
  const { theme } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { isDesktop, height } = useResponsive();
  const { userProfile } = useUserProfile();
  /* El sentido de lectura sale del idioma activo, no de esta hoja: con árabe se da la vuelta sola. */
  const { contenedor: sentido, texto: sentidoDelTexto } = useDireccion();

  const [paso, setPaso] = useState<Paso>('elegir');
  const [motivo, setMotivo] = useState<MotivoDeReporte | null>(null);
  const [fallo, setFallo] = useState<FalloDeDenuncia>('unknown');
  const [sinMovimiento, setSinMovimiento] = useState(false);
  /* El doble toque se corta aquí y no solo en `disabled`: dos toques en el mismo fotograma llegan los dos. */
  const enviando = useRef(false);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (vivo.current) setSinMovimiento(!!v); }).catch(() => {});
    return () => { vivo.current = false; };
  }, []);

  /* Cada vez que se abre, empieza de cero: no se hereda el motivo ni el resultado de la denuncia anterior. */
  useEffect(() => {
    if (visible) {
      setPaso('elegir');
      setMotivo(null);
      setFallo('unknown');
      enviando.current = false;
    }
  }, [visible, objetivo?.id]);

  const enviar = useCallback(async () => {
    if (!objetivo || !motivo || enviando.current) return;
    enviando.current = true;
    setPaso('enviando');
    const resultado = await moderationService.denunciar({
      targetType: objetivo.type,
      targetId: objetivo.id,
      reason: motivo,
      actingEntityId: referenciaPublicaDe(userProfile),
      surface,
    });
    enviando.current = false;
    if (!vivo.current) return;
    if (resultado.ok) {
      setPaso(resultado.duplicate ? 'duplicado' : 'recibido');
      AccessibilityInfo.announceForAccessibility(t(resultado.duplicate ? 'moderation.duplicateTitle' : 'moderation.successTitle'));
    } else {
      setFallo(resultado.error);
      setPaso('fallo');
      AccessibilityInfo.announceForAccessibility(t('moderation.errorTitle'));
    }
  }, [objetivo, motivo, userProfile, surface, t]);

  /* Mientras se envía no se cierra: el resultado tiene que llegar a alguien. */
  const cerrar = useCallback(() => { if (paso !== 'enviando') onClose(); }, [paso, onClose]);

  const terminado = paso === 'recibido' || paso === 'duplicado';
  const ocupado = paso === 'enviando';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' || sinMovimiento ? 'none' : 'slide'}
      onRequestClose={cerrar}
      accessibilityViewIsModal
    >
      <View style={[styles.contenedor, isDesktop && styles.contenedorDeEscritorio]}>
        <TouchableOpacity style={styles.fondo} activeOpacity={1} onPress={cerrar} accessibilityLabel={t('common.close')} accessibilityRole="button" />
        <View
          style={[
            styles.hoja,
            isDesktop ? styles.hojaDeEscritorio : { paddingBottom: Math.max(insets.bottom, SPACING.lg) },
            sentido,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
          ]}
        >
          {!isDesktop && <View style={[styles.asa, { backgroundColor: theme.colors.border }]} />}

          {terminado ? (
            <View style={styles.resultado} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle-outline" size={scale(44)} color={theme.colors.text} />
              <Text style={[styles.titulo, sentidoDelTexto, styles.centrado, { color: theme.colors.text }]} accessibilityRole="header">
                {t(paso === 'duplicado' ? 'moderation.duplicateTitle' : 'moderation.successTitle')}
              </Text>
              <Text style={[styles.subtitulo, sentidoDelTexto, styles.centrado, { color: theme.colors.textSecondary }]}>
                {t(paso === 'duplicado' ? 'moderation.duplicateBody' : 'moderation.successBody')}
              </Text>
              <TouchableOpacity
                style={[styles.boton, styles.ancho, { backgroundColor: theme.colors.text }]}
                onPress={onClose}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('common.done')}
              >
                <Text style={[styles.textoDelBoton, { color: theme.colors.background }]}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.titulos}>
                <Text style={[styles.titulo, sentidoDelTexto, { color: theme.colors.text }]} accessibilityRole="header">{t('moderation.report')}</Text>
                <Text style={[styles.subtitulo, sentidoDelTexto, { color: theme.colors.textSecondary }]}>{t('moderation.subtitle')}</Text>
              </View>

              <Text style={[styles.etiqueta, sentidoDelTexto, { color: theme.colors.textSecondary }]}>{t('moderation.chooseReason')}</Text>
              <ScrollView
                style={{ maxHeight: Math.max(scale(200), Math.round(height * 0.46)) }}
                contentContainerStyle={styles.motivos}
                accessibilityRole="radiogroup"
                accessibilityLabel={t('moderation.chooseReason')}
                keyboardShouldPersistTaps="handled"
              >
                {MOTIVOS_DE_REPORTE.map(({ motivo: m, clave }) => {
                  const elegido = motivo === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.motivo,
                        { borderColor: elegido ? theme.colors.text : theme.colors.border, backgroundColor: elegido ? theme.colors.surface : 'transparent' },
                      ]}
                      onPress={() => { if (!ocupado) setMotivo(m); }}
                      disabled={ocupado}
                      activeOpacity={0.8}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: elegido, checked: elegido, disabled: ocupado }}
                      aria-checked={elegido}
                      accessibilityLabel={t(clave)}
                    >
                      <Text style={[styles.textoDelMotivo, sentidoDelTexto, { color: theme.colors.text }]}>{t(clave)}</Text>
                      <Ionicons
                        name={elegido ? 'radio-button-on' : 'radio-button-off'}
                        size={scale(20)}
                        color={elegido ? theme.colors.text : theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {paso === 'fallo' && (
                <View style={[styles.aviso, { borderColor: theme.colors.error }]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
                  <Ionicons name="alert-circle-outline" size={scale(18)} color={theme.colors.error} />
                  <View style={styles.textosDelAviso}>
                    <Text style={[styles.tituloDelAviso, sentidoDelTexto, { color: theme.colors.text }]}>{t('moderation.errorTitle')}</Text>
                    <Text style={[styles.subtitulo, sentidoDelTexto, { color: theme.colors.textSecondary }]}>{t(CLAVE_DEL_FALLO[fallo])}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.boton, { backgroundColor: theme.colors.text, opacity: !motivo || ocupado ? 0.45 : 1 }]}
                onPress={enviar}
                disabled={!motivo || ocupado}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ disabled: !motivo || ocupado, busy: ocupado }}
                aria-busy={ocupado}
                accessibilityLabel={ocupado ? t('moderation.sending') : t('moderation.send')}
              >
                {ocupado
                  ? <ActivityIndicator color={theme.colors.background} />
                  : <Text style={[styles.textoDelBoton, { color: theme.colors.background }]}>{t('moderation.send')}</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelar} onPress={cerrar} disabled={ocupado} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
                <Text style={[styles.textoDeCancelar, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contenedorDeEscritorio: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  fondo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31,41,55,0.45)',
  },
  hoja: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  hojaDeEscritorio: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    maxWidth: 440,
  },
  asa: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    alignSelf: 'center',
  },
  titulos: {
    gap: scale(2),
  },
  titulo: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitulo: {
    fontSize: FONT_SIZE.sm,
  },
  centrado: {
    textAlign: 'center',
  },
  etiqueta: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  motivos: {
    gap: SPACING.xs,
  },
  motivo: {
    minHeight: ALTO_DE_OPCION,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  textoDelMotivo: {
    flex: 1,
    fontSize: FONT_SIZE.md,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  textosDelAviso: {
    flex: 1,
    gap: scale(2),
  },
  tituloDelAviso: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  boton: {
    minHeight: ALTO_DE_BOTON,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  ancho: {
    alignSelf: 'stretch',
  },
  textoDelBoton: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  cancelar: {
    minHeight: ALTO_DE_ENLACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoDeCancelar: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  resultado: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.md,
  },
});

export default ReportSheet;
