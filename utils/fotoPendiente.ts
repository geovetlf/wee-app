/**
 * LA FOTO QUE SE ELIGIÓ CON EL «+» DE LA PORTADA DE WEËAI, de camino a «Editar mi foto».
 *
 * No viaja en los parámetros de la ruta: en la web esos parámetros se escriben en la dirección del navegador, y la
 * dirección local de una foto de la persona no tiene nada que hacer ahí. Se deja aquí, en memoria, y la pantalla la
 * recoge UNA vez al abrirse.
 */
let pendiente: string | null = null;

export const dejarFotoPendiente = (uri: string): void => {
  pendiente = uri;
};

export const tomarFotoPendiente = (): string | undefined => {
  const uri = pendiente ?? undefined;
  pendiente = null;
  return uri;
};
