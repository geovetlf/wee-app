import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLOR, ESPACIO, LINEA, RADIO, TIPO } from './estilo';
import Icono from './Iconos';

/*
 * LA TARJETA DEL PERSONAJE: la ficha vista como la verá el mundo.
 *
 * Es una vista previa en vivo, blanco sobre negro, de lo que la persona va
 * escribiendo. El nombre, la frase y los rasgos son CONTENIDO suyo y se pintan
 * tal cual; las etiquetas (tono, nivel, «vista previa») llegan ya traducidas.
 */

interface Props {
  vistaPrevia: string;
  nombre: string;
  nombreVacio: string;
  resumen: string;
  resumenVacio: string;
  rasgos: string[];
  meta: string[];
}

/** La primera letra visible del nombre (un emoji o una letra con tilde cuentan como una). */
const inicial = (nombre: string): string => {
  const primera = Array.from(nombre.trim())[0];
  return primera ? primera.toLocaleUpperCase() : '';
};

const TarjetaDelPersonaje: React.FC<Props> = ({ vistaPrevia, nombre, nombreVacio, resumen, resumenVacio, rasgos, meta }) => {
  const letra = inicial(nombre);
  return (
    <View style={s.tarjeta}>
      {/* Solo «Vista previa»: «Perfil Weë» ya lo dice la portada justo encima. */}
      <View style={s.cabeza}>
        <Text style={s.rotulo}>{vistaPrevia}</Text>
      </View>

      <View style={s.identidad}>
        <View style={s.monograma} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {letra ? <Text style={s.letra}>{letra}</Text> : <Icono nombre="personaje" tamano={28} color={COLOR.textoTenue} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.nombre, !nombre.trim() && s.vacio]} numberOfLines={2}>
            {nombre.trim() || nombreVacio}
          </Text>
          {meta.length ? <Text style={s.meta} numberOfLines={2}>{meta.join('  ·  ')}</Text> : null}
        </View>
      </View>

      <Text style={[s.resumen, !resumen.trim() && s.vacio]} numberOfLines={4}>{resumen.trim() || resumenVacio}</Text>

      {rasgos.length ? (
        <View style={s.rasgos}>
          {rasgos.slice(0, 6).map((r) => (
            <View key={r} style={s.rasgo}><Text style={s.rasgoTexto} numberOfLines={1}>{r}</Text></View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  tarjeta: {
    backgroundColor: COLOR.negro, borderRadius: RADIO.xl, borderWidth: LINEA, borderColor: COLOR.lineaMedia,
    padding: ESPACIO.xl, gap: ESPACIO.lg, overflow: 'hidden',
  },
  cabeza: { flexDirection: 'row', justifyContent: 'space-between', gap: ESPACIO.md, flexWrap: 'wrap' },
  rotulo: { ...TIPO.rotulo, color: COLOR.textoTenue },
  identidad: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.lg },
  monograma: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: COLOR.lineaFuerte,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR.carbon,
  },
  letra: { ...TIPO.titulo, color: COLOR.blanco },
  nombre: { ...TIPO.display, color: COLOR.blanco },
  meta: { ...TIPO.pequeno, color: COLOR.textoSecundario, marginTop: ESPACIO.xs },
  resumen: { ...TIPO.cuerpo, color: COLOR.texto },
  vacio: { color: COLOR.textoTenue },
  rasgos: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.sm },
  rasgo: { paddingHorizontal: ESPACIO.md, paddingVertical: ESPACIO.xs, borderRadius: RADIO.pastilla, borderWidth: 1, borderColor: COLOR.lineaMedia, maxWidth: '100%' },
  rasgoTexto: { ...TIPO.pequeno, color: COLOR.texto },
});

export default TarjetaDelPersonaje;
