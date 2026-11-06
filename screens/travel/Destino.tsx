import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { Boton, Chip, EstadoVacio, Fila, Fotografia, HojaInferior, SelloDemo, Tarjeta, TituloDeSeccion, AvisoDemo } from '../../components/travel/Piezas';
import { TarjetaClima, TarjetaDestino, TarjetaRecomendacion } from '../../components/travel/Tarjetas';
import { TRAVEL } from '../../components/travel/tema';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { CATEGORIAS, Clima, DESTINOS, DestinoDemo, Distancia, destinoPorId } from '../../constants/travelDemo';
import { useTravelNav } from './rutas';

/*
 * 1 · DESCUBRIR — detalle de un destino, «Sorpréndeme» y comparación. Datos DEMO: presupuestos, seguridad y requisitos
 * son orientativos y se marcan así; nada de esto es información oficial.
 */

type Icono = React.ComponentProps<typeof Ionicons>['name'];
const NIVEL_DE_SEGURIDAD = ['travel.safety1', 'travel.safety2', 'travel.safety3', 'travel.safety4', 'travel.safety5'];
const CLAVE_DISTANCIA: Record<Distancia, string> = { cerca: 'travel.distNear', media: 'travel.distMid', lejos: 'travel.distFar' };

const Accion: React.FC<{ icono: string; texto: string; onPress: () => void; activo?: boolean }> = ({ icono, texto, onPress, activo }) => (
  <TouchableOpacity onPress={onPress} style={g.accion} accessibilityRole="button" accessibilityState={{ selected: !!activo }}>
    <View style={[g.accionIcono, activo && { backgroundColor: TRAVEL.morado }]}><Ionicons name={icono as Icono} size={19} color={activo ? '#FFFFFF' : TRAVEL.morado} /></View>
    <Text style={g.accionTexto} numberOfLines={2}>{texto}</Text>
  </TouchableOpacity>
);

export const DestinoScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { ir, preguntarABrain } = useTravelNav();
  const { favoritos, alternarFavorito, viajes, cambiarViaje } = useTravelDemo();
  const [hojaViaje, setHojaViaje] = useState(false);
  const [anadido, setAnadido] = useState<string | null>(null);
  const d = destinoPorId(id);
  if (!d) return <MarcoDeTravel titulo={x.t('travel.modDiscover')} sinBrain><EstadoVacio icono="alert-circle-outline" titulo={x.t('travel.notFound')} cta={x.t('travel.modDiscover')} onCta={() => ir('descubrir')} /></MarcoDeTravel>;
  const nombre = x.nombreDestino(d);
  const parecidos = DESTINOS.filter((o) => o.id !== d.id && o.categorias.some((c) => d.categorias.includes(c))).slice(0, 4);
  const compartir = () => Share.share({ message: x.t('travel.shareMessage', { lugar: nombre, pais: x.pais(d.pais) }) }).catch(() => undefined);
  const anadirA = (viajeId: string) => {
    cambiarViaje(viajeId, (v) => (v.destinos.includes(d.id) ? v : { ...v, destinos: [...v.destinos, d.id] }));
    setAnadido(viajeId);
  };
  return (
    <MarcoDeTravel titulo={nombre} subtitulo={x.pais(d.pais)} demo contextoBrain={x.t('travel.brainCtxDestination', { lugar: nombre, pais: x.pais(d.pais) })}>
      <Fotografia foto={d.foto} icono={d.icono} estilo={g.hero} tamanoIcono={56}>
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(10,6,30,0.7)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={g.heroPie}>
          <Text style={g.heroNombre}>{nombre}</Text>
          <View style={g.fila}><Ionicons name="location-outline" size={15} color="#FFFFFF" /><Text style={g.heroPais}>{x.pais(d.pais)}</Text></View>
        </View>
      </Fotografia>
      <View style={g.acciones}>
        <Accion icono={favoritos.includes(d.id) ? 'heart' : 'heart-outline'} texto={x.t(favoritos.includes(d.id) ? 'travel.saved' : 'travel.save')} activo={favoritos.includes(d.id)} onPress={() => alternarFavorito(d.id)} />
        <Accion icono="add-circle-outline" texto={x.t('travel.addToTrip')} onPress={() => setHojaViaje(true)} />
        <Accion icono="map-outline" texto={x.t('travel.exploreOnMap')} onPress={() => ir('explorar')} />
        <Accion icono="git-compare-outline" texto={x.t('travel.compare')} onPress={() => ir('comparar', `${d.id},${parecidos[0]?.id ?? 'kyoto'}`)} />
        <Accion icono="sparkles-outline" texto={x.t('travel.askBrainShort')} onPress={() => preguntarABrain(x.t('travel.brainCtxDestination', { lugar: nombre, pais: x.pais(d.pais) }))} />
        <Accion icono="share-social-outline" texto={x.t('travel.share')} onPress={compartir} />
      </View>
      <Tarjeta>
        <TituloDeSeccion titulo={x.t('travel.overview')} />
        <Text style={g.parrafo}>{x.t(d.descripcion)}</Text>
        <View style={g.chips}>{d.categorias.map((c) => <Chip key={c} texto={x.t(CATEGORIAS.find((k) => k.id === c)?.titulo ?? '')} onPress={() => ir('coleccion', `cat-${c}`)} />)}</View>
      </Tarjeta>
      <View style={g.bloque}>
        <TituloDeSeccion titulo={x.t('travel.topAttractions')} />
        {d.atracciones.map((a, i) => <Fila key={a} icono={i === 0 ? 'star-outline' : 'camera-outline'} titulo={x.t(a)} />)}
      </View>
      <View style={g.bloque}>
        <TituloDeSeccion titulo={x.t('travel.food')} />
        {d.comida.map((f) => <Fila key={f} icono="restaurant-outline" titulo={x.t(f)} />)}
      </View>
      <View style={g.bloque}>
        <TituloDeSeccion titulo={x.t('travel.climateSeason')} />
        <TarjetaClima destino={d} />
      </View>
      <View style={g.bloque}>
        <TituloDeSeccion titulo={x.t('travel.practical')} />
        <Fila icono="wallet-outline" titulo={x.t('travel.estimatedBudget')} subtitulo={x.t('travel.budgetEstimateText', { total: x.dinero(d.presupuestoDia * d.duracion, 'USD'), contador: d.duracion })} />
        <Fila icono="time-outline" titulo={x.t('travel.recommendedDuration')} subtitulo={x.t('travel.daysCount', { contador: d.duracion })} />
        <Fila icono="bus-outline" titulo={x.t('travel.localTransport')} subtitulo={x.t(d.transporte)} />
        <Fila icono="shield-checkmark-outline" titulo={x.t('travel.safety')} subtitulo={x.t(NIVEL_DE_SEGURIDAD[d.seguridad - 1])} />
        <Fila icono="people-outline" titulo={x.t('travel.culture')} subtitulo={x.t('travel.cultureText', { lugar: nombre })} />
        <Fila icono="document-text-outline" titulo={x.t('travel.entryRequirements')} subtitulo={x.t('travel.entryText')} />
        <AvisoDemo texto={x.t('travel.demoPracticalNote')} />
      </View>
      {parecidos.length > 0 && (
        <View style={g.bloque}>
          <TituloDeSeccion titulo={x.t('travel.recommendedPlaces')} />
          <View style={g.rejilla}>{parecidos.map((o) => <View key={o.id} style={g.celda}><TarjetaDestino destino={o} compacta onPress={() => ir('destino', o.id)} /></View>)}</View>
        </View>
      )}
      <Tarjeta>
        <TituloDeSeccion titulo={x.t('travel.communityExperiences')} subtitulo={x.t('travel.communityExperiencesSub', { lugar: nombre })} />
        <Boton texto={x.t('travel.seeCommunity')} icono="people-outline" variante="suave" onPress={() => ir('comunidad', d.id)} />
      </Tarjeta>
      <HojaInferior visible={hojaViaje} onCerrar={() => { setHojaViaje(false); setAnadido(null); }} titulo={x.t('travel.addToTrip')}>
        {viajes.map((v) => (
          <Fila key={v.id} icono={v.destinos.includes(d.id) ? 'checkmark-circle' : 'briefcase-outline'} titulo={x.nombreDeViaje(v)} subtitulo={anadido === v.id ? x.t('travel.addedToTrip') : x.fechasDeViaje(v)} onPress={() => anadirA(v.id)} />
        ))}
        <Boton texto={x.t('travel.newTripWith', { lugar: nombre })} icono="add" onPress={() => { setHojaViaje(false); ir('crear', d.id); }} />
      </HojaInferior>
    </MarcoDeTravel>
  );
};

/* ── Sorpréndeme ────────────────────────────────────────────────────────── */

type Respuestas = { dias?: string; presupuesto?: string; clima?: string; experiencia?: string; con?: string; distancia?: string };
const PREGUNTAS: { id: keyof Respuestas; titulo: string; opciones: { id: string; icono: string; texto: string }[] }[] = [
  { id: 'dias', titulo: 'travel.sqDays', opciones: [{ id: 'corto', icono: 'time-outline', texto: 'travel.saShort' }, { id: 'semana', icono: 'calendar-outline', texto: 'travel.saWeek' }, { id: 'largo', icono: 'calendar-number-outline', texto: 'travel.saLong' }] },
  { id: 'presupuesto', titulo: 'travel.sqBudget', opciones: [{ id: 'bajo', icono: 'wallet-outline', texto: 'travel.budgetLow' }, { id: 'medio', icono: 'cash-outline', texto: 'travel.budgetMid' }, { id: 'alto', icono: 'diamond-outline', texto: 'travel.budgetHigh' }] },
  { id: 'clima', titulo: 'travel.sqClimate', opciones: [{ id: 'calido', icono: 'sunny-outline', texto: 'travel.climateWarm' }, { id: 'templado', icono: 'partly-sunny-outline', texto: 'travel.climateMild' }, { id: 'frio', icono: 'snow-outline', texto: 'travel.climateCold' }] },
  { id: 'experiencia', titulo: 'travel.sqExperience', opciones: [{ id: 'naturaleza', icono: 'leaf-outline', texto: 'travel.catNature' }, { id: 'cultura', icono: 'library-outline', texto: 'travel.catCulture' }, { id: 'gastronomia', icono: 'restaurant-outline', texto: 'travel.catFood' }, { id: 'playas', icono: 'umbrella-outline', texto: 'travel.catBeaches' }, { id: 'aventura', icono: 'flag-outline', texto: 'travel.catAdventure' }] },
  { id: 'con', titulo: 'travel.sqWith', opciones: [{ id: 'solo', icono: 'person-outline', texto: 'travel.saSolo' }, { id: 'pareja', icono: 'heart-outline', texto: 'travel.saCouple' }, { id: 'familia', icono: 'people-outline', texto: 'travel.saFamily' }, { id: 'amigos', icono: 'beer-outline', texto: 'travel.saFriends' }] },
  { id: 'distancia', titulo: 'travel.sqDistance', opciones: [{ id: 'cerca', icono: 'navigate-outline', texto: 'travel.distNear' }, { id: 'media', icono: 'earth-outline', texto: 'travel.distMid' }, { id: 'lejos', icono: 'globe-outline', texto: 'travel.distFar' }] },
];
const NO_SE = 'nose';

const puntuar = (d: DestinoDemo, r: Respuestas): { puntos: number; razones: string[] } => {
  const razones: string[] = [];
  let puntos = 0; let posibles = 0;
  const sumar = (vale: boolean, razon: string) => { posibles++; if (vale) { puntos++; razones.push(razon); } };
  if (r.presupuesto && r.presupuesto !== NO_SE) sumar(r.presupuesto === 'bajo' ? d.presupuestoDia <= 70 : r.presupuesto === 'medio' ? d.presupuestoDia <= 140 : d.presupuestoDia >= 100, 'travel.whyBudget');
  if (r.clima && r.clima !== NO_SE) sumar(d.clima === (r.clima as Clima), 'travel.whyClimate');
  if (r.experiencia && r.experiencia !== NO_SE) sumar(d.categorias.includes(r.experiencia as never), 'travel.whyExperience');
  if (r.dias && r.dias !== NO_SE) sumar(r.dias === 'corto' ? d.duracion <= 4 : r.dias === 'semana' ? d.duracion >= 4 && d.duracion <= 6 : d.duracion >= 6, 'travel.whyDuration');
  if (r.distancia && r.distancia !== NO_SE) sumar(d.distancia === r.distancia, 'travel.whyDistance');
  if (r.con && r.con !== NO_SE) sumar(r.con === 'familia' ? d.seguridad >= 4 : r.con === 'pareja' ? d.categorias.some((c) => c === 'playas' || c === 'gastronomia') : true, 'travel.whyCompany');
  return { puntos: posibles ? puntos / posibles : 0.5, razones: razones.length ? razones : ['travel.whyOpen'] };
};

export const SorpresaScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir, preguntarABrain } = useTravelNav();
  const [paso, setPaso] = useState(0);
  const [r, setR] = useState<Respuestas>({});
  const terminado = paso >= PREGUNTAS.length;
  const q = PREGUNTAS[Math.min(paso, PREGUNTAS.length - 1)];
  const elegir = (v: string) => { setR({ ...r, [q.id]: v }); setPaso(paso + 1); };
  const resultados = DESTINOS.map((d) => ({ d, ...puntuar(d, r) })).sort((a, b) => b.puntos - a.puntos).slice(0, 3);
  return (
    <MarcoDeTravel titulo={x.t('travel.surpriseTitle')} subtitulo={x.t('travel.surpriseSub')} icono="shuffle-outline" demo contextoBrain={x.t('travel.brainCtxSurprise')}>
      {!terminado ? (
        <Tarjeta>
          <Text style={g.paso}>{x.t('travel.stepOf', { n: paso + 1, total: PREGUNTAS.length })}</Text>
          <View style={g.barra}><View style={[g.barraRelleno, { width: `${((paso + 1) / PREGUNTAS.length) * 100}%` }]} /></View>
          <Text style={g.pregunta}>{x.t(q.titulo)}</Text>
          <View style={g.opciones}>
            {q.opciones.map((o) => (
              <TouchableOpacity key={o.id} style={[g.opcion, r[q.id] === o.id && g.opcionActiva]} onPress={() => elegir(o.id)} accessibilityRole="button">
                <Ionicons name={o.icono as Icono} size={26} color={TRAVEL.morado} />
                <Text style={g.opcionTexto} numberOfLines={2}>{x.t(o.texto)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={g.opcion} onPress={() => elegir(NO_SE)} accessibilityRole="button">
              <Ionicons name="help-circle-outline" size={26} color={TRAVEL.gris} />
              <Text style={g.opcionTexto}>{x.t('travel.dontKnow')}</Text>
            </TouchableOpacity>
          </View>
          {paso > 0 && <Boton texto={x.t('common.back')} variante="linea" pequeno onPress={() => setPaso(paso - 1)} />}
        </Tarjeta>
      ) : (
        <View style={g.bloque}>
          <TituloDeSeccion titulo={x.t('travel.surpriseResults')} subtitulo={x.t('travel.surpriseResultsSub')} />
          {resultados.map((res) => <TarjetaRecomendacion key={res.d.id} destino={res.d} razones={res.razones} puntuacion={res.puntos} onPress={() => ir('destino', res.d.id)} />)}
          <Boton texto={x.t('travel.compareThese')} icono="git-compare-outline" variante="suave" onPress={() => ir('comparar', resultados.map((res) => res.d.id).join(','))} />
          <Boton texto={x.t('travel.planWithBrain')} icono="sparkles" variante="dorado" onPress={() => preguntarABrain(x.t('travel.brainCtxSurpriseResult', { lugares: x.formato.lista(resultados.map((res) => x.nombreDestino(res.d)), 'disjunction') }))} />
          <Boton texto={x.t('travel.startOver')} icono="refresh" variante="linea" onPress={() => { setR({}); setPaso(0); }} />
        </View>
      )}
    </MarcoDeTravel>
  );
};

/* ── Comparar destinos ──────────────────────────────────────────────────── */

export const CompararScreen: React.FC<{ id?: string }> = ({ id = '' }) => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const [ids, setIds] = useState<string[]>(() => id.split(',').filter((v) => !!destinoPorId(v)).slice(0, 3));
  const lista = ids.map((v) => destinoPorId(v)).filter((v): v is DestinoDemo => !!v);
  const alternar = (v: string) => setIds(ids.includes(v) ? ids.filter((k) => k !== v) : [...ids, v].slice(-3));
  const filas: { titulo: string; icono: string; valor: (d: DestinoDemo) => string }[] = [
    { titulo: 'travel.budgetPerDay', icono: 'wallet-outline', valor: (d) => x.dinero(d.presupuestoDia, 'USD') },
    { titulo: 'travel.climate', icono: 'partly-sunny-outline', valor: (d) => x.temperatura(d.temperatura) },
    { titulo: 'travel.activities', icono: 'ticket-outline', valor: (d) => x.formato.lista(d.categorias.slice(0, 3).map((c) => x.t(CATEGORIAS.find((k) => k.id === c)?.titulo ?? ''))) },
    { titulo: 'travel.food', icono: 'restaurant-outline', valor: (d) => x.t(d.comida[0]) },
    { titulo: 'travel.culture', icono: 'library-outline', valor: (d) => x.t(d.atracciones[0]) },
    { titulo: 'travel.safety', icono: 'shield-checkmark-outline', valor: (d) => x.t(NIVEL_DE_SEGURIDAD[d.seguridad - 1]) },
    { titulo: 'travel.bestSeason', icono: 'calendar-outline', valor: (d) => x.meses(d.mejoresMeses.slice(0, 3)) },
    { titulo: 'travel.distance', icono: 'navigate-outline', valor: (d) => x.t(CLAVE_DISTANCIA[d.distancia]) },
    { titulo: 'travel.recommendedDuration', icono: 'time-outline', valor: (d) => x.t('travel.daysCount', { contador: d.duracion }) },
  ];
  return (
    <MarcoDeTravel titulo={x.t('travel.compareTitle')} subtitulo={x.t('travel.compareSub')} icono="git-compare-outline" demo contextoBrain={x.t('travel.brainCtxCompare', { lugares: x.formato.lista(lista.map((d) => x.nombreDestino(d)), 'disjunction') })}>
      <View style={g.chips}>{DESTINOS.map((d) => <Chip key={d.id} texto={x.nombreDestino(d)} activo={ids.includes(d.id)} onPress={() => alternar(d.id)} />)}</View>
      {lista.length < 2 ? (
        <EstadoVacio icono="git-compare-outline" titulo={x.t('travel.compareEmpty')} texto={x.t('travel.compareEmptyText')} />
      ) : (
        <View style={g.bloque}>
          <View style={g.cabeceraComp}>
            {lista.map((d) => (
              <TouchableOpacity key={d.id} style={g.colComp} onPress={() => ir('destino', d.id)} accessibilityRole="button">
                <Fotografia foto={d.foto} icono={d.icono} estilo={g.fotoComp} tamanoIcono={22} />
                <Text style={g.nombreComp} numberOfLines={1}>{x.nombreDestino(d)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {filas.map((f) => (
            <View key={f.titulo} style={g.filaComp}>
              <View style={g.fila}><Ionicons name={f.icono as Icono} size={15} color={TRAVEL.morado} /><Text style={g.tituloComp}>{x.t(f.titulo)}</Text></View>
              <View style={g.cabeceraComp}>{lista.map((d) => <Text key={d.id} style={g.valorComp}>{f.valor(d)}</Text>)}</View>
            </View>
          ))}
          <View style={g.fila}><SelloDemo /><Text style={g.nota}>{x.t('travel.demoCompareNote')}</Text></View>
        </View>
      )}
    </MarcoDeTravel>
  );
};

const g = StyleSheet.create({
  bloque: { gap: 12 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  hero: { height: 230, borderRadius: 24, justifyContent: 'flex-end' },
  heroPie: { padding: 16, gap: 4 },
  heroNombre: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  heroPais: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  accion: { width: '33.33%', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  accionIcono: { width: 46, height: 46, borderRadius: 16, backgroundColor: TRAVEL.lilaSuave, alignItems: 'center', justifyContent: 'center' },
  accionTexto: { fontSize: 12, fontWeight: '600', color: TRAVEL.tinta, textAlign: 'center' },
  parrafo: { fontSize: 14, lineHeight: 21, color: TRAVEL.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  celda: { width: '50%', padding: 6 },
  paso: { fontSize: 12, fontWeight: '800', color: TRAVEL.morado },
  barra: { height: 6, borderRadius: 3, backgroundColor: TRAVEL.lilaSuave, overflow: 'hidden' },
  barraRelleno: { height: 6, backgroundColor: TRAVEL.morado },
  pregunta: { fontSize: 20, fontWeight: '800', color: TRAVEL.tinta },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  opcion: { width: '47%', flexGrow: 1, minHeight: 96, borderRadius: 18, borderWidth: 1, borderColor: TRAVEL.borde, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 },
  opcionActiva: { borderColor: TRAVEL.morado, backgroundColor: TRAVEL.lilaSuave },
  opcionTexto: { fontSize: 14, fontWeight: '700', color: TRAVEL.tinta, textAlign: 'center' },
  cabeceraComp: { flexDirection: 'row', gap: 8 },
  colComp: { flex: 1, alignItems: 'center', gap: 6 },
  fotoComp: { width: '100%', height: 84, borderRadius: 14 },
  nombreComp: { fontSize: 14, fontWeight: '800', color: TRAVEL.tinta },
  filaComp: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: TRAVEL.borde, gap: 6 },
  tituloComp: { fontSize: 13, fontWeight: '800', color: TRAVEL.texto },
  valorComp: { flex: 1, fontSize: 13, color: TRAVEL.tinta, textAlign: 'center' },
  nota: { flex: 1, fontSize: 12, color: TRAVEL.gris },
});
