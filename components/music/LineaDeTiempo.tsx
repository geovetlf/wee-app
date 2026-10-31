import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { Nota } from './piezas';
import { CancionDeMusic, SeccionDeCancion, modoDeMezcla, pistaSuena, tiempoMmSs } from '../../utils/musicModel';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/** Píxeles por segundo de la línea de tiempo (desplazable en horizontal). */
const PX_POR_SEG = 4;
const COLORES = ['#F5B731', '#F59E0B', '#60A5FA', '#34D399', '#A78BFA', '#F472B6', '#94A3B8', '#FB923C'];

interface Props {
  cancion: CancionDeMusic;
  /** Segundo actual de la reproducción (cursor). */
  posicionSec: number;
  seleccionada?: string;
  onSeleccionar: (id: string) => void;
  /** Mostrar las pistas (carriles) debajo de las secciones. */
  conPistas?: boolean;
}

/**
 * LÍNEA DE TIEMPO HORIZONTAL: escala en mm:ss, cursor, secciones coloreadas seleccionables y, si de verdad hay pistas
 * con audio propio, un carril por pista. Con un solo estéreo NO hay carriles: se dice (no se dibujan canales que no
 * existen). Las secciones sin tiempos conocidos no se dibujan: se listan en el editor de secciones.
 * En móvil se desplaza con el dedo; en escritorio ocupa todo el ancho y, si no cabe, se desplaza.
 */
const LineaDeTiempo: React.FC<Props> = ({ cancion, posicionSec, seleccionada, onSeleccionar, conPistas = true }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const total = cancion.duracionSec ?? Math.max(0, ...cancion.secciones.map((x) => x.finSec ?? 0));
  if (!total) return <Nota>{t('music.timelineNoDuration')}</Nota>;
  const ancho = Math.max(total * PX_POR_SEG, 300);
  const marcas = Array.from({ length: Math.floor(total / 30) + 1 }, (_, i) => i * 30);
  const conTiempo = cancion.secciones.filter((x): x is SeccionDeCancion & { inicioSec: number; finSec: number } => x.inicioSec !== undefined && x.finSec !== undefined);
  const mezcla = modoDeMezcla(cancion);

  return (
    <View style={{ gap: SPACING.xs }}>
      <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel={t('music.timelineLabel')}>
        <View style={{ width: ancho }}>
          <View style={[s.regla, { borderColor: theme.colors.border }]}>
            {marcas.map((m) => (
              <Text key={m} style={[s.marca, { left: m * PX_POR_SEG, color: theme.colors.textSecondary }]}>{tiempoMmSs(m, formato.numero)}</Text>
            ))}
          </View>
          <View style={s.carril}>
            {conTiempo.map((x, i) => {
              const activa = seleccionada === x.id;
              return (
                <TouchableOpacity
                  key={x.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activa }}
                  accessibilityLabel={`${t(`music.section_${x.tipo}`)}`}
                  onPress={() => onSeleccionar(x.id)}
                  style={[s.bloque, { left: x.inicioSec * PX_POR_SEG, width: Math.max(8, (x.finSec - x.inicioSec) * PX_POR_SEG - 2), backgroundColor: COLORES[i % COLORES.length] + (activa ? 'FF' : '88'), borderColor: activa ? theme.colors.text : 'transparent' }]}
                >
                  <Text numberOfLines={1} style={s.bloqueTexto}>{t(`music.section_${x.tipo}`)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {conPistas && mezcla === 'pistasReales' && cancion.pistas.filter((p) => !!p.urlStem).map((p) => (
            <View key={p.id} style={[s.pista, { backgroundColor: theme.colors.surface, opacity: pistaSuena(p, cancion.pistas) ? 1 : 0.4 }]}>
              <View style={[s.pistaRelleno, { backgroundColor: theme.colors.accent + '55', width: ancho * Math.max(0.05, p.volumen) }]} />
              <Text style={[s.pistaTexto, { color: theme.colors.text }]}>{t(`music.instr_${p.tipo}`)}</Text>
            </View>
          ))}
          <View pointerEvents="none" style={[s.cursor, { left: Math.min(ancho - 2, posicionSec * PX_POR_SEG), backgroundColor: theme.colors.error }]} />
        </View>
      </ScrollView>
      {conPistas && mezcla === 'soloEstereo' && <Nota>{t('music.timelineStereoOnly')}</Nota>}
    </View>
  );
};

const s = StyleSheet.create({
  regla: { height: scale(22), borderBottomWidth: 1 },
  marca: { position: 'absolute', top: 2, fontSize: FONT_SIZE.xs },
  carril: { height: scale(44), marginTop: SPACING.xs },
  bloque: { position: 'absolute', top: 0, height: scale(40), borderRadius: BORDER_RADIUS.sm, borderWidth: 2, justifyContent: 'center', paddingHorizontal: SPACING.xs },
  bloqueTexto: { fontSize: FONT_SIZE.xs, color: '#1F2937', fontWeight: '600' },
  pista: { height: scale(26), marginTop: 4, borderRadius: BORDER_RADIUS.sm, justifyContent: 'center', overflow: 'hidden' },
  pistaRelleno: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  pistaTexto: { fontSize: FONT_SIZE.xs, paddingHorizontal: SPACING.sm },
  cursor: { position: 'absolute', top: 0, bottom: 0, width: 2 },
});

export default LineaDeTiempo;
