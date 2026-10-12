/**
 * ¿PIDE FOTO ESTE FLUJO? — la regla de `CreatorFlowScreen` (`needsPhoto`), como función pura (CHEF-03b, preparación).
 *
 * Es la MISMA regla que la pantalla escribe hoy en línea, carácter por carácter de comportamiento: Photo, Home y Beauty
 * trabajan siempre sobre una foto; Studio cuando se entra por «animar» o el objetivo habla de foto o imagen; Chef cuando
 * se entra por `cook` o `edit`, o cuando el objetivo nombra ingredientes, la nevera o una foto.
 *
 * Por qué existe antes de usarse: la ficha CHEF-03b cambia una sola condición de Chef (que las palabras del objetivo solo
 * cuenten si NO llega ninguna `preset`, D-CHEF-2), y hoy esa regla solo se puede probar leyendo el texto de la pantalla
 * —una prueba que seguiría en verde tras el arreglo—. Con la función, el arreglo es una línea aquí y su prueba es de
 * comportamiento. Hasta que CHEF-03b se integre (espera a CHEF-03a, a D-1 y a D-3) la pantalla NO la llama, y
 * `chef-necesita-foto.test.mjs` exige que las dos digan lo mismo en todas las combinaciones.
 *
 * Pura: sin React, sin traductor. Las palabras son las que la pantalla busca hoy (en español): no se traducen porque no
 * se enseñan; son una pista, no interfaz.
 */
export interface EntradaDeNecesitaFoto {
  experienceId: string;
  preset?: { questionId: string; optionId: string };
  goal?: string;
}

const SIEMPRE_CON_FOTO: readonly string[] = ['photo', 'home', 'beauty'];

export const necesitaFoto = ({ experienceId, preset, goal }: EntradaDeNecesitaFoto): boolean =>
  SIEMPRE_CON_FOTO.includes(experienceId) ||
  (experienceId === 'studio' && (preset?.optionId === 'animate' || /foto|imagen/i.test(goal || ''))) ||
  (experienceId === 'chef' &&
    (preset?.optionId === 'cook' ||
      preset?.optionId === 'edit' ||
      /ingredientes|nevera|refri|foto/i.test(goal || '')));
