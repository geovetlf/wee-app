import { CREATIVE_PARAMETERS_VERSION } from './contracts';

/**
 * WEE CREATIVE PARAMETERS — EL LENGUAJE INTERNO DE LA INTENCIÓN.
 *
 * ── Para qué existe, dicho como se siente ───────────────────────────────────
 *
 * Alguien escribe «quiero que la cámara se aleje lentamente desde arriba». No
 * escribe `dolly_out`, ni `aerial`, ni `Drone View`, ni el nombre de ningún
 * modelo — y no tiene por qué. Nadie debería aprender a hablarle a Weë.
 *
 * Esto es lo que Weë entiende POR DENTRO cuando alguien dice eso:
 *
 *     camera.type     = aerial
 *     movement.type   = dolly_out
 *     movement.speed  = slow
 *
 * Es un vocabulario cerrado que viaja con la petición para que el Planner, los
 * Skills y el adaptador puedan razonar sobre la misma intención sin volver a
 * interpretar un texto. **Es el idioma de Weë, no el idioma de quien usa Weë.**
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 * No es un prompt. No es un parámetro de modelo. No es una carga de API. No es
 * metadatos sueltos. Y sobre todo NO es un `Record<string, unknown>`: un cajón
 * abierto aquí sería, en seis meses, `creative.providerId`,
 * `creative.endpoint`, `creative.klingMode`. Por eso cada grupo tiene sus
 * claves y cada clave sus valores, y lo que no está no entra.
 *
 * Esa cerrazón es también toda la defensa que necesita: una estructura con
 * profundidad dos, sin arrays, sin texto libre y con listas blancas en cada
 * nivel no tiene por dónde recibir una credencial, un endpoint ni un objeto
 * profundo. No hay que prohibir `apiKey`: no cabe.
 *
 * ── Y no dice con qué ───────────────────────────────────────────────────────
 *
 * `movement.type = orbit` es lo que se quiere conseguir. CÓMO se consigue —si
 * el modelo lo soporta, cómo se le pide, con qué campo— es del Registry, del
 * Router y del adaptador, exactamente igual que con las capacidades. Aquí no
 * aparece el nombre de ningún proveedor y hay pruebas que lo vigilan.
 *
 * ── Por dónde viaja ─────────────────────────────────────────────────────────
 *
 * Por la costura que ya existía. `ExecutionHints` —«requisitos abstractos del
 * resultado, nunca una implementación»— ya iba de Brain al adaptador entera:
 *
 *   Brain.options.hints → understanding.preferences → PlannerRequest.hints
 *     → Plan.hints → PlanStep.hints → WorkflowStep.hints → StepDispatch.hints
 *     → ExecutionOptions.hints → adaptador
 *
 * Y TODA esa cadena valida con el mismo lector, `leerHints`. Así que esto entra
 * por ahí y por ningún otro sitio: ni un canal nuevo, ni un campo paralelo, ni
 * una cola propia. Un solo campo opcional en un contrato que ya viajaba.
 */

/* ── El vocabulario ───────────────────────────────────────────────────────── */

/** Desde dónde se mira. */
export type CameraType =
  | 'aerial' | 'ground' | 'handheld' | 'pov' | 'macro' | 'overhead' | 'underwater';

/** A qué altura está el ojo. Distinto de la cámara: se puede volar y mirar de frente. */
export type PerspectiveType = 'eye_level' | 'low_angle' | 'high_angle' | 'aerial';

/** Cuánto entra en el encuadre. */
export type ShotType = 'establishing' | 'wide' | 'medium' | 'close_up' | 'extreme_close_up' | 'hero';

/** Qué óptica. Abstracción de Weë: `wide` no es el nombre de nada de nadie. */
export type LensType = 'wide' | 'standard' | 'telephoto' | 'macro' | 'fisheye';

/** Qué hace la cámara. */
export type MovementType =
  | 'static' | 'dolly_in' | 'dolly_out' | 'tracking' | 'orbit' | 'pan' | 'tilt'
  | 'crane_up' | 'crane_down' | 'push_in' | 'pull_out' | 'follow';

/** A qué ritmo. */
export type MotionSpeed = 'slow' | 'normal' | 'fast';

/** Con qué carácter. Distinto de la velocidad: se puede ir rápido y suave. */
export type MotionSmoothness = 'smooth' | 'natural' | 'dynamic';

/** Qué luz. */
export type LightingType =
  | 'natural' | 'golden_hour' | 'blue_hour' | 'studio' | 'dramatic' | 'soft' | 'high_contrast' | 'night';

/** Cómo se ordena lo que se ve. */
export type CompositionType =
  | 'centered' | 'rule_of_thirds' | 'symmetrical' | 'negative_space' | 'foreground_depth';

/** Cómo se pasa de una toma a otra. */
export type TransitionType = 'cut' | 'dissolve' | 'fade' | 'match_cut' | 'whip' | 'seamless';

/**
 * La forma del lienzo. Se escribe como se dice y NO se convierte a número: un
 * `1.777…` obligaría a que todo el mundo redondeara igual, y `9:16` es lo que
 * la persona reconoce.
 */
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9';

/* ── El contrato ──────────────────────────────────────────────────────────── */

/**
 * LA INTENCIÓN CREATIVA, ESTRUCTURADA.
 *
 * Ocho grupos y trece rutas. No están todos los conceptos del cine, y es a
 * propósito: un catálogo enorme de campos que nadie rellena no describe mejor
 * una intención, solo da más sitios donde equivocarse. Crece cuando un Skill
 * real necesite algo que hoy no cabe, y entonces sube la versión.
 *
 * ── Lo que NO está aquí, y dónde está ───────────────────────────────────────
 *
 * `durationSec` y `quality` NO se repiten aquí. Ya existen en `ExecutionHints`
 * desde la Fase 2, viajan por el mismo sitio y el Router ya los sabe leer.
 * Ponerlos también aquí sería tener dos verdades sobre cuánto dura un vídeo, y
 * el día que discreparan alguien tendría que decidir cuál gana.
 */
export interface CreativeParameters {
  /**
   * LA VERSIÓN DEL LENGUAJE, no la del contrato del archivo. Un entero, como
   * la versión de un Skill: un plan guardado con la 1 se sigue leyendo como la
   * 1 aunque exista la 2. Sin semver, porque nada depende de esto por rango.
   */
  version: number;
  camera?: { type?: CameraType; perspective?: PerspectiveType };
  shot?: { type?: ShotType };
  lens?: { type?: LensType; focalLengthMm?: number };
  movement?: { type?: MovementType; speed?: MotionSpeed };
  motion?: { smoothness?: MotionSmoothness };
  lighting?: { type?: LightingType };
  composition?: { type?: CompositionType };
  transition?: { type?: TransitionType };
  framing?: { aspectRatio?: AspectRatio };
}

/**
 * TODAS LAS RUTAS, EN UNA LISTA CERRADA.
 *
 * Existe porque un Skill tiene que poder decir «yo trabajo con `movement.type`»
 * sin escribir una cadena suelta, y porque comparar dos intenciones es comparar
 * rutas. Si algún día alguien añade un campo al contrato y olvida la ruta, la
 * prueba que cuenta las dos lo dice.
 */
export const RUTAS_CREATIVAS = [
  'camera.type', 'camera.perspective',
  'shot.type',
  'lens.type', 'lens.focalLengthMm',
  'movement.type', 'movement.speed',
  'motion.smoothness',
  'lighting.type',
  'composition.type',
  'transition.type',
  'framing.aspectRatio',
] as const;

export type CreativeParameterPath = typeof RUTAS_CREATIVAS[number];

/* ── Validación ───────────────────────────────────────────────────────────── */

/*
 * Predicados propios, de tres líneas, para NO importar del Gateway: el Gateway
 * importa de aquí —`ExecutionHints` gana el campo `creative`— y una vuelta
 * entre los dos sería un ciclo. Este archivo es una hoja, como `money.ts`.
 */
const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const esNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Claves que no son datos: son formas de tocar el prototipo de un objeto. */
const PELIGROSAS = ['__proto__', 'constructor', 'prototype'];

const CAMARAS: readonly string[] = ['aerial', 'ground', 'handheld', 'pov', 'macro', 'overhead', 'underwater'];
const PERSPECTIVAS: readonly string[] = ['eye_level', 'low_angle', 'high_angle', 'aerial'];
const PLANOS: readonly string[] = ['establishing', 'wide', 'medium', 'close_up', 'extreme_close_up', 'hero'];
const OPTICAS: readonly string[] = ['wide', 'standard', 'telephoto', 'macro', 'fisheye'];
const MOVIMIENTOS: readonly string[] = ['static', 'dolly_in', 'dolly_out', 'tracking', 'orbit', 'pan', 'tilt', 'crane_up', 'crane_down', 'push_in', 'pull_out', 'follow'];
const VELOCIDADES: readonly string[] = ['slow', 'normal', 'fast'];
const SUAVIDADES: readonly string[] = ['smooth', 'natural', 'dynamic'];
const LUCES: readonly string[] = ['natural', 'golden_hour', 'blue_hour', 'studio', 'dramatic', 'soft', 'high_contrast', 'night'];
const COMPOSICIONES: readonly string[] = ['centered', 'rule_of_thirds', 'symmetrical', 'negative_space', 'foreground_depth'];
const TRANSICIONES: readonly string[] = ['cut', 'dissolve', 'fade', 'match_cut', 'whip', 'seamless'];
export const PROPORCIONES: readonly string[] = ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9'];

/** Lo más corto y lo más largo que Weë admite como distancia focal. En MILÍMETROS. */
export const FOCAL_MIN_MM = 4;
export const FOCAL_MAX_MM = 1200;

/** Grupo → sus claves y qué vale en cada una. La ÚNICA fuente de lo que existe. */
const GRUPOS: Readonly<Record<string, Readonly<Record<string, readonly string[] | 'mm'>>>> = {
  camera: { type: CAMARAS, perspective: PERSPECTIVAS },
  shot: { type: PLANOS },
  lens: { type: OPTICAS, focalLengthMm: 'mm' },
  movement: { type: MOVIMIENTOS, speed: VELOCIDADES },
  motion: { smoothness: SUAVIDADES },
  lighting: { type: LUCES },
  composition: { type: COMPOSICIONES },
  transition: { type: TRANSICIONES },
  framing: { aspectRatio: PROPORCIONES },
};

export type MotivoCreativoInvalido =
  | 'invalid_shape'
  | 'unknown_field'
  | 'dangerous_key'
  | 'invalid_version'
  | 'invalid_value'
  | 'out_of_range'
  | 'incoherent';

export interface ProblemaCreativo {
  path: string;
  reason: MotivoCreativoInvalido;
}

const mal = (path: string, reason: MotivoCreativoInvalido): ProblemaCreativo => ({ path, reason });

/**
 * LA INTENCIÓN, REVISADA ENTERA.
 *
 * Devuelve todos los problemas, no el primero. Y la interpretación lingüística
 * NO ocurre aquí: `durationSec = "hazlo largo"` no se traduce, se rechaza.
 * Entender el lenguaje es de Brain; esto ya es el resultado normalizado.
 */
export const validarCreativos = (crudo: unknown): readonly ProblemaCreativo[] => {
  if (!esObjeto(crudo)) return [mal('creative', 'invalid_shape')];
  const p: ProblemaCreativo[] = [];

  /* La versión tiene que ser SUYA: con el prototipo contaminado, `crudo.version` leería lo heredado. */
  if (!Object.prototype.hasOwnProperty.call(crudo, 'version')) p.push(mal('creative.version', 'invalid_version'));
  if (!esNum(crudo.version) || !Number.isInteger(crudo.version) || crudo.version < 1 || crudo.version > 99) {
    p.push(mal('creative.version', 'invalid_version'));
  }

  for (const [clave, valor] of Object.entries(crudo)) {
    if (PELIGROSAS.includes(clave)) { p.push(mal(`creative.${clave}`, 'dangerous_key')); continue; }
    if (clave === 'version') continue;
    const grupo = Object.prototype.hasOwnProperty.call(GRUPOS, clave) ? GRUPOS[clave] : undefined;
    if (!grupo) { p.push(mal(`creative.${clave}`, 'unknown_field')); continue; }
    if (!esObjeto(valor)) { p.push(mal(`creative.${clave}`, 'invalid_shape')); continue; }
    for (const [campo, dato] of Object.entries(valor)) {
      if (PELIGROSAS.includes(campo)) { p.push(mal(`${clave}.${campo}`, 'dangerous_key')); continue; }
      const admitido = Object.prototype.hasOwnProperty.call(grupo, campo) ? grupo[campo] : undefined;
      if (!admitido) { p.push(mal(`${clave}.${campo}`, 'unknown_field')); continue; }
      if (dato === undefined) continue;
      if (admitido === 'mm') {
        /* Un número, en MILÍMETROS, y dentro de lo que existe. `NaN` e `Infinity` no son números aquí. */
        if (!esNum(dato)) { p.push(mal(`${clave}.${campo}`, 'invalid_value')); continue; }
        if (dato < FOCAL_MIN_MM || dato > FOCAL_MAX_MM) p.push(mal(`${clave}.${campo}`, 'out_of_range'));
        continue;
      }
      if (typeof dato !== 'string' || !admitido.includes(dato)) p.push(mal(`${clave}.${campo}`, 'invalid_value'));
    }
  }

  /*
   * ── LA ÚNICA REGLA DE COHERENCIA, Y ESTÁ ARGUMENTADA ───────────────────
   *
   * Una cámara quieta no tiene velocidad. No es una prioridad inventada entre
   * dos valores —eso sería justo lo que no se debe hacer—: es que la frase se
   * contradice a sí misma, y quien la reciba tendría que adivinar cuál de las
   * dos mitades creer.
   */
  const mov = esObjeto(crudo.movement) ? crudo.movement : undefined;
  if (mov && mov.type === 'static' && mov.speed !== undefined) p.push(mal('movement.speed', 'incoherent'));

  return p;
};

export const creativosValidos = (crudo: unknown): crudo is CreativeParameters => validarCreativos(crudo).length === 0;

/* ── Leer y comparar ──────────────────────────────────────────────────────── */

/** El valor de una ruta, o `undefined`. Sin `eval`, sin índices dinámicos sueltos. */
export const valorCreativo = (p: CreativeParameters | undefined, ruta: CreativeParameterPath): string | number | undefined => {
  if (!p) return undefined;
  const [grupo, campo] = ruta.split('.');
  const g = (p as unknown as Record<string, unknown>)[grupo];
  if (!esObjeto(g)) return undefined;
  const v = g[campo];
  return typeof v === 'string' || esNum(v) ? v : undefined;
};

/** Qué rutas trae de verdad. En el orden de `RUTAS_CREATIVAS`, siempre igual. */
export const rutasDefinidas = (p: CreativeParameters | undefined): readonly CreativeParameterPath[] =>
  RUTAS_CREATIVAS.filter((r) => valorCreativo(p, r) !== undefined);

/**
 * DÓNDE SE CONTRADICEN DOS INTENCIONES.
 *
 * La misma ruta con valores distintos. Nada más, y esa sobriedad es el punto:
 * decidir que «aéreo gana a submarino» sería una prioridad inventada, y de ahí
 * salen los sistemas que hacen cosas que nadie pidió. Si dos dicen cosas
 * distintas sobre lo mismo, eso es un conflicto y se dice.
 */
export const conflictosCreativos = (
  a: CreativeParameters | undefined,
  b: CreativeParameters | undefined,
): readonly CreativeParameterPath[] =>
  RUTAS_CREATIVAS.filter((r) => {
    const x = valorCreativo(a, r);
    const y = valorCreativo(b, r);
    return x !== undefined && y !== undefined && x !== y;
  });

/**
 * JUNTAR VARIAS INTENCIONES EN UNA.
 *
 * Es lo que hace falta para que varios Skills puedan aportar a la vez —anuncio
 * de producto + fotografía de comida + vista de dron + plano héroe— sin que
 * nadie escriba un motor de composición: lo que no choca se junta, y lo que
 * choca se DEVUELVE COMO CONFLICTO, sin ganador.
 *
 * Quien lo reciba decide: preguntar, descartar un Skill, o pararse. Aquí no se
 * decide por nadie.
 */
export const componerCreativos = (
  partes: readonly (CreativeParameters | undefined)[],
): { parameters?: CreativeParameters; conflicts: readonly CreativeParameterPath[] } => {
  const presentes = partes.filter((p): p is CreativeParameters => p !== undefined);
  if (!presentes.length) return { conflicts: [] };
  const conflictos = new Set<CreativeParameterPath>();
  const valores = new Map<CreativeParameterPath, string | number>();
  for (const parte of presentes) {
    for (const r of RUTAS_CREATIVAS) {
      const v = valorCreativo(parte, r);
      if (v === undefined) continue;
      const ya = valores.get(r);
      if (ya !== undefined && ya !== v) { conflictos.add(r); continue; }
      valores.set(r, v);
    }
  }
  /* Lo que chocó NO entra: una composición no puede llevar un valor que alguien contradijo. */
  for (const r of conflictos) valores.delete(r);
  const salida: Record<string, Record<string, string | number>> = {};
  for (const [r, v] of valores) {
    const [grupo, campo] = r.split('.');
    (salida[grupo] ??= {})[campo] = v;
  }
  const version = Math.max(...presentes.map((p) => p.version));
  return {
    ...(valores.size ? { parameters: { version, ...salida } as unknown as CreativeParameters } : {}),
    conflicts: [...conflictos],
  };
};

/**
 * RELLENAR LOS HUECOS, SIN PISAR NADA.
 *
 * `base` manda en todo lo que dice; `relleno` solo entra donde `base` calla.
 * No es una prioridad inventada: es la única que se sostiene. `base` es lo que
 * la persona pidió y `relleno` es lo que un Skill sabe hacer bien — que el
 * segundo pisara al primero sería el sistema haciendo algo que nadie pidió, y
 * es exactamente lo que Weë no hace.
 */
export const completarCreativos = (
  base: CreativeParameters | undefined,
  relleno: CreativeParameters | undefined,
): CreativeParameters | undefined => {
  if (!relleno) return base;
  if (!base) return relleno;
  const salida: Record<string, Record<string, string | number>> = {};
  for (const r of RUTAS_CREATIVAS) {
    const v = valorCreativo(base, r) ?? valorCreativo(relleno, r);
    if (v === undefined) continue;
    const [grupo, campo] = r.split('.');
    (salida[grupo] ??= {})[campo] = v;
  }
  return { version: Math.max(base.version, relleno.version), ...salida } as unknown as CreativeParameters;
};

/* ── Contra lo que se puede servir ────────────────────────────────────────── */

/**
 * QUÉ LE EXIGE ESTA INTENCIÓN A UNA IMPLEMENTACIÓN.
 *
 * Traduce «lo que se quiere» a «lo que hace falta que el modelo sepa hacer».
 * Sigue sin nombrar a nadie: son requisitos, no proveedores.
 */
export interface ExigenciaCreativa {
  /** Hace falta controlar la cámara: hay un movimiento que no es quedarse quieto. */
  cameraMotion?: boolean;
  aspectRatio?: AspectRatio;
  /** Viene de `ExecutionHints.durationSec`, que ya existía. No se duplica aquí. */
  durationSec?: number;
}

export const exigenciasDe = (
  p: CreativeParameters | undefined,
  extra: { durationSec?: number } = {},
): ExigenciaCreativa => {
  const movimiento = valorCreativo(p, 'movement.type');
  const proporcion = valorCreativo(p, 'framing.aspectRatio');
  return {
    ...(movimiento !== undefined ? { cameraMotion: movimiento !== 'static' } : {}),
    ...(proporcion !== undefined ? { aspectRatio: proporcion as AspectRatio } : {}),
    ...(extra.durationSec !== undefined ? { durationSec: extra.durationSec } : {}),
  };
};

/**
 * `unknown` NO ES `ok`, Y ESTA ES LA MITAD IMPORTANTE DE TODO ESTO.
 *
 * Hay una diferencia entre «el modelo no lo soporta» y «Weë no sabe si lo
 * soporta», y confundirlas es cómo se prometen cosas que después no salen. El
 * registro de hoy sabe decir cuánto dura un vídeo como mucho y qué resoluciones
 * admite; NO sabe decir si un modelo controla la cámara, porque ningún campo lo
 * declara todavía. Así que eso se contesta `unknown`, no `ok`.
 */
export type VeredictoCreativo = 'ok' | 'unsupported' | 'unknown';

export interface ChequeoCreativo {
  requirement: keyof ExigenciaCreativa;
  verdict: VeredictoCreativo;
  /** Por qué, en una frase de administración. Nunca se le enseña a nadie. */
  detail?: string;
}

/**
 * Lo que hace falta saber de una implementación para contrastarla. Es el
 * subconjunto de `ModelDescriptor` que esto mira, escrito aquí para no importar
 * el registro entero en una hoja del Core.
 */
export interface CapacidadDeImplementacion {
  maxDurationSec?: number;
  minDurationSec?: number;
  /** Proporciones admitidas, si el registro las sabe. Hoy casi nunca las sabe. */
  aspectRatios?: readonly string[];
  /** Si el modelo controla la cámara. HOY NINGÚN CAMPO DEL REGISTRO LO DICE. */
  cameraMotion?: boolean;
}

export const compatibilidadCreativa = (
  exigencia: ExigenciaCreativa,
  implementacion: CapacidadDeImplementacion,
): readonly ChequeoCreativo[] => {
  const salida: ChequeoCreativo[] = [];
  if (exigencia.cameraMotion !== undefined) {
    salida.push(
      implementacion.cameraMotion === undefined
        ? { requirement: 'cameraMotion', verdict: 'unknown', detail: 'el registro no declara control de cámara' }
        : implementacion.cameraMotion || !exigencia.cameraMotion
          ? { requirement: 'cameraMotion', verdict: 'ok' }
          : { requirement: 'cameraMotion', verdict: 'unsupported' },
    );
  }
  if (exigencia.aspectRatio !== undefined) {
    salida.push(
      implementacion.aspectRatios === undefined
        ? { requirement: 'aspectRatio', verdict: 'unknown', detail: 'el registro no declara proporciones' }
        : implementacion.aspectRatios.includes(exigencia.aspectRatio)
          ? { requirement: 'aspectRatio', verdict: 'ok' }
          : { requirement: 'aspectRatio', verdict: 'unsupported' },
    );
  }
  if (exigencia.durationSec !== undefined) {
    const max = implementacion.maxDurationSec;
    const min = implementacion.minDurationSec;
    salida.push(
      max === undefined && min === undefined
        ? { requirement: 'durationSec', verdict: 'unknown', detail: 'el registro no declara duración' }
        : (max !== undefined && exigencia.durationSec > max) || (min !== undefined && exigencia.durationSec < min)
          ? { requirement: 'durationSec', verdict: 'unsupported' }
          : { requirement: 'durationSec', verdict: 'ok' },
    );
  }
  return salida;
};

/** La versión con la que Weë escribe hoy. */
export const versionCreativaActual = (): number => CREATIVE_PARAMETERS_VERSION;
