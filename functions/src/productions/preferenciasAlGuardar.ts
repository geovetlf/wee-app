import { validarPreferenciasDeModelo } from '../engine/preferenciasDeModelo';
import type { FilmmakerProduction } from '../filmmaker/modelo';

/**
 * LO QUE LA PERSONA ELIGE DEL MODELO, COMPROBADO AL GUARDAR. Modelo preferido, variantes y semilla de la producción y de cada
 * cuadro, contra las capacidades del modelo (`engine/preferenciasDeModelo.ts`: datos puros, ninguna llamada a ningún motor ni
 * proveedor). Devuelve los problemas; vacío = todo bien. Opcional: sin nada elegido no hay nada que mirar.
 */
export interface PreferenciaRechazada {
  readonly path: string;
  readonly reason: string;
  readonly parameters: Readonly<Record<string, string | number>>;
}

export const preferenciasRechazadas = (prod: FilmmakerProduction): readonly PreferenciaRechazada[] => {
  const malas: PreferenciaRechazada[] = [];
  const mirar = (g: { preferredModel?: unknown; variants?: unknown; consistencySeed?: unknown } | undefined, ruta: string): void => {
    if (!g) return;
    const v = validarPreferenciasDeModelo({ preferredModel: g.preferredModel, variants: g.variants, seed: g.consistencySeed });
    if (!v.ok) malas.push({ path: `${ruta}.${v.campo === 'seed' ? 'consistencySeed' : v.campo}`, reason: v.codigo, parameters: v.parametros });
  };
  mirar(prod.generation, 'generation');
  for (const s of prod.scenes) for (const p of s.shots) mirar(p.generation, `scenes.${s.id}.shots.${p.id}.generation`);
  return malas;
};
