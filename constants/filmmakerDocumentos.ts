/**
 * LEER UN DOCUMENTO, GUION O LIBRO (Filmmaker) — el interruptor de la UI.
 *
 * El servidor (`leerDocumento`, functions/src/creator/documentos) y el cliente (services/documentosService.ts,
 * hooks/useDocumentoDeReferencia.ts) están completos. Esta constante sigue en `false` hasta que el dueño:
 *   1. despliegue `leerDocumento` y las reglas de Storage (por el workflow de despliegue),
 *   2. decida lo de privacidad del proveedor y abra `aiSettings/documentos` con `abierto: true`.
 * Con `true` la fila «Documento/PDF/Libro» del «+» deja de salir cerrada. Mientras `aiSettings/documentos` esté cerrado, el
 * servidor contesta «no disponible» aunque la UI estuviera abierta, así que abrir la constante antes no cobra ni lee nada.
 */
export const LECTURA_DE_DOCUMENTOS_ABIERTA = false;

/** Tipos que acepta el selector de archivos (los que entiende el servidor). */
export const TIPOS_DE_DOCUMENTO: readonly string[] = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/epub+zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
