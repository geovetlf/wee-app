/*
 * EL IDIOMA PARA CUANDO YA NO HAY APLICACIÓN.
 *
 * `ErrorBoundary` es lo único que queda en pie cuando algo revienta al pintar,
 * y vive A PROPÓSITO por fuera de `IdiomaProvider`: tiene que seguir
 * funcionando aunque lo que haya reventado sea el propio proveedor de idioma.
 * Por eso no puede usar `useT()` —no hay contexto que consultar— ni importar la
 * capa de i18n —si el fallo viniera de ahí, la pantalla de error caería con
 * ella y la persona se quedaría mirando una pantalla en blanco—.
 *
 * Así que este archivo NO IMPORTA NADA. Es una variable y dos funciones. El
 * contexto de idioma le deja dicho cuál está puesto cada vez que cambia, y la
 * pantalla de error lo lee sin preguntarle a nadie. Si nunca llegó a
 * escribirse, se queda en inglés, que es la misma reserva que usa el resto.
 *
 * No es un segundo sistema de traducción: son tres frases que no pueden
 * depender del sistema de traducción. Cualquier otro texto de Weë va por i18n.
 */

let localeActual = 'en';

/** Lo llama `IdiomaContext` cada vez que el idioma queda resuelto. */
export const recordarLocale = (locale: string): void => {
  if (locale) localeActual = locale;
};

/** El último locale conocido. 'en' si todavía no se sabe. */
export const localeDeEmergencia = (): string => localeActual;
