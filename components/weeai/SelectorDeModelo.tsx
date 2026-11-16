import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEstiloWeeAi } from '../../hooks/useEstiloWeeAi';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { MODELOS_WEEAI, MODELO_AUTOMATICO, TipoDeModelo } from '../../constants/modelosWeeAi';
import { ESPACIO_WEEAI as SPACING, RADIO_WEEAI, FONT_SIZE_WEEAI as FONT_SIZE, FONT_WEIGHT_WEEAI as FONT_WEIGHT, NUMEROS_TABULARES } from '../../constants/estiloWeeAi';
import { scale } from '../../utils/scale';

interface Props {
  tipo: TipoDeModelo;
  valor: string;
  onChange: (id: string) => void;
}

/**
 * EL SELECTOR DE MODELO: un chip «Automático ▾» que abre la lista de los modelos del tipo. Solo interfaz: la elección es
 * estado local y no se envía a ningún sitio (el router decide), y lo dice. Solo se pueden elegir los modelos integrados en
 * el engine; el resto sale deshabilitado con «Próximamente» (constants/modelosWeeAi.ts). «Automático» es el recomendado.
 */
export const SelectorDeModelo: React.FC<Props> = ({ tipo, valor, onChange }) => {
  const c = useEstiloWeeAi();
  const t = useT();
  const dir = useDireccion();
  const [abierto, setAbierto] = useState(false);
  const modelos = MODELOS_WEEAI.filter((m) => m.tipo === tipo);
  const actual = modelos.find((m) => m.id === valor);
  const elegir = (id: string) => {
    onChange(id);
    setAbierto(false);
  };
  const fila = (id: string, nombre: string, pista: string | null, habilitado: boolean) => {
    const puesto = id === valor;
    return (
      <TouchableOpacity
        key={id}
        onPress={habilitado ? () => elegir(id) : undefined}
        disabled={!habilitado}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: puesto, disabled: !habilitado }}
        style={[styles.fila, dir.contenedor, { backgroundColor: puesto ? c.superficieAlta : c.superficie, opacity: habilitado ? 1 : 0.55 }]}
      >
        <View style={styles.filaTextos}>
          <Text style={[styles.nombre, dir.texto, { color: c.tinta }]} numberOfLines={2}>{nombre}</Text>
          {pista ? <Text style={[styles.pista, dir.texto, { color: c.tintaSecundaria }]}>{pista}</Text> : null}
        </View>
        {puesto ? <Ionicons name="checkmark" size={scale(20)} color={c.tinta} /> : null}
      </TouchableOpacity>
    );
  };
  return (
    <>
      <TouchableOpacity
        onPress={() => setAbierto(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${t('weeai.modelTitle')}: ${actual ? actual.nombre : t('weeai.modelAuto')}`}
        style={[styles.chip, dir.contenedor, { backgroundColor: c.superficie }]}
      >
        <Text style={[styles.chipTexto, { color: c.tinta }]} numberOfLines={1}>{actual ? actual.nombre : t('weeai.modelAuto')}</Text>
        <Ionicons name="chevron-down" size={scale(14)} color={c.tintaSecundaria} />
      </TouchableOpacity>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={styles.velo} onPress={() => setAbierto(false)} accessibilityLabel={t('common.close')} accessibilityRole="button">
          <Pressable style={[styles.hoja, { backgroundColor: c.fondo }]} onPress={() => {}}>
            <Text style={[styles.titulo, dir.texto, { color: c.tinta }]} accessibilityRole="header">{t('weeai.modelTitle')}</Text>
            {fila(MODELO_AUTOMATICO, t('weeai.modelAuto'), t('weeai.modelAutoHint'), true)}
            <Text style={[styles.grupo, dir.texto, { color: c.tintaSecundaria }]}>{t(tipo === 'video' ? 'composer.kindVideo' : 'composer.kindImage')}</Text>
            {modelos.map((m) => fila(m.id, m.nombre, m.integrado ? null : t('weeai.modelSoon'), m.integrado))}
            <Text style={[styles.nota, dir.texto, { color: c.tintaSecundaria }]}>{t('weeai.modelNote')}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, borderRadius: 999, paddingHorizontal: SPACING.md, maxWidth: '100%' },
  chipTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, flexShrink: 1 },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  hoja: { borderTopLeftRadius: RADIO_WEEAI.hoja, borderTopRightRadius: RADIO_WEEAI.hoja, padding: SPACING.lg, gap: SPACING.sm },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, marginBottom: SPACING.xs },
  grupo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 52, borderRadius: RADIO_WEEAI.control, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  filaTextos: { flex: 1, minWidth: 0 },
  nombre: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold },
  pista: { fontSize: FONT_SIZE.sm, marginTop: 2 },
  nota: { fontSize: FONT_SIZE.sm, lineHeight: scale(19), marginTop: SPACING.sm },
});
