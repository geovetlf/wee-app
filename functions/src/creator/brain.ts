import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { engine } from '../engine';
import { assertText, EngineError, toEngineHttpsError } from '../engine/errors';
import { limiter } from '../engine/limits';
import { loadConfig } from '../engine/config';
import { SourceRef } from '../engine/types';
import { CapabilityId } from './types';
import { CreditService } from '../credits/creditCosts';
import { priceOperation } from '../credits/aiPricing';
import { tarifaDeModeloDeTexto } from '../engine/pricing';
import { DEEPSEEK_TEXT_MODEL } from '../engine/providers/deepseek';
import { creditEngine } from '../credits/creditEngine';
import { assertRequestId, CreditError } from '../credits/creditValidation';
import { bloqueDe, contarRespuesta, deshacerRespuesta, RESPUESTAS_POR_CREDIT } from './brainUsage';
import { usageTransactionId } from '../credits/creditTransactions';
import { firestoreLedger } from '../engine/ledger';
import { ensureAccount } from './credits';
import { assertAttachmentUrl, assertInputImageUrl } from './inputs';
import { BRAIN_CHAT_SYSTEM, BRAIN_SPECIALISTS, instruccionDeIdioma, localeDeBrain } from './prompts';
import { AI_SECRETS } from '../secrets';
import { BRAIN_CONTRACT_VERSION, BrainAttachment, LIMITES_DE_CONTEXTO, Thinker, contextoDeIdioma, interpretarMarca } from '../core';
import { crearBrainDeWee, pensamientoDesde } from '../brain';
import {
  conductorDeWee,
  configuracionDeLaPuerta,
  decidirRuntime,
  FalloDelPensador,
  huellaDeEntrada,
  libroDelMotor,
  pensadorSobreConductor,
} from '../runtime';

/**
 * Weë Brain — el asistente general de Weë (docs/CREATOR.md §4).
 * Conversa con contexto, explica, investiga (búsqueda web con fuentes),
 * planifica, analiza fotos y detecta cuándo otro Weë lo hace mejor.
 *
 *   brainChats/{chatId}                { userId, title, lastMessage, messageCount, createdAt, updatedAt }
 *   brainChats/{chatId}/messages/{id}  { role: user | wee, text, imageUrl?, sources?, suggestedExperience?, credits?, createdAt }
 *
 * Cada respuesta pasa por el Credit Engine (ai_text, o ai_search con búsqueda):
 * requestId = brain_<messageId>, así que reenviar el mismo mensaje no cobra dos veces.
 * Motor: WEË AI ENGINE (text.generate / text.search → Gemini; modo demo sin clave).
 */
/**
 * Cuántos turnos se llevan de la conversación. El número vive en el Core
 * (`LIMITES_DE_CONTEXTO`) y se lee de ahí para que haya UNA fuente: lo que
 * Weë Brain manda al modelo y lo que el Core acota no pueden decir cosas
 * distintas.
 */
const MAX_HISTORY = LIMITES_DE_CONTEXTO.turnos;
const now = () => Timestamp.now();

/**
 * ── LA ÚNICA CAPACIDAD QUE EL CANARY AUTORIZA ───────────────────────────────
 *
 * La puerta (`runtime/puerta.ts`) es genérica: sirve para toda la migración y
 * se abre por capacidad desde una configuración. Esto es el candado de al lado,
 * escrito en el código: por muchas capacidades que llegue a listar esa
 * configuración, desde aquí solo puede salir UNA hacia el Core. Una
 * configuración puede CERRAR el canary; ampliarlo exige tocar esta línea, que
 * es exactamente lo que autorizó el usuario y nada más.
 *
 * La búsqueda con fuentes (`text.search`) NO entra: es otra capacidad, con otro
 * proveedor, otro servicio y un cobro por adelantado.
 */
const CAPACIDAD_DEL_CANARY: CapabilityId = 'text.generate';
/** El producto desde el que se pide. Es contexto, no autoridad. */
const EXPERIENCIA_DE_BRAIN = 'brain';
/**
 * Cuánto se le deja al conductor dentro de esta invocación. El callable muere a
 * los 120 s; el conductor no debe esperar hasta el último segundo, porque
 * después de él todavía hay que contar la respuesta, cobrarla, guardarla y
 * contestar.
 */
const MARGEN_DEL_CONDUCTOR_MS = 90_000;

/**
 * Lo que hace falta de una generación DESPUÉS de tenerla, venga por donde venga:
 * las fuentes que se enseñan, la fila del libro con la que se ata a su coste, y
 * si fue una muestra del modo demo. Es lo único que los dos caminos tienen que
 * saber decir igual.
 */
interface SalidaDeBrain {
  sources: SourceRef[];
  generationId?: string;
  demo?: boolean;
}

export interface BrainAnswer {
  text: string;
  suggestedExperience?: string;
}

/**
 * Saca la marca [[WEE:id]] con la que el modelo deriva a un especialista.
 *
 * La regla vive en el Core (`interpretarMarca`), que es quien sabe que una
 * marca a un especialista inexistente se ignora. Aquí solo se le dice cuáles
 * existen. Misma salida de siempre para quien ya la usaba.
 */
export const parseSuggestion = (raw: string): BrainAnswer => {
  const { text, suggestedExperience } = interpretarMarca(raw, Object.keys(BRAIN_SPECIALISTS));
  return { text, suggestedExperience };
};

/** Detección de intención por palabras clave (respaldo cuando el modelo no marca nada). */
const KEYWORDS: Record<string, string[]> = {
  design: ['logo', 'afiche', 'poster', 'póster', 'flyer', 'diseñ', 'ilustraci', 'portada', 'banner', 'personaje'],
  studio: ['video', 'anima', 'reel', 'weel', 'weël', 'anuncio en video', 'clip'],
  photo: ['foto', 'retocar', 'restaurar', 'quitar el fondo', 'fondo de', 'colorizar', 'imagen borrosa'],
  writer: ['escrib', 'redact', 'cuento', 'novela', 'guion', 'guión', 'artículo', 'articulo', 'email', 'correo', 'carta', 'traduc', 'resum', 'corrige', 'corregir', 'cv', 'currícul', 'curricul'],
  beauty: ['maquill', 'peinado', 'corte de pelo', 'cabello', 'barba', 'outfit', 'uñas', 'look'],
  chef: ['receta', 'cocin', 'menú', 'menu semanal', 'ingredientes', 'cena', 'almuerzo', 'postre'],
  home: ['sala', 'dormitorio', 'cuarto', 'cocina', 'decorar', 'remodel', 'jardín', 'jardin', 'mueble'],
  business: ['negocio', 'emprend', 'marketing', 'vender', 'ventas', 'clientes', 'campaña', 'campana', 'redes de mi', 'estrategia', 'presentación para', 'inversor'],
};

export const guessExperience = (message: string): string | undefined => {
  const lower = message.toLowerCase();
  const scores = Object.entries(KEYWORDS)
    .map(([id, words]) => [id, words.filter((w) => lower.includes(w)).length] as [string, number])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  return scores[0]?.[0];
};

const stripUndefined = <T extends Record<string, unknown>>(value: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = v;
  return out as T;
};

export interface BrainChatInput {
  chatId?: string;
  message?: string;
  /** Id único del mensaje (lo genera la app): idempotencia del cobro y del registro. */
  messageId?: string;
  imageUrl?: string;
  /** PDF que la persona subió a su carpeta de Weë Storage. */
  documentUrl?: string;
  /** Audio para transcribir o comentar. */
  audioUrl?: string;
  webSearch?: boolean;
  /**
   * El idioma que tiene puesto WEË ahora mismo ('es-PE', 'ja', 'ko'…).
   *
   * Lo manda el cliente porque es el cliente quien lo sabe: sale de `i18n/`, del
   * mismo sitio del que sale cada palabra de la interfaz, y no de adivinarlo por
   * la IP ni por lo que la persona escriba. Ausente —un cliente viejo—, Weë Brain
   * contesta en español, que es lo que hacía antes de esto.
   */
  locale?: string;
}

/** Salida máxima de una respuesta de Weë Brain. Es el techo del coste de salida. */
const BRAIN_MAX_OUTPUT_TOKENS = 1400;

/**
 * CON QUÉ MODELO CONVERSA WEË BRAIN (decisión del usuario, 2026-09-16).
 *
 * DeepSeek-V4.1-Flash, por su API oficial. Se elige por COSTE y por nada más:
 * conversar cuesta aquí la mitad que con el modelo de texto más barato de
 * Google, y Brain es la puerta que más se abre en Weë.
 *
 * Se pide POR SU NOMBRE, no por la cadena. El router descarta solo a los demás
 * proveedores —ninguno tiene este identificador— y así ninguna otra sección de
 * Weë cambia de modelo: Studio, Writer, Chef, Business, Travel y Design siguen
 * entrando por donde entraban.
 *
 * Esto NO es un orquestador ni un router nuevo: es un modelo fijo, elegido a
 * mano, con el mecanismo que el motor ya tenía (`prefs.modelId`). El día que
 * Weë Brain tenga su orquestador, esta constante desaparece y la elección la
 * hará él (CLAUDE.md §10).
 *
 * La BÚSQUEDA con fuentes no pasa por aquí: la sirve Gemini con Google Search
 * grounding, y se queda como estaba.
 */
const MODELO_DE_BRAIN = process.env.BRAIN_TEXT_MODEL?.trim() || DEEPSEEK_TEXT_MODEL;

/** Últimos mensajes de la conversación, en el formato que entiende el motor. */
async function readHistory(messages: FirebaseFirestore.CollectionReference): Promise<{ role: string; text: string }[]> {
  const snap = await messages.orderBy('createdAt', 'desc').limit(MAX_HISTORY).get();
  return snap.docs
    .map((d) => d.data())
    .reverse()
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: String(m.text || '') }));
}

/**
 * Input EXACTO que recibe el motor. Lo usan por igual la cotización previa
 * (brainQuote) y el cobro real (brainChat): así el precio que ve la persona
 * y el que se le cobra salen del mismo sitio.
 */
function brainInput(message: string, history: { role: string; text: string }[], files: { imageUrl?: string; documentUrl?: string; audioUrl?: string }, locale?: string): Record<string, unknown> {
  return {
    /* El prompt de siempre, más en qué idioma toca contestar hoy. */
    system: `${BRAIN_CHAT_SYSTEM} ${instruccionDeIdioma(locale)}`,
    prompt: message,
    history,
    imageUrl: files.imageUrl,
    documentUrl: files.documentUrl,
    audioUrl: files.audioUrl,
    kind: 'answer',
    maxOutputTokens: BRAIN_MAX_OUTPUT_TOKENS,
    temperature: 0.7,
  };
}

/**
 * Precio de un mensaje de Weë Brain. Pasa por el mismo suelo que el resto:
 * coste oficial estimado del proveedor, margen y Credits por dólar del Credit
 * Engine. Si el historial, una foto, un documento o un audio encarecen la
 * petición, el precio sube solo; nunca baja del coste estimado.
 */
async function priceBrainMessage(input: Record<string, unknown>, webSearch: boolean) {
  const { settings } = await loadConfig();
  const capability: CapabilityId = webSearch ? 'text.search' : 'text.generate';
  /*
   * Weë Brain se cobra con SU servicio, no con el de todo el texto de Weë.
   *
   * `ai_text` lo comparten la receta de Weë Chef y los pasos de texto de Studio,
   * Travel, Business y Design; `ai_brain` es solo de aquí, y por eso puede tener
   * su propio margen y su propio modo sin tocarles el precio a ellas. La búsqueda
   * con fuentes sigue siendo `ai_search`, como siempre.
   */
  const service: CreditService = webSearch ? 'ai_search' : 'ai_brain';
  /*
   * Se cotiza con la tarifa del modelo que VA a responder, que aquí se conoce de
   * antemano porque Brain lo pide por su nombre. La búsqueda no lo pide, así que
   * sigue cotizándose con el techo por nivel, como siempre.
   */
  const modelo = webSearch ? undefined : tarifaDeModeloDeTexto(MODELO_DE_BRAIN);
  const price = priceOperation(capability, input, service, settings, modelo);
  return { price, settings, capability, service };
}

/**
 * Cuánto costaría el siguiente mensaje, antes de enviarlo. La app lo llama para
 * enseñar el precio junto al botón de enviar; no cobra ni escribe nada.
 */
export const brainQuote = onCall({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', secrets: AI_SECRETS }, async (request) => {
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    const uid = request.auth.uid;
    const data = (request.data || {}) as BrainChatInput;
    const message = assertText(data.message ?? ' ', 'tu mensaje', LIMITES_DE_CONTEXTO.caracteresDelMensaje);
    const webSearch = data.webSearch === true;
    const files = {
      imageUrl: data.imageUrl ? assertInputImageUrl(data.imageUrl, uid) : undefined,
      documentUrl: data.documentUrl ? assertAttachmentUrl(data.documentUrl, uid, 'document') : undefined,
      audioUrl: data.audioUrl ? assertAttachmentUrl(data.audioUrl, uid, 'audio') : undefined,
    };

    let history: { role: string; text: string }[] = [];
    if (data.chatId) {
      const chatRef = getFirestore().collection('brainChats').doc(String(data.chatId));
      const snap = await chatRef.get();
      if (!snap.exists || snap.data()?.userId !== uid) throw new EngineError('INVALID_REQUEST', 'No encontramos esta conversación.');
      history = await readHistory(chatRef.collection('messages'));
    }

    /* El idioma entra ya en la cotización: la instrucción va en el prompt y cuenta tokens. */
    const { price, settings, service } = await priceBrainMessage(brainInput(message, history, files, data.locale), webSearch);
    /*
     * Lo que va a costar ESTE mensaje, que en la conversación ya no es siempre lo
     * mismo: once de cada doce respuestas no cobran nada, y la duodécima cobra el
     * Credit del bloque entero. La búsqueda sigue cobrando por mensaje.
     *
     * El coste del proveedor (`usd`) se sigue enseñando tal cual: es lo que
     * REALMENTE cuesta esa respuesta, y no cambia porque el cobro vaya por bloques.
     */
    const bloque = webSearch ? undefined : await bloqueDe(uid);
    const cobra = !bloque || bloque.usadas === RESPUESTAS_POR_CREDIT - 1;
    return {
      service,
      label: webSearch ? 'Búsqueda con fuentes' : 'Respuesta de Weë Brain',
      credits: cobra ? price.credits : 0,
      usd: Number(price.usd.toFixed(5)),
      creditsPerUsd: settings.creditsPerUsd,
      detail: price.detail,
      bloque,
    };
  } catch (error) {
    throw toEngineHttpsError(error);
  }
});

export const brainChat = onCall({ region: 'us-central1', timeoutSeconds: 120, memory: '512MiB', secrets: AI_SECRETS }, async (request) => {
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    const uid = request.auth.uid;
    const data = (request.data || {}) as BrainChatInput;
    const message = assertText(data.message, 'tu mensaje', LIMITES_DE_CONTEXTO.caracteresDelMensaje);
    const messageId = assertRequestId(data.messageId);
    const webSearch = data.webSearch === true;
    const imageUrl = data.imageUrl ? assertInputImageUrl(data.imageUrl, uid) : undefined;
    const documentUrl = data.documentUrl ? assertAttachmentUrl(data.documentUrl, uid, 'document') : undefined;
    const audioUrl = data.audioUrl ? assertAttachmentUrl(data.audioUrl, uid, 'audio') : undefined;

    const db = getFirestore();
    let chatRef;
    let isNew = false;
    if (data.chatId) {
      chatRef = db.collection('brainChats').doc(String(data.chatId));
      const snap = await chatRef.get();
      if (!snap.exists || snap.data()?.userId !== uid) throw new EngineError('INVALID_REQUEST', 'No encontramos esta conversación.');
    } else {
      chatRef = db.collection('brainChats').doc();
      isNew = true;
    }
    const messages = chatRef.collection('messages');

    // Misma petición repetida (doble toque, reintento): se devuelve la respuesta ya dada
    const existing = await messages.doc(`${messageId}_wee`).get();
    if (existing.exists) {
      const prev = existing.data() || {};
      return { chatId: chatRef.id, messageId: existing.id, text: prev.text, sources: prev.sources || [], suggestedExperience: prev.suggestedExperience ?? null, credits: prev.credits || 0, demo: !!prev.demo, duplicate: true, bloque: await bloqueDe(uid) };
    }

    // Límites y Credits antes de llamar a la IA
    const { settings } = await loadConfig();
    await limiter.reserve(uid, { text: 1 }, settings.limits);
    await ensureAccount(uid);
    /* El mismo servicio con el que se cotizó: lo que se enseña y lo que se cobra son uno. */
    const service = webSearch ? 'ai_search' : 'ai_brain';
    const requestId = `brain_${messageId}`;

    // El historial se lee ANTES de cobrar: encarece la petición y tiene que
    // estar dentro del precio, igual que las fotos y los documentos adjuntos.
    const history = await readHistory(messages);
    const engineInput = brainInput(message, history, { imageUrl, documentUrl, audioUrl }, data.locale);
    const { price } = await priceBrainMessage(engineInput, webSearch);

    /*
     * ── QUIÉN COBRA Y CUÁNDO ─────────────────────────────────────────────────
     *
     * La BÚSQUEDA con fuentes se cobra como siempre, por mensaje y por adelantado:
     * es otra operación, con otro servicio (`ai_search`) y otro precio, y no entra
     * en el bloque de doce.
     *
     * La CONVERSACIÓN va por bloques (decisión del usuario, 2026-09-16): doce
     * respuestas por un Credit. Y eso obliga a cambiar el orden de las cosas. Antes
     * se cobraba primero y se generaba después; ahora no se puede saber si toca
     * cobrar hasta que la respuesta EXISTE, porque lo que cuenta son respuestas
     * entregadas y no mensajes enviados.
     *
     * Lo que no se pierde por el camino es la promesa de que nada se ejecuta sin
     * saldo: cuando la siguiente respuesta es la que cierra el bloque, el saldo se
     * comprueba ANTES de llamar al modelo, con el mismo error de siempre. Así nadie
     * llega a generar algo que luego no puede pagar.
     */
    let spend: { amount: number; duplicate: boolean } | null = null;
    /*
     * Por qué no pudo el conductor, cuando el camino es el del Core. Vive AQUÍ
     * fuera —y no dentro del `try`— porque quien tiene que leerlo es el `catch`
     * que decide si se devuelve el dinero.
     */
    let falloDelConductor: FalloDelPensador | undefined;
    /*
     * ¿Le va a costar algo ESTE mensaje? Es la misma cuenta que hace `brainQuote`
     * para enseñarle el precio a la persona antes de enviar: la búsqueda siempre
     * cobra, y la conversación solo cuando la respuesta cierra el bloque de doce.
     *
     * Se calcula una vez y sirve para dos cosas: comprobar el saldo antes de
     * llamar al modelo, y decirle al libro lo que de verdad se le cobra. Así lo
     * que ve la persona, lo que se cobra y lo que queda anotado son el mismo número.
     */
    const cierraElBloque = !webSearch && (await bloqueDe(uid)).usadas === RESPUESTAS_POR_CREDIT - 1;
    const creditsDelMensaje = webSearch || cierraElBloque ? price.credits : 0;
    if (webSearch) {
      spend = await creditEngine.spendCredits({
        userId: uid,
        service,
        amount: price.credits,
        requestId,
        reason: 'Weë Brain · búsqueda',
        source: 'weë-brain',
        meta: { chatId: chatRef.id, estimatedUsd: price.usd, ...price.detail },
      });
    } else if (cierraElBloque) {
      const saldo = await creditEngine.getBalance(uid);
      if (saldo.balance < price.credits) {
        throw new CreditError('INSUFFICIENT_CREDITS', 'No tienes suficientes Credits', {
          required: price.credits,
          available: saldo.balance,
          service,
        });
      }
    }

    if (isNew) await chatRef.set({ userId: uid, title: message.slice(0, 60), messageCount: 0, createdAt: now(), updatedAt: now() });
    await messages.doc(messageId).set(stripUndefined({ role: 'user', text: message, imageUrl, documentUrl, audioUrl, webSearch, createdAt: now() }));

    /*
     * ── ¿POR EL CORE, O POR DONDE SIEMPRE? ───────────────────────────────────
     *
     * Aquí y en ningún otro sitio. Es UNA decisión, antes de pensar, y de ella
     * sale UN pensador: o el de siempre o el del conductor. Nunca los dos — dos
     * caminos para el mismo mensaje serían dos llamadas al proveedor y dos
     * veces su coste.
     *
     * La cuenta con la que se decide es la del PRINCIPAL autenticado
     * (`request.auth.uid`). El cliente no la manda y no podría: lo que llegue en
     * `data` no se mira para esto.
     *
     * Cerrada por defecto: sin configuración, con una que no se entiende, o si
     * Firestore no contesta, esto contesta `legacy` y no cambia nada.
     */
    const capacidad: CapabilityId = webSearch ? 'text.search' : 'text.generate';
    const puerta = decidirRuntime(await configuracionDeLaPuerta(db), { capability: capacidad, userId: uid, experienceId: EXPERIENCIA_DE_BRAIN });
    const porElCore = puerta.runtime === 'core' && capacidad === CAPACIDAD_DEL_CANARY;

    try {
      /*
       * ── QUIÉN PIENSA, Y POR QUÉ VIVE AQUÍ ────────────────────────────────────
       *
       * Weë Brain (`core/brain.ts`) entiende y conversa, pero no sabe con qué
       * modelo se paga esta respuesta: eso lo sabe quien la cotizó, que es este
       * archivo. Por eso el pensador se construye aquí y entra por el puerto.
       *
       * Manda EXACTAMENTE el `engineInput` que se cotizó unas líneas más arriba:
       * una sola fuente, para que lo que se enseña, lo que se envía y lo que se
       * cobra sigan siendo el mismo número.
       *
       * Y NO le pasa `goal`: el libro lo copia tal cual a `aiGenerations`, y ahí
       * acabaría el mensaje íntegro de la persona. La calidad y el modo demo ya
       * leen `input.prompt`, así que no cambia nada.
       */
      let causaDelFallo: unknown;
      let salida: SalidaDeBrain | undefined;
      const pensadorDeSiempre = (): Thinker => ({
        async pensar() {
          try {
            const run = await engine.generate({
              capability: capacidad,
              /*
               * El mismo modelo con el que se cotizó: lo que se cobra y lo que responde
               * son uno. Y se nombra también al proveedor, porque DeepSeek no está en la
               * cadena general —no puede ser el respaldo de nadie más— y esta es la
               * forma de pedirlo: explícitamente. Si no está disponible, Brain falla y
               * se ve; nunca se cambia de proveedor por detrás.
               */
              ...(webSearch ? null : { prefs: { modelId: MODELO_DE_BRAIN, allowedProviders: ['deepseek'] } }),
              input: engineInput,
              userId: uid,
              jobId: chatRef.id,
              stepId: messageId,
              experienceId: 'brain',
              requestId,
              service,
              /* Lo que el libro tiene que anotar: el motor no conoce el bloque de doce. */
              creditsEstimated: creditsDelMensaje,
              creditTransactionId: usageTransactionId(requestId),
            });
            salida = { sources: run.output.sources || [], generationId: run.generationId, demo: run.demo };
            return pensamientoDesde(run);
          } catch (error) {
            /* El error ORIGINAL se guarda: es el que conserva el código que la app entiende. */
            causaDelFallo = error;
            throw error;
          }
        },
      });

      /*
       * ── EL MISMO MENSAJE, POR EL CONDUCTOR ───────────────────────────────────
       *
       * Mismo puerto, misma cotización, misma contabilidad: lo único que cambia
       * es quién habla con el proveedor. Weë Brain no se entera, y este archivo
       * tampoco cambia lo que cobra ni cuándo.
       *
       * Lo que viaja en el trabajo es una REFERENCIA —qué conversación y qué
       * mensaje—, nunca el texto: `jobs/` no se convierte en una segunda copia
       * de las conversaciones. Y viaja la HUELLA de la entrada que se acaba de
       * cotizar: si al resolverla no sale exactamente eso, el paso falla sin
       * haber salido hacia ningún proveedor.
       */
      const pensadorDelConductor = async (): Promise<Thinker> => {
        /* La fila de `aiGenerations` la abre el ejecutor; aquí se recuerda cuál para poder atarla a la respuesta, igual que hace el camino de siempre. */
        let fila: string | undefined;
        /*
         * La fila del libro se nombra como la nombraría el camino de siempre
         * —`brain_<messageId>`, el chat y el mensaje—, no como la nombra el
         * trabajo. Así una generación del canary y una de antes se comparan y se
         * suman sin traducir nada, que es justo lo que un canary necesita. Quién
         * la ejecutó de verdad sigue entero en `jobs/`.
         */
        const libro = libroDelMotor(firestoreLedger, () => ({ requestId, jobId: chatRef.id, stepId: messageId }));
        const conductor = await conductorDeWee({
          db,
          /* Cotizar y ejecutar construyen la entrada con LA MISMA función. Si fueran dos, un día dejarían de coincidir. */
          construirEntradaDeBrain: ({ mensaje, historial, locale }) =>
            brainInput(mensaje.text, [...historial], { imageUrl: mensaje.imageUrl, documentUrl: mensaje.documentUrl, audioUrl: mensaje.audioUrl }, locale),
          libro: {
            async abrir(dispatch) {
              fila = await libro.abrir(dispatch);
              return fila;
            },
            cerrar: (f, cierre) => libro.cerrar(f, cierre),
          },
        });
        const porElConductor = pensadorSobreConductor({
          conductor,
          /* QUIÉN, de la sesión autenticada. Nunca de `data`. */
          principal: { userId: uid },
          referencia: { kind: 'brain.message', chatId: chatRef.id, messageId, quotedInputHash: huellaDeEntrada(engineInput) },
          ...(data.locale ? { locale: data.locale } : {}),
          /* El mismo modelo y el mismo proveedor que se cotizaron, pedidos igual que arriba. */
          ruteo: { modelId: MODELO_DE_BRAIN, allowedProviders: ['deepseek'] },
          /*
           * Lo que el libro tiene que anotar, con la misma transacción de
           * Credits que liquida este archivo. Y `creditRequestId`, que es lo
           * que permitiría a otro proceso cerrar esta operación leyendo solo el
           * trabajo guardado, si algún día esto fuera asíncrono. Hoy no lo es:
           * quien liquida sigue siendo el `try/catch` de aquí abajo.
           */
          contabilidad: {
            service,
            creditsEstimated: creditsDelMensaje,
            estimatedUsd: price.usd,
            creditTransactionId: usageTransactionId(requestId),
            creditRequestId: requestId,
          },
          deadlineAt: Date.now() + MARGEN_DEL_CONDUCTOR_MS,
        });
        return {
          async pensar(peticion) {
            try {
              const pensado = await porElConductor.pensar(peticion);
              /* `demo` es un booleano por los dos caminos: que falte no es lo mismo que que sea `false`, y quien lo lee no tiene por qué notar la diferencia. */
              salida = { sources: [...(pensado.response.sources ?? [])], generationId: fila, demo: pensado.synthetic === true };
              return pensado;
            } catch (error) {
              /*
               * SE GUARDA AQUÍ O SE PIERDE. Weë Brain (`core/brain.ts`) atrapa lo
               * que lance el pensador y lo convierte en un `failed` genérico: el
               * error original no sale de ahí. El camino de siempre ya hacía esto
               * mismo con `causaDelFallo`, y por la misma razón — pero aquí no es
               * solo el código que ve la app: es lo que decide si se puede
               * reembolsar. Sin guardarlo, la regla del reembolso seguro no
               * llegaría a preguntarse nunca.
               */
              if (error instanceof FalloDelPensador) falloDelConductor = error;
              throw error;
            }
          },
        };
      };

      const pensador: Thinker = porElCore ? await pensadorDelConductor() : pensadorDeSiempre();

      /*
       * El cerebro se construye por petición: no guarda nada de nadie, así que
       * un servidor puede desaparecer y otro seguir con lo que hay en Firestore.
       */
      const cerebro = crearBrainDeWee({ pensador, experiences: Object.keys(BRAIN_SPECIALISTS) });
      const adjuntos: BrainAttachment[] = [
        ...(imageUrl ? [{ kind: 'image' as const, url: imageUrl }] : []),
        ...(documentUrl ? [{ kind: 'document' as const, url: documentUrl }] : []),
        ...(audioUrl ? [{ kind: 'audio' as const, url: audioUrl }] : []),
      ];
      const pensado = await cerebro.conversar({
        contract: BRAIN_CONTRACT_VERSION,
        /*
         * El hilo: `traceId` es de ESTA petición —y coincide con el `requestId`,
         * que ya es idempotente—, la conversación es la SESIÓN, y `runId` va con
         * el id del chat porque es lo que el libro conoce como `jobId`.
         */
        trace: { traceId: requestId, requestId, userId: uid, sessionId: chatRef.id, runId: chatRef.id, stepId: messageId, workplace: 'brain' },
        /* El idioma de Weë, con la reserva de siempre: un cliente viejo sigue en español. */
        language: contextoDeIdioma({ appLanguage: localeDeBrain(data.locale) }),
        message: { text: message, attachments: adjuntos },
        conversation: { id: chatRef.id, recent: history.map((h) => ({ role: h.role === 'user' ? ('user' as const) : ('wee' as const), text: h.text })) },
        options: { webSearch },
        /* Se TRANSPORTA lo que ya se calculó; Brain no cobra ni decide precios. */
        accounting: {
          creditsEstimated: creditsDelMensaje,
          service,
          ...(creditsDelMensaje === 0 ? { policyNote: `Weë Brain cobra 1 Credit cada ${RESPUESTAS_POR_CREDIT} respuestas` } : {}),
        },
      });
      /*
       * Si no pudo pensar, sube el error ORIGINAL del motor y no el normalizado:
       * de él dependen el código que ve la app y el reembolso de más abajo.
       *
       * Y si no llegó a llamarse al modelo —la petición no pasó la frontera de
       * Weë Brain— se dice ESO, no «no pude terminar»: un fallo de forma no es
       * un fallo de generación, y confundirlos hace imposible depurarlo.
       */
      if (pensado.status === 'failed' || !salida || !pensado.reply) {
        if (causaDelFallo) throw causaDelFallo;
        /*
         * YA ESTÁ EN MARCHA, Y NO ES UN FALLO. Si otra invocación del mismo
         * mensaje lo está ejecutando —o acaba de terminarlo—, decirle a la
         * persona «no pude» sería mentirle: sí se pudo, lo está haciendo otra.
         * `DUPLICATE_REQUEST` ya existe en el vocabulario del motor y ya trae su
         * frase («Esa creación ya está en marcha») y su código HTTP, así que no
         * hay que inventar ni un estado ni una pantalla.
         *
         * Y no lleva detalles: ni quién la ejecuta, ni con qué modelo, ni el
         * intento, ni el trabajo. Eso es de dentro.
         */
        if (falloDelConductor && (falloDelConductor.motivo === 'in_progress_elsewhere' || falloDelConductor.motivo === 'completed_elsewhere')) {
          throw new EngineError('DUPLICATE_REQUEST');
        }
        throw new EngineError(pensado.error?.code === 'INVALID_REQUEST' ? 'INVALID_REQUEST' : 'GENERATION_FAILED');
      }
      const parsed = { text: pensado.reply.text, suggestedExperience: pensado.reply.suggestedExperience };
      const suggestedExperience = parsed.suggestedExperience || guessExperience(message);
      const sources: SourceRef[] = salida.sources;

      /*
       * La respuesta ya existe: ahora sí cuenta, y ahora sí se sabe si cobra.
       *
       * `contarRespuesta` es idempotente por `messageId`: si esta misma respuesta
       * ya se apuntó —un reintento, una repetición de la llamada—, devuelve lo que
       * se decidió entonces y no mueve el bloque. Y `spendCredits` lo es por
       * `requestId`, que es el mismo mensaje. Las dos puertas cierran el doble cobro.
       */
      if (!webSearch) {
        const consumo = await contarRespuesta(uid, messageId);
        if (consumo.cobrada) {
          try {
            spend = await creditEngine.spendCredits({
              userId: uid,
              service,
              amount: price.credits,
              requestId,
              reason: `Weë Brain · ${RESPUESTAS_POR_CREDIT} respuestas`,
              source: 'weë-brain',
              meta: { chatId: chatRef.id, estimatedUsd: price.usd, respuestasDelBloque: RESPUESTAS_POR_CREDIT, ...price.detail },
            });
          } catch (error) {
            /*
             * Generó, cerró el bloque y el cobro no pasó (saldo justo que cambió
             * entre la comprobación y el cobro). Se devuelve el bloque a donde
             * estaba: ni doce respuestas regaladas, ni nadie atascado en el 12.
             */
            await deshacerRespuesta(uid, messageId).catch((e) => console.error('Weë Brain: no se pudo deshacer el bloque', messageId, e));
            throw error;
          }
        }
      }
      const credits = !spend || spend.duplicate ? 0 : spend.amount;
      await messages.doc(`${messageId}_wee`).set(
        stripUndefined({ role: 'wee', text: parsed.text, sources, suggestedExperience, credits, generationId: salida.generationId, demo: salida.demo, webSearch, createdAt: now() })
      );
      await chatRef.set(
        { updatedAt: now(), messageCount: FieldValue.increment(2), lastMessage: parsed.text.slice(0, 120), ...(history.length === 0 ? { title: message.slice(0, 60) } : {}) },
        { merge: true }
      );
      /* Solo hay libro que liquidar si hubo cobro: once de cada doce respuestas no lo tienen. */
      if (spend) {
        await creditEngine.completeCredits({ userId: uid, requestId, meta: { chatId: chatRef.id, generationId: salida.generationId } });
        // El desenlace ya se conoce: se liquida el libro con lo capturado.
        await firestoreLedger
          .settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: spend.amount })
          .catch((error) => console.error('Weë Brain: no se pudo liquidar el libro', requestId, error));
      }
      /* Por dónde pasó, para quien lea los registros. NO va en la respuesta: a la persona el camino no le cambia nada. */
      console.log(`WEË BRAIN · ruta=${porElCore ? 'CORE' : 'LEGACY'} motivo=${puerta.motivo} capacidad=${capacidad} requestId=${requestId} chat=${chatRef.id} generacion=${salida.generationId ?? '-'} credits=${credits}`);
      return { chatId: chatRef.id, messageId: `${messageId}_wee`, text: parsed.text, sources, suggestedExperience: suggestedExperience ?? null, credits, demo: salida.demo, duplicate: false, bloque: await bloqueDe(uid) };
    } catch (error) {
      /*
       * Solo se reembolsa lo que se llegó a cobrar. En la conversación por bloques
       * el cobro va DESPUÉS de responder, así que una generación fallida no dejó
       * nada cobrado —ni gastó bloque, porque `contarRespuesta` tampoco llegó a
       * ejecutarse—. La búsqueda sí cobra por delante, y esa sí se devuelve.
       *
       * ── Y AHORA, ADEMÁS: ¿ES SEGURO DEVOLVERLO? ─────────────────────────────
       *
       * Con el motor de siempre, un error significa que esta invocación —la
       * única que existe— no consiguió nada, así que devolver siempre es
       * correcto. Con trabajos deja de serlo: dos invocaciones del mismo mensaje
       * comparten UN trabajo, y la segunda puede llegar, encontrarlo en marcha y
       * fallar sin que eso quiera decir que nadie va a responder. Si su `catch`
       * reembolsara, desharía la reserva de la que SÍ está ejecutando —y el
       * `completeCredits` de aquella no haría nada después sobre una transacción
       * ya reembolsada—: respuesta entregada, nada cobrado y ningún error a la
       * vista.
       *
       * Por eso el pensador del conductor no lanza un error cualquiera: lanza uno
       * que dice si devolver es seguro. Solo lo es cuando el trabajo terminó mal
       * o nunca llegó a existir. Si salió y no se sabe cómo acabó, si lo tiene
       * otro proceso o si ya terminó en otra invocación, la reserva se queda como
       * está —igual que hoy cuando el proceso muere— y se ve en los registros.
       *
       * Cualquier otro error se comporta EXACTAMENTE como siempre: el camino de
       * siempre no pasa por el conductor y deja `falloDelConductor` sin tocar.
       *
       * Se mira lo que GUARDÓ el pensador, no el error que llega aquí: Weë Brain
       * atrapa lo que lance el pensador y lo sustituye por otro, así que
       * preguntarle al error que llega sería preguntarle al mensajero.
       */
      const devolverEsSeguro = !falloDelConductor || falloDelConductor.reembolsoSeguro;
      if (spend && devolverEsSeguro) {
        await creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Brain · no pudo responder', source: 'weë-brain' }).catch((refundError) => {
          console.error('Weë Brain: no se pudo reembolsar', requestId, refundError);
        });
        // Reembolsado: ninguna fila puede quedar diciendo que cobró.
        await firestoreLedger
          .settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: 0 })
          .catch((error) => console.error('Weë Brain: no se pudo liquidar el libro', requestId, error));
      } else if (spend) {
        /* Ni se devuelve ni se liquida: la reserva sigue autorizada y quien termine de verdad la cerrará. */
        console.warn(`WEË BRAIN · reserva intacta (reembolso no seguro): requestId=${requestId} motivo=${falloDelConductor?.motivo ?? 'desconocido'}`);
      }
      throw error;
    }
  } catch (error) {
    throw toEngineHttpsError(error);
  }
});
