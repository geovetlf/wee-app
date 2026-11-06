import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../IconoDireccional';
import { MARCA } from '../../constants/marca';
import { RellenoDeMarca } from '../GradienteDeMarca';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useDireccion } from '../../hooks/useDireccion';
import { scale } from '../../utils/scale';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { useIdioma } from '../../contexts/IdiomaContext';

/*
 * LA PORTADA DE WEË TRAVEL, COMO EN LA DEMO YC. Todo entra por la conversación de siempre con Weë Brain: una función
 * del catálogo (`onAccion`, con su pregunta ya contestada) o una frase (`onIdea`). Weë Travel no reserva nada, así que la
 * tarjeta del plan completo no promete reservas. Los nombres de los países salen de `Intl.DisplayNames` en el idioma
 * activo (i18n/formato.ts), nunca escritos a mano.
 */

const MASCOTA = require('../../assets/images/sectores/travel-mascota.jpg');
export interface AccionesDeTravel {
  /** Una de las funciones de Weë Travel: 'plan' | 'where' | 'doing' | 'moving'. */
  onAccion: (id: string) => void;
  onIdea: (texto: string) => void;
}

/*
 * EL HÉROE DE WEË TRAVEL (rediseño del dueño, 2026-11-05).
 *
 * Una mancha orgánica y lila —esquinas distintas, nada de rectángulo— con el paisaje y el robot de Travel a la
 * derecha, fundidos con el lila, y el mensaje a la izquierda: «Plan your trip with someone» y, en morado eléctrico,
 * «who's been there.». Sin fichas dentro: las cuatro píldoras (Plan, Flights, Hotels, Activities) se retiraron y no
 * se sustituyen; todo eso sigue a un toque en la caja de abajo y en las puertas del cuerpo. Es propio de Weë Travel:
 * la pieza común `HeroDeSector` de las demás secciones no cambia. Las props se conservan para no tocar quien lo pinta.
 */
const LILA = '#EEDFFF';
const MORADO_ELECTRICO = '#7200FF';
const TINTA = '#1A1033';
const RADIOS = { borderTopLeftRadius: scale(56), borderTopRightRadius: scale(150), borderBottomRightRadius: scale(112), borderBottomLeftRadius: scale(72) };

export const HeroDeTravel: React.FC<AccionesDeTravel> = ({ onAccion }) => {
  const { t } = useIdioma();
  const dir = useDireccion();
  const [ancho, setAncho] = useState(0);
  /* Más bajo que el de antes: proporción de la referencia, con suelo para que quepa el texto y techo en escritorio. */
  const alto = Math.round(Math.min(Math.max(ancho * 0.62, scale(228)), scale(330)));
  /* En escritorio la foto no se estira con la mancha: guarda su proporción (retrato) para que el robot se vea entero. */
  const anchoDeLaFoto = ancho > 600 ? { width: Math.round(alto * 1.05) } : null;
  const desde = dir.esRTL ? { x: 1, y: 0 } : { x: 0, y: 0 };
  const hasta = dir.esRTL ? { x: 0, y: 0 } : { x: 1, y: 0 };
  return (
    <View style={[h.envoltura, RADIOS]} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      <View style={[h.mancha, RADIOS, dir.contenedor, { minHeight: alto || undefined }]}>
        <LinearGradient colors={[LILA, '#F6EEFF', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Image
          source={MASCOTA}
          style={[h.paisaje, dir.alFinal(0), anchoDeLaFoto]}
          contentFit="cover"
          contentPosition="top center"
          transition={0}
          accessible={false}
        />
        {/* El paisaje entra en el lila: sin borde recto entre la foto y el fondo. */}
        <LinearGradient
          colors={['#F2E8FF', 'rgba(242,232,255,0.7)', 'rgba(242,232,255,0)']}
          locations={[0, 0.3, 0.62]}
          start={desde}
          end={hasta}
          style={[h.fundido, dir.alFinal(0), anchoDeLaFoto]}
          pointerEvents="none"
        />
        <LinearGradient colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']} style={h.fundidoArriba} pointerEvents="none" />
        <View style={[h.texto, ancho > 600 && h.textoAncho]}>
          <Text style={[h.titulo, ancho > 600 && h.tituloAncho]} accessibilityRole="header">
            {`${t('weeai.travelHeroLine1')}\n${t('weeai.travelHeroLine2')}\n`}
            <Text style={h.acento}>{t('weeai.travelHeroAccent')}</Text>
          </Text>
          <Text style={[h.descripcion, ancho > 600 && h.descripcionAncha]}>{t('catalogo.travelIntro')}</Text>
          {/* «Planear con IA»: dorado porque es de Weë; abre la conversación de siempre con Weë Brain (la función «plan»). */}
          <TouchableOpacity onPress={() => onAccion('plan')} style={h.cta} activeOpacity={0.85} accessibilityRole="button">
            <RellenoDeMarca radio={999} />
            <Ionicons name="sparkles" size={15} color={MARCA.sobrePrimario} />
            <Text style={h.ctaTexto} numberOfLines={2}>{t('travel.planWithAi')}</Text>
            {ancho >= 360 && <IconoDireccional name="arrow-forward" size={15} color={MARCA.sobrePrimario} />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const h = StyleSheet.create({
  /* Devuelve el margen que la portada quita para ir a sangre y separa la mancha de la caja: aquí no se montan. */
  envoltura: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: scale(30) + SPACING.lg,
    backgroundColor: '#FFFFFF',
    shadowColor: MORADO_ELECTRICO,
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  mancha: { overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255, 198, 41, 0.45)', justifyContent: 'center', minHeight: scale(228) },
  paisaje: { position: 'absolute', top: 0, bottom: 0, width: '60%' },
  fundido: { position: 'absolute', top: 0, bottom: 0, width: '60%' },
  fundidoArriba: { position: 'absolute', top: 0, left: 0, right: 0, height: '22%' },
  texto: { maxWidth: '56%', paddingStart: scale(26), paddingEnd: scale(8), paddingVertical: scale(26), gap: scale(10) },
  titulo: { color: TINTA, fontSize: scale(23), lineHeight: scale(27), fontWeight: FONT_WEIGHT.bold, letterSpacing: -0.5 },
  acento: { color: MORADO_ELECTRICO },
  /* En escritorio la mancha es ancha: el texto no crece con ella, se queda en su columna y a tamaño de lectura. */
  textoAncho: { maxWidth: 420, paddingStart: 40 },
  tituloAncho: { fontSize: 32, lineHeight: 37 },
  descripcionAncha: { fontSize: 15, lineHeight: 22 },
  descripcion: { color: '#3F3A52', fontSize: FONT_SIZE.xs, lineHeight: scale(17) },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: scale(4), paddingHorizontal: scale(14), minHeight: scale(36), paddingVertical: scale(6), borderRadius: 999, backgroundColor: MARCA.primarioClaro, maxWidth: '100%' },
  ctaTexto: { color: MARCA.sobrePrimario, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, flexShrink: 1 },
});

export { default as CuerpoDeTravel } from '../travel/CuerpoDeTravel';
