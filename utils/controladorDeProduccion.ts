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
 *   · al salir de la pantalla, lo que quedaba por mandar se manda;
 *   · volver a una versión y aplicar una propuesta de Weë Brain no son gestos:
 *     mientras viajan la producción está OCUPADA —no se edita ni se manda nada—,
 *     van con la revisión que se vio (CAS) y con un id que se repite en cada
 *     intento, y lo que vuelve se pone encima sin perder nada (Fase 22 del motor,
 *     arreglos R1 y R6 de la auditoría).
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
import { aplicarOperaciones } from '../services/filmmaker/dominio';
import type { FilmmakerIssue, FilmmakerOperation } from '../services/filmmaker/dominio';
import type { FalloDeProducciones, FilmmakerService } from '../services/filmmakerService';

/** Programa una función y devuelve cómo cancelarla. */
export type Programador = (fn: () => void, ms: number) => () => void;

export interface DependenciasDelControlador {
  readonly servicio: Pick<FilmmakerService, 'getProduction' | 'applyProductionOperations' | 'archiveProduction' | 'unarchiveProduction' | 'restoreProduction'>;
  readonly nuevoIdDeOperacion: () => string;
  readonly nuevoIdDeGesto?: () => string;
  readonly programar?: Programador;
  /** Cuánto se espera a que la persona pare antes de mandar lo acumulado. */
  readonly agruparMs?: number;
}

export type Carga = 'cargando' | 'lista' | 'error';

/** Lo que la tiene ocupada: volver a una versión, o aplicar una propuesta de Weë Brain (Fase 22 del motor). */
export type Ocupado = 'restaurando' | 'aplicando';

export interface InstantaneaDeProduccion {
  readonly carga: Carga;
  readonly falloDeCarga: FalloDeProducciones | null;
  readonly estado: EstadoOptimista;
  /** Mientras no es `null`, no se edita ni se manda nada: lo que viaja cambia la revisión entera. */
  readonly ocupado: Ocupado | null;
}

export type ResultadoDeGesto = { readonly ok: true } | { readonly ok: false; readonly problems: readonly FilmmakerIssue[] };

/** Por qué no se aplicó una propuesta de Weë Brain. `cambio`: la producción ya no está en la revisión en que se comprobó. */
export type MotivoDePropuesta = 'ocupado' | 'cambios_sin_guardar' | 'no_editable' | 'cambio' | 'rechazada' | 'fallo';
export type ResultadoDePropuesta =
  | { readonly ok: true; readonly applied: number; readonly alreadyApplied: boolean }
  | { readonly ok: false; readonly motivo: MotivoDePropuesta; readonly problems?: readonly FilmmakerIssue[]; readonly fallo?: FalloDeProducciones };

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
  let ocupado: Ocupado | null = null;
  /*
   * La última vuelta a una versión que no se sabe si llegó: la misma petición —desde la misma revisión, a la misma—
   * se repite con el MISMO id, y el servidor no la aplica dos veces.
   */
  let restauracion: { readonly clave: string; readonly operationId: string } | null = null;
  let instantanea: InstantaneaDeProduccion = { carga, falloDeCarga, estado, ocupado };
  const oyentes = new Set<() => void>();
  let cancelarEspera: (() => void) | null = null;
  let viajando = false;
  let conflictosSeguidos = 0;

  const avisar = (): void => {
    instantanea = { carga, falloDeCarga, estado, ocupado };
    oyentes.forEach((f) => f());
  };
  const ocupar = (o: Ocupado | null): void => {
    ocupado = o;
    avisar();
  };
  const despachar = (a: AccionOptimista): void => {
    estado = reducirProduccion(estado, a);
    avisar();
  };

  const puedeMandar = (): boolean => !ocupado && !estado.enVuelo && estado.pendientes.length > 0 && esEditable(estado) && estado.guardado !== 'error';

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
      if (hayCambiosSinGuardar(estado) || ocupado) return;
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
      /* Ocupada, no se edita: lo que vuelve cambia la revisión entera (la pantalla ya lo enseña apagado). */
      if (!operaciones.length || ocupado) return { ok: false, problems: [] };
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
      if (hayCambiosSinGuardar(estado) || ocupado) return { ok: false as const, motivo: 'cambios_sin_guardar' as const };
      const r = archivar ? await deps.servicio.archiveProduction(productionId) : await deps.servicio.unarchiveProduction(productionId);
      if (!r.ok) return { ok: false as const, motivo: 'fallo' as const, fallo: r.fallo };
      despachar({ tipo: 'estado', resumen: r.valor.resumen });
      if (!archivar) void enviar();
      return { ok: true as const };
    },

    /**
     * VOLVER A UNA VERSIÓN (Fase 20; en el servidor, Fase 12): como una revisión NUEVA encima de la de ahora, con CAS.
     * Con cambios sin guardar no se hace —primero se guardan—.
     *
     * Fase 22 del motor (arreglo R6 de la auditoría): mientras viaja, la producción está OCUPADA —no se edita ni se
     * manda nada, así que nada de lo que se haga se pierde ni choca con ella—; lo que vuelve se pone encima con
     * `externa` —antes se «cargaba» entera y se olvidaba lo que había que rehacer—; y si no se sabe si llegó, la
     * misma vuelta se repite con el mismo id.
     */
    restaurar: async (revision: number) => {
      if (ocupado) return { ok: false as const, motivo: 'ocupado' as const };
      if (hayCambiosSinGuardar(estado) || !estado.confirmada) return { ok: false as const, motivo: 'cambios_sin_guardar' as const };
      const expectedRevision = estado.confirmada.revision;
      const clave = `${expectedRevision}>${revision}`;
      const operationId = restauracion?.clave === clave ? restauracion.operationId : deps.nuevoIdDeOperacion();
      restauracion = { clave, operationId };
      ocupar('restaurando');
      try {
        const r = await deps.servicio.restoreProduction({ productionId, expectedRevision, revision, operationId });
        if (!r.ok) {
          if (!r.fallo.reintentable) restauracion = null;
          return { ok: false as const, motivo: 'fallo' as const, fallo: r.fallo };
        }
        restauracion = null;
        despachar({ tipo: 'externa', produccion: r.valor.produccion, pending: r.valor.pending });
        return { ok: true as const, restauradaDesde: r.valor.restoredFrom, cambio: r.valor.changed };
      } finally {
        ocupar(null);
      }
    },

    /**
     * APLICAR UNA PROPUESTA DE WEË BRAIN (Fase 22 del motor, arreglo R1 de la auditoría). No es un gesto: un gesto se
     * agrupa y, si alguien cambió la producción entre medias, se vuelve a aplicar encima de lo nuevo. Una propuesta se
     * comprobó sobre UNA revisión y solo vale sobre esa: viaja sola, con esa revisión esperada (CAS) y con el id que le
     * da quien la propone —el mismo en cada intento, así que repetirla tras un corte no la aplica dos veces—. Antes de
     * viajar se comprueba aquí, con F1-A, sobre lo mismo; si la producción cambió, se dice y no se aplica.
     */
    aplicarPropuesta: async (operaciones: readonly FilmmakerOperation[], baseRevision: number, operationId: string): Promise<ResultadoDePropuesta> => {
      if (ocupado) return { ok: false, motivo: 'ocupado' };
      if (hayCambiosSinGuardar(estado) || !estado.confirmada) return { ok: false, motivo: 'cambios_sin_guardar' };
      if (!esEditable(estado)) return { ok: false, motivo: 'no_editable' };
      if (estado.confirmada.revision !== baseRevision) return { ok: false, motivo: 'cambio' };
      const local = aplicarOperaciones(estado.confirmada.production, operaciones);
      if (!local.ok) return { ok: false, motivo: 'rechazada', problems: local.problems };
      ocupar('aplicando');
      try {
        const r = await deps.servicio.applyProductionOperations({ productionId, expectedRevision: baseRevision, operations: operaciones, operationId });
        if (!r.ok) return r.fallo.tipo === 'conflicto' ? { ok: false, motivo: 'cambio' } : { ok: false, motivo: 'fallo', fallo: r.fallo };
        despachar({ tipo: 'externa', produccion: r.valor.produccion, pending: r.valor.pending });
        return { ok: true, applied: r.valor.applied, alreadyApplied: r.valor.alreadyApplied };
      } finally {
        ocupar(null);
      }
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
