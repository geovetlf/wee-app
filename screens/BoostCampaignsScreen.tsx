import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useDireccion } from '../hooks/useDireccion';
import { boostService, BoostCampaign, motivoDeError } from '../services/boostService';
import MarcoDeBoost from '../components/boost/MarcoDeBoost';
import { Aviso, Boton, claveDeError, claveDeEstado, DORADO, EstadoDeCampana, VistaDePublicacion } from '../components/boost/PiezasDeBoost';
import { SPACING, FONT_SIZE } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * MIS PROMOCIONES — el historial de Boost de la cuenta (las dos caras comparten billetera e historial).
 *
 * Solo lee, por la callable `boost` (`list`): el servidor devuelve las campañas de ESTA cuenta y nada interno. Cada
 * fila dice su estado real, lo reservado y lo consumido hasta ahora; el detalle está en `BoostCampaign`.
 */
const BoostCampaignsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const [lista, setLista] = useState<BoostCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setLista(await boostService.listar());
    } catch (e) {
      setError(motivoDeError(e));
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const nueva = () => navigation.navigate('Boost', { tipo: 'post', id: 'elegir' });

  return (
    <MarcoDeBoost titulo={t('boost.myPromotions')} accion={{ texto: t('boost.newPromotion'), icono: 'add', onPress: nueva }}>
      {error ? (
        <>
          <Aviso tono="error" titulo={t('boost.errTitle')} texto={t(claveDeError(error))} />
          <Boton texto={t('common.retry')} secundario onPress={cargar} />
        </>
      ) : !lista ? (
        <View style={st.cargando} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
          <ActivityIndicator color={DORADO} />
        </View>
      ) : lista.length === 0 ? (
        <>
          <Text style={[st.vacio, dir.texto, { color: theme.colors.textSecondary }]}>{t('boost.historyEmpty')}</Text>
          <Boton texto={t('boost.newPromotion')} icono="rocket-outline" onPress={nueva} />
        </>
      ) : (
        lista.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => navigation.navigate('BoostCampaign', { campaignId: c.id })}
            style={[st.fila, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null]}
            accessibilityRole="button"
            accessibilityLabel={t(claveDeEstado(c.status))}
          >
            <EstadoDeCampana estado={c.status} />
            <VistaDePublicacion texto={c.preview.text} imagen={c.preview.image} video={c.preview.video} />
            <Text style={[st.datos, dir.texto, { color: theme.colors.textSecondary }]}>
              {t('boost.period', { inicio: formato.fecha(c.startsAt, { day: 'numeric', month: 'short' }), fin: formato.fecha(c.endedAt ?? c.endsAt, { day: 'numeric', month: 'short' }) })}
              {' · '}
              {t('boost.reserved')}: {t('boost.credits', { cantidad: formato.numero(c.budgetCredits) })}
              {' · '}
              {c.settlement ? t('boost.consumed') : t('boost.consumedSoFar')}: {t('boost.credits', { cantidad: formato.numero(c.settlement ? c.settlement.consumed : c.consumedSoFar) })}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </MarcoDeBoost>
  );
};

const st = StyleSheet.create({
  cargando: { paddingVertical: scale(40), alignItems: 'center' },
  vacio: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  fila: { borderRadius: scale(20), borderWidth: StyleSheet.hairlineWidth, padding: SPACING.lg, gap: SPACING.sm },
  datos: { fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
});

export default BoostCampaignsScreen;
