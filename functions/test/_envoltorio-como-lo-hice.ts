/*
 * ENVOLTORIO SOLO PARA PRUEBAS (`como-lo-hice.test.mjs`).
 *
 * El entorno de `_pantallas.mjs` dibuja una pantalla SIN propiedades. «Cómo lo hice» son dos componentes que sí las
 * reciben —el bloque del Wäll y la hoja de revisión—, así que este envoltorio sin propiedades los monta con las que la
 * prueba deja en `globalThis.__comoLoHice`. No es código de la app ni se importa desde ella.
 */
import React from 'react';
import HowIMadeIt from '../../components/HowIMadeIt';
import ComoLoHiceRevision from '../../components/ComoLoHiceRevision';

interface Montaje {
  componente: 'bloque' | 'revision';
  props: Record<string, unknown>;
}

const Envoltorio = () => {
  const montaje = (globalThis as unknown as { __comoLoHice: Montaje }).__comoLoHice;
  const Componente = (montaje.componente === 'revision' ? ComoLoHiceRevision : HowIMadeIt) as unknown as React.ComponentType<Record<string, unknown>>;
  return React.createElement(Componente, montaje.props);
};

export default Envoltorio;
