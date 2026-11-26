import { DocumentReference, FieldPath, FieldValue, getFirestore, Query } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { storageBucket } from '../engine/http';
import { borrarTodoDelPersonaje } from '../personajes/borrado';
import { apagarAutonomia, depsDeFirestore as depsDelPase } from '../personajes/servidor';
import { cuentaDeIdentidadLeida } from '../identity/compatibilidad';
import { duenaDeLaPagina, RUTA_DEL_INDICE } from '../social/pages';
import { AjusteDeContador, COLECCION_DE_AUDITORIA, DependenciasDelBorrado, DocumentoDePerfil, Paso, PerfilGuardado, RegistroDeAuditoria } from './borrado';
import { cuentaDelDocumento, DependenciasDeDesactivacion, ESTADO_DESACTIVADA, MarcaDeDesactivacion, PerfilConEstado } from './desactivar';

/*
 * EL BORRADO DE CUENTA SOBRE FIRESTORE, STORAGE Y AUTH.
 *
 * Solo ejecuta los pasos que decide `borrado.ts`. Todo por lotes pequeños
 * (`LOTE`), y cada operación es repetible: borrar lo que ya no está no falla,
 * vaciar un mensaje ya vacío deja lo mismo, y un contador solo se ajusta en el
 * MISMO lote que borra el documento que lo sumaba, así que un reintento no lo
 * descuenta dos veces.
 */

const LOTE = 200;
const db = () => getFirestore();

/* ── Contadores ──────────────────────────────────────────────────────────── */

/** Qué campo de la publicación baja cada documento borrado. */
function campoDelAjuste(ajuste: AjusteDeContador, datos: FirebaseFirestore.DocumentData): string | null {
  if (ajuste === 'comentarioDelPost') return 'comments';
  if (ajuste === 'likeDelPost') return 'likes';
  return datos.type === 'agree' ? 'agreementCount' : datos.type === 'disagree' ? 'disagreementCount' : null;
}

/**
 * Baja los contadores de las publicaciones que siguen existiendo. Nunca por
 * debajo de cero: si el contador ya estaba descuadrado, se queda en 0.
 */
async function ajustarContadores(lote: FirebaseFirestore.WriteBatch, docs: FirebaseFirestore.QueryDocumentSnapshot[], ajuste: AjusteDeContador): Promise<void> {
  const porPost = new Map<string, Map<string, number>>();
  for (const d of docs) {
    const datos = d.data();
    const postId = datos.postId;
    const campo = campoDelAjuste(ajuste, datos);
    if (typeof postId !== 'string' || !postId || postId.includes('/') || !campo) continue;
    const campos = porPost.get(postId) || new Map<string, number>();
    campos.set(campo, (campos.get(campo) || 0) + 1);
    porPost.set(postId, campos);
  }
  if (!porPost.size) return;
  const refs = [...porPost.keys()].map((id) => db().collection('posts').doc(id));
  const snaps = await db().getAll(...refs);
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const actual = snap.data() || {};
    const cambios: Record<string, unknown> = {};
    for (const [campo, n] of porPost.get(snap.id)!) {
      const valor = typeof actual[campo] === 'number' ? actual[campo] : 0;
      cambios[campo] = valor >= n ? FieldValue.increment(-n) : 0;
    }
    lote.update(snap.ref, cambios);
  }
}

/* ── Consultas ───────────────────────────────────────────────────────────── */

async function borrarConsulta(q: Query, opciones: { recursivo?: boolean; ajuste?: AjusteDeContador } = {}): Promise<number> {
  let total = 0;
  for (;;) {
    const snap = await q.limit(LOTE).get();
    if (snap.empty) return total;
    if (opciones.recursivo) {
      for (const d of snap.docs) await db().recursiveDelete(d.ref);
    } else {
      const lote = db().batch();
      if (opciones.ajuste) await ajustarContadores(lote, snap.docs, opciones.ajuste);
      snap.docs.forEach((d) => lote.delete(d.ref));
      await lote.commit();
    }
    total += snap.size;
    if (snap.size < LOTE) return total;
  }
}

/** Las publicaciones de una cara: primero lo que cuelga de cada una, después la publicación con sus subcolecciones. */
async function borrarPublicaciones(identidad: string): Promise<number> {
  let total = 0;
  for (;;) {
    const snap = await db().collection('posts').where('userId', '==', identidad).limit(50).get();
    if (snap.empty) return total;
    for (const post of snap.docs) {
      for (const coleccion of ['comments', 'likes', 'votes']) total += await borrarConsulta(db().collection(coleccion).where('postId', '==', post.id));
      await db().recursiveDelete(post.ref); /* arrastra `pollVotes` */
      total++;
    }
    if (snap.size < 50) return total;
  }
}

async function borrarPorPrefijoDeId(coleccion: string, prefijo: string): Promise<number> {
  const q = db().collection(coleccion).where(FieldPath.documentId(), '>=', prefijo).where(FieldPath.documentId(), '<', `${prefijo}`);
  return borrarConsulta(q);
}

/* ── Comunidades ─────────────────────────────────────────────────────────── */

async function salirDeComunidades(identidad: string, comunidades: string[]): Promise<number> {
  let total = 0;
  for (const c of comunidades) {
    const comunidad = db().collection('communities').doc(c);
    const miembro = comunidad.collection('members').doc(identidad);
    const [snapMiembro, snapComunidad] = await db().getAll(miembro, comunidad);
    if (!snapMiembro.exists) continue;
    const lote = db().batch();
    lote.delete(miembro);
    if (snapComunidad.exists) {
      const n = snapComunidad.data()?.memberCount;
      lote.update(comunidad, { memberCount: typeof n === 'number' && n >= 1 ? FieldValue.increment(-1) : 0 });
    }
    await lote.commit();
    total++;
  }
  /* Deja de moderar las comunidades de otros. Las que creó se quedan: son sitios de más gente. */
  for (;;) {
    const snap = await db().collection('communities').where('moderators', 'array-contains', identidad).limit(LOTE).get();
    if (snap.empty) break;
    const lote = db().batch();
    snap.docs.forEach((d) => lote.update(d.ref, { moderators: FieldValue.arrayRemove(identidad) }));
    await lote.commit();
    total += snap.size;
    if (snap.size < LOTE) break;
  }
  return total;
}

/* ── WeeTalk ─────────────────────────────────────────────────────────────── */

/**
 * La conversación también es del otro: no se borra. Se vacían los mensajes
 * de esta cara y su ficha queda como «cuenta eliminada». Si todos los
 * participantes son caras de esta cuenta, la conversación se borra entera.
 */
async function retirarseDeWeeTalk(identidad: string, identidades: string[]): Promise<number> {
  let total = 0;
  let ultima: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = db().collection('conversations').where('participants', 'array-contains', identidad).orderBy(FieldPath.documentId()).limit(50);
    if (ultima) q = q.startAfter(ultima);
    const snap = await q.get();
    if (snap.empty) return total;
    for (const conv of snap.docs) {
      const participantes: unknown[] = Array.isArray(conv.data().participants) ? conv.data().participants : [];
      if (participantes.every((p) => typeof p === 'string' && identidades.includes(p))) {
        await db().recursiveDelete(conv.ref);
        total++;
        continue;
      }
      total += await vaciarMensajes(conv.ref, identidad);
      const cambios: unknown[] = [
        new FieldPath('participantsData', identidad), { displayName: '', cuentaEliminada: true },
        new FieldPath('bubbleColors', identidad), FieldValue.delete(),
        'activeInChat', FieldValue.arrayRemove(identidad),
      ];
      const ultimo = conv.data().lastMessage;
      if (ultimo && typeof ultimo === 'object' && ultimo.senderId === identidad) cambios.push(new FieldPath('lastMessage', 'content'), '');
      await (conv.ref.update as (...args: unknown[]) => Promise<unknown>)(...cambios);
    }
    ultima = snap.docs[snap.docs.length - 1];
    if (snap.size < 50) return total;
  }
}

async function vaciarMensajes(conversacion: DocumentReference, identidad: string): Promise<number> {
  let total = 0;
  let ultimo: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = conversacion.collection('messages').where('senderId', '==', identidad).orderBy(FieldPath.documentId()).limit(LOTE);
    if (ultimo) q = q.startAfter(ultimo);
    const snap = await q.get();
    if (snap.empty) return total;
    const lote = db().batch();
    snap.docs.forEach((d) => lote.update(d.ref, {
      content: '', imageUrl: null, fileUrl: null, audioUrl: null, deleted: true, remitenteEliminado: true,
    }));
    await lote.commit();
    total += snap.size;
    ultimo = snap.docs[snap.docs.length - 1];
    if (snap.size < LOTE) return total;
  }
}

/* ── Weë Pages de la cuenta (F4) ─────────────────────────────────────────── */

/**
 * Las Páginas de la cuenta: las del índice privado (`accounts/{cuenta}/pages`) y las antiguas que aún dicen la cuenta
 * en público. Solo se borra la que `private/ownership` (o, en las antiguas, el campo público) dice que es de ESTA
 * cuenta. Por cada una: su @usuario reservado (si sigue siendo suyo), quién la sigue, el documento con sus
 * subcolecciones (`private/ownership` incluida) y su carpeta `pages/<id>/` del Storage.
 */
async function borrarPaginasDeLaCuenta(cuentaId: string): Promise<number> {
  const indice = db().doc(RUTA_DEL_INDICE(cuentaId, '_')).parent;
  const [delIndice, antiguas] = await Promise.all([
    indice.limit(LOTE).get(),
    db().collection('pages').where('ownerAccountId', '==', cuentaId).limit(LOTE).get(),
  ]);
  const ids = [...new Set([...delIndice.docs.map((d) => d.id), ...antiguas.docs.map((d) => d.id)])].filter((id) => /^[A-Za-z0-9_-]{3,128}$/.test(id));
  let total = 0;
  for (const pageId of ids) {
    const pagina = db().collection('pages').doc(pageId);
    const [snap, propiedad] = await db().getAll(pagina, pagina.collection('private').doc('ownership'));
    if ((snap.exists || propiedad.exists) && duenaDeLaPagina(propiedad.data(), snap.data()) !== cuentaId) continue;
    const handle = snap.exists ? snap.get('handle') : null;
    if (typeof handle === 'string' && handle && !handle.includes('/')) {
      const reserva = db().collection('pageHandles').doc(handle);
      const r = await reserva.get();
      if (r.exists && r.get('pageId') === pageId) await reserva.delete();
    }
    total += await borrarConsulta(db().collection('pageFollows').where('pageId', '==', pageId));
    await db().recursiveDelete(pagina);
    total += 1 + (await borrarCarpeta(`pages/${pageId}/`));
  }
  for (const d of delIndice.docs) await d.ref.delete();
  return total;
}

/* ── Storage y Auth ──────────────────────────────────────────────────────── */

async function borrarCarpeta(prefijo: string): Promise<number> {
  if (!/^(users|images\/posts|images\/profile|pages)\/[A-Za-z0-9_-]{3,128}\/([A-Za-z0-9_-]+\/)?$/.test(prefijo)) throw new Error('prefijo de Storage no válido');
  const [archivos] = await storageBucket().getFiles({ prefix: prefijo });
  for (let i = 0; i < archivos.length; i += 20) {
    await Promise.all(archivos.slice(i, i + 20).map((f) => f.delete({ ignoreNotFound: true })));
  }
  return archivos.length;
}

async function borrarUsuarioDeAuth(uid: string): Promise<number> {
  try {
    await getAuth().deleteUser(uid);
    return 1;
  } catch (error) {
    if ((error as { code?: string })?.code === 'auth/user-not-found') return 0;
    throw error;
  }
}

/* ── Las dependencias ────────────────────────────────────────────────────── */

async function ejecutar(paso: Paso): Promise<number> {
  switch (paso.tipo) {
    case 'personaje': {
      const r = await borrarTodoDelPersonaje(paso.perfilId);
      return r.documentos + r.archivos;
    }
    case 'storage': return borrarCarpeta(paso.prefijo);
    case 'publicaciones': return borrarPublicaciones(paso.identidad);
    case 'consulta': return borrarConsulta(db().collection(paso.coleccion).where(paso.campo, paso.op, paso.valor), paso);
    case 'prefijoDeId': return borrarPorPrefijoDeId(paso.coleccion, paso.prefijo);
    case 'documento': {
      await db().recursiveDelete(db().doc(paso.ruta));
      return 1;
    }
    case 'comunidades': return salirDeComunidades(paso.identidad, paso.comunidades);
    case 'weetalk': return retirarseDeWeeTalk(paso.identidad, paso.identidades);
    case 'perfiles': {
      for (const ruta of paso.rutas) await db().recursiveDelete(db().doc(ruta));
      return paso.rutas.length;
    }
    case 'auth': return borrarUsuarioDeAuth(paso.uid);
    case 'paginas': return borrarPaginasDeLaCuenta(paso.cuentaId);
  }
}

export const dependenciasDeFirestore = (): DependenciasDelBorrado => ({
  ahora: () => Date.now(),
  async perfilesRealesDe(uid: string): Promise<DocumentoDePerfil[]> {
    const [canonico, antiguos] = await Promise.all([
      db().collection('users').doc(uid).get(),
      db().collection('users').where('uid', '==', uid).limit(20).get(),
    ]);
    const docs = new Map<string, DocumentoDePerfil>();
    if (canonico.exists) docs.set(canonico.id, { id: canonico.id, datos: canonico.data() as PerfilGuardado });
    for (const d of antiguos.docs) docs.set(d.id, { id: d.id, datos: d.data() as PerfilGuardado });
    return [...docs.values()];
  },
  async leerPerfil(id: string): Promise<PerfilGuardado | null> {
    const snap = await db().collection('users').doc(id).get();
    return snap.exists ? (snap.data() as PerfilGuardado) : null;
  },
  /**
   * Los alter egos de la cuenta (F4): los de `accounts.identidadesWee` que el resolutor confirma, y los de sus entidades
   * `WEE_PROFILE` —también las RETIRADAS, por si una retirada se quedó a medias: la entidad, que escribe solo el
   * servidor, ya dice de quién es—.
   */
  async alterEgosDe(cuentaId: string): Promise<string[]> {
    const [cuenta, entidades] = await Promise.all([
      db().collection('accounts').doc(cuentaId).get(),
      db().collection('entities').where('ownerAccountId', '==', cuentaId).get(),
    ]);
    const out = new Set<string>();
    const lista: unknown[] = cuenta.exists && Array.isArray(cuenta.get('identidadesWee')) ? cuenta.get('identidadesWee') : [];
    for (const id of lista) if (typeof id === 'string' && (await cuentaDeIdentidadLeida(db(), id)) === cuentaId) out.add(id);
    for (const d of entidades.docs) {
      const e = d.data();
      const uid = e?.profileRef?.uid;
      if (e?.entityType === 'WEE_PROFILE' && e.ownerAccountId === cuentaId && typeof uid === 'string' && uid !== cuentaId) out.add(uid);
    }
    return [...out];
  },
  ejecutar,
  async auditar(huella: string, datos: RegistroDeAuditoria): Promise<void> {
    await db().collection(COLECCION_DE_AUDITORIA).doc(huella).set(
      { ...datos, ...(datos.estado === 'enCurso' ? { intentos: FieldValue.increment(1) } : {}) },
      { merge: true },
    );
  },
});

/* ── Desactivar, reactivar y vencidas (desactivar.ts) ───────────────────── */

/** Marca como ocultas las publicaciones VISIBLES de esta cara; las que ya lo estaban no se cuentan. */
async function ocultarPublicaciones(identidad: string): Promise<number> {
  let total = 0;
  let ultimo: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = db().collection('posts').where('userId', '==', identidad).orderBy(FieldPath.documentId()).limit(LOTE);
    if (ultimo) q = q.startAfter(ultimo);
    const snap = await q.get();
    if (snap.empty) return total;
    const aOcultar = snap.docs.filter((d) => d.data().ocultaPorDesactivacion !== true);
    if (aOcultar.length) {
      const lote = db().batch();
      aOcultar.forEach((d) => lote.update(d.ref, { ocultaPorDesactivacion: true }));
      await lote.commit();
      total += aOcultar.length;
    }
    ultimo = snap.docs[snap.docs.length - 1];
    if (snap.size < LOTE) return total;
  }
}

/** Vuelve a mostrar SOLO las que ocultó la desactivación. */
async function mostrarPublicaciones(identidad: string): Promise<number> {
  let total = 0;
  for (;;) {
    const snap = await db().collection('posts').where('userId', '==', identidad).where('ocultaPorDesactivacion', '==', true).limit(LOTE).get();
    if (snap.empty) return total;
    const lote = db().batch();
    snap.docs.forEach((d) => lote.update(d.ref, { ocultaPorDesactivacion: FieldValue.delete() }));
    await lote.commit();
    total += snap.size;
    if (snap.size < LOTE) return total;
  }
}

async function marcarPerfiles(ids: string[], marca: MarcaDeDesactivacion | null): Promise<void> {
  const lote = db().batch();
  const campos = marca
    ? { ...marca }
    : { cuentaEstado: FieldValue.delete(), desactivadaEn: FieldValue.delete(), borrarEn: FieldValue.delete() };
  for (const id of ids) lote.update(db().collection('users').doc(id), campos);
  await lote.commit();
}

/** El pase se apaga con la función del propio módulo de autonomía; sin pase no hay nada que apagar. */
async function apagarPase(cuentaId: string, perfilWee: string): Promise<void> {
  await apagarAutonomia(depsDelPase(), cuentaId, perfilWee);
}

async function cuentasVencidas(ahora: number, limite: number): Promise<string[]> {
  const snap = await db().collection('users').where('cuentaEstado', '==', ESTADO_DESACTIVADA).where('borrarEn', '<=', ahora).limit(limite).get();
  const cuentas = new Set<string>();
  for (const d of snap.docs) {
    const datos = d.data() as PerfilConEstado;
    /* Lo heredado por su vínculo; un alter ego marcado, por su entidad (F4). */
    const c = cuentaDelDocumento(datos) ?? (typeof datos.uid === 'string' ? await cuentaDeIdentidadLeida(db(), datos.uid) : null);
    if (c) cuentas.add(c);
  }
  return [...cuentas];
}

export const dependenciasDeDesactivacion = (): DependenciasDeDesactivacion => ({
  ...dependenciasDeFirestore(),
  marcarPerfiles,
  ocultarPublicaciones,
  mostrarPublicaciones,
  apagarPase,
  cuentasVencidas,
});
