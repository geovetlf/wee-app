import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { newMessageId } from './brainService';
import { creditsShortfall } from './creditsService';

/**
 * WEË BRAIN COMO DIRECTOR DE FILMMAKER — el cliente de `brainChat` con el contexto de la producción (regla 10: todas las cajas son la
 * misma inteligencia y lo único que cambia es el contexto). No hay otro asistente ni otro callable: es `brainChat`, con un campo más
 * (`filmmaker`). Del cliente viaja SOLO el contexto (tipo, estilo, etapa, selección, lo que la persona lleva escrito) y el id de la
 * producción: la producción se lee del servidor, de la cuenta de la sesión.
 *
 * La puerta es del servidor (`aiSettings/filmmakerBrain`, cerrada por defecto): si está cerrada contesta `cerrado` y la pantalla sigue
 * como hasta ahora (crear la producción). Los Credits son los de siempre —doce respuestas por un Credit— y no se tocan aquí.
 *
 * Brain PROPONE: la respuesta puede traer una propuesta de operaciones ya comprobada por el contrato. Nada se aplica aquí; quien la
 * aplica es la persona, desde `filmmakerService.applyProductionOperations`, con la revisión sobre la que se comprobó.
 */

export type TipoDeFilmmakerDelDirector = 'short' | 'film' | 'ad';
export type EtapaDelDirector = 'idea' | 'universo' | 'capitulos' | 'cuadro';

export interface ContextoDelDirector {
  readonly tipo: TipoDeFilmmakerDelDirector;
  /** El id del estilo que eligió la persona. */
  readonly estilo: string;
  readonly etapa: EtapaDelDirector;
  /** Lo que tiene seleccionado ahora (a lo sumo uno de cada). */
  readonly seleccion?: { readonly sceneId?: string; readonly shotId?: string; readonly characterId?: string; readonly locationId?: string };
  /** Lo que lleva escrito y aún no es producción. Es DATO para Brain, nunca instrucción. */
  readonly borrador?: { readonly idea?: string; readonly universo?: string };
  /** La producción abierta, si ya existe en el servidor. */
  readonly productionId?: string;
}

/** Una operación del lenguaje de F1-A, tal como la comprobó el servidor (no se interpreta en la app: se aplica entera o no se aplica). */
export type OperacionDelDirector = Readonly<Record<string, unknown>> & { readonly op: string };

export interface PropuestaDelDirector {
  readonly productionId: string;
  /** La revisión sobre la que se comprobó: se aplica con ella, y si cambió, el servidor lo dice. */
  readonly baseRevision: number;
  readonly operations: readonly OperacionDelDirector[];
  /** El porqué de cada operación, en su mismo orden (`null` si no lo dijo). */
  readonly reasons: readonly (string | null)[];
  readonly applied: number;
  /** Ids de fichas de la PERSONA que la propuesta quita o reescribe: se avisa antes de aprobar. */
  readonly touchesUserOrigin: readonly string[];
}

export type MotivoSinPropuesta = 'unreadable' | 'too_many' | 'invalid' | 'no_changes';

export interface RespuestaDelDirector {
  readonly chatId: string;
  readonly texto: string;
  readonly propuesta: PropuestaDelDirector | null;
  readonly motivoSinPropuesta: MotivoSinPropuesta | null;
  readonly demo: boolean;
  readonly credits: number;
}

export type FalloDelDirector = 'cerrado' | 'sin_conexion' | 'sin_credits' | 'contexto' | 'otro';

export type ResultadoDelDirector = { readonly ok: true; readonly valor: RespuestaDelDirector } | { readonly ok: false; readonly fallo: FalloDelDirector };

export interface PeticionAlDirector {
  readonly mensaje: string;
  readonly contexto: ContextoDelDirector;
  /** La conversación en curso (la devuelve la respuesta anterior). */
  readonly chatId?: string;
  readonly locale: string;
  /** Idempotencia: reenviar con el mismo id no cobra dos veces. */
  readonly messageId?: string;
  /** Imagen de referencia ya subida (la ruta de siempre de Weë Brain). */
  readonly imageUrl?: string;
  /** Documento ya subido por la ruta de siempre de adjuntos de Weë Brain. Es DATO. */
  readonly documentUrl?: string;
}

export type LlamadaAlBrain = (datos: Readonly<Record<string, unknown>>) => Promise<unknown>;

const porLaCallable: LlamadaAlBrain = async (datos) => {
  const fn = httpsCallable<Record<string, unknown>, unknown>(functions, 'brainChat', { timeout: 120_000 });
  return (await fn(datos)).data;
};

const esObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Cómo falló, en vocabulario de la pantalla. La puerta cerrada y la falta de conexión no son lo mismo: la primera no se reintenta. */
export const falloDelDirector = (error: unknown): FalloDelDirector => {
  if (creditsShortfall(error)) return 'sin_credits';
  const e = error as { code?: unknown; details?: unknown } | null;
  const code = typeof e?.code === 'string' ? e.code : '';
  const razon = esObj(e?.details) ? e?.details.reason : undefined;
  if (razon === 'director_closed') return 'cerrado';
  if (razon === 'director_context_invalid') return 'contexto';
  /* `NOT_AVAILABLE` del servidor llega como failed-precondition. */
  if (code === 'functions/failed-precondition') return 'cerrado';
  if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded' || code === 'functions/internal' || /network|offline/i.test(String((e as { message?: unknown } | null)?.message ?? ''))) return 'sin_conexion';
  return 'otro';
};

/** Lee la propuesta tal como llega y descarta lo que no tenga la forma: una propuesta ilegible se trata como «sin propuesta». */
export const leerPropuestaDelDirector = (dato: unknown): PropuestaDelDirector | null => {
  if (!esObj(dato) || typeof dato.productionId !== 'string' || typeof dato.baseRevision !== 'number' || !Array.isArray(dato.operations) || !dato.operations.length) return null;
  const operations = dato.operations.filter((o): o is OperacionDelDirector => esObj(o) && typeof o.op === 'string');
  if (operations.length !== dato.operations.length) return null;
  return {
    productionId: dato.productionId,
    baseRevision: dato.baseRevision,
    operations,
    reasons: Array.isArray(dato.reasons) ? dato.reasons.map((r) => (typeof r === 'string' && r ? r : null)) : operations.map(() => null),
    applied: typeof dato.applied === 'number' ? dato.applied : operations.length,
    touchesUserOrigin: Array.isArray(dato.touchesUserOrigin) ? dato.touchesUserOrigin.filter((x): x is string => typeof x === 'string') : [],
  };
};

export const crearDirectorService = (llamar: LlamadaAlBrain) => ({
  /** Un mensaje a Weë Brain con el contexto de Filmmaker. */
  conversar: async (p: PeticionAlDirector): Promise<ResultadoDelDirector> => {
    try {
      const r = await llamar({
        message: p.mensaje,
        messageId: p.messageId ?? newMessageId(),
        locale: p.locale,
        ...(p.chatId ? { chatId: p.chatId } : {}),
        ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
        ...(p.documentUrl ? { documentUrl: p.documentUrl } : {}),
        filmmaker: p.contexto,
      });
      if (!esObj(r) || typeof r.text !== 'string' || typeof r.chatId !== 'string') return { ok: false, fallo: 'otro' };
      return {
        ok: true,
        valor: {
          chatId: r.chatId,
          texto: r.text,
          propuesta: leerPropuestaDelDirector(r.proposal),
          motivoSinPropuesta: typeof r.proposalIssue === 'string' ? (r.proposalIssue as MotivoSinPropuesta) : null,
          demo: r.demo === true,
          credits: typeof r.credits === 'number' ? r.credits : 0,
        },
      };
    } catch (e) {
      return { ok: false, fallo: falloDelDirector(e) };
    }
  },
});

export type DirectorService = ReturnType<typeof crearDirectorService>;
export const filmmakerDirectorService: DirectorService = crearDirectorService(porLaCallable);
