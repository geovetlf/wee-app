/*
 * TURCO — Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la
 * persona apartó para verlo otra vez.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Guardados» es «Kaydedilenler» (glosario § 10.2, el término de Apple);
 * «Kaydedildi» queda para el estado. El marcador de una publicación es «yer
 * işareti», el nombre turco del marcador en navegadores y teléfonos. «Prompt»
 * es préstamo común y se declina sin apóstrofo: «promptları» (guía § 3).
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Kaydedilenler',
  empty: 'Henüz hiçbir şey kaydetmedin',
  exploreHome: 'Ana sayfayı keşfet',
  loadFailed: 'Kaydedilenler yüklenemedi',
  emptyHint: 'Tekrar bakmak istediğin promptları, eğitimleri ve çalışmaları kaydetmek için gönderideki yer işaretine dokun.',
};
