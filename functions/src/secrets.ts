import { defineSecret } from 'firebase-functions/params';

/**
 * SECRETOS DE WEË — Cloud Secret Manager.
 *
 * En producción las claves de los proveedores de IA NO viven en ningún archivo:
 * se declaran aquí con `defineSecret` (firebase-functions/params) y Firebase las
 * lee de Cloud Secret Manager al desplegar. Cada función que puede llamar a un
 * proveedor las declara en su opción `secrets`, y el runtime las expone como
 * variables de entorno con el MISMO nombre de siempre, así que los adaptadores
 * no cambian: siguen leyendo GEMINI_API_KEY, ARK_API_KEY, etc.
 *
 * Guardar o rotar una clave:
 *   firebase functions:secrets:set ARK_API_KEY --project prod
 *   firebase functions:secrets:access ARK_API_KEY --project prod
 *
 * En desarrollo local se sigue usando functions/.env.local, que no se versiona.
 * `functions.config()` está obsoleto desde la versión 6 y no se usa en Weë.
 */

/** Claves de proveedores de IA. El nombre es el mismo que espera cada adaptador. */
export const PROVIDER_SECRET_NAMES = [
  'GEMINI_API_KEY',
  'ARK_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'BFL_API_KEY',
  'ELEVENLABS_API_KEY',
  'MINIMAX_API_KEY',
  'SEEDANCE_CALLBACK_TOKEN',
] as const;

export type ProviderSecretName = (typeof PROVIDER_SECRET_NAMES)[number];

const declared = PROVIDER_SECRET_NAMES.map((name) => [name, defineSecret(name)] as const);

/** Secretos declarados, por nombre. */
export const SECRETS: Record<ProviderSecretName, ReturnType<typeof defineSecret>> = Object.fromEntries(declared) as Record<
  ProviderSecretName,
  ReturnType<typeof defineSecret>
>;

/**
 * Lista para la opción `secrets` de cualquier función que pueda acabar llamando
 * a un proveedor. Se declaran todas juntas porque el AI Router decide en tiempo
 * de ejecución a cuál llama, y una función sin el secreto declarado no lo vería.
 */
export const AI_SECRETS = declared.map(([, secret]) => secret);

/** Solo el token del webhook de Seedance: la función que lo recibe no llama a ningún modelo. */
export const CALLBACK_SECRETS = [SECRETS.SEEDANCE_CALLBACK_TOKEN];

/**
 * Valor de un secreto desde Secret Manager. Solo funciona dentro de una función
 * con ese secreto declarado; fuera (pruebas, scripts) devuelve undefined en vez
 * de fallar. Nunca se registra ni se devuelve al cliente.
 */
/** Dentro de una funcion desplegada (Cloud Run) se puede pedir el valor; fuera, no. */
const inFunctionRuntime = (): boolean => !!(process.env.K_SERVICE || process.env.FUNCTION_TARGET);

export function secretValue(name: string): string | undefined {
  if (!inFunctionRuntime()) return undefined;
  const secret = (SECRETS as Record<string, ReturnType<typeof defineSecret> | undefined>)[name];
  if (!secret) return undefined;
  try {
    const value = secret.value();
    return value && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Todos los valores de secretos que estén disponibles ahora, para poder censurarlos en los registros. */
export function knownSecretValues(): string[] {
  const values: string[] = [];
  for (const name of PROVIDER_SECRET_NAMES) {
    const fromEnv = process.env[name];
    if (fromEnv && fromEnv.trim().length >= 8) values.push(fromEnv.trim());
    const fromManager = secretValue(name);
    if (fromManager && fromManager.length >= 8 && !values.includes(fromManager)) values.push(fromManager);
  }
  return values;
}
