import React from 'react';
import { useT } from '../../contexts/IdiomaContext';
import { FASHION_MODOS, FashionModo, modoDeFashion } from '../../constants/fashionModes';
import { Bloque, HeroDeSector, TarjetaDestacada, TarjetasDeFoto, TarjetasDescritas, TituloDeBloque } from './PiezasDeSector';

/*
 * LA PORTADA DE WEË FASHION, COMO EN LA DEMO YC. Cada pieza abre uno de los modos reales del composer de Fashion
 * (constants/fashionModes.ts), con las mismas correspondencias que daba la demo a sus zonas: pelo, uñas y maquillaje →
 * «Maquillaje y pelo»; ropa → «Probar ropa»; looks, asesor y color → «Look completo». «Ver todo» enseña la lista
 * completa de modos.
 */

const MASCOTA = require('../../assets/images/sectores/fashion-mascota.jpg');
const ESTUDIO = require('../../assets/images/sectores/fashion-estudio.jpg');
const PELO = require('../../assets/images/sectores/fashion-pelo.jpg');
const UNAS = require('../../assets/images/sectores/fashion-unas.jpg');
const ROPA = require('../../assets/images/sectores/fashion-ropa.jpg');

const m = (id: string): FashionModo => modoDeFashion(id) ?? FASHION_MODOS[0];

interface Props {
  onAbrir: (modo: FashionModo) => void;
  onVerTodo: () => void;
}

export const HeroDeFashion: React.FC<Props> = ({ onAbrir, onVerTodo }) => {
  const t = useT();
  return (
    <HeroDeSector
      lineas={[{ texto: t('fashion.heroLine1') }, { texto: t('fashion.heroLine2'), dorado: true }, { texto: t('fashion.heroLine3') }]}
      descripcion={t('fashion.heroText')}
      imagen={MASCOTA}
      anchoImagen={0.62}
      encuadre={0.55}
      colores={['#1A1030', '#3A2160']}
      fichasEnFila
      compacto
      tituloMaximo={25}
      fichas={[
        { icono: 'sparkles-outline', texto: t('fashion.chipAll'), onPress: onVerTodo, activa: true },
        { icono: 'body-outline', tinta: '#1F2937', texto: t('fashion.chipLooks'), onPress: () => onAbrir(m('completeLook')) },
        { icono: 'cut-outline', tinta: '#1F2937', texto: t('fashion.galHair'), onPress: () => onAbrir(m('beautyHair')) },
        { icono: 'brush-outline', tinta: '#1F2937', texto: t('fashion.galNails'), onPress: () => onAbrir(m('beautyHair')) },
        { icono: 'color-palette-outline', tinta: '#1F2937', texto: t('fashion.chipBeauty'), onPress: () => onAbrir(m('beautyHair')) },
        { icono: 'shirt-outline', tinta: '#1F2937', texto: t('fashion.chipOutfits'), onPress: () => onAbrir(m('tryOn')) },
      ]}
    />
  );
};

export const CuerpoDeFashion: React.FC<Props> = ({ onAbrir, onVerTodo }) => {
  const t = useT();
  const herramienta = (id: string, icono: string, tinta: string, fondo: string, titulo: string, descripcion: string, modo: string) =>
    ({ id, icono, tinta, fondo, titulo: t(titulo), descripcion: t(descripcion), onPress: () => onAbrir(m(modo)) });
  return (
    <>
      <Bloque>
        <TituloDeBloque titulo={t('fashion.transformTitle')} onVerTodo={onVerTodo} />
        <TarjetasDeFoto
          variante="franja"
          tarjetas={[
            { id: 'hair', imagen: PELO, icono: 'cut-outline', texto: t('fashion.transformHair'), onPress: () => onAbrir(m('beautyHair')) },
            { id: 'nails', imagen: UNAS, icono: 'brush-outline', texto: t('fashion.transformNails'), onPress: () => onAbrir(m('beautyHair')) },
            { id: 'clothes', imagen: ROPA, icono: 'shirt-outline', texto: t('fashion.transformClothes'), onPress: () => onAbrir(m('tryOn')) },
          ]}
        />
      </Bloque>
      <Bloque>
        <TituloDeBloque titulo={t('fashion.toolsForStyle')} />
        <TarjetasDescritas
          tintadas
          columnas={3}
          tarjetas={[
            herramienta('tryon', 'scan-outline', '#22A55B', '#E9F8EF', 'fashion.tVirtualTryOn', 'fashion.tVirtualTryOnDesc', 'tryOn'),
            herramienta('hair', 'cut-outline', '#2F8FE8', '#E8F2FD', 'fashion.tHairLab', 'fashion.tHairLabDesc', 'beautyHair'),
            herramienta('nails', 'brush-outline', '#EC4F86', '#FDE9F1', 'fashion.tNailStudio', 'fashion.tNailStudioDesc', 'beautyHair'),
            herramienta('makeup', 'color-wand-outline', '#8B5CF6', '#F3EEFF', 'fashion.tMakeup', 'fashion.tMakeupDesc', 'beautyHair'),
            herramienta('advisor', 'person-outline', '#E3A21A', '#FFF6DE', 'fashion.tAdvisor', 'fashion.tAdvisorDesc', 'completeLook'),
            herramienta('color', 'color-palette-outline', '#22A55B', '#EDF8F0', 'fashion.tColor', 'fashion.tColorDesc', 'completeLook'),
          ]}
        />
      </Bloque>
      <TarjetaDestacada
        icono="sparkles-outline"
        lineas={[{ texto: t('fashion.studioLine1') }, { texto: t('fashion.studioAccent'), dorado: true }]}
        sub={t('fashion.studioSub')}
        cta={t('fashion.createNow')}
        ctaIcono="arrow-forward"
        imagen={ESTUDIO}
        anchoImagen={0.55}
        colores={['#3A1E63', '#5A2E8A']}
        onPress={() => onAbrir(m('completeLook'))}
      />
    </>
  );
};
