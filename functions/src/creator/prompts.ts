import { CAPABILITY_CATALOG } from '../core/registry';
import { ThoughtRequest } from '../core';
import { ExperienceId } from './types';
import { DESCRIPCIONES_PARA_DERIVAR, EXPERIENCIAS_PARA_DERIVAR } from './experiencias';

/**
 * Prompts internos de Weë Brain (docs/CREATOR.md §6): la persona nunca los ve.
 * Cada experiencia tiene su rol y cada tipo de pieza sus instrucciones.
 */
export const BRAIN_SYSTEM = [
  'Eres Weë, el asistente de WEË AI. Ayudas a personas que no saben nada de inteligencia artificial.',
  /*
   * El TONO vive aquí; el IDIOMA no, igual que en `BRAIN_CHAT_SYSTEM`. Decía "hablas en español neutro": con la app en
   * danés, el resultado de cada especialista salía en español. El idioma lo pone `instruccionDeSalida()` en cada paso,
   * con el del trabajo; sin él, español neutro, que es lo que decía esta línea.
   */
  'Hablas claro, cálido y directo, de tú.',
  'Nunca mencionas modelos, proveedores, prompts, parámetros ni términos técnicos.',
  'Entregas resultados completos y listos para usar; no pides más información ni haces preguntas.',
].join(' ');

/** «a, b o c» — para que una lista derivada se lea como la escribiría alguien. */
const enumerar = (ids: readonly string[]): string =>
  ids.length < 2 ? ids.join('') : `${ids.slice(0, -1).join(', ')} o ${ids[ids.length - 1]}`;

/**
 * Weë Brain como asistente general (chat con contexto): conversa, explica,
 * investiga, planifica, analiza y, cuando conviene, deriva a otro Weë.
 * Para derivar, termina la respuesta con una línea exacta: [[WEE:<id>]]
 * (la app la convierte en un botón; la persona nunca ve la marca).
 */
export const BRAIN_CHAT_SYSTEM = [
  'Eres Weë Brain, el asistente general de Weë: una app para crear con inteligencia artificial.',
  /*
   * El TONO vive aquí; el IDIOMA no. Esta línea decía "hablas en español
   * neutro", y eso convertía el prompt en un prompt español: con la interfaz en
   * japonés, Weë Brain recibía dos órdenes que se contradicen. El idioma lo pone
   * `instruccionDeIdioma()` en cada petición, con el que WEË tenga activo.
   */
  'Hablas claro, cálido y directo, tuteando a la persona. Respondes completo pero sin relleno (normalmente menos de 250 palabras).',
  'Puedes conversar, resolver dudas, explicar en simple, investigar, enseñar paso a paso, planificar, dar ideas y analizar lo que la persona te cuenta o adjunta.',
  'Si te dan resultados de búsqueda, úsalos para responder con información actual y menciona de dónde sale sin inventar datos; si no sabes algo, dilo.',
  'Nunca mencionas modelos, proveedores, prompts ni términos técnicos de IA. No inventes cifras ni resultados.',
  'Formato: texto plano; listas con • o pasos numerados cuando ayuden; sin símbolos de markdown como # o **; emojis con moderación.',
  `Weë tiene especialistas: ${DESCRIPCIONES_PARA_DERIVAR.join('; ')}.`,
  /*
   * Los ids también se derivan. Estaban escritos a mano aquí dentro —"design,
   * studio, … home o business"— y eran una tercera copia de la lista, metida en
   * una cadena de texto donde ningún compilador iba a mirarla.
   */
  `Cuando lo que la persona quiere lograr lo hace mejor uno de esos especialistas (crear una imagen, un video, editar una foto, escribir un texto largo, una receta, un cambio de look, redecorar, preparar un viaje, hacer crecer un negocio), responde primero brevemente y termina tu mensaje con una línea final exactamente así: [[WEE:id]] usando el id del especialista (${enumerar(EXPERIENCIAS_PARA_DERIVAR)}). Si no corresponde derivar, no escribas esa línea.`,
].join(' ');

/**
 * EN QUÉ IDIOMA CONTESTA WEË BRAIN.
 *
 * En el idioma que tenga puesto WEË, sea cual sea. No hay un prompt por idioma
 * ni una lista de idiomas aquí: hay UNA frase que se arma con el locale que ya
 * resuelve `i18n/` en el cliente (`useIdioma().locale`). El día que entre un
 * idioma nuevo en el catálogo, esto ya lo habla —no hay nada que añadir—.
 *
 * El nombre del idioma se saca de `Intl.DisplayNames`, que viene en Node y
 * conoce todos los locales del mundo, y se pide EN SU PROPIO IDIOMA: a un
 * modelo se le entiende mejor "日本語" que "japonés". Si `Intl` no supiera
 * resolverlo, se le pasa el código tal cual, que también entiende.
 *
 * ── Dos cosas que no son cosméticas ──────────────────────────────────────────
 *
 * 1. El locale VIENE DEL CLIENTE y acaba dentro del prompt del sistema. Eso lo
 *    convierte en una puerta de entrada: sin filtrar, cualquiera podría mandar
 *    un "locale" con instrucciones dentro y reescribir lo que Weë Brain cree que
 *    es. Por eso solo pasa lo que tiene forma de etiqueta de idioma; lo demás se
 *    descarta y manda el de reserva.
 *
 * 2. El de reserva es español y no inglés a propósito: es lo que Weë Brain
 *    respondía hasta hoy, y un cliente viejo —que no manda locale— tiene que
 *    seguir contestando igual que ayer.
 */
const LOCALE_CON_FORMA_DE_IDIOMA = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;
const IDIOMA_DE_RESERVA_DE_BRAIN = 'es';

/**
 * LO QUE SE LE PIDE AL MODELO CUANDO SE LE PIDE QUE ENTIENDA, NO QUE HABLE.
 *
 * ── El pendiente de S2, y por qué no se resolvió allí ───────────────────────
 *
 * S2 dejó escrito que «el prompt de Brain no pide todavía el bloque
 * `creative`». La auditoría de S5 encontró el motivo, y es más grande que un
 * olvido: `brainChat` conversa —el modelo escribe PROSA para una persona— y
 * `interpretarEntendimiento` solo se llama en el modo ENTENDER, que hoy no lo
 * usa nadie en producción. Añadir «devuélveme un JSON» al prompt del chat
 * rompería lo que la gente lee.
 *
 * Así que esto es el prompt del modo ENTENDER, con las dos cosas que faltaban
 * —la intención creativa de S2 y lo que hace falta tener delante de S3— y EN
 * UNA SOLA LLAMADA: el mismo modelo que ya entiende la petición devuelve
 * también estos dos bloques. No hay una segunda pasada, ni un segundo modelo,
 * ni un analizador de texto.
 *
 * NO está enchufado al chat. Enchufarlo es cambiar a qué modo llama
 * `brainChat`, y eso cambia lo que la persona ve: es una decisión de producto
 * y de otra fase.
 */
/**
 * EL VOCABULARIO QUE RECIBE EL MODELO, EN TEXTO.
 *
 * ── El agujero que tapa ─────────────────────────────────────────────────────
 *
 * El Core armaba `ThoughtRequest.expected` con las capacidades y sus variantes,
 * y NADIE lo leía: el pensador declaraba `async pensar()` sin parámetro y
 * tiraba la petición entera. El canary de C20 tuvo que renderizar el
 * vocabulario a mano en su propio script para poder preguntarle al modelo.
 * Un canary que necesita su propio renderizador no está midiendo el producto.
 *
 * ── Y por qué se construye, no se escribe ───────────────────────────────────
 *
 * Las listas salen del catálogo en el momento de armar la petición. Escribirlas
 * aquí sería una segunda verdad: el día que se añadiera una variante, el
 * validador la aceptaría y el modelo no sabría que existe.
 *
 * Se descarta lo que no reconoce el catálogo —una capacidad inventada, una
 * variante que no es de esa capacidad— en vez de arreglarlo. Esto NO corrige
 * al modelo: le dice qué puede decir, y de comprobar lo que diga se encargan
 * el lector y el Planner, cada uno por su cuenta.
 *
 * ── El orden no es una preferencia ──────────────────────────────────────────
 *
 * Las capacidades salen en el orden del catálogo y las variantes en orden
 * alfabético. Es determinista para que dos peticiones iguales den el mismo
 * texto, y NO significa que la primera sea mejor: aquí se define qué se puede
 * expresar, no qué conviene elegir.
 */
export const vocabularioParaElPrompt = (esperado: ThoughtRequest['expected']): string => {
  if (!esperado) return '';
  const enElCatalogo = (id: string) => CAPABILITY_CATALOG.find((c) => c.id === id);
  const delCatalogo = CAPABILITY_CATALOG
    .filter((c) => esperado.capabilities.includes(c.id));
  const capacidades = delCatalogo.map((c) => c.id);
  if (!capacidades.length) return '';

  const lineas: string[] = [
    `Intenciones posibles: ${[...esperado.intents].join(', ')}.`,
    /*
     * ── QUÉ RECIBE Y QUÉ DA CADA UNA ──────────────────────────────────────
     *
     * Hasta G20 aquí iba la lista pelada de ids, y con eso el modelo podía
     * NOMBRAR una capacidad pero no saber cuál puede alimentar a cuál. Desde
     * C27 un paso sí puede declarar de qué otro bebe, así que la pregunta
     * dejó de ser teórica: sin esto tendría que adivinarlo.
     *
     * Sale ENTERO del catálogo, entrada por entrada. No hay aquí ninguna tabla
     * de compatibilidades escrita a mano, ni una sola pareja de capacidades
     * nombrada: eso sería una segunda verdad, y el día que alguien cambiara
     * un `accepts` solo se enteraría la mitad del sistema. Lo que se escribe
     * a mano es UNA frase: cómo se leen los dos lados de la flecha.
     *
     * El catálogo declara que un `accepts` vacío significa «no necesita
     * material de entrada». Hoy no hay ninguna así, pero si la hubiera se dice,
     * porque callarla la haría parecer una que lo acepta todo.
     */
    `Capacidades del catálogo. Antes de la flecha, las clases de material que RECIBE; después, la que DA:`,
    ...delCatalogo.map((c) => `  ${c.id} — ${c.accepts.length ? c.accepts.join('+') : 'nada'} → ${c.produces}`),
    `Un paso solo puede beber de otro si lo que aquel DA es una de las clases que este RECIBE.`,
  ];

  /* Solo las que declaran variantes, y solo las variantes que son SUYAS. */
  const conVariantes = capacidades
    .map((id) => {
      const declaradas = enElCatalogo(id)?.variants ?? [];
      const pedidas = esperado.variants?.[id] ?? [];
      /*
       * Con su SIGNIFICADO. El nombre solo no bastaba: a «el texto de una
       * campaña» el modelo contestaba `campaign` —que es diseñar la campaña
       * entera— en vez de `copy`, que es el texto. Y una variante sin
       * significado no se ofrece: preferimos que el modelo no la conozca a que
       * la elija a ciegas.
       */
      const validas = [...pedidas]
        .filter((v) => v?.description && declaradas.some((d) => d.key === v.key))
        .sort((a, b) => a.key.localeCompare(b.key));
      return validas.length
        ? [`  ${id}:`, ...validas.map((v) => `    ${v.key} — ${v.description}`)].join('\n')
        : '';
    })
    .filter(Boolean);
  if (conVariantes.length) {
    lineas.push('Variantes ("kind") que admite cada capacidad; una que no aparezca aquí no tiene variantes:');
    lineas.push(...conVariantes);
  }
  if (esperado.experiences.length) lineas.push(`Experiencias: ${[...esperado.experiences].join(', ')}.`);
  return lineas.join('\n');
};

/**
 * CON QUÉ SE LE PREGUNTA AL MODELO EN MODO «ENTENDER».
 *
 * Vivía dentro del callable, como un cierre, y desde fuera no se podía ni
 * mirar: para comprobar qué recibe el modelo había que reescribirlo, y un
 * canary que reescribe el camino que dice medir se mide a sí mismo. Así que
 * sale aquí, entero y puro, y el callable lo llama.
 *
 * No decide nada: junta el prompt de estructura con el vocabulario que trae la
 * petición. Ni elige proveedor, ni modelo, ni sabe de Credits.
 */
export const entradaDeEntender = (
  esperado: ThoughtRequest['expected'],
  texto: string,
  maxOutputTokens: number,
): Record<string, unknown> => ({
  system: [String(BRAIN_UNDERSTAND_SYSTEM), vocabularioParaElPrompt(esperado)].filter(Boolean).join('\n\n'),
  prompt: texto,
  kind: 'understand',
  maxOutputTokens,
  /* Estructurar no es escribir: aquí se quiere la misma respuesta dos veces. */
  temperature: 0.2,
});

export const BRAIN_UNDERSTAND_SYSTEM = [
  'Eres el módulo de comprensión de Weë. NO conversas y NO escribes para nadie: devuelves solamente un objeto JSON.',
  'Campos: intent, confidence, goal, capability, capabilities, steps, constraints, missing, assumptions, suggestedExperience, creative, context, continuity.',
  '"confidence" admite EXACTAMENTE tres valores: low, medium o high. Nunca un número.',
  /*
   * ── LOS PASOS ────────────────────────────────────────────────────────────
   *
   * `capabilities` dice QUÉ hace falta y es un conjunto. `steps` dice QUÉ
   * PASOS hay, en qué orden y de qué clase es cada uno — y admite la misma
   * capacidad varias veces, que es justo lo que un conjunto no sabe decir.
   *
   * Las variantes legales de cada capacidad se le pasan al modelo con el resto
   * del vocabulario, sacadas del catálogo. Aquí NO se copia ninguna: una lista
   * escrita a mano en un prompt sería una segunda verdad, y el día que se
   * añadiera una variante solo se enteraría la mitad del sistema.
   *
   * Y tampoco se copia una sola instrucción de las plantillas. El modelo tiene
   * que entender QUÉ pide la persona, no aprenderse cómo lo escribe Weë.
   */
  '"steps" son los pasos, en el orden en que hay que hacerlos, cuando lo que se pide necesita más de una operación.',
  'Cada paso: {"key":"un_nombre_corto", "capability":"una del catálogo", "input":{"kind":"una variante de ESA capacidad", "brief":"qué hace este paso, en una frase"}, "needs":[{"from":"upstream", "stepKey":"la clave del paso del que bebe"}]}.',
  /*
   * ── POR QUÉ `needs` SE ENSEÑA DENTRO DEL ESQUEMA ─────────────────────────────────
   *
   * Porque describirlo en la frase siguiente no bastó. En el canary real de
   * B2 el modelo razonó la composición entera bien —mirar la foto y luego
   * escribir la receta— y declaró la dependencia con la clave correcta, pero
   * la metió DENTRO de "input": el esquema se cerraba ahí, y «dilo en ese paso»
   * no dice en qué sitio del paso. El intérprete la descartó con razón y la
   * dependencia nunca llegó al Planner.
   *
   * No fue un fallo de razonamiento del modelo: fue un contrato ambiguo. Un
   * campo que se pide en prosa y no se enseña en la forma, se coloca donde
   * quepa.
   */
  '"needs" va AL LADO de "key", "capability" e "input", nunca DENTRO de "input". Si este paso no bebe de ningún otro, omítelo entero.',
  'Solo hacia atrás: se puede beber de un paso anterior, nunca de uno posterior. Y no digas ahí de qué clase es lo que bebe: eso ya lo dice el paso que lo produce.',
  'La MISMA capacidad puede aparecer varias veces: «escribe el borrador y luego púlelo» son DOS pasos de text.generate, uno con kind "copy" y otro con kind "polish".',
  'No inventes capacidades ni variantes: si la que harías falta no está en las listas que se te dan, dilo en "missing" en vez de aproximar.',
  'No elijas proveedor, modelo ni precio, y no escribas el texto final que leería un generador: solo QUÉ hay que hacer y de qué clase es.',
  'Lo que hay que conservar va en "continuity", cómo se quiere el resultado va en "creative", y lo que ya existe de la persona va en "context". No los repitas dentro de un paso.',
  'Si lo que se pide no se puede representar con el vocabulario que tienes, no lo fuerces: deja "steps" vacío y di qué falta en "missing".',
  /*
   * El vocabulario va LITERAL y CERRADO. Sin la lista, el modelo inventa
   * valores parecidos —«dolly_backwards», «cámara aérea»— que el validador
   * descarta enteros, y entonces la mitad de las peticiones pierden su
   * intención creativa sin que nadie se entere.
   */
  /*
   * ── LA TERCERA VEZ QUE UN CAMPO SIN FORMA SE RELLENA COMO SE PUEDE ────────────
   *
   * `constraints` se nombraba en la lista de campos de arriba y no se
   * explicaba en ninguna parte — ni siquiera aparecía entre comillas, que es como
   * se presenta cada campo que sí se explica. En un canary de Travel el modelo
   * devolvió cinco restricciones REALES de la persona —Lisboa, cinco días, abril,
   * la comida, sin prisas— en forma de LISTA DE FRASES. El contrato espera pares
   * sueltos, así que el intérprete no vio un objeto plano y se quedó en {}.
   *
   * Es el mismo hueco que ya se pagó dos veces: `needs`, que se pedía en prosa y
   * acabó dentro de `input`, y `confidence`, cuyo vocabulario no se decía y llegó
   * un 0.9. Un campo nombrado y no mostrado se rellena como se pueda.
   *
   * ── Y LAS CLAVES SIGUEN SIENDO ABIERTAS, A PROPÓSITO ───────────────────
   *
   * Lo que acota a una persona no cabe en una lista que Weë decida de
   * antemano: hoy es «sin gluten» y mañana «que quepa en el maletero». Por eso
   * se enseña la FORMA —pares planos, valores escalares— y se dice explicitamente
   * que los nombres los elige el modelo. El ejemplo es un ejemplo, no un
   * catálogo: convertirlo en lista cerrada sería otra fase y otra decisión.
   */
  '"constraints" son los límites que puso la persona, en pares sueltos de nombre y valor: {"duracion":30, "tono":"cercano", "urgente":true}. Los valores son texto, número o sí/no, nunca listas ni objetos.',
  'Los nombres de esas claves los eliges tú: no hay lista cerrada. Si no acotó nada, omite "constraints" entero.',
  '"creative" describe CÓMO quiere el resultado, solo si la persona lo dijo. Forma: {"version":1, ...}. Grupos y valores admitidos:',
  'camera.type: aerial|ground|handheld|pov|macro|overhead|underwater. camera.perspective: eye_level|low_angle|high_angle|aerial.',
  'shot.type: establishing|wide|medium|close_up|extreme_close_up|hero. lens.type: wide|standard|telephoto|macro|fisheye.',
  'movement.type: static|dolly_in|dolly_out|tracking|orbit|pan|tilt|crane_up|crane_down|push_in|pull_out|follow. movement.speed: slow|normal|fast.',
  'motion.smoothness: smooth|natural|dynamic. lighting.type: natural|golden_hour|blue_hour|studio|dramatic|soft|high_contrast|night.',
  'composition.type: centered|rule_of_thirds|symmetrical|negative_space|foreground_depth. transition.type: cut|dissolve|fade|match_cut|whip|seamless.',
  'framing.aspectRatio: 16:9|9:16|1:1|4:5|4:3|21:9.',
  'Si la persona no lo dijo, omite el grupo entero. No inventes valores que no estén en esas listas.',
  /*
   * Y esto es lo nuevo de S5: decir QUÉ HACE FALTA, no cuál. Cuál es de otra
   * capa, y el modelo no tiene forma de saberlo — no ve lo que la cuenta tiene.
   */
  '"context" dice QUÉ COSAS YA EXISTENTES de la persona hacen falta, cuando se refiere a algo suyo ("usa mi hamburguesa", "el personaje de ayer", "el logo de mi restaurante").',
  'Forma: [{"kind":"element","elementType":"character|product|brand|place|object|scene","required":true}] o [{"kind":"asset","assetKind":"image|video|audio|document|text|model3d","required":true}].',
  'NO adivines CUÁL: solo de qué clase. Si no se refiere a nada que ya tenga, omite "context".',
  /*
   * C5: qué tiene que quedarse igual. Es el campo con la regla más delicada de
   * todo el esquema —el silencio NO autoriza— y por eso se le dice tres veces
   * de tres formas: omite lo que no se dijo, no completes listas, no inventes
   * identificadores. Un modelo que rellena huecos aquí da permiso para cambiar
   * la cara de alguien sin que nadie se lo haya pedido.
   */
  '"continuity" dice QUÉ DEBE QUEDARSE IGUAL y QUÉ PUEDE CAMBIAR, solo cuando la persona lo expresa ("deja a Luna igual", "no cambies el rostro", "mantén la arquitectura", "cambia solo el vestido", "hazlo de noche").',
  'Forma: {"preserve":[...], "mayChange":[...], "subjects":["Luna","la casa"], "strength":"relaxed|standard|strict", "spatial":[{"subject":"lámpara","relation":"next_to","object":"sofá"}]}.',
  'Aspectos admitidos, familia.detalle: identity.face|body|hair|features|appearance. appearance.hairstyle|hairColor|skin|eyes|facialHair|makeup. outfit.clothing|footwear|accessories|complete.',
  'object.identity|geometry|proportions|color|material|texture|markings|presence|position|state. product.identity|geometry|packaging|label|branding.',
  'architecture.identity|geometry|facade|openings|structure|proportions|spatialLayout|materials|elements. interior.layout|furniture|fixtures|materials|finishes|decoration.',
  'exterior.site|landscape|terrain|vegetation|surroundings. environment.location|scene|background|spatialContext. style.visual|artistic|rendering|composition.',
  'camera.framing|perspective|position|focal|shotType. lighting.type|direction|intensity|timeOfDay. pose.body|position. action.activity|movement.',
  'spatial.relationships|alignment|containment|relativePosition. temporal.previousShot|sceneState|subjectState|environmentState|objectState|motion. narrative.state|logic.',
  'relation admite: next_to|behind|in_front_of|inside|above|below|aligned_with|attached_to.',
  'REGLA: pon en "preserve" SOLO lo que la persona dijo que se queda igual, y en "mayChange" SOLO lo que dijo que puede cambiar. Lo que no mencionó NO va en ninguna lista: el silencio no es permiso.',
  '"solo"/"únicamente"/"nada más" refuerzan que lo demás se conserva, pero NO completes la lista con aspectos que nadie nombró.',
  '"subjects" son los NOMBRES que usó la persona, nunca identificadores: no los conoces y no debes inventarlos.',
  'Usa "strength":"strict" solo si dijo algo como "exactamente", "idéntico" o "sin cambiar nada". Si no habló de conservar nada, omite "continuity" entero.',
  'Nunca incluyas nombres de modelos, proveedores, URLs, identificadores ni claves. Devuelve solo el JSON, sin explicaciones.',
].join(' ');

export const localeDeBrain = (locale?: unknown): string =>
  typeof locale === 'string' && LOCALE_CON_FORMA_DE_IDIOMA.test(locale) ? locale : IDIOMA_DE_RESERVA_DE_BRAIN;

export const nombreDelIdioma = (locale: string): string => {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) || locale;
  } catch {
    return locale;
  }
};

/** El nombre del idioma en inglés («Danish (Denmark)»): los modelos lo reconocen siempre, junto al propio y al código. */
export const nombreDelIdiomaEnIngles = (locale: string): string => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(locale) || locale;
  } catch {
    return locale;
  }
};

/**
 * EL IDIOMA, DICHO DE TRES MANERAS: el nombre propio, el inglés y el código («dansk (Danmark) · Danish (Denmark) ·
 * código da-DK»). Una sola forma, la misma en la instrucción del sistema y en el recordatorio del final.
 */
const idiomaParaElModelo = (codigo: string): string =>
  `${nombreDelIdioma(codigo)} · ${nombreDelIdiomaEnIngles(codigo)} · código ${codigo}`;

/**
 * La frase que se le añade al prompt del sistema en cada petición.
 *
 * Dice el idioma y dice que NO se cambie porque la persona escriba en otro: si
 * alguien con la interfaz en coreano pregunta en inglés, la respuesta sigue en
 * coreano, que es lo que tiene puesto. Lo único que lo cambia es pedirlo.
 */
export const instruccionDeIdioma = (locale?: unknown): string => {
  const codigo = localeDeBrain(locale);
  return [
    `Responde SIEMPRE en ${nombreDelIdioma(codigo)} (código ${codigo}), aunque la persona te escriba en otro idioma.`,
    'Cambia de idioma solo si te lo pide explícitamente.',
  ].join(' ');
};

/**
 * EN QUÉ IDIOMA ESCRIBE UN ESPECIALISTA.
 *
 * No es la misma regla que la de Weë Brain conversando (`instruccionDeIdioma`, que no cambia de idioma aunque le
 * escriban en otro): aquí la persona puede pedir el CONTENIDO en otro idioma —una traducción, un texto para otro
 * público— y entonces manda lo que pidió (`core/language.ts`: appLanguage ≠ contentLanguage). Todo lo demás, en el
 * idioma de su app.
 *
 * LAS MARCAS NO SE TRADUCEN. Algunos pasos piden líneas que lee el código —«IMAGEN:», «PROBAR:» y «NARRACIÓN:» encadenan
 * un paso con el siguiente, «Escena 1» da la primera escena del vídeo, la app pliega un itinerario por sus «DÍA 1 ·» y
 * deja abierto su «PRESUPUESTO:»—. Esas marcas son el contrato entre el servidor y la app: se piden en español, la app
 * las esconde o las pinta en el idioma de quien mira (`utils/textoDeResultado.ts`) y aquí se pide copiarlas tal cual.
 *
 * Sin idioma —un cliente que no lo manda— o en español: español neutro, que es lo que decía `BRAIN_SYSTEM`.
 */
export const instruccionDeSalida = (locale?: unknown): string => {
  if (locale === undefined || locale === null || locale === '') return 'Escribe en español neutro.';
  const codigo = localeDeBrain(locale);
  if (/^es(-|$)/i.test(codigo)) return 'Escribe en español neutro.';
  return [
    `La persona usa Weë en ${idiomaParaElModelo(codigo)}: escribe en ese idioma todo lo que va a leer, títulos y avisos incluidos, aunque estas instrucciones y el objetivo estén en español, salvo que haya pedido el contenido en otro idioma (una traducción, un texto para otro público); entonces ese contenido va en el idioma que pidió.`,
    'Las marcas que piden estas instrucciones se copian EXACTAMENTE así, en español, porque la app las reconoce y las traduce: «IMAGEN:», «PROBAR:», «NARRACIÓN:», «Escena 1» (y las siguientes), «DÍA 1 ·» (y los siguientes) y «PRESUPUESTO:». Lo que va detrás de «IMAGEN:» y «PROBAR:» sigue en inglés.',
  ].join(' ');
};

/**
 * LO ÚLTIMO QUE LEE EL MODELO: el idioma, otra vez.
 *
 * Las instrucciones de Weë están en español y el objetivo por defecto también («Algo rico para comer hoy»): todo
 * empuja al modelo a contestar en español aunque el sistema le haya pedido danés. Lo que más pesa en un modelo es lo
 * último que lee, así que el idioma se repite al FINAL del encargo, con la misma forma que en el sistema. En español,
 * o sin idioma, no se añade nada: no hay nada contra lo que empujar.
 */
export const recordatorioDeIdioma = (locale?: unknown): string => {
  if (locale === undefined || locale === null || locale === '') return '';
  const codigo = localeDeBrain(locale);
  if (/^es(-|$)/i.test(codigo)) return '';
  return `IDIOMA DE LA RESPUESTA: ${idiomaParaElModelo(codigo)}. Todo lo que la persona va a leer va en ese idioma, salvo el contenido que pidió en otro; las marcas «IMAGEN:», «PROBAR:», «NARRACIÓN:», «Escena», «DÍA» y «PRESUPUESTO:» se copian tal cual.`;
};

const EXPERIENCE_ROLE: Record<ExperienceId, string> = {
  travel:
    'Ahora eres Weë Travel, alguien que ha viajado mucho y ayuda a preparar un viaje con los pies en la tierra. No vendes nada ni reservas nada: ordenas la idea, propones lo que de verdad merece la pena y avisas de lo que conviene comprobar antes de ir.',
  design: 'Ahora eres Weë Design, un director creativo que convierte ideas en conceptos visuales concretos.',
  studio: 'Ahora eres Weë Studio, un director de videos cortos para redes que piensa en escenas de pocos segundos.',
  photo: 'Ahora eres Weë Photo, un retocador fotográfico cuidadoso que explica en simple.',
  writer: 'Ahora eres Weë Writer, un redactor que escribe textos naturales, con ritmo y sin relleno.',
  music: 'Ahora eres Weë Music, un compositor y productor que piensa en ánimo, tempo y letra.',
  beauty: 'Ahora eres Weë Beauty, un estilista que propone cambios de look naturales y favorecedores.',
  chef: 'Ahora eres Weë Chef, un chef personal práctico que cocina con ingredientes comunes y explica paso a paso.',
  home: 'Ahora eres Hogar & Diseño, un diseñador de interiores realista que trabaja con lo que la persona ya tiene.',
  business: 'Ahora eres Weë Business, un consultor práctico que da acciones concretas para esta semana.',
  brain: 'Ahora eres Weë Brain, el asistente general: explicas fácil y siempre propones por dónde empezar.',
};

export const KIND_INSTRUCTIONS: Record<string, string> = {
  /*
   * Weë Travel. Cuatro tareas y una regla común: nunca inventar un sitio que se
   * pueda visitar. Un restaurante que no existe o un museo cerrado hace daño de
   * verdad —alguien coge un tren para llegar allí—, así que lo que no se sepa se
   * dice, y lo que cambie se marca para comprobar.
   */
  itinerary:
    'Escribe un itinerario día a día. Empieza SIEMPRE con estos tres renglones, sin nada más delante:\n\n<emoji de bandera> <DESTINO EN MAYÚSCULAS>\n<las fechas exactas que te den, o "Fechas por decidir" si no te dan ninguna>\n<cuántos días y cuántas noches, o solo los días si no hay fechas>\n\nDespués, un bloque por día con exactamente este formato:\n\nDÍA 1 · <fecha corta, p. ej. 12 oct> · Ciudad\nTítulo corto del día\n- Momento: qué hacer y por qué merece la pena (una línea)\n- Momento: ...\n\nCOPIA las fechas del encargo; no inventes ninguna. Si el encargo no trae fechas, escribe los días sin fecha ("DÍA 1 · Ciudad") y no te las inventes. Usa "Mañana", "Tarde" y "Noche" solo cuando el día se reparta así de verdad; si el día es una excursión o una sola cosa, escribe un único momento ("Todo el día"). No rellenes con actividades de relleno: un día con tres cosas buenas vale más que uno con siete. Nombra sitios que existan de verdad; si no estás seguro de uno, no lo pongas. Si las fechas caen en temporada de lluvias, en un festival o en fiestas en las que cierran los sitios, dilo en el día que toque. Al final añade un bloque "PRESUPUESTO:" con rangos aproximados por concepto (vuelos, alojamiento por noche, comida por día, transporte) y el total estimado como rango. Nunca des una cifra exacta. Cierra con una línea recordando que los precios son estimaciones.',
  destinations:
    'Propón EXACTAMENTE TRES destinos, ni uno más. Para cada uno escribe:\n\nCiudad, País\nDos líneas como máximo explicando por qué encaja con lo que la persona busca.\nUna línea con lo práctico: distancia o duración de vuelo aproximada, y si es un viaje económico, medio o caro.\n\nNombra solo sitios que existan de verdad y que se pueda viajar allí hoy; si dudas de uno, propón otro. Que los tres sean de verdad distintos entre sí, para que haya algo que decidir. No des una lista larga: el trabajo es reducir la decisión, no ampliarla.',
  activities:
    'Haz una lista corta —entre cinco y ocho— de lo que merece la pena en ese sitio, mezclando cosas que hacer y sitios donde comer. Agrúpalas por zona o barrio, con el nombre de la zona en una línea suelta, para que se puedan encadenar en un mismo paseo. Cada cosa ocupa exactamente dos renglones y siempre en este orden:\n\nNombre — qué es (museo, mercado, restaurante…)\nPor qué merece la pena, en una sola línea corta.\n\nNada de párrafos largos: si no cabe en una línea, recórtalo. Nombra solo sitios que existan de verdad. Si has usado una búsqueda, cita la fuente de donde salió cada dato que pueda cambiar. Al final, una sola línea: "Comprueba horarios y precios antes de ir." No repitas ese aviso en cada elemento.',
  transport:
    'Responde a la pregunta concreta sobre cómo moverse, sin convertirlo en una guía general. Da dos o tres opciones reales y, para cada una, una línea con: cómo se llama, cuánto tarda aproximadamente, cuánto cuesta aproximadamente y para quién es mejor (con maletas, con prisa, con poco presupuesto). Si no tienes datos fiables de horarios o precios, dilo en vez de inventarlos. Termina con una sola línea: "Tiempos y precios aproximados. Comprueba antes de viajar."',
  recipe:
    'Escribe una receta paso a paso: título con un emoji, para cuántas personas, tiempo total, lista de ingredientes con cantidades (usa •), pasos numerados y cortos, y un consejo final. Usa ingredientes fáciles de conseguir. Si hay una descripción de la foto de los ingredientes, cocina con esos ingredientes y menciona qué falta comprar. Termina con una línea "IMAGEN:" describiendo en inglés (máximo 40 palabras) cómo se ve el plato terminado.',
  menu: 'Arma el menú pedido día por día (o comida por comida): nombre del plato, una línea de por qué funciona y una lista corta de compras al final.',
  script:
    'Escribe un guion de video corto (10 segundos) en 3 escenas. Para cada escena: tiempo (0–3 s, 3–7 s, 7–10 s), qué se ve (descripción visual concreta: lugar, luz, acción, movimiento de cámara) y el texto de la narración (una frase). Cierra con un llamado a la acción de una frase. Al final agrega una línea que empiece con "NARRACIÓN:" con el texto completo de la narración seguido, listo para leer en voz alta (máximo 30 palabras).',
  copy: 'Escribe el texto pedido listo para publicar o enviar, con un inicio que enganche, el contenido principal y un cierre claro. Si es para redes, incluye 3 hashtags al final. Termina con una línea "IMAGEN:" describiendo en inglés (máximo 50 palabras) qué debería mostrar la imagen que acompaña al texto.',
  polish:
    'Toma el texto del paso anterior y entrégalo pulido: sin repeticiones, ritmo natural, misma intención y tono. Devuelve solo la versión final, sin comentarios.',
  lyrics: 'Escribe una idea musical: título, ánimo, tempo sugerido y una letra corta con una estrofa y un estribillo. Termina con una línea "IMAGEN:" describiendo en inglés (máximo 50 palabras) la portada que le pega a esa canción.',
  narration: 'Escribe el texto de una narración de 15 a 20 segundos, en frases cortas y fáciles de leer en voz alta.',
  shopping:
    'Escribe la lista de cambios y compras: agrupa por zona del espacio, prioriza 6–8 elementos, y marca cada uno con un nivel de gasto (bajo, medio o alto).',
  cv: 'Redacta un CV de una página: perfil de 3 líneas, experiencia con logros medibles, formación y habilidades. Donde falte un dato de la persona, deja un marcador entre corchetes, por ejemplo [empresa] o [año].',
  business: 'Prepara el documento pedido: título, 3 a 5 secciones cortas con acciones concretas que la persona pueda hacer esta semana.',
  analysis: 'Resume en 5 líneas qué quiere lograr la persona, para quién es y cuál debería ser la prioridad. Sin preguntas.',
  answer:
    'Responde con claridad en menos de 200 palabras y termina con "Próximos pasos:" y 3 acciones concretas. Si conviene, recomienda el especialista de Weë que ayuda con eso (Weë Design, Weë Studio, Weë Photo, Weë Writer, Weë Music, Weë Beauty, Weë Chef, Hogar & Diseño o Weë Business).',
  concept:
    'Define el concepto visual: la idea en una frase, el texto principal y el secundario, una paleta de 3 colores descritos en palabras, el estilo y una lista corta de qué evitar. Termina con una línea que empiece con "IMAGEN:" describiendo en una frase muy visual (en inglés, máximo 60 palabras) exactamente qué debe mostrar la imagen.',
  story: 'Escribe la historia pedida: título, un inicio que atrape, un conflicto, un giro y un cierre que deje ganas de seguir. Personajes con nombre y voz propia. Entre 500 y 900 palabras salvo que se pida otra cosa.',
  article: 'Escribe el artículo: título que engancha, entrada de dos líneas con por qué importa, 3 o 4 secciones con subtítulos cortos y ejemplos, y un cierre con una pregunta o llamado a la acción. Entre 400 y 700 palabras.',
  email: 'Redacta el email o carta completo: asunto, saludo, contexto en una línea, el mensaje principal, lo que se pide o propone, cierre cordial y firma con [Tu nombre]. Sin relleno.',
  document: 'Redacta el documento: título, resumen de 3 líneas y 3 a 5 secciones numeradas con lo importante primero. Claro y directo, listo para compartir.',
  translate: 'Traduce el texto que aparece en el objetivo al idioma indicado, manteniendo el sentido, el tono y el formato. Devuelve solo la traducción.',
  summary: 'Resume el texto que aparece en el objetivo: 3 a 6 ideas clave con • y una frase final con lo esencial. Sin opiniones.',
  fix: 'Corrige el texto que aparece en el objetivo: ortografía, puntuación, gramática y claridad, sin cambiar lo que la persona quiso decir ni su tono. Devuelve el texto corregido y, al final, una línea "Cambios:" con lo principal que ajustaste.',
  rewrite: 'Reescribe el texto que aparece en el objetivo según lo pedido (tono, largo o enfoque), manteniendo la idea principal. Devuelve solo la nueva versión.',
  ideas: 'Propón 6 ideas concretas y distintas para escribir sobre lo pedido (una línea cada una, con un ángulo claro) y termina con un punto de partida: la primera frase de la que más te guste.',
  describe: 'Describe lo que se ve en la foto en 4 a 6 líneas: sujeto, escena, luz, colores, estado y detalles útiles para trabajar con ella. Sin juicios de valor.',
  skincare: 'Arma una rutina de cuidado de la piel sencilla según lo que se ve en la foto y lo que cuenta la persona: mañana, noche y semanal, con tipos de producto fáciles de conseguir. Aclara que no reemplaza a un dermatólogo si hay un problema de salud.',
  facestyle: 'Según lo que se ve en el rostro de la foto, recomienda: forma de rostro, 3 cortes o peinados que favorecen, tipos de lentes y qué evitar. Termina con una línea "PROBAR:" con los dos estilos que más recomiendas, descritos en inglés y en pocas palabras.',
  layout: 'Propón una distribución mejor del espacio de la foto: 4 a 6 cambios concretos (qué mueble va dónde y por qué), respetando puertas, ventanas y el paso. Termina con una línea "IMAGEN:" describiendo en inglés (máximo 50 palabras) cómo se vería el espacio con la nueva distribución.',
  // "No sé qué hacer": mirar y aconsejar, sin generar todavía (fase 2E-59).
  advise:
    'Según lo que se ve en la foto, cuéntale a la persona qué tiene y qué cambiarías: 2 líneas sobre el espacio tal como está, y luego 3 caminos posibles —uno de muebles, uno de estilo y color, y uno de distribución— con una frase cada uno que diga qué ganaría. Termina preguntándole cuál le interesa. No describas ninguna imagen ni uses la palabra "IMAGEN:".',
  schedule:
    'Arma un calendario de publicaciones para 7 días: por cada día, hora sugerida, red social y una idea de publicación con su objetivo. Aclara al final que Weë todavía no publica automáticamente: la persona aprueba y publica cada pieza.',
  published:
    'Prepara la publicación lista para copiar en cada red (Instagram, Facebook, TikTok) con su texto y hashtags. IMPORTANTE: Weë aún no está conectado a las redes; di claramente que la publicación NO se ha publicado y que la persona debe copiarla y publicarla ella misma.',
  metrics:
    'Weë no tiene acceso a los datos reales de las redes de la persona. No inventes cifras. Explica qué 5 métricas debería mirar, cómo leerlas y qué decisiones tomar según lo que vea, con un ejemplo de plan para la semana.',
  campaign: 'Diseña la campaña: objetivo, público, mensaje principal, 3 piezas (con su texto listo), calendario de una semana y un presupuesto sugerido en niveles (orgánico, bajo, medio). Sin inventar resultados. Termina con una línea "IMAGEN:" describiendo en inglés (máximo 50 palabras) la pieza visual principal.',
  reply: 'Escribe la respuesta para el cliente, lista para enviar: amable, clara, que resuelva lo que pregunta y proponga el siguiente paso. Añade una línea de consejo para la persona sobre cómo responder mejor.',
  mixnotes: 'Anota, en lenguaje sencillo, qué ajustes de mezcla y máster convendrían (volumen, graves, claridad de voz, espacio) según lo que describe la persona.',
};

const FORMAT_RULES =
  'Formato: texto plano con títulos cortos, listas con • y pasos numerados cuando ayuden. Sin símbolos de markdown como # o **. Emojis con moderación.';

export interface BuiltPrompt {
  system: string;
  prompt: string;
}

/** Arma el prompt interno de un paso de texto a partir de la plantilla y lo elegido por la persona. */
export const buildTextPrompt = (
  experienceId: ExperienceId,
  kind: string,
  brief: string,
  goal: string,
  purpose: string,
  previous: string[],
  /** El idioma del trabajo (`CreatorJob.locale`); sin él, español neutro. */
  locale?: string
): BuiltPrompt => ({
  system: `${BRAIN_SYSTEM} ${instruccionDeSalida(locale)}\n\n${EXPERIENCE_ROLE[experienceId]}\n\n${FORMAT_RULES}`,
  prompt: [
    `Objetivo de la persona: "${goal}".`,
    brief ? `Lo que eligió: ${brief}.` : '',
    `Tarea: ${purpose}.`,
    KIND_INSTRUCTIONS[kind] || 'Entrega el mejor resultado posible, completo y listo para usar.',
    previous.length > 0
      ? `Material de los pasos anteriores (úsalo, no lo repitas):\n${previous.map((p, i) => `[${i + 1}] ${p}`).join('\n\n')}`
      : '',
    recordatorioDeIdioma(locale),
  ]
    .filter(Boolean)
    .join('\n\n'),
});

/** Saca la línea "IMAGEN:", "PROBAR:" o "NARRACIÓN:" que dejó un paso de texto anterior. */
export const extractMarker = (texts: string[], marker: string): string => {
  for (const text of texts) {
    const match = text.match(new RegExp(`${marker}\\s*:\\s*(.+)`, 'i'));
    if (match) return match[1].trim().slice(0, 600);
  }
  return '';
};

const STYLE_WORDS: Record<ExperienceId, string> = {
  // Travel no genera imágenes en la fase A. La entrada existe porque el tipo la
  // pide, y si algún día se generara una, sería una foto de viaje de verdad.
  travel: 'travel photography, natural light, real place',
  design: 'professional concept design, clean composition, studio lighting',
  studio: 'cinematic frame, coherent lighting',
  photo: 'photorealistic, natural',
  writer: 'book cover art, striking composition, space for the title',
  music: 'album cover art',
  beauty: 'realistic beauty photography, flattering natural light',
  chef: 'appetizing food photography, natural light',
  home: 'photorealistic interior design render',
  business: 'clean marketing visual for social media, modern, brand-ready',
  brain: 'clean illustration',
};

/**
 * CAPA 1 — la operación de imagen, dicha en inglés desde el identificador del paso.
 *
 * Se indexa por `kind`, que es el id de la opción elegida y no cambia aunque se
 * reescriba la etiqueta que ve la persona. Escribirlo aquí evita traducir nada y
 * no gasta ninguna llamada. Hace falta porque Seedream solo entiende inglés y
 * chino; Gemini y FLUX aceptan cualquier idioma (ver engine/promptLanguage.ts).
 */
export const IMAGE_TASK_EN: Record<string, string> = {
  background: 'Replace or remove the background with a clean, uncluttered backdrop, keeping the main subject exactly as it is',
  remove: 'Remove the unwanted object and rebuild what was behind it so nothing looks edited',
  retouch: 'Retouch the face naturally, keeping the person fully recognizable',
  restore: 'Restore this old photo: repair the damage, recover lost detail and correct the fading',
  colorize: 'Colorize this black and white photo with natural, believable colors',
  enhance: 'Improve the quality, sharpness and lighting of this photo without changing what it shows',
  transform: 'Restyle the photo as requested, keeping the subject recognizable',
  look: 'Apply the requested change to the person, keeping their face, skin and the light of the photo exactly as they are',
  space: 'Redesign this interior space in the requested style, keeping the architecture, the doors and the windows',
  photo: 'Create a photorealistic image',
  dish: 'Create an appetizing photo of the finished dish',
  dish_edit: 'Edit the provided photograph of this dish, applying only the requested change',
  design: 'Create a professional design proposal',
  logo: 'Create a logo with the requested words rendered clearly and correctly',
  cover: 'Create a book cover with room for the title',
  business: 'Create a clean marketing visual, ready to publish on social media',
};

/** Lo que ya va en inglés por las capas 1 y 2, para no adaptar de más. */
export const imageEnglishPart = (kind: string, previous: string[] = []): string =>
  extractMarker(previous, 'IMAGEN') || extractMarker(previous, 'PROBAR') || IMAGE_TASK_EN[kind] || '';

/**
 * EL SISTEMA DE LA ADAPTACIÓN DE IDIOMA (capa 3 de `engine/promptLanguage.ts`; cierre post-auditoría
 * 2026-10-01, server/prompts-internos).
 *
 * La llamada que reescribe en inglés el texto de una imagen para un proveedor que solo admite ciertos
 * idiomas (hoy Seedream) no pasaba sistema: el adaptador ponía el suyo —«responde en español»— mientras
 * `ADAPT_INSTRUCTION` pedía inglés. Y va por `text.structure`, que en los cuatro adaptadores encendía el
 * modo JSON, contra «contesta solo con la instrucción». Ahora lleva SU sistema, que dice lo mismo que la
 * instrucción, y pide texto plano (`format: 'text'`).
 */
export const SISTEMA_DE_ADAPTACION =
  'You are an internal step of Weë. You rewrite image instructions in English for an image model, exactly as the message asks: same meaning, every detail, nothing added and nothing removed. Answer in English with plain text only: the rewritten instruction, without JSON, quotes or explanations.';

/** La entrada de esa llamada: el texto con la instrucción, su sistema y texto plano. Trabajo interno: no se cobra. */
export const entradaDeAdaptacion = (texto: string): Record<string, unknown> => ({
  prompt: texto,
  system: SISTEMA_DE_ADAPTACION,
  format: 'text',
  maxOutputTokens: 400,
  quality: 'standard',
});

/**
 * DIRECCIÓN FOTOGRÁFICA — de momento solo Weë Chef.
 *
 * La primera imagen real de Chef salió técnicamente correcta pero se notaba
 * generada: sin profundidad de campo, con luz plana y sin sombras, superficies
 * demasiado uniformes y los ingredientes flotando en vez de apoyados. El prompt
 * que llegaba al proveedor describía EL PLATO pero no decía en ningún momento
 * que el resultado debía ser una fotografía, así que el modelo caía en su
 * estética por defecto de render limpio.
 *
 * Aquí Weë aporta el CÓMO se fotografía y Gemini sigue aportando el QUÉ se
 * cocina: las dos cosas viajan juntas al proveedor y ninguna sustituye a la otra.
 *
 * Se escribe en positivo a propósito: la API de FLUX.2 que usa Weë NO admite
 * negative_prompt, y enumerar lo que no se quiere solo mete esas ideas en el
 * prompt. Tampoco se acumulan superlativos ("8K", "cinematic", "masterpiece"):
 * empujan justo hacia el aspecto artificial que se quiere evitar.
 */
const PHOTO_DIRECTION: Partial<Record<ExperienceId, { lead: string; direction: string }>> = {
  chef: {
    lead: 'Photograph of the finished dish',
    direction: [
      // Profundidad de campo: en la primera prueba los cubiertos del fondo salían
      // tan nítidos como el plato, que es lo que más delata a una imagen generada.
      'Shot on a 65mm lens at f/3.5, close three-quarter angle, shallow depth of field with the background softly out of focus.',
      // Luz con dirección y sombras: antes la escena no proyectaba ninguna.
      'Single directional window light from the left, with visible soft shadows and one subtle highlight on the sauce.',
      // Textura e imperfección: rompe las superficies uniformes y repetidas.
      'Natural food texture: uneven browning, a few crumbs and drips settled on the plate.',
      // Física asentada y color contenido.
      'Muted natural colour, every ingredient and utensil resting plausibly where gravity would put it.',
    ].join(' '),
  },
};

/**
 * DIRECCIÓN DE RETOQUE — cuando la foto es de la persona.
 *
 * Aquí el plato ya existe y está en la imagen que viaja como referencia, así que
 * el trabajo no es fotografiar bien: es NO tocar lo que no se pidió. Por eso esta
 * dirección es lo contrario de PHOTO_DIRECTION: aquella describe cómo hacer una
 * foto desde cero y, aplicada a un retoque, invitaría al modelo a rehacer el plato.
 */
const EDIT_DIRECTION: Partial<Record<ExperienceId, string>> = {
  chef: [
    // Lo que se le pide hacer con la imagen: retocarla, no rehacer la escena.
    'Edit the provided photograph rather than regenerating the scene.',
    // Lo primero, y lo que más se incumple: la identidad del plato.
    'Keep the dish itself exactly as it is: the same food, the same ingredients, the same shape, proportions and arrangement on the plate.',
    // El encargo, acotado.
    'Apply only the requested change and leave everything else untouched. Do not add or remove ingredients that were not mentioned.',
    /*
     * La composición. En la primera edición real la pizza se conservó entera pero
     * el encuadre se abrió: la cámara se alejó y apareció completa la que antes
     * salía cortada por los bordes. Nadie había pedido conservarlo, así que el
     * modelo recompuso a su gusto.
     *
     * Va condicionado a propósito: si alguien pide justo eso —"acerca la cámara"—,
     * su encargo manda sobre esta regla y el prompt no se contradice.
     */
    'Unless the request asks otherwise, keep the original framing, crop, perspective, camera angle and camera distance: the dish stays the same apparent size and in the same position within the frame, and whatever was cut off at the edges stays cut off the same way.',
    // Que siga pareciendo la misma fotografía, no una ilustración.
    'Keep the result a real photograph: natural food texture, coherent lighting, believable shadows and everything resting where gravity would put it.',
  ].join(' '),
};

/** Los `kind` que retocan una foto real en vez de crear una imagen nueva. */
const EDIT_KINDS = new Set(['dish_edit']);

/** Prompt interno para un paso de imagen: la operación en inglés + lo que pidió la persona. */
/**
 * @param focus  Qué cambia y qué NO debe tocarse en esta operación concreta.
 *   Lo pone la plantilla cuando dos intenciones comparten capacidad pero piden
 *   cosas distintas: cambiar los muebles no es lo mismo que cambiar los colores,
 *   y sin esta línea el modelo recibía el mismo encargo para las dos (2E-59).
 */
export const buildImagePrompt = (experienceId: ExperienceId, kind: string, brief: string, goal: string, purpose: string, previous: string[], focus?: string): string => {
  const fromConcept = extractMarker(previous, 'IMAGEN') || extractMarker(previous, 'PROBAR');
  const task = IMAGE_TASK_EN[kind];
  // Lo que se ve: la descripción del plato que escribió Gemini, o la operación.
  const subject = fromConcept || task || `${purpose}: ${goal}`;
  // Retocar y crear piden cosas distintas, así que no comparten dirección: la de
  // 2E-10 sigue intacta para lo que se crea desde cero.
  const retoque = EDIT_KINDS.has(kind) ? EDIT_DIRECTION[experienceId] : undefined;
  // Cómo se fotografía: solo donde Weë lo tiene definido. Sin entrada, el prompt
  // sale exactamente igual que antes para todas las demás experiencias.
  const foto = retoque ? undefined : PHOTO_DIRECTION[experienceId];
  return [
    // El sujeto puede venir de Gemini y traer ya su punto final: no se duplica.
    foto ? `${foto.lead}: ${subject.replace(/\s*\.\s*$/, '')}.` : subject,
    // Lo que escribió la persona no se descarta nunca: si la operación ya se dijo
    // en inglés, su objetivo viaja aparte como contexto y la capa 3 lo adapta si hace falta.
    !fromConcept && task && goal ? `Context: ${goal}.` : '',
    brief ? `Details: ${brief}.` : '',
    // Va antes de la dirección de foto y del retoque: es la operación misma.
    focus || '',
    // Va DESPUÉS de la descripción del plato: la acompaña, no la sustituye.
    foto ? foto.direction : '',
    // Al retocar, lo que hay que proteger es el plato que ya está en la foto.
    retoque || '',
    kind ? '' : STYLE_WORDS[experienceId],
    'No text or watermarks unless the design itself is a logo or poster with the requested words.',
  ]
    .filter(Boolean)
    .join(' ');
};

/*
 * ── LAS MARCAS DEL GUION, LEÍDAS CON TOLERANCIA (cierre post-auditoría 2026-10-01) ──
 *
 * El guion (`KIND_INSTRUCTIONS.script`) pide «Escena 1…», los tiempos «0–3 s, 3–7 s, 7–10 s» y una línea final
 * que EMPIECE con «NARRACIÓN:», y `instruccionDeSalida` / `recordatorioDeIdioma` piden copiar esas marcas tal cual.
 * Un modelo que escribe en otro idioma a veces las escribe con otra caja, sin el acento, con espacios de más, en
 * negrita, con viñeta o con los dos puntos de ancho completo. Eso sigue siendo la MISMA marca y se reconoce.
 * Una marca TRADUCIDA ya no es la marca y no se adivina: no se inventa un diccionario de «narración» en cada idioma.
 *
 * Lo que cambia de verdad es qué pasa cuando la marca no aparece:
 *  · la VOZ no lee el guion entero (antes leía sus primeros 400 caracteres: tiempos, planos y cámara en voz alta).
 *    Si el texto es un guion —tiene escenas o los tiempos que el guion pide— y no trae su narración marcada, no hay
 *    nada inequívocamente narrable y se devuelve vacío: el paso de voz falla y se ve, en vez de leer otra cosa.
 *    Un texto que NO es un guion (Weë Music «Una voz o narración»: el texto entero ES la narración) se lee como siempre.
 *  · el VÍDEO, si no encuentra «Escena 1», busca la línea de la primera escena por el tiempo que el mismo guion pidió
 *    («0–3 s»), que no se traduce. Si tampoco está, el prompt se queda sin escena, como antes: nada inventado.
 */

/** Lo que puede preceder a la marca de narración al principio de la línea: espacios, viñetas, citas, negritas, número. */
const ANTES_DE_LA_MARCA = String.raw`^[\s>*_#•·\-–—]*(?:\d+[.)]\s*)?[\s*_]*`;
/** La marca de narración, con o sin acento y con cualquier caja; los dos puntos, normales o de ancho completo. */
const MARCA_DE_NARRACION = new RegExp(`${ANTES_DE_LA_MARCA}(narraci[oó]n)[\\s*_]*[:：][\\s*_]*(.*)$`, 'i');
/** «Escena 1», «ESCENA 1», «escena  1», «**Escena 1**»… en cualquier punto de la línea, como antes; pero no «Escena 10». */
const MARCA_DE_PRIMERA_ESCENA = /escena\s*#?\s*1(?!\d)/i;
/** Cualquier escena numerada: para saber si un texto es un guion. */
const MARCA_DE_ESCENA = /escena\s*#?\s*\d/i;
/** El tiempo que el guion pide para la primera escena, «0–3 s», en cualquier idioma: los números no se traducen. */
const TIEMPO_DE_PRIMERA_ESCENA = /(^|[^\d])0\s*[–—-]\s*3(?!\d)/;
const TIEMPO_DE_SEGUNDA_ESCENA = /(^|[^\d])3\s*[–—-]\s*7(?!\d)/;

const lineasDe = (texto: string): string[] => texto.normalize('NFC').split(/\r?\n/);
/** Quita la negrita/cursiva de markdown que rodea a lo marcado; el contenido no se toca. */
const sinAdornos = (s: string): string => s.replace(/^[\s*_]+|[\s*_]+$/g, '').trim();

/** ¿Este texto es un guion por escenas? Por sus escenas o por los tiempos que el guion pide. */
export const esUnGuion = (texto: string): boolean => {
  const lineas = lineasDe(texto);
  return lineas.some((l) => MARCA_DE_ESCENA.test(l)) || (TIEMPO_DE_PRIMERA_ESCENA.test(texto) && TIEMPO_DE_SEGUNDA_ESCENA.test(texto));
};

/**
 * La narración marcada de un texto, o vacío. Si hay varias líneas con la marca, manda la escrita como la pide el
 * contrato (en mayúsculas) y, entre iguales, la ÚLTIMA: el guion la pide «al final». Si el texto va en la línea
 * siguiente a la marca, se toma hasta la primera línea en blanco.
 */
export const narracionMarcada = (texto: string): string => {
  const lineas = lineasDe(texto);
  const marcas = lineas.map((l, i) => ({ i, m: l.match(MARCA_DE_NARRACION) })).filter((x) => x.m);
  if (marcas.length === 0) return '';
  const delContrato = marcas.filter((x) => /^NARRACI[OÓ]N$/.test(x.m![1]));
  const elegida = (delContrato.length ? delContrato : marcas)[(delContrato.length ? delContrato : marcas).length - 1];
  let contenido = sinAdornos(elegida.m![2] ?? '');
  if (!contenido) {
    const siguientes: string[] = [];
    for (const l of lineas.slice(elegida.i + 1)) {
      if (!l.trim()) {
        if (siguientes.length) break;
        continue;
      }
      if (MARCA_DE_ESCENA.test(l) || MARCA_DE_NARRACION.test(l)) break;
      siguientes.push(l.trim());
    }
    contenido = sinAdornos(siguientes.join(' '));
  }
  return contenido.replace(/\s+/g, ' ').slice(0, 600);
};

/** Prompt interno para un clip de video a partir del guion. */
export const buildVideoPrompt = (goal: string, brief: string, previous: string[]): string => {
  const script = previous.find((p) => lineasDe(p).some((l) => MARCA_DE_PRIMERA_ESCENA.test(l)))
    || previous.find((p) => TIEMPO_DE_PRIMERA_ESCENA.test(p))
    || previous[0] || '';
  const lineas = lineasDe(script);
  // "Escena 1 (0–3 s): lo que se ve…" → lo que se ve (o la línea siguiente si la descripción va aparte).
  // Sin «Escena 1» reconocible, la línea de la primera escena es la de su tiempo, «0–3 s».
  let at = lineas.findIndex((l) => MARCA_DE_PRIMERA_ESCENA.test(l));
  let desde = at >= 0 ? lineas[at].search(MARCA_DE_PRIMERA_ESCENA) : -1;
  if (at < 0) {
    at = lineas.findIndex((l) => TIEMPO_DE_PRIMERA_ESCENA.test(l) && !MARCA_DE_NARRACION.test(l));
    desde = at >= 0 ? lineas[at].search(TIEMPO_DE_PRIMERA_ESCENA) : -1;
  }
  let scene = '';
  if (at >= 0) {
    const linea = lineas[at].slice(Math.max(0, desde));
    const dosPuntos = linea.search(/[:：]/);
    const sameLine = dosPuntos >= 0 ? sinAdornos(linea.slice(dosPuntos + 1)) : '';
    const nextLine = sinAdornos(lineas.slice(at + 1).find((l) => l.trim()) ?? '');
    scene = sameLine || (MARCA_DE_NARRACION.test(nextLine) ? '' : nextLine);
  }
  return [`${goal}.`, scene ? `Opening scene: ${scene}` : '', brief ? `Style: ${brief}.` : '', 'Smooth camera movement, natural motion, high detail, no text on screen.']
    .filter(Boolean)
    .join(' ')
    .slice(0, 1500);
};

/**
 * Texto que se lee en voz alta: la línea NARRACIÓN del guion. Sin ella, un texto que NO es un guion se lee tal cual
 * (es la narración misma); un guion sin su narración marcada NO se lee entero: se devuelve vacío.
 */
export const narrationFrom = (previous: string[], goal: string): string => {
  for (const texto of previous) {
    const marcada = narracionMarcada(texto);
    if (marcada) return marcada;
  }
  const text = previous.find((p) => p.trim().length > 0);
  if (text === undefined) return goal.replace(/\s+/g, ' ').slice(0, 400);
  if (esUnGuion(text)) return '';
  return text.replace(/\s+/g, ' ').slice(0, 400);
};
