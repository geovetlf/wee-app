import React from 'react';
import { enTemaOscuro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import CreatorShell from '../components/creator/CreatorShell';
import { ListaDeHerramientas } from '../components/weeai/ListaDeHerramientas';
import { PORTADA_WEEAI } from '../constants/estiloWeeAi';

/**
 * LAS HERRAMIENTAS DE WEËAI — pantalla propia (2026-11-17): el módulo «Herramientas» de la portada ya no abre una hoja, abre esto.
 * La flecha de volver del marco de Weë AI regresa a la portada (`goBack`).
 */
const HerramientasWeeAiScreen: React.FC = () => {
  const t = useT();
  return (
    <CreatorShell activeId="creator" title={t('weeai.tools')} breadcrumb={t('nav.weeAi')} fondo={PORTADA_WEEAI.fondo}>
      <ListaDeHerramientas />
    </CreatorShell>
  );
};

/* WeëAI es siempre oscura, con las dos caras. */
export default enTemaOscuro(HerramientasWeeAiScreen);
