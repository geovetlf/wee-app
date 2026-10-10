/*
 * ENTREGA DE UN PROYECTO EXPORTADO, WEB. El navegador no comparte archivos como un móvil:
 * se descarga el paquete con un enlace temporal (Blob). Nunca se guarda como proyecto.
 */

/** Siempre true: el navegador descarga el archivo. El nombre lo elige quien llama. */
export const entregarArchivo = async (nombre: string, datos: Uint8Array): Promise<boolean> => {
  // Copia en un búfer nuevo: el Blob exige un ArrayBuffer, no un ArrayBufferLike compartido.
  const url = URL.createObjectURL(new Blob([new Uint8Array(datos)], { type: 'application/octet-stream' }));
  try {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return true;
};
