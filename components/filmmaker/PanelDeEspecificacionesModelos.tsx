import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../IconoDireccional';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { FILTROS_DE_TIPO, MODELO_AUTO, MODELOS_DE_FILMMAKER, ModeloDeFilmmaker, TipoDeModelo, esElegible, proveedoresDe } from '../../constants/filmmakerModelos';
import { etiquetaAccesible } from '../../utils/ideaDeFilmmaker';

interface Props {
  /** Id del modelo elegido (`'auto'` o vacío = Auto). */
  valor: string;
  onElegir: (id: string) => void;
  onVolver: () => void;
}

/** La razón corta por la que una píldora está cerrada. */
export const motivoDeModelo = (m: ModeloDeFilmmaker): string =>
  m.tipo !== 'video' ? 'filmmakerSpecs.otherStageReason' : m.estado === 'sin_configurar' ? 'filmmakerSpecs.notConfiguredReason' : 'filmmakerSpecs.soonReason';

/**
 * LA REJILLA DE PÍLDORAS DE MODELO (contenido de la hoja «Proyecto», sin Modal propio): «Auto» primero y, debajo, los modelos agrupados por proveedor.
 * Cada píldora = el nombre del modelo + una microetiqueta sacada de sus capacidades documentadas. Las integradas se eligen; el resto se ve cerrado
 * (candado y «Pronto» / «Sin configurar») y, al tocarlo, dice su motivo. Las píldoras saltan de línea: nunca hay una fila que se desplace de lado.
 * Con el filtro de tipo (Vídeo · Imagen · Voz) la lista no se satura aunque el catálogo crezca.
 */
export const RejillaDeModelos: React.FC<Props> = ({ valor, onElegir, onVolver }) => {
  const t = useT();
  const dir = useDireccion();
  const [tipo, setTipo] = useState<TipoDeModelo>('video');
  const [motivo, setMotivo] = useState<string | null>(null);
  const grupos = useMemo(() => proveedoresDe(tipo)
    .map((proveedor) => ({ proveedor, modelos: MODELOS_DE_FILMMAKER.filter((m) => m.tipo === tipo && m.proveedor === proveedor) }))
    .filter((g) => g.modelos.length > 0), [tipo]);
  const elegido = !valor || valor === MODELO_AUTO ? MODELO_AUTO : valor;

  const pildora = (m: ModeloDeFilmmaker) => {
    const abierta = esElegible(m);
    const sel = abierta && elegido === m.id;
    const estado = m.estado === 'integrado' ? '' : t(m.estado === 'sin_configurar' ? 'filmmakerSpecs.notConfigured' : 'filmmakerSpecs.soon');
    const micro = abierta ? m.etiquetas.map((e) => t(`filmmakerSpecs.${e}`)).join(' · ') : estado;
    return (
      <TouchableOpacity key={m.id} onPress={() => { if (abierta) { setMotivo(null); onElegir(m.id); } else setMotivo(t(motivoDeModelo(m))); }} activeOpacity={0.8}
        accessibilityRole="button" accessibilityLabel={etiquetaAccesible(m.nombre, micro)} accessibilityState={{ selected: sel, disabled: !abierta }}
        style={[styles.pildora, sel && styles.pildoraSel, !abierta && styles.pildoraCerrada]}>
        <View style={[styles.cabeza, dir.contenedor]}>
          <Text style={[textoPortada(14, sel ? '600' : '500'), { color: P.tinta, flexShrink: 1 }]} numberOfLines={1}>{m.nombre}</Text>
          {!abierta ? <Ionicons name="lock-closed" size={12} color={P.tintaSecundaria} /> : null}
        </View>
        {micro ? <Text style={[textoPortada(11, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{micro}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.raiz}>
      <View style={[styles.titulo, dir.contenedor]}>
        <TouchableOpacity onPress={onVolver} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.volver}>
          <IconoDireccional name="arrow-back" size={22} color={P.tinta} />
        </TouchableOpacity>
        <Text style={[textoPortada(18, '600'), dir.texto, { color: P.tinta, flex: 1 }]} accessibilityRole="header">{t('filmmakerSpecs.modelsTitle')}</Text>
      </View>
      <View style={[styles.fila, dir.contenedor]}>
        {FILTROS_DE_TIPO.map((f) => (
          <TouchableOpacity key={f.id} onPress={() => { setTipo(f.id); setMotivo(null); }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(f.clave)} accessibilityState={{ selected: tipo === f.id }} style={[styles.filtro, tipo === f.id && styles.pildoraSel]}>
            <Text style={[textoPortada(13, tipo === f.id ? '600' : '500'), { color: P.tinta }]}>{t(f.clave)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.marco}>
      <ScrollView style={styles.lista} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {tipo === 'video' ? (
          <View style={styles.grupo}>
            <View style={[styles.fila, dir.contenedor]}>
              <TouchableOpacity onPress={() => { setMotivo(null); onElegir(MODELO_AUTO); }} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmakerSpecs.auto'), t('filmmakerSpecs.autoSub'))}
                accessibilityState={{ selected: elegido === MODELO_AUTO }} style={[styles.pildora, elegido === MODELO_AUTO && styles.pildoraSel]}>
                <Text style={[textoPortada(14, elegido === MODELO_AUTO ? '600' : '500'), { color: P.tinta }]}>{t('filmmakerSpecs.auto')}</Text>
                <Text style={[textoPortada(11, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>Weë</Text>
              </TouchableOpacity>
            </View>
            <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.autoSub')}</Text>
          </View>
        ) : null}
        {grupos.map((g) => (
          <View key={g.proveedor} style={styles.grupo}>
            <Text style={[textoPortada(13, '600'), dir.texto, { color: P.tintaSecundaria }]}>{g.proveedor}</Text>
            <View style={[styles.fila, dir.contenedor]}>{g.modelos.map(pildora)}</View>
          </View>
        ))}
        {grupos.length === 0 ? <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmakerSpecs.noResults')}</Text> : null}
      </ScrollView>
      <View pointerEvents="none" style={styles.fundido}>{[0.1, 0.25, 0.45, 0.65, 0.82, 0.95].map((a) => <View key={a} style={{ height: 4, backgroundColor: P.superficie, opacity: a }} />)}</View>
      </View>
      <View style={styles.motivo} accessibilityLiveRegion="polite">{motivo ? <Text style={[textoPortada(13, '500'), dir.texto, { color: P.tinta }]}>{motivo}</Text> : null}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { gap: 10 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  volver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 8 },
  filtro: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, alignItems: 'center', justifyContent: 'center' },
  marco: { position: 'relative' },
  fundido: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 24 },
  lista: { maxHeight: 340 },
  contenido: { gap: 16, paddingBottom: 4 },
  grupo: { gap: 8 },
  pildora: { minHeight: 52, minWidth: 96, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, justifyContent: 'center', gap: 1 },
  pildoraSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  pildoraCerrada: { opacity: 0.7 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  motivo: { minHeight: 20 },
});
