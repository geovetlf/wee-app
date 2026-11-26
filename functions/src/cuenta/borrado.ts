import { createHash } from 'crypto';
import { cuentaDeIdentidad, PerfilDeIdentidad, PREFIJO_PERFIL_WEE, tipoDeIdentidad } from '../social/econtact';

/*
 * ELIMINAR LA CUENTA DE WEË, DE TODO WEË (encargo del dueño, 2026-11-22).
 *
 * Apple y Google exigen que una persona pueda borrar su cuenta desde la app.
 * Esto es la LÓGICA, sin Firestore: qué se comprueba, de quién son las caras y
 * qué se borra en qué orden. Quien toca Firestore, Storage y Auth es
 * `almacenFirestore.ts`.
 *
 * DESDE EL 2026-11-22 ESTE BORRADO NO SE HACE AL PEDIRLO: pedir «Eliminar
 * cuenta» DESACTIVA (`desactivar.ts`) y la persona tiene 30 días para volver.
 * Este plan lo ejecuta la tarea diaria `borrarCuentasVencidas` cuando vence el
 * plazo (y, en el acto, solo para una cuenta sin ningún perfil).
 * Lo que sigue describe ese borrado definitivo, que no ha cambiado.
 *
 * ── QUIÉN PUEDE ─────────────────────────────────────────────────────────────
 *   · una sesión (la cuenta solo se borra a sí misma: nunca se recibe un uid);
 *   · una confirmación EXPLÍCITA en los datos, `confirmacion: CONFIRMACION_DE_BORRADO`,
 *     que es una constante y no una palabra: no depende del idioma de la app;
 *   · un inicio de sesión RECIENTE (`auth_time` de los últimos 10 min). Si no,
 *     `reautenticar`: la app pide cerrar sesión y volver a entrar. Un teléfono
 *     olvidado desbloqueado no basta para borrar la vida de alguien.
 *
 * ── LAS DOS CARAS ───────────────────────────────────────────────────────────
 * Perfil Real (`users/<uid>`, y los antiguos con id automático que dicen
 * `uid == <cuenta>`) y Perfil Weë. El Perfil Weë se BUSCA en el vínculo que
 * guarda el Perfil Real (`linkedAccountId`) y en su sitio canónico, y solo se
 * acepta si SU documento dice que es de esta cuenta (`cuentaDeIdentidad`): el
 * prefijo dice dónde mirar, nunca de quién es.
 *
 * ── N CARAS (F4 del plan de alter egos, 2026-11-23) ─────────────────────────
 * Una cuenta puede tener varios Perfiles Weë: la cara heredada y sus alter egos
 * (`ent_…`). `resolverIdentidades` los junta todos (`perfilesWee`): la heredada
 * como siempre, y los alter egos que da `alterEgosDe` —`accounts.identidadesWee`
 * y las entidades `WEE_PROFILE` de la cuenta, que escribe solo el servidor—. El
 * personaje, el avatar, el contenido y las carpetas se borran POR CADA cara.
 * Y también las WEË PAGES de la cuenta (hueco detectado en F1): cada Página con
 * su `private/ownership`, su @usuario reservado, quién la sigue y su carpeta
 * `pages/<id>/` del Storage.
 *
 * ── QUÉ SE BORRA (en este orden) ────────────────────────────────────────────
 *   1. El personaje del Perfil Weë, con `borrarTodoDelPersonaje` (pase de
 *      autonomía —apagado al borrarse, así que nada más se cobra—, ficha,
 *      material, bandeja, registro y memoria).
 *   2. El avatar del Perfil Weë y sus fuentes (Storage `ai-avatar/`,
 *      `avatar-replacement/`, `face-swap/`).
 *   3. Publicaciones de las dos caras (`posts`), con sus votos de encuesta
 *      (`pollVotes`) y lo que otros dejaron en ellas (`comments`, `likes`, `votes`).
 *   4. Lo que la persona dejó en lo de otros: `comments`, `likes`, `votes` (con
 *      sus contadores ajustados en la publicación), `commentVotes`.
 *   5. El grafo: `follows` en las dos direcciones, `econtacts`, `businessFollows`.
 *      (`follows` es código muerto y sus contadores ya no se escriben desde la
 *      app —ver `firestore.rules`—; se borran los documentos y no se tocan contadores.)
 *   6. `notifications` que recibió y las que generó para otros (llevan su nombre).
 *   7. Comunidades: su fila en `communities/{c}/members` (y el `memberCount`) y
 *      su puesto en `moderators`. La comunidad, si la creó, se QUEDA: es un sitio
 *      de más gente.
 *   8. WeeTalk: ver `weetalk` más abajo.
 *   9. Lo de la CUENTA en Weë AI: `creatorProjects`, `creatorJobs` (y su
 *      `private`), `brainChats` (y sus mensajes), `creatorInterests`, `assets`,
 *      `elements`, `projectItems`, `scenes`, `shots`, `brainUsage`, `aiRateLimits`;
 *      y además `pushTokens`, `moderationLimits` y los negocios heredados de
 *      Weë Business (`businesses` con `ownerId`, retirado).
 *  10. El núcleo de identidad: `entities` de la cuenta, `accountNumbers` y
 *      `accounts/{uid}` con sus miembros y operaciones.
 *  11. Storage: `users/<id>/`, `images/posts/<id>/`, `images/profile/<id>/` de
 *      cada cara (fotos de WeeTalk, subidas de Weë AI, Brain, avatar…).
 *  12. Los documentos `users` de las dos caras, con TODAS sus subcolecciones
 *      (`private`, `bookmarks`, `writerDocuments`, `character*`…).
 *  13. El usuario de Firebase Auth.
 *
 * Los perfiles y Auth van AL FINAL a propósito: mientras existan, un reintento
 * vuelve a encontrar las dos caras y termina lo que faltara. Cada paso es
 * idempotente (borrar lo que ya no está no falla), así que un fallo a medias se
 * arregla repitiendo.
 *
 * ── WEETALK ─────────────────────────────────────────────────────────────────
 * La conversación es también del otro: NO se borra. Los mensajes que escribió
 * la persona se VACÍAN (`content: ''`, sin imagen, archivo ni audio,
 * `deleted: true`, `remitenteEliminado: true`) y su ficha en `participantsData`
 * queda sin nombre ni foto con `cuentaEliminada: true`. El otro conserva SUS
 * mensajes y ve que la otra cuenta ya no existe. Si todos los participantes son
 * caras de esta misma cuenta, la conversación se borra entera.
 *
 * ── QUÉ NO SE BORRA, Y POR QUÉ ──────────────────────────────────────────────
 * `COLECCIONES_QUE_NO_SE_TOCAN`. Son registros contables o de seguridad: el
 * libro de Credits es la única verdad del saldo y del circulante, y los pagos
 * son dinero de verdad. No se borran ni se reescriben (reescribir su `userId`
 * desordenaría la reconciliación de reservas: docs/CREDITS.md, C-05). Solo
 * guardan el identificador de la cuenta, nunca nombre ni correo, y una vez
 * borrados los dos perfiles y el usuario de Auth ese identificador ya no lleva
 * a nadie: así quedan desvinculados de los datos personales. El SALDO vive en
 * `users.creditsBalance` y se pierde con el perfil (la app lo dice antes).
 */

export const CONFIRMACION_DE_BORRADO = 'ELIMINAR_MI_CUENTA';
export const VENTANA_DE_INICIO_RECIENTE_S = 10 * 60;
export const COLECCION_DE_AUDITORIA = 'accountDeletions';

/** Registros contables y de moderación: este flujo NUNCA los borra ni los reescribe. */
export const COLECCIONES_QUE_NO_SE_TOCAN: readonly string[] = Object.freeze([
  'creditTransactions', // el libro de Credits
  'creditStats', // el circulante: agregado, sin personas
  'transactions', // libro heredado
  'wallets', // billetera heredada que el Credit Engine migra
  'payments', 'refunds', 'revenue', // libros de dinero de verdad
  'aiGenerations', // coste de proveedor frente a Credits cobrados
  'reports', // denuncias: la señal de alguien sobre algo, y su auditoría
  'posts/{postId}/pollVotes de publicaciones AJENAS', // un voto anónimo en el recuento de otro (id = uid, sin datos)
]);

/** Las subcarpetas del avatar del Perfil Weë en Storage (`functions/src/generateAvatar.ts`, `services/avatarGenerationService.ts`). */
export const CARPETAS_DEL_AVATAR: readonly string[] = Object.freeze(['ai-avatar', 'avatar-replacement', 'face-swap']);

export type AjusteDeContador = 'comentarioDelPost' | 'likeDelPost' | 'votoDelPost';

export type Paso =
  | { tipo: 'personaje'; perfilId: string }
  | { tipo: 'storage'; prefijo: string }
  /** Las publicaciones de esta cara y lo que cuelga de ellas. */
  | { tipo: 'publicaciones'; identidad: string }
  /** Borra cada documento que cumpla `campo op valor`; `recursivo` arrastra sus subcolecciones. */
  | { tipo: 'consulta'; coleccion: string; campo: string; op: '==' | 'array-contains'; valor: string; recursivo?: boolean; ajuste?: AjusteDeContador }
  /** Documentos cuyo id empieza por `prefijo` (contadores por día: `aiRateLimits/<uid>_<día>`). */
  | { tipo: 'prefijoDeId'; coleccion: string; prefijo: string }
  /** Un documento con todas sus subcolecciones. */
  | { tipo: 'documento'; ruta: string }
  | { tipo: 'comunidades'; identidad: string; comunidades: string[] }
  | { tipo: 'weetalk'; identidad: string; identidades: string[] }
  | { tipo: 'perfiles'; rutas: string[] }
  /** Las Weë Pages de la cuenta (F4): documento, `private/ownership`, @usuario, seguidores y carpeta del Storage. */
  | { tipo: 'paginas'; cuentaId: string }
  | { tipo: 'auth'; uid: string };

export interface PerfilGuardado extends PerfilDeIdentidad {
  joinedCommunities?: unknown;
}

export interface DocumentoDePerfil {
  id: string;
  datos: PerfilGuardado;
}

export interface IdentidadesDeLaCuenta {
  cuentaId: string;
  /** Ids de los documentos `users` del Perfil Real (normalmente uno: `<uid>`). */
  documentosReales: string[];
  /** Id del documento del PRIMER Perfil Weë (compatibilidad: el heredado si lo hay). */
  perfilWee: string | null;
  /** TODOS los Perfiles Weë de la cuenta (F4): la cara heredada confirmada y sus alter egos. */
  perfilesWee: string[];
  /** Los identificadores con los que la persona firma contenido: la cuenta y, si hay, su cara Weë. */
  identidades: string[];
  /** Comunidades a las que pertenece alguna de las caras (`joinedCommunities`). */
  comunidades: string[];
}

export interface DependenciasDelBorrado {
  ahora(): number;
  /** `users/<uid>` y los perfiles antiguos con id automático que dicen `uid == <uid>`. */
  perfilesRealesDe(uid: string): Promise<DocumentoDePerfil[]>;
  leerPerfil(id: string): Promise<PerfilGuardado | null>;
  /**
   * Los alter egos de la cuenta (F4): los de `accounts.identidadesWee` y los de sus entidades `WEE_PROFILE`, ya
   * comprobados por quien los lee (lo escribe solo el servidor). Opcional: sin él, solo la cara heredada.
   */
  alterEgosDe?(cuentaId: string): Promise<string[]>;
  /** Hace un paso. Devuelve cuántas cosas tocó (documentos, archivos…). Idempotente. */
  ejecutar(paso: Paso): Promise<number>;
  /** Escribe (con merge) el registro de auditoría, que no lleva datos personales. */
  auditar(huella: string, datos: RegistroDeAuditoria): Promise<void>;
}

export interface RegistroDeAuditoria {
  estado: 'enCurso' | 'terminado' | 'fallido';
  actualizadoEn: number;
  empezadoEn?: number;
  terminadoEn?: number;
  /** El TIPO de paso que falló (nunca un id ni un mensaje con datos). */
  pasoFallido?: string;
  /** Cuántas cosas se tocaron por tipo de paso. */
  resumen?: Record<string, number>;
}

export type MotivoDeRechazo = 'sinSesion' | 'sinConfirmacion' | 'reautenticar';

export interface SesionDeLaPeticion {
  uid: string;
  /** `auth_time` del token, en SEGUNDOS desde la época. */
  authTime?: number;
}

/** ¿Se puede empezar? Sin efectos: solo mira la sesión y los datos. */
export function validarPeticion(sesion: SesionDeLaPeticion | null | undefined, datos: unknown, ahoraMs: number): { ok: true } | { ok: false; motivo: MotivoDeRechazo } {
  if (!sesion || typeof sesion.uid !== 'string' || !sesion.uid) return { ok: false, motivo: 'sinSesion' };
  const confirmacion = (datos as { confirmacion?: unknown } | null | undefined)?.confirmacion;
  if (confirmacion !== CONFIRMACION_DE_BORRADO) return { ok: false, motivo: 'sinConfirmacion' };
  const authTime = Number(sesion.authTime);
  if (!Number.isFinite(authTime) || authTime <= 0) return { ok: false, motivo: 'reautenticar' };
  const edadS = ahoraMs / 1000 - authTime;
  /* Un reloj algo adelantado en el token no es motivo para rechazar; uno muy viejo, sí. */
  if (edadS > VENTANA_DE_INICIO_RECIENTE_S || edadS < -300) return { ok: false, motivo: 'reautenticar' };
  return { ok: true };
}

/** El id del registro de auditoría: una huella de la cuenta, no la cuenta. */
export const huellaDeCuenta = (uid: string): string => createHash('sha256').update(`wee-account-deletion:${uid}`).digest('hex');

const comunidadesDe = (datos: PerfilGuardado | null | undefined): string[] =>
  Array.isArray(datos?.joinedCommunities) ? (datos!.joinedCommunities as unknown[]).filter((c): c is string => typeof c === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(c)) : [];

/** De quién son las caras. Se LEE cada documento; nunca se deduce del prefijo. */
export async function resolverIdentidades(deps: DependenciasDelBorrado, uid: string): Promise<IdentidadesDeLaCuenta> {
  const reales = (await deps.perfilesRealesDe(uid)).filter((d) => tipoDeIdentidad(d.datos?.uid) === 'real' && cuentaDeIdentidad(d.datos?.uid, d.datos) === uid);
  const documentosReales = [...new Set(reales.map((d) => d.id))];

  /* Dónde mirar: el vínculo que guarda el Perfil Real y el sitio canónico de la cara Weë. */
  const candidatos = new Set<string>();
  for (const d of reales) if (typeof d.datos.linkedAccountId === 'string' && d.datos.linkedAccountId) candidatos.add(d.datos.linkedAccountId);
  candidatos.add(`${PREFIJO_PERFIL_WEE}${uid}`);

  const perfilesWee: string[] = [];
  const datosWee: (PerfilGuardado | null)[] = [];
  for (const c of candidatos) {
    if (!/^[A-Za-z0-9_-]{3,128}$/.test(c) || tipoDeIdentidad(c) !== 'wee') continue;
    const perfil = await deps.leerPerfil(c);
    if (perfil && cuentaDeIdentidad(c, perfil) === uid) { perfilesWee.push(c); datosWee.push(perfil); break; }
  }
  /* Los alter egos: su dueño lo dice la entidad o la cuenta, nunca la forma (F4). */
  for (const c of deps.alterEgosDe ? await deps.alterEgosDe(uid) : []) {
    if (typeof c !== 'string' || !/^[A-Za-z0-9_-]{3,128}$/.test(c) || c === uid || perfilesWee.includes(c)) continue;
    /* Sin documento no queda nada que ocultar ni borrar de esa cara (su plan de borrado acaba con el perfil). */
    const perfil = await deps.leerPerfil(c);
    if (!perfil) continue;
    perfilesWee.push(c);
    datosWee.push(perfil);
  }

  const comunidades = [...new Set([...reales.flatMap((d) => comunidadesDe(d.datos)), ...datosWee.flatMap((d) => comunidadesDe(d))])];
  return { cuentaId: uid, documentosReales, perfilWee: perfilesWee[0] ?? null, perfilesWee, identidades: [uid, ...perfilesWee], comunidades };
}

/** El orden de los pasos. Pura: la misma entrada da siempre el mismo plan. */
export function planDeBorrado(ids: IdentidadesDeLaCuenta): Paso[] {
  const { cuentaId, identidades } = ids;
  const perfilesWee = ids.perfilesWee ?? (ids.perfilWee ? [ids.perfilWee] : []);
  const plan: Paso[] = [];

  /* El personaje y el avatar de CADA Perfil Weë (F4: la heredada y todos los alter egos). */
  for (const perfilWee of perfilesWee) {
    plan.push({ tipo: 'personaje', perfilId: perfilWee });
    for (const carpeta of CARPETAS_DEL_AVATAR) plan.push({ tipo: 'storage', prefijo: `users/${perfilWee}/${carpeta}/` });
  }

  for (const id of identidades) plan.push({ tipo: 'publicaciones', identidad: id });

  for (const id of identidades) {
    plan.push({ tipo: 'consulta', coleccion: 'comments', campo: 'userId', op: '==', valor: id, ajuste: 'comentarioDelPost' });
    plan.push({ tipo: 'consulta', coleccion: 'likes', campo: 'userId', op: '==', valor: id, ajuste: 'likeDelPost' });
    plan.push({ tipo: 'consulta', coleccion: 'votes', campo: 'userId', op: '==', valor: id, ajuste: 'votoDelPost' });
    plan.push({ tipo: 'consulta', coleccion: 'commentVotes', campo: 'userId', op: '==', valor: id });
    plan.push({ tipo: 'consulta', coleccion: 'follows', campo: 'followerId', op: '==', valor: id });
    plan.push({ tipo: 'consulta', coleccion: 'follows', campo: 'followingId', op: '==', valor: id });
    plan.push({ tipo: 'consulta', coleccion: 'econtacts', campo: 'users', op: 'array-contains', valor: id });
    plan.push({ tipo: 'consulta', coleccion: 'notifications', campo: 'recipientId', op: '==', valor: id });
    plan.push({ tipo: 'consulta', coleccion: 'notifications', campo: 'senderId', op: '==', valor: id });
    plan.push({ tipo: 'consulta', coleccion: 'businessFollows', campo: 'userId', op: '==', valor: id });
    // Que ningún personaje (de nadie) recuerde lo que esta persona le dijo (auditoría I7).
    plan.push({ tipo: 'consulta', coleccion: 'characterMemories', campo: 'conQuien', op: '==', valor: id });
    plan.push({ tipo: 'comunidades', identidad: id, comunidades: ids.comunidades });
    plan.push({ tipo: 'weetalk', identidad: id, identidades });
  }

  /* Lo de la cuenta (Weë AI, material, negocios heredados): todo con el uid de la cuenta. */
  plan.push({ tipo: 'consulta', coleccion: 'creatorProjects', campo: 'userId', op: '==', valor: cuentaId });
  plan.push({ tipo: 'consulta', coleccion: 'creatorJobs', campo: 'userId', op: '==', valor: cuentaId, recursivo: true });
  plan.push({ tipo: 'consulta', coleccion: 'brainChats', campo: 'userId', op: '==', valor: cuentaId, recursivo: true });
  /* WITE: los trabajos de «Transform Your Identity» (personaje, consentimiento, linaje). Los originales viven en users/<cuenta>/. */
  plan.push({ tipo: 'consulta', coleccion: 'identityTransformJobs', campo: 'accountId', op: '==', valor: cuentaId });
  plan.push({ tipo: 'consulta', coleccion: 'creatorInterests', campo: 'userId', op: '==', valor: cuentaId });
  for (const coleccion of ['assets', 'elements', 'projectItems', 'scenes', 'shots']) {
    plan.push({ tipo: 'consulta', coleccion, campo: 'ownerAccountId', op: '==', valor: cuentaId });
  }
  plan.push({ tipo: 'consulta', coleccion: 'businesses', campo: 'ownerId', op: '==', valor: cuentaId, recursivo: true });
  plan.push({ tipo: 'documento', ruta: `brainUsage/${cuentaId}` });
  plan.push({ tipo: 'prefijoDeId', coleccion: 'aiRateLimits', prefijo: `${cuentaId}_` });
  plan.push({ tipo: 'documento', ruta: `pushTokens/${cuentaId}` });
  plan.push({ tipo: 'documento', ruta: `moderationLimits/${cuentaId}` });

  /* Las Weë Pages de la cuenta (F4). Antes que `accounts/{cuenta}`: su índice privado vive dentro. */
  plan.push({ tipo: 'paginas', cuentaId });

  /* El núcleo de identidad (Account → caras). */
  plan.push({ tipo: 'consulta', coleccion: 'entities', campo: 'ownerAccountId', op: '==', valor: cuentaId });
  plan.push({ tipo: 'consulta', coleccion: 'accountNumbers', campo: 'accountId', op: '==', valor: cuentaId });
  plan.push({ tipo: 'documento', ruta: `accounts/${cuentaId}` });

  for (const id of identidades) {
    for (const raiz of ['users', 'images/posts', 'images/profile']) plan.push({ tipo: 'storage', prefijo: `${raiz}/${id}/` });
  }

  const rutas = [...new Set([...ids.documentosReales, ...perfilesWee])].map((id) => `users/${id}`);
  if (rutas.length) plan.push({ tipo: 'perfiles', rutas });
  plan.push({ tipo: 'auth', uid: cuentaId });
  return plan;
}

/**
 * EL BORRADO DE UN SOLO ALTER EGO (plan de alter egos F2 → F4). SIN CABLEAR.
 *
 * Es el contrato que la fase 4 ejecuta DESPUÉS de `retirarAlterEgo` (Core), que
 * ya dejó la entidad `RETIRED` y la quitó de `identidadesWee`. Borrado
 * INMEDIATO (D10). Es `planDeBorrado` recortado a UNA identidad: su personaje
 * (pase, ficha, material), su avatar, sus publicaciones y lo que dejó en lo de
 * otros, su grafo (ẄContacts incluidos), sus avisos, sus comunidades, WeeTalk,
 * sus carpetas de Storage y su documento de `users`. NO toca nada de la
 * cuenta: ni Weë AI, ni Credits, ni `entities`, ni `accounts`, ni Auth, ni las
 * demás caras. Pura: la misma entrada da el mismo plan.
 */
export function planDeBorradoDeUnAlterEgo(identidad: string, comunidades: readonly string[]): Paso[] {
  const plan: Paso[] = [{ tipo: 'personaje', perfilId: identidad }];
  for (const carpeta of CARPETAS_DEL_AVATAR) plan.push({ tipo: 'storage', prefijo: `users/${identidad}/${carpeta}/` });
  plan.push({ tipo: 'publicaciones', identidad });
  plan.push({ tipo: 'consulta', coleccion: 'comments', campo: 'userId', op: '==', valor: identidad, ajuste: 'comentarioDelPost' });
  plan.push({ tipo: 'consulta', coleccion: 'likes', campo: 'userId', op: '==', valor: identidad, ajuste: 'likeDelPost' });
  plan.push({ tipo: 'consulta', coleccion: 'votes', campo: 'userId', op: '==', valor: identidad, ajuste: 'votoDelPost' });
  plan.push({ tipo: 'consulta', coleccion: 'commentVotes', campo: 'userId', op: '==', valor: identidad });
  plan.push({ tipo: 'consulta', coleccion: 'follows', campo: 'followerId', op: '==', valor: identidad });
  plan.push({ tipo: 'consulta', coleccion: 'follows', campo: 'followingId', op: '==', valor: identidad });
  plan.push({ tipo: 'consulta', coleccion: 'econtacts', campo: 'users', op: 'array-contains', valor: identidad });
  plan.push({ tipo: 'consulta', coleccion: 'notifications', campo: 'recipientId', op: '==', valor: identidad });
  plan.push({ tipo: 'consulta', coleccion: 'notifications', campo: 'senderId', op: '==', valor: identidad });
  plan.push({ tipo: 'consulta', coleccion: 'characterMemories', campo: 'conQuien', op: '==', valor: identidad });
  plan.push({ tipo: 'comunidades', identidad, comunidades: [...comunidades] });
  plan.push({ tipo: 'weetalk', identidad, identidades: [identidad] });
  for (const raiz of ['users', 'images/posts', 'images/profile']) plan.push({ tipo: 'storage', prefijo: `${raiz}/${identidad}/` });
  plan.push({ tipo: 'perfiles', rutas: [`users/${identidad}`] });
  return plan;
}

/** Cómo se cuenta un paso en la auditoría: su tipo y su colección, nunca un id. */
export const claveDelPaso = (p: Paso): string => {
  if (p.tipo === 'consulta' || p.tipo === 'prefijoDeId') return `${p.tipo}:${p.coleccion}`;
  if (p.tipo === 'documento') return `documento:${p.ruta.split('/')[0]}`;
  if (p.tipo === 'storage') {
    /* `users/<id>/ai-avatar/` → `storage:users/ai-avatar`; `images/posts/<id>/` → `storage:images/posts`. */
    const partes = p.prefijo.split('/').filter(Boolean);
    return partes[0] === 'users' ? `storage:users${partes[2] ? `/${partes[2]}` : ''}` : `storage:${partes.slice(0, 2).join('/')}`;
  }
  return p.tipo;
};

export interface ResultadoDelBorrado {
  pasos: number;
  resumen: Record<string, number>;
  /** ¿Había un Perfil Weë (y con él, personaje y avatar)? */
  conPerfilWee: boolean;
}

/**
 * Borra la cuenta entera. Si un paso falla, la auditoría queda en `fallido`
 * con el TIPO del paso y el error sube: repetir la llamada retoma el trabajo,
 * porque cada paso es idempotente y los perfiles y Auth van al final.
 */
export async function borrarCuenta(deps: DependenciasDelBorrado, uid: string): Promise<ResultadoDelBorrado> {
  const ids = await resolverIdentidades(deps, uid);
  const plan = planDeBorrado(ids);
  const huella = huellaDeCuenta(uid);
  const empezadoEn = deps.ahora();
  await deps.auditar(huella, { estado: 'enCurso', empezadoEn, actualizadoEn: empezadoEn });

  const resumen: Record<string, number> = {};
  for (const paso of plan) {
    try {
      const n = await deps.ejecutar(paso);
      const clave = claveDelPaso(paso);
      resumen[clave] = (resumen[clave] || 0) + (Number.isFinite(n) ? n : 0);
    } catch (error) {
      await deps.auditar(huella, { estado: 'fallido', actualizadoEn: deps.ahora(), pasoFallido: claveDelPaso(paso), resumen }).catch(() => undefined);
      throw error;
    }
  }

  const terminadoEn = deps.ahora();
  await deps.auditar(huella, { estado: 'terminado', actualizadoEn: terminadoEn, terminadoEn, resumen }).catch(() => undefined);
  return { pasos: plan.length, resumen, conPerfilWee: !!ids.perfilWee };
}
