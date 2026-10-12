import type { ContextoDeExperiencia } from '../constants/weeWorkspaces';

/**
 * WEË CHEF · LO QUE VIAJA A `CreatorFlow` CUANDO SE CREA DESDE CHEF (CHEF-02, parte pura).
 *
 * Lo elegido en «Ajustes de la receta» viajaba solo como texto pegado a la idea (`chef.goalWith`) y el servidor
 * únicamente lo entendía si el deductor local lo encontraba —y ese deductor solo lee español—. Aquí se traduce a
 * RESPUESTAS que el servidor ya entiende: `presetAnswers` → `creatorChat` → `respuestaPara`, el camino de siempre.
 * Ni otro canal de contexto, ni otro planificador: solo los ids de las preguntas de la plantilla de Chef.
 *
 * Función pura (sin React, sin traductor): la pantalla une la idea con los ajustes y pinta; esto decide qué viaja.
 * `ChefScreen` todavía NO la llama: esa parte de CHEF-02 espera a D-1 (PENDIENTE DE DECISIÓN del dueño).
 *
 * Reglas (docs/WEE-CHEF-TAREAS-LOTE-1.md, CHEF-02):
 *   1. El `preset` de la puerta (una tarjeta o, tras CHEF-03b, un panel) va DENTRO de `presets` y además suelto:
 *      `CreatorFlowScreen` elige `presets ?? [preset]`, no los suma, y lee `preset.optionId` para pedir la foto.
 *   2. Una respuesta por pregunta (el servidor no deduplica): la de la puerta manda.
 *   3. `auto` no decide nada y no viaja; `diet` y `level` no viajan (no hay pregunta hasta CHEF-06); no hay ajuste
 *      de días (regla 6). Sin nada que añadir, no hay `presets`: la llamada es la de hoy más `workspace`.
 */

/** Los ajustes cuyo grupo y cuyas opciones YA son una pregunta del servidor, con los mismos ids. */
export const AJUSTES_QUE_SON_PREGUNTA: readonly string[] = ['people', 'time'];

/** Las opciones de esos ajustes que la pregunta de la plantilla acepta (sin `auto`). Una prueba las ata a las dos fuentes. */
export const OPCIONES_QUE_SON_RESPUESTA: Readonly<Record<string, readonly string[]>> = {
  people: ['1', '2', '4', '8'],
  time: ['15', '30', '60'],
};

/** Lo que el servidor lee del objetivo: `String(data.goal || '').trim().slice(0, 300)` (creator/index.ts). */
export const LARGO_QUE_LEE_EL_SERVIDOR = 300;

type Respuesta = { questionId: string; optionId: string };

export interface EntradaDeContextoDeChef {
  /** La idea con los ajustes ya pegados por `chef.goalWith`: la unión sigue siendo de la pantalla. */
  objetivo?: string;
  /** Por dónde se entró (una tarjeta o, tras CHEF-03b, un panel). */
  preset?: Respuesta;
  /** Grupo de ajuste → id de opción (`auto` = no decide nada). */
  ajustes: Readonly<Record<string, string>>;
  imageUri?: string;
}

/** El contexto de Chef sin `experienceId`: el literal `experienceId: 'chef'` se queda en la llamada de la pantalla. */
export const contextoDeChef = (e: EntradaDeContextoDeChef): Omit<ContextoDeExperiencia, 'experienceId'> => {
  const deLaPuerta: Respuesta[] = e.preset ? [{ questionId: e.preset.questionId, optionId: e.preset.optionId }] : [];
  const deLosAjustes: Respuesta[] = [];
  for (const grupo of AJUSTES_QUE_SON_PREGUNTA) {
    if (deLaPuerta.some((r) => r.questionId === grupo)) continue;
    const valor = Object.prototype.hasOwnProperty.call(e.ajustes, grupo) ? e.ajustes[grupo] : undefined;
    if (valor !== undefined && OPCIONES_QUE_SON_RESPUESTA[grupo].includes(valor)) {
      deLosAjustes.push({ questionId: grupo, optionId: valor });
    }
  }
  return {
    workspace: 'chef',
    ...(e.objetivo !== undefined ? { goal: e.objetivo } : {}),
    ...(e.preset ? { preset: { ...deLaPuerta[0] } } : {}),
    ...(deLosAjustes.length ? { presets: [...deLaPuerta, ...deLosAjustes] } : {}),
    ...(e.imageUri ? { imageUri: e.imageUri } : {}),
  };
};

/** Cuánto del objetivo cuenta para el servidor: tras `trim()` y en unidades UTF-16, como su `slice(0, 300)`. */
export const largoParaElServidor = (objetivo: string | undefined): number => String(objetivo ?? '').trim().length;
