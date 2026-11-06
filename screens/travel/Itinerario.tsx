import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { AvisoDemo, Boton, Campo, Chip, EstadoVacio, FilaDeChips, Fila, HojaInferior, Tarjeta, TituloDeSeccion } from '../../components/travel/Piezas';
import { TarjetaActividad, TarjetaDiaItinerario, VistaMapa } from '../../components/travel/Tarjetas';
import { DialogoConfirmacionIA, SugerenciaIA } from '../../components/travel/Brain';
import { SelectorFecha } from '../../components/travel/Selectores';
import CajaDePrompt from '../../components/creator/CajaDePrompt';
import { TRAVEL } from '../../components/travel/tema';
import { useDireccion } from '../../hooks/useDireccion';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { ActividadDemo, DiaDemo, LugarDemo, ViajeDemo, destinoPorId } from '../../constants/travelDemo';
import { PeticionDeReplan, costeDelDia, fechaDeIso, kmTotales, minutosLibres, nuevoId, ordenar, replanificar } from '../../utils/travelItinerario';
import { useTravelNav } from './rutas';

/*
 * 2 · PLANEAR — detalle del itinerario (Día · Lista · Mapa · Calendario), el editor y el replanificador. Todo actúa
 * sobre el itinerario de EJEMPLO guardado en el teléfono. Una actividad bloqueada no la toca nadie: ni el editor
 * masivo ni el replanificador.
 */

const SinViaje: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  return <MarcoDeTravel titulo={x.t('travel.modPlan')} sinBrain><EstadoVacio icono="alert-circle-outline" titulo={x.t('travel.notFound')} cta={x.t('travel.createTrip')} onCta={() => ir('crear')} /></MarcoDeTravel>;
};

const SelectorDeDia: React.FC<{ viaje: ViajeDemo; dia: number; onDia: (i: number) => void }> = ({ viaje, dia, onDia }) => {
  const x = useTextosDeTravel();
  const dir = useDireccion();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[t.carril, dir.contenedor]}>
      {viaje.itinerario.map((d, i) => (
        <TarjetaDiaItinerario key={d.id} dia={d} numero={i + 1} moneda={viaje.moneda} activo={i === dia} onPress={() => onDia(i)} fecha={viaje.inicio ? x.fecha(viaje.inicio, i, { weekday: 'short', day: 'numeric' }) : undefined} />
      ))}
    </ScrollView>
  );
};

/** Posiciones de ejemplo para pintar un día sobre el mapa DEMO. */
const puntosDelDia = (dia: DiaDemo): LugarDemo[] => dia.actividades.filter((a) => a.tipo !== 'traslado').map((a, i) => ({
  id: a.id, nombre: a.clave ?? 'travel.actCustom', categoria: a.tipo === 'comida' ? 'restaurantes' : a.tipo === 'descanso' ? 'parques' : 'atracciones',
  x: 18 + ((i * 23) % 66), y: 20 + ((i * 37) % 60), valoracion: 4.5, abierto: true, precio: 1, foto: null, minutos: a.duracion,
}));

const ResumenDelDia: React.FC<{ dia: DiaDemo; moneda: string }> = ({ dia, moneda }) => {
  const x = useTextosDeTravel();
  return (
    <View style={t.resumen}>
      <View style={t.dato}><Ionicons name="wallet-outline" size={16} color={TRAVEL.morado} /><Text style={t.datoTexto}>{x.dinero(costeDelDia(dia), moneda)}</Text></View>
      <View style={t.dato}><Ionicons name="walk-outline" size={16} color={TRAVEL.morado} /><Text style={t.datoTexto}>{x.distancia(kmTotales([dia]) * 1000)}</Text></View>
      <View style={t.dato}><Ionicons name="cafe-outline" size={16} color={TRAVEL.morado} /><Text style={t.datoTexto}>{x.t('travel.freeTime', { tiempo: x.duracion(minutosLibres(dia)) })}</Text></View>
    </View>
  );
};

export const ItinerarioScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { viajePorId } = useTravelDemo();
  const [vista, setVista] = useState<'dia' | 'lista' | 'mapa' | 'calendario'>('dia');
  const [dia, setDia] = useState(0);
  const v = viajePorId(id);
  if (!v) return <SinViaje />;
  const actual = v.itinerario[Math.min(dia, v.itinerario.length - 1)];
  const fechas = v.inicio ? v.itinerario.map((_, i) => { const f = fechaDeIso(v.inicio, i); return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`; }) : [];
  return (
    <MarcoDeTravel titulo={x.nombreDeViaje(v)} subtitulo={x.fechasDeViaje(v)} icono="map-outline" demo contextoBrain={x.t('travel.brainCtxItinerary', { viaje: x.nombreDeViaje(v), dias: x.t('travel.daysCount', { contador: v.dias }) })}>
      <FilaDeChips>
        <Chip texto={x.t('travel.viewDay')} icono="today-outline" activo={vista === 'dia'} onPress={() => setVista('dia')} />
        <Chip texto={x.t('travel.viewList')} icono="list-outline" activo={vista === 'lista'} onPress={() => setVista('lista')} />
        <Chip texto={x.t('travel.viewMap')} icono="map-outline" activo={vista === 'mapa'} onPress={() => setVista('mapa')} />
        <Chip texto={x.t('travel.viewCalendar')} icono="calendar-outline" activo={vista === 'calendario'} onPress={() => setVista('calendario')} />
      </FilaDeChips>
      <View style={t.acciones}>
        <Boton texto={x.t('travel.edit')} icono="create-outline" variante="suave" pequeno onPress={() => ir('editor', v.id)} />
        <Boton texto={x.t('travel.smartReplan')} icono="sparkles-outline" variante="suave" pequeno onPress={() => ir('replanear', v.id)} />
        <Boton texto={x.t('travel.budget')} icono="wallet-outline" variante="suave" pequeno onPress={() => ir('presupuesto', v.id)} />
        <Boton texto={x.t('travel.versions')} icono="git-compare-outline" variante="suave" pequeno onPress={() => ir('versiones', v.id)} />
      </View>
      {vista === 'dia' && !!actual && (
        <>
          <SelectorDeDia viaje={v} dia={dia} onDia={setDia} />
          <TituloDeSeccion titulo={x.t('travel.dayTitle', { n: dia + 1, lugar: x.nombreDestino(destinoPorId(actual.destino)) })} />
          <ResumenDelDia dia={actual} moneda={v.moneda} />
          <View>{actual.actividades.map((a) => <TarjetaActividad key={a.id} actividad={a} moneda={v.moneda} />)}</View>
        </>
      )}
      {vista === 'lista' && v.itinerario.map((d, i) => (
        <View key={d.id} style={t.bloque}>
          <TituloDeSeccion titulo={x.t('travel.dayTitle', { n: i + 1, lugar: x.nombreDestino(destinoPorId(d.destino)) })} subtitulo={v.inicio ? x.fecha(v.inicio, i, { weekday: 'long', day: 'numeric', month: 'long' }) : undefined} />
          {d.actividades.map((a) => <Fila key={a.id} icono={a.bloqueada ? 'lock-closed-outline' : 'time-outline'} titulo={x.actividad(a)} subtitulo={`${x.hora(a.inicio)} · ${x.duracion(a.duracion)}`} derecha={a.coste ? x.dinero(a.coste, v.moneda) : undefined} />)}
        </View>
      ))}
      {vista === 'mapa' && !!actual && (
        <>
          <SelectorDeDia viaje={v} dia={dia} onDia={setDia} />
          <VistaMapa lugares={puntosDelDia(actual)} ruta={puntosDelDia(actual)} alto={300} conPosicion={false} />
          <AvisoDemo texto={x.t('travel.demoMapNote')} />
          {actual.actividades.filter((a) => a.tipo !== 'traslado').map((a, i) => <Fila key={a.id} icono="location-outline" titulo={`${i + 1}. ${x.actividad(a)}`} subtitulo={x.hora(a.inicio)} />)}
        </>
      )}
      {vista === 'calendario' && (
        v.inicio ? (
          <>
            <SelectorFecha valor={fechas[dia] ?? ''} resaltados={fechas} onCambiar={(f) => { const i = fechas.indexOf(f); if (i >= 0) { setDia(i); setVista('dia'); } }} />
            <Text style={t.nota}>{x.t('travel.calendarHint')}</Text>
          </>
        ) : <EstadoVacio icono="calendar-outline" titulo={x.t('travel.flexibleDates')} texto={x.t('travel.flexibleDatesText')} />
      )}
    </MarcoDeTravel>
  );
};

/* ── Editor ─────────────────────────────────────────────────────────────── */

export const EditorScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { viajePorId, cambiarItinerario, guardarVersion } = useTravelDemo();
  const [dia, setDia] = useState(0);
  const [nota, setNota] = useState<{ act: string; texto: string } | null>(null);
  const [mover, setMover] = useState<string | null>(null);
  const [anadir, setAnadir] = useState(false);
  const [propia, setPropia] = useState('');
  const [borrar, setBorrar] = useState<string | null>(null);
  const [guardada, setGuardada] = useState(false);
  const v = viajePorId(id);
  if (!v) return <SinViaje />;
  const d = v.itinerario[Math.min(dia, v.itinerario.length - 1)];
  const dest = destinoPorId(d.destino);
  const poner = (nuevo: DiaDemo[]) => { cambiarItinerario(v.id, nuevo); setGuardada(false); };
  const cambiarDia = (receta: (dd: DiaDemo) => DiaDemo) => poner(v.itinerario.map((dd, i) => (i === dia ? ordenar(receta(dd)) : dd)));
  const cambiarAct = (actId: string, receta: (a: ActividadDemo) => ActividadDemo) => cambiarDia((dd) => ({ ...dd, actividades: dd.actividades.map((a) => (a.id === actId ? receta(a) : a)) }));
  const lista = d.actividades;
  const subir = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    cambiarDia((dd) => {
      const acts = [...dd.actividades];
      const a = acts[i]; const b = acts[j];
      acts[i] = { ...a, inicio: b.inicio }; acts[j] = { ...b, inicio: a.inicio };
      return { ...dd, actividades: acts };
    });
  };
  const reemplazar = (a: ActividadDemo) => {
    if (!dest) return;
    const fuente: string[] = a.tipo === 'comida' ? [...dest.comida] : [...dest.atracciones];
    const k = fuente.indexOf(a.clave ?? '');
    cambiarAct(a.id, (o) => ({ ...o, texto: undefined, clave: fuente[(k + 1) % fuente.length] }));
  };
  const moverA = (actId: string, destino: number) => {
    const act = lista.find((a) => a.id === actId);
    if (!act) return;
    poner(v.itinerario.map((dd, i) => {
      if (i === dia) return { ...dd, actividades: dd.actividades.filter((a) => a.id !== actId) };
      if (i === destino) return ordenar({ ...dd, actividades: [...dd.actividades, act] });
      return dd;
    }));
    setMover(null);
  };
  const duplicarDia = () => poner([...v.itinerario.slice(0, dia + 1), { ...d, id: nuevoId('d'), actividades: d.actividades.map((a) => ({ ...a, id: nuevoId('a'), bloqueada: false })) }, ...v.itinerario.slice(dia + 1)]);
  const nuevaActividad = (clave?: string, texto?: string) => {
    const ultima = lista[lista.length - 1];
    cambiarDia((dd) => ({ ...dd, actividades: [...dd.actividades, { id: nuevoId('a'), tipo: 'visita', clave, texto, inicio: Math.min(22 * 60, (ultima ? ultima.inicio + ultima.duracion : 9 * 60) + 30), duracion: 60, coste: 0, distanciaKm: 0.5 }] }));
    setAnadir(false); setPropia('');
  };
  return (
    <MarcoDeTravel titulo={x.t('travel.editItinerary')} subtitulo={x.nombreDeViaje(v)} icono="create-outline" demo contextoBrain={x.t('travel.brainCtxItinerary', { viaje: x.nombreDeViaje(v), dias: x.t('travel.daysCount', { contador: v.dias }) })}>
      <SelectorDeDia viaje={v} dia={dia} onDia={setDia} />
      <View style={t.acciones}>
        <Boton texto={x.t('travel.addActivity')} icono="add" pequeno onPress={() => setAnadir(true)} />
        <Boton texto={x.t('travel.duplicateDay')} icono="copy-outline" variante="suave" pequeno onPress={duplicarDia} />
        <Boton texto={guardada ? x.t('travel.versionSaved') : x.t('travel.saveVersion')} icono={guardada ? 'checkmark' : 'bookmark-outline'} variante="suave" pequeno onPress={() => { guardarVersion(v.id); setGuardada(true); }} />
      </View>
      {lista.length === 0 && <EstadoVacio icono="calendar-clear-outline" titulo={x.t('travel.emptyDay')} cta={x.t('travel.addActivity')} onCta={() => setAnadir(true)} />}
      <View>
        {lista.map((a, i) => (
          <TarjetaActividad key={a.id} actividad={a} moneda={v.moneda}>
            <View style={t.herramientas}>
              <Herramienta icono="chevron-up" texto={x.t('travel.moveUp')} onPress={() => subir(i, -1)} desactivada={a.bloqueada || i === 0} />
              <Herramienta icono="chevron-down" texto={x.t('travel.moveDown')} onPress={() => subir(i, 1)} desactivada={a.bloqueada || i === lista.length - 1} />
              <Herramienta icono="remove-circle-outline" texto={x.t('travel.earlier')} onPress={() => cambiarAct(a.id, (o) => ({ ...o, inicio: Math.max(6 * 60, o.inicio - 30) }))} desactivada={a.bloqueada} />
              <Herramienta icono="add-circle-outline" texto={x.t('travel.later')} onPress={() => cambiarAct(a.id, (o) => ({ ...o, inicio: Math.min(23 * 60, o.inicio + 30) }))} desactivada={a.bloqueada} />
              <Herramienta icono={a.bloqueada ? 'lock-closed' : 'lock-open-outline'} texto={x.t(a.bloqueada ? 'travel.unlock' : 'travel.lock')} onPress={() => cambiarAct(a.id, (o) => ({ ...o, bloqueada: !o.bloqueada }))} />
              <Herramienta icono="chatbox-outline" texto={x.t('travel.note')} onPress={() => setNota({ act: a.id, texto: a.nota ?? '' })} />
              <Herramienta icono={a.tipo === 'comida' ? 'restaurant-outline' : 'swap-horizontal-outline'} texto={x.t(a.tipo === 'comida' ? 'travel.changeRestaurant' : 'travel.replacePlace')} onPress={() => reemplazar(a)} desactivada={a.bloqueada || a.tipo === 'traslado' || a.tipo === 'descanso'} />
              <Herramienta icono="calendar-outline" texto={x.t('travel.moveToDay')} onPress={() => setMover(a.id)} desactivada={a.bloqueada || v.itinerario.length < 2} />
              <Herramienta icono="trash-outline" texto={x.t('travel.remove')} onPress={() => setBorrar(a.id)} desactivada={a.bloqueada} peligro />
            </View>
          </TarjetaActividad>
        ))}
      </View>
      <HojaInferior visible={!!nota} onCerrar={() => setNota(null)} titulo={x.t('travel.note')}>
        <Campo etiqueta={x.t('travel.note')} valor={nota?.texto ?? ''} onCambiar={(texto) => nota && setNota({ ...nota, texto })} multilinea placeholder={x.t('travel.notePh')} />
        <Boton texto={x.t('travel.saveNote')} onPress={() => { if (nota) cambiarAct(nota.act, (o) => ({ ...o, nota: nota.texto.trim() || undefined })); setNota(null); }} />
      </HojaInferior>
      <HojaInferior visible={!!mover} onCerrar={() => setMover(null)} titulo={x.t('travel.moveToDay')}>
        {v.itinerario.map((dd, i) => i !== dia && <Fila key={dd.id} icono="calendar-outline" titulo={x.t('travel.dayN', { n: i + 1 })} subtitulo={x.nombreDestino(destinoPorId(dd.destino))} onPress={() => mover && moverA(mover, i)} />)}
      </HojaInferior>
      <HojaInferior visible={anadir} onCerrar={() => setAnadir(false)} titulo={x.t('travel.addActivity')}>
        {!!dest && [...dest.atracciones, ...dest.comida].map((k) => <Fila key={k} icono="add-circle-outline" titulo={x.t(k)} onPress={() => nuevaActividad(k)} />)}
        <Campo etiqueta={x.t('travel.customActivity')} valor={propia} onCambiar={setPropia} placeholder={x.t('travel.customActivityPh')} />
        <Boton texto={x.t('travel.add')} icono="add" desactivado={!propia.trim()} onPress={() => nuevaActividad(undefined, propia.trim())} />
      </HojaInferior>
      <DialogoConfirmacionIA
        visible={!!borrar}
        peligro
        titulo={x.t('travel.removeActivityQ')}
        texto={x.t('travel.removeActivityText')}
        confirmar={x.t('travel.remove')}
        onCancelar={() => setBorrar(null)}
        onConfirmar={() => { if (borrar) cambiarDia((dd) => ({ ...dd, actividades: dd.actividades.filter((a) => a.id !== borrar) })); setBorrar(null); }}
      />
    </MarcoDeTravel>
  );
};

const Herramienta: React.FC<{ icono: string; texto: string; onPress: () => void; desactivada?: boolean; peligro?: boolean }> = ({ icono, texto, onPress, desactivada, peligro }) => (
  <TouchableOpacity onPress={onPress} disabled={desactivada} style={[t.herr, desactivada && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel={texto} accessibilityState={{ disabled: !!desactivada }} hitSlop={4}>
    <Ionicons name={icono as React.ComponentProps<typeof Ionicons>['name']} size={18} color={peligro ? TRAVEL.peligro : TRAVEL.morado} />
  </TouchableOpacity>
);

/* ── Replanificar ───────────────────────────────────────────────────────── */

const PETICIONES: { id: PeticionDeReplan; icono: string; titulo: string; ejemplo: string }[] = [
  { id: 'relajar', icono: 'cafe-outline', titulo: 'travel.rpRelax', ejemplo: 'travel.rpRelaxEx' },
  { id: 'comida', icono: 'restaurant-outline', titulo: 'travel.rpFood', ejemplo: 'travel.rpFoodEx' },
  { id: 'lluvia', icono: 'rainy-outline', titulo: 'travel.rpRain', ejemplo: 'travel.rpRainEx' },
  { id: 'tarde', icono: 'alarm-outline', titulo: 'travel.rpLater', ejemplo: 'travel.rpLaterEx' },
];

export const ReplanearScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { preguntarABrain } = useTravelNav();
  const { viajePorId, cambiarItinerario } = useTravelDemo();
  const [dia, setDia] = useState(0);
  const [peticion, setPeticion] = useState<PeticionDeReplan | null>(null);
  const [texto, setTexto] = useState('');
  const [hecho, setHecho] = useState<'aceptado' | 'rechazado' | null>(null);
  const v = viajePorId(id);
  const d = v?.itinerario[Math.min(dia, (v?.itinerario.length ?? 1) - 1)];
  const vista = useMemo(() => (d && peticion ? replanificar(d, peticion) : null), [d, peticion]);
  if (!v || !d) return <SinViaje />;
  const bloqueadas = d.actividades.filter((a) => a.bloqueada).length;
  return (
    <MarcoDeTravel titulo={x.t('travel.smartReplan')} subtitulo={x.nombreDeViaje(v)} icono="sparkles-outline" demo sinBrain>
      <SelectorDeDia viaje={v} dia={dia} onDia={(i) => { setDia(i); setPeticion(null); setHecho(null); }} />
      <CajaDePrompt
        valor={texto}
        onCambiar={setTexto}
        onEnviar={() => preguntarABrain(x.t('travel.brainCtxReplan', { pedido: texto, n: dia + 1, viaje: x.nombreDeViaje(v) }))}
        etiquetaEnviar={x.t('travel.sendToBrain')}
        placeholder={x.t('travel.replanPlaceholder')}
      />
      <Text style={t.nota}>{x.t('travel.replanBrainNote')}</Text>
      <TituloDeSeccion titulo={x.t('travel.replanExamples')} subtitulo={x.t('travel.replanExamplesSub')} />
      {PETICIONES.map((p) => <Fila key={p.id} icono={p.icono} titulo={x.t(p.titulo)} subtitulo={x.t(p.ejemplo)} onPress={() => { setPeticion(p.id); setHecho(null); }} />)}
      {bloqueadas > 0 && <AvisoDemo texto={x.t('travel.lockedRespected', { contador: bloqueadas })} />}
      {!!vista && !hecho && (
        <Tarjeta>
          <TituloDeSeccion titulo={x.t('travel.previewChanges')} subtitulo={x.t('travel.changesCount', { contador: vista.cambiadas.length })} />
          {vista.cambiadas.length === 0 ? (
            <Text style={t.nota}>{x.t('travel.noChangesPossible')}</Text>
          ) : (
            <View>{vista.dia.actividades.map((a) => <TarjetaActividad key={a.id} actividad={a} moneda={v.moneda} resaltada={vista.cambiadas.includes(a.id)} />)}</View>
          )}
          <View style={t.acciones}>
            <Boton texto={x.t('travel.accept')} icono="checkmark" pequeno desactivado={vista.cambiadas.length === 0} onPress={() => { cambiarItinerario(v.id, v.itinerario.map((dd, i) => (i === dia ? vista.dia : dd))); setHecho('aceptado'); }} />
            <Boton texto={x.t('travel.reject')} icono="close" variante="linea" pequeno onPress={() => setHecho('rechazado')} />
          </View>
        </Tarjeta>
      )}
      {hecho === 'aceptado' && <SugerenciaIA demo icono="checkmark-circle-outline" titulo={x.t('travel.changesApplied')} texto={x.t('travel.changesAppliedText')} />}
      {hecho === 'rechazado' && <SugerenciaIA demo icono="close-circle-outline" titulo={x.t('travel.changesDiscarded')} texto={x.t('travel.changesDiscardedText')} />}
    </MarcoDeTravel>
  );
};

const t = StyleSheet.create({
  bloque: { gap: 10 },
  carril: { gap: 10, paddingVertical: 4, paddingHorizontal: 1 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resumen: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: TRAVEL.lilaSuave },
  datoTexto: { fontSize: 12, fontWeight: '700', color: TRAVEL.tinta },
  nota: { fontSize: 12, lineHeight: 17, color: TRAVEL.gris },
  herramientas: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, borderTopWidth: 1, borderTopColor: TRAVEL.borde, paddingTop: 8 },
  herr: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: TRAVEL.lilaSuave },
});
