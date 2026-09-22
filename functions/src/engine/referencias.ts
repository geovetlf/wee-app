import {
  AssetKind,
  ContinuityAnchor,
  ContinuityRequirements,
  Element,
  ElementAssetRef,
  ElementAssetRole,
  Entrega,
} from '../core';

/**
 * WEË — DE UN ANCLAJE A MATERIAL AUTORIZADO, Y NADA MÁS.
 *
 * ── El tramo que esto cierra ────────────────────────────────────────────────
 *
 *   anclaje            «conserva lo de `el_luna_0001`, versión 4»
 *          ↓
 *   el elemento        leído POR LA CUENTA. De otra cuenta = no existe.
 *          ↓
 *   la versión         exacta. Ver abajo, que es lo importante.
 *          ↓
 *   su material        `refs`, que ya existe desde S4. No se inventa relación.
 *          ↓
 *   la entrega         la llave temporal que firma Media Cloud.
 *          ↓
 *   material neutral   sin proveedor, sin contenedor, sin clave de objeto.
 *
 * Y ahí se para. Lo que venga después —qué mecanismo lo puede usar y hasta
 * dónde llega— es de `continuidad.ts`, que es C7 y no cambia.
 *
 * ── LA VERSIÓN NO TIENE HISTORIA, Y ESO SE DICE ─────────────────────────────
 *
 * Un `Element` guarda UN entero en el documento vivo y `actualizarElemento`
 * sobrescribe en sitio: cuando algo pasa de v3 a v4, los `refs` de v3 dejan de
 * existir en todo Weë. No están archivados ni reconstruibles.
 *
 * Así que la regla es una sola y no tiene excepciones:
 *
 *   se pide la versión actual  → se materializa.
 *   se pide cualquier otra     → `version_not_found`.
 *
 * NUNCA se cae en la actual. Ni hacia abajo (pidió v3, hay v4) ni hacia arriba
 * (pidió v5, hay v4). Devolver v4 a quien pidió v3 sería exactamente la mentira
 * que toda la continuidad existe para evitar: la referencia dejaría de ser la
 * que se ancló y nadie se enteraría. La historia de versiones es una fase
 * aparte; mientras no exista, esto contesta que no y se queda tranquilo.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No llama a ningún proveedor. No crea trabajos. No cobra. NO ESCRIBE NADA:
 * ni una fila, ni un campo, ni una marca de uso. No enruta, no elige modelo, no
 * valida el resultado de nada, y no mira una sola imagen.
 */

/* ── Límites ──────────────────────────────────────────────────────────────── */

/**
 * CUÁNTOS ANCLAJES SE ATIENDEN COMO MUCHO, ya deduplicados.
 *
 * Un tope duro y no una preferencia: cada uno cuesta lecturas, y sin techo una
 * petición podría pedir treinta y dos referencias y convertir esto en un
 * recorrido. Ocho da de sobra para personaje + ropa + entorno + objeto, que es
 * el caso que motivó la fase.
 */
export const MAX_ANCLAJES_DE_CONTINUIDAD = 8;

/* ── Por qué un anclaje no da material ────────────────────────────────────── */

/**
 * LOS CINCO MOTIVOS. Literales cerrados, nunca una frase.
 *
 * `not_found` contesta lo mismo para «no está» que para «no es tuyo», y eso es
 * deliberado: si se distinguieran, cualquiera podría averiguar qué elementos
 * tiene otra cuenta probando identificadores. Es la misma decisión que ya tomó
 * `puedeReferenciar` en el Core, y aquí se respeta en vez de reabrirse.
 */
export type MotivoDeReferencia =
  /* No existe, o es de otra cuenta. Las dos cosas se contestan IGUAL. */
  | 'not_found'
  /* Existe y es tuyo, pero va por otra versión. Sin aproximar. */
  | 'version_not_found'
  /* Existe, es tuyo, versión correcta, y no tiene un material que enseñar. */
  | 'no_material'
  /* Tiene material y no se puede entregar: no está listo, o no se pudo firmar. */
  | 'material_unavailable'
  /* Llegaron más anclajes de los que se atienden. */
  | 'limit_exceeded';

/* ── Lo que sale ──────────────────────────────────────────────────────────── */

/**
 * MATERIAL DE REFERENCIA, SIN UN SOLO RASTRO DE DÓNDE VIVE.
 *
 * Lleva de quién es la referencia —el elemento y la versión que se pidió—, qué
 * material la representa y una llave que caduca. NO lleva el proveedor de
 * almacenamiento, ni el contenedor, ni la clave del objeto, ni la referencia
 * física, ni la cuenta dueña: quien lo reciba no tiene por qué saber nada de
 * eso, y ese desconocimiento es justo lo que permite mudar los bytes sin tocar
 * ni un adaptador.
 */
export interface ReferenciaDeContinuidad {
  elementId: string;
  /** La que se PIDIÓ, que aquí es siempre la que se resolvió. Se escribe para que se pueda comprobar. */
  requestedVersion: number;
  assetId: string;
  /** El papel que ese material tiene dentro del elemento. Vocabulario de S4. */
  role: ElementAssetRole;
  /** Clase abstracta: imagen, vídeo, audio… El vocabulario de la Fase 11, sin ampliar. */
  materialType: AssetKind;
  /** La llave temporal. No se guarda en ninguna parte, ni aquí ni más abajo. */
  url: string;
  /** Cuándo deja de valer. Después de esto el material sigue estando. */
  expiresAt: number;
}

export interface FalloDeReferencia {
  elementId: string;
  requestedVersion: number;
  reason: MotivoDeReferencia;
}

/**
 * EL RESULTADO. Lo que se pudo, lo que no, y lo que costó.
 *
 * `fallos` no es una lista de avisos: es la mitad importante. Un anclaje que no
 * da material y se calla convierte una generación que no puede cumplir lo que
 * se pidió en una que parece que sí.
 */
export interface ResolucionDeReferencias {
  materiales: readonly ReferenciaDeContinuidad[];
  fallos: readonly FalloDeReferencia[];
  /** Lecturas de verdad hechas. Para poder decir el coste medido y no estimado. */
  lecturas: number;
}

/* ── Las dos puertas que esto usa, y ninguna más ──────────────────────────── */

/**
 * DE DÓNDE SALEN LAS DOS COSAS QUE HACEN FALTA.
 *
 * Entran como puerto —igual que hace la entrega de MC-2— por dos motivos: para
 * poder probar esto sin Firestore, y para no escribir una segunda forma de
 * contestar «¿es tuyo?». `elemento` es la puerta de S4, que ya devuelve `null`
 * cuando el dueño no coincide; `entrega` es la de Media Cloud, que ya comprueba
 * cuenta, estado, ficha del objeto y capacidad del almacén antes de firmar.
 */
export interface DepsDeReferencias {
  /** La puerta de S4. Devuelve `null` si no está O si es de otra cuenta. */
  elemento: (accountId: string, elementId: string) => Promise<Element | null>;
  /** La puerta de MC-2, ya atada a quien pide. Devuelve `null` si no se puede entregar. */
  entrega: (assetId: string) => Promise<Entrega | null>;
  maxAnclajes?: number;
}

/* ── Qué anclajes necesitan material ──────────────────────────────────────── */

const clave = (a: ContinuityAnchor): string => `${a.elementId}@${a.version}`;

/**
 * LOS ANCLAJES QUE DE VERDAD HAY QUE RESOLVER. Deduplicados y en orden.
 *
 * Dos reglas, y las dos ahorran trabajo real:
 *
 * 1 · SIN `preserve` NO SE MATERIALIZA NADA. `mayChange` es permiso, no orden:
 *     decir «la ropa puede cambiar» no pide ninguna referencia, y traerla sería
 *     pagar lecturas y quemar huecos por algo que nadie exigió.
 *
 * 2 · EL MISMO `elementId@version` SE RESUELVE UNA VEZ. Que tres aspectos se
 *     apoyen en el mismo personaje no son tres lecturas ni tres referencias:
 *     es una, y el orden de llegada decide cuál se queda.
 */
export const anclajesQueNecesitanMaterial = (
  requisitos: ContinuityRequirements | undefined,
): readonly ContinuityAnchor[] => {
  if (!requisitos || !Array.isArray(requisitos.preserve) || requisitos.preserve.length === 0) return [];
  if (!Array.isArray(requisitos.anchors) || requisitos.anchors.length === 0) return [];
  const vistos = new Set<string>();
  const salida: ContinuityAnchor[] = [];
  for (const a of requisitos.anchors) {
    const k = clave(a);
    if (vistos.has(k)) continue;
    vistos.add(k);
    salida.push(a);
  }
  return Object.freeze(salida);
};

/* ── El material que representa a un elemento ─────────────────────────────── */

/**
 * CUÁL DE SUS MATERIALES SE USA. Uno, y no se elige a dedo.
 *
 * Un elemento puede tener treinta y dos referencias; mandarlas todas llenaría
 * los huecos del mecanismo con un solo sujeto, y coger «la primera» sería
 * elegir arbitrariamente, que es justo lo que esta fase no puede hacer.
 *
 * Así que se usa `primary`, que NO es una invención de aquí: es lo que S4
 * definió como «la que se enseña cuando hay que enseñar una sola», y de la que
 * `validarElemento` ya garantiza que no hay dos. Si un elemento no tiene
 * `primary`, no hay una respuesta no arbitraria y se dice `no_material`.
 *
 * Varias referencias salen de varios ANCLAJES —personaje, ropa, entorno—, que
 * es como se pidieron.
 */
export const materialQueRepresenta = (elemento: Element): ElementAssetRef | undefined =>
  elemento.refs.find((r) => r.role === 'primary');

/* ── La resolución ────────────────────────────────────────────────────────── */

/**
 * DE LOS ANCLAJES AL MATERIAL AUTORIZADO. En este orden y sin saltarse uno.
 *
 *   1 · la cuenta         viene ya resuelta. Jamás de lo que mande un cliente.
 *   2 · el elemento       por la puerta que comprueba dueño. Ajeno = no existe.
 *   3 · la versión        exacta o nada. Sin caer en la actual.
 *   4 · su material       `refs`, el `primary`. Relación que ya existía.
 *   5 · la entrega        por la puerta de Media Cloud, que vuelve a comprobar
 *                         cuenta, estado y ficha del objeto antes de firmar.
 *   6 · material neutral  sin proveedor y sin nada de dónde viven los bytes.
 *
 * ── El coste, medido ────────────────────────────────────────────────────────
 *
 * Tras deduplicar: UNA lectura por elemento distinto, y las que cueste cada
 * entrega (dos: el material y la ficha de su objeto, ninguna por consulta).
 * Ni un índice nuevo, ni un recorrido, ni un N+1. El tope de anclajes acota el
 * total antes de empezar, y lo que sobra se dice —`limit_exceeded`— en vez de
 * recortarse en silencio.
 */
export const resolverReferenciasDeContinuidad = async (
  accountId: string,
  requisitos: ContinuityRequirements | undefined,
  deps: DepsDeReferencias,
): Promise<ResolucionDeReferencias> => {
  const vacio: ResolucionDeReferencias = Object.freeze({ materiales: [], fallos: [], lecturas: 0 });
  if (typeof accountId !== 'string' || !accountId) return vacio;

  const anclajes = anclajesQueNecesitanMaterial(requisitos);
  if (anclajes.length === 0) return vacio;

  const tope = Math.max(0, deps.maxAnclajes ?? MAX_ANCLAJES_DE_CONTINUIDAD);
  const materiales: ReferenciaDeContinuidad[] = [];
  const fallos: FalloDeReferencia[] = [];
  let lecturas = 0;

  /* Lo que no cabe se NOMBRA. Recortar a los primeros sería elegir por ellos. */
  for (const a of anclajes.slice(tope)) {
    fallos.push({ elementId: a.elementId, requestedVersion: a.version, reason: 'limit_exceeded' });
  }

  for (const anclaje of anclajes.slice(0, tope)) {
    const no = (reason: MotivoDeReferencia): void => {
      fallos.push({ elementId: anclaje.elementId, requestedVersion: anclaje.version, reason });
    };

    /* 2 · El elemento. De otra cuenta y ausente contestan lo mismo. */
    const elemento = await deps.elemento(accountId, anclaje.elementId);
    lecturas += 1;
    if (!elemento) { no('not_found'); continue; }

    /*
     * 3 · LA VERSIÓN. Aquí es donde esto se gana el sueldo.
     *
     * Ni `<` ni `>` valen. No hay historia que consultar, así que pedir una
     * versión que no es la actual no tiene respuesta correcta —y la incorrecta,
     * devolver la de ahora, rompería el ancla sin avisar a nadie—.
     */
    if (elemento.version !== anclaje.version) { no('version_not_found'); continue; }

    /* 4 · Su material. La relación de S4, sin inventar ninguna. */
    const ref = materialQueRepresenta(elemento);
    if (!ref) { no('no_material'); continue; }

    /* 5 · La llave. Media Cloud vuelve a comprobarlo todo; aquí no se repite. */
    const entrega = await deps.entrega(ref.assetId);
    lecturas += 2;
    if (!entrega) { no('material_unavailable'); continue; }

    /* 6 · Y sale sin una sola pista de dónde estaban los bytes. */
    materiales.push(Object.freeze({
      elementId: elemento.elementId,
      requestedVersion: anclaje.version,
      assetId: entrega.assetId,
      role: ref.role,
      materialType: ref.kind,
      url: entrega.url,
      expiresAt: entrega.expiraEn,
    }));
  }

  return Object.freeze({
    materiales: Object.freeze(materiales),
    fallos: Object.freeze(fallos),
    lecturas,
  });
};

/* ── Cómo entra en la petición ────────────────────────────────────────────── */

/**
 * EL MATERIAL, EN LAS CLAVES ABSTRACTAS QUE EL MOTOR YA USABA.
 *
 * `referenceImages`, `referenceVideos` y `referenceAudios` no son de ningún
 * proveedor: son las claves con las que el motor viene describiendo referencias
 * desde antes de todo esto, y cada adaptador las traduce a lo suyo. Meter aquí
 * `input_image` o `reference_image` sería bajar un nombre de proveedor hasta un
 * sitio que no puede conocerlos.
 *
 * Y NO PISA lo que ya venía: si alguien adjuntó una foto, esa foto sigue. El
 * material de continuidad se AÑADE, porque quitarlo cambiaría en silencio lo
 * que la persona pidió.
 */
export const materialEnLaEntrada = (
  materiales: readonly ReferenciaDeContinuidad[],
  entrada: Record<string, unknown>,
): Record<string, unknown> => {
  if (materiales.length === 0) return entrada;
  const previo = (clave: string): string[] => {
    const v = entrada[clave];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : [];
  };
  const porClase: Record<string, string[]> = {
    referenceImages: [...previo('referenceImages')],
    referenceVideos: [...previo('referenceVideos')],
    referenceAudios: [...previo('referenceAudios')],
  };
  const donde: Partial<Record<AssetKind, keyof typeof porClase>> = {
    image: 'referenceImages',
    video: 'referenceVideos',
    audio: 'referenceAudios',
  };
  let algo = false;
  for (const m of materiales) {
    const clave = donde[m.materialType];
    /* Un texto o un documento no son material de referencia visual: no hay dónde meterlos, y no se fuerza. */
    if (!clave) continue;
    porClase[clave].push(m.url);
    algo = true;
  }
  if (!algo) return entrada;
  const salida: Record<string, unknown> = { ...entrada };
  for (const [clave, lista] of Object.entries(porClase)) if (lista.length) salida[clave] = lista;
  return salida;
};

/* ── Los recursos que alguien adjuntó ─────────────────────────────────────── */

/**
 * DE UN ADJUNTO A MATERIAL AUTORIZADO. La misma puerta, un camino más corto.
 *
 * Un anclaje de continuidad dice «lo de Luna, versión 4» y hay que resolver el
 * elemento antes de llegar al material. Un adjunto ya SEÑALA el material: la
 * persona subió esa foto y el entendimiento la trajo con su `assetId`. Así que
 * aquí no hay elemento ni versión que resolver —sería inventarse un paso— y se
 * va derecho a la misma entrega de Media Cloud, que es quien comprueba de quién
 * es, en qué estado está y si se puede firmar.
 *
 * ── Una URL suelta NO es autoridad ──────────────────────────────────────────
 *
 * Un adjunto puede llegar sin `assetId` —una foto recién subida que todavía no
 * tiene ficha— y entonces lo único que trae es una dirección. Eso no se manda a
 * ningún proveedor: una URL que eligió quien llama es exactamente lo que esta
 * capa existe para no aceptar. Sale como `no_material` y se queda ahí.
 */
export const materializarRecursos = async (
  accountId: string,
  recursos: readonly { kind: string; assetId?: string; url?: string; name?: string }[] | undefined,
  deps: Pick<DepsDeReferencias, 'entrega'>,
): Promise<ResolucionDeReferencias> => {
  const vacio: ResolucionDeReferencias = Object.freeze({ materiales: [], fallos: [], lecturas: 0 });
  if (typeof accountId !== 'string' || !accountId || !recursos?.length) return vacio;

  const materiales: ReferenciaDeContinuidad[] = [];
  const fallos: FalloDeReferencia[] = [];
  let lecturas = 0;
  const vistos = new Set<string>();

  for (const recurso of recursos.slice(0, MAX_ANCLAJES_DE_CONTINUIDAD)) {
    /*
     * El identificador del adjunto hace de `elementId` en el resultado: quien
     * lo lea sabe de qué recurso salió cada material, y no hay versión que
     * declarar porque un material no tiene versiones — las tiene el elemento.
     */
    const id = recurso.assetId;
    if (!id) { fallos.push({ elementId: recurso.name ?? 'adjunto', requestedVersion: 0, reason: 'no_material' }); continue; }
    if (vistos.has(id)) continue;
    vistos.add(id);

    const entrega = await deps.entrega(id);
    lecturas += 2;
    if (!entrega) { fallos.push({ elementId: id, requestedVersion: 0, reason: 'material_unavailable' }); continue; }

    materiales.push(Object.freeze({
      elementId: id,
      requestedVersion: 0,
      assetId: entrega.assetId,
      role: 'primary' as const,
      materialType: recurso.kind as ReferenciaDeContinuidad['materialType'],
      url: entrega.url,
      expiresAt: entrega.expiraEn,
    }));
  }

  return Object.freeze({ materiales: Object.freeze(materiales), fallos: Object.freeze(fallos), lecturas });
};

/* ── Lo que produjeron los pasos anteriores ───────────────────────────────── */

/**
 * EL MATERIAL DE UN PASO ANTERIOR, RESUELTO. Y hay dos caminos, no uno.
 *
 * Un paso anterior pudo producir una imagen o un texto, y no se leen igual:
 *
 *   imagen, vídeo, audio   viven en el almacén → una llave temporal, firmada
 *                          por la misma puerta de siempre.
 *   texto                  vive en su propia ficha (C13) → se lee el contenido,
 *                          que ya está ahí. Firmar una URL para un texto que
 *                          cabe en un documento habría sido inventarse un
 *                          objeto en el almacén para no leer un campo.
 *
 * Lo que NO cambia es quién autoriza: los dos caminos pasan por una puerta que
 * comprueba de quién es el material antes de dar nada.
 */
export interface MaterialDeUnPasoAnterior {
  stepId: string;
  capability: string;
  materialType: AssetKind;
  assetId: string;
  /** Para un texto: su contenido. Para lo demás, ausente. */
  contenido?: string;
  /** Para lo que vive en el almacén: la llave temporal. Para un texto, ausente. */
  url?: string;
}

export interface DepsDeUpstream {
  /** El contenido de un material de texto, por la puerta que comprueba dueño. */
  texto: (assetId: string) => Promise<string | null>;
  /** La llave temporal de lo que vive en el almacén. La de MC-2, ya atada a quien pide. */
  entrega: (assetId: string) => Promise<Entrega | null>;
}

/**
 * DE LAS REFERENCIAS DE UN PASO ANTERIOR AL MATERIAL QUE OTRO PUEDE USAR.
 *
 * ── Por qué no se salta una referencia rota en silencio ─────────────────────
 *
 * Porque si el paso B depende de A, ejecutar B sin lo que A escribió es generar
 * algo que no es lo que se pidió — y cobrarlo. Una referencia que no se puede
 * resolver sale en `fallos`, y quien decida si esto se ejecuta lo hará con esa
 * lista delante.
 */
export const resolverMaterialDeUpstream = async (
  accountId: string,
  upstream: readonly { stepId: string; capability: string; produces?: string; outputRefs: readonly string[] }[] | undefined,
  deps: DepsDeUpstream,
): Promise<{ materiales: readonly MaterialDeUnPasoAnterior[]; fallos: readonly FalloDeReferencia[]; lecturas: number }> => {
  const vacio = Object.freeze({ materiales: Object.freeze([]), fallos: Object.freeze([]), lecturas: 0 });
  if (typeof accountId !== 'string' || !accountId || !upstream?.length) return vacio;

  const materiales: MaterialDeUnPasoAnterior[] = [];
  const fallos: FalloDeReferencia[] = [];
  let lecturas = 0;

  for (const paso of upstream.slice(0, MAX_ANCLAJES_DE_CONTINUIDAD)) {
    const tipo = (paso.produces === 'text' ? 'text' : paso.produces) as AssetKind | undefined;
    for (const assetId of paso.outputRefs.slice(0, MAX_ANCLAJES_DE_CONTINUIDAD)) {
      if (tipo === 'text') {
        const contenido = await deps.texto(assetId);
        lecturas += 1;
        if (contenido === null) { fallos.push({ elementId: paso.stepId, requestedVersion: 0, reason: 'material_unavailable' }); continue; }
        materiales.push(Object.freeze({ stepId: paso.stepId, capability: paso.capability, materialType: 'text', assetId, contenido }));
        continue;
      }
      const entrega = await deps.entrega(assetId);
      lecturas += 2;
      if (!entrega) { fallos.push({ elementId: paso.stepId, requestedVersion: 0, reason: 'material_unavailable' }); continue; }
      materiales.push(Object.freeze({
        stepId: paso.stepId, capability: paso.capability,
        materialType: (tipo ?? 'image') as AssetKind, assetId, url: entrega.url,
      }));
    }
  }
  return Object.freeze({ materiales: Object.freeze(materiales), fallos: Object.freeze(fallos), lecturas });
};

/**
 * EL MATERIAL DE LOS PASOS ANTERIORES, EN LA ENTRADA.
 *
 * `upstream` es la clave abstracta con la que el motor ya describía esto —el
 * conductor la escribía, aunque nadie la leyera— y se conserva: renombrarla no
 * habría cambiado nada salvo romper lo poco que ya la conocía. Lo que cambia es
 * que ahora llega RESUELTA: con el texto dentro o con la llave puesta, en vez
 * de con una referencia que el adaptador no sabría abrir.
 *
 * Y NO pisa lo que ya venía: lo que aportó la persona sigue donde estaba.
 */
export const upstreamEnLaEntrada = (
  materiales: readonly MaterialDeUnPasoAnterior[],
  entrada: Record<string, unknown>,
): Record<string, unknown> => {
  if (materiales.length === 0) return entrada;
  return { ...entrada, upstream: Object.freeze(materiales.map((m) => Object.freeze({ ...m }))) };
};
