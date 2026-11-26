/*
 * WEË BRAIN · CONCURRENCIA DEL RECLAMO Y DEL COBRO 1 DE 3 — E0, E1, E2, E3 (A-02 / A-03).
 *
 *   firebase emulators:exec --only firestore --project demo-wee-brain "node functions/test/brain-operacion-1.emulator.mjs"
 *
 * Control del entorno, la MISMA operación a la vez (en el proceso y entre procesos, también búsqueda), el mismo id en
 * 25 conversaciones (F-01) y en varias cuentas a la vez (F-01b).
 * Los escenarios, las rondas y las aserciones viven en `_brain-operacion-emulador.mjs`; aquí solo se eligen.
 */
process.env.BRAIN_EMU_ESCENARIOS = 'E0,E1,E2,E3';
await import('./_brain-operacion-emulador.mjs');
