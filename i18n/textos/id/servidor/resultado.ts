/*
 * INDONESIO — Las marcas de estructura de los resultados de texto de Weë AI (ver `../../es/servidor/resultado.ts`).
 *
 * `diaPalabra` y `presupuestoPalabra` sirven también para reconocer el día y el presupuesto si el modelo los escribe en
 * indonesio: se comparan sin mayúsculas.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const resultado: typeof import('../../es/servidor/resultado').resultado = {
  dia: 'Hari {{numero}}',
  diaPalabra: 'hari',
  presupuesto: 'Anggaran',
  presupuestoPalabra: 'anggaran',
  escena: 'Adegan {{numero}}',
};
