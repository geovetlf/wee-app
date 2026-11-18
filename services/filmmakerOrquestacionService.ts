import { filmmakerService, nuevoIdDeOperacion, nuevoIdDeProduccion } from './filmmakerService';
import type { FilmmakerService, NuevaProduccion, ProduccionGuardada, Resultado } from './filmmakerService';
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

type Ficha = { readonly id: string; readonly name: string; readonly description?: string; readonly identityDescription?: string };
const GRUPOS_DEL_UNIVERSO = [
  { clave: 'characters', una: 'character', campoTexto: 'identityDescription' },
  { clave: 'locations', una: 'location', campoTexto: 'description' },
  { clave: 'objects', una: 'object', campoTexto: 'description' },
] as const;

/** Lo que cambió en personajes, lugares y objetos entre lo guardado y lo que dice la pantalla, como operaciones del contrato (quitar, añadir, actualizar). */
export const operacionesDelUniverso = (antes: unknown, despues: unknown): FilmmakerOperation[] => {
  const quitar: FilmmakerOperation[] = []; const poner: FilmmakerOperation[] = []; const cambiar: FilmmakerOperation[] = [];
  for (const g of GRUPOS_DEL_UNIVERSO) {
    const a = new Map(((antes as Record<string, readonly Ficha[]>)[g.clave] ?? []).map((x) => [x.id, x]));
    const d = new Map(((despues as Record<string, readonly Ficha[]>)[g.clave] ?? []).map((x) => [x.id, x]));
    for (const id of a.keys()) if (!d.has(id)) quitar.push({ op: 'remove_' + g.una, [g.una + 'Id']: id, cascade: true } as unknown as FilmmakerOperation);
    for (const [id, x] of d) {
      const previo = a.get(id);
      if (!previo) { poner.push({ op: 'add_' + g.una, [g.una]: x } as unknown as FilmmakerOperation); continue; }
      const changes: Record<string, string> = {};
      if (previo.name !== x.name) changes.name = x.name;
      const texto = (previo as Record<string, string | undefined>)[g.campoTexto]; const nuevo = (x as Record<string, string | undefined>)[g.campoTexto];
      if (nuevo !== undefined && texto !== nuevo) changes[g.campoTexto] = nuevo;
      if (Object.keys(changes).length) cambiar.push({ op: 'update_' + g.una, [g.una + 'Id']: id, changes } as unknown as FilmmakerOperation);
    }
  }
  return [...quitar, ...poner, ...cambiar];
};

export const crearOrquestacion = (servicio: Pick<FilmmakerService, 'createProduction' | 'applyProductionOperations'>) => ({
  crear: async (e: Omit<ExperienciaDeFilmmaker, 'productionId'> & { readonly productionId?: string; readonly references?: NuevaProduccion['references'] }): Promise<Resultado<CreadaDesdeLaExperiencia>> => {
    const productionId = e.productionId ?? nuevoIdDeProduccion();
    const { production, omisiones, vozSinDestino } = produccionDesdeLaExperiencia({ ...e, productionId });
    const r = await servicio.createProduction({ productionId, title: production.title, production, ...(e.references && e.references.length ? { references: e.references } : {}) });
    return r.ok ? { ok: true, valor: { created: r.valor.created, produccion: r.valor.produccion, borrador: { omisiones, vozSinDestino } } } : r;
  },

  /** Reemplaza las escenas del servidor por las de la experiencia, en un lote. `guardada` es lo último leído (su `revision` es el CAS). */
  sincronizar: async (guardada: ProduccionGuardada, e: Omit<ExperienciaDeFilmmaker, 'productionId'>): Promise<Resultado<SincronizadaConElServidor>> => {
    const { production, omisiones, vozSinDestino } = produccionDesdeLaExperiencia({ ...e, productionId: guardada.productionId });
    /* Solo se toca lo que CAMBIÓ: una escena igual a la del servidor no se quita ni se vuelve a poner (quitarla borraría sus tomas). Una cambiada sí se
       reescribe, y sus tomas anteriores dejan de contar; la pantalla debe avisar antes si esa escena ya tenía vídeo. */
    const sin = (x: unknown): string => JSON.stringify(x, (k, v) => (k === 'order' || k === 'batch' ? undefined : v));
    /* El estado del capítulo (aprobado, en el almacén) se guarda con su propia operación: cambiarlo NO reescribe la escena ni borra sus tomas. */
    const lote = (s: { batch?: unknown }): string => JSON.stringify(s.batch ?? null);
    const loteEnServidor = new Map(guardada.production.scenes.map((s) => [s.id, lote(s)]));
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
    const reescritas = new Set(poner.map((o) => (o as unknown as { scene: { id: string } }).scene.id));
    const estados: FilmmakerOperation[] = production.scenes
      .filter((s) => !reescritas.has(s.id) && enServidor.has(s.id) && loteEnServidor.get(s.id) !== lote(s))
      .map((s) => ({ op: 'update_scene', sceneId: s.id, changes: { batch: s.batch ?? null } }) as unknown as FilmmakerOperation);
    /* El modelo preferido, las variantes y la semilla viajan con `change_generation` solo si cambiaron (null quita). */
    const antes = guardada.production.generation as unknown as Record<string, unknown>;
    const ahora = production.generation as unknown as Record<string, unknown>;
    const campos = ['preferredModel', 'variants', 'consistencySeed'] as const;
    const generacion: FilmmakerOperation[] = campos.some((k) => (antes?.[k] ?? null) !== (ahora?.[k] ?? null))
      ? [{ op: 'change_generation', target: { scope: 'production' }, ...Object.fromEntries(campos.filter((k) => (antes?.[k] ?? null) !== (ahora?.[k] ?? null)).map((k) => [k, ahora?.[k] ?? null])) } as unknown as FilmmakerOperation]
      : [];
    /* El universo (personajes, lugares, objetos) cambia con sus propias operaciones: añadir, actualizar y quitar (con sus líneas). Va antes de las escenas nuevas, que pueden usarlo. */
    const universoOps = operacionesDelUniverso(guardada.production, production);
    const operations = [...generacion, ...quitar, ...universoOps, ...poner, ...estados];
    if (!operations.length) return { ok: true, valor: { applied: 0, produccion: guardada, borrador: { omisiones, vozSinDestino } } };
    const r = await servicio.applyProductionOperations({
      productionId: guardada.productionId, expectedRevision: guardada.revision, operations, operationId: nuevoIdDeOperacion(),
    });
    return r.ok ? { ok: true, valor: { applied: r.valor.applied, produccion: r.valor.produccion, borrador: { omisiones, vozSinDestino } } } : r;
  },
});

export const filmmakerOrquestacionService = crearOrquestacion(filmmakerService);
