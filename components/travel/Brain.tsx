import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { TRAVEL, SOMBRA_SUAVE } from './tema';
import { Boton } from './Piezas';

/*
 * WEËTRAVEL — LAS PIEZAS DE WEË BRAIN (transversal, no un séptimo módulo).
 *
 * Una sugerencia, una alerta, un cambio propuesto o una acción pendiente de aprobar se pintan siempre igual. Ninguna
 * de estas piezas genera nada: enseñan lo que la pantalla ya calculó (DEMO) o abren la conversación de siempre con
 * Weë Brain. Nada se aplica sin que la persona lo acepte.
 */

type Icono = React.ComponentProps<typeof Ionicons>['name'];

export const SugerenciaIA: React.FC<{
  titulo: string; texto: string; icono?: string; accion?: string; onAccion?: () => void; secundaria?: string; onSecundaria?: () => void; demo?: boolean;
}> = ({ titulo, texto, icono = 'sparkles-outline', accion, onAccion, secundaria, onSecundaria, demo }) => {
  const t = useT();
  return (
    <View style={b.sugerencia}>
      <View style={b.fila}>
        <View style={b.icono}><Ionicons name={icono as Icono} size={18} color={TRAVEL.morado} /></View>
        <View style={b.textos}>
          <Text style={b.marca}>{demo ? t('travel.brainSuggestsDemo') : t('travel.brainSuggests')}</Text>
          <Text style={b.titulo}>{titulo}</Text>
          <Text style={b.texto}>{texto}</Text>
        </View>
      </View>
      {(!!accion || !!secundaria) && (
        <View style={b.acciones}>
          {!!accion && !!onAccion && <Boton texto={accion} onPress={onAccion} pequeno />}
          {!!secundaria && !!onSecundaria && <Boton texto={secundaria} onPress={onSecundaria} variante="linea" pequeno />}
        </View>
      )}
    </View>
  );
};

/** Confirmar antes de cambiar o borrar: lo que Weë propone no se aplica solo. */
export const DialogoConfirmacionIA: React.FC<{
  visible: boolean; titulo: string; texto: string; confirmar: string; onConfirmar: () => void; onCancelar: () => void; peligro?: boolean;
}> = ({ visible, titulo, texto, confirmar, onConfirmar, onCancelar, peligro }) => {
  const t = useT();
  const dir = useDireccion();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <Pressable style={b.velo} onPress={onCancelar} accessibilityLabel={t('travel.close')}>
        <Pressable style={[b.dialogo, dir.contenedor]} accessibilityViewIsModal onPress={() => undefined}>
          <View style={[b.icono, peligro && { backgroundColor: '#FDECEE' }]}>
            <Ionicons name={peligro ? 'trash-outline' : 'sparkles-outline'} size={20} color={peligro ? TRAVEL.peligro : TRAVEL.morado} />
          </View>
          <Text style={b.dialogoTitulo} accessibilityRole="header">{titulo}</Text>
          <Text style={b.texto}>{texto}</Text>
          <View style={b.acciones}>
            <Boton texto={t('common.cancel')} onPress={onCancelar} variante="linea" pequeno />
            <Boton texto={confirmar} onPress={onConfirmar} variante={peligro ? 'peligro' : 'morado'} pequeno />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const b = StyleSheet.create({
  sugerencia: { padding: 14, borderRadius: 18, backgroundColor: TRAVEL.fondo, borderWidth: 1, borderColor: TRAVEL.lila, gap: 12, ...SOMBRA_SUAVE },
  fila: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icono: { width: 38, height: 38, borderRadius: 12, backgroundColor: TRAVEL.lilaSuave, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 3 },
  marca: { fontSize: 11, fontWeight: '800', color: TRAVEL.morado, letterSpacing: 0.4 },
  titulo: { fontSize: 15, fontWeight: '800', color: TRAVEL.tinta },
  texto: { fontSize: 13, lineHeight: 19, color: TRAVEL.texto },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  velo: { flex: 1, backgroundColor: 'rgba(20,17,43,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialogo: { width: '100%', maxWidth: 420, backgroundColor: TRAVEL.fondo, borderRadius: 22, padding: 20, gap: 12 },
  dialogoTitulo: { fontSize: 18, fontWeight: '800', color: TRAVEL.tinta },
});
