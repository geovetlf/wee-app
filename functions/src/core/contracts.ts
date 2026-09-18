/**
 * WEE CORE — VERSIONES DE CONTRATO.
 *
 * ── Por qué esto existe ─────────────────────────────────────────────────────
 *
 * Weë no controla las APIs de las que depende. Un proveedor cambia un campo, se
 * inventa un modelo o retira uno, y eso no puede obligar a tocar el planificador,
 * la pantalla ni los Credits. La forma de conseguirlo es que las piezas hablen
 * por CONTRATOS versionados en vez de por acuerdos tácitos.
 *
 * Un número aquí no es decoración: es lo que permite que dos partes del sistema
 * evolucionen a ritmos distintos sin romperse. Cuando un adaptador declara que
 * cumple `PROVIDER_CONTRACT_VERSION` 1, el Core sabe exactamente qué puede
 * pedirle y qué no.
 *
 * ── Cuándo se sube cada número ──────────────────────────────────────────────
 *
 * MAYOR  cuando algo que antes era válido deja de serlo: se quita un campo
 *        obligatorio, cambia el significado de uno, o se estrecha un tipo.
 * MENOR  cuando se AÑADE algo opcional. Lo que ya funcionaba sigue funcionando.
 *
 * Añadir un campo opcional nunca sube el mayor. Ese es todo el punto: el Core
 * tiene que poder crecer durante años sin una migración cada trimestre.
 */

/** Versión del conjunto de contratos del Core. */
export const CORE_CONTRACT_VERSION = '1.0' as const;

/** Lo que un adaptador de proveedor promete cumplir. */
export const PROVIDER_CONTRACT_VERSION = '1.0' as const;

/** Forma de una definición de capacidad en el registro. */
export const CAPABILITY_CONTRACT_VERSION = '1.0' as const;

/** Forma de un manifiesto de Workplace. */
export const WORKPLACE_CONTRACT_VERSION = '1.0' as const;

/** Forma de un workflow y sus pasos. */
export const WORKFLOW_CONTRACT_VERSION = '1.0' as const;

export type ContractVersion = `${number}.${number}`;

/**
 * ¿Puede quien implementa `declarada` hablar con quien espera `esperada`?
 *
 * Sí cuando el mayor coincide y el menor declarado llega al esperado. Es la
 * regla de siempre y se escribe aquí una sola vez para que nadie la reinvente
 * con un `===` que rechazaría una versión perfectamente compatible.
 */
export const contratoCompatible = (declarada: string, esperada: string): boolean => {
  const partes = (v: string) => {
    const [mayor, menor] = String(v || '').split('.');
    const a = Number(mayor);
    const b = Number(menor);
    return Number.isFinite(a) && Number.isFinite(b) ? { mayor: a, menor: b } : null;
  };
  const d = partes(declarada);
  const e = partes(esperada);
  if (!d || !e) return false;
  return d.mayor === e.mayor && d.menor >= e.menor;
};
