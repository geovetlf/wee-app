/**
 * BOOST — EL MOTOR (docs/BOOST.md).
 *
 *   cliente → callable `boost` → este motor → Credit Engine (reservar / liquidar / devolver) + Firestore
 *
 * Todo lo que toca dinero pasa por el Credit Engine que ya existe (`spendCredits` → `completeCredits` /
 * `refundCredits`), con el `requestId` de la campaña y una huella de la operación. Este archivo NO suma ni resta un
 * solo Credit: no escribe `creditsBalance`, ni `creditTransactions`, ni `creditStats`. Lee el saldo con `readBalance`,
 * que no escribe nunca.
 *
 * Ciclo de una campaña:
 *   crear     → valida (dueño, publicación, límites) → RESERVA el presupuesto (`spendCredits`, AUTHORIZED)
 *               → crea `boostCampaigns/{bst_<requestId>}` en `active` y bloquea la publicación. Si algo falla
 *               después de reservar, se DEVUELVE (`refundCredits`).
 *   servir    → el Home de otra cuenta pide un hueco: se elige una campaña activa para la que esa cuenta sea público,
 *               se registra la impresión (una por cuenta y día) y se devuelve la publicación.
 *   terminar  → la persona la cancela, o el barrido la cierra al vencer, o la publicación desaparece: se CONGELA lo
 *               consumido (`settling`) y se liquida — `completeCredits({ finalAmount })` devuelve la diferencia; sin
 *               ninguna entrega, `refundCredits` devuelve todo —. Después, `ended`.
 *
 * Las dependencias entran por argumento: las pruebas usan un Firestore en memoria y el Credit Engine real sobre él.
 */
import type { CreditDb, CreditTx } from '../credits/creditEngine';
import {
  BoostError,
  Campana,
  ConfigDeBoost,
  consumoDe,
  DIA_MS,
  diaDeCampana,
  esPromocionable,
  huellaDe,
  idDeCampana,
  MotivoDeFin,
  PeticionDeBoost,
  presupuestosPosibles,
  SEGMENTOS,
  SEGMENTOS_CON_PAIS,
  SERVICIO_DE_CREDITS,
  Segmento,
  validarPeticion,
  vistaDeCampana,
  vistaPrevia,
} from './modelo';
import { cuentaDeIdentidad, idDeContacto, PerfilDeIdentidad } from '../social/econtact';

/** Lo que este motor usa del Credit Engine. Nada más: ni `grantCredits`, ni el saldo para escribir. */
export interface CreditosParaBoost {
  spendCredits(input: {
    userId: string; service: any; requestId: string; amount: number; reason: string; source: string;
    fingerprint: string; meta?: Record<string, unknown>;
  }): Promise<{ status: string; amount: number; balanceAfter: number; duplicate: boolean }>;
  completeCredits(input: { userId: string; requestId: string; finalAmount: number; meta?: Record<string, unknown> }): Promise<{ status: string; refunded: number; balanceAfter: number }>;
  refundCredits(input: { userId: string; requestId: string; reason?: string; source?: string }): Promise<{ amount: number; balanceAfter: number; duplicate: boolean }>;
  readBalance(userId: string): Promise<{ balance: number; initialized: boolean }>;
}

export interface AudienciaPotencial {
  /** Cuentas que hoy cumplen el público elegido (sin contar la de quien promociona). null = no se pudo contar. */
  cuentas: number | null;
  /** true si el conteo llegó al tope de lectura: «al menos N». */
  tope: boolean;
}

export interface BoostDeps {
  db: () => CreditDb;
  creditos: CreditosParaBoost;
  /** ¿Está `social_boost` en el catálogo del Credit Engine? Sin él no se reserva nada. */
  servicioRegistrado: () => boolean;
  ahora: () => number;
  config: () => Promise<ConfigDeBoost>;
  /** Cuenta el público potencial con datos reales (index.ts lo hace con consultas de Firestore). */
  contarAudiencia?: (a: { segment: Segmento; country: string | null; communityId: string | null; identityId: string; ownerAccountId: string }) => Promise<AudienciaPotencial>;
}

const CAMPANAS = 'boostCampaigns';
const BLOQUEOS = 'boostPostLocks';

/** Un error del Credit Engine, en el vocabulario de Boost. Lo que no se reconoce es interno. */
const motivoDeCredits = (e: unknown): BoostError => {
  const code = (e as { code?: string })?.code;
  const razon = (e as { details?: { reason?: string } })?.details?.reason;
  if (code === 'INSUFFICIENT_CREDITS' || code === 'ACCOUNT_NOT_FOUND') return new BoostError('saldo');
  if (code === 'ALREADY_REFUNDED') return new BoostError('operacion-cerrada');
  if (code === 'INVALID_SERVICE') return new BoostError('servicio-pendiente');
  if (code === 'INVALID_REQUEST' && razon === 'idempotency_conflict') return new BoostError('conflicto');
  if (code === 'FORBIDDEN') return new BoostError('conflicto');
  return new BoostError('interno');
};

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const ms = (v: unknown): number => {
  if (typeof v === 'number') return v;
  const t = v as { toMillis?: () => number } | null;
  return typeof t?.toMillis === 'function' ? t.toMillis() : 0;
};

export function createBoostEngine(deps: BoostDeps) {
  const db = () => deps.db();
  const campanas = () => db().collection(CAMPANAS);
  const bloqueos = () => db().collection(BLOQUEOS);
  const entregas = (id: string) => db().collection(`${CAMPANAS}/${id}/impressions`);
  const alcance = (id: string) => db().collection(`${CAMPANAS}/${id}/reach`);
  const clics = (id: string) => db().collection(`${CAMPANAS}/${id}/clicks`);

  // ── Identidades ────────────────────────────────────────────────────────
  /** El perfil de una identidad, por su campo `uid` (el id del documento es solo un atajo). */
  const perfilDe = async (identidad: string): Promise<Record<string, any> | null> => {
    if (!identidad || identidad.includes('/')) return null;
    const porCampo = await db().collection('users').where('uid', '==', identidad).limit(1).get();
    if (!porCampo.empty) return porCampo.docs[0].data() || null;
    const porId = await db().collection('users').doc(identidad).get();
    const d = porId.data();
    return porId.exists && d?.uid === identidad ? d : null;
  };

  /** ¿Es esta identidad de esta cuenta? Lo decide el resolutor canónico (`cuentaDeIdentidad`), leyendo, sin deducir. */
  const esDeLaCuenta = async (identidad: string, cuenta: string): Promise<boolean> =>
    cuentaDeIdentidad(identidad, (await perfilDe(identidad)) as PerfilDeIdentidad | null) === cuenta;

  /** Las identidades de una cuenta: su Perfil Real y, si existe y está bien enlazado, su Perfil Weë. */
  const identidadesDe = async (cuenta: string): Promise<string[]> => {
    const out = [cuenta];
    const caras = await db().collection('users').where('linkedAccountId', '==', cuenta).limit(5).get();
    for (const d of caras.docs) {
      const datos = (d.data() || {}) as PerfilDeIdentidad;
      if (typeof datos.uid === 'string' && datos.uid !== cuenta && cuentaDeIdentidad(datos.uid, datos) === cuenta) out.push(datos.uid);
    }
    return [...new Set(out)];
  };

  const leerPost = async (postId: string): Promise<Record<string, any> | null> => {
    const snap = await db().collection('posts').doc(postId).get();
    return snap.exists ? { id: snap.id, ...(snap.data() || {}) } : null;
  };

  /** La publicación, si es de esta cuenta y se puede promocionar. Si no, el motivo exacto. */
  const publicacionPropia = async (postId: string, cuenta: string) => {
    const post = await leerPost(postId);
    if (!post) throw new BoostError('publicacion');
    if (typeof post.userId !== 'string' || !(await esDeLaCuenta(post.userId, cuenta))) throw new BoostError('ajena');
    if (!esPromocionable(post)) throw new BoostError('no-promocionable');
    return post;
  };

  const leerCampana = async (id: string): Promise<Campana | null> => {
    const snap = await campanas().doc(id).get();
    return snap.exists ? ({ ...(snap.data() as Campana), id: snap.id }) : null;
  };

  // ── Configuración y presupuesto ────────────────────────────────────────
  /** Lo que la pantalla necesita para pintar las opciones. El saldo, solo leído (`readBalance` no escribe). */
  const opciones = async (cuenta: string) => {
    const config = await deps.config();
    let saldo: number | null = null;
    try {
      const b = await deps.creditos.readBalance(cuenta);
      saldo = b.balance;
    } catch {
      saldo = null;
    }
    return {
      enabled: config.enabled,
      serviceReady: deps.servicioRegistrado(),
      durations: config.durations,
      budgets: presupuestosPosibles(config),
      minBudget: config.minBudget,
      maxBudget: config.maxBudget,
      budgetStep: config.budgetStep,
      objectives: ['reach', 'interaction'],
      segments: [...SEGMENTOS],
      segmentsWithCountry: [...SEGMENTOS_CON_PAIS],
      balance: saldo,
    };
  };

  /**
   * LA ESTIMACIÓN. No es alcance: es cuántas cuentas cumplen HOY el público elegido, contadas con datos reales. Si no
   * se puede contar, `null`, y la pantalla dice que no hay estimación. Nunca se multiplica por nada.
   */
  const estimar = async (cuenta: string, datos: Record<string, unknown>) => {
    const config = await deps.config();
    const p = validarPeticion({ ...datos, requestId: 'estimacion00' }, config);
    const post = await publicacionPropia(p.postId, cuenta);
    const communityId = typeof post.communityId === 'string' && post.communityId ? post.communityId : null;
    if (p.segment === 'community' && !communityId) throw new BoostError('sin-comunidad');
    const consumoPorDia = Math.floor(p.budgetCredits / p.durationDays);
    let audiencia: AudienciaPotencial = { cuentas: null, tope: false };
    if (deps.contarAudiencia) {
      try {
        audiencia = await deps.contarAudiencia({ segment: p.segment, country: p.country, communityId, identityId: post.userId, ownerAccountId: cuenta });
      } catch {
        audiencia = { cuentas: null, tope: false };
      }
    }
    return { budgetCredits: p.budgetCredits, durationDays: p.durationDays, dailyCredits: consumoPorDia, audience: audiencia };
  };

  // ── Crear: reservar y abrir ────────────────────────────────────────────
  const crear = async (cuenta: string, datos: unknown) => {
    const config = await deps.config();
    if (!config.enabled) throw new BoostError('cerrado');
    if (!deps.servicioRegistrado()) throw new BoostError('servicio-pendiente');
    const p: PeticionDeBoost = validarPeticion(datos, config);
    const id = idDeCampana(p.requestId);
    const huella = huellaDe(cuenta, p);

    /* Un reintento de una campaña ya creada: la misma, sin volver a cobrar. Con otra huella, conflicto. */
    const previa = await leerCampana(id);
    if (previa) {
      if (previa.ownerAccountId !== cuenta || previa.fingerprint !== huella) throw new BoostError('conflicto');
      return { campaign: vistaDeCampana(previa, deps.ahora()), duplicate: true };
    }

    const post = await publicacionPropia(p.postId, cuenta);
    const communityId = typeof post.communityId === 'string' && post.communityId ? post.communityId : null;
    if (p.segment === 'community' && !communityId) throw new BoostError('sin-comunidad');

    /* Antes de reservar: si la publicación ya tiene una campaña viva, no se cobra nada. */
    const bloqueo = await bloqueos().doc(p.postId).get();
    const viva = bloqueo.data()?.activeCampaignId;
    if (typeof viva === 'string' && viva !== id) {
      const otra = await leerCampana(viva);
      if (otra && otra.status !== 'ended') throw new BoostError('ya-promocionada');
    }

    /* RESERVA. El importe es el presupuesto validado arriba; el cliente no manda ningún total. */
    let reserva;
    try {
      reserva = await deps.creditos.spendCredits({
        userId: cuenta,
        service: SERVICIO_DE_CREDITS,
        requestId: id,
        amount: p.budgetCredits,
        reason: 'Boost de una publicación',
        source: 'boost',
        fingerprint: huella,
        meta: { campaignId: id, postId: p.postId, durationDays: p.durationDays },
      });
    } catch (e) {
      throw motivoDeCredits(e);
    }

    const ahora = deps.ahora();
    const campana: Campana = {
      id,
      ownerAccountId: cuenta,
      identityId: post.userId,
      postId: p.postId,
      objective: p.objective,
      audience: { segment: p.segment, country: p.country, communityId: p.segment === 'community' ? communityId : null },
      budgetCredits: p.budgetCredits,
      durationDays: p.durationDays,
      creditService: SERVICIO_DE_CREDITS,
      requestId: p.requestId,
      fingerprint: huella,
      status: 'active',
      createdAt: ahora,
      startsAt: ahora,
      endsAt: ahora + p.durationDays * DIA_MS,
      preview: vistaPrevia(post),
      metrics: { impressions: 0, reach: 0, clicks: 0, byDay: {} },
    };

    let resultado: { campaign: Campana; duplicate: boolean };
    try {
      resultado = await db().runTransaction(async (tx) => {
        const ref = campanas().doc(id);
        const ya = await tx.get(ref);
        if (ya.exists) return { campaign: { ...(ya.data() as Campana), id }, duplicate: true };
        const lockRef = bloqueos().doc(p.postId);
        const lock = await tx.get(lockRef);
        const otraId = lock.data()?.activeCampaignId;
        if (typeof otraId === 'string' && otraId !== id) {
          const otra = await tx.get(campanas().doc(otraId));
          if (otra.exists && (otra.data() || {}).status !== 'ended') throw new BoostError('ya-promocionada');
        }
        tx.set(ref, campana as unknown as Record<string, unknown>);
        tx.set(lockRef, { postId: p.postId, activeCampaignId: id, ownerAccountId: cuenta, updatedAt: ahora });
        return { campaign: campana, duplicate: false };
      });
    } catch (e) {
      /* Se reservó y no se pudo abrir: se devuelve todo. `refundCredits` es idempotente. */
      await deps.creditos.refundCredits({ userId: cuenta, requestId: id, reason: 'Boost no iniciado', source: 'boost' }).catch(() => undefined);
      throw e instanceof BoostError ? e : new BoostError('interno');
    }
    return { campaign: vistaDeCampana(resultado.campaign, deps.ahora()), duplicate: resultado.duplicate || reserva.duplicate, balanceAfter: reserva.balanceAfter };
  };

  // ── Terminar: congelar, liquidar, cerrar ───────────────────────────────
  /**
   * Primero se CONGELA en una transacción (`settling` + lo consumido), así un reintento liquida el mismo número.
   * Después se llama al Credit Engine; si falla, la campaña se queda en `settling` y el barrido lo reintenta.
   */
  const congelar = async (id: string, motivo: MotivoDeFin, quien?: string): Promise<Campana> => {
    const ahora = deps.ahora();
    return db().runTransaction(async (tx) => {
      const ref = campanas().doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new BoostError('no-existe');
      const c = { ...(snap.data() as Campana), id };
      if (quien !== undefined && c.ownerAccountId !== quien) throw new BoostError('no-existe');
      if (c.status !== 'active') return c;
      const { consumido, diasConEntrega } = consumoDe(c.budgetCredits, c.durationDays, c.metrics?.byDay);
      const settlement = { consumed: consumido, refunded: c.budgetCredits - consumido, deliveredDays: diasConEntrega, reason: motivo, frozenAt: ahora };
      tx.update(ref, { status: 'settling', settlement, endedReason: motivo, endedAt: Math.min(ahora, c.endsAt) });
      return { ...c, status: 'settling', settlement, endedReason: motivo, endedAt: Math.min(ahora, c.endsAt) } as Campana;
    });
  };

  const liquidar = async (c: Campana): Promise<Campana> => {
    if (c.status !== 'settling' || !c.settlement) return c;
    try {
      if (c.settlement.consumed > 0) {
        await deps.creditos.completeCredits({ userId: c.ownerAccountId, requestId: c.id, finalAmount: c.settlement.consumed, meta: { campaignId: c.id, deliveredDays: c.settlement.deliveredDays } });
      } else {
        await deps.creditos.refundCredits({ userId: c.ownerAccountId, requestId: c.id, reason: 'Boost sin entregas · se devolvió todo', source: 'boost' });
      }
    } catch {
      return c; // se queda en `settling`; el barrido lo reintenta con el mismo número
    }
    const ahora = deps.ahora();
    return db().runTransaction(async (tx) => {
      const ref = campanas().doc(c.id);
      const snap = await tx.get(ref);
      const actual = { ...(snap.data() as Campana), id: c.id };
      if (actual.status !== 'settling') return actual;
      /* Firestore exige leer todo antes de escribir dentro de una transacción. */
      const lockRef = bloqueos().doc(actual.postId);
      const lock = await tx.get(lockRef);
      const settlement = { ...(actual.settlement as NonNullable<Campana['settlement']>), settledAt: ahora };
      tx.update(ref, { status: 'ended', settlement });
      if (lock.exists && (lock.data() || {}).activeCampaignId === c.id) tx.set(lockRef, { postId: actual.postId, activeCampaignId: null, updatedAt: ahora });
      return { ...actual, status: 'ended', settlement } as Campana;
    });
  };

  const terminar = async (cuenta: string, datos: unknown) => {
    const id = typeof (datos as { campaignId?: unknown })?.campaignId === 'string' ? (datos as { campaignId: string }).campaignId : '';
    if (!/^bst_[A-Za-z0-9_-]{8,64}$/.test(id)) throw new BoostError('no-existe');
    const actual = await leerCampana(id);
    if (!actual || actual.ownerAccountId !== cuenta) throw new BoostError('no-existe');
    if (actual.status === 'ended') return { campaign: vistaDeCampana(actual, deps.ahora()) };
    const congelada = await congelar(id, deps.ahora() >= actual.endsAt ? 'completed' : 'cancelled', cuenta);
    const final = await liquidar(congelada);
    return { campaign: vistaDeCampana(final, deps.ahora()) };
  };

  // ── Consultar (solo lo propio) ─────────────────────────────────────────
  const listar = async (cuenta: string) => {
    const snap = await campanas().where('ownerAccountId', '==', cuenta).limit(100).get();
    const ahora = deps.ahora();
    const lista = snap.docs.map((d) => ({ ...(d.data() as Campana), id: d.id })).sort((a, b) => b.createdAt - a.createdAt);
    return { campaigns: lista.map((c) => vistaDeCampana(c, ahora)) };
  };

  const detalle = async (cuenta: string, datos: unknown) => {
    const id = typeof (datos as { campaignId?: unknown })?.campaignId === 'string' ? (datos as { campaignId: string }).campaignId : '';
    const c = id ? await leerCampana(id) : null;
    /* La campaña de otra cuenta no existe para ti: mismo error, nada que distinguir. */
    if (!c || c.ownerAccountId !== cuenta) throw new BoostError('no-existe');
    return { campaign: vistaDeCampana(c, deps.ahora()) };
  };

  /** Las publicaciones que esta cuenta puede promocionar: de su Perfil Real y de su Perfil Weë. */
  const misPublicaciones = async (cuenta: string) => {
    const ids = await identidadesDe(cuenta);
    const filas: Array<Record<string, any>> = [];
    for (const identidad of ids) {
      const snap = await db().collection('posts').where('userId', '==', identidad).orderBy('createdAt', 'desc').limit(30).get();
      for (const d of snap.docs) filas.push({ id: d.id, ...(d.data() || {}) });
    }
    const posts = filas
      .filter((p) => esPromocionable(p))
      .sort((a, b) => ms(b.createdAt) - ms(a.createdAt))
      .slice(0, 40)
      .map((p) => ({
        id: p.id as string,
        identityId: p.userId as string,
        identityKind: p.userId === cuenta ? 'real' : 'wee',
        createdAt: ms(p.createdAt),
        hasCommunity: typeof p.communityId === 'string' && p.communityId.length > 0,
        ...vistaPrevia(p),
      }));
    return { posts };
  };

  // ── Servir: la distribución dentro de Weë ──────────────────────────────
  /** ¿Es esta cuenta público de esta campaña? Con datos guardados y declarados; nada se deduce de la IP ni del GPS. */
  const esPublico = async (c: Campana, viewer: string, perfilViewer: Record<string, any> | null, identidadesViewer: string[]): Promise<boolean> => {
    if (c.ownerAccountId === viewer) return false;
    const pais = typeof perfilViewer?.country === 'string' ? perfilViewer.country : null;
    if (c.audience.country && pais !== c.audience.country) return false;
    if (c.audience.segment === 'everyone') return true;
    if (c.audience.segment === 'community') {
      const comunidades = Array.isArray(perfilViewer?.joinedCommunities) ? perfilViewer!.joinedCommunities : [];
      return !!c.audience.communityId && comunidades.includes(c.audience.communityId);
    }
    /* contacts: un ËContact ACEPTADO entre la identidad que publicó y alguna identidad del que mira. */
    for (const yo of identidadesViewer) {
      let pareja: string;
      try {
        pareja = idDeContacto(c.identityId, yo);
      } catch {
        continue; // no es una pareja posible (la misma identidad, o una que no es de persona)
      }
      const snap = await db().collection('econtacts').doc(pareja).get();
      if (snap.exists && (snap.data() || {}).status === 'accepted') return true;
    }
    return false;
  };

  const servir = async (viewer: string) => {
    const config = await deps.config();
    if (!config.enabled) return { promoted: null };
    const ahora = deps.ahora();
    const snap = await campanas().where('status', '==', 'active').limit(config.serveScan).get();
    const vivas = snap.docs
      .map((d) => ({ ...(d.data() as Campana), id: d.id }))
      .filter((c) => c.endsAt > ahora && c.ownerAccountId !== viewer)
      .sort((a, b) => num(a.metrics?.impressions) - num(b.metrics?.impressions));
    if (vivas.length === 0) return { promoted: null };
    const perfilViewer = await perfilDe(viewer);
    const identidadesViewer = await identidadesDe(viewer);
    for (const c of vivas) {
      const dia = diaDeCampana(c.startsAt, ahora);
      if (dia >= c.durationDays) continue;
      const marca = `${viewer}_${dia}`;
      if ((await entregas(c.id).doc(marca).get()).exists) continue; // una vez por cuenta y día
      if (!(await esPublico(c, viewer, perfilViewer, identidadesViewer))) continue;
      const post = await leerPost(c.postId);
      if (!esPromocionable(post)) continue; // el barrido la cerrará como `post_unavailable`
      const servida = await db().runTransaction(async (tx: CreditTx) => {
        const ref = campanas().doc(c.id);
        const actual = await tx.get(ref);
        const datos = (actual.data() || {}) as Campana;
        if (!actual.exists || datos.status !== 'active' || datos.endsAt <= ahora) return false;
        const entrega = await tx.get(entregas(c.id).doc(marca));
        if (entrega.exists) return false;
        const visto = await tx.get(alcance(c.id).doc(viewer));
        const m = datos.metrics || { impressions: 0, reach: 0, clicks: 0, byDay: {} };
        const byDay = { ...(m.byDay || {}) };
        byDay[String(dia)] = num(byDay[String(dia)]) + 1;
        tx.set(entregas(c.id).doc(marca), { viewer, day: dia, at: ahora });
        if (!visto.exists) tx.set(alcance(c.id).doc(viewer), { firstAt: ahora });
        tx.update(ref, { metrics: { impressions: num(m.impressions) + 1, reach: num(m.reach) + (visto.exists ? 0 : 1), clicks: num(m.clicks), byDay } });
        return true;
      });
      if (!servida) continue;
      /* Las fechas viajan en milisegundos: un Timestamp no sobrevive a la callable. */
      return { promoted: { campaignId: c.id, post: { ...post, id: c.postId, createdAt: ms(post!.createdAt), updatedAt: ms(post!.updatedAt) } } };
    }
    return { promoted: null };
  };

  /** Quien vio la publicación promocionada la abrió. Solo cuenta si de verdad se le sirvió, y una vez por cuenta. */
  const interaccion = async (viewer: string, datos: unknown) => {
    const id = typeof (datos as { campaignId?: unknown })?.campaignId === 'string' ? (datos as { campaignId: string }).campaignId : '';
    if (!/^bst_[A-Za-z0-9_-]{8,64}$/.test(id)) throw new BoostError('no-existe');
    return db().runTransaction(async (tx) => {
      const ref = campanas().doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new BoostError('no-existe');
      const visto = await tx.get(alcance(id).doc(viewer));
      if (!visto.exists) return { counted: false };
      const clic = await tx.get(clics(id).doc(viewer));
      if (clic.exists) return { counted: false };
      const m = ((snap.data() || {}) as Campana).metrics || { impressions: 0, reach: 0, clicks: 0, byDay: {} };
      tx.set(clics(id).doc(viewer), { at: deps.ahora() });
      tx.update(ref, { metrics: { ...m, clicks: num(m.clicks) + 1 } });
      return { counted: true };
    });
  };

  // ── Barrido programado ─────────────────────────────────────────────────
  /**
   * Cierra lo vencido, cierra lo que perdió su publicación, reintenta lo que se quedó en `settling` y devuelve las
   * reservas huérfanas (se reservó y el proceso murió antes de crear la campaña).
   */
  const barrer = async (opciones: { huerfanaMs?: number } = {}) => {
    const ahora = deps.ahora();
    const informe = { cerradas: 0, liquidadas: 0, huerfanas: 0, pendientes: 0 };
    const activas = await campanas().where('status', '==', 'active').limit(200).get();
    for (const d of activas.docs) {
      const c = { ...(d.data() as Campana), id: d.id };
      let motivo: MotivoDeFin | null = null;
      if (c.endsAt <= ahora) motivo = 'completed';
      else if (!esPromocionable(await leerPost(c.postId))) motivo = 'post_unavailable';
      if (!motivo) continue;
      const final = await liquidar(await congelar(c.id, motivo));
      informe.cerradas++;
      if (final.status !== 'ended') informe.pendientes++;
    }
    const colgadas = await campanas().where('status', '==', 'settling').limit(200).get();
    for (const d of colgadas.docs) {
      const final = await liquidar({ ...(d.data() as Campana), id: d.id });
      if (final.status === 'ended') informe.liquidadas++;
      else informe.pendientes++;
    }
    const limite = opciones.huerfanaMs ?? 15 * 60 * 1000;
    const reservas = await db().collection('creditTransactions').where('source', '==', 'boost').where('status', '==', 'AUTHORIZED').limit(200).get();
    for (const r of reservas.docs) {
      const t = r.data() || {};
      const rid = typeof t.requestId === 'string' ? t.requestId : '';
      if (!rid.startsWith('bst_') || ahora - ms(t.createdAt) < limite) continue;
      if ((await campanas().doc(rid).get()).exists) continue;
      try {
        await deps.creditos.refundCredits({ userId: String(t.userId), requestId: rid, reason: 'Boost no iniciado', source: 'boost' });
        informe.huerfanas++;
      } catch {
        informe.pendientes++;
      }
    }
    return informe;
  };

  return { opciones, estimar, crear, terminar, listar, detalle, misPublicaciones, servir, interaccion, barrer, _identidadesDe: identidadesDe };
}

export type BoostEngine = ReturnType<typeof createBoostEngine>;
