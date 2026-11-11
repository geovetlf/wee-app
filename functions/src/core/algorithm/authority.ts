/**
 * WEE ALGORITHM ENGINE — LO QUE ESTA CAPA NO PUEDE HACER.
 *
 * ── Por qué esto es un archivo y no un párrafo ──────────────────────────────
 *
 * Porque un límite escrito en un comentario se cruza el día que alguien tiene
 * prisa. En B3.15.2 quedó demostrado del modo más barato posible: se intentó
 * que un paso del plan dijera «usa ElevenLabs», y lo que lo impidió no fue la
 * buena intención de nadie — fue `claveDeImplementacion`, una lista de nombres
 * prohibidos que una guarda podía comprobar.
 *
 * Esa lista sigue mandando y va PRIMERO: se importa del Planner, y si el Core
 * amplía lo que considera implementación, esta capa se aprieta sola.
 *
 * ── Por responsabilidad, no por palabras ────────────────────────────────────
 *
 * Pero una lista de nombres solo ve los nombres que alguien escribió:
 * `providerId` se paraba y `providerName`, `vendor`, `apiKey` o `credits` pasaban.
 * Por eso, encima de ella —nunca en su lugar, y solo para rechazar más—, cada
 * clave se LEE: se parte en palabras (camelCase, `_`, `-`, `.`, espacios,
 * acentos, palabras pegadas) y se pregunta de quién es lo que nombra. Cada
 * concepto pertenece a uno de los EFECTOS PROHIBIDOS y la violación dice cuál y
 * quién es su dueño. Decide el PAPEL de la palabra, no la palabra: un tope que
 * esta capa solo lee (`maxCredits`) no es cobrar; un identificador o un verbo
 * sobre el dinero (`walletId`, `chargeCredits`) sí.
 *
 * Cuatro efectos no se leen en las claves, y a propósito: decidir capacidades
 * (Planner), entender la intención (Brain), despachar (Orchestrator) y
 * reintentar (Job Engine). El vocabulario de esta capa ES ése —`capability`,
 * `parallelGroups`, `retry`— porque PROPONER sobre ellos es su trabajo; lo que
 * le impide HACERLO es que es pura y entrega datos a su dueño.
 *
 * ── El reparto ──────────────────────────────────────────────────────────────
 *
 *   El Algorithm Engine PUEDE      evaluar · recomendar · puntuar · proponer
 *                                  alternativas, recuperación y paralelización
 *                                  · producir señales
 *
 *   El Algorithm Engine NO PUEDE   elegir proveedor o modelo · ejecutar nada ·
 *                                  cobrar · crear materiales · saltarse al
 *                                  Router, al Gateway o al Financial Core ·
 *                                  modificar al Planner o a Brain
 *
 * La autoridad final se queda donde estaba. Esta capa aporta criterio, no poder.
 *
 * ── Describir no es elegir ──────────────────────────────────────────────────
 *
 * Una SEÑAL sí puede nombrar a un proveedor: «elevenlabs falló 3 de 50» es un
 * hecho sobre el mundo y sin él no hay nada que optimizar. Lo que no puede
 * nombrarlo es una ESTRATEGIA o una DECISIÓN, porque eso ya no describe: manda.
 * La frontera pasa por ahí y no por la palabra. Por eso una clave que es un DATO
 * hecho clave —`metrica|providerId=p`, la clave con que A7 agrega— no se lee
 * como el nombre de un campo: describe.
 */

import { claveDeImplementacion } from '../planner';
import { Strategy } from './strategy';

/**
 * LOS EFECTOS QUE ESTA CAPA TIENE PROHIBIDOS.
 *
 * Datos y no prosa, para que una prueba pueda recorrerlos. Cada uno nombra a su
 * dueño: la lista no dice solo «no puedes», dice «no puedes porque ya hay
 * alguien que sí», que es lo que impide que mañana se construya un segundo
 * sistema por no saber dónde estaba el primero.
 */
export const EFECTOS_PROHIBIDOS: readonly { readonly efecto: string; readonly dueno: string }[] = Object.freeze([
  Object.freeze({ efecto: 'elegir proveedor o modelo', dueno: 'Router (core/router.ts; en producción hoy, engine/router.ts, DD-02)' }),
  Object.freeze({ efecto: 'llamar a una API de proveedor', dueno: 'Gateway + adaptador (core/gateway.ts; en producción hoy, engine.generate y su adaptador, DD-02)' }),
  Object.freeze({ efecto: 'cobrar, reservar o reembolsar Credits', dueno: 'Financial Core (core/financial, credits/)' }),
  Object.freeze({ efecto: 'crear o modificar materiales', dueno: 'Asset Core (core/content)' }),
  Object.freeze({ efecto: 'crear o ejecutar trabajos', dueno: 'Job Engine (core/job.ts)' }),
  Object.freeze({ efecto: 'decidir qué capacidades hacen falta', dueno: 'Planner (core/planner.ts)' }),
  Object.freeze({ efecto: 'entender la intención', dueno: 'Weë Brain (core/brain.ts)' }),
  Object.freeze({ efecto: 'despachar pasos', dueno: 'Orchestrator (core/orchestrator.ts)' }),
  Object.freeze({ efecto: 'reintentar', dueno: 'Job Engine, con RetryPolicy (core/workflow.ts)' }),
  Object.freeze({ efecto: 'leer un secreto', dueno: 'nadie en el Core: los secretos viven en el runtime' }),
]);

/** Lo que cruza la frontera: el efecto prohibido, literal de `EFECTOS_PROHIBIDOS`, y su dueño. */
export interface CruceDeAutoridad {
  efecto: string;
  dueno: string;
}

/** Dónde se comprobó la frontera, qué la cruzó y de quién era lo que intentó. */
export interface ViolacionDeAutoridad extends CruceDeAutoridad {
  /** Qué objeto la cruzó: `strategy:s1`, `strategy:s1:step:audio`… */
  donde: string;
  /** La clave que apareció, tal cual llegó. */
  clave: string;
}

/* ── Los conceptos de autoridad ───────────────────────────────────────────── */

/**
 * UN CONCEPTO DE AUTORIDAD: de qué efecto prohibido es y cómo se nombra.
 *
 * Una RESPONSABILIDAD, no una lista de claves: sus palabras son las pocas con
 * que se nombra lo que es de ese dueño, en castellano y en inglés, y las
 * compuestas (`providerName`, `id_proveedor`, `nombreDelProveedor`) salen de
 * leerlas, no de escribirlas.
 *
 *   nombres     lo que es del dueño. En el nombre de un campo, con cualquier papel, cruza.
 *   pares       lo que solo existe en dos palabras seguidas: `api`·`key`.
 *   cantidades  el dinero de Weë como cantidad. Cruza, salvo en un TOPE que esta capa
 *               solo lee —`maxCredits`, `creditLimit`— sin identificador ni acción.
 *   objetos     nombrarlo DESCRIBE y solo actuar sobre ello cruza: `jobId` dice dónde
 *               pasó algo; `runJob`, que se haga.
 *
 * Lo que NO está, y por qué: `key` (las señales tienen `key`), `token` (se cuentan
 * tokens), `cost` y `usd` (un eje, y lo medido del proveedor: describir), `url` (una
 * referencia no es una llamada), `account`, `budget`, `spend`, `amount`,
 * `capability`, `retry`, `checkpoint` y `motor` (así se llaman los motores de esta
 * capa). Ni un nombre de proveedor: describirlo es de las señales. `retry` no es un
 * concepto —proponer reintentos es de esta capa—, pero como VERBO sobre un trabajo
 * (`retryJob`) cruza: reintentar un trabajo es del Job Engine.
 *
 * Las palabras de secreto son las de `CAMPOS_PROHIBIDOS` (core/observability.ts) que
 * nombran un secreto —`apiKey`, `authorization`, `secret`, `password`, `credential`—,
 * más sus parientes; `token`, `prompt`, `message` y `content` no, porque no nombran un
 * secreto en una clave de esta capa. Una lista de secretos, no dos que divergen: lo fija
 * `algorithm-foundation` K2.19. `authorization` es la CABECERA: cruza como la clave entera
 * —así la nombra `CAMPOS_PROHIBIDOS`— o junto a `header`; suelta dentro de una compuesta
 * suele ser un PERMISO («requiereAutorizacion», la autorización del dueño), y eso no es un
 * secreto (segunda pasada de la revisión).
 *
 * El orden es de precedencia —el más específico primero: `apiKey` es un secreto
 * antes que una dirección—, no el de `EFECTOS_PROHIBIDOS`.
 */
export interface ConceptoDeAutoridad {
  efecto: string;
  nombres?: readonly string[];
  pares?: readonly (readonly [string, string])[];
  cantidades?: readonly string[];
  objetos?: readonly string[];
}

const conceptos: readonly ConceptoDeAutoridad[] = [
  {
    efecto: 'leer un secreto',
    nombres: ['secret', 'secreto', 'credential', 'credencial', 'password', 'contrasena', 'bearer'],
    pares: [['api', 'key'], ['private', 'key'], ['access', 'key'], ['access', 'token'], ['auth', 'token'], ['auth', 'header'],
      ['authorization', 'header'],
      ['refresh', 'token'], ['id', 'token'], ['clave', 'api'], ['clave', 'privada'], ['token', 'acceso']],
  },
  {
    efecto: 'cobrar, reservar o reembolsar Credits',
    nombres: ['charge', 'cobro', 'cobrar', 'refund', 'reembolso', 'reembolsar', 'pay', 'pago', 'pagar', 'payment',
      'wallet', 'billetera', 'monedero', 'saldo', 'billing', 'factura', 'facturacion', 'invoice',
      'transaction', 'transaccion', 'ledger', 'financial', 'financiero', 'finance', 'finanzas'],
    cantidades: ['credit', 'credito', 'price', 'precio', 'pricing', 'tarifa', 'fee'],
  },
  {
    efecto: 'llamar a una API de proveedor',
    nombres: ['api', 'endpoint', 'webhook', 'callback', 'http', 'https', 'gateway'],
    pares: [['base', 'url'], ['base', 'uri']],
  },
  {
    efecto: 'elegir proveedor o modelo',
    nombres: ['provider', 'proveedor', 'vendor', 'model', 'modelo', 'adapter', 'adaptador', 'engine'],
  },
  { efecto: 'crear o modificar materiales', nombres: ['storage', 'almacenamiento', 'bucket'], objetos: ['asset', 'material'] },
  { efecto: 'crear o ejecutar trabajos', objetos: ['job', 'trabajo', 'worker', 'queue', 'cola'] },
];

export const CONCEPTOS_DE_AUTORIDAD: readonly ConceptoDeAutoridad[] = Object.freeze(conceptos.map((c) => Object.freeze({ ...c })));

/* ── Los papeles: clases cerradas, no listas que crecen ───────────────────── */

/** Un tope que esta capa solo LEE. Con dinero, no es cobrar. */
const TOPES: ReadonlySet<string> = new Set(['max', 'maximum', 'maximo', 'min', 'minimum', 'minimo', 'limit', 'limite',
  'cap', 'tope', 'ceiling', 'techo', 'floor', 'suelo', 'budget', 'presupuesto', 'threshold', 'umbral']);
/** Señalar una cosa concreta. Con dinero, es tocar un registro que es del Financial Core. */
const IDENTIFICADORES: ReadonlySet<string> = new Set(['id', 'ids', 'ref', 'uid', 'number', 'numero', 'code', 'codigo']);
/** Hacer. En infinitivo o imperativo: lo hecho (`startedAt`) describe. */
const ACCIONES: ReadonlySet<string> = new Set(['create', 'crear', 'write', 'escribir', 'update', 'actualizar',
  'modify', 'modificar', 'delete', 'borrar', 'eliminar', 'remove', 'upload', 'subir', 'save', 'guardar',
  'overwrite', 'sobrescribir', 'publish', 'publicar', 'store', 'almacenar', 'run', 'execute', 'ejecutar',
  'encolar', 'schedule', 'programar', 'submit', 'launch', 'lanzar', 'start', 'iniciar', 'cancel', 'cancelar',
  'generate', 'generar', 'dispatch', 'despachar', 'trigger', 'disparar', 'invoke', 'invocar', 'call', 'llamar',
  'send', 'enviar', 'process', 'procesar', 'materialize', 'materializar', 'render', 'renderizar', 'retry', 'reintentar']);
/** Lo que une palabras sin nombrar nada: `nombreDelProveedor`, `claveDeApi`. */
const CONECTORES: ReadonlySet<string> = new Set(['de', 'del', 'la', 'el', 'en', 'para', 'por', 'of', 'the', 'for', 'to']);
/** Solo para despegar compuestos (`providerid`, `baseurl`). Solas no cruzan. */
const PEGAMENTO = ['name', 'nombre', 'key', 'clave', 'url', 'uri', 'path', 'ruta', 'version', 'type', 'tipo', 'account', 'cuenta'];

const RAICES = conceptos.flatMap((c) => [...(c.nombres ?? []), ...(c.cantidades ?? []), ...(c.objetos ?? []), ...(c.pares ?? []).flat()]);
const LEXICO: ReadonlySet<string> = new Set([...TOPES, ...IDENTIFICADORES, ...ACCIONES, ...CONECTORES, ...PEGAMENTO, ...RAICES]);
/** Si una palabra pegada no contiene ninguna raíz, no hay nada que despegar. */
const PISTA = new RegExp(RAICES.filter((w) => w.length >= 3).join('|'));

/* ── Leer una clave ───────────────────────────────────────────────────────── */

/** Acentos, diéresis y la tilde de la ñ (que NFKD separa de su letra), y lo invisible. */
const MARCAS = /\p{M}/gu;
const INVISIBLES = /\p{Cf}/gu;
const limpiar = (clave: string): string => clave.normalize('NFKD').replace(MARCAS, '').replace(INVISIBLES, '');

/**
 * ¿Es un DATO hecho clave? Lo que lleva `|`, `=` o `:` —`metrica|providerId=p`, la clave
 * con que A7 agrega; `JOB:puente`, un id— describe lo que pasó: solo lo lee la lista del
 * Planner, exactamente como hasta ahora. Cualquier otra puntuación (`$`, `/`, `@`, `+`…)
 * separa palabras: `provider/name` y `api+key` se leen. (Revisión de la misión: la regla de
 * antes —solo letras, dígitos, `_`, `-`, `.` y espacios— dejaba sin leer `$vendor` o
 * `@model`.)
 */
const ES_UN_DATO = /[|=:]/;
/**
 * Lo que se lee de una clave, como mucho, TAL COMO LLEGA: más allá, una clave no es un nombre sino
 * un abuso. Se recorta ANTES de normalizar: NFKD puede alargar un carácter hasta 18 veces, y
 * recortar después dejaría fuera lo que venía detrás (segunda pasada de la revisión).
 */
const MAX_LECTURA = 1024;

/**
 * LO LEGÍTIMO QUE, PARTIDO, NOMBRARÍA A OTRO. Un modelo 3D es un TIPO de material, no elegir un
 * modelo: `model3d`, `model3D`, `modelo_3d`, `3dModel`… se protegen ANTES de partir la clave,
 * para que la separación de letras y dígitos no deje un `model` suelto.
 */
const LEGITIMAS_PEGADAS = /(?:modelado|modelo|model)[\s_.-]?3d|3d[\s_.-]?(?:modelo|model)/gi;

/** La palabra del léxico que es, sin su plural: `proveedores` → `proveedor`. */
const delLexico = (w: string): string | undefined => {
  if (LEXICO.has(w)) return w;
  if (w.endsWith('s') && LEXICO.has(w.slice(0, -1))) return w.slice(0, -1);
  if (w.endsWith('es') && LEXICO.has(w.slice(0, -2))) return w.slice(0, -2);
  return undefined;
};

/**
 * UNA PALABRA PEGADA, DESPEGADA con el mismo léxico: `providerid` → provider·id.
 * Solo si se puede leer ENTERA en palabras del léxico: `feedback` no es fee·dback ni
 * `payload` pay·load, porque `dback` y `load` no son palabras de nadie.
 */
const despegar = (t: string): readonly string[] => {
  if (t.length > 64) return [t];
  const trozos = new Array<number>(t.length + 1).fill(Infinity);
  const desde = new Array<number>(t.length + 1).fill(-1);
  trozos[0] = 0;
  for (let i = 0; i < t.length; i++) {
    if (trozos[i] === Infinity) continue;
    for (let j = i + 2; j <= Math.min(t.length, i + 16); j++) {
      if (delLexico(t.slice(i, j)) !== undefined && trozos[i] + 1 < trozos[j]) { trozos[j] = trozos[i] + 1; desde[j] = i; }
    }
  }
  if (trozos[t.length] === Infinity || trozos[t.length] < 2) return [t];
  const palabras: string[] = [];
  for (let j = t.length; j > 0; j = desde[j]) palabras.unshift(t.slice(desde[j], j));
  return palabras;
};

const palabrasDe = (limpia: string): readonly string[] => limpia
  .replace(LEGITIMAS_PEGADAS, (m) => ` ${m.toLowerCase().replace(/[^a-z0-9]/g, '')} `)
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  /* Siglas pegadas a una palabra (`HTTPServer` → HTTP·Server), en tiempo LINEAL: cada mayúscula se mira una vez. */
  .replace(/([A-Z])(?=[A-Z][a-z])/g, '$1 ')
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter((t) => t.length > 0)
  /* Letras y dígitos, aparte (`provider2` → provider·2, `accessToken2` → access·token·2), salvo lo legítimo. */
  .flatMap((t) => (EXCEPCIONES.has(t) ? [t] : t.match(/[a-z]+|[0-9]+/g) ?? []))
  .flatMap((t) => (delLexico(t) !== undefined || !PISTA.test(t) ? [t] : despegar(t)))
  .map((t) => delLexico(t) ?? t);

/** LO QUE UNA CLAVE DICE, en palabras. Exportada para poder probar la lectura. */
export const palabrasDeClave = (clave: string): readonly string[] => palabrasDe(limpiar(String(clave)));

/* ── De quién es ──────────────────────────────────────────────────────────── */

const DUENO_DE: ReadonlyMap<string, string> = new Map(EFECTOS_PROHIBIDOS.map((e) => [e.efecto, e.dueno] as [string, string]));
const cruceDe = (efecto: string): CruceDeAutoridad =>
  Object.freeze({ efecto, dueno: DUENO_DE.get(efecto) ?? 'sin dueño declarado: falta en EFECTOS_PROHIBIDOS' });

/**
 * LAS RAÍCES LARGAS, dentro de una palabra que no se deja leer. `despegar` solo parte una
 * palabra pegada si la puede leer ENTERA con el léxico, así que `textmodel`, `aiprovider` o
 * `provider2` quedaban enteras y sin dueño. Para eso, los nombres de cinco letras o más de
 * cada concepto se buscan DENTRO de las palabras ajenas al léxico. Los cortos (`api`, `pay`,
 * `pago`, `http`) no: dentro de `capital` o de `payload` no nombran nada.
 *
 * `EXCEPCIONES` es lo legítimo que contiene una raíz larga sin nombrarla, cada una con su porqué
 * (segunda pasada de la revisión: todas cruzaban, y alguna es vocabulario de Weë):
 *  · un modelo 3D es un TIPO de material, no elegir un modelo: `model3d`, `modelo3d`,
 *    `modelado3d`, `3dmodel`, `3dmodelo` (ver `LEGITIMAS_PEGADAS`);
 *  · `remodel`, `remodelar`, `remodelacion`: una intención de Weë Home (`HOME_ALIAS` en
 *    creator/templates.ts); `modeling`, `modelling`, `modelado`: la actividad, no un modelo;
 *  · `apagar` y `propagar` contienen `pagar` y no pagan nada;
 *  · `engineering` (`promptEngineering`), `secretary`/`secretaria` (un cargo),
 *    `transactional` (una cualidad) y `bucketlist` (una lista): contienen una raíz y no la nombran.
 * Una que falte se rechaza: un fallo que se ve, y se añade aquí con su porqué.
 */
const LARGA = 5;
const EXCEPCIONES: ReadonlySet<string> = new Set(['model3d', 'modelo3d', 'modelado3d', '3dmodel', '3dmodelo',
  'remodel', 'remodelar', 'remodelacion', 'modeling', 'modelling', 'modelado', 'apagar', 'propagar',
  'engineering', 'secretary', 'secretaria', 'transactional', 'bucketlist']);

interface Compilado {
  cruce: CruceDeAutoridad;
  /** Las raíces largas del concepto, en UNA expresión: una pasada por palabra, no palabras × raíces. */
  raicesLargas: RegExp | undefined;
  nombres: ReadonlySet<string>;
  pares: readonly (readonly [string, string])[];
  cantidades: ReadonlySet<string>;
  objetos: ReadonlySet<string>;
}
const CABECERA = cruceDe('leer un secreto');
const COMPILADOS: readonly Compilado[] = conceptos.map((c) => ({
  cruce: cruceDe(c.efecto),
  raicesLargas: (() => {
    const largas = (c.nombres ?? []).filter((w) => w.length >= LARGA);
    return largas.length ? new RegExp(largas.join('|')) : undefined;
  })(),
  nombres: new Set(c.nombres ?? []),
  pares: c.pares ?? [],
  cantidades: new Set(c.cantidades ?? []),
  objetos: new Set(c.objetos ?? []),
}));
const alguna = (palabras: readonly string[], de: ReadonlySet<string>): boolean => palabras.some((p) => de.has(p));
/**
 * UN ACTO, con el verbo DELANTE de su objeto: `runJob`, `createAsset`, `retryJob`. Al revés es una
 * frase nominal que DESCRIBE —`jobRetryPolicy`, `materialRender`— y no cruza (segunda pasada).
 */
const verboAntesDe = (palabras: readonly string[], objetos: ReadonlySet<string>): boolean => {
  let hayVerbo = false;
  for (const p of palabras) {
    if (ACCIONES.has(p)) hayVerbo = true;
    else if (hayVerbo && objetos.has(p)) return true;
  }
  return false;
};
/** La cabecera de autorización, como la nombra `CAMPOS_PROHIBIDOS`: la clave ENTERA. */
const SECRETOS_EXACTOS: ReadonlySet<string> = new Set(['authorization']);

/**
 * ¿DE QUIÉN ES LO QUE NOMBRA ESTA CLAVE? `undefined` si de nadie de fuera de esta capa.
 *
 * Solo añade: no sabe nada de la lista del Planner y no puede desdecirla.
 */
export const responsabilidadDeClave = (clave: string): CruceDeAutoridad | undefined => {
  if (typeof clave !== 'string') return undefined;
  const limpia = limpiar(clave.slice(0, MAX_LECTURA));
  if (ES_UN_DATO.test(limpia)) return undefined;
  if (SECRETOS_EXACTOS.has(limpia.toLowerCase().replace(/[^a-z0-9]/g, ''))) return CABECERA;
  const palabras = palabrasDe(limpia);
  const ajenas = [...new Set(palabras.filter((p) => !LEXICO.has(p) && !EXCEPCIONES.has(p)))];
  const seguidas = palabras.filter((p) => !CONECTORES.has(p));
  const actua = alguna(palabras, ACCIONES);
  const esTope = alguna(palabras, TOPES) && !alguna(palabras, IDENTIFICADORES) && !actua;
  for (const c of COMPILADOS) {
    if (alguna(palabras, c.nombres)) return c.cruce;
    if (c.raicesLargas && ajenas.some((p) => c.raicesLargas!.test(p))) return c.cruce;
    if (c.pares.some(([a, b]) => seguidas.some((p, i) => p === a && seguidas[i + 1] === b))) return c.cruce;
    if (!esTope && alguna(palabras, c.cantidades)) return c.cruce;
    if (verboAntesDe(palabras, c.objetos)) return c.cruce;
  }
  return undefined;
};

const POR_EL_PLANNER = cruceDe('elegir proveedor o modelo');

/** LA FRONTERA DE UNA CLAVE: la lista del Planner primero, en cualquier forma; después, la responsabilidad. */
export const cruceDeClave = (clave: string): CruceDeAutoridad | undefined =>
  claveDeImplementacion(clave) ? POR_EL_PLANNER : responsabilidadDeClave(clave);

/**
 * ¿INTENTA ESTE OBJETO HACER LO QUE ES DE OTRO?
 *
 * Recorre en profundidad y con TOPE. Sin el tope, un objeto con una referencia
 * circular o con diez mil claves convierte la comprobación de seguridad en la
 * caída que venía a evitar — y lo que se inspecciona aquí puede haberlo
 * construido un algoritmo, es decir, código que todavía no existe.
 *
 * Devuelve TODAS las violaciones, no la primera, y cada una dice de quién era.
 */
export const violacionesEn = (valor: unknown, donde: string, maxProfundidad = 8): readonly ViolacionDeAutoridad[] => {
  const salida: ViolacionDeAutoridad[] = [];
  const vistos = new Set<unknown>();
  /* Las claves se repiten —`id`, `capability`, `steps`—: cada una se lee una vez por recorrido. */
  const leidas = new Map<string, CruceDeAutoridad | null>();
  const leida = (clave: string): CruceDeAutoridad | null => {
    let c = leidas.get(clave);
    if (c === undefined) { c = cruceDeClave(clave) ?? null; leidas.set(clave, c); }
    return c;
  };
  let restantes = 4096;

  const recorrer = (v: unknown, ruta: string, nivel: number): void => {
    if (nivel > maxProfundidad || restantes <= 0) return;
    if (typeof v !== 'object' || v === null) return;
    if (vistos.has(v)) return;
    vistos.add(v);
    if (Array.isArray(v)) {
      for (const item of v) { if (restantes-- <= 0) return; recorrer(item, ruta, nivel + 1); }
      return;
    }
    for (const [clave, item] of Object.entries(v as Record<string, unknown>)) {
      if (restantes-- <= 0) return;
      const cruce = leida(clave);
      if (cruce) salida.push({ donde: ruta, clave, ...cruce });
      recorrer(item, ruta, nivel + 1);
    }
  };

  recorrer(valor, donde, 0);
  return salida;
};

/**
 * UNA ESTRATEGIA, REVISADA CONTRA LA FRONTERA.
 *
 * Se mira el `input` de cada paso —que es donde cabría— y también el resto de
 * la estrategia, porque la puerta de atrás nunca está donde se la espera: en
 * B3.15.2 el campo se coló por `input`, y la próxima vez podría venir en una
 * propuesta de recuperación o en una etiqueta.
 *
 * `capability` y `purpose` no se inspeccionan como texto: una capacidad es del
 * catálogo del Core y decir `voice.tts` es declarar QUÉ hace falta, no CON QUÉ.
 * Esa distinción es la que hace que el Planner pueda existir.
 */
export const violacionesDeEstrategia = (s: Strategy): readonly ViolacionDeAutoridad[] => {
  const salida: ViolacionDeAutoridad[] = [];
  for (const paso of s?.steps ?? []) {
    salida.push(...violacionesEn(paso.input, `strategy:${s.id}:step:${paso.id}:input`));
    salida.push(...violacionesEn(paso.hints, `strategy:${s.id}:step:${paso.id}:hints`));
    /* Y la clave suelta en la raíz del paso, que es la otra forma de colarlo. */
    for (const clave of Object.keys(paso)) {
      const cruce = cruceDeClave(clave);
      if (cruce) salida.push({ donde: `strategy:${s.id}:step:${paso.id}`, clave, ...cruce });
    }
  }
  salida.push(...violacionesEn(s?.recovery, `strategy:${s?.id}:recovery`));
  salida.push(...violacionesEn(s?.checkpoints, `strategy:${s?.id}:checkpoints`));
  salida.push(...violacionesEn(s?.parallelGroups, `strategy:${s?.id}:parallelGroups`));
  return salida;
};

/** ¿Respeta la frontera? */
export const respetaLaFrontera = (s: Strategy): boolean => violacionesDeEstrategia(s).length === 0;

/**
 * ¿TODO LO QUE CRUZÓ ERA ELEGIR PROVEEDOR O MODELO? Entonces la frase de siempre —«eso lo elige el
 * Router»— es verdad. Si no, no lo es: un secreto, un cobro o una dirección de API no son del Router,
 * y el rechazo tiene que decir de quién son (`duenosDe`).
 */
export const sonDelRouter = (v: readonly ViolacionDeAutoridad[]): boolean =>
  v.every((x) => x.efecto === 'elegir proveedor o modelo');

/** Cada clave que cruzó con el dueño de lo que intentaba, una vez y en orden: `apiKey → nadie en el Core: …`. */
export const duenosDe = (v: readonly ViolacionDeAutoridad[]): string =>
  [...new Map(v.map((x) => [x.clave, x] as [string, ViolacionDeAutoridad])).values()]
    .map((x) => `${x.clave} → ${x.dueno}`).sort().join('; ');
