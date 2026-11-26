import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { nombreDelIdioma } from '../../i18n/formato';
import CajaDePrompt from '../creator/CajaDePrompt';
import { Boton, Chip, ChipDeEstado, Nota, Tarjeta, TituloDeBloque } from './piezas';
import { CancionDeMusic } from '../../utils/musicModel';
import { GENEROS, GRUPOS_DE_MUSIC, IDIOMAS_DE_CANCION, MAX_LETRA, TRANSFORMACIONES_DE_MUSIC } from '../../constants/musicComposer';
import { capacidadDeMusic, capacidadUsable } from '../../constants/musicCapabilities';
import { SPACING, FONT_SIZE } from '../../constants/design';

interface LetraProps { cancion: CancionDeMusic; onLetra: (l: string) => void; seccionId?: string }

/**
 * LETRA Y VOZ. El editor de letra es real y local (la letra se guarda con la canción en pantalla); la generación
 * asistida y el estilo de interpretación dependen de proveedor y quedan preparados. No se promete clonar ni imitar
 * ninguna voz: solo características vocales genéricas (femenina, masculina, dúo). La letra por sección solo se
 * muestra asociada cuando la canción trae esos datos; hoy la letra es un texto único.
 */
export const LetraYVoz: React.FC<LetraProps> = ({ cancion, onLetra }) => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const [texto, setTexto] = useState(cancion.letra ?? '');
  const [idioma, setIdioma] = useState<string | undefined>(undefined);
  const [voz, setVoz] = useState<string | undefined>(cancion.voz);
  const usable = capacidadUsable('lyrics');
  const grupoVoz = GRUPOS_DE_MUSIC.find((g) => g.id === 'voice')!;

  return (
    <View style={s.raiz}>
      <View style={s.fila}><TituloDeBloque>{t('music.lyricsTitle')}</TituloDeBloque><ChipDeEstado estado="borrador" /></View>
      <CajaDePrompt valor={texto} onCambiar={(x) => setTexto(x.slice(0, MAX_LETRA))} onEnviar={() => onLetra(texto)} etiquetaEnviar={t('music.lyricsSave')} placeholder={t('music.lyricsHint')} />
      <View style={s.fila}>
        <Boton texto={t('music.lyricsGenerate')} icono="sparkles-outline" desactivado={!usable} motivo={t('music.statePending')} />
        <ChipDeEstado estado={usable ? 'preparado' : 'pendienteIntegracion'} />
      </View>
      <Nota>{t('music.lyricsBySection')}</Nota>

      <Tarjeta>
        <TituloDeBloque>{t('music.groupLanguage')}</TituloDeBloque>
        <View style={s.fila}>
          {IDIOMAS_DE_CANCION.map((c) => <Chip key={c} texto={nombreDelIdioma(c, locale)} activo={idioma === c} onPress={() => setIdioma(idioma === c ? undefined : c)} />)}
        </View>
        <TituloDeBloque>{t('music.groupVoice')}</TituloDeBloque>
        <View style={s.fila}>
          {grupoVoz.opciones.map((o) => <Chip key={o.id} texto={t(`music.${o.clave}`)} activo={voz === o.id} onPress={() => setVoz(voz === o.id ? undefined : o.id)} />)}
        </View>
        <Chip texto={t('music.voiceInterpretation')} desactivado />
        <Nota>{t('music.voiceNoClone')}</Nota>
        <Text style={[s.pie, { color: theme.colors.textSecondary }]}>{t('music.voiceStylePending')}</Text>
      </Tarjeta>
    </View>
  );
};

interface EstiloProps { cancion: CancionDeMusic }

/**
 * ESTILO Y TRANSFORMACIONES. Cada acción está atada a UNA operación del contrato (`remix`, `extend`, `editSection`,
 * `generate`); si esa operación no está conectada, el botón existe y dice «pendiente»: no se simula nada. Los
 * géneros y ambientes son elecciones para la próxima operación, no cambian la canción mostrada.
 */
export const EstiloYTransformaciones: React.FC<EstiloProps> = ({ cancion }) => {
  const { t } = useIdioma();
  const [genero, setGenero] = useState<string | undefined>(cancion.genero);
  const [ambiente, setAmbiente] = useState<string | undefined>(undefined);
  const ambientes = GRUPOS_DE_MUSIC.find((g) => g.id === 'mood')!;

  return (
    <View style={s.raiz}>
      <TituloDeBloque>{t('music.styleTitle')}</TituloDeBloque>
      <View style={s.fila}>{GENEROS.map((g) => <Chip key={g} texto={t(`music.genre_${g}`)} activo={genero === g} onPress={() => setGenero(genero === g ? undefined : g)} />)}</View>
      <TituloDeBloque>{t('music.groupMood')}</TituloDeBloque>
      <View style={s.fila}>{ambientes.opciones.map((o) => <Chip key={o.id} texto={t(`music.${o.clave}`)} activo={ambiente === o.id} onPress={() => setAmbiente(ambiente === o.id ? undefined : o.id)} />)}</View>

      <TituloDeBloque>{t('music.transformTitle')}</TituloDeBloque>
      <Tarjeta>
        {TRANSFORMACIONES_DE_MUSIC.map((x) => {
          const cap = capacidadDeMusic(x.capacidad);
          const usable = capacidadUsable(x.capacidad);
          return (
            <View key={x.id} style={{ gap: 2 }}>
              <View style={s.fila}>
                <View style={{ flex: 1 }}><Boton texto={t(`music.${x.claveTitulo}`)} desactivado={!usable} motivo={t('music.statePending')} /></View>
                <ChipDeEstado estado={usable ? 'preparado' : cap.estado === 'pendiente' ? 'noCompatible' : 'pendienteIntegracion'} />
              </View>
              <Nota>{t(`music.${x.claveAyuda}`)}</Nota>
            </View>
          );
        })}
      </Tarjeta>
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.md },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center' },
  pie: { fontSize: FONT_SIZE.xs },
});
