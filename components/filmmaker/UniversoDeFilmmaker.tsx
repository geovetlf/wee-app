import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { IconoWee } from '../icons/IconoWee';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { CLAVE_DE_GRUPO, GENERAR_IMAGENES_DEL_UNIVERSO, SECCIONES_DEL_UNIVERSO } from '../../constants/filmmakerUniverso';
import { ElementoDeUniverso, ModoDeFicha, OrigenDeUniverso, TOPES_UNIVERSO, TipoDeElemento, UniversoDelTaller, contar, elegirFichaGlobal, hayEjemplos, pendientesDeFicha, ponerMundo, puedeAprobar, secciones } from '../../utils/universoDeFilmmaker';
import { abrirPortadaDeWeeAi } from '../../navigation/refNavegacion';
import { etiquetaAccesible } from '../../utils/ideaDeFilmmaker';
import { ImagenesDelUniverso, ImagenesDeFilmmaker } from './ImagenesDelUniverso';
import type { peticionDeUniverso } from '../../utils/imagenesDelUniverso';

interface Props {
  universo: UniversoDelTaller;
  /** Ancho útil para repartir la rejilla de retratos. */
  ancho: number;
  compacto: boolean;
  onAbrir: (e: ElementoDeUniverso) => void;
  onAprobar: () => void;
  /** Cargar / quitar el universo de ejemplo (rotulado como ejemplo). */
  onEjemplo: () => void;
  onQuitarEjemplo: () => void;
  /** Pasa a «Tandas y Storyboard» (solo con el universo aprobado). */
  onContinuar: () => void;
  onAviso: (clave: string) => void;
  /** El tipo de pestaña visible lo manda quien pinta la caja (su texto de ejemplo cambia con él). */
  seccion: TipoDeElemento;
  onSeccion: (s: TipoDeElemento) => void;
  /** La persona ya trajo una imagen de referencia (la caja de la Idea): cumple el papel de personaje aportado. */
  imagenDeReferencia?: boolean;
  /** Cambia el universo (mundo, respuesta sobre las fichas). Sin él esas dos piezas no se pintan. */
  onCambio?: (f: (u: UniversoDelTaller) => UniversoDelTaller) => void;
  /** Abre el selector de imagen para la ficha de un personaje. Sin él, «Subir una imagen» no sale. */
  onSubirImagen?: () => void;
  /** Las imágenes del universo (hook de Filmmaker) y lo que se pediría ahora. Sin ellas, la fila de imágenes sale como «Pronto». */
  imagenes?: ImagenesDeFilmmaker;
  peticionDeImagenes?: ReturnType<typeof peticionDeUniverso>;
}

const CLAVE_DE_ORIGEN: Record<OrigenDeUniverso, string> = { usuario: 'filmmaker.uniOriginMine', propuesta: 'filmmaker.uniOriginWee', documento: 'filmmaker.uniOriginDoc' };

/**
 * EL UNIVERSO (etapa 2): la lámina del reparto como pieza central. Rejilla de retratos con nombre y línea, secciones «Principales / Importantes /
 * Grupos / Otros» (solo personajes), contadores y tres pestañas (personajes, lugares, objetos). Tocar un retrato abre su ficha. Los elementos los
 * añade la persona con la caja común de abajo («Nombre — descripción»). El retrato es un marcador con la inicial: generar imágenes está CERRADO
 * (regla 10) y la lámina se rotula «referencia de estilo, no vista previa exacta». «Weë lee los personajes» y regenerar salen cerrados con motivo.
 * El único botón blanco aprueba el universo; aprobado, pasa a «Continuar a Tandas» (cerrado hasta la ola 3).
 */
export const UniversoDeFilmmaker: React.FC<Props> = ({ universo, ancho, compacto, onAbrir, onAprobar, onEjemplo, onQuitarEjemplo, onContinuar, onAviso, seccion, onSeccion, imagenDeReferencia, onCambio, onSubirImagen, imagenes, peticionDeImagenes }) => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const n = contar(universo);
  const def = SECCIONES_DEL_UNIVERSO.find((s) => s.id === seccion) ?? SECCIONES_DEL_UNIVERSO[0];
  const grupos = secciones(universo, seccion);
  const columnas = ancho >= 900 ? 5 : ancho < 340 ? 2 : 3;
  const hueco = 10;
  const util = Math.min(ancho, 1040) - 32;
  const lado = Math.floor((util - hueco * (columnas - 1)) / columnas);
  const puede = puedeAprobar(universo, !!imagenDeReferencia);
  const pendientes = pendientesDeFicha(universo);
  const [subiendo, setSubiendo] = useState(false);
  const [mundoAbierto, setMundoAbierto] = useState(false);
  const [mundoBorrador, setMundoBorrador] = useState(universo.mundo ?? '');
  useEffect(() => { setMundoBorrador(universo.mundo ?? ''); }, [universo.mundo]);
  const guardarMundo = () => { if (mundoBorrador.trim() !== (universo.mundo ?? '').trim()) onCambio?.((u) => ponerMundo(u, mundoBorrador)); };
  const responder = (modo: ModoDeFicha) => { onCambio?.((u) => elegirFichaGlobal(u, modo)); setSubiendo(modo === 'subir'); };
  const origenDelMundo: OrigenDeUniverso = universo.mundo ? 'usuario' : 'propuesta';
  const ejemplos = hayEjemplos(universo);

  const retrato = (e: ElementoDeUniverso) => (
    <TouchableOpacity key={e.id} onPress={() => onAbrir(e)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(e.nombre, e.linea || null, t('filmmaker.uniOpenSheet'))} style={{ width: lado }}>
      <View style={[styles.retrato, { height: Math.round(lado * 1.2) }]}>
        <LinearGradient colors={['#0A0D13', '#1B2029']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {imagenes?.porId[e.id]?.estado === 'lista' && imagenes.porId[e.id].url ? <Image source={{ uri: imagenes.porId[e.id].url }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : <Text style={[textoPortada(Math.round(lado * 0.36), '600'), { color: P.tintaSecundaria }]} accessibilityElementsHidden importantForAccessibility="no">{Array.from(e.nombre)[0]?.toUpperCase()}</Text>}
        <View style={[styles.tipo, dir.esRTL ? { start: 8 } : { end: 8 }]}><IconoWee name={def.icono} size={12} color={P.tintaSecundaria} /></View>
      </View>
      <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta, marginTop: 6 }]} numberOfLines={1}>{e.nombre}</Text>
      {e.linea ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={4}>{e.linea}</Text> : null}
      <Text style={[textoPortada(11, '600'), dir.texto, { color: P.luzSecundaria, marginTop: 2 }]} numberOfLines={1}>{e.ejemplo ? t('filmmaker.uniExampleBadge') : t(CLAVE_DE_ORIGEN[e.origen ?? 'usuario'])}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.raiz}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <View style={[styles.cabeza, dir.contenedor]}>
          <Text style={[textoPortada(compacto ? 18 : 22, '600'), dir.texto, { color: P.tinta, flex: 1 }]} accessibilityRole="header" numberOfLines={1}>{t('filmmaker.uniTitle')}</Text>
        </View>
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>{[t('filmmakerProd.cntCharacters', { contador: n.character }), t('filmmakerProd.cntPlaces', { contador: n.place }), t('filmmakerProd.cntObjects', { contador: n.object })].join(' · ')}</Text>

        {universo.elementos.length === 0 ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} testID="universo-construir-cerrado">{t('filmmakerProd.uniBuildClosed')}</Text> : null}
        {onCambio && pendientes.length > 0 ? (
          <View style={styles.tarjeta} testID="universo-detectados">
            <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmaker.uniFoundTitle', { contador: formato.numero(pendientes.length) })}</Text>
            <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.uniFoundAsk')}</Text>
            <View style={[styles.fila, dir.contenedor]}>
              <TouchableOpacity onPress={() => responder('subir')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.uniFoundUpload')} style={styles.opcion}><Text style={[textoPortada(14, '600'), { color: P.tinta }]} numberOfLines={2}>{t('filmmaker.uniFoundUpload')}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => responder('weeHace')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.uniFoundWee')} style={styles.opcion}><Text style={[textoPortada(14, '600'), { color: P.tinta }]} numberOfLines={2}>{t('filmmaker.uniFoundWee')}</Text></TouchableOpacity>
            </View>
          </View>
        ) : null}
        {subiendo ? (
          <View style={styles.tarjeta} testID="universo-subir-ficha">
            <View style={[styles.fila, dir.contenedor]}>
              {onSubirImagen ? <TouchableOpacity onPress={onSubirImagen} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.uniUploadImage')} style={styles.opcion}><Text style={[textoPortada(14, '600'), { color: P.tinta }]} numberOfLines={2}>{t('filmmaker.uniUploadImage')}</Text></TouchableOpacity> : null}
              <TouchableOpacity onPress={() => abrirPortadaDeWeeAi()} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.uniUploadCreate')} style={styles.opcion}><Text style={[textoPortada(14, '600'), { color: P.tinta }]} numberOfLines={2}>{t('filmmaker.uniUploadCreate')}</Text></TouchableOpacity>
            </View>
            <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.uniUploadHint')}</Text>
          </View>
        ) : null}

        {onCambio ? (
          <View style={styles.tarjeta} testID="universo-mundo">
            <TouchableOpacity onPress={() => { if (mundoAbierto) guardarMundo(); setMundoAbierto((a) => !a); }} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ expanded: mundoAbierto }} accessibilityLabel={etiquetaAccesible(t('filmmaker.uniWorldTitle'), universo.mundo || t('filmmaker.uniWorldWee'), t(CLAVE_DE_ORIGEN[origenDelMundo]))} style={[styles.mundoFila, dir.contenedor]}>
              <IconoWee name="lugar" size={18} color={P.tinta} />
              <View style={{ flex: 1 }}>
                <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta }]} numberOfLines={1}>{t('filmmaker.uniWorldTitle')}</Text>
                <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={mundoAbierto ? 1 : 2}>{universo.mundo || t('filmmaker.uniWorldWee')}</Text>
                <Text style={[textoPortada(11, '600'), dir.texto, { color: P.luzSecundaria }]} numberOfLines={1}>{t(CLAVE_DE_ORIGEN[origenDelMundo])}</Text>
              </View>
              <Ionicons name={mundoAbierto ? 'chevron-up' : 'chevron-down'} size={18} color={P.tintaSecundaria} />
            </TouchableOpacity>
            {mundoAbierto ? (
              <View style={{ gap: 6 }}>
                <TextInput value={mundoBorrador} onChangeText={setMundoBorrador} onBlur={guardarMundo} maxLength={TOPES_UNIVERSO.mundo} multiline placeholder={t('filmmaker.uniWorldPlaceholder')} placeholderTextColor={P.tintaSecundaria} selectionColor={P.luz} accessibilityLabel={t('filmmaker.uniWorldPlaceholder')} textAlignVertical="top" style={[styles.campo, textoPortada(15, '400'), dir.texto, { color: P.tinta }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]} />
                <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.uniWorldHint')}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {imagenes?.porId.lamina?.estado === 'lista' && imagenes.porId.lamina.url ? <Image source={{ uri: imagenes.porId.lamina.url }} style={styles.lamina} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
        <View style={[styles.pestanas, dir.contenedor]} accessibilityRole="tablist">
          {SECCIONES_DEL_UNIVERSO.map((s) => {
            const sel = s.id === seccion;
            return (
              <TouchableOpacity key={s.id} onPress={() => onSeccion(s.id)} activeOpacity={0.8} accessibilityRole="tab" accessibilityState={{ selected: sel }} accessibilityLabel={etiquetaAccesible(t(s.clave), formato.numero(n[s.id]))} style={[styles.pestana, sel && styles.pestanaSel]}>
                <Text style={[textoPortada(14, sel ? '600' : '500'), { color: sel ? P.tinta : P.tintaSecundaria }]} numberOfLines={1}>{t(s.clave)}</Text>
                <Text style={[textoPortada(12, '500'), { color: P.tintaSecundaria }]}>{formato.numero(n[s.id])}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {grupos.length === 0 ? (
          <View style={styles.vacio}>
            <IconoWee name={def.icono} size={28} color={P.tintaDeshabilitada} />
            <Text style={[textoPortada(15, '500'), { color: P.tintaSecundaria, textAlign: 'center' }]}>{t(def.claveVacio)}</Text>
          </View>
        ) : grupos.map((g) => (
          <View key={g.grupo} style={{ gap: 8 }}>
            {seccion === 'character' ? <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t(CLAVE_DE_GRUPO[g.grupo])} · {formato.numero(g.elementos.length)}</Text> : null}
            <View style={[styles.rejilla, dir.contenedor]}>{g.elementos.map(retrato)}</View>
          </View>
        ))}

        <TouchableOpacity onPress={ejemplos ? onQuitarEjemplo : onEjemplo} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t(ejemplos ? 'filmmaker.uniClearExample' : 'filmmaker.uniLoadExample')} style={styles.ejemplo}>
          <Text style={[textoPortada(14, '600'), { color: P.tinta }]} numberOfLines={2}>{t(ejemplos ? 'filmmaker.uniClearExample' : 'filmmaker.uniLoadExample')}</Text>
        </TouchableOpacity>
        {imagenes?.abierta && peticionDeImagenes ? <ImagenesDelUniverso imagenes={imagenes} peticion={peticionDeImagenes} /> : !GENERAR_IMAGENES_DEL_UNIVERSO && puede ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.uniRegenerateClosed')}</Text> : null}
      </ScrollView>

      <View style={styles.pie}>
        <TouchableOpacity testID="universo-continuar" onPress={() => { if (!puede) return; onAprobar(); onContinuar(); }} disabled={!puede} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmaker.uniContinue'), puede ? null : t('filmmaker.uniApproveWhy'))} accessibilityState={{ disabled: !puede }} style={[styles.principal, !puede && styles.principalApagado]}>
          <Text style={[textoPortada(16, '600'), { color: puede ? P.sobreAccion : P.tintaDeshabilitada }]} numberOfLines={1}>{t('filmmaker.uniContinue')}</Text>
        </TouchableOpacity>
        {!puede ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} accessibilityLiveRegion="polite">{t('filmmaker.uniApproveWhy')}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tarjeta: { gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { flexGrow: 1, flexBasis: 140, minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: P.bordeLuz, alignItems: 'center', justifyContent: 'center' },
  mundoFila: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  campo: { minHeight: 76, borderRadius: 14, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.fondo, paddingHorizontal: 12, paddingVertical: 10 },
  pestanas: { flexDirection: 'row', borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, padding: 3, gap: 3 },
  pestana: { flex: 1, minHeight: 44, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  pestanaSel: { backgroundColor: P.superficieAlta, borderWidth: 1, borderColor: P.bordeLuz },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  retrato: { borderRadius: 16, borderWidth: 1, borderColor: P.bordeLuz, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tipo: { position: 'absolute', top: 8 },
  lamina: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, borderWidth: 1, borderColor: P.bordeLuz },
  vacio: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  ejemplo: { minHeight: 44, alignSelf: 'flex-start', paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeLuz, alignItems: 'center', justifyContent: 'center' },
  pie: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 6 },
  principal: { minHeight: 52, borderRadius: 26, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
  principalApagado: { backgroundColor: 'transparent', borderWidth: 1, borderColor: P.bordeCapsula },
});
