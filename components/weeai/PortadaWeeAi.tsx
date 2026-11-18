import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NombreDeIcono } from '../icons/trazosDeWee';
import { CabeceraDePortada } from './CabeceraDePortada';
import { HeroDePortada } from './HeroDePortada';
import { ModulosDePortada, ModuloDePortada, HUECO_DE_MODULOS } from './ModulosDePortada';
import CajaDePrompt, { AccionDeLaCaja } from '../creator/CajaDePrompt';
import { CajaAnclada } from '../creator/CajaQueCrece';
import { useT } from '../../contexts/IdiomaContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { MUSICA_EN_LA_UI, PORTADA_DE_WEEAI } from '../../constants/weeExperiences';
import { MUNDO_3D_EN_LA_APP, FILMMAKER_EN_LA_APP } from '../../constants/studioExperiences';
import { ESPACIO_WEEAI as SPACING } from '../../constants/estiloWeeAi';

/* Qué se ofrece sale de la bandera de siempre (PORTADA_DE_WEEAI); ninguna experiencia ni id se mueve. */
const HAY_IMAGEN = (PORTADA_DE_WEEAI.puertas as readonly string[]).includes('design');

const ANCHO_MAXIMO = 760;
/** Lo que mide la cabecera y lo mínimo que se reserva al hero cuando la caja crece. */
const ALTO_DE_CABECERA = 56;
const ALTO_MINIMO_DEL_HERO = 70;
/** Aire entre la caja y la rejilla. */
const AIRE = 12;
/** Holgura constante entre la última fila y la barra inferior (>= 16 dp en cualquier altura). */
const HOLGURA_SOBRE_LA_BARRA = 20;
/** Lo que mide la caja vacía con sus botones (campo de una línea + fila de botones + aire); la rejilla se calcula con lo que queda. */
const ALTO_DE_LA_CAJA_VACIA = 112;

/**
 * LA PORTADA DE WEËAI v2 — PANTALLA FIJA (2026-11-17): cabecera, hero, la caja común y la rejilla de módulos caben SIEMPRE en una
 * sola pantalla, sin desplazarse. Lo que sobra o falta se reparte entre el hero (que se comprime) y las tarjetas (cuyo alto
 * se ajusta a la altura de la ventana); la caja crece con lo escrito hasta un tope y el texto se desplaza DENTRO de ella.
 * Las plantillas y las herramientas ya no viven aquí: son los módulos «Plantillas» y «Herramientas», cada uno con su pantalla propia
 * (`PantallaDePlantillas`, `ListaDeHerramientas`).
 * El saldo y la compra viven en la cabecera (`CreditsPill`): aquí no hay precios ni lógica de Credits.
 */
export const PortadaWeeAi: React.FC = () => {
  const t = useT();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isDesktop } = useResponsive();
  /* La caja universal: lo escrito y, si se marcó imagen o video, el contexto con el que viaja. Sin marca, Weë Brain. */
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<null | 'imagen' | 'video'>(null);
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });

  const conCuenta = (fn: () => void) => () => (user ? fn() : navigation.navigate('Login'));
  const irA = (id: string) => navigation.navigate('Specialist', { id });
  /* La caja es la misma inteligencia que las demás: solo cambia el experienceId que viaja (Brain, o el de imagen o video si se marcó). */
  const enviar = conCuenta(() => {
    const goal = texto.trim();
    if (!goal) return;
    const experienceId = tipo === 'imagen' ? 'design' : tipo === 'video' ? 'studio' : 'brain';
    setTexto('');
    navigation.navigate('CreatorFlow', { experienceId, goal });
  });

  const acciones: AccionDeLaCaja[] = [
    { icono: 'add', iconoWee: 'mas', etiqueta: `${t('studio.addLabel')}. ${t('common.comingSoon')}`, alPulsar: () => {}, deshabilitada: true },
  ];
  const accionesDerecha: AccionDeLaCaja[] = [
    ...(HAY_IMAGEN ? [{ icono: 'image-outline', iconoWee: 'galeria' as NombreDeIcono, etiqueta: t('composer.kindImage'), alPulsar: () => setTipo((v) => (v === 'imagen' ? null : 'imagen')), activa: tipo === 'imagen' }] : []),
    { icono: 'videocam-outline', iconoWee: 'claqueta' as NombreDeIcono, etiqueta: t('composer.kindVideo'), alPulsar: () => setTipo((v) => (v === 'video' ? null : 'video')), activa: tipo === 'video' },
    { icono: 'pulse', iconoWee: 'ondas' as NombreDeIcono, etiqueta: `${t('creaciones.kindAudio')}. ${t('common.comingSoon')}`, alPulsar: () => {}, deshabilitada: true },
  ];

  /* Cada módulo va a su flujo REAL o queda apagado con «Próximamente»: nada simulado. */
  const m = {
    imagen: { id: 'imagen', icono: 'galeria', clave: 'composer.kindImage', textura: 'imagen', alPulsar: HAY_IMAGEN ? () => irA('design') : undefined } as ModuloDePortada,
    video: { id: 'video', icono: 'claqueta', clave: 'composer.kindVideo', textura: 'video', alPulsar: () => navigation.navigate('CrearVideo') } as ModuloDePortada,
    audio: { id: 'audio', icono: 'ondas', clave: 'creaciones.kindAudio', textura: 'audio', alPulsar: MUSICA_EN_LA_UI ? () => irA('music') : undefined } as ModuloDePortada,
    /* Filmmaker: la producción existe (`Production`) pero su puerta está cerrada (`FILMMAKER_EN_LA_APP`): abierta desde 2026-11-17, navega a Production; cerrada, «Próximamente» y sin navegar. */
    filmmaker: { id: 'filmmaker', icono: 'camaraCine', clave: 'weeai.portadaFilmmaker', textura: 'video', alPulsar: FILMMAKER_EN_LA_APP ? () => navigation.navigate('Filmmaker') : undefined } as ModuloDePortada,
    texto: { id: 'texto', icono: 'texto', clave: 'composer.kindText', textura: 'texto' } as ModuloDePortada,
    tresD: { id: 'tresD', icono: 'cubo', clave: 'creaciones.kindModel3d', textura: 'tresD', alPulsar: MUNDO_3D_EN_LA_APP ? () => navigation.navigate('Mundo3D') : undefined } as ModuloDePortada,
    plantillas: { id: 'plantillas', icono: 'plantillas', clave: 'weeai.portadaPlantillas', textura: 'imagen', alPulsar: () => navigation.navigate('Plantillas') } as ModuloDePortada,
    herramientas: { id: 'herramientas', icono: 'capas', clave: 'weeai.tools', textura: 'mas', alPulsar: () => navigation.navigate('Herramientas') } as ModuloDePortada,
  };

  /*
   * LA MEDIDA (v2, ronda 4): tarjetas SIEMPRE cuadradas e iguales, tres por fila y la última de dos centrada (Imagen · Video · Filmmaker /
   * Audio · Texto · Plantillas / 3D · Herramientas). El lado es el que da el ancho, o el que deja la altura si es menor: con pantallas bajas
   * las tarjetas se achican y con las altas sobra sitio para el hero, que ocupa lo que quede arriba (con el arco anclado arriba).
   */
  const ancho = medida.ancho || ANCHO_MAXIMO;
  const alto = isDesktop ? Math.max(medida.alto, 720) : medida.alto || 700;
  const anchoUtil = ancho - SPACING.md * 2;
  const modulos = [m.imagen, m.video, m.filmmaker, m.audio, m.texto, m.plantillas, m.tresD, m.herramientas];
  const ladoPorAncho = Math.floor((anchoUtil - HUECO_DE_MODULOS * 2) / 3);
  const presupuestoDeRejilla = alto - (isDesktop ? 0 : ALTO_DE_CABECERA) - HOLGURA_SOBRE_LA_BARRA - ALTO_DE_LA_CAJA_VACIA - AIRE * 2 - ALTO_MINIMO_DEL_HERO;
  const ladoPorAlto = Math.floor((presupuestoDeRejilla - HUECO_DE_MODULOS * 2) / 3);
  const lado = Math.max(56, Math.min(ladoPorAncho, ladoPorAlto, 132));
  /* Si las tarjetas son más estrechas que el ancho, el hueco entre ellas se reparte (entre 10 y 24). */
  const hueco = Math.max(HUECO_DE_MODULOS, Math.min(24, Math.floor((anchoUtil - 3 * lado) / 2)));
  const altoDeRejilla = 3 * lado + 2 * hueco;
  /* Hasta dónde crece la caja: lo que queda tras la cabecera, la rejilla, el aire y un hero mínimo. */
  const topeDeLaCaja = Math.max(130, alto - (isDesktop ? 0 : ALTO_DE_CABECERA) - altoDeRejilla - HOLGURA_SOBRE_LA_BARRA - AIRE * 2 - ALTO_MINIMO_DEL_HERO);

  return (
    <View style={styles.raiz} onLayout={(e: LayoutChangeEvent) => { const { width, height } = e.nativeEvent.layout; setMedida((antes) => (Math.abs(antes.ancho - width) > 1 || Math.abs(antes.alto - height) > 1 ? { ancho: Math.round(width), alto: Math.round(height) } : antes)); }}>
      {!isDesktop ? <CabeceraDePortada /> : null}
      <HeroDePortada ancho={ancho} />
      <View style={[styles.bloque, { marginBottom: AIRE }]}>
        <CajaAnclada alto={topeDeLaCaja}>
          <CajaDePrompt
            portada
            valor={texto}
            onCambiar={setTexto}
            onEnviar={enviar}
            etiquetaEnviar={t('studio.sendLabel')}
            placeholder={t('nav.weeAiQuestion')}
            acciones={acciones}
            accionesDerecha={accionesDerecha}
          />
        </CajaAnclada>
      </View>
      <View style={[styles.bloque, { paddingBottom: HOLGURA_SOBRE_LA_BARRA }]}>
        <ModulosDePortada modulos={modulos} lado={lado} hueco={hueco} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1, width: '100%', maxWidth: ANCHO_MAXIMO, alignSelf: 'center' },
  bloque: { paddingHorizontal: SPACING.md },
});
