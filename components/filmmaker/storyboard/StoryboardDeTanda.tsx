import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../../constants/estiloWeeAi';
import { COMANDOS_DE_CAMARA, claveDelValor } from '../../../constants/camaraCinematica';
import { ALMACEN_DE_LA_CUENTA_ABIERTO, GENERAR_IMAGENES_DEL_STORYBOARD, PRODUCCION_ABIERTA } from '../../../constants/filmmakerCamara';
import { CuadroDeStoryboard, NARRADOR, Tanda, duracionDe, estadoDe, puedeAprobar, puedeGuardarEnAlmacen, tandaEsDeEjemplo, tiemposDe } from '../../../utils/tandasDeFilmmaker';
import { etiquetaAccesible } from '../../../utils/ideaDeFilmmaker';
import { BotonBlanco, BotonContorno, PastillaDeEstado, useTiempo } from '../tandas/comunes';

interface Props {
  tanda: Tanda;
  /** Posición de la tanda (1, 2…) para su nombre por defecto «Capítulo n». */
  posicion: number;
  ancho: number;
  compacto: boolean;
  /** Con volver, la tanda se ve a pantalla completa (móvil); sin él, está junto a la lista (tableta y escritorio). */
  onVolver?: () => void;
  onAbrirCuadro: (id: string) => void;
  onAnadir: () => void;
  onAprobar: () => void;
  onGuardarEnAlmacen: () => void;
  onEjemplo: () => void;
  onQuitarEjemplo: () => void;
  hayEjemplos: boolean;
  onAviso: (mensaje: string) => void;
}

/** El pictograma del ENCUADRE elegido en un cuadro (o el de su movimiento o cámara si no hay encuadre), para su miniatura. */
const iconoDelCuadro = (c: CuadroDeStoryboard): keyof typeof Ionicons.glyphMap => {
  const plano = COMANDOS_DE_CAMARA.find((x) => x.ruta === 'shot.type' && x.valor === c.creativo['shot.type']);
  if (plano) return plano.icono as keyof typeof Ionicons.glyphMap;
  const mov = c.creativo['movement.type'];
  const cmd = COMANDOS_DE_CAMARA.find((x) => (mov && x.ruta === 'movement.type' && x.valor === mov) || (!mov && x.ruta === 'camera.type' && c.creativo['camera.type'] === x.valor));
  return (cmd?.icono as keyof typeof Ionicons.glyphMap) ?? 'videocam-outline';
};

/**
 * EL STORYBOARD DE UNA TANDA: rejilla de cuadros como en las referencias del dueño —número, tiempo «0:00–0:06», rótulo de plano, texto y miniatura—,
 * con el recuento y la duración contra el objetivo. La miniatura es un marcador con el icono de su cámara: generar las imágenes está CERRADO (regla 10)
 * y la rejilla se rotula «referencia visual, no vista previa exacta». Un único botón blanco: añadir → aprobar → guardar en el almacén → producir (cerrado).
 */
export const StoryboardDeTanda: React.FC<Props> = ({ tanda, posicion, ancho, compacto, onVolver, onAbrirCuadro, onAnadir, onAprobar, onGuardarEnAlmacen, onEjemplo, onQuitarEjemplo, hayEjemplos, onAviso }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const tiempo = useTiempo();
  const estado = estadoDe(tanda);
  const tiempos = tiemposDe(tanda);
  const dur = duracionDe(tanda);
  const titulo = tanda.titulo || t('filmmakerTandas.chapterN', { n: formato.numero(posicion) });
  const columnas = ancho >= 1100 ? 4 : ancho >= 640 ? 3 : 2;
  const hueco = 10;
  const util = Math.min(ancho, 1200) - 32 - 16; /* 16 dp de holgura para la barra de desplazamiento de la web */
  const lado = Math.floor((util - hueco * (columnas - 1)) / columnas);
  const pct = Math.min(1, tanda.objetivo > 0 ? dur / tanda.objetivo : 0);
  const ejemplo = tandaEsDeEjemplo(tanda);

  const cuadro = (c: CuadroDeStoryboard, i: number) => {
    const claveDePlano = claveDelValor('shot.type', c.creativo['shot.type'] ?? '');
    const rango = tiempo.rango(tiempos[i].inicio, tiempos[i].fin);
    const plano = claveDePlano ? t(claveDePlano) : t('filmmakerTandas.shotUndecided');
    return (
      <TouchableOpacity key={c.id} testID={`cuadro-${i + 1}`} onPress={() => onAbrirCuadro(c.id)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerTandas.frameTitle', { n: formato.numero(i + 1) }), rango, plano, c.texto || null, t('filmmakerTandas.openFrame'))} style={{ width: lado }}>
        <View style={[styles.miniatura, { height: Math.round((lado * 9) / 16) }]}>
          <LinearGradient colors={['#0A0D13', '#1B2029']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Ionicons name={iconoDelCuadro(c)} size={Math.round(lado * 0.2)} color={P.tintaDeshabilitada} />
          <View style={[styles.numero, { start: 6 }]}><Text style={[textoPortada(12, '600'), { color: P.tinta }]}>{formato.numero(i + 1)}</Text></View>
          <View style={[styles.tiempo, { end: 6 }]}><Text style={[textoPortada(11, '600'), { color: P.tinta }]} numberOfLines={1}>{rango}</Text></View>
        </View>
        <Text style={[textoPortada(12, '600'), dir.texto, { color: P.luz, marginTop: 6 }]} numberOfLines={1}>{plano}</Text>
        {c.hablante === NARRADOR ? <Text style={[textoPortada(11, '600'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{t('filmmakerTandas.speakerNarrator')}</Text> : null}
        <Text style={[textoPortada(12, '400'), dir.texto, { color: c.texto ? P.tinta : P.tintaSecundaria }]} numberOfLines={3}>{c.texto || t('filmmakerTandas.frameEmpty')}</Text>
      </TouchableOpacity>
    );
  };

  /* El botón blanco único, según el momento del storyboard. */
  const principal = ((): { texto: string; onPress: () => void; apagado: boolean; motivo: string | null; nota: string | null } => {
    if (tanda.cuadros.length === 0) return { texto: t('filmmakerTandas.addFrame'), onPress: onAnadir, apagado: false, motivo: null, nota: null };
    if (!tanda.aprobada) return { texto: t('filmmakerTandas.approveBoard'), onPress: onAprobar, apagado: !puedeAprobar(tanda), motivo: null, nota: null };
    if (!tanda.almacen) return { texto: t('filmmakerTandas.saveToStore'), onPress: onGuardarEnAlmacen, apagado: !puedeGuardarEnAlmacen(tanda), motivo: null, nota: null };
    return { texto: t('filmmakerTandas.actProduce'), onPress: () => onAviso(t('filmmakerTandas.produceClosed')), apagado: !PRODUCCION_ABIERTA, motivo: t('filmmakerTandas.produceClosed'), nota: `${t('filmmakerSonido.priceTitle')}: ${t('filmmakerSonido.priceUnknown')} · ${t('filmmakerTandas.produceClosed')}` };
  })();

  return (
    <View style={styles.raiz}>
      <View style={styles.fijo}>
        <View style={[styles.cabeza, dir.contenedor]}>
          {onVolver ? <TouchableOpacity onPress={onVolver} accessibilityRole="button" accessibilityLabel={t('filmmakerTandas.backToChapters')} style={styles.volver}><Ionicons name={dir.esRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={P.tinta} /></TouchableOpacity> : null}
          <Text style={[textoPortada(compacto ? 18 : 22, '600'), dir.texto, { color: P.tinta, flex: 1 }]} accessibilityRole="header" numberOfLines={2}>{titulo}</Text>
          <PastillaDeEstado estado={estado} />
        </View>
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>
          {t('filmmakerTandas.frames', { contador: tanda.cuadros.length })} · {t('filmmakerTandas.durationOf', { hecho: tiempo.solo(dur), objetivo: tiempo.solo(tanda.objetivo) })}
        </Text>
        <View style={styles.barra} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}><View style={[styles.relleno, { width: `${Math.round(pct * 100)}%` }]} /></View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">

        {ejemplo ? (
          <View style={[styles.nota, dir.contenedor]}>
            <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tintaSecundaria, flex: 1 }]}>{t('filmmakerTandas.exampleNote')}</Text>
            <TouchableOpacity onPress={onQuitarEjemplo} accessibilityRole="button" accessibilityLabel={t('filmmakerTandas.clearExample')} style={styles.quitar}><Text style={[textoPortada(13, '600'), { color: P.tinta }]}>{t('filmmakerTandas.clearExample')}</Text></TouchableOpacity>
          </View>
        ) : null}

        {tanda.cuadros.length === 0 ? (
          <View style={styles.vacio}>
            <Ionicons name="film-outline" size={28} color={P.tintaDeshabilitada} />
            <Text style={[textoPortada(15, '500'), { color: P.tintaSecundaria, textAlign: 'center' }]}>{t('filmmakerTandas.boardEmpty')}</Text>
            <BotonContorno texto={t('filmmakerTandas.loadExample')} icono="sparkles-outline" onPress={onEjemplo} testID="cargar-ejemplo" />
          </View>
        ) : (
          <View style={[styles.rejilla, dir.contenedor]}>
            {tanda.cuadros.map(cuadro)}
            <TouchableOpacity testID="anadir-cuadro" onPress={onAnadir} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('filmmakerTandas.addFrame')} style={{ width: lado }}>
              <View style={[styles.nuevo, { height: Math.round((lado * 9) / 16) }]}>
                <Ionicons name="add" size={26} color={P.tinta} />
                <Text style={[textoPortada(12, '600'), { color: P.tinta }]} numberOfLines={1}>{t('filmmakerTandas.addFrame')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {tanda.almacen ? <Text style={[textoPortada(12, '500'), dir.texto, { color: P.tinta }]} accessibilityLiveRegion="polite">{ALMACEN_DE_LA_CUENTA_ABIERTO ? t('filmmakerTandas.storedAccount') : t('filmmakerTandas.storedSession')}</Text> : null}
        {!GENERAR_IMAGENES_DEL_STORYBOARD ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerTandas.generateImagesClosed')}</Text> : null}
      </ScrollView>

      <View style={styles.barraDeTanda} testID="barra-de-tanda">
        <BotonBlanco texto={principal.texto} onPress={principal.onPress} apagado={principal.apagado} motivo={principal.motivo} testID="principal-storyboard" />
        {principal.nota ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} accessibilityLiveRegion="polite">{principal.nota}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  volver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginStart: -10 },
  barra: { height: 4, borderRadius: 2, backgroundColor: P.superficieAlta, overflow: 'hidden' },
  relleno: { height: 4, borderRadius: 2, backgroundColor: P.tinta },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniatura: { borderRadius: 12, borderWidth: 1, borderColor: P.bordeLuz, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  numero: { position: 'absolute', top: 6, minWidth: 24, height: 24, paddingHorizontal: 5, borderRadius: 6, borderWidth: 1, borderColor: P.tinta, backgroundColor: 'rgba(5,6,8,0.8)', alignItems: 'center', justifyContent: 'center' },
  tiempo: { position: 'absolute', top: 6, maxWidth: '62%', height: 20, paddingHorizontal: 6, borderRadius: 6, backgroundColor: 'rgba(5,6,8,0.8)', justifyContent: 'center' },
  nuevo: { borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula, alignItems: 'center', justifyContent: 'center', gap: 6 },
  barraDeTanda: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 6 },
  vacio: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  nota: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, flexDirection: 'row', alignItems: 'center' },
  fijo: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  quitar: { minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
});
