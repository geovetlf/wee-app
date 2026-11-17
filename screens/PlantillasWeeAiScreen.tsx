import React, { useState } from 'react';
import { RefreshControl } from 'react-native';
import { enTemaOscuro } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import CreatorShell from '../components/creator/CreatorShell';
import { PantallaDePlantillas } from '../components/weeai/PantallaDePlantillas';
import { usePlantillas } from '../hooks/usePlantillas';
import { PORTADA_WEEAI } from '../constants/estiloWeeAi';

/**
 * LAS PLANTILLAS DE WEËAI — pantalla propia (2026-11-17): el muro «Plantillas para ti» que antes estaba debajo de la portada.
 * Se llega desde el módulo «Plantillas» de la portada y la flecha de volver regresa a ella (el marco de Weë AI hace
 * `goBack`). Tirar para refrescar vuelve a leer las mismas plantillas, sin nada nuevo en el servidor.
 */
const PlantillasWeeAiScreen: React.FC = () => {
  const t = useT();
  const { plantillas, estado, recargar } = usePlantillas();
  const [refrescando, setRefrescando] = useState(false);
  const refrescar = async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  };
  return (
    <CreatorShell activeId="creator" title={t('weeai.portadaPlantillas')} breadcrumb={t('nav.weeAi')} fondo={PORTADA_WEEAI.fondo} refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}>
      <PantallaDePlantillas plantillas={plantillas} estado={estado} recargar={recargar} />
    </CreatorShell>
  );
};

/* WeëAI es siempre oscura, con las dos caras. */
export default enTemaOscuro(PlantillasWeeAiScreen);
