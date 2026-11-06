import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useDireccion } from '../hooks/useDireccion';

/**
 * UN ICONO QUE SEÑALA UN SENTIDO — la quinta regla de `useDireccion`, en un solo sitio.
 *
 * Una flecha de volver o un cheurón de «siguiente» señalan hacia dónde se lee: en
 * árabe, volver es hacia la derecha. En vez de repetir `style={dir.espejo}` en cada
 * pantalla (y olvidarlo en la siguiente), las flechas pasan por aquí: es un
 * `Ionicons` normal que se refleja SOLO si el nombre es direccional y SOLO en RTL.
 * En LTR no añade nada: el icono es exactamente el mismo que antes.
 *
 * Sirve también para nombres dinámicos (`name={icono}`): un icono que no señala
 * (un corazón, una bandera, un visto, `chevron-down`) pasa intacto.
 *
 * Señalan (se reflejan en RTL): flechas, cheurones y triángulos hacia atrás o
 * adelante; `send` (el avión horizontal de enviar); `arrow-undo` / `arrow-redo`
 * (responder, deshacer, compartir hacia delante); `log-in` / `log-out`, `enter` /
 * `exit` y `return-*-back|forward`. NO señalan y no se tocan nunca: la
 * reproducción (`play-forward`, `play-skip-*`: el tiempo de un medio no cambia de
 * sentido), lo vertical (`chevron-up/down`, `arrow-up/down`, subir, descargar),
 * lo circular (`refresh`, `repeat`, `sync`), lo simétrico (`swap-horizontal`) y
 * los pictogramas de orientación fija (`paper-plane`, `share-*`, `navigate`,
 * `trending-*`). La lista explícita la fija `functions/test/rtl-flechas.test.mjs`.
 */
const DIRECCIONAL = /^(?:(?:arrow|chevron|caret)-(?:back|forward|left|right)(?:-circle)?|send|arrow-(?:undo|redo)(?:-circle)?|log-(?:in|out)|enter|exit|return-(?:up|down)-(?:back|forward))(?:-outline|-sharp)?$/;

export const esIconoDireccional = (nombre: unknown): boolean => typeof nombre === 'string' && DIRECCIONAL.test(nombre);

type Props = React.ComponentProps<typeof Ionicons>;

const IconoDireccional: React.FC<Props> = ({ style, ...resto }) => {
  const dir = useDireccion();
  const reflejar = dir.esRTL && esIconoDireccional(resto.name);
  return <Ionicons {...resto} style={reflejar ? [dir.espejo, style] : style} />;
};

export default IconoDireccional;
