import React from 'react';
import { useIdioma } from '../../../contexts/IdiomaContext';
import HojaInferior from '../../workspace/HojaInferior';
import ProductionGuion from './ProductionGuion';
import ProductionEscenas from './ProductionEscenas';
import ProductionContinuidadPlanoAPlano from './ProductionContinuidadPlanoAPlano';
import type { EspacioDeFilmmaker } from './espacio';

/**
 * EL GUION DE LA PRODUCCIÓN, EN SU HOJA (escritorio y tableta; en el teléfono está en «Historia»).
 *
 * Hasta la Fase 22 esta hoja enseñaba también la idea, el reparto, los lugares y el moodboard; desde la Fase 23 eso se
 * edita en el proyecto (`ProductionProyecto`) y aquí quedó el guion. Desde la Fase 24 el guion se EDITA
 * (`ProductionGuion`): para qué sirve cada escena y sus líneas —qué dicen, cómo y quién—. Ir a un plano cierra la hoja.
 * Desde la Fase 35, dos hojas más de la historia, con la misma regla: las escenas (`ProductionEscenas`) y la
 * continuidad plano a plano (`ProductionContinuidadPlanoAPlano`).
 */
const ProductionStructureSheet: React.FC<{
  espacio: EspacioDeFilmmaker;
  que: 'guion' | 'escenas' | 'continuidad';
  onCerrar: () => void;
}> = ({ espacio, que, onCerrar }) => {
  const { t } = useIdioma();
  const titulo = que === 'escenas' ? t('filmmaker.wsScenesTab') : que === 'continuidad' ? t('filmmaker.wsContinuityTitle') : t('filmmaker.wsScript');
  return (
    <HojaInferior visible titulo={titulo} onCerrar={onCerrar}>
      {que === 'guion' && <ProductionGuion espacio={espacio} onIrAlPlano={onCerrar} />}
      {que === 'escenas' && <ProductionEscenas espacio={espacio} onIrALaEscena={onCerrar} />}
      {que === 'continuidad' && <ProductionContinuidadPlanoAPlano espacio={espacio} onIrAlPlano={onCerrar} />}
    </HojaInferior>
  );
};

export default ProductionStructureSheet;
