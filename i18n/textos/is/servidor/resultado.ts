/*
 * ISLANDÉS (is · is-IS) — Las marcas de estructura de los resultados de texto de Weë AI
 * (ver `../../es/servidor/resultado.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `diaPalabra` y `presupuestoPalabra` son la forma base en minúscula («dagur», «kostnaðaráætlun») con la que se
 * reconoce el día y el presupuesto si el modelo los escribe en islandés; «Escena» = «Atriði» (glosario § 4).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const resultado: typeof import('../../es/servidor/resultado').resultado = {
  dia: 'Dagur {{numero}}',
  diaPalabra: 'dagur',
  presupuesto: 'Kostnaðaráætlun',
  presupuestoPalabra: 'kostnaðaráætlun',
  escena: 'Atriði {{numero}}',
};
