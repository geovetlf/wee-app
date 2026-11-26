import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useIdioma } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { FILTROS_DE_PLANTILLA, FiltroDePlantilla } from '../../constants/plantillasWeeAi';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SPACING } from '../../constants/estiloWeeAi';

/** Los filtros de siempre (Para ti, Video, Imagen, Moda, Comida, Viajes): píldoras en una fila que se desplaza de lado. Los usa la pantalla Plantillas. */
export const FiltrosDePlantillas: React.FC<{ filtro: FiltroDePlantilla; onCambiar: (f: FiltroDePlantilla) => void }> = ({ filtro, onCambiar }) => {
  const { t } = useIdioma();
  const dir = useDireccion();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filtros, dir.contenedor]} style={styles.cajaDeFila}>
      {FILTROS_DE_PLANTILLA.map((f) => {
        const puesto = f.id === filtro;
        return (
          <TouchableOpacity
            key={f.id}
            onPress={() => onCambiar(f.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: puesto }}
            aria-pressed={puesto}
            style={[styles.filtro, { backgroundColor: puesto ? P.accion : P.superficie, borderColor: puesto ? P.accion : P.borde }]}
          >
            <Text style={[textoPortada(13, puesto ? '600' : '500'), { color: puesto ? P.sobreAccion : P.tinta }]} numberOfLines={1}>{t(f.clave)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  cajaDeFila: { flexGrow: 0 },
  filtros: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  filtro: { minHeight: 40, borderRadius: 999, borderWidth: 1, paddingHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center' },
});
