import { veredictoDeIdioma } from '../shared/idiomaDelTexto';

/**
 * ¿SALIÓ EL TEXTO EN EL IDIOMA QUE SE PIDIÓ? SE OBSERVA; NO SE RECHAZA.
 *
 * Un modelo generativo no se puede obligar a escribir en un idioma: se le pide con claridad (`instruccionDeSalida` y
 * `recordatorioDeIdioma`, en prompts.ts) y casi siempre obedece. Lo que hace este archivo es DARSE CUENTA cuando no:
 * si el detector (`shared/idiomaDelTexto.ts`) está seguro de que un texto para la persona salió en otro idioma, el
 * resultado lo lleva apuntado (`JobResult.idiomaDeSalida`) y queda en el registro, con el trabajo y el paso para
 * poder encontrarlo. No se tira, no se repite y no se cobra distinto: rechazar por un falso positivo —un texto con
 * muchos nombres propios, una receta extranjera— sería peor que el error que se quería evitar. Con lo apuntado se
 * puede medir cuántas veces pasa y decidir con datos.
 *
 * No se mira lo que, por su naturaleza, va en el idioma del CONTENIDO y no en el de la app: traducir a otro idioma
 * y corregir un texto que trajo la persona. PULIR sí se mira (revisión post-auditoría 2026-10-01): en Weë Writer
 * `polish` es el último paso del flujo y pule el borrador que escribió Weë, en el idioma de la app; es justo el
 * texto final que lee la persona, y antes era el único que nunca se observaba.
 */
const IDIOMA_DEL_CONTENIDO = new Set(['translate', 'fix']);

export interface IdiomaDeSalida {
  esperado: string;
  detectado: string;
}

export const idiomaDeSalida = (
  output: { kind?: string; content?: string } | undefined,
  locale: string | undefined,
  kind: unknown,
  donde: { jobId?: string; stepId?: string } = {}
): { idiomaDeSalida?: IdiomaDeSalida } => {
  if (!output || output.kind !== 'text' || !output.content) return {};
  if (typeof kind === 'string' && IDIOMA_DEL_CONTENIDO.has(kind)) return {};
  /* Sin idioma —un cliente antiguo— se pidió español neutro. */
  const esperado = locale || 'es';
  const { veredicto, detectado } = veredictoDeIdioma(output.content, esperado);
  if (veredicto !== 'distinto' || !detectado) return {};
  console.warn('WEË AI: la respuesta no salió en el idioma pedido', { esperado, detectado, jobId: donde.jobId ?? null, stepId: donde.stepId ?? null });
  return { idiomaDeSalida: { esperado, detectado } };
};
