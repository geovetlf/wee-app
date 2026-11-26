/**
 * WITE · CHARACTER IDENTITY RESOLVER.
 *
 * No hay una segunda biblioteca de personajes: un personaje de Weë ES un Perfil Weë de la cuenta (el heredado
 * `hidi_<uid>` o un alter ego `ent_…`), y su dueño sale de la regla única de identidades (`cuentaDeIdentidadLeida`).
 *
 * Permisos visual y vocal, por separado:
 *   · visual → solo si el personaje es de la cuenta Y tiene un retrato en el Storage de esa cuenta (lo único que el
 *     motor acepta como referencia: `direccionDeLaCuenta`).
 *   · voz    → hoy NUNCA: ningún personaje tiene perfil de voz en Weë. Se dice tal cual en lugar de fingirlo.
 *
 * Personajes de otras cuentas: Weë no tiene todavía ningún modelo de licencia o cesión de personajes, así que no se
 * listan ni se aceptan. Disponibilidad no es autorización.
 */
import type { LectorDeDocumentos } from '../identity/compatibilidad';
import { cuentaDeIdentidadLeida, identidadesDeLaCuenta } from '../identity/compatibilidad';
import { direccionDeLaCuenta } from '../engine/http';

export type PermisoVisual = 'permitido' | 'sin_referencia';
export type PermisoDeVoz = 'no_disponible';

export interface PaqueteDeIdentidad {
  characterId: string;
  ownerAccountId: string;
  nombre: string;
  /** La referencia visual que verá el modelo (retrato del personaje), o null si no tiene ninguna utilizable. */
  referenciaVisual: string | null;
  propio: true;
  permisos: { visual: PermisoVisual; voz: PermisoDeVoz };
  /** Para la procedencia: con qué versión del perfil se transformó. */
  version: number | null;
}

interface PerfilLeido {
  uid?: string;
  displayName?: string;
  aiAvatarPortraitUrl?: string;
  photoURL?: string;
  updatedAt?: unknown;
}

const milis = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && typeof (v as { toMillis?: () => number }).toMillis === 'function') return (v as { toMillis: () => number }).toMillis();
  return null;
};

/** La primera imagen del perfil que esté en el Storage de la cuenta: primero el retrato del avatar, luego la foto. */
export const referenciaUtilizable = (perfil: PerfilLeido, accountId: string): string | null => {
  for (const url of [perfil.aiAvatarPortraitUrl, perfil.photoURL]) {
    if (typeof url !== 'string' || !url) continue;
    const d = direccionDeLaCuenta(url, accountId);
    if (d.ok) return d.url;
  }
  return null;
};

const leerPerfil = async (db: LectorDeDocumentos, id: string): Promise<PerfilLeido | null> => {
  const snap = await db.collection('users').doc(id).get();
  return snap.exists ? (snap.data() as PerfilLeido) : null;
};

export const paqueteDe = (characterId: string, accountId: string, perfil: PerfilLeido): PaqueteDeIdentidad => {
  const referenciaVisual = referenciaUtilizable(perfil, accountId);
  return {
    characterId,
    ownerAccountId: accountId,
    nombre: typeof perfil.displayName === 'string' ? perfil.displayName.slice(0, 80) : '',
    referenciaVisual,
    propio: true,
    permisos: { visual: referenciaVisual ? 'permitido' : 'sin_referencia', voz: 'no_disponible' },
    version: milis(perfil.updatedAt),
  };
};

/** Los personajes que la cuenta puede usar: sus Perfiles Weë vivos (nunca el Perfil Real, que es la persona). */
export const personajesDeLaCuenta = async (db: LectorDeDocumentos, accountId: string): Promise<PaqueteDeIdentidad[]> => {
  const ids = (await identidadesDeLaCuenta(db, accountId)).filter((id) => id !== accountId);
  const paquetes: PaqueteDeIdentidad[] = [];
  for (const id of ids) {
    if ((await cuentaDeIdentidadLeida(db, id)) !== accountId) continue;
    const perfil = await leerPerfil(db, id);
    if (perfil) paquetes.push(paqueteDe(id, accountId, perfil));
  }
  return paquetes;
};

/** Un personaje concreto, con la misma regla: de la cuenta o nada. */
export const resolverPersonaje = async (db: LectorDeDocumentos, accountId: string, characterId: string): Promise<PaqueteDeIdentidad | null> => {
  if (characterId === accountId) return null;
  if (!(await identidadesDeLaCuenta(db, accountId)).includes(characterId)) return null;
  if ((await cuentaDeIdentidadLeida(db, characterId)) !== accountId) return null;
  const perfil = await leerPerfil(db, characterId);
  return perfil ? paqueteDe(characterId, accountId, perfil) : null;
};
