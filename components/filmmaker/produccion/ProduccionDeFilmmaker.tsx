import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../../constants/estiloWeeAi';
import { PRODUCCION_ABIERTA } from '../../../constants/filmmakerCamara';
import { useTomaDePlano } from '../../../hooks/useTomaDePlano';
import type { ProduccionGuardada } from '../../../services/filmmakerService';
import { CALIDADES_DE_TOMA, CalidadDeToma } from '../../../utils/controladorDeToma';
import { videoService } from '../../../services/videoService';
import type { PresupuestoDeLote } from '../../../services/videoService';
import { CLAVE_DE_CALIDAD, fraseDelRechazoDeToma } from '../../../utils/mensajesDeFilmmaker';
import { idDePlano, idDeEscena, duracionFueraDeToma } from '../../../utils/filmmakerOrquestacion';
import { CuadroDeStoryboard, Tanda, TandasDelTaller, duracionDe, tandaEsDeEjemplo } from '../../../utils/tandasDeFilmmaker';
import { BotonBlanco, BotonContorno } from '../tandas/comunes';
import { FilaDeCapitulo } from './FilaDeCapitulo';

interface Props {
  tandas: TandasDelTaller;
  /** La producción tal como la guardó el servidor: de ella sale cada toma. Sin ella (aún no se guardó) las tomas no se piden. */
  guardada: ProduccionGuardada | null;
  /** Hay cambios en camino al servidor: mientras tanto no se genera (se generaría una cosa y se vería otra). */
  guardando: boolean;
  onJuntar: () => void;
  /** Vista previa local (solo desarrollo): «Producir» marca el capítulo como producido en pantalla; no genera ni cobra nada. */
  demo?: boolean;
  onIrACapitulos: () => void;
  /** La calidad fijada en el panel de ajustes del proyecto: cada toma y cada lote ARRANCAN con ella (la persona puede cambiarla). Sin ella, se elige. */
  calidadDelProyecto?: CalidadDeToma;
}

/** Los cuadros que de verdad viajan al servidor (con texto y que no son de muestra): los que se pueden producir. */
const reales = (t: Tanda): readonly CuadroDeStoryboard[] => t.cuadros.filter((c) => !c.ejemplo && c.texto.trim().length > 0);

/** UN CUADRO, SU TOMA. Pinta lo que dice la toma del servidor (precio, calidad, progreso, vídeo) y nada más: no calcula nada ni cobra por su cuenta. */
const FilaDeToma: React.FC<{ cuadro: CuadroDeStoryboard; numero: number; escenaId: string; guardada: ProduccionGuardada | null; guardando: boolean; onCambio: () => void; calidadInicial?: CalidadDeToma }> = ({ cuadro, numero, escenaId, guardada, guardando, onCambio, calidadInicial }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const seleccion = useMemo(() => ({ tipo: 'plano' as const, id: idDePlano(cuadro.id) }), [cuadro.id]);
  const toma = useTomaDePlano(guardada, guardando, seleccion);
  const { fase, calidad, enElPlano, ultima } = toma;
  /* Arranca con la calidad del proyecto (la del panel de ajustes), no con una propia. */
  useEffect(() => { if (calidadInicial && !calidad && fase.fase === 'elige_calidad') toma.elegirCalidad(calidadInicial); }, [calidadInicial, calidad, fase.fase]); // eslint-disable-line react-hooks/exhaustive-deps
  const nota = (texto: string, fuerte = false) => <Text style={[textoPortada(12, fuerte ? '600' : '400'), dir.texto, { color: fuerte ? P.tinta : P.tintaSecundaria }]}>{texto}</Text>;
  const boton = (texto: string, onPress: () => void, apagado = false) => (
    <TouchableOpacity onPress={onPress} disabled={apagado} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={texto} accessibilityState={{ disabled: apagado }} style={[styles.boton, apagado && { opacity: 0.5 }]}>
      <Text style={[textoPortada(14, '600'), { color: P.tinta, textAlign: 'center' }]} numberOfLines={2}>{texto}</Text>
    </TouchableOpacity>
  );
  const f = fase.fase;
  const pidiendo = f === 'pidiendo';
  const eligiendo = f === 'elige_calidad' || f === 'cotizando' || f === 'cotizada' || f === 'rechazada' || pidiendo;

  return (
    <View style={styles.fila} testID={`toma-${numero}`}>
      <View style={[styles.cabeza, dir.contenedor]}>
        <View style={styles.numero}><Text style={[textoPortada(12, '600'), { color: P.tinta }]}>{formato.numero(numero)}</Text></View>
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tinta, flex: 1 }]} numberOfLines={2}>{cuadro.texto}</Text>
      </View>
      {duracionFueraDeToma(cuadro.duracion) === 'corta' ? nota(t('filmmakerProd.takeShort')) : null}

      {enElPlano ? (
        <View style={[styles.cabeza, dir.contenedor]}>
          <Ionicons name="checkmark-circle-outline" size={16} color={P.tinta} />
          <Text style={[textoPortada(13, '600'), dir.texto, { color: P.tinta, flex: 1 }]}>{ultima?.estado === 'lista' && ultima.assetId === enElPlano.assetId ? t('filmmaker.takeReady', { numero: formato.numero(ultima.toma) }) : t('filmmaker.takeHasVideo')}</Text>
          {enElPlano.url ? <TouchableOpacity onPress={() => { void Linking.openURL(enElPlano.url as string); }} accessibilityRole="button" accessibilityLabel={t('filmmaker.takeOpen')} style={styles.abrir}><Text style={[textoPortada(13, '600'), { color: P.tinta }]}>{t('filmmaker.takeOpen')}</Text></TouchableOpacity> : null}
        </View>
      ) : null}
      {ultima?.estado === 'fallida' ? nota(t('filmmaker.takeFailed', { numero: formato.numero(ultima.toma) })) : null}

      {f === 'sin_unidad' ? null
        : f === 'no_disponible' ? nota(t(fase.porque === 'sin_guardar' ? 'filmmaker.takeNeedsSaving' : fase.porque === 'archivada' ? 'filmmaker.takeArchived' : 'filmmaker.takeNeedsReady'))
        : f === 'consultando' ? nota(t('filmmaker.takeChecking'))
        : f === 'en_proceso' || f === 'terminando' ? (<>{nota(t(f === 'en_proceso' ? 'filmmaker.takeWorking' : 'filmmaker.takeLinking'), true)}{f === 'en_proceso' && guardada ? boton(t('filmmakerProd.cancelTake'), () => { void videoService.cancelTake({ productionId: guardada.productionId, sceneId: escenaId, unitId: idDePlano(cuadro.id), revision: guardada.revision, requirement: null, take: fase.toma }).then(onCambio); }) : null}</>)
        : f === 'error' ? (<>{nota(fraseDelRechazoDeToma(fase.rechazo, t, formato))}{boton(t('common.retry'), toma.reintentar)}</>)
        : eligiendo ? (
          <View style={{ gap: 8 }}>
            <View style={[styles.calidades, dir.contenedor]}>
              {CALIDADES_DE_TOMA.map((c) => (
                <TouchableOpacity key={c} onPress={() => toma.elegirCalidad(c)} disabled={pidiendo} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(CLAVE_DE_CALIDAD[c])} accessibilityState={{ selected: c === calidad, disabled: pidiendo }} style={[styles.calidad, c === calidad && styles.calidadSel]}>
                  <Text style={[textoPortada(13, c === calidad ? '600' : '500'), { color: c === calidad ? P.tinta : P.tintaSecundaria }]} numberOfLines={1}>{t(CLAVE_DE_CALIDAD[c])}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {f === 'elige_calidad' ? nota(t('filmmaker.takeChooseQuality')) : null}
            {f === 'cotizando' ? nota(t('filmmaker.takeQuoting')) : null}
            {f === 'rechazada' ? nota(fraseDelRechazoDeToma(fase.rechazo, t, formato)) : null}
            {pidiendo ? nota(t('filmmaker.takeSending')) : null}
            {f === 'cotizada' ? (
              <>
                {toma.aviso === 'precio_cambiado' ? nota(t('filmmaker.takePriceChanged'), true) : null}
                {nota(t('filmmaker.takePrice', { credits: formato.numero(fase.creditos) }), true)}
                {boton(ultima || enElPlano ? t('filmmaker.takeGenerateAgain') : t('filmmaker.takeGenerateShot'), toma.generar)}
              </>
            ) : null}
          </View>
        ) : null}
    </View>
  );
};

/** PRODUCIR UN CAPÍTULO ENTERO: calidad → presupuesto (≈ N Credits, qué ya está o no se puede) → confirmar → el servidor pide cada cuadro en orden y para al primer fallo. */
const BloqueDeLote: React.FC<{ tanda: Tanda; cuadros: readonly CuadroDeStoryboard[]; guardada: ProduccionGuardada | null; guardando: boolean; onCambio: () => void; calidadInicial?: CalidadDeToma }> = ({ tanda, cuadros, guardada, guardando, onCambio, calidadInicial }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const [calidad, setCalidad] = useState<CalidadDeToma | null>(calidadInicial ?? null);
  const [fase, setFase] = useState<'libre' | 'cotizando' | 'cotizado' | 'generando' | 'listo'>('libre');
  const [presupuesto, setPresupuesto] = useState<PresupuestoDeLote | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const lote = (q: CalidadDeToma) => ({ productionId: (guardada as ProduccionGuardada).productionId, revision: (guardada as ProduccionGuardada).revision, quality: q, units: cuadros.map((c) => idDePlano(c.id)) });
  const cotizar = async (q: CalidadDeToma) => {
    if (!guardada || guardando) return;
    setCalidad(q); setFase('cotizando'); setMensaje(null);
    const r = await videoService.quoteBatch(lote(q));
    if (!r.ok) { setMensaje(fraseDelRechazoDeToma(r.rechazo, t, formato)); setFase('libre'); return; }
    setPresupuesto(r.valor); setFase('cotizado');
  };
  const confirmar = async () => {
    if (!guardada || !calidad || !presupuesto) return;
    setFase('generando');
    const r = await videoService.generateBatch(lote(calidad), presupuesto.total.credits);
    if (!r.ok) { setMensaje(fraseDelRechazoDeToma(r.rechazo, t, formato)); setFase('libre'); onCambio(); return; }
    setMensaje(r.valor.stoppedAt || r.valor.reason ? t('filmmakerProd.batchStopped') : t('filmmakerProd.batchDone'));
    setFase('listo'); onCambio();
  };
  const boton = (texto: string, onPress: () => void, apagado = false) => (
    <TouchableOpacity onPress={onPress} disabled={apagado} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={texto} accessibilityState={{ disabled: apagado }} style={[styles.boton, apagado && { opacity: 0.5 }]}>
      <Text style={[textoPortada(14, '600'), { color: P.tinta, textAlign: 'center' }]} numberOfLines={2}>{texto}</Text>
    </TouchableOpacity>
  );
  const nota = (x: string, fuerte = false) => <Text style={[textoPortada(12, fuerte ? '600' : '400'), dir.texto, { color: fuerte ? P.tinta : P.tintaSecundaria }]} accessibilityLiveRegion="polite">{x}</Text>;
  return (
    <View style={styles.fila} testID={'lote-' + tanda.id}>
      <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta }]}>{t('filmmakerProd.batchProduce')}</Text>
      <View style={[styles.calidades, dir.contenedor]}>
        {CALIDADES_DE_TOMA.map((c) => (
          <TouchableOpacity key={c} onPress={() => { void cotizar(c); }} disabled={fase === 'cotizando' || fase === 'generando' || guardando || !guardada} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(CLAVE_DE_CALIDAD[c])} accessibilityState={{ selected: c === calidad }} style={[styles.calidad, c === calidad && styles.calidadSel]}>
            <Text style={[textoPortada(13, c === calidad ? '600' : '500'), { color: c === calidad ? P.tinta : P.tintaSecundaria }]} numberOfLines={1}>{t(CLAVE_DE_CALIDAD[c])}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {guardando || !guardada ? nota(t('filmmaker.takeNeedsSaving')) : null}
      {fase === 'cotizando' ? nota(t('filmmaker.takeQuoting')) : null}
      {fase === 'cotizado' && presupuesto ? (
        <>
          {nota(t('filmmakerProd.batchQuote', { credits: formato.numero(presupuesto.total.credits), contador: presupuesto.total.units }), true)}
          {presupuesto.skipped.done + presupuesto.skipped.inFlight > 0 ? nota(t('filmmakerProd.batchSkipped', { n: formato.numero(presupuesto.skipped.done + presupuesto.skipped.inFlight) })) : null}
          {presupuesto.skipped.blocked > 0 ? nota(t('filmmakerProd.batchBlocked', { n: formato.numero(presupuesto.skipped.blocked) })) : null}
          {!presupuesto.enough ? nota(t('filmmakerProd.batchNoCredits'), true) : null}
          {boton(t('filmmakerProd.batchConfirm'), () => { void confirmar(); }, !presupuesto.enough || presupuesto.total.units === 0)}
        </>
      ) : null}
      {fase === 'generando' ? nota(t('filmmakerProd.batchWorking'), true) : null}
      {mensaje ? nota(mensaje) : null}
    </View>
  );
};

/**
 * PRODUCCIÓN (etapa 4): los cuadros de los capítulos aprobados, cada uno con su toma. Se produce cuadro a cuadro, con su precio «≈ N Credits» junto al
 * botón que lo causa y la confirmación de cada uno (es la toma que ya existe en el servidor: cotizar → reservar → generar → enlazar). Mientras la
 * capacidad esté cerrada (`PRODUCCION_ABIERTA`) la pantalla es solo la lista de lo aprobado y UNA línea con el motivo: nada se simula.
 */
export const ProduccionDeFilmmaker: React.FC<Props> = ({ tandas, guardada, guardando, onJuntar, onIrACapitulos, demo = false, calidadDelProyecto }) => {
  const [hechos, setHechos] = useState<readonly string[]>([]);
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const [version, setVersion] = useState(0);
  const refrescar = () => setVersion((v) => v + 1);
  const aprobadas = tandas.tandas.filter((x) => x.aprobada && !tandaEsDeEjemplo(x) && reales(x).length > 0);

  return (
    <View style={styles.raiz}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={[textoPortada(22, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmakerProd.prodTitle')}</Text>
        {demo ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerProd.demoProduceNote')}</Text> : !PRODUCCION_ABIERTA ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerTandas.produceClosed')}</Text> : null}
        {aprobadas.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={[textoPortada(15, '500'), { color: P.tintaSecundaria, textAlign: 'center' }]}>{t('filmmakerProd.prodEmpty')}</Text>
            <BotonContorno texto={t('filmmakerProd.goChapters')} onPress={onIrACapitulos} />
          </View>
        ) : aprobadas.map((tanda) => {
          const cuadros = reales(tanda);
          const indice = tandas.tandas.findIndex((x) => x.id === tanda.id) + 1;
          return (
            <View key={tanda.id} style={{ gap: 8 }}>
              <FilaDeCapitulo tanda={tanda} posicion={indice} cuadros={cuadros.length} estado={demo && hechos.includes(tanda.id) ? 'listo' : 'pendiente'} />
              {demo && !hechos.includes(tanda.id) ? <BotonContorno texto={t('filmmakerProd.demoProduce')} icono="play-outline" onPress={() => setHechos((h) => [...h, tanda.id])} testID={'demo-producir-' + tanda.id} /> : null}
              {PRODUCCION_ABIERTA && !demo ? <BloqueDeLote key={'l' + tanda.id + version} tanda={tanda} cuadros={cuadros} guardada={guardada} guardando={guardando} onCambio={refrescar} calidadInicial={calidadDelProyecto} /> : null}
              {PRODUCCION_ABIERTA && !demo ? cuadros.map((c, i) => <FilaDeToma key={c.id + version} cuadro={c} numero={i + 1} escenaId={idDeEscena(tanda.id)} guardada={guardada} guardando={guardando} onCambio={refrescar} calidadInicial={calidadDelProyecto} />) : null}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.pie}>
        <BotonBlanco texto={t('filmmakerProd.goJoin')} onPress={onJuntar} apagado={aprobadas.length === 0 || (!PRODUCCION_ABIERTA && !demo)} motivo={aprobadas.length === 0 ? t('filmmakerProd.prodEmpty') : t('filmmakerTandas.produceClosed')} testID="produccion-juntar" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 14 },
  vacio: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  fila: { gap: 8, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numero: { minWidth: 24, height: 24, paddingHorizontal: 5, borderRadius: 6, borderWidth: 1, borderColor: P.tinta, alignItems: 'center', justifyContent: 'center' },
  abrir: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  boton: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: P.bordeLuz, alignItems: 'center', justifyContent: 'center' },
  calidades: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  calidad: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, alignItems: 'center', justifyContent: 'center' },
  calidadSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  pie: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
});
