import React from 'react';
import { View } from 'react-native';
import { OPERACIONES_DE_VERSION } from '../../utils/design3d';
import { Insignia, Pista, TituloDeBloque } from './piezas';
import { SPACING } from '../../constants/design';

/**
 * LAS VERSIONES DE LO ELEGIDO: hoy, NO DISPONIBLES. La línea de versiones es del
 * Content Core y la app no tiene un camino legítimo hasta ella (ver
 * `utils/design3d.ts`). Se dice, no se finge: ni lista inventada, ni restaurar,
 * ni derivar. Lo que sí se sabe del material (si viene de una versión anterior)
 * ya lo dice el Inspector con el dato guardado.
 */
const PanelDeVersiones: React.FC = () => (
  <View style={{ gap: SPACING.xs }}>
    <TituloDeBloque clave="designRef.verTitle" />
    {OPERACIONES_DE_VERSION.linea === 'no_disponible' ? <Insignia clave="designRef.verUnavailable" tono="aviso" /> : null}
    {OPERACIONES_DE_VERSION.restaurar === 'no_disponible' ? <Pista clave="designRef.verRestorePending" /> : null}
    {OPERACIONES_DE_VERSION.derivar === 'no_disponible' ? <Pista clave="designRef.verDeriveHint" /> : null}
  </View>
);

export default PanelDeVersiones;
