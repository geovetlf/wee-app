import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import IconoDireccional from '../IconoDireccional';
import { useDireccion } from '../../hooks/useDireccion';
import { useTextosDeTravel } from '../../hooks/useTextosDeTravel';
import { TRAVEL, SOMBRA_SUAVE } from './tema';
import { Fotografia, SelloDemo } from './Piezas';
import { useTonoDelModulo } from './tono';
import {
  ActividadDemo, CATEGORIAS_DE_LUGAR, DestinoDemo, DiaDemo, DocumentoDemo, ETIQUETAS, LugarDemo, TIPOS_DE_DOCUMENTO,
  ViajeDemo, destinoPorId, FotoDeTravel, POSICION_DEMO, metrosEntre,
} from '../../constants/travelDemo';
import { costeDelDia, estadoDe, diasHasta } from '../../utils/travelItinerario';

/*
 * WEËTRAVEL — LAS TARJETAS COMPARTIDAS (destino, lugar, viaje, día, actividad, ruta, presupuesto, clima, alerta,
 * recomendación, mapa, galería, viajero, viaje compartido y documento). Todas reciben datos DEMO tipados y resuelven
 * sus textos con el idioma activo.
 */

type Icono = React.ComponentProps<typeof Ionicons>['name'];

export const BotonFavorito: React.FC<{ activo: boolean; onPress: () => void; claro?: boolean }> = ({ activo, onPress, claro }) => {
  const { t } = useTextosDeTravel();
  return (
    <TouchableOpacity onPress={onPress} hitSlop={8} style={[c.favorito, claro && c.favoritoClaro]} accessibilityRole="button" accessibilityState={{ selected: activo }} accessibilityLabel={activo ? t('travel.unsave') : t('travel.save')}>
      <Ionicons name={activo ? 'heart' : 'heart-outline'} size={18} color={activo ? TRAVEL.morado : claro ? TRAVEL.tinta : '#FFFFFF'} />
    </TouchableOpacity>
  );
};

export const TarjetaDestino: React.FC<{ destino: DestinoDemo; onPress: () => void; favorito?: boolean; onFavorito?: () => void; ancho?: number; compacta?: boolean }> = ({ destino, onPress, favorito, onFavorito, ancho, compacta }) => {
  const x = useTextosDeTravel();
  const dir = useDireccion();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[c.destino, ancho ? { width: ancho } : null]} accessibilityRole="button" accessibilityLabel={`${x.nombreDestino(destino)}, ${x.pais(destino.pais)}`}>
      <Fotografia foto={destino.foto} icono={destino.icono} estilo={[c.destinoFoto, compacta && c.destinoFotoCompacta]}>
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(12,8,30,0.72)']} style={c.velo} pointerEvents="none" />
        {!!onFavorito && <View style={[c.esquina, dir.alFinal(10)]}><BotonFavorito activo={!!favorito} onPress={onFavorito} /></View>}
        <View style={c.destinoTextos}>
          <Text style={c.destinoNombre} numberOfLines={1}>{x.nombreDestino(destino)}</Text>
          <View style={c.filaMini}>
            <Ionicons name="location-outline" size={13} color="#FFFFFF" />
            <Text style={c.destinoPais} numberOfLines={1}>{x.pais(destino.pais)}</Text>
          </View>
        </View>
      </Fotografia>
      {!compacta && (
        <View style={c.destinoPie}>
          <Text style={c.destinoEtiqueta} numberOfLines={1}>{x.t(ETIQUETAS[destino.etiquetas[0]])}</Text>
          <Text style={c.destinoPrecio} numberOfLines={1}>{x.t('travel.perDay', { precio: x.dinero(destino.presupuestoDia, 'USD') })}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const TarjetaLugar: React.FC<{ lugar: LugarDemo; onPress: () => void; guardado?: boolean; onGuardar?: () => void }> = ({ lugar, onPress, guardado, onGuardar }) => {
  const x = useTextosDeTravel();
  const cat = CATEGORIAS_DE_LUGAR.find((k) => k.id === lugar.categoria);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={c.lugar} accessibilityRole="button">
      <Fotografia foto={lugar.foto} icono={cat?.icono ?? 'location-outline'} estilo={c.lugarFoto} tamanoIcono={22} />
      <View style={c.lugarTextos}>
        <Text style={c.lugarNombre} numberOfLines={2}>{x.t(lugar.nombre)}</Text>
        <Text style={c.lugarMeta} numberOfLines={1}>{x.t(cat?.titulo ?? 'travel.pcAttractions')} · {x.distancia(metrosEntre(POSICION_DEMO, lugar))}</Text>
        <View style={c.filaMini}>
          <Ionicons name="star" size={12} color={TRAVEL.dorado} />
          <Text style={c.lugarMeta}>{x.formato.numero(lugar.valoracion, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
          <Text style={[c.lugarMeta, { color: lugar.abierto ? TRAVEL.exito : TRAVEL.peligro }]}>· {x.t(lugar.abierto ? 'travel.openNow' : 'travel.closedNow')}</Text>
        </View>
      </View>
      {!!onGuardar && <BotonFavorito activo={!!guardado} onPress={onGuardar} claro />}
    </TouchableOpacity>
  );
};

export const TarjetaViaje: React.FC<{ viaje: ViajeDemo; onPress: () => void; ancho?: number }> = ({ viaje, onPress, ancho }) => {
  const x = useTextosDeTravel();
  const dir = useDireccion();
  const dest = destinoPorId(viaje.destinos[0]);
  const estado = estadoDe(viaje);
  const linea = estado === 'proximo' ? x.t('travel.inDays', { contador: diasHasta(viaje.inicio) })
    : estado === 'activo' ? x.t('travel.statusActive')
    : estado === 'pasado' ? x.t('travel.statusPast') : x.t('travel.statusDraft');
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[c.viaje, ancho ? { width: ancho } : null]} accessibilityRole="button">
      <Fotografia foto={dest?.foto} icono={dest?.icono ?? 'airplane-outline'} estilo={c.viajeFoto}>
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(12,8,30,0.7)']} style={c.velo} pointerEvents="none" />
        <View style={[c.estado, dir.alInicio(10), estado === 'activo' && { backgroundColor: TRAVEL.morado }]}><Text style={[c.estadoTexto, estado === 'activo' && { color: '#FFFFFF' }]} numberOfLines={1}>{linea}</Text></View>
        <View style={c.destinoTextos}>
          <View style={c.filaMini}>
            <Ionicons name="location-outline" size={14} color="#FFFFFF" />
            <Text style={c.destinoNombre} numberOfLines={1}>{x.nombreDeViaje(viaje)}</Text>
          </View>
        </View>
      </Fotografia>
      <View style={c.viajePie}>
        <Text style={c.viajeFechas} numberOfLines={1}>{x.fechasDeViaje(viaje)}</Text>
        <Text style={c.viajeMeta} numberOfLines={1}>{x.t('travel.daysCount', { contador: viaje.dias })} · {x.t('travel.travelersCount', { contador: viaje.adultos + viaje.ninos })}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const TarjetaDiaItinerario: React.FC<{ dia: DiaDemo; numero: number; fecha?: string; moneda: string; onPress: () => void; activo?: boolean }> = ({ dia, numero, fecha, moneda, onPress, activo }) => {
  const x = useTextosDeTravel();
  const { tono } = useTonoDelModulo();
  return (
    <TouchableOpacity onPress={onPress} style={[c.dia, { backgroundColor: activo ? tono.fuerte : tono.suave }]} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ selected: !!activo }}>
      <Text style={[c.diaNumero, activo && { color: '#FFFFFF' }]}>{x.t('travel.dayN', { n: numero })}</Text>
      {!!fecha && <Text style={[c.diaFecha, activo && { color: '#EDE3FF' }]} numberOfLines={1}>{fecha}</Text>}
      <Text style={[c.diaFecha, activo && { color: '#EDE3FF' }]} numberOfLines={1}>{x.dinero(costeDelDia(dia), moneda)}</Text>
    </TouchableOpacity>
  );
};

const ICONO_DE_TIPO: Record<ActividadDemo['tipo'], Icono> = { visita: 'camera-outline', comida: 'restaurant-outline', traslado: 'walk-outline', descanso: 'cafe-outline' };

export const TarjetaActividad: React.FC<{ actividad: ActividadDemo; moneda: string; onPress?: () => void; resaltada?: boolean; children?: React.ReactNode }> = ({ actividad, moneda, onPress, resaltada, children }) => {
  const x = useTextosDeTravel();
  const cuerpo = (
    <>
      <View style={c.actHora}>
        <Text style={c.actHoraTexto}>{x.hora(actividad.inicio)}</Text>
        <View style={c.actLinea} />
      </View>
      <View style={[c.actCaja, resaltada && c.actCajaResaltada]}>
        <View style={c.actFila}>
          <View style={c.actIcono}><Ionicons name={ICONO_DE_TIPO[actividad.tipo]} size={17} color={TRAVEL.morado} /></View>
          <View style={c.actTextos}>
            <Text style={c.actTitulo} numberOfLines={2}>{x.actividad(actividad)}</Text>
            <Text style={c.actMeta} numberOfLines={2}>
              {x.duracion(actividad.duracion)}
              {actividad.distanciaKm > 0 ? ` · ${x.distancia(actividad.distanciaKm * 1000)}` : ''}
              {actividad.coste > 0 ? ` · ${x.dinero(actividad.coste, moneda)}` : ''}
            </Text>
          </View>
          {actividad.bloqueada && <Ionicons name="lock-closed" size={16} color={TRAVEL.morado} accessibilityLabel={x.t('travel.locked')} />}
        </View>
        {!!actividad.nota && <Text style={c.actNota}>{actividad.nota}</Text>}
        {children}
      </View>
    </>
  );
  return onPress ? (
    <TouchableOpacity style={c.act} onPress={onPress} activeOpacity={0.85} accessibilityRole="button">{cuerpo}</TouchableOpacity>
  ) : <View style={c.act}>{cuerpo}</View>;
};

export const TarjetaRuta: React.FC<{ titulo: string; metros: number; minutos: number; icono: string; activa?: boolean; onPress: () => void; nota?: string }> = ({ titulo, metros, minutos, icono, activa, onPress, nota }) => {
  const x = useTextosDeTravel();
  const { tono } = useTonoDelModulo();
  return (
    <TouchableOpacity onPress={onPress} style={[c.ruta, activa && { backgroundColor: tono.fuerte, borderColor: tono.fuerte }]} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ selected: !!activa }}>
      <Ionicons name={icono as Icono} size={20} color={activa ? '#FFFFFF' : tono.fuerte} />
      <View style={c.flex}>
        <Text style={[c.rutaTitulo, activa && { color: '#FFFFFF' }]} numberOfLines={1}>{titulo}</Text>
        <Text style={[c.rutaMeta, activa && { color: '#EDE3FF' }]} numberOfLines={1}>{x.duracion(minutos)} · {x.distancia(metros)}{nota ? ` · ${nota}` : ''}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const TarjetaPresupuesto: React.FC<{ gastado: number; total: number; moneda: string; titulo?: string }> = ({ gastado, total, moneda, titulo }) => {
  const x = useTextosDeTravel();
  const parte = total > 0 ? Math.min(1, gastado / total) : 0;
  const pasado = gastado > total;
  return (
    <View style={c.presupuesto}>
      <Text style={c.presTitulo}>{titulo ?? x.t('travel.budget')}</Text>
      <Text style={c.presCifra}>{x.dinero(gastado, moneda)} <Text style={c.presDe}>{x.t('travel.ofTotal', { total: x.dinero(total, moneda) })}</Text></Text>
      <View style={c.barra}><View style={[c.barraRelleno, { width: `${parte * 100}%`, backgroundColor: pasado ? TRAVEL.peligro : TRAVEL.morado }]} /></View>
      <Text style={[c.presDe, pasado && { color: TRAVEL.peligro }]}>{pasado ? x.t('travel.overBudget', { cantidad: x.dinero(gastado - total, moneda) }) : x.t('travel.leftBudget', { cantidad: x.dinero(total - gastado, moneda) })}</Text>
    </View>
  );
};

const CLAVE_DE_CLIMA = { calido: 'travel.climateWarm', templado: 'travel.climateMild', frio: 'travel.climateCold' } as const;

export const TarjetaClima: React.FC<{ destino: DestinoDemo }> = ({ destino }) => {
  const x = useTextosDeTravel();
  const icono: Icono = destino.clima === 'calido' ? 'sunny-outline' : destino.clima === 'frio' ? 'snow-outline' : 'partly-sunny-outline';
  return (
    <View style={c.clima}>
      <Ionicons name={icono} size={28} color={TRAVEL.morado} />
      <View style={c.flex}>
        <Text style={c.rutaTitulo}>{x.temperatura(destino.temperatura)} · {x.t(CLAVE_DE_CLIMA[destino.clima])}</Text>
        <Text style={c.rutaMeta}>{x.t('travel.bestSeasonValue', { meses: x.meses(destino.mejoresMeses) })}</Text>
      </View>
      <SelloDemo />
    </View>
  );
};

export const AlertaViaje: React.FC<{ icono: string; titulo: string; texto: string; tono?: 'info' | 'aviso' | 'peligro' }> = ({ icono, titulo, texto, tono = 'info' }) => {
  const color = tono === 'peligro' ? TRAVEL.peligro : tono === 'aviso' ? TRAVEL.aviso : TRAVEL.morado;
  return (
    <View style={[c.alerta, { borderColor: color + '33' }]} accessibilityRole="alert">
      <Ionicons name={icono as Icono} size={20} color={color} />
      <View style={c.flex}>
        <Text style={[c.rutaTitulo, { color }]}>{titulo}</Text>
        <Text style={c.rutaMeta}>{texto}</Text>
      </View>
    </View>
  );
};

export const TarjetaRecomendacion: React.FC<{ destino: DestinoDemo; razones: string[]; onPress: () => void; puntuacion?: number }> = ({ destino, razones, onPress, puntuacion }) => {
  const x = useTextosDeTravel();
  return (
    <TouchableOpacity onPress={onPress} style={c.recom} activeOpacity={0.88} accessibilityRole="button">
      <Fotografia foto={destino.foto} icono={destino.icono} estilo={c.recomFoto} tamanoIcono={26} />
      <View style={c.flex}>
        <View style={c.filaMini}>
          <Text style={c.lugarNombre} numberOfLines={1}>{x.nombreDestino(destino)}</Text>
          {puntuacion !== undefined && <Text style={c.recomMatch}>{x.formato.porcentaje(puntuacion)}</Text>}
        </View>
        <Text style={c.lugarMeta}>{x.pais(destino.pais)}</Text>
        <Text style={c.recomPor}>{x.t('travel.why')}</Text>
        {razones.map((r) => (
          <View key={r} style={c.filaMini}>
            <Ionicons name="checkmark-circle" size={14} color={TRAVEL.morado} />
            <Text style={c.recomRazon}>{x.t(r)}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

/**
 * EL MAPA DEMO. No hay SDK de mapas ni API: es una superficie estilizada —agua, parques, calles— con marcadores en
 * posiciones de ejemplo. Lleva el sello DEMO encima, siempre.
 */
export const VistaMapa: React.FC<{
  lugares: LugarDemo[]; seleccionado?: string | null; onMarcador?: (id: string) => void; ruta?: { x: number; y: number }[]; alto?: number; conPosicion?: boolean;
}> = ({ lugares, seleccionado, onMarcador, ruta, alto = 280, conPosicion = true }) => {
  const x = useTextosDeTravel();
  const [tam, setTam] = React.useState({ w: 0, h: 0 });
  const tramos = (ruta ?? []).slice(1).map((b, i) => {
    const a = (ruta ?? [])[i];
    const ax = (a.x / 100) * tam.w; const ay = (a.y / 100) * tam.h;
    const bx = (b.x / 100) * tam.w; const by = (b.y / 100) * tam.h;
    const largo = Math.hypot(bx - ax, by - ay);
    const angulo = Math.atan2(by - ay, bx - ax);
    return { key: i, left: (ax + bx) / 2 - largo / 2, top: (ay + by) / 2 - 2, width: largo, rot: `${angulo}rad` };
  });
  return (
    <View style={[c.mapa, { height: alto }]} onLayout={(e) => setTam({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} accessibilityLabel={x.t('travel.mapDemoLabel')}>
      <LinearGradient colors={['#F4EEFF', '#EAF4F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[c.rio]} />
      <View style={[c.parque, { left: '66%', top: '30%' }]} />
      <View style={[c.parque, { left: '4%', top: '38%', width: '16%' }]} />
      {[20, 42, 64, 84].map((y) => <View key={`h${y}`} style={[c.calle, { top: `${y}%`, left: 0, right: 0, height: 2 }]} />)}
      {[18, 38, 58, 80].map((xx) => <View key={`v${xx}`} style={[c.calle, { left: `${xx}%`, top: 0, bottom: 0, width: 2 }]} />)}
      {tam.w > 0 && tramos.map((tr) => <View key={tr.key} style={[c.tramo, { left: tr.left, top: tr.top, width: tr.width, transform: [{ rotate: tr.rot }] }]} />)}
      {lugares.map((l) => {
        const cat = CATEGORIAS_DE_LUGAR.find((k) => k.id === l.categoria);
        const activo = seleccionado === l.id;
        return (
          <TouchableOpacity
            key={l.id}
            onPress={onMarcador ? () => onMarcador(l.id) : undefined}
            disabled={!onMarcador}
            style={[c.marcador, activo && c.marcadorActivo, { left: `${l.x}%`, top: `${l.y}%` }]}
            accessibilityRole="button"
            accessibilityLabel={x.t(l.nombre)}
            hitSlop={6}
          >
            <Ionicons name={(cat?.icono ?? 'location') as Icono} size={activo ? 16 : 13} color={activo ? '#FFFFFF' : TRAVEL.morado} />
          </TouchableOpacity>
        );
      })}
      {conPosicion && <View style={[c.yo, { left: `${POSICION_DEMO.x}%`, top: `${POSICION_DEMO.y}%` }]} accessibilityLabel={x.t('travel.youAreHere')} />}
      <View style={c.mapaSello}><SelloDemo /></View>
    </View>
  );
};

export const GaleriaFotos: React.FC<{ fotos: (FotoDeTravel | null)[]; icono?: string }> = ({ fotos, icono = 'image-outline' }) => (
  <View style={c.galeria}>
    {fotos.map((f, i) => <Fotografia key={`${f}-${i}`} foto={f} icono={icono} estilo={c.galeriaFoto} tamanoIcono={20} />)}
  </View>
);

export const PerfilViajero: React.FC<{ nombre: string; detalle: string; pendiente?: boolean; children?: React.ReactNode }> = ({ nombre, detalle, pendiente, children }) => (
  <View style={c.viajero}>
    <View style={c.avatar}><Text style={c.avatarTexto}>{nombre.slice(0, 1).toLocaleUpperCase()}</Text></View>
    <View style={c.flex}>
      <Text style={c.rutaTitulo} numberOfLines={1}>{nombre}</Text>
      <Text style={[c.rutaMeta, pendiente && { color: TRAVEL.aviso }]} numberOfLines={1}>{detalle}</Text>
    </View>
    {children}
  </View>
);

export const TarjetaViajeCompartido: React.FC<{ autor: string; destino: DestinoDemo; dias: number; guardados: number; onPress: () => void }> = ({ autor, destino, dias, guardados, onPress }) => {
  const x = useTextosDeTravel();
  return (
    <TouchableOpacity onPress={onPress} style={c.compartido} activeOpacity={0.88} accessibilityRole="button">
      <Fotografia foto={destino.foto} icono={destino.icono} estilo={c.compartidoFoto} />
      <View style={c.compartidoTextos}>
        <Text style={c.lugarNombre} numberOfLines={1}>{x.t('travel.sharedTitle', { lugar: x.nombreDestino(destino), contador: dias })}</Text>
        <Text style={c.lugarMeta} numberOfLines={1}>{x.t('travel.byAuthor', { nombre: autor })} · {x.t('travel.savesCount', { contador: guardados, cantidad: x.formato.numero(guardados) })}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const TarjetaDocumento: React.FC<{ documento: DocumentoDemo; onVer: () => void }> = ({ documento, onVer }) => {
  const x = useTextosDeTravel();
  const tipo = TIPOS_DE_DOCUMENTO.find((k) => k.id === documento.tipo);
  return (
    <TouchableOpacity onPress={onVer} style={c.doc} activeOpacity={0.85} accessibilityRole="button">
      <View style={c.actIcono}><Ionicons name={(tipo?.icono ?? 'document-outline') as Icono} size={18} color={TRAVEL.morado} /></View>
      <View style={c.flex}>
        <Text style={c.rutaTitulo} numberOfLines={1}>{x.t(documento.titulo)}</Text>
        <Text style={c.rutaMeta} numberOfLines={1}>{x.t(tipo?.titulo ?? 'travel.docConfirmation')} · {x.fecha(documento.fecha, 0, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </View>
      <Ionicons name={documento.protegido ? 'lock-closed-outline' : 'eye-off-outline'} size={17} color={TRAVEL.gris} accessibilityLabel={x.t(documento.protegido ? 'travel.docProtected' : 'travel.docPrivate')} />
      <IconoDireccional name="chevron-forward" size={17} color={TRAVEL.gris} />
    </TouchableOpacity>
  );
};

const c = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  velo: { ...StyleSheet.absoluteFillObject },
  esquina: { position: 'absolute', top: 10 },
  favorito: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,17,43,0.35)' },
  favoritoClaro: { backgroundColor: TRAVEL.lilaSuave },
  filaMini: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  destino: { borderRadius: 20, backgroundColor: TRAVEL.fondo, borderWidth: 1, borderColor: TRAVEL.borde, overflow: 'hidden', ...SOMBRA_SUAVE },
  destinoFoto: { height: 150, justifyContent: 'flex-end' },
  destinoFotoCompacta: { height: 118 },
  destinoTextos: { padding: 12, gap: 2 },
  destinoNombre: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', flexShrink: 1 },
  destinoPais: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', flexShrink: 1 },
  destinoPie: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  destinoEtiqueta: { fontSize: 12, fontWeight: '700', color: TRAVEL.morado, flexShrink: 1 },
  destinoPrecio: { fontSize: 12, fontWeight: '600', color: TRAVEL.texto, flexShrink: 1 },
  lugar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: TRAVEL.fondo, borderWidth: 1, borderColor: TRAVEL.borde },
  lugarFoto: { width: 64, height: 64, borderRadius: 14 },
  lugarTextos: { flex: 1, minWidth: 0, gap: 3 },
  lugarNombre: { fontSize: 15, fontWeight: '800', color: TRAVEL.tinta, flexShrink: 1 },
  lugarMeta: { fontSize: 12, color: TRAVEL.gris },
  viaje: { borderRadius: 20, backgroundColor: TRAVEL.fondo, borderWidth: 1, borderColor: TRAVEL.borde, overflow: 'hidden', ...SOMBRA_SUAVE },
  viajeFoto: { height: 130, justifyContent: 'flex-end' },
  estado: { position: 'absolute', top: 10, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', maxWidth: '86%' },
  estadoTexto: { fontSize: 11, fontWeight: '800', color: TRAVEL.morado },
  viajePie: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  viajeFechas: { fontSize: 13, fontWeight: '700', color: TRAVEL.tinta },
  viajeMeta: { fontSize: 12, color: TRAVEL.gris },
  dia: { minWidth: 92, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: TRAVEL.lilaSuave, gap: 2 },
  diaNumero: { fontSize: 14, fontWeight: '800', color: TRAVEL.tinta },
  diaFecha: { fontSize: 12, color: TRAVEL.gris },
  act: { flexDirection: 'row', gap: 10 },
  actHora: { width: 58, alignItems: 'center' },
  actHoraTexto: { fontSize: 12, fontWeight: '700', color: TRAVEL.texto },
  actLinea: { flex: 1, width: 2, marginTop: 4, backgroundColor: TRAVEL.borde, borderRadius: 1 },
  actCaja: { flex: 1, minWidth: 0, padding: 12, marginBottom: 10, borderRadius: 16, backgroundColor: TRAVEL.fondo, borderWidth: 1, borderColor: TRAVEL.borde, gap: 8 },
  actCajaResaltada: { borderColor: TRAVEL.morado, backgroundColor: TRAVEL.lilaSuave },
  actFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actIcono: { width: 34, height: 34, borderRadius: 11, backgroundColor: TRAVEL.lilaSuave, alignItems: 'center', justifyContent: 'center' },
  actTextos: { flex: 1, minWidth: 0, gap: 2 },
  actTitulo: { fontSize: 14, fontWeight: '700', color: TRAVEL.tinta },
  actMeta: { fontSize: 12, color: TRAVEL.gris },
  actNota: { fontSize: 12, color: TRAVEL.texto, fontStyle: 'italic' },
  ruta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: TRAVEL.borde, backgroundColor: TRAVEL.fondo },
  rutaTitulo: { fontSize: 14, fontWeight: '700', color: TRAVEL.tinta },
  rutaMeta: { fontSize: 12, color: TRAVEL.gris },
  presupuesto: { padding: 16, borderRadius: 20, backgroundColor: TRAVEL.lilaSuave, gap: 8 },
  presTitulo: { fontSize: 13, fontWeight: '700', color: TRAVEL.texto },
  presCifra: { fontSize: 22, fontWeight: '800', color: TRAVEL.tinta },
  presDe: { fontSize: 13, fontWeight: '600', color: TRAVEL.gris },
  barra: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  barraRelleno: { height: 8, borderRadius: 4 },
  clima: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: TRAVEL.borde },
  alerta: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, backgroundColor: TRAVEL.fondo },
  recom: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: TRAVEL.borde, backgroundColor: TRAVEL.fondo, ...SOMBRA_SUAVE },
  recomFoto: { width: 86, height: 104, borderRadius: 14 },
  recomMatch: { fontSize: 12, fontWeight: '800', color: TRAVEL.morado, backgroundColor: TRAVEL.lilaSuave, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  recomPor: { fontSize: 12, fontWeight: '800', color: TRAVEL.tinta, marginTop: 6 },
  recomRazon: { fontSize: 12, color: TRAVEL.texto, flexShrink: 1 },
  mapa: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: TRAVEL.borde },
  rio: { position: 'absolute', left: '54%', top: 0, bottom: 0, width: 14, backgroundColor: '#CFE3F7', transform: [{ rotate: '8deg' }] },
  parque: { position: 'absolute', width: '20%', height: '18%', borderRadius: 18, backgroundColor: '#DCEFD9' },
  calle: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.9)' },
  tramo: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: TRAVEL.morado },
  marcador: { position: 'absolute', width: 28, height: 28, marginLeft: -14, marginTop: -14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: TRAVEL.morado, alignItems: 'center', justifyContent: 'center', ...SOMBRA_SUAVE },
  marcadorActivo: { width: 36, height: 36, marginLeft: -18, marginTop: -18, borderRadius: 18, backgroundColor: TRAVEL.morado, borderColor: '#FFFFFF' },
  yo: { position: 'absolute', width: 18, height: 18, marginLeft: -9, marginTop: -9, borderRadius: 9, backgroundColor: '#2F7BF6', borderWidth: 3, borderColor: '#FFFFFF' },
  mapaSello: { position: 'absolute', top: 10, left: 10 },
  galeria: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  galeriaFoto: { width: '31.5%', aspectRatio: 1, borderRadius: 14 },
  viajero: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: TRAVEL.lila, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 16, fontWeight: '800', color: TRAVEL.morado },
  compartido: { width: 240, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: TRAVEL.borde, backgroundColor: TRAVEL.fondo },
  compartidoFoto: { height: 120 },
  compartidoTextos: { padding: 12, gap: 3 },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: TRAVEL.borde, backgroundColor: TRAVEL.fondo },
});
