import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, ImageSourcePropType, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { MARCA } from '../../constants/marca';
import { RellenoDeMarca } from '../GradienteDeMarca';

/*
 * LAS PIEZAS DE LAS PORTADAS DE WEË AI, COMO EN LA DEMO YC (docs/MIGRACION-UI-DEMO-YC.md, lote 3).
 *
 * Las seis secciones de la demo (Studio, Design, Chef, Music, Travel, Fashion) se pintaban con recortes de las imágenes
 * de referencia del dueño. Comparten una misma gramática —un héroe oscuro con la mascota, la caja dorada, bloques de
 * accesos con iconos de color, una tarjeta destacada y tarjetas con descripción—, y esa gramática vive aquí, una vez.
 * Cada sección solo dice QUÉ pone y A DÓNDE lleva cada pieza, con las acciones que la pantalla ya tenía.
 *
 * De las referencias solo se conservan ilustraciones (mascotas, fotos), en `assets/images/sectores/`. Los textos son del
 * diccionario; los nombres de Weë y de sus motores son marca y llegan tal cual.
 */

const isWeb = Platform.OS === 'web';
const pulsable = isWeb ? ({ cursor: 'pointer' } as any) : null;

/* El acento de Weë en los sectores: sale del token de marca (constants/marca.ts, 2026-11-05). El nombre se conserva por compatibilidad. */
export const DORADO = MARCA.primario;
/* El fondo de los héroes y de las tarjetas destacadas: ilustración, no cambia con el tema. */
export const NOCHE: [string, string] = ['#141221', '#2A1F45'];
export const VIOLETA: [string, string] = ['#2A1F45', '#3B2660'];

/** Un color de en medio de un degradado de dos, para fundir una ilustración sin costura. */
const mezcla = ([a, b]: [string, string], t: number): string => {
  const c = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const v = [0, 1, 2].map((i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * t));
  return `#${v.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
};
const transparente = (hex: string) => `${hex}00`;

const sombra = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: scale(12),
  shadowOffset: { width: 0, height: scale(4) },
  elevation: 2,
};

/* ── El héroe ─────────────────────────────────────────────────────────────── */

/**
 * El cuerpo del título según su renglón más largo: «Create» cabe a 32, «always with you» necesita 27 para no partir
 * la última palabra sola en otro renglón. Una palabra suelta colgando se lee como un error.
 */
const tamanoDelTitulo = (lineas: { texto: string }[], maximo = 32) => {
  const largo = Math.max(...lineas.map((l) => l.texto.length));
  const n = Math.min(maximo, largo <= 13 ? 32 : largo <= 16 ? 27 : largo <= 20 ? 24 : 21);
  return { fontSize: scale(n), lineHeight: scale(n * 1.12) };
};

export interface Ficha {
  icono: string;
  texto: string;
  onPress: () => void;
  activa?: boolean;
  /** Color propio del icono (las fichas blancas de Weë Travel, como en su referencia); sin él, el cuadrito dorado de siempre. */
  tinta?: string;
}

export interface HeroProps {
  /** Renglones del título; los que llevan `dorado` van en el color de Weë. */
  lineas: { texto: string; dorado?: boolean }[];
  descripcion: string;
  fichas: Ficha[];
  imagen: ImageSourcePropType;
  /** Qué parte del ancho ocupa la ilustración (0–1). */
  anchoImagen?: number;
  colores?: [string, string];
  /** Las fichas en una fila que se desliza (Fashion), en vez de dos renglones bajo el texto. */
  fichasEnFila?: boolean;
  /**
   * Proporciones de la referencia de Weë Travel (ref-travel.jpg): la descripción es un punto más pequeña y el héroe
   * más bajo, para que la caja dorada asome antes. Solo presentación.
   */
  compacto?: boolean;
  /** Tope del cuerpo del título: Music lleva tres renglones cortos y en su referencia son más pequeños que en Studio. */
  tituloMaximo?: number;
  /**
   * Qué parte de la ilustración queda a la vista cuando el recorte es más ancho que su hueco (0 = borde de la
   * izquierda, 1 = derecha). Sin él, el borde de siempre. Fashion la usa para que su mascota, que está en el centro de
   * la imagen, no se quede fuera. No se invierte en RTL: el encuadre centra a la mascota en SU hueco, y ese centrado es
   * el mismo esté el hueco a la derecha o a la izquierda (invertirlo la metía debajo del título).
   */
  encuadre?: number;
}

const FichaDelHeroe: React.FC<Ficha> = ({ icono, texto, onPress, activa, tinta }) => (
  <TouchableOpacity
    style={[s.ficha, !!tinta && s.fichaBlanca, activa && s.fichaActiva, pulsable]}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={texto}
    accessibilityState={activa ? { selected: true } : undefined}
  >
    {activa && <RellenoDeMarca radio={BORDER_RADIUS.full} />}
    {tinta && !activa ? (
      <Ionicons name={icono as any} size={scale(16)} color={tinta} style={s.fichaIconoTinta} />
    ) : (
      <View style={[s.fichaIcono, activa && s.fichaIconoActivo]}>
        <Ionicons name={icono as any} size={scale(13)} color={activa ? '#111111' : DORADO} />
      </View>
    )}
    <Text style={s.fichaTexto} numberOfLines={1}>{texto}</Text>
  </TouchableOpacity>
);

export const HeroDeSector: React.FC<HeroProps> = ({ lineas, descripcion, fichas, imagen, anchoImagen = 0.56, colores = NOCHE, fichasEnFila, compacto, tituloMaximo, encuadre }) => {
  const { theme } = useTheme();
  const dir = useDireccion();
  /* En el teléfono, a sangre como en las referencias; en tableta y escritorio se alinea con la caja y los bloques. */
  const aSangre = useWindowDimensions().width < 768;
  /* En RTL todo se refleja: el texto empieza por la derecha y la ilustración se va al otro lado. */
  const haciaElFinal = dir.esRTL ? { start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } } : { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
  const inicio = 1 - anchoImagen;
  /* Degradado horizontal: así el color donde empieza la ilustración es el mismo de arriba abajo y el fundido no deja costura. */
  const borde = mezcla(colores, inicio);
  return (
    <View style={[s.heroe, !aSangre && s.heroeEnColumna, compacto && s.heroeCompacto, dir.contenedor]}>
      <LinearGradient colors={colores} {...haciaElFinal} style={StyleSheet.absoluteFill} />
      <Image source={imagen} style={[s.ilustracion, dir.alFinal(0), { width: `${anchoImagen * 100}%` as any }]} contentFit="cover" contentPosition={encuadre === undefined ? (dir.esRTL ? 'right center' : 'left center') : { top: '50%', left: `${Math.round(encuadre * 100)}%` }} transition={0} accessible={false} />
      <LinearGradient colors={[borde, transparente(borde)]} {...haciaElFinal} style={[s.fundidoLateral, dir.alInicio(`${inicio * 100}%`)]} pointerEvents="none" />
      <LinearGradient colors={['rgba(255,255,255,0)', theme.colors.background]} style={s.fundidoAbajo} pointerEvents="none" />
      <View style={[s.heroeTexto, { maxWidth: fichasEnFila ? '64%' : '62%' }, compacto && s.heroeTextoCompacto, fichasEnFila && s.heroeTextoConFila]}>
        <Text style={[s.heroeTitulo, tamanoDelTitulo(lineas, tituloMaximo)]} accessibilityRole="header">
          {lineas.map((l, i) => (
            <Text key={i} style={l.dorado ? { color: DORADO } : null}>{i > 0 ? '\n' : ''}{l.texto}</Text>
          ))}
        </Text>
        <Text style={[s.heroeDescripcion, compacto && s.heroeDescripcionCompacta]}>{descripcion}</Text>
        {!fichasEnFila && (
          <View style={s.fichas}>
            {fichas.map((f) => <FichaDelHeroe key={f.texto} {...f} />)}
          </View>
        )}
      </View>
      {fichasEnFila && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fichasEnFila} style={[s.filaDeFichas, compacto && s.filaDeFichasCompacta]}>
          {fichas.map((f) => <FichaDelHeroe key={f.texto} {...f} />)}
        </ScrollView>
      )}
    </View>
  );
};

/* ── Título de bloque ─────────────────────────────────────────────────────── */

export const TituloDeBloque: React.FC<{ titulo: string; onVerTodo?: () => void }> = ({ titulo, onVerTodo }) => {
  const { theme } = useTheme();
  const t = useT();
  const dir = useDireccion();
  return (
    <View style={s.tituloFila}>
      <Text style={[s.titulo, { color: theme.colors.text }]} accessibilityRole="header">{titulo}</Text>
      {!!onVerTodo && (
        <TouchableOpacity onPress={onVerTodo} style={[s.verTodo, pulsable]} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('studio.seeAll')}>
          <Text style={[s.verTodoTexto, { color: theme.colors.textSecondary }]}>{t('studio.seeAll')}</Text>
          <Ionicons name="arrow-forward" size={scale(15)} color={theme.colors.textSecondary} style={dir.espejo} />
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ── Rejilla de accesos con icono de color ────────────────────────────────── */

export interface Acceso {
  id: string;
  icono: string;
  texto: string;
  tinta: string;
  fondo: string;
  onPress: () => void;
  seleccionado?: boolean;
}

/**
 * Cuatro (o los que sean) accesos en fila: un círculo de color con el icono y el nombre debajo. `tintados` pinta la
 * tarjeta entera del color suave en vez de dejarla blanca (Music, Travel). `suaves` deja un velo de ese color en la
 * tarjeta y conserva el círculo, más saturado (Design, Studio: así están en sus referencias).
 */
export const RejillaDeAccesos: React.FC<{ accesos: Acceso[]; tintados?: boolean; suaves?: boolean }> = ({ accesos, tintados, suaves }) => {
  const { theme } = useTheme();
  return (
    <View style={s.rejilla}>
      {accesos.map((a) => (
        <TouchableOpacity
          key={a.id}
          style={[
            s.acceso,
            { backgroundColor: tintados ? a.fondo : theme.colors.card, borderColor: a.seleccionado ? DORADO : tintados || suaves ? 'transparent' : theme.colors.border },
            a.seleccionado && s.accesoSeleccionado,
            pulsable,
          ]}
          onPress={a.onPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={a.texto.replace(/\n/g, ' ')}
        >
          {suaves && !tintados && <View style={[StyleSheet.absoluteFill, { backgroundColor: a.fondo, opacity: 0.45, borderRadius: scale(20) }]} pointerEvents="none" />}
          {tintados ? (
            <Ionicons name={a.icono as any} size={scale(28)} color={a.tinta} />
          ) : (
            <View style={[s.accesoIcono, { backgroundColor: a.fondo }]}>
              <Ionicons name={a.icono as any} size={scale(22)} color={a.tinta} />
            </View>
          )}
          <Text style={[s.accesoTexto, { color: tintados ? '#1F2937' : theme.colors.text }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{a.texto}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

/* ── Tarjeta destacada ────────────────────────────────────────────────────── */

export interface DestacadaProps {
  icono: string;
  lineas: { texto: string; dorado?: boolean }[];
  sub: string;
  cta: string;
  ctaIcono: string;
  imagen: ImageSourcePropType;
  onPress: () => void;
  anchoImagen?: number;
  colores?: [string, string];
}

export const TarjetaDestacada: React.FC<DestacadaProps> = ({ icono, lineas, sub, cta, ctaIcono, imagen, onPress, anchoImagen = 0.46, colores = VIOLETA }) => {
  const dir = useDireccion();
  /* En RTL todo se refleja: el texto empieza por la derecha y la ilustración se va al otro lado. */
  const haciaElFinal = dir.esRTL ? { start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } } : { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
  const inicio = 1 - anchoImagen;
  const borde = mezcla(colores, inicio);
  return (
    <TouchableOpacity style={[s.destacada, dir.contenedor, pulsable]} onPress={onPress} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={cta}>
      <LinearGradient colors={colores} {...haciaElFinal} style={StyleSheet.absoluteFill} />
      <Image source={imagen} style={[s.destacadaImagen, dir.alFinal(0), { width: `${anchoImagen * 100}%` as any }]} contentFit="cover" transition={0} accessible={false} />
      <LinearGradient colors={[borde, transparente(borde)]} {...haciaElFinal} style={[s.fundidoLateral, dir.alInicio(`${inicio * 100}%`)]} pointerEvents="none" />
      <View style={s.destacadaContenido}>
        <View style={s.destacadaCabeza}>
          <View style={s.destacadaIcono}>
            <Ionicons name={icono as any} size={scale(22)} color={DORADO} />
          </View>
          <View style={s.destacadaTextos}>
            <Text style={s.destacadaTitulo}>
              {lineas.map((l, i) => (
                <Text key={i} style={l.dorado ? { color: DORADO } : null}>{i > 0 ? '\n' : ''}{l.texto}</Text>
              ))}
            </Text>
            <Text style={s.destacadaSub}>{sub}</Text>
          </View>
        </View>
        <View style={s.destacadaBoton}>
          <RellenoDeMarca radio={BORDER_RADIUS.full} />
          <Ionicons name={ctaIcono as any} size={scale(16)} color="#111111" style={/arrow|chevron/.test(ctaIcono) ? dir.espejo : undefined} />
          <Text style={s.destacadaBotonTexto}>{cta}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ── Tarjetas con título y descripción ────────────────────────────────────── */

export interface TarjetaDescrita {
  id: string;
  icono: string;
  tinta: string;
  fondo: string;
  titulo: string;
  descripcion?: string;
  onPress: () => void;
}

/**
 * Tarjetas de dos (o tres) por fila con icono, título, descripción y la flecha de que llevan a algún sitio. `tintadas`
 * les da el color suave de su icono (Chef, Fashion); `grandes` pone el título en dos renglones al lado del icono (Chef).
 * Sin descripción, la tarjeta es una sola línea —icono, título y flecha—, como «Más herramientas» en la referencia de Studio.
 */
export const TarjetasDescritas: React.FC<{ tarjetas: TarjetaDescrita[]; columnas?: number; tintadas?: boolean; grandes?: boolean }> = ({ tarjetas, columnas = 2, tintadas, grandes }) => {
  const { theme } = useTheme();
  const dir = useDireccion();
  /* Por debajo de 360 px dos tarjetas por fila no caben sin partir el nombre ni cortar la descripción: van una por fila. */
  const { width } = useWindowDimensions();
  const porFila = width < 360 ? 1 : columnas;
  return (
    <View style={s.descritas}>
      {tarjetas.map((c) => {
        const enLinea = !c.descripcion && porFila < 3 && !grandes;
        const flecha = (
          <View style={[s.flecha, { backgroundColor: tintadas ? 'rgba(255,255,255,0.8)' : c.fondo }]}>
            <Ionicons name="chevron-forward" size={scale(14)} color="#1F2937" style={dir.espejo} />
          </View>
        );
        return (
        <View key={c.id} style={{ width: `${100 / porFila}%` as any, padding: scale(5) }}>
          <TouchableOpacity
            style={[
              s.descrita,
              grandes && s.descritaGrande,
              { backgroundColor: tintadas ? c.fondo : theme.colors.card, borderColor: tintadas ? 'transparent' : theme.colors.border },
              pulsable,
            ]}
            onPress={c.onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={c.titulo.replace(/\n/g, ' ')}
          >
            <View style={[s.descritaCabeza, porFila >= 3 && s.descritaCabezaApilada, enLinea && s.descritaEnLinea]}>
              <View style={[grandes ? s.descritaIconoGrande : s.descritaIcono, { backgroundColor: tintadas ? 'rgba(255,255,255,0.7)' : c.fondo }]}>
                <Ionicons name={c.icono as any} size={scale(grandes ? 28 : 20)} color={c.tinta} />
              </View>
              <Text style={[grandes ? s.descritaTituloGrande : s.descritaTitulo, porFila >= 3 && s.descritaTituloApilado, { color: tintadas ? '#1F2937' : theme.colors.text }]} numberOfLines={grandes ? 3 : 2}>{c.titulo}</Text>
              {enLinea && flecha}
            </View>
            {!enLinea && (
            <View style={s.descritaPie}>
              {!!c.descripcion && <Text style={[s.descritaTexto, { color: tintadas ? '#4B5563' : theme.colors.textSecondary }]} numberOfLines={3}>{c.descripcion}</Text>}
              {flecha}
            </View>
            )}
          </TouchableOpacity>
        </View>
        );
      })}
    </View>
  );
};

/* ── Tarjetas de foto ─────────────────────────────────────────────────────── */

export interface TarjetaDeFoto {
  id: string;
  imagen: ImageSourcePropType;
  texto: string;
  icono?: string;
  onPress: () => void;
}

/**
 * Fotos que se tocan. `destino` (Travel): el nombre con su pin encima de la foto. `franja` (Fashion): la foto arriba
 * y una franja violeta con icono, frase y flecha debajo.
 */
export const TarjetasDeFoto: React.FC<{ tarjetas: TarjetaDeFoto[]; variante: 'destino' | 'franja' }> = ({ tarjetas, variante }) => {
  const dir = useDireccion();
  return (
  <View style={s.fotos}>
    {tarjetas.map((f) => (
      <TouchableOpacity
        key={f.id}
        style={[variante === 'destino' ? s.fotoDestino : s.fotoFranja, pulsable]}
        onPress={f.onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={f.texto.replace(/\n/g, ' ')}
      >
        <Image source={f.imagen} style={variante === 'destino' ? StyleSheet.absoluteFill : s.fotoArriba} contentFit="cover" transition={0} accessible={false} />
        {variante === 'destino' ? (
          <>
            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} style={s.fotoVelo} pointerEvents="none" />
            <View style={s.fotoEtiqueta}>
              <Ionicons name="location-outline" size={scale(15)} color="#FFFFFF" />
              <Text style={s.fotoEtiquetaTexto} numberOfLines={1}>{f.texto}</Text>
            </View>
          </>
        ) : (
          <View style={s.franja}>
            {!!f.icono && <Ionicons name={f.icono as any} size={scale(20)} color="#FFD8A8" />}
            <Text style={s.franjaTexto} numberOfLines={4}>{f.texto}</Text>
            <Ionicons name="arrow-forward" size={scale(15)} color="#FFFFFF" style={dir.espejo} />
          </View>
        )}
      </TouchableOpacity>
    ))}
  </View>
  );
};

/* ── Píldoras: el resto de puertas de una sección, que no se pierden ─────── */

export const PildorasDeSector: React.FC<{ pildoras: { id: string; icono: string; texto: string; onPress: () => void }[] }> = ({ pildoras }) => {
  const { theme } = useTheme();
  if (!pildoras.length) return null;
  return (
    <View style={s.pildoras}>
      {pildoras.map((o) => (
        <TouchableOpacity
          key={o.id}
          style={[s.pildora, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pulsable]}
          onPress={o.onPress}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={o.texto}
        >
          <Ionicons name={o.icono as any} size={scale(15)} color={theme.colors.textSecondary} />
          <Text style={[s.pildoraTexto, { color: theme.colors.text }]}>{o.texto}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

/* ── Contenedor de bloque ─────────────────────────────────────────────────── */

export const Bloque: React.FC<{ children: React.ReactNode }> = ({ children }) => <View style={s.bloque}>{children}</View>;

const s = StyleSheet.create({
  /* En el teléfono va a sangre, de borde a borde, como en las seis referencias (2026-11-04). */
  heroe: { borderRadius: scale(30), overflow: 'hidden', minHeight: scale(330) },
  heroeEnColumna: { marginHorizontal: SPACING.sm },
  ilustracion: { position: 'absolute', top: 0, bottom: 0 },
  fundidoLateral: { position: 'absolute', top: 0, bottom: 0, width: '20%' },
  fundidoAbajo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: scale(70) },
  heroeTexto: { paddingTop: scale(28), paddingHorizontal: scale(22), paddingBottom: scale(64), gap: scale(12) },
  heroeTitulo: { color: '#FFFFFF', fontSize: scale(32), lineHeight: scale(36), fontWeight: FONT_WEIGHT.bold, letterSpacing: -0.5 },
  heroeDescripcion: { color: 'rgba(255, 255, 255, 0.9)', fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginTop: scale(4) },
  heroeTextoConFila: { paddingBottom: scale(14) },
  heroeCompacto: { minHeight: scale(290) },
  heroeTextoCompacto: { paddingTop: scale(26), paddingBottom: scale(46), gap: scale(10) },
  heroeDescripcionCompacta: { fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  filaDeFichas: { marginBottom: scale(56), flexGrow: 0 },
  filaDeFichasCompacta: { marginBottom: scale(40) },
  fichasEnFila: { gap: scale(8), paddingHorizontal: scale(18) },
  ficha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: scale(6),
    paddingLeft: scale(6),
    paddingRight: scale(12),
    minHeight: 34,
  },
  fichaActiva: { backgroundColor: DORADO },
  fichaBlanca: { backgroundColor: '#FFFFFF', paddingLeft: scale(10), paddingRight: scale(14), gap: scale(7), minHeight: 32 },
  fichaIconoTinta: { width: scale(16), textAlign: 'center' },
  fichaIcono: { width: scale(22), height: scale(22), borderRadius: scale(6), backgroundColor: MARCA.velo(0.18), alignItems: 'center', justifyContent: 'center' },
  fichaIconoActivo: { backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  fichaTexto: { color: '#1F2937', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },

  bloque: { gap: SPACING.md, paddingHorizontal: SPACING.lg },
  tituloFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  titulo: { flex: 1, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  verTodo: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  verTodoTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },

  rejilla: { flexDirection: 'row', gap: scale(10) },
  acceso: { flex: 1, minWidth: 0, alignItems: 'center', gap: scale(8), paddingVertical: scale(14), paddingHorizontal: scale(4), borderRadius: scale(20), borderWidth: StyleSheet.hairlineWidth, ...sombra },
  accesoSeleccionado: { borderWidth: 1.5 },
  accesoIcono: { width: scale(46), height: scale(46), borderRadius: scale(23), alignItems: 'center', justifyContent: 'center' },
  accesoTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, textAlign: 'center' },

  destacada: { borderRadius: scale(26), overflow: 'hidden', minHeight: scale(170), marginHorizontal: SPACING.md, justifyContent: 'center' },
  destacadaImagen: { position: 'absolute', top: 0, bottom: 0 },
  destacadaContenido: { padding: scale(18), gap: scale(14), maxWidth: '68%' },
  destacadaCabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(10) },
  destacadaIcono: { width: scale(42), height: scale(42), borderRadius: scale(12), backgroundColor: MARCA.velo(0.16), alignItems: 'center', justifyContent: 'center' },
  destacadaTextos: { flex: 1, minWidth: 0, gap: scale(4) },
  destacadaTitulo: { color: '#FFFFFF', fontSize: scale(20), lineHeight: scale(24), fontWeight: FONT_WEIGHT.bold },
  destacadaSub: { color: 'rgba(255, 255, 255, 0.82)', fontSize: FONT_SIZE.sm, lineHeight: scale(19) },
  destacadaBoton: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: SPACING.xs, backgroundColor: DORADO, borderRadius: BORDER_RADIUS.full, paddingHorizontal: scale(18), paddingVertical: scale(10), minHeight: 40 },
  destacadaBotonTexto: { color: '#111111', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },

  descritas: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -scale(5) },
  descrita: { flex: 1, borderRadius: scale(20), borderWidth: StyleSheet.hairlineWidth, padding: scale(14), gap: scale(8), justifyContent: 'space-between', ...sombra },
  descritaGrande: { padding: scale(16), minHeight: scale(150) },
  descritaCabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(10) },
  /* Tres por fila: el icono encima del título, o el título no cabe a su lado en un teléfono. */
  descritaCabezaApilada: { flexDirection: 'column', gap: scale(6) },
  descritaEnLinea: { alignItems: 'center' },
  descritaTituloApilado: { flex: 0, fontSize: FONT_SIZE.sm },
  descritaIcono: { width: scale(38), height: scale(38), borderRadius: scale(19), alignItems: 'center', justifyContent: 'center' },
  descritaIconoGrande: { width: scale(44), height: scale(44), borderRadius: scale(22), alignItems: 'center', justifyContent: 'center' },
  descritaTitulo: { flex: 1, minWidth: 0, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  descritaTituloGrande: { flex: 1, minWidth: 0, fontSize: FONT_SIZE.base, lineHeight: scale(21), fontWeight: FONT_WEIGHT.bold },
  descritaPie: { flexDirection: 'row', alignItems: 'flex-end', gap: scale(6) },
  descritaTexto: { flex: 1, minWidth: 0, fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  flecha: { width: scale(26), height: scale(26), borderRadius: scale(13), alignItems: 'center', justifyContent: 'center' },

  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, minHeight: 38, borderRadius: BORDER_RADIUS.full, borderWidth: StyleSheet.hairlineWidth },
  pildoraTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  fotos: { flexDirection: 'row', gap: scale(8) },
  fotoDestino: { flex: 1, minWidth: 0, aspectRatio: 0.98, borderRadius: scale(18), overflow: 'hidden', justifyContent: 'flex-end' },
  fotoVelo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  fotoEtiqueta: { flexDirection: 'row', alignItems: 'center', gap: scale(3), padding: scale(8) },
  fotoEtiquetaTexto: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, flexShrink: 1 },
  fotoFranja: { flex: 1, minWidth: 0, borderRadius: scale(18), overflow: 'hidden', backgroundColor: '#4B2A7B' },
  fotoArriba: { width: '100%', aspectRatio: 1.25 },
  /* Más ceñida (2026-11-04): en la referencia el rótulo cabe entero; con 12 pt y tres renglones se cortaba «… o color». */
  franja: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: scale(5), backgroundColor: '#4B2A7B', paddingHorizontal: scale(7), paddingVertical: scale(8) },
  franjaTexto: { flex: 1, minWidth: 0, color: '#FFFFFF', fontSize: scale(11), lineHeight: scale(14), fontWeight: FONT_WEIGHT.semibold },
});
