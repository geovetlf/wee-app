/*
 * Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la persona apartó.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * "Home" se dice en ruso —«главная»— como en alemán y en francés: es el nombre
 * común de la pantalla, no una marca.
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Сохранённое',
  empty: 'Пока ничего не сохранено',
  exploreHome: 'Открыть главную',
  loadFailed: 'Не удалось загрузить Сохранённое',
};
