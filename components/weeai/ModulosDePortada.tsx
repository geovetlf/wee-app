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
/** Cuántas tarjetas lleva cada fila: 3 · 3 · 2 (la última, centrada). */
export const FILAS_DE_MODULOS = [3, 3, 2] as const;

/**
 * UN SOLO tamaño de letra para todos los nombres (el base, o el que haga falta para el más largo sin bajar del 0,7 del base, 15). En web
 * `adjustsFontSizeToFit` no existe, así que se calcula aquí y vale igual en todas las plataformas. Todos los nombres comparten escala: nada
 * de una tarjeta con otra letra que sus vecinas.
 */
export const tamanoUniforme = (nombres: string[], lado: number, base = 15, minimo = lado < 76 ? 0.6 : 0.7): number => {
  const util = lado - 2 * PADDING_DE_TARJETA;
  const hace = Math.ceil(base * minimo);
  const cabe = Math.min(...nombres.map((n) => Math.floor(util / emDeTexto(n, 0.58))));
  return Math.max(hace, Math.min(base, cabe));
};

/**
 * Una palabra latina (marca, «Filmmaker», «3D») entre nombres árabes u hebreos: la fuente de reserva de esa escritura tiene el ojo (altura de x) más
 * pequeño que Manrope, y al mismo cuerpo el nombre latino parece más grande y se acerca a los bordes. Se compensa con 0,86 del tamaño común.
 */
const CORRECCION_LATINO_EN_RTL = 0.86;
const esRtlScript = (n: string) => /[\u0590-\u06FF]/.test(n);
const esSoloLatino = (n: string) => !/[^\u0000-\u024F]/.test(n);
export const tamanoDeNombre = (nombre: string, tam: number, nombres: string[]): number =>
  esSoloLatino(nombre) && nombres.filter(esRtlScript).length > nombres.length / 2 ? Math.max(10, Math.floor(tam * CORRECCION_LATINO_EN_RTL)) : tam;

/**
 * La rejilla de módulos: tarjetas CUADRADAS e iguales (lado `lado`), tres por fila y la última de dos centrada. El contenido de cada tarjeta
 * va sobre el mismo eje: el icono a una altura fija, el nombre en su línea y, debajo, un hueco reservado de la misma altura para la etiqueta
 * «Próximamente» (las tarjetas habilitadas lo dejan vacío): el nombre no se mueve de una tarjeta a otra.
 */
export const ModulosDePortada: React.FC<{ modulos: ModuloDePortada[]; lado: number; hueco: number }> = ({ modulos, lado, hueco }) => {
  const t = useT();
  const dir = useDireccion();
  const icono = lado >= 96 ? 30 : lado >= 80 ? 26 : 22;
  const nombres = modulos.map((m) => t(m.clave));
  const tam = tamanoUniforme(nombres, lado);
  const pronto = t('common.comingSoon');
  const tamPronto = Math.max(9, Math.min(11, Math.floor((lado - 2 * PADDING_DE_TARJETA) / emDeTexto(pronto, 0.58))));
  const filas: ModuloDePortada[][] = [];
  let i = 0;
  for (const n of FILAS_DE_MODULOS) { filas.push(modulos.slice(i, i + n)); i += n; }
  return (
    <View style={{ gap: hueco }}>
      {filas.map((fila, f) => (
        <View key={f} style={[styles.fila, dir.contenedor, { gap: hueco }]}>
          {fila.map((m) => {
            const activo = !!m.alPulsar;
            const color = activo ? P.iconoModulo : P.tintaDeshabilitada;
            const nombre = t(m.clave);
            return (
              <TouchableOpacity
                key={m.id}
                onPress={m.alPulsar}
                disabled={!activo}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={activo ? nombre : `${nombre}. ${pronto}`}
                accessibilityState={{ disabled: !activo }}
                style={[styles.tarjeta, P.sombraModulo, { width: lado, height: lado }]}
              >
                {m.textura !== 'mas' ? <Image source={{ uri: uriDeTextura(m.textura, P.iconoModulo) }} style={[StyleSheet.absoluteFill, { opacity: activo ? 1 : 0.45 }]} contentFit="cover" transition={0} accessible={false} pointerEvents="none" /> : null}
                <View style={styles.contenido}>
                  <IconoWee name={m.icono} size={icono} color={color} />
                  <Text style={[textoPortada(tamanoDeNombre(nombre, tam, nombres), '500'), styles.nombre, { color: activo ? P.tinta : P.tintaDeshabilitada }]} numberOfLines={1}>{nombre}</Text>
                  <View style={styles.hueco}>
                    {!activo ? <Text style={[textoPortada(tamPronto, '500'), styles.pronto, { color: P.tintaDeshabilitada }]} numberOfLines={1}>{pronto}</Text> : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', justifyContent: 'center' },
  tarjeta: { backgroundColor: P.modulo, borderColor: P.borde, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  contenido: { alignItems: 'center', gap: 4, paddingHorizontal: PADDING_DE_TARJETA, maxWidth: '100%' },
  nombre: { textAlign: 'center', maxWidth: '100%' },
  hueco: { height: 14, alignItems: 'center', justifyContent: 'center', maxWidth: '100%' },
  pronto: { textAlign: 'center', maxWidth: '100%' },
});
