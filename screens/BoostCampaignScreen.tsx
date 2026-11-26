import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useDireccion } from '../hooks/useDireccion';
import { boostService, BoostCampaign, motivoDeError } from '../services/boostService';
import { confirmAction, notify } from '../utils/notify';
import MarcoDeBoost from '../components/boost/MarcoDeBoost';
import { Aviso, Boton, claveDeError, claveDeMotivo, DORADO, EstadoDeCampana, Fila, Tarjeta, VistaDePublicacion } from '../components/boost/PiezasDeBoost';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * UNA PROMOCIÓN — estado, dinero y resultados, tal y como los guarda el servidor.
 *
 *  · Estado real: `active` (se está ofreciendo en el Inicio de otras cuentas), `settling` (se está cerrando y
 *    calculando lo consumido) o `ended`.
 *  · Dinero: lo reservado, lo consumido (hasta ahora o al cerrar) y lo devuelto. Lo calcula el servidor con la misma
 *    regla con la que liquida el Credit Engine; aquí no se resta nada.
 *  · Resultados: impresiones, personas alcanzadas, aperturas y días con entrega, de eventos registrados por el
 *    servidor. Si todo está a cero, «Todavía no hay datos»: nunca un número inventado.
 *  · Terminar: confirma cuánto se consumirá y cuánto vuelve, y lo pide al servidor.
 */
const BoostCampaignScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const campaignId: string = String(route.params?.campaignId ?? '');
  const [c, setC] = useState<BoostCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminando, setTerminando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setC(await boostService.leer(campaignId));
    } catch (e) {
      setError(motivoDeError(e));
    }
  }, [campaignId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const creditos = (n: number) => t('boost.credits', { cantidad: formato.numero(n) });
  const fecha = (ms: number) => formato.fecha(ms, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const accion = { texto: t('boost.myPromotions'), icono: 'list-outline', onPress: () => navigation.navigate('BoostCampaigns') };

  const terminar = async () => {
    if (!c) return;
    const ok = await confirmAction(
      t('boost.endConfirmTitle'),
      t('boost.endConfirmBody', { consumido: formato.numero(c.consumedSoFar), devuelto: formato.numero(c.budgetCredits - c.consumedSoFar) }),
      t('boost.endConfirmButton'),
      true,
      t,
    );
    if (!ok) return;
    setTerminando(true);
    try {
      const final = await boostService.terminar(c.id);
      setC(final);
      if (final.settlement) notify(t('boost.detailTitle'), t('boost.endedNotice', { cantidad: formato.numero(final.settlement.refunded) }));
    } catch (e) {
      setError(motivoDeError(e));
    } finally {
      setTerminando(false);
    }
  };

  if (error && !c) {
    return (
      <MarcoDeBoost titulo={t('boost.detailTitle')} accion={accion}>
        <Aviso tono="error" titulo={t('boost.errTitle')} texto={t(claveDeError(error))} />
        <Boton texto={t('common.retry')} secundario onPress={cargar} />
      </MarcoDeBoost>
    );
  }
  if (!c) {
    return (
      <MarcoDeBoost titulo={t('boost.detailTitle')} accion={accion}>
        <View style={st.cargando} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
          <ActivityIndicator color={DORADO} />
        </View>
      </MarcoDeBoost>
    );
  }

  const motivo = claveDeMotivo(c.endedReason);
  const sinDatos = c.metrics.impressions === 0 && c.metrics.clicks === 0;
  const objetivo = c.objective === 'reach' ? 'boost.objReach' : 'boost.objInteraction';
  const publico = c.audience.segment === 'everyone' ? 'boost.segEveryone' : c.audience.segment === 'contacts' ? 'boost.segContacts' : 'boost.segCommunity';

  return (
    <MarcoDeBoost titulo={t('boost.detailTitle')} accion={accion}>
      <Tarjeta>
        <EstadoDeCampana estado={c.status} />
        {motivo ? <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>{t(motivo)}</Text> : null}
        <VistaDePublicacion texto={c.preview.text} imagen={c.preview.image} video={c.preview.video} />
        <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>
          {t('boost.period', { inicio: fecha(c.startsAt), fin: fecha(c.endedAt ?? c.endsAt) })}
        </Text>
      </Tarjeta>

      <Tarjeta titulo={t('boost.stepSummary')} rol="summary">
        <Fila clave={t('boost.stepObjective')} valor={t(objetivo)} />
        <Fila clave={t('boost.stepAudience')} valor={t(publico)} />
        <Fila clave={t('boost.stepDuration')} valor={t('boost.days', { contador: c.durationDays })} />
        <Fila clave={t('boost.reserved')} valor={creditos(c.budgetCredits)} />
        {c.settlement ? (
          <>
            <Fila clave={t('boost.consumed')} valor={creditos(c.settlement.consumed)} fuerte />
            <Fila clave={t('boost.refunded')} valor={creditos(c.settlement.refunded)} fuerte />
          </>
        ) : (
          <Fila clave={t('boost.consumedSoFar')} valor={creditos(c.consumedSoFar)} fuerte />
        )}
      </Tarjeta>

      <Tarjeta titulo={t('boost.results')}>
        <Text style={[st.pista, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.resultsReal')}</Text>
        {sinDatos ? (
          <Text style={[st.sinDatos, dir.texto, { color: theme.colors.text }]}>{t('boost.noData')}</Text>
        ) : (
          <View style={st.metricas}>
            {[
              [t('boost.impressions'), c.metrics.impressions],
              [t('boost.reach'), c.metrics.reach],
              [t('boost.clicks'), c.metrics.clicks],
              [t('boost.deliveredDays'), c.metrics.deliveredDays],
            ].map(([k, v]) => (
              <View key={String(k)} style={[st.metrica, { borderColor: theme.colors.border }]}>
                <Text style={[st.metricaValor, { color: theme.colors.text }]}>{formato.numero(Number(v))}</Text>
                <Text style={[st.metricaClave, dir.texto, { color: theme.colors.textSecondary }]}>{String(k)}</Text>
              </View>
            ))}
          </View>
        )}
      </Tarjeta>

      {error ? <Aviso tono="error" titulo={t('boost.errTitle')} texto={t(claveDeError(error))} /> : null}
      {c.status === 'active' ? (
        <Boton texto={t('boost.endPromotion')} icono="stop-circle-outline" peligro onPress={terminar} cargando={terminando} />
      ) : null}
    </MarcoDeBoost>
  );
};

const st = StyleSheet.create({
  cargando: { paddingVertical: scale(40), alignItems: 'center' },
  pista: { fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  sinDatos: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  metricas: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  metrica: { flexGrow: 1, flexBasis: scale(120), borderWidth: StyleSheet.hairlineWidth, borderRadius: scale(14), padding: SPACING.md, gap: scale(2) },
  metricaValor: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  metricaClave: { fontSize: FONT_SIZE.xs },
});

export default BoostCampaignScreen;
