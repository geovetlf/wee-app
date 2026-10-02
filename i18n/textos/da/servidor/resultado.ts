/*
 * DANÉS — Las marcas de estructura de los resultados de texto de Weë AI.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las marcas que el servidor le pide al modelo siguen en español —son el contrato entre el servidor y la
 * app—; esto es lo que la app pinta en su lugar. El día de un itinerario es «Dag {{numero}}» y la escena de un
 * guion, «Scene {{numero}}», como `filmmaker.sceneNumber` («scene» es la palabra danesa, glosario § 9.6).
 * El presupuesto es «Budget», la palabra danesa de siempre para el de un viaje.
 *
 * `diaPalabra` y `presupuestoPalabra` sirven además para reconocer el día y el presupuesto si el modelo los
 * escribiera en danés en vez de dejar la marca: van en minúscula («dag», «budget») porque se comparan sin
 * mayúsculas.
 */
export const resultado: typeof import('../../es/servidor/resultado').resultado = {
  dia: 'Dag {{numero}}',
  diaPalabra: 'dag',
  presupuesto: 'Budget',
  presupuestoPalabra: 'budget',
  escena: 'Scene {{numero}}',
};
