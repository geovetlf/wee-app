import {
  Asset,
  EstadoDeMigracion,
  FuenteHistorica,
  HechosDelObjeto,
  InformeDeMigracion,
  ItemDeMigracion,
  MediaObject,
  NivelDeVerificacion,
  PoliticaDeMigracion,
  POLITICA_DE_MIGRACION,
  ObjetoGuardado,
  PuertoDeAlmacenamiento,
  StorageRef,
  claveEsDeLaCuenta,
  decidirMigracion,
  MedidorDeUso,
  destinoDeMigracion,
  errorDeMigracionSaneado,
  hechosDelDestino,
  informeDeMigracionVacio,
  usoDeEscritura,
  usoDeLectura,
  usoDeOperacion,
  verificarCopia,
} from '../core';
import { JobState } from '../core/job';

/**
 * MC-6 · EL TRASLADO. Quien ejecuta lo que `migracion.ts` decide.
 *
 * ── El patrón, otra vez ─────────────────────────────────────────────────────
 *
 * El mismo de MC-5 y de `runtime/barrendero.ts`: decisión pura en el Core, y
 * aquí un recorrido por lotes con cursor que la aplica. No hay cola nueva, ni
 * trabajador nuevo, ni planificador nuevo, ni un segundo sistema de trabajos —
 * si algún día esto corre asíncrono, correrá por el Job Engine que ya existe.
 *
 * ── Las cuatro reglas que justifican el archivo ─────────────────────────────
 *
 * **1 · Nada viene de fuera.** El destino se DERIVA del material ya leído. La
 * cuenta, el proveedor, el contenedor y la clave salen del servidor; ni un
 * cliente ni un operador ni la propia fuente los propone. Una URL suelta no es
 * una fuente: si ninguna fuente registrada reconoce el origen, no se intenta.
 *
 * **2 · Se escribe una vez.** El guardado va con `siNoExiste`, que es la
 * operación condicional del propio proveedor. Dos ejecuciones a la vez sobre el
 * mismo recurso no dejan dos objetos: la segunda recibe «ya existía» y sigue
 * hacia la verificación. La transferencia se paga una vez.
 *
 * **3 · Un 200 no es una migración.** Después de escribir se PREGUNTA al
 * destino qué tiene, y se compara con lo que dijo el origen. Solo entonces el
 * item queda `completado`, y con el nivel al que se pudo verificar escrito al
 * lado. Si no se pudo comparar nada, no se completa.
 *
 * **4 · Se vuelve a preguntar antes de transferir.** Igual que MC-5 antes de
 * borrar: entre elegir un candidato y llegar a él pueden haber cambiado las
 * cosas —otro proceso lo copió, el material se retiró—. La decisión es pura y
 * barata para poder correrla dos veces.
 */

/* ── Lo que el traslado necesita que le den ─────────────────────────────────── */

/**
 * DE DÓNDE SALEN LOS HECHOS. Todo entra por aquí para que esto se pruebe entero
 * sin Firestore, sin red y sin un solo byte real.
 */
export interface DepsDeMigracion {
  /** Los recursos a trasladar, por lotes y con cursor. Nunca el inventario entero. */
  items: (cursor: string | undefined, limite: number) => Promise<{ items: readonly ItemDeMigracion[]; cursor?: string }>;
  /**
   * El material de la Fase 11 de un item. `undefined` cuando no existe —y
   * entonces NO se migra: la identidad no la pone el proveedor histórico.
   */
  material: (item: ItemDeMigracion) => Promise<Asset | undefined>;
  /** La ficha del objeto de destino, si ya existiera. */
  objeto: (destino: StorageRef) => Promise<MediaObject | undefined>;
  /** Trabajos vivos sobre este recurso. Del Job Engine; aquí no hay estados nuevos. */
  operaciones: (item: ItemDeMigracion) => Promise<readonly JobState[]>;
  /** Las fuentes históricas, por su identidad. El traslado no sabe de proveedores. */
  fuentes: Readonly<Record<string, FuenteHistorica>>;
  /** Los adaptadores de destino, por su identidad. Los mismos de MC-1. */
  almacenes: Readonly<Record<string, PuertoDeAlmacenamiento>>;
  /** A qué proveedor se copia. Del registro del servidor, nunca de un cliente. */
  destinoProviderId: string;
  /** Registrar la ficha MC-1 del objeto recién puesto. Devuelve si la escribió ESTA pasada. */
  registrarObjeto: (destino: StorageRef, accountId: string, assetId: string, hechos: HechosDelObjeto, at: number) => Promise<string | undefined>;
  /** Guardar cómo quedó el item. Devuelve si lo escribió ESTA pasada. */
  anotarItem: (item: ItemDeMigracion) => Promise<boolean>;
  ahora: () => number;
  politica?: PoliticaDeMigracion;
  /**
   * MC-7 · POR DÓNDE SALEN LAS MEDIDAS. La misma forma que usan MC-4 y MC-5.
   *
   * Una migración es lo que más bytes mueve de todo Media Cloud —lee de una
   * fuente y escribe en un destino— así que produce medidas en los DOS
   * proveedores, cada una con la identidad del suyo.
   */
  medidor?: MedidorDeUso;
}

const sumar = (m: Record<string, number>, k: string): Record<string, number> => ({ ...m, [k]: (m[k] ?? 0) + 1 });

/* ── El traslado ───────────────────────────────────────────────────────────── */

/**
 * PASAR UNA VEZ. Un lote, un informe, y un cursor para seguir.
 *
 * Idempotente por construcción: ejecutarlo dos veces sobre lo mismo no duplica
 * nada. Lo ya verificado se salta, lo copiado-sin-verificar se verifica sin
 * volver a transferir, y lo que falló espera su hora.
 */
export const migrarLote = async (
  deps: DepsDeMigracion,
  migrationId: string,
  cursorInicial?: string,
): Promise<InformeDeMigracion> => {
  const politica = deps.politica ?? POLITICA_DE_MIGRACION;
  const empezo = deps.ahora();
  const informe = {
    ...informeDeMigracionVacio(migrationId),
    porMotivo: {} as Record<string, number>,
    porNivel: {} as Record<string, number>,
  };

  const lote = await deps.items(cursorInicial, politica.maxPorEjecucion);

  for (const item of lote.items) {
    informe.inspeccionados++;

    const almacen = deps.almacenes[deps.destinoProviderId];
    const fuente = deps.fuentes[item.origen?.provider ?? ''];

    const reunir = async () => {
      const material = await deps.material(item);
      const destinoProvisional = material ? destinoDe(material, deps, almacen) : undefined;
      const objeto = destinoProvisional ? await deps.objeto(destinoProvisional) : undefined;
      const origenDice = await describir(fuente, item.origen);
      return {
        origen: item.origen,
        material,
        objeto,
        origenDice,
        fuenteReconocida: !!fuente,
        fuenteDisponible: !!fuente && fuente.estado !== 'DISABLED',
        destinoProviderId: deps.destinoProviderId,
        ...(almacen?.contenedor ? { destinoContenedor: almacen.contenedor } : {}),
        destinoPuedeGuardar: !!almacen && almacen.capacidades.includes('object.put'),
        operaciones: await deps.operaciones(item),
        ...(item.nivelDeVerificacion ? { verificado: item.nivelDeVerificacion } : {}),
        intentos: item.intentos,
        ...(item.ultimoIntentoEn !== undefined ? { ultimoIntentoEn: item.ultimoIntentoEn } : {}),
      };
    };

    const entrada = await reunir();
    const primera = decidirMigracion(entrada, politica, deps.ahora());

    if (primera.accion === 'saltar') {
      informe.saltados++;
      informe.porMotivo = sumar(informe.porMotivo, primera.motivo);
      await cerrar(deps, item, 'saltado', primera.motivo);
      continue;
    }

    if (primera.accion === 'bloquear') {
      informe.bloqueados++;
      informe.porMotivo = sumar(informe.porMotivo, primera.motivo);
      await cerrar(deps, item, 'bloqueado', primera.motivo);
      continue;
    }

    if (primera.accion === 'finalizar') {
      informe.completados++;
      await cerrar(deps, item, 'completado');
      continue;
    }

    /*
     * A partir de aquí se toca algo. El material ya está leído y validado por la
     * decisión, pero el aislamiento se vuelve a comprobar sobre la clave que de
     * verdad se va a escribir: es la última línea antes del proveedor, y es la
     * única que no depende de que ninguna derivación futura siga siendo correcta.
     */
    const material = entrada.material as Asset;
    const destino = primera.destino;
    if (!claveEsDeLaCuenta(destino.objectKey, material.ownerAccountId)) {
      informe.bloqueados++;
      informe.porMotivo = sumar(informe.porMotivo, 'fuera_de_su_cuenta');
      await cerrar(deps, item, 'bloqueado', 'fuera_de_su_cuenta');
      continue;
    }

    const puerto = deps.almacenes[deps.destinoProviderId];
    if (!puerto) {
      informe.bloqueados++;
      informe.porMotivo = sumar(informe.porMotivo, 'sin_destino');
      await cerrar(deps, item, 'bloqueado', 'sin_destino');
      continue;
    }

    /* ── Verificar lo que ya está, sin transferir de nuevo ─────────────────── */

    if (primera.accion === 'verificar') {
      const resultado = await comprobar(deps, item, puerto, destino, entrada.origenDice, material);
      contar(informe, resultado);
      continue;
    }

    /* ── Copiar ────────────────────────────────────────────────────────────── */

    /*
     * ANTES DE TRANSFERIR, SE MIRA.
     *
     * Un vistazo a los metadatos del destino cuesta casi nada y evita volver a
     * pagar la descarga entera de algo que ya está. Cubre los dos casos en que
     * los bytes están sin que haya ficha: el proceso que se murió entre el PUT
     * y el registro, y el que llegó segundo en una carrera. Sin esto, «reanudar»
     * significaría «volver a transferirlo todo», que es justo lo que no puede
     * significar cuando el inventario es grande.
     */
    const yaPuesto = await puerto.mirar(destino);
    medirConsulta(deps, item, material, destino.provider, ANTES_DE_COPIAR);
    if (yaPuesto.ok) {
      informe.yaEstaban++;
      const resultado = await comprobar(deps, item, puerto, destino, entrada.origenDice, material, yaPuesto.objeto);
      contar(informe, resultado);
      continue;
    }

    /*
     * LA SEGUNDA PREGUNTA. Entre la primera decisión y esta pueden haber
     * cambiado las cosas: otro proceso pudo copiarlo, o el material pudo
     * retirarse. Si la segunda no vuelve a decir `copiar`, no se transfiere.
     */
    const segunda = decidirMigracion(await reunir(), politica, deps.ahora());
    if (segunda.accion !== 'copiar') {
      if (segunda.accion === 'verificar') {
        const resultado = await comprobar(deps, item, puerto, destino, entrada.origenDice, material);
        contar(informe, resultado);
        continue;
      }
      if (segunda.accion === 'finalizar') {
        informe.completados++;
        await cerrar(deps, item, 'completado');
        continue;
      }
      /* Saltar y bloquear se cuentan cada uno en lo suyo: no son lo mismo. */
      if (segunda.accion === 'saltar') informe.saltados++; else informe.bloqueados++;
      informe.porMotivo = sumar(informe.porMotivo, segunda.motivo);
      await cerrar(deps, item, segunda.accion === 'saltar' ? 'saltado' : 'bloqueado', segunda.motivo);
      continue;
    }

    const leido = await fuente.leer(item.origen);
    if (!leido.ok) {
      informe.errores++;
      informe.porMotivo = sumar(informe.porMotivo, leido.motivo === 'fallo' ? 'error_de_lectura' : leido.motivo);
      await fallar(deps, item, politica, leido.motivo === 'fallo' ? leido.error : undefined, fuente.sourceId);
      continue;
    }

    /* MC-7 · Lo que se leyó de la fuente histórica: bytes y petición, en SU proveedor. */
    if (deps.medidor) for (const u of usoDeLectura({
      accountId: material.ownerAccountId,
      providerId: fuente.sourceId,
      operacion: 'legacy.read',
      occurredAt: deps.ahora(),
      ancla: { runId: item.migrationId, objectRef: item.itemId },
      assetId: material.assetId,
    }, leido.cuerpo.length)) deps.medidor.medir(u);

    const guardado = await puerto.guardar({
      destino,
      cuerpo: leido.cuerpo,
      contentType: leido.hechos.contentType ?? entrada.origenDice?.contentType ?? 'application/octet-stream',
      siNoExiste: true,
    });

    if (!guardado.ok) {
      informe.errores++;
      informe.porMotivo = sumar(informe.porMotivo, 'error_de_escritura');
      await fallar(deps, item, politica, guardado.error, deps.destinoProviderId);
      continue;
    }

    /*
     * `yaExistia` no es un fallo: es la convergencia. Otro proceso llegó antes,
     * o esta misma migración se murió después del PUT. En los dos casos los
     * bytes están y lo que toca es comprobarlos, no volver a pagarlos.
     */
    if (guardado.yaExistia) informe.yaEstaban++;
    else {
      informe.copiados++;
      informe.bytesCopiados += leido.cuerpo.length;
    }

    /*
     * MC-7 · La escritura se mide TAMBIÉN cuando ya existía: la petición salió
     * hacia el proveedor y se cobra igual. Lo que cambia es la cantidad — un
     * `siNoExiste` que rebota no transfiere el cuerpo— y por eso los bytes van
     * a cero y la operación sigue contando una.
     */
    const transferidos = guardado.yaExistia ? 0 : leido.cuerpo.length;
    if (deps.medidor) for (const u of usoDeEscritura({
      accountId: material.ownerAccountId,
      providerId: deps.destinoProviderId,
      operacion: 'object.put',
      occurredAt: deps.ahora(),
      ancla: { runId: item.migrationId, objectRef: item.itemId },
      assetId: material.assetId,
    }, transferidos)) deps.medidor.medir(u);

    /*
     * Se comprueba contra lo que la fuente DECLARÓ, no contra lo que llegó.
     *
     * Parece un detalle y es la diferencia entre comprobar algo y no comprobar
     * nada: si se compara lo descargado con lo escrito, una descarga truncada
     * pasa la verificación —los dos lados coinciden en el tamaño equivocado—.
     * La declaración es la única afirmación independiente que hay, y por eso es
     * la que manda. Si la fuente no declaró nada, se usa lo leído, que es peor
     * pero es lo que hay, y el nivel lo dirá.
     */
    const resultado = await comprobar(deps, item, puerto, destino, entrada.origenDice ?? leido.hechos, material);
    contar(informe, resultado);
  }

  return {
    ...informe,
    porMotivo: Object.freeze({ ...informe.porMotivo }),
    porNivel: Object.freeze({ ...informe.porNivel }),
    ...(lote.cursor ? { cursor: lote.cursor } : {}),
    ms: deps.ahora() - empezo,
  };
};

/* ── Las piezas ────────────────────────────────────────────────────────────── */

/**
 * El destino sale del MISMO sitio que en la decisión: `destinoDeMigracion`, que
 * a su vez llama a `claveDelObjeto`. Derivarlo aquí a mano habría dado dos
 * derivaciones que un día divergen, y el día que divergen se escribe en un sitio
 * que la decisión no autorizó.
 */
const destinoDe = (
  material: Asset,
  deps: DepsDeMigracion,
  almacen: PuertoDeAlmacenamiento | undefined,
): StorageRef | undefined =>
  destinoDeMigracion(material, deps.destinoProviderId, almacen?.contenedor);

const describir = async (
  fuente: FuenteHistorica | undefined,
  origen: StorageRef,
): Promise<HechosDelObjeto | undefined> => {
  if (!fuente || fuente.estado === 'DISABLED') return undefined;
  const d = await fuente.describir(origen);
  return d.ok ? d.hechos : undefined;
};

/**
 * MC-7 · CUÁL DE LAS DOS CONSULTAS ES.
 *
 * El traslado pregunta al destino como mucho dos veces: una antes de copiar
 * —«¿ya está?»— y otra para verificar. Son dos peticiones distintas y el
 * proveedor cobra las dos, así que no pueden compartir identidad. La secuencia
 * la dice QUIEN LLAMA, que es quien sabe cuál es; contarlas con un contador de
 * módulo habría puesto estado compartido entre ejecuciones concurrentes.
 */
const ANTES_DE_COPIAR = 0;
const AL_VERIFICAR = 1;

/** Una consulta de metadatos, medida. Escrita una vez para que las dos se cuenten igual. */
const medirConsulta = (
  deps: DepsDeMigracion,
  item: ItemDeMigracion,
  material: Asset,
  providerId: string,
  secuencia: number,
): void => {
  if (deps.medidor) for (const u of usoDeOperacion({
    accountId: material.ownerAccountId,
    providerId,
    operacion: 'object.head',
    occurredAt: deps.ahora(),
    ancla: { runId: item.migrationId, objectRef: item.itemId, secuencia },
    assetId: material.assetId,
  })) deps.medidor.medir(u);
};

type ResultadoDeComprobacion =
  | { estado: 'completado'; nivel: NivelDeVerificacion }
  | { estado: 'fallido'; motivo: string };

/**
 * PREGUNTARLE AL DESTINO QUÉ TIENE, Y COMPARARLO.
 *
 * Esto es lo que separa «el PUT devolvió 200» de «los bytes están y son los
 * mismos». Se pregunta con `mirar` —una lectura de metadatos, sin traer nada— y
 * se compara contra lo que dijo el origen. La ficha MC-1 del objeto solo se
 * escribe DESPUÉS de que la comparación salga bien: una ficha que diga que unos
 * bytes están cuando no se ha comprobado es la mentira que MC-6 existe para no
 * contar.
 */
const comprobar = async (
  deps: DepsDeMigracion,
  item: ItemDeMigracion,
  puerto: PuertoDeAlmacenamiento,
  destino: StorageRef,
  origenDice: HechosDelObjeto | undefined,
  material: Asset,
  /** Lo que el destino ya dijo de sí mismo, si se le acaba de preguntar. Evita un segundo vistazo. */
  yaVisto?: ObjetoGuardado,
): Promise<ResultadoDeComprobacion> => {
  /*
   * MC-7 · La VERIFICACIÓN es una consulta de metadatos contra el proveedor, y
   * se cobra como cualquier otra. Solo se mide cuando de verdad se pregunta: si
   * el destino ya se había mirado, esa consulta ya se midió en su sitio y
   * contarla otra vez duplicaría una petición que solo ocurrió una vez.
   */
  const visto = yaVisto ? { ok: true as const, objeto: yaVisto } : await puerto.mirar(destino);
  if (!yaVisto) medirConsulta(deps, item, material, destino.provider, AL_VERIFICAR);
  const hechos = visto.ok ? hechosDelDestino(visto.objeto) : undefined;
  const veredicto = verificarCopia(origenDice, hechos);
  const at = deps.ahora();

  if (!veredicto.ok) {
    await deps.anotarItem({
      ...item,
      destino,
      assetId: material.assetId,
      accountId: material.ownerAccountId,
      estado: 'fallido',
      falloDeVerificacion: veredicto.motivo,
      intentos: item.intentos + 1,
      ultimoIntentoEn: at,
      updatedAt: at,
    });
    return { estado: 'fallido', motivo: veredicto.motivo };
  }

  const objectRef = await deps.registrarObjeto(destino, material.ownerAccountId, material.assetId, hechos ?? {}, at);

  await deps.anotarItem({
    ...item,
    destino,
    assetId: material.assetId,
    accountId: material.ownerAccountId,
    ...(objectRef ? { objectRef } : {}),
    estado: 'completado',
    nivelDeVerificacion: veredicto.nivel,
    ...(hechos?.bytes !== undefined ? { bytes: hechos.bytes } : {}),
    updatedAt: at,
  });

  return { estado: 'completado', nivel: veredicto.nivel };
};

const contar = (
  informe: InformeDeMigracion & { porMotivo: Record<string, number>; porNivel: Record<string, number> },
  r: ResultadoDeComprobacion,
): void => {
  informe.verificados++;
  if (r.estado === 'completado') {
    informe.completados++;
    informe.porNivel = sumar(informe.porNivel, r.nivel);
  } else {
    informe.fallidos++;
    informe.porMotivo = sumar(informe.porMotivo, r.motivo);
  }
};

const cerrar = async (
  deps: DepsDeMigracion,
  item: ItemDeMigracion,
  estado: EstadoDeMigracion,
  motivo?: ItemDeMigracion['motivo'],
): Promise<void> => {
  const at = deps.ahora();
  await deps.anotarItem({ ...item, estado, ...(motivo ? { motivo } : {}), updatedAt: at });
};

/**
 * NO SE PUDO. Se anota el intento y se deja para más adelante.
 *
 * Si merece otro intento o ya no, lo decide el Core en la próxima pasada con la
 * cuenta delante. Aquí no se decide eso — igual que en MC-5, y por lo mismo.
 */
const fallar = async (
  deps: DepsDeMigracion,
  item: ItemDeMigracion,
  politica: PoliticaDeMigracion,
  error: Parameters<typeof errorDeMigracionSaneado>[0],
  fuente: string,
): Promise<void> => {
  const at = deps.ahora();
  const intentos = item.intentos + 1;
  await deps.anotarItem({
    ...item,
    estado: intentos >= politica.maxIntentos ? 'fallido' : 'descubierto',
    intentos,
    ultimoIntentoEn: at,
    ...(error ? { error: errorDeMigracionSaneado(error, fuente) } : {}),
    updatedAt: at,
  });
};
