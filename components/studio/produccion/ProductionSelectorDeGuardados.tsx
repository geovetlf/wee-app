import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import CampoDeBusqueda from '../../workspace/CampoDeBusqueda';
import { BotonPequeno, Seccion } from './ProductionPiezas';
import type { ElementosParaVincular } from '../../../hooks/useElementosParaVincular';
import type { ElementoGuardado } from '../../../services/elementsService';
import { coincideConLaBusqueda } from '../../../utils/buscarPorNombre';
import { FONT_SIZE } from '../../../constants/design';

/**
 * ELEGIR UNO DE LO GUARDADO, PARA VINCULARLO A UNA FICHA (Fase 20 del motor; por páginas y con búsqueda desde la
 * Fase 22). Una sola pieza para la hoja de la estructura y para los editores del proyecto (Fase 23): la lista de lo
 * que encaja con esa ficha, en su orden, con «Cargar más» mientras quede algo y un filtro por nombre sobre lo cargado.
 * Elegir no guarda nada aquí: devuelve lo elegido, y quien la abre hace la operación de F1-A de siempre.
 */
const ProductionSelectorDeGuardados: React.FC<{
  elementos: ElementosParaVincular;
  onElegir: (e: ElementoGuardado) => void;
  onVolver: () => void;
}> = ({ elementos, onElegir, onVolver }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const [busqueda, setBusqueda] = useState('');
  const { carga, lista, hayMas, cargandoMas, cargarMas } = elementos;
  const visibles = lista.filter((e) => coincideConLaBusqueda(e.name, busqueda));
  const nota = (texto: string, error = false) => <Text style={[styles.texto, { color: error ? theme.colors.error : theme.colors.textSecondary }]}>{texto}</Text>;
  return (
    <Seccion titulo={t('filmmaker.wsElementPickTitle')}>
      {carga === 'listos' && lista.length > 0 && (
        <>
          <CampoDeBusqueda valor={busqueda} onCambiar={setBusqueda} placeholder={t('filmmaker.wsElementSearch')} />
          {!!busqueda.trim() && hayMas && nota(t('filmmaker.wsElementSearchLoaded'))}
        </>
      )}
      {carga === 'error'
        ? nota(t('filmmaker.wsElementPickError'), true)
        : carga !== 'listos'
          ? nota(t('common.loading'))
          : lista.length === 0
            ? nota(t('filmmaker.wsElementPickEmpty'))
            : visibles.length === 0
              ? nota(t('filmmaker.wsElementSearchNone'))
              : visibles.map((e) => <BotonPequeno key={e.elementId} icono="link-outline" etiqueta={e.name} onPress={() => onElegir(e)} conTexto />)}
      {carga === 'listos' && hayMas && (
        <BotonPequeno icono="chevron-down" etiqueta={cargandoMas ? t('common.loading') : t('filmmaker.wsElementLoadMore')} onPress={cargarMas} disabled={cargandoMas} conTexto />
      )}
      <BotonPequeno icono="arrow-back" etiqueta={t('common.back')} onPress={onVolver} conTexto />
    </Seccion>
  );
};

const styles = StyleSheet.create({
  texto: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.5 },
});

export default ProductionSelectorDeGuardados;
