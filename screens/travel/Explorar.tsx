import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { AvisoDemo, Boton, Chip, EstadoVacio, FilaDeChips, Fila, Fotografia, HojaInferior, Tarjeta, TituloDeSeccion } from '../../components/travel/Piezas';
import { TarjetaLugar, TarjetaRuta, VistaMapa } from '../../components/travel/Tarjetas';
import { TRAVEL } from '../../components/travel/tema';
import { useDireccion } from '../../hooks/useDireccion';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { CATEGORIAS_DE_LUGAR, CategoriaDeLugar, LUGARES, LugarDemo, POSICION_DEMO, lugarPorId, metrosEntre } from '../../constants/travelDemo';
import { ModoDeRuta, minutosDeRuta, optimizarParadas, nuevoId } from '../../utils/travelItinerario';
import { useTravelNav } from './rutas';

/*
 * 4 · EXPLORAR — mapa DEMO (sin SDK ni API de mapas: una superficie estilizada con marcadores de ejemplo en Kioto),
 * cerca de mí, ficha de lugar y planificador de rutas. Distancias y tiempos se calculan sobre el mapa de ejemplo.
 */

const PRECIO = ['travel.free', 'travel.price1', 'travel.price2', 'travel.price3'];

const ordenarPorDistancia = (lista: LugarDemo[]) => [...lista].sort((a, b) => metrosEntre(POSICION_DEMO, a) - metrosEntre(POSICION_DEMO, b));

export const ExplorarScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const dir = useDireccion();
  const { ir } = useTravelNav();
  const { lugaresGuardados, alternarLugar } = useTravelDemo();
  const [cat, setCat] = useState<CategoriaDeLugar | null>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase(x.locale);
  const visibles = ordenarPorDistancia(LUGARES.filter((l) => (!cat || l.categoria === cat) && (!q.trim() || norm(x.t(l.nombre)).includes(norm(q.trim())))));
  const elegido = lugarPorId(sel ?? undefined);
  return (
    <MarcoDeTravel titulo={x.t('travel.modExplore')} subtitulo={x.t('travel.exploreSub')} icono="map-outline" demo contextoBrain={x.t('travel.brainCtxExplore')}>
      <View style={x2.buscar}>
        <Ionicons name="search-outline" size={18} color={TRAVEL.gris} />
        <TextInput value={q} onChangeText={setQ} placeholder={x.t('travel.searchOnMap')} placeholderTextColor={TRAVEL.gris} style={[x2.input, dir.texto]} accessibilityLabel={x.t('travel.searchOnMap')} />
      </View>
      <FilaDeChips>
        <Chip texto={x.t('travel.all')} activo={!cat} onPress={() => setCat(null)} />
        {CATEGORIAS_DE_LUGAR.map((c) => <Chip key={c.id} texto={x.t(c.titulo)} icono={c.icono} activo={cat === c.id} onPress={() => setCat(cat === c.id ? null : c.id)} />)}
      </FilaDeChips>
      <VistaMapa lugares={visibles} seleccionado={sel} onMarcador={setSel} alto={320} />
      <AvisoDemo texto={x.t('travel.demoMapNote')} />
      <View style={x2.acciones}>
        <Boton texto={x.t('travel.nearby')} icono="locate-outline" variante="suave" pequeno onPress={() => ir('cerca')} />
        <Boton texto={x.t('travel.routePlanner')} icono="git-commit-outline" variante="suave" pequeno onPress={() => ir('ruta')} />
        <Boton texto={x.t('travel.travelSafe')} icono="shield-checkmark-outline" variante="suave" pequeno onPress={() => ir('seguridad')} />
      </View>
      <View style={x2.bloque}>
        <TituloDeSeccion titulo={x.t('travel.resultsCount', { contador: visibles.length })} />
        {visibles.length === 0 && <EstadoVacio icono="map-outline" titulo={x.t('travel.noPlacesHere')} texto={x.t('travel.noPlacesHereText')} />}
        {visibles.map((l) => <TarjetaLugar key={l.id} lugar={l} onPress={() => setSel(l.id)} guardado={lugaresGuardados.includes(l.id)} onGuardar={() => alternarLugar(l.id)} />)}
      </View>
      <HojaInferior visible={!!elegido} onCerrar={() => setSel(null)} titulo={elegido ? x.t(elegido.nombre) : ''}>
        {!!elegido && <FichaDeLugar lugar={elegido} onCerrar={() => setSel(null)} />}
      </HojaInferior>
    </MarcoDeTravel>
  );
};

/** La ficha corta de un lugar (la hoja del mapa). */
const FichaDeLugar: React.FC<{ lugar: LugarDemo; onCerrar: () => void }> = ({ lugar, onCerrar }) => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { lugaresGuardados, alternarLugar } = useTravelDemo();
  const cat = CATEGORIAS_DE_LUGAR.find((c) => c.id === lugar.categoria);
  const m = metrosEntre(POSICION_DEMO, lugar);
  return (
    <>
      <Text style={x2.meta}>{x.t(cat?.titulo ?? '')} · {x.distancia(m)} · {x.t('travel.walkMinutes', { contador: minutosDeRuta(m, 'pie') })}</Text>
      <Text style={x2.parrafo}>{x.t(cat?.descripcion ?? '')}</Text>
      <View style={x2.acciones}>
        <Boton texto={x.t('travel.details')} icono="information-circle-outline" pequeno onPress={() => { onCerrar(); ir('lugar', lugar.id); }} />
        <Boton texto={x.t('travel.route')} icono="navigate-outline" variante="suave" pequeno onPress={() => { onCerrar(); ir('ruta', lugar.id); }} />
        <Boton texto={x.t(lugaresGuardados.includes(lugar.id) ? 'travel.saved' : 'travel.save')} icono={lugaresGuardados.includes(lugar.id) ? 'heart' : 'heart-outline'} variante="linea" pequeno onPress={() => alternarLugar(lugar.id)} />
      </View>
    </>
  );
};

export const CercaScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { lugaresGuardados, alternarLugar } = useTravelDemo();
  const [radio, setRadio] = useState(1500);
  const [abiertos, setAbiertos] = useState(false);
  const lista = ordenarPorDistancia(LUGARES).filter((l) => metrosEntre(POSICION_DEMO, l) <= radio && (!abiertos || l.abierto));
  return (
    <MarcoDeTravel titulo={x.t('travel.nearby')} subtitulo={x.t('travel.nearbySub')} icono="locate-outline" demo contextoBrain={x.t('travel.brainCtxNearby')}>
      <AvisoDemo texto={x.t('travel.demoLocationNote')} />
      <FilaDeChips>
        {[500, 1000, 1500, 3000].map((r) => <Chip key={r} texto={x.distancia(r)} activo={radio === r} onPress={() => setRadio(r)} />)}
        <Chip texto={x.t('travel.openNow')} icono="time-outline" activo={abiertos} onPress={() => setAbiertos(!abiertos)} />
      </FilaDeChips>
      {lista.length === 0
        ? <EstadoVacio icono="locate-outline" titulo={x.t('travel.nothingNearby')} texto={x.t('travel.nothingNearbyText')} cta={x.t('travel.widenRadius')} onCta={() => setRadio(3000)} />
        : lista.map((l) => <TarjetaLugar key={l.id} lugar={l} onPress={() => ir('lugar', l.id)} guardado={lugaresGuardados.includes(l.id)} onGuardar={() => alternarLugar(l.id)} />)}
    </MarcoDeTravel>
  );
};

export const LugarScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { lugaresGuardados, alternarLugar, viajeActivoDatos, cambiarViaje } = useTravelDemo();
  const [anadido, setAnadido] = useState(false);
  const l = lugarPorId(id);
  if (!l) return <MarcoDeTravel titulo={x.t('travel.modExplore')} sinBrain><EstadoVacio icono="alert-circle-outline" titulo={x.t('travel.notFound')} cta={x.t('travel.modExplore')} onCta={() => ir('explorar')} /></MarcoDeTravel>;
  const cat = CATEGORIAS_DE_LUGAR.find((c) => c.id === l.categoria);
  const m = metrosEntre(POSICION_DEMO, l);
  const anadir = () => {
    if (!viajeActivoDatos) return;
    cambiarViaje(viajeActivoDatos.id, (v) => ({ ...v, itinerario: v.itinerario.map((d, i) => (i === 0 ? { ...d, actividades: [...d.actividades, { id: nuevoId('a'), tipo: l.categoria === 'restaurantes' ? 'comida' : 'visita', clave: l.nombre, inicio: 18 * 60, duracion: l.minutos, coste: l.precio * 10, distanciaKm: m / 1000 }] } : d)) }));
    setAnadido(true);
  };
  return (
    <MarcoDeTravel titulo={x.t(l.nombre)} subtitulo={x.t(cat?.titulo ?? '')} icono={cat?.icono} demo contextoBrain={x.t('travel.brainCtxPlace', { lugar: x.t(l.nombre) })}>
      <Fotografia foto={l.foto} icono={cat?.icono ?? 'location-outline'} estilo={x2.hero} tamanoIcono={48} />
      <Tarjeta>
        <View style={x2.datos}>
          <Dato icono="star" texto={x.formato.numero(l.valoracion, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} />
          <Dato icono="navigate-outline" texto={x.distancia(m)} />
          <Dato icono="time-outline" texto={x.t(l.abierto ? 'travel.openNow' : 'travel.closedNow')} />
          <Dato icono="hourglass-outline" texto={x.duracion(l.minutos)} />
          <Dato icono="wallet-outline" texto={x.t(PRECIO[l.precio])} />
        </View>
        <Text style={x2.parrafo}>{x.t(cat?.descripcion ?? '')}</Text>
      </Tarjeta>
      <VistaMapa lugares={[l]} seleccionado={l.id} ruta={[POSICION_DEMO, l]} alto={180} />
      <View style={x2.acciones}>
        <Boton texto={x.t('travel.route')} icono="navigate-outline" pequeno onPress={() => ir('ruta', l.id)} />
        <Boton texto={x.t(lugaresGuardados.includes(l.id) ? 'travel.saved' : 'travel.save')} icono={lugaresGuardados.includes(l.id) ? 'heart' : 'heart-outline'} variante="suave" pequeno onPress={() => alternarLugar(l.id)} />
        <Boton texto={anadido ? x.t('travel.addedToTrip') : x.t('travel.addToActiveTrip')} icono={anadido ? 'checkmark' : 'add'} variante="suave" pequeno desactivado={!viajeActivoDatos || anadido} onPress={anadir} />
      </View>
      {!viajeActivoDatos && <Fila icono="briefcase-outline" titulo={x.t('travel.noActiveTrip')} subtitulo={x.t('travel.noActiveTripText')} onPress={() => ir('contexto')} />}
    </MarcoDeTravel>
  );
};

const Dato: React.FC<{ icono: string; texto: string }> = ({ icono, texto }) => (
  <View style={x2.dato}><Ionicons name={icono as React.ComponentProps<typeof Ionicons>['name']} size={14} color={TRAVEL.morado} /><Text style={x2.datoTexto}>{texto}</Text></View>
);

/* ── Rutas ──────────────────────────────────────────────────────────────── */

const MODOS: { id: ModoDeRuta; icono: string; titulo: string }[] = [
  { id: 'pie', icono: 'walk-outline', titulo: 'travel.modeWalk' },
  { id: 'transporte', icono: 'bus-outline', titulo: 'travel.modeTransit' },
  { id: 'coche', icono: 'car-outline', titulo: 'travel.modeCar' },
  { id: 'bici', icono: 'bicycle-outline', titulo: 'travel.modeBike' },
];

export const RutaScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const [destino, setDestino] = useState<string>(lugarPorId(id)?.id ?? 'fushimi');
  const [paradas, setParadas] = useState<string[]>([]);
  const [modo, setModo] = useState<ModoDeRuta>('pie');
  const [elegir, setElegir] = useState<'destino' | 'parada' | null>(null);
  const [alternativa, setAlternativa] = useState(0);
  const origen = { ...POSICION_DEMO };
  const fin = lugarPorId(destino) ?? LUGARES[0];
  const puntos = [origen, ...paradas.map((p) => lugarPorId(p)).filter((p): p is LugarDemo => !!p), fin];
  const metros = puntos.slice(1).reduce((s, p, i) => s + metrosEntre(puntos[i], p), 0);
  const factores = [1, 1.18, 1.32];
  const ALT = ['travel.altFastest', 'travel.altScenic', 'travel.altQuiet'];
  return (
    <MarcoDeTravel titulo={x.t('travel.routePlanner')} subtitulo={x.t('travel.routeSub')} icono="git-commit-outline" demo contextoBrain={x.t('travel.brainCtxRoute', { lugar: x.t(fin.nombre) })}>
      <Tarjeta>
        <Fila icono="radio-button-on-outline" titulo={x.t('travel.origin')} subtitulo={x.t('travel.yourLocationDemo')} />
        {paradas.map((p, i) => (
          <View key={`${p}-${i}`} style={x2.parada}>
            <View style={x2.flex}><Fila icono="ellipse-outline" titulo={x.t(lugarPorId(p)?.nombre ?? '')} subtitulo={x.t('travel.stopN', { n: i + 1 })} /></View>
            <TouchableOpacity onPress={() => setParadas(paradas.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={x.t('travel.removeStop')} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={TRAVEL.gris} />
            </TouchableOpacity>
          </View>
        ))}
        <Fila icono="location" titulo={x.t('travel.destination')} subtitulo={x.t(fin.nombre)} onPress={() => setElegir('destino')} />
        <View style={x2.acciones}>
          <Boton texto={x.t('travel.addStop')} icono="add" variante="suave" pequeno onPress={() => setElegir('parada')} />
          <Boton texto={x.t('travel.optimizeStops')} icono="flash-outline" variante="suave" pequeno desactivado={paradas.length < 2} onPress={() => setParadas(optimizarParadas(origen, paradas.map((p) => lugarPorId(p)).filter((p): p is LugarDemo => !!p)).map((p) => p.id))} />
        </View>
      </Tarjeta>
      <FilaDeChips>{MODOS.map((m) => <Chip key={m.id} texto={x.t(m.titulo)} icono={m.icono} activo={modo === m.id} onPress={() => setModo(m.id)} />)}</FilaDeChips>
      <VistaMapa lugares={puntos.slice(1) as LugarDemo[]} ruta={puntos} alto={260} />
      <View style={x2.bloque}>
        <TituloDeSeccion titulo={x.t('travel.alternatives')} />
        {factores.map((f, i) => (
          <TarjetaRuta key={ALT[i]} titulo={x.t(ALT[i])} metros={Math.round(metros * f)} minutos={minutosDeRuta(metros * f, modo)} icono={MODOS.find((m) => m.id === modo)?.icono ?? 'walk-outline'} activa={alternativa === i} onPress={() => setAlternativa(i)} />
        ))}
      </View>
      <AvisoDemo texto={x.t('travel.demoRouteNote')} />
      <HojaInferior visible={!!elegir} onCerrar={() => setElegir(null)} titulo={x.t(elegir === 'parada' ? 'travel.addStop' : 'travel.destination')}>
        {LUGARES.map((l) => <Fila key={l.id} icono={CATEGORIAS_DE_LUGAR.find((c) => c.id === l.categoria)?.icono ?? 'location-outline'} titulo={x.t(l.nombre)} subtitulo={x.distancia(metrosEntre(POSICION_DEMO, l))}
          onPress={() => { if (elegir === 'parada') setParadas([...paradas, l.id]); else setDestino(l.id); setElegir(null); }} />)}
      </HojaInferior>
    </MarcoDeTravel>
  );
};

const x2 = StyleSheet.create({
  bloque: { gap: 10 },
  flex: { flex: 1 },
  buscar: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 16, borderWidth: 1, borderColor: TRAVEL.borde, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, color: TRAVEL.tinta },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { fontSize: 13, fontWeight: '700', color: TRAVEL.morado },
  parrafo: { fontSize: 14, lineHeight: 20, color: TRAVEL.texto },
  hero: { height: 190, borderRadius: 22 },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: TRAVEL.lilaSuave },
  datoTexto: { fontSize: 12, fontWeight: '700', color: TRAVEL.tinta },
  parada: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
