import {
  ContinuityAnchor,
  ContinuityAspect,
  ContinuityRequirements,
  ContinuityStrength,
  FUERZAS_DE_CONTINUIDAD,
  MAX_ANCLAJES,
  MAX_RELACIONES_ESPACIALES,
  RELACIONES_ESPACIALES,
  SpatialConstraint,
  SpatialRelationKind,
  esAspectoDeContinuidad,
} from './continuity';

/**
 * WEË CONTINUITY — DE LO QUE ALGUIEN DIJO A LO QUE HAY QUE CONSERVAR.
 *
 * ── El reparto, y es lo único que hay que entender de este archivo ──────────
 *
 *     EL MODELO pone la SEMÁNTICA.   «mantén a Luna y cámbiale el vestido»
 *                                    → preserve: identity.*, mayChange: outfit.*
 *
 *     ESTE ARCHIVO pone las GARANTÍAS. Que no se invente un identificador, que
 *                                    el silencio no se lea como permiso, que
 *                                    dos cosas con el mismo nombre no se
 *                                    resuelvan a cara o cruz.
 *
 * Aquí NO hay un intérprete de lenguaje. No hay `includes('cara')`, ni una
 * tabla de sinónimos, ni una rama por idioma. Entender «no le toques el
 * rostro», «que siga siendo ella» y «keep her face» es el trabajo del mismo
 * modelo que ya entiende la petición entera, en la MISMA llamada — igual que
 * con los parámetros creativos de S2 y las necesidades de contexto de S3.
 *
 * Lo que este archivo hace es lo que un modelo no puede hacer bien: decir que
 * no. No inventar. No elegir entre dos Lunas. No rellenar huecos.
 *
 * ── Por qué el modelo NO devuelve identificadores ───────────────────────────
 *
 * Porque no los conoce, y un identificador inventado que pase la validación es
 * la peor clase de error: silencioso, plausible y apuntando a la cosa
 * equivocada de otra persona. El modelo devuelve el NOMBRE que usó quien habla
 * —«Luna», «la casa», «esta botella»— y la resolución la hace esto contra lo
 * que la cuenta tiene de verdad.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No lee, no consulta, no llama a nadie, no crea trabajos, no cobra, no elige
 * proveedor ni modelo, no valida imágenes y no persiste nada. Recibe lo que el
 * modelo dijo más los candidatos que otro ya resolvió, y contesta.
 */

/* ── Lo que el modelo devuelve ────────────────────────────────────────────── */

/**
 * UNA RELACIÓN ESPACIAL TAL Y COMO LA DICE EL MODELO: por NOMBRE, no por id.
 */
export interface RelacionPorNombre {
  subject: string;
  relation: SpatialRelationKind;
  object: string;
}

/**
 * LA INTENCIÓN DE CONTINUIDAD, en el vocabulario cerrado de C2 y con los
 * sujetos todavía sin resolver.
 *
 * `subjects` son las cosas que quien habla nombró. No son identificadores y no
 * se parecen a uno: son las palabras que usó, y existen para que la resolución
 * tenga algo con lo que buscar.
 */
export interface ContinuityIntent {
  preserve?: readonly ContinuityAspect[];
  mayChange?: readonly ContinuityAspect[];
  strength?: ContinuityStrength;
  /** A qué cosas se refirió, por su nombre. */
  subjects?: readonly string[];
  spatial?: readonly RelacionPorNombre[];
}

export const MAX_SUJETOS = 8;

const esTxt = (v: unknown): v is string => typeof v === 'string';
const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const listaDeAspectos = (v: unknown): readonly ContinuityAspect[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const limpia = [...new Set(v.filter(esAspectoDeContinuidad))];
  return limpia.length ? limpia : undefined;
};

const listaDeNombres = (v: unknown): readonly string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const limpia = [...new Set(v.filter((x): x is string => esTxt(x) && x.trim().length > 0 && x.length <= 120)
    .map((x) => x.trim()))].slice(0, MAX_SUJETOS);
  return limpia.length ? limpia : undefined;
};

/**
 * LO QUE DIJO EL MODELO, LEÍDO CON EL VOCABULARIO CERRADO.
 *
 * Un aspecto que no está en el catálogo de C2 se descarta SIN avisar, igual
 * que una capacidad que no está en el catálogo del Core. Pero la intención NO
 * se descarta entera por un aspecto malo: a diferencia de los parámetros
 * creativos —donde media intención describe algo que nadie pidió— aquí cada
 * aspecto es independiente, y tirar «conserva el rostro» porque el modelo
 * escribió mal «lighting.timeofday» sería perder lo que sí se entendió.
 *
 * Devuelve `undefined` cuando no queda nada que decir: nadie pidió continuidad.
 */
export const leerIntencionDeContinuidad = (crudo: unknown): ContinuityIntent | undefined => {
  if (!esObjeto(crudo)) return undefined;
  const preserve = listaDeAspectos(crudo.preserve);
  const mayChange = listaDeAspectos(crudo.mayChange);
  const subjects = listaDeNombres(crudo.subjects);
  const strength = esTxt(crudo.strength) && (FUERZAS_DE_CONTINUIDAD as readonly string[]).includes(crudo.strength)
    ? (crudo.strength as ContinuityStrength) : undefined;
  const spatial = Array.isArray(crudo.spatial)
    ? crudo.spatial
      .filter((r: unknown): r is RelacionPorNombre => esObjeto(r)
        && esTxt(r.subject) && esTxt(r.object)
        && esTxt(r.relation) && (RELACIONES_ESPACIALES as readonly string[]).includes(r.relation)
        && r.subject.trim().length > 0 && r.object.trim().length > 0)
      .map((r) => ({ subject: r.subject.trim(), relation: r.relation, object: r.object.trim() }))
      .slice(0, MAX_RELACIONES_ESPACIALES)
    : undefined;

  const algo = preserve || mayChange || subjects || strength || (spatial && spatial.length);
  if (!algo) return undefined;
  return Object.freeze({
    ...(preserve ? { preserve } : {}),
    ...(mayChange ? { mayChange } : {}),
    ...(strength ? { strength } : {}),
    ...(subjects ? { subjects } : {}),
    ...(spatial && spatial.length ? { spatial } : {}),
  });
};

/* ── Con qué se resuelve ──────────────────────────────────────────────────── */

/**
 * UNA COSA DE LA CUENTA, ya resuelta por quien sabe leer. Su nombre y su
 * versión VIGENTE — la que se anclará, sin subir a ninguna otra.
 */
export interface CandidatoDeContinuidad {
  elementId: string;
  name: string;
  version: number;
}

/**
 * NOMBRES COMPARABLES. Minúsculas, sin acentos y sin espacios de sobra.
 *
 * Esto NO es interpretar lenguaje: es comparar el nombre que alguien escribió
 * con el nombre que esa misma persona le puso a su cosa. «LUNA», «Luna» y
 * «luna» son la misma cosa suya, y tratarlas como tres sería hacerle escribir
 * con mayúsculas exactas para que se le reconozca lo que ya es suyo.
 */
const comparable = (s: string): string =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* ── Lo que sale ──────────────────────────────────────────────────────────── */

/** Un nombre que cuadra con más de una cosa. No se elige: se pregunta. */
export interface AmbiguedadDeSujeto {
  label: string;
  candidates: readonly { elementId: string; name: string }[];
}

export type MotivoDeConflicto = 'preserve_and_may_change';

export interface ConflictoDeIntencion {
  aspect: ContinuityAspect;
  reason: MotivoDeConflicto;
}

/**
 * LO QUE CONTESTA LA RESOLUCIÓN.
 *
 * `requirements` puede venir con `status: 'ambiguo'`: la intención se entendió
 * y sigue valiendo, lo que no se pudo es decir A QUÉ se refería. Separar las
 * dos cosas permite enseñarle a la persona lo que se entendió y preguntarle
 * solo lo que falta, en vez de tirar la frase entera.
 */
export type EstadoDeIntencion = 'resuelto' | 'ambiguo' | 'en_conflicto' | 'sin_intencion';

export interface IntencionResuelta {
  status: EstadoDeIntencion;
  /** Ausente solo cuando no hay nada que exigir, o cuando hay conflicto. */
  requirements?: ContinuityRequirements;
  /** Nombres que cuadran con más de una cosa. No se ha elegido ninguna. */
  ambiguities: readonly AmbiguedadDeSujeto[];
  /** Nombres que no cuadran con nada de la cuenta. NO se han inventado. */
  unresolved: readonly string[];
  /** Lo que se exigió conservar y liberar a la vez. No se elige ganador. */
  conflicts: readonly ConflictoDeIntencion[];
}

const vacia = (status: EstadoDeIntencion): IntencionResuelta =>
  Object.freeze({ status, ambiguities: Object.freeze([]), unresolved: Object.freeze([]), conflicts: Object.freeze([]) });

/**
 * DE LA INTENCIÓN A LOS REQUISITOS. Pura, determinista y sin inventar nada.
 *
 * ── Las cuatro reglas que hace cumplir ──────────────────────────────────────
 *
 * 1 · EL SILENCIO NO ES PERMISO. Solo entra lo que el modelo dijo que se
 *     mencionó. Un aspecto que nadie nombró no aparece ni en una lista ni en la
 *     otra, y más abajo —en C4 y en el veredicto— saldrá `unspecified`, que no
 *     autoriza nada.
 *
 * 2 · NO SE INVENTAN IDENTIFICADORES. Un nombre que no cuadra con nada de la
 *     cuenta se devuelve como no resuelto, con su palabra. La intención se
 *     conserva —«quería conservar el rostro»— y quien siga sabrá que le falta a
 *     qué agarrarse. Fabricar un id sería apuntar a la cosa de otra persona.
 *
 * 3 · NO SE ELIGE ENTRE DOS. Dos cosas con el mismo nombre son una pregunta,
 *     no un sorteo. Se devuelven las dos y no se ancla ninguna.
 *
 * 4 · NO SE DECIDE UNA CONTRADICCIÓN. Exigir y liberar el mismo aspecto se
 *     devuelve como conflicto, sin requisitos. Que «gane la última frase» es
 *     una regla inventada, y quien la sufriría no se enteraría.
 */
export const resolverIntencionDeContinuidad = (
  intencion: ContinuityIntent | undefined,
  candidatos: readonly CandidatoDeContinuidad[] = [],
): IntencionResuelta => {
  if (!intencion) return vacia('sin_intencion');

  const preserve = intencion.preserve ?? [];
  const mayChange = intencion.mayChange ?? [];

  /* 4 · La contradicción, antes que nada: sin ella resuelta no hay requisitos. */
  const conflicts = preserve
    .filter((a) => mayChange.includes(a))
    .map((aspect) => Object.freeze({ aspect, reason: 'preserve_and_may_change' as const }));
  if (conflicts.length) {
    return Object.freeze({
      status: 'en_conflicto',
      ambiguities: Object.freeze([]),
      unresolved: Object.freeze([]),
      conflicts: Object.freeze(conflicts),
    });
  }

  /* 2 y 3 · Los sujetos, uno a uno, contra lo que la cuenta tiene de verdad. */
  const porNombre = new Map<string, CandidatoDeContinuidad[]>();
  for (const c of candidatos) {
    const k = comparable(c.name);
    porNombre.set(k, [...(porNombre.get(k) ?? []), c]);
  }

  const anchors: ContinuityAnchor[] = [];
  const anclados = new Map<string, string>();
  const ambiguities: AmbiguedadDeSujeto[] = [];
  const unresolved: string[] = [];
  const nombres = [...new Set([
    ...(intencion.subjects ?? []),
    ...(intencion.spatial ?? []).flatMap((r) => [r.subject, r.object]),
  ])];

  for (const label of nombres) {
    const encontrados = porNombre.get(comparable(label)) ?? [];
    if (encontrados.length === 0) { unresolved.push(label); continue; }
    if (encontrados.length > 1) {
      ambiguities.push(Object.freeze({
        label,
        candidates: Object.freeze(encontrados.map((c) => Object.freeze({ elementId: c.elementId, name: c.name }))),
      }));
      continue;
    }
    const uno = encontrados[0];
    if (anclados.has(uno.elementId)) continue;
    anclados.set(uno.elementId, label);
    /* La versión VIGENTE, tal cual. Nunca se sube a otra: eso sería cambiar de cosa. */
    if (anchors.length < MAX_ANCLAJES) anchors.push(Object.freeze({ elementId: uno.elementId, version: uno.version }));
  }

  /* Una relación solo viaja si sus DOS extremos se anclaron: media relación no dice nada. */
  const spatial: SpatialConstraint[] = [];
  for (const r of intencion.spatial ?? []) {
    const sujeto = [...anclados.entries()].find(([, l]) => comparable(l) === comparable(r.subject))?.[0];
    const objeto = [...anclados.entries()].find(([, l]) => comparable(l) === comparable(r.object))?.[0];
    if (sujeto && objeto && sujeto !== objeto) spatial.push(Object.freeze({ subject: sujeto, relation: r.relation, object: objeto }));
  }

  /* 1 · Y los requisitos: solo lo dicho, nada añadido. */
  const requirements: ContinuityRequirements | undefined = preserve.length
    ? Object.freeze({
      preserve: Object.freeze([...preserve]),
      ...(mayChange.length ? { mayChange: Object.freeze([...mayChange]) } : {}),
      ...(anchors.length ? { anchors: Object.freeze(anchors) } : {}),
      ...(intencion.strength ? { strength: intencion.strength } : {}),
      ...(spatial.length ? { spatial: Object.freeze(spatial) } : {}),
    })
    : undefined;

  return Object.freeze({
    status: ambiguities.length ? 'ambiguo' : requirements ? 'resuelto' : 'sin_intencion',
    ...(requirements ? { requirements } : {}),
    ambiguities: Object.freeze(ambiguities),
    unresolved: Object.freeze(unresolved),
    conflicts: Object.freeze([]),
  });
};

/**
 * LO QUE SE ENTENDIÓ PERO NO SE PUDO ATAR A NADA.
 *
 * Sirve para decírselo a una persona con sus palabras —«no encuentro ninguna
 * “casa” tuya»— en vez de fallar sin explicar. Que la intención sobreviva a no
 * encontrar la referencia es a propósito: quien la escribió sigue queriendo lo
 * mismo, y puede crear lo que falta.
 */
export const sujetosSinResolver = (r: IntencionResuelta): readonly string[] =>
  Object.freeze([...r.unresolved, ...r.ambiguities.map((a) => a.label)]);

/* ── El puente hacia la ejecución ─────────────────────────────────────────── */

/**
 * LO QUE HACE FALTA SABER ANTES DE PODER PLANIFICAR.
 *
 * Un nombre que no se resolvió, dos cosas que se llaman igual o un aspecto
 * exigido y liberado a la vez: las tres dejan la intención INCOMPLETA, y una
 * intención incompleta no se ejecuta. Se devuelven para que entren en
 * `BrainUnderstanding.missing`, que es el mecanismo que YA existe y que el
 * Planner YA respeta —con `missing` no vacío contesta `needs_clarification` y
 * no planifica—.
 *
 * Eso importa más de lo que parece: no hay ninguna política nueva. Lo que
 * impide ejecutar una intención a medias es la misma regla que impide
 * ejecutar cualquier otra cosa que Brain no supo.
 */
export const loQueFaltaDeLaContinuidad = (r: IntencionResuelta): readonly string[] =>
  Object.freeze([...sujetosSinResolver(r), ...r.conflicts.map((c) => c.aspect)]);

/**
 * DE LA INTENCIÓN DE BRAIN A LA FORMA QUE VIAJA CON LA EJECUCIÓN.
 *
 * ── Por qué esto es todo lo que hacía falta ─────────────────────────────────
 *
 * El Planner ya fusiona `understanding.preferences` en las pistas de cada paso,
 * y las pistas ya cruzan el Workflow, el Orchestrator, el trabajo y el Gateway
 * enteras. Así que el puente no es una capa: es poner los requisitos resueltos
 * donde el sistema ya sabe mirar.
 *
 * Ninguna capa del camino cambia. Ninguna aprende qué es un rostro. El Planner
 * transporta, el Workflow transporta, el Orchestrator transporta, el Job Engine
 * transporta y el Gateway entrega. Y este archivo no vuelve a interpretar
 * lenguaje: recibe lo que el modelo ya entendió.
 *
 * ── Y lo que NO hace ────────────────────────────────────────────────────────
 *
 * No resuelve nada dos veces —quien resuelve es `resolverIntencionDeContinuidad`
 * y no hay una segunda—, no sube versiones, no inventa identificadores y no
 * convierte una ambigüedad en una decisión. Lo que quedó sin resolver sale por
 * `missing`, y con `missing` no vacío no se planifica.
 */
export const conContinuidadResuelta = <U extends {
  continuity?: ContinuityIntent;
  preferences?: { continuity?: ContinuityRequirements };
  missing: readonly string[];
}>(entendimiento: U, candidatos: readonly CandidatoDeContinuidad[] = []): U => {
  const r = resolverIntencionDeContinuidad(entendimiento.continuity, candidatos);
  if (r.status === 'sin_intencion' && !r.requirements) return entendimiento;

  const falta = loQueFaltaDeLaContinuidad(r);
  return Object.freeze({
    ...entendimiento,
    ...(r.requirements
      ? { preferences: { ...(entendimiento.preferences ?? {}), continuity: r.requirements } }
      : {}),
    ...(falta.length ? { missing: Object.freeze([...entendimiento.missing, ...falta]) } : {}),
  }) as U;
};
