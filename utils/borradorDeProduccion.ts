import { LIMITES, aplicarOperaciones, configuracionDePreset, produccionVacia } from '../services/filmmaker/dominio';
import type { AspectRatio, FilmmakerOperation, FilmmakerProduction, FormatPresetId } from '../services/filmmaker/dominio';
import { OPERACION_DE_LA_RUTA } from '../constants/filmmaker';
import { tituloDesdeLaIdea } from './presentacionDeProduccion';

/**
 * WEË FILMMAKER · LA PRODUCCIÓN QUE NACE DE LO QUE SE ESCRIBIÓ EN WEË STUDIO (F1-C).
 *
 * Una producción vacía de F1-A (`produccionVacia`), con el formato elegido —y,
 * si es un preset, su configuración (`configuracionDePreset`)—, la idea tal como
 * se escribió como intención y, si en «Varias escenas» se eligieron controles de
 * cámara, esos controles como dirección de toda la producción, puestos con las
 * operaciones de F1-A. Nada se interpreta: «20 s, vertical, 5 planos» no se
 * convierte en escenas aquí —eso es de Weë Brain, en otra fase—; se guarda como
 * lo que es, la idea de la persona.
 *
 * Es el borrador de la revisión 0: se manda entero a `productions` y el servidor
 * lo vuelve a comprobar todo.
 */

/** Los controles de cámara elegidos, por ruta, como operaciones de F1-A sobre toda la producción. */
export const operacionesDelCreativo = (seleccion: Readonly<Record<string, string>> | undefined): FilmmakerOperation[] => {
  const porOperacion = new Map<string, Record<string, string>>();
  for (const [ruta, valor] of Object.entries(seleccion ?? {})) {
    const destino = OPERACION_DE_LA_RUTA[ruta];
    if (!destino || typeof valor !== 'string') continue;
    porOperacion.set(destino.op, { ...(porOperacion.get(destino.op) ?? {}), [destino.campo]: valor });
  }
  return [...porOperacion].map(([op, campos]) => ({ op, target: { scope: 'production' }, ...campos }) as unknown as FilmmakerOperation);
};

export const borradorDesdeLaIdea = (p: {
  readonly productionId: string;
  readonly idea: string;
  readonly preset?: FormatPresetId;
  readonly aspectRatio: AspectRatio;
  readonly creativo?: Readonly<Record<string, string>>;
}): FilmmakerProduction => {
  const idea = Array.from(p.idea.trim()).slice(0, LIMITES.textoLibre).join('');
  let prod = produccionVacia({ title: tituloDesdeLaIdea(idea, LIMITES.nombre), aspectRatio: p.aspectRatio, id: p.productionId });
  if (p.preset) prod = { ...prod, ...configuracionDePreset(p.preset) };
  prod = { ...prod, intent: { freeText: idea } };
  const ops = operacionesDelCreativo(p.creativo);
  if (!ops.length) return prod;
  /* Si alguno de los controles no valiera, la producción nace sin ellos: la idea no se pierde por eso. */
  const r = aplicarOperaciones(prod, ops);
  return r.ok ? { ...r.production, metadata: { ...r.production.metadata, revision: 0 } } : prod;
};
