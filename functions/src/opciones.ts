import { setGlobalOptions } from 'firebase-functions/v2/options';

/**
 * OPCIONES GLOBALES DE LAS FUNCTIONS — auditoría H0, §27 (fase 1).
 *
 * El techo de instancias. No había ninguno declarado: el 20 que tienen casi
 * todas las funciones lo puso la plataforma al actualizarlas, y las que solo
 * tenían una revisión escalaban sin techo ante un pico o una tormenta de
 * reintentos. Con 20 todas quedan como ya estaban y ninguna sin freno.
 *
 * ── Por qué este archivo es el PRIMER import de index.ts ───────────────────
 *
 * firebase-functions lee las opciones globales AL DEFINIR cada función, no al
 * desplegarla: un módulo importado antes que este, que defina funciones, se
 * quedaría sin techo. Y llamarlo dos veces es comportamiento indefinido, así
 * que esta es la ÚNICA llamada (lo vigila functions/test/max-instancias.test.mjs).
 *
 * Bajar el techo de una función concreta (fase 2: administración, barrido,
 * webhooks…) es decisión del dueño y va en su propio `onCall`/`onSchedule`.
 */
setGlobalOptions({ maxInstances: 20 });
