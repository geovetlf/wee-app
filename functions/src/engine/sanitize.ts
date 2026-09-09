import { knownSecretValues } from '../secrets';

/**
 * SANITIZACIÓN DE REGISTROS — punto único.
 *
 * Un proveedor puede devolver, dentro del cuerpo de un error, la cabecera que le
 * enviamos o parte de la petición. Antes de que ese texto llegue a un registro,
 * a Firestore o a cualquier sitio, pasa por aquí: se borran credenciales, se
 * recorta el tamaño y se deja lo que sirve para depurar.
 *
 * No se duplica en cada adaptador: `fetchJson`, `fetchBytes`, el libro de
 * generaciones y el manejo de errores llaman a esta misma función.
 */

/** Longitud máxima de un mensaje de proveedor en los registros. */
export const MAX_LOG_LENGTH = 200;

export const REDACTED = '[credencial omitida]';

/**
 * Patrones de credencial. Se aplican en orden y siempre sobre el texto completo,
 * antes de recortarlo, para que un secreto no sobreviva partido por la mitad.
 */
const PATTERNS: { re: RegExp; replace: string }[] = [
  // Cabeceras de autorización, en JSON o en texto plano
  { re: /("?authorization"?\s*[:=]\s*"?)([^"\n,}]+)/gi, replace: `$1${REDACTED}` },
  { re: /("?(?:x-api-key|xi-api-key|x-key|api[_-]?key|apikey|access[_-]?token|secret|password)"?\s*[:=]\s*"?)([^"\n,}]+)/gi, replace: `$1${REDACTED}` },
  // Cookies
  { re: /("?(?:set-)?cookie"?\s*[:=]\s*"?)([^"\n]+)/gi, replace: `$1${REDACTED}` },
  // Tokens portadores sueltos
  { re: /\bBearer\s+[A-Za-z0-9._\-+/=]{8,}/gi, replace: `Bearer ${REDACTED}` },
  // Formas conocidas de clave: OpenAI, Google, Anthropic, ElevenLabs
  { re: /\bsk-[A-Za-z0-9._-]{12,}/g, replace: REDACTED },
  { re: /\bAIza[A-Za-z0-9._-]{20,}/g, replace: REDACTED },
  { re: /\bsk-ant-[A-Za-z0-9._-]{12,}/g, replace: REDACTED },
  // JWT (tres bloques separados por puntos)
  { re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, replace: REDACTED },
  // La clave en una URL, aunque Weë nunca la manda así
  { re: /([?&](?:key|api_key|apikey|token|access_token)=)([^&\s"]+)/gi, replace: `$1${REDACTED}` },
];

/** Quita el usuario, la contraseña y la cadena de consulta de una URL. */
export function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return String(url).split('?')[0];
  }
}

/**
 * Deja un texto listo para registrar: sin credenciales y con un tamaño acotado.
 * Censura además el valor real de cualquier secreto configurado, por si el
 * proveedor lo devolviera sin una forma reconocible.
 */
export function sanitizeForLog(value: unknown, maxLength = MAX_LOG_LENGTH): string {
  let text = typeof value === 'string' ? value : value instanceof Error ? value.message : String(value ?? '');
  if (!text) return '';

  for (const secret of knownSecretValues()) {
    if (secret.length >= 8) text = text.split(secret).join(REDACTED);
  }
  for (const { re, replace } of PATTERNS) text = text.replace(re, replace);

  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}…` : trimmed;
}

/** Contexto de un fallo de proveedor, ya sanitizado, para el registro del servidor. */
export interface ProviderLogContext {
  provider: string;
  model?: string;
  endpoint?: string;
  status?: number;
  requestId?: string;
  code?: string;
  message: string;
}

export function providerLog(context: ProviderLogContext): string {
  const parts = [
    `proveedor=${context.provider}`,
    context.model ? `modelo=${context.model}` : '',
    context.endpoint ? `endpoint=${safeUrl(context.endpoint)}` : '',
    context.status !== undefined ? `http=${context.status}` : '',
    context.requestId ? `requestId=${context.requestId}` : '',
    context.code ? `codigo=${context.code}` : '',
    `mensaje=${sanitizeForLog(context.message)}`,
  ].filter(Boolean);
  return parts.join(' · ');
}
