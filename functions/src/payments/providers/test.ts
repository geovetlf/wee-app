import { randomUUID } from 'crypto';
import { getPackage } from '../../credits/creditCosts';
import { CreditError } from '../../credits/creditValidation';
import { PurchaseProvider } from '../purchaseValidation';

/**
 * Proveedor de prueba: "Recarga de prueba" sin cobrar nada. Aun así, el
 * cliente no elige cuántos Credits: solo el paquete.
 *
 * FAIL-CLOSED (Gran Motor S2, hallazgo F-05). Antes se abría con solo
 * `CREDITS_TEST_PURCHASES=true` (también en `get-wee`), en cualquier emulador
 * o en CUALQUIER proyecto distinto de `get-wee`. Ahora se abre SOLO si se
 * cumplen TODAS:
 *   1. `CREDITS_TEST_PURCHASES` vale exactamente `'true'` (nada se deduce);
 *   2. corre en el emulador de Functions (`FUNCTIONS_EMULATOR === 'true'`);
 *   3. Firestore también es el emulador (`FIRESTORE_EMULATOR_HOST`), para que
 *      ningún saldo ni asiento llegue a una base real;
 *   4. el proyecto se lee sin ambigüedad (todas las fuentes coinciden), NO es
 *      de producción y es uno de prueba conocido (`demo-*` o `wee-dev-geovet`).
 * La falta o la ambigüedad de cualquiera de ellas = cerrado.
 */
export const PROYECTOS_DE_PRODUCCION: readonly string[] = Object.freeze(['get-wee']);
export const PROYECTOS_DE_PRUEBA: readonly string[] = Object.freeze(['wee-dev-geovet']);
const PROYECTO_DEMO = /^demo-[a-z0-9-]+$/;

type Entorno = Record<string, string | undefined>;

const proyectoDe = (env: Entorno): string | null => {
  const fuentes: string[] = [];
  for (const v of [env.GCLOUD_PROJECT, env.GCP_PROJECT, env.GOOGLE_CLOUD_PROJECT]) {
    if (typeof v === 'string' && v.trim() !== '') fuentes.push(v.trim());
  }
  if (typeof env.FIREBASE_CONFIG === 'string' && env.FIREBASE_CONFIG.trim() !== '') {
    try {
      const id = (JSON.parse(env.FIREBASE_CONFIG) as { projectId?: unknown } | null)?.projectId;
      if (typeof id === 'string' && id.trim() !== '') fuentes.push(id.trim());
    } catch {
      return null; // configuración ilegible = ambigua = cerrado
    }
  }
  if (fuentes.length === 0) return null;
  return fuentes.every((f) => f === fuentes[0]) ? fuentes[0] : null;
};

export const comprasDePruebaHabilitadas = (env: Entorno = process.env): boolean => {
  if (env.CREDITS_TEST_PURCHASES !== 'true') return false;
  if (env.FUNCTIONS_EMULATOR !== 'true') return false;
  if (typeof env.FIRESTORE_EMULATOR_HOST !== 'string' || env.FIRESTORE_EMULATOR_HOST.trim() === '') return false;
  const proyecto = proyectoDe(env);
  if (!proyecto || PROYECTOS_DE_PRODUCCION.includes(proyecto)) return false;
  return PROYECTO_DEMO.test(proyecto) || PROYECTOS_DE_PRUEBA.includes(proyecto);
};

export const testProvider: PurchaseProvider = {
  id: 'test',
  async verify({ userId, packageId }) {
    if (!comprasDePruebaHabilitadas()) throw new CreditError('PURCHASE_INVALID', 'Las recargas de prueba no están disponibles en producción');
    const pkg = packageId ? getPackage(packageId) : undefined;
    if (!pkg) throw new CreditError('PURCHASE_INVALID', 'Elige un paquete válido', { packageId });
    return { purchaseId: `${userId.slice(0, 8)}_${randomUUID()}`, productId: pkg.productId, priceUsd: 0 };
  },
};
