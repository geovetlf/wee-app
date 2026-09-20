import type { Firestore } from 'firebase-admin/firestore';

/**
 * WEË RUNTIME — DÓNDE SE GUARDA EL INTERRUPTOR.
 *
 * `puerta.ts` decide; esto solo trae lo que hay guardado. Están separados a
 * propósito: la decisión es una función pura que se puede probar entera, y lo
 * único que toca Firestore es este archivo de veinte líneas.
 *
 * ── Por qué en Firestore y no en una variable de entorno ────────────────────
 *
 * Porque volver atrás no puede depender de un despliegue. Una variable de
 * entorno obliga a desplegar para apagar el Core, y un despliegue tarda
 * minutos justo cuando hacen falta segundos. Un documento se cambia y la
 * siguiente invocación ya va por donde siempre.
 *
 * ── Fallar hacia el lado seguro ─────────────────────────────────────────────
 *
 * Si Firestore no contesta, o el documento no existe, o trae cualquier otra
 * cosa, lo que se devuelve es `undefined` y la puerta queda CERRADA. Una
 * incidencia de lectura nunca abre un camino nuevo: como mucho deja todo como
 * estaba.
 *
 * ── El minuto de caché ──────────────────────────────────────────────────────
 *
 * Es el mismo que usa `engine/config.ts` para la configuración del motor. Sin
 * él, cada mensaje de cada persona pagaría una lectura de más solo para
 * enterarse de que la puerta sigue cerrada. A cambio, abrir o cerrar tarda
 * hasta un minuto en llegar a las instancias que ya estaban calientes — y el
 * cierre de emergencia sigue siendo el mismo documento, sin desplegar nada.
 *
 * `aiSettings` ya está cerrada a los clientes en `firestore.rules`
 * (`allow read, write: if false`), así que esto no abre ningún acceso nuevo:
 * solo lo lee el servidor, y solo lo escribe quien administra.
 */

export const COLECCION_DE_LA_PUERTA = 'aiSettings';
export const DOCUMENTO_DE_LA_PUERTA = 'runtime';
export const VIGENCIA_DE_LA_PUERTA_MS = 60_000;

let recordado: { valor: unknown; hasta: number } | undefined;

/** Para las pruebas y para un cierre inmediato dentro de la misma instancia. */
export const olvidarLaPuerta = (): void => {
  recordado = undefined;
};

export const configuracionDeLaPuerta = async (db: Firestore, ahora: () => number = Date.now): Promise<unknown> => {
  const t = ahora();
  if (recordado && recordado.hasta > t) return recordado.valor;
  let valor: unknown;
  try {
    const snap = await db.collection(COLECCION_DE_LA_PUERTA).doc(DOCUMENTO_DE_LA_PUERTA).get();
    valor = snap.exists ? snap.data() : undefined;
  } catch {
    /* Sin poder leerla, la puerta está cerrada. Y se recuerda cerrada, para no castigar a cada mensaje con un reintento. */
    valor = undefined;
  }
  recordado = { valor, hasta: t + VIGENCIA_DE_LA_PUERTA_MS };
  return valor;
};
