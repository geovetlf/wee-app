import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { crearTraductor, type Traductor } from '../../../i18n/traducir';
import { elegirIdioma } from '../../../i18n/resolver';
import { formatearFecha, formatearNumero } from '../../../i18n/formato';
import { es } from './es';
import { en } from './en';

/*
 * LA CAPA DE IDIOMA DE LA CONSOLA, sobre el traductor puro de Weë. Dos idiomas y solo dos: español (por defecto) e
 * inglés. Esto vale únicamente para la consola; la política de idiomas de la app de usuario no cambia.
 *
 *   · No hay otro traductor ni otro resolutor: se usan `crearTraductor` y `elegirIdioma` de `../../../i18n`.
 *   · El idioma por defecto es SIEMPRE el español: no se deduce del navegador. Si el administrador elige otro, esa
 *     elección manda (misma regla que en la app) y se recuerda en `localStorage` de este navegador.
 *   · No se reutiliza `i18n/preferencia.ts` porque guarda en AsyncStorage (React Native), que la consola no instala.
 *   · El almacenamiento puede fallar o no existir (ventana privada, datos bloqueados): se envuelve en try/catch y la
 *     consola funciona igual, solo que sin recordar la elección.
 *   · `<html lang>` sigue al idioma activo para que los lectores de pantalla y el navegador elijan bien la voz.
 */
export const IDIOMAS_DE_LA_CONSOLA = ['es', 'en'] as const;
export type IdiomaDeLaConsola = (typeof IDIOMAS_DE_LA_CONSOLA)[number];

export const IDIOMA_POR_DEFECTO: IdiomaDeLaConsola = 'es';
export const CLAVE_DE_IDIOMA = 'wee-admin-console.idioma';

export const DICCIONARIOS_DE_LA_CONSOLA = { es, en };

const esIdiomaDeLaConsola = (valor: unknown): valor is IdiomaDeLaConsola =>
  typeof valor === 'string' && (IDIOMAS_DE_LA_CONSOLA as readonly string[]).includes(valor);

/** El idioma que el administrador eligió la última vez, si el navegador lo conserva y es uno de los dos válidos. */
export const leerIdiomaGuardado = (): IdiomaDeLaConsola | null => {
  try {
    const guardado = window.localStorage.getItem(CLAVE_DE_IDIOMA);
    return esIdiomaDeLaConsola(guardado) ? guardado : null;
  } catch {
    return null;
  }
};

/** `false` si el navegador no deja guardar: se usa el idioma elegido en esta sesión y nada más. */
const guardarIdioma = (idioma: IdiomaDeLaConsola): boolean => {
  try {
    window.localStorage.setItem(CLAVE_DE_IDIOMA, idioma);
    return true;
  } catch {
    return false;
  }
};

export interface ContextoDeIdioma {
  t: Traductor;
  idioma: IdiomaDeLaConsola;
  locale: string;
  elegir: (idioma: IdiomaDeLaConsola) => void;
  fecha: (ms: number | undefined) => string;
  numero: (n: number | undefined) => string;
}

const Contexto = createContext<ContextoDeIdioma | null>(null);

/** `inicial` fuerza el idioma de arranque (pruebas); no se guarda hasta que alguien lo elija con el selector. */
export const ProveedorDeIdioma = ({ children, inicial }: { children: ReactNode; inicial?: IdiomaDeLaConsola }) => {
  const [elegido, setElegido] = useState<IdiomaDeLaConsola | null>(() => inicial ?? leerIdiomaGuardado());
  /* Sin elección, el «aparato» es el español a propósito: la consola no sigue el idioma del navegador. */
  const resuelto = useMemo(() => elegirIdioma(elegido, [IDIOMA_POR_DEFECTO], IDIOMAS_DE_LA_CONSOLA), [elegido]);
  const idioma = resuelto.idioma as IdiomaDeLaConsola;
  const locale = resuelto.locale;

  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);

  const elegir = useCallback((nuevo: IdiomaDeLaConsola) => {
    if (!esIdiomaDeLaConsola(nuevo)) return;
    setElegido(nuevo);
    guardarIdioma(nuevo);
  }, []);

  const t = useMemo(
    () => crearTraductor(locale, DICCIONARIOS_DE_LA_CONSOLA, { modoDesarrollo: import.meta.env.DEV }),
    [locale],
  );
  const fecha = useCallback(
    (ms: number | undefined) => (ms === undefined ? t('admin.comun.sinDato') : formatearFecha(ms, locale, { dateStyle: 'medium', timeStyle: 'short' })),
    [locale, t],
  );
  const numero = useCallback(
    (n: number | undefined) => (n === undefined ? t('admin.comun.sinDato') : formatearNumero(n, locale, { maximumFractionDigits: 4 })),
    [locale, t],
  );

  const valor = useMemo(() => ({ t, idioma, locale, elegir, fecha, numero }), [t, idioma, locale, elegir, fecha, numero]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
};

export const useIdioma = (): ContextoDeIdioma => {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useIdioma fuera de ProveedorDeIdioma');
  return valor;
};

export const useT = (): Traductor => useIdioma().t;
