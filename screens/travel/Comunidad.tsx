import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { AvisoDemo, Boton, Campo, Chip, EstadoCarga, EstadoError, EstadoVacio, FilaDeChips, Fila, Pestanas, SelloDemo, Tarjeta, TituloDeSeccion } from '../../components/travel/Piezas';
import { GaleriaFotos, TarjetaActividad, TarjetaViajeCompartido, VistaMapa } from '../../components/travel/Tarjetas';
import { SugerenciaIA } from '../../components/travel/Brain';
import PostCard from '../../components/PostCard';
import { TRAVEL } from '../../components/travel/tema';
import { useAuth } from '../../contexts/AuthContext';
import { useEnEspacioProfesional } from '../../contexts/EspacioProfesionalContext';
import { useDireccion } from '../../hooks/useDireccion';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { postsService, Post } from '../../services/firestoreService';
import { paginaDeLaSeccion, sobreconsulta } from '../../utils/sectionFeed';
import { CATEGORIAS, DESTINOS, ITINERARIOS_COMPARTIDOS, LUGARES, ViajeDemo, destinoPorId } from '../../constants/travelDemo';
import { estadoDe, generarItinerario, nuevoId } from '../../utils/travelItinerario';
import { useTravelNav } from './rutas';

/*
 * 6 · COMUNIDAD Y RECUERDOS — sobre el sistema social de siempre, sin uno paralelo.
 *
 * El muro son publicaciones REALES de Weë filtradas por la sección Travel (utils/sectionFeed.ts, la misma lectura del
 * muro general): se pintan con `PostCard`, con sus me gusta, comentarios, guardados, identidades y privacidad tal
 * como son. Publicar abre el compositor de siempre (`Create`, sección travel); los Weëls son los de siempre. Los
 * itinerarios compartidos, el diario, los álbumes y el resumen son DEMO y lo dicen.
 *
 * EN WEË CREATOR, SOLO RECUERDOS (decisión del dueño, 2026-11-06). Creator no tiene nada social: dentro de su marco
 * (`useEnEspacioProfesional()`, el mismo mecanismo que las ramas `pro` de las demás pantallas) este módulo enseña solo
 * lo personal —diario, álbumes, vídeos, mapa y resumen— y un botón para ver las publicaciones en la versión app. No se
 * lee el muro, ni se publica, ni hay WeeTalk ni Weëls. En la versión app el módulo es exactamente el de siempre.
 */

const useMuroDeTravel = (activo = true) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>(activo ? 'cargando' : 'listo');
  const cargar = useCallback(async () => {
    if (!activo) return;
    setEstado('cargando');
    try {
      const pagina = await paginaDeLaSeccion((desde) => postsService.getPublicPostsPaginated(sobreconsulta(12), desde as never), 'travel', 12);
      setPosts(pagina.visibles);
      setEstado('listo');
    } catch (e) {
      console.warn('WeëTravel: no se pudo leer el muro de la sección', e);
      setEstado('error');
    }
  }, [activo]);
  useEffect(() => { cargar(); }, [cargar]);
  return { posts, estado, cargar };
};

export const ComunidadScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const dir = useDireccion();
  const { user } = useAuth();
  const { ir, navigation } = useTravelNav();
  const enCreator = useEnEspacioProfesional();
  const { posts, estado, cargar } = useMuroDeTravel(!enCreator);
  const [pestana, setPestana] = useState<'muro' | 'descubrir' | 'itinerarios' | 'recuerdos'>('muro');
  const [filtro, setFiltro] = useState<string | null>(id && destinoPorId(id) ? id : null);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase(x.locale);
  const destinoFiltro = destinoPorId(filtro ?? undefined);
  const visibles = destinoFiltro ? posts.filter((p) => [x.nombreDestino(destinoFiltro), x.pais(destinoFiltro.pais)].some((n) => norm(p.content || '').includes(norm(n)))) : posts;
  const publicar = () => (user ? navigation.navigate('Create', { kind: 'post', sourceSection: 'travel' }) : navigation.navigate('Login'));
  const abrir = (p: Post) => navigation.navigate('PostDetail', { postId: p.id, post: p });
  const mensaje = (userId: string, userData?: object) => {
    if (!user || user.uid === userId) return;
    navigation.navigate('Main', { screen: 'Inbox', params: { screen: 'Conversation', params: { otherUserId: userId, otherUserData: userData } } });
  };
  if (enCreator) {
    /*
     * Las publicaciones se ven en la versión app: se sale como lo hace el selector de versión, pero a este mismo
     * módulo, en la pila principal (la de creator también tiene `Travel` y se quedaría dentro).
     */
    const verEnLaApp = () => (navigation.getParent() ?? navigation).navigate('Travel', { pantalla: 'comunidad' });
    return (
      <MarcoDeTravel titulo={x.t('travel.memories')} subtitulo={x.t('travel.memoriesSub')} icono="images-outline" contextoBrain={x.t('travel.brainCtxCommunity')}>
        <EntradaARecuerdos />
        <Tarjeta>
          <TituloDeSeccion titulo={x.t('travel.feed')} subtitulo={x.t('travel.communitySub')} />
          <Boton texto={x.t('profesional.switchToApp')} icono="phone-portrait-outline" variante="suave" onPress={verEnLaApp} />
        </Tarjeta>
      </MarcoDeTravel>
    );
  }
  return (
    <MarcoDeTravel titulo={x.t('travel.modCommunity')} subtitulo={x.t('travel.communitySub')} icono="people-outline" contextoBrain={x.t('travel.brainCtxCommunity')}>
      <View style={c.acciones}>
        <Boton texto={x.t('travel.shareExperience')} icono="add" onPress={publicar} estilo={c.crecer} />
        <Boton texto={x.t('travel.weels')} icono="play-circle-outline" variante="suave" onPress={() => navigation.navigate('Reels')} />
      </View>
      <Pestanas
        activa={pestana}
        onCambiar={(v) => setPestana(v as typeof pestana)}
        opciones={[
          { id: 'muro', texto: x.t('travel.feed') },
          { id: 'descubrir', texto: x.t('travel.byDestination') },
          { id: 'itinerarios', texto: x.t('travel.sharedItineraries') },
          { id: 'recuerdos', texto: x.t('travel.memories') },
        ]}
      />
      {pestana === 'muro' && (
        <>
          {!!destinoFiltro && <Chip texto={x.t('travel.filteredBy', { lugar: x.nombreDestino(destinoFiltro) })} icono="close" activo onPress={() => setFiltro(null)} />}
          {estado === 'cargando' && <EstadoCarga texto={x.t('travel.loadingFeed')} />}
          {estado === 'error' && <EstadoError texto={x.t('travel.feedError')} onReintentar={cargar} />}
          {estado === 'listo' && visibles.length === 0 && <EstadoVacio icono="images-outline" titulo={x.t('travel.feedEmpty')} texto={x.t('travel.feedEmptyText')} cta={x.t('travel.shareExperience')} onCta={publicar} />}
          {estado === 'listo' && visibles.map((p) => (
            <View key={p.id} style={c.post}>
              <PostCard post={p} onComment={() => abrir(p)} onPrivateMessage={mensaje} onPress={abrir} isVisible />
            </View>
          ))}
        </>
      )}
      {pestana === 'descubrir' && (
        <>
          <Text style={c.etiqueta}>{x.t('travel.byCountryCity')}</Text>
          <View style={c.chips}>{DESTINOS.map((d) => <Chip key={d.id} texto={`${x.nombreDestino(d)} · ${x.pais(d.pais)}`} activo={filtro === d.id} onPress={() => { setFiltro(d.id); setPestana('muro'); }} />)}</View>
          <Text style={c.etiqueta}>{x.t('travel.byExperience')}</Text>
          <View style={c.chips}>{CATEGORIAS.map((k) => <Chip key={k.id} texto={x.t(k.titulo)} icono={k.icono} onPress={() => ir('coleccion', `cat-${k.id}`)} />)}</View>
        </>
      )}
      {pestana === 'itinerarios' && (
        <>
          <View style={c.filaTitulo}><TituloDeSeccion titulo={x.t('travel.sharedItineraries')} subtitulo={x.t('travel.sharedItinerariesSub')} /><SelloDemo /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[c.carril, dir.contenedor]}>
            {ITINERARIOS_COMPARTIDOS.map((s) => {
              const d = destinoPorId(s.destino);
              return d ? <TarjetaViajeCompartido key={s.id} autor={s.autor} destino={d} dias={s.dias} guardados={s.guardados} onPress={() => ir('compartido', s.id)} /> : null;
            })}
          </ScrollView>
        </>
      )}
      {pestana === 'recuerdos' && <EntradaARecuerdos />}
    </MarcoDeTravel>
  );
};

const EntradaARecuerdos: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  return (
    <View style={c.bloque}>
      <Fila icono="journal-outline" titulo={x.t('travel.journal')} subtitulo={x.t('travel.journalSub')} onPress={() => ir('recuerdos', 'diario')} />
      <Fila icono="images-outline" titulo={x.t('travel.albums')} subtitulo={x.t('travel.albumsSub')} onPress={() => ir('recuerdos', 'albumes')} />
      <Fila icono="videocam-outline" titulo={x.t('travel.videoMemories')} subtitulo={x.t('travel.videoMemoriesSub')} onPress={() => ir('recuerdos', 'videos')} />
      <Fila icono="earth-outline" titulo={x.t('travel.travelMap')} subtitulo={x.t('travel.travelMapSub')} onPress={() => ir('recuerdos', 'mapa')} />
      <Fila icono="sparkles-outline" titulo={x.t('travel.aiRecap')} subtitulo={x.t('travel.aiRecapSub')} onPress={() => ir('recuerdos', 'resumen')} />
    </View>
  );
};

export const CompartidoScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { guardadosDeComunidad, alternarGuardadoDeComunidad, crearViaje, lugaresGuardados, alternarLugar } = useTravelDemo();
  const [hecho, setHecho] = useState<string | null>(null);
  const s = ITINERARIOS_COMPARTIDOS.find((k) => k.id === id);
  const d = destinoPorId(s?.destino);
  const [plantilla] = useState(() => generarItinerario(s ? [s.destino] : [], s?.dias ?? 3));
  if (!s || !d) return <MarcoDeTravel titulo={x.t('travel.sharedItineraries')} sinBrain><EstadoVacio icono="alert-circle-outline" titulo={x.t('travel.notFound')} cta={x.t('travel.modCommunity')} onCta={() => ir('comunidad')} /></MarcoDeTravel>;
  const duplicar = () => {
    const v: ViajeDemo = {
      id: nuevoId('viaje'), destinos: [d.id], inicio: '', dias: s.dias, flexible: true, borrador: true, compartido: false, adultos: 2, ninos: 0, edades: [],
      presupuesto: d.presupuestoDia * s.dias * 2, moneda: 'USD', estilos: [], preferencias: [], movilidad: ['caminar'], especiales: [],
      itinerario: plantilla.map((dd) => ({ ...dd, id: nuevoId('d'), actividades: dd.actividades.map((a) => ({ ...a, id: nuevoId('a') })) })),
      versiones: [], gastos: [], reservas: [], documentos: [], participantes: [], propuestas: [], notas: '',
      reparto: { alojamiento: 0, comida: 0, transporte: 0, actividades: 0, compras: 0, otros: 0 },
    };
    crearViaje(v);
    setHecho(v.id);
  };
  const importables = LUGARES.filter((l) => d.id === 'kyoto' && (l.categoria === 'atracciones' || l.categoria === 'restaurantes'));
  return (
    <MarcoDeTravel titulo={x.t('travel.sharedTitle', { lugar: x.nombreDestino(d), contador: s.dias })} subtitulo={x.t('travel.byAuthor', { nombre: s.autor })} icono="people-outline" demo sinBrain>
      <AvisoDemo texto={x.t('travel.demoSharedNote')} />
      <View style={c.acciones}>
        <Boton texto={x.t(guardadosDeComunidad.includes(s.id) ? 'travel.saved' : 'travel.save')} icono={guardadosDeComunidad.includes(s.id) ? 'heart' : 'heart-outline'} variante="suave" pequeno onPress={() => alternarGuardadoDeComunidad(s.id)} />
        <Boton texto={x.t('travel.duplicateInspiration')} icono="copy-outline" pequeno onPress={duplicar} desactivado={!!hecho} />
      </View>
      {!!hecho && <SugerenciaIA demo icono="checkmark-circle-outline" titulo={x.t('travel.duplicated')} texto={x.t('travel.duplicatedText')} accion={x.t('travel.openItinerary')} onAccion={() => ir('itinerario', hecho)} />}
      {importables.length > 0 && (
        <Tarjeta>
          <TituloDeSeccion titulo={x.t('travel.importPlaces')} subtitulo={x.t('travel.importPlacesSub')} />
          {importables.map((l) => <Fila key={l.id} icono={lugaresGuardados.includes(l.id) ? 'checkmark-circle' : 'add-circle-outline'} titulo={x.t(l.nombre)} onPress={() => alternarLugar(l.id)} />)}
        </Tarjeta>
      )}
      {plantilla.map((dd, i) => (
        <View key={dd.id} style={c.bloque}>
          <TituloDeSeccion titulo={x.t('travel.dayN', { n: i + 1 })} />
          {dd.actividades.map((a) => <TarjetaActividad key={a.id} actividad={a} moneda="USD" />)}
        </View>
      ))}
    </MarcoDeTravel>
  );
};

/* ── Recuerdos ──────────────────────────────────────────────────────────── */

export const RecuerdosScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const { ir, navigation, preguntarABrain } = useTravelNav();
  const { viajes, diario, escribirEnDiario, borrarDelDiario } = useTravelDemo();
  const [seccion, setSeccion] = useState(id && ['diario', 'albumes', 'videos', 'mapa', 'resumen'].includes(id) ? id : 'diario');
  const [texto, setTexto] = useState('');
  const pasados = viajes.filter((v) => estadoDe(v) === 'pasado' || estadoDe(v) === 'activo');
  const [viajeDiario, setViajeDiario] = useState(pasados[0]?.id ?? '');
  const paises = [...new Set(pasados.flatMap((v) => v.destinos.map((d) => destinoPorId(d)?.pais).filter(Boolean)))] as string[];
  const recapDe = pasados[0];
  return (
    <MarcoDeTravel titulo={x.t('travel.memories')} subtitulo={x.t('travel.memoriesSub')} icono="images-outline" demo sinBrain>
      <FilaDeChips>
        {[['diario', 'travel.journal'], ['albumes', 'travel.albums'], ['videos', 'travel.videoMemories'], ['mapa', 'travel.travelMap'], ['resumen', 'travel.aiRecap']].map(([k, clave]) => (
          <Chip key={k} texto={x.t(clave)} activo={seccion === k} onPress={() => setSeccion(k)} />
        ))}
      </FilaDeChips>
      {seccion === 'diario' && (
        <>
          {pasados.length === 0 ? <EstadoVacio icono="journal-outline" titulo={x.t('travel.noMemories')} texto={x.t('travel.noMemoriesText')} /> : (
            <Tarjeta>
              <View style={c.chips}>{pasados.map((v) => <Chip key={v.id} texto={x.nombreDeViaje(v)} activo={viajeDiario === v.id} onPress={() => setViajeDiario(v.id)} />)}</View>
              <Campo etiqueta={x.t('travel.journalEntry')} valor={texto} onCambiar={setTexto} multilinea placeholder={x.t('travel.journalPh')} />
              <Boton texto={x.t('travel.saveEntry')} icono="checkmark" desactivado={!texto.trim() || !viajeDiario} onPress={() => { escribirEnDiario(viajeDiario, new Date().toISOString().slice(0, 10), texto.trim()); setTexto(''); }} />
            </Tarjeta>
          )}
          {diario.length === 0 && pasados.length > 0 && <Text style={c.nota}>{x.t('travel.journalEmpty')}</Text>}
          {diario.map((e) => {
            const v = viajes.find((k) => k.id === e.viaje);
            return (
              <Tarjeta key={e.id}>
                <Text style={c.meta}>{v ? x.nombreDeViaje(v) : ''} · {x.fecha(e.fecha)}</Text>
                <Text style={c.parrafo}>{e.texto}</Text>
                <Boton texto={x.t('travel.delete')} icono="trash-outline" variante="peligro" pequeno onPress={() => borrarDelDiario(e.id)} />
              </Tarjeta>
            );
          })}
        </>
      )}
      {seccion === 'albumes' && (pasados.length === 0 ? <EstadoVacio icono="images-outline" titulo={x.t('travel.noMemories')} texto={x.t('travel.noMemoriesText')} /> : pasados.map((v) => {
        const d = destinoPorId(v.destinos[0]);
        return (
          <View key={v.id} style={c.bloque}>
            <TituloDeSeccion titulo={x.nombreDeViaje(v)} subtitulo={x.fechasDeViaje(v)} />
            <GaleriaFotos fotos={[d?.foto ?? null, null, null, d?.foto ?? null, null, null]} icono={d?.icono} />
          </View>
        );
      }))}
      {seccion === 'videos' && (
        <>
          <AvisoDemo texto={x.t('travel.videoMemoriesDemo')} />
          {pasados.map((v) => <Fila key={v.id} icono="videocam-outline" titulo={x.t('travel.videoOf', { viaje: x.nombreDeViaje(v) })} subtitulo={x.fechasDeViaje(v)} onPress={() => navigation.navigate('Studio')} />)}
          <Boton texto={x.t('travel.createInStudio')} icono="film-outline" onPress={() => navigation.navigate('Studio')} />
        </>
      )}
      {seccion === 'mapa' && (
        <>
          <VistaMapa lugares={[]} alto={200} conPosicion={false} />
          <TituloDeSeccion titulo={x.t('travel.countriesVisited', { contador: paises.length })} />
          <View style={c.chips}>{paises.map((p) => <Chip key={p} texto={x.pais(p)} icono="flag-outline" activo onPress={() => { const d = DESTINOS.find((k) => k.pais === p); if (d) ir('destino', d.id); }} />)}</View>
        </>
      )}
      {seccion === 'resumen' && (recapDe ? (
        <>
          <Tarjeta estilo={{ backgroundColor: TRAVEL.tinta, borderColor: TRAVEL.tinta }}>
            <SelloDemo />
            <Text style={c.recapTitulo}>{x.t('travel.recapTitle', { viaje: x.nombreDeViaje(recapDe) })}</Text>
            <Text style={c.recapTexto}>{x.t('travel.recapStats', { dias: x.t('travel.daysCount', { contador: recapDe.dias }), lugares: x.t('travel.placesCount', { contador: recapDe.itinerario.reduce((s2, d) => s2 + d.actividades.filter((a) => a.tipo === 'visita').length, 0) }) })}</Text>
          </Tarjeta>
          <Boton texto={x.t('travel.recapWithBrain')} icono="sparkles" variante="dorado" onPress={() => preguntarABrain(x.t('travel.brainCtxRecap', { viaje: x.nombreDeViaje(recapDe) }))} />
          <Boton texto={x.t('travel.createInStudio')} icono="film-outline" variante="suave" onPress={() => navigation.navigate('Studio')} />
        </>
      ) : <EstadoVacio icono="sparkles-outline" titulo={x.t('travel.noMemories')} texto={x.t('travel.noMemoriesText')} />)}
    </MarcoDeTravel>
  );
};

const c = StyleSheet.create({
  crecer: { flexGrow: 1 },
  bloque: { gap: 10 },
  acciones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  etiqueta: { fontSize: 14, fontWeight: '800', color: TRAVEL.tinta },
  carril: { gap: 12, paddingVertical: 4, paddingHorizontal: 1 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  post: { marginHorizontal: -16 },
  nota: { fontSize: 13, color: TRAVEL.gris },
  meta: { fontSize: 12, fontWeight: '700', color: TRAVEL.morado },
  parrafo: { fontSize: 14, lineHeight: 21, color: TRAVEL.tinta },
  recapTitulo: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  recapTexto: { fontSize: 14, lineHeight: 20, color: '#E5DEFF' },
});
