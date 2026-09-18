/**
 * WEE CORE — IDIOMA. Seis conceptos que hoy el sistema confunde en uno.
 *
 * ── El problema que esto resuelve ───────────────────────────────────────────
 *
 * Weë habla nueve idiomas desde el cliente, pero al servidor solo llega el
 * locale en Weë Brain: las otras diez experiencias no saben en qué lengua
 * trabaja la persona. Y donde sí llega, llega como UNA cosa —«el idioma»—
 * cuando en realidad son varias que no tienen por qué coincidir:
 *
 *     UI en japonés + «créame una canción en español»
 *
 *     appLanguage      ja      lo que la persona LEE en Weë
 *     inputLanguage    ja      la lengua en que ESCRIBIÓ
 *     contentLanguage  es      la lengua de lo que PIDIÓ crear
 *     outputLanguage   es      la lengua del resultado
 *
 * Un sistema con un solo campo «language» no puede representar eso, y acaba
 * devolviendo la canción en japonés porque la app está en japonés. Por eso son
 * campos distintos: no es purismo, es la única forma de respetar la intención.
 *
 * ── Y el sexto, que es de máquinas ──────────────────────────────────────────
 *
 * `providerLanguage` no es de la persona: es la lengua en que hay que hablarle
 * al proveedor porque su API no admite otra. No tiene relación con las cinco de
 * arriba y nunca debe filtrarse a la pantalla.
 *
 * ── LA REGLA DE COBRO, escrita aquí para que no se pierda ───────────────────
 *
 * Traducir por compatibilidad del proveedor es un problema de Weë, no de quien
 * escribe. NUNCA se le cobra. Ya lo cumple `engine/promptLanguage.ts`; este
 * contrato lo hace explícito para que ninguna fase futura lo reinvente cobrando.
 *
 * ── Lo que este archivo NO hace ─────────────────────────────────────────────
 *
 * No resuelve el idioma de nadie: eso ya lo hace `i18n/resolver.ts` en el
 * cliente y no se duplica. Aquí solo se TRANSPORTA lo resuelto y se decide, con
 * funciones puras, si hace falta adaptar algo antes de llamar a un proveedor.
 */

/**
 * Una etiqueta de idioma BCP-47: 'es', 'pt-PT', 'zh-Hant-TW'.
 *
 * Es un tipo aparte y no `string` porque estos valores VIENEN DEL CLIENTE y
 * acaban dentro de prompts. Que el tipo obligue a pasar por `normalizarEtiqueta`
 * es la diferencia entre validar siempre y validar cuando te acuerdas.
 */
export type LanguageTag = string & { readonly __languageTag: unique symbol };

/** Solo letras, dígitos y guiones, con forma de etiqueta de idioma. */
const FORMA_DE_ETIQUETA = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;

/**
 * Convierte texto en etiqueta, o devuelve `null`.
 *
 * SE RECHAZA TODO LO DEMÁS A PROPÓSITO. Un locale viaja desde el cliente hasta
 * el prompt del sistema, así que alguien podría mandar un «idioma» con
 * instrucciones dentro. Lo que no tiene forma de etiqueta no pasa. Es la misma
 * defensa que ya aplica `creator/prompts.ts`, subida al Core para que valga
 * también para las diez experiencias que hoy no reciben idioma.
 */
export const normalizarEtiqueta = (crudo: unknown): LanguageTag | null => {
  const limpio = String(crudo ?? '').trim();
  if (!limpio || !FORMA_DE_ETIQUETA.test(limpio)) return null;
  const [idioma, ...resto] = limpio.split('-');
  /*
   * Cada subtag tiene su forma y no son la misma.
   *
   *   idioma      minúsculas        zh
   *   escritura   Capitalizada      Hant   ← cuatro letras
   *   región      MAYÚSCULAS        TW     ← dos letras o tres dígitos
   *
   * La escritura hay que tratarla aparte, y no es un detalle ortográfico: un
   * teléfono taiwanés se anuncia como `zh-Hant-TW`, y dejarlo en `zh-hant-tw`
   * lo convierte en una etiqueta que no case con los alias declarados en
   * `i18n/idiomas.ts`. Chino tradicional servido como simplificado por una
   * mayúscula. Es la misma normalización que ya hace `i18n/resolver.ts` en el
   * cliente, y por eso coincide con ella a propósito.
   */
  const partes = [
    idioma.toLowerCase(),
    ...resto.map((t) => {
      if (/^[A-Za-z]{4}$/.test(t)) return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      if (/^[A-Za-z]{2}$/.test(t) || /^\d{3}$/.test(t)) return t.toUpperCase();
      return t;
    }),
  ];
  return partes.join('-') as LanguageTag;
};

/** 'pt' de 'pt-PT'. La lengua sin la región. */
export const idiomaDe = (tag: LanguageTag): string => String(tag).split('-')[0].toLowerCase();

/**
 * EL IDIOMA DE UNA PETICIÓN, en sus piezas.
 *
 * Solo `appLanguage` es obligatorio: es lo único que Weë siempre sabe, porque
 * es lo que tiene puesto la interfaz. Lo demás se rellena cuando se sabe, y
 * ausente significa «no consta», nunca «igual que el anterior». Quien necesite
 * un valor efectivo usa los ayudantes de más abajo, que declaran la cascada en
 * un solo sitio.
 */
export interface LanguageContext {
  /** Lo que la persona LEE en Weë. Sale de `useIdioma().locale`. */
  appLanguage: LanguageTag;
  /** Su locale completo para FORMATOS: fechas, números, moneda. Puede diferir. */
  userLocale?: LanguageTag;
  /** La lengua en que escribió, si se detectó. No se asume igual a la interfaz. */
  inputLanguage?: LanguageTag;
  /** La lengua del RESULTADO, cuando la persona la pidió explícitamente. */
  outputLanguage?: LanguageTag;
  /** La lengua de lo que se está creando, si es distinta del resultado. */
  contentLanguage?: LanguageTag;
}

/**
 * En qué idioma hay que CONTESTAR.
 *
 * El orden es la regla de producto: si pidió el resultado en una lengua, esa
 * manda; si no, la de lo que está creando; si tampoco, la de su interfaz. Nunca
 * se deduce de la ubicación, ni del proveedor, ni de lo que sea más cómodo.
 */
export const idiomaDeSalida = (ctx: LanguageContext): LanguageTag =>
  ctx.outputLanguage || ctx.contentLanguage || ctx.appLanguage;

/** En qué idioma hay que ENTENDER lo que llegó. */
export const idiomaDeEntrada = (ctx: LanguageContext): LanguageTag => ctx.inputLanguage || ctx.appLanguage;

/** El locale de formatos. Si no consta, el de la interfaz. */
export const localeDeFormato = (ctx: LanguageContext): LanguageTag => ctx.userLocale || ctx.appLanguage;

/**
 * Lo que un proveedor admite, declarado desde su documentación oficial.
 *
 * `only` ausente significa «no declara restricción», que NO es lo mismo que
 * «admite todo»: es que no lo dice, y entonces se le manda el texto tal cual.
 * Inventar una lista de idiomas soportados porque parece que funciona es
 * exactamente el tipo de suposición que el brief prohíbe.
 */
export interface ProviderLanguageSupport {
  only?: readonly string[];
  note: string;
}

/** Qué hacer con el texto antes de mandárselo a un proveedor. */
export interface LanguagePlan {
  /** Lengua en que debe viajar el texto al proveedor. */
  providerLanguage: LanguageTag;
  /** ¿Hay que adaptar el texto antes de enviarlo? */
  needsAdaptation: boolean;
  /** Por qué se decidió esto. Va al registro: una decisión sin motivo no se audita. */
  reason: string;
  /**
   * SIEMPRE false. La adaptación por compatibilidad del proveedor la paga Weë.
   * Es un campo y no una constante para que quede escrito en cada decisión y
   * nadie tenga que acordarse de la regla.
   */
  billable: false;
}

/**
 * ¿Hay que adaptar, y a qué lengua?
 *
 * Función pura: entra la lengua del texto y lo que el proveedor admite, sale la
 * decisión. No sabe de proveedores concretos —se los dan—, no traduce y no llama
 * a nadie. Quien traduzca lo hará después; esto solo decide si hace falta.
 *
 * Tres respuestas posibles y ninguna adivina:
 *   · el proveedor no limita        → no se toca el texto
 *   · el proveedor admite la lengua → no se toca el texto
 *   · el proveedor no la admite     → se adapta a la PRIMERA que declare
 *
 * La primera de la lista no es arbitraria: es la que el proveedor pone primero
 * en su documentación, que es la que mejor soporta.
 */
export const planificarIdiomaDelProveedor = (
  textLanguage: LanguageTag,
  support: ProviderLanguageSupport | undefined,
): LanguagePlan => {
  const admitidos = support?.only;
  if (!admitidos || admitidos.length === 0) {
    return {
      providerLanguage: textLanguage,
      needsAdaptation: false,
      reason: 'el proveedor no declara restricción de idioma',
      billable: false,
    };
  }
  const lengua = idiomaDe(textLanguage);
  if (admitidos.some((a) => a.toLowerCase() === lengua)) {
    return {
      providerLanguage: textLanguage,
      needsAdaptation: false,
      reason: 'el proveedor ya admite este idioma',
      billable: false,
    };
  }
  const destino = normalizarEtiqueta(admitidos[0]);
  return {
    providerLanguage: destino || (('en' as string) as LanguageTag),
    needsAdaptation: true,
    reason: `el proveedor solo admite ${admitidos.join(', ')}`,
    billable: false,
  };
};

/**
 * Construye el contexto desde lo que mande el cliente, saneando todo.
 *
 * Nada de lo que llega se usa sin pasar por aquí. Si el `appLanguage` no tiene
 * forma de etiqueta se cae a la reserva, que es lo mismo que hace hoy Weë Brain
 * con un cliente viejo: seguir hablando, nunca romperse.
 */
export const contextoDeIdioma = (
  crudo: Partial<Record<keyof LanguageContext, unknown>>,
  reserva: LanguageTag = ('en' as string) as LanguageTag,
): LanguageContext => {
  const tag = (v: unknown) => normalizarEtiqueta(v) ?? undefined;
  return {
    appLanguage: tag(crudo.appLanguage) ?? reserva,
    userLocale: tag(crudo.userLocale),
    inputLanguage: tag(crudo.inputLanguage),
    outputLanguage: tag(crudo.outputLanguage),
    contentLanguage: tag(crudo.contentLanguage),
  };
};
