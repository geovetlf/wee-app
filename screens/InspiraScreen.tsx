import React from 'react';
import { useRoute } from '@react-navigation/native';
import { useT } from '../contexts/IdiomaContext';
import PaginaDeCreator from '../components/workspace/PaginaDeCreator';
import BibliotecaDeInspiracion from '../components/inspira/BibliotecaDeInspiracion';
import { useCaminosDeCreacion } from '../hooks/useCaminosDeCreacion';

/**
 * INSPIRA EN WEË CREATOR: las ideas listas para usar, y nada más.
 *
 * En Weë, la pestaña Inspira enseña además la comunidad —sus muros y sus
 * Weëls—. Aquí no: Weë Creator es para crear, y la comunidad se queda en su casa
 * (decisión del usuario, 2026-09-27). La biblioteca es la misma pieza; «Usar»
 * lleva a donde se crea dentro del taller.
 */
const InspiraScreen: React.FC = () => {
  const t = useT();
  const route = useRoute<any>();
  const { usarReceta } = useCaminosDeCreacion();
  return (
    <PaginaDeCreator titulo={t('inspira.title')} subtitulo={t('inspira.subtitle')}>
      <BibliotecaDeInspiracion onUsar={usarReceta} recetaInicial={route.params?.receta} />
    </PaginaDeCreator>
  );
};

export default InspiraScreen;
