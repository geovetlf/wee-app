import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useResponsive } from '../../hooks/useResponsive';
import ReproductorDeCancion from './ReproductorDeCancion';
import LineaDeTiempo from './LineaDeTiempo';
import EditorDeSecciones from './EditorDeSecciones';
import EditorDeInstrumentos from './EditorDeInstrumentos';
import EcualizadorYEfectos from './EcualizadorYEfectos';
import { LetraYVoz, EstiloYTransformaciones } from './LetraYEstilo';
import { StemsPanel, ExportacionPanel } from './StemsYExportacion';
import { Boton, ChipDeEstado, Nota, Tarjeta, TituloDeBloque, AvisoDeEjemplo } from './piezas';
import { CancionDeMusic, modoDeMezcla } from '../../utils/musicModel';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

export type HerramientaDeMusic = 'overview' | 'sections' | 'instruments' | 'eq' | 'lyrics' | 'style' | 'stems' | 'export';
const HERRAMIENTAS: { id: HerramientaDeMusic; icono: string; clave: string }[] = [
  { id: 'overview', icono: 'grid-outline', clave: 'toolOverview' },
  { id: 'sections', icono: 'git-merge-outline', clave: 'toolSections' },
  { id: 'instruments', icono: 'options-outline', clave: 'toolInstruments' },
  { id: 'eq', icono: 'pulse-outline', clave: 'toolEq' },
  { id: 'lyrics', icono: 'document-text-outline', clave: 'toolLyrics' },
  { id: 'style', icono: 'color-palette-outline', clave: 'toolStyle' },
  { id: 'stems', icono: 'layers-outline', clave: 'toolStems' },
  { id: 'export', icono: 'download-outline', clave: 'toolExport' },
];

interface Props {
  cancion: CancionDeMusic;
  onCancion: (c: CancionDeMusic) => void;
  onVolver: () => void;
}

/**
 * LA WORKSTATION (estudio) DE WEË MUSIC.
 *
 * Una sola pantalla, dos disposiciones y la MISMA cobertura funcional:
 *  · ESCRITORIO / WEB: riel de herramientas a la izquierda, centro con el reproductor persistente y la línea de tiempo
 *    amplia, y PANEL DERECHO contextual (editor de la sección seleccionada) — pistas simultáneas visibles en la línea.
 *  · MÓVIL: pestañas de herramientas desplazables, una herramienta a la vez, línea de tiempo desplazable en horizontal.
 *
 * Funciona con una canción real (cuando exista) o con la canción de EJEMPLO de diseño, marcada como tal. «Guardar»,
 * «Descargar» y «Compartir» solo se activan si hay algo real que guardar o descargar; hoy el guardado de proyectos de
 * música pasa por Projects/Assets (no hay una escritura nueva aquí) y la canción de ejemplo nunca se guarda.
 */
const Workstation: React.FC<Props> = ({ cancion, onCancion, onVolver }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { isDesktop } = useResponsive();
  const [herramienta, setHerramienta] = useState<HerramientaDeMusic>('overview');
  const [seccion, setSeccion] = useState<string | undefined>(cancion.secciones[0]?.id);
  const [posicion, setPosicion] = useState(0);
  const mezcla = modoDeMezcla(cancion);

  const centro = (
    <View style={s.col}>
      <ReproductorDeCancion
        cancion={cancion}
        onTitulo={(titulo) => onCancion({ ...cancion, titulo })}
        onFavorita={() => onCancion({ ...cancion, favorita: !cancion.favorita })}
        onPosicion={setPosicion}
      />
      <Tarjeta>
        <TituloDeBloque>{t('music.songView')}</TituloDeBloque>
        <LineaDeTiempo cancion={cancion} posicionSec={posicion} seleccionada={seccion} onSeleccionar={setSeccion} />
        <Nota>{t(mezcla === 'pistasReales' ? 'music.multitrackNote' : 'music.stereoNote')}</Nota>
      </Tarjeta>

      {herramienta === 'overview' && (
        <Tarjeta>
          <TituloDeBloque>{t('music.overviewTitle')}</TituloDeBloque>
          <Nota>{t('music.overviewBody')}</Nota>
          <View style={s.fila}>
            <ChipDeEstado estado={cancion.audioUrl ? 'completado' : 'resultadoNoDisponible'} />
            <ChipDeEstado estado={cancion.esEjemplo ? 'resultadoNoDisponible' : mezcla === 'pistasReales' ? 'completado' : 'noCompatible'} />
          </View>
          <Boton texto={t('music.newVersion')} icono="copy-outline" desactivado motivo={t('music.statePending')} />
          {cancion.versiones.length > 0 && <Nota>{t('music.versionsCount', { cantidad: String(cancion.versiones.length) })}</Nota>}
        </Tarjeta>
      )}
      {herramienta === 'sections' && !isDesktop && <EditorDeSecciones cancion={cancion} seleccionada={seccion} onSeleccionar={setSeccion} />}
      {herramienta === 'instruments' && <EditorDeInstrumentos cancion={cancion} onPistas={(pistas) => onCancion({ ...cancion, pistas })} />}
      {herramienta === 'eq' && <EcualizadorYEfectos cancion={cancion} />}
      {herramienta === 'lyrics' && <LetraYVoz cancion={cancion} onLetra={(letra) => onCancion({ ...cancion, letra })} />}
      {herramienta === 'style' && <EstiloYTransformaciones cancion={cancion} />}
      {herramienta === 'stems' && <StemsPanel cancion={cancion} />}
      {herramienta === 'export' && <ExportacionPanel cancion={cancion} />}
    </View>
  );

  return (
    <View style={s.raiz}>
      <TouchableOpacity accessibilityRole="button" onPress={onVolver} style={s.volver} hitSlop={8}>
        <Ionicons name="chevron-back" size={scale(18)} color={theme.colors.accentDark} />
        <Text style={[s.volverTexto, { color: theme.colors.accentDark }]}>{t('music.backToMusic')}</Text>
      </TouchableOpacity>

      {/* Cabecera del proyecto: estado honesto y acciones */}
      <View style={s.fila}>
        <ChipDeEstado estado={cancion.esEjemplo ? 'borrador' : 'completado'} />
        <Boton texto={t('music.save')} icono="save-outline" desactivado={cancion.esEjemplo} motivo={t(cancion.esEjemplo ? 'music.exampleNeverSaved' : 'music.statePending')} />
        <Boton texto={t('music.exportDownload')} icono="download-outline" onPress={() => setHerramienta('export')} />
        <Boton texto={t('music.share')} icono="share-social-outline" desactivado motivo={t('music.statePending')} />
      </View>
      {cancion.esEjemplo && <AvisoDeEjemplo />}

      {/* Herramientas: pestañas en móvil, riel lateral en escritorio */}
      {isDesktop ? (
        <View style={s.escritorio}>
          <View style={[s.riel, { borderColor: theme.colors.border }]} accessibilityRole="tablist">
            {HERRAMIENTAS.map((h) => <Pestana key={h.id} h={h} activa={h.id === herramienta} onPress={() => setHerramienta(h.id)} vertical />)}
          </View>
          <View style={{ flex: 1 }}>{centro}</View>
          <View style={[s.derecho, { borderColor: theme.colors.border }]}>
            <EditorDeSecciones cancion={cancion} seleccionada={seccion} onSeleccionar={setSeccion} />
          </View>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pestanas} accessibilityRole="tablist">
            {HERRAMIENTAS.map((h) => <Pestana key={h.id} h={h} activa={h.id === herramienta} onPress={() => setHerramienta(h.id)} />)}
          </ScrollView>
          {centro}
        </>
      )}
    </View>
  );
};

const Pestana: React.FC<{ h: { id: string; icono: string; clave: string }; activa: boolean; onPress: () => void; vertical?: boolean }> = ({ h, activa, onPress, vertical }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      onPress={onPress}
      style={[s.pestana, vertical && { alignSelf: 'stretch' }, { borderColor: activa ? theme.colors.accent : theme.colors.border, backgroundColor: activa ? theme.colors.accent + '26' : theme.colors.card }]}
    >
      <Ionicons name={h.icono as any} size={scale(16)} color={theme.colors.accentDark} />
      <Text style={[s.pestanaTexto, { color: theme.colors.text }]}>{t(`music.${h.clave}`)}</Text>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  raiz: { gap: SPACING.md, paddingBottom: SPACING.xxxl },
  col: { gap: SPACING.md },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, alignItems: 'center' },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', minHeight: scale(40) },
  volverTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  pestanas: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  pestana: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, minHeight: scale(44) },
  pestanaTexto: { fontSize: FONT_SIZE.sm },
  escritorio: { flexDirection: 'row', gap: SPACING.lg, alignItems: 'flex-start' },
  riel: { width: scale(170), gap: SPACING.sm, borderRightWidth: 1, paddingRight: SPACING.md },
  derecho: { width: scale(320), borderLeftWidth: 1, paddingLeft: SPACING.md },
});

export default Workstation;
