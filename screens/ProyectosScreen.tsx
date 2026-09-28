import React from 'react';
import { useT } from '../contexts/IdiomaContext';
import PaginaDeStudio from '../components/workspace/PaginaDeStudio';
import ListaDeProyectos from '../components/proyectos/ListaDeProyectos';

/**
 * PROYECTOS — una página de Weë Studio, dentro de Weë Studio.
 *
 * Tus producciones de Filmmaker, tus proyectos de Weë AI y un vistazo a tus
 * creaciones (`components/proyectos/ListaDeProyectos`). En el teléfono es la
 * tercera pestaña del Studio. Abrir una producción lleva a Filmmaker, en el mismo
 * taller. Los proyectos de Weë —la App— siguen donde estaban.
 */
const ProyectosScreen: React.FC = () => {
  const t = useT();
  return (
    <PaginaDeStudio titulo={t('workspace.projectsTitle')} subtitulo={t('workspace.projectsSubtitle')}>
      <ListaDeProyectos />
    </PaginaDeStudio>
  );
};

export default ProyectosScreen;
