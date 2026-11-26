import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ViewStyle, StyleProp } from 'react-native';
import { useIdioma } from '../../contexts/IdiomaContext';
import { formatearNumero } from '../../i18n/formato';
import { CAMPO, CAMPO_ENFOCADO, COLOR, ESPACIO, LINEA, RADIO, TACTIL, TIPO } from './estilo';
import Icono, { NombreDeIcono } from './Iconos';

/*
 * LAS PIEZAS DE LA FICHA: sección, campo, opción, tarjeta de opción y botón.
 *
 * Todas salen de `estilo.ts` y ninguna lleva texto propio: lo que se lee entra
 * ya traducido por props (o, en el contador, por `character.*`).
 */

/* ── Sección ─────────────────────────────────────────────────────────────── */

export const Seccion: React.FC<{
  numero: string;
  titulo: string;
  icono: NombreDeIcono;
  pista?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ numero, titulo, icono, pista, children, style }) => (
  <View style={[s.seccion, style]}>
    <View style={s.seccionCabeza}>
      <Text style={s.seccionNumero}>{numero}</Text>
      <View style={s.seccionRaya} />
      <Icono nombre={icono} tamano={16} color={COLOR.textoTenue} />
    </View>
    <Text style={s.seccionTitulo} accessibilityRole="header">{titulo}</Text>
    {pista ? <Text style={s.seccionPista}>{pista}</Text> : null}
    <View style={s.seccionCuerpo}>{children}</View>
  </View>
);

/* ── Campo ───────────────────────────────────────────────────────────────── */

export const Campo: React.FC<{
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  marcador: string;
  max: number;
  multilinea?: boolean;
  obligatorio?: boolean;
}> = ({ etiqueta, valor, onCambio, marcador, max, multilinea = false, obligatorio = false }) => {
  const { t, locale } = useIdioma();
  const [enfocado, setEnfocado] = useState(false);
  const usados = Array.from(valor).length;
  const cerca = usados >= max * 0.9;
  return (
    <View style={s.campo}>
      <View style={s.campoCabeza}>
        <Text style={s.campoEtiqueta}>{etiqueta}</Text>
        {obligatorio ? <Text style={s.obligatorio}>{t('character.required')}</Text> : null}
      </View>
      <TextInput
        style={[CAMPO, multilinea && s.campoLargo, enfocado && CAMPO_ENFOCADO, enfocado && multilinea && s.campoLargoEnfocado]}
        placeholder={marcador}
        placeholderTextColor={COLOR.textoTenue}
        selectionColor={COLOR.blanco}
        cursorColor={COLOR.blanco}
        value={valor}
        onChangeText={onCambio}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        maxLength={max}
        multiline={multilinea}
        textAlignVertical={multilinea ? 'top' : 'center'}
        accessibilityLabel={etiqueta}
        accessibilityHint={obligatorio ? t('character.required') : undefined}
      />
      <Text
        style={[s.contador, cerca && s.contadorCerca]}
        accessibilityLabel={t('character.counter', { usados: formatearNumero(usados, locale), max: formatearNumero(max, locale) })}
      >
        {formatearNumero(usados, locale)} / {formatearNumero(max, locale)}
      </Text>
    </View>
  );
};

/* ── Opción en pastilla (tono, duración) ─────────────────────────────────── */

export const GrupoDeOpciones: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <View style={s.grupo} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>{children}</View>
);

export const Opcion: React.FC<{ texto: string; activa: boolean; onPress: () => void; deshabilitada?: boolean }> = ({ texto, activa, onPress, deshabilitada }) => (
  <Pressable
    onPress={onPress}
    disabled={deshabilitada}
    accessibilityRole="radio"
    accessibilityLabel={texto}
    accessibilityState={{ selected: activa, checked: activa, disabled: !!deshabilitada }}
    hitSlop={4}
    style={({ pressed }) => [s.opcion, activa ? s.opcionActiva : null, pressed && !activa ? s.opcionPulsada : null, deshabilitada ? s.apagado : null]}
  >
    <Text style={[s.opcionTexto, activa && s.opcionTextoActivo]} numberOfLines={1}>{texto}</Text>
  </Pressable>
);

/* ── Tarjeta de opción (nivel de autonomía) ──────────────────────────────── */

export const TarjetaDeOpcion: React.FC<{ titulo: string; descripcion: string; activa: boolean; onPress: () => void }> = ({ titulo, descripcion, activa, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityLabel={titulo}
    accessibilityHint={descripcion}
    accessibilityState={{ selected: activa, checked: activa }}
    style={({ pressed }) => [s.tarjeta, activa ? s.tarjetaActiva : null, pressed && !activa ? s.opcionPulsada : null]}
  >
    <View style={s.tarjetaMarca}>
      <Icono nombre={activa ? 'seleccionado' : 'sinSeleccionar'} tamano={20} color={activa ? COLOR.blanco : COLOR.textoTenue} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[s.tarjetaTitulo, !activa && { color: COLOR.textoSecundario }]}>{titulo}</Text>
      <Text style={s.tarjetaTexto}>{descripcion}</Text>
    </View>
  </Pressable>
);

/* ── Botón ───────────────────────────────────────────────────────────────── */

export type VarianteDeBoton = 'primario' | 'secundario' | 'fantasma';

export const Boton: React.FC<{
  texto: string;
  onPress: () => void;
  variante?: VarianteDeBoton;
  icono?: NombreDeIcono;
  disabled?: boolean;
  cargando?: boolean;
  /** Para el lector de pantalla, cuando el texto visible no basta. */
  etiqueta?: string;
  pista?: string;
  style?: StyleProp<ViewStyle>;
}> = ({ texto, onPress, variante = 'primario', icono, disabled, cargando, etiqueta, pista, style }) => {
  const primario = variante === 'primario';
  const colorTexto = primario ? COLOR.sobreBlanco : COLOR.texto;
  const inactivo = !!disabled || !!cargando;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={etiqueta || texto}
      accessibilityHint={pista}
      accessibilityState={{ disabled: inactivo, busy: !!cargando }}
      style={({ pressed }) => [
        s.boton,
        primario ? s.botonPrimario : variante === 'secundario' ? s.botonSecundario : s.botonFantasma,
        pressed && !inactivo ? s.botonPulsado : null,
        disabled && !cargando ? s.apagado : null,
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <>
          {icono ? <Icono nombre={icono} tamano={18} color={colorTexto} /> : null}
          <Text style={[s.botonTexto, { color: colorTexto }]} numberOfLines={2}>{texto}</Text>
        </>
      )}
    </Pressable>
  );
};

/* ── Rótulo (estado, «obligatorio», pendiente…) ──────────────────────────── */

export const Rotulo: React.FC<{ texto: string; relleno?: boolean }> = ({ texto, relleno }) => (
  <View style={[s.rotulo, relleno && s.rotuloRelleno]}>
    <Text style={[s.rotuloTexto, relleno && { color: COLOR.sobreBlanco }]} numberOfLines={1}>{texto}</Text>
  </View>
);

/* ── Barra de progreso (esenciales de la ficha, acciones del día) ────────── */

export const Barra: React.FC<{ valor: number; etiqueta: string }> = ({ valor, etiqueta }) => {
  const v = Math.max(0, Math.min(1, Number.isFinite(valor) ? valor : 0));
  return (
    <View
      style={s.barra}
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
    >
      <View style={[s.barraLlena, { width: `${v * 100}%` }]} />
    </View>
  );
};

const s = StyleSheet.create({
  barra: { height: 3, borderRadius: RADIO.pastilla, backgroundColor: COLOR.lineaMedia, overflow: 'hidden' },
  barraLlena: { height: '100%', backgroundColor: COLOR.blanco, borderRadius: RADIO.pastilla },
  seccion: { paddingTop: ESPACIO.xxl, paddingBottom: ESPACIO.md, borderTopWidth: LINEA, borderTopColor: COLOR.linea },
  seccionCabeza: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md, marginBottom: ESPACIO.md },
  seccionNumero: { ...TIPO.rotulo, color: COLOR.textoTenue },
  seccionRaya: { flex: 1, height: LINEA, backgroundColor: COLOR.linea },
  seccionTitulo: { ...TIPO.titulo, color: COLOR.texto },
  seccionPista: { ...TIPO.pequeno, color: COLOR.textoSecundario, marginTop: ESPACIO.xs },
  seccionCuerpo: { marginTop: ESPACIO.xl, gap: ESPACIO.xl },

  campo: {},
  campoCabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ESPACIO.sm, marginBottom: ESPACIO.sm, flexWrap: 'wrap' },
  campoEtiqueta: { ...TIPO.pequenoFuerte, color: COLOR.texto, flexShrink: 1 },
  obligatorio: { ...TIPO.rotulo, color: COLOR.textoTenue },
  campoLargo: { minHeight: 112, paddingTop: ESPACIO.md },
  campoLargoEnfocado: { paddingTop: ESPACIO.md - 1 },
  contador: { ...TIPO.pequeno, color: COLOR.textoTenue, alignSelf: 'flex-end', marginTop: ESPACIO.xs, fontVariant: ['tabular-nums'] },
  contadorCerca: { color: COLOR.texto },

  grupo: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.sm },
  opcion: {
    minHeight: TACTIL, paddingHorizontal: ESPACIO.lg, borderRadius: RADIO.pastilla, borderWidth: 1,
    borderColor: COLOR.lineaMedia, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center',
  },
  opcionActiva: { backgroundColor: COLOR.blanco, borderColor: COLOR.blanco },
  opcionPulsada: { backgroundColor: COLOR.velo },
  opcionTexto: { ...TIPO.pequenoFuerte, color: COLOR.textoSecundario },
  opcionTextoActivo: { color: COLOR.sobreBlanco },

  tarjeta: {
    flexDirection: 'row', alignItems: 'flex-start', gap: ESPACIO.md, minHeight: TACTIL,
    padding: ESPACIO.lg, borderRadius: RADIO.lg, borderWidth: 1, borderColor: COLOR.linea, backgroundColor: COLOR.carbon,
  },
  tarjetaActiva: { borderColor: COLOR.lineaFuerte, backgroundColor: COLOR.superficie },
  tarjetaMarca: { paddingTop: 1 },
  tarjetaTitulo: { ...TIPO.cuerpoFuerte, color: COLOR.texto },
  tarjetaTexto: { ...TIPO.pequeno, color: COLOR.textoSecundario, marginTop: ESPACIO.xs },

  boton: {
    minHeight: TACTIL + 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESPACIO.sm,
    paddingHorizontal: ESPACIO.xl, paddingVertical: ESPACIO.sm, borderRadius: RADIO.pastilla,
  },
  botonPrimario: { backgroundColor: COLOR.blanco },
  botonSecundario: { borderWidth: 1, borderColor: COLOR.lineaFuerte, backgroundColor: 'transparent' },
  botonFantasma: { backgroundColor: 'transparent' },
  botonPulsado: { opacity: 0.82 },
  botonTexto: { ...TIPO.boton, textAlign: 'center', flexShrink: 1 },
  apagado: { opacity: 0.38 },

  rotulo: { alignSelf: 'flex-start', paddingHorizontal: ESPACIO.sm, paddingVertical: ESPACIO.xxs, borderRadius: RADIO.pastilla, borderWidth: 1, borderColor: COLOR.lineaMedia },
  rotuloRelleno: { backgroundColor: COLOR.blanco, borderColor: COLOR.blanco },
  rotuloTexto: { ...TIPO.rotulo, color: COLOR.textoSecundario },
});
