import React from 'react';
import { useEnCreator } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import PaginaDeCreator from '../components/workspace/PaginaDeCreator';
import PestanaDeLaApp from '../components/PestanaDeLaApp';
import ListaDeProyectos from '../components/proyectos/ListaDeProyectos';

/**
 * PROYECTOS — la misma lista en Weë y en Weë Creator.
 *
 * En Weë es la tercera pestaña, con su encabezado y la barra de abajo; en Weë
 * Creator es una página del taller, dentro de su marco. Lo de dentro es lo mismo
 * (`components/proyectos/ListaDeProyectos`): tus producciones, tus proyectos de
 * Weë AI y un vistazo a tus creaciones. Abrir una producción lleva a Filmmaker,
 * que vive en Weë Creator.
 */
const ProyectosScreen: React.FC = () => {
  const t = useT();
  const enCreator = useEnCreator();
  if (enCreator) {
    return (
      <PaginaDeCreator titulo={t('workspace.projectsTitle')} subtitulo={t('workspace.projectsSubtitle')}>
        <ListaDeProyectos />
      </PaginaDeCreator>
    );
  }
  return (
    <PestanaDeLaApp titulo={t('nav.projects')} subtitulo={t('workspace.projectsSubtitle')}>
      <ListaDeProyectos />
    </PestanaDeLaApp>
  );
};

export default ProyectosScreen;
