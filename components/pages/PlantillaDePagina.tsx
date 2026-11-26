import React, { useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useIdioma, useT } from '../../contexts/IdiomaContext';
import IconoDireccional from '../IconoDireccional';
import CabeceraDePagina, { type PaginaParaPintar, type PresentadorDePagina } from './CabeceraDePagina';
import { SECCIONES_DE_PAGINA, seccionesDeLaPagina, tipoDePagina, colorDeObra, type DefinicionDeSeccion } from '../../constants/pageTypes';
import { PALETA_WEEPAGE as P, ETIQUETA_WEEPAGE, RADIO_WEEPAGE, interfazWeePage } from '../../constants/estiloWeePage';
import { useFuenteDeObra } from '../../hooks/useFuenteDeObra';
import { dominioDeEnlace } from '../../utils/enlaceDeObra';

type Escena = { title: string; videoURL: string; posterURL: string };

/*
 * LA PLANTILLA DE UNA WEË PAGE (boceto aprobado, 2026-11-23): la cabecera, el índice de secciones y las secciones que
 * el tipo trae, en el orden y con lo encendido que eligió el dueño. Una sección VACÍA no se pinta aunque esté encendida.
 *
 * Cada sección se llena con un dato de la página (`fuente` en constants/pageTypes.ts): el texto, las imágenes, las
 * escenas, los enlaces a tiendas, la ficha, el contacto y las novedades (cuándo se publicó y cuándo cambió por última
 * vez: la página no publica como una persona, así que no hay muro). La muestra del PDF queda preparada para cuando
 * exista la subida (pendiente).
 *
 * LOS ENLACES A TIENDAS: un toque y abre la tienda, sin aviso intermedio (dueño, 2026-11-23). Solo llegan `https`.
 *
 * La usan la página publicada y la vista previa del editor; mide su propio ancho para decidir móvil o escritorio.
 */
const PlantillaDePagina: React.FC<{
  pagina: PaginaParaPintar;
  presentador?: PresentadorDePagina | null;
  alPulsarPresentador?: () => void;
  acciones?: React.ReactNode;
  /** Abre una escena a pantalla completa. Sin él, las escenas no se abren (vista previa). */
  alAbrirEscena?: (e: Escena) => void;
  /** Lo que el dueño ve al final de las escenas (Añadir escena). */
  extraEscenas?: React.ReactNode;
  /** Para que el índice lleve a cada sección: quien desplaza es la pantalla. */
  alIrA?: (y: number) => void;
  /** Contenido debajo de las acciones (MyWeës). */
  debajoDeAcciones?: React.ReactNode;
}> = ({ pagina, presentador, alPulsarPresentador, acciones, alAbrirEscena, extraEscenas, alIrA, debajoDeAcciones }) => {
  const t = useT();
  const { formato } = useIdioma();
  const obra = useFuenteDeObra();
  const [ancho, setAncho] = useState(390);
  const [activa, setActiva] = useState<string | null>(null);
  const posiciones = useRef<Record<string, number>>({});
  const amplio = ancho >= 1024;
  const margen = amplio ? Math.min(120, Math.max(32, Math.round(ancho * 0.08))) : 20;
  const acento = colorDeObra(pagina.workColor);
  const tipo = tipoDePagina(pagina.type);

  const imagenes = useMemo(() => [...pagina.gallery, ...(pagina.featured ?? [])].filter((u, i, a) => u && a.indexOf(u) === i), [pagina.gallery, pagina.featured]);
  const enlaces = useMemo(() => {
    const lista = pagina.links.filter((e) => e.url.startsWith('https://'));
    if (pagina.website && pagina.website.startsWith('https://') && !lista.some((e) => e.url === pagina.website)) lista.push({ label: '', url: pagina.website });
    return lista;
  }, [pagina.links, pagina.website]);
  const ficha = useMemo(() => [
    ...tipo.campos.filter((c) => pagina.details?.[c.id]).map((c): [string, string] => [t(c.clave), c.opciones ? t(c.opciones.find((o) => o.id === pagina.details[c.id])?.clave ?? '') : pagina.details[c.id]]),
    ...(pagina.location ? [[t('pages.f_location'), pagina.location] as [string, string]] : []),
  ], [tipo, pagina.details, pagina.location, t]);
  const novedades = useMemo(() => {
    const lista: [string, number][] = [];
    if (pagina.publishedAtMs) lista.push([t('pages.status_published'), pagina.publishedAtMs]);
    if (pagina.updatedAtMs && (!pagina.publishedAtMs || pagina.updatedAtMs - pagina.publishedAtMs > 60_000)) lista.unshift([t('pages.updateEdited'), pagina.updatedAtMs]);
    return lista;
  }, [pagina.publishedAtMs, pagina.updatedAtMs, t]);

  /* Una sección se publica si está encendida y tiene algo que enseñar. Los enlaces y la galería se pintan una vez. */
  const visibles = useMemo(() => {
    const usadas = new Set<string>();
    return seccionesDeLaPagina(pagina.type, pagina.sections).filter((s) => {
      if (!s.enabled) return false;
      const d = SECCIONES_DE_PAGINA[s.id];
      if (usadas.has(d.fuente)) return false;
      const llena = {
        texto: !!pagina.about, galeria: imagenes.length > 0, escenas: !!pagina.scenes?.length || !!extraEscenas, enlaces: enlaces.length > 0,
        ficha: ficha.length > 0, contacto: !!pagina.contact, muestra: false, novedades: novedades.length > 0,
      }[d.fuente];
      if (llena) usadas.add(d.fuente);
      return llena;
    }).map((s) => SECCIONES_DE_PAGINA[s.id]);
  }, [pagina.type, pagina.sections, pagina.about, pagina.scenes, pagina.contact, imagenes, enlaces, ficha, novedades, extraEscenas]);

  const medir = (id: string) => (e: LayoutChangeEvent) => { posiciones.current[id] = e.nativeEvent.layout.y; };
  const irA = (id: string) => {
    setActiva(id);
    const y = posiciones.current[id];
    if (alIrA && typeof y === 'number') alIrA(Math.max(0, y - 8));
  };

  const cuerpoDe = (d: DefinicionDeSeccion) => {
    switch (d.fuente) {
      case 'texto':
        return <Text style={[obra(amplio ? 22 : 19), { color: P.obraTexto, maxWidth: amplio ? 720 : undefined }]}>{pagina.about}</Text>;
      case 'galeria':
        return amplio ? (
          <View style={s.rejilla}>
            {imagenes.map((u) => <Image key={u} source={{ uri: u }} style={[s.pieza, { width: Math.floor((Math.min(ancho - margen * 2, 1200) - 48) / 3) }]} contentFit="cover" />)}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.carrusel, { paddingHorizontal: margen }]} style={{ marginHorizontal: -margen }}>
            {imagenes.map((u) => <Image key={u} source={{ uri: u }} style={s.piezaMovil} contentFit="cover" />)}
          </ScrollView>
        );
      case 'escenas':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.carrusel, { paddingHorizontal: margen }]} style={{ marginHorizontal: -margen }}>
            {(pagina.scenes ?? []).map((e) => (
              <TouchableOpacity key={e.videoURL} onPress={() => alAbrirEscena?.(e)} disabled={!alAbrirEscena} accessibilityRole="button" accessibilityLabel={e.title} activeOpacity={0.9} style={s.escena}>
                <Image source={{ uri: e.posterURL }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={s.escenaVelo} />
                <View style={s.escenaPlay}><Ionicons name="play" size={20} color={P.n0} style={{ marginStart: 2 }} /></View>
                <Text style={[interfazWeePage(13, '600'), { color: P.tinta }]} numberOfLines={2}>{e.title}</Text>
              </TouchableOpacity>
            ))}
            {extraEscenas}
          </ScrollView>
        );
      case 'enlaces':
        return (
          <View style={[s.enlaces, amplio && { maxWidth: 560 }]}>
            {enlaces.map((e) => (
              <TouchableOpacity
                key={e.url}
                onPress={() => { if (e.url.startsWith('https://')) void Linking.openURL(e.url); }}
                accessibilityRole="link"
                style={s.enlace}
                activeOpacity={0.85}
              >
                <View style={s.enlaceTextos}>
                  <Text style={[interfazWeePage(15, '600'), { color: P.tinta }]} numberOfLines={1}>{e.label || dominioDeEnlace(e.url)}</Text>
                  {!!e.label && <Text style={[interfazWeePage(12), { color: P.t3 }]} numberOfLines={1}>{dominioDeEnlace(e.url)}</Text>}
                </View>
                <IconoDireccional name="arrow-forward" size={18} color={P.tinta} />
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'ficha':
        return (
          <View style={[s.ficha, amplio && { maxWidth: 720 }]}>
            {ficha.map(([k, v]) => (
              <View key={k} style={s.fichaFila}>
                <Text style={[interfazWeePage(13), s.fichaK]}>{k}</Text>
                <Text style={[interfazWeePage(14), s.fichaV]}>{v}</Text>
              </View>
            ))}
          </View>
        );
      case 'contacto':
        return <Text style={[interfazWeePage(15), { color: P.t2 }]}>{pagina.contact}</Text>;
      case 'novedades':
        return (
          <View style={s.novedades}>
            {novedades.map(([k, ms], i) => (
              <View key={k} style={[s.novedad, i > 0 && s.novedadLinea]}>
                <Text style={[interfazWeePage(14), { color: P.tinta, flexShrink: 1 }]}>{k}</Text>
                <Text style={[interfazWeePage(13), { color: P.t3 }]}>{formato.fecha(ms)}</Text>
              </View>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={s.raiz} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      <CabeceraDePagina pagina={pagina} presentador={presentador} alPulsarPresentador={alPulsarPresentador} acciones={acciones} ancho={ancho} />
      {debajoDeAcciones}

      {visibles.length > 1 && (
        <View style={[s.indiceBanda, { marginTop: 24 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.indice, { paddingHorizontal: margen, gap: amplio ? 40 : 24 }]}>
            {visibles.map((d, i) => {
              const on = (activa ?? visibles[0].id) === d.id;
              return (
                <TouchableOpacity key={d.id} onPress={() => irA(d.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={s.pestana} hitSlop={6}>
                  <Text style={[interfazWeePage(14, on ? '600' : '400'), { color: on ? P.tinta : P.t3 }]} numberOfLines={1}>{t(d.clave)}</Text>
                  <View style={[s.pestanaFilete, { backgroundColor: on ? acento : 'transparent' }]} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {visibles.length === 0 ? (
        <Text style={[interfazWeePage(14), { color: P.t3, paddingHorizontal: margen, paddingTop: 32 }]}>{t('pages.emptyPage')}</Text>
      ) : visibles.map((d) => (
        <View key={d.id} onLayout={medir(d.id)} style={[s.seccion, { paddingHorizontal: margen, paddingTop: amplio ? 72 : 36, maxWidth: amplio ? 1200 + margen * 2 : undefined }]}>
          <View style={[s.filete, { backgroundColor: acento }]} />
          <Text style={ETIQUETA_WEEPAGE} accessibilityRole="header">{t(d.clave)}</Text>
          {cuerpoDe(d)}
        </View>
      ))}

      <View style={[s.pie, { paddingHorizontal: margen }]}>
        <Text style={[interfazWeePage(12), { color: P.t3 }]} numberOfLines={1}>{`WeëPages · @${pagina.handle}`}</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  raiz: { backgroundColor: P.n0, width: '100%' },
  indiceBanda: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: P.linea },
  indice: { flexDirection: 'row' },
  pestana: { paddingTop: 14, alignItems: 'stretch' },
  pestanaFilete: { height: 2, borderRadius: 2, marginTop: 12 },
  seccion: { width: '100%', alignSelf: 'center', gap: 14 },
  filete: { width: 40, height: 2, borderRadius: 2 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  pieza: { aspectRatio: 3 / 4, borderRadius: 6, backgroundColor: P.n2 },
  carrusel: { gap: 10 },
  piezaMovil: { width: 220, height: 290, borderRadius: RADIO_WEEPAGE.control, backgroundColor: P.n2 },
  escena: { width: 170, height: 240, borderRadius: RADIO_WEEPAGE.control, overflow: 'hidden', justifyContent: 'flex-end', padding: 10, backgroundColor: P.n2 },
  escenaVelo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,5,5,0.32)' },
  escenaPlay: { position: 'absolute', top: '40%', alignSelf: 'center', width: 44, height: 44, borderRadius: 22, backgroundColor: P.tinta, alignItems: 'center', justifyContent: 'center' },
  enlaces: { gap: 8 },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIO_WEEPAGE.tarjeta, backgroundColor: P.n2 },
  enlaceTextos: { flex: 1, minWidth: 0 },
  ficha: { gap: 12 },
  fichaFila: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  fichaK: { color: P.t3, width: 140, flexShrink: 0 },
  fichaV: { color: P.tinta, flex: 1, minWidth: 160 },
  novedades: { gap: 0 },
  novedad: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, flexWrap: 'wrap' },
  novedadLinea: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.linea },
  pie: { paddingTop: 48, paddingBottom: 40 },
});

export default PlantillaDePagina;
