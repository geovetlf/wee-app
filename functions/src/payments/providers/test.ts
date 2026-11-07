import { CreditError } from '../../credits/creditValidation';
import { PurchaseProvider } from '../purchaseValidation';

/**
 * Proveedor de prueba: "Recarga de prueba" sin cobrar nada.
 *
 * Confirma la orden que el servidor ya creó y cotizó, y devuelve EXACTAMENTE su
 * moneda e importe: el cliente no elige cuántos Credits ni cuánto se "paga".
 * No simula un pago real: el movimiento queda como «Recarga de prueba», con
 * precio 0 para las estadísticas de ingresos.
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
 *
 * Consolidación W0 (2026-11-06): la guarda de S2 se injerta en el `verify` POR
 * ORDEN de la compra por importe (decisión del dueño del 2026-11-04: no hay
 * paquetes). `testPurchasesEnabled`, el nombre con el que la compra por importe
 * anuncia si ofrece este proveedor (`credits/index.ts` → `configuracionDeCompra`),
 * es la MISMA guarda fail-closed: no queda ninguna segunda puerta más abierta.
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

/** La compra por importe pregunta con este nombre si puede ofrecer el proveedor de prueba: es la guarda de arriba. */
export const testPurchasesEnabled = (): boolean => comprasDePruebaHabilitadas();

export const testProvider: PurchaseProvider = {
  id: 'test',
  async verify({ order }) {
    if (!comprasDePruebaHabilitadas()) throw new CreditError('PURCHASE_INVALID', 'Las recargas de prueba no están disponibles en producción');
    return { purchaseId: `test_${order.id}`, currency: order.snapshot.currency, amountMinor: order.snapshot.amountMinor };
  },
};
