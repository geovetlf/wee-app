import { LecturaUbicacion } from '../services/locationService';

/**
 * Lo que Weë puede contar sobre dónde está alguien.
 *
 * Weë necesita saber dónde estás para serte útil, y no necesita —nunca— contárselo
 * a nadie con exactitud. Este archivo es la frontera entre esas dos cosas: entra
 * una lectura del aparato, con sus decimales, y sale algo que se puede enseñar,
 * comparar o mandar sin que nadie pueda plantarse en tu portal.
 *
 * La regla, en una frase: la lectura exacta no cruza de aquí. Cualquier función
 * futura —contenido cercano, negocios, viajes— consume lo que sale por aquí, no
 * la lectura. Si alguna vez alguien necesita la coordenada de verdad, tendrá que
 * pasar por una fase con revisión de privacidad, no por un atajo.
 *
 * Todo lo de aquí es cálculo puro: no toca el disco, no toca la red, no escribe
 * en Firestore y no depende de ninguna librería de mapas ni de geocodificación.
 */

// ─── La zona ────────────────────────────────────────────────────────────────

/**
 * El tamaño de la celda, en grados. 0,1° son unos 11 km de norte a sur; de este a
 * oeste es menos según la latitud, pero siempre del mismo orden. Es lo bastante
 * grande para que dentro quepan un barrio entero y sus vecinos, y lo bastante
 * pequeño para que "cerca de ti" signifique algo.
 */
const LADO_CELDA = 0.1;

/** Los kilómetros que abarca esa celda, para poder decirlo en voz alta. */
const RADIO_CELDA_KM = 11;

/**
 * Una zona. No es un sitio con nombre —para eso haría falta geocodificación, que
 * Weë no usa—, es un trozo de mundo lo bastante grande como para no señalar a
 * nadie. Dos personas de la misma zona están a unos kilómetros; cuáles, no se
 * sabe, y esa es justamente la idea.
 */
export interface ZonaAproximada {
  /** Identificador de la celda. Nunca es la posición: es el trozo donde cae. */
  celda: string;
  /** Cuánto abarca, en kilómetros. */
  radioKm: number;
}

/** Redondea al centro de la celda, no al borde: así la posición no se adivina por el resto. */
const aCelda = (grados: number): number => Math.round(grados / LADO_CELDA) * LADO_CELDA;

/**
 * Convierte una lectura en zona. Es una operación de un solo sentido: de la zona
 * no se puede volver a la lectura, solo saber en qué trozo de mundo cayó.
 */
export const zonaDe = (lectura: LecturaUbicacion): ZonaAproximada => ({
  celda: `${aCelda(lectura.latitude).toFixed(1)},${aCelda(lectura.longitude).toFixed(1)}`,
  radioKm: RADIO_CELDA_KM,
});

/** ¿Dos lecturas caen en el mismo trozo de mundo? Sin decir dónde está ninguna. */
export const mismaZona = (a: LecturaUbicacion, b: LecturaUbicacion): boolean => zonaDe(a).celda === zonaDe(b).celda;

// ─── Las bandas de distancia ────────────────────────────────────────────────

/**
 * Las distancias se cuentan por bandas, no en metros.
 *
 * Un número exacto —"a 340 m"— es una circunferencia; con dos o tres de esas
 * circunferencias se triangula una casa. Una banda —"a menos de 1 km"— no se
 * triangula, y para lo que la gente quiere saber ("¿está cerca?") vale igual.
 *
 * Los cortes son razonables, no definitivos: se eligieron para separar "andando",
 * "en el barrio", "en la ciudad" y "fuera". El producto puede cambiarlos.
 */
export const BANDAS = [
  { hasta: 1, id: '0-1', etiqueta: 'a menos de 1 km' },
  { hasta: 5, id: '1-5', etiqueta: 'a 1–5 km' },
  { hasta: 10, id: '5-10', etiqueta: 'a 5–10 km' },
  { hasta: 25, id: '10-25', etiqueta: 'a 10–25 km' },
  { hasta: Infinity, id: '25+', etiqueta: 'a más de 25 km' },
] as const;

export type BandaDistancia = (typeof BANDAS)[number]['id'];

export interface Distancia {
  banda: BandaDistancia;
  etiqueta: string;
}

/** Clasifica unos metros en su banda. Los metros entran; no salen. */
export const bandaDe = (metros: number): Distancia => {
  const km = Math.max(0, metros) / 1000;
  const banda = BANDAS.find((b) => km < b.hasta) ?? BANDAS[BANDAS.length - 1];
  return { banda: banda.id, etiqueta: banda.etiqueta };
};

const RADIO_TIERRA_M = 6371000;
const aRadianes = (grados: number): number => (grados * Math.PI) / 180;

/**
 * Distancia entre dos puntos sobre la esfera, en metros. Es interna a propósito:
 * lo que sale de este archivo hacia el resto de Weë es la banda, nunca el número.
 */
const metrosEntre = (a: LecturaUbicacion, b: LecturaUbicacion): number => {
  const dLat = aRadianes(b.latitude - a.latitude);
  const dLon = aRadianes(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aRadianes(a.latitude)) * Math.cos(aRadianes(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Lo lejos que está una cosa de otra, contado como lo cuenta la gente. */
export const distanciaEntre = (a: LecturaUbicacion, b: LecturaUbicacion): Distancia => bandaDe(metrosEntre(a, b));

// ─── Lo que sí se puede enseñar o mandar ────────────────────────────────────

/**
 * La forma pública de una ubicación: lo único que Weë puede enseñar, comparar o
 * —el día que haga falta y con su propia fase— mandar a algún sitio. Fíjate en lo
 * que NO tiene: ni latitude, ni longitude, ni dirección, ni radio en metros.
 */
export interface UbicacionPublica {
  zona: string;
  radioKm: number;
  precision: 'aproximada' | 'precisa';
}

/**
 * El paso de una cosa a la otra. Es la única salida: si alguna función de Weë
 * necesita hablar de dónde está alguien, habla de esto.
 */
export const aPublica = (lectura: LecturaUbicacion): UbicacionPublica => {
  const zona = zonaDe(lectura);
  return { zona: zona.celda, radioKm: zona.radioKm, precision: lectura.precision };
};

/**
 * Una lectura es aproximada si lo dice ella o si su radio es tan grande que da
 * igual lo que diga. Sirve para que una función sepa si puede fiarse del detalle
 * antes de usarlo para algo que lo necesite.
 */
export const esAproximada = (lectura: LecturaUbicacion): boolean =>
  lectura.precision === 'aproximada' || (lectura.radioMetros !== null && lectura.radioMetros > 1000);
