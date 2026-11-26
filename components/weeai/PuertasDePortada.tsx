import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconoWee } from '../icons/IconoWee';
import type { NombreDeIcono } from '../icons/trazosDeWee';
import IconoDireccional from '../IconoDireccional';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SPACING } from '../../constants/estiloWeeAi';

export interface PuertaDePortada {
  id: string;
  icono: NombreDeIcono;
  nombre: string;
  desc: string;
  alPulsar: () => void;
}

/** Lo que mide una puerta en el teléfono, y el aire entre ellas: la portada reparte su altura con estas cifras. */
export const ALTO_DE_PUERTA = 68;
export const HUECO_DE_PUERTAS = 8;

/**
 * LAS TRES PUERTAS DE WEËAI (boceto aprobado, 2026-11-23): Imagen, Video corto y Editar mi foto, con el MISMO material
 * del módulo de siempre (#101319, borde #292E38, radio 18 y su sombra). En el teléfono van en FILAS A LO ANCHO —icono,
 * nombre y una línea de para qué sirve—, porque «Editar mi foto» no cabe en una tarjeta cuadrada de 112 px en 42 idiomas;
 * en escritorio, las tres en fila. Los nombres no se cortan: dos líneas como mucho, y la línea de ayuda debajo.
 */
export const PuertasDePortada: React.FC<{ puertas: PuertaDePortada[]; enFila: boolean }> = ({ puertas, enFila }) => {
  const dir = useDireccion();
  return (
    <View style={[enFila ? styles.rejilla : styles.columna, enFila ? dir.contenedor : null]}>
      {puertas.map((p) => (
        <TouchableOpacity
          key={p.id}
          onPress={p.alPulsar}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${p.nombre}. ${p.desc}`}
          style={[styles.puerta, P.sombraModulo, enFila ? styles.puertaEnFila : [styles.puertaEnColumna, dir.contenedor]]}
        >
          <View style={styles.icono}>
            <IconoWee name={p.icono} size={enFila ? 30 : 28} color={P.iconoModulo} />
          </View>
          <View style={styles.texto}>
            <Text style={[textoPortada(17, '600'), dir.texto, { color: P.tinta }]} numberOfLines={2}>{p.nombre}</Text>
            <Text style={[textoPortada(13, '400', { lineHeight: 18 }), dir.texto, { color: P.tintaSecundaria }]} numberOfLines={2}>{p.desc}</Text>
          </View>
          <View style={enFila ? styles.flechaArriba : null}>
            <IconoDireccional name="chevron-forward" size={18} color={P.tintaSecundaria} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  columna: { gap: HUECO_DE_PUERTAS },
  rejilla: { flexDirection: 'row', gap: 14 },
  puerta: { backgroundColor: P.modulo, borderColor: P.borde, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  puertaEnColumna: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: ALTO_DE_PUERTA, paddingVertical: 10, paddingStart: 10, paddingEnd: 14 },
  puertaEnFila: { flex: 1, minWidth: 0, minHeight: 170, padding: 18, gap: 16, alignItems: 'flex-start' },
  icono: { width: 48, height: 48, borderRadius: 14, backgroundColor: P.superficieAlta, borderColor: P.bordeCapsula, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, minWidth: 0, gap: 1, alignSelf: 'stretch', justifyContent: 'center' },
  flechaArriba: { position: 'absolute', top: 18, end: 16 },
});
