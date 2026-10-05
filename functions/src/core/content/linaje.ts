import { CONTENT_CORE_CONTRACT_VERSION } from '../contracts';
import type { EntityAttribution } from '../identity';
import { derechosValidos, esStorageRef, materialValido } from './asset';
import type { Asset, AssetKind, AssetStatus, AssetVariant, DerechosDelMaterial, Provenance, StorageRef } from './asset';

/**
 * WEË CONTENT CORE — EL LINAJE DEL MATERIAL: VERSIONES, DERIVADOS, DERECHOS Y USOS.
 *
 * ── Lo que ya había, y lo que faltaba ───────────────────────────────────────
 *
 * El material ya sabía DECIR tres cosas: de qué material salió
 * (`provenance.sourceAssetIds`), cuál fue su versión anterior
 * (`previousVersionId`) y qué licencia ajena lo acompaña (`derechos`, con
 * `jurisdiccionesBloqueadas`). Lo que no existía era la regla que las RELLENA
 * bien y las LEE igual en todas partes. Sin ella, cada experiencia que edite,
 * convierta o reutilice un material —Weë Studio con un mundo, Weë Design con un
 * objeto, Filmmaker con un plano— escribiría su propio linaje, y el primero que
 * se olvidara de copiar los derechos dejaría un resultado libre de una licencia
 * que no lo es.
 *
 * Esto es esa regla, escrita una vez, sobre los tipos que ya existen. No añade
 * un campo a `Asset`, no crea una colección y no guarda nada: son funciones
 * puras sobre materiales ya leídos. Sirve a cualquier material —una imagen de
 * Weë Design se versiona igual que un mundo de Weë Studio—; el 3D es el primer
 * cliente, no el único.
 *
 * ── Las cuatro reglas que se aplican aquí ───────────────────────────────────
 *
 *   1 · UNA VERSIÓN ES OTRO MATERIAL. Con sus propios bytes, su id y su ficha;
 *       apunta a la anterior por `previousVersionId` y la lleva en su
 *       procedencia. La anterior no se toca nunca.
 *   2 · REUTILIZAR ES REFERENCIAR. El mismo material en tres proyectos son tres
 *       referencias a un id, no tres archivos. Solo editar el contenido crea un
 *       material nuevo; colocarlo, moverlo o publicarlo, no.
 *   3 · LOS DERECHOS SOLO SE ENDURECEN. Lo que sale de un material hereda sus
 *       restricciones, sumadas a las de la operación que lo hizo. A lo largo de
 *       una línea nada puede volverse más libre que aquello de lo que salió.
 *   4 · DOS MATERIALES VIVOS NUNCA COMPARTEN UN OBJETO. Retirar un material
 *       borra sus objetos por su clave; si otro apuntara al mismo, se quedaría
 *       sin bytes.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No decide dónde se puede enseñar un material: eso es evaluar jurisdicciones,
 * y vive con la elegibilidad de los modelos. No guarda, no lee y no borra. No
 * copia bytes. Y no sabe de proveedores: los derechos llegan ya escritos en el
 * material o en la operación, desde el gobierno de cada modelo.
 */

/* ── 1 · Los derechos: solo se endurecen ───────────────────────────────────── */

type Revision = DerechosDelMaterial['revision'];
type UsoComercial = DerechosDelMaterial['usoComercial'];
type Atribucion = DerechosDelMaterial['atribucion'];

/** Cuánto restringe una revisión. El mismo orden que usa la elegibilidad de los modelos. */
export const RIGOR_DE_REVISION: Readonly<Record<Revision, number>> = Object.freeze({
  APPROVED: 0,
  REVIEW_REQUIRED: 1,
  BLOCKED_GLOBAL: 2,
});

/**
 * Cuánto restringe un uso comercial. `UNCLEAR` pesa MÁS que `RESTRICTED` a
 * propósito: una restricción conocida se puede cumplir; lo que no se sabe no
 * autoriza nada, y al juntar los dos lo que queda es «no se sabe».
 */
export const RIGOR_DE_USO_COMERCIAL: Readonly<Record<UsoComercial, number>> = Object.freeze({
  ALLOWED: 0,
  RESTRICTED: 1,
  UNCLEAR: 2,
  NOT_ALLOWED: 3,
});

/** Exigir atribución restringe más que no saberlo, y no saberlo más que no exigirla. */
export const rigorDeAtribucion = (a: Atribucion): number => (a === true ? 2 : a === 'UNKNOWN' ? 1 : 0);

const porTexto = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const claveDeLicencia = (l: { nombre: string; url: string }): string => `${l.url}\n${l.nombre}`;
const elMasEstricto = <T extends string>(tabla: Readonly<Record<T, number>>, a: T, b: T): T => (tabla[b] > tabla[a] ? b : a);

/**
 * LO QUE ESTE LINAJE SABE JUNTAR, dimensión a dimensión, y de cada licencia.
 *
 * Si el contrato de derechos gana una dimensión —una obligación de etiquetar lo
 * generado, de entregar copia de una licencia—, juntar unos derechos que la
 * traen y copiar solo lo conocido la TIRARÍA: lo que saliera de ese material
 * nacería sin ella, más libre que su fuente. Así que lo desconocido no se
 * junta: se para (`derechos_desconocidos`) hasta que alguien enseñe aquí cómo
 * se endurece.
 */
const DIMENSIONES_CONOCIDAS: readonly string[] = Object.freeze(['revision', 'usoComercial', 'atribucion', 'licencias', 'jurisdiccionesBloqueadas']);
const CAMPOS_DE_LICENCIA: readonly string[] = Object.freeze(['nombre', 'url']);
const todoConocido = (d: DerechosDelMaterial): boolean =>
  Object.keys(d).every((k) => DIMENSIONES_CONOCIDAS.includes(k))
  && d.licencias.every((l) => Object.keys(l).every((k) => CAMPOS_DE_LICENCIA.includes(k)));

/**
 * Por qué unos derechos no se pueden juntar. Un literal, nunca una frase.
 *
 *   derechos_invalidos     alguno no se entiende. No se trata como ausente:
 *                          tirarlo sería soltar una licencia en silencio.
 *   derechos_desconocidos  alguno trae una dimensión que este linaje todavía
 *                          no sabe juntar. Copiar solo lo conocido la perdería.
 *   no_representables      juntos no caben en el contrato (más licencias o más
 *                          jurisdicciones de las que admite). Recortar sería
 *                          perder obligaciones; no se recorta.
 */
export type MotivoDeDerechosNoCombinables = 'derechos_invalidos' | 'derechos_desconocidos' | 'no_representables';

export type DerechosCombinados =
  | { ok: true; derechos?: DerechosDelMaterial }
  | { ok: false; motivo: MotivoDeDerechosNoCombinables };

/**
 * LOS DERECHOS DE LO QUE SALE DE VARIOS MATERIALES.
 *
 * Cada dimensión se queda con lo más estricto: la revisión y el uso comercial
 * más restrictivos, la atribución si alguno la exige, TODAS las licencias y
 * TODAS las jurisdicciones bloqueadas. Un material sin derechos no aporta nada
 * —es uno sin licencia ajena declarada—, así que si ninguno los tiene, el
 * resultado tampoco.
 *
 * El resultado es canónico: licencias y jurisdicciones van ordenadas, así que
 * juntar A con B da lo mismo que juntar B con A, y el mismo trabajo repetido
 * escribe la misma ficha.
 */
export const combinarDerechos = (lista: readonly (DerechosDelMaterial | undefined)[]): DerechosCombinados => {
  const presentes = (Array.isArray(lista) ? lista : []).filter((d) => d !== undefined) as DerechosDelMaterial[];
  if (presentes.some((d) => !derechosValidos(d))) return { ok: false, motivo: 'derechos_invalidos' };
  if (!presentes.every(todoConocido)) return { ok: false, motivo: 'derechos_desconocidos' };
  if (presentes.length === 0) return { ok: true };
  let revision = presentes[0].revision;
  let usoComercial = presentes[0].usoComercial;
  let atribucion = presentes[0].atribucion;
  const licencias = new Map<string, { nombre: string; url: string }>();
  const territorios = new Set<string>();
  for (const d of presentes) {
    revision = elMasEstricto(RIGOR_DE_REVISION, revision, d.revision);
    usoComercial = elMasEstricto(RIGOR_DE_USO_COMERCIAL, usoComercial, d.usoComercial);
    if (rigorDeAtribucion(d.atribucion) > rigorDeAtribucion(atribucion)) atribucion = d.atribucion;
    for (const l of d.licencias) licencias.set(claveDeLicencia(l), { nombre: l.nombre, url: l.url });
    for (const j of d.jurisdiccionesBloqueadas ?? []) territorios.add(j);
  }
  const combinados: DerechosDelMaterial = {
    revision,
    usoComercial,
    atribucion,
    licencias: [...licencias.entries()].sort(([a], [b]) => porTexto(a, b)).map(([, l]) => l),
    ...(territorios.size > 0 ? { jurisdiccionesBloqueadas: [...territorios].sort(porTexto) } : {}),
  };
  return derechosValidos(combinados) ? { ok: true, derechos: combinados } : { ok: false, motivo: 'no_representables' };
};

/**
 * ¿Son `estos` al menos tan estrictos como `base`, en todas las dimensiones?
 * Unos derechos que no se entienden, o que traen algo que aquí no se sabe
 * comparar, nunca lo son: no se puede afirmar lo que no se sabe medir.
 */
export const almenosTanEstrictos = (estos: DerechosDelMaterial | undefined, base: DerechosDelMaterial | undefined): boolean => {
  if (base === undefined) return estos === undefined || (derechosValidos(estos) && todoConocido(estos));
  if (estos === undefined || !derechosValidos(estos) || !derechosValidos(base)) return false;
  if (!todoConocido(estos) || !todoConocido(base)) return false;
  const licencias = new Set(estos.licencias.map(claveDeLicencia));
  const territorios = new Set(estos.jurisdiccionesBloqueadas ?? []);
  return RIGOR_DE_REVISION[estos.revision] >= RIGOR_DE_REVISION[base.revision]
    && RIGOR_DE_USO_COMERCIAL[estos.usoComercial] >= RIGOR_DE_USO_COMERCIAL[base.usoComercial]
    && rigorDeAtribucion(estos.atribucion) >= rigorDeAtribucion(base.atribucion)
    && base.licencias.every((l) => licencias.has(claveDeLicencia(l)))
    && (base.jurisdiccionesBloqueadas ?? []).every((j) => territorios.has(j));
};

/** LA INVARIANTE DE UNA LÍNEA: lo que salió de unas fuentes no es más libre que ellas juntas. */
export const derechosNoSeRelajan = (
  hijo: DerechosDelMaterial | undefined,
  fuentes: readonly (DerechosDelMaterial | undefined)[],
): boolean => {
  const base = combinarDerechos(fuentes);
  return base.ok && almenosTanEstrictos(hijo, base.derechos);
};

export type DerechosDelConjunto =
  | DerechosCombinados
  | { ok: false; motivo: 'material_desconocido'; desconocidos: readonly string[] };

/**
 * LOS DERECHOS DE UN CONJUNTO DE MATERIALES: los de una escena, una
 * producción o un proyecto, a partir de los ids que ya sabe dar cada uno
 * (`materialesDeLaEscena3D`, las referencias de una producción…).
 *
 * Si falta la ficha de alguno, no se contesta: no se puede afirmar que una
 * escena no tiene restricciones sin haber leído todo lo que usa. Un material
 * retirado sí cuenta —su ficha y sus derechos se quedan—, porque lo que ya salió
 * de él sigue obligado.
 */
export const derechosDeLosMateriales = (assetIds: readonly string[], materiales: readonly Asset[]): DerechosDelConjunto => {
  const porId = new Map<string, Asset>();
  for (const m of Array.isArray(materiales) ? materiales : []) if (m && typeof m.assetId === 'string') porId.set(m.assetId, m);
  const ids = [...new Set(Array.isArray(assetIds) ? assetIds : [])].sort(porTexto);
  const desconocidos = ids.filter((id) => !porId.has(id));
  if (desconocidos.length > 0) return { ok: false, motivo: 'material_desconocido', desconocidos };
  return combinarDerechos(ids.map((id) => porId.get(id)?.derechos));
};

/* ── 2 · Un material nuevo a partir de otros: una versión o un derivado ───── */

/**
 * LO QUE TRAE QUIEN CREA EL MATERIAL NUEVO. Todo lo que es suyo: sus bytes, su
 * id, la operación que lo hizo y los derechos de esa operación.
 *
 * Lo que NO trae, porque lo pone esto: el tipo de una versión (el de la
 * anterior), las fuentes de la procedencia, la versión anterior y los derechos
 * heredados. Ahí es exactamente donde cada experiencia se equivocaría distinto.
 */
export interface DatosDeDescendiente extends Pick<EntityAttribution, 'createdByEntityId' | 'createdByEntityType'> {
  /** La cuenta, sacada de la sesión. Todas las fuentes tienen que ser suyas. */
  ownerAccountId: string;
  /** Calculado por quien llama, para que el mismo trabajo pida siempre el mismo material. */
  assetId: string;
  /** Casi siempre `processing` o `ready`. Un material no nace retirado. */
  status: Exclude<AssetStatus, 'deleted'>;
  ahora: number;
  /** SUS bytes. Nunca los de una fuente: ver la regla 4. */
  storageRef?: StorageRef;
  content?: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  /** Sus derivados (la vista previa del mundo nuevo, su miniatura). Los de la fuente no se heredan. */
  variants?: readonly AssetVariant[];
  name?: string;
  tags?: readonly string[];
  metadata?: Asset['metadata'];
  /** La operación que lo produjo, cuando la hubo. Las fuentes y la fecha las pone esto. */
  operacion?: Omit<Provenance, 'createdAt' | 'sourceAssetIds'>;
  /** Los derechos de esa operación: el gobierno del modelo que editó, convirtió o renderizó. */
  derechosDeLaOperacion?: DerechosDelMaterial;
}

/**
 * Por qué no se puede crear. Un literal, nunca una frase. `fuente_ajena`, ante
 * una persona, se contesta igual que «no existe» (como `puedeReferenciar`): la
 * diferencia entre las dos es justo lo que no se le dice a nadie.
 */
export type MotivoDeDescendienteRechazado =
  | 'sin_fuentes'
  | 'fuente_invalida'
  | 'fuente_ajena'
  | 'fuente_no_lista'
  | 'id_ocupado'
  | 'objeto_compartido'
  | MotivoDeDerechosNoCombinables
  | 'material_invalido';

export type DescendienteConstruido =
  | { ok: true; asset: Asset }
  | { ok: false; motivo: MotivoDeDescendienteRechazado };

/**
 * ¿Es el mismo OBJETO? Por proveedor, contenedor y clave, sin mirar la versión
 * del objeto: retirar un material borra por clave, así que dos fichas con la
 * misma clave comparten bytes aunque apunten a versiones distintas de él.
 */
const mismoObjeto = (a: StorageRef, b: StorageRef): boolean =>
  a.provider === b.provider && (a.bucket ?? '') === (b.bucket ?? '') && a.objectKey === b.objectKey;

const claveDeObjeto = (r: StorageRef): string => `${r.provider}\n${r.bucket ?? ''}\n${r.objectKey}`;

/** Los objetos de un material: el suyo y los de sus derivados. Lo que `retirar` borraría. */
const objetosDe = (a: Pick<Asset, 'storageRef' | 'variants'>): StorageRef[] =>
  [a.storageRef, ...(Array.isArray(a.variants) ? a.variants.map((v) => v?.storageRef) : [])].filter(esStorageRef);

/* Una ficha sin claves vacías, como la escriben los almacenes. El tipo no cambia. */
const sinIndefinidos = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

const construir = (
  kind: AssetKind,
  fuentes: readonly Asset[],
  datos: DatosDeDescendiente,
  anterior?: Asset,
): DescendienteConstruido => {
  if (!Array.isArray(fuentes) || fuentes.length === 0) return { ok: false, motivo: 'sin_fuentes' };
  if (!fuentes.every((f) => materialValido(f))) return { ok: false, motivo: 'fuente_invalida' };
  if (!datos || !fuentes.every((f) => f.ownerAccountId === datos.ownerAccountId)) return { ok: false, motivo: 'fuente_ajena' };
  /* Solo se parte de lo que está listo: ni de lo que sube, ni de lo que falló, ni de lo retirado. */
  if (!fuentes.every((f) => f.status === 'ready')) return { ok: false, motivo: 'fuente_no_lista' };
  if (fuentes.some((f) => f.assetId === datos.assetId)) return { ok: false, motivo: 'id_ocupado' };
  const deLasFuentes = fuentes.flatMap(objetosDe);
  const propios = objetosDe({ storageRef: datos.storageRef, variants: datos.variants });
  if (propios.some((p) => deLasFuentes.some((f) => mismoObjeto(p, f)))) return { ok: false, motivo: 'objeto_compartido' };

  const derechos = combinarDerechos([...fuentes.map((f) => f.derechos), datos.derechosDeLaOperacion]);
  if (!derechos.ok) return { ok: false, motivo: derechos.motivo };

  /* La operación primero; las fuentes y la fecha, después: nadie las pisa desde fuera. */
  const provenance: Provenance = {
    ...sinIndefinidos({ ...(datos.operacion ?? {}) }),
    sourceAssetIds: [...new Set(fuentes.map((f) => f.assetId))],
    createdAt: datos.ahora,
  };
  const asset = sinIndefinidos<Asset>({
    contract: CONTENT_CORE_CONTRACT_VERSION,
    assetId: datos.assetId,
    ownerAccountId: datos.ownerAccountId,
    createdByEntityId: datos.createdByEntityId,
    createdByEntityType: datos.createdByEntityType,
    kind,
    status: datos.status,
    storageRef: datos.storageRef,
    content: datos.content,
    mimeType: datos.mimeType,
    bytes: datos.bytes,
    width: datos.width,
    height: datos.height,
    durationSec: datos.durationSec,
    variants: datos.variants && datos.variants.length > 0 ? [...datos.variants] : undefined,
    provenance,
    previousVersionId: anterior?.assetId,
    name: datos.name ?? anterior?.name,
    tags: datos.tags ?? anterior?.tags,
    metadata: datos.metadata,
    derechos: derechos.derechos,
    createdAt: datos.ahora,
    updatedAt: datos.ahora,
  });
  return materialValido(asset) ? { ok: true, asset } : { ok: false, motivo: 'material_invalido' };
};

/**
 * UNA VERSIÓN NUEVA: «mejora esto», «cámbiale la luz», «otra versión».
 *
 * Es otro material de la MISMA clase, con sus propios bytes, que apunta a la
 * anterior (`previousVersionId`) y la lleva la primera en su procedencia. Hereda
 * el nombre y las etiquetas —es la misma cosa, mejorada— y los derechos, más los
 * de la operación que la hizo. La anterior no cambia: quien la usaba la sigue
 * usando hasta que decida pasarse a la nueva.
 *
 * `otrasFuentes`: lo que además se usó para hacerla (una foto de referencia).
 * Entra en la procedencia y aporta sus derechos.
 */
export const nuevaVersion = (anterior: Asset, datos: DatosDeDescendiente, otrasFuentes: readonly Asset[] = []): DescendienteConstruido =>
  anterior ? construir(anterior.kind, [anterior, ...otrasFuentes], datos, anterior) : { ok: false, motivo: 'sin_fuentes' };

/**
 * UN MATERIAL DERIVADO: algo NUEVO hecho a partir de otros, que no es una
 * versión de ninguno. El vídeo que recorre un mundo, el objeto que se saca de
 * él, el plano de Filmmaker que lo usa de escenario. Puede ser de otra clase.
 * Lleva a todas sus fuentes en la procedencia y hereda los derechos de todas.
 */
export const materialDerivado = (kind: AssetKind, fuentes: readonly Asset[], datos: DatosDeDescendiente): DescendienteConstruido =>
  construir(kind, fuentes, datos);

/* ── 3 · La línea de versiones ─────────────────────────────────────────────── */

/** Una versión dentro de su línea. El número se DERIVA del orden: no se guarda en ningún sitio. */
export interface VersionEnLinea {
  assetId: string;
  /** Desde 1, por fecha de creación. */
  numero: number;
  status: AssetStatus;
  createdAt: number;
  previousVersionId?: string;
}

/**
 * TODAS LAS VERSIONES DE UNA MISMA COSA.
 *
 *   raizId       la primera: la que no tiene versión anterior.
 *   vigenteId    la más nueva que está lista. Es la que se propone al usar la
 *                cosa por primera vez; quien ya usa otra NO se mueve solo.
 *   ultimaId     la más nueva que no se retiró, esté como esté (preparando,
 *                fallida): la que una persona espera ver arriba del todo.
 *   incompleta   falta alguna anterior entre lo leído, o la cadena se cierra
 *                sobre sí misma. La línea sirve para enseñar; no para decidir.
 */
export interface LineaDeVersiones {
  raizId: string;
  versiones: readonly VersionEnLinea[];
  vigenteId?: string;
  ultimaId?: string;
  incompleta: boolean;
}

const momento = (a: Asset): number => (Number.isFinite(a.createdAt) ? a.createdAt : Number.MAX_SAFE_INTEGER);

/**
 * LA LÍNEA DE UN MATERIAL, desde cualquiera de sus versiones, sobre materiales
 * ya leídos. Solo cuentan los de la misma cuenta: una ficha ajena que dijera
 * «vengo de tu mundo» no entra en tu línea.
 *
 * Una cosa puede tener ramas —se editó dos veces la misma versión—: todas son
 * de la línea y se numeran por fecha. Nada se pierde y nada se pisa.
 */
export const lineaDeVersiones = (assetId: string, materiales: readonly Asset[]): LineaDeVersiones | undefined => {
  const lista = Array.isArray(materiales) ? materiales : [];
  const inicio = lista.find((m) => !!m && m.assetId === assetId);
  if (!inicio) return undefined;
  const porId = new Map<string, Asset>();
  for (const m of lista) if (m && m.ownerAccountId === inicio.ownerAccountId && typeof m.assetId === 'string') porId.set(m.assetId, m);

  let incompleta = false;
  const vistos = new Set<string>([inicio.assetId]);
  let raiz = inicio;
  while (raiz.previousVersionId !== undefined) {
    const anterior = porId.get(raiz.previousVersionId);
    if (!anterior || vistos.has(anterior.assetId)) { incompleta = true; break; }
    vistos.add(anterior.assetId);
    raiz = anterior;
  }

  const hijos = new Map<string, string[]>();
  for (const m of porId.values()) {
    if (m.previousVersionId === undefined) continue;
    hijos.set(m.previousVersionId, [...(hijos.get(m.previousVersionId) ?? []), m.assetId]);
  }
  const enLinea = new Set<string>([raiz.assetId, inicio.assetId]);
  const cola = [...enLinea];
  for (let i = 0; i < cola.length; i++) {
    for (const h of hijos.get(cola[i]) ?? []) {
      if (!enLinea.has(h)) { enLinea.add(h); cola.push(h); }
    }
  }

  const versiones = [...enLinea]
    .map((id) => porId.get(id) as Asset)
    .sort((a, b) => momento(a) - momento(b) || porTexto(a.assetId, b.assetId))
    .map((m, i): VersionEnLinea => ({
      assetId: m.assetId,
      numero: i + 1,
      status: m.status,
      createdAt: m.createdAt,
      ...(m.previousVersionId !== undefined ? { previousVersionId: m.previousVersionId } : {}),
    }));
  const deMasNuevaAMasVieja = [...versiones].reverse();
  const vigente = deMasNuevaAMasVieja.find((v) => v.status === 'ready');
  const ultima = deMasNuevaAMasVieja.find((v) => v.status !== 'deleted');
  return {
    raizId: raiz.assetId,
    versiones,
    ...(vigente ? { vigenteId: vigente.assetId } : {}),
    ...(ultima ? { ultimaId: ultima.assetId } : {}),
    incompleta,
  };
};

/** La versión que una persona llama «la 2». */
export const versionNumero = (linea: LineaDeVersiones | undefined, numero: number): VersionEnLinea | undefined =>
  linea?.versiones.find((v) => v.numero === numero);

/**
 * ¿HAY UNA VERSIÓN MÁS NUEVA QUE LA QUE SE USA AQUÍ? La vigente, si es posterior.
 *
 * Es un AVISO, no un cambio: quien usa la versión 1 en su escena o en su plano
 * sigue con la 1 hasta que diga «actualizar». Un automatismo que cambiara el
 * material de un plano ya pagado es justo lo que Filmmaker decidió no hacer.
 */
export const versionMasNueva = (linea: LineaDeVersiones | undefined, assetIdEnUso: string): string | undefined => {
  if (!linea?.vigenteId || linea.vigenteId === assetIdEnUso) return undefined;
  const enUso = linea.versiones.find((v) => v.assetId === assetIdEnUso);
  const vigente = linea.versiones.find((v) => v.assetId === linea.vigenteId);
  return enUso && vigente && vigente.numero > enUso.numero ? vigente.assetId : undefined;
};

/**
 * LO QUE SALIÓ DE ESTOS MATERIALES Y NO ES UNA VERSIÓN SUYA: el objeto que se
 * sacó de un mundo, el vídeo que lo recorre. Con los ids de una línea entera,
 * es «lo que se hizo a partir de esta cosa», en cualquiera de sus versiones.
 */
export const derivadosDe = (assetIds: readonly string[], materiales: readonly Asset[]): readonly string[] => {
  const origen = new Set<string>(Array.isArray(assetIds) ? assetIds : []);
  const lista = (Array.isArray(materiales) ? materiales : []).filter((m) => !!m && typeof m.assetId === 'string');
  const cuentas = new Set(lista.filter((m) => origen.has(m.assetId)).map((m) => m.ownerAccountId));
  const salioDelOrigen = (m: Asset): boolean => {
    const fuentes: readonly string[] = m.provenance?.sourceAssetIds ?? [];
    return fuentes.some((id) => origen.has(id));
  };
  const ids = lista
    .filter((m) => cuentas.has(m.ownerAccountId) && !origen.has(m.assetId))
    .filter((m) => m.previousVersionId === undefined || !origen.has(m.previousVersionId))
    .filter(salioDelOrigen)
    .map((m) => m.assetId);
  return [...new Set(ids)].sort(porTexto);
};

/* ── 4 · Dónde se usa: reutilizar es referenciar ───────────────────────────── */

/**
 * QUIÉN PUEDE USAR UN MATERIAL. Cada uno ya sabe decir qué materiales usa, con
 * su propia función, y aquí no se repite ninguna:
 *
 *   proyecto     `ProjectItem` (kind `asset`): una fila por material
 *   escena3d     `materialesDeLaEscena3D(escena)`, con su `projectId`
 *   elemento     `Element.refs[].assetId`
 *   plano        `ShotNode.producedAssetId`, con su `projectId`
 *   produccion   `ProductionReference.assetId` de una producción de Filmmaker
 *   contenido    `Content.assetRefs[].assetId` mientras el contenido viva
 */
export type ConsumidorDeMaterial = 'proyecto' | 'escena3d' | 'elemento' | 'plano' | 'produccion' | 'contenido';

export const CONSUMIDORES_DE_MATERIAL: readonly ConsumidorDeMaterial[] = Object.freeze([
  'proyecto', 'escena3d', 'elemento', 'plano', 'produccion', 'contenido',
] as const);

/** Lo que un consumidor usa, por id. Se calcula al leerlo; no se guarda en ningún sitio. */
export interface ReferenciaDeConsumidor {
  consumidor: ConsumidorDeMaterial;
  consumidorId: string;
  assetIds: readonly string[];
  /** El proyecto —o la producción— en el que vive, si vive en uno. */
  projectId?: string;
}

export interface UsoDeMaterial {
  consumidor: ConsumidorDeMaterial;
  consumidorId: string;
  projectId?: string;
}

/**
 * DÓNDE SE USA ESTE MATERIAL. Es la pregunta que hay que hacer antes de
 * retirarlo —retirar un mundo que usan tres proyectos los deja a los tres sin
 * escenario— y la que dice que reutilizar no copió nada: los tres usos apuntan
 * al mismo id.
 */
export const usosDelMaterial = (assetId: string, referencias: readonly ReferenciaDeConsumidor[]): readonly UsoDeMaterial[] => {
  const usos = new Map<string, UsoDeMaterial>();
  for (const r of Array.isArray(referencias) ? referencias : []) {
    if (!r || !(CONSUMIDORES_DE_MATERIAL as readonly string[]).includes(r.consumidor)) continue;
    if (typeof r.consumidorId !== 'string' || !r.consumidorId) continue;
    if (!Array.isArray(r.assetIds) || !r.assetIds.includes(assetId)) continue;
    const clave = `${r.consumidor}\n${r.consumidorId}`;
    if (!usos.has(clave)) {
      usos.set(clave, { consumidor: r.consumidor, consumidorId: r.consumidorId, ...(r.projectId ? { projectId: r.projectId } : {}) });
    }
  }
  return [...usos.values()].sort((a, b) => porTexto(a.consumidor, b.consumidor) || porTexto(a.consumidorId, b.consumidorId));
};

/** Los proyectos que usan este material, sin repetir. Uno, tres o ninguno: el material sigue siendo uno. */
export const proyectosQueUsan = (assetId: string, referencias: readonly ReferenciaDeConsumidor[]): readonly string[] =>
  [...new Set(usosDelMaterial(assetId, referencias).flatMap((u) => (u.projectId ? [u.projectId] : [])))].sort(porTexto);

/** Quién usa cada versión de una línea: qué proyectos siguen en la 1 cuando ya hay una 2. */
export const usosPorVersion = (
  linea: LineaDeVersiones,
  referencias: readonly ReferenciaDeConsumidor[],
): Readonly<Record<string, readonly UsoDeMaterial[]>> =>
  Object.fromEntries(linea.versiones.map((v) => [v.assetId, usosDelMaterial(v.assetId, referencias)]));

/* ── 5 · Cuándo hace falta un material nuevo, y cuándo no ──────────────────── */

/**
 * LO QUE SE LE PUEDE HACER A UN MATERIAL desde cualquier experiencia.
 *
 *   anadir_a_proyecto          una fila `ProjectItem`
 *   insertar_en_escena         el entorno o un nodo de una `Escena3D`
 *   colocar_en_escena          moverlo, girarlo, escalarlo: la transformación es del nodo
 *   anadir_a_elemento          una referencia de un Element
 *   referenciar_en_produccion  una referencia de una producción de Filmmaker
 *   publicar                   un contenido que lo referencia, y su publicación
 *   volver_a_una_version       apuntar de nuevo a una versión anterior
 *   renombrar                  su nombre o sus etiquetas
 *   convertir_formato          la misma cosa en otra codificación o calidad
 *   editar                     cambiar lo que ES: otra luz, otra forma, otra textura
 *   derivar                    hacer algo nuevo con él: un vídeo, un objeto extraído
 *   llevar_a_otra_cuenta       usarlo desde una cuenta que no es la suya
 */
export type OperacionSobreMaterial =
  | 'anadir_a_proyecto'
  | 'insertar_en_escena'
  | 'colocar_en_escena'
  | 'anadir_a_elemento'
  | 'referenciar_en_produccion'
  | 'publicar'
  | 'volver_a_una_version'
  | 'renombrar'
  | 'convertir_formato'
  | 'editar'
  | 'derivar'
  | 'llevar_a_otra_cuenta';

/**
 * QUÉ LE PASA AL MATERIAL.
 *
 *   referencia          nada: alguien más lo apunta por su id
 *   misma_ficha         cambia su ficha, no sus bytes
 *   variante            un derivado del mismo material (`variants`), que vive y muere con él
 *   nueva_version       otro material de la misma clase (`nuevaVersion`)
 *   material_derivado   otro material, quizá de otra clase (`materialDerivado`)
 *   no_admitido         el material es de su cuenta y de ninguna otra
 */
export type ConsecuenciaParaElMaterial =
  | 'referencia'
  | 'misma_ficha'
  | 'variante'
  | 'nueva_version'
  | 'material_derivado'
  | 'no_admitido';

/**
 * LA TABLA. Solo tres operaciones crean un material, y las tres cambian lo que
 * hay dentro de los bytes. Todo lo demás —ponerlo en un proyecto, en una escena,
 * en una producción, moverlo, publicarlo, volver a una versión anterior— es una
 * referencia, y una referencia no copia nada.
 *
 * Llevarlo a otra cuenta no se admite: el material es de la cuenta, y una copia
 * para otra arrastraría licencias ajenas a quien no las aceptó. Si algún día se
 * quiere, es una decisión de producto y legal, no una línea de esta tabla.
 */
export const CONSECUENCIA_DE_OPERACION: Readonly<Record<OperacionSobreMaterial, ConsecuenciaParaElMaterial>> = Object.freeze({
  anadir_a_proyecto: 'referencia',
  insertar_en_escena: 'referencia',
  colocar_en_escena: 'referencia',
  anadir_a_elemento: 'referencia',
  referenciar_en_produccion: 'referencia',
  publicar: 'referencia',
  volver_a_una_version: 'referencia',
  renombrar: 'misma_ficha',
  convertir_formato: 'variante',
  editar: 'nueva_version',
  derivar: 'material_derivado',
  llevar_a_otra_cuenta: 'no_admitido',
});

/**
 * LA REGLA 4, COMPROBADA SOBRE UNA CUENTA: grupos de materiales VIVOS que
 * comparten un objeto (el suyo o el de un derivado). Tiene que salir vacío.
 *
 * Que un material apunte a su propio objeto dos veces —una vista previa que es
 * el mismo archivo— no cuenta: no hay nadie más a quien dejar sin bytes.
 */
export const materialesQueCompartenObjeto = (materiales: readonly Asset[]): readonly (readonly string[])[] => {
  const porObjeto = new Map<string, Set<string>>();
  for (const m of Array.isArray(materiales) ? materiales : []) {
    if (!m || m.status === 'deleted' || typeof m.assetId !== 'string') continue;
    for (const r of objetosDe(m)) {
      const clave = claveDeObjeto(r);
      porObjeto.set(clave, new Set([...(porObjeto.get(clave) ?? []), m.assetId]));
    }
  }
  const grupos = new Map<string, string[]>();
  for (const ids of porObjeto.values()) {
    if (ids.size < 2) continue;
    const grupo = [...ids].sort(porTexto);
    grupos.set(grupo.join('\n'), grupo);
  }
  return [...grupos.values()].sort((a, b) => porTexto(a.join('\n'), b.join('\n')));
};
