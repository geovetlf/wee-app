import { filmmakerService, nuevoIdDeOperacion, nuevoIdDeProduccion } from './filmmakerService';
import type { FilmmakerService, ProduccionGuardada, Resultado } from './filmmakerService';
import type { FilmmakerOperation, NewScene } from './filmmaker/dominio';
import { produccionDesdeLaExperiencia } from '../utils/filmmakerOrquestacion';
import type { ExperienciaDeFilmmaker, ResultadoDelBorrador } from '../utils/filmmakerOrquestacion';

/**
 * WEË FILMMAKER · ORQUESTACIÓN DEL CLIENTE: conecta las etapas de la experiencia con `productions` (y, para las tomas, con `shots`/`generateVideo`
 * por `hooks/useTomaDePlano`). NO es un orquestador de IA ni un router: no elige modelo, no genera, no cobra. Solo escribe el contrato del engine
 * y lo lee de vuelta. Weë Brain, el Core Runtime y el engine siguen siendo los de siempre (regla 10).
 *
 *   crear        · idea + tipo + estilo (+ universo y capítulos que ya haya) → `productions.create` con el borrador en revisión 0. Idempotente por id.
 *   sincronizar  · capítulos y cuadros → escenas y planos, EN UN SOLO LOTE (todo o nada, sobre la revisión leída). Cambia SOLO las escenas:
 *                  el universo (personajes, lugares, objetos) hoy solo entra al CREAR, porque las 30 operaciones de este contrato no tienen
 *                  `add_character`/`add_location` (las 57 de `filmmaker/core` sí). Si cambió el universo, ver `NOTA-DE-INTEGRACION`.
 *
 * Los servicios entran por parámetro (`crearOrquestacion`) para probarlo sin red; `filmmakerOrquestacionService` es el de la app.
 */

export interface CreadaDesdeLaExperiencia {
  readonly created: boolean;
  readonly produccion: ProduccionGuardada;
  /** Lo que NO viajó y por qué (ejemplos, voces sin destino, cámara no válida…): la pantalla lo dice, no lo esconde. */
  readonly borrador: Pick<ResultadoDelBorrador, 'omisiones' | 'vozSinDestino'>;
}

export interface SincronizadaConElServidor {
  readonly applied: number;
  readonly produccion: ProduccionGuardada;
  readonly borrador: Pick<ResultadoDelBorrador, 'omisiones' | 'vozSinDestino'>;
}

export const crearOrquestacion = (servicio: Pick<FilmmakerService, 'createProduction' | 'applyProductionOperations'>) => ({
  crear: async (e: Omit<ExperienciaDeFilmmaker, 'productionId'> & { readonly productionId?: string }): Promise<Resultado<CreadaDesdeLaExperiencia>> => {
    const productionId = e.productionId ?? nuevoIdDeProduccion();
    const { production, omisiones, vozSinDestino } = produccionDesdeLaExperiencia({ ...e, productionId });
    const r = await servicio.createProduction({ productionId, title: production.title, production });
    return r.ok ? { ok: true, valor: { created: r.valor.created, produccion: r.valor.produccion, borrador: { omisiones, vozSinDestino } } } : r;
  },

  /** Reemplaza las escenas del servidor por las de la experiencia, en un lote. `guardada` es lo último leído (su `revision` es el CAS). */
  sincronizar: async (guardada: ProduccionGuardada, e: Omit<ExperienciaDeFilmmaker, 'productionId'>): Promise<Resultado<SincronizadaConElServidor>> => {
    const { production, omisiones, vozSinDestino } = produccionDesdeLaExperiencia({ ...e, productionId: guardada.productionId });
    /* Solo se toca lo que CAMBIÓ: una escena igual a la del servidor no se quita ni se vuelve a poner (quitarla borraría sus tomas). Una cambiada sí se
       reescribe, y sus tomas anteriores dejan de contar; la pantalla debe avisar antes si esa escena ya tenía vídeo. */
    const sin = (x: unknown): string => JSON.stringify(x, (k, v) => (k === 'order' ? undefined : v));
    const enServidor = new Map(guardada.production.scenes.map((s) => [s.id, sin(s)]));
    const nuevas = new Map(production.scenes.map((s) => [s.id, sin(s)]));
    const quitar: FilmmakerOperation[] = guardada.production.scenes
      .filter((s) => nuevas.get(s.id) !== sin(s))
      .map((s) => ({ op: 'remove_scene', sceneId: s.id, cascade: true }) as FilmmakerOperation);
    const poner: FilmmakerOperation[] = [];
    production.scenes.forEach((s, i) => {
      if (enServidor.get(s.id) === nuevas.get(s.id)) return;
      const { order: _orden, shots, ...escena } = s;
      poner.push({ op: 'add_scene', atOrder: i, scene: { ...escena, shots: shots.map(({ order: _o, ...p }) => p) } as NewScene } as FilmmakerOperation);
    });
    const operations = [...quitar, ...poner];
    if (!operations.length) return { ok: true, valor: { applied: 0, produccion: guardada, borrador: { omisiones, vozSinDestino } } };
    const r = await servicio.applyProductionOperations({
      productionId: guardada.productionId, expectedRevision: guardada.revision, operations, operationId: nuevoIdDeOperacion(),
    });
    return r.ok ? { ok: true, valor: { applied: r.valor.applied, produccion: r.valor.produccion, borrador: { omisiones, vozSinDestino } } } : r;
  },
});

export const filmmakerOrquestacionService = crearOrquestacion(filmmakerService);
