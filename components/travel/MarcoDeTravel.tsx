import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CreatorShell from '../creator/CreatorShell';
import CabeceraDeSeccion from '../creator/CabeceraDeSeccion';
import TravelMark from '../creator/TravelMark';
import TextoEnMayusculas from '../TextoEnMayusculas';
import { useT } from '../../contexts/IdiomaContext';
import { SelloDemo } from './Piezas';
import { LinearGradient } from 'expo-linear-gradient';
import { MODULOS } from '../../constants/travelDemo';
import { TRAVEL } from './tema';
import { RellenoDeMarca } from '../GradienteDeMarca';
import { useTonoDelModulo } from './tono';
import { useTravelNav } from '../../screens/travel/rutas';

/*
 * EL MARCO DE CADA PANTALLA DE WEËTRAVEL.
 *
 * El mismo de la portada —CreatorShell con la barra global de siempre, y arriba volver · W · WeëTravel · Credits—, más
 * la cabecera del módulo (icono, título, frase) y el acceso contextual a Weë Brain. Ese acceso no es otro asistente:
 * abre la conversación de siempre con lo que la pantalla ya sabe (`contexto`), para que Weë Brain no vuelva a
 * preguntarlo (CLAUDE.md §10).
 */
export const AccesoBrain: React.FC<{ contexto?: string; texto?: string }> = ({ contexto, texto }) => {
  const t = useT();
  const { preguntarABrain } = useTravelNav();
  return (
    <TouchableOpacity onPress={() => preguntarABrain(contexto)} style={m.brain} activeOpacity={0.85} accessibilityRole="button">
      <RellenoDeMarca radio={999} />
      <Ionicons name="sparkles" size={15} color={TRAVEL.doradoTinta} />
      <Text style={m.brainTexto} numberOfLines={1}>{texto ?? t('travel.askBrain')}</Text>
    </TouchableOpacity>
  );
};

const MarcoDeTravel: React.FC<{
  titulo: string; subtitulo?: string; icono?: string; demo?: boolean; contextoBrain?: string; sinBrain?: boolean; children: React.ReactNode;
}> = ({ titulo, subtitulo, icono, demo, contextoBrain, sinBrain, children }) => {
  const { volver } = useTravelNav();
  const t = useT();
  const { modulo, tono } = useTonoDelModulo();
  const datosModulo = MODULOS.find((x) => x.id === modulo);
  return (
    <CreatorShell activeId="travel" title="Weë Travel" mark={<TravelMark size={30} plain />} breadcrumb="Weë AI" sinFranjaSuperior onBack={volver}>
      <CabeceraDeSeccion soloIdentidad nombre="Travel" lema="" onVolver={volver} />
      <View style={[m.banda, { borderColor: tono.medio }]}>
        <LinearGradient colors={[tono.suave, '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[m.cinta, { backgroundColor: tono.fuerte }]} />
        <View style={m.etiquetaModulo}>
          <Ionicons name={(datosModulo?.icono ?? 'compass-outline') as React.ComponentProps<typeof Ionicons>['name']} size={13} color={tono.fuerte} />
          <TextoEnMayusculas style={[m.etiquetaTexto, { color: tono.fuerte }]} numberOfLines={1}>{datosModulo ? t(datosModulo.titulo) : ''}</TextoEnMayusculas>
        </View>
        <View style={m.cabecera}>
          {!!icono && <View style={[m.icono, { backgroundColor: tono.fuerte }]}><Ionicons name={icono as React.ComponentProps<typeof Ionicons>['name']} size={22} color="#FFFFFF" /></View>}
          <View style={m.textos}>
            <View style={m.filaTitulo}>
              <Text style={m.titulo} accessibilityRole="header">{titulo}</Text>
              {demo && <SelloDemo />}
            </View>
            {!!subtitulo && <Text style={m.subtitulo}>{subtitulo}</Text>}
          </View>
        </View>
      </View>
      {!sinBrain && <AccesoBrain contexto={contextoBrain} />}
      <View style={m.cuerpo}>{children}</View>
    </CreatorShell>
  );
};

export default MarcoDeTravel;

const m = StyleSheet.create({
  banda: { marginTop: 4, padding: 14, paddingTop: 12, borderRadius: 22, borderWidth: 1, overflow: 'hidden', gap: 10 },
  cinta: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  etiquetaModulo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  etiquetaTexto: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, flexShrink: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icono: { width: 44, height: 44, borderRadius: 14, backgroundColor: TRAVEL.lilaSuave, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 4 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  titulo: { fontSize: 24, fontWeight: '800', color: TRAVEL.tinta, letterSpacing: -0.4, flexShrink: 1 },
  subtitulo: { fontSize: 14, lineHeight: 20, color: TRAVEL.gris },
  brain: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: TRAVEL.dorado, maxWidth: '100%' },
  brainTexto: { fontSize: 13, fontWeight: '700', color: TRAVEL.doradoTinta, flexShrink: 1 },
  cuerpo: { gap: 22, marginTop: 18, paddingBottom: 28 },
});
