import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIdioma } from '../../contexts/IdiomaContext';
import { CancionDeMusic, TIPOS_DE_INSTRUMENTO, tiempoMmSs } from '../../utils/musicModel';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { useDireccion } from '../../hooks/useDireccion';
import { MARCA } from '../../constants/marca';
import { RellenoDeMarca } from '../GradienteDeMarca';

/*
 * El estudio de Weë Music en la demo: la canción, su avance, las pistas y las secciones. Desde el 2026-11-04 se pinta
 * como la referencia del dueño (la imagen ref-music de demo-medios): fondo violeta de noche, cada pista con su icono y su color, y el
 * avance en dorado. Los colores son de dibujo, no de estado: el estado de cada pista sigue siendo su nombre. Solo lo monta el
 * modo demo y es un EJEMPLO dibujado: no suena nada ni llama a ninguna API musical (CLAUDE.md §5). Tocar el nombre de
 * una pista la silencia en el dibujo y nada más.
 */
/* El acento del estudio de ejemplo sale del token de marca (constants/marca.ts, 2026-11-05). */
const DORADO = MARCA.primario;
const PICOS = [2, 4, 6, 5, 8, 11, 7, 9, 13, 10, 6, 12, 15, 10, 7, 12, 16, 12, 8, 5, 10, 14, 11, 7, 9, 13, 16, 12, 7, 5, 9, 13, 9, 6, 11, 14, 10, 6, 4, 3, 6, 9, 12, 8, 5, 7, 10, 13];
const SECCIONES = ['intro', 'verse', 'chorus', 'bridge', 'outro'];
const PISTAS = TIPOS_DE_INSTRUMENTO.slice(0, 5);
const PROGRESO = 0.4;
/* Color e icono de cada pista, como en la referencia: voz violeta, batería azul, bajo verde, piano amarillo, guitarra rosa. */
const TINTA: Record<string, string> = { vocals: '#C084FC', drums: '#60A5FA', bass: '#4ADE80', piano: '#FACC15', guitar: '#F472B6' };
const ICONO: Record<string, string> = { vocals: 'mic', drums: 'disc', bass: 'pulse', piano: 'keypad', guitar: 'musical-note' };

const picoDe = (i: number, pista: number) => PICOS[(i * (pista + 2) + pista * 5) % PICOS.length];

const EstudioDeEjemplo: React.FC<{ cancion: CancionDeMusic; onAbrir: () => void }> = ({ cancion, onAbrir }) => {
  const { t, formato } = useIdioma();
  const dir = useDireccion();
  const [sonando, setSonando] = useState(false);
  const [ancho, setAncho] = useState(0);
  const [silenciadas, setSilenciadas] = useState<number[]>([]);
  const [seccion, setSeccion] = useState('chorus');
  const avance = useRef(new Animated.Value(PROGRESO)).current;

  useEffect(() => {
    if (!sonando) return;
    const vuelta = Animated.loop(Animated.timing(avance, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }));
    vuelta.start();
    return () => vuelta.stop();
  }, [sonando, avance]);

  const duracion = cancion.duracionSec ?? 210;
  const alternar = (i: number) => setSilenciadas((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]));
  const ETIQUETA = scale(80);

  return (
    <View style={s.raiz}>
      <LinearGradient colors={['#1A1530', '#2A1F45']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={s.cancion}>
        <LinearGradient colors={['#7C3AED', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.portada}>
          <Ionicons name="musical-notes" size={scale(20)} color="#FFFFFF" />
        </LinearGradient>
        <View style={s.textos}>
          <Text style={s.titulo} numberOfLines={1}>{cancion.titulo || t('music.exampleTitle')}</Text>
          <Text style={s.meta} numberOfLines={1}>
            {[cancion.genero ? t(`music.genre_${cancion.genero}`) : '', tiempoMmSs(duracion, formato.numero)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Pressable onPress={onAbrir} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('music.viewExample')} style={s.icono}>
          <Ionicons name="open-outline" size={scale(18)} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <Pressable onPress={() => setSonando((v) => !v)} style={s.play} accessibilityRole="button" accessibilityLabel={t(sonando ? 'music.pause' : 'music.play')}>
          <Ionicons name={sonando ? 'pause' : 'play'} size={scale(16)} color="#0A0A0A" style={!sonando && { marginLeft: 2 }} />
        </Pressable>
      </View>

      <View style={s.barra}>
        <View style={[s.barraRelleno, { width: `${PROGRESO * 100}%` }]} />
        <View style={[s.perilla, dir.alInicio(`${PROGRESO * 100}%`), dir.esRTL ? { marginRight: -scale(6) } : { marginLeft: -scale(6) }]} />
      </View>
      <View style={s.tiempos}>
        <Text style={s.tiempo}>{tiempoMmSs(Math.round(duracion * PROGRESO), formato.numero)}</Text>
        <Text style={s.tiempo}>{tiempoMmSs(duracion, formato.numero)}</Text>
      </View>

      <View style={s.secciones}>
        {SECCIONES.map((id) => (
          <Pressable key={id} onPress={() => setSeccion(id)} accessibilityRole="button" accessibilityState={{ selected: seccion === id }} style={[s.seccion, seccion === id && s.seccionActiva]}>
            <RellenoDeMarca radio={BORDER_RADIUS.full} apagada={seccion !== id} />
            <Text style={[s.seccionTexto, seccion === id && s.seccionTextoActivo]} numberOfLines={1}>{t(`music.section_${id}`)}</Text>
          </Pressable>
        ))}
      </View>

      <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
        {PISTAS.map((tipo, p) => {
          const silenciada = silenciadas.includes(p);
          return (
            <View key={tipo} style={s.pista}>
              <Pressable onPress={() => alternar(p)} accessibilityRole="switch" accessibilityState={{ checked: !silenciada }} accessibilityLabel={t(`music.instr_${tipo}`)} hitSlop={6} style={[s.pistaEtiqueta, { width: ETIQUETA }, silenciada && s.apagado]}>
                <Ionicons name={(ICONO[tipo] ?? 'musical-note') as any} size={scale(13)} color={TINTA[tipo] ?? DORADO} />
                <Text style={s.pistaNombre} numberOfLines={1}>{t(`music.instr_${tipo}`)}</Text>
              </Pressable>
              <View style={[s.carril, silenciada && s.apagado]}>
                {PICOS.map((_, i) => (
                  <View key={i} style={[s.pico, { height: scale(Math.max(2, picoDe(i, p))), backgroundColor: TINTA[tipo] ?? DORADO, opacity: i / PICOS.length < PROGRESO ? 1 : 0.5 }]} />
                ))}
              </View>
            </View>
          );
        })}
        <Animated.View
          pointerEvents="none"
          style={[s.cursor, { left: ETIQUETA, transform: [{ translateX: avance.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, ancho - ETIQUETA - 1)] }) }] }]}
        />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { backgroundColor: '#1A1530', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.lg, overflow: 'hidden' },
  cancion: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  portada: { width: scale(44), height: scale(44), borderRadius: scale(8), alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1 },
  titulo: { color: '#FFFFFF', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  meta: { color: 'rgba(255,255,255,0.55)', fontSize: FONT_SIZE.xs, marginTop: 2 },
  icono: { width: scale(32), height: scale(32), alignItems: 'center', justifyContent: 'center' },
  play: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  barra: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: SPACING.sm, marginBottom: scale(2), justifyContent: 'center' },
  barraRelleno: { height: '100%', borderRadius: 2, backgroundColor: DORADO },
  perilla: { position: 'absolute', width: scale(12), height: scale(12), borderRadius: scale(6), backgroundColor: '#FFFFFF' },
  tiempos: { flexDirection: 'row', justifyContent: 'space-between' },
  tiempo: { color: 'rgba(255,255,255,0.5)', fontSize: scale(11), fontVariant: ['tabular-nums'] },
  secciones: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(6), marginVertical: SPACING.xs },
  seccion: { paddingHorizontal: scale(10), height: scale(26), justifyContent: 'center', borderRadius: BORDER_RADIUS.full, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' },
  seccionActiva: { backgroundColor: DORADO, borderColor: DORADO },
  seccionTexto: { color: 'rgba(255,255,255,0.75)', fontSize: scale(11), fontWeight: FONT_WEIGHT.medium },
  seccionTextoActivo: { color: '#0A0A0A', fontWeight: FONT_WEIGHT.semibold },
  pista: { flexDirection: 'row', alignItems: 'center', height: scale(26) },
  pistaEtiqueta: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  pistaNombre: { flexShrink: 1, color: 'rgba(255,255,255,0.85)', fontSize: scale(11), fontWeight: FONT_WEIGHT.medium },
  carril: { flex: 1, height: scale(20), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: scale(4), paddingHorizontal: scale(4) },
  pico: { width: 1.5, borderRadius: 1 },
  apagado: { opacity: 0.3 },
  cursor: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: DORADO },
});

export default EstudioDeEjemplo;
