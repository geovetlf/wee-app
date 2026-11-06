/*
 * ALEMÁN SUIZO (de-CH, adaptado de `de/servidor`: ss, «…» y léxico suizo) — Las marcas de estructura de los resultados de texto de Weë AI (ver `../../es/servidor/resultado.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. `diaPalabra` y `presupuestoPalabra` van
 * en minúscula porque se comparan sin mayúsculas.
 */
export const resultado: typeof import('../../es/servidor/resultado').resultado = {
  dia: 'Tag {{numero}}',
  diaPalabra: 'tag',
  presupuesto: 'Budget',
  presupuestoPalabra: 'budget',
  escena: 'Szene {{numero}}',
};
