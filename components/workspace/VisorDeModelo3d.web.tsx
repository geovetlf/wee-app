import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ModelViewerElement } from '@google/model-viewer';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { ALTO_DEL_VISOR, capaDelVisor } from './visorDeModelo3d.comun';
import type { PropsDelVisor } from './visorDeModelo3d.comun';

/**
 * EL VISOR 3D DE WEË, EN LA WEB.
 *
 * `<model-viewer>` (Google, Apache-2.0) sobre three.js: girar arrastrando, acercar con la rueda o pellizcando, desplazar
 * con dos dedos o el botón derecho, y el encuadre automático al cargar. La librería se pide la primera vez que se abre
 * un modelo, no al arrancar la app. El modelo llega por la dirección que se le pasa —nunca una de ejemplo— y lo que
 * pasa se dice: preparando, cargando con cuánto va, listo, o que no se pudo abrir y «Inténtalo de nuevo».
 */
const VisorDeModelo3d: React.FC<PropsDelVisor> = ({ url, nombre, buscando, porque, alto = ALTO_DEL_VISOR }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [libreria, setLibreria] = useState<'cargando' | 'lista' | 'fallo'>('cargando');
  const [modelo, setModelo] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [avance, setAvance] = useState(0);
  const [girando, setGirando] = useState(false);
  /* Cada «Inténtalo de nuevo» monta el visor otra vez: así se vuelve a pedir de verdad. */
  const [intento, setIntento] = useState(0);
  const visor = useRef<ModelViewerElement | null>(null);

  /* La librería, la primera vez (luego ya está: pedirla otra vez no cuesta nada) y en cada «Inténtalo de nuevo». */
  useEffect(() => {
    let vivo = true;
    setLibreria((l) => (l === 'lista' ? l : 'cargando'));
    import('@google/model-viewer')
      .then(() => { if (vivo) setLibreria('lista'); })
      .catch(() => { if (vivo) setLibreria('fallo'); });
    return () => { vivo = false; };
  }, [intento]);

  /* Otro modelo, u otro intento: se empieza de cero. */
  useEffect(() => { setModelo('cargando'); setAvance(0); }, [url, intento]);

  useEffect(() => {
    const el = visor.current;
    if (!el || libreria !== 'lista' || !url) return undefined;
    const alCargar = () => setModelo('listo');
    const alFallar = () => setModelo('error');
    const alAvanzar = (e: Event) => {
      const p = (e as CustomEvent<{ totalProgress?: number }>).detail?.totalProgress;
      if (typeof p === 'number') setAvance(p);
    };
    el.addEventListener('load', alCargar);
    el.addEventListener('error', alFallar);
    el.addEventListener('progress', alAvanzar);
    return () => {
      el.removeEventListener('load', alCargar);
      el.removeEventListener('error', alFallar);
      el.removeEventListener('progress', alAvanzar);
    };
  }, [libreria, url, intento]);

  const capa = capaDelVisor({ url, buscando, libreria, modelo });

  /* Volver a la vista de partida: el encuadre que el visor calcula para el modelo entero. */
  const encuadrar = () => {
    const el = visor.current;
    if (!el) return;
    el.cameraOrbit = 'auto auto auto';
    el.cameraTarget = 'auto auto auto';
    el.fieldOfView = 'auto';
    el.jumpCameraToGoal();
  };

  return (
    <View style={styles.bloque}>
      <View style={[styles.lienzo, { height: alto, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {!!url && libreria === 'lista' && capa !== 'error' && React.createElement('model-viewer', {
          key: `${url}#${intento}`,
          ref: visor,
          src: url,
          alt: t('creaciones.model3dAlt', { nombre }),
          'camera-controls': true,
          'touch-action': 'pan-y',
          'auto-rotate': girando,
          'interaction-prompt': 'none',
          'shadow-intensity': '1',
          'environment-image': 'neutral',
          loading: 'eager',
          style: { width: '100%', height: '100%', backgroundColor: 'transparent', outline: 'none' },
        })}
        {capa !== 'listo' && (
          <View style={[styles.capa, { backgroundColor: theme.colors.surface }]} accessibilityLiveRegion="polite">
            {capa === 'buscando' && (
              <>
                <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('creaciones.model3dSearching')} />
                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>{t('creaciones.model3dSearching')}</Text>
              </>
            )}
            {capa === 'cargando' && (
              <>
                <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('creaciones.model3dLoading', { porcentaje: formato.numero(avance, { style: 'percent', maximumFractionDigits: 0 }) })} />
                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
                  {t('creaciones.model3dLoading', { porcentaje: formato.numero(avance, { style: 'percent', maximumFractionDigits: 0 }) })}
                </Text>
              </>
            )}
            {capa === 'sin_modelo' && (
              <>
                <Ionicons name="cube-outline" size={scale(28)} color={theme.colors.textSecondary} />
                <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>{porque || t('creaciones.model3dNone')}</Text>
              </>
            )}
            {capa === 'error' && (
              <>
                <Ionicons name="alert-circle-outline" size={scale(28)} color={theme.colors.error} />
                <Text style={[styles.texto, { color: theme.colors.text }]}>{t('creaciones.model3dError')}</Text>
                <TouchableOpacity
                  onPress={() => setIntento((i) => i + 1)}
                  style={[styles.reintentar, { borderColor: theme.colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.retry')}
                >
                  <Text style={[styles.reintentarTexto, { color: theme.colors.text }]}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
      {capa === 'listo' && (
        <View style={styles.controles}>
          <TouchableOpacity onPress={encuadrar} style={[styles.control, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]} accessibilityRole="button" accessibilityLabel={t('creaciones.model3dFrame')}>
            <Ionicons name="scan-outline" size={scale(16)} color={theme.colors.text} />
            <Text style={[styles.controlTexto, { color: theme.colors.text }]}>{t('creaciones.model3dFrame')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGirando((g) => !g)}
            style={[styles.control, { borderColor: girando ? theme.colors.accent : theme.colors.border, backgroundColor: theme.colors.card }]}
            accessibilityRole="button"
            accessibilityState={{ selected: girando }}
            accessibilityLabel={t(girando ? 'creaciones.model3dStopSpin' : 'creaciones.model3dSpin')}
          >
            <Ionicons name={girando ? 'pause-outline' : 'sync-outline'} size={scale(16)} color={theme.colors.text} />
            <Text style={[styles.controlTexto, { color: theme.colors.text }]}>{t(girando ? 'creaciones.model3dStopSpin' : 'creaciones.model3dSpin')}</Text>
          </TouchableOpacity>
          <Text style={[styles.pista, { color: theme.colors.textSecondary }]}>{t('creaciones.model3dHint')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  lienzo: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', position: 'relative' },
  capa: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.lg },
  texto: { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: FONT_SIZE.sm * 1.45, maxWidth: 420 },
  reintentar: { borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  reintentarTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  controles: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  control: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, minHeight: 36 },
  controlTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  pista: { fontSize: FONT_SIZE.xs, flexBasis: '100%', lineHeight: FONT_SIZE.xs * 1.5 },
});

export default VisorDeModelo3d;
