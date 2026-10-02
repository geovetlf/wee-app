/*
 * ENGLISH — Las marcas de estructura de los resultados de texto de Weë AI. Ver `../../es/servidor/resultado.ts`.
 *
 * `diaPalabra` y `presupuestoPalabra` sirven también para reconocer el día y el presupuesto si el modelo los escribe
 * en inglés en vez de dejar la marca española: se comparan sin mayúsculas.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const resultado: typeof import('../../es/servidor/resultado').resultado = {
  dia: 'Day {{numero}}',
  diaPalabra: 'day',
  presupuesto: 'Budget',
  presupuestoPalabra: 'budget',
  escena: 'Scene {{numero}}',
};
