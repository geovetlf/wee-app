/*
 * COMUNIDADES — el servidor. Crear, unirse, salir, administrar y transferir, POR IDENTIDAD.
 * ---------------------------------------------------------------------------
 *
 * Decisiones del dueño (2026-11-05, docs/COMUNIDADES-IDENTIDAD.md):
 *
 *   1 · La membresía, los papeles y la propiedad son de una IDENTIDAD concreta —Perfil Real o Perfil Weë—, no de la
 *       cuenta. Una misma cuenta puede estar en una comunidad con sus dos caras, como dos membresías independientes, y
 *       ninguna hereda los permisos de la otra.
 *   2 · El documento público de la comunidad solo lleva la referencia PÚBLICA del perfil creador y del dueño
 *       (`entityId`, `ent_…`, utils/identidadPublica.ts) y su tipo (real/wee). La cuenta que hay detrás y el `uid`
 *       del perfil van en `communities/{id}/private/ownership`, que solo lee y escribe el servidor.
 *   3 · Nada de esto lo escribe el cliente: las reglas lo cierran y todo pasa por estas callables, con el patrón de
 *       `social/econtact.ts`: Firestore inyectado, la identidad comprobada contra `users` con `cuentaDeIdentidad`,
 *       transacciones e idempotencia.
 *
 * LO HEREDADO NO SE REESCRIBE
 * ---------------------------
 * Las comunidades de antes llevan `createdBy` (la cuenta) y `moderators` (cuentas) en el documento público, y sus
 * miembros en `members/{uid del perfil}` sin papel. Se siguen leyendo tal cual: `createdBy` conserva su significado y
 * no se toca; un miembro heredado es `member` (nunca se deduce de `createdBy` que una cara concreta sea la dueña, porque
 * la app escribía la cuenta aunque se creara desde el Perfil Weë). Una comunidad heredada no tiene dueño por identidad
 * hasta que la cuenta que la creó lo RECLAMA eligiendo con qué cara (`claimLegacyCommunity`): es una decisión de la
 * persona, no algo que se invente aquí.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { cuentaDeIdentidad, decidirIdentidad, esIdentidadDePersona, tipoDeIdentidad, PerfilDeIdentidad, TipoDeIdentidad } from './econtact';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

export const COMUNIDADES = 'communities';
export const SLUGS = 'communitySlugs';
export const OPERACIONES = 'communityOperations';
const PERFILES = 'users';

/** Lo que distingue a una comunidad gobernada por identidad de una heredada. */
export const GOBIERNO_POR_IDENTIDAD = 'identity';

/** Los slugs de las oficiales (firestore.rules `slugsOficiales()`): nadie más los toma. */
export const SLUGS_OFICIALES = ['cine-animacion', 'arte-creatividad', 'creadores-influencers', 'negocios-emprendimiento',
  'tecnologia-ia', 'gaming-mundos-virtuales', 'educacion-aprendizaje', 'futuro-sociedad'] as const;

// ─── Papeles ─────────────────────────────────────────────────────────────────

export const PAPELES = ['owner', 'admin', 'moderator', 'member'] as const;
export type Papel = (typeof PAPELES)[number];
const RANGO: Record<Papel, number> = { owner: 3, admin: 2, moderator: 1, member: 0 };
export const esPapel = (v: unknown): v is Papel => typeof v === 'string' && (PAPELES as readonly string[]).includes(v);

/**
 * El papel de una identidad según su documento de `members`. null = no es miembro. Un documento heredado (sin `role`)
 * es `member`: nunca se asciende a nadie por lo que diga `createdBy`.
 */
export const papelDelMiembro = (doc: { role?: unknown } | null | undefined): Papel | null => {
  if (!doc || typeof doc !== 'object') return null;
  return esPapel(doc.role) ? doc.role : 'member';
};

// ─── Qué puede salir mal ─────────────────────────────────────────────────────

export type MotivoComunidad =
  | 'identidad-invalida'
  | 'identidad-desconocida'
  | 'identidad-ajena'
  | 'datos-invalidos'
  | 'nombre-reservado'
  | 'ya-existe'
  | 'no-existe'
  | 'no-activa'
  | 'no-es-miembro'
  | 'sin-permiso'
  | 'usa-transferencia'
  | 'usa-salir'
  | 'no-al-dueno'
  | 'dueno-debe-transferir'
  | 'ya-eres-dueno'
  | 'comunidad-heredada'
  | 'comunidad-oficial'
  | 'ya-tiene-dueno'
  | 'no-la-creaste'
  | 'operacion-de-otra-identidad';

const CODIGOS: Record<MotivoComunidad, 'not-found' | 'failed-precondition' | 'permission-denied' | 'invalid-argument' | 'already-exists'> = {
  'identidad-invalida': 'invalid-argument',
  'identidad-desconocida': 'not-found',
  'identidad-ajena': 'permission-denied',
  'datos-invalidos': 'invalid-argument',
  'nombre-reservado': 'permission-denied',
  'ya-existe': 'already-exists',
  'no-existe': 'not-found',
  'no-activa': 'failed-precondition',
  'no-es-miembro': 'failed-precondition',
  'sin-permiso': 'permission-denied',
  'usa-transferencia': 'invalid-argument',
  'usa-salir': 'invalid-argument',
  'no-al-dueno': 'permission-denied',
  'dueno-debe-transferir': 'failed-precondition',
  'ya-eres-dueno': 'failed-precondition',
  'comunidad-heredada': 'failed-precondition',
  'comunidad-oficial': 'permission-denied',
  'ya-tiene-dueno': 'failed-precondition',
  'no-la-creaste': 'permission-denied',
  'operacion-de-otra-identidad': 'permission-denied',
};

export class ComunidadError extends Error {
  constructor(public motivo: MotivoComunidad) {
    /* El mensaje ES el código: la app lo traduce con su diccionario (services/comunidadesService.ts). */
    super(motivo);
    this.name = 'ComunidadError';
  }
}

export type Decision = { ok: true } | { ok: false; motivo: MotivoComunidad };
const NO = (motivo: MotivoComunidad): Decision => ({ ok: false, motivo });
const SI: Decision = { ok: true };

// ─── Las decisiones, sin Firestore de por medio ──────────────────────────────

/** Cambiar el papel de OTRA identidad. Ser dueño solo se consigue por transferencia. */
export const decidirCambioDePapel = (a: { actor: Papel | null; objetivo: Papel | null; nuevo: unknown; mismaIdentidad: boolean }): Decision => {
  if (!a.actor) return NO('no-es-miembro');
  if (!esPapel(a.nuevo)) return NO('datos-invalidos');
  if (a.nuevo === 'owner') return NO('usa-transferencia');
  if (a.mismaIdentidad) return NO('sin-permiso');
  if (!a.objetivo) return NO('no-es-miembro');
  if (a.objetivo === 'owner') return NO('no-al-dueno');
  if (a.actor === 'owner') return SI;
  /* Un admin gestiona solo lo que está por debajo de admin, y no asciende a nadie a admin. */
  if (a.actor === 'admin' && RANGO[a.objetivo] < RANGO.admin && RANGO[a.nuevo] < RANGO.admin) return SI;
  return NO('sin-permiso');
};

/** Sacar a OTRA identidad. Solo quien está por encima, y como mínimo moderador. */
export const decidirExpulsion = (a: { actor: Papel | null; objetivo: Papel | null; mismaIdentidad: boolean }): Decision => {
  if (!a.actor) return NO('no-es-miembro');
  if (a.mismaIdentidad) return NO('usa-salir');
  if (!a.objetivo) return NO('no-es-miembro');
  if (a.objetivo === 'owner') return NO('no-al-dueno');
  if (RANGO[a.actor] >= RANGO.moderator && RANGO[a.actor] > RANGO[a.objetivo]) return SI;
  return NO('sin-permiso');
};

/** Salir. El dueño no se va sin dejar la comunidad en otras manos. */
export const decidirSalida = (papel: Papel | null): Decision => (papel === 'owner' ? NO('dueno-debe-transferir') : SI);

/** Transferir la propiedad a otra identidad que ya es miembro. */
export const decidirTransferencia = (a: { actor: Papel | null; objetivo: Papel | null; mismaIdentidad: boolean }): Decision => {
  if (!a.actor) return NO('no-es-miembro');
  if (a.actor !== 'owner') return NO('sin-permiso');
  if (a.mismaIdentidad) return NO('ya-eres-dueno');
  if (!a.objetivo) return NO('no-es-miembro');
  return SI;
};

/** Editar nombre, descripción, icono y normas. */
export const decidirEdicion = (actor: Papel | null): Decision => {
  if (!actor) return NO('no-es-miembro');
  return actor === 'owner' || actor === 'admin' ? SI : NO('sin-permiso');
};

/** ¿Se puede administrar esta comunidad por identidad? Las oficiales son de Weë; las heredadas, hasta que se reclamen, no. */
export const decidirGobierno = (comunidad: { isOfficial?: unknown; governance?: unknown } | null): Decision => {
  if (!comunidad) return NO('no-existe');
  if (comunidad.isOfficial === true) return NO('comunidad-oficial');
  if (comunidad.governance !== GOBIERNO_POR_IDENTIDAD) return NO('comunidad-heredada');
  return SI;
};

// ─── Datos de entrada ────────────────────────────────────────────────────────

const LIMITES = { nombre: 60, descripcion: 500, regla: 200, reglas: 10 } as const;
const ICONO = /^[a-z0-9-]{1,40}$/;
const PETICION = /^[A-Za-z0-9_-]{8,64}$/;

/** El slug, con el mismo algoritmo que usaba la app (services/communityService.ts). */
export const slugDe = (nombre: string): string => nombre
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const textoOpcional = (v: unknown, max: number): string => {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw new ComunidadError('datos-invalidos');
  const t = v.trim();
  if (t.length > max) throw new ComunidadError('datos-invalidos');
  return t;
};

export interface ComunidadDeEntrada { name?: unknown; description?: unknown; icon?: unknown; rules?: unknown }
export interface ComunidadLimpia { name: string; slug: string; description: string; icon: string; rules: { id: string; text: string; order: number }[] }

export const validarComunidad = (e: ComunidadDeEntrada): ComunidadLimpia => {
  const name = textoOpcional(e.name, LIMITES.nombre);
  if (!name) throw new ComunidadError('datos-invalidos');
  const slug = slugDe(name);
  if (!slug) throw new ComunidadError('datos-invalidos');
  const description = textoOpcional(e.description, LIMITES.descripcion);
  const icon = e.icon === undefined || e.icon === null || e.icon === '' ? 'people' : e.icon;
  if (typeof icon !== 'string' || !ICONO.test(icon)) throw new ComunidadError('datos-invalidos');
  const crudas = e.rules === undefined || e.rules === null ? [] : e.rules;
  if (!Array.isArray(crudas) || crudas.length > LIMITES.reglas) throw new ComunidadError('datos-invalidos');
  const rules = crudas.map((r) => textoOpcional(r, LIMITES.regla)).filter(Boolean)
    .map((text, i) => ({ id: String(i + 1), text, order: i + 1 }));
  return { name, slug, description, icon, rules };
};

export const esPeticionValida = (v: unknown): v is string => typeof v === 'string' && PETICION.test(v);

/** La clave de una operación idempotente: de la CUENTA y su petición, sin enseñar ninguna de las dos. */
export const claveDeOperacion = (cuenta: string, peticion: string): string =>
  createHash('sha256').update(`${cuenta}\u0000${peticion}`).digest('hex');

/** La referencia pública de un perfil: su entidad, o nada. NUNCA el `uid` (que es la cuenta, o la lleva dentro). */
const ENTIDAD = /^ent_[0-9abcdefghjkmnpqrstvwxyz]{26}$/;
export const referenciaPublicaSegura = (perfil: { entityId?: unknown } | null | undefined): string | null =>
  perfil && typeof perfil.entityId === 'string' && ENTIDAD.test(perfil.entityId) ? perfil.entityId : null;

export interface PerfilPublico { ref: string | null; type: TipoDeIdentidad }

// ─── El motor, con Firestore inyectado ───────────────────────────────────────

export interface ComunidadesDeps {
  db: () => any;
  ahora: () => number;
  sello: (ms: number) => unknown;
  /** Sumar/restar/añadir a una lista: FieldValue en producción. */
  unirALista: (v: string) => unknown;
  quitarDeLista: (v: string) => unknown;
}

export interface IdentidadComprobada {
  identity: string;
  accountUid: string;
  type: TipoDeIdentidad;
  publico: PerfilPublico;
  perfilRef: any;
}

const PERFIL_DATOS = (d: any): PerfilDeIdentidad & { entityId?: unknown } => (d || {}) as PerfilDeIdentidad & { entityId?: unknown };

export const createComunidadesEngine = (deps: ComunidadesDeps) => {
  const perfilesDe = (identidad: string) => deps.db().collection(PERFILES).where('uid', '==', identidad).limit(1);

  /** Comprueba contra `users` que la identidad existe, de qué cuenta es y, si `debeSerMia`, que es de la sesión. */
  const resolver = async (identidad: unknown, cuentaDeLaSesion: string, debeSerMia: boolean): Promise<IdentidadComprobada> => {
    if (!esIdentidadDePersona(identidad as string)) throw new ComunidadError('identidad-invalida');
    const snap = await perfilesDe(identidad as string).get();
    const doc = snap.empty ? null : snap.docs[0];
    const perfil = doc ? PERFIL_DATOS(doc.data()) : null;
    const decision = decidirIdentidad({ identidad, perfil, cuentaDeLaSesion, debeSerMia });
    if (!decision.ok) throw new ComunidadError(decision.motivo as MotivoComunidad);
    const type = tipoDeIdentidad(identidad as string);
    return {
      identity: identidad as string,
      accountUid: cuentaDeIdentidad(identidad as string, perfil) as string,
      type,
      publico: { ref: referenciaPublicaSegura(perfil), type },
      perfilRef: doc!.ref,
    };
  };

  const refs = (communityId: string) => {
    const db = deps.db();
    const comunidad = db.collection(COMUNIDADES).doc(communityId);
    return {
      db,
      comunidad,
      propiedad: comunidad.collection('private').doc('ownership'),
      miembro: (identidad: string) => comunidad.collection('members').doc(identidad),
    };
  };

  const idValido = (v: unknown): string => {
    if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(v)) throw new ComunidadError('datos-invalidos');
    return v;
  };

  const cuentaDe = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

  return {
    resolver,

    /**
     * Crear. UNA transacción: la comunidad (1 miembro), su propiedad privada, la membresía de dueño de la identidad que
     * crea, la reserva del slug, la operación idempotente y la lista del perfil. Repetir la misma petición devuelve la
     * misma comunidad; nunca deja dos, ni tres miembros.
     */
    crear: async (a: { cuentaDeLaSesion: string; comoIdentidad: unknown; peticion: unknown; datos: ComunidadDeEntrada }) => {
      if (!esPeticionValida(a.peticion)) throw new ComunidadError('datos-invalidos');
      const limpia = validarComunidad(a.datos || {});
      if ((SLUGS_OFICIALES as readonly string[]).includes(limpia.slug)) throw new ComunidadError('nombre-reservado');
      const yo = await resolver(a.comoIdentidad, a.cuentaDeLaSesion, true);

      const db = deps.db();
      const opRef = db.collection(OPERACIONES).doc(claveDeOperacion(yo.accountUid, a.peticion));
      const slugRef = db.collection(SLUGS).doc(limpia.slug);
      const heredadaConEseSlug = db.collection(COMUNIDADES).where('slug', '==', limpia.slug).limit(1);

      return db.runTransaction(async (tx: any) => {
        const op = await tx.get(opRef);
        if (op.exists) {
          const d = op.data() || {};
          if (d.identity !== yo.identity) throw new ComunidadError('operacion-de-otra-identidad');
          return { communityId: d.communityId as string, slug: d.slug as string, role: 'owner' as Papel, repetida: true };
        }
        const [slug, heredada] = [await tx.get(slugRef), await tx.get(heredadaConEseSlug)];
        if (slug.exists || !heredada.empty) throw new ComunidadError('ya-existe');

        const comunidadRef = db.collection(COMUNIDADES).doc();
        const r = refs(comunidadRef.id);
        const t = deps.sello(deps.ahora());
        tx.create(comunidadRef, {
          name: limpia.name,
          slug: limpia.slug,
          description: limpia.description,
          icon: limpia.icon,
          rules: limpia.rules,
          memberCount: 1,
          postCount: 0,
          isOfficial: false,
          status: 'active',
          /* Sin cuentas en lo público: ni `createdBy` ni moderadores por uid. Lo dice la identidad pública. */
          moderators: [],
          governance: GOBIERNO_POR_IDENTIDAD,
          creatorProfile: yo.publico,
          ownerProfile: yo.publico,
          createdAt: t,
          updatedAt: t,
        });
        tx.create(r.propiedad, {
          creatorIdentity: yo.identity, creatorAccountId: yo.accountUid,
          ownerIdentity: yo.identity, ownerAccountId: yo.accountUid,
          history: [], createdAt: t, updatedAt: t,
        });
        tx.create(r.miembro(yo.identity), {
          userId: yo.identity, identityType: yo.type, accountId: yo.accountUid, role: 'owner',
          joinedAt: t, postCount: 0, reputation: 0,
        });
        tx.create(slugRef, { communityId: comunidadRef.id, createdAt: t });
        tx.create(opRef, { communityId: comunidadRef.id, slug: limpia.slug, identity: yo.identity, createdAt: t });
        tx.update(yo.perfilRef, { joinedCommunities: deps.unirALista(comunidadRef.id) });
        return { communityId: comunidadRef.id as string, slug: limpia.slug, role: 'owner' as Papel, repetida: false };
      });
    },

    /** Unirse con UNA identidad. Idempotente: si ya es miembro no cuenta dos veces. */
    unirse: async (a: { cuentaDeLaSesion: string; comoIdentidad: unknown; communityId: unknown }) => {
      const id = idValido(a.communityId);
      const yo = await resolver(a.comoIdentidad, a.cuentaDeLaSesion, true);
      const r = refs(id);
      return r.db.runTransaction(async (tx: any) => {
        const [c, m] = [await tx.get(r.comunidad), await tx.get(r.miembro(yo.identity))];
        if (!c.exists) throw new ComunidadError('no-existe');
        const datos = c.data() || {};
        if (datos.status !== 'active') throw new ComunidadError('no-activa');
        if (m.exists) {
          /* Ya dentro (también una membresía heredada): se asegura la lista del perfil y no se cuenta otra vez. */
          tx.update(yo.perfilRef, { joinedCommunities: deps.unirALista(id) });
          return { communityId: id, role: papelDelMiembro(m.data()) as Papel, memberCount: cuentaDe(datos.memberCount), yaEra: true };
        }
        const t = deps.sello(deps.ahora());
        const memberCount = cuentaDe(datos.memberCount) + 1;
        tx.create(r.miembro(yo.identity), {
          userId: yo.identity, identityType: yo.type, accountId: yo.accountUid, role: 'member',
          joinedAt: t, postCount: 0, reputation: 0,
        });
        tx.update(r.comunidad, { memberCount, updatedAt: t });
        tx.update(yo.perfilRef, { joinedCommunities: deps.unirALista(id) });
        return { communityId: id, role: 'member' as Papel, memberCount, yaEra: false };
      });
    },

    /** Salir con UNA identidad. La otra cara de la misma cuenta, si está, se queda. El dueño transfiere antes. */
    salir: async (a: { cuentaDeLaSesion: string; comoIdentidad: unknown; communityId: unknown }) => {
      const id = idValido(a.communityId);
      const yo = await resolver(a.comoIdentidad, a.cuentaDeLaSesion, true);
      const r = refs(id);
      return r.db.runTransaction(async (tx: any) => {
        const [c, m] = [await tx.get(r.comunidad), await tx.get(r.miembro(yo.identity))];
        if (!c.exists) throw new ComunidadError('no-existe');
        const datos = c.data() || {};
        if (!m.exists) {
          tx.update(yo.perfilRef, { joinedCommunities: deps.quitarDeLista(id) });
          return { communityId: id, memberCount: cuentaDe(datos.memberCount), estaba: false };
        }
        const d = decidirSalida(papelDelMiembro(m.data()));
        if (!d.ok) throw new ComunidadError(d.motivo);
        const memberCount = Math.max(0, cuentaDe(datos.memberCount) - 1);
        tx.delete(r.miembro(yo.identity));
        tx.update(r.comunidad, { memberCount, updatedAt: deps.sello(deps.ahora()) });
        tx.update(yo.perfilRef, { joinedCommunities: deps.quitarDeLista(id) });
        return { communityId: id, memberCount, estaba: true };
      });
    },

    /** Cambiar el papel de otra identidad. Decide el papel de QUIEN ACTÚA, con la cara con la que actúa. */
    cambiarPapel: async (a: { cuentaDeLaSesion: string; comoIdentidad: unknown; communityId: unknown; objetivo: unknown; papel: unknown }) => {
      const id = idValido(a.communityId);
      const yo = await resolver(a.comoIdentidad, a.cuentaDeLaSesion, true);
      if (!esIdentidadDePersona(a.objetivo as string)) throw new ComunidadError('identidad-invalida');
      const objetivo = a.objetivo as string;
      const r = refs(id);
      return r.db.runTransaction(async (tx: any) => {
        const [c, mYo, mOtro] = [await tx.get(r.comunidad), await tx.get(r.miembro(yo.identity)), await tx.get(r.miembro(objetivo))];
        const g = decidirGobierno(c.exists ? c.data() : null);
        if (!g.ok) throw new ComunidadError(g.motivo);
        const d = decidirCambioDePapel({
          actor: mYo.exists ? papelDelMiembro(mYo.data()) : null,
          objetivo: mOtro.exists ? papelDelMiembro(mOtro.data()) : null,
          nuevo: a.papel,
          mismaIdentidad: objetivo === yo.identity,
        });
        if (!d.ok) throw new ComunidadError(d.motivo);
        const t = deps.sello(deps.ahora());
        tx.update(r.miembro(objetivo), { role: a.papel, roleUpdatedAt: t });
        tx.update(r.comunidad, { updatedAt: t });
        return { communityId: id, target: objetivo, role: a.papel as Papel };
      });
    },

    /** Sacar a otra identidad. */
    expulsar: async (a: { cuentaDeLaSesion: string; comoIdentidad: unknown; communityId: unknown; objetivo: unknown }) => {
      const id = idValido(a.communityId);
      const yo = await resolver(a.comoIdentidad, a.cuentaDeLaSesion, true);
      if (!esIdentidadDePersona(a.objetivo as string)) throw new ComunidadError('identidad-invalida');
      const objetivo = a.objetivo as string;
      const r = refs(id);
      const perfilObjetivo = await perfilesDe(objetivo).get();
      return r.db.runTransaction(async (tx: any) => {
        const [c, mYo, mOtro] = [await tx.get(r.comunidad), await tx.get(r.miembro(yo.identity)), await tx.get(r.miembro(objetivo))];
        const g = decidirGobierno(c.exists ? c.data() : null);
        if (!g.ok) throw new ComunidadError(g.motivo);
        const d = decidirExpulsion({
          actor: mYo.exists ? papelDelMiembro(mYo.data()) : null,
          objetivo: mOtro.exists ? papelDelMiembro(mOtro.data()) : null,
          mismaIdentidad: objetivo === yo.identity,
        });
        if (!d.ok) throw new ComunidadError(d.motivo);
        const memberCount = Math.max(0, cuentaDe((c.data() || {}).memberCount) - 1);
        tx.delete(r.miembro(objetivo));
        tx.update(r.comunidad, { memberCount, updatedAt: deps.sello(deps.ahora()) });
        if (!perfilObjetivo.empty) tx.update(perfilObjetivo.docs[0].ref, { joinedCommunities: deps.quitarDeLista(id) });
        return { communityId: id, target: objetivo, memberCount };
      });
    },

    /**
     * Transferir la propiedad a otra identidad miembro (puede ser la otra cara de la misma cuenta: es un acto explícito,
     * no una herencia). El dueño anterior queda de admin. Se cambia lo público (perfil dueño) y lo privado (cuenta).
     */
    transferir: async (a: { cuentaDeLaSesion: string; comoIdentidad: unknown; communityId: unknown; objetivo: unknown }) => {
      const id = idValido(a.communityId);
      const yo = await resolver(a.comoIdentidad, a.cuentaDeLaSesion, true);
      const nuevo = await resolver(a.objetivo, a.cuentaDeLaSesion, false);
      const r = refs(id);
      return r.db.runTransaction(async (tx: any) => {
        const [c, prop, mYo, mOtro] = [await tx.get(r.comunidad), await tx.get(r.propiedad), await tx.get(r.miembro(yo.identity)), await tx.get(r.miembro(nuevo.identity))];
        const g = decidirGobierno(c.exists ? c.data() : null);
        if (!g.ok) throw new ComunidadError(g.motivo);
        const d = decidirTransferencia({
          actor: mYo.exists ? papelDelMiembro(mYo.data()) : null,
          objetivo: mOtro.exists ? papelDelMiembro(mOtro.data()) : null,
          mismaIdentidad: nuevo.identity === yo.identity,
        });
        if (!d.ok) throw new ComunidadError(d.motivo);
        const p = prop.exists ? prop.data() || {} : {};
        /* Doble llave: el papel en `members` y la propiedad privada tienen que decir lo mismo. */
        if (p.ownerIdentity !== yo.identity || p.ownerAccountId !== yo.accountUid) throw new ComunidadError('sin-permiso');
        const ms = deps.ahora();
        const t = deps.sello(ms);
        tx.update(r.miembro(yo.identity), { role: 'admin', roleUpdatedAt: t });
        tx.update(r.miembro(nuevo.identity), { role: 'owner', roleUpdatedAt: t });
        tx.update(r.propiedad, {
          ownerIdentity: nuevo.identity, ownerAccountId: nuevo.accountUid, updatedAt: t,
          history: [...(Array.isArray(p.history) ? p.history : []), { fromIdentity: yo.identity, fromAccountId: yo.accountUid, toIdentity: nuevo.identity, toAccountId: nuevo.accountUid, atMs: ms }],
        });
        tx.update(r.comunidad, { ownerProfile: nuevo.publico, updatedAt: t });
        return { communityId: id, owner: nuevo.publico };
      });
    },

    /** Editar lo descriptivo (no el slug, que es la dirección). */
    editar: async (a: { cuentaDeLaSesion: string; comoIdentidad: unknown; communityId: unknown; datos: ComunidadDeEntrada }) => {
      const id = idValido(a.communityId);
      const yo = await resolver(a.comoIdentidad, a.cuentaDeLaSesion, true);
      const r = refs(id);
      return r.db.runTransaction(async (tx: any) => {
        const [c, mYo] = [await tx.get(r.comunidad), await tx.get(r.miembro(yo.identity))];
        const g = decidirGobierno(c.exists ? c.data() : null);
        if (!g.ok) throw new ComunidadError(g.motivo);
        const d = decidirEdicion(mYo.exists ? papelDelMiembro(mYo.data()) : null);
        if (!d.ok) throw new ComunidadError(d.motivo);
        const actual = c.data() || {};
        const limpia = validarComunidad({ name: a.datos?.name ?? actual.name, description: a.datos?.description ?? actual.description, icon: a.datos?.icon ?? actual.icon, rules: a.datos?.rules ?? (Array.isArray(actual.rules) ? actual.rules.map((x: any) => x?.text) : []) });
        tx.update(r.comunidad, { name: limpia.name, description: limpia.description, icon: limpia.icon, rules: limpia.rules, updatedAt: deps.sello(deps.ahora()) });
        return { communityId: id };
      });
    },

    /**
     * Reclamar una comunidad HEREDADA: solo la cuenta que figura en `createdBy`, y eligiendo con qué cara. `createdBy`
     * no se toca (es historia); se añade la propiedad por identidad.
     */
    reclamarHeredada: async (a: { cuentaDeLaSesion: string; comoIdentidad: unknown; communityId: unknown }) => {
      const id = idValido(a.communityId);
      const yo = await resolver(a.comoIdentidad, a.cuentaDeLaSesion, true);
      const r = refs(id);
      return r.db.runTransaction(async (tx: any) => {
        const [c, prop, m] = [await tx.get(r.comunidad), await tx.get(r.propiedad), await tx.get(r.miembro(yo.identity))];
        if (!c.exists) throw new ComunidadError('no-existe');
        const datos = c.data() || {};
        if (datos.isOfficial === true) throw new ComunidadError('comunidad-oficial');
        if (datos.governance === GOBIERNO_POR_IDENTIDAD || prop.exists) throw new ComunidadError('ya-tiene-dueno');
        if (datos.createdBy !== yo.accountUid) throw new ComunidadError('no-la-creaste');
        const t = deps.sello(deps.ahora());
        let memberCount = cuentaDe(datos.memberCount);
        if (m.exists) tx.update(r.miembro(yo.identity), { role: 'owner', identityType: yo.type, accountId: yo.accountUid, roleUpdatedAt: t });
        else {
          memberCount += 1;
          tx.create(r.miembro(yo.identity), { userId: yo.identity, identityType: yo.type, accountId: yo.accountUid, role: 'owner', joinedAt: t, postCount: 0, reputation: 0 });
          tx.update(yo.perfilRef, { joinedCommunities: deps.unirALista(id) });
        }
        tx.create(r.propiedad, { creatorIdentity: null, creatorAccountId: datos.createdBy, ownerIdentity: yo.identity, ownerAccountId: yo.accountUid, claimedFromLegacy: true, history: [], createdAt: t, updatedAt: t });
        tx.update(r.comunidad, { governance: GOBIERNO_POR_IDENTIDAD, ownerProfile: yo.publico, memberCount, updatedAt: t });
        return { communityId: id, role: 'owner' as Papel };
      });
    },

    /**
     * Las membresías de UNA identidad, con su papel. Solo de esa cara: la otra cara de la misma cuenta no aparece.
     * La verdad es `members/{identidad}`; la lista del perfil solo dice dónde mirar.
     */
    misComunidades: async (a: { cuentaDeLaSesion: string; comoIdentidad: unknown }) => {
      const yo = await resolver(a.comoIdentidad, a.cuentaDeLaSesion, true);
      const perfil = await yo.perfilRef.get();
      const ids: string[] = (Array.isArray(perfil.data()?.joinedCommunities) ? perfil.data().joinedCommunities : [])
        .filter((x: unknown) => typeof x === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(x as string)).slice(0, 300);
      const db = deps.db();
      const unicos = [...new Set(ids)];
      if (unicos.length === 0) return { identityType: yo.type, memberships: [] as { communityId: string; role: Papel }[] };
      const docs = await db.getAll(...unicos.map((id) => db.collection(COMUNIDADES).doc(id).collection('members').doc(yo.identity)));
      const memberships = docs
        .map((d: any, i: number) => (d.exists ? { communityId: unicos[i], role: papelDelMiembro(d.data()) as Papel } : null))
        .filter(Boolean) as { communityId: string; role: Papel }[];
      return { identityType: yo.type, memberships };
    },
  };
};

/** Instancia de producción. `getFirestore()` va dentro: al Admin SDK lo inicializa `index.ts`. */
export const comunidadesEngine = createComunidadesEngine({
  db: () => getFirestore(),
  ahora: () => Date.now(),
  sello: (ms) => Timestamp.fromMillis(ms),
  unirALista: (v) => FieldValue.arrayUnion(v),
  quitarDeLista: (v) => FieldValue.arrayRemove(v),
});

// ─── Las callables ───────────────────────────────────────────────────────────

const laCuentaDe = (request: any): string => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'unauthenticated');
  return request.auth.uid as string;
};

const traducir = (error: unknown, queFallo: string): never => {
  if (error instanceof ComunidadError) throw new HttpsError(CODIGOS[error.motivo], error.motivo, { motivo: error.motivo });
  if (error instanceof HttpsError) throw error;
  console.error(`${queFallo} falló`, error);
  throw new HttpsError('internal', 'internal');
};

const datos = (request: any): Record<string, unknown> => (request.data && typeof request.data === 'object' ? request.data : {});

/** `createCommunity({ asIdentity, requestId, name, description?, icon?, rules? })` */
export const createCommunity = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const d = datos(request);
  try {
    return await comunidadesEngine.crear({ cuentaDeLaSesion, comoIdentidad: d.asIdentity, peticion: d.requestId, datos: d });
  } catch (e) { return traducir(e, 'createCommunity'); }
});

/** `joinCommunity({ asIdentity, communityId })` */
export const joinCommunity = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const d = datos(request);
  try { return await comunidadesEngine.unirse({ cuentaDeLaSesion, comoIdentidad: d.asIdentity, communityId: d.communityId }); } catch (e) { return traducir(e, 'joinCommunity'); }
});

/** `leaveCommunity({ asIdentity, communityId })` */
export const leaveCommunity = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const d = datos(request);
  try { return await comunidadesEngine.salir({ cuentaDeLaSesion, comoIdentidad: d.asIdentity, communityId: d.communityId }); } catch (e) { return traducir(e, 'leaveCommunity'); }
});

/** `setCommunityRole({ asIdentity, communityId, targetIdentity, role })` */
export const setCommunityRole = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const d = datos(request);
  try { return await comunidadesEngine.cambiarPapel({ cuentaDeLaSesion, comoIdentidad: d.asIdentity, communityId: d.communityId, objetivo: d.targetIdentity, papel: d.role }); } catch (e) { return traducir(e, 'setCommunityRole'); }
});

/** `removeCommunityMember({ asIdentity, communityId, targetIdentity })` */
export const removeCommunityMember = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const d = datos(request);
  try { return await comunidadesEngine.expulsar({ cuentaDeLaSesion, comoIdentidad: d.asIdentity, communityId: d.communityId, objetivo: d.targetIdentity }); } catch (e) { return traducir(e, 'removeCommunityMember'); }
});

/** `transferCommunityOwnership({ asIdentity, communityId, targetIdentity })` */
export const transferCommunityOwnership = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const d = datos(request);
  try { return await comunidadesEngine.transferir({ cuentaDeLaSesion, comoIdentidad: d.asIdentity, communityId: d.communityId, objetivo: d.targetIdentity }); } catch (e) { return traducir(e, 'transferCommunityOwnership'); }
});

/** `updateCommunity({ asIdentity, communityId, name?, description?, icon?, rules? })` */
export const updateCommunity = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const d = datos(request);
  try { return await comunidadesEngine.editar({ cuentaDeLaSesion, comoIdentidad: d.asIdentity, communityId: d.communityId, datos: d }); } catch (e) { return traducir(e, 'updateCommunity'); }
});

/** `claimLegacyCommunity({ asIdentity, communityId })` */
export const claimLegacyCommunity = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const d = datos(request);
  try { return await comunidadesEngine.reclamarHeredada({ cuentaDeLaSesion, comoIdentidad: d.asIdentity, communityId: d.communityId }); } catch (e) { return traducir(e, 'claimLegacyCommunity'); }
});

/** `listMyCommunities({ asIdentity })` */
export const listMyCommunities = onCall(OPTS, async (request) => {
  const cuentaDeLaSesion = laCuentaDe(request);
  const d = datos(request);
  try { return await comunidadesEngine.misComunidades({ cuentaDeLaSesion, comoIdentidad: d.asIdentity }); } catch (e) { return traducir(e, 'listMyCommunities'); }
});
