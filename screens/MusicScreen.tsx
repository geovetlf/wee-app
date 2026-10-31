import React, { useCallback, useEffect, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { useT } from '../contexts/IdiomaContext';
import CreatorShell from '../components/creator/CreatorShell';
import CabeceraDeSeccion from '../components/creator/CabeceraDeSeccion';
import MusicPortada from '../components/music/MusicPortada';
import MusicComposer from '../components/music/MusicComposer';
import Workstation from '../components/music/Workstation';
import { CancionDeMusic, cancionDeEjemplo } from '../utils/musicModel';
import { PuntoDePartidaId, puntoDePartida } from '../constants/musicComposer';

/**
 * WEË MUSIC — LA SECCIÓN DE WEË AI PARA CREAR MÚSICA.
 *
 * Dos vistas en la misma pantalla, sin ruta nueva: el COMPOSER —lo primero que se ve, en la web y en la app (referencia
 * del dueño)— con lo hecho y el estado de cada habilidad debajo (`MusicPortada`), y la WORKSTATION (reproductor, línea de
 * tiempo y herramientas: secciones, instrumentos y mezcla, ecualizador, letra y voz, estilo, stems, exportación). Se entra
 * por el menú ☰, el portal de Weë AI y Brain: el especialista `music` de `SpecialistScreen` entrega aquí.
 *
 * Parámetros de la ruta (`Specialist { id: 'music' }`): `punto` (un PuntoDePartidaId) y `goal` (lo que la persona ya
 * había escrito). La entrada de siempre —la conversación guiada con Weë Brain para música— sigue existiendo en el
 * servidor (`creator/templates.ts`) y no se toca; esta pantalla NO conecta ninguna API musical (CLAUDE.md).
 *
 * «Weë Music» es marca y se escribe igual en todos los idiomas.
 */
const MusicScreen: React.FC = () => {
  const t = useT();
  const route = useRoute<any>();
  const puntoDeRuta = puntoDePartida(route.params?.punto)?.id;
  const [punto, setPunto] = useState<PuntoDePartidaId>(puntoDeRuta ?? 'idea');
  const [cancion, setCancion] = useState<CancionDeMusic | null>(null);

  useEffect(() => {
    if (puntoDeRuta) { setPunto(puntoDeRuta); setCancion(null); }
  }, [puntoDeRuta]);

  const verEjemplo = useCallback(() => setCancion(cancionDeEjemplo()), []);
  const volver = useCallback(() => setCancion(null), []);

  return (
    <CreatorShell activeId="music" overline="🤖 Weë AI" title="🎵 Weë Music" breadcrumb="Weë AI" sinFranjaSuperior>
      <CabeceraDeSeccion nombre="Music" lema={t('music.tagline')} descripcion={t('music.intro')} />
      {cancion ? (
        <Workstation cancion={cancion} onCancion={setCancion} onVolver={volver} />
      ) : (
        <>
          <MusicComposer key={punto} puntoInicial={punto} onVerEjemplo={verEjemplo} inicial={{ texto: route.params?.goal }} />
          <MusicPortada />
        </>
      )}
    </CreatorShell>
  );
};

export default MusicScreen;
