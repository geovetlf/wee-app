import { Diccionario, Diccionarios } from './traducir';
import { es } from './textos/es';
import { en } from './textos/en';
import { servidor as servidorEs } from './textos/es/servidor';
import { servidor as servidorEn } from './textos/en/servidor';
import { CARPETAS, CARPETA_DE } from './cargadores';
import { cadenaDeClaves, cadenaDeRespaldo } from './resolver';

/*
 * LA CARGA DE LOS DICCIONARIOS EN LA APP (lote L2, carga perezosa).
 *
 * Antes la app importaba los 40 de golpe (`i18n/diccionarios.ts`) para pintar uno. Ahora:
 *   · el ESPAÑOL y el INGLÉS van precargados: son la base y el respaldo final, y la pantalla de error, el título de la
 *     web y un componente fuera del proveedor tienen que poder traducir sin esperar a nada;
 *   · el resto se carga BAJO DEMANDA con los cargadores generados (`i18n/cargadores.ts`), una carpeta una sola vez,
 *     y se GUARDA: volver a un idioma ya cargado no carga nada;
 *   · los alias (`pt-AO`, `de-LI`, `sr-ME`…) comparten carpeta y, por tanto, el mismo objeto.
 *
 * El registro completo (`i18n/diccionarios.ts`) sigue siendo la única lista escrita a mano y lo que usan las pruebas,
 * los scripts y el servidor; la app ya no lo importa. Nada de esto va por red de nadie: los diccionarios viajan dentro
 * de la app (en la web, como trozos del propio bundle, servidos por el mismo sitio).
 *
 * Lo que decide CUÁNDO pintar (sin parpadeo de idioma, con el idioma anterior hasta tener el nuevo, inglés si una carga
 * falla) vive en `contexts/IdiomaContext.tsx`; aquí solo se carga, se guarda y se avisa.
 */

export const PRECARGADOS: Diccionarios = {
  es: { ...es, ...servidorEs } as Diccionario,
  en: { ...en, ...servidorEn } as Diccionario,
};

/** Los IDIOMAS que tienen diccionario (cargado o por cargar). El mismo conjunto que `idiomasConDiccionario` del registro. */
export const idiomasConDiccionario = (): string[] =>
  [...new Set([...Object.keys(PRECARGADOS), ...Object.keys(CARPETA_DE)])].filter((c) => !c.includes('-'));

export interface ResultadoDeLaCarga {
  /** true si todo lo imprescindible para ese locale está cargado (o precargado). */
  listo: boolean;
  /** El error de la carga, si falló. La app cae entonces en inglés y lo reintenta la próxima vez. */
  fallo?: unknown;
}

export interface Almacen {
  /** Carga lo imprescindible para un locale (su variante y su idioma); el vecino de respaldo (D5), después y sin esperar. */
  preparar: (locale: string) => Promise<ResultadoDeLaCarga>;
  /** ¿Está ya cargado lo imprescindible? Síncrono: para no esperar a lo que ya está. */
  estaListo: (locale: string) => boolean;
  /** Los diccionarios cargados ahora mismo, con sus alias. Cambia de objeto cada vez que entra uno. */
  diccionarios: () => Diccionarios;
  /** Aviso cuando entra un diccionario (p. ej. el vecino, cargado en segundo plano). Devuelve cómo darse de baja. */
  suscribir: (aviso: () => void) => () => void;
}

/** Las carpetas que hay que cargar para un locale: imprescindibles (cadena de respaldo) y vecina (solo de claves). */
const carpetasPara = (locale: string): { imprescindibles: string[]; vecinas: string[] } => {
  const carpeta = (escalon: string) => CARPETA_DE[escalon];
  const delRespaldo = cadenaDeRespaldo(locale).map(carpeta).filter((c): c is string => !!c && !!CARPETAS[c]);
  const deClaves = cadenaDeClaves(locale).map(carpeta).filter((c): c is string => !!c && !!CARPETAS[c]);
  return { imprescindibles: [...new Set(delRespaldo)], vecinas: [...new Set(deClaves.filter((c) => !delRespaldo.includes(c)))] };
};

/**
 * Fabrica un almacén. `cargarCarpeta` es inyectable para las pruebas (cargas que fallan, que tardan, que se cuentan);
 * la app usa el de verdad, `almacen`, más abajo.
 */
export const crearAlmacen = (cargarCarpeta: (carpeta: string) => Promise<Diccionario> = (c) => CARPETAS[c]()): Almacen => {
  const enCurso = new Map<string, Promise<Diccionario>>();
  const cargadas = new Map<string, Diccionario>();
  const avisos = new Set<() => void>();
  let foto: Diccionarios = { ...PRECARGADOS };

  const rehacerFoto = () => {
    const nueva: Diccionarios = { ...PRECARGADOS };
    for (const [clave, carpeta] of Object.entries(CARPETA_DE)) {
      const d = cargadas.get(carpeta);
      if (d) nueva[clave] = d;
    }
    foto = nueva;
    avisos.forEach((a) => a());
  };

  const cargar = (carpeta: string): Promise<Diccionario> => {
    const ya = enCurso.get(carpeta);
    if (ya) return ya;
    const promesa = cargarCarpeta(carpeta).then(
      (d) => { cargadas.set(carpeta, d); rehacerFoto(); return d; },
      (e) => { enCurso.delete(carpeta); throw e; }, /* un fallo no se guarda: la próxima vez se reintenta */
    );
    enCurso.set(carpeta, promesa);
    return promesa;
  };

  return {
    preparar: async (locale) => {
      const { imprescindibles, vecinas } = carpetasPara(locale);
      try {
        await Promise.all(imprescindibles.map(cargar));
      } catch (fallo) {
        return { listo: false, fallo };
      }
      /* El vecino solo sirve para una clave que falte: no se espera, y si falla no pasa nada (queda el inglés). */
      vecinas.forEach((c) => { cargar(c).catch(() => undefined); });
      return { listo: true };
    },
    estaListo: (locale) => carpetasPara(locale).imprescindibles.every((c) => cargadas.has(c)),
    diccionarios: () => foto,
    suscribir: (aviso) => { avisos.add(aviso); return () => { avisos.delete(aviso); }; },
  };
};

/** El almacén de la app: uno solo, para que lo cargado una vez sirva a todos (proveedor, título de la web…). */
export const almacen = crearAlmacen();
