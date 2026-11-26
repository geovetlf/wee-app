import React from 'react';
import { useT } from '../../contexts/IdiomaContext';
import { TARJETAS_DE_CHEF, TarjetaDeChef } from '../../constants/chefTools';
import { Bloque, HeroDeSector, PildorasDeSector, TarjetasDescritas, TituloDeBloque } from './PiezasDeSector';

/*
 * LA PORTADA DE WEË CHEF, COMO EN LA DEMO YC. Las cuatro tarjetas grandes son las cuatro primeras de `TARJETAS_DE_CHEF`
 * (las mismas que la demo tocaba); las demás siguen a mano como píldoras. Cada una abre lo que ya abría
 * (`alElegirTarjeta`, con su pregunta ya contestada).
 */

const MASCOTA = require('../../assets/images/sectores/chef-mascota.jpg');

/* El color de cada tarjeta grande de la referencia. */
const TONO: Record<string, { tinta: string; fondo: string }> = {
  ingredients: { tinta: '#E8890C', fondo: '#FFF3E0' },
  recipe: { tinta: '#8B5CF6', fondo: '#F3EEFF' },
  menu: { tinta: '#2F8FE8', fondo: '#E8F2FD' },
  healthy: { tinta: '#22A55B', fondo: '#E7F7EE' },
};
const GRANDES = ['ingredients', 'recipe', 'menu', 'healthy'];

const tarjeta = (id: string): TarjetaDeChef => TARJETAS_DE_CHEF.find((x) => x.id === id) ?? TARJETAS_DE_CHEF[0];

export const HeroDeChef: React.FC<{ onElegir: (t: TarjetaDeChef) => void }> = ({ onElegir }) => {
  const t = useT();
  return (
    <HeroDeSector
      lineas={[{ texto: t('chef.heroLead') }, { texto: t('chef.heroAccent'), dorado: true }]}
      descripcion={t('chef.description')}
      imagen={MASCOTA}
      anchoImagen={0.5}
      colores={['#1B140C', '#3A2A14']}
      fichas={[
        { icono: 'fast-food-outline', texto: t('chef.chipRecipes'), onPress: () => onElegir(tarjeta('recipe')) },
        { icono: 'list-outline', texto: t('chef.chipMenus'), onPress: () => onElegir(tarjeta('menu')) },
        { icono: 'leaf-outline', texto: t('chef.chipHealthy'), onPress: () => onElegir(tarjeta('healthy')) },
        { icono: 'flash-outline', texto: t('chef.chipQuick'), onPress: () => onElegir(tarjeta('ingredients')) },
      ]}
    />
  );
};

export const CuerpoDeChef: React.FC<{ onElegir: (t: TarjetaDeChef) => void }> = ({ onElegir }) => {
  const t = useT();
  return (
    <Bloque>
      <TituloDeBloque titulo={t('chef.gridTitle')} />
      <TarjetasDescritas
        grandes
        tintadas
        tarjetas={GRANDES.map((id) => {
          const c = tarjeta(id);
          return { id, icono: c.icono, ...TONO[id], titulo: t(c.claveTitulo), descripcion: t(c.claveSubtitulo), onPress: () => onElegir(c) };
        })}
      />
      <PildorasDeSector
        pildoras={TARJETAS_DE_CHEF.filter((c) => !GRANDES.includes(c.id)).map((c) => ({ id: c.id, icono: c.icono, texto: t(c.claveTitulo), onPress: () => onElegir(c) }))}
      />
    </Bloque>
  );
};
