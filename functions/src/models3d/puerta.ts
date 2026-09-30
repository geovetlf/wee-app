import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { depsDeSubidaDeWee } from '../media';
import { depsDeEntregaDeWee, solicitarEntrega } from '../media/entrega';
import { MEDIA_SECRETS } from '../secrets';
import { atenderModelos3d, leerPuertaDeModelos3d, puertaDeModelos3dAbiertaPara } from './index';

/**
 * 3D DENTRO DE FILMMAKER · LA PUERTA DE LOS MODELOS 3D. Y solo eso.
 *
 * Comprueba QUIÉN llama y delega: la cuenta la resuelve la puerta de cuentas de
 * siempre, la decisión es de `atenderModelos3d`, los bytes van por MC-3 y la llave
 * para ver un modelo, por MC-2. Lleva
 * `MEDIA_SECRETS` —los del almacén— y ninguna clave de modelo.
 *
 * PREPARADA Y SIN EXPORTAR. `functions/src/index.ts` no la exporta, así que ningún
 * deploy la sube: Media Cloud sigue sin estar activo para nadie. Encenderla es:
 *   1. exportarla (`export { models3d } from './models3d/puerta'`) y desplegarla;
 *   2. el CORS del contenedor para el origen de la app (el PUT sale del navegador);
 *   3. abrir `aiSettings/modelos3d` para las cuentas del canary.
 * Los tres son decisiones del dueño (docs/FILMMAKER-3D.md).
 */
export const models3d = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '256MiB', secrets: MEDIA_SECRETS },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    const db = getFirestore();
    return atenderModelos3d(
      {
        ...depsDeSubidaDeWee(db),
        puertaAbierta: async (accountId) => puertaDeModelos3dAbiertaPara(await leerPuertaDeModelos3d(db), accountId),
        pedirEntrega: async (principalId, assetId) => {
          const r = await solicitarEntrega(depsDeEntregaDeWee(db), { principalId, assetId });
          return r.ok ? { ok: true, url: r.entrega.url, expiraEn: r.entrega.expiraEn } : { ok: false };
        },
      },
      request.auth.uid,
      request.data,
    );
  },
);
