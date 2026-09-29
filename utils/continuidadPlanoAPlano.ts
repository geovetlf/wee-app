import { estadoEfectivo, repartoDelPlano } from '../services/filmmaker/dominio';
import type { FilmmakerProduction, TimeOfDay, Weather } from '../services/filmmaker/dominio';

/**
 * LA CONTINUIDAD, PLANO A PLANO (Filmmaker Engine, Fase 35).
 *
 * Lo que F1-A ya sabe de cada plano, en orden, para VER cómo evoluciona la pieza de uno a otro: quién sale y cómo
 * está (vestuario y «cómo está», con lo que viene de la escena dicho), quién entra y quién sale respecto al plano
 * anterior, qué cambia en quien sigue, qué objetos hay, y el lugar, el momento y el clima de su escena. Una escena sin
 * planos es una fila en sí misma.
 *
 * Solo lectura y pura: el estado efectivo es el de F1-A (\`estadoEfectivo\`, \`repartoDelPlano\`) —el mismo que llega
 * al texto de la toma—, no otro. El estado estructurado (postura, emoción, posición, el de un lugar o un objeto) no
 * existe en F1-A: es el contrato 5, y aquí no se inventa.
 */
export interface EstadoEnElPlano {
  readonly characterId: string;
  readonly nombre: string;
  readonly vestuario?: string;
  readonly comoEsta?: string;
  /** Lo dice la escena, no este plano. */
  readonly vestuarioDeLaEscena: boolean;
  readonly comoEstaDeLaEscena: boolean;
  /** Sigue desde el plano anterior y algo de su estado es distinto. */
  readonly cambia: boolean;
}

export interface FilaDeContinuidad {
  readonly unitId: string;
  readonly sceneId: string;
  readonly shotId?: string;
  /** Desde 1. */
  readonly escena: number;
  readonly plano?: number;
  readonly lugar?: string;
  readonly momento?: TimeOfDay;
  readonly clima?: Weather;
  readonly personajes: readonly EstadoEnElPlano[];
  readonly objetos: readonly string[];
  /** Respecto a la fila anterior: quién aparece y quién deja de salir (por nombre). */
  readonly entran: readonly string[];
  readonly salen: readonly string[];
}

export const continuidadPlanoAPlano = (prod: FilmmakerProduction): readonly FilaDeContinuidad[] => {
  const nombreDePersonaje = new Map(prod.characters.map((c) => [c.id, c.name] as [string, string]));
  const nombreDeObjeto = new Map(prod.objects.map((o) => [o.id, o.name] as [string, string]));
  const nombreDeLugar = new Map(prod.locations.map((l) => [l.id, l.name] as [string, string]));
  const filas: FilaDeContinuidad[] = [];
  let anterior: ReadonlyMap<string, { vestuario?: string; comoEsta?: string }> = new Map();
  prod.scenes.forEach((scene, i) => {
    const unidades = scene.shots.length ? scene.shots.map((shot, j) => ({ shot, plano: j + 1 })) : [{ shot: undefined, plano: undefined }];
    for (const { shot, plano } of unidades) {
      const reparto = repartoDelPlano(scene, shot);
      const actual = new Map<string, { vestuario?: string; comoEsta?: string }>();
      const personajes = reparto.map((id) => {
        const efectivo = estadoEfectivo(scene, shot, id);
        const dePlano = (shot?.characterStates ?? []).find((s) => s.characterId === id);
        const deEscena = (scene.characterStates ?? []).find((s) => s.characterId === id);
        const vestuario = efectivo?.wardrobe;
        const comoEsta = efectivo?.appearanceNotes;
        actual.set(id, { vestuario, comoEsta });
        const antes = anterior.get(id);
        return {
          characterId: id,
          nombre: nombreDePersonaje.get(id) ?? id,
          ...(vestuario !== undefined ? { vestuario } : {}),
          ...(comoEsta !== undefined ? { comoEsta } : {}),
          vestuarioDeLaEscena: vestuario !== undefined && dePlano?.wardrobe === undefined && deEscena?.wardrobe !== undefined,
          comoEstaDeLaEscena: comoEsta !== undefined && dePlano?.appearanceNotes === undefined && deEscena?.appearanceNotes !== undefined,
          cambia: !!antes && (antes.vestuario !== vestuario || antes.comoEsta !== comoEsta),
        };
      });
      const entran = reparto.filter((id) => !anterior.has(id)).map((id) => nombreDePersonaje.get(id) ?? id);
      const salen = [...anterior.keys()].filter((id) => !actual.has(id)).map((id) => nombreDePersonaje.get(id) ?? id);
      const objetos = (shot?.objectIds ?? scene.objectIds ?? []).map((id) => nombreDeObjeto.get(id) ?? id);
      filas.push({
        unitId: shot?.id ?? scene.id,
        sceneId: scene.id,
        ...(shot ? { shotId: shot.id } : {}),
        escena: i + 1,
        ...(plano !== undefined ? { plano } : {}),
        ...(scene.locationId ? { lugar: nombreDeLugar.get(scene.locationId) ?? scene.locationId } : {}),
        ...(scene.timeOfDay ? { momento: scene.timeOfDay } : {}),
        ...(scene.weather ? { clima: scene.weather } : {}),
        personajes,
        objetos,
        entran: filas.length ? entran : [],
        salen,
      });
      anterior = actual;
    }
  });
  return filas;
};
