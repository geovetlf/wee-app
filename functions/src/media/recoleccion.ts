import {
  EsperadoDelObjeto,
  InformeDeRecoleccion,
  MediaObject,
  PoliticaDeRecoleccion,
  POLITICA_DE_RECOLECCION,
  PuertoDeAlmacenamiento,
  ReferenciaLogica,
  claveEsDeLaCuenta,
  MedidorDeUso,
  decidirRecoleccion,
  esPrecondicionFallida,
  informeVacio,
  objetoEsDeLaCuenta,
  referenciaDeAlmacenDe,
  sabeBorrarConGeneracion,
  usoDeOperacion,
  vistaParaElBarrido,
} from '../core';
import { JobState } from '../core/job';

/**
 * H5/H2 · LO QUE DEVUELVE RECLAMAR UN OBJETO ANTES DE BORRARLO.
 *
 * La reclamación es la «segunda pregunta» de MC-5 hecha de una vez y dentro de
 * una transacción: lee las filas vivas, la cobertura y el estado del cerrojo en
 * el mismo documento que escribe. Si concede, el objeto queda `borrando` con
 * una concesión, y el borrado lleva la generación registrada como precondición.
 */
export type ReclamacionDelBarrido =
  | { ok: true; concesionId: string; generacion: string; esperado: EsperadoDelObjeto }
  | { ok: false; motivo: string };

/** Por qué se devuelve a `candidato` lo que se reclamó y no se borró. */
export type MotivoDeDevolucion = 'generacion_distinta' | 'error_transitorio' | 'precondicion_no_soportada';

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
  /**
   * En qué estado están los trabajos que podrían producir o necesitar estos
   * bytes. `undefined` cuando no hay una fuente clara para saberlo: no saber
   * PROTEGE (H5/H2), igual que con las referencias.
   */
  operaciones: (objeto: MediaObject) => Promise<readonly JobState[] | undefined>;
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
   * MC-7 · POR DÓNDE SALE LA MEDIDA. Opcional: sin medidor el barrido va igual.
   *
   * Era una costura con forma propia —`anotarOperacionFisica`— y MC-7 la
   * sustituyó por la forma única que ahora comparten las cuatro fases que
   * miden. Tener tres costuras parecidas y distintas habría dado tres maneras
   * de contar lo mismo.
   */
  medidor?: MedidorDeUso;

  /*
   * ── H5/H2 · CON EL ÍNDICE Y EL CERROJO ──────────────────────────────────
   *
   * Si están las tres, el barrido trabaja sobre los objetos del cerrojo
   * (`candidato`, o `borrando` con la concesión caducada) y NO borra nada que
   * no haya reclamado antes: la reclamación revalida dentro de su transacción,
   * el borrado pide la generación registrada al proveedor, y solo un cierre con
   * la concesión propia cuenta el objeto como borrado. Sin ellas, el barrido es
   * el de MC-5 de siempre.
   */
  /** Reclamar el objeto (T2). Sustituye a la segunda decisión: la misma pregunta, atómica. */
  reclamar?: (objeto: MediaObject) => Promise<ReclamacionDelBarrido>;
  /** Cerrar con la concesión propia (T3). Sustituye a `marcarBorrado` cuando hubo reclamación. */
  cerrar?: (objeto: MediaObject, concesionId: string, esperado: EsperadoDelObjeto, at: number) => Promise<boolean>;
  /** Devolver a `candidato` lo reclamado que no se borró; un error del proveedor cuenta un intento. */
  devolver?: (objeto: MediaObject, concesionId: string, esperado: EsperadoDelObjeto, motivo: MotivoDeDevolucion, at: number) => Promise<boolean>;
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

    /*
     * H5/H2 · Con el cerrojo, MC-5 decide sobre la vista que sabe decidir: un
     * `candidato`, o un `borrando` cuya concesión caducó, como bytes guardados.
     * Lo demás del cerrojo no se puede reclamar ahora y se deja quieto.
     */
    const conCerrojo = !!(deps.reclamar && deps.cerrar && deps.devolver);
    const vista = conCerrojo ? vistaParaElBarrido(objeto, deps.ahora()) : objeto;
    if (!vista) {
      informe.protegidos++;
      informe.porMotivo = sumar(informe.porMotivo, 'estado_no_reclamable');
      continue;
    }

    /* `inciertas`: no hay fuente clara de operaciones. No saber protege, igual que con las referencias. */
    const reunir = async () => {
      const refs = await deps.referencias(objeto);
      const operaciones = await deps.operaciones(objeto);
      return {
        inciertas: operaciones === undefined,
        entrada: {
          objeto: vista,
          referencias: refs ?? [],
          referenciasCompletas: refs !== undefined,
          operaciones: operaciones ?? [],
        },
      };
    };

    const hechos = await reunir();
    if (hechos.inciertas) {
      informe.protegidos++;
      informe.porMotivo = sumar(informe.porMotivo, 'operaciones_inciertas');
      continue;
    }
    const primera = decidirRecoleccion(hechos.entrada, politica, deps.ahora());

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

    /*
     * H5/H2 · LA SEGUNDA PREGUNTA, ATÓMICA. Con el cerrojo, en vez de volver a
     * decidir con lo leído fuera, se RECLAMA: la transacción vuelve a leer las
     * filas vivas, la cobertura y el estado en el mismo documento que escribe.
     * Una referencia que aparezca después ya no puede nacer (el objeto está
     * `borrando`), y una que apareció antes impide la reclamación.
     */
    let reclamacion: ReclamacionDelBarrido | undefined;
    if (conCerrojo) {
      reclamacion = await deps.reclamar!(objeto);
      if (!reclamacion.ok) {
        informe.protegidos++;
        informe.porMotivo = sumar(informe.porMotivo, reclamacion.motivo);
        continue;
      }
    } else {
      const otra = await reunir();
      const segunda = otra.inciertas ? undefined : decidirRecoleccion(otra.entrada, politica, deps.ahora());
      if (!segunda || segunda.accion !== 'borrar') {
        informe.protegidos++;
        informe.porMotivo = sumar(informe.porMotivo, !segunda ? 'operaciones_inciertas' : segunda.accion === 'proteger' ? segunda.motivo : 'referenciado');
        continue;
      }
    }

    const puerto = deps.almacenes[objeto.providerId];
    if (!puerto || (reclamacion?.ok && !sabeBorrarConGeneracion(puerto))) {
      /* Sin adaptador, o con uno que no sabe exigir la generación: no se borra, y lo reclamado vuelve a esperar. */
      if (reclamacion?.ok) await deps.devolver!(objeto, reclamacion.concesionId, reclamacion.esperado, 'precondicion_no_soportada', deps.ahora());
      informe.protegidos++;
      informe.porMotivo = sumar(informe.porMotivo, puerto ? 'precondicion_no_soportada' : 'sin_adaptador');
      continue;
    }

    const borrado = reclamacion?.ok
      ? await puerto.borrar(referenciaDeAlmacenDe(objeto), { generacion: reclamacion.generacion })
      : await puerto.borrar(referenciaDeAlmacenDe(objeto));
    const at = deps.ahora();

    if (borrado.ok) {
      /*
       * `yaNoEstaba` no es un fallo: es la convergencia. Un objeto que el
       * proveedor ya no tiene está tan borrado como uno que acabamos de borrar,
       * y la ficha se cierra igual. Así, repetir el barrido converge.
       */
      if (borrado.yaNoEstaba) informe.yaNoEstaban++; else informe.borrados++;
      const cerrada = reclamacion?.ok
        ? await deps.cerrar!(objeto, reclamacion.concesionId, reclamacion.esperado, at)
        : await deps.marcarBorrado(objeto.objectRef, objeto.accountId, at);
      if (!cerrada) informe.fichasNoCerradas++;
      /*
       * MC-7 · El borrado se mide SIEMPRE, incluso cuando el objeto ya no
       * estaba: la petición salió y el proveedor la cobra igual. Medir solo los
       * borrados «de verdad» dejaría fuera justo las peticiones que no sirvieron
       * para nada, que son las que interesa ver.
       */
      if (deps.medidor) for (const u of usoDeOperacion({
        accountId: objeto.accountId,
        providerId: objeto.providerId,
        operacion: 'object.delete',
        occurredAt: at,
        ancla: { runId, objectRef: objeto.objectRef },
        assetId: objeto.assetId,
        objectRef: objeto.objectRef,
      })) deps.medidor.medir(u);
      continue;
    }

    /*
     * H5/H2 · 412: la generación no era la registrada. Alguien escribió en la
     * clave después de decidir: esos bytes no son los que se decidió borrar. No
     * se borró nada, no es un fallo del proveedor y no cuenta un intento.
     */
    if (reclamacion?.ok && esPrecondicionFallida(borrado)) {
      await deps.devolver!(objeto, reclamacion.concesionId, reclamacion.esperado, 'generacion_distinta', at);
      informe.protegidos++;
      informe.porMotivo = sumar(informe.porMotivo, 'generacion_distinta');
      continue;
    }

    /*
     * No se pudo. Se anota el intento y se deja para más adelante; la decisión
     * de si merece otro intento o ya no, la toma el Core en el próximo barrido
     * con la cuenta delante. Aquí no se decide eso.
     */
    informe.errores++;
    const intentos = (typeof objeto.intentosDeBorrado === 'number' ? objeto.intentosDeBorrado : 0) + 1;
    if (reclamacion?.ok) await deps.devolver!(objeto, reclamacion.concesionId, reclamacion.esperado, 'error_transitorio', at);
    else await deps.anotarIntento(objeto.objectRef, objeto.accountId, intentos, at);
    if (intentos >= politica.maxIntentos) informe.atascados++; else informe.reintentables++;
  }

  return {
    ...informe,
    porMotivo: Object.freeze({ ...informe.porMotivo }),
    ...(lote.cursor ? { cursor: lote.cursor } : {}),
    ms: deps.ahora() - empezo,
  };
};
