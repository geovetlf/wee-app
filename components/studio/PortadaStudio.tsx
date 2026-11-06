import React from 'react';
import { useT } from '../../contexts/IdiomaContext';
import type { EntradaDeStudio } from '../../constants/studioExperiences';
import { Bloque, HeroDeSector, PildorasDeSector, RejillaDeAccesos, TarjetaDestacada, TarjetasDescritas, TituloDeBloque } from '../sectores/PiezasDeSector';

/*
 * LA PORTADA DE WEË STUDIO, COMO EN LA DEMO YC (docs/MIGRACION-UI-DEMO-YC.md, lote 3), con las piezas comunes de las
 * secciones (components/sectores/PiezasDeSector.tsx). Cada pieza llama a lo que el Studio ya tenía: abrir un panel, ir a
 * Production (Filmmaker), a Weë Design o a Mis proyectos. «Filmmaker», «Filmmaker Engine», «Writer» y «Design» son marca.
 */

const MASCOTA = require('../../assets/images/sectores/studio-mascota.jpg');
const CAMARA = require('../../assets/images/sectores/studio-filmmaker.jpg');

export const HeroDelStudio: React.FC<{ onFilmmaker: () => void; onAbrir: (entrada: EntradaDeStudio) => void }> = ({ onFilmmaker, onAbrir }) => {
  const t = useT();
  return (
    <HeroDeSector
      lineas={[{ texto: t('studio.heroLead') }, { texto: t('studio.heroAccent'), dorado: true }]}
      descripcion={t('studio.description')}
      imagen={MASCOTA}
      fichas={[
        { icono: 'film-outline', texto: 'Filmmaker', onPress: onFilmmaker },
        { icono: 'image-outline', texto: t('studio.imagesTitle'), onPress: () => onAbrir('images') },
        { icono: 'musical-note-outline', texto: t('studio.kindAudio'), onPress: () => onAbrir('voice') },
        { icono: 'document-text-outline', texto: 'Writer', onPress: () => onAbrir('text') },
      ]}
    />
  );
};

export const CreacionRapida: React.FC<{ onAbrir: (entrada: EntradaDeStudio) => void }> = ({ onAbrir }) => {
  const t = useT();
  return (
    <Bloque>
      <TituloDeBloque titulo={t('studio.quickTitle')} />
      <RejillaDeAccesos
        suaves
        accesos={[
          { id: 'images', icono: 'images-outline', texto: t('studio.imagesTitle'), tinta: '#7C5CFC', fondo: '#EFEAFF', onPress: () => onAbrir('images') },
          { id: 'videos', icono: 'play-outline', texto: t('studio.videosTitle'), tinta: '#EC4F86', fondo: '#FDE7EF', onPress: () => onAbrir('videos') },
          { id: 'voice', icono: 'pulse-outline', texto: t('studio.voiceTitle'), tinta: '#12A9C0', fondo: '#E2F6F9', onPress: () => onAbrir('voice') },
          { id: 'text', icono: 'create-outline', texto: t('studio.textTitle'), tinta: '#5B63E8', fondo: '#ECEDFF', onPress: () => onAbrir('text') },
        ]}
      />
    </Bloque>
  );
};

export const TarjetaFilmmaker: React.FC<{ onAbrir: () => void }> = ({ onAbrir }) => {
  const t = useT();
  return (
    <TarjetaDestacada
      icono="film-outline"
      lineas={[{ texto: 'Filmmaker Engine' }]}
      sub={t('studio.filmmakerEngineSub')}
      cta={t('studio.filmmakerCardCta')}
      ctaIcono="film-outline"
      imagen={CAMARA}
      onPress={onAbrir}
    />
  );
};

interface MasProps {
  onDesign: () => void;
  onProyectos: () => void;
  /** Las demás puertas del Studio (personajes, belleza, moda, mundo 3D, documentos), que no se pierden. */
  otras?: { id: string; icono: string; texto: string; onPress: () => void }[];
}

export const MasHerramientas: React.FC<MasProps> = ({ onDesign, onProyectos, otras = [] }) => {
  const t = useT();
  return (
    <Bloque>
      <TituloDeBloque titulo={t('studio.moreTitle')} />
      <TarjetasDescritas
        tarjetas={[
          { id: 'design', icono: 'layers-outline', tinta: '#6D5BEF', fondo: '#EEEBFF', titulo: 'Design', onPress: onDesign },
          { id: 'projects', icono: 'folder-outline', tinta: '#E3A21A', fondo: '#FFF4DB', titulo: t('studio.projectsTitle'), onPress: onProyectos },
        ]}
      />
      <PildorasDeSector pildoras={otras} />
    </Bloque>
  );
};
