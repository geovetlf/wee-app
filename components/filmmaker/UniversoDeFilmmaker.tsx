import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { IconoWee } from '../icons/IconoWee';
import { useT, useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { CLAVE_DE_GRUPO, GENERAR_IMAGENES_DEL_UNIVERSO, LEER_PERSONAJES_ABIERTO, SECCIONES_DEL_UNIVERSO } from '../../constants/filmmakerUniverso';
import { ElementoDeUniverso, TipoDeElemento, UniversoDelTaller, contar, hayEjemplos, puedeAprobar, secciones } from '../../utils/universoDeFilmmaker';
import { etiquetaAccesible } from '../../utils/ideaDeFilmmaker';

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
}

/**
 * EL UNIVERSO (etapa 2): la lámina del reparto como pieza central. Rejilla de retratos con nombre y línea, secciones «Principales / Importantes /
 * Grupos / Otros» (solo personajes), contadores y tres pestañas (personajes, lugares, objetos). Tocar un retrato abre su ficha. Los elementos los
 * añade la persona con la caja común de abajo («Nombre — descripción»). El retrato es un marcador con la inicial: generar imágenes está CERRADO
 * (regla 10) y la lámina se rotula «referencia de estilo, no vista previa exacta». «Weë lee los personajes» y regenerar salen cerrados con motivo.
 * El único botón blanco aprueba el universo; aprobado, pasa a «Continuar a Tandas» (cerrado hasta la ola 3).
 */
export const UniversoDeFilmmaker: React.FC<Props> = ({ universo, ancho, compacto, onAbrir, onAprobar, onEjemplo, onQuitarEjemplo, onContinuar, onAviso, seccion, onSeccion }) => {
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
  const puede = puedeAprobar(universo);
  const ejemplos = hayEjemplos(universo);

  const cerradoFila = (claveTitulo: string, claveMotivo: string, icono: 'cerebro' | 'galeria') => (
    <TouchableOpacity onPress={() => onAviso(claveMotivo)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t(claveTitulo), t(claveMotivo))} accessibilityState={{ disabled: true }} style={[styles.cerrado, dir.contenedor]}>
      <IconoWee name={icono} size={16} color={P.tintaDeshabilitada} />
      <View style={{ flex: 1 }}>
        <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={1}>{t(claveTitulo)}</Text>
        <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={3}>{t(claveMotivo)}</Text>
      </View>
      <Ionicons name="lock-closed-outline" size={14} color={P.tintaDeshabilitada} />
    </TouchableOpacity>
  );

  const retrato = (e: ElementoDeUniverso) => (
    <TouchableOpacity key={e.id} onPress={() => onAbrir(e)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(e.nombre, e.linea || null, t('filmmaker.uniOpenSheet'))} style={{ width: lado }}>
      <View style={[styles.retrato, { height: Math.round(lado * 1.2) }]}>
        <LinearGradient colors={['#0A0D13', '#1B2029']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={[textoPortada(Math.round(lado * 0.36), '600'), { color: P.tintaSecundaria }]} accessibilityElementsHidden importantForAccessibility="no">{Array.from(e.nombre)[0]?.toUpperCase()}</Text>
        <View style={[styles.tipo, dir.esRTL ? { start: 8 } : { end: 8 }]}><IconoWee name={def.icono} size={12} color={P.tintaSecundaria} /></View>
      </View>
      <Text style={[textoPortada(14, '600'), dir.texto, { color: P.tinta, marginTop: 6 }]} numberOfLines={1}>{e.nombre}</Text>
      {e.linea ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={4}>{e.linea}</Text> : null}
      {e.ejemplo ? <Text style={[textoPortada(11, '600'), dir.texto, { color: P.luzSecundaria, marginTop: 2 }]}>{t('filmmaker.uniExampleBadge')}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.raiz}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <View style={[styles.cabeza, dir.contenedor]}>
          <Text style={[textoPortada(compacto ? 18 : 22, '600'), dir.texto, { color: P.tinta, flex: 1 }]} accessibilityRole="header" numberOfLines={1}>{t('filmmaker.uniTitle')}</Text>
          {universo.aprobado ? <View style={[styles.aprobado, dir.contenedor]}><Ionicons name="checkmark" size={14} color={P.tinta} /><Text style={[textoPortada(12, '600'), { color: P.tinta }]}>{t('filmmaker.uniApproved')}</Text></View> : null}
        </View>
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.uniCounts', { personajes: formato.numero(n.character), lugares: formato.numero(n.place), objetos: formato.numero(n.object) })}</Text>

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
        <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]}>{t('filmmaker.uniStyleNote')}</Text>
        {!LEER_PERSONAJES_ABIERTO ? cerradoFila('filmmaker.uniReadCharacters', 'filmmaker.uniReadClosed', 'cerebro') : null}
        {!GENERAR_IMAGENES_DEL_UNIVERSO ? cerradoFila('filmmaker.uniRegenerate', 'filmmaker.uniRegenerateClosed', 'galeria') : null}
      </ScrollView>

      <View style={styles.pie}>
        {universo.aprobado ? (
          <TouchableOpacity onPress={onContinuar} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('filmmaker.uniContinue')} style={styles.principal}>
            <Text style={[textoPortada(16, '600'), { color: P.sobreAccion }]} numberOfLines={1}>{t('filmmaker.uniContinue')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onAprobar} disabled={!puede} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={etiquetaAccesible(t('filmmaker.uniApprove'), puede ? null : t('filmmaker.uniApproveWhy'))} accessibilityState={{ disabled: !puede }} style={[styles.principal, !puede && styles.principalApagado]}>
            <Text style={[textoPortada(16, '600'), { color: puede ? P.sobreAccion : P.tintaDeshabilitada }]} numberOfLines={1}>{t('filmmaker.uniApprove')}</Text>
          </TouchableOpacity>
        )}
        {universo.aprobado ? null : !puede ? <Text style={[textoPortada(12, '400'), dir.texto, { color: P.tintaSecundaria }]} accessibilityLiveRegion="polite">{t('filmmaker.uniApproveWhy')}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aprobado: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: P.bordeLuz, backgroundColor: P.superficie },
  pestanas: { flexDirection: 'row', borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.fondo, padding: 3, gap: 3 },
  pestana: { flex: 1, minHeight: 44, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  pestanaSel: { backgroundColor: P.superficieAlta, borderWidth: 1, borderColor: P.bordeLuz },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  retrato: { borderRadius: 16, borderWidth: 1, borderColor: P.bordeLuz, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tipo: { position: 'absolute', top: 8 },
  vacio: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  ejemplo: { minHeight: 44, alignSelf: 'flex-start', paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: P.bordeLuz, alignItems: 'center', justifyContent: 'center' },
  cerrado: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: P.bordeCapsula },
  pie: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 6 },
  principal: { minHeight: 52, borderRadius: 26, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
  principalApagado: { backgroundColor: 'transparent', borderWidth: 1, borderColor: P.bordeCapsula },
});
