import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { IconoWee } from '../icons/IconoWee';
import type { NombreDeIcono } from '../icons/trazosDeWee';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { uriDeTextura, TexturaDeModulo } from './arteDePortada';
import { emDeTexto } from './medidaDeTexto';

export interface ModuloDePortada {
  id: string;
  icono: NombreDeIcono;
  /** Clave del nombre: UNA palabra, UNA línea. */
  clave: string;
  textura: TexturaDeModulo;
  /** Sin `alPulsar`, el módulo no tiene flujo real: se ve apagado con «Próximamente» y no navega. */
  alPulsar?: () => void;
}

export const HUECO_DE_MODULOS = 10;
export const PADDING_DE_TARJETA = 3;

/** Si todos los nombres caben en una línea en una tarjeta de ese ancho sin bajar del 0,7 del tamaño base (15). */
export const cabenEnUnaLinea = (nombres: string[], lado: number): boolean => nombres.every((n) => emDeTexto(n) * Math.ceil(15 * 0.7) <= lado - 2 * PADDING_DE_TARJETA);


/**
 * El tamaño con el que una palabra cabe en una línea: el base, o el que haga falta sin bajar de `base * minimo` (0,7).
 * En web `adjustsFontSizeToFit` no existe, así que el ajuste se calcula aquí y vale igual en todas las plataformas.
 */
export const tamanoQueCabe = (texto: string, base: number, ancho: number, minimo = 0.7): number => {
  const hace = Math.ceil(base * minimo);
  const cabe = Math.floor(ancho / emDeTexto(texto));
  return Math.max(hace, Math.min(base, cabe));
};

/**
 * La rejilla de módulos: tarjetas compactas con una textura monocroma muy discreta. Las columnas y el alto de la tarjeta los
 * decide la portada según lo que mide la pantalla (la portada es fija: no se desplaza).
 */
export const ModulosDePortada: React.FC<{ modulos: ModuloDePortada[]; ancho: number; columnas: number; alto: number }> = ({ modulos, ancho, columnas, alto }) => {
  const t = useT();
  const dir = useDireccion();
  const lado = Math.floor((ancho - HUECO_DE_MODULOS * (columnas - 1)) / columnas);
  const icono = alto >= 84 ? 28 : 24;
  const util = lado - 2 * PADDING_DE_TARJETA;
  return (
    <View style={[styles.rejilla, dir.contenedor]}>
      {modulos.map((m) => {
        const activo = !!m.alPulsar;
        const color = activo ? P.iconoModulo : P.tintaDeshabilitada;
        const nombre = t(m.clave);
        const pronto = t('common.comingSoon');
        return (
          <TouchableOpacity
            key={m.id}
            onPress={m.alPulsar}
            disabled={!activo}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={activo ? nombre : `${nombre}. ${pronto}`}
            accessibilityState={{ disabled: !activo }}
            style={[styles.tarjeta, P.sombraModulo, { width: lado, height: alto }]}
          >
            {m.textura !== 'mas' ? <Image source={{ uri: uriDeTextura(m.textura, P.iconoModulo) }} style={[StyleSheet.absoluteFill, { opacity: activo ? 1 : 0.45 }]} contentFit="cover" transition={0} accessible={false} pointerEvents="none" /> : null}
            <IconoWee name={m.icono} size={icono} color={color} />
            {/* Una palabra, una línea: el tamaño se calcula para que quepa (mínimo 0,7 del base) y, si aun así no cabe, se ajusta o se corta. */}
            <Text style={[textoPortada(tamanoQueCabe(nombre, 15, util), '500'), styles.nombre, { color: activo ? P.tinta : P.tintaDeshabilitada }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{nombre}</Text>
            {!activo ? <Text style={[textoPortada(Math.max(10, tamanoQueCabe(pronto, 11, util * 2, 0.9)), '500'), styles.pronto, { color: P.tintaDeshabilitada }]} numberOfLines={2}>{pronto}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: HUECO_DE_MODULOS },
  tarjeta: { backgroundColor: P.modulo, borderColor: P.borde, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: PADDING_DE_TARJETA, overflow: 'hidden' },
  nombre: { textAlign: 'center', maxWidth: '100%' },
  pronto: { textAlign: 'center', maxWidth: '100%', marginTop: -2 },
});
