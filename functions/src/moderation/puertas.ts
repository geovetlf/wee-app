import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type { OperacionDeModeracion } from '../core/moderation-action';
import { aHttpsError } from './index';
import { crearConsolaDeModeracion } from './consola';
import { crearNucleoDeModeracion } from './nucleo';

/**
 * WEE MODERATION CORE — LAS PUERTAS. NINGUNA ESTÁ DESPLEGADA.
 *
 * Una callable por acción —no hay una puerta genérica de escritura—, una de
 * solo lectura para la Consola, la de la persona afectada (apelar y ver lo
 * suyo), el disparador que da caso a cada reporte nuevo y el barrido. Todas
 * delgadas: la autorización, la validación y la transacción son del núcleo
 * (`nucleo.ts`), y lo que viaja al cliente es un código, nunca una frase
 * (`aHttpsError`, el mismo de Denunciar).
 *
 * Todas están en `ops/despliegue/grupos.json` → `no_se_despliegan`, con su
 * porqué: el Moderation Core se integra con la App y con la Consola en su
 * propia fase (docs/MODERATION-CORE.md § Integración).
 */

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 60, memory: '256MiB' as const };

const nucleo = () => crearNucleoDeModeracion({ db: getFirestore() });

/** Una operación de administración, con su callable propia. */
const operacion = (op: OperacionDeModeracion) => onCall(OPTS, async (request) => {
  try {
    return await nucleo().ejecutar(op, request.auth, request.data);
  } catch (error) {
    throw aHttpsError(error);
  }
});

/* ── Casos ──────────────────────────────────────────────────────────────── */
export const moderationOpenCase = operacion('OPEN_CASE');
export const moderationTakeCase = operacion('TAKE_CASE');
export const moderationReleaseCase = operacion('RELEASE_CASE');
export const moderationRequireAction = operacion('REQUIRE_ACTION');
export const moderationRejectCase = operacion('REJECT_CASE');
export const moderationResolveCase = operacion('RESOLVE_CASE');

/* ── Contenido ──────────────────────────────────────────────────────────── */
export const moderationHideContent = operacion('HIDE_CONTENT');
export const moderationRestoreContent = operacion('RESTORE_CONTENT');
export const moderationRemoveContent = operacion('REMOVE_CONTENT');

/* ── Cuenta ─────────────────────────────────────────────────────────────── */
export const moderationWarnAccount = operacion('WARN_ACCOUNT');
export const moderationSuspendAccount = operacion('SUSPEND_ACCOUNT');
export const moderationBlockAccount = operacion('BLOCK_ACCOUNT');
export const moderationLiftSanction = operacion('LIFT_SANCTION');

/* ── Apelaciones, del lado de moderación ────────────────────────────────── */
export const moderationTakeAppeal = operacion('TAKE_APPEAL');
export const moderationDecideAppeal = operacion('DECIDE_APPEAL');

/* ── La Consola: solo lectura, separada de cualquier permiso de escritura ─ */
export const moderationConsole = onCall(OPTS, async (request) => {
  try {
    const n = nucleo();
    return await crearConsolaDeModeracion(n, { db: getFirestore() }).leer(request.auth, request.data);
  } catch (error) {
    throw aHttpsError(error);
  }
});

/* ── La persona afectada ────────────────────────────────────────────────── */
export const submitModerationAppeal = onCall(OPTS, async (request) => {
  try {
    return await nucleo().apelar(request.auth, request.data);
  } catch (error) {
    throw aHttpsError(error);
  }
});

export const getMyModeration = onCall(OPTS, async (request) => {
  try {
    return await nucleo().miModeracion(request.auth);
  } catch (error) {
    throw aHttpsError(error);
  }
});

/* ── Lo que corre solo ──────────────────────────────────────────────────── */

/** Cada reporte nuevo entra en su caso. Idempotente: un reintento no lo adjunta dos veces. */
export const moderationIntake = onDocumentCreated({ document: 'reports/{reportId}', region: 'us-central1' }, async (event) => {
  const reportId = event.params.reportId;
  const r = await nucleo().adjuntarReporte(reportId);
  if (r.estado === 'ignorado') console.warn('MODERATION: reporte sin caso', r.motivo);
});

/** Vencimientos, reportes sin caso y desenlaces a medias. Cada paso, idempotente y acotado. */
export const moderationSweep = onSchedule({ schedule: 'every 15 minutes', region: 'us-central1', timeoutSeconds: 300, memory: '256MiB' }, async () => {
  const informe = await nucleo().barrer();
  console.log('MODERATION: barrido', JSON.stringify(informe));
});
