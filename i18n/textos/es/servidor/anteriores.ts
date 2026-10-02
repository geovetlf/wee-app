/**
 * LO QUE EL SERVIDOR DECÍA ANTES, Y SIGUE GUARDADO.
 *
 * Cuando una frase del servidor cambia, los trabajos de antes conservan la vieja: está en sus preguntas, en su plan y
 * en su historial. Aquí va, por clave, para que la app la siga reconociendo y la pinte con la frase de HOY en el
 * idioma de quien mira —también en español: lo que se corrigió, se corrigió para todos—.
 *
 * NO es una sección del diccionario —no se traduce ni se declara en otros idiomas—: es memoria del catálogo español.
 * Solo se añade una línea cuando se cambia una frase que el servidor ya ha escrito en producción.
 */
export const ANTERIORES: Readonly<Record<string, readonly string[]>> = {
  /* 2026-10-01: Weë Business dejó de prometer que publica en las redes de la persona. */
  'opciones.businessWhatPublish': ['🚀 Publicar en mis redes'],
  'plan.businessExplicaPublicar': ['Voy a preparar la publicación y dejarla lista en tus redes. Mientras las redes no habiliten sus permisos oficiales, la publicación es simulada.'],
  'plan.businessPasoAdaptarACadaRed': ['Dejarla lista en tus redes'],
  /* 2026-10-01: los errores del motor dejaron de nombrar a «el proveedor». */
  'motor.inputRejected': ['La foto o el video no se pudieron usar para generar: el proveedor no acepta rostros reales ni ese contenido. Prueba con otra imagen o descripción.'],
  'motor.sinProveedor': ['Ahora mismo no hay un proveedor disponible para esto. Inténtalo más tarde.'],
};
