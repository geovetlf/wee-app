import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useT } from '../contexts/IdiomaContext';
import { useEnEspacioProfesional } from '../contexts/EspacioProfesionalContext';
import CreatorShell from '../components/creator/CreatorShell';
import CabeceraDeSeccion from '../components/creator/CabeceraDeSeccion';
import CajaDePrompt from '../components/creator/CajaDePrompt';
import MusicPortada from '../components/music/MusicPortada';
import MusicComposer from '../components/music/MusicComposer';
import Workstation from '../components/music/Workstation';
import { CuerpoDeMusic, HeroDeMusic } from '../components/sectores/PortadaMusic';
import { CancionDeMusic, cancionDeEjemplo } from '../utils/musicModel';
import { ModoDeMusic, PuntoDePartidaId, puntoDePartida } from '../constants/musicComposer';
import { SPACING } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * WEË MUSIC — LA SECCIÓN DE WEË AI PARA CREAR MÚSICA.
 *
 * Tres vistas en la misma pantalla, sin ruta nueva:
 *  · la PORTADA de la demo YC (solo en la app): héroe, caja, el estudio de ejemplo dibujado y los accesos;
 *  · el COMPOSER de siempre (`MusicComposer` + `MusicPortada`), al que se llega desde un acceso o la caja —y que es lo
 *    primero en Weë versión creator—;
 *  · la WORKSTATION de ejemplo (reproductor, línea de tiempo y herramientas).
 *
 * Parámetros de la ruta (`Specialist { id: 'music' }`): `punto` (un PuntoDePartidaId) y `goal` (lo que la persona ya
 * había escrito); con cualquiera de los dos se entra directamente al composer. Esta pantalla NO conecta ninguna API
 * musical (CLAUDE.md §5). «Weë Music» es marca y se escribe igual en todos los idiomas.
 */
const MusicScreen: React.FC = () => {
  const t = useT();
  const route = useRoute<any>();
  const pro = useEnEspacioProfesional();
  const puntoDeRuta = puntoDePartida(route.params?.punto)?.id;
  const [punto, setPunto] = useState<PuntoDePartidaId>(puntoDeRuta ?? 'idea');
  const [modo, setModo] = useState<ModoDeMusic | undefined>(undefined);
  const [cancion, setCancion] = useState<CancionDeMusic | null>(null);
  const [enComposer, setEnComposer] = useState(pro || !!puntoDeRuta || !!route.params?.goal);
  const [texto, setTexto] = useState('');
  const ejemplo = useMemo(() => cancionDeEjemplo(), []);

  useEffect(() => {
    if (puntoDeRuta) { setPunto(puntoDeRuta); setCancion(null); setEnComposer(true); }
  }, [puntoDeRuta]);

  const verEjemplo = useCallback(() => setCancion(cancionDeEjemplo()), []);
  const volver = useCallback(() => setCancion(null), []);
  const componer = useCallback((p: PuntoDePartidaId, m?: ModoDeMusic) => { setPunto(p); setModo(m); setEnComposer(true); }, []);

  if (cancion) {
    return (
      <CreatorShell activeId="music" overline="🤖 Weë AI" title="🎵 Weë Music" breadcrumb="Weë AI" sinFranjaSuperior>
        <CabeceraDeSeccion nombre="Music" lema={t('music.tagline')} descripcion={t('music.intro')} />
        <Workstation cancion={cancion} onCancion={setCancion} onVolver={volver} />
      </CreatorShell>
    );
  }

  if (enComposer) {
    return (
      <CreatorShell activeId="music" overline="🤖 Weë AI" title="🎵 Weë Music" breadcrumb="Weë AI" sinFranjaSuperior>
        {/* Desde la portada, el volver de la cabecera regresa a ella; en creator, lo de siempre. */}
        <CabeceraDeSeccion nombre="Music" lema={t('music.tagline')} descripcion={t('music.intro')} onVolver={pro ? undefined : () => setEnComposer(false)} />
        <MusicComposer key={`${punto}-${modo ?? ''}`} puntoInicial={punto} modoInicial={modo} onVerEjemplo={verEjemplo} inicial={{ texto: texto || route.params?.goal }} />
        <MusicPortada />
      </CreatorShell>
    );
  }

  return (
    <CreatorShell activeId="music" overline="🤖 Weë AI" title="🎵 Weë Music" breadcrumb="Weë AI" sinFranjaSuperior>
      {/* La portada de la demo YC (docs/MIGRACION-UI-DEMO-YC.md, lote 3). */}
      <CabeceraDeSeccion soloIdentidad nombre="Music" lema={t('music.tagline')} />
      <View style={s.portada}>
        <HeroDeMusic onVerEjemplo={verEjemplo} onComponer={componer} />
      </View>
      <View style={s.caja}>
        <CajaDePrompt
          vitrina
          valor={texto}
          onCambiar={setTexto}
          onEnviar={() => componer('idea')}
          etiquetaEnviar={t('music.ctaCreate')}
          placeholder={t('music.demoPrompt')}
          acciones={[
            { icono: 'add', etiqueta: t('music.startIdea'), alPulsar: () => componer('idea') },
            { icono: 'document-text-outline', etiqueta: t('music.startLyrics'), alPulsar: () => componer('lyrics') },
            { icono: 'image-outline', etiqueta: t('composer.kindImage'), alPulsar: () => componer('idea') },
            { icono: 'mic-outline', etiqueta: t('music.startHum'), alPulsar: () => componer('hum') },
            { icono: 'options-outline', etiqueta: t('music.modesLabel'), alPulsar: () => componer('idea', 'advanced') },
          ]}
        />
      </View>
      <View style={s.cuerpo}>
        <CuerpoDeMusic cancionDeEjemplo={ejemplo} onVerEjemplo={verEjemplo} onComponer={componer} />
      </View>
    </CreatorShell>
  );
};

const s = StyleSheet.create({
  portada: { marginBottom: -scale(30), marginHorizontal: -SPACING.lg },
  caja: { marginBottom: SPACING.xl },
  cuerpo: { gap: SPACING.xxl, marginHorizontal: -SPACING.lg, paddingBottom: SPACING.xxxl },
});

export default MusicScreen;
