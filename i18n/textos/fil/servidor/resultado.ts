/*
 * FILIPINO — Las marcas de estructura de los resultados de texto de Weë AI.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las marcas que el servidor le pide al modelo siguen en español —son el contrato entre el servidor y la app—; esto
 * es lo que la app pinta en su lugar. El día de un itinerario es «Araw {{numero}}» (la cifra detrás, sin enlace) y la
 * escena de un guion, «Eksena {{numero}}», como en Weë Studio y Weë Filmmaker («eksena», glosario § 11.11). El
 * presupuesto de un viaje es «Budget», la palabra que se usa en Filipinas para el de un viaje (glosario § 11.11,
 * Viajes y hogar).
 *
 * `diaPalabra` y `presupuestoPalabra` sirven además para reconocer el día y el presupuesto si el modelo los
 * escribiera en filipino en vez de dejar la marca: van en minúscula («araw», «budget») porque se comparan sin
 * mayúsculas, y son las palabras que un texto en filipino usaría de verdad («Araw 1», «Budget:»).
 */
export const resultado: typeof import('../../es/servidor/resultado').resultado = {
  dia: 'Araw {{numero}}',
  diaPalabra: 'araw',
  presupuesto: 'Budget',
  presupuestoPalabra: 'budget',
  escena: 'Eksena {{numero}}',
};
