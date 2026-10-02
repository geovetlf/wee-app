import {
  CONTINUITY_CONTRACT_VERSION,
} from './contracts';
import {
  ASPECTOS_DE_CONTINUIDAD,
  ContinuityAspect,
  ContinuityRequirements,
  ContinuityVerdict,
  SpatialConstraint,
  VeredictoDeAspecto,
  continuidadValida,
  exigenciaDe,
  resumirVeredicto,
} from './continuity';
import { ShotNode, SceneNode, planoValido, puedePasarDePlano } from './shot';

/**
 * WEË CONTINUITY — LA COMPROBACIÓN QUE SE PUEDE HACER SIN MIRAR NADA.
 *
 * ── La frase que separa esta fase de la siguiente ───────────────────────────
 *
 * Esto NO dice «esta imagen conserva el rostro».
 *
 * Dice: «el requisito de conservar el rostro tiene una referencia estructural
 * válida y el estado guardado es coherente».
 *
 * Son dos afirmaciones distintas y conviene no confundirlas nunca, porque la
 * primera cuesta una llamada a un modelo y la segunda es aritmética. Un `pass`
 * de aquí significa «esto se puede intentar y lo guardado cuadra», y no
 * significa, ni de lejos, que el resultado se parezca a nada.
 *
 *     ESTRUCTURAL PASS  ≠  VISUAL PASS
 *
 * ── Qué puede afirmar ───────────────────────────────────────────────────────
 *
 * Que lo que se exige conservar tiene a qué agarrarse. Que lo apuntado existe,
 * es de la cuenta y está en un estado usable. Que la versión anclada ocurrió.
 * Que una relación espacial nombra a dos cosas que están ahí. Que un cambio de
 * estado es legal y que la versión avanza.
 *
 * ── Qué NO puede afirmar, y lo dice ─────────────────────────────────────────
 *
 * Nada sobre el estilo, la cámara, la luz, la pose, la acción ni la narrativa.
 * Para esas no hay ninguna referencia estructural que mirar: una cámara no se
 * ancla a un Element. Así que salen `unknown`, con su motivo, y `unknown` NO es
 * `pass` — que es la regla que sostiene todo esto desde C1.
 *
 * ── Y una limitación deliberada ─────────────────────────────────────────────
 *
 * No se comprueba que el Element anclado sea del TIPO que el aspecto sugiere.
 * `identity.face` con un Element de tipo `place` anclado sale `pass` aquí.
 * Emparejar familia de aspecto con tipo de elemento sería interpretar qué quiso
 * decir quien lo escribió, y eso es de Brain, no de una comprobación
 * determinista. Queda anotado como lo que es: un hueco conocido.
 *
 * ── Lo que este archivo no hace ─────────────────────────────────────────────
 *
 * No lee. No consulta. No llama a nadie. No crea trabajos. No regenera. No
 * cobra. Recibe un contexto YA RESUELTO y contesta. Quien resuelva es otro, y
 * separarlo no es ceremonia: es lo que permite probar esto con una tabla de
 * casos en vez de con una base de datos.
 */

/* ── Lo que hay que traerle ya resuelto ───────────────────────────────────── */

/** Una cosa de la cuenta, ya leída. La forma mínima para poder comprobarla. */
export interface ElementoResuelto {
  elementId: string;
  ownerAccountId: string;
  /** La versión VIGENTE. Anclar una anterior vale; anclar una posterior, no. */
  version: number;
  status: string;
}

/** Un material, ya leído. Ni bytes, ni procedencia: solo lo que decide si sirve. */
export interface AssetResuelto {
  assetId: string;
  ownerAccountId: string;
  status: string;
}

/**
 * EL CONTEXTO, YA RESUELTO. Nada de esto se busca aquí.
 *
 * `missing` y `truncated` son tan importantes como lo que sí vino: sin ellos,
 * «no lo encontré» y «no lo miré» serían indistinguibles de «no está», y las
 * tres tienen que contestarse distinto.
 */
export interface ContextoResuelto {
  /** De quién se está preguntando. Todo lo demás se compara contra esto. */
  accountId: string;
  shot: ShotNode;
  scene?: SceneNode;
  previous?: ShotNode;
  /** Las fichas de los elementos que el plano nombra. */
  elements: readonly ElementoResuelto[];
  /** Los que se nombraron y no se pudieron traer. */
  missing?: readonly string[];
  /** Se alcanzó el tope: hay elementos nombrados que NO se miraron. */
  truncated?: boolean;
  /** El material producido, si el plano declara uno. */
  asset?: AssetResuelto;
  /** Los planos de los que depende, ya leídos. */
  dependencies?: readonly ShotNode[];
  /** Los que se declararon como dependencia y no se pudieron traer. */
  missingDependencies?: readonly string[];
}

/* ── Qué se le puede reprochar a un estado ────────────────────────────────── */

export type MotivoEstructural =
  /* Existe, pero es de otra cuenta. */
  | 'owner_mismatch'
  /* Se apuntó a algo que no vino. No existe, o no es tuyo: la misma respuesta. */
  | 'reference_missing'
  /* Vino, es tuyo, y está en un estado en el que no se puede usar. */
  | 'reference_unusable'
  /* Se ancló una versión que todavía no ha ocurrido. */
  | 'version_unavailable'
  /* El nodo o los requisitos no cumplen su propio contrato. */
  | 'invalid_shape'
  /* Se miró menos de lo que hay. No es un fallo: es una advertencia. */
  | 'context_truncated'
  /* Una relación espacial nombra a alguien que no está en el plano. */
  | 'spatial_reference_missing'
  /* Una dependencia declarada no se pudo resolver. */
  | 'dependency_missing'
  /* El plano dice pertenecer a una escena que no es la que vino. */
  | 'scene_mismatch'
  /* El cambio de estado que se pide no existe en la máquina de C1. */
  | 'invalid_transition'
  /* La versión no avanzó como tiene que avanzar. */
  | 'version_not_advanced';

export interface ProblemaEstructural {
  /** Dónde está el problema, para no tener que adivinarlo. */
  scope: 'shot' | 'scene' | 'previous' | 'element' | 'asset' | 'dependency' | 'spatial' | 'continuity';
  /** Qué cosa concreta, cuando hay una. */
  id?: string;
  reason: MotivoEstructural;
}

/**
 * LO QUE CONTESTA UNA REVISIÓN. Los problemas Y el veredicto por aspecto.
 *
 * Las dos cosas y no una: los problemas dicen qué está roto del estado
 * guardado —cosas que no son de ningún aspecto, como una escena ajena—, y el
 * veredicto dice qué se puede afirmar de cada cosa que se exigió conservar.
 * Meterlo todo en el veredicto obligaría a inventar aspectos para hablar de
 * una dependencia rota, y una dependencia rota no es un aspecto.
 */
export interface RevisionEstructural {
  ok: boolean;
  problems: readonly ProblemaEstructural[];
  verdict: ContinuityVerdict;
}

const mal = (scope: ProblemaEstructural['scope'], reason: MotivoEstructural, id?: string): ProblemaEstructural =>
  Object.freeze({ scope, reason, ...(id !== undefined ? { id } : {}) });

/* ── Qué evidencia estructural admite cada familia ────────────────────────── */

/**
 * DE QUÉ SE PUEDE AGARRAR CADA FAMILIA. Declarado, no deducido.
 *
 *   'element'   hace falta al menos una cosa anclada y resoluble.
 *   'spatial'   hacen falta relaciones, y con los dos extremos presentes.
 *   'previous'  hace falta el plano del que se continúa.
 *   'none'      NO HAY NADA que mirar sin ver el resultado. Sale `unknown`.
 *
 * La última fila es la mitad del valor de este archivo. Una cámara, una luz o
 * un estilo no se anclan a nada guardado: decir `pass` sobre ellos sería
 * inventarse una comprobación que no se hizo, y decir `fail` sería castigar un
 * requisito perfectamente legítimo. `unknown` es la única respuesta honesta, y
 * por la regla de C1 nunca se lee como aprobación.
 *
 * Se indexa por FAMILIA y no por aspecto porque las familias ya existen y se
 * derivan del propio vocabulario: una tabla de ochenta y tres filas sería una
 * segunda copia del catálogo esperando a desincronizarse.
 */
export type EvidenciaEstructural = 'element' | 'spatial' | 'previous' | 'none';

export const EVIDENCIA_POR_FAMILIA: Readonly<Record<string, EvidenciaEstructural>> = Object.freeze({
  identity: 'element',
  appearance: 'element',
  outfit: 'element',
  object: 'element',
  product: 'element',
  architecture: 'element',
  interior: 'element',
  exterior: 'element',
  environment: 'element',
  spatial: 'spatial',
  temporal: 'previous',
  style: 'none',
  camera: 'none',
  lighting: 'none',
  pose: 'none',
  action: 'none',
  narrative: 'none',
});

export const familiaDelAspecto = (aspecto: ContinuityAspect): string => aspecto.slice(0, aspecto.indexOf('.'));

export const evidenciaQuePide = (aspecto: ContinuityAspect): EvidenciaEstructural =>
  EVIDENCIA_POR_FAMILIA[familiaDelAspecto(aspecto)] ?? 'none';

/* ── La revisión ──────────────────────────────────────────────────────────── */

const usable = (status: string): boolean => status === 'active' || status === 'ready';

/**
 * ¿ESTÁ EL ESTADO GUARDADO EN CONDICIONES? Pura, determinista y acotada.
 *
 * Recorre lo que vino, no lo que podría haber: si el contexto llegó recortado
 * se dice, y los aspectos que dependían de lo que no se miró salen `unknown`.
 * Nunca se rellena un hueco con optimismo.
 */
export const revisarEstructura = (ctx: ContextoResuelto, at: number): RevisionEstructural => {
  const problems: ProblemaEstructural[] = [];
  const aspects: VeredictoDeAspecto[] = [];

  /*
   * 1 · El plano, contra su propio contrato y contra la cuenta que pregunta.
   *
   * El identificador se toma ANTES de la comprobación: `planoValido` es un
   * type guard, así que en la rama negativa el tipo ya no tiene campos que leer.
   */
  const suId = (ctx.shot as { shotId?: string } | undefined)?.shotId;
  if (!planoValido(ctx.shot)) problems.push(mal('shot', 'invalid_shape', suId));
  if (ctx.shot?.ownerAccountId !== ctx.accountId) problems.push(mal('shot', 'owner_mismatch', suId));

  /* 2 · La escena: si el plano dice tener una, tiene que estar y ser la suya. */
  if (ctx.shot?.sceneId !== undefined) {
    if (!ctx.scene) problems.push(mal('scene', 'reference_missing', ctx.shot.sceneId));
    else if (ctx.scene.ownerAccountId !== ctx.accountId) problems.push(mal('scene', 'owner_mismatch', ctx.scene.sceneId));
    else if (ctx.scene.sceneId !== ctx.shot.sceneId) problems.push(mal('scene', 'scene_mismatch', ctx.scene.sceneId));
  }

  /* 3 · El plano del que continúa. */
  if (ctx.shot?.previousShotId !== undefined) {
    if (!ctx.previous) problems.push(mal('previous', 'reference_missing', ctx.shot.previousShotId));
    else if (ctx.previous.ownerAccountId !== ctx.accountId) problems.push(mal('previous', 'owner_mismatch', ctx.previous.shotId));
    else if (ctx.previous.shotId !== ctx.shot.previousShotId) problems.push(mal('previous', 'reference_missing', ctx.shot.previousShotId));
  }

  /* 4 · Las dependencias declaradas. Ninguna puede faltar ni ser de otro. */
  for (const id of ctx.missingDependencies ?? []) problems.push(mal('dependency', 'dependency_missing', id));
  const declaradas = new Set(ctx.shot?.dependsOnShotIds ?? []);
  for (const dep of ctx.dependencies ?? []) {
    if (dep.ownerAccountId !== ctx.accountId) problems.push(mal('dependency', 'owner_mismatch', dep.shotId));
    else if (!declaradas.has(dep.shotId)) problems.push(mal('dependency', 'reference_missing', dep.shotId));
  }
  const traidas = new Set((ctx.dependencies ?? []).map((d) => d.shotId));
  for (const id of declaradas) {
    if (!traidas.has(id) && !(ctx.missingDependencies ?? []).includes(id)) {
      problems.push(mal('dependency', 'dependency_missing', id));
    }
  }

  /* 5 · El material producido, si lo hay. */
  if (ctx.shot?.producedAssetId !== undefined) {
    if (!ctx.asset) problems.push(mal('asset', 'reference_missing', ctx.shot.producedAssetId));
    else if (ctx.asset.ownerAccountId !== ctx.accountId) problems.push(mal('asset', 'owner_mismatch', ctx.asset.assetId));
    else if (ctx.asset.assetId !== ctx.shot.producedAssetId) problems.push(mal('asset', 'reference_missing', ctx.shot.producedAssetId));
    else if (!usable(ctx.asset.status)) problems.push(mal('asset', 'reference_unusable', ctx.asset.assetId));
  }

  /* 6 · Los elementos anclados: dueño, estado y versión. */
  const anclados = [...(ctx.shot?.elements ?? []), ...(ctx.shot?.continuity?.anchors ?? [])];
  const porId = new Map(ctx.elements.map((e) => [e.elementId, e]));
  const utiles = new Set<string>();
  for (const b of anclados) {
    const ficha = porId.get(b.elementId);
    if (!ficha) {
      if (!(ctx.missing ?? []).includes(b.elementId) && ctx.truncated !== true) {
        problems.push(mal('element', 'reference_missing', b.elementId));
      }
      continue;
    }
    if (ficha.ownerAccountId !== ctx.accountId) { problems.push(mal('element', 'owner_mismatch', b.elementId)); continue; }
    if (!usable(ficha.status)) { problems.push(mal('element', 'reference_unusable', b.elementId)); continue; }
    /* Anclar una versión VIEJA vale; anclar una que no ha ocurrido, no. Y nunca se sube a la última en silencio. */
    if (b.version > ficha.version) { problems.push(mal('element', 'version_unavailable', b.elementId)); continue; }
    utiles.add(b.elementId);
  }
  for (const id of ctx.missing ?? []) problems.push(mal('element', 'reference_missing', id));
  if (ctx.truncated === true) problems.push(mal('continuity', 'context_truncated'));

  /* 7 · Las relaciones espaciales: los dos extremos tienen que estar anclados. */
  const espaciales = ctx.shot?.continuity?.spatial ?? [];
  const espacialesSanas: SpatialConstraint[] = [];
  for (const r of espaciales) {
    const faltaSujeto = !utiles.has(r.subject);
    const faltaObjeto = !utiles.has(r.object);
    if (faltaSujeto) problems.push(mal('spatial', 'spatial_reference_missing', r.subject));
    if (faltaObjeto) problems.push(mal('spatial', 'spatial_reference_missing', r.object));
    if (!faltaSujeto && !faltaObjeto) espacialesSanas.push(r);
  }

  /* 8 · Los requisitos, contra su propio contrato. */
  const requisitos: ContinuityRequirements | undefined = ctx.shot?.continuity;
  if (requisitos !== undefined && !continuidadValida(requisitos)) problems.push(mal('continuity', 'invalid_shape'));

  /* ── Y ahora, aspecto por aspecto ──────────────────────────────────────── */

  const hayElemento = utiles.size > 0;
  const hayLocalizacion = !!ctx.scene?.location && utiles.has(ctx.scene.location.elementId);
  const hayAnterior = !!ctx.previous && ctx.previous.ownerAccountId === ctx.accountId;

  for (const aspecto of requisitos?.preserve ?? []) {
    const pide = evidenciaQuePide(aspecto);
    if (pide === 'none') { aspects.push({ aspect: aspecto, status: 'unknown', reason: 'not_checked' }); continue; }
    /* Se miró menos de lo que hay: no se puede afirmar nada, ni para bien ni para mal. */
    if (ctx.truncated === true) { aspects.push({ aspect: aspecto, status: 'unknown', reason: 'inconclusive' }); continue; }

    const sostenido = pide === 'element' ? (hayElemento || (familiaDelAspecto(aspecto) === 'environment' && hayLocalizacion))
      : pide === 'previous' ? hayAnterior
        : espacialesSanas.length > 0;

    aspects.push(sostenido
      ? { aspect: aspecto, status: 'pass' }
      : { aspect: aspecto, status: 'fail', reason: 'reference_unavailable' });
  }

  /* Lo liberado se anota para que se vea, y no decide nada: `resumirVeredicto` solo mira lo exigido. */
  for (const aspecto of requisitos?.mayChange ?? []) {
    aspects.push({ aspect: aspecto, status: 'unknown', reason: 'change_allowed' });
  }

  return Object.freeze({
    ok: problems.length === 0,
    problems: Object.freeze(problems),
    verdict: Object.freeze({
      contract: CONTINUITY_CONTRACT_VERSION,
      status: resumirVeredicto(requisitos, aspects),
      aspects: Object.freeze(aspects),
      validatedAt: at,
    }),
  });
};

/* ── El cambio de un plano ────────────────────────────────────────────────── */

/**
 * ¿ES LEGAL ESTE CAMBIO? Dos preguntas, y las dos con lo que ya existe.
 *
 * El estado, con la máquina de C1 —`puedePasarDePlano`—, que no se reescribe
 * aquí. Y la versión, que sube o se queda, pero nunca retrocede: una versión
 * que baja convierte en imposible saber qué estado del plano produjo qué
 * material, que es justo para lo que existe el número.
 */
export const revisarCambioDePlano = (antes: ShotNode, despues: ShotNode): readonly ProblemaEstructural[] => {
  const problems: ProblemaEstructural[] = [];
  if (!planoValido(antes) || !planoValido(despues)) return Object.freeze([mal('shot', 'invalid_shape')]);
  if (antes.shotId !== despues.shotId || antes.ownerAccountId !== despues.ownerAccountId) {
    return Object.freeze([mal('shot', 'owner_mismatch', despues.shotId)]);
  }
  if (despues.state !== antes.state && !puedePasarDePlano(antes.state, despues.state)) {
    problems.push(mal('shot', 'invalid_transition', despues.shotId));
  }
  if (despues.version <= antes.version) problems.push(mal('shot', 'version_not_advanced', despues.shotId));
  return Object.freeze(problems);
};

/* ── Preguntas sueltas que alguien querrá hacer ───────────────────────────── */

/**
 * ¿QUÉ SE EXIGIÓ QUE ESTRUCTURALMENTE NO SE PUEDE NI MIRAR?
 *
 * Sirve para decirle a una persona, antes de gastar nada, qué parte de lo que
 * pidió no se va a poder comprobar sin ver el resultado.
 */
export const aspectosSinEvidencia = (
  requisitos: ContinuityRequirements | undefined,
): readonly ContinuityAspect[] =>
  Object.freeze((requisitos?.preserve ?? []).filter((a) => evidenciaQuePide(a) === 'none'));

/** Control: toda familia del vocabulario tiene declarada su evidencia. Sin huecos. */
export const familiasSinEvidencia = (): readonly string[] =>
  Object.freeze([...new Set(ASPECTOS_DE_CONTINUIDAD.map(familiaDelAspecto))].filter((f) => EVIDENCIA_POR_FAMILIA[f] === undefined));

/** Reexportado por comodidad de quien lee un veredicto: la exigencia manda sobre el estado. */
export { exigenciaDe };
