/*
 * TODOS LOS PLANES QUE PUEDE ARMAR WEË AI, CON EL SERVIDOR DE VERDAD.
 *
 * Recorre cada experiencia como la recorre una persona: pide al planificador de plantillas la siguiente pregunta
 * (`templatePlanner.next`, el mismo que usa `creatorChat`), la contesta con cada una de sus opciones —«No sé»
 * incluido—, con un texto suyo cuando la pregunta lo admite y, en las de fechas, con un día, un tramo del mismo mes y
 * uno que cruza de mes; y sigue hasta que el planificador devuelve un plan. Así salen todas las explicaciones y todos
 * los pasos que pueden llegar a la pantalla, sin copiar ninguna regla de las plantillas.
 *
 * Lo usa `i18n-servidor.test.mjs`. Necesita `npm run build` (lee `functions/lib`).
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../lib');

/** Lo que escribe la persona cuando no elige un botón. Se reconoce porque nadie lo traduce. */
export const TEXTO_LIBRE = 'Texto libre de prueba';
/** Fechas como las manda el calendario (`DateRangePicker`): un día, un tramo del mismo mes y uno que cruza de mes. */
export const FECHAS = ['el 12 de octubre de 2026', 'del 12 al 22 de octubre de 2026', 'del 28 de octubre de 2026 al 3 de noviembre de 2026'];

export const todosLosPlanes = async ({ objetivos } = {}) => {
  const { TEMPLATES } = require(path.join(LIB, 'creator/templates.js'));
  const { templatePlanner } = require(path.join(LIB, 'creator/planner.js'));
  const planes = [];
  const recorrer = async (experienceId, goal, answers) => {
    const paso = await templatePlanner.next({ experienceId, goal, answers });
    if (paso.plan) {
      planes.push({ experienceId, goal, answers, plan: paso.plan });
      return;
    }
    const q = paso.question;
    const respuestas = q.options.map((o) => ({ questionId: q.id, optionId: o.id }));
    if (q.kind === 'dates') for (const f of FECHAS) respuestas.push({ questionId: q.id, text: f });
    else if (q.allowFreeText || q.options.length === 0) respuestas.push({ questionId: q.id, text: TEXTO_LIBRE });
    for (const r of respuestas) await recorrer(experienceId, goal, [...answers, ...(paso.inferred || []), r]);
  };
  for (const [experienceId, plantilla] of Object.entries(TEMPLATES)) {
    for (const goal of objetivos?.[experienceId] || [plantilla.defaultGoal]) await recorrer(experienceId, goal, []);
  }
  return planes;
};
