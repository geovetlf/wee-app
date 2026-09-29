import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import HojaInferior from '../../workspace/HojaInferior';
import ReproductorDeVideo from '../../workspace/ReproductorDeVideo';
import { Chip } from './ProductionPiezas';
import type { HistorialDeTomas } from '../../../hooks/useTomasDelPlano';
import { CLAVE_DEL_ESTADO_DE_TOMA, CLAVE_DEL_ENLACE_DE_TOMA } from '../../../constants/filmmaker';
import { notify } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * LAS TOMAS DE ESTE PLANO, UNA DEBAJO DE OTRA (Fase 24 del motor: la historia llega hasta la toma).
 *
 * Historia → escenas → planos → TOMAS: cada vez que se genera un plano sale una toma, y el plano usa la última que
 * salió bien. Aquí se ven todas —su número, en qué están, lo cobrado y lo devuelto, y cuál está en el plano— y se ve
 * el vídeo de la que lo tenga, dentro de Weë. Volver a una anterior no se puede: el servidor pone siempre la más nueva
 * (`take_superseded`) y cambiarlo es cambiar ese contrato; se dice, y las anteriores siguen en «Mis creaciones».
 * Solo lectura: esta pieza no pregunta nada al servidor, pinta lo que trae el hook (`hooks/useTomasDelPlano.ts`).
 */
const ProductionTomas: React.FC<{ historial: HistorialDeTomas | null | undefined; tipo: 'plano' | 'escena'; formato?: string }> = ({ historial, tipo, formato: proporcion }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [abierta, setAbierta] = useState(false);
  const [viendo, setViendo] = useState<{ numero: number; url: string } | null>(null);
  if (!historial || (historial.carga !== 'error' && historial.tomas.length === 0)) return null;
  const titulo = historial.carga === 'error'
    ? t('filmmaker.wsTakesError')
    : t(tipo === 'escena' ? 'filmmaker.wsTakesOfScene' : 'filmmaker.wsTakesOfShot', { contador: historial.tomas.length });
  const ver = async (numero: number, assetId: string) => {
    const url = await historial.urlDe(assetId);
    if (url) setViendo({ numero, url });
    else notify(t('filmmaker.wsTakesError'));
  };
  return (
    <View style={[styles.caja, { borderColor: theme.colors.border }]}>
      <TouchableOpacity
        onPress={() => setAbierta((a) => !a)}
        disabled={historial.carga === 'error'}
        style={[styles.cabecera, isWeb && ({ cursor: historial.carga === 'error' ? 'default' : 'pointer' } as object)]}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta, disabled: historial.carga === 'error' }}
        accessibilityLabel={titulo}
      >
        <Ionicons name="film-outline" size={scale(15)} color={historial.carga === 'error' ? theme.colors.error : theme.colors.accent} />
        <Text style={[styles.titulo, { color: historial.carga === 'error' ? theme.colors.error : theme.colors.text }]}>{titulo}</Text>
        {historial.carga !== 'error' && <Ionicons name={abierta ? 'chevron-up' : 'chevron-down'} size={scale(14)} color={theme.colors.textSecondary} />}
      </TouchableOpacity>
      {abierta && historial.carga !== 'error' && (
        <View style={styles.lista}>
          {historial.tomas.map((x) => {
            const enlace = CLAVE_DEL_ENLACE_DE_TOMA[x.link];
            const dinero = [
              x.credits.charged > 0 ? t('filmmaker.wsTakeCharged', { credits: formato.numero(x.credits.charged) }) : null,
              x.credits.refunded > 0 ? t('filmmaker.wsTakeRefunded', { credits: formato.numero(x.credits.refunded) }) : null,
            ].filter((d): d is string => !!d);
            return (
              <View key={x.requestId} style={[styles.toma, { borderTopColor: theme.colors.border }]}>
                <View style={styles.tomaTextos}>
                  <Text style={[styles.nombre, { color: theme.colors.text }]}>{t('filmmaker.wsTakeNumber', { numero: x.take })}</Text>
                  <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{[t(CLAVE_DEL_ESTADO_DE_TOMA[x.state]), ...dinero].join(' · ')}</Text>
                </View>
                {!!enlace && <Chip texto={t(enlace)} tono={x.link === 'linked' ? 'acento' : undefined} />}
                {!!x.assetId && (
                  <TouchableOpacity
                    onPress={() => { void ver(x.take, x.assetId as string); }}
                    accessibilityRole="button"
                    accessibilityLabel={t('filmmaker.wsTakeWatch', { numero: x.take })}
                    style={[styles.ver, isWeb && ({ cursor: 'pointer' } as object)]}
                  >
                    <Ionicons name="play-circle-outline" size={scale(22)} color={theme.colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsTakesLatestRule')}</Text>
        </View>
      )}
      {!!viendo && (
        <HojaInferior visible titulo={t('filmmaker.wsTakeNumber', { numero: viendo.numero })} onCerrar={() => setViendo(null)}>
          <ReproductorDeVideo url={viendo.url} formato={proporcion} nombre={t('filmmaker.wsTakeNumber', { numero: viendo.numero })} altoMaximo={scale(420)} />
        </HojaInferior>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm, minHeight: 44 },
  titulo: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  lista: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm, gap: SPACING.xs },
  toma: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: SPACING.xs },
  tomaTextos: { flex: 1, gap: 2 },
  nombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  ver: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});

export default ProductionTomas;
