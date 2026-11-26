/**
 * WEËPAGES — LAS PÁGINAS PÚBLICAS DE UNA CUENTA.
 *
 * Una Página es una ENTIDAD de la cuenta (CLAUDE.md, decisión del 2026-09-19): desde el 2026-11-23, donde vive su OBRA (un
 * libro, una película, unas pinturas, un negocio…) o, como antes, un personaje, una empresa, una marca, una
 * institución… No es una tercera cara de la persona —Weë tiene dos y solo dos— y por eso NO vive en `users`, no tiene
 * `profileType`, ni wallet, ni agenda. Vive en `pages/{pageId}`; de qué cuenta es (`request.auth.uid`) se guarda APARTE,
 * en `pages/{pageId}/private/ownership`, y las caras de esa cuenta la gestionan por igual.
 *
 *   pages/{pageId}            la Página (borrador o publicada), sin la cuenta
 *   pages/{pageId}/private/ownership  la cuenta dueña; solo la lee ella (F1, 2026-11-23)
 *   accounts/{cuenta}/pages/{pageId}  índice privado de las Páginas de la cuenta
 *   pageHandles/{handle}      reserva del @usuario, para que no haya dos iguales
 *   pageFollows/{pageId}_{identidad}  quién la sigue; es una relación aparte de ËContact/ẄContact
 *
 * Nada de esto lo escribe el cliente: las reglas lo cierran y todo pasa por estas funciones, que validan dueño, tipo,
 * campos y fotos en el servidor. No consume Credits ni llama a ninguna IA.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { direccionDeLaPagina } from '../engine/http';
import { PerfilDeIdentidad } from './econtact';
import { cuentaDelPerfilLeido } from '../identity/compatibilidad';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

/*
 * LOS TIPOS. Los siete primeros son los de siempre y NO cambian de id: hay páginas guardadas con ellos (`company` se
 * rotula hoy «Negocio»). Los demás son los tipos de OBRA (decisión del dueño, 2026-11-23: «al crear tiene que salir qué
 * tipo de página sería»). Una página guardada con un tipo de antes se sigue validando igual.
 */
export const TIPOS_DE_PAGINA = [
  'character', 'company', 'influencer', 'institution', 'brand', 'organization', 'other',
  'book', 'film', 'comic', 'music', 'painting', 'illustration', 'photography', 'crafts', 'sculpture', 'fashion', 'food', 'design', 'services',
] as const;
export type TipoDePagina = (typeof TIPOS_DE_PAGINA)[number];

/** Los campos propios de cada tipo. Los comunes van aparte; aquí solo lo que cambia. Igual que `constants/pageTypes.ts`. */
export const CAMPOS_POR_TIPO: Record<TipoDePagina, readonly string[]> = {
  character: ['characterType', 'biography', 'origin', 'nature'],
  company: ['industry', 'businessDescription'],
  influencer: ['contentCategory', 'biography', 'socialLinks', 'topics'],
  institution: ['institutionType', 'mission'],
  brand: ['industry', 'brandDescription', 'visualIdentity'],
  organization: ['organizationType', 'mission'],
  other: [],
  book: ['genre', 'year', 'format'],
  film: ['genre', 'year', 'duration', 'cast'],
  comic: ['genre', 'year', 'format'],
  music: ['genre', 'year', 'format'],
  painting: ['technique', 'dimensions', 'year'],
  illustration: ['technique', 'availability'],
  photography: ['genre', 'year'],
  crafts: ['materials', 'availability'],
  sculpture: ['materials', 'dimensions'],
  fashion: ['materials', 'availability'],
  food: ['cuisine', 'availability'],
  design: ['discipline', 'availability'],
  services: ['discipline', 'availability'],
};

/** Las secciones que puede ordenar o apagar el dueño. Igual que `SECCIONES_DE_PAGINA` del cliente. */
export const SECCIONES_DE_PAGINA = [
  'synopsis', 'aboutWork', 'offer', 'sample', 'gallery', 'room', 'portfolio', 'essay', 'pieces', 'collection', 'dishes', 'projects',
  'scenes', 'whereToBuy', 'whereToWatch', 'whereToListen', 'links', 'sheet', 'contact', 'updates',
] as const;

/** El color de obra: se guarda el id, el tono lo pone el cliente. */
export const COLORES_DE_OBRA = ['amber', 'wine', 'forest', 'sea', 'plum', 'paper'] as const;

export const MAX_IMAGENES = 12;
export const MAX_ENLACES = 8;

/** Lo que vale para «Fictional or Real» de un personaje. */
export const NATURALEZAS = ['fictional', 'real'] as const;

const HANDLE = /^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$/;
const LIMITES = { name: 60, shortDescription: 160, about: 2000, website: 200, location: 80, contact: 120, detalle: 600, etiqueta: 60 } as const;

export interface PaginaDeEntrada {
  type?: unknown; name?: unknown; handle?: unknown; shortDescription?: unknown; about?: unknown;
  website?: unknown; location?: unknown; contact?: unknown; logoURL?: unknown; coverURL?: unknown; details?: unknown;
  sections?: unknown; links?: unknown; gallery?: unknown; workColor?: unknown;
  /** La cara que la presenta (uid de una cara de la cuenta) o vacío. NO se guarda tal cual: ver `savePage`. */
  presenter?: unknown;
}

export interface EnlaceDeObra { label: string; url: string }
export interface SeccionDeObra { id: (typeof SECCIONES_DE_PAGINA)[number]; enabled: boolean }

export interface PaginaLimpia {
  type: TipoDePagina; name: string; handle: string; shortDescription: string; about: string;
  website: string; location: string; contact: string; logoURL: string; coverURL: string; details: Record<string, string>;
  sections: SeccionDeObra[]; links: EnlaceDeObra[]; gallery: string[]; workColor: string;
}

export type MotivoDePagina = 'tipo' | 'nombre' | 'handle' | 'web' | 'foto' | 'naturaleza' | 'larga' | 'enlace' | 'seccion' | 'color';

export class PageError extends Error {
  constructor(public motivo: MotivoDePagina | 'no-existe' | 'ajena' | 'handle-ocupado' | 'no-publicada' | 'identidad' | 'presentador') {
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
 * Un enlace a una tienda externa: SOLO `https`. Sin esquema se completa («amazon.com/…» → `https://amazon.com/…»);
 * `http:`, `javascript:`, `mailto:`… se rechazan. Nada se vende dentro de Weë (dueño, 2026-11-23): esto es lo único que
 * una página puede hacer para vender, y un toque abre la tienda. Pura; el cliente aplica la misma regla
 * (`utils/enlaceDeObra.ts`).
 */
export const normalizarEnlace = (v: unknown): string => {
  const w = texto(v, 500);
  if (!w || /\s/.test(w)) throw new PageError('enlace');
  const tieneEsquema = /^[a-z][a-z0-9+.-]*:/i.test(w);
  if (tieneEsquema && !/^https:\/\//i.test(w)) throw new PageError('enlace');
  try {
    const u = new URL(tieneEsquema ? w : `https://${w}`);
    if (u.protocol !== 'https:' || !u.hostname.includes('.') || u.username || u.password) throw new Error('enlace');
    return u.toString();
  } catch {
    throw new PageError('enlace');
  }
};

/** Las secciones elegidas: ids conocidos, sin repetir, en el orden recibido. Vacío = las del tipo. Pura. */
export const validarSecciones = (v: unknown): SeccionDeObra[] => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > SECCIONES_DE_PAGINA.length) throw new PageError('seccion');
  const vistas = new Set<string>();
  return v.map((s) => {
    const id = (s as { id?: unknown })?.id;
    if (typeof id !== 'string' || !(SECCIONES_DE_PAGINA as readonly string[]).includes(id) || vistas.has(id)) throw new PageError('seccion');
    vistas.add(id);
    return { id: id as SeccionDeObra['id'], enabled: (s as { enabled?: unknown }).enabled !== false };
  });
};

/** Los enlaces a tiendas: como mucho `MAX_ENLACES`, cada uno con su nombre (lo escribe el dueño) y una URL https. Pura. */
export const validarEnlaces = (v: unknown): EnlaceDeObra[] => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > MAX_ENLACES) throw new PageError('enlace');
  return v.map((e) => {
    const url = normalizarEnlace((e as { url?: unknown })?.url);
    const label = texto((e as { label?: unknown })?.label, LIMITES.etiqueta);
    return { label, url };
  });
};

/**
 * Valida y limpia lo que llega del cliente. Pura: no lee nada.
 *
 * `foto` decide qué dirección de imagen se acepta; en el servidor es la carpeta de ESA Página en el Storage de Weë
 * (`direccionDeLaPagina`, `pages/<pageId>/`), que solo su cuenta puede escribir, así que nadie publica una Página con
 * la foto de otro y la URL no delata la cuenta.
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
  if (entrada.gallery !== undefined && entrada.gallery !== null && (!Array.isArray(entrada.gallery) || entrada.gallery.length > MAX_IMAGENES)) throw new PageError('foto');
  const gallery = [...new Set((Array.isArray(entrada.gallery) ? entrada.gallery : []).map(imagen).filter(Boolean))];
  const workColor = texto(entrada.workColor, 20);
  if (workColor && !(COLORES_DE_OBRA as readonly string[]).includes(workColor)) throw new PageError('color');
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
    sections: validarSecciones(entrada.sections),
    links: validarEnlaces(entrada.links),
    gallery,
    workColor,
  };
};

const CODIGOS: Record<string, 'invalid-argument' | 'not-found' | 'permission-denied' | 'already-exists' | 'failed-precondition'> = {
  tipo: 'invalid-argument', nombre: 'invalid-argument', handle: 'invalid-argument', web: 'invalid-argument', foto: 'invalid-argument',
  naturaleza: 'invalid-argument', larga: 'invalid-argument', 'no-existe': 'not-found', ajena: 'permission-denied',
  'handle-ocupado': 'already-exists', 'no-publicada': 'failed-precondition', identidad: 'permission-denied',
  enlace: 'invalid-argument', seccion: 'invalid-argument', color: 'invalid-argument', presentador: 'permission-denied',
};

/** La referencia pública de una entidad: `ent_` y 26 caracteres opacos (utils/identidadPublica.ts). */
const REFERENCIA_DE_ENTIDAD = /^ent_[0-9abcdefghjkmnpqrstvwxyz]{26}$/;

/**
 * «PRESENTADA POR» (dueño, 2026-11-23): la cara que el dueño elige —su Perfil Real, uno de sus alter egos o nadie—.
 *
 * El cliente manda el uid de la cara; aquí se comprueba que es de la cuenta de la sesión (la misma regla que seguir una
 * página) y se devuelve lo que se PUBLICA: la referencia pública de esa cara, nunca la cuenta. Un alter ego solo se
 * publica por su entidad (`ent_…`): su uid heredado lleva la cuenta dentro. El Perfil Real sin entidad todavía (su uid
 * es el de la cuenta) se nombra por su uid, que es como ya se enlaza en toda la app y que el dueño acaba de elegir enseñar.
 */
export const referenciaDelPresentador = (perfil: { uid?: unknown; entityId?: unknown } | null | undefined, cuenta: string): string | null => {
  if (!perfil) return null;
  if (typeof perfil.entityId === 'string' && REFERENCIA_DE_ENTIDAD.test(perfil.entityId)) return perfil.entityId;
  if (perfil.uid === cuenta) return cuenta;
  return null;
};

const presentadorDeLaCuenta = async (db: Firestore, cuenta: string, pedido: unknown): Promise<string> => {
  if (pedido === undefined || pedido === null || pedido === '') return '';
  if (typeof pedido !== 'string' || pedido.length > 128 || pedido.includes('/')) throw new PageError('presentador');
  let snap = await db.collection('users').doc(pedido).get();
  if (!snap.exists) {
    /* Los Perfiles Reales antiguos tienen id automático: se buscan por su campo `uid`. */
    const q = await db.collection('users').where('uid', '==', pedido).limit(1).get();
    if (q.empty) throw new PageError('presentador');
    snap = q.docs[0] as unknown as typeof snap;
  }
  const perfil = snap.data() as PerfilDeIdentidad & { entityId?: unknown };
  if ((await cuentaDelPerfilLeido(db, pedido, perfil)) !== cuenta) throw new PageError('presentador');
  const ref = referenciaDelPresentador(perfil, cuenta);
  if (!ref) throw new PageError('presentador');
  return ref;
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

/*
 * DE QUIÉN ES UNA PÁGINA (F1 del plan de alter egos, 2026-11-23).
 *
 * La Página publicada es pública, y llevaba `ownerAccountId` = el uid de la cuenta: cualquiera leía de qué cuenta era,
 * y con ella, su Perfil Real. Ahora la propiedad vive en `pages/{pageId}/private/ownership`, que solo lee la cuenta
 * dueña (como `private/ownership` de las comunidades), y la lista de Páginas de la cuenta en su índice privado
 * `accounts/{cuenta}/pages/{pageId}`. El documento público deja de llevar la cuenta: al guardar se BORRA el campo
 * antiguo. Una Página antigua que aún lo lleva se reconoce por él hasta que su dueño la vuelva a guardar.
 */
export const RUTA_DE_LA_PROPIEDAD = (pageId: string) => `pages/${pageId}/private/ownership`;
export const RUTA_DEL_INDICE = (cuenta: string, pageId: string) => `accounts/${cuenta}/pages/${pageId}`;

/** La cuenta dueña de una Página: la del privado; si no hay privado, la del campo público antiguo. Pura. */
export const duenaDeLaPagina = (propiedad: { ownerAccountId?: unknown } | undefined | null, publica: { ownerAccountId?: unknown } | undefined | null): string | null => {
  const delPrivado = propiedad?.ownerAccountId;
  if (typeof delPrivado === 'string' && delPrivado) return delPrivado;
  const antigua = publica?.ownerAccountId;
  return typeof antigua === 'string' && antigua ? antigua : null;
};

/** Lo que se escribe en el documento PÚBLICO de la Página. Nunca la cuenta; el campo antiguo se borra. Pura. */
export const documentoPublico = <T extends Record<string, unknown>>(limpia: T, extra: Record<string, unknown>, borrar: unknown): Record<string, unknown> => {
  const { ownerAccountId: _fuera, ...resto } = { ...limpia, ...extra } as Record<string, unknown>;
  return { ...resto, ownerAccountId: borrar };
};

/**
 * `savePage({ pageId?, page, publish })` — crea o edita una Página de la cuenta de la sesión.
 * `savePage({ prepare: true, pageId? })` — prepara la carpeta de fotos: devuelve un `pageId` cuya propiedad ya está
 *   escrita (nuevo, o la Página existente de la cuenta), para que la app suba el logo y la portada a `pages/<pageId>/`,
 *   que las reglas de Storage solo abren a la cuenta dueña. No crea la Página pública.
 *
 * Sin `pageId` crea; con él, edita solo si la Página (o su propiedad preparada) es de la cuenta. `publish: true` la
 * publica; `false` la deja o la devuelve a borrador. El @usuario se reserva en `pageHandles` dentro de la MISMA
 * transacción, así que dos Páginas no pueden quedarse con el mismo aunque se guarden a la vez.
 */
export const savePage = onCall(OPTS, async (request) => {
  const cuenta = laCuentaDe(request);
  const data = (request.data || {}) as { pageId?: unknown; page?: PaginaDeEntrada; publish?: unknown; prepare?: unknown };
  try {
    const db = getFirestore();
    const pedida = typeof data.pageId === 'string' && data.pageId && !data.pageId.includes('/') ? data.pageId : '';
    if (typeof data.pageId === 'string' && data.pageId && !pedida) throw new PageError('no-existe');
    const pageId = pedida || db.collection('pages').doc().id;
    const ref = db.collection('pages').doc(pageId);
    const refPropiedad = db.doc(RUTA_DE_LA_PROPIEDAD(pageId));
    const refIndice = db.doc(RUTA_DEL_INDICE(cuenta, pageId));
    const ahora = FieldValue.serverTimestamp();

    if (data.prepare === true) {
      await db.runTransaction(async (tx) => {
        const [antes, propiedad] = await Promise.all([tx.get(ref), tx.get(refPropiedad)]);
        if (pedida && !antes.exists && !propiedad.exists) throw new PageError('no-existe');
        const duena = duenaDeLaPagina(propiedad.data(), antes.data());
        if (pedida && duena !== cuenta) throw new PageError('ajena');
        if (!propiedad.exists) tx.set(refPropiedad, { ownerAccountId: cuenta, pageId, createdAt: ahora });
        // Una Página antigua deja aquí de llevar la cuenta en público; sigue en «mis Páginas» por el índice privado.
        if (antes.exists) {
          tx.update(ref, { ownerAccountId: FieldValue.delete() });
          tx.set(refIndice, { pageId, updatedAt: ahora }, { merge: true });
        }
      });
      return { pageId, status: 'prepared' };
    }

    /*
     * Una foto que la página YA tenía se acepta tal cual al editar (solo si la página es de esta cuenta): así siguen
     * sirviendo las fotos antiguas, de la carpeta de la cuenta. Lo que llega NUEVO tiene que venir de la carpeta de
     * ESTA Página en el Storage de Weë (`pages/<pageId>/`), que solo su cuenta puede escribir.
     */
    const [previa, propiedadPrevia] = pedida ? await Promise.all([ref.get(), refPropiedad.get()]) : [null, null];
    const esDeLaCuenta = !!pedida && duenaDeLaPagina(propiedadPrevia?.data(), previa?.data()) === cuenta;
    const galeriaPrevia = esDeLaCuenta && previa?.exists && Array.isArray(previa.get('gallery')) ? (previa.get('gallery') as unknown[]) : [];
    const yaTenia = esDeLaCuenta && previa?.exists ? [previa.get('logoURL'), previa.get('coverURL'), ...galeriaPrevia].filter(Boolean) : [];
    const limpia = validarPagina(data.page || {}, (url) => {
      if (yaTenia.includes(url)) return url;
      const d = direccionDeLaPagina(url, pageId);
      if (!d.ok) throw new PageError('foto');
      return d.url;
    });
    const presenterRef = await presentadorDeLaCuenta(db, cuenta, (data.page || {}).presenter);
    const publicar = data.publish === true;
    await db.runTransaction(async (tx) => {
      const [antes, propiedad] = await Promise.all([tx.get(ref), tx.get(refPropiedad)]);
      if (pedida && !antes.exists && !propiedad.exists) throw new PageError('no-existe');
      if ((antes.exists || propiedad.exists) && duenaDeLaPagina(propiedad.data(), antes.data()) !== cuenta) throw new PageError('ajena');
      const reserva = db.collection('pageHandles').doc(limpia.handle);
      const ocupada = await tx.get(reserva);
      if (ocupada.exists && ocupada.get('pageId') !== pageId) throw new PageError('handle-ocupado');
      const handleViejo = antes.exists ? (antes.get('handle') as string) : null;
      if (handleViejo && handleViejo !== limpia.handle) tx.delete(db.collection('pageHandles').doc(handleViejo));
      tx.set(reserva, { pageId });
      if (!propiedad.exists) tx.set(refPropiedad, { ownerAccountId: cuenta, pageId, createdAt: ahora });
      tx.set(refIndice, { pageId, updatedAt: ahora }, { merge: true });
      tx.set(ref, documentoPublico(limpia as unknown as Record<string, unknown>, {
        status: publicar ? 'published' : 'draft',
        presenterRef,
        updatedAt: ahora,
        ...(antes.exists ? {} : { createdAt: ahora, followersCount: 0 }),
        ...(publicar && !(antes.exists && antes.get('status') === 'published') ? { publishedAt: ahora } : {}),
      }, FieldValue.delete()), { merge: true });
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
    /* Cualquiera de las caras de la sesión: la heredada por su vínculo, un alter ego por su entidad (F4). */
    if (!perfil?.exists || (await cuentaDelPerfilLeido(db, identidad, perfil.data() as PerfilDeIdentidad)) !== cuenta) throw new PageError('identidad');
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
