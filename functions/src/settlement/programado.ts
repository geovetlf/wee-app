import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { CADA_CUANTO_POR_DEFECTO_MIN, InformeDeBarrido, barridoDeLiquidacionDeWee } from '../runtime';

/**
 * WEË — QUIÉN LE PIDE AL BARRENDERO QUE PASE.
 *
 * Este archivo es INFRAESTRUCTURA, y por eso está aquí y no en `runtime/`. El
 * runtime no sabe —ni debe saber— si lo programa Cloud Scheduler, un cron de
 * otro sitio o una prueba: lo suyo es una función sin argumentos
 * (`barridoDeLiquidacionDeWee`), y esto la envuelve.
 *
 * ── NO ESTÁ DESPLEGADO ──────────────────────────────────────────────────────
 *
 * `functions/src/index.ts` NO exporta nada de este archivo, así que Cloud
 * Functions no lo conoce y no hay ninguna tarea programada en producción.
 * Conectarlo es UNA línea en `index.ts`, y esa línea es de otro bloque: antes
 * hay que decidir la frecuencia de verdad, quién mira sus registros y qué se
 * hace con lo que quede a reconciliar.
 *
 * ── Qué hace, y qué no ──────────────────────────────────────────────────────
 *
 * Dispara una pasada. Nada más. No decide reembolsos, ni cobros, ni
 * recuperación, ni propiedad, ni desenlaces de proveedor: eso vive en
 * `runtime/liquidacion.ts`, que es puro, y lo ejecuta el Credit Engine, que es
 * idempotente. Tampoco guarda nada: la verdad está en Firestore y aquí no se
 * recuerda ni un trabajo entre pasada y pasada.
 *
 * ── Dos a la vez ────────────────────────────────────────────────────────────
 *
 * Es seguro. No hay cerrojo, ni memoria de proceso haciendo de candado —sería
 * un candado que solo vale si hay una instancia, que es justo lo que no se
 * puede suponer—. Si una pasada tarda más que el periodo, la siguiente entra y
 * las dos acaban llamando a las mismas operaciones idempotentes del Credit
 * Engine: exactamente una transición por operación.
 */

/**
 * CADA CUÁNTO, y por qué ese número. Está razonado en `runtime/barrido.ts`: sale
 * del plazo más largo que admite Weë (el vídeo, veinte minutos), no de una
 * intuición. Se puede cambiar sin tocar código con `SETTLEMENT_SWEEP_MINUTES`.
 */
export const minutosDelBarrido = (): number => {
  const crudo = process.env.SETTLEMENT_SWEEP_MINUTES;
  const n = crudo === undefined || crudo === '' ? NaN : Number(crudo);
  return Number.isFinite(n) && n >= 1 && n <= 1440 ? Math.floor(n) : CADA_CUANTO_POR_DEFECTO_MIN;
};

/** Solo metadatos. Ni un prompt, ni una respuesta, ni una clave. */
export const anotarBarrido = (informe: InformeDeBarrido): void => {
  console.log(
    `WEË SETTLEMENT · sweep=${informe.sweepId} ${informe.durationMs} ms · mirados=${informe.examined}`
    + ` liquidados=${informe.settled} reembolsados=${informe.refunded} esperando=${informe.skipped}`
    + ` a_reconciliar=${informe.unknown} errores=${informe.errors}${informe.pending ? ' · quedan páginas' : ''}`,
  );
};

/**
 * La tarea programada, lista para enchufar. **Nadie la importa**: existe para
 * que conectarla sea añadir una línea, no escribir un archivo.
 */
export const barridoDeLiquidacion = onSchedule(
  { schedule: `every ${minutosDelBarrido()} minutes`, region: 'us-central1', timeoutSeconds: 540, memory: '256MiB' },
  async () => {
    const pasada = barridoDeLiquidacionDeWee({ db: getFirestore(), anotar: anotarBarrido });
    await pasada();
  },
);
