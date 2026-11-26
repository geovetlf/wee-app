import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { enTemaOscuro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useDireccion } from '../hooks/useDireccion';
import CreatorShell from '../components/creator/CreatorShell';
import IconoDireccional from '../components/IconoDireccional';
import { PORTADA_WEEAI as P, textoPortada } from '../constants/estiloWeeAi';
import { TandasYStoryboard } from '../components/filmmaker/tandas/TandasYStoryboard';
import { TandasDelTaller, tandasVacias } from '../utils/tandasDeFilmmaker';

/**
 * RUTA MÍNIMA DE «TANDAS Y STORYBOARD» (ola 3). Monta el componente de la etapa tal como lo montará la pantalla de Crear cuando la barra de etapas esté en
 * «Tandas»: esta ruta existe para poder abrir y probar la etapa sola; la barra de etapas y el flujo entre etapas los pone la pantalla anfitriona.
 */
const FilmmakerTandasScreen: React.FC = () => {
  const t = useT();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });
  const [tandas, setTandas] = useState<TandasDelTaller>(() => tandasVacias());
  const compacto = medida.alto > 0 && medida.alto < 700;

  return (
    <CreatorShell activeId="creator" title={t('weeai.portadaFilmmaker')} breadcrumb={t('nav.weeAi')} fondo={P.fondo} sinFranjaSuperior fija contentStyle={styles.contenido}>
      <View style={styles.raiz} onLayout={(e: LayoutChangeEvent) => { const { width, height } = e.nativeEvent.layout; setMedida((a) => (Math.abs(a.ancho - width) > 1 || Math.abs(a.alto - height) > 1 ? { ancho: Math.round(width), alto: Math.round(height) } : a)); }}>
        <View style={[styles.cabecera, dir.contenedor]}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Filmmaker'))} style={styles.boton} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <IconoDireccional name="arrow-back" size={24} color={P.tinta} />
          </TouchableOpacity>
          <Text style={[textoPortada(20, '600'), dir.texto, { color: P.tinta, flex: 1 }]} numberOfLines={1} accessibilityRole="header">{t('weeai.portadaFilmmaker')}</Text>
        </View>
        {medida.ancho > 0 ? <TandasYStoryboard ancho={medida.ancho} compacto={compacto} valor={tandas} onCambio={setTandas} /> : null}
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  contenido: { padding: 0, gap: 0, paddingBottom: 0 },
  raiz: { flex: 1, width: '100%', alignSelf: 'center', backgroundColor: P.fondo },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 56, paddingHorizontal: 8 },
  boton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

export default enTemaOscuro(FilmmakerTandasScreen);
