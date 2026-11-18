import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useT, useIdioma } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../../constants/estiloWeeAi';
import { CLAVE_DE_ESTADO } from '../../../constants/filmmakerTandas';
import { LIMITE_DEL_MONTAJE, Tanda, TandasDelTaller, duracionDe, estadoDe, excesoDelMontaje, siguientePendiente, todasAprobadas, totales } from '../../../utils/tandasDeFilmmaker';
import { etiquetaAccesible } from '../../../utils/ideaDeFilmmaker';
import { BotonBlanco, BotonContorno, PastillaDeEstado, useTiempo } from './comunes';

interface Props {
  estado: TandasDelTaller;
  ancho: number;
  compacto: boolean;
  /** Tanda enseñada a la derecha cuando hay dos zonas. */
  seleccionada?: string | null;
  onAbrir: (id: string) => void;
  onOpciones: (id: string) => void;
  onAnadir: () => void;
  onAutomatico: () => void;
  onEjemplo: () => void;
  onQuitarEjemplo: () => void;
  hayEjemplos: boolean;
  onAviso: (mensaje: string) => void;
  /** Con todo aprobado, el botón principal pasa a «Producir» y lleva a la etapa de Producción. */
  onProducir?: () => void;
}

/**
 * LA LISTA DE TANDAS (capítulos): una fila por tanda con miniatura, nombre, duración objetivo (≈ 3:00), nº de cuadros, su estado y UN botón contextual
 * (crear storyboard · revisar · producir…). Abajo, los totales contra lo que admite el montaje final (60 cuadros / 10:00) y el único botón blanco: el
 * siguiente paso (crear o revisar el storyboard pendiente). Sin tandas, «Weë lo hace por mí» las reparte por duración. «⋯» abre partir, unir, mover y quitar.
 */
export const ListaDeTandas: React.FC<Props> = ({ estado, ancho, compacto, seleccionada, onAbrir, onOpciones, onAnadir, onAutomatico, onEjemplo, onQuitarEjemplo, hayEjemplos, onAviso, onProducir }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const tiempo = useTiempo();
  const x = totales(estado);
  const exceso = excesoDelMontaje(estado);
  const pendiente = siguientePendiente(estado);
  const posicion = (id: string) => estado.tandas.findIndex((q) => q.id === id) + 1;

  const fila = (ta: Tanda) => {
    const e = estadoDe(ta);
    const n = posicion(ta.id);
    const titulo = ta.titulo || t('filmmakerTandas.chapterN', { n: formato.numero(n) });
    const sel = seleccionada === ta.id;
    const meta = `${t('filmmakerTandas.targetShort', { objetivo: tiempo.solo(ta.objetivo) })} · ${t('filmmakerTandas.frames', { contador: ta.cuadros.length })}`;
    return (
      <View key={ta.id} style={[styles.fila, sel && styles.filaSel, dir.contenedor]}>
        <TouchableOpacity testID={`tanda-${n}`} onPress={() => onAbrir(ta.id)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(titulo, meta, t(CLAVE_DE_ESTADO[e]))} accessibilityState={{ selected: sel }} style={[styles.cuerpo, dir.contenedor]}>
          <View style={styles.miniatura}>
            <LinearGradient colors={['#0A0D13', '#1B2029']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Ionicons name="film-outline" size={20} color={P.tintaDeshabilitada} />
            <View style={[styles.num, { start: 4 }]}><Text style={[textoPortada(11, '600'), { color: P.tinta }]}>{formato.numero(n)}</Text></View>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[textoPortada(16, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{titulo}</Text>
            <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{meta}</Text>
            <View style={[styles.pie, dir.contenedor]}>
              {e !== 'none' && e !== 'review' ? <PastillaDeEstado estado={e} /> : null}
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.lado}>
          <TouchableOpacity testID={`opciones-${n}`} onPress={() => onOpciones(ta.id)} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerTandas.options'), titulo)} style={styles.mas}><Ionicons name="ellipsis-horizontal" size={20} color={P.tinta} /></TouchableOpacity>
        </View>
      </View>
    );
  };

  const todas = todasAprobadas(estado);
  const principal = (() => {
    if (estado.tandas.length === 0) return { texto: t('filmmakerTandas.addChapter'), onPress: onAnadir, apagado: false, motivo: null as string | null };
    if (pendiente) {
      const n = posicion(pendiente.id);
      return { texto: t(estadoDe(pendiente) === 'none' ? 'filmmakerTandas.nextCreate' : 'filmmakerTandas.nextReview', { n: formato.numero(n) }), onPress: () => onAbrir(pendiente.id), apagado: false, motivo: null };
    }
    return { texto: t('filmmakerTandas.actProduce'), onPress: onProducir ?? (() => onAviso(t('filmmakerTandas.produceClosed'))), apagado: !todas, motivo: null as string | null };
  })();

  return (
    <View style={styles.raiz}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.contenido, { maxWidth: Math.min(ancho, 720) }]} keyboardShouldPersistTaps="handled">
        <Text style={[textoPortada(compacto ? 18 : 22, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header" numberOfLines={1}>{t('filmmakerTandas.title')}</Text>
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>
          {t('filmmakerTandas.counts', { capitulos: formato.numero(x.tandas), cuadros: formato.numero(x.cuadros), duracion: tiempo.solo(x.segundos) })}
        </Text>

        {estado.tandas.length === 0 ? (
          <View style={styles.vacio}>
            <Ionicons name="albums-outline" size={28} color={P.tintaDeshabilitada} />
            <Text style={[textoPortada(15, '500'), { color: P.tintaSecundaria, textAlign: 'center' }]}>{t('filmmakerTandas.listEmpty')}</Text>
            <BotonContorno texto={t('filmmakerTandas.autoSplit')} icono="sparkles-outline" onPress={onAutomatico} testID="proponer-tandas" />
          </View>
        ) : estado.tandas.map(fila)}

        {x.cuadros > 0 ? (
          <Text style={[textoPortada(12, '400'), dir.texto, { color: exceso.planos || exceso.segundos ? P.tinta : P.tintaSecundaria }]} accessibilityLiveRegion="polite">
            {exceso.planos || exceso.segundos
              ? t('filmmakerTandas.limitOver', { planos: formato.numero(LIMITE_DEL_MONTAJE.planos), duracion: tiempo.solo(LIMITE_DEL_MONTAJE.segundos) })
              : t('filmmakerTandas.limitNote', { planos: formato.numero(LIMITE_DEL_MONTAJE.planos), duracion: tiempo.solo(LIMITE_DEL_MONTAJE.segundos) })}
          </Text>
        ) : null}

        <View style={[styles.fila2, dir.contenedor]}>
          {estado.tandas.length > 0 ? <BotonContorno texto={t('filmmakerTandas.addChapter')} icono="add" onPress={onAnadir} testID="anadir-tanda" /> : null}
          {estado.tandas.length === 0 ? <BotonContorno texto={t('filmmakerTandas.loadExample')} icono="sparkles-outline" onPress={onEjemplo} testID="ejemplo-tandas" /> : null}
          {hayEjemplos ? <BotonContorno texto={t('filmmakerTandas.clearExample')} icono="close-circle-outline" onPress={onQuitarEjemplo} /> : null}
        </View>
      </ScrollView>

      <View style={styles.piePrincipal}>
        <BotonBlanco texto={principal.texto} onPress={principal.onPress} apagado={principal.apagado} motivo={principal.motivo} testID="principal-tandas" />
        {principal.apagado && principal.motivo ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{principal.motivo}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12, width: '100%', alignSelf: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, padding: 8 },
  filaSel: { borderColor: '#FFFFFF', borderWidth: 2 },
  cuerpo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72 },
  miniatura: { width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: P.bordeLuz, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  num: { position: 'absolute', top: 4, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 5, borderWidth: 1, borderColor: P.tinta, backgroundColor: 'rgba(5,6,8,0.8)', alignItems: 'center', justifyContent: 'center' },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lado: { alignItems: 'center', gap: 6 },
  mas: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  vacio: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  fila2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  piePrincipal: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 6 },
});
