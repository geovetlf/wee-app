/*
 * WEË BRAIN · CONCURRENCIA DEL RECLAMO Y DEL COBRO 3 DE 3 — E7, E8 (A-02 / A-03).
 *
 *   firebase emulators:exec --only firestore --project demo-wee-brain "node functions/test/brain-operacion-3.emulator.mjs"
 *
 * Propiedad del reclamo (vivo, vencido, soltar sin ser dueño, carreras de reclamo), M-1/M-2/M-3 entre procesos y un
 * fallo entre cada transición financiera.
 * Los escenarios, las rondas y las aserciones viven en `_brain-operacion-emulador.mjs`; aquí solo se eligen.
 */
process.env.BRAIN_EMU_ESCENARIOS = 'E7,E8';
await import('./_brain-operacion-emulador.mjs');
