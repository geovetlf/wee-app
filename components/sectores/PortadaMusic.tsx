import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import EstudioDeEjemplo from '../music/EstudioDeEjemplo';
import { CancionDeMusic } from '../../utils/musicModel';
import type { ModoDeMusic, PuntoDePartidaId } from '../../constants/musicComposer';
import { Bloque, DORADO, HeroDeSector, RejillaDeAccesos, TituloDeBloque } from './PiezasDeSector';
import { RellenoDeMarca } from '../GradienteDeMarca';

/*
 * LA PORTADA DE WEË MUSIC, COMO EN LA DEMO YC. Weë Music NO está conectada a ninguna API musical (CLAUDE.md §5): el
 * estudio de ejemplo es un dibujo que no suena, los accesos abren el composer de siempre (`MusicComposer`) con su punto
 * de partida y su modo, y las herramientas abren la workstation de ejemplo, exactamente como hacía la demo.
 */

const MASCOTA = require('../../assets/images/sectores/music-mascota.jpg');
const isWeb = Platform.OS === 'web';

interface Props {
  cancionDeEjemplo: CancionDeMusic;
  onVerEjemplo: () => void;
  onComponer: (punto: PuntoDePartidaId, modo: ModoDeMusic) => void;
}

export const HeroDeMusic: React.FC<Pick<Props, 'onVerEjemplo' | 'onComponer'>> = ({ onVerEjemplo, onComponer }) => {
  const t = useT();
  return (
    <HeroDeSector
      lineas={[{ texto: t('music.heroLine1') }, { texto: t('music.heroLine2') }, { texto: t('music.heroAccent'), dorado: true }]}
      descripcion={t('music.intro')}
      imagen={MASCOTA}
      anchoImagen={0.6}
      encuadre={0.8}
      fichasEnFila
      compacto
      tituloMaximo={25}
      fichas={[
        { icono: 'musical-notes-outline', texto: t('music.chipCreate'), onPress: () => onComponer('idea', 'custom') },
        { icono: 'options-outline', texto: t('music.chipEdit'), onPress: onVerEjemplo },
        { icono: 'layers-outline', texto: t('music.chipMix'), onPress: onVerEjemplo },
        { icono: 'pulse-outline', texto: t('music.chipMaster'), onPress: onVerEjemplo },
      ]}
    />
  );
};

export const CuerpoDeMusic: React.FC<Props> = ({ cancionDeEjemplo, onVerEjemplo, onComponer }) => {
  const t = useT();
  const { theme } = useTheme();
  const [modo, setModo] = useState<ModoDeMusic>('custom');
  const MODOS: { id: ModoDeMusic; clave: string }[] = [
    { id: 'simple', clave: 'music.modeSimple' },
    { id: 'custom', clave: 'music.modeCustom' },
    { id: 'advanced', clave: 'music.modeAdvanced' },
  ];
  return (
    <>
      <View style={s.ejemplo}>
        <EstudioDeEjemplo cancion={cancionDeEjemplo} onAbrir={onVerEjemplo} />
      </View>
      <Bloque>
        <TituloDeBloque titulo={t('music.composerTitle')} />
        <View style={[s.modos, { backgroundColor: theme.colors.surface }]} accessibilityRole="tablist">
          {MODOS.map((m) => {
            const activo = m.id === modo;
            return (
              <TouchableOpacity
                key={m.id}
                style={[s.modo, activo && s.modoActivo, isWeb && ({ cursor: 'pointer' } as any)]}
                onPress={() => setModo(m.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={t(m.clave)}
              >
                {activo && <RellenoDeMarca radio={BORDER_RADIUS.full} />}
                <Text style={[s.modoTexto, { color: activo ? '#111111' : theme.colors.text }]}>{t(m.clave)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <RejillaDeAccesos
          tintados
          accesos={[
            { id: 'text', icono: 'text-outline', texto: t('composer.kindText'), tinta: '#E3A21A', fondo: '#FFF6DE', seleccionado: true, onPress: () => onComponer('idea', modo) },
            { id: 'lyrics', icono: 'document-text-outline', texto: t('music.lyricsTitle'), tinta: '#8B5CF6', fondo: '#F3EEFF', onPress: () => onComponer('lyrics', modo) },
            { id: 'image', icono: 'image-outline', texto: t('composer.kindImage'), tinta: '#2F8FE8', fondo: '#E8F2FD', onPress: () => onComponer('idea', modo) },
            { id: 'melody', icono: 'musical-note-outline', texto: t('music.tileMelody'), tinta: '#EC4F86', fondo: '#FDE7EF', onPress: () => onComponer('hum', modo) },
          ]}
        />
      </Bloque>
      <Bloque>
        <TituloDeBloque titulo={t('studio.moreTitle')} />
        <RejillaDeAccesos
          tintados
          accesos={[
            { id: 'daw', icono: 'options-outline', texto: t('music.toolStudio'), tinta: '#7C5CFC', fondo: '#F1EDFF', onPress: onVerEjemplo },
            { id: 'voice', icono: 'mic-outline', texto: t('music.toolVoice'), tinta: '#2F8FE8', fondo: '#E8F2FD', onPress: onVerEjemplo },
            { id: 'midi', icono: 'grid-outline', texto: t('music.toolMidi'), tinta: '#E3A21A', fondo: '#FFF6DE', onPress: onVerEjemplo },
            { id: 'mix', icono: 'pulse-outline', texto: t('music.toolMix'), tinta: '#22A55B', fondo: '#E7F7EE', onPress: onVerEjemplo },
          ]}
        />
      </Bloque>
    </>
  );
};

const s = StyleSheet.create({
  ejemplo: { marginHorizontal: SPACING.md },
  modos: { flexDirection: 'row', borderRadius: BORDER_RADIUS.full, padding: scale(4) },
  modo: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: BORDER_RADIUS.full },
  modoActivo: { backgroundColor: DORADO },
  modoTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
});
