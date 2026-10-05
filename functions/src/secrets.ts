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
 * Guardar o rotar una clave lo hace el dueño, siguiendo docs/SECURITY.md §4.
 * Cuidado: `firebase functions:secrets:set` sobre un secreto gestionado por
 * Firebase ofrece redesplegar y DESTRUYE la versión anterior en el acto; ese
 * paso no se acepta sin haber verificado la versión nueva.
 *
 * En local no hay claves: el emulador corre con el proyecto `demo-wee` y un
 * `functions/.secret.local` vacío (scripts/emulators.mjs), así que todo va en
 * modo demo. `functions.config()` está obsoleto desde la versión 6 y no se usa en Weë.
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

/*
 * ── CADA FUNCIÓN MONTA LO QUE LEE (cierre post-auditoría 2026-10-01, money/secretos-de-mas) ──
 *
 * `AI_SECRETS` lleva las ocho claves de modelo MÁS `SEEDANCE_CALLBACK_TOKEN`. Ese token solo
 * lo lee quien CREA una tarea de vídeo de Seedance (`providers/seedance.ts`, cuando hay
 * `SEEDANCE_CALLBACK_URL`: se lo pega a la URL del aviso) y quien recibe el aviso
 * (`seedanceCallback`, con `CALLBACK_SECRETS`). Por eso:
 *
 *  · `AI_SECRETS` (las nueve) se queda SOLO en las dos funciones que pueden crear una tarea
 *    de vídeo: `creatorRun` (Weë Studio) y `generateVideo`.
 *  · `MODEL_SECRETS` (las ocho de modelo, sin el token) va en las que llaman al Router o
 *    cotizan con él —`brainChat`, `brainQuote`, `creatorChat`, `creatorQuote`, `engineAdmin`—:
 *    el Router decide en tiempo de ejecución a qué proveedor llama y las cadenas se cambian en
 *    Firestore, así que su conjunto de claves de modelo NO se recorta.
 *  · `AVATAR_SECRETS` (solo Gemini) va en el avatar, que no pasa por el Router: llama a Gemini
 *    directamente (`vertexAI.ts`, `process.env.GEMINI_API_KEY`) y no lee nada más.
 *
 * El mapa VIVO (lo que Cloud Run monta hoy, auditoría H0) cambiará en el próximo despliegue
 * de esas funciones; `functions/test/rotacion-secretos.test.mjs` fija el mapa del código.
 */
export const MODEL_SECRETS = declared.filter(([name]) => name !== 'SEEDANCE_CALLBACK_TOKEN').map(([, secret]) => secret);

/** El avatar solo habla con Gemini, y directamente (sin el Router). */
export const AVATAR_SECRETS = [SECRETS.GEMINI_API_KEY];

/** Solo el token del webhook de Seedance: la función que lo recibe no llama a ningún modelo. */
export const CALLBACK_SECRETS = [SECRETS.SEEDANCE_CALLBACK_TOKEN];

/**
 * LO MÍNIMO PARA PREGUNTARLE A UN PROVEEDOR QUÉ FUE DE UNA TAREA SUYA.
 *
 * La tarea de reconciliación NO genera nada: no llama a ningún modelo, no crea
 * ninguna tarea y no gasta un céntimo. Lo único que hace con una clave es una
 * consulta de estado, que es de LECTURA. Por eso no lleva `AI_SECRETS` entera:
 * darle las ocho claves a una tarea que solo pregunta por una sería regalar
 * alcance sin motivo.
 *
 * Hoy solo Seedance (ModelArk) tiene un camino asíncrono. Cuando otro proveedor
 * lo tenga, su clave se añade AQUÍ y solo aquí.
 */
export const RECONCILIATION_SECRETS = [SECRETS.ARK_API_KEY];

/* ── Media Cloud: su propio llavero, aparte del de la IA ───────────────────── */

/**
 * LOS SECRETOS DE MEDIA CLOUD, DECLARADOS APARTE Y A PROPÓSITO.
 *
 * ── Por qué NO van en `PROVIDER_SECRET_NAMES` ───────────────────────────────
 *
 * Porque esa lista alimenta `AI_SECRETS`, y `AI_SECRETS` está atado a funciones
 * ya desplegadas —`brainChat`, `brainQuote`, `creatorChat`, `creatorQuote`,
 * `creatorRun`, el vídeo—. Añadir ahí una clave que todavía no existe en Secret
 * Manager haría **fallar el despliegue de todas ellas**, y una capa nueva no
 * puede romper el despliegue de lo que ya funciona. Un llavero separado es
 * justo lo que impide eso: si el secreto de Media Cloud falta, lo único que no
 * se despliega es Media Cloud.
 *
 * ── Y por qué SOLO dos ──────────────────────────────────────────────────────
 *
 * Son los dos únicos valores de R2 que son credenciales. El identificador de
 * cuenta y el nombre del contenedor también hacen falta, pero **no son
 * secretos**: el primero va en la propia dirección de cada petición y el
 * segundo es un nombre. Se configuran como variables normales, y meterlos aquí
 * sería fingir una protección que no aportan nada.
 *
 * El nombre de la variable no cambia: el adaptador sigue leyendo
 * `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` por el mismo `env()` de siempre.
 */
export const MEDIA_SECRET_NAMES = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
] as const;
export type MediaSecretName = (typeof MEDIA_SECRET_NAMES)[number];

const declaradosDeMedios = MEDIA_SECRET_NAMES.map((name) => [name, defineSecret(name)] as const);

/** Por su nombre, para quien necesite uno suelto. */
export const MEDIA_SECRET_REFS: Record<MediaSecretName, ReturnType<typeof defineSecret>> =
  Object.fromEntries(declaradosDeMedios) as Record<MediaSecretName, ReturnType<typeof defineSecret>>;

/**
 * Para la opción `secrets` de las funciones de Media Cloud. **Nunca se mezcla
 * con `AI_SECRETS`**: una función de IA no necesita hablar con un almacén de
 * objetos, y una de medios no necesita ninguna clave de modelo.
 */
export const MEDIA_SECRETS = declaradosDeMedios.map(([, secret]) => secret);

/* ── fal.ai: su propio llavero, DORMIDO ─────────────────────────────────────── */

/**
 * LA CLAVE DE fal.ai, DECLARADA APARTE Y SIN MONTAR EN NINGUNA FUNCIÓN (2026-10-05).
 *
 * Mismo motivo que el llavero de Media Cloud: si fuera en `PROVIDER_SECRET_NAMES`, todas las funciones que montan
 * `AI_SECRETS` o `MODEL_SECRETS` exigirían en su próximo despliegue un secreto que no existe en Secret Manager, y no
 * se desplegarían. Aquí no la monta nadie: el adaptador de fal (`engine/providers/fal.ts`) lee `FAL_KEY` por el
 * `env()` de siempre y, sin ella, `isConfigured()` es falso y el Router ni lo considera. Crear el secreto y montarlo
 * en la función que lo use es la ACTIVACIÓN, y es una decisión del dueño. Nunca va al cliente.
 */
export const FAL_SECRET_NAMES = ['FAL_KEY'] as const;
export type FalSecretName = (typeof FAL_SECRET_NAMES)[number];
const declaradosDeFal = FAL_SECRET_NAMES.map((name) => [name, defineSecret(name)] as const);
export const FAL_SECRET_REFS: Record<FalSecretName, ReturnType<typeof defineSecret>> =
  Object.fromEntries(declaradosDeFal) as Record<FalSecretName, ReturnType<typeof defineSecret>>;
/** Para la opción `secrets` de la función que, el día que se active, llame a fal. Hoy no la usa ninguna. */
export const FAL_SECRETS = declaradosDeFal.map(([, secret]) => secret);

/**
 * Valor de un secreto desde Secret Manager. Solo funciona dentro de una función
 * con ese secreto declarado; fuera (pruebas, scripts) devuelve undefined en vez
 * de fallar. Nunca se registra ni se devuelve al cliente.
 */
/** Dentro de una funcion desplegada (Cloud Run) se puede pedir el valor; fuera, no. */
const inFunctionRuntime = (): boolean => !!(process.env.K_SERVICE || process.env.FUNCTION_TARGET);

export function secretValue(name: string): string | undefined {
  if (!inFunctionRuntime()) return undefined;
  /* Los llaveros, buscados por nombre. Quien lee no tiene que saber en cuál está. */
  const secret = (SECRETS as Record<string, ReturnType<typeof defineSecret> | undefined>)[name]
    ?? (MEDIA_SECRET_REFS as Record<string, ReturnType<typeof defineSecret> | undefined>)[name]
    ?? (FAL_SECRET_REFS as Record<string, ReturnType<typeof defineSecret> | undefined>)[name];
  if (!secret) return undefined;
  /*
   * Un secreto que ESTA función no monta no está en su entorno: `value()` devolvería '' y,
   * además, escribiría un aviso en el registro por cada uno. Con cada función montando solo
   * lo suyo, el saneador (`knownSecretValues`) llenaría el registro de avisos. Mismo
   * resultado (undefined), sin ruido.
   */
  if (process.env[name] === undefined) return undefined;
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
  /* LOS LLAVEROS. Una credencial de almacén o de fal en un registro es tan grave como una de un modelo. */
  for (const name of [...PROVIDER_SECRET_NAMES, ...MEDIA_SECRET_NAMES, ...FAL_SECRET_NAMES]) {
    const fromEnv = process.env[name];
    if (fromEnv && fromEnv.trim().length >= 8) values.push(fromEnv.trim());
    const fromManager = secretValue(name);
    if (fromManager && fromManager.length >= 8 && !values.includes(fromManager)) values.push(fromManager);
  }
  return values;
}
