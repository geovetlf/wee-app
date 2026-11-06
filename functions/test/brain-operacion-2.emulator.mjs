/*
 * WEË BRAIN · CONCURRENCIA DEL RECLAMO Y DEL COBRO 2 DE 3 — E4, E5, E6 (A-02 / A-03).
 *
 *   firebase emulators:exec --only firestore --project demo-wee-brain "node functions/test/brain-operacion-2.emulator.mjs"
 *
 * Reintentos antes y después de terminar, fallos durante el cobro y al soltar el reclamo, proceso matado a mitad y la
 * concurrencia rondando la respuesta 12 con saldo justo (M-4 medido, sin respuestas gratis ni saldo negativo).
 * Los escenarios, las rondas y las aserciones viven en `_brain-operacion-emulador.mjs`; aquí solo se eligen.
 */
process.env.BRAIN_EMU_ESCENARIOS = 'E4,E5,E6';
await import('./_brain-operacion-emulador.mjs');
