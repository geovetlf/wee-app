import { InformeDelBarrendero } from './barrendero';

/**
 * WEË RUNTIME — UNA PASADA DEL BARRENDERO, Y QUIÉN LA PIDE.
 *
 * El barrendero ya existe (`barrendero.ts`) y sabe qué hacer. Lo que faltaba es
 * alguien que se lo pida cada cierto tiempo. Esto es la costura entre las dos
 * cosas, y está aparte por un motivo: **el runtime no puede depender del
 * mecanismo que lo programa**. Hoy lo natural en Weë es Cloud Scheduler sobre
 * una Function; mañana puede ser otra cosa, y ninguna de las dos debería
 * aparecer en la lógica.
 *
 * Así que aquí hay una función y nada más:
 *
 *     pasarElBarrendero()  →  InformeDeBarrido
 *
 * Determinista, sin reloj propio salvo el que se le da, sin estado entre
 * llamadas y sin saber quién la llama. Un adaptador de infraestructura la
 * envuelve; las pruebas la llaman a secas.
 *
 * ── Lo que NO decide ────────────────────────────────────────────────────────
 *
 * Ni reembolsos, ni cobros, ni recuperación, ni propiedad, ni desenlaces de
 * proveedor. Nada de eso está aquí y nada de eso puede estar aquí: esto dispara
 * una pasada, y quien decide es `liquidacion.ts`, que es puro, y quien mueve el
 * dinero es el Credit Engine, que es idempotente.
 *
 * ── Dos a la vez ────────────────────────────────────────────────────────────
 *
 * No hay cerrojo, y no hace falta inventarlo: dos pasadas simultáneas acaban
 * llamando a las mismas operaciones del Credit Engine, que ya son idempotentes
 * por `requestId`. Tampoco hay memoria de proceso haciendo de candado —sería un
 * candado que solo funciona si hay una instancia, que es justo lo que no se
 * puede suponer—. La protección viene de lo durable: la transacción, la
 * propiedad del trabajo y la concesión.
 *
 * NADIE LO LLAMA TODAVÍA. No está programado, no se exporta como Function y no
 * se ha desplegado.
 */

/**
 * CADA CUÁNTO.
 *
 * No sale de la intuición, sale de los contratos. Una reserva solo se puede
 * cerrar cuando el trabajo ya tiene un desenlace, y el trabajo tarda como mucho
 * lo que dure su plazo: la operación más larga que Weë admite hoy es el vídeo,
 * con veinte minutos (`engine/registry.ts`, `timeoutsMs.video`). De ahí sale lo
 * que de verdad importa, que no es la corrección —de eso se encarga la
 * idempotencia— sino CUÁNTO TARDA en cerrarse una reserva que ya se puede
 * cerrar.
 *
 * Con cinco minutos, una operación que termina queda liquidada en cinco minutos
 * como mucho, y una que se cuelga entera se cierra dentro de los veinticinco.
 * Correr más a menudo no arregla nada que esté mal; correr mucho menos deja
 * Credits retenidos a la vista de la persona.
 *
 * Es CONFIGURACIÓN, no una constante escondida: quien componga el adaptador
 * decide, y este número es solo el punto de partida razonado.
 */
export const CADA_CUANTO_POR_DEFECTO_MIN = 5;

/** Lo que una pasada deja dicho. Metadatos: ni contenido, ni prompts, ni secretos. */
export interface InformeDeBarrido {
  sweepId: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  examined: number;
  /** Quedaron cobrados. NO dice que los cobrara esta pasada: eso el Credit Engine no lo cuenta. */
  settled: number;
  refunded: number;
  /** Seguían vivos, aceptados por el proveedor o a la espera de que el motor de trabajos los mueva. */
  skipped: number;
  /** Salieron y no hay a quién preguntarles. No se tocan. */
  unknown: number;
  errors: number;
  /** Quedaron páginas sin mirar: la siguiente pasada sigue por ahí. */
  pending: boolean;
}

export interface BarridoDeps {
  /** La pasada de verdad. La compone quien tiene el almacén y el Credit Engine. */
  barrer: () => Promise<InformeDelBarrendero>;
  ahora: () => number;
  /** Un nombre para esta pasada, para poder seguirla en los registros. */
  identificador: () => string;
  /** Adónde va el informe. Sin esto no se pierde nada: se devuelve igual. */
  anotar?: (informe: InformeDeBarrido) => void;
}

/**
 * UNA PASADA. Nunca lanza: una pasada que revienta no puede llevarse por delante
 * a la siguiente, y lo que no se pudo cerrar sigue guardado esperando a que
 * alguien vuelva. Por eso un fallo se cuenta y se devuelve, no se propaga.
 */
export const pasarElBarrendero = async (deps: BarridoDeps): Promise<InformeDeBarrido> => {
  const sweepId = deps.identificador();
  const startedAt = deps.ahora();
  let informe: InformeDelBarrendero | undefined;
  let reventó = false;
  try {
    informe = await deps.barrer();
  } catch {
    reventó = true;
  }
  const finishedAt = deps.ahora();
  const salida: InformeDeBarrido = {
    sweepId,
    startedAt,
    finishedAt,
    durationMs: Math.max(0, finishedAt - startedAt),
    examined: informe?.mirados ?? 0,
    settled: informe?.liquidados ?? 0,
    refunded: informe?.reembolsados ?? 0,
    skipped: informe?.esperando ?? 0,
    unknown: informe?.aReconciliar ?? 0,
    errors: (informe?.fallos ?? 0) + (reventó ? 1 : 0),
    pending: reventó || informe?.cursor !== undefined,
  };
  deps.anotar?.(salida);
  return salida;
};
