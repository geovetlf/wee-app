/**
 * UN ENTORNO PARA LAS SUITES DE TRAZABILIDAD DE WEË AI (`traza-weeai-*.test.mjs`, R9 · E2).
 *
 * Es un módulo, no una suite (el guion bajo lo dice). Monta una pantalla de verdad con `crearEntorno` (`_pantallas.mjs`) y
 * le añade lo que ese entorno no tiene y estas pantallas necesitan: EFECTOS. `react-dom/server` dibuja una vez y no ejecuta
 * `useEffect` ni `useFocusEffect`; la portada de Weë AI pregunta la disponibilidad en un efecto y la fila de creaciones del
 * Studio carga al enfocar. Aquí los ganchos guardan su valor por orden de llamada (como React), los efectos se ejecutan
 * DESPUÉS de dibujar con las reglas de dependencias de React (y su limpieza antes de repetirse), y `asentar()` vuelve a
 * dibujar mientras algún estado cambie. Es el mismo método de `_creatorflow-en-proceso.mjs`, que no exporta su motor.
 *
 * No es React Native ni un reconciliador: las piezas hijas son dobles sin ganchos. No prueba diseño ni teclado.
 */
import { crearEntorno, React, h } from './_pantallas.mjs';
import { crearCargador } from './filmmaker-cliente.mjs';

const iguales = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

const crearGanchos = () => {
  const huecos = [];
  let i = 0;
  let efectos = [];
  let sucio = false;
  const useState = (inicial) => {
    const k = i++;
    if (!(k in huecos)) {
      const hueco = { valor: typeof inicial === 'function' ? inicial() : inicial };
      hueco.poner = (nuevo) => {
        const siguiente = typeof nuevo === 'function' ? nuevo(hueco.valor) : nuevo;
        if (!Object.is(siguiente, hueco.valor)) { hueco.valor = siguiente; sucio = true; }
      };
      huecos[k] = hueco;
    }
    return [huecos[k].valor, huecos[k].poner];
  };
  const useRef = (inicial) => { const k = i++; if (!(k in huecos)) huecos[k] = { current: inicial }; return huecos[k]; };
  const useMemo = (fabricar, deps) => {
    const k = i++;
    const previo = huecos[k];
    if (previo && deps && iguales(previo.deps, deps)) return previo.valor;
    huecos[k] = { deps, valor: fabricar() };
    return huecos[k].valor;
  };
  const useCallback = (f, deps) => useMemo(() => f, deps);
  const useEffect = (efecto, deps) => {
    const k = i++;
    const hueco = huecos[k] ?? (huecos[k] = { montado: false, deps: undefined, limpieza: undefined });
    const toca = !hueco.montado || !deps || !iguales(hueco.deps, deps);
    hueco.deps = deps;
    hueco.montado = true;
    if (toca) efectos.push(() => { if (typeof hueco.limpieza === 'function') hueco.limpieza(); hueco.limpieza = efecto(); });
  };
  return {
    ganchos: { useState, useRef, useMemo, useCallback, useEffect },
    empezar() { i = 0; efectos = []; sucio = false; },
    terminar() { const lista = efectos; efectos = []; lista.forEach((f) => f()); return sucio; },
    get sucio() { return sucio; },
  };
};

/** El traductor de VERDAD (es/en), para saber qué debería leerse. */
const base = crearCargador({ dobles: { 'react-native': { Platform: { OS: 'android', select: (o) => o.android ?? o.default }, Dimensions: { get: () => ({ width: 390, height: 800 }) } } } });
const { crearTraductor } = base('i18n/traducir.ts');
const DICCIONARIOS = { es: base('i18n/textos/es/index.ts').es, en: base('i18n/textos/en/index.ts').en };
export const traductorDe = (idioma) => crearTraductor(idioma, DICCIONARIOS, {});
export const cargarBase = base;

/**
 * Monta una pantalla con efectos.
 *
 * @param {object} o
 * @param {string} o.pantalla                         Ruta desde la raíz del repo.
 * @param {(ctx: object, t: Function) => object} o.dobles   Los dobles propios de la pantalla.
 * @param {object} [o.params]                         `useRoute().params`.
 * @param {object|null} [o.usuario]
 * @param {'es'|'en'} [o.idioma]
 * @param {(t: Function) => void} [o.antes]
 */
export const montarConEfectos = async ({ pantalla, dobles, params = {}, usuario = { uid: 'u1' }, idioma = 'es', movil = true, antes }) => {
  const g = crearGanchos();
  const t = traductorDe(idioma);
  /* `antes(t)`: lo que hay que preparar con el traductor antes del primer dibujado (p. ej. las propiedades de un envoltorio). */
  if (typeof antes === 'function') antes(t);
  const entorno = crearEntorno({
    pantalla,
    usuario,
    movil,
    params,
    dobles: (ctx) => {
      const { navegacion } = ctx;
      const tema = { useTheme: () => ({ theme: { colors: ctx.colores } }), enTemaClaro: (C) => C };
      const habla = { useIdioma: () => ({ t, locale: idioma, formato: { numero: (v) => String(v) } }), useT: () => t };
      return {
        react: { ...React, ...g.ganchos },
        '@react-navigation/native': {
          useNavigation: () => ({
            navigate: (...a) => navegacion.push(['navigate', ...a]),
            push: (...a) => navegacion.push(['push', ...a]),
            goBack: () => navegacion.push(['goBack']),
            setParams: (...a) => navegacion.push(['setParams', ...a]),
            canGoBack: () => true,
          }),
          useRoute: () => ({ params }),
          useFocusEffect: (cb) => g.ganchos.useEffect(cb, [cb]),
        },
        '../contexts/ThemeContext': tema, '../../contexts/ThemeContext': tema,
        '../contexts/IdiomaContext': habla, '../../contexts/IdiomaContext': habla,
        '../contexts/AuthContext': { useAuth: () => ({ user: usuario, loading: false }) },
        ...dobles(ctx, t),
      };
    },
  });
  let ultimo = null;
  const dibujar = () => { g.empezar(); ultimo = entorno.dibujar(); g.terminar(); return ultimo; };
  const asentar = async () => {
    for (let ronda = 0; ronda < 40; ronda++) {
      await entorno.calma();
      if (!g.sucio) { await entorno.calma(); if (!g.sucio) return ultimo; }
      dibujar();
    }
    throw new Error('la pantalla no se asienta');
  };
  dibujar();
  await asentar();
  return {
    t, entorno, capturas: entorno.capturas, navegacion: entorno.navegacion, avisos: entorno.avisos,
    dibujar, asentar,
    get vista() { return ultimo; },
    texto: () => (ultimo ? ultimo.texto : ''),
    hayBoton: (etiqueta) => !!ultimo && ultimo.botones.some((b) => b.etiqueta === etiqueta),
    tocar: async (etiqueta) => { await entorno.tocar(etiqueta, ultimo ?? dibujar()); dibujar(); return asentar(); },
  };
};

export { h, React };
