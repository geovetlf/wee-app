import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { CodigoDeIdioma, direccionDe, Idioma, idiomasDisponibles } from '../i18n/idiomas';
import { elegirIdioma, etiquetaDelTexto, IdiomaResuelto, OrigenDelIdioma } from '../i18n/resolver';
import { crearTraductor, Traductor, Valores } from '../i18n/traducir';
import { almacen, idiomasConDiccionario } from '../i18n/carga';
import { localesDelAparato } from '../i18n/aparato';
import { guardarIdiomaElegido, leerIdiomaElegido } from '../i18n/preferencia';
import { recordarLocale } from '../i18n/emergencia';
import * as formato from '../i18n/formato';

/*
 * LA ÚNICA FUENTE DE VERDAD DEL IDIOMA.
 *
 * Ninguna pantalla lee un diccionario, ninguna decide qué idioma toca y ninguna
 * sabe que existe AsyncStorage. Todas piden `t('settings.title')` y ya está.
 * Todo lo de debajo —resolver, respaldar, guardar, formatear— pasa por aquí.
 *
 * EL PRIMER PINTADO ESPERA A SU IDIOMA (lote L2, 2026-11-03). Antes se pintaba
 * con lo que decía el aparato y se corregía al leer la preferencia guardada,
 * con un posible parpadeo. Con la carga perezosa el diccionario elegido puede
 * no estar todavía, y pintar mientras tanto en otra lengua es justo lo que el
 * dueño pidió evitar: así que el árbol se monta cuando se sabe el idioma y su
 * diccionario está cargado. La espera tiene tope (`TOPE_DE_LA_ESPERA`): si la
 * preferencia o la carga no llegan, se sigue con el aparato o con el inglés,
 * completos, nunca con una pantalla en blanco para siempre.
 *
 * CAMBIAR DE IDIOMA NO DESMONTA NADA: se sigue viendo el idioma anterior hasta
 * que el nuevo está cargado, y entonces cambia de una vez. La pantalla, la
 * sesión y lo escrito siguen donde estaban. Si la carga falla, la interfaz pasa
 * al inglés (completo, precargado) y se reintenta la próxima vez.
 *
 * LO QUE ESTE CONTEXTO NO HACE, dicho aquí para que nadie lo añada después:
 * no mira la ubicación. Ni el GPS, ni la IP, ni el país de la SIM, ni la zona
 * horaria. La ubicación física de una persona vive en `LocationContext` y no
 * tiene ninguna línea que llegue hasta aquí. Alguien con Weë en inglés que
 * aterriza en Tokio sigue teniendo Weë en inglés.
 */

interface ValorDelContexto {
  /** Traducir. Lo único que usa el 99 % de los componentes. */
  t: Traductor;
  /** El idioma de la interfaz: 'es', 'en'. */
  idioma: CodigoDeIdioma;
  /** El locale de los FORMATOS: 'es-PE'. No tiene por qué ser el mismo. */
  locale: string;
  /** De dónde salió: lo eligió la persona, lo pidió el aparato, o es el respaldo. */
  origen: OrigenDelIdioma;
  /** 'rtl' para árabe y hebreo. Lo que necesita quien monte layouts. */
  direccion: 'ltr' | 'rtl';
  /** Los idiomas que se pueden elegir hoy. */
  disponibles: Idioma[];
  /** Cambiar de idioma. Guarda y repinta; no reinicia, no cierra sesión. */
  cambiarIdioma: (codigoOLocale: string) => void;
  /** true mientras se lee la preferencia guardada del primer arranque. */
  cargando: boolean;
  /** Los formatos regionales, ya atados al locale de arriba. */
  formato: {
    numero: (valor: number, opciones?: Intl.NumberFormatOptions) => string;
    moneda: (valor: number, moneda: string, opciones?: Intl.NumberFormatOptions) => string;
    porcentaje: (valor: number, opciones?: Intl.NumberFormatOptions) => string;
    fecha: (fecha: Date | number, opciones?: Intl.DateTimeFormatOptions) => string;
    hora: (fecha: Date | number, opciones?: Intl.DateTimeFormatOptions) => string;
    tiempoRelativo: (fecha: Date | number, ahora?: Date | number) => string;
    lista: (cosas: readonly string[], tipo?: 'conjunction' | 'disjunction') => string;
    distancia: (metros: number) => string;
  };
}

const Contexto = createContext<ValorDelContexto | undefined>(undefined);

/*
 * LA PRUEBA DE RTL, CONTROLADA (migración de la demo YC, 2026-11-03).
 *
 * El árabe ya tiene diccionario y se puede elegir en el selector (integración del proyecto i18n global, 2026-11-05).
 * Este modo sigue sirviendo para revisar de un vistazo que la interfaz se lee de derecha a izquierda sin tocar la
 * preferencia guardada: en DESARROLLO y solo si se arranca con `EXPO_PUBLIC_PRUEBA_RTL=ar`, la app usa el locale `ar`
 * real —su diccionario, números, fechas y dirección—, que se carga antes del primer pintado. En una build de producción
 * `__DEV__` es falso y esto no existe: no cambia la elección de nadie ni se guarda en ningún sitio.
 */
const PRUEBA_RTL = typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_PRUEBA_RTL === 'ar';

/** Lo más que se espera, en el primer arranque, a la preferencia guardada y al diccionario. */
const TOPE_DE_LA_ESPERA = 4000;
const conTope = <T,>(promesa: Promise<T>, siNoLlega: T): Promise<T> =>
  Promise.race([promesa, new Promise<T>((r) => setTimeout(() => r(siNoLlega), TOPE_DE_LA_ESPERA))]);

/** Si un diccionario no se pudo cargar: la interfaz en inglés (precargado), con los formatos que se pidieron. */
const enIngles = (r: IdiomaResuelto): IdiomaResuelto => ({ idioma: 'en' as CodigoDeIdioma, locale: r.locale, origen: 'reserva' });

/** Lo que se resuelve antes de saber si hay algo guardado. */
const resolverConElAparato = (): IdiomaResuelto =>
  elegirIdioma(null, localesDelAparato(), idiomasConDiccionario());

export const IdiomaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /*
   * El primer valor sale del aparato, en el mismo tirón de render. Así quien
   * abre Weë por primera vez la ve ya en su idioma, sin pasar por inglés.
   */
  const [resuelto, setResuelto] = useState<IdiomaResuelto>(resolverConElAparato);
  const [cargando, setCargando] = useState(true);
  /* Sube cada vez que entra un diccionario (p. ej. el vecino de respaldo, que llega en segundo plano). */
  const [version, setVersion] = useState(0);
  /* Solo cuenta la ÚLTIMA petición: si alguien cambia de idioma dos veces seguidas, gana la segunda. */
  const peticion = useRef(0);

  useEffect(() => almacen.suscribir(() => setVersion((v) => v + 1)), []);

  /* Primer arranque: la elección guardada (si la hay) manda, y no se pinta hasta tener su diccionario. */
  useEffect(() => {
    let vivo = true;
    const mia = ++peticion.current;
    (async () => {
      const elegido = await conTope(leerIdiomaElegido(), null);
      const objetivo = elegido ? elegirIdioma(elegido, localesDelAparato(), idiomasConDiccionario()) : resolverConElAparato();
      const carga = await conTope(almacen.preparar(objetivo.locale), { listo: false, fallo: 'tope' });
      /* El modo de prueba RTL pinta en árabe: su diccionario tiene que estar antes del primer pintado. */
      if (PRUEBA_RTL) await conTope(almacen.preparar('ar'), { listo: false, fallo: 'tope' });
      if (!vivo || mia !== peticion.current) return;
      setResuelto(carga.listo ? objetivo : enIngles(objetivo));
      setCargando(false);
    })();
    return () => { vivo = false; };
  }, []);

  const cambiarIdioma = (codigoOLocale: string) => {
    /*
     * Se guarda en el momento del toque —el locale entero, no solo el idioma,
     * para no perder la región— y la interfaz cambia cuando su diccionario está
     * (al instante si ya estaba cargado). Hasta entonces se ve el idioma de antes,
     * entero: nunca una mezcla ni un parpadeo en otra lengua.
     */
    const nuevo = elegirIdioma(codigoOLocale, localesDelAparato(), idiomasConDiccionario());
    void guardarIdiomaElegido(codigoOLocale);
    const mia = ++peticion.current;
    if (almacen.estaListo(nuevo.locale)) { setResuelto(nuevo); return; }
    void almacen.preparar(nuevo.locale).then((carga) => {
      if (mia !== peticion.current) return;
      setResuelto(carga.listo ? nuevo : enIngles(nuevo));
    });
  };

  /*
   * LA LENGUA DE LA PÁGINA, EN LA WEB.
   *
   * El `<html lang>` lo escribe la plantilla al servir la página y no sabe nada
   * de quien la abre: sin esto, Weë en japonés se anunciaba como inglés. Los
   * lectores de pantalla lo usan para elegir la voz, y el navegador para elegir
   * los glifos, así que se reescribe cada vez que cambia la lengua del texto.
   */
  const etiqueta = etiquetaDelTexto(resuelto.idioma, resuelto.locale);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.lang = etiqueta;
  }, [etiqueta]);

  /*
   * EL SENTIDO DE LA PÁGINA, EN LA WEB. React Native Web resuelve `start`/`end` y el orden de las filas con el `dir`
   * del documento: sin esto, un idioma RTL dejaría la interfaz de izquierda a derecha. Con los idiomas de hoy es `ltr`.
   */
  const sentido = PRUEBA_RTL ? 'rtl' : direccionDe(resuelto.idioma);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.dir = sentido;
  }, [sentido]);

  const valor = useMemo<ValorDelContexto>(() => {
    const { idioma, locale, origen } = PRUEBA_RTL ? { ...resuelto, idioma: 'ar' as const, locale: 'ar' } : resuelto;
    /*
     * Se le deja dicho a la pantalla de error en qué lengua está la interfaz.
     * Vive por fuera de este proveedor —tiene que sobrevivir a que reviente— y
     * no puede preguntar por contexto, así que se le avisa desde aquí.
     *
     * La lengua del TEXTO, no el locale: con la interfaz en inglés y el aparato
     * en `ja-JP`, el locale es japonés y el error tiene que salir en inglés. Y
     * con la variante resuelta: un `zh-Hant-TW` es tradicional, no `zh`.
     */
    recordarLocale(etiqueta);
    const t = crearTraductor(locale, almacen.diccionarios(), {
      modoDesarrollo: typeof __DEV__ !== 'undefined' && __DEV__,
    });
    return {
      t,
      idioma,
      locale,
      origen,
      direccion: direccionDe(idioma),
      disponibles: idiomasDisponibles(),
      cambiarIdioma,
      cargando,
      formato: {
        numero: (v, o) => formato.formatearNumero(v, locale, o),
        moneda: (v, m, o) => formato.formatearMoneda(v, locale, m, o),
        porcentaje: (v, o) => formato.formatearPorcentaje(v, locale, o),
        fecha: (f, o) => formato.formatearFecha(f, locale, o),
        hora: (f, o) => formato.formatearHora(f, locale, o),
        tiempoRelativo: (f, a) => formato.formatearTiempoRelativo(f, locale, a),
        lista: (c, tipo) => formato.formatearLista(c, locale, tipo),
        distancia: (m) => formato.formatearDistancia(m, locale),
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resuelto, cargando, version]);

  /* Hasta saber el idioma y tener su diccionario no se monta el árbol: ni un fotograma en otra lengua (L2). */
  return <Contexto.Provider value={valor}>{cargando ? null : children}</Contexto.Provider>;
};

/**
 * Todo lo del idioma: el traductor, el locale, los formatos y el cambio.
 *
 * Fuera del proveedor devuelve un valor que funciona igual, resuelto con lo que
 * diga el aparato. Un componente suelto en una prueba o en una pantalla que
 * todavía no cuelga del árbol no se cae por esto.
 */
export const useIdioma = (): ValorDelContexto => {
  const delArbol = useContext(Contexto);
  const deEmergencia = useMemo<ValorDelContexto>(() => {
    const { idioma, locale, origen } = resolverConElAparato();
    return {
      t: crearTraductor(locale, almacen.diccionarios()),
      idioma, locale, origen,
      direccion: direccionDe(idioma),
      disponibles: idiomasDisponibles(),
      cambiarIdioma: () => undefined,
      cargando: false,
      formato: {
        numero: (v, o) => formato.formatearNumero(v, locale, o),
        moneda: (v, m, o) => formato.formatearMoneda(v, locale, m, o),
        porcentaje: (v, o) => formato.formatearPorcentaje(v, locale, o),
        fecha: (f, o) => formato.formatearFecha(f, locale, o),
        hora: (f, o) => formato.formatearHora(f, locale, o),
        tiempoRelativo: (f, a) => formato.formatearTiempoRelativo(f, locale, a),
        lista: (c, tipo) => formato.formatearLista(c, locale, tipo),
        distancia: (m) => formato.formatearDistancia(m, locale),
      },
    };
  }, []);
  return delArbol ?? deEmergencia;
};

/** El atajo para lo único que necesita casi todo el mundo: `const t = useT();` */
export const useT = (): Traductor => useIdioma().t;

export type { Valores };
