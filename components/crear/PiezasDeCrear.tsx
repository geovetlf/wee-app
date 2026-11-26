import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { IconoWee } from '../icons/IconoWee';
import type { NombreDeIcono } from '../icons/trazosDeWee';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SP, NUMEROS_TABULARES } from '../../constants/estiloWeeAi';

/**
 * LAS PIEZAS DE «CREAR PARA PUBLICAR» (boceto aprobado WeëAI sencillo, 2026-11-23).
 *
 * El material es el de la portada de WeëAI v2 —negro profundo, módulos #101319 con borde #292E38, Manrope 400/500/600, la
 * acción principal BLANCA con texto negro—: todo sale de `PORTADA_WEEAI`, ningún color suelto. Propiedades lógicas
 * (start/end) y `dir.contenedor` en cada fila: en árabe y hebreo se lee al revés sin tocar nada.
 */

/** El rótulo pequeño de cada bloque («Tu idea», «Estilo»…). */
export const Rotulo: React.FC<{ texto: string; extra?: string }> = ({ texto, extra }) => {
  const dir = useDireccion();
  return (
    <Text style={[textoPortada(13, '600'), styles.rotulo, dir.texto, { color: P.tintaSecundaria }]} accessibilityRole="header">
      {texto}
      {extra ? <Text style={textoPortada(13, '400')}>{` · ${extra}`}</Text> : null}
    </Text>
  );
};

/** Una tarjeta de formato: la silueta de la proporción, el destino y una línea de para qué sirve. */
export const TarjetaDeFormato: React.FC<{ nombre: string; desc?: string; ancho: number; alto: number; puesta: boolean; onPress: () => void }> = ({ nombre, desc, ancho, alto, puesta, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="radio"
    accessibilityState={{ checked: puesta }}
    accessibilityLabel={desc ? `${nombre}, ${desc}` : nombre}
    style={[styles.formato, puesta ? styles.formatoPuesto : null]}
  >
    <View style={styles.marcoFormato}>
      <View style={[styles.forma, { width: ancho, height: alto, borderColor: puesta ? P.tinta : P.tintaSecundaria, backgroundColor: puesta ? 'rgba(229,236,255,0.08)' : 'transparent' }]} />
    </View>
    <Text style={[textoPortada(14, '600'), styles.centrado, { color: P.tinta }]} numberOfLines={2}>{nombre}</Text>
    {desc ? <Text style={[textoPortada(12, '400'), styles.centrado, { color: P.tintaSecundaria }]} numberOfLines={2}>{desc}</Text> : null}
  </TouchableOpacity>
);

/** Una píldora elegible (estilo, duración, sugerencia). `radio` para las que excluyen; sin él, es un botón. */
export const Chip: React.FC<{ texto: string; puesta?: boolean; icono?: NombreDeIcono; extra?: string; radio?: boolean; deshabilitada?: boolean; onPress: () => void; etiqueta?: string }> = ({ texto, puesta, icono, extra, radio, deshabilitada, onPress, etiqueta }) => {
  const dir = useDireccion();
  const color = puesta ? P.sobreAccion : deshabilitada ? P.tintaDeshabilitada : P.tintaSecundaria;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={deshabilitada}
      activeOpacity={0.85}
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityState={radio ? { checked: !!puesta, disabled: !!deshabilitada } : { disabled: !!deshabilitada }}
      accessibilityLabel={etiqueta ?? (extra ? `${texto}, ${extra}` : texto)}
      style={[styles.chip, dir.contenedor, puesta ? styles.chipPuesta : null]}
    >
      {icono ? <IconoWee name={icono} size={15} color={color} /> : null}
      <Text style={[textoPortada(14, puesta ? '600' : '500'), { color }]} numberOfLines={1}>{texto}</Text>
      {extra ? <Text style={[textoPortada(12, '500'), NUMEROS_TABULARES, { color: puesta ? P.sobreAccion : P.tintaDeshabilitada }]} numberOfLines={1}>{extra}</Text> : null}
    </TouchableOpacity>
  );
};

/** Una fila de píldoras que salta de línea (en 42 idiomas los nombres no caben siempre en una). */
export const FilaDeChips: React.FC<{ children: React.ReactNode; accesible?: string }> = ({ children, accesible }) => {
  const dir = useDireccion();
  return (
    <View style={[styles.chips, dir.contenedor]} accessibilityRole={accesible ? 'radiogroup' : undefined} accessibilityLabel={accesible}>
      {children}
    </View>
  );
};

/** La acción principal: blanca con texto negro (la de la portada v2). Ocupada, enseña la rueda. */
export const BotonPrincipal: React.FC<{ texto: string; icono?: NombreDeIcono; onPress: () => void; deshabilitado?: boolean; ocupado?: boolean; style?: StyleProp<ViewStyle> }> = ({ texto, icono, onPress, deshabilitado, ocupado, style }) => {
  const dir = useDireccion();
  const apagado = deshabilitado || ocupado;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={apagado}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ disabled: !!apagado, busy: !!ocupado }}
      style={[styles.principal, dir.contenedor, apagado && !ocupado ? styles.principalApagado : null, style]}
    >
      {ocupado ? <ActivityIndicator color={P.sobreAccion} /> : icono ? <IconoWee name={icono} size={20} color={apagado ? P.tintaDeshabilitada : P.sobreAccion} /> : null}
      <Text style={[textoPortada(17, '600'), { color: apagado && !ocupado ? P.tintaDeshabilitada : P.sobreAccion }]} numberOfLines={1}>{texto}</Text>
    </TouchableOpacity>
  );
};

/** La acción secundaria: superficie oscura con borde de cápsula. `texto` sin fondo para la terciaria. */
export const BotonSecundario: React.FC<{ texto: string; icono?: NombreDeIcono; onPress: () => void; deshabilitado?: boolean; plano?: boolean; etiqueta?: string; style?: StyleProp<ViewStyle> }> = ({ texto, icono, onPress, deshabilitado, plano, etiqueta, style }) => {
  const dir = useDireccion();
  const color = deshabilitado ? P.tintaDeshabilitada : plano ? P.tintaSecundaria : P.tinta;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={deshabilitado}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? texto}
      accessibilityState={{ disabled: !!deshabilitado }}
      style={[plano ? styles.plano : styles.secundario, dir.contenedor, style]}
    >
      {icono ? <IconoWee name={icono} size={18} color={color} /> : null}
      <Text style={[textoPortada(plano ? 15 : 15, plano ? '500' : '600'), styles.encoge, { color }]} numberOfLines={2}>{texto}</Text>
    </TouchableOpacity>
  );
};

/** La tarjeta del precio: «Costará · Solo se cobra si sale bien» y la cifra del servidor (o que se está calculando). */
export const TarjetaDePrecio: React.FC<{ titulo: string; nota: string; cifra: string | null; calculando: boolean; error?: string; prueba?: string }> = ({ titulo, nota, cifra, calculando, error, prueba }) => {
  const dir = useDireccion();
  return (
    <View style={[styles.precio, dir.contenedor]} accessibilityRole="summary" accessibilityLiveRegion="polite">
      <View style={styles.encoge}>
        <Text style={[textoPortada(15, '600'), dir.texto, { color: P.tinta }]}>{titulo}</Text>
        <Text style={[textoPortada(13, '400'), dir.texto, { color: P.tintaSecundaria }]}>{error || nota}</Text>
      </View>
      <View style={styles.precioDerecha}>
        {calculando ? <ActivityIndicator color={P.tintaSecundaria} accessibilityLabel={nota} /> : cifra ? <Text style={[textoPortada(20, '600'), NUMEROS_TABULARES, { color: P.tinta }]} numberOfLines={1}>{cifra}</Text> : <Text style={[textoPortada(20, '600'), { color: P.tintaDeshabilitada }]}>—</Text>}
        {prueba ? <View style={styles.prueba}><Text style={[textoPortada(11, '600'), { color: P.tintaSecundaria }]} numberOfLines={1}>{prueba}</Text></View> : null}
      </View>
    </View>
  );
};

/** Quién publica: las dos caras de la cuenta, con un toque. Sin Perfil Weë, no se pinta. */
/* Las caras con las que se puede publicar: el Perfil Real y cada alter ego (2026-11-23). `id` es la identidad; `tipo` decide el dibujo. */
export const SelectorDeCara: React.FC<{ caras: { id: string; tipo?: 'real' | 'wee'; nombre: string }[]; puesta: string; onElegir: (id: string) => void; etiqueta: string }> = ({ caras, puesta, onElegir, etiqueta }) => {
  const dir = useDireccion();
  if (caras.length < 2) return null;
  return (
    <View style={[styles.caras, dir.contenedor]} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>
      {caras.map((c) => {
        const on = c.id === puesta;
        return (
          <TouchableOpacity
            key={c.id}
            onPress={() => onElegir(c.id)}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={c.nombre}
            style={[styles.cara, dir.contenedor, on ? styles.caraPuesta : null]}
          >
            <IconoWee name={(c.tipo ?? (c.id === 'wee' ? 'wee' : 'real')) === 'wee' ? 'perfilWee' : 'perfilReal'} size={18} color={on ? P.tinta : P.tintaSecundaria} />
            <Text style={[textoPortada(14, on ? '600' : '500'), styles.encoge, { color: on ? P.tinta : P.tintaSecundaria }]} numberOfLines={1}>{c.nombre}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/** Un aviso corto, centrado, bajo la acción. */
export const Aviso: React.FC<{ texto: string; tono?: 'normal' | 'ok' }> = ({ texto, tono = 'normal' }) => (
  <Text style={[textoPortada(13, tono === 'ok' ? '600' : '400', { lineHeight: 18 }), styles.aviso, { color: tono === 'ok' ? P.tinta : P.tintaSecundaria }]} accessibilityLiveRegion="polite">{texto}</Text>
);

const styles = StyleSheet.create({
  rotulo: { marginTop: SP.md + 2, marginBottom: SP.sm + 2, marginHorizontal: 2 },
  formato: { flex: 1, minWidth: 0, backgroundColor: P.modulo, borderColor: P.borde, borderWidth: 1, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 6, minHeight: 132 },
  formatoPuesto: { backgroundColor: P.superficieAlta, borderColor: P.luz },
  marcoFormato: { height: 62, alignItems: 'center', justifyContent: 'center' },
  forma: { borderWidth: 1.5, borderRadius: 6 },
  centrado: { textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
  chip: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: P.superficie, borderColor: P.borde, borderWidth: 1, maxWidth: '100%' },
  chipPuesta: { backgroundColor: P.accion, borderColor: P.accion },
  principal: { minHeight: 54, borderRadius: 18, backgroundColor: P.accion, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: SP.md },
  principalApagado: { backgroundColor: P.superficieAlta },
  secundario: { flex: 1, minHeight: 50, borderRadius: 18, backgroundColor: P.superficie, borderColor: P.bordeCapsula, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: SP.sm },
  plano: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: SP.sm },
  encoge: { flexShrink: 1, minWidth: 0 },
  precio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: P.superficie, borderColor: P.borde, borderWidth: 1, borderRadius: 20, paddingVertical: 14, paddingHorizontal: SP.md },
  precioDerecha: { alignItems: 'flex-end', gap: 3, flexShrink: 0, maxWidth: '55%' },
  prueba: { borderColor: P.bordeCapsula, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  /* Con varios alter egos las caras bajan de línea: cada una, como poco, un tercio de la fila. */
  caras: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: P.superficie, borderColor: P.borde, borderWidth: 1, borderRadius: 16, padding: 4, gap: 4 },
  cara: { flexGrow: 1, flexBasis: '30%', minWidth: 0, minHeight: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: SP.sm },
  caraPuesta: { backgroundColor: P.superficieAlta, borderColor: P.bordeLuz, borderWidth: 1 },
  aviso: { textAlign: 'center' },
});
