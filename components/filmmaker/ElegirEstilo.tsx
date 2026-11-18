import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { PORTADA_WEEAI as P, textoPortada } from '../../constants/estiloWeeAi';
import { ESTILOS, ESTILOS_VISIBLES, IMAGEN_DE_ESTILO } from '../../constants/filmmakerEstilos';
import { TarjetaDeTipo } from './TarjetaDeTipo';

/**
 * LA SEGUNDA CAPA DE FILMMAKER: «¿Qué estilo quieres?» (2026-11-18). El mismo lenguaje que la capa de tipos: las MISMAS tarjetas (`TarjetaDeTipo`:
 * apaisadas 2:1, imagen a sangre, borde luminoso), en dos columnas con desplazamiento vertical normal. El estilo lo ELIGE la persona (decisión del dueño,
 * 2026-11-18: Weë decide lo técnico, no lo creativo): no hay «Weë elige por mí» ni estilo por defecto, y sin estilo no se avanza. Selección única: tocar
 * una tarjeta elige y pasa. Se ven diez y «Más estilos» abre los otros. Sin cabecera pesada ni textos de ayuda.
 */
export const ElegirEstilo: React.FC<{ ancho: number; elegido: string | null; onElegir: (id: string) => void }> = ({ ancho, elegido, onElegir }) => {
  const t = useT();
  const dir = useDireccion();
  const [todos, setTodos] = useState(false);
  const lado = 16;
  const hueco = 14;
  const anchoDeFila = Math.min(ancho, 760) - lado * 2;
  const media = Math.floor((anchoDeFila - hueco) / 2);
  return (
    <View style={styles.zona}>
      <View style={[styles.arriba, { paddingHorizontal: lado }]}>
        <Text style={[textoPortada(24, '600'), dir.texto, { color: P.tinta }]} accessibilityRole="header">{t('filmmaker.styleTitle')}</Text>
      </View>
      <ScrollView style={styles.zona} contentContainerStyle={[styles.rejilla, { paddingHorizontal: lado, gap: hueco }, dir.contenedor]} keyboardShouldPersistTaps="handled">
        {(todos ? ESTILOS : ESTILOS.slice(0, ESTILOS_VISIBLES)).map((e, i) => (
          <TarjetaDeTipo
            key={e.id}
            tipo={{ id: e.id, clave: e.clave, claveSub: '', estado: 'habilitada' }}
            imagen={IMAGEN_DE_ESTILO[e.id]}
            textura={e.textura}
            tonos={e.tonos}
            ancho={media}
            alto={Math.round(media / 2)}
            elegido={elegido === e.id}
            onPress={() => onElegir(e.id)}
            orden={i % 6}
          />
        ))}
        {!todos && ESTILOS.length > ESTILOS_VISIBLES ? (
          <TouchableOpacity onPress={() => setTodos(true)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('filmmaker.styleMore')} style={styles.mas}>
            <Text style={[textoPortada(15, '600'), { color: P.tinta }]}>{t('filmmaker.styleMore')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  zona: { flex: 1 },
  arriba: { paddingTop: 6, paddingBottom: 10 },
  mas: { width: '100%', minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: P.bordeCapsula, alignItems: 'center', justifyContent: 'center' },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 8, paddingBottom: 24 },
});
