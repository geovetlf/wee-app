import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MarcoDeTravel from '../../components/travel/MarcoDeTravel';
import { AvisoDemo, Boton, Chip, Fila, Fotografia, SelloDemo, Tarjeta, TituloDeSeccion } from '../../components/travel/Piezas';
import { TarjetaLugar } from '../../components/travel/Tarjetas';
import CajaDePrompt from '../../components/creator/CajaDePrompt';
import { TRAVEL } from '../../components/travel/tema';
import { useDireccion } from '../../hooks/useDireccion';
import { useTravelDemo } from '../../hooks/useTravelDemo';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { CONVERSACIONES_DEMO, LUGARES, SUGERENCIAS_DEL_ASISTENTE, TEMAS_DE_SABER, CategoriaDeLugar, destinoPorId } from '../../constants/travelDemo';
import { useTravelNav } from './rutas';

/*
 * 5 · ASISTENTE DE VIAJE — su propio espacio, pero NO otra inteligencia: cada caja de esta sección es Weë Brain
 * (CLAUDE.md §10). Escribir y enviar abre la conversación de siempre con el viaje activo como contexto; las
 * conversaciones de ejemplo están marcadas DEMO y ninguna respuesta se inventa aquí.
 */

type Icono = React.ComponentProps<typeof Ionicons>['name'];

/** El contexto que viaja con lo que se escribe: el viaje activo, si lo hay. */
const useContexto = () => {
  const x = useTextosDeTravel();
  const { viajeActivoDatos } = useTravelDemo();
  const texto = viajeActivoDatos ? x.t('travel.brainCtxTrip', { viaje: x.nombreDeViaje(viajeActivoDatos), fechas: x.fechasDeViaje(viajeActivoDatos) }) : '';
  const con = (pedido: string) => (texto ? `${texto} ${pedido}` : pedido);
  return { viaje: viajeActivoDatos, con };
};

export const SelectorDeContexto: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir } = useTravelNav();
  const { viaje } = useContexto();
  return (
    <Fila
      icono="briefcase-outline"
      titulo={viaje ? x.nombreDeViaje(viaje) : x.t('travel.noActiveTrip')}
      subtitulo={viaje ? x.t('travel.assistantContextOn', { fechas: x.fechasDeViaje(viaje) }) : x.t('travel.noActiveTripText')}
      onPress={() => ir('contexto')}
    />
  );
};

export const AsistenteScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir, preguntarABrain } = useTravelNav();
  const { con } = useContexto();
  const [texto, setTexto] = useState('');
  const enviar = (pedido: string) => { if (pedido.trim()) preguntarABrain(con(pedido.trim())); };
  const HERRAMIENTAS: { id: 'traductor' | 'vision' | 'local' | 'saber' | 'voz'; icono: string; titulo: string; sub: string }[] = [
    { id: 'traductor', icono: 'language-outline', titulo: 'travel.translator', sub: 'travel.translatorSub' },
    { id: 'vision', icono: 'scan-outline', titulo: 'travel.visual', sub: 'travel.visualSub' },
    { id: 'local', icono: 'locate-outline', titulo: 'travel.localAssistant', sub: 'travel.localAssistantSub' },
    { id: 'saber', icono: 'book-outline', titulo: 'travel.knowledge', sub: 'travel.knowledgeSub' },
    { id: 'voz', icono: 'mic-outline', titulo: 'travel.voice', sub: 'travel.voiceSub' },
  ];
  return (
    <MarcoDeTravel titulo={x.t('travel.modAssistant')} subtitulo={x.t('travel.assistantSub')} icono="chatbubble-ellipses-outline" sinBrain>
      <View style={a.bienvenida}>
        <Fotografia foto="mascota" icono="happy-outline" estilo={a.mascota} />
        <View style={a.flex}>
          <Text style={a.saludo}>{x.t('travel.assistantHello')}</Text>
          <Text style={a.texto}>{x.t('travel.assistantHelloText')}</Text>
        </View>
      </View>
      <SelectorDeContexto />
      <CajaDePrompt
        valor={texto}
        onCambiar={setTexto}
        onEnviar={() => enviar(texto)}
        etiquetaEnviar={x.t('travel.sendToBrain')}
        placeholder={x.t('travel.assistantPlaceholder')}
        acciones={[
          { icono: 'mic-outline', etiqueta: x.t('travel.voice'), alPulsar: () => ir('voz') },
          { icono: 'camera-outline', etiqueta: x.t('travel.takePhoto'), alPulsar: () => ir('vision', 'camara') },
          { icono: 'image-outline', etiqueta: x.t('travel.attachImage'), alPulsar: () => ir('vision') },
          { icono: 'location-outline', etiqueta: x.t('travel.localAssistant'), alPulsar: () => ir('local') },
        ]}
      />
      <Text style={a.nota}>{x.t('travel.assistantBrainNote')}</Text>
      <View style={a.chips}>{SUGERENCIAS_DEL_ASISTENTE.map((s) => <Chip key={s} texto={x.t(s)} icono="sparkles-outline" onPress={() => enviar(x.t(s))} />)}</View>
      <View style={a.bloque}>
        <TituloDeSeccion titulo={x.t('travel.assistantTools')} />
        <View style={a.rejilla}>
          {HERRAMIENTAS.map((h) => (
            <TouchableOpacity key={h.id} style={a.herramienta} onPress={() => ir(h.id)} accessibilityRole="button" activeOpacity={0.85}>
              <View style={a.icono}><Ionicons name={h.icono as Icono} size={22} color={TRAVEL.morado} /></View>
              <Text style={a.herrTitulo} numberOfLines={2}>{x.t(h.titulo)}</Text>
              <Text style={a.herrSub} numberOfLines={3}>{x.t(h.sub)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={a.bloque}>
        <View style={a.filaTitulo}><TituloDeSeccion titulo={x.t('travel.pastConversations')} /><SelloDemo /></View>
        {CONVERSACIONES_DEMO.map((c) => <Fila key={c.id} icono="chatbubbles-outline" titulo={x.t(c.titulo)} subtitulo={x.nombreDestino(destinoPorId(c.destino))} onPress={() => ir('chat', c.id)} />)}
      </View>
    </MarcoDeTravel>
  );
};

export const ChatScreen: React.FC<{ id?: string }> = ({ id }) => {
  const x = useTextosDeTravel();
  const dir = useDireccion();
  const { preguntarABrain } = useTravelNav();
  const { con } = useContexto();
  const [texto, setTexto] = useState('');
  const conv = CONVERSACIONES_DEMO.find((c) => c.id === id) ?? CONVERSACIONES_DEMO[0];
  return (
    <MarcoDeTravel titulo={x.t(conv.titulo)} subtitulo={x.t('travel.travelChat')} icono="chatbubbles-outline" demo sinBrain>
      <AvisoDemo texto={x.t('travel.demoChatNote')} />
      <View style={a.chat}>
        {conv.mensajes.map((m, i) => (
          <View key={m} style={[a.burbuja, i % 2 === 0 ? [a.mia, dir.esRTL ? { alignSelf: 'flex-start' } : null] : [a.suya, dir.esRTL ? { alignSelf: 'flex-end' } : null]]}>
            {i % 2 === 1 && <Text style={a.autor}>{x.t('travel.brainName')}</Text>}
            <Text style={[a.burbujaTexto, i % 2 === 0 && { color: '#FFFFFF' }]}>{x.t(m)}</Text>
          </View>
        ))}
      </View>
      <CajaDePrompt
        valor={texto}
        onCambiar={setTexto}
        onEnviar={() => { if (texto.trim()) preguntarABrain(con(texto.trim())); }}
        etiquetaEnviar={x.t('travel.sendToBrain')}
        placeholder={x.t('travel.continueWithBrain')}
      />
    </MarcoDeTravel>
  );
};

export const ContextoScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { volver } = useTravelNav();
  const { viajes, viajeActivo, elegirViajeActivo } = useTravelDemo();
  return (
    <MarcoDeTravel titulo={x.t('travel.assistantContext')} subtitulo={x.t('travel.assistantContextSub')} icono="briefcase-outline" demo sinBrain>
      <Fila icono={viajeActivo === null ? 'radio-button-on' : 'radio-button-off'} titulo={x.t('travel.noTripContext')} onPress={() => elegirViajeActivo(null)} />
      {viajes.map((v) => <Fila key={v.id} icono={viajeActivo === v.id ? 'radio-button-on' : 'radio-button-off'} titulo={x.nombreDeViaje(v)} subtitulo={x.fechasDeViaje(v)} onPress={() => elegirViajeActivo(v.id)} />)}
      <Boton texto={x.t('travel.done')} icono="checkmark" onPress={volver} />
    </MarcoDeTravel>
  );
};

const INTENCIONES: { id: string; icono: string; titulo: string; cats: CategoriaDeLugar[] }[] = [
  { id: 'comer', icono: 'restaurant-outline', titulo: 'travel.intentEat', cats: ['restaurantes'] },
  { id: 'ver', icono: 'camera-outline', titulo: 'travel.intentSee', cats: ['atracciones', 'museos'] },
  { id: 'relajar', icono: 'leaf-outline', titulo: 'travel.intentRelax', cats: ['parques', 'naturaleza'] },
  { id: 'lluvia', icono: 'rainy-outline', titulo: 'travel.intentRain', cats: ['museos', 'compras'] },
  { id: 'noche', icono: 'moon-outline', titulo: 'travel.intentNight', cats: ['nocturna', 'restaurantes'] },
];

export const LocalScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { ir, preguntarABrain } = useTravelNav();
  const { con } = useContexto();
  const [intencion, setIntencion] = useState(INTENCIONES[0].id);
  const elegida = INTENCIONES.find((i) => i.id === intencion) ?? INTENCIONES[0];
  const lista = LUGARES.filter((l) => elegida.cats.includes(l.categoria));
  return (
    <MarcoDeTravel titulo={x.t('travel.localAssistant')} subtitulo={x.t('travel.localQuestion')} icono="locate-outline" demo sinBrain>
      <AvisoDemo texto={x.t('travel.demoLocationNote')} />
      <View style={a.chips}>{INTENCIONES.map((i) => <Chip key={i.id} texto={x.t(i.titulo)} icono={i.icono} activo={intencion === i.id} onPress={() => setIntencion(i.id)} />)}</View>
      {lista.map((l) => <TarjetaLugar key={l.id} lugar={l} onPress={() => ir('lugar', l.id)} />)}
      <Boton texto={x.t('travel.askBrainAround')} icono="sparkles" variante="dorado" onPress={() => preguntarABrain(con(x.t('travel.brainCtxAround', { que: x.t(elegida.titulo) })))} />
    </MarcoDeTravel>
  );
};

export const SaberScreen: React.FC = () => {
  const x = useTextosDeTravel();
  const { preguntarABrain } = useTravelNav();
  const { viaje, con } = useContexto();
  const [abierto, setAbierto] = useState<string | null>(TEMAS_DE_SABER[0].id);
  const lugar = viaje ? x.nombreDeViaje(viaje) : x.t('travel.yourDestination');
  return (
    <MarcoDeTravel titulo={x.t('travel.knowledge')} subtitulo={x.t('travel.knowledgeFor', { lugar })} icono="book-outline" demo sinBrain>
      <AvisoDemo texto={x.t('travel.demoKnowledgeNote')} />
      {TEMAS_DE_SABER.map((k) => (
        <Tarjeta key={k.id}>
          <TouchableOpacity style={a.tema} onPress={() => setAbierto(abierto === k.id ? null : k.id)} accessibilityRole="button" accessibilityState={{ expanded: abierto === k.id }}>
            <Ionicons name={k.icono as Icono} size={20} color={TRAVEL.morado} />
            <Text style={a.temaTitulo}>{x.t(k.titulo)}</Text>
            <Ionicons name={abierto === k.id ? 'chevron-up' : 'chevron-down'} size={18} color={TRAVEL.gris} />
          </TouchableOpacity>
          {abierto === k.id && (
            <>
              <Text style={a.texto}>{x.t(k.texto)}</Text>
              <Boton texto={x.t('travel.askMore')} icono="sparkles-outline" variante="suave" pequeno onPress={() => preguntarABrain(con(x.t('travel.brainCtxKnowledge', { tema: x.t(k.titulo), lugar })))} />
            </>
          )}
        </Tarjeta>
      ))}
    </MarcoDeTravel>
  );
};

const a = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 4 },
  bloque: { gap: 12 },
  bienvenida: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: TRAVEL.lilaSuave },
  mascota: { width: 78, height: 78, borderRadius: 20 },
  saludo: { fontSize: 18, fontWeight: '800', color: TRAVEL.tinta },
  texto: { fontSize: 13, lineHeight: 19, color: TRAVEL.texto },
  nota: { fontSize: 12, lineHeight: 17, color: TRAVEL.gris, marginTop: -10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  herramienta: { width: '47%', flexGrow: 1, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: TRAVEL.borde, gap: 6 },
  icono: { width: 40, height: 40, borderRadius: 13, backgroundColor: TRAVEL.lilaSuave, alignItems: 'center', justifyContent: 'center' },
  herrTitulo: { fontSize: 14, fontWeight: '800', color: TRAVEL.tinta },
  herrSub: { fontSize: 12, lineHeight: 16, color: TRAVEL.gris },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chat: { gap: 10 },
  burbuja: { maxWidth: '86%', padding: 12, borderRadius: 18, gap: 4 },
  mia: { alignSelf: 'flex-end', backgroundColor: TRAVEL.morado, borderBottomRightRadius: 6 },
  suya: { alignSelf: 'flex-start', backgroundColor: TRAVEL.lilaSuave, borderBottomLeftRadius: 6 },
  autor: { fontSize: 11, fontWeight: '800', color: TRAVEL.morado },
  burbujaTexto: { fontSize: 14, lineHeight: 20, color: TRAVEL.tinta },
  tema: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  temaTitulo: { flex: 1, fontSize: 15, fontWeight: '800', color: TRAVEL.tinta },
});
