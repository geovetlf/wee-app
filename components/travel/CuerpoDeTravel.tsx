import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import IconoDireccional from '../IconoDireccional';
import { useDireccion } from '../../hooks/useDireccion';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { useTravelNav } from '../../screens/travel/rutas';
import { CATEGORIAS, MODULOS, destinoPorId } from '../../constants/travelDemo';
import { estadoDe } from '../../utils/travelItinerario';
import { TRAVEL, SOMBRA_SUAVE, TONO_DE_MODULO } from './tema';
import { EstadoVacio, Fotografia, Pestanas, SelloDemo, TituloDeSeccion } from './Piezas';
import type { AccionesDeTravel } from '../sectores/PortadaTravel';

/*
 * EL CUERPO DE LA PORTADA DE WEËTRAVEL (dirección aprobada por el dueño, 2026-11-06):
 * «Tu Travel Workspace» con las seis puertas, «Mis viajes» y «Popular entre viajeros». La barra de abajo es la global
 * de siempre: aquí no hay una segunda navegación.
 */
type Icono = React.ComponentProps<typeof Ionicons>['name'];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CuerpoDeTravel: React.FC<AccionesDeTravel> = (_acciones) => {
  const x = useTextosDeTravel();
  const dir = useDireccion();
  const { ir } = useTravelNav();
  const { viajes, favoritos } = useTravelDemo();
  const { width } = useWindowDimensions();
  const [pestana, setPestana] = useState<'proximos' | 'activos' | 'guardados'>('proximos');
  const porFila = width < 340 ? 2 : 3;

  const proximos = viajes.filter((v) => estadoDe(v) === 'proximo' || estadoDe(v) === 'borrador');
  const activos = viajes.filter((v) => estadoDe(v) === 'activo');
  const lista = pestana === 'proximos' ? proximos : pestana === 'activos' ? activos : [];
  const guardados = favoritos.map((id) => destinoPorId(id)).filter(Boolean);

  return (
    <View style={k.todo}>
      <View style={k.bloque}>
        <TituloDeSeccion barra titulo={x.t('travel.workspaceTitle')} subtitulo={x.t('travel.workspaceSub')} />
        <View style={k.rejilla}>
          {MODULOS.map((mod) => (
            <TouchableOpacity
              key={mod.id}
              onPress={() => ir(mod.id)}
              activeOpacity={0.88}
              style={[k.puerta, { width: `${100 / porFila}%` }]}
              accessibilityRole="button"
              accessibilityLabel={`${x.t(mod.titulo)}. ${x.t(mod.descripcion)}`}
            >
              <Fotografia foto={mod.foto} icono={mod.icono} estilo={k.puertaFoto} tamanoIcono={0}>
                <LinearGradient colors={mod.foto ? ['rgba(10,6,30,0.02)', 'rgba(10,6,30,0.55)', `${TONO_DE_MODULO[mod.id].fuerte}E6`] : [`${TONO_DE_MODULO[mod.id].fuerte}55`, `${TONO_DE_MODULO[mod.id].fuerte}F2`]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <View style={k.puertaCuerpo}>
                  <Ionicons name={mod.icono as Icono} size={26} color="#FFFFFF" />
                  {/* El título ocupa todo el ancho de la tarjeta: al lado de la flecha, «Community» se partía a media palabra. */}
                  <View style={k.puertaTextos}>
                    <Text style={k.puertaTitulo} numberOfLines={2}>{x.t(mod.titulo)}</Text>
                    <View style={k.puertaPie}>
                      <Text style={[k.puertaSub, k.puertaSubFlexible]} numberOfLines={4}>{x.t(mod.descripcion)}</Text>
                      <View style={k.puertaFlecha}><IconoDireccional name="arrow-forward" size={13} color="#FFFFFF" /></View>
                    </View>
                  </View>
                </View>
              </Fotografia>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={k.bloque}>
        <TituloDeSeccion titulo={x.t('travel.myTrips')} onVerTodo={() => ir('viajes')} />
        <Pestanas
          activa={pestana}
          onCambiar={(id) => setPestana(id as typeof pestana)}
          opciones={[
            { id: 'proximos', texto: x.t('travel.tabUpcoming'), contador: proximos.length },
            { id: 'activos', texto: x.t('travel.tabActive'), contador: activos.length },
            { id: 'guardados', texto: x.t('travel.tabSaved'), contador: guardados.length },
          ]}
        />
        {pestana !== 'guardados' && lista.length === 0 && (
          <EstadoVacio icono="briefcase-outline" titulo={x.t('travel.noTripsTitle')} texto={x.t('travel.noTripsText')} cta={x.t('travel.createFirstTrip')} onCta={() => ir('crear')} />
        )}
        {pestana === 'guardados' && guardados.length === 0 && (
          <EstadoVacio icono="heart-outline" titulo={x.t('travel.noSavedTitle')} texto={x.t('travel.noSavedText')} cta={x.t('travel.discoverCta')} onCta={() => ir('descubrir')} />
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[k.carril, dir.contenedor]}>
          {pestana !== 'guardados'
            ? lista.map((v) => {
              const dest = destinoPorId(v.destinos[0]);
              return (
                <TouchableOpacity key={v.id} onPress={() => ir('viaje', v.id)} style={k.mini} activeOpacity={0.88} accessibilityRole="button" accessibilityLabel={`${x.nombreDeViaje(v)}, ${x.fechasDeViaje(v)}`}>
                  <Fotografia foto={dest?.foto} icono={dest?.icono ?? 'location-outline'} estilo={k.miniFoto}>
                    <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(10,6,30,0.65)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
                    <View style={k.miniPie}>
                      <Ionicons name="location-outline" size={15} color="#FFFFFF" />
                      <Text style={k.miniTexto} numberOfLines={1}>{dest?.pais}</Text>
                    </View>
                  </Fotografia>
                  <Text style={k.miniNombre} numberOfLines={1}>{x.nombreDeViaje(v)}</Text>
                  <Text style={k.miniFecha} numberOfLines={1}>{x.fechasDeViaje(v)}</Text>
                </TouchableOpacity>
              );
            })
            : guardados.map((dest) => dest && (
              <TouchableOpacity key={dest.id} onPress={() => ir('destino', dest.id)} style={k.mini} activeOpacity={0.88} accessibilityRole="button">
                <Fotografia foto={dest.foto} icono={dest.icono} estilo={k.miniFoto}>
                  <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(10,6,30,0.65)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  <View style={k.miniPie}>
                    <Ionicons name="heart" size={14} color="#FFFFFF" />
                    <Text style={k.miniTexto} numberOfLines={1}>{dest.pais}</Text>
                  </View>
                </Fotografia>
                <Text style={k.miniNombre} numberOfLines={1}>{x.nombreDestino(dest)}</Text>
                <Text style={k.miniFecha} numberOfLines={1}>{x.pais(dest.pais)}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
        <View style={k.demo}><SelloDemo /><Text style={k.demoTexto}>{x.t('travel.demoLocalNote')}</Text></View>
      </View>

      <View style={k.bloque}>
        <TituloDeSeccion titulo={x.t('travel.popularTitle')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[k.carril, dir.contenedor]}>
          {CATEGORIAS.map((cat) => (
            <TouchableOpacity key={cat.id} onPress={() => ir('coleccion', `cat-${cat.id}`)} style={k.cat} activeOpacity={0.85} accessibilityRole="button">
              <Ionicons name={cat.icono as Icono} size={28} color={TRAVEL.morado} />
              <Text style={k.catTexto} numberOfLines={2}>{x.t(cat.titulo)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export default CuerpoDeTravel;

const k = StyleSheet.create({
  todo: { gap: 30 },
  bloque: { gap: 14, paddingHorizontal: 16 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  puerta: { padding: 5 },
  puertaFoto: { height: 158, borderRadius: 18, ...SOMBRA_SUAVE },
  puertaCuerpo: { flex: 1, padding: 9, justifyContent: 'space-between' },
  puertaPie: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  puertaTextos: { gap: 2 },
  puertaSubFlexible: { flex: 1, minWidth: 0 },
  puertaTitulo: { color: '#FFFFFF', fontSize: 14, lineHeight: 17, fontWeight: '800' },
  puertaSub: { color: 'rgba(255,255,255,0.92)', fontSize: 10, lineHeight: 12.5 },
  puertaFlecha: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  carril: { gap: 12, paddingVertical: 4, paddingHorizontal: 1 },
  mini: { width: 128, gap: 4 },
  miniFoto: { height: 110, borderRadius: 18, justifyContent: 'flex-end' },
  miniPie: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 10 },
  miniTexto: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  miniNombre: { fontSize: 14, fontWeight: '700', color: TRAVEL.tinta },
  miniFecha: { fontSize: 12, color: TRAVEL.gris },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  demoTexto: { flex: 1, fontSize: 12, color: TRAVEL.gris },
  cat: { width: 96, height: 92, borderRadius: 18, backgroundColor: TRAVEL.lilaSuave, borderWidth: 1, borderColor: TRAVEL.lila, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  catTexto: { fontSize: 12, fontWeight: '700', color: TRAVEL.tinta, textAlign: 'center' },
});
