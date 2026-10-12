import { ajustesDe, ContextoDeCreacion, GrupoDeAjustes, GRUPOS_DE_AJUSTES } from '../constants/ajustesContextuales';

/**
 * LOS AJUSTES DEL STUDIO, EN PALABRAS, PARA QUE VIAJEN (R9 · E2, trazabilidad).
 *
 * La hoja de ajustes de Weë Studio (`AjustesContextuales`) guardaba lo elegido —formato, duración, estilo, tono…— y no lo
 * mandaba a ninguna parte: al pulsar Crear, `CreatorFlow` recibía lo escrito y los controles de cámara, pero no los
 * ajustes. Era un control que no llegaba al servidor.
 *
 * Viajan por el MISMO canal que los controles de cámara: dichos con palabras dentro del objetivo, porque hoy el plan
 * entiende una frase y no lee una estructura de ajustes (la deuda de B3.12, que vigila `studio-voz.test.mjs`). No se
 * inventa un campo nuevo en el contrato ni en el servidor.
 *
 * Reglas: «Automático» es no decir nada (deja decidir a Weë); solo viajan los ajustes que la hoja PREGUNTA en el
 * contexto actual —si se eligió «10 s» para un vídeo y luego se escribe un texto, la duración ya no aplica y no se
 * manda—; y una opción que el catálogo no conoce se deja fuera. Lo que viaja es la palabra en el idioma de la persona,
 * nunca el identificador.
 */
export const palabrasDeLosAjustesDelStudio = (
  elegido: Readonly<Record<string, string>>,
  contexto: ContextoDeCreacion,
  t: (clave: string) => string,
  grupos: GrupoDeAjustes[] = GRUPOS_DE_AJUSTES,
): string[] => {
  const preguntados = ajustesDe(contexto, grupos);
  return Object.entries(elegido).flatMap(([grupo, opcion]) => {
    if (opcion === 'auto') return [];
    const o = preguntados.find((g) => g.id === grupo)?.opciones.find((x) => x.id === opcion);
    return o ? [t(o.clave)] : [];
  });
};
