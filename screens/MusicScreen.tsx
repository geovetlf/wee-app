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
 * WEË MUSIC — la sección de Weë AI para crear música.
 *
 * Tres vistas en la misma pantalla, sin ruta nueva: la PORTADA (identidad, «Crear música», accesos, habilidades con su
 * estado real, canciones recientes), el COMPOSER (punto de partida → descripción → parámetros → resumen → generación
 * cerrada con su motivo) y la WORKSTATION (reproductor, línea de tiempo y herramientas: secciones, instrumentos y
 * mezcla, ecualizador, letra y voz, estilo, stems, exportación). Se entra por el menú ☰, el portal de Weë AI y Brain: el
 * especialista `music` de `SpecialistScreen` entrega aquí.
 *
 * Parámetros de la ruta (`Specialist { id: 'music' }`): `punto` (un PuntoDePartidaId) y `goal` (lo que la persona ya
 * había escrito). La entrada de siempre —la conversación guiada con Weë Brain para música— sigue existiendo en el
 * servidor (`creator/templates.ts`) y no se toca; esta pantalla NO conecta ninguna API musical (CLAUDE.md).
 *
 * «Weë Music» es marca y se escribe igual en todos los idiomas.
 */
type Vista = 'portada' | 'composer' | 'workstation';

const MusicScreen: React.FC = () => {
  const t = useT();
  const route = useRoute<any>();
  const puntoDeRuta = puntoDePartida(route.params?.punto)?.id;
  const [vista, setVista] = useState<Vista>(puntoDeRuta || route.params?.goal ? 'composer' : 'portada');
  const [punto, setPunto] = useState<PuntoDePartidaId>(puntoDeRuta ?? 'idea');
  const [cancion, setCancion] = useState<CancionDeMusic | null>(null);

  useEffect(() => {
    if (puntoDeRuta) { setPunto(puntoDeRuta); setVista('composer'); }
  }, [puntoDeRuta]);

  const crear = useCallback((p: PuntoDePartidaId) => { setPunto(p); setVista('composer'); }, []);
  const verEjemplo = useCallback(() => { setCancion(cancionDeEjemplo()); setVista('workstation'); }, []);
  const volver = useCallback(() => setVista('portada'), []);

  return (
    <CreatorShell activeId="music" overline="🤖 Weë AI" title="🎵 Weë Music" breadcrumb="Weë AI" sinFranjaSuperior>
      <CabeceraDeSeccion nombre="Music" lema={t('music.tagline')} descripcion={t('music.intro')} />
      {vista === 'portada' && <MusicPortada onCrear={crear} onVerEjemplo={verEjemplo} />}
      {vista === 'composer' && <MusicComposer key={punto} puntoInicial={punto} onVolver={volver} onVerEjemplo={verEjemplo} inicial={{ texto: route.params?.goal }} />}
      {vista === 'workstation' && cancion && <Workstation cancion={cancion} onCancion={setCancion} onVolver={volver} />}
    </CreatorShell>
  );
};

export default MusicScreen;
