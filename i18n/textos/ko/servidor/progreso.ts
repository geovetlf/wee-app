/*
 * COREANO — Textos del servidor: progreso (ver `../../es/servidor/progreso.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin plurales: `_one` y `_other` dicen lo mismo. Ninguna partícula variable (은/는, 이/가, 을/를, 와/과, (으)로) va pegada a un hueco de texto: la frase se reordena o el hueco va detrás de dos puntos.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: '시작하는 중…',
  ajustandoVertical: 'Weël을 세로 형식에 맞추는 중…',
  montando: 'Weël을 편집하는 중…',
  generandoWeel: 'Weël을 생성하는 중…',
  creandoImagen: '이미지를 만드는 중…',
  grabandoVoz: '목소리를 녹음하는 중…',
  efectosDeSonido: '효과음을 넣는 중…',
  componiendo: '음악을 만드는 중…',
  mirandoFoto: '사진을 살펴보는 중…',
  preparandoDocumento: '문서를 준비하는 중…',
  escribiendoGuion: '대본을 쓰는 중…',
  dividiendoEscenas: '이야기를 장면으로 나누는 중…',
  creandoSubtitulos: '자막을 만드는 중…',
  escribiendo: '쓰는 중…',
  paso: '{{proposito}}…',
  sinTiempo: '시간이 초과됐어요. Credits를 돌려드렸어요.',
  listo: '✨ 완료',
  fallaVideo: '이번에는 영상을 생성하지 못했어요. 차감되지 않았어요. 잠시 후에 다시 시도해 주세요.',
  fallaImagen: '이번에는 이미지를 만들지 못했어요. 차감되지 않았어요. 잠시 후에 다시 시도해 주세요.',
  fallaGeneral: '이번에는 잘되지 않았어요. 차감되지 않았어요. 잠시 후에 다시 시도해 주세요.',
  fallaCorta: '잘되지 않았어요. 차감되지 않았어요.',
};
