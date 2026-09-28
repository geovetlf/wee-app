import { FieldPath, Firestore } from 'firebase-admin/firestore';
import { InformeDeReservasSinTrabajo, PuertoDeLiquidacion, liquidacionDeWee, trabajoDelMedioDeWee } from '../runtime';
import { usageTransactionId } from '../credits/creditTransactions';
import { decidirEstadoDeLaToma } from './estadoDeToma';
import { MAX_TOMAS, huellaDeUnidad } from './toma';
import { PLAZO_DE_VIDEO_MS } from './video';

/**
 * WEË FILMMAKER ENGINE · FASE 4 — LA RESERVA DE UNA TOMA QUE SE QUEDÓ SIN TRABAJO.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 *
 * `generateVideo` reserva los Credits de una toma y DESPUÉS crea su trabajo del
 * Core. Si entre las dos cosas el proceso muere —o el Core lanza antes de crear
 * el trabajo—, la reserva se queda autorizada y sin trabajo. La liquidación del
 * barrido solo sabe de trabajos, así que no la ve nadie: la app la enseña «en
 * proceso» para siempre, ese plano no deja pedir otra toma y los Credits se
 * quedan retenidos. Hasta ahora solo se devolvía si alguien pedía OTRA VEZ esa
 * misma toma pasado el plazo, y la app no lo hace nunca.
 *
 * ── Lo que esto hace (decisión del usuario, 2026-09-28) ─────────────────────
 *
 * En cada pasada del barrido, busca las reservas AUTORIZADAS de tomas de
 * Filmmaker, y devuelve las que llevan sin trabajo más de lo que vive la llamada
 * que tenía que crearlo (`PLAZO_DE_VIDEO_MS`, el mismo número) más un margen para
 * relojes de máquinas distintas. Es la misma regla con la que `generateVideo` ya
 * las devolvía al repetirlas —nunca salieron hacia el proveedor, así que no hay
 * nada que pagar—, y la dice la Fase 2: el estado de esa toma es `failed` /
 * `abandoned` (`decidirEstadoDeLaToma`), no una regla escrita dos veces.
 *
 * ── Lo que NO hace, a propósito ─────────────────────────────────────────────
 *
 *   · No toca una reserva que TIENE trabajo, esté como esté: su dinero es de su
 *     liquidación. En particular, el POST que salió y no volvió (`reconciling`)
 *     SIGUE RETENIDO: el usuario decidió que eso lo revisa una persona.
 *   · No adivina: sin saber cuándo se reservó, o si no se puede leer si hay
 *     trabajo, no devuelve nada. Un error aquí es no hacer nada, nunca devolver.
 *   · No toca reservas que no sean de tomas: ni de Brain, ni del vídeo de siempre.
 *     Una reserva es de una toma si su `requestId` tiene la forma de una y lo que
 *     su meta dice —cuenta, producción, unidad y número— da ESA misma huella.
 *   · No mueve dinero por su cuenta: devuelve por el puerto de liquidación del
 *     runtime (`liquidacionDeWee().reembolsar`), el mismo que usa el barrido, que
 *     llama al `refundCredits` de siempre —idempotente: una reserva ya devuelta
 *     contesta «ya estaba»—.
 *
 * El runtime decide CUÁNDO corre (después de liquidar) y el programador solo lo
 * compone: ni uno ni otro saben qué es una toma.
 */

/** Relojes de máquinas distintas no coinciden al milisegundo: cinco minutos de más antes de dar una reserva por perdida. */
export const MARGEN_DE_ABANDONO_MS = 5 * 60_000;
/** Cuántas reservas se leen por página, y cuántas páginas como mucho en una pasada. Un tope, no una promesa: se dice si quedan. */
export const PAGINA_DE_RESERVAS = 200;
export const MAX_PAGINAS_DE_RESERVAS = 10;

/** Las reservas de tomas se llaman `usage_fm.<huella>.<toma>`: se leen solo esas, por su identificador. */
const PREFIJO = 'usage_fm.';
const FORMA_DE_REQUEST_DE_TOMA = /^fm\.([0-9a-f]{32})\.([1-9]\d?)$/;

export interface InformeDeTomasSinTrabajo extends InformeDeReservasSinTrabajo {
  /** Reservas autorizadas que son de verdad de una toma. */
  readonly candidatas: number;
  /** Tienen trabajo: su dinero es de su liquidación, y no se tocan. */
  readonly conTrabajo: number;
  /** Todavía dentro de la vida de la llamada (o sin fecha): no se tocan. */
  readonly aTiempo: number;
  readonly yaEstaban: number;
  /** Hubo más páginas que el tope: la siguiente pasada sigue. */
  readonly quedan: boolean;
}

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const numero = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const milisegundos = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (esObj(v) && typeof (v as { toMillis?: unknown }).toMillis === 'function') return (v as { toMillis: () => number }).toMillis();
  return undefined;
};

export interface ReservaDeToma {
  readonly userId: string;
  readonly requestId: string;
  readonly reservado: number;
  readonly autorizadaEn?: number;
}

/**
 * ¿ES LA RESERVA AUTORIZADA DE UNA TOMA, Y DE ESA TOMA? El identificador, la
 * forma del `requestId` y lo que su meta dice de ella —producción, unidad y
 * número, con la cuenta— tienen que cuadrar. Cualquier otra cosa: `null`, y no
 * se toca. Pura.
 */
export const reservaDeToma = (id: string, t: unknown): ReservaDeToma | null => {
  if (!esObj(t) || typeof t.requestId !== 'string' || typeof t.userId !== 'string' || !t.userId) return null;
  const m = FORMA_DE_REQUEST_DE_TOMA.exec(t.requestId);
  if (!m || id !== usageTransactionId(t.requestId) || t.type !== 'usage' || t.status !== 'AUTHORIZED') return null;
  const toma = Number(m[2]);
  if (toma > MAX_TOMAS) return null;
  const f = esObj(t.meta) && esObj(t.meta.filmmaker) ? t.meta.filmmaker : null;
  if (!f || typeof f.productionId !== 'string' || typeof f.unitId !== 'string' || f.take !== toma) return null;
  /* La cuenta de una toma es el uid (F1-D). Si algún día no lo fuera, esto no cuadra y no se toca nada. */
  if (huellaDeUnidad(t.userId, f.productionId, f.unitId) !== m[1]) return null;
  const reservado = Math.abs(numero(t.authorizedAmount) ?? numero(t.amount) ?? 0);
  if (!(reservado > 0)) return null;
  const autorizadaEn = milisegundos(t.createdAt);
  return { userId: t.userId, requestId: t.requestId, reservado, ...(autorizadaEn !== undefined ? { autorizadaEn } : {}) };
};

/**
 * UNA PASADA: busca las reservas de tomas autorizadas y devuelve las que se
 * quedaron sin trabajo. `at` es el ahora de quien pregunta.
 */
export const devolverTomasSinTrabajo = async (
  db: Firestore,
  deps: { at: number; vidaDeLaLlamadaMs: number; margenMs?: number; liquidacion?: Pick<PuertoDeLiquidacion, 'reembolsar'> },
): Promise<InformeDeTomasSinTrabajo> => {
  const margen = deps.margenMs ?? MARGEN_DE_ABANDONO_MS;
  const puerto = deps.liquidacion ?? liquidacionDeWee();
  let miradas = 0; let candidatas = 0; let conTrabajo = 0; let aTiempo = 0; let devueltas = 0; let yaEstaban = 0; let errores = 0;
  let quedan = false;
  let cursor = PREFIJO;
  for (let pagina = 0; pagina < MAX_PAGINAS_DE_RESERVAS; pagina++) {
    const snap = await db.collection('creditTransactions')
      .where('status', '==', 'AUTHORIZED')
      .orderBy(FieldPath.documentId())
      .startAfter(cursor)
      .limit(PAGINA_DE_RESERVAS)
      .get();
    let fin = snap.docs.length < PAGINA_DE_RESERVAS;
    for (const d of snap.docs) {
      /* Por identificador, en orden: pasado el tramo de las tomas, ya no hay ninguna más. */
      if (!d.id.startsWith(PREFIJO)) { fin = true; break; }
      miradas++;
      cursor = d.id;
      const r = reservaDeToma(d.id, d.data());
      if (!r) continue;
      candidatas++;
      let trabajo;
      try {
        trabajo = await trabajoDelMedioDeWee(db, r.userId, r.requestId);
      } catch {
        /* No se sabe si hay trabajo: no se devuelve nada. */
        errores++;
        continue;
      }
      if (trabajo) { conTrabajo++; continue; }
      const estado = decidirEstadoDeLaToma(
        { reserva: { estado: 'AUTHORIZED', reservado: r.reservado, ...(r.autorizadaEn !== undefined ? { autorizadaEn: r.autorizadaEn } : {}) }, trabajo: null },
        deps.at,
        deps.vidaDeLaLlamadaMs + margen,
      );
      if (estado?.motivo !== 'abandoned') { aTiempo++; continue; }
      /* No hay trabajo del que sacar un identificador: la devolución no lo usa. */
      const hecho = await puerto.reembolsar({
        userId: r.userId,
        reserva: { requestId: r.requestId, transactionId: usageTransactionId(r.requestId), importe: r.reservado },
        motivo: 'no_salio',
        jobId: '',
      });
      if (hecho.desenlace === 'reembolsada') devueltas++;
      else if (hecho.desenlace === 'ya_estaba') yaEstaban++;
      else errores++;
    }
    if (fin) break;
    if (pagina === MAX_PAGINAS_DE_RESERVAS - 1) quedan = true;
  }
  return Object.freeze({ miradas, candidatas, conTrabajo, aTiempo, devueltas, yaEstaban, errores, quedan });
};

/**
 * EL PASO, COMPUESTO: lo que el programador le da a la pasada del runtime. El
 * plazo es el de la llamada de vídeo —el mismo número—; el ahora, el de la máquina.
 */
export const tomasSinTrabajoDeWee = (deps: { db: Firestore; ahora?: () => number; anotar?: (informe: InformeDeTomasSinTrabajo) => void }) =>
  async (): Promise<InformeDeTomasSinTrabajo> => {
    const informe = await devolverTomasSinTrabajo(deps.db, { at: (deps.ahora ?? Date.now)(), vidaDeLaLlamadaMs: PLAZO_DE_VIDEO_MS });
    deps.anotar?.(informe);
    return informe;
  };
