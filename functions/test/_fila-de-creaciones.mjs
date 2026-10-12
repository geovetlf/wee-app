/**
 * LA FILA «MIS CREACIONES», DIBUJADA DE VERDAD EN NODE (R8, PAN, 2026-10-12).
 *
 * Es un módulo, no una suite. Carga `components/creator/FilaDeCreaciones.tsx` —el código de verdad, transpilado al vuelo por
 * `filmmaker-cliente.mjs`— con dobles de React Native que dejan en el marcado TODO lo que la pieza decide: cada estilo, cada
 * etiqueta y rol de accesibilidad, cada icono con su tamaño y su color, si algo se puede pulsar y si es un desplazamiento
 * horizontal. La dibuja con `react-dom/server`. Sirve para dos cosas:
 *
 *   · demostrar que lo que el componente compartido dibuja para Weë Studio y para la fila de siempre de Weë Design NO se movió:
 *     se compara con un marcado DORADO que se generó desde la pieza ORIGINAL (la de `c3f7f9a7`) antes de tocarla;
 *   · dejar que la suite de la pantalla de Design la use dentro de su entorno (`_pantallas.mjs`) para ver lo que una persona
 *     vería, no solo con qué propiedades la monta la pantalla.
 *
 * Los colores del tema salen como `#<nombre del color>` (`#text`, `#textSecondary`…), así que el marcado dice también QUÉ color
 * del tema usa cada texto, no solo que usa uno.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { crearCargador, RAIZ } from './filmmaker-cliente.mjs';

const requerir = createRequire(path.resolve(RAIZ, 'package.json'));
export const React = requerir('react');
const { renderToStaticMarkup } = requerir('react-dom/server');
export const h = React.createElement;

/** Un estilo de React Native (objeto, o lista anidada de objetos) como un solo objeto. */
const aplanar = (s) => (Array.isArray(s) ? Object.assign({}, ...s.map(aplanar)) : s && typeof s === 'object' ? s : {});
const estilo = (s) => { const plano = aplanar(s); return Object.keys(plano).length ? JSON.stringify(plano) : undefined; };

/** Los colores del tema, como su propio nombre: `theme.colors.text` → `#text`. */
export const coloresConNombre = () => new Proxy({}, { get: (_, k) => (typeof k === 'string' ? `#${k}` : undefined) });

/** React Native, con el marcado que hace falta para comparar una pieza entera. */
export const nativoConMarcado = (so = 'android') => ({
  View: ({ children, style, accessibilityRole, accessibilityLabel, accessibilityLiveRegion }) => h('div', {
    'data-estilo': estilo(style), role: accessibilityRole, 'aria-label': accessibilityLabel, 'aria-live': accessibilityLiveRegion,
  }, children),
  Text: ({ children, style, numberOfLines, accessibilityRole }) => h('span', { 'data-estilo': estilo(style), 'data-lineas': numberOfLines, role: accessibilityRole }, children),
  TouchableOpacity: ({ children, style, onPress, accessibilityRole, accessibilityLabel, hitSlop, activeOpacity, disabled }) => h('button', {
    'data-estilo': estilo(style), 'data-pulsable': typeof onPress === 'function' ? 'si' : 'no', 'data-opacidad': activeOpacity,
    'data-hitslop': hitSlop ? JSON.stringify(hitSlop) : undefined, role: accessibilityRole, 'aria-label': accessibilityLabel, disabled: !!disabled,
  }, children),
  ScrollView: ({ children, horizontal, showsHorizontalScrollIndicator, contentContainerStyle }) => h('div', {
    'data-desplazamiento': horizontal ? 'horizontal' : 'vertical', 'data-barra': String(showsHorizontalScrollIndicator), 'data-estilo': estilo(contentContainerStyle),
  }, children),
  ActivityIndicator: ({ color, size }) => h('progress', { 'data-color': color, 'data-tam': size }),
  StyleSheet: { create: (s) => s, flatten: aplanar, hairlineWidth: 1, absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } },
  Platform: { OS: so, select: (o) => o[so] ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 800 }), addEventListener: () => ({ remove() {} }) },
});

/** Los iconos y la imagen: lo que pintan, con su tamaño y su color (y la imagen con cómo se recorta). */
export const iconosYMiniaturas = () => ({
  '@expo/vector-icons': { Ionicons: ({ name, size, color }) => h('i', { 'data-icono': name, 'data-tam': size, 'data-color': color }) },
  'expo-image': { Image: ({ source, style, contentFit, cachePolicy, recyclingKey, transition }) => h('img', {
    src: source && source.uri, 'data-estilo': estilo(style), 'data-recorte': contentFit, 'data-cache': cachePolicy, 'data-reciclaje': recyclingKey, 'data-transicion': transition,
  }) },
});

/**
 * La fila de verdad, lista para dibujar.
 * @param {object} o
 * @param {(clave: string, valores?: object) => string} o.t            El traductor (el de verdad, de un idioma).
 * @param {object} [o.colores]                                          Los colores del tema (por defecto, cada uno con su nombre).
 * @param {object} [o.nativo]                                           React Native: por defecto el que deja todo en el marcado.
 * @param {string} [o.pieza]                                            Qué archivo cargar (por defecto la fila común).
 */
export const crearFila = ({ t, colores = coloresConNombre(), nativo = nativoConMarcado(), pieza = 'components/creator/FilaDeCreaciones.tsx' }) => {
  const tema = { useTheme: () => ({ theme: { colors: colores } }) };
  const habla = { useT: () => t };
  const cargar = crearCargador({
    dobles: {
      'react-native': nativo,
      'react': React,
      ...iconosYMiniaturas(),
      '../../contexts/ThemeContext': tema,
      '../../contexts/IdiomaContext': habla,
    },
  });
  const Fila = cargar(pieza).default;
  return { Fila, dibujar: (props) => renderToStaticMarkup(h(Fila, props)) };
};
