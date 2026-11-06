import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { Boton, EstadoVacio, Tarjeta, TituloDeSeccion } from '../../components/travel/Piezas';
import { TarjetaPresupuesto } from '../../components/travel/Tarjetas';
import { SelectorMoneda } from '../../components/travel/Selectores';
import { TRAVEL } from '../../components/travel/tema';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { CATEGORIAS_DE_GASTO, CategoriaDeGasto, DiaDemo } from '../../constants/travelDemo';
import { costeTotal, kmTotales, minutosLibres } from '../../utils/travelItinerario';
import { useTravelNav } from './rutas';

/*
 * 2 · PLANEAR — el planificador de presupuesto (reparto por categorías, con su moneda) y la comparación de versiones
 * del itinerario. Cifras DEMO; la moneda la elige la persona y el idioma solo decide cómo se escribe.
 */

type Icono = React.ComponentProps<typeof Ionicons>['name'];

export const PresupuestoScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { viajePorId, cambiarViaje } = useTravelDemo();
  const v = viajePorId(id);
  if (!v) return <MarcoDeTravel titulo={x.t('travel.budgetPlanner')} sinBrain><EstadoVacio icono="alert-circle-outline" titulo={x.t('travel.notFound')} cta={x.t('travel.createTrip')} onCta={() => ir('crear')} /></MarcoDeTravel>;
  const repartido = Object.values(v.reparto).reduce((s, n) => s + n, 0);
  const paso = Math.max(1, Math.round(v.presupuesto / 40 / 10) * 10);
  const ajustar = (cat: CategoriaDeGasto, delta: number) => cambiarViaje(v.id, (o) => ({ ...o, reparto: { ...o.reparto, [cat]: Math.max(0, o.reparto[cat] + delta) } }));
  const plan = costeTotal(v.itinerario);
  return (
    <MarcoDeTravel titulo={x.t('travel.budgetPlanner')} subtitulo={x.nombreDeViaje(v)} icono="wallet-outline" demo contextoBrain={x.t('travel.brainCtxBudget', { viaje: x.nombreDeViaje(v), total: x.dinero(v.presupuesto, v.moneda) })}>
      <TarjetaPresupuesto titulo={x.t('travel.allocated')} gastado={repartido} total={v.presupuesto} moneda={v.moneda} />
      <Tarjeta>
        <View style={u.filaEntre}>
          <Text style={u.etiqueta}>{x.t('travel.totalBudget')}</Text>
          <View style={u.filaMini}>
            <Paso icono="remove" texto={x.t('travel.decrease', { nombre: x.t('travel.totalBudget') })} onPress={() => cambiarViaje(v.id, (o) => ({ ...o, presupuesto: Math.max(0, o.presupuesto - paso * 5) }))} />
            <Text style={u.cifra}>{x.dinero(v.presupuesto, v.moneda)}</Text>
            <Paso icono="add" texto={x.t('travel.increase', { nombre: x.t('travel.totalBudget') })} onPress={() => cambiarViaje(v.id, (o) => ({ ...o, presupuesto: o.presupuesto + paso * 5 }))} />
          </View>
        </View>
        <Text style={u.etiqueta}>{x.t('travel.currency')}</Text>
        <SelectorMoneda valor={v.moneda} onCambiar={(m) => cambiarViaje(v.id, (o) => ({ ...o, moneda: m }))} />
        <Text style={u.nota}>{x.t('travel.currencyNote')}</Text>
      </Tarjeta>
      <View style={u.bloque}>
        <TituloDeSeccion titulo={x.t('travel.byCategory')} />
        {CATEGORIAS_DE_GASTO.map((c) => (
          <View key={c.id} style={u.cat}>
            <View style={u.catIcono}><Ionicons name={c.icono as Icono} size={18} color={TRAVEL.morado} /></View>
            <View style={u.flex}>
              <Text style={u.catTitulo}>{x.t(c.titulo)}</Text>
              <View style={u.barra}><View style={[u.relleno, { width: `${v.presupuesto ? Math.min(100, (v.reparto[c.id] / v.presupuesto) * 100) : 0}%` }]} /></View>
            </View>
            <Paso icono="remove" texto={x.t('travel.decrease', { nombre: x.t(c.titulo) })} onPress={() => ajustar(c.id, -paso)} />
            <Text style={u.catCifra} numberOfLines={1}>{x.dinero(v.reparto[c.id], v.moneda)}</Text>
            <Paso icono="add" texto={x.t('travel.increase', { nombre: x.t(c.titulo) })} onPress={() => ajustar(c.id, paso)} />
          </View>
        ))}
      </View>
      <Tarjeta>
        <Text style={u.etiqueta}>{x.t('travel.itineraryCost')}</Text>
        <Text style={u.cifra}>{x.dinero(plan, v.moneda)}</Text>
        <Text style={u.nota}>{x.t('travel.perDayAvg', { precio: x.dinero(Math.round(v.presupuesto / Math.max(1, v.dias)), v.moneda) })}</Text>
        <Boton texto={x.t('travel.trackExpenses')} icono="receipt-outline" variante="suave" pequeno onPress={() => ir('gastos', v.id)} />
      </Tarjeta>
    </MarcoDeTravel>
  );
};

const Paso: React.FC<{ icono: string; texto: string; onPress: () => void }> = ({ icono, texto, onPress }) => (
  <TouchableOpacity onPress={onPress} style={u.paso} accessibilityRole="button" accessibilityLabel={texto} hitSlop={4}>
    <Ionicons name={icono as Icono} size={16} color={TRAVEL.morado} />
  </TouchableOpacity>
);

/* ── Comparar versiones del itinerario ──────────────────────────────────── */

export const VersionesScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { viajePorId, guardarVersion, cambiarItinerario } = useTravelDemo();
  const v = viajePorId(id);
  if (!v) return <MarcoDeTravel titulo={x.t('travel.versions')} sinBrain><EstadoVacio icono="alert-circle-outline" titulo={x.t('travel.notFound')} cta={x.t('travel.createTrip')} onCta={() => ir('crear')} /></MarcoDeTravel>;
  const datos = (it: DiaDemo[]) => ({
    actividades: it.reduce((s, d) => s + d.actividades.length, 0),
    coste: costeTotal(it),
    km: kmTotales(it),
    libre: it.reduce((s, d) => s + minutosLibres(d), 0),
  });
  const columnas = [{ id: 'actual', titulo: x.t('travel.currentVersion'), it: v.itinerario }, ...v.versiones.slice(0, 2).map((ver) => ({ id: ver.id, titulo: x.formato.fecha(ver.creada, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }), it: ver.itinerario }))];
  return (
    <MarcoDeTravel titulo={x.t('travel.versions')} subtitulo={x.nombreDeViaje(v)} icono="git-compare-outline" demo sinBrain>
      <Boton texto={x.t('travel.saveVersion')} icono="bookmark-outline" variante="suave" onPress={() => guardarVersion(v.id)} />
      {v.versiones.length === 0 ? (
        <EstadoVacio icono="git-branch-outline" titulo={x.t('travel.noVersions')} texto={x.t('travel.noVersionsText')} cta={x.t('travel.editItinerary')} onCta={() => ir('editor', v.id)} />
      ) : (
        <Tarjeta>
          <View style={u.filaComp}>
            <View style={u.colTitulo} />
            {columnas.map((c) => <Text key={c.id} style={u.cabeceraComp} numberOfLines={2}>{c.titulo}</Text>)}
          </View>
          {([
            ['travel.activities', (d: ReturnType<typeof datos>) => x.formato.numero(d.actividades)],
            ['travel.estimatedCost', (d: ReturnType<typeof datos>) => x.dinero(d.coste, v.moneda)],
            ['travel.walking', (d: ReturnType<typeof datos>) => x.distancia(d.km * 1000)],
            ['travel.freeTimeTotal', (d: ReturnType<typeof datos>) => x.duracion(d.libre)],
          ] as const).map(([clave, f]) => (
            <View key={clave} style={u.filaComp}>
              <Text style={u.colTitulo}>{x.t(clave)}</Text>
              {columnas.map((c) => <Text key={c.id} style={u.valorComp}>{f(datos(c.it))}</Text>)}
            </View>
          ))}
          <View style={u.filaComp}>
            <View style={u.colTitulo} />
            {columnas.map((c) => c.id === 'actual'
              ? <Text key={c.id} style={u.valorComp}>{x.t('travel.inUse')}</Text>
              : <TouchableOpacity key={c.id} style={u.restaurar} onPress={() => cambiarItinerario(v.id, c.it)} accessibilityRole="button"><Text style={u.restaurarTexto}>{x.t('travel.restore')}</Text></TouchableOpacity>)}
          </View>
        </Tarjeta>
      )}
    </MarcoDeTravel>
  );
};

const u = StyleSheet.create({
  bloque: { gap: 10 },
  flex: { flex: 1, minWidth: 0, gap: 6 },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  filaMini: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  etiqueta: { fontSize: 13, fontWeight: '800', color: TRAVEL.texto },
  cifra: { fontSize: 20, fontWeight: '800', color: TRAVEL.tinta },
  nota: { fontSize: 12, lineHeight: 17, color: TRAVEL.gris },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: TRAVEL.borde },
  catIcono: { width: 36, height: 36, borderRadius: 12, backgroundColor: TRAVEL.lilaSuave, alignItems: 'center', justifyContent: 'center' },
  catTitulo: { fontSize: 14, fontWeight: '700', color: TRAVEL.tinta },
  catCifra: { minWidth: 70, textAlign: 'center', fontSize: 13, fontWeight: '800', color: TRAVEL.tinta },
  barra: { height: 6, borderRadius: 3, backgroundColor: TRAVEL.lilaSuave, overflow: 'hidden' },
  relleno: { height: 6, backgroundColor: TRAVEL.morado },
  paso: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: TRAVEL.borde, alignItems: 'center', justifyContent: 'center' },
  filaComp: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: TRAVEL.borde },
  colTitulo: { width: '30%', fontSize: 12, fontWeight: '800', color: TRAVEL.texto },
  cabeceraComp: { flex: 1, fontSize: 12, fontWeight: '800', color: TRAVEL.morado, textAlign: 'center' },
  valorComp: { flex: 1, fontSize: 13, color: TRAVEL.tinta, textAlign: 'center' },
  restaurar: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 999, backgroundColor: TRAVEL.lilaSuave },
  restaurarTexto: { fontSize: 12, fontWeight: '800', color: TRAVEL.morado },
});
