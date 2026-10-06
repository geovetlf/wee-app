import { createHash } from 'node:crypto';
import { AssetKind, CAPABILITY_CATALOG, CapabilityId, DerechosDelMaterial, Job, Provenance, VariantKind } from '../core';
import { AvisoNormalizado } from './aviso';

/**
 * WEË RUNTIME — TRAERSE EL RESULTADO A CASA ANTES DE QUE SE EVAPORE.
 *
 * ── El reloj más corto de todos ─────────────────────────────────────────────
 *
 * Lo que devuelve un proveedor cuando termina no es un vídeo: es un ENLACE a un
 * vídeo, firmado y con fecha de caducidad. ModelArk da veinticuatro horas; BFL,
 * diez minutos. Cerrar el trabajo guardando ese enlace como resultado es
 * entregarle a la persona algo que deja de existir sin que nadie lo toque —y
 * cobrarle por ello—.
 *
 * Así que el orden no es negociable:
 *
 *     el proveedor termina → se GUARDA en casa → recién entonces se cierra
 *
 * Si no se pudo guardar, el trabajo NO se cierra. Sigue esperando, y alguien
 * volverá a intentarlo mientras el enlace valga. Cerrarlo «con lo que hay»
 * sería convertir un problema de red en una pérdida definitiva.
 *
 * ── Lo que esto NO es ───────────────────────────────────────────────────────
 *
 * NO es un sistema de materiales nuevo. El material de Weë es el de la Fase 11
 * —su contrato, su dueño, sus versiones, su procedencia— y aquí no se copia ni
 * se sustituye: se construye lo que ese contrato pide y se le entrega a quien
 * lo guarda. Aquí no hay Storage, ni Firestore, ni red: solo la identidad, la
 * procedencia y el puerto.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA.
 */

/**
 * LA IDENTIDAD DEL MATERIAL, CALCULADA Y NO SORTEADA.
 *
 * Un aviso de proveedor puede llegar tres veces —ModelArk reintenta— y una
 * reconciliación puede llegar a la vez que el aviso. Si cada llegada inventara
 * un identificador, cada llegada crearía un material: tres vídeos idénticos en
 * «Mis creaciones», tres objetos pagados en el almacén, y ninguna forma de
 * saber cuál sobra.
 *
 * Por eso se deriva de lo único que es igual en las tres llegadas y distinto
 * entre dos ejecuciones legítimas:
 *
 *     sha256(jobId, attemptId)
 *
 * ── Por qué el INTENTO y no solo el trabajo ─────────────────────────────────
 *
 * Un trabajo puede reintentarse. El segundo intento es OTRA ejecución, con otro
 * coste y otro resultado, y merece su propio material; colgarlo del trabajo
 * haría que el reintento pisara el resultado del primero.
 *
 * ── Y por qué no las otras candidatas ───────────────────────────────────────
 *
 *   la URL del proveedor   cambia entre consultas y caduca: el mismo vídeo
 *                          tendría dos identidades el martes y ninguna el jueves
 *   un id al azar          una identidad por llegada, que es justo el problema
 *   la hora                dos llegadas nunca coinciden
 *   algo que diga el cliente  no es suyo, y no se le pregunta
 *
 * ── Y en el MISMO espacio que cualquier otro material ───────────────────────
 *
 * `asset_` y treinta y dos hexadecimales, como el que se sortea al crear un
 * material desde una URL. Antes esta identidad se escribía `mat_…`, y un segundo
 * espacio de nombres era un material que existía y que nadie podía leer:
 * `leerMaterial` solo reconoce `asset_`, así que el «¿ya está?» de la
 * materialización no lo encontraba —y volvía a descargarlo—, `deleteAsset` no
 * podía retirarlo, productions no podía referenciarlo y un vídeo terminado no
 * se podía devolver. Cómo nació un material lo dice su procedencia, no su
 * prefijo.
 */
export const identidadDelMaterial = (jobId: string, attemptId: string): string | undefined => {
  if (typeof jobId !== 'string' || typeof attemptId !== 'string') return undefined;
  const j = jobId.trim();
  const a = attemptId.trim();
  if (!j.length || !a.length || j.length > 400 || a.length > 400) return undefined;
  return `asset_${createHash('sha256').update(`${j}|${a}`, 'utf8').digest('hex').slice(0, 32)}`;
};

/**
 * DE DÓNDE VIENE ESTE ARCHIVO. Construida del TRABAJO, no del aviso.
 *
 * Todo lo que ata este material a lo que lo produjo sale de lo guardado: el
 * trabajo, su traza y su intento. Del mensaje del proveedor se toma UNA cosa
 * —cómo llama él a la operación— y ni una más: quien manda un aviso no decide
 * de quién es el resultado, ni a qué trabajo pertenece, ni cuánto costó.
 */
export const procedenciaDe = (job: Job, aviso: AvisoNormalizado, at: number): Provenance => ({
  ...(job.trace.runId ? { runId: job.trace.runId } : {}),
  ...(job.trace.stepId ? { stepId: job.trace.stepId } : {}),
  ...(job.trace.requestId ? { requestId: job.trace.requestId } : {}),
  ...(job.trace.traceId ? { traceId: job.trace.traceId } : {}),
  jobId: job.jobId,
  operationId: aviso.operationId,
  ...(job.capability ? { capability: job.capability as CapabilityId } : {}),
  ...(job.implementation?.providerId ? { provider: job.implementation.providerId } : {}),
  ...(job.implementation?.modelId ? { model: job.implementation.modelId } : {}),
  createdAt: at,
});

/**
 * LO QUE HAY QUE GUARDAR. El enlace viaja aquí y no llega a ningún otro sitio:
 * no se escribe en el trabajo, no se escribe en el material y no se registra.
 */
export interface PeticionDeMaterializacion {
  /** Calculado, no sorteado. Dos llegadas del mismo desenlace piden el mismo. */
  assetId: string;
  /** La cuenta a la que pertenece. Sale del TRABAJO guardado, nunca del aviso. */
  userId: string;
  kind: AssetKind;
  /**
   * TEMPORAL Y FIRMADO. Se usa para traerse los bytes y se olvida.
   *
   * Vacío cuando lo que hay que guardar no son bytes en ningún sitio sino
   * TEXTO, que llega entero en la respuesta. Ver `contenido`.
   */
  recurso?: string;
  /**
   * EL TEXTO, CUANDO EL RESULTADO ES TEXTO. La otra mitad de `recurso`.
   *
   * Un guion, una descripción de una foto, una búsqueda con fuentes: eso no es
   * un enlace que caduca, es la respuesta entera. Pedirle una URL habría
   * obligado a subir un archivo a un almacén para poder volver a leerlo dos
   * segundos después, en el mismo proceso — un objeto pagado, una firma y una
   * descarga para algo que ya estaba en memoria.
   *
   * La Fase 11 ya lo contempla: `materialValido` admite un material de texto
   * SIN `storageRef`, y `AssetKind` incluye `text` desde el primer día. Esto
   * no abre un contrato: usa el que estaba esperando.
   *
   * Una de las dos, nunca las dos: quien implemente el puerto elige camino por
   * cuál llegó, y dos verdades sobre el mismo material no viajan juntas.
   */
  contenido?: string;
  provenance: Provenance;
  /** Escalares del proveedor, ya acotados. Ni enlaces, ni texto de nadie. */
  metadata?: Readonly<Record<string, string | number | boolean>>;
  /**
   * LA LICENCIA AJENA QUE ACOMPAÑA AL RESULTADO (`Asset.derechos`), sacada del modelo del TRABAJO guardado —nunca
   * del aviso—. Sin ella, un mundo nacería sin su restricción territorial.
   */
  derechos?: DerechosDelMaterial;
  /** Las variantes que dio el proveedor (la vista previa), temporales como `recurso`: se traen y se anotan. */
  variantes?: readonly { kind: VariantKind; recurso: string }[];
}

export type DesenlaceDeMaterializacion =
  /* Está en casa. `yaEstaba` distingue «lo guardé yo» de «ya lo había guardado otra llegada». */
  | { ok: true; assetId: string; yaEstaba: boolean }
  /*
   * No se pudo. NO cierra el trabajo y NO mueve dinero: el resultado existe del
   * otro lado y el enlace puede seguir valiendo, así que esto se vuelve a
   * intentar. Solo `caducado` es definitivo, y ni siquiera ese se cobra solo.
   */
  | { ok: false; motivo: 'no_se_pudo_traer' | 'caducado' | 'rechazado' | 'fallo' };

/**
 * EL PUERTO. Quien lo implementa habla con el almacén y con la Fase 11; el
 * runtime solo declara que hace falta alguien que sepa hacerlo.
 *
 * Tiene que ser IDEMPOTENTE: llamarlo dos veces con el mismo `assetId` deja un
 * solo material y contesta las dos veces que está. Es lo que permite que el
 * aviso y la reconciliación lleguen a la vez sin duplicar nada.
 */
export interface PuertoDeMaterializacion {
  guardar(peticion: PeticionDeMaterializacion): Promise<DesenlaceDeMaterializacion>;
}

/** De la modalidad que declara el catálogo a la clase de material de la Fase 11. */
const CLASE_POR_MODALIDAD: Readonly<Record<string, AssetKind>> = Object.freeze({
  text: 'text', image: 'image', video: 'video',
  voice: 'audio', audio: 'audio', music: 'audio',
  doc: 'document', '3d': 'model3d',
  /* Mirar una foto produce una DESCRIPCIÓN, y una descripción es texto. */
  vision: 'text',
});

/**
 * QUÉ CLASE DE MATERIAL PRODUCE UNA CAPACIDAD. Lo dice EL CATÁLOGO.
 *
 * ── Por qué ya no se lee el prefijo ─────────────────────────────────────────
 *
 * Porque adivinaba, y adivinaba mal en treinta y ocho de las sesenta y ocho
 * capacidades. Mientras esto solo guardaba vídeos e imágenes nadie lo notó —ahí
 * el prefijo y el catálogo dicen lo mismo—, pero el prefijo no veía que
 * `vision.describe` produce texto (catorce de las cuarenta y una dependencias de
 * Weë salen de ahí), ni que `script.write`, `scene.split`, `subtitle.generate`,
 * `doc.read` o `translation.text` también.
 *
 * Y cinco eran peores que un olvido: `image.analyze`, `video.analyze`,
 * `audio.transcribe`, `audio.analyze` y `music.analyze` producen TEXTO y el
 * prefijo decía imagen, vídeo y audio. Guardar una transcripción como material
 * de audio habría intentado descargar bytes de un enlace que no existe.
 *
 * El catálogo ya declaraba `produces` en las sesenta y ocho. Había una verdad y
 * una suposición; se quita la suposición.
 */
/**
 * LAS CAPACIDADES CUYA CLASE DE MATERIAL ES MÁS PRECISA QUE SU MODALIDAD. La modalidad `3d` agrupa un objeto 3D y un
 * mundo explorable, y el Content Core los distingue (`model3d` y `world`): sin esto, un mundo que llegara por el
 * camino asíncrono se guardaba como objeto 3D, y por `creatorRun` como mundo. La misma capacidad, dos clases.
 */
const CLASE_POR_CAPACIDAD: Readonly<Record<string, AssetKind>> = Object.freeze({
  'world.generate': 'world',
});

export const tipoDeMaterialDe = (capability: string | undefined): AssetKind | undefined => {
  if (typeof capability !== 'string') return undefined;
  if (Object.prototype.hasOwnProperty.call(CLASE_POR_CAPACIDAD, capability)) return CLASE_POR_CAPACIDAD[capability];
  const entrada = CAPABILITY_CATALOG.find((e) => e.id === capability);
  return entrada ? CLASE_POR_MODALIDAD[entrada.produces] : undefined;
};

/* ── El texto también es material ─────────────────────────────────────────── */

/**
 * CUÁNTO TEXTO SE GUARDA COMO MATERIAL.
 *
 * Un guion largo cabe de sobra; una respuesta que se fue de madre, no. El tope
 * existe porque esto acaba en un documento y un documento tiene un límite duro,
 * y porque un resultado que no cabe es una señal de que algo salió mal antes.
 */
export const MAX_TEXTO_DEL_MATERIAL = 200_000;

/**
 * DE DÓNDE VIENE, CONSTRUIDA DEL DESPACHO.
 *
 * Hermana de `procedenciaDe`, que se construye del trabajo guardado y del aviso
 * de un proveedor. Esta es la del camino SÍNCRONO: no hay aviso que leer porque
 * el resultado llegó en la misma llamada, y todo lo que ata este material a lo
 * que lo produjo sale del despacho, que lo armó el Job Engine.
 */
export const procedenciaDelDespacho = (
  dispatch: {
    jobId: string;
    capability?: string;
    implementation?: { providerId?: string; modelId?: string };
    trace: { runId?: string; stepId?: string; requestId?: string; traceId?: string };
  },
  at: number,
): Provenance => ({
  ...(dispatch.trace.runId ? { runId: dispatch.trace.runId } : {}),
  ...(dispatch.trace.stepId ? { stepId: dispatch.trace.stepId } : {}),
  ...(dispatch.trace.requestId ? { requestId: dispatch.trace.requestId } : {}),
  ...(dispatch.trace.traceId ? { traceId: dispatch.trace.traceId } : {}),
  jobId: dispatch.jobId,
  ...(dispatch.capability ? { capability: dispatch.capability as CapabilityId } : {}),
  ...(dispatch.implementation?.providerId ? { provider: dispatch.implementation.providerId } : {}),
  ...(dispatch.implementation?.modelId ? { model: dispatch.implementation.modelId } : {}),
  createdAt: at,
});

/**
 * LO QUE HAY QUE GUARDAR DE UN RESULTADO DE TEXTO. Pura: aquí no se guarda nada.
 *
 * ── Por qué esto tenía que existir ──────────────────────────────────────────
 *
 * Porque `referenciasDe` devuelve las URLs del resultado, y un texto no tiene
 * ninguna. Sin referencia, `materialDe` lo descartaba, y el paso siguiente no
 * recibía nada: treinta y ocho de las cuarenta y una dependencias de Weë
 * salen de un paso que produce texto, así que el noventa y tres por ciento
 * del grafo terminaba en un paso que no podía leer lo que el anterior
 * había escrito.
 *
 * La identidad es la MISMA que la de cualquier otro material —`jobId` más
 * `attemptId`, calculada y no sorteada—, así que dos llegadas del mismo intento
 * piden el mismo material y no aparecen dos guiones idénticos.
 *
 * De quién es sale del despacho, que lo armó el Job Engine desde el trabajo
 * guardado. Nunca de lo que conteste un proveedor.
 */
export const materialDeTexto = (
  dispatch: {
    jobId: string;
    attemptId: string;
    capability?: string;
    implementation?: { providerId?: string; modelId?: string };
    trace: { userId: string; runId?: string; stepId?: string; requestId?: string; traceId?: string };
  },
  contenido: unknown,
  at: number,
): PeticionDeMaterializacion | undefined => {
  if (typeof contenido !== 'string') return undefined;
  const texto = contenido.trim();
  if (!texto.length || texto.length > MAX_TEXTO_DEL_MATERIAL) return undefined;
  /* Solo lo que el catálogo dice que produce texto. Un vídeo con `content` no es un texto. */
  if (tipoDeMaterialDe(dispatch.capability) !== 'text') return undefined;
  const assetId = identidadDelMaterial(dispatch.jobId, dispatch.attemptId);
  if (!assetId) return undefined;
  return Object.freeze({
    assetId,
    /* DEL DESPACHO, que lo armó el Job Engine. Ni del resultado, ni del cliente. */
    userId: dispatch.trace.userId,
    kind: 'text' as const,
    contenido: texto,
    provenance: procedenciaDelDespacho(dispatch, at),
  });
};
