import {
  InformeDeRecoleccion,
  MediaObject,
  PoliticaDeRecoleccion,
  POLITICA_DE_RECOLECCION,
  PuertoDeAlmacenamiento,
  ReferenciaLogica,
  claveEsDeLaCuenta,
  decidirRecoleccion,
  informeVacio,
  objetoEsDeLaCuenta,
  referenciaDeAlmacenDe,
} from '../core';
import { JobState } from '../core/job';

/**
 * MC-5 · EL BARRIDO. Quien ejecuta lo que `recoleccion.ts` decide.
 *
 * ── El patrón no es nuevo ───────────────────────────────────────────────────
 *
 * Es el mismo de `runtime/barrendero.ts`: una decisión pura en el Core y, aquí,
 * un recorrido que la aplica sobre lo que hay guardado. No hay cola nueva, ni
 * trabajador nuevo, ni planificador nuevo — y si algún día esto necesita correr
 * asíncrono, lo hará por el Job Engine que ya existe, no por un segundo sistema.
 *
 * ── La regla que justifica este archivo entero ──────────────────────────────
 *
 * **Se vuelve a preguntar justo antes de borrar.**
 *
 * Entre que el barrido elige un candidato y llega a borrarlo pueden pasar
 * segundos, y en esos segundos alguien puede haber creado un material que
 * apunte a esos bytes. Por eso el candidato no se borra: se le vuelve a reunir
 * sus referencias, se vuelve a pasar por la misma decisión, y solo si dice
 * `borrar` las dos veces se llama al proveedor. La decisión es pura y barata
 * precisamente para poder ejecutarla dos veces sin pensárselo.
 *
 * ── Y la que protege a las cuentas entre sí ─────────────────────────────────
 *
 * Antes de tocar nada se comprueba que el objeto es de la cuenta que dice ser Y
 * que su clave vive dentro de la carpeta de esa cuenta. Las dos, no una. Un
 * `objectRef` que llegue de cualquier sitio no prueba nada por sí mismo, y aquí
 * no entra ningún dato de ningún cliente: el barrido recorre lo guardado.
 */

/* ── Lo que el barrido necesita que le den ──────────────────────────────────── */

/**
 * DE DÓNDE SALEN LOS HECHOS. Todo entra por aquí para que el barrido se pueda
 * probar entero sin Firestore y sin red.
 */
export interface DepsDeRecoleccion {
  /**
   * Los objetos a inspeccionar, por lotes y con cursor. Nunca la colección
   * entera: a diez millones de cuentas eso no termina.
   */
  objetos: (cursor: string | undefined, limite: number) => Promise<{ objetos: readonly MediaObject[]; cursor?: string }>;
  /**
   * Quién reclama estos bytes. Devuelve `undefined` cuando no se pudo saber con
   * certeza — y eso protege, no autoriza.
   */
  referencias: (objeto: MediaObject) => Promise<readonly ReferenciaLogica[] | undefined>;
  /** En qué estado están los trabajos que podrían producir o necesitar estos bytes. */
  operaciones: (objeto: MediaObject) => Promise<readonly JobState[]>;
  /** Los adaptadores de verdad, por su identidad. El barrido no sabe de proveedores. */
  almacenes: Readonly<Record<string, PuertoDeAlmacenamiento>>;
  /**
   * Cerrar la ficha cuando los bytes ya no están. Devuelve si la cerró ESTA
   * pasada: `false` quiere decir que otro escritor se adelantó entre la lectura
   * y la escritura, y entonces el barrido no se apunta un cierre que no hizo.
   */
  marcarBorrado: (objectRef: string, accountId: string, at: number) => Promise<boolean>;
  /** Anotar que se intentó y falló, para que el siguiente barrido lo sepa. */
  anotarIntento: (objectRef: string, accountId: string, intentos: number, at: number) => Promise<void>;
  ahora: () => number;
  politica?: PoliticaDeRecoleccion;
  /**
   * MC-7 · La costura del coste, y nada más que la costura.
   *
   * Un borrado físico es una operación que algún día habrá que contabilizar.
   * Esto permite que MC-7 la observe sin que MC-5 invente un precio, una unidad
   * ni un libro. Hoy no la pone nadie y no pasa nada.
   */
  anotarOperacionFisica?: (providerId: string, operacion: 'delete', cantidad: number) => void;
}

const sumar = (m: Record<string, number>, k: string): Record<string, number> => ({ ...m, [k]: (m[k] ?? 0) + 1 });

/* ── El barrido ─────────────────────────────────────────────────────────────── */

/**
 * PASAR UNA VEZ. Un lote, un informe, y un cursor para seguir.
 *
 * Idempotente por construcción: ejecutarlo dos veces sobre lo mismo no corrompe
 * nada. Lo que ya se borró vuelve como `yaNoEstaba` y converge a cerrado; lo
 * que ya está cerrado se protege; lo que falló espera su hora.
 */
export const recogerObjetosHuerfanos = async (
  deps: DepsDeRecoleccion,
  runId: string,
  cursorInicial?: string,
): Promise<InformeDeRecoleccion> => {
  const politica = deps.politica ?? POLITICA_DE_RECOLECCION;
  const empezo = deps.ahora();
  let informe = { ...informeVacio(runId), porMotivo: {} as Record<string, number> };

  const lote = await deps.objetos(cursorInicial, politica.maxPorEjecucion);

  for (const objeto of lote.objetos) {
    informe.inspeccionados++;

    /*
     * AISLAMIENTO PRIMERO. Una ficha cuya cuenta no cuadra con su propia clave
     * no se toca jamás, ni para protegerla ni para borrarla: es la única forma
     * de que la decisión sobre una cuenta no pueda alcanzar los bytes de otra.
     */
    if (!objetoEsDeLaCuenta(objeto, objeto.accountId) || !claveEsDeLaCuenta(objeto.objectKey, objeto.accountId)) {
      informe.protegidos++;
      informe.porMotivo = sumar(informe.porMotivo, 'fuera_de_su_cuenta');
      continue;
    }

    const reunir = async () => {
      const refs = await deps.referencias(objeto);
      return {
        objeto,
        referencias: refs ?? [],
        referenciasCompletas: refs !== undefined,
        operaciones: await deps.operaciones(objeto),
      };
    };

    const primera = decidirRecoleccion(await reunir(), politica, deps.ahora());

    if (primera.accion === 'proteger') {
      informe.protegidos++;
      informe.porMotivo = sumar(informe.porMotivo, primera.motivo);
      if (primera.motivo === 'intentos_agotados') informe.atascados++;
      if (primera.motivo === 'esperando_reintento') informe.reintentables++;
      continue;
    }

    if (primera.accion === 'finalizar') {
      const cerrada = await deps.marcarBorrado(objeto.objectRef, objeto.accountId, deps.ahora());
      if (cerrada) informe.finalizados++; else informe.fichasNoCerradas++;
      continue;
    }

    /*
     * Es candidato. AHORA se vuelve a preguntar: entre la primera decisión y
     * esta pueden haber aparecido referencias nuevas. Si la segunda no vuelve a
     * decir `borrar`, se protege y se sigue — sin borrar nada.
     */
    informe.candidatos++;
    const segunda = decidirRecoleccion(await reunir(), politica, deps.ahora());
    if (segunda.accion !== 'borrar') {
      informe.protegidos++;
      informe.porMotivo = sumar(informe.porMotivo, segunda.accion === 'proteger' ? segunda.motivo : 'referenciado');
      continue;
    }

    const puerto = deps.almacenes[objeto.providerId];
    if (!puerto) {
      informe.protegidos++;
      informe.porMotivo = sumar(informe.porMotivo, 'sin_adaptador');
      continue;
    }

    const borrado = await puerto.borrar(referenciaDeAlmacenDe(objeto));
    const at = deps.ahora();

    if (borrado.ok) {
      /*
       * `yaNoEstaba` no es un fallo: es la convergencia. Un objeto que el
       * proveedor ya no tiene está tan borrado como uno que acabamos de borrar,
       * y la ficha se cierra igual. Así, repetir el barrido converge.
       */
      if (borrado.yaNoEstaba) informe.yaNoEstaban++; else informe.borrados++;
      if (!(await deps.marcarBorrado(objeto.objectRef, objeto.accountId, at))) informe.fichasNoCerradas++;
      deps.anotarOperacionFisica?.(objeto.providerId, 'delete', 1);
      continue;
    }

    /*
     * No se pudo. Se anota el intento y se deja para más adelante; la decisión
     * de si merece otro intento o ya no, la toma el Core en el próximo barrido
     * con la cuenta delante. Aquí no se decide eso.
     */
    informe.errores++;
    const intentos = (typeof objeto.intentosDeBorrado === 'number' ? objeto.intentosDeBorrado : 0) + 1;
    await deps.anotarIntento(objeto.objectRef, objeto.accountId, intentos, at);
    if (intentos >= politica.maxIntentos) informe.atascados++; else informe.reintentables++;
  }

  return {
    ...informe,
    porMotivo: Object.freeze({ ...informe.porMotivo }),
    ...(lote.cursor ? { cursor: lote.cursor } : {}),
    ms: deps.ahora() - empezo,
  };
};
