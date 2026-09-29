import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { ProductionBrief, ProductionDireccion } from './ProductionBrief';
import ProductionFichas from './ProductionFichas';
import ProductionReferencias from './ProductionReferencias';
import ProductionVersiones from './ProductionVersiones';
import type { EspacioDeFilmmaker } from './espacio';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

export type SeccionDelProyecto = 'brief' | 'direccion' | 'reparto' | 'lugares' | 'objetos' | 'referencias' | 'versiones';

export const SECCIONES_DEL_PROYECTO: readonly { id: SeccionDelProyecto; clave: string; icono: string }[] = [
  { id: 'brief', clave: 'filmmaker.wsBrief', icono: 'bulb-outline' },
  { id: 'direccion', clave: 'filmmaker.wsDirection', icono: 'color-wand-outline' },
  { id: 'reparto', clave: 'filmmaker.characters', icono: 'people-outline' },
  { id: 'lugares', clave: 'filmmaker.wsLocations', icono: 'location-outline' },
  { id: 'objetos', clave: 'filmmaker.wsObjects', icono: 'cube-outline' },
  { id: 'referencias', clave: 'filmmaker.wsReferencesList', icono: 'images-outline' },
  { id: 'versiones', clave: 'filmmaker.wsVersions', icono: 'time-outline' },
];

/**
 * EL PROYECTO: LO QUE LA PRODUCCIÓN ES, EDITABLE DESDE CUALQUIER PANTALLA (Fase 23 del motor, el espacio de trabajo).
 *
 * Brief, dirección, reparto, lugares, objetos, referencias y versiones: siete secciones, una a la vista, elegidas con
 * sus pastillas. Es la MISMA pieza en el panel del proyecto del escritorio, en la pestaña «Proyecto» de Weë AI
 * Director —que es donde está en la tableta, sin panel del proyecto— y en la vista «Proyecto» del teléfono: lo que se
 * puede hacer no depende del tamaño de la pantalla. Cada cambio es una operación de F1-A del controlador de siempre.
 */
const ProductionProyecto: React.FC<{
  espacio: EspacioDeFilmmaker;
  inicial?: SeccionDelProyecto;
  /** En un panel que ya se desplaza (el teléfono), no hace falta otro desplazamiento dentro. */
  sinDesplazamiento?: boolean;
}> = ({ espacio, inicial = 'brief', sinDesplazamiento }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [seccion, setSeccion] = useState<SeccionDelProyecto>(inicial);
  const { produccion, idsDeFichas: ids } = espacio;
  const cuenta: Partial<Record<SeccionDelProyecto, number>> = {
    reparto: produccion.characters.length, lugares: produccion.locations.length, objetos: produccion.objects.length,
    referencias: produccion.references.length,
  };
  const cuerpo = (
    <>
      {seccion === 'brief' && <ProductionBrief espacio={espacio} />}
      {seccion === 'direccion' && <ProductionDireccion espacio={espacio} />}
      {seccion === 'reparto' && <ProductionFichas clase="personaje" espacio={espacio} nuevoId={ids?.personaje} />}
      {seccion === 'lugares' && <ProductionFichas clase="lugar" espacio={espacio} nuevoId={ids?.lugar} />}
      {seccion === 'objetos' && <ProductionFichas clase="objeto" espacio={espacio} nuevoId={ids?.objeto} />}
      {seccion === 'referencias' && <ProductionReferencias espacio={espacio} />}
      {seccion === 'versiones' && (espacio.historial
        ? <ProductionVersiones espacio={espacio} />
        : <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsVersionsError')}</Text>)}
    </>
  );
  return (
    <View style={styles.raiz}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pastillas} accessibilityRole="tablist">
        {SECCIONES_DEL_PROYECTO.map((s) => {
          const activa = seccion === s.id;
          const n = cuenta[s.id];
          return (
            <TouchableOpacity
              key={s.id}
              onPress={() => setSeccion(s.id)}
              style={[styles.pastilla, { backgroundColor: activa ? theme.colors.accent : theme.colors.surface, borderColor: activa ? theme.colors.accent : theme.colors.border }, isWeb && ({ cursor: 'pointer' } as object)]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={n !== undefined ? t('filmmaker.wsCountOf', { nombre: t(s.clave), cuenta: n }) : t(s.clave)}
            >
              <Ionicons name={s.icono as any} size={scale(14)} color={activa ? '#1F2937' : theme.colors.textSecondary} />
              <Text style={[styles.pastillaTexto, { color: activa ? '#1F2937' : theme.colors.text }]} numberOfLines={1}>{t(s.clave)}</Text>
              {n !== undefined && n > 0 && <Text style={[styles.pastillaCuenta, { color: activa ? '#1F2937' : theme.colors.textSecondary }]}>{formato.numero(n)}</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {sinDesplazamiento ? <View style={styles.cuerpo}>{cuerpo}</View> : <ScrollView style={styles.scroll} contentContainerStyle={styles.cuerpo}>{cuerpo}</ScrollView>}
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { gap: SPACING.md, flexShrink: 1 },
  pastillas: { gap: SPACING.xs, paddingVertical: 2 },
  pastilla: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 34, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full },
  pastillaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  pastillaCuenta: { fontSize: FONT_SIZE.xs, fontVariant: ['tabular-nums'] },
  scroll: { flexShrink: 1 },
  cuerpo: { gap: SPACING.md },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
});

export default ProductionProyecto;
