import { errorDelCore, Job, JobAttempt, ProviderEvent, ProviderOperationRef } from '../core';
import { identidadCompleta, identidadDeEvento } from './proveedor';

/**
 * WEË RUNTIME — LO QUE CUENTA UN PROVEEDOR, ANTES DE QUE VALGA DINERO.
 *
 * Un aviso de proveedor llega por la red, sin pedir permiso, diciendo que una
 * tarea que Weë pagó terminó. Entre ese mensaje y mover un trabajo hay un
 * trecho, y este archivo es ese trecho: **decidir**, sin tocar nada.
 *
 * Aquí no hay Firestore, ni red, ni reloj, ni proveedor concreto. Entra lo que
 * el adaptador ya tradujo a palabras de Weë; sale, como mucho, un
 * `ProviderEvent` que el Job Engine sabe recibir. Quien lo aplique es otro.
 *
 * ── Las dos reglas que no se negocian ───────────────────────────────────────
 *
 *   1. NO SABER NO ES FALLAR. Un estado que no reconocemos, un cuerpo raro, un
 *      proveedor que no contesta: nada de eso es un fallo del trabajo. Es no
 *      saber, y de no saber no sale un reembolso ni un cierre. El trabajo sigue
 *      esperando y alguien preguntará después.
 *
 *   2. EL AVISO NO DICE DE QUIÉN ES. Trae el nombre de una operación y nada
 *      más. La cuenta, el trabajo y el intento se leen de lo GUARDADO, nunca
 *      del mensaje: quien manda el aviso no es quien decide a quién pertenece.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA.
 */

/**
 * EL DESENLACE, EN PALABRAS DE WEË.
 *
 * El vocabulario de cada proveedor es suyo —ModelArk dice `queued`, `running`,
 * `succeeded`, `failed`, `cancelled`, `expired`— y traducirlo es trabajo del
 * adaptador, que es quien conoce su API. Lo que cruza esta frontera son estas
 * cuatro palabras, y `desconocido` es una de ellas a propósito: sin ella, todo
 * lo que no se entiende acabaría contado como fallo.
 */
export type DesenlaceDelProveedor = 'en_marcha' | 'terminado' | 'fallado' | 'desconocido';

/** Lo más largo que se guarda de lo que diga el proveedor sobre un fallo. */
export const MAX_MOTIVO = 200;
/** Lo más largo que puede medir el nombre que el proveedor le da a una operación. */
export const MAX_OPERACION = 256;

/**
 * UN AVISO YA TRADUCIDO. Lo que el adaptador entrega y este archivo entiende.
 *
 * `recurso` es la parte delicada: es el enlace temporal desde el que se puede
 * traer el resultado, y **no se guarda en ningún sitio**. Vale minutos u horas,
 * suele ir firmado, y escribirlo en un trabajo o en un registro sería dejar una
 * llave puesta que además caduca. Viaja en memoria hasta quien materializa, y
 * ahí se acaba.
 */
export interface AvisoNormalizado {
  providerId: string;
  operationId: string;
  /** Tal cual lo dijo él. No se interpreta: se conserva para poder mirarlo después. */
  providerStatus: string;
  /** Cuándo lo cambió, como él lo diga. Es lo que hace que el mismo aviso repetido sea el mismo. */
  updatedAt?: number | string;
  desenlace: DesenlaceDelProveedor;
  /** Solo si terminó bien. TEMPORAL: no se guarda, no se registra, no viaja al trabajo. */
  recurso?: string;
  /** Qué dijo que falló. Acotado, y sin nada escrito por una persona. */
  motivo?: string;
  /** Su código de error, si lo dio. */
  codigo?: string;
  usage?: Record<string, number>;
}

export type MotivoDeRechazoDeAviso =
  /* Ni operación, ni estado: esto no es un aviso, es ruido. */
  | 'ilegible'
  /* El trabajo ya terminó, o el intento no es este. El Job Engine también lo dirá; aquí se ahorra el viaje. */
  | 'no_aplica'
  /* Se entiende, pero no dice nada que mueva el trabajo. NO es un fallo. */
  | 'sin_efecto';

export type LecturaDeAviso =
  | { ok: true; evento: ProviderEvent; operacion: ProviderOperationRef; terminal: boolean }
  | { ok: false; motivo: MotivoDeRechazoDeAviso };

/** Recorta sin romper: lo que no cabe, no entra. Nada de texto de nadie, nada sin medida. */
const acotar = (valor: unknown, tope: number): string | undefined => {
  if (typeof valor !== 'string') return undefined;
  const limpio = valor.replace(/\s+/g, ' ').trim();
  return limpio.length ? limpio.slice(0, tope) : undefined;
};

/** Lo que el proveedor dijo haber consumido, si dijo un número. `undefined` es «no lo dijo», no «cero». */
const tokensDe = (aviso: AvisoNormalizado): number | undefined => {
  const bruto = aviso.usage?.tokens ?? aviso.usage?.totalTokens;
  return typeof bruto === 'number' && Number.isFinite(bruto) && bruto >= 0 ? bruto : undefined;
};

/**
 * DE UN DESENLACE A LO QUE EL MOTOR ENTIENDE.
 *
 *   en_marcha   → `progress`  · el proveedor la tiene y sigue. Anota su nombre y espera.
 *   terminado   → `succeeded` · terminal.
 *   fallado     → `failed`    · terminal. Aquí caen `cancelled` y `expired` por decisión
 *                               explícita: el Core no abre un estado nuevo para
 *                               representar el vocabulario de un proveedor, y lo suyo
 *                               queda escrito en los metadatos del aviso.
 *   desconocido → NADA        · no se inventa un desenlace. Se espera.
 */
const claseDe = (d: DesenlaceDelProveedor): ProviderEvent['kind'] | undefined =>
  d === 'en_marcha' ? 'progress' : d === 'terminado' ? 'succeeded' : d === 'fallado' ? 'failed' : undefined;

/**
 * ¿ESTE AVISO ES DE ESTE TRABAJO, Y QUÉ HAY QUE HACER CON ÉL?
 *
 * El trabajo y el intento llegan ya resueltos —los buscó el almacén por la
 * referencia del proveedor, no los dijo el mensaje—. Aquí solo se comprueba que
 * encajen y se arma el aviso del motor.
 *
 * `outputRefs` NO sale de aquí. Un final bueno necesita que el resultado esté
 * ya guardado en casa antes de cerrarse, y guardarlo es tocar el mundo: lo hace
 * quien compone, y lo pasa hecho. Si no lo pasa, el aviso no cierra nada.
 */
export const leerAviso = (entrada: {
  aviso: AvisoNormalizado;
  job: Job;
  intento: JobAttempt;
  at: number;
  /** Lo que ya está guardado en casa. Solo entonces un final bueno puede cerrarse. */
  outputRefs?: readonly string[];
}): LecturaDeAviso => {
  const { aviso, job, intento, at } = entrada;
  const providerId = acotar(aviso.providerId, 64);
  const operationId = acotar(aviso.operationId, MAX_OPERACION);
  const providerStatus = acotar(aviso.providerStatus, 64);
  if (!providerId || !operationId || !providerStatus) return { ok: false, motivo: 'ilegible' };

  const eventId = identidadDeEvento({ providerId, operationId, providerStatus, updatedAt: aviso.updatedAt });
  if (!eventId) return { ok: false, motivo: 'ilegible' };

  const kind = claseDe(aviso.desenlace);
  /* No saber no mueve nada, y no es un fallo: es exactamente esto. */
  if (!kind) return { ok: false, motivo: 'sin_efecto' };

  const operacion: ProviderOperationRef = { providerId, operationId };

  /*
   * LO QUE EL PROVEEDOR DIJO DE SÍ MISMO, y solo eso: escalares, medidos, sin
   * enlaces y sin texto de nadie. Sirve para poder mirar después por qué un
   * trabajo acabó como acabó sin tener que creerse la traducción.
   */
  const metadata: Record<string, string | number | boolean> = {
    providerStatus,
    providerOperationId: operationId,
    /* Si la identidad se calculó sin fecha, dos cambios al mismo estado son indistinguibles. Hay que poder saberlo. */
    eventIdentityComplete: identidadCompleta(aviso.updatedAt),
  };
  const codigo = acotar(aviso.codigo, 64);
  if (codigo) metadata.providerCode = codigo;

  if (kind === 'succeeded') {
    /*
     * UN FINAL BUENO SIN RESULTADO GUARDADO NO ES UN FINAL.
     *
     * El enlace del proveedor caduca —veinticuatro horas en vídeo, diez minutos
     * en imagen—, así que cerrar el trabajo confiando en él es cerrarlo con una
     * promesa que se rompe sola. Mientras no haya nada guardado en casa, esto
     * no cierra: se queda esperando, y quien reconcilie volverá a intentarlo.
     */
    const refs = (entrada.outputRefs ?? []).filter((r) => typeof r === 'string' && r.length > 0);
    if (!refs.length) return { ok: false, motivo: 'sin_efecto' };
    return {
      ok: true,
      operacion,
      terminal: true,
      evento: {
        eventId,
        jobId: job.jobId,
        attemptId: intento.attemptId,
        kind,
        at,
        providerRef: operacion,
        outputRefs: [...refs],
        /* Lo que DIJO haber consumido, y solo si dijo un número. Cero es un número legítimo. */
        ...(tokensDe(aviso) !== undefined ? { usage: { totalTokens: tokensDe(aviso) as number } } : {}),
        metadata: Object.freeze(metadata),
      },
    };
  }

  if (kind === 'failed') {
    const motivo = acotar(aviso.motivo, MAX_MOTIVO);
    return {
      ok: true,
      operacion,
      terminal: true,
      evento: {
        eventId,
        jobId: job.jobId,
        attemptId: intento.attemptId,
        kind,
        at,
        providerRef: operacion,
        error: errorDelCore('PROVIDER_ERROR', `adapter:${providerId}`, {
          ...(codigo ? { providerCode: codigo } : {}),
          details: { reason: 'provider_reported_failure', providerStatus, ...(motivo ? { providerMessage: motivo } : {}) },
        }),
        metadata: Object.freeze(metadata),
      },
    };
  }

  /* `progress`: no termina nada. Deja anotado cómo llama el proveedor a esto, que es lo que hará falta luego. */
  return {
    ok: true,
    operacion,
    terminal: false,
    evento: {
      eventId,
      jobId: job.jobId,
      attemptId: intento.attemptId,
      kind,
      at,
      providerRef: operacion,
      metadata: Object.freeze(metadata),
    },
  };
};
