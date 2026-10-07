/**
 * WEË RUNTIME — LA PUERTA: ¿ESTA OPERACIÓN VA POR EL CORE O POR DONDE SIEMPRE?
 *
 * La migración del runtime es capacidad a capacidad, y cada una tiene que poder
 * volver atrás en segundos y sin desplegar nada. Esto es el interruptor. No
 * ejecuta nada: recibe una configuración y un contexto y contesta por dónde.
 *
 * ── Las tres reglas ─────────────────────────────────────────────────────────
 *
 *   1. CERRADA POR DEFECTO. Sin configuración, con una configuración que no se
 *      entiende o con un error al leerla, la respuesta es `legacy`. La puerta no
 *      puede abrirse por accidente: solo porque alguien la abrió.
 *   2. VOLVER ATRÁS ES UN BOOLEANO. `habilitado: false` manda sobre todo lo
 *      demás. No hay que vaciar listas ni tocar nada más.
 *   3. SE ABRE POR CAPACIDAD, Y CADA CAPACIDAD CON SU PROPIA LISTA DE CUENTAS.
 *      Cada puerta del conductor declara EN SU CÓDIGO la capacidad que manda al
 *      Core (`brainChat` → `text.generate`, `generateVideo` → `video.generate`,
 *      `generateWorld` → `world.generate`), y aquí se mira la lista de ESA
 *      capacidad y de ninguna otra:
 *
 *        aiSettings/runtime
 *          habilitado: true
 *          porCapacidad:
 *            'world.generate':  { cuentas: [<uid>], experiencias?: ['studio'] }
 *            'video.generate':  { cuentas: [<uid>], habilitado?: false }
 *
 *      La lista es OBLIGATORIA para todas: una capacidad sin entrada, una
 *      entrada sin lista o con la lista vacía no deja pasar a NADIE. No hay
 *      lista global, ni comodín, ni una lista que sirva de respaldo de otra: la
 *      del mundo no abre el vídeo y la del vídeo no abre el mundo, y poner o
 *      quitar cuentas de una no toca las demás. `habilitado: false` dentro de
 *      una capacidad la cierra a ella sola, con su lista intacta. La configuración puede cerrar
 *      una capacidad o mover cuentas dentro de su lista; quitar la obligación,
 *      no puede (decisión del dueño, 2026-10-06: «separar allowlist por
 *      capability»).
 *
 * ── La forma de antes no se lee ─────────────────────────────────────────────
 *
 * Hasta el 2026-10-06 la puerta llevaba UNA lista para todas (`cuentas`) junto
 * a `capacidades`, y sin `cuentas` dejaba pasar a todo el mundo. Un documento
 * con esa forma —`capacidades`, `cuentas` o `experiencias` en lo alto— se da
 * por ilegible y CIERRA: leerlo a medias sería volver a esa regla. Y al revés
 * también cierra: el código de antes no encuentra `capacidades` en un
 * documento de ahora y lo da por ilegible, así que un documento escrito para
 * esta puerta nunca abre una puerta antigua para todos.
 *
 * ── Lo que NO decide ────────────────────────────────────────────────────────
 *
 * Ni el proveedor, ni el modelo, ni el precio. Una operación cuesta lo mismo
 * por un camino que por el otro; si no, no sería una migración.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA camino del Core: es una función pura
 * que consultan las puertas del conductor (`brainChat`, `generateVideo`,
 * `generateWorld`) con lo que leen de `aiSettings/runtime`, y esa configuración
 * está CERRADA, así que contesta siempre `legacy`.
 */

export type RuntimeElegido = 'core' | 'legacy';

/** Lo que abre UNA capacidad: sus cuentas y, si se quiere acotar más, sus productos. */
export interface PuertaDeCapacidad {
  /** `false` cierra SOLO esta capacidad, con su lista intacta: volver atrás también es un booleano por capacidad. */
  habilitado?: boolean;
  /** SOLO estas cuentas, por igualdad exacta. Sin lista, o vacía, no pasa nadie. */
  cuentas?: readonly string[];
  /** Si está, SOLO estos productos (`brain`, `studio`…). */
  experiencias?: readonly string[];
}

export interface ConfiguracionDePuerta {
  habilitado: boolean;
  /** Las capacidades que ya pueden ir por el Core, cada una con lo suyo. Una que no esté aquí va por donde siempre. */
  porCapacidad: Readonly<Record<string, PuertaDeCapacidad>>;
}

export type MotivoDePuerta =
  | 'abierta'
  | 'deshabilitada'
  | 'configuracion_ilegible'
  | 'capacidad_no_migrada'
  /* La capacidad está, pero sin lista de cuentas (o con la lista vacía): no pasa nadie. */
  | 'sin_lista_de_cuentas'
  | 'cuenta_fuera_de_la_prueba'
  | 'experiencia_no_migrada';

export interface DecisionDePuerta {
  runtime: RuntimeElegido;
  motivo: MotivoDePuerta;
}

export const PUERTA_CERRADA: ConfiguracionDePuerta = Object.freeze({ habilitado: false, porCapacidad: Object.freeze({}) });

const FORMA_DE_CAPACIDAD = /^[a-z0-9]+\.[a-z0-9_]+$/;
/* Una cuenta o un producto, por su nombre exacto. Ni «*» ni ningún otro carácter de patrón: no hay comodín. */
const FORMA_DE_ETIQUETA = /^[A-Za-z0-9_.:-]{1,160}$/;
const MAX_LISTA = 256;
/* La forma de antes (una lista para todas). Si aparece, el documento no es de esta puerta: se cierra. */
const CAMPOS_DE_ANTES = ['capacidades', 'cuentas', 'experiencias'] as const;

const esObjeto = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const propio = (o: object, clave: string): boolean => Object.prototype.hasOwnProperty.call(o, clave);

const lista = (crudo: unknown, forma: RegExp): readonly string[] | undefined => {
  if (!Array.isArray(crudo) || crudo.length > MAX_LISTA) return undefined;
  if (!crudo.every((v) => typeof v === 'string' && forma.test(v))) return undefined;
  return Object.freeze([...new Set(crudo as string[])]);
};

/** Lo de UNA capacidad. Una lista presente y rota invalida todo el documento; una lista ausente es «sin lista». */
const leerCapacidad = (crudo: unknown): PuertaDeCapacidad | undefined => {
  if (!esObjeto(crudo)) return undefined;
  /* Un `habilitado` que no es un booleano no se adivina: el documento entero se da por ilegible. */
  if (propio(crudo, 'habilitado') && typeof crudo.habilitado !== 'boolean') return undefined;
  const cuentas = propio(crudo, 'cuentas') ? lista(crudo.cuentas, FORMA_DE_ETIQUETA) : undefined;
  if (propio(crudo, 'cuentas') && !cuentas) return undefined;
  const experiencias = propio(crudo, 'experiencias') ? lista(crudo.experiencias, FORMA_DE_ETIQUETA) : undefined;
  if (propio(crudo, 'experiencias') && !experiencias) return undefined;
  return Object.freeze({
    ...(crudo.habilitado === false ? { habilitado: false } : {}),
    ...(cuentas ? { cuentas } : {}),
    ...(experiencias ? { experiencias } : {}),
  });
};

/**
 * De lo que haya guardado a una configuración en la que se puede confiar.
 *
 * Estricta a propósito: una lista con un elemento raro no se «limpia», se
 * descarta la configuración entera. Medio entender una configuración que decide
 * por dónde pasa el dinero es peor que no entenderla. Una clave que no conoce
 * se ignora —nunca abre más de lo que abren las que sí conoce—, salvo los
 * campos de la forma de antes, que cierran.
 */
export const leerPuerta = (crudo: unknown): { ok: true; config: ConfiguracionDePuerta } | { ok: false } => {
  if (!esObjeto(crudo)) return { ok: false };
  if (typeof crudo.habilitado !== 'boolean') return { ok: false };
  if (CAMPOS_DE_ANTES.some((campo) => propio(crudo, campo))) return { ok: false };
  const bruto = propio(crudo, 'porCapacidad') ? crudo.porCapacidad : {};
  if (!esObjeto(bruto)) return { ok: false };
  const claves = Object.keys(bruto);
  if (claves.length > MAX_LISTA || !claves.every((c) => FORMA_DE_CAPACIDAD.test(c))) return { ok: false };
  const porCapacidad: Record<string, PuertaDeCapacidad> = {};
  for (const capacidad of claves) {
    const leida = leerCapacidad(bruto[capacidad]);
    if (!leida) return { ok: false };
    porCapacidad[capacidad] = leida;
  }
  return { ok: true, config: Object.freeze({ habilitado: crudo.habilitado, porCapacidad: Object.freeze(porCapacidad) }) };
};

/**
 * POR DÓNDE VA ESTA OPERACIÓN. La capacidad es la que la puerta declara en su código, y la cuenta, la del principal
 * autenticado: ninguna de las dos la manda el cliente. El orden es el de siempre: habilitada → capacidad → SU lista →
 * cuenta → producto.
 */
export const decidirRuntime = (
  crudo: unknown,
  contexto: { capability: string; userId: string; experienceId?: string },
): DecisionDePuerta => {
  /*
   * `habilitado: false` MANDA PRIMERO, sea cual sea el resto: la puerta queda igual de cerrada, y el motivo dice lo que
   * es —cerrada a propósito— y no «ilegible». Es el estado de producción de RUNTIME §21.3 (`{ habilitado: false,
   * capacidades: [] }`, la forma de antes): así su registro sigue distinguiendo «cerrada» de «configuración rota».
   */
  if (esObjeto(crudo) && crudo.habilitado === false) return { runtime: 'legacy', motivo: 'deshabilitada' };
  const leida = leerPuerta(crudo);
  if (!leida.ok) return { runtime: 'legacy', motivo: crudo === undefined || crudo === null ? 'deshabilitada' : 'configuracion_ilegible' };
  const { config } = leida;
  if (!config.habilitado) return { runtime: 'legacy', motivo: 'deshabilitada' };
  const suya = propio(config.porCapacidad, contexto.capability) ? config.porCapacidad[contexto.capability] : undefined;
  if (!suya) return { runtime: 'legacy', motivo: 'capacidad_no_migrada' };
  if (suya.habilitado === false) return { runtime: 'legacy', motivo: 'deshabilitada' };
  if (!suya.cuentas?.length) return { runtime: 'legacy', motivo: 'sin_lista_de_cuentas' };
  if (!suya.cuentas.includes(contexto.userId)) return { runtime: 'legacy', motivo: 'cuenta_fuera_de_la_prueba' };
  if (suya.experiencias && (!contexto.experienceId || !suya.experiencias.includes(contexto.experienceId))) {
    return { runtime: 'legacy', motivo: 'experiencia_no_migrada' };
  }
  return { runtime: 'core', motivo: 'abierta' };
};
