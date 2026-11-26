import React from 'react';
import { View, Text, StyleSheet, Linking, Share } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { Boton, ChipDeEstado, Nota, Tarjeta, TituloDeBloque } from './piezas';
import { CancionDeMusic, formatosDeExportacion, pistasConAudio } from '../../utils/musicModel';
import { capacidadUsable } from '../../constants/musicCapabilities';
import { SPACING, FONT_SIZE } from '../../constants/design';

interface Props { cancion: CancionDeMusic }

/**
 * STEMS Y PISTAS SEPARADAS. Solicitar la separación es la operación `music.stems`, hoy no conectada: el botón existe y
 * está cerrado. Solo se LISTAN las pistas que traen audio propio (`urlStem`); si no hay ninguna, se dice y nunca se
 * inventan stems. Un trabajo de separación a medias (archivos parciales) se mostraría aquí con su estado cuando el
 * Job Engine lo devuelva; hoy no existe ninguno.
 */
export const StemsPanel: React.FC<Props> = ({ cancion }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const stems = pistasConAudio(cancion);
  const usable = capacidadUsable('stems');
  return (
    <View style={s.raiz}>
      <View style={s.fila}><TituloDeBloque>{t('music.stemsTitle')}</TituloDeBloque><ChipDeEstado estado={stems.length && !cancion.esEjemplo ? 'completado' : usable ? 'preparado' : 'pendienteIntegracion'} /></View>
      <Nota>{t('music.stemsNote')}</Nota>
      <Boton texto={t('music.requestStems')} icono="git-branch-outline" principal desactivado={!usable || !cancion.audioUrl} motivo={t(cancion.audioUrl ? 'music.statePending' : 'music.noAudioNote')} />
      <Tarjeta>
        {stems.length === 0 ? (
          <Nota>{t('music.stemsEmpty')}</Nota>
        ) : (
          stems.map((p) => <Text key={p.id} style={[s.nombre, { color: theme.colors.text }]}>{t(`music.instr_${p.tipo}`)}</Text>)
        )}
      </Tarjeta>
    </View>
  );
};

/**
 * EXPORTACIÓN. Los formatos salen de los recursos reales de la canción (`formatosDeExportacion`), no de una lista fija.
 * Audio: abre la URL real del archivo. Letra: la comparte como texto con el menú del sistema. Pistas y MIDI: no hay
 * operación de exportación conectada, así que se ven como no disponibles con su motivo, nunca como descarga.
 */
export const ExportacionPanel: React.FC<Props> = ({ cancion }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const formatos = formatosDeExportacion(cancion);
  const accion = (id: string) => {
    if (id === 'audio' && cancion.audioUrl) Linking.openURL(cancion.audioUrl).catch(() => undefined);
    if (id === 'lyrics' && cancion.letra) Share.share({ message: cancion.letra }).catch(() => undefined);
  };
  return (
    <View style={s.raiz}>
      <TituloDeBloque>{t('music.exportTitle')}</TituloDeBloque>
      <Tarjeta>
        {formatos.map((f) => (
          <View key={f.id} style={{ gap: 2 }}>
            <View style={s.fila}>
              <Text style={[s.nombre, { color: theme.colors.text, flex: 1 }]}>{t(`music.export_${f.id}`)}</Text>
              <ChipDeEstado estado={f.disponible ? 'preparado' : 'resultadoNoDisponible'} />
            </View>
            <Boton texto={t(f.id === 'lyrics' ? 'music.exportShare' : 'music.exportDownload')} icono={f.id === 'lyrics' ? 'share-outline' : 'download-outline'} desactivado={!f.disponible} motivo={t(f.id === 'midi' ? 'music.midiPending' : 'music.exportMissing')} onPress={() => accion(f.id)} />
          </View>
        ))}
      </Tarjeta>
      <Nota>{t('music.exportNote')}</Nota>
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.md },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center' },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: '600' },
});
