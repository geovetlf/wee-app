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
 *   3. SE ABRE POR CAPACIDAD, Y PRIMERO PARA CUENTAS CONCRETAS. Con `cuentas`,
 *      solo esas cuentas pasan por el Core: así se prueba en producción con una
 *      cuenta controlada y sin que ninguna persona real sea el sujeto de la
 *      prueba. Sin `cuentas`, pasa todo el mundo… salvo por una puerta que
 *      declare EN SU CÓDIGO que la lista es obligatoria (`listaObligatoria`):
 *      ahí, sin lista o con la lista vacía, no pasa NADIE. Es la del mundo 3D
 *      durante su canary (`creator/mundo.ts`): la configuración puede añadir
 *      cuentas a la prueba, pero quitar la lista no la abre para todos.
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

export interface ConfiguracionDePuerta {
  habilitado: boolean;
  /** Capacidades que ya pueden ir por el Core. Una que no esté aquí va por donde siempre. */
  capacidades: readonly string[];
  /** Si está, SOLO estas cuentas. Para probar con una cuenta controlada. */
  cuentas?: readonly string[];
  /** Si está, SOLO estos productos (`brain`, `studio`…). */
  experiencias?: readonly string[];
}

export type MotivoDePuerta =
  | 'abierta'
  | 'deshabilitada'
  | 'configuracion_ilegible'
  | 'capacidad_no_migrada'
  /* La puerta exige lista de cuentas y la configuración no trae ninguna (o la trae vacía): no pasa nadie. */
  | 'sin_lista_de_cuentas'
  | 'cuenta_fuera_de_la_prueba'
  | 'experiencia_no_migrada';

export interface DecisionDePuerta {
  runtime: RuntimeElegido;
  motivo: MotivoDePuerta;
}

export const PUERTA_CERRADA: ConfiguracionDePuerta = Object.freeze({ habilitado: false, capacidades: Object.freeze([]) as readonly string[] });

const FORMA_DE_CAPACIDAD = /^[a-z0-9]+\.[a-z0-9_]+$/;
const FORMA_DE_ETIQUETA = /^[A-Za-z0-9_.:-]{1,160}$/;
const MAX_LISTA = 256;

const lista = (crudo: unknown, forma: RegExp): readonly string[] | undefined => {
  if (!Array.isArray(crudo) || crudo.length > MAX_LISTA) return undefined;
  if (!crudo.every((v) => typeof v === 'string' && forma.test(v))) return undefined;
  return Object.freeze([...new Set(crudo as string[])]);
};

/**
 * De lo que haya guardado a una configuración en la que se puede confiar.
 *
 * Estricta a propósito: una lista con un elemento raro no se «limpia», se
 * descarta la configuración entera. Medio entender una configuración que decide
 * por dónde pasa el dinero es peor que no entenderla.
 */
export const leerPuerta = (crudo: unknown): { ok: true; config: ConfiguracionDePuerta } | { ok: false } => {
  if (crudo === null || typeof crudo !== 'object' || Array.isArray(crudo)) return { ok: false };
  const c = crudo as Record<string, unknown>;
  if (typeof c.habilitado !== 'boolean') return { ok: false };
  const capacidades = lista(c.capacidades, FORMA_DE_CAPACIDAD);
  if (!capacidades) return { ok: false };
  const cuentas = c.cuentas === undefined ? undefined : lista(c.cuentas, FORMA_DE_ETIQUETA);
  if (c.cuentas !== undefined && !cuentas) return { ok: false };
  const experiencias = c.experiencias === undefined ? undefined : lista(c.experiencias, FORMA_DE_ETIQUETA);
  if (c.experiencias !== undefined && !experiencias) return { ok: false };
  return {
    ok: true,
    config: Object.freeze({
      habilitado: c.habilitado,
      capacidades,
      ...(cuentas ? { cuentas } : {}),
      ...(experiencias ? { experiencias } : {}),
    }),
  };
};

export const decidirRuntime = (
  crudo: unknown,
  contexto: {
    capability: string;
    userId: string;
    experienceId?: string;
    /**
     * LA LISTA DE CUENTAS ES OBLIGATORIA PARA ESTA PUERTA. Lo declara la puerta en su código, nunca la
     * configuración: sin `cuentas`, o con `cuentas: []`, la respuesta es `legacy` para todo el mundo.
     */
    listaObligatoria?: boolean;
  },
): DecisionDePuerta => {
  const leida = leerPuerta(crudo);
  if (!leida.ok) return { runtime: 'legacy', motivo: crudo === undefined || crudo === null ? 'deshabilitada' : 'configuracion_ilegible' };
  const { config } = leida;
  if (!config.habilitado) return { runtime: 'legacy', motivo: 'deshabilitada' };
  if (!config.capacidades.includes(contexto.capability)) return { runtime: 'legacy', motivo: 'capacidad_no_migrada' };
  if (contexto.listaObligatoria === true && !config.cuentas?.length) return { runtime: 'legacy', motivo: 'sin_lista_de_cuentas' };
  if (config.cuentas && !config.cuentas.includes(contexto.userId)) return { runtime: 'legacy', motivo: 'cuenta_fuera_de_la_prueba' };
  if (config.experiencias && (!contexto.experienceId || !config.experiencias.includes(contexto.experienceId))) {
    return { runtime: 'legacy', motivo: 'experiencia_no_migrada' };
  }
  return { runtime: 'core', motivo: 'abierta' };
};
