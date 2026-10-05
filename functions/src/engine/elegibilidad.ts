/**
 * ¿SE PUEDE USAR ESTE MODELO EN ESTA OPERACIÓN? Una sola respuesta para todo Weë.
 *
 * La usan las tres piezas que eligen modelo —el router vivo (`pickModel`), el gateway del Core
 * (`conAjustesDeAdministracion`) y el puente al registro del Core (`describirModelo`)— para que no puedan
 * contestar distinto. Vale igual para cualquier capacidad (imagen, vídeo, música, voz, documentos, 3D…) y para
 * cualquier experiencia: aquí no hay nada de un proveedor ni de una sección.
 *
 * La pregunta se contesta por escalones, y el primero que falla decide (`EstadoDeElegibilidad`):
 *   1. BLOCKED_GLOBAL            la licencia, el proveedor o Weë lo prohíben en todas partes.
 *   2. reglas territoriales      solo si el modelo las tiene (`ModelSpec.territorio`): sin jurisdicción conocida,
 *                                JURISDICTION_UNKNOWN; en una bloqueada, BLOCKED_FOR_JURISDICTION; en una no
 *                                aprobada, REVIEW_REQUIRED.
 *   3. REVIEW_REQUIRED           su revisión legal global no está aprobada.
 *   4. APPROVED                  aprobado, pero nadie lo ha activado.
 *   5. ACTIVE                    el único escalón elegible.
 *
 * Los modelos de siempre —sin gobierno ni territorio— solo tienen el paso 4: los apaga la administración, como hasta
 * hoy. Un modelo de un proveedor agregador SIN gobierno declarado no es elegible: no hay licencia revisada detrás.
 *
 * FALLA CERRADO en todo: un valor que no se entiende no aprueba nada, y la configuración solo puede ENDURECER lo que
 * dice el código (pedir revisión, bloquear, apagar), nunca aprobar ni levantar un bloqueo. Lo legal se cambia con
 * evidencia, en el código, y ningún proveedor ni ningún ranking del Router puede saltarse esta respuesta.
 */
import type { DerechosDelMaterial } from '../core/content/asset';
import { esAgregadorAprobado } from '../registry/excepciones';
import { EstadoDeElegibilidad, EstadoDeRevision, ModelSpec, ProviderConfig, ReglasTerritoriales } from './types';

/** Lo que la administración puede decir de un modelo en `aiProviders/{proveedor}.models[id]`. */
export type AjusteDeModelo = NonNullable<ProviderConfig['models']>[string];

/**
 * EL CONTEXTO DE POLÍTICA DE UNA OPERACIÓN. Lo pone el servidor (`EngineContext.jurisdicciones`); nunca la interfaz,
 * el idioma ni el dispositivo.
 */
export interface ContextoDeElegibilidad {
  jurisdicciones?: readonly string[];
}

export interface Elegibilidad {
  elegible: boolean;
  estado: EstadoDeElegibilidad;
  /** La jurisdicción que lo decidió (la bloqueada o la pendiente de revisión), cuando fue una. */
  jurisdiccion?: string;
}

/* ── Jurisdicciones ─────────────────────────────────────────────────────── */

/** Una jurisdicción de una operación: ISO 3166-1 alfa-2, en mayúsculas. */
const CODIGO = /^[A-Z]{2}$/;

/**
 * Los grupos que usan las licencias, por sus miembros. La Unión Europea son sus 27 Estados miembros (ISO 3166-1
 * alfa-2; Grecia es «GR»). Un territorio con código propio que no esté aquí —regiones ultraperiféricas, territorios de
 * ultramar, dependencias de la Corona— no cae en ningún grupo: queda en `resto`, que para un modelo restringido es
 * REVIEW_REQUIRED, así que tampoco es elegible hasta que legal lo decida.
 */
export const GRUPOS_DE_JURISDICCIONES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  EU: Object.freeze([
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU',
    'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
  ]),
});

const esGrupo = (regla: string): boolean => Object.prototype.hasOwnProperty.call(GRUPOS_DE_JURISDICCIONES, regla);

/** ¿La regla (un código o un grupo) abarca esta jurisdicción? */
const abarca = (regla: unknown, jurisdiccion: string): boolean =>
  typeof regla === 'string' && (regla === jurisdiccion || (esGrupo(regla) && GRUPOS_DE_JURISDICCIONES[regla].includes(jurisdiccion)));

/** Una regla bien escrita: un código ISO o un grupo conocido. Lo vigilan las pruebas para todos los modelos declarados. */
export const reglaTerritorialValida = (regla: unknown): boolean => typeof regla === 'string' && (CODIGO.test(regla) || esGrupo(regla));

/** Las jurisdicciones de la operación, solo si se entienden TODAS; si no, ninguna (desconocida). */
const jurisdiccionesDe = (contexto?: ContextoDeElegibilidad): readonly string[] | null => {
  const lista = contexto?.jurisdicciones;
  if (!Array.isArray(lista) || !lista.length) return null;
  return lista.every((j) => typeof j === 'string' && CODIGO.test(j)) ? lista : null;
};

const evaluarTerritorio = (
  reglas: ReglasTerritoriales, contexto?: ContextoDeElegibilidad,
): { estado: 'APPROVED' | 'BLOCKED_FOR_JURISDICTION' | 'JURISDICTION_UNKNOWN' | 'REVIEW_REQUIRED'; jurisdiccion?: string } => {
  const jurisdicciones = jurisdiccionesDe(contexto);
  if (!jurisdicciones) return { estado: 'JURISDICTION_UNKNOWN' };
  /* Unas reglas mal formadas no aprueban nada. */
  if (!Array.isArray(reglas.bloqueadas) || !Array.isArray(reglas.aprobadas)) return { estado: 'REVIEW_REQUIRED' };
  const bloqueada = jurisdicciones.find((j) => reglas.bloqueadas.some((r) => abarca(r, j)));
  if (bloqueada) return { estado: 'BLOCKED_FOR_JURISDICTION', jurisdiccion: bloqueada };
  const restoAprobado = reglas.resto === 'APPROVED';
  const pendiente = jurisdicciones.find((j) => !restoAprobado && !reglas.aprobadas.some((r) => abarca(r, j)));
  if (pendiente) return { estado: 'REVIEW_REQUIRED', jurisdiccion: pendiente };
  return { estado: 'APPROVED' };
};

/* ── La revisión legal ──────────────────────────────────────────────────── */

const RIGOR: Readonly<Record<EstadoDeRevision, number>> = Object.freeze({ APPROVED: 0, REVIEW_REQUIRED: 1, BLOCKED_GLOBAL: 2 });
const esRevision = (x: unknown): x is EstadoDeRevision => typeof x === 'string' && Object.prototype.hasOwnProperty.call(RIGOR, x);

/**
 * La revisión que cuenta: la del código, salvo que la configuración pida una MÁS estricta. Un valor del código que no
 * se entiende cuenta como REVIEW_REQUIRED; uno de la configuración que no se entiende, o más laxo, no cuenta.
 */
export const revisionVigente = (modelo: ModelSpec, ajuste?: AjusteDeModelo): EstadoDeRevision | undefined => {
  if (!modelo.gobierno) return undefined;
  const delCodigo: EstadoDeRevision = esRevision(modelo.gobierno.reviewStatus) ? modelo.gobierno.reviewStatus : 'REVIEW_REQUIRED';
  const pedida = ajuste?.reviewStatus;
  return esRevision(pedida) && RIGOR[pedida] > RIGOR[delCodigo] ? pedida : delCodigo;
};

/**
 * Lo que la administración SÍ puede cambiar de un modelo al combinar su ajuste con el del código: calidad,
 * velocidad, coste, duración. Nunca quién es (id, proveedor, capacidades) ni su gobierno o su territorio: con eso, un
 * ajuste podría mandar al adaptador a otro endpoint o «aprobar» por la puerta de atrás.
 */
export const camposAjustables = (ajuste?: AjusteDeModelo): Partial<ModelSpec> => {
  if (!ajuste || typeof ajuste !== 'object') return {};
  const { id: _i, provider: _p, capabilities: _c, gobierno: _g, territorio: _t, ...resto } = ajuste as Partial<ModelSpec> & Record<string, unknown>;
  return resto as Partial<ModelSpec>;
};

/* ── La respuesta ───────────────────────────────────────────────────────── */

export const modeloElegible = (modelo: ModelSpec, ajuste?: AjusteDeModelo, contexto?: ContextoDeElegibilidad): Elegibilidad => {
  const no = (estado: EstadoDeElegibilidad, jurisdiccion?: string): Elegibilidad =>
    ({ elegible: false, estado, ...(jurisdiccion ? { jurisdiccion } : {}) });
  const gobierno = modelo.gobierno;
  /* Un agregador sirve modelos de terceros: sin su gobierno declarado, nadie ha revisado su licencia. */
  if (!gobierno && esAgregadorAprobado(modelo.provider)) return no('REVIEW_REQUIRED');

  const revision = revisionVigente(modelo, ajuste);
  if (revision === 'BLOCKED_GLOBAL') return no('BLOCKED_GLOBAL');

  if (modelo.territorio) {
    const territorial = evaluarTerritorio(modelo.territorio, contexto);
    if (territorial.estado !== 'APPROVED') return no(territorial.estado, territorial.jurisdiccion);
  }

  if (revision !== undefined && revision !== 'APPROVED') return no('REVIEW_REQUIRED');

  const activo = gobierno
    ? (typeof ajuste?.enabled === 'boolean' ? ajuste.enabled : gobierno.active === 'ACTIVE')
    : ajuste?.enabled !== false;
  if (!activo) return no('APPROVED');
  return { elegible: true, estado: 'ACTIVE' };
};

const TEXTO_DEL_ESTADO: Record<Exclude<EstadoDeElegibilidad, 'ACTIVE'>, string> = {
  BLOCKED_GLOBAL: 'modelo bloqueado por su licencia',
  BLOCKED_FOR_JURISDICTION: 'modelo bloqueado en la jurisdicción de la operación',
  JURISDICTION_UNKNOWN: 'modelo con restricciones territoriales y operación sin jurisdicción conocida',
  REVIEW_REQUIRED: 'modelo pendiente de revisión legal',
  APPROVED: 'modelo desactivado por configuración',
};

export const textoDeElegibilidad = (e: Elegibilidad): string =>
  e.estado === 'ACTIVE' ? 'modelo elegible' : `${TEXTO_DEL_ESTADO[e.estado]}${e.jurisdiccion ? ` (${e.jurisdiccion})` : ''}`;

/**
 * Por qué un adaptador que sí atiende la capacidad no tiene NINGÚN modelo elegible para ella en esta operación: la
 * elegibilidad del primero que la cubre. Sirve para que el descarte del router diga «bloqueado en la jurisdicción»
 * o «pendiente de revisión legal» en vez de «sin modelo». `undefined` si alguno es elegible o ninguno la cubre.
 */
export const elegibilidadDeLaCapacidad = (
  modelos: readonly ModelSpec[], capability: string, ajustes?: ProviderConfig['models'], contexto?: ContextoDeElegibilidad,
): Elegibilidad | undefined => {
  const suyos = modelos.filter((m) => (m.capabilities as readonly string[]).includes(capability));
  if (!suyos.length) return undefined;
  const respuestas = suyos.map((m) => modeloElegible(m, ajustes?.[m.id], contexto));
  return respuestas.some((r) => r.elegible) ? undefined : respuestas[0];
};

/**
 * Los DERECHOS que un modelo con gobierno deja en lo que genera: su revisión, su uso comercial, si exige atribución,
 * sus licencias y dónde NO se puede usar ni mostrar. Es lo que viaja con el material (`Asset.derechos`) para que
 * cualquier experiencia que lo reutilice sepa qué puede hacer con él. Sin gobierno, nada (un modelo sin licencia
 * ajena declarada).
 */
export const derechosDelModelo = (modelo: ModelSpec | undefined): DerechosDelMaterial | undefined => {
  const gobierno = modelo?.gobierno;
  if (!gobierno) return undefined;
  const bloqueadas = (modelo?.territorio?.bloqueadas ?? []).filter(reglaTerritorialValida);
  return {
    revision: gobierno.reviewStatus,
    usoComercial: gobierno.commercialUseStatus,
    atribucion: gobierno.attributionRequired,
    licencias: gobierno.licencias.map((l) => ({ nombre: l.nombre, url: l.url })),
    ...(bloqueadas.length ? { jurisdiccionesBloqueadas: [...bloqueadas] } : {}),
  };
};
