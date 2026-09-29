import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoDeBusqueda from '../../workspace/CampoDeBusqueda';
import ProductionSelectorDeGuardados from './ProductionSelectorDeGuardados';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import type { ElementosParaVincular } from '../../../hooks/useElementosParaVincular';
import type { ClaseDeReferencia, CreacionParaReferencia, CreacionesParaReferencia } from '../../../hooks/useCreacionesParaReferencia';
import type { ElementoGuardado } from '../../../services/elementsService';
import { CLAVE_DE_TIPO } from '../../../services/vistaDeAsset';
import { coincideConLaBusqueda } from '../../../utils/buscarPorNombre';
import { CLASES_GUARDADAS_COMO_REFERENCIA } from '../../../constants/filmmaker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';
const CLASES: readonly ClaseDeReferencia[] = ['image', 'video', 'audio'];
const ICONO: Readonly<Record<ClaseDeReferencia, string>> = { image: 'image-outline', video: 'videocam-outline', audio: 'musical-note-outline' };

/**
 * AÑADIR UNA REFERENCIA (Fase 27 del motor: las referencias, de verdad).
 *
 * F1-A sabía guardar referencias (`add_reference`) y nadie podía añadir una desde la app. Aquí se elige de dónde: de
 * Mis creaciones —una imagen, un vídeo o un audio de la cuenta— o de lo guardado —un personaje, un lugar, un objeto…—,
 * con una búsqueda sobre lo cargado y «Cargar más» mientras quede algo. Elegir no guarda nada aquí: devuelve lo
 * elegido, y quien lo abre hace la operación de F1-A de siempre; el servidor comprueba al guardar que es de la cuenta.
 */
const ProductionSelectorDeCreaciones: React.FC<{
  creaciones: CreacionesParaReferencia;
  elementos?: ElementosParaVincular;
  onElegirCreacion: (c: CreacionParaReferencia) => void;
  onElegirGuardado: (e: ElementoGuardado) => void;
  onVolver: () => void;
}> = ({ creaciones, elementos, onElegirCreacion, onElegirGuardado, onVolver }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [fuente, setFuente] = useState<'creaciones' | 'guardados'>('creaciones');
  const [busqueda, setBusqueda] = useState('');
  const { carga, clase, lista, hayMas, cargandoMas, cargar, cargarMas } = creaciones;
  const nombreDe = (c: CreacionParaReferencia) => c.nombre ?? t('filmmaker.wsCreationUnnamed', { tipo: t(CLAVE_DE_TIPO[c.clase]), fecha: formato.fecha(c.creadoEn) });
  const visibles = lista.filter((c) => coincideConLaBusqueda(nombreDe(c), busqueda));
  const nota = (texto: string, error = false) => <Text style={[styles.nota, { color: error ? theme.colors.error : theme.colors.textSecondary }]}>{texto}</Text>;
  const pastilla = (clave: string, activa: boolean, alPulsar: () => void, etiqueta: string) => (
    <TouchableOpacity
      key={clave}
      onPress={alPulsar}
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={etiqueta}
      style={[styles.pastilla, { backgroundColor: activa ? theme.colors.accent : theme.colors.surface, borderColor: activa ? theme.colors.accent : theme.colors.border }, isWeb && ({ cursor: 'pointer' } as object)]}
    >
      <Text style={[styles.pastillaTexto, { color: activa ? '#1F2937' : theme.colors.text }]}>{etiqueta}</Text>
    </TouchableOpacity>
  );

  if (fuente === 'guardados' && elementos) {
    return (
      <View style={styles.bloque}>
        <View style={styles.fila}>
          {pastilla('creaciones', false, () => setFuente('creaciones'), t('filmmaker.wsRefFromCreations'))}
          {pastilla('guardados', true, () => undefined, t('filmmaker.wsRefFromSaved'))}
        </View>
        <ProductionSelectorDeGuardados elementos={elementos} onElegir={onElegirGuardado} onVolver={onVolver} />
      </View>
    );
  }

  return (
    <Seccion titulo={t('filmmaker.wsReferenceAdd')}>
      {!!elementos && (
        <View style={styles.fila} accessibilityRole="tablist">
          {pastilla('creaciones', true, () => undefined, t('filmmaker.wsRefFromCreations'))}
          {pastilla('guardados', false, () => { setFuente('guardados'); elementos.cargar(CLASES_GUARDADAS_COMO_REFERENCIA); }, t('filmmaker.wsRefFromSaved'))}
        </View>
      )}
      <View style={styles.fila} accessibilityRole="tablist">
        {CLASES.map((c) => pastilla(c, clase === c, () => { setBusqueda(''); cargar(c); }, t(CLAVE_DE_TIPO[c])))}
      </View>
      {carga === 'sin_pedir' && nota(t('filmmaker.wsRefPickKind'))}
      {carga === 'listas' && lista.length > 0 && (
        <>
          <CampoDeBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder={t('filmmaker.wsRefSearch')} />
          {!!busqueda.trim() && hayMas && nota(t('filmmaker.wsElementSearchLoaded'))}
        </>
      )}
      {carga === 'error'
        ? nota(t('filmmaker.wsRefLoadError'), true)
        : carga === 'cargando'
          ? nota(t('common.loading'))
          : carga === 'listas' && lista.length === 0
            ? nota(t('filmmaker.wsRefNoneOfKind'))
            : carga === 'listas' && visibles.length === 0
              ? nota(t('filmmaker.wsElementSearchNone'))
              : visibles.map((c) => {
                const nombre = nombreDe(c);
                return (
                  <TouchableOpacity
                    key={c.assetId}
                    onPress={() => onElegirCreacion(c)}
                    accessibilityRole="button"
                    accessibilityLabel={t('filmmaker.wsRefUse', { nombre })}
                    style={[styles.creacion, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }, isWeb && ({ cursor: 'pointer' } as object)]}
                  >
                    {c.miniatura
                      ? <Image source={{ uri: c.miniatura }} style={styles.miniatura} accessibilityIgnoresInvertColors />
                      : <View style={[styles.miniatura, styles.sinMiniatura, { backgroundColor: theme.colors.surface }]}><Ionicons name={ICONO[c.clase] as any} size={scale(18)} color={theme.colors.textSecondary} /></View>}
                    <Text style={[styles.nombre, { color: theme.colors.text }]} numberOfLines={2}>{nombre}</Text>
                    <Ionicons name="add-circle-outline" size={scale(18)} color={theme.colors.accent} />
                  </TouchableOpacity>
                );
              })}
      {carga === 'listas' && hayMas && (
        <BotonPequeno icono="chevron-down" etiqueta={cargandoMas ? t('common.loading') : t('filmmaker.wsElementLoadMore')} onPress={cargarMas} disabled={cargandoMas} conTexto />
      )}
      <BotonPequeno icono="arrow-back" etiqueta={t('common.back')} onPress={onVolver} conTexto />
    </Seccion>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  pastilla: { minHeight: 34, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.full, justifyContent: 'center' },
  pastillaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.5 },
  creacion: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.xs, minHeight: 52 },
  miniatura: { width: scale(44), height: scale(44), borderRadius: BORDER_RADIUS.sm },
  sinMiniatura: { alignItems: 'center', justifyContent: 'center' },
  nombre: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
});

export default ProductionSelectorDeCreaciones;
