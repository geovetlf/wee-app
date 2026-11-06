import React from 'react';
import { Image } from 'expo-image';
import type { EstadoDelCerebro } from './SistemaDeWeeBrain';

/* El cerebro de Weë Brain: la misma imagen en la app y en la web. */
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
