/*
 * LA REVISIÓN DEL TEXTO QUE ESCRIBE EL PERSONAJE (docs/AUTONOMIA.md, «moderación»).
 *
 * Weë no tiene moderación automática de texto con IA. Esto NO la sustituye: es una
 * red de seguridad sin coste —reglas, ninguna llamada a una IA ni a una API— que
 * mira lo que el personaje va a decir ANTES de que salga, y lo detiene si toca algo
 * de lo que ningún nivel decide solo (`SIEMPRE_PERSONA` en `ficha.ts`):
 *
 *   · contacto  — correos, teléfonos, «escríbeme por WhatsApp/Instagram…»;
 *   · enlace    — direcciones web (una publicación del personaje no lleva enlaces);
 *   · dinero    — pagos, transferencias, cuentas, monederos, cifras con moneda.
 *
 * Lo detenido NO se publica ni se envía: va a la bandeja del dueño como aviso de
 * revisión, con el texto, para que él decida y escriba a mano si quiere.
 *
 * Las reglas prefieren pecar de prudentes: un falso positivo cuesta una respuesta que
 * no sale (y el dueño la ve); un falso negativo, un dato de contacto en público.
 * Funciona en cualquier idioma para lo que tiene forma (correos, números, enlaces,
 * símbolos de moneda) y con palabras de los idiomas más usados en Weë para el resto.
 */

export type MotivoDeRevision = 'contacto' | 'enlace' | 'dinero';
export type ResultadoDeRevision = { ok: true } | { ok: false; motivo: MotivoDeRevision };

const CORREO = /[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[A-Za-z0-9-]+(?:\s*(?:\.|\(dot\)|\[dot\])\s*[A-Za-z0-9-]+)+/i;
const ENLACE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:com|net|org|io|app|me|ly|gg|co|info|biz|link|site|store|shop|xyz|pe|mx|ar|es|br|cl|us|uk|de|fr|it|ru|cn|jp|kr|in|tv)(?:\/\S*)?\b/i;
/** Redes y mensajería a las que «pasar» una conversación. */
const REDES = /\b(?:whats\s?app|wsp|telegram|instagram|insta|tik\s?tok|facebook|messenger|snap\s?chat|discord|signal|wechat|weixin|kakao(?:talk)?|line\s?id|viber|onlyfans|twitter|skype|zalo)\b|ワッツアップ|微信|카카오톡|ватсап|телеграм/i;
/** Monedas y medios de pago. */
const PAGOS = /\b(?:yape|plin|paypal|venmo|zelle|cash\s?app|bizum|pix|mercado\s?pago|western\s?union|moneygram|revolut|alipay|paytm|upi|iban|cci|usdt|tether|binance)\b|\b0x[0-9a-f]{40}\b|\b(?:bc1|[13])[a-km-zA-HJ-NP-Z1-9]{25,39}\b/i;
const MONEDA_CON_CIFRA = /(?:[$€£¥₹₩₽₺₱]|S\/\.?|R\$|US\$)\s?\d|\d[\d.,]*\s?(?:usd|eur|pen|mxn|ars|clp|cop|brl|soles?|d[oó]lares?|euros?|pesos?|reais|rupees?|yuan|yenes?)\b/i;
const PALABRAS_DE_DINERO = /\b(?:transferencia|transfi[eé]reme|dep[oó]sit[ao]|cuenta bancaria|n[uú]mero de cuenta|n[uú]mero de tarjeta|tarjeta de cr[eé]dito|p[aá]game|paga(?:me|rme)|bank account|wire transfer|send (?:me )?money|pay me|credit card|card number|transfer[eê]ncia|chave pix|conta banc[aá]ria|cart[aã]o de cr[eé]dito|virement|carte bancaire|bonifico|überweisung|kontonummer|перевод|номер карты)\b/i;

/** ¿Hay un número de teléfono? (8+ cifras, con o sin separadores; no confunde años ni fechas cortas) */
function tieneTelefono(texto: string): boolean {
  for (const m of texto.matchAll(/(?:\+|\b)\d[\d\s().-]{6,}\d\b/g)) {
    const cifras = m[0].replace(/\D/g, '');
    if (cifras.length >= 8 && cifras.length <= 15) return true;
  }
  return false;
}

/** Revisa un texto que el personaje va a publicar o enviar. Puro y sin coste. */
export function revisarTexto(texto: string): ResultadoDeRevision {
  const t = String(texto ?? '').normalize('NFKC');
  if (!t.trim()) return { ok: true };
  if (CORREO.test(t) || tieneTelefono(t) || REDES.test(t)) return { ok: false, motivo: 'contacto' };
  if (ENLACE.test(t)) return { ok: false, motivo: 'enlace' };
  if (PAGOS.test(t) || MONEDA_CON_CIFRA.test(t) || PALABRAS_DE_DINERO.test(t)) return { ok: false, motivo: 'dinero' };
  return { ok: true };
}
