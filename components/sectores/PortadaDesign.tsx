import React from 'react';
import { useT } from '../../contexts/IdiomaContext';
import type { CategoriaDeDesign } from '../../constants/designTools';
import { Bloque, HeroDeSector, RejillaDeAccesos, TarjetaDestacada, TarjetasDescritas, TituloDeBloque } from './PiezasDeSector';

/*
 * LA PORTADA DE WEË DESIGN, COMO EN LA DEMO YC. Las acciones son las que la demo daba a sus zonas táctiles: abrir una
 * categoría de Weë Design (`abrir`), ver todas, o ir a Weë Fashion. «Fashion» es marca (Weë Fashion).
 */

const MASCOTA = require('../../assets/images/sectores/design-mascota.jpg');
const ESTUDIO = require('../../assets/images/sectores/design-studio.jpg');

export interface AccionesDeDesign {
  abrir: (categoria: CategoriaDeDesign | 'todas') => void;
  onFashion: () => void;
}

export const HeroDeDesign: React.FC<AccionesDeDesign> = ({ abrir }) => {
  const t = useT();
  return (
    <HeroDeSector
      lineas={[{ texto: t('design.heroLead') }, { texto: t('design.heroAccent'), dorado: true }]}
      descripcion={t('design.description')}
      imagen={MASCOTA}
      anchoImagen={0.54}
      fichas={[
        { icono: 'cube-outline', texto: t('design.productTitle'), onPress: () => abrir('product') },
        { icono: 'bed-outline', texto: t('design.interiorsTitle'), onPress: () => abrir('interiors') },
        { icono: 'layers-outline', texto: '3D', onPress: () => abrir('renders') },
        { icono: 'image-outline', texto: t('design.brandingTitle'), onPress: () => abrir('product') },
      ]}
    />
  );
};

export const CuerpoDeDesign: React.FC<AccionesDeDesign> = ({ abrir, onFashion }) => {
  const t = useT();
  return (
    <>
      <Bloque>
        <TituloDeBloque titulo={t('studio.quickTitle')} />
        <RejillaDeAccesos
          suaves
          accesos={[
            { id: 'interiors', icono: 'bed-outline', texto: t('design.interiorsTitle'), tinta: '#7C5CFC', fondo: '#EFEAFF', onPress: () => abrir('interiors') },
            { id: 'renders', icono: 'cube-outline', texto: t('design.objects3dTitle'), tinta: '#2F8FE8', fondo: '#E5F1FD', onPress: () => abrir('renders') },
            { id: 'fashion', icono: 'shirt-outline', texto: 'Fashion', tinta: '#EC4F86', fondo: '#FDE7EF', onPress: onFashion },
            { id: 'branding', icono: 'pricetag-outline', texto: t('design.brandingTitle'), tinta: '#26A65B', fondo: '#E6F6EC', onPress: () => abrir('product') },
          ]}
        />
      </Bloque>
      <TarjetaDestacada
        icono="layers-outline"
        lineas={[{ texto: t('design.designStudioTitle') }]}
        sub={t('design.designStudioSub')}
        cta={t('design.openStudio')}
        ctaIcono="color-wand-outline"
        imagen={ESTUDIO}
        onPress={() => abrir('todas')}
      />
      <Bloque>
        <TituloDeBloque titulo={t('design.exploreTitle')} onVerTodo={() => abrir('todas')} />
        <TarjetasDescritas
          tintadas
          tarjetas={[
            { id: 'interiors', icono: 'home-outline', tinta: '#E3A21A', fondo: '#FFF4DB', titulo: t('design.interiorsTitle'), descripcion: t('design.interiorsHint'), onPress: () => abrir('interiors') },
            { id: 'architecture', icono: 'business-outline', tinta: '#2F8FE8', fondo: '#E5F1FD', titulo: t('design.architectureTitle'), descripcion: t('design.architectureHint'), onPress: () => abrir('architecture') },
            { id: 'product', icono: 'cube-outline', tinta: '#7C5CFC', fondo: '#EFEAFF', titulo: t('design.productTitle'), descripcion: t('design.productHint'), onPress: () => abrir('product') },
            { id: 'fashion', icono: 'shirt-outline', tinta: '#EC4F86', fondo: '#FDE7EF', titulo: 'Fashion', descripcion: t('design.fashionHint'), onPress: onFashion },
          ]}
        />
      </Bloque>
    </>
  );
};
