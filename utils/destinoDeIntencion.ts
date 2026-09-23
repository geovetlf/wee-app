/**
 * DE LO QUE ALGUIEN ESCRIBE A DÓNDE HAY QUE LLEVARLE.
 *
 * Weë Studio es un hub: no crea, encamina (B3.10 §1.3). Alguien escribe "un
 * vídeo de 15 segundos para mi cafetería" y lo que tiene que pasar es que
 * aparezca DENTRO de la experiencia de vídeo con esa frase ya puesta, no que el
 * Studio intente hacerlo.
 *
 * ── Esto NO es un router, y la diferencia importa ───────────────────────────
 *
 * En Weë ya hay dos cosas que resuelven intención, las dos escritas, las dos en
 * uso, y ninguna es esta:
 *
 *   WEË BRAIN, en el servidor. Lee la frase entera, entiende lo que se quiere
 *   y devuelve `suggestedExperience`. Es el que sabe. Su palabra es la buena y
 *   aquí se respeta sin discutirla: si el servidor ya dijo a dónde, se va ahí.
 *
 *   `matchExperiences`, en `constants/weeExperiences.ts`. Compara lo escrito
 *   con las palabras clave del registro. No entiende nada —no es su trabajo—
 *   pero acierta al instante y sin gastar un Credit, que es justo lo que hace
 *   falta mientras alguien escribe.
 *
 * Este archivo no añade un tercero: elige entre los dos que ya hay y dice qué
 * contexto se lleva al destino. Nada más. No hay palabras clave nuevas, no hay
 * modelo, no hay proveedor y no hay llamada a ninguna IA.
 *
 * ── Por qué las palabras clave, si el servidor entiende mejor ───────────────
 *
 * Porque el servidor contesta cuando contesta, y la caja del Studio tiene que
 * responder al toque. Mientras no haya dicho nada, las palabras clave bastan
 * para abrir la puerta correcta; cuando lo diga, manda él.
 */

import { matchExperiences, WeeExperience } from '../constants/weeExperiences';
import { ContextoDeExperiencia, WorkspaceId, workspaceDe } from '../constants/weeWorkspaces';

/**
 * Quién decidió el destino. Se guarda para poder MEDIR si acierta.
 *
 * Tres, y en este orden de autoridad:
 *
 *   brain     el servidor leyó la frase entera y dijo a dónde. Es quien sabe.
 *   puerta    la persona entró por Imágenes, o por Beauty. Eso no es una
 *             interpretación que pueda fallar: es un acto. Por eso le gana a
 *             las palabras, y por eso NO le gana a Brain, que ha leído más.
 *   palabras  las palabras clave del registro. Aciertan al instante y sin
 *             gastar un Credit, que es lo que hace falta mientras se escribe.
 */
export type OrigenDelDestino = 'brain' | 'puerta' | 'palabras';

export interface Destino {
  experienceId: string;
  origen: OrigenDelDestino;
  /** Lo que se lleva puesto al llegar. Es lo que evita repetir la pregunta. */
  contexto: ContextoDeExperiencia;
}

export interface OpcionesDeDestino {
  /**
   * Lo que el servidor ya dijo, si lo dijo. Manda sobre las palabras: es quien
   * ha leído la frase entera y el único que la entiende.
   */
  sugeridaPorBrain?: string | null;
  /**
   * La experiencia que declara la puerta por la que se entró. Weë Studio la
   * pasa cuando alguien abrió Imágenes, Beauty o Texto: en ese momento ya no
   * hay nada que adivinar, porque lo acaba de decir.
   *
   * Le gana a las palabras y pierde contra Brain. Que pierda importa: quien
   * entró por Imágenes y escribió «una canción» está pidiendo otra cosa, y
   * quien ha leído la frase entera es el único que puede notarlo.
   */
  declaradaPorLaPuerta?: string | null;
  /**
   * Quedarse dentro de un lugar de trabajo. Weë Studio lo usa para no mandar a
   * alguien a Weë Chef desde su portada: allí no se enseñan los otros sitios y
   * llevar a uno que no se enseña es aparecer en una sección que no se pidió.
   *
   * Sin esto, se busca entre todas.
   */
  dentroDe?: WorkspaceId;
  /** Lo demás que el sitio ya sabe y no hay que volver a preguntar. */
  contexto?: Omit<ContextoDeExperiencia, 'experienceId' | 'goal'>;
}

/**
 * A DÓNDE VA ESTO.
 *
 * Devuelve `null` cuando no hay nada escrito o nada encaja, y eso es una
 * respuesta: quien pregunta decide entonces si ofrece Weë Brain, que es la
 * puerta de quien no sabe a cuál entrar. Inventar un destino para no devolver
 * nada sería llevar a alguien a una sección que no pidió.
 */
export const destinoDeIntencion = (
  texto: string,
  opciones: OpcionesDeDestino = {}
): Destino | null => {
  const { sugeridaPorBrain, declaradaPorLaPuerta, dentroDe, contexto } = opciones;
  const goal = texto.trim();

  const llevar = (experienceId: string, origen: OrigenDelDestino): Destino => ({
    experienceId,
    origen,
    contexto: { ...contexto, experienceId, goal: goal || undefined },
  });

  /* Lo que dijo el servidor, si sigue siendo un sitio al que se puede ir. */
  if (sugeridaPorBrain && cabeEn(sugeridaPorBrain, dentroDe)) {
    return llevar(sugeridaPorBrain, 'brain');
  }

  /* Y después lo que la puerta declara, que es un acto y no una lectura. */
  if (declaradaPorLaPuerta && cabeEn(declaradaPorLaPuerta, dentroDe)) {
    return llevar(declaradaPorLaPuerta, 'puerta');
  }

  if (!goal) return null;

  const candidatas: WeeExperience[] = matchExperiences(goal).filter((e) => cabeEn(e.id, dentroDe));
  if (candidatas.length === 0) return null;

  /*
   * La primera, que es la primera del registro. No se puntúa ni se ordena por
   * cuántas palabras coinciden: eso sería un criterio inventado aquí, y las
   * decisiones de a dónde va cada intención son de Weë Brain, no de una
   * cuenta de coincidencias. Mientras Brain no conteste, la primera que encaja
   * abre una puerta razonable; cuando conteste, manda él.
   */
  return llevar(candidatas[0].id, 'palabras');
};

/**
 * Si un identificador puede ser destino desde donde se está.
 *
 * Weë Brain nunca lo es: no es un lugar de trabajo, y quien escribe en la caja
 * de un sitio ya está hablando con el mismo cerebro. Mandarle al chat sería
 * sacarle de donde está para llevarle a donde ya estaba.
 */
const cabeEn = (experienceId: string, dentroDe?: WorkspaceId): boolean => {
  const sitio = workspaceDe(experienceId);
  if (!sitio) return false;
  return dentroDe ? sitio === dentroDe : true;
};
