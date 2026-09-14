import { cadenaDeRespaldo } from './resolver';
import { formatearNumero } from './formato';

/*
 * EL TRADUCTOR. Entra una clave, sale un texto.
 *
 * Puro y sin dependencias: ni React, ni almacenamiento, ni red. Se le dan el
 * locale y los diccionarios y devuelve una función `t`. Los componentes no ven
 * nada de esto: solo llaman a `t('settings.title')`.
 *
 * TRES DECISIONES QUE MERECEN EXPLICACIÓN:
 *
 * 1 · EL RESPALDO ES POR CLAVE, NO POR IDIOMA.
 *     No basta con "si no hay francés, usa inglés". Cuando llegue el francés
 *     llegará incompleto —siempre llegan incompletos— y la pantalla no puede
 *     romperse por una línea que falta. Cada clave recorre su propia cadena:
 *     fr-FR → fr → en. La primera que la tenga, gana.
 *
 * 2 · LOS PLURALES LOS DECIDE `Intl.PluralRules`, NO UN `if`.
 *     El inglés tiene dos formas, el español dos, el ruso tres y el árabe seis.
 *     Escribir eso a mano es garantizar que el ruso salga mal. `Intl` ya sabe
 *     las reglas de todos los idiomas del mundo y viene en el motor.
 *
 * 3 · LOS NÚMEROS LOS ESCRIBE `Intl.NumberFormat`, NO `String()`.
 *     Doce mil cuatrocientos es "12.400" en España, "12,400" en Perú y en
 *     Estados Unidos, y "12 400" en Francia. El traductor ya sabe el locale, así
 *     que rellena el hueco con el número bien escrito y ninguna pantalla tiene
 *     que acordarse. Ojo: esto es OTRA COSA que el plural —ver el punto 2—.
 *
 * 4 · UNA CLAVE NUNCA SE LE ENSEÑA A NADIE.
 *     Si una clave no está en ningún diccionario es un fallo del programa, no
 *     del usuario. En desarrollo se ve la clave, para que salte a la vista. En
 *     producción se enseña el último tramo legible, nunca `settings.language`.
 */

/** Un diccionario: objetos anidados que acaban en texto. */
export interface Diccionario {
  [clave: string]: string | Diccionario;
}

/** Los diccionarios por código: 'es', 'en', y el día de mañana 'es-PE'. */
export type Diccionarios = Record<string, Diccionario | undefined>;

/** Lo que se le puede meter a un texto: {{nombre}} y el contador del plural. */
export type Valores = Record<string, string | number>;

export interface OpcionesDelTraductor {
  /**
   * En desarrollo, una clave que falta se enseña tal cual y se avisa por
   * consola. En producción no: se degrada a algo legible y se calla.
   */
  modoDesarrollo?: boolean;
  /** Para que las pruebas puedan mirar qué faltó sin ensuciar la consola. */
  alFaltarUnaClave?: (clave: string, locale: string) => void;
}

export type Traductor = (clave: string, valores?: Valores) => string;

/** Baja por 'settings.idioma.titulo' dentro de un diccionario. */
const buscar = (diccionario: Diccionario | undefined, clave: string): string | undefined => {
  if (!diccionario) return undefined;
  let nodo: string | Diccionario | undefined = diccionario;
  for (const tramo of clave.split('.')) {
    if (typeof nodo !== 'object' || nodo === null) return undefined;
    nodo = (nodo as Diccionario)[tramo];
  }
  return typeof nodo === 'string' ? nodo : undefined;
};

/*
 * La categoría de plural que toca, según el idioma y el número. `Intl` la sabe;
 * si el motor no trajera `PluralRules` —no debería pasar— se cae a la regla
 * inglesa, que es la menos mala de las simples.
 */
const categoriaDePlural = (locale: string, cantidad: number): string => {
  try {
    return new Intl.PluralRules(locale).select(cantidad);
  } catch {
    return cantidad === 1 ? 'one' : 'other';
  }
};

/*
 * LOS HUECOS QUE LLEVAN UN NÚMERO PERO NO UNA CANTIDAD.
 *
 * Un año es un número y no se cuenta: 2026 se escribe 2026 en todas partes, y
 * "2.026" sería un error. La lista es CERRADA y corta a propósito —todo lo
 * demás: votos, miembros, Credits, segundos, porcentajes, caracteres, sí son
 * cantidades— y quien añada un hueco nuevo con un año tiene que venir aquí.
 */
const NO_SON_CANTIDADES = ['anio', 'year'];

/**
 * Mete los valores en el texto: 'Hola, {{nombre}}' + {nombre:'Ana'}.
 *
 * Un número entra escrito para ese locale; lo que ya llega como texto se pone
 * tal cual, que es como se cuelan sin tocar los nombres, las marcas y lo que
 * diga el servidor.
 */
const rellenar = (texto: string, locale: string, valores?: Valores): string => {
  if (!valores) return texto;
  return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (entero, nombre) => {
    const valor = valores[nombre];
    if (valor === undefined || valor === null) return entero;
    if (typeof valor === 'number' && !NO_SON_CANTIDADES.includes(nombre)) {
      return formatearNumero(valor, locale);
    }
    return String(valor);
  });
};

/**
 * Lo que se enseña cuando una clave no está en NINGÚN diccionario.
 *
 * 'settings.selectLanguage' → 'Select language'. No es una traducción y no
 * pretende serlo: es que un hueco legible molesta menos que un punto y una
 * palabra en minúsculas en medio de una pantalla.
 */
export const textoDeEmergencia = (clave: string): string => {
  const ultimo = clave.split('.').pop() || clave;
  const conEspacios = ultimo.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1);
};

/**
 * Fabrica el `t` de un locale.
 *
 * @param locale       'es-PE', 'en'… De aquí sale la cadena de respaldo y la
 *                     regla de plurales.
 * @param diccionarios todos los que haya cargados, por código.
 */
export const crearTraductor = (
  locale: string,
  diccionarios: Diccionarios,
  opciones: OpcionesDelTraductor = {},
): Traductor => {
  const cadena = cadenaDeRespaldo(locale);

  return (clave: string, valores?: Valores): string => {
    if (!clave) return '';

    /*
     * Con un número delante, la clave se convierte en varias: primero la de su
     * categoría, después la genérica. Así `weels.contador_one` y
     * `weels.contador_other` conviven, y en ruso se pueden añadir `_few` y
     * `_many` sin tocar ni una línea de código.
     */
    const cantidad = valores && typeof valores.contador === 'number' ? valores.contador : undefined;
    const candidatas = cantidad === undefined
      ? [clave]
      : [`${clave}_${categoriaDePlural(locale, cantidad)}`, `${clave}_other`, clave];

    for (const escalon of cadena) {
      for (const candidata of candidatas) {
        const texto = buscar(diccionarios[escalon], candidata);
        if (texto !== undefined) return rellenar(texto, locale, valores);
      }
    }

    opciones.alFaltarUnaClave?.(clave, locale);
    if (opciones.modoDesarrollo) {
      console.warn(`[i18n] falta la clave "${clave}" (${locale})`);
      return clave;
    }
    return textoDeEmergencia(clave);
  };
};
