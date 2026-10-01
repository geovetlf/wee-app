/*
 * ESPAÑOL — Las marcas de estructura de los resultados de texto de Weë AI.
 *
 * El servidor le pide al modelo unas marcas fijas, en español, porque las lee después: «IMAGEN:», «PROBAR:» y
 * «NARRACIÓN:» encadenan un paso con el siguiente, «Escena 1» parte un guion, y la app pliega un itinerario por sus
 * «DÍA 1 ·» y deja abierto el «PRESUPUESTO:» (`functions/src/creator/prompts.ts`, `components/creator/ResultCard.tsx`).
 * Aunque el resultado esté en danés, esas marcas siguen en español: son el contrato entre el servidor y la app. La app
 * esconde las tres primeras y pinta estas otras en el idioma de quien mira (`utils/textoDeResultado.ts`).
 *
 * `diaPalabra` y `presupuestoPalabra` sirven además para reconocer el día y el presupuesto si el modelo los escribiera
 * en el idioma de la persona en vez de dejar la marca: se comparan sin mayúsculas.
 */
export const resultado = {
  dia: 'Día {{numero}}',
  diaPalabra: 'día',
  presupuesto: 'Presupuesto',
  presupuestoPalabra: 'presupuesto',
  escena: 'Escena {{numero}}',
};
