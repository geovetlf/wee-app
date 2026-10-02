/**
 * WEË FILMMAKER · LA PRODUCCIÓN EN LA PANTALLA, ANTES DE QUE EL SERVIDOR CONTESTE (F1-C).
 *
 * Cada gesto del storyboard —subir un plano, dividir una escena, cambiar el
 * clima— se aplica AQUÍ primero y se ve al instante; el servidor lo recibe
 * después, agrupado con los demás, y lo confirma o no. Sin una llamada por gesto
 * y sin esperar a la red para ver lo que acabas de hacer.
 *
 * ── Lo que NO hay aquí ──────────────────────────────────────────────────────
 *
 * Ni una regla de la producción. Validar y aplicar es `aplicarOperaciones` de
 * F1-A —el espejo generado, el mismo código que usa el servidor—, así que lo que
 * aquí se acepta es exactamente lo que allí se aceptaría sobre la misma base. Ni
 * una operación nueva: lo que F1-A no sabe cambiar, aquí no se cambia.
 *
 * ── El recorrido de un gesto ────────────────────────────────────────────────
 *
 *   gesto            se aplica en local; si F1-A lo rechaza, se dice por qué y
 *                    no cambia nada más
 *   enviar           los gestos esperando forman UN lote, congelado: mismas
 *                    operaciones, mismo id, misma revisión esperada
 *   confirmado       la revisión nueva manda; lo que se hizo mientras tanto se
 *                    vuelve a aplicar encima
 *   fallido          sin conexión, el lote se queda como estaba para repetirlo
 *                    TAL CUAL (el servidor reconoce el id y no lo aplica dos
 *                    veces); rechazado, se deshace lo suyo y se dice por qué
 *   reconstruir      tras un conflicto: la versión de ahora, y encima todo lo
 *                    tuyo sin confirmar, gesto a gesto; lo que ya no cabe se
 *                    descarta Y SE DICE, nunca en silencio
 *
 * Todo es puro: la misma entrada da la misma salida. Quien llama al servidor, y
 * cuándo, es `utils/controladorDeProduccion.ts`.
 */
import { aplicarOperaciones } from '../services/filmmaker/dominio';
import type { FilmmakerIssue, FilmmakerOperation, FilmmakerProduction, PendingRegeneration } from '../services/filmmaker/dominio';
import type { FalloDeProducciones, LoteConfirmado, ProduccionGuardada, ResumenDeProduccion } from '../services/filmmakerService';

/** Lo que cabe en un lote: el mismo tope que pone el servidor. */
export const OPERACIONES_POR_LOTE = 50;

/** Un gesto: una o varias operaciones que van juntas —aceptar una propuesta es un gesto—, todas o ninguna. */
export interface Gesto {
  readonly id: string;
  readonly operaciones: readonly FilmmakerOperation[];
}

/** El lote que está viajando. Congelado: si hay que repetirlo, se repite igual. */
export interface LoteEnVuelo {
  readonly operationId: string;
  readonly expectedRevision: number;
  readonly gestos: readonly Gesto[];
}

/** Lo que no se pudo aplicar, con el porqué del dominio o del servidor. */
export interface Descartado {
  readonly gesto: Gesto;
  readonly problems: readonly FilmmakerIssue[];
}

export type EstadoDeGuardado = 'guardado' | 'pendiente' | 'guardando' | 'error';

export interface EstadoOptimista {
  /** Lo último que el servidor confirmó. */
  readonly confirmada: ProduccionGuardada | null;
  readonly enVuelo: LoteEnVuelo | null;
  /** Gestos aplicados aquí y todavía sin mandar, en orden. */
  readonly pendientes: readonly Gesto[];
  /** Lo que se pinta: la confirmada, con lo que viaja y lo pendiente aplicados encima. */
  readonly vista: FilmmakerProduction | null;
  readonly guardado: EstadoDeGuardado;
  readonly fallo: FalloDeProducciones | null;
  /** Hubo un conflicto y se reconstruyó sobre la versión de otra persona o de otro dispositivo. */
  readonly conflicto: boolean;
  readonly descartados: readonly Descartado[];
  /** El último gesto que no se aplicó en local, con sus problemas. No cambió nada. */
  readonly rechazo: readonly FilmmakerIssue[] | null;
  /** Lo que F1-A dice que puede haber que rehacer, acumulado desde que se abrió. */
  readonly porRehacer: PendingRegeneration;
}

export type AccionOptimista =
  | { readonly tipo: 'cargada'; readonly produccion: ProduccionGuardada }
  | { readonly tipo: 'gesto'; readonly gesto: Gesto }
  | { readonly tipo: 'enviar'; readonly operationId: string }
  | { readonly tipo: 'confirmado'; readonly lote: LoteConfirmado }
  | { readonly tipo: 'fallido'; readonly fallo: FalloDeProducciones }
  | { readonly tipo: 'reintentar' }
  | { readonly tipo: 'reconstruir'; readonly produccion: ProduccionGuardada }
  | { readonly tipo: 'estado'; readonly resumen: ResumenDeProduccion }
  | { readonly tipo: 'vistos' };

const NADA_POR_REHACER: PendingRegeneration = Object.freeze({ scenes: [], shots: [], audio: [], removed: [] });

export const ESTADO_INICIAL: EstadoOptimista = Object.freeze({
  confirmada: null,
  enVuelo: null,
  pendientes: [],
  vista: null,
  guardado: 'guardado' as EstadoDeGuardado,
  fallo: null,
  conflicto: false,
  descartados: [],
  rechazo: null,
  porRehacer: NADA_POR_REHACER,
});

/** Un problema dicho con la misma forma que los del dominio, para lo que no es del dominio. */
const problemaDe = (code: string): FilmmakerIssue => ({
  code, severity: 'error', path: '', parameters: {}, messageKey: `filmmaker.persistence.${code}`,
});

const unir = (a: readonly string[], b: readonly string[]): readonly string[] => [...new Set([...a, ...b])].sort();

/** Lo nuevo por rehacer se suma a lo que ya había; lo que se quitó deja de estar pendiente. */
const sumarPorRehacer = (antes: PendingRegeneration, nuevo: PendingRegeneration): PendingRegeneration => {
  const fuera = new Set(nuevo.removed);
  const sin = (xs: readonly string[]) => xs.filter((x) => !fuera.has(x));
  return {
    scenes: sin(unir(antes.scenes, nuevo.scenes)),
    shots: sin(unir(antes.shots, nuevo.shots)),
    audio: sin(unir(antes.audio, nuevo.audio)),
    removed: unir(antes.removed, nuevo.removed),
  };
};

/**
 * VOLVER A APLICAR, GESTO A GESTO, SOBRE UNA BASE. Lo que ya no cabe se aparta
 * con sus problemas; lo demás sigue, en su orden. Es lo que se hace tras un
 * conflicto y tras cada confirmación: F1-A es determinista, así que un gesto que
 * valía sobre la misma base vale igual.
 */
export const reaplicar = (
  base: FilmmakerProduction,
  gestos: readonly Gesto[],
): { readonly vista: FilmmakerProduction; readonly quedan: readonly Gesto[]; readonly descartados: readonly Descartado[]; readonly porRehacer: PendingRegeneration } => {
  let vista = base;
  let porRehacer = NADA_POR_REHACER;
  const quedan: Gesto[] = [];
  const descartados: Descartado[] = [];
  for (const g of gestos) {
    const r = aplicarOperaciones(vista, g.operaciones);
    if (!r.ok) { descartados.push({ gesto: g, problems: r.problems }); continue; }
    if (r.applied === 0) continue;
    vista = r.production;
    porRehacer = sumarPorRehacer(porRehacer, r.pending);
    quedan.push(g);
  }
  return { vista, quedan, descartados, porRehacer };
};

/** Los gestos que forman el próximo lote: enteros, en orden y sin pasar del tope. Al menos uno. */
export const siguienteLote = (pendientes: readonly Gesto[]): { readonly lote: readonly Gesto[]; readonly resto: readonly Gesto[] } => {
  let cuenta = 0;
  let i = 0;
  while (i < pendientes.length && (i === 0 || cuenta + pendientes[i].operaciones.length <= OPERACIONES_POR_LOTE)) {
    cuenta += pendientes[i].operaciones.length;
    i++;
  }
  return { lote: pendientes.slice(0, i), resto: pendientes.slice(i) };
};

/** ¿Se puede editar? Solo lo que está cargado y activo. */
export const esEditable = (e: EstadoOptimista): boolean => !!e.confirmada && !!e.vista && e.confirmada.status === 'active';

/** ¿Hay algo tuyo que el servidor todavía no tiene? */
export const hayCambiosSinGuardar = (e: EstadoOptimista): boolean => !!e.enVuelo || e.pendientes.length > 0;

/** La vista de lo que hay: la confirmada, más lo que viaja, más lo pendiente. */
const reconstruirVista = (e: EstadoOptimista, confirmada: ProduccionGuardada): Pick<EstadoOptimista, 'vista' | 'pendientes'> & { descartados: readonly Descartado[] } => {
  const enVuelo = e.enVuelo?.gestos ?? [];
  const r = reaplicar(confirmada.production, [...enVuelo, ...e.pendientes]);
  const quedanPendientes = r.quedan.filter((g) => !enVuelo.includes(g));
  return { vista: r.vista, pendientes: quedanPendientes, descartados: r.descartados };
};

export const reducirProduccion = (e: EstadoOptimista, a: AccionOptimista): EstadoOptimista => {
  switch (a.tipo) {
    case 'cargada':
      return { ...ESTADO_INICIAL, confirmada: a.produccion, vista: a.produccion.production };

    case 'gesto': {
      if (!e.confirmada || !e.vista) return e;
      if (e.confirmada.status !== 'active') return { ...e, rechazo: [problemaDe('production_archived')] };
      const r = aplicarOperaciones(e.vista, a.gesto.operaciones);
      if (!r.ok) return { ...e, rechazo: r.problems };
      if (r.applied === 0) return { ...e, rechazo: null };
      return {
        ...e,
        vista: r.production,
        pendientes: [...e.pendientes, a.gesto],
        porRehacer: sumarPorRehacer(e.porRehacer, r.pending),
        guardado: e.enVuelo ? 'guardando' : e.guardado === 'error' ? 'error' : 'pendiente',
        rechazo: null,
      };
    }

    case 'enviar': {
      if (!e.confirmada || e.enVuelo || !e.pendientes.length || e.confirmada.status !== 'active') return e;
      const { lote, resto } = siguienteLote(e.pendientes);
      return {
        ...e,
        enVuelo: { operationId: a.operationId, expectedRevision: e.confirmada.revision, gestos: lote },
        pendientes: resto,
        guardado: 'guardando',
        fallo: null,
      };
    }

    case 'confirmado': {
      if (!e.enVuelo) return e;
      const confirmada = a.lote.produccion;
      const r = reaplicar(confirmada.production, e.pendientes);
      return {
        ...e,
        confirmada,
        enVuelo: null,
        vista: r.vista,
        pendientes: r.quedan,
        descartados: [...e.descartados, ...r.descartados],
        conflicto: e.conflicto || r.descartados.length > 0,
        porRehacer: sumarPorRehacer(e.porRehacer, a.lote.pending),
        guardado: r.quedan.length ? 'pendiente' : 'guardado',
        fallo: null,
      };
    }

    case 'fallido': {
      if (!e.enVuelo || !e.confirmada) return { ...e, guardado: 'error', fallo: a.fallo };
      /*
       * Sin conexión, sin sesión o sin saber qué pasó: el lote se queda como está,
       * congelado, para repetirlo igual. Nada de lo tuyo se pierde.
       */
      if (a.fallo.tipo !== 'rechazada') return { ...e, guardado: 'error', fallo: a.fallo };
      /*
       * RECHAZADO POR LO QUE SE MANDÓ: se deshace. Si el servidor dice qué
       * operación fue (`parameters.index`), se aparta solo su gesto y los demás
       * vuelven a esperar; si no lo dice, se aparta el lote entero. Siempre con
       * su porqué.
       */
      const indice = a.fallo.problems.map((p) => p.parameters.index).find((i): i is number => typeof i === 'number');
      let visto = 0;
      const culpable = indice === undefined ? undefined
        : e.enVuelo.gestos.find((g) => { const dentro = indice >= visto && indice < visto + g.operaciones.length; visto += g.operaciones.length; return dentro; });
      const fuera = culpable ? [culpable] : e.enVuelo.gestos;
      const vuelven = e.enVuelo.gestos.filter((g) => !fuera.includes(g));
      const problems = a.fallo.problems.length ? a.fallo.problems : [problemaDe(a.fallo.code)];
      const sinLote = { ...e, enVuelo: null, pendientes: [...vuelven, ...e.pendientes] };
      const r = reconstruirVista(sinLote, e.confirmada);
      return {
        ...sinLote,
        vista: r.vista,
        pendientes: r.pendientes,
        descartados: [...e.descartados, ...fuera.map((gesto) => ({ gesto, problems })), ...r.descartados],
        guardado: r.pendientes.length ? 'pendiente' : 'guardado',
        fallo: a.fallo,
      };
    }

    case 'reintentar':
      return e.guardado === 'error' ? { ...e, guardado: e.enVuelo ? 'guardando' : e.pendientes.length ? 'pendiente' : 'guardado', fallo: null } : e;

    case 'reconstruir': {
      /*
       * EL CONFLICTO: alguien cambió la producción entre medias. Nada se pisa: la
       * versión de ahora es la base, y encima va todo lo tuyo que el servidor no
       * tenía —lo que viajaba y lo que esperaba—, gesto a gesto. Lo que ya no se
       * puede aplicar se aparta con su problema y se enseña.
       */
      const gestos = [...(e.enVuelo?.gestos ?? []), ...e.pendientes];
      const r = reaplicar(a.produccion.production, gestos);
      return {
        ...e,
        confirmada: a.produccion,
        enVuelo: null,
        vista: r.vista,
        pendientes: r.quedan,
        descartados: [...e.descartados, ...r.descartados],
        conflicto: true,
        porRehacer: sumarPorRehacer(e.porRehacer, r.porRehacer),
        guardado: r.quedan.length ? 'pendiente' : 'guardado',
        fallo: null,
      };
    }

    case 'estado': {
      if (!e.confirmada || a.resumen.productionId !== e.confirmada.productionId) return e;
      const { archivedAt: _antes, ...resto } = e.confirmada;
      void _antes;
      return {
        ...e,
        confirmada: {
          ...resto,
          status: a.resumen.status,
          updatedAt: a.resumen.updatedAt,
          ...(a.resumen.archivedAt !== undefined ? { archivedAt: a.resumen.archivedAt } : {}),
        },
        ...(e.guardado === 'error' && e.fallo?.tipo === 'archivada' && a.resumen.status === 'active'
          ? { guardado: e.enVuelo ? 'guardando' as const : 'pendiente' as const, fallo: null }
          : {}),
      };
    }

    case 'vistos':
      return { ...e, descartados: [], conflicto: false, rechazo: null };

    default:
      return e;
  }
};
