/*
 * COREANO — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro 해요체. Weël y Weëls son MARCA: se quedan en alfabeto latino y NO se
 * transliteran a sílabas coreanas. Donde el coreano pedía una partícula detrás
 * del nombre, la frase se apoya en un sustantivo fijo —영상, 목록— en vez de
 * pegarla a la marca; la única que sí se pega es «Weël을», porque Weël se lee
 * acabado en ㄹ y esa forma no admite duda.
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Weël 공유',
  empty: '아직 Weëls 영상이 없어요',
  emptyHint: '+ 버튼으로 첫 Weël을 만들어 보세요',
  loadFailed: 'Weëls 목록을 불러오지 못했어요',
  rowSubtitle: '커뮤니티가 만든 영상을 만나 보세요.',
  seeAll: 'Weëls 전체 보기',
  create: 'Weël 만들기',
  createFirst: '나의 첫 Weël',
  open: 'Weël 보기',
  upTo15s: '최대 15초',
  noneYetHint: '아직 커뮤니티가 만든 Weëls 영상이 없어요. 아래 예시로 어떤 모습일지 미리 볼 수 있어요.',
};
