/**
 * ¿ESTE NOMBRE RESPONDE A LO QUE SE BUSCA? (Filmmaker Engine, Fase 22: el filtro de lo guardado para vincular.)
 *
 * Sin mayúsculas ni acentos, por cualquier parte del nombre; vacío, todo responde. Filtra lo que ya está en la
 * pantalla: no pregunta a nadie. Puro, sin React, para usarlo donde haga falta y probarlo en Node.
 */
export const coincideConLaBusqueda = (nombre: string, busqueda: string): boolean => {
  const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();
  const q = normal(busqueda.trim());
  return !q || normal(nombre).includes(q);
};
