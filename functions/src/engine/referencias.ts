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
