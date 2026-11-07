import { randomBytes } from 'crypto';
import type { DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore';
import { EntradaDeHistorial, FORMA_DE_ID_DE_REPORTE, Huella, Report, idDeEntrada } from '../core/moderation';
import {
  CasoDeModeracion, EntradaDeCaso, ESTADOS_ABIERTOS, ESTADOS_REABRIBLES, EstadoDeCaso, MarcaDeDenunciante,
  MODERATION_CORE_CONTRACT_VERSION, ObjetivoDelCaso, SujetoDelCaso, anotarEnElCaso, casoAbiertoAMano, casoSinEfectos,
  claveDeObjetivo, decidirIntake, idDeCaso, idDeEntradaDeCaso, leerPoliticaDePrioridad, moverCaso, pidePrioridad, PoliticaDePrioridad,
} from '../core/moderation-case';
import {
  AVISO_DE_OPERACION, AccionDeModeracion, AvisoDeModeracion, CustodiaDeContenido, ENTREGA_DE_AVISOS, ESTADOS_PARA_ACTUAR,
  EntradaDeAuditoriaDeModeracion, OPERACIONES, OperacionDeModeracion, OperacionDelSistema, PeticionDeOperacion,
  PoliticaDeAbuso, PoliticaDeApelaciones, PoliticaDeOcultacionPreventiva, PoliticaDeRetirada, RANGO_DE_VENCIMIENTO_DESDE,
  SancionDeModeracion, SituacionDeCuenta, TIPO_DE_SANCION_DE, TipoDeAviso, accionesPrevias, claveDeVencimiento,
  conflictoDeInteres, decidirCustodia, entradaDeAuditoria, idDeAccion, idDeApelacion, idDeAviso, idDeCustodia, idDeSancion,
  leerPoliticaDeAbuso, leerPoliticaDeApelaciones, leerPoliticaDeOcultacion, leerPoliticaDeRetirada, levantarSancion,
  nuevaSancion, ocultacionPreventivaAplica, restriccionDeCuenta, sancionEnVigor, situacionVacia, validarPeticionDeOperacion,
  vencerSancion, vistaDeAccionParaElAfectado, vistaDeAvisoParaElAfectado, vistaDeSancionParaElAfectado,
} from '../core/moderation-action';
import {
  ApelacionDeModeracion, EntradaDeApelacion, decidirApelacion, idDeEntradaDeApelacion, nuevaApelacion, tomarApelacion,
  validarPeticionDeApelacion, vistaDeApelacionParaElAfectado,
} from '../core/moderation-appeal';
import { esCuentaAutenticada } from '../identity/sesion';
import { HISTORIAL, REPORTES, RechazoDeModeracion, huellaDelSistema } from './index';
import { ActorDeModeracion, DepsDeLaPuerta, PuertaDeModeracion, crearPuertaDeModeracion } from './autorizacion';
import { localizarContenido } from './resolutores';

/**
 * WEE MODERATION CORE — LA COMPOSICIÓN.
 *
 * El contrato (`core/moderation-case.ts`, `-action.ts`, `-appeal.ts`) decide;
 * esto guarda. Cada operación es UNA transacción que lee lo que necesita, le
 * pregunta al contrato y escribe todo o nada: el caso y su historial, el
 * contenido custodiado, la sanción, la situación de la cuenta, la acción, el
 * aviso y su entrada de auditoría. Si algo de eso no puede escribirse, no se
 * escribe nada.
 *
 *   moderationCases/{caseId}                 el caso (uno por contenido)
 *     /signals/{reportId}                    la procedencia de cada reporte
 *     /reporters/{accountId}                 lo que cada cuenta dijo de él
 *     /history/{0001…}                       solo se añade
 *   moderationActions/{actionId}             lo que se hizo; se crea y no se toca
 *   moderationAudit/{auto}                   quién hizo o intentó qué; se crea y no se toca
 *   moderationVault/{vaultId}                el contenido mientras no está en su sitio
 *   moderationSanctions/{sanctionId}         advertencias, suspensiones y bloqueos
 *   moderationStanding/{accountId}           reincidencia, abuso de reportes y restricción
 *   moderationAppeals/{appealId}/history     apelaciones; su historial solo se añade
 *   moderationNotices/{noticeId}             avisos escritos y SIN ENVIAR
 *   moderationPolicies/{id}                  políticas; sin documento, las de por defecto
 *
 * Ninguna tiene regla en `firestore.rules`: en Firestore, lo que no se permite
 * está prohibido, así que ningún cliente las lee ni las escribe. Lo prueba
 * `moderation-core.emulator.mjs` contra las reglas del árbol.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No llama a ningún modelo ni a ninguna API. No toca Credits. No envía avisos:
 * los deja escritos. No borra contenido: lo custodia. No decide sola: lo único
 * automático es ordenar la cola, reabrir y —si el dueño la activa— ocultar de
 * forma preventiva, que está apagado y sin umbrales.
 */

export const CASOS = 'moderationCases';
export const SENALES = 'signals';
export const DENUNCIANTES = 'reporters';
export const HISTORIAL_DEL_CASO = 'history';
export const ACCIONES = 'moderationActions';
export const AUDITORIA = 'moderationAudit';
export const CUSTODIA = 'moderationVault';
export const SANCIONES = 'moderationSanctions';
export const SITUACION = 'moderationStanding';
export const APELACIONES = 'moderationAppeals';
export const HISTORIAL_DE_APELACION = 'history';
export const AVISOS = 'moderationNotices';
export const POLITICAS = 'moderationPolicies';

export const COLECCIONES_DEL_NUCLEO = Object.freeze([CASOS, ACCIONES, AUDITORIA, CUSTODIA, SANCIONES, SITUACION, APELACIONES, AVISOS, POLITICAS]);

/** Una copia JSON de lo que escribe el núcleo: sin `undefined`, que Firestore no acepta, y sin referencias compartidas. */
const plano = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const SISTEMA_DE_INTAKE = Object.freeze({ kind: 'SYSTEM' as const, id: 'wee.moderation.intake' });
const SISTEMA_DE_BARRIDO = Object.freeze({ kind: 'SYSTEM' as const, id: 'wee.moderation.sweep' });
const POLITICA_PREVENTIVA = 'policy.preventiveHiding';

export interface Politicas {
  prioridad: PoliticaDePrioridad;
  ocultacion: PoliticaDeOcultacionPreventiva;
  retirada: PoliticaDeRetirada;
  apelaciones: PoliticaDeApelaciones;
  abuso: PoliticaDeAbuso;
}

export interface NucleoDeps {
  db: Firestore;
  now?: () => number;
  huella?: Huella;
  /** La puerta entera. Si no se da, se compone la de `autorizacion.ts`, con estos dos puertos si se dan. */
  puerta?: PuertaDeModeracion;
  sesionVigente?: DepsDeLaPuerta['sesionVigente'];
  permisosDe?: DepsDeLaPuerta['permisosDe'];
  correlacion?: () => string;
}

export interface ResultadoDeOperacion {
  actionId: string;
  operation: OperacionDeModeracion;
  duplicate: boolean;
  caseId?: string;
  caseStatus?: EstadoDeCaso;
  vaultState?: string;
  sanctionId?: string;
  sanctionStatus?: string;
  appealId?: string;
  appealStatus?: string;
  alreadyOpen?: boolean;
}

const nuevaCorrelacion = (): string => `mod_${randomBytes(12).toString('hex')}`;

export const crearNucleoDeModeracion = (deps: NucleoDeps) => {
  const { db } = deps;
  const now = deps.now ?? (() => Date.now());
  const huella = deps.huella ?? huellaDelSistema;
  const correlacion = deps.correlacion ?? nuevaCorrelacion;

  /* ── Referencias ─────────────────────────────────────────────────────── */
  const casoRef = (id: string) => db.collection(CASOS).doc(id);
  const historialDelCaso = (id: string, seq: number) => casoRef(id).collection(HISTORIAL_DEL_CASO).doc(idDeEntradaDeCaso(seq));
  const senalRef = (caseId: string, reportId: string) => casoRef(caseId).collection(SENALES).doc(reportId);
  const denuncianteRef = (caseId: string, accountId: string) => casoRef(caseId).collection(DENUNCIANTES).doc(accountId);
  const accionRef = (id: string) => db.collection(ACCIONES).doc(id);
  const custodiaRef = (id: string) => db.collection(CUSTODIA).doc(id);
  const sancionRef = (id: string) => db.collection(SANCIONES).doc(id);
  const situacionRef = (id: string) => db.collection(SITUACION).doc(id);
  const apelacionRef = (id: string) => db.collection(APELACIONES).doc(id);
  const avisoRef = (id: string) => db.collection(AVISOS).doc(id);
  const reporteRef = (id: string) => db.collection(REPORTES).doc(id);

  /* ── Auditoría ───────────────────────────────────────────────────────── */
  const auditarEn = (tx: Transaction, e: Omit<EntradaDeAuditoriaDeModeracion, 'contract'>): void => {
    tx.create(db.collection(AUDITORIA).doc(), plano(entradaDeAuditoria(e)));
  };
  /** Fuera de una transacción: lo denegado y lo fallido. Si no se puede escribir, se dice en el registro y se sigue. */
  const auditarFuera = async (e: Omit<EntradaDeAuditoriaDeModeracion, 'contract'>): Promise<void> => {
    try {
      await db.collection(AUDITORIA).doc().create(plano(entradaDeAuditoria(e)));
    } catch {
      console.error('MODERATION: no se pudo escribir una entrada de auditoría', e.correlationId);
    }
  };

  const puerta = deps.puerta ?? crearPuertaDeModeracion({
    ...(deps.sesionVigente ? { sesionVigente: deps.sesionVigente } : {}),
    ...(deps.permisosDe ? { permisosDe: deps.permisosDe } : {}),
    anotarDenegacion: (d) => auditarFuera({
      at: now(), actor: { kind: 'ADMIN', id: d.uid }, operation: d.operation, permission: d.permission, result: 'DENIED', code: d.code, correlationId: d.correlationId,
    }),
  });

  /* ── Políticas ───────────────────────────────────────────────────────── */
  const leerPoliticas = async (): Promise<Politicas> => {
    const [prioridad, ocultacion, retirada, apelaciones, abuso] = await Promise.all(
      ['priority', 'preventiveHiding', 'removal', 'appeals', 'abuse'].map((id) => db.collection(POLITICAS).doc(id).get()),
    );
    return {
      prioridad: leerPoliticaDePrioridad(prioridad.exists ? prioridad.data() : undefined),
      ocultacion: leerPoliticaDeOcultacion(ocultacion.exists ? ocultacion.data() : undefined),
      retirada: leerPoliticaDeRetirada(retirada.exists ? retirada.data() : undefined),
      apelaciones: leerPoliticaDeApelaciones(apelaciones.exists ? apelaciones.data() : undefined),
      abuso: leerPoliticaDeAbuso(abuso.exists ? abuso.data() : undefined),
    };
  };

  /* ── Escrituras compartidas ──────────────────────────────────────────── */
  const guardarCaso = (tx: Transaction, caso: CasoDeModeracion, entradas: readonly EntradaDeCaso[], nuevo: boolean): void => {
    if (nuevo) tx.create(casoRef(caso.caseId), plano(caso));
    else tx.set(casoRef(caso.caseId), plano(caso));
    /* `create`, nunca `set`: una entrada del historial no se pisa. */
    for (const e of entradas) tx.create(historialDelCaso(caso.caseId, e.seq), plano(e));
  };

  const crearAvisoEn = (tx: Transaction, a: { recipientAccountId?: string; kind: TipoDeAviso; origenId: string; actionId?: string; appealId?: string; sanctionId?: string; params?: AvisoDeModeracion['params']; at: number }): void => {
    if (!a.recipientAccountId) return;
    const noticeId = idDeAviso(huella, a.origenId, a.kind);
    if (!noticeId) return;
    const aviso: AvisoDeModeracion = {
      contract: MODERATION_CORE_CONTRACT_VERSION,
      noticeId,
      recipientAccountId: a.recipientAccountId,
      kind: a.kind,
      ...(a.actionId ? { actionId: a.actionId } : {}),
      ...(a.appealId ? { appealId: a.appealId } : {}),
      ...(a.sanctionId ? { sanctionId: a.sanctionId } : {}),
      params: a.params ?? {},
      delivery: ENTREGA_DE_AVISOS,
      createdAt: a.at,
    };
    tx.set(avisoRef(noticeId), plano(aviso));
  };

  const situacionDe = (snap: { exists: boolean; data: () => unknown } | null, accountId: string, at: number): SituacionDeCuenta =>
    snap && snap.exists ? (snap.data() as SituacionDeCuenta) : situacionVacia(accountId, at);

  /** Las sanciones vigentes de una cuenta, leídas dentro de la transacción (son pocas: las que su situación dice activas). */
  const sancionesActivasEn = async (tx: Transaction, situacion: SituacionDeCuenta): Promise<SancionDeModeracion[]> => {
    const ids = [...new Set(situacion.activeSanctionIds ?? [])].slice(0, 50);
    const snaps = await Promise.all(ids.map((id) => tx.get(sancionRef(id))));
    return snaps.filter((s) => s.exists).map((s) => s.data() as SancionDeModeracion);
  };

  /** La situación con su restricción recalculada a partir de un conjunto de sanciones. */
  const conRestriccion = (s: SituacionDeCuenta, sanciones: readonly SancionDeModeracion[], at: number): SituacionDeCuenta => {
    const enVigor = sanciones.filter((x) => sancionEnVigor(x, at));
    return { ...s, activeSanctionIds: enVigor.map((x) => x.sanctionId).sort(), restriction: restriccionDeCuenta(enVigor, at), updatedAt: at };
  };

  /* ═══ INTAKE: una señal entra en su caso ══════════════════════════════════ */

  /**
   * ADJUNTAR UN REPORTE A SU CASO. Lo llama el disparador al crearse el reporte
   * (`moderationIntake`), el barrido para los que quedaron sin caso y la
   * apertura a mano de un reporte anterior al Core. Idempotente: un reporte que
   * ya tiene caso no se adjunta dos veces.
   */
  const adjuntarReporte = async (
    reportId: string,
    extra?: (tx: Transaction, caso: CasoDeModeracion) => void,
  ): Promise<{ estado: 'adjuntado' | 'ya_adjuntado' | 'ignorado'; caseId?: string; motivo?: string; abierto?: boolean; reabierto?: boolean }> => {
    if (typeof reportId !== 'string' || !FORMA_DE_ID_DE_REPORTE.test(reportId)) return { estado: 'ignorado', motivo: 'invalid_report' };
    const snap = await reporteRef(reportId).get();
    if (!snap.exists) return { estado: 'ignorado', motivo: 'report_not_found' };
    const r = snap.data() as Report;
    if (r.caseId) return { estado: 'ya_adjuntado', caseId: r.caseId };
    const loc = await localizarContenido(db, r.targetType, r.targetId);
    if (!loc) return { estado: 'ignorado', motivo: 'target_type_not_enabled' };

    /* El dueño, del contenido de hoy; si ya no está, del que se leyó al denunciar. */
    const sujeto: SujetoDelCaso = {
      ...(loc.sujeto.accountId ?? r.targetOwnerAccountId ? { accountId: loc.sujeto.accountId ?? r.targetOwnerAccountId } : {}),
      ...(loc.sujeto.entityId ?? r.targetOwnerEntityId ? { entityId: loc.sujeto.entityId ?? r.targetOwnerEntityId } : {}),
      ...(loc.sujeto.entityType ? { entityType: loc.sujeto.entityType } : {}),
      ...(loc.sujeto.profileUid ? { profileUid: loc.sujeto.profileUid } : {}),
    };
    const objetivo: ObjetivoDelCaso = { ...loc.objetivo, ...(loc.objetivo.modality ?? r.targetModality ? { modality: loc.objetivo.modality ?? r.targetModality } : {}) };
    const caseId = idDeCaso(huella, claveDeObjetivo(r.targetType, r.targetId));
    if (!caseId) return { estado: 'ignorado', motivo: 'invalid_target' };
    const politicas = await leerPoliticas();

    const resultado = await db.runTransaction(async (tx) => {
      const [repSnap, casoSnap, marcaSnap, reporterSnap, sujetoSnap] = await Promise.all([
        tx.get(reporteRef(reportId)),
        tx.get(casoRef(caseId)),
        tx.get(denuncianteRef(caseId, r.reporterAccountId)),
        tx.get(situacionRef(r.reporterAccountId)),
        sujeto.accountId && sujeto.accountId !== r.reporterAccountId ? tx.get(situacionRef(sujeto.accountId)) : Promise.resolve(null),
      ]);
      const reporte = repSnap.data() as Report | undefined;
      if (!reporte) return { tipo: 'ignorado' as const, motivo: 'report_not_found' };
      if (reporte.caseId) return { tipo: 'ya' as const, caseId: reporte.caseId };
      const at = now();
      const d = decidirIntake({
        caseId,
        caso: casoSnap.exists ? (casoSnap.data() as CasoDeModeracion) : undefined,
        reporte,
        objetivo,
        sujeto,
        marca: marcaSnap.exists ? (marcaSnap.data() as MarcaDeDenunciante) : undefined,
        accionesPrevias: accionesPrevias(sujetoSnap?.exists ? (sujetoSnap.data() as SituacionDeCuenta) : undefined),
        politica: politicas.prioridad,
        at,
      });
      if (!d.ok) return d.code === 'already_attached' ? { tipo: 'ya' as const, caseId } : { tipo: 'ignorado' as const, motivo: d.code };

      guardarCaso(tx, d.caso, d.entradas, d.abierto);
      tx.create(senalRef(caseId, reportId), plano(d.senal));
      tx.set(denuncianteRef(caseId, r.reporterAccountId), plano(d.marca));

      /* El reporte sabe en qué caso está, con qué prioridad, y lo apunta en SU historial (que solo se añade). */
      const seq = reporte.historyCount + 1;
      tx.update(reporteRef(reportId), { caseId, priority: d.senal.gravity, historyCount: seq, updatedAt: at });
      const entrada: EntradaDeHistorial = { seq, type: 'REPORT_ATTACHED_TO_CASE', at, by: { kind: 'SYSTEM', id: SISTEMA_DE_INTAKE.id } };
      tx.create(reporteRef(reportId).collection(HISTORIAL).doc(idDeEntrada(seq)), plano(entrada));

      /* Quien denuncia: un reporte más en su cuenta. Es de donde sale, con el tiempo, la señal de abuso. */
      const reporter = situacionDe(reporterSnap, r.reporterAccountId, at);
      tx.set(situacionRef(r.reporterAccountId), plano({
        ...reporter, reporter: { ...reporter.reporter, reportsFiled: reporter.reporter.reportsFiled + 1, lastReportAt: at }, updatedAt: at,
      }));
      /* Quien fue denunciado: un caso nuevo contra su cuenta, si es nuevo. Lo propio no se denuncia, así que no coinciden. */
      if (d.abierto && sujeto.accountId && sujetoSnap) {
        const s = situacionDe(sujetoSnap, sujeto.accountId, at);
        tx.set(situacionRef(sujeto.accountId), plano({ ...s, subject: { ...s.subject, casesOpened: s.subject.casesOpened + 1 }, updatedAt: at }));
      }
      extra?.(tx, d.caso);
      return { tipo: 'adjuntado' as const, caso: d.caso, abierto: d.abierto, reabierto: d.reabierto };
    });

    if (resultado.tipo === 'ignorado') return { estado: 'ignorado', motivo: resultado.motivo };
    if (resultado.tipo === 'ya') return { estado: 'ya_adjuntado', caseId: resultado.caseId };
    if (ocultacionPreventivaAplica(politicas.ocultacion, resultado.caso)) {
      try { await ocultarPorPolitica(caseId, politicas); } catch (e) { console.error('MODERATION: la ocultación preventiva falló', caseId, e instanceof RechazoDeModeracion ? e.code : 'interno'); }
    }
    return { estado: 'adjuntado', caseId, abierto: resultado.abierto, reabierto: resultado.reabierto };
  };

  /**
   * LA OCULTACIÓN PREVENTIVA. Solo si el dueño activó la política con sus dos
   * umbrales (hoy no). Oculta como lo haría una persona —a la custodia, entero,
   * reversible— pero no decide el caso: lo sube a prioritaria y lo deja para
   * que alguien lo mire.
   */
  const ocultarPorPolitica = async (caseId: string, politicas: Politicas): Promise<void> => {
    await db.runTransaction(async (tx) => {
      const casoSnap = await tx.get(casoRef(caseId));
      if (!casoSnap.exists) return;
      const caso = casoSnap.data() as CasoDeModeracion;
      if (!ocultacionPreventivaAplica(politicas.ocultacion, caso) || !caso.target.path) return;
      const vaultId = idDeCustodia(huella, caso.targetKey) as string;
      const actionId = idDeAccion(huella, { kind: 'SYSTEM', id: POLITICA_PREVENTIVA }, 'PREVENTIVE_HIDE', `${caseId}:${caso.historyCount}`) as string;
      const [vaultSnap, fuenteSnap, accionSnap] = await Promise.all([tx.get(custodiaRef(vaultId)), tx.get(db.doc(caso.target.path)), tx.get(accionRef(actionId))]);
      if (accionSnap.exists) return;
      const actual = vaultSnap.exists ? (vaultSnap.data() as CustodiaDeContenido) : undefined;
      const d = decidirCustodia(actual, 'HIDE_CONTENT', { custodiable: true, fuenteExiste: fuenteSnap.exists, retiradaReversible: politicas.retirada.reversible });
      if (!d.ok) return;
      const at = now();
      const custodia: CustodiaDeContenido = {
        contract: MODERATION_CORE_CONTRACT_VERSION, vaultId, caseId, targetKey: caso.targetKey,
        target: { type: caso.target.type, id: caso.target.id, kind: caso.target.kind }, path: caso.target.path,
        state: 'HIDDEN', preventive: true, lastActionId: actionId, hiddenAt: at, createdAt: actual?.createdAt ?? at, updatedAt: at,
      };
      tx.set(custodiaRef(vaultId), { ...plano(custodia), data: fuenteSnap.data() });
      tx.delete(db.doc(caso.target.path));
      const por = { kind: 'POLICY' as const, id: `${POLITICA_PREVENTIVA}@${politicas.ocultacion.version}` };
      const efectos = { ...caso.effects, content: 'HIDDEN' as const, preventive: true };
      const m = caso.status === 'PENDING'
        ? moverCaso(caso, { hacia: 'PRIORITY_REVIEW', quien: 'SYSTEM', por, at, tipo: 'PREVENTIVE_HIDE', operacion: 'PREVENTIVE_HIDE', actionId, cambios: { effects: efectos } })
        : { ok: true as const, ...anotarEnElCaso({ ...caso, effects: efectos }, { type: 'PREVENTIVE_HIDE', at, by: por, operation: 'PREVENTIVE_HIDE', actionId }) };
      if (!m.ok) return;
      guardarCaso(tx, m.caso, [m.entrada], false);
      const accion: AccionDeModeracion = {
        contract: MODERATION_CORE_CONTRACT_VERSION, actionId, operation: 'PREVENTIVE_HIDE', family: 'SYSTEM', caseId, vaultId,
        targetKey: caso.targetKey, contentKind: caso.target.kind, ...(caso.subject.accountId ? { subjectAccountId: caso.subject.accountId } : {}),
        actor: { kind: 'SYSTEM', id: POLITICA_PREVENTIVA, policyVersion: politicas.ocultacion.version },
        justification: 'Ocultación preventiva por la política configurada; no es una decisión del caso.',
        at, result: { caseFrom: caso.status, caseTo: m.caso.status, vaultState: 'HIDDEN' }, appealable: true,
      };
      tx.create(accionRef(actionId), plano(accion));
      auditarEn(tx, { at, actor: { kind: 'SYSTEM', id: POLITICA_PREVENTIVA }, operation: 'PREVENTIVE_HIDE', result: 'OK', caseId, actionId, targetKey: caso.targetKey, correlationId: correlacion() });
      crearAvisoEn(tx, { recipientAccountId: caso.subject.accountId, kind: 'CONTENT_HIDDEN', origenId: actionId, actionId, params: { contentKind: caso.target.kind }, at });
    });
  };

  /* ═══ OPERACIONES DE ADMINISTRACIÓN ════════════════════════════════════════ */

  type Duplicado = { tipo: 'duplicado'; accion: AccionDeModeracion };
  type Hecho = { tipo: 'hecho'; resultado: Omit<ResultadoDeOperacion, 'actionId' | 'operation' | 'duplicate'> };

  /** La acción ya existe: solo vale si es la MISMA petición. Un `requestId` reutilizado para otra cosa se rechaza. */
  const comprobarDuplicado = (accion: AccionDeModeracion, p: PeticionDeOperacion): Duplicado => {
    if ((p.caseId && accion.caseId !== p.caseId) || (p.appealId && accion.appealId !== p.appealId) || (p.sanctionId && accion.sanctionId !== p.sanctionId)) {
      throw new RechazoDeModeracion('request_id_reused');
    }
    return { tipo: 'duplicado', accion };
  };

  /** El caso, con la comprobación de conflicto de interés de quien actúa. */
  const casoParaActuar = async (tx: Transaction, caseId: string, actor: ActorDeModeracion): Promise<CasoDeModeracion> => {
    const [snap, marca] = await Promise.all([tx.get(casoRef(caseId)), tx.get(denuncianteRef(caseId, actor.uid))]);
    if (!snap.exists) throw new RechazoDeModeracion('case_not_found');
    const caso = snap.data() as CasoDeModeracion;
    if (conflictoDeInteres(actor.uid, caso, marca.exists)) throw new RechazoDeModeracion('conflict_of_interest');
    return caso;
  };

  const registrarAccion = (tx: Transaction, a: {
    actionId: string; operacion: OperacionDeModeracion; actor: ActorDeModeracion; p: PeticionDeOperacion; at: number; correlationId: string;
    caso?: CasoDeModeracion; casoDespues?: CasoDeModeracion; extra?: Partial<AccionDeModeracion>; appealable?: boolean;
  }): void => {
    const def = OPERACIONES[a.operacion];
    const { result: resultadoExtra, ...resto } = a.extra ?? {};
    const accion: AccionDeModeracion = {
      contract: MODERATION_CORE_CONTRACT_VERSION,
      actionId: a.actionId,
      operation: a.operacion,
      family: def.familia,
      ...(a.caso ? { caseId: a.caso.caseId, targetKey: a.caso.targetKey, contentKind: a.caso.target.kind } : {}),
      ...(a.caso?.subject.accountId ? { subjectAccountId: a.caso.subject.accountId } : {}),
      actor: { kind: 'ADMIN', id: a.actor.uid, rol: a.actor.rol },
      permission: def.permiso,
      justification: a.p.justification,
      requestId: a.p.requestId,
      at: a.at,
      appealable: a.appealable ?? false,
      ...resto,
      result: { ...(a.caso ? { caseFrom: a.caso.status } : {}), ...(a.casoDespues ? { caseTo: a.casoDespues.status } : {}), ...(resultadoExtra ?? {}) },
    };
    tx.create(accionRef(a.actionId), plano(accion));
    auditarEn(tx, {
      at: a.at, actor: { kind: 'ADMIN', id: a.actor.uid, rol: a.actor.rol }, operation: a.operacion, permission: def.permiso, result: 'OK',
      ...(accion.caseId ? { caseId: accion.caseId } : {}), actionId: a.actionId, ...(accion.appealId ? { appealId: accion.appealId } : {}),
      ...(accion.sanctionId ? { sanctionId: accion.sanctionId } : {}), ...(accion.targetKey ? { targetKey: accion.targetKey } : {}),
      requestId: a.p.requestId, correlationId: a.correlationId, justification: a.p.justification,
    });
  };

  const exigirEstado = (caso: CasoDeModeracion, estados: readonly EstadoDeCaso[]): void => {
    if (!estados.includes(caso.status)) throw new RechazoDeModeracion('invalid_transition');
  };

  const mover = (caso: CasoDeModeracion, m: Parameters<typeof moverCaso>[1]) => {
    const r = moverCaso(caso, m);
    if (!r.ok) throw new RechazoDeModeracion(r.code);
    return r;
  };

  /** La primera decisión con efecto fija el desenlace del caso para sus denunciantes. */
  const decisionConEfecto = (caso: CasoDeModeracion, at: number): Partial<CasoDeModeracion> =>
    caso.status === 'ACTION_TAKEN' ? {} : { decision: 'UPHELD', decidedAt: at, reporterOutcomes: 'PENDING', counters: { ...caso.counters, sinceDecision: 0 } };

  /* ── Triaje ──────────────────────────────────────────────────────────── */

  const tomar = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string): Promise<Duplicado | Hecho> => db.runTransaction(async (tx) => {
    const previa = await tx.get(accionRef(actionId));
    if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
    const caso = await casoParaActuar(tx, p.caseId as string, actor);
    const at = now();
    const m = mover(caso, { hacia: 'UNDER_REVIEW', quien: 'ADMIN', por: { kind: 'ADMIN', id: actor.uid }, at, operacion: p.operacion, actionId, justificacion: p.justification, cambios: { assignee: { uid: actor.uid, at } } });
    guardarCaso(tx, m.caso, [m.entrada], false);
    registrarAccion(tx, { actionId, operacion: p.operacion, actor, p, at, correlationId, caso, casoDespues: m.caso });
    return { tipo: 'hecho' as const, resultado: { caseId: caso.caseId, caseStatus: m.caso.status } };
  });

  const soltar = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string, politicas: Politicas): Promise<Duplicado | Hecho> => db.runTransaction(async (tx) => {
    const previa = await tx.get(accionRef(actionId));
    if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
    const caso = await casoParaActuar(tx, p.caseId as string, actor);
    exigirEstado(caso, ['UNDER_REVIEW']);
    const at = now();
    /* A qué cola vuelve lo decide la política, no quien lo suelta: la prioridad no se elige a mano. */
    const hacia: EstadoDeCaso = pidePrioridad(caso.priority.gravity, caso.counters.reporters, politicas.prioridad) || caso.effects.preventive ? 'PRIORITY_REVIEW' : 'PENDING';
    const m = mover(caso, { hacia, quien: 'ADMIN', por: { kind: 'ADMIN', id: actor.uid }, at, operacion: p.operacion, actionId, justificacion: p.justification, quitar: ['assignee'] });
    guardarCaso(tx, m.caso, [m.entrada], false);
    registrarAccion(tx, { actionId, operacion: p.operacion, actor, p, at, correlationId, caso, casoDespues: m.caso });
    return { tipo: 'hecho' as const, resultado: { caseId: caso.caseId, caseStatus: m.caso.status } };
  });

  const exigirAccion = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string): Promise<Duplicado | Hecho> => db.runTransaction(async (tx) => {
    const previa = await tx.get(accionRef(actionId));
    if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
    const caso = await casoParaActuar(tx, p.caseId as string, actor);
    const at = now();
    const m = mover(caso, { hacia: 'ACTION_REQUIRED', quien: 'ADMIN', por: { kind: 'ADMIN', id: actor.uid }, at, operacion: p.operacion, actionId, justificacion: p.justification, cambios: { proposedAction: p.proposedAction } });
    guardarCaso(tx, m.caso, [m.entrada], false);
    registrarAccion(tx, { actionId, operacion: p.operacion, actor, p, at, correlationId, caso, casoDespues: m.caso });
    return { tipo: 'hecho' as const, resultado: { caseId: caso.caseId, caseStatus: m.caso.status } };
  });

  const rechazar = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string): Promise<Duplicado | Hecho> => db.runTransaction(async (tx) => {
    const previa = await tx.get(accionRef(actionId));
    if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
    const caso = await casoParaActuar(tx, p.caseId as string, actor);
    /* Rechazar es decir «no hay infracción»: con el contenido escondido de forma preventiva, primero se devuelve. */
    if (caso.effects.content !== null) throw new RechazoDeModeracion('content_hidden_restore_first');
    const at = now();
    const m = mover(caso, {
      hacia: 'REJECTED', quien: 'ADMIN', por: { kind: 'ADMIN', id: actor.uid }, at, operacion: p.operacion, actionId, justificacion: p.justification,
      cambios: { decision: 'REJECTED', decidedAt: at, reporterOutcomes: 'PENDING', counters: { ...caso.counters, sinceDecision: 0 } }, quitar: ['assignee', 'proposedAction'],
    });
    guardarCaso(tx, m.caso, [m.entrada], false);
    registrarAccion(tx, { actionId, operacion: p.operacion, actor, p, at, correlationId, caso, casoDespues: m.caso });
    return { tipo: 'hecho' as const, resultado: { caseId: caso.caseId, caseStatus: m.caso.status } };
  });

  const resolver = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string): Promise<Duplicado | Hecho> => db.runTransaction(async (tx) => {
    const previa = await tx.get(accionRef(actionId));
    if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
    const caso = await casoParaActuar(tx, p.caseId as string, actor);
    const at = now();
    const m = mover(caso, { hacia: 'CLOSED', quien: 'ADMIN', por: { kind: 'ADMIN', id: actor.uid }, at, operacion: p.operacion, actionId, justificacion: p.justification, quitar: ['assignee', 'proposedAction'] });
    guardarCaso(tx, m.caso, [m.entrada], false);
    registrarAccion(tx, { actionId, operacion: p.operacion, actor, p, at, correlationId, caso, casoDespues: m.caso });
    return { tipo: 'hecho' as const, resultado: { caseId: caso.caseId, caseStatus: m.caso.status } };
  });

  /**
   * ABRIR A MANO: un contenido que nadie denunció, o un reporte anterior al
   * Core que todavía no tiene caso. Un caso que ya está abierto no se duplica;
   * uno cerrado, rechazado o restaurado se REABRE y lo dice su historial.
   */
  const abrir = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string, politicas: Politicas): Promise<Duplicado | Hecho> => {
    if (p.fromReportId) {
      const previa = await accionRef(actionId).get();
      if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
      const rep = await reporteRef(p.fromReportId).get();
      if (!rep.exists) throw new RechazoDeModeracion('report_not_found');
      const r = rep.data() as Report;
      if (r.caseId) return { tipo: 'hecho', resultado: { caseId: r.caseId, alreadyOpen: true } };
      if (r.reporterAccountId === actor.uid) throw new RechazoDeModeracion('conflict_of_interest');
      const at = now();
      const hecho = await adjuntarReporte(p.fromReportId, (tx, caso) => {
        if (caso.subject.accountId === actor.uid) throw new RechazoDeModeracion('conflict_of_interest');
        registrarAccion(tx, { actionId, operacion: p.operacion, actor, p, at, correlationId, casoDespues: caso, extra: { caseId: caso.caseId, targetKey: caso.targetKey, contentKind: caso.target.kind } });
      });
      if (hecho.estado === 'ignorado') throw new RechazoDeModeracion(hecho.motivo === 'report_not_found' ? 'report_not_found' : 'target_not_found');
      const caso = (await casoRef(hecho.caseId as string).get()).data() as CasoDeModeracion;
      return { tipo: 'hecho', resultado: { caseId: hecho.caseId, caseStatus: caso?.status, alreadyOpen: hecho.estado === 'ya_adjuntado' } };
    }
    const loc = await localizarContenido(db, p.targetType as Report['targetType'], p.targetId as string);
    if (!loc || !loc.visible) throw new RechazoDeModeracion('target_not_found');
    const caseId = idDeCaso(huella, claveDeObjetivo(p.targetType as Report['targetType'], p.targetId as string));
    if (!caseId) throw new RechazoDeModeracion('invalid_target_id');
    if (loc.sujeto.accountId === actor.uid) throw new RechazoDeModeracion('conflict_of_interest');
    return db.runTransaction(async (tx) => {
      const [previa, casoSnap, sujetoSnap] = await Promise.all([
        tx.get(accionRef(actionId)), tx.get(casoRef(caseId)), loc.sujeto.accountId ? tx.get(situacionRef(loc.sujeto.accountId)) : Promise.resolve(null),
      ]);
      if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
      const at = now();
      if (casoSnap.exists) {
        const caso = casoSnap.data() as CasoDeModeracion;
        if (!ESTADOS_REABRIBLES.includes(caso.status)) return { tipo: 'hecho' as const, resultado: { caseId, caseStatus: caso.status, alreadyOpen: true } };
        const hacia: EstadoDeCaso = pidePrioridad(caso.priority.gravity, caso.counters.reporters, politicas.prioridad) ? 'PRIORITY_REVIEW' : 'PENDING';
        const m = mover(caso, {
          hacia, quien: 'ADMIN', por: { kind: 'ADMIN', id: actor.uid }, at, tipo: 'CASE_REOPENED', operacion: p.operacion, actionId, justificacion: p.justification,
          quitar: ['assignee', 'proposedAction'],
        });
        guardarCaso(tx, m.caso, [m.entrada], false);
        registrarAccion(tx, { actionId, operacion: p.operacion, actor, p, at, correlationId, caso, casoDespues: m.caso });
        return { tipo: 'hecho' as const, resultado: { caseId, caseStatus: m.caso.status } };
      }
      const nuevo = casoAbiertoAMano({
        caseId, objetivo: loc.objetivo, sujeto: loc.sujeto, adminUid: actor.uid, gravedad: p.gravity,
        accionesPrevias: accionesPrevias(sujetoSnap?.exists ? (sujetoSnap.data() as SituacionDeCuenta) : undefined), politica: politicas.prioridad, at, justificacion: p.justification,
      });
      if (!nuevo) throw new RechazoDeModeracion('invalid_target');
      guardarCaso(tx, nuevo.caso, [nuevo.entrada], true);
      if (loc.sujeto.accountId && sujetoSnap) {
        const s = situacionDe(sujetoSnap, loc.sujeto.accountId, at);
        tx.set(situacionRef(loc.sujeto.accountId), plano({ ...s, subject: { ...s.subject, casesOpened: s.subject.casesOpened + 1 }, updatedAt: at }));
      }
      registrarAccion(tx, { actionId, operacion: p.operacion, actor, p, at, correlationId, casoDespues: nuevo.caso, extra: { caseId, targetKey: nuevo.caso.targetKey, contentKind: nuevo.caso.target.kind, ...(nuevo.caso.subject.accountId ? { subjectAccountId: nuevo.caso.subject.accountId } : {}) } });
      return { tipo: 'hecho' as const, resultado: { caseId, caseStatus: nuevo.caso.status } };
    });
  };

  /* ── Contenido: ocultar, retirar, restaurar ──────────────────────────── */

  const sobreElContenido = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string, politicas: Politicas): Promise<Duplicado | Hecho> => db.runTransaction(async (tx) => {
    const operacion = p.operacion as 'HIDE_CONTENT' | 'REMOVE_CONTENT' | 'RESTORE_CONTENT';
    const previa = await tx.get(accionRef(actionId));
    if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
    const caso = await casoParaActuar(tx, p.caseId as string, actor);
    const path = caso.target.path;
    if (!path) throw new RechazoDeModeracion('content_not_custodiable');
    if (operacion !== 'RESTORE_CONTENT') exigirEstado(caso, ESTADOS_PARA_ACTUAR);
    const vaultId = idDeCustodia(huella, caso.targetKey) as string;
    const fuente: DocumentReference = db.doc(path);
    const [vaultSnap, fuenteSnap, sujetoSnap] = await Promise.all([
      tx.get(custodiaRef(vaultId)), tx.get(fuente), caso.subject.accountId ? tx.get(situacionRef(caso.subject.accountId)) : Promise.resolve(null),
    ]);
    const actual = vaultSnap.exists ? (vaultSnap.data() as CustodiaDeContenido) : undefined;
    const d = decidirCustodia(actual, operacion, { custodiable: true, fuenteExiste: fuenteSnap.exists, retiradaReversible: politicas.retirada.reversible });
    if (!d.ok) throw new RechazoDeModeracion(d.code);
    const at = now();

    /* El contenido se mueve ENTERO: sale de su sitio a la custodia, o vuelve tal cual estaba. */
    const base: CustodiaDeContenido = {
      contract: MODERATION_CORE_CONTRACT_VERSION, vaultId, caseId: caso.caseId, targetKey: caso.targetKey,
      target: { type: caso.target.type, id: caso.target.id, kind: caso.target.kind }, path,
      state: d.estado, preventive: false, lastActionId: actionId,
      ...(actual?.hiddenAt ? { hiddenAt: actual.hiddenAt } : {}), ...(actual?.removedAt ? { removedAt: actual.removedAt } : {}),
      ...(d.estado === 'HIDDEN' ? { hiddenAt: at } : {}), ...(d.estado === 'REMOVED' ? { removedAt: at } : {}), ...(d.estado === 'RESTORED' ? { restoredAt: at } : {}),
      createdAt: actual?.createdAt ?? at, updatedAt: at,
    };
    if (d.mover === 'SACAR_A_CUSTODIA') {
      tx.set(custodiaRef(vaultId), { ...plano(base), data: fuenteSnap.data() });
      tx.delete(fuente);
    } else if (d.mover === 'DEVOLVER_A_SU_SITIO') {
      if (!actual?.data) throw new RechazoDeModeracion('content_not_hidden');
      tx.create(fuente, actual.data);
      /* Devuelto: la copia ya no hace falta. Queda el rastro, no el contenido. */
      tx.set(custodiaRef(vaultId), plano(base));
    } else {
      tx.set(custodiaRef(vaultId), { ...plano(base), data: actual?.data ?? null });
    }

    const efectos = { ...caso.effects, content: operacion === 'RESTORE_CONTENT' ? null : d.estado as 'HIDDEN' | 'REMOVED', preventive: false };
    let casoDespues: CasoDeModeracion;
    let entrada: EntradaDeCaso;
    if (operacion === 'RESTORE_CONTENT') {
      const sinEfectos = casoSinEfectos({ effects: efectos });
      if (sinEfectos && (caso.status === 'ACTION_TAKEN' || caso.status === 'CLOSED')) {
        ({ caso: casoDespues, entrada } = mover(caso, { hacia: 'RESTORED', quien: 'ADMIN', por: { kind: 'ADMIN', id: actor.uid }, at, tipo: 'ACTION_APPLIED', operacion, actionId, justificacion: p.justification, cambios: { effects: efectos } }));
      } else {
        ({ caso: casoDespues, entrada } = anotarEnElCaso({ ...caso, effects: efectos }, { type: 'ACTION_APPLIED', at, by: { kind: 'ADMIN', id: actor.uid }, operation: operacion, actionId, reason: p.justification }));
      }
    } else {
      ({ caso: casoDespues, entrada } = mover(caso, {
        hacia: 'ACTION_TAKEN', quien: 'ADMIN', por: { kind: 'ADMIN', id: actor.uid }, at, tipo: 'ACTION_APPLIED', operacion, actionId, justificacion: p.justification,
        cambios: { effects: efectos, ...decisionConEfecto(caso, at) }, quitar: ['proposedAction'],
      }));
      if (caso.subject.accountId && sujetoSnap) {
        const s = situacionDe(sujetoSnap, caso.subject.accountId, at);
        tx.set(situacionRef(caso.subject.accountId), plano({ ...s, subject: { ...s.subject, actions: { ...s.subject.actions, [operacion]: (s.subject.actions[operacion] ?? 0) + 1 }, lastActionAt: at }, updatedAt: at }));
      }
    }
    guardarCaso(tx, casoDespues, [entrada], false);
    registrarAccion(tx, {
      actionId, operacion, actor, p, at, correlationId, caso, casoDespues,
      extra: { vaultId, result: { vaultState: d.estado }, ...(operacion === 'RESTORE_CONTENT' && actual?.lastActionId ? { reverses: actual.lastActionId } : {}) },
      appealable: operacion !== 'RESTORE_CONTENT',
    });
    crearAvisoEn(tx, { recipientAccountId: caso.subject.accountId, kind: AVISO_DE_OPERACION[operacion] as TipoDeAviso, origenId: actionId, actionId, params: { contentKind: caso.target.kind }, at });
    return { tipo: 'hecho' as const, resultado: { caseId: caso.caseId, caseStatus: casoDespues.status, vaultState: d.estado } };
  });

  /* ── Cuenta: advertir, suspender, bloquear, levantar ─────────────────── */

  const sobreLaCuenta = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string): Promise<Duplicado | Hecho> => db.runTransaction(async (tx) => {
    const operacion = p.operacion as 'WARN_ACCOUNT' | 'SUSPEND_ACCOUNT' | 'BLOCK_ACCOUNT';
    const previa = await tx.get(accionRef(actionId));
    if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
    const caso = await casoParaActuar(tx, p.caseId as string, actor);
    exigirEstado(caso, ESTADOS_PARA_ACTUAR);
    const cuenta = caso.subject.accountId;
    if (!cuenta) throw new RechazoDeModeracion('subject_unknown');
    const sanctionId = idDeSancion(huella, actionId) as string;
    const sujetoSnap = await tx.get(situacionRef(cuenta));
    const at = now();
    const situacion = situacionDe(sujetoSnap, cuenta, at);
    const vigentes = await sancionesActivasEn(tx, situacion);
    const sancion = nuevaSancion({
      sanctionId, accountId: cuenta, type: TIPO_DE_SANCION_DE[operacion] as SancionDeModeracion['type'], caseId: caso.caseId, actionId,
      issuedBy: actor.uid, justification: p.justification, at, ...(operacion === 'SUSPEND_ACCOUNT' ? { durationHours: p.durationHours } : {}),
    });
    if (!sancion) throw new RechazoDeModeracion('invalid_duration');
    tx.create(sancionRef(sanctionId), plano(sancion));
    const conLaNueva = conRestriccion(situacion, [...vigentes, sancion], at);
    tx.set(situacionRef(cuenta), plano({
      ...conLaNueva,
      /* Una advertencia no restringe, pero cuenta como vigente hasta que se levante: también se apela y se retira. */
      activeSanctionIds: [...new Set([...conLaNueva.activeSanctionIds, ...(sancion.type === 'WARNING' ? [sanctionId] : [])])].sort(),
      subject: { ...situacion.subject, actions: { ...situacion.subject.actions, [operacion]: (situacion.subject.actions[operacion] ?? 0) + 1 }, lastActionAt: at },
    }));
    const efectos = { ...caso.effects, sanctionIds: [...new Set([...caso.effects.sanctionIds, sanctionId])] };
    const m = mover(caso, {
      hacia: 'ACTION_TAKEN', quien: 'ADMIN', por: { kind: 'ADMIN', id: actor.uid }, at, tipo: 'ACTION_APPLIED', operacion, actionId, sanctionId, justificacion: p.justification,
      cambios: { effects: efectos, ...decisionConEfecto(caso, at) }, quitar: ['proposedAction'],
    });
    guardarCaso(tx, m.caso, [m.entrada], false);
    registrarAccion(tx, { actionId, operacion, actor, p, at, correlationId, caso, casoDespues: m.caso, extra: { sanctionId, result: { sanctionStatus: 'ACTIVE' } }, appealable: true });
    crearAvisoEn(tx, { recipientAccountId: cuenta, kind: AVISO_DE_OPERACION[operacion] as TipoDeAviso, origenId: actionId, actionId, sanctionId, params: { until: sancion.endsAt }, at });
    return { tipo: 'hecho' as const, resultado: { caseId: caso.caseId, caseStatus: m.caso.status, sanctionId, sanctionStatus: 'ACTIVE' } };
  });

  const levantar = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string): Promise<Duplicado | Hecho> => db.runTransaction(async (tx) => {
    const previa = await tx.get(accionRef(actionId));
    if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
    const caso = await casoParaActuar(tx, p.caseId as string, actor);
    const snap = await tx.get(sancionRef(p.sanctionId as string));
    if (!snap.exists) throw new RechazoDeModeracion('sanction_not_found');
    const sancion = snap.data() as SancionDeModeracion;
    const sujetoSnap = await tx.get(situacionRef(sancion.accountId));
    const at = now();
    const situacion = situacionDe(sujetoSnap, sancion.accountId, at);
    const vigentes = await sancionesActivasEn(tx, situacion);
    const l = levantarSancion(sancion, { caseId: caso.caseId, actionId, by: actor.uid, justification: p.justification, at });
    if (!l.ok) throw new RechazoDeModeracion(l.code);
    tx.set(sancionRef(sancion.sanctionId), plano(l.sancion));
    const restantes = vigentes.filter((s) => s.sanctionId !== sancion.sanctionId);
    const despues = conRestriccion(situacion, restantes, at);
    tx.set(situacionRef(sancion.accountId), plano({ ...despues, activeSanctionIds: [...new Set([...despues.activeSanctionIds, ...restantes.filter((s) => s.type === 'WARNING' && s.status === 'ACTIVE').map((s) => s.sanctionId)])].sort() }));
    const efectos = { ...caso.effects, sanctionIds: caso.effects.sanctionIds.filter((id) => id !== sancion.sanctionId) };
    let casoDespues: CasoDeModeracion;
    let entrada: EntradaDeCaso;
    if (casoSinEfectos({ effects: efectos }) && (caso.status === 'ACTION_TAKEN' || caso.status === 'CLOSED')) {
      ({ caso: casoDespues, entrada } = mover(caso, { hacia: 'RESTORED', quien: 'ADMIN', por: { kind: 'ADMIN', id: actor.uid }, at, tipo: 'ACTION_APPLIED', operacion: p.operacion, actionId, sanctionId: sancion.sanctionId, justificacion: p.justification, cambios: { effects: efectos } }));
    } else {
      ({ caso: casoDespues, entrada } = anotarEnElCaso({ ...caso, effects: efectos }, { type: 'ACTION_APPLIED', at, by: { kind: 'ADMIN', id: actor.uid }, operation: p.operacion, actionId, sanctionId: sancion.sanctionId, reason: p.justification }));
    }
    guardarCaso(tx, casoDespues, [entrada], false);
    registrarAccion(tx, { actionId, operacion: p.operacion, actor, p, at, correlationId, caso, casoDespues, extra: { sanctionId: sancion.sanctionId, reverses: sancion.actionId, result: { sanctionStatus: 'LIFTED' } } });
    crearAvisoEn(tx, { recipientAccountId: sancion.accountId, kind: 'SANCTION_LIFTED', origenId: actionId, actionId, sanctionId: sancion.sanctionId, at });
    return { tipo: 'hecho' as const, resultado: { caseId: caso.caseId, caseStatus: casoDespues.status, sanctionId: sancion.sanctionId, sanctionStatus: 'LIFTED' } };
  });

  /* ── Apelaciones (lado de moderación) ────────────────────────────────── */

  const tomarLaApelacion = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string, politicas: Politicas): Promise<Duplicado | Hecho> => db.runTransaction(async (tx) => {
    const previa = await tx.get(accionRef(actionId));
    if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
    const snap = await tx.get(apelacionRef(p.appealId as string));
    if (!snap.exists) throw new RechazoDeModeracion('appeal_not_found');
    const ap = snap.data() as ApelacionDeModeracion;
    const caso = await casoParaActuar(tx, ap.caseId, actor);
    const at = now();
    const t = tomarApelacion(ap, { uid: actor.uid, at, politica: politicas.apelaciones, justificacion: p.justification });
    if (!t.ok) throw new RechazoDeModeracion(t.code === 'not_affected' ? 'conflict_of_interest' : t.code);
    tx.set(apelacionRef(ap.appealId), plano(t.apelacion));
    tx.create(apelacionRef(ap.appealId).collection(HISTORIAL_DE_APELACION).doc(idDeEntradaDeApelacion(t.entrada.seq)), plano(t.entrada));
    registrarAccion(tx, { actionId, operacion: p.operacion, actor, p, at, correlationId, caso, extra: { appealId: ap.appealId, result: { appealStatus: 'UNDER_REVIEW' } } });
    return { tipo: 'hecho' as const, resultado: { caseId: caso.caseId, caseStatus: caso.status, appealId: ap.appealId, appealStatus: 'UNDER_REVIEW' } };
  });

  /**
   * RESOLVER UNA APELACIÓN. Si se le da la razón, lo apelado se deshace en la
   * misma transacción —el contenido vuelve, la sanción se levanta— con ESTA
   * acción, que lo dice (`reverses`). La acción original no se toca.
   */
  const decidirLaApelacion = async (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string, politicas: Politicas): Promise<Duplicado | Hecho> => db.runTransaction(async (tx) => {
    const previa = await tx.get(accionRef(actionId));
    if (previa.exists) return comprobarDuplicado(previa.data() as AccionDeModeracion, p);
    const snap = await tx.get(apelacionRef(p.appealId as string));
    if (!snap.exists) throw new RechazoDeModeracion('appeal_not_found');
    const ap = snap.data() as ApelacionDeModeracion;
    const caso = await casoParaActuar(tx, ap.caseId, actor);
    const originalSnap = await tx.get(accionRef(ap.actionId));
    if (!originalSnap.exists) throw new RechazoDeModeracion('action_not_found');
    const original = originalSnap.data() as AccionDeModeracion;
    const upheld = p.outcome === 'UPHELD';

    /* Todo lo que hay que leer, antes de escribir nada. */
    const vaultSnap = upheld && original.vaultId ? await tx.get(custodiaRef(original.vaultId)) : null;
    const custodia = vaultSnap?.exists ? (vaultSnap.data() as CustodiaDeContenido) : undefined;
    const fuenteSnap = custodia ? await tx.get(db.doc(custodia.path)) : null;
    const sancionSnap = upheld && original.sanctionId ? await tx.get(sancionRef(original.sanctionId)) : null;
    const sancion = sancionSnap?.exists ? (sancionSnap.data() as SancionDeModeracion) : undefined;
    const situacionSnap = sancion ? await tx.get(situacionRef(sancion.accountId)) : null;
    const at = now();
    const situacion = sancion ? situacionDe(situacionSnap, sancion.accountId, at) : undefined;
    const vigentes = situacion ? await sancionesActivasEn(tx, situacion) : [];

    const r = decidirApelacion(ap, { uid: actor.uid, at, outcome: p.outcome as 'UPHELD' | 'DENIED', justificacion: p.justification, ...(upheld ? { reversalActionId: actionId } : {}) });
    if (!r.ok) throw new RechazoDeModeracion(r.code);

    let efectos = caso.effects;
    let vaultState: string | undefined;
    if (upheld && custodia && (custodia.state === 'HIDDEN' || custodia.state === 'REMOVED')) {
      const d = decidirCustodia(custodia, 'RESTORE_CONTENT', { custodiable: true, fuenteExiste: !!fuenteSnap?.exists, retiradaReversible: politicas.retirada.reversible });
      if (!d.ok) throw new RechazoDeModeracion(d.code);
      if (!custodia.data) throw new RechazoDeModeracion('content_not_hidden');
      tx.create(db.doc(custodia.path), custodia.data);
      const { data: _copia, ...rastro } = custodia;
      tx.set(custodiaRef(custodia.vaultId), plano({ ...rastro, state: 'RESTORED', preventive: false, lastActionId: actionId, restoredAt: at, updatedAt: at }));
      efectos = { ...efectos, content: null, preventive: false };
      vaultState = 'RESTORED';
    }
    let sanctionStatus: string | undefined;
    if (upheld && sancion && sancionEnVigor(sancion, at)) {
      const l = levantarSancion(sancion, { caseId: sancion.caseId, actionId, by: actor.uid, justification: p.justification, at });
      if (!l.ok) throw new RechazoDeModeracion(l.code);
      tx.set(sancionRef(sancion.sanctionId), plano(l.sancion));
      const restantes = vigentes.filter((s) => s.sanctionId !== sancion.sanctionId);
      const despues = conRestriccion(situacion as SituacionDeCuenta, restantes, at);
      tx.set(situacionRef(sancion.accountId), plano({ ...despues, activeSanctionIds: [...new Set([...despues.activeSanctionIds, ...restantes.filter((s) => s.type === 'WARNING' && s.status === 'ACTIVE').map((s) => s.sanctionId)])].sort() }));
      efectos = { ...efectos, sanctionIds: efectos.sanctionIds.filter((id) => id !== sancion.sanctionId) };
      sanctionStatus = 'LIFTED';
    }

    tx.set(apelacionRef(ap.appealId), plano(r.apelacion));
    tx.create(apelacionRef(ap.appealId).collection(HISTORIAL_DE_APELACION).doc(idDeEntradaDeApelacion(r.entrada.seq)), plano(r.entrada));
    let casoDespues: CasoDeModeracion;
    let entrada: EntradaDeCaso;
    if (upheld && casoSinEfectos({ effects: efectos }) && (caso.status === 'ACTION_TAKEN' || caso.status === 'CLOSED')) {
      ({ caso: casoDespues, entrada } = mover(caso, { hacia: 'RESTORED', quien: 'APPEAL', por: { kind: 'ADMIN', id: actor.uid }, at, tipo: 'APPEAL_DECIDED', operacion: p.operacion, actionId, appealId: ap.appealId, justificacion: p.justification, cambios: { effects: efectos } }));
    } else {
      ({ caso: casoDespues, entrada } = anotarEnElCaso({ ...caso, effects: efectos }, { type: 'APPEAL_DECIDED', at, by: { kind: 'ADMIN', id: actor.uid }, operation: p.operacion, actionId, appealId: ap.appealId, reason: p.justification }));
    }
    guardarCaso(tx, casoDespues, [entrada], false);
    registrarAccion(tx, {
      actionId, operacion: p.operacion, actor, p, at, correlationId, caso, casoDespues,
      extra: {
        appealId: ap.appealId, ...(upheld ? { reverses: original.actionId } : {}),
        ...(original.vaultId ? { vaultId: original.vaultId } : {}), ...(original.sanctionId ? { sanctionId: original.sanctionId } : {}),
        result: { appealStatus: r.apelacion.status, ...(vaultState ? { vaultState: vaultState as CustodiaDeContenido['state'] } : {}), ...(sanctionStatus ? { sanctionStatus: sanctionStatus as SancionDeModeracion['status'] } : {}) },
      },
    });
    crearAvisoEn(tx, { recipientAccountId: ap.accountId, kind: upheld ? 'APPEAL_UPHELD' : 'APPEAL_DENIED', origenId: actionId, actionId, appealId: ap.appealId, at });
    return { tipo: 'hecho' as const, resultado: { caseId: caso.caseId, caseStatus: casoDespues.status, appealId: ap.appealId, appealStatus: r.apelacion.status, ...(vaultState ? { vaultState } : {}), ...(sanctionStatus ? { sanctionStatus } : {}) } };
  });

  /* ── La entrada común de todas las operaciones ───────────────────────── */

  /** Las que, la primera vez, fijan el desenlace del caso para sus denunciantes (junto con rechazar). */
  const OPERACIONES_QUE_DECIDEN: readonly OperacionDeModeracion[] = ['HIDE_CONTENT', 'REMOVE_CONTENT', 'WARN_ACCOUNT', 'SUSPEND_ACCOUNT', 'BLOCK_ACCOUNT'];

  type Operador = (actor: ActorDeModeracion, p: PeticionDeOperacion, actionId: string, correlationId: string, politicas: Politicas) => Promise<Duplicado | Hecho>;

  const OPERADORES: Readonly<Record<OperacionDeModeracion, Operador>> = Object.freeze({
    OPEN_CASE: abrir,
    TAKE_CASE: tomar,
    RELEASE_CASE: soltar,
    REQUIRE_ACTION: exigirAccion,
    REJECT_CASE: rechazar,
    RESOLVE_CASE: resolver,
    HIDE_CONTENT: sobreElContenido,
    RESTORE_CONTENT: sobreElContenido,
    REMOVE_CONTENT: sobreElContenido,
    WARN_ACCOUNT: sobreLaCuenta,
    SUSPEND_ACCOUNT: sobreLaCuenta,
    BLOCK_ACCOUNT: sobreLaCuenta,
    LIFT_SANCTION: levantar,
    TAKE_APPEAL: tomarLaApelacion,
    DECIDE_APPEAL: decidirLaApelacion,
  });

  /**
   * UNA OPERACIÓN DE MODERACIÓN, de principio a fin: identidad administrativa →
   * permiso específico → petición válida → transacción con su auditoría. Lo
   * rechazado después de autorizar también queda en la auditoría, con su código.
   */
  const ejecutar = async (operacion: OperacionDeModeracion, auth: unknown, data: unknown): Promise<ResultadoDeOperacion> => {
    const correlationId = correlacion();
    const permiso = OPERACIONES[operacion].permiso;
    const actor = await puerta.exigir(auth, permiso, { operation: operacion, correlationId });
    const v = validarPeticionDeOperacion(operacion, data);
    if (!v.ok) {
      await auditarFuera({ at: now(), actor: { kind: 'ADMIN', id: actor.uid, rol: actor.rol }, operation: operacion, permission: permiso, result: 'REJECTED', code: v.code, correlationId });
      throw new RechazoDeModeracion(v.code);
    }
    const p = v.peticion;
    const actionId = idDeAccion(huella, { kind: 'ADMIN', id: actor.uid }, operacion, p.requestId) as string;
    try {
      const politicas = await leerPoliticas();
      const r = await OPERADORES[operacion](actor, p, actionId, correlationId, politicas);
      if (r.tipo === 'duplicado') {
        await auditarFuera({ at: now(), actor: { kind: 'ADMIN', id: actor.uid, rol: actor.rol }, operation: operacion, permission: permiso, result: 'DUPLICATE', actionId, ...(p.caseId ? { caseId: p.caseId } : {}), requestId: p.requestId, correlationId });
        return {
          actionId, operation: operacion, duplicate: true,
          ...(r.accion.caseId ? { caseId: r.accion.caseId } : {}), ...(r.accion.result.caseTo ? { caseStatus: r.accion.result.caseTo } : {}),
          ...(r.accion.result.vaultState ? { vaultState: r.accion.result.vaultState } : {}), ...(r.accion.sanctionId ? { sanctionId: r.accion.sanctionId } : {}),
          ...(r.accion.result.sanctionStatus ? { sanctionStatus: r.accion.result.sanctionStatus } : {}), ...(r.accion.appealId ? { appealId: r.accion.appealId } : {}),
          ...(r.accion.result.appealStatus ? { appealStatus: r.accion.result.appealStatus } : {}),
        };
      }
      if (r.resultado.caseId && (operacion === 'REJECT_CASE' || OPERACIONES_QUE_DECIDEN.includes(operacion))) {
        try { await propagarDesenlace(r.resultado.caseId); } catch { console.error('MODERATION: el desenlace de los denunciantes quedó pendiente', r.resultado.caseId); }
      }
      return { actionId, operation: operacion, duplicate: false, ...r.resultado };
    } catch (e) {
      const code = e instanceof RechazoDeModeracion ? e.code : 'internal';
      await auditarFuera({
        at: now(), actor: { kind: 'ADMIN', id: actor.uid, rol: actor.rol }, operation: operacion, permission: permiso,
        result: e instanceof RechazoDeModeracion ? 'REJECTED' : 'ERROR', code, actionId,
        ...(p.caseId ? { caseId: p.caseId } : {}), ...(p.appealId ? { appealId: p.appealId } : {}), requestId: p.requestId, correlationId,
      });
      throw e;
    }
  };

  /* ═══ DESENLACE PARA LOS DENUNCIANTES (abuso de reportes) ════════════════ */

  /**
   * Anota en cada denunciante cómo acabó su señal: confirmada o rechazada. Por
   * tandas acotadas, idempotente (la marca de cada denunciante dice si ya se
   * anotó) y retomable: si se corta, el barrido la termina.
   */
  const propagarDesenlace = async (caseId: string): Promise<number> => {
    const snap = await casoRef(caseId).get();
    if (!snap.exists) return 0;
    const caso = snap.data() as CasoDeModeracion;
    if (caso.reporterOutcomes !== 'PENDING' || !caso.decision) return 0;
    const desenlace = caso.decision;
    let anotados = 0;
    let ultimo: string | undefined;
    for (let vuelta = 0; vuelta < 50; vuelta++) {
      let q = casoRef(caseId).collection(DENUNCIANTES).orderBy('accountId').limit(100);
      if (ultimo) q = q.startAfter(ultimo);
      const pagina = await q.get();
      if (pagina.empty) break;
      ultimo = (pagina.docs[pagina.docs.length - 1].data() as MarcaDeDenunciante).accountId;
      anotados += await db.runTransaction(async (tx) => {
        const marcas = await Promise.all(pagina.docs.map((d) => tx.get(d.ref)));
        const pendientes = marcas.filter((m) => m.exists && !(m.data() as MarcaDeDenunciante).outcome);
        const situaciones = await Promise.all(pendientes.map((m) => tx.get(situacionRef((m.data() as MarcaDeDenunciante).accountId))));
        const at = now();
        pendientes.forEach((m, i) => {
          const marca = m.data() as MarcaDeDenunciante;
          const s = situacionDe(situaciones[i], marca.accountId, at);
          tx.set(m.ref, plano({ ...marca, outcome: desenlace }));
          tx.set(situacionRef(marca.accountId), plano({
            ...s, reporter: { ...s.reporter, ...(desenlace === 'UPHELD' ? { upheld: s.reporter.upheld + 1 } : { rejected: s.reporter.rejected + 1 }) }, updatedAt: at,
          }));
        });
        return pendientes.length;
      });
      if (pagina.size < 100) break;
    }
    await db.runTransaction(async (tx) => {
      const actual = await tx.get(casoRef(caseId));
      const c = actual.data() as CasoDeModeracion | undefined;
      if (c && c.reporterOutcomes === 'PENDING' && c.decision === desenlace) tx.set(casoRef(caseId), plano({ ...c, reporterOutcomes: 'DONE' }));
    });
    return anotados;
  };

  /* ═══ APELAR (la persona afectada) ═══════════════════════════════════════ */

  /**
   * LA PERSONA AFECTADA APELA. Quién es lo dice la sesión; de qué cuenta es la
   * acción lo dice la acción guardada. Una apelación por acción.
   */
  const apelar = async (auth: unknown, data: unknown) => {
    const sesion = auth as { uid?: unknown } | undefined;
    if (!sesion || typeof sesion.uid !== 'string' || !sesion.uid) throw new RechazoDeModeracion('unauthenticated');
    if (!esCuentaAutenticada(auth as Parameters<typeof esCuentaAutenticada>[0])) throw new RechazoDeModeracion('unauthenticated');
    const uid = sesion.uid;
    const v = validarPeticionDeApelacion(data);
    if (!v.ok) throw new RechazoDeModeracion(v.code);
    const appealId = idDeApelacion(huella, v.peticion.actionId) as string;
    const correlationId = correlacion();
    const resultado = await db.runTransaction(async (tx) => {
      const [apSnap, accSnap] = await Promise.all([tx.get(apelacionRef(appealId)), tx.get(accionRef(v.peticion.actionId))]);
      if (apSnap.exists) {
        const ap = apSnap.data() as ApelacionDeModeracion;
        if (ap.accountId !== uid) throw new RechazoDeModeracion('not_affected');
        return { duplicado: true, apelacion: ap };
      }
      if (!accSnap.exists) throw new RechazoDeModeracion('action_not_found');
      const accion = accSnap.data() as AccionDeModeracion;
      /* Quien no es la cuenta afectada no sabe ni si la acción existe: la misma respuesta que si no existiera. */
      if (accion.subjectAccountId !== uid) throw new RechazoDeModeracion('action_not_found');
      const [vaultSnap, sancionSnap, casoSnap] = await Promise.all([
        accion.vaultId ? tx.get(custodiaRef(accion.vaultId)) : Promise.resolve(null),
        accion.sanctionId ? tx.get(sancionRef(accion.sanctionId)) : Promise.resolve(null),
        accion.caseId ? tx.get(casoRef(accion.caseId)) : Promise.resolve(null),
      ]);
      const at = now();
      const custodia = vaultSnap?.exists ? (vaultSnap.data() as CustodiaDeContenido) : undefined;
      const sancion = sancionSnap?.exists ? (sancionSnap.data() as SancionDeModeracion) : undefined;
      const yaDeshecha = (!!custodia && custodia.state === 'RESTORED') || (!!sancion && !sancionEnVigor(sancion, at));
      const n = nuevaApelacion({ appealId, accion, principalId: uid, reason: v.peticion.reason, yaDeshecha, at });
      if (!n.ok) throw new RechazoDeModeracion(n.code);
      tx.create(apelacionRef(appealId), plano(n.apelacion));
      tx.create(apelacionRef(appealId).collection(HISTORIAL_DE_APELACION).doc(idDeEntradaDeApelacion(1)), plano(n.entrada as EntradaDeApelacion));
      if (casoSnap?.exists) {
        const a = anotarEnElCaso(casoSnap.data() as CasoDeModeracion, { type: 'APPEAL_FILED', at, by: { kind: 'USER', id: uid }, appealId, actionId: accion.actionId });
        guardarCaso(tx, a.caso, [a.entrada], false);
      }
      auditarEn(tx, { at, actor: { kind: 'USER', id: uid }, operation: 'SUBMIT_APPEAL', result: 'OK', appealId, actionId: accion.actionId, ...(accion.caseId ? { caseId: accion.caseId } : {}), correlationId });
      crearAvisoEn(tx, { recipientAccountId: uid, kind: 'APPEAL_RECEIVED', origenId: appealId, appealId, actionId: accion.actionId, at });
      return { duplicado: false, apelacion: n.apelacion };
    });
    return { received: true, duplicate: resultado.duplicado, ...vistaDeApelacionParaElAfectado(resultado.apelacion) };
  };

  /* ═══ LO QUE VE LA PERSONA AFECTADA ═══════════════════════════════════════ */

  /**
   * MI MODERACIÓN: qué se hizo contra mi cuenta, si tengo una restricción, mis
   * apelaciones y mis avisos. Nunca quién denunció ni quién revisó.
   */
  const miModeracion = async (auth: unknown) => {
    const sesion = auth as { uid?: unknown } | undefined;
    if (!sesion || typeof sesion.uid !== 'string' || !sesion.uid || !esCuentaAutenticada(auth as Parameters<typeof esCuentaAutenticada>[0])) {
      throw new RechazoDeModeracion('unauthenticated');
    }
    const uid = sesion.uid;
    const at = now();
    /* La restricción se calcula de las sanciones, que son la verdad; la situación guardada es un resumen. */
    const [sanciones, acciones, apelaciones, avisos] = await Promise.all([
      db.collection(SANCIONES).where('accountId', '==', uid).limit(50).get(),
      db.collection(ACCIONES).where('subjectAccountId', '==', uid).limit(100).get(),
      db.collection(APELACIONES).where('accountId', '==', uid).limit(50).get(),
      db.collection(AVISOS).where('recipientAccountId', '==', uid).limit(50).get(),
    ]);
    const lasSanciones = sanciones.docs.map((d) => d.data() as SancionDeModeracion);
    const conEfecto = acciones.docs.map((d) => d.data() as AccionDeModeracion)
      .filter((a) => a.family === 'CONTENT' || a.family === 'ACCOUNT' || a.operation === 'PREVENTIVE_HIDE')
      .sort((a, b) => b.at - a.at);
    return {
      restriction: restriccionDeCuenta(lasSanciones, at),
      sanctions: lasSanciones.sort((a, b) => b.createdAt - a.createdAt).map((s) => vistaDeSancionParaElAfectado(s, at)),
      actions: conEfecto.map(vistaDeAccionParaElAfectado),
      appeals: apelaciones.docs.map((d) => d.data() as ApelacionDeModeracion).sort((a, b) => b.createdAt - a.createdAt).map(vistaDeApelacionParaElAfectado),
      notices: avisos.docs.map((d) => d.data() as AvisoDeModeracion).sort((a, b) => b.createdAt - a.createdAt).map(vistaDeAvisoParaElAfectado),
      generatedAt: at,
    };
  };

  /* ═══ EL BARRIDO ═══════════════════════════════════════════════════════════ */

  /**
   * CADA CUARTO DE HORA, TRES COSAS Y NINGUNA MÁS: cerrar las suspensiones cuya
   * hora pasó, dar caso a los reportes que se quedaron sin él y terminar de
   * anotar desenlaces a medias. Cada paso es idempotente y está acotado.
   */
  const barrer = async (at: number = now()) => {
    let vencidas = 0;
    const porVencer = await db.collection(SANCIONES)
      .where('vencimiento', '>=', RANGO_DE_VENCIMIENTO_DESDE).where('vencimiento', '<=', claveDeVencimiento(at)).orderBy('vencimiento').limit(100).get();
    for (const doc of porVencer.docs) {
      const hecho = await db.runTransaction(async (tx) => {
        const snap = await tx.get(doc.ref);
        if (!snap.exists) return false;
        const s = snap.data() as SancionDeModeracion;
        const vencida = vencerSancion(s, at);
        if (!vencida) return false;
        const actionId = idDeAccion(huella, SISTEMA_DE_BARRIDO, 'EXPIRE_SANCTION', s.sanctionId) as string;
        const [accionSnap, situacionSnap, casoSnap] = await Promise.all([tx.get(accionRef(actionId)), tx.get(situacionRef(s.accountId)), tx.get(casoRef(s.caseId))]);
        if (accionSnap.exists) return false;
        const situacion = situacionDe(situacionSnap, s.accountId, at);
        const vigentes = await sancionesActivasEn(tx, situacion);
        tx.set(doc.ref, plano(vencida));
        const restantes = vigentes.filter((x) => x.sanctionId !== s.sanctionId);
        const despues = conRestriccion(situacion, restantes, at);
        tx.set(situacionRef(s.accountId), plano({ ...despues, activeSanctionIds: [...new Set([...despues.activeSanctionIds, ...restantes.filter((x) => x.type === 'WARNING' && x.status === 'ACTIVE').map((x) => x.sanctionId)])].sort() }));
        if (casoSnap.exists) {
          const caso = casoSnap.data() as CasoDeModeracion;
          /* Vencer no es deshacer: el caso no pasa a RESTORED, solo deja de tener esa sanción en vigor. */
          const a = anotarEnElCaso({ ...caso, effects: { ...caso.effects, sanctionIds: caso.effects.sanctionIds.filter((id) => id !== s.sanctionId) } },
            { type: 'SANCTION_EXPIRED', at, by: SISTEMA_DE_BARRIDO, sanctionId: s.sanctionId, actionId });
          guardarCaso(tx, a.caso, [a.entrada], false);
        }
        const accion: AccionDeModeracion = {
          contract: MODERATION_CORE_CONTRACT_VERSION, actionId, operation: 'EXPIRE_SANCTION', family: 'SYSTEM', caseId: s.caseId, sanctionId: s.sanctionId,
          subjectAccountId: s.accountId, actor: { kind: 'SYSTEM', id: SISTEMA_DE_BARRIDO.id }, justification: 'La suspensión llegó a su hora de fin.',
          at, result: { sanctionStatus: 'EXPIRED' }, appealable: false,
        };
        tx.create(accionRef(actionId), plano(accion));
        auditarEn(tx, { at, actor: { kind: 'SYSTEM', id: SISTEMA_DE_BARRIDO.id }, operation: 'EXPIRE_SANCTION', result: 'OK', caseId: s.caseId, sanctionId: s.sanctionId, actionId, correlationId: correlacion() });
        return true;
      });
      if (hecho) vencidas++;
    }

    let adjuntados = 0;
    const recientes = await db.collection(REPORTES).orderBy('createdAt', 'desc').limit(200).get();
    for (const doc of recientes.docs) {
      if ((doc.data() as Report).caseId) continue;
      const r = await adjuntarReporte(doc.id);
      if (r.estado === 'adjuntado') adjuntados++;
    }

    let desenlaces = 0;
    const pendientes = await db.collection(CASOS).where('reporterOutcomes', '==', 'PENDING').limit(20).get();
    for (const doc of pendientes.docs) desenlaces += await propagarDesenlace(doc.id);

    return { vencidas, adjuntados, desenlaces };
  };

  return {
    adjuntarReporte,
    ejecutar,
    apelar,
    miModeracion,
    barrer,
    propagarDesenlace,
    leerPoliticas,
    /* Para la consola (`consola.ts`), que lee con la misma puerta y deja constancia en la misma auditoría. */
    puerta,
    auditarFuera,
    correlacion,
    now,
    huella,
  };
};

export type NucleoDeModeracion = ReturnType<typeof crearNucleoDeModeracion>;

/** Todas las operaciones que dejan una acción guardada: las de administración y las dos del sistema. */
export const TODAS_LAS_OPERACIONES: readonly (OperacionDeModeracion | OperacionDelSistema)[] = Object.freeze([
  ...(Object.keys(OPERACIONES) as OperacionDeModeracion[]), 'PREVENTIVE_HIDE', 'EXPIRE_SANCTION',
]);

/** Los estados en los que un caso espera a alguien. */
export const ESTADOS_QUE_ESPERAN: readonly EstadoDeCaso[] = ESTADOS_ABIERTOS;
