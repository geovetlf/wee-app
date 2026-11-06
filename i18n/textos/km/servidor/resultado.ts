/*
 * JEMER — Las marcas de estructura de los resultados de texto de Weë AI (ver `../../es/servidor/resultado.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `diaPalabra` y `presupuestoPalabra` se comparan tal cual, sin ZWSP dentro.
 */
export const resultado: typeof import('../../es/servidor/resultado').resultado = {
  dia: 'ថ្ងៃទី {{numero}}',
  diaPalabra: 'ថ្ងៃទី',
  presupuesto: 'ថវិកា',
  presupuestoPalabra: 'ថវិកា',
  escena: 'ឈុតទី {{numero}}',
};
