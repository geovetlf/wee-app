import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Interruptor from '../../components/Interruptor';
import { Ionicons } from '@expo/vector-icons';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { AvisoDemo, Boton, Campo, Chip, Contador, EstadoVacio, Fila, Tarjeta, TituloDeSeccion } from '../../components/travel/Piezas';
import { TarjetaViaje } from '../../components/travel/Tarjetas';
import { SugerenciaIA } from '../../components/travel/Brain';
import { SelectorFecha, SelectorMoneda, SelectorPais } from '../../components/travel/Selectores';
import { TRAVEL } from '../../components/travel/tema';
import { useDireccion } from '../../hooks/useDireccion';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import {
  DESTINOS, ESPECIALES, ESTILOS, EstiloDeViaje, MOVILIDAD, NIVELES_DE_PRESUPUESTO, PREFERENCIAS, ViajeDemo, destinoPorId,
} from '../../constants/travelDemo';
import { estadoDe, generarItinerario, isoDeHoyMas, nuevoId } from '../../utils/travelItinerario';
import { useTravelNav } from './rutas';

/*
 * 2 · PLANEAR — portada, el asistente de creación en ocho pasos y la pantalla de «planificando». El itinerario que sale
 * de aquí es un EJEMPLO armado en el teléfono (utils/travelItinerario.ts) y lo dice; planear de verdad es abrir la
 * conversación con Weë Brain, que está a un toque en cada paso.
 */

type Icono = React.ComponentProps<typeof Ionicons>['name'];

export const PlanearScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const dir = useDireccion();
  const { ir } = useTravelNav();
  const { viajes, viajeActivoDatos } = useTravelDemo();
  const conItinerario = viajes.filter((v) => estadoDe(v) !== 'pasado');
  const foco = viajeActivoDatos ?? conItinerario[0];
  return (
    <MarcoDeTravel titulo={x.t('travel.modPlan')} subtitulo={x.t('travel.planSub')} icono="trail-sign-outline" demo contextoBrain={x.t('travel.brainCtxPlan')}>
      <Tarjeta estilo={{ backgroundColor: TRAVEL.lilaSuave, borderColor: TRAVEL.lila }}>
        <Text style={n.grande}>{x.t('travel.createTripTitle')}</Text>
        <Text style={n.texto}>{x.t('travel.createTripText')}</Text>
        <Boton texto={x.t('travel.createTrip')} icono="add" onPress={() => ir('crear')} />
      </Tarjeta>
      <View style={n.bloque}>
        <TituloDeSeccion titulo={x.t('travel.yourItineraries')} onVerTodo={() => ir('viajes')} />
        {conItinerario.length === 0 ? (
          <EstadoVacio icono="map-outline" titulo={x.t('travel.noTripsTitle')} texto={x.t('travel.noTripsText')} cta={x.t('travel.createFirstTrip')} onCta={() => ir('crear')} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[n.carril, dir.contenedor]}>
            {conItinerario.map((v) => <TarjetaViaje key={v.id} viaje={v} ancho={230} onPress={() => ir('itinerario', v.id)} />)}
          </ScrollView>
        )}
      </View>
      {!!foco && (
        <View style={n.bloque}>
          <TituloDeSeccion titulo={x.t('travel.planTools')} subtitulo={x.t('travel.planToolsSub', { viaje: x.nombreDeViaje(foco) })} />
          <Fila icono="create-outline" titulo={x.t('travel.editItinerary')} subtitulo={x.t('travel.editItinerarySub')} onPress={() => ir('editor', foco.id)} />
          <Fila icono="sparkles-outline" titulo={x.t('travel.smartReplan')} subtitulo={x.t('travel.smartReplanSub')} onPress={() => ir('replanear', foco.id)} />
          <Fila icono="wallet-outline" titulo={x.t('travel.budgetPlanner')} subtitulo={x.t('travel.budgetPlannerSub')} onPress={() => ir('presupuesto', foco.id)} />
          <Fila icono="git-compare-outline" titulo={x.t('travel.versions')} subtitulo={x.t('travel.versionsSub')} onPress={() => ir('versiones', foco.id)} />
        </View>
      )}
      <SugerenciaIA demo icono="bulb-outline" titulo={x.t('travel.tipSeasonTitle')} texto={x.t('travel.tipSeasonText')} accion={x.t('travel.surpriseCta')} onAccion={() => ir('sorpresa')} />
    </MarcoDeTravel>
  );
};

/* ── Crear un viaje: ocho pasos ─────────────────────────────────────────── */

const PASOS = ['travel.wzDestination', 'travel.wzDates', 'travel.wzTravelers', 'travel.wzBudget', 'travel.wzStyle', 'travel.wzPreferences', 'travel.wzMobility', 'travel.wzSpecial'];

const Opcion: React.FC<{ icono: string; texto: string; activo: boolean; onPress: () => void }> = ({ icono, texto, activo, onPress }) => (
  <TouchableOpacity style={[n.opcion, activo && n.opcionActiva]} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: activo }}>
    <Ionicons name={icono as Icono} size={22} color={activo ? TRAVEL.morado : TRAVEL.texto} />
    <Text style={[n.opcionTexto, activo && { color: TRAVEL.morado }]} numberOfLines={2}>{texto}</Text>
  </TouchableOpacity>
);

export const CrearViajeScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { ir, preguntarABrain } = useTravelNav();
  const { crearViaje } = useTravelDemo();
  const [paso, setPaso] = useState(0);
  const [modo, setModo] = useState<'uno' | 'varios' | 'nose'>('uno');
  const [destinos, setDestinos] = useState<string[]>(id && destinoPorId(id) ? [id] : []);
  const [inicio, setInicio] = useState(isoDeHoyMas(30));
  const [dias, setDias] = useState(5);
  const [flexible, setFlexible] = useState(false);
  const [adultos, setAdultos] = useState(2);
  const [ninos, setNinos] = useState(0);
  const [edades, setEdades] = useState<number[]>([]);
  const [nivel, setNivel] = useState<'bajo' | 'medio' | 'alto' | 'propio'>('medio');
  const [propio, setPropio] = useState('');
  const [moneda, setMoneda] = useState('USD');
  const [estilos, setEstilos] = useState<EstiloDeViaje[]>([]);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [mov, setMov] = useState<string[]>(['caminar']);
  const [esp, setEsp] = useState<string[]>([]);
  const [otro, setOtro] = useState('');
  const alt = <T,>(lista: T[], v: T, poner: (l: T[]) => void) => poner(lista.includes(v) ? lista.filter((k) => k !== v) : [...lista, v]);
  const cambiarNinos = (n: number) => { setNinos(n); setEdades((e) => Array.from({ length: n }, (_, i) => e[i] ?? 8)); };
  const personas = adultos + ninos;
  const porDia = NIVELES_DE_PRESUPUESTO.find((k) => k.id === nivel)?.porDia ?? 0;
  const presupuesto = nivel === 'propio' ? Number(propio.replace(/[^\d]/g, '')) || 0 : porDia * dias * Math.max(1, personas);
  const puedeSeguir = paso !== 0 || modo === 'nose' || destinos.length > 0;

  const crear = () => {
    const lista = modo === 'nose' ? [] : destinos;
    const v: ViajeDemo = {
      id: nuevoId('viaje'), destinos: lista.length ? lista : ['lisboa'], inicio: flexible ? '' : inicio, dias, flexible, borrador: flexible, compartido: false,
      adultos, ninos, edades, presupuesto, moneda, estilos, preferencias: prefs, movilidad: mov, especiales: otro.trim() ? [...esp, otro.trim()] : esp,
      itinerario: generarItinerario(lista.length ? lista : ['lisboa'], dias, nivel === 'alto' ? 1.6 : nivel === 'bajo' ? 0.7 : 1),
      versiones: [], gastos: [], reservas: [], documentos: [], participantes: [], propuestas: [], notas: '',
      reparto: { alojamiento: Math.round(presupuesto * 0.38), comida: Math.round(presupuesto * 0.22), transporte: Math.round(presupuesto * 0.14), actividades: Math.round(presupuesto * 0.16), compras: Math.round(presupuesto * 0.06), otros: Math.round(presupuesto * 0.04) },
    };
    crearViaje(v);
    ir('generar', v.id);
  };

  const resumen = () => x.t('travel.brainCtxNewTrip', {
    lugares: modo === 'nose' || !destinos.length ? x.t('travel.undecided') : x.formato.lista(destinos.map((d) => x.nombreDestino(destinoPorId(d)))),
    dias: x.t('travel.daysCount', { contador: dias }),
    personas: x.t('travel.travelersCount', { contador: personas }),
  });

  return (
    <MarcoDeTravel titulo={x.t('travel.createTrip')} subtitulo={x.t(PASOS[paso])} icono="add-circle-outline" demo contextoBrain={resumen()}>
      <View style={n.pasos} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: PASOS.length, now: paso + 1 }}>
        {PASOS.map((p, i) => <View key={p} style={[n.punto, i <= paso && n.puntoActivo]} />)}
      </View>
      <Text style={n.paso}>{x.t('travel.stepOf', { n: paso + 1, total: PASOS.length })}</Text>
      <Tarjeta>
        {paso === 0 && (
          <>
            <Text style={n.pregunta}>{x.t('travel.wzDestinationQ')}</Text>
            <View style={n.fila}>
              <Chip texto={x.t('travel.wzOne')} activo={modo === 'uno'} onPress={() => { setModo('uno'); setDestinos(destinos.slice(0, 1)); }} />
              <Chip texto={x.t('travel.wzSeveral')} activo={modo === 'varios'} onPress={() => setModo('varios')} />
              <Chip texto={x.t('travel.dontKnow')} icono="help-circle-outline" activo={modo === 'nose'} onPress={() => { setModo('nose'); setDestinos([]); }} />
            </View>
            {modo === 'nose' ? (
              <SugerenciaIA titulo={x.t('travel.wzUndecidedTitle')} texto={x.t('travel.wzUndecidedText')} accion={x.t('travel.surpriseCta')} onAccion={() => ir('sorpresa')} />
            ) : (
              <View style={n.fila}>
                {modo === 'varios' && (
                  <SelectorPais
                    codigos={[...new Set(DESTINOS.map((d) => d.pais))]}
                    elegidos={[...new Set(destinos.map((id2) => destinoPorId(id2)?.pais).filter((c): c is string => !!c))]}
                    onAlternar={(c) => {
                      const delPais = DESTINOS.filter((d) => d.pais === c).map((d) => d.id);
                      setDestinos(delPais.every((id2) => destinos.includes(id2)) ? destinos.filter((id2) => !delPais.includes(id2)) : [...new Set([...destinos, ...delPais])]);
                    }}
                  />
                )}
                {modo === 'uno' && DESTINOS.map((d) => (
                  <Chip key={d.id} texto={`${x.nombreDestino(d)} · ${x.pais(d.pais)}`} activo={destinos.includes(d.id)} onPress={() => setDestinos([d.id])} />
                ))}
              </View>
            )}
          </>
        )}
        {paso === 1 && (
          <>
            <View style={n.filaEntre}>
              <Text style={n.pregunta}>{x.t('travel.wzFlexible')}</Text>
              <Interruptor value={flexible} onValueChange={setFlexible} trackColor={{ true: TRAVEL.morado, false: TRAVEL.borde }} accessibilityLabel={x.t('travel.wzFlexible')} />
            </View>
            {!flexible && <SelectorFecha valor={inicio} onCambiar={setInicio} />}
            <Contador etiqueta={x.t('travel.wzDays')} valor={dias} onCambiar={setDias} min={1} max={21} />
          </>
        )}
        {paso === 2 && (
          <>
            <Contador etiqueta={x.t('travel.adults')} valor={adultos} onCambiar={setAdultos} min={1} max={12} />
            <Contador etiqueta={x.t('travel.children')} valor={ninos} onCambiar={cambiarNinos} min={0} max={8} />
            {edades.map((e, i) => (
              <Contador key={`edad${i}`} etiqueta={x.t('travel.childAge', { n: i + 1 })} valor={e} onCambiar={(v) => setEdades(edades.map((k, j) => (j === i ? v : k)))} min={0} max={17} />
            ))}
          </>
        )}
        {paso === 3 && (
          <>
            <View style={n.fila}>
              {NIVELES_DE_PRESUPUESTO.map((k) => <Chip key={k.id} texto={x.t(k.titulo)} activo={nivel === k.id} onPress={() => setNivel(k.id)} />)}
            </View>
            {nivel === 'propio' && <Campo etiqueta={x.t('travel.customAmount')} valor={propio} onCambiar={setPropio} teclado="numeric" placeholder={x.formato.numero(2000)} />}
            <Text style={n.etiqueta}>{x.t('travel.currency')}</Text>
            <SelectorMoneda valor={moneda} onCambiar={setMoneda} />
            <Text style={n.total}>{x.t('travel.estimatedTotal', { total: x.dinero(presupuesto, moneda) })}</Text>
          </>
        )}
        {paso === 4 && <View style={n.rejilla}>{ESTILOS.map((s) => <Opcion key={s.id} icono={s.icono} texto={x.t(s.titulo)} activo={estilos.includes(s.id)} onPress={() => alt(estilos, s.id, setEstilos)} />)}</View>}
        {paso === 5 && <View style={n.rejilla}>{PREFERENCIAS.map((s) => <Opcion key={s.id} icono={s.icono} texto={x.t(s.titulo)} activo={prefs.includes(s.id)} onPress={() => alt(prefs, s.id, setPrefs)} />)}</View>}
        {paso === 6 && <View style={n.rejilla}>{MOVILIDAD.map((s) => <Opcion key={s.id} icono={s.icono} texto={x.t(s.titulo)} activo={mov.includes(s.id)} onPress={() => alt(mov, s.id, setMov)} />)}</View>}
        {paso === 7 && (
          <>
            <View style={n.rejilla}>{ESPECIALES.map((s) => <Opcion key={s.id} icono={s.icono} texto={x.t(s.titulo)} activo={esp.includes(s.id)} onPress={() => alt(esp, s.id, setEsp)} />)}</View>
            <Campo etiqueta={x.t('travel.otherNeeds')} valor={otro} onCambiar={setOtro} placeholder={x.t('travel.otherNeedsPh')} />
          </>
        )}
      </Tarjeta>
      <View style={n.botones}>
        {paso > 0 && <Boton texto={x.t('common.back')} variante="linea" onPress={() => setPaso(paso - 1)} estilo={n.flex} />}
        {paso < PASOS.length - 1
          ? <Boton texto={x.t('travel.next')} onPress={() => setPaso(paso + 1)} desactivado={!puedeSeguir} estilo={n.flex} />
          : <Boton texto={x.t('travel.createDemoTrip')} icono="checkmark" onPress={crear} estilo={n.flex} />}
      </View>
      <Boton texto={x.t('travel.planWithBrain')} icono="sparkles" variante="dorado" onPress={() => preguntarABrain(resumen())} />
    </MarcoDeTravel>
  );
};

/* ── Planificando (estados DEMO, sin llamadas de IA) ────────────────────── */

const FASES = ['travel.genUnderstanding', 'travel.genPlaces', 'travel.genDays', 'travel.genBudget'];

export const GenerarScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { ir, preguntarABrain } = useTravelNav();
  const { viajePorId } = useTravelDemo();
  const v = viajePorId(id);
  const [fase, setFase] = useState(0);
  useEffect(() => {
    if (fase >= FASES.length) return;
    const h = setTimeout(() => setFase((f) => f + 1), 750);
    return () => clearTimeout(h);
  }, [fase]);
  if (!v) return <MarcoDeTravel titulo={x.t('travel.modPlan')} sinBrain><EstadoVacio icono="alert-circle-outline" titulo={x.t('travel.notFound')} cta={x.t('travel.createTrip')} onCta={() => ir('crear')} /></MarcoDeTravel>;
  const listo = fase >= FASES.length;
  return (
    <MarcoDeTravel titulo={x.t('travel.generatorTitle')} subtitulo={x.nombreDeViaje(v)} icono="sparkles-outline" demo sinBrain>
      <AvisoDemo texto={x.t('travel.demoGeneratorNote')} />
      <Tarjeta>
        {FASES.map((f, i) => (
          <View key={f} style={n.fase}>
            <Ionicons name={i < fase ? 'checkmark-circle' : i === fase ? 'ellipse' : 'ellipse-outline'} size={20} color={i <= fase ? TRAVEL.morado : TRAVEL.borde} />
            <Text style={[n.faseTexto, i > fase && { color: TRAVEL.gris }]}>{x.t(f)}</Text>
          </View>
        ))}
      </Tarjeta>
      {listo && (
        <>
          <Text style={n.grande}>{x.t('travel.generatorReady')}</Text>
          <Text style={n.texto}>{x.t('travel.generatorReadyText', { dias: x.t('travel.daysCount', { contador: v.dias }) })}</Text>
          <Boton texto={x.t('travel.openItinerary')} icono="map-outline" onPress={() => ir('itinerario', v.id)} />
          <Boton texto={x.t('travel.planWithBrain')} icono="sparkles" variante="dorado" onPress={() => preguntarABrain(x.t('travel.brainCtxItinerary', { viaje: x.nombreDeViaje(v), dias: x.t('travel.daysCount', { contador: v.dias }) }))} />
        </>
      )}
    </MarcoDeTravel>
  );
};

const n = StyleSheet.create({
  bloque: { gap: 12 },
  flex: { flex: 1 },
  carril: { gap: 12, paddingVertical: 4, paddingHorizontal: 1 },
  grande: { fontSize: 19, fontWeight: '800', color: TRAVEL.tinta },
  texto: { fontSize: 14, lineHeight: 20, color: TRAVEL.texto },
  pasos: { flexDirection: 'row', gap: 6 },
  punto: { flex: 1, height: 5, borderRadius: 3, backgroundColor: TRAVEL.borde },
  puntoActivo: { backgroundColor: TRAVEL.morado },
  paso: { fontSize: 12, fontWeight: '800', color: TRAVEL.morado },
  pregunta: { fontSize: 17, fontWeight: '800', color: TRAVEL.tinta, flexShrink: 1 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  etiqueta: { fontSize: 13, fontWeight: '800', color: TRAVEL.tinta },
  total: { fontSize: 15, fontWeight: '800', color: TRAVEL.morado },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  opcion: { width: '47%', flexGrow: 1, minHeight: 74, borderRadius: 16, borderWidth: 1, borderColor: TRAVEL.borde, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 },
  opcionActiva: { borderColor: TRAVEL.morado, backgroundColor: TRAVEL.lilaSuave },
  opcionTexto: { fontSize: 13, fontWeight: '700', color: TRAVEL.tinta, textAlign: 'center' },
  botones: { flexDirection: 'row', gap: 10 },
  fase: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  faseTexto: { flex: 1, fontSize: 14, fontWeight: '600', color: TRAVEL.tinta },
});
