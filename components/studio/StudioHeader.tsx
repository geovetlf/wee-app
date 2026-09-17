import React from 'react';
import { useT } from '../../contexts/IdiomaContext';
import CabeceraDeSeccion from '../creator/CabeceraDeSeccion';

interface Props {
  /**
   * Lo que va detrás de "Weë" en el nombre. Studio es el valor de siempre;
   * Weë Design pasa "Design" y comparte así la MISMA cabecera, no una copia que
   * con el tiempo se parecería cada vez menos.
   */
  nombre?: string;
  /** La clave del lema, la frase grande y centrada. */
  claveLema?: string;
  /** La clave de la descripción: qué cabe dentro, en dos renglones. */
  claveDescripcion?: string;
}

/**
 * LA CABECERA DE WEË STUDIO Y WEË DESIGN.
 *
 * El dibujo es `CabeceraDeSeccion`, el mismo de todas las secciones de Weë AI.
 * Aquí solo se resuelven las claves: Studio y Design guardan sus textos en el
 * diccionario, mientras que los especialistas los traen ya traducidos en su
 * configuración.
 */
const StudioHeader: React.FC<Props> = ({
  nombre = 'Studio',
  claveLema = 'studio.slogan',
  claveDescripcion = 'studio.description',
}) => {
  const t = useT();
  return <CabeceraDeSeccion nombre={nombre} lema={t(claveLema)} descripcion={t(claveDescripcion)} />;
};

export default StudioHeader;
