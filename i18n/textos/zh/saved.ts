/*
 * Guardados: la pantalla del 🔖 del menú, donde vuelve lo que la persona apartó.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * En chino, guardar algo para volver a verlo es «收藏», que es la palabra que
 * usan de verdad las aplicaciones; «已保存» sonaría a archivo de sistema.
 */
export const saved: typeof import('../es/saved').saved = {
  title: '收藏',
  empty: '还没有收藏任何内容',
  exploreHome: '去首页逛逛',
  loadFailed: '无法加载你的收藏',
  emptyHint: '点一下动态上的书签，就能收藏想再看的提示词、教程和作品。',
};
