/**
 * COMUNIDADES POR IDENTIDAD, en el cliente (docs/COMUNIDADES-IDENTIDAD.md).
 *
 * Toda escritura pasa por las callables de `functions/src/social/comunidades.ts`: el servidor comprueba con `users` que
 * la cara con la que se actúa (`asIdentity`, el `uid` del Perfil Real o del Perfil Weë ACTIVO) es de la sesión, y
 * escribe membresía, contador, papel y propiedad en una transacción. Las reglas ya no dejan hacerlo desde aquí.
 *
 * Leer las comunidades sigue siendo `communityService` (documentos públicos). Lo que no es público —en qué comunidades
 * está ESTA cara y con qué papel— lo da `listMyCommunities`, solo de la cara que se pide.
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export type PapelEnComunidad = 'owner' | 'admin' | 'moderator' | 'member';

export interface MembresiaDeIdentidad {
  communityId: string;
  role: PapelEnComunidad;
}

/** El perfil público de quien creó o es dueño: su referencia pública (entityId) y su tipo. Nunca una cuenta. */
export interface PerfilPublicoDeComunidad {
  ref: string | null;
  type: 'real' | 'wee';
}

/** El motivo que manda el servidor (viaja en `details.motivo`; el mensaje es el mismo código). */
export const motivoDelError = (error: unknown): string => {
  const e = error as { details?: { motivo?: unknown }; message?: unknown } | null;
  const motivo = e?.details?.motivo ?? e?.message;
  return typeof motivo === 'string' ? motivo : '';
};

/** Una petición de creación, para que repetirla (doble toque, reintento de red) no cree dos comunidades. */
export const nuevaPeticion = (): string =>
  `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;

const llamar = async <E, S>(nombre: string, datos: E): Promise<S> => {
  const fn = httpsCallable<E, S>(functions, nombre, { timeout: 30_000 });
  const r = await fn(datos);
  return r.data;
};

export const comunidadesService = {
  crear: (asIdentity: string, requestId: string, datos: { name: string; description?: string; icon?: string; rules?: string[] }) =>
    llamar<object, { communityId: string; slug: string; role: PapelEnComunidad }>('createCommunity', { asIdentity, requestId, ...datos }),

  unirse: (asIdentity: string, communityId: string) =>
    llamar<object, { communityId: string; role: PapelEnComunidad; memberCount: number; yaEra: boolean }>('joinCommunity', { asIdentity, communityId }),

  salir: (asIdentity: string, communityId: string) =>
    llamar<object, { communityId: string; memberCount: number; estaba: boolean }>('leaveCommunity', { asIdentity, communityId }),

  misComunidades: (asIdentity: string) =>
    llamar<object, { identityType: 'real' | 'wee'; memberships: MembresiaDeIdentidad[] }>('listMyCommunities', { asIdentity }),

  cambiarPapel: (asIdentity: string, communityId: string, targetIdentity: string, role: Exclude<PapelEnComunidad, 'owner'>) =>
    llamar<object, { role: PapelEnComunidad }>('setCommunityRole', { asIdentity, communityId, targetIdentity, role }),

  expulsar: (asIdentity: string, communityId: string, targetIdentity: string) =>
    llamar<object, { memberCount: number }>('removeCommunityMember', { asIdentity, communityId, targetIdentity }),

  transferir: (asIdentity: string, communityId: string, targetIdentity: string) =>
    llamar<object, { owner: PerfilPublicoDeComunidad }>('transferCommunityOwnership', { asIdentity, communityId, targetIdentity }),
};

export default comunidadesService;
