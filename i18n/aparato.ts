/*
 * QUÉ IDIOMA PIDE EL APARATO. Una sola función para las tres plataformas.
 *
 * No hay `Platform.OS` aquí, y no es por elegancia: es que las dos fuentes son
 * complementarias y preguntar por las dos sale mejor que elegir una según la
 * plataforma.
 *
 *   · En web, `navigator.languages` da la lista ORDENADA que la persona
 *     configuró en su navegador —['es-PE','es','en'] — y ese orden es
 *     información: dice a qué está dispuesta antes que a inglés.
 *   · En Android y iOS no hay `navigator.languages`, pero Hermes trae `Intl` y
 *     `resolvedOptions().locale` devuelve el locale del sistema. Lo prueba la
 *     propia app: los Credits ya se pintan con `toLocaleString` y salen bien en
 *     el teléfono.
 *
 * Se preguntan las dos y se junta lo que haya, sin repetir. Si un motor no
 * trajera ninguna, se devuelve la lista vacía y quien llame se irá al respaldo:
 * quedarse sin idioma no es una opción.
 *
 * LO QUE ESTA FUNCIÓN NO MIRA, y no es un olvido: la IP, el GPS, la zona
 * horaria y el país de la tarjeta SIM. El idioma que alguien quiere leer no se
 * deduce de dónde está su cuerpo.
 */

export const localesDelAparato = (): string[] => {
  const encontrados: string[] = [];

  /* Web: la lista del navegador, en su orden. */
  const nav = (globalThis as { navigator?: { languages?: unknown; language?: unknown } }).navigator;
  if (nav) {
    if (Array.isArray(nav.languages)) {
      for (const l of nav.languages) if (typeof l === 'string') encontrados.push(l);
    }
    if (typeof nav.language === 'string') encontrados.push(nav.language);
  }

  /* Android e iOS: el locale del sistema, por Intl. */
  try {
    const delSistema = new Intl.DateTimeFormat().resolvedOptions().locale;
    if (delSistema) encontrados.push(delSistema);
  } catch {
    /* Un motor sin Intl. No debería pasar en Hermes, pero no se cae por esto. */
  }

  /* Sin repetidos y sin huecos, conservando el orden de preferencia. */
  return encontrados.filter((l, i) => !!l && encontrados.indexOf(l) === i);
};
