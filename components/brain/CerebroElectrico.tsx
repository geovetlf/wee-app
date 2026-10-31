import React from 'react';
import { Image } from 'expo-image';
import type { EstadoDelCerebro } from './SistemaDeWeeBrain';

/* Fuera de la web, el cerebro de siempre: la app móvil no cambia. El animado está en `CerebroElectrico.web.tsx`. */
const CerebroElectrico: React.FC<{ tamano: number; estado: EstadoDelCerebro }> = ({ tamano }) => (
  <Image
    source={require('../../assets/images/brain/cerebro-de-wee.webp')}
    style={{ width: tamano, height: tamano }}
    contentFit="contain"
    transition={0}
    accessible={false}
  />
);

export default CerebroElectrico;
