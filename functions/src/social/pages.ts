/**
 * WEËPAGES — LAS PÁGINAS PÚBLICAS DE UNA CUENTA.
 *
 * Una Página es una ENTIDAD de la cuenta (CLAUDE.md, decisión del 2026-09-19): un personaje, una empresa, una marca, una
 * institución… No es una tercera cara de la persona —Weë tiene dos y solo dos— y por eso NO vive en `users`, no tiene
 * `profileType`, ni wallet, ni agenda. Vive en `pages/{pageId}` con `ownerAccountId` = la cuenta (`request.auth.uid`), y
 * las dos caras de esa cuenta la gestionan por igual.
 *
 *   pages/{pageId}            la Página (borrador o publicada)
 *   pageHandles/{handle}      reserva del @usuario, para que no haya dos iguales
 *   pageFollows/{pageId}_{identidad}  quién la sigue; es una relación aparte de ËContact/ẄContact
 *
 * Nada de esto lo escribe el cliente: las reglas lo cierran y todo pasa por estas funciones, que validan dueño, tipo,
 * campos y fotos en el servidor. No consume Credits ni llama a ninguna IA.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { direccionDeLaCuenta } from '../engine/http';
import { cuentaDeIdentidad, PerfilDeIdentidad } from './econtact';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

export const TIPOS_DE_PAGINA = ['character', 'company', 'influencer', 'institution', 'brand', 'organization', 'other'] as const;
export type TipoDePagina = (typeof TIPOS_DE_PAGINA)[number];

/** Los campos propios de cada tipo. Los comunes van aparte; aquí solo lo que cambia. */
export const CAMPOS_POR_TIPO: Record<TipoDePagina, readonly string[]> = {
  character: ['characterType', 'biography', 'origin', 'nature'],
  company: ['industry', 'businessDescription'],
  influencer: ['contentCategory', 'biography', 'socialLinks', 'topics'],
  institution: ['institutionType', 'mission'],
  brand: ['industry', 'brandDescription', 'visualIdentity'],
  organization: ['organizationType', 'mission'],
  other: [],
};

/** Lo que vale para «Fictional or Real» de un personaje. */
export const NATURALEZAS = ['fictional', 'real'] as const;

const HANDLE = /^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$/;
const LIMITES = { name: 60, shortDescription: 160, about: 2000, website: 200, location: 80, contact: 120, detalle: 600 } as const;

export interface PaginaDeEntrada {
  type?: unknown; name?: unknown; handle?: unknown; shortDescription?: unknown; about?: unknown;
  website?: unknown; location?: unknown; contact?: unknown; logoURL?: unknown; coverURL?: unknown; details?: unknown;
}

export interface PaginaLimpia {
  type: TipoDePagina; name: string; handle: string; shortDescription: string; about: string;
  website: string; location: string; contact: string; logoURL: string; coverURL: string; details: Record<string, string>;
}

export type MotivoDePagina = 'tipo' | 'nombre' | 'handle' | 'web' | 'foto' | 'naturaleza' | 'larga';

export class PageError extends Error {
  constructor(public motivo: MotivoDePagina | 'no-existe' | 'ajena' | 'handle-ocupado' | 'no-publicada' | 'identidad') {
    super(motivo);
  }
}

const texto = (v: unknown, max: number): string => {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw new PageError('larga');
  const t = v.trim();
  if (t.length > max) throw new PageError('larga');
  return t;
};

/** Un @usuario: minúsculas, números, punto y guion bajo; 3–30; sin empezar ni acabar en signo. Puro. */
export const normalizarHandle = (v: unknown): string => {
  const h = typeof v === 'string' ? v.trim().replace(/^@/, '').toLowerCase() : '';
  if (!HANDLE.test(h)) throw new PageError('handle');
  return h;
};

/** Una web opcional: solo http(s). Puro. */
export const normalizarWeb = (v: unknown): string => {
  const w = texto(v, LIMITES.website);
  if (!w) return '';
  const conProtocolo = /^https?:\/\//i.test(w) ? w : `https://${w}`;
  try {
    const u = new URL(conProtocolo);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocolo');
    return u.toString();
  } catch {
    throw new PageError('web');
  }
};

/**
 * Valida y limpia lo que llega del cliente. Pura: no lee nada.
 *
 * `foto` decide qué dirección de imagen se acepta; en el servidor es la carpeta de la cuenta en el Storage de Weë
 * (`direccionDeLaCuenta`), así que nadie publica una Página con la foto de otro.
 */
export const validarPagina = (entrada: PaginaDeEntrada, foto: (url: string) => string): PaginaLimpia => {
  const type = entrada.type as TipoDePagina;
  if (!TIPOS_DE_PAGINA.includes(type)) throw new PageError('tipo');
  const name = texto(entrada.name, LIMITES.name);
  if (!name) throw new PageError('nombre');
  const imagen = (v: unknown) => {
    const u = texto(v, 2000);
    return u ? foto(u) : '';
  };
  const llegados = (entrada.details && typeof entrada.details === 'object' ? entrada.details : {}) as Record<string, unknown>;
  const details: Record<string, string> = {};
  for (const campo of CAMPOS_POR_TIPO[type]) {
    const valor = texto(llegados[campo], LIMITES.detalle);
    if (valor) details[campo] = valor;
  }
  if (details.nature && !NATURALEZAS.includes(details.nature as (typeof NATURALEZAS)[number])) throw new PageError('naturaleza');
  return {
    type,
    name,
    handle: normalizarHandle(entrada.handle),
    shortDescription: texto(entrada.shortDescription, LIMITES.shortDescription),
    about: texto(entrada.about, LIMITES.about),
    website: normalizarWeb(entrada.website),
    location: texto(entrada.location, LIMITES.location),
    contact: texto(entrada.contact, LIMITES.contact),
    logoURL: imagen(entrada.logoURL),
    coverURL: imagen(entrada.coverURL),
    details,
  };
};

const CODIGOS: Record<string, 'invalid-argument' | 'not-found' | 'permission-denied' | 'already-exists' | 'failed-precondition'> = {
  tipo: 'invalid-argument', nombre: 'invalid-argument', handle: 'invalid-argument', web: 'invalid-argument', foto: 'invalid-argument',
  naturaleza: 'invalid-argument', larga: 'invalid-argument', 'no-existe': 'not-found', ajena: 'permission-denied',
  'handle-ocupado': 'already-exists', 'no-publicada': 'failed-precondition', identidad: 'permission-denied',
};

/* El mensaje es el motivo: el cliente lo traduce con `pages.err_<motivo>`. */
const traducir = (error: unknown): never => {
  if (error instanceof PageError) throw new HttpsError(CODIGOS[error.motivo], error.motivo);
  if (error instanceof HttpsError) throw error;
  throw new HttpsError('internal', 'internal');
};

const laCuentaDe = (request: { auth?: { uid?: string } }): string => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'unauthenticated');
  return request.auth.uid;
};

/**
 * `savePage({ pageId?, page, publish })` — crea o edita una Página de la cuenta de la sesión.
 *
 * Sin `pageId` crea; con él, edita solo si `ownerAccountId` es la cuenta. `publish: true` la publica; `false` la deja o
 * la devuelve a borrador. El @usuario se reserva en `pageHandles` dentro de la MISMA transacción, así que dos Páginas no
 * pueden quedarse con el mismo aunque se guarden a la vez.
 */
export const savePage = onCall(OPTS, async (request) => {
  const cuenta = laCuentaDe(request);
  const data = (request.data || {}) as { pageId?: unknown; page?: PaginaDeEntrada; publish?: unknown };
  try {
    const db = getFirestore();
    /*
     * Una foto que la página YA tenía se acepta tal cual al editar (solo si la página es de esta cuenta): lo que se
     * valida es lo que llega nuevo, que tiene que venir de la carpeta de la cuenta en el Storage de Weë.
     */
    const previa = typeof data.pageId === 'string' && data.pageId ? await db.collection('pages').doc(data.pageId).get() : null;
    const yaTenia = previa?.exists && previa.get('ownerAccountId') === cuenta ? [previa.get('logoURL'), previa.get('coverURL')].filter(Boolean) : [];
    const limpia = validarPagina(data.page || {}, (url) => {
      if (yaTenia.includes(url)) return url;
      const d = direccionDeLaCuenta(url, cuenta);
      if (!d.ok) throw new PageError('foto');
      return d.url;
    });
    const pageId = typeof data.pageId === 'string' && data.pageId ? data.pageId : db.collection('pages').doc().id;
    const publicar = data.publish === true;
    await db.runTransaction(async (tx) => {
      const ref = db.collection('pages').doc(pageId);
      const antes = await tx.get(ref);
      if (data.pageId && !antes.exists) throw new PageError('no-existe');
      if (antes.exists && antes.get('ownerAccountId') !== cuenta) throw new PageError('ajena');
      const reserva = db.collection('pageHandles').doc(limpia.handle);
      const ocupada = await tx.get(reserva);
      if (ocupada.exists && ocupada.get('pageId') !== pageId) throw new PageError('handle-ocupado');
      const handleViejo = antes.exists ? (antes.get('handle') as string) : null;
      if (handleViejo && handleViejo !== limpia.handle) tx.delete(db.collection('pageHandles').doc(handleViejo));
      tx.set(reserva, { pageId });
      const ahora = FieldValue.serverTimestamp();
      tx.set(ref, {
        ...limpia,
        ownerAccountId: cuenta,
        status: publicar ? 'published' : 'draft',
        updatedAt: ahora,
        ...(antes.exists ? {} : { createdAt: ahora, followersCount: 0 }),
        ...(publicar && !(antes.exists && antes.get('status') === 'published') ? { publishedAt: ahora } : {}),
      }, { merge: true });
    });
    return { pageId, status: publicar ? 'published' : 'draft' };
  } catch (error) {
    return traducir(error);
  }
});

/**
 * `followPage({ pageId, asIdentity, follow })` — seguir o dejar de seguir una Página publicada.
 *
 * Sigue una IDENTIDAD (el Perfil Real o el Perfil Weë de la sesión), no la cuenta: cada cara decide a quién sigue, igual
 * que cada una tiene su agenda. Seguir una Página no toca `econtacts`: son relaciones distintas.
 */
export const followPage = onCall(OPTS, async (request) => {
  const cuenta = laCuentaDe(request);
  const data = (request.data || {}) as { pageId?: unknown; asIdentity?: unknown; follow?: unknown };
  try {
    const pageId = typeof data.pageId === 'string' ? data.pageId : '';
    const identidad = typeof data.asIdentity === 'string' ? data.asIdentity : '';
    if (!pageId) throw new PageError('no-existe');
    const db = getFirestore();
    const perfil = identidad ? await db.collection('users').doc(identidad).get() : null;
    if (!perfil?.exists || cuentaDeIdentidad(identidad, perfil.data() as PerfilDeIdentidad) !== cuenta) throw new PageError('identidad');
    const seguir = data.follow !== false;
    await db.runTransaction(async (tx) => {
      const pagina = db.collection('pages').doc(pageId);
      const doc = await tx.get(pagina);
      if (!doc.exists) throw new PageError('no-existe');
      if (doc.get('status') !== 'published') throw new PageError('no-publicada');
      const ref = db.collection('pageFollows').doc(`${pageId}_${identidad}`);
      const ya = await tx.get(ref);
      if (seguir && !ya.exists) {
        tx.set(ref, { pageId, identity: identidad, createdAt: FieldValue.serverTimestamp() });
        tx.update(pagina, { followersCount: FieldValue.increment(1) });
      } else if (!seguir && ya.exists) {
        tx.delete(ref);
        tx.update(pagina, { followersCount: FieldValue.increment(-1) });
      }
    });
    return { following: seguir };
  } catch (error) {
    return traducir(error);
  }
});
