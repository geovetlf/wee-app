/**
 * EL CATÁLOGO DE ELEMENTOS DE WEË (maqueta): personajes, escenarios, ropa y voces que vienen por defecto.
 *
 * SOLO DATOS DE MUESTRA, TODOS `ejemplo: true`: ningún activo real existe todavía. Las imágenes son rellenos de degradado hasta que
 * haya activos producidos y con derechos revisados (ver «Pendiente de integración» en el informe). Este módulo guarda IDS y CLAVES de
 * i18n, nunca frases (patrón de `constants/specialists.ts`): quien pinta traduce con `t('weeai.' + clave)`. Los ids son estables y no se
 * traducen ni cambian. Los nombres son de UNA palabra. Sin marcas, sin famosos y sin personas reales; los 16 nombres propios de
 * personajes son inventados. El orden es el del catálogo y lo que elige la persona (favoritos), nunca la ubicación.
 */

export type TipoDeElemento = 'galeria' | 'personaje' | 'escenario' | 'ropa' | 'voz';

export interface EntradaDeCatalogo {
  /** Estable: viaja en lo guardado (favoritos) y no se traduce. */
  id: string;
  /** Clave de i18n con el nombre (una palabra). Vacía si el nombre es propio (`nombrePropio`). */
  clave: string;
  /** Nombre propio inventado (personajes con nombre): no se traduce. */
  nombrePropio?: string;
  tipo: Exclude<TipoDeElemento, 'galeria' | 'voz'>;
  categoria: string;
  /** Aparece en «Novedades». */
  novedad?: boolean;
  ejemplo: true;
  gradiente: [string, string];
}

/** Rellenos calmados, con la escala de grises cálidos y fríos de WeëAI: no son imágenes, son huecos para ellas. */
const RELLENOS: [string, string][] = [
  ['#CBD5E1', '#64748B'], ['#E7E5E4', '#78716C'], ['#D4D4D8', '#52525B'], ['#E2E8F0', '#475569'], ['#D6D3D1', '#57534E'],
  ['#E4E4E7', '#71717A'], ['#CFD8DC', '#546E7A'], ['#E0E7FF', '#6366F1'], ['#FCE7F3', '#BE185D'], ['#DCFCE7', '#15803D'],
];
const relleno = (i: number): [string, string] => RELLENOS[i % RELLENOS.length];

/** Claves de i18n que ya existen en otros módulos: se reutilizan en vez de duplicar la misma palabra (la misma frase se dice igual en toda la app). */
const REUTILIZADAS: Record<string, string> = {
  sc_bosque: 'weetalk.themeForest', sc_playa: 'weeai.oBeach', sc_nieve: 'filmmaker.weatherSnow', sc_lluvia: 'filmmaker.weatherRain', cl_elegante: 'fashion.optElegant', cl_trabajo: 'fashion.optWork',
};
/** Nombres propios inventados de los personajes: son contenido de muestra, no interfaz; valen igual en todos los idiomas. */
const PROPIOS: Record<string, string> = { luna: 'Luna', kai: 'Kai', aria: 'Aria', noa: 'Noa', sol: 'Sol', iris: 'Iris', teo: 'Teo', mila: 'Mila', zuri: 'Zuri', ravi: 'Ravi', yuki: 'Yuki', omar: 'Omar', nora: 'Nora', leo: 'Leo', amara: 'Amara', jin: 'Jin' };

const hacer = (prefijo: string, tipo: EntradaDeCatalogo['tipo'], filas: [string, string, boolean?][]): EntradaDeCatalogo[] =>
  filas.map(([nombre, categoria, novedad], i) => {
    const k = `${prefijo.slice(0, 2)}_${nombre}`;
    const propio = prefijo === 'ch' && !!PROPIOS[nombre];
    return { id: `${prefijo}-${nombre}`, clave: propio ? '' : REUTILIZADAS[k] ?? `weeai.${k}`, nombrePropio: propio ? PROPIOS[nombre] : undefined, tipo, categoria, novedad: !!novedad, ejemplo: true, gradiente: relleno(i) };
  });

/** Las ocasiones de la ropa, en su orden, con la clave de su filtro. */
export const OCASIONES_DE_ROPA: { id: string; clave: string }[] = [
  { id: 'casual', clave: 'fashion.optCasual' }, { id: 'formal', clave: 'fashion.optFormal' }, { id: 'deporte', clave: 'weeai.oSport' }, { id: 'urbano', clave: 'fashion.optUrban' },
  { id: 'fiesta', clave: 'fashion.optParty' }, { id: 'playa', clave: 'weeai.oBeach' }, { id: 'invierno', clave: 'weeai.oWinter' }, { id: 'fantasia', clave: 'weeai.oFantasy' },
];

/** 24 personajes: 16 con nombre propio inventado (personas estilizadas, de todas las edades y culturas) y 8 arquetipos. */
export const PERSONAJES_DE_WEE: EntradaDeCatalogo[] = hacer('ch', 'personaje', [
  ['luna', 'persona'], ['kai', 'persona'], ['aria', 'persona', true], ['noa', 'persona'], ['sol', 'persona'], ['iris', 'persona'],
  ['teo', 'persona', true], ['mila', 'persona'], ['zuri', 'persona'], ['ravi', 'persona'], ['yuki', 'persona'], ['omar', 'persona'],
  ['nora', 'persona'], ['leo', 'persona'], ['amara', 'persona', true], ['jin', 'persona'],
  ['mago', 'fantasia'], ['robot', 'ficcion', true], ['dragon', 'criatura'], ['hada', 'fantasia'], ['astronauta', 'profesion'],
  ['gato', 'mascota'], ['perro', 'mascota'], ['zorro', 'criatura'],
]);

/** 20 escenarios: naturaleza, ciudad, interiores, fantasía y futuro, espacio y estudio. */
export const ESCENARIOS_DE_WEE: EntradaDeCatalogo[] = hacer('sc', 'escenario', [
  ['selva', 'naturaleza'], ['playa', 'naturaleza', true], ['desierto', 'naturaleza'], ['nieve', 'naturaleza'], ['montana', 'naturaleza'], ['bosque', 'naturaleza'],
  ['neon', 'ciudad', true], ['lluvia', 'ciudad'], ['cafe', 'interior'], ['plato', 'interior'], ['oficina', 'interior'], ['cocina', 'interior'],
  ['dormitorio', 'interior'], ['zen', 'interior'], ['laboratorio', 'otros'], ['lunar', 'otros'], ['nave', 'otros', true], ['concierto', 'otros'], ['aula', 'interior'], ['jardin', 'naturaleza'],
]);

/** 18 estilos de ropa; los ocho primeros comparten su nombre con la ocasión (filtro). El probador de Moda lee este mismo catálogo. */
export const ROPA_DE_WEE: EntradaDeCatalogo[] = (() => {
  const base = hacer('cl', 'ropa', [
    ['elegante', 'formal'], ['vintage', 'casual'], ['gala', 'fiesta', true], ['trabajo', 'formal'], ['festival', 'fiesta'], ['espacial', 'fantasia', true],
    ['retro', 'urbano'], ['minimal', 'casual'], ['rustico', 'invierno'], ['nocturno', 'fiesta'],
  ]);
  /* Las ocho ocasiones se llaman como su filtro: la clave es la del filtro, sin duplicar el texto. */
  const ocasiones: [string, string][] = OCASIONES_DE_ROPA.map((o) => [o.id, o.clave]);
  const propias: EntradaDeCatalogo[] = ocasiones.map(([cat, clave], i) => ({ id: `cl-${cat}`, clave, tipo: 'ropa', categoria: cat, novedad: false, ejemplo: true, gradiente: relleno(i + 3) }));
  return [...propias, ...base];
})();


export const FILTROS_DE_ESCENARIO: { id: string; clave: string }[] = [
  { id: 'naturaleza', clave: 'travel.catNature' }, { id: 'ciudad', clave: 'weeai.fCity' }, { id: 'interior', clave: 'design.kindInterior' },
];

export interface VozDeMuestra {
  id: string;
  /** Nombre propio inventado: no se traduce. */
  nombre: string;
  genero: 'f' | 'm';
  ejemplo: true;
  gradiente: [string, string];
}
export const VOCES_DE_WEE: VozDeMuestra[] = [
  { id: 'vz-alba', nombre: 'Alba', genero: 'f', ejemplo: true, gradiente: relleno(0) },
  { id: 'vz-bruno', nombre: 'Bruno', genero: 'm', ejemplo: true, gradiente: relleno(1) },
  { id: 'vz-celia', nombre: 'Celia', genero: 'f', ejemplo: true, gradiente: relleno(2) },
  { id: 'vz-dario', nombre: 'Darío', genero: 'm', ejemplo: true, gradiente: relleno(3) },
  { id: 'vz-elia', nombre: 'Elia', genero: 'f', ejemplo: true, gradiente: relleno(4) },
  { id: 'vz-fabio', nombre: 'Fabio', genero: 'm', ejemplo: true, gradiente: relleno(5) },
];

/**
 * LÍMITES POR HOJA — PROVISIONALES. Valores de trabajo para la maqueta; no están medidos contra ningún motor ni copian los de
 * ninguna otra herramienta. Los fija producto cuando se conozca qué admite el motor de video con referencias.
 */
export const LIMITES_DE_ELEMENTOS = { total: 8, galeria: 5, personaje: 4, escenario: 2, ropa: 3, voz: 1 } as const;

/** Lo que devuelve la hoja y pinta la pantalla de video: un elemento elegido, de cualquier pestaña. */
export interface ElementoElegido {
  id: string;
  tipo: TipoDeElemento;
  /** Clave de i18n del nombre (catálogo) o `null` si el nombre es texto (de la persona, propio inventado, voz). */
  clave: string | null;
  /** Nombre ya escrito (propio de la persona, voz o galería). */
  nombre: string;
  uri?: string;
  gradiente?: [string, string];
}
