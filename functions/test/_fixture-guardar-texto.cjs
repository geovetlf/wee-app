/*
 * Un envoltorio para dibujar `components/creator/GuardarTextoFinal.tsx` con `montarConEfectos` (que dibuja una pantalla
 * sin propiedades): las propiedades se leen de `globalThis.__propsGuardarTexto`. Solo lo usa `traza-weeai-texto-final`.
 * CommonJS a propósito: el cargador de las pruebas lo ejecuta tal cual.
 */
const React = require('react');
const GuardarTextoFinal = require('../../components/creator/GuardarTextoFinal').default;

exports.default = function Envoltorio() {
  return React.createElement(GuardarTextoFinal, globalThis.__propsGuardarTexto);
};
