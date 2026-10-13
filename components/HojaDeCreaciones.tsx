import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { getExperienceById } from '../constants/weeExperiences';
import { textoDelServidor } from '../i18n/servidor';
import type { CreacionCompartible } from '../utils/creacionesCompartibles';
import type { EstadoDeCreaciones } from '../hooks/useCreacionesCompartibles';

interface Props {
  visible: boolean;
  estado: EstadoDeCreaciones;
  onCerrar: () => void;
  onReintentar: () => void;
  onVerMas: () => void;
  /** Lo elegido, para que el compositor lo añada con SUS reglas (vídeo solo, tope de fotos, encuesta). */
  onElegir: (elegidas: CreacionCompartible[]) => void;
}

/**
 * «MIS CREACIONES» EN EL COMPOSITOR (R9): una hoja encima del borrador con las fotos y los vídeos que la cuenta ya
 * creó con Weë. Se marcan varias fotos, o un vídeo, y «Añadir» las pone en la publicación referenciando el material
 * (URL de entrega + `assetId`): nada se genera, nada se sube otra vez y nada cuesta Credits. El borrador sigue debajo.
 */
const HojaDeCreaciones: React.FC<Props> = ({ visible, estado, onCerrar, onReintentar, onVerMas, onElegir }) => {
  const { theme } = useTheme();
  const { t, locale, formato } = useIdioma();
  const insets = useSafeAreaInsets();
  const [marcadas, setMarcadas] = useState<string[]>([]);

  const items = estado.fase === 'lista' ? estado.items : [];
  const alternar = (c: CreacionCompartible) =>
    setMarcadas((ya) => {
      if (ya.includes(c.assetId)) return ya.filter((id) => id !== c.assetId);
      /* Un vídeo va solo: marcarlo deja solo él; marcar una foto quita el vídeo que hubiera. */
      if (c.tipo === 'video') return [c.assetId];
      const sinVideos = ya.filter((id) => items.find((x) => x.assetId === id)?.tipo !== 'video');
      return [...sinVideos, c.assetId];
    });
  const anadir = () => {
    const elegidas = marcadas.map((id) => items.find((x) => x.assetId === id)).filter(Boolean) as CreacionCompartible[];
    setMarcadas([]);
    onElegir(elegidas);
  };
  const cerrar = () => { setMarcadas([]); onCerrar(); };

  const nombreDe = (c: CreacionCompartible) =>
    (c.nombre ? textoDelServidor(c.nombre, { t, locale, experiencia: c.experienceId }) : '') || t(c.tipo === 'video' ? 'weels.creationUntitled' : 'composer.creationUntitledImage');
  /* La herramienta es marca y no se traduce; sin experiencia conocida, Weë AI. */
  const herramientaDe = (c: CreacionCompartible) => (c.experienceId && getExperienceById(c.experienceId)?.name) || 'Weë AI';

  const cuerpo = estado.fase === 'lista' && items.length > 0 ? (
    <View>
      <View style={styles.rejilla}>
        {items.map((c) => {
          const marcada = marcadas.includes(c.assetId);
          const fecha = c.creadoEn && formato?.fecha ? formato.fecha(c.creadoEn, { day: 'numeric', month: 'short' }) : null;
          return (
            <TouchableOpacity
              key={c.assetId}
              onPress={() => alternar(c)}
              activeOpacity={0.8}
              style={styles.creacion}
              accessibilityRole="checkbox"
              accessibilityLabel={t('weels.creationLabel', { nombre: nombreDe(c), herramienta: herramientaDe(c) })}
              accessibilityState={{ checked: marcada }}
            >
              <View style={[styles.media, { backgroundColor: theme.colors.surface, borderColor: marcada ? theme.colors.text : 'transparent' }]}>
                {c.tipo === 'video'
                  ? <Video source={{ uri: c.url }} style={styles.llenar} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
                  : <Image source={{ uri: c.url }} style={styles.llenar} contentFit="cover" />}
                <View style={[styles.marca, { backgroundColor: marcada ? theme.colors.text : 'rgba(0,0,0,0.45)' }]}>
                  <Ionicons name={marcada ? 'checkmark' : c.tipo === 'video' ? 'play' : 'image-outline'} size={13} color="#FFFFFF" />
                </View>
              </View>
              <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={1}>{nombreDe(c)}</Text>
              <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {fecha ? t('weels.creationMeta', { herramienta: herramientaDe(c), fecha }) : herramientaDe(c)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {estado.fase === 'lista' && estado.hayMas && (
        <TouchableOpacity onPress={onVerMas} disabled={estado.cargandoMas} style={[styles.boton, styles.verMas, { borderColor: theme.colors.border }]} accessibilityRole="button" accessibilityLabel={t('composer.seeMore')}>
          {estado.cargandoMas ? <ActivityIndicator size="small" color={theme.colors.text} /> : <Text style={[styles.botonTexto, { color: theme.colors.text }]}>{t('composer.seeMore')}</Text>}
        </TouchableOpacity>
      )}
    </View>
  ) : estado.fase === 'lista' ? (
    <View style={styles.vacio}>
      <Ionicons name="folder-open-outline" size={34} color={theme.colors.textSecondary} />
      <Text style={[styles.vacioTitulo, { color: theme.colors.text }]}>{t('composer.creationsEmptyTitle')}</Text>
      <Text style={[styles.vacioTexto, { color: theme.colors.textSecondary }]}>{t('composer.creationsEmptyBody')}</Text>
    </View>
  ) : estado.fase === 'error' ? (
    <View style={styles.vacio} accessibilityLiveRegion="polite">
      <Text style={[styles.vacioTexto, { color: theme.colors.textSecondary }]}>{t('creaciones.loadFailed')}</Text>
      <TouchableOpacity onPress={onReintentar} style={[styles.boton, { borderColor: theme.colors.border }]} accessibilityRole="button" accessibilityLabel={t('common.retry')}>
        <Text style={[styles.botonTexto, { color: theme.colors.text }]}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.vacio}><ActivityIndicator size="small" color={theme.colors.text} /></View>
  );

  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'none' : 'slide'} onRequestClose={cerrar}>
      <View style={styles.fondo}>
        <TouchableOpacity style={styles.velo} activeOpacity={1} onPress={cerrar} accessibilityLabel={t('common.close')} />
        <View style={[styles.hoja, { backgroundColor: theme.colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.asa, { backgroundColor: theme.colors.border }]} />
          <View style={styles.cabecera}>
            <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{t('creaciones.title')}</Text>
            <TouchableOpacity onPress={cerrar} style={styles.cerrar} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.lista} contentContainerStyle={styles.listaContenido}>{cuerpo}</ScrollView>
          <TouchableOpacity
            onPress={anadir}
            disabled={marcadas.length === 0}
            style={[styles.anadir, { backgroundColor: marcadas.length > 0 ? theme.colors.text : theme.colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('composer.creationsAdd')}
            accessibilityState={{ disabled: marcadas.length === 0 }}
          >
            <Text style={[styles.anadirTexto, { color: marcadas.length > 0 ? theme.colors.background : theme.colors.textSecondary }]}>{t('composer.creationsAdd')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end' },
  velo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(31,41,55,0.45)' },
  hoja: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8, maxHeight: '85%', width: '100%', maxWidth: 560, alignSelf: 'center' },
  asa: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  titulo: { flex: 1, fontSize: 18, fontWeight: '700' },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  lista: { flexGrow: 0 },
  listaContenido: { paddingBottom: 12 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  creacion: { width: '31%', marginRight: '2.33%' },
  media: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 2 },
  llenar: { width: '100%', height: '100%' },
  marca: { position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  meta: { fontSize: 12, marginTop: 2 },
  vacio: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 8 },
  vacioTitulo: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  vacioTexto: { fontSize: 14, textAlign: 'center' },
  boton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { fontSize: 14, fontWeight: '600' },
  verMas: { alignSelf: 'center', marginTop: 12 },
  anadir: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  anadirTexto: { fontSize: 16, fontWeight: '700' },
});

export default HojaDeCreaciones;
