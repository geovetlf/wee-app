import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { CodigoDeIdioma, direccionDe, Idioma, idiomasDisponibles } from '../i18n/idiomas';
import { elegirIdioma, etiquetaDelTexto, IdiomaResuelto, OrigenDelIdioma } from '../i18n/resolver';
import { crearTraductor, Traductor, Valores } from '../i18n/traducir';
import { DICCIONARIOS, idiomasConDiccionario } from '../i18n/diccionarios';
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
 * POR QUÉ NO BLOQUEA EL ARRANQUE. Leer la preferencia guardada es asíncrono, y
 * había dos caminos: no pintar nada hasta tenerla, o pintar con lo que dice el
 * aparato y corregir en cuanto llegue. Se eligió lo segundo. Retrasar la app
 * entera por una lectura de unos milisegundos es peor que el parpadeo que
 * podría causar, y en la práctica la lectura termina mucho antes que la primera
 * consulta a Firestore. Quien quiera esperar tiene `cargando`.
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

  /* Y en cuanto se sabe si eligió algo, manda su elección. */
  useEffect(() => {
    let vivo = true;
    leerIdiomaElegido().then((elegido) => {
      if (!vivo) return;
      if (elegido) {
        setResuelto(elegirIdioma(elegido, localesDelAparato(), idiomasConDiccionario()));
      }
      setCargando(false);
    });
    return () => { vivo = false; };
  }, []);

  const cambiarIdioma = (codigoOLocale: string) => {
    /*
     * El estado primero y el guardado después, a propósito: la interfaz tiene
     * que cambiar en el momento del toque, no cuando el disco conteste. Y se
     * guarda el locale entero, no solo el idioma, para no perder la región.
     */
    const nuevo = elegirIdioma(codigoOLocale, localesDelAparato(), idiomasConDiccionario());
    setResuelto(nuevo);
    void guardarIdiomaElegido(codigoOLocale);
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

  const valor = useMemo<ValorDelContexto>(() => {
    const { idioma, locale, origen } = resuelto;
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
    const t = crearTraductor(locale, DICCIONARIOS, {
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
  }, [resuelto, cargando]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
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
      t: crearTraductor(locale, DICCIONARIOS),
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
