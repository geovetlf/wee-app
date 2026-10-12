/*
 * ERRORES NATIVOS → ErrorAlmacenLocal (ronda R9, línea C · persistencia).
 *
 * El contrato del almacén (`tipos.ts`) promete que «nunca una cadena cruda del
 * sistema llega a la interfaz». Hasta ahora las operaciones nativas de
 * `ubicacion.ts` (expo-file-system/legacy) dejaban pasar el error tal cual: un
 * permiso SAF revocado, un disco lleno o un archivo borrado desde el gestor de
 * archivos llegaban como `Error` sin `codigo`, y la sección los pintaba como
 * «error desconocido» en vez de «vuelve a elegir la carpeta» o «sin espacio».
 *
 * Aquí se traducen. Es lógica pura (sin Expo) para poder probarla en Node.
 * Los textos que se reconocen salen del código nativo INSTALADO de
 * expo-file-system 19 (Android, `FileSystemLegacyModule.kt` `ensurePermission`
 * y `FileSystemExceptions.kt`) y de los mensajes estándar de Java/POSIX:
 *   · permiso: «isn't readable», «isn't writable», «doesn't have permission»,
 *     `SecurityException` / «Permission Denial» (URI SAF sin permiso persistente),
 *     `EACCES`, «Permission denied»  → `no_disponible` (en Android la sección lo
 *     convierte en «permiso perdido»: `utils/seccionDelDispositivo.ts`).
 *   · espacio: `ENOSPC`, «No space left on device», «not enough space»  → `sin_espacio`.
 *   · ausente: «doesn't exist», «could not be found», `FileNotFoundException`,
 *     `ENOENT`  → `no_encontrado`.
 * Lo que no se reconoce queda `desconocido` (sin el texto del sistema en el
 * código; el detalle solo viaja en `message` para el registro).
 *
 * NO VERIFICADO EN DISPOSITIVO: los textos son los del código fuente instalado,
 * no capturados en un teléfono.
 */
import { ErrorAlmacenLocal, type CodigoDeErrorAlmacen } from './tipos';

const PERMISO = /isn't readable|isn't writable|doesn't have permission|permission denial|securityexception|permission denied|\beacces\b|\beperm\b/i;
const ESPACIO = /\benospc\b|no space left|not enough space|insufficient storage|disk full/i;
const AUSENTE = /doesn't exist|does not exist|could not be found|filenotfound|no such file|\benoent\b/i;

const textoDe = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (typeof error !== 'object' || error === null) return '';
  const partes: string[] = [];
  for (const campo of ['name', 'code', 'message'] as const) {
    const valor = (error as Record<string, unknown>)[campo];
    if (typeof valor === 'string') partes.push(valor);
  }
  return partes.join(' ');
};

/** El código del almacén que corresponde a un error del sistema. */
export const codigoDeErrorNativo = (error: unknown): CodigoDeErrorAlmacen => {
  if (error instanceof ErrorAlmacenLocal) return error.codigo;
  const texto = textoDe(error);
  // El orden importa: un «Permission denied» de un archivo que no existe sigue siendo permiso.
  if (PERMISO.test(texto)) return 'no_disponible';
  if (ESPACIO.test(texto)) return 'sin_espacio';
  if (AUSENTE.test(texto)) return 'no_encontrado';
  return 'desconocido';
};

/** Convierte cualquier error en `ErrorAlmacenLocal`. Uno que ya lo es pasa tal cual. */
export const traducirErrorNativo = (error: unknown, contexto?: string): ErrorAlmacenLocal => {
  if (error instanceof ErrorAlmacenLocal) return error;
  return new ErrorAlmacenLocal(codigoDeErrorNativo(error), contexto);
};

/**
 * Envuelve cada función de un objeto de operaciones para que sus fallos salgan
 * traducidos. No cambia lo que devuelven ni el orden de las llamadas.
 */
export const conErroresTraducidos = <T extends object>(operaciones: T): T => {
  const envuelto = {} as Record<string, unknown>;
  for (const [nombre, valor] of Object.entries(operaciones)) {
    envuelto[nombre] =
      typeof valor === 'function'
        ? async (...argumentos: unknown[]) => {
            try {
              return await (valor as (...a: unknown[]) => unknown).apply(operaciones, argumentos);
            } catch (error) {
              throw traducirErrorNativo(error, nombre);
            }
          }
        : valor;
  }
  return envuelto as T;
};
