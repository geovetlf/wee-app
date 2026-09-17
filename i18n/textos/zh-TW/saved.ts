/*
 * Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la persona apartó.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * TAIWÁN, NO UNA CONVERSIÓN: «收藏» es lo que dicen las aplicaciones de las dos
 * orillas, así que se queda; lo que sí cambia es cargar algo, que en Taiwán es
 * «載入» y nunca «加載», que es lo que sale de convertir el continental carácter
 * a carácter.
 */
export const saved: typeof import('../es/saved').saved = {
  title: '收藏',
  empty: '還沒有收藏任何內容',
  exploreHome: '去首頁逛逛',
  loadFailed: '無法載入你的收藏',
};
