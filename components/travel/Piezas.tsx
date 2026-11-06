import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Pressable, StyleProp, ViewStyle, KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import IconoDireccional from '../IconoDireccional';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { TRAVEL, SOMBRA_SUAVE } from './tema';
import { RellenoDeMarca } from '../GradienteDeMarca';
import { fotoDe } from './fotos';
import { useTonoDelModulo } from './tono';
import type { FotoDeTravel } from '../../constants/travelDemo';

/*
 * WEËTRAVEL — LAS PIEZAS BÁSICAS (botones, chips, títulos, estados, hojas, campos).
 * Iconos de línea de Ionicons, nunca emojis. Los textos llegan ya traducidos: estas piezas no conocen frases.
 */

type Icono = React.ComponentProps<typeof Ionicons>['name'];

export const Boton: React.FC<{
  texto: string; onPress: () => void; icono?: string; variante?: 'morado' | 'dorado' | 'suave' | 'linea' | 'peligro';
  pequeno?: boolean; desactivado?: boolean; estilo?: StyleProp<ViewStyle>;
}> = ({ texto, onPress, icono, variante = 'morado', pequeno, desactivado, estilo }) => {
  const { tono } = useTonoDelModulo();
  const fondo = { morado: tono.fuerte, dorado: TRAVEL.dorado, suave: tono.suave, linea: TRAVEL.fondo, peligro: '#FDECEE' }[variante];
  const color = { morado: '#FFFFFF', dorado: TRAVEL.doradoTinta, suave: tono.fuerte, linea: TRAVEL.tinta, peligro: TRAVEL.peligro }[variante];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={desactivado}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!desactivado }}
      style={[p.boton, pequeno && p.botonPequeno, { backgroundColor: fondo, opacity: desactivado ? 0.45 : 1 }, variante === 'linea' && p.botonLinea, estilo]}
    >
      {/* «dorado» es lo que es de Weë (preguntar a Weë Brain): lleva el degradado de marca. Los demás, el tono del módulo. */}
      <RellenoDeMarca radio={999} apagada={variante !== 'dorado'} />
      {!!icono && <IconoDireccional name={icono as Icono} size={pequeno ? 15 : 18} color={color} />}
      <Text style={[p.botonTexto, pequeno && p.botonTextoPequeno, { color }]} numberOfLines={1}>{texto}</Text>
    </TouchableOpacity>
  );
};

export const Chip: React.FC<{ texto: string; activo?: boolean; icono?: string; onPress: () => void }> = ({ texto, activo, icono, onPress }) => {
  const { tono } = useTonoDelModulo();
  return (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityState={{ selected: !!activo }}
    style={[p.chip, activo && { backgroundColor: tono.fuerte, borderColor: tono.fuerte }]}
  >
    {!!icono && <Ionicons name={icono as Icono} size={15} color={activo ? '#FFFFFF' : tono.fuerte} />}
    <Text style={[p.chipTexto, activo && p.chipTextoActivo]} numberOfLines={1}>{texto}</Text>
  </TouchableOpacity>
  );
};

/** Una fila de chips que se desplaza en horizontal (y respeta RTL). */
export const FilaDeChips: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dir = useDireccion();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[p.filaChips, dir.contenedor]} style={p.filaChipsMarco}>
      {children}
    </ScrollView>
  );
};

export const TituloDeSeccion: React.FC<{ titulo: string; subtitulo?: string; onVerTodo?: () => void; barra?: boolean }> = ({ titulo, subtitulo, onVerTodo, barra }) => {
  const t = useT();
  return (
    <View style={p.tituloFila}>
      {barra && <View style={p.tituloBarra} />}
      <View style={p.tituloTextos}>
        <Text style={p.titulo} accessibilityRole="header">{titulo}</Text>
        {!!subtitulo && <Text style={p.subtitulo}>{subtitulo}</Text>}
      </View>
      {!!onVerTodo && (
        <TouchableOpacity onPress={onVerTodo} style={p.verTodo} accessibilityRole="button" hitSlop={8}>
          <Text style={p.verTodoTexto}>{t('travel.seeAll')}</Text>
          <IconoDireccional name="arrow-forward" size={15} color={TRAVEL.morado} />
        </TouchableOpacity>
      )}
    </View>
  );
};

/** La marca DEMO: pequeña, legible, y en cada sitio donde un dato podría tomarse por real. */
export const SelloDemo: React.FC = () => {
  const t = useT();
  return (
    <View style={p.sello} accessibilityLabel={t('travel.demoLabel')}>
      <Text style={p.selloTexto}>{t('travel.demo')}</Text>
    </View>
  );
};

export const AvisoDemo: React.FC<{ texto: string; fuerte?: boolean }> = ({ texto, fuerte }) => {
  /* Empieza por «DEMO»: sin la dirección del idioma, la web lo leía como un párrafo LTR en árabe o hebreo. */
  const dir = useDireccion();
  return (
    <View style={[p.aviso, fuerte && p.avisoFuerte]} accessibilityRole="alert">
      <Ionicons name={fuerte ? 'warning-outline' : 'flask-outline'} size={18} color={fuerte ? TRAVEL.peligro : TRAVEL.morado} />
      <Text style={[p.avisoTexto, fuerte && p.avisoTextoFuerte, dir.texto]}>{texto}</Text>
    </View>
  );
};

export const EstadoVacio: React.FC<{ icono: string; titulo: string; texto?: string; cta?: string; onCta?: () => void }> = ({ icono, titulo, texto, cta, onCta }) => (
  <View style={p.vacio}>
    <View style={p.vacioIcono}><Ionicons name={icono as Icono} size={28} color={TRAVEL.morado} /></View>
    <Text style={p.vacioTitulo}>{titulo}</Text>
    {!!texto && <Text style={p.vacioTexto}>{texto}</Text>}
    {!!cta && !!onCta && <Boton texto={cta} icono="add" onPress={onCta} pequeno />}
  </View>
);

export const EstadoCarga: React.FC<{ texto: string }> = ({ texto }) => (
  <View style={p.vacio} accessibilityRole="progressbar">
    <ActivityIndicator color={TRAVEL.morado} />
    <Text style={p.vacioTexto}>{texto}</Text>
  </View>
);

export const EstadoError: React.FC<{ texto: string; onReintentar: () => void }> = ({ texto, onReintentar }) => {
  const t = useT();
  return (
    <View style={p.vacio}>
      <View style={[p.vacioIcono, { backgroundColor: '#FDECEE' }]}><Ionicons name="cloud-offline-outline" size={26} color={TRAVEL.peligro} /></View>
      <Text style={p.vacioTexto}>{texto}</Text>
      <Boton texto={t('travel.retry')} icono="refresh" variante="linea" pequeno onPress={onReintentar} />
    </View>
  );
};

export const Pestanas: React.FC<{ opciones: { id: string; texto: string; contador?: number }[]; activa: string; onCambiar: (id: string) => void }> = ({ opciones, activa, onCambiar }) => (
  <FilaDeChips>
    {opciones.map((o) => (
      <TouchableOpacity
        key={o.id}
        onPress={() => onCambiar(o.id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: activa === o.id }}
        style={[p.pestana, activa === o.id && p.pestanaActiva]}
      >
        <Text style={[p.pestanaTexto, activa === o.id && p.pestanaTextoActiva]} numberOfLines={1}>
          {o.texto}{o.contador !== undefined ? ` · ${o.contador}` : ''}
        </Text>
      </TouchableOpacity>
    ))}
  </FilaDeChips>
);

/** Hoja inferior: la misma para fichas de lugar, formularios y selectores. */
export const HojaInferior: React.FC<{ visible: boolean; onCerrar: () => void; titulo: string; children: React.ReactNode }> = ({ visible, onCerrar, titulo, children }) => {
  const t = useT();
  const dir = useDireccion();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable style={p.velo} onPress={onCerrar} accessibilityLabel={t('travel.close')} />
      <View style={[p.hoja, dir.contenedor]} accessibilityViewIsModal>
        <View style={p.hojaAsa} />
        <View style={p.hojaCabecera}>
          <Text style={p.hojaTitulo} accessibilityRole="header" numberOfLines={2}>{titulo}</Text>
          <TouchableOpacity onPress={onCerrar} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('travel.close')}>
            <Ionicons name="close" size={24} color={TRAVEL.tinta} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={p.hojaCuerpo} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </Modal>
  );
};

export const Fila: React.FC<{ icono: string; titulo: string; subtitulo?: string; derecha?: string; onPress?: () => void; tono?: string }> = ({ icono, titulo, subtitulo, derecha, onPress, tono: propio }) => {
  const { tono: delModulo } = useTonoDelModulo();
  const tono = propio ?? delModulo.fuerte;
  const contenido = (
    <>
      <View style={[p.filaIcono, { backgroundColor: delModulo.suave }]}><Ionicons name={icono as Icono} size={19} color={tono} /></View>
      <View style={p.filaTextos}>
        <Text style={p.filaTitulo} numberOfLines={2}>{titulo}</Text>
        {!!subtitulo && <Text style={p.filaSub} numberOfLines={2}>{subtitulo}</Text>}
      </View>
      {!!derecha && <Text style={p.filaDerecha} numberOfLines={1}>{derecha}</Text>}
      {!!onPress && <IconoDireccional name="chevron-forward" size={18} color={TRAVEL.gris} />}
    </>
  );
  return onPress ? (
    <TouchableOpacity style={p.fila} onPress={onPress} activeOpacity={0.8} accessibilityRole="button">{contenido}</TouchableOpacity>
  ) : (
    <View style={p.fila}>{contenido}</View>
  );
};

export const Campo: React.FC<{
  etiqueta: string; valor: string; onCambiar: (v: string) => void; placeholder?: string; teclado?: KeyboardTypeOptions; multilinea?: boolean;
}> = ({ etiqueta, valor, onCambiar, placeholder, teclado, multilinea }) => {
  const dir = useDireccion();
  return (
    <View style={p.campo}>
      <Text style={p.campoEtiqueta}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={onCambiar}
        placeholder={placeholder}
        placeholderTextColor={TRAVEL.gris}
        keyboardType={teclado}
        multiline={multilinea}
        accessibilityLabel={etiqueta}
        style={[p.campoInput, multilinea && p.campoMulti, dir.texto, { textAlign: dir.esRTL ? 'right' : 'left' }]}
      />
    </View>
  );
};

export const Contador: React.FC<{ etiqueta: string; valor: number; onCambiar: (v: number) => void; min?: number; max?: number }> = ({ etiqueta, valor, onCambiar, min = 0, max = 20 }) => {
  const t = useT();
  return (
    <View style={p.contador}>
      <Text style={p.contadorEtiqueta}>{etiqueta}</Text>
      <View style={p.contadorControles}>
        <TouchableOpacity onPress={() => onCambiar(Math.max(min, valor - 1))} disabled={valor <= min} style={[p.contadorBoton, valor <= min && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel={t('travel.decrease', { nombre: etiqueta })}>
          <Ionicons name="remove" size={18} color={TRAVEL.morado} />
        </TouchableOpacity>
        <Text style={p.contadorValor}>{valor}</Text>
        <TouchableOpacity onPress={() => onCambiar(Math.min(max, valor + 1))} disabled={valor >= max} style={[p.contadorBoton, valor >= max && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel={t('travel.increase', { nombre: etiqueta })}>
          <Ionicons name="add" size={18} color={TRAVEL.morado} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const Tarjeta: React.FC<{ children: React.ReactNode; estilo?: StyleProp<ViewStyle> }> = ({ children, estilo }) => <View style={[p.tarjeta, estilo]}>{children}</View>;

/** Una foto de los datos DEMO, o —si no hay foto propia— el tratamiento lila con su icono de línea. */
export const Fotografia: React.FC<{ foto: FotoDeTravel | null | undefined; icono: string; estilo?: StyleProp<ViewStyle>; tamanoIcono?: number; children?: React.ReactNode }> = ({ foto, icono, estilo, tamanoIcono = 30, children }) => {
  const fuente = fotoDe(foto);
  return (
    <View style={[p.foto, estilo]}>
      {fuente ? (
        <Image source={fuente} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} accessible={false} />
      ) : (
        <LinearGradient colors={TRAVEL.sinFoto} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, p.fotoVacia]}>
          <Ionicons name={icono as Icono} size={tamanoIcono} color={TRAVEL.morado} />
        </LinearGradient>
      )}
      {children}
    </View>
  );
};

const p = StyleSheet.create({
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, paddingHorizontal: 18, borderRadius: 999 },
  botonPequeno: { minHeight: 36, paddingHorizontal: 14 },
  botonLinea: { borderWidth: 1, borderColor: TRAVEL.borde },
  botonTexto: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  botonTextoPequeno: { fontSize: 13 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: TRAVEL.fondo, borderWidth: 1, borderColor: TRAVEL.borde },
  chipTexto: { fontSize: 13, fontWeight: '600', color: TRAVEL.tinta },
  chipTextoActivo: { color: '#FFFFFF' },
  filaChipsMarco: { flexGrow: 0 },
  filaChips: { gap: 8, paddingVertical: 2, paddingHorizontal: 1 },
  tituloFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tituloBarra: { width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: TRAVEL.morado },
  tituloTextos: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontSize: 20, fontWeight: '800', color: TRAVEL.tinta, letterSpacing: -0.3 },
  subtitulo: { fontSize: 13, color: TRAVEL.gris, lineHeight: 18 },
  verTodo: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  verTodoTexto: { fontSize: 14, fontWeight: '700', color: TRAVEL.morado },
  sello: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: TRAVEL.lila },
  selloTexto: { fontSize: 11, fontWeight: '800', color: TRAVEL.morado, letterSpacing: 0.6 },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 14, backgroundColor: TRAVEL.lilaSuave, borderWidth: 1, borderColor: TRAVEL.lila },
  avisoFuerte: { backgroundColor: '#FFF1F2', borderColor: '#F8C9CF' },
  avisoTexto: { flex: 1, fontSize: 13, lineHeight: 18, color: TRAVEL.texto },
  avisoTextoFuerte: { color: '#7F1D2B', fontWeight: '700' },
  vacio: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 20 },
  vacioIcono: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: TRAVEL.lilaSuave },
  vacioTitulo: { fontSize: 16, fontWeight: '800', color: TRAVEL.tinta, textAlign: 'center' },
  vacioTexto: { fontSize: 13, lineHeight: 19, color: TRAVEL.gris, textAlign: 'center' },
  pestana: { paddingHorizontal: 14, height: 36, borderRadius: 999, justifyContent: 'center', backgroundColor: TRAVEL.lilaSuave },
  pestanaActiva: { backgroundColor: TRAVEL.tinta },
  pestanaTexto: { fontSize: 13, fontWeight: '700', color: TRAVEL.texto },
  pestanaTextoActiva: { color: '#FFFFFF' },
  velo: { flex: 1, backgroundColor: 'rgba(20,17,43,0.35)' },
  hoja: { maxHeight: '86%', backgroundColor: TRAVEL.fondo, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hojaAsa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: TRAVEL.borde },
  hojaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  hojaTitulo: { flex: 1, fontSize: 18, fontWeight: '800', color: TRAVEL.tinta },
  hojaCuerpo: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: TRAVEL.fondo, borderWidth: 1, borderColor: TRAVEL.borde },
  filaIcono: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filaTextos: { flex: 1, minWidth: 0, gap: 2 },
  filaTitulo: { fontSize: 15, fontWeight: '700', color: TRAVEL.tinta },
  filaSub: { fontSize: 12, color: TRAVEL.gris, lineHeight: 17 },
  filaDerecha: { fontSize: 13, fontWeight: '700', color: TRAVEL.tinta, maxWidth: '38%' },
  campo: { gap: 6 },
  campoEtiqueta: { fontSize: 13, fontWeight: '700', color: TRAVEL.texto },
  campoInput: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: TRAVEL.borde, paddingHorizontal: 14, fontSize: 15, color: TRAVEL.tinta, backgroundColor: TRAVEL.fondo },
  campoMulti: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  contador: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  contadorEtiqueta: { flex: 1, fontSize: 15, fontWeight: '600', color: TRAVEL.tinta },
  contadorControles: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  contadorBoton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: TRAVEL.borde, alignItems: 'center', justifyContent: 'center' },
  contadorValor: { minWidth: 24, textAlign: 'center', fontSize: 16, fontWeight: '800', color: TRAVEL.tinta },
  tarjeta: { backgroundColor: TRAVEL.fondo, borderRadius: 20, borderWidth: 1, borderColor: TRAVEL.borde, padding: 16, gap: 12, ...SOMBRA_SUAVE },
  foto: { overflow: 'hidden', backgroundColor: TRAVEL.lila },
  fotoVacia: { alignItems: 'center', justifyContent: 'center' },
});
