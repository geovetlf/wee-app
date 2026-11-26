import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { enTemaOscuro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useDireccion } from '../hooks/useDireccion';
import { useEstiloWeeAi } from '../hooks/useEstiloWeeAi';
import { useElementos } from '../hooks/useElementos';
import CreatorShell from '../components/creator/CreatorShell';
import { RellenoDeDegradado } from '../components/GradienteDeMarca';
import { SelectorDeModelo } from '../components/weeai/SelectorDeModelo';
import HojaDeElementos from '../components/weeai/video/HojaDeElementos';
import SonidoDeVideo from '../components/weeai/video/SonidoDeVideo';
import { FilaDePildoras, Redonda } from '../components/weeai/video/PiezasDeElementos';
import { MODELO_AUTOMATICO } from '../constants/modelosWeeAi';
import { ElementoElegido } from '../constants/catalogoElementos';
import { ARTE_WEEAI } from '../constants/marca';
import { ESPACIO_WEEAI as SP, RADIO_WEEAI, textoWeeAi } from '../constants/estiloWeeAi';
import { scale } from '../utils/scale';

const FORMATOS = [{ id: '9:16', texto: '9:16' }, { id: '16:9', texto: '16:9' }, { id: '1:1', texto: '1:1' }];

/**
 * «CREAR VIDEO» (boceto v3): una fila de personajes arriba, la tarjeta de la idea con las referencias elegidas (miniaturas quitables y «+»
 * que abre la hoja de elementos), el texto con menciones, el modelo, el formato y UN solo botón principal. Es solo interfaz con datos
 * locales y de muestra: «Generar» abre el flujo de creación de siempre con el texto, y NO envía personajes, escenarios, ropa ni voces
 * al servidor (pendiente de integración). El coste real lo da el servidor al crear el trabajo; aquí solo se dice que hay precio de prueba.
 */
const CrearVideoScreen: React.FC = () => {
  const c = useEstiloWeeAi();
  const t = useT();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const arte = ARTE_WEEAI.claro;
  const { propios } = useElementos();
  const [texto, setTexto] = useState('');
  const [elegidos, setElegidos] = useState<ElementoElegido[]>([]);
  const [hoja, setHoja] = useState(false);
  const [modelo, setModelo] = useState(MODELO_AUTOMATICO);
  const [formato, setFormato] = useState('9:16');

  const nombreDe = (e: ElementoElegido) => (e.clave ? t(e.clave) : e.nombre);
  const mios = useMemo(() => propios.filter((p) => p.tipo === 'personaje').slice(0, 8), [propios]);
  const quitar = (id: string) => setElegidos((x) => x.filter((e) => e.id !== id));
  const alternarPropio = (p: (typeof mios)[number]) =>
    setElegidos((x) => (x.some((e) => e.id === p.id) ? x.filter((e) => e.id !== p.id) : [...x, { id: p.id, tipo: 'personaje', clave: null, nombre: p.nombre, uri: p.uris[0] }]));
  const mencionar = (e: ElementoElegido) => setTexto((x) => `${x}${x && !x.endsWith(' ') ? ' ' : ''}@${nombreDe(e)} `);

  const generar = () => {
    if (!user) return navigation.navigate('Login');
    /* El texto de siempre más el formato; los elementos elegidos NO viajan (pendiente de integración). */
    const goal = `${texto.trim()}\n${formato}`.trim();
    navigation.navigate('CreatorFlow', { experienceId: 'studio', goal });
  };

  return (
    <CreatorShell activeId="studio" title={t('composer.kindVideo')} breadcrumb={t('composer.kindVideo')} contentStyle={styles.contenido}>
      <View>
        <Text numberOfLines={1} style={[textoWeeAi('enfasis', '600'), dir.texto, { color: c.tinta, marginBottom: SP.sm }]} accessibilityRole="header">{t('filmmaker.characters')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rail, dir.contenedor]}>
          <Redonda icono="add" rotulo={t('common.new')} onPress={() => setHoja(true)} />
          {mios.map((p) => (
            <Redonda key={p.id} uri={p.uris[0]} rotulo={p.nombre} elegido={elegidos.some((e) => e.id === p.id)} onPress={() => alternarPropio(p)} />
          ))}
        </ScrollView>
      </View>

      <View style={[styles.tarjeta, { backgroundColor: c.superficie }]}>
        <View style={[styles.refs, dir.contenedor]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.refsFila, dir.contenedor]} style={styles.refsScroll}>
            {elegidos.map((e) => (
              <View key={e.id} style={[styles.ref, { backgroundColor: c.superficieAlta }]}>
                {e.uri ? <Image source={{ uri: e.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : <LinearGradient colors={e.gradiente ?? ['#E4E4E7', '#71717A']} style={StyleSheet.absoluteFill} />}
                <TouchableOpacity onPress={() => quitar(e.id)} accessibilityRole="button" accessibilityLabel={t('common.delete')} hitSlop={10} style={[styles.quitar, { backgroundColor: c.seleccion }]}>
                  <Ionicons name="close" size={scale(12)} color={c.sobreSeleccion} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={() => setHoja(true)} accessibilityRole="button" accessibilityLabel={t('common.new')} style={[styles.ref, styles.mas, { backgroundColor: c.fondo }]}>
              <Ionicons name="add" size={scale(26)} color={c.tinta} />
            </TouchableOpacity>
          </ScrollView>
        </View>

        <TextInput
          value={texto}
          onChangeText={setTexto}
          multiline
          placeholder={t('weeai.ideaPlaceholder')}
          placeholderTextColor={c.tintaTerciaria}
          style={[styles.texto, textoWeeAi('enfasis'), dir.texto, { color: c.tinta }]}
          accessibilityLabel={t('weeai.ideaPlaceholder')}
        />

        {elegidos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.menciones, dir.contenedor]}>
            {elegidos.map((e) => (
              <TouchableOpacity key={e.id} onPress={() => mencionar(e)} accessibilityRole="button" accessibilityLabel={nombreDe(e)} style={[styles.mencion, { backgroundColor: c.superficieAlta }]}>
                <Text numberOfLines={1} style={[textoWeeAi('nota', '600'), { color: c.tinta }]}>{`@${nombreDe(e)}`}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.barra, dir.contenedor]}>
          <SelectorDeModelo tipo="video" valor={modelo} onChange={setModelo} />
        </View>
        <FilaDePildoras opciones={FORMATOS} puesta={formato} onElegir={setFormato} />
        <SonidoDeVideo />
      </View>

      <View style={styles.pie}>
        <TouchableOpacity onPress={generar} accessibilityRole="button" activeOpacity={0.85} style={styles.generar}>
          <RellenoDeDegradado colores={arte.accion} radio={RADIO_WEEAI.pastilla} espejo={dir.esRTL} />
          <Text numberOfLines={1} style={[textoWeeAi('enfasis', '600'), { color: '#0A0A0A' }]}>{t('weeai.generate')}</Text>
        </TouchableOpacity>
        <Text style={[textoWeeAi('nota'), styles.nota, { color: c.tintaSecundaria }]}>{`${t('weeai.testPrice')} · ${t('weeai.notChargedYet')}`}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Specialist', { id: 'studio' })} accessibilityRole="button" style={styles.avanzado}>
          <Text numberOfLines={1} style={[textoWeeAi('cuerpo', '600'), { color: c.tinta }]}>{t('music.modeAdvanced')}</Text>
        </TouchableOpacity>
      </View>

      <HojaDeElementos
        visible={hoja}
        elegidos={elegidos}
        onClose={() => setHoja(false)}
        onListo={(sel) => {
          setElegidos(sel);
          setHoja(false);
        }}
      />
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  contenido: { gap: SP.lg },
  rail: { flexDirection: 'row', gap: SP.md, paddingEnd: SP.md },
  tarjeta: { borderRadius: RADIO_WEEAI.hoja, padding: SP.md, gap: SP.md },
  refs: { flexDirection: 'row', alignItems: 'center' },
  refsScroll: { flexGrow: 0 },
  refsFila: { flexDirection: 'row', gap: SP.sm, paddingTop: 6, paddingEnd: SP.sm },
  ref: { width: scale(62), height: scale(62), borderRadius: RADIO_WEEAI.control + 4, overflow: 'visible' },
  mas: { alignItems: 'center', justifyContent: 'center' },
  quitar: { position: 'absolute', top: -6, end: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  texto: { minHeight: scale(96), textAlignVertical: 'top' },
  menciones: { flexDirection: 'row', gap: SP.sm },
  mencion: { minHeight: 44, borderRadius: RADIO_WEEAI.pastilla, paddingHorizontal: SP.md, alignItems: 'center', justifyContent: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  pie: { gap: SP.sm, alignItems: 'center' },
  generar: { alignSelf: 'stretch', minHeight: 52, borderRadius: RADIO_WEEAI.pastilla, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  nota: { textAlign: 'center' },
  avanzado: { minHeight: 44, justifyContent: 'center' },
});

export default enTemaOscuro(CrearVideoScreen);
