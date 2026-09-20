import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { CADA_CUANTO_POR_DEFECTO_MIN, InformeDeBarrido, InformeDelReconciliador, barridoDeLiquidacionDeWee, mantenimientoDeWee } from '../runtime';
import { RECONCILIATION_SECRETS } from '../secrets';

/**
 * WEË — QUIÉN LE PIDE AL BARRENDERO QUE PASE.
 *
 * Este archivo es INFRAESTRUCTURA, y por eso está aquí y no en `runtime/`. El
 * runtime no sabe —ni debe saber— si lo programa Cloud Scheduler, un cron de
 * otro sitio o una prueba: lo suyo es una función sin argumentos
 * (`barridoDeLiquidacionDeWee`), y esto la envuelve.
 *
 * ── QUÉ SE DESPLIEGA, Y QUÉ NO ──────────────────────────────────────────────
 *
 * Esto SÍ se despliega: `index.ts` lo exporta y hay una tarea programada en
 * producción. Lo que NO se despliega con ella es ninguna capacidad asíncrona de
 * usuario: el vídeo sigue por el camino de siempre, ninguna capacidad está
 * migrada y el receptor de avisos sigue sin exportarse. Mientras no haya
 * trabajos asíncronos, esta tarea pasa, no encuentra nada y se va — que es
 * exactamente lo que tiene que hacer.
 *
 * Y está desplegada ANTES que el primer trabajo asíncrono a propósito: esto es
 * la red de seguridad del dinero, y una red se pone antes de saltar.
 *
 * ── Qué hace, y qué no ──────────────────────────────────────────────────────
 *
 * Dispara una pasada. Nada más. No decide reembolsos, ni cobros, ni
 * recuperación, ni propiedad, ni desenlaces de proveedor, NI EN QUÉ ORDEN pasan
 * las cosas dentro de la pasada: todo eso vive en `runtime/`, es puro, y lo
 * ejecuta el Credit Engine, que es idempotente. Tampoco guarda nada: la verdad
 * está en Firestore y aquí no se recuerda ni un trabajo entre pasada y pasada.
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
 * Lo que dejó la parte de preguntar. Identificadores y cuentas: **ni un enlace
 * del proveedor, ni una clave, ni de quién era ningún trabajo**. Un enlace de
 * resultado va firmado, y un registro se lee en más sitios que un trabajo.
 */
export const anotarReconciliacion = (informe: InformeDelReconciliador | undefined, fallo: boolean): void => {
  if (fallo) { console.warn('WEË RECONCILIACIÓN · la pasada no se pudo completar; se reintenta en la siguiente'); return; }
  if (!informe) return;
  console.log(
    `WEË RECONCILIACIÓN · mirados=${informe.mirados} preguntados=${informe.preguntados}`
    + ` resueltos=${informe.resueltos} en_marcha=${informe.enMarcha} sin_respuesta=${informe.sinRespuesta}`
    + ` rendidos=${informe.rendidos} aplazados=${informe.aplazados} omitidos=${informe.omitidos}`
    + `${informe.agotadas ? ' · tope de preguntas alcanzado' : ''}${informe.cursor ? ' · quedan páginas' : ''}`,
  );
};

/**
 * LA TAREA PROGRAMADA. Dispara UNA pasada y se va.
 *
 * ── Los secretos que declara, y por qué ─────────────────────────────────────
 *
 * Solo `ARK_API_KEY`, que es lo único que hace falta para PREGUNTARLE a
 * ModelArk por una tarea suya. No se declaran las demás claves de proveedores:
 * esta tarea no genera nada, no llama a ningún modelo y no gasta un céntimo —
 * lo único que hace con una clave es una consulta de estado, que es de lectura.
 *
 * Y está declarada desde el primer despliegue a propósito. La reconciliación es
 * lo que impide que un vídeo pagado se quede sin cobrar o sin entregar; tenerla
 * viva ANTES del primer trabajo asíncrono es el punto.
 *
 * ── La memoria, que no es la de una tarea de mantenimiento ──────────────────
 *
 * Mil megas y no doscientos cincuenta y seis. Esta tarea puede acabar TRAYENDO
 * un resultado: si al preguntar resulta que el vídeo está hecho, hay que
 * guardarlo antes de que caduque su enlace, y eso pasa por memoria. Es el mismo
 * motivo por el que `generateVideo` tiene mil megas. Con doscientos cincuenta y
 * seis, el día que hiciera falta de verdad, se moriría justo ahí.
 */
export const barridoDeLiquidacion = onSchedule(
  {
    schedule: `every ${minutosDelBarrido()} minutes`,
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: RECONCILIATION_SECRETS,
  },
  async () => {
    const pasada = mantenimientoDeWee({
      db: getFirestore(),
      liquidacion: barridoDeLiquidacionDeWee({ db: getFirestore(), anotar: anotarBarrido }),
      anotar: ({ reconciliacion, falloAlPreguntar }) => anotarReconciliacion(reconciliacion, falloAlPreguntar),
    });
    await pasada();
  },
);
