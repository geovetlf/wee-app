import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useT, useIdioma } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../../constants/estiloWeeAi';
import { JUNTAR_ABIERTO } from '../../../constants/filmmakerCamara';
import { LIMITE_DEL_MONTAJE, TandasDelTaller, excesoDelMontaje, tandaEsDeEjemplo, totales } from '../../../utils/tandasDeFilmmaker';
import { BotonBlanco, useTiempo } from '../tandas/comunes';
import { FilaDeCapitulo } from './FilaDeCapitulo';
import { useEstadoDeLaProduccion } from '../../../hooks/useEstadoDeLaProduccion';
import { estadoDelCapitulo, estadosDeLosCuadros } from '../../../utils/estadoDeLaProduccion';
import type { ProduccionGuardada } from '../../../services/filmmakerService';

/** El tope diario de montajes del servidor (render): se enseña para que nadie se encuentre el límite al final. */
const MONTAJES_POR_DIA = 5;

interface Props {
  tandas: TandasDelTaller;
  /** Une los cuadros en un solo vídeo. Sin él (o con `JUNTAR_ABIERTO = false`) el botón sale cerrado con su motivo. */
  onJuntar?: () => void;
  /** Vista previa local (solo desarrollo): «Juntar» enseña una pantalla de resultado de ejemplo; no monta nada ni cobra. */
  demo?: boolean;
  /** La producción guardada: de ella salen, en UNA lectura del servidor (`shot.production` y `shot.montage`), el estado de cada capítulo y si ya se puede montar. */
  guardada?: ProduccionGuardada | null;
}

/**
 * JUNTAR (etapa 5): todos los cuadros de los capítulos, en orden, en un solo vídeo. Una sola acción. Lo que se enseña es lo real: cuántos cuadros y
 * cuánto dura contra el límite del montaje (60 cuadros y 10:00) y, si te pasas, cuánto. El coste, si lo hay, va junto al botón; mientras el montaje
 * esté cerrado el botón dice por qué en una línea y no se simula nada.
 */
export const JuntarDeFilmmaker: React.FC<Props> = ({ tandas, onJuntar, demo = false, guardada = null }) => {
  const [vista, setVista] = useState(false);
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const tiempo = useTiempo();
  const reales: TandasDelTaller = { ...tandas, tandas: tandas.tandas.filter((x) => !tandaEsDeEjemplo(x)) };
  const { produccion, montaje } = useEstadoDeLaProduccion(guardada, !demo && JUNTAR_ABIERTO, 0, true);
  const porCuadro = useMemo(() => estadosDeLosCuadros(produccion, reales), [produccion, tandas]); // eslint-disable-line react-hooks/exhaustive-deps
  const suma = totales(reales);
  const exceso = excesoDelMontaje(reales);
  const pasado = exceso.planos || exceso.segundos;
  const abierto = demo ? suma.cuadros > 0 && !pasado : JUNTAR_ABIERTO && !!onJuntar && suma.cuadros > 0 && !pasado && montaje?.listo === true;
  const motivo = suma.cuadros === 0 ? t('filmmakerProd.joinEmpty') : pasado ? null : !JUNTAR_ABIERTO && !demo ? t('filmmakerProd.joinClosed') : !demo && montaje?.listo !== true ? t('filmmakerProd.joinNotReady') : null;

  return (
    <View style={styles.raiz}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={[textoPortada(22, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmakerProd.joinTitle')}</Text>
        {reales.tandas.map((x, i) => <FilaDeCapitulo key={x.id} tanda={x} posicion={i + 1} cuadros={x.cuadros.filter((c) => !c.ejemplo).length} estado={estadoDelCapitulo(x.cuadros.map((c) => c.id), porCuadro) ?? 'pendiente'} />)}
        <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]}>{t('filmmakerTandas.frames', { contador: suma.cuadros })} · {tiempo.solo(suma.segundos)}</Text>
        <Text style={[textoPortada(12, '400'), dir.texto, { color: pasado ? P.tinta : P.tintaSecundaria }]} accessibilityLiveRegion="polite">
          {t(pasado ? 'filmmakerTandas.limitOver' : 'filmmakerTandas.limitNote', { planos: formato.numero(LIMITE_DEL_MONTAJE.planos), duracion: tiempo.solo(LIMITE_DEL_MONTAJE.segundos) })}
        </Text>
        {demo && vista ? <View style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie, gap: 6 }} testID="demo-resultado"><Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]}>{t('filmmakerProd.demoResultTitle')}</Text><Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerProd.demoResultBody', { duracion: tiempo.solo(suma.segundos) })}</Text></View> : null}
        <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerProd.joinDaily', { n: formato.numero(MONTAJES_POR_DIA) })}</Text>
      </ScrollView>
      <View style={styles.pie}>
        <BotonBlanco texto={t('filmmakerProd.joinAction')} onPress={() => { if (!abierto) return; if (demo) setVista(true); else if (onJuntar) onJuntar(); }} apagado={!abierto} motivo={motivo} testID="juntar-accion" />
        {motivo ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} accessibilityLiveRegion="polite">{motivo}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 10 },
  pie: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 6 },
});
