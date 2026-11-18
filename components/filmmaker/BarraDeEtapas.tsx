import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { ETAPAS, EtapaId } from '../../constants/filmmakerUniverso';
import { etiquetaAccesible } from '../../utils/ideaDeFilmmaker';

/**
 * LA BARRA DE ETAPAS (constitución §12): Idea · Universo · Tandas · Producción · Juntar · Salida, una palabra por etapa. No es rígida: las abiertas se
 * tocan para ir y volver sin perder nada; las que aún no existen salen atenuadas con candado y, al tocarlas, dicen por qué. Se desplaza en horizontal
 * (seis palabras no caben en 320 dp) y deja la activa a la vista.
 */
export const BarraDeEtapas: React.FC<{ activa: EtapaId; onIr: (id: EtapaId) => void; onAviso: (clave: string) => void; onProyecto?: () => void }> = ({ activa, onIr, onAviso, onProyecto }) => {
  const t = useT();
  const dir = useDireccion();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barra} contentContainerStyle={[styles.fila, dir.contenedor]} accessibilityRole="tablist" accessibilityLabel={t('filmmaker.stagesLabel')}>
      {ETAPAS.map((e, i) => {
        const sel = e.id === activa;
        return (
          <TouchableOpacity
            key={e.id}
            onPress={e.abierta ? () => onIr(e.id) : () => onAviso(e.claveMotivo as string)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel={etiquetaAccesible(t(e.clave), e.abierta ? null : t('filmmaker.hubNotYet'), e.abierta ? null : t(e.claveMotivo as string))}
            accessibilityState={{ selected: sel, disabled: !e.abierta }}
            style={[styles.etapa, sel && styles.etapaSel, !e.abierta && styles.etapaCerrada]}
          >
            <Text style={[textoPortada(12, '600'), { color: P.tintaSecundaria }]}>{i + 1}</Text>
            <Text style={[textoPortada(14, sel ? '600' : '500'), { color: sel ? P.tinta : e.abierta ? P.tintaSecundaria : P.tintaDeshabilitada }]} numberOfLines={1}>{t(e.clave)}</Text>
            {!e.abierta ? <Ionicons name="lock-closed-outline" size={11} color={P.tintaDeshabilitada} /> : null}
          </TouchableOpacity>
        );
      })}
      {onProyecto ? (
        <TouchableOpacity onPress={onProyecto} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.projOpen')} style={styles.proyecto}>
          <Ionicons name="options-outline" size={18} color={P.tintaSecundaria} />
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  barra: { flexGrow: 0, flexShrink: 0 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 4 },
  etapa: { minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, backgroundColor: P.superficie, flexDirection: 'row', alignItems: 'center', gap: 6 },
  proyecto: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: P.bordeCapsula, alignItems: 'center', justifyContent: 'center' },
  etapaSel: { borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: P.superficieAlta },
  etapaCerrada: { borderStyle: 'dashed', backgroundColor: 'transparent' },
});
