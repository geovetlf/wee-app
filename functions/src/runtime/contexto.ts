import { createHash } from 'node:crypto';
import { FORMA_DE_ETIQUETA_DE_TRAZA, FORMA_DE_ID, WeeError, errorDelCore, esObjetoPlano, esTexto } from '../core';

/**
 * WEË RUNTIME — EL CONTEXTO DE UN TRABAJO VIAJA POR REFERENCIA.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 *
 * Un trabajo guarda su entrada: hace falta para poder ejecutarlo después de una
 * caída. Para una operación de imagen eso es un encargo de tres líneas. Para un
 * mensaje de Weë Brain sería el mensaje de la persona y todo su historial,
 * copiados en `jobs/` — una segunda base de conversaciones que nadie pidió,
 * con otro ciclo de vida y otras reglas que la primera. Y hoy el libro evita a
 * propósito guardar ese texto (`creator/brain.ts`: «NO le pasa `goal`»).
 *
 * ── La regla ────────────────────────────────────────────────────────────────
 *
 * El trabajo guarda DÓNDE está el contexto, no el contexto:
 *
 *     { contextRef: { kind: 'brain.message', chatId, messageId } }
 *
 * y quien ejecuta lo RESUELVE contra la fuente de verdad —la conversación, que
 * ya existe y ya tiene dueño— justo antes de bajar al Gateway. Lo resuelto vive
 * en memoria lo que dura la llamada y no se guarda en ningún sitio.
 *
 * Es estable por construcción: la referencia está en el trabajo guardado, así
 * que un reintento, una recuperación tras caducar la concesión, una entrega
 * repetida u otro proceso resuelven LO MISMO. No depende de la memoria de nadie.
 *
 * ── Saber una referencia no da derecho a leerla ─────────────────────────────
 *
 * Un `chatId` no es un permiso. Antes de leer una sola línea se comprueba que
 * la conversación es de la CUENTA DUEÑA DEL TRABAJO — y esa cuenta se lee del
 * trabajo guardado, nunca de la traza ni de la propia referencia, que son datos
 * que viajaron. Si no es suya, o no existe, o el mensaje es de otra
 * conversación, la respuesta es la misma y no dice cuál de las tres: de una
 * conversación ajena no se cuenta ni que exista.
 *
 * ── Lo que se cotizó es lo que se ejecuta ───────────────────────────────────
 *
 * El precio de un mensaje de Brain se calcula sobre la entrada exacta del motor
 * (historial incluido). Si la referencia trae la huella de esa entrada, lo que
 * se reconstruya aquí tiene que dar LA MISMA. Si no la da —alguien escribió en
 * la conversación entre medias— no se ejecuta otra cosa distinta de la que se
 * cotizó: se falla, sin haber salido hacia ningún proveedor.
 */

export const CLAVE_DE_REFERENCIA = 'contextRef';

export interface ReferenciaDeContexto {
  kind: 'brain.message';
  chatId: string;
  messageId: string;
  /** Con qué cara actúa la cuenta, cuando corresponde. Atribución, NUNCA autoridad: se comprueba que sea suya. */
  entityId?: string;
  /** La huella de la entrada que se cotizó. Con ella, lo que se ejecute tiene que ser eso mismo. */
  quotedInputHash?: string;
}

/** Lo que una conversación guarda de un mensaje, y nada más. */
export interface MensajeDeConversacion {
  role: 'user' | 'wee';
  text: string;
  imageUrl?: string;
  documentUrl?: string;
  audioUrl?: string;
  webSearch?: boolean;
}

/** LA FUENTE DE VERDAD de las conversaciones. Solo lectura: este puerto no tiene por dónde escribir. */
export interface FuenteDeConversaciones {
  /** De quién es. `undefined` si no existe. */
  duenoDe(chatId: string): Promise<string | undefined>;
  mensaje(chatId: string, messageId: string): Promise<MensajeDeConversacion | undefined>;
  /** Los `limite` mensajes ANTERIORES a ese, del más antiguo al más nuevo. Es el historial que había cuando se cotizó. */
  anterioresA(chatId: string, messageId: string, limite: number): Promise<readonly MensajeDeConversacion[]>;
}

/** ¿Puede esta cuenta actuar con esta cara? La misma pregunta que hace la moderación, con la misma regla. */
export interface PuertoDeEntidades {
  esDeLaCuenta(accountId: string, entityId: string): Promise<boolean>;
}

/**
 * De lo que guarda la conversación a la entrada EXACTA del motor.
 *
 * Lo pone quien cotiza, y tiene que ser SU MISMA función: si cotizar y ejecutar
 * construyeran la entrada por caminos distintos, un día dejarían de coincidir.
 */
export type ConstructorDeEntrada = (datos: {
  mensaje: MensajeDeConversacion;
  historial: readonly { role: string; text: string }[];
  locale?: string;
}) => Record<string, unknown>;

export type ContextoResuelto =
  | { ok: true; input: Readonly<Record<string, unknown>>; referenciado: boolean }
  | { ok: false; error: WeeError };

export interface ResolutorDeContexto {
  resolver(datos: { ownerUserId: string; input: Readonly<Record<string, unknown>> }): Promise<ContextoResuelto>;
}

const fallo = (reason: string, extra: Record<string, unknown> = {}): ContextoResuelto =>
  ({ ok: false, error: errorDelCore('INVALID_REQUEST', 'runtime', { details: { reason, ...extra } }) });

const CLAVES_DE_REFERENCIA = ['kind', 'chatId', 'messageId', 'entityId', 'quotedInputHash'];
const FORMA_DE_HUELLA = /^[a-f0-9]{64}$/;

/**
 * Lee la referencia como lo que es: un dato que viajó. Estricta a propósito —
 * una clave de más la invalida entera, y ningún identificador puede llevar una
 * barra: con una barra dentro, `chatId` dejaría de ser un documento y pasaría a
 * ser una RUTA.
 */
export const leerReferencia = (crudo: unknown): { ok: true; ref: ReferenciaDeContexto } | { ok: false; field: string } => {
  if (!esObjetoPlano(crudo)) return { ok: false, field: CLAVE_DE_REFERENCIA };
  for (const clave of Object.keys(crudo)) if (!CLAVES_DE_REFERENCIA.includes(clave)) return { ok: false, field: `${CLAVE_DE_REFERENCIA}.${clave.slice(0, 40)}` };
  if (crudo.kind !== 'brain.message') return { ok: false, field: `${CLAVE_DE_REFERENCIA}.kind` };
  if (!esTexto(crudo.chatId) || !FORMA_DE_ID.test(crudo.chatId)) return { ok: false, field: `${CLAVE_DE_REFERENCIA}.chatId` };
  if (!esTexto(crudo.messageId) || !FORMA_DE_ID.test(crudo.messageId)) return { ok: false, field: `${CLAVE_DE_REFERENCIA}.messageId` };
  if (crudo.entityId !== undefined && (!esTexto(crudo.entityId) || !FORMA_DE_ETIQUETA_DE_TRAZA.test(crudo.entityId) || crudo.entityId.includes('/'))) {
    return { ok: false, field: `${CLAVE_DE_REFERENCIA}.entityId` };
  }
  if (crudo.quotedInputHash !== undefined && (!esTexto(crudo.quotedInputHash) || !FORMA_DE_HUELLA.test(crudo.quotedInputHash))) {
    return { ok: false, field: `${CLAVE_DE_REFERENCIA}.quotedInputHash` };
  }
  return {
    ok: true,
    ref: Object.freeze({
      kind: 'brain.message' as const,
      chatId: crudo.chatId,
      messageId: crudo.messageId,
      ...(crudo.entityId !== undefined ? { entityId: crudo.entityId as string } : {}),
      ...(crudo.quotedInputHash !== undefined ? { quotedInputHash: crudo.quotedInputHash as string } : {}),
    }),
  };
};

const canonico = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => [k, canonico((v as Record<string, unknown>)[k])]));
  }
  return v;
};

/**
 * LA HUELLA DE UNA ENTRADA. La calcula quien cotiza y la comprueba quien
 * ejecuta. Es un hash: identifica la entrada sin contener ni una palabra suya,
 * y por eso sí puede viajar dentro del trabajo.
 */
export const huellaDeEntrada = (input: Record<string, unknown>): string =>
  createHash('sha256').update(JSON.stringify(canonico(input)), 'utf8').digest('hex');

export interface ResolutorDeBrainDeps {
  conversaciones: FuenteDeConversaciones;
  construirEntrada: ConstructorDeEntrada;
  entidades?: PuertoDeEntidades;
  /** Cuántos mensajes de historial. El mismo número con el que se cotizó. */
  turnos: number;
}

/**
 * El resolutor de los mensajes de Weë Brain.
 *
 * Una entrada SIN referencia pasa tal cual: la mayoría de los trabajos no
 * tienen nada que resolver, y este no es sitio para opinar sobre ellos.
 */
export const resolutorDeBrain = (deps: ResolutorDeBrainDeps): ResolutorDeContexto => ({
  async resolver({ ownerUserId, input }): Promise<ContextoResuelto> {
    if (!Object.prototype.hasOwnProperty.call(input, CLAVE_DE_REFERENCIA)) return { ok: true, input, referenciado: false };

    const leida = leerReferencia(input[CLAVE_DE_REFERENCIA]);
    if (!leida.ok) return fallo('invalid_context_ref', { field: leida.field });
    const { ref } = leida;
    if (!esTexto(ownerUserId) || !FORMA_DE_ID.test(ownerUserId)) return fallo('context_not_found');

    /* DE QUIÉN ES, antes de leer nada suyo. Que no exista y que sea de otro se contestan IGUAL. */
    const dueno = await deps.conversaciones.duenoDe(ref.chatId);
    if (dueno === undefined || dueno !== ownerUserId) return fallo('context_not_found');

    if (ref.entityId !== undefined) {
      /* Traer una cara no prueba que sea tuya. Sin quien lo compruebe, no se da por buena. */
      if (!deps.entidades || !(await deps.entidades.esDeLaCuenta(ownerUserId, ref.entityId))) return fallo('entity_not_owned');
    }

    /* El mensaje se busca DENTRO de esa conversación: uno de otra, aunque sea de la misma persona, no está. */
    const mensaje = await deps.conversaciones.mensaje(ref.chatId, ref.messageId);
    if (!mensaje || mensaje.role !== 'user') return fallo('context_not_found');

    const anteriores = await deps.conversaciones.anterioresA(ref.chatId, ref.messageId, deps.turnos);
    const historial = anteriores.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));
    const locale = esTexto(input.locale) ? input.locale : undefined;
    const resuelto = deps.construirEntrada({ mensaje, historial, ...(locale ? { locale } : {}) });

    if (ref.quotedInputHash !== undefined && huellaDeEntrada(resuelto) !== ref.quotedInputHash) return fallo('context_changed');
    return { ok: true, input: Object.freeze(resuelto), referenciado: true };
  },
});
