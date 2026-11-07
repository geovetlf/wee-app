import type { Firestore, Query } from 'firebase-admin/firestore';
import { FORMA_DE_ID_DE_REPORTE, Report } from '../core/moderation';
import {
  CasoDeModeracion, ESTADOS_DE_CASO, EntradaDeCaso, EstadoDeCaso, FORMA_DE_ID_DE_CASO, SenalDelCaso, esEstadoDeCaso, rangoDeCola,
  seudonimoDeCuenta, vistaDeCasoParaConsola, vistaDeSenalParaConsola,
} from '../core/moderation-case';
import {
  AccionDeModeracion, CustodiaDeContenido, LECTURAS_DE_CONSOLA, LecturaDeConsola, SancionDeModeracion, SituacionDeCuenta,
  entradaDeAuditoria, esLecturaDeConsola, idDeCustodia, sancionEnVigor, senalesDeAbuso,
} from '../core/moderation-action';
import { ApelacionDeModeracion, ESTADOS_DE_APELACION, esEstadoDeApelacion } from '../core/moderation-appeal';
import { entidadesDeLaCuenta } from '../identity/cuentas';
import { REPORTES, RechazoDeModeracion } from './index';
import { ACCIONES, APELACIONES, AUDITORIA, CASOS, CUSTODIA, DENUNCIANTES, HISTORIAL_DEL_CASO, NucleoDeModeracion, SANCIONES, SENALES, SITUACION } from './nucleo';
import { vistaDelContenidoParaRevisar } from './resolutores';

/**
 * WEE MODERATION CORE — LOS CONTRATOS DE LECTURA DE LA CONSOLA.
 *
 * Lo que la Consola Administrativa necesita mirar, servido por una función
 * de SOLO LECTURA (`moderationConsole`) y separado de los permisos de
 * escritura: tener `moderation.read` no da ninguna acción. La consola nunca lee
 * los documentos privados directamente —las reglas no la dejan—: pide una
 * vista, y la vista lleva solo lo que esa vista enseña.
 *
 * ── La identidad, protegida también dentro de moderación ────────────────────
 *
 * Por defecto nadie ve QUIÉN denunció: cada denunciante es un seudónimo estable
 * (`per_…`) que deja ver si la misma persona denuncia cuarenta cosas sin decir
 * quién es. Tampoco se ve la cuenta que hay detrás de la cara denunciada, que
 * es el vínculo entre su Perfil Real y su Perfil Weë. Las dos cosas se revelan
 * con `reveal: true`, que exige `moderation.identity.read` y queda auditado.
 *
 * Toda vista que enseña datos de personas deja su constancia en la auditoría
 * ANTES de devolver nada: si no se puede escribir, no se devuelve.
 */

const LIMITE_POR_DEFECTO = 25;
const LIMITE_MAXIMO = 50;
const FORMA_DE_COLA = /^[A-Z_]+\|\d{4}\|\d{15}$/;

const PARAMETROS: Readonly<Record<LecturaDeConsola, readonly string[]>> = Object.freeze({
  inbox: ['limit', 'before', 'reveal'],
  cases: ['status', 'limit', 'after', 'reveal'],
  case: ['caseId', 'reveal'],
  content: ['caseId'],
  history: ['caseId', 'after'],
  actions: ['limit', 'before', 'reveal'],
  sanctions: ['caseId', 'status', 'limit', 'reveal'],
  appeals: ['status', 'limit', 'reveal'],
  subject: ['caseId', 'reveal'],
  reporter: ['caseId', 'reportId'],
  stats: [],
  policies: [],
  audit: ['limit', 'before'],
});

const esObjetoLlano = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

const limite = (v: unknown): number => {
  if (v === undefined) return LIMITE_POR_DEFECTO;
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 1 || v > LIMITE_MAXIMO) throw new RechazoDeModeracion('invalid_cursor');
  return v;
};
const instante = (v: unknown): number | undefined => {
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new RechazoDeModeracion('invalid_cursor');
  return v;
};
const casoId = (v: unknown): string => {
  if (typeof v !== 'string' || !FORMA_DE_ID_DE_CASO.test(v)) throw new RechazoDeModeracion('invalid_case');
  return v;
};

/** Una acción para la consola: sin la cuenta de la persona afectada, salvo que se revele. */
const vistaDeAccion = (a: AccionDeModeracion, revelar: boolean) => {
  const { subjectAccountId, ...resto } = a;
  return { ...resto, ...(revelar && subjectAccountId ? { subjectAccountId } : {}) };
};
const vistaDeSancion = (s: SancionDeModeracion, revelar: boolean, at: number) => {
  const { accountId, vencimiento: _clave, ...resto } = s;
  return { ...resto, inForce: sancionEnVigor(s, at), ...(revelar ? { accountId } : {}) };
};
const vistaDeApelacion = (ap: ApelacionDeModeracion, revelar: boolean) => {
  const { accountId, ...resto } = ap;
  return { ...resto, ...(revelar ? { accountId } : {}) };
};

export const crearConsolaDeModeracion = (nucleo: NucleoDeModeracion, deps: { db: Firestore }) => {
  const { db } = deps;
  const { huella } = nucleo;

  const leerCaso = async (caseId: string): Promise<CasoDeModeracion> => {
    const snap = await db.collection(CASOS).doc(caseId).get();
    if (!snap.exists) throw new RechazoDeModeracion('case_not_found');
    return snap.data() as CasoDeModeracion;
  };

  type Lector = (p: Record<string, unknown>, ctx: { revelar: boolean; at: number }) => Promise<Record<string, unknown>>;

  const LECTORES: Readonly<Record<LecturaDeConsola, Lector>> = Object.freeze({
    /* La bandeja: los reportes que van llegando, del más reciente al más antiguo. */
    inbox: async (p, { revelar }) => {
      let q = db.collection(REPORTES).orderBy('createdAt', 'desc').limit(limite(p.limit));
      const antes = instante(p.before);
      if (antes !== undefined) q = q.startAfter(antes);
      const snap = await q.get();
      return {
        reports: snap.docs.map((d) => {
          const r = d.data() as Report;
          return {
            reportId: r.reportId, targetType: r.targetType, targetId: r.targetId, reason: r.reason, status: r.status, createdAt: r.createdAt,
            ...(r.caseId ? { caseId: r.caseId } : {}), ...(r.priority ? { priority: r.priority } : {}), ...(r.surface ? { surface: r.surface } : {}),
            ...(r.details ? { details: r.details } : {}), ...(r.targetModality ? { targetModality: r.targetModality } : {}),
            reporterRef: seudonimoDeCuenta(huella, r.reporterAccountId),
            ...(r.reporterEntityType ? { reporterEntityType: r.reporterEntityType } : {}),
            ...(revelar ? { reporterAccountId: r.reporterAccountId, ...(r.reporterEntityId ? { reporterEntityId: r.reporterEntityId } : {}) } : {}),
          };
        }),
      };
    },
    /* Una cola: por estado, lo más prioritario primero y, a igual prioridad, lo más antiguo. Sin índices compuestos. */
    cases: async (p, { revelar }) => {
      if (!esEstadoDeCaso(p.status)) throw new RechazoDeModeracion('invalid_status');
      const { desde, hasta } = rangoDeCola(p.status);
      let q = db.collection(CASOS).where('cola', '>=', desde).where('cola', '<', hasta).orderBy('cola').limit(limite(p.limit));
      if (p.after !== undefined) {
        if (typeof p.after !== 'string' || !FORMA_DE_COLA.test(p.after)) throw new RechazoDeModeracion('invalid_cursor');
        q = q.startAfter(p.after);
      }
      const snap = await q.get();
      const casos = snap.docs.map((d) => d.data() as CasoDeModeracion);
      return { status: p.status, cases: casos.map((c) => vistaDeCasoParaConsola(c, { revelarIdentidad: revelar })), next: casos.length ? casos[casos.length - 1].cola : null };
    },
    /* Un caso entero: sus señales (con su detalle), su historial, sus acciones, sus apelaciones y sus sanciones. */
    case: async (p, { revelar, at }) => {
      const caso = await leerCaso(casoId(p.caseId));
      const ref = db.collection(CASOS).doc(caso.caseId);
      const [senales, historial, acciones, apelaciones, sanciones] = await Promise.all([
        ref.collection(SENALES).orderBy('createdAt', 'desc').limit(100).get(),
        ref.collection(HISTORIAL_DEL_CASO).orderBy('seq', 'asc').limit(200).get(),
        db.collection(ACCIONES).where('caseId', '==', caso.caseId).limit(100).get(),
        db.collection(APELACIONES).where('caseId', '==', caso.caseId).limit(50).get(),
        db.collection(SANCIONES).where('caseId', '==', caso.caseId).limit(50).get(),
      ]);
      const lasSenales = senales.docs.map((d) => d.data() as SenalDelCaso);
      const reportes = lasSenales.length ? await Promise.all(lasSenales.map((s) => db.collection(REPORTES).doc(s.reportId).get())) : [];
      const detalle = new Map(reportes.filter((r) => r.exists).map((r) => [r.id, (r.data() as Report).details]));
      return {
        case: vistaDeCasoParaConsola(caso, { revelarIdentidad: revelar }),
        signals: lasSenales.map((s) => ({ ...vistaDeSenalParaConsola(s, huella, { revelarIdentidad: revelar }), ...(detalle.get(s.reportId) ? { details: detalle.get(s.reportId) } : {}) })),
        history: historial.docs.map((d) => d.data() as EntradaDeCaso),
        actions: acciones.docs.map((d) => vistaDeAccion(d.data() as AccionDeModeracion, revelar)).sort((a, b) => a.at - b.at),
        appeals: apelaciones.docs.map((d) => vistaDeApelacion(d.data() as ApelacionDeModeracion, revelar)),
        sanctions: sanciones.docs.map((d) => vistaDeSancion(d.data() as SancionDeModeracion, revelar, at)),
      };
    },
    /* Lo denunciado, como lo ve quien revisa: del documento en su sitio o de la copia custodiada. */
    content: async (p) => {
      const caso = await leerCaso(casoId(p.caseId));
      if (!caso.target.path) return { kind: caso.target.kind, state: 'NOT_CUSTODIABLE', content: {} };
      const vaultId = idDeCustodia(huella, caso.targetKey) as string;
      const [fuente, custodia] = await Promise.all([db.doc(caso.target.path).get(), db.collection(CUSTODIA).doc(vaultId).get()]);
      const c = custodia.exists ? (custodia.data() as CustodiaDeContenido) : undefined;
      if (fuente.exists) return { kind: caso.target.kind, state: 'VISIBLE', content: vistaDelContenidoParaRevisar(caso.target.kind, fuente.data()) };
      if (c && (c.state === 'HIDDEN' || c.state === 'REMOVED')) return { kind: caso.target.kind, state: c.state, preventive: c.preventive, content: vistaDelContenidoParaRevisar(caso.target.kind, c.data) };
      return { kind: caso.target.kind, state: 'GONE', content: {} };
    },
    history: async (p) => {
      const caseId = casoId(p.caseId);
      let q = db.collection(CASOS).doc(caseId).collection(HISTORIAL_DEL_CASO).orderBy('seq', 'asc').limit(LIMITE_MAXIMO * 2);
      if (p.after !== undefined) {
        if (typeof p.after !== 'number' || !Number.isSafeInteger(p.after) || p.after < 0) throw new RechazoDeModeracion('invalid_cursor');
        q = q.startAfter(p.after);
      }
      return { history: (await q.get()).docs.map((d) => d.data() as EntradaDeCaso) };
    },
    /* El historial de acciones de todo moderación, de lo más reciente a lo más antiguo. */
    actions: async (p, { revelar }) => {
      let q = db.collection(ACCIONES).orderBy('at', 'desc').limit(limite(p.limit));
      const antes = instante(p.before);
      if (antes !== undefined) q = q.startAfter(antes);
      return { actions: (await q.get()).docs.map((d) => vistaDeAccion(d.data() as AccionDeModeracion, revelar)) };
    },
    sanctions: async (p, { revelar, at }) => {
      if (p.caseId !== undefined) {
        const snap = await db.collection(SANCIONES).where('caseId', '==', casoId(p.caseId)).limit(limite(p.limit)).get();
        return { sanctions: snap.docs.map((d) => vistaDeSancion(d.data() as SancionDeModeracion, revelar, at)) };
      }
      if (p.status !== undefined && !['ACTIVE', 'LIFTED', 'EXPIRED'].includes(p.status as string)) throw new RechazoDeModeracion('invalid_status');
      const snap = await db.collection(SANCIONES).where('status', '==', (p.status as string) ?? 'ACTIVE').limit(limite(p.limit)).get();
      return { sanctions: snap.docs.map((d) => vistaDeSancion(d.data() as SancionDeModeracion, revelar, at)).sort((a, b) => b.createdAt - a.createdAt) };
    },
    appeals: async (p, { revelar }) => {
      const estado = p.status ?? 'SUBMITTED';
      if (!esEstadoDeApelacion(estado)) throw new RechazoDeModeracion('invalid_status');
      const snap = await db.collection(APELACIONES).where('status', '==', estado).limit(limite(p.limit)).get();
      return { status: estado, appeals: snap.docs.map((d) => vistaDeApelacion(d.data() as ApelacionDeModeracion, revelar)).sort((a, b) => a.createdAt - b.createdAt) };
    },
    /* La persona denunciada: reincidencia y restricción. Sus caras —el vínculo entre ellas— solo con `reveal`. */
    subject: async (p, { revelar, at }) => {
      const caso = await leerCaso(casoId(p.caseId));
      const cuenta = caso.subject.accountId;
      if (!cuenta) return { known: false };
      const snap = await db.collection(SITUACION).doc(cuenta).get();
      const s = snap.exists ? (snap.data() as SituacionDeCuenta) : undefined;
      const caras = revelar ? await entidadesDeLaCuenta(db, cuenta) : [];
      return {
        known: true,
        casesOpened: s?.subject.casesOpened ?? 0,
        actions: s?.subject.actions ?? {},
        ...(s?.subject.lastActionAt ? { lastActionAt: s.subject.lastActionAt } : {}),
        restriction: s ? { ...s.restriction, level: s.restriction.until !== null && s.restriction.until <= at && s.restriction.level === 'SUSPENDED' ? 'NONE' : s.restriction.level } : { level: 'NONE', until: null, sanctionIds: [] },
        ...(revelar ? { accountId: cuenta, faces: caras.map((e) => ({ entityId: e.entityId, entityType: e.entityType, status: e.status })) } : {}),
      };
    },
    /* Quién denunció una señal concreta. Siempre con `moderation.identity.read`, y auditado. */
    reporter: async (p) => {
      const caso = await leerCaso(casoId(p.caseId));
      if (typeof p.reportId !== 'string' || !FORMA_DE_ID_DE_REPORTE.test(p.reportId)) throw new RechazoDeModeracion('report_not_found');
      const senal = await db.collection(CASOS).doc(caso.caseId).collection(SENALES).doc(p.reportId).get();
      if (!senal.exists) throw new RechazoDeModeracion('report_not_found');
      const s = senal.data() as SenalDelCaso;
      const [situacion, politicas] = await Promise.all([db.collection(SITUACION).doc(s.reporterAccountId).get(), nucleo.leerPoliticas()]);
      const st = situacion.exists ? (situacion.data() as SituacionDeCuenta) : undefined;
      const marca = await db.collection(CASOS).doc(caso.caseId).collection(DENUNCIANTES).doc(s.reporterAccountId).get();
      return {
        reportId: s.reportId,
        reporterAccountId: s.reporterAccountId,
        ...(s.reporterEntityId ? { reporterEntityId: s.reporterEntityId, reporterEntityType: s.reporterEntityType } : {}),
        reporterRef: seudonimoDeCuenta(huella, s.reporterAccountId),
        reasonsOnThisCase: marca.exists ? (marca.data() as { reasons?: unknown }).reasons ?? [] : [],
        abuse: senalesDeAbuso(st?.reporter, politicas.abuso),
      };
    },
    /* Cuántos hay en cada sitio. Agregados: no dicen nada de nadie, y por eso no se auditan. */
    stats: async (_p, { at }) => {
      const contar = async (q: Query): Promise<number> => (await q.count().get()).data().count;
      const porEstado = await Promise.all(ESTADOS_DE_CASO.map(async (e) => {
        const { desde, hasta } = rangoDeCola(e);
        return [e, await contar(db.collection(CASOS).where('cola', '>=', desde).where('cola', '<', hasta))] as const;
      }));
      const apelaciones = await Promise.all(ESTADOS_DE_APELACION.map(async (e) => [e, await contar(db.collection(APELACIONES).where('status', '==', e))] as const));
      const [activas, ultimas24h, ultimos7d] = await Promise.all([
        contar(db.collection(SANCIONES).where('status', '==', 'ACTIVE')),
        contar(db.collection(REPORTES).where('createdAt', '>=', at - 86_400_000)),
        contar(db.collection(REPORTES).where('createdAt', '>=', at - 7 * 86_400_000)),
      ]);
      return {
        cases: Object.fromEntries(porEstado) as Record<EstadoDeCaso, number>,
        appeals: Object.fromEntries(apelaciones),
        activeSanctions: activas,
        reports: { last24h: ultimas24h, last7d: ultimos7d },
      };
    },
    policies: async () => ({ policies: await nucleo.leerPoliticas() }),
    audit: async (p) => {
      let q = db.collection(AUDITORIA).orderBy('at', 'desc').limit(limite(p.limit));
      const antes = instante(p.before);
      if (antes !== undefined) q = q.startAfter(antes);
      return { entries: (await q.get()).docs.map((d) => d.data()) };
    },
  });

  /**
   * LEER. Una vista, su permiso de lectura, y —si enseña datos de personas— su
   * constancia en la auditoría antes de devolver nada. `reveal` pide además el
   * permiso de identidad.
   */
  const leer = async (auth: unknown, data: unknown): Promise<Record<string, unknown>> => {
    /* Sin sesión no se mira ni qué se pidió. */
    if (!auth || typeof (auth as { uid?: unknown }).uid !== 'string' || !(auth as { uid: string }).uid) throw new RechazoDeModeracion('unauthenticated');
    if (!esObjetoLlano(data) || !esLecturaDeConsola(data.view)) throw new RechazoDeModeracion('unknown_read');
    const vista = data.view as LecturaDeConsola;
    const def = LECTURAS_DE_CONSOLA[vista];
    for (const clave of Object.keys(data)) {
      if (clave !== 'view' && !PARAMETROS[vista].includes(clave)) throw new RechazoDeModeracion('unknown_field');
    }
    const correlationId = nucleo.correlacion();
    const actor = await nucleo.puerta.exigir(auth, def.permiso, { operation: `console.${vista}`, correlationId });
    const revelar = data.reveal === true || vista === 'reporter';
    if (data.reveal !== undefined && typeof data.reveal !== 'boolean') throw new RechazoDeModeracion('unknown_field');
    if (revelar && def.permiso !== 'moderation.identity.read') {
      await nucleo.puerta.exigir(auth, 'moderation.identity.read', { operation: `console.${vista}.reveal`, correlationId });
    }
    const at = nucleo.now();
    const datos = await LECTORES[vista](data, { revelar, at });
    if (def.auditada) {
      try {
        const entrada = entradaDeAuditoria({
          at, actor: { kind: 'ADMIN', id: actor.uid, rol: actor.rol }, operation: `console.${vista}`, permission: def.permiso, result: 'READ', correlationId,
          ...(typeof data.caseId === 'string' && FORMA_DE_ID_DE_CASO.test(data.caseId) ? { caseId: data.caseId } : {}),
          ...(revelar ? { code: 'identity_revealed' } : {}),
        });
        await db.collection(AUDITORIA).doc().create(JSON.parse(JSON.stringify(entrada)));
      } catch {
        console.error('MODERATION: sin constancia de la lectura no se devuelven los datos', correlationId);
        throw new RechazoDeModeracion('unavailable');
      }
    }
    return { ...datos, view: vista, generatedAt: at, correlationId };
  };

  return { leer };
};
