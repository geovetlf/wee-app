/*
 * LOS ERRORES DE LA API, REDUCIDOS A LO QUE LA PANTALLA NECESITA.
 *
 * Un error del servidor nunca se enseña tal cual: el mensaje puede traer lo que el servidor quiso decir a otro
 * cliente (una ruta, un identificador). La consola solo conserva el TIPO y el texto lo pone el traductor.
 */
export type TipoDeError = 'sin-sesion' | 'denegado' | 'no-encontrado' | 'argumento' | 'sin-conexion' | 'servidor' | 'desconocido';

export class ErrorDeAdmin extends Error {
  constructor(readonly tipo: TipoDeError, readonly codigo?: string) {
    super(`admin:${tipo}`);
    this.name = 'ErrorDeAdmin';
  }
}

const POR_CODIGO: Record<string, TipoDeError> = {
  unauthenticated: 'sin-sesion',
  'permission-denied': 'denegado',
  'not-found': 'no-encontrado',
  'invalid-argument': 'argumento',
  'failed-precondition': 'argumento',
  'out-of-range': 'argumento',
  unavailable: 'sin-conexion',
  'deadline-exceeded': 'sin-conexion',
  cancelled: 'sin-conexion',
  internal: 'servidor',
  unknown: 'servidor',
  'data-loss': 'servidor',
};

/** Cualquier cosa que se lance (un `FirebaseError`, un `TypeError` de red, otra cosa) → un `ErrorDeAdmin`. */
export const clasificarError = (error: unknown): ErrorDeAdmin => {
  if (error instanceof ErrorDeAdmin) return error;
  const crudo = String((error as { code?: unknown } | null)?.code ?? '');
  const codigo = crudo.replace(/^functions\//, '');
  return new ErrorDeAdmin(POR_CODIGO[codigo] ?? 'desconocido', crudo || undefined);
};
