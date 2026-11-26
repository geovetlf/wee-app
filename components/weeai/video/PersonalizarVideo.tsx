import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { FilaDePildoras } from './PiezasDeElementos';
import { useT } from '../../../contexts/IdiomaContext';
import { useDireccion } from '../../../hooks/useDireccion';
import { useEstiloWeeAi } from '../../../hooks/useEstiloWeeAi';
import { ElementoElegido } from '../../../constants/catalogoElementos';
import { ModoDePersonalizar, PlantillaWeeAi, modosPermitidos, ranurasDe } from '../../../constants/plantillasWeeAi';
import { ESPACIO_WEEAI as SP, RADIO_WEEAI, textoWeeAi } from '../../../constants/estiloWeeAi';
import { scale } from '../../../utils/scale';

export interface EstadoDePersonalizar {
  modo: ModoDePersonalizar;
  onModo: (m: ModoDePersonalizar) => void;
  huecos: Record<string, ElementoElegido | null>;
  onElegir: (ranura: string) => void;
  onQuitar: (ranura: string) => void;
}

const CLAVE_DEL_ROL: Record<string, string> = { you: 'composer.you', other: 'aiAvatar.genderOther' };

/**
 * «PERSONALIZAR»: una plantilla de video es un video ya hecho que la persona VE y puede hacer SUYO con su cara o con su cuerpo entero.
 * Dos opciones de una palabra («Cara», «Cuerpo»; por defecto la que declara la plantilla) y una ranura por persona de la plantilla
 * («Tú», «Otro»), cada una con su «+» (abre la hoja de elementos en Personajes · Míos) y su ✕. SOLO INTERFAZ: lo elegido NO se envía a
 * ningún servidor todavía (la referencia real exigiría `video.reference` de Seedance; ver «Pendiente de integración»). El aviso de uso
 * es una PROPUESTA de texto que debe revisar el dueño.
 */
const PersonalizarVideo: React.FC<{ plantilla: PlantillaWeeAi; estado: EstadoDePersonalizar; oscuroSobreImagen?: boolean }> = ({ plantilla, estado, oscuroSobreImagen }) => {
  const c = useEstiloWeeAi();
  const t = useT();
  const dir = useDireccion();
  const ranuras = ranurasDe(plantilla);
  if (plantilla.categoria === 'imagen' || ranuras.length === 0) return null;
  const permitidos = modosPermitidos(plantilla);
  const opciones = permitidos.map((m) => ({ id: m, texto: t(m === 'cara' ? 'weeai.modeFace' : 'weeai.modeBody') }));
  return (
    <View style={styles.caja}>
      <Text numberOfLines={1} style={[textoWeeAi('enfasis', '600'), dir.texto, { color: c.tinta }]} accessibilityRole="header">{t('menu.customize')}</Text>
      {opciones.length > 1 ? <FilaDePildoras opciones={opciones} puesta={estado.modo} onElegir={(id) => estado.onModo(id as ModoDePersonalizar)} /> : null}
      <View style={[styles.ranuras, dir.contenedor]}>
        {ranuras.map((r) => {
          const e = estado.huecos[r.id];
          const rol = t(CLAVE_DEL_ROL[r.rol] ?? 'composer.you');
          return (
            <View key={r.id} style={styles.ranura}>
              <TouchableOpacity onPress={() => estado.onElegir(r.id)} accessibilityRole="button" accessibilityLabel={rol} style={[styles.hueco, { backgroundColor: c.superficie }]}>
                {e?.uri ? <Image source={{ uri: e.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : <Ionicons name="add" size={scale(26)} color={c.tinta} />}
              </TouchableOpacity>
              {e ? (
                <TouchableOpacity onPress={() => estado.onQuitar(r.id)} accessibilityRole="button" accessibilityLabel={t('common.delete')} hitSlop={10} style={[styles.quitar, { backgroundColor: c.seleccion }]}>
                  <Ionicons name="close" size={scale(12)} color={c.sobreSeleccion} />
                </TouchableOpacity>
              ) : null}
              <Text numberOfLines={1} style={[textoWeeAi('nota', '500'), styles.rol, { color: c.tintaSecundaria }]}>{rol}</Text>
            </View>
          );
        })}
      </View>
      <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaSecundaria }]}>{t(estado.modo === 'cara' ? 'weeai.helpFace' : 'weeai.helpBody')}</Text>
      <Text style={[textoWeeAi('nota'), dir.texto, { color: c.tintaTerciaria }]}>{t('weeai.ownImageNotice')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  caja: { gap: SP.sm },
  ranuras: { flexDirection: 'row', gap: SP.md },
  ranura: { alignItems: 'center', gap: 4 },
  hueco: { width: scale(64), height: scale(64), borderRadius: scale(32), overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  quitar: { position: 'absolute', top: -4, end: -4, width: 22, height: 22, borderRadius: RADIO_WEEAI.control / 2 + 5, alignItems: 'center', justifyContent: 'center' },
  rol: { maxWidth: 80, textAlign: 'center' },
});

export default PersonalizarVideo;
