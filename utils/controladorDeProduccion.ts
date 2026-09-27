/**
 * WEË FILMMAKER · QUIÉN HABLA CON EL SERVIDOR MIENTRAS SE EDITA (F1-C).
 *
 * El estado vive en `utils/produccionOptimista.ts`, que es puro. Esto decide
 * CUÁNDO se manda y qué se hace con la respuesta:
 *
 *   · los gestos se agrupan: se espera a que la persona pare un momento y lo
 *     que se acumuló viaja en UN lote. No hay una llamada por gesto;
 *   · un lote viaja congelado. Si la red falla, se repite TAL CUAL cuando se
 *     pide —mismo id, misma revisión esperada—, y el servidor no lo aplica dos
 *     veces;
 *   · si el servidor dice `aborted` por la revisión, se trae la versión de
 *     ahora, se vuelve a aplicar encima todo lo tuyo y se manda otra vez. Nada
 *     se pisa y nada se pierde sin decirlo;
 *   · al salir de la pantalla, lo que quedaba por mandar se manda.
 *
 * No hay temporizadores de mentira ni progreso inventado: la única espera es la
 * de agrupar gestos, y el único estado es el que el servidor confirma.
 *
 * Sin React y sin Firebase: el servicio y el reloj entran por parámetro, así se
 * prueba entero en Node (`functions/test/filmmaker-reductor.test.mjs`).
 */
import {
  AccionOptimista, ESTADO_INICIAL, EstadoOptimista, Gesto, esEditable, hayCambiosSinGuardar, reducirProduccion,
} from './produccionOptimista';
import type { FilmmakerIssue, FilmmakerOperation } from '../services/filmmaker/dominio';
import type { FalloDeProducciones, FilmmakerService } from '../services/filmmakerService';

/** Programa una función y devuelve cómo cancelarla. */
export type Programador = (fn: () => void, ms: number) => () => void;

export interface DependenciasDelControlador {
  readonly servicio: Pick<FilmmakerService, 'getProduction' | 'applyProductionOperations' | 'archiveProduction' | 'unarchiveProduction'>;
  readonly nuevoIdDeOperacion: () => string;
  readonly nuevoIdDeGesto?: () => string;
  readonly programar?: Programador;
  /** Cuánto se espera a que la persona pare antes de mandar lo acumulado. */
  readonly agruparMs?: number;
}

export type Carga = 'cargando' | 'lista' | 'error';

export interface InstantaneaDeProduccion {
  readonly carga: Carga;
  readonly falloDeCarga: FalloDeProducciones | null;
  readonly estado: EstadoOptimista;
}

export type ResultadoDeGesto = { readonly ok: true } | { readonly ok: false; readonly problems: readonly FilmmakerIssue[] };

/** Lo que se espera por defecto a que la persona pare: lo justo para juntar gestos seguidos. */
export const AGRUPAR_MS = 900;
/** Conflictos seguidos antes de parar y preguntar: si no, dos pantallas a la vez podrían perseguirse sin fin. */
export const CONFLICTOS_SEGUIDOS = 3;

const programarConReloj: Programador = (fn, ms) => {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
};

export const crearControladorDeProduccion = (productionId: string, deps: DependenciasDelControlador) => {
  const programar = deps.programar ?? programarConReloj;
  const agruparMs = deps.agruparMs ?? AGRUPAR_MS;
  let gestos = 0;
  const idDeGesto = deps.nuevoIdDeGesto ?? (() => `g${++gestos}`);

  let estado: EstadoOptimista = ESTADO_INICIAL;
  let carga: Carga = 'cargando';
  let falloDeCarga: FalloDeProducciones | null = null;
  let instantanea: InstantaneaDeProduccion = { carga, falloDeCarga, estado };
  const oyentes = new Set<() => void>();
  let cancelarEspera: (() => void) | null = null;
  let viajando = false;
  let conflictosSeguidos = 0;

  const avisar = (): void => {
    instantanea = { carga, falloDeCarga, estado };
    oyentes.forEach((f) => f());
  };
  const despachar = (a: AccionOptimista): void => {
    estado = reducirProduccion(estado, a);
    avisar();
  };

  const puedeMandar = (): boolean => !estado.enVuelo && estado.pendientes.length > 0 && esEditable(estado) && estado.guardado !== 'error';

  /** Manda el lote que viaja, o forma uno con lo que espera. Uno a la vez. */
  const enviar = async (): Promise<void> => {
    if (viajando) return;
    if (!estado.enVuelo) {
      if (!puedeMandar()) return;
      despachar({ tipo: 'enviar', operationId: deps.nuevoIdDeOperacion() });
    }
    const lote = estado.enVuelo;
    if (!lote || estado.guardado === 'error') return;
    viajando = true;
    const r = await deps.servicio.applyProductionOperations({
      productionId,
      expectedRevision: lote.expectedRevision,
      operations: lote.gestos.flatMap((g) => g.operaciones),
      operationId: lote.operationId,
    });
    if (r.ok) {
      conflictosSeguidos = 0;
      despachar({ tipo: 'confirmado', lote: r.valor });
    } else if (r.fallo.tipo === 'conflicto' && conflictosSeguidos < CONFLICTOS_SEGUIDOS) {
      conflictosSeguidos++;
      const actual = await deps.servicio.getProduction(productionId);
      if (actual.ok) despachar({ tipo: 'reconstruir', produccion: actual.valor });
      else despachar({ tipo: 'fallido', fallo: actual.fallo });
    } else {
      despachar({ tipo: 'fallido', fallo: r.fallo });
    }
    viajando = false;
    /* Lo que se acumuló mientras viajaba ya esperó bastante: sale ahora. */
    if (puedeMandar()) void enviar();
  };

  const esperarYMandar = (): void => {
    cancelarEspera?.();
    cancelarEspera = programar(() => { cancelarEspera = null; void enviar(); }, agruparMs);
  };

  return {
    /** Para `useSyncExternalStore`: la misma instantánea mientras nada cambie. */
    leer: (): InstantaneaDeProduccion => instantanea,
    suscribir: (fn: () => void): (() => void) => { oyentes.add(fn); return () => { oyentes.delete(fn); }; },

    /** Abrir la producción. Sin nada tuyo pendiente, se puede repetir para refrescar. */
    cargar: async (): Promise<void> => {
      if (hayCambiosSinGuardar(estado)) return;
      carga = 'cargando';
      falloDeCarga = null;
      avisar();
      const r = await deps.servicio.getProduction(productionId);
      if (r.ok) {
        carga = 'lista';
        despachar({ tipo: 'cargada', produccion: r.valor });
      } else {
        carga = 'error';
        falloDeCarga = r.fallo;
        avisar();
      }
    },

    /**
     * UN GESTO: una o varias operaciones de F1-A que van juntas. Se aplican aquí
     * al momento; si F1-A las rechaza, se dice por qué y nada cambia.
     */
    gesto: (operaciones: readonly FilmmakerOperation[]): ResultadoDeGesto => {
      if (!operaciones.length) return { ok: false, problems: [] };
      const antes = estado.pendientes.length;
      const gesto: Gesto = { id: idDeGesto(), operaciones };
      despachar({ tipo: 'gesto', gesto });
      if (estado.pendientes.length > antes) { esperarYMandar(); return { ok: true }; }
      return estado.rechazo ? { ok: false, problems: estado.rechazo } : { ok: true };
    },

    /** «Guardar ahora»: sin esperar a que la persona pare. */
    guardarAhora: (): void => {
      cancelarEspera?.();
      cancelarEspera = null;
      void enviar();
    },

    /** Repetir lo que falló, tal cual. */
    reintentar: (): void => {
      conflictosSeguidos = 0;
      despachar({ tipo: 'reintentar' });
      void enviar();
    },

    /** Archivar o desarchivar. Con cambios sin guardar no se hace: primero se guardan. */
    archivar: async (archivar: boolean) => {
      if (hayCambiosSinGuardar(estado)) return { ok: false as const, motivo: 'cambios_sin_guardar' as const };
      const r = archivar ? await deps.servicio.archiveProduction(productionId) : await deps.servicio.unarchiveProduction(productionId);
      if (!r.ok) return { ok: false as const, motivo: 'fallo' as const, fallo: r.fallo };
      despachar({ tipo: 'estado', resumen: r.valor.resumen });
      if (!archivar) void enviar();
      return { ok: true as const };
    },

    /** Que la persona ya leyó los avisos de conflicto y de rechazo. */
    vistos: (): void => despachar({ tipo: 'vistos' }),

    /** Al salir: no se espera más; lo que quedaba por mandar se manda. */
    cerrar: (): void => {
      cancelarEspera?.();
      cancelarEspera = null;
      void enviar();
    },
  };
};

export type ControladorDeProduccion = ReturnType<typeof crearControladorDeProduccion>;
