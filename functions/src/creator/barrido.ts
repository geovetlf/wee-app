import { FieldValue, Firestore, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { creditEngine } from '../credits/creditEngine';
import { usageTransactionId } from '../credits/creditTransactions';
import { firestoreLedger } from '../engine/ledger';
import { sanitizeForLog } from '../engine/sanitize';
import { CreatorJob } from './types';
import { TEMPLATES } from './templates';
import { PLAZO_DE_EJECUCION_MS, cerrarAbandonado, finDelProcesoDe } from './cierre';

/**
 * ── EL BARRIDO DE LOS TRABAJOS LEGACY DE WEË AI (Línea B · X4/F-02) ────────
 *
 * El barrido desplegado (`barridoDeLiquidacion`, cada 5 min) solo miraba los
 * trabajos del Core. Los de `creatorJobs` —todo lo que hace `creatorRun`—
 * podían dejar Credits RETENIDOS para siempre por tres caminos:
 *
 *   A. `running` con el proceso muerto (plataforma, memoria, despliegue): solo
 *      se cerraba si la persona volvía a pulsar «Crear» sobre ese trabajo.
 *   B. `liquidacionPendiente`: la liquidación falló y quedó anotada, pero nadie
 *      la leía.
 *   C. una reserva AUTHORIZED vieja de un trabajo que nunca arrancó (el proceso
 *      murió entre reservar y pasar a `running`) o que terminó sin que su cobro
 *      se cerrara ni quedara anotado: la primera se devuelve, la segunda se
 *      cobra por lo que dice el trabajo (`creditsCharged`).
 *
 * Este barrido cierra los tres, con las mismas operaciones idempotentes del
 * Credit Engine (dos barridos a la vez no cobran ni devuelven dos veces) y con
 * la misma transición que usa `creatorRun` (`cerrarAbandonado`), así que un
 * barrido y un reintento de la persona tampoco pueden ganar los dos.
 *
 * Lo que NO hace: no decide precios, no llama a ningún proveedor y no toca
 * nada vivo. Un trabajo cuyo proceso puede seguir vivo no se toca.
 *
 * La política del dinero es la de `creatorRun`: un trabajo que no terminó se
 * devuelve entero. Si alguno de sus pasos ya había pagado a un proveedor, ese
 * coste queda en `aiGenerations` (lo pierde Weë, nunca la persona) y el informe
 * lo cuenta como `conCosteDeProveedor` para la conciliación.
 */
export interface InformeDelBarridoLegacy {
  abandonados: number;
  pendientes: number;
  sinArrancar: number;
  conCosteDeProveedor: number;
  errores: number;
}

const LIMITE_POR_PASADA = 50;
/** Una reserva sin trabajo en marcha solo se toca cuando ya ningún `creatorRun` vivo puede estar entre reservar y arrancar. */
export const EDAD_MINIMA_DE_RESERVA_MS = PLAZO_DE_EJECUCION_MS + 60_000;
/** Una liquidación pendiente se reintenta pasado un respiro, para no pisar a quien la acaba de anotar. */
const RESPIRO_DE_PENDIENTE_MS = 2 * 60_000;

/* Los conceptos son los del catálogo (`i18n/textos/<idioma>/servidor/movimientos.ts`): `weeAi` envuelto en `noSePudoTerminar`, como en creatorRun. */
const descripcionDe = (job: Partial<CreatorJob>): string =>
  `WEË AI · ${TEMPLATES[job.experienceId as keyof typeof TEMPLATES]?.name ?? 'Weë AI'} · no se pudo terminar`;

/** Devuelve lo retenido de un trabajo cerrado sin terminar y liquida su fila del libro a 0. */
const devolver = async (userId: string, jobId: string, motivo: string): Promise<'devuelta' | 'ya_cobrada'> => {
  try {
    await creditEngine.refundCredits({ userId, requestId: jobId, reason: motivo, source: 'weë-creator' });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    /* Sin reserva, nada que devolver; ya cobrada, no se toca sin una persona (y se informa). */
    if (code === 'TRANSACTION_NOT_FOUND') return 'devuelta';
    if (code === 'NOT_REFUNDABLE') return 'ya_cobrada';
    throw error;
  }
  await firestoreLedger.settle({ creditTransactionId: usageTransactionId(jobId), finalAmount: 0 })
    .catch((e) => console.error(`WEË AI · barrido: no se pudo liquidar la fila del libro de ${jobId}`, sanitizeForLog(e, 300)));
  return 'devuelta';
};

const tuvoCosteDeProveedor = (job: Partial<CreatorJob>): boolean =>
  Array.isArray(job.steps) && job.steps.some((s) => s && (s.status === 'done' || s.status === 'running') && !!s.generationId);

export const barrerTrabajosLegacy = async (deps: { db?: Firestore; ahora?: number; limite?: number } = {}): Promise<InformeDelBarridoLegacy> => {
  const db = deps.db ?? getFirestore();
  const ahora = deps.ahora ?? Date.now();
  const limite = deps.limite ?? LIMITE_POR_PASADA;
  const informe: InformeDelBarridoLegacy = { abandonados: 0, pendientes: 0, sinArrancar: 0, conCosteDeProveedor: 0, errores: 0 };
  const jobs = db.collection('creatorJobs');

  /* ── A. `running` cuyo proceso ya no puede estar vivo ──────────────────── */
  const corte = ahora - (finDelProcesoDe(0) as number);
  const enMarcha = await jobs.where('status', '==', 'running').where('deadlineAt', '<=', corte).orderBy('deadlineAt', 'asc').limit(limite).get();
  for (const doc of enMarcha.docs) {
    try {
      const cerrado = await cerrarAbandonado(doc.ref, ahora, {
        status: 'failed',
        progressText: 'Se quedó sin tiempo. Te devolví los Credits.',
        creditsCharged: 0,
        updatedAt: Timestamp.now(),
      });
      if (!cerrado || !cerrado.userId) continue;
      informe.abandonados++;
      if (tuvoCosteDeProveedor(cerrado)) informe.conCosteDeProveedor++;
      await devolver(cerrado.userId, doc.id, descripcionDe(cerrado));
    } catch (error) {
      informe.errores++;
      console.error(`WEË AI · barrido: no se pudo cerrar el trabajo abandonado ${doc.id}`, sanitizeForLog(error, 300));
    }
  }

  /* ── B. liquidaciones anotadas que nadie leía ──────────────────────────── */
  const pendientes = await jobs.where('liquidacionPendiente.at', '<=', Timestamp.fromMillis(ahora - RESPIRO_DE_PENDIENTE_MS)).limit(limite).get();
  for (const doc of pendientes.docs) {
    const job = doc.data() as Partial<CreatorJob> & { liquidacionPendiente?: { accion?: string; usado?: number; retenido?: number } };
    const p = job.liquidacionPendiente;
    if (!p || !job.userId) continue;
    try {
      if (p.accion === 'completar') {
        const usado = Math.max(0, Math.floor(Number(p.usado) || 0));
        const r = await creditEngine.completeCredits({ userId: job.userId, requestId: doc.id, finalAmount: usado });
        await firestoreLedger.settle({ creditTransactionId: usageTransactionId(doc.id), finalAmount: r.status === 'COMPLETED' ? usado : 0 })
          .catch((e) => console.error(`WEË AI · barrido: no se pudo liquidar la fila del libro de ${doc.id}`, sanitizeForLog(e, 300)));
      } else {
        await devolver(job.userId, doc.id, descripcionDe(job));
      }
      await doc.ref.update({ liquidacionPendiente: FieldValue.delete(), liquidacionResueltaAt: Timestamp.now() });
      informe.pendientes++;
    } catch (error) {
      informe.errores++;
      console.error(`WEË AI · barrido: la liquidación pendiente de ${doc.id} sigue sin cerrarse`, sanitizeForLog(error, 300));
    }
  }

  /* ── C. reservas AUTHORIZED de trabajos que nunca arrancaron ───────────── */
  const viejas = await db.collection('creditTransactions')
    .where('status', '==', 'AUTHORIZED')
    .where('createdAt', '<=', Timestamp.fromMillis(ahora - EDAD_MINIMA_DE_RESERVA_MS))
    .orderBy('createdAt', 'desc')
    .limit(limite)
    .get();
  for (const tx of viejas.docs) {
    const t = tx.data() as { userId?: string; requestId?: string; source?: string; type?: string };
    if (t.type !== 'usage' || t.source !== 'weë-creator' || !t.userId || !t.requestId) continue;
    try {
      const ref = jobs.doc(t.requestId);
      let experiencia: CreatorJob['experienceId'] | undefined;
      /* Solo un trabajo `planned` (o inexistente) es «nunca arrancó». Los `running` los cierra A; los cerrados, B. */
      const decision = await db.runTransaction(async (trx) => {
        const snap = await trx.get(ref);
        if (!snap.exists) return 'sin_trabajo' as const;
        const job = snap.data() as Partial<CreatorJob>;
        if (job.userId !== t.userId) return 'ajeno' as const;
        experiencia = job.experienceId;
        if (job.status === 'planned') {
          trx.update(ref, { status: 'failed', progressText: 'Se quedó sin tiempo. Te devolví los Credits.', creditsCharged: 0, runId: null, claimedAt: null, updatedAt: Timestamp.now() });
          return 'cerrado' as const;
        }
        if (job.status === 'failed') return 'fallido' as const;
        /* Terminado y entregado, pero su cobro nunca se cerró (y ni siquiera quedó anotado): se cobra lo que dice el trabajo. */
        if (job.status === 'done') return { cobrar: Math.max(0, Math.floor(Number(job.creditsCharged) || 0)) };
        return 'otro' as const;
      });
      if (decision === 'cerrado' || decision === 'sin_trabajo' || decision === 'fallido') {
        await devolver(t.userId, t.requestId, descripcionDe({ experienceId: experiencia }));
        informe.sinArrancar++;
      } else if (typeof decision === 'object') {
        const r = await creditEngine.completeCredits({ userId: t.userId, requestId: t.requestId, finalAmount: decision.cobrar });
        await firestoreLedger.settle({ creditTransactionId: usageTransactionId(t.requestId), finalAmount: r.status === 'COMPLETED' ? decision.cobrar : 0 })
          .catch((e) => console.error(`WEË AI · barrido: no se pudo liquidar la fila del libro de ${t.requestId}`, sanitizeForLog(e, 300)));
        informe.pendientes++;
      }
    } catch (error) {
      informe.errores++;
      console.error(`WEË AI · barrido: no se pudo cerrar la reserva ${tx.id}`, sanitizeForLog(error, 300));
    }
  }

  console.log(`WEË AI · barrido legacy · abandonados=${informe.abandonados} pendientes=${informe.pendientes} sin_arrancar=${informe.sinArrancar} con_coste_de_proveedor=${informe.conCosteDeProveedor} errores=${informe.errores}`);
  return informe;
};
