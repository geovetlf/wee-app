import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { Chip, EstadoCarga, EstadoVacio, FilaDeChips, Fila, Fotografia, HojaInferior, Boton, TituloDeSeccion } from '../../components/travel/Piezas';
import { TarjetaDestino, TarjetaLugar } from '../../components/travel/Tarjetas';
import { SugerenciaIA } from '../../components/travel/Brain';
import { TRAVEL } from '../../components/travel/tema';
import { useDireccion } from '../../hooks/useDireccion';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { CATEGORIAS, COLECCIONES, Categoria, DESTINOS, DestinoDemo, Etiqueta, LUGARES } from '../../constants/travelDemo';
import { useTravelNav } from './rutas';

/*
 * 1 · DESCUBRIR — portada, búsqueda y páginas de categoría/colección. Todo sobre los destinos DEMO, filtrado en el
 * teléfono: ninguna búsqueda sale a la red.
 */

type Icono = React.ComponentProps<typeof Ionicons>['name'];

const Carril: React.FC<{ destinos: DestinoDemo[] }> = ({ destinos }) => {
  const dir = useDireccion();
  const { ir } = useTravelNav();
  const { favoritos, alternarFavorito } = useTravelDemo();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[e.carril, dir.contenedor]}>
      {destinos.map((d) => (
        <TarjetaDestino key={d.id} destino={d} ancho={210} onPress={() => ir('destino', d.id)} favorito={favoritos.includes(d.id)} onFavorito={() => alternarFavorito(d.id)} />
      ))}
    </ScrollView>
  );
};

export const BarraDeBusqueda: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { t } = useTextosDeTravel();
  return (
    <TouchableOpacity onPress={onPress} style={e.barra} activeOpacity={0.85} accessibilityRole="search">
      <Ionicons name="search-outline" size={19} color={TRAVEL.gris} />
      <Text style={e.barraTexto} numberOfLines={1}>{t('travel.searchPlaceholder')}</Text>
      <Ionicons name="options-outline" size={19} color={TRAVEL.morado} />
    </TouchableOpacity>
  );
};

export const DescubrirScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { favoritos } = useTravelDemo();
  const [filtro, setFiltro] = useState<Categoria | null>(null);
  const filtrados = DESTINOS.filter((d) => !filtro || d.categorias.includes(filtro));
  const con = (et: Etiqueta) => filtrados.filter((d) => d.etiquetas.includes(et));
  /* «Para ti»: lo que comparte categorías con lo que la persona guardó (DEMO, sin perfil real). */
  const gustos = new Set(DESTINOS.filter((d) => favoritos.includes(d.id)).flatMap((d) => d.categorias));
  const paraTi = filtrados.filter((d) => !favoritos.includes(d.id) && d.categorias.some((c) => gustos.has(c))).slice(0, 5);
  return (
    <MarcoDeTravel titulo={x.t('travel.modDiscover')} subtitulo={x.t('travel.discoverSub')} icono="compass-outline" demo contextoBrain={x.t('travel.brainCtxDiscover')}>
      <BarraDeBusqueda onPress={() => ir('buscar')} />
      <FilaDeChips>
        <Chip texto={x.t('travel.all')} activo={!filtro} onPress={() => setFiltro(null)} />
        {CATEGORIAS.map((c) => <Chip key={c.id} texto={x.t(c.titulo)} icono={c.icono} activo={filtro === c.id} onPress={() => setFiltro(filtro === c.id ? null : c.id)} />)}
      </FilaDeChips>
      {filtrados.length === 0 && <EstadoVacio icono="search-outline" titulo={x.t('travel.noResults')} texto={x.t('travel.noResultsText')} />}
      {paraTi.length > 0 && (<View style={e.bloque}><TituloDeSeccion titulo={x.t('travel.forYou')} subtitulo={x.t('travel.forYouSub')} /><Carril destinos={paraTi} /></View>)}
      {con('recomendado').length > 0 && (<View style={e.bloque}><TituloDeSeccion titulo={x.t('travel.recommended')} /><Carril destinos={con('recomendado')} /></View>)}
      {con('popular').length > 0 && (<View style={e.bloque}><TituloDeSeccion titulo={x.t('travel.popular')} /><Carril destinos={con('popular')} /></View>)}
      {con('joya').length > 0 && (<View style={e.bloque}><TituloDeSeccion titulo={x.t('travel.hiddenGems')} /><Carril destinos={con('joya')} /></View>)}
      {con('economico').length > 0 && (<View style={e.bloque}><TituloDeSeccion titulo={x.t('travel.budgetFriendly')} /><Carril destinos={con('economico')} /></View>)}
      <SugerenciaIA
        icono="shuffle-outline"
        titulo={x.t('travel.surpriseTitle')}
        texto={x.t('travel.surpriseText')}
        accion={x.t('travel.surpriseCta')}
        onAccion={() => ir('sorpresa')}
        secundaria={x.t('travel.compareCta')}
        onSecundaria={() => ir('comparar', 'kyoto,lisboa')}
      />
      <View style={e.bloque}>
        <TituloDeSeccion titulo={x.t('travel.themes')} />
        <View style={e.temas}>
          {CATEGORIAS.map((c) => (
            <TouchableOpacity key={c.id} style={e.tema} onPress={() => ir('coleccion', `cat-${c.id}`)} accessibilityRole="button">
              <Ionicons name={c.icono as Icono} size={22} color={TRAVEL.morado} />
              <Text style={e.temaTexto} numberOfLines={2}>{x.t(c.titulo)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={e.bloque}>
        <TituloDeSeccion titulo={x.t('travel.collections')} />
        {COLECCIONES.map((col) => (
          <TouchableOpacity key={col.id} style={e.coleccion} onPress={() => ir('coleccion', `col-${col.id}`)} activeOpacity={0.88} accessibilityRole="button">
            <Fotografia foto={col.foto} icono={col.icono} estilo={e.colFoto} />
            <View style={e.colTextos}>
              <Text style={e.colTitulo} numberOfLines={2}>{x.t(col.titulo)}</Text>
              <Text style={e.colSub} numberOfLines={2}>{x.t(col.descripcion)}</Text>
              <Text style={e.colMeta}>{x.t('travel.destinationsCount', { contador: col.destinos.length })}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </MarcoDeTravel>
  );
};

/* ── Búsqueda ───────────────────────────────────────────────────────────── */

type Tipo = 'todo' | 'paises' | 'ciudades' | 'lugares' | 'experiencias' | 'restaurantes' | 'actividades';

export const BuscarScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const dir = useDireccion();
  const { ir } = useTravelNav();
  const { lugaresGuardados, alternarLugar } = useTravelDemo();
  const [q, setQ] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [tipo, setTipo] = useState<Tipo>('todo');
  const [filtros, setFiltros] = useState(false);
  const [maximo, setMaximo] = useState<number | null>(null);
  const [clima, setClima] = useState<string | null>(null);
  useEffect(() => {
    if (!q.trim()) return;
    setBuscando(true);
    const h = setTimeout(() => setBuscando(false), 350);
    return () => clearTimeout(h);
  }, [q]);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase(x.locale);
  const pasa = (s: string) => norm(s).includes(norm(q.trim()));
  const destinos = DESTINOS.filter((d) => (!maximo || d.presupuestoDia <= maximo) && (!clima || d.clima === clima));
  const ciudades = destinos.filter((d) => pasa(x.nombreDestino(d)));
  const paises = destinos.filter((d) => pasa(x.pais(d.pais)));
  const lugares = LUGARES.filter((l) => l.categoria !== 'restaurantes' && pasa(x.t(l.nombre)));
  const restaurantes = LUGARES.filter((l) => l.categoria === 'restaurantes' && pasa(x.t(l.nombre)));
  const experiencias = CATEGORIAS.filter((c) => pasa(x.t(c.titulo)));
  const actividades = destinos.flatMap((d) => d.atracciones.map((a) => ({ d, a }))).filter((v) => pasa(x.t(v.a)));
  const total = ciudades.length + paises.length + lugares.length + restaurantes.length + experiencias.length + actividades.length;
  const ver = (t: Tipo) => tipo === 'todo' || tipo === t;
  const TIPOS: { id: Tipo; clave: string }[] = [
    { id: 'todo', clave: 'travel.all' }, { id: 'paises', clave: 'travel.stCountries' }, { id: 'ciudades', clave: 'travel.stCities' },
    { id: 'lugares', clave: 'travel.stPlaces' }, { id: 'experiencias', clave: 'travel.stExperiences' }, { id: 'restaurantes', clave: 'travel.stRestaurants' },
    { id: 'actividades', clave: 'travel.stActivities' },
  ];
  return (
    <MarcoDeTravel titulo={x.t('travel.searchTitle')} icono="search-outline" demo sinBrain>
      <View style={e.campoBusqueda}>
        <Ionicons name="search-outline" size={19} color={TRAVEL.gris} />
        <TextInput value={q} onChangeText={setQ} autoFocus placeholder={x.t('travel.searchPlaceholder')} placeholderTextColor={TRAVEL.gris} style={[e.input, dir.texto]} accessibilityLabel={x.t('travel.searchTitle')} returnKeyType="search" />
        {!!q && <TouchableOpacity onPress={() => setQ('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={x.t('travel.clear')}><Ionicons name="close-circle" size={19} color={TRAVEL.gris} /></TouchableOpacity>}
        <TouchableOpacity onPress={() => setFiltros(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel={x.t('travel.filters')}><Ionicons name="options-outline" size={20} color={TRAVEL.morado} /></TouchableOpacity>
      </View>
      <FilaDeChips>{TIPOS.map((tp) => <Chip key={tp.id} texto={x.t(tp.clave)} activo={tipo === tp.id} onPress={() => setTipo(tp.id)} />)}</FilaDeChips>
      {!q.trim() ? (
        <EstadoVacio icono="earth-outline" titulo={x.t('travel.searchHintTitle')} texto={x.t('travel.searchHintText')} />
      ) : buscando ? (
        <EstadoCarga texto={x.t('travel.searching')} />
      ) : total === 0 ? (
        <EstadoVacio icono="search-outline" titulo={x.t('travel.noResults')} texto={x.t('travel.noResultsText')} cta={x.t('travel.askBrainShort')} onCta={() => ir('asistente')} />
      ) : (
        <View style={e.bloque}>
          <Text style={e.colMeta}>{x.t('travel.resultsCount', { contador: total })}</Text>
          {ver('ciudades') && ciudades.map((d) => <Fila key={`c${d.id}`} icono="business-outline" titulo={x.nombreDestino(d)} subtitulo={x.pais(d.pais)} onPress={() => ir('destino', d.id)} />)}
          {ver('paises') && paises.map((d) => <Fila key={`p${d.id}`} icono="flag-outline" titulo={x.pais(d.pais)} subtitulo={x.nombreDestino(d)} onPress={() => ir('destino', d.id)} />)}
          {ver('experiencias') && experiencias.map((c) => <Fila key={`e${c.id}`} icono={c.icono} titulo={x.t(c.titulo)} subtitulo={x.t('travel.stExperiences')} onPress={() => ir('coleccion', `cat-${c.id}`)} />)}
          {ver('actividades') && actividades.map((v) => <Fila key={`a${v.a}`} icono="ticket-outline" titulo={x.t(v.a)} subtitulo={x.nombreDestino(v.d)} onPress={() => ir('destino', v.d.id)} />)}
          {ver('lugares') && lugares.map((l) => <TarjetaLugar key={l.id} lugar={l} onPress={() => ir('lugar', l.id)} guardado={lugaresGuardados.includes(l.id)} onGuardar={() => alternarLugar(l.id)} />)}
          {ver('restaurantes') && restaurantes.map((l) => <TarjetaLugar key={l.id} lugar={l} onPress={() => ir('lugar', l.id)} guardado={lugaresGuardados.includes(l.id)} onGuardar={() => alternarLugar(l.id)} />)}
        </View>
      )}
      <HojaInferior visible={filtros} onCerrar={() => setFiltros(false)} titulo={x.t('travel.filters')}>
        <PanelDeFiltros maximo={maximo} onMaximo={setMaximo} clima={clima} onClima={setClima} />
        <Boton texto={x.t('travel.applyFilters')} onPress={() => setFiltros(false)} />
      </HojaInferior>
    </MarcoDeTravel>
  );
};

/** El panel de filtros: presupuesto diario y clima. */
export const PanelDeFiltros: React.FC<{ maximo: number | null; onMaximo: (v: number | null) => void; clima: string | null; onClima: (v: string | null) => void }> = ({ maximo, onMaximo, clima, onClima }) => {
  const x = useTextosDeTravel();
  return (
    <View style={e.bloque}>
      <Text style={e.etiqueta}>{x.t('travel.filterBudget')}</Text>
      <View style={e.temasChips}>
        <Chip texto={x.t('travel.any')} activo={maximo === null} onPress={() => onMaximo(null)} />
        {[60, 100, 160].map((v) => <Chip key={v} texto={x.t('travel.upToPerDay', { precio: x.dinero(v, 'USD') })} activo={maximo === v} onPress={() => onMaximo(v)} />)}
      </View>
      <Text style={e.etiqueta}>{x.t('travel.filterClimate')}</Text>
      <View style={e.temasChips}>
        <Chip texto={x.t('travel.any')} activo={clima === null} onPress={() => onClima(null)} />
        <Chip texto={x.t('travel.climateWarm')} icono="sunny-outline" activo={clima === 'calido'} onPress={() => onClima('calido')} />
        <Chip texto={x.t('travel.climateMild')} icono="partly-sunny-outline" activo={clima === 'templado'} onPress={() => onClima('templado')} />
        <Chip texto={x.t('travel.climateCold')} icono="snow-outline" activo={clima === 'frio'} onPress={() => onClima('frio')} />
      </View>
    </View>
  );
};

/* ── Categoría o colección ─────────────────────────────────────────────── */

export const ColeccionScreen: React.FC<{ id?: string }> = ({ id = '' }) => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { favoritos, alternarFavorito } = useTravelDemo();
  const [maximo, setMaximo] = useState<number | null>(null);
  const [clima, setClima] = useState<string | null>(null);
  const [orden, setOrden] = useState<'popular' | 'precio'>('popular');
  const [filtros, setFiltros] = useState(false);
  const esCategoria = id.startsWith('cat-');
  const cat = CATEGORIAS.find((c) => `cat-${c.id}` === id);
  const col = COLECCIONES.find((c) => `col-${c.id}` === id);
  const base = useMemo(() => (esCategoria ? DESTINOS.filter((d) => cat && d.categorias.includes(cat.id)) : DESTINOS.filter((d) => col?.destinos.includes(d.id))), [esCategoria, cat, col]);
  const lista = base
    .filter((d) => (!maximo || d.presupuestoDia <= maximo) && (!clima || d.clima === clima))
    .sort((a, b) => (orden === 'precio' ? a.presupuestoDia - b.presupuestoDia : b.etiquetas.length - a.etiquetas.length));
  if (!cat && !col) return <MarcoDeTravel titulo={x.t('travel.collections')} sinBrain><EstadoVacio icono="alert-circle-outline" titulo={x.t('travel.notFound')} cta={x.t('travel.modDiscover')} onCta={() => ir('descubrir')} /></MarcoDeTravel>;
  const titulo = x.t(cat?.titulo ?? col?.titulo ?? '');
  return (
    <MarcoDeTravel titulo={titulo} subtitulo={col ? x.t(col.descripcion) : x.t('travel.categorySub')} icono={cat?.icono ?? col?.icono} demo contextoBrain={x.t('travel.brainCtxTheme', { tema: titulo })}>
      {!!col && <Fotografia foto={col.foto} icono={col.icono} estilo={e.portadaCol} />}
      <View style={e.filaAcciones}>
        <Chip texto={x.t('travel.sortPopular')} activo={orden === 'popular'} onPress={() => setOrden('popular')} />
        <Chip texto={x.t('travel.sortPrice')} activo={orden === 'precio'} onPress={() => setOrden('precio')} />
        <Chip texto={x.t('travel.filters')} icono="options-outline" activo={!!maximo || !!clima} onPress={() => setFiltros(true)} />
      </View>
      {lista.length === 0 ? (
        <EstadoVacio icono="search-outline" titulo={x.t('travel.noResults')} texto={x.t('travel.noResultsText')} cta={x.t('travel.clearFilters')} onCta={() => { setMaximo(null); setClima(null); }} />
      ) : (
        <View style={e.rejilla}>
          {lista.map((d) => (
            <View key={d.id} style={e.celda}>
              <TarjetaDestino destino={d} compacta onPress={() => ir('destino', d.id)} favorito={favoritos.includes(d.id)} onFavorito={() => alternarFavorito(d.id)} />
            </View>
          ))}
        </View>
      )}
      <HojaInferior visible={filtros} onCerrar={() => setFiltros(false)} titulo={x.t('travel.filters')}>
        <PanelDeFiltros maximo={maximo} onMaximo={setMaximo} clima={clima} onClima={setClima} />
        <Boton texto={x.t('travel.applyFilters')} onPress={() => setFiltros(false)} />
      </HojaInferior>
    </MarcoDeTravel>
  );
};

const e = StyleSheet.create({
  bloque: { gap: 12 },
  carril: { gap: 12, paddingVertical: 4, paddingHorizontal: 1 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 16, borderWidth: 1, borderColor: TRAVEL.borde, paddingHorizontal: 14, backgroundColor: TRAVEL.fondo },
  barraTexto: { flex: 1, fontSize: 15, color: TRAVEL.gris },
  campoBusqueda: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 16, borderWidth: 1.5, borderColor: TRAVEL.morado, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 16, color: TRAVEL.tinta },
  temas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  temasChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tema: { width: '30.5%', minWidth: 92, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 16, backgroundColor: TRAVEL.lilaSuave, alignItems: 'center', gap: 6, flexGrow: 1 },
  temaTexto: { fontSize: 12, fontWeight: '700', color: TRAVEL.tinta, textAlign: 'center' },
  coleccion: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderRadius: 18, borderWidth: 1, borderColor: TRAVEL.borde },
  colFoto: { width: 84, height: 84, borderRadius: 14 },
  colTextos: { flex: 1, minWidth: 0, gap: 3 },
  colTitulo: { fontSize: 15, fontWeight: '800', color: TRAVEL.tinta },
  colSub: { fontSize: 12, color: TRAVEL.gris, lineHeight: 17 },
  colMeta: { fontSize: 12, fontWeight: '700', color: TRAVEL.morado },
  etiqueta: { fontSize: 13, fontWeight: '800', color: TRAVEL.tinta },
  portadaCol: { height: 160, borderRadius: 20 },
  filaAcciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  celda: { width: '50%', padding: 6, minWidth: 150 },
});
