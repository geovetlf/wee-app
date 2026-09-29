import React from 'react';
import { useIdioma } from '../../../contexts/IdiomaContext';
import HojaInferior from '../../workspace/HojaInferior';
import ProductionGuion from './ProductionGuion';
import type { EspacioDeFilmmaker } from './espacio';

/**
 * EL GUION DE LA PRODUCCIÓN, EN SU HOJA (escritorio y tableta; en el teléfono está en «Historia»).
 *
 * Hasta la Fase 22 esta hoja enseñaba también la idea, el reparto, los lugares y el moodboard; desde la Fase 23 eso se
 * edita en el proyecto (`ProductionProyecto`) y aquí quedó el guion. Desde la Fase 24 el guion se EDITA
 * (`ProductionGuion`): para qué sirve cada escena y sus líneas —qué dicen, cómo y quién—. Ir a un plano cierra la hoja.
 */
const ProductionStructureSheet: React.FC<{
  espacio: EspacioDeFilmmaker;
  que: 'guion';
  onCerrar: () => void;
}> = ({ espacio, onCerrar }) => {
  const { t } = useIdioma();
  return (
    <HojaInferior visible titulo={t('filmmaker.wsScript')} onCerrar={onCerrar}>
      <ProductionGuion espacio={espacio} onIrAlPlano={onCerrar} />
    </HojaInferior>
  );
};

export default ProductionStructureSheet;
