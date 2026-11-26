import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { Boton, Campo, EstadoVacio, Fila, Fotografia, Pestanas, Tarjeta, TituloDeSeccion } from '../../components/travel/Piezas';
import { PerfilViajero, TarjetaPresupuesto, TarjetaViaje, VistaMapa } from '../../components/travel/Tarjetas';
import { DialogoConfirmacionIA } from '../../components/travel/Brain';
import { SelectorFecha } from '../../components/travel/Selectores';
import { TRAVEL } from '../../components/travel/tema';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { LUGARES, PERMISOS, TIPOS_DE_RESERVA, destinoPorId } from '../../constants/travelDemo';
import { EstadoDeViaje, estadoDe, fechaDeIso } from '../../utils/travelItinerario';
import { useTravelNav } from './rutas';

/*
 * 3 · MIS VIAJES — la lista por estados, el detalle de un viaje y el calendario. Datos DEMO guardados en el teléfono.
 */

const isoDe = (f: Date) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

export const ViajesScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { viajes } = useTravelDemo();
  const [pestana, setPestana] = useState<EstadoDeViaje | 'compartidos'>('proximo');
  const de = (e: EstadoDeViaje) => viajes.filter((v) => estadoDe(v) === e);
  const lista = pestana === 'compartidos' ? viajes.filter((v) => v.compartido) : de(pestana);
  const VACIO: Record<string, string> = { proximo: 'travel.emptyUpcoming', activo: 'travel.emptyActive', pasado: 'travel.emptyPast', borrador: 'travel.emptyDrafts', compartidos: 'travel.emptyShared' };
  return (
    <MarcoDeTravel titulo={x.t('travel.modTrips')} subtitulo={x.t('travel.tripsSub')} icono="briefcase-outline" demo contextoBrain={x.t('travel.brainCtxTrips')}>
      <Pestanas
        activa={pestana}
        onCambiar={(v) => setPestana(v as typeof pestana)}
        opciones={[
          { id: 'proximo', texto: x.t('travel.tabUpcoming'), contador: de('proximo').length },
          { id: 'activo', texto: x.t('travel.tabActive'), contador: de('activo').length },
          { id: 'pasado', texto: x.t('travel.tabPast'), contador: de('pasado').length },
          { id: 'borrador', texto: x.t('travel.tabDrafts'), contador: de('borrador').length },
          { id: 'compartidos', texto: x.t('travel.tabShared'), contador: viajes.filter((v) => v.compartido).length },
        ]}
      />
      {lista.length === 0 ? (
        <EstadoVacio icono="briefcase-outline" titulo={x.t(VACIO[pestana])} texto={x.t('travel.noTripsText')} cta={x.t('travel.createTrip')} onCta={() => ir('crear')} />
      ) : (
        <View style={v.lista}>{lista.map((viaje) => <TarjetaViaje key={viaje.id} viaje={viaje} onPress={() => ir('viaje', viaje.id)} />)}</View>
      )}
      <Boton texto={x.t('travel.createTrip')} icono="add" onPress={() => ir('crear')} />
      <Fila icono="calendar-outline" titulo={x.t('travel.calendar')} subtitulo={x.t('travel.calendarSub')} onPress={() => ir('calendario')} />
    </MarcoDeTravel>
  );
};

export const ViajeScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { ir, volver } = useTravelNav();
  const { viajePorId, cambiarViaje, borrarViaje, elegirViajeActivo, viajeActivo } = useTravelDemo();
  const [borrar, setBorrar] = useState(false);
  const viaje = viajePorId(id);
  if (!viaje) return <MarcoDeTravel titulo={x.t('travel.modTrips')} sinBrain><EstadoVacio icono="alert-circle-outline" titulo={x.t('travel.notFound')} cta={x.t('travel.modTrips')} onCta={() => ir('viajes')} /></MarcoDeTravel>;
  const dest = destinoPorId(viaje.destinos[0]);
  const gastado = viaje.gastos.reduce((s, g) => s + g.monto, 0);
  const transporte = viaje.reservas.filter((r) => ['vuelo', 'tren', 'bus', 'alquiler'].includes(r.tipo));
  const actividades = viaje.itinerario.reduce((s, d) => s + d.actividades.filter((a) => a.tipo === 'visita').length, 0);
  return (
    <MarcoDeTravel titulo={x.nombreDeViaje(viaje)} subtitulo={x.fechasDeViaje(viaje)} demo contextoBrain={x.t('travel.brainCtxTrip', { viaje: x.nombreDeViaje(viaje), fechas: x.fechasDeViaje(viaje) })}>
      <Fotografia foto={dest?.foto} icono={dest?.icono ?? 'airplane-outline'} estilo={v.hero} tamanoIcono={50}>
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(10,6,30,0.7)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={v.heroPie}>
          <Text style={v.heroTitulo} numberOfLines={2}>{x.nombreDeViaje(viaje)}</Text>
          <Text style={v.heroSub}>{x.fechasDeViaje(viaje)} · {x.t('travel.travelersCount', { contador: viaje.adultos + viaje.ninos })}</Text>
        </View>
      </Fotografia>
      <View style={v.acciones}>
        <Boton texto={x.t('travel.openItinerary')} icono="map-outline" pequeno onPress={() => ir('itinerario', viaje.id)} />
        <Boton texto={viajeActivo === viaje.id ? x.t('travel.activeContext') : x.t('travel.useAsContext')} icono={viajeActivo === viaje.id ? 'checkmark' : 'radio-button-off'} variante="suave" pequeno onPress={() => elegirViajeActivo(viaje.id)} />
        <Boton texto={x.t('travel.shareTrip')} icono="people-outline" variante="suave" pequeno onPress={() => ir('compartir', viaje.id)} />
      </View>
      <View style={v.bloque}>
        <TituloDeSeccion titulo={x.t('travel.participants')} onVerTodo={() => ir('compartir', viaje.id)} />
        <PerfilViajero nombre={x.t('travel.you')} detalle={x.t('travel.owner')} />
        {viaje.participantes.map((p) => <PerfilViajero key={p.id} nombre={p.nombre} detalle={x.t(PERMISOS[p.permiso])} pendiente={p.pendiente} />)}
      </View>
      <View style={v.bloque}>
        <TituloDeSeccion titulo={x.t('travel.map')} />
        <VistaMapa lugares={LUGARES.slice(0, 6)} alto={170} />
        <Fila icono="navigate-outline" titulo={x.t('travel.modExplore')} subtitulo={x.t('travel.exploreFromTrip')} onPress={() => ir('explorar')} />
      </View>
      <TarjetaPresupuesto gastado={gastado} total={viaje.presupuesto} moneda={viaje.moneda} />
      <View style={v.bloque}>
        <TituloDeSeccion titulo={x.t('travel.organize')} />
        <Fila icono="calendar-outline" titulo={x.t('travel.itinerary')} subtitulo={x.t('travel.activitiesCount', { contador: actividades })} onPress={() => ir('itinerario', viaje.id)} />
        <Fila icono="receipt-outline" titulo={x.t('travel.expenses')} subtitulo={x.t('travel.expensesCount', { contador: viaje.gastos.length })} onPress={() => ir('gastos', viaje.id)} />
        <Fila icono="bookmarks-outline" titulo={x.t('travel.bookings')} subtitulo={x.t('travel.bookingsCount', { contador: viaje.reservas.length })} onPress={() => ir('reservas', viaje.id)} />
        <Fila icono="folder-open-outline" titulo={x.t('travel.documents')} subtitulo={x.t('travel.documentsCount', { contador: viaje.documentos.length })} onPress={() => ir('documentos', viaje.id)} />
        <Fila icono="wallet-outline" titulo={x.t('travel.budgetPlanner')} onPress={() => ir('presupuesto', viaje.id)} />
      </View>
      <View style={v.bloque}>
        <TituloDeSeccion titulo={x.t('travel.transportInfo')} />
        {transporte.length === 0
          ? <Text style={v.nota}>{x.t('travel.noTransport')}</Text>
          : transporte.map((r) => <Fila key={r.id} icono={TIPOS_DE_RESERVA.find((k) => k.id === r.tipo)?.icono ?? 'bus-outline'} titulo={r.proveedor} subtitulo={`${x.fecha(r.fecha)} · ${r.confirmacion}`} onPress={() => ir('reservas', viaje.id)} />)}
      </View>
      <Tarjeta>
        <Campo etiqueta={x.t('travel.notes')} valor={viaje.notas} onCambiar={(notas) => cambiarViaje(viaje.id, (o) => ({ ...o, notas }))} multilinea placeholder={x.t('travel.notesPh')} />
      </Tarjeta>
      <Boton texto={x.t('travel.deleteTrip')} icono="trash-outline" variante="peligro" onPress={() => setBorrar(true)} />
      <DialogoConfirmacionIA visible={borrar} peligro titulo={x.t('travel.deleteTripQ')} texto={x.t('travel.deleteTripText')} confirmar={x.t('travel.delete')} onCancelar={() => setBorrar(false)} onConfirmar={() => { setBorrar(false); borrarViaje(viaje.id); volver(); }} />
    </MarcoDeTravel>
  );
};

export const CalendarioScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { viajes } = useTravelDemo();
  const [fecha, setFecha] = useState(isoDe(new Date()));
  const conFechas = viajes.filter((vj) => !!vj.inicio);
  const marcados = conFechas.flatMap((vj) => Array.from({ length: vj.dias }, (_, i) => isoDe(fechaDeIso(vj.inicio, i))));
  const delDia = conFechas.filter((vj) => { const f = fechaDeIso(fecha); return f >= fechaDeIso(vj.inicio) && f <= fechaDeIso(vj.inicio, vj.dias - 1); });
  return (
    <MarcoDeTravel titulo={x.t('travel.calendar')} subtitulo={x.t('travel.calendarSub')} icono="calendar-outline" demo sinBrain>
      <SelectorFecha valor={fecha} onCambiar={setFecha} resaltados={marcados} />
      <TituloDeSeccion titulo={x.fecha(fecha, 0, { weekday: 'long', day: 'numeric', month: 'long' })} />
      {delDia.length === 0
        ? <EstadoVacio icono="sunny-outline" titulo={x.t('travel.noTripThatDay')} cta={x.t('travel.createTrip')} onCta={() => ir('crear')} />
        : delDia.map((vj) => {
          const n = Math.round((fechaDeIso(fecha).getTime() - fechaDeIso(vj.inicio).getTime()) / 86400000);
          const dia = vj.itinerario[n];
          return (
            <View key={vj.id} style={v.bloque}>
              <Fila icono="briefcase-outline" titulo={x.nombreDeViaje(vj)} subtitulo={x.t('travel.dayN', { n: n + 1 })} onPress={() => ir('itinerario', vj.id)} />
              {dia?.actividades.map((a) => <Fila key={a.id} icono="time-outline" titulo={x.actividad(a)} subtitulo={x.hora(a.inicio)} />)}
            </View>
          );
        })}
    </MarcoDeTravel>
  );
};

const v = StyleSheet.create({
  lista: { gap: 14 },
  bloque: { gap: 10 },
  hero: { height: 200, borderRadius: 24, justifyContent: 'flex-end' },
  heroPie: { padding: 16, gap: 4 },
  heroTitulo: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  heroSub: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nota: { fontSize: 13, color: TRAVEL.gris },
});
