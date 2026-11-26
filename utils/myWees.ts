/*
 * MYWEËS — EL MODELO. Sin React, sin almacenamiento, sin red.
 *
 * MyWeës es el organizador personal de accesos directos de cada persona: una
 * lista ordenada de accesos a destinos QUE YA EXISTEN en Weë. No es una
 * experiencia, ni un directorio, ni una copia de nada: un acceso es una
 * referencia, y lo que hay detrás —la página, el proyecto, la experiencia— no
 * se toca al añadirlo, quitarlo o moverlo.
 *
 * Aquí vive todo lo que se puede probar sin pantalla: qué forma tiene un acceso,
 * cómo se lee lo guardado sin fiarse de ello, y las cuatro operaciones (añadir,
 * quitar, mover, restaurar). Quien guarda es `services/myWeesStore.ts`; quien
 * pinta, `screens/MyWeesScreen.tsx`.
 *
 * TRES REGLAS QUE NO SE NEGOCIAN
 * ------------------------------
 *  1. LO GUARDADO NO ES AUTORIDAD. De un acceso se guarda QUÉ destino es —un
 *     tipo cerrado y un identificador con forma comprobada—, nunca una ruta ni
 *     unos parámetros de navegación. A dónde lleva lo decide `destinoDeAcceso`
 *     con una tabla escrita en el código, así que un JSON manipulado no puede
 *     llevar a ningún sitio que la app no ofrezca ya, y nunca decide identidad
 *     ni permisos: abrir una página ajena la abre como la abre cualquiera.
 *  2. LEER NO FALLA. JSON roto, un objeto donde iba una lista, una versión que
 *     no se conoce, campos que faltan, tipos inventados, duplicados: todo eso
 *     se descarta pieza a pieza y la pantalla sigue en pie. Lo que no se
 *     entiende no se pinta.
 *  3. SIN DUPLICADOS. Un destino está una vez o no está. La identidad de un
 *     acceso es su `id`, que se compone del tipo y la referencia.
 */

/** La versión del formato guardado. Cambia solo si cambia la forma; entonces se escribe aquí la migración. */
export const VERSION_DE_MYWEES = 1;

/** Tope de accesos. MyWeës escala a muchos, no a infinitos: es lo que cabe en una clave de AsyncStorage sin pesar. */
export const MAXIMO_DE_ACCESOS = 200;

/**
 * Los tipos de destino, cerrados.
 *
 *  · `experiencia`: una de las experiencias de Weë AI (ref = su id en `constants/weeExperiences.ts`);
 *  · `funcion`: una función de Weë con pantalla propia (ref = un id de `FUNCIONES_DE_MYWEES`);
 *  · `pagina`: una Weë Page, propia o pública de otra persona (ref = el id del documento);
 *  · `proyecto`: un proyecto propio de Weë AI (ref = el id del documento).
 */
export type TipoDeAcceso = 'experiencia' | 'funcion' | 'pagina' | 'proyecto';

const TIPOS: readonly TipoDeAcceso[] = ['experiencia', 'funcion', 'pagina', 'proyecto'];

/** Las funciones de Weë que se pueden añadir. Cada una tiene su ruta en `destinoDeAcceso`. */
export const FUNCIONES_DE_MYWEES = [
  'pages',
  'projects',
  'creations',
  'saved',
  'history',
  'communities',
  'weels',
  'explore',
  'contacts',
  'messages',
  'credits',
] as const;
export type FuncionDeMyWees = (typeof FUNCIONES_DE_MYWEES)[number];

/** Las experiencias que se pueden añadir: las seis, y Weë Brain. Los ids son los del catálogo y no se renombran. */
export const EXPERIENCIAS_DE_MYWEES = ['studio', 'design', 'chef', 'music', 'business', 'travel', 'brain'] as const;
export type ExperienciaDeMyWees = (typeof EXPERIENCIAS_DE_MYWEES)[number];

export interface AccesoDeMyWees {
  /** `<tipo>:<ref>`. Estable: es lo que impide los duplicados. */
  id: string;
  tipo: TipoDeAcceso;
  ref: string;
  /**
   * El nombre de una página o de un proyecto tal como estaba al añadirlo. Es
   * contenido de una persona, no interfaz: no se traduce. Sirve para poder
   * nombrar el acceso si el destino deja de existir; mientras exista, manda el
   * nombre de verdad. Las experiencias y las funciones no lo llevan: su nombre
   * sale del catálogo y del diccionario.
   */
  titulo?: string;
  /** Cuándo se añadió, en milisegundos. Informativo. */
  anadidoEn?: number;
}

/** Lo que se guarda, entero. */
export interface MyWeesGuardado {
  v: number;
  accesos: AccesoDeMyWees[];
}

/** Un identificador de documento de Firestore o un id de catálogo: corto y sin nada raro. */
const REF_VALIDA = /^[A-Za-z0-9_-]{1,128}$/;

const esTexto = (x: unknown): x is string => typeof x === 'string';

/** ¿Es una referencia admisible para ese tipo? Las de catálogo, además, tienen que estar en el catálogo. */
export const refValida = (tipo: TipoDeAcceso, ref: unknown): ref is string => {
  if (!esTexto(ref) || !REF_VALIDA.test(ref)) return false;
  if (tipo === 'funcion') return (FUNCIONES_DE_MYWEES as readonly string[]).includes(ref);
  if (tipo === 'experiencia') return (EXPERIENCIAS_DE_MYWEES as readonly string[]).includes(ref);
  return true;
};

export const idDeAcceso = (tipo: TipoDeAcceso, ref: string): string => `${tipo}:${ref}`;

/** Un acceso bien formado, o `null`. No se fía de nada de lo que recibe. */
export const crearAcceso = (tipo: unknown, ref: unknown, titulo?: unknown, anadidoEn?: unknown): AccesoDeMyWees | null => {
  if (!esTexto(tipo) || !(TIPOS as readonly string[]).includes(tipo)) return null;
  const t = tipo as TipoDeAcceso;
  if (!refValida(t, ref)) return null;
  const acceso: AccesoDeMyWees = { id: idDeAcceso(t, ref), tipo: t, ref };
  /* El título solo tiene sentido en lo que tiene nombre propio; se recorta para que nadie guarde una novela. */
  if ((t === 'pagina' || t === 'proyecto') && esTexto(titulo) && titulo.trim()) acceso.titulo = titulo.trim().slice(0, 120);
  if (typeof anadidoEn === 'number' && Number.isFinite(anadidoEn) && anadidoEn > 0) acceso.anadidoEn = anadidoEn;
  return acceso;
};

/**
 * De lo que haya en el almacenamiento a una lista limpia. NUNCA lanza.
 *
 *  · `null`, vacío o JSON roto → lista vacía;
 *  · algo que no es `{ v, accesos }` → lista vacía;
 *  · una versión desconocida (más nueva que esta app, o sin número) → lista
 *    vacía: no se intenta adivinar un formato que no se conoce;
 *  · dentro de la lista, cada pieza que no sea un acceso válido se salta, y de
 *    dos iguales se queda la primera.
 */
export const leerMyWees = (crudo: string | null | undefined): AccesoDeMyWees[] => {
  if (!esTexto(crudo) || !crudo.trim()) return [];
  let dato: unknown;
  try {
    dato = JSON.parse(crudo);
  } catch {
    return [];
  }
  if (!dato || typeof dato !== 'object' || Array.isArray(dato)) return [];
  const { v, accesos } = dato as { v?: unknown; accesos?: unknown };
  if (v !== VERSION_DE_MYWEES) return [];
  if (!Array.isArray(accesos)) return [];
  const limpios: AccesoDeMyWees[] = [];
  const vistos = new Set<string>();
  for (const pieza of accesos) {
    if (!pieza || typeof pieza !== 'object') continue;
    const { tipo, ref, titulo, anadidoEn } = pieza as Record<string, unknown>;
    const acceso = crearAcceso(tipo, ref, titulo, anadidoEn);
    if (!acceso || vistos.has(acceso.id)) continue;
    vistos.add(acceso.id);
    limpios.push(acceso);
    if (limpios.length >= MAXIMO_DE_ACCESOS) break;
  }
  return limpios;
};

/** Lo que se escribe. Pasa por el mismo filtro que la lectura, así que no se puede guardar algo que luego no se leería. */
export const escribirMyWees = (accesos: readonly AccesoDeMyWees[]): string =>
  JSON.stringify({ v: VERSION_DE_MYWEES, accesos: leerMyWees(JSON.stringify({ v: VERSION_DE_MYWEES, accesos })) } satisfies MyWeesGuardado);

// ─── Las operaciones. Todas devuelven una lista nueva; ninguna toca la que recibe. ───

export const contiene = (accesos: readonly AccesoDeMyWees[], id: string): boolean => accesos.some((a) => a.id === id);

/** Añade al final. Si ya estaba, o no es válido, o no cabe, devuelve la misma lista. */
export const anadir = (accesos: readonly AccesoDeMyWees[], nuevo: AccesoDeMyWees | null): AccesoDeMyWees[] => {
  if (!nuevo || contiene(accesos, nuevo.id) || accesos.length >= MAXIMO_DE_ACCESOS) return [...accesos];
  const limpio = crearAcceso(nuevo.tipo, nuevo.ref, nuevo.titulo, nuevo.anadidoEn);
  return limpio ? [...accesos, limpio] : [...accesos];
};

/** Quita el acceso. No borra nada de lo que hay detrás: solo deja de estar en la lista. */
export const quitar = (accesos: readonly AccesoDeMyWees[], id: string): AccesoDeMyWees[] => accesos.filter((a) => a.id !== id);

/** Mueve un acceso un puesto hacia el principio (-1) o hacia el final (+1). En los extremos, no hace nada. */
export const mover = (accesos: readonly AccesoDeMyWees[], id: string, paso: -1 | 1): AccesoDeMyWees[] => {
  const desde = accesos.findIndex((a) => a.id === id);
  const hasta = desde + paso;
  const copia = [...accesos];
  if (desde < 0 || hasta < 0 || hasta >= copia.length) return copia;
  [copia[desde], copia[hasta]] = [copia[hasta], copia[desde]];
  return copia;
};

/** El estado inicial: vacío. MyWeës no trae nada puesto ni recomienda nada. */
export const restaurar = (): AccesoDeMyWees[] => [];

// ─── La clave ───

/**
 * De qué cara es la lista: `real`, `hidi` (el Perfil Weë heredado, `hidi_<cuenta>`, con la clave de siempre) o la
 * identidad opaca de un alter ego (`ent_…`, plan de alter egos, 2026-11-23): cada alter ego tiene su MyWeës.
 */
export type PerfilDeMyWees = 'real' | 'hidi' | string;

/** La identidad opaca de un alter ego. Solo filtra la forma: la lista es de este aparato y no da ningún permiso. */
const FORMA_DE_ALTER_EGO = /^ent_[A-Za-z0-9]{1,64}$/;

/**
 * La cara con la que se guarda la lista de la cara puesta: el Real es `real`; la heredada (`hidi_<cuenta>`) sigue en
 * `hidi`, así que su lista de siempre se lee igual; un alter ego `ent_…`, su propia identidad.
 */
export const perfilDeMyWees = (cuenta: string | null | undefined, tipo: 'real' | 'hidi', identidad: string | null | undefined): PerfilDeMyWees => {
  if (tipo !== 'hidi') return 'real';
  if (typeof identidad === 'string' && FORMA_DE_ALTER_EGO.test(identidad)) return identidad;
  return 'hidi';
};

/**
 * La clave de AsyncStorage: una por CUENTA y por PERFIL, con la versión dentro.
 *
 * La cuenta es el uid de Firebase Auth; el perfil, cuál de las dos caras está
 * activa. Así lo del Perfil Real no aparece en el Perfil Weë ni al revés, y lo
 * de una cuenta no lo ve la siguiente que entre en el mismo teléfono. Sin
 * cuenta no hay clave: un invitado no tiene MyWeës.
 */
export const claveDeMyWees = (cuenta: string | null | undefined, perfil: PerfilDeMyWees): string | null => {
  if (!esTexto(cuenta) || !REF_VALIDA.test(cuenta)) return null;
  const cara = perfil === 'hidi' ? 'hidi' : typeof perfil === 'string' && FORMA_DE_ALTER_EGO.test(perfil) ? perfil : 'real';
  return `wee.mywees.v${VERSION_DE_MYWEES}.${cuenta}.${cara}`;
};

// ─── A dónde lleva ───

/** Una navegación que la app ya ofrece: una ruta de la pila principal y, si acaso, sus parámetros. */
export interface DestinoDeAcceso {
  ruta: string;
  params?: Record<string, unknown>;
  /** true si el destino es de una persona y pide cuenta (hoy, todos menos lo público). */
  pideCuenta: boolean;
}

const RUTA_DE_FUNCION: Record<FuncionDeMyWees, DestinoDeAcceso> = {
  pages: { ruta: 'WeePages', pideCuenta: true },
  projects: { ruta: 'Projects', pideCuenta: true },
  creations: { ruta: 'MisCreaciones', pideCuenta: true },
  saved: { ruta: 'SavedPosts', pideCuenta: true },
  history: { ruta: 'Historial', pideCuenta: true },
  communities: { ruta: 'Main', params: { screen: 'Home', params: { screen: 'ExploreCommunities' } }, pideCuenta: false },
  weels: { ruta: 'Reels', pideCuenta: false },
  explore: { ruta: 'Search', pideCuenta: false },
  /* La agenda del perfil activo: ËContact con el Perfil Real, ẄContact con el Perfil Weë. La pantalla es la misma y ella sola enseña la de la cara activa. */
  contacts: { ruta: 'EContact', pideCuenta: true },
  messages: { ruta: 'Main', params: { screen: 'Inbox' }, pideCuenta: true },
  credits: { ruta: 'CreditStore', pideCuenta: true },
};

/**
 * A dónde lleva un acceso. Sale de una tabla escrita aquí, nunca de lo guardado.
 * `null` si el acceso no es de un tipo que se conozca: no se navega a ciegas.
 */
export const destinoDeAcceso = (acceso: AccesoDeMyWees): DestinoDeAcceso | null => {
  if (!refValida(acceso.tipo, acceso.ref)) return null;
  switch (acceso.tipo) {
    case 'experiencia':
      /* Como las abre el centro creativo de WeëAI: `Specialist { id }`, que entrega la pantalla de cada una. */
      return { ruta: 'Specialist', params: { id: acceso.ref }, pideCuenta: false };
    case 'funcion':
      return RUTA_DE_FUNCION[acceso.ref as FuncionDeMyWees] ?? null;
    case 'pagina':
      /* La página ORIGINAL, por su id. Quien la abre la ve como la ve cualquiera: añadirla no concede nada. */
      return { ruta: 'WeePage', params: { pageId: acceso.ref }, pideCuenta: false };
    case 'proyecto':
      return { ruta: 'Project', params: { id: acceso.ref }, pideCuenta: true };
    default:
      return null;
  }
};

/**
 * De un enlace de página, o de su identificador escrito a mano, al id de la página.
 *
 * Acepta `https://wee.zone/page/<id>`, `wee://page/<id>`, `/page/<id>` y el id
 * a secas. No resuelve @usuarios: hoy la app no tiene esa lectura, y aquí no se
 * inventa. `null` si no hay un id reconocible.
 */
export const idDePaginaDesdeTexto = (texto: string): string | null => {
  const limpio = (texto || '').trim();
  if (!limpio) return null;
  const enlace = limpio.match(/(?:^|\/)page\/([A-Za-z0-9_-]{1,128})(?:[/?#].*)?$/);
  if (enlace) return enlace[1];
  return REF_VALIDA.test(limpio) && !limpio.includes('.') ? limpio : null;
};
